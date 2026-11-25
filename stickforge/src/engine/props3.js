// Corpo humano: órgãos animados (coração bate, pulmões respiram, intestino faz peristaltismo...), esqueleto, neurónio,
// glóbulo vermelho e `body_outline` (silhueta com órgãos no sítio certo + destaque). Tudo vector, sem assets de terceiros.
import { PROPS } from './props.js';
import { INK, shade, roundRect, clamp, ease } from './util.js';
import { FONT_UI } from './props.js';

const def = (k, desc, size, draw) => { PROPS[k] = { desc, size, draw }; };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const beat = (lt, bpm = 72) => { const p = (lt * bpm / 60) % 1; return Math.exp(-Math.pow((p - 0.08) * 13, 2)) + 0.55 * Math.exp(-Math.pow((p - 0.3) * 13, 2)); };
const ink = (ctx, s, k = 0.03) => { ctx.lineWidth = Math.max(2.5, s * k); ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
const rg = (ctx, x, y, r0, r1, c0, c1) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
const gloss = (ctx, x, y, rx, ry, rot = -0.5, a = 0.45) => { ctx.save(); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fill(); ctx.restore(); };
const halo = (ctx, s, col, k) => { if (!k) return; const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.75); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore(); };
const eyes = (ctx, s, p, x = 0, y = 0, k = 1) => { if (!p.face) return; ctx.save(); ctx.fillStyle = '#fff'; ink(ctx, s, 0.012); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * s * 0.07 * k, y, s * 0.045 * k, s * 0.055 * k, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + sx * s * 0.07 * k + s * 0.01, y + s * 0.005, s * 0.02 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; } ctx.beginPath(); ctx.arc(x, y + s * 0.09 * k, s * 0.04 * k, 0.15, Math.PI - 0.15); ctx.stroke(); ctx.restore(); };

function heartPath(ctx) { ctx.beginPath(); ctx.moveTo(0, 0.4); ctx.bezierCurveTo(-0.58, 0.06, -0.46, -0.44, -0.1, -0.3); ctx.bezierCurveTo(-0.03, -0.27, 0, -0.2, 0, -0.16); ctx.bezierCurveTo(0.06, -0.38, 0.52, -0.42, 0.44, 0); ctx.bezierCurveTo(0.34, 0.22, 0.1, 0.32, 0, 0.4); ctx.closePath(); }
def('heart', 'coração a bater (lub-dub). params: bpm, glow, face', 0.3, (ctx, s, p, lt) => {
  const b = beat(lt, p.bpm || 72), k = 1 + 0.075 * b; ctx.save(); ctx.scale(k, k); halo(ctx, s, 'rgba(255,70,90,.55)', p.glow ?? 0.5 + 0.4 * b);
  ink(ctx, s, 0.035); ctx.save(); ctx.scale(s, s);
  ctx.lineWidth = 0.035; for (const [x1, y1, x2, y2, c] of [[-0.12, -0.28, -0.2, -0.5, '#4a7ad8'], [0.05, -0.25, 0.08, -0.52, '#d8384a'], [0.18, -0.3, 0.3, -0.48, '#4a7ad8']]) { ctx.strokeStyle = INK; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 0.065; ctx.stroke(); }
  heartPath(ctx); ctx.fillStyle = rg(ctx, -0.1, -0.12, 0.02, 0.6, '#ff6a78', '#a0182f'); ctx.fill(); ctx.lineWidth = 0.035; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(80,0,20,.45)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0, -0.16); ctx.quadraticCurveTo(0.04, 0.1, -0.02, 0.36); ctx.stroke();
  ctx.restore(); gloss(ctx, -s * 0.2, -s * 0.18, s * 0.09, s * 0.05, -0.7, 0.5); eyes(ctx, s, p, s * 0.02, s * 0.0); ctx.restore();
});

