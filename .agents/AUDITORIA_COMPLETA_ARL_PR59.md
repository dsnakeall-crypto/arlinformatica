# Auditoria completa de engenharia — ARL APP / PR #59

Data: 11/10/2026. Coordenador: Codex. Etapa: diagnóstico, sem limpeza ou correção de código.

## 1. Resumo executivo

A PR #59 está aberta, em rascunho. O HEAD local e o HEAD remoto coincidem: `7d83f65c692b7adeb691b16cec3f153cbe9fa1ab`. A [CI #1282](https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38154640128) terminou com **success** em backend, backend-mysql, frontend e e2e. A comparação com a base `9702fa1dd0e86889a11db8e6136b327969083f95` tem seis commits e 159 arquivos alterados, tanto localmente quanto na API GitHub. Não houve fetch, checkout, commit, push, merge ou deploy nesta auditoria.

Resultados principais:

- **Zero arquivos fonte inteiros confirmados mortos.** Todas as 128 fontes frontend examinadas pelo grafo estão estruturalmente alcançáveis. Isso não prova execução de cada declaração ou seletor.
- **13 funções privadas inativas confirmadas**, em cinco módulos; os arquivos que as contêm continuam necessários.
- **88 grupos de regras CSS exatamente duplicadas**, com 88 ocorrências adicionais, entre 5.034 regras. A cascata impede concluir que a exclusão seja segura.
- Dois comportamentos merecem correção antes da publicação: emissão de link público por GET sem CSRF e armazenamento de respostas HTTP de erro pelo service worker. Ambos foram reproduzidos em diagnóstico isolado, com os limites descritos abaixo.
- Configuração do Controle de Gastos renova o timestamp do cache mesmo quando não faz uma consulta. Interações frequentes podem impedir a revalidação periódica.
- Concorrência na emissão documental e consistência de backup são riscos **prováveis**, ainda sem reprodução concorrente. Recuperação entre banco e arquivos também precisa de ensaio de falha.
- Auditorias atuais: npm completo com zero vulnerabilidades; Composer de produção com zero advisories e zero pacotes abandonados. Não é garantia de ausência de vulnerabilidades desconhecidas.

Executaram-se três subagentes reais, sem edições concorrentes: arquitetura/publicação; frontend-mobile/performance; banco-dados/segurança. O coordenador cobriu testes-ci, revisão cruzada e consolidação. Os sete perfis foram usados como checklists, sem permissões adicionais.

**Preservação:** nenhuma alteração no aplicativo, CSS, regras, permissões, dependências ou testes do repositório. Somente este relatório foi criado. Alterações preexistentes em `AGENTS.md`, `CHECKLIST_FINAL.md` e arquivos não rastreados foram preservadas. Não houve acesso à KingHost, ao banco oficial ou execução de migrations no banco de uso.

## 2. Quantidade de arquivos analisados e método

As contagens abaixo se sobrepõem; não devem ser somadas como se fossem arquivos diferentes.

| Escopo | Quantidade real | O que foi verificado |
|---|---:|---|
| Arquivos rastreados pelo Git | 571 | Inventário, extensões, hashes, duplicação binária e padrões finitos de credenciais |
| Arquivos não rastreados no início | 225 | Inventário/preservação; não leitura integral de todo log e arquivo privado |
| Arquivos inspecionados individualmente | 113 distintos | Leitura integral ou dos trechos relevantes; lista exata externa, sem somar inspeções repetidas de agentes |
| Fontes frontend do grafo | 128 | 80 JS/TS/TSX + 48 CSS; AST TypeScript e parser/imports CSS |
| Referências / raízes do grafo | 289 / 18 | Imports, exports, imports dinâmicos literais, require, CSS e entradas Vite/Blade |
| Fontes alcançáveis / desconectadas | 128 / 0 | Alcance transitivo a partir das raízes; zero imports dinâmicos não literais encontrados nesse escopo |
| Arquivos CSS / regras | 48 / 5.034 | Parse e comparação de seletor, contexto de at-rule e sequência de declarações |
| Arquivos PHP verificados por `php -l` | 233 | Sintaxe, incluindo arquivos de aplicação, migrations, testes e templates rastreados; zero falhas |
| Specs E2E rastreadas / locais adicionais | 91 / 11 | Descoberta real do runner: 252 casos no commit; 262 casos com os diagnósticos locais, em 101 arquivos |

