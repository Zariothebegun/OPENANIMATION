// Estilos visuais. `flat` = limpo/plano; `painted` = pintado, sombreado, vinheta+grão (look "cinema cartoon").
import { setInk } from './util.js';

export const STYLES = {
  flat:    { ink: '#1a1a22', skin: '#ffffff', lw: 1,   head: 1,    shade: false, charScale: 0.6,  grain: 0,    vignette: 0,    caps: 'pop', camDefault: [1, 1.06], desc: 'plano e limpo, cores vivas' },
  painted: { ink: '#2b1a2e', skin: '#fef9f6', lw: 1.0, head: 1.26, cast: true, legK: 1.32, torsoK: 1.18, torsoW: 0.31, legW: 1.9, handR: 1.9, hFac: 1.58, thinArms: true, fabric: true, shade: true, charScale: 0.62,  grain: 0.055, vignette: 0.42, caps: 'cc',  camDefault: [1, 1.05], desc: 'pintado: contornos grossos, sombreado, luz, vinheta e grão' },
};
export const CAPTION_PRESETS = {
  pop: {},
  cc: { style: 'cc', upper: false, maxWords: 2, color: '#ffffff', highlight: '#ffffff', y: 0.64, size: 0.058, font: 'Inter', gap: 0.3, stroke: 0.15, pop: false },
};
export const styleOf = (meta) => STYLES[(meta && meta.style) || 'painted'] || STYLES.painted;
export const styleName = (meta) => ((meta && meta.style) in STYLES ? meta.style : 'painted');
export function applyStyle(meta) { const s = styleOf(meta); setInk(s.ink); return s; }

// Pós-processamento COZIDO no fundo (custo zero por frame): vinheta + grão.
let _noise = null;
export function finishBackground(ctx, W, H, st, host) {
  if (st.grain > 0) {
    if (!_noise || _noise.host !== host) {
      const c = host.makeCanvas(256, 256), g = c.getContext('2d'), id = g.createImageData(256, 256); let a = 12345;
      for (let i = 0; i < id.data.length; i += 4) { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; const v = (a >>> 24) > 128 ? 255 : 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0); _noise = { host, canvas: c };
    }
    ctx.save(); ctx.globalAlpha = st.grain; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(_noise.canvas, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  if (st.vignette > 0) { const g = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.hypot(W, H) * 0.55); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(8,4,20,${st.vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
