const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const FileStorage = require('../FileStorage');
const Student = require('../Student');

test('FileStorage.saveToJSON and loadJSON roundtrip', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-test-'));
  const filePath = path.join(tmpDir, 'students.test.json');
  const students = [
    new Student('a1', 'Alice', 20, 1),
    new Student('b2', 'Bob', 22, 2)
  ];

  await FileStorage.saveToJSON(students, filePath);
  const loaded = await FileStorage.loadJSON(filePath);

  expect(loaded.length).toBe(students.length);
  expect(loaded[0].name).toBe('Alice');
  expect(loaded[1].age).toBe(22);

  await fs.rm(tmpDir, { recursive: true, force: true });
});
