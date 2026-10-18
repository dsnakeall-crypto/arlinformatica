# ARL Informática — Menu lateral contínuo e Painel dourado (14/10/2026)

**Status:** implementado no aplicativo local, build/lint/E2E aprovados, aguardando avaliação visual do proprietário.

## Escopo autorizado
- Reutilizar um **único fundo preto/dourado contínuo** na lateral inteira. Remover a fotografia de 2.396 bytes esticada somente no topo.
- Alterar **somente o conteúdo do Painel** com base na imagem enviada `image(20261014-215637).png`. Manter a funcionalidade real das telas. Menu lateral global usa a nova imagem em todos os setores do **tema Original desktop**; interior de Ordens e dos demais setores permanece preservado.
- Preservar fontes originais, ícones da coluna Ações, dados reais, permissões, mobile e Clean.

## Implementação
- Folha `resources/css/sidebar-gold-continuous-20261014.css`, aplicada só ao Original desktop com lateral expandida. Fundo único `public/arl-assets/arl-gold-sidebar-continuous-20261014.avif`, imagem de 380×1034, **8.323 bytes**, recuperada e verificada com SHA-256 do backup histórico (F662433EE41EB0C8814F65E6FF33EB00E747CE6C523F38F95725ED47DA9C548F). Não há botões embutidos nessa arte; controles React originais ficam por cima.
- Regra de pseudo-elemento do antigo fundo cortado retirada de `resources/css/orders-reference-gold-20261014.css`. Arquivo antigo `public/arl-assets/orders-gold-sidebar-photo-20261014.webp` removido após checagem de referências e do backup.
- Folha `resources/css/dashboard-reference-gold-20261014.css`, isolada em `main[data-arl-dashboard-react="1"]`, com fundo areia, cabeçalho dourado, quatro cards, cabeçalhos das duas tabelas, cartões com borda dourada, status e linhas compactadas, botão Ver finalizadas e ações coloridas. Ajuste de espaçamento do sino para não encobrir os botões superiores. Ícones de ações foram preservados e redimensionados sem cortes. Não alterou JSX, consultas SQL nem componentes funcionais da tabela.
- Imports adicionados em `resources/js/main.tsx`, após o CSS da página Ordens.

## Segurança, dados e testes
- Backup prévio íntegro (SHA-256 de 7 arquivos verificado):
  `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\LAYOUT-PAINEL-SIDEBAR-ANTES-20261014-193823`.
- Não foi publicada atualização na KingHost ou alterado banco oficial, banco local, API, permissões nem cadastros.
- `npm run build`: PASS; `npm run lint`: PASS; `git diff --check`: PASS.
- Navegador Chromium autenticado (homologação) em 1672×941, 1366×768, 1280×720, 960×600 e retorno a 1672×941: menu lateral sem rolagem e rodapé visível; sem overflow horizontal do documento; quatro cards e dois blocos presentes; ações não são cortadas de 1280 px para cima; em 960 px a tabela usa rolagem horizontal interna.
- Navegação Painel → Ordens → Painel: PASS. Estilo Clean preservado: PASS.
- Captura final do navegador: `%LOCALAPPDATA%\ARL-Informatica-Dev\painel-gold-final-20261014.png`.
- Os contadores e registros do Painel são reais do banco de teste: os números do mockup não foram copiados.
- Essa versão se aproxima muito da referência, mas não é garantidamente idêntica pixel a pixel (tipografia e quantidades de OS permanecem as atuais).

**Próxima etapa:** usuário confere visualmente a tela e informa ajustes pontuais, sem iniciar outro setor.
