// Compilador de cena (DSL -> plano temporal) + desenho de frame. Puro: corre em Node (skia-canvas) e no browser.
import { clamp, ease, lerp, hashStr, INK, track } from './util.js';
import { drawCharacter } from './rig.js';
import { evalClip, lerpPose, CLIPS } from './poses.js';
import { faceDef } from './faces.js';
import { resolveCharacter } from './characters.js';
import { PROPS, PROP_DEFAULT_SIZE, outlinedText, FONT_DISPLAY } from './props.js';
import { drawBackground, BACKGROUNDS } from './backgrounds.js';
import { drawCaptions, wordTimings, buildChunks } from './captions.js';
import { transitionFx, exitFx } from './transitions.js';
import { camAt, projectCam, normalizeCam3, stagePos } from './cam3.js';
import './props2.js';
import './props3.js';
import './bg2.js';
import { seqBg, KIT_BOUNDS } from './bg3d.js';
import { drawParticles, applyRim, applyGrade, bloom, rimEdge, drawLights } from './fx.js';
import { applyStyle, styleOf, styleName, finishBackground, CAPTION_PRESETS } from './style.js';

export const ENV_HZ = 60;
export const FORMATS = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] };
const BACK_PROPS = new Set(['table', 'chair', 'tree', 'house', 'plant', 'cloud', 'sun', 'moon', 'board', 'clock']);
const LEAD = 0.3, GAP = 0.18;

export function estimateLineDur(text, speed = 1) { return Math.max(0.6, (String(text).length * 0.068 + 0.25) / speed); }

// ---------- tempo ----------
function makeTimeParser(dur, words, lines) {
  return (spec, fallback = 0) => {
    if (typeof spec === 'number') return spec;
    if (typeof spec !== 'string') return fallback;
    let m;
    if ((m = spec.match(/^w(\d+)(e)?$/))) { const w = words[Math.min(+m[1], words.length - 1)]; return w ? (m[2] ? w.t1 : w.t0) : fallback; }
    if ((m = spec.match(/^l(\d+)(e)?$/))) { const l = lines[Math.min(+m[1], lines.length - 1)]; return l ? (m[2] ? l.t1 : l.t0) : fallback; }
    if ((m = spec.match(/^(\d+(?:\.\d+)?)%$/))) return (dur * +m[1]) / 100;
    if ((m = spec.match(/^end(?:-(\d+(?:\.\d+)?))?$/))) return dur - (m[1] ? +m[1] : 0);
    const n = parseFloat(spec); return Number.isFinite(n) ? n : fallback;
  };
}

// Procura palavra por texto: "@memória" -> índice
function findWord(words, needle) { const n = needle.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); return words.findIndex((w) => w.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === n); }

function camState(cam, t, resolve) {
  let cur = { ...cam.init };
  for (const s of cam.segs) {
    if (t < s.t0) break;
    const tgt = { ...cur };
    if (s.focus) { const f = resolve(s.focus, s.part); if (f) { tgt.x = f.x; tgt.y = f.y; tgt.zoom = f.zoom; } }
    for (const k of ['zoom', 'x', 'y', 'rot']) if (s[k] !== undefined) tgt[k] = s[k];
    if (t >= s.t1) { cur = tgt; continue; }
    const k = (ease[s.ease] || ease.inOut)(clamp((t - s.t0) / (s.t1 - s.t0), 0, 1));
    return { zoom: lerp(cur.zoom, tgt.zoom, k), x: lerp(cur.x, tgt.x, k), y: lerp(cur.y, tgt.y, k), rot: lerp(cur.rot, tgt.rot, k) };
  }
  return cur;
}


/**
 * timing: { lineDurs:[s...], envs:[Float32Array|null...] }  (da TTS) — se omitido, estima.
 */
