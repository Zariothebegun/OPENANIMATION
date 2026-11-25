// Efeitos de ecrã: partículas (neve, brasas, pó, fumo), luz de contorno nas personagens e correcção de cor.
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function drawParticles(ctx, W, H, t, cfg) {
  if (!cfg) return; const c = typeof cfg === 'string' ? { kind: cfg } : cfg, n = c.n || 70, k = c.kind || 'snow'; ctx.save();
  for (let i = 0; i < n; i++) {
    const h1 = hash(i + 1), h2 = hash(i + 101), h3 = hash(i + 201), big = h3 > 0.9, sp = (c.speed || 1);
    if (k === 'snow') { const y = ((h2 + t * (0.05 + h1 * 0.08) * sp) % 1) * H, x = ((h1 + Math.sin(t * 0.8 + i) * 0.02) % 1) * W, r = W * (big ? 0.012 : 0.0025 + h3 * 0.003); ctx.globalAlpha = big ? 0.35 : 0.8; ctx.fillStyle = '#fff'; if (big) ctx.filter = `blur(${W * 0.004}px)`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); if (big) ctx.filter = 'none'; }
    else if (k === 'embers') { const ph = (h2 + t * (0.06 + h1 * 0.1) * sp) % 1, y = H * (1 - ph), x = (h1 + Math.sin(t * 1.3 + i * 2) * 0.03) * W, r = W * (0.002 + h3 * 0.004) * (1 - ph * 0.6); ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = h3 > 0.5 ? '#ffb347' : '#ff6a2a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    else if (k === 'dust') { const x = ((h1 + t * 0.01 * sp * (h3 - 0.3)) % 1 + 1) % 1 * W, y = ((h2 + Math.sin(t * 0.5 + i) * 0.02) % 1) * H, r = W * (0.002 + h3 * 0.003); ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 2 + i); ctx.fillStyle = c.color || '#ffe9c0'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    else if (k === 'cells') { const sp = c.speed || 1, ph = (h2 + t * 0.045 * sp * (0.6 + h1 * 0.8)) % 1, x = ph * W * 1.2 - W * 0.1, y = (h1 * 0.9 + 0.05 + Math.sin(t * 0.9 + i) * 0.015) * H, r = W * (0.016 + h3 * 0.02) * (big ? 1.8 : 1); ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6 * (h3 - 0.5) + i); ctx.scale(1, 0.75); ctx.globalAlpha = big ? 0.55 : 0.85; if (big) ctx.filter = `blur(${W * 0.006}px)`; ctx.fillStyle = h3 > 0.93 ? '#f4f0ea' : '#d8344a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(90,0,20,.4)'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.32, 0, 0, 7); ctx.fill(); ctx.restore(); }
    else if (k === 'bubbles') { const ph = (h2 + t * (0.04 + h1 * 0.05) * sp) % 1, y = H * (1 - ph), x = (h1 + Math.sin(t * 0.8 + i) * 0.02) * W, r = W * (0.008 + h3 * 0.02); ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1.5, W * 0.002); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill(); }
    else if (k === 'sparks') { const ph = (h2 + t * (0.25 + h1 * 0.3) * sp) % 1, x = ((h1 + Math.sin(t * 0.7 + i) * 0.05) % 1) * W, y = (h3 * 0.9 + 0.05) * H, r = W * (0.003 + h2 * 0.004); ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9; ctx.fillStyle = h1 > 0.5 ? '#8aeaff' : '#ff9aec'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = W * 0.015; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
    else if (k === 'smoke') { const ph = (h2 + t * 0.03 * sp) % 1, y = H * (1 - ph), x = (h1 + Math.sin(t * 0.4 + i) * 0.04) * W, r = W * (0.05 + ph * 0.12); ctx.globalAlpha = (1 - ph) * 0.12; ctx.fillStyle = c.color || '#2a2430'; ctx.filter = `blur(${W * 0.02}px)`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.filter = 'none'; }
  }
  ctx.restore();
}

