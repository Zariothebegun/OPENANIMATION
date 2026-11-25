// Kits de cenário 3D: cada kit devolve { sky, fog, hemi, sun, lights, objects, cam }. Unidades em metros, y para cima,
// personagens no plano z=0 (câmara a olhar para -z). Objecto: {t:'box|cyl|cone|sph|plane|prism|tube|blob|torus|glow', p,s,c,tex,rot,front,emit,...}
const P = (o) => o;
const hx = (s) => s;

// ---- helpers de composição ----
function building(x, z, w, h, d, o = {}, R = Math.random) {
  const wall = o.wall || '#c9a27a', roof = o.roof || '#8a3b2e', tex = o.tex || 'brick', out = [];
  out.push({ t: 'box', p: [x, h / 2, z], s: [w, h, d], c: wall, tex, tile: o.tile || 2.2 });
  if (o.roofType === 'flat') out.push({ t: 'box', p: [x, h + 0.15, z], s: [w + 0.3, 0.3, d + 0.3], c: o.trim || '#6a5a52' });
  else out.push({ t: 'prism', p: [x, h, z], s: [w + 0.5, o.rh ?? w * 0.32, d + 0.5], c: roof, tex: 'roof', tile: 1.5 });
  const rows = Math.max(1, Math.round(h / 3)), cols = Math.max(1, Math.round(w / 2.6)), front = o.faceZ ?? 1;
  const fz = z + front * (d / 2 + 0.04);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === 0 && o.door !== false && c === Math.floor(cols / 2)) { out.push({ t: 'box', p: [x - w / 2 + (c + 0.5) * w / cols, 1.05, fz + front * 0.02], s: [1.1, 2.1, 0.12], c: o.doorC || '#5a3a28', tex: 'plank', tile: 1 }); continue; }
    const lit = R() < (o.lit ?? 0.55); const wx = x - w / 2 + (c + 0.5) * w / cols, wy = 1.7 + r * 2.9 + (o.winY || 0);
    out.push({ t: 'box', p: [wx, wy, fz], s: [1.05, 1.35, 0.1], c: '#3a2c3c', emit: lit ? (o.litC || '#ffd27a') : (o.dark || '#34425e'), cast: false });
    out.push({ t: 'box', p: [wx, wy, fz + front * 0.04], s: [1.3, 0.12, 0.2], c: '#4a3a40' });
    if (o.shut) { out.push({ t: 'box', p: [wx - 0.78, wy, fz + front * 0.03], s: [0.45, 1.4, 0.08], c: o.shut }); out.push({ t: 'box', p: [wx + 0.78, wy, fz + front * 0.03], s: [0.45, 1.4, 0.08], c: o.shut }); }
  }
  return out;
}

function rotY(objs, deg, tx, tz) { const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); return objs.map((o) => { const [x, y, z] = o.p; const q = { ...o, p: [x * c + z * sn + tx, y, -x * sn + z * c + tz] }; if (o.t !== 'glow') q.rot = [o.rot?.[0] || 0, (o.rot?.[1] || 0) + deg, o.rot?.[2] || 0]; return q; }); }
// rua em "canyon": filas de edifícios nos dois lados, a fugir para o fundo (dá perspectiva 3D forte)
export function canyon(R, o = {}) {
  const half = o.half ?? 7.2, out = [], cols = o.cols || ['#c9a27a', '#b86a5a', '#8a9ab8', '#d8c090'], z1 = o.z1 ?? -44; let seed = 0;
  for (const side of [-1, 1]) { let z = o.z0 ?? 6; while (z > z1) { const w = (o.w || 8) + R() * 3, h = (o.h?.[0] ?? 7) + R() * ((o.h?.[1] ?? 12) - (o.h?.[0] ?? 7)); const b = building(0, 0, w, h, o.d || 7, { wall: cols[Math.floor(R() * cols.length)], roof: o.roof || '#8a3b2e', tex: o.tex || 'brick', roofType: o.roofType, lit: o.lit ?? 0.5, litC: o.litC, dark: o.dark, tile: o.tile || 2, shut: o.shut, rh: o.rh }, R); out.push(...rotY(b, side < 0 ? 90 : -90, side * (half + (o.d || 7) / 2), z - w / 2)); z -= w + 0.4; seed++; } }
  // fecho da rua e skyline
  for (let i = -2; i <= 2; i++) out.push(...building(i * 9, z1 - 4, 9, (o.h?.[1] ?? 12) + 3, 7, { wall: cols[(i + 2) % cols.length], roof: o.roof || '#8a3b2e', lit: o.lit ?? 0.5, tile: 2 }, R));
  return out;
}

