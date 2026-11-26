// Integração Node com o kit oficial B5; separado para manter style.js compatível com browser.
import { createRequire } from 'node:module';

const b5Art = createRequire(import.meta.url)('../../styles/upstream/b5-art-kit.cjs');

export const STYLE_ART_KITS = { b5_avatar_explainer: b5Art };

export function makeB5Artwork(name, options = {}) {
  const kit = STYLE_ART_KITS.b5_avatar_explainer;
  if (kit.drawings[name]) {
    if (name === 'phone') return kit.drawings[name](options.lit !== false);
    if (name === 'cup') return kit.drawings[name](options.filled !== false);
    if (name === 'hand') return kit.drawings[name](options.short === true);
    return kit.drawings[name](options.look || 0);
  }
  if (name === 'figure') return kit.figure(options);
  if (name === 'dog') return kit.dog(options);
  if (name === 'book') return kit.book(options.open !== false);
  if (name === 'lapPose') return kit.lapPose(options);
  if (name === 'pawContact') return kit.pawContact(options);
  throw new Error(`Desenho B5 desconhecido: ${name}`);
}
