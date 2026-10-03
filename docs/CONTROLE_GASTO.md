# Controle de Gasto — primeira etapa funcional (02/10/2026)

## Escopo aprovado

Prioridade sobre a reformulação de Fornecedores. Cadastro do zero, sem importar despesas do aplicativo antigo. A organização do site de referência e o PDF de documentação orientam o funcionamento; a identidade visual segue a ARL: cabeçalhos brancos, vermelho, cards arredondados, sombras e diálogos aprovados da OS. Agenda, Contas e cadastro por voz ficam fora do escopo. Cadastro por foto será uma etapa posterior.

## Como começar

1. Acesse **Controle de Gasto**, logo abaixo de Financeiro.
2. Em **Instituições**, cadastre bancos/cartões e os tipos de dívida. Não há cadastros financeiros fictícios.
3. Em **Ajustes**, configure os dois responsáveis, seus nomes e a divisão padrão. A administração pode vincular suas contas de acesso. Os nomes iniciais Allan/Carol e 50%/50% são configurações editáveis.
4. Use **Nova dívida** para registrar compra parcelada, despesa fixa mensal ou cobrança única. Informe instituição, tipo, responsável, valor, mês inicial e vencimento.
5. Em **Gastos**, navegue por instituição, tipo e compra. Consulte parcelas, selecione pendências e registre pagamentos, antecipações ou abatimentos. Valor parcial pode ser lançado em uma parcela; o lote quita o saldo da parte escolhida em cada parcela.
6. Consulte **Quitadas**, **Pagamentos**, **Projeção** de doze meses e **Histórico**.

## Regras financeiras

- Valor de uma compra parcelada significa **valor de cada parcela**, com quantidade e primeira parcela cadastrada explícitas. Não é o total da compra.
- Valores são inteiros em centavos. A divisão sempre conserva o total, inclusive quando há centavo indivisível.
- Responsabilidade financeira e quem efetivamente pagou são independentes. É possível uma pessoa pagar a parte da outra. O usuário que registrou a operação também é preservado separadamente.
- Cada parcela guarda a divisão definida no cadastro. Alterar o padrão em Ajustes não muda compras/parcelas antigas.
- Pagamentos, antecipações e abatimentos reduzem o saldo, sem reescrever o valor original. Abatimento não conta como dinheiro pago.
- Um lançamento incorreto é desfeito com motivo e permanece no histórico. Cancelar uma compra preserva suas parcelas e pagamentos.
- Nome/observação da compra podem ser corrigidos. Valor, vencimento e divisão de uma parcela só podem ser corrigidos enquanto ela não possui histórico financeiro, incluindo lançamentos desfeitos.
- Recorrência mensal não recebe uma data final fictícia. Consultas materializam as parcelas até o mês solicitado, preenchendo os meses intermediários sem duplicar registros. Vencimento 31 se ajusta ao último dia de meses mais curtos.
- Encerrar uma recorrência define seu último mês. Não é permitido eliminar parcelas futuras com histórico; parcelas futuras ainda sem histórico podem ser retiradas do planejamento.
- Resumos e alertas desta etapa correspondem ao **mês selecionado**. A visão do casal inclui as partes individuais; não some novamente o card Casal aos cards dos responsáveis.
- Reenvios com a mesma chave/payload não duplicam cadastro ou pagamento. Lotes são transacionais: uma parcela inválida cancela todo o lançamento.

## Acesso e isolamento

Master e Administrador acessam o módulo. O novo perfil **Controle de Gasto** possui somente este módulo, com cadastro/edição dentro dele. A vinculação de contas a responsáveis permanece administrativa. Criar a conta da esposa utiliza o cadastro de Usuários existente; nenhuma senha/conta foi criada automaticamente.

O novo perfil **Usuário local** permite consultar a operação, cadastrar clientes e abrir chamados. Alterações de status/financeiro e administração são bloqueadas no backend. O perfil Funcionário existente conserva suas regras.

As tabelas `cg_people`, `cg_institutions`, `cg_types`, `cg_debts`, `cg_installments`, `cg_operations` e `cg_entries` são independentes de OS, estoque, fornecedores e lançamentos do Financeiro. Só os vínculos de acesso referenciam usuários. Não há integração com Supabase, OpenAI ou o site antigo em produção.

## Backup e instalação

Backup externo do código, alterações locais e histórico Git: `C:\Users\Allan\ARL-backups\controle-gasto-20261002-213248`. Antes da migração local, também foi criado, copiado e validado `banco-e-arquivos-anterior.zip` nesse diretório. Nunca incluir esses arquivos ou credenciais no Git/pacote.

