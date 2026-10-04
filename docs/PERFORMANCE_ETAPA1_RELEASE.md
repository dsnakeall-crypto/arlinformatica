# Performance — Etapa 1 final para release

Data: 04/10/2026. Status: **PRONTO PARA PUBLICAÇÃO**, com verificação do scheduler na KingHost durante a publicação. Nenhum deploy foi feito. Esta conclusão se refere às sete melhorias de performance desta etapa; não constitui homologação do servidor ou de toda alteração histórica do aplicativo.

## Entregas e commits em ordem

1. `33c61e2` — `perf: remove duplicate dashboard orders request`: uma consulta à semana concluída; contador usa `total`, independentemente do tamanho da página.
2. `a42ff16` — `perf: debounce order search requests`: pesquisa de Ordens após 300 ms, cancelamento/descarte da resposta anterior e retorno à página 1.
3. `66d2dc7` — `perf: reuse authenticated user in order detail`: detalhe recebe o perfil já autenticado; sem nova chamada ao `/api/me` nesse componente.
4. `7fe4c7c` — `perf: deduplicate concurrent order detail requests`: compartilha somente GETs idênticos em andamento; remove a entrada após sucesso/falha; não guarda respostas concluídas e não compartilha mutações ou sinais próprios de cancelamento.
5. `27cfa9c` — `perf: throttle navigation summary refresh`: intervalo de 30 segundos na navegação; ações relevantes forçam atualização; troca de usuário/invalidação de respostas antigas preservadas.
6. `a7a0afa` — `perf: move post-sale catch-up out of navigation`: navegação/listagens comuns deixam de recuperar ciclos; acesso ao Pós-Venda recupera conclusões dos últimos 30 dias; comando agendado preserva recuperação histórica completa.
7. `ef2ab74` — `perf: optimize order tab counters`: cinco consultas dos contadores substituídas por uma consulta agregada.
8. `ae31bf2` — `fix: guard order status refresh and verify search pagination`: correção de nulidade apontada pelo TypeScript no item 5; teste explícito de pesquisa iniciada na página 2. Os sete commits originais foram preservados.

O commit de documentação final inclui o ajuste do relógio do teste de navegação para horário fixo. Nenhuma regra da aplicação foi alterada para acomodar fixtures.

## Item 7: preparação e equivalência

A fixture foi corrigida para preencher `payments.idempotency_key` e usar `financial_adjustments.previous_cents`, conforme o schema existente. Nenhuma mudança de produção foi feita para corrigir esses dados.

Antes da otimização, `php artisan test --filter=OrderTabCountersPerformanceTest` passou: **1 teste / 18 verificações**. Depois, o mesmo cenário continuou aprovado. Foi acrescentado teste de base vazia e quantidade de consultas: **2 testes / 20 verificações**.

A solução faz um único LEFT JOIN com a subconsulta existente de pagamentos efetivos e SUM(CASE WHEN ...) para cada aba, além de COUNT para todas. Preserva o ajuste mais recente por MAX(id), COALESCE do valor ajustado, critérios de status e escopo de exclusão lógica. Não armazena saldo pago na OS. A listagem continua usando sua própria consulta; não foi prometida uma única consulta para o endpoint inteiro.

Os resultados antes/depois foram exatamente: `progress=3`, `awaiting_payment=3`, `finalized=3`, `interrupted=1`, `all=10`. Cenários incluem os três status em andamento, OS sem pagamento, parcial/integral, ajuste para baixo/para cima com duas revisões, interrompida paga, exclusão lógica e OS concluída com valor zero. Busca, filtro e paginação não reduzem os contadores globais. Base vazia devolve cinco inteiros zero; consulta dos contadores executa uma agregação.

## Validação local

PHP utilizado: `C:/laragon/bin/php/php-8.3.33-Win32-vs16-x64/php.exe` (8.3.33, com SQLite). Comandos PHP abaixo foram executados com esse binário.

| Comando | Resultado |
|---|---|
| `php artisan test --filter=OrderTabCountersPerformanceTest` antes da otimização | 1 teste, 18 verificações, aprovado |
| Mesmo comando depois da otimização | 2 testes, 20 verificações, aprovado |
| `node --experimental-strip-types --test tests/frontend/in-flight-get.test.mjs` | 3 testes aprovados |
| `php artisan test --filter='StageSixTest\|NavigationSummaryTest\|ServiceOrderReopenTest\|OrderTabCountersPerformanceTest'` | 21 testes, 261 verificações, aprovados |
| `php artisan test` | 307 testes, 6.450 verificações, aprovados |
| `npm run typecheck` | Aprovado depois da correção de nulidade do item 5 |
| `npm run lint` | Aprovado, sem warnings |
| `npm run test:unit` | 22 testes aprovados |
| `php vendor/bin/pint --test` com os quatro arquivos PHP e três testes PHP da etapa | Aprovado |
| `npm run build` | Build final de produção aprovado após os testes; 30 arquivos em public/build |
| `git diff --check` | Aprovado; mensagens de conversão LF/CRLF não são erros de whitespace |

