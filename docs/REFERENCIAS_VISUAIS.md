# Referências Visuais — ARL Informática

As referências abaixo foram reenviadas e confirmadas pelo proprietário em **04/09/2026** para a homologação visual final da PR #11. Elas são a fonte visual oficial; as regras funcionais atuais continuam sendo definidas por `docs/PROJETO_MESTRE.md` e `CHECKLIST_FINAL.md`.

## Arquivos oficiais recebidos

| # | Arquivo | Uso | SHA-256 |
|---|---|---|---|
| 1 | `01 - tela inicial e menu.jpg` | Painel inicial, menu lateral, cards, tabela, filtros, paginação e identidade Web/PC | `fe7eaa8db7b226f4785768312422b1783864cd22c54cc15a9df9e53a576b6578` |
| 2 | `02 - Cadastro clientes.png` | Listagem/cadastro de clientes e responsividade | `7f231372363ee7333e69151828f1d448017b3217330492a15171858801a4a3ea` |
| 3 | `03 - Nova OS.jpeg` | Nova OS / abertura de chamado desktop e mobile | `9aebb43f6831b0ecaeb35881bfc41643de0f279786444bf331d517eb300e7b4b` |
| 4 | `04 - Opcao de Alteracoes dos chamados abertos na lista.jpg` | Aparência do seletor rápido de status | `e900c32ac84b5351af2162b83057353002f484e22e81aa63d0c289f06bddea72` |
| 5 | `05 - Impressao A4 Fechamento do Chamado.jpg` | Pré-visualização/PDF A4 de fechamento | `a55eaced143a697c9d83e8e0886669023974076e56136f34192fd32d968a1ddf` |
| 6 | `06 - Menu Pos Venda.jpg` | Inspiração visual do Pós-Venda | `f5c2253c91713a843bc6ba1590c16854fcd79be3da3000caad6f5a41216cde6f` |
| 7 | `LOGO.png` | Logomarca oficial ARL Informática | `f3dbf2abf49a5a2adc348aabb16e5d10b681d015370dba1d46ec82bb6313b2e2` |
| 8 | `TIMBRADO.png` | Referência visual oficial para Orçamentos/Laudos | `2016d92d8bacda902c2198eddc8f46cc10e1d2819f39f909326d2e0ca535e824` |
| 9 | `resources/images/documents/papel-timbrado.png` | Fundo oficial imutável de Orçamentos e PDFs de finalização | `5e640a129a7b33d954e9f3b44a872b6f003ed8266f30039a578c11fe599e0087` |

O papel timbrado de produção mede exatamente **1055 × 1491 px**. Sua integridade é validada antes da geração documental; o arquivo não deve ser recortado, deformado, reamostrado ou regravado.

Se os anexos não estiverem montados em um chat futuro, **pesquisar a Library pelos nomes exatos acima antes de pedir novo envio ao proprietário**. Não declarar que uma imagem diferente é a referência oficial apenas por semelhança.

## Regras de fidelidade

- Desktop deve seguir as referências com máxima fidelidade razoável de hierarquia, densidade, espaçamento, cards, tabela, navegação e identidade.
- Não substituir por template genérico.
- Mobile/Tablet não copia a tabela desktop; segue experiência própria mobile-first definida no Projeto Mestre.
- Antes de considerar uma tela homologada, capturar a aplicação já carregada e comparar com a referência. O E2E de homologação deve aguardar dados reais da própria execução, e não apenas ausência momentânea de um texto de loading.
- Dados antigos impressos no `TIMBRADO.png` são apenas referência visual e **não devem ser hardcoded**. Os documentos usam os dados configuráveis da empresa.
- Instagram oficial atual: `https://www.instagram.com/allanluttembarck`. O endereço `instagram.com/arlinformatica` existente no timbrado histórico está desatualizado e não deve voltar ao sistema.
- A `LOGO.png` deve ser usada sem redesenho. Em produção, cadastrar a imagem oficial em **Configurações > Dados/Identidade da Empresa** e validar um PDF real com a logo; o fallback textual `ARL` só é aceitável enquanto nenhuma logo tiver sido configurada.

## Diferenças funcionais intencionais em relação às imagens históricas

As imagens são referência visual, não autorização para restaurar regras antigas que já foram substituídas:

