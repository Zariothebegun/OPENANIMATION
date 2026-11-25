// Câmara 3D: keyframes (orbit / dolly / crane / explícitas) com easing suave. Puro e isomórfico (Node + browser).
// DSL (scene.cam3): array de keys OU atalho {focus, orbit:{az:[a,b], r:[a,b], el:[a,b], h:[a,b], fov:[a,b]}, ease, shake}
//   key: {t, ease?, orbit:{focus:'id'|['id1','id2']|'*'|[x,y,z], r, az, el, h, fov, dx?}}  ou  {t, pos:[x,y,z], look:[x,y,z], fov}
//   az=0 => câmara em frente (eixo +z olhando para -z); az>0 roda para a direita. r em metros; h = altura do alvo; el em graus.
import { ease, clamp, lerp, track } from './util.js';

export function stagePos(plan, id, t) {
  const a = plan.actors.find((q) => q.id === id); if (!a) return null;
  return [track(a.x0, a.xs, t), 0, track(a.z0 || 0, a.zs || [], t)];
}
function focusPoint(plan, f, t) {
  if (Array.isArray(f) && typeof f[0] === 'number') return f;
  const ids = f === '*' || f === undefined ? plan.actors.map((a) => a.id) : Array.isArray(f) ? f : [f];
  const pts = ids.map((i) => stagePos(plan, i, t)).filter(Boolean); if (!pts.length) return [0, 0, 0];
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, 0, pts.reduce((s, p) => s + p[2], 0) / pts.length];
}
const O = (o) => ({ r: 5, az: 0, el: 6, h: 1.4, fov: 46, dx: 0, ...o });
function evalOrbit(plan, f, o, t) {
  const F = focusPoint(plan, f, t), az = o.az * Math.PI / 180, el = o.el * Math.PI / 180;
  const look = [F[0] + o.dx, o.h, F[2]];
  return { pos: [look[0] + o.r * Math.sin(az) * Math.cos(el), look[1] + o.r * Math.sin(el), look[2] + o.r * Math.cos(az) * Math.cos(el)], look, fov: o.fov };
}
const pair = (v, i) => (Array.isArray(v) ? v[i] : v);
export function normalizeCam3(c, dur) {
  if (!c) return null;
  if (Array.isArray(c)) return { keys: c.map((k) => ({ ...k, t: typeof k.t === 'string' && k.t.endsWith('%') ? (parseFloat(k.t) / 100) * dur : k.t === 'end' ? dur : k.t ?? 0 })).sort((a, b) => a.t - b.t), shake: 0 };
  const keys = [];
  if (c.orbit || c.focus !== undefined) {
    const f = c.focus === undefined ? '*' : c.focus, o = c.orbit || {};
    for (const i of [0, 1]) keys.push({ t: i ? dur : 0, ease: c.ease, orbit: { focus: f, ...Object.fromEntries(['r', 'az', 'el', 'h', 'fov', 'dx'].filter((k) => o[k] !== undefined).map((k) => [k, pair(o[k], i)])) } });
  } else if (c.pos || c.look) {
    for (const i of [0, 1]) keys.push({ t: i ? dur : 0, ease: c.ease, pos: pair2(c.pos, i), look: pair2(c.look, i), fov: pair(c.fov ?? 46, i) });
  }
  return { keys, shake: c.shake ?? 0 };
}
const pair2 = (v, i) => (Array.isArray(v) && Array.isArray(v[0]) ? v[i] : v);
function evalKey(plan, k, t) {
  if (k.orbit) return evalOrbit(plan, k.orbit.focus, O(k.orbit), t);
  return { pos: k.pos, look: k.look, fov: k.fov ?? 46 };
}
export function camAt(plan, t) {
  const r = camAt0(plan, t), b = plan.cam3 && plan.cam3.bounds; if (!b) return r; const cl = (v, a) => (a ? Math.min(a[1], Math.max(a[0], v)) : v);
  return { ...r, pos: [cl(r.pos[0], b.x), Math.max(b.y ? b.y[0] : 0.4, Math.min(b.y ? b.y[1] : 40, r.pos[1])), cl(r.pos[2], b.z)] };
}
function camAt0(plan, t) {
  const c = plan.cam3; if (!c || !c.keys.length) return { pos: [0, 1.7, 6], look: [0, 1.5, 0], fov: 46 };
  const ks = c.keys; let i = 0; while (i + 1 < ks.length && t >= ks[i + 1].t) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)]; let r;
  if (a === b || t <= a.t) r = evalKey(plan, a, t);
  else {
    const k = clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1), u = (ease[b.ease || a.ease || 'smooth'] || ease.smooth)(k);
    if (a.orbit && b.orbit && JSON.stringify(a.orbit.focus) === JSON.stringify(b.orbit.focus)) { const A = O(a.orbit), B = O(b.orbit); r = evalOrbit(plan, a.orbit.focus, { r: lerp(A.r, B.r, u), az: lerp(A.az, B.az, u), el: lerp(A.el, B.el, u), h: lerp(A.h, B.h, u), fov: lerp(A.fov, B.fov, u), dx: lerp(A.dx, B.dx, u) }, t); }
    else { const A = evalKey(plan, a, t), B = evalKey(plan, b, t); r = { pos: A.pos.map((v, j) => lerp(v, B.pos[j], u)), look: A.look.map((v, j) => lerp(v, B.look[j], u)), fov: lerp(A.fov, B.fov, u) }; }
  }
  if (c.shake) { const s = c.shake; r = { ...r, pos: [r.pos[0] + Math.sin(t * 7.1) * 0.03 * s, r.pos[1] + Math.sin(t * 5.3 + 1) * 0.025 * s, r.pos[2]], look: [r.look[0] + Math.sin(t * 6.1 + 2) * 0.04 * s, r.look[1] + Math.sin(t * 4.7) * 0.03 * s, r.look[2]] }; }
  return r;
}
/** pinhole -> {x,y} fracção do ecrã, z profundidade, k = píxeis por metro à profundidade z (altura H) */
export function projectCam(cam, W, H, p) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
  const f = norm(sub(cam.look, cam.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f), v = sub(p, cam.pos), z = Math.max(0.05, dot(v, f)), t = Math.tan((cam.fov * Math.PI) / 360);
  return { x: 0.5 + dot(v, r) / (z * t * (W / H)) / 2, y: 0.5 - dot(v, u) / (z * t) / 2, z, k: H / (2 * z * t) };
}
