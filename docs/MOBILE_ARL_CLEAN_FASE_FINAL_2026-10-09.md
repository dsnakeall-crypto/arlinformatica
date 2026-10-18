# ARL Informática — Ajustes finais Mobile Clean (09/10/2026)

**Estado:** implementado localmente em `C:\laragon\www\arlinformatica` com DDEV. **Não publicado**, sem commit/push, sem tocar em banco real, dados de clientes ou KingHost. Para auditoria posterior por Claude/Codex; código desta fase apenas da ARL Mobile, **Gestor de Gastos aprovado permaneceu intacto**.

## Escopo aprovado pelo proprietário
- Home “OS abertas” preservada completamente.
- Mobile **somente aparência Clean**, independentemente da preferência Original/Clean salva para o Web/PC. Não persistir "Clean" à força sobrescrevendo a preferência de desktop. No mobile a seção de aparência mostra Clean como fixo, sem seleção Original ou cores; só se alterna tipo de menu.
- No dispositivo de largura até 1024px, forçar layout mobile mesmo se o navegador tinha "desktop" salvo. Em Configurações > Layouts não mostrar Web/PC: escolher entre **barra inferior** e **menu lateral compacto**. Em computador com largura maior continuar possível voltar para Web/PC depois de experimentar o layout mobile.
- Menu compacto fixo e trilho flutuante: ícone selecionado vermelho, sem aro ou contorno roxo/cinza; nova OS + vermelho permanece idêntica à versão anterior.
- Ocultar Pós-Venda/Reputação no mobile (menu fixo, trilho e rota direta); **preservar no Web**.
- OS > lista: centralizar equipamento, não alterar status/relato/ferramentas; Google Maps, visualizar, editar e excluir sem caixas nem contornos; WhatsApp permanece como está. Nome e nº OS previamente centralizados continuam.
- Clientes mobile: somente busca pelo nome, ordenação alfabética implícita, 10 clientes por página e paginação; esconder filtros “Por página”, “Ordenar”, ação “Nova OS para este cliente” e “Excluir cliente”; manter WhatsApp, Maps, visualizar histórico e editar. Visão Web/PC mantém todos os botões/filtros anteriores.
- Serviços, Produtos e Fornecedores não modificados.
- Financeiro mobile: seletor `Mês exibido` com setas anterior/próximo, ícone de calendário e entrada mês/ano; correção de sobreposição com botão Despesa; texto de `Lançamentos identificados` menor e com folga da barra verde. Web/PC mantém seletor de mês existente.

## Arquivos modificados/criados nesta fase
- `resources/js/main.tsx`: mobile forçado em viewport de telefone, listener de mudanças de largura, bloqueio Web/PC móvel, filtros Pós-venda, mobile prop para Clientes e Financeiro, import CSS, sincronização do tema.
- `resources/js/appearance.ts`: aparência efetiva Clean no mobile sem apagar preferência de desktop, atualiza após mudança de layout/breakpoint.
- `resources/js/appearance-settings.tsx`: no mobile Original não aparece, Clean é fixo, controles de cores escondidos; desktop pode alternar aparência normalmente.
- `resources/js/settings-page.tsx`: sinalizador `mobileOnly` na seção de aparência.
- `resources/js/layouts-settings.tsx`: no telefone/tablet mostra somente 2 modalidades de menu; no desktop mostra Web/PC inclusive quando layout mobile selecionado.
- `resources/js/clients-page.tsx`: busca/ordem/10 itens + ações mobile, web mantido.
- `resources/js/finance-page.tsx`: calendário mobile, troca de meses; web mantido.
- **Novo** `resources/css/arl-mobile-final-operations-2026.css`: ajustes visuais mobile com seletor específico e prioridade sobre CSS legado lazy-loaded.
- **Novo** `tests/e2e/mobile-operacao-clean-20261009.spec.ts`: testes com SQLite de teste isolado para layout/menus, 11 clientes fictícios, OS fictícia, Financeiro e proteção da Web.

## Backups e segurança
- Backup **antes de editar**, com bundle histórico Git verificado, cópia física de **92 arquivos já modificados/não rastreados** e `.env` privado fora do projeto em:
`C:\Users\Allan\ARL-backups\mobile-only-clean-20261009-213027`
- Nenhum arquivo anterior propositalmente alterado pelo proprietário foi descartado; não houve reset, clean, migration destrutiva, seed no DDEV real, commit ou publicação.
- Testes E2E usam seus próprios dados fictícios em SQLite isolado, não a base importada MariaDB do DDEV.

## Verificações concluídas
- [OK] DDEV `npm run build`: TypeScript e Vite aprovados.
- [OK] DDEV `npm run lint`: zero erros/avisos.
- [OK] DDEV `npm run test:unit`: **46 testes** aprovados.
- [OK] Playwright focado `tests/e2e/mobile-operacao-clean-20261009.spec.ts` + `tests/e2e/desktop-expense-shell.spec.ts`: **7 cenários** aprovados em uma execução, `full-regression-final.log`.
  - Web/PC Gestor de Gastos integrado e mobile Gastos independente.
  - Mobile Clean fixo, ícone ativo vermelho sem aro, sem Web/PC e Pós-Venda.
  - Clientes 11 registros, busca por nome, 10 + 1 páginas e 4 ações sem moldura.
  - OS com Notebook centralizado e 4 atalhos sem moldura.
  - Financeiro mês anterior/próximo sem sobreposição.
  - PC mantém aparência Original, Pós-venda e controles tradicionais de Clientes.
- [OK] Compilação final e lint após correções de CSS e layout.

## Pendências para homologação e auditoria
- [PENDENTE] Proprietário visualizar em dispositivo físico, ambos layouts mobile (barra inferior e lateral fixo), inclusive foco/acessibilidade/toque.
- [PENDENTE] Auditoria Claude/Codex e suíte Playwright integral (executados só 7 focados nesta fase).
- [PENDENTE] Conferir telas móveis com clientes e OS reais **somente leitura**, impressão e fluxo completo OS/Financeiro em DDEV.
- [PENDENTE] Aprovação do proprietário e testes pós-deploy, **somente após autorização explícita** para atualizar o site oficial e backup da produção.

## Regra para IA revisora
Auditar falhas **sem redesenhar a Home OS, sem alterar o Gestor de Gastos, sem reabrir Web/PC no mobile e sem tocar na base oficial**. Solicitar permissão expressa antes de publicar.
