# Deploy KingHost / hospedagem compartilhada

1. Selecione PHP 8.2+ com extensões PDO MySQL, mbstring, openssl, tokenizer, XML, ctype, JSON, fileinfo e GD/Imagick.
2. Crie banco e usuário MySQL/MariaDB com senha exclusiva. Copie `.env.example` para `.env`, use `APP_ENV=production`, `APP_DEBUG=false`, HTTPS e preencha o banco sem versionar segredos.
3. Execute `composer install --no-dev --optimize-autoloader`, `php artisan key:generate` e `php artisan migrate --force` por SSH ou em ambiente seguro antes do upload.
4. Execute `npm ci && npm run build` localmente/CI e envie `public/build`; não mantenha Node em execução.
5. Aponte o domínio para `public/`. Nunca exponha `.env`, `storage`, backups ou a raiz Git. Dê escrita ao usuário PHP somente em `storage/` e `bootstrap/cache/`.
6. Rode `php artisan storage:link` apenas para arquivos públicos; fotos e documentos da aplicação continuam no disco privado.
7. Configure a cada minuto: `cd /caminho/do/app && php artisan schedule:run >> /dev/null 2>&1`.
8. Habilite SSL, cookies `secure`/`http_only`/`same_site=lax`, teste login, upload, PDF, e-mail e limites PHP (`upload_max_filesize`, `post_max_size`, memória).
9. Configure GitHub Secrets no workflow de deploy. GitHub é a fonte; nunca edite produção como fonte definitiva.
10. Antes de migrar/restaurar, baixe um backup completo e valide checksum/manifesto. Após deploy rode `php artisan optimize` e verifique Sistema e Diagnóstico.
