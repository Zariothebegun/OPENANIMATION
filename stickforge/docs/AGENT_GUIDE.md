# StickForge — guia para o agente (realizador)

Tu és o **realizador**. Não escreves código: escreves **um JSON** (o "projecto") que escolhe personagens, cenários, objectos e animações das bibliotecas, e diz *quando* cada coisa acontece. O motor trata do resto (voz, boca, câmara, legendas, transições, render).

Lista completa de valores válidos: `docs/CATALOG.md` (ou `GET /api/catalog`). **Usa só ids desse catálogo** — o validador devolve "Quis dizer X?" quando erras, e deves corrigir e voltar a tentar.

## Fluxo (1 chamada ao modelo)

1. Gera o projecto completo de uma vez (storyboard + falas + beats) e envia-o com `PUT /api/project` `{project}` (ou grava num ficheiro e corre `npm run render ficheiro.json -- -o out.mp4`).
2. `POST /api/validate` → corrige erros (as mensagens dizem o que mudar).
3. `POST /api/render {"quality":"draft"}` → pré-visualização; depois `"standard"` ou `"high"` para a versão final.
4. Alterações do utilizador ("troca a personagem", "muda o cenário da cena 3", "reescreve a fala 2") → **só `POST /api/ops`**, sem regenerar o projecto completo. O cache permite refazer apenas as cenas alteradas; o tempo depende do equipamento, qualidade e complexidade.

O editor web (`/`) mostra as alterações em directo (poll de 1 s), por isso o utilizador vê a IA a editar.

## Estrutura

```jsonc
{
  "meta": { "format": "9:16", "lang": "pt-br", "voice": "pf_dora", "quality": "standard",
            "captions": { "enabled": true, "y": 0.8 }, "transition": "cut", "speed": 1 },
  "scenes": [ {
    "id": "hook", "bg": "tech", "transition": "pop",
    "title": { "text": "O QUE É A\nRAM?", "at": 0.2, "dur": 2.6 },            // opcional, texto grande animado
    "actors": [ { "id": "n", "char": "nerd", "face": "excited", "x": 0.5 } ],   // x: 0..1 ; flip, scale, y, hat, outfit... opcionais
    "props":  [ { "id": "ram", "kind": "ram", "x": 0.5, "y": 0.4, "size": 0.4, "at": "w3", "fx": "drop", "motion": "float" } ],
    "lines":  [ { "who": "n", "text": "Porque é que o teu telemóvel fica lento?" } ],   // narração (who omitido = 1.º actor; "none" = narrador)
    "beats":  [ { "t": "w0", "actor": "n", "act": "point_up", "dur": 2.5 } ],  // realização ao longo do tempo
    "camera": { "zoom": [1, 1.1] }
  } ]
}
```

A **duração da cena vem da voz** (falas + 0.5 s). Não precisas de a definir (`dur`/`minDur` só se quiseres cenas mais longas).

### Tempo (`t`, `at`, `until`)
`2.5` segundos · `"w5"` início da palavra 5 da cena (começa em 0) · `"w5e"` fim da palavra · `"l1"` início da fala 1 · `"l1e"` fim · `"@memória"` início dessa palavra · `"50%"` · `"end"` / `"end-1.5"`.
**Prefere `w`/`l`/`@palavra`**: o objecto aparece mesmo quando a palavra é dita, mesmo que a voz mude.

### Beats (um objecto por acontecimento; `t` obrigatório)
| Campo | Efeito |
|---|---|
| `actor` + `act` (+`dur`, `then`) | muda a animação; com `dur` volta a `idle` (ou `then`) |
| `actor` + `to` (+`dur`) | anda para `x` (0..1) ou `{x,y}`; `act` por defeito `walk` (usa `run` para correr) |
| `actor` + `face` | muda a expressão (fica até nova mudança) |
| `actor` + `flip` / `scale` / `show` / `hide` | vira, escala, entra, sai |
| `prop` + `show`/`hide`/`move:{x,y}`/`resize`/`rotate`/`set:{...}`/`fx` | anima objectos (`set` altera `text`, `data`, `level`...) |
| `camera:{zoom,x,y,focus:"actorId",dur,ease}` | zoom/pan |
| `fx:"shake"` ou `"flash"` (+`dur`,`amp`,`color`) | efeito de cena |

**Fala automática:** quem fala faz `talk` (gestos) e mexe a boca ao ritmo real da voz, sem precisares de pedir. Só adiciona `act` quando quiseres um gesto específico (apontar, celebrar…).

