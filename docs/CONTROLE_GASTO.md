# Controle de Gasto — primeira etapa funcional (02/10/2026)

## Escopo aprovado

Prioridade sobre a reformulação de Fornecedores. Cadastro do zero, sem importar despesas do aplicativo antigo. A organização do site de referência e o PDF de documentação orientam o funcionamento; a identidade visual segue a ARL: cabeçalhos brancos, vermelho, cards arredondados, sombras e diálogos aprovados da OS. Agenda, Contas e cadastro por voz ficam fora do escopo. Cadastro por foto possui leitura local e revisão obrigatória antes de salvar, além de alternativa opcional Gemini Pro documentada em [GEMINI_FATURAS.md](GEMINI_FATURAS.md). As descrições de processamento exclusivamente no aparelho abaixo se referem ao leitor local.

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

### Cards compactos

A pedido do proprietário, os cards de instituições nas abas Gastos e Instituições possuem largura máxima de 250 px, aproximadamente metade da referência anterior. A grade acomoda mais cartões por linha; o cartão interno acompanha a redução mantendo proporção, cores, imagem e relevo. Espaços internos e tipografia foram compactados com leitura preservada. A galeria e a prévia do formulário conservam seus tamanhos para permitir escolher e enquadrar imagens. Nenhum dado ou regra financeira foi alterado.

Backup externo anterior: `C:\Users\Allan\ARL-backups\controle-gasto-cards-compactos-20261002-231900`, com arquivos locais/alterações e histórico Git verificados.


## Cadastro de dívidas por foto — 02/10/2026

**Cadastrar por foto** fica ao lado de **Nova dívida**. Escolha uma foto/captura JPG, PNG ou WebP até 10 MB (máximo 40 megapixels), ou abra a câmera no celular. Gire a foto se necessário e clique em **Ler compras**. Não recebe PDF nem usa voz nesta etapa.

A lista de revisão possui rolagem e uma ficha por compra: nome, valor de cada parcela, parcela atual, quantidade total, responsável e tipo. Instituição, tipo/responsável padrão, mês da fatura, vencimento e divisão são selecionados acima. Cada campo pode ser corrigido; mudar dados ou padrões exige conferir novamente. Desmarque **Incluir** para ignorar uma linha. O botão Salvar só libera depois de conferir todas as compras selecionadas. É possível revisar o texto lido e reinterpretá-lo, ou acrescentar uma compra à revisão.

A leitura usa Tesseract.js 7 com idioma português **no navegador**. Worker, WebAssembly e modelo são gerados em `public/arl-assets/expense-ocr` pelos scripts `prebuild`/`predev`. Todos vêm do próprio servidor, sem CDN, OpenAI, upload da foto ou envio do texto bruto. A primeira leitura carrega esses recursos; o pacote KingHost inclui os arquivos estáticos gerados pelo build e não exige Node em execução. A câmera depende da permissão do aparelho; processamento e hash requerem HTTPS (localhost também funciona). Documentação técnica: https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md .

Fotos, prévias e texto bruto ficam na memória da tela, descartados ao fechar. O servidor recebe somente campos financeiros conferidos e hash SHA-256 da foto. `cg_photo_imports` conserva esse hash, a chave da operação e os IDs das compras para auditoria e prevenção de repetição. A mesma foto na mesma instituição é bloqueada, inclusive entre os dois usuários. Uma foto recortada/reexportada pode produzir outro hash: o usuário deve conferir as compras existentes para não cadastrar duas fotos da mesma fatura. Backup/restauração preservam o registro da importação e suas parcelas.

Uma linha 3/10 gera somente as parcelas **3 a 10**, começando pelo mês da fatura selecionado. Não cria pagamentos fictícios das parcelas 1 e 2. O valor reconhecido representa cada parcela, não o total da compra; valores com mais de uma coluna exigem conferência. Datas de compra extraídas da imagem ficam na observação, sem substituir o mês de vencimento. Totais, créditos, pagamentos e estornos são ignorados. Linhas repetidas são sinalizadas e começam fora da seleção. Leitura incerta pode exigir corrigir texto/campos ou tentar uma imagem melhor; não há garantia de reconhecer qualquer formato de fatura.

Limites: 100 compras por lote/foto, até 360 parcelas por compra e até 3.000 parcelas geradas no lote. Se a fatura exceder 100 linhas, use fotos distintas de trechos e confira a separação. Validação e autorização no backend, transação integral e retry idempotente: erro em qualquer compra impede salvar todo o lote. Não há efeito no estoque, OS ou Financeiro da empresa.

Backup externo verificado antes da edição e migração: `C:\Users\Allan\ARL-backups\controle-gasto-foto-20261002-233306`, incluindo código, alterações locais, histórico Git e `banco-e-arquivos-anterior.zip`. Migração aditiva `2026_10_03_020000_create_expense_photo_imports.php`; conferência por hash preservou 54 tabelas existentes e 128 arquivos privados, incluindo despesas já cadastradas.

