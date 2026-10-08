# Carregamento dos módulos sob demanda

## Escopo

As áreas Painel, Ordens, Nova OS, detalhe da OS, Clientes, Serviços/Produtos,
Fornecedores, Financeiro, Controle de Gasto, Pós-Venda e Configurações passam a
usar imports dinâmicos com React.lazy e Suspense. Importação de clientes, editor
de termos, painel de zeramento e câmera também são carregados quando usados.
O lançamento rápido só começa a carregar ao abrir; depois disso permanece
montado para preservar o comportamento de seus formulários.

O leitor de fotos e o OCR já possuíam carregamento sob demanda e continuam com
esse comportamento. Esta alteração não muda as regras de cache de dados,
permissões, cálculos, pagamentos, mensagens ou navegação. Não modifica backend,
banco, migrations, arquivos privados ou dependências de produção.

`app-shared.tsx` concentra os tipos, formatadores e acesso à API que eram
compartilhados pelas funções de `main.tsx`. Os componentes extraídos conservam
seus corpos funcionais; Nova OS recebeu apenas a anotação explícita do tipo
File em um callback. Os componentes de navegação, identidade, segurança de
sessão e inicializadores legados permanecem imediatos. As bibliotecas comuns
continuam compartilhadas pelo build, sem uma cópia por tela.

## Estados de carregamento

Enquanto o módulo é baixado, após 300 ms aparece “Preparando suas informações…”
com blocos claros em relevo e brilho animado. Carregamentos rápidos não exibem
a animação; a tela abre assim que o código chega, sem tempo mínimo artificial.
A preferência de reduzir movimento desativa as animações. O menu permanece
utilizável. Sair da área antes da conclusão não permite que o módulo atrasado
troque a seleção atual. O código importado é reutilizado nas próximas visitas.

Uma falha de carregamento/renderização apresenta um aviso e uma tentativa
manual de carregar novamente, sem recarregar automaticamente o aplicativo.
O menu continua disponível. Navegadores podem manter falhas de importação em
memória; nesses casos, uma recarga manual após restabelecer a conexão pode ser
necessária. Não se promete funcionamento offline de módulos ainda não baixados.

## Build e publicação

No build comparado com a main `902a47a`, o JavaScript principal passou de
430.152 bytes para 41.384 bytes (redução de 90,4% nesse arquivo). Isso mede apenas o arquivo principal,
não a transferência total da página nem a latência das consultas ao servidor.
React, ícones, inicializadores e o módulo da tela inicial continuam necessários.
Os módulos de Financeiro, Fornecedores e Controle de Gasto não fazem parte da
cadeia estática inicial de `main.tsx`, conforme o manifest e o teste de rede.

A publicação precisa enviar **todo o novo public/build**, incluindo manifest,
JavaScript e CSS associados. Não enviar somente main.js. Trocar a versão de
forma reversível e preservar os arquivos de build anteriores para abas abertas
na versão antiga. Não requer Node permanente no servidor.

## Verificação

- Backup externo verificado de arquivos, alterações locais e histórico Git:
  `C:/Users/Allan/ARL-backups/lazy-loading-20261007`. O backup incremental referencia
  o arquivo completo anterior e contém os arquivos alterados desde ele.
- TypeScript, ESLint, build de produção e 38 testes frontend aprovados.
- Três testes específicos de navegador aprovados: download sob demanda e
  reutilização; navegação durante download lento; falha de rede sem bloquear menu.
- Regressão completa de 167 cenários executada em cópia externa com banco e
  armazenamento privados descartáveis: 166 passaram na primeira execução.
  O teste restante precisava aguardar a montagem do formulário da Nova OS antes
  de medir os campos. Após essa correção, detectou-se que a folha de estilos de
  serviços, carregada posteriormente, reduzia a pesquisa de serviços para 14px
  no mobile. Uma regra restrita ao componente em modo mobile preserva os 16px
  necessários. O reteste final de 21 cenários relacionados passou sem retries,
  incluindo o cenário que falhou, navegação, mensagens, catálogo e formulários.
- Em 08/10, lint, TypeScript, 38 testes frontend e build foram repetidos após a
  correção. Os builds da raiz e da cópia com configuração limpa são idênticos,
  com 81 arquivos. Arquivos preexistentes protegidos conferidos por hash.
- Logs, builds e capturas ficam no diretório externo de backup; não entram no Git.

Nenhuma publicação em produção faz parte desta execução.
