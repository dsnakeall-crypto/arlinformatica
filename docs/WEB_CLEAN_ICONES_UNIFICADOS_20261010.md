# ARL Informática — padronização definitiva dos ícones (10/10/2026)

## Solicitação e referência
Todos os ícones de ação no Web Clean devem seguir **o mesmo padrão da tela Clientes**: sem aro/círculo, sem borda, sem sombra, sem fundos coloridos individuais, pictogramas de 18px e área de clique de 32px. Abrange WhatsApp, Maps, prancheta, olho, lápis, lixeira e seta de reabrir como garantia nos locais Painel/Ordens/Clientes.

## Implementação: reutilização de arquivos, SEM duplicação por página
- Continuam os MESMOS arquivos centrais em `public/arl-assets/icons/`: `icon-whatsapp.png`, `icon-maps.png`, `icon-web-eye-compact-2x.png`, `icon-web-edit-compact-2x.png`, `icon-web-delete-compact-2x.png`.
- Nova regra **centralizada**: `resources/css/web-clean-action-icons-unified-20261010.css`, importada uma só vez em `resources/js/main.tsx` depois do acabamento já aprovado.
- O CSS aplica o mesmo tratamento a listas `.dashboard-order-list .order-actions`, `.orders-order-list .order-actions` e `.clients-react-page .clients-actions`, sem editar as ações React, os links ou as rotas.
- A seta de `order-reopen` usa a representação já existente e é tratada para o mesmo tamanho, sem aro; não cria PNG duplicado.
- Links e botões continuam com foco visual de teclado (`:focus-visible`), que não é aro permanente.
- Escopo exclusivo do Web Clean: Web Original, Mobile e Gestor de Gastos **sem mudanças**.

## Diagnóstico da divergência
CSS legado `arl-ui-system.css` atribuía borda e fundo especificamente a `.order-actions .order-maps`, inclusive com `!important` no desktop. A regra do Web Clean neutralizava olho/lápis/lixeira, mas não neutralizava todos os estilos anteriores de WhatsApp/Maps/garantia. O seletor CSS final tem especificidade suficiente e abrange as três listas.

## Backup pré-rodada
`C:\Users\Allan\ARL-backups\web-clean-icons-unified-20261010-013641`
Cópias dos arquivos originais, status Git, diff prévio e manifesto de hash SHA-256.

## Testes concluídos
- DDEV: `lint`, `typecheck`, `build` e 50/50 testes unitários — aprovados.
- Playwright em Chromium + SQLite temporário: **3/3** testes específicos passaram para Painel, Ordens, Clientes, seta de reabrir e Original.
- Regressão do Web Clean com o acabamento preto/cinza já aprovado: **2/2** testes passaram. Atualizada a expectativa do teste histórico para refletir a decisão posterior do usuário: sidebar em grafite, incluindo estado hover, e assets compactos.
- Regressão anterior `arl-web-final-expense-visual-20261010.spec.ts`: **4/4** passaram; total dos testes desta rodada (3 novos + 2 de botões + 4 pré-existentes): **9/9**.
- Capturas: `output/web-clean-icon-standard-20261010/orders-icons.png`, `dashboard-icons.png`, `clients-icons-reference.png`.
- Medições automáticas de `border=0`, `border-radius=0`, `shadow=none`, fundo transparente, área de ação 32×32 e desenho 18px; teste de hover Maps e integridade dos assets compartilhados.

## Segurança e próxima etapa
Sem Git reset, commit, push, deploy, publicação KingHost ou alteração de banco real. Somente banco SQLite temporário de testes.
Homologação visual pelo proprietário e auditoria independente permanecem pré-condições para publicação.
