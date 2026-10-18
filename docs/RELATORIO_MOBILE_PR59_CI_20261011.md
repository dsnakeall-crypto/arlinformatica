# ARL Informática — Correções Mobile e revisão GitHub CI (11/10/2026)

## Correções concluídas
- Situação anterior: 31 testes Mobile, 18 aprovados, 10 falhas, 3 não executados.
- Corrigidas expectativas obsoletas em:
  - tests/e2e/ajustes-chatgpt.mobile.spec.ts (Clientes mobile sem seletor de ordenação; paginação permanece)
  - tests/e2e/arl-mobile-reform.mobile.spec.ts (menu em trilho flutuante e Layouts por cartões; abas do Administrador Simples)
  - tests/e2e/clean-rail-cards.mobile.spec.ts (sem aro/gradiente no ícone compacto, conforme estilo final; formas no elemento contêiner)
  - tests/e2e/expense-control-mobile.spec.ts (Adicionar dívida, indicadores do mês atuais, ícones e abertura direta de faturas filtradas).
- Sem alterações visuais/funcionais no React/CSS durante esta correção. Apenas arquivos de testes foram editados nas correções Mobile.
- Primeiro reteste: 12 de 15 passaram; após corrigir três diferenças adicionais, segundo reteste passou 8/8.
- Regressão INTEGRAL Mobile: **31/31 APROVADOS (7,7 minutos)**, log docs/MOBILE_REGRESSAO_INTEGRAL_R3_20261011.log.
- Também aprovados lint, typecheck, 51 testes frontend e build após as alterações.
- Testes backend anteriores: 343/343 PHP, 6.918 assertions; MySQL 8 real CI da primeira rodada foi aprovado.

## Cópia de segurança anterior às correções
C:\Users\Allan\ARL-backups\pre-e2e-mobile-20261011
Inclui histórico Git bundle, diff original, cópia de tests/e2e e arquivos novos candidatos ao GitHub.

## Comparação e GitHub
- Base main local e remota correspondia ao commit 9702fa1.
- Criada branch separada prepublicacao/mobile-ci-20261011.
- Revisado e enviado commit 1ad3fc4: 127 arquivos selecionados, sem segredos/bancos/dumps/logs/backups.
- Corrigida única indentação em routes/api.php exigida pela CI Pint; commit cfce625.
- Pull Request rascunho (NÃO mesclada): https://github.com/dsnakeall-crypto/arlinformatica/pull/59
- CI automática workflow ID da segunda execução: 38119227895, com jobs PHP/SQLite, PHP/MySQL, frontend e E2E.
- PHP/SQLite, PHP/MySQL e Frontend APROVADOS na segunda execução do GitHub Actions (run 38119227895). E2E completo ainda EM EXECUÇÃO na última checagem; não declarar CI 4/4 até o job terminar.
- Ficam de fora do GitHub 169 registros locais não essenciais (logs, análises/diagnósticos, backups e artefatos gerados). Não mexer neles sem análise.

## Regras preservadas
- Sem deploy, merge na main, backup/alteração no MySQL oficial, DNS ou KingHost.
- A PR permanece em rascunho até CI e revisão final.
- Não substituir APP_KEY do servidor oficial, não usar migrate:fresh nem apagar qualquer registro da KingHost.
