const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { createHash } = require('node:crypto');
const root = path.join(__dirname, '..'), output = path.join(root, 'src/ui/vendor');
fs.mkdirSync(output, { recursive: true });
buildSync({ entryPoints: [path.join(root, 'src/ui/liquid-glass.entry.js')], outfile: path.join(output, 'liquid-glass.js'), bundle: true, format: 'iife', platform: 'browser', minify: true, legalComments: 'eof', define: { 'process.env.NODE_ENV': '"production"' } });
fs.copyFileSync(path.join(root, 'node_modules/@tomagranate/liquid-glass/dist/index.css'), path.join(output, 'liquid-glass.css'));
fs.copyFileSync(path.join(root, 'node_modules/@tomagranate/liquid-glass/LICENSE'), path.join(output, 'LIQUID-GLASS-LICENSE.txt'));
const source = path.join(root, 'src');
const files = fs.readdirSync(source, { recursive: true }).filter(name => name !== 'build-info.json' && fs.statSync(path.join(source, name)).isFile()).sort();
const hash = createHash('sha256');
for (const name of files) { hash.update(name.replaceAll('\\', '/')); hash.update(fs.readFileSync(path.join(source, name))); }
fs.writeFileSync(path.join(source, 'build-info.json'), JSON.stringify({ version: require('../package.json').version, sourceHash: hash.digest('hex'), builtAt: new Date().toISOString(), theme: 'liquid-glass' }, null, 2));
console.log('Bundled Liquid Glass locally (offline, pinned version).');
