# ARL Informática — Etapa 4: otimização conservadora do Controle de Gastos

Data: 15/10/2026. Status: melhorias React aplicadas ao original LOCAL, com controle de backup, regressão financeira e prova visual. NÃO publicadas no GitHub ou KingHost.

## 1. Objetivo e segurança
O proprietário pediu continuar investigando os ~358 KiB do Controle de Gastos. A Etapa 4 investigou HTML/CSS/React e o custo de formatação sem mudar cálculos, regras ou estilos. Foi usada a cópia QA em %LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE com Laravel e SQLite descartável. O projeto local aprovado permaneceu intocado enquanto as alterações eram medidas.

Backups ANTES em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 13-55 - ETAPA4-GASTOS-ANTES:
- cópias ORIGINAL e QA verificadas SHA256 de 5 TSX envolvidos + 2 CSS inalterados;
- MANIFEST-ANTES-SHA256.csv e MANIFEST-FOUR-COMPONENTS-SHA256.csv;
- snapshot integral PRE-EDIT com 948 arquivos restaurados e verificados, SHA256 tar.gz EEA86BF8EF3025C5EAFE79FED3A576788269B42847E39DE231DEC5548C2CF20E; exclui .env, SQL, storage privado e Git, já protegidos em backups separados anteriores.
- Ensaio de rollback exato por arquivo; promoção recusaria sobrescrita se algum hash original diferisse do backup.

## 2. Diagnóstico do CSS
O módulo importa diretamente 9 folhas de estilo principais, já consolidadas pelo Vite em aproximadamente 218 KiB de CSS compilado.
Auditoria via PostCSS encontrou, nos nove CSS analisados, muitas regras responsivas e !important sobrepostos; NENHUMA duplicação literal de regra no mesmo arquivo que fosse claramente segura de apagar.
Nenhuma folha CSS, seletor, token de tipografia, cor, ícone, grid, breakpoint, sombras ou textos do Original, Clean ou Mobile foi alterado. Remoção agressiva de CSS sem comparação visual seria uma regressão de alto risco e permanece FORA desta intervenção.

## 3. Melhorias React aplicadas
Arquivos alterados APENAS:
1. resources/js/expense-control-page.tsx
   - ExpensePersonPayment e ExpensePersonMonthSummary, usados exclusivamente em popups fechados por padrão, deixaram de ser imports diretos e agora usam React.lazy + Suspense, baixados ao abrir a ação correspondente.
   - O estado do popup, todos os campos, API e funções de confirmação permaneceram iguais. Quando chunks estiverem carregando, Suspense usa fallback nulo; não foi criada tela artificial/placeholder.
2. resources/js/expense-control-mobile-summary.tsx
3. resources/js/expense-summary-overview.tsx
4. resources/js/expense-person-payment.tsx
5. resources/js/expense-person-month-summary.tsx
   - Os quatro componentes passaram a criar somente uma instância estável de Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}) por módulo em vez de criar formatador novo a cada valor. As expressões de valores/centavos e a saída de formatação não mudaram.

Nenhuma mudança de backend, MySQL, migração, permissões, saldo, pagamentos, PDFs, documentos históricos, tema, CSS ou arquivos de outros projetos.

## 4. Resultado do build
Medição do grafo de importações do Vite, tamanho incremental necessário ao primeiro acesso ao Controle de Gastos; não inclui bundle principal compartilhado.
- Antes: 357,91 KiB bruto; 73,41 KiB gzip SIMULADO localmente.
- Depois da divisão dos popups: 344,40 KiB bruto; 69,72 KiB gzip SIMULADO localmente.
- Economia inicial aproximada: 13,51 KiB bruto (~3,8%), 3,69 KiB gzip (~5,0% no incremento gzip).
- Os componentes passam a ser baixados SOMENTE QUANDO popup é aberto; sessões que usarem todas as ações poderão baixar os mesmos bytes depois.
- Build ativo no Laragon conferido com GET real do JS compilado expense-control-page-CLlljtcO.js: HTTP 200, Content-Encoding gzip, Cache-Control public,max-age=31536000,immutable, download 27.898 bytes e SHA256 do arquivo descompactado igual ao disco. Atenção: esse JS individual não é o conjunto completo incremental acima.
- Redução de novas criações de Intl.NumberFormat nos componentes é otimização de CPU, porém NÃO há ganho de CPU/FPS total quantificado para as telas com dados reais nesta rodada.

