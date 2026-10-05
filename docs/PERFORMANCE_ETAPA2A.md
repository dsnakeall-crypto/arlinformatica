# Performance — Etapa 2A

Implementação iniciada em 04/10/2026, a partir de `origin/main` (`ba217f5`), na branch `codex/performance-etapa2a`. Finalização em 05/10/2026. Sem publicação.

## 1. Commits e 2. Arquivos por commit

| Commit | Entrega | Arquivos |
| --- | --- | --- |
| `024020e` | Infraestrutura em memória | `resources/js/session-memory-cache.ts`, `resources/js/cache-requests.ts`, `resources/js/cache-boundary.tsx`, `tests/frontend/session-memory-cache.test.mjs` |
| `2ff60d4` | Proteção de consultas e invalidação explícita | `resources/js/session-memory-cache.ts`, `resources/js/cache-requests.ts`, `tests/frontend/cache-requests.test.mjs` |
| `d0791cb` | Lista e estado de Clientes | `resources/js/clients-page.tsx`, `resources/js/client-import.tsx` |
| `ee4e98c` | Lista de Ordens, ciclo de sessão e auxiliares | `resources/js/main.tsx`, `resources/js/order-detail-react.tsx`, `resources/js/order-editor-unified.tsx`, `resources/js/session-security.ts` |
| `cee8a9e` | Retenção a partir da saída da lista e relógio atual | `resources/js/session-memory-cache.ts`, `resources/js/clients-page.tsx`, `resources/js/main.tsx`, `tests/frontend/session-memory-cache.test.mjs` |
| `c8d18ca` | Cenários de navegação, mutação e isolamento | `tests/e2e/performance-stage-two.spec.ts`, `tests/frontend/cache-requests.test.mjs` |

O commit de documentação contém este relatório, `docs/PROJETO_MESTRE.md` e `CHECKLIST_FINAL.md`. Seu hash consta da entrega final e do histórico Git.

Alterações anteriores em `vite.config.ts`, arquivos de testes/armazenamento, caches gerados e arquivos não rastreados foram preservadas e não incluídas nos commits desta entrega. Nenhum `git add .` foi utilizado.

Para retorno do código, a base anterior é `ba217f5`; os commits desta branch podem ser revertidos na ordem inversa, preservando as alterações locais anteriores. ZIP, patch e bundle externos permitem recuperar arquivos e histórico. Como não houve publicação nem mudança no banco em uso, esta entrega não exige rollback de produção ou restauração de dados.

## 3. Arquitetura

`SessionMemoryCache` usa Maps em memória, sem dependência externa. Cada entrada contém recurso, valor, timestamp, último uso, política e marca de invalidação. A chave combina identidade, geração, recurso e parâmetros ordenados. Há leitura, gravação com ticket, atualização local, invalidação por chave/assunto, revogação e limpeza total.

Limite de 128 entradas, descarte LRU e retenção por inatividade. A saída de uma lista registra seu último uso sem renovar o TTL; assim uma lista mantida aberta por minutos continua disponível para apresentação ao retornar. Entradas vencidas deixam de ser reutilizadas; a limpeza é feita nas leituras/gravações, sem timer permanente. Os tickets de consultas também são limitados a 128. A infraestrutura pode ser removida retirando os módulos e suas chamadas explícitas.

Ordens guarda somente campos necessários à apresentação da lista, seu valor original e metadados de paginação/contadores. `paid_cents`, saldos, pagamentos, senhas, laudos completos, fotos e tokens não entram nessa apresentação. Detalhes, pagamentos e decisões financeiras continuam consultando o backend. O valor original exibido na listagem não é um saldo cacheado nem autoriza uma operação.

Não há interceptador global novo. Os helpers existentes das telas chamam o módulo explicitamente. O mecanismo de segurança de sessão que já existia recebeu apenas dois eventos de ciclo; seu comportamento de não repetir operações foi preservado.

## 4. Isolamento por usuário

