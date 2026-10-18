# Controle de Gastos WEB — abas flutuantes e faturas organizadas (10/10/2026)

## Pedido
- Remover **moldura geral branca** e fundo que circundavam a linha de abas Resumo, Gastos, Instituições etc. Cada botão mantém somente o próprio contorno, sombra e foco acessível.
- Remover superfícies/contornos gerais de agrupamento na página Resumo, incluindo a área de Faturas do mês. Preservar os próprios cartões individuais.
- Faturas do mês: **uma barra individual azul-clara, simples** para cada instituição/tipo, com `Instituição — Tipo`, vencimento na segunda linha à esquerda e valor BRL completo à direita. Remover ícone lateral vermelho e seta de cada fatura no Web, mantendo **a barra inteira clicável**.
- Não modificar mobile, cálculos financeiros, banco de dados oficial, ERP/OS ou outras seções aprovadas.

## Diagnóstico confirmado
Na folha Web anterior, `.cg-invoice-card` recebia grade de **3 colunas**, mas o componente React renderiza **4 filhos** (símbolo, descrição, valor e seta). Isso espremia o valor em `R$` e derrubava a seta. A correção é apenas de CSS, sem mudar a API ou cálculo de `remaining_cents`.

## Implementação
- NOVO `resources/css/expense-web-floating-invoices-20261010.css` importado no final das folhas do Gestor por `resources/js/expense-control-page.tsx`.
- Regras estritamente condicionadas a `.shell.layout-desktop .cg-page.cg-expense-web-mirror`. Mobile original preservado.
- `.cg-navigation` e `.cg-tabs`: fundos, bordas gerais e sombras zerados; aba ativa e botões preservam os próprios contornos.
- `.cg-mobile-summary` e agrupamentos `.cgo-indicators`, `.cgo-people`, `.cg-monthly-invoices`, `.cg-invoice-grid`: sem borda/sombra de recipiente; cartões internos permanecem.
- `.cg-invoice-grid`: uma fatura por linha. Botão de fatura: duas colunas `minmax(0,1fr) max-content` e duas linhas: título em cima, data e valor abaixo. Ícone vermelho e seta ocultos somente via CSS no Web. Valor BRL completo, sem corte.
- Responsividade: quando a área útil tiver menos de 460 px, o valor pode ir à terceira linha para nunca cortar o número.

## Backup
`C:\Users\Allan\ARL-backups\expense-web-bars-invoices-20261010-012434`
Inclui arquivo(s) existentes ANTES da edição, status do Git, patch prévio e hashes SHA256.

## Testes aprovados
- DDEV: lint, TypeScript/typecheck, build e **50 testes unitários** aprovados.
- Playwright Chromium com **SQLite TEMPORÁRIO**: testes da nova correção **3/3**, mais regressão de visual/reponsividade anterior **4/4**; bateria conjunta **7/7 aprovada**.
- Regressão com **três faturas**: cartão de crédito de R$ 350,00, empréstimo de R$ 999,90 e cartão de R$ 127,45. Todos exibidos completos.
- Aferição: a data e o valor ficam na mesma linha, valor à direita; sem ícone lateral/seta; fatura permanece clicável e navega à despesa.
- Testados agrupamento flutuante, abas com contorno individual, janela Web estreita e preservação da interface mobile.
- Evidência visual local: `output/expense-web-floating-invoices-20261010/web-invoices-bars-3-items.png`, `web-invoices-amount-visible.png`, `web-summary-floating.png`.

## Restrições
Sem Git reset, commit, push, publicação em KingHost nem alteração do banco REAL. Homologação visual com dados reais no ambiente local e auditoria final continuam pendentes antes de publicar.
