# Resultado da atualização ARL — 11/10/2026

## Escopo e segurança

Missão única de documentos, backups, segurança, estabilidade e validação da PR #59. A autorização desta missão permite commits organizados e push; não permite merge, publicação ou acesso à produção. KingHost, banco oficial e dados de clientes não foram acessados.

Backup anterior às alterações: `C:/Users/Allan/ARL-backups/missao-final-20261011-165852`. Foram conferidos 11.549 arquivos por SHA-256, sem divergências, e o bundle Git com 83 referências foi validado. O diretório contém workspace, patches, status, manifesto e histórico. Dependências reinstaláveis foram disponibilizadas somente na cópia externa de validação.

As alterações preexistentes de `AGENTS.md`, a seção anterior de `CHECKLIST_FINAL.md` e os arquivos não rastreados foram preservados. Conferência posterior: 11.547 arquivos comparados; nenhuma alteração inesperada após separar os arquivos desta missão. Um log bloqueado foi lido com compartilhamento de leitura e também corresponde ao backup. Evidência: `preservation-confirmed.json` no backup.

## Correções

- **PDFs:** lock por OS, criação exclusiva de arquivo, rejeição de revisão/arquivo já existente, verificação de tamanho e SHA antes de registrar. Orçamentos e finalizações agora incluem a emissão no mesmo bloco transacional das operações de negócio: falha de renderização reverte o conjunto.
- **Rollback:** compensação registrada também nos níveis externos. Uma compensação que falha não impede as demais nem a limpeza do gerenciador Laravel; seu erro é propagado depois dessa limpeza e registrado. Arquivo com hash inesperado é preservado para inspeção.
- **Download:** transmite os mesmos bytes cujo SHA foi validado, evitando reabrir um arquivo que poderia ser substituído antes do envio. Nome, disposição inline, tamanho e cache privado foram preservados.
- **Revisões:** substituição conserva o fluxo aprovado e cria cópia privada durável do PDF original e metadados antes de remover o caminho substituído. Crash real foi ensaiado. As cópias de recuperação não recebem limpeza automática.
- **Inspeção:** `php artisan arl:documents:integrity` informa arquivos ausentes, hashes divergentes, órfãos e cópias de recuperação. Não altera nem apaga registros/arquivos; retorna erro quando encontra anomalias. Arquivo pending não é considerado automaticamente abandonado.
- **Backup:** tabelas exportadas no mesmo snapshot; MySQL/MariaDB exigem InnoDB e leitura REPEATABLE READ independente. Contagens vêm das linhas exportadas, sem um COUNT posterior divergente. Referências de fotos/documentos/notas e SHA/tamanho aplicável são verificados.
- **Restauração:** valida arquivo ZIP, checksums, entradas duplicadas, caminhos, relações e referências privadas; verifica FKs explicitamente antes de aplicar arquivos. Falha aciona rollback SQL e compensação por safety verificado. Journal, safety e staging necessários à recuperação são preservados em falhas persistentes.
- **Safety:** quando o estado atual já está corrompido, a cópia de segurança recebe `recovery_only` e diagnóstico. Permite compensar a tentativa de recuperar um backup bom, mas não pode ser selecionada como backup normal. Journals incompletos suspendem retenção; safety corrompido não substitui quatro pontos íntegros.
- **Controle de Gastos:** usar configuração em cache não renova sua idade. Após expirar, navegação revalida a API. Nenhum JSX, CSS, layout ou cálculo financeiro foi alterado.
- **Release:** lint e testes unitários adicionados ao workflow de release. Exemplo de ambiente e guia de hospedagem alinhados à retenção de quatro pontos já definida no aplicativo. README passa a identificar a PR #59, preservando o registro histórico da PR #11.

## Evidências e validações

Todas as execuções usam a cópia externa `validation`, processos ocultos, prioridade reduzida e Playwright headless. SQLite e armazenamento privados são descartáveis. MySQL 8.4.9 foi iniciado exclusivamente para esta missão em `127.0.0.1:33458`, schema `arl_final_test`; nenhuma conexão de testes usa o banco oficial.

| Verificação | Resultado |
| --- | --- |
| PHP completo SQLite, código final | 375 testes / 7.142 asserções aprovados |
| Documentos, compartilhamento, reabertura, tamanhos PDF | 36 testes / 343 asserções aprovados |
| Backups e regressões dirigidas | 40 testes / 192 asserções aprovados antes dos ajustes de isolamento da suíte MySQL |
| Lint / TypeScript / build final / Pint integral | Aprovados |
| Unitários frontend | 51 aprovados, zero skips |
| Auditorias npm/Composer de produção | Zero vulnerabilidades/advisories reportados |
| Playwright dirigido: expiração/revalidação da configuração | Aprovado, API real e relógio controlado |
| PHP completo MySQL, código final | 375 testes / 7.142 asserções aprovados |
| HTTP documental real concorrente e repetido | Quatro processos PHP: quatro respostas 200/PDF idênticas, um registro, SHA arquivo/banco/respostas igual; repetição estável |
| E2E integral | 260 cenários em execução; conclusão será registrada antes da entrega |

