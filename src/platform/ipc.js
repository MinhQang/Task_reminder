'use strict';
// This is the only feature IPC registration point. Services own validation and transactions.
function registerFeatureIPC(ipc, { store, reminders, daily, snapshot, configureLogin, resolve }) {
  ipc.handle('state', snapshot);
  ipc.handle('save-task', (_event, input) => reminders.save(input));
  ipc.handle('toggle-task', (_event, id) => reminders.toggle(id));
  ipc.handle('delete-task', (_event, id) => reminders.remove(id));
  ipc.handle('resolve', (_event, id, action) => resolve(id, action));
  ipc.handle('save-daily', (_event, input) => daily.save(input));
  ipc.handle('daily-status', (_event, id, status) => daily.status(id, status));
  ipc.handle('delete-daily', (_event, id) => daily.remove(id));
  ipc.handle('daily-today', (_event, id) => daily.moveToday(id));
  ipc.handle('settings', (_event, data) => {
    try {
      store.commit(state => {
        for (const key of ['autoStart', 'notifyWhenClosed', 'sound', 'reducedMotion']) if (typeof data[key] === 'boolean') state.settings[key] = data[key];
        configureLogin();
      });
    } catch (error) { configureLogin(); throw error; }
  });
}
module.exports = { registerFeatureIPC };
