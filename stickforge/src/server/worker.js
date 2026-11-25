// Worker de render persistente (processo filho). Recebe jobs de cena; devolve mp4 (só vídeo) de cada cena.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHost, loadImage } from './host.js';
import { set3dKey } from '../engine/bg3d.js';
import { compileScene, drawFrame } from '../engine/scene.js';

const host = createHost();

function ffmpegArgs(j) {
  const vf = ['format=yuv420p'];
  if (j.outW && j.outW !== j.W) vf.unshift(`scale=${j.outW}:${j.outH}:flags=bicubic`);
  return ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${j.W}x${j.H}`, '-framerate', String(j.animFps), '-i', '-',
    '-vf', vf.join(','), '-r', String(j.fps), '-c:v', 'libx264', '-preset', j.preset || 'superfast', '-crf', String(j.crf ?? 23), '-tune', 'animation', '-g', String(j.fps * 2), '-bf', '0',
    ...(j.threads ? ['-threads', String(j.threads)] : []), '-pix_fmt', 'yuv420p', '-video_track_timescale', '30000', '-movflags', '+faststart', '-an', j.out];
}

async function renderScene(j) {
  const t0 = performance.now();
  for (const p of j.plates || []) { host.set3dSeq = host.set3dSeq || {}; if (host.set3dSeq[p.key]) continue; const imgs = [], fronts = []; for (let k = 0; k < p.n; k++) { imgs.push(await loadImage(path.join(p.dir, `b_${k}.jpg`))); if (p.front) fronts.push(await loadImage(path.join(p.dir, `f_${k}.png`))); } host.set3dSeq[p.key] = { imgs, fronts: p.front ? fronts : null, n: p.n, pfps: p.pfps }; }
  const plan = compileScene(j.scene, j.meta, j.timing); plan.seqKey = j.seqKey;
  { const ks = Object.keys(host.set3dSeq || {}); while (ks.length > 3) delete host.set3dSeq[ks.shift()]; }
  const W = j.W, H = j.H, nFrames = Math.round(plan.dur * j.animFps);
  const canvas = host.makeCanvas(W, H), ctx = canvas.getContext('2d');
  const ff = spawn('ffmpeg', ffmpegArgs(j), { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', (d) => (err += d));
  const done = new Promise((res, rej) => { ff.on('exit', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c + ': ' + err)))); ff.stdin.on('error', () => {}); });
  let drawMs = 0, readMs = 0, writeMs = 0;
  for (let i = 0; i < nFrames; i++) {
    let a = performance.now();
    drawFrame(ctx, W, H, plan, i / j.animFps, host);
    const img = ctx.getImageData(0, 0, W, H); // rasteriza + lê
    let b = performance.now(); drawMs += b - a;
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    writeMs += performance.now() - b;
  }
  ff.stdin.end();
  await done;
  return { out: j.out, frames: nFrames, dur: plan.dur, ms: performance.now() - t0, drawMs, writeMs };
}

process.on('message', async (m) => {
  if (m.type === 'ping') return process.send({ type: 'pong' });
  if (m.type === 'render') {
    try { const r = await renderScene(m.job); process.send({ type: 'done', id: m.id, result: r }); }
    catch (e) { process.send({ type: 'error', id: m.id, error: String(e.stack || e) }); }
  }
});
process.send({ type: 'ready' });
