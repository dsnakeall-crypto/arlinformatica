# Oito melhorias ARL — resultado local — 12/10/2026

As oito alterações foram implementadas na cópia isolada, baseada exclusivamente na release publicada e90f11fea20839e573df7a40d67489301dbcaad7. Não houve acesso à KingHost, alteração do banco oficial, alteração do repositório original, push, merge ou publicação. A retomada pontual das 03:55 ocorreu e a automação foi pausada.

## Alterações entregues
1. Total devido em instituições de Gastos, lista/cards: soma parcelas reais registradas, inclusive compras somente futuras, desconta créditos e respeita filtros/responsável. Consulta nova não cria lançamentos; preservada a materialização mensal preexistente do módulo.
2. Ícone de pagamento rápido nos cartões Allan/Carol; dívidas agrupadas por instituição/tipo, escolha de uma dívida e prévia explícita. Mês usa vencimento completo; personalizado é dinheiro pago e distribui centavos pelas parcelas mais antigas; total quita somente a parte selecionada nas parcelas registradas. Payer separado do responsável creditado; recorrência mensal continua ativa e isso é informado. UUID preservado em retentativa, trava de submissão, autorização, CSRF, limites por saldo, auditoria e transação existentes reutilizados. Prévia informa o saldo futuro que permanecerá.
3. Parcelas compactas com nome forte e origem discreta; dívida pessoal mostra somente seu responsável; dívida compartilhada mantém ambos; notas manuais preservadas e frase padrão de foto retirada somente da apresentação.
4. Barra inferior mobile sem a folga externa adicional, mantendo safe-area, conteúdo rolável e os botões existentes.
5. Instituições desktop com até cinco colunas e redução responsiva; altura automática, mesma altura por linha e nenhuma rolagem interna de tipos.
6. Fundo retangular dos contêineres de navegação desktop removido; oito botões preservados.
7. Foco de campos suavizado com indicação visível de teclado; select de status mantém valor/cor funcional; Field recebe aria-invalid quando existe erro real.
8. Atendimento mobile possui aria-pressed e seleção vermelha persistente, neutro quando não selecionado; envio, reabertura e edição da OS preservam attendance_type.

## Causas corrigidas durante a validação
- Tema Clean tinha regra mais forte para aria-pressed, substituindo o vermelho do atendimento. Ajustada prioridade somente dos dois botões mobile.
- CSS de cartões carregado de forma lazy ainda vencia o overflow novo. Regra específica da grade de Gastos agora prevalece, verificada com oito tipos reais na fixture.
- Na concorrência, o lookup comum de idempotência podia iniciar snapshot antes de aguardar locks da dívida. Um teste que remove somente os bloqueios incidentais de notificações reproduziu dois pagamentos de 5000 creditando 10000 sobre saldo de 7000. Lookup de cg_operations agora é uma leitura lockForUpdate; transação, distribuição, trilha e notificações existentes mantidas. Três rodadas isolando o ledger, uma com notificações e replay simultâneo passaram. Logs negativos foram preservados.
- Valor agregado da nova ação não pode usar o teto de uma única parcela: duas parcelas válidas de 100000000 centavos devem poder ser quitadas juntas. Limite da nova operação agora é o saldo efetivo calculado no servidor; teto por parcela dos cadastros e limites das operações antigas permanecem iguais. Teste de fronteira aprovado.
- Corrigido cancelamento de prévia para não deixar loading preso.

## Evidências finais
| Verificação | Resultado |
|---|---|
| PHP financeiro/regressão, SQLite isolado | 64 testes, 987 assertions, aprovados |
| PHP financeiro, MySQL 8.4 isolado | 52 testes, 721 assertions, aprovados |
| Concorrência MySQL REPEATABLE READ | ledger-only 3 rodadas, notificações e replay aprovados |
| Playwright final | 28 aprovados, zero reprovados |
| Frontend unitário | 51 aprovados, zero falhas/skip |
| Lint e TypeScript | aprovados |
| Build final | aprovado; avisos preexistentes de ícones resolvidos em runtime preservados |
| Sintaxe PHP e executor PowerShell | aprovados |
| Simulação de helpers de implantação PHP 8.2/Linux | sintaxe dos launchers, allowlist, troca atômica, rollback e90 por hashes e bloqueio de alias symlink aprovados |

