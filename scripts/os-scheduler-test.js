// Registers one isolated, short-lived Windows task, lets it launch the real app, then removes it.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createWindowsScheduler } = require('../src/windows-scheduler');
const root = path.join(__dirname, '..');
const id = 'os-wake-' + Date.now();
const dataDir = path.join(root, '.test-data', id);
const file = path.join(dataDir, 'reminders.json');
const log = path.join(root, 'design-previews', 'windows-wake-verification.json');
let status, pid;
const scheduler = createWindowsScheduler({ dataPath: file, executable: require('electron'), args: [root, '--test-mode', '--test-profile=' + id, '--background'], onStatus: value => { status = value; } });
const wait = ms => new Promise(done => setTimeout(done, ms));
(async () => {
  const due = new Date(Date.now() + 25000).toISOString();
  const state = { version: 1, settings: { notifyWhenClosed: true, autoStart: false, sound: false, reducedMotion: false }, pending: [], history: [], tasks: [{ id: 'wake-proof', title: 'Kiểm tra nhắc khi ứng dụng đã thoát', note: 'Lời nhắc kiểm thử tự đóng sau khi xác nhận.', repeat: 'once', time: '09:00', date: '2099-01-01', category: 'personal', enabled: true, nextDue: due, days: [] }] };
  fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(state));
  try {
    await scheduler.sync(state);
    assert.ok(status.registered, status.error || 'Windows registration failed');
    console.log('Windows task registered. No test app is running; waiting for the scheduled launch at ' + due);
    const deadline = Date.now() + 90000;
    let result;
    while (Date.now() < deadline) {
      if (fs.existsSync(path.join(dataDir, 'process.json'))) pid = JSON.parse(fs.readFileSync(path.join(dataDir, 'process.json'), 'utf8')).pid;
      result = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (result.pending.some(item => item.taskId === 'wake-proof')) break;
      await wait(500);
    }
    assert.ok(pid, 'Task Scheduler launched the real Electron application');
    assert.equal(result.pending.length, 1, 'The launched app detected the reminder without user interaction');
    fs.writeFileSync(log, JSON.stringify({ checkedAt: new Date().toISOString(), scheduledAt: due, detectedAt: result.pending[0].detectedAt, passed: true, task: scheduler.name, testProfile: id }, null, 2));
    console.log('PASS: Windows started the app from a stopped state and the app detected its scheduled reminder.');
  } finally {
    await scheduler.sync({ settings: { notifyWhenClosed: false }, tasks: [], pending: [] });
    if (status.error) console.error('Task cleanup failed: ' + status.error);
    if (pid) { try { process.kill(pid); } catch {} }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
