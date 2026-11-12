'use strict';
const { dayKey } = require('../daily/service');
function summarize(state, now = new Date()) {
  const today = dayKey(now), tasks = state.dailyTasks || [], due = tasks.filter(task => task.date === today);
  const done = due.filter(task => task.status === 'done').length;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now); date.setDate(date.getDate() - 6 + index);
    const key = dayKey(date), list = tasks.filter(task => task.date === key);
    return { date: key, total: list.length, done: list.filter(task => task.status === 'done').length };
  });
  return { today, total: due.length, done, todo: due.filter(task => task.status === 'todo').length, doing: due.filter(task => task.status === 'doing').length, percent: due.length ? Math.round(done / due.length * 100) : 0, overdue: tasks.filter(task => task.date < today && task.status !== 'done').length, activeReminders: state.tasks.filter(task => task.enabled).length, pending: state.pending.length, week,
    todayTasks: due.slice().sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || ['high', 'normal', 'low'].indexOf(a.priority) - ['high', 'normal', 'low'].indexOf(b.priority)).slice(0, 5),
    nextReminders: state.tasks.filter(task => task.enabled && task.nextDue).sort((a, b) => +new Date(a.nextDue) - +new Date(b.nextDue)).slice(0, 3) };
}
module.exports = { summarize };
