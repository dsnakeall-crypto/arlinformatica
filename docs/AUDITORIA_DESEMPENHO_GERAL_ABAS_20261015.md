# ARL Informática — Auditoria de velocidade por aba
**Data da medição:** 15/10/2026.
**Estado:** diagnóstico concluído nesta rodada; não houve otimização de runtime aprovada para aplicar ao original. Interface, banco de dados, produção, GitHub e demais projetos preservados.

## Escopo e ambiente
- Fonte de referência: código LOCAL de `C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica`, branch `original-restaurado-20261014`, HEAD `53bb453` e alterações locais existentes.
- Diagnóstico navegador: cópia de homologação isolada em `%LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE`, com banco SQLite descartável e conta de testes. Não foi usado o banco MySQL oficial.
- Laragon local: `http://arlinformatica.test/`. Utilizado apenas para conferir estado HTTP e arquivos compilados públicos, sem testes de gravação.
- Teste E2E `qa-performance-readonly.spec.ts`: **44 aberturas/reaberturas** em 11 abas × Desktop 1366px e Mobile 390px × 2, PASS. Nenhum erro JavaScript/404 nem overflow horizontal global nas verificações medidas.
- Teste E2E `qa-performance-navigation.spec.ts`: **22 transições** pelo menu React desktop, PASS. Sem gravação de negócio.
- Medições são do **ambiente de testes/local**: não correspondem à latência da KingHost nem representam métricas de produção, dispositivo físico ou rede móvel.
- `networkSettledMs` inclui overhead de navegador e espera para estabilização; **não confundir** com tempo puro de CPU, clique→dados atualizados ou TTFB. O primeiro teste não registrou corretamente duração individual das APIs (`slowApiMs=0` é dado inválido). No teste de navegação, somente o primeiro Painel registrou temporização de requisições; os `apiCount=0` das demais transições **não comprovam ausência de solicitações**.

## 1. Abas — recarregamento completo com estabilização da rede
Duas medições por dispositivo/aba; tempos arredondados em milissegundos.

| Aba | Desktop 1366px (média) | Mobile 390px (média) |
|---|---:|---:|
| Painel | 2.168 ms | 1.948 ms |
| Ordens de Serviço | 1.613 ms | 1.567 ms |
| Nova OS | 2.174 ms | 2.188 ms |
| Clientes | 1.587 ms | 1.601 ms |
| Serviços | 1.613 ms | 1.604 ms |
| Produtos | 1.608 ms | 1.575 ms |
| Fornecedores | 1.773 ms | 1.804 ms |
| Financeiro | 1.598 ms | 1.606 ms |
| Pós-venda | 1.626 ms | 1.728 ms |
| Controle de Gastos | 1.821 ms | 1.837 ms |
| Configurações | 1.596 ms | 1.619 ms |

**Geral:** 44 medições; média 1.739 ms, mediana 1.628 ms; maior caso observado 2.342 ms. No formulário de Nova OS a janela tem consumo maior mesmo vazia. Não foi feito benchmark de bases com milhares de registros neste teste.

## 2. Troca de abas dentro da SPA React
22 navegações por clique em 11 destinos, duas passagens Desktop:
- Atualização da rota do navegador: **mediana 45 ms** na primeira e segunda passagem.
- Primeira montagem do conteúdo, observada pela saída do fallback `.arl-loading`: **mediana 351 ms**.
- Segunda montagem após os módulos já terem sido carregados: **mediana 52 ms**.
- A primeira passagem de Painel incluiu requisicões e demorou mais; a instrumentação de API das demais transições necessita aperfeiçoamento antes de atribuir a causa.
- **Interpretação:** a navegação React em memória já responde rapidamente quando aquecida. O maior espaço de melhoria é primeira carga de módulos, transferência de bytes e consulta/renderização inicial — não eliminar avisos ou cachear saldos sem invalidação.

## 3. Peso de JS/CSS do build real e potencial de transferência
Analisado `public/build/manifest.json` da versão local e arquivos publicados por Vite. Valores KiB, arredondados. Compactação foi simulada localmente, não medida na rede.

