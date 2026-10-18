# B1.3 — Correcao experimental somente na copia isolada (11/10/2026)

## Escopo
- Arquivo modificado somente na copia externa: C:/Users/Allan/ARL-backups/etapa-a-20261011-141751/validation/app/Services/DocumentService.php.
- Original C:/laragon/www/arlinformatica/app/Services/DocumentService.php intacto. Nao houve Codex, Git commit, push, producao nem migracao.
- Nova versao experimental de issue(): transacao DB, SELECT ... FOR UPDATE da linha service_orders, verificacao de registro e de arquivo preexistente, escrita por stream, insert do documento e exclusao do novo arquivo se insert falhar. Mantido caminho/assinatura e comportamento de conflito 409.

## Prova obtida
- PHP syntax: OK.
- MySQL 8.4.9 descartavel em localhost:33457 com schema/arquivos exclusivos, dois processos Laravel reais invocando DocumentService::issue() ao mesmo tempo com render sintético diferente:
  - A: success.
  - B: HttpException 409, revisao existente.
  - SHA banco: 83d359d655836433a05ec99e3fbe903daf79d5a9e801df5455ad79ee62811a29.
  - SHA arquivo: 83d359d655836433a05ec99e3fbe903daf79d5a9e801df5455ad79ee62811a29.
  - Iguais: true.
- MySQL isolado desligado com mysqladmin exit 0.
- Antes da correcao, a reproducao com o mesmo servico havia dado divergencia SHA sob interleaving controlado.

## Limites importantes
- Teste de concorrencia posterior foi uma rodada simultanea sem barreira forcada e nao garante ausencia de outras corridas. Precisa teste repetido, teste deterministico em transacao e verificacao de portabilidade SQLite/MySQL.
- FALTA simular falhas de gravação, erro no INSERT, crash entre arquivo e commit e restauracao. Nao considerar pronto para merge/publicacao.
- A compensacao delete() apos erro de insert e somente proposta experimental; crash de processo no intervalo pode deixar arquivo orfao, que a checagem protege contra sobrescrita mas exige politica de reconciliacao.
- A dependencia do lock em service_orders deve ser conferida nos fluxos reais e transacoes pai (budget/finalization/term). Em especial evitar deadlocks em ordens de locks distintas.
- Nao foram rodados suite PHPUnit integral, Pint ou E2E.

## Proximo passo
Revisar projeto experimental e testar falhas/rollback, varias repeticoes de concorrencia e regressao em dados descartaveis antes de promover alteracao minima para fonte original por autorizacao nova.
