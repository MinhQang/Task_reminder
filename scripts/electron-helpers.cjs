async function waitForPage(app, filename) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const popup = app.windows().find(page => page.url().endsWith('/' + filename));
    if (popup) return popup;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw Error(filename + ' did not open');
}
async function dismissPopup(popup) {
  const closed = popup.waitForEvent('close');
  await popup.locator('#dismiss-slider').focus();
  try { await popup.keyboard.press('End'); } catch (error) { if (!popup.isClosed()) throw error; }
  await closed;
}
module.exports = { waitForPopup: app => waitForPage(app, 'popup.html'), waitForMain: app => waitForPage(app, 'index.html'), dismissPopup };
