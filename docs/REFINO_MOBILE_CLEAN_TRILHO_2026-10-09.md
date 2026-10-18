# Reforma de acabamento Mobile Clean, trilho e Controle de Gastos — 09/10/2026

**Estado:** aplicada diretamente em `C:\laragon\www\arlinformatica`, somente local/DDEV. Não houve commit, push, alteração em banco, migrations, .env ou KingHost.

## Pedido do proprietário

1. Barra inferior ARL: manter os cinco botões redondos 3D aprovados.
2. Ao tocar nos três traços do modo **barra inferior**, nunca abrir a sidebar desktop. Abrir um **trilho flutuante branco estreito**, igual à referência enviada em imagem, com ícones redondos.
3. Clique fora do trilho: aguardar **2 segundos**, recolher suavemente por transição de aproximadamente **0,42 s**. Ao tocar novamente no trilho, cancelar o fechamento pendente. X fecha imediatamente com animação.
4. Modo **lateral compacto fixo**: manter navegação própria, mas com os mesmos discos, sombras e hierarquia visual dos ícones do trilho e barra inferior.
5. Controle de Gastos deve usar **somente estética Clean**, sem opção Original dentro do próprio módulo. O Original continua disponível na configuração do aplicativo ARL (Web/PC). Sem misturar tema antigo ao voltar de telas.
6. Repaginar contornos de cards, inputs e botões internos mobile: cantos mais arredondados, borda sutil, fundos brancos levemente translúcidos e sombras de profundidade macia. Home mobile das OS intocada.

## Alterações

- `resources/js/main.tsx`: novo painel `#arl-mobile-clean-rail` com links alimentados pelos **mesmos grupos, permissões e rotas** já existentes (incluindo contadores); menu desktop/aside escondido APENAS no modo barra inferior; overlay `#arl-mobile-rail-overlay`; timer cancelável de 2 segundos; close X imediato; clicar num destino fecha o menu; arquivo CSS importado.
- `resources/css/arl-mobile-clean-premium.css`: CSS **escopado** para trilho, lateral compacto e telas internas mobile (exclui explicitamente a home de OS). Acabamento suave, responsivo, sem alterações no desktop geral; regras específicas para Clean impedem retângulos brancos atrás dos discos.
- `resources/js/expense-control-page.tsx`: retirado somente o seletor global `AppearanceSettings` da aba Ajustes do **Controle de Gastos**, preservando o restante da configuração e o seletor do ARL. Acrescentada classe `cg-clean-only` ao miniapp.
- `resources/css/arl-mobile-clean-premium.css`: cores, bordas, círculos, cartões e barra inferior Clean no Controle de Gastos independentemente de `data-arl-appearance`, sem alterar a preferência Web/PC global.
- `tests/e2e/clean-rail-cards.mobile.spec.ts`: testes de trilho e fechamento/cancelamento, estilo fixo e visual dos discos, Gastos sem Original, cards arredondados, estados ARL Original/Clean.
- `tests/e2e/ajustes-chatgpt.mobile.spec.ts`: teste antigo de sidebar larga atualizado para trilho estreito e fechamento com espera.

## Cópia de segurança

Backup **pré-alterações** em `C:\Users\Allan\ARL-backups\clean-rail-cards-20261009-185859`:
- `history.bundle` com histórico Git completo; `git bundle verify` indicou bundle válido;
- 71 arquivos alterados/não rastreados copiados fisicamente, conservando subpastas;
- `status-before.txt`; cópia privada de `.env` em `env-private.txt` (nunca publicar).

## Validação técnica

- TypeScript + Vite build no DDEV: **OK**.
- ESLint no DDEV: **OK**.
- 41 testes de frontend: **OK**.
- Playwright com banco SQLite descartável e servidor local isolado: **8 testes relacionados à barra 3D, trilho, submenus, Clientes e visual de Gastos passaram em sequência** (`rail-focused-regression.log`).
- Teste extra do modo Clean global (corrigiu quadradinhos brancos que sobrepunham os discos): **1 aprovado** (`final-clean-fixed.log`).
- Capturas de referência: `output/clean-rail-20261009/rail-390px.png`, `lateral-compacto-390px.png`, `gastos-clean-390px.png`, além de `output/menu-inferior-3d-20261009/`.

## Pendências para auditoria posterior pelo Claude

- [PENDENTE] Homologação do proprietário em iPhone/Android real, inclusive altura do trilho em telas curtas e acessibilidade por toque.
- [PENDENTE] Conferência visual das demais telas mobile reais em ambas as aparências, especialmente janelas, fornecedores e cadastros longos.
- [PENDENTE] Revisar/atualizar testes E2E legados que ainda esperam `aside.open` no modo barra inferior, como `tests/e2e/arl-mobile-reform.mobile.spec.ts`, e seletores de layouts movidos antes desta reforma.
- [PENDENTE] Suíte completa de Playwright/PHP; nesta rodada foram rodadas apenas verificações focadas por se tratar de acabamento de interface.
- [PENDENTE] Homologação de desempenho real DDEV (lentidão /mnt/c reportada anteriormente), fora do escopo de visual.

**Não alterar dados, produção ou regra financeira sem novo consentimento.** O relatório registra arquivos/decisões para que uma auditoria posterior identifique falhas sem desfazer o layout aprovado.
