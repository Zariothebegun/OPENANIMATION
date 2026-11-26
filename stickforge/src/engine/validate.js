// Validação com mensagens pensadas para uma IA corrigir sozinha ("quis dizer X?" + lista de válidos).
import { getCatalog } from './catalog.js';
import { FORMATS } from './scene.js';
import { STYLE_CATALOG, canonicalStyleId, styleOf, styleBackground } from './style.js';

function lev(a, b) { const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
const suggest = (v, list) => { let best = null, bd = 99; for (const x of list) { const dd = lev(String(v).toLowerCase(), x); if (dd < bd) { bd = dd; best = x; } } return bd <= Math.max(2, Math.floor(String(v).length / 3)) ? best : null; };

export const DEFAULT_META = { format: '9:16', fps: 30, animFps: 15, lang: 'pt-br', speed: 1, quality: 'standard', captions: { enabled: true }, transition: 'cut' };

export function normalizeProject(raw) {
  const errors = [], warnings = [], cat = getCatalog();
  const p = JSON.parse(JSON.stringify(raw || {}));
  p.meta = { ...DEFAULT_META, ...(p.meta || {}) };
  p.meta.captions = { ...DEFAULT_META.captions, ...(p.meta.captions || {}) };
  if (p.meta.style !== undefined) {
    const styleId = canonicalStyleId(p.meta.style);
    if (!styleId) errors.push(`meta.style: "${p.meta.style}" inválido. Válidos: ${Object.keys(STYLE_CATALOG).join(', ')}, A3, B5`);
    else p.meta.style = styleId;
  }
  const selectedStyle = styleOf(p.meta), selectedStyleId = p.meta.style || 'painted';
  if (selectedStyle.codeOnly) {
    if (p.meta.engine === 'cinema') warnings.push(`meta.style "${selectedStyle.code}" usa apenas o renderizador 2D de código; o motor trocará Cinema/3D apenas durante o render.`);
    if (Array.isArray(p.scenes)) for (const s of p.scenes) {
      const after = styleBackground(s.bg, selectedStyleId);
      if (JSON.stringify(s.bg) !== JSON.stringify(after)) warnings.push(`cena "${s.id || ''}": o render usará o fundo vetorial "${after}" no estilo ${selectedStyle.code}; a configuração original será preservada.`);
    }
  }
  if (!FORMATS[p.meta.format]) errors.push(`meta.format: "${p.meta.format}" inválido. Válidos: ${Object.keys(FORMATS).join(', ')}`);
  if (![30, 15, 10, 6, 5, 3, 2, 1].includes(p.meta.animFps) && 30 % p.meta.animFps !== 0) errors.push(`meta.animFps deve dividir 30 (30, 15, 10, 6...). Recebido ${p.meta.animFps}`);
  if (!Array.isArray(p.scenes) || !p.scenes.length) { errors.push('scenes: precisa de pelo menos 1 cena'); p.scenes = []; }
  const ids = new Set();
  const chk = (path, kind, v, list, label) => { if (v === undefined) return; if (!list.includes(v)) { const s = suggest(v, list); errors.push(`${path}: ${label} "${v}" não existe.${s ? ` Quis dizer "${s}"?` : ''} Válidos: ${list.join(', ')}`); } };
  p.scenes.forEach((s, i) => {
    const sp = `scenes[${i}]`;
    if (!s.id) s.id = 's' + (i + 1);
    if (ids.has(s.id)) errors.push(`${sp}.id: "${s.id}" duplicado`); ids.add(s.id);
    const effectiveBg = selectedStyle.codeOnly ? styleBackground(s.bg, selectedStyleId) : (s.bg || 'studio');
    const bgk = typeof effectiveBg === 'string' ? effectiveBg : effectiveBg?.kind;
    if (s.bg !== undefined || selectedStyle.codeOnly) chk(sp + '.bg', 'bg', bgk, Object.keys(cat.backgrounds), 'cenário');
    if (!s.bg && !selectedStyle.codeOnly) s.bg = 'studio';
    const is3 = bgk === 'set3d';
    if (is3) {
      const validKits = p.meta.engine === 'cinema' ? Object.keys(cat.cinemaKits) : cat.kits3d;
      if (!s.bg.kit) errors.push(`${sp}.bg.kit: falta o kit 3D. Válidos: ${validKits.join(', ')}`); else chk(sp + '.bg.kit', 'kit', s.bg.kit, validKits, 'kit 3D');
      if (s.shot !== undefined) chk(sp + '.shot', 'shot', s.shot, cat.shots, 'plano de câmara');
      if (typeof s.cam3 === 'string') chk(sp + '.cam3', 'shot', s.cam3, cat.shots, 'plano de câmara');
      if (s.exit !== undefined) chk(sp + '.exit', 'exit', s.exit, ['whip', 'flash'], 'saída');
    } else if (s.shot || s.cam3) warnings.push(`${sp}: "shot"/"cam3" só têm efeito com bg.kind "set3d"`);
    chk(sp + '.transition', 'tr', s.transition, Object.keys(cat.transitions), 'transição');
    if (!s.actors || !s.actors.length) s.actors = [{ id: 'a', char: 'blue' }];
    const aids = new Set();
    s.actors.forEach((a, j) => { if (!a.id) a.id = 'a' + (j || ''); if (aids.has(a.id)) errors.push(`${sp}.actors[${j}].id duplicado "${a.id}"`); aids.add(a.id); if (a.char !== undefined) chk(`${sp}.actors[${j}].char`, 'char', a.char, Object.keys(cat.characters), 'personagem'); if (a.face) chk(`${sp}.actors[${j}].face`, 'face', a.face, Object.keys(cat.faces), 'expressão'); if (a.pose) chk(`${sp}.actors[${j}].pose`, 'pose', a.pose, Object.keys(cat.acts), 'animação'); if (a.build !== undefined) chk(`${sp}.actors[${j}].build`, 'build', a.build, cat.builds, 'porte físico'); });
    if (is3) s.actors.forEach((a, j) => {
      const ap = `${sp}.actors[${j}]`;
      for (const k of ['x', 'z']) if (a[k] !== undefined && typeof a[k] !== 'number') errors.push(`${ap}.${k}: em cenas 3D é um número em metros (x lateral, z profundidade; 0 = centro)`);
      if (a.x !== undefined && typeof a.x === 'number' && Math.abs(a.x) > 12) warnings.push(`${ap}.x=${a.x}: parece fracção/valor grande; em 3D x é em metros (−3..3 é o habitual)`);
      if (a.toward !== undefined && a.toward !== a.id && !s.actors.some((o) => o.id === a.toward)) errors.push(`${ap}.toward: actor "${a.toward}" não existe nesta cena. Actores: ${s.actors.map((o) => o.id).join(', ')}`);
      if (a.from !== undefined && (typeof a.from !== 'object' || typeof a.from.x !== 'number')) errors.push(`${ap}.from: deve ser {x, z} em metros (ponto de onde a personagem entra a andar)`);
      if (a.from && a.from.y !== undefined && typeof a.from.y !== 'number') errors.push(`${ap}.from.y: deve ser um número em metros`);
      if (a.enter !== undefined && typeof a.enter !== 'number') errors.push(`${ap}.enter: segundos (número)`);
    });
    const pids = new Set();
    (s.props || []).forEach((pr, j) => { if (!pr.id) pr.id = 'p' + j; pids.add(pr.id); chk(`${sp}.props[${j}].kind`, 'prop', pr.kind, Object.keys(cat.props), 'objecto'); if (pr.fx) chk(`${sp}.props[${j}].fx`, 'fx', pr.fx, cat.propFx, 'efeito'); });
    (s.lines || []).forEach((l, j) => { if (l && l.who && l.who !== 'none' && !aids.has(l.who)) errors.push(`${sp}.lines[${j}].who: actor "${l.who}" não existe nesta cena. Actores: ${[...aids].join(', ')} (ou "none" para narrador fora de cena)`); });
    (s.beats || []).forEach((b, j) => {
      const bp = `${sp}.beats[${j}]`;
      if (b.t === undefined) errors.push(`${bp}: falta "t" (segundos, "w5" = palavra 5, "l1" = linha 1, "@palavra", "50%", "end-1")`);
      if (b.actor && !aids.has(b.actor)) errors.push(`${bp}.actor: "${b.actor}" não existe. Actores: ${[...aids].join(', ')}`);
      if (b.prop && !pids.has(b.prop)) errors.push(`${bp}.prop: "${b.prop}" não existe. Props: ${[...pids].join(', ') || '(nenhum)'}`);
      if (b.camera && (Array.isArray(b.camera.zoom) || Array.isArray(b.camera.x) || Array.isArray(b.camera.y))) errors.push(`${bp}.camera: zoom/x/y em beats têm de ser números (use camera:{zoom:[a,b]} ao nível da cena para zoom gradual, ou beats com dur)`);
      if (b.act) chk(bp + '.act', 'act', b.act, Object.keys(cat.acts), 'animação');
      if (b.face) chk(bp + '.face', 'face', b.face, Object.keys(cat.faces), 'expressão');
      if (b.fx && !b.prop && !b.actor && !['shake', 'flash'].includes(b.fx)) errors.push(`${bp}.fx: efeito de cena "${b.fx}" inválido. Válidos: shake, flash`);
      if (b.act === undefined && b.face === undefined && b.to === undefined && !b.prop && !b.camera && !b.fx && b.flip === undefined && !b.show && !b.hide && b.scale === undefined) warnings.push(`${bp}: beat sem efeito (precisa de act/face/to/prop/camera/fx)`);
    });
    if (is3 && s.actors.length > 1 && !s.shot && !s.cam3) warnings.push(`${sp}: sem "shot"; vai usar um plano automático. Escolhe um (${cat.shots.join(', ')}) para variar a câmara entre cenas`);
    if (!(s.lines && s.lines.length) && !s.narration && !s.dur) warnings.push(`${sp}: sem narração nem "dur" — a cena terá 2s sem voz`);
  });
  p.scenes.forEach((s, i) => { const q = p.scenes[i - 1]; if (selectedStyle.codeOnly || !q || s.bg?.kind !== 'set3d' || q.bg?.kind !== 'set3d') return; const same = (s.actors || []).every((a) => { const b = (q.actors || []).find((x) => x.id === a.id); return b && a.x === b.x && a.z === b.z; }); if (same && (s.shot || '') === (q.shot || '')) warnings.push(`scenes[${i}]: mesmas posições e mesmo plano da cena anterior — muda x/z, "from" e "shot" para não repetir o enquadramento`); });
  if (p.meta.engine === 'cinema' && !selectedStyle.codeOnly) {
    const baseKit = (s) => {
      const bg = typeof s.bg === 'object' ? s.bg : { kit: s.bg };
      return cat.cinemaKits[bg.kit]?.split(' · ')[0] || bg.kit || 'street';
    };
    const counts = new Map();
    p.scenes.forEach((s) => counts.set(baseKit(s), (counts.get(baseKit(s)) || 0) + 1));
    for (const [kit, count] of counts) if (count > p.scenes.length / 2 && p.scenes.length > 2)
      warnings.push(`Cinema: ${count}/${p.scenes.length} cenas usam o mesmo cenário-base "${kit}" — distribui a história por mais locais para variar a imagem`);
    p.scenes.forEach((s, i) => {
      const movesActor = (s.actors || []).some((a) => a.from) || (s.beats || []).some((b) => b.actor && b.to !== undefined);
      if (!movesActor && s.auto !== false)
        warnings.push(`scenes[${i}]: encenação sem deslocação de personagem — usa actor.from ou um beat {actor,to:{x,z}} para dar acção ao plano`);
      const prev = p.scenes[i - 1];
      if (prev && baseKit(s) === baseKit(prev) && (s.shot || '') === (prev.shot || ''))
        warnings.push(`scenes[${i}]: repete cenário e plano Cinema da cena anterior — muda shot/cam3 ou a posição dos actores`);
    });
  }
  return { project: p, errors, warnings };
}
