import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright'); import fs from 'node:fs';
const [,, stateFile, outFile, W = '540', H = '960', res = '0.5'] = process.argv;
const states = JSON.parse(fs.readFileSync(stateFile)); const arr = Array.isArray(states) ? states : [states];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); p.on('console', m => console.log('c:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
await p.setContent('<html><body style="margin:0"></body></html>'); await p.addScriptTag({ path: 'out/sf.js' });
await p.evaluate(([W, H, res]) => window.SF.init(W, H, { res }), [+W, +H, +res]);
for (let i = 0; i < arr.length; i++) {
  const t0 = Date.now(); const d = await p.evaluate(([s]) => window.SF.frame(s, 0.93), [arr[i]]);
  fs.writeFileSync(outFile.replace('.jpg', arr.length > 1 ? `_${i}.jpg` : '.jpg'), Buffer.from(d.split(',')[1], 'base64')); console.log('frame', i, Date.now() - t0, 'ms');
}
await b.close();