function roomShell(o = {}) {
  const hw = o.hw ?? 4.2, zb = o.zb ?? -9, h = o.h ?? 3.4, zf = o.zf ?? 7, L = zf - zb, cz = (zf + zb) / 2, wc = o.wall || '#e0c8a0', out = [];
  out.push({ t: 'box', p: [0, -0.1, cz], s: [hw * 2, 0.2, L], c: o.floor || '#a07a50', tex: o.floorTex || 'plank', tile: o.floorTile || 1.4 });
  out.push({ t: 'box', p: [0, h + 0.1, cz], s: [hw * 2, 0.2, L], c: o.ceil || '#c8bfb0', tex: 'plaster', tile: 3 });
  out.push({ t: 'box', p: [0, h / 2, zb], s: [hw * 2, h, 0.3], c: wc, tex: o.wallTex || 'wall', tile: 3 });
  out.push({ t: 'box', p: [-hw, h / 2, cz], s: [0.3, h, L], c: o.wallL || wc, tex: o.wallTex || 'wall', tile: 3 }, { t: 'box', p: [hw, h / 2, cz], s: [0.3, h, L], c: o.wallR || wc, tex: o.wallTex || 'wall', tile: 3 });
  out.push({ t: 'box', p: [0, 0.14, zb + 0.2], s: [hw * 2, 0.28, 0.12], c: o.trim || '#6a5240' }, { t: 'box', p: [-hw + 0.2, 0.14, cz], s: [0.12, 0.28, L], c: o.trim || '#6a5240' }, { t: 'box', p: [hw - 0.2, 0.14, cz], s: [0.12, 0.28, L], c: o.trim || '#6a5240' });
  // luminárias no tecto
  for (let z = zf - 2; z > zb + 1; z -= 3.2) out.push({ t: 'box', p: [0, h - 0.02, z], s: [1.4, 0.06, 0.7], c: '#fff', emit: o.lampC || '#fff2d0', ink: false });
  return out;
}
function windowL(x, y, z, side, w = 1.8, h = 1.5, c = '#bfe6ff') { const o = []; o.push({ t: 'box', p: [x, y, z], s: [0.1, h, w], c: '#222', emit: c }, { t: 'box', p: [x - side * 0.03, y, z], s: [0.14, h + 0.2, 0.12], c: '#e8dcc8' }, { t: 'box', p: [x - side * 0.03, y, z - w / 2], s: [0.14, h + 0.2, 0.12], c: '#e8dcc8' }, { t: 'box', p: [x - side * 0.03, y, z + w / 2], s: [0.14, h + 0.2, 0.12], c: '#e8dcc8' }, { t: 'box', p: [x - side * 0.03, y + h / 2 + 0.05, z], s: [0.14, 0.12, w + 0.2], c: '#e8dcc8' }, { t: 'box', p: [x - side * 0.03, y - h / 2 - 0.05, z], s: [0.14, 0.12, w + 0.2], c: '#e8dcc8' }, { t: 'glow', p: [x - side * 0.6, y, z], r: 4, c, a: 0.5 }); return o; }
function lamp(x, z, h = 3.4, c = '#ffcf7a', front = false) { return [{ t: 'cyl', p: [x, h / 2, z], s: [0.07, h], c: '#2a2230', front }, { t: 'box', p: [x, h + 0.18, z], s: [0.34, 0.4, 0.34], c: '#2a2230', front }, { t: 'box', p: [x, h + 0.18, z], s: [0.26, 0.32, 0.26], c, emit: c, front }, { t: 'glow', p: [x, h + 0.2, z], r: 3.2, c, front }]; }
function tree(x, z, h = 4, c = '#4f8a3c', trunk = '#6a4a30', R = Math.random) { const o = [{ t: 'cyl', p: [x, h * 0.3, z], s: [0.18, h * 0.6], rt: 0.14, rb: 0.24, c: trunk, tex: 'plank', tile: 1 }]; for (let i = 0; i < 3; i++) o.push({ t: 'blob', p: [x + (R() - 0.5) * 0.9, h * (0.68 + i * 0.12), z + (R() - 0.5) * 0.9], s: [h * (0.34 - i * 0.05)], c, tex: 'grass', seed: 3 + i, wob: 0.18, tile: 1.2 }); return o; }
function pine(x, z, h = 5, c = '#2f5a3a') { const o = [{ t: 'cyl', p: [x, 0.5, z], s: [0.14, 1], c: '#4a3426' }]; for (let i = 0; i < 4; i++) o.push({ t: 'cone', p: [x, 1 + i * h * 0.19 + h * 0.18, z], s: [h * (0.2 - i * 0.03), h * 0.4], c, tex: 'grass', tile: 1 }); return o; }
function crate(x, y, z, s = 0.8, c = '#a77b47') { return { t: 'box', p: [x, y + s / 2, z], s: [s, s, s], c, tex: 'plank', tile: 0.8 }; }
function ground(c, tex, w = 120, d = 140, z = -20, tile = 2.2) { return { t: 'plane', p: [0, 0, z], s: [w, d], rot: [-90, 0, 0], c, tex, tile }; }
function wallBack(z, w, h, c, tex, tile = 2.2) { return { t: 'box', p: [0, h / 2, z], s: [w, h, 0.3], c, tex, tile }; }
function cloudsFar(R, n = 7, y = 30, z = -90, c = '#ffffff') { const o = []; for (let i = 0; i < n; i++) { const x = (i / n - 0.5) * 160 + R() * 20; for (let k = 0; k < 4; k++) o.push({ t: 'blob', p: [x + k * 4 - 6, y + R() * 5, z], s: [5 + R() * 3], sc: [1.6, 0.6, 0.8], c, ink: false, cast: false, recv: false, wob: 0.1, seed: 4 + i }); } return o; }

// ---- "dressing": detalhe espalhado (adereços de cenário) para o fundo nunca ficar vazio ----
const DRESS = {
  barrel: (x, z, R) => [{ t: 'cyl', p: [x, 0.5, z], s: [0.42, 1.0], c: '#8a5a34', tex: 'plank', tile: 0.6 }, { t: 'cyl', p: [x, 0.3, z], s: [0.44, 0.07], c: '#3a2a2a' }, { t: 'cyl', p: [x, 0.75, z], s: [0.44, 0.07], c: '#3a2a2a' }],
  crates: (x, z, R) => [crate(x, 0, z, 0.9), crate(x + 0.95, 0, z + 0.1, 0.7, '#8a6038'), crate(x + 0.4, 0.9, z, 0.65, '#b88a50')],
  plant: (x, z, R) => [{ t: 'cyl', p: [x, 0.35, z], s: [0.32, 0.7], rt: 0.38, rb: 0.26, c: '#b0603c' }, { t: 'blob', p: [x, 1.0, z], s: [0.55], c: '#4a9a48', tex: 'grass', wob: 0.3, seed: Math.floor(R() * 9) }, { t: 'blob', p: [x + 0.25, 1.35, z], s: [0.35], c: '#5aaa50', tex: 'grass', wob: 0.3, seed: 2 }],
  bench: (x, z, R) => [{ t: 'box', p: [x, 0.5, z], s: [1.8, 0.1, 0.55], c: '#9a6a3a', tex: 'plank', tile: 0.7 }, { t: 'box', p: [x, 0.95, z - 0.25], s: [1.8, 0.5, 0.08], c: '#9a6a3a', tex: 'plank', tile: 0.7 }, { t: 'box', p: [x - 0.8, 0.25, z], s: [0.1, 0.5, 0.5], c: '#2a2a32' }, { t: 'box', p: [x + 0.8, 0.25, z], s: [0.1, 0.5, 0.5], c: '#2a2a32' }],
  sign: (x, z, R) => [{ t: 'cyl', p: [x, 1.2, z], s: [0.05, 2.4], c: '#3a3038' }, { t: 'box', p: [x, 2.3, z + 0.05], s: [1.2, 0.7, 0.08], c: ['#d8b050', '#c0504a', '#4a90c0'][Math.floor(R() * 3)], tex: 'paper' }, { t: 'box', p: [x, 2.3, z + 0.1], s: [0.9, 0.08, 0.05], c: '#2a2030' }, { t: 'box', p: [x, 2.12, z + 0.1], s: [0.6, 0.08, 0.05], c: '#2a2030' }],
  bush: (x, z, R) => [{ t: 'blob', p: [x, 0.5, z], s: [0.9], sc: [1.4, 0.8, 1], c: '#4a8a48', tex: 'grass', wob: 0.25, seed: Math.floor(R() * 9) }],
  trash: (x, z, R) => [{ t: 'cyl', p: [x, 0.45, z], s: [0.32, 0.9], rt: 0.36, rb: 0.3, c: '#5a6a72', tex: 'metal', tile: 0.6 }, { t: 'cyl', p: [x, 0.93, z], s: [0.38, 0.08], c: '#46545c' }],
  hydrant: (x, z, R) => [{ t: 'cyl', p: [x, 0.4, z], s: [0.18, 0.8], c: '#c8403a' }, { t: 'sph', p: [x, 0.85, z], s: [0.2], c: '#c8403a' }, { t: 'cyl', p: [x, 0.55, z], s: [0.1, 0.5], c: '#c8403a', rot: [0, 0, 90] }],
  fence: (x, z, R) => { const o = [{ t: 'box', p: [x, 0.75, z], s: [3, 0.08, 0.06], c: '#e8dcc0' }, { t: 'box', p: [x, 0.4, z], s: [3, 0.08, 0.06], c: '#e8dcc0' }]; for (let i = 0; i < 7; i++) o.push({ t: 'box', p: [x - 1.35 + i * 0.45, 0.55, z], s: [0.1, 1.1, 0.06], c: '#efe4c8' }); return o; },
  bunting: (x, z, R) => { const o = []; for (let i = 0; i < 9; i++) o.push({ t: 'cone', p: [x - 2 + i * 0.5, 3.6 - Math.sin(i / 8 * Math.PI) * 0.4, z], s: [0.17, 0.4], rot: [180, 0, 0], c: ['#e8504a', '#f0c040', '#4a90e0', '#50c080'][i % 4] }); return o; },
  rubble: (x, z, R) => { const o = []; for (let i = 0; i < 5; i++) o.push({ t: 'blob', p: [x + R() * 2 - 1, 0.25, z + R() - 0.5], s: [0.3 + R() * 0.4], sc: [1.2, 0.7, 1], c: '#6a5e5a', tex: 'stone', wob: 0.3, seed: i }); return o; },
  lampfloor: (x, z, R) => [{ t: 'cyl', p: [x, 0.8, z], s: [0.04, 1.6], c: '#3a2a30' }, { t: 'cone', p: [x, 1.75, z], s: [0.3, 0.4], c: '#ffcf8a', emit: '#ffcf8a' }, { t: 'glow', p: [x, 1.7, z], r: 2.6, c: '#ffcf7a', a: 0.6 }],
  puddle: (x, z, R) => [{ t: 'cyl', p: [x, 0.015, z], s: [0.8 + R() * 0.6, 0.02], c: '#8aa0d0', emit: '#5a6a9a', ink: false, cast: false, recv: false, sc: [1, 1, 0.6] }],
  stack: (x, z, R) => [{ t: 'box', p: [x, 0.15, z], s: [1.2, 0.3, 0.8], c: '#c8b090', tex: 'plank' }, { t: 'box', p: [x, 0.45, z], s: [1.1, 0.3, 0.7], c: '#d8c4a0', tex: 'plank' }],
  pillar: (x, z, R) => [{ t: 'cyl', p: [x, 2, z], s: [0.35, 4], c: '#d0c8b8', tex: 'stone', tile: 1 }, { t: 'box', p: [x, 4.1, z], s: [0.9, 0.25, 0.9], c: '#bfb6a6' }, { t: 'box', p: [x, 0.12, z], s: [0.9, 0.25, 0.9], c: '#bfb6a6' }],
};
export function dress(R, o = {}) {
  const out = [], kinds = o.kinds || ['barrel', 'crates', 'plant', 'bench', 'sign'], n = o.n ?? 14, [x0, x1] = o.x || [-9, 9], [z0, z1] = o.z || [-10, -3], av = o.avoid || [-1.6, 1.6];
  for (let i = 0; i < n; i++) {
    const k = kinds[Math.floor(R() * kinds.length)]; let x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
    if (z > -2 && Math.abs(x) < 2.6) x = (x < 0 ? -1 : 1) * (2.6 + R() * 2);
    for (const ob of DRESS[k](x, z, R)) { if (z > 1) ob.front = true; out.push(ob); }
  }
  return out;
}
function person3(x, z, c = '#3a4a68') { return { t: 'cyl', p: [x, 0.85, z], s: [0.22, 1.7], c }; }

