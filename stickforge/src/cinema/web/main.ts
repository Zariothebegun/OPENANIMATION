import * as THREE from "three";
import { Stage3, FrameState } from "./world3";
import { lam, V } from "./kit3";
import { rng } from "./paint";
// @ts-ignore  (isomorphic engine module shared with the Node renderer)
import { drawCaptions } from "../../engine/captions.js";
let st: Stage3 | null = null;
let W = 0, H = 0;
const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let held: HTMLCanvasElement, cur: HTMLCanvasElement, fin: HTMLCanvasElement, whipIn: HTMLCanvasElement;
const ctx = (c: HTMLCanvasElement) => c.getContext("2d")!;
export type Post = { trans?: { kind: string; k: number } | null; exit?: { kind: string; remain: number } | null; cap?: any; capT?: number; hold?: boolean };

/** horizontal motion blur by accumulating shifted copies */
function hblur(dst: CanvasRenderingContext2D, src: HTMLCanvasElement, px: number, shift: number) {
  const N = 9; dst.save(); dst.globalCompositeOperation = "source-over";
  for (let i = 0; i < N; i++) { dst.globalAlpha = 1 / (i + 1); dst.drawImage(src, shift + (i / (N - 1) - 0.5) * px, 0); }
  dst.restore();
}
/** AI hooks: plain-JS module text -> { state(s,t,api), build(api)->Object3D, update(obj,s,t,api) } */
let hooks: any = null, hobj: THREE.Object3D | null = null, hkey = "";
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const API = () => ({
  THREE, V, rng, sm, st: st!,
  /** toon material (two-tone + inked by the engine). colour = css string */
  mat: (c: string) => lam("h:" + c, () => ({ color: c })),
  box: (w: number, h: number, d: number, c: string) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), API().mat(c)); m.castShadow = m.receiveShadow = true; return m; },
  cyl: (r: number, h: number, c: string, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), API().mat(c)); m.castShadow = m.receiveShadow = true; return m; },
  ball: (r: number, c: string) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), API().mat(c)); m.castShadow = m.receiveShadow = true; return m; },
});
function setHooks(code: string | null) {
  if (!st) return; const k = code || "";
  if (k === hkey) return; hkey = k;
  if (hobj) { st.root.remove(hobj); hobj = null; }
  hooks = null; if (!code) return;
  try { hooks = new Function("api", code)(API()); if (hooks && hooks.build) { hobj = hooks.build(API()) || null; if (hobj) st.root.add(hobj); } }
  catch (e: any) { console.error("[hooks]", e.message); hooks = null; }
}
(window as any).SF = {
  hooks(code: string | null) { setHooks(code); },
  init(w: number, h: number, o: any = {}) {
    if (st) st.dispose(); W = w; H = h; st = new Stage3(w, h, o); held = mk(w, h); cur = mk(w, h); fin = mk(w, h); whipIn = mk(w, h);
    // Keep the composited frame available as a real canvas. Playwright can capture its
    // JPEG as binary, avoiding a large base64 string crossing the browser protocol each frame.
    fin.id = "sf-final-frame";
    Object.assign(fin.style, { display: "block", width: `${w}px`, height: `${h}px` });
    document.body.replaceChildren(fin);
    return true;
  },
  toggles(t: any) { Object.assign(st!.toggles, t); },
  /** Render and composite one frame. All transition buffers are reused between frames. */
  paint(s: FrameState, post: Post = {}) {
    if (hooks) { try { const t = s.frame / s.fps; if (hooks.state) hooks.state(s, t, API()); if (hooks.update && hobj) hooks.update(hobj, s, t, API()); } catch (e: any) { console.error("[hooks]", e.message); hooks = null; } }
    st!.frame(s);
    const c = ctx(cur); c.globalAlpha = 1; c.globalCompositeOperation = "copy"; c.drawImage(st!.renderer.domElement, 0, 0); c.globalCompositeOperation = "source-over";
    if (post.hold) { const h = ctx(held); h.globalCompositeOperation = "copy"; h.drawImage(cur, 0, 0); h.globalCompositeOperation = "source-over"; }
    const f = ctx(fin); f.globalAlpha = 1; f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = "source-over";
    const tr = post.trans, ex = post.exit;
    if (tr && tr.kind === "flash") {
      f.drawImage(cur, 0, 0); f.globalAlpha = Math.pow(1 - tr.k, 1.6); f.fillStyle = "#fff"; f.fillRect(0, 0, W, H); f.globalAlpha = 1;
    } else if (tr && tr.kind === "whip") {
      const k = tr.k, sh = W * 0.55;
      f.fillStyle = "#000"; f.fillRect(0, 0, W, H);
      // outgoing slides left with blur, incoming slides in from the right with blur
      const e = k * k * (3 - 2 * k);
      f.save(); hblur(f, held, W * 0.35 * Math.sin(Math.PI * k) + 2, -sh * e); f.restore();
      const nb = ctx(whipIn); nb.globalAlpha = 1; nb.globalCompositeOperation = "copy"; nb.clearRect(0, 0, W, H); nb.globalCompositeOperation = "source-over";
      hblur(nb, cur, W * 0.35 * Math.sin(Math.PI * k) + 2, sh * (1 - e)); f.globalAlpha = e; f.drawImage(whipIn, 0, 0); f.globalAlpha = 1;
    } else if (tr && (tr.kind === "fade" || tr.kind === "cross" || tr.kind === "dissolve")) {
      f.drawImage(held, 0, 0); f.globalAlpha = tr.k; f.drawImage(cur, 0, 0); f.globalAlpha = 1;
    } else {
      f.drawImage(cur, 0, 0);
      if (ex && ex.kind === "flash") { const k = 1 - ex.remain; f.globalAlpha = Math.min(1, k * k * 1.3); f.fillStyle = "#fff"; f.fillRect(0, 0, W, H); f.globalAlpha = 1; }
    }
    if (post.cap) drawCaptions(f, W, H, post.cap, post.capT ?? 0);
  },
  /** Compatibility export for still-frame tools; the main renderer uses binary canvas capture. */
  frame(s: FrameState, post: Post = {}, q = 0.92) {
    this.paint(s, post);
    return fin.toDataURL("image/jpeg", q);
  },
  time(s: FrameState) { const a = performance.now(); st!.frame(s); const gl = st!.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return performance.now() - a; },
};
