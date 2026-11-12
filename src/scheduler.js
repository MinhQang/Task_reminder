'use strict';

function localDate(value, time) {
  const [y, m, d] = value.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const date = new Date(y, m - 1, d, h, min, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) throw new Error('Ngày không hợp lệ.');
  return date;
}

// Calendar arithmetic deliberately follows the computer's LOCAL wall clock, including DST.
function nextOccurrence(task, after, inclusive = false) {
  const from = new Date(after);
  if (task.repeat === 'once') {
    const date = localDate(task.date, task.time);
    return date.getTime() > +from || (inclusive && +date === +from) ? date.toISOString() : null;
  }
  const [h, m] = task.time.split(':').map(Number);
  const date = new Date(from);
  date.setHours(h, m, 0, 0);
  for (let i = 0; i < 8; i++) {
    if ((+date > +from || (inclusive && +date === +from)) &&
      (task.repeat === 'daily' || task.days.includes(date.getDay()))) return date.toISOString();
    date.setDate(date.getDate() + 1);
    date.setHours(h, m, 0, 0);
  }
  throw new Error('Hãy chọn ít nhất một ngày trong tuần.');
}

function validateTask(input) {
  if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 160) throw new Error('Nhập tên công việc (tối đa 160 ký tự).');
  if (!['once', 'daily', 'weekly'].includes(input.repeat)) throw new Error('Lịch lặp không hợp lệ.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Giờ nhắc không hợp lệ.');
  if (input.repeat === 'once' && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Hãy chọn ngày nhắc.');
  const days = Array.isArray(input.days) ? [...new Set(input.days.filter(n => Number.isInteger(n) && n >= 0 && n <= 6))] : [];
  if (input.repeat === 'weekly' && !days.length) throw new Error('Chọn ít nhất một ngày trong tuần.');
  const task = { title: input.title.trim(), note: String(input.note || '').trim().slice(0, 1000), repeat: input.repeat, time: input.time, date: input.date || '', days, category: ['work', 'personal', 'health'].includes(input.category) ? input.category : 'personal' };
  if (task.repeat === 'once') localDate(task.date, task.time);
  return task;
}

function collectDue(state, now) {
  let changed = false;
  for (const task of state.tasks) {
    if (!task.enabled || !task.nextDue || new Date(task.nextDue) > now || state.pending.some(p => p.taskId === task.id)) continue;
    state.pending.push({ id: `${task.id}:${task.nextDue}`, taskId: task.id, dueAt: task.nextDue, detectedAt: now.toISOString(), title: task.title, note: task.note, category: task.category });
    changed = true;
  }
  return changed;
}

function resolvePending(state, id, action, now) {
  const item = state.pending.find(p => p.id === id);
  if (!item) throw new Error('Nhắc nhở này đã được xử lý.');
  const task = state.tasks.find(t => t.id === item.taskId);
  if (task) {
    if (action === 'snooze') task.nextDue = new Date(+now + 10 * 60000).toISOString();
    else {
      if (task.repeat === 'once') state.tasks = state.tasks.filter(candidate => candidate.id !== task.id);
      else { task.nextDue = nextOccurrence(task, now); if (!task.nextDue) task.enabled = false; }
    }
  }
  state.pending = state.pending.filter(p => p.id !== id);
  state.history.unshift({ ...item, action, resolvedAt: now.toISOString() });
  state.history = state.history.slice(0, 500);
}
module.exports = { localDate, nextOccurrence, validateTask, collectDue, resolvePending };