`AGENTS.md`, `.agents/README.md`, os oito perfis, a auditoria preliminar, Projeto Mestre, Referências Visuais, README e TECHNICAL_DEBT foram lidos. As inspeções consideraram rotas, DI/container, convenções Laravel, Blade/Vite, imports dinâmicos, efeitos colaterais e os modos Original/Clean/Mobile. Ausência textual isolada não foi usada para declarar um arquivo morto.

**Limites:** não houve leitura manual linha a linha dos 571 arquivos, cobertura de seletores em todas as telas, EXPLAIN/benchmark MySQL, varredura completa de secrets em todo o histórico, ensaio de produção ou execução integral local dos 252 E2Es. Esses limites são pendências explícitas, não resultados aprovados. O grafo é estrutural; tree-shaking e condições de execução podem deixar partes inativas dentro de arquivos alcançáveis.

### Validações executadas nesta auditoria

Tudo que exige runtime foi executado em `C:\Users\Allan\ARL-backups\auditoria-completa-pr59-20261011-140026\validation`, criado de `git archive HEAD`, com `.env.example`, vendor copiado e dependências npm locais ligadas por junction. SQLite e arquivos privados eram descartáveis. O launcher E2E desativou leitores pagos e usou porta 8037. Não houve mudança de configuração global.

| Comando/verificação | Resultado |
|---|---|
| `npm run lint` | PASS, exit 0, no commit isolado |
| `npm run typecheck` | PASS, exit 0 |
| `npm run test:unit` | 51/51, nenhum skip/cancelamento |
| `npm run build` | PASS; prebuild OCR e postbuild `.htaccess` executados |
| `npm audit --json` | Zero vulnerabilidades, incluindo desenvolvimento |
| `composer audit --locked --no-dev --format=json` | Zero advisories/abandoned |
| `php -l` nos PHP rastreados | 233/233 sem erro de sintaxe |
| `php -d extension=gd artisan test --filter='FinalShareTest\|CsrfSecurityTest\|BackupDatabaseIsolationTest\|SimpleAdminAuthorizationTest\|SessionSecurityTest\|ExpenseSummaryIndicatorsTest'` | 26/26, 348 assertions, SQLite em memória |
| Playwright: `arl-web-final-expense-visual-20261010`, `lazy-loading`, `dashboard-loading-regression` desktop e mobile | 9/9, 51,5 s, retries 0; Original/Clean, Gastos, carregamento lento/erro e contagem de chamadas |
| Diagnóstico PHP externo `AuditFinalShareCsrfTest` | 1/1, quatro assertions; GET emite token sem CSRF com middleware efetivamente habilitado |
| Simulação do cache com relógio controlado | Uma consulta em 120 s com interações a cada 20 s; preservando timestamp real seriam quatro. Não é E2E/rede real |
| Execução isolada do `public/sw.js` em VM | Duas respostas 500 com apenas uma chamada de rede simulada; erro armazenado e reutilizado. Não é navegador real |
| `playwright test --list` | 252 casos/91 arquivos do commit; 262/101 com specs locais; lista não equivale a execução |
| `git diff --check` | PASS; aviso LF/CRLF sem erro de whitespace |

O diagnóstico PHP adicional e os scripts de investigação estão fora do repositório. Não foram alterados testes para passar. Não repetimos Pint, a suíte PHP completa, MySQL ou E2E integral local; os quatro jobs da CI remota são evidência independente de aprovação do commit, não execução local desta etapa. Durações de casos E2E não são métricas clique→feedback de 100 ms.

## 3. Arquivos mortos confirmados

**Nenhum arquivo fonte inteiro confirmado para remoção.** Nenhum controller/model/migration inteiro foi comprovado morto. Classes descobertas por Laravel, providers, comandos, relacionamentos e rotas não podem ser retiradas por busca simples.

Existe código inativo dentro de arquivos necessários:

