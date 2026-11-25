// kits.ts: world kits built from the skill's painted materials (two-tone shading, HD hand-painted textures, ink-friendly geometry).
import * as THREE from "three";
import { Batch, lam, V, quad, tri, boxGeo, addVeg, house, STYLES, VegKind } from "./kit3";
import { grassHD, cobbleHD, stoneHD, planksHD, beamHD, roofHD, water as waterPaint, earthHD, rng, rep, ctex, brick } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";

export type KitInfo = {
  bounds?: { x: [number, number]; y: [number, number]; z: [number, number] }; shadowR?: number; fogNear?: number; fogFar?: number; enclosed?: boolean;
  update?: (s: any, st: any) => void; focusZ?: number; desc?: string;
};
export type KitFn = (g: THREE.Group, o: any) => KitInfo;

const ground = (b: Batch, mat: THREE.Material, x0: number, x1: number, z0: number, z1: number, y: number, tile: number) =>
  b.add(quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile), mat);
const emissive = (hex: string, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: true });
const lampPost = (b: Batch, x: number, z: number, h = 4.2, glow: THREE.Object3D[] = []) => {
  const iron = twoTone(new THREE.MeshLambertMaterial({ color: "#2f3340" }), 0.15);
  b.add(new THREE.CylinderGeometry(0.06, 0.09, h, 8).translate(0, h / 2, 0), iron, new THREE.Matrix4().makeTranslation(x, 0, z));
  b.add(boxGeo(V(-0.18, 0, -0.18), V(0.18, 0.5, 0.18)), iron, new THREE.Matrix4().makeTranslation(x, h, z));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), emissive("#ffd88a", 3.2)); bulb.position.set(x, h + 0.25, z); bulb.layers.set(NOINK); glow.push(bulb);
};

// ---------------------------------------------------------------- street: a painted town street receding into the distance
export const street: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 11), glow: THREE.Object3D[] = [];
  const grass = lam("grassHD", () => ({ map: grassHD() })), cob = lam("cobbleHD", () => ({ map: cobbleHD() })), walk = lam("walkHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
  const wall = lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
  const Z0 = 24, Z1 = -150, W = o.width ?? 4.2;
  ground(b, grass, -400, 400, -420, 120, -0.02, 6);
  ground(b, cob, -W, W, Z1, Z0, 0.0, 2.6);
  for (const s of [-1, 1]) {
    ground(b, walk, s * W, s * (W + 1.9), Z1, Z0, 0.0, 1.8);
    b.add(boxGeo(V(Math.min(s * W, s * (W + 0.18)), 0, Z1), V(Math.max(s * W, s * (W + 0.18)), 0.16, Z0), 1.2), walk);
    // houses along the street, front facing the road
    let z = Z0 - 2;
    for (let i = 0; z > Z1 + 8; i++) {
      const w = 6 + Math.floor(r() * 5), d = 7 + Math.floor(r() * 3), h = 6 + Math.floor(r() * 4) * 1.4 + (z < -50 ? r() * 3 : 0);
      const setback = W + 2.1 + (i % 4 === 3 ? 2.2 : 0);
      house(b, s * (setback + d / 2), z - w / 2, s > 0 ? -Math.PI / 2 : Math.PI / 2, w, d, h, Math.floor(r() * 7) + (s > 0 ? 3 : 0), 0);
      if (i % 4 === 3) addVeg(b, r() < 0.5 ? "round" : "tall", s * (W + 2.9), 0, z - w / 2, 4 + r() * 2.2, 100 + i * 7 + s, z < -40 ? 2 : 0);
      if (i % 3 === 1) lampPost(b, s * (W + 0.6), z - w / 2 + 2, 4.2, glow);
      z -= w + 0.15 + r() * 0.9;
    }
    // street trees between houses and a tall back-row for depth
    for (let k = 0; k < 14; k++) addVeg(b, r() < 0.6 ? "round" : "tall", s * (W + 14 + r() * 18), 0, 10 - k * 11 + r() * 5, 7 + r() * 5, 300 + k * 5 + s, 3);
  }
  // cross-street closure: a long row of houses + a stone tower at the end, hills behind
  for (let i = -3; i <= 3; i++) house(b, i * 9.5, -156, 0, 8.5, 8, 7 + (i & 1) * 2.8, i + 4, 0);
  b.add(boxGeo(V(-3, 0, -165), V(3, 24, -158), 3), lam("towerHD", () => ({ map: stoneHD("towerHD") })));
  const cone = new THREE.ConeGeometry(4.4, 7, 4); cone.rotateY(Math.PI / 4); b.add(cone, lam("roof#8f97a8", () => ({ map: roofHD("#8f97a8", true), side: THREE.DoubleSide })), new THREE.Matrix4().makeTranslation(0, 27.5, -161.5));
  for (let k = 0; k < 9; k++) { const a = new THREE.SphereGeometry(1, 24, 10); b.add(a, lam("hill" + k, () => ({ color: ["#7fb35a", "#6aa650", "#8dbd62"][k % 3] })), new THREE.Matrix4().compose(V(-260 + k * 65, -14, -330 - (k % 3) * 40), new THREE.Quaternion(), V(120, 46 + (k % 4) * 8, 60))); }
  b.build(g); for (const m of glow) g.add(m);
  return { bounds: { x: [-W - 1.6, W + 1.6], y: [0.5, 40], z: [-130, 30] }, shadowR: 60, fogNear: 55, fogFar: 520, desc: "rua de cidade pintada em perspectiva, casas dos dois lados, torre ao fundo" };
};

