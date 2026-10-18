# AUDITORIA GERAL — ARL INFORMÁTICA
**Data:** 15/10/2026
**Versão auditada:** pasta oficial local em OneDrive/Laragon, branch `original-restaurado-20261014`, HEAD `53bb453` + alterações locais não consolidadas.
**Estado:** DIAGNÓSTICO / RECOMENDAÇÕES. NÃO representa certificação de produção nem autorização para excluir código.
**Proteção:** sem commit, reset, git clean, migrations em banco real, exclusões de arquivos, alteração de layout ou deploy. Testes com escrita executados em SQLite isolado; navegação local somente leitura operacional. TERRAPLAN e KingHost intocados.

## 1. Resultado executivo
- Frontend: `npm run lint`, `npm run typecheck`, `npm run build` e `npm run test:unit`: PASS; 61 testes unitários.
- PHP: 400 testes, 7.439 assertions PASS via `php -d memory_limit=512M vendor/bin/phpunit --no-coverage`, SQLite testing `:memory:`. PHP Pint: 246 arquivos PASS.
- Dependências: npm audit sem vulnerabilidades conhecidas (0 total); Composer audit locked/no-dev: listas de advisories e abandoned vazias.
- Varredura de 77 casos reais de tela/viewport: 11 rotas, Original desktop, Clean desktop e Mobile, 390/768/960/1366/1672 px conforme perfil; esperou networkidle, sem página 404, erro JS, HTTP 500 ou overflow horizontal global. Não é teste exaustivo de cada modal, subaba, impressão ou aparelho físico.
- Tempo de carregamento no Laragon com espera de networkidle: médias 1,858 s Original; 1,877 s Clean; 1,840 s Mobile. **Não corresponde a clique→feedback nem mede performance KingHost**; inclui overhead de navegação completa e espera. Ausência de benchmark quente/frio comparável é pendência.
- E2E: 288 testes listados na cópia isolada, execução iniciada e interrompida após aproximadamente 32/288, com seis falhas identificadas até esse ponto. **Suíte integral NÃO APROVADA**; casos não executados não têm resultado.
- Grafo atual de importações TS/JS/CSS: 155 fontes (89 JS/TS/TSX + 66 CSS), 18 raízes, todas as 155 alcançáveis considerando alterações não rastreadas. **Nenhum arquivo-fonte inteiro confirmado morto.** Ser alcançável não garante que toda função/regra interna seja necessária.

