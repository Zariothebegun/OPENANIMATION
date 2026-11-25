// Props de engenharia/veículos + `shape` (vector livre desenhado pela IA). Importado por scene.js e catalog.js.
import { PROPS } from './props.js';
import { INK, shade, roundRect, clamp, ease } from './util.js';
import { FONT_UI } from './props.js';

const def = (k, desc, size, draw) => { PROPS[k] = { desc, size, draw }; };
const ST = (ctx, s, k = 0.03) => { ctx.lineWidth = Math.max(2.5, s * k); ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
const FS = (ctx, f) => { ctx.fillStyle = f; ctx.fill(); ctx.stroke(); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Nuvem de gás (jacto): origem (x,y), direcção (dx,dy) normalizada, comprimento len, intensidade k 0..1.
export function gasJet(ctx, x, y, dx, dy, len, lt, k = 1, color = '255,255,255', seed = 0) {
  if (k <= 0.01) return;
  const n = 14; ctx.save();
  for (let i = 0; i < n; i++) {
    const ph = ((lt * 2.4 + hash(i + seed * 9) ) % 1), d = ph * len, sp = (hash(i * 3 + seed) - 0.5) * len * 0.35 * ph;
    const px = x + dx * d - dy * sp, py = y + dy * d + dx * sp, r = len * (0.05 + ph * 0.14) * k;
    ctx.globalAlpha = (1 - ph) * 0.8 * k; ctx.fillStyle = `rgb(${color})`; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}

def('shape', 'vector livre: paths [{t:"rect|circle|ellipse|poly|line|arc|text|curve", x,y,w,h,r,pts,fill,stroke,lw,text,size,a0,a1,at,dash}] em coords -0.5..0.5 do tamanho; "at" = segundos para aparecer, "draw":true anima o traço', 0.4, (ctx, s, p, lt) => {
  const U = (v) => v * s;
  for (const sh of p.paths || []) {
    if (sh.at !== undefined && lt < sh.at) continue;
    const k = sh.draw ? ease.out(clamp((lt - (sh.at || 0)) / (sh.dur || 0.6), 0, 1)) : 1;
    ctx.save(); ctx.globalAlpha = sh.alpha ?? (sh.at !== undefined ? clamp((lt - sh.at) / 0.15, 0, 1) : 1);
    if (sh.dash) ctx.setLineDash(sh.dash.map(U)); ctx.lineWidth = Math.max(1.5, U(sh.lw ?? 0.02)); ctx.strokeStyle = sh.stroke || INK; ctx.fillStyle = sh.fill || 'rgba(0,0,0,0)'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const f = () => { if (sh.fill) ctx.fill(); if (sh.stroke !== 'none' && (sh.stroke || sh.t === 'line' || sh.t === 'curve' || sh.fill)) ctx.stroke(); };
    ctx.beginPath();
    switch (sh.t) {
      case 'rect': roundRect(ctx, U(sh.x), U(sh.y), U(sh.w), U(sh.h), U(sh.r || 0)); f(); break;
      case 'circle': ctx.arc(U(sh.x), U(sh.y), U(sh.r || 0.05) * (sh.draw ? k : 1), 0, 7); f(); break;
      case 'ellipse': ctx.ellipse(U(sh.x), U(sh.y), U(sh.w / 2), U(sh.h / 2), (sh.rot || 0) * Math.PI / 180, 0, 7); f(); break;
      case 'poly': (sh.pts || []).forEach(([x, y], i) => (i ? ctx.lineTo(U(x), U(y)) : ctx.moveTo(U(x), U(y)))); if (sh.close !== false) ctx.closePath(); f(); break;
      case 'line': { const pts = sh.pts || [[sh.x1 ?? 0, sh.y1 ?? 0], [sh.x2 ?? 0, sh.y2 ?? 0]]; const [a, b] = [pts[0], pts[pts.length - 1]]; ctx.moveTo(U(a[0]), U(a[1])); for (let i = 1; i < pts.length; i++) ctx.lineTo(U(a[0] + (pts[i][0] - a[0]) * k), U(a[1] + (pts[i][1] - a[1]) * k)); ctx.stroke(); if (sh.arrow && k > 0.95) { const q = pts[pts.length - 1], q0 = pts[pts.length - 2] || a, an = Math.atan2(q[1] - q0[1], q[0] - q0[0]), hs = U(0.04); ctx.beginPath(); ctx.moveTo(U(q[0]), U(q[1])); ctx.lineTo(U(q[0]) - Math.cos(an - 0.5) * hs, U(q[1]) - Math.sin(an - 0.5) * hs); ctx.moveTo(U(q[0]), U(q[1])); ctx.lineTo(U(q[0]) - Math.cos(an + 0.5) * hs, U(q[1]) - Math.sin(an + 0.5) * hs); ctx.stroke(); } break; }
      case 'curve': { const [a, c, b] = sh.pts; ctx.moveTo(U(a[0]), U(a[1])); ctx.quadraticCurveTo(U(c[0]), U(c[1]), U(b[0]), U(b[1])); ctx.stroke(); break; }
      case 'arc': ctx.arc(U(sh.x), U(sh.y), U(sh.r || 0.1), (sh.a0 || 0) * Math.PI / 180, ((sh.a0 || 0) + ((sh.a1 ?? 360) - (sh.a0 || 0)) * k) * Math.PI / 180); if (sh.fill) ctx.fill(); ctx.stroke(); break;
      case 'text': { ctx.font = `${sh.weight || 800} ${U(sh.size || 0.07)}px ${FONT_UI}`; ctx.textAlign = sh.align || 'center'; ctx.textBaseline = 'middle'; if (sh.stroke) { ctx.lineWidth = U(sh.size || 0.07) * 0.14; ctx.strokeText(sh.text || '', U(sh.x), U(sh.y)); } ctx.fillStyle = sh.fill || '#fff'; ctx.fillText(sh.text || '', U(sh.x), U(sh.y)); break; }
    }
    ctx.restore();
  }
});

def('car_side', 'carro desportivo em vista lateral (vira para a direita). params: color, wheels, jets 0..1 (gás frio dos propulsores: "down" por baixo, "rear" atrás, "roof" em cima), glow, hover (elevação 0..1)', 0.6, (ctx, s, p, lt) => {
  const col = p.color || '#d8dde6', hv = (p.hover || 0) * s * 0.28, jets = p.jets === true ? 1 : p.jets || 0;
  ctx.save(); ctx.translate(0, -hv);
  const bob = jets ? Math.sin(lt * 7) * s * 0.006 : 0; ctx.translate(0, bob);
  if (p.shadow !== false) { ctx.save(); ctx.translate(0, hv + s * 0.215 - bob); ctx.scale(1 - (p.hover || 0) * 0.25, 1); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.45, s * 0.035, 0, 0, 7); ctx.fill(); ctx.restore(); }
  const jetY = s * 0.175;
  if (jets && (p.mode || 'down') !== 'rear') for (const jx of [-0.3, 0.28]) gasJet(ctx, jx * s, jetY, 0, 1, s * (0.2 + 0.15 * jets) + hv, lt, jets, '235,245,255', jx > 0 ? 1 : 2);
  if (jets && (p.mode === 'rear' || p.mode === 'all')) gasJet(ctx, -s * 0.5, s * 0.02, -1, 0.1, s * 0.3, lt, jets, '235,245,255', 5);
  if (jets && p.roof) gasJet(ctx, s * 0.02, -s * 0.2, 0, -1, s * 0.25, lt, jets, '235,245,255', 7);
  ST(ctx, s, 0.012); ctx.lineWidth = Math.max(3, s * 0.014);
  ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.1); ctx.bezierCurveTo(-s * 0.5, -s * 0.02, -s * 0.46, -s * 0.06, -s * 0.34, -s * 0.08); ctx.bezierCurveTo(-s * 0.2, -s * 0.1, -s * 0.15, -s * 0.2, -s * 0.02, -s * 0.2); ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.2, -s * 0.11, s * 0.33, -s * 0.07); ctx.bezierCurveTo(s * 0.46, -s * 0.04, s * 0.5, s * 0.02, s * 0.5, s * 0.1); ctx.bezierCurveTo(s * 0.5, s * 0.15, s * 0.48, s * 0.17, s * 0.44, s * 0.17); ctx.lineTo(-s * 0.44, s * 0.17); ctx.bezierCurveTo(-s * 0.48, s * 0.17, -s * 0.5, s * 0.15, -s * 0.5, s * 0.1); ctx.closePath();
  const g = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.17); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.3)); FS(ctx, g);
  ctx.beginPath(); ctx.moveTo(-s * 0.17, -s * 0.09); ctx.bezierCurveTo(-s * 0.1, -s * 0.17, -s * 0.05, -s * 0.18, s * 0.02, -s * 0.18); ctx.bezierCurveTo(s * 0.1, -s * 0.18, s * 0.17, -s * 0.11, s * 0.24, -s * 0.07); ctx.closePath(); FS(ctx, '#1b2a3c');
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = s * 0.008; ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.12); ctx.lineTo(-s * 0.04, -s * 0.16); ctx.stroke();
  ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = s * 0.006; ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.02); ctx.lineTo(s * 0.4, s * 0.04); ctx.stroke();
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(s * 0.44, s * 0.03, s * 0.04, s * 0.012, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.ellipse(-s * 0.48, s * 0.03, s * 0.015, s * 0.02, 0, 0, 7); ctx.fill();
  for (const wx of [-0.29, 0.29]) { ctx.save(); ctx.translate(wx * s, s * 0.14); ST(ctx, s, 0.014); ctx.beginPath(); ctx.arc(0, 0, s * 0.085, 0, 7); FS(ctx, '#15151b'); ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.arc(0, 0, s * 0.05, 0, 7); ctx.fill(); ctx.rotate(lt * (p.moving ? -14 : 0)); ctx.strokeStyle = '#6b707c'; ctx.lineWidth = s * 0.008; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.05, 0); ctx.stroke(); ctx.rotate(Math.PI * 2 / 5); } ctx.restore(); }
  if (p.nozzles !== false) { ST(ctx, s, 0.01); for (const jx of [-0.3, 0.28]) { roundRect(ctx, (jx - 0.03) * s, s * 0.165, s * 0.06, s * 0.025, s * 0.006); FS(ctx, '#3a3f4b'); } }
  if (p.label) { ctx.font = `800 ${s * 0.05}px ${FONT_UI}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(p.label, 0, -s * 0.26); }
  ctx.restore();
});

def('tank', 'depósito/cilindro de gás comprimido (COPV, fibra de carbono). params: color, label, pressure 0..1 (cor de aviso), glow', 0.3, (ctx, s, p, lt) => {
  const col = p.color || '#2b2f3a'; ST(ctx, s, 0.035);
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.36, s * 0.25, 0, 0, 7); const g = ctx.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.03, 0, 0, s * 0.4); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(1, shade(col, -0.2)); FS(ctx, g);
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = s * 0.012; for (let i = -12; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.06 - s * 0.3, -s * 0.3); ctx.lineTo(i * s * 0.06 + s * 0.3, s * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * s * 0.06 + s * 0.3, -s * 0.3); ctx.lineTo(i * s * 0.06 - s * 0.3, s * 0.3); ctx.stroke(); } ctx.restore();
  ST(ctx, s, 0.03); roundRect(ctx, s * 0.33, -s * 0.05, s * 0.1, s * 0.1, s * 0.015); FS(ctx, '#b9bfca');
  if (p.pressure !== undefined) { ctx.fillStyle = p.pressure > 0.75 ? '#ff5a4a' : '#59d98b'; ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.12, s * 0.025, 0, 7); ctx.fill(); }
  if (p.label) { ctx.font = `800 ${s * 0.09}px ${FONT_UI}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.label, 0, s * 0.02); }
});

