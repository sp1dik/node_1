const express = require('express');
const path = require('path');
const StudentManager = require('./StudentManager');
const FileStorage = require('./FileStorage');
const DataBackup = require('./DataBackup');
const Logger = require('./Logger');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize components
const verbose = process.argv.includes('--verbose');
const quiet = process.argv.includes('--quiet');
const logger = new Logger(verbose, quiet);
const studentManager = new StudentManager();
const backupDirPath = path.join(__dirname, 'backups');
const dataBackup = new DataBackup(backupDirPath);

// Event listeners for StudentManager
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

// Event listeners for DataBackup
dataBackup.on('backup:started', (data) => {
  logger.log(` Backup started - Interval: ${data.intervalMs}ms`);
});

dataBackup.on('backup:completed', (data) => {
  logger.log(` Backup completed - File: ${path.basename(data.filePath)}, Students: ${data.studentsCount}`);
});

dataBackup.on('backup:skipped', (data) => {
  logger.log(` Backup skipped - ${data.reason}`);
});

dataBackup.on('backup:stopped', (data) => {
  logger.log(` Backup stopped`);
});

dataBackup.on('backup:error', (data) => {
  logger.log(` Backup error - ${data.message}`);
});

// ============= HOME ROUTES =============

// GET / - Return HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= STUDENT ENDPOINTS =============

// GET /api/students - Get all students
app.get('/api/students', (req, res) => {
  try {
    const students = studentManager.getAllStudents();
    res.status(200).json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/students - Add new student
app.post('/api/students', (req, res) => {
  try {
    const { name, age, group } = req.body;

    if (!name || age === undefined || group === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, age, group'
      });
    }

    if (typeof age !== 'number' || typeof group !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Age and group must be numbers'
      });
    }

    const newStudent = studentManager.addStudent(name, age, group);
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: newStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/students - Replace all students
app.put('/api/students', (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        error: 'Students must be an array'
      });
    }

    const Student = require('./Student');
    studentManager.students = students.map(s => 
      new Student(s.id, s.name, s.age, s.group)
    );

    res.status(200).json({
      success: true,
      message: 'All students replaced successfully',
      data: studentManager.getAllStudents()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students/:id - Get student by ID
app.get('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = studentManager.getStudentById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /api/students/:id - Update student by ID
app.patch('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, group } = req.body;

    const student = studentManager.getStudentById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (name) student.name = name;
    if (age !== undefined) student.age = age;
    if (group !== undefined) student.group = group;

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/students/:id - Remove student by ID
app.delete('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const removed = studentManager.removeStudent(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students/group/:groupId - Get students by group
app.get('/api/students/group/:groupId', (req, res) => {
  try {
    const { groupId } = req.params;
    const groupNumber = parseInt(groupId);

    if (isNaN(groupNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Group ID must be a number'
      });
    }

    const students = studentManager.getStudentsByGroup(groupNumber);
    res.status(200).json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/average-age - Calculate average age
app.get('/api/average-age', (req, res) => {
  try {
    const average = studentManager.calculateAverageAge();
    res.status(200).json({
      success: true,
      data: {
        average: parseFloat(average.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/students/save - Save students to JSON
app.post('/api/students/save', async (req, res) => {
  try {
    const jsonFilePath = path.join(__dirname, 'students.json');
    const students = studentManager.getAllStudents();
    await FileStorage.saveToJSON(students, jsonFilePath);

    res.status(200).json({
      success: true,
      message: 'Students saved to JSON file successfully',
      filePath: jsonFilePath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/students/load - Load students from JSON
app.post('/api/students/load', async (req, res) => {
  try {
    const jsonFilePath = path.join(__dirname, 'students.json');
    const Student = require('./Student');
    const loadedData = await FileStorage.loadJSON(jsonFilePath);
    
    // Преобразуем загруженные данные в экземпляры Student
    const loadedStudents = loadedData.map(s => 
      new Student(s.id, s.name, s.age, s.group)
    );
    
    studentManager.students = loadedStudents;

    res.status(200).json({
      success: true,
      message: 'Students loaded from JSON file successfully',
      data: loadedStudents,
      count: loadedStudents.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= BACKUP ENDPOINTS =============

// POST /api/backup/start - Start backup
app.post('/api/backup/start', async (req, res) => {
  try {
    const { intervalMs = 5000 } = req.body;

    if (dataBackup.isRunning()) {
      return res.status(400).json({
        success: false,
        error: 'Backup is already running'
      });
    }

    await dataBackup.startBackup(
      () => studentManager.getAllStudents(),
      intervalMs
    );

    res.status(200).json({
      success: true,
      message: 'Backup started successfully',
      intervalMs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/backup/stop - Stop backup
app.post('/api/backup/stop', (req, res) => {
  try {
    if (!dataBackup.isRunning()) {
      return res.status(400).json({
        success: false,
        error: 'Backup is not running'
      });
    }

    dataBackup.stopBackup();
    res.status(200).json({
      success: true,
      message: 'Backup stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/backup/status - Get backup status
app.get('/api/backup/status', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        isRunning: dataBackup.isRunning(),
        status: dataBackup.isRunning() ? 'running' : 'stopped'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= ERROR HANDLING =============

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.log('Server error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============= START SERVER =============

app.listen(PORT, () => {
  logger.log(`\n🚀 HTTP Server started on http://localhost:${PORT}\n`);
  logger.log('Available endpoints:');
  logger.log('  GET  /api/students');
  logger.log('  POST /api/students');
  logger.log('  PUT  /api/students');
  logger.log('  GET  /api/students/:id');
  logger.log('  PATCH /api/students/:id');
  logger.log('  DELETE /api/students/:id');
  logger.log('  GET  /api/students/group/:groupId');
  logger.log('  GET  /api/average-age');
  logger.log('  POST /api/students/save');
  logger.log('  POST /api/students/load');
  logger.log('  POST /api/backup/start');
  logger.log('  POST /api/backup/stop');
  logger.log('  GET  /api/backup/status\n');
});