- **Painel:** permanece operacional e **sem faturamento**. Receita e caixa ficam no Financeiro, conforme arquitetura atual, mesmo que a imagem histórica mostre “Faturamento (mês)”.
- **Status:** pagamento continua separado do status operacional; não reintroduzir `Pago` como status da OS apenas porque aparece na imagem histórica do dropdown.
- **Pós-Venda:** a aparência pode se inspirar na referência, mas o fluxo funcional é o modelo simplificado/auditado do Projeto Mestre.
- **Menu Financeiro:** não recriar módulos separados apenas para imitar a navegação antiga se as funções atuais estão consolidadas no Financeiro.

## Homologação realizada na PR #11

- As capturas automáticas foram corrigidas no commit `53b21279fb689938eb84f663242107a22aca9339` para só fotografar Painel/Clientes depois que a OS e o cliente criados pelo próprio teste aparecem de fato.
- A comparação das novas capturas revelou duas falhas reais na listagem de Clientes: ações extrapolando o card/coluna no desktop e telefone quebrando excessivamente no mobile.
- O CSS foi corrigido no commit `4601f74d83a96d0b68698b276b25f3bdf9328920` e a regressão mobile passou a ser protegida por geometria no Playwright no commit `cdffc543df5c147b64b9c87f14a20831145d962a`.
- No CI #356, backend SQLite, backend MySQL 8, frontend e E2E ficaram verdes; o E2E executou 26 testes e incluiu a validação de Clientes no mobile.
- O PDF de fechamento gerado pelo artefato visual permaneceu em uma única página A4, sem corte/overlap observado na renderização automática.

A comparação visual automatizada de layout está concluída para as referências recebidas. **Ainda permanecem externas** a validação com a `LOGO.png` cadastrada no ambiente real e a impressão física A4.

## Popups da OS — referências 3D de 02/10/2026

As duas referências mais recentes substituem o desenho anterior da ficha de edição e do formulário de orçamento. Usar moldura branca arredondada, cabeçalho branco liso (atualização posterior aprovada pelo proprietário), painéis com bordas duplas e relevo, campos reais organizados e ações compactas com acabamento preto/vermelho. Edição em diálogo com dois blocos; orçamento em diálogo com cinco blocos. Manter responsividade, rolagem do conteúdo e acesso às ações. Cópias das referências foram preservadas no backup externo `popups-3d-20261002-073026`; detalhes e capturas da implementação em `docs/FICHA_ORCAMENTO_ENVIO.md`.


## Fornecedores — 02/10/2026

Nova área sem imagem específica fornecida. Reutiliza PageHeader, identidade branca/vermelha, painéis arredondados, sombras discretas e os popups com cabeçalho branco aprovados pelo proprietário. Campos e ações responsivos, com rodapé acessível no diálogo. Capturas de conferência em `output/fornecedores`; regras em `docs/FORNECEDORES_COMPRAS.md`.

### Fornecedores: cadastro e compras

A extensão de pagamentos/notas mantém os popups brancos arredondados e os cards existentes. Campos obrigatórios possuem indicação, máscaras e consulta de CEP. Na ficha da compra, condições, parcelas e anexos ficam em seções, com ações compactas; quebra de linhas no mobile, preservando as áreas aprovadas de OS/orçamento. Capturas de teste em `output/fornecedores` (dados fictícios).

## Controle de Gasto — 02/10/2026

O site gastos-do-casal.dsnakeall.chatgpt.site e o PDF Gestão de Gastos fornecido orientam a organização das informações e os fluxos. Adaptar para a identidade visual ARL aprovada: branco/vermelho, cabeçalho com linha, cards com sombras, navegação clara e popups brancos arredondados. Resumo pessoal e visão do casal distintos; instituição → tipo → compra → parcelas. Capturas de testes com dados fictícios em `output/controle-gasto`. Agenda, Contas e voz excluídos pelo proprietário; foto posterior.

### Controle de Gasto: galeria de cartões

Cartões com proporção 856:540, cantos arredondados, reflexo leve e sombra de relevo. Modelos de bancos identificam cores/nome sem se apresentar como réplicas oficiais. A prévia acompanha a seleção, com galeria pesquisável e upload separado. Todas as imagens utilizam a mesma moldura; arte oficial preserva proporção sem esticar. Enquadramento de fotos é confirmado antes do cadastro. Sombras de painéis/responsáveis reforçam o acabamento 3D dentro da identidade ARL. Capturas de desktop/mobile em `output/cartoes`.


