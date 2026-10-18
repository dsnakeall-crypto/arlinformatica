# Auditoria dirigida — PR #59 / CI 1280

## Evidência verificada no GitHub
- Commit: 4c54f58301b477fcb4cc3fe3bc68f8d566263174
- GitHub Actions run: 38149551434
- backend, backend-mysql e frontend aprovados.
- E2E: 251 testes passaram, 1 falhou.
- Falha: tests/e2e/arl-web-final-expense-visual-20261010.spec.ts linha 30 (desktop-chromium).
- Asserção: gridTemplateColumns da classe .cgo-indicators precisa ter >=2 colunas, mas registrou 1 coluna.
- Não há evidência suficiente para afirmar se é regressão real de responsividade, viewport, espera incorreta ou teste desatualizado.

## Missão do agente testes-ci
1. Ler AGENTS.md, .agents/roles/testes-ci.md e especificações de layout.
2. Reproduzir apenas o cenário em ambiente local isolado.
3. Medir viewport, breakpoint, largura do container, CSS final e momento da avaliação.
4. Capturar screenshot, trace e evidências. Comparar com layout aprovado.
5. Classificar: defeito de produto, teste incorreto ou flakiness. Não suprimir asserções nem alterar layout aprovado.
6. Apresentar proposta de correção mínima e comandos de regressão; aguardar revisão antes de editar.

## Apoio
Se necessário consultar .agents/roles/frontend-mobile.md e .agents/roles/revisor-arquitetura.md.

## Restrições
Não fazer commit/push/merge/deploy, não usar KingHost ou banco oficial, não apagar logs e não gastar Codex sem tarefa consciente.