Logs e hashes das fontes ficam no backup: `php-sqlite-release.log`, `php-mysql-release.log`, `documents-focused-final.log`, `http-concurrent-final.log`, `http-concurrent-fixture/http-results.json`, `build-release.log`, `lint-confirmed.log`, `typecheck-final.log`, `unit-final.log`, `pint-release.log`, `sources-release.json`. Os avisos Vite sobre ícones estáticos foram conferidos: os arquivos existem na entrega após o postbuild.

Reproduções preservadas: três falhas iniciais de backup (contagem divergente, cópia false ignorada, payload sem checksum); crash após remoção do PDF anterior; compensação falhando antes de outro callback; troca de bytes entre construção e envio da resposta. Nenhum teste foi desativado e nenhum timeout foi aumentado.

Falhas intermediárias foram tratadas: concorrência indevida entre duas execuções PHP no mesmo Storage fake; fixture de DatabaseReset com SHA fictício incompatível com o arquivo; listener SQL específico de SQLite; vazamento de fixtures do teste concorrente para a suíte MySQL. Foram corrigidos isolamento/dados de teste, preservando as asserções e a rejeição de corrupção.

## Agentes e revisão

Três subagentes reais, sem edições simultâneas no mesmo arquivo: `documentos_final` (backend/segurança documental), `backups_final` (banco, backup e recuperação), `validacao_final` (testes/CI e revisão independente). O coordenador integrou controladores, cache, workflows, fixtures, documentação e validação completa. Foram consultados os perfis do projeto e as auditorias B1; não foram copiados cegamente os patches experimentais.

A revisão independente verificou locks, integridade, tratamento de falhas, retenção, fontes/destinos e o fluxo real de rollback do Laravel. A alteração do cache não modifica componentes visuais; as fórmulas financeiras, permissões e rotas aprovadas continuam cobertas pelas regressões.

## Arquivos da missão

`app/Services/DocumentService.php`, `app/Services/ReplacedFinalDocumentService.php`, `app/Services/BackupService.php`, `app/Console/Commands/CheckDocumentIntegrity.php`, `app/Http/Controllers/DocumentController.php`, `app/Http/Controllers/BudgetController.php`, `app/Http/Controllers/FinalizationController.php`, `tests/Feature/DocumentIntegrityTest.php`, `tests/Feature/BackupConsistencyTest.php`, `tests/Feature/BackupSnapshotIsolationTest.php`, `tests/Feature/DatabaseResetTest.php`, `tests/Feature/ServiceOrderReopenTest.php`, `tests/support/document-crash-worker.php`, `resources/js/expense-control-page.tsx`, `tests/e2e/expense-configuration-cache.spec.ts`, `.github/workflows/release.yml`, `.env.example`, `docs/KINGHOST_DEPLOY.md`, `README.md`, a nova seção de `CHECKLIST_FINAL.md` e este relatório.

## PR, CI e limites para publicação

[PR #59](https://github.com/dsnakeall-crypto/arlinformatica/pull/59), branch `prepublicacao/mobile-ci-20261011`. Commits enviados: `8aaca6b` (documentos), `53db0b1` (backups) e `e90f11f` (cache/release). A CI verde do commit inicial `732afb7` não comprova as novas alterações. A [CI do código atualizado](https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38172317405), SHA `e90f11fea20839e573df7a40d67489301dbcaad7`, está em execução; não foi feito merge ou deploy.

Banco e filesystem não possuem transação atômica conjunta. As exceções tratadas foram ensaiadas; interrupção abrupta pode exigir recuperação manual autorizada pelos journals e cópias privadas. A restauração deve ocorrer em janela de manutenção, sem gravações de negócio concorrentes. Não foi introduzido bloqueio global em todos os módulos nem prometida recuperação automática de crash.

Continuam exigindo autorização e validação no ambiente de destino: backup oficial restaurável, disponibilidade de espaço para cópias de recuperação, compatibilidade PHP/MySQL/MariaDB da hospedagem, plano de rollback e smoke test da implantação. Não foram realizadas essas operações remotas. Nenhuma mudança de layout ou autorização foi feita para resolver divergências de política da auditoria: o recurso opcional existente de melhoria de texto via OpenAI merece decisão do proprietário conforme AGENTS; nenhum serviço pago foi invocado nesta missão.

**Conclusão provisória: NÃO APTA PARA PUBLICAÇÃO enquanto as validações finais e os gates operacionais acima não estiverem comprovados. Não publicar.**
