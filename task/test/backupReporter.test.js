const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const BackupReporter = require('../BackupReporter');

test('BackupReporter.generateReport computes counts', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'br-test-'));
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const file1 = path.join(tmpDir, `backup-${now}.backup.json`);
  const file2 = path.join(tmpDir, `backup-${now}-2.backup.json`);
  const data1 = [{ id: '1', name: 'A', age: 20, group:1 }];
  const data2 = [{ id: '1', name: 'A', age: 20, group:1 }, { id: '2', name:'B', age:21, group:2 }];
  await fs.writeFile(file1, JSON.stringify(data1));
  await fs.writeFile(file2, JSON.stringify(data2));

  const reporter = new BackupReporter();
  const report = await reporter.generateReport(tmpDir);
  assert.strictEqual(report.backupFileCount, 2);
  assert.strictEqual(report.totalStudentsAcrossAll, 3);
  await fs.rm(tmpDir, { recursive: true, force: true });
});
