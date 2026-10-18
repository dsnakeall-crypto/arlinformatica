# ARL — acabamento Web Clean e Controle de Gastos com visual mobile
10/10/2026 — implementação local, não publicada.

## Regras recebidas
- Controle de Gastos no Web/PC deve ter a MESMA identidade visual já aprovada no Mobile, sem virar interface mobile: reaproveitar cartões, degradês, cores, controles e sombras. Preservar navegação e layout responsivo de computador.
- Ícones Web Clean em Painel, Ordens e Clientes: mesmo desenho 3D (olho, lápis e lixeira), mas arquivos menores 2x, sem borda, sem círculo e sem sombra. WhatsApp e Maps como referência e preservados; prancheta sem aro.
- Status Web Clean preenchidos em laranja (Aguardando Peça), verde (Em Serviço e Pago), azul (Em Análise).
- Lista de OS Web Clean: número vermelho, data/hora verde, nome do cliente preto, relato azul-escuro SEM negrito.
- Sidebar Web Clean: botão ativo em grafite mais claro. Botões pretos internos não alterados.
- Web Original e Mobile Clean de outras áreas preservados. Não mexer em dados reais nem publicar.

## Alterações
1. `resources/js/expense-control-page.tsx`: reutiliza `ExpenseMobileSummary` tanto para o resumo Web quanto mobile, preservando o cabeçalho/abas de Web no computador e o miniapp no mobile. Não alterou funções, modelos ou rotas financeiras.
2. `resources/css/expense-web-mobile-visual-20261010.css`: espelhamento de 252 regras APROVADAS do mobile e ajustes de grade para Web, escopados ao módulo de Gastos no desktop. A tela Mobile mantém o CSS e componentes anteriores.
3. `scripts/apply-expense-web-mirror.mjs`: script de sincronização documentado das regras visuais mobile para Web; não rodar sem revisar diffs.
4. `resources/css/web-clean-final-polish-20261010.css`: cores/status, sidebar e ícones isolados ao Web Clean.
5. `resources/js/main.tsx`: importação da folha anterior, depois dos estilos existentes.
6. `public/arl-assets/icons/icon-web-eye-compact-2x.png`, `icon-web-edit-compact-2x.png` e `icon-web-delete-compact-2x.png`: cópias redesenhadas em menor tamanho por reamostragem bicúbica de alta qualidade dos assets originais para 36x36px, exibidos a 18px para preservar nitidez em telas 2x.
7. `scripts/resize-expense-web-icons.ps1` para reproduzir a reamostragem.
8. `tests/e2e/arl-web-final-expense-visual-20261010.spec.ts`: regressão do Controle de Gastos, Web Original, Mobile e cores/ícones.

## Evidências iniciais
- Capturas em `output/final-arl-web-20261010/`: `expense-web-mirror.png`, `expense-mobile-preserved.png`, `orders-final.png`, `clients-final.png` (capturas automáticas com dados descartáveis).
- DDEV: lint, typecheck, build Vite e 50 testes unitários aprovados.
- Playwright Chromium executado contra PHP local e SQLite descartável, SEM dados reais. A primeira rodada passou 3/4; identificou precedência do CSS carregado sob demanda em Clientes, corrigida em seguida. Repetição ampliada documentada abaixo.
- O Web de Gastos mantém `main[data-arl-expense-control-react="1"]` e sidebar ARL. Navegação de volta ao Painel é verificada.
- Visual do Mobile preservado na captura comparativa.

## Backup e restrições
Backup pré-alteração em `C:\Users\Allan\ARL-backups\expense-web-visual-final-20261010-004011`.
Status e patch das alterações já existentes preservados.
**Nenhum reset, commit, push, deploy, alteração no banco de dados oficial nem publicação KingHost.**
Aprovação visual com os dados reais e publicação são etapas posteriores e dependem de autorização expressa.

## Resultado da validação final
- [OK] DDEV: lint, TypeScript, build de produção e 50/50 testes unitários (rodada pós-ajustes).
- [OK] Playwright: 13 cenários aprovados na rodada ampliada Web Clean + Gastos + Mobile. O único teste restante usava simulação obsoleta de celular (Chrome desktop reduzido), incompatível com a preferência de layout persistida exigida pelo usuário. Foi ajustado para simular corretamente um Android real e passou isoladamente: **todos os 14 cenários foram cobertos e aprovados** em duas execuções.
- [OK] CSS sob demanda de Clientes corrigido. Captura `clients-final.png` atualizada confirma WhatsApp, Maps, prancheta, olho, lápis e lixeira pequenos e sem aro.
- [OK] Screenshots comparativos `expense-mobile-preserved.png` e `expense-web-mirror.png` confirmam cartões no mesmo estilo e interface Web organizada para computador.
- [OK] Navegação Web Controle de Gastos -> Painel testada; estrutura ARL/sidebar preservada.
- [OK] `git diff --check` sem erros.
- [PENDENTE] Somente homologação humana usando ambiente local com dados de desenvolvimento. Produção/KingHost ainda não autorizada.