// Luz de cena nas personagens: calor perto da fonte + sombra fria no lado oposto (aplicado à camada das personagens).
export function applyRim(actx, W, H, L) {
  const lx = (L.x ?? 0.85) * W, ly = (L.y ?? 0.3) * H, col = L.color || '#ffb050', k = L.k ?? 0.5;
  actx.save(); actx.globalCompositeOperation = 'source-atop';
  const g = actx.createRadialGradient(lx, ly, 0, lx, ly, W * (L.r ?? 1.0)); g.addColorStop(0, hexA(col, k)); g.addColorStop(0.6, hexA(col, k * 0.3)); g.addColorStop(1, hexA(col, 0)); actx.fillStyle = g; actx.fillRect(0, 0, W, H);
  const ox = W - lx, oy = H - ly, g2 = actx.createLinearGradient(lx, ly, ox, oy); g2.addColorStop(0, hexA(L.ambient || '#1a2450', 0)); g2.addColorStop(1, hexA(L.ambient || '#1a2450', L.shadow ?? 0.18)); actx.fillStyle = g2; actx.fillRect(0, 0, W, H);
  actx.restore();
}
export function hexA(h, a) { if (h.startsWith('rgba') || h.startsWith('rgb')) return h; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
export function applyGrade(ctx, W, H, g) { if (!g) return; ctx.save(); ctx.globalCompositeOperation = g.mode || 'soft-light'; ctx.globalAlpha = g.a ?? 0.25; ctx.fillStyle = g.c || '#ff9a4a'; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// ---- Brilho (bloom): realça zonas claras com um halo difuso. Barato: trabalha a 1/4 da resolução. ----
export function bloom(ctx, W, H, host, k = 0.32, blur = 0.02) {
  const bw = Math.max(2, Math.round(W / 4)), bh = Math.max(2, Math.round(H / 4)), key = bw + 'x' + bh;
  if (!host._bl || host._blk !== key) { host._bl = host.makeCanvas(bw, bh); host._blk = key; }
  const g = host._bl.getContext('2d');
  g.clearRect(0, 0, bw, bh); g.filter = `brightness(0.82) contrast(2.4) blur(${Math.round(bw * blur)}px)`; g.drawImage(ctx.canvas, 0, 0, bw, bh); g.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k; ctx.drawImage(host._bl, 0, 0, W, H); ctx.restore();
}

// ---- Luz de contorno (rim light): crescente colorido no lado das personagens virado para a luz (e um frio do lado oposto). ----
export function rimEdge(LY, W, H, host, L) {
  const key = W + 'x' + H; if (!host._ed || host._edk !== key) { host._ed = host.makeCanvas(W, H); host._edk = key; }
  const E = host._ed, g = E.getContext('2d');
  const lx = (L.x ?? 0.85) * W, ly = (L.y ?? 0.3) * H; let dx = lx - W / 2, dy = ly - H * 0.55; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const th = W * (L.rimW ?? 0.011), A = LY.getContext('2d');
  const pass = (sx, sy, col, a) => { g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.drawImage(LY, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(LY, -sx * th, -sy * th); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; A.save(); A.globalCompositeOperation = 'source-atop'; A.globalAlpha = a; A.drawImage(E, 0, 0); A.restore(); };
  pass(dx, dy, L.rim || L.color || '#ffb050', L.rimK ?? 0.95);
  pass(-dx, -dy, L.rim2 || L.ambient || '#4a6cff', L.rim2K ?? 0.65);
}

// ---- Luz dinâmica (candeeiros/lanternas): brilho aditivo que cintila e ilumina também as personagens. ----
export function drawLights(ctx, W, H, t, lights, camT) {
  if (!lights || !lights.length) return;
  ctx.save(); camT(ctx, 1); ctx.globalCompositeOperation = 'lighter';
  lights.forEach((l, i) => { const fl = 1 + (l.flicker ?? 0.06) * Math.sin(t * (7 + i * 1.7) + i * 2) * Math.sin(t * 3.1 + i), x = (l.x ?? 0.5) * W, y = (l.y ?? 0.4) * H, r = (l.r ?? 0.3) * W * fl; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(l.c2 || l.color || '#ffb050', (l.a ?? 0.28) * fl)); g.addColorStop(1, hexA(l.c2 || l.color || '#ffb050', 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); });
  ctx.restore();
}
