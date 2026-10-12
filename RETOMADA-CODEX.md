# RETOMADA CODEX — ARL Informática — 12/10/2026

Desenvolvimento interrompido por ordem expressa do proprietário. Não iniciar antes de 03:55 de 12/10/2026, America/Sao_Paulo (06:55 UTC). Horário conferido ao parar: 02:13 de Brasília.

## Local e Git
Cópia exclusiva de desenvolvimento:
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\02 - Desenvolvimento\arl-oito-melhorias-20261012
Branch: codex/oito-melhorias-20261012
Último checkpoint anterior à parada: 55bed85 (interface e regressão financeira).
O checkpoint de parada inclui este arquivo e todas as mudanças posteriores. Obter seu hash com git log -1 --format=%H. O hash exato também será registrado no backup externo e na resposta ao proprietário.
Base oficial publicada: e90f11fea20839e573df7a40d67489301dbcaad7.
Backup externo verificado do código e histórico: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\oito-melhorias-base-20261012-012927 (codigo-e90f11f.zip e historico.bundle verificados; SHA256.json).
Original intocável: C:\laragon\www\arlinformatica. Sempre passar workdir explícito para a cópia isolada.

## Estado das oito alterações
1. Total devido por instituição: backend e exibição implementados. Inclui parcelas futuras registradas, créditos anteriores e filtro de responsável; testes financeiros aprovados. Falta evidência visual específica em lista/cards e revisão final.
2. Pagamento rápido por responsável/dívida: backend e UI implementados. Mês por vencimento completo, parcial por ordem de vencimento, total somente da parte selecionada. UI, CSRF, idempotência, regressão e concorrência MySQL têm evidências aprovadas. Última correção: prévia mensal mostra saldo restante de toda a dívida, incluindo parcelas futuras; novo teste PHP passou. Falta repetir E2E rápido após essa mudança, testar retentativa/erro/duplo clique na UI e revisão final.
3. Parcelas compactas: nome em negrito, instituição/tipo discretos; remove somente frase padrão de foto da exibição, sem apagar notas no banco; pessoa irrelevante escondida em dívida pessoal. CSS de centralização pessoal e codificação UTF-8 acabaram de ser corrigidos; falta rebuild e validação visual/mobile após essas últimas alterações.
4. Barra inferior mobile: remove espaço externo gratuito com safe-area preservada. Barra de gastos validada no E2E rápido. Falta completar teste da barra principal (teste interrompeu antes dessa assertion).
5. Instituições desktop: até cinco colunas, responsividade e altura automática, sem scrollbar interna. Teste novo passou em 1600px/1024px; captura output/oito-melhorias/instituicoes-desktop.png inspecionada. Falta validar cartões com muitos tipos em Gastos.
6. Menu desktop de gastos: faixa de fundo dos contêineres removida; botões preservados. Teste novo e captura aprovados.
7. Foco ARL suavizado: CSS implementado; Field recebe aria-invalid quando há erro, preservando distinção de erro. Falta validação visual e de teclado, principalmente selects de status da OS. Não alterar cores funcionais de status.
8. Atendimento mobile: aria-pressed ligado ao estado real do formulário; CSS vermelho persistente implementado, mas TESTE REPROVOU: após blur, background observado rgb(237,242,255), esperado rgb(185,28,28). Investigar regra CSS vencedora/carga de estilos e corrigir somente botões de atendimento. Não foi corrigido antes da parada. Falta salvar/reabrir/editar OS e confirmar attendance_type persistido.

Nenhuma alteração está declarada pronta para publicação; validação final das oito ainda incompleta. Não existe pacote novo liberado nem executor novo de ativação pronto.

