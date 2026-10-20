# Painel, desempenho e CI — missão de 20/10/2026

## Estado inicial e proteção

Branch `release/integracao-completa-20261018`, HEAD inicial `8280da1c799846e5c4b0cd120cc6f410ddb88088`. Preservados os 18 testes rastreados já modificados, documento de continuidade e arquivos não rastreados. Não houve acesso à KingHost, SSH, banco oficial ou TERRAPLAN. Push autorizado pelo proprietário somente após revisão e validação; deploy proibido nesta missão.

Backup anterior à edição: `C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 20-10-26 - 16-13/ARL-ANTES-PAINEL-PERFORMANCE-CI.tar.gz`, 5.220 entradas, SHA-256 `20240327c8278c9024d054f3b0fea613128fcfea2eaee0a704823380f87068b0`. TAR listado integralmente com sucesso, contém `.git/HEAD` e fonte do Painel; dependências regeneráveis vendor/node_modules e resultados temporários dos runners excluídos. Código, histórico, alterações locais, privados e demais arquivos incluídos. Recuperação deve extrair em pasta separada e comparar antes de restaurar qualquer arquivo.

Uso informado pelo proprietário ao iniciar: 100% disponível. Ferramenta não expõe indicador de consumo em tempo real; não inferir percentuais posteriores.

## Etapa 1 — alteração autorizada

Removidos do Dashboard a seção Fechadas recentemente, descrição, botão Ver finalizadas, divisor exclusivo, estado e renderização dos registros fechados. JSX/classes/textos dos quatro indicadores e da tabela Ordens em andamento preservados. Nenhum CSS alterado.

O rótulo Concluídos mantém a regra anterior: **completed e interrupted desde o início da semana em America/Sao_Paulo, excluindo soft deletes**, independentemente de pagamento ou arquivamento. Não equivale à aba Finalizadas. Novo GET autenticado `/api/orders/dashboard-summary` reutiliza `applyTabFilter('closed_week')` e executa COUNT, sem joins de pagamentos, hidratação ou relações. Endpoint de Mesa permanece inalterado. Cache continua por sessão, com abortamento e invalidação existentes.

Contrato E2E de status mantém criação, persistência, histórico, interrupção e pagamento; acrescenta classificação exclusiva em progress/awaiting_payment/finalized/interrupted e presença em all, além da ausência da seção removida. Novo E2E verifica contador e ausência do GET de registros fechados.

## Evidências iniciais

Navegador Chromium, localhost, SQLite descartável `database/e2e.sqlite`, privados separados pelo launcher E2E. Primeiro baseline usou PHP 8.4.25 do PATH; validações posteriores explicitam PHP 8.3.33 do Laragon. Não comparar diretamente runtime diferente como ganho de performance. Nenhum banco MySQL foi usado nesta medição.

Massa sintética inicial: uma OS aberta, três concluídas (uma paga e duas pendentes). Capturas e JSONs antes/depois na pasta externa do backup. Computed styles dos textos remanescentes dos indicadores/tabela idênticos em 1280, 1366 e 1920 px, com resize 1920→1366→1280→1920 na mesma sessão. Captura posterior de 1366 inspecionada visualmente.

| Medida | Antes | Depois | Limite |
|---|---:|---:|---|
| Corpo JSON semanal | 4.175 bytes | 20 bytes | Três fechadas; sem extrapolar para produção |
| Transferência registrada | 4.475 bytes | 320 bytes | Inclui overhead de resposta |
| Duração da chamada no browser | 406,6 ms | 956,6 ms | Uma amostra, concorrência/servidor embutido; não demonstra aceleração |

A redução de payload é comprovada; latência ainda precisa de série repetida e diagnóstico de runtime/filas. Não declarar metas de 100/300 ms atingidas com essas amostras.

Revisão independente estática confirmou escopo, contador, autenticação e cache. Apontou fixture `archived` fora de fillable; corrigida para forceFill/save e asserção de persistência.

Validação inicial: 8 testes PHP / 65 assertions em PHP 8.3.33 Laragon, SQLite em memória; Pint dos três arquivos PHP; 66 testes frontend; ESLint, typecheck e build aprovados. Build mantém avisos preexistentes de assets resolvidos em runtime. E2E direcionado em andamento; suíte integral, performance geral e CI ainda pendentes.

## Gates

## Etapa 2 — diagnóstico e experimento do carregador

Script reexecutável externo `navigation.cjs`, JSONs `navigation-baseline.json` e `navigation-depois.json`. PHP 8.3.33 Laragon, loopback 8061, Chromium 1440×900, mesmo SQLite descartável, sem throttling, três passagens por sete módulos. Contagem de APIs, tempos de recursos e heap registrados; feedback medido da captura do clique ao primeiro frame com botão ativo. Tela utilizável medida pelo heading correto, saída dos estados de carregamento observados, término das APIs e frames. Essa instrumentação inclui overhead do Playwright e não equivale a benchmark de CPU puro nem cobre todos os estados de negócio.

