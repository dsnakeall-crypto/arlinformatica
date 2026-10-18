# ARL Informática — Etapa 6: protótipo de lista virtualizada

Data: 15/10/2026. Estado: **PROTÓTIPO VALIDADO EM QA; NÃO HOMOLOGADO PARA PROMOÇÃO AO ORIGINAL.**

## 1. Autorização, isolamento e segurança
- Usuário autorizou criar e testar o protótipo apenas em cópia isolada, mostrando resultados antes da promoção.
- Código oficial local: C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica. Branch original-restaurado-20261014, HEAD 53bb453 + alterações locais anteriores aprovadas e não commitadas. Não restaurar a partir do HEAD isolado.
- Cópia QA: %LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE. Backend de testes em SQLite descartável, fixtures fictícias fornecidas via interceptação da API no browser. Nenhum dado financeiro real usado.
- Arquivos PHP, CSS, SQL, banco real, arquivos privados, build do aplicativo oficial, GitHub e KingHost NÃO modificados.
- Backup anterior verificado via SHA256: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 16-43 - ETAPA6-PROTOTIPO-QA-ANTES. As cópias ORIGINAL e QA de resources/js/expense-month-details.tsx eram idênticas (SHA256 E66AB86A68B2CC747DD96EF7FE0717C07D7816BA22F1CC6FACBBA66961F6DB80).
- Candidato QA guardado nessa mesma pasta sob CANDIDATO-QA: resources/js/expense-month-details.tsx, resources/js/expense-virtual-invoice-grid.tsx e dois novos testes E2E, com MANIFEST-CANDIDATO-QA-SHA256.csv. Quatro arquivos copiados e SHA256 confrontados.

## 2. Como funciona
- Até 100 faturas: lista normal, sem virtualização. Acima de 100, o VirtualInvoiceGrid desenha cerca de 14 cartões inicialmente e usa espaçadores explícitos para representar a altura das demais linhas.
- Ao rolar, substitui apenas a faixa de cartões visíveis. O array de faturas e valores permanece inteiro em memória, e o HTML dos botões mantém as classes, textos, datas, valores, ícones e callback originais.
- Congela a medição de colunas/altura durante rolagem, atualizando quando a largura do grid muda. Desativa overflow-anchor apenas dentro do grid virtual, evitando que Chrome provoque salto de rolagem.
- Teclado: Tab e Shift+Tab ao cruzar a fronteira renderizada, setas, Home e End, com foco no destino.
- Impressão: antes de imprimir monta todas as faturas sincronicamente; após imprimir volta ao modo virtual. Testado com 500 faturas pelo evento do navegador, ainda SEM homologação física de impressão.
- Não mexe no JSON/API, saldos, cálculos, filtros, pagamentos, histórico ou cache. O resumo ainda transmite cerca de 1,38 MB sem compactação na carga sintética de 5.000.

## 3. Resultados medidos (mesma máquina, dados fictícios)
| Métrica / 5.000 faturas | Original baseline Etapa 5 | Protótipo Etapa 6 |
|---|---:|---:|
| Tempo para página montada, desktop | 5.096 ms | 1.622 ms |
| Tempo para página montada, mobile | 5.575 ms | 1.581 ms |
| Elementos HTML totais desktop | 135.488 | 867 |
| Elementos HTML totais mobile | 135.496 | 875 |
| Botões de faturas na primeira tela | 5.000 | 14 |
| Tarefas longas observadas desktop | 2.199 ms | 0 ms nesta coleta |
| Tarefas longas observadas mobile | 2.648 ms | 0 ms nesta coleta |

Tempos Playwright no PC com sessões de QA, não KingHost nem aparelho físico. Instrumentação levemente diferente entre as duas etapas: o teste novo ainda aguarda 250 ms adicionais. Não garantir essas porcentagens na rede real.

Custo de download incremental do Controle de Gastos: local oficial 344,42 KiB bruto / 69,74 KiB gzip estimado; QA com virtualização 348,13 KiB bruto / 71,11 KiB gzip estimado. Aumento aproximado de 3,71 KiB bruto e 1,37 KiB gzip em troca de uma redução muito grande de DOM em volume.

## 4. Testes efetivamente executados
- Lint, TypeScript, 61 testes unitários e build do QA: PASS.
- Playwright QA com as regressões financeiras, indicadores, pagamentos rápidos, detalhes mensais, visual e 100/500/1.000/5.000 faturas desktop/mobile: **17/17 PASS**.
- Playwright QA final: **10/10 PASS** nos oito cenários principais e duas situações de descrições deliberadamente longas, com rolagem em 20%, 50%, 80%; sem overflow horizontal e com cartões visíveis.
- Ao rolar 5.000: validado índice intermediário ~2491, ida ao último cartão, clique disparando requisição para a dívida fictícia final (debt_id 4989), e tecla Home/End com foco no primeiro/último cartão. A resposta de detalhes dessa dívida não existe no banco descartável: NÃO equivale à abertura de popup real em 5.000 registros. O E2E regular de detalhes foi aprovado separadamente.
- Impressão com 500 faturas: confirmado que evento beforeprint montou os 500 botões, afterprint restaurou menos de 80 botões. Não houve ensaio de impressora real nem PDF final completo.
- Os PNGs da PRIMEIRA VISÃO de 5.000 faturas da Etapa 5 e Etapa 6 foram idênticos byte a byte (SHA256) para desktop e mobile; nenhum CSS alterado.
- FALHAS INTERMEDIÁRIAS do protótipo: primeiro padding para espaços foi sobrescrito pelo CSS aprovado; depois o ancoramento automático do scroll desktop causou salto ao fim. Ambos corrigidos apenas na QA e retestados; os 27 casos relevantes finais ficaram verdes.
- Nenhum arquivo PHP mudou, portanto PHPUnit integral não foi repetido nesta rodada. Última bateria do original na Etapa 5: 400/400 PASS e 7.439 assertions em SQLite memória. Suite integral E2E 293 ainda não validada para release.

## 5. Por que NÃO promover automaticamente ao aplicativo oficial
1. Busca Ctrl+F e leitura sequencial de leitores de tela acessam somente o trecho atualmente renderizado. Precisam de homologação de acessibilidade e eventualmente busca interna antes de alterar a tela oficialmente aprovada.
2. Impressão validada apenas por eventos, sem PDF completo/preview/impressora homologados.
3. Cartões reais podem ter alturas mais variadas que a massa testada (incluiu 500 mistos); validar casos extremos.
4. Requer aprovação específica do proprietário para alterar estratégia de exibição, inclusive efeitos sobre busca e rolagem.
5. Suíte E2E geral do aplicativo ainda pendente; não publicar no GitHub/KingHost e não usar banco real.

## 6. Próximo passo exato
Apresentar o ganho demonstrado, as limitações e solicitar autorização para aprofundar a homologação de acessibilidade/busca/impressão antes de qualquer implantação no código oficial. O protótipo continuará apenas na QA.

Evidências locais: %LOCALAPPDATA%\ARL-Informatica-Dev\PERFORMANCE-ETAPA6-20261015: stage6-full-targeted-e2e.log (17 PASS), stage6-final-prototype-e2e.log (10 PASS), stage6-invoice-benchmark.jsonl, stage6-mixed-height-print.jsonl, capturas stage6-firstview-desktop/mobile.png, logs de lint/TS/build/unit, compare-bundles-stage6.log, bundle-stage2-before-after.json, backup-path.txt.

**RESULTADO: PROTÓTIPO QA APROVADO TECNICAMENTE NO ESCOPO TESTADO. GATE DE PROMOÇÃO: PENDENTE. NÃO PUBLICAR.**
