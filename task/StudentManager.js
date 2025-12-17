const { EventEmitter } = require('events');
const Student = require('./Student');
const db = require('./db');

class StudentManager extends EventEmitter {
  constructor() {
    super();
  }

  async addStudent(name, age, group) {
    const id = Date.now().toString();
    const sql = `INSERT INTO students (id, name, age, group_num) VALUES ($1, $2, $3, $4) RETURNING *`;
    const values = [id, name, age, group];
    const res = await db.query(sql, values);
    const row = res.rows[0];
    const student = new Student(row.id, row.name, row.age, row.group_num);
    this.emit('student:added', student);
    return student;
  }

  async removeStudent(id) {
    const res = await db.query(`DELETE FROM students WHERE id = $1`, [id]);
    const removed = res.rowCount > 0;
    if (removed) this.emit('student:removed', { id });
    return removed;
  }

  async getStudentById(id) {
    const res = await db.query(`SELECT * FROM students WHERE id = $1 LIMIT 1`, [id]);
    const row = res.rows[0] || null;
    const student = row ? new Student(row.id, row.name, row.age, row.group_num) : null;
    this.emit('student:retrieved', { id, found: !!student });
    return student;
  }

  async getStudentsByGroup(group) {
    const res = await db.query(`SELECT * FROM students WHERE group_num = $1 ORDER BY id`, [group]);
    const students = res.rows.map(r => new Student(r.id, r.name, r.age, r.group_num));
    this.emit('students:retrieved-by-group', { group, count: students.length });
    return students;
  }

  async getAllStudents() {
    const res = await db.query(`SELECT * FROM students ORDER BY id`);
    const students = res.rows.map(r => new Student(r.id, r.name, r.age, r.group_num));
    this.emit('students:retrieved-all', { count: students.length });
    return students;
  }

  async calculateAverageAge() {
    const res = await db.query(`SELECT AVG(age) AS avg_age FROM students`);
    const avg = parseFloat(res.rows[0].avg_age) || 0;
    this.emit('average-age:calculated', { average: avg });
    return avg;
  }

  async replaceAllStudents(students) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM students');
      for (const s of students) {
        await client.query(
          `INSERT INTO students (id, name, age, group_num) VALUES ($1, $2, $3, $4)`,
          [s.id, s.name, s.age, s.group]
        );
      }
      await client.query('COMMIT');
      const all = await this.getAllStudents();
      return all;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = StudentManager;