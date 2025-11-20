const StudentManager = require('./StudentManager');
const Logger = require('./Logger');
const FileStorage = require('./FileStorage');
const DataBackup = require('./DataBackup');
const BackupReporter = require('./BackupReporter');
const path = require('path');

const verbose = process.argv.includes('--verbose');
const quiet = process.argv.includes('--quiet');

const logger = new Logger(verbose, quiet);
const studentManager = new StudentManager();
const backupDirPath = path.join(__dirname, 'backups');
const dataBackup = new DataBackup(backupDirPath);
const backupReporter = new BackupReporter();

studentManager.on('student:added', (student) => {
  logger.log(` Event: Student added - ${student.name} (ID: ${student.id})`);
});

studentManager.on('student:removed', (data) => {
  logger.log(` Event: Student removed - ID: ${data.id}`);
});

studentManager.on('student:retrieved', (data) => {
  logger.log(` Event: Student retrieved - ID: ${data.id}, Found: ${data.found}`);
});

studentManager.on('students:retrieved-by-group', (data) => {
  logger.log(` Event: Students retrieved by group - Group: ${data.group}, Count: ${data.count}`);
});

studentManager.on('students:retrieved-all', (data) => {
  logger.log(` Event: All students retrieved - Count: ${data.count}`);
});

studentManager.on('average-age:calculated', (data) => {
  logger.log(` Event: Average age calculated - ${data.average.toFixed(2)}`);
});

dataBackup.on('backup:started', (data) => {
  logger.log(` Backup started - Interval: ${data.intervalMs}ms`);
});

dataBackup.on('backup:completed', (data) => {
  logger.log(` Backup completed - File: ${path.basename(data.filePath)}, Students: ${data.studentsCount}, Time: ${data.timestamp.toISOString()}`);
});

dataBackup.on('backup:skipped', (data) => {
  logger.log(` Backup skipped - ${data.reason} (Pending: ${data.pendingCount})`);
});

dataBackup.on('backup:stopped', (data) => {
  logger.log(` Backup stopped - Time: ${data.timestamp.toISOString()}`);
});

dataBackup.on('backup:error', (data) => {
  logger.log(` Backup error - ${data.message}`);
});

async function main() {
  try {
    logger.log('=== Student Management System with Async Operations ===\n');

    logger.log('Initial students:');
    logger.log(studentManager.getAllStudents());

    logger.log('\nAdding new student: Cristiano Messi, age 25, group 2');
    const newStudent = studentManager.addStudent('Cristiano Messi', 25, 2);
    logger.log('Student added:', newStudent);

    logger.log('\nGetting student by ID "1":');
    logger.log(studentManager.getStudentById('1'));

    logger.log('\nGetting all students in group 2:');
    logger.log(studentManager.getStudentsByGroup(2));

    logger.log('\nAverage age of all students:');
    logger.log(studentManager.calculateAverageAge().toFixed(2));

    const jsonFilePath = path.join(__dirname, 'students.json');
    logger.log(`\nSaving students to ${jsonFilePath}`);
    await FileStorage.saveToJSON(studentManager.getAllStudents(), jsonFilePath);
    logger.log('Students saved successfully');

    logger.log('\nLoading students from JSON file');
    try {
      const loadedStudents = await FileStorage.loadJSON(jsonFilePath);
      logger.log('Loaded students:');
      logger.log(loadedStudents);
    } catch (error) {
      logger.log('Error loading students:', error.message);
    }

    logger.log('\nRemoving student with ID "2"');
    const removed = studentManager.removeStudent('2');
    logger.log(`Student removed: ${removed}`);
    logger.log('Remaining students:');
    logger.log(studentManager.getAllStudents());

    logger.log('\n=== Starting Data Backup System ===\n');
    await dataBackup.startBackup(
      () => studentManager.getAllStudents(),
      3000
    );

    logger.log('Waiting for backup operations...\n');
    await new Promise(resolve => setTimeout(resolve, 20000));

    logger.log('\nStopping backup...');
    dataBackup.stopBackup();

    logger.log('\n=== Generating Backup Report ===');
    await backupReporter.printReport(backupDirPath);

  } catch (error) {
    logger.log('Fatal error:', error.message);
    if (dataBackup.isRunning()) {
      dataBackup.stopBackup();
    }
    process.exit(1);
  }
}

main().catch(error => {
  logger.log('Unhandled error:', error);
  if (dataBackup.isRunning()) {
    dataBackup.stopBackup();
  }
  process.exit(1);
});

