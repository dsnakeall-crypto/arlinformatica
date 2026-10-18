# ARL Informática — Etapa 5: desempenho do Controle de Gastos com grandes volumes

Data: 15/10/2026. Status: diagnóstico e melhoria de baixo risco aplicados ao código LOCAL; nenhuma publicação no GitHub/KingHost.

## Segurança e backup
- Código local aprovado: C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica; branch original-restaurado-20261014, HEAD 53bb453 mais alterações locais não commitadas.
- Ambiente isolado: %LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE; testes PHP com APP_ENV=testing e banco SQLite :memory:. Dados fictícios, sem ler ou gravar no MySQL real.
- Backup ANTES verificado: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 15-03 - ETAPA5-RESUMO-ANTES. Contém versões original/QA dos componentes-alvo com SHA256, e pacote CODIGO-LOCAL-ETAPA5-CODIGO-PRE.tar.gz. Snapshot pré-edição: 952 arquivos extraídos e hashes verificados; SHA256 997431B6D18C964BA6C710BEA93AFD6C8F562DEF6F7E09D2BBB52B7F4B9EDD30.
- O pacote contém somente código, sem .env, SQL, arquivos privados ou .git; histórico Git e outros dados sensíveis mantêm os backups de fases anteriores. Não houve alteração de servidor, banco oficial ou projetos vizinhos.

## 1. Benchmark do backend Laravel
Teste sintético temporário APENAS NA QA: tests/Feature/PerformanceExpenseVolumeTest.php.
Foram criadas 100, 500, 1.000 e 5.000 dívidas fictícias, com 12 instituições, 6 tipos e valores constantes em centavos. 4/4 testes PASS, 44 assertions.

| Dívidas | GET /summary | GET /debts | JSON do resumo |
|---|---:|---:|---:|
| 500 | 30,06 ms | 5,20 ms | 157.291 bytes |
| 1.000 | 56,54 ms | 7,91 ms | 292.057 bytes |
| 5.000 | 312,59 ms | 35,77 ms | 1.378.247 bytes |

Com 5.000 dívidas, apenas quatro consultas SQL no Resumo, que totalizaram ~12,91 ms. O restante do tempo é processamento PHP, agrupamento, JSON e geração de 5.000 faturas. A listagem de dívidas já é paginada em 20 por backend; o Resumo ainda transmite todas as faturas. NÃO são tempos reais da KingHost.

Um experimento no controller, reutilizando somas por fatura, foi REJEITADO: mediana de seis execuções de 5.000 registros por variante foi 319,48 ms no original e 320,23 ms no candidato, sem ganho comprovado. A cópia QA do controller foi restaurada e conferida por SHA256. Nenhum PHP oficial foi alterado.

## 2. Benchmark do navegador — React
O Playwright autenticou somente no ambiente de testes. As respostas de configuration e summary foram substituídas no NAVEGADOR por fixtures de dados inteiramente fictícios. 8/8 casos baseline aprovados em desktop 1366px e mobile 390px, sem overflow horizontal.

| Modo / volume | Montagem da página | Nós no DOM | Duração das tarefas longas |
|---|---:|---:|---:|
| Desktop 100 | 1.385 ms | 3.188 | 0 ms |
| Desktop 500 | 1.565 ms | 13.988 | 172 ms |
| Desktop 1.000 | 1.847 ms | 27.488 | 394 ms |
| Desktop 5.000 | 5.096 ms | 135.488 | 2.199 ms |
| Mobile 5.000 | 5.575 ms | 135.496 | 2.648 ms |

Repetição de 5.000 com a versão original: desktop 4.892 ms e mobile 4.961 ms. Variação de execução é normal. Esses resultados revelam o gargalo dominante: MonthlyInvoices em expense-month-details.tsx renderiza todos os itens de monthly_invoices imediatamente como botões completos, multiplicando DOM, layout e trabalho JavaScript.

## 3. Otimização aprovada e aplicada somente ao código local
Arquivo alterado: resources/js/expense-month-details.tsx.
O componente formatava dinheiro criando new Intl.NumberFormat pt-BR/BRL toda vez que um valor era mostrado. Agora reutiliza UMA instância por módulo. A fórmula original format(value / 100), os centavos, os textos e a ordem dos cartões permaneceram idênticos.

