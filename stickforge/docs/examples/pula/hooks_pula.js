const P = Object.assign({ T: 0.62, H: 1.1, fg: 0, dolly: 0.03, roll: 0.03, zoom: 0, sat: 1.6, dof: 0, low: 0, kick: 0.5 }, window.__P || {});
const TH = api.THREE, sm = api.sm;
const kickAt = (t) => { const n = Math.floor(t / (P.T * 2)); const u = t - n * P.T * 2; return n > 0 ? Math.exp(-u / 0.2) * (u < 1 ? 1 : 0) : 0; };
return {
  build(api) {
    const g = new TH.Group();
    const bm = (c, o = 0) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: TH.DoubleSide });
    const ring = new TH.Mesh(new TH.RingGeometry(0.62, 0.66, 48), bm('#fff4d8')); ring.rotation.x = -Math.PI / 2; ring.name = 'ring'; ring.layers.set(3); g.add(ring);
    for (let i = 0; i < 8; i++) { const d = new TH.Mesh(new TH.SphereGeometry(0.045, 10, 8), bm('#f1e3c4')); d.name = 'dust' + i; d.layers.set(3); g.add(d); }
    for (let i = 0; i < 10; i++) { const s = new TH.Mesh(new TH.OctahedronGeometry(0.07), bm(i % 2 ? '#ffe066' : '#ffffff')); s.name = 'spark' + i; s.layers.set(3); g.add(s); }
    for (let i = 0; i < 6; i++) { const l = new TH.Mesh(new TH.BoxGeometry(0.012, 0.7, 0.012), bm('#ffffff')); l.name = 'line' + i; l.layers.set(3); g.add(l); }
    for (let i = 0; i < 14; i++) { const l = api.box(0.09, 0.015, 0.06, i % 3 ? '#e8a23a' : '#c0562a'); l.name = 'leaf' + i; g.add(l); }
    if (P.fg) { g.add(Object.assign(api.box(0.7, 1.0, 0.7, '#9a6b46'), { name: 'fg' })); g.add(Object.assign(api.cyl(0.07, 2.6, '#2b2b36', 12), { name: 'fg2' })); }
    return g;
  },
  update(g, s, t, api) {
    const m = s.chars.find((c) => c.id === 'homem'); if (!m) return;
    const ph = (t / P.T) % 1, n = Math.floor(t / P.T), since = ph * P.T, k = Math.min(1, since / 0.45), O = (x) => 1 - (1 - x) ** 3;
    const ring = g.getObjectByName('ring'); ring.position.set(m.x, 0.03, m.z); ring.scale.setScalar(0.25 + 1.5 * O(k)); ring.material.opacity = n > 0 ? 0.45 * (1 - k) ** 1.5 : 0;
    for (let i = 0; i < 8; i++) { const d = g.getObjectByName('dust' + i), a = (i / 8) * 6.283 + n, r = 0.25 + 0.9 * (1 - (1 - k) ** 2);
      d.position.set(m.x + Math.cos(a) * r, 0.1 + 0.35 * Math.sin(Math.PI * k), m.z + Math.sin(a) * r); d.scale.setScalar(0.6 + k); d.material.opacity = n > 0 ? 0.6 * (1 - k) : 0; }
    for (let i = 0; i < 10; i++) { const sp = g.getObjectByName('spark' + i), a = (i / 10) * 6.283 + n * 0.7, r = 0.2 + 1.0 * O(k), kk = Math.min(1, since / 0.6);
      sp.position.set(m.x + Math.cos(a) * r, 0.25 + 0.9 * Math.sin(Math.PI * kk) + (i % 3) * 0.12, m.z + Math.sin(a) * r * 0.6); sp.rotation.set(t * 6 + i, t * 5, 0); sp.scale.setScalar(Math.max(0.01, 1 - kk)); sp.material.opacity = n > 0 ? 0.95 * (1 - kk) : 0; }
    const rising = ph < 0.5 ? 1 : 0; for (let i = 0; i < 6; i++) { const l = g.getObjectByName('line' + i), a = (i / 6) * 6.283; l.position.set(m.x + Math.cos(a) * 0.55, m.y + 0.2 + 0.9 - (ph * 0.8), m.z + Math.sin(a) * 0.4); l.scale.y = 0.6 + 0.8 * Math.sin(Math.PI * ph); l.material.opacity = 0.3 * Math.sin(Math.PI * ph) * (ph > 0.5 ? 0.4 : 1); }
    for (let i = 0; i < 14; i++) { const l = g.getObjectByName('leaf' + i), w = t * (0.5 + (i % 4) * 0.12) + i * 1.7;
      l.position.set(m.x + Math.cos(w) * (1.9 + (i % 5) * 0.35), 0.4 + ((i * 0.37 + t * 0.4) % 2.6), m.z + Math.sin(w) * (1.6 + (i % 3) * 0.4)); l.rotation.set(w * 2, w * 3, w); }
    if (P.fg) { const c = s.cam, dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], L = Math.hypot(dx, dz) || 1, fx = dx / L, fz = dz / L, rx = -fz, rz = fx, side = P.fg;
      g.getObjectByName('fg').position.set(c.pos[0] + fx * 1.9 + rx * 1.7 * side, 0.5, c.pos[2] + fz * 1.9 + rz * 1.7 * side); g.getObjectByName('fg').rotation.y = 0.5;
      g.getObjectByName('fg2').position.set(c.pos[0] + fx * 1.9 - rx * 1.0 * side, 1.3, c.pos[2] + fz * 1.9 - rz * 1.0 * side); }
  },
  state(s, t, api) {
    const m = s.chars.find((c) => c.id === 'homem'); if (!m) return;
    const ph = (t / P.T) % 1; m.y = P.H * 4 * ph * (1 - ph); m.gest = 'cheer'; m.gt = t * 1.3; m.expr = ph < 0.1 || ph > 0.9 ? 'laugh' : 'grin';
    const c = s.cam, p = c.pos, l = c.look;
    const dx = (m.x - l[0]) * 0.85, dz = (m.z - l[2]) * 0.85; p[0] += dx; l[0] += dx; p[2] += dz; l[2] += dz;
    const kk = kickAt(t) * P.kick; const k = 1 - P.dolly * t - 0.12 * kk; for (let i = 0; i < 3; i++) p[i] = l[i] + (p[i] - l[i]) * k;   // push-in lento + rajada ease-out
    l[1] = 0.9 + 0.45 * m.y; p[1] += 0.2 * m.y - P.low * 0.35;
    const since = ph * P.T, sh = Math.max(0, 1 - since / 0.2) * 0.05 * ((s.frame & 1) ? 1 : -1) * (t > P.T ? 1 : 0); p[1] += sh; l[1] += sh * 0.5;
    c.roll = P.roll * Math.sin(t * 2.2) + P.low * 0.06; if (P.zoom) c.fov *= 1 - P.zoom * sm((t - 1.2) / 1.4);
    s.sat = P.sat;
    if (P.dof) { const d = Math.hypot(p[0] - m.x, p[1] - 1, p[2] - m.z); s.dof = { focus: d, cInf: P.dof }; }
  },
};
