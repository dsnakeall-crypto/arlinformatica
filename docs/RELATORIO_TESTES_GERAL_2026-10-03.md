# Relatório geral de homologação — 03/10/2026

## Resultado e escopo

Foi executada uma rodada de simulações funcionais, financeiras, de estoque, segurança, documentos, interface e concorrência. Foram acrescentados cenários com 30 clientes e 30 OS, 30 fornecedores e 30 compras, além de 48 dívidas distribuídas em oito instituições. Os testes usam cadastros fictícios, bancos descartáveis e armazenamento privado separado.

Esta rodada cobre os cenários descritos abaixo e as funcionalidades existentes na suíte. Não representa uma garantia sobre todas as combinações possíveis, integrações externas reais ou o ambiente da hospedagem.

## Proteção dos dados existentes

Antes das edições foi criado e verificado o backup externo `C:/Users/Allan/ARL-backups/simulacoes-gerais-20261003-144339`: 1.823 arquivos, alterações locais e histórico Git. O pacote `database-private.zip`, no mesmo diretório, foi validado pelo serviço de backup do aplicativo antes e depois da cópia. Credenciais e backups não entram nos commits.

Os testes PHP usaram SQLite isolado e bancos MySQL descartáveis com nome protegido de teste. Os testes de navegador usaram servidor separado, SQLite de E2E e arquivos privados próprios. Os processos concorrentes usaram exclusivamente um banco `arl_test_races_*`, removido ao terminar. Nenhum teste criou os 30 cadastros ou as 48 dívidas no banco de uso.

A comparação do banco local de uso verificou 58 tabelas e 266 arquivos privados. Cinquenta e sete tabelas permaneceram idênticas. Em `notifications`, a comparação com o backup mostrou somente alteração de `updated_at` em dois alertas `supplier_due`; os demais campos e a quantidade de registros permaneceram iguais. O aplicativo local mantém a atualização de alertas enquanto é utilizado. Todos os 266 arquivos privados conservaram os mesmos hashes. Não houve alteração dos cadastros, saldos, compras, estoque ou dívidas existentes.

## Volume executado

| Área | Simulação | Conferências principais |
|---|---|---|
| Clientes e OS | 30 clientes; 30 OS; 25 concluídas e 5 interrompidas | Documentos duplicados bloqueados; equipamentos e atendimentos variados; checklist; edição; transições válidas e inválidas; recebimentos e histórico |
| Documentos de OS | 30 termos e 25 documentos finais; orçamentos nos fluxos previstos | Geração, preservação dos documentos e bloqueio de emissão final duplicada |
| Financeiro de OS | 50 recebimentos e 5 devoluções | Pagamento parcial/integral, repetição de requisição, limites de saldo e conservação dos centavos |
| Fornecedores | 30 cadastros e 30 compras; 32 produtos de catálogo e 60 itens comprados | Identificação, contatos, endereço, dados comerciais e bancários/Pix, consultas e paginação |
| Recebimentos e estoque | 45 recebimentos, 10 devoluções | Entrega imediata/parcial, excesso bloqueado, repetição sem duplicação, cancelamento do restante e produto compartilhado entre fornecedores |
| Contas a pagar | 105 títulos, com uma a seis parcelas por compra | Métodos de pagamento, vencimentos, quitação/cancelamento e ausência de duplicação automática no Financeiro geral |
| Documentos e relacionamento | 30 documentos privados e 30 ocorrências | Upload/download, categorias, repetição, avaliações simples, consultas e backup contendo as compras/documentos |
| Controle de Gasto | 48 dívidas; 8 instituições; 4 tipos; 282 parcelas ao final | Individual e casal, divisões de 50%, 33% e 67%, datas de fim de mês, parceladas e recorrentes |
| Movimentos de gastos | 112 lançamentos ao final; 12 dívidas inicialmente quitadas e 6 canceladas | Pagamento, antecipação, abatimento parcial, estorno repetido, encerramento de recorrência, edição e cancelamento preservando histórico |

Na simulação de OS, o recebido bruto foi **R$ 11.996,25**, com **R$ 50,00** devolvidos. O estoque do produto vendido terminou em 75 unidades, conforme as 25 OS concluídas. No fornecedor, o produto compartilhado terminou em 64 unidades. Também foi simulada entrada de brinde sem fornecedor, custo zero e repetição sem duplicar estoque.

No Controle de Gasto, o pagamento por instituição abateu **R$ 335,04** exclusivamente da parte de Allan no mês selecionado, incluindo sua parte compartilhada. Foram conferidos saldo individual zero, preservação da outra pessoa e ausência de duplicação na repetição do pagamento. Resumos foram comparados com a soma das parcelas, com verificações de conservação dos centavos e saldos não negativos.

## Demais setores e conflitos

A suíte completa também percorreu autenticação, sessões, CSRF, contas inativas, autorização de funcionários, permissões no backend, importação de clientes, catálogos, busca progressiva, serviços com preço livre, painel, auditoria, relatórios financeiros, despesas, recibos/devoluções, pós-venda, notificações, configurações da empresa, temas, assinatura técnica, PWA e documentos públicos por token.

Backup, restauração e limpeza de banco foram verificados em ambiente isolado. Os testes de documentos verificaram paginação, fotos, tamanho de arquivos e preservação de informações históricas da empresa. Os testes de despesas e fornecedores verificaram bloqueios de duplicidade, registros inexistentes, estoque insuficiente, dados inválidos e operações incompatíveis com o estado atual.

