// Cenários procedurais (vetoriais). Cada um desenha o frame completo uma vez (cache) e devolve a linha do chão (fracção de H).
import { rng, shade, roundRect, INK } from './util.js';

const B = {};
const def = (k, desc, fn) => { B[k] = { desc, fn }; };
const vgrad = (ctx, H, stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const line = (ctx, lw) => { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; };

function floorPlanks(ctx, W, H, y0, base) {
  ctx.fillStyle = base; ctx.fillRect(0, y0, W, H - y0);
  const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
  ctx.strokeStyle = shade(base, -0.22); ctx.lineWidth = Math.max(2, W * 0.003);
  let y = y0, h = (H - y0) * 0.06; let i = 0;
  while (y < H) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); const off = (i % 2) * W * 0.12; for (let x = off; x < W; x += W * 0.24) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke(); } y += h; h *= 1.18; i++; }
}
function windowFrame(ctx, x, y, w, h, sky, lw) {
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h); line(ctx, lw); ctx.strokeRect(x, y, w, h);
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + h * 0.5); ctx.lineTo(x + w * 0.3, y + h * 0.05); ctx.lineTo(x + w * 0.42, y + h * 0.05); ctx.lineTo(x + w * 0.22, y + h * 0.5); ctx.fill();
}
const cloud = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.arc(x + r * 1.1, y - r * 0.3, r * 1.2, 0, 7); ctx.arc(x + r * 2.3, y, r, 0, 7); ctx.rect(x, y, r * 2.3, r); ctx.fill(); };