const SHOTS = {
  orbit_l: { orbit: { az: [-38, 22], r: [6.2, 4.4], el: [7, 3], h: [1.5, 1.4], fov: [46, 44] } },
  orbit_r: { orbit: { az: [34, -26], r: [4.2, 6.4], el: [3, 8], h: [1.4, 1.5], fov: [44, 47] } },
  dolly_in: { orbit: { az: [-10, 8], r: [8.2, 3.4], el: [6, 2], h: [1.5, 1.45], fov: [44, 42] } },
  dolly_out: { orbit: { az: [14, -12], r: [3.0, 6.8], el: [2, 7], h: [1.45, 1.5], fov: [42, 46] } },
  crane: { orbit: { az: [-16, 18], r: [7.5, 4.6], el: [26, 5], h: [1.2, 1.5], fov: [48, 44] } },
  low: { orbit: { az: [22, -14], r: [3.6, 5.2], el: [-4, 4], h: [1.2, 1.5], fov: [50, 46] } },
};
function withBounds(sc, c) { if (c) c.bounds = (sc.cam3 && sc.cam3.bounds) || KIT_BOUNDS[sc.bg.kit] || null; return c; }
export const SHOT_NAMES = Object.keys(SHOTS);
function defaultCam(sc, dur, lines = [], beats = []) {
  const names = SHOT_NAMES, nm = sc.shot && SHOTS[sc.shot] ? sc.shot : names[hashStr(String(sc.id || '')) % names.length];
  const shot = structuredClone(SHOTS[nm]), actors = sc.actors || [];
  // The old fixed 3–6 m orbit presets clipped two-person dialogue in portrait output.
  // Expand only the generated camera; explicit scene.cam3 keys remain fully controllable.
  if (actors.length > 1 && shot.orbit) {
    const xs = actors.map((a) => Number(a.x) || 0), spread = Math.max(...xs) - Math.min(...xs);
    const farthest = Math.max(...shot.orbit.r), desired = Math.max(9.5, spread * 2.5 + 7.5), delta = Math.max(0, desired - farthest);
    shot.orbit.r = shot.orbit.r.map((r) => r + delta);
  }
  const base = shot.orbit;
  if (sc.autoCoverage === false || dur < 3.4 || !actors.length) return { focus: sc.focus ?? '*', ...shot, ease: 'smooth', shake: sc.shake ?? 0.4 };

  // Automatic coverage gives every generated scene a small edit: establish the space,
  // cut to the active speaker/action, then add a reaction/alternate angle. It only
  // changes the camera; the same frames, geometry and renderer are reused.
  const shotCount = Math.min(4, Math.max(2, Math.ceil(dur / 3.7)));
  const minGap = Math.max(1.25, dur * 0.13);
  const events = [];
  for (const l of lines) if (l.who && actors.some((a) => a.id === l.who) && l.t0 > 0.8 && l.t0 < dur - 0.75)
    events.push({ t: l.t0, actor: l.who, kind: 'speaker', priority: 2 });
  for (const b of beats) if (b.actor && actors.some((a) => a.id === b.actor) && (b.act || b.face || b.to !== undefined) && b._t > 0.8 && b._t < dur - 0.75)
    events.push({ t: b._t, actor: b.actor, kind: 'action', priority: 3 });
  for (let i = 1; i < shotCount; i++) events.push({ t: (dur * i) / shotCount, actor: null, kind: 'alternate', priority: 1 });
  events.sort((a, b) => b.priority - a.priority || a.t - b.t);
  const chosen = [{ t: 0, actor: null, kind: 'wide' }];
  for (const e of events) {
    if (chosen.length >= shotCount) break;
    if (chosen.every((q) => Math.abs(q.t - e.t) >= minGap)) chosen.push(e);
  }
  chosen.sort((a, b) => a.t - b.t);
  const keys = [];
  for (let i = 0; i < chosen.length; i++) {
    const e = chosen[i], next = chosen[i + 1], actorIndex = e.actor ? actors.findIndex((a) => a.id === e.actor) : -1;
    const close = e.kind === 'action' || e.kind === 'speaker' || (e.kind === 'alternate' && i % 2 === 1);
    const focus = close && actorIndex >= 0 ? e.actor : (sc.focus ?? '*');
    const azBase = Array.isArray(base.az) ? base.az[0] : base.az;
    const az = close ? (actorIndex === 1 ? -28 : 28) : azBase + (i % 2 ? -8 : 8);
    const r0 = close ? (Number(actors[actorIndex]?.scale) > 1.2 ? 5.4 : 4.4) : Math.max(9.2, Array.isArray(base.r) ? base.r[0] : base.r);
    const el0 = close ? 5 : (Array.isArray(base.el) ? base.el[0] : base.el);
    const h0 = close ? 1.55 : (Array.isArray(base.h) ? base.h[0] : base.h);
    const fov0 = close ? 40 : (Array.isArray(base.fov) ? base.fov[0] : base.fov);
    const orbit = { focus, r: r0, az, el: el0, h: h0, fov: fov0 };
    keys.push({ t: e.t, orbit, ease: 'smooth', cut: i > 0 });
    // A restrained push within each shot keeps the camera alive without adding renders.
    if (next && next.t - e.t > 1.6) keys.push({ t: Math.min(e.t + 0.85, next.t - 0.28), orbit: { ...orbit, r: r0 * 0.94, az: az + (close ? 3 : -3) }, ease: 'smooth' });
  }
  keys.sort((a, b) => a.t - b.t);
  return { keys, shake: sc.shake ?? 0.22 };
}
export function compileScene(scene, meta = {}, timing = {}) {
  const sc = scene;
  const actorsIn = sc.actors && sc.actors.length ? sc.actors : [{ id: 'a', char: 'blue' }];
  const defaultWho = actorsIn[0].id;
  let linesIn = sc.lines || (sc.narration ? [{ text: sc.narration }] : []);
  linesIn = linesIn.map((l) => (typeof l === 'string' ? { text: l } : l));

  // linhas -> tempos
  const lines = []; let t = LEAD;
  linesIn.forEach((l, i) => {
    const d = (timing.lineDurs && timing.lineDurs[i]) || estimateLineDur(l.text, l.speed || meta.speed || 1);
    lines.push({ text: l.text, who: l.who === undefined ? defaultWho : l.who === 'none' ? null : l.who, t0: t, t1: t + d, voice: l.voice, speed: l.speed, env: (timing.envs && timing.envs[i]) || null });
    t += d + GAP;
  });
  const voiced = lines.length ? lines[lines.length - 1].t1 + (sc.pad ?? 0.5) : 0;
  const q = meta.quant || 1 / 30;
  const dur = Math.ceil(Math.max(sc.minDur ?? 2, sc.dur ?? 0, voiced) / q - 1e-6) * q; // múltiplo de 1/animFps => áudio e vídeo casam ao frame
  const words = lines.flatMap((l) => wordTimings(l.text, l.t0, l.t1));
  const capCfg = { ...(CAPTION_PRESETS[styleOf(meta).caps] || {}), ...(meta.captions || {}), ...(sc.captions === false ? { enabled: false } : typeof sc.captions === 'object' ? sc.captions : {}) };
  const chunks = buildChunks(words, capCfg.maxWords || 3);
  const T = makeTimeParser(dur, words, lines);
  const tspec = (s, f = 0) => { if (typeof s === 'string' && s.startsWith('@')) { const i = findWord(words, s.slice(1)); return i >= 0 ? words[i].t0 : f; } return T(s, f); };

  const STAGE = !!(sc.bg && typeof sc.bg === 'object' && sc.bg.kind === 'set3d');
  // actores
  const actors = actorsIn.map((a, i) => {
    const n = actorsIn.length;
    const dx = STAGE ? (n === 1 ? 0 : (i - (n - 1) / 2) * 1.5) : n === 1 ? 0.5 : n === 2 ? [0.3, 0.7][i] : n === 3 ? [0.2, 0.5, 0.8][i] : (i + 0.5) / n;
    return {
      id: a.id || 'a' + i, def: resolveCharacter(a), scale: a.scale ?? 1, x0: a.x ?? dx, y0: a.y, flip0: a.flip ?? (n === 2 ? i === 1 : false),
      face0: a.face || 'neutral', pose0: a.pose || 'idle', at: tspec(a.at, 0), until: a.until !== undefined ? tspec(a.until, Infinity) : Infinity,
      xs: [], ys: [], zs: [], z0: a.z ?? 0, from: a.from, toward: a.toward, flips: [], faces: [{ t: 0, v: a.face || 'neutral' }], acts: [{ t0: 0, name: a.pose || 'idle', p: {} }], z: 0, stage: STAGE,
    };
  });
  const A = Object.fromEntries(actors.map((a) => [a.id, a]));

  // props
  const props = (sc.props || []).map((p, i) => ({
    id: p.id || 'p' + i, kind: p.kind, p: { ...p, ...(p.p || {}) }, size: (p.size ?? PROP_DEFAULT_SIZE(p.kind)) * (p.scale ?? 1), x0: p.x ?? 0.5, y0: p.y ?? 0.35, rot0: p.rot ?? 0,
    at: p.hidden ? Infinity : tspec(p.at, 0), until: p.until !== undefined ? tspec(p.until, Infinity) : Infinity, fx: p.fx || (BACK_PROPS.has(p.kind) && !p.at ? 'none' : 'pop'),
    z: p.z || (BACK_PROPS.has(p.kind) ? 'back' : 'front'), motion: p.motion, attach: p.attach, xs: [], ys: [], ss: [], rs: [], sets: [],
  }));
  const P = Object.fromEntries(props.map((p) => [p.id, p]));

  // câmara: estado inicial + segmentos sequenciais; o foco (actor/parte) resolve-se ao desenhar, por isso segue o actor
  const camIn = sc.camera === false ? {} : sc.camera || {};
  const zp = Array.isArray(camIn.zoom) ? camIn.zoom : camIn.zoom !== undefined ? [camIn.zoom, camIn.zoom] : styleOf(meta).camDefault;
  const cam = { init: { zoom: zp[0], x: Array.isArray(camIn.x) ? camIn.x[0] : camIn.x ?? 0, y: Array.isArray(camIn.y) ? camIn.y[0] : camIn.y ?? 0, rot: camIn.rot ?? 0 }, segs: [] };
  const hasCamBeats = (sc.beats || []).some((b) => b.camera);
  if (camIn.focus) cam.segs.push({ t0: 0, t1: 0, focus: camIn.focus, part: camIn.part, zoom: typeof camIn.zoom === 'number' ? camIn.zoom : undefined });
  else if (!hasCamBeats) { if (zp[0] !== zp[1]) cam.segs.push({ t0: 0, t1: dur, zoom: zp[1], ease: 'inOut' }); if (Array.isArray(camIn.x)) cam.segs.push({ t0: 0, t1: dur, x: camIn.x[1], ease: 'inOut' }); if (Array.isArray(camIn.y)) cam.segs.push({ t0: 0, t1: dur, y: camIn.y[1], ease: 'inOut' }); }
  const fxs = [];

  // beats ordenados por tempo
  const beats = (sc.beats || []).map((b, i) => ({ ...b, _t: tspec(b.t, 0), _i: i })).sort((a, b) => a._t - b._t || a._i - b._i);
  for (const b of beats) {
    const bt = b._t;
    if (b.actor && A[b.actor]) {
      const a = A[b.actor];
      if (b.face) a.faces.push({ t: bt, v: b.face });
      if (b.flip !== undefined) a.flips.push({ t: bt, v: !!b.flip });
      if (b.scale !== undefined) a.scale = b.scale;
      if (b.show) a.at = bt; if (b.hide) a.until = bt;
      if (b.act || b.to !== undefined) {
        const name = b.act || 'walk';
        const p = { energy: b.energy, speed: b.speed, angle: b.angle, dur: b.once ? b.dur : undefined };
        a.acts.push({ t0: bt, name, p });
        const curX = track(a.x0, a.xs, bt), curY = a.y0 === undefined ? undefined : track(a.y0, a.ys, bt);
        if (b.to !== undefined) {
          const to = typeof b.to === 'object' ? b.to : { x: b.to };
          const md = b.dur ?? 1.2; const curZ = track(a.z0, a.zs, bt);
          if (STAGE) { if (to.z !== undefined) a.zs.push({ t0: bt, t1: bt + md, from: curZ, to: to.z, ease: b.ease || 'inOut' }); }
          if (to.x !== undefined || STAGE) { if (to.x === undefined) to.x = curX; a.xs.push({ t0: bt, t1: bt + md, from: curX, to: to.x, ease: b.ease || 'inOut' }); if (b.flip === undefined && Math.abs(to.x - curX) > 0.01) a.flips.push({ t: bt, v: to.x < curX }); a.acts[a.acts.length - 1].move = { from: curX, to: to.x ?? curX, dur: md, m: STAGE, dist: Math.hypot((to.x ?? curX) - curX, (to.z ?? curZ) - curZ) }; }
          if (to.y !== undefined) { a.ys.push({ t0: bt, t1: bt + md, from: curY ?? to.y, to: to.y, ease: b.ease || 'inOut' }); }
          a.acts.push({ t0: bt + md, name: b.then || 'idle', p: {} });
        } else if (b.dur && !CLIPS[name]?.once && b.hold !== true) a.acts.push({ t0: bt + b.dur, name: b.then || 'idle', p: {} });
      }
    }
    if (b.prop && P[b.prop]) {
      const p = P[b.prop];
      if (b.show) p.at = bt; if (b.hide) p.until = bt;
      if (b.fx) p.fx = b.fx;
      if (b.move) { const md = b.dur ?? 0.6; if (b.move.x !== undefined) p.xs.push({ t0: bt, t1: bt + md, from: track(p.x0, p.xs, bt), to: b.move.x, ease: b.ease || 'inOut' }); if (b.move.y !== undefined) p.ys.push({ t0: bt, t1: bt + md, from: track(p.y0, p.ys, bt), to: b.move.y, ease: b.ease || 'inOut' }); }
      if (b.resize !== undefined) p.ss.push({ t0: bt, t1: bt + (b.dur ?? 0.4), from: track(p.size, p.ss, bt), to: b.resize * 1, ease: 'out' });
      if (b.rotate !== undefined) p.rs.push({ t0: bt, t1: bt + (b.dur ?? 0.4), from: track(p.rot0, p.rs, bt), to: b.rotate, ease: 'out' });
      if (b.set) p.sets.push({ t: bt, v: b.set });
      if (b.attach) p.attach = b.attach;
    }
    if (b.camera) { const c = b.camera, cd = c.cut ? 0 : (c.dur ?? 0.8); cam.segs.push({ t0: bt, t1: bt + cd, zoom: c.zoom, x: c.x, y: c.y, rot: c.rot, focus: c.focus, part: c.part, ease: c.ease || 'inOut' }); }
    if (b.fx && !b.actor && !b.prop) fxs.push({ t: bt, kind: b.fx, dur: b.dur ?? 0.4, amp: b.amp ?? 0.012, color: b.color });
  }

  // entrada em palco: personagem chega de `from` até à posição inicial a andar (dá vida logo no 1.º frame)
  if (STAGE) for (const a of actors) if (a.from) {
    const en = a.enter ?? 1.1, tx = a.x0, tz = a.z0, fx0 = a.from.x ?? tx, fz0 = a.from.z ?? tz;
    a.xs.unshift({ t0: 0, t1: en, from: fx0, to: tx, ease: 'out' }); a.zs.unshift({ t0: 0, t1: en, from: fz0, to: tz, ease: 'out' });
    const fy0 = a.from.y ?? (a.y0 ?? 0), ty = a.y0 ?? 0;
    if (Math.abs(fy0 - ty) > 1e-4) a.ys.unshift({ t0: 0, t1: en, from: fy0, to: ty, ease: 'out' });
    a.flip0 = tx < fx0; a.acts[0] = { t0: 0, name: 'walk', p: {}, move: { from: fx0, to: tx, dur: en, m: true, dist: Math.hypot(tx - fx0, tz - fz0) } }; a.acts.splice(1, 0, { t0: en, name: 'idle', p: {} });
  }
  // fala: segmentos idle -> talk (auto-direcção, sem o realizador ter de pedir)
  for (const a of actors) {
    a.acts.sort((x, y) => x.t0 - y.t0);
    const speak = lines.filter((l) => l.who === a.id).map((l) => [l.t0 - 0.05, l.t1 + 0.15]);
    const out = [];
    a.acts.forEach((seg, i) => {
      const end = i + 1 < a.acts.length ? a.acts[i + 1].t0 : Infinity;
      if (seg.name !== 'idle') { out.push(seg); return; }
      const GEST = a.gestures || sc.gestures || ['talk', 'present', 'talk', 'point', 'talk', 'shrug', 'talk', 'think'], REACT = ['idle', 'think', 'idle', 'shrug', 'idle', 'present'], auto = sc.auto !== false && a.auto !== false;
      const h0 = hashStr(a.id + (sc.id || ''));
      const react = (from, to) => { if (!auto) { out.push({ t0: from, name: 'idle', p: seg.p }); return; } let tt = from, k = h0 % REACT.length; while (tt < to - 0.05) { out.push({ t0: tt, name: REACT[k % REACT.length], p: seg.p }); tt += 1.1 + ((k * 7 + h0) % 5) * 0.25; k++; } };
      let cur = seg.t0, curName = 'idle';
      const edges = [];
      for (const [s0, s1] of speak) { if (s1 > seg.t0 && s0 < end) { edges.push([Math.max(s0, seg.t0), Math.min(s1, end)]); } }
      if (!edges.length) { if (sc.auto !== false && a.auto !== false && STAGE && Math.min(end, dur) - seg.t0 > 1.2) react(seg.t0, Math.min(end, dur)); else out.push(seg); return; }
      let pos = seg.t0;
      for (const [s0, s1] of edges) {
        if (s0 > pos + 1e-3) react(pos, s0);
        if (!auto) out.push({ t0: s0, name: 'talk', p: { energy: sc.energy ?? 1 } });
        else { let tt = s0, k = (h0 >> 3) % GEST.length; while (tt < s1 - 0.05) { out.push({ t0: tt, name: GEST[k % GEST.length], p: { energy: sc.energy ?? 1 } }); tt += 1.25 + ((k * 5 + h0) % 4) * 0.25; k++; } }
        pos = s1;
      }
      if (pos < end) react(pos, Math.min(end, dur));
    });
    // mescla segmentos consecutivos iguais
    a.acts = out.filter((s, i, arr) => !(i && arr[i - 1].name === s.name && s.name !== 'walk' && s.name !== 'run' && !s.move));
  }
  for (const a of actors) { a.flips.sort((x, y) => x.t - y.t); a.faces.sort((x, y) => x.t - y.t); }

  return {
    id: sc.id, scene: sc, meta, dur, lines, words, chunks, actors, props, cam, fxs, stage: STAGE, cam3: STAGE ? withBounds(sc, normalizeCam3(typeof sc.cam3 === 'string' ? { focus: sc.focus ?? '*', ...(SHOTS[sc.cam3] || SHOTS.orbit_l), ease: 'smooth', shake: 0.4 } : sc.cam3 ?? defaultCam(sc, dur, lines, beats), dur)) : null,
    title: sc.title ? { ...sc.title, at: tspec(sc.title.at, 0.1), dur: sc.title.dur ?? 2 } : null,
    captions: capCfg,
    trans: { kind: sc.transition || meta.transition || 'cut', dur: sc.transitionDur ?? 0.45, color: sc.transitionColor || meta.transitionColor || '#14141c' },
    seed: hashStr(String(sc.id || '')),
  };
}