### Controle de Gasto: cadastro por foto

Manter a temática do app de gastos de referência com a identidade ARL: cabeçalho branco, borda vermelha suave, cartões arredondados com relevo, sombras e campos compactos. Escolha de foto/câmera e prévia, seguida de lista com rolagem e fichas numeradas por compra; confirmação verde distingue dados conferidos. Totais separados para a fatura atual e parcelas restantes. Rodapé fixo mantém Cancelar/Salvar acessíveis; o corpo e a lista rolam em telas menores. Capturas de revisão desktop/mobile em `output/foto`.

## Importação de fatura: escolha do leitor

O diálogo de Controle de Gasto mantém cabeçalho branco, bordas arredondadas e sombras 3D; painel de escolha Gemini Pro/No aparelho, consentimento e revisão por compra, sem alterar os pop-ups aprovados da OS.

## Revisão por foto: acabamento solicitado em 03/10/2026

Manter acabamento 3D. Colocar cartão geral/tipo de dívida na barra inferior antes de salvar, permitindo alternativas por compra. Navegação azul com item ativo vermelho; seletores azuis com foco vermelho. Percentuais só para Casal. Tabelas mantêm aparência anterior.


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


### Controle de Gasto — listas e seletores (03/10/2026)
Preservar acabamento azul claro, bordas arredondadas e sombras. Lista de instituições: uma instituição por linha, cartão compacto à esquerda e tipos em cards separados à direita; empilhamento responsivo em telas estreitas. Projeção: alternância entre cards e linhas por mês. Resumo: seletores pequenos Allan/Carol/Casal acima dos indicadores. Pagamento por instituição utiliza o popup 3D existente, com prévia rolável por parcela e confirmação explícita. Edição/exclusão exibem confirmação dentro do popup, sem alerta nativo do navegador.


### Cabeçalho compacto — 03/10/2026
Mês MM/AAAA com calendário e setas ao lado dos botões de criação, sem ocupar linha própria abaixo dos menus. Seletor de ano/doze meses em popover azul arredondado com sombra. Card da compra usa título/ações na mesma linha, faixa azul de totais com valores de 16px e preenchimento reduzido. Projeção inicia em Lista; Gastos mantém a preferência da conta neste navegador.


### Pagamentos e vencimentos — 03/10/2026
Padronizar TODOS os botões do Controle de Gasto com fundo azul claro 3D, inclusive popup, confirmar, excluir, fecho e calendário. Texto vermelho identifica ação principal/selecionada, sem fundo vermelho. Pagamentos usa cabeçalho de 18px, linhas compactas, valores de 12px e ícones menores. Resumo usa somente O que merece atenção, uma linha por instituição, total e vencimento; painel duplicado removido. Pagar fatura do mês mostra saldo imediato e escolha total/parcial; Quitar compra mostra todas as parcelas pendentes e confirmação integral das partes do casal.


### Controle de Gasto — histórico compacto (03/10/2026)
Quitadas apresenta instituição, nome da compra e total efetivamente pago, com abatimentos separados quando existem. Projeção mantém mês, total e divisão entre responsáveis em dimensões menores. Pagamentos abre em lista por instituição com tipos, quantidades de compras/parcelas e valor pago no mês do lançamento; ao expandir, mostra compras resumidas e, depois, os lançamentos paginados com opção de desfazer mediante confirmação. Totais excluem lançamentos desfeitos e não tratam descontos como dinheiro pago. Sem alteração de dados históricos ou migrações.
Backup verificado: `C:\Users\Allan\ARL-backups\controle-gasto-quitadas-pagamentos-20261003-033742`.


