// Benchmark real: node bench.mjs examples/ram60.json   (mede, não estima; escreve out/benchmark.json)
import fs from 'node:fs'; import os from 'node:os'; import { execSync } from 'node:child_process';
import { Renderer } from './src/server/render.js';
const file = process.argv[2] || 'examples/ram60.json';
const base = JSON.parse(fs.readFileSync(file, 'utf8'));
const wipe = (...d) => d.forEach((x) => fs.rmSync('cache/' + x, { recursive: true, force: true })); 
const probe = (f) => JSON.parse(execSync(`ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of json ${f}`)).streams.map((s) => `${s.codec_name} ${s.width ? s.width + 'x' + s.height + ' ' + s.r_frame_rate : ''} ${(+s.duration).toFixed(1)}s`).join(' | ');
const results = {}; const clone = () => JSON.parse(JSON.stringify(base));
const r = new Renderer();
let t = performance.now(); await r.warm(); results.worker_startup_ms = Math.round(performance.now() - t);
async function run(name, proj, out) { const a = performance.now(); const x = await r.render(proj, { out }); results[name] = { wall_ms: Math.round(performance.now() - a), video_s: +x.duration.toFixed(1), res: x.resolution, phases_ms: x.timings, file: probe(out), scenes: x.scenes.map(({ id, cached, dur, voiceMs, renderMs, drawMs, writeMs, frames }) => ({ id, cached, dur, voiceMs, renderMs, drawMs, writeMs, frames })) }; console.error(name, results[name].wall_ms, 'ms'); }
wipe('tts', 'scenes', 'audio');  await run('A_cold_content_std_1080p', clone(), 'out/bench_A.mp4');           // sem cache nenhum (voz + render), workers já a correr
wipe('scenes', 'audio');         await run('B_voice_cached_std_1080p', clone(), 'out/bench_B.mp4');           // só render+mux (voz em cache)
const edit = clone(); edit.scenes[2].props.push({ id: 'zz', kind: 'star', x: 0.5, y: 0.3, at: 1, fx: 'pop' });
await run('C_edit_one_scene', edit, 'out/bench_C.mp4');                                                        // editar 1 cena => re-render só dessa
const dr = clone(); dr.meta.quality = 'draft'; wipe('scenes', 'audio'); await run('D_draft_540x960_voice_cached', dr, 'out/bench_D.mp4');
const cpu = os.cpus(); results.machine = { cores: cpu.length, model: cpu[0].model, ram_gb: +(os.totalmem() / 2 ** 30).toFixed(1), tts_model: fs.existsSync('models/kokoro-v1.0.onnx') ? 'kokoro fp32' : 'kokoro int8', tts_workers: r.tts.n, render_workers: r.pool.n };
fs.writeFileSync('out/benchmark.json', JSON.stringify(results, null, 2)); r.stop();
console.log(JSON.stringify(results, null, 1));
