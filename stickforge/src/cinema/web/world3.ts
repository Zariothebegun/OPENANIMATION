// world3.ts: the generic stage. One three.js scene per frame (world kit + character cards + effect cards), the skill's post chain:
// InkPass -> lens blur (pre + main, only when the shot has depth of field) -> [bloom + NEUTRAL tone map + grade] -> MSAA.
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction } from "postprocessing";
import { InkPass, NOINK, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "./grade";
import { TONE, CHAR, untone } from "./shade";
import { ctex } from "./paint";
import { cloudHD, CLOUD_DAY, CLOUD_GOLD } from "./paint";
import { L3, K3, LightName } from "./lights3";
import { Pool, Actor, Fx, Stage, CharState, FxPlace, placeChar, setSun, lidAt } from "./cast3";
import { KITS, KitInfo } from "./kits";

export type Shot = { pos: [number, number, number]; look: [number, number, number]; fov: number; roll?: number };
export type FrameState = {
  kit: string; kitOpts?: any; light: LightName; cam: Shot; dof: { focus: number | [number, number, number]; cInf: number };
  chars: CharState[]; fx?: FxPlace[]; sunFwd?: [number, number]; sunAz?: number; sunEl?: number; frame: number; fps: number;
  /** hook overrides: saturation multiplier on the grade (1 = preset), grade strength multiplier */
  sat?: number; gradeAmt?: number;
};
const discTex = () => ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

export class Stage3 {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); cam: THREE.PerspectiveCamera; root = new THREE.Group();
  composer: EffectComposer; ink: InkPass; lens: LensBlur; bloom: BloomEffect; tone: ToneMappingEffect; grade: GradeEffect;
  passLens: EffectPass[] = [];
  skyMat: THREE.ShaderMaterial; sky: THREE.Mesh; hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; fog = new THREE.Fog("#bccbec", 25, 420);
  sunDisc: THREE.Sprite; sunHalo: THREE.Sprite; clouds: THREE.Mesh[] = [];
  kits = new Map<string, { group: THREE.Group; info: KitInfo }>(); curKit: { group: THREE.Group; info: KitInfo } | null = null; curKitKey = "";
  pool = new Pool(); actors: Actor[] = []; fxs: Fx[] = [];
  res: number; W: number; H: number; frustum = new THREE.Frustum(); m4 = new THREE.Matrix4(); sph = new THREE.Sphere(); v = new THREE.Vector3();
  toggles: Record<string, boolean> = { ink: true, lens: true, bloom: true, grade: true };

  constructor(W: number, H: number, opts: { res?: number; shadow?: number; msaa?: number; canvas?: HTMLCanvasElement } = {}) {
    this.W = W; this.H = H; this.res = opts.res ?? 1;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true, canvas: opts.canvas });
    this.renderer.setPixelRatio(1); this.renderer.setSize(W, H, false);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.cam = new THREE.PerspectiveCamera(40, W / H, 0.2, 1500);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); this.root.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); this.root.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; const sh = opts.shadow ?? 2048; this.sun.shadow.mapSize.set(sh, sh);
    this.root.add(this.hemi, this.sun, this.sun.target);
    const maps = [0, 1, 2, 3].map((k) => cloudHD(k, CLOUD_DAY));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: maps[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK); this.clouds.push(m); this.root.add(m);
    }
    this.scene.add(this.root);
    // post chain (the skill's order)
    this.composer = new EffectComposer(this.renderer, { multisampling: opts.msaa ?? 4 });
    this.composer.addPass(new RenderPass(this.scene, this.cam));
    this.ink = new InkPass(this.scene, this.cam); this.composer.addPass(this.ink);
    this.lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 });
    this.passLens = [new EffectPass(this.cam, this.lens.pre), new EffectPass(this.cam, this.lens.main)];
    for (const p of this.passLens) this.composer.addPass(p);
    this.bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
    const mip = this.bloom.mipmapBlurPass; const ss = mip.setSize.bind(mip); mip.setSize = (w: number, h: number) => ss(Math.round((1920 * w) / Math.max(h, 1)), 1920);
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    this.grade = new GradeEffect(GRADES.day, GRADE_STRENGTH.day);
    this.composer.addPass(new EffectPass(this.cam, this.bloom, this.tone, this.grade));
    this.composer.setSize(W, H, false);
  }

  private kit(name: string, opts: any) {
    const key = name + JSON.stringify(opts ?? {});
    let k = this.kits.get(key);
    if (!k) {
      const g = new THREE.Group(); const make = KITS[name] ?? KITS.street;
      const info = make(g, opts ?? {}); k = { group: g, info }; this.kits.set(key, k); g.visible = false; this.root.add(g);
    }
    return k;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** pose everything for one frame and render. Returns nothing: read the canvas afterwards. */
  frame(s: FrameState) {
    const cam = this.cam, L = L3[s.light], K = K3[s.light];
    const kit = this.kit(s.kit, s.kitOpts);
    if (this.curKit && this.curKit !== kit) this.curKit.group.visible = false;
    kit.group.visible = true; this.curKit = kit;
    // camera, clamped to the kit's bounds so it never ends up inside a wall
    const b = kit.info.bounds;
    const p: [number, number, number] = [...s.cam.pos];
    if (b) { p[0] = THREE.MathUtils.clamp(p[0], b.x[0], b.x[1]); p[1] = THREE.MathUtils.clamp(p[1], b.y[0], b.y[1]); p[2] = THREE.MathUtils.clamp(p[2], b.z[0], b.z[1]); }
    cam.position.set(...p); cam.up.set(0, 1, 0); cam.lookAt(...s.cam.look); if (s.cam.roll) cam.rotateZ(s.cam.roll);
    cam.fov = s.cam.fov; cam.near = 0.2; cam.far = 1500; cam.aspect = this.W / this.H; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = this.v.set(...s.cam.look).clone(), dist = cam.position.distanceTo(focus);
    // sun frozen relative to the shot's view direction
    let fx = s.sunFwd?.[0] ?? (s.cam.look[0] - p[0]), fz = s.sunFwd?.[1] ?? (s.cam.look[2] - p[2]); const fn = Math.hypot(fx, fz) || 1; fx /= fn; fz /= fn;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    const sunDir = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    setSun(sunDir, s.light === "dusk" ? "golden" : (s.light as any));
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95); if (s.light === "golden" || s.light === "dusk") Rr = Math.max(Rr, 30);
    if (kit.info.shadowR) Rr = Math.min(Rr, kit.info.shadowR);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // sky / fog
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = kit.info.fogNear ?? L.fogNear; this.fog.far = kit.info.fogFar ?? L.fogFar; this.scene.fog = this.fog; this.scene.background = null;
    const showSun = (s.light === "golden" || s.light === "dusk") && !kit.info.enclosed; this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (const m of this.clouds) { m.visible = !kit.info.enclosed && s.light !== "night"; m.lookAt(cam.position.x, m.position.y, cam.position.z); }
    kit.info.update?.(s, this);
    // cast
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const st: Stage = { places: [], fx: [] }; const ci = { pos: cam.position, right };
    s.chars.forEach((c: any, i: number) => { c.lid = lidAt(s.frame, c.seed * 7 + i * 13, s.fps, c._swaps ?? []); placeChar(ci, c, this.res, st); });
    if (s.fx) st.fx.push(...s.fx);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    const tint = s.light === "golden" || s.light === "dusk" ? "#ffcf9e" : "#ffffff";
    for (const pl of st.places) {
      const sc2 = pl.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(pl.x, pl.y + 1.1 * sc2, pl.z), 3.5))) continue;
      const a = this.actor(ai++); const [w, h, k] = pl.size ?? [300, 500, 0.5];
      a.r = this.pool.req(pl.key, w, h, k, pl.draw); a.mesh.visible = true; a.mesh.position.set(pl.x, pl.y, pl.z);
      a.mesh.rotation.set(0, pl.yaw ?? Math.atan2(cam.position.x - pl.x, cam.position.z - pl.z), 0);
      a.mesh.scale.set(pl.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow; used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const pl of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(pl.x, pl.y, pl.z), Math.max(pl.w, pl.h)))) continue;
      const f = this.fx(fi++); f.r = this.pool.req(pl.key, pl.cw, pl.ch, 1, pl.draw); f.use(!!pl.soft); f.mesh.visible = true; f.mesh.position.set(pl.x, pl.y, pl.z);
      if (pl.flat) f.mesh.rotation.set(-Math.PI / 2, 0, pl.rot ?? 0); else { f.mesh.quaternion.copy(cam.quaternion); f.mesh.rotateZ(pl.rot ?? 0); }
      f.mesh.scale.set(pl.w, pl.h, 1); fused.push(f);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush(); for (const a of used) a.bind(); for (const f of fused) f.bind();
    noInkFallback(this.root);
    // post
    const lensOn = this.toggles.lens && s.dof.cInf >= 0.25;
    for (const p2 of this.passLens) p2.enabled = lensOn;
    if (lensOn) {
      const d = new THREE.Vector3(); cam.getWorldDirection(d);
      const fp = Array.isArray(s.dof.focus) ? new THREE.Vector3(...s.dof.focus) : focus.clone().sub(cam.position).normalize().multiplyScalar(s.dof.focus).add(cam.position);
      this.lens.focus = Math.max(0.3, fp.sub(cam.position).dot(d)); this.lens.cInf = s.dof.cInf;
    }
    this.ink.enabled = this.toggles.ink;
    const gl: "day" | "golden" = s.light === "golden" || s.light === "dusk" ? "golden" : "day";
    this.grade.set(GRADES[gl]); if (s.sat && s.sat !== 1) (this.grade.uniforms.get("gradeSat")!.value as THREE.Vector3).multiplyScalar(s.sat); this.grade.amount = GRADE_STRENGTH[gl] * (s.gradeAmt ?? 1);
    this.composer.render();
  }

  /** JPEG of the last frame (base64 data URL) */
  jpeg(q = 0.92) { return this.renderer.domElement.toDataURL("image/jpeg", q); }
  dispose() { this.composer.dispose(); this.renderer.dispose(); }
}