## 2. Achados e recomendações UM POR UM
| # | Prioridade / classificação | Evidência atual | O que recomendo |
|---|---|---|---|
| 01 | **CRÍTICO PARA PUBLICAÇÃO — confirmado** | Git tinha 20 arquivos rastreados modificados e 274 não rastreados, incluindo estilos recentes; HEAD isolado não reproduz a interface aprovada | Congelar snapshot, inventariar com hashes, promover apenas arquivos revisados a branch/commit de release, rodar CI e testar pacote montado de commit limpo. **Não dar git add geral, reset ou clean.** |
| 02 | **ALTA — confirmado** | Seis falhas em cerca de 32 dos 288 E2Es previstos; suíte incompleta | Revisar expectativas obsoletas separadamente de defeitos reais, atualizar testes mantendo regras funcionais/segurança, repetir 288/288 em cópia isolada e CI. |
| 03 | **MÉDIA — desvio de contrato visual** | `budget-sharing-layout.spec.ts`: formulário Gerar Orçamento tem 38 px de scroll interno a 1280×720; teste antigo exige ≤1 px. Campo final continua acessível com rolagem | Conferir visual com proprietário e acessibilidade/teclado; decidir se scroll é tolerado ou se layout precisa de autorização explícita para ajuste. Não mudar tela automaticamente. |
| 04 | **MÉDIA — contrato que precisa revisão** | `clean-appearance.spec.ts`: posições exatas entre Original e Clean divergem; teste também verifica impressão | Separar contrato de conteúdo/print de coordenadas que variaram com temas; conferir impressão real/PDF antes de classificar como exclusivamente teste obsoleto. |
| 05 | **BAIXA — teste obsoleto provável** | `clients-management.spec.ts` espera `Cliente Nº 6`; layout aprovado mostra `#6` | Atualizar expectativa sem enfraquecer busca, paginação, ordenação e ícones. |
| 06 | **BAIXA — teste obsoleto provável** | `desktop-expense-shell.spec.ts` espera `main .app-head` visível nos Gastos; regra aprovada mantém sino somente no Painel | Ajustar seletor/contrato para a regra oficial do sino; testar navegação lateral e layout real. |
| 07 | **BAIXA — teste obsoleto provável** | `eight-improvements-focus.spec.ts` espera borda azul RGB(121,137,156) no foco; CSS atual mostra dourado RGB(200,147,59) | Manter foco de teclado nítido; atualizar teste para contraste/foco do tema aprovado após validação. |
| 08 | **MÉDIA — confirmar com referência** | `eight-improvements.spec.ts` exige cinco colunas de instituições, resultado atual calculado foi sete | Conferir a grade em telas grande/média e o padrão autorizado; corrigir teste se a nova grade for intencional, CSS somente com autorização. |
| 09 | **ALTA DE MANUTENÇÃO — confirmado** | 66 CSS, 6.035 regras, 20.726 declarações, 5.941 `!important` (28,7%) | Criar mapa de precedência/ownership e consolidar em etapas por setor. Comparar screenshot/pixels/computedStyle e 3 temas antes/depois. Não remover em massa. |
| 10 | **MÉDIA — confirmado** | 89 ocorrências adicionais de regras CSS exatamente repetidas (parser com seletor, at-rule, declarações) | Triagem de cada ocorrência: checar ordem da cascata, escopo e uso; remover apenas duplicata com equivalência comprovada em teste e imagens. |
| 11 | **MÉDIA/PERFORMANCE — confirmado tamanho, impacto não medido** | CSS compilado principal aproximadamente 394,16 KiB; CSS de Gastos aproximadamente 218,42 KiB | Examinar CSS crítico carregado em cada rota, regras herdadas antigas, divisão de chunks e custo real transferido (gzip). Nunca reduzir eliminando estilos aprovados. |
| 12 | **MÉDIA/PERFORMANCE — confirmado tamanho, impacto não medido** | `public/arl-assets` ≈50,2 MB, OCR Tesseract sozinho ≈46,2 MB, armazenado em 16 arquivos | Validar que OCR é buscado somente quando usado; medir download/função e hosting. Conservar variantes wasm requeridas. Não apagar OCR ou imagens por tamanho apenas. |
| 13 | **MÉDIA/PERFORMANCE — risco estrutural** | `BackupService.php` carrega cada tabela inteira com `get()->all()` e arquivo ZIP inteiro com `File::get($archive)` | Benchmark com dados sintéticos e memória limitada; considerar exportação por lotes/stream e ZIP streaming com testes de restauração e checksums antes de reescrever. |
| 14 | **MÉDIA/AMBIENTE — confirmado** | `php artisan test` com PHP CLI padrão falhou em 128 MB; PHPUnit direto com 512 MB concluiu 400 testes | Documentar comando e memória da CLI; medir pico de backend/backup em hospedagem. Não confundir este problema de runner com defeito de OS/financeiro. |
| 15 | **MÉDIA — investigação de desempenho pendente** | Carregamento integral com espera de rede 1,8–1,9 s em Laragon. Ainda sem medições clique→feedback, render e API/SQL por menu | Baseline fria/quente por rota e clique (100 ms feedback/300 ms navegação cache são metas, não garantias). Auditar queries, índices, payload e re-renderização com dados representativos. |
| 16 | **MÉDIA — candidatos a código interno inativo** | Funções privadas antigas em `main.tsx`, `opening-whatsapp.ts`, `record-management.ts`, `order-detail-react.tsx` aparecem com exceções de lint e referências limitadas | Inspeção AST símbolo a símbolo e cenários de runtime; excluir apenas função confirmada sem consumidor, com rollback e E2E. `ClientHistory` e `enhanceServices` da auditoria antiga TÊM referências atuais, logo não são candidatos seguros. |
| 17 | **MÉDIA — legado ativo intencional** | `mobile-home.ts`, enhancers de OS/WhatsApp e CSS importados ainda conectados ao app | Migrar apenas se houver ganho medido, com paridade mobile/desktop, guards, side effects e tests; nunca remover arquivos conectados por serem antigos. |
| 18 | **BAIXA/MANUTENÇÃO — revisão futura** | Ferramenta antiga `.agents/audit-import-graph.mjs` gerou muitos falsos órfãos por resolver mal `.tsx` e ignorar fontes não rastreadas; nova varredura corrigida deu 155/155 | Atualizar/verificar auditor de importações antes de usá-lo para limpeza. Arquivos com nomes antigos não são prova de código morto. |
| 19 | **MÉDIA/INTEGRIDADE — parcialmente mitigado, requer estresse** | `DocumentService` agora usa lock de OS e criação exclusiva de arquivo; `BackupService` aplica isolamento REPEATABLE READ/InnoDB no MySQL | Repetir testes de concorrência real, snapshots de banco+arquivos e recuperação de falhas em banco descartável MySQL, inclusive SHA/FK/histórico. 400 testes SQLite não provam tudo isso. |
| 20 | **SEGURANÇA — melhoria existente confirmada** | Compartilhamento final por POST com CSRF (rota atual), SW `cacheable` aceita apenas HTTP 200 e sem no-store; cache de configuração de Gastos preserva savedAt da consulta efetiva | Manter as proteções. Executar regressão CSRF, cache offline/upgrade, segunda sessão, prazo de 30 s e impressão sem criar atalhos inseguros. |
| 21 | **BAIXA/LEGADO DE DEPENDÊNCIAS** | Pacotes de eslint React Hooks/Refresh existem, mas `eslint.config.js` não ativa seus plugins; exceções pontuais de declarações não usadas persistem | Considerar ativar regras de Hooks numa etapa isolada e corrigir alertas fundamentados; não remover pacotes nem alterar estado React sem teste. |
| 22 | **MÉDIA/PUBLICAÇÃO — confirmado no workflow atual** | `.github/workflows/release.yml` já tem lint, test:unit, typecheck, PHP tests, build e E2E. `BACKUP_RETENTION=4` já está alinhado | Não repetir reparos propostos em auditorias antigas que já foram feitos. Validar CI/release do SHA futuro limpo, incluindo MySQL e WebKit quando aplicável. |
| 23 | **MÉDIA/PORTABILIDADE** | Local PHP 8.4.25 e Node 24.21; CI usa PHP 8.2 e Node 22 | Rodar homologação de pacote nas versões alvo e verificar extensões do plano de hospedagem; PASS local não substitui ambiente oficial. |
| 24 | **PENDENTE — cobertura de cenário** | Sem benchmark KingHost, celular físico, rede lenta, 320px e 2560px, impressão física, recuperação real de backup, ensaio de failover e E2E integral desta versão | Planejar matriz adicional em homologação, priorizando ações de dinheiro, documentos, relatórios e mudanças de estado. Somente depois declarar candidato a release. |