def('lungs', 'pulmões que respiram (traqueia + brônquios). params: rate (resp/min), glow, face', 0.34, (ctx, s, p, lt) => {
  const br = Math.sin(lt * Math.PI * 2 * (p.rate || 15) / 60 * (p.fast || 1)), k = 1 + 0.06 * br; ctx.save(); ctx.scale(k, 1 + 0.04 * br); halo(ctx, s, 'rgba(255,150,170,.4)', p.glow ?? 0.3);
  ctx.save(); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 0.07, -0.22); ctx.bezierCurveTo(sg * 0.3, -0.42, sg * 0.56, -0.12, sg * 0.5, 0.26); ctx.bezierCurveTo(sg * 0.46, 0.44, sg * 0.14, 0.44, sg * 0.09, 0.2); ctx.bezierCurveTo(sg * 0.05, 0.05, sg * 0.05, -0.1, sg * 0.07, -0.22); ctx.closePath(); ctx.fillStyle = rg(ctx, sg * 0.28, -0.05, 0.02, 0.5, '#ffb0be', '#e0607e'); ctx.fill(); ctx.lineWidth = 0.035; ctx.strokeStyle = INK; ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 0.075; ctx.beginPath(); ctx.moveTo(0, -0.52); ctx.lineTo(0, -0.12); for (const sg of [-1, 1]) { ctx.moveTo(0, -0.12); ctx.quadraticCurveTo(sg * 0.1, -0.08, sg * 0.2, 0.05); ctx.moveTo(sg * 0.1, -0.09); ctx.lineTo(sg * 0.26, -0.12); ctx.moveTo(sg * 0.17, 0.02); ctx.lineTo(sg * 0.3, 0.18); } ctx.stroke(); ctx.strokeStyle = '#f2d6c8'; ctx.lineWidth = 0.045; ctx.stroke();
  ctx.restore(); for (const sg of [-1, 1]) gloss(ctx, sg * s * 0.3, -s * 0.18, s * 0.07, s * 0.04, sg * 0.8, 0.4); eyes(ctx, s, p, 0, s * 0.08); ctx.restore();
});

def('brain', 'cérebro com dobras e faíscas de neurónios. params: glow, sparks, face', 0.34, (ctx, s, p, lt) => {
  ctx.save(); halo(ctx, s, 'rgba(140,200,255,.55)', p.glow ?? 0.5 + 0.2 * Math.sin(lt * 3));
  ctx.save(); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const n = 16; ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI * 2, bump = 1 + (i % 2 ? 0.1 : -0.02), x = Math.cos(a) * 0.46 * bump, y = Math.sin(a) * (0.32 + (Math.sin(a) > 0 ? 0.04 : 0)) * bump; if (i === 0) ctx.moveTo(x, y); else { const am = Math.PI + (i - 0.5) / n * Math.PI * 2, cx = Math.cos(am) * 0.53, cy = Math.sin(am) * 0.4; ctx.quadraticCurveTo(cx, cy, x, y); } } ctx.closePath();
  ctx.fillStyle = rg(ctx, -0.12, -0.12, 0.02, 0.6, '#ffc0d8', '#d070a0'); ctx.fill(); ctx.lineWidth = 0.035; ctx.strokeStyle = INK; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(120,30,80,.55)'; ctx.lineWidth = 0.018; const folds = [[-0.35, -0.05, -0.2, -0.22, -0.05, -0.08], [-0.05, -0.08, 0.1, -0.24, 0.28, -0.1], [0.28, -0.1, 0.38, 0.0, 0.25, 0.08], [-0.3, 0.1, -0.1, 0.0, 0.05, 0.12], [0.05, 0.12, 0.2, 0.2, 0.34, 0.14], [-0.18, -0.3, -0.05, -0.2, 0.08, -0.3], [-0.38, 0.12, -0.28, 0.24, -0.12, 0.2]]; for (const f of folds) { ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.bezierCurveTo(f[2], f[3], f[2] + 0.06, f[3] + 0.1, f[4], f[5]); ctx.stroke(); } ctx.restore();
  ctx.beginPath(); ctx.ellipse(0.3, 0.33, 0.17, 0.1, 0.1, 0, 7); ctx.fillStyle = '#c0608a'; ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0.1, 0.3); ctx.lineTo(0.08, 0.5); ctx.lineWidth = 0.08; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 0.05; ctx.strokeStyle = '#e8b0c8'; ctx.stroke();
  ctx.restore(); if (p.sparks !== false) for (let i = 0; i < 7; i++) { const ph = (lt * 1.5 + hash(i)) % 1, a = hash(i + 4) * 6.28, r = 0.25 + 0.15 * hash(i + 9); ctx.save(); ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.fillStyle = '#9fe8ff'; ctx.shadowColor = '#5ad0ff'; ctx.shadowBlur = s * 0.04; ctx.beginPath(); ctx.arc(Math.cos(a) * r * s * 1.3, Math.sin(a) * r * s * 0.8, s * 0.018, 0, 7); ctx.fill(); ctx.restore(); }
  gloss(ctx, -s * 0.2, -s * 0.2, s * 0.1, s * 0.04, -0.4, 0.45); eyes(ctx, s, p, 0, s * 0.02); ctx.restore();
});