// ---------- desenho ----------
function getBg(host, bg, W, H, stl, sname) {
  host.bgCache = host.bgCache || new Map();
  const key = JSON.stringify(bg) + W + 'x' + H + sname;
  let e = host.bgCache.get(key);
  if (!e) {
    const o = typeof bg === 'string' ? { kind: bg } : bg || { kind: 'studio' }, d = BACKGROUNDS[o.kind];
    if (d && d.layered) e = d.build(host, W, H, o);
    else { const c = host.makeCanvas(W, H); const g = c.getContext('2d'); const ground = drawBackground(g, W, H, bg, host); finishBackground(g, W, H, stl, host); e = { canvas: c, ground }; }
    host.bgCache.set(key, e);
  }
  return e;
}

function actAt(a, t) { let cur = a.acts[0]; for (const s of a.acts) { if (s.t0 <= t) cur = s; else break; } return cur; }
function actIdx(a, t) { let i = 0; a.acts.forEach((s, k) => { if (s.t0 <= t) i = k; }); return i; }

function poseAt(a, t, W, S) {
  const i = actIdx(a, t), cur = a.acts[i];
  const params = (seg) => { const p = { ...seg.p }; if (seg.move && (seg.name === 'walk' || seg.name === 'run')) { const v = seg.move.m ? (seg.move.dist * 0.9 * S) / seg.move.dur : (Math.abs(seg.move.to - seg.move.from) * W) / seg.move.dur; const base = seg.name === 'walk' ? 1.1 * 0.62 * S : 1.9 * 0.8 * S; p.speed = p.speed ?? clamp(v / base, 0.5, 2.6); } return p; };
  const pn = evalClip(cur.name, t - cur.t0, params(cur));
  const B = 0.2;
  if (i > 0 && t - cur.t0 < B) { const prev = a.acts[i - 1]; const po = evalClip(prev.name, t - prev.t0, params(prev)); return lerpPose(po, pn, ease.out((t - cur.t0) / B)); }
  return pn;
}

