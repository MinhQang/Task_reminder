const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createStore, migrate, initialState } = require('../src/core/store');
const { createDailyService, validateDaily, dayKey } = require('../src/features/daily/service');
const { createReminderService } = require('../src/features/reminders/service');
const { summarize } = require('../src/features/dashboard/summary');
const { collectDue, resolvePending } = require('../src/scheduler');
test('idle reminder checks neither clone state nor commit; due reminders commit once', () => {
  let commits = 0;
  const state = { tasks: [{ id: 'future', enabled: true, nextDue: new Date(Date.now() + 60000).toISOString() }], pending: [] };
  const service = createReminderService({ state, commit(change) { commits++; change(state); } });
  state.uncloneable = () => {}; // Idle checks must not structuredClone the store.
  assert.equal(service.check(), false);
  assert.equal(commits, 0);
  state.tasks[0].nextDue = new Date(Date.now() - 1000).toISOString();
  assert.equal(service.check(), true);
  assert.equal(service.check(), false);
  assert.equal(commits, 1);
  assert.equal(state.pending.length, 1);
});
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(__dirname, '..', '.test-data', 'features-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'reminders.json'), store = createStore(file);
  return { file, store, daily: createDailyService(store) };
}
fs.mkdirSync(path.join(__dirname, '..', '.test-data'), { recursive: true });
const input = { title: '  Thiết kế giao diện  ', note: 'Chi tiết', date: '2026-11-12', priority: 'high', status: 'todo' };
test('old profiles migrate without removing reminder, pending, history or settings', () => {
  const old = { version: 1, tasks: [{ id: 'old' }], pending: [{ id: 'pending' }], history: [{ id: 'history' }], settings: { sound: false } };
  const migrated = migrate(old);
  assert.deepEqual(migrated.dailyTasks, []);
  for (const key of ['tasks', 'pending', 'history']) assert.deepEqual(migrated[key], old[key]);
  assert.equal(migrated.settings.sound, false); assert.equal(migrated.settings.notifyWhenClosed, true);
  assert.throws(() => migrate({ ...old, dailyTasks: {} }));
});
test('daily validation rejects impossible dates, invalid states and missing title', () => {
  for (const change of [{ date: '2026-02-29' }, { date: '2026-13-01' }, { date: 'invalid' }, { status: 'unknown' }, { priority: 'urgent' }, { title: ' ' }]) assert.throws(() => validateDaily({ ...input, ...change }));
  assert.equal(validateDaily({ ...input, date: '2028-02-29' }).title, 'Thiết kế giao diện');
});
test('daily CRUD persists, completing and reopening updates completion time, move overdue to today', t => {
  const { daily, store, file } = fixture(t);
  daily.save(input); const id = store.state.dailyTasks[0].id;
  daily.status(id, 'doing'); assert.equal(store.state.dailyTasks[0].completedAt, null);
  daily.status(id, 'done'); assert.ok(store.state.dailyTasks[0].completedAt);
  const completedAt = store.state.dailyTasks[0].completedAt;
  daily.save({ ...input, id, title: 'Đã chỉnh sửa', status: 'done' });
  assert.equal(store.state.dailyTasks[0].completedAt, completedAt);
  assert.equal(createStore(file).state.dailyTasks[0].title, 'Đã chỉnh sửa');
  daily.status(id, 'todo'); assert.equal(store.state.dailyTasks[0].completedAt, null);
  daily.moveToday(id); assert.equal(store.state.dailyTasks[0].date, dayKey());
  daily.remove(id); assert.equal(createStore(file).state.dailyTasks.length, 0);
  assert.throws(() => daily.status(id, 'done'));
});
test('failed transaction restores memory and existing disk contents', t => {
  const { store, file, daily } = fixture(t); daily.save(input);
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => store.commit(state => { state.dailyTasks.length = 0; throw Error('abort'); }));
  assert.equal(store.state.dailyTasks.length, 1); assert.equal(fs.readFileSync(file, 'utf8'), before);
  // A write failure must also roll back changes, without replacing valid existing user data.
  fs.mkdirSync(file + '.tmp');
  assert.throws(() => daily.status(store.state.dailyTasks[0].id, 'done'));
  assert.equal(store.state.dailyTasks[0].status, 'todo'); assert.equal(fs.readFileSync(file, 'utf8'), before);
});
test('dashboard respects local day, excludes finished overdue tasks, and summarizes seven calendar days', () => {
  const state = initialState();
  state.dailyTasks = [
    { ...input, id: '1', date: '2027-01-01', status: 'done' },
    { ...input, id: '2', date: '2027-01-01', status: 'doing' },
    { ...input, id: '3', date: '2026-12-31', status: 'todo' },
    { ...input, id: '4', date: '2026-12-30', status: 'done' },
    { ...input, id: '5', date: '2027-01-02', status: 'todo' }
  ];
  const summary = summarize(state, new Date(2027, 0, 1, 0, 5));
  assert.equal(summary.total, 2); assert.equal(summary.done, 1); assert.equal(summary.doing, 1); assert.equal(summary.percent, 50); assert.equal(summary.overdue, 1);
  assert.equal(summary.week[0].date, '2026-12-26'); assert.equal(summary.week[6].date, '2027-01-01');
  assert.equal(summary.todayTasks[0].id, '2');
});
test('one-time dismissal removes schedule durably and keeps history; snooze keeps it until dismissed', t => {
  const { store, file } = fixture(t), reminders = createReminderService(store);
  const past = new Date(Date.now() - 1000).toISOString();
  store.commit(state => { state.tasks.push({ id: 'once', title: 'Một lần', repeat: 'once', date: dayKey(), time: '00:00', nextDue: past, enabled: true }); });
  reminders.check(); reminders.resolve(store.state.pending[0].id, 'snooze');
  assert.equal(store.state.tasks.length, 1); assert.equal(store.state.pending.length, 0);
  store.commit(state => { state.tasks[0].nextDue = past; }); reminders.check(); reminders.resolve(store.state.pending[0].id, 'done');
  const restored = createStore(file).state;
  assert.equal(restored.tasks.length, 0); assert.equal(restored.pending.length, 0); assert.equal(restored.history[0].title, 'Một lần'); assert.equal(restored.history[0].action, 'done');
});
test('dismissing recurring reminder keeps its schedule and other pending reminders', () => {
  const state = initialState(), now = new Date(2026, 10, 12, 10);
  state.tasks = ['once', 'daily'].map(repeat => ({ id: repeat, title: repeat, repeat, date: '2026-11-12', time: '09:00', days: [], nextDue: new Date(2026, 10, 12, 9).toISOString(), enabled: true }));
  collectDue(state, now); resolvePending(state, state.pending.find(p => p.taskId === 'once').id, 'done', now);
  assert.equal(state.tasks.length, 1); assert.equal(state.pending.length, 1);
  resolvePending(state, state.pending[0].id, 'done', now);
  assert.equal(state.tasks.length, 1); assert.equal(state.tasks[0].enabled, true); assert.ok(+new Date(state.tasks[0].nextDue) > +now);
});
