// Biblioteca de objectos vectoriais (props). draw(ctx, s, p, lt): origem no centro, s = tamanho em px, lt = tempo local (s).
import { INK, shade, roundRect, clamp, ease } from './util.js';

export const FONT_DISPLAY = '"Anton", Impact, "Arial Black", sans-serif';
export const FONT_UI = '"Inter", "Helvetica Neue", Arial, sans-serif';

const ST = (ctx, s, k = 0.035) => { ctx.lineWidth = Math.max(2.5, s * k); ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
const FS = (ctx, fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };

export function outlinedText(ctx, text, x, y, size, fill = '#fff', stroke = INK, font = FONT_DISPLAY, align = 'center', lwK = 0.14) {
  ctx.save();
  ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * lwK; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}


const blob = (ctx, s, shapes, fill) => { ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, s * 0.035) * 2; ctx.beginPath(); shapes(ctx); ctx.stroke(); ctx.fillStyle = fill; ctx.beginPath(); shapes(ctx); ctx.fill(); ctx.restore(); };
const circ = (ctx, x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); };

const P = {};
const def = (k, desc, size, draw) => { P[k] = { desc, size, draw }; };

def('lightbulb', 'lâmpada (ideia) com brilho', 0.2, (ctx, s, p, lt) => {
  const glow = p.glow !== false;
  if (glow) { ctx.save(); ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; const pul = 1 + Math.sin(lt * 6) * 0.08; for (let i = 0; i < 9; i++) { const a = -Math.PI * 1.1 + (i / 8) * Math.PI * 1.2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.42 * pul, -s * 0.1 + Math.sin(a) * s * 0.42 * pul); ctx.lineTo(Math.cos(a) * s * 0.55 * pul, -s * 0.1 + Math.sin(a) * s * 0.55 * pul); ctx.stroke(); } ctx.restore(); }
  ST(ctx, s); ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.3, 0, 7); FS(ctx, p.color || '#ffe066');
  roundRect(ctx, -s * 0.12, s * 0.15, s * 0.24, s * 0.18, s * 0.04); FS(ctx, '#aab2bd');
  ctx.beginPath(); ctx.moveTo(-s * 0.12, s * 0.24); ctx.lineTo(s * 0.12, s * 0.24); ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.18, s * 0.08, Math.PI, Math.PI * 1.5); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke();
});

