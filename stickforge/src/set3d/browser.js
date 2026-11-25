// stickforge · set3d — renderizador de cenários 3D (three.js) para correr num Chromium headless.
// Recebe uma spec JSON (kit + objectos) e devolve "placas" 2D: back (atrás das personagens) e front (à frente, com alpha).
// Estilo: toon + texturas pintadas procedurais + linhas de tinta (normais/profundidade) + neblina atmosférica + luzes emissivas.
import * as THREE from 'three';
import { KITS } from './kits.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const INK_DEFAULT = '#2a1830';

// ---------- RNG ----------
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- texturas pintadas ----------
const texCache = new Map();
function shade(hex, k) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); }
export function paintTex(kind, base = '#b0a090', seed = 3) {
  const key = kind + base + seed; if (texCache.has(key)) return texCache.get(key);
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'); const R = rng(seed * 977 + kind.length);
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  const blot = (n, a, rad) => { for (let i = 0; i < n; i++) { g.fillStyle = shade(base, (R() - 0.5) * a); g.globalAlpha = 0.25 + R() * 0.3; const x = R() * N, y = R() * N, r = rad * (0.5 + R()); for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.beginPath(); g.ellipse(x + dx, y + dy, r, r * (0.5 + R() * 0.6), R() * 3, 0, 7); g.fill(); } } g.globalAlpha = 1; };
  const line = (x1, y1, x2, y2, col, w, a = 1) => { g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = a; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.globalAlpha = 1; };
  const wrapRect = (x, y, w, h, col) => { g.fillStyle = col; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) g.fillRect(x + dx, y + dy, w, h); };
  blot(26, 0.22, 46);
  const dark = shade(base, -0.12), light = shade(base, 0.12), grout = shade(base, -0.16);
  if (kind === 'brick') { const bh = 32, bw = 64; for (let r = 0; r < N / bh; r++) for (let c = 0; c < N / bw; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0); wrapRect(x + 2, r * bh + 2, bw - 4, bh - 4, shade(base, (R() - 0.5) * 0.18)); } for (let r = 0; r <= N / bh; r++) line(0, r * bh, N, r * bh, grout, 3, 0.9); for (let r = 0; r < N / bh; r++) for (let c = 0; c < N / bw; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0); line(x, r * bh, x, r * bh + bh, grout, 3, 0.9); } }
  else if (kind === 'plank') { for (let c = 0; c < 8; c++) { wrapRect(c * 32 + 1, 0, 30, N, shade(base, (R() - 0.5) * 0.14)); line(c * 32, 0, c * 32, N, grout, 3); for (let k = 0; k < 6; k++) { const x = c * 32 + 4 + R() * 24; line(x, R() * N, x + (R() - 0.5) * 4, R() * N, dark, 1.2, 0.35); } } }
  else if (kind === 'cobble') { for (let r = 0; r < 8; r++) { let x = (r % 2) * 16; while (x < N + 40) { const w = 26 + R() * 14, h = 28; for (const dx of [-N, 0]) { g.fillStyle = shade(base, (R() - 0.5) * 0.22); g.beginPath(); g.roundRect(x + dx + 1.5, r * 32 + 2, w - 3, h, 9); g.fill(); } x += w; } } for (let r = 0; r < 8; r++) line(0, r * 32 + 1, N, r * 32 + 1, grout, 3, 0.5); }
  else if (kind === 'stone') { for (let r = 0; r < 4; r++) { let x = 0; while (x < N) { const w = 40 + R() * 50; wrapRect(x + 2, r * 64 + 2, w - 4, 60, shade(base, (R() - 0.5) * 0.16)); line(x, r * 64, x, r * 64 + 64, grout, 3); x += w; } line(0, r * 64, N, r * 64, grout, 3); } }
  else if (kind === 'tile' || kind === 'floor') { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) wrapRect(c * 64 + 2, r * 64 + 2, 60, 60, shade(base, (r + c) % 2 ? -0.05 : 0.04)); for (let i = 0; i <= 4; i++) { line(i * 64, 0, i * 64, N, grout, 2.5); line(0, i * 64, N, i * 64, grout, 2.5); } }
  else if (kind === 'roof') { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const x = c * 32 + (r % 2 ? 16 : 0); g.fillStyle = shade(base, (R() - 0.5) * 0.14); for (const dx of [-N, 0]) { g.beginPath(); g.arc(x + dx + 16, r * 32, 17, 0, Math.PI); g.fill(); g.strokeStyle = grout; g.lineWidth = 2.5; g.stroke(); } } }
  else if (kind === 'grass') { for (let i = 0; i < 700; i++) { const x = R() * N, y = R() * N; line(x, y, x + (R() - 0.5) * 6, y - 5 - R() * 9, shade(base, (R() - 0.4) * 0.3), 1.6, 0.8); } }
  else if (kind === 'sand') { for (let i = 0; i < 70; i++) { const y = R() * N; g.strokeStyle = shade(base, (R() - 0.5) * 0.14); g.globalAlpha = 0.5; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= N; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 3); g.stroke(); g.globalAlpha = 1; } }
  else if (kind === 'snow') { blot(30, 0.1, 40); }
  else if (kind === 'metal') { for (let i = 0; i < 40; i++) line(0, R() * N, N, R() * N, shade(base, (R() - 0.5) * 0.2), 2, 0.4); for (let i = 0; i < 4; i++) line(i * 64, 0, i * 64, N, grout, 2, 0.6); }
  else if (kind === 'flesh') { for (let i = 0; i < 40; i++) { g.strokeStyle = shade(base, (R() - 0.5) * 0.3); g.globalAlpha = 0.5; g.lineWidth = 2 + R() * 4; g.beginPath(); const x = R() * N, y = R() * N; g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 20, x + 50, y + 20, x + 90, y + (R() - 0.5) * 40); g.stroke(); g.globalAlpha = 1; } }
  else if (kind === 'cloth') { for (let i = 0; i <= N; i += 8) { line(i, 0, i, N, shade(base, (R() - 0.5) * 0.1), 3, 0.4); line(0, i, N, i, shade(base, (R() - 0.5) * 0.1), 3, 0.4); } }
  else if (kind === 'paper') { blot(18, 0.1, 60); }
  else if (kind === 'wall' || kind === 'plaster' || kind === 'stucco') { blot(40, 0.14, 24); for (let i = 0; i < 200; i++) line(R() * N, R() * N, R() * N, R() * N, shade(base, (R() - 0.5) * 0.12), 1.5, 0.12); }
  // pinceladas curtas
  for (let i = 0; i < 90; i++) { const x = R() * N, y = R() * N, a = R() * 6.28, l = 10 + R() * 22; line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.3, shade(base, (R() - 0.5) * 0.18), 2 + R() * 3, 0.16); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 1; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  texCache.set(key, t); return t;
}

