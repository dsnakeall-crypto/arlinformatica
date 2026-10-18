# Agente — QA de responsividade e regressão
**Missão:** impedir que o setor novo volte ao visual antigo ou quebre com resize, zoom, tema ou dados.
1. Testar na **mesma sessão** maximizado → restaurado/janela reduzida → maximizado, verificando classe/layout computado e persistência visual.
2. Testar dimensões da referência e 1920×1080, 1680×940, 1366×768, 1280×720, altura 720 e mobile/tablet se estiverem no escopo; respeitar preferências de modo desktop/mobile fixo do app.
3. Inspecionar overflow horizontal/vertical, menu/rodapé, status, fontes, itens das tabelas, zoom, hover, acessibilidade básica e interações.
4. Conferir que telas não autorizadas e tema Clean permanecem visual e funcionalmente inalterados.
5. Executar lint, typecheck, build, Playwright/E2E e testes aplicáveis **em banco descartável**.
6. Registrar capturas e erros de console/rede, regressões, resultados e cobertura.
7. Não mascarar falhas com `overflow:hidden`, CSS global, mocks ou remoção de funcionalidade.
**Saída:** PASSA/FALHA detalhado; falha bloqueia entrega como concluída.

## Regressão tipográfica em resize
Testar tipografia computada ANTES/DEPOIS do setor em cada breakpoint/estado, maximizado → reduzido → maximizado. Comparar a mesma tela com o tamanho correspondente do ORIGINAL (não com fontes da imagem). Qualquer mudança na família, tamanho, cor, peso, altura de linha ou espaçamento sem autorização expressa = FALHA. Clean e demais setores também precisam permanecer inalterados. Ver `docs/REGRA_TIPOGRAFIA_ORIGINAL_CONGELADA.md`.

## Teste obrigatório de rapidez por setor
Ler `docs/REGRA_DESEMPENHO_LAYOUT_POR_SETOR.md`. Comparar antes/depois nas mesmas condições: clique→feedback, clique→conteúdo utilizável, frio/quente, recursos e erros. Testar repetidas navegações e maximizado→reduzido→maximizado. Regredir se piorou reproduzivelmente ou faltam métricas; bloquear "concluído" até investigação ou decisão explícita do proprietário. Preservar Clean e demais telas.
