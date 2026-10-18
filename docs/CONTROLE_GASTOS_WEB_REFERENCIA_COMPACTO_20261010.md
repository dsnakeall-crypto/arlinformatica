# Controle de Gastos Web — referência visual e cards compactos (10/10/2026)

## Pedido
Aplicar a linguagem visual do print aprovado de Controle de Gastos ao **Web/PC inteiro deste módulo**, mantendo os menus funcionais e a estrutura de computador. Priorizar **Gastos e Instituições com quatro cartões pequenos por fileira**. Em telas estreitas, adaptar sem alternar o layout escolhido. Pagamentos, Quitadas, Histórico e demais menus devem manter as funções e receber somente harmonização visual.

## Implementação isolada e preservações
- `resources/css/expense-web-reference-compact-20261010.css` (novo): acabamento de azuis/brancos, degradês, bordas e sombras semelhantes à referência. Limita `.cg-bank-grid` a 1100 px de largura útil e utiliza 4 colunas; a grade adapta 3/2/1 pela largura interna.
- Cada cartão de Gastos e Instituições: arte gráfica limitada a 128 × 80 px, título e vencimento mais compactos, ações preservadas; grades separadas apenas em classes existentes `.cg-bank-grid`. Não reinstituiu tabelas que o usuário descartou.
- Resumo: remove moldura interna duplicada dos indicadores, aproxima banner e cards do print, preserva PDF e abertura de detalhes.
- Menus do módulo: destaque azul da aba ativa, controles e bordas azulados. Ajustes de outras páginas são **somente de acabamento**, sem modificar cálculos ou grids de pagamentos, quitadas ou histórico.
- `resources/js/expense-control-page.tsx`: acrescenta um import CSS e classifica o botão existente **Nova dívida** como `primary` no cabeçalho Web, garantindo a cor azul com as regras Clean já presentes. Não muda evento de clique, permissão ou API.
- `tests/e2e/expense-web-reference-compact-20261010.spec.ts` (novo): cenários de 8 instituições em banco SQLite temporário com quatro cartões por linha, ações disponíveis, responsividade, oito menus e mobile preservado.

## Segurança
Backup anterior à alteração:
`C:\Users\Allan\ARL-backups\expense-web-reference-compact-20261010-010205`

Contém cópias dos arquivos-base, alterações já existentes em patch, status e lista de arquivos não rastreados, manifest SHA-256 e histórico Git em bundle verificado. **Não houve reset de Git, commit, push, publicação, migração, escrita no banco real ou alteração no servidor KingHost.** Todos os dados criados para verificar a grade foram em banco de testes SQLite isolado.

## Validações
- DDEV: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit` aprovados; 50/50 testes unitários.
- Chromium/Playwright: 4 cenários aprovados para grades, menus, janelas estreitas e isolamento do mobile após os refinamentos do Resumo; após o ajuste final de classificação de Nova dívida, o teste específico de todos os menus/ação azul foi repetido e aprovado (1/1).
- O navegador confirmou 8 cartões em duas fileiras de quatro (largura limitada), com ações de visualização, edição e exclusão acessíveis.
- Capturas do Web em `output/expense-web-reference-compact-20261010/`: `gastos-1600.png`, `instituicoes-1600.png`, `resumo-menu.png`, e capturas dos outros cinco menus.
- Os cartões Web não dependem da largura física do monitor: grade de 4 onde cabe; 3, 2 ou 1 em área menor. O modo mobile e seus arquivos não foram editados.

## Próxima etapa
Homologação humana no DDEV usando dados locais (incluindo nomes extensos e muitos tipos de dívida), depois auditoria independente. Publicação somente com autorização expressa e backup verificado dos dados oficiais.