Chunks da primeira navegação levaram 7–15 ms; montagens consumiram 330–364 ms. Código instalado em `react-dom-client.production.js` contém `globalMostRecentFallbackTime + 300 - now()` no caminho de revelação após fallback. Experimento alterou apenas `lazy-screen.tsx`: importação sob demanda compartilhada com commit direto do módulo resolvido, mantendo JSX do skeleton, tempo de exibição do aviso, error boundary, botão de tentativa, carregamento de diálogos somente quando abertos e descarte de atualizações após desmontagem. Não há preload geral, cache adicional de dados ou alteração de CSS/fluxos.

| Módulo | Primeiro uso antes (ms) | Primeiro uso depois (ms) | Retornos depois (ms) |
|---|---:|---:|---:|
| Ordens | 563 | 264 | 65 / 65 |
| Serviços | 564 | 233 | 230 / 229 |
| Clientes | 580 | 271 | 62 / 62 |
| Pós-venda | 580 | 298 | 280 / 263 |
| Financeiro | 614 | 281 | 264 / 265 |
| Controle de Gastos | 730 | 480 | 448 / 431 |
| Painel (já aberto no login) | 224 | 231 | 230 / 230 |

Feedback antes 12,8–14,8 ms; depois 12,5–15,5 ms. Ordens/Clientes aquecidos realizaram zero APIs por cache já existente. Serviços/Pós-venda/Financeiro continuam consultando dados; Gastos fez duas APIs por abertura. Não introduzido cache financeiro para reduzir esse custo. Estes resultados locais não garantem 100/300 ms em rede, dispositivo físico, base volumosa ou produção.

OS após experimento: 992/970/923 ms até todas as consultas observadas terminarem, com detalhe seguido por catálogo, orçamentos e pagamentos; primeira visita também consulta configuração operacional. Servidor PHP embutido local atende em série: cada consulta individual ronda 175–190 ms, mas a última pode acumular 518–718 ms de fila. Duas visitas incluem consulta periódica de notificações. Falta baseline equivalente da abertura da OS anterior ao experimento; não declarar ganho específico de OS.

Instrumentação PHP somente leitura `sql-readonly.php`, explicitamente bloqueada fora de testing/SQLite/e2e.sqlite: boot 240,37 ms; handler do agregado 0,49 ms / SQL 0,18 ms. EXPLAIN SQLite usou `service_orders_status_index`. Massa pequena dessa coleta não contém fechadas: consulta antiga fez só COUNT (1 query, SQL 0,34 ms, handler 51,72 ms incluindo primeiro aquecimento de classes). Não usar esses números como comparação de escala. Não há evidência que justifique novo índice; não alterar MySQL/produção por suposição. EXPLAIN MySQL e análise com volume representativo permanecem pendentes.

Teste de regressão após experimento: **9 Playwright aprovados em 36,4 s**, incluindo lazy loading, download lento/erro, navegação durante espera, Dashboard e home Mobile; lint, build/typecheck e 66 frontend aprovados. Registros externos `e2e-lazy-regressao.log` e `build-lazy.log`. Revisão independente em andamento. Documentação React consultada porque Context7 não possui ferramenta disponível nesta sessão: https://react.dev/reference/react/useEffect e https://react.dev/reference/react/lazy.

Limitações: sem celular físico, sem medição de rede de produção, sem React Profiler por commit e sem EXPLAIN MySQL nesta rodada. Mudança não declara auditoria ampla finalizada. Backend de OS ainda pode reduzir dependências, mas requer análise funcional e medições adicionais; não sacrificar atualização dos pagamentos.

Os recursos da série de navegação têm transferSize zero em vários chunks, compatível com cache do navegador/service worker. Portanto, primeiro uso significa primeira montagem do módulo naquela sessão autenticada, **não rede totalmente fria**. O código do módulo ainda não estava montado, e a comparação da penalidade de revelação é válida nesse cenário; o resultado não mede download em conexão lenta.

Revisão independente de `lazy-screen.tsx`: nenhum bloqueio identificado; cancelamento lógico, compartilhamento de código e boundary mantidos. Retry após falha do mesmo URL merece investigação específica porque o navegador/Vite podem conservar rejeição; limitação também existia anteriormente. Não alegar esse fluxo como homologado.

Suíte PHP integral: 411 testes / 7.546 assertions PASS, 1 min 14,7 s, SQLite em memória/PHP Laragon 8.3.33. Benchmark existente de Pós-venda com 3.000 registros sintéticos registrou 9,30 ms e quatro SELECTs relevantes. Sem acesso a produção.

## Etapa 3 — CI em correção

Log oficial do job E2E recuperado pela API GitHub após duas falhas Transport closed no conector. Autenticação pelo helper Git local, capturada somente em memória e nunca exibida. Matriz oficial com as 65 falhas em `docs/MATRIZ_CI_E2E_20261020.md`; log bruto no backup externo. Última CI confirmada continua vermelha.

Rodada integral local iniciada antes dos ajustes seguintes. As falhas já concluídas estão sendo corrigidas em lotes durante o diagnóstico; esta rodada não é a homologação final de um snapshot congelado. Será necessário reteste integral com a árvore final estável.

