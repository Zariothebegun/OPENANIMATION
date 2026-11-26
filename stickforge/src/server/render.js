// Orquestrador: projecto -> mp4.   TTS (worker persistente) ∥ render de cenas (pool) ∥ cache por cena.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ROOT } from './host.js';
import { TTS, defaultVoice } from './tts.js';
import { RenderPool } from './pool.js';
import { normalizeProject } from '../engine/validate.js';
import { FORMATS, compileScene } from '../engine/scene.js';
import { ensureSeq, isSet3d, SET3D_HASH } from '../set3d/prepare.js';
import { camAt } from '../engine/cam3.js';
import { set3dKey } from '../engine/bg3d.js';
import { styleOf, styleName, styleBackground } from '../engine/style.js';

const CACHE = path.join(ROOT, 'cache');
// hash do código do motor: qualquer alteração ao motor invalida a cache de cenas (evita servir vídeo antigo)
const ENGINE_HASH = (() => { const d = path.join(ROOT, 'src/engine'); const h = crypto.createHash('sha1'); for (const f of fs.readdirSync(d).sort()) h.update(fs.readFileSync(path.join(d, f))); return h.digest('hex').slice(0, 10); })();
const sh = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 14);
const QUALITY = { draft: { scale: 0.5, preset: 'ultrafast', crf: 28 }, standard: { scale: 1, preset: 'superfast', crf: 23 }, high: { scale: 1, preset: 'veryfast', crf: 20 } };
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('exit', (c) => (c === 0 ? res() : rej(new Error(cmd + ' ' + c + ': ' + e.slice(-600))))); });

export class Renderer {
  constructor({ workers, ttsWorkers } = {}) { this.tts = new TTS({ workers: ttsWorkers }); this.pool = new RenderPool(workers); fs.mkdirSync(path.join(CACHE, 'scenes'), { recursive: true }); fs.mkdirSync(path.join(CACHE, 'audio'), { recursive: true }); }
  async warm() { await Promise.all([this.tts.start(), this.pool.start()]); }
  stop() { this.tts.stop(); this.pool.stop(); import('../set3d/index.js').then((m) => m.stop()).catch(() => {}); }

  /** Sintetiza as linhas de uma cena (em série dentro da cena; cenas em paralelo no worker TTS) */
  async voiceScene(scene, meta) {
    const lines = (scene.lines || (scene.narration ? [{ text: scene.narration }] : [])).map((l) => (typeof l === 'string' ? { text: l } : l));
    return Promise.all(lines.map((l) => this.tts.speak(l.text, { voice: l.voice || scene.voice || meta.voice || defaultVoice(meta.lang), lang: meta.lang, speed: l.speed || scene.speed || meta.speed || 1 })));
  }