const stepVal = (arr, init, t, key = 'v') => { let v = init; for (const s of arr) { if (s.t <= t) v = s[key]; else break; } return v; };

function envAt(line, t) { if (!line.env) return 0.5 + 0.5 * Math.sin(t * 22); const i = Math.floor((t - line.t0) * ENV_HZ); return line.env[clamp(i, 0, line.env.length - 1)] ?? 0; }

function appearAnim(fx, lt, until, t) {
  let sc = 1, al = 1, dx = 0, dy = 0;
  if (fx === 'pop') { sc = ease.back(clamp(lt / 0.35, 0, 1)); al = clamp(lt / 0.08, 0, 1); }
  else if (fx === 'fade') al = clamp(lt / 0.4, 0, 1);
  else if (fx === 'grow') sc = ease.out(clamp(lt / 0.5, 0, 1));
  else if (fx === 'drop') dy = -(1 - ease.bounce(clamp(lt / 0.7, 0, 1))) * 0.35;
  else if (fx === 'slide_l') dx = -(1 - ease.out(clamp(lt / 0.45, 0, 1))) * 0.6;
  else if (fx === 'slide_r') dx = (1 - ease.out(clamp(lt / 0.45, 0, 1))) * 0.6;
  if (until !== Infinity && t > until) { const k = clamp((t - until) / 0.25, 0, 1); sc *= 1 - ease.in(k); al *= 1 - k; }
  return { sc: Math.max(0.0001, sc), al, dx, dy };
}

