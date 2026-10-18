# Etapa A — Segurança e carregamento: SEC-1 e SEC-2

Data: 11/10/2026. Projeto local: `C:/laragon/www/arlinformatica`.
Base Git preservada: `7d83f65c692b7adeb691b16cec3f153cbe9fa1ab`.

## Escopo e preservação

Somente SEC-1 e SEC-2 da `.agents/AUDITORIA_COMPLETA_ARL_PR59.md` foram corrigidos. Foram consultados AGENTS.md, README, documentos mestre/referências, instruções da equipe e perfis Segurança, Testes/CI, Frontend/Mobile e Revisor de Arquitetura. Dois subagentes reais combinaram esses quatro perfis para diagnóstico e revisão; todas as edições no repositório ficaram com o coordenador, sem edições concorrentes.

Backup externo anterior às alterações: `C:/Users/Allan/ARL-backups/etapa-a-20261011-141751`. Manifesto SHA-256: 11.508 arquivos conferidos, zero divergências; histórico Git em `history.bundle`, verificado com 83 referências. Inclui alterações existentes, arquivos não rastreados e arquivos locais; dependências reinstaláveis node_modules/vendor não integram o backup. Evidências: `manifest.csv`, `bundle-verify.txt`, `status-before.txt`, `working.patch` e `staged.patch`.

A validação roda em `backup/validation`, com SQLite descartável/em memória, arquivos privados de teste e build isolado. Não houve acesso à KingHost, banco oficial, commit, push, merge ou deploy. Nenhuma etapa posterior foi iniciada.

## SEC-1 — emissão de link público

**Causa:** GET `/api/orders/{order}/final-share` criava token e registro de auditoria. GET é isento de CSRF e poderia provocar escrita sem a proteção exigida.

**Correção:** emissão exclusivamente por POST, protegida pelo middleware CSRF de sessão já presente na API. GET de emissão passa a responder 405; GET de status continua somente leitura. Os dois consumidores React usam POST pelo cliente API, que envia o CSRF; o consumidor legado envia POST e `X-CSRF-TOKEN` explicitamente.

O perfil Usuário local tinha acesso à emissão pelo antigo GET. Foi preservada essa permissão com uma exceção POST específica para `api/orders/*/final-share`, sem liberar outras mutações. Conta inativa, visitante e perfil Controle de Gasto permanecem bloqueados. Controller, esquema de tokens, downloads, validade de 30 dias, hash, revisão documental e revogação não foram modificados.

Os testes exercitam o middleware CSRF efetivo, removendo apenas o bypass automático do Laravel em ambiente de testes: ausência/token inválido retornam 419 e não escrevem tokens/auditoria; token válido permite POST. Também verificam cinco perfis operacionais, contas bloqueadas, GET sem emissão, documento ausente/OS não concluída e download de token legado sem conversão ou reemissão.

## SEC-2 — Service Worker

**Causa:** o worker v4 armazenava respostas HTTP de erro, perpetuando falhas de carregamento em cache.

**Correção:** cache `arl-static-v5`; somente resposta 200, sem redirecionamento, HTML, `private` ou `no-store` pode ser armazenada. Respostas inválidas já encontradas no cache atual são descartadas e a rede é consultada. HTTP 404/500 continua visível; fallback para estático válido ocorre somente em falha real de rede.

O cache se restringe aos estáticos autorizados em `build/`, `arl-assets/` e ao manifesto público. Metadados internos de build, métodos diferentes de GET, Range, Authorization, APIs e documentos privados ficam fora. APIs financeiras e saldos não recebem cache/offline. Ícones e manifesto continuam com rede prioritária; arquivos de build válidos mantêm cache prioritário.

O precache valida todas as respostas antes de gravar/ativar a nova versão. Atualização com 404/500 falha sem substituir o worker ativo; a recuperação permite instalar a v5. Na ativação, somente caches antigos `arl-static-*` são removidos; caches de outras aplicações são preservados. Push e clique de notificações permanecem intactos.

## Arquivos da correção

| Arquivo | Alteração |
|---|---|
| `routes/api.php` | Emissão de link GET → POST |
| `app/Http/Middleware/RestrictModuleAccess.php` | Preservação pontual da permissão anterior de Usuário local |
| `resources/js/order-detail-react.tsx` | Dois consumidores POST com CSRF pelo cliente API |
| `resources/js/completion-polish.ts` | Consumidor legado POST com cabeçalho CSRF |
| `public/sw.js` | Cache seguro, recuperação e atualização v5 |
| `tests/Feature/FinalShareTest.php` | Atualização de contrato e seis cenários adicionais de segurança/compatibilidade |
| `tests/Feature/ServiceOrderReopenTest.php` | Emissão de link via POST na regressão de reabertura |
| `tests/e2e/operation.spec.ts` | Espera da resposta POST no fluxo de compartilhamento |
| `tests/e2e/service-worker-security.spec.ts` (novo) | Sete cenários com servidor HTTP e worker reais |
| `.agents/ETAPA_A_SEGURANCA_RESULTADO.md` (novo) | Este relatório |