## 5. Verificação visual e de tempo
Playwright QA antes: 3 testes, 1366×768 (desktop), 390×844 (mobile), 1280×720 (desktop reduzido). Capturas com animações desligadas.
Playwright QA depois, sessão VISUAL isolada com base de testes reinicializada: 3 testes PASS. Os PNGs dessas 3 resoluções foram IDÊNTICOS byte a byte (SHA256), com mesmo número de nós, CSS, fontes e fundos:
- desktop: 489 nós, baseline 2439ms, depois 2348ms;
- mobile: 497 nós, baseline 2020ms, depois 2048ms;
- reduzido: 489 nós, baseline 2446ms, depois 1960ms.
Esses tempos são navegação + espera pela estabilização no QA em sessões diferentes e VARIAM entre execuções; não comprovam aceleração consistente perceptível da página. Uma primeira comparação não-isolada mostrou diferença porque outros E2Es haviam criado dados financeiros fictícios, não porque o CSS mudou. Nova comparação isolada idêntica.

## 6. Regressão funcional
- QA inicial (após lazy dos popups): lint, typecheck, 61 unitários e build PASS.
- QA final (após formatadores): lint, typecheck, 61 unitários e build PASS.
- E2E funcional final: 10 testes PASS, 0 FAIL, incluindo pagamentos completos e parciais, responsável casal, proteção CSRF, idempotência, detalhes de mês, redimensionamento, foto e pagamentos MOBILE.
- E2E visual isolado final: 3/3 PASS.
- ORIGINAL após promoção: lint, typecheck, 61 unitários, build e git diff --check PASS. Todos os 5 TSX tiveram SHA256 idêntico ao candidato QA final.
- Nenhum PHP foi alterado; a bateria PHP anterior da Etapa 3 (400/400 e 7439 assertions em SQLite em memória) permanece como último teste backend confirmado. O conjunto integral E2E de 293 casos NÃO foi repetido aqui; não declarar release integralmente aprovado.
- Laragon: arlinformatica.test, DoctorMotos.test e arl-maquinas.test HTTP 200. Nenhuma publicação remota.

## 7. Próximas investigações
1. Medir Gastos em cenários com centenas/milhares de instituições, compras e parcelas fictícias, para quantificar renderizações e número de chamadas de API em cada submenu; medir cache frio/quente real.
2. Investigar com segurança a divisão dos CSS de telas por media query sem alterar ordem da cascata, validando Original/Clean/Mobile e todos os estados. Ainda requer testes visuais mais amplos e não foi aplicado nesta etapa.
3. Otimizar outros componentes de resumo ou subabas somente se React Profiler identificar trabalho redundante relevante e os testes financeiros permanecerem verdes.
4. Fechar pendências E2E históricas, incluindo notificações e fundo antigo, e o caso documental 409 pré-existente no Pós-venda, antes de preparar publicação.
5. GitHub e KingHost permanecem bloqueados sem autorização específica.

Evidências internas no Windows: %LOCALAPPDATA%\ARL-Informatica-Dev\PERFORMANCE-ETAPA4-20261015: css-static-audit.json, screen-baseline/, screen-candidate/, screen-final-isolated/, logs do Playwright e npm, backup-path.txt, promover-etapa4.ps1, resposta gzip do Laragon. Nenhum banco nem senha transferidos ao chat.

## Encerramento: pacote de código da versão local atual
Criado em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 13-55 - ETAPA4-GASTOS-ANTES\CODIGO-LOCAL-ETAPA4-CODIGO-FINAL.tar.gz. Manifesto MANIFEST-CODIGO-ETAPA4-CODIGO-FINAL-SHA256.csv na mesma pasta. **952 arquivos/952 hashes SHA256 confirmados após extração**, nenhuma divergência, tamanho 23,43 MiB, SHA256 do tar.gz 6D027EC6A3B8517F2C31DE2224FCFD3CD780B9E2C33A018C973BFF13195F28C8. Pacote exclui .env, SQL, storage privado e .git (protegidos separadamente em fases anteriores). Não enviar ao GitHub/servidor diretamente sem inspeção de segredos e preparação de release.
