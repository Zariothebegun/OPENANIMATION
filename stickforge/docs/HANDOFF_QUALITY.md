# Estado do motor cinema e lacunas

Este documento substitui o diagnóstico antigo, que descrevia um renderer de placas 3D pré-renderizadas. O estado actual do caminho `meta.engine:"cinema"` é diferente.

## Implementado
- Uma cena Three.js é mantida durante a sequência de frames. As personagens 2D aparecem como cartões dentro do mundo; a cena inclui luz, sombras e efeitos de tinta, profundidade de campo, bloom e cor.
- Os kits `street`, `forest`, `mountain`, `cabin` e `river` são construídos proceduralmente, com materiais partilhados e geometria agrupada para reutilização. `src/cinema/bank.js` liga os nomes de projecto aos kits e às luzes.
- O realizador pode escolher planos (`shot`) ou indicar keyframes (`cam3`). `from`, `to` e os beats definem movimento de palco. As funções `hooks` permitem construir um adereço 3D uma vez e animá-lo por frame com código determinístico.
- As cenas são cacheadas por conteúdo e versão do renderer. A aceleração gráfica é tentada por omissão, com fallback ao renderer de compatibilidade.
- O pipeline entrega frames ao FFmpeg através de captura JPEG binária e reutiliza buffers de composição, evitando strings base64 e canvases temporários por frame.

## Lacunas reais
- Os mundos são kits reutilizáveis, não cenários detalhados e exclusivos para cada argumento. A qualidade de modelação, materiais e adereços ainda precisa de crescer para se aproximar da referência.
- Os actores continuam a ser cartões 2D (com portes reutilizáveis `adult`, `stout`, `kid` e `large`); o pipeline não cria automaticamente nova ilustração ou corrige arte com um modelo de imagem. Um agente pode alterar o JSON e escrever hooks, mas não existe aqui integração com um modelo externo de edição visual.
- O plano de câmara por defeito usa presets determinísticos. Para uma realização mais precisa, cada projecto deve descrever movimentos, cortes, reacções, focagem e adereços em beats/hooks.
- O CLI `review` pode criar frames-chave e compará-los com referências locais. A semelhança visual só fica demonstrada depois de rever resultados contra frames autorizados da referência; compilar o código ou validar o JSON não prova a qualidade final.

## Próximas melhorias recomendadas
1. Criar kits de maior detalhe por família de ambientes e adereços reutilizáveis com escala, textura e variantes estáveis por seed.
2. Aumentar a variedade de silhuetas e roupas dos actores sem abandonar o estilo 2D integrado no cenário 3D.
3. Fazer o gerador de projecto produzir uma sequência de cenas, locais, planos e acções diferentes a partir do tema, em vez de um único enquadramento repetido.
4. Usar a revisão de frames para corrigir composição, clipping de actores, continuidade e legibilidade antes de chamar um render completo.

Não há aqui uma duração de render garantida. Ela varia conforme hardware, qualidade seleccionada, resolução, efeitos e dimensão do projecto.
