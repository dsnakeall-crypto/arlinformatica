# ARL Informática — Quatro layouts e sininho global (15/10/2026)

**Estado:** aplicado no ambiente local de homologação, aguardando aprovação visual do proprietário. Nenhum deploy em produção.

## Referências autorizadas
- Fornecedores — imagem `image(20261015-001519).png`.
- Serviços — `image(20261015-001529).png`.
- Produtos — `image(20261015-001537).png`.
- Gestão de Clientes — `image(20261015-001602).png`.
- Novo sino 3D branco/dourado e vermelho — `image(20261015-002019).png`.

## Regra global para o sino
- Um único componente verdadeiro de notificações usado pelo app todo, no canto superior direito em faixa isolada de 66 px.
- Títulos e botões dos setores posicionados abaixo, sem sobreposição. O sino continua sendo botão interativo: abre notificações e exibe contador dinâmico de pendentes.
- Recurso otimizado e transparente: `public/arl-assets/bell-3d-gold-official-20261015.webp`, 3.924 bytes, SHA256 `557263BAA49E8E6C344FB2547D966DFF3E620B7A68BD3A0327490344A18227B9`.
- Desktop tema Original mantém a mesma posição mesmo em janela reduzida; a imagem 3D também está no componente compartilhado de outros temas.
- Não alterar fonte, texto, contagem, status ou semântica/funcionamento real da central de notificações.

## Alterações da rodada
1. `resources/css/four-sectors-reference-gold-20261015.css`: estilos isolados para Original desktop. Fundo perolado e detalhes dourados, cartões, botões preto/dourados, ícones e tabelas responsivas. Versões mobile/Clean existentes mantidas.
2. `resources/js/main.tsx`: imagem do sino no componente `NotificationBell` e importação da folha CSS; sem replicar notificações por tela.
3. `resources/js/clients-page.tsx`: colunas visuais cliente/documento/telefone/endereço/ações, números de cliente compactos, pesquisa e paginação superior e inferior ligadas ao estado original; guardas para não alterar o seletor rápido de clientes.
4. `resources/js/services-page.tsx`: dois catálogos preservados, apresentação aprimorada. Produtos recebem colunas de status, preço e estoque com valores reais; ações de estoque, movimentações, edição e desativação continuam com handlers originais. Serviços preserva preço livre e garantia adicional.
5. `public/arl-assets/four-gold-header-highres-20261015.webp`, 3.928 bytes: recorte otimizado da imagem de referência para o fundo superior, sem botões fictícios, alinhado nas quatro páginas. Nenhuma API ou chamada backend adicional.

## Segurança
- Backup pré-edição dos 8 arquivos modificáveis de origem, verificado SHA256:
`C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\QUATRO-MENUS-SINO-ANTES-20261014-213302`.
- Não alterados: banco de dados, dados dos clientes, serviços ou produtos, API, PHP, KingHost, autenticação, pagamentos, ou conteúdo de Ordens/Painel anteriormente aprovado.
- Arquivos já modificados ou não rastreados por outros trabalhos no repositório foram preservados.

## Testes
- `npm run build`: PASS.
- `npm run lint`: PASS.
- `npm run test:unit`: PASS.
- `git diff --check`: PASS.
- Playwright autenticado nas 4 páginas em 1672×941, 1366×768, 1000×680, 760×640 e retorno a 1672: zero overflow horizontal da página, sino único, título abaixo do sino, fontes existentes, sem alterações nos dados.
- Clique no sino (abrir e fechar notificações) em cada página: PASS.
- Busca Clientes, abertura/fechamento do cadastro de cliente: PASS.
- Busca Produtos/Serviços, abertura e fechamento do editor de cada catálogo: PASS.
- Abertura do cadastro de fornecedor: PASS.
- Regressão de sino/página em Dashboard, Ordens, detalhe OS e quatro setores: PASS.
- Evidências em `%LOCALAPPDATA%\ARL-Informatica-Dev\four-final-{clients,services,products,suppliers}-{1672,760}.png`.
- Números e registros exibidos são dinâmicos do banco local (podem divergir das artes ilustrativas). A equivalência é uma implementação visual próxima, não uma cópia literal pixel-perfect de um mockup estático.

**Próximo passo:** avaliar visualmente os quatro setores e corrigir pequenas divergências indicadas pelo proprietário. Não iniciar nova rodada nem publicar sem autorização.
