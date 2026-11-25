// Prepara as placas 3D de um fundo {kind:'set3d'}: far (céu+tudo), mid (chão e objectos até ao clip, alpha), front (objectos à frente, alpha).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { renderPlates } from './index.js';
const here = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(here, '../..');
export const SET3D_HASH = (() => { const h = crypto.createHash('sha1'); for (const f of ['browser.js', 'kits.js']) h.update(fs.readFileSync(path.join(here, f))); return h.digest('hex').slice(0, 10); })();
const CDIR = path.join(ROOT, 'cache', 'set3d');
export const isSet3d = (bg) => bg && typeof bg === 'object' && bg.kind === 'set3d';
/** projecção pinhole: devolve {x,y} em fracção do ecrã (0..1) e profundidade */
export function project(cam, W, H, p) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const f = norm(sub(cam.look, cam.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f), v = sub(p, cam.pos), z = dot(v, f), t = Math.tan((cam.fov * Math.PI) / 360);
  return { x: 0.5 + (dot(v, r) / (z * t * (W / H))) / 2, y: 0.5 - dot(v, u) / (z * t) / 2, z };
}
export async function ensurePlates(bg, W, H, opts = {}) {
  const spec = { kit: bg.kit, params: bg.params, seed: bg.seed, over: bg.over, objects: bg.objects };
  const key = crypto.createHash('sha1').update(JSON.stringify([spec, bg.cam, bg.clip, W, H, SET3D_HASH])).digest('hex').slice(0, 16);
  const dir = path.join(CDIR, key), mf = path.join(dir, 'meta.json');
  if (fs.existsSync(mf)) return { dir, meta: JSON.parse(fs.readFileSync(mf, 'utf8')), cached: true };
  const tmp = dir + '.tmp' + process.pid; fs.rmSync(tmp, { recursive: true, force: true });
  // 1.º render para descobrir a câmara por omissão do kit
  const { renderLayersTo } = await import('./index.js');
  const PW = Math.min(W, 720), PH = Math.round(PW * H / W); // placas a resolução moderada (fundo estilizado; mais rápido)
  const r = await renderLayersTo(spec, PW, PH, bg.cam, bg.clip ?? 24, tmp, opts.ss ?? 1.25);
  const cam = r.cam; const g = project(cam, W, H, [0, 0, 0]), g1 = project(cam, W, H, [0, 1, 0]);
  const meta = { cam, ground: g.y, pxPerM: (g.y - g1.y) * H, front: r.front, kit: bg.kit };
  fs.writeFileSync(path.join(tmp, 'meta.json'), JSON.stringify(meta)); fs.mkdirSync(CDIR, { recursive: true }); fs.rmSync(dir, { recursive: true, force: true }); fs.renameSync(tmp, dir);
  return { dir, meta, cached: false };
}

/** Sequência de placas para câmara 3D animada. cams: [{pos,look,fov}] a pfps. Devolve {dir,n,pfps,front,cached}. */
export async function ensureSeq(bg, cams, pfps, W, H, opts = {}) {
  const spec = { kit: bg.kit, params: bg.params, seed: bg.seed, over: bg.over, objects: bg.objects };
  const PW = Math.min(W, opts.pw ?? 360), PH = Math.round(PW * H / W);
  const key = crypto.createHash('sha1').update(JSON.stringify([spec, cams.map((c) => [c.pos, c.look, c.fov].flat().map((v) => +v.toFixed(3))), pfps, PW, PH, SET3D_HASH])).digest('hex').slice(0, 16);
  const dir = path.join(CDIR, 'seq_' + key), mf = path.join(dir, 'meta.json');
  if (fs.existsSync(mf)) return { dir, ...JSON.parse(fs.readFileSync(mf, 'utf8')), cached: true };
  const tmp = dir + '.tmp' + process.pid; fs.rmSync(tmp, { recursive: true, force: true });
  const { renderPlates } = await import('./index.js');
  const info = await renderPlates(spec, PW, PH, cams, tmp, opts.ss ?? 1);
  const meta = { n: cams.length, pfps, front: !!info.front, PW, PH };
  fs.writeFileSync(path.join(tmp, 'meta.json'), JSON.stringify(meta)); fs.mkdirSync(CDIR, { recursive: true }); fs.rmSync(dir, { recursive: true, force: true }); fs.renameSync(tmp, dir);
  return { dir, ...meta, cached: false };
}
