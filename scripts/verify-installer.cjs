// Validate the shipped payload without changing this user's real installation or registry.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const asar = require('@electron/asar');
const root = path.resolve(__dirname, '..'), pkg = require('../package.json');
const installer = path.join(root, 'dist', `Task-Reminder-Setup-${pkg.version}.exe`);
const temporary = path.join(root, '.test-data', `installer-payload-${Date.now()}`);
const payload = path.join(temporary, 'Máy thử sạch', 'Task Reminder');
function find7zip(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === '7za.exe') return full;
    if (entry.isDirectory()) { const found = find7zip(full); if (found) return found; }
  }
}
const cache = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache');
const tools = fs.readdirSync(cache).filter(name => name.startsWith('7zip@'));
const seven = tools.map(name => find7zip(path.join(cache, name))).find(Boolean);
assert.ok(seven, 'Build the app first to obtain the cached archive verifier.');
function archive(args) {
  const output = execFileSync(seven, args, { encoding: 'utf8', windowsHide: true });
  assert.match(output, /Everything is Ok/);
}
try {
  archive(['t', installer]);
  archive(['x', installer, `-o${payload}`, '-y']);
  const bundle = path.join(payload, 'resources', 'app.asar');
  const entries = asar.listPackage(bundle).map(name => name.replaceAll('\\', '/'));
  assert.ok(entries.every(name => name === '/package.json' || name === '/src' || name.startsWith('/src/')));
  assert.ok(!entries.some(name => /test-data|node_modules|design-references|cyber-frame/.test(name)));
  const metadata = JSON.parse(asar.extractFile(bundle, 'package.json'));
  assert.equal(metadata.version, pkg.version); assert.equal(metadata.main, pkg.main);
  assert.ok(!metadata.devDependencies && !metadata.build);
  for (const entry of entries) {
    if (entry === '/package.json') continue; // electron-builder removes development metadata.
    const source = path.join(root, entry.slice(1));
    if (fs.statSync(source).isFile()) assert.ok(asar.extractFile(bundle, path.normalize(entry.slice(1))).equals(fs.readFileSync(source)), `Stale packaged file: ${entry}`);
  }
  execFileSync(process.execPath, [path.join(__dirname, 'packaged-smoke.js'), payload], { stdio: 'inherit' });
  const hash = createHash('sha256').update(fs.readFileSync(installer)).digest('hex');
  fs.writeFileSync(path.join(root, 'dist', 'SHA256SUMS.txt'), `${hash}  ${path.basename(installer)}\n`);
  fs.writeFileSync(path.join(root, 'design-previews', 'installer-verification.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), version: pkg.version, installer: path.basename(installer), bytes: fs.statSync(installer).size, sha256: hash, checks: ['installer archive integrity', 'only production files shipped', 'all packaged source files match current source', 'runtime extracted from installer to new Unicode path', 'packaged smoke test with Windows-only PATH'], limitation: 'Payload tested on this Windows machine, not a second physical machine or an actual install/uninstall cycle.' }, null, 2));
  console.log('PASS: installer payload integrity, clean content, independent runtime and source parity.');
} finally {
  const safeRoot = path.resolve(root, '.test-data') + path.sep;
  assert.ok(path.resolve(temporary).startsWith(safeRoot));
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
