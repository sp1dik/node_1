const fs = require('fs').promises;
const path = require('path');

class BackupReporter {
  async generateReport(backupDirPath) {
    try {
      const files = await fs.readdir(backupDirPath);
      const backupFiles = files.filter(file => file.endsWith('.backup.json'));

      if (backupFiles.length === 0) {
        return {
          message: 'No backup files found',
          backupFileCount: 0
        };
      }

      const backupPromises = backupFiles.map(async (file) => {
        const filePath = path.join(backupDirPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        return {
          fileName: file,
          filePath,
          data: JSON.parse(content)
        };
      });

      const backupData = await Promise.all(backupPromises);

      backupData.sort((a, b) => {
        return a.fileName.localeCompare(b.fileName);
      });

      const backupFileCount = backupFiles.length;

      const latestBackup = backupData[backupData.length - 1];
      const latestTimestampStr = latestBackup.fileName
        .replace('backup-', '')
        .replace('.backup.json', '');

      const isoTime = latestTimestampStr
        .replace(/(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})(Z)/, '$1:$2:$3.$4$5');
      const latestTimestamp = new Date(isoTime);

      const studentsByIdCount = {};
      backupData.forEach(backup => {
        backup.data.forEach(student => {
          if (!studentsByIdCount[student.id]) {
            studentsByIdCount[student.id] = 0;
          }
          studentsByIdCount[student.id]++;
        });
      });

      const groupedStudents = Object.keys(studentsByIdCount)
        .map(id => ({
          id,
          amount: studentsByIdCount[id]
        }))
        .sort((a, b) => b.amount - a.amount);

      const totalStudentsAcrossAll = backupData.reduce((sum, backup) => {
        return sum + backup.data.length;
      }, 0);
      const averageStudentsPerFile = totalStudentsAcrossAll / backupFileCount;

      return {
        backupFileCount,
        latestBackupFile: {
          fileName: latestBackup.fileName,
          createdAt: latestTimestamp.toISOString(),
          readableDateTime: latestTimestamp.toLocaleString('ru-RU')
        },
        studentsByIdCount: groupedStudents,
        averageStudentsPerFile: averageStudentsPerFile.toFixed(2),
        totalStudentsAcrossAll
      };
    } catch (error) {
      throw new Error(`Failed to generate backup report: ${error.message}`);
    }
  }

  async printReport(backupDirPath) {
    try {
      const report = await this.generateReport(backupDirPath);
      
      console.log('\n===== BACKUP REPORT =====\n');
      
      console.log(` Amount of backup files: ${report.backupFileCount}`);
      
      if (report.backupFileCount > 0) {
        console.log(`\n Latest backup file:`);
        console.log(`   File: ${report.latestBackupFile.fileName}`);
        console.log(`   Created at: ${report.latestBackupFile.readableDateTime}`);
        
        console.log(`\n Students grouped by ID (with count across all backups):`);
        console.log(JSON.stringify(report.studentsByIdCount, null, 2));
        
        console.log(`\n Average students per backup file: ${report.averageStudentsPerFile}`);
        console.log(` Total students across all backups: ${report.totalStudentsAcrossAll}`);
      } else {
        console.log(report.message);
      }
      
      console.log('\n========================\n');
      
      return report;
    } catch (error) {
      console.error(' Error generating report:', error.message);
      throw error;
    }
  }
}

module.exports = BackupReporter;
