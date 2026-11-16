// Generate all Windows icon sizes from one editable vector source.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const assets = path.resolve(__dirname, '../src/assets');
  const svg = fs.readFileSync(path.join(assets, 'icon.svg'), 'utf8');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const sizes = [16, 20, 24, 32, 48, 64, 128, 256], images = [];
    const page = await browser.newPage();
    for (const size of sizes) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:100vw;height:100vh;display:block}</style>${svg}`);
      images.push(await page.screenshot({ omitBackground: true }));
    }
    const header = Buffer.alloc(6 + sizes.length * 16);
    header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, i) => {
      const entry = 6 + i * 16;
      header[entry] = header[entry + 1] = size === 256 ? 0 : size;
      header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(images[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
      offset += images[i].length;
    });
    fs.writeFileSync(path.join(assets, 'icon.ico'), Buffer.concat([header, ...images]));
    fs.writeFileSync(path.join(assets, 'icon.png'), images.at(-1));
    fs.writeFileSync(path.join(assets, 'tray.png'), images[sizes.indexOf(32)]);
    console.log('Created icon.ico (8 sizes), icon.png and tray.png.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
