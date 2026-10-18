# Diagnóstico da CI E2E vermelha — PR #59 (11/10/2026)

## Resultado confirmado no GitHub
- CI atual: https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38119227895
- Backend PHP/SQLite: PASSOU.
- Backend PHP/MySQL 8: PASSOU.
- Frontend: PASSOU.
- E2E navegador desktop: FALHOU (37 cenários). Os 31 cenários Mobile já haviam PASSADO localmente, mas o E2E completo na CI não ficou verde.
- O job Playwright publicou screenshots/vídeos/traces para análise no próprio GitHub. Não há prova de 37 defeitos da aplicação; muitos são expectativas antigas dos testes.

## Grupos diagnosticados nas falhas
- Muitos testes ainda procuravam o seletor extinto "Layout neste dispositivo", trocado pelos cartões em Configurações > Layouts.
- Outros procuravam abas antigas do Controle de Gastos ("Projeção", "Pagamentos", "Quitadas") e expectativas de indicadores que mudaram.
- Também surgiram verificações ainda não classificadas de grade WEB, listas de clientes, etiquetas externas, contagens de faturas e timeout de navegação. Precisam de investigação específica; não tratar todas como falso positivo.

## Correções locais efetuadas NESTA etapa (não enviadas ao GitHub)
- Criado helper de teste setDeviceLayout que usa preferência local e reload; não toca em produção.
- Substituídas aproximadamente 20 interações antigas com seletor inexistente em 14 arquivos de teste.
- Atualizado testes/e2e/clean-appearance.spec.ts para navegação Mobile atual (botões inferiores e submenus, sem antigas abas).
- Atualizados testes/e2e/stage-ten.spec.ts para validar a seleção real por cartões e persistência de layout.
- Resultado da primeira amostra local: 8/9; reteste isolado do único erro (clean appearance): PASSOU. Teste do stage-ten de layout: PASSOU.
- Lint, TypeScript e descoberta/listagem de testes: PASSARAM após os ajustes.
- Cópia anterior às alterações em C:\Users\Allan\ARL-backups\pre-desktop-ci-fix-20261011.
- Alterações locais em 15 arquivos de tests/e2e NÃO commitadas nem enviadas, para evitar acionar novamente a CI de longa duração antes de analisar o restante.

## Próximos itens indispensáveis
1. Inspecionar as demais falhas Desktop do artifact do GitHub com cuidado; atualizar expectativas obsoletas sem esconder defeitos reais.
2. Rodar testes Desktop envolvidos em grupos curtos, especialmente Financeiro/Controle de Gastos, layouts, tabelas e permissões.
3. Rodar regressão E2E local mais ampla; executar revisão e commit/push somente quando mudanças sustentadas por teste estiverem prontas.
4. Verificar novamente a CI GitHub dos quatro jobs.
5. Não mesclar a PR #59 nem publicar na KingHost sem CI totalmente verde, revisão final de alterações e backup verificado.

Nenhuma alteração de produção/KingHost/MySQL oficial foi realizada.
