const { _electron: electron } = require('playwright');
const path = require('node:path');
(async () => {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: path.join(__dirname, '..', 'dist', 'win-unpacked', 'Task Reminder.exe'),
    args: ['--test-mode', '--test-profile=interactive-demo'], env, timeout: 30000
  });
  const page = await app.firstWindow();
  await page.waitForFunction(() => document.querySelector('#dashboard-progress-note')?.textContent.length > 0);
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('index.html'));
    if (win.isMinimized()) win.restore();
    win.center(); win.show(); win.focus();
  });
  await page.bringToFront();
  console.log('APP_VISIBLE', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => ({ title: w.getTitle(), visible: w.isVisible(), bounds: w.getBounds() }))));
  await new Promise(resolve => app.on('close', resolve));
})().catch(error => { console.error(error); process.exitCode = 1; });