def('gauge', 'manómetro/mostrador semicircular. params: value 0..1 (ponteiro anima), label, max, color', 0.3, (ctx, s, p, lt) => {
  const v = clamp(p.value ?? 0.5, 0, 1) * ease.out(clamp(lt / 0.8, 0, 1)); ST(ctx, s, 0.035);
  ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); FS(ctx, '#f4f6fa');
  const zones = [['#59d98b', 0, 0.6], ['#f2c038', 0.6, 0.82], ['#e2574c', 0.82, 1]];
  for (const [c, a, b] of zones) { ctx.strokeStyle = c; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, Math.PI * (0.8 + 1.4 * a), Math.PI * (0.8 + 1.4 * b)); ctx.stroke(); }
  const ang = Math.PI * (0.8 + 1.4 * v); ST(ctx, s, 0.03); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * s * 0.3, Math.sin(ang) * s * 0.3); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, s * 0.04, 0, 7); ctx.fill();
  if (p.label) { ctx.font = `800 ${s * 0.07}px ${FONT_UI}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.label, 0, s * 0.22); }
});

def('nozzle', 'bocal/propulsor com jacto de gás frio. params: dir (graus; 90=para baixo), power 0..1', 0.2, (ctx, s, p, lt) => {
  const a = (p.dir ?? 90) * Math.PI / 180, pw = p.power ?? 1; ctx.save(); ctx.rotate(a - Math.PI / 2); ST(ctx, s, 0.04);
  ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.2); ctx.lineTo(s * 0.12, -s * 0.2); ctx.lineTo(s * 0.2, s * 0.1); ctx.lineTo(-s * 0.2, s * 0.1); ctx.closePath(); FS(ctx, '#7b8290');
  roundRect(ctx, -s * 0.16, -s * 0.3, s * 0.32, s * 0.1, s * 0.02); FS(ctx, '#4a505c'); gasJet(ctx, 0, s * 0.1, 0, 1, s * 1.1 * pw, lt, pw, '235,245,255', 3); ctx.restore();
});

def('ramp', 'rampa/plano inclinado (vista lateral). params: color, angle', 0.4, (ctx, s, p) => {
  ST(ctx, s, 0.03); ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.15); ctx.lineTo(s * 0.5, s * 0.15); ctx.lineTo(s * 0.5, -s * (p.angle ?? 0.12)); ctx.closePath(); FS(ctx, p.color || '#6b707c');
});

def('spotlight', 'foco de luz cónico vindo de cima. params: color, width', 0.5, (ctx, s, p, lt) => {
  const w = (p.width ?? 0.5) * s; const g = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5); g.addColorStop(0, (p.color || 'rgba(255,245,210,') + '.6)'); g.addColorStop(1, (p.color || 'rgba(255,245,210,') + '0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-s * 0.04, -s * 0.5); ctx.lineTo(s * 0.04, -s * 0.5); ctx.lineTo(w / 2, s * 0.5); ctx.lineTo(-w / 2, s * 0.5); ctx.fill();
});

def('crowd', 'multidão de bonecos (cabeças e ombros). params: n, colors', 0.6, (ctx, s, p, lt) => {
  const n = p.n || 9; ST(ctx, s, 0.012);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1) - 0.5) * s * 0.95, y = ((i % 3) - 1) * s * 0.035 + Math.sin(lt * 3 + i) * s * 0.008, r = s * (0.05 + (i % 2) * 0.008); ctx.beginPath(); ctx.arc(x, y + r * 1.6, r * 1.15, Math.PI, 0); ctx.lineTo(x + r * 1.15, y + r * 3); ctx.lineTo(x - r * 1.15, y + r * 3); ctx.closePath(); FS(ctx, (p.colors || ['#4a90e2', '#e2574c', '#4cb782', '#f2c038', '#a66bff', '#f06aa8'])[i % 6]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); FS(ctx, '#f8e8d2'); }
});

def('callout', 'etiqueta com seta apontadora (text, dir: left|right|up|down). params: color', 0.3, (ctx, s, p, lt) => {
  const w = s * 0.9, h = s * 0.26; ST(ctx, s, 0.025); roundRect(ctx, -w / 2, -h / 2, w, h, s * 0.04); FS(ctx, p.color || '#ffd23f');
  const d = p.dir || 'down', ax = d === 'left' ? -1 : d === 'right' ? 1 : 0, ay = d === 'up' ? -1 : d === 'down' ? 1 : 0;
  ctx.beginPath(); ctx.moveTo(ax ? ax * w / 2 : -s * 0.07, ay ? ay * h / 2 : -s * 0.07); ctx.lineTo(ax ? ax * (w / 2 + s * 0.16) : 0, ay ? ay * (h / 2 + s * 0.16) : 0); ctx.lineTo(ax ? ax * w / 2 : s * 0.07, ay ? ay * h / 2 : s * 0.07); ctx.closePath(); FS(ctx, p.color || '#ffd23f');
  let fs = s * 0.085; ctx.font = `800 ${fs}px ${FONT_UI}`; const tw = ctx.measureText(p.text || '').width; if (tw > w * 0.9) { fs *= (w * 0.9) / tw; ctx.font = `800 ${fs}px ${FONT_UI}`; } ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.text || '', 0, 0);
});

def('sparks', 'faíscas/explosão de partículas. params: color, n', 0.3, (ctx, s, p, lt) => {
  const n = p.n || 16; ctx.save(); for (let i = 0; i < n; i++) { const a = hash(i) * 7, v = 0.3 + hash(i + 40) * 0.7, ph = (lt * 1.2 + hash(i + 9)) % 1; ctx.globalAlpha = 1 - ph; ctx.fillStyle = p.color || '#ffd23f'; ctx.beginPath(); ctx.arc(Math.cos(a) * s * v * ph * 0.8, Math.sin(a) * s * v * ph * 0.8, s * 0.02 * (1 - ph) + 1, 0, 7); ctx.fill(); } ctx.restore();
});

// ---- História / guerra ----
def('tank_side', 'tanque em vista lateral (vira à direita). params: color, flip, fire (disparo), moving', 0.5, (ctx, s, p, lt) => {
  const c = p.color || '#5c6b48'; ST(ctx, s, 0.012); ctx.lineWidth = Math.max(3, s * 0.014);
  ctx.beginPath(); ctx.moveTo(-s * 0.46, -s * 0.02); ctx.lineTo(s * 0.46, -s * 0.02); ctx.lineTo(s * 0.4, -s * 0.16); ctx.lineTo(-s * 0.34, -s * 0.16); ctx.closePath(); FS(ctx, c);
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.16); ctx.lineTo(-s * 0.12, -s * 0.3); ctx.lineTo(s * 0.16, -s * 0.3); ctx.lineTo(s * 0.22, -s * 0.16); ctx.closePath(); FS(ctx, shade(c, 0.1));
  ctx.beginPath(); ctx.rect(s * 0.16, -s * 0.255, s * 0.5, s * 0.04); FS(ctx, shade(c, -0.1));
  roundRect(ctx, -s * 0.5, -s * 0.02, s, s * 0.14, s * 0.07); FS(ctx, '#2b2924');
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-s * 0.4 + i * s * 0.16, s * 0.05); ctx.beginPath(); ctx.arc(0, 0, s * 0.048, 0, 7); FS(ctx, '#6a6e5c'); ctx.rotate(lt * (p.moving ? 8 : 0)); ctx.beginPath(); ctx.moveTo(-s * 0.03, 0); ctx.lineTo(s * 0.03, 0); ctx.stroke(); ctx.restore(); }
  if (p.fire && (lt * 3) % 1 < 0.25) { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(s * 0.66, -s * 0.275); ctx.lineTo(s * 0.82, -s * 0.33); ctx.lineTo(s * 0.74, -s * 0.235); ctx.lineTo(s * 0.84, -s * 0.2); ctx.lineTo(s * 0.66, -s * 0.24); ctx.closePath(); ctx.fill(); }
});
def('plane_side', 'avião em vista lateral (vira à direita). params: color, trail (rasto de fumo)', 0.45, (ctx, s, p, lt) => {
  const c = p.color || '#7a8a6a'; ST(ctx, s, 0.012); ctx.lineWidth = Math.max(3, s * 0.014);
  if (p.trail) for (let i = 0; i < 10; i++) { const ph = (lt * 1.3 + i / 10) % 1; ctx.globalAlpha = (1 - ph) * 0.5; ctx.fillStyle = '#d8d8d8'; ctx.beginPath(); ctx.arc(-s * 0.55 - ph * s * 0.7, s * 0.02 + Math.sin(i) * s * 0.01, s * (0.03 + ph * 0.07), 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.02); ctx.quadraticCurveTo(-s * 0.1, -s * 0.12, s * 0.45, -s * 0.02); ctx.quadraticCurveTo(s * 0.52, 0, s * 0.45, s * 0.03); ctx.quadraticCurveTo(-s * 0.1, s * 0.1, -s * 0.5, s * 0.02); ctx.closePath(); FS(ctx, c);
  ctx.beginPath(); ctx.moveTo(-s * 0.46, -s * 0.02); ctx.lineTo(-s * 0.6, -s * 0.2); ctx.lineTo(-s * 0.4, -s * 0.03); ctx.closePath(); FS(ctx, shade(c, -0.1));
  ctx.beginPath(); ctx.moveTo(-s * 0.05, 0); ctx.lineTo(-s * 0.2, s * 0.22); ctx.lineTo(s * 0.12, s * 0.02); ctx.closePath(); FS(ctx, shade(c, -0.2));
  ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.045, s * 0.07, s * 0.03, 0, 0, 7); FS(ctx, '#9ad0ee');
  ctx.save(); ctx.translate(s * 0.5, 0); ctx.strokeStyle = 'rgba(40,40,40,.6)'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(0, -s * 0.08 * Math.sin(lt * 40)); ctx.lineTo(0, s * 0.08 * Math.sin(lt * 40)); ctx.stroke(); ctx.restore();
});
def('explosion', 'explosão animada com bola de fogo e fumo. params: color', 0.4, (ctx, s, p, lt) => {
  const k = clamp(lt / 0.9, 0, 1), e = ease.out(k); ctx.save(); ctx.globalAlpha = 1 - ease.in(clamp((lt - 0.5) / 0.7, 0, 1));
  for (let i = 0; i < 9; i++) { const a = hash(i) * 6.28, d = s * 0.28 * e * (0.5 + hash(i + 9)), r = s * (0.1 + 0.16 * hash(i + 3)) * (0.4 + e); ctx.fillStyle = i % 3 === 0 ? '#4a4048' : '#ff9a2a'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d - s * 0.1 * e, r, 0, 7); ctx.fill(); ST(ctx, s, 0.02); ctx.stroke(); }
  ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(0, -s * 0.05 * e, s * 0.18 * (1 - k * 0.5), 0, 7); ctx.fill(); ctx.restore();
});
def('warmap', 'mapa de guerra em mesa/quadro com setas animadas. params: arrows [{x1,y1,x2,y2,c}], marks [{x,y,t}], title', 0.6, (ctx, s, p, lt) => {
  ST(ctx, s, 0.012); roundRect(ctx, -s * 0.5, -s * 0.35, s, s * 0.7, s * 0.02); FS(ctx, '#d9c9a0');
  ctx.save(); ctx.clip(); ctx.fillStyle = '#b7c9a0'; ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.2); ctx.bezierCurveTo(-s * 0.2, -s * 0.4, s * 0.1, -s * 0.1, s * 0.4, -s * 0.28); ctx.lineTo(s * 0.45, s * 0.25); ctx.bezierCurveTo(s * 0.1, s * 0.4, -s * 0.2, s * 0.15, -s * 0.45, s * 0.3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(80,60,40,.35)'; ctx.lineWidth = s * 0.006; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.11, -s * 0.4); ctx.lineTo(i * s * 0.11, s * 0.4); ctx.stroke(); } ctx.restore();
  const ar = p.arrows || [{ x1: -0.4, y1: 0, x2: 0.3, y2: -0.05, c: '#d33' }];
  ar.forEach((a, i) => { const k = ease.out(clamp((lt - (a.at ?? i * 0.7)) / 0.9, 0, 1)); if (k <= 0) return; const x2 = a.x1 + (a.x2 - a.x1) * k, y2 = a.y1 + (a.y2 - a.y1) * k; ctx.strokeStyle = a.c || '#d33'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(a.x1 * s, a.y1 * s); ctx.lineTo(x2 * s, y2 * s); ctx.stroke(); const an = Math.atan2(a.y2 - a.y1, a.x2 - a.x1); ctx.fillStyle = a.c || '#d33'; ctx.beginPath(); ctx.moveTo(x2 * s + Math.cos(an) * s * 0.05, y2 * s + Math.sin(an) * s * 0.05); ctx.lineTo(x2 * s + Math.cos(an + 2.5) * s * 0.05, y2 * s + Math.sin(an + 2.5) * s * 0.05); ctx.lineTo(x2 * s + Math.cos(an - 2.5) * s * 0.05, y2 * s + Math.sin(an - 2.5) * s * 0.05); ctx.fill(); });
  (p.marks || []).forEach((m, i) => { if (lt < (m.at ?? 0)) return; ctx.fillStyle = m.c || '#222'; ctx.beginPath(); ctx.arc(m.x * s, m.y * s, s * 0.018, 0, 7); ctx.fill(); if (m.t) { ctx.font = `800 ${s * 0.055}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText(m.t, m.x * s, m.y * s - s * 0.04); } });
  if (p.title) { ctx.font = `800 ${s * 0.065}px ${FONT_UI}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(p.title, 0, -s * 0.38); }
});
def('banner', 'bandeira/estandarte de 2-3 faixas (colors, vertical). Sem simbologia real; usa cores para identificar lados', 0.25, (ctx, s, p, lt) => {
  const cols = p.colors || ['#c0392b', '#ecf0f1', '#2c3e50'], w = s * 0.9, h = s * 0.55, n = cols.length; ST(ctx, s, 0.03); ctx.beginPath(); ctx.moveTo(-w / 2, -s * 0.6); ctx.lineTo(-w / 2, s * 0.6); ctx.stroke();
  cols.forEach((c, i) => { ctx.beginPath(); const x0 = -w / 2, y0 = -s * 0.55 + (p.vertical ? 0 : i * h / n), ww = p.vertical ? w / n : w, hh = p.vertical ? h : h / n; for (let k = 0; k <= 10; k++) { const x = x0 + (p.vertical ? i * ww : 0) + ww * k / 10, wave = Math.sin(lt * 4 + k * 0.7) * s * 0.025 * (k / 10); k ? ctx.lineTo(x, y0 + wave) : ctx.moveTo(x, y0 + wave); } for (let k = 10; k >= 0; k--) { const x = x0 + (p.vertical ? i * ww : 0) + ww * k / 10, wave = Math.sin(lt * 4 + k * 0.7) * s * 0.025 * (k / 10); ctx.lineTo(x, y0 + hh + wave); } ctx.closePath(); FS(ctx, c); });
});
def('stat', 'número grande com legenda (value, label, color): para factos e estatísticas', 0.3, (ctx, s, p, lt) => {
  const k = ease.back(clamp(lt / 0.4, 0, 1)); ctx.save(); ctx.scale(k, k); ctx.font = `${s * 0.42}px "Anton", Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.07; ctx.strokeStyle = INK; ctx.strokeText(p.value || '', 0, 0); ctx.fillStyle = p.color || '#ffd23f'; ctx.fillText(p.value || '', 0, 0); ctx.font = `800 ${s * 0.11}px ${FONT_UI}`; ctx.lineWidth = s * 0.03; ctx.strokeText(p.label || '', 0, s * 0.33); ctx.fillStyle = '#fff'; ctx.fillText(p.label || '', 0, s * 0.33); ctx.restore();
});
