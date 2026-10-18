# ARL Informática — correções finais do menu mobile (18/10/2026)

## Pedido e três defeitos conferidos
1. A barra inferior de cinco opções não pode ficar sobre o menu lateral quando este estiver aberto.
2. Cinco botões devem aparecer sempre: Painel, Clientes, Abrir OS, Financeiro, Gestor de Gasto. Respeitar permissões: botões restritos são VISÍVEIS, MAS DESABILITADOS; perfis Master autorizados têm cinco funcionais.
3. Remover aro grosso do Painel e manter borda fina e uniforme em todos os botões.

## Implementação local
- `resources/js/main.tsx`: fixa cinco posições sem alterar funções do menu; itens Financeiro/Gastos ficam indisponíveis quando o perfil não pode acessá-los. Condicional React impede render da barra ao abrir menu lateral. Estado `mobileDrawerClosed` segura a remontagem por 440ms após fechar, respeitando a animação do menu de 420ms.
- `resources/css/arl-mobile-floating-bottom-nav-20261018.css`: contornos uniformes de 1px sem outline duplo, mantém sombras leves e botão central vermelho; web original e tema Clean automático no mobile agora recebem acabamento do MENU e fundo/ícones creme-dourados do menu lateral.
- **Nenhuma mudança em PHP, banco, permissões de usuário, rotas, handlers de financeiro ou disposição geral das páginas mobile**.

## Preview VALIDADO do aplicativo REAL, não mockup
- Executado com fontes atuais do `www\arlinformatica` (React/Laravel), build Vite novo temporariamente instalado na pasta `public/build` APENAS durante as capturas; a build original foi restaurada ao término.
- Laravel localhost porta 8134, APP_ENV=testing, SQLite independente na pasta de backup, perfil E2E Master fictício; nenhum dado oficial, cliente real ou KingHost acessado.
- Capturas atuais realizadas em Chromium 390px e 320px, aguardando carregamento da sessão real:
  - `APP-REAL-FINAL-390-MENU-FLUTUANTE-5-BOTOES.png`
  - `APP-REAL-FINAL-390-MENU-LATERAL-SEM-BARRA-INFERIOR.png`
  - `APP-REAL-FINAL-390-MENU-REABERTO-5-BOTOES.png`
- Verificações: 5/5 botões habilitados para Master, borda 1px e outline 0px nos cinco, nenhum overflow horizontal, menu fixo no rodapé. Menu lateral aberto: bottom nav ausente do DOM. Novo tempo de reabertura de 440ms evita sobreposição durante a animação de saída.
- **Prévia visual LOCAL** com imagens CAPTURADAS DO APP REAL (não uma demo desenhada):
  http://127.0.0.1:8012/arl-publicidade-preview/APROVAR-APP-REAL-MENU-MOBILE-CORRIGIDO-20261018.html
- Os screenshots estão copiados ao diretório `arl-publicidade-preview` do clone demo LOCAL APENAS para revisão; NÃO publicá-los na KingHost.

## Verificações e ponto de restauração
- TypeScript `npm run typecheck`: PASS.
- Testes unitários frontend: 66 PASS/0 FAIL.
- Vite build com alterações finais: PASS, em pasta isolada; build original em `public/build` restaurada.
- Rollback sintaticamente válido (0 erros PowerShell), dois arquivos protegidos por SHA-256.
- Pasta: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\PONTO-ANTES-CORRECOES-5-BOTOES-DRAWER-20261018`.
- Script exclusivo: `REVERTER-APENAS-ESTAS-3-CORRECOES.ps1`. Recusa sobrescrever se os arquivos tiverem sofrido novas alterações posteriormente. Preserva o estilo flutuante anterior e a identidade web/dourada aprovada; não faz reset do Git.
- **NÃO publicar ainda**: aguardar aprovação do proprietário para enviar layout à versão oficial/KingHost.

## Pendências e honestidade técnica
A conta Master em teste tem cinco botões realmente habilitados. Usuários sem autorização continuam com o botão correspondente visível, mas cinza/desabilitado, sem liberar acesso. Capturas são do aplicativo funcional com dados fictícios e não provam uso com banco de produção. Nenhuma atualização feita no online.
