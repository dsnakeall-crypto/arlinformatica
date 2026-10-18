# ARL Informática — Web adaptativo sem trocar preferência (10/10/2026)

Ajuste estritamente voltado a **preservar o layout escolhido** e manter a
responsividade do Web, independente da resolução/área útil do navegador.

## Regras preservadas
- **Configurações** é o único local de escolha de layout. Nenhum novo seletor no cabeçalho.
- Web/PC oferece **Original e Clean** dentro de Configurações; mobile usa apenas Clean.
- Alteração de tamanho, movimento entre monitores, minimizar/restaurar e zoom de janela
  **não devem gravar a troca de layout**. Preferência armazenada como antes.
- O layout Web/PC continua Web/PC em qualquer tamanho de janela; sua estrutura é
  reorganizada visualmente usando CSS responsivo. O modo Mobile não é ativado.
- Seção Controle de Gastos e funcionamento dos botões permanecem intactos.

## Correção realizada
- Novo `resources/css/desktop-responsive-preference-20261010.css`, importado ao final
  de `resources/js/main.tsx`. Não altera visual quando a janela é larga.
- Removida apenas a largura mínima rígida que impedia o conteúdo Web de encolher.
- Até 800px, sidebar Web usa temporariamente trilho de ícones 58px, sem alterar
  a opção fixar/desfixar persistida. Em largura maior, volta automaticamente
  à largura correspondente à escolha anterior.
- Tabelas maiores podem rolar na sua própria região. Fora isso a página se ajusta.
- Nada mudou no Web Original em resoluções largas, no Mobile ou no banco.

## Validação
- DDEV: lint, TypeScript, build Vite, 50/50 testes unitários — todos aprovados.
- Playwright Chromium usando SQLite isolado de testes: 4/4 cenários novos aprovados.
  2 cenários com menu desfixado testam Web Original/Clean nas larguras
  1920, 1440, 1366, 1024, 900, 800, 790, 640 e 480px.
  2 cenários com menu fixado testam 1440, 1024, 800, 640, 480 e de volta a 1440px.
  Todos confirmaram persistência de `layout-desktop`, ausência de rolagem
  horizontal geral e painel lateral acessível.
- Screenshots em `output/web-clean-reference-20261010/web-clean-640-responsive.png`
  e `web-original-640-responsive.png`.
- Conferência física de dois monitores ainda é etapa de homologação do usuário.

## Segurança
Backup anterior: `C:\Users\Allan\ARL-backups\desktop-responsive-preserve-20261010`.
Sem reset do Git, commits, publicação, KingHost ou mudanças no banco real.