Verificação: 258 testes PHP (2.249 verificações), 29 testes em MySQL isolado (289 verificações), 17 unitários de frontend; leitura real de imagem fictícia no Chromium com valores/parcelas e cadastro em lote, revisão desktop/mobile, cancelamento e regressões do cadastro manual/cartões/OS. Lint, TypeScript, Pint e build verificados. Capturas e logs em `output/foto`. Implementação local, sem publicação no servidor.

## Gemini opcional — 03/10/2026

Escolha Gemini Pro ou No aparelho no diálogo 3D de importação. Gemini exige configuração privada, consentimento por foto e revisão integral; está desligado e ainda sem validação real da API. Modelo, limites, custos, privacidade e ativação: [guia](GEMINI_FATURAS.md). Verificados 40 testes em MySQL isolado (353 verificações), 11 testes específicos PHP e 9 E2E do módulo. Preservados por hash 55 tabelas existentes e 128 arquivos privados.

## Mistral e prioridade mobile — 03/10/2026

Provedor preferido alterado para Mistral Document AI com revisão obrigatória e opção No aparelho preservada. Configuração privada, custos estimados e pendências no [guia Mistral](MISTRAL_FATURAS.md). Após esta integração e Fornecedores, planejar interface Mobile/Tablet própria para acesso completo ao Controle de Gasto, com acabamento 3D e cadastro por foto; etapa pendente.

## Revisão por foto: padrões opcionais — 03/10/2026

Na barra inferior, antes de salvar, Selecionar cartão geral e Selecionar tipo de dívida aplicam padrões às compras que não têm escolha individual. Ambos podem ficar vazios, desde que cada compra selecionada tenha cartão e tipo próprios. A revisão mostra o padrão herdado e permite substituir por compra; trocar padrões exige conferir novamente. O percentual geral aparece somente para Casal; uma compra individual definida como Casal possui seu percentual próprio, enquanto Allan/Carol ficam sem esse campo. Mês e dia de vencimento continuam comuns ao lote.

O backend aceita cartão por item sem migração ou alteração de registros existentes, mantém transação integral, idempotência e bloqueio da foto em cada cartão incluído. Um cartão inativo ou item inválido impede salvar todo o lote. Menus de navegação têm fundo azulado e seleção vermelha; seletores do diálogo têm fundo azulado e foco vermelho. Cores das tabelas mantidas.

Backup externo verificado: `C:\Users\Allan\ARL-backups\controle-gasto-revisao-20261003-015022`. Dados financeiros e arquivos privados preservados; o uso simultâneo do app alterou apenas timestamps de leitura das notificações.


## Acabamento compacto azul — 03/10/2026

Cards de indicadores, responsáveis, painéis e instituições usam azul claro, mantendo os desenhos dos cartões bancários. Indicadores, espaçamentos e avatares foram compactados; Allan, Carol e Casal têm retratos vetoriais. Cadastrar por foto e Nova dívida usam azul com texto vermelho. A revisão por foto mantém todos os campos e a conferência individual, com cards e controles menores, preservando altura confortável no celular.

O aviso de vínculo agora ocupa uma caixa separada: associar a conta de acesso a um responsável é opcional e permite abrir o resumo pessoal. O botão Abrir Ajustes aparece somente para quem pode fazer a associação.

Backup verificado: `C:\Users\Allan\ARL-backups\controle-gasto-resumo-compacto-20261003-020346`. Alteração visual, sem migrações. Build/TypeScript e lint passaram; quatro cenários E2E de cadastro, autorização, desktop/mobile e revisão por foto passaram com API simulada, sem chamada paga. Conferência preservou 55 tabelas por hash e 128 arquivos privados; notificações tiveram somente timestamps de leitura alterados pelo uso simultâneo do app. A interface Mobile/Tablet completa permanece para etapa própria.


## Resumo único e vencimento da revisão por foto — 03/10/2026

Somente Resumo aparece no menu. Sem conta vinculada, Resumo e a antiga Visão geral eram equivalentes; com vínculo, a escolha Meu resumo/Casal mantém as duas perspectivas dentro da mesma seção. Projeção abre o mês no resumo do casal. Seletor de mês azul compacto, calendário próprio, uma única legenda e navegação anterior/próximo.

Removida a caixa de padrões no topo da revisão por foto: responsável definido individualmente, percentual visível apenas para Casal. Mês e dia da fatura permanecem numa linha compacta. Cartão geral e tipo geral continuam opcionais no rodapé. Com cartão geral selecionado, dia bloqueado e obtido do cadastro da instituição no backend; uma escolha individual de outro cartão usa o dia dessa outra instituição. Sem cartão geral, dia editável respeitado. A regra se aplica somente a novas importações, preservando parcelas e vencimentos anteriores.