def('book', 'livro fechado', 0.2, (ctx, s, p) => {
  ST(ctx, s); roundRect(ctx, -s * 0.28, -s * 0.36, s * 0.56, s * 0.72, s * 0.04); FS(ctx, p.color || '#d9534f');
  ctx.fillStyle = '#fff'; roundRect(ctx, -s * 0.2, -s * 0.28, s * 0.4, s * 0.2, s * 0.02); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.28, -s * 0.3); ctx.lineTo(-s * 0.22, -s * 0.3); ctx.lineTo(-s * 0.22, s * 0.36); ctx.stroke();
});
def('book_open', 'livro aberto', 0.26, (ctx, s, p) => {
  ST(ctx, s);
  ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.quadraticCurveTo(-s * 0.25, -s * 0.3, -s * 0.5, -s * 0.2); ctx.lineTo(-s * 0.5, s * 0.25); ctx.quadraticCurveTo(-s * 0.25, s * 0.15, 0, s * 0.3); ctx.closePath(); FS(ctx, '#fff');
  ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.quadraticCurveTo(s * 0.25, -s * 0.3, s * 0.5, -s * 0.2); ctx.lineTo(s * 0.5, s * 0.25); ctx.quadraticCurveTo(s * 0.25, s * 0.15, 0, s * 0.3); ctx.closePath(); FS(ctx, '#fff');
  ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = s * 0.02; for (let i = 0; i < 4; i++) { const y = -s * 0.1 + i * s * 0.08; ctx.beginPath(); ctx.moveTo(-s * 0.42, y); ctx.lineTo(-s * 0.08, y + s * 0.02); ctx.moveTo(s * 0.08, y + s * 0.02); ctx.lineTo(s * 0.42, y); ctx.stroke(); }
});
def('laptop', 'portátil', 0.3, (ctx, s, p, lt) => {
  ST(ctx, s); roundRect(ctx, -s * 0.38, -s * 0.3, s * 0.76, s * 0.5, s * 0.04); FS(ctx, '#3a4150');
  roundRect(ctx, -s * 0.33, -s * 0.25, s * 0.66, s * 0.4, s * 0.02); FS(ctx, p.screen || '#1f2d3d');
  ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = s * 0.025; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.27, -s * 0.18 + i * s * 0.08); ctx.lineTo(-s * 0.27 + s * (0.2 + 0.25 * ((i * 37) % 5) / 5) * (0.6 + 0.4 * Math.sin(lt * 2 + i)), -s * 0.18 + i * s * 0.08); ctx.stroke(); }
  ST(ctx, s); ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.2); ctx.lineTo(s * 0.45, s * 0.2); ctx.lineTo(s * 0.4, s * 0.28); ctx.lineTo(-s * 0.4, s * 0.28); ctx.closePath(); FS(ctx, '#b8bfca');
});
def('ram', 'pastilha de memória RAM', 0.34, (ctx, s, p) => {
  ST(ctx, s); roundRect(ctx, -s * 0.5, -s * 0.16, s, s * 0.32, s * 0.02); FS(ctx, p.color || '#2f9e6b');
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#222'; roundRect(ctx, -s * 0.42 + i * s * 0.21, -s * 0.1, s * 0.17, s * 0.15, s * 0.015); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#f2c038'; for (let i = 0; i < 14; i++) ctx.fillRect(-s * 0.46 + i * s * 0.066, s * 0.1, s * 0.035, s * 0.06);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, s * 0.16, s * 0.025, 0, 7); ctx.fill();
});
def('cpu', 'processador/chip', 0.26, (ctx, s, p, lt) => {
  ST(ctx, s); ctx.strokeStyle = '#8a93a0'; ctx.lineWidth = s * 0.04; for (let i = 0; i < 5; i++) { const o = -s * 0.24 + i * s * 0.12; for (const [a, b, c, d] of [[o, -s * 0.38, o, -s * 0.28], [o, s * 0.28, o, s * 0.38], [-s * 0.38, o, -s * 0.28, o], [s * 0.28, o, s * 0.38, o]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); } }
  ST(ctx, s); roundRect(ctx, -s * 0.3, -s * 0.3, s * 0.6, s * 0.6, s * 0.05); FS(ctx, p.color || '#3a4150');
  roundRect(ctx, -s * 0.18, -s * 0.18, s * 0.36, s * 0.36, s * 0.03); FS(ctx, '#5b6577');
  outlinedText(ctx, p.text || 'CPU', 0, 0, s * 0.17, '#fff', 'transparent', FONT_DISPLAY, 'center', 0);
});
def('brain', 'cérebro', 0.28, (ctx, s, p) => {
  ST(ctx, s, 0.03); ctx.beginPath();
  const bl = [[-0.22, -0.08, 0.2], [0.0, -0.18, 0.22], [0.22, -0.08, 0.2], [-0.2, 0.12, 0.2], [0.2, 0.12, 0.2], [0, 0.06, 0.2]];
  for (const [x, y, r] of bl) { ctx.moveTo(x * s + r * s, y * s); ctx.arc(x * s, y * s, r * s, 0, 7); }
  ctx.fillStyle = p.color || '#f4a3b5'; ctx.fill();
  for (const [x, y, r] of bl) { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, 7); ctx.stroke(); }
  ctx.fillStyle = p.color || '#f4a3b5'; ctx.beginPath(); for (const [x, y, r] of bl) { ctx.moveTo(x * s + r * s * 0.97, y * s); ctx.arc(x * s, y * s, r * s * 0.97, 0, 7); } ctx.fill();
  ctx.strokeStyle = '#c4627c'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.quadraticCurveTo(-s * 0.08, 0, 0, s * 0.22);
  ctx.moveTo(-s * 0.3, -s * 0.05); ctx.quadraticCurveTo(-s * 0.15, 0, -s * 0.08, -s * 0.06); ctx.moveTo(s * 0.3, -s * 0.05); ctx.quadraticCurveTo(s * 0.15, 0, s * 0.08, -s * 0.06); ctx.moveTo(-s * 0.28, s * 0.14); ctx.quadraticCurveTo(-s * 0.15, s * 0.08, -s * 0.06, s * 0.16); ctx.moveTo(s * 0.28, s * 0.14); ctx.quadraticCurveTo(s * 0.15, s * 0.08, s * 0.06, s * 0.16); ctx.stroke();
});
def('gear', 'engrenagem a rodar', 0.22, (ctx, s, p, lt) => {
  ST(ctx, s); const n = 10, ro = s * 0.4, ri = s * 0.31; ctx.save(); ctx.rotate(lt * (p.speed ?? 0.8)); ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a0 = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? ri : ro; const a1 = a0 + (Math.PI * 2) / (n * 4); ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); }
  ctx.closePath(); FS(ctx, p.color || '#9aa3b0'); ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, 7); FS(ctx, '#e8ebf0'); ctx.restore();
});
def('magnifier', 'lupa', 0.22, (ctx, s, p) => {
  ST(ctx, s, 0.05); ctx.beginPath(); ctx.moveTo(s * 0.14, s * 0.14); ctx.lineTo(s * 0.42, s * 0.42); ctx.lineWidth = s * 0.1; ctx.stroke();
  ST(ctx, s, 0.045); ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.08, s * 0.27, 0, 7); FS(ctx, 'rgba(150,220,255,.55)');
  ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.08, s * 0.19, Math.PI * 1.1, Math.PI * 1.45); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = s * 0.03; ctx.stroke();
});
def('question', 'ponto de interrogação grande', 0.2, (ctx, s, p, lt) => { ctx.save(); ctx.rotate(Math.sin(lt * 3) * 0.08); outlinedText(ctx, '?', 0, 0, s * 1.0, p.color || '#ffd23f'); ctx.restore(); });
def('exclaim', 'ponto de exclamação grande', 0.2, (ctx, s, p, lt) => { ctx.save(); ctx.rotate(Math.sin(lt * 9) * 0.06); outlinedText(ctx, '!', 0, 0, s * 1.0, p.color || '#ff5a5f'); ctx.restore(); });
def('arrow', 'seta (rot em graus; 0 = direita)', 0.22, (ctx, s, p, lt) => {
  const k = p.pulse === false ? 0 : Math.sin(lt * 6) * s * 0.03; ctx.translate(k, 0);
  ST(ctx, s); ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.1); ctx.lineTo(s * 0.1, -s * 0.1); ctx.lineTo(s * 0.1, -s * 0.25); ctx.lineTo(s * 0.42, 0); ctx.lineTo(s * 0.1, s * 0.25); ctx.lineTo(s * 0.1, s * 0.1); ctx.lineTo(-s * 0.4, s * 0.1); ctx.closePath(); FS(ctx, p.color || '#ff5a5f');
});
def('star', 'estrela', 0.18, (ctx, s, p, lt) => { ST(ctx, s); ctx.rotate(Math.sin(lt * 2) * 0.2); ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.18 : s * 0.42, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); FS(ctx, p.color || '#ffd23f'); });
def('heart', 'coração', 0.18, (ctx, s, p, lt) => { ST(ctx, s); const k = 1 + Math.sin(lt * 6) * 0.06; ctx.scale(k, k); ctx.beginPath(); ctx.moveTo(0, s * 0.36); ctx.bezierCurveTo(-s * 0.6, -s * 0.05, -s * 0.3, -s * 0.5, 0, -s * 0.18); ctx.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.6, -s * 0.05, 0, s * 0.36); FS(ctx, p.color || '#ff4d6d'); });
def('clock', 'relógio', 0.2, (ctx, s, p, lt) => { ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); FS(ctx, '#fff'); ctx.lineWidth = s * 0.04; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; ctx.beginPath(); ctx.moveTo(Math.sin(a) * s * 0.33, -Math.cos(a) * s * 0.33); ctx.lineTo(Math.sin(a) * s * 0.37, -Math.cos(a) * s * 0.37); ctx.stroke(); } const m = lt * (p.speed ?? 1.5); ctx.lineWidth = s * 0.045; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m) * s * 0.3, -Math.cos(m) * s * 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m / 12) * s * 0.2, -Math.cos(m / 12) * s * 0.2); ctx.stroke(); });
def('coin', 'moeda com $', 0.16, (ctx, s, p, lt) => { ST(ctx, s); const w = Math.abs(Math.cos(lt * 3)) * 0.85 + 0.15; ctx.scale(w, 1); ctx.beginPath(); ctx.arc(0, 0, s * 0.38, 0, 7); FS(ctx, '#ffd23f'); outlinedText(ctx, p.text || '$', 0, s * 0.02, s * 0.5, '#b8860b', 'transparent', FONT_DISPLAY, 'center', 0); });
def('money', 'nota de dinheiro', 0.26, (ctx, s, p) => { ST(ctx, s); roundRect(ctx, -s * 0.45, -s * 0.24, s * 0.9, s * 0.48, s * 0.04); FS(ctx, '#7bc47f'); ctx.beginPath(); ctx.arc(0, 0, s * 0.14, 0, 7); FS(ctx, '#c9f0cb'); outlinedText(ctx, '$', 0, s * 0.01, s * 0.2, '#2f7a34', 'transparent', FONT_DISPLAY, 'center', 0); });
def('rocket', 'foguetão', 0.3, (ctx, s, p, lt) => {
  ST(ctx, s); ctx.rotate(-Math.PI / 4 * (p.tilt ?? 0)); const f = 0.8 + Math.sin(lt * 30) * 0.2;
  ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.3); ctx.quadraticCurveTo(0, s * (0.3 + 0.35 * f), s * 0.1, s * 0.3); ctx.closePath(); FS(ctx, '#ff9f1c');
  ctx.beginPath(); ctx.moveTo(-s * 0.16, s * 0.1); ctx.lineTo(-s * 0.32, s * 0.32); ctx.lineTo(-s * 0.14, s * 0.26); ctx.closePath(); FS(ctx, '#e2574c');
  ctx.beginPath(); ctx.moveTo(s * 0.16, s * 0.1); ctx.lineTo(s * 0.32, s * 0.32); ctx.lineTo(s * 0.14, s * 0.26); ctx.closePath(); FS(ctx, '#e2574c');
  ctx.beginPath(); ctx.moveTo(0, -s * 0.46); ctx.quadraticCurveTo(s * 0.26, -s * 0.2, s * 0.16, s * 0.3); ctx.lineTo(-s * 0.16, s * 0.3); ctx.quadraticCurveTo(-s * 0.26, -s * 0.2, 0, -s * 0.46); FS(ctx, '#f4f6fa');
  ctx.beginPath(); ctx.arc(0, -s * 0.12, s * 0.09, 0, 7); FS(ctx, '#7ac7ff');
});
def('globe', 'globo terrestre', 0.26, (ctx, s, p, lt) => { ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); FS(ctx, '#4aa3df'); ctx.save(); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); ctx.clip(); ctx.fillStyle = '#5fbf6a'; const o = (lt * 0.25) % 1; for (let k = -1; k <= 1; k++) { const ox = (o + k) * s * 1.3; ctx.beginPath(); ctx.ellipse(ox - s * 0.1, -s * 0.1, s * 0.2, s * 0.14, 0.3, 0, 7); ctx.ellipse(ox + s * 0.3, s * 0.15, s * 0.14, s * 0.18, -0.4, 0, 7); ctx.fill(); } ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); ctx.stroke(); });
def('flask', 'frasco de laboratório', 0.24, (ctx, s, p, lt) => { ST(ctx, s); ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.38); ctx.lineTo(-s * 0.1, -s * 0.12); ctx.lineTo(-s * 0.36, s * 0.3); ctx.quadraticCurveTo(-s * 0.4, s * 0.38, -s * 0.3, s * 0.38); ctx.lineTo(s * 0.3, s * 0.38); ctx.quadraticCurveTo(s * 0.4, s * 0.38, s * 0.36, s * 0.3); ctx.lineTo(s * 0.1, -s * 0.12); ctx.lineTo(s * 0.1, -s * 0.38); ctx.closePath(); FS(ctx, 'rgba(255,255,255,.7)'); ctx.save(); ctx.clip(); ctx.fillStyle = p.color || '#a66bff'; ctx.fillRect(-s * 0.5, s * 0.08, s, s * 0.5); ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) { const y = s * 0.25 - ((lt * 0.4 + i * 0.33) % 1) * s * 0.5; ctx.beginPath(); ctx.arc(Math.sin(lt * 2 + i) * s * 0.1 + (i - 1) * s * 0.1, y, s * 0.03 + i * s * 0.005, 0, 7); ctx.fill(); } });
def('atom', 'átomo com electrões', 0.3, (ctx, s, p, lt) => { ST(ctx, s, 0.02); for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 3); ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.16, 0, 0, 7); ctx.stroke(); const a = lt * 3 + i * 2; ctx.fillStyle = '#4a90e2'; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.16, s * 0.045, 0, 7); ctx.fill(); ctx.restore(); } ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.09, 0, 7); FS(ctx, '#ff5a5f'); });
def('tree', 'árvore', 0.34, (ctx, s) => { ST(ctx, s); roundRect(ctx, -s * 0.06, 0, s * 0.12, s * 0.42, s * 0.02); FS(ctx, '#8b5a2b'); blob(ctx, s, (c) => { circ(c, 0, -s * 0.18, s * 0.3); circ(c, -s * 0.22, 0, s * 0.2); circ(c, s * 0.22, 0, s * 0.2); }, '#4cb782'); });
def('house', 'casa', 0.3, (ctx, s, p) => { ST(ctx, s); roundRect(ctx, -s * 0.34, -s * 0.05, s * 0.68, s * 0.42, s * 0.02); FS(ctx, p.color || '#f2d9a0'); ctx.beginPath(); ctx.moveTo(-s * 0.44, -s * 0.03); ctx.lineTo(0, -s * 0.4); ctx.lineTo(s * 0.44, -s * 0.03); ctx.closePath(); FS(ctx, '#d9534f'); roundRect(ctx, -s * 0.07, s * 0.14, s * 0.14, s * 0.23, s * 0.02); FS(ctx, '#8b5a2b'); roundRect(ctx, s * 0.14, s * 0.04, s * 0.14, s * 0.12, s * 0.01); FS(ctx, '#bfe6ff'); });
def('phone', 'telemóvel', 0.22, (ctx, s, p, lt) => { ST(ctx, s); roundRect(ctx, -s * 0.2, -s * 0.38, s * 0.4, s * 0.76, s * 0.06); FS(ctx, '#222a35'); roundRect(ctx, -s * 0.16, -s * 0.31, s * 0.32, s * 0.6, s * 0.03); FS(ctx, p.screen || '#7ac7ff'); ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 3; i++) ctx.fillRect(-s * 0.11, -s * 0.22 + i * s * 0.13, s * 0.22 * (0.5 + 0.5 * Math.abs(Math.sin(lt + i))), s * 0.05); });
def('check', 'visto verde', 0.18, (ctx, s) => { ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); FS(ctx, '#3ecf6e'); ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.09; ctx.beginPath(); ctx.moveTo(-s * 0.2, 0); ctx.lineTo(-s * 0.05, s * 0.16); ctx.lineTo(s * 0.22, -s * 0.15); ctx.stroke(); });
def('cross', 'cruz vermelha (errado)', 0.18, (ctx, s) => { ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); FS(ctx, '#ff4d4f'); ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.09; ctx.beginPath(); ctx.moveTo(-s * 0.17, -s * 0.17); ctx.lineTo(s * 0.17, s * 0.17); ctx.moveTo(s * 0.17, -s * 0.17); ctx.lineTo(-s * 0.17, s * 0.17); ctx.stroke(); });
def('cloud', 'nuvem', 0.3, (ctx, s, p, lt) => { ctx.translate(Math.sin(lt * 0.6) * s * 0.03, 0); blob(ctx, s, (c) => { circ(c, -s * 0.2, s * 0.05, s * 0.18); circ(c, 0, -s * 0.08, s * 0.24); circ(c, s * 0.22, s * 0.04, s * 0.19); c.rect(-s * 0.2, s * 0.05, s * 0.42, s * 0.18); }, p.color || '#fff'); });
def('sun', 'sol', 0.24, (ctx, s, p, lt) => { ST(ctx, s); ctx.save(); ctx.rotate(lt * 0.5); ctx.strokeStyle = '#ffb703'; ctx.lineWidth = s * 0.06; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34); ctx.lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46); ctx.stroke(); } ctx.restore(); ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.27, 0, 7); FS(ctx, '#ffd23f'); });
def('moon', 'lua', 0.2, (ctx, s) => { ST(ctx, s); ctx.beginPath(); ctx.arc(0, 0, s * 0.36, Math.PI * 0.3, Math.PI * 1.7); ctx.arc(s * 0.14, -s * 0.04, s * 0.3, Math.PI * 1.55, Math.PI * 0.45, true); ctx.closePath(); FS(ctx, '#fff3b0'); });
def('trophy', 'troféu', 0.22, (ctx, s) => { ST(ctx, s); ctx.beginPath(); ctx.moveTo(-s * 0.24, -s * 0.32); ctx.lineTo(s * 0.24, -s * 0.32); ctx.quadraticCurveTo(s * 0.22, s * 0.1, 0, s * 0.14); ctx.quadraticCurveTo(-s * 0.22, s * 0.1, -s * 0.24, -s * 0.32); FS(ctx, '#ffd23f'); ctx.beginPath(); ctx.moveTo(-s * 0.24, -s * 0.25); ctx.quadraticCurveTo(-s * 0.42, -s * 0.2, -s * 0.2, s * 0.0); ctx.moveTo(s * 0.24, -s * 0.25); ctx.quadraticCurveTo(s * 0.42, -s * 0.2, s * 0.2, 0); ctx.stroke(); roundRect(ctx, -s * 0.05, s * 0.12, s * 0.1, s * 0.16, 0); FS(ctx, '#ffd23f'); roundRect(ctx, -s * 0.2, s * 0.26, s * 0.4, s * 0.1, s * 0.02); FS(ctx, '#8b5a2b'); });
def('key', 'chave', 0.2, (ctx, s) => { ST(ctx, s); ctx.beginPath(); ctx.arc(-s * 0.22, 0, s * 0.18, 0, 7); FS(ctx, '#ffd23f'); ctx.beginPath(); ctx.arc(-s * 0.22, 0, s * 0.07, 0, 7); ctx.stroke(); ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(-s * 0.04, 0); ctx.lineTo(s * 0.42, 0); ctx.moveTo(s * 0.28, 0); ctx.lineTo(s * 0.28, s * 0.14); ctx.moveTo(s * 0.4, 0); ctx.lineTo(s * 0.4, s * 0.12); ctx.stroke(); });
def('lock', 'cadeado', 0.2, (ctx, s, p) => { ST(ctx, s, 0.05); ctx.beginPath(); ctx.arc(0, -s * 0.08, s * 0.2, Math.PI, 0); ctx.stroke(); ST(ctx, s); roundRect(ctx, -s * 0.3, -s * 0.08, s * 0.6, s * 0.46, s * 0.06); FS(ctx, p.color || '#ffd23f'); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.05, 0, 7); ctx.fill(); });
def('wifi', 'símbolo wifi', 0.2, (ctx, s, p, lt) => { ST(ctx, s, 0.07); for (let i = 0; i < 3; i++) { ctx.globalAlpha = (Math.floor(lt * 2) % 4) > i - 1 ? 1 : 0.35; ctx.beginPath(); ctx.arc(0, s * 0.25, s * (0.16 + i * 0.16), Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); } ctx.globalAlpha = 1; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, s * 0.25, s * 0.045, 0, 7); ctx.fill(); });
def('battery', 'bateria (level 0-1)', 0.2, (ctx, s, p, lt) => { ST(ctx, s); const lv = clamp(p.level ?? 0.7, 0, 1); roundRect(ctx, -s * 0.4, -s * 0.2, s * 0.76, s * 0.4, s * 0.05); FS(ctx, '#fff'); roundRect(ctx, s * 0.36, -s * 0.08, s * 0.07, s * 0.16, s * 0.02); FS(ctx, INK); ctx.fillStyle = lv > 0.3 ? '#3ecf6e' : '#ff4d4f'; roundRect(ctx, -s * 0.35, -s * 0.15, s * 0.66 * lv, s * 0.3, s * 0.03); ctx.fill(); });
def('server', 'servidor/base de dados', 0.24, (ctx, s, p, lt) => { ST(ctx, s); for (let i = 0; i < 3; i++) { const y = -s * 0.36 + i * s * 0.25; roundRect(ctx, -s * 0.32, y, s * 0.64, s * 0.21, s * 0.04); FS(ctx, '#4a5568'); ctx.fillStyle = (Math.floor(lt * 3 + i) % 2) ? '#3ecf6e' : '#ff9f1c'; ctx.beginPath(); ctx.arc(-s * 0.22, y + s * 0.105, s * 0.03, 0, 7); ctx.fill(); ctx.fillStyle = '#2d3748'; ctx.fillRect(s * 0.02, y + s * 0.07, s * 0.24, s * 0.06); } });
def('chair', 'cadeira (usar por trás de personagem sentada)', 0.26, (ctx, s) => { ST(ctx, s); roundRect(ctx, -s * 0.34, -s * 0.4, s * 0.1, s * 0.5, s * 0.03); FS(ctx, '#8b5a2b'); roundRect(ctx, -s * 0.34, s * 0.06, s * 0.66, s * 0.1, s * 0.03); FS(ctx, '#a06a35'); ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.16); ctx.lineTo(-s * 0.3, s * 0.45); ctx.moveTo(s * 0.26, s * 0.16); ctx.lineTo(s * 0.26, s * 0.45); ctx.stroke(); });
def('table', 'mesa', 0.4, (ctx, s, p) => { ST(ctx, s); roundRect(ctx, -s * 0.5, -s * 0.06, s, s * 0.1, s * 0.03); FS(ctx, p.color || '#a06a35'); ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(-s * 0.42, s * 0.04); ctx.lineTo(-s * 0.42, s * 0.42); ctx.moveTo(s * 0.42, s * 0.04); ctx.lineTo(s * 0.42, s * 0.42); ctx.stroke(); });
def('plant', 'planta em vaso', 0.22, (ctx, s) => { ST(ctx, s); for (const [a, l] of [[-0.6, 0.34], [0, 0.42], [0.6, 0.34]]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -s * l * 0.7, s * 0.09, s * l * 0.6, 0, 0, 7); FS(ctx, '#4cb782'); ctx.restore(); } ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.0); ctx.lineTo(s * 0.2, s * 0.0); ctx.lineTo(s * 0.14, s * 0.32); ctx.lineTo(-s * 0.14, s * 0.32); ctx.closePath(); FS(ctx, '#d9784a'); });
def('pizza', 'fatia de pizza', 0.2, (ctx, s) => { ST(ctx, s); ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.3); ctx.lineTo(s * 0.3, -s * 0.3); ctx.lineTo(0, s * 0.4); ctx.closePath(); FS(ctx, '#ffcf6b'); ctx.beginPath(); ctx.rect(-s * 0.3, -s * 0.36, s * 0.6, s * 0.1); FS(ctx, '#d9a25a'); ctx.fillStyle = '#e2574c'; for (const [x, y] of [[-0.1, -0.12], [0.1, -0.15], [0, 0.05]]) { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.06, 0, 7); ctx.fill(); ctx.stroke(); } });

