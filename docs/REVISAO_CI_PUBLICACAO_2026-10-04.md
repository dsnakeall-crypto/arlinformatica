# Revisão da CI e da publicação — 04/10/2026

## Diagnóstico

Os dois runs originalmente apontados pelo usuário, `37194498195` (código `3659849`) e `37195526823` (documentação `94794f7`), falharam na mesma expectativa do teste de histórico. Backend SQLite, backend MySQL e frontend passaram; o navegador terminou com 144 testes aprovados e um reprovado.

O histórico agrega todas as compras do período, incluindo as criadas pelos cenários anteriores no banco descartável. O teste exigia “Sem mudança” em novembro, apesar de os meses terem valores diferentes. A aplicação exibiu corretamente novembro de R$ 1.066,02 e redução de R$ 904,80 (-45,9%). A reprodução local com Controle de Gasto seguido de Histórico terminou com 12 aprovados e a mesma falha.

O commit `25b7d6d8d41745c37da1f24ba5a70000c2fdee00` corrige a expectativa: registra uma consulta anterior às compras de teste, verifica o acréscimo individual de R$ 125,00 em cada mês, R$ 375,00 no período e R$ 150,00 de antecipação individual, e confere valores, diferenças e percentuais no backend e na tela. A divisão e a identificação de Carol na compra quitada continuam verificadas.

Sua CI `37207673737` resolveu o histórico, mas encontrou um timeout diferente na navegação para pagamento parcial. A captura mostra Resumo ainda selecionado; o trace comprova que a classe do menu lateral mudou de expandido para `sidebar-collapsed` durante o clique. O teste tentou pesquisar antes de efetivamente entrar em Gastos.

O commit `a2ea9cbcecda53aa283a1aaaf4fae01be8879975` posiciona o ponteiro fora do menu, aguarda o estado recolhido ou fixado e confirma que Gastos foi selecionado antes de preencher a pesquisa. Mantém clique real, timeout original, zero retries e todas as verificações de quitação e saldo de Carol.

Não houve alteração no código de produção, cálculos financeiros, dependências ou migrations nestes dois commits. A reemissão da release associa os mesmos arquivos de execução ao commit cuja CI completa foi validada. Os runs antigos permanecem como histórico de falhas; não foram apagados ou disfarçados.

## Verificações locais

- 307 testes PHP em SQLite: 6.450 assertions, aprovados.
- 307 testes PHP em MySQL isolado `arl_ci_test_20261004`: 6.450 assertions, aprovados.
- 22 testes frontend, lint, TypeScript, Pint e build aprovados; npm audit de dependências de execução sem vulnerabilidades.
- 145 testes Playwright desktop/mobile aprovados localmente após a correção do histórico, sem retries.
- Após o ajuste do clique, 13 testes direcionados de Controle de Gasto/Histórico aprovados novamente.
- Pagamento parcial passou em três execuções adicionais independentes, cada uma recriando seu banco descartável; zero retries.
- A primeira tentativa de backend no clone isolado falhou por ausência da APP_KEY de teste; foi preparada a configuração fictícia apropriada e a execução completa passou. Nenhuma configuração privada de produção foi usada pelos testes.

Todos os testes usam clone e bancos descartáveis. As mudanças locais anteriores, incluindo `vite.config.ts`, caches, SQLs e arquivos não versionados, foram preservadas e não entram no pacote.

## Conferência do servidor em uso

Antes de qualquer troca, os 7.719 arquivos de execução da release `3659849` e 71 arquivos públicos passaram na comparação SHA-256. Os 88 arquivos privados preservados na publicação original também passaram. Foram verificadas 13 consultas reais do backend: usuário, navegação, OS/paginação/detalhe, clientes, fornecedores, financeiro, configuração/resumo/projeção/histórico e configuração da leitura por foto.

Também passaram busca de OS, lista de documentos, PDF final existente e foto existente. Funcionário simulado apenas em memória recebeu 403 para Fornecedores, Controle de Gasto e Usuários. APIs sem sessão retornaram 401 e `.env` retornou 403.

HTTPS de login, health, manifest do build, PWA, service worker e worker OCR retornou 200. Navegador real em produção, em 1.366px e 390px, mostrou login sem erros JavaScript ou overflow horizontal; capturas revisadas. As leituras autenticadas por SSH usam o kernel Laravel, usuário existente apenas em memória, sessão/cache temporários e transação revertida. Não substituem o login por senha real no navegador.

O servidor já tinha 54 OS nesta revisão, em comparação às 53 no término da publicação anterior; não foi restaurado um snapshot antigo sobre os novos registros. Nenhum cliente, OS, fornecedor, compra, dívida ou pagamento fictício foi criado na produção.

