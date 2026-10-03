# Fornecedores, compras e entradas de estoque

Implementação de 02/10/2026 autorizada pelo proprietário. Atende à instalação atual de uma empresa. A cópia comercial e a estratégia de assinatura serão tratadas separadamente.

## Uso

1. Acesse **Cadastros → Fornecedores** como Master ou Administrador.
2. Cadastre razão social/nome completo, nome fantasia, CPF/CNPJ, celular, WhatsApp e endereço completo obrigatórios; fixo, e-mail, contato e observações opcionais.
3. Abra a ficha e escolha **Registrar compra**. Selecione produtos existentes ou cadastre um produto com preço de venda e saldo inicial zero.
4. Informe quantidade e custo unitário, independente do preço de venda.
5. Se a mercadoria chegou, mantenha **Mercadoria recebida agora** selecionado. Caso contrário, desmarque e informe uma previsão opcional.
6. Abra a compra pendente e escolha **Receber mercadoria**. Informe as unidades entregues; zero permite deixar um item pendente.

A ficha possui contatos, histórico paginado de compras e entregas e produtos adquiridos. Os indicadores gerais mostram fornecedores ativos, compras pendentes e custo das mercadorias recebidas.

Inativar bloqueia novas compras e preserva o histórico. Compras anteriores ainda podem ser recebidas. Não existem exclusão de fornecedor nem alteração destrutiva de compra neste módulo.

## Produto, fornecedor e custo

O produto continua no catálogo existente, sem fornecedor obrigatório. O vínculo comercial fica na compra/entrada; o mesmo produto pode ser adquirido de vários fornecedores ou recebido de brinde.

| Entrada de um SSD | Fornecedor | Custo unitário | Preço de venda cadastrado |
| --- | --- | --- | --- |
| Compra | Distribuidora escolhida | R$ 200,00 | R$ 480,00 |
| Brinde | Opcional | R$ 0,00 | R$ 480,00 |
| Saldo antigo sem custo informado | Opcional | Desconhecido | R$ 480,00 |

Em **Produtos → Entrada de estoque**, origem, fornecedor opcional e custo podem ser registrados. Brinde tem custo zero, também imposto no servidor; custo desconhecido fica `null`, separado de zero.

O cadastro rápido de produto é uma operação própria: abandonar a compra mantém o produto cadastrado com saldo zero. Nenhum recebimento ocorre até a confirmação da compra/entrega.

## Histórico e integridade

- Compra pendente não altera estoque; entrega parcial soma somente o que chegou.
- **Cancelar saldo pendente** exige motivo, preserva unidades recebidas e não estorna estoque.
- O servidor calcula subtotais e total. Nome do produto, fornecedor e custo são fotografados no registro histórico; alterações posteriores nos cadastros não o reescrevem.
- Chaves de solicitação impedem duplicar compras, entregas e entradas manuais em uma repetição da mesma confirmação. Reutilizar a chave com outros dados é rejeitado.
- Entrega maior que o saldo pendente, item de outra compra, produto inativo/serviço em nova compra e estouro do saldo são rejeitados atomicamente.
- Todas as rotas exigem sessão, CSRF e autorização Master/Administrador no backend. A auditoria registra cadastro, compra, recebimento e cancelamento.

## Banco e compatibilidade

A migração `2026_10_02_100000_create_supplier_purchases.php` cria cinco tabelas com FKs e índices: `suppliers`, `supplier_purchases`, `supplier_purchase_items`, `supplier_purchase_receipts` e `stock_entry_details`.

Ela não altera tabelas existentes nem recalcula saldos. `service_catalog.stock_quantity` e `stock_movements` continuam controlando as quantidades das OS. Saídas/devoluções mantêm o fluxo anterior. Movimentações antigas são consultadas com `LEFT JOIN`, sem custo artificial retroativo.

Recebimento e saldo são transacionais, com bloqueio dos registros envolvidos. Backup/restauração incluem as tabelas novas. A limpeza existente foi adaptada às dependências. A falha anterior de isolamento descoberta no teste de restauração e a recuperação integral estão documentadas em `docs/ISOLAMENTO_BACKUPS_TESTES.md`.

