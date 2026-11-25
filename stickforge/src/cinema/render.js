// render.js: project -> mp4 with the 3D cinema engine (three.js scene per frame, ink + lens blur + bloom + grade).
// Uses the same voice / timing / audio / DSL as the 2D engine; only the picture comes from here.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { ROOT } from '../server/host.js';
import { FORMATS, compileScene } from '../engine/scene.js';
import { normalizeProject } from '../engine/validate.js';
import { buildScene } from './director.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(ROOT, 'cache');
const sh = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 14);
export const CINEMA_HASH = (() => { const h = crypto.createHash('sha1'); for (const d of ['web', '.']) { const dir = path.join(here, d); for (const f of fs.readdirSync(dir).sort()) if (/\.(ts|js)$/.test(f)) h.update(fs.readFileSync(path.join(dir, f))); } return h.digest('hex').slice(0, 12); })();
// quality: output size (height), 3D resolution scale for character cards, MSAA, shadow map, fps
export const CQ = {
  draft: { h: 960, res: 0.5, msaa: 0, shadow: 1024, fps: 12, crf: 28, preset: 'ultrafast', jpeg: 0.85 },
  standard: { h: 1280, res: 0.75, msaa: 2, shadow: 2048, fps: 24, crf: 22, preset: 'veryfast', jpeg: 0.92 },
  high: { h: 1920, res: 1, msaa: 4, shadow: 4096, fps: 24, crf: 18, preset: 'veryfast', jpeg: 0.95 },
};
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('exit', (c) => (c === 0 ? res() : rej(new Error(cmd + ': ' + e.slice(-400))))); });
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'];
const TRANS = { whip: 0.42, flash: 0.5, fade: 0.5, cross: 0.5, dissolve: 0.5 };

export class CinemaPage {
  constructor() { this.b = null; this.p = null; this.key = ''; }
  async open(W, H, q, gpu) {
    const key = [W, H, q.res, q.msaa, q.shadow].join('x'); if (this.p && this.key === key) return; await this.close();
    const GPU = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--disable-dev-shm-usage', ...(process.platform === 'win32' ? ['--use-gl=angle', '--use-angle=d3d11'] : process.platform === 'darwin' ? ['--use-gl=angle', '--use-angle=metal'] : ['--use-gl=angle', '--use-angle=vulkan'])];
    const requested = gpu ?? process.env.SF_GPU;
    const preferGPU = requested !== false && requested !== '0';
    const forceGPU = requested === true || requested === '1';
    const start = async (hardware) => {
      this.b = await chromium.launch(hardware ? { channel: process.env.SF_CHANNEL || 'chromium', args: GPU } : { args: ARGS });
      this.p = await this.b.newPage(); this.p.on('pageerror', (e) => console.error('[cinema page]', e.message));
      await this.p.setContent('<html><body style="margin:0;background:#000"></body></html>'); await this.p.addScriptTag({ path: path.join(here, 'dist/sf.js') });
      await this.p.evaluate(([w, h, o]) => window.SF.init(w, h, o), [W, H, { res: q.res, msaa: q.msaa, shadow: q.shadow }]);
      const renderer = await this.p.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'desconhecido'; });
      return renderer;
    };
    try {
      let renderer = await start(preferGPU);
      const software = /swiftshader|llvmpipe|software raster/i.test(renderer);
      if (preferGPU && software && !forceGPU) { await this.close(); renderer = await start(false); }
      console.error(`[cinema] WebGL renderer: ${renderer}`); this.key = key;
    } catch (e) {
      await this.close();
      if (!preferGPU || forceGPU) throw e;
      console.warn('[cinema] aceleração gráfica indisponível; a usar renderização compatível.');
      await start(false); this.key = key;
    }
  }
  setHooks(code) { return this.p.evaluate((c) => window.SF.hooks(c), code || null); }
  async frame(state, post, jq) {
    await this.p.evaluate(([s, po]) => window.SF.paint(s, po), [state, post]);
    return this.p.locator('#sf-final-frame').screenshot({ type: 'jpeg', quality: Math.max(1, Math.min(100, Math.round((jq ?? 0.92) * 100))) });
  }
  async close() { if (this.b) await this.b.close().catch(() => {}); this.b = this.p = null; this.key = ''; }
}

/** AI hooks of a scene: `hooks` = path (relative to the project file / cwd) to a plain-JS module, or `hooksCode` inline text */
export function loadHooks(sc, base = process.cwd()) {
  if (sc.hooksCode) return String(sc.hooksCode);
  if (sc.hooks) { const f = path.isAbsolute(sc.hooks) ? sc.hooks : path.resolve(base, sc.hooks); if (!fs.existsSync(f)) throw new Error('hooks não encontrado: ' + f); return fs.readFileSync(f, 'utf8'); }
  return '';
}