export const KITS = {
  // praça de noite com lanternas, edifícios iluminados e pedestal
  plaza_night(p, R) {
    const o = [ground('#59607a', 'cobble', 140, 140, -10, 2.4)];
    o.push(...canyon(R, { cols: ['#8a8ec0', '#9a86a8', '#7a8ab8', '#a89898', '#c08a7a'], roof: '#3e3a5c', lit: 0.6, half: 7.5 }));
    for (let z = 2; z > -30; z -= 5.5) { o.push(...lamp(-5.6, z, 3.8), ...lamp(5.6, z - 2.7, 3.8)); }
    o.push({ t: 'cyl', p: [0, 0.45, -9], s: [1.8, 0.9], c: '#8a8a9a', tex: 'stone' }, { t: 'cyl', p: [0, 0.95, -9], s: [1.6, 0.12], c: '#6a6a7a' }, { t: 'cyl', p: [0, 2.2, -9], s: [0.25, 2.6], c: '#8a8a9a', tex: 'stone' }, { t: 'sph', p: [0, 3.7, -9], s: [0.5], c: '#9a9aaa', tex: 'stone' });
    o.push(...lamp(-3.4, 3.5, 3.8, '#ffcf7a', true));
    
    return { sky: { t: '#101a46', h: '#4a4a86', b: '#202850', stars: 1, sun: { d: [-0.5, 0.35, -1], c: '#fff1c4', s: 0.02, glow: 0.35 } }, fog: { c: '#34386e', n: 10, f: 55 }, hemi: { s: '#7f8fe0', g: '#352c4a', i: 1.15 }, sun: { c: '#9fb0ff', i: 1.4, d: [-0.6, 1, 0.5] }, lights: [{ p: [-3.4, 3.6, 3.5], c: '#ffb560', i: 40, d: 14 }, { p: [4.5, 3.4, -4], c: '#ffb560', i: 30, d: 12 }], objects: o, cam: { pos: [0, 1.75, 5.5], look: [0, 1.65, -8], fov: 56 }, grade: { tint: '#6a58c8', amt: 0.14 } };
  },

  // varanda de madeira à noite com lanternas, neve e rua ao fundo (cenário "rico", visto de dentro da varanda)
  porch_night(p, R) {
    const wood = p.wood || '#b98652', wall = p.wall || '#3f8a86', o = [];
    // chão de tábuas, tecto de tábuas, parede de ripas à esquerda
    o.push({ t: 'box', p: [0, -0.1, -2], s: [6.6, 0.2, 22], c: wood, tex: 'plank', tile: 1.3 });
    o.push({ t: 'box', p: [0, 3.2, -2], s: [6.8, 0.25, 22], c: '#5a6490', tex: 'plank', tile: 0.9 });
    for (let z = 5; z > -9; z -= 2.4) o.push({ t: 'box', p: [0, 3.0, z], s: [6.7, 0.28, 0.22], c: '#6e5a50' });
    o.push({ t: 'box', p: [-3.3, 1.8, -2], s: [0.25, 3.7, 22], c: wall, tex: 'plank', tile: 0.7 });
    o.push({ t: 'box', p: [-3.15, 0.2, -2], s: [0.12, 0.4, 22], c: '#e8d8a0' }, { t: 'box', p: [-3.15, 3.4, -2], s: [0.12, 0.3, 22], c: '#e8d8a0' });
    // porta e janela acesas na parede
    o.push({ t: 'box', p: [-3.1, 1.2, -4], s: [0.1, 2.4, 1.3], c: '#7a3a2a', tex: 'plank', tile: 0.7 }, { t: 'box', p: [-3.08, 1.2, -4], s: [0.06, 2.6, 1.5], c: '#e8d8a0', ink: false, cast: false });
    o.push({ t: 'box', p: [-3.1, 2.0, 0.8], s: [0.08, 1.2, 1.2], c: '#222', emit: '#ffd890' }, { t: 'box', p: [-3.05, 2.0, 0.8], s: [0.1, 1.4, 0.12], c: '#e8d8a0' }, { t: 'box', p: [-3.05, 2.0, 0.8], s: [0.1, 0.12, 1.4], c: '#e8d8a0' });
    // lanterna de parede
    o.push({ t: 'box', p: [-3.0, 2.7, 2.4], s: [0.22, 0.38, 0.22], c: '#ffcf7a', emit: '#ffcf7a' }, { t: 'box', p: [-3.0, 2.95, 2.4], s: [0.3, 0.08, 0.3], c: '#3a2a30' }, { t: 'glow', p: [-2.8, 2.7, 2.4], r: 3.5, c: '#ffcf7a', a: 0.85 });
    // guarda e postes à direita
    for (let z = 5; z > -9; z -= 1.9) { o.push({ t: 'box', p: [3.2, 1.7, z], s: [0.22, 3.4, 0.22], c: '#efe0b0', tex: 'plank', tile: 0.6 }); for (let k = 0; k < 4; k++) o.push({ t: 'box', p: [3.2, 0.2 + k * 0, z + 0.95], s: [0.08, 0.8, 0.08], c: '#efe0b0' }); }
    o.push({ t: 'box', p: [3.2, 1.05, -2], s: [0.14, 0.14, 22], c: '#efe0b0' }, { t: 'box', p: [3.2, 0.3, -2], s: [0.1, 0.1, 22], c: '#efe0b0' });
    for (let z = 5; z > -9; z -= 0.35) o.push({ t: 'box', p: [3.2, 0.65, z], s: [0.05, 0.85, 0.05], c: '#efe0b0' });
    // sincelhos no beiral
    for (let z = 4.6; z > -8; z -= 0.55) o.push({ t: 'cone', p: [3.3, 3.1 - R() * 0.2, z], s: [0.06, 0.4 + R() * 0.4], c: '#dff0ff', rot: [180, 0, 0] });
    // tapete, pá, caixa, banco
    o.push({ t: 'box', p: [-1.6, 0.02, 3.3], s: [1.6, 0.04, 1.1], c: '#8a2a2a', tex: 'cloth', tile: 0.5 }, { t: 'box', p: [2.4, 0.4, -3.2], s: [1.5, 0.8, 0.7], c: '#9a6a3a', tex: 'plank', tile: 0.8 }, { t: 'box', p: [2.4, 0.84, -3.2], s: [1.6, 0.1, 0.8], c: '#7a4a2a' });
    o.push({ t: 'cyl', p: [-2.6, 0.5, -1.0], s: [0.35, 1.0], c: '#a05a3a', tex: 'plank', tile: 0.6 }, { t: 'cyl', p: [-2.6, 1.02, -1.0], s: [0.4, 0.08], c: '#6a3a2a' });
    // luzes de Natal no tecto (esferas emissivas + halos)
    for (let i = 0; i < 16; i++) { const z = 4 - i * 0.8, c = ['#ffcf7a', '#ff8a6a', '#8affc0', '#8ab8ff'][i % 4], y = 3.15 - Math.abs(Math.sin(i * 0.8)) * 0.15; o.push({ t: 'sph', p: [-0.4 + Math.sin(i) * 0.4, y, z], s: [0.07], c, emit: c, ink: false }, { t: 'glow', p: [-0.4 + Math.sin(i) * 0.4, y, z], r: 0.9, c, a: 0.7 }); }
    // rua para lá da varanda: neve, casas iluminadas, candeeiros, árvores
    o.push({ t: 'plane', p: [0, -0.3, -30], s: [120, 90], rot: [-90, 0, 0], c: '#cfd8f0', tex: 'snow', tile: 4 }, { t: 'plane', p: [9, -0.25, -14], s: [14, 40], rot: [-90, 0, 0], c: '#5a6078', tex: 'cobble', tile: 2 });
    for (const [x, z, w, h, wl] of [[11, -16, 8, 8, '#b84a4a'], [20, -22, 9, 9, '#c8a060'], [-6, -26, 9, 8, '#6a7ab0'], [4, -32, 12, 11, '#a85a58'], [-16, -20, 8, 7, '#5a8a8a'], [30, -30, 10, 9, '#8a6a9a']]) o.push(...building(x, z, w, h, 6, { wall: wl, roof: '#4a3a48', lit: 0.8, litC: '#ffd890', tile: 2 }, R));
    for (const [x, z] of [[6.2, -3], [7.5, -10], [6, -18]]) o.push(...lamp(x, z, 3.6, '#ffd890'));
    for (const [x, z] of [[8, 2], [14, -4], [10, -28]]) o.push(...pine(x, z, 6, '#2f5a56'), { t: 'blob', p: [x, 0.5, z], s: [1.2], sc: [1.8, 0.5, 1.2], c: '#f2f6ff', ink: false, wob: 0.2, seed: 4 });
    // primeiro plano: duas lanternas penduradas (desfocadas)
    for (const [x, y, z] of [[2.2, 2.6, 3.6], [-2, 2.8, 4.3]]) o.push({ t: 'cyl', p: [x, y + 0.5, z], s: [0.015, 0.9], c: '#3a2a30', front: true }, { t: 'cyl', p: [x, y, z], s: [0.3, 0.55], c: '#ffcf7a', emit: '#ffcf7a', front: true }, { t: 'cyl', p: [x, y + 0.34, z], s: [0.18, 0.12], rt: 0.12, rb: 0.3, c: '#8a3a2a', front: true }, { t: 'glow', p: [x, y, z], r: 3.2, c: '#ffcf7a', a: 0.9, front: true });
    return { sky: { t: '#1a2260', h: '#7a6aa0', b: '#3a3a60', stars: 1.2, sun: { d: [0.3, 0.3, -1], c: '#fff4d0', s: 0.012, glow: 0.2 } }, fog: { c: '#6a6a98', n: 14, f: 70 }, hemi: { s: '#8a98e0', g: '#5a4a4a', i: 0.95 }, sun: { c: '#9aa8ff', i: 0.8, d: [-0.4, 1, 0.6], ext: 16, target: [0, 0, -2] }, lights: [{ p: [-2.6, 2.4, 2.4], c: '#ffb860', i: 9, d: 8 }, { p: [2.2, 2.4, 3.6], c: '#ffb860', i: 7, d: 7 }, { p: [0, 2.6, -2], c: '#ffd8a0', i: 4, d: 7 }], objects: o, hasFront: true, cam: { pos: [0.3, 1.55, 5.6], look: [0.4, 1.15, -4], fov: 58 } };
  },
  // rua de cidade de dia
  city_day(p, R) {
    const o = [ground('#7e7c80', 'tile', 160, 160, -10, 3), { t: 'box', p: [0, 0.07, -3.5], s: [140, 0.14, 4.2], c: '#a89a90', tex: 'tile' }, { t: 'box', p: [0, 0.01, -9], s: [140, 0.03, 4], c: '#4a4a56' }];
    o.push(...canyon(R, { cols: ['#d9b48a', '#c97c6a', '#a8b8c8', '#e0cfa0', '#b09ab0'], lit: 0.25, dark: '#7f9bbf', litC: '#bfe0ff', half: 7.2 }));
    for (let z = 1; z > -36; z -= 6) o.push(...tree(-5.4, z, 4.5, '#5a9a40', '#6a4a30', R), ...tree(5.4, z - 3, 4.2, '#6aaa48', '#6a4a30', R));
    o.push(...cloudsFar(R, 6, 26, -120));
    return { sky: { t: '#4e90e0', h: '#cfe6f8', sun: { d: [0.6, 0.6, -1], c: '#fff6d0', s: 0.035, glow: 0.4 } }, fog: { c: '#cfe2f4', n: 14, f: 90 }, hemi: { s: '#cfe6ff', g: '#8a7c6c', i: 1.1 }, sun: { c: '#fff1d0', i: 2.3, d: [0.8, 1, 0.8] }, objects: o, cam: { pos: [0, 1.75, 5.5], look: [0, 1.65, -8], fov: 56 } };
  },
  // faroeste: rua de terra, casas de madeira
  western(p, R) {
    const o = [ground('#c99c64', 'sand', 160, 140, -20, 3)];
    o.push(...canyon(R, { cols: ['#a2403a', '#8a6a4a', '#c8b48a', '#7a8a6a', '#6a8a9a'], roof: '#5a3a2c', tex: 'plank', tile: 1.4, roofType: 'flat', lit: 0.1, dark: '#6a7a8a', shut: '#3e5a4a', half: 6.5, h: [5, 8], w: 7, d: 6 }));
    for (let z = 1; z > -30; z -= 4) { o.push({ t: 'box', p: [-5.8, 1.5, z], s: [0.2, 3, 0.2], c: '#5a3a28' }, { t: 'box', p: [-5.8, 3.0, z - 1], s: [0.2, 0.2, 2.2], c: '#5a3a28' }); }
    o.push(crate(5.5, 0, 2), crate(5.5, 0.8, 2, 0.7, '#8a6038'), { t: 'cyl', p: [-5.8, 0.55, 1.5], s: [0.5, 1.1], c: '#7a4a2a', tex: 'plank', tile: 0.8 });
    o.push(...cloudsFar(R, 5, 24, -120));
    return { sky: { t: '#3a82d8', h: '#f2dcb8', sun: { d: [-0.4, 0.5, -1], c: '#fff1c0', s: 0.03, glow: 0.5 } }, fog: { c: '#f0d8b0', n: 12, f: 85 }, hemi: { s: '#d6e8ff', g: '#b08a60', i: 1.1 }, sun: { c: '#ffe2b0', i: 2.4, d: [-0.7, 0.8, 0.7] }, objects: o, cam: { pos: [0, 1.75, 5.5], look: [0, 1.65, -8], fov: 56 } };
  },
  // beco/loja à noite com chuva (luz de montra)
  alley_night(p, R) {
    const o = [ground('#3e4660', 'tile', 60, 80, -20, 2.4)];
    o.push(...canyon(R, { cols: ['#6a6e96', '#5a5e86', '#7a6a8a', '#8a6a6a'], roof: '#2e2a44', lit: 0.5, half: 4.2, w: 7, h: [8, 14], tile: 2 }));
    o.push({ t: 'box', p: [-3.9, 1.8, -2], s: [0.12, 2.8, 4.5], c: '#fff0c0', emit: '#ffe9b0' }, { t: 'box', p: [-3.6, 3.4, -2], s: [1.2, 0.14, 4.8], c: '#a2403a' }, { t: 'glow', p: [-3.2, 1.8, -2], r: 7, c: '#ffd890', a: 0.55 });
    for (let z = 0; z > -30; z -= 6) o.push(...lamp(3.6, z - 2, 4.2, '#ffd890'));
    return { sky: { t: '#10163a', h: '#2c3560', b: '#161c3a', stars: 0.6 }, fog: { c: '#262e58', n: 6, f: 40 }, hemi: { s: '#7a8ad8', g: '#2a2640', i: 1.0 }, sun: { c: '#8090e0', i: 1.2, d: [0.5, 1, 0.8] }, lights: [{ p: [-3, 2, -2], c: '#ffc070', i: 30, d: 11 }, { p: [3.6, 4.4, -4], c: '#ffc878', i: 24, d: 11 }], objects: o, cam: { pos: [0, 1.75, 5.5], look: [0, 1.65, -8], fov: 56 } };
  },
  // interior de casa/quarto
  room(p, R) {
    const c = p.wall || '#e0a870', o = roomShell({ hw: 4.2, wall: c, floor: p.floor || '#8a5a3a', trim: '#5a3a2a' });
    o.push(...windowL(-4.0, 2.0, -3, 1, 1.8, 1.6, p.night ? '#4a5aa0' : '#bfe6ff'), { t: 'box', p: [-3.2, 0.5, -3], s: [0.5, 1.0, 1.9], c: '#8a5a38', tex: 'plank' });
    o.push({ t: 'box', p: [-2.6, 0.3, -7.4], s: [2.2, 0.6, 3], c: '#e8e0d0' }, { t: 'box', p: [-2.6, 0.7, -7.4], s: [2.1, 0.25, 2.9], c: '#6aa0c8', tex: 'cloth', tile: 0.6 }, { t: 'box', p: [-2.6, 1.0, -8.7], s: [2.2, 0.8, 0.3], c: '#7a5a3a', tex: 'plank' });
    o.push({ t: 'box', p: [2.4, 1.2, -8.7], s: [2.4, 2.4, 0.4], c: '#7a4a2c', tex: 'plank', tile: 0.8 }); for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) o.push({ t: 'box', p: [1.6 + i * 0.55, 0.45 + k * 0.78, -8.4], s: [0.4, 0.55, 0.3], c: ['#d85a4a', '#4a8ad8', '#e8b83a', '#5ab87a'][(i + k) % 4], tex: 'paper' });
    o.push({ t: 'box', p: [3.0, 0.4, -3.5], s: [2.2, 0.08, 1.0], c: '#9a6a40', tex: 'plank' }, { t: 'box', p: [2.1, 0.2, -3.5], s: [0.08, 0.4, 0.9], c: '#5a3a28' }, { t: 'box', p: [3.9, 0.2, -3.5], s: [0.08, 0.4, 0.9], c: '#5a3a28' });
    o.push({ t: 'box', p: [-0.4, 0.02, -2], s: [3.2, 0.04, 2.2], c: '#a84a4a', tex: 'cloth', tile: 0.5 }, { t: 'box', p: [0.6, 2.6, -8.8], s: [1.4, 1.0, 0.08], c: '#e8d8a8', tex: 'paper' }, { t: 'box', p: [0.6, 2.6, -8.75], s: [1.2, 0.8, 0.05], c: '#6a9ad0' });
    o.push({ t: 'cyl', p: [3.6, 0.35, -6], s: [0.3, 0.7], rt: 0.34, rb: 0.24, c: '#b0603c' }, { t: 'blob', p: [3.6, 1.0, -6], s: [0.55], c: '#4a9a48', tex: 'grass', wob: 0.3 });
    return { sky: { t: '#222', h: '#222' }, fog: false, hemi: { s: '#ffe4c4', g: '#7a5a40', i: 1.0 }, sun: { c: '#ffdcb0', i: 1.0, d: [-0.6, 1, 0.6], ext: 12, target: [0, 0, -3] }, lights: [{ p: [0, 2.5, 1], c: '#ffcf90', i: 7, d: 10 }, { p: [-3, 1.8, -3], c: p.night ? '#6a7ae0' : '#ffe8b8', i: 12, d: 7 }], objects: o, cam: { pos: [0, 1.55, 5.2], look: [0, 1.2, -6], fov: 58 } };
  },
  // sala de aula / laboratório
  classroom(p, R) {
    const o = roomShell({ hw: 5, wall: '#d8d0a8', wallL: '#c8c098', floor: '#b08a5a', zb: -10, trim: '#7a5a3a' });
    o.push({ t: 'box', p: [0, 2.0, -9.8], s: [6.4, 1.9, 0.1], c: p.board || '#2e5a46', tex: 'paper' }, { t: 'box', p: [0, 1.0, -9.7], s: [6.6, 0.1, 0.25], c: '#7a5a3a' }, { t: 'box', p: [-2.2, 2.0, -9.7], s: [1.2, 0.08, 0.05], c: '#eee' });
    o.push(...windowL(-4.8, 2.0, -2, 1, 1.6, 1.5), ...windowL(-4.8, 2.0, -6, 1, 1.6, 1.5));
    for (let r = 0; r < 4; r++) for (const x of [-2.4, 0, 2.4]) { const z = -1.5 - r * 2; o.push({ t: 'box', p: [x, 0.74, z], s: [1.5, 0.08, 0.8], c: '#c89a64', tex: 'plank', tile: 0.8 }, { t: 'box', p: [x - 0.65, 0.35, z], s: [0.06, 0.7, 0.06], c: '#4a4a52' }, { t: 'box', p: [x + 0.65, 0.35, z], s: [0.06, 0.7, 0.06], c: '#4a4a52' }, { t: 'box', p: [x, 0.45, z + 0.7], s: [0.5, 0.06, 0.5], c: '#8a6a4a' }, { t: 'box', p: [x, 0.8, z + 0.95], s: [0.5, 0.5, 0.06], c: '#8a6a4a' }); }
    o.push({ t: 'box', p: [4.7, 1.5, -5], s: [0.5, 3, 3], c: '#7a5a3a', tex: 'plank' }, { t: 'sph', p: [4.2, 1.3, -3.4], s: [0.35], c: '#4a8ad8' }, { t: 'box', p: [3.5, 2.6, -9.8], s: [1.4, 1.0, 0.06], c: '#e8d8a8', tex: 'paper' });
    return { sky: { t: '#222', h: '#222' }, fog: false, hemi: { s: '#fff0d8', g: '#8a6a48', i: 1.0 }, sun: { c: '#fff', i: 1.0, d: [-0.6, 1, 0.6], ext: 14, target: [0, 0, -4] }, lights: [{ p: [0, 2.5, 1], c: '#fff0d0', i: 7, d: 10 }], objects: o, cam: { pos: [0, 1.55, 5.2], look: [0, 1.2, -6], fov: 58 } };
  },
  // deserto ao pôr do sol
  desert_dusk(p, R) {
    const o = [ground('#d89a58', 'sand', 300, 300, -40, 4)];
    for (let i = 0; i < 12; i++) { const x = (i - 6) * 14 + R() * 6, z = -30 - R() * 40; o.push({ t: 'blob', p: [x, 0, z], s: [10 + R() * 8], sc: [2.2, 0.7, 1.2], c: i % 2 ? '#c27c4a' : '#d89458', tex: 'sand', tile: 6, wob: 0.1, seed: i + 2 }); }
    for (let i = 0; i < 6; i++) { const x = (i % 2 ? 1 : -1) * (6 + R() * 10), z = -6 - R() * 18; o.push({ t: 'cyl', p: [x, 1.3, z], s: [0.28, 2.6], c: '#4a7a48' }, { t: 'cyl', p: [x + 0.55, 1.7, z], s: [0.16, 1.1], c: '#4a7a48' }); }
    for (let i = 0; i < 8; i++) o.push({ t: 'blob', p: [(R() - 0.5) * 30, 0.4, -3 - R() * 12], s: [0.6 + R()], sc: [1, 0.6, 0.9], c: '#8a6a52', tex: 'stone', wob: 0.2, seed: i });
    return { sky: { t: '#4a3a80', h: '#ffb060', sun: { d: [0.3, 0.1, -1], c: '#fff0b0', s: 0.045, glow: 0.9 } }, fog: { c: '#f0a868', n: 14, f: 110 }, hemi: { s: '#c6a0d8', g: '#a86a40', i: 1.0 }, sun: { c: '#ffb868', i: 2.6, d: [0.6, 0.28, 0.5] }, objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
  // floresta / campo
  forest(p, R) {
    const o = [ground('#5a9a48', 'grass', 200, 200, -30, 2.5)];
    for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 36, z = -4 - R() * 40; if (Math.abs(x) < 2.2 && z > -9) continue; o.push(...(i % 3 ? tree(x, z, 5 + R() * 4, '#4a8a3c', '#6a4a30', R) : pine(x, z, 6 + R() * 4))); }
    o.push({ t: 'plane', p: [0, 0.02, -6], s: [3, 30], rot: [-90, 0, 0], c: '#c9a066', tex: 'sand', tile: 2 });
    o.push(...cloudsFar(R, 6, 28, -120));
    return { sky: { t: '#4a90e0', h: '#d8ecf8', sun: { d: [0.7, 0.55, -1], c: '#fff8d8', s: 0.035 } }, fog: { c: '#d0e4ee', n: 12, f: 85 }, hemi: { s: '#d6eaff', g: '#5a7a4a', i: 1.1 }, sun: { c: '#fff0c8', i: 2.3, d: [0.8, 1, 0.7] }, objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
  // campo nevado ao entardecer (frente leste)
  snow_field(p, R) {
    const o = [ground('#dfe6f2', 'snow', 220, 220, -40, 4)];
    for (let i = 0; i < 30; i++) { const x = (R() - 0.5) * 40, z = -5 - R() * 45; if (Math.abs(x) < 2 && z > -8) continue; o.push(...pine(x, z, 5 + R() * 5, '#2a4a46')); }
    for (let i = 0; i < 4; i++) o.push({ t: 'blob', p: [(i - 1.5) * 9, 0, -9 - i], s: [1.4], sc: [2.2, 0.5, 1], c: '#aab6d6', wob: 0.15, seed: i + 1 });
    return { sky: { t: '#3a4a8a', h: '#f0a8a0', sun: { d: [-0.5, 0.12, -1], c: '#fff0c8', s: 0.03, glow: 0.7 } }, fog: { c: '#c8b0c4', n: 10, f: 80 }, hemi: { s: '#a8b8f0', g: '#c8d0e8', i: 1.3 }, sun: { c: '#ffc090', i: 2.0, d: [-0.7, 0.35, 0.6] }, objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
  // ruínas (Berlim 1945): edifícios partidos, fogo, fumo
  ruins(p, R) {
    const o = [ground('#5a5258', 'cobble', 160, 160, -20, 2.4)];
    o.push(...canyon(R, { cols: ['#8a7a70', '#7a6a62', '#9a8a7a', '#7a5a52'], roof: '#3a3034', lit: 0.0, dark: '#1a1a22', roofType: 'flat', tile: 2.4, half: 7, h: [5, 13] }));
    for (const side of [-1, 1]) for (let z = 0; z > -34; z -= 7) o.push({ t: 'box', p: [side * (7 + 0.5), 9 + R() * 3, z - 3], s: [3, 2, 4], c: '#1c1c22', ink: false, rot: [0, 0, side * (18 + R() * 20)] });
    for (let i = 0; i < 12; i++) o.push({ t: 'blob', p: [(R() - 0.5) * 22, 0.3, -2 - R() * 7], s: [0.5 + R() * 0.8], sc: [1.3, 0.7, 1], c: '#6a5e5a', tex: 'stone', wob: 0.25, seed: i });
    for (const [x, z] of [[-4.2, -6], [4.6, -14], [-4.4, -22]]) o.push({ t: 'glow', p: [x, 2.2, z], r: 8, c: '#ff8a38', a: 0.7 }, { t: 'cone', p: [x, 1, z], s: [0.8, 2], c: '#ff9a3a', emit: '#ff9a3a' }, { t: 'cone', p: [x, 1.2, z], s: [0.45, 1.8], c: '#ffe06a', emit: '#ffe06a' });
    return { sky: { t: '#2a2030', h: '#c8683a', sun: { d: [0.4, 0.05, -1], c: '#ffb070', s: 0.05, glow: 0.8 } }, fog: { c: '#6a4a48', n: 6, f: 60 }, hemi: { s: '#8a7a90', g: '#3a2a2a', i: 1.0 }, sun: { c: '#ff9a60', i: 1.8, d: [0.6, 0.4, 0.5] }, lights: [{ p: [-4.2, 2, -6], c: '#ff8a38', i: 26, d: 12 }, { p: [4.6, 2, -14], c: '#ff8a38', i: 26, d: 12 }], objects: o, cam: { pos: [0, 1.75, 5.5], look: [0, 1.65, -8], fov: 56 } };
  },
  // espaço
  space(p, R) {
    const o = [{ t: 'sph', p: [-12, 9, -60], s: [18], c: '#3a6ad0', tex: 'sand', tile: 8, ink: false, seed: 11, fog: false }, { t: 'sph', p: [26, -6, -90], s: [7], c: '#c8a070', tex: 'sand', ink: false, seed: 5 }, { t: 'glow', p: [-12, 9, -58], r: 50, c: '#6aa0ff', a: 0.25 }];
    for (let i = 0; i < 14; i++) o.push({ t: 'blob', p: [(R() - 0.5) * 60, (R() - 0.2) * 20, -15 - R() * 40], s: [0.5 + R() * 1.4], c: '#6a6270', tex: 'stone', seed: i, wob: 0.3 });
    return { sky: { t: '#02030a', h: '#0a1030', b: '#02030a', stars: 2.2 }, fog: false, hemi: { s: '#8aa0ff', g: '#201830', i: 1.0 }, sun: { c: '#fff4e0', i: 2.4, d: [0.6, 0.5, 0.7] }, objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
  // interior do corpo: túnel orgânico (vaso/intestino) com células a flutuar
  body_tunnel(p, R) {
    const c = p.color || '#b8403e', o = [{ t: 'tube', p: [0, 1.5, -20], s: [7, 70], c, tex: 'flesh', tile: 4, double: true, ink: true }];
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 2 + R() * 3.6, z = -R() * 40 + 5; o.push({ t: 'sph', p: [Math.cos(a) * r, 1.5 + Math.sin(a) * r * 0.8, z], s: [0.3 + R() * 0.3], sc: [1, 0.45, 1], c: p.cell || '#e03a3a', rot: [R() * 90, R() * 90, 0], cast: false }); }
    for (let i = 0; i < 12; i++) o.push({ t: 'sph', p: [(R() - 0.5) * 5, R() * 3.2, -2 - R() * 16], s: [0.14 + R() * 0.1], c: '#fff4c0', emit: '#fff4c0', ink: false }, { t: 'glow', p: [(R() - 0.5) * 7, R() * 3.5, -3 - R() * 16], r: 1.6, c: '#ff9a7a', a: 0.4 });
    for (let i = 0; i < 7; i++) o.push({ t: 'sph', p: [(R() - 0.5) * 2.5, 0.2 + R() * 0.8, 3 + R() * 3], s: [0.4 + R() * 0.3], sc: [1, 0.45, 1], c: '#e03a3a', rot: [60 + R() * 30, R() * 90, 0], front: true });
    return { sky: { t: '#2a0808', h: '#2a0808' }, fog: { c: '#4a1010', n: 4, f: 36 }, hemi: { s: '#ffb0a0', g: '#6a1a18', i: 1.5 }, sun: { c: '#ffd0c0', i: 1.4, d: [0.3, 1, 1], ext: 12 }, lights: [{ p: [0, 3.4, 4], c: '#ff9a80', i: 40, d: 18 }, { p: [0, 2, -8], c: '#ff6a50', i: 30, d: 14 }], objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 }, hasFront: true, toonSteps: 4 };
  },
  // cavidade orgânica rosada (pulmões/estômago/cérebro)
  organ_cave(p, R) {
    const c = p.color || '#e08aa0', o = [{ t: 'tube', p: [0, 1.5, -18], s: [8, 60], c, tex: 'flesh', tile: 4, double: true }];
    for (let i = 0; i < 18; i++) { const a = R() * 6.28; o.push({ t: 'blob', p: [Math.cos(a) * 7.4, 1.5 + Math.sin(a) * 6, -2 - R() * 28], s: [1 + R() * 1.4], sc: [1, 1, 1.6], c: shadeHex(c, -0.06), tex: 'flesh', wob: 0.25, seed: i }); }
    for (let i = 0; i < 10; i++) o.push({ t: 'glow', p: [(R() - 0.5) * 8, R() * 4, -3 - R() * 20], r: 2, c: p.glow || '#ffd0e0', a: 0.35 });
    return { sky: { t: '#4a1020', h: '#4a1020' }, fog: { c: p.fogc || '#7a2a40', n: 4, f: 34 }, hemi: { s: '#ffd0e0', g: '#8a3a50', i: 1.5 }, sun: { c: '#fff', i: 1.3, d: [0.2, 1, 1], ext: 12 }, lights: [{ p: [0, 3.5, 4], c: '#ffc0d0', i: 40, d: 18 }], objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
  // hospital / clínica
  clinic(p, R) {
    const o = roomShell({ hw: 4.2, wall: '#dcecf0', wallL: '#cfe4e8', floor: '#c8dce0', floorTex: 'tile', floorTile: 1.6, zb: -9, trim: '#9ab4bc', lampC: '#e8fcff', ceil: '#d8e4e8' });
    o.push({ t: 'box', p: [0, 2.4, -8.8], s: [0.9, 0.3, 0.1], c: '#e04a4a' }, { t: 'box', p: [0, 2.4, -8.8], s: [0.3, 0.9, 0.1], c: '#e04a4a' });
    o.push(...windowL(4.0, 2.0, -3, -1, 1.8, 1.5, '#bfe6ff'));
    o.push({ t: 'box', p: [-3.0, 0.55, -5.5], s: [1.3, 0.35, 2.6], c: '#f4f4f8' }, { t: 'box', p: [-3.0, 0.2, -5.5], s: [1.1, 0.4, 2.3], c: '#6a7a8a' }, { t: 'box', p: [-3.0, 0.8, -6.5], s: [1.2, 0.3, 0.8], c: '#a8d0e8' }, { t: 'box', p: [-3.9, 1.8, -5.5], s: [0.1, 1.0, 1.4], c: '#cfe0e8' });
    o.push({ t: 'box', p: [-3.7, 1.2, -3.2], s: [0.5, 2.4, 0.9], c: '#a8c0c8', tex: 'metal' }, { t: 'box', p: [-3.2, 2.3, -3.2], s: [0.12, 0.7, 0.5], c: '#222', emit: '#5ae0a0' }, { t: 'glow', p: [-3.1, 2.3, -3.2], r: 2, c: '#5ae0a0', a: 0.5 });
    o.push({ t: 'box', p: [3.3, 0.45, -8], s: [1.6, 0.9, 1.0], c: '#e8f0f4' }, { t: 'box', p: [3.3, 0.92, -8], s: [1.7, 0.08, 1.1], c: '#8aa0a8' }, { t: 'box', p: [3.3, 2.0, -8.8], s: [1.4, 1.6, 0.08], c: '#f4f8fc' }, { t: 'box', p: [3.3, 2.0, -8.75], s: [0.5, 1.4, 0.04], c: '#e8d8c0' });
    o.push({ t: 'cyl', p: [2.0, 0.35, -2], s: [0.3, 0.7], rt: 0.34, rb: 0.24, c: '#b0603c' }, { t: 'blob', p: [2.0, 1.0, -2], s: [0.5], c: '#4a9a48', tex: 'grass', wob: 0.3 });
    return { sky: { t: '#222', h: '#222' }, fog: false, hemi: { s: '#f0fcff', g: '#8aa0a8', i: 1.1 }, sun: { c: '#fff', i: 1.0, d: [-0.4, 1, 0.8], ext: 12, target: [0, 0, -4] }, lights: [{ p: [0, 2.5, 1], c: '#e8fcff', i: 7, d: 10 }], objects: o, cam: { pos: [0, 1.55, 5.2], look: [0, 1.2, -6], fov: 58 } };
  },
  // convés/costa (mar)
  ocean(p, R) {
    const o = [{ t: 'plane', p: [0, -0.2, -60], s: [400, 300], rot: [-90, 0, 0], c: '#2a6ab0', tex: 'cloth', tile: 3, op: 1 }, { t: 'box', p: [0, -0.1, 0], s: [16, 0.3, 8], c: '#a07a4c', tex: 'plank', tile: 1.2 }, { t: 'box', p: [0, 0.8, 4], s: [16, 0.15, 0.15], c: '#6a4a2c' }];
    for (let i = -3; i <= 3; i++) o.push({ t: 'cyl', p: [i * 2.6, 0.45, 4], s: [0.09, 0.9], c: '#6a4a2c' });
    o.push({ t: 'cyl', p: [-3, 4.5, -2], s: [0.14, 9], c: '#5a3a24' }, { t: 'box', p: [-3, 5, -1.9], s: [3, 3.4, 0.05], c: '#f0e4cc', tex: 'cloth', tile: 1 }, ...cloudsFar(R, 6, 20, -130));
    return { sky: { t: '#3e86d8', h: '#d0e6f6', sun: { d: [0.5, 0.45, -1], c: '#fff8d8', s: 0.035 } }, fog: { c: '#c8dff0', n: 15, f: 120 }, hemi: { s: '#d6eaff', g: '#5a7aa0', i: 1.15 }, sun: { c: '#fff2d0', i: 2.2, d: [0.7, 1, 0.8] }, objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
  // pista de lançamento / garagem tech (fundo futurista neutro)
  tech_hall(p, R) {
    const o = [{ t: 'box', p: [0, -0.1, -2], s: [30, 0.2, 40], c: p.floor || '#2a3040', tex: 'tile', tile: 2 }, { t: 'box', p: [0, 6, -10], s: [30, 12, 0.3], c: '#1c2234', tex: 'metal', tile: 3 }];
    for (let i = -3; i <= 3; i++) o.push({ t: 'box', p: [i * 3.4, 4.5, -9.8], s: [0.25, 5, 0.2], c: p.neon || '#4ad8ff', emit: p.neon || '#4ad8ff' }, { t: 'glow', p: [i * 3.4, 4.5, -9.2], r: 4, c: p.neon || '#4ad8ff', a: 0.4 });
    for (let i = 0; i < 6; i++) o.push({ t: 'box', p: [i * 2 - 5, 0.04, -3 - i * 2], s: [0.12, 0.02, 3], c: p.neon || '#4ad8ff', emit: p.neon || '#4ad8ff', ink: false });
    return { sky: { t: '#0a0e1c', h: '#101830' }, fog: { c: '#101830', n: 6, f: 45 }, hemi: { s: '#8ab4ff', g: '#1a2038', i: 1.0 }, sun: { c: '#aac8ff', i: 1.2, d: [-0.4, 1, 0.8] }, lights: [{ p: [0, 4, -4], c: p.neon || '#4ad8ff', i: 40, d: 16 }], objects: o, cam: { pos: [0, 1.9, 4.8], look: [0, 1.75, 0], fov: 50 } };
  },
};

function shadeHex(h, k) { const n = parseInt(h.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.max(0, Math.min(255, Math.round(v + k * 255))); return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1); }

const DRESS_CFG = {
  plaza_night: { kinds: ['bench', 'plant', 'barrel', 'sign', 'lampfloor', 'puddle', 'crates'], n: 16, x: [-10, 10], z: [-9, 3] },
  city_day: { kinds: ['bench', 'plant', 'trash', 'hydrant', 'sign', 'bush', 'crates'], n: 16, x: [-11, 11], z: [-8, 3] },
  western: { kinds: ['barrel', 'crates', 'bench', 'bunting', 'sign', 'stack'], n: 14, x: [-10, 10], z: [-7, 3] },
  alley_night: { kinds: ['trash', 'crates', 'puddle', 'barrel', 'stack', 'lampfloor'], n: 14, x: [-7, 8], z: [-6, 3] },
  desert_dusk: { kinds: ['rubble', 'barrel', 'crates'], n: 7, x: [-12, 12], z: [-12, 2] },
  forest: { kinds: ['bush', 'rubble', 'bench', 'sign'], n: 14, x: [-10, 10], z: [-12, 3] },
  snow_field: { kinds: ['rubble', 'barrel', 'crates'], n: 8, x: [-10, 10], z: [-10, 2] },
  ruins: { kinds: ['rubble', 'rubble', 'barrel', 'crates', 'trash', 'lampfloor'], n: 20, x: [-10, 10], z: [-9, 3] },
  ocean: { kinds: ['barrel', 'crates', 'stack'], n: 5, x: [-6, 6], z: [-2, 3] },
  room: { kinds: ['plant'], n: 2, x: [-5, 5], z: [-4, -3] },
  classroom: { kinds: ['plant'], n: 2, x: [-6, 6], z: [-5, -4] },
  clinic: { kinds: ['plant', 'trash'], n: 3, x: [-6, 6], z: [-5, -3] },
};
for (const [k, c] of Object.entries(DRESS_CFG)) { const f = KITS[k]; KITS[k] = (p, R, u) => { const r = f(p, R, u); r.objects = [...r.objects, ...dress(R, c)]; return r; }; }