const gradCache = new Map();
function gradMap(steps = 4, lo = 0.42) { const key = steps + '_' + lo; if (gradCache.has(key)) return gradCache.get(key); const d = new Uint8Array(steps); for (let i = 0; i < steps; i++) d[i] = Math.round(255 * (lo + (1 - lo) * (i / (steps - 1)))); const t = new THREE.DataTexture(d, steps, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; gradCache.set(key, t); return t; }

const matCache = new Map();
function material(o, S) {
  const key = JSON.stringify([o.c, o.tex, o.emit, o.glass, o.op, o.double, o.flat, o.toon]); if (matCache.has(key)) return matCache.get(key);
  const col = o.c || '#bbbbbb'; let m;
  if (o.emit) m = new THREE.MeshBasicMaterial({ color: o.emit, fog: o.fog !== false });
  else if (o.flat) m = new THREE.MeshBasicMaterial({ color: col, map: o.tex ? paintTex(o.tex, col, o.seed || 3) : null });
  else m = new THREE.MeshToonMaterial({ color: o.tex ? '#ffffff' : col, map: o.tex ? paintTex(o.tex, col, o.seed || 3) : null, gradientMap: gradMap(o.toon || S.toonSteps || 4, S.toonLo ?? 0.45) });
  if (o.op !== undefined) { m.transparent = true; m.opacity = o.op; m.depthWrite = o.op > 0.9; }
  if (o.double) m.side = THREE.DoubleSide;
  matCache.set(key, m); return m;
}

function scaleUV(geo, a, b) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * a, uv.getY(i) * b); }
function boxUV(geo, w, h, d, tile) { const uv = geo.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile); } }

