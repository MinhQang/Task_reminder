const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextOccurrence, validateTask, collectDue, resolvePending } = require('../src/scheduler');
const task = (overrides = {}) => ({ id: 'task1', title: 'Uống nước', note: '', category: 'health', repeat: 'daily', time: '09:00', days: [], enabled: true, ...overrides });
const local = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min);
test('daily uses local time, advancing to tomorrow after its scheduled minute', () => {
  assert.equal(+new Date(nextOccurrence(task(), local(2026, 11, 12, 8))), +local(2026, 11, 12, 9));
  assert.equal(+new Date(nextOccurrence(task(), local(2026, 11, 12, 9))), +local(2026, 11, 13, 9));
});
test('weekly chooses selected weekdays and crosses month/year boundaries', () => {
  const next = new Date(nextOccurrence(task({ repeat: 'weekly', days: [1] }), local(2026, 12, 31, 12)));
  assert.equal(+next, +local(2027, 1, 4, 9));
});
test('one-time reminder expires after completion', () => {
  const t = task({ repeat: 'once', date: '2026-11-12' });
  assert.equal(nextOccurrence(t, local(2026, 11, 12, 10)), null);
  assert.equal(+new Date(nextOccurrence(t, local(2026, 11, 12, 8))), +local(2026, 11, 12, 9));
});
test('validation rejects malformed dates, time, empty title and weekly schedule', () => {
  for (const overrides of [{ time: '25:00' }, { title: ' ' }, { repeat: 'weekly' }, { repeat: 'once', date: '2026-02-30' }, { repeat: 'once', date: 'oops' }]) assert.throws(() => validateTask(task(overrides)));
});
test('missed reminders persist, deduplicate and aggregate days offline', () => {
  const t = task({ nextDue: local(2026, 11, 1, 9).toISOString() });
  const state = { tasks: [t], pending: [], history: [] };
  assert.equal(collectDue(state, local(2026, 11, 12, 10)), true);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(collectDue(restored, local(2026, 11, 12, 11)), false);
  assert.equal(restored.pending.length, 1);
  resolvePending(restored, restored.pending[0].id, 'done', local(2026, 11, 12, 11));
  assert.equal(+new Date(restored.tasks[0].nextDue), +local(2026, 11, 13, 9));
  assert.equal(restored.pending.length, 0);
  assert.equal(restored.history.length, 1);
});
test('snooze survives restart and returns to original recurrence after completion', () => {
  const state = { tasks: [task({ nextDue: local(2026, 11, 12, 9).toISOString() })], pending: [], history: [] };
  collectDue(state, local(2026, 11, 12, 9));
  resolvePending(state, state.pending[0].id, 'snooze', local(2026, 11, 12, 9));
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(collectDue(restored, local(2026, 11, 12, 9, 9)), false);
  assert.equal(collectDue(restored, local(2026, 11, 12, 9, 10)), true);
  resolvePending(restored, restored.pending[0].id, 'done', local(2026, 11, 12, 9, 10));
  assert.equal(+new Date(restored.tasks[0].nextDue), +local(2026, 11, 13, 9));
});
test('paused and future reminders do not fire', () => {
  const state = { tasks: [task({ enabled: false, nextDue: local(2026, 11, 1, 9).toISOString() }), task({ id: 'future', nextDue: local(2027, 1, 1, 9).toISOString() })], pending: [], history: [] };
  assert.equal(collectDue(state, local(2026, 11, 12, 10)), false);
});