- Playwright QA após mudança: desktop 5.000 ficou 4.776 ms e mobile 5.000 ficou 4.968 ms. Esses dois números NÃO comprovam melhora significativa do tempo total, porque variam de execução para execução. A redução de alocações de Intl.NumberFormat é real, mas 135 mil nós DOM ainda causam long tasks.
- Capturas de tela da região visível de 5.000 faturas antes/depois, desktop e mobile: ARQUIVOS PNG IDÊNTICOS por SHA256.
- Código em QA: lint, typecheck, 61 testes unitários e build aprovados. 2 testes de benchmark 5.000 em navegador e 3 testes financeiros direcionados aprovados.
- Promoção original: verificação prévia do backup e hashes; somente UM TSX substituído, hash do original idêntico ao QA validado após cópia: E66AB86A68B2CC747DD96EF7FE0717C07D7816BA22F1CC6FACBBA66961F6DB80.
- Código original pós-promoção: lint, typecheck, 61 unitários, build e git diff --check PASS; bateria PHP no SQLite em memória 400 testes e 7.439 assertions PASS (58,2 s). Nenhum CSS, backend, rota, autorização, banco ou cálculo financeiro foi alterado.
- O pacote de assets compilados em public/build foi atualizado pelo build local; sem GitHub/KingHost.

## 4. CSS e próximos passos
Os ~218 KiB do CSS de Gastos continuam; a cascata possui estilos de Desktop/Original, Clean, Mobile e componentes. Não havia remoção de baixo risco comprovada; nenhum CSS foi editado. CSS grande merece investigação posterior, mas os 135 mil nós do resumo de 5.000 registros demonstram que reduzir somente CSS não resolveria a lentidão extrema.

PRÓXIMA MUDANÇA RECOMENDADA: prototipar em QA virtualização ou apresentação progressiva da lista de faturas, com rolagem, teclado, busca, acessibilidade, impressão e navegação preservados. Isso poderá alterar a estratégia de apresentação de milhares de cartões, e NÃO deve ser promovido automaticamente à tela homologada sem aprovação explícita do proprietário. Alternativa é investigar a paginação do backend + UI, mas exige compatibilidade e regras claras para não omitir saldos.

Outros passos: medir re-renderizações e chamadas API por clique/filtro; avaliar tamanho e compactação segura das respostas financeiras sem servir saldos antigos; concluir suíte E2E geral antes de release.

## Evidências
Diretório externo da auditoria: %LOCALAPPDATA%\ARL-Informatica-Dev\PERFORMANCE-ETAPA5-20261015
- expense-volume-baseline.log; fixtures-generated.log; synthetic-fixtures
- browser-volume-results.jsonl; baseline-browser-5000-confirm.log; candidate-browser-5000.log
- run-BEFORE-1..6.log e run-AFTER-1..6.log (teste backend rejeitado)
- expense-volume-baseline-confirm-desktop/mobile.png e expense-volume-formatter-candidate-desktop/mobile.png
- formatter-financial-regression.log; stage5-official-lint/typecheck/test-unit/build e stage5-official-phpunit.log
- backup-path.txt; scripts de benchmark e controle externo

A suíte E2E integral ainda não foi concluída; não declarar o aplicativo totalmente liberado para publicação.

## Encerramento: snapshot final validado
Arquivo: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 15-03 - ETAPA5-RESUMO-ANTES\CODIGO-LOCAL-ETAPA5-CODIGO-FINAL.tar.gz.
Manifesto: MANIFEST-CODIGO-ETAPA5-CODIGO-FINAL-SHA256.csv no mesmo diretório.
Resultado da extração/restauração: **953 arquivos e 953 hashes SHA-256 conferidos, zero divergências**. Arquivo comprimido 23,43 MiB, SHA-256 6996D81AA81BE3765718EE65F1DEAAE6AD63EAF021FCB998429288F95F697E11. Os arquivos .env, SQL, storage privado e .git não estão nesse pacote; seus backups pertencem a fases anteriores e devem continuar protegidos.
