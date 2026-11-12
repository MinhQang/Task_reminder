const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const id = `ui-${Date.now()}`;
const dataDir = path.join(root, '.test-data', id);
const shots = path.join(root, 'design-previews');
fs.mkdirSync(shots, { recursive: true });
const errors = [];
async function launch() {
  const env = { ...process.env, REMINDER_TEST_ID: id };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [root, '--test-mode'], env, timeout: 30000 });
  const page = await app.firstWindow();
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForSelector('#dashboard-view:not([hidden])');
  await page.click('[data-view="all"]');
  await page.waitForSelector('#task-list .empty-state, #task-list .task-row');
  return { app, page };
}
(async () => {
  let app;
  try {
    let launched = await launch(); app = launched.app; let page = launched.page;
    await page.screenshot({ path: path.join(shots, '01-empty.png') });
    async function create(title, repeat, time, category, note) {
      await page.click('#add'); await page.fill('#title', title); await page.fill('#note', note); await page.check(`input[name="repeat"][value="${repeat}"]`); await page.fill('#time', time); await page.selectOption('#category', category);
      if (repeat === 'weekly') { for (const box of await page.locator('#weekday-field input').all()) await box.uncheck(); for (const d of [1, 3, 5]) await page.check(`#weekday-field input[value="${d}"]`); }
      await page.click('#save'); await page.waitForSelector('#editor', { state: 'hidden' });
    }
    await create('Đứng dậy, uống một cốc nước', 'daily', '10:00', 'health', 'Vươn vai và nghỉ mắt một chút nhé.');
    await create('Lên kế hoạch cho ngày mới', 'daily', '08:30', 'work', 'Chọn ba việc quan trọng nhất hôm nay.');
    await create('Đọc vài trang sách', 'weekly', '21:00', 'personal', 'Một khoảng thời gian dành riêng cho mình.');
    assert.equal(await page.locator('.task-row').count(), 3);
    await page.screenshot({ path: path.join(shots, '02-reminders.png') });
    await page.locator('[data-edit]').first().click(); await page.fill('#note', 'Ghi chú đã chỉnh sửa.'); await page.waitForTimeout(220); await page.screenshot({ path: path.join(shots, '03-editor.png') }); await page.click('#save'); await page.waitForSelector('#editor', { state: 'hidden' });
    const toggleId = await page.locator('[data-toggle]').first().getAttribute('data-toggle'); await page.locator(`[data-toggle="${toggleId}"]`).uncheck(); await page.waitForSelector('.task-row.paused');
    await page.click('[data-filter="paused"]'); assert.equal(await page.locator('.task-row').count(), 1);
    await page.click('[data-filter="all"]'); await page.fill('#search', 'Đọc vài'); assert.equal(await page.locator('.task-row').count(), 1); await page.fill('#search', '');
    await page.click('[data-view="settings"]'); await page.uncheck('#sound'); await page.screenshot({ path: path.join(shots, '04-settings.png') });
    await page.click('[data-view="all"]');
    const popupPromise = app.waitForEvent('window'); await page.click('#preview'); const popup = await popupPromise; await popup.waitForSelector('#popup-title'); await popup.waitForTimeout(180); await popup.screenshot({ path: path.join(shots, '05-popup.png') }); await popup.locator('#dismiss-slider').focus(); await popup.keyboard.press('End');
    await page.locator('[data-delete]').first().click(); await page.click('#delete-confirm'); await page.waitForFunction(() => document.querySelectorAll('.task-row').length === 2);
    await app.close(); app = null;
    // Simulate a powered-off machine by placing a scheduled occurrence in the past on disk.
    const file = path.join(dataDir, 'reminders.json'); const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.tasks[0].enabled = true; data.tasks[0].nextDue = new Date(Date.now() - 86400000 * 3).toISOString(); fs.writeFileSync(file, JSON.stringify(data));
    launched = await launch(); app = launched.app; page = launched.page;
    let reminderPopup; for (let i = 0; i < 30; i++) { reminderPopup = app.windows().find(w => w.url().endsWith('popup.html')); if (reminderPopup) break; await page.waitForTimeout(100); }
    assert.ok(reminderPopup, 'missed reminder opens after restart');
    await reminderPopup.waitForSelector('#missed-note:not([hidden])'); await reminderPopup.screenshot({ path: path.join(shots, '06-missed-reminder.png') });
    await page.evaluate(async () => { const state = await window.reminder.getState(); await window.reminder.resolve(state.pending[0].id, 'snooze'); }); await page.waitForTimeout(250);
    let saved = JSON.parse(fs.readFileSync(file, 'utf8')); assert.equal(saved.pending.length, 0); assert.equal(saved.history[0].action, 'snooze'); assert.ok(new Date(saved.tasks[0].nextDue) > new Date());
    await app.close(); app = null;
    saved.tasks[0].nextDue = new Date(Date.now() - 5000).toISOString(); fs.writeFileSync(file, JSON.stringify(saved));
    launched = await launch(); app = launched.app; page = launched.page;
    for (let i = 0; i < 30; i++) { reminderPopup = app.windows().find(w => w.url().endsWith('popup.html')); if (reminderPopup) break; await page.waitForTimeout(100); }
    await reminderPopup.waitForSelector('#dismiss-slider'); await reminderPopup.locator('#dismiss-slider').focus(); await reminderPopup.keyboard.press('End'); await page.waitForTimeout(200);
    await page.click('[data-view="history"]'); await page.waitForSelector('.history-row'); await page.screenshot({ path: path.join(shots, '07-history.png') });
    saved = JSON.parse(fs.readFileSync(file, 'utf8')); assert.equal(saved.history[0].action, 'done'); assert.equal(saved.pending.length, 0); assert.equal(saved.tasks.length, 2);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(shots, 'desktop-verification.json'), JSON.stringify({ checkedAt: new Date().toISOString(), passed: true, runtime: 'Electron desktop', checks: ['create', 'edit', 'pause', 'filter', 'search', 'settings', 'popup', 'delete', 'persistence', 'missed reminders', 'snooze', 'complete', 'history'], errors }, null, 2));
    console.log('PASS: create, edit, pause, filters, search, settings, popup, delete, persistence, missed reminders, snooze, complete, history. Screenshots: design-previews/');
  } finally { if (app) await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
