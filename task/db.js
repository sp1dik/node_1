const { Pool } = require('pg');

const user = process.env.PGUSER || process.env.USER || 'postgres';
const password = process.env.PGPASSWORD || process.env.PASSWORD || '';
const host = process.env.PGHOST || 'localhost';
const port = process.env.PGPORT || 5432;
const database = process.env.PGDATABASE || 'studentsdb';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${user}${password ? `:${encodeURIComponent(password)}` : ''}@${host}:${port}/${database}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const createTableSQL = `
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    group_num INTEGER NOT NULL
  );
`;

async function ensureSchema() {
  try {
    await pool.query(createTableSQL);
    console.log('DB schema ensured: table "students" is ready.');
  } catch (err) {
    console.error('Failed to ensure DB schema:', err.message || err);
    throw err;
  }
}

pool.connect()
  .then(async client => {
    client.release();
    try {
      await ensureSchema();
    } catch (err) {
    }
  })
  .catch(err => {
    console.error('DB connection error:', err.message || err);
    console.error('Проверьте переменные окружения DATABASE_URL или PGUSER/PGPASSWORD/PGHOST/PGPORT/PGDATABASE');
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