| Arquivo | Declarações / linhas | Classificação e evidência | Impacto / risco |
|---|---|---|---|
| `resources/js/main.tsx` | ClientForm:37; ClientHistory:192; OrderView:961; ReportTemplateSettings:1142; CatalogAdmin:1596; ChecklistAdmin:1835; AdminCatalogs:1905 | CONFIRMADO: sete funções privadas sem consumidor; AST encontra somente o identificador da declaração | Manutenção de implementações aposentadas; risco moderado se remover imports/CSS compartilhados junto |
| `resources/js/brand2026.ts` | enhanceServices:216 | CONFIRMADO: função privada sem consumidor | Arquivo enhancer ativo; remover apenas declaração após validar consumidores e efeitos |
| `resources/js/opening-whatsapp.ts` | rewriteOpeningModal:85 | CONFIRMADO: função privada sem consumidor | WhatsApp ativo continua necessário; preservar reservas, confirmação e templates |
| `resources/js/record-management.ts` | recordModal:37; installFinalizedEdit:38 | CONFIRMADO: duas funções sem consumidor; segunda vazia | Não representa funcionalidade concluída; arquivo tem outros efeitos ativos |
| `resources/js/order-detail-react.tsx` | InterruptionModal:435; ReportBox:1924 | CONFIRMADO: duas funções privadas sem consumidor | Preservar os fluxos atuais de interrupção/laudo e revisão histórica |

Total: **13**, deduplicado entre os dois agentes. Não são exportadas; não foi localizada resolução por eval/new Function/global nesses cinco módulos. As exceções nominais em `eslint.config.js:36–42` corroboram a aposentadoria. Não medimos economia de bundle: parte pode já ser eliminada pelo build. Variáveis/imports das whitelists não devem ser removidos automaticamente, pois alguns ainda têm consumidores internos ou efeitos colaterais.

## 4. Arquivos provavelmente obsoletos e itens necessários

| Caminho | Classificação | Referência/evidência | Risco de remoção |
|---|---|---|---|
| `public/icons/arl.svg` | PROVÁVEL legado | Mesmo SHA-256 de `public/arl-assets/arl.svg`; consumidor interno não localizado para o caminho antigo | URL pública pode ter consumidor externo/bookmark; provar antes de remover |
| `public/arl-assets/expense-cards/fixos-casa.png` | PROVÁVEL legado | Referência visual anterior substituída por `fixos-casa-v2.png` | Caminho pode persistir em `image_url` histórico; ausência de busca não prova ausência no banco |
| `resources/js/mobile-home.ts` | NECESSÁRIO | Entrada Blade/Vite; cartões operacionais mobile e E2E de não duplicação executado | Remoção apaga conteúdo mobile aprovado |
| `resources/js/order-popup.tsx` | NECESSÁRIO | Consumidores de Gastos, detalhe/nova OS e Fornecedores | Popup compartilhado; alto risco funcional/visual |
| `order-detail-editor.ts` / `order-detail-actions.ts` | NECESSÁRIO | `client-search.ts:2` → editor → actions | Cadeia indireta ativa; não são órfãos |
| Enhancers legados alcançáveis | NECESSÁRIO no estado atual | Raízes/imports e guards de ownership; dívida documentada | Aposentar por superfície após migração equivalente, nunca em massa |
| `scripts/apply-expense-web-mirror.mjs` / `resize-expense-web-icons.ps1` | NECESSÁRIO como ferramenta de reprodução | Documentação de acabamento; não são scripts de runtime | Guardar processo reprodutível; não rodá-los para limpar ou refazer layout |
| `prepare-expense-ocr.mjs` / `prepare-static-delivery.mjs` | NECESSÁRIO | Hooks prebuild/predev/postbuild executados | Remoção compromete OCR local ou entrega estática shared hosting |
| Migration `2026_09_06_170000_normalize_service_order_statuses.php` | NECESSÁRIO | Neutralizada e registrada no ledger; TECHNICAL_DEBT | Não remover/reintroduzir conversão `in_service → analysis` |
| `_mobile-audit-temp.mobile.spec.ts` e dez specs locais adicionais | INDETERMINADO como patrimônio de testes | Um diagnóstico histórico explicitamente ignorado; dez outros entram na descoberta local | Não apagar; revisar promoção/arquivamento após comparação com contratos oficiais |

