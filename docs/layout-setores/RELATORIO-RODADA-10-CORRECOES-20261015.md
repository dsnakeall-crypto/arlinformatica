# ARL Informática — Rodada de 10 correções — 15/10/2026

Status: implementada em ambiente local; aguarda aprovação visual. Nada publicado em produção. Nenhum dado alterado durante testes.

## Backup antes das alterações
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PACOTE-CORRECOES-10-ANTES-20261015-001632
23 arquivos conferidos por SHA-256; também foi salvo o diff prévio do Git.

## Alterações
1. Pop-ups do Controle de Gasto WEB: tema claro/perolado com bordas douradas, botões pretos/dourados, rodapés, listas e ícones padronizados; portais mantidos nativos do aplicativo.
2. Modal Novo/Editar Cliente com fundo perolado, ícone dourado, entradas e botões padronizados.
3. Pesquisa Serviços: eliminado efeito branco e brilho sobreposto, foco de borda dourada.
4. Cifrão apenas na versão Controle de Gasto WEB: 3D preto e amarelo-dourado, mesma funcionalidade.
5. Pesquisa Produtos: mesma correção do item 3.
6. Configurações: abas, cards, inputs e botões no novo layout.
7. Configurações Empresa: removido somente Visualizar prévia; Salvar configurações preservado.
8. Painel e Ordens: removida somente arte borrada do topo, sem tocar nas tabelas, colunas ou ícones.
9. Dentro da OS: lista de resultados Produto/Serviço em tons claros e dourados, sem rosa.
10. Gerar orçamento: espaço entre títulos com ícones e os campos abaixo. Não alteradas funções do formulário.

## Arquivos alterados nesta rodada
resources/js/settings-page.tsx — retirada exclusivamente do botão Visualizar prévia.
resources/js/main.tsx — import da folha de estilos isolada.
resources/css/arl-correcao-global-popups-settings-20261015.css — regras visuais por setor.

## Testes
Build PASS; Lint PASS; 61 testes unitários PASS; git diff --check PASS.
Playwright autenticado: Painel/Ordens topo sem arte; Novo Cliente, Serviços/Produtos busca, Configurações sem botão Visualizar prévia, cifrão preto/dourado, modal Tipos de dívida e Pagamento rápido; busca na OS com 12 resultados quando dados carregaram, fundo claro sem rosa.
Sem overflow em largura 760px nas telas Configurações, Clientes, Serviços e Produtos.
Arquivos CSS mobile do Controle de Gasto idênticos ao backup, SHA-256.
Orçamento: ajuste de CSS aplicado, mas a abertura do modal não pôde ser conferida automaticamente nas OS de teste, pois os botões estavam ocultos. Validar visualmente manualmente numa OS elegível. Nenhum orçamento foi salvo nos testes.

## Reversão
Remover o import da nova folha em main.tsx para desfazer ajustes CSS; restaurar settings-page.tsx do backup para recuperar botão de prévia, se necessário.
Ambiente: http://arlinformatica.test/