// ---------- construir objectos ----------
function makeGeo(o) {
  const s = o.s || [1, 1, 1], tile = o.tile || 2;
  switch (o.t) {
    case 'box': { const g = new THREE.BoxGeometry(s[0], s[1], s[2]); boxUV(g, s[0], s[1], s[2], tile); return g; }
    case 'cyl': { const g = new THREE.CylinderGeometry(o.rt ?? s[0], o.rb ?? s[0], s[1], o.seg || 24, 1, !!o.open); scaleUV(g, Math.PI * 2 * s[0] / tile, s[1] / tile); return g; }
    case 'cone': { const g = new THREE.ConeGeometry(s[0], s[1], o.seg || 20); scaleUV(g, 2, 2); return g; }
    case 'sph': { const g = new THREE.SphereGeometry(s[0], o.seg || 24, o.seg ? o.seg : 16); scaleUV(g, 3, 2); if (o.sc) g.scale(o.sc[0], o.sc[1], o.sc[2]); return g; }
    case 'plane': { const g = new THREE.PlaneGeometry(s[0], s[1]); scaleUV(g, s[0] / tile, s[1] / tile); return g; }
    case 'torus': { const g = new THREE.TorusGeometry(s[0], o.tube ?? s[1], 12, o.seg || 28, o.arc ?? Math.PI * 2); return g; }
    case 'prism': { // telhado de duas águas: s=[w,h,d]
      const sh = new THREE.Shape(); sh.moveTo(-s[0] / 2, 0); sh.lineTo(s[0] / 2, 0); sh.lineTo(0, s[1]); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: s[2], bevelEnabled: false }); g.translate(0, 0, -s[2] / 2); scaleUV(g, 0.5, 0.5); return g; }
    case 'tube': { // interior de vaso: cilindro oco deitado ao longo de z
      const g = new THREE.CylinderGeometry(s[0], s[0], s[1], 32, 8, true); g.rotateX(Math.PI / 2); scaleUV(g, 4, s[1] / tile); return g; }
    case 'blob': { const g = new THREE.IcosahedronGeometry(s[0], 3); const r = rng(o.seed || 5); o.seed = o.seed || 5; const p = g.attributes.position; const n = o.wob ?? 0.12; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + n * (Math.sin(x * 3 + o.seed) * Math.cos(z * 3 + 1) + Math.sin(y * 4 + 2) * 0.5); p.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); if (o.sc) g.scale(o.sc[0], o.sc[1], o.sc[2]); scaleUV(g, 3, 2); return g; }
    default: throw new Error('set3d: tipo desconhecido ' + o.t);
  }
}

