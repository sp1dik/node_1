const fs = require('fs').promises;
const path = require('path');
const Student = require('./Student');

class FileStorage {
  static async saveToJSON(data, filePath) {
    try {
      const jsonData = data.map(student => ({
        id: student.id,
        name: student.name,
        age: student.age,
        group: student.group
      }));
      
      const jsonString = JSON.stringify(jsonData, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save students to JSON file: ${error.message}`);
    }
  }

  static async loadJSON(filePath) {
    try {
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      let jsonString = await fs.readFile(filePath, 'utf8');

      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
      jsonString = jsonString
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, ''))
        .join('\n')
        .trim();

      const data = JSON.parse(jsonString);

      if (!Array.isArray(data)) {
        throw new Error('JSON data must be an array of students');
      }

      return data.map(item => 
        new Student(item.id, item.name, item.age, item.group !== undefined ? item.group : item.group_num)
      );
    } catch (error) {
      throw new Error(`Failed to load students from JSON file: ${error.message}`);
    }
  }

  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }
}

module.exports = FileStorage;