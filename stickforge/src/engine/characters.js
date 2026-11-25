// Personagens pré-feitas (variações do mesmo rig). A IA escolhe um id; o editor deixa trocar.
// Podes também passar overrides inline no actor: { "char": "nerd", "outfit": "#ff0000", "hat": "crown" }.
export const CHARACTERS = {
  blue:    { desc: 'stickman azul padrão, t-shirt azul',      outfit: '#4a90e2', hair: 'short', hairColor: '#2b2118' },
  red:     { desc: 'stickman vermelho enérgico',               outfit: '#e2574c', hair: 'spiky', hairColor: '#2b2118' },
  green:   { desc: 'stickman verde calmo',                      outfit: '#4cb782', hair: 'short', hairColor: '#6b4b2a' },
  nerd:    { desc: 'cientista/nerd de óculos e bata',           outfit: '#f4f6fa', outfitType: 'lab', hair: 'short', hairColor: '#4a3426', acc: ['glasses'] },
  boss:    { desc: 'fato e gravata, ar sério',                  outfit: '#3b4157', outfitType: 'suit', tie: '#d93a3a', hair: 'short', hairColor: '#1b1b1b' },
  girl:    { desc: 'rapariga de cabelo comprido, vestido',      outfit: '#f06aa8', outfitType: 'dress', hair: 'long', hairColor: '#5a2d1b' },
  student: { desc: 'estudante com capuz amarelo e beanie',     outfit: '#f2c038', outfitType: 'hoodie', hat: 'beanie', hatColor: '#4a90e2', hair: 'short', hairColor: '#2b2118' },
  chef:    { desc: 'chef com chapéu e avental',                 outfit: '#ffffff', outfitType: 'apron', hat: 'chef', hair: 'none', acc: ['mustache'], hairColor: '#2b2118' },
  hero:    { desc: 'super-herói com capa',                       outfit: '#3a5bd9', hair: 'spiky', hairColor: '#1b1b1b', acc: ['cape'], cape: '#d93a3a' },
  wizard:  { desc: 'mago com chapéu e barba',                    outfit: '#5b3fb0', hat: 'wizard', acc: ['beard'], hairColor: '#cfcfcf', hair: 'none' },
  cool:    { desc: 'tipo fixe de óculos escuros e boné',         outfit: '#222a35', outfitType: 'hoodie', hat: 'cap', hatColor: '#e2574c', acc: ['shades'], hair: 'none' },
  king:    { desc: 'rei com coroa',                              outfit: '#8f2d56', hat: 'crown', acc: ['beard'], hairColor: '#4a3426', hair: 'none' },
  worker:  { desc: 'trabalhador com capacete',                   outfit: '#f28c28', hat: 'hardhat', hatColor: '#f2d338', hair: 'none', outfitType: 'stripe' },
  grad:    { desc: 'licenciado com chapéu de graduação',         outfit: '#222a35', hat: 'grad', hair: 'short', hairColor: '#2b2118' },
  ana:     { desc: 'engenheira de coque e óculos, bata branca', outfit: '#eef1f7', outfitType: 'lab', hair: 'bun', hairColor: '#3a2a22', acc: ['glasses'] },
  rui:     { desc: 'céptico de boné, bigode e camisola vermelha', outfit: '#c9503f', outfitType: 'hoodie', hat: 'cap', hatColor: '#2e3d5f', acc: ['mustache'], hair: 'none', hairColor: '#2b2118' },
  host:    { desc: 'apresentador de fato preto, cabelo ruivo e bigode', outfit: '#1d1a22', outfitType: 'suit_v', hair: 'short', hairColor: '#e07a30', acc: ['mustache'] },
  farmer:  { desc: 'camponês de chapéu e colete às riscas', outfit: '#3f7a96', outfitType: 'vest', hat: 'fedora', hair: 'none' },
  soldier: { desc: 'soldado aliado de capacete verde-oliva', outfit: '#7e9a52', outfitType: 'hoodie', hat: 'helmet', hatColor: '#566343', hair: 'none' },
  ruso:    { desc: 'soldado soviético de ushanka e casaco castanho', outfit: '#9a5a3a', outfitType: 'hoodie', hat: 'ushanka', hair: 'none', acc: ['mustache'], hairColor: '#3a2a1a' },
  general: { desc: 'general de boné de pala e casaco verde-cinza', outfit: '#6f8a5a', outfitType: 'suit', tie: '#2a2a22', hat: 'peaked', hatColor: '#4b5240', hair: 'none' },
  dictator:{ desc: 'ditador (cabelo escuro de risca, bigode pequeno, uniforme castanho; sem simbologia)', outfit: '#8a6a44', outfitType: 'suit', tie: '#3a2a1a', hair: 'short', hairColor: '#1f1812', acc: ['mustache'] },
  officer: { desc: 'oficial aliado de boné e casaco caqui', outfit: '#b09a62', outfitType: 'suit', tie: '#3a3322', hat: 'peaked', hatColor: '#6e6548', hair: 'none' },
  cop:     { desc: 'polícia/detective',                           outfit: '#26396b', hat: 'police', hair: 'none', outfitType: 'suit', tie: '#ffd23f' },
  granny:  { desc: 'avó/avô de coque e óculos',                   outfit: '#9b7ed9', hair: 'bun', hairColor: '#d9d9d9', acc: ['glasses'] },
};

export function resolveCharacter(actor) {
  const base = CHARACTERS[actor.char] || CHARACTERS.blue;
  const o = { ...base };
  for (const k of ['outfit', 'outfitType', 'hair', 'hairColor', 'hat', 'hatColor', 'skin', 'shoes', 'tie', 'acc', 'cape', 'stripeA', 'stripeB', 'build']) if (actor[k] !== undefined) o[k] = actor[k];
  return o;
}
