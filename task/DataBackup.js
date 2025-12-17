const { EventEmitter } = require('events');
const path = require('path');
const FileStorage = require('./FileStorage');

class DataBackup extends EventEmitter {
  constructor(backupDirPath) {
    super();
    this.backupDirPath = backupDirPath;
    this.intervalId = null;
    this.isBackupInProgress = false;
    this.pendingIntervalCount = 0;
    this.maxPendingIntervals = 3;
  }

  async startBackup(dataGetter, intervalMs) {
    try {
      await FileStorage.ensureDirectoryExists(this.backupDirPath);
      
      this.intervalId = setInterval(async () => {
        if (this.isBackupInProgress) {
          this.pendingIntervalCount++;
          
          if (this.pendingIntervalCount >= this.maxPendingIntervals) {
            this.emit('backup:error', {
              message: 'Backup operation stuck for 3 intervals, throwing error',
              pendingCount: this.pendingIntervalCount
            });
            this.stopBackup();
            throw new Error('Backup operation timeout - pending for 3 intervals');
          }
          
          this.emit('backup:skipped', {
            reason: 'Previous backup still in progress',
            pendingCount: this.pendingIntervalCount
          });
          return;
        }

        this.isBackupInProgress = true;
        this.pendingIntervalCount = 0;

        try {
          const data = await dataGetter();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupFilePath = path.join(
            this.backupDirPath,
            `backup-${timestamp}.backup.json`
          );

          await FileStorage.saveToJSON(data, backupFilePath);

          this.emit('backup:completed', {
            filePath: backupFilePath,
            studentsCount: data.length,
            timestamp: new Date()
          });
        } catch (error) {
          this.emit('backup:error', {
            message: error.message,
            timestamp: new Date()
          });
        } finally {
          this.isBackupInProgress = false;
        }
      }, intervalMs);

      this.emit('backup:started', { intervalMs });
    } catch (error) {
      this.emit('backup:error', {
        message: `Failed to start backup: ${error.message}`
      });
      throw error;
    }
  }

  stopBackup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.emit('backup:stopped', { timestamp: new Date() });
    }
  }

  isRunning() {
    return this.intervalId !== null;
  }
}

module.exports = DataBackup;
