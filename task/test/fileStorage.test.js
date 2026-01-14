const test = require('node:test');
const assert = require('node:assert');
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

  assert.strictEqual(loaded.length, students.length);
  assert.strictEqual(loaded[0].name, 'Alice');
  assert.strictEqual(loaded[1].age, 22);

  await fs.rm(tmpDir, { recursive: true, force: true });
});
