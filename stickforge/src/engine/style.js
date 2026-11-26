// Estilos locais do motor e perfis oficiais importados de Stickman Video Director.
import { setInk } from './util.js';

export const STYLES = {
  flat:    { ink: '#1a1a22', skin: '#ffffff', lw: 1,   head: 1,    shade: false, charScale: 0.6,  grain: 0,    vignette: 0,    caps: 'pop', camDefault: [1, 1.06], desc: 'plano e limpo, cores vivas' },
  painted: { ink: '#2b1a2e', skin: '#fef9f6', lw: 1.0, head: 1.26, cast: true, legK: 1.32, torsoK: 1.18, torsoW: 0.31, legW: 1.9, handR: 1.9, hFac: 1.58, thinArms: true, fabric: true, shade: true, charScale: 0.62,  grain: 0.055, vignette: 0.42, caps: 'cc',  camDefault: [1, 1.05], desc: 'pintado: contornos grossos, sombreado, luz, vinheta e grão' },
  a3_prehistoric_cave: { code: 'A3', name: 'Prehistoric Cave', ink: '#171512', skin: '#fffdf8', lw: 1.05, head: 1, cast: false, rough: true, charScale: 0.62, grain: 0.025, paper: 0.025, vignette: 0, caps: 'cave', camDefault: [1, 1.04], cave: false, codeOnly: true, defaultBackground: 'prehistoric_outdoors', backgrounds: ['prehistoric_cave', 'prehistoric_campfire', 'prehistoric_outdoors', 'prehistoric_river'], promptGuide: 'Perfil oficial integrado: styles/upstream/a3-prehistoric-cave.md. A3 é o Style 3 do Model Engine no projeto de origem, não um estilo de personagens vetoriais locais. Usa contorno preto irregular, cabeça redonda branca, membros finos tipo stickman, expressões simples, roupas de pele, terra ocre e fogo quente; elenco variável com identidades fixas por história, cenas com ação física e pausas de reação, cenário e composição nativos ao formato. Mantém moderno fora do mundo pré-histórico. O modo de vídeo do original espera geração externa; se usar este render 2D local, declara-o como adaptação, sem alegar equivalência ao original.', desc: 'A3 original: desenho pré-histórico 2D de contorno irregular e comédia de reação' },
  b5_avatar_explainer: { code: 'B5', name: 'Avatar Explainer', ink: '#1e1c1a', skin: '#fbfaf8', lw: 1, head: 1, cast: false, charScale: 0.62, grain: 0, paper: 0, vignette: 0, caps: 'avatar', camDefault: [1, 1.035], presenter: false, codeOnly: true, defaultBackground: 'warm_paper', backgrounds: ['warm_paper', 'explainer_board'], promptGuide: 'Perfil e kit oficiais integrados: styles/upstream/b5-avatar-explainer.md e styles/upstream/b5-art-kit.cjs (MIT). O motor exporta o kit executável em getCatalog().styleArtKits.b5_avatar_explainer: desenhos SVG inteiros, limites, âncoras, fitting seguro, attach, movimentos e handoffs. Os props b5_art são convertidos em imagens antes da composição de cada cena. Usa um avatar aprovado/fornecido na posição do apresentador; se não existir, não inventes um substituto.', desc: 'B5 original: apresentador-avatar, desenhos em camadas e handoffs físicos' },
};

export const STYLE_ALIASES = { stick: 'painted', A3: 'a3_prehistoric_cave', prehistoric_cave: 'a3_prehistoric_cave', B5: 'b5_avatar_explainer', avatar_explainer: 'b5_avatar_explainer' };
export const canonicalStyleId = (id) => STYLE_ALIASES[id] || (STYLES[id] ? id : null);
export const STYLE_CATALOG = Object.fromEntries(Object.entries(STYLES).map(([id, s]) => [id, {
  id, code: s.code || id.toUpperCase(), name: s.name || id, description: s.desc,
  renderer: s.codeOnly ? '2d-code-adaptation' : '2d', requires3d: false, usesGeneratedImages: false,
  defaultBackground: s.defaultBackground || 'studio', backgrounds: s.backgrounds || ['studio', 'outdoor', 'room'],
  thumbnail: null, promptGuide: s.promptGuide || '', artKit: id === 'b5_avatar_explainer' ? 'b5-art-kit.cjs' : null,
}]));

