# PR #59 — correção da corrida no E2E de Gastos Web

11/10/2026. Trabalho local, sem commit, push, merge ou publicação.

## Diagnóstico e evidências

Leitura integral de AGENTS.md, .agents/README.md, .agents/AUDITORIA_PR59_E2E_20261011.md, Projeto Mestre, Referências Visuais e README. Consultados os perfis coordenador, testes-ci, frontend-mobile, segurança, publicação e revisor-arquitetura; nenhum agente adicional necessário.

PR: https://github.com/dsnakeall-crypto/arlinformatica/pull/59
Head local/remoto: `4c54f58301b477fcb4cc3fe3bc68f8d566263174`.
CI auditada: https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38149551434
Backend, backend-mysql e frontend aprovados; E2E: 251 aprovados e 1 reprovado. O checkout de merge da CI é `e5e5d70dacf7c00c5183ce555df8984b63e658a6`; a base da PR é ancestral do head local.

O teste fazia `Locator.evaluate(getComputedStyle(...).gridTemplateColumns)` antes da conclusão das consultas de configuração/resumo. `ExpenseMobileSummary` usa uma chave baseada em `config.account_id` e `config.my_person_id`: carregar a conta substitui o componente inicial. Um ElementHandle obtido nesse intervalo pode ficar desconectado antes da avaliação. Nesse caso, o estilo calculado é vazio e `''.split(' ').length` retorna 1, embora a grade atual tenha quatro colunas.

O artefato original da CI foi baixado e inspecionado fora do repositório. A screenshot de falha já mostra quatro colunas; no trace, a consulta de resumo começa em 6546,727 ms e dura 174,019 ms, sobrepondo a avaliação da grade (6716,269–6738,410 ms). O CSS de Gastos já tinha sido recebido, com HTTP 200, antes dessa avaliação. Não há evidência de defeito do breakpoint desktop.

Reprodução controlada, retendo as respostas reais e liberando-as após obter a referência ao elemento inicial:

| Medida | Antes de carregar a conta | Referência antiga após carregar | Elemento atual após carregar |
|---|---|---|---|
| Conectado ao DOM | sim | não | sim |
| Largura | 1266,40625 px | 0 px | 1266,40625 px |
| Colunas calculadas | 4 | string vazia | 4 |
| Contagem pela asserção antiga | 4 | 1 | 4 |

Viewport: 1440 × 900. Regra desktop ativa: quatro colunas; breakpoints da folha Web em 1180/700 px mantêm duas colunas em janelas menores. A primeira execução original e cinco repetições passaram sem alterações; diagnóstico normal e diagnóstico com CPU 6× mais lenta/CSS atrasado também passaram. A reprodução determinística do nó desconectado passou e confirmou a causa da contagem 1. Classificação: corrida de sincronização no teste, sem regressão visual comprovada do aplicativo.

## Correção mínima

Somente `tests/e2e/arl-web-final-expense-visual-20261010.spec.ts`, no cenário Web:

- Registrar a espera das duas respostas GET antes do clique; exigir HTTP 200.
- Aguardar término do carregamento no DOM e ausência de alerta de erro.
- Confirmar os cinco indicadores antes de medir a grade.
- Preservar a asserção original de pelo menos duas colunas, degradê, overflow, menu desktop e retorno ao Painel.

Sem retry, timeout ampliado, sleep, mock de API ou supressão de erro na correção. Nenhuma mudança em React, CSS, cálculos, backend, migrações, permissões ou dependências.

## Backup, isolamento e rollback

Backup anterior à edição: `C:\Users\Allan\ARL-backups\pr59-ci-fix-20261011-124840`.
Cópia do workspace incluindo arquivos não rastreados, arquivos privados locais e `.git`; 4030 arquivos conferidos por SHA-256, sem divergências. `history.bundle` validado com histórico completo; status e patches working/staged preservados. `node_modules` e `vendor` não integram a cópia de segurança por serem reinstaláveis a partir dos locks.

Foi detectado outro Playwright em execução no workspace. Os testes desta auditoria rodaram na subpasta externa `validation`, com cópia independente de PHP vendor, arquivos privados de teste, SQLite descartável e porta 8029. Node utiliza as dependências já instaladas por junction. Não foi usado nem alterado o banco local de uso, banco oficial, KingHost ou configuração global. Nenhum arquivo existente do projeto foi apagado.

