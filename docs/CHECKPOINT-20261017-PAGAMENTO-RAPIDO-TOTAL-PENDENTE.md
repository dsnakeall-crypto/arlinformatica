# ARL Informática — Pagamento Rápido: subtotal pendente por grupo

Data: 17/10/2026

## Pedido do proprietário
No Controle de Gastos, ao clicar no cifrão **Falta pagar** do card individual, a lista **Pagamento rápido de [responsável]** apresenta os grupos, por exemplo Fixo da Casa, Mercado Pago / cartão de crédito, Nubank Croma / cartão de crédito. Ao terminar os lançamentos ainda pendentes de **cada** grupo, exibir um pequeno cartão **amarelo** com **“Total que falta pagar”** e valor somado daquele grupo.

## Aplicação local
- `resources/js/expense-person-payment.tsx`: mantém o filtro já existente de dívidas com `month_remaining_cents > 0`, separa por `institution_id:type_id` como já fazia e acrescenta o cartão informativo no final de cada grupo; ele não executa pagamento.
- `resources/js/expense-quick-payment-total.ts`: soma os saldos restantes do mês já filtrados para o responsável atual; não usa valor original, pago/abatido nem parcelas futuras e ignora saldos não positivos.
- `resources/css/arl-eight-improvements-20261012.css`: card amarelo/dourado responsivo e com texto escuro legível.
- `tests/frontend/expense-quick-payment-total.test.mjs`: casos de soma R$25+R$45+R$37=R$107, compras novas após pagamento parcial, contas quitadas, grupos independentes e lista vazia.

## Resultado dos testes
- 5/5 testes novos de subtotal PASS.
- 66/66 testes de regressão frontend PASS.
- TypeScript `npm run typecheck` PASS.
- ESLint direcionado aos arquivos novos/alterados PASS.
- Compilação Vite isolada PASS (10,55 s; sem publicar nem substituir assets de produção).
- Sem alteração de banco de dados, endpoints, valores já pagos, regras de quitação ou permissões.
- Validação visual final com usuário ainda PENDENTE.

## Segurança e estado da entrega
Alteração feita **somente no projeto local**:
`C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica`.

Backup completo dos dois arquivos editados e relatórios de testes:
`C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\ALTERACAO-20261017-TOTAL-PENDENTE-PAGAMENTO-RAPIDO`.

**Nenhuma publicação na KingHost, sincronização para banco real ou atualização do sistema online foi realizada.** As modificações de código não foram comitadas; não sobrescrever alterações preexistentes em outros arquivos.
