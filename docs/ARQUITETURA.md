# Arquitetura e decisões

## Visão geral

Monólito modular Laravel 12/PHP 8.2 com API autenticada por sessão e SPA React/TypeScript compilada pelo Vite. O artefato estático é servido pelo PHP/Apache: Node não participa da produção. MySQL/MariaDB é o banco oficial e o SQLite pode ser usado nos testes.

Os módulos são **Identidade**, **Clientes**, **Catálogo**, **Ordens**, **Documentos**, **Financeiro**, **Pós-venda**, **Configurações**, **Backup/Recuperação**, **Diagnóstico** e **Auditoria**. Regras críticas vivem em serviços de domínio transacionais; policies e middleware aplicam autorização no servidor.

## Histórico e concorrência

- O contador de OS é travado com `SELECT … FOR UPDATE`; o índice único é a última barreira contra clique duplo.
- Dados usados numa OS são copiados para snapshots JSON imutáveis.
- Status operacional e pagamento são entidades separadas.
- Uma OS concluída é protegida contra exclusão; correções de documentos criam revisões.
- Catálogo, modelos e cadastros referenciados são desativados/soft-deleted, nunca usados para reescrever o passado.
- Dinheiro é armazenado em centavos (`BIGINT`), evitando erro de ponto flutuante.

## Arquivos e segurança

Uploads ficam no disco privado. Fotos são decodificadas, orientadas e reamostradas no servidor, sem EXIF, até no máximo 100 KB. Downloads exigem policy ou URL assinada. Senhas usam o hasher do Laravel; login tem rate limit; todas as mutações usam CSRF, Form Requests, transações e auditoria.

## Frontend e mobile first

A responsividade é **mobile first**: o layout base deve funcionar em viewport estreito e expansões devem preferir `@media (min-width: ...)`. Controles operacionais precisam manter área de toque adequada e nenhum elemento invisível pode extrapolar sua própria hitbox.

Nos atalhos de atendimento externo, a grade nasce com uma coluna, passa a duas a partir de 360 px e a cinco a partir de 720 px. WhatsApp, Maps, Foto, Status e Finalizar têm altura mínima de 48 px. O `input[type=file]` da Foto fica absolutamente contido no próprio botão, impedindo que intercepte o clique de controles vizinhos.

O Playwright deve validar o clique real. Não usar `force: true`, clique JavaScript ou retries para esconder sobreposição. O teste mobile mede as caixas dos cinco atalhos e falha se houver interseção física entre elas.

## Produção compartilhada

O document root aponta para `public/`. `storage` fica fora da web e gravável pelo PHP. Scheduler é acionado por cron; rotinas de pós-venda também fazem *catch-up*. Backups possuem manifesto, checksum e versão do schema. Veja `docs/KINGHOST_DEPLOY.md`.

## Pós-venda, notificações e PWA

`PostSaleService` concentra as regras idempotentes: somente conclusão com `repair_completed`, elegibilidade após cinco dias, trava pessimista no cliente e apenas um ciclo ativo. Uma nova conclusão separada por pelo menos 60 dias arquiva exclusivamente o ciclo anterior. As três ações preservam mensagem, usuário e horário de confirmação; abrir WhatsApp nunca confirma envio.

Notificações internas são individuais, possuem chave de deduplicação e continuam sendo a fonte primária. `WebPushService` usa `minishlink/web-push` v11, versionado em `composer.json` e `composer.lock`, envia somente payload mínimo e remove inscrições apenas quando o provedor confirma expiração. A chave VAPID privada permanece exclusivamente no `.env`; VAPID real e a entrega em Android/iPhone físico ainda exigem homologação no ambiente HTTPS.

## Homologação e release

O Playwright usa SQLite descartável, migrations e seed E2E próprios, inicia o Laravel localmente e encerra o servidor com o runner. A CI separa backend, frontend e navegador. Playwright permanece com `retries: 0`. O workflow manual de release repete lint, testes e build e publica um artefato identificado pelo commit, com `vendor` e `public/build`, excluindo ambiente, banco, dados privados, testes e `node_modules`.

## Backup, restauração e diagnóstico

`BackupService` cria um ZIP privado e portátil sem shell: tabelas são serializadas em JSON, arquivos privados são copiados sem backups aninhados, `.env` ou PHP, e `manifest.json`/`checksums.json` autenticam cada componente com SHA-256. O checksum do ZIP fica na tabela `backups`. O formato 1 funciona em SQLite para CI e em MySQL/MariaDB sem fingir que os dumps dos drivers são iguais.

O upload apenas valida e cadastra; a restauração exige a frase forte, cria antes um backup de segurança protegido, revalida o arquivo, restaura o banco em transação e só então os arquivos. Banco e filesystem não compartilham uma transação atômica única: o banco é restaurado dentro da transação do SGBD e o snapshot de arquivos é aplicado depois; o backup de segurança preservado é o ponto operacional de recuperação caso haja falha entre essas fases. Entradas absolutas, `..`, drive letter, byte nulo e PHP são recusados. As rotas de criação, download, remoção, restauração e teste Push são exclusivas de Master.

O scheduler atualiza um heartbeat persistente a cada minuto e executa `backup:run` na frequência configurada, sem worker residente. A retenção remove somente backups automáticos prontos e desprotegidos. `DiagnosticService` testa consulta ao banco, latência, migrations, escrita/limpeza de arquivo temporário, espaço, PWA, HTTPS, fila, Push, backup e heartbeat sem retornar host, usuário, senha ou chave privada.

## Etapa 10 — fechamento funcional

A preferência de experiência (`automatic`, `desktop` ou `mobile`) é local ao navegador/dispositivo e não integra snapshots empresariais. O Painel consome a listagem paginada real de OS com resumo operacional; a Mesa de Chamados usa o endpoint dedicado `/orders/desk`, sem paginação, para garantir todas as OS abertas. A configuração de backup automático passou do `.env` para `settings`, com auditoria; o cron continua sem worker permanente e lê essa preferência persistida a cada execução do scheduler.

Quando uma finalização usa orçamento aprovado, o navegador envia o `approved_budget_id`, mas o servidor volta ao banco, valida vínculo/status/uso e reconstrói preço, quantidade e garantia a partir de `budget_items`. O browser não é fonte autoritativa de valores financeiros desse orçamento.

O Financeiro carrega Visão Geral e Caixa Diário independentemente do relatório mensal. Mensal/Relatórios são consultados sob demanda; uma falha nessa consulta não deve tornar o restante do Financeiro indisponível.

A restauração privada trata o ZIP como snapshot do domínio gerenciado: valida todas as entradas, extrai em staging e remove somente arquivos gerenciados posteriores ausentes no snapshot. Backups, staging de recuperação, `storage/framework`, logs, `.env`, PHP e arquivos fora do domínio gerenciado permanecem intocados.