def('room', 'sala/quarto acolhedor com janela e quadro', (ctx, W, H, o) => {
  const wall = o.color || '#f1dfbf', gy = H * 0.62;
  ctx.fillStyle = vgrad(ctx, gy, [[0, shade(wall, 0.12)], [1, wall]]); ctx.fillRect(0, 0, W, gy);
  floorPlanks(ctx, W, H, gy, '#b98a5a');
  ctx.fillStyle = shade(wall, -0.18); ctx.fillRect(0, gy - H * 0.025, W, H * 0.025);
  windowFrame(ctx, W * 0.08, H * 0.16, W * 0.38, H * 0.22, '#9fd8ff', W * 0.008);
  ctx.fillStyle = '#e2574c'; ctx.fillRect(W * 0.04, H * 0.14, W * 0.06, H * 0.27); ctx.fillRect(W * 0.44, H * 0.14, W * 0.06, H * 0.27);
  line(ctx, W * 0.007); roundRect(ctx, W * 0.62, H * 0.15, W * 0.28, H * 0.17, W * 0.01); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7ac7ff'; ctx.fillRect(W * 0.64, H * 0.17, W * 0.24, H * 0.13); ctx.fillStyle = '#4cb782'; ctx.beginPath(); ctx.moveTo(W * 0.64, H * 0.3); ctx.lineTo(W * 0.72, H * 0.2); ctx.lineTo(W * 0.78, H * 0.27); ctx.lineTo(W * 0.82, H * 0.22); ctx.lineTo(W * 0.88, H * 0.3); ctx.fill();
  return 0.62;
});
def('classroom', 'sala de aula com quadro verde', (ctx, W, H, o) => {
  const gy = H * 0.62; ctx.fillStyle = vgrad(ctx, gy, [[0, '#f6efd2'], [1, '#eadfb5']]); ctx.fillRect(0, 0, W, gy);
  floorPlanks(ctx, W, H, gy, '#c9a574');
  ctx.fillStyle = '#2f5d50'; line(ctx, W * 0.012); roundRect(ctx, W * 0.07, H * 0.1, W * 0.86, H * 0.28, W * 0.012); ctx.fill(); ctx.strokeStyle = '#b98a5a'; ctx.lineWidth = W * 0.014; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = W * 0.006; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(W * 0.14, H * 0.17); ctx.bezierCurveTo(W * 0.25, H * 0.12, W * 0.3, H * 0.22, W * 0.4, H * 0.16); ctx.moveTo(W * 0.14, H * 0.26); ctx.lineTo(W * 0.42, H * 0.26); ctx.moveTo(W * 0.14, H * 0.32); ctx.lineTo(W * 0.3, H * 0.32); ctx.stroke();
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(W * 0.1, H * 0.385, W * 0.8, H * 0.008);
  line(ctx, W * 0.006); ctx.beginPath(); ctx.arc(W * 0.82, H * 0.06, W * 0.045, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W * 0.82, H * 0.06); ctx.lineTo(W * 0.82, H * 0.035); ctx.moveTo(W * 0.82, H * 0.06); ctx.lineTo(W * 0.84, H * 0.065); ctx.stroke();
  return 0.62;
});
def('office', 'escritório moderno com janela para a cidade', (ctx, W, H, o) => {
  const gy = H * 0.62; ctx.fillStyle = vgrad(ctx, gy, [[0, '#e9eef5'], [1, '#d5dde8']]); ctx.fillRect(0, 0, W, gy);
  ctx.fillStyle = '#7e8da3'; ctx.fillRect(0, gy, W, H - gy); const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
  const wx = W * 0.08, wy = H * 0.1, ww = W * 0.84, wh = H * 0.3; ctx.fillStyle = vgrad(ctx, H, [[0, '#9fd8ff'], [0.2, '#e6f6ff']]); ctx.fillRect(wx, wy, ww, wh);
  const r = rng(7); ctx.fillStyle = '#9bb0c6'; let x = wx; while (x < wx + ww) { const bw = W * (0.05 + r() * 0.06), bh = wh * (0.35 + r() * 0.5); ctx.fillRect(x, wy + wh - bh, Math.min(bw, wx + ww - x), bh); x += bw + W * 0.005; }
  line(ctx, W * 0.008); ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(wx + (ww * i) / 4, wy); ctx.lineTo(wx + (ww * i) / 4, wy + wh); } ctx.stroke();
  ctx.fillStyle = '#4cb782'; ctx.beginPath(); ctx.arc(W * 0.9, gy - H * 0.03, W * 0.05, 0, 7); ctx.fill(); ctx.fillStyle = '#d9784a'; ctx.fillRect(W * 0.87, gy - H * 0.02, W * 0.06, H * 0.04);
  return 0.62;
});
def('lab', 'laboratório com bancada e frascos', (ctx, W, H, o) => {
  const gy = H * 0.62; ctx.fillStyle = '#eaf4f4'; ctx.fillRect(0, 0, W, gy); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += W / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, gy); ctx.stroke(); } for (let y = 0; y < gy; y += W / 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#c9d6dc'; ctx.fillRect(0, gy, W, H - gy); const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
  line(ctx, W * 0.006); ctx.fillStyle = '#7d8a96'; ctx.fillRect(0, gy - H * 0.14, W, H * 0.04); ctx.strokeRect(0, gy - H * 0.14, W, H * 0.04);
  ctx.fillStyle = '#9db0bd'; ctx.fillRect(0, gy - H * 0.1, W, H * 0.1);
  const cols = ['#a66bff', '#4cd6a5', '#ff7a7a', '#ffd23f', '#4a90e2']; for (let i = 0; i < 5; i++) { const x = W * (0.1 + i * 0.19), y = gy - H * 0.14; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(x - W * 0.012, y - H * 0.08); ctx.lineTo(x - W * 0.012, y - H * 0.05); ctx.lineTo(x - W * 0.04, y); ctx.lineTo(x + W * 0.04, y); ctx.lineTo(x + W * 0.012, y - H * 0.05); ctx.lineTo(x + W * 0.012, y - H * 0.08); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(x - W * 0.028, y - H * 0.015); ctx.lineTo(x - W * 0.04, y); ctx.lineTo(x + W * 0.04, y); ctx.lineTo(x + W * 0.028, y - H * 0.015); ctx.fill(); }
  ctx.fillStyle = '#eef3f6'; ctx.fillRect(W * 0.12, H * 0.08, W * 0.76, H * 0.012); ctx.fillRect(W * 0.12, H * 0.2, W * 0.76, H * 0.012);
  return 0.62;
});
def('outdoor', 'exterior: céu, colinas, relva e árvore', (ctx, W, H, o) => {
  const gy = H * 0.64; ctx.fillStyle = vgrad(ctx, gy, [[0, '#6fc3ff'], [1, '#d6f0ff']]); ctx.fillRect(0, 0, W, gy);
  ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.12, W * 0.07, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)'; cloud(ctx, W * 0.1, H * 0.1, W * 0.04); cloud(ctx, W * 0.5, H * 0.18, W * 0.05); cloud(ctx, W * 0.7, H * 0.06, W * 0.03);
  ctx.fillStyle = '#7fcf85'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.bezierCurveTo(W * 0.2, gy - H * 0.14, W * 0.4, gy - H * 0.02, W * 0.6, gy - H * 0.1); ctx.bezierCurveTo(W * 0.8, gy - H * 0.18, W * 0.9, gy - H * 0.04, W, gy - H * 0.08); ctx.lineTo(W, gy + 4); ctx.lineTo(0, gy + 4); ctx.fill();
  ctx.fillStyle = vgrad(ctx, H, [[0.64, '#5fbf6a'], [1, '#3a9a54']]); ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = '#8b5a2b'; line(ctx, W * 0.006); ctx.fillRect(W * 0.8, gy - H * 0.12, W * 0.04, H * 0.14); ctx.fillStyle = '#3f9f5a'; ctx.beginPath(); ctx.arc(W * 0.82, gy - H * 0.17, W * 0.12, 0, 7); ctx.arc(W * 0.74, gy - H * 0.11, W * 0.08, 0, 7); ctx.arc(W * 0.9, gy - H * 0.11, W * 0.08, 0, 7); ctx.fill();
  return 0.66;
});
def('city', 'cidade ao fim da tarde', (ctx, W, H, o) => {
  const gy = H * 0.66; ctx.fillStyle = vgrad(ctx, gy, [[0, '#ff9a8b'], [0.5, '#ffc7a0'], [1, '#ffe9c7']]); ctx.fillRect(0, 0, W, gy);
  const r = rng(11); for (const [lay, col] of [[0, '#b69bb8'], [1, '#7b6a8f'], [2, '#4b3f63']]) { ctx.fillStyle = col; let x = -W * 0.02; while (x < W) { const bw = W * (0.06 + r() * 0.08), bh = H * (0.12 + r() * 0.2 + (2 - lay) * 0.04); ctx.fillRect(x, gy - bh, bw, bh + 2); if (lay === 2) { ctx.fillStyle = 'rgba(255,230,150,.8)'; for (let wy = gy - bh + H * 0.015; wy < gy - H * 0.02; wy += H * 0.028) for (let wx = x + bw * 0.12; wx < x + bw * 0.85; wx += bw * 0.28) if (r() > 0.4) ctx.fillRect(wx, wy, bw * 0.14, H * 0.014); ctx.fillStyle = col; } x += bw; } }
  ctx.fillStyle = '#5b5f6b'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#9aa0ac'; ctx.fillRect(0, gy, W, H * 0.03); ctx.fillStyle = '#ffd23f'; for (let x = 0; x < W; x += W * 0.16) ctx.fillRect(x, H * 0.82, W * 0.09, H * 0.008);
  return 0.7;
});
def('space', 'espaço com estrelas e planeta', (ctx, W, H, o) => {
  ctx.fillStyle = vgrad(ctx, H, [[0, '#0b0f2e'], [0.6, '#2a1a5e'], [1, '#451a63']]); ctx.fillRect(0, 0, W, H);
  const r = rng(3); for (let i = 0; i < 140; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.85, 1 + r() * W * 0.003, 0, 7); ctx.fill(); }
  const px = W * 0.75, py = H * 0.2, pr = W * 0.12; ctx.fillStyle = '#ff8a5b'; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(px + pr * 0.3, py - pr * 0.2, pr * 0.9, 0, 7); ctx.arc(px, py, pr, 0, 7); ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(255,230,180,.8)'; ctx.lineWidth = W * 0.012; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.4, -0.3, 0, 7); ctx.stroke();
  ctx.fillStyle = '#9fb4ff'; ctx.beginPath(); ctx.arc(W * 0.15, H * 0.3, W * 0.04, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2a6e'; ctx.beginPath(); ctx.moveTo(0, H * 0.74); ctx.bezierCurveTo(W * 0.3, H * 0.68, W * 0.6, H * 0.8, W, H * 0.7); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  return 0.76;
});
def('night', 'noite com lua e casas', (ctx, W, H, o) => {
  const gy = H * 0.66; ctx.fillStyle = vgrad(ctx, gy, [[0, '#0d1b3d'], [1, '#2c3e7a']]); ctx.fillRect(0, 0, W, gy);
  const r = rng(5); for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; ctx.beginPath(); ctx.arc(r() * W, r() * gy * 0.8, 1 + r() * W * 0.003, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.12, W * 0.08, 0, 7); ctx.fill();
  ctx.fillStyle = '#16213f'; for (let i = 0; i < 4; i++) { const x = W * (0.04 + i * 0.26), w = W * 0.2, h = H * (0.08 + r() * 0.05); ctx.fillRect(x, gy - h, w, h + 2); ctx.beginPath(); ctx.moveTo(x - W * 0.01, gy - h); ctx.lineTo(x + w / 2, gy - h - H * 0.05); ctx.lineTo(x + w + W * 0.01, gy - h); ctx.fill(); ctx.fillStyle = '#ffd770'; ctx.fillRect(x + w * 0.2, gy - h * 0.7, w * 0.18, h * 0.3); ctx.fillStyle = '#16213f'; }
  ctx.fillStyle = '#1f6b46'; ctx.fillRect(0, gy, W, H - gy); const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,.1)'); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
  return 0.7;
});
def('beach', 'praia com mar e areia', (ctx, W, H, o) => {
  const hy = H * 0.5; ctx.fillStyle = vgrad(ctx, hy, [[0, '#6fc3ff'], [1, '#d6f0ff']]); ctx.fillRect(0, 0, W, hy); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(W * 0.2, H * 0.14, W * 0.07, 0, 7); ctx.fill();
  ctx.fillStyle = vgrad(ctx, H, [[0.5, '#2aa7d8'], [0.66, '#7fd6ee']]); ctx.fillRect(0, hy, W, H * 0.16); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = W * 0.005; for (let i = 0; i < 6; i++) { const y = hy + H * (0.02 + i * 0.025); ctx.beginPath(); for (let x = 0; x <= W; x += W / 20) ctx.lineTo(x, y + Math.sin(x / W * 20 + i) * H * 0.004); ctx.stroke(); }
  ctx.fillStyle = vgrad(ctx, H, [[0.66, '#f6dca0'], [1, '#e8c47c']]); ctx.fillRect(0, H * 0.66, W, H * 0.34);
  return 0.72;
});
def('kitchen', 'cozinha', (ctx, W, H, o) => {
  const gy = H * 0.62; ctx.fillStyle = '#fff4e0'; ctx.fillRect(0, 0, W, gy); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 3; for (let x = 0; x < W; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, H * 0.3); ctx.lineTo(x, gy); ctx.stroke(); } for (let y = H * 0.3; y < gy; y += W / 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#d9784a'; line(ctx, W * 0.006); for (let i = 0; i < 3; i++) { roundRect(ctx, W * (0.04 + i * 0.32), H * 0.06, W * 0.28, H * 0.16, W * 0.01); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f4d35e'; ctx.fillRect(W * (0.17 + i * 0.32), H * 0.2, W * 0.02, H * 0.015); ctx.fillStyle = '#d9784a'; }
  ctx.fillStyle = '#9aa7b3'; ctx.fillRect(0, gy - H * 0.1, W, H * 0.04); ctx.fillStyle = '#6b7a8a'; ctx.fillRect(0, gy - H * 0.06, W, H * 0.06);
  ctx.fillStyle = '#e8d9bd'; ctx.fillRect(0, gy, W, H - gy); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 3; for (let x = 0; x < W; x += W / 6) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - W * 0.1, H); ctx.stroke(); }
  return 0.62;
});
def('stage', 'palco com cortinas e foco de luz', (ctx, W, H, o) => {
  const gy = H * 0.64; ctx.fillStyle = vgrad(ctx, H, [[0, '#1c1033'], [1, '#3b1d5a']]); ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, gy, W * 0.05, W * 0.5, gy * 0.6, W * 0.9); g.addColorStop(0, 'rgba(255,240,200,.55)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  floorPlanks(ctx, W, H, gy, '#8a5a3a'); ctx.fillStyle = '#b3243a'; for (const s of [0, 1]) { ctx.beginPath(); const x0 = s ? W : 0, d = s ? -1 : 1; ctx.moveTo(x0, 0); ctx.lineTo(x0 + d * W * 0.22, 0); ctx.bezierCurveTo(x0 + d * W * 0.12, gy * 0.4, x0 + d * W * 0.2, gy * 0.8, x0 + d * W * 0.08, gy); ctx.lineTo(x0, gy); ctx.fill(); }
  return 0.66;
});
def('studio', 'fundo liso de estúdio (color) com vinheta', (ctx, W, H, o) => {
  const c = o.color || '#fdf0d5', gy = H * 0.66; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.1, W * 0.5, H * 0.5, W * 0.95); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = shade(c, -0.1); ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, gy, W, H * 0.008);
  return 0.7;
});
function caveSet(ctx, W, H, camp = false) {
  const gy = H * 0.72, r = rng(camp ? 318 : 303);
  ctx.fillStyle = vgrad(ctx, H, [[0, '#4b3021'], [0.48, '#855536'], [1, '#3d281e']]); ctx.fillRect(0, 0, W, H);
  // The cave mouth is a hand-built vector arch; the set is cached once per scene.
  ctx.beginPath(); ctx.moveTo(W * 0.08, gy); ctx.bezierCurveTo(W * 0.12, H * 0.3, W * 0.22, H * 0.08, W * 0.5, H * 0.12); ctx.bezierCurveTo(W * 0.79, H * 0.1, W * 0.91, H * 0.34, W * 0.94, gy); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, gy, [[0, '#f3b65e'], [0.48, '#d98b45'], [1, '#62735d']]); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.2, 0); ctx.quadraticCurveTo(W * 0.34, H * 0.16, W * 0.39, H * 0.42); ctx.quadraticCurveTo(W * 0.46, H * 0.61, W * 0.38, gy); ctx.lineTo(W * 0.06, gy); ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#a66f43'; ctx.fillRect(0, 0, W * 0.42, gy); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.83, 0); ctx.quadraticCurveTo(W * 0.68, H * 0.17, W * 0.65, H * 0.42); ctx.quadraticCurveTo(W * 0.57, H * 0.6, W * 0.64, gy); ctx.lineTo(W * 0.96, gy); ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#65412d'; ctx.fillRect(W * 0.62, 0, W * 0.4, gy); ctx.restore();
  ctx.fillStyle = vgrad(ctx, H, [[0.69, '#987047'], [1, '#60412b']]); ctx.fillRect(0, gy, W, H - gy);
  line(ctx, W * 0.007);
  // Uneven stone seams and hanging rock teeth form the cave silhouette.
  for (let i = 0; i < 8; i++) {
    const x = W * (0.025 + i * 0.135), top = (i % 2 ? H * 0.13 : H * 0.04), tip = top + H * (0.12 + r() * 0.11), ww = W * (0.07 + r() * 0.035);
    ctx.fillStyle = i % 2 ? '#5d3b28' : '#70472e'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + ww, 0); ctx.lineTo(x + ww * 0.56, tip); ctx.lineTo(x + ww * 0.27, top + H * 0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(45,29,20,.58)'; ctx.lineWidth = W * 0.006;
  for (let i = 0; i < 13; i++) { const x = r() * W, y = H * (0.18 + r() * 0.5); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + W * (r() - .5) * .08, y + H * .018, x + W * (r() - .5) * .13, y + H * .035); ctx.stroke(); }
  if (camp) {
    const x = W * 0.5, y = gy + H * 0.02;
    ctx.fillStyle = '#443025'; for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * W * .065, y + Math.sin(a) * H * .018, W * .025, H * .015, a, 0, Math.PI * 2); ctx.fill(); }
    const glow = ctx.createRadialGradient(x, y, 0, x, y, W * .24); glow.addColorStop(0, 'rgba(255,158,45,.58)'); glow.addColorStop(1, 'rgba(255,115,20,0)'); ctx.fillStyle = glow; ctx.fillRect(x - W * .25, y - W * .25, W * .5, W * .5);
    ctx.fillStyle = '#f5b43d'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - W * .065, y - H * .045, x - W * .008, y - H * .095); ctx.quadraticCurveTo(x + W * .006, y - H * .055, x + W * .035, y - H * .072); ctx.quadraticCurveTo(x + W * .07, y - H * .034, x, y); ctx.fill();
    ctx.fillStyle = '#e65d2f'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - W * .03, y - H * .032, x + W * .008, y - H * .06); ctx.quadraticCurveTo(x + W * .04, y - H * .025, x, y); ctx.fill();
  }
  return 0.72;
}
def('prehistoric_cave', 'caverna de pedra e barro com entrada iluminada, desenhada em vetor', (ctx, W, H) => caveSet(ctx, W, H, false));
def('prehistoric_campfire', 'acampamento pré-histórico com fogueira e luz quente, desenhado em vetor', (ctx, W, H) => caveSet(ctx, W, H, true));
def('prehistoric_outdoors', 'vale pré-histórico ao amanhecer com colinas, pedras e árvores primitivas', (ctx, W, H, o) => {
  const gy = H * .68, r = rng(o.seed || 71); ctx.fillStyle = vgrad(ctx, gy, [[0, '#f4b46c'], [1, '#f6d99d']]); ctx.fillRect(0, 0, W, gy);
  ctx.fillStyle = '#d77847'; ctx.beginPath(); ctx.arc(W * .78, H * .17, W * .075, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 7; i++) { const x = -W * .1 + i * W * .2, h = H * (.17 + r() * .15); ctx.fillStyle = i % 2 ? '#9c704b' : '#b17a4c'; ctx.beginPath(); ctx.moveTo(x - W * .17, gy); ctx.lineTo(x, gy - h); ctx.lineTo(x + W * .21, gy); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#7d693f'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#9c8048'; ctx.beginPath(); ctx.moveTo(W * .42, gy); ctx.lineTo(W * .58, gy); ctx.lineTo(W * .88, H); ctx.lineTo(W * .12, H); ctx.closePath(); ctx.fill();
  line(ctx, W * .006); for (let i = 0; i < 4; i++) { const x = W * (.12 + i * .24), y = gy - H * (.08 + (i % 2) * .04); ctx.strokeStyle = '#59402c'; ctx.lineWidth = W * .018; ctx.beginPath(); ctx.moveTo(x, y + H * .12); ctx.lineTo(x, y); ctx.moveTo(x, y + H * .035); ctx.lineTo(x - W * .04, y - H * .025); ctx.moveTo(x, y + H * .05); ctx.lineTo(x + W * .045, y - H * .02); ctx.stroke(); ctx.fillStyle = '#54613a'; ctx.beginPath(); ctx.arc(x - W * .04, y - H * .025, W * .036, 0, 7); ctx.arc(x + W * .045, y - H * .02, W * .04, 0, 7); ctx.fill(); }
  for (let i = 0; i < 18; i++) { const x = r() * W, y = gy + H * .05 + r() * H * .27; ctx.fillStyle = i % 3 ? '#c9a36a' : '#756149'; ctx.beginPath(); ctx.ellipse(x, y, W * (.009 + r() * .013), H * (.004 + r() * .006), r(), 0, 7); ctx.fill(); }
  return .68;
});
def('prehistoric_river', 'rio pré-histórico entre margens rochosas, desenhado em vetor', (ctx, W, H) => {
  const gy = H * .58; ctx.fillStyle = vgrad(ctx, gy, [[0, '#eeb36e'], [1, '#f4d69c']]); ctx.fillRect(0, 0, W, gy);
  ctx.fillStyle = '#8a6041'; ctx.beginPath(); ctx.moveTo(0, gy * .66); ctx.lineTo(W * .31, gy * .72); ctx.lineTo(W * .44, H); ctx.lineTo(0, H); ctx.fill(); ctx.beginPath(); ctx.moveTo(W, gy * .65); ctx.lineTo(W * .68, gy * .7); ctx.lineTo(W * .55, H); ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = '#4d93a0'; ctx.beginPath(); ctx.moveTo(W * .38, gy); ctx.bezierCurveTo(W * .57, H * .67, W * .29, H * .82, W * .49, H); ctx.lineTo(W * .57, H); ctx.bezierCurveTo(W * .4, H * .83, W * .71, H * .66, W * .53, gy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(244,228,181,.78)'; ctx.lineWidth = W * .009; for (let i = 0; i < 7; i++) { const y = gy + H * (.035 + i * .05); ctx.beginPath(); ctx.moveTo(W * (.4 + (i % 2) * .1), y); ctx.quadraticCurveTo(W * .5, y - H * .015, W * (.58 - (i % 2) * .1), y + H * .004); ctx.stroke(); }
  line(ctx, W * .006); for (let i = 0; i < 7; i++) { const x = W * (.04 + i * .15), y = gy + H * (.02 + (i % 3) * .07); ctx.fillStyle = i % 2 ? '#c6a36d' : '#6d5943'; ctx.beginPath(); ctx.ellipse(x, y, W * .036, H * .018, -.12, 0, 7); ctx.fill(); ctx.stroke(); }
  return .68;
});
def('warm_paper', 'papel marfim quente com fibras e margens leves, desenhado em vetor', (ctx, W, H) => {
  ctx.fillStyle = '#f4ecd9'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(W * .045, H * .035, W * .91, H * .93);
  ctx.strokeStyle = 'rgba(83,63,43,.18)'; ctx.lineWidth = Math.max(2, W * .003); ctx.strokeRect(W * .055, H * .045, W * .89, H * .91);
  ctx.fillStyle = 'rgba(172,58,49,.52)'; ctx.fillRect(W * .08, H * .08, W * .035, H * .01); ctx.fillRect(W * .08, H * .08, W * .01, H * .035);
  return .78;
});
def('explainer_board', 'quadro de papel com títulos, setas e formas de diagrama desenhados em vetor', (ctx, W, H) => {
  ctx.fillStyle = '#f4ecd9'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fffaf0'; roundRect(ctx, W * .08, H * .1, W * .84, H * .66, W * .025); ctx.fill(); line(ctx, W * .005); ctx.stroke();
  ctx.fillStyle = '#bd3732'; roundRect(ctx, W * .13, H * .16, W * .3, H * .034, W * .012); ctx.fill();
  ctx.strokeStyle = '#39322b'; ctx.lineWidth = W * .006; ctx.beginPath(); ctx.arc(W * .34, H * .44, W * .082, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W * .44, H * .44); ctx.lineTo(W * .59, H * .44); ctx.lineTo(W * .55, H * .41); ctx.moveTo(W * .59, H * .44); ctx.lineTo(W * .55, H * .47); ctx.stroke();
  ctx.fillStyle = '#d9c7a7'; roundRect(ctx, W * .63, H * .34, W * .19, H * .2, W * .018); ctx.fill();
  ctx.fillStyle = '#bd3732'; ctx.beginPath(); ctx.arc(W * .34, H * .44, W * .023, 0, 7); ctx.fill();
  ctx.fillStyle = '#756752'; ctx.fillRect(W * .23, H * .68, W * .54, H * .012); ctx.fillRect(W * .31, H * .715, W * .38, H * .009);
  return .78;
});
def('grid', 'folha quadriculada (matemática/explicação)', (ctx, W, H, o) => {
  ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(70,130,200,.28)'; ctx.lineWidth = 2; const st = W / 14; for (let x = 0; x <= W; x += st) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += st) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(220,80,80,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.08, 0); ctx.lineTo(W * 0.08, H); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, H * 0.68, W, H * 0.32);
  return 0.72;
});
def('tech', 'fundo tecnológico escuro com grelha neon', (ctx, W, H, o) => {
  const gy = H * 0.62; ctx.fillStyle = vgrad(ctx, H, [[0, '#070b1f'], [0.6, '#101a45'], [1, '#0a1230']]); ctx.fillRect(0, 0, W, H);
  const r = rng(9); ctx.strokeStyle = 'rgba(80,220,255,.35)'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { let x = r() * W, y = r() * gy * 0.9; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) y += (r() - 0.3) * H * 0.12; else x += (r() - 0.5) * W * 0.3; ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = '#50dcff'; ctx.beginPath(); ctx.arc(x, y, W * 0.008, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(80,220,255,.5)'; ctx.lineWidth = 2; for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(W * 0.5 + i * W * 0.02, gy); ctx.lineTo(W * 0.5 + i * W * 0.22, H); ctx.stroke(); } for (let i = 0; i < 9; i++) { const y = gy + Math.pow(i / 8, 2) * (H - gy); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const g = ctx.createLinearGradient(0, gy - H * 0.06, 0, gy + H * 0.02); g.addColorStop(0, 'rgba(80,220,255,0)'); g.addColorStop(1, 'rgba(80,220,255,.35)'); ctx.fillStyle = g; ctx.fillRect(0, gy - H * 0.06, W, H * 0.08);
  return 0.7;
});
def('gradient', 'gradiente vertical (color, color2)', (ctx, W, H, o) => { ctx.fillStyle = vgrad(ctx, H, [[0, o.color || '#ffafbd'], [1, o.color2 || '#ffc3a0']]); ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, H * 0.68, W, H * 0.32); return 0.7; });
def('image', 'imagem externa (src) — requer host.images', (ctx, W, H, o, host) => { const im = host && host.images && host.images[o.src]; if (im) { const s = Math.max(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); } else { ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, W, H); } return o.ground ?? 0.7; });

export const BACKGROUNDS = B;
export function drawBackground(ctx, W, H, bg, host) {
  const o = typeof bg === 'string' ? { kind: bg } : bg || { kind: 'studio' };
  const d = B[o.kind] || B.studio;
  return d.fn(ctx, W, H, o, host);
}
