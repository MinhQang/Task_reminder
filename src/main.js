'use strict';
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, dialog, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('./core/store');
const { createReminderService } = require('./features/reminders/service');
const { createDailyService } = require('./features/daily/service');
const { summarize } = require('./features/dashboard/summary');
const { registerFeatureIPC } = require('./platform/ipc');
const { createWindowsScheduler } = require('./windows-scheduler');
const buildInfo = require('./build-info.json');
const { supportsAcrylic } = require('./platform/material');
const nativeGlass = supportsAcrylic();
const testMode = process.argv.includes('--test-mode');
// Reminder chimes must work in a newly opened popup without waiting for a click.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const profileArg = process.argv.find(arg => arg.startsWith('--test-profile='))?.slice('--test-profile='.length);
const testProfile = profileArg || process.env.REMINDER_TEST_ID || 'default';
if (testMode) {
  if (!/^[a-zA-Z0-9-]+$/.test(testProfile)) throw new Error('Invalid test profile');
  const testRoot = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');
  app.setPath('userData', path.join(testRoot, '.test-data', testProfile));
} else app.setPath('userData', path.join(app.getPath('appData'), 'task-reminder'));
let main, popup, overlay, tray, quitting = false, locked = false, file, preview = false, storageErrorShown = false, popupClosing = false;
let store, reminders, daily;
let hideTimer, hidePending = false;
let windowsScheduler, wakeStatus = { registered: false, working: false, error: '' };
function broadcast() { for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('changed'); }
function makeWindow(options, page) {
  const acrylic = nativeGlass && ['index.html', 'popup.html'].includes(page);
  const win = new BrowserWindow({ show: false, icon: path.join(__dirname, 'assets', 'icon.png'), backgroundColor: acrylic ? '#00000000' : '#edf2fb', backgroundMaterial: acrylic ? 'acrylic' : 'none', roundedCorners: true, frame: false, ...options, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: page === 'index.html', additionalArguments: [...(acrylic ? ['--native-glass'] : []), ...(acrylic && page === 'popup.html' ? ['--compact-popup'] : [])] } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'ui', page));
  return win;
}
function showMain() { if (!main || main.isDestroyed()) return; clearTimeout(hideTimer); hidePending = false; if (main.isMinimized()) main.restore(); main.show(); main.focus(); main.webContents.send('window-shown'); }
function showPopup(isPreview = false) {
  if (store.state.pending.length) isPreview = false;
  if (locked || (!isPreview && !store.state.pending.length)) return;
  if (popup && !popup.isDestroyed()) { if (!isPreview) { preview = false; broadcast(); } overlay?.showInactive(); popup.show(); return; }
  preview = isPreview;
  const bounds = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds;
  popupClosing = false;
  if (nativeGlass) {
    overlay = makeWindow({ ...bounds, transparent: true, backgroundColor: '#00000000', hasShadow: false, focusable: false, resizable: false, alwaysOnTop: true, skipTaskbar: true }, 'dimmer.html');
    overlay.setIgnoreMouseEvents(true);
    overlay.once('ready-to-show', () => { if (!locked) { overlay?.showInactive(); if (popup?.isVisible()) popup.moveTop(); } });
  }
  const size = { width: Math.min(650, bounds.width - 32), height: Math.min(460, bounds.height - 32) };
  const geometry = nativeGlass ? { ...size, x: Math.round(bounds.x + (bounds.width - size.width) / 2), y: Math.round(bounds.y + (bounds.height - size.height) / 2) } : bounds;
  popup = makeWindow({ ...geometry, transparent: !nativeGlass, backgroundColor: '#00000000', hasShadow: nativeGlass, resizable: false, maximizable: false, alwaysOnTop: true, skipTaskbar: true }, 'popup.html');
  popup.once('ready-to-show', () => { popup.show(); popup.focus(); popup.moveTop(); });
  popup.on('close', e => { if (!quitting && !popupClosing && (preview || store.state.pending.length)) e.preventDefault(); });
  popup.on('closed', () => { if (overlay && !overlay.isDestroyed()) overlay.destroy(); overlay = null; popup = null; preview = false; });
}
function checkDue() {
  try {
    if (reminders.check()) showPopup();
    storageErrorShown = false;
  } catch (err) {
    if (!storageErrorShown) { storageErrorShown = true; dialog.showErrorBox('Không thể lưu lời nhắc', err.message); }
  }
}
function configureLogin() {
  if (!testMode && app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.state.settings.autoStart, path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--background'] });
}
const instanceFile = path.join(app.getPath('userData'), 'running-instance.json');
const executable = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
if (!app.requestSingleInstanceLock({ version: app.getVersion(), executable })) {
  let existing;
  try { existing = JSON.parse(fs.readFileSync(instanceFile, 'utf8')); process.kill(existing.pid, 0); } catch { existing = null; }
  if (!process.argv.includes('--background') && (!existing || existing.version !== app.getVersion() || existing.executable !== executable)) {
    dialog.showErrorBox('Đang có một bản Task Reminder khác chạy nền', `Bạn đang mở Task Reminder ${app.getVersion()} tại:\n${executable}\n\n${existing ? `Bản đang chạy: ${existing.version}\n${existing.executable}` : 'Có thể bản portable hoặc phiên bản cũ vẫn đang chạy ở thư mục khác.'}\n\nHãy chọn “Thoát ứng dụng” từ biểu tượng Task Reminder ở khay hệ thống, rồi mở lại bản vừa cài. Bấm X chỉ thu cửa sổ về khay.`);
  }
  app.quit();
}
else {
  app.on('second-instance', (_event, argv) => { if (argv.includes('--background')) { if (store) { checkDue(); showPopup(); } } else showMain(); });
  app.whenReady().then(() => {
    app.setAppUserModelId('local.taskreminder.desktop');
    file = path.join(app.getPath('userData'), 'reminders.json');
    store = createStore(file);
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(instanceFile, JSON.stringify({ pid: process.pid, version: app.getVersion(), executable, sourceHash: buildInfo.sourceHash }));
    reminders = createReminderService(store); daily = createDailyService(store);
    store.onCommit(current => { broadcast(); windowsScheduler?.sync(current); });
    if (testMode) { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(path.join(app.getPath('userData'), 'process.json'), JSON.stringify({ pid: process.pid })); }
    if (!testMode && process.platform === 'win32' && app.isPackaged) {
      windowsScheduler = createWindowsScheduler({ dataPath: file, executable: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, onStatus: status => { wakeStatus = status; broadcast(); } });
    }
    if (process.argv.includes('--scheduled-wake') && !store.state.settings.autoStart && !store.state.pending.length && !store.state.tasks.some(task => task.enabled && task.nextDue && +new Date(task.nextDue) <= Date.now())) {
      if (windowsScheduler) windowsScheduler.sync(store.state).finally(() => app.quit());
      else app.quit();
      return;
    }
    main = makeWindow({ width: 1180, height: 800, minWidth: 860, minHeight: 650 }, 'index.html');
    main.once('ready-to-show', () => { if (!process.argv.includes('--background')) main.show(); });
    main.on('show', () => { clearTimeout(hideTimer); hidePending = false; main.webContents.send('window-shown'); });
    main.on('close', e => {
      if (!quitting) {
        e.preventDefault(); hidePending = true; main.webContents.send('will-hide');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { if (hidePending && !main.isDestroyed()) { hidePending = false; main.hide(); } }, 220);
      }
    });
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(icon);
    tray.setToolTip('Task Reminder • Đang nhắc việc');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Mở Task Reminder', click: showMain }, { label: 'Thêm nhắc nhở', click: () => { showMain(); main.webContents.send('changed'); } }, { type: 'separator' }, { label: 'Thoát ứng dụng', click: () => app.quit() }]));
    tray.on('double-click', showMain);
    registerFeatureIPC(ipcMain, {
      store, reminders, daily,
      snapshot: e => ({ ...store.state, dashboard: summarize(store.state), appVersion: app.getVersion(), executablePath: executable, nativeGlass, buildInfo, wakeStatus, preview: e.sender === popup?.webContents && preview, packaged: app.isPackaged, dataPath: file }),
      configureLogin,
      resolve: (id, action) => {
        if (!['done', 'snooze'].includes(action)) throw Error('Thao tác không hợp lệ.');
        if (id === 'preview') { if (popup && preview) { popupClosing = true; popup.close(); } return; }
        reminders.resolve(id, action);
        if (!store.state.pending.length && popup) { popupClosing = true; popup.close(); }
      }
    });
    ipcMain.handle('preview', () => showPopup(true));
    ipcMain.on('dismiss-progress', (e, value) => { if (e.sender === popup?.webContents && overlay && Number.isFinite(value)) overlay.setOpacity(1 - Math.max(0, Math.min(1, value))); });
    ipcMain.on('window-close', e => BrowserWindow.fromWebContents(e.sender)?.close());
    ipcMain.on('window-hidden-ready', e => { if (e.sender === main.webContents && hidePending) { clearTimeout(hideTimer); hidePending = false; main.hide(); } });
    ipcMain.on('window-minimize', e => BrowserWindow.fromWebContents(e.sender)?.minimize());
    ipcMain.on('manage', () => showMain());
    configureLogin();
    checkDue(); if (store.state.pending.length) showPopup();
    windowsScheduler?.sync(store.state);
    setInterval(checkDue, 1000);
    setInterval(() => { if (wakeStatus.error) windowsScheduler?.sync(store.state); }, 60000);
    powerMonitor.on('lock-screen', () => { locked = true; overlay?.hide(); popup?.hide(); });
    powerMonitor.on('unlock-screen', () => { locked = false; checkDue(); showPopup(); });
    powerMonitor.on('resume', () => { checkDue(); showPopup(); });
  }).catch(err => { dialog.showErrorBox('Task Reminder', err.message); app.exit(1); });
  app.on('window-all-closed', () => {});
  app.on('before-quit', event => {
    if (quitting) return;
    quitting = true;
    try { if (JSON.parse(fs.readFileSync(instanceFile, 'utf8')).pid === process.pid) fs.unlinkSync(instanceFile); } catch {}
    if (windowsScheduler) { event.preventDefault(); windowsScheduler.idle().finally(() => app.quit()); }
  });
}