| Conjunto de arquivos | Sem compressão | Gzip potencial |
|---|---:|---:|
| Bundle base necessário para abrir a SPA (JS/CSS importado diretamente) | **667 KiB** | **140 KiB** |
| Painel — peso incremental ao abrir pela primeira vez | 22 KiB | 8 KiB |
| Nova OS — incremental | 54 KiB | 17 KiB |
| Clientes — incremental | 40 KiB | 12 KiB |
| Serviços/Produtos — incremental | 33 KiB | 11 KiB |
| Fornecedores — incremental | **136 KiB** | **35 KiB** |
| Financeiro — incremental | 27 KiB | 9 KiB |
| Pós-venda — incremental | 24 KiB | 8 KiB |
| Controle de Gastos — incremental | **365 KiB** | **75 KiB** |
| Configurações — incremental | 26 KiB | 9 KiB |

OS tem 24 KiB de incremento (~8 KiB gzip). Esses totais resultam do grafo de importações, não de uma captura HAR, e não incluem imagens nem todas as requisições dinâmicas. Dependências compartilhadas e cache de módulos reduzem as transferências após a primeira visita. Os componentes já têm **lazy loading** em `resources/js/lazy-pages.ts`; não carregar os 365 KiB de Gastos em outras abas é uma decisão existente que deve ser preservada.

Maiores arquivos compilados: `main*.css` **394 KiB**, `createLucideIcon*.js` **190 KiB**, `expense-control-page*.css` **218 KiB** e `expense-control-page*.js` **119 KiB**. A fonte de Gastos tem ~95 KiB e Fornecedores ~75 KiB. Deduplicar CSS sem rever precedência entre Original/Clean/Mobile poderia quebrar os layouts aprovados.

## 4. Gargalo confirmado na infraestrutura Laragon
O Apache local devolveu o CSS com `Content-Length: 403616`, **sem `Content-Encoding: gzip`** ao receber `Accept-Encoding: gzip, br`. Também não respondeu com `Cache-Control` explícito para esse asset. O `httpd.conf` do Laragon tem `mod_deflate` e `mod_expires` comentados, `mod_headers` habilitado e diretivas `AllowOverride None` detectadas. Isso **não prova** que a KingHost tenha o mesmo problema.
- Melhoria prioritária: habilitar compressão estática gzip/Brotli e cache longo para arquivos Vite **com hash no nome**, invalidando cache pelo nome novo em cada build.
- HTML autenticado, API, PDFs e dados financeiros NÃO devem receber a política de cache imutável. Preservar `Cache-Control: private/no-store` conforme o caso.
- **Não foi alterada a configuração Apache global**; Laragon atende outros projetos e reiniciá-lo/ligar módulos globais afetaria sites externos ao escopo. A configuração deve ser validada para o vhost ARL isoladamente, com backup e teste HTTP antes/depois. Na hospedagem futura, conferir suporte real aos módulos e cabeçalhos.

## 5. Ponto de atenção de escala — Pós-venda
- React já exibe 30 registros/página e memoriza o filtro, reduzindo linhas no DOM.
- O GET `/api/post-sales` do Laravel continua enviando **todos** os registros. `PostSaleController::index` chama `PostSaleService::catchUp(false, now()->subDays(30))` **sincronamente** antes de devolver a lista.
- `PostSaleService::catchUp` percorre ordens concluídas recentes e ciclos ativos, podendo executar várias consultas de verificação/ordem/notificação **por ciclo**. Isso pode piorar com 100+ atendimentos; **ainda não há benchmark sintético nem EXPLAIN confirmando impacto nesta versão**.
- Próximo experimento seguro: construir massa sintética no MySQL/SQLite isolado, capturar número de queries/tempo/memória no GET com 10/100/1000 ciclos, medir respostas reais e então avaliar paginação em servidor e revisão da varredura. Preservar elegibilidade 7 dias, intervalos de 60 dias, arquivos/OS/histórico e notificações; NÃO alterar algoritmo do serviço sem cobertura de regressão.