/** render one scene's frames -> mp4. `prev` = {state} of the previous scene's last frame (for transitions). */
export async function renderSceneFile(cp, built, { W, H, q, out, trans, prevState, prevHooks, hooks, onFrame, firstFrameOnly }) {
  const { n, fps, state, plan } = built;
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', q.preset, '-crf', String(q.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] }); let err = ''; ff.stderr.on('data', (d) => (err += d)); const done = new Promise((res, rej) => ff.on('exit', (c) => (c === 0 ? res() : rej(new Error('ffmpeg: ' + err.slice(-400))))));
  const cap = { captions: plan.captions, chunks: plan.chunks };
  const tdur = trans && TRANS[trans] ? TRANS[trans] : 0; const tn = Math.round(tdur * fps);
  try {
    if (tn && prevState) { await cp.setHooks(prevHooks); await cp.frame(prevState, { hold: true }, 0.5); } // held = outgoing scene's last frame
    await cp.setHooks(hooks);
    for (let i = 0; i < n; i++) {
      const t = i / fps, post = { cap, capT: t };
      if (tn && prevState && i < tn) post.trans = { kind: trans, k: (i + 1) / (tn + 1) };
      const ex = plan.scene.exit; const remain = (plan.dur - t) / 0.22; if (ex && remain < 1) post.exit = { kind: ex, remain: Math.max(0, remain) };
      const buf = await cp.frame(state(i), post, q.jpeg); if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (onFrame) onFrame(i, n);
    }
  } finally { ff.stdin.end(); }
  await done;
}

/** the full pipeline. `R` is a Renderer (src/server/render.js) used for voice + audio mix. */
export async function renderCinema(R, rawProject, opts = {}) {
  const T0 = performance.now(); fs.mkdirSync(path.join(CACHE, 'cinema'), { recursive: true }); fs.mkdirSync(path.join(CACHE, 'audio'), { recursive: true });
  const { project, errors } = normalizeProject(rawProject); if (errors.length) throw Object.assign(new Error('Projecto inválido:\n- ' + errors.join('\n- ')), { errors });
  const meta = project.meta, q = { ...(CQ[meta.quality] || CQ.standard), ...(opts.quality || {}) }; const [fw, fh] = FORMATS[meta.format]; const H = q.h, W = Math.round((fw * H) / fh / 2) * 2;
  const progress = opts.onProgress || (() => {}); const fps = meta.fps || q.fps;
  project.scenes.forEach((s, i, arr) => { const nx = arr[i + 1], tk = nx && (nx.transition || meta.transition); if (nx && (tk === 'whip' || tk === 'flash') && !s.exit) s.exit = tk; });
  await R.tts.start();
  // 1) voice (parallel) + plans
  const voiced = await Promise.all(project.scenes.map((s) => R.voiceScene(s, meta)));
  const plans = project.scenes.map((s, i) => compileScene(s, { ...meta, quant: 1 / fps }, { lineDurs: voiced[i].map((v) => v.dur), envs: voiced[i].map((v) => v.env) }));
  const built = plans.map((p) => buildScene(p, { fps }));
  progress({ stage: 'voice', done: plans.length, total: plans.length });
  // 2) frames per scene (cached)
  const cp = opts.page || new CinemaPage(); await cp.open(W, H, q, opts.gpu);
  const infos = []; let prevState = null, prevKey = '', prevHooks = '';
  for (let i = 0; i < built.length; i++) {
    const b = built[i], sc = project.scenes[i], hk = loadHooks(sc, opts.base), tk = i ? sc.transition || meta.transition || 'cut' : 'cut';
    const key = sh(JSON.stringify([sc, { ...meta, voice: undefined }, plans[i].lines.map((l) => [l.t0, l.t1]), W, H, q, fps, CINEMA_HASH, tk, prevKey, hk]));
    const file = path.join(CACHE, 'cinema', key + '.mp4'); const cached = fs.existsSync(file); const t0 = performance.now();
    if (!cached) { await renderSceneFile(cp, b, { W, H, q, out: file + '.tmp.mp4', trans: tk, prevState, prevHooks, hooks: hk, onFrame: (f, n) => progress({ stage: 'frames', scene: sc.id, index: i, f, n }) }); fs.renameSync(file + '.tmp.mp4', file); }
    infos.push({ id: sc.id, file, dur: plans[i].dur, plan: plans[i], voiced: voiced[i], cached, ms: Math.round(performance.now() - t0) });
    prevState = b.state(b.n - 1); prevHooks = hk; prevKey = key; progress({ stage: 'scene', id: sc.id, index: i, cached });
  }
  if (!opts.page) await cp.close();
  // 3) audio + concat + mux
  const audioKey = sh(JSON.stringify([infos.map((i) => [+i.dur.toFixed(3), i.plan.lines.map((l) => +l.t0.toFixed(3)), i.voiced.map((v) => v.file)]), opts.music || meta.music || '', meta.musicVolume ?? 0]));
  const audioFile = path.join(CACHE, 'audio', audioKey + '.m4a'); if (!fs.existsSync(audioFile)) await R.mixAudio(infos, audioFile, meta, opts);
  const list = path.join(CACHE, 'concat-c-' + audioKey + '.txt'); fs.writeFileSync(list, infos.map((i) => `file '${i.file}'`).join('\n'));
  const out = opts.out || path.join(ROOT, 'out', 'video.mp4'); fs.mkdirSync(path.dirname(out), { recursive: true });
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', audioFile, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', out]);
  const dur = infos.reduce((a, i) => a + i.dur, 0);
  return { out, duration: dur, resolution: `${W}x${H}`, fps, total_ms: Math.round(performance.now() - T0), scenes: infos.map((i) => ({ id: i.id, cached: i.cached, dur: +i.dur.toFixed(2), ms: i.ms })) };
}
