// cast3.ts: character cards + effect cards as lit sprites in the 3D world (generic version of the skill's cast.ts).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts, Garm } from "./toon";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------

// ============================================================================================================
// placement logic: view (front / side / mirror), gestures, blinks, contact blobs
// ============================================================================================================
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const tmp = new THREE.Vector3();

export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3 };
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type Stage = { places: Place[]; fx: FxPlace[] };

/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]. `res` scales it (draft 0.5, final 1). */
export const tier = (d: number, res = 1): [number, number, number] => {
  const t: [number, number, number] = d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
  return [Math.round(t[0] * res), Math.round(t[1] * res), t[2] * res];
};

export type Sun = { dir: THREE.Vector3; name: "day" | "golden" | "night" | "interior" | "organ" };
const SUN: Sun = { dir: new THREE.Vector3(0.5, 0.75, -0.4).normalize(), name: "day" };
export const setSun = (dir: THREE.Vector3, name: Sun["name"]) => { SUN.dir.copy(dir).normalize(); SUN.name = name; };

/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dir.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.dir.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
/** front / side view and mirroring for someone at (x, z) heading (dx, dz); fs = foreshortening of the walk */
export const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1, hl = Math.hypot(dx, dz) || 1;
  const c = (tx * dx + tz * dz) / tl / hl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20, back: c < -0.5 };
};

/** eyelid 0 open .. 1 shut: 4-frame blink (half, shut, shut, half) every 0.5-2.3 s, per character; `swap` = a frame index where an
 *  expression change happens (a blink hides the swap) */
const LID = [0.5, 1, 1, 0.5];
export const lidAt = (frame: number, i: number, fps: number, swaps: number[] = []) => {
  const f = Math.round(frame * 30 / fps);
  for (const sf of swaps) { const k = f - Math.round(sf * 30 / fps) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 800; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); }
  return 0;
};

// ---------------- gestures ----------------
// Arms in head-height units from the shoulder (x outward, y down). Front view = both arms; side view = near/far (x forward).
export type GestName = "idle" | "talk" | "point" | "present" | "shrug" | "think" | "wave" | "hold" | "recoil" | "cheer" | "lookup";
type GF = { L?: Garm; R?: Garm }; type GS = { near?: Garm; far?: Garm };
const sw = (t: number, f: number, ph = 0) => Math.sin(2 * Math.PI * (t * f + ph));
export const gestPose = (g: GestName, t: number, seed: number): { f: GF; s: GS; tilt: number; head: number } => {
  const ph = hh(seed, 3);
  switch (g) {
    case "talk": { // small conversational motion of one hand
      const a = 0.5 + 0.5 * sw(t, 1.3, ph), b = sw(t, 0.9, ph + 0.3);
      return { f: { R: { e: [0.62 + 0.1 * a, 0.38 - 0.1 * a], h: [0.82 + 0.25 * a, 0.5 - 0.35 * a - 0.1 * b], front: true } }, s: { near: { e: [0.34, 0.38], h: [0.6 + 0.2 * a, 0.3 - 0.25 * a] } }, tilt: 1.2 * b, head: 2 * b };
    }
    case "point": {
      const k = clamp01(0.5 + 0.5 * sw(t, 0.45, ph)) * 0.12;
      return { f: { R: { e: [0.7, 0.05], h: [1.35 + k, -0.18] } }, s: { near: { e: [0.5, 0.05], h: [1.2 + k, -0.18] } }, tilt: -2, head: 4 };
    }
    case "present": { // open palm sweep to the side
      const a = 0.5 + 0.5 * sw(t, 0.5, ph);
      return { f: { R: { e: [0.85, 0.28], h: [1.25 + 0.15 * a, 0.35 - 0.12 * a] }, L: { e: [0.68, 0.5], h: [0.78, 0.72] } }, s: { near: { e: [0.45, 0.3], h: [0.95 + 0.15 * a, 0.3] } }, tilt: 1, head: -2 };
    }
    case "shrug": {
      const a = 0.5 + 0.5 * sw(t, 0.8, ph);
      return { f: { L: { e: [0.95, 0.3], h: [1.05, 0.12 - 0.08 * a], front: false }, R: { e: [0.95, 0.3], h: [1.05, 0.12 - 0.08 * a] } }, s: { near: { e: [0.3, 0.3], h: [0.55, 0.12 - 0.06 * a] }, far: { e: [0.2, 0.3], h: [0.4, 0.14] } }, tilt: 0, head: 5 * sw(t, 0.5, ph) };
    }
    case "think": { // hand to chin
      return { f: { R: { e: [0.55, 0.15], h: [0.12, -0.1], front: true } }, s: { near: { e: [0.3, 0.3], h: [0.38, -0.12] } }, tilt: 0, head: 6 };
    }
    case "wave": {
      const a = sw(t, 1.6, ph);
      return { f: { R: { e: [0.95 + 0.04 * a, -0.2], h: [1.1 + 0.3 * a, -0.62] } }, s: { near: { e: [0.4, -0.15], h: [0.55 + 0.25 * a, -0.6] } }, tilt: 0, head: 0 };
    }
    case "hold": { // holding something in front with both hands
      return { f: { L: { e: [0.55, 0.45], h: [0.28, 0.62], front: true }, R: { e: [0.55, 0.45], h: [0.28, 0.62], front: true } }, s: { near: { e: [0.3, 0.42], h: [0.5, 0.58] } }, tilt: 0, head: -2 };
    }
    case "recoil": {
      return { f: { L: { e: [0.7, 0.2], h: [0.8, -0.15] }, R: { e: [0.7, 0.2], h: [0.8, -0.15] } }, s: { near: { e: [0.2, 0.25], h: [0.4, -0.05] } }, tilt: -5, head: -4 };
    }
    case "cheer": {
      const a = sw(t, 1.4, ph);
      return { f: { L: { e: [0.75, -0.1], h: [0.95 + 0.1 * a, -0.85] }, R: { e: [0.75, -0.1], h: [0.95 - 0.1 * a, -0.85] } }, s: { near: { e: [0.3, -0.1], h: [0.45, -0.85] } }, tilt: 0, head: 0 };
    }
    case "lookup": { return { f: {}, s: {}, tilt: 0, head: -5 }; }
    default: return { f: {}, s: {}, tilt: 0, head: 0 };
  }
};