/** Story locations. Each kit is static, merged by material and seeded, so changing a scene doesn't
 * rebuild geometry per frame and repeated prompts remain visually reproducible. */
export const forest: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 31);
  const grass = lam("grassHD", () => ({ map: grassHD() }));
  const path = lam("forestPath", () => ({ map: earthHD("forestPath", "#594632", ["#765f43", "#8c7150", "#3e392d", "#9c8056"]) }));
  const pineLeaf = lam("forestPine", () => ({ map: grassHD(), color: "#6c9c52" }));
  const bark = lam("forestBark", () => ({ map: beamHD() }));
  ground(b, grass, -220, 220, -240, 80, -0.02, 7);
  // A continuous trail gives the camera a clear foreground-to-background guide line.
  ground(b, path, -0.95, 0.95, -180, 30, 0.015, 2.3);
  const pine = (x: number, z: number, h: number) => {
    const trunk = new THREE.CylinderGeometry(0.12, 0.23, h * 0.28, 7).translate(0, h * 0.14, 0);
    b.add(trunk, bark, new THREE.Matrix4().makeTranslation(x, 0, z));
    for (let tier = 0; tier < 4; tier++) {
      const y = h * (0.28 + tier * 0.17), height = h * (0.47 - tier * 0.035), radius = h * (0.27 - tier * 0.045);
      const crown = new THREE.ConeGeometry(radius, height, 7);
      b.add(crown, pineLeaf, new THREE.Matrix4().makeTranslation(x, y, z));
    }
  };
  // Keep trees out of the near lens cone and mix round canopies with pines so a
  // portrait close-up gets layered foliage instead of a wall of giant triangles.
  for (let side of [-1, 1]) for (let z = 4, i = 0; z > -150; z -= 8 + r() * 6, i++) {
    const x = side * (9 + r() * 8), h = 6 + r() * 4.5, seed = 2500 + i * 19 + side * 7;
    if (r() < 0.28) pine(x, z, h); else addVeg(b, r() < 0.58 ? "round" : "tall", x, 0, z, h, seed, z < -55 ? 2 : 0);
    if (i % 2 === 0) addVeg(b, "bush", x + side * (1.5 + r() * 1.6), 0, z - 3, 1.2 + r() * 1.2, 2500 + i * 11, z < -55 ? 2 : 1);
  }
  // Distant layered hills give the lens blur something behind the trees.
  for (let i = 0; i < 9; i++) {
    const x = -180 + i * 45, rad = 34 + r() * 18;
    const geo = new THREE.SphereGeometry(1, 16, 10);
    b.add(geo, lam("forestHill" + i, () => ({ color: ["#567c4a", "#638750", "#78945b"][i % 3] })), new THREE.Matrix4().compose(V(x, -13, -188 - r() * 22), new THREE.Quaternion(), V(rad, 28 + r() * 20, 18)));
  }
  b.build(g);
  return { bounds: { x: [-14, 14], y: [0.5, 30], z: [-138, 26] }, shadowR: 45, fogNear: 24, fogFar: 210, desc: "pintada forest trail with a clear subject lane, layered trees and hills" };
};