E2E usa a configuração oficial `playwright.config.ts`, sem alteração, banco SQLite descartável e armazenamento privado de teste. O primeiro início com PHP do PATH falhou por ausência de driver SQLite. Foi usado o parâmetro documentado `PHP_BINARY` apontando para o PHP Laragon acima; nenhuma configuração foi improvisada ou alterada.

Comandos E2E executados com `$env:PHP_BINARY` configurado:

```powershell
npm run test:e2e -- --project=desktop-chromium tests/e2e/performance-stage-one.spec.ts tests/e2e/order-detail-react.spec.ts tests/e2e/order-workflow-navigation.spec.ts tests/e2e/post-sale-navigation.spec.ts tests/e2e/sidebar-navigation.spec.ts tests/e2e/order-status-contract.spec.ts
# 24 aprovados, 3,2 minutos

npm run test:e2e -- --project=desktop-chromium tests/e2e/performance-stage-one.spec.ts tests/e2e/stage-ten.spec.ts --grep 'Buscar a partir|Funcionário vê|Administrador acessa'
# Perfis Funcionário e Administrador aprovados; fixture de paginação inicialmente falhou.

npm run test:e2e -- --project=desktop-chromium tests/e2e/performance-stage-one.spec.ts
# Reteste final: 5 aprovados, 23,6 segundos.
```

O teste novo de paginação estava sem `next_page_url`, campo que habilita Próxima na resposta real da API. Corrigido apenas na fixture. No reteste completo desse arquivo, a simulação do intervalo de navegação oscilou na fronteira dos 30 segundos; foi substituída por `page.clock.setFixedTime`, testando exatamente 30.000 ms sem espera real. Os cinco testes específicos passaram juntos depois da correção. Não houve uso de sleeps/waitForTimeout para mascarar falhas.

Foram validados Painel, debounce/cancelamento, paginação/busca, detalhe e workflow da OS, contrato de status, navegação/Pós-Venda, resumo de navegação, menu em diferentes larguras e perfis. A autorização backend também está coberta pela suíte PHP completa. Isso não é uma nova execução de todos os E2E financeiros/fornecedores ou de todos os navegadores possíveis.

## Estado do Git e limpeza

**A — Etapa 1:** quatro arquivos PHP de produção, quatro arquivos frontend de produção, testes específicos/ajustados, este relatório e CHECKLIST_FINAL.md. Alterações da etapa commitadas; build gerado é ignorado pelo Git e deve ser publicado como artefato.

**B — Preexistentes, preservados:** `.phpunit.result.cache`, `tsconfig.tsbuildinfo`, `vite.config.ts`; exclusão de `storage/framework/testing/disks/local/documents/orders/1/term-r1.pdf`; arquivos/pastas não rastreados `analise.txt`, `backup_antes_limpar.sql`, `backup_antes_zerar.sql`, `output/`, `playwright.8001.config.ts`, `resources/images/documents/OLDTINGS.jpg`, `scripts/e2e-server-8001.sh`, `storage/app/`, `storage/framework/testing/disks/local/orders/`, `storage/framework/testing/e2e-private/`, `storage/framework/testing/finance-component-check.png`, `storage/framework/testing/phpunit-private/`, `teste-e2e.txt`, `visual-artifacts/`, `zerar.sql`.

**C — Artefatos:** removidos três arquivos novos de teste; restaurados oito artefatos preexistentes de teste/cache/captura/banco isolado a partir do backup original, com comparação de hash. Logs e sessões compartilhados foram conservadoramente preservados, pois podem receber gravações do aplicativo local; são ignorados e não devem ser publicados. Evidências e cópia pós-teste ficam fora do repositório. Nenhum reset geral/git clean foi utilizado.

Backups externos verificados e preservados:

- `C:/Users/Allan/ARL-backups/performance-etapa1-20261004-033442`: estado original, arquivos privados, alterações locais e histórico Git.
- `C:/Users/Allan/ARL-backups/performance-etapa1-continuacao-20261004-034658`: checkpoint da continuação, histórico, evidências E2E/build, arquivos de teste antes/depois e cleanup.json.

## Lista exata de publicação desta etapa

Backend/PHP:

1. `app/Http/Controllers/NavigationController.php`
2. `app/Http/Controllers/PostSaleController.php`
3. `app/Http/Controllers/ServiceOrderController.php`
4. `app/Services/PostSaleService.php`

