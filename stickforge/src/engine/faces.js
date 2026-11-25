// Biblioteca de expressões faciais. brow = [esq, dir] em graus (+ = lado interno sobe => triste/preocupado; - = zangado).
export const FACES = {
  neutral:   { lid: 0.36, eye: 'dot',    brow: [0, 0],     mouth: 'flat',  desc: 'cara normal' },
  happy:     { lid: 0.18, eye: 'dot',    brow: [4, 4],     mouth: 'smile', desc: 'sorriso simples' },
  grin:      { lid: 0.12, eye: 'dot',    brow: [6, 6], browY: 0.05, mouth: 'smile', openBase: 0.55, desc: 'sorriso aberto (entusiasmo)' },
  laugh:     { eye: 'closed', brow: [8, 8], browY: 0.06, mouth: 'smile', openBase: 0.9, blush: true, desc: 'a rir às gargalhadas' },
  sad:       { lid: 0.3, eye: 'dot',    brow: [22, 22],   mouth: 'frown', tear: true, desc: 'triste' },
  worried:   { eye: 'open',   brow: [20, 20],   mouth: 'wavy',  sweat: true, desc: 'preocupado/nervoso' },
  angry:     { lid: 0.42, eye: 'dot',    brow: [-24, -24], mouth: 'frown', vein: true, desc: 'zangado' },
  surprised: { eye: 'wide',   brow: [10, 10], browY: 0.2, mouth: 'o', openBase: 0.35, desc: 'surpreso' },
  shocked:   { eye: 'wide',   brow: [14, 14], browY: 0.3, mouth: 'o', openBase: 0.9, sweat: true, desc: 'chocado (boca muito aberta)' },
  thinking:  { eye: 'open',   brow: [-8, 12], pupil: [0.8, -0.8], mouth: 'flat', desc: 'a pensar (olha para cima)' },
  smug:      { lid: 0.58, eye: 'line',   brow: [-6, 0],    mouth: 'smirk', desc: 'convencido/espertalhão' },
  confused:  { lid: 0.2, eye: 'open',   brow: [14, -10],  mouth: 'wavy',  desc: 'confuso' },
  excited:   { eye: 'star',   brow: [6, 6],     mouth: 'smile', openBase: 0.7, blush: true, desc: 'olhos em estrela, muito entusiasmado' },
  sleepy:    { eye: 'line',   brow: [10, 10],   mouth: 'o',     desc: 'com sono' },
  dizzy:     { eye: 'x',      brow: [0, 0],     mouth: 'wavy',  desc: 'tonto/KO' },
  wink:      { eye: 'dot',    brow: [4, -2],    mouth: 'smirk', winkL: true, desc: 'pisca o olho' },
  proud:     { lid: 0.2, eye: 'closed', brow: [4, 4],     mouth: 'smile', blush: true, desc: 'orgulhoso' },
  scared:    { eye: 'wide',   brow: [22, 22], browY: 0.15, mouth: 'wavy', sweat: true, pupil: [0, 0], desc: 'com medo' },
};

export function faceDef(name) { return FACES[name] || FACES.neutral; }
