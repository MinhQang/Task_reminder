const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wakePlan, registrationScript, createWindowsScheduler } = require('../src/windows-scheduler');
const now = new Date('2026-11-12T00:00:00Z');
const state = () => ({ settings: { notifyWhenClosed: true }, pending: [], tasks: [{ id: 'a', enabled: true, nextDue: '2026-11-12T02:00:00Z' }, { id: 'b', enabled: true, nextDue: '2026-11-12T01:00:00Z' }] });
test('Windows wake plan chooses the earliest active reminder and ignores acknowledged queue items', () => {
  const data = state(); assert.equal(wakePlan(data, now).next, '2026-11-12T01:00:00.000Z');
  data.pending.push({ taskId: 'b' }); assert.equal(wakePlan(data, now).next, '2026-11-12T02:00:00.000Z');
  data.tasks[0].enabled = false; assert.deepEqual(wakePlan(data, now), { enabled: true, next: null });
  data.settings.notifyWhenClosed = false; assert.deepEqual(wakePlan(data, now), { enabled: false, next: null });
});
test('missed occurrences launch soon; no active reminders removes the OS registration', () => {
  const data = state(); data.tasks[1].nextDue = '2026-11-11T01:00:00Z';
  assert.equal(wakePlan(data, now).next, '2026-11-12T00:00:05.000Z');
  data.tasks = []; assert.equal(wakePlan(data, now).enabled, false);
});
test('registration uses interactive limited privileges and quotes paths literally', () => {
  const script = registrationScript({ name: 'test', executable: "C:\\It's a test\\Reminder.exe", plan: { enabled: true, next: now.toISOString() } });
  assert.match(script, /It''s a test/); assert.match(script, /-LogonType Interactive -RunLevel Limited/);
  assert.match(script, /StartWhenAvailable/); assert.match(script, /-AtLogOn/);
  assert.match(registrationScript({ name: 'test', plan: { enabled: false } }), /Unregister-ScheduledTask/);
});
test('failed Windows registration is reported and can be retried without losing reminders', async () => {
  let calls = 0; const statuses = [];
  const scheduler = createWindowsScheduler({ dataPath: 'test', executable: 'C:\\app.exe', onStatus: value => statuses.push(value), runner: async () => { if (++calls === 1) throw Error('Access denied'); } });
  const data = state(); data.tasks = [];
  await scheduler.sync(data); assert.match(statuses.at(-1).error, /Access denied/);
  await scheduler.sync(data); assert.equal(statuses.at(-1).error, ''); assert.equal(calls, 2);
  await scheduler.sync(data); assert.equal(calls, 2, 'unchanged successful plans are not re-registered');
});