// --- Conteúdo educativo ---
def('text', 'texto grande (text, color, size). Ideal para títulos/palavras-chave', 0.12, (ctx, s, p, lt) => {
  const lines = String(p.text || '').split('\n'); const sz = s * 1.0;
  lines.forEach((l, i) => outlinedText(ctx, l, 0, (i - (lines.length - 1) / 2) * sz * 1.05, sz, p.color || '#ffffff', INK, FONT_DISPLAY, 'center', 0.16));
});
def('bubble', 'balão de fala (text)', 0.3, (ctx, s, p) => {
  ctx.font = `${s * 0.12}px ${FONT_UI}`; const lines = wrapLines(ctx, p.text || '', s * 0.8); const lh = s * 0.15, w = s * 0.95, h = lines.length * lh + s * 0.14;
  ST(ctx, s, 0.025); roundRect(ctx, -w / 2, -h / 2, w, h, s * 0.1); FS(ctx, '#fff');
  ctx.beginPath(); ctx.moveTo(-s * 0.15, h / 2 - 1); ctx.lineTo(-s * 0.28, h / 2 + s * 0.14); ctx.lineTo(s * 0.0, h / 2 - 1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.14, h / 2 - 3, s * 0.13, 5);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${s * 0.12}px ${FONT_UI}`; lines.forEach((l, i) => ctx.fillText(l, 0, -h / 2 + s * 0.07 + lh * (i + 0.5)));
});
def('screen', 'ecrã/monitor com texto (text) e cor', 0.34, (ctx, s, p, lt) => {
  ST(ctx, s); roundRect(ctx, -s * 0.5, -s * 0.34, s, s * 0.62, s * 0.04); FS(ctx, '#2d3440'); roundRect(ctx, -s * 0.45, -s * 0.29, s * 0.9, s * 0.52, s * 0.02); FS(ctx, p.screen || '#14202e');
  roundRect(ctx, -s * 0.06, s * 0.28, s * 0.12, s * 0.1, 0); FS(ctx, '#2d3440'); roundRect(ctx, -s * 0.22, s * 0.36, s * 0.44, s * 0.05, s * 0.02); FS(ctx, '#2d3440');
  if (p.text) { ctx.font = `bold ${s * 0.1}px ${FONT_UI}`; const lines = wrapLines(ctx, p.text, s * 0.8); ctx.fillStyle = p.textColor || '#7cf5c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, -s * 0.03 + (i - (lines.length - 1) / 2) * s * 0.13)); }
  else { ctx.strokeStyle = '#7cf5c4'; ctx.lineWidth = s * 0.03; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.36, -s * 0.18 + i * s * 0.1); ctx.lineTo(-s * 0.36 + s * (0.3 + 0.3 * Math.abs(Math.sin(lt + i))), -s * 0.18 + i * s * 0.1); ctx.stroke(); } }
});
def('board', 'quadro/cartaz com texto (text)', 0.4, (ctx, s, p) => {
  ST(ctx, s); roundRect(ctx, -s * 0.5, -s * 0.32, s, s * 0.64, s * 0.03); FS(ctx, p.color || '#2f5d50'); ctx.lineWidth = s * 0.03; ctx.strokeStyle = '#c9a36b'; roundRect(ctx, -s * 0.5, -s * 0.32, s, s * 0.64, s * 0.03); ctx.stroke();
  ctx.font = `bold ${s * 0.12}px ${FONT_UI}`; const lines = wrapLines(ctx, p.text || '', s * 0.84); ctx.fillStyle = '#f4f6fa'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * s * 0.15));
});
def('bars', 'gráfico de barras: data [números], labels [textos], colors', 0.4, (ctx, s, p, lt) => {
  const data = p.data || [3, 5, 8, 12], n = data.length, mx = Math.max(...data, 1), k = ease.out(clamp(lt / 0.9, 0, 1));
  ST(ctx, s, 0.025); roundRect(ctx, -s * 0.5, -s * 0.42, s, s * 0.84, s * 0.04); FS(ctx, '#fff');
  const bw = (s * 0.8) / n * 0.7, gap = (s * 0.8) / n;
  data.forEach((v, i) => { const h = (v / mx) * s * 0.55 * k; const x = -s * 0.4 + gap * i + (gap - bw) / 2; ctx.fillStyle = (p.colors && p.colors[i]) || ['#4a90e2', '#e2574c', '#4cb782', '#f2c038', '#a66bff'][i % 5]; ctx.lineWidth = s * 0.02; roundRect(ctx, x, s * 0.28 - h, bw, h, s * 0.02); ctx.fill(); ctx.stroke(); if (p.labels && p.labels[i]) { ctx.fillStyle = INK; ctx.font = `bold ${s * 0.07}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillText(p.labels[i], x + bw / 2, s * 0.35); } });
  if (p.text) { ctx.fillStyle = INK; ctx.font = `bold ${s * 0.08}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillText(p.text, 0, -s * 0.33); }
});
def('linechart', 'gráfico de linha: data [números]', 0.4, (ctx, s, p, lt) => {
  const data = p.data || [2, 3, 2.5, 5, 7, 9], n = data.length, mx = Math.max(...data, 1), k = ease.out(clamp(lt / 1.2, 0, 1));
  ST(ctx, s, 0.025); roundRect(ctx, -s * 0.5, -s * 0.42, s, s * 0.84, s * 0.04); FS(ctx, '#fff');
  ctx.strokeStyle = p.color || '#e2574c'; ctx.lineWidth = s * 0.04; ctx.beginPath();
  const cnt = Math.max(1, Math.floor((n - 1) * k)) + 1;
  for (let i = 0; i < Math.min(cnt, n); i++) { const x = -s * 0.38 + (i / (n - 1)) * s * 0.76, y = s * 0.28 - (data[i] / mx) * s * 0.55; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  if (p.text) { ctx.fillStyle = INK; ctx.font = `bold ${s * 0.08}px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.fillText(p.text, 0, -s * 0.33); }
});
def('pie', 'gráfico circular: data [números]', 0.3, (ctx, s, p, lt) => {
  const data = p.data || [50, 30, 20], tot = data.reduce((a, b) => a + b, 0), k = ease.out(clamp(lt / 0.9, 0, 1)); let a0 = -Math.PI / 2; ST(ctx, s, 0.03);
  data.forEach((v, i) => { const a1 = a0 + (v / tot) * Math.PI * 2 * k; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s * 0.4, a0, a1); ctx.closePath(); FS(ctx, (p.colors && p.colors[i]) || ['#4a90e2', '#e2574c', '#f2c038', '#4cb782', '#a66bff'][i % 5]); a0 = a1; });
});
def('image', 'imagem externa (src) — requer host.images', 0.3, (ctx, s, p, lt, host) => { const im = host && host.images && host.images[p.src]; if (im) { const r = im.width / im.height; ctx.drawImage(im, -s * 0.5 * r, -s * 0.5, s * r, s); } });
  def('b5_art', 'desenho vetorial do kit oficial B5 (drawing: phone|cup|hand|eyes|figure|dog|book|lapPose|pawContact)', 0.35, (ctx, s, p, lt, host) => {
  const image = host?.images?.[`b5:${p.id}`]; if (!image) return;
  const aspect = image.width / image.height;
  ctx.drawImage(image, -s * aspect / 2, -s / 2, s * aspect, s);
});

export const PROPS = P;
export const PROP_DEFAULT_SIZE = (k) => (P[k] ? P[k].size : 0.2);
