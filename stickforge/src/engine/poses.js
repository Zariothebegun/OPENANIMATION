// Clips de animação reutilizáveis. Cada clip: (t, p) => pose parcial. t em segundos desde o início do clip.
// "once": clip de disparo único com duração dur; depois volta ao idle.
import { clamp, ease, lerp } from './util.js';
import { NEUTRAL_POSE } from './rig.js';

const S = Math.sin, C = Math.cos, PI = Math.PI;
// ruído suave determinístico (para gestos a falar)
const wob = (t, f, ph = 0) => S(t * f + ph) * 0.6 + S(t * f * 1.7 + ph * 2.3) * 0.4;

export const CLIPS = {
  idle: {
    desc: 'parado, a respirar', loop: true,
    fn: (t) => ({ dy: S(t * 2.2) * 0.004, aF: [8 + S(t * 1.5) * 3, 14], aB: [-8 - S(t * 1.5) * 3, 10], head: S(t * 0.9) * 1.5 }),
  },
  talk: {
    desc: 'a falar com gestos de mãos (param energy 0-2)', loop: true,
    fn: (t, p) => {
      const e = p.energy ?? 1;
      const g = clamp(0.5 + 0.5 * wob(t, 2.1, 1), 0, 1) * e;
      const g2 = clamp(0.5 + 0.5 * wob(t, 1.7, 4), 0, 1) * e;
      return {
        dy: S(t * 3) * 0.004,
        head: wob(t, 2.6, 2) * 4 * e, lean: wob(t, 1.3) * 2,
        aF: [20 + g * 55, 25 + g2 * 50], aB: [-6 + g2 * 22, 18 + g * 30],
      };
    },
  },
  walk: {
    desc: 'a andar (usar com "to")', loop: true,
    fn: (t, p) => {
      const sp = (p.speed ?? 1) * 2 * PI * 1.1, a = S(t * sp), b = C(t * sp);
      return {
        dy: -Math.abs(a) * 0.012, lean: 4,
        lF: [a * 30, Math.max(0, -a) * 38 + 6], lB: [-a * 30, Math.max(0, a) * 38 + 6],
        aF: [-a * 32, 16], aB: [a * 32, 16], head: b * 1.5,
      };
    },
  },
  run: {
    desc: 'a correr (usar com "to")', loop: true,
    fn: (t, p) => {
      const sp = (p.speed ?? 1) * 2 * PI * 1.9, a = S(t * sp);
      return {
        dy: -Math.abs(a) * 0.04 - 0.01, lean: 16,
        lF: [a * 52, Math.max(0, -a) * 80 + 14], lB: [-a * 52, Math.max(0, a) * 80 + 14],
        aF: [-a * 60, 85], aB: [a * 60, 85],
      };
    },
  },
  jump: {
    desc: 'um salto', once: true, dur: 0.9,
    fn: (t, p) => {
      const D = p.dur ?? 0.9, u = clamp(t / D, 0, 1);
      const pre = 0.2, air = 0.6;
      if (u < pre) { const k = ease.out(u / pre); return { sq: 1 - 0.14 * k, dy: 0.02 * k, lF: [10 * k, 40 * k], lB: [-10 * k, 40 * k], aF: [-30 * k, 20], aB: [-40 * k, 20] }; }
      if (u < pre + air) { const k = (u - pre) / air, h = 4 * k * (1 - k); return { dy: -0.3 * h, sq: 1 + 0.08 * h, lF: [20, 50], lB: [-5, 60], aF: [150, 8], aB: [140, 8] }; }
      const k = (u - pre - air) / (1 - pre - air); return { sq: 1 - 0.1 * (1 - k), dy: 0.015 * (1 - k), lF: [8, 30 * (1 - k)], lB: [-8, 30 * (1 - k)] };
    },
  },
  wave: {
    desc: 'acena com a mão', loop: true,
    fn: (t) => ({ aF: [155, 10 + S(t * 12) * 28], head: 4, dy: S(t * 2) * 0.003 }),
  },
  point: {
    desc: 'aponta para a frente (para um objecto/ecrã)', loop: true,
    fn: (t, p) => ({ aF: [p.angle ?? 82, 4], lean: 3, head: 3, aB: [-10, 12], dy: S(t * 2.2) * 0.003 }),
  },
  point_up: {
    desc: 'aponta para cima (ideia, topo do ecrã)', loop: true,
    fn: (t) => ({ aF: [160, 4], lean: -2, head: -4, aB: [-8, 12], dy: S(t * 2.2) * 0.003 }),
  },
  present: {
    desc: 'apresenta com a mão aberta (mostrar algo)', loop: true,
    fn: (t) => ({ aF: [62, 18 + S(t * 2) * 6], aB: [-6, 12], lean: 2, head: 2 }),
  },
  think: {
    desc: 'mão no queixo a pensar', loop: true,
    fn: (t) => ({ aF: [22, 134 + S(t * 1.4) * 3], aB: [-6, 12], head: -6 + S(t * 1) * 2, lean: -1 }),
  },
  shrug: {
    desc: 'encolhe os ombros "não sei"', loop: true,
    fn: (t) => { const k = 0.5 + 0.5 * S(t * 3.2); return { aF: [40, 70], aB: [-14, 55], dy: -0.01 * k, head: 6 * k }; },
  },
  celebrate: {
    desc: 'braços no ar a saltar de alegria', loop: true,
    fn: (t) => { const b = Math.abs(S(t * 7)); return { dy: -0.07 * b, aF: [165 + S(t * 14) * 8, 6], aB: [150 - S(t * 14) * 8, 6], lF: [6, 14 * (1 - b)], lB: [-6, 14 * (1 - b)], head: S(t * 7) * 5 }; },
  },
  dance: {
    desc: 'a dançar', loop: true,
    fn: (t) => { const a = S(t * 6); return { dy: -Math.abs(a) * 0.03, lean: a * 7, head: a * 8, aF: [100 + a * 60, 40], aB: [100 - a * 60, 40], lF: [a * 18, 14], lB: [-a * 18, 14] }; },
  },
  sit: {
    desc: 'sentado (numa cadeira/banco/chão)', loop: true,
    fn: (t) => ({ dy: 0.2, lF: [88, 88], lB: [84, 88], aF: [30, 55], aB: [20, 50], lean: -1, head: S(t * 1) * 1.5 }),
  },
  type: {
    desc: 'sentado a escrever no portátil/computador', loop: true,
    fn: (t) => ({ dy: 0.2, lF: [88, 88], lB: [84, 88], lean: 6, aF: [58 + S(t * 14) * 4, 52], aB: [50 + S(t * 14 + 2) * 4, 55], head: 3 }),
  },
  scared: {
    desc: 'assustado a tremer', loop: true,
    fn: (t) => ({ lean: -8, dx: S(t * 40) * 0.004, aF: [80, 120], aB: [60, 130], lF: [10, 20], lB: [-6, 24], head: -6 }),
  },
  angry: {
    desc: 'zangado, punhos fechados a tremer', loop: true,
    fn: (t) => ({ lean: 8, dx: S(t * 34) * 0.004, aF: [20, 30], aB: [-14, 30], head: 4, lF: [8, 6], lB: [-8, 6] }),
  },
  laugh: {
    desc: 'dobrado a rir', loop: true,
    fn: (t) => { const a = S(t * 14); return { lean: -10 + a * 2, dy: -Math.abs(a) * 0.01, head: -8, aF: [30, 110], aB: [10, 60] }; },
  },
  cry: {
    desc: 'a chorar com as mãos na cara', loop: true,
    fn: (t) => ({ lean: 10, head: 10, aF: [30, 140], aB: [20, 140], dy: S(t * 10) * 0.004 }),
  },
  facepalm: {
    desc: 'mão na testa (facepalm)', loop: true,
    fn: (t) => ({ lean: 6, head: 10, aF: [40, 150 + S(t * 1) * 2], aB: [-6, 12] }),
  },
  hold: {
    desc: 'segura um objecto à frente (usar "holds")', loop: true,
    fn: (t) => ({ aF: [78, 14], aB: [70, 18], lean: 1, dy: S(t * 2) * 0.004 }),
  },
  spin: {
    desc: 'rodopia', loop: true,
    fn: (t) => ({ rot: (t * 360 * 1.5) % 360, dy: -0.05 }),
  },
  faint: {
    desc: 'desmaia / cai para trás', once: true, dur: 1.0, holdLast: true,
    fn: (t, p) => { const u = ease.in(clamp(t / (p.dur ?? 1), 0, 1)); return { rot: -88 * u, dy: 0.15 * u, aF: [100 * u, 10], aB: [120 * u, 10] }; },
  },
};

export function evalClip(name, t, p = {}) {
  const c = CLIPS[name] || CLIPS.idle;
  if (c.once) {
    const D = p.dur ?? c.dur ?? 1;
    if (t > D) {
      if (c.holdLast) return merge(c.fn(D, { ...p, dur: D }));
      return merge(CLIPS.idle.fn(t - D, p));
    }
  }
  return merge(c.fn(t, p));
}

const merge = (partial) => ({ ...NEUTRAL_POSE, ...partial });

// interpolação genérica entre poses (números e arrays)
export function lerpPose(a, b, k) {
  const o = {};
  for (const key of Object.keys(NEUTRAL_POSE)) {
    const va = a[key], vb = b[key];
    o[key] = Array.isArray(va) ? va.map((x, i) => lerp(x, vb[i], k)) : lerp(va, vb, k);
  }
  return o;
}