Rollback da correção: após conferir eventuais edições posteriores, restaurar somente o teste a partir de `workspace\tests\e2e\arl-web-final-expense-visual-20261010.spec.ts` do backup. Não executar reset, limpeza ou restauração indiscriminada do repositório. As instruções/documentos preexistentes permanecem preservados.

## Validação

- [OK] Teste afetado pós-correção: 1/1, 10,8 s de execução total (4,9 s no cenário), saída zero.
- [OK] `npm run lint`, `npm run typecheck`, `npm run build`.
- [OK] `npm run test:unit`: 51/51.
- [OK] `php artisan test --filter='ExpenseControlTest|ExpenseSummaryIndicatorsTest|SessionSecurityTest|CsrfSecurityTest'`: 56/56, 837 assertions; SQLite em memória.
- [OK] Regressão E2E executada: 42 cenários em 12 arquivos; 41 passaram no lote (6,1 min). Cobriu pagamentos, quitação, divisão, filtros, autorizações, CSRF/sessão, Web Original/Clean, faturas, navegação e Mobile/OCR com fixtures de teste.
- [OK] Cenário remanescente de janelas estreitas passou nas duas reexecuções isoladas, sem modificar esse teste ou o aplicativo. Todos os 42 cenários tiveram uma execução aprovada, em rodadas distintas.
- [OK] Teste corrigido com CPU 6× mais lenta e atrasos controlados de 800 ms na configuração/1200 ms no resumo, usando respostas reais: 2/2. Rodada conjunta com os dois retestes de janela estreita: 4/4 em 44,1 s, saída zero. Instrumentação somente na cópia externa.
- [OK] `git diff --check`; comparação por SHA-256 de todos os demais arquivos rastreados com o backup: nenhuma alteração adicional antes da atualização documental. AGENTS.md e arquivos não rastreados preexistentes preservados.
- [PENDENTE] Suíte integral verde em lote único: não considerar a rodada de 42 cenários integralmente aprovada.

Falha adicional preservada: o cenário de janela estreita expirou esperando a aba Gastos. Seu trace registra `net::ERR_FAILED` e `Unable to preload CSS .../order-popup-wl62ohKB.css`; o snapshot mostra a mensagem real de falha no carregamento da área, antes de qualquer aferição de grade. Isso difere da corrida da PR #59. A reexecução isolada passou duas vezes; não comprova estabilidade do transporte no ambiente Windows sob a suíte ampla. Não foram ocultados erros, ativados retries ou alterado timeout. Logs, screenshot, vídeo e trace da falha continuam guardados. A CI integral permanece o gate para lançamento.

Ocorrências de preparação: primeira cópia de vendor estava incompleta e foi corrigida somente na cópia de validação; primeira rodada PHP parou sem assertions por APP_KEY ausente na cópia criada de `.env.example`. Reexecução com chave pública de fixture de testes passou. Nenhum desses erros exigiu alteração no aplicativo ou configuração de uso.

Logs, screenshots e traces estão em `validation` dentro do backup externo; artefatos originais da CI em `ci-artifact`, `ci-trace` e `report-data`. Não incluir esses diretórios ou credenciais em commit/pacote.

Comandos foram executados a partir da cópia externa, com `E2E_PORT=8029`, `PHP_INI_SCAN_DIR=docs` somente no processo e `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` para PHP. O cenário corrigido usa `--project=desktop-chromium --grep 'Web usa resumo'`; a regressão ampla seleciona os arquivos arl-web-final-expense-visual, desktop-expense-shell, expense-control, expense-control-mobile, expense-direct-invoice-performance, expense-indicators, expense-indicators-mobile, expense-value-split, expense-web-floating-invoices, expense-web-reference-compact, security e session-security. Não rodar os diagnósticos externos como parte da CI do repositório.

## Revisão de segurança e próximos gates

A correção apenas observa respostas locais autenticadas e o DOM; não muda autenticação, autorização, CSRF, armazenamento, snapshots ou regras financeiras. Asserções HTTP 200 e ausência de alerta fazem erros reais falharem. Testes pagos de IA não foram utilizados nesta alteração. Comparação visual da screenshot original da CI e da captura local confirma os mesmos quatro indicadores secundários, banner mensal e menu desktop; a regressão verifica também o mobile.

- [PENDENTE] Autorização do proprietário para commit/push da correção.
- [PENDENTE] CI integral no novo commit, incluindo os quatro jobs; a CI remota ainda é a execução vermelha auditada. Esta rodada local não substitui os 252 cenários da CI.
- [PENDENTE] Merge/deploy/publicação continuam fora do escopo e não autorizados.
