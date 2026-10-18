# ARL Informática — Identidade visual WEB no MOBILE — 17/10/2026

## Decisão do proprietário
Aplicar as **cores, botões, barras, bordas, sombras, ícones conforme contexto e estilo do web ao mobile**, incluindo o **Controle de Gastos**, **sem mudar a disposição ou funcionamento do mobile**. Criar ponto de restauração antes da intervenção, para desfazer tudo se não gostar.

## Implementação LOCAL, reversível por dois arquivos
- Estilo novo: `resources/css/arl-mobile-web-gold-visual-20261017.css` (somente regras decorativas e cores; 0 declarações CSS de propriedades de posição, grid, dimensões, espaçamento ou transformações).
- `resources/js/main.tsx`: apenas importação do estilo ao final, depois de todos os outros estilos, sem mexer em JSX, estado, eventos, dados, API ou handlers.
- Escopo visual: aplicação mobile no tema **Original** e área **Controle de Gastos mobile** (mesma estética creme/off-white e ouro do web). Modo desktop intocado; modo Clean da ARL não sobrescrito pelas regras visuais gerais.
- Aparência: fundo claro perolado, cards creme/branco com contorno e sombra dourados, bordas e botões pretos/ouro principais, barras inferiores e indicadores neutros dourados; mantidos **botão + vermelho, WhatsApp verde, cifrões verdes, avisos vermelhos e estado dos controles**.
- Nenhuma atualização em PHP, MySQL/MariaDB, ordens, clientes, pagamentos, cálculo financeiro, regras de app, sistema mobile, navegadores online ou hospedagem.

## PONTO DE RESTAURAÇÃO (antes de tocar em qualquer estilo)
`C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PONTO-RESTAURACAO-ANTES-IDENTIDADE-WEB-NO-MOBILE-20261017`

Contém:
- `RECURSOS-JS-CSS-ORIGINAIS-ANTES-DAS-ALTERACOES.zip` — snapshot SHA-256 verificado de **159 arquivos CSS/JS** do estado local, incluindo mudanças anteriores já presentes.
- `MANIFESTO-PONTO-RESTAURACAO.json` — hashes individuais e git status preexistente.
- `REVERTER-SOMENTE-IDENTIDADE-MOBILE.ps1` — DESFAZ APENAS esta intervenção: retira import do novo CSS e arquiva folha de estilo nova, sem executar git reset e sem tocar em outras edições existentes.
- `COMPARATIVO-ANTES-DEPOIS-MOBILE.html` e quatro capturas para abrir no navegador, mostrando tela inicial e Controle de Gastos, **antes e depois** da nova identidade.
- QA e logs, build Vite isolada e `RELATORIO-FINAL-PONTO-RESTAURACAO-E-QA.json`.

## Testes executados
- Backup **159/159 SHA-256 verificados**.
- Import novo é a única modificação no `main.tsx`, e sua remoção reproduz **exatamente o hash** do ponto anterior.
- CSS novo altera **0 propriedades de layout/posição**.
- TypeScript `npm run typecheck` — PASS.
- 66/66 testes unitários de frontend — PASS.
- Compilação Vite em pasta ISOLADA (fora de `public/build`) — PASS, novo CSS presente no bundle compilado.
- Chromium testou app DEMO em largura **390 px** (principal, barra inferior, Controle de Gastos) com captura antes/depois.
- Controle de Gastos testado em **360, 390 e 430 px**, sem rolagem horizontal e confirmando troca efetiva dos estilos computados (cards e barra inferior).
- Não afirmar que todas as sub-telas foram revisadas manualmente, nem que o usuário aprovou; visual **AGUARDA APROVAÇÃO do proprietário**.

## Como voltar
Executar no PowerShell local o script:
`& "C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PONTO-RESTAURACAO-ANTES-IDENTIDADE-WEB-NO-MOBILE-20261017\REVERTER-SOMENTE-IDENTIDADE-MOBILE.ps1"`

Ou pedir ao assistente para executar essa reversão. O script preserva outras alterações de código posteriores. Recompilar assets locais se necessário para vê-los revertidos. **Nunca fazer git reset amplo ou restauração completa do projeto sem analisar o que ocorreu depois do backup.**

## Status
**🟢 Alteração de identidade visual aplicada somente no código local**; QA de compilação/sintaxe e comparativo visual passou. **🟡 Aguardando aprovação estética no dispositivo físico e autorização separada para publicar.** Nenhuma alteração no banco oficial, produção/KingHost, nem build pública definitiva.

## Prévia visual compartilhável no mesmo PC (apenas demonstração local)
Página de comparação antes/depois verificada HTTP 200, com quatro imagens reais da interface de teste:
http://127.0.0.1:8012/arl-publicidade-preview/COMPARATIVO-ANTES-DEPOIS-MOBILE.html

Os cinco arquivos de prévia foram copiados apenas para o diretório público do CLONE de demonstração em `AppData\Local\ARL-Informatica-Dev\GH-PREPUBLICACAO-20261016\public\arl-publicidade-preview`. **Nunca incluir esses arquivos em deploy da KingHost**; são temporários, para o proprietário aprovar/rejeitar a aparência mobile. Os arquivos de origem permanecem no ponto de backup. A página exibe capturas, não é uma versão mobile funcional publicada.