## 6. Experimento de pré-carregamento — REPROVADO e revertido
- Na cópia QA apenas, foi criado prefetch de módulo do menu após hover de 120 ms, com cancelamento ao retirar o mouse e carregamento ao focar teclado.
- E2E verificou que o download do chunk de Clientes aconteceu antes do clique e que movimentos rápidos não dispararam download do módulo de Fornecedores.
- **Resultado:** a primeira montagem de Clientes permaneceu em **339 ms e 344 ms**, versus mediana de primeira montagem **351 ms** do conjunto anterior. Essa diferença está dentro da variabilidade dos cenários; não comprovou ganho útil. O teste exigia menos de 250 ms e **FALHOU** nas duas tentativas. Não encobrir.
- **Decisão:** NÃO promover ao original; os arquivos `resources/js/main.tsx` e `resources/js/lazy-pages.ts` foram restaurados na cópia QA com SHA-256 idêntico ao original. Teste reprovado movido para os artefatos da auditoria. Após rollback, lint, TypeScript, 61 unitários e build passaram. O aplicativo oficial nunca recebeu o experimento.

## 7. Ordem recomendada — próximas otimizações
1. **Hospedagem/assets:** medir compressão e cache real no destino do ARL; ajustar somente o vhost/host do ARL após aprovação da intervenção em Apache, preservando TERRAPLAN. Comparar Content-Encoding, TTFB, bytes reais, cache HIT e comportamento do SW após novo build.
2. **Gastos e Fornecedores:** investigar subabas, tamanho da árvore, acesso a PDF/planilha e componentes que possam ser ainda mais separados sob demanda, sem alterar preços/cálculos/layout. Repetir HAR e React Profiler antes/depois.
3. **Pós-venda:** benchmark de 10/100/1000 registros sintéticos e consulta SQL antes de qualquer alteração; possível paginação de backend após validação das regras de busca e seleção entre páginas.
4. **Backend geral:** consultas reais da API em banco isolado, `DB::listen`, MySQL `EXPLAIN`, índices existentes, N+1, cache seguro com invalidação explícita. Sem instrumentação real de queries nesta rodada, não nomear endpoints como "lentos comprovados".
5. **React quente:** medir re-renderizações e CPU com React Profiler nas mesmas 11 abas e nos submenus/ações, principalmente alterações de filtros e formulários.
6. **Release:** após alterações aprovadas, executar testes PHP 400+, frontend 61+, E2E críticos, responsivo, impressão, segurança de sessão e smoke em homologação. Somente então preparar GitHub e KingHost com autorização específica.

## Evidências e proteção
Arquivos gerados fora do Git em `%LOCALAPPDATA%\ARL-Informatica-Dev\PERFORMANCE-20261015`: `qa-performance-run.log`, `qa-navigation-run.log`, `RESUMO-VELOCIDADE-JSON.json`, `build-payload-results.json`, `prefetch-e2e.log`, `prefetch-e2e-extended.log` e logs finais de rollback. Em QA os dois testes de benchmark passaram; o teste experimental de prefetch ficou reprovado e foi arquivado.
Backup dos originais para o experimento: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 11-33 - OTIMIZACAO-PREFETCH-ANTES`, com SHA-256.
**Status:** medição e investigação de desempenho concluídas nesta rodada; melhorias de runtime/infraestrutura aguardam homologação e autorização de alteração. Nenhuma mudança em produção, MySQL oficial, Apache global ou arquivo funcional do original. Não alegar aumento de velocidade que não tenha sido demonstrado.

## ADENDO — Tentativa de ativação da compressão (15/10/2026)
**Autorização:** proprietário autorizou ativar compressão/caching ARL e reiniciar apenas Apache.

- Vhost ARL `C:\laragon\etc\apache2\sites-enabled\arlinformatica.test.conf` preparado e escrito para gzip seletivo em assets versionados JS/CSS, com Cache-Control public/max-age=31536000/immutable apenas para HTTP 200 com MIME efetivo CSS/JS. O restante, incluindo API, login, 404/HTML fallback e SW, mantém cabeçalhos antigos.
- Backup original exato com SHA256 validado: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 11-57 - APACHE-ARL-GZIP-CACHE-ANTES\arlinformatica.test.conf.ANTES` (SHA256 F18FB7974354AE93B814CC668F6B4E548D017D82E8815D864FB1431D2155B293).
- Configuração escrita e `httpd.exe -t` retornou **Syntax OK**. Na instância **isolada** Apache QA da ARL, CSS transferiu 403616→58641 bytes e JS 57678→18325 bytes por gzip; verificação de restauração SHA256 igual ao original PASS. Cache permanente apenas CSS/JS legítimos; arquivo inexistente retorna HTML com no-cache/private, API 401 com no-store/private, HTML login cache privado e SW sem política immutable. Instâncias de sandbox 18881/18882 posteriormente encerradas.
- **IMPORTANTE: NÃO ATIVADO NO APACHE REAL ATÉ AGORA.** Duas tentativas de `C:\laragon\laragon.exe reload apache` terminaram com exit code 0, mas Apache principal manteve PID 9060 iniciado em 14/10 e respondeu ao CSS real sem `Content-Encoding` e com `Content-Length: 403616`. A versão do Laragon não aplicou a recarga CLI conforme documentação geral. Não foi feito `taskkill`, Stop-Process nem reinício forçado por segurança dos demais projetos.
- Checagem após as tentativas: `arlinformatica.test`, `DoctorMotos.test` e `arl-maquinas.test` HTTP 200; sintaxe Apache OK. MySQL, bancos, PHP backend e fontes JS/CSS originais intactos.
- **Ação operacional única pendente:** no painel Laragon, `Menu > Apache > Reload` (ou reiniciar somente Apache). Depois conferir `Content-Encoding: gzip` e cache no `main-*.css`, sem cache indevido em login/API/missing file, mais smoke HTTP 200 nos três sites. A configuração já está salva no vhost; **não duplicar o bloco** ao repetir.
- Se Apache não iniciar após operação manual, restaurar o arquivo .ANTES para `...\arlinformatica.test.conf`, testar `httpd.exe -t` e recarregar novamente, sem zerar/reinstalar nem tocar no banco.