export type CharState = {
  id: string; outfit: Outfit; seed: number; x: number; y?: number; z: number;
  hx: number; hz: number;            // heading direction in the world xz plane (where the character faces / walks)
  walk: number;                       // 0 = standing, else speed in m/s
  phase: number;                      // walk cycle phase 0..1
  expr: Expr; look: number; lid: number;
  gest: GestName; gt: number;         // gesture + its local time
  scale?: number; hide?: boolean; light?: number;
};

/** one character card. Walk phase / stride come from the state; view from the camera. */
export const placeChar = (cam: CamInfo, c: CharState, res: number, out: Stage) => {
  if (c.hide) return;
  const sc = c.scale ?? 1, y = c.y ?? 0;
  const v = viewOf(cam, c.x, c.z, c.hx, c.hz);
  const d = cam.pos.distanceTo(tmp.set(c.x, y + 1.2, c.z)) / sc;
  const [w, h, k] = tier(d, res);
  const mirror = v.side && v.mirror, light = light2D(cam, mirror);
  const gp = gestPose(c.gest, c.gt, c.seed);
  const walking = c.walk > 0.05;
  const mode: any = walking ? "stroll" : "stand";
  let key: string, draw: (p: Pen) => void;
  if (v.side) {
    const so: SideOpts = { phase: walking ? c.phase : 0, expr: c.expr, mode: walking ? "march" : "stand", blink: c.lid, stomp: 1, stride: walking ? Math.min(1.2, c.walk / 1.6) * Math.max(0.2, v.fs) : 1,
      light, seed: c.seed, gest: walking ? undefined : gp.s };
    key = `S|${c.outfit.jacket}${c.outfit.hat}${c.outfit.skin}|${fkey(so)}|${w}`;
    draw = (p) => bodySide(p, c.outfit, so);
  } else {
    const fo: FrontOpts = { phase: walking ? c.phase : 0, expr: c.expr, mode, look: c.look, blink: c.lid, tilt: gp.tilt, headTilt: gp.head, light, seed: c.seed, facing: 0, gest: walking ? undefined : gp.f };
    key = `F|${c.outfit.jacket}${c.outfit.hat}${c.outfit.skin}|${fkey(fo)}|${w}`;
    draw = (p) => bodyFront(p, c.outfit, fo);
  }
  out.places.push({ key: key + "|" + (c.outfit.dress || "") + (c.outfit.pants) + (c.outfit.boots) + (c.outfit.hair || "") + (c.outfit.cap || ""), draw, x: c.x, y, z: c.z, scale: sc, mirror, size: [w, h, k] });
  blob(out, c.x, y, c.z, sc);
};

// ---------------- ground shadow under a standing card ----------------
const CONTACT: Record<string, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.2, 0.2, 0.36], interior: [0.3, 0.3, 0.42], organ: [0.28, 0.12, 0.2] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
export const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.dir.x, SUN.dir.z) || 1, ox = -SUN.dir.x / hl, oz = -SUN.dir.z / hl, rot = Math.atan2(-ox, -oz);
  if (SUN.name === "day" || SUN.name === "night") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.dir.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[SUN.name] ?? CONTACT.day, k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