Frontend: enviar **public/build inteiro**, de `C:/laragon/www/arlinformatica/public/build`, incluindo manifest.json e todos os assets listados ao fim deste relatório. Não misturar manifest novo com assets de outro build. O build inclui a configuração Vite preexistente do usuário; ela foi preservada, não criada por esta etapa.

Sem mudança em composer.lock/package-lock.json ou dependências. Não precisa enviar vendor ou node_modules. Não enviar `.env`, banco local, backups, testes, fixtures, relatórios de desenvolvimento, fontes frontend para execução direta, arquivos temporários, sessões, logs ou artefatos de teste. Esta lista trata somente da Etapa 1; outras alterações anteriores que ainda não estejam no servidor exigem seu próprio pacote revisado.

Não houve migration, alteração de schema, exclusão de dados oficiais, alteração de enhancer legado, MutationObserver, service worker, deploy, acesso a FileZilla ou alteração de servidor. Migrations e cadastros dos testes ocorreram apenas em bancos descartáveis.

## KingHost: conferências ainda necessárias

Conferência feita somente no código: `CheckPostSales` executa `$service->catchUp()` sem limite de data; `routes/console.php` agenda `post-sale:check` de hora em hora com withoutOverlapping; `PostSaleController::index` recupera somente conclusões dos últimos 30 dias.

Na publicação, verificar:

1. Backup validado do banco e dos arquivos privados do servidor, antes de qualquer atualização.
2. Cron chamando `artisan schedule:run` a cada minuto, com caminho real do app e do PHP CLI compatível (não copiar os caminhos de exemplo literalmente).
3. Cron usando o ambiente/credenciais oficiais, timezone correto e permissões de escrita em storage/bootstrap/cache.
4. Heartbeat do scheduler atualizando a cada minuto e execução efetiva de `post-sale:check` no horário programado, sem erro no log. A existência de cron configurado, por si só, não prova execução.
5. Conferir um caso histórico elegível ainda sem ciclo após execução do comando; a varredura completa deve recuperá-lo conforme as regras de elegibilidade, sem duplicação.
6. Conferir login, Painel, abas de Ordens, busca/paginação e abertura de OS no servidor após atualizar backend/build juntos.

Riscos restantes: scheduler ausente/sem permissão deixa de recuperar ciclos históricos que faltarem fora dos 30 dias; SQL foi validado localmente com SQLite, e a instalação MySQL/MariaDB deve receber conferência após publicação; não foi medido ganho percentual de tempo em produção. A redução de cinco para uma consulta dos contadores é demonstrada, sem prometer percentuais de aceleração. Alterações anteriores do usuário permanecem fora dos commits desta etapa.

## Arquivos do build final

- `public/build/assets/action-buttons-sfvCbFBd.css`
- `public/build/assets/brand2026-access-BsaCZuf4.css`
- `public/build/assets/brand2026-access-f0m7C8SG.js`
- `public/build/assets/brand2026-DZsmmhDG.js`
- `public/build/assets/brand2026-z0o0XJzq.css`
- `public/build/assets/client-search-C55Wd6X_.js`
- `public/build/assets/completion-polish-CRuNmn-h.js`
- `public/build/assets/expense-photo-import-DXuvIjtM.js`
- `public/build/assets/expense-photo-import-Dy3YchmY.css`
- `public/build/assets/eye-iwY8yd50.js`
- `public/build/assets/index-DqLVVEyl.js`
- `public/build/assets/main-DGy0DuE1.css`
- `public/build/assets/main-lvTRcEgB.js`
- `public/build/assets/mobile-home-BFKIcNr8.js`
- `public/build/assets/mobile-home-m593wBba.css`
- `public/build/assets/new-order-search-BMjHuotZ.css`
- `public/build/assets/new-order-search-Bo-s-Mrk.js`
- `public/build/assets/official-icons-ubo4fiHD.js`
- `public/build/assets/opening-whatsapp-Dbb-R6Jj.js`
- `public/build/assets/order-maintenance-Be2Ti0fE.js`
- `public/build/assets/order-reopened-DP_XlAb7.js`
- `public/build/assets/order-workflow-CN2YyDkq.js`
- `public/build/assets/page-isolation-xi0G7lYe.js`
- `public/build/assets/react-ownership-D_a0zXwh.js`
- `public/build/assets/record-management-C9fkwQZQ.js`
- `public/build/assets/theme-C-d943zg.css`
- `public/build/assets/theme-Dy77iyzh.js`
- `public/build/assets/ui-final-polish-D1DH92Bq.js`
- `public/build/assets/ui-regression-guard-BJfvsJTK.js`
- `public/build/manifest.json`
