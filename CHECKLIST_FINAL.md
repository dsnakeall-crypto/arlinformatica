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

# Checklist final — Bloco C: Produtos e controle de estoque

## Catálogos e produto

- [OK] Serviços e Produtos possuem telas e opções separadas no menu, preservando os registros existentes.
- [OK] Produto possui nome/descrição, valor de venda, quantidade em estoque e garantia adicional com prazo.
- [OK] Cadastro de produto não possui custo, lote ou cálculo de margem.

## Regras de estoque

- [OK] Produto é baixado ao ser adicionado à OS e devolvido imediatamente ao reduzir ou remover o item.
- [OK] Interrupção devolve os produtos antes de apagar os itens ativos e zerar o total da OS.
- [OK] Orçamento apenas consulta o saldo; não baixa nem reserva estoque.
- [OK] OS finalizada congela o estoque, inclusive em reabertura administrativa.
- [OK] Baixa usa transação e bloqueio de linha, impede saldo negativo e informa a quantidade disponível.
- [OK] Produto zerado permanece cadastrado e indisponível para nova OS; saldo unitário exibe aviso de última unidade.
- [OK] Entrada de estoque soma ao saldo e registra data, quantidade, motivo, usuário, saldo resultante e vínculo com a OS quando aplicável.

## Seletor da OS

- [OK] Pesquisa conjunta de serviços e produtos foi mantida com botão Produto/Serviço ao lado.
- [OK] Seletor exibe Serviços e Produtos em colunas no desktop e abas em telas estreitas.
- [OK] Produtos exibem saldo e quantidade; itens zerados ficam desabilitados na OS.
- [OK] Lista rápida da abertura continua exclusiva de serviços.

## Validação executada

- [OK] 17 testes PHP focados de estoque, catálogo e fluxo de OS, 176 asserções.
- [OK] Build de produção com TypeScript e Vite.
- [OK] 8 cenários Playwright direcionados de catálogo, edição e detalhe da OS.
- [PENDENTE] Suítes completas, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.

# Checklist final — Bloco D: Tela da OS, regras e PDFs

## Tela da OS e clientes

- [OK] Botões de retorno destacados na ficha da OS e no histórico do cliente, inclusive retorno do histórico para a OS de origem.
- [OK] Cabeçalho da OS permanece limpo, sem seletor de status e sem ação duplicada de edição da ficha.
- [OK] Editor unificado da OS possui largura adequada e mantém descrições de serviços legíveis.
- [OK] Cadastro rápido de cliente na Nova OS funciona apenas com nome, CPF/CNPJ, telefone e endereço.
- [OK] Ordem aberta acompanha os dados atuais do cliente; ordem concluída preserva o snapshot e os documentos já emitidos.
- [OK] Limite de cinco fotos aplicado na interface e no backend, com fotos quadradas e arquivo final de até 100 KB.

## Finalização, compartilhamento e regras

- [OK] Aviso de conclusão permanece visível e não bloqueia os modais operacionais da OS.
- [OK] Link público do PDF final é criado somente ao clicar em abrir ou compartilhar e expira em 48 horas.
- [OK] Mensagem de WhatsApp usa o PDF final e os dados configurados da empresa.
- [OK] OS reaberta volta para Em Análise, exibe marcador Reaberta e deixa de aparentar status Pago durante o trabalho.
- [OK] Refinalização preserva pagamentos e datas anteriores, sem lançamento retroativo de ajuste financeiro.
- [OK] Se o total refinalizado ficar coberto pelo valor já recebido, a OS volta a Pago; se ficar maior, permanece Aguardando PGTO e cobra apenas o saldo.
- [OK] Ciclos inconsistentes ou reabertos de pós-venda são ignorados/desativados sem derrubar a listagem.

## PDFs e documentos

- [OK] Papel timbrado A4 repete cabeçalho, marca d'água e rodapé sem cortes em todas as páginas.
- [OK] PDF final curto permanece com uma página.
- [OK] PDF final longo pagina a tabela de serviços sem sobreposição ou página vazia artificial.
- [OK] Campo de assinatura técnica e nomenclatura de garantia estão presentes no fechamento.

## Banco de dados

- [OK] Uma única migration torna opcionais os campos secundários de endereço do cliente.

## Validação executada

- [OK] 25 testes PHP direcionados, 294 asserções.
- [OK] TypeScript typecheck e build de produção com Vite.
- [OK] 25 cenários Playwright direcionados para cliente rápido, detalhe/layout, status, quantidade, fluxo operacional, reabertura, financeiro e pós-venda.
- [OK] PDFs curto (1 página) e longo (3 páginas) renderizados com Poppler e inspecionados visualmente página a página.
- [PENDENTE] Suítes completas, por instrução expressa deste bloco.
- [PENDENTE] Push, por instrução expressa deste bloco.