export const mountain: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 73);
  const turf = lam("mountainTurf", () => ({ map: grassHD() }));
  const rockColors = ["#747875", "#85847d", "#999487", "#696e70", "#a39d8e"];
  ground(b, turf, -260, 260, -260, 70, -0.02, 9);
  // An open trail keeps the actors legible; the nearer, offset peaks make the set read
  // clearly in the narrow horizontal field of view of a portrait camera.
  const trail = lam("mountainTrail", () => ({ map: earthHD("mountainTrail", "#655744", ["#86765d", "#72634e", "#9b8768", "#514b40"]) }));
  ground(b, trail, -1.8, 1.8, -110, 26, 0.005, 4);
  // Peaks sit well behind the action so wide silhouettes frame the trail instead of
  // turning into close-up stone walls in portrait shots.
  for (let i = 0; i < 19; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), z = -78 - row * 14, x = side * (24 + r() * 18), h = 14 + r() * 12;
    const radius = 8 + r() * 5;
    const geo = new THREE.ConeGeometry(radius, h, 8 + (i % 4), 2);
    geo.rotateY(r() * Math.PI);
    b.add(geo, lam("mountainRock" + (i % 5), () => ({ color: rockColors[i % rockColors.length] })), new THREE.Matrix4().makeTranslation(x, h / 2 - 1, z));
    if (i % 2 === 0) {
      const cap = new THREE.ConeGeometry(radius * 0.34, h * 0.2, 8);
      cap.rotateY(Math.PI / 6); b.add(cap, lam("snowCap" + i, () => ({ color: "#e4e9e6" })), new THREE.Matrix4().makeTranslation(x, h * 0.88, z));
    }
  }
  // A low, distant ridge breaks the skyline into layers without blocking the camera's subject lane.
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.SphereGeometry(1, 20, 12), x = -145 + i * 48, scale = 45 + r() * 18;
    b.add(geo, lam("mountainRidge" + i, () => ({ color: ["#777b78", "#85877f", "#999586"][i % 3] })),
      new THREE.Matrix4().compose(V(x, -20, -205 - r() * 24), new THREE.Quaternion(), V(scale, 42 + r() * 16, 24)));
  }
  b.build(g);
  return { bounds: { x: [-16, 16], y: [0.5, 36], z: [-90, 24] }, shadowR: 70, fogNear: 85, fogFar: 330, desc: "painted mountain pass with layered peaks, snow caps and an open trail" };
};