Playwright final inclui os novos cenários de saldos/parcelas desktop/mobile, foco/erros, atendimento salvo/reaberto/editado, pagamentos rápidos de mês/parcial/total, falta de CSRF, duplo clique e resposta perdida/replay. Inclui regressões existentes de Gastos, divisão por valores, correções de compras, responsividade e isolamento de estilos ao abrir foto. Nenhuma suíte foi desabilitada. Falhas intermediárias de fixtures e CSS estão nos logs; resultado final está em .agents/FINAL_PLAYWRIGHT.log.

Logs principais: FINAL_LINT.log, FINAL_TYPECHECK.log, FINAL_UNIT.log, FINAL_BUILD.log, FINAL_PHPUNIT_MYSQL.log, REPRISE_PHPUNIT_FINANCIAL_FINAL.log, REPRISE_MYSQL_ledger.log, REPRISE_MYSQL_normal.log, REPRISE_MYSQL_replay.log e FINAL_PUBLICATION_SIMULATION.log, todos em .agents/.
Capturas inspecionáveis: output/oito-melhorias/parcelas-1366.png, parcelas-390.png, atendimento-mobile.png e instituicoes-desktop.png. São fixtures locais, nunca dados oficiais.

## Revisão de segurança e efeitos colaterais
- Rotas novas dentro do grupo auth/expense.access e middleware CSRF existentes; usuário sem acesso recebe 403, HTTP sem token recebe 419. Leituras novas no-store/private; nenhuma API financeira foi adicionada ao Service Worker/cache offline.
- Prévia/hash e saldo recalculados dentro da transação; um responsável não recebe crédito da parte do outro, nem de outra dívida. Falha na auditoria reverte toda a operação. Retentativa após gravação com resposta perdida reutiliza a mesma operação.
- Centavos inteiros, vencimentos com ano/mês/dia, compartilhamento desigual e descontos anteriores preservados.
- Nenhuma migration, alteração de schema, modelo, banco oficial ou emissão de documento foi feita. Nenhuma regra de OS/financeiro da empresa foi alterada.
- Diff de runtime restrito a controller/service/rotas de Gastos, consumidores JS correspondentes, CSS pedido e atributos de acessibilidade dos campos/atendimento. Layouts fora dos oito pontos não foram redesenhados; regressões de popup/foto passaram.
- Executor remoto exige flag de autorização, SHA do pacote, base e90 ativa, caminhos exatos, migrations byte a byte iguais, backup de quatro aliases salvo/validado no OneDrive e ACK antes de alterar aliases. Novos chunks são aditivos; colisões bloqueiam. Mantém .env/storage/upload via mesmos links privados. Não contém SQL/migrate/seed/reset/restore/deleção; não reseta OPcache compartilhado.
- Windows não permite symlink PHP nesta sessão: simulação foi executada em container Linux efêmero usando imagem local já existente, rede desativada, montagem somente leitura do diretório deploy, sem instalar ou mexer em serviços/projetos existentes. É teste dos helpers, não prova de funcionamento remoto/FPM/SSH.

## Arquivos de implementação
app/Http/Controllers/ExpenseControlController.php; app/Services/ExpenseControl.php; routes/api.php;
resources/js/expense-person-payment.tsx; expense-control-page.tsx; expense-control-mobile-summary.tsx; expense-summary-overview.tsx; main.tsx; app-shared.tsx; new-order-page.tsx;
resources/css/arl-eight-improvements-20261012.css.
Testes novos em tests/Feature/ExpensePersonPaymentTest.php, tests/e2e/eight-improvements*.ts, tests/e2e/expense-quick-payment*.ts e tests/support/expense-payment-*.php.
Preparação local/ativação em deploy/prepare-eight-improvements-package.py, PUBLICAR-OITO-MELHORIAS.ps1, publish-eight-improvements.php e test-publication-helpers.php. Diretório deploy não entra no pacote de produção.

## Release e pendências
Pacote será produzido após o checkpoint de código final, com SHA256, CRC e hashes individuais verificados, vendor de produção reaproveitado da base e90 validada, assets Vite/OCR locais; sem .env, storage, uploads, bancos, node_modules, Git, testes, logs ou credenciais. A identificação exata será registrada no manifesto output/releases/ARL-OITO-MELHORIAS-<hash>.json.
Não houve ativação. Faltam confirmação expressa do proprietário, publicação do código local no GitHub se autorizada, execução do preflight/ativação remotos e smoke autenticado real, sem criar pagamentos fictícios. Não prometer CI GitHub verde sem executar a CI remota; esta validação é local.
Rollback deve voltar ao e90 preservado, restaurando quatro aliases e ponteiro, sem restaurar SQL ou apagar dados. O executor anterior e90, cujo rollback retorna à release 970, NÃO deve ser usado para esta nova release.

