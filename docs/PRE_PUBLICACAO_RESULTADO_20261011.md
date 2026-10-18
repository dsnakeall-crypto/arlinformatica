# ARL Informática — Pré-publicação (11/10/2026)
STATUS: CANDIDATO TÉCNICO — PUBLICAÇÃO BLOQUEADA. Nenhum deploy realizado.

## Concluído e comprovado
- Auditoria npm e Composer: sem avisos altos/críticos reportados. Lint, TypeScript, testes frontend 51/51 e build passaram.
- MySQL 8.0.46, isolado em DDEV: inseridos 30.000 clientes, 60.000 OS e 30.000 pagamentos fictícios. Consultas simples/índices verificados; não equivale às queries complexas reais.
- MySQL 8.0.46 isolado: 48 migrations REAIS do Laravel aplicadas com êxito do zero; 64 tabelas e users.expense_control_access confirmada. Nenhuma migration no oficial.
- Pacote CANDIDATO gerado do worktree atual: output/releases/ARL_CANDIDATO_LOCAL_20261011.zip, 37.282.384 bytes. Conteúdo 8.923 entradas; 440 arquivos fonte com SHA256 verificado. Sem .env, bancos, dumps SQL, logs, arquivos privados, testes ou docs. Composer vendor sem dependências de desenvolvimento incluído.
- SHA256 ZIP: F3C86B60C583A7FD0129CEFBBA349AF6FB1712D1A55F6C49C25FC8B115E6F48C.
- Suite PHP FINAL: 343/343 testes, 6.918 verificações, aprovada novamente com APP_ENV=testing e SQLite em memória explicitamente definidos. Log docs/PRE_PUBLICACAO_PHP_FINAL_APROVADO_20261011.log.

## Bloqueios atuais para homologação
1. E2E mobile integral nesta rodada: 18 passaram, 10 falharam, 3 não executados por timeout global. Parte dos testes assume menus/seletores antigos; outras falhas no Controle de Gastos precisam ser isoladas. Evidência docs/PRE_PUBLICACAO_MOBILE_20261011.log e traces em test-results/.
2. As falhas PHP HTTP 419 intermediárias foram de configuração do comando de teste e foram resolvidas fixando APP_ENV=testing e SQLite em memória. Não há pendência de suíte PHP nesta rodada.
3. Banco OFICIAL da KingHost não acessado; versão exata MySQL/MariaDB e versão PHP da conta não conferidas. Documentação local indica /usr/bin/php82 para acesso SSH; dependências do candidato foram instaladas em Windows/PHP8.4. Recriar vendor final em Linux/PHP de destino antes de upload.
4. Não foi feito backup REAL da KingHost nem restauração desse backup em staging. Testes de backup realizados somente em bases sintéticas locais. Exige autorização expressa para acessar/gerar backups remotos.
5. O Git tem muitas alterações locais e arquivos ainda não rastreados; workflow de release GitHub faria checkout de HEAD e deixaria essas alterações fora. Candidato local não é commit, tag ou versão publicável automaticamente.
6. Revisão de migrations: 2026_10_09_105900_add_simple_admin_expense_access adiciona coluna e faz updateOrInsert do papel Administrador Simples; seu down apaga a coluna. NÃO usar rollback de migrações automático. Em atualização de produção, preservar APP_KEY e dados criptografados existentes, nunca rodar key:generate, migrate:fresh, db:wipe ou reset.

## Passos finais, depois dos bloqueios resolvidos
- Atualizar/validar testes antigos contra o layout atual sem alterar visual aprovado.
- Reconciliar worktree e versão de release com aprovação do proprietário.
- Confirmar versão do banco, PHP, path de publicação, cron, SSL no ambiente KingHost em modo leitura.
- Explicar riscos e solicitar autorização explícita para backup do MySQL oficial e storage privado, verificar hash e restauração EM AMBIENTE SEPARADO.
- Preparar rollback com artefato anterior, integridade das fotos/PDFs e controle de migrações.
- Só depois autorizar deploy.

Nenhum dado oficial, servidor KingHost, produção, DNS ou cadastro foi modificado nesta rodada.
