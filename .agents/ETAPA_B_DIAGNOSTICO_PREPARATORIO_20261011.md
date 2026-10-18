# Etapa B — diagnostico inicial e matriz de provas (11/10/2026)
Base: PR #59 commit 732afb7. CI run 38161099634: backend, backend-mysql, frontend, E2E todos success apos reexecucao de E2E.
Escopo: apenas leitura e planejamento, sem acesso a producao, migrations, merge ou exclusao de dados.

## B1 — emissao concorrente de PDF
Evidencia fonte: app/Services/DocumentService.php issue(): render -> consulta exists -> Storage::disk('local')->put(caminho fixo) -> DB::table('generated_documents')->insert. Nao ha transacao/lock nesse metodo. A PK/UNIQUE no banco pode rejeitar um dos inserts, mas nao necessariamente impede sobrescrita previa do PDF no caminho fixo.
Chamadores encontrados: DocumentController::term, BudgetController, FinalizationController e TechnicalReportController. FinalizationController possui reserva em lock, portanto NAO atribuir a ele a mesma corrida sem nova prova.
Teste isolado necessario: dois processos de execucao simultanea com ordem artificial em barreira antes de Storage::put, em MySQL descartavel (nao SQLite memory entre processos); comparar bytes e SHA256 armazenado com arquivo final e assegurar uma unica revisao sem sobrescrita. Conferir documentos existentes e 409 para emissao repetida.
Correcao so apos reproducao: reserva unica com lock/constraint e escrita temporaria+rename exclusivo, tratando rollback e arquivos orfaos, garantindo compatibilidade dos caminhos antigos. Nao alterar historico.

## B2 — snapshot de backup durante gravacoes
Evidencia fonte: BackupService::create() percorre tabelas e executa get() e count() em consultas distintas, sem transacao de snapshot. Uma gravacao concorrente pode gerar manifest.counts diferente do JSON exportado e relacoes entre tabelas de instantes diferentes.
Testar com duas conexoes MySQL descartaveis em gravacao concorrente: clientes, OS, documentos, gastos; congelar em pontos controlados; validar arquivos JSON, contagens, FKs e saldos apos restore de copia. Nunca no MySQL oficial.
Tambem medir uso de memoria para tabelas sinteticas, pois ->get()->all() materializa tabela.

## B3 — falha intermediaria na restauracao
Evidencia previa: BackupService::restore grava banco e depois aplica arquivos, sem transacao conjunta garantida. Simular falha de filesystem apos fase de banco em ambiente descartavel; validar safety backup e procedimento manual/automatizado de restauracao anterior, sem perda de fotografias.
Examinar e preservar todos os testes existentes: StageEightTest, BackupDatabaseIsolationTest, ExpenseControlTest, ExpenseCardArtworkTest e testes de fornecedores.

## Guardrails e aceite
- Garantir backup local externo antes de qualquer mudanca, preservando AGENTS.md, CHECKLIST_FINAL.md e todos untracked.
- Nunca tocar em KingHost/banco real, nunca apagar dados.
- Nao fazer commit/push/merge/deploy sem etapa revisada; evitar mexer em layouts.
- Resultado exigido: defeito reproduzido ou risco limitado, diff minimo, testes concurrency e restore, PHP suite, E2E aplicavel, e CI.
- Os 8 perfis em .agents/roles sao guias; nao afirmar execucao de subagentes Codex se nao foram realmente invocados.