## Backups e pacote

Pasta externa: `C:/Users/Allan/ARL-backups/revisao-ci-20261004-104815`.

- `workspace.zip`, manifesto, diff, estado do checkout e bundle Git foram criados e verificados antes das edições.
- Backup protegido #9 de banco e arquivos privados foi criado sem aplicar retenção, baixado, validado pelo serviço e por CRC/SHA-256/checksums locais; 145 entradas verificadas. Código privado anterior, `.env` e entrypoints também foram baixados e validados. Backups anteriores preservados.
- Pacote de 7.720 arquivos, com 7.719 hashes de execução: `arl-informatica-a2ea9cbcecda53aa283a1aaaf4fae01be8879975.tar.gz`, SHA-256 `c39838cb5f6702e6478ee05f406b2857dfe606ce4e9a303bafbf2d688afd0741`.
- O conteúdo de execução e os assets são idênticos à release anterior; a diferença entre os commits foi conferida no Git. Pacote exclui `.env`, storage, dados, SQLs, backups, testes, node_modules e artefatos.
- Na primeira preparação privada, metadados PAX do tar preservaram caminhos antigos para nomes longos. A verificação recusou a release antes da ativação. O pacote foi corrigido e todos os hashes foram conferidos novamente; os arquivos da versão em uso permaneceram idênticos. A release privada intermediária `25b7d6d` não foi ativada.

## Aprovação final e ativação

CI do commit publicado: [run 37209022788](https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/37209022788), **success** nos quatro jobs: backend SQLite, backend MySQL, frontend e E2E. A execução completa no GitHub terminou com **145 testes de navegador aprovados**, sem retries.

Imediatamente antes da ativação, foi criado e validado novamente o backup protegido **#10**, baixado como `protected-backup-10.zip`: 12.869.377 bytes e 145 entradas com checksums verificados. `.env`, entrypoints e arquivo do código anterior também foram baixados novamente. Retenção automática não foi aplicada; backups anteriores permaneceram disponíveis.

Release ativa: `/home/arlinfocg/arl-informatica-a2ea9cbcecda53aa283a1aaaf4fae01be8879975`. O script de ativação consultou a API do GitHub e exigiu sucesso da CI para este SHA exato antes de permitir a troca. Foram conferidos `.env` (somente APP_COMMIT difere), storage compartilhado, backup, PHP, todos os hashes e ausência de migrations pendentes.

Os entrypoints `index.php` e `cron-scheduler.php` foram trocados por renomeação atômica durante uma janela breve de manutenção. Os assets públicos já idênticos foram verificados, sem substituição desnecessária. Autoload existente de produção foi preservado e caches foram recompilados. **Zero migrations aplicadas**; continuam 47 registradas.

Comparação por contagem e hash de todas as **64 tabelas**, antes/depois da ativação, confirmou registros idênticos. Permaneceram **626 clientes, 54 OS e 33 pagamentos**, incluindo a OS nova posterior ao deploy inicial. Não foi importado banco local, executado seed/reset ou restaurado backup por cima dos dados atuais.

Após a troca, foram verificados novamente 7.719 arquivos de execução, 71 públicos, **89 arquivos privados do backup #10**, 17 leituras funcionais com sucesso, três bloqueios de permissão para Funcionário, APIs protegidas sem sessão, HTTPS e login responsivo em 1.366px/390px sem erro JavaScript ou overflow. Index e wrapper de cron apontam para a nova release. Nenhuma chave, senha ou token foi alterado; não houve chamada paga à IA.

Rollback de código preparado em `/home/arlinfocg/deploy-backup-20261004-a2ea9cb`, com os entrypoints originais; a release `3659849` permanece disponível. Retorno pode restaurar os entrypoints por troca atômica, sem mexer no banco. A release privada intermediária `25b7d6d` permaneceu sem ativação. Evidências, manifests, snapshots por hash e logs estão na pasta externa de backup.

A documentação posterior registra estes resultados e não altera o pacote publicado. Seu commit usa `[skip ci]` somente para evitar repetir a mesma suíte por uma mudança exclusiva em Markdown; o commit de código efetivamente publicado tem a CI completa aprovada acima.

## Limites que permanecem

O cron da KingHost continua observado a cada cinco minutos fora do minuto zero; o ajuste para cada minuto no painel e a comprovação das tarefas horárias permanecem pendentes. Esta revisão não modificou agendamento, regras comerciais ou cron do provedor. Impressão física B21S, Push nos dispositivos, login com senha do proprietário e nova chamada paga à Mistral não fazem parte destas verificações.
