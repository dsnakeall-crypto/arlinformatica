# Plano obrigatório — ARL extremamente rápido e seguro

**Data:** 10/10/2026
**Status:** trabalho em andamento; NÃO publicado.

## Diretriz principal para ChatGPT, Codex e Claude
A mais alta prioridade agora é desempenho real (clique, navegação, render, rede, servidor), estabilidade e segurança. Layouts aprovados estão congelados (Web Original, Web Clean e Mobile). Não criar funcionalidades adicionais sem necessidade. Buscar a melhor experiência mensurável possível, sem afirmar 100% de ausência de lag em qualquer rede ou carga.

## Regras operacionais
1. O banco MySQL oficial e arquivos privados da KingHost jamais recebem dados de testes, nem são editados sem explicação do risco, backup validado, plano de volta e autorização expressa.
2. Medir frio/quente em PC e celular antes/depois: tempo ao primeiro feedback, tempo até dados corretos, long tasks React, renderizações, quantidade e duração de chamadas HTTP, SQL/EXPLAIN, memória, throughput.
3. Priorizar eliminação de requisições redundantes, navegações intermediárias, cargas repetidas e montagem desnecessária. Preservar consistência de saldos, permissões, histórico, fotos e PDFs.
4. Toda mudança precisa passar em lint, TypeScript, build, frontend/unitário, navegador E2E e backend, com banco de dados descartável; não liberar com teste crítico incompleto.
5. Para problemas complexos, registrar evidências e submeter à revisão independente no Codex/Claude em cima de uma cópia do código, sem tocar produção.

## Primeiro gargalo medido: Controle de Gastos — ordenar
**Antes (primeira medição, carregamento inicial ainda em curso):**
- Requisição `/configuration`: 842 ms
- Requisição `/summary?month=2026-10`: 1.059 ms
- Requisição `/debts?sort=oldest`: 231 ms
- Tempo total do cenário automatizado: 1.773 ms (inclui 450 ms de observação). As chamadas são concorrentes.

**Depois (página totalmente carregada, cenário estável):**
- Requisição `/debts?sort=oldest`: aproximadamente 235–259 ms
- Nenhuma chamada repetida a `/configuration` ou `/summary` ao simplesmente ordenar
- Tempo total do mesmo tipo de cenário automatizado com 450 ms de observação: 717–750 ms.
- **Atenção:** os tempos iniciais e aquecidos não são testes A/B perfeitamente equivalentes; o resultado validado é a redução de três chamadas para uma na interação aquecida, não um ganho percentual universal garantido.
- O teste também comprova **nova consulta de resumo ao retornar à aba Resumo**, preservando atualização financeira.

**Mudança aplicada:** `resources/js/expense-control-page.tsx` guarda configuração somente na memória do componente por até 30 segundos e por revisão, reaproveita resumo apenas enquanto ele não está sendo mostrado e atualiza sempre ao entrar em Resumo. Revisão de dados financeiros invalida ambos. Sem localStorage para saldo financeiro. Não muda rotas, tabelas, layout, permissões ou dados.

**Evidência local:**
- `tests/e2e/performance-network-baseline-20261010.spec.ts` (inclui asserções de ausência de requisições redundantes e atualização de Resumo)
- `output/performance-audit-20261010/expense-sort-baseline-original.json` e `expense-sort-before.json` (último teste)
- `docs/PERFORMANCE_REGRESSAO_20261010_LOG_LOCAL.txt`.
- Lint, typecheck, build e **50/50 testes unitários aprovados**.
- **12/12 testes E2E** aprovados após a mudança, envolvendo fluxo de faturas, Gestor Web, PC responsivo, ícones e atualização de resumo.

## Próximas frentes, por impacto
### P0 — Segurança e benchmark
- Criar matriz de tempos para Painel → Ordens → OS → Clientes → Serviços → Financeiro → Gastos, PC e celular.
- Auditar carregamento inicial, cliques repetidos, montagem de componentes, cache de sessão, spinner e carregamento de assets.
- Completar suíte Feature PHP que, na rodada anterior, ficou bloqueada por operações de disco no DDEV sobre filesystem Windows; **não marcar aprovação total até terminar**.
- Comparar cópia do projeto no filesystem WSL2 com original em /mnt/c, sem mudar nem excluir arquivos base. Testar latência e IO separadamente.

### P1 — React e navegação
- Instrumentar cada troca de tela, abortos de requests, estado de carregamento e renderizações. Corrigir sobreposições, fetch em cascata e espera artificial. Não ocultar carregamento verdadeiro nem erros.
- Auditar imagens, ícones, bundle JS/CSS, service worker/PWA, cache busting e lazy imports.
- Garantir primeiro feedback rápido, mantendo 32px de área clicável dos ícones e acessibilidade.

### P1 — PHP, MySQL e KingHost
- Medir rotas críticas e SQL real com amostra anonimizável/cópia de testes, índices, N+1, paginação, bloqueios e serialização; planejar consultas e OPcache PHP.
- Não adicionar índices/migrations em produção sem revisão de SQL, impacto e plano de volta.
- Medir tempo de resposta HTTP/HTTPS no servidor oficial por **requisições somente de leitura** e com autorização de acesso, separando latência de rede dos gargalos de código.

### P2 — Auditoria de release
- Congelar pacote com manifesto de arquivos e checksum; comparar com versão em produção.
- Backup REMOTO validado, inclusive DB oficial e uploads privados, mais ensaio de restauração isolada.
- Analisar migrations aditivas, regras de autenticação, financeiro e segurança.
- Revisão independente Claude/Codex; homologação humana; autorização final de publicação; smoke test e rollback.

## Resultados NÃO comprovados ainda
- Não foi comprovado que todas as rotas e todos os perfis não têm lag.
- Os objetivos de <=100ms no feedback e <=300ms em navegação aquecida permanecem metas a medir no restante do sistema.
- Não há aprovação para deploy, commit, push ou alteração no banco oficial.

## Primeira varredura dos dez módulos Web (SQLite local descartável)

Ferramenta: `tests/e2e/performance-navigation-modules-20261010.spec.ts`, todos os 10 destinos efetivamente abertos, **1/1 teste aprovado**; detalhes em `output/performance-audit-20261010/navigation-modules-baseline.json`.

| Módulo | Chamadas API observadas | Chamada mais lenta |
|---|---:|---:|
| Painel | 3 | 455 ms |
| Ordens | 1 | 240 ms |
| Clientes | 1 | 226 ms |
| Serviços | 1 | 219 ms |
| Produtos | 1 | 236 ms |
| Fornecedores | 1 | 254 ms |
| Financeiro | 1 | 234 ms |
| Controle de Gasto (primeira abertura) | 2 | 515 ms |
| Pós-Venda | 1 | 224 ms |
| Configurações | 1 | 236 ms |

O teste aguarda intencionalmente 950 ms após cada clique para coletar chamadas. Assim, `elapsedMs` perto de 1 segundo **não representa latência real da navegação** e não deve ser divulgado como tal. As durações acima medem somente solicitações HTTP em ambiente PHP local de testes, não KingHost nem dados oficiais.

**Priorização seguinte:** Painel e primeira abertura de Gastos; verificar traces React (tempo clique→feedback, long tasks), PHP e SQL. Também avaliar recarregamentos por troca de filtros em Ordens/Clientes/Financeiro sem afetar a consistência dos dados.