type RoomKind = "bedroom" | "kitchen" | "clinic" | "livingroom";
/** Reusable, batched interiors for semantic locations that used to fall back to one cabin. */
const roomInterior = (g: THREE.Group, o: any, kind: RoomKind): KitInfo => {
  const b = new Batch(), r = rng(o.seed ?? kind.length * 701);
  const floor = lam("roomFloor_" + kind, () => ({ map: planksHD(), color: kind === "clinic" ? "#d4d9d3" : "#fff0d8" }));
  const wall = lam("roomWall_" + kind, () => ({ color: ({ bedroom: "#c7b3a2", kitchen: "#dfd1b8", clinic: "#d7e2df", livingroom: "#c9b79d" } as Record<RoomKind, string>)[kind] }));
  const wood = lam("roomWood_" + kind, () => ({ map: beamHD() }));
  const fabric = lam("roomFabric_" + kind, () => ({ color: ({ bedroom: "#647aa5", kitchen: "#bd8258", clinic: "#eef4f2", livingroom: "#5b7772" } as Record<RoomKind, string>)[kind] }));
  const glass = lam("roomWindow_" + kind, () => ({ color: kind === "bedroom" ? "#253d66" : "#79a9c0", emissive: new THREE.Color(kind === "bedroom" ? "#172749" : "#314858"), emissiveIntensity: 0.22 }));
  b.add(boxGeo(V(-5, -0.18, -8), V(5, 0, 6), 1.4), floor);
  b.add(boxGeo(V(-5, 0, -8), V(5, 3.9, -7.72), 2), wall);
  b.add(boxGeo(V(-5, 0, -8), V(-4.72, 3.9, 6), 2), wall);
  b.add(boxGeo(V(4.72, 0, -8), V(5, 3.9, 6), 2), wall);
  b.add(boxGeo(V(-5, 3.72, -8), V(5, 3.95, 6), 1.4, true), floor);
  // A framed window gives the back wall a readable exterior and a clear light source.
  b.add(boxGeo(V(-3.55, 1.55, -7.66), V(-0.65, 3.05, -7.48), 0), glass);
  for (const x of [-3.72, -0.48]) b.add(boxGeo(V(x, 1.42, -7.78), V(x + 0.16, 3.18, -7.55), 1), wood);
  for (const y of [1.42, 3.04]) b.add(boxGeo(V(-3.72, y, -7.78), V(-0.48, y + 0.14, -7.55), 1), wood);
  b.add(boxGeo(V(-2.2, 1.42, -7.77), V(-2.06, 3.06, -7.55), 1), wood);
  b.add(boxGeo(V(-3.7, 2.18, -7.77), V(-0.5, 2.32, -7.55), 1), wood);
  // Low wall trim and ceiling beams add depth without introducing per-frame work.
  for (const y of [0.22, 3.55]) b.add(boxGeo(V(-4.7, y, -7.53), V(4.7, y + 0.1, -7.38), 1), wood);
  for (const z of [-6.2, -2.2, 1.8, 5.2]) b.add(boxGeo(V(-4.7, 3.56, z - 0.09), V(4.7, 3.75, z + 0.09), 1), wood);

  if (kind === "bedroom") {
    // Bed, quilt, pillow, nightstands and a shaded bedside lamp.
    b.add(boxGeo(V(1.15, 0.18, -4.55), V(4.35, 0.72, 0.25), 1), wood);
    b.add(boxGeo(V(1.28, 0.72, -4.38), V(4.22, 0.92, 0.15), 0), fabric);
    b.add(boxGeo(V(1.45, 0.94, -4.22), V(2.45, 1.05, -3.35), 0), lam("bedPillow", () => ({ color: "#e9ddc5" })));
    b.add(boxGeo(V(3.1, 0.93, -1.0), V(4.0, 1.12, -0.35), 0), lam("bedBlanket", () => ({ color: "#9a5d4f" })));
    b.add(boxGeo(V(-4.25, 0.18, -3.55), V(-2.8, 0.78, -2.15), 1), wood);
    b.add(boxGeo(V(-3.65, 0.78, -3.0), V(-3.4, 1.6, -2.75), 0), lam("bedLamp", () => ({ color: "#ffcf7d", emissive: new THREE.Color("#c77828"), emissiveIntensity: 0.45 })));
    // Oversized analog clock on the wall for the story and as a useful close-up target.
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28), new THREE.MeshBasicMaterial({ color: "#f1e4ca" }));
    clock.position.set(2.9, 2.62, -7.53); clock.layers.set(NOINK); g.add(clock);
    for (const [x1, y1, x2, y2] of [[2.9, 2.62, 2.64, 2.83], [2.9, 2.62, 3.2, 2.62]]) {
      const hand = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([V(x1, y1, -7.51), V(x2, y2, -7.51)]), new THREE.LineBasicMaterial({ color: "#34251d" })); hand.layers.set(NOINK); g.add(hand);
    }
  } else if (kind === "kitchen") {
    b.add(boxGeo(V(-4.2, 0.2, -6.7), V(0.2, 1.1, -5.4), 1), wood);
    b.add(boxGeo(V(-4.28, 1.1, -6.76), V(0.28, 1.26, -5.35), 0), lam("kitchenCounter", () => ({ color: "#c9c0ac" })));
    for (const x of [-3.7, -1.2]) b.add(boxGeo(V(x, 1.28, -6.55), V(x + 1.7, 2.25, -5.55), 1), lam("kitchenCabinet", () => ({ color: "#e8ddc6" })));
    b.add(boxGeo(V(2.45, 0.2, -6.45), V(4.4, 2.65, -4.75), 1), lam("kitchenFridge", () => ({ color: "#aebcc0" })));
    b.add(boxGeo(V(0.6, 0.68, -0.6), V(3.45, 0.83, 1.2), 1), wood);
    for (const x of [0.85, 3.15]) for (const z of [-0.35, 0.95]) b.add(boxGeo(V(x - 0.08, 0, z - 0.08), V(x + 0.08, 0.68, z + 0.08), 0), wood);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.34, 16), new THREE.MeshLambertMaterial({ color: "#ead8c4" }));
    mug.position.set(1.5, 1.0, 0.2); mug.castShadow = true; g.add(mug);
  } else if (kind === "clinic") {
    b.add(boxGeo(V(-4.3, 0.18, -6.6), V(1.0, 0.92, -5.15), 1), lam("clinicCounter", () => ({ color: "#edf2eb" })));
    b.add(boxGeo(V(-4.25, 0.92, -6.55), V(1.05, 1.08, -5.1), 0), wood);
    b.add(boxGeo(V(1.4, 0.55, -4.7), V(4.2, 0.78, -2.55), 1), lam("clinicBed", () => ({ color: "#eef5ee" })));
    b.add(boxGeo(V(1.45, 0.78, -4.52), V(4.15, 0.9, -2.62), 0), fabric);
    b.add(boxGeo(V(2.1, 1.0, -7.65), V(3.85, 2.9, -7.48), 0), lam("clinicChart", () => ({ color: "#f5f5e9" })));
    for (let i = 0; i < 4; i++) b.add(boxGeo(V(2.3, 1.28 + i * 0.3, -7.45), V(3.65, 1.36 + i * 0.3, -7.4), 0), lam("clinicChartLine" + i, () => ({ color: i === 0 ? "#5b9f9c" : "#88999c" })));
    b.add(boxGeo(V(-3.5, 1.15, -5.8), V(-1.7, 2.6, -4.4), 1), lam("clinicScreen", () => ({ color: "#dce9e6", transparent: true, opacity: 0.8 })));
  } else {
    // Living room sofa, cushions, coffee table and a standing light.
    b.add(boxGeo(V(-4.35, 0.12, -4.6), V(-0.7, 0.75, -1.2), 1), wood);
    b.add(boxGeo(V(-4.42, 0.75, -4.65), V(-0.62, 1.72, -4.0), 0), fabric);
    b.add(boxGeo(V(-4.32, 0.75, -1.8), V(-0.78, 1.45, -1.15), 0), fabric);
    b.add(boxGeo(V(0.8, 0.42, -3.0), V(3.8, 0.56, -1.2), 1), wood);
    b.add(boxGeo(V(2.5, 0.18, 1.2), V(4.35, 2.8, 1.5), 1), lam("livingShelf", () => ({ color: "#8c6042" })));
    for (let y = 0.75; y < 2.4; y += 0.8) b.add(boxGeo(V(2.52, y, 1.52), V(4.33, y + 0.1, 1.68), 0), wood);
  }
  b.build(g);
  return { bounds: { x: [-4.2, 4.2], y: [0.55, 3.55], z: [-6.7, 5.8] }, shadowR: 28, fogNear: 16, fogFar: 55, enclosed: true, desc: `textured ${kind} interior with furnished set dressing and a framed window` };
};
export const bedroom: KitFn = (g, o) => roomInterior(g, o, "bedroom");
export const kitchen: KitFn = (g, o) => roomInterior(g, o, "kitchen");
export const clinic: KitFn = (g, o) => roomInterior(g, o, "clinic");
export const livingroom: KitFn = (g, o) => roomInterior(g, o, "livingroom");

