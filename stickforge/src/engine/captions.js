// Legendas estilo TikTok: 2-3 palavras de cada vez, palavra activa em destaque.
import { ease, clamp, INK, roundRect } from './util.js';
import { FONT_DISPLAY } from './props.js';

// Distribui o tempo de uma linha pelas palavras (peso ~ nº de letras + pausa em pontuação).
export function wordTimings(text, t0, t1) {
  const ws = String(text).trim().split(/\s+/).filter(Boolean);
  if (!ws.length) return [];
  const weights = ws.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2 + (/[.!?…]$/.test(w) ? 5 : /[,;:]$/.test(w) ? 2.5 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = t0; const out = [];
  ws.forEach((w, i) => { const d = ((t1 - t0) * weights[i]) / total; out.push({ w, t0: t, t1: t + d }); t += d; });
  return out;
}

export function buildChunks(words, maxWords = 3, maxChars = 20) {
  const chunks = []; let cur = [];
  const flush = () => { if (cur.length) { chunks.push({ words: cur, t0: cur[0].t0, t1: cur[cur.length - 1].t1 }); cur = []; } };
  for (const w of words) {
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    if (cur.length >= maxWords || (cur.length && chars > maxChars)) flush();
    cur.push(w);
    if (/[.!?…]$/.test(w.w)) flush();
  }
  flush();
  for (let i = 0; i < chunks.length; i++) { const nx = chunks[i + 1]; chunks[i].t1 = nx ? Math.min(nx.t0, chunks[i].t1 + 0.35) : chunks[i].t1 + 0.35; }
  return chunks;
}

export function drawCaptions(ctx, W, H, plan, t) {
  const cap = plan.captions;
  if (!cap || cap.enabled === false || !plan.chunks.length) return;
  const ch = plan.chunks.find((c) => t >= c.t0 - 0.02 && t < c.t1);
  if (!ch) return;
  const base = (cap.size || 0.082) * Math.min(W, H) * (W > H ? 1.1 : 1);
  const hi = cap.highlight || '#ffd23f', fillC = cap.color || '#ffffff';
  const FF = cap.font ? `"${cap.font}", sans-serif` : FONT_DISPLAY, gapK = cap.gap ?? 0.44;
  const words = ch.words.map((w) => (cap.upper === false ? w.w : w.w.toUpperCase()));
  ctx.save();
  ctx.font = `${base}px ${FF}`;
  let total = words.reduce((a, w) => a + ctx.measureText(w).width + base * gapK, 0);
  let size = base; const maxW = W * 0.9;
  const rows = [];
  if (total > maxW) { // 2 linhas
    const half = Math.ceil(words.length / 2); rows.push(words.slice(0, half).map((w, i) => ({ w, i }))); rows.push(words.slice(half).map((w, i) => ({ w, i: i + half })));
  } else rows.push(words.map((w, i) => ({ w, i })));
  const pop = cap.pop === false ? 1 : ease.back(clamp((t - ch.t0) / 0.14, 0, 1));
  const cy = H * (cap.y ?? 0.8);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  rows.forEach((row, ri) => {
    ctx.font = `${size}px ${FF}`;
    const gap = size * gapK; // espaço explícito: o espaço da fonte é estreito demais para o contorno
    const ww = row.map((r) => ctx.measureText(r.w).width);
    const tw = ww.reduce((a, b) => a + b, 0) + gap * (row.length - 1);
    let x = W / 2 - tw / 2; const y = cy + (ri - (rows.length - 1) / 2) * size * 1.18;
    if (cap.box) {
      const pad = size * 0.24; ctx.save(); roundRect(ctx, W / 2 - tw / 2 - pad, y - size * 0.59, tw + pad * 2, size * 1.18, size * 0.2);
      ctx.fillStyle = cap.boxColor || '#f6eddb'; ctx.fill(); ctx.lineWidth = Math.max(1.5, size * 0.035); ctx.strokeStyle = cap.boxBorder || '#29231f'; ctx.stroke();
      if (cap.boxAccent) { roundRect(ctx, W / 2 - tw / 2 - pad, y - size * 0.59, size * 0.09, size * 1.18, size * 0.05); ctx.fillStyle = cap.boxAccent; ctx.fill(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(0.88 + 0.12 * pop, 0.88 + 0.12 * pop); ctx.translate(-W / 2, -y);
    row.forEach((r, k) => {
      const w = ch.words[r.i]; const active = t >= w.t0 && t < w.t1;
      const wp = active && cap.pop !== false ? 1 + 0.05 * ease.back(clamp((t - w.t0) / 0.12, 0, 1)) : 1;
      ctx.save(); ctx.translate(x + ww[k] / 2, y); ctx.scale(wp, wp); ctx.textAlign = 'center';
      ctx.lineWidth = size * (cap.stroke ?? 0.17); ctx.strokeStyle = INK; ctx.strokeText(r.w, 0, 0);
      ctx.fillStyle = active ? hi : fillC; ctx.fillText(r.w, 0, 0); ctx.restore();
      x += ww[k] + gap;
    });
    ctx.restore();
  });
  ctx.restore();
}
