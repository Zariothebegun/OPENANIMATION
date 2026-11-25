# Skill claude-animated-shorts (MIT, mromidev) — material de consulta

Cópia de `SKILL.md`, `references/STYLE_BIBLE.md` e relatórios de revisão. É o padrão de qualidade a igualar.
**Não seguir o fluxo dela à letra** (escrever o projecto todo em código, `bridge-stills`, etc.). Neste motor o fluxo é:
JSON (esboço) → `review` (ver frames) → hooks de código → `review` (2–3 rondas) → `render`.

## Tradução skill → este motor
| Skill | Aqui |
|---|---|
| câmara por palavra, push-ins, glides, roll, shake | hook `state(s,t,api)` mexe em `s.cam` |
| objectos / oclusores em primeiro plano | hook `build/update` |
| DOF, flash, grade, luz | `s.dof`, `s.fx`, `s.light` no `state` |
| ciclo de revisão com verificador e notas 0–10 | `node src/cli.js review ... --refs 'ref/frames/*.png'` + `tools/measure.py` |
| controlo final (frames pretos/congelados) | comparar frames da revisão; ainda não automatizado |
Ler `STYLE_BIBLE.md` antes de escrever hooks; usar os relatórios como exemplos de notas e correcções.

## Conteúdo completo da skill (agora incluído)
- `references/frames` e `references/sheets`: frames de referência e folhas lado a lado → usar com `tools/measure.py` e `review --refs`.
- `templates/`: código da skill (mundo, elenco, história, pós-processamento). Já portámos a arte e o pós-processamento para `src/cinema/web/`; ler `world.ts`/`cast.ts` como exemplo de como escrever um cenário novo (kit) ou um objecto.
