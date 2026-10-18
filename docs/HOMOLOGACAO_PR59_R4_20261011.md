# ARL Informática — Pré-publicação, PR #59 (11/10/2026)

## GitHub
- Repositório: https://github.com/dsnakeall-crypto/arlinformatica
- Branch: prepublicacao/mobile-ci-20261011
- PR em rascunho: https://github.com/dsnakeall-crypto/arlinformatica/pull/59
- Commits da etapa: 1ad3fc4 (consolidação), cfce625 (Pint), 2b59061 (E2E e fluidez DOM).
- CI da última revisão: https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38141945959
- Frontend: APROVADO; PHP/SQLite: APROVADO; PHP/MySQL e E2E em execução na última consulta desta atualização. Conferir conclusão antes de aceitar merge.

## Correções de regressão verificadas localmente
- Mobile completo: 31/31 aprovados em execução anterior.
- Testes Desktop da interface e cartões: 21 casos, 19 aprovados na primeira amostra; 2 erros corrigidos, e grupo de 6 casos aprovado após a correção.
- Controle de Gastos: 24/25 na primeira execução integral posterior às correções; o último teste de Histórico Desktop passou isolado após rebuild CSS (log CI_HISTORY_R4B_TARGET_20261011.log).
- Navegação Desktop e responsividade: 16/17 no grupo; o último cenário de menu Mobile foi atualizado e passou isolado (log CI_SIDEBAR_R4B_TARGET.log).
- Frontend: lint, TypeScript, 51 unitários e build passaram.
- Backend PHP/MySQL e PHP/SQLite: CI anterior aprovou.
- Logs de todos os grupos estão em docs/ (arquivos *.log locais não enviados ao GitHub).

## Mudanças técnicas desta etapa
- Antigo seletor de Layouts já não existia no React; corrigidos testes com referências antigas, sem recriá-lo.
- Testes adaptados aos botões e à paginação atuais, mantendo assertivas financeiras reais.
- Restaurado acesso ao Histórico de gastos Desktop que um seletor CSS ocultava.
- Reunidas múltiplas notificações de MutationObserver em uma única rotina por frame em brand2026.ts; removido enhancedShell que buscava seletor .device-layout ausente.
- Etiquetas de OS no Desktop não quebram em duas linhas; Mobile preservado.
- Testes de responsividade Desktop divididos por resolução sem retirar resoluções (8 + transição Mobile).
- Os testes de imagem usam PHP GD (configuração de homologação docs/php-audit-gd.ini).

## Segurança da produção
- Nenhuma mudança na KingHost, banco oficial MySQL, DNS, arquivos de clientes ou uploads.
- Nenhum backup/arquivo .env/log incluído no GitHub.
- Não executar git merge nem deploy antes de CI integral verde, revisão e backup oficial autorizado com restauração verificada.
