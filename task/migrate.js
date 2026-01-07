const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      surname TEXT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role_id TEXT REFERENCES roles(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      subject_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      subject_id TEXT REFERENCES subjects(id),
      student_id TEXT REFERENCES students(id),
      grade REAL NOT NULL,
      evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure students table exists and has user_id
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      group_num INTEGER NOT NULL,
      user_id TEXT REFERENCES users(id)
    );
  `;

  try {
    await db.query(createTableSQL);

    // Seed basic roles if not present
    const roles = ['student', 'teacher', 'admin'];
    for (const r of roles) {
      const res = await db.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [r]);
      if (res.rowCount === 0) {
        await db.query('INSERT INTO roles (id, name) VALUES ($1, $2)', [uuidv4(), r]);
      }
    }

    console.log('Migration completed: tables "roles","users","students","subjects","grades" are ready.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
}

migrate();
