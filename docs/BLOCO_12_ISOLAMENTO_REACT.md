# Isolamento de telas React — 12/09/2026

Escopo: os cinco problemas aprovados pelo proprietário na sessão, com as decisões posteriores de manter a lista mobile legada e eliminar os editores decorativos de mensagens. Sem mudanças no backend, Serviços, configuração de ambiente, publicação ou commits.

## Alterações por problema

1. **Ordens:** `main.tsx` marca a lista com `data-arl-orders-react="1"`. O interceptor deixa as requisições React intactas, inclusive o parâmetro `tab`. Não injeta o botão de escopo legado. O teste de navegação foi reescrito para conferir as quatro abas usando registros reais, sem remover o teste.
2. **Nova OS:** `data-arl-new-order-react="1"`; equipamento interno continua “Informado manualmente”. Só a descrição livre é renderizada para identificar o equipamento. Busca de clientes e itens fica sob controle React; câmera reaproveita o componente existente. O helper E2E seleciona clientes pelo campo de busca, substituindo acesso ao antigo select oculto.
3. **Configurações:** `data-arl-settings-react="1"`; React controla a montagem do conteúdo da aba selecionada. Não cria os três painéis decorativos nem a subseção cancelada “Mensagens ao cliente”. Links da empresa permanecem em Informações complementares. As oito abas e a subaba Termo de recebimento são preservadas; não reativar Orçamento/Laudos retirados da navegação anteriormente.
4. **Lápis:** ação React da lista solicita ao detalhe o editor unificado existente ou a confirmação de reabertura existente. O backend continua responsável pela autorização, histórico, documentos e regras financeiras. Não cria fluxo financeiro alternativo; estorno continua no detalhe.
5. **Mobile:** somente o cabeçalho desktop do Painel deixa de ser montado no modo Mobile/Tablet. `mobile-home.ts` identifica a tela pelo marcador, sem depender do texto do heading removido. Sua lista, carregamento, cards e links permanecem legados.

## Enhancers modificados e responsabilidades preservadas

As condições consultam a raiz React atual, não uma flag global permanente. Os scripts continuam carregados; rotinas de telas não protegidas continuam disponíveis. `react-ownership.ts` centraliza os seletores.

| Arquivo | Bloqueio aplicado | Continua ativo |
| --- | --- | --- |
| `order-workflow.ts` | Botão/filtro na lista React; normalização do DOM das raízes protegidas | Fluxo legado de status/detalhe e escopo de listas legadas sem `tab` |
| `order-maintenance.ts` | Injeção de ações/modal reduzido na lista React, inclusive após consultas | Manutenção de listas legadas sem marcador |
| `record-management.ts` | Ações de exclusão imperativas na lista React | Gestão legada de registros fora das raízes já protegidas |
| `brand2026.ts` | Alterações de Painel, Nova OS e Configurações protegidos | Shell, identidade global, Pós-Venda, mensagem após criação e ferramentas externas de foto |
| `brand2026-access.ts` | Controle de abas, editores e checklist nas telas protegidas | Acessibilidade do shell, Pós-Venda e comportamento de formulários legados sem marcador |
| `new-order-search.ts` | Conversão imperativa de catálogos na Nova OS React | Buscas de catálogos e itens em formulários legados externos |
| `client-search.ts` | Instalação da busca imperativa dentro de raiz React | Busca de clientes em formulários legados externos |
| `ui-final-polish.ts` | Criação/visibilidade de painéis nas Configurações; mutação do Painel React | Acabamento de Pós-Venda e outras telas legadas não protegidas |
| `opening-whatsapp.ts` | Revelação de painéis de edição nas Configurações React | Captura de criação, mensagem fixa de abertura e ações de Pós-Venda |
| `completion-polish.ts` | Remoção de editores e mudanças de rótulos/ícones dentro das raízes protegidas | Compartilhamento final e acabamento em superfícies legadas externas |
| `ui-regression-guard.ts` | Sincronização imperativa do equipamento/checklist na Nova OS React | Acessibilidade de Pós-Venda e ações de status do detalhe legado |
| `page-isolation.ts` | Limpeza não confunde as novas raízes com telas ausentes | Remoção de resíduos de outras telas, inclusive lista mobile ao sair do Painel |
| `mobile-home.ts` | Identifica Painel sem exigir heading “Painel” | Toda a lista mobile existente; nenhuma reescrita em React |

## Verificação

O caso `Configurações não oferece mais edição da mensagem de abertura` de `opening-whatsapp.spec.ts` exigia dois painéis ocultos. Agora exige ausência no DOM, conforme autorização expressa. As verificações do texto fixo enviado ao WhatsApp e todos os testes do backend permanecem.

O teste mobile exigia a presença do cabeçalho que este bloco remove; passa a exigir sua ausência. Não foram alterados timeout, retries ou a falha conhecida do sidebar. Resultados e pendências ficam em `CHECKLIST_FINAL.md`.

Após a primeira suíte completa (70 passaram / 5 falharam), os dois testes de homologação passam a selecionar cliente pela busca React e conferir o nome selecionado e o fechamento dos resultados. A homologação funcional também confere o cliente no payload e na OS persistida. O teste de cabeçalho verifica ausência do cabeçalho desktop no Painel mobile, presença da região OS abertas e contenção geométrica dessa região e do cabeçalho da Nova OS em 390 e 768px, incluindo ausência de overflow horizontal da página.

A altura do termo dependia de `brand2026-access.ts`, em `autoSizeTextarea` / `syncSettingsEditorHeights`. O bloqueio do enhancer expôs a regressão de 180px. `TermTextEditor` assume o ajuste no ciclo React: mínimo de 220px, expansão conforme conteúdo e recálculo quando a largura muda. A asserção existente de pelo menos 220px permanece intacta. Nova execução E2E pendente de confirmação de servidor parado; nenhuma alteração commitada.