export function build(spec) {
  const S = spec; const scene = new THREE.Scene(); const R = rng(spec.seed || 7);
  const kit = KITS[spec.kit]; if (!kit) throw new Error('set3d: kit desconhecido "' + spec.kit + '" — ' + Object.keys(KITS).join(', '));
  const cfg = kit(spec.params || {}, R, { rng, paintTex });
  const L = { ...cfg, ...(spec.over || {}) };
  const objs = [...(cfg.objects || []), ...(spec.objects || [])];
  S.toonSteps = L.toonSteps; S.toonLo = L.toonLo;
  // fog
  const fogc = new THREE.Color(L.fog?.c || L.sky?.h || '#b8c8e0');
  if (L.fog !== false) scene.fog = new THREE.Fog(fogc, L.fog?.n ?? 8, L.fog?.f ?? 60);
  // céu (cúpula)
  const sk = L.sky || { t: '#4a7cc8', h: '#cfe0f0', b: '#cfe0f0' };
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { t: { value: new THREE.Color(sk.t) }, h: { value: new THREE.Color(sk.h) }, b: { value: new THREE.Color(sk.b || sk.h) }, stars: { value: sk.stars || 0 }, sunD: { value: new THREE.Vector3(...(sk.sun?.d || [0, 0.2, -1])).normalize() }, sunC: { value: new THREE.Color(sk.sun?.c || '#ffffff') }, sunS: { value: sk.sun ? sk.sun.s || 0.05 : 0 }, glow: { value: sk.sun?.glow ?? 0.5 } },
    vertexShader: 'varying vec3 d; void main(){ d=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 d; uniform vec3 t,h,b,sunD,sunC; uniform float stars,sunS,glow;
      float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      void main(){ float y=d.y; vec3 c = y>0. ? mix(h,t,pow(clamp(y,0.,1.),.6)) : mix(h,b,clamp(-y*3.,0.,1.));
        if(stars>0. && y>0.05){ vec3 q=floor(d*140.); float r=hash(q); if(r>1.-.012*stars) c+=vec3(1.,.95,.85)*(.5+.5*hash(q+3.)); }
        if(sunS>0.){ float a=dot(normalize(d),sunD); c=mix(c,sunC,smoothstep(1.-sunS*.6,1.-sunS*.5,a)); c+=sunC*glow*pow(max(a,0.),24.)*.5; }
        gl_FragColor=vec4(c,1.); }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), skyMat); sky.layers.set(0); sky.userData.sky = true; scene.add(sky);

  // luzes
  const hemi = L.hemi || { s: '#cfe0ff', g: '#6a5a50', i: 1.1 };
  const hl = new THREE.HemisphereLight(hemi.s, hemi.g, hemi.i); hl.layers.enableAll(); scene.add(hl);
  if (L.sun) { const d = new THREE.DirectionalLight(L.sun.c || '#fff0d0', L.sun.i ?? 2.2); const dir = L.sun.d || [0.5, 1, 0.6]; const T = L.sun.target || [0, 0, 0]; d.position.set(T[0] + dir[0] * 30, T[1] + dir[1] * 30, T[2] + dir[2] * 30); d.target.position.set(...T); scene.add(d.target); d.layers.enableAll(); d.castShadow = L.sun.shadow !== false; const sc = d.shadow.camera; const ex = L.sun.ext || 22; sc.left = -ex; sc.right = ex; sc.top = ex; sc.bottom = -ex; sc.near = 1; sc.far = 90; d.shadow.mapSize.set(1024, 1024); d.shadow.bias = -0.0006; d.shadow.normalBias = 0.04; d.shadow.radius = 3; scene.add(d); }
  for (const p of L.lights || []) { const pl = new THREE.PointLight(p.c || '#ffcc88', p.i ?? 30, p.d ?? 12, 1.6); pl.position.set(...p.p); pl.layers.enableAll(); scene.add(pl); }
  const groups = {};
  const addObj = (o) => {
    if (o.t === 'glow') { // halo aditivo
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); const c = new THREE.Color(o.c || '#ffcc77'); const rgb = [c.r, c.g, c.b].map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)).join(','); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.25, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o.a ?? 0.9, fog: false })); sp.position.set(...o.p); const k = o.r ?? 2; sp.scale.set(k, k, 1); sp.layers.set(o.front ? 3 : 2); scene.add(sp); return; }
    const mat = material(o, S), geo = makeGeo(o), m = new THREE.Object3D();
    if (o.p) m.position.set(...o.p); if (o.rot) m.rotation.set(...o.rot.map((v) => v * Math.PI / 180)); if (o.sc && o.t !== 'blob' && o.t !== 'sph') m.scale.set(...o.sc);
    m.updateMatrix(); const g2 = geo.index ? geo.toNonIndexed() : geo; g2.applyMatrix4(m.matrix);
    const cast = o.cast ?? !o.emit, recv = o.recv ?? !o.emit, noInk = o.ink === false || o.emit && o.ink !== true || o.op !== undefined && o.op < 0.9 && o.ink !== true;
    const layer = noInk ? (o.front ? 3 : 2) : o.front ? 1 : 0, key = [mat.uuid, layer, cast, recv].join('|');
    let b = batches.get(key); if (!b) batches.set(key, (b = { mat, layer, cast, recv, geos: [] })); b.geos.push(g2);
  };
  const batches = new Map(); for (const o of objs) addObj(o);
  for (const b of batches.values()) { const mg = mergeGeometries(b.geos, false); if (!mg) continue; const mesh = new THREE.Mesh(mg, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.layers.set(b.layer); mesh.frustumCulled = false; scene.add(mesh); }
  return { scene, L, groups, fogc, hasFront: objs.some((o) => o.front) || !!(L.hasFront) };
}

