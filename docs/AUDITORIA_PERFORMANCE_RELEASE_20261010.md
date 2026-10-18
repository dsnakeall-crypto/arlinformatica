# ARL Informática — Auditoria de desempenho e preparação de publicação (10/10/2026)

## Objetivo
Congelamento visual do Web Clean, Web Original e Mobile aprovado pelo proprietário. Investigar e corrigir lentidão, flashes, cargas duplicadas; verificar regressões com banco temporário; preparar homologação e publicação controlada. Sem alterar banco oficial, sem commit ou deploy antes do aceite final.

## Ambiente e proteção
- Fonte: C:\laragon\www\arlinformatica, branch main, DDEV/WSL2.
- Backup da etapa anterior às mudanças: C:\Users\Allan\ARL-backups\pre-performance-audit-20261010-220336
  (arquivos de foco, status Git, diff binário já existente, lista não rastreada, SHA-256).
- Branch tinha aproximadamente 135 entradas alteradas/não rastreadas **antes** desta auditoria. Não executar `git reset`, `git clean` nem publicação de uma árvore suja sem congelar um pacote de release reproduzível.
- E2E usa PHP local + SQLite de testes. Suite de backend explicitamente isolada via APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory:.
- Nenhum deploy, commit ou atualização de schema oficial nesta rodada.

## Achados de código confirmados
1. **Navegação de fatura agrupada** — `ExpenseControlController::summary` agrupa linhas de cartão por instituição e retorna `debt_id=null`. Antigamente o clique disparava `goBank`, renderizando grade de tipos antes de exibir gastos.
2. **Navegação individual** — callback invocava `showDetail` e `setTab('debts')` antes da resposta de `GET /debts/:id`; podia mostrar tela intermediária e um aviso de carga.
3. **Múltiplas consultas** — `expense-control-page.tsx` volta a chamar `/configuration` e `/summary` em transições de filtros e páginas, além de `/debts` ou `/projection`. Há oportunidade de separar carregamento estrutural de dados variáveis após medir tempo de backend e invalidação de cache.
4. **Caminho Windows/WSL** — DDEV advertiu explicitamente que montar o projeto em `/mnt/c/laragon/www/arlinformatica` pode ter custo elevado de IO. Isso NÃO prova lentidão no servidor KingHost: benchmarking local e produção são diagnósticos distintos.
5. **Arquivo de estilos** — build Vite contém chunk de CSS do Gestor de Gastos em torno de 196 KB (tamanho bruto, anterior à compressão). Otimizar apenas após identificar regras duplicadas e verificar o visual via snapshots.
6. **Backend** — endpoints `summary` e `debts` chamam `ensureMonth`; exigir teste/índices e segurança de concorrência antes de propor caching ou remoção de escritas. NÃO alterar lógica financeira sem prova.

## Correção pontual já aplicada
- `resources/js/expense-control-page.tsx`: `showDetail(id,true)` só troca para Gastos após obter detalhe; faturas consolidadas fazem salto direto para Gastos com instituição/tipo filtrados; preservados os valores e o layout.
- `resources/js/expense-control-mobile-summary.tsx`: novo callback opcional `onInvoice` reutiliza a mesma renderização para Web e mobile sem alterar componentes visuais. Caminho anterior disponível como fallback.
- `tests/e2e/expense-direct-invoice-performance-20261010.spec.ts`: verifica fluxo consolidado e individual, com clientes/faturas descartáveis. **2/2 passaram** após estabilizar a espera inicial da aplicação.

## Testes executados
- DDEV: lint, typecheck, build React/Vite e 50 testes unitários: aprovados.
- Navegador Playwright: 2 testes novos de fluxo e 11 testes ampliados (ícones, layout, gastos, navegação): aprovados na rodada direcionada.
- A execução conjunta de testes antigos de faturas falhou em contagem global fixa `toHaveCount(3)` porque compartilhava banco temporário com testes anteriores que tinham criado mais linhas. Testes novos isolados passaram; futura melhoria da suíte: filtrar pelos IDs/prefixos e evitar dependência de contagem global, sem tocar produção.
- Backend Feature com banco SQLite **em memória**: em execução quando este relatório foi iniciado; acrescentar resumo final após conclusão.

## Bloqueios para publicar — verificar ANTES de autorização
1. Terminar suite backend e revisar erros, cobertura crítica de OS/financeiro, pagamentos, perfis, backup/restauração e mobile.
2. Auditoria independente no Claude/Codex das alterações desta auditoria e do código pendente, preferencialmente com teste do fluxo de navegação.
3. Congelar pacote local imutável de release: lista de arquivos, checksums, manifesto e plano de rollback. Não apagar nem sobrescrever o original.
4. Comparar migrations exigidas pela cópia de produção, sem aplicar/resetar tabelas; avaliar alterações de acesso ao Gestor de Gastos.
5. Antes do deploy: backup VERIFICADO e separado do banco MySQL oficial, uploads/anexos e arquivos operacionais; validar restauração em homologação.
6. Confirmar PHP/extensões/rotas, `.env`, HTTPS, permissões, cache e assets estáticos no KingHost, sem expor segredos.
7. Homologação visual e funcional final pelo proprietário; exigir sua autorização específica para publicar e janela de manutenção.
8. Smoke test pós-publicação e rollback imediato em caso de erros.

## Próxima rodada de desempenho
Medições comparáveis em sessões frias/quentes no DDEV, em celular e PC. Registrar clique→primeiro feedback, transição até destino, chamadas XHR/fetch, renderizações, tempos de resposta PHP, tempo SQL e bundle. Meta: clique ≤100ms, navegação em cache ≤300ms, sujeitos a hardware e rede. Priorizar UX sem esconder erros.

## Atualização de execução do backend
A suíte completa `Feature` foi iniciada contra SQLite **em memória** com variáveis de ambiente explícitas. Os grupos concluídos até `SimpleAdminAuthorizationTest` passaram, abrangendo CSRF, autenticação, permissões, Gastos, extratos, reembolsos, estoque, PDF, OS, reabertura e senha da OS. Um teste posterior ficou significativamente lento/bloqueado em IO com processo PHP em estado `D` no contêiner (indicativo de espera não interrompível de disco). **Não declarar toda a suíte aprovada até haver resumo final.** Registrar como pendência de tempo/ambiente se a execução não terminar.

## Estado final da tentativa de suíte completa
A execução ficou bloqueada por vários minutos em IO do ambiente Docker/WSL sobre /mnt/c, após os grupos de testes até SimpleAdminAuthorizationTest (todos os grupos apresentados até aí passaram). Foi encerrado **apenas** o processo de teste PHP em memória (SIGTERM, exit 143) para não travar o computador. O servidor DDEV e bancos oficiais não foram reiniciados, limpos nem tocados por essa finalização. Portanto a suíte **Feature completa não está aprovada**. É bloqueador para publicar até a causa ser investigada e a suíte restante terminar.
