'use strict';
const fs = require('node:fs');
const path = require('node:path');
function initialState() {
  return { version: 1, tasks: [], dailyTasks: [], pending: [], history: [], settings: { autoStart: true, notifyWhenClosed: true, sound: true, reducedMotion: false } };
}
function migrate(data) {
  if (data.version !== 1 || !['tasks', 'pending', 'history'].every(key => Array.isArray(data[key])) || (data.dailyTasks !== undefined && !Array.isArray(data.dailyTasks))) throw Error('Định dạng dữ liệu không hợp lệ');
  return { ...data, dailyTasks: data.dailyTasks || [], settings: { ...initialState().settings, ...data.settings } };
}
function createStore(file) {
  let state = fs.existsSync(file) ? migrate(JSON.parse(fs.readFileSync(file, 'utf8'))) : initialState();
  let notify = () => {};
  function persist() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(file + '.tmp', file);
  }
  return {
    get state() { return state; },
    onCommit(callback) { notify = callback; },
    commit(change) {
      const previous = structuredClone(state);
      let result;
      try { result = change(state); persist(); } catch (error) { state = previous; throw error; }
      notify(state); return result;
    }
  };
}
module.exports = { createStore, initialState, migrate };