// ---------- renderizador com tinta ----------
let R, post, quad, rtC, rtN, size = [0, 0], ssK = 1;
const quadScene = new THREE.Scene(); const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
export function init(W, H, ss = 1.5) {
  const cv = document.createElement('canvas'); R = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  ssK = ss; size = [Math.round(W * ss), Math.round(H * ss)]; R.setSize(size[0], size[1], false); R.setPixelRatio(1);
  R.shadowMap.enabled = true; R.shadowMap.autoUpdate = false; R.shadowMap.type = THREE.PCFShadowMap; R.toneMapping = THREE.NoToneMapping;
  rtC = new THREE.WebGLRenderTarget(size[0], size[1], { samples: (window.__ms ?? 4), type: THREE.UnsignedByteType }); rtC.texture.colorSpace = THREE.LinearSRGBColorSpace;
  rtN = new THREE.WebGLRenderTarget(size[0], size[1], { depthTexture: new THREE.DepthTexture(size[0], size[1]) });
  post = new THREE.ShaderMaterial({ uniforms: { tC: { value: rtC.texture }, tN: { value: rtN.texture }, tD: { value: rtN.depthTexture }, px: { value: new THREE.Vector2(1 / size[0], 1 / size[1]) }, near: { value: 0.1 }, far: { value: 300 }, inkW: { value: 1.0 * ss }, ink: { value: new THREE.Color(INK_DEFAULT) }, fogc: { value: new THREE.Color('#fff') }, haze: { value: 0.5 }, dK: { value: 6.0 }, nK: { value: 0.55 }, front: { value: 0 }, clip: { value: 0 }, solid: { value: 0 } },
    vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: `varying vec2 v; uniform sampler2D tC,tN,tD; uniform vec2 px; uniform float near,far,inkW,haze,dK,nK,front,clip,solid; uniform vec3 ink,fogc;
      float lin(float d){ float z=d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }
      vec3 nrm(vec2 p){ return texture2D(tN,p).xyz*2.-1.; }
      void main(){ vec4 c=texture2D(tC,v); float dr=texture2D(tD,v).r; float d0=lin(dr); float e=0.; vec2 o=px*inkW;
        if(dr<0.9999 && (clip<=0. || d0<clip*0.8)){ vec3 n0=nrm(v); vec2 q1=v+vec2(o.x,0.), q2=v+vec2(0.,o.y), q3=v-vec2(o.x,0.);
          float da=texture2D(tD,q1).r, db=texture2D(tD,q2).r, dc=texture2D(tD,q3).r; float ra=lin(da), rb=lin(db), rc=lin(dc);
          e=max(e,smoothstep(0.012*dK/6.,0.05*dK/6.,max(max((ra-d0)/d0,(rb-d0)/d0),(rc-d0)/d0)));
          float na=(da<0.9999)?1.-dot(n0,nrm(q1)):0., nb=(db<0.9999)?1.-dot(n0,nrm(q2)):0.; e=max(e,smoothstep(nK*.5,nK*1.6,max(na,nb))*0.9); }
        float far01=clamp(d0/60.,0.,1.); vec3 ic=mix(ink,fogc,far01*haze); vec3 oc=mix(c.rgb,ic,e*0.92); oc=pow(max(oc,0.),vec3(1./2.2)); float fade = clip>0. ? 1.-smoothstep(clip*0.72,clip*0.97,d0) : 1.;
        gl_FragColor=vec4(oc, solid>0.5 ? 1. : max(c.a, e)*(dr<0.9999?fade:0.)); }`, depthTest: false, depthWrite: false });
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); quadScene.add(quad);
  window.__cv = cv;
}

