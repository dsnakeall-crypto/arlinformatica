# Deploy KingHost / hospedagem compartilhada

Este roteiro serve para KingHost, outro *shared hosting* ou VPS. Limites de disco, upload e cron devem ser conferidos no plano contratado; não há limite comercial codificado no sistema. A aplicação não foi validada dentro de uma conta KingHost real.

## 1. Preparar hospedagem e banco

1. Selecione **PHP 8.2 ou superior** com PDO MySQL, mbstring, OpenSSL, tokenizer, XML, ctype, JSON, fileinfo, GD ou Imagick e ZIP. `proc_open`/shell não é necessário para o backup.
2. Crie um banco MySQL/MariaDB e um usuário exclusivo com senha forte. Guarde nome, host, porta, usuário e senha fora do Git.
3. Aponte domínio/subdomínio e habilite HTTPS. O document root deve ser a pasta `public/` do Laravel.
4. Se o painel não permitir trocar o document root, coloque o projeto fora da pasta pública e copie apenas o conteúdo de `public/` para a pasta web. Ajuste os caminhos de `vendor/autoload.php` e `bootstrap/app.php` em `index.php`. Nunca copie `.env`, `storage`, `.git` ou backups para a web.

## 2. Gerar e enviar a release

O GitHub é a fonte oficial. Há três opções seguras:

- Git/SSH disponível: faça checkout do commit/tag de release em uma pasta nova;
- CI: gere um pacote de release sem `.env`, `.git`, `node_modules`, testes nem arquivos privados, mas com `public/build`, código, migrations e `vendor` quando Composer não existir no servidor;
- sem Git/SSH: envie esse mesmo pacote pronto por SFTP/FTP. Não use o PC como fonte definitiva nem envie arquivos privados da produção.

Em ambiente com rede, execute:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
npm ci
npm run typecheck
npm run build
```

Node é usado somente no build; não fica em execução na hospedagem. Se `vendor` for gerado no CI/local, use a mesma versão/plataforma PHP da produção.

## 3. Configurar `.env`

Copie `.env.example` para `.env` **somente no servidor**, execute `php artisan key:generate` uma vez e configure:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://seu-dominio.example
APP_TIMEZONE=America/Sao_Paulo
APP_COMMIT=sha-do-commit-publicado
DB_CONNECTION=mysql
DB_HOST=host-informado-pela-hospedagem
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
QUEUE_CONNECTION=sync
BACKUP_AUTOMATIC=true
BACKUP_FREQUENCY=daily
BACKUP_RETENTION=7
BACKUP_MAX_UPLOAD_KB=512000
```

`QUEUE_CONNECTION=sync` evita depender de Supervisor. Ajuste o limite de backup à capacidade real e confira `upload_max_filesize` e `post_max_size`; ambos precisam aceitar o mesmo tamanho. Dê escrita ao usuário PHP somente em `storage/` e `bootstrap/cache/`. Fotos, PDFs e backups permanecem no disco privado; `storage:link` não deve publicá-los.

## 4. Primeira instalação e cron

```bash
php artisan migrate --force
php artisan arl:install
php artisan optimize
```

Nunca execute `migrate:fresh` em produção. Configure um cron a cada minuto (troque caminhos conforme o painel):

```cron
* * * * * cd /caminho/do/app && /usr/local/bin/php artisan schedule:run >> /caminho/privado/scheduler.log 2>&1
```

O scheduler grava heartbeat a cada minuto, verifica pós-venda e executa `backup:run` diário, semanal ou mensal. Teste com `php artisan scheduler:heartbeat`, `php artisan backup:run --force` e confira **Configurações > Sistema e Diagnóstico**. Não é necessário daemon permanente.

## 5. VAPID e Web Push

HTTPS é obrigatório fora de `localhost`. Em uma máquina com Composer/Packagist disponível, adicione e valide `minishlink/web-push` com PHP 8.2, commitando juntos `composer.json` e `composer.lock`. O ambiente desta entrega recebeu HTTP 403 do Packagist; nenhum lockfile foi inventado e o diagnóstico manterá Push como não configurado enquanto a biblioteca não existir.

Depois, gere as chaves com a ferramenta documentada pela biblioteca e configure somente no `.env`:

```dotenv
VAPID_SUBJECT=mailto:administracao@seu-dominio.example
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Nunca envie a chave privada ao frontend/API/Git. Confirme `/manifest.webmanifest`, `/sw.js`, inscrição explícita do navegador e o teste individual no Diagnóstico. “Aceito pelo serviço Push” não prova exibição em iPhone/Android; valide dispositivos reais separadamente.

## 6. Atualização segura e rollback

1. Crie, baixe e valide um backup em **Backup e Restauração**.
2. Prepare uma pasta/release nova e preserve o `.env` e `storage` privados atuais.
3. Se houver uma janela segura, rode `php artisan down`; em hosting onde isso prejudique o acesso/rollback, use troca atômica de pasta sem `down`.
4. Publique os arquivos, rode `php artisan migrate --force`, `php artisan optimize` e `php artisan up`.
5. Teste login, banco, migrations, escrita privada, fotos, PDFs, backup, heartbeat, HTTPS, PWA e Push no Diagnóstico.

Se falhar, preserve logs e o backup de segurança, volte o código ao release/commit anterior e reverta migration somente quando ela tiver um `down()` comprovadamente seguro. Para perda/corrupção de dados, valide o manifesto antes de restaurar pela interface; a restauração cria outro backup de segurança. Nunca apague o banco atual antes de possuir cópia verificada.