export const cabin: KitFn = (g, o) => {
  const b = new Batch();
  const floor = lam("cabinFloor", () => ({ map: planksHD() }));
  const walls = lam("cabinWall", () => ({ map: brick("#b78f69") }));
  const wood = lam("cabinWood", () => ({ map: beamHD() }));
  b.add(boxGeo(V(-5, -0.15, -11), V(5, 0, 7), 1.4), floor);
  b.add(boxGeo(V(-5, 0, -11), V(5, 4.4, -10.7), 2), walls);
  b.add(boxGeo(V(-5, 0, -11), V(-4.75, 4.4, 7), 2), walls);
  b.add(boxGeo(V(4.75, 0, -11), V(5, 4.4, 7), 2), walls);
  // Close the room overhead; planks and cross beams prevent the camera from seeing
  // the default sky when it tilts up during the cabin shot.
  b.add(boxGeo(V(-5, 4.25, -11), V(5, 4.5, 7), 1.5, true), floor);
  for (const z of [-9, -4, 1, 6]) b.add(boxGeo(V(-5, 4.15, z - 0.12), V(5, 4.42, z + 0.12), 1), wood);
  // Exposed timber, a warm window and furniture make the location read as a room, not a fallback street.
  for (const x of [-4.7, 0, 4.7]) b.add(boxGeo(V(x - 0.12, 0, -10.55), V(x + 0.12, 4.35, -10.35), 1), wood);
  b.add(boxGeo(V(-1.6, 1.5, -10.3), V(1.6, 3.25, -10.1), 0), lam("cabinWindow", () => ({ color: "#efb968", emissive: new THREE.Color("#b66b32"), emissiveIntensity: 0.65 })));
  for (const x of [-1.78, 0, 1.78]) b.add(boxGeo(V(x - 0.1, 1.38, -10.43), V(x + 0.1, 3.38, -10.25), 1), wood);
  for (const y of [1.38, 3.28]) b.add(boxGeo(V(-1.85, y, -10.43), V(1.85, y + 0.14, -10.25), 1), wood);
  b.add(boxGeo(V(-2.2, 0.18, -2.7), V(2.2, 0.42, 0.2), 1), wood);
  b.add(boxGeo(V(2.7, 0.12, -6.8), V(4.1, 0.92, -4.8), 1), floor);
  b.build(g);
  return { bounds: { x: [-4.1, 4.1], y: [0.5, 3.9], z: [-9.5, 5.5] }, shadowR: 24, fogNear: 18, fogFar: 60, enclosed: true, desc: "warm timber cabin interior with window, table and bed" };
};

const riverWaterMap = rep(waterPaint(), 1.8, 30);
export const river: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 109);
  const grass = lam("riverGrass", () => ({ map: grassHD() }));
  const water = lam("riverWater", () => ({ map: riverWaterMap, color: "#b7dbe7", emissive: new THREE.Color("#142b39"), emissiveIntensity: 0.08 }));
  const bank = lam("riverBank", () => ({ map: stoneHD("riverBank", ["#9a8c73", "#b3a17f", "#7f796b", "#c1ad86"], "#5d574b") }));
  ground(b, grass, -220, 220, -240, 70, -0.02, 8);
  // A diagonal river plus exposed banks establishes a different location silhouette in one inexpensive set.
  const riverRotation = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -0.12)
    .multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2));
  b.add(new THREE.PlaneGeometry(9, 230), water, new THREE.Matrix4().compose(V(1.8, 0.015, -82), riverRotation, V(1, 1, 1)));
  ground(b, bank, -5.2, -3.5, -196, 30, 0.025, 1.8);
  ground(b, bank, 6.5, 8.2, -196, 30, 0.025, 1.8);
  for (let i = 0; i < 42; i++) {
    const side = i % 2 ? 1 : -1, z = 18 - i * 4.6, x = (side < 0 ? -1.6 : 5.1) + (r() - 0.5) * 1.1;
    const geo = new THREE.IcosahedronGeometry(0.35 + r() * 0.65, 1);
    b.add(geo, bank, new THREE.Matrix4().compose(V(x, 0.18 + r() * 0.22, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r(), r())), V(1 + r(), 0.65 + r() * 0.5, 0.8 + r())));
  }
  for (const side of [-1, 1]) for (let z = 20, i = 0; z > -120; z -= 11 + r() * 9, i++)
    addVeg(b, i % 2 ? "round" : "tall", side * (8 + r() * 9), 0, z, 5 + r() * 5, 900 + i * 19 + side, z < -45 ? 2 : 0);
  b.build(g);
  return {
    bounds: { x: [-14, 14], y: [0.5, 28], z: [-128, 26] }, shadowR: 45, fogNear: 32, fogFar: 190,
    update: (s) => { riverWaterMap.offset.y = ((s.frame / s.fps) * 0.018) % 1; },
    desc: "painted forest river with moving water, stony banks and trees",
  };
};