let cur = null;
export function setScene(spec, W, H, ss) { if (!R) init(W, H, ss); R.shadowMap.needsUpdate = true; cur = build(spec); R.shadowMap.needsUpdate = true; post.uniforms.fogc.value.copy(cur.fogc); post.uniforms.ink.value.set(cur.L.ink || INK_DEFAULT); post.uniforms.haze.value = cur.L.inkHaze ?? 0.6; post.uniforms.inkW.value = (cur.L.inkW ?? 1.0) * ssK; return { front: cur.hasFront, cam: cur.L.cam || null }; }

const nrmMat = new THREE.MeshNormalMaterial();
function pass(cam, mask, transparent, clip = 0) {
  cam.far = clip || 300; cam.updateProjectionMatrix(); post.uniforms.clip.value = clip; post.uniforms.solid.value = transparent ? 0 : 1;
  const sc = cur.scene; const skyObj = sc.children.find((c) => c.userData.sky);
  // cor (+ halos)
  cam.layers.mask = mask.color; R.setRenderTarget(rtC); if (transparent) { R.setClearColor(0x000000, 0); sc.background = null; if (skyObj) skyObj.visible = false; } else { R.setClearColor(0x000000, 1); if (skyObj) skyObj.visible = true; }
  R.clear(); R.render(sc, cam); if (window.__prof) { { const gl = R.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); window.__tc = performance.now(); } }
  // normais + profundidade (sem céu, sem emissivos)
  cam.layers.mask = mask.ink; if (skyObj) skyObj.visible = false; sc.overrideMaterial = nrmMat; sc.fog = null; R.setRenderTarget(rtN); R.setClearColor(0x8080ff, 1); R.clear(); R.render(sc, cam); sc.overrideMaterial = null; sc.fog = cur.fogOn; if (skyObj) skyObj.visible = !transparent;
  R.setRenderTarget(null); post.uniforms.near.value = cam.near; post.uniforms.far.value = cam.far; R.setClearColor(0x000000, 0); R.clear(); R.render(quadScene, quadCam);
}
function grab(W, H, type, q) { const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; if (type === 'image/jpeg') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); } g.drawImage(window.__cv, 0, 0, W, H); return o.toDataURL(type, q); }

export function renderLayers(c, W, H, clip = 24) {
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.1, 300); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.updateMatrixWorld();
  cur.fogOn = cur.scene.fog; const out = {};
  pass(cam, { color: 1 | 4, ink: 1 }, false); out.far = grab(W, H, 'image/jpeg', 0.94);
  pass(cam, { color: 1 | 4, ink: 1 }, true, clip); out.mid = grab(W, H, 'image/png');
  if (cur.hasFront) { pass(cam, { color: 2 | 8, ink: 2 }, true); out.front = grab(W, H, 'image/png'); }
  return out;
}
export function renderFrame(c, W, H) {
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.1, 300); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.updateMatrixWorld();
  cur.fogOn = cur.scene.fog; const out = {};
  pass(cam, { color: 1 | 4, ink: 1 }, false); out.back = grab(W, H, 'image/jpeg', 0.9);
  if (cur.hasFront) { pass(cam, { color: 2 | 8, ink: 2 }, true); out.front = grab(W, H, 'image/png'); }
  return out;
}
export function reset() { R?.dispose(); R = null; cur = null; }
window.__dbg = () => ({ R, cur, post, rtC, rtN, quadScene, quadCam, THREE });
window.S3 = { reset, renderLayers, renderFrame, init, setScene, KITS: Object.keys(KITS) };
window.ready = true;