Backup de código/alterações/histórico Git verificado: `C:\Users\Allan\ARL-backups\controle-gasto-mes-resumo-20261003-021234`. Nenhuma migração ou envio à API real nesta alteração.


## Pagamentos claros e navegação com contagens — 03/10/2026

O diálogo oferece quitar saldo inteiro, informar valor parcial e, em parcelas compartilhadas, quitar a parte de cada responsável. Quem efetivamente pagou continua separado de quem teve o saldo baixado. Prévia mostra os saldos individuais após confirmar. O backend preserva as regras anteriores de centavos, limite de saldo, autorização, histórico e transação. Resumo detalha parcelas parcialmente baixadas: valor original, pago/abatido e saldo de cada pessoa. Desconto não é pagamento em dinheiro. Exemplo validado: R$350 em divisão igual, Allan quitado por R$175 deixa Carol com R$175; pagar R$50 da parte dela deixa R$125.

Gastos mantém cards de instituições ao filtrar responsável, sem abrir diretamente todas as dívidas. Cada instituição lista contagens por tipo; abrir instituição preserva o responsável e mostra cards azuis com contagens e zeros. Contagens são de compras/dívidas, não de parcelas, calculadas no backend antes da paginação e respeitando os filtros. A participação de Allan/Carol inclui despesas compartilhadas conforme a divisão cadastrada. Tipos customizados continuam permitidos; não há listas fixas de categorias. Busca textual e seleção de tipo continuam abrindo a lista detalhada. Cards de cartões reduzidos de 250 para 225 px (10%), com proporção da arte preservada; mobile limitado à largura disponível.

Backups locais verificados (arquivos, alterações e histórico Git): `C:\Users\Allan\ARL-backups\controle-gasto-pagamento-20261003-022130` e `C:\Users\Allan\ARL-backups\controle-gasto-contagens-20261003-022613`. Sem migração ou publicação. Validação: 19 testes PHP/249 verificações; 28 testes em MySQL isolado/328 verificações; cinco cenários E2E concluídos, com correção do nome acessível do filtro de responsável no cenário novo; build/TypeScript, lint e Pint. Uso local simultâneo preservado.


## Controle de Gasto — listas, resumo e pagamento da instituição (03/10/2026)

Instituições e Projeção oferecem Lista/Cards, com preferência guardada no navegador. A lista de instituições apresenta o cartão e os tipos separados à direita; os contadores preservam o filtro do responsável. A projeção em lista organiza cada mês em uma linha compacta.

Resumo usa os seletores pequenos Allan/Carol/Casal (nomes configuráveis). Cada pessoa inclui despesas pessoais e sua parte das compartilhadas. Casal inclui somente compras compartilhadas. Valores, pagamentos, instituições e próximos vencimentos acompanham o seletor, independentemente de vínculo com a conta de login. Substitui o seletor anterior Meu resumo/Casal.

Dentro de Gastos, ao abrir uma instituição, Pagar valor da fatura permite informar responsável, valor, pagamento/antecipação e data. A simulação distribui somente no mês selecionado: compras pessoais primeiro, depois a parte desse responsável nas compras compartilhadas, ordenadas pelo mês inicial e ID do cadastro (mais antigas primeiro). Nunca utiliza a parte da outra pessoa ou parcelas de outros meses/instituições. Não cria crédito excedente: valor acima do saldo é rejeitado.

O usuário confere a distribuição antes de confirmar. O servidor recalcula sob bloqueios transacionais, rejeita prévia divergente e protege repetições por chave idempotente. Todas as parcelas afetadas pertencem ao mesmo lançamento; valores em centavos, histórico e auditoria preservados. Exemplo testado: saldo de Allan R$1.200, pagamento R$800, restante R$400, saldo de Carol R$1.800 intacto.

Editar identificação, parcela, instituição/tipo, encerrar recorrência e excluir/desfazer lançamentos pedem confirmação na tela. Excluir dívida utiliza o cancelamento já existente: sai dos gastos e projeção, permanece no filtro Canceladas com histórico. Parcelas com lançamentos não têm seus valores originais reescritos; correção usa estorno/novo lançamento. Dívidas finitas totalmente quitadas saem de Gastos e aparecem em Quitadas, com detalhes e histórico. Despesas mensais recorrentes continuam ativas até encerrar a recorrência.

Backup validado de código/alterações/histórico antes desta etapa: C:\Users\Allan\ARL-backups\controle-gasto-quitacao-instituicao-20261003-024604. Backup anterior às listas: C:\Users\Allan\ARL-backups\controle-gasto-lista-resumo-20261003-023730. Nenhuma migração ou publicação nesta etapa; testes financeiros em bancos separados.
