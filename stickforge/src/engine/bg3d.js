// Fundo {kind:'set3d'}: placas pré-renderizadas em three.js (src/set3d). O motor só as compõe (far/mid/front) com a câmara 2.5D.
import { BACKGROUNDS } from './backgrounds.js';

// efeitos por omissão de cada kit (luz de contorno das personagens, partículas, grading, brilho, luzes difusas)
export const FX3D = {
  porch_night: { light: { x: 0.12, y: 0.4, color: '#ffb560', k: 0.6, ambient: '#20286a', shadow: 0.25 }, particles: { kind: 'snow', n: 70 }, grade: { c: '#7a58d0', a: 0.12 }, bloom: 0.45, sh: { dx: 0.5, a: 0.36 }, dof: { far: 1.2, fg: 6 } },
  plaza_night: { light: { x: 0.2, y: 0.55, color: '#ffb560', k: 0.55, ambient: '#2a2a6a', shadow: 0.25 }, particles: { kind: 'dust', n: 30, color: '#ffd9a0' }, grade: { c: '#6a58c8', a: 0.14 }, bloom: 0.4, sh: { dx: 0.5, a: 0.38 } },
  city_day: { light: { x: 0.85, y: 0.1, color: '#fff0c0', k: 0.35, ambient: '#4a5a8a', shadow: 0.14 }, particles: { kind: 'dust', n: 18, color: '#fff6d8' }, grade: { c: '#ffc070', a: 0.1 }, bloom: 0.25, sh: { dx: -0.45, a: 0.3 } },
  western: { light: { x: 0.2, y: 0.1, color: '#ffd090', k: 0.4, ambient: '#5a4a6a', shadow: 0.16 }, particles: { kind: 'dust', n: 30, color: '#f0d0a0' }, grade: { c: '#ffa850', a: 0.13 }, bloom: 0.3, sh: { dx: 0.55, a: 0.34 } },
  alley_night: { light: { x: 0.1, y: 0.5, color: '#ffc070', k: 0.55, ambient: '#1a2060', shadow: 0.25 }, particles: { kind: 'dust', n: 30 }, grade: { c: '#4a58c0', a: 0.16 }, bloom: 0.4, sh: { dx: 0.6, a: 0.4 } },
  room: { light: { x: 0.25, y: 0.3, color: '#ffd8a0', k: 0.4, ambient: '#5a3a4a', shadow: 0.16 }, particles: { kind: 'dust', n: 28, color: '#fff0d0' }, grade: { c: '#ffb060', a: 0.1 }, bloom: 0.3, sh: { dx: 0.4, a: 0.3 } },
  classroom: { light: { x: 0.5, y: 0.0, color: '#fff0d0', k: 0.3, ambient: '#4a4a6a', shadow: 0.12 }, particles: { kind: 'dust', n: 22 }, grade: { c: '#ffd890', a: 0.08 }, bloom: 0.2, sh: { dx: 0.3, a: 0.28 } },
  desert_dusk: { light: { x: 0.2, y: 0.4, color: '#ffa050', k: 0.55, ambient: '#4a2a6a', shadow: 0.2 }, particles: { kind: 'dust', n: 36, color: '#ffd0a0' }, grade: { c: '#ff8040', a: 0.15 }, bloom: 0.4, sh: { dx: 0.9, a: 0.4 } },
  forest: { light: { x: 0.8, y: 0.05, color: '#fff0b0', k: 0.35, ambient: '#2a4a5a', shadow: 0.14 }, particles: { kind: 'dust', n: 30, color: '#f8ffc0' }, grade: { c: '#a0e070', a: 0.08 }, bloom: 0.3, sh: { dx: -0.5, a: 0.3 } },
  snow_field: { light: { x: 0.2, y: 0.3, color: '#ffc0a0', k: 0.4, ambient: '#2a3a7a', shadow: 0.2 }, particles: { kind: 'snow', n: 90 }, grade: { c: '#5a7ad0', a: 0.13 }, bloom: 0.3, sh: { dx: 0.8, a: 0.3 } },
  ruins: { light: { x: 0.85, y: 0.55, color: '#ff8a3a', k: 0.55, ambient: '#2a1a2a', shadow: 0.22 }, particles: { kind: 'embers', n: 44 }, grade: { c: '#ff7a30', a: 0.14 }, bloom: 0.4, sh: { dx: -0.6, a: 0.4 } },
  space: { light: { x: 0.2, y: 0.2, color: '#9ab8ff', k: 0.4, ambient: '#0a0a30', shadow: 0.2 }, particles: { kind: 'dust', n: 20, color: '#aab8ff' }, grade: { c: '#3a4aa0', a: 0.1 }, bloom: 0.35, sh: false },
  body_tunnel: { light: { x: 0.5, y: 0.2, color: '#ff9a80', k: 0.4, ambient: '#5a1010', shadow: 0.2 }, particles: { kind: 'cells', n: 36 }, grade: { c: '#ff5a50', a: 0.13 }, bloom: 0.35, sh: false },
  organ_cave: { light: { x: 0.5, y: 0.2, color: '#ffc0d0', k: 0.4, ambient: '#6a1a30', shadow: 0.18 }, particles: { kind: 'bubbles', n: 26 }, grade: { c: '#ff7aa0', a: 0.12 }, bloom: 0.35, sh: false },
  clinic: { light: { x: 0.5, y: 0.0, color: '#e8fcff', k: 0.3, ambient: '#4a6a7a', shadow: 0.12 }, particles: { kind: 'dust', n: 20 }, grade: { c: '#a0e0f0', a: 0.08 }, bloom: 0.2, sh: { dx: 0.3, a: 0.26 } },
  ocean: { light: { x: 0.8, y: 0.1, color: '#fff0c0', k: 0.35, ambient: '#3a5a8a', shadow: 0.14 }, particles: { kind: 'dust', n: 16 }, grade: { c: '#60b0f0', a: 0.08 }, bloom: 0.25, sh: { dx: -0.4, a: 0.3 } },
  tech_hall: { light: { x: 0.5, y: 0.1, color: '#4ad8ff', k: 0.45, ambient: '#0a1030', shadow: 0.2 }, particles: { kind: 'dust', n: 24, color: '#9aeaff' }, grade: { c: '#3a70ff', a: 0.12 }, bloom: 0.45, sh: { dx: 0.3, a: 0.4 } },
};

