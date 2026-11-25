#!/usr/bin/env node
// Uso: node src/cli.js render projecto.json [-o out.mp4] [--quality draft|standard|high] [--workers N] [--frame sceneId@t -o f.png]
//      node src/cli.js validate projecto.json | catalog | apply projecto.json ops.json [-o novo.json]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './server/host.js';
import { Renderer } from './server/render.js';
import { normalizeProject } from './engine/validate.js';
import { getCatalog } from './engine/catalog.js';
import { applyOps } from './engine/ops.js';
import { createHost, loadImage } from './server/host.js';
import { ensureSeq, isSet3d } from './set3d/prepare.js';
import { camAt } from './engine/cam3.js';
import { set3dKey } from './engine/bg3d.js';
import { compileScene, drawFrame, FORMATS } from './engine/scene.js';

const [cmd, file, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

if (cmd === 'catalog') { console.log(JSON.stringify(getCatalog(), null, 1)); process.exit(0); }
if (cmd === 'validate') { const r = normalizeProject(load(file)); console.log(JSON.stringify({ ok: !r.errors.length, errors: r.errors, warnings: r.warnings }, null, 1)); process.exit(r.errors.length ? 1 : 0); }
if (cmd === 'apply') { const r = applyOps(load(file), load(rest[0])); fs.writeFileSync(flag('-o', file), JSON.stringify(r.project, null, 2)); console.log(JSON.stringify({ changed: r.changed, errors: r.errors })); process.exit(r.errors.length ? 1 : 0); }
if (cmd === 'frame') { // frame projecto.json sceneId t -o out.png   (sem TTS: tempos estimados)
  const { project } = normalizeProject(load(file)); const sid = rest[0], t = parseFloat(rest[1] || '1'); const sc = project.scenes.find((s) => s.id === sid) || project.scenes[0];
  const [W, H] = FORMATS[project.meta.format]; const host = createHost(); const plan0 = compileScene(sc, project.meta, {}); let seqK; if (isSet3d(sc.bg)) { const pf = 12, n = Math.ceil(plan0.dur * pf) + 2, cams = Array.from({ length: n }, (_, i) => camAt(plan0, Math.min(plan0.dur, i / pf))); const pr = await ensureSeq(sc.bg, cams, pf, W, H, {}); const imgs = [], fronts = []; for (let k = 0; k < pr.n; k++) { imgs.push(await loadImage(pr.dir + `/b_${k}.jpg`)); if (pr.front) fronts.push(await loadImage(pr.dir + `/f_${k}.png`)); } seqK = 'cli'; host.set3dSeq = { cli: { imgs, fronts: pr.front ? fronts : null, n: pr.n, pfps: pf } }; } const plan = compileScene(sc, project.meta, {}); plan.seqKey = seqK; const c = host.makeCanvas(W, H); drawFrame(c.getContext('2d'), W, H, plan, t, host); await c.toFile(flag('-o', 'frame.png')); console.log('ok'); process.exit(0);
}
if (cmd === 'cframe') { // cframe projecto.json sceneId t -o out.jpg [--quality draft|standard|high]  (motor cinema, sem voz: tempos estimados)
  const { buildScene } = await import('./cinema/director.js'); const { CinemaPage, CQ } = await import('./cinema/render.js');
  const { project } = normalizeProject(load(file)); const sid = rest[0], t = parseFloat(rest[1] || '1'); const sc = project.scenes.find((s) => s.id === sid) || project.scenes[0];
  const q = CQ[flag('--quality', project.meta.quality || 'draft')] || CQ.draft; const [fw, fh] = FORMATS[project.meta.format]; const H = q.h, W = Math.round((fw * H) / fh / 2) * 2;
  const plan = compileScene(sc, { ...project.meta, quant: 1 / q.fps }, {}); const b = buildScene(plan, { fps: q.fps }); const cp = new CinemaPage(); await cp.open(W, H, q); const { loadHooks } = await import('./cinema/render.js'); await cp.setHooks(loadHooks(sc, path.dirname(path.resolve(file))));
  const i = Math.min(b.n - 1, Math.round(t * q.fps)); const t0 = Date.now(); const d = await cp.frame(b.state(i), { cap: { captions: plan.captions, chunks: plan.chunks }, capT: t }, 0.95);
  fs.writeFileSync(flag('-o', 'out/cframe.jpg'), Buffer.from(d.split(',')[1], 'base64')); console.log(`cframe ${W}x${H} t=${t} (${Date.now() - t0} ms)`); await cp.close(); process.exit(0);
}
if (cmd === 'review') { // review projecto.json [--dir out/review] [--quality draft] [--n 5] [--refs 'ref/*.png']: frames-chave de cada cena (+ métricas vs referências)
  const { buildScene } = await import('./cinema/director.js'); const { CinemaPage, CQ, loadHooks } = await import('./cinema/render.js'); const { execFileSync } = await import('node:child_process');
  const { project } = normalizeProject(load(file)); const dir = flag('--dir', 'out/review'); fs.mkdirSync(dir, { recursive: true });
  const q = CQ[flag('--quality', 'draft')] || CQ.draft; const [fw, fh] = FORMATS[project.meta.format]; const H = q.h, W = Math.round((fw * H) / fh / 2) * 2; const N = +flag('--n', '5'); const refs = flag('--refs', '');
  const cp = new CinemaPage(); await cp.open(W, H, q); const out = [];
  for (const sc of project.scenes) {
    const plan = compileScene(sc, { ...project.meta, quant: 1 / q.fps }, {}); const b = buildScene(plan, { fps: q.fps }); await cp.setHooks(loadHooks(sc, path.dirname(path.resolve(file))));
    for (let k = 0; k < N; k++) { const i = Math.min(b.n - 1, Math.round(((k + 0.5) / N) * (b.n - 1))); const d = await cp.frame(b.state(i), { cap: { captions: plan.captions, chunks: plan.chunks }, capT: i / q.fps }, 0.92);
      const f = path.join(dir, `${sc.id}_${String(k).padStart(2, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); const r = { scene: sc.id, t: +(i / q.fps).toFixed(2), file: f };
      if (refs) { try { r.metrics = execFileSync('python3', [path.join(ROOT, 'tools/measure.py'), 'cmp', f, refs], { encoding: 'utf8' }).trim(); } catch (e) { r.metrics = 'measure falhou'; } } out.push(r); }
  }
  await cp.close(); console.log(JSON.stringify(out, null, 1)); process.exit(0);
}
if (cmd === 'render') {
  const p = load(file); if (flag('--quality')) (p.meta ||= {}).quality = flag('--quality');
  const r = new Renderer({ workers: flag('--workers') ? +flag('--workers') : undefined });
  try {
    const res = await r.render(p, { out: flag('-o', 'out/video.mp4'), onProgress: (e) => e.stage === 'scene' && process.stderr.write(`  cena ${e.id}${e.cached ? ' (cache)' : ''}\n`) });
    console.log(JSON.stringify(res, null, 1));
  } catch (e) { console.error(e.message); process.exitCode = 1; } finally { r.stop(); }
  process.exit(process.exitCode || 0);
}
console.error('comandos: render | validate | catalog | apply | frame');
