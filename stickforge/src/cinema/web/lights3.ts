// lights3.ts: light + look presets. day / golden are the skill's measured presets; night / interior / organ are derived from them.
import { LIGHTS, LOOK, LightPreset, WorldLook } from "./lights";
export type LightName = "day" | "golden" | "night" | "interior" | "organ" | "dusk";
const night: LightPreset = {
  ...LIGHTS.day, az: 40, el: 38,
  lit: [0.5, 0.62, 1.05], shade: [0.12, 0.14, 0.3], lift: [0.03, 0.05, 0.15], lambert: 0.35, sideK: 0.84, term: 0.2,
  charTint: [0.78, 0.84, 1.0], charShade: 0.8, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.8, 0.85, 1.0], blob: [0.4, 0.42, 0.6], actorShadow: false,
  top: "#0b1233", hor: "#2c3f7a", skyCurve: [0, 0.5, 0.6], fog: "#25376d", fogNear: 18, fogFar: 200, sunDisc: "#000000",
  sunCol: "#a9bfff", sunI: 2.4, sky: "#4a5fa0", ground: "#2a2740", hemiI: 0.55,
};
const interior: LightPreset = {
  ...LIGHTS.day, az: 70, el: 60,
  lit: [1.42, 1.4, 1.34], shade: [0.42, 0.45, 0.58], lift: [0.06, 0.08, 0.13], lambert: 0.3, sideK: 0.88, term: 0.25,
  charTint: [1.0, 0.97, 0.94], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.94, 0.93, 0.98], blob: [0.7, 0.68, 0.72], actorShadow: false,
  fog: "#cfd6e4", fogNear: 14, fogFar: 90, sunCol: "#fff1dc", sunI: 2.6, hemiI: 0.6,
};
const organ: LightPreset = {
  ...LIGHTS.day, az: 60, el: 50,
  lit: [1.55, 0.78, 0.7], shade: [0.42, 0.16, 0.3], lift: [0.1, 0.03, 0.08], lambert: 0.35, sideK: 0.84, term: 0.2,
  charTint: [1.0, 0.86, 0.84], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.95, 0.85, 0.95], blob: [0.55, 0.3, 0.4], actorShadow: false,
  top: "#5a1426", hor: "#a8384d", fog: "#7a1f34", fogNear: 5, fogFar: 46, sunCol: "#ffd2c0", sunI: 2.6, sky: "#b94a60", ground: "#5a1c30", hemiI: 0.6,
};
const dusk: LightPreset = { ...LIGHTS.golden, az: 30, el: 16, fog: "#e3a98f", fogNear: 40, fogFar: 340 };
export const L3: Record<LightName, LightPreset> = { day: LIGHTS.day, golden: LIGHTS.golden, night, interior, organ, dusk };
const lookNight: WorldLook = { ...LOOK.day, sky: { c: ["#2c3f7a", "#223468", "#182755", "#101c42", "#0b1233"], e: [0, 3, 8, 16, 40] }, sat: 1.05 };
const lookInterior: WorldLook = { ...LOOK.day, sky: { c: ["#cfd6e4", "#cfd6e4", "#cfd6e4", "#cfd6e4", "#cfd6e4"], e: [0, 3, 8, 16, 40] } };
const lookOrgan: WorldLook = { ...LOOK.day, sky: { c: ["#7a1f34", "#7a1f34", "#6a1a2e", "#5a1426", "#5a1426"], e: [0, 3, 8, 16, 40] }, sat: 1.1 };
const lookDusk: WorldLook = { ...LOOK.golden, sky: { c: ["#ffb783", "#f09a80", "#d27f8e", "#9a6d99", "#5e5788"], e: [0, 4, 10, 20, 40] } };
export const K3: Record<LightName, WorldLook> = { day: LOOK.day, golden: LOOK.golden, night: lookNight, interior: lookInterior, organ: lookOrgan, dusk: lookDusk };