// limites onde a câmara se pode mover em cada kit (para não atravessar paredes)
export const KIT_BOUNDS = {
  porch_night: { x: [-2.8, 2.8], y: [0.7, 2.8], z: [-6, 6.5] },
  room: { x: [-3.7, 3.7], y: [0.6, 3.0], z: [-8, 6.5] }, classroom: { x: [-4.5, 4.5], y: [0.6, 3.0], z: [-9, 6.5] }, clinic: { x: [-3.7, 3.7], y: [0.6, 3.0], z: [-8, 6.5] },
  plaza_night: { x: [-6, 6], y: [0.5, 9], z: [-30, 7] }, city_day: { x: [-6, 6], y: [0.5, 9], z: [-30, 7] }, western: { x: [-5.4, 5.4], y: [0.5, 9], z: [-30, 7] }, ruins: { x: [-6, 6], y: [0.5, 9], z: [-30, 7] }, alley_night: { x: [-3.2, 3.2], y: [0.5, 9], z: [-30, 7] },
  body_tunnel: { x: [-3.2, 3.2], y: [-0.5, 3.4], z: [-30, 7] }, organ_cave: { x: [-3.6, 3.6], y: [-0.5, 3.6], z: [-30, 7] },
};
export const set3dKey = (bg, W, H) => JSON.stringify(bg) + '|' + W + 'x' + H;
BACKGROUNDS.set3d = {
  desc: 'cenário 3D (three.js) pintado com tinta e sombras: {kind:"set3d", kit:"plaza_night|city_day|western|alley_night|room|classroom|desert_dusk|forest|snow_field|ruins|space|body_tunnel|organ_cave|clinic|ocean|tech_hall", params?, cam?:{pos,look,fov}, objects?:[...], fx?:{...}}',
  layered: true, set3d: true,
  build(host, W, H, o) {
    const pl = host.set3d?.[set3dKey(o, W, H)];
    const fxd = { ...(FX3D[o.kit] || {}), ...(o.fx || {}) }, dof = fxd.dof || { far: 1.0, fg: 5 };
    const mk = (img, bl = 0) => { const c = host.makeCanvas(W, H); if (img) { const g = c.getContext('2d'); const pad = bl * 3; if (bl) g.filter = `blur(${bl * W / 540}px)`; g.drawImage(img, -pad, -pad, W + 2 * pad, H + 2 * pad); } return c; };
    if (!pl) { const c = host.makeCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, W, H); return { layered: true, far: c, mid: host.makeCanvas(W, H), fg: null, ground: 0.8 }; }
    const fx = { ...(FX3D[o.kit] || {}), ...(o.fx || {}) };
    return { layered: true, far: mk(pl.far, dof.far), mid: mk(pl.mid, 0), fg: pl.front ? mk(pl.front, dof.fg) : null, fgK: 1.12, midK: 1, farK: 0.7, ground: pl.meta.ground - 0.09, pxPerM: pl.meta.pxPerM * (o.actorK ?? 1.35), set3d: true, light: fx.light, particles: fx.particles, grade: fx.grade, lights: fx.lights, bloom: fx.bloom, shadow: fx.sh === undefined ? { dx: 0.5, a: 0.35 } : fx.sh };
  },
  fn: () => 0.8,
};

// fundo animado (câmara 3D por frame): placas já renderizadas em sequência; devolve só os efeitos do kit
export function seqBg(host, seq, bg, W, H) {
  host._seqBg = host._seqBg || new Map(); const key = JSON.stringify(bg) + W + H; let e = host._seqBg.get(key);
  if (!e) { const fx = { ...(FX3D[bg.kind === 'set3d' ? bg.kit : ''] || {}), ...(bg.fx || {}) }; e = { seq: true, ground: 0.8, light: fx.light, particles: fx.particles, grade: fx.grade, lights: fx.lights, bloom: fx.bloom, shadow: fx.sh === undefined ? { dx: 0.5, a: 0.35 } : fx.sh }; host._seqBg.set(key, e); }
  return e;
}