### Fixos de Casa e continuação agendada (03/10/2026)
Instituição/grupo Fixos de Casa usa o cartão de referência fornecido pelo usuário e somente o tipo associado Fixos de Casa. A restrição é validada no backend, inclusive no cadastro por foto; bancos existentes continuam aceitando seus tipos usuais. Selecionar a instituição no cadastro manual sugere recorrência mensal e seu tipo, permitindo outras recorrências e vencimento próprio de cada conta. Forma de pagamento prevista opcional: Pix, dinheiro, boleto, cartão, transferência ou outra; essa informação não altera cálculos nem comprova pagamento. Migração aditiva com campos nullable restricted_type_id e payment_method; sem reclassificar dívidas existentes. O grupo foi adicionado apenas no ambiente local após backup de banco e arquivos privados validado.
Backup: `C:\Users\Allan\ARL-backups\controle-gasto-fixos-casa-20261003-034326`, incluindo `banco-arquivos-privados.zip`.
O usuário rejeitou o acabamento visual do cartão atual e pediu sua recriação somente após o agendamento. Automação única ativa para 07h: refazer a imagem, concluir pendências autorizadas do Controle de Gasto e depois retomar Fornecedores conforme os requisitos do chat. Não publicar em produção. A execução depende de o computador/Codex permanecerem disponíveis e de limite da conta disponível.
Validação: 285 testes PHP / 2559 verificações; 34 testes MySQL isolado / 448 verificações; 17 testes frontend; 10 fluxos E2E passaram na suíte e o novo fluxo Fixos de Casa passou após correção de seletor de teste. Build/TypeScript, lint e Pint aprovados.


## Complementos de 03/10/2026
Nova OS: cápsula compacta preto/vermelho, sombra, mais e texto brancos, conforme imagem codex-clipboard-0c580818-9ae2-42b6-874f-ea3588be953a.png.
Fixos de Casa: arte estática nova `public/arl-assets/expense-cards/fixos-casa-v2.png`, criada com imagegen no desenvolvimento. Prompt: cartão frontal branco premium, proporção 1,586, cantos arredondados, relevo/chip prata, detalhes curvos suaves e sombras 3D, textos legíveis “Fixos de Casa” e “Luz · Água · Internet”, ícone de casa discreto, sem número ou dados pessoais. Referência anterior rejeitada mantida apenas no histórico. A geração não integra o app nem exige API de IA em produção.


### Popup de detalhes da compra com tamanho estável — 03/10/2026
Itens e dados, Parcelas, Notas fiscais e Recebimentos compartilham largura de até 1170px e altura padrão de 720px, limitadas à área disponível da tela. Apenas o corpo rola; cabeçalho/fechamento permanecem fixos. Estilo específico do detalhe evita que o formulário interno de notas reduza a largura para 920px. Demais popups preservados.
Backup externo verificado: `C:/Users/Allan/ARL-backups/supplier-dialog-size-20261003-125445` (1769 arquivos e histórico Git). Lint, TypeScript/build, 19 testes frontend e três fluxos E2E de fornecedores passaram. Teste geométrico alterna as quatro abas em desktop e celular e confirma largura/altura/posição iguais, fechamento visível e contenção na tela. Capturas em output/fornecedores/popup-estavel-1440.png e popup-estavel-390.png. Sem alteração de banco ou publicação.


### Padrão único dos popups de Fornecedores — 03/10/2026
Todos os formulários e detalhes do módulo usam a mesma moldura: largura até 1180px, altura até 760px, limitadas à área disponível (margem de 24px por lado no desktop e 12px no celular). Substitui o padrão anterior de 1170 × 720px exclusivo da compra. Cadastro, compra, recebimento, cancelamento, dados comerciais, vínculo de produto, documentos, devoluções, ocorrências e detalhes de compra/produto seguem a regra centralizada em suppliers.css. Abas vazias, carregamento e seleções não alteram a moldura; conteúdo rola internamente, cabeçalho e ações ficam acessíveis. Popups de outros módulos não são afetados.
Backup externo verificado: C:/Users/Allan/ARL-backups/supplier-popup-standard-20261003-130019 (1779 arquivos e histórico Git). Lint, TypeScript/build, 19 testes frontend e quatro fluxos E2E de fornecedores aprovados em banco isolado. Verificação de dimensões nas abas de compra/produto em desktop e celular e nos formulários comerciais/produtos/documentos/devoluções, com revisão visual. Sem alteração do banco de uso ou publicação.


### Menu lateral — 03/10/2026
Administração mostra Configurações; Usuários fica na aba interna exclusiva do Master. Botão Fixado/Fixar compacto: barra de 26px, texto de 10px, ícone de 12px, margens reduzidas e comportamento/persistência preservados. Versão recolhida usa botão de 30px de largura.


