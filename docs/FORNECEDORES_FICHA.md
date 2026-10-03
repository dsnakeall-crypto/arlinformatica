# Ficha profissional de fornecedores — 03/10/2026

## Organização e uso

A lista paginada mantém 20 fornecedores por página, busca por nome/documento/contato/cidade/produto vinculado e filtro ativo/inativo. Clique em um fornecedor para abrir sua ficha, sem misturar registros de parceiros diferentes.

A ficha separa compras/recebimentos, produtos adquiridos, visão geral, dados comerciais, produtos fornecidos, financeiro, documentos, devoluções, ocorrências e relatórios. Cadastro obrigatório, máscaras de telefone, CEP assistido e consulta CNPJ existentes foram preservados. Dados da empresa continuam configuráveis; o módulo não fixa identidade da ARL nem implementa multiempresa.

## Requisitos e alcance real

| Área | Implementação |
|---|---|
| Cadastro e contato | Razão/nome, fantasia, documento validado por dígitos, endereço completo, celular/WhatsApp, fixo opcional, e-mail, contato, ativo/inativo; complemento comercial com tipo de pessoa, inscrições, site e representante |
| Comercial e banco | Prazo/meio preferido, desconto padrão, pedido mínimo, entrega, frete, notas, banco/agência/conta/tipo/Pix |
| Produtos fornecidos | Vínculo por fornecedor/produto, marca, código, custo informado (zero distinto de desconhecido), mínimo, prazo e último custo recebido |
| Pedidos e entradas | Compras pendentes/parciais/recebidas/canceladas, recebimentos parciais, nota/data, custo, lote opcional e estoque transacional; snapshots anteriores preservados |
| Financeiro | Parcelas geradas somente quando condição informada; vencimentos, pago/em aberto/vencido, meio, referência e juros/descontos ao quitar o título |
| Documentos | PDF/imagem/XML privado com vínculo opcional a compra; categorias nota, boleto, comprovante, contrato, tabela e outros; download autorizado e histórico imutável |
| Histórico e avaliação | Compras, custos, entregas, devoluções e ocorrências; avaliações internas opcionais 1–5 para entrega/qualidade/preço/atendimento |
| Devoluções | Quantidade recebida não devolvida e estoque disponível conferidos; saída de estoque, motivo/data e acordo de crédito/reembolso/troca/negociação; idempotência e auditoria |
| Relatórios e alertas | Valores por fornecedor, produtos mais pedidos, histórico de custos/lotes, período pela data da compra, títulos vencidos/entregas atrasadas e aviso de custo informado acima de 20% do último custo recebido |
| Segurança | Todos os endpoints, inclusive downloads, exigem Master/Administrador no backend; usuários locais/de Controle de Gasto não obtêm custos ou documentos |

Condições comerciais cadastradas são informações de negociação; não mudam silenciosamente parcelas, preços ou compras existentes. Créditos/reembolsos de devolução são **acordos registrados**, não lançamentos automáticos no Financeiro nem abatimentos automáticos de títulos. Troca não cria entrada de reposição automaticamente: o recebimento precisa ser registrado. A saída usa o saldo global do produto, sem prometer rastreabilidade FIFO por lote.

Pagamento de fornecedor continua sendo quitação integral de um título. Juros e desconto são opcionais; o histórico mantém principal e mostra o dinheiro efetivamente pago (`principal + juros - desconto`). Desconto maior que esse valor é rejeitado. Lançamentos parciais ao fornecedor, consumo de créditos, conciliação bancária e matriz granular de permissões por ação/usuário não foram implementados nesta entrega; não estão apresentados como recursos concluídos.

Relatórios filtram **data da compra**, não data do pagamento. Quantidade de compras inclui seu histórico; total comprado/top produtos excluem compras canceladas. Totais financeiros consideram todas as páginas. Histórico de preço mantém também pedidos antigos; último custo recebido exige mercadoria efetivamente recebida. Notas já anexadas anteriormente permanecem na compra, sem cópia duplicada para a nova área de documentos.

CPF válido por dígitos não comprova existência/cadastro regular. A confirmação oficial de existência de CPF exige serviço/credencial externo; permanece pendente, sem contratação. Consulta pública CNPJ/CEP depende da disponibilidade dos serviços já existentes e não representa certificação fiscal.

## Modelo e atualização

Migração aditiva `2026_10_03_070000_extend_supplier_workspace.php`: perfil comercial JSON nullable; lote nullable; juros/descontos zero por padrão; tabelas próprias de vínculos, documentos, devoluções e ocorrências. Nenhuma dívida antiga recebe fornecedor obrigatório, nenhum produto sem fornecedor é alterado e brindes com custo zero continuam válidos. Mesmo produto pode ser adquirido de fornecedores diferentes. O vínculo comercial não muda preço de venda/custo global/estoque.

Documentos: até 10 MB e 200 por fornecedor, conteúdo validado, XML sem DOCTYPE/entidades externas (`LIBXML_NONET`), arquivos privados, hash e chave de repetição. Paginação de financeiro/preços/devoluções/ocorrências. Consultas de vínculos e saldo devolvível evitam uma consulta por item. Backup/restore e zeramento autorizado incluem as tabelas/arquivos novos e respeitam suas chaves estrangeiras.

Antes de publicar: backup validado do banco **e arquivos privados do servidor**, colocar aplicação em manutenção, implantar código/estáticos e executar migrations, limpar caches e validar o aplicativo; não publicar somente o frontend contra um banco sem essa migração. Não executar rollback da migração depois de cadastrar dados novos sem planejar recuperação, pois o rollback remove as tabelas novas.

## Segurança do trabalho local

Backup externo prévio verificado: `C:\Users\Allan\ARL-backups\atualizacao-geral-20261003-070057` — código/alterações, Git e banco/arquivos privados. Backups anteriores preservados. Migração aplicada somente no MySQL local; comparação contra backup conferiu 51 conjuntos de dados e 128 arquivos privados. Apenas registro da migração/auditoria do backup e timestamps de dois lembretes periódicos diferiram; dados financeiros/operacionais e conteúdo dos arquivos preservados. Testes usam bases/discos próprios; produção não foi acessada.

As capturas de homologação estão em `output/fornecedores/nova-lista-desktop.png`, `nova-ficha-desktop.png` e `nova-ficha-mobile.png` (artefatos locais não publicados). O fluxo de navegador criou 20 fornecedores reais na base isolada, editou perfil, vinculou produto, anexou XML e devolveu mercadoria.

## Verificação final

291 testes PHP/2637 asserções; 57 testes MySQL isolado/712 asserções; 17 testes frontend; build/TypeScript, lint e Pint aprovados. Suíte geral de navegador: 125 cenários aprovados e um teste com expectativa antiga da galeria. Esse teste foi atualizado para contemplar o cartão novo e a confirmação obrigatória ao editar; revisão final de cinco cenários aprovada (galeria/upload, mobile e fornecedores). A revisão focada também aprovou os 11 fluxos de Controle de Gasto. A cobertura inclui OS, clientes, financeiro, pós-venda, login, fotos, documentos e responsividade, sem prometer ausência absoluta de falhas fora dos cenários testados.