## ADENDO FINAL — Compressão GZIP ATIVA em ARL após Reload manual do Laragon (15/10/2026, 12:56 -03)
O proprietário confirmou o Reload no painel do Laragon. O Apache manteve o PID principal 9060, mas **substituiu o processo filho por PID 15956 criado 12:56:08**, evidenciando aplicação da nova configuração. Uma leitura HEAD durante a transição retornou temporariamente HTTP 404; repetição posterior normalizou HTTP 200. IMPORTANTE: Apache HEAD sem corpo pode não aplicar o filtro gzip e não mostrar `Content-Encoding`; **medir sempre GET real para validar compressão**, e não interpretar HEAD isolado como ausência de gzip.

**Resultados GET reais no vhost `arlinformatica.test`:**
- `main-DljT9dUs.css`: 403616 bytes antes -> **58641 bytes com gzip** (redução 85,47%). Resposta HTTP 200, `Content-Encoding: gzip`, `Vary: Accept-Encoding`, `Cache-Control: public, max-age=31536000, immutable`; descompressão e SHA256 **idênticos ao CSS original**.
- `main-BivkxHa6.js`: 57678 bytes antes -> **18325 bytes com gzip** (redução 68,23%). HTTP 200, gzip e cache immutable, descompressão e SHA256 **idênticos ao JS original**.
- Requisição `Accept-Encoding: identity` continua entregando o arquivo original sem compressão, correto para quem não aceita gzip.
- Resposta a arquivo JS inexistente sob `/build/assets/` é HTML de fallback do Laravel (HTTP 200); permanece `Cache-Control: no-cache, private`, **sem cache público nem gzip forçado indevido**. `/login` HTTP 200 no-cache/private; `/api/post-sales` sem sessão HTTP 401 no-store/private; `/sw.js` HTTP 200 sem immutable.
- Smoke HTTP GET: **ARL Informática 200, DoctorMotos 200, ARL Máquinas 200**. Apache `httpd.exe -t` confirmou `Syntax OK`. Nenhum código-fonte, layout, banco oficial, outro projeto, GitHub, KingHost ou TERRAPLAN alterado nesta etapa.
- A configuração do vhost ARL está **instalada e ATIVA** em `C:\laragon\etc\apache2\sites-enabled\arlinformatica.test.conf`. Não duplicar o bloco, não reiniciar novamente. Backup para rollback permanece em `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 11-57 - APACHE-ARL-GZIP-CACHE-ANTES\arlinformatica.test.conf.ANTES`, SHA256 F18FB7974354AE93B814CC668F6B4E548D017D82E8815D864FB1431D2155B293.

A compressão reduz **bytes transferidos dos assets**, mas não equivale a 85% de redução do tempo total das páginas. Ganho na experiência deve ser medido separadamente após cache quente, rede real e no futuro servidor de produção.