Ajustes em progresso: teste legado adicional do Painel que ainda exigia closed_week; login do perfil financeiro validado pelo seu próprio cabeçalho, com ausência explícita do sino; caminhos atuais de Gastos por responsável/instituição; margem do dock aprovada de 8 px; testes de resize adaptados à regra autorizada em 19/10 (troca automática ao cruzar 1024 px). Teste de impressão passa a comparar o PDF real emitido antes/depois do tema em vez da moldura/sidebar da SPA no modo print. Pagamentos, valores, histórico, CSRF e permissões continuam exigidos.

- Etapa 1: seis cenários de status/histórico/pagamento aprovados. Primeiro E2E do agregado falhou por capturar resposta do documento anterior ao reload (Protocol error Network.getResponseBody); sincronização corrigida aguardando tabela inicial. Reteste do agregado e diagnóstico legado: dois aprovados em 14,2 s, sem retries/timeouts extras. Trace da falha preservado externamente.
- Etapa 2: diagnóstico amplo e otimizações ainda pendentes.
- Etapa 3: CI integral ainda não corrigida/verificada.
- Etapa 4: sem commit/push nesta anotação; não considerar missão concluída.

### Validação adicional e revisão dos testes

MySQL 8.4.3 do Laragon: **411 testes / 7.546 assertions PASS em 2 min 38,2 s**. Instância nova, exclusivamente loopback `127.0.0.1:33462`, datadir externo `mysql-isolado`, schema `arl_test_audit_20261020`, PHP 8.3.33. Host, porta, datadir e processo conferidos. Não foi usada a instância habitual da máquina nem qualquer conexão remota. Após a suíte e o EXPLAIN, somente essa instância foi encerrada com mysqladmin. Logs e identificação no backup externo.

EXPLAIN MySQL do COUNT semanal: acesso `range` pelo índice existente `service_orders_completed_at_index`, `Using index condition; Using where`. Tabela vazia após rollback dos testes: estimativa de uma linha, sem valor como benchmark de volume. Nenhum índice ou migration foi alterado. O benchmark integrado de Pós-venda registrou 31 ms e quatro SELECTs; seu rótulo histórico contém SQLITE, mas esta execução usou MySQL conforme configuração explícita.

Revisão independente dos testes financeiros examinados: valores, parcelas, pagamentos, saldos e histórico preservados. No teste de temas, a comparação do PDF real emitido substitui a antiga comparação de CSS print da moldura da SPA; não são coberturas equivalentes. No teste de segurança do popup mobile, hit-test de Salvar + POST real e navegação posterior substituem expectativas de pointer-events do dock antigo.

Medição somente leitura do menu Original em 1280 px: lateral 240 px, clientWidth 238 px, botões de x=16 até x=222, contadores de cinco dígitos contidos. O scrollWidth de 282 px decorre exclusivamente da marca com `scale(1.55)` definido em `orders-reference-gold-20261014.css`; overflow-x é hidden e hit-test além da lateral retorna MAIN. O teste passa a exigir recorte efetivo, ausência de overflow da página e contenção dos controles, preservando o layout aprovado. Margens comparadas na caixa interna descontam a borda de dois pixels.

Commits locais já criados: `7ce1e56` (Painel/agregado) e `2f732ae` (carregamento de telas). Sem push até esta anotação. Lint/typecheck passaram novamente após o lote de testes. Reteste direcionado em execução com outro SQLite e storage privados, ambos externos, porta 8070 e resultados separados da rodada integral diagnóstica. As duas execuções locais simultâneas não constituem benchmark de performance.

Primeiro reteste direcionado concluído: **31 E2E PASS em 4 minutos**, incluindo saldos individuais, parcelas, quitação, isolamento de perfil, impressão PDF, popup financeiro, menu lateral e restauração do Maps entre temas. Commit local `d3ec46e` contém somente os nove arquivos de testes/helper validados. Acrescentada cobertura explícita do novo agregado para os perfis Controle de Gasto (403) e Usuário local (200): três testes do endpoint/17 assertions PASS e Pint aprovado; commit `eae9f32`.

Causa de instabilidade de captura reproduzida em script somente leitura: screenshot fullPage com seleção de Pós-venda provoca resize transitório Chromium para **1×1**, seguido de 1280×720. O evento matchMedia mobile ativa o redirecionamento autorizado de Pós-venda ao Painel. Evidência `postsale-screenshot-repro.json`: URL `/post-sale` antes do evento e `/` depois, sem escrita de dados. As duas capturas intermediárias desse teste agora preservam o viewport; todas as verificações de cancelamento, exclusão única, OS, PDFs e card não selecionado permanecem. Reteste desse cenário: PASS em 28,8 s, sem aumentar timeout.

Revisão adicional reforçou verificações de destino por URL em cada navegação responsiva, persistência Clean ao retornar ao desktop, palette e migração da preferência Premium. Identificado também teste preexistente que salvava capturas sobre um backup histórico de 19/10: as três imagens existentes foram copiadas e verificadas por SHA-256 na pasta externa atual antes de nova execução; destinos do teste passam a testInfo.outputPath, sem caminho pessoal fixo na CI.
