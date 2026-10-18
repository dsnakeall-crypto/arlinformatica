# ARL Informática — Etapa 3: desempenho do Pós-venda

Data: 15/10/2026. Status: melhoria backend aplicada SOMENTE ao aplicativo local. Nenhum deploy no GitHub ou KingHost.

## Escopo, segurança e backup
- Original: C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica, branch original-restaurado-20261014, HEAD 53bb453 e alterações locais aprovadas ainda não commitadas.
- Homologação: %LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE, com APP_ENV=testing, SQLite :memory: e dados 100% fictícios.
- Antes da mudança: backup exato (hashes SHA256 verificados) do arquivo app/Services/PostSaleService.php, em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 13-30 - ETAPA3-POSTSALE-ANTES, com arquivos ORIGINAL/QA e MANIFEST.csv.
- Apenas app/Services/PostSaleService.php foi alterado na versão oficial LOCAL, após a homologação e nova verificação de SHA256. Não foram modificados CSS, React, API/controller, banco de dados, migrations, servidores remotos ou outros projetos.

## Gargalo e solução
GET /api/post-sales chama PostSaleService::catchUp(false, now()->subDays(30)) sincronamente.
ANTES: a varredura verificava novamente todas as OS recentes mesmo quando já existia ciclo ativo, com diversas consultas por OS; para cada cartão vencido, buscava ações pendentes e OS/cliente individualmente.
DEPOIS: a busca de OS exclui ciclos JÁ ATIVOS por NOT EXISTS correlacionado à chave service_order_id (com índice UNIQUE). Ciclos arquivados e OS sem ciclo continuam processados pelas regras originais. Para notificações vencidas, usa JOIN e consulta ações em lotes de 200, evitando N+1 na leitura. Mantém NotificationService::notifyUsers/resolve por cartão, com destinatários novos, deduplicação e histórico preservados.
Regras de elegibilidade 7 dias, bloqueio 35 dias, intervalo 60 dias e reaberturas permanecem aplicadas pela função ensureCycle, que não foi modificada. Resposta e formato da API permanecem idênticos. Frontend continua paginando 30 por página, mas a API ainda devolve lista completa.

## Benchmark comparativo (SQLite em memória, dados fictícios)
Os números são por requisição e dependem de hardware/ambiente de teste. NÃO representam tempo da KingHost, celular ou navegador. Cold = primeira abertura cria ciclos; Warm = reabrir sem mudar os dados.

| Cenário | SQL antes | SQL depois | Tempo antes | Tempo depois |
|---|---:|---:|---:|---:|
| 100 ciclos recentes, warm | 209 | 7 | 14,01 ms | 4,63 ms |
| 1.000 ciclos recentes, warm | 2.027 | 7 | 117,11 ms | 19,89 ms |
| 100 ciclos vencidos, warm | 709 | 208 | 76,66 ms | 25,86 ms |
| 500 ciclos vencidos, warm | 3.517 | 1.012 | 319,36 ms | 122,47 ms |
| 100 ciclos vencidos, cold | 1.210 | 911 | 111,01 ms | 71,70 ms |
| 500 ciclos vencidos, cold | 6.018 | 4.523 | 460,09 ms | 293,70 ms |
| 1.000 recentes, cold | 7.028 | 7.028 | 378,73 ms | 353,66 ms |

Em 500 ciclos vencidos WARM, redução de 71,2% das consultas e ~61,7% do tempo no cenário testado. Em 1.000 recentes WARM, 2.027→7 consultas e 117→20 ms. Ainda há custo de criação inicial e de notificações individuais.

## Testes
- QA: testes sintéticos de 10/100/1.000 recentes e 100/500 vencidos, 5 casos aprovados.
- QA: StageSixTest + cenários sintéticos, 18 testes / 195 verificações aprovados.
- QA: suite PHP completa 405 testes / 7.494 verificações aprovadas (inclui 5 benchmarks).
- ORIGINAL local após promoção: PHP lint/Pint PASS e PHPUnit 400 testes / 7.439 verificações PASS, SQLite :memory:, CLI PHP 512 MB.
- Playwright QA pós-venda: 3 de 4 casos aprovados, inclusive navegação e paginação 30. O caso post-sale-bulk.spec.ts falha ANTES de abrir Pós-venda, na finalização de OS fictícia, com HTTP 409 e mensagem "Arquivo documental sem registro correspondente; exige reconciliação". O MESMO erro reproduziu com PostSaleService.php ORIGINAL restaurado na QA: não é regressão criada na Etapa 3. Proteção documental NÃO foi removida. Suite integral E2E não foi repetida nesta etapa.
- Nenhuma conexão ao MySQL oficial, nenhum seed/migration em produção.

## Artefatos
Evidências: %LOCALAPPDATA%\ARL-Informatica-Dev\PERFORMANCE-ETAPA3-20261015\
- baseline-phpunit-v3.log; optimized-synthetic-and-regression.log
- full-regression-php.log; official-all-php-after-promote.log
- post-sale-e2e-QA.log; post-sale-bulk-baseline-original-QA.log
- PostSaleService-OPTIMIZADO.php (hash confrontado com o oficial)
Backup PRE: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 13-30 - ETAPA3-POSTSALE-ANTES

## Pendências e recomendação
1. Investigar com cuidado o conflito documental 409 no ambiente E2E sem apagar PDFs reais nem contornar validações de integridade.
2. Medir SQL/MySQL sintético, EXPLAIN e índices em banco separado (não reutilizar BD oficial).
3. Reduzir o custo de notificações por cartão apenas depois de preservar destinos de usuários novos, deduplicação e concorrência.
4. Melhorar criação inicial de muitos ciclos somente com testes de 35/60 dias e locks equivalentes.
5. Avaliar paginação real no servidor, mantendo 30 cartões/página, busca e seleção em lote.
6. Retomar otimizações mais profundas do Controle de Gastos: os 358 KiB não são um limite absoluto. Parte do peso é CSS aprovado (aproximadamente 218 KiB compilados). Dividir CSS e componentes por submenu exige prova visual antes/depois.
7. Reexecutar suite E2E integral e homologação antes de futuro GitHub/KingHost.

Não publicar sem autorização específica.

## Encerramento: snapshot integral restaurado e conferido
- Backup local pós-mudança: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 13-30 - ETAPA3-POSTSALE-ANTES\CODIGO-LOCAL-ETAPA3-CODIGO-ATUAL.tar.gz.
- Manifesto de hashes: MANIFEST-CODIGO-ETAPA3-CODIGO-ATUAL-SHA256.csv na mesma pasta.
- **948 arquivos / 948 hashes verificados após extração**, nenhuma divergência, arquivo comprimido 23,42 MiB, SHA256 130A670DF1408841361AD2BBC83286C4D72724E56DD94045B0EA7ADE36583576.
- O pacote de código exclui credenciais .env, dados SQL, arquivos privados e Git; backups correspondentes de fases anteriores permanecem guardados separadamente. Não enviar este arquivo a público sem revisão de segurança de todo código e arquivos adicionados fora do Git.
- Nenhuma implantação à KingHost / GitHub.