### Desktop adaptado automaticamente à área útil — 03/10/2026
O layout Web/PC acompanha largura e altura do navegador por CSS responsivo, inclusive ao redimensionar a janela; referência mínima 1280 × 720, sem lista fechada de resoluções e sem alterar zoom ou preferência do usuário. Padding/título fluidos; cabeçalho e ações podem se reorganizar. Até 820px de altura, logomarca, grupos, botões e rodapé laterais ficam compactos para mostrar todos os destinos. Até 660px, margens internas reduzem mais; nav mantém rolagem de segurança para áreas menores. Menu fixado/recolhido permanece funcional e persistente. Regras se limitam à classe layout-desktop, preservando Mobile/Tablet. Páginas longas mantêm rolagem vertical e faixas de abas mantêm rolagem própria quando necessária; não há recorte artificial do conteúdo.
Backup externo verificado: C:/Users/Allan/ARL-backups/desktop-auto-fit-20261003-135745 (1793 arquivos e histórico Git). Sem mudanças de dados, dependências ou publicação.
Validação: oito tamanhos de viewport no mesmo navegador, onze telas carregadas e dados de cliente/produto/fornecedor em banco isolado; todos os destinos laterais e saída visíveis, nav sem rolagem, página sem overflow horizontal e popup de fornecedor contido com salvar visível. Sete cenários desktop finais, três de cabeçalho e cinco mobile aprovados; seis fluxos de OS/fornecedores aprovados, além de lint, TypeScript/build e 19 testes frontend. Interferência inicial entre testes de fixação corrigida pela restauração da preferência no finally; sem mudança na persistência real. Capturas: output/compacto/desktop-fit-{largura}-{altura}.png.

### Etiqueta da OS — 04/10/2026
Botão Imprimir Etiqueta na linha Entrada/Saída/Atendimento, ao lado de Senha do usuário, com o mesmo estilo discreto. Popup branco compacto (até 440px), nome editável, prévia em papel branco sobre fundo azul suave; etiqueta física 40 × 20 mm. Só nome, separador tracejado, OS e ARL Informática pequena são impressos. Cabeçalho e ações acessíveis no desktop/mobile. Capturas: output/etiquetas/popup-desktop.png e popup-mobile.png.
### Controle de Gasto: No Mobile.docx — 04/10/2026

Lista mobile apresenta apenas nomes/vencimento; ao abrir a instituição, tipos com contagens aparecem em linhas compactas. Imagens de cartão permanecem em Cards. Filtros recolhidos atrás de Pesquisar e filtrar. Instituições: três botões iguais, acesso aos gastos com ícone de dinheiro. Projeção: Ver mês abaixo da divisão, sem sobrepor valores. Histórico mensal com formulários legíveis, painéis azuis compactos e gráfico de barras por mês; Quitadas mostra pagador junto da identificação da compra. Capturas: output/controle-gasto/mobile-lista-compacta.png, mobile-instituicoes-icones.png, mobile-projecao-corrigida.png, mobile-historico-gastos.png e historico-desktop.png. Regras limitadas ao mobile, exceto funcionalidades de histórico/pagador disponíveis nas duas interfaces.
### Resumo mobile em duas linhas — 04/10/2026

No card principal de Todos/Allan/Carol/Casal, Total original ocupa uma linha e Pago / abatido ocupa a seguinte, com valores à direita e separador discreto. Saldo destacado preservado. Alteração somente de CSS mobile, sem cálculos ou banco. Captura conferida: output/controle-gasto/mobile-resumo-novo.png. Backup externo verificado: C:/Users/Allan/ARL-backups/resumo-mobile-linhas-20261004-025257 (1.971 arquivos, alterações locais e Git).

### Resumo mobile: instituições compactas — 04/10/2026

Instituição e valor na mesma linha, separados por dois-pontos; vencimento abaixo e responsável/parcelas em texto pequeno. Padding, fontes e espaços reduzidos, alinhamento à esquerda e seta discreta. Visão Todos preserva a divisão dos valores. Ação de abrir gastos e cálculos preservados. Captura: output/controle-gasto/mobile-instituicao-compacta.png.

### Gastos mobile somente em lista — 04/10/2026

Substitui a alternância Cards/Lista e os filtros recolhidos somente em Gastos mobile. Instituições e tipos usam linhas azuis compactas: título à esquerda, legenda menor abaixo e seta à direita. Tipos preservam contagens e categorias personalizadas; ações financeiras abaixo. Botões explícitos para voltar às instituições e aos tipos. Web/PC, Quitadas e Projeção preservados. Captura conferida: output/controle-gasto/mobile-tipos-em-lista.png. Backup externo de arquivos, alterações e Git verificado: C:/Users/Allan/ARL-backups/gastos-mobile-lista-20261004-030248.
