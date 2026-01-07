const express = require('express');
const path = require('path');
const { body, param, validationResult } = require('express-validator');
const StudentManager = require('./StudentManager');
const FileStorage = require('./FileStorage');
const DataBackup = require('./DataBackup');
const Logger = require('./Logger');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { hashPassword, comparePassword, generateToken, authenticateJWT, authorizeRoles } = require('./auth');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

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
  try { logger.log(` Event: Average age calculated - ${data.average.toFixed(2)}`); } catch(e) {}
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

// === AUTH ROUTES (public) ===
// POST /api/auth/register
app.post('/api/auth/register',
  body('name').isString().isLength({ min: 1 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, surname = '', email, password, role = 'student' } = req.body;

      const existing = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
      if (existing.rowCount > 0) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      }

      // ensure role exists
      let roleRow = await db.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [role]);
      let roleId;
      if (roleRow.rowCount === 0) {
        roleId = uuidv4();
        await db.query('INSERT INTO roles (id, name) VALUES ($1, $2)', [roleId, role]);
      } else {
        roleId = roleRow.rows[0].id;
      }

      const userId = uuidv4();
      const passHash = await hashPassword(password);

      await db.query(
        'INSERT INTO users (id, name, surname, email, password, role_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [userId, name, surname, email, passHash, roleId]
      );

      const token = generateToken({ id: userId, name, email, role });

      res.status(201).json({ success: true, message: 'User registered', token, data: { id: userId, name, email, role } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/auth/login
app.post('/api/auth/login',
  body('email').isEmail(),
  body('password').isLength({ min: 1 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const userRes = await db.query(
        `SELECT users.id, users.name, users.surname, users.email, users.password, roles.name AS role
         FROM users
         LEFT JOIN roles ON users.role_id = roles.id
         WHERE users.email = $1 LIMIT 1`,
        [email]
      );
      if (userRes.rowCount === 0) {
        return res.status(400).json({ success: false, error: 'Invalid credentials' });
      }
      const user = userRes.rows[0];
      const match = await comparePassword(password, user.password);
      if (!match) return res.status(400).json({ success: false, error: 'Invalid credentials' });

      const token = generateToken({ id: user.id, name: user.name, surname: user.surname, email: user.email, role: user.role || 'student' });

      res.status(200).json({ success: true, message: 'Logged in', token, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Protect API routes after auth routes
app.use('/api', authenticateJWT);

// ============= STUDENT ENDPOINTS =============

// GET /api/students - Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await studentManager.getAllStudents();
    res.status(200).json({ success: true, data: students, count: students.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students - Add new student 
app.post('/api/students',
  body('name').isString().isLength({ min: 1 }),
  body('age').isInt({ min: 0 }),
  body('group').isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, age, group } = req.body;
      const newStudent = await studentManager.addStudent(name, age, group);
      res.status(201).json({ success: true, message: 'Student added successfully', data: newStudent });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/students - Replace all students
app.put('/api/students',
  body('students').isArray(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { students } = req.body;
      const replaced = await studentManager.replaceAllStudents(students);
      res.status(200).json({ success: true, message: 'All students replaced successfully', data: replaced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/students/:id - Get student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentManager.getStudentById(id);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/students/:id - Update student by ID
app.patch('/api/students/:id',
  param('id').isString(),
  body('name').optional().isString(),
  body('age').optional().isInt({ min: 0 }),
  body('group').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, age, group } = req.body;
      const student = await studentManager.getStudentById(id);
      if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

      const updated = {
        name: name !== undefined ? name : student.name,
        age: age !== undefined ? age : student.age,
        group: group !== undefined ? group : student.group
      };

      const sql = `UPDATE students SET name = $1, age = $2, group_num = $3 WHERE id = $4 RETURNING *`;
      const values = [updated.name, updated.age, updated.group, id];
      await db.query(sql, values);

      const newStudent = await studentManager.getStudentById(id);
      res.status(200).json({ success: true, message: 'Student updated successfully', data: newStudent });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/students/:id - Remove student by ID
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await studentManager.removeStudent(id);
    if (!removed) return res.status(404).json({ success: false, error: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/students/group/:groupId - Get students by group
app.get('/api/students/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const groupNumber = parseInt(groupId);
    if (isNaN(groupNumber)) return res.status(400).json({ success: false, error: 'Group ID must be a number' });
    const students = await studentManager.getStudentsByGroup(groupNumber);
    res.status(200).json({ success: true, data: students, count: students.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/average-age - Calculate average age
app.get('/api/average-age', async (req, res) => {
  try {
    const average = await studentManager.calculateAverageAge();
    res.status(200).json({ success: true, data: { average: parseFloat(average.toFixed(2)) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students/save - Save students to JSON
app.post('/api/students/save', async (req, res) => {
  try {
    const jsonFilePath = path.join(__dirname, 'students.json');
    const students = await studentManager.getAllStudents();
    await FileStorage.saveToJSON(students, jsonFilePath);
    res.status(200).json({ success: true, message: 'Students saved to JSON file successfully', filePath: jsonFilePath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/students/load - Load students from JSON
app.post('/api/students/load', async (req, res) => {
  try {
    const jsonFilePath = path.join(__dirname, 'students.json');
    const loadedData = await FileStorage.loadJSON(jsonFilePath);
    await studentManager.replaceAllStudents(loadedData.map(s => ({ id: s.id, name: s.name, age: s.age, group: s.group })));
    const loadedStudents = await studentManager.getAllStudents();
    res.status(200).json({ success: true, message: 'Students loaded from JSON file successfully', data: loadedStudents, count: loadedStudents.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= BACKUP ENDPOINTS =============

// POST /api/backup/start - Start backup
app.post('/api/backup/start', async (req, res) => {
  try {
    const { intervalMs = 5000 } = req.body;
    if (dataBackup.isRunning()) return res.status(400).json({ success: false, error: 'Backup is already running' });
    await dataBackup.startBackup(() => studentManager.getAllStudents(), intervalMs);
    res.status(200).json({ success: true, message: 'Backup started successfully', intervalMs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/backup/stop - Stop backup
app.post('/api/backup/stop', (req, res) => {
  try {
    if (!dataBackup.isRunning()) return res.status(400).json({ success: false, error: 'Backup is not running' });
    dataBackup.stopBackup();
    res.status(200).json({ success: true, message: 'Backup stopped successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/backup/status - Get backup status
app.get('/api/backup/status', (req, res) => {
  try {
    res.status(200).json({ success: true, data: { isRunning: dataBackup.isRunning(), status: dataBackup.isRunning() ? 'running' : 'stopped' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  logger.log(`\n HTTP Server started on http://localhost:${PORT}\n`);
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
