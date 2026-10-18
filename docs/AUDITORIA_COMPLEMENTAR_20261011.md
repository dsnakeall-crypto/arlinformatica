# Auditoria complementar ARL - 11/10/2026

## Resultados
- Regressao de Clientes com SQLite descartavel e registros sinteticos: aprovada; log docs/CLIENTES_VISUAL_REGRESSAO_20261011.txt.
- Novo benchmark visual de Clientes: nao concluido. Primeiro ensaio pressupunha request mesmo com cache; segundo pressupunha cartao num banco temporario possivelmente vazio. Nao chamar de defeito do produto.
- Teste PHP de cookies de sessao RememberCookieTest: 6 aprovados e 27 assercoes; log docs/SEGURANCA_SESSAO_20261011.txt.
- DDEV/MariaDB ainda nao foi testado nesta rodada; WSL estava parado na primeira inspecao e docker nao foi reconhecido no terminal Windows. Resultados SQLite nao validam MariaDB.
- Nenhuma mudanca em KingHost, dados oficiais, layouts ou repositorio remoto.

## Pendencias
1. Benchmark de renderizacao completa com dados sinteticos garantidos, perfis cold/warm e mobile/desktop.
2. MariaDB de testes isolado com EXPLAIN, indices e volume sintentico, apos validar DDEV.
3. Testes RBAC, CSRF, permissoes, uploads e auditoria de publicacao.
4. Backup e restauracao isolada antes de qualquer deploy.
# ARL - Auditoria local complementar 11/10/2026

## Medicao visual com fixture sintetica (passou)
Teste: tests/e2e/performance-clients-seeded-20261011.spec.ts
Log: docs/CLIENTES_VISUAL_SEEDED_20261011.txt
JSON: output/performance-audit-20261011/clients-visual-seeded.json
- Primeira abertura ate cliente pesquisado visivel: 1076 ms; heading 938 ms.
- Segunda abertura: 426 ms; heading 37 ms.
- Terceira abertura: 72 ms; heading 52 ms.
- 1 cliente ficticio realmente visivel nas 3 tentativas. E2E aprovado. Sem producao.
- O benchmark envolve pesquisa, debounce e cache; nao generalizar para todos os modulos nem redes.

## Ambiente MariaDB
- DDEV v1.25.4 e MariaDB 11.8 no WSL2 confirmados. ddev start passou e containers web e db ficaram ready.
- Alerta DDEV: projeto no filesystem Windows /mnt/c pode gerar lentidao.
- Comando de SHOW TABLES nao executou devido a quoting do terminal (SQL interpretado como SHOW); nao houve EXPLAIN nem benchmark de indices MariaDB aprovado. Nao confundir inicializacao do banco com auditoria SQL completa.

## Seguranca / qualidade
- PHP RememberCookieTest: 6/6 passaram com 27 verificacoes.
- npm run typecheck e npm run lint executados sem erros relatados.
- Auditoria RBAC, IDOR, CSRF, uploads, hardening e restauracao ainda nao concluida.
- Nao houve deploy, acesso ao banco KingHost nem mudancas de dados oficiais.

## Resultados adicionais confirmados
- Suite de seguranca local: AuthenticationGateTest, EmployeeAuthorizationTest, SimpleAdminAuthorizationTest, CsrfSecurityTest e SessionSecurityTest: 16 testes e 79 assercoes aprovados. Evidencia docs/SEGURANCA_BATERIA_20261011.txt.
- Benchmark visual com cliente ficticio, campo de pesquisa e listagem realmente renderizada: tres de tres passagens aprovadas. 1076 ms, 426 ms e 72 ms, respectivamente. Trata-se de teste de um unico modulo e inclui debounce da pesquisa.
- DDEV MariaDB iniciou com containers prontos. A consulta de metadados via redirecionamento ao ddev mysql terminou sem saida; portanto ainda nao comprovou schema, indices nem EXPLAIN. A etapa de desempenho SQL continua pendente.
- Teste completo com dados reais e ambiente KingHost NAO realizado. Nao houve alteracao de producao nem publicacao.
