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

### Fonte única para rótulos de status

Ainda existe divergência de nomenclatura entre superfícies: `waiting_part` aparece como `Aguardando` nos contratos do detalhe React e como `Aguardando Peça` na Mesa atual. Consolidar os rótulos em uma fonte única antes de uma revisão de UX, sem alterar os códigos persistidos.

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