Migração aditiva: `2026_10_03_000000_create_expense_control.php`. Ela acrescenta tabelas e dois perfis; não modifica perfis/usuários existentes e não gera despesas. A conferência local por hash preservou 47 conjuntos de dados existentes e 128 arquivos privados. Os seis conjuntos financeiros novos começaram vazios.

O backup geral descobre as tabelas novas e inclui os dados do módulo. O teste de restauração confirma a recuperação do saldo. O `down` da migração remove as tabelas financeiras do módulo e conserva perfis atribuídos a usuários; não utilizar rollback após cadastrar gastos como forma de desfazer aparência.

A publicação no servidor ainda não foi realizada. Antes dela, é necessário backup verificado do banco e arquivos privados **do servidor**, além dos testes/CI da release.

## Próximas etapas, sem funções simuladas

- Cadastro por foto, extração e revisão obrigatória antes de salvar.
- Estorno de valor da compra com redistribuição automática pelas parcelas restantes; nesta etapa há abatimento explícito por parcela ou lote.
- Avisos agendados/push e consulta consolidada de atrasos de meses anteriores.
- Refinamentos adicionais após avaliação do layout.
- Relatórios/exportações específicos do módulo e rotina dedicada de zeramento, se posteriormente solicitados.
- Reformulação de Fornecedores, após o Controle de Gasto.

## Validação

247 testes PHP gerais (2.149 verificações), 42 testes MySQL em banco descartável separado (414 verificações), 12 unitários de frontend e 110 testes gerais de navegador aprovados. Lint, TypeScript e Pint aprovados. Os testes incluem isolamento de perfis, divisão do centavo, pagamento parcial/em lote, retry idempotente, rollback integral, recorrência sem lacunas, restauração e alertas pessoais. Testes de navegador usam banco/arquivos privados separados; os arquivos e dados locais de uso foram novamente conferidos por hash.

O build final e os três fluxos do módulo foram novamente aprovados após os últimos ajustes do resumo pessoal e da apresentação do histórico. Capturas de desktop/mobile em `output/controle-gasto`.

## Cartões e acabamento visual — 02/10/2026

Cadastro com galeria pesquisável dos dez bancos solicitados: Banco do Brasil, Nubank, Caixa, Santander, Bradesco, Itaú, Samsung Itaú, BV, Mercado Pago e InfinitePay. Modelos ilustrativos em HTML/CSS usam nomes/cores e são identificados como ilustrativos; não são réplicas oficiais de produtos. A galeria também inclui a arte oficial Bradesco Neo Visa Platinum, obtida do catálogo público do banco. Fonte: https://banco.bradesco/html/classic/produtos-servicos/cartoes/index.shtm ; imagem: https://publish-p128342-e1259725.adobeaemcloud.com/content/dam/banco-bradesco/cartoes/agregador-de-ofertas/staticfiles/assets/classic/cartao/bradesco-neo-visa-platinum250x164c.png . Catálogo e arte ficam dentro do app; nenhum acesso a serviços externos é necessário para exibir ou selecionar cartões.

Upload JPG/PNG/WebP até 4 MB, com prévia e ajuste de zoom/posição. É obrigatório aplicar o enquadramento antes de salvar. O servidor valida o conteúdo e dimensões, reencoda para JPEG 856×540 em até 100 KB e remove metadados. A imagem é privada: apenas os perfis autorizados ao módulo acessam a rota, com no-store e nosniff. Cadastro por foto de cartão é somente aparência; não lê faturas nem registra gastos automaticamente.

As imagens substituídas permanecem privadas e entram no backup, permitindo recuperar estados anteriores. O teste de restauração verifica o arquivo e o vínculo por hash. Uma edição simples de nome/vencimento conserva a imagem. Nenhum número, titular, validade ou código de segurança é necessário. Use uma arte sem esses dados.

Migração aditiva `2026_10_03_010000_add_expense_institution_artwork.php`: apenas dois campos nullable em instituições; cadastros antigos conservam a cor. Backup de código/histórico/banco/arquivos privados verificado em `C:\Users\Allan\ARL-backups\controle-gasto-cartoes-20261002-223804`. Conferência local preservou 54 conjuntos de dados e 128 arquivos privados. Cartões, painéis e responsáveis receberam acabamento com relevo e sombras, preservando cálculos e navegação.

Verificação desta etapa: 252 testes PHP gerais (2.199 verificações), 23 testes MySQL isolados (239 verificações), 12 unitários de frontend e cinco fluxos E2E de cartões/Controle de Gasto. Lint, TypeScript, Pint e build aprovados. Capturas desktop/mobile inspecionadas. Não houve publicação no servidor.