  /**
   * opts: { out, onProgress, only: [sceneIds] }
   * devolve { out, timings, scenes:[{id,cached,...}] }
   */
  async render(rawProject, opts = {}) {
    if (rawProject.meta?.engine === 'cinema' && !styleOf(rawProject.meta).codeOnly) return (await import('../cinema/render.js')).renderCinema(this, rawProject, opts);
    if (styleOf(rawProject.meta).codeOnly) {
      // Isolate code-only style adaptation to a render copy. The project saved in
      // the editor keeps its engine and original scene backgrounds unchanged.
      const sid = styleName(rawProject.meta);
      rawProject = { ...rawProject, meta: { ...rawProject.meta, engine: '2d' }, scenes: (rawProject.scenes || []).map((s) => ({ ...s, bg: styleBackground(s.bg, sid) })) };
    }
    fs.mkdirSync(path.join(CACHE, 'scenes'), { recursive: true }); fs.mkdirSync(path.join(CACHE, 'audio'), { recursive: true });
    const T0 = performance.now(); const timings = {}; const mark = (k, t) => (timings[k] = Math.round(performance.now() - t));
    const { project, errors } = normalizeProject(rawProject);
    if (errors.length) throw Object.assign(new Error('Projecto inválido:\n- ' + errors.join('\n- ')), { errors });
    const meta = project.meta, [W, H] = FORMATS[meta.format], q = QUALITY[meta.quality] || QUALITY.standard;
    const outW = Math.round((W * q.scale) / 2) * 2, outH = Math.round((H * q.scale) / 2) * 2;
    // render a resolução de saída directamente quando draft (poupa raster)
    const rW = q.scale < 1 ? outW : W, rH = q.scale < 1 ? outH : H;
    const has3d = project.scenes.some((s) => isSet3d(s.bg)); const animFps = meta.animFps || (has3d ? 24 : 15), fps = meta.fps || (has3d ? 24 : 30);
    project.scenes.forEach((s, i, arr) => { const nx = arr[i + 1], tk = nx && (nx.transition || meta.transition); if (nx && (tk === 'whip' || tk === 'flash') && !s.exit) s.exit = tk; });
    const t = performance.now(); await this.warm(); mark('warm', t);
    const progress = opts.onProgress || (() => {});
    const quant = 1 / animFps;

    // 1) por cena: voz -> (hash) -> render
    const tTTS = performance.now(); let ttsDone = 0;
    const jobs = project.scenes.map(async (scene, idx) => {
      const tv = performance.now();
      const voiced = await this.voiceScene(scene, meta);
      const lineDurs = voiced.map((v) => v.dur), envs = voiced.map((v) => v.env);
      const voiceMs = performance.now() - tv; ttsDone++; progress({ stage: 'voice', done: ttsDone, total: project.scenes.length });
      const sceneMeta = { ...meta, quant };
      const key = sh(JSON.stringify([scene, { ...meta, voice: meta.voice }, lineDurs, rW, rH, animFps, fps, q, ENGINE_HASH, isSet3d(scene.bg) ? SET3D_HASH : 0]));
      const file = path.join(CACHE, 'scenes', key + '.mp4');
      const plan = compileScene(scene, sceneMeta, { lineDurs, envs });
      const info = { id: scene.id, key, file, dur: plan.dur, voiced, voiceMs, cached: fs.existsSync(file), plan };
      if (!info.cached) {
        const tr = performance.now();
        let plates, seqKey; if (isSet3d(scene.bg)) { const pf = q.pfps || meta.platefps || 12, n = Math.ceil(plan.dur * pf) + 2, cams = Array.from({ length: n }, (_, i) => camAt(plan, Math.min(plan.dur, i / pf))); const pr = await ensureSeq(scene.bg, cams, pf, rW, rH, { pw: q.pw }); seqKey = key; plates = [{ key, dir: pr.dir, n: pr.n, pfps: pf, front: pr.front }]; }
        const r = await this.pool.run({ plates, seqKey, scene, meta: sceneMeta, timing: { lineDurs, envs }, W: rW, H: rH, outW: q.scale < 1 ? rW : undefined, outH: q.scale < 1 ? rH : undefined, animFps, fps, preset: q.preset, crf: q.crf, threads: opts.ffThreads, out: file + '.tmp.mp4' });
        fs.renameSync(file + '.tmp.mp4', file); info.render = r; info.renderMs = performance.now() - tr;
      }
      progress({ stage: 'scene', id: scene.id, index: idx, cached: info.cached });
      return info;
    });
    const infos = await Promise.all(jobs); mark('voice+render (pipelined)', tTTS);

    // 2) áudio: concatena as linhas de todas as cenas, com silêncios, e alinha ao início de cada cena
    const tA = performance.now();
    // o áudio só depende de: ficheiros de voz, onde cada fala começa e duração de cada cena (+música) — NÃO de props/poses/cenários
    const audioKey = sh(JSON.stringify([infos.map((i) => [+i.dur.toFixed(3), i.plan.lines.map((l) => +l.t0.toFixed(3)), i.voiced.map((v) => v.file)]), opts.music || meta.music || '', meta.musicVolume ?? 0]));
    const audioFile = path.join(CACHE, 'audio', audioKey + '.m4a');
    if (!fs.existsSync(audioFile)) await this.mixAudio(infos, audioFile, meta, opts);
    mark('audio', tA);

    // 3) concat de vídeo (stream copy) + mux áudio
    const tC = performance.now();
    const listFile = path.join(CACHE, 'concat-' + audioKey + '.txt');
    fs.writeFileSync(listFile, infos.map((i) => `file '${i.file}'`).join('\n'));
    const out = opts.out || path.join(ROOT, 'out', 'video.mp4');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-i', audioFile, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', out]);
    mark('concat+mux', tC);
    timings.total = Math.round(performance.now() - T0);
    const dur = infos.reduce((a, i) => a + i.dur, 0);
    return { out, duration: dur, resolution: `${rW}x${rH}`, timings, scenes: infos.map((i) => ({ id: i.id, cached: i.cached, dur: +i.dur.toFixed(2), voiceMs: Math.round(i.voiceMs), renderMs: Math.round(i.renderMs || 0), drawMs: Math.round(i.render?.drawMs || 0), writeMs: Math.round(i.render?.writeMs || 0), frames: i.render?.frames })) };
  }

  async mixAudio(infos, outFile, meta, opts) {
    // Constrói uma timeline: para cada cena, as linhas começam em plan.lines[k].t0 (+ offset da cena).
    const inputs = [], filters = []; let off = 0, n = 0;
    for (const info of infos) {
      info.plan.lines.forEach((l, k) => { const v = info.voiced[k]; if (!v) return; inputs.push('-i', v.file); const ms = Math.round((off + l.t0) * 1000); filters.push(`[${n}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono,adelay=${ms}:all=1[a${n}]`); n++; });
      off += info.dur;
    }
    const total = off;
    if (!n) { await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', String(total), '-c:a', 'aac', outFile]); return; }
    const music = opts.music || meta.music;
    const mixIn = Array.from({ length: n }, (_, i) => `[a${i}]`).join('');
    let fc = filters.join(';') + `;${mixIn}amix=inputs=${n}:normalize=0:dropout_transition=0,apad=whole_dur=${total.toFixed(3)},atrim=0:${total.toFixed(3)}[v]`;
    let map = '[v]';
    if (music && fs.existsSync(music)) { inputs.push('-stream_loop', '-1', '-i', music); fc += `;[${n}:a]aresample=44100,aformat=channel_layouts=mono,volume=${meta.musicVolume ?? 0.12},atrim=0:${total.toFixed(3)}[m];[v][m]amix=inputs=2:normalize=0[mix]`; map = '[mix]'; }
    fc += `;${map}loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '128k', outFile]);
  }
}