def('stomach', 'estômago (bolsa em J com movimentos de mistura). params: glow, face', 0.3, (ctx, s, p, lt) => {
  const sq = 1 + 0.04 * Math.sin(lt * 3); ctx.save(); ctx.scale(sq, 1 / sq); halo(ctx, s, 'rgba(255,170,90,.4)', p.glow ?? 0.3); ctx.save(); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(-0.14, -0.5); ctx.quadraticCurveTo(-0.12, -0.3, -0.05, -0.22); ctx.stroke(); ctx.strokeStyle = '#f0a090'; ctx.lineWidth = 0.065; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.08, -0.26); ctx.bezierCurveTo(0.22, -0.34, 0.5, -0.1, 0.38, 0.2); ctx.bezierCurveTo(0.3, 0.42, -0.1, 0.44, -0.3, 0.26); ctx.bezierCurveTo(-0.42, 0.14, -0.34, -0.1, -0.2, -0.2); ctx.closePath(); ctx.fillStyle = rg(ctx, 0.05, 0, 0.02, 0.5, '#ffc09a', '#e0825a'); ctx.fill(); ctx.lineWidth = 0.035; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(150,60,30,.35)'; ctx.lineWidth = 0.02; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-0.2 + i * 0.12, 0.3 - i * 0.04); ctx.quadraticCurveTo(-0.1 + i * 0.13, 0.12 + Math.sin(lt * 3 + i) * 0.03, 0.05 + i * 0.12, 0.2 - i * 0.04); ctx.stroke(); }
  ctx.restore(); gloss(ctx, -s * 0.05, -s * 0.12, s * 0.08, s * 0.04, -0.5, 0.45); eyes(ctx, s, p, s * 0.04, s * 0.12); ctx.restore();
});

