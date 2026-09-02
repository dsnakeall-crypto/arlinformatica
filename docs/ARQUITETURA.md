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

## Produção compartilhada

O document root aponta para `public/`. `storage` fica fora da web e gravável pelo PHP. Scheduler é acionado por cron; rotinas de pós-venda também fazem *catch-up*. Backups possuem manifesto, checksum e versão do schema. Veja `docs/KINGHOST_DEPLOY.md`.

## Pós-venda, notificações e PWA

`PostSaleService` concentra as regras idempotentes: somente conclusão com `repair_completed`, elegibilidade após cinco dias, trava pessimista no cliente e apenas um ciclo ativo. Uma nova conclusão separada por pelo menos 60 dias arquiva exclusivamente o ciclo anterior. As três ações preservam mensagem, usuário e horário de confirmação; abrir WhatsApp nunca confirma envio.

Notificações internas são individuais, possuem chave de deduplicação e continuam sendo a fonte primária. `WebPushService` é um complemento tolerante a falhas: usa a implementação padrão `minishlink/web-push` quando instalada, envia somente payload mínimo e remove inscrições apenas quando o provedor confirma expiração. A chave VAPID privada permanece exclusivamente no `.env`. A instalação da biblioteca não foi versionada nesta entrega porque o Packagist respondeu HTTP 403 e não seria seguro criar um `composer.lock` manual; até a dependência ser adicionada em ambiente com acesso, o diagnóstico informa “não configurado” e a central interna segue operacional.

## Backup, restauração e diagnóstico

`BackupService` cria um ZIP privado e portátil sem shell: tabelas são serializadas em JSON, arquivos privados são copiados sem backups aninhados, `.env` ou PHP, e `manifest.json`/`checksums.json` autenticam cada componente com SHA-256. O checksum do ZIP fica na tabela `backups`. O formato 1 funciona em SQLite para CI e em MySQL/MariaDB sem fingir que os dumps dos drivers são iguais.

O upload apenas valida e cadastra; a restauração exige a frase forte, cria antes um backup de segurança protegido, revalida o arquivo, restaura o banco em transação e só então os arquivos. Entradas absolutas, `..`, drive letter, byte nulo e PHP são recusados. As rotas de criação, download, remoção, restauração e teste Push são exclusivas de Master.

O scheduler atualiza um heartbeat persistente a cada minuto e executa `backup:run` na frequência configurada, sem worker residente. A retenção remove somente backups automáticos prontos e desprotegidos. `DiagnosticService` testa consulta ao banco, latência, migrations, escrita/limpeza de arquivo temporário, espaço, PWA, HTTPS, fila, Push, backup e heartbeat sem retornar host, usuário, senha ou chave privada.