/** Open public square: radial paving, central fountain, benches and lamps. */
export const plaza: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 211), paving = lam("plazaPaving", () => ({ map: cobbleHD() }));
  const stone = lam("plazaStone", () => ({ map: stoneHD("plazaStone", ["#d5c4a4", "#c5b291", "#dfcfb1", "#bba985"], "#8f806a") }));
  const water = lam("plazaFountain", () => ({ color: "#5eacc8", emissive: new THREE.Color("#163b4b"), emissiveIntensity: 0.1 }));
  const iron = lam("plazaIron", () => ({ color: "#354454" }));
  ground(b, paving, -44, 44, -100, 28, 0, 4);
  ground(b, lam("plazaGrass", () => ({ map: grassHD() })), -160, 160, -180, 100, -0.08, 8);
  // Fountain basin with a low lip leaves a clear route through the scene.
  const basin = new THREE.CylinderGeometry(3.5, 3.9, 0.42, 32); basin.translate(0, 0.28, -15); b.add(basin, stone);
  const pool = new THREE.CylinderGeometry(3.05, 3.05, 0.08, 32); pool.translate(0, 0.5, -15); b.add(pool, water);
  const pedestal = new THREE.CylinderGeometry(0.55, 0.8, 1.8, 12); pedestal.translate(0, 1.4, -15); b.add(pedestal, stone);
  const bowl = new THREE.CylinderGeometry(0.18, 1.25, 0.42, 16); bowl.translate(0, 2.45, -15); b.add(bowl, stone);
  for (const side of [-1, 1]) {
    // Backdrop blocks read as surrounding civic buildings without closing the square.
    for (let i = 0; i < 5; i++) {
      const x = side * (12 + i * 6), h = 8 + r() * 5;
      b.add(boxGeo(V(x - 4, 0, -62 - r() * 10), V(x + 4, h, -56 - r() * 12), 2), lam("plazaFacade" + i, () => ({ color: ["#d8bb90", "#ba947a", "#e3d0ab"][i % 3] })));
      for (const y of [2.6, 5.3, 8.0]) if (y < h - 0.6) b.add(boxGeo(V(x - 2.5, y, -55.8), V(x - 0.8, y + 1.4, -55.65), 0), lam("plazaWindow" + i, () => ({ color: "#587991" })));
    }
    for (let i = 0; i < 3; i++) {
      const z = 10 - i * 14;
      // benches: seat + back + two legs
      b.add(boxGeo(V(side * 15 - 1.5, 0.75, z - 0.35), V(side * 15 + 1.5, 0.95, z + 0.35), 0), woodMat());
      b.add(boxGeo(V(side * 15 - 1.5, 0.98, z - 0.32), V(side * 15 + 1.5, 1.72, z - 0.1), 0), woodMat());
      for (const x of [side * 15 - 1.1, side * 15 + 1.1]) b.add(new THREE.BoxGeometry(0.12, 0.75, 0.12).translate(x, 0.38, z), iron);
    }
    for (let i = 0; i < 5; i++) {
      const x = side * (7 + r() * 22), z = 15 - i * 24;
      b.add(new THREE.CylinderGeometry(0.075, 0.11, 4.1, 8).translate(x, 2.05, z), iron);
      b.add(new THREE.BoxGeometry(0.58, 0.5, 0.42).translate(x, 4.3, z), lam("plazaLamp", () => ({ color: "#ffd17c", emissive: new THREE.Color("#d89130"), emissiveIntensity: 0.3 })));
    }
  }
  b.build(g);
  return { bounds: { x: [-26, 26], y: [0.55, 12], z: [-75, 22] }, shadowR: 55, fogNear: 40, fogFar: 240, desc: "open town square with a stone fountain, benches and lamps" };
};
const woodMatCache = new Map<string, THREE.Material>();
const woodMat = () => {
  let m = woodMatCache.get("plazaBench");
  if (!m) { m = lam("plazaBenchWood", () => ({ map: beamHD() })); woodMatCache.set("plazaBench", m); }
  return m;
};

