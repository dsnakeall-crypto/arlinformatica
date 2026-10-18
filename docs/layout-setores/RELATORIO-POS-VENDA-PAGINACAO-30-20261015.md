# Pós-venda — paginação de 30 registros
**Data:** 15/10/2026. **Autorização:** pedido expresso do proprietário, dentro da auditoria/otimização da versão local aprovada.

## Alteração implementada
- Em `resources/js/post-sale-page.tsx`, `PAGE_SIZE = 30`: a lista filtra pelo cliente ou número da OS e renderiza somente até 30 linhas por página; mantém numeração contínua, total e botões Anterior/Próxima página.
- Ao mudar a busca, volta à página 1; se uma exclusão diminuir o total, a página é ajustada para a última válida.
- A seleção em lote permanece ativa ao navegar, e o comando Selecionar todos seleciona somente os registros da página atual, não todas as páginas ocultas.
- O resultado filtrado foi memoizado (`useMemo`) para não refazer buscas sempre que apenas o estado de seleção muda.
- Estilos do controle de páginas anexados exclusivamente em `resources/css/post-sale-web-list-gold-20261015.css`. Tabela, cores/ícones aprovados, ações WhatsApp, status, backend/API e regras de exclusão preservados.
- `tests/e2e/post-sale-pagination-30.spec.ts` criado para testar paginar 65 registros (30/30/5), numeração, busca, navegação, seleção entre páginas, exclusão simulada dos 5 finais e ajuste automático para 2 páginas.

## Testes com evidência
- Na cópia candidata isolada: `npm run lint`, `npm run typecheck`, `npm run test:unit` (61/61), `npm run build` passaram.
- 2/2 testes E2E específicos de paginação passaram com dados fictícios interceptados no navegador e sem gravar banco. A última modificação no teste apenas trocou o caminho de captura para o diretório automático `testInfo.outputPath`; ela não alterou o aplicativo.
- Após aplicar no original, build, lint, typecheck, 61/61 unit e `git diff --check` passaram.
- Em 390px com layout desktop forçado, as colunas da tabela mantêm largura mínima de 680px e podem produzir overflow horizontal global; o **pager permanece dentro da janela**. A tabela e sua estrutura anterior não foram redesenhadas.
- A suíte E2E INTEGRAL foi preparada em segunda cópia isolada, mas a ferramenta bloqueou a execução por configurações de segurança. **Não foi realizada a bateria integral de 288+ testes neste momento.** Também permanecem as divergências históricas de seis E2Es visuais apontadas na auditoria anterior; não marcá-las como resolvidas.

## Segurança, código e backups
- Código original alterado SOMENTE nos dois arquivos de Pós-venda citados; novo teste adicionado. Nenhuma migration, alteração SQL, confirmação WhatsApp real, publicação, Git push, reset ou exclusão de dados.
- Backup anterior dos componentes em `Backups/...FASE-00-VERSAO-LOCAL-APROVADA/AJUSTE-POS-VENDA-30-ANTES/`, com SHA-256 conferido.
- Snapshot novo do código completo pós-ajuste: `CODIGO-LOCAL-ATUAL-COM-POSVENDA30-FINAL.tar.gz` e `MANIFEST-ATUAL-COM-POSVENDA30-FINAL-SHA256.csv`, 935/935 arquivos restaurados e conferidos SHA-256. Este snapshot é o **mais recente**; manter o snapshot da Fase 0 como ponto de retorno anterior à paginação.
- Cópia candidata para GitHub igualmente alterada, mas não publicada. Auditoria inicial de 400 testes PHP/7439 verificações e 77 combinações de viewport continua válida para a versão anterior, pois o backend não foi editado; repetir E2E integral e conferência visual no GitHub antes do release.

## Próxima otimização possível
A paginação atual é **de renderização no React**: a API `GET /post-sales` ainda retorna todos os registros. Isso reduz trabalho do navegador, mas NÃO reduz payload da rede nem consulta SQL. Se houver volume significativo de pós-vendas, medir tempo/payload e posteriormente considerar paginação de servidor opt-in, preservando busca, total e seleção entre páginas.