Antes de apresentar as listas cacheadas, a aplicação confirma `/me`. A identidade contém ID, papel e nonce local, além da geração. `CacheBoundary` oculta o conteúdo durante a verificação e remonta o consumidor quando muda a identidade/geração. Também protege Clientes no cadastro rápido da Nova OS.

Ao voltar de uma aba oculta, a aplicação confirma a sessão e a identidade novamente. A substituição do token de sessão detectada nessa confirmação limpa o cache; o token em si não é gravado no cache ou nas chaves. A autorização continua sendo aplicada exclusivamente pelo backend.

BroadcastChannel transmite somente nomes de assuntos invalidados e a instrução de limpeza. Não transmite clientes, OS, tokens, senhas ou outros dados pessoais. Abas diferentes têm seus próprios Maps. Em navegadores sem BroadcastChannel, cada aba continua isolada; a confirmação ao voltar à aba permanece ativa.

## 5. Geração e concorrência

Logout, expiração (401/419), troca de identidade e limpeza total avançam a geração. Uma consulta possui geração, versão do recurso e sequência da chave. Para gravar, todos precisam continuar válidos. A invalidação rejeita também respostas iniciadas antes da mutação confirmada.

Clientes/Ordens cancelam consultas anteriores com AbortController. Uma resposta fora de ordem ou de uma sessão anterior não modifica o cache nem a lista. Os auxiliares rejeitam respostas obsoletas com AbortError. 403 remove o recurso afetado em vez de manter dados cuja leitura foi recusada.

## 6. Políticas

| Recurso | TTL | Retenção máxima sem uso |
| --- | --- | --- |
| Clientes `/clients?all=1` | 30 segundos | 2 minutos |
| Ordens por aba/busca/página/tamanho | 15 segundos | 2 minutos |
| Estado visual de Clientes e Ordens | Sem TTL de dados | 2 minutos |
| Equipamentos, fabricantes, checklist e configuração operacional | 5 minutos | 10 minutos |

TTL é conferido ao consultar/retornar à tela. Não foi acrescentado polling. Invalidação após uma mutação prevalece sobre qualquer TTL ainda fresco.

## 7. Invalidações

Somente respostas HTTP 2xx de mutações disparam invalidação. Erros de validação não descartam cache válido.

| Operação confirmada | Assuntos |
| --- | --- |
| Criar, editar, excluir ou importar cliente | clients, orders, dashboard |
| Criar/editar OS, itens, status, conclusão, interrupção, reabertura, exclusão, pagamento, estorno e demais mutações `/orders/...` | orders, dashboard |
| Alteração de foto da OS e ajuste confirmado de transação relacionado à OS | orders, dashboard |
| Criar/editar/ativar/desativar equipamento | equipment |
| Criar/editar/ativar/desativar fabricante | manufacturers |
| Criar/editar/ativar/desativar opção de checklist | checklist |
| Salvar `/settings` | operational-settings |

As chamadas financeiras não recebem cache ou mudança de regra. O helper apenas invalida a apresentação de Ordens após um ajuste confirmado. `dashboard` é um assunto relacionado; não foi criado cache dos dados do Painel nesta etapa. Os callbacks de atualização dos contadores da Etapa 1 continuam existentes.

Clientes com resposta confiável de criação/edição/exclusão também atualizam a entrada em memória imediatamente, mantendo-a stale até a nova consulta. Isso impede que um retorno durante o refresh ressuscite um registro editado/excluído.

## 8. Clientes antes/depois

Antes: remontagem consultava a lista inteira e recomeçava pesquisa, ordem e paginação. Durante carregamento a lista desaparecia.

Depois: lista completa e estado visual são recursos separados. O retorno dentro do TTL apresenta a lista sem outra consulta. Se stale, apresenta a lista anterior e atualiza em segundo plano. Pesquisa, ordenação, página e tamanho permanecem. Loading normal somente sem dados; falha de refresh mantém as linhas e mostra erro.

Mantida a paginação no navegador e `/clients?all=1`. As buscas parametrizadas da Nova OS continuam independentes e não usam essa entrada.

## 9. Ordens antes/depois

