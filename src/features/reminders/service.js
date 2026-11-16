'use strict';
const { randomUUID } = require('node:crypto');
const { nextOccurrence, validateTask, collectDue, resolvePending } = require('../../scheduler');
function createReminderService(store) {
  return {
    save(input) { return store.commit(state => {
      const data = validateTask(input), now = new Date(), due = nextOccurrence(data, now, true);
      if (!due) throw Error('Hãy chọn thời gian trong tương lai.');
      if (input.id) {
        const task = state.tasks.find(task => task.id === input.id);
        if (!task) throw Error('Không tìm thấy nhắc nhở.');
        Object.assign(task, data, { nextDue: due, enabled: true });
        state.pending = state.pending.filter(item => item.taskId !== task.id);
      } else state.tasks.push({ ...data, id: randomUUID(), createdAt: now.toISOString(), nextDue: due, enabled: true });
      return true;
    }); },
    toggle(id) { return store.commit(state => {
      const task = state.tasks.find(task => task.id === id);
      if (!task) throw Error('Không tìm thấy nhắc nhở.');
      if (!task.enabled) {
        const due = nextOccurrence(task, new Date(), true);
        if (!due) throw Error('Lịch một lần đã qua. Hãy sửa ngày giờ để bật lại.');
        task.nextDue = due;
      }
      task.enabled = !task.enabled;
      if (!task.enabled) state.pending = state.pending.filter(item => item.taskId !== id);
    }); },
    remove(id) { return store.commit(state => { state.tasks = state.tasks.filter(task => task.id !== id); state.pending = state.pending.filter(item => item.taskId !== id); }); },
    resolve(id, action) {
      if (!['done', 'snooze'].includes(action)) throw Error('Thao tác không hợp lệ.');
      return store.commit(state => resolvePending(state, id, action, new Date()));
    },
    check() {
      const now = new Date();
      const pending = new Set(store.state.pending.map(item => item.taskId));
      if (!store.state.tasks.some(task => task.enabled && task.nextDue && new Date(task.nextDue) <= now && !pending.has(task.id))) return false;
      store.commit(state => collectDue(state, now)); return true;
    }
  };
}
module.exports = { createReminderService };