def('intestine', 'intestino delgado em serpentina com ondas de peristaltismo. params: rows, glow, face', 0.34, (ctx, s, p, lt) => {
  ctx.save(); halo(ctx, s, 'rgba(255,150,120,.3)', p.glow ?? 0.25); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const rows = p.rows || 5; const path = () => { ctx.beginPath(); for (let r = 0; r < rows; r++) { const y = -0.4 + r * (0.8 / (rows - 1)), dir = r % 2 ? -1 : 1, x0 = -0.36 * dir, x1 = 0.36 * dir; if (r === 0) ctx.moveTo(x0, y); else ctx.lineTo(x0, y); ctx.lineTo(x1, y); if (r < rows - 1) ctx.quadraticCurveTo(x1 + 0.12 * dir, y + 0.1, x1, y + 0.2); } };
  path(); ctx.strokeStyle = INK; ctx.lineWidth = 0.15; ctx.stroke(); path(); ctx.strokeStyle = '#f09a90'; ctx.lineWidth = 0.1; ctx.stroke();
  path(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.035; ctx.setLineDash([0.05, 0.16]); ctx.lineDashOffset = -lt * 0.5; ctx.stroke(); ctx.setLineDash([]);
  path(); ctx.strokeStyle = 'rgba(160,50,50,.35)'; ctx.lineWidth = 0.012; ctx.translate(0, 0.03); ctx.stroke(); ctx.restore(); eyes(ctx, s, p, 0, 0);
});

def('kidneys', 'rins (par) com ureteres. params: glow, face', 0.28, (ctx, s, p, lt) => {
  ctx.save(); halo(ctx, s, 'rgba(220,90,80,.35)', p.glow ?? 0.25); ctx.save(); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) { ctx.strokeStyle = INK; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(sg * 0.12, 0.05); ctx.quadraticCurveTo(sg * 0.05, 0.3, 0, 0.5); ctx.stroke(); ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 0.032; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sg * 0.1, -0.34); ctx.bezierCurveTo(sg * 0.42, -0.4, sg * 0.5, 0.02, sg * 0.28, 0.2); ctx.bezierCurveTo(sg * 0.2, 0.24, sg * 0.15, 0.12, sg * 0.15, 0.04); ctx.bezierCurveTo(sg * 0.1, -0.02, sg * 0.04, -0.2, sg * 0.1, -0.34); ctx.closePath(); ctx.fillStyle = rg(ctx, sg * 0.3, -0.1, 0.02, 0.4, '#e86a5e', '#8e2430'); ctx.fill(); ctx.lineWidth = 0.035; ctx.strokeStyle = INK; ctx.stroke(); }
  ctx.restore(); for (const sg of [-1, 1]) gloss(ctx, sg * s * 0.3, -s * 0.2, s * 0.05, s * 0.03, sg * 0.9, 0.4); eyes(ctx, s, p, 0, -s * 0.05, 0.8); ctx.restore();
});

def('liver', 'fígado (cunha castanha). params: glow, face', 0.3, (ctx, s, p, lt) => {
  ctx.save(); halo(ctx, s, 'rgba(190,100,60,.35)', p.glow ?? 0.25); ctx.save(); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-0.5, -0.05); ctx.bezierCurveTo(-0.45, -0.32, 0.1, -0.4, 0.46, -0.18); ctx.bezierCurveTo(0.5, -0.05, 0.3, 0.2, -0.1, 0.3); ctx.bezierCurveTo(-0.4, 0.3, -0.52, 0.15, -0.5, -0.05); ctx.closePath(); ctx.fillStyle = rg(ctx, -0.1, -0.1, 0.02, 0.6, '#c8704a', '#7a3020'); ctx.fill(); ctx.lineWidth = 0.035; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(60,15,10,.4)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0.1, -0.35); ctx.quadraticCurveTo(0.05, -0.1, 0.12, 0.1); ctx.stroke(); ctx.restore(); gloss(ctx, -s * 0.18, -s * 0.15, s * 0.1, s * 0.04, -0.3, 0.35); eyes(ctx, s, p, -s * 0.12, -s * 0.02); ctx.restore();
});

