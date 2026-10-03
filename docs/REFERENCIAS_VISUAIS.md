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