function drawPropAt(ctx, pr, t, W, H, host, x, y, held) {
  const lt = t - pr.at; if (lt < 0 || t > pr.until + 0.3) return;
  const m = Math.min(W, H);
  const size = track(pr.size, pr.ss, t) * m;
  const an = appearAnim(pr.fx, lt, pr.until, t);
  let params = pr.p; for (const s of pr.sets) if (s.t <= t) params = { ...params, ...s.v };
  ctx.save(); ctx.globalAlpha = an.al;
  ctx.translate(x + an.dx * W, y + an.dy * H);
  let rot = track(pr.rot0, pr.rs, t) * Math.PI / 180, sc = an.sc;
  const mo = pr.motion;
  if (mo === 'float') ctx.translate(0, Math.sin(lt * 2.2) * size * 0.07);
  else if (mo === 'spin') rot += lt * 2;
  else if (mo === 'shake') ctx.translate(Math.sin(lt * 50) * size * 0.02, 0);
  else if (mo === 'pulse') sc *= 1 + Math.sin(lt * 6) * 0.06;
  else if (mo === 'wiggle') rot += Math.sin(lt * 8) * 0.12;
  if (rot) ctx.rotate(rot); if (sc !== 1) ctx.scale(sc, sc); if (pr.p.flip) ctx.scale(-1, 1);
  const d = PROPS[pr.kind]; if (d) d.draw(ctx, size, params, lt, host);
  ctx.restore();
}

