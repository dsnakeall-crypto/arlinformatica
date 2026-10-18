# ARL Informatica — homologacao integral (resultado parcial) — 2026-10-11

Escopo: testes locais de performance, banco MariaDB, seguranca, regressao desktop/mobile, backup e preparacao de release.
Regra inviolada: nao houve alteracao da KingHost, nem do MySQL oficial, nem publicacao, commit ou push.

## Resultados confirmados
- Volume/paginacao local (SQLite isolado): SimulationVolumeTest e ClientServerPaginationTest: 7 testes aprovados, 3616 assertions.
- Seguranca: AuthenticationGateTest, EmployeeAuthorizationTest, SimpleAdminAuthorizationTest, CsrfSecurityTest, SessionSecurityTest e RememberCookieTest: 22 testes aprovados, 106 assertions na ultima bateria selecionada.
- Backup e protecao a reset: BackupDatabaseIsolationTest + DatabaseResetTest: 3 testes aprovados, 40 assertions, incluindo restauracao simulada em banco isolado e protecao de outro esquema.
- React: 50/50 testes unitarios aprovados, TypeScript, lint e build previamente aprovados.
- Playwright selecionado: 7/7 testes E2E desktop aprovados na bateria anterior.
- Cliente ficticio realmente apresentado em tela: 3/3 aberturas; 1076 ms, 426 ms, 72 ms, com pesquisa e cache.
- MariaDB DDEV 11.8.9: conexao e tabelas conferidas. EXPLAIN basico mostrou clients_name_index e PRIMARY de service_orders.

## Problemas/limites confirmados nesta rodada
- Suite completa PHP no Windows apresenta falhas iniciais em varios testes; um arquivo de OS que falhou na rodada integral passou isoladamente (4 testes / 65 assertions). A extensao gd esta ausente no PHP 8.4 Windows; o teste PhotoOptimizerContractTest que depende dela falhou. Sao necessarios diagnostico de isolamento e repeticao no ambiente Linux com GD.
- Suite Playwright integral desktop/mobile foi iniciada, mas nao havia finalizado na hora desta consolidacao. Nao classificar como aprovada.
- MariaDB: carga sintetica de dezenas de milhares de registros nao foi concluida, e as consultas EXPLAIN basicas nao substituem essa prova.
- Backup real da KingHost: NAO realizado; backup/restauracao comprovados SOMENTE nos testes isolados locais.
- Seguranca: os testes selecionados nao substituem auditoria completa de uploads, IDOR/permissoes por objeto nem hardening de ambiente remoto.

## Checklist bloqueante para liberar producao
1. Suíte integral PHP sem erros nao explicados e com GD em ambiente compativel.
2. Regressao total desktop/mobile validada, incluindo perfis e dispositivos.
3. Carga MariaDB em base sintetica isolada, EXPLAIN das consultas operacionais mais caras.
4. Backup consistente do banco oficial e arquivos enviados em local seguro, integridade e restauracao para ambiente separado.
5. Verificacao de acesso e SSL na KingHost; deploy apenas apos autorizacao explicita e plano de rollback.

A recomendacao atual e NAO PUBLICAR ate concluir esses itens.
