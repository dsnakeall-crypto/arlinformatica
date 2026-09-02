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

O E2E usa SQLite descartável, migrations/seeds e servidor Laravel local. Instale o Chromium uma vez com `npx playwright install chromium`. O workflow manual **Preparar release** gera o pacote de produção sem secrets nem dados privados.

## Produção

Nunca publique `.env`, banco, backups, fotos ou PDFs. O document root é `public/`; use HTTPS. Compile assets antes do upload. O guia detalhado para hospedagem compartilhada está em [`docs/KINGHOST_DEPLOY.md`](docs/KINGHOST_DEPLOY.md).

## Estado

O primeiro marco entrega modelagem relacional ampla, núcleo autenticado de clientes/OS, sequencial transacional, snapshots, limite de foto e uma interface responsiva fiel à direção visual. Consulte [`CHECKLIST_FINAL.md`](CHECKLIST_FINAL.md): itens não implementados estão explicitamente pendentes, sem mocks declarados como prontos.