### Props com conteúdo
`text` (`text`,`color`), `bubble` (`text`), `board`/`screen` (`text`), `bars` (`data`,`labels`,`colors`,`text`), `linechart` (`data`), `pie` (`data`), `battery` (`level`), `image` (`src`, requer o host fornecer imagens).

## Receita para vídeos educativos de ~60 s

- **8–10 cenas** de 5–9 s; **130–170 palavras** no total (≈ 60–70 s de voz).
- Cena 1 = **gancho** (pergunta ou facto surpreendente, `title` grande). Última = fecho/CTA.
- Em cada cena: 1 ideia, 1–2 personagens, 1–3 objectos que **ilustram a palavra-chave** (`"at":"@RAM"`), 1–3 beats.
- Varia cenário e transição de cena para cena (`wipe_left`, `pop`, `zoom`, `iris`, `slide_up`…). Não repitas a mesma duas vezes seguidas.
- Dois personagens a dialogar (`"who"` em cada fala) dá muito mais ritmo que um só a explicar.
- Usa expressões para a emoção (`surprised`, `worried`, `smug`, `excited`) e `camera.zoom` suave em momentos-chave.
- Frases curtas (≤ 14 palavras): as legendas mostram 2–3 palavras de cada vez.
- Para números/comparações usa `bars`/`pie`/`linechart` em vez de descrever.

## API (HTTP, JSON)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /api/catalog` | — | tudo o que existe (personagens, props, vozes, ops…) |
| `GET /api/project` | — | `{project, version}` |
| `PUT /api/project` | `{project}` | substitui o projecto (valida primeiro) |
| `POST /api/ops` | `[ {op:…}, … ]` | aplica ao projecto vivo → `{changed:[sceneIds]}` ou `{errors}` (nada é aplicado se houver erro) |
| `POST /api/validate` | `{project?}` | `{ok, errors, warnings}` |
| `POST /api/voice` | `{project?}` | durações reais + envelope + url de áudio (o editor usa para preview) |
| `POST /api/render` | `{quality: draft|standard|high}` | `{job}`; depois `GET /api/job/:id` → `{status, result.timings, url}` |

CLI equivalente: `npm run render projecto.json -- -o out.mp4`, `npm run validate projecto.json`, `node src/cli.js apply projecto.json ops.json`, `node src/cli.js frame projecto.json <cena> <t> -o f.png` (frame estático sem voz — bom para verificar visualmente).

### Operações (`POST /api/ops`)
`set_meta`, `add_scene`, `remove_scene`, `duplicate_scene`, `move_scene`, `update_scene`, `set_narration`, `add_actor`, `update_actor`, `remove_actor`, **`swap_character`** (`to`, opcional `scene`/`actor`/`from`), `add_prop`, `update_prop`, `remove_prop`, `add_beat`, `remove_beat`, `clear_beats`, `set_voice`. Detalhes em `docs/CATALOG.md`. `null` em `set` apaga um campo.

Exemplos:
```json
[{"op":"swap_character","to":"hero"}]                                   // troca todas as personagens
[{"op":"update_scene","id":"desk","set":{"bg":"office","transition":"iris"}}]
[{"op":"set_narration","id":"hook","lines":[{"text":"Nova frase."}]}]
[{"op":"add_beat","scene":"what","beat":{"t":"w4","actor":"n","act":"celebrate","dur":1.5}}]
[{"op":"set_meta","meta":{"voice":"pm_alex"}}]
```

## Boas práticas / erros comuns
- Ids de actor/prop únicos **dentro da cena**; `who`, `actor`, `prop` dos beats têm de existir nessa cena.
- `props.at` omitido = visível desde o início. Objectos de "cenário" (`table`, `tree`, `house`…) ficam atrás das personagens; os restantes à frente.
- Coordenadas em fracção do ecrã: `x` 0..1; `y` 0..1 (de cima para baixo); `size` em fracção do lado menor (0.2 = 20 %).
- Chão: personagens ficam na linha do chão do cenário; muda `y` só para as pôr mais perto/longe (maiores y = à frente).
- Verifica sempre com `validate`; para olhar para uma cena sem esperar pela voz, usa `frame`.

## Ensinar temas novos (liberdade criativa)