const CHAR_M = 1.9;
export function drawFrame(ctx, W, H, plan, t, host) {
  const sc = plan.scene, m = Math.min(W, H);
  const stl = applyStyle(plan.meta); host.W = W; host.H = H;
  const seq = plan.stage && plan.seqKey && host.set3dSeq && host.set3dSeq[plan.seqKey];
  const c3 = plan.stage ? camAt(plan, t) : null;
  const bgE = seq ? seqBg(host, seq, sc.bg, W, H) : getBg(host, sc.bg, W, H, stl, styleName(plan.meta));
  const ground = sc.ground ?? bgE.ground;
  const tr = transitionFx(plan.trans.kind, plan.trans.dur, t, W, H, plan.trans.color, host);
  const ex = exitFx(sc.exit, plan.dur - t, W, H, host);

  if (ctx.reset) ctx.reset(); // evita acumulação de estado/ops entre frames (skia-canvas)
  ctx.save();
  if (tr && tr.underlay) tr.underlay(ctx);
  if (tr && tr.pre) tr.pre(ctx);

  // câmara
  const resolveFocus = (id, part) => {
    const a = plan.actors.find((q) => q.id === id); if (!a) return null;
    const ax = track(a.x0, a.xs, t), ay = a.y0 === undefined ? ground + 0.09 : track(a.y0, a.ys, t), hh = (stl.charScale * m * a.scale * (bgE.pxPerM ? (1.75 * bgE.pxPerM) / ((stl.hFac || 1.34) * stl.charScale * m) : 1)) / H;
    const P = { full: [0.52, 1.15], body: [0.5, 1.7], head: [0.87, 2.6], face: [0.88, 3.8] }[part || 'body'] || [0.5, 1.7];
    return { x: ax - 0.5, y: ay - P[0] * hh - 0.5, zoom: P[1] };
  };
  const cs = plan.stage ? { x: 0, y: 0, zoom: 1, rot: 0 } : camState(plan.cam, t, resolveFocus);
  let cx = cs.x, cy = cs.y; const th = Math.abs(cs.rot) * Math.PI / 180;
  const zoom = Math.max(1, cs.zoom, th ? Math.cos(th) + Math.sin(th) * Math.max(H / W, W / H) : 1);
  for (const f of plan.fxs) if (f.kind === 'shake' && t >= f.t && t < f.t + f.dur) { const k = 1 - (t - f.t) / f.dur; cx += Math.sin(t * 90) * f.amp * k; cy += Math.cos(t * 77) * f.amp * k; }
  const lim = (1 - 1 / zoom) / 2; cx = clamp(cx, -lim, lim); cy = clamp(cy, -lim, lim);
  // k = factor de profundidade: <1 fundo (move menos), 1 plano das personagens, >1 primeiro plano => parallax
  const camT = (c, k = 1) => { const zl = 1 + (zoom - 1) * k, lm = (1 - 1 / zl) / 2; c.translate(W / 2, H / 2); if (cs.rot) c.rotate(th * Math.sign(cs.rot)); c.scale(zl, zl); c.translate(-(W / 2 + clamp(cx * k, -lm, lm) * W), -(H / 2 + clamp(cy * k, -lm, lm) * H)); };
  const lay = bgE.layered;
  if (seq) {
    const u = t * seq.pfps, i0 = Math.min(seq.n - 1, Math.floor(u)), i1 = Math.min(seq.n - 1, i0 + 1), fr = u - i0;
    ctx.save(); ctx.drawImage(seq.imgs[i0], 0, 0, W, H); if (i1 !== i0 && fr > 0.02) { ctx.globalAlpha = fr; ctx.drawImage(seq.imgs[i1], 0, 0, W, H); } ctx.restore(); ctx.save();
  } else if (lay) { ctx.save(); camT(ctx, bgE.farK ?? 0.5); ctx.drawImage(bgE.far, 0, 0); ctx.restore(); ctx.save(); camT(ctx, 1); ctx.drawImage(bgE.mid, 0, 0); } else { ctx.save(); camT(ctx, 1); ctx.drawImage(bgE.canvas, 0, 0); }

  const drawProps = (zone) => { for (const pr of plan.props) { if (pr.z !== zone || pr.attach) continue; drawPropAt(ctx, pr, t, W, H, host, track(pr.x0, pr.xs, t) * W, track(pr.y0, pr.ys, t) * H, false); } };
  drawProps('back');

  const light = sc.light === false ? null : sc.light ?? bgE.light;
  let actx = ctx, LY = null;
  if (light) { host._ly = host._ly && host._lyk === W + 'x' + H ? host._ly : host.makeCanvas(W, H); host._lyk = W + 'x' + H; LY = host._ly; actx = LY.getContext('2d'); actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, W, H); actx.save(); camT(actx, 1); }
  // actores por profundidade (y)
  const stageP = (a) => { const sw = Math.sin(t * 0.9 + hashStr(a.id) % 7) * 0.035; return projectCam(c3, W, H, [track(a.x0, a.xs, t) + (a.acts.length ? sw : 0), 0, track(a.z0, a.zs, t)]); };
  const live = plan.actors.map((a) => { if (c3) { const pr = stageP(a); return { a, y: pr.y, pr }; } return { a, y: a.y0 === undefined ? ground + 0.09 : track(a.y0, a.ys, t) }; }).sort((p, q) => (c3 ? q.pr.z - p.pr.z : p.y - q.y));
  for (const { a, y, pr } of live) {
    if (t < a.at || t > a.until + 0.3) continue;
    const lt = t - a.at, an = appearAnim(a.at > 0 || a.until !== Infinity ? 'pop' : 'none', lt, a.until, t);
    const S = pr ? (CHAR_M * pr.k * a.scale) / (stl.hFac || 1.34) : stl.charScale * m * a.scale * (bgE.pxPerM ? (1.75 * bgE.pxPerM) / ((stl.hFac || 1.34) * stl.charScale * m) : 1);
    const pose = poseAt(a, t, W, S);
    const faceName = stepVal(a.faces, a.face0, t), fd = faceDef(faceName);
    const line = plan.lines.find((l) => l.who === a.id && t >= l.t0 - 0.02 && t <= l.t1 + 0.02);
    const mouth = line ? clamp(envAt(line, t) * 1.25, 0, 1) : 0;
    const ph = (t * 1000 + hashStr(a.id) % 2000) % 3300; const blink = ph < 140 ? 1 - Math.abs(ph - 70) / 70 : 0;
    let flip = stepVal(a.flips, a.flip0, t);
    if (pr && a.toward) { const o = plan.actors.find((q) => q.id === a.toward); if (o) { const po = stageP(o); if (Math.abs(po.x - pr.x) > 0.015) flip = po.x < pr.x; } }
    const x = pr ? pr.x * W : track(a.x0, a.xs, t) * W;
    const held = plan.props.filter((p) => p.attach && p.attach.actor === a.id);
    actx.save();
    if (an.sc !== 1 || an.al !== 1) { actx.globalAlpha = an.al; actx.translate(x, y * H); actx.scale(an.sc, an.sc); actx.translate(-x, -y * H); }
    if (bgE.shadow && an.al > 0.05) {
      const shd = bgE.shadow; host._sh = host._sh && host._shk === W + 'x' + H ? host._sh : host.makeCanvas(W, H); host._shk = W + 'x' + H; const sg = host._sh.getContext('2d');
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, H); sg.save(); sg.translate(x, y * H); sg.transform(1, 0, -shd.dx, -0.2, 0, 0);
      drawCharacter(sg, a.def, pose, { st: stl, x: 0, y: 0, S, flip, faceDef: fd, mouthOpen: 0, blink: 0, t });
      sg.restore(); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0c0818'; sg.fillRect(0, 0, W, H); sg.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalAlpha = shd.a * an.al; ctx.filter = `blur(${Math.max(1.5, S * 0.012)}px)`; ctx.drawImage(host._sh, 0, 0); ctx.restore();
      const cg = ctx.createRadialGradient(x, y * H, 0, x, y * H, S * 0.3); cg.addColorStop(0, `rgba(10,6,24,${0.42 * an.al})`); cg.addColorStop(1, 'rgba(10,6,24,0)'); ctx.save(); ctx.translate(x, y * H); ctx.scale(1, 0.28); ctx.translate(-x, -y * H); ctx.fillStyle = cg; ctx.fillRect(x - S * 0.3, y * H - S * 0.3, S * 0.6, S * 0.6); ctx.restore();
    }
    drawCharacter(actx, a.def, pose, { st: stl, x, y: y * H, S, flip, faceDef: fd, mouthOpen: mouth, blink, t,
      holdProp: held.length ? (c, wrist, SS, ang) => { c.save(); c.translate(wrist[0], wrist[1]); if (flip) c.scale(-1, 1); const dir = held[0].attach.hand === 'B' ? -1 : 1; for (const pr of held) { const off = (pr.size * m) * 0.32; drawPropAt(c, { ...pr, fx: 'none', at: -1, ...{} }, t, W, H, host, off * 0.9, -off * 0.7, true); } c.restore(); } : null });
    actx.restore();
  }
  if (LY) { actx.restore(); if (light.rimEdge !== false) rimEdge(LY, W, H, host, light); applyRim(actx, W, H, light); ctx.restore(); ctx.save(); ctx.drawImage(LY, 0, 0); ctx.restore(); ctx.save(); camT(ctx, 1); }
  drawProps('front');
  ctx.restore();
  if (seq && seq.fronts) { const u = t * seq.pfps, i0 = Math.min(seq.n - 1, Math.floor(u)), i1 = Math.min(seq.n - 1, i0 + 1), fr = u - i0; ctx.save(); ctx.filter = `blur(${(bgE.dofFg ?? 3) * W / 540}px)`; ctx.drawImage(seq.fronts[i0], 0, 0, W, H); if (i1 !== i0 && fr > 0.02) { ctx.globalAlpha = fr; ctx.drawImage(seq.fronts[i1], 0, 0, W, H); } ctx.restore(); }
  if (lay && bgE.fg) { ctx.save(); camT(ctx, bgE.fgK ?? 1.45); ctx.drawImage(bgE.fg, 0, 0); ctx.restore(); }
  drawLights(ctx, W, H, t, sc.lights ?? bgE.lights, camT);
  drawParticles(ctx, W, H, t, sc.particles === false ? null : sc.particles ?? bgE.particles);
  applyGrade(ctx, W, H, sc.grade === false ? null : sc.grade ?? bgE.grade);
  const bl = sc.bloom ?? bgE.bloom ?? (stl.shade ? 0.3 : 0); if (bl) bloom(ctx, W, H, host, bl);
  if (lay) finishBackground(ctx, W, H, stl, host);

  // sobreposições em coordenadas de ecrã
  drawCaptions(ctx, W, H, plan, t);
  if (plan.title) {
    const T2 = plan.title, lt = t - T2.at;
    if (lt >= 0 && lt < T2.dur + 0.3) {
      const k = ease.back(clamp(lt / 0.4, 0, 1)) * (1 - clamp((lt - T2.dur) / 0.3, 0, 1));
      const sz = (T2.size ?? 0.13) * m * (W > H ? 1 : 1);
      ctx.save(); ctx.translate(W / 2, H * (T2.y ?? 0.17)); ctx.scale(k, k); ctx.rotate(Math.sin(lt * 4) * 0.015);
      const lines = String(T2.text).split('\n'); lines.forEach((l, i) => outlinedText(ctx, l, 0, (i - (lines.length - 1) / 2) * sz * 1.05, sz, T2.color || '#ffd23f', INK, FONT_DISPLAY, 'center', 0.18));
      ctx.restore();
    }
  }
  for (const f of plan.fxs) if (f.kind === 'flash' && t >= f.t && t < f.t + f.dur) { ctx.save(); ctx.globalAlpha = 0.9 * (1 - (t - f.t) / f.dur); ctx.fillStyle = f.color || '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (tr && tr.post) tr.post(ctx);
  if (ex && ex.post) ex.post(ctx);
  ctx.restore();
}
