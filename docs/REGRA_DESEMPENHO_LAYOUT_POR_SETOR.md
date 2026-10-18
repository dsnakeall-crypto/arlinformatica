# REGRA 10 — DESEMPENHO MÁXIMO NA REFORMA DE CADA SETOR
Criada em 14/10/2026. Regra complementar e obrigatória ao protocolo de layout fiel por setor e à preservação da tipografia do Original.

## Objetivo obrigatório
Cada setor reformado precisa ficar o mais rápido possível para abrir, navegar e operar, preservando **integralmente** o visual aprovado, a tipografia congelada e as funcionalidades.
**A cada nova alteração visual de um setor**, o coordenador aciona a revisão de desempenho; não esperar a conclusão do aplicativo para investigar lentidão.
Nenhum agente pode marcar "rápido" sem medir.

## Metas — não são garantias
- Resposta perceptível ao clique: meta até 100 ms, quando tecnicamente possível.
- Navegação para tela com dados já disponíveis: idealmente até 300 ms.
- Abertura inicial e requisições remotas: registrar tempos reais e dependência de rede/servidor; sem prometer latência zero.
- Nunca mascarar demora com telas falsas, timers, placeholders indevidos, dados financeiros desatualizados ou erro oculto.

## Procedimento obrigatório ANTES e DEPOIS de cada mudança
1. **Antes da edição:** medir baseline da tela real no Laragon, na mesma configuração de dispositivo/rede e com quantidade de dados representativa. Registrar clique→feedback, clique→tela utilizável, carregamento frio/quente, chamadas API, tempo de resposta, chunks/JS/CSS carregados, imagens transferidas e erros.
2. **Durante o desenvolvimento:** após cada bloco de mudança (fundo, botão, abas, cards, tabela, ícones), avaliar peso e custo de execução. Evitar acumular trabalho/re-renderização e estilos contraditórios. Otimizar apenas onde houver benefício comprovável; não reescrever módulos sem diagnóstico.
3. **Imagens:** usar formatos modernos WebP/AVIF quando compatíveis, dimensões necessárias ao uso e compressão medida. Manter arquivo original/referência e comparar a qualidade visual antes de aceitar qualquer redução de KB. Não fixar um limite arbitrário que destrua detalhes. Evitar grandes imagens como base para UI funcional, imagens duplicadas, assets maiores que a dimensão exibida, carregamento simultâneo desnecessário e animação pesada.
4. **React:** verificar re-renderizações desnecessárias, consultas repetidas, dependências pesadas e importações, reaproveitamento seguro de componentes/estado. Lazy-loading/code splitting quando acelerar o caminho crítico sem piorar a navegação; não atrasar conteúdo essencial desnecessariamente.
5. **CSS e animações:** reduzir cascatas redundantes, regras conflitantes, `!important` em série, sombras/filtros caros e layout thrashing. Manter elementos sem saltos inesperados na abertura e ao alternar maximizado/reduzido/maximizado. Não mudar propriedades tipográficas do Original.
6. **Dados e backend:** apenas diagnóstico de endpoints, tamanho de payload e cache correto. Não alterar banco, SQL, API, autenticação ou regras de negócio sem autorização separada. Dados financeiros e status precisam manter consistência e frescor.
7. **Depois de cada mudança:** medir de novo no mesmo cenário; comparar contra a baseline, e registrar os valores (não apenas "passou"). Se houve piora reproduzível, investigar e corrigir a causa antes de liberar aprovação visual.
8. **Regressão:** Playwright/capturas, lint, typecheck, build e testes funcionais; conferir também setores vizinhos, Clean, Mobile e dados reais preservados. A nova aparência não pode voltar ao layout antigo ao redimensionar.
9. **Relatório:** documentar alterações e métricas antes/depois, KB originais/otimizados, diferenças visuais, erros, trade-offs e pendências. Sem medição, status = AINDA NÃO VALIDADO.
10. **Decisão de escopo:** se a otimização adequada exigir tocar em outro setor, camada compartilhada, banco ou função, **parar e pedir autorização**; não estender a edição silenciosamente.

## Medições sugeridas por setor
| Métrica | Antes | Depois | Resultado |
|---|---|---|---|
| Clique→feedback (ms) | medir | medir | comparar |
| Clique→tela utilizável (ms) | medir | medir | comparar |
| Carregamento frio/quente (ms) | medir | medir | comparar |
| Dados via rede: requisições/KB | medir | medir | comparar |
| JavaScript/CSS carregados (KB) | medir | medir | comparar |
| Imagens e ícones adicionados (KB) | medir | medir | comparar |
| Erros console/rede e scroll/reflow | medir | medir | comparar |

## Precedência e proteção
Esta regra trabalha **junto** com `docs/PROTOCOLO_LAYOUT_FIEL_POR_SETOR.md` e `docs/REGRA_TIPOGRAFIA_ORIGINAL_CONGELADA.md`. Velocidade não autoriza sacrificar cores/tamanhos de fonte, ícones aprovados, fidelidade, responsividade, acessibilidade, dados ou operações. Ao detectar impossibilidade ou conflito, informar ao proprietário e solicitar decisão. O aceite visual e a liberação de outro setor continuam exclusivos do proprietário.

## Agentes responsáveis
- Coordenador: obriga baseline e medição após cada etapa.
- Analista visual: orienta assets e efeitos de alta fidelidade com baixo custo de carregamento.
- Implementador: entrega código enxuto, isolado e responsivo.
- **Performance (perfil já existente em .agents/roles/performance.md):** diagnostica gargalos, compara medições e propõe otimizações específicas.
- Auditor visual: impede perda da fidelidade ou da tipografia por otimizações.
- QA responsivo: verifica regressões, desempenho na interação e resize em todos os viewports contratados.
Perfis são instruções, não processos autônomos executando.
