# TECHNICAL_DEBT.md

Registro criado após a barreira técnica da Etapa 10.

## Barreira concluída

- HEAD validado antes deste documento: `cd9e0a60b51159ce6c10db9bd0995787f0418fa9`.
- CI #762 (`push`) e CI #763 (`pull_request`) concluídas no mesmo SHA, sem commit entre elas.
- Em ambas: `backend`, `backend-mysql`, `frontend` e `e2e` concluíram com `success`.
- Nenhum job foi pulado. O único `skipped` observado foi um passo interno condicional de upload de artefato dentro do job E2E; o job E2E e `npm run test:e2e` concluíram com `success`.
- A instrumentação diagnóstica temporária já foi removida antes da barreira.

## Pendências já classificadas como escopo futuro, não regressão

### Fase 1 — troca de cliente em OS ativa

Implementar a troca de cliente apenas para OS mutável, incluindo:

- suporte de backend para `client_id` na edição;
- interface no detalhe React;
- auditoria explícita do cliente antigo e do novo;
- contratos de persistência e exibição;
- preservação da imutabilidade de OS `completed`/`paid`.

### Fase 1 — edição de equipamento

Implementar a edição dos dados de equipamento da OS ativa, incluindo `equipment_description`, com suporte de backend, interface React, auditoria e contratos E2E. OS finalizadas/pagas continuam imutáveis.

## Dívidas da migração React que devem ser tratadas em etapa própria

### Enhancers legados ainda coexistem com o detalhe React

O Ver OS React está protegido por guards e os E2Es provam que os enhancers legados não podem mutar sua árvore. Ainda assim, código legado continua coexistindo no bundle e deve ser aposentado de forma controlada quando não houver mais dependência de telas antigas. Não remover em massa sem auditoria de consumidores.

### Enhancer legado da página inicial Mobile/Tablet

`resources/js/mobile-home.ts` ainda injeta no DOM a lista de OS abertas específica do modo móvel. Antes do Bloco 5, esse enhancer também criava um segundo cabeçalho e ocultava o cabeçalho React com CSS, o que removia do modo Mobile/Tablet o `PageHeader` e o heading acessível `Painel`.

O segundo cabeçalho e a regra que ocultava o `PageHeader` foram removidos. O enhancer agora se limita ao conteúdo operacional de OS abertas, com `OS abertas` como heading de seção (`h2`), enquanto o cabeçalho único permanece sob responsabilidade do React. Em etapa futura, migrar também essa lista para React e aposentar o enhancer somente após auditar os contratos mobile, sem remover funcionalidades.

### Fonte única para rótulos de status

O rótulo operacional de `waiting_part` foi consolidado como `Aguardando Peça` em todas as superfícies e contratos, sem alterar o código persistido.

Regra crítica preservada: `in_service` representa **Em Serviço**, deve permanecer selecionável, persistido e exibido como tal, e nunca deve ser remapeado para `analysis`.

### Isolamento de dados dos E2Es

A suíte compartilha dados entre vários testes e workers; isso pode tornar frágeis testes que dependam da primeira página de uma listagem. Os contratos novos já usam busca por cliente único quando necessário, mas a suíte deve evoluir para isolamento mais explícito de fixtures/escopo de dados para reduzir interferência entre testes paralelos.

## Segurança histórica da migration de status

`database/migrations/2026_09_06_170000_normalize_service_order_statuses.php` está neutralizada: não executa mais `UPDATE in_service -> analysis` e não deve voltar a alterar histórico.

Se surgir evidência futura de execução manual de uma revisão antiga dessa migration em ambiente com dados reais, auditar os registros antes de qualquer tentativa de reconstrução automática de histórico.

## Decisões de produto/documentação que exigem definição antes de implementação

### Cores globais / identidade visual

Há conflito entre documentação/checklist que menciona cores globais configuráveis e contratos atuais que protegem uma paleta fixa. Não alterar até existir decisão explícita de produto sobre qual comportamento deve prevalecer.

## Fora desta etapa

Não iniciar automaticamente após este documento:

- layout/redesign;
- orçamento/PDFs de nova identidade visual;
- cabeçalho/timbrado novo;
- reabertura de OS;
- estorno/refund;
- qualquer mudança na ordem das próximas fases.

A ordem das próximas fases deve ser definida pelo usuário antes de novos commits funcionais.

### Campo de equipamento manual na Nova OS — resolvido

O campo e o envio de `equipment_description` agora pertencem ao formulário React. O enhancer legado foi removido do bundle, e o contrato mobile da barra fixa voltou à suíte E2E.

## Bloco 12 — ownership React e mensagens fixas (decisão de 12/09/2026)

Os modelos de abertura da OS, Avaliação Google e Instagram são fixos no código por decisão do backend. `Brand2026SettingsTest` garante que os campos legados de mensagem sejam descartados por `/api/settings`, que o template de abertura não seja exposto no endpoint operacional e que a edição de Pós-Venda seja recusada. Esses contratos permanecem intactos.

Os painéis de edição eram decorativos: os controles criados pelos enhancers não persistiam as mudanças. Foram removidos da tela React de Configurações impedindo sua criação, sem criar uma subseção de mensagens em Documentos. Os links Instagram/Avaliação Google da empresa continuam em Informações complementares. A preparação das mensagens e os links do WhatsApp de abertura e Pós-Venda permanecem independentes desses editores.

Se os modelos precisarem tornar-se editáveis no futuro, será necessário aprovar e implementar conjuntamente backend, consumo no WhatsApp e alteração dos testes correspondentes. Mover ou reexibir os textareas não implementa essa funcionalidade.

O Painel mobile continua usando a lista de `mobile-home.ts`; somente o cabeçalho desktop React deixa de ser renderizado nesse modo. O marcador de ownership identifica o Painel sem depender da presença do heading `Painel`. Não foi feita migração da lista mobile para React.

### Pendências visuais e de integração identificadas no Bloco 12

- Os botões WhatsApp e Maps no detalhe aparecem como quadrados coloridos sem a imagem do ícone.
- O CSS do modal Editar OS está presente no bundle carregado, mas não é aplicado visualmente.
- Regressão do Bloco 12: os botões WhatsApp e Maps não aparecem em OS reabertas, mas aparecem em OS novas e finalizadas.