const bone = (ctx, x1, y1, x2, y2, w, s) => { ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = w + s * 0.012; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#f4ead4'; ctx.lineWidth = w; ctx.stroke(); for (const [x, y] of [[x1, y1], [x2, y2]]) { ctx.beginPath(); ctx.arc(x, y, w * 0.75, 0, 7); ctx.fillStyle = '#f4ead4'; ctx.fill(); ctx.lineWidth = s * 0.012; ctx.strokeStyle = INK; ctx.stroke(); } };
def('skeleton', 'esqueleto completo (206 ossos no adulto). params: glow, pose', 0.9, (ctx, s, p, lt) => {
  ctx.save(); halo(ctx, s, 'rgba(200,230,255,.3)', p.glow ?? 0.3); const sw = Math.sin(lt * 2) * 0.01 * s;
  ctx.beginPath(); ctx.ellipse(0, -s * 0.42, s * 0.085, s * 0.095, 0, 0, 7); ctx.fillStyle = '#f4ead4'; ctx.fill(); ink(ctx, s, 0.012); ctx.stroke(); roundRect(ctx, -s * 0.05, -s * 0.36, s * 0.1, s * 0.04, s * 0.015); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-s * 0.035, -s * 0.43, s * 0.018, s * 0.024, 0, 0, 7); ctx.ellipse(s * 0.035, -s * 0.43, s * 0.018, s * 0.024, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(-s * 0.01, -s * 0.38); ctx.lineTo(s * 0.01, -s * 0.38); ctx.fill();
  for (let i = 0; i < 9; i++) bone(ctx, 0, -s * 0.33 + i * s * 0.037, 0, -s * 0.33 + i * s * 0.037 + 0.1, s * 0.03, s);
  for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) { ctx.strokeStyle = INK; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(0, -s * 0.28 + i * s * 0.04); ctx.quadraticCurveTo(sg * s * 0.13, -s * 0.28 + i * s * 0.035, sg * s * 0.1, -s * 0.2 + i * s * 0.042); ctx.stroke(); ctx.strokeStyle = '#f4ead4'; ctx.lineWidth = s * 0.018; ctx.stroke(); }
  bone(ctx, -s * 0.12, -s * 0.31, s * 0.12, -s * 0.31, s * 0.022, s);
  for (const sg of [-1, 1]) { bone(ctx, sg * s * 0.12, -s * 0.31, sg * s * 0.19, -s * 0.12 + sw * sg, s * 0.026, s); bone(ctx, sg * s * 0.19, -s * 0.12 + sw * sg, sg * s * 0.17, s * 0.06, s * 0.022, s); bone(ctx, sg * s * 0.04, s * 0.04, sg * s * 0.06, s * 0.25, s * 0.034, s); bone(ctx, sg * s * 0.06, s * 0.25, sg * s * 0.06, s * 0.45, s * 0.026, s); bone(ctx, sg * s * 0.06, s * 0.46, sg * s * 0.11, s * 0.47, s * 0.02, s); }
  ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.0); ctx.quadraticCurveTo(-s * 0.15, s * 0.06, -s * 0.04, s * 0.09); ctx.lineTo(s * 0.04, s * 0.09); ctx.quadraticCurveTo(s * 0.15, s * 0.06, s * 0.12, -s * 0.0); ctx.closePath(); ctx.fillStyle = '#f4ead4'; ctx.fill(); ink(ctx, s, 0.012); ctx.stroke(); ctx.restore();
});

def('neuron', 'neurónio com impulso eléctrico a viajar pelo axónio. params: pulses, color', 0.5, (ctx, s, p, lt) => {
  const c = p.color || '#7fe7ff'; ctx.save(); halo(ctx, s, c.replace('#', '#') + '66', 0.0); ctx.lineCap = 'round';
  const dend = [[-0.45, -0.25], [-0.4, 0.2], [-0.2, -0.35], [-0.3, 0.32], [-0.5, 0.0]]; ctx.strokeStyle = INK; for (const [x, y] of dend) { ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(-s * 0.2, 0); ctx.quadraticCurveTo(x * s * 0.6, y * s * 0.3, x * s, y * s); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = s * 0.016; ctx.stroke(); ctx.strokeStyle = INK; }
  ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(-s * 0.15, 0); ctx.lineTo(s * 0.42, 0); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = s * 0.03; ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * 0.2, 0, s * 0.12, 0, 7); ctx.fillStyle = rg(ctx, -s * 0.22, -s * 0.03, 1, s * 0.14, '#ffffff', c); ctx.fill(); ink(ctx, s, 0.025); ctx.stroke();
  for (let i = 0; i < (p.pulses || 3); i++) { const ph = (lt * 0.7 + i / (p.pulses || 3)) % 1, x = -s * 0.1 + ph * s * 0.5; ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = c; ctx.shadowBlur = s * 0.06; ctx.beginPath(); ctx.arc(x, 0, s * 0.03, 0, 7); ctx.fill(); ctx.restore(); }
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s * 0.46 + i * s * 0.0, (i - 1) * s * 0.06, s * 0.03, 0, 7); ctx.fillStyle = c; ctx.fill(); ctx.stroke(); } ctx.restore();
});

