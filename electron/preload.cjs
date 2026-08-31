/**
 * =============================================================================
 * Electron Preload Script: Expose Secure IPC Bridge to React
 * =============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Database IPC
  dbQuery: (sql, params = []) => ipcRenderer.invoke('db:query', { sql, params }),
  dbExecute: (sql, params = []) => ipcRenderer.invoke('db:execute', { sql, params }),
  dbTransaction: (queries) => ipcRenderer.invoke('db:transaction', { queries }),

  // Backup & Restore
  saveBackupDialog: (defaultFilename) => ipcRenderer.invoke('backup:save-dialog', defaultFilename),
  restoreBackupDialog: () => ipcRenderer.invoke('backup:restore-dialog'),
  exportDatabase: () => ipcRenderer.invoke('backup:export'),
  importDatabase: (dbSqlData) => ipcRenderer.invoke('backup:import', dbSqlData),

  // Thermal Printing
  printReceipt: (receiptHtml, options) => ipcRenderer.invoke('printer:print-receipt', { receiptHtml, options }),

  // Metadata
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getAppPlatform: () => ipcRenderer.invoke('app:platform'),
});
