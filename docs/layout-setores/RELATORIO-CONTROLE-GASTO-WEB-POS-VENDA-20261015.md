# ARL Informática — Controle de Gasto WEB + Pós-Venda em lista (15/10/2026)

## Status
Alterações executadas no **ambiente local de homologação**, aguardando conferência visual. **Nada publicado na KingHost**. Nenhuma operação real de pagamento/cadastro/exclusão foi executada durante os testes.

## Backup obrigatório (antes de mexer)
Pasta: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\CONTROLE-GASTO-WEB-POS-VENDA-ANTES-20261014-233859`.
Foram preservados e comparados por SHA-256 12 arquivos, incluindo componentes e CSS do mobile.

## Controle de Gasto WEB
- Nova folha de estilo isolada `resources/css/expense-web-gold-20261015.css`, importada ao fim do `expense-control-page.tsx`.
- Apenas `.shell.layout-desktop .cg-page.cg-expense-web-mirror`. **Não aplicar em `.layout-mobile` ou `.cg-mobile`.**
- Padrão perolado / branco / dourado e botões pretos-dourados nas 8 abas (Resumo, Gastos, Instituições, Pagamentos, Projeção, Quitadas, Ajustes e Histórico).
- Resumo: destaque do mês, três indicadores, duas áreas de responsáveis, cartões de faturas. Dados reais existentes, não ilustrativos.
- Cartões de instituições: **até 7 colunas no desktop largo (1672 px)** e colunas adaptáveis em larguras menores, sem deixar 'Fixos de Casa' sozinho quando todos os seis cabem na mesma linha.
- Instituições: cards menores, mantendo imagens dos bancos, botões de editar, consultar e desativar, categorias e classificações.
- Tabelas, projeções, pagamentos e formulários com acabamento consistente. Botões verdes de pagamento não são alterados.
- Pop-ups continuam internos do sistema; APIs, backend e validações preservados.

## Pós-Venda
- `resources/js/post-sale-page.tsx` convertido de cards grandes para linhas de lista, com colunas #, OS, CLIENTE, STATUS, AÇÕES; busca, status em cápsulas, estrela, Instagram e seta de detalhes.
- `resources/css/post-sale-web-list-gold-20261015.css` só para Pós-Venda, com topo sem imagem decorativa e sem sino.
- 'Selecionar listas': novo 'Selecionar todos' / 'Desmarcar todos' sobre **registros visíveis na busca**, seleção individual preservada, botão 'Excluir selecionados' somente se houver seleção, com diálogo de confirmação próprio. Nenhuma exclusão direta sem confirmação.
- Preservados enlaces WhatsApp e regra de confirmar envio apenas depois de enviar a mensagem. A seta expande informações sem abrir outra página.
- A funcionalidade pós-venda já era restrita ao desktop no aplicativo.

## Testes executados
- `npm run build`: PASS.
- `npm run lint`: PASS.
- `npm run test:unit`: PASS (61/61).
- `git diff --check`: PASS.
- Playwright autenticado: todas as 8 abas WEB navegáveis, seis instituições juntas em sete slots na largura 1672px; sem overflow da página em 1672, 1366, 1100, 900 e 760 pixels.
- Pós-Venda: 10 registros exibidos em lista, sem sino, busca filtrando, expansão de linha, selecionar 10/10, desmarcar 0/10, janela reduzida sem overflow externo.
- Pós-Venda: abrir confirmação de exclusão em lote de 10 registros e **Cancelar** (10 continuam visíveis; nada foi excluído): PASS.
- Mobile: 4 arquivos mobile comparados ao backup e iguais SHA-256; teste em largura 430 com `layout-mobile` e `.cg-mobile` (SEM `.cg-expense-web-mirror`) PASS.
- Capturas na pasta `%LOCALAPPDATA%\ARL-Informatica-Dev\`: `expense-gold-{summary,debts,institutions,advances,projection,settled,settings,activity}.png`, `post-sale-gold-list.png` e `expense-mobile-preserved.png`.

## Observações
- Não são cópias raster pixel-a-pixel das artes, e sim estilos React/CSS ligados aos dados reais e responsivos.
- Algumas cores específicas em ferramentas auxiliares podem continuar vinculadas a estados semânticos existentes; pode haver refinamento após aprovação do usuário.
- Não foi alterado o banco de dados, nem foi publicado em servidor oficial.
- Não mexer nos layouts aprovados de Painel, Ordens, Financeiro, Nova OS ou demais menus.
