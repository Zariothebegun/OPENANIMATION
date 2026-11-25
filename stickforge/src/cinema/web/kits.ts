// kits.ts: world kits built from the skill's painted materials (two-tone shading, HD hand-painted textures, ink-friendly geometry).
import * as THREE from "three";
import { Batch, lam, V, quad, tri, boxGeo, addVeg, house, STYLES, VegKind } from "./kit3";
import { grassHD, cobbleHD, stoneHD, planksHD, beamHD, roofHD, water as waterPaint, rng, rep, ctex, brick } from "./paint";
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
  const path = lam("forestPath", () => ({ map: stoneHD("forestPath", ["#92724b", "#a18157", "#806448", "#b09368"], "#5d4935") }));
  const pineLeaf = lam("forestPine", () => ({ map: grassHD(), color: "#6c9c52" }));
  const bark = lam("forestBark", () => ({ map: beamHD() }));
  ground(b, grass, -220, 220, -240, 80, -0.02, 7);
  // A continuous trail gives the camera a clear foreground-to-background guide line.
  ground(b, path, -1.45, 1.45, -180, 30, 0.015, 2.3);
  const pine = (x: number, z: number, h: number) => {
    const trunk = new THREE.CylinderGeometry(0.12, 0.23, h * 0.28, 7).translate(0, h * 0.14, 0);
    b.add(trunk, bark, new THREE.Matrix4().makeTranslation(x, 0, z));
    for (let tier = 0; tier < 4; tier++) {
      const y = h * (0.28 + tier * 0.17), height = h * (0.47 - tier * 0.035), radius = h * (0.27 - tier * 0.045);
      const crown = new THREE.ConeGeometry(radius, height, 7);
      b.add(crown, pineLeaf, new THREE.Matrix4().makeTranslation(x, y, z));
    }
  };
  // Keep the center lane open for characters; frame tree trunks around the camera's subject.
  for (let side of [-1, 1]) for (let z = 24, i = 0; z > -150; z -= 7 + r() * 5, i++) {
    const x = side * (6.2 + r() * 6.5);
    pine(x, z, 7 + r() * 6);
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
  const rock = lam("mountainRock", () => ({ map: stoneHD("mountainRock", ["#77746e", "#8f8980", "#a59c8c", "#666b70"], "#514f4b") }));
  ground(b, turf, -260, 260, -260, 70, -0.02, 9);
  // An open trail keeps the actors legible; the nearer, offset peaks make the set read
  // clearly in the narrow horizontal field of view of a portrait camera.
  ground(b, rock, -1.6, 1.6, -80, 24, 0.005, 4);
  for (let i = 0; i < 15; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), z = -23 - row * 9, x = side * (8 + r() * 9), h = 17 + r() * 20;
    const geo = new THREE.ConeGeometry(8 + r() * 5, h, 7 + (i % 3));
    geo.rotateY(r() * Math.PI);
    b.add(geo, rock, new THREE.Matrix4().makeTranslation(x, h / 2 - 1, z));
    if (i % 2 === 0) {
      const cap = new THREE.ConeGeometry(3.2 + r() * 2.3, h * 0.27, 7);
      cap.rotateY(Math.PI / 6); b.add(cap, lam("snowCap" + i, () => ({ color: "#dce7e9" })), new THREE.Matrix4().makeTranslation(x, h * 0.88, z));
    }
  }
  // A low, distant ridge breaks the skyline into layers without blocking the camera's subject lane.
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.SphereGeometry(1, 18, 10), x = -105 + i * 35, scale = 30 + r() * 16;
    b.add(geo, lam("mountainRidge" + i, () => ({ color: ["#777b78", "#85877f", "#999586"][i % 3] })),
      new THREE.Matrix4().compose(V(x, -12, -112 - r() * 12), new THREE.Quaternion(), V(scale, 28 + r() * 12, 17)));
  }
  b.build(g);
  return { bounds: { x: [-16, 16], y: [0.5, 36], z: [-90, 24] }, shadowR: 70, fogNear: 58, fogFar: 260, desc: "painted mountain pass with layered peaks, snow caps and an open trail" };
};

export const cabin: KitFn = (g, o) => {
  const b = new Batch();
  const floor = lam("cabinFloor", () => ({ map: planksHD() }));
  const walls = lam("cabinWall", () => ({ map: brick("#b78f69") }));
  const wood = lam("cabinWood", () => ({ map: beamHD() }));
  b.add(boxGeo(V(-5, -0.15, -11), V(5, 0, 7), 1.4), floor);
  b.add(boxGeo(V(-5, 0, -11), V(5, 4.4, -10.7), 2), walls);
  b.add(boxGeo(V(-5, 0, -11), V(-4.75, 4.4, 7), 2), walls);
  b.add(boxGeo(V(4.75, 0, -11), V(5, 4.4, 7), 2), walls);
  // Exposed timber, a warm window and furniture make the location read as a room, not a fallback street.
  for (const x of [-4.7, 0, 4.7]) b.add(boxGeo(V(x - 0.12, 0, -10.55), V(x + 0.12, 4.35, -10.35), 1), wood);
  b.add(boxGeo(V(-1.6, 1.5, -10.3), V(1.6, 3.25, -10.1), 0), lam("cabinWindow", () => ({ color: "#819eb2", emissive: new THREE.Color("#536f82"), emissiveIntensity: 0.35 })));
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
  b.add(new THREE.PlaneGeometry(9, 230), water, new THREE.Matrix4().compose(V(1.8, 0.015, -82), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -0.12), V(1, 1, 1)));
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

export const KITS: Record<string, KitFn> = { street, forest, mountain, cabin, river };