Nenhuma regra CSS inteira foi classificada como morta: classes dinâmicas, modos de layout e cascata exigem coverage visual/runtime por cenário. Nenhum teste oficial foi comprovado obsoleto só por nome/data.

## 5. Código duplicado e manutenção

**CONFIRMADO:** parser PostCSS encontrou 88 grupos iguais em seletor, contexto e declarações; 88 repetições adicionais. Exemplos verificáveis:

| Regra | Locais | Conteúdo repetido |
|---|---|---|
| `.device-layout select`, `@media(max-width:800px)` | `app.css:12` / `brand2026.css:1` | `font-size:12px` |
| `.dashboard-orders` | `app.css:26` / `arl-ui-system.css:8` | `overflow:hidden` |
| `.shared-order-list .row-status`, `@media(max-width:800px)` | `app.css:29` / `arl-ui-system.css:12` | `grid-column:1` |

Os exemplos residem em `resources/css/`. A lista completa está no JSON externo. Regra idêntica repetida após outra regra pode restabelecer um valor na cascata; raízes diferentes também podem exigir repetição. Portanto duplicação não significa exclusão segura. Não estimamos bytes economizados sem um build posterior validado.

Cinco `.gitignore` idênticos de bootstrap/storage são sentinelas **NECESSÁRIAS**. Os dois SVG idênticos têm o risco descrito acima. Formatação BRL repetida e menus/enhancers coexistentes são dívida **PROVÁVEL** de manutenção, sem prova de defeito ou ganho de latência. Extração de helper exige preservar coerção, default e locale.

`main.tsx:21` importa StorageAdmin; seu único consumidor local está no AdminCatalogs inativo. É dívida fonte confirmada, **não prova de carregamento antecipado de Configurações**: o manifesto mantém settings-page como import dinâmico e o bundler elimina a ligação inativa.

## 6. Problemas de performance e consistência de cache

| ID / prioridade | Classificação e evidência | Impacto / validação necessária |
|---|---|---|
| PERF-1 / P2 | CONFIRMADO: `expense-control-page.tsx:88–101` renova savedAt ao reutilizar configuração | Uso a cada <30 s pode manter catálogo antigo indefinidamente. Simulação: uma consulta/120 s. Preservar timestamp da consulta real; testar relógio e alterações em outra sessão. Mutação local por revision invalida; backend mantém autorização |
| PERF-2 / P2 | CONFIRMADO estrutural: `BudgetController.php:16–20,92–104` faz itemsWithStock e exists por revisão | Pelo menos duas consultas adicionais por orçamento, padrão N+1. Agrupar consultas com mesma resposta/estoque e medir 1/10/100 revisões em banco descartável; latência atual não medida |
| PERF-3 / P2 | CONFIRMADO estrutural: `BackupService.php:39,62` materializa tabela inteira e lê ZIP inteiro | Consumo cresce com dados/arquivo; potencial estouro em shared hosting. Medir volumes sintéticos e pico de memória antes de stream/lotes |
| PERF-4 / P2 | CONFIRMADO estrutural: `FinanceController.php:124–178` retorna todas OS a receber | Payload cresce sem paginação; não identificado N+1 nessa função. Medir SQL/payload e preservar totais/ações numa evolução paginada |
| PERF-5 / P2 | CONFIRMADO estrutural: `StorageController.php:19` enumera arquivos e tamanho de cada um | Custo proporcional ao número de arquivos privados. Medir antes de agregar/cachear; não exibir estatística antiga como atual |
| PERF-6 / P3 | PROVÁVEL: 15 MutationObservers em enhancers legados, além de observer React | Guards e agrupamento por frame já existem. Medir callbacks/long tasks/memória após navegações; não há vazamento comprovado |

