# Continuidade — ARL Informática Mobile Clean
Data: 09/10/2026 — desenvolvimento exclusivamente local.

## Origem e segurança
- Projeto: `C:\laragon\www\arlinformatica` (DDEV).
- Backup preservado: `C:\Users\Allan\ARL-backups\mobile-only-clean-20261009-213027` — existência conferida.
- Worktree já estava modificado antes desta execução. Nenhum `git reset`, `git checkout` destrutivo, commit ou push foi realizado.
- Sem acesso/gravação no banco MariaDB de produção e sem publicação na KingHost. Playwright usa `database/e2e.sqlite`, criado e populado somente para testes por `scripts/e2e-server.mjs`.

## Código recebido e verificado
- Visual Clean obrigatório nos dispositivos móveis; visual Original e demais opções mantidos no Web/PC.
- Mobile permite só navegação inferior ou menu lateral compacto.
- Lateral compacta: ícone ativo vermelho sem aro; manter ação + Nova OS.
- OS abertas (home) preservada; mudança de estilo limitada à tabela de lista de OS.
- Lista de OS: centralização e controles sem moldura.
- Clientes: busca por nome, ordenação alfabética automática e dez por página; filtros desktop conservados. Lixeira e prancheta ocultas só no mobile.
- Financeiro: seletor de mês e refinamento tipográfico de lançamentos.
- Pós-venda oculto e acesso mobile à rota bloqueado no shell; Gestor de Gastos isolado e mantido intacto.
- Serviços, Produtos e Fornecedores intocados nesta rodada.

## Complemento identificado e aplicado nesta execução
- `resources/css/arl-mobile-final-operations-2026.css`: WhatsApp e Maps na lista mobile de Clientes agora sem molduras, sem sombra e com área de toque 44×44 px; foco visível ao navegar com teclado. Seletor específico do shell ARL mobile, não atinge Gastos ou Web/PC.
- `tests/e2e/mobile-operacao-clean-20261009.spec.ts`: verificações extras para borda/sombra e área de toque dos links, botão Abrir OS, alternância para barra inferior e proteção da rota direta /post-sale.

## Validações nesta execução
- `ddev npm run lint`: OK.
- `ddev npm run typecheck`: OK.
- `ddev npm run build`: OK, refeito após o último ajuste de CSS.
- `ddev npm run test:unit`: 46 aprovados, 0 falhas.
- `git diff --check` para arquivos React alterados anteriormente: sem erros.
- Playwright no DDEV: Chromium e dependências instalados no contêiner. A suíte ampliada teve 1/7 aprovado e seis falhas com esperas de interface de 5 segundos; servidor PHP pelo volume Windows/WSL apresentava lentidão de 4 segundos ou mais por requisição. Não considerado aprovação funcional.
- Playwright no Windows com PHP 8.4 + SQLite isolado em PHPRC temporário (sem mudar PHP global): **6/7 aprovados**. Todos os **5 cenários mobile Clean passaram**; o teste de Gestor de Gastos mobile também passou.
- **Falha reproduzida fora do escopo**: teste Web/PC `tests/e2e/desktop-expense-shell.spec.ts` encontra Painel e navegação da ARL no desktop, mas ao entrar em Controle de Gasto aparece uma tela de Gastos cobrindo a barra lateral. Após navegar para Gastos, a ação `Menu principal > Painel` fica inacessível e o teste expira. Evidências em `test-results/desktop-expense-shell-Web--07fce-astos-no-conteúdo-à-direita-desktop-chromium/` (screenshot, vídeo, trace). **Não foi feita mudança no módulo aprovado nem na interface Web/PC**; exigir auditoria isolada antes de considerar a regressão geral verde.
- Capturas finais: `output/mobile-arI-final-20261009/ordens-390.png`, `finance-390.png`, `clients-390.png` e `clean-menu-layouts-390.png` (ordem descrita e data do mês completas na imagem).

## Auditoria e homologação pendentes
- Validações pós-CSS foram executadas e cinco cenários mobile passaram. Falta resolver ou classificar a falha separada do teste de navegação Web/PC em Controle de Gasto, mantendo a instrução de não alterar esse módulo sem autorização. Conferir visualmente em aparelhos reais antes de qualquer publicação.
- Auditoria independente pelo Claude ou Codex, sem alteração de escopo nem deploy automático.

## Ajuste visual adicional encontrado na inspeção de capturas
- A captura da lista de OS mostrava a descrição à esquerda por precedência de `resources/css/arl-mobile-screens.css`.
- Foi adicionado override específico em `resources/css/arl-mobile-final-operations-2026.css` para centralizar número, nome, equipamento e descrição; sem mudar a estrutura da Home das OS ou o desktop.
- O teste de Ordens ganhou verificações de `justify-content` e `text-align` para impedir regressão do alinhamento.

## Acabamento do Financeiro mobile
- A captura anterior cortava o ano no campo nativo de seleção do mês. Foi ajustada a largura do `input[type="month"]` unicamente no Financeiro mobile Clean, com tratamento para telas pequenas. Screenshot atualizado confirma `outubro de 2026` completo, sem mudança no Gestor de Gastos.
