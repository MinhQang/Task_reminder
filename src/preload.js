const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('reminder', {
  nativeGlass: process.argv.includes('--native-glass'),
  compactPopup: process.argv.includes('--compact-popup'),
  dismissProgress: value => ipcRenderer.send('dismiss-progress', value),
  getState: () => ipcRenderer.invoke('state'),
  saveDaily: data => ipcRenderer.invoke('save-daily', data),
  setDailyStatus: (id, status) => ipcRenderer.invoke('daily-status', id, status),
  deleteDaily: id => ipcRenderer.invoke('delete-daily', id),
  moveDailyToday: id => ipcRenderer.invoke('daily-today', id),
  saveTask: data => ipcRenderer.invoke('save-task', data),
  toggleTask: id => ipcRenderer.invoke('toggle-task', id),
  deleteTask: id => ipcRenderer.invoke('delete-task', id),
  resolve: (id, action) => ipcRenderer.invoke('resolve', id, action),
  settings: data => ipcRenderer.invoke('settings', data),
  preview: () => ipcRenderer.invoke('preview'),
  close: () => ipcRenderer.send('window-close'),
  hiddenReady: () => ipcRenderer.send('window-hidden-ready'),
  onHide: callback => { const fn = () => callback(); ipcRenderer.on('will-hide', fn); return () => ipcRenderer.removeListener('will-hide', fn); },
  onShow: callback => { const fn = () => callback(); ipcRenderer.on('window-shown', fn); return () => ipcRenderer.removeListener('window-shown', fn); },
  minimize: () => ipcRenderer.send('window-minimize'),
  manage: () => ipcRenderer.send('manage'),
  onChange: callback => { const fn = () => callback(); ipcRenderer.on('changed', fn); return () => ipcRenderer.removeListener('changed', fn); }
});