/** Layered sand dunes and cactus silhouettes make desert prompts a real place, not a mountain alias. */
export const desert: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 307), sand = lam("desertSand", () => ({ map: earthHD("desertSand", "#bd8c54", ["#dfb875", "#c79559", "#a97a49", "#e7c681"]) }));
  const duneCols = ["#c89b62", "#d6aa6e", "#b98752", "#dcb77d"];
  ground(b, sand, -260, 260, -320, 80, -0.03, 10);
  for (let i = 0; i < 11; i++) {
    const x = -180 + i * 36, z = -110 - r() * 125, sx = 28 + r() * 26, sy = 8 + r() * 9, sz = 18 + r() * 14;
    const hill = new THREE.SphereGeometry(1, 22, 14);
    b.add(hill, lam("desertDune" + (i % 4), () => ({ color: duneCols[i % duneCols.length] })), new THREE.Matrix4().compose(V(x, sy * 0.45 - 1.5, z), new THREE.Quaternion(), V(sx, sy, sz)));
  }
  const cactus = (x: number, z: number, h: number) => {
    const green = lam("desertCactus", () => ({ color: "#4d7850" }));
    b.add(new THREE.CylinderGeometry(0.36, 0.48, h, 10).translate(0, h / 2, 0), green, new THREE.Matrix4().makeTranslation(x, 0, z));
    const arm = new THREE.CylinderGeometry(0.22, 0.28, h * 0.32, 8).rotateZ(Math.PI / 2).translate(h * 0.15, h * 0.5, 0);
    b.add(arm, green, new THREE.Matrix4().makeTranslation(x, 0, z));
    b.add(new THREE.CylinderGeometry(0.2, 0.23, h * 0.24, 8).translate(h * 0.31, h * 0.62, 0), green, new THREE.Matrix4().makeTranslation(x, 0, z));
  };
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, z = 20 - i * 10.5, x = side * (8 + r() * 25);
    if (i % 3 === 0) cactus(x, z, 2.4 + r() * 2.2);
    else {
      const rock = new THREE.IcosahedronGeometry(1.1 + r() * 1.1, 1);
      b.add(rock, lam("desertRock" + (i % 3), () => ({ color: ["#88745c", "#a28b6d", "#756751"][i % 3] })), new THREE.Matrix4().compose(V(x, 0.45, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r(), r())), V(1.2, 0.75, 1)));
    }
  }
  b.build(g);
  return { bounds: { x: [-20, 20], y: [0.55, 26], z: [-100, 24] }, shadowR: 62, fogNear: 55, fogFar: 320, desc: "wide desert trail with sand dunes, cactus and scattered rocks" };
};

/** Snow forest with pale ground, layered white peaks and dark pines for readable silhouettes. */
export const snow: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 401), groundMat = lam("snowGround", () => ({ color: "#e6edf0" }));
  const pineMat = lam("snowPine", () => ({ color: "#31564d" })), snowMat = lam("snowCapMat", () => ({ color: "#f3f5f2" }));
  const barkMat = lam("snowBark", () => ({ color: "#675447" }));
  ground(b, groundMat, -320, 320, -330, 80, -0.02, 9);
  for (let i = 0; i < 9; i++) {
    const x = -150 + i * 37, z = -115 - r() * 40, h = 22 + r() * 18, rad = 18 + r() * 12;
    const rock = new THREE.ConeGeometry(rad, h, 8 + i % 3, 2);
    b.add(rock, lam("snowPeak" + i, () => ({ color: i % 2 ? "#8ea4af" : "#aebdc2" })), new THREE.Matrix4().makeTranslation(x, h / 2 - 1, z));
    const cap = new THREE.ConeGeometry(rad * 0.35, h * 0.2, 8);
    b.add(cap, snowMat, new THREE.Matrix4().makeTranslation(x, h * 0.91, z));
  }
  for (const side of [-1, 1]) for (let z = 16, i = 0; z > -130; z -= 10 + r() * 8, i++) {
    const x = side * (8 + r() * 11), h = 6 + r() * 6;
    b.add(new THREE.CylinderGeometry(0.12, 0.25, h * 0.4, 7).translate(0, h * 0.2, 0), barkMat, new THREE.Matrix4().makeTranslation(x, 0, z));
    for (let k = 0; k < 3; k++) {
      const y = h * (0.35 + k * 0.19), hh = h * 0.47, radius = h * (0.32 - k * 0.07);
      b.add(new THREE.ConeGeometry(radius, hh, 7), pineMat, new THREE.Matrix4().makeTranslation(x, y, z));
      b.add(new THREE.ConeGeometry(radius * 0.58, hh * 0.55, 7), snowMat, new THREE.Matrix4().makeTranslation(x, y + hh * 0.15, z));
    }
  }
  b.build(g);
  return { bounds: { x: [-20, 20], y: [0.55, 38], z: [-120, 24] }, shadowR: 70, fogNear: 55, fogFar: 280, desc: "snow-covered forest pass with dark pines and distant frosted peaks" };
};

