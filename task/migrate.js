const db = require('./db');

async function migrate() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      group_num INTEGER NOT NULL
    );
  `;

  try {
    await db.query(createTableSQL);
    console.log('Migration completed: table "students" is ready.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
