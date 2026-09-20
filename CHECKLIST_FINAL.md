# Checklist final — Bloco B: Financeiro

## Estornos

- [OK] Estorno é registrado e exibido como saída negativa.
- [OK] Estorno informa OS, motivo, forma de devolução, responsável e data/hora.
- [OK] Formas de devolução limitadas no backend e na interface a Pix e Dinheiro.
- [OK] A devolução não altera nem abate a forma do pagamento original.

## Despesas

- [OK] Novas despesas exigem Compra de mercadoria ou Material de uso.
- [OK] Categoria armazenada em coluna própria e anulável para preservar registros anteriores.
- [OK] Despesas históricas sem categoria aparecem como Sem categoria.
- [OK] Aba Despesas respeita o mês selecionado e lista data, categoria, descrição e valor.

## Cálculos e apresentação

- [OK] Líquido calculado como recebido bruto menos estornos menos despesas.
- [OK] Recebido, estornos, despesas e líquido aparecem lado a lado no resumo mensal.
- [OK] Estornos e despesas não são consolidados em um indicador de saídas.
- [OK] Formas de pagamento separam entradas brutas e devoluções pela forma efetivamente usada.
- [OK] Origem das entradas usa o valor de OS após estornos.
- [OK] Gráfico diário mantém entradas, estornos e despesas em séries separadas.
- [OK] Verde sinaliza valores positivos e vermelho fica restrito a valores negativos.

## Rastreabilidade e relatórios

- [OK] Visão Geral, Caixa Diário e Movimentações identificam tipo, OS, usuário, data/hora e detalhes aplicáveis.
- [OK] Caixa Diário inclui despesas lançadas no dia.
- [OK] Relatório financeiro organiza resumo, formas, entradas, estornos e despesas em tabelas separadas.

## Validação executada

- [OK] 13 testes PHP focados do Financeiro, 154 asserções.
- [OK] 7 testes unitários frontend focados em datas e resumo de estorno.
- [OK] TypeScript typecheck e build de produção.
- [OK] Cenários Playwright filtrados do Financeiro e inspeção da captura desktop.
- [PENDENTE] Suítes completas, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.
