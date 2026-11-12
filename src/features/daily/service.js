'use strict';
const { randomUUID } = require('node:crypto');
const { localDate } = require('../../scheduler');
const STATUSES = ['todo', 'doing', 'done'];
function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function validateDaily(input) {
  if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 160) throw Error('Nhập tên công việc (tối đa 160 ký tự).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw Error('Ngày công việc không hợp lệ.');
  localDate(input.date, '12:00');
  if (!['low', 'normal', 'high'].includes(input.priority)) throw Error('Mức ưu tiên không hợp lệ.');
  if (!STATUSES.includes(input.status)) throw Error('Trạng thái không hợp lệ.');
  return { title: input.title.trim(), note: String(input.note || '').trim().slice(0, 1000), date: input.date, priority: input.priority, status: input.status };
}
function createDailyService(store) {
  const find = (state, id) => { const task = state.dailyTasks.find(task => task.id === id); if (!task) throw Error('Không tìm thấy công việc.'); return task; };
  return {
    save(input) { return store.commit(state => {
      const data = validateDaily(input), now = new Date().toISOString();
      if (input.id) {
        const task = find(state, input.id), wasDone = task.status === 'done';
        Object.assign(task, data, { updatedAt: now, completedAt: data.status === 'done' ? (wasDone ? task.completedAt : now) : null });
      } else state.dailyTasks.push({ ...data, id: randomUUID(), createdAt: now, updatedAt: now, completedAt: data.status === 'done' ? now : null });
    }); },
    status(id, status) {
      if (!STATUSES.includes(status)) throw Error('Trạng thái không hợp lệ.');
      return store.commit(state => { const task = find(state, id); if (task.status === status) return; task.status = status; task.updatedAt = new Date().toISOString(); task.completedAt = status === 'done' ? task.updatedAt : null; });
    },
    remove(id) { return store.commit(state => { find(state, id); state.dailyTasks = state.dailyTasks.filter(task => task.id !== id); }); },
    moveToday(id) { return store.commit(state => { const task = find(state, id); task.date = dayKey(); task.updatedAt = new Date().toISOString(); }); }
  };
}
module.exports = { createDailyService, validateDaily, dayKey };
