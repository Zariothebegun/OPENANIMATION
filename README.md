# OpenAnimation

Motor para vídeos animados com personagens 2D integradas em cenários 3D. O projecto é orientado a JSON e hooks de código para que um agente possa criar cenas, acções e movimentos de câmara sem copiar frames de referência.

## Conteúdo
- [`stickforge/`](stickforge/README.md): código-fonte, DSL, editor, API, renderer, cenários e exemplo Pé Grande.
- [`stickforge_completo.tar.gz`](stickforge_completo.tar.gz): pacote do motor sem `node_modules`, cache de render, modelos de voz ou vídeos de saída.
- [`CONTEXTO.md`](CONTEXTO.md): estado actual, verificações e trabalho ainda por fazer.
- [`sono_projecto.json`](sono_projecto.json): projecto de exemplo.

## Melhorias recentes do motor
- Captura dos frames em JPEG binário e reutilização dos buffers de composição.
- Tentativa automática de aceleração gráfica com modo de compatibilidade.
- Kits de floresta, montanha, cabana e rio; o rio tem textura de água animada.
- Porte de personagem `large`, utilizável em `actor.build`.
- Validação Cinema que avisa quando o projecto repete cenário/enquadramento ou deixa os actores sem deslocação.

O Cinema 3D compila com `node src/cinema/build.mjs`; projectos podem ser verificados com `node src/cli.js validate <ficheiro.json>`. A qualidade visual final deve ser confirmada inspeccionando frames gerados; esta revisão não gerou vídeo.
