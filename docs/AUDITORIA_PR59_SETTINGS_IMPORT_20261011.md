# PR #59 — importação CSV em Configurações Mobile (11/10/2026)

## Causa e correção

Base `86bfdec` na branch `prepublicacao/mobile-ci-20261011`. O teste E2E pressupunha que a seção Sistema continuaria aberta após `setDeviceLayout('mobile')`. Esse helper grava `arl-layout-mode` e recarrega a página. No Mobile, `SettingsPage` inicia na grade de categorias (`mobileMenu` para `initialSection === 'company'`); o formulário de importação só é montado após Master abrir Sistema. O snapshot da falha local mostrou a grade e o card Sistema, sem o formulário. A importação é permitida no Mobile ao Master; a rota `POST /api/settings/clients/import` usa `role:Master` no backend. Não havia defeito de produto comprovado.

`tests/e2e/settings-import.spec.ts` agora abre o card Sistema após o reload e confirma o botão e o encaixe do card em 390 × 844. O cenário de Administrador também abre Sistema no Mobile e confirma que a importação não aparece. O fluxo Desktop de importação, resumo, duplicidade e erro permanece no mesmo teste.

## Revisão crítica de `86bfdec`

- `theme.ts`, `theme.css` e `mobile-v2.css`: busca no código de aplicação, Blade e entradas Vite não encontrou referência ativa aos três arquivos removidos. `app.blade.php` carrega `appearance.ts` e os CSS atuais. Campos `theme_*` ainda existem no backend e em documentos históricos; não foram removidos. Build passou. A ausência de regressão visual em todos os modos requer comparação visual completa na CI/homologação; esta correção não mudou CSS.
- Os cinco `MutationObserver` editados agrupam mutações por `requestAnimationFrame`. Os filtros de `client-search`, `new-order-search` e `order-maintenance` apontam aos seletores que seus instaladores usam; as rotas React já têm guardas de propriedade. A mudança não fornece, por si só, medição de ganho em milissegundos. Permanecem pendentes perfis controlados de CPU, memória e cliques frios/quentes, inclusive navegador celular e hospedagem alvo.
- `Dashboard`: a condição `!mobileLayout || desk` mantém consultas da Mesa e do Painel Desktop; no Mobile a lista vem de `mobile-home.ts`. Os testes adicionados em `86bfdec` cobrem contagem de chamadas Desktop e Mobile. Conferir transição de layout e estados de loading/erro em regressão ampla; não houve mudança adicional neste componente.
- Nenhum indício nesta falha justifica refatoração de scripts ou queries. Não foram alterados layouts, permissões, cache ou backend.

## Validação local

Backup Git informado em `C:\Users\Allan\ARL-backups\codex-ci-audit-20261011\git-all.bundle`: `git bundle verify` aprovou e contém o HEAD. O workspace tinha arquivos não rastreados preexistentes, preservados; arquivos rastreados estavam limpos antes da correção.

- `PHP_INI_SCAN_DIR=docs` habilitou GD no PHP local; `pdo_sqlite` já estava presente. O launcher E2E recriou apenas `database/e2e.sqlite` e usou storage privado de teste.
- Playwright focado `tests/e2e/settings-import.spec.ts --project=desktop-chromium`: os dois casos registraram `ok` (Master 6,9 s; Administrador 4,6 s). Neste Windows, o runner permaneceu aberto após os casos e precisou ser interrompido; não há código de saída zero da execução. A CI Linux continua sendo o gate integral.
- `npm run lint`: PASS; `npm run typecheck`: PASS; `npm run test:unit`: 51 PASS; `npm run build`: PASS; `vendor/bin/pint --test`: PASS.
- `php artisan test tests/Feature/ClientCsvImportTest.php`: 7 PASS, 40 assertions, SQLite em memória; inclui negação ao Administrador.
- `git diff --check`: PASS. Suíte E2E integral e comparação visual completa não foram repetidas localmente.

Após revisão e commit pelo orquestrador, o push da branch da PR deve disparar novamente os quatro jobs da CI GitHub. Confirmar Playwright integral verde antes de qualquer release. Nenhuma ação em produção foi executada.
