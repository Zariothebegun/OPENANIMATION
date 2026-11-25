// director.js: turns a compiled scene plan (src/engine/scene.js: timing, stage tracks, acts, faces, cam3) into per-frame render states for the
// 3D cinema renderer. Pure functions: same plan -> same frames.
import { camAt } from '../engine/cam3.js';
import { track, clamp, hashStr } from '../engine/util.js';
import { outfitOf, FACE_MAP, OPEN_MOUTH, ACT_MAP, KIT_MAP } from './bank.js';

const STEP = 1 / 48;
export function sceneLook(scene) {
  const bg = typeof scene.bg === 'object' ? scene.bg : { kit: scene.bg };
  const mapped = KIT_MAP[bg.kit || 'street'];
  if (!mapped) throw new Error(`Cinema kit "${bg.kit}" não registado. Kits disponíveis: ${Object.keys(KIT_MAP).join(', ')}`);
  const [kit, light] = mapped;
  const kitOpts = { ...(bg.opts || {}) };
  if (bg.kit === 'alley_night' && kitOpts.width === undefined) kitOpts.width = 2.5;
  // Procedural environments use a stable scene-specific seed by default. Reusing
  // the same kit in another scene now varies its dressing without losing repeatability.
  if (kitOpts.seed === undefined) kitOpts.seed = hashStr(`${scene.id || 'scene'}:${kit}`);
  return { kit, light: bg.light || light, kitOpts, sunAz: bg.sunAz, sunEl: bg.sunEl };
}

/** per-actor motion table at 48 Hz: position, speed, heading, walk phase (deterministic, cumulative) */
function motion(plan) {
  const n = Math.ceil(plan.dur / STEP) + 2;
  return plan.actors.map((a) => {
    const P = new Float32Array(n * 2), V = new Float32Array(n), PH = new Float32Array(n), HX = new Float32Array(n), HZ = new Float32Array(n);
    let ph = 0, hx = 0, hz = 1;
    for (let i = 0; i < n; i++) {
      const t = i * STEP; P[2 * i] = track(a.x0, a.xs, t); P[2 * i + 1] = track(a.z0, a.zs, t);
      if (i) { const d = Math.hypot(P[2 * i] - P[2 * i - 2], P[2 * i + 1] - P[2 * i - 1]); const sp = d / STEP; V[i] = V[i - 1] * 0.6 + sp * 0.4; ph += d / 1.6; if (d > 1e-4) { const k = 0.35; hx = hx * (1 - k) + ((P[2 * i] - P[2 * i - 2]) / d) * k; hz = hz * (1 - k) + ((P[2 * i + 1] - P[2 * i - 1]) / d) * k; } }
      PH[i] = ph % 1; HX[i] = hx; HZ[i] = hz;
    }
    return { P, V, PH, HX, HZ, n };
  });
}
const actAt = (a, t) => { let r = a.acts[0]; for (const s of a.acts) { if (s.t0 <= t) r = s; else break; } return r; };
const faceAt = (a, t) => { let r = a.faces[0]; for (const s of a.faces) { if (s.t <= t) r = s; else break; } return r.v; };

export function buildScene(plan, { fps = 24 } = {}) {
  const look = sceneLook(plan.scene), mo = motion(plan), n = Math.max(1, Math.round(plan.dur * fps));
  const outfits = plan.actors.map((a) => outfitOf(a.def, a.id));
  // sun frozen per scene relative to the mean view direction
  let sx = 0, sz = 0; for (let k = 0; k < 8; k++) { const c = camAt(plan, (plan.dur * (k + 0.5)) / 8), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], l = Math.hypot(x, z) || 1; sx += x / l; sz += z / l; }
  const sunFwd = [sx, sz];
  const speaking = (a, t) => plan.lines.some((l) => l.who === a.id && t >= l.t0 - 0.02 && t <= l.t1 + 0.05);
  const swaps = plan.actors.map((a) => a.faces.slice(1).map((f) => Math.round(f.t * 30)));
  function state(i) {
    const t = Math.min(plan.dur, i / fps), ti = t / STEP, k0 = Math.min(mo[0]?.n - 2 || 0, Math.floor(ti)), fr = ti - k0;
    const c = camAt(plan, t);
    const pos = plan.actors.map((a, j) => { const m = mo[j]; const k = Math.min(m.n - 2, k0); return [m.P[2 * k] + (m.P[2 * k + 2] - m.P[2 * k]) * fr, m.P[2 * k + 1] + (m.P[2 * k + 3] - m.P[2 * k + 1]) * fr]; });
    const chars = plan.actors.map((a, j) => {
      if (t < a.at || t >= a.until) return null;
      const m = mo[j], k = Math.min(m.n - 1, k0), speed = m.V[k], moving = speed > 0.25; const [x, z] = pos[j];
      const y = track(a.y0 ?? 0, a.ys, t);
      let hx = m.HX[k], hz = m.HZ[k];
      if (!moving) { // face the partner, else the camera
        const tgt = a.toward ? plan.actors.findIndex((q) => q.id === a.toward) : -1;
        if (tgt >= 0) { hx = pos[tgt][0] - x; hz = pos[tgt][1] - z; } else { hx = c.pos[0] - x; hz = c.pos[2] - z; }
        const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      }
      const act = actAt(a, t), name = ACT_MAP[act.name] || 'idle';
      const base = FACE_MAP[faceAt(a, t)] || 'neutral';
      const talk = speaking(a, t); const flap = talk && Math.floor((t * 7 + (hashStr(a.id) % 5)) ) % 2 === 0;
      const expr = flap ? (OPEN_MOUTH[base] || 'smile') : base;
      const seed = (hashStr(a.id) % 7) + 1;
      return { id: a.id, outfit: outfits[j], seed, x, y, z, hx, hz, walk: moving ? speed : 0, phase: m.PH[k], expr, look: 0, lid: 0, gest: moving ? 'idle' : name, gt: t - act.t0, scale: a.scale ?? 1, _swaps: swaps[j] };
    }).filter(Boolean);
    // depth of field: shallow on close shots, none on wides (reference: ~1/3 of screen time)
    const fd = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
    const dofOn = plan.scene.dof !== undefined ? plan.scene.dof : 1;
    const cInf = dofOn ? clamp((9 - fd) / 5.5, 0, 1) * 15 * (typeof dofOn === 'number' ? dofOn : 1) : 0;
    return { ...look, light: look.light, cam: { pos: c.pos, look: c.look, fov: c.fov, roll: c.roll || 0 }, dof: { focus: c.look, cInf }, chars, sunFwd, frame: i, fps };
  }
  return { n, fps, look, state, plan };
}