Build fresco isolado produziu `main` CSS de aproximadamente **229,26 kB / gzip 35,73 kB** e Gastos CSS **196,03 kB / gzip 30,26 kB**. jsPDF gerou chunk **390,91 kB / gzip 128,90 kB** e html2canvas **202,38 kB / gzip 48,04 kB**. São tamanhos de artefato, não transferência inicial de todos eles: módulos dinâmicos e cache alteram o carregamento. A presença de chunk não prova download/uso em cada página.

Não houve medição de clique→feedback, SQL real ou memória no celular/KingHost. O E2E executado confirmou uma consulta de OS abertas e zero de encerradas na home mobile; os módulos sob demanda, erro visível e reutilização de código passaram. Não se promete meta de 100/300 ms por esses resultados.

## 7. Vulnerabilidades e riscos de segurança/integridade

### SEC-1 — emissão de link por GET, P1, CONFIRMADO

`routes/api.php:152` registra GET para `FinalShareController::show`; `FinalShareController.php:21–45` cria token público e auditoria. Consumidores ativos: `order-detail-react.tsx:2184,2618` e `completion-polish.ts:178`.

Diagnóstico PHP externo, SQLite em memória, habilitou de fato ValidateCsrfToken e confirmou que GET sem token cria mais um registro. Isso comprova mutação fora da proteção CSRF desse método. Não foi executado ataque entre sites; SameSite, navegação, contexto e autorização influenciam exploração. Risco: emissão involuntária/volume de links válidos; não demonstrada leitura não autorizada do PDF.

Plano: emitir por POST com CSRF, manter status em GET, adaptar todos consumidores e testes; verificar sessão, roles, idempotência quando aplicável, revogação, revisão e expiração. Tokens aleatórios, hash SHA-256, validade e headers privados existentes devem ser preservados.

### SEC-2 — cache de resposta HTTP de erro, P1, CONFIRMADO

`public/sw.js:10` faz cache.put sem response.ok e usa cache-first para build. VM executando o código real, com rede/cache simulados, devolveu 500 na primeira e segunda consulta, com apenas uma ida à rede. Assim, um erro HTTP armazenado pode bloquear repetidamente JS/CSS até evicção/troca de cache. Não se atribui a esse achado o `net::ERR_FAILED` da auditoria anterior: rejeição de fetch não é uma resposta HTTP armazenada.

Plano: armazenar somente respostas válidas esperadas, definir ciclo de atualização/limite e testar 404/500, recuperação, upgrade e offline em navegador real. Cache v4 sem expiração própria para novos hashes tem crescimento **PROVÁVEL**, não memória medida; quota/evicção do navegador existem. Persistência de cache.put sem waitUntil também requer validação. Não cachear API, saldos ou dados privados.

### INT-1 — corrida de emissão documental, P1, PROVÁVEL

`DocumentService.php:12–18` usa exists → grava caminho fixo → insert unique. Dois emissores podem passar exists e o segundo sobrescrever o PDF antes de falhar no índice. Consumidor ativo sem lock: fallback `DocumentController::term:32–39` quando ainda não há termo. Emissão normal pode já ter termo; não se presume corrida em toda abertura.

A revisão cruzada excluiu finalização como prova dessa corrida: FinalizationController reserva sob lock; laudo técnico também não serve de prova, pois sua feature está desligada. Nenhuma corrupção foi reproduzida. Gate: teste concorrente em dados descartáveis, conferindo arquivo/SHA/revisão, e eventual reserva/bloqueio + escrita exclusiva/atômica. Não alterar documentos já emitidos.

### INT-2 — backup sem snapshot consistente, P1, PROVÁVEL

`BackupService.php:39–42` exporta tabelas e COUNT em leituras separadas, sem snapshot que coordene alterações de negócio. Callers manuais e agendamento não tornam o banco inteiro estável. Checksums comprovam bytes, não relações do mesmo instante. Gate: criar/restaurar cópia sintética com gravação concorrente e verificar FKs, contagens, documentos e saldos; definir snapshot/bloqueio conservador conforme MySQL/MariaDB.

### INT-3 — recuperação banco/arquivos, P1, risco conhecido

