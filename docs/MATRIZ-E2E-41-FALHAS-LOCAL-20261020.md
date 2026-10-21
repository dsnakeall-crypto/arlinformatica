# MATRIZ E2E - 41 falhas do diagnostico LOCAL de 20/10/2026

**Origem:** e2e-integral-rodada1.json; 312 casos; 271 PASS; 41 FAIL; 9 timeouts; sem skips ou retries.
**ATENCAO:** captura INTERMEDIARIA. Testes foram modificados depois; nem o numero nem a causa devem ser tratados como resultado final.
**Ambiente:** Windows/Laragon/PHP local. GitHub Actions no SHA 8280da1 teve 65 falhas E2E. Nao confundir os dois checkpoints.
**Seguranca:** contem apenas nomes de testes e erros resumidos, sem dados de clientes, credenciais, traces ou banco.

| Nr | Arquivo | Teste | Resultado | Erro inicial |
|---:|---|---|---|---|
| 1 | clean-appearance.spec.ts | Original é restaurado também no conteúdo e Clean não altera impressão | failed | Error: expect(received).toEqual(expected) // deep equality |
| 2 | dashboard-loading-regression.spec.ts | Painel Desktop mantém carregamento das OS abertas e encerradas | failed | Error: expect(received).toBeGreaterThan(expected) |
| 3 | eight-improvements-balances.spec.ts | saldos e parcelas pessoais preservados em 390px | timedOut | Test timeout of 30000ms exceeded. |
| 4 | expense-control.spec.ts | controle: visual desktop e mobile sem vazamento de layout nos popups | timedOut | Test timeout of 30000ms exceeded. |
| 5 | expense-control.spec.ts | controle: Gastos memoriza lista/cards separadamente por conta neste navegador | failed | Error: expect(locator).toBeVisible() failed |
| 6 | expense-control.spec.ts | controle: fatura paga somente o mês e quitar compra liquida todas as parcelas do casal | failed | Error: expect(received).toBe(expected) // Object.is equality |
| 7 | expense-spending-history.spec.ts | mobile documento: projeção sem sobreposição, gastos só em lista e ícones iguais | failed | Error: expect(locator).toBeVisible() failed |
| 8 | expense-value-split.spec.ts | divisão por valores e popup manual em 390px | timedOut | Test timeout of 30000ms exceeded. |
| 9 | expense-web-floating-invoices-20261010.spec.ts | Faturas Web em janela estreita permanecem legíveis e mobile não recebe CSS Web | failed | Error: expect(locator).toBeVisible() failed |
| 10 | expense-web-reference-compact-20261010.spec.ts | Web Gastos/Instituições se adapta em janelas estreitas e preserva layout Web | timedOut | Test timeout of 30000ms exceeded. |
| 11 | expense-web-reference-compact-20261010.spec.ts | Mobile não recebe nova camada Web e mantém sua navegação própria | failed | Error: expect(locator).toBeVisible() failed |
| 12 | external-attendance-highlight.spec.ts | home Mobile exibe atendimento externo com as cores de aguardando pagamento | failed | Error: expect(locator).toHaveCSS(expected) failed |
| 13 | fase2-responsive-regression.spec.ts | Regressão responsiva WEB original | failed | Error: expect(locator).toBeVisible() failed |
| 14 | fase2-responsive-regression.spec.ts | Regressão responsiva WEB clean | failed | Error: expect(locator).toBeVisible() failed |
| 15 | mobile-modal-nav-click-safety-20261011.spec.ts | Mobile: barra inferior não intercepta salvar Entrada Rápida em popup | failed | Error: expect(locator).toHaveCSS(expected) failed |
| 16 | mobile-operacao-clean-20261009.spec.ts | mobile: Clean obrigatório, sem Web/PC ou Pós-Venda, lateral ativo vermelho sem aro | failed | Error: expect(locator).toBeVisible() failed |
| 17 | mobile-operacao-clean-20261009.spec.ts | ordens mobile: equipamento central, ícones sem caixas, web intacta | timedOut | Test timeout of 30000ms exceeded. |
| 18 | mobile-operacao-clean-20261009.spec.ts | financeiro mobile: mês com calendário e setas; Web mantém filtro anterior | timedOut | Test timeout of 30000ms exceeded. |
| 19 | open-order-confirmation.spec.ts | Alterar status no Painel atualiza as listas uma vez, sem recarga duplicada | failed | Error: expect(received).toBe(expected) // Object.is equality |
| 20 | performance-clients-large-load-20261011.spec.ts | Carga de clientes: medir lista completa, paginada e pesquisa sem alterar dados reais | failed | Error: expect(locator).toBeVisible() failed |
| 21 | performance-stage-one.spec.ts | Painel consulta a semana uma vez e usa total, não tamanho da página | failed | Error: expect(locator).toHaveText(expected) failed |
| 22 | post-sale-bulk.spec.ts | marca dez cards, confirma uma exclusão em lote e preserva OS, PDFs e o card não marcado | timedOut | Test timeout of 30000ms exceeded. |
| 23 | sidebar-navigation.spec.ts | menu agrupa destinos, destaca Nova OS e mostra contadores vindos do backend nos dois layouts | failed | Error: expect(locator).toBeVisible() failed |
| 24 | sidebar-navigation.spec.ts | menu contém logo, bordas e contadores em 1280px | failed | Error: expect(received).toBe(expected) // Object.is equality |
| 25 | sidebar-navigation.spec.ts | menu contém logo, bordas e contadores em 1920px | timedOut | Test timeout of 30000ms exceeded. |
| 26 | simulation-volume.spec.ts | volume integrado: 30 clientes/OS, 30 fornecedores/compras e 48 dívidas na interface | timedOut | Test timeout of 240000ms exceeded. |
| 27 | web-clean-unified-action-icons-20261010.spec.ts | Web Clean: Painel, Ordens e Clientes usam ícones 18px, sem aro, com assets compartilhados | failed | Error: expect(locator).toBeVisible() failed |
| 28 | web-clean-unified-action-icons-20261010.spec.ts | Web Original: estilo próprio não recebe regra Clean para Maps | failed | Error: expect(received).not.toBe(expected) // Object.is equality |
| 29 | web-desktop-responsive-20261010.spec.ts | Web original: adapta largura, não troca o layout e tem escolha só em Configurações | failed | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'getBoundingClientRect') |
| 30 | web-desktop-responsive-20261010.spec.ts | Web clean: adapta largura, não troca o layout e tem escolha só em Configurações | failed | Error: page.evaluate: TypeError: Cannot read properties of null (reading 'getBoundingClientRect') |
| 31 | web-desktop-responsive-20261010.spec.ts | Web original: menu fixado adapta e volta ao tamanho anterior sem trocar preferência | failed | Error: expect(locator).toBeVisible() failed |
| 32 | web-desktop-responsive-20261010.spec.ts | Web clean: menu fixado adapta e volta ao tamanho anterior sem trocar preferência | failed | Error: expect(locator).toBeVisible() failed |
| 33 | web-layout-persist-icons-20261010.spec.ts | Web oferece Original e Clean e a escolha persiste quando a janela muda de tamanho | failed | Error: expect(locator).toHaveClass(expected) failed |
| 34 | web-layout-persist-icons-20261010.spec.ts | Mobile mantém Clean sem seletor Original, mesmo após ampliar a janela | failed | Error: expect(locator).toBeVisible() failed |
| 35 | zz-visual-homologation.spec.ts | gera evidências para homologação visual desktop, mobile e PDF | failed | Error: expect(locator).toBeVisible() failed |
| 36 | eight-improvements-mobile.spec.ts | mobile: atendimento selecionado persiste após blur e navegação respeita o rodapé | failed | Error: expect(received).toBeCloseTo(expected, precision) |
| 37 | expense-monthly-final.mobile.spec.ts | fatura final mobile: categorias, PDFs, CSRF, partes e mês quitado | failed | Error: expect(locator).toHaveCSS(expected) failed |
| 38 | expense-quick-payment-scenario.ts | pagamento rápido: mês e parcial limitados, casal sem total, individual total, CSRF e outra parte | failed | Error: expect(received).toBeCloseTo(expected, precision) |
| 39 | mobile-nav-keyboard.mobile.spec.ts | barra ARL compacta preserva 5 ações e compensa teclado virtual | failed | Error: expect(locator).toBeVisible() failed |
| 40 | mobile.spec.ts | mobile possui home própria, ações tocáveis e inputs sem zoom forçado | failed | Error: expect(locator).toBeVisible() failed |
| 41 | pacote-final.mobile.spec.ts | iPhone: retorno confirmado, pesquisas neutras e menu junto à base | failed | Error: expect(locator).toHaveCSS(expected) failed |

**Proxima tarefa Cloud:** investigar e corrigir cada item, sem desativar testes, atualizar contratos legados e reproduzir regressao funcional em ambiente compativel com GitHub Actions.
