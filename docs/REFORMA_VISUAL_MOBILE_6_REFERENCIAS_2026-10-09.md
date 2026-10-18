# Reforma visual mobile — seis referências + centralização de OS (09/10/2026)

## Pedido final
O proprietário forneceu **seis capturas** como referência final do miniapp Controle de Gasto mobile, abrangendo Resumo, a sequência de cartões de responsáveis, Faturas do mês, Pagamentos por instituição, Projeção futura e Instituições/cartões bancários. Quer reproduzir a hierarquia gráfica, fundo azul/rosa, molduras duplas claras, cartões flutuantes, sombras 3D suaves, cantos amplos, ícones e botões da navegação original com máxima fidelidade visual possível, preservando dados e funcionalidades.

A referência de nomes da OS mostra um cliente longo não centralizado e outro curto correto. A solicitação adicional é centralizar **número da OS, data e nome**, inclusive quando quebra linha, sem mover equipamento, relato, status ou ações.

## Aplicação
- `resources/css/expense-reference-mobile-2026.css` (**NOVO**): folha escopada em `html body .layout-mobile.arl-expense-workspace .cg-page.cg-mobile`, importada após a CSS anterior, evitando mudanças nas telas Web/PC.
  - Topo Voltar para ARL / Ajustes, título e mês destacado.
  - Indicador mensal largura inteira, quatro indicadores menores em grade 2x2, valores financeiros e pessoas intocados.
  - Cards de responsáveis em coluna única, divisões com linhas, faixa de saldo em vermelho e botão de acessar gastos.
  - Faturas do mês com moldura leve, ícone por tipo, instituição, vencimento, valor e seta.
  - Subnavegação Quitadas / Pagamentos / Projeção futura / Histórico em duas colunas (somente mobile).
  - Compromissos futuros, seletor Cards/Lista e cartões por mês com Allan, Carol, Casal e Ver mês.
  - Pagamentos por instituição em cartões acolchoados 3D.
  - Instituições em duas colunas (inclusive 320 px com textos quebráveis), imagens de cartões **existentes do cadastro** sem substituir os dados/imagens reais, ações Pagar/Editar/Excluir com diferentes cores.
  - Tipo de dívida em faixa limpa com modal de cadastro existente. Ação Cadastrar instituição mantida visível, mais compacta do que a referência para não eliminar função aprovada.
  - Barra de cinco botões e + rubi em destaque preservados.
  - Redução de movimento respeitada quando configurada no aparelho.
- `resources/js/expense-month-details.tsx`: ícone contextual de cartão de crédito ou comprovante nas faturas; todas as ações originais preservadas.
- `resources/js/expense-control-page.tsx`: import CSS e classe de identificador da seção Instituições (sem mudar estados, APIs, dados, cálculos ou rotas).
- `resources/css/arl-os-final-mobile.css`: regras com especificidade superior às antigas para número, data e nome do cliente centralizados; valor/posição de orçamento conserva canto direito, status e botões intactos.
- `tests/e2e/visual-fiel-imagens.mobile.spec.ts`: provas visuais e de geometria com **banco SQLite descartável**, clientes e faturas fictícios, todas as telas, 320/390 px e OS curta/longa.
- Referências fornecidas pelo usuário diretamente no chat; não são imagens/cartões de produção e seus textos/valores não foram hardcoded.

## Segurança
- Backup de estado **anterior à alteração**, incluindo histórico Git, cópias físicas de **89** arquivos existentes modificados/não rastreados e cópia privada do `.env`: `C:\Users\Allan\ARL-backups\mobile-fiel-imagens-20261009-204810`.
- Nenhum commit, push, deploy, migration, reset, publicação na KingHost ou edição da base real MySQL/MariaDB.
- ARL Web/PC continua com menu principal à esquerda e Controle de Gastos integrado no conteúdo à direita. A home mobile de OS continua intocada.
- Permissões, fluxo, pagamentos, PDF detalhado e backend financeiro não foram alterados nessa rodada.

## Testes e capturas locais
- `npm run build`: OK; `npm run lint`: OK após remover variável não usada do novo teste.
- `npm run test:unit`: 46 testes aprovados.
- Playwright isolado: teste de navegação Web/PC integrado, mobile independente, seis telas e alinhamento de OS curtas e longas (ver log `e2e-build-final.log` no backup).
- Capturas geradas dentro do projeto: `output/mobile-referencia-fiel-20261009/`, com `01-resumo-topo-390.png`, `02-projecao-390.png`, `03-pagamentos-390.png`, `04-instituicoes-390.png`, `05-resumo-320.png`, `06-ordens-centralizadas-390.png`.
- Os dados das capturas são registros fictícios exclusivamente no banco Playwright, não representam os dados reais do usuário.

## Verificações ainda necessárias
- [PENDENTE] Proprietário comparar em iPhone/Android físico com as seis referências, inclusive sombras/opacidade e dispositivos com telas de 320/360/390/430 px.
- [PENDENTE] Auditoria funcional e visual detalhada de todas as rotas no Claude/Codex antes de publicação.
- [PENDENTE] Conferência com dados importados no DDEV sem escrita, verificação dos cartões bancários personalizados e nomes reais de instituições longas.
- [PENDENTE] Suite completa de regressão e auditoria de desempenho; somente cenários focados nesta rodada.
- [PENDENTE] Deploy em KingHost somente após autorização expressa, backup remoto validado, pacote separado de dados e smoke tests.

A reprodução é implementada com HTML/CSS responsivo e conteúdo dinâmico; pode exigir pequenos ajustes de proporção conforme fonte/tamanho do celular e comparação do proprietário. Não afirmar igualdade matemática pixel a pixel sem homologação real.
