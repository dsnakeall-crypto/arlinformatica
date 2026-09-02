# ARL Informática

Sistema de gestão para assistência técnica, construído como monólito Laravel 12 + SPA React/TypeScript. O banco oficial é MySQL/MariaDB e o frontend compilado é estático, portanto produção não exige Node.js permanente. A arquitetura e as decisões de histórico estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Desenvolvimento local

Requisitos: PHP 8.2+, Composer, extensões PDO/SQLite ou MySQL, GD e Node 22+.

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
# ajuste DB_CONNECTION=sqlite e DB_DATABASE com o caminho absoluto no .env
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

Acesse `http://127.0.0.1:8000`. Não existe cadastro público. Crie o primeiro Master uma única vez com `php artisan arl:install`; o comando exige senha de pelo menos 12 caracteres, usa o hasher do Laravel e se bloqueia após a instalação.

## Verificações

```bash
composer test
vendor/bin/pint --test
npm run typecheck
npm run build
npm run test:e2e
```

O E2E usa SQLite descartável, migrations/seeds e servidor Laravel local. Instale o Chromium uma vez com `npx playwright install chromium`. O Playwright permanece com `retries: 0`: falha deve ser investigada e corrigida, não mascarada por repetição automática. O workflow manual **Preparar release** gera o pacote de produção sem secrets nem dados privados.

## Produção

Nunca publique `.env`, banco, backups, fotos ou PDFs. O document root é `public/`; use HTTPS. Compile assets antes do upload. O guia detalhado para hospedagem compartilhada está em [`docs/KINGHOST_DEPLOY.md`](docs/KINGHOST_DEPLOY.md).

## Estado

A `main` está estável até a Etapa 9, mergeada pela PR #10 no commit `558a520421c8f290b970dcbc50ff03f2b1161784`, com backend, frontend e E2E verdes. A Etapa 10 está na PR #11, branch `codex/implementar-etapa-10-do-projeto`.

O último commit funcional da Etapa 10, `58fd267864ad4f2f47af3dc7d445372c1edab6d5`, passou integralmente na CI #230: backend, frontend e Playwright E2E. Alterações documentais posteriores também devem ter CI verde antes do merge. Consulte [`CHECKLIST_FINAL.md`](CHECKLIST_FINAL.md) para o estado verificável e as validações externas pendentes.

## Etapa 10

A Etapa 10 fecha Painel/Mesa, status e finalização, histórico do cliente, orçamento com fonte autoritativa no servidor, Financeiro com relatório mensal sob demanda, perfis/menu, garantias, atendimento externo mobile, layout local por dispositivo e backup automático persistido/auditado, além de endurecer a restauração por snapshot.

A interface deve seguir **mobile first**: a base deve funcionar em telas pequenas e só depois expandir por `min-width`. O fluxo externo mobile possui atalhos WhatsApp, Maps, Foto, Status e Finalizar com alvos de toque adequados; o E2E verifica que esses elementos não se sobrepõem e realiza clique real sem `force: true`.
