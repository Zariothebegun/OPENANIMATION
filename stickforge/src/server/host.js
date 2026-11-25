// Ambiente Node: skia-canvas + fontes. O motor (src/engine) é agnóstico; isto só fornece canvas e fontes.
import { Canvas, FontLibrary, loadImage } from 'skia-canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fontsReady = false;
export function ensureFonts() {
  if (fontsReady) return;
  FontLibrary.use('Anton', [path.join(ROOT, 'assets/fonts/Anton-Regular.ttf')]);
  FontLibrary.use('Inter', [path.join(ROOT, 'assets/fonts/Inter-ExtraBold.otf')]);
  fontsReady = true;
}
export function createHost(images = {}) {
  ensureFonts();
  return { makeCanvas: (w, h) => new Canvas(w, h), images, bgCache: new Map() };
}
export { Canvas, loadImage, ROOT };
