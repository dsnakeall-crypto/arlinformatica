# Execução do plano mestre — Reforma Mobile + Clean + Controle de Gastos (09/10/2026)

Plano de origem: `docs/PLANO_MESTRE_REFORMA_MOBILE_CLEAN_GASTOS_2026-10-09.md`.
Ambiente: implementação aplicada à pasta local `C:\laragon\www\arlinformatica`; testes executados em cópia isolada
(SQLite descartável e storage próprio), **sem tocar no banco DDEV nem em produção**. Nenhuma publicação.

## Backup anterior às alterações

`C:\Users\Allan\ARL-backups\reforma-mobile-clean-gastos-20261009-1815`
- `historico-completo.bundle` (histórico Git completo, verificado), `uncommitted.patch` (todas as alterações não
  commitadas, verificado com `git apply --check`), `changed-files.tar` (cópia física dos 47 arquivos alterados + `.env`),
  `git-status.txt`, `LEIA-ME.txt` (como voltar).

## Fase 5/6 — Controle de Gastos (regra confirmada pelo proprietário)

Backend (`ExpenseControlController::summary`) — campos **somente acrescentados** em `totals`, em centavos inteiros:
`one|two_personal_original_cents`, `one|two_shared_original_cents`, `one|two_credited_cents`, `credited_cents`,
`next_due_on`, `oldest_overdue_on`. Créditos são somados pelo **dono da cota** (`credit_one/credit_two`), nunca por
`paid_by`. Estornos (`reversed_at`) não contam. Abatimentos legados (`discount`) entram em Pago/Abatido sem criar
operação nova. Campos existentes mantêm o significado. Nenhuma migration, nenhum dado alterado.

Tela (PC e celular, mesmo componente `expense-summary-overview.tsx`):
- 5 indicadores: Total a pagar no mês · Total {pessoa 1} · Total {pessoa 2} · Total Casal · Próximo pagamento.
  Cada total mostra **ORIGINAL** (não diminui com pagamentos) e **Falta pagar** separadamente.
- Total Casal é informativo e já está dentro dos totais individuais (não é somado de novo).
- Cards apenas das duas pessoas (nomes do cadastro), com Valor pessoal, Valor casal, Pago/abatido,
  Valor total (original) e Falta pagar. Card "Casal" e seletor Allan/Carol/Casal do resumo removidos.
- Demais telas (filtros de responsável em Gastos, faturas, pagamentos, projeção, cadastro por foto, divisão por
  valores 300/100) inalterados.

Invariantes verificadas em teste: Allan + Carol = global original; Casal = soma das cotas compartilhadas;
falta Allan + falta Carol = falta global; original − créditos = saldo, por pessoa.

## Fase 2 — Mobile próprio (sem alterar a home de OS)

`resources/css/arl-mobile-screens.css` (novo, importado em `main.tsx`), aplicado só com
`html[data-layout="mobile"] .layout-mobile`, excluindo `main[data-arl-dashboard-react]` (home de OS) e o miniapp de gastos:
- Cabeçalhos compactos; ações em grade.
- Abas (Ordens, Financeiro, Sistema, Documentos, Fornecedores) em grade com todos os rótulos visíveis.
- Lista de Ordens em cartões (mesma tabela/ações/seletores; somente apresentação).
- Detalhe da OS **completo no celular** (`readOnly={false}` em `main.tsx`): Histórico, Editar, Orçamento, PDF's,
  Pagamento, Concluir, fotos, serviços e laudo — mesmas APIs e permissões de backend do PC. Ações em grade de 3
  (2 quando estreito), etapas compactas, valores financeiros legíveis. **Substitui a decisão anterior de OS
  somente leitura no celular**, conforme o plano de 09/10/2026.
- Financeiro em cartões 2×2; tabelas com rolagem própria.
- Área de toque mínima de 44 px nas telas internas; campos com 16 px.
- Configurações no celular por **categorias em cartões** com botão "← Configurações" (`settings-page.tsx`);
  no PC as abas continuam iguais.
- Miniapp de gastos: parcelas reorganizadas, ações de 44 px (`expense-control-mobile.css`, identidade azul preservada).
- `resources/css/mobile-v2.css` (arquivo anterior não referenciado por nenhum import) foi mantido intocado.

## Fase 3 — Configurações > Layouts

`layouts-settings.tsx` + `layouts-settings.css`: três cartões (Web / PC · Mobile — barra inferior · Mobile — menu
lateral compacto) com mini-prévia desenhada, selo de categoria, indicador de selecionado e botão evidente.
Mesma persistência por dispositivo/usuário já existente; sem mudança de permissões.

## Fase 4 — Clean Premium