Antes: remontagem recomeçava aba/busca/página e refazia a consulta, substituindo as linhas por loading.

Depois: retorno restaura aba, texto digitado, termo efetivo, página, tamanho, resposta e metadados da combinação exata. Consulta stale mantém linhas e indica atualização. Mudança deliberada de aba/busca/tamanho mantém as regras anteriores de paginação. Atalhos que pedem uma aba específica continuam respeitados.

Não foi restaurada posição de rolagem: ela depende do contêiner compartilhado da aplicação e não foi necessária ao ganho desta etapa. O botão Voltar do detalhe da OS continua com seu destino anterior, sem alteração.

## 10. Auxiliares

Allowlist exata: `/catalogs/equipment`, `/catalogs/manufacturers`, `/catalogs/checklist`, `/operational-settings`. Todos os parâmetros da URL integram a chave, inclusive filtro de equipamento do checklist e consultas administrativas `active=0`.

Uma consulta fresca reutiliza dados. Uma vencida/inválida aguarda a resposta atual, evitando que a edição de um catálogo deixe seu formulário com opções antigas. Consultas idênticas simultâneas sem sinal próprio compartilham a Promise; chamadas com headers/body próprios passam pelo caminho normal. Não foi aplicado stale-while-revalidate a auxiliares que alimentam formulários; nas listas de Clientes/Ordens ele está ativo.

Não entram itens/estoque, saldos, pagamentos, prévias, senhas, links protegidos, Financeiro, Controle de Gasto, Fornecedores ou Pós-Venda.

## 11. Validação

- Suíte frontend: **36 testes aprovados**, incluindo 14 de cache/isolamento/concorrência/invalidação/comunicação entre abas/relógio/retenção da lista ativa.
- TypeScript e ESLint: aprovados, sem erros ou warnings de lint.
- Backend relevante: **39 testes, 431 assertions aprovados**, em SQLite de testes; Clientes/importação, sessão, catálogo, fluxo/reabertura/itens de OS e contadores da Etapa 1.
- Regressão E2E: **47 cenários aprovados**, sem retries; Clientes, Etapa 1, Ordens, contratos de status, detalhe, sessão, navegação e Mobile.
- Rodada final: **26 cenários aprovados**, incluindo os 10 testes E2E novos de cache, Etapa 1, Nova OS, sessão e Mobile. Somando os cenários distintos das execuções, **51 E2E relevantes aprovados**. Não é uma execução da suíte E2E inteira.
- Capturas de Clientes em refresh e Ordens restauradas revisadas; aparência geral preservada. As telas mobile existentes também passaram nos testes de viewport, navegação, formulário e modais.
- `git diff --check`: aprovado para a entrega. Nenhuma mudança PHP, migration, rota ou schema foi incluída.

Os testes usam gates de respostas e relógio do Playwright; os novos testes não usam sleeps/waitForTimeout ou retries para encobrir corridas. Seletores do teste foram corrigidos para os nomes reais de botões e para distinguir os dois atalhos Nova OS. TTL de auxiliares é medido depois da consulta inicial, não antes do login.

### Cobertura dos 15 cenários solicitados

| Cenário | Evidência |
| --- | --- |
| 1. Clientes entrar/sair/voltar com estado | E2E restaura pesquisa, ordenação, página e tamanho, sem novo GET fresco |
| 2. Clientes stale visível + nova resposta | E2E controla refresh, erro e recuperação com resultado atualizado |
| 3. Criar/editar/excluir cliente | E2E de mutações + unitário de importação/mapeamento |
| 4–6. Aba/busca/página de Ordens | E2E preserva Finalizadas, dell, página 2 e 30 por página |
| 7. Chaves separadas | Unitário de parâmetros canônicos + E2E troca de aba |
| 8. Mutação invalida Ordens | E2E de status + unitário dos caminhos de operações |
| 9–10. Logout/expiração | Unitários de limpeza 401/419/logout + E2E de sessão existente |
| 11. Resposta pré-logout não repopula | Unitários de geração e auxiliar pendente |
| 12. Usuários isolados | E2E troca identidade durante GET pendente + unitários |
| 13. Busca antiga não sobrescreve nova | E2E com gate na busca antiga + unitário de sequência |
| 14. Auxiliares TTL/invalidação | Unitários de limite exato de 5 minutos/mutações e E2E Nova OS |
| 15. Loading inicial/refresh | E2E mantém linhas e mostra loading somente antes da primeira resposta |