`BackupService.php:143–173,281–290` confirma banco antes de aplicar arquivos. Erro de disco/permissão pode deixar etapas de épocas distintas. Backup safety existe; rollback automático não foi localizado. `docs/ARQUITETURA.md` já reconhece a ausência de transação conjunta. Não é falha nova reproduzida: é cenário **PROVÁVEL** a ensaiar em ambiente descartável, com procedimento de recuperação demonstrado.

### Conflitos e controles preservados

- **INDETERMINADO:** Projeto Mestre:343 restringe exclusão de fotos a Master; `routes/api.php:143–144` e `StageSevenTest.php:154–171` aprovam Admin para foto individual. Limpeza em lote segue Master. Exige decisão histórica de produto; não alterar permissões/testes por suposição.
- **INDETERMINADO como decisão de escopo:** Melhorar texto chama OpenAI em `TextImprovementController.php:104`, com config opcional, apesar da proibição geral. Sem chave o app funciona, mas essa função retorna erro seguro. A função aparece nas referências aprovadas; não foi encontrada autorização documental suficiente para resolver a divergência. Não presumir remoção segura nem dependência global do app. Esclarecer antes de ativação em produção; nenhuma chamada paga foi feita.
- **NECESSÁRIO:** middleware de usuário ativo/roles/acesso Gastos; senha de equipamento cifrada/oculta e consulta auditada no-store; upload validado/UUID/fotos <=100 KB; tokens com hash e expiração; constraints e idempotência financeira; migration histórica neutralizada.
- Não há evidência de vazamento multiusuário pelo resumo Todos/Casal: compartilhamento para contas autorizadas é intencional na especificação.
- Varredura de padrões finitos de chaves privadas, GitHub/AWS/Google/OpenAI nos 571 caminhos rastreados não encontrou correspondências. Não leu .env nem inspecionou todo histórico; não equivale a certificado de ausência de segredo. Credenciais de fixture públicas são testes, não credenciais oficiais.

## 8. Dependências desnecessárias

| Dependência | Classificação | Evidência / decisão proposta |
|---|---|---|
| eslint-plugin-react-hooks / eslint-plugin-react-refresh | PROVÁVEL desnecessárias na configuração atual | Declaradas em package.json:31–32, não importadas/configuradas em eslint.config.js. Considerar ativar auditoria de hooks antes de simplesmente retirar |
| React, React DOM, Lucide, Tesseract, idioma português, jsPDF | NECESSÁRIO | Imports/geração OCR e build/testes reais; nenhuma runtime npm comprovada removível |
| laravel/tinker | INDETERMINADO para produção | Comando/provider por auto-discovery; ausência de import não prova inutilidade. Avaliar uso operacional |
| postcss usado por apply-expense-web-mirror.mjs | Risco de dependência transitiva | Ferramenta usa pacote sem declaração direta; funciona com árvore atual do Vite. Tornar contrato explícito se a ferramenta continuar suportada |

Nenhuma dependência foi removida/atualizada. Npm e Composer foram auditados sem instalação/correção automática. Composer no-dev não representa auditoria de desenvolvimento. Ausência de advisory não comprova necessidade do pacote.

## 9. Riscos de remoção e diferenças local/CI

- Os layouts aprovados Original/Clean/Mobile têm entradas e cascatas compartilhadas; remoção deve respeitar ownership, media queries, ordenação e identidade.
- Assets podem estar referenciados em dados/documentos históricos ou URLs externas. Conferir metadados representativos em cópia autorizada, nunca apagar para descobrir.
- Migrations fazem parte do histórico de instalação; “neutralizada” não significa removível. Model/service pode ser descoberto pelo container ou relacionamento.
- Imports podem executar registro de eventos/estilos mesmo sem símbolo consumido. O diff futuro deve separar declaração inativa de efeitos necessários.
- O ambiente local contém **dez casos diagnósticos E2E adicionais** descobertos; a CI limpa contém 252. Isto explica diferenças de quantidade e não prova que os diagnósticos sejam inúteis. Um arquivo histórico temporário já é ignorado nominalmente; esta auditoria não adicionou exclusão.
- TECHNICAL_DEBT menciona interferência entre workers; configuração atual é workers 1 e fullyParallel false. Dados ainda são compartilhados entre casos; melhorar fixtures por identidade, não forçar paralelismo ou remover cobertura.
- Nenhum .env, banco, SQL, vendor, node_modules, build ou resultado de testes foi encontrado **rastreado** na triagem de caminhos. Muitos logs/backups/diagnósticos locais não são patrimônio de release; preservar localmente e controlar explicitamente o pacote, sem git add indiscriminado.