## Pacote final verificado
Fonte do pacote: c9ded0e0458d25091156eb0bd084ad20a05fa7b4, branch codex/oito-melhorias-20261012.
Pacote: output/releases/ARL-OITO-MELHORIAS-c9ded0e0458d.zip — 37.683.480 bytes, 7.856 arquivos.
SHA256: f5d6f455aeb4a4754f85acf921514eb04c24aab1c1681dc8a9d7ddd80bfee117.
CRC e hashes individuais aprovados. Varredura independente sem .env, banco/dump, storage/uploads, Git, node_modules, diretórios de testes/docs/deploy ou logs. Vendor de produção sem dependências de desenvolvimento reaproveitado do pacote e90 com SHA previamente validado.
Executor -ValidarLocal aprovado; chamada sem autorização recusada antes de SSH. Nenhuma conexão à KingHost foi feita. Log: .agents/FINAL_EXECUTOR_LOCAL.log.

Comandos exclusivamente para a cópia isolada:
    pwsh -NoProfile -File deploy/PUBLICAR-OITO-MELHORIAS.ps1 -PacoteRelatorio output/releases/ARL-OITO-MELHORIAS-c9ded0e0458d.json -ValidarLocal

SOMENTE APÓS CONFIRMAÇÃO EXPRESSA de envio do código e ativação:
    git push origin codex/oito-melhorias-20261012
    pwsh -NoProfile -File deploy/PUBLICAR-OITO-MELHORIAS.ps1 -PacoteRelatorio output/releases/ARL-OITO-MELHORIAS-c9ded0e0458d.json -AutorizarPublicacao

A ação autorizada criará diretório privado exclusivo, enviará/verificará pacote, preservará .env/storage, conferirá migrations iguais, salvará quatro aliases atuais no OneDrive e validará seu backup antes de alterações; acrescentará somente assets sem colisão, ampliará a allowlist dos launchers mantendo e90 ativo até FPM confirmar, trocará manifest/ponteiro sob lock e executará smoke não autenticado. Sem executar cron, migration ou escrita de dados financeiros. Senha somente no prompt SSH nativo.
Riscos restantes de hospedagem (permissões, extensão ZIP, quota, latência/OPcache ou mudança remota após e90) são gates que bloqueiam a execução; não foram testados em produção. Pode haver indisponibilidade breve durante o lock/troca; falha após alteração tenta recuperar ponteiro e aliases e90. Perda da sessão também exige conferir o relatório e o estado real antes de repetir; não reexecutar a publicação cegamente sobre staging existente.

Rollback manual, só quando autorizado e usando relatório real da execução:
    pwsh -NoProfile -File deploy/PUBLICAR-OITO-MELHORIAS.ps1 -PacoteRelatorio output/releases/ARL-OITO-MELHORIAS-c9ded0e0458d.json -AutorizarPublicacao -Reverter -Resultado 'CAMINHO_DO_RELATORIO_REAL.json'
Restaura somente ponteiro/aliases e90 por hashes; mantém banco, uploads e código anterior. Não fazer merge, restaurar SQL ou excluir arquivos. Smoke autenticado deverá verificar navegação/dados existentes após ativação, sem pagamentos fictícios.

## Publicação autorizada pelo proprietário
O proprietário respondeu "pode" ao pedido de push da branch e staging/ativação na KingHost. Autorização válida para esta missão, sem merge ou migrations. Primeiro push de 4867916 concluído.
Antes de ativar, a conferência da mesma regra de CI (Pint completo) apontou formatação em testes e helpers de implantação. Corrigida apenas formatação; nenhum arquivo de runtime mudou semanticamente. Pint completo passou, 52 testes financeiros/721 assertions passaram e helpers Linux foram revalidados. Logs PUBLICACAO_PHP_STYLE_COMPLETO_CORRIGIDO, PUBLICACAO_PHP_REGRESSAO e PUBLICACAO_HELPERS_REVALIDADOS preservados. Um pacote atualizado será produzido para vincular a release ao novo checkpoint; c9ded0e permanece apenas candidato histórico, sem ativação.
A CI remota completa também será conferida antes de ativar. Não pedir autorização novamente para as mesmas ações já autorizadas. Senha apenas no prompt nativo SSH.
