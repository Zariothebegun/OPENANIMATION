// Ponte Node → Chromium headless (SwiftShader) que renderiza placas 3D. Um browser persistente por processo.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url)); const require = createRequire(import.meta.url);
const root = path.resolve(here, '../..');
const PAGE = `<!doctype html><meta charset=utf8><script type="importmap">{"imports":{"three":"/three.module.js","three/addons/":"/addons/"}}</script><body style="margin:0"><script type="module" src="/browser.js"></script>`;
let srv, port, browser, page, W0, H0, S0, chain = Promise.resolve();
const mime = { '.js': 'text/javascript', '.html': 'text/html' };
async function start() {
  if (page) return;
  srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; let f = u === '/' ? null : u.startsWith('/addons/') ? path.join(root, 'node_modules/three/examples/jsm', u.slice(8)) : u === '/three.module.js' ? path.join(root, 'node_modules/three/build/three.module.js') : u === '/three.core.js' ? path.join(root, 'node_modules/three/build/three.core.js') : path.join(here, u); if (!f || !fs.existsSync(f)) { if (u === '/') { r.setHeader('content-type', 'text/html'); return r.end(PAGE); } r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); port = srv.address().port;
  const { chromium } = require('playwright');
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  page = await browser.newPage(); page.on('pageerror', (e) => console.error('[set3d]', e.message)); page.on('console', (m) => { if (m.type() === 'error') console.error('[set3d]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`); await page.waitForFunction('window.ready', null, { timeout: 20000 });
}
export async function stop() { try { await browser?.close(); srv?.close(); } catch {} page = null; }
const b64 = (s) => Buffer.from(s.split(',')[1], 'base64');
/** Renderiza placas: spec do cenário, cams = [{pos,look,fov}], escreve back_i.jpg / front_i.png em dir. */
export function renderPlates(spec, W, H, cams, dir, ss = 1.5) {
  const job = async () => {
    await start(); fs.mkdirSync(dir, { recursive: true });
    if (W0 !== W || H0 !== H || S0 !== ss) { await page.evaluate(([w, h, s]) => { window.S3.reset?.(); }, [W, H, ss]); }
    const info = await page.evaluate(([s, w, h, ss]) => window.S3.setScene(s, w, h, ss), [spec, W, H, ss]); W0 = W; H0 = H; S0 = ss;
    const B = 12;
    for (let i = 0; i < cams.length; i += B) {
      const out = await page.evaluate(([cs, w, h]) => cs.map((c) => window.S3.renderFrame(c, w, h)), [cams.slice(i, i + B), W, H]);
      out.forEach((o, k) => { fs.writeFileSync(path.join(dir, `b_${i + k}.jpg`), b64(o.back)); if (o.front) fs.writeFileSync(path.join(dir, `f_${i + k}.png`), b64(o.front)); });
    }
    return info;
  };
  const p = chain.then(job); chain = p.catch(() => {}); return p;
}
export const kitCams = async () => { await start(); return page.evaluate(() => window.S3.KITS); };
export async function _eval(fn, arg) { await start(); return page.evaluate(fn, arg); }
export function renderLayersTo(spec, W, H, camOv, clip, dir, ss = 1.5) {
  const job = async () => {
    await start(); fs.mkdirSync(dir, { recursive: true });
    if (S0 !== ss || W0 !== W || H0 !== H) { await page.evaluate(() => window.S3.reset()); W0 = W; H0 = H; S0 = ss; }
    const info = await page.evaluate(([s, w, h, ss]) => window.S3.setScene(s, w, h, ss), [spec, W, H, ss]);
    const cam = { ...(info.cam || { pos: [0, 1.7, 7], look: [0, 1.5, 0], fov: 38 }), ...(camOv || {}) };
    const o = await page.evaluate(([c, w, h, cl]) => window.S3.renderLayers(c, w, h, cl), [cam, W, H, clip]);
    fs.writeFileSync(path.join(dir, 'far.jpg'), b64(o.far)); fs.writeFileSync(path.join(dir, 'mid.png'), b64(o.mid)); if (o.front) fs.writeFileSync(path.join(dir, 'front.png'), b64(o.front));
    return { cam, front: !!o.front };
  };
  const p = chain.then(job); chain = p.catch(() => {}); return p;
}
