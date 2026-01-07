class Student {
  constructor(id, name, age, group, user_id = null) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.group = group;
    this.user_id = user_id;
  }
}

module.exports = Student;