## Validações e evidências

Logs completos ficam no backup externo, sem credenciais incorporadas ao relatório.

| Validação | Resultado | Evidência externa |
|---|---|---|
| PHP: FinalShare, BudgetShare, ServiceOrderReopen, CsrfSecurity, SessionSecurity, SimpleAdminAuthorization | **35 aprovados, 348 asserções** | `php-security.log` |
| Unitários frontend | **51 aprovados**, zero falhas/skips | `test-unit.log` |
| ESLint, incluindo novo E2E | **Aprovado**, zero warnings | `lint-final.log` |
| TypeScript (`npm run typecheck`) | **Aprovado** | `typecheck.log` |
| Build (`npm run build`, incluindo postbuild) | **Aprovado** | `build.log` |
| Pint nos três arquivos PHP modificados | **Aprovado** | Saída `result: passed` |
| `git diff --check` | **Aprovado** | Sem erros de whitespace |
| Playwright Service Worker, desktop Chromium | **7 aprovados**, 9,5 s, retries=0 | `playwright-sw-final.log` |
| Playwright regressão: operation, order-detail-react, lazy-loading, session-security, security, arl-web-final-expense-visual | **36 aprovados**, 3,2 min, retries=0 | `playwright-regression.log` |

Comando PHP: `php -d extension=gd artisan test --filter='FinalShareTest|BudgetShareTest|ServiceOrderReopenTest|CsrfSecurityTest|SessionSecurityTest|SimpleAdminAuthorizationTest'`, com APP_ENV=testing e SQLite em memória. Comandos frontend: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`. Playwright usa `--project=desktop-chromium`, workers=1 e retries=0.

Os sete cenários SW cobrem: 404/500 não persistidos e recuperação; estático válido offline e recurso inédito indisponível; atualização online de ícones/manifesto; exclusão de APIs/documentos/POST/metadados; cache atual contaminado; respostas privadas/no-store/206/redirecionadas/HTML e Range/Authorization; atualização inválida seguida de recuperação; troca v4→v5 com cache externo preservado.

**Falhas iniciais do novo teste, resolvidas:** primeira execução teve 3 aprovações e 4 reprovações. O modo offline do BrowserContext não interrompia a rede do worker neste ambiente, e controllerchange precedia o fim da ativação. A fixture passou a interromper a conexão HTTP real e aguardar o estado activated. Não houve mudança nas assertivas, desativação de cenários, aumento de retries ou ocultação de erros. Log inicial preservado em `playwright-sw.log`; versão final 7/7 aprovada.

## Revisão final e pendências

Revisão de Segurança/Arquitetura não identificou bloqueadores no diff SEC-1/SEC-2. Comparação SHA-256 contra o backup confirmou somente os oito arquivos rastreados da correção alterados, nenhum arquivo anterior ausente e AGENTS.md/CHECKLIST_FINAL.md anteriores intactos. Evidência: `scope-verification.json`. CSS, layouts, templates, controllers, migrations e regras financeiras não foram alterados.

Limites: SW homologado em Chromium com HTTP real e worker de versão antiga mínimo como fixture; não homologado em Safari, aparelhos físicos ou hospedagem oficial. Não foram medidos quota de cache nem metas de 100 ms. Offline garante somente estáticos válidos já carregados, sem prometer funcionamento offline de dados privados.

- [OK] SEC-1 corrigido e validado com CSRF efetivo e links legados.
- [OK] SEC-2 corrigido e validado com erros, offline e atualização/recuperação.
- [OK] Backup e preservação de arquivos/alterações anteriores verificados.
- [OK] Regressão dirigida: 36/36; Playwright total da Etapa A: 43/43. Compartilhamento, carregamento lento/com falha, sessão/CSRF e verificações Web Original, Web Clean e viewport mobile aprovados.
- [PENDENTE] Revisão do proprietário; commit e push dependem de autorização futura.
- [PENDENTE] Nova CI da revisão corrigida: mudanças permanecem locais e não foram enviadas ao GitHub. Esta validação dirigida não substitui a suíte integral da CI.

Parar na Etapa A. Etapa B não iniciada.
