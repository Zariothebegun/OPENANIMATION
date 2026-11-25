// Pool de workers persistentes (child_process.fork). Fila simples; cada worker processa 1 cena de cada vez.
import { fork } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { ROOT } from './host.js';

export class RenderPool {
  constructor(n = Math.max(1, os.cpus().length)) { this.n = n; this.workers = []; this.queue = []; this.jobs = new Map(); this.seq = 0; this.ready = null; }
  start() {
    if (this.ready) return this.ready;
    this.ready = Promise.all(Array.from({ length: this.n }, () => new Promise((res) => {
      const p = fork(path.join(ROOT, 'src/server/worker.js'), [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      const w = { p, busy: false };
      p.on('message', (m) => {
        if (m.type === 'ready') { this.workers.push(w); return res(); }
        const j = this.jobs.get(m.id); if (!j) return; this.jobs.delete(m.id); w.busy = false;
        m.type === 'done' ? j.res(m.result) : j.rej(new Error(m.error)); this._pump();
      });
    })));
    return this.ready;
  }
  run(job) { return new Promise((res, rej) => { const id = ++this.seq; this.queue.push({ id, job, res, rej }); this._pump(); }); }
  _pump() {
    for (const w of this.workers) {
      if (w.busy || !this.queue.length) continue;
      const q = this.queue.shift(); w.busy = true; this.jobs.set(q.id, q); w.p.send({ type: 'render', id: q.id, job: q.job });
    }
  }
  stop() { for (const w of this.workers) w.p.kill(); this.workers = []; this.ready = null; }
}