## 12. Build

Build de produção aprovado, com 1.683 módulos transformados. Bundle principal aproximadamente 424,9 kB / 110,6 kB gzip. Artefatos preparados localmente, sem copiar arquivos para KingHost. Nenhuma nova dependência ou processo Node permanente.

## 13. Riscos e limites

TTL admite informação de apresentação temporariamente anterior quando a mudança ocorreu em outro navegador/dispositivo. Mutações nesta aplicação invalidam imediatamente; não foi adicionado mecanismo de tempo real. Operações de negócio continuam confirmadas no backend, com consultas financeiras sem cache.

Ao recarregar a página, toda memória é perdida, por desenho. Enquanto a identidade não puder ser confirmada, as listas cacheadas ficam ocultas. Não se promete funcionamento offline. Listas antigas podem aparecer enquanto o refresh está pendente; indicador discreto informa isso.

Esta é uma mudança de frontend. Não foram repetidos os testes completos MySQL/MariaDB nesta etapa sem alteração SQL/backend; a compatibilidade do backend pertinente foi verificada com sua suíte existente isolada. A CI remota deve ser consultada antes de qualquer publicação futura. Não há promessa de percentual de ganho ou medição de latência em produção.

## 14. Medir futuramente na KingHost

Somente após autorização de publicação: waterfall e número de GETs no retorno fresco/stale; tempo até aparecer primeira linha; p50/p95 das respostas frias/quentes; tamanho real de `/clients?all=1`; paginação/busca de Ordens com volume real; consumo de memória do navegador; confirmação de sessão ao voltar de outra aba; alterações simultâneas entre abas/dispositivos. Separar ganho de apresentação no navegador de tempo de execução PHP/MySQL e rede.

## 15. Preservação e escopo

Backup externo anterior às edições: `C:/Users/Allan/ARL-backups/performance-etapa2a-20261004-233231`. ZIP com 2.102 arquivos verificados por SHA-256/CRC, manifesto, patch/estado local e bundle do histórico Git verificado. Backups anteriores preservados; credenciais/SQLs/arquivos privados não entram nos commits.

Testes em cópia externa `test-source`, banco E2E descartável e SQLite em memória do PHPUnit. Banco de negócio local não foi migrado ou usado para simulações. Conferência de 312 arquivos protegidos do backup (incluindo `.env`, SQLite existente e `storage/app`) não encontrou alterações. Artefatos preexistentes de teste foram restaurados do backup quando necessário.

- Nenhuma migration criada ou aplicada ao banco em uso; migrations já existentes foram executadas somente na base descartável E2E.
- Banco/schema em uso preservados. Nenhuma operação no servidor original.
- Financeiro, Controle de Gasto, Pós-Venda e Fornecedores: regras e telas não alteradas; nenhum cache acrescentado a esses módulos.
- Service worker, enhancers, MutationObservers e aparência geral: não alterados.
- Nenhum dado desta solução gravado em localStorage, sessionStorage, IndexedDB ou outro cache persistente.
- Sem cache de pagamentos/saldos, estoque crítico, tokens/senhas ou detalhe completo da OS.
- Nenhuma biblioteca adicionada; nenhum prefetch global, nova autenticação backend ou alteração do Voltar da OS.
- Nenhum deploy realizado.

### Evidências locais

Logs no backup externo: `frontend-tests.log`, `backend-tests.log`, `build-final.log`, `build-workspace.log`, `e2e-final.log` (47 aprovados), `e2e-cache-final.log` (26 aprovados na rodada final). Capturas e traces ficam em `test-source/test-results`. São evidências de ambiente isolado, não benchmarks nem operações de produção.
