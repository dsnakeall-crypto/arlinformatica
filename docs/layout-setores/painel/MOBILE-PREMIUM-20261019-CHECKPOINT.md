# ARL mobile premium + Gastos por responsáveis — checkpoint de 19/10/2026

Status: IMPLEMENTADO LOCALMENTE; AGUARDANDO ACEITE VISUAL E REGRESSÃO INTEGRAL. NÃO PUBLICADO.

## Autorização e escopo
Referência: imagem de Painel Mobile enviada pelo proprietário no chat. Menu aprovado:
Painel | Ordens | + Abrir OS | Clientes | Perfil. Perfil abre o menu lateral já existente, no qual Financeiro e Controle de Gastos continuam disponíveis conforme o perfil. Modo compacto e Web/PC preservados.

Logo: a primeira arte vermelha/dourada foi extraída diretamente de LOGO VETORIZADO(1).pdf, sem redesenhar as letras, como SVG com fundo transparente. Texto INFORMÁTICA e Manutenção e Soluções Inteligentes permanece HTML editável.
Imagem de fundo utiliza ativo tecnológico já presente no projeto; foto da referência ainda não disponível isoladamente.

No Painel, KPIs novos operacionais são alimentados por /api/orders/desk: OS abertas, Em análise, Em serviço, Aguardando peça. Não exibir receita nesse painel; financeiro permanece na seção autorizada. Lista existente de OS mantém clique de abertura, WhatsApp e Maps; atalhos novos disparam navegação React com validação de perfil.

No Controle de Gastos, já havia alterações locais anteriores em expense-control-page.tsx, expense-gastos-people.tsx e ExpenseControlController.php. Reutilizadas SEM descartar o trabalho: Gastos mobile apresenta Allan, Carol e Casal, com O que deve no mês, Pagou adiantado e Falta pagar; clique abre pop-up de instituições com saldo exclusivo do mês. Pagamento abre o fluxo financeiro preexistente (parcial/total, individual ou participação compartilhada). O cartão Casal não é um terceiro saldo. Nesta rodada, o refinamento próprio de expense-gastos-people-mobile.css deixou fundo de popup opaco e suprimiu listagem redundante na entrada. A prévia de E2E não possui dívidas cadastradas; portanto, clicar para efetivar um pagamento não foi homologado visualmente neste teste.

## Arquivos novos ou alterados nesta rodada
- public/arl-assets/arl-red-gold-from-vector-20261019.svg (novo)
- resources/css/arl-mobile-premium-20261019.css (novo)
- resources/js/main.tsx (menu, evento de navegação, nome do usuário e import CSS)
- resources/js/mobile-home.ts (hero, KPIs operacionais, atalhos)
- resources/css/expense-gastos-people-mobile.css (popup opaco e cards prioritários)
- tests/e2e/arl-premium-20261019.mobile.spec.ts (novo)

ATENÇÃO: esses arquivos não devem ser adicionados com git add ., pois o checkout possui centenas de alterações, inclusive históricas. As mudanças preexistentes no Financeiro e E2E não foram revertidas.

## Segurança e evidências
Backup pré-edição verificado com SHA256:
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 19-10-26 - 02-15 - LAYOUT-MOBILE-PREMIUM
- TypeScript 0 erros; lint 0 erros; build concluído.
- Playwright direcionado mobile premium: 2/2 PASS (ARL e Gastos + popup). Capturas: ARL-PAINEL-MOBILE-REAL.png, GASTOS-TRES-CARDS-REAL.png, GASTOS-POPUP-INSTITUICOES-REAL.png.
- Testes de backend de pagamentos em execução/separadamente registrados no backup.
- Servidor exclusivo para visualização em 127.0.0.1:8012, APP_ENV=testing, SQLite e storage privado descartáveis. Não é KingHost nem banco real.
- App Playwright headed aberto em formato mobile, logado com usuário de teste E2E; sem publicação.

## Pendências
1. Proprietário avaliar a interface na prévia e aprovar ou pedir correções.
2. Fidelidade pixel a pixel está em ajustes, especialmente foto de fundo do cabeçalho e ícones do menu recebidos por CSS legado. Não declarar 100%.
3. Corrigir/atualizar E2E legados que ainda esperam menu antigo Financeiro e Gestor de Gasto no dock; preservar essas rotas por Perfil.
4. Montar fixtures de dívida e validar visualmente pagamento parcial/integral Allan/Carol/Casal e prévia por instituição sem tocar no banco oficial.
5. Regressão full Playwright (desktop e mobile), PHP/JS, permissões, acessibilidade, temas.
6. Commit seletivo APENAS após aceite e regressões; conferir Actions antes de qualquer deploy. KingHost e arquivos reais intocados.

## Rodada 19/10/2026 — ícones ARL uniformes + hamburger removido

Aprovado: remover o botão de três tracinhos do cabeçalho mobile; o Perfil do dock continua abrindo o menu lateral. Unificar os ícones com o estilo vetorial do novo mobile ARL.

Implementação local:
- resources/js/main.tsx: botão menu-toggle somente desktop; Perfil continua usando setMobileMenu(true); ícone House para Painel.
- resources/js/mobile-home.ts: os 8 símbolos Unicode do painel viraram ícones SVG vetoriais nos quatro KPIs e quatro atalhos, sem mexer nos handlers de navegação.
- resources/css/arl-mobile-premium-20261019.css: padronização de ícones e eliminação dos fundos/bordas/sombras 3D antigas no menu mobile ARL, incluindo botão ativo.
- tests/e2e/arl-premium-20261019.mobile.spec.ts: novos asserts para ausência de hamburger, ícones SVG e House; navegação Perfil, Ordens, Clientes, Abrir OS.

Backup anterior + hash SHA256 em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\MOBILE-ICONS-SEM-HAMBURGER-20261019.

Validações: typecheck 0, lint 0, build 0 e Playwright focado 2/2 PASS. Verificação real dos estilos confirmou borda 0 e boxShadow none no botão selecionado, hamburger DOM 0. Captura final ARL-MOBILE-NOVO.png aberta no PC.

Nenhum commit, push, publicação, limpeza Git ou alteração no banco oficial. A KingHost permanece intocada. Ainda falta aceite visual e a CI integral antes de considerar publicação.