## 3. E2E: como interpretar as seis falhas
1. `budget-sharing-layout`: rolagem interna de 38px vs contrato antigo <=1; conferir usabilidade.
2. `clean-appearance`: coordenadas Original/Clean divergem; testar impressão antes de mudar critério.
3. `clients-management`: identifica `#6` no lugar de `Cliente Nº 6`; provável teste desatualizado.
4. `desktop-expense-shell`: `.app-head` não visível em Gastos; conforme regra aprovada sino somente Painel.
5. `eight-improvements-focus`: cor de foco dourada no lugar de azul antigo; manter acessibilidade e atualizar referência.
6. `eight-improvements`: CSS calculou sete colunas em Instituições vs cinco esperadas; confirmar referência final.
**Esta rodada NÃO corrigiu/ocultou nenhuma dessas falhas nem alterou os testes para passar.** Suite interrompida por custo de tempo e vários contratos visuais antigos; sem execução integral, não existe aprovação E2E desta árvore local.

## 4. Plano seguro recomendado
**Fase 0 — congelamento:** backup externo verificado de TODO o estado local, inventário de Git/assets, branch/commit de checkpoint com arquivos selecionados, sem segredos, antes de qualquer alteração. Commit de release só após análise de diffs; proteger binários, .env, dados privados e TERRAPLAN.
**Fase 1 — testes:** revisar/atualizar seis testes visualmente obsoletos, verificar os ambíguos (orçamento, impressão e grade), executar 288/288 na cópia SQLite + backend PHP 400/400, testes MySQL e navegadores desktop/mobile.
**Fase 2 — baseline velocidade:** perfis frios/quentes, clique, API por rota, React profiler, JS/CSS por tela e SQL `EXPLAIN` em cópia autorizada. Comparar métricas antes de otimizar.
**Fase 3 — CSS:** consolidar duplicações por setor somente com equivalência visual demonstrada em Original, Clean, Mobile, várias larguras e popups; preservar tipografia congelada.
**Fase 4 — código interno/arquivos:** remover SOMENTE declarações provadamente inativas; assets e migrations históricas exigem evidência de uso no runtime/BD e rollback individual. Nenhum arquivo-fonte inteiro foi provado morto.
**Fase 5 — backend:** tratar memória e concorrência de backup, consultas e caches após benchmark e testes de integridade. Banco real/servidor apenas com autorização separada.
**Fase 6 — release:** criar pacote reprodutível de SHA limpo, comparar checksums e backups remotos, testar restauração e implantar SOMENTE após autorização do proprietário.

