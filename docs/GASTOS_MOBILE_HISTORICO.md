# Controle de Gasto: ajustes mobile e histórico mensal — 04/10/2026

Requisitos recebidos em `G:/No Mobile.docx`, com quatro capturas, confirmados pelo proprietário. Nenhuma migração, alteração de registros de uso, publicação ou chamada paga de IA nesta etapa.

## Uso

- Projeção oferece **Projeção futura** e **Histórico de gastos**. A projeção futura continua iniciando em Lista a cada entrada no menu.
- No histórico, escolha responsável, mês inicial e final e confirme em **OK**. O resultado apresenta gráfico por mês, total do período, maior/menor mês e diferença em reais/percentual frente ao mês anterior dentro do período.
- Valores representam as parcelas originais de cada mês, inclusive compras quitadas. A visão individual inclui sua parte das compras do casal. Casal inclui apenas despesas compartilhadas, pelo valor completo; Todos reúne os gastos pessoais e compartilhados sem duplicar a divisão.
- Antecipações aparecem separadamente, pelo mês do lançamento e pela parte beneficiada do responsável selecionado. Não diminuem o gráfico e não são somadas ao total de parcelas. Isso não é um relatório de caixa por quem efetivamente pagou.
- Despesas canceladas e antecipações estornadas ficam fora. Meses sem parcelas aparecem com zero e entram no menor mês. Empates mostram o primeiro mês. Quando todo o período é zero, maior/menor mostram Sem parcelas. Não se calcula percentual quando o mês anterior é zero.
- Recorrências seguem início/fim e a configuração cadastrada. Meses já gravados preservam os valores/divisões individuais; meses ainda não gerados são calculados em memória. A consulta de histórico não cria parcelas nem modifica saldos. A abertura normal de resumo/projeção mantém a geração de recorrências já existente.
- Quitadas continua com uma linha por compra: instituição, nome, valor pago e pagadores. Pagamentos/antecipações estornados e descontos não entram no dinheiro pago. Quitação integral compartilhada registrada sem pagador individual aparece como Casal; descontos aparecem separados. Abrir a compra permite consultar suas parcelas e lançamentos.

## Mobile

Gastos inicia com **Pesquisar e filtrar** recolhido. A indicação Filtros ativos permite perceber filtros aplicados. Busca, responsável, instituição, tipo, situação, ordenação e Limpar continuam disponíveis ao expandir. Reentrar em Gastos restaura os filtros padrão; a escolha Lista/Cards continua memorizada por conta no navegador.

Lista usa apenas nome da instituição e vencimento, sem imagem de cartão ou tipos expandidos. Ao abrir a instituição, os tipos/contagens aparecem em linhas compactas. Cards mantém a visualização com imagens. Instituições usa ícone `$` com nome acessível no lugar do texto Ver gastos, do mesmo tamanho dos botões editar/excluir. Projeção reposiciona Ver mês abaixo da divisão entre responsáveis, sem sobreposição. Campos de mês do histórico ocupam a largura disponível para não cortar o ano.

Essas regras de compactação são limitadas à classe mobile. O histórico mensal e a identificação dos pagadores também estão disponíveis no desktop.

## Segurança e retorno

`GET /api/expense-control/spending-history` exige autenticação e os perfis existentes Master, Administrador ou Controle de Gasto. Valida meses entre 2000 e 2099, responsável e período de até 120 meses. Não usa serviço externo nem nova tabela. Pagadores de Quitadas são agregados por compra na página corrente, sem consulta individual por parcela.

Backup externo anterior a todas as edições: `C:/Users/Allan/ARL-backups/gastos-mobile-historico-20261004-021521`, com 1.954 arquivos conferidos por SHA-256, alterações locais e bundle Git verificado. Alterações não relacionadas foram preservadas.

Testes de backend cobrem divisão com centavo indivisível, parcelas pagas, exclusão de canceladas, antecipações/estornos, mês sem valor, empates, recorrência sem gravação, valor mensal editado, término da recorrência, intervalos inválidos, autorização e pagador diferente do responsável. SQLite e MySQL descartável: 31 testes / 473 verificações aprovados. Frontend: 19 testes; lint, TypeScript/build e Pint aprovados. Testes de navegador/capturas em `tests/e2e/expense-spending-history.spec.ts` e `output/controle-gasto`.

Navegador: 18 cenários distintos aprovados (11 regressões desktop, cinco mobile existentes e dois novos fluxos que validam as duas interfaces). A verificação inicial com muitos tipos mostrou que a lista de instituições ainda ficava longa; tipos foram recolhidos para abrir somente ao tocar na instituição. Os dois fluxos novos passaram na versão final, incluindo comparação de três meses, largura mínima de 320px, preferência por conta, reset dos filtros e tipos em linhas de até 65px. Capturas finais revisadas visualmente. Testes usam bancos/arquivos isolados; o banco MySQL descartável foi removido ao terminar.
