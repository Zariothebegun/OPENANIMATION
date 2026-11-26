// Catálogo auto-gerado a partir das bibliotecas: é o "menu" que o realizador (IA) vê. Fonte única de verdade.
import { CHARACTERS } from './characters.js';
import { FACES } from './faces.js';
import { CLIPS } from './poses.js';
import { PROPS } from './props.js';
import { BACKGROUNDS } from './backgrounds.js';
import { TRANSITIONS } from './transitions.js';
import './props2.js';
import './props3.js';
import './bg2.js';
import './bg3d.js';
import { KITS } from '../set3d/kits.js';
import { SHOT_NAMES } from './scene.js';
import { FORMATS } from './scene.js';
import { KIT_MAP } from '../cinema/bank.js';
import { STYLE_CATALOG } from './style.js';

export function getCatalog() {
  return {
    styles: Object.fromEntries(Object.entries(STYLE_CATALOG).map(([id, s]) => [id, `${s.code} — ${s.name}: ${s.description}`])),
    styleCards: STYLE_CATALOG,
    formats: Object.keys(FORMATS),
    characters: Object.fromEntries(Object.entries(CHARACTERS).map(([k, v]) => [k, v.desc])),
    faces: Object.fromEntries(Object.entries(FACES).map(([k, v]) => [k, v.desc])),
    acts: Object.fromEntries(Object.entries(CLIPS).map(([k, v]) => [k, v.desc])),
    props: Object.fromEntries(Object.entries(PROPS).map(([k, v]) => [k, v.desc])),
    backgrounds: Object.fromEntries(Object.entries(BACKGROUNDS).map(([k, v]) => [k, v.desc])),
    transitions: TRANSITIONS,
    propFx: ['pop', 'fade', 'grow', 'drop', 'slide_l', 'slide_r', 'none'],
    propMotion: ['float', 'spin', 'shake', 'pulse', 'wiggle'],
    hats: ['helmet', 'ushanka', 'peaked', 'cap', 'tophat', 'chef', 'crown', 'beanie', 'grad', 'hardhat', 'wizard', 'police'],
    hair: ['short', 'long', 'pony', 'spiky', 'bun', 'curly', 'bald', 'none'],
    outfitTypes: ['tee', 'suit', 'lab', 'hoodie', 'apron', 'dress', 'stripe'],
    builds: ['adult', 'stout', 'kid', 'large'],
    kits3d: [...new Set([...Object.keys(KITS), 'street', 'yard', 'room', 'clinic', 'field', 'body', 'forest', 'forest_night', 'clearing', 'forest_clearing', 'mountain', 'mountain_pass', 'cabin', 'cabin_night'])],
    cinemaKits: Object.fromEntries(Object.entries(KIT_MAP).map(([id, [kit, light]]) => [id, `${kit} · ${light}`])),
    shots: SHOT_NAMES,
    cam3Eases: ['smooth', 'cubic', 'spring', 'inOut', 'linear'],
    easing: ['linear', 'in', 'out', 'inOut', 'back', 'elastic', 'bounce'],
  };
}