Referências: [bloqueios do Laravel](https://laravel.com/docs/12.x/queries#pessimistic-locking) e [validação de arrays](https://laravel.com/docs/12.x/validation#validating-arrays).

## Backup e migração local

Backup fora do Git: `C:\Users\Allan\ARL-backups\fornecedores-20261002-092132`, com código anterior, alterações locais, histórico Git e ZIP protegido/validado do banco e arquivos privados. Backups anteriores de layout mantidos.

- Código anterior: SHA-256 `7D6C8455507D1094637AA64FEEB0C8DB12B831784F24B066C41988434CD21EDC`.
- Backup final recuperado e validado: `banco-final-recuperado-e-validado.zip`, SHA-256 `07221c6c73ddbbd121aa42795e13505c5b1926c300aa4ca2bdcdad6e4a1f6059`.
- Banco/arquivos anteriores: SHA-256 `687462d7c5217a70e0025d90e1ecfc30ea990be3d1eed8cfb828568ae97de524`.
- Migração aplicada exclusivamente ao MySQL local `arl_informatica` após backup validado.
- Conferência por hash preservou clientes (596), OS (17), catálogo (22), movimentações (15), orçamentos (5), documentos (23), pagamentos (6), transações (8) e despesas (1).
- As tabelas novas começaram vazias. Após corrigir a falha anterior de restauração, as 35 tabelas de dados e os 123 arquivos privados do backup foram recuperados e conferidos por hash. Não há cadastro fictício no banco de uso.
- Produção não atualizada neste trabalho. Publicação exige backup próprio validado do servidor e `php artisan migrate --force` após enviar o código.

Não usar `migrate:fresh`, reset ou restauração de backup antigo para publicar o módulo. Uma volta de código após começar a usar fornecedores precisa preservar os dados novos: restaurar o ZIP anterior apagaria operações posteriores ao backup.

## Limites desta etapa

Compra não cria despesa/pagamento automaticamente no Financeiro, evitando duplicação. Contas a pagar, parcelas, vencimentos, lembretes e anexos de nota foram acrescentados em `FORNECEDORES_PAGAMENTOS_NOTAS.md`. Devoluções ao fornecedor permanecem para uma etapa futura.

Custos são registrados por entrada. Baixa por lote/FIFO/custo médio e margem por venda ainda não foram implementadas. O indicador de valor recebido é custo histórico de entradas recebidas, não valor do estoque restante ou lucro.

Não foi criada arquitetura para várias empresas ou cobrança de assinatura. O módulo não fixa nome/documento/contatos da ARL em registros de fornecedores; reutiliza a identidade visual do aplicativo atual.

## Validação

PHP: 222 testes aprovados, 1.873 asserções, incluindo os testes do módulo e de isolamento. Frontend: 12 testes unitários aprovados. E2E próprio aprovado com cadastro, produto novo, compra pendente, duas entregas, repetição sem duplicar, brinde sem fornecedor e CSRF real. Capturas desktop/mobile em `output/fornecedores`, sem dados reais. Lint, typecheck, Pint e build aprovados. Suíte E2E completa: 106 testes aprovados, sem retries. Fornecedores/estoque também aprovados em MySQL isolado: 17 testes, 138 asserções. Ajustes finais restritos ao módulo reconferidos pelo seu E2E.

Atualização do cadastro: documento, razão social/nome completo, nome fantasia, celular, WhatsApp e endereço completo são obrigatórios em novos cadastros/edições; telefone fixo opcional. Consulte as regras e limites de verificação cadastral em `FORNECEDORES_PAGAMENTOS_NOTAS.md`.


## Ficha profissional revisada
A organização e os novos recursos de 03/10/2026 estão documentados em [FORNECEDORES_FICHA.md](FORNECEDORES_FICHA.md). O histórico anterior permanece válido; condições comerciais não reescrevem compras anteriores.


### Histórico de compras detalhado — 03/10/2026
Uma compra por card clicável: número/referência, produtos e quantidades do snapshot, data da compra, data efetiva do último recebimento, quantidade de entregas e primeira data quando houve mais de uma. Status diferencia pendência, parcial e recebido; sem entrega registrada não inventa data. Pagamento mostra condição/forma, quantidade e valor das parcelas (faixa se diferentes), número/valor/vencimento da próxima parcela aberta, contagem paga/cancelada e totais da compra/pago/em aberto. Popup continua disponível com parcelas individuais e recibos. Listagem paginada em 15 compras; itens, parcelas e datas buscados em três consultas em lote, sem consulta por card. Sem migração ou reescrita de dados.
Backup externo verificado: `C:/Users/Allan/ARL-backups/supplier-history-20261003-124539` (1757 arquivos e histórico Git). Lint, TypeScript/build, Pint, 19 testes frontend, 25 testes PHP/314 verificações e quatro fluxos E2E de fornecedores aprovados. Cenário visual repetido usando o layout Mobile/Tablet; imagens em output/fornecedores/historico-detalhado-desktop.png e historico-detalhado-mobile.png. Sem publicação.
