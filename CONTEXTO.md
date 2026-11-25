# OpenAnimation / StickForge — contexto do projecto

## Objectivo
App iOS para criar vídeos animados a partir de instruções. A IA escreve e revê código de realização; não deve inventar factos nem pedir um vídeo de referência para cada tema. O estilo combina personagens 2D com cenários, luz, sombras e câmara 3D. A geração deve ser rápida e repetível.

## Motor local
- Código em `stickforge/`; pacote de distribuição `stickforge_completo.tar.gz`.
- Caminhos 2D e Cinema 3D, editor web, API, DSL JSON, validação, cache por cena, voz e hooks de código por cena.
- Cinema 3D mantém uma cena Three.js ao longo dos frames; cenários actuais: rua, floresta, montanha, cabana e rio com textura de água animada. Personagens são cartões 2D dentro do cenário; agora os portes `adult`, `stout`, `kid` e `large` são controláveis por `actor.build`.
- Hooks: `hooks` (ficheiro) ou `hooksCode`; `build(api)` constrói objectos 3D uma vez, `update(obj,s,t,api)` anima-os e `state(s,t,api)` ajusta actor/câmara/luz por frame.
- O render tenta aceleração gráfica e tem modo de compatibilidade (`SF_GPU=0`). O caminho de frames usa captura JPEG binária e buffers de composição reutilizados.
- O projecto de demonstração `stickforge/bigfoot.json` tem seis cenas com cinco cenários-base, deslocações de personagens e planos de câmara variados; está configurado em `high`.

## Verificação feita nesta revisão
- `node src/cinema/build.mjs`: bundle do Cinema compila, incluindo a nova superfície de rio animada e o porte `large`.
- `node src/cli.js validate bigfoot.json`: JSON válido, sem erros nem avisos.
- Planos compilados: as seis cenas têm movimento de personagem e movimento de câmara.
- Não foi gerado vídeo nesta revisão. A semelhança visual com a referência continua por confirmar; não declarar equivalência nem inventar tempo de render.

## Ficheiros fornecidos
- `sono.mp4`, `sono_projecto.json`: amostra de vídeo e projecto fornecidos pelo utilizador dentro da pasta partilhada.
- O vídeo enviado como inspiração define o nível visual pretendido: personagens 2D integradas em mundos 3D, vários ambientes, planos cinematográficos e movimentos claros.
- `docs/skill-shorts/`: estudo de referência de `mromidev/claude-animated-shorts`. Usar os princípios de composição e técnica como inspiração; não copiar frames.

## Regras do projecto
- Não repetir um único cenário/enquadramento ao longo de um vídeo; variar locais, planos e acções.
- Melhorar o motor e manter a criação orientada por comandos JSON/hooks, com cache de cenas.
- Não afirmar tempos de criação/render sem cronometrar esse processo; estimativas e medições têm de ser identificadas como tal.
- A qualidade visual só fica verificada depois de inspeccionar os frames gerados. Validação e compilação provam apenas que o código e o projecto são aceites.

## Próximas lacunas
- Adicionar cenários e adereços com mais detalhe e variantes reutilizáveis, mantendo composição rápida.
- Aumentar a variedade de silhuetas/roupas e animações 2D dentro do palco 3D.
- Melhorar a criação automática do storyboard para diversificar cenários, planos, movimentos e reacções com prompts sobre temas novos.
- Fazer revisão visual dos frames quando houver autorização para gerar pré-visualizações; corrigir clipping, enquadramento, continuidade e semelhança à referência.
- A integração nativa com o app iOS e qualquer ligação a um modelo de edição visual externo ainda não está implementada neste pacote.