- **Estilos** (`meta.style`): `painted` (por defeito; pintado, sombreado, vinheta+grão, legendas minúsculas de 1–2 palavras) ou `flat` (plano, legendas pop em maiúsculas).
- **Cenários**: usa uma predefinição (`launch_night`, `desert_dusk`, `highway`, `garage`, `blueprint`, `sky_day`, `space_dark`, `lab_dark`) ou compõe um com `{"kind":"scenic","sky":[[0,"#..."],[1,"#..."]],"ground":0.66,"groundColor":"#...","layers":[{"t":"stars"},{"t":"sun",...},{"t":"mountains",...},{"t":"city"}],"front":[{"t":"road"}]}`. Camadas: stars, glow, sun, moon, clouds, mountains, hills, dunes, city, rect, haze, grid, road, lights, stripes, floorgrid, blueprint.
- **Diagramas à medida**: prop `shape` com `paths` (rect, circle, ellipse, poly, line com `arrow`, curve, arc, text) em coordenadas −0.5..0.5, cada uma com `at` (aparece) e `draw:true` (traço animado). É assim que desenhas qualquer esquema que o catálogo não tenha.
- **Parâmetros de props** vão no próprio objecto ou em `"p":{...}`.
- **Câmara**: em beats, `camera:{focus:"id", part:"head|face|body|full", zoom, x, y, rot, dur, cut:true}`; cortes secos (`cut`) dão o ritmo de 1–3 s. Estado inicial em `scene.camera`.
- **Objectos novos**: `car_side` (jets, hover, mode), `tank`, `gauge`, `nozzle`, `ramp`, `spotlight`, `crowd`, `callout`, `sparks`.
- **Factos**: pesquisa antes, cita só o que está em fontes, marca estimativas como "ilustrativo/relatado".
- **Fundo gerado por IA**: `bg:{kind:"image",src:...}` com `host.images` (hook existente; não testado com um modelo de imagem real).

## Profundidade e luz cinematográfica (estilo `painted`)
- Cenários `scenic`/predefinições têm 3 camadas: **fundo** (desfocado, move-se menos com a câmara), **plano das personagens** e **primeiro plano** (`fg`, desfocado, move-se mais) → parallax real.
- `scene.light = {x,y,color,k,ambient,shadow}` aplica luz quente/sombra fria às personagens; `scene.particles = {kind:"snow|embers|dust|smoke",n}`; `scene.grade = {c,a}` correcção de cor. Predefinições já trazem valores por defeito (`false` desliga).
- Cenários históricos: `berlin_ruins`, `eastern_snow`, `war_room`, `bunker`, `normandy`, `bomber_night`, `factory`, `snow_night_street`. Props: `tank_side`, `plane_side`, `explosion`, `warmap`, `banner`, `stat`. Personagens: `soldier`, `ruso`, `general`, `officer`, `dictator`.
- Em beats, `camera.zoom/x/y` são **números** (o validador rejeita arrays); zoom gradual = `scene.camera:{zoom:[a,b]}`.
- Não desenhes simbologia nazista nem de ódio; usa cores/legendas para identificar lados.

## Cenários 3D com câmara de realizador (`bg.kind = "set3d"`) — PREFERIR para vídeos de qualidade

Os cenários são **mundos 3D reais** (three.js, pintados com tinta/sombras/névoa) e as personagens 2D andam **dentro** deles, com sombra projectada. Escolhe `shot` ou `cam3` para orientar o movimento da câmara.

**Direcção automática no Cinema:** sem `cam3`, o motor monta cobertura com 2–4 planos por cena, guiados pela duração, falas e acções. Cada plano mantém o cenário e corta para o personagem relevante; pequenos avanços de câmara reutilizam os mesmos frames. Define `"autoCoverage": false` numa cena para manter um único enquadramento. Podes ajustar a altura em metros com `actor.y`; `actor.from.y` anima a entrada nessa altura.

Os kits semânticos agora incluem interiores próprios (`bedroom`, `kitchen`, `clinic`, `living_room`) e exteriores próprios (`plaza`, `desert`, `snow`, `ocean`, `ruins`), além de `street`, `forest`, `mountain`, `cabin` e `river`. O motor escolhe uma variação procedural estável por cena; define `bg.opts.seed` para repetir exactamente uma composição.

```jsonc
{ "id": "cells", "transition": "whip",
  "bg": { "kind": "set3d", "kit": "body_tunnel" },      // kits: ver docs/CATALOG.md ("Kits 3D")
  "shot": "dolly_in",                                    // orbit_l | orbit_r | dolly_in | dolly_out | crane | low
  "actors": [
    { "id": "a", "char": "ana", "x": 1.3, "z": 0.8, "toward": "b", "from": { "x": 4, "z": -2 }, "build": "stout" },
    { "id": "b", "char": "rui", "x": -0.8, "z": -1.2, "toward": "a" } ],
  "lines": [ { "who": "a", "text": "…" } ] }
```

