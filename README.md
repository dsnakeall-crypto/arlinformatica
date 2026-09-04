# ARL Informática

Sistema de gestão para assistência técnica, construído como monólito Laravel 12 + SPA React/TypeScript. O banco oficial é MySQL/MariaDB e o frontend compilado é estático; produção não exige Node.js permanente. A arquitetura e as decisões de histórico estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

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

O E2E usa SQLite descartável, migrations/seeds e servidor Laravel local. Instale Chromium com `npx playwright install chromium`. Playwright permanece com `retries: 0`: falha deve ser investigada e corrigida, não mascarada por repetição automática. No GitHub Actions, o PHP do servidor embutido E2E é configurado sem Zend OPcache devido ao crash intermitente isolado no runner; isso é restrito ao teste e não desativa OPcache em produção.

O workflow manual **Preparar release** executa as auditorias/testes/build/E2E novamente e gera o pacote de produção sem secrets nem dados privados, acompanhado de `.sha256`.

## Produção

Nunca publique `.env`, banco, backups, fotos ou PDFs. O document root é `public/`; use HTTPS. O guia detalhado para hospedagem compartilhada está em [`docs/KINGHOST_DEPLOY.md`](docs/KINGHOST_DEPLOY.md).

Antes de aceitar a publicação real, configure a logomarca oficial em Configurações, gere/confera um PDF A4, configure cron/heartbeat, VAPID quando aplicável e realize o smoke test descrito no checklist.

## Estado

A `main` é a base estável e a Etapa 10 está na PR #11, branch `codex/implementar-etapa-10-do-projeto`. Não fazer merge automaticamente.

O último head **técnico** validado antes do fechamento documental é `cdffc543df5c147b64b9c87f14a20831145d962a`, com a **CI #356 integralmente verde**: backend SQLite, backend MySQL 8, frontend e Playwright E2E normal. O Playwright executou 26 testes, todos aprovados.

As oito referências visuais oficiais foram reenviadas em 04/09/2026 e estão catalogadas por nome/SHA-256 em [`docs/REFERENCIAS_VISUAIS.md`](docs/REFERENCIAS_VISUAIS.md). A homologação encontrou e corrigiu overflow das ações de Clientes no desktop e quebra inadequada de telefone no mobile; a regressão agora é validada geometricamente pelo E2E.

O Instagram oficial inicial é `https://www.instagram.com/allanluttembarck`; o perfil antigo `@arlinformatica` não deve ser restaurado a partir do timbrado histórico.

O head documental criado após esta atualização precisa passar pela CI novamente. Depois disso, os próximos gates são o workflow manual **Preparar release**, deploy/smoke real na KingHost, cadastro da LOGO oficial + conferência/impressão A4 e Web Push em dispositivo real. Consulte [`CHECKLIST_FINAL.md`](CHECKLIST_FINAL.md) e [`docs/CONTINUIDADE_CHATGPT.md`](docs/CONTINUIDADE_CHATGPT.md).

## Etapa 10

A Etapa 10 fecha Painel/Mesa, status e finalização, histórico do cliente, orçamento com fonte autoritativa no servidor, Financeiro com relatório mensal sob demanda, perfis/menu, garantias, atendimento externo mobile, layout local por dispositivo e backup automático persistido/auditado, além de endurecer a restauração por snapshot.

A interface segue **mobile first**. O fluxo externo mobile possui WhatsApp, Maps, Foto, Status e Finalizar com alvos de toque validados; Clientes também possui regressão de contenção/overflow mobile. O E2E usa cliques normais, sem `force: true` ou clique JavaScript para contornar defeitos de interface.
