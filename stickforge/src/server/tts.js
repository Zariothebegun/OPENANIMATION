// Pool de workers de TTS persistentes (Kokoro ONNX, 1 thread cada) + cache em disco (texto+voz+velocidade => wav+envelope).
// Paralelismo por LINHA: cada linha vai para o worker menos ocupado. Em máquinas com mais núcleos, aumenta `n`.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { ROOT } from './host.js';

const CACHE = path.join(ROOT, 'cache', 'tts');

export const VOICES = {
  'pt-br': [{ id: 'pf_dora', desc: 'feminina, natural' }, { id: 'pm_alex', desc: 'masculina' }, { id: 'pm_santa', desc: 'masculina grave' }],
  'en-us': [{ id: 'af_heart', desc: 'female, warm (best quality)' }, { id: 'af_bella', desc: 'female, bright' }, { id: 'am_adam', desc: 'male' }, { id: 'am_michael', desc: 'male, clear' }, { id: 'af_nicole', desc: 'female, soft' }],
  'en-gb': [{ id: 'bf_emma', desc: 'female UK' }, { id: 'bm_george', desc: 'male UK' }],
  es: [{ id: 'ef_dora', desc: 'femenina' }, { id: 'em_alex', desc: 'masculina' }],
  'fr-fr': [{ id: 'ff_siwis', desc: 'féminine' }],
  it: [{ id: 'if_sara', desc: 'femminile' }, { id: 'im_nicola', desc: 'maschile' }],
};
export const defaultVoice = (lang) => (VOICES[lang] || VOICES['en-us'])[0].id;

export class TTS {
  constructor({ workers = Math.max(1, os.cpus().length), threads = 1 } = {}) { this.n = workers; this.threads = threads; this.ws = []; this.ready = null; this.inflight = new Map(); this.stats = { calls: 0, hits: 0, ms: 0 }; fs.mkdirSync(CACHE, { recursive: true }); }
  start() {
    if (this.ready) return this.ready;
    this.ready = Promise.all(Array.from({ length: this.n }, () => new Promise((res, rej) => {
      const proc = spawn('python3', ['-u', path.join(ROOT, 'src/server/tts.py')], { stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, SF_MODELS: path.join(ROOT, 'models'), SF_TTS_THREADS: String(this.threads) } });
      const w = { proc, pending: new Map(), load: 0 }; const rl = readline.createInterface({ input: proc.stdout });
      rl.on('line', (l) => { let m; try { m = JSON.parse(l); } catch { return; } if (m.ready) { this.ws.push(w); return res(m); } const p = w.pending.get(m.id); if (!p) return; w.pending.delete(m.id); w.load--; m.error ? p.rej(new Error(m.error)) : p.res(m); });
      proc.on('exit', (c) => { rej(new Error('tts exit ' + c)); for (const p of w.pending.values()) p.rej(new Error('tts exited')); });
    })));
    return this.ready;
  }
  stop() { for (const w of this.ws) w.proc.kill(); this.ws = []; this.ready = null; }
  key(text, voice, lang, speed) { return crypto.createHash('sha1').update([text, voice, lang, speed].join('|')).digest('hex').slice(0, 16); }

  /** devolve { file, dur, env(Float32Array), cached } */
  async speak(text, { voice, lang = 'en-us', speed = 1 } = {}) {
    voice = voice || defaultVoice(lang);
    const k = this.key(text, voice, lang, speed), wav = path.join(CACHE, k + '.wav'), meta = path.join(CACHE, k + '.json');
    this.stats.calls++;
    if (fs.existsSync(wav) && fs.existsSync(meta)) { const m = JSON.parse(fs.readFileSync(meta, 'utf8')); this.stats.hits++; return { file: wav, dur: m.dur, env: Float32Array.from(m.env), cached: true }; }
    if (this.inflight.has(k)) return this.inflight.get(k); // pedidos idênticos em simultâneo partilham o resultado
    const job = (async () => {
      fs.mkdirSync(CACHE, { recursive: true });
      await this.start();
      const w = this.ws.reduce((a, b) => (b.load < a.load ? b : a)); w.load++;
      const id = k + ':' + Math.random().toString(36).slice(2, 7), t0 = performance.now();
      const r = await new Promise((res, rej) => { w.pending.set(id, { res, rej }); w.proc.stdin.write(JSON.stringify({ id, text, voice, lang, speed, out: wav }) + '\n'); });
      this.stats.ms += performance.now() - t0;
      fs.writeFileSync(meta, JSON.stringify({ dur: r.dur, env: r.env }));
      return { file: wav, dur: r.dur, env: Float32Array.from(r.env), cached: false };
    })();
    this.inflight.set(k, job); try { return await job; } finally { this.inflight.delete(k); }
  }
}