### Coordenadas de palco (metros)
`x` lateral (−3..3 típico, 0 = centro), `z` profundidade (+ = mais perto da câmara base, − = mais longe). `toward:"id"` faz a personagem virar-se para o outro; `from:{x,z}` faz a personagem **entrar a andar** desde esse ponto (`enter` = segundos, def. 1.1); beats com `to:{x,z}` fazem-na andar pelo espaço.

### Regras de realização (obrigatórias)
1. **Evita cenas estáticas.** Usa `shot` e, na maioria das cenas, pelo menos uma personagem com `from` ou um beat `to:{x,z}`. Alterna planos de conjunto, planos próximos e ângulos baixos.
2. **Cada cena nova muda posições (x,z), `shot` e, de preferência, o kit.** O validador avisa se repetires enquadramento.
3. Câmara avançada: `cam3` como objecto — `{focus:"id"|["a","b"]|"*"|[x,y,z], orbit:{az:[a,b], r:[a,b], el:[a,b], h, fov:[a,b]}, ease:"smooth|cubic|spring", shake}` ou keyframes `[{t, orbit:{…}}, {t, pos:[x,y,z], look:[x,y,z], fov}]`. A câmara fica sempre dentro dos limites do kit.
4. **Transições entre cenas 3D**: `whip` (movimento rápido com motion blur) e `flash` (clarão/exposição alta) — a cena anterior prepara a saída sozinha; `fade`/`zoom`/`wipe_*` também funcionam. Alterna `whip`/`flash`; nada de `cut` seco depois da 1.ª cena.
5. **Acção constante**: quem fala gesticula (apontar, encolher ombros, pensar) e quem ouve reage, automaticamente; `auto:false` no actor desliga. Acrescenta beats `act` (`point`, `present`, `shrug`, `think`, `celebrate`…) em momentos-chave.
6. Dois personagens a dialogar (`who` alternado) em vez de um só a explicar.

### Qualidade e velocidade
- `draft`, `standard` e `high` escolhem resolução, amostragem, sombras e compressão. Usa `high` para a entrega final quando o hardware aguentar; `draft` serve para pré-visualizar composição e movimento.
- A página 3D mantém os cenários montados e reutiliza a geometria entre frames. O cache por cena evita refazer cenas que não mudaram; não há uma duração fixa garantida, pois GPU/CPU, resolução, efeitos e número de frames mudam bastante o tempo.
- O renderizador tenta usar a GPU automaticamente. Define `SF_GPU=0` para forçar o modo de compatibilidade ou `SF_GPU=1` para pedir GPU explicitamente.
- Tinta, profundidade de campo, bloom e cor são efeitos do próprio motor. Não se chama um serviço de geração de imagem a cada frame.

## Modo cinema: passagem "pintor" (hooks de código)
1. O JSON gera o esboço completo (posições, tempos, falas, câmara padrão): `meta.engine:"cinema"`.
2. `node src/cli.js review projecto.json --n 5 --dir out/review [--refs 'ref/frames/*.png']` gera frames-chave por cena (+ métricas vs referências). **Vê os frames antes de escrever código.**
3. Em cada cena podes pôr `"hooks": "ficheiro.js"` (ou `"hooksCode": "..."` inline). JS simples, `return { build, update, state }`:
- `state(s, t, api)`: altera o estado do frame antes de desenhar: `s.cam.pos/look/fov/roll`, `s.chars[i]` (x,z,expr,gest…), `s.dof.cInf`, `s.light`, `s.fx`.
   - `build(api)`: devolve um `THREE.Object3D` criado uma vez (objectos 3D novos). `update(obj, s, t, api)`: anima-o por frame.
   - `api`: `THREE, V, rng, sm (smoothstep), mat(cor), box(w,h,d,cor), cyl(r,h,cor), ball(r,cor), st`. Os materiais já têm a tinta e a sombra do motor.
4. Repete `review` 2–3 rondas (corrige só o que vês de errado). Exemplo: docs/examples/hooks_exemplo.js.
Regras medidas (skill): push-in 0.15–0.35 %/frame nos planos parados, deslizes 18–40 frames, roll 4–5°, tremor de impacto decai em 7 frames, DOF em ~1/3 do tempo, objecto em primeiro plano em ~1/3 dos planos.

**Skill de referência:** ler `docs/skill-shorts/LEIA-ME.md` e `references/STYLE_BIBLE.md` antes de escrever hooks (padrão de qualidade a igualar).
