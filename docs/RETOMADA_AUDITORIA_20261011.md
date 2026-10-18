# Retomada de auditoria ARL — 11/10/2026

## Contexto
Projeto local: C:\laragon\www\arlinformatica. Nenhum deploy, push, commit, acesso ao banco oficial ou mudanca em layout.

## Evidencias confirmadas
- Auditoria previa consultada: docs/AUDITORIA_PERFORMANCE_PAINEL_CLIENTES_20261011.md.
- Testes anteriores incluidos nesse relatorio: 5.000 clientes, Painel leve, cache, Mobile, faturas diretas e navegacao de 10 modulos; nao foram assumidos como reexecutados nesta rodada.
- TypeScript: npm run typecheck aprovado (docs/VALIDACAO_TIPOS_RETOMADA_20261011.txt).
- React unit: npm run test:unit 50 testes, 50 passaram, 0 falharam (docs/VALIDACAO_UNIT_RETOMADA_20261011.txt).
- ESLint: npm run lint aprovado (docs/VALIDACAO_LINT_RETOMADA_20261011.txt).
- Tentativa Playwright de 10 menus: BLOQUEADA na inicializacao do servidor isolado; PHP do PATH (PHP 8.4 WinGet) nao carregou SQLite. Log: docs/RETESTE_DEZ_MENUS_20261011_LOG_LOCAL.txt. Nenhum resultado de E2E deve ser computado nesta rodada.

## Diagnostico do bloqueio
scripts/e2e-server.mjs prefere o primeiro php executavel no PATH; nao valida previamente pdo_sqlite/sqlite3. O ambiente atual resolveu o PHP do WinGet 8.4 sem extensao SQLite. Laragon local possui a pasta php-8.3.33-Win32-vs16-x64 com php.ini, porem nao foi encontrado php.exe nessa pasta nesta checagem. Proxima via: usar PHP com pdo_sqlite habilitado e validar php -m antes de rerodar; ou executar E2E no DDEV isolado, atentando para IO em /mnt/c.

## Proximos passos
1. Selecionar PHP de teste correto sem alterar configuracao da producao.
2. Medir clique ate primeiro feedback/renderizacao e long tasks usando Playwright traces, removendo espera artificial de 950ms das metricas.
3. Registrar baseline quente/frio e celular/desktop com dados sinteticos.
4. Verificar EXPLAIN/indices em MariaDB de teste e suite E2E/Feature ampla.
5. Publicacao apenas com backup, restauracao, revisao e autorizacao expressa.

## Medicao de clique nos dez menus — continuacao
- Criado `tests/e2e/performance-navigation-feedback-20261011.spec.ts`; execucao local desktop-chromium aprovada, 10 menus visitados.
- Relatorio JSON: `output/performance-audit-20261011/navigation-feedback-local.json`.
- Tempo ate botao do menu ganhar classe active: 24–52 ms; ate dois frames apos a mudanca: 59–81 ms, em uma passagem local.
- 0 long tasks capturadas durante a amostragem; NAO equivale a prova de ausencia de engasgos em todas as condicoes.
- Importante: o tempo de menu ativo NAO mede carregamento completo dos dados, e varias transicoes vieram de cache (0 requests). Repetir primeiro carregamento, dados prontos, variacao de rede e Mobile antes de afirmar fluidez plena.
- Nao houve alteracao de codigo de produto, servidor oficial ou banco de dados real.

## Diagnostico das requisicoes interrompidas (11/10/2026)
- Instrumentacao adicional identificou net::ERR_ABORTED quando a navegacao automatica saia de uma tela antes de terminar chamadas anteriores: /api/orders?tab=closed_week..., /api/orders?q=..., /api/expense-control/summary?...
- Verificacao por permanencia na tela: Ordens, Servicos e Controle de Gasto responderam HTTP 200, sem abortos nos endpoints respectivos, conforme docs/DIAGNOSTICO_PERMANENCIA_TELA_20261011.txt.
- A primeira suite 'dados carregados' reprovou por tratar quaisquer cancelamentos como erro e nao mede o conteudo renderizado em si. Diagnostico aponta cancelamento esperado na troca de menus; nao declarar que todos os dados foram pintados nem que desempenho completo esta aprovado.
- Codigo de produto preservado; nenhuma alteracao em KingHost ou MySQL oficial.
