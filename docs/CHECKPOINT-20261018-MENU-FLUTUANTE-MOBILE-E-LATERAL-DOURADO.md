# ARL Informática — Menu inferior flutuante MOBILE — 18/10/2026

## Alteração aprovada para implementação
Cliente aprovou a direção visual do mockup: remover a barra grossa atrás dos botões de navegação inferior, aproximar e diminuir os ícones, deixá-los com aparência flutuante, coloridos, colados e fixos na parte inferior. Manter todas as cinco funções conforme permissões do usuário e o botão central vermelho de Abrir OS. Preservar o layout, a navegação e os eventos do mobile.

Também perguntou se o menu lateral do mobile tinha recebido cores do web: **a camada anterior já tinha aplicado o fundo off-white/dourado, mas ainda restavam ícones ativos vermelhos/sem fundo devido a uma regra com seletor ID; nesta etapa os ícones, separadores e destaque passaram de fato ao acabamento WEB ouro/bronze.**

## Alteração realizada SOMENTE NO PROJETO LOCAL
- NOVO arquivo CSS: `resources/css/arl-mobile-floating-bottom-nav-20261018.css`, dimensões de discos ~34–39px e botão central ~49–54px, barra sem revestimento, botões flutuantes ancorados no rodapé com suporte a safe-area, tap targets mínimos de 44px.
- `resources/js/main.tsx`: somente UMA importação de CSS após `arl-mobile-web-gold-visual-20261017.css`, verificada por SHA. **NENHUM handler, botão, evento, estado, API ou esquema de permissões modificado**.
- Identidade cores distintas: Painel dourado, Clientes azul acinzentado, Abrir OS vermelho, Financeiro bronze e Gestor de Gasto verde discreto.
- Controle de Gastos: mesmo dock transparente, cinco alvos iguais, respeitando função e seleção, com botão Adicionar vermelho.
- Menu lateral original: fundo dourado já existente mantido; discos 3D bege/dourado/bronze, estado selecionado com ouro forte; o modo Clean não recebe esse acabamento geral.
- Não alterar desktop, dados reais, projetos online, KingHost, banco oficial, permissões ou pagamentos.

## Dois níveis de restauração
1. Backup anterior (web ouro no mobile) permanece em `Backups/PONTO-RESTAURACAO-ANTES-IDENTIDADE-WEB-NO-MOBILE-20261017`.
2. NOVO backup ANTES dos botões flutuantes em `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PONTO-ANTES-MENU-FLUTUANTE-MOBILE-20261018`.
   - `SNAPSHOT-BASE-DO-MOBILE-ANTES-BOTOES-FLUTUANTES.zip`: oito arquivos-fonte existentes preservados, SHA-256 conferido; traz o estilo web ouro que já estava aplicado.
   - `REVERTER-SOMENTE-MENU-FLUTUANTE-MOBILE.ps1`: remove APENAS nova importação, arquiva CSS novo; mantém estilos web ouro e todas as outras mudanças do aplicativo.
   - `RESULTADO-FINAL-NAV-FLUTUANTE.json`, testes e capturas.
   - Para desfazer via PowerShell: `& "C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PONTO-ANTES-MENU-FLUTUANTE-MOBILE-20261018\REVERTER-SOMENTE-MENU-FLUTUANTE-MOBILE.ps1"`; depois recompilar assets locais para refletir a restauração.

## QA e escopo dos testes
- **Chrome mobile 320, 360, 390, 430 px**: barra fixa no rodapé e transparente, altura reduzida de ~73px para ~62–65px, círculos menores, sem rolagem horizontal, área clicável dos botões >=44px.
- Banco/demo do usuário de teste concede só três opções na barra: Painel, Clientes e Abrir OS. Dois outros botões VISUAIS temporários foram inseridos apenas no navegador de teste para verificar a geometria com **cinco posições** (Financeiro e Gastos). Esses botões extras não fazem parte do código modificado.
- Menu lateral real foi aberto e confirmado com os discos dourados em todas as quatro larguras.
- Barra do Controle de Gastos foi conferida por DOM DE TESTE com cinco itens, em todas as quatro larguras, sem tocar operações financeiras; **não afirmar que fizemos testes operacionais reais de pagamentos**.
- Frontend 66 testes unitários PASS, TypeScript PASS, Vite build ISOLADO PASS com o CSS novo incorporado.
- Rollback PowerShell sintaticamente válido. Snapshot de origem restaurável com hash.
- Prévia visual LOCAL HTTP 200: http://127.0.0.1:8012/arl-publicidade-preview/COMPARAR-MENU-FLUTUANTE-ARL-MOBILE-20261018.html
- **PENDENTE**: aprovação estética no celular físico / na conta com todas as permissões; liberação/publicação no KingHost só se autorizado.

**STATUS:** código local atualizado; arquivos e backups preservados; nenhum upload/publicação, banco oficial intacto.
