# Viently / Motor de vídeos 2D — contexto para a próxima sessão

## Objectivo
App (telemóvel) para criar vídeos animados por código, sem geração de imagem/vídeo por IA na criação (nada de alucinação).
A IA escreve um JSON curto (cenas, falas, personagens, câmara) + opcionalmente hooks de código por cena ("pintor": ver frames e melhorar por código).
Render em servidor/GPU. Biblioteca de estilos e peças (personagens, objectos, expressões) a crescer.

## Estado do motor (stickforge)
- Pacote final: `stickforge_completo.tar.gz` (enviado). Motor 2D antigo + cinema 3D (`src/cinema/`, `meta.engine:"cinema"`).
- Comandos: `validate`, `cframe` (um frame), `review` (frames-chave + métricas `--refs`), `render`.
- Hooks por cena: `hooks` (ficheiro) ou `hooksCode`: `state(s,t,api)` altera câmara/personagens/luz/saturação (`s.sat`), `build/update` cria objectos 3D.
- GPU: `SF_GPU=1` (Windows → d3d11; Mac → metal; Linux → vulkan). Não testado: o portátil do utilizador tem RTX 2000 Ada 8 GB. Confirmar linha `[gpu] WebGL renderer` antes de medir.
- Não está incluído: node_modules, cache, models (vozes kokoro; correr scripts/setup.sh).
- Medição: `tools/measure.py cmp <frame> '<refs>'` (luma, sat, textura, paleta).

## Tempos medidos (vídeo "sono")
- Criação (IA: JSON + hooks + 1 ronda revisão + correcções): ~112 s para 53 s de vídeo.
- Render: a medir na GPU (RTX 2000 Ada). Não usar números de CPU.

## Vídeo de referência
- `sono.mp4` (O homem que não dormia há 100 dias, 53 s, 12 cenas) + `sono_projecto.json` (com hooks). Erros conhecidos: cartazes "DIA N" cortados à esquerda em planos fechados; bateria cortada; chávenas parecem latas; rua sempre igual.

## Métricas
- Referências da skill (frames/sheets em `docs/skill-shorts/references/`): sat ~0,88, luma ~0,46 (d05), ink width ~15,8 (bell).
- Motor: ~77 % dos indicadores dentro da gama (sem hooks); com hooks 63–83 %. Distância de paleta 12–16 (alvo < 8).

## Skill de referência (MIT, mromidev/claude-animated-shorts)
- Copiada em `docs/skill-shorts/` (SKILL.md, references/ com frames, sheets, reports, STYLE_BIBLE.md, templates/). Só consulta, NÃO é o fluxo (o fluxo dela escreve tudo em código e demora horas).
- `references/reports/characters.md` tem medidas das personagens (cabeça H/W 0,93, maxilar cheio, contorno 3× mais grosso em baixo, etc.).

## Repositório kaomei/stickman-video-director (MIT)
- Estilos A (modelos de vídeo: fora) e B (muitos usam gpt-image-2: fora). Só o B5 (`scripts/b5-art-kit.cjs`, SVG em código) entra como candidato; o exemplo com boneco tipo Homem-Aranha NÃO se reutiliza. Música CC BY 4.0 (créditos obrigatórios).
- Ainda não integrado.

## Biblioteca (`biblioteca.zip`)
- `index.html` mobile (abas, chips de categoria, grelha 9:16, modal de vídeo) + `media/` + `README_AGENT.md`. Dois cartões reais: nosso (poster do sono) e B5 (poster). Os outros são placeholders.

## Regras acordadas
- Só entra o que funciona sem gerar imagem/vídeo na criação. Peças geradas por IA só se vierem empacotadas com licença clara e forem fixas (não geradas a cada vídeo).
- Respostas diretas, em português europeu, sem repetir o que o utilizador já sabe; tempos sempre medidos (relógio) e distinguir "medido" de "estimativa".
- Não confirmar nada sem medir; não dizer que está corrigido sem rever frames.

## Ideias em aberto
- Packs de peças 2D (PNG) gerados pelo ChatGPT com as referências `ref_personagens.jpg` e `ref_cenas.jpg` + prompt (ver conversa). Precisa de um carregador de PNG no motor (não existe).
- Vários estilos 2D simples (boneco de pauzinhos, quadro branco, Roblox 2D, recortes de papel, BD, pixel art, neon). Precisa de um registo de estilos.
- Fazer um comando `polish` automático (IA via API nas rondas).
- Integração Viently (GitHub não ligado).

## Próximos passos sugeridos
1. Medir o render na RTX 2000 Ada (`SF_GPU=1`) para o `sono_projecto.json`: tempo draft e standard.
2. Corrigir cartazes cortados (limitar posição à largura visível da câmara) e rever frames.
3. Registo de estilos + carregador de PNG (peças) + 2 estilos de prova.
4. Viently: ligar o GitHub e integrar a API.