## Arquivos importantes
- app/Services/ExpenseControl.php: personDebtPlan e integração na gravação existente; soma registrada na prévia.
- app/Http/Controllers/ExpenseControlController.php: personBalances/personPayment e institution_balances.
- routes/api.php: rotas autenticadas de leitura/prévia e POST de pagamento.
- resources/js/expense-person-payment.tsx: seleção de dívida, ações, prévia, UUID persistente e trava de submissão.
- resources/js/expense-control-page.tsx, expense-control-mobile-summary.tsx, expense-summary-overview.tsx: ícone, popup, saldos, apresentação das parcelas.
- resources/js/main.tsx e resources/css/arl-eight-improvements-20261012.css: estilos restritos às oito alterações.
- resources/js/app-shared.tsx e new-order-page.tsx: aria-invalid e aria-pressed.
- tests/Feature/ExpensePersonPaymentTest.php.
- tests/e2e/expense-quick-payment*.ts, eight-improvements*.ts.
- tests/support/expense-payment-concurrency.php e expense-payment-worker.php.
- .agents/OITO_MELHORIAS_PROGRESSO.md e logs .agents/*.log.

## Testes e resultados
- PHPUnit SQLite: 63 testes / 977 assertions aprovados antes da última assertion de saldo futuro na prévia.
- PHPUnit específico após última correção da prévia: 10 testes / 117 assertions aprovados.
- PHPUnit MySQL real isolado: ExpensePersonPaymentTest + ExpenseControlTest, 51 testes / 712 assertions aprovados, já com prévia corrigida (.agents/PHPUNIT_MYSQL.log).
- Lint e TypeScript aprovados antes dos últimos ajustes de testes/CSS; repetir checks ao concluir.
- Build aprovado duas vezes, mas alterações CSS posteriores exigem novo build. Avisos existentes de ícones resolvidos em runtime apareceram; revisar pacote antes de liberar.
- Testes unitários frontend: 51 aprovados.
- Playwright pagamento rápido: 2 aprovados (desktop/mobile), três ações, créditos da outra parte preservados, HTTP 419 sem CSRF, nenhum desconto financeiro. Executado antes da última correção da prévia mensal.
- Playwright regressão: 18 aprovados, 1 reprovado (atendimento mobile por CSS). Incluiu expense-control, expense-value-split, expense-purchase-corrections, expense-responsive e novos testes visuais. Log .agents/PLAYWRIGHT_REGRESSION.log.
- Concorrência MySQL: três comparações com mecanismo original aprovadas, usuários distintos sobre mesma dívida: só uma gravação de 5000, outra 422; saldo sem excesso. Repetição simultânea do mesmo UUID/usuário também aprovada: mesma operação, apenas uma gravação e replay=true.
- Diagnóstico inicial negativo da concorrência era fixture incorreta: buscava usuário novamente DENTRO da transação, iniciando snapshot artificial. Worker foi corrigido para autenticar antes, igual ao aplicativo. Alteração experimental de lockForUpdate no lookup de operação foi removida; mecanismo original preservado. Logs BEFORE/AFTER/BASELINE mantidos por transparência.
- Dados oficiais, KingHost e original não acessados/modificados nesta implementação. Não há migration nova.

## Próximo passo exato
1. Ler este arquivo, git status e último commit. Não repetir auditorias antigas.
2. Investigar CSS que vence no botão de atendimento selecionado (test eight-improvements-mobile.spec.ts linha 14). O estado aria-pressed funciona; defeito restante é visual. Última pesquisa não encontrou literal #edf2ff nos CSS. Inspecionar estilos computados/regras carregadas via Playwright; preservar demais layouts.
3. Rebuild após corrigir CSS, executar somente testes novos afetados, completar validação visual de parcelas pessoais/foco/OS salva.
4. Terminar revisão financeira/segurança e regressão aplicável. Registrar resultados reais, falhas e pendências; não desabilitar testes.
5. Preparar nova release identificável reaproveitando infraestrutura anterior. Não repetir migration já aplicada do e90. Ativação somente com confirmação expressa final do proprietário; rollback deve voltar a e90, não à release 970 anterior.

## Comandos (executar SOMENTE na cópia isolada)
    Set-Location -LiteralPath 'C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\02 - Desenvolvimento\arl-oito-melhorias-20261012'
    git status --short
    git branch --show-current
    git log -1 --format=%H
    $env:APP_KEY='base64:'+ [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    php vendor/phpunit/phpunit/phpunit tests/Feature/ExpensePersonPaymentTest.php
    npm run lint
    npm run typecheck
    npm run build
    npm run test:unit
    $env:E2E_PORT='8032'
    npx playwright test eight-improvements-mobile.spec.ts expense-quick-payment.spec.ts expense-quick-payment-mobile.spec.ts

Concorrência só no MySQL descartável já confirmado, porta 33458/datadir ARL-backups/missao-final-mysql-20261011/data, schema arl_oito_test_20261012. Não usar porta/default 3306. Há outros MySQL locais; NÃO tocá-los. Para repetir, setar DB_CONNECTION=mysql, DB_HOST=127.0.0.1, DB_PORT=33458, DB_USERNAME=root, DB_PASSWORD vazio, DB_DATABASE=arl_oito_test_20261012, APP_ENV=testing, CACHE_STORE=array, SESSION_DRIVER=array, QUEUE_CONNECTION=sync e APP_KEY temporária no processo; executar php tests/support/expense-payment-concurrency.php e mesma chamada com argumento replay. Voltar ao SQLite em um processo separado. O schema de PHPUnit é outro: arl_oito_test_phpunit_20261012. Nenhuma exclusão de dados/arquivos durante a parada.

## Regras financeiras e publicação
- Abater valor personalizado = DINHEIRO EFETIVAMENTE PAGO, nunca desconto.
- Reutilizar cg_operations/cg_entries e lógica existente de pagamentos; centavos inteiros.
- Uma dívida por confirmação; não quitar todas as instituições. Preservar a outra pessoa e divisões desiguais.
- Mensal usa due_on mês E ano; não antecipa parcelas futuras. Parcial segue due_on completo, não id ou mês isolado. Total só parte selecionada e parcelas futuras já cadastradas.
- Recorrência mensal não é encerrada ao quitar saldo registrado; interface informa isso.
- GET novo não gera parcelas/grava operações. POST autorizado com CSRF, prévia válida, UUID, limites e transação.
- Não mexer em banco oficial, .env, storage/uploads, histórico, original, produção ou configurações globais. Sem push/merge/deploy.
- Checkpoints locais estão autorizados. Publicação KingHost depende de confirmação explícita. Senha SSH somente prompt nativo.
- Medição mais recente de uso: 86% consumido / 14% restante, antes desta documentação. Não inventar medições. Consultar ferramenta quando necessário e proteger/parar se restante atingir 8%.

## Retomada manual
Às 03:55, enviar nesta mesma conversa: "Retome as oito melhorias a partir de RETOMADA-CODEX.md na cópia isolada, continue do checkpoint e priorize testes financeiros. Não publique sem minha confirmação."
Estado de agendamento será registrado abaixo após a resposta do agendador oficial do Codex.

## Checkpoint de parada e agendamento confirmado
Hash do checkpoint que preservou todo o código e logs de parada: 8e75eb7ec506825bf5902595977038c978cd9fa7.
Um commit documental posterior inclui este registro; para o hash final exato, executar git log -1 --format=%H ou consultar CHECKPOINT-OITO-MELHORIAS.txt no backup externo.
Automação oficial do Codex criada e conferida: retomar-arl-s-03-55, kind=heartbeat, status=ACTIVE, conversa 01a12ba5-3e28-7fc3-9cf5-494fc7a98e50.
Regra pontual: RRULE:FREQ=DAILY;COUNT=1;BYHOUR=3;BYMINUTE=55;BYSECOND=0.
Fuso do Windows conferido: E. South America Standard Time, UTC-03:00; data local 12/10/2026 às 02:16. A próxima ocorrência solicitada é 12/10/2026 às 03:55 de Brasília.
Agendamento registrado pelo aplicativo e arquivo automation.toml conferido; execução depende de o Codex/computador estarem ativos e com uso disponível. Não existe agendador externo improvisado. Se o aplicativo não disparar, usar a mensagem de retomada manual acima.
Nenhuma implementação, auditoria ou teste novo foi iniciado depois da ordem de parar. Operações anteriores de build/Playwright/PHPUnit terminaram antes da parada. Desenvolvimento permanece parado até o horário autorizado.

## Retomada efetivada em 12/10/2026 às 03:55
Automação retomar-arl-s-03-55 disparou e foi pausada oficialmente (sem nova sessão).
- Atendimento mobile corrigido: regra geral do tema Clean para aria-pressed tinha maior prioridade; aumentada especificidade somente dos dois botões. Teste de seleção após blur e rodapé passou.
- OS externa criada pela UI, reaberta e editada: attendance_type preservado; teste passou após a fixture respeitar a confirmação Sem senha exigida pelo editor existente.
- Pagamentos rápidos desktop/mobile passaram novamente; retentativa após resposta perdida e duplo clique passaram, mesmo UUID e uma única operação.
- Nova prova de concorrência isolando notificações encontrou dependência de bloqueios incidentais: dois pagamentos de 5000 podiam creditar 10000 sobre parte de 7000. A leitura de cg_operations na função record agora usa lockForUpdate antes de aguardar a dívida; evita snapshot antigo. Três rodadas ledger-only, uma com notificações e uma de replay aprovadas. Log REPRISE_MYSQL_LEDGER_BASELINE registra a falha reproduzida antes; REPRISE_MYSQL_ledger/normal/replay registram correção. Não houve alteração no cálculo das partes ou no mecanismo de lançamentos.
- PHPUnit financeiro após essa correção: 63 testes, 978 assertions aprovados em SQLite.
- Teste com 8 tipos: a regra antiga de overflow tinha mesma especificidade e era carregada depois. Corrigida prioridade apenas do cartão de Gastos. Totais incluem compras somente futuras (1000 reais na fixture). Validação final visual em execução; não declarar concluída antes do resultado.
- Falhas intermediárias de fixtures preservadas em logs: percent_one obrigatório faltante, navegação mobile sem pesquisa (fluxo real usa instituição/tipo) e seleção de dívida por substring pegando outra dívida. Corrigidas fixtures para dados e fluxos reais; nenhum teste desabilitado.
- Próximos passos: confirmar saldos/parcelas pessoais desktop/mobile, validar foco e estados de erro/status, revisão de segurança e regressões após correção financeira, lint/types/unit/build, relatório/checklist e preparação de pacote. Nenhuma publicação/push autorizada.

## Resultado final local da retomada
As oito melhorias passaram na validação local; detalhes em .agents/OITO_MELHORIAS_RESULTADO_20261012.md.
Resultados finais: 64 PHP SQLite/987 assertions; 52 PHP MySQL/721 assertions; 28 Playwright; 51 unitários; lint/types/build. Concorrência ledger-only e replay aprovados após lockForUpdate do lookup de operação. Nenhuma migration.
A automação está PAUSED. Nenhum push/KingHost/produção. Próximo passo após a preparação do pacote: proprietário revisar e dar confirmação expressa para qualquer push/ativação. Usar executor novo; rollback e90, não executor antigo com rollback 970. Não repetir análises/testes aprovados sem nova mudança ou preocupação concreta.

Pacote pronto para revisão: output/releases/ARL-OITO-MELHORIAS-c9ded0e0458d.zip e manifesto .json. Fonte c9ded0e0458d25091156eb0bd084ad20a05fa7b4; SHA256 f5d6f455aeb4a4754f85acf921514eb04c24aab1c1681dc8a9d7ddd80bfee117.
Executor novo e comandos em .agents/OITO_MELHORIAS_RESULTADO_20261012.md. Local validation/guard de autorização aprovados; sem SSH. Trabalho de implementação/validação encerrado: aguardar confirmação expressa do proprietário para push e ativação. Não iniciar publicação automaticamente.

## Pausa obrigatória antes de SSH — instrução prioritária do proprietário
O proprietário pediu: "antes da publicacao oficial pare ... finalize tudo q precisar ... a hr q precisar abrir o SSH pare". Ainda não foi aberto SSH nesta publicação e não houve upload, staging remoto, alteração de aliases, ponteiro, banco ou servidor. Pode concluir preparação/CI/correções locais e pushes autorizados, mas NÃO iniciar SSH ou ativação até nova instrução do proprietário.
Fonte preparada atual: 9c6eaf403670def1a43b68850f7eef2b08f9b524.
Pacote atual: output/releases/ARL-OITO-MELHORIAS-9c6eaf403670.zip; SHA256 ed262aa93f926ab14054cfad7e7632d315e255790f183a6970887a545268bc2e. Mesmos hashes de runtime do candidato inicial aprovado; somente identificação atualizada.
CI: https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38246418929; backend SQLite, backend MySQL e frontend aprovados; E2E ainda aguardando conclusão na hora desta anotação.
Retomada: conferir resultado da CI e git status/HEAD antes de usar qualquer comando. Não reabrir SSH automaticamente. Não é necessário deixar senha/sessão aberta durante a ausência do usuário; senha somente no prompt nativo quando ele retornar.

CI completa 9c6 concluiu 267 E2E aprovados/2 falhas nas expectativas legadas de quatro colunas. Teste alinhado à Alteração 05 aprovada, mantendo validações de igualdade por linha, imagens/ações, redução responsiva e conteúdo sem scroll/corte. Cinco cenários locais aprovados (44,5s), lint/types aprovados. Nenhum runtime novo. Próximo passo: conferir nova CI e pacote do checkpoint seguinte. Não abrir SSH até o proprietário retornar e instruir retomada.

Fonte vigente enviada: eec107ca29b1c4c720265ff376e60bdf69b17832. Nova CI: https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38249750699.
Pacote vigente: output/releases/ARL-OITO-MELHORIAS-eec107ca29b1.zip; SHA256 10a59fd9d17a0e31d0eb53aafe32550e24a929b54d0ac0be223c4c1f8961afb2; 37.683.482 bytes/7.856 arquivos; CRC, hashes individuais e -ValidarLocal aprovados. Todos os hashes de runtime iguais ao candidato 9c6. Candidatos antigos não são o pacote vigente.
Só depois de CI verde E nova instrução para abrir SSH: usar deploy/PUBLICAR-OITO-MELHORIAS.ps1 com -PacoteRelatorio output/releases/ARL-OITO-MELHORIAS-eec107ca29b1.json -AutorizarPublicacao. Não executar agora. Não usar os manifestos anteriores.


## Encerramento vigente — 12/10/2026, 10:04 Brasília — parada antes de SSH
CI completa VERDE da fonte eec107ca29b1c4c720265ff376e60bdf69b17832:
https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38249750699
- Backend SQLite: 386 testes / 7.268 assertions aprovados; Pint e demais checks do job aprovados.
- Backend MySQL isolado da CI: 386 testes / 7.268 assertions aprovados.
- Frontend: lint, TypeScript, unitários e build aprovados.
- E2E completo: 269 aprovados, zero falhas, em 28,8 minutos. Evidência: .agents/CI_EEC107C_FINAL.json. Nenhum teste desabilitado.
Pacote vigente: output/releases/ARL-OITO-MELHORIAS-eec107ca29b1.zip; manifesto .json; SHA256 10a59fd9d17a0e31d0eb53aafe32550e24a929b54d0ac0be223c4c1f8961afb2; 37.683.482 bytes/7.856 arquivos. CRC/hashes individuais e validação do executor aprovados. Hashes de runtime iguais ao candidato previamente validado; alteração final apenas no teste legado.
Todas as pendências históricas de CI/push/preparação do pacote desta missão estão resolvidas. Permanecem exclusivamente a retomada expressa do proprietário para abrir SSH, preflight remoto, backup validado de aliases, ativação e smoke real sem gravação financeira. NÃO houve conexão SSH, upload, staging remoto, alteração de aliases, ponteiro ou banco nesta missão. O repositório original não foi alterado.
Parada obrigatória em vigor. Não abrir SSH nem publicar automaticamente. Não precisa deixar sessão SSH aberta durante a ausência do proprietário. Sem merge/migration/restauração SQL/deleção.
Comando para quando o proprietário voltar e instruir retomada (NÃO executar agora):
    pwsh -NoProfile -File deploy/PUBLICAR-OITO-MELHORIAS.ps1 -PacoteRelatorio output/releases/ARL-OITO-MELHORIAS-eec107ca29b1.json -AutorizarPublicacao
Se necessário reverter uma ativação futura, usar o mesmo manifesto e -Reverter -Resultado com o relatório REAL da execução; recuperação somente de aliases/ponteiro para e90, sem banco.
Checkpoint documental de encerramento ficará local, sem novo push para evitar outra CI apenas documental. A fonte enviada/validada e o pacote continuam eec107c; não regenerar pacote por documentação. Hash documental exato: git log -1 --format=%H e CHECKPOINT-OITO-MELHORIAS.txt no backup externo. Branch codex/oito-melhorias-20261012; caminho exclusivo C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\02 - Desenvolvimento\arl-oito-melhorias-20261012.


## Correções finais solicitadas antes de publicar — missão vigente
As oito melhorias anteriores foram reaproveitadas; correções de saldo mensal, faturas quitadas, totais exclusivos/ações com scope validado no backend e quatro PDFs já implementadas e validadas localmente. Relatório vigente: .agents/CORRECOES_FINAIS_RESULTADO_20261012.md.
Checkpoint intermediário: 02e65e887560590119f91881b70843ffa58ef38e; o próximo commit inclui cifrões centrais solicitados depois pelo proprietário. Git log -1 identifica a fonte local atual. Usar somente a cópia isolada e branch atuais. Sem migration/schema novo; MySQL descartável na porta 33458/datadir ARL-backups, sem acesso oficial.
73 PHP/1135 SQLite; 61 PHP/869 MySQL; concorrência ledger passou sem overpayment; 57 unitários incluindo seis PDF; PDFs reais baixados, extraídos e renderizados sem defeitos; lint/types/build e Pint Linux234 aprovados. Posicionamento central desktop/mobile medido e aprovado. Não repetir análises antigas.
Próximo passo: aguardar CI do commit final, preparar novo ZIP/manifesto e registrar seus hashes aqui. ZIP eec107c NÃO usar para publicar. Executor existente/rollback e90 preservados. NÃO abrir SSH ou publicar na KingHost; aguardar confirmação explícita após o proprietário revisar o resultado.
Backup completo existente reutilizado e proteção incremental dos arquivos alterados verificada. Não executar novo backup completo/SQL ou mudar .env/uploads/original.
