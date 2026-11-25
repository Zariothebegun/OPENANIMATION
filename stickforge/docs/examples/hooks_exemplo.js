// exemplo: push-in lento + roll + um objecto 3D (caixote) em primeiro plano
return {
  build(api) { const g = new api.THREE.Group(); const c = api.box(0.9, 0.9, 0.9, '#a8724a'); c.position.set(1.6, 0.45, 1.2); c.rotation.y = 0.5; g.add(c); const b = api.ball(0.35, '#e2453c'); b.name = 'ball'; b.position.set(1.6, 1.25, 1.2); g.add(b); return g; },
  update(g, s, t, api) { g.getObjectByName('ball').position.y = 1.25 + Math.abs(Math.sin(t * 4)) * 0.4; },
  state(s, t, api) { const k = 1 - 0.04 * t; const p = s.cam.pos, l = s.cam.look; for (let i = 0; i < 3; i++) p[i] = l[i] + (p[i] - l[i]) * k; s.cam.roll = 0.05 * Math.sin(t * 0.8); },
};
