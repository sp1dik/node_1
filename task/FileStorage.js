const fs = require('fs');
const Student = require('./Student');

class FileStorage {
  static saveToJSON(data, filePath) {
    try {
      const jsonData = data.map(student => ({
        id: student.id,
        name: student.name,
        age: student.age,
        group: student.group
      }));
      
      const jsonString = JSON.stringify(jsonData, null, 2);
      fs.writeFileSync(filePath, jsonString, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save students to JSON file: ${error.message}`);
    }
  }

  static loadJSON(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const jsonString = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(jsonString);

      if (!Array.isArray(data)) {
        throw new Error('JSON data must be an array of students');
      }

      return data.map(item => 
        new Student(item.id, item.name, item.age, item.group)
      );
    } catch (error) {
      throw new Error(`Failed to load students from JSON file: ${error.message}`);
    }
  }
}

module.exports = FileStorage;