def('rbc', 'glóbulo vermelho (disco bicôncavo). params: spin', 0.12, (ctx, s, p, lt) => {
  ctx.save(); ctx.rotate((p.spin ?? 1) * lt * 0.5); ctx.scale(1, 0.82 + 0.1 * Math.sin(lt * 2)); ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, 7); ctx.fillStyle = rg(ctx, 0, 0, s * 0.05, s * 0.45, '#b02035', '#ee4a5a'); ctx.fill(); ink(ctx, s, 0.05); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.15, 0, 0, 7); ctx.fillStyle = 'rgba(120,10,30,.45)'; ctx.fill(); gloss(ctx, -s * 0.2, -s * 0.22, s * 0.1, s * 0.05, -0.7, 0.5); ctx.restore();
});

const ORGAN_POS = { brain: [0, -0.43, 0.2], lungs: [0, -0.2, 0.34], heart: [0.035, -0.17, 0.16], liver: [-0.075, -0.065, 0.19], stomach: [0.07, -0.06, 0.15], intestine: [0, 0.07, 0.3], kidneys: [0, -0.05, 0.14] };
def('body_outline', 'silhueta do corpo com órgãos no sítio certo; organs:[brain,lungs,heart,liver,stomach,intestine,kidneys], highlight:"heart" destaca um (os outros esmaecem). params: face', 0.9, (ctx, s, p, lt) => {
  const orgs = p.organs || ['brain', 'lungs', 'heart', 'liver', 'stomach', 'intestine'], hl = p.highlight;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const body = () => { ctx.beginPath(); ctx.ellipse(0, -s * 0.43, s * 0.1, s * 0.115, 0, 0, 7); ctx.moveTo(-s * 0.04, -s * 0.31); ctx.lineTo(s * 0.04, -s * 0.31); ctx.lineTo(s * 0.04, -s * 0.28); ctx.quadraticCurveTo(s * 0.2, -s * 0.27, s * 0.22, -s * 0.2); ctx.lineTo(s * 0.26, s * 0.08); ctx.lineTo(s * 0.2, s * 0.09); ctx.lineTo(s * 0.17, -s * 0.12); ctx.lineTo(s * 0.16, s * 0.12); ctx.lineTo(s * 0.14, s * 0.46); ctx.lineTo(s * 0.04, s * 0.46); ctx.lineTo(s * 0.01, s * 0.14); ctx.lineTo(-s * 0.01, s * 0.14); ctx.lineTo(-s * 0.04, s * 0.46); ctx.lineTo(-s * 0.14, s * 0.46); ctx.lineTo(-s * 0.16, s * 0.12); ctx.lineTo(-s * 0.17, -s * 0.12); ctx.lineTo(-s * 0.2, s * 0.09); ctx.lineTo(-s * 0.26, s * 0.08); ctx.lineTo(-s * 0.22, -s * 0.2); ctx.quadraticCurveTo(-s * 0.2, -s * 0.27, -s * 0.04, -s * 0.28); ctx.closePath(); };
  body(); const g = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5); g.addColorStop(0, 'rgba(160,220,255,.35)'); g.addColorStop(1, 'rgba(120,170,255,.12)'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(190,230,255,.95)'; ctx.lineWidth = Math.max(3, s * 0.012); ctx.shadowColor = '#6ac8ff'; ctx.shadowBlur = s * 0.04; ctx.stroke(); ctx.shadowBlur = 0;
  const order = ['kidneys', 'lungs', 'liver', 'stomach', 'intestine', 'heart', 'brain'];
  for (const name of order) { if (!orgs.includes(name)) continue; const [x, y, k] = ORGAN_POS[name], on = !hl || hl === name; ctx.save(); ctx.translate(x * s, y * s); ctx.globalAlpha = on ? 1 : 0.35; if (on && hl) { const pl = 1 + 0.08 * Math.sin(lt * 5); const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, k * s * 0.9 * pl); gg.addColorStop(0, 'rgba(255,240,160,.55)'); gg.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = gg; ctx.fillRect(-s, -s, s * 2, s * 2); } PROPS[name].draw(ctx, k * s * 1.0, { ...p, face: false, glow: 0 }, lt); ctx.restore(); }
  ctx.restore();
});
