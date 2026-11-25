// Operações de edição atómicas (a "API" que a IA e o editor usam). Cada op devolve os ids de cenas alteradas.
// Só as cenas alteradas são re-renderizadas (cache por hash de conteúdo).
const clone = (x) => JSON.parse(JSON.stringify(x));
const merge = (t, s) => { for (const [k, v] of Object.entries(s)) { if (v === null) delete t[k]; else t[k] = v; } return t; };

export const OPS_HELP = {
  set_meta: '{op, meta:{format,fps,animFps,lang,voice,speed,captions:{...},transition}}',
  add_scene: '{op, scene:{...}, after?:sceneId|index}',
  remove_scene: '{op, id}', duplicate_scene: '{op, id}', move_scene: '{op, id, to:index}',
  update_scene: '{op, id, set:{bg,transition,camera,title,minDur,...}} (null apaga um campo)',
  set_narration: '{op, id, text} ou {op, id, lines:[{text,who?,voice?}]}',
  add_actor: '{op, scene, actor:{id,char,x,y,scale,flip,face,pose}}', update_actor: '{op, scene, actor:id, set:{...}}', remove_actor: '{op, scene, actor:id}',
  swap_character: '{op, scene?, actor?, from?, to:charId} — troca a personagem (em 1 actor, numa cena ou em todo o vídeo)',
  add_prop: '{op, scene, prop:{id,kind,x,y,size,at,fx,motion,text,...}}', update_prop: '{op, scene, prop:id, set:{...}}', remove_prop: '{op, scene, prop:id}',
  add_beat: '{op, scene, beat:{t,actor,act,to,face,prop,show,hide,move,camera,fx,...}}', remove_beat: '{op, scene, index}', clear_beats: '{op, scene}',
  set_voice: '{op, voice, scene?}',
};

export function applyOps(project, ops) {
  const p = clone(project); const changed = new Set(); const errors = [];
  const scene = (id) => { const s = p.scenes.find((x) => x.id === id) || p.scenes[id]; if (!s) errors.push(`cena "${id}" não existe`); return s; };
  const touch = (s) => s && changed.add(s.id);
  for (const [i, o] of (Array.isArray(ops) ? ops : [ops]).entries()) {
    try {
      switch (o.op) {
        case 'set_meta': merge(p.meta, o.meta); p.scenes.forEach((s) => changed.add(s.id)); break;
        case 'add_scene': { const s = clone(o.scene); if (!s.id) s.id = 's' + (Date.now() % 1e6) + i; let at = p.scenes.length; if (o.after !== undefined) { const idx = typeof o.after === 'number' ? o.after : p.scenes.findIndex((x) => x.id === o.after); at = idx + 1; } p.scenes.splice(at, 0, s); touch(s); break; }
        case 'remove_scene': { const k = p.scenes.findIndex((x) => x.id === o.id); if (k < 0) errors.push(`cena "${o.id}" não existe`); else p.scenes.splice(k, 1); break; }
        case 'duplicate_scene': { const k = p.scenes.findIndex((x) => x.id === o.id); if (k < 0) { errors.push(`cena "${o.id}" não existe`); break; } const s = clone(p.scenes[k]); s.id = o.id + '_copy' + i; p.scenes.splice(k + 1, 0, s); touch(s); break; }
        case 'move_scene': { const k = p.scenes.findIndex((x) => x.id === o.id); if (k < 0) { errors.push(`cena "${o.id}" não existe`); break; } const [s] = p.scenes.splice(k, 1); p.scenes.splice(o.to, 0, s); break; }
        case 'update_scene': { const s = scene(o.id); if (s) { merge(s, o.set); touch(s); } break; }
        case 'set_narration': { const s = scene(o.id); if (s) { delete s.narration; delete s.lines; if (o.lines) s.lines = o.lines; else s.narration = o.text; touch(s); } break; }
        case 'add_actor': { const s = scene(o.scene); if (s) { (s.actors ||= []).push(o.actor); touch(s); } break; }
        case 'update_actor': { const s = scene(o.scene); const a = s?.actors?.find((x) => x.id === o.actor); if (!a) errors.push(`actor "${o.actor}" não existe`); else { merge(a, o.set); touch(s); } break; }
        case 'remove_actor': { const s = scene(o.scene); if (s) { s.actors = (s.actors || []).filter((x) => x.id !== o.actor); touch(s); } break; }
        case 'swap_character': { for (const s of p.scenes) { if (o.scene && s.id !== o.scene) continue; for (const a of s.actors || []) { if (o.actor && a.id !== o.actor) continue; if (o.from && a.char !== o.from) continue; a.char = o.to; touch(s); } } break; }
        case 'add_prop': { const s = scene(o.scene); if (s) { (s.props ||= []).push(o.prop); touch(s); } break; }
        case 'update_prop': { const s = scene(o.scene); const a = s?.props?.find((x) => x.id === o.prop); if (!a) errors.push(`prop "${o.prop}" não existe`); else { merge(a, o.set); touch(s); } break; }
        case 'remove_prop': { const s = scene(o.scene); if (s) { s.props = (s.props || []).filter((x) => x.id !== o.prop); touch(s); } break; }
        case 'add_beat': { const s = scene(o.scene); if (s) { (s.beats ||= []).push(o.beat); touch(s); } break; }
        case 'remove_beat': { const s = scene(o.scene); if (s?.beats) { s.beats.splice(o.index, 1); touch(s); } break; }
        case 'clear_beats': { const s = scene(o.scene); if (s) { s.beats = []; touch(s); } break; }
        case 'set_voice': { for (const s of p.scenes) { if (o.scene && s.id !== o.scene) continue; if (!o.scene) p.meta.voice = o.voice; else s.voice = o.voice; touch(s); } break; }
        default: errors.push(`op #${i}: "${o.op}" desconhecida. Válidas: ${Object.keys(OPS_HELP).join(', ')}`);
      }
    } catch (e) { errors.push(`op #${i} (${o.op}): ${e.message}`); }
  }
  return { project: p, changed: [...changed], errors };
}
