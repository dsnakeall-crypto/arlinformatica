# Etapa B1.2 — Confirmacao real Laravel + MySQL 8.4 — 11/10/2026

## Ambiente e isolamento
- Aplicacao: copia de validacao `C:/Users/Allan/ARL-backups/etapa-a-20261011-141751/validation`, sem editar o projeto original.
- Banco MySQL 8.4.9 separado, iniciado em `127.0.0.1:33457`, datadir `C:/Users/Allan/ARL-backups/b1-2-mysql-isolated-20261011/data`, schema descartavel `arl_b1_disposable`. Nao foi usado o MySQL de trabalho (MySQL84) nem KingHost.
- Storage isolado `.../b1-2-mysql-isolated-20261011/storage`.
- `DocumentService::issue()` ORIGINAL invocado por dois processos PHP Laravel independentes usando um subclass apenas para `render()`, produzindo PDFs sinteticos e distintos. Nenhuma alteracao em DocumentService nem na fonte da aplicacao.
- `DB::listen` com barreira apos o SQL `exists` ordenou a concorrencia: A e B consultam ausencia, A insere primeiro, B grava arquivo e tenta inserir depois. Cada processo possui conexao MySQL independente.

## Resultado
- Processo A: `issue()` teve sucesso e persistiu registro original.
- Processo B: `issue()` sobrescreveu o mesmo caminho antes do INSERT, que falhou com `Illuminate\\Database\\UniqueConstraintViolationException` (MySQL 1062, ux_document).
- SHA-256 persistido no banco: `83d359d655836433a05ec99e3fbe903daf79d5a9e801df5455ad79ee62811a29`.
- SHA-256 do PDF gravado: `542788740e874bbe43ad439b2c8a1f37c90a9682e410edb94c2a88ec428f5099`.
- **DIVERGENCIA CONFIRMADA NO SERVICO REAL**: metadado/registro da emissao A nao corresponde ao arquivo apos emissao B. O teste utiliza renderizacao sintética, nao DomPDF; contudo, o algoritmo de gravacao e insercao e exatamente o metodo real.
- Os dois processos finalizaram; instância MySQL isolada foi desligada com mysqladmin, exit=0. Dados temporarios preservados para auditoria externa.
- O projeto original, banco oficial, layouts e PR #59 nao foram alterados. Nao houve Codex, commit ou push.

## Proximo passo recomendado
Corrigir **atomicidade da emissao de documentos** em DocumentService: reserva unica antes da gravacao, locks/constraint e tratamento de falhas de escrita com arquivo temporario + estrategia segura de ativacao, sem sobrescrever revisoes emitidas e mantendo caminho/contratos existentes. Criar testes de concorrencia de integracao que falhem antes e passem depois; verificar 409/revisoes, hash, arquivo preservado em concorrencia, e rollback em falha de storage, SQLite/MySQL. Testes no workspace de validacao; so depois integrar alteracao minima ao projeto via autorizacao, validacao completa e CI.

## Limites
Teste intencionalmente orquestrado por barreiras via listener; nao mede probabilidade natural da corrida sob carga. Nao testou concorrencia completa do fluxo HTTP DocumentController nem integridade de backups (Etapas B2 e B3).
