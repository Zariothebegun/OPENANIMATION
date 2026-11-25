# OpenAnimation / StickForge — motor para vídeos animados com IA

Motor 2D e cinema 3D + projectos em JSON + editor web + API para um agente de IA. O agente cria o storyboard, escolhe bibliotecas e pode escrever hooks de código para construir/animação por cena. O motor trata de personagens 2D em mundos 3D, voz, boca, legendas, câmara, transições e render.

```
bash scripts/setup.sh      # npm install + Kokoro (voz) + modelos
npm start                  # editor em http://localhost:4173 (a IA edita por /api, o editor actualiza em directo)
npm run render examples/ram60.json -- -o out/video.mp4
```
Requisitos: Node ≥ 20, Python 3, ffmpeg. **Para a IA ler: `docs/AGENT_GUIDE.md` e `docs/CATALOG.md`.**

## Arquitectura
- **Render próprio com `skia-canvas`** (Skia nativo, sem browser): cada cena é um mp4 independente (cache por hash do conteúdo + hash do motor), renderizada num worker persistente e enviada em frames raw ao ffmpeg (libx264); depois `concat` sem recodificar. Animação a 15 fps, ffmpeg duplica para 30.
- **Voz Kokoro (ONNX)** em pool de processos persistentes, em paralelo por fala e com cache em disco.
- O render de cada cena começa assim que a voz dessa cena está pronta (pipeline). Duração da cena = duração real da voz (quantizada a 1/15 s), boca sincronizada pelo envelope de energia do áudio.
- **O motor é puro/isomórfico**: o mesmo código corre em Node (render) e no browser (preview do editor). As `ops` da API são as mesmas que o editor usa.
- **Arte 100 % procedural** (16 personagens, 18 expressões, 23 animações, 47 objectos, 16 cenários, 10 transições), desenhada por código nosso → sem assets de terceiros, sem questões de licença de arte. Fontes: Anton e Inter (SIL OFL, incluídas).

## O que NÃO está feito / limites honestos
- **Não toquei no repositório Viently**: a conta GitHub não estava ligada a esta sessão, por isso não inspeccionei `app-ios/`, o branch nem o último commit. Integração = pendente (ver abaixo).
- **Não avaliei em profundidade** Oxframe, HyperFrames, Motion Canvas, Rive, Remotion, PixiJS, GSAP nem bibliotecas externas de personagens. Escolhi renderer próprio porque mediu rápido sem browser; **não medi** os restantes, logo não afirmo que sejam piores. Rive/Lottie podem valer a pena para personagens com arte de ilustrador.
- Qualidade visual: stickman vectorial limpo, mas simples (rig FK, sem deformações de malha, mãos/pés básicos). A "qualidade TikTok" de vídeos feitos por animadores humanos exige mais arte e animações; a biblioteca cresce adicionando clips em `src/engine/poses.js`, personagens em `characters.js`, etc.
- Preview do editor corre a 15 fps sem áudio até carregares "Sincronizar voz". Não testei o editor em telemóvel nem com vários utilizadores.
- Vozes Kokoro são boas mas sintéticas; para pt-PT não há voz (só pt-BR). Verifica a licença dos pesos Kokoro (Apache-2.0 segundo o projecto) antes de uso comercial.
- Sem música/SFX por defeito (`meta.music` aceita um ficheiro).

## Integração no Viently (proposta)
O Viently é Expo/React Native. A via mais rápida e segura: correr StickForge como **serviço de render** (container com ffmpeg + Python/Kokoro), e o app (a) chama `POST /api/project` + `/api/render`, (b) mostra o MP4, (c) abre o editor numa WebView ou reimplementa o inspector nativo falando com as mesmas `ops`. Nova área "Vídeos" separada das páginas educativas/2D/3D existentes, com opções facultativas (duração, estilo, personagem, voz, formato) que mapeiam para `meta` e para o prompt do realizador. Passos: ligar o GitHub → inspeccionar `app-ios/` → criar a área no branch indicado → ligar ao serviço.

## Cenários 3D e direcção de câmara
`bg:{kind:"set3d", kit:"..."}` renderiza cada frame numa cena three.js: personagens-cartão 2D recebem luz e sombra dentro de cenários 3D pintados. `shot` escolhe um movimento de câmara predefinido; `cam3` permite keyframes. A câmara fica parada se a configuração pedir um plano fixo. Ver `docs/AGENT_GUIDE.md` e `docs/CATALOG.md`. Dependências extra: `three`, `playwright` (Chromium).

No Cinema, cenas sem `cam3` recebem cobertura automática (contexto, fala/acção e reacção), sem acrescentar frames. `autoCoverage:false` conserva um plano único. Os ambientes procedurais incluem quartos, cozinha, consultório, sala, praça, deserto, neve, costa e ruínas; cada cena recebe decoração determinística própria e aceita `bg.opts.seed` explícita. Personagens de palco também podem entrar ou mudar de altura com `actor.from.y` e `actor.y`.

## Correr como app independente
- Local: `bash scripts/setup.sh && npm start` → editor + API em http://localhost:4173
- Docker: `docker build -t stickforge . && docker run -p 4173:4173 -v sf_cache:/app/cache -v $PWD/out:/app/out stickforge`
- CLI: `node src/cli.js render projecto.json -o out.mp4 [--quality draft|standard|high]`
Requer ffmpeg, Node ≥ 20, Python 3 (Kokoro TTS). Uso de memória e desempenho dependem da qualidade seleccionada e da complexidade do vídeo.

## Motor cinema (3D, `meta.engine: "cinema"`)
Cena three.js por frame (kits 3D + personagens-cartão) + tinta + DOF + bloom + grade. Os cenários e os buffers de composição são reutilizados; o transporte das imagens ao ffmpeg não usa strings base64 por frame.
- `node src/cli.js cframe projecto.json <cena> <t> -o out.jpg --quality draft|standard|high`
- `node src/cli.js render projecto.json -o out.mp4 --quality high`
- Biblioteca de personagens/objectos/expressões: `src/cinema/bank.js` + `bank.local.json` (extensível).
- Medição numérica vs referências: `python3 tools/measure.py cmp frame.jpg 'ref/frames/*.png'`.

O renderizador tenta aceleração gráfica por omissão e recorre ao modo de compatibilidade se não estiver disponível. `SF_GPU=0` força compatibilidade; `SF_GPU=1` força a tentativa por GPU. O log mostra o adaptador WebGL seleccionado.
