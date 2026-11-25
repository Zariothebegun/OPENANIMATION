import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright'); import fs from 'node:fs';
const W=+process.argv[2]||540,H=+process.argv[3]||960;
const F=JSON.parse(process.argv[4]||'{}');
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage(); p.on('console',m=>console.log('c:',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
await p.setContent('<html><body style="margin:0"></body></html>'); await p.addScriptTag({path:'out/entry.js'});
const r=await p.evaluate(([W,H,F])=>window.T(W,H,F),[W,H,F]); console.log(W,H,r.times);
fs.writeFileSync('out/t.jpg',Buffer.from(r.png.split(',')[1],'base64')); await b.close();