## 5. Evidências, comandos e limites
Logs fora do repositório: `%LOCALAPPDATA%/ARL-Informatica-Dev/Auditoria-Geral-20261015/`.
- `frontend-{lint,typecheck,test-unit,build}.log`
- `backend-suite.log` e `backend-suite-512m.log` (falha por 128 MB do comando wrapper); `phpunit-direct-512m.log` PASS 400/400.
- `php-pint-check.log` PASS 246 arquivos.
- `npm-audit.json` e `composer-audit.json`: zero advisories conhecidos.
- `audit-static-results.json`: 155/155, análise CSS duplicado e `!important`.
- `audit-ui-ready-results.json`: 77 combinações, métricas e rotas.
- `e2e-list.log`: 288 casos; `e2e-full-isolated.log` e `isolated-validation/test-results/`: 6 falhas identificadas durante execução parcial; fixture SQLite somente na cópia isolada.
A primeira varredura UI `audit-ui-results.json` é diagnóstico de navegação rápida e cancelamentos `ERR_ABORTED` causados pelo próprio teste; NÃO usar como indicador de quebra. A rodada correta esperou networkidle e terminou sem problemas monitorados.

**NÃO EXECUTADO / NÃO APROVADO:** 288/288 E2E, comparação visual pixel a pixel em todos os modais/submenus, dispositivos físicos, produção, testes MySQL concorrentes completos, todas as condições financeiras de borda, restauração integral de backup e auditoria de segurança ofensiva. Nenhuma ferramenta prova que o aplicativo "nunca vai quebrar". Não se registrou ganho de velocidade: nesta etapa não houve otimização ou remoção de código.

**Conclusão:** boa base funcional e visual observada; principais tarefas atuais: sincronizar a suíte E2E com o visual aprovado, consolidar árvore Git/release, medir desempenho frio/quente e somente então eliminar CSS/código redundante com segurança. **Status: DIAGNÓSTICO ENTREGUE; LIMPEZA CONTROLADA PENDENTE DE APROVAÇÃO.**

## ADENDO — Paginação do Pós-venda e otimização pontual (15/10/2026, posterior)
Autorizada e aplicada diretamente ao **original Laragon** depois de passar em cópia isolada. Lista de Pós-venda agora tem 30 registros por página (30+30+5 em simulação de 65), busca reinicia na primeira página, numeração contínua, seleção em lote entre páginas, selecionar todos limitado à página atual, exclusão ajusta a página e memoização do filtro em React. Alterados apenas `resources/js/post-sale-page.tsx`, `resources/css/post-sale-web-list-gold-20261015.css`; novo `tests/e2e/post-sale-pagination-30.spec.ts`. Nenhuma alteração backend, MySQL, produção, WhatsApp ou outras telas.
Evidências: lint/typecheck/61 unit/build PASS no clone e original; **2/2 E2Es novos PASS** com 65 registros fictícios e exclusão simulada sem banco real. Posteriormente, somente o destino do screenshot do novo teste mudou para `testInfo.outputPath`, sem mudança funcional. A **suíte E2E integral NÃO foi executada**: a chamada remota para iniciar a bateria completa foi bloqueada por configurações de segurança; a ferramenta não foi contornada. Divergências visuais da auditoria anterior permanecem.
Snapshot mais recente verificado no backup Fase 0: `CODIGO-LOCAL-ATUAL-COM-POSVENDA30-FINAL.tar.gz` (935 arquivos com hashes conferidos após extração, SHA256 1CAE2A54FCA2A20F82A75C0F5716AAFC834312AA45CBDBA76BAF9DEEA53C1D5F). O snapshot anterior da Fase 0 permanece como rollback. Detalhes em `docs/layout-setores/RELATORIO-POS-VENDA-PAGINACAO-30-20261015.md`.
**Limite de desempenho:** a API continua retornando todos os pós-vendas; a otimização é na quantidade de linhas React renderizadas, não no volume de dados transmitidos. Fazer benchmark antes de propor paginação de servidor.