/** Converts a 3D / generated-image request to a fast, code-only 2D set for A3/B5. */
export function styleBackground(bg, id) {
  const styleId = canonicalStyleId(id), st = styleId && STYLES[styleId];
  if (!st?.codeOnly) return bg || 'studio';
  const kind = typeof bg === 'string' ? bg : bg?.kind;
  if (!kind || kind === 'studio') return st.defaultBackground;
  if (st.cave) {
    if (st.backgrounds.includes(kind)) return kind;
    if (kind === 'set3d') {
      const kit = String(bg?.kit || '').toLowerCase();
      return /river|water|ocean|sea/.test(kit) ? 'prehistoric_river' : /cabin|room|cave|ruin/.test(kit) ? 'prehistoric_cave' : 'prehistoric_outdoors';
    }
    if (kind === 'image') return 'prehistoric_cave';
    return /river|beach|ocean|water/.test(kind) ? 'prehistoric_river' : /room|cabin|office|class|lab|cave|studio/.test(kind) ? 'prehistoric_cave' : 'prehistoric_outdoors';
  }
  if (st.presenter) {
    if (st.backgrounds.includes(kind)) return kind;
    if (kind === 'image') return 'warm_paper';
    if (kind === 'set3d') {
      const kit = String(bg?.kit || '').toLowerCase();
      return /river|water|ocean|sea/.test(kit) ? 'beach' : /forest|mountain|field|snow|desert/.test(kit) ? 'outdoor' : /room|cabin|bedroom|clinic/.test(kit) ? 'room' : /street|city|plaza/.test(kit) ? 'city' : 'warm_paper';
    }
  }
  return bg;
}

export const CAPTION_PRESETS = {
  pop: {},
  cc: { style: 'cc', upper: false, maxWords: 2, color: '#ffffff', highlight: '#ffffff', y: 0.64, size: 0.058, font: 'Inter', gap: 0.3, stroke: 0.15, pop: false },
  cave: { style: 'cave', upper: false, maxWords: 3, color: '#f7e8c8', highlight: '#ffb443', y: 0.79, size: 0.058, font: 'Anton', gap: 0.28, stroke: 0.12, pop: true },
  avatar: { style: 'avatar', upper: false, maxWords: 4, color: '#29231f', highlight: '#c83532', y: 0.8, size: 0.054, font: 'Anton', gap: 0.28, stroke: 0, pop: false, box: true, boxColor: '#f6eddb', boxBorder: '#2b2925', boxAccent: '#c83532' },
};
export const styleOf = (meta) => STYLES[canonicalStyleId(meta?.style) || 'painted'];
export const styleName = (meta) => canonicalStyleId(meta?.style) || 'painted';
export function applyStyle(meta) { const s = styleOf(meta); setInk(s.ink); return s; }

// Texturas de papel e grão são pré-cozidas e reutilizadas pelo cache do fundo.
let _noise = null;
let _paper = null;
export function finishBackground(ctx, W, H, st, host) {
  if (st.paper > 0) {
    if (!_paper || _paper.host !== host) {
      const c = host.makeCanvas(128, 128), g = c.getContext('2d'); let a = 4281;
      for (let i = 0; i < 120; i++) {
        a = (Math.imul(a, 1664525) + 1013904223) >>> 0; const x = (a >>> 8) % 128;
        a = (Math.imul(a, 1664525) + 1013904223) >>> 0; const y = (a >>> 8) % 128;
        a = (Math.imul(a, 1664525) + 1013904223) >>> 0; const len = 2 + ((a >>> 8) % 10);
        g.strokeStyle = (i % 3) ? 'rgba(91,66,38,.13)' : 'rgba(255,255,255,.32)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + ((i % 5) - 2) * 0.2); g.stroke();
      }
      _paper = { host, canvas: c };
    }
    ctx.save(); ctx.globalAlpha = st.paper; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ctx.createPattern(_paper.canvas, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
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
