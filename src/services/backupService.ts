import { sqlite } from '../db/sqliteAdapter';

export interface BackupMetadata {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  recordCount: {
    products: number;
    transactions: number;
    inventory: number;
    users: number;
  };
}

export class BackupService {
  /**
   * Generates a downloadable backup file (.json or .sql snapshot)
   */
  public static async downloadDatabaseBackup(): Promise<void> {
    const dumpContent = await sqlite.exportFullDatabaseDump();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backup_mie_aceh_pos_${dateStr}.json`;

    // If running inside Electron, trigger native save dialog
    if (sqlite.isElectronEnvironment() && window.electronAPI?.saveBackupDialog) {
      const res = await window.electronAPI.saveBackupDialog(filename);
      if (!res.canceled && res.filePath) {
        // Electron will save directly
        return;
      }
    }

    // Web / Browser Download fallback
    const blob = new Blob([dumpContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Restores database from a local backup file (.json)
   */
  public static async restoreDatabaseFromFile(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const success = await sqlite.importFullDatabaseDump(content);
          resolve(success);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  /**
   * Creates an in-memory or local emergency snapshot
   */
  public static async createInstantSnapshot(): Promise<string> {
    const dump = await sqlite.exportFullDatabaseDump();
    const key = `mie_aceh_snapshot_${new Date().toISOString()}`;
    localStorage.setItem(key, dump);
    return key;
  }
}
