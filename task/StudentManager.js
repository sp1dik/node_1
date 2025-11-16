const Student = require('./Student');

class StudentManager {
  constructor() {
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
    return newStudent;
  }

  removeStudent(id) {
    const initialLength = this.students.length;
    this.students = this.students.filter(student => student.id !== id);
    return this.students.length < initialLength;
  }

  getStudentById(id) {
    return this.students.find(student => student.id === id) || null;
  }

  getStudentsByGroup(group) {
    return this.students.filter(student => student.group === group);
  }

  getAllStudents() {
    return this.students;
  }

  calculateAverageAge() {
    if (this.students.length === 0) return 0;
    const totalAge = this.students.reduce((sum, student) => sum + student.age, 0);
    return totalAge / this.students.length;
  }
}

module.exports = StudentManager;