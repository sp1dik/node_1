const { EventEmitter } = require('events');
const Student = require('./Student');

class StudentManager extends EventEmitter {
  constructor() {
    super();
    this.students = [
      new Student("1", "John Doe", 20, 2),
      new Student("2", "Jane Smith", 23, 3),
      new Student("3", "Mike Johnson", 18, 2),
    ];
  }

  addStudent(name, age, group) {
    const id = (this.students.length + 1).toString();
    const newStudent = new Student(id, name, age, group);
    this.students.push(newStudent);
    this.emit('student:added', newStudent);
    return newStudent;
  }

  removeStudent(id) {
    const initialLength = this.students.length;
    this.students = this.students.filter(student => student.id !== id);
    const removed = this.students.length < initialLength;
    if (removed) {
      this.emit('student:removed', { id });
    }
    return removed;
  }

  getStudentById(id) {
    const student = this.students.find(student => student.id === id) || null;
    this.emit('student:retrieved', { id, found: !!student });
    return student;
  }

  getStudentsByGroup(group) {
    const students = this.students.filter(student => student.group === group);
    this.emit('students:retrieved-by-group', { group, count: students.length });
    return students;
  }

  getAllStudents() {
    this.emit('students:retrieved-all', { count: this.students.length });
    return this.students;
  }

  calculateAverageAge() {
    if (this.students.length === 0) return 0;
    const totalAge = this.students.reduce((sum, student) => sum + student.age, 0);
    const average = totalAge / this.students.length;
    this.emit('average-age:calculated', { average });
    return average;
  }
}

module.exports = StudentManager;