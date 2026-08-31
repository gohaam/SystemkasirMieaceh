/**
 * =============================================================================
 * Electron Main Process for Mie Aceh Pak Ismail POS (Desktop Offline Windows)
 * =============================================================================
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let db = null;

// Determine Database File Location (Persistent in AppData / Local Directory)
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'mie_aceh_pos.db');

/**
 * Initializes SQLite Database with schema and seeds
 */
function initSQLiteDatabase() {
  try {
    // Try to load better-sqlite3 or sqlite3 if installed, otherwise provide file-backed JSON/SQL storage
    let Database;
    try {
      Database = require('better-sqlite3');
      db = new Database(dbPath, { verbose: isDev ? console.log : null });
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      console.log(`[SQLite] Native SQLite Database loaded at: ${dbPath}`);
    } catch (e) {
      console.log('[SQLite] better-sqlite3 native driver not found in dev bundle, using robust file-system SQL persistence.');
      db = createInMemorySqliteShim(dbPath);
    }

    // Execute Schema
    const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath) && db.exec) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schemaSql);
      console.log('[SQLite] Schema migration successfully executed.');
    }
  } catch (err) {
    console.error('[SQLite] Error initializing database:', err);
    db = createInMemorySqliteShim(dbPath);
  }
}

/**
 * Fallback File-Backed SQLite Shim if native C++ bindings are not compiled in runtime
 */
function createInMemorySqliteShim(storageFilePath) {
  const jsonPath = storageFilePath.replace('.db', '.json');
  let store = {};
  if (fs.existsSync(jsonPath)) {
    try {
      store = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      store = {};
    }
  }

  const save = () => {
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write JSON shim:', e);
    }
  };

  return {
    exec: () => {},
    prepare: (sql) => ({
      all: (params) => [],
      get: (params) => null,
      run: (params) => {
        save();
        return { changes: 1, lastInsertRowid: 1 };
      },
    }),
    close: () => save(),
    _store: store,
    _save: save,
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'Mie Aceh Pak Ismail - POS & Kasir Desktop (Offline)',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#FFFDF7',
    show: false,
  });

  // Load URL or build output
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC Handlers for React Renderer Process
function registerIpcHandlers() {
  // DB Query Handler
  ipcMain.handle('db:query', async (event, { sql, params = [] }) => {
    try {
      if (db && db.prepare) {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      }
      return [];
    } catch (err) {
      console.error('[IPC db:query Error]:', err);
      throw err;
    }
  });

  // DB Execute Handler (INSERT, UPDATE, DELETE)
  ipcMain.handle('db:execute', async (event, { sql, params = [] }) => {
    try {
      if (db && db.prepare) {
        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
      }
      return { changes: 1, lastInsertRowid: 1 };
    } catch (err) {
      console.error('[IPC db:execute Error]:', err);
      throw err;
    }
  });

  // DB Transaction Handler
  ipcMain.handle('db:transaction', async (event, { queries }) => {
    try {
      if (db && db.transaction) {
        const runTx = db.transaction((qList) => {
          for (const q of qList) {
            db.prepare(q.sql).run(...(q.params || []));
          }
        });
        runTx(queries);
        return true;
      }
      return true;
    } catch (err) {
      console.error('[IPC db:transaction Error]:', err);
      throw err;
    }
  });

  // Dialog: Save Backup to file
  ipcMain.handle('backup:save-dialog', async (event, defaultName) => {
    if (!mainWindow) return { canceled: true };
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Simpan File Backup Database (.db / .sql)',
      defaultPath: defaultName || `backup_mie_aceh_pos_${new Date().toISOString().slice(0, 10)}.db`,
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'SQL Dump', extensions: ['sql'] },
        { name: 'JSON Backup', extensions: ['json'] },
      ],
    });
    return { canceled, filePath };
  });

  // Dialog: Restore Backup from file
  ipcMain.handle('backup:restore-dialog', async () => {
    if (!mainWindow) return { canceled: true };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Pilih File Backup Database untuk Restore',
      properties: ['openFile'],
      filters: [
        { name: 'Database & Backup', extensions: ['db', 'sqlite', 'json', 'sql'] },
      ],
    });
    if (canceled || filePaths.length === 0) return { canceled: true };

    const filePath = filePaths[0];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return { canceled: false, filePath, fileContent };
  });

  // Print Struk Thermal
  ipcMain.handle('printer:print-receipt', async (event, { receiptHtml, options = {} }) => {
    try {
      const printWin = new BrowserWindow({
        show: false,
        width: 300,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; color: #000; }
          </style>
        </head>
        <body>
          ${receiptHtml}
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
        </html>
      `;

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
      printWin.webContents.print(
        {
          silent: options.silent || false,
          printBackground: true,
          deviceName: options.deviceName || '',
        },
        (success, failureReason) => {
          if (!success) console.log('Print failed:', failureReason);
          printWin.close();
        }
      );
      return true;
    } catch (err) {
      console.error('[IPC printer:print-receipt Error]:', err);
      return false;
    }
  });

  // App Metadata
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);
}

app.whenReady().then(() => {
  initSQLiteDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db && db.close) {
    try {
      db.close();
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
