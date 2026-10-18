# Auditoria preliminar pre-publicacao — ARL APP — 2026-10-11

## Escopo e provas
- PR #59 no commit 7d83f65c692b7adeb691b16cec3f153cbe9fa1ab; GitHub Actions CI #1282 sucesso em backend, backend-mysql, frontend e e2e.
- Arvore rastreada: 571 arquivos, incluindo 233 PHP, 131 TS, 44 TSX e 48 CSS.
- Branch de publicacao permanece em rascunho, sem merge.
- Workspace contem alteracoes locais em AGENTS.md e CHECKLIST_FINAL.md e muitos arquivos nao rastreados; preservar todos.
- Arquivos locais backup_antes_limpar.sql e backup_antes_zerar.sql nao estao rastreados; .gitignore contem *.sql, .env, storage/app, output e artefatos locais.
- TECHNICAL_DEBT.md documenta coexistencia de enhancers JS legados e React; alguns continuam ativos. Exemplo: resources/js/mobile-home.ts e chamado pela diretiva @vite em resources/views/app.blade.php, e testado por tests/e2e/dashboard-loading-regression.mobile.spec.ts. NAO remover.
- resources/js/order-popup.tsx tem dependentes ativos como expense-control-page.tsx, order-detail-react.tsx, new-order-page.tsx, suppliers-page.tsx. NAO remover.
- A triagem por simples nome-base gerou falsos positivos (79/80); nao e criterio confiavel. Exige grafo de imports dinamicos e pontos de entrada Laravel/Vite para classificados.
- TECHNICAL_DEBT.md cita risco de interferencia entre fixtures E2E; manter suite completa como gate.

## Estado da auditoria de arquivos mortos
Confirmados seguros para exclusao: NENHUM. Ausencia de referencias literais nao prova que um arquivo seja morto.
Candidatos: enhancers legados coexistentes, mediante mapeamento de runtime e comparacao Web Original/Clean/Mobile. Nao sao automaticamente descartaveis.
Outros alvos: classes PHP ligadas a rotas/container, paginas Blade/Vite, assets dinamicos, CSS importado, scripts de build e testes antigos. Exigem varredura estrutural mais ampla antes de qualquer remocao.

## Diagnostico de ferramenta Codex
Tentativa de executar auditoria em sandbox read-only falhou antes de auditar: modelos gpt-6.1-sol e gpt-5.3-codex retornaram HTTP 400 'not supported when using Codex with a ChatGPT account'. Nenhuma alteracao decorreu da ferramenta. Nao presumir que agentes foram executados.

## Gates de release
1. Revisao de diff/segredos da PR completa e proveniencia de cada arquivo.
2. Auditoria completa de codigo morto baseada em referencias import/require, Vite entries, rotas, resolucao dinamica e testes; classificar certeza e risco.
3. Corrigir codigo morto apenas em branch propria, backup externo, testes funcionais/regressao e CI verde depois da remocao.
4. Verificar configuracao oficial PHP/MySQL, backup dos dados/arquivos privados, RESTAURACAO ISOLADA comprovada, rollback e deploy gradual.
5. Producao, merge, migrations ou remocao de conteudo apenas com autorizacao expressa.

Relatorio parcial de seguranca e arquitetura; nao constitui liberacao de publicacao.