/** Coastal establishing set: sandy foreground, broad animated water and a low distant headland. */
const seaMap = rep(waterPaint(), 16, 40);
export const ocean: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 503), sand = lam("oceanSand", () => ({ map: earthHD("oceanSand", "#d4b781", ["#e4d09b", "#c9ad77", "#b99f70", "#ead7a5"]) }));
  const sea = lam("oceanWater", () => ({ map: seaMap, color: "#97cfdf", emissive: new THREE.Color("#102d43"), emissiveIntensity: 0.07 }));
  const foam = lam("oceanFoam", () => ({ color: "#d7f0e8" }));
  ground(b, sand, -220, 220, -8, 80, -0.02, 12);
  const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2);
  b.add(new THREE.PlaneGeometry(320, 260), sea, new THREE.Matrix4().compose(V(0, -0.05, -138), q, V(1, 1, 1)));
  for (let j = 0; j < 5; j++) {
    const z = -12 - j * 8, w = 125 - j * 11;
    b.add(new THREE.PlaneGeometry(w, 0.12 + j * 0.03), foam, new THREE.Matrix4().compose(V((r() - 0.5) * 6, 0.015 + j * 0.006, z), q, V(1, 1, 1)));
  }
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, z = -22 - i * 5.5, x = side * (5.5 + r() * 4);
    const rock = new THREE.IcosahedronGeometry(0.55 + r() * 0.9, 1);
    b.add(rock, lam("shoreRock" + (i % 3), () => ({ color: ["#7c7b71", "#989383", "#656a68"][i % 3] })), new THREE.Matrix4().compose(V(x, 0.28, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r(), r())), V(1.3, 0.7, 1)));
  }
  for (let i = 0; i < 4; i++) {
    const hill = new THREE.SphereGeometry(1, 20, 12), x = -100 + i * 70;
    b.add(hill, lam("coastline" + i, () => ({ color: i % 2 ? "#698378" : "#789080" })), new THREE.Matrix4().compose(V(x, 9, -245), new THREE.Quaternion(), V(60, 18 + r() * 10, 18)));
  }
  b.build(g);
  return { bounds: { x: [-22, 22], y: [0.55, 30], z: [-155, 28] }, shadowR: 70, fogNear: 45, fogFar: 360, update: (s) => { seaMap.offset.y = ((s.frame / s.fps) * 0.012) % 1; }, desc: "open sea and sandy coast with foam, shore rocks and distant headland" };
};

/** Broken columns and partial walls form a readable ruin while leaving a clear actor lane. */
export const ruins: KitFn = (g, o) => {
  const b = new Batch(), r = rng(o.seed ?? 607), sand = lam("ruinsGround", () => ({ map: earthHD("ruinsGround", "#8a7557", ["#a08c6a", "#7b6b53", "#b29a72", "#665e4f"]) }));
  const block = lam("ruinsStone", () => ({ map: stoneHD("ruinsStone", ["#b8a68a", "#a89578", "#c6b597", "#96866f"], "#6e6252") }));
  ground(b, sand, -180, 180, -220, 55, -0.02, 8);
  const column = (x: number, z: number, h: number) => {
    b.add(new THREE.CylinderGeometry(0.65, 0.78, h, 12, 5).translate(x, h / 2, z), block);
    b.add(new THREE.CylinderGeometry(0.92, 0.92, 0.28, 12).translate(x, h + 0.14, z), block);
    for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.83 - k * 0.04, 0.83 - k * 0.04, 0.24, 12).translate(x, 0.12 + k * 0.12, z), block);
  };
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1, z = -12 - Math.floor(i / 2) * 15, x = side * (6 + r() * 2.2), h = 3.8 + r() * 5;
    if (i % 4 === 0) b.add(boxGeo(V(x - 2.5, 0, z - 0.5), V(x + 2.5, 2.7 + r() * 2, z + 0.5), 1.4), block);
    else column(x, z, h);
  }
  for (let i = 0; i < 6; i++) {
    const x = -7.5 + i * 3, h = 3.8 + r() * 1.2;
    b.add(boxGeo(V(x, 0, -55), V(x + 1.15, h, -54.2), 1.2), block);
  }
  for (let i = 0; i < 26; i++) {
    const geo = new THREE.IcosahedronGeometry(0.35 + r() * 0.65, 1), x = (r() - 0.5) * 24, z = 12 - r() * 75;
    b.add(geo, block, new THREE.Matrix4().compose(V(x, 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r(), r())), V(1 + r(), 0.5 + r(), 0.8 + r())));
  }
  b.build(g);
  return { bounds: { x: [-15, 15], y: [0.55, 26], z: [-85, 24] }, shadowR: 60, fogNear: 45, fogFar: 290, desc: "ancient stone ruin with broken columns, partial wall and scattered masonry" };
};

export const KITS: Record<string, KitFn> = { street, forest, mountain, cabin, river, bedroom, kitchen, clinic, livingroom, plaza, desert, snow, ocean, ruins };
