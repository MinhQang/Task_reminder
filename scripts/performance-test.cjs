const { _electron: electron } = require('playwright');
const { waitForMain, waitForPopup, dismissPopup } = require('./electron-helpers.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..'), profile = `performance-${Date.now()}`;
  const directory = process.argv[2] && path.resolve(process.argv[2]);
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ ...(directory ? { executablePath: path.join(directory, 'Task Reminder.exe') } : {}), args: [...(directory ? [] : [root]), '--test-mode', `--test-profile=${profile}`], env });
  try {
    const page = await waitForMain(app);
    await page.waitForFunction(() => typeof state !== 'undefined' && state);
    if (process.env.PERF_SIMPLE === '1') await page.evaluate(() => { document.querySelectorAll('.glass-optics').forEach(el => el.style.display = 'none'); document.querySelectorAll('*').forEach(el => { el.style.backdropFilter = 'none'; el.style.boxShadow = 'none'; }); });
    const gpu = await app.evaluate(({app}) => app.getGPUFeatureStatus());
    const tabs = await page.evaluate(async () => {
      const times = [], longTasks = [];
      const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
      observer.observe({ type: 'longtask', buffered: false });
      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        document.querySelector(`[data-view="${['daily', 'all', 'dashboard'][i % 3]}"]`).click();
        await new Promise(requestAnimationFrame);
        times.push(performance.now() - start);
      }
      observer.disconnect(); times.sort((a, b) => a - b);
      return { samples: times.length, p95Ms: times[Math.floor(times.length * .95)], maxMs: times.at(-1), longTasks };
    });
    await page.evaluate(() => window.reminder.settings({ sound: false }));
    await page.evaluate(() => window.reminder.preview());
    const popup = await waitForPopup(app);
    await popup.waitForFunction(() => document.querySelector('#popup-title').textContent.length);
    const drag = await popup.evaluate(async () => {
      const slider = document.querySelector('#dismiss-slider'), frames = [];
      let previous = performance.now();
      for (let i = 0; i < 60; i++) {
        slider.value = String(i * 1.5); slider.dispatchEvent(new Event('input'));
        await new Promise(requestAnimationFrame);
        const now = performance.now(); frames.push(now - previous); previous = now;
      }
      slider.dispatchEvent(new Event('blur'));
      frames.sort((a,b) => a-b);
      return { samples: frames.length, p95FrameMs: frames[Math.floor(frames.length * .95)], maxFrameMs: frames.at(-1) };
    });
    await popup.waitForTimeout(350);
    assert.equal(await popup.locator('#dismiss-slider').inputValue(), '0');
    await dismissPopup(popup);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/index.html')).hide());
    await page.waitForTimeout(1500);
    const hidden = await app.evaluate(({ BrowserWindow }) => !BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/index.html')).isVisible());
    assert.equal(hidden, true);
    const idle = await app.evaluate(({ app }) => app.getAppMetrics().map(p => ({ type: p.type, cpuPercent: p.cpu.percentCPUUsage, workingSetMB: Math.round(p.memory.workingSetSize / 1024) })));
    const report = { checkedAt: new Date().toISOString(), packaged: Boolean(directory), gpu, tabs, drag, hiddenWindow: hidden, idle, note: 'Measured on the current Windows machine with an isolated empty profile; not a guarantee for other hardware or large datasets.' };
    fs.writeFileSync(path.join(root, 'design-previews/performance-verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
    await app.close().catch(() => {});
    const data = path.resolve(directory || root, '.test-data', profile);
    assert.ok(data.startsWith(path.resolve(directory || root, '.test-data') + path.sep));
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
