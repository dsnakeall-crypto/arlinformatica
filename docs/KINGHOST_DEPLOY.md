# Deploy KingHost / hospedagem compartilhada

1. Selecione PHP 8.2+ com extensões PDO MySQL, mbstring, openssl, tokenizer, XML, ctype, JSON, fileinfo e GD/Imagick.
2. Crie banco e usuário MySQL/MariaDB com senha exclusiva. Copie `.env.example` para `.env`, use `APP_ENV=production`, `APP_DEBUG=false`, HTTPS e preencha o banco sem versionar segredos.
3. Execute `composer install --no-dev --optimize-autoloader`, `php artisan key:generate` e `php artisan migrate --force` por SSH ou em ambiente seguro antes do upload.
4. Execute `npm ci && npm run build` localmente/CI e envie `public/build`; não mantenha Node em execução.
5. Aponte o domínio para `public/`. Nunca exponha `.env`, `storage`, backups ou a raiz Git. Dê escrita ao usuário PHP somente em `storage/` e `bootstrap/cache/`.
6. Rode `php artisan storage:link` apenas para arquivos públicos; fotos e documentos da aplicação continuam no disco privado.
7. Configure o cron a cada minuto: `cd /caminho/do/app && php artisan schedule:run >> /dev/null 2>&1`. O scheduler executa `post-sale:check` de hora em hora, com bloqueio contra sobreposição; para diagnóstico, rode manualmente `php artisan post-sale:check`. Painel e Pós-Venda também executam catch-up leve com throttle de 10 minutos.
8. Habilite SSL, cookies `secure`/`http_only`/`same_site=lax`, teste login, upload, PDF, e-mail e limites PHP (`upload_max_filesize`, `post_max_size`, memória).
9. Configure GitHub Secrets no workflow de deploy. GitHub é a fonte; nunca edite produção como fonte definitiva.
10. Antes de migrar/restaurar, baixe um backup completo e valide checksum/manifesto. Após deploy rode `php artisan optimize` e verifique Sistema e Diagnóstico.


## PWA e Web Push

- HTTPS é obrigatório em produção (a exceção dos navegadores é apenas `localhost`).
- Gere um par VAPID fora do repositório e configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` somente no `.env`; nunca envie a chave privada ao frontend ou ao Git.
- Depois do deploy, confirme que `/manifest.webmanifest`, `/sw.js` e os ícones são servidos pelo domínio HTTPS sem redirecionamento para outro host.
- Cada navegador/dispositivo cria sua própria inscrição pelo botão explícito em Configurações. A permissão nunca é pedida automaticamente.
- A central interna é a fonte primária e continua operando sem VAPID, push, service worker ou permissão do navegador.
- Esta branch gerencia inscrições e recebimento no service worker. O envio PHP criptografado requer uma implementação Web Push compatível; ele permanece pendente até a dependência ser instalada e validada no ambiente de CI/produção.
