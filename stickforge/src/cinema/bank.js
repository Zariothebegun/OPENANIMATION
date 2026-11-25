// bank.js: the ASSET BANK. Maps the DSL's characters / faces / acts onto the pre-made 2D art (toon.ts). Extend by adding entries here
// (or drop a JSON file `bank.local.json` next to this file: { "outfits": {...}, "faces": {...}, "acts": {...} }) — no engine change needed.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let LOCAL = {}; try { LOCAL = JSON.parse(fs.readFileSync(path.join(here, 'bank.local.json'), 'utf8')); } catch {}

const SKIN = ['#ffe2c2', '#f5c9a0', '#ecd0b6', '#c99067', '#8d5a3b'];
const HAIR_COL = { short: '#2b2118', spiky: '#2b2118', long: '#5a2d1b', bun: '#3a2a22' };
// hat names of the DSL -> toon hats
const HAT = { beanie: 'beanie', chef: 'chef', crown: 'crown', wizard: 'wizard', helmet: 'helmet', hardhat: 'hardhat', grad: 'grad', cap: 'cap', ushanka: 'ushanka', peaked: 'peaked', fedora: 'fedora', police: 'peaked', top: 'tophat' };

/** DSL character definition (resolveCharacter) -> toon Outfit */
export function outfitOf(def, id = '') {
  if (LOCAL.outfits?.[id]) return LOCAL.outfits[id];
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const jacket = def.outfit || '#4a90e2';
  const type = def.outfitType || 'tee';
  const pants = type === 'suit' || type === 'suit_v' ? '#2b2f3e' : type === 'lab' ? '#4a5060' : type === 'apron' ? '#3b3f52' : '#3b4a6b';
  const o = { jacket, pants, boots: type === 'suit' ? '#241726' : '#4a3426', skin: def.skin || SKIN[h % 3] };
  if (def.hat && HAT[def.hat]) { o.hat = HAT[def.hat]; if (def.hatColor) o.cap = def.hatColor; }
  else if (def.hair && def.hair !== 'none') { o.hat = 'hair'; o.hair = def.hairColor || HAIR_COL[def.hair] || '#2b2118'; }
  if (def.acc?.includes('mustache') || def.acc?.includes('beard')) o.moustache = def.hairColor || '#3a2a1a';
  if (type === 'dress' || def.hair === 'long') { o.dress = type === 'dress' ? jacket : undefined; }
  if (type === 'lab') { o.buttons = '#c9d2e0'; }
  if (type === 'suit' || type === 'suit_v') { o.belt = null; o.buttons = '#c9d2e0'; }
  if (def.build) o.build = def.build;
  return Object.assign(o, LOCAL.overrides?.[id] || {});
}

// DSL faces -> toon expressions (base) ; `talk` alternates between `open` and `base` while speaking
export const FACE_MAP = Object.assign({ neutral: 'neutral', happy: 'smile_closed', grin: 'grin', laugh: 'laugh', sad: 'pained', worried: 'nervous', angry: 'stern', surprised: 'shock', shocked: 'shock', thinking: 'neutral',
  smug: 'smile_closed', confused: 'nervous', excited: 'grin', sleepy: 'neutral', dizzy: 'dazed', wink: 'smile', proud: 'smile_closed', scared: 'nervous' }, LOCAL.faces || {});
export const OPEN_MOUTH = { neutral: 'smile', smile_closed: 'grin', smile: 'grin', grin: 'smile', stern: 'smile', nervous: 'shock', pained: 'shock', shock: 'neutral' };

// DSL acts (poses/clips) -> gesture preset (cast3.ts gestPose)
export const ACT_MAP = Object.assign({ idle: 'idle', talk: 'talk', present: 'present', point: 'point', shrug: 'shrug', think: 'think', wave: 'wave', hold: 'hold', celebrate: 'cheer', cheer: 'cheer', jump: 'cheer', recoil: 'recoil', scared: 'recoil',
  shock: 'recoil', explain: 'present', lookup: 'lookup', clap: 'cheer', cry: 'think', facepalm: 'think', read: 'hold', write: 'hold', type: 'hold', walk: 'idle', run: 'idle' }, LOCAL.acts || {});

// DSL backgrounds -> cinema kit + light  (kit names are the old set3d kits; new names pass through)
export const KIT_MAP = Object.assign({
  street: ['street', 'day'], forest: ['forest', 'day'], forest_night: ['forest', 'night'], clearing: ['forest', 'golden'], forest_clearing: ['forest', 'golden'],
  mountain: ['mountain', 'golden'], mountain_pass: ['mountain', 'day'], cabin: ['cabin', 'interior'], cabin_night: ['cabin', 'interior'], river: ['river', 'golden'], riverbank: ['river', 'day'],
  plaza_night: ['street', 'night'], city_day: ['street', 'day'], western: ['street', 'golden'], alley_night: ['street', 'night'],
  room: ['cabin', 'interior'], classroom: ['cabin', 'interior'], clinic: ['cabin', 'interior'], tech_hall: ['cabin', 'interior'],
  desert_dusk: ['mountain', 'dusk'], ruins: ['mountain', 'golden'], ocean: ['river', 'day'], space: ['mountain', 'night'], waterfall: ['river', 'day'],
  snow_field: ['mountain', 'night'], porch_night: ['cabin', 'interior'], body_tunnel: ['cabin', 'organ'], organ_cave: ['cabin', 'organ'],
  // Native Cinema locations; legacy field/room names now resolve to actual sets instead of the city fallback.
  field: ['forest', 'day'], yard: ['mountain', 'day'],
}, LOCAL.kits || {});