### Backup e evidências

Backup externo desta etapa: `C:\Users\Allan\ARL-backups\auditoria-completa-pr59-20261011-140026`.

Inclui cópia do workspace/.git, patches/staged/status e bundle de histórico validado (83 refs, histórico completo). **11.504 arquivos** copiados: 11.503 tiveram SHA-256 igual ao arquivo fonte; um log preexistente estava em escrita/bloqueado por outro processo. Foi feita cópia por stream compartilhado desse log, com hash do snapshot e destino verificados, registrada em `volatile-files.json`. Não interrompemos esse processo; snapshot de arquivo volátil não garante congelamento de sua escrita posterior. Vendor/node_modules foram excluídos da cópia principal por serem reinstaláveis; locks preservados. Não foi feito backup remoto nem acesso ao servidor oficial.

Evidências sob a pasta externa `evidencias/`:

- `arquitetura-audit.cjs/.json`: 128 nós com hashes, 289 arestas, 18 raízes, 13 funções e inspeções;
- `frontend-css-cache-audit.cjs` / `frontend-css-cache-evidence.json`: 48 CSS, grupos/linhas e simulação;
- `backend.json`, `individual-inspections.json`: achados e lista deduplicada dos 113 arquivos;
- `github-ci.json`, `php-syntax.json`, `secret-pattern-scan.json`;
- `sw-error-diagnostic.cjs/.json`: reprodução isolada do cache de HTTP 500.

Logs externos: `lint.log`, `typecheck.log`, `unit.log`, `build.log`, `npm-audit.log`, `composer-audit.log`, `php-focused.log`, `final-share-csrf-diagnostic.log`, `e2e-focused.log`, `e2e-tracked-list.log`, `e2e-local-list.log`. Teste diagnóstico: `validation/tests/Feature/AuditFinalShareCsrfTest.php`. Evidências não devem entrar em pacote/commit sem revisão de conteúdo.

## 10. Plano de mudanças em etapas, testes e rollback

**Nenhuma etapa corretiva foi iniciada. Aguardar autorização sobre este plano concreto.**

| Etapa | Mudança proposta | Gate de testes | Rollback |
|---|---|---|---|
| A — segurança/carregamento | POST na emissão final-share; cache SW somente de respostas válidas + recuperação/versionamento | PHP com CSRF real, autorização/revisão/expiração/revogação; E2E compartilhar + falha HTTP/upgrade/offline; lint/types/build/unidade; CI completa | Reverter diff revisado e restaurar bundle estático compatível; não remover tokens/histórico. SW exige plano de atualização do cache, não só trocar JS |
| B — consistência | Reproduzir concorrência de termo, snapshot backup e falha banco/arquivos; corrigir somente cenário comprovado | Concorrência MySQL descartável, hashes/revisões/FKs/saldos; restore com erro de disco/permissão e recuperação demonstrada | Restaurar safety em cópia primeiro; mudança de formato exige versionamento/compatibilidade. Nunca testar rollback sobre oficial |
| C — cache e SQL | Conservar savedAt real; agrupar consultas de orçamentos | Relógio controlado, outra sessão, invalidação, quantidade SQL/resultado idêntico; E2E Gastos/OS/documentos | Reverter diff pequeno, sem alteração de dados/schema |
| D — código inativo | Remover somente as 13 declarações confirmadas; revisar imports/whitelists dependentes | Lint/types/build/unidade + OS/clientes/configurações/WhatsApp nos três modos; CI integral | Recuperar declarações pelo patch/backup sem git reset/clean |
| E — CSS/assets/deps | Primeiro mapear cascata/coverage; depois consolidar grupos aprovados e candidatos individualmente | Matriz visual Original/Clean/Mobile/tablet, foco/menus/popups/PDF, paths históricos, build OCR e pacote | Restaurar arquivos/ordem/paths anteriores. Não excluir assets com dependência histórica indeterminada |
| F — escala e documentação | Medir backup/listas/observers; atualizar docs e gates release | Dados sintéticos, SQL/memória/CPU/rede frio-quente; integridade pacote e smoke em cópia | Backup externo por etapa; reversão de código preservando schema e dados |

