// Transições de ENTRADA da cena (auto-contidas => cada cena renderiza e faz cache sozinha, e concatena sem recodificar).
import { ease, clamp } from './util.js';

export const TRANSITIONS = {
  cut: 'corte seco (sem efeito)',
  fade: 'fade a partir da cor (color)',
  wipe_left: 'painel de cor varre da direita para a esquerda a revelar a cena',
  wipe_right: 'painel de cor varre da esquerda para a direita',
  wipe_up: 'painel de cor sobe a revelar a cena',
  zoom: 'cena faz zoom-in rápido com flash',
  pop: 'cena salta em elástico a partir do centro',
  iris: 'círculo que abre a partir do centro (estilo cartoon)',
  slide_up: 'cena entra a deslizar de baixo',
  spin: 'cena entra a rodar e a crescer',
  flash: 'clarão branco (exposição alta) que se dissolve a revelar a cena; a cena anterior termina em clarão',
  whip: 'whip-pan: movimento rápido com motion blur horizontal que funde o fim da cena anterior no início da seguinte',
};

// Devolve { pre(ctx), post(ctx) } para aplicar à cena; null se não há transição activa.
// motion blur horizontal por acumulação (usa o próprio canvas como fonte)
function hblur(c, host, W, H, px, shift = 0) {
  if (!host || px < 1.5) return; const tmp = host._tb && host._tbk === W + 'x' + H ? host._tb : (host._tb = host.makeCanvas(W, H)); host._tbk = W + 'x' + H;
  const tg = tmp.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'copy'; tg.drawImage(c.canvas, 0, 0); tg.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'copy'; const N = 9;
  for (let i = 0; i < N; i++) { c.globalAlpha = 1 / (i + 1); c.drawImage(tmp, shift + (i / (N - 1) - 0.5) * px, 0); if (i === 0) c.globalCompositeOperation = 'source-over'; }
  c.restore();
}
// efeito de SAÍDA (últimos 0.22 s): prepara o corte/whip da cena seguinte
export function exitFx(kind, remain, W, H, host) {
  const D = 0.22; if (!kind || remain > D) return null; const k = 1 - clamp(remain / D, 0, 1), e = ease.in(k);
  if (kind === 'whip') return { post: (c) => { hblur(c, host, W, H, W * 0.3 * e, -W * 0.25 * e); c.save(); c.globalAlpha = 0.35 * e; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore(); } };
  if (kind === 'flash') return { post: (c) => { c.save(); c.globalAlpha = Math.min(1, e * 1.3); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore(); } };
  return null;
}

export function transitionFx(kind, dur, t, W, H, color = '#111', host) {
  if (!kind || kind === 'cut' || t >= dur) return null;
  const k = clamp(t / dur, 0, 1), e = ease.inOut(k);
  switch (kind) {
    case 'fade': return { post: (c) => { c.save(); c.globalAlpha = 1 - e; c.fillStyle = color; c.fillRect(0, 0, W, H); c.restore(); } };
    case 'wipe_left': return { post: (c) => { const sl = W * 0.18, xr = W * (1 - e) + sl * (1 - e);
      c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(-sl, 0); c.lineTo(xr + sl, 0); c.lineTo(xr, H); c.lineTo(-sl, H); c.closePath(); c.fill(); c.restore(); } };
    case 'wipe_right': return { post: (c) => { const sl = W * 0.18, xl = W * e - sl * (1 - e);
      c.save(); c.fillStyle = color; c.beginPath(); c.moveTo(xl, 0); c.lineTo(W + sl, 0); c.lineTo(W + sl, H); c.lineTo(xl - sl, H); c.closePath(); c.fill(); c.restore(); } };
    case 'wipe_up': return { post: (c) => { c.save(); c.fillStyle = color; c.fillRect(0, 0, W, H * (1 - e)); c.restore(); } };
    case 'zoom': return { pre: (c) => { const s = 1 + 0.35 * (1 - ease.out(k)); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); },
      post: (c) => { c.save(); c.globalAlpha = Math.max(0, 0.9 - k * 2.2); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore(); } };
    case 'pop': return { pre: (c) => { const s = 0.6 + 0.4 * ease.elastic(k); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); },
      post: (c) => { c.save(); c.globalAlpha = 1 - clamp(k * 4, 0, 1); c.fillStyle = color; c.fillRect(0, 0, W, H); c.restore(); } };
    case 'iris': return { pre: (c) => { c.beginPath(); c.arc(W / 2, H / 2, Math.hypot(W, H) * 0.5 * e + 1, 0, Math.PI * 2); c.clip(); },
      underlay: (c) => { c.fillStyle = color; c.fillRect(0, 0, W, H); } };
    case 'slide_up': return { pre: (c) => { c.translate(0, H * (1 - ease.out(k))); }, underlay: (c) => { c.fillStyle = color; c.fillRect(0, 0, W, H); } };
    case 'flash': return { pre: (c) => { const s = 1 + 0.06 * (1 - ease.out(k)); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); }, post: (c) => { c.save(); c.globalAlpha = Math.pow(1 - k, 1.6); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore(); } };
    case 'whip': { const q = 1 - ease.out(k); return { post: (c) => { hblur(c, host, W, H, W * 0.3 * q * q, W * 0.25 * q); c.save(); c.globalAlpha = 0.3 * q; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore(); } }; }
    case 'spin': return { pre: (c) => { const s = 0.3 + 0.7 * ease.out(k); c.translate(W / 2, H / 2); c.rotate((1 - ease.out(k)) * 0.8); c.scale(s, s); c.translate(-W / 2, -H / 2); },
      underlay: (c) => { c.fillStyle = color; c.fillRect(0, 0, W, H); } };
  }
  return null;
}