Bloco final em `clean-appearance.css`, ativo apenas com `data-arl-appearance="clean"`: primário em degradê da cor
escolhida, secundário branco elevado com borda tingida, perigo vermelho próprio, ativo com contorno da cor,
desativado plano/tracejado, painéis com luz superior, foco visível. Sem blur, sem animação contínua;
`prefers-reduced-motion` respeitado. Original e as sete cores preservados. Home mobile de OS sem relevo novo.

## Testes — resultados reais (cópia isolada, SQLite descartável; nada no DDEV)

Comprovado:
- PHP completo: **336 testes / 6.833 verificações OK** (inclui 6 testes novos `ExpenseSummaryIndicatorsTest`, 172
  verificações: exemplo do proprietário 1.000/500/400 com 300/100, adiantamento de R$200 do Allan e baixa de R$100 da
  Carol → bruto R$1.900 mantido, falta R$1.600; pagamento de Carol na cota do Allan; estorno; abatimento legado;
  50/50 com centavo ímpar; várias faturas na mesma instituição; parcelas em meses diferentes; dívida quitada;
  mês vazio; compatibilidade dos campos antigos). Pint OK nos arquivos PHP alterados.
- TypeScript (tsc -b), ESLint (projeto inteiro, 0 avisos), 41 testes de frontend, build Vite: OK.
- Navegador (Playwright): novos `expense-indicators` (PC 1366/1920) e `expense-indicators-mobile`
  (320/360/375/390/414/430/768, verifica valores e que nenhum valor fica cortado): OK. `expense-control-mobile`
  (5 cenários) OK após a mudança. `clean-appearance` (sete cores/contraste) e `settings-client-layout` OK após ajuste.
- Auditoria geométrica antes/depois (`tests/e2e/reforma-auditoria-mobile.spec.ts`, 12 telas × 8 larguras):
  elementos fora da tela Ordens 4→0, Financeiro 5→0, Configurações 9→0; alvos de toque < 44 px Ordens 14→0,
  Financeiro 5→0, Configurações 9→0; nenhum overflow horizontal em nenhuma tela.
- Home mobile de OS: capturas antes/depois em 320/390/768 idênticas, exceto o nome do cliente de teste
  (texto com carimbo de data). Nenhum arquivo da home (`mobile-home.ts`, `dashboard-page.tsx`) foi alterado.

Suíte E2E completa (comparação justa, bancos separados: original na porta 8012, nova na 8011):
- Versão original (antes de mim): 187 testes → 148 aprovados, **35 já falhavam**, 4 não executados.
  Causa principal das falhas antigas: os testes ainda procuram o seletor "Layout neste dispositivo" no cabeçalho,
  que o trabalho não commitado anterior moveu para Configurações; e 3 testes de Controle de Gastos desatualizados
  pelo miniapp independente.
- Versão nova: interrompida por limite de cota em 169/189. Falhas encontradas = as mesmas 35 da original, exceto
  duas novas que **foram corrigidas e reexecutadas com sucesso** (`clean-appearance` contraste e
  `settings-client-layout` por causa das categorias no celular). **Não executados nesta rodada:** `theme`,
  `whatsapp-opening`, `zz-visual-homologation`, `mobile.spec`, `arl-mobile-reform.mobile.spec`,
  `_mobile-audit-temp.mobile.spec`.

## Não testado / pendências

- [PENDENTE] Rodar no DDEV com os dados reais (somente leitura de telas): `ddev exec php artisan test --filter=ExpenseSummaryIndicatorsTest`
  usa SQLite em memória (phpunit.xml) e não toca o MySQL do DDEV; depois `npm run build` e conferir no navegador.
- [PENDENTE] Conferir no DDEV se os 5 indicadores batem com a soma manual de um mês real conhecido.
- [PENDENTE] Testes desatualizados que já falhavam antes (35) — principalmente substituir o uso do seletor
  "Layout neste dispositivo" por troca via Configurações > Layouts. `mobile-home.spec.ts:39`, `mobile.spec.ts` e
  `client-history-shortcut.spec.ts` ainda esperam a OS **somente leitura** no celular e precisam ser atualizados
  para o detalhe completo (decisão nova do plano).
- [PENDENTE] Homologação visual em iPhone/Android reais (barra inferior, menu compacto, popups de Orçamento,
  Pagamento e Concluir no detalhe completo), e do Clean Premium nas sete cores pelo proprietário.
- [PENDENTE] Tela de Fornecedores com ficha/compras no celular não foi auditada com dados (lista vazia na auditoria).
- [PENDENTE] Voltar da OS para a lista de Ordens (decisão da Etapa 2 de performance, não incluída).
- [PENDENTE] Commits: não foram feitos (há muito trabalho anterior não commitado). Publicação: **não autorizada / não feita**.
- `resources/css/mobile-v2.css` (arquivo antigo, sem import) foi deixado como estava.