A leitura por foto foi verificada com respostas controladas de IA e cenários de importação, revisão, validação, repetição e autorização. Esta rodada não enviou novas faturas à Mistral nem consumiu chamadas pagas da API.

## Concorrência real e correção encontrada

Dois processos PHP independentes foram executados contra MySQL com sobreposição forçada das operações, em cinco cenários:

| Cenário | Resultado esperado e obtido |
|---|---|
| Mesma entrada de brinde repetida simultaneamente | Ambas as chamadas respondem; uma única entrada de estoque |
| Duas OS tentando consumir a última unidade | Uma venda aceita; outra bloqueada; estoque não fica negativo |
| Dois pagamentos tentando quitar a mesma parcela de gasto | Um aceito; outro bloqueado; sem pagamento excessivo |
| Mesma chave de pagamento usada em OS diferentes | Uma aceita; outra retorna conflito; somente um pagamento |
| Mesmo pagamento de OS repetido simultaneamente | Uma criação e uma repetição bem-sucedida; somente um pagamento |

Foi encontrado um defeito real no último cenário: antes da correção, a segunda chamada podia receber erro 500 por disputa da chave única, embora o dinheiro não fosse lançado duas vezes. A correção revalida a chave após bloquear a OS e trata a disputa de unicidade. Após a correção, as respostas foram 201 e 200 para a mesma OS; para OS diferentes, 201 e 409. Os cinco cenários passaram.

Correção registrada no commit `b6a38c9`. Não houve mudança de esquema ou migração nesta rodada.

## Verificações automatizadas

| Verificação | Resultado |
|---|---|
| PHP completo em SQLite | 299 testes aprovados; 6.325 verificações |
| PHP completo em MySQL | 299 testes aprovados; 6.325 verificações |
| Novos cenários de volume, incluídos nos totais acima | 3 testes; 3.586 verificações |
| Frontend | 19 testes aprovados |
| Navegador | 137 cenários distintos aprovados, somando a rodada completa e o reteste do volume |
| Concorrência real em MySQL | 5 cenários aprovados |
| ESLint, TypeScript e build | Aprovados |
| Pint nos arquivos PHP alterados | Aprovado |
| Pint global | Aprovado após normalização local do final de linha em `routes/api.php`, sem mudança de código |

A primeira execução completa do navegador teve 134 aprovações e duas falhas em testes antigos que ainda esperavam três botões escritos no mobile. A interface solicitada possui quatro ícones acessíveis. As expectativas foram atualizadas e os cinco testes desse arquivo passaram. Quinze testes de navegador relacionados ao financeiro/finalização passaram após a correção de concorrência.

A repetição completa, incluindo o novo cenário de volume, aprovou 136 dos 137 testes em 14,8 minutos. A falha restante foi uma expectativa do novo teste: a lista financeira exibe `Compra #1`, enquanto a verificação esperava um número preenchido com zeros. O teste foi ajustado ao formato existente, sem alterar a interface. O reteste final desse cenário passou em 48,2 segundos. Assim, os 137 cenários distintos ficaram aprovados entre a rodada completa e esse reteste; não foi necessário repetir novamente os 136 casos que já haviam passado.

## Interface e evidências

Foram exercitados os fluxos existentes de desktop e mobile em Chromium, incluindo diálogos, cadastros, parcelas, históricos, fornecedores, resumo pessoal/casal, instituições, pagamentos e projeção. O novo teste de volume também conferiu ausência de overflow horizontal e erros JavaScript com os cadastros em volume. A navegação mobile foi emulada em 390 × 844; não substitui uma rodada em aparelhos físicos.

Os logs, resultados JSON/XML e capturas estão em `output/homologacao-geral/`, fora do versionamento. As capturas do teste de volume incluem clientes, OS, fornecedores, financeiro do fornecedor, gastos e resumo mobile. O diretório contém evidências fictícias de testes; não deve integrar o pacote de publicação.

Testes reproduzíveis adicionados:

- `tests/Feature/SimulationVolumeTest.php` — cenários de volume e saldos.
- `tests/e2e/simulation-volume.spec.ts` — navegação com dados em volume.
- `tests/support/run-concurrency.php` e `concurrency-worker.php` — disputas reais em banco MySQL descartável local.
- `tests/e2e/mobile-home.spec.ts` — expectativas ajustadas aos quatro ícones autorizados.

## Limites e publicação

Não foi publicado código nem alterado o banco de produção. Esta rodada não verificou a cópia atual do banco online, permissões/limites do PHP da KingHost, entrega real de mensagens, impressão física, captura de câmera de um aparelho real ou desempenho sob grande quantidade de usuários simultâneos.

Funcionalidades externas ou regras ainda não implementadas não foram consideradas aprovadas: comprovação oficial de existência de CPF, serviços cadastrais que exigem contratação/credencial, pagamentos parciais de títulos de fornecedor, compensação financeira automática de créditos de devolução e permissões comerciais granulares além das permissões existentes.

Antes de publicar, ainda é necessário validar backup restaurável do servidor e dos arquivos privados, homologar as migrações pendentes sobre uma cópia do banco online, conferir configuração privada de IA e armazenamento, e realizar uma rodada curta na hospedagem com login, OS, documentos, fornecedor, estoque e Controle de Gasto. A aprovação local desta rodada não dispensa essa etapa.
