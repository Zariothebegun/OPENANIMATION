// Servidor HTTP: editor web + API para IA. Sem dependências. `node src/server/api.js [porta]`
// O projecto "vivo" fica em memória + projects/current.json; a IA aplica ops por POST e o editor actualiza sozinho (polling de versão).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './host.js';
import { Renderer } from './render.js';
import { normalizeProject } from '../engine/validate.js';
import { applyOps, OPS_HELP } from '../engine/ops.js';
import { getCatalog } from '../engine/catalog.js';
import { VOICES, defaultVoice } from './tts.js';

const PORT = +(process.argv[2] || process.env.PORT || 4173);
const STATE_FILE = path.join(ROOT, 'projects', 'current.json');
fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
const state = { project: fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/ram.json'), 'utf8')), version: 1 };
const save = () => { state.version++; fs.writeFileSync(STATE_FILE, JSON.stringify(state.project, null, 2)); };
const renderer = new Renderer(); const jobs = new Map(); let jobSeq = 0;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.gif': 'image/gif', '.wav': 'audio/wav', '.png': 'image/png', '.css': 'text/css' };
const body = (req) => new Promise((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { res(b ? JSON.parse(b) : {}); } catch { res({ __bad: true }); } }); });
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj)); };
function serve(res, file, req) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
  const st = fs.statSync(file), type = MIME[path.extname(file)] || 'application/octet-stream', range = req && req.headers.range;
  if (range) { const m = /bytes=(\d*)-(\d*)/.exec(range); const a = +m[1] || 0, b = m[2] ? +m[2] : st.size - 1; res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 }); return fs.createReadStream(file, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' }); fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname;
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); return res.end(); }
    if (p === '/') return serve(res, path.join(ROOT, 'site/index.html'));
    if (p === '/editor') return serve(res, path.join(ROOT, 'editor/index.html'));
    if (p === '/library') return serve(res, path.join(ROOT, 'site/index.html'));
    if (p.startsWith('/engine/')) return serve(res, path.join(ROOT, 'src', p));
    if (p.startsWith('/assets/')) return serve(res, path.join(ROOT, p));
    if (p.startsWith('/cache/tts/')) return serve(res, path.join(ROOT, p));
    if (p.startsWith('/out/')) return serve(res, path.join(ROOT, p), req);

    if (p === '/api/catalog') return send(res, 200, { ...getCatalog(), voices: VOICES, ops: OPS_HELP });
    if (p === '/api/project' && req.method === 'GET') return send(res, 200, { project: state.project, version: state.version });
    if (p === '/api/project' && req.method === 'PUT') { const b = await body(req); const r = normalizeProject(b.project || b); if (r.errors.length) return send(res, 400, { errors: r.errors }); state.project = r.project; save(); return send(res, 200, { version: state.version, warnings: r.warnings }); }
    if (p === '/api/validate') { const b = await body(req); const r = normalizeProject(b.project || state.project); return send(res, 200, { ok: !r.errors.length, errors: r.errors, warnings: r.warnings }); }
    // aplicar operações ao projecto vivo (é isto que a IA usa)
    if (p === '/api/ops') {
      const b = await body(req); const ops = b.ops || b; const r = applyOps(state.project, ops); if (r.errors.length) return send(res, 400, { errors: r.errors });
      const v = normalizeProject(r.project); if (v.errors.length) return send(res, 400, { errors: v.errors });
      state.project = v.project; save(); return send(res, 200, { ok: true, version: state.version, changed: r.changed, warnings: v.warnings });
    }
    // timings reais da voz (+ urls de áudio) para o preview do editor ficar sincronizado
    if (p === '/api/voice') {
      const b = await body(req); const { project, errors } = normalizeProject(b.project || state.project); if (errors.length) return send(res, 400, { errors });
      const out = {}; await Promise.all(project.scenes.map(async (s) => { const v = await renderer.voiceScene(s, project.meta); out[s.id] = v.map((x) => ({ dur: x.dur, env: Array.from(x.env), url: '/cache/tts/' + path.basename(x.file) })); }));
      return send(res, 200, out);
    }
    if (p === '/api/render' && req.method === 'POST') {
      const b = await body(req); const project = b.project || state.project; if (b.quality) (project.meta ||= {}).quality = b.quality;
      const id = 'j' + ++jobSeq, job = { id, status: 'running', t0: Date.now(), progress: {} }; jobs.set(id, job);
      renderer.render(project, { out: path.join(ROOT, 'out', id + '.mp4'), onProgress: (e) => { job.progress = e; } }).then((r) => { job.status = 'done'; job.result = r; job.url = '/out/' + id + '.mp4'; }).catch((e) => { job.status = 'error'; job.error = e.message; });
      return send(res, 200, { job: id });
    }
    if (p.startsWith('/api/job/')) { const j = jobs.get(p.split('/').pop()); return j ? send(res, 200, j) : send(res, 404, { error: 'job desconhecido' }); }
    res.writeHead(404); res.end('not found');
  } catch (e) { send(res, 500, { error: String(e.stack || e) }); }
}).listen(PORT, () => { console.log(`StickForge em http://localhost:${PORT}`); renderer.warm().then(() => console.log('workers prontos')); });
