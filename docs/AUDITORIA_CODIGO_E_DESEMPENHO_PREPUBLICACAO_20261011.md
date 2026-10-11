# ARL Informática — Auditoria técnica de código e desempenho
**Data:** 11/10/2026 · **Branch:** `prepublicacao/mobile-ci-20261011` · **Ambiente:** Windows/Laragon + Playwright local e CI GitHub

## Regra de segurança
Nenhum acesso/mudança no banco oficial da KingHost. Não executar migrations reais, key:generate, restauração/destruição de bancos ou deploy. PR #59 deve permanecer em rascunho até validação integral.

## Etapa 1 — Entradas e peso real do bundle
- 17 entradas efetivamente usadas na página autenticada, somando aproximadamente 379 KB de JavaScript e 274 KB de CSS estáticos compilados (não comprimidos, *excluindo chunks carregados sob demanda*). Esses números NÃO equivalem a tempo de carregamento e não demonstram sozinhos lentidão.
- 81 módulos JS/TS examinados pelo grafo de importação. Na versão inicial, nenhum arquivo JS/TS foi provado órfão apenas por análise estática. Portanto, não apagar indiscriminadamente arquivos pelo nome/idade.
- 50 arquivos CSS examinados, aproximadamente 710 KB de fontes. `resources/css/mobile-v2.css` não tinha referências nas entradas/importações e foi retirado. Backup fora do projeto; hash do manifesto Vite antes/depois dessa remoção foi idêntico.
- Duas entradas `resources/js/theme.ts` e `resources/css/theme.css` constavam no Vite, mas não eram usadas por nenhum Blade/importação/dinâmica no código de aplicação examinado. Foram removidas do Vite e excluídas do controle de versão, com backup local. O manifesto novo não as publica.

## Etapa 2 — Processamento global e DOM
- 17 instâncias de `MutationObserver` localizadas no código original. Vários módulos são registrados globalmente em `app.blade.php`, mesmo quando o usuário navega em outra seção. Isto gera trabalho potencialmente redundante, mas o ganho de milissegundos ainda não foi medido.
- Cinco scripts legados receberam agrupamento de atualização por quadro (`requestAnimationFrame`) e verificações rápidas de escopo quando cabíveis: `brand2026-access.ts`, `client-search.ts`, `new-order-search.ts`, `order-maintenance.ts`, `order-workflow.ts`. Arquivos originais guardados fora do projeto.
- Outro observador de `brand2026.ts` já havia sido agrupado na revisão anterior da PR. Não excluí scripts legados que ainda podem atender fluxos existentes.
- Regressão Desktop/Mobile de navegação selecionada **21/21 aprovada** depois da primeira camada de alterações.

## Etapa 3 — Carregamento e consultas duplicadas no Painel
- Descoberto carregamento redundante: `Dashboard` solicitava `/api/orders/desk` **e** `/api/orders?tab=closed_week...` no Mobile, enquanto `mobile-home.ts` requisitava `/api/orders/desk` novamente para exibir a lista real.
- Corrigido `dashboard-page.tsx`: quando o dashboard React está oculto pelo layout mobile, ele não dispara as duas consultas desnecessárias, mantendo as consultas desktop e a transição entre layouts.
- Testes de instrumentação adicionados em `dashboard-loading-regression.spec.ts` e `dashboard-loading-regression.mobile.spec.ts`: **2/2 aprovados**; mostram **1 requisição ao desk e 0 ao closed_week no Mobile** e consultas disponíveis no Desktop.
- Este ponto elimina requisições comprovadamente redundantes no Mobile; não há medição suficientemente controlada para alegar ganho de tempo em percentual.

## Etapa 4 — PHP, MySQL e riscos de escalabilidade
- 87 arquivos PHP em `app/` varridos estaticamente, com 15 pontos de paginação e 127 ocorrências de `->get()` (incluem Collections/arquivos e consultas limitadas; NÃO são 127 problemas SQL). Nenhum uso `::all()` de Eloquent foi encontrado na varredura.
- `ClientController::index()`: pagina clientes e limita `per_page` a 100; opção antiga `all=1` continua disponível para compatibilidade e merece controle/monitoramento se exposta a buscas amplas.
- `ServiceOrderController::index()`: pagina até 100, mas `desk()` carrega todas as OS abertas. Com a expansão dos dados, medir o tamanho de resposta/latência antes de decidir paginação da Mesa de Chamados (sem esconder OS).
- `ClientController` usa `LIKE '%texto%'` em campos para pesquisa por trecho; índice B-tree tradicional pode não acelerar buscas com curinga inicial. Não alterar sem desenho de busca compatível e EXPLAIN no MySQL de staging.
- `BackupService` serializa dados de tabelas inteiras em memória durante geração de cópias; identificar consumo e limites da hospedagem antes de confiar em backups muito grandes. **O backup oficial ainda exige verificação de restauração**, sem tocar no banco produtivo.
- Existem índices para `clients.name`, `phone`, `service_orders.status`, `received_at`, `completed_at` e relações financeiras na estrutura versionada. Isso não substitui medir consultas reais no ambiente de destino.
- **Não houve mudanças de PHP/migrations nesta rodada**, para evitar regressões financeiras/destrutivas sem dados reais ou perfil de staging.

## Etapa 5 — Regressão e GitHub
- Última CI antes desta auditoria: workflow https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/38141945959 — PHP/SQLite, PHP/MySQL 8 e Frontend aprovados; E2E reprovado em quatro casos.
- Quatro cenários corrigidos/validados localmente: importação CSV (menu Mobile existente), volume integrado (submenus de Pagamentos), fornecedores (resumo financeiro Mobile em lugar do cartão antigo) e homologação visual (lixeira não exibida no Mobile, preservada no Desktop).
- Testes direcionados desses casos passaram localmente; regressão global CI deve ser repetida após commit e push.
- Lint, TypeScript, testes unitários e build foram aprovados após as modificações de código. Na última compilação, os recursos não utilizados de tema deixaram de aparecer no manifesto.

## Evidências e backup
`C:\Users\Allan\ARL-backups\pre-e2e-mobile-20261011`
- `audit_performance_baseline.json`, `critical_path.json`, `audit_php_queries.json`, `audit_unreferenced_modules.json`;
- `audit_observers_originals\`, `audit_unused_css\`, `audit_unused_theme\`;
- `audit_browser_smoke.log` (21 aprovados), `audit_requests_r2.log` (2 aprovados), `audit_supplier_r2.log`, `audit_volume_visual_r2.log`, `audit_clean_*.log`.

## Critério de saída
1. Commit/push apenas do código revisado e deste relatório, mantendo diagnósticos/logs/segredos fora do GitHub.
2. CI GitHub totalmente verde nos quatro jobs (incluindo E2E). Não mascarar falhas para forçar aprovação.
3. Antes de publicar: confirmar recursos reais PHP/MySQL da KingHost, executar e validar backup/restauração privados com autorização, preparar rollback e somente então publicar.
4. Ajustes adicionais de otimização em banco e consolidação de CSS dependem de medição em staging e testes de compatibilidade; não deletar código legítimo só por ele ter nomes antigos.