Antes de cada mudança: novo backup externo verificado do estado daquele momento, revisão dos arquivos locais, diff mínimo, execução das verificações aplicáveis e gate integral. Não usar retries, sleeps arbitrários, exclusões ou mocks financeiros para disfarçar falhas. Uma branch de trabalho futura é opção de isolamento, não autorização de commit/push. Publicação e banco oficial exigem autorização específica posterior.

## 11. O que precisa ser resolvido antes da publicação

1. Corrigir e testar SEC-1 e SEC-2; a CI verde não cobre seus contratos de erro/GET.
2. Demonstrar integridade concorrente e recuperação de documentos/backups (INT-1/2/3); se não reproduzir o risco, registrar cenário e evidência, sem refatoração especulativa.
3. Corrigir PERF-1 com preservação visual/financeira e teste de revalidação.
4. Resolver documentalmente exclusão de foto por Admin e integração opcional OpenAI; não mudar política sem decisão do proprietário.
5. Alinhar gates: `.github/workflows/release.yml` não roda lint nem test:unit, embora `docs/ARQUITETURA.md` afirme que repete lint. CI principal cobre ambos; release manual isolado possui gate menor. Adicionar essas verificações numa etapa autorizada.
6. Atualizar `.env.example:27` e `docs/KINGHOST_DEPLOY.md:63`: BACKUP_RETENTION=7 contradiz config/backup.php:10 e retenção aprovada quatro. Preservar quatro. README Estado ainda cita PR11/CI356; atualizar proveniência, sem apagar histórico.
7. Gerar/extrair/validar um pacote limpo do SHA escolhido; conferir runtime PHP/extensões, MySQL/MariaDB, document root public, HTTPS, cron, armazenamento, restauração isolada e rollback. Workflow atual exclui dados privados e usa vendor no-dev/check-platform/manifesto/SHA, mas artefato novo e KingHost reais não foram validados nesta etapa.
8. Manter smoke real, logo/PDF A4/impressão e Push em aparelhos como gates externos existentes; CI não comprova ambiente oficial nem impressão física.

**CI atual não precisa de reparo:** os quatro jobs já estão verdes. Qualquer correção futura precisará passar novamente pela CI completa. Esta auditoria não libera merge/deploy.

## 12. O que pode ficar para atualizações futuras

- Retirada gradual das 13 funções inativas, consolidação CSS e aposentadoria de enhancers, com testes por superfície.
- N+1 de orçamentos e paginação de A Receber: priorizar conforme volume/medições; antecipar se homologação de escala falhar.
- Streaming de backup e estatísticas agregadas, após medir volume, memória e limites reais.
- Fixture E2E com isolamento por caso/identidade; revisar os dez diagnósticos locais antes de promovê-los.
- Auditoria de hooks/React Refresh, portabilidade dos scripts com caminhos absolutos e dependências transitivas.
- Evoluções funcionais de TECHNICAL_DEBT continuam pendentes próprias; função vazia não as torna concluídas.

### Checklist desta entrega

- [OK] CI #1282 e correspondência local/PR conferidas em leitura.
- [OK] Três subagentes reais e sete perfis aplicados, com evidências e revisão cruzada.
- [OK] Diagnóstico, classificações e plano de mudanças documentados.
- [OK] Backup externo verificado com exceção volátil explicitamente registrada.
- [OK] Verificações locais isoladas descritas acima, sem mudanças de aplicação.
- [PENDENTE] Autorização para correções/limpeza, reprodução concorrente e homologação de release/produção.

Este relatório é diagnóstico de engenharia com limites declarados. Não constitui homologação de produção, autorização de publicação ou comprovação de ausência de defeitos em cenários não executados.
