// Renderer verification using the installed Chrome when desktop execution is restricted.
// The bridge below is test-only; production always uses Electron IPC and disk persistence.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const shots = path.join(root, 'design-previews');
fs.mkdirSync(shots, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1180, height: 800 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    await context.addInitScript(() => {
      let state = JSON.parse(localStorage.getItem('test-state') || 'null') || { version: 1, tasks: [], history: [], pending: [], settings: { autoStart: true, sound: false, reducedMotion: false }, packaged: false, dataPath: 'Dữ liệu giả lập để kiểm tra giao diện' };
      let callbacks = [];
      function save() { localStorage.setItem('test-state', JSON.stringify(state)); callbacks.forEach(f => f()); }
      window.reminder = {
        getState: async () => ({ ...state, preview: location.pathname.endsWith('popup.html') }),
        saveTask: async input => { if (input.repeat === 'weekly' && !input.days.length) throw Error('Chọn ít nhất một ngày trong tuần.'); const task = { ...input, id: input.id || crypto.randomUUID(), enabled: true, nextDue: new Date(Date.now() + 3600000).toISOString() }; const index = state.tasks.findIndex(t => t.id === input.id); if (index >= 0) state.tasks[index] = task; else state.tasks.push(task); save(); },
        toggleTask: async id => { const task = state.tasks.find(t => t.id === id); task.enabled = !task.enabled; save(); },
        deleteTask: async id => { state.tasks = state.tasks.filter(t => t.id !== id); save(); },
        settings: async data => { Object.assign(state.settings, data); save(); },
        preview: async () => {}, close: () => {}, minimize: () => {}, manage: () => {}, resolve: async (id, action) => { window.lastResolution = { id, action }; }, onChange: fn => { callbacks.push(fn); return () => {}; }
      };
    });
    const page = await context.newPage(); page.setDefaultTimeout(10000); const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error('Renderer:', e.message); });
    await page.goto('file:///' + path.join(root, 'src/ui/index.html').replaceAll('\\', '/'));
    await page.click('[data-view="all"]');
    await page.waitForSelector('#task-list .empty-state'); await page.screenshot({ path: path.join(shots, '01-empty.png') });
    await page.click('#add');
    await page.fill('#time', '23:59'); await page.locator('#time').evaluate(el => { el.focus(); el.setSelectionRange(3, 5); });
    await page.click('[data-step="time"][data-direction="1"]'); assert.equal(await page.inputValue('#time'), '00:00');
    await page.fill('#date', '31/01/2028'); await page.locator('#date').evaluate(el => { el.focus(); el.setSelectionRange(3, 5); });
    await page.click('[data-step="date"][data-direction="1"]'); assert.equal(await page.inputValue('#date'), '29/02/2028');
    await page.locator('#date').evaluate(el => el.setSelectionRange(6, 10)); await page.keyboard.press('ArrowUp'); assert.equal(await page.inputValue('#date'), '28/02/2029');
    await page.fill('#date', '31/12/2026'); await page.locator('#date').evaluate(el => { el.focus(); el.setSelectionRange(0, 2); }); await page.keyboard.press('ArrowUp'); assert.equal(await page.inputValue('#date'), '01/01/2027');
    await page.click('#cancel');
    for (const item of [
      { title: 'Đứng dậy, uống một cốc nước', repeat: 'daily', time: '10:00', category: 'health', note: 'Vươn vai và nghỉ mắt một chút nhé.' },
      { title: 'Lên kế hoạch cho ngày mới', repeat: 'daily', time: '08:30', category: 'work', note: 'Chọn ba việc quan trọng nhất hôm nay.' },
      { title: 'Đọc vài trang sách', repeat: 'weekly', time: '21:00', category: 'personal', note: 'Một khoảng thời gian dành riêng cho mình.' }
    ]) {
      await page.click('#add'); await page.fill('#title', item.title); await page.fill('#note', item.note); await page.check(`input[name="repeat"][value="${item.repeat}"]`); await page.fill('#time', item.time); await page.selectOption('#category', item.category);
      if (item.repeat === 'weekly') for (const day of [1, 3, 5]) await page.check(`#weekday-field input[value="${day}"]`);
      await page.click('#save'); await page.waitForSelector('#editor', { state: 'hidden' });
    }
    assert.equal(await page.locator('.task-row').count(), 3);
    await page.screenshot({ path: path.join(shots, '02-reminders.png') });
    await page.locator('[data-edit]').first().click(); await page.fill('#note', 'Dành hai phút để chăm sóc bản thân.'); await page.screenshot({ path: path.join(shots, '03-editor.png') }); await page.click('#save'); await page.waitForSelector('#editor', { state: 'hidden' });
    const toggleId = await page.locator('[data-toggle]').first().getAttribute('data-toggle'); await page.locator(`[data-toggle="${toggleId}"]`).uncheck(); await page.waitForSelector('.task-row.paused'); await page.click('[data-filter="paused"]'); await page.waitForFunction(() => document.querySelectorAll('.task-row').length === 1); assert.equal(await page.locator('.task-row').count(), 1); await page.click('[data-filter="all"]');
    await page.fill('#search', 'Đọc vài'); assert.equal(await page.locator('.task-row').count(), 1); await page.fill('#search', '');
    await page.locator('[data-delete]').last().click(); await page.click('#delete-cancel'); assert.equal(await page.locator('.task-row').count(), 3);
    await page.click('[data-view="settings"]'); await page.check('#reducedMotion'); assert.equal(await page.locator('body.reduce-motion').count(), 1); await page.screenshot({ path: path.join(shots, '04-settings.png') });
    await page.click('[data-view="all"]');
    await page.setViewportSize({ width: 860, height: 650 }); await page.screenshot({ path: path.join(shots, '08-compact.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow at minimum desktop size');
    await page.click('#add'); assert.equal(await page.locator('#title').evaluate(el => el === document.activeElement), true); await page.keyboard.press('Escape'); await page.waitForSelector('#editor', { state: 'hidden' });
    await page.click('[data-view="settings"]'); await page.uncheck('#reducedMotion');
    const popup = await context.newPage(); popup.on('pageerror', e => errors.push(e.message)); await popup.setViewportSize({ width: 1366, height: 768 }); await popup.goto('file:///' + path.join(root, 'src/ui/popup.html').replaceAll('\\', '/')); await popup.waitForTimeout(180); await popup.screenshot({ path: path.join(shots, '05-popup.png'), omitBackground: true });
    assert.equal(await popup.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await popup.locator('button').count(), 0);
    const slider = popup.locator('#dismiss-slider');
    const bounds = await slider.boundingBox();
    const y = bounds.y + bounds.height / 2;
    await popup.mouse.move(bounds.x + 13, y); await popup.mouse.down(); await popup.mouse.move(bounds.x + bounds.width / 2, y, { steps: 8 });
    const duringDrag = await popup.locator('.reminder-visual').evaluate(el => ({ opacity: +getComputedStyle(el).opacity, transform: getComputedStyle(el).transform, clip: getComputedStyle(el).clipPath }));
    assert.equal(duringDrag.opacity, 1, 'erosion keeps remaining pixels solid instead of fading');
    assert.ok(duringDrag.clip.startsWith('inset(') && duringDrag.clip.includes('50'), 'half drag smoothly reveals the left half');
    const railCenter = await popup.locator('.dismiss-rail').evaluate(el => el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2);
    const panelCenter = await popup.locator('.popup-main').evaluate(el => el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2);
    assert.ok(Math.abs(railCenter - panelCenter) < 1, 'slider is centered under popup');
    assert.ok(await popup.locator('.screen-dimmer').evaluate(el => +getComputedStyle(el).opacity < 0.7), 'desktop brightens during drag');
    assert.notEqual(duringDrag.transform, 'matrix(1, 0, 0, 1, 0, 0)', 'reminder follows the drag direction');
    await popup.screenshot({ path: path.join(shots, '09-popup-drag.png'), omitBackground: true });
    await popup.mouse.up(); await popup.waitForTimeout(350);
    assert.equal(await popup.evaluate(() => window.lastResolution), undefined, 'partial drag does not dismiss');
    assert.equal(await slider.inputValue(), '0', 'partial drag returns to start');
    assert.equal(await popup.locator('.reminder-visual').evaluate(el => getComputedStyle(el).opacity), '1', 'cancelling restores the reminder');
    assert.equal(await popup.locator('.reminder-visual').evaluate(el => getComputedStyle(el).clipPath), 'none', 'cancelling removes the erosion mask');
    assert.equal(await popup.locator('.screen-dimmer').evaluate(el => getComputedStyle(el).opacity), '1', 'cancelling restores the dimmer');
    await popup.keyboard.press('Escape'); assert.equal(await popup.evaluate(() => window.lastResolution), undefined, 'Escape cannot acknowledge the reminder');
    // Reaching the end while held does not acknowledge if the user pulls back before release.
    await popup.mouse.move(bounds.x + 13, y); await popup.mouse.down(); await popup.mouse.move(bounds.x + bounds.width - 12, y, { steps: 8 });
    assert.equal(await popup.locator('.reminder-visual').evaluate(el => getComputedStyle(el).clipPath), 'inset(0px 0px 0px 100%)', 'full drag consumes the whole popup');
    assert.equal(await popup.evaluate(() => window.lastResolution), undefined);
    await popup.mouse.move(bounds.x + bounds.width / 2, y, { steps: 8 }); await popup.mouse.up(); await popup.waitForTimeout(350);
    assert.equal(await popup.evaluate(() => window.lastResolution), undefined);
    await popup.mouse.move(bounds.x + 13, y); await popup.mouse.down(); await popup.mouse.move(bounds.x + bounds.width - 12, y, { steps: 12 }); await popup.mouse.up();
    await popup.waitForFunction(() => window.lastResolution?.action === 'done');
    assert.deepEqual(await popup.evaluate(() => window.lastResolution), { id: 'preview', action: 'done' });
    await popup.waitForTimeout(350);
    await popup.evaluate(() => window.lastResolution = null); await slider.focus(); await popup.keyboard.press('End'); await popup.waitForFunction(() => window.lastResolution?.action === 'done');
    await popup.locator('#popup-title').evaluate(el => el.textContent = 'Một công việc có tên rất dài cần được hiển thị đầy đủ, ngay cả khi lời nhắc có nhiều dòng và nhiều chi tiết hơn bình thường.');
    assert.ok(await slider.isVisible());
    await popup.emulateMedia({ reducedMotion: 'reduce' });
    await popup.waitForTimeout(350);
    await slider.focus(); await popup.keyboard.press('ArrowRight');
    assert.equal(await popup.locator('.reminder-visual').evaluate(el => getComputedStyle(el).transform), 'matrix(1, 0, 0, 1, 0, 0)', 'reduced motion removes horizontal movement');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(shots, 'verification.json'), JSON.stringify({ renderer: 'Chrome headless with test IPC bridge', desktop: 'Not covered by this renderer test; see desktop-verification.json', testedAt: new Date().toISOString(), checks: ['create', 'edit', 'toggle', 'filter', 'search', 'delete cancellation', 'settings', 'reduced motion', 'minimum window', 'modal focus', 'Escape', 'popup render', 'date/time typing and stepping'], errors }, null, 2));
    console.log('PASS: Chrome renderer checks, date/time typing and stepping.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
