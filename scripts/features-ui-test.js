const { _electron: electron } = require('playwright');
const { waitForMain, dismissPopup } = require('./electron-helpers.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..'), profile = `daily-ui-${Date.now()}`;
const file = path.join(root, '.test-data', profile, 'reminders.json'), shots = path.join(root, 'design-previews');
const errors = [];
const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
async function launch() {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [root, '--test-mode', `--test-profile=${profile}`], env, timeout: 30000 });
  const page = await waitForMain(app); page.on('pageerror', e => errors.push(e.message));
  await page.waitForSelector('#dashboard-progress-note');
  await page.waitForFunction(() => document.querySelector('#dashboard-progress-note').textContent.length > 0);
  return { app, page };
}
async function state(page) { return page.evaluate(() => window.reminder.getState()); }
async function create(page, title, date, priority, status = 'todo') {
  await page.click('#daily-add'); await page.fill('#daily-title', title); await page.fill('#daily-note', 'Tập trung vào từng bước nhỏ.');
  await page.fill('#daily-task-date', date.split('-').reverse().join('/')); await page.selectOption('#daily-priority', priority); await page.selectOption('#daily-task-status', status);
  await page.click('#daily-save'); await page.waitForSelector('#daily-editor', { state: 'hidden' });
}
(async () => {
  let app;
  try {
    let launched = await launch(); app = launched.app; let page = launched.page;
    assert.equal((await state(page)).dashboard.total, 0);
    await page.screenshot({ path: path.join(shots, '10-dashboard-empty.png') });
    await page.click('[data-view="daily"]');
    await create(page, 'Hoàn thiện bản thiết kế', day(), 'high', 'doing');
    await create(page, 'Đọc 20 trang sách', day(), 'normal');
    await create(page, 'Đi bộ và nghỉ ngơi', day(), 'low', 'done');
    await create(page, 'Gửi bản tổng hợp tuần', day(-1), 'high');
    await create(page, 'Chuẩn bị kế hoạch ngày mai', day(1), 'normal');
    await page.click('#daily-today'); assert.equal(await page.locator('#daily-list .daily-row').count(), 3);
    await page.click('[data-day-step="1"]'); assert.equal(await page.locator('#daily-list .daily-row').count(), 1);
    await page.click('[data-day-step="-1"]'); assert.equal(await page.locator('#daily-list .daily-row').count(), 3);
    await page.fill('#daily-date', day(1).split('-').reverse().join('/')); await page.locator('#daily-date').press('Tab');
    assert.equal(await page.locator('#daily-list .daily-row').count(), 1); await page.click('#daily-today');
    await page.fill('#daily-search', 'Đọc'); assert.equal(await page.locator('#daily-list .daily-row').count(), 1);
    await page.locator('[data-daily-check]').first().check();
    await page.waitForFunction(() => document.querySelector('#daily-list .is-done'));
    await page.locator('[data-daily-check]').first().uncheck(); await page.waitForFunction(() => !document.querySelector('#daily-list .is-done'));
    await page.locator('[data-daily-status]').first().selectOption('doing');
    await page.waitForFunction(() => state.dailyTasks.find(t => t.title === 'Đọc 20 trang sách').status === 'doing');
    await page.locator('[data-daily-edit]').first().click(); await page.fill('#daily-note', 'Ghi chú đã cập nhật và được lưu.'); await page.click('#daily-save'); await page.waitForSelector('#daily-editor', { state: 'hidden' });
    await page.fill('#daily-search', '');
    await page.click('[data-daily-filter="done"]'); assert.equal(await page.locator('#daily-list .daily-row').count(), 1);
    await page.click('[data-daily-filter="all"]');
    await page.locator('#toast').waitFor({ state: 'hidden' }); await page.screenshot({ path: path.join(shots, '11-daily-tasks.png') });
    await page.click('[data-view="dashboard"]');
    assert.equal(await page.textContent('#stat-total'), '3'); assert.equal(await page.textContent('#stat-done'), '1'); assert.equal(await page.textContent('#stat-doing'), '2'); assert.equal(await page.textContent('#stat-overdue'), '1');
    // Add real reminder schedules through the validated bridge for the dashboard preview.
    await page.evaluate(async () => {
      for (const task of [{ title: 'Nghỉ mắt, uống một cốc nước', time: '15:00', category: 'health' }, { title: 'Xem lại kế hoạch ngày mai', time: '20:30', category: 'work' }]) await window.reminder.saveTask({ ...task, repeat: 'daily', days: [], date: '', note: '' });
    });
    await page.waitForFunction(() => document.querySelectorAll('.dashboard-reminder').length === 2);
    await page.screenshot({ path: path.join(shots, '12-dashboard.png') });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('index.html')).setSize(860, 650));
    await page.screenshot({ path: path.join(shots, '13-dashboard-compact.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('index.html')).setSize(1180, 800));
    await page.click('#dashboard-overdue'); assert.equal(await page.locator('#daily-list .daily-row').count(), 1);
    await page.locator('[data-daily-move]').click(); await page.waitForFunction(() => !document.querySelector('#daily-list .daily-row'));
    await page.click('#daily-today'); assert.equal(await page.locator('#daily-list .daily-row').count(), 4);
    await page.locator('[data-daily-delete]').last().click(); await page.click('#daily-delete-cancel'); assert.equal(await page.locator('#daily-list .daily-row').count(), 4);
    await page.locator('[data-daily-delete]').last().click(); await page.click('#daily-delete-confirm'); await page.waitForFunction(() => document.querySelectorAll('#daily-list .daily-row').length === 3);
    const before = (await state(page)).dailyTasks;
    await app.close(); app = null;
    // Add a past one-time schedule to an isolated test profile to exercise the real popup.
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    saved.settings.sound = false;
    saved.tasks.push({ id: 'one-time-test', title: 'Lời nhắc một lần', note: 'Tự xóa sau khi kéo tắt', category: 'personal', repeat: 'once', date: day(-1), time: '09:00', enabled: true, nextDue: new Date(Date.now() - 60000).toISOString(), days: [] });
    fs.writeFileSync(file, JSON.stringify(saved));
    launched = await launch(); app = launched.app; page = launched.page;
    assert.deepEqual((await state(page)).dailyTasks, before);
    let popup;
    for (let i = 0; i < 50; i++) { popup = app.windows().find(w => w.url().endsWith('popup.html')); if (popup) break; await page.waitForTimeout(100); }
    assert.ok(popup); popup.on('pageerror', e => errors.push(e.message));
    await popup.waitForSelector('#dismiss-slider'); await popup.waitForTimeout(180);
    await dismissPopup(popup);
    const final = await state(page);
    assert.ok(final.history.some(item => item.taskId === 'one-time-test' && item.action === 'done'), JSON.stringify(final.history));
    assert.equal(final.tasks.length, 2);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).tasks.some(t => t.id === 'one-time-test'), false);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(shots, 'features-verification.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), runtime: 'Electron desktop', checks: ['daily CRUD', 'date navigation', 'search', 'status filters', 'complete and reopen', 'edit notes', 'overdue move', 'confirmed delete', 'dashboard counts', 'compact layout', 'restart persistence', 'real popup dismiss deletes one-time reminder and preserves history', 'recurring reminders retained'], errors }, null, 2));
    console.log('PASS: daily task management, dashboard, persistence, one-time popup deletion.');
  } finally { if (app) await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
