const StudentManager = require('./StudentManager');
const Logger = require('./Logger');
const FileStorage = require('./FileStorage');

const verbose = process.argv.includes('--verbose');
const quiet = process.argv.includes('--quiet');

const logger = new Logger(verbose, quiet);

const studentManager = new StudentManager();

logger.log('=== Student Management System ===');
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

const jsonFilePath = `${__dirname}/students.json`;
logger.log(`\nSaving students to ${jsonFilePath}`);
FileStorage.saveToJSON(studentManager.getAllStudents(), jsonFilePath);
logger.log('Students saved successfully');

logger.log('\nLoading students from JSON file');
try {
  const loadedStudents = FileStorage.loadJSON(jsonFilePath);
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
