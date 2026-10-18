# PROTOCOLO OFICIAL — LAYOUT FIEL POR SETOR (ARL Informática)
Data de criação: 14/10/2026. Esta instrução é obrigatória para futuras reformas visuais; não autoriza reforma imediata.

## Princípio inegociável
**Uma imagem aprovada = um setor autorizado = uma implementação isolada = testes = aprovação explícita do proprietário.**
A referência enviada pelo proprietário é a fonte visual principal daquele setor. Não introduzir mudanças criativas, adaptações não solicitadas, cores alternativas ou elementos extras. Qualquer exceção solicitada pelo proprietário fica registrada textualmente e tem precedência sobre a arte.

**Meta:** máxima fidelidade visual, mirando equivalência pixel a pixel na dimensão/escala da referência. Não declarar "100% idêntico" automaticamente: fontes, antialiasing, sistema operacional, dados variáveis e outros viewports podem impedir igualdade literal. Documentar diferenças residuais, corrigir o que for possível e deixar a aprovação final com o proprietário.

## Fase 0 — autorização e contrato visual
1. Identificar **um único setor e uma única página/estado**; solicitar autorização explícita antes de modificar código.
2. Receber imagem de referência; registrar dimensão em pixels, zoom/DPR, estado do sistema e viewport alvo. Se desconhecidos, medir na imagem e solicitar apenas o dado crítico.
3. Criar contrato de escopo: **ALTERAR** / **PRESERVAR** / **EXCEÇÕES** / **NÃO ADICIONAR** / **COMPORTAMENTO DAS AÇÕES**.
4. Manter toda tela não nomeada intacta, inclusive menu lateral quando este não fizer parte do setor autorizado. Componentes compartilhados exigem revisão de impacto e permissão específica se afetarem outro setor.
5. Preferências explícitas do proprietário (logo oficial configurável, ícones existentes, fontes atuais, cores e dados dinâmicos) prevalecem sobre detalhes ilustrativos da imagem.
6. Caso a referência represente comportamento ambíguo (seta, botão, busca, status), não inventar funcionalidade. Confirmar antes de alterar semântica.

## Fase 1 — segurança e linha de base
1. Conferir branch, hash, diff e arquivos não versionados; criar branch/commit de marco **somente quando uma implementação for aprovada**.
2. Backup local verificado antes da primeira edição em `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - dd-MM-yy - HH-mm - LAYOUT-SETOR`, fora da árvore do aplicativo e do Git.
3. **Nunca usar reset hard ou apagar arquivos em massa** como técnica de implementação. Rollback apenas do diff específico do setor, com confirmação explícita para exclusões.
4. Tirar captura **ANTES** da tela funcionando e dos controles nas resoluções alvo; proteger versão Original restaurada, Clean, Mobile, Controle de Gastos e demais módulos.
5. Sem mexer em banco, .env, autenticação, APIs, registros, hospedagem, KingHost, TERRAPLAN ou dados reais. Usar dados de homologação isolados para E2E.
6. Desenvolvimento local no Laragon; Codex/Claude/Cloud são ferramentas opcionais, nunca uma dependência do produto final.

## Fase 2 — decomposição precisa da imagem
Registrar no contrato, por região:
- coordenadas/posições, larguras, alturas, grid, gutters, padding, gaps, raios;
- tipografia: família, peso, cor, tamanho, altura da linha, alinhamento, truncamento;
- paleta e contraste (cores medidas), sombras, gradientes e efeitos 3D;
- logo, ícones, fundos e ativos originais — usar arquivos enviados em vez de redesenhar, quando disponível;
- ações de cada controle, estados ativo/hover/foco/desabilitado, tabelas vazias/cheias;
- comportamento no desktop, janela reduzida, mobile/tablet se o setor os incluir.
As imagens servem como especificação visual; não transformar a tela inteira em uma figura fixa. A UI precisa permanecer acessível, legível, responsiva e funcional.
Imagens decorativas podem ser otimizadas em WebP/AVIF **após comparar fidelidade**, e com arquivos isolados por setor. Nunca misturar fundo da arte com botões/elementos que precisem funcionar.

## Fase 3 — execução isolada
1. **Um único agente implementador escreve o conjunto de arquivos do setor por vez**; outros agentes ficam em análise/revisão, para não haver conflitos.
2. Reutilizar componentes e tokens existentes onde possível; mudanças novas devem ser encapsuladas no componente/raiz específica da tela. Não propagar CSS de painel ao menu Clientes, por exemplo.
3. Proibido empilhar remendos globais, múltiplas regras contraditórias e `!important` sucessivos como solução permanente. Consolidar a cascata; revisar CSS computado.
4. Proibido mudar globalmente `data-layout`, breakpoints, a fonte de todas as telas ou a lateral compartilhada sem autorização de escopo.
5. Não remover funcionalidades; não adicionar componentes não solicitados; preservar nomes/dados reais da aplicação em vez de copiar exemplos fictícios impressos na imagem.
6. Cada mudança pequena deve ter diff revisável e relatório breve do que mudou.

## Fase 4 — prova visual e funcional (bloqueia entrega)
1. Usar Playwright para capturar a tela **real** pós-login/dados carregados; não usar mockup no lugar do aplicativo.
2. Comparar referência x captura no **mesmo viewport/DPR/zoom/estado**. Criar montagem lado a lado e overlay/diff por região (ImageMagick/Python/pixelmatch/SSIM onde úteis).
3. Medir elementos via `getBoundingClientRect()` e `getComputedStyle()`: fontes, cores, largura da lateral, altura de botões, status, scroll e clipping.
4. Testar mudanças reais de tamanho **na mesma sessão**: maximizado → janela reduzida → maximizado. Também em 1920×1080, 1680×940, 1366×768, 1280×720 e uma altura curta como 720 px quando pertinentes; testar mobile/tablet se envolvidos. O modo responsivo configurado pelo usuário deve ser considerado.
5. Verificar alterações de estado, seleção, navegação, dados dinâmicos, permissões, foco e erros de console. Nenhuma falha visual/funcional conhecida pode ser escondida pela captura.
6. Rodar lint, typecheck, build, testes direcionados e regressão das telas vizinhas/tema Clean e Mobile. Caso qualquer teste relevante falhe, **não entregar como aprovado**.
7. O revisor visual **não pode ser o mesmo papel que implementa**. Deve listar divergências e solicitar correções iterativas até satisfazer a referência.
8. Não declarar 100% de fidelidade baseado apenas em compilação bem-sucedida. Informar exatamente resultados, diferenças remanescentes e as resoluções testadas.
9. Quando a imagem for impossível de replicar precisamente (fonte inacessível, informação ambígua, arte visual incompatível com interação), explicar claramente antes de escolher uma aproximação.

## Fase 5 — aceite
- O único responsável pelo **ACEITE VISUAL FINAL** é o proprietário, após ver o app real local.
- Sem aprovação, status = **EM AJUSTES**. Não iniciar outros setores nem publicar.
- Se reprovado, corrigir a mesma tela, sem levar estilos experimentais para outras páginas.
- A aprovação vale apenas para o setor, tema, viewport e exceções acordados; nunca implica autorização de deploy.
- Após aceite, checkpoint Git + evidências, e congelamento do setor até novo pedido.
- Parar ao limite de 8% de uso do Codex conforme regra existente, sem retomar automaticamente.

## Equipe de perfis/agentes
Perfis locais em `.agents/roles/`: `layout-coordenador.md`, `layout-analista-visual.md`, `layout-implementador.md`, `layout-auditor-visual.md`, `layout-qa-responsivo.md`.
São papéis de revisão no Codex/ChatGPT, **não agentes autônomos já executando nem permissões adicionais**. O coordenador distribui tarefas; apenas implementador edita UI; auditor visual e QA trabalham principalmente em leitura/testes; todos obedecem ao AGENTS.md do projeto.

## Registro mínimo obrigatório por setor
`docs/layout-setores/<setor>/` **somente ao iniciar setor aprovado**:
- `ESCOPO-E-EXCECOES.md` (incluindo arquivos autorizados; nome literal sem zero confundível se adotado)
- `MEDIDAS-E-CORES.md`
- `BASELINE-E-REFERENCIA.md` (caminho de capturas/arquivos de referência)
- `RELATORIO-DIFF-VISUAL.md` (comparações, divergências e correções)
- `TESTES-E-REGRESSOES.md` (viewport, erros, acessibilidade, Clean, outras telas)
- `APROVACAO.md` (apenas aprovação expressa; nunca presumida)
Não excluir referências originais de forma destrutiva enquanto o setor estiver ativo.

## Regra SUPERIOR — tipografia do Original intocável (14/10/2026)
**Ler obrigatoriamente `docs/REGRA_TIPOGRAFIA_ORIGINAL_CONGELADA.md`.** A imagem de referência é mandatória para a estrutura, visual dos fundos, cards, botões, menus, ícones e efeitos; **não é mandatória para fontes**, que são sempre herdadas da versão Original restaurada.
- Não mudar família, tamanho, cor, peso, altura de linha, espaçamento ou outros atributos das letras e números originais, incluindo títulos, subtítulos, clientes, dispositivos, status, relatos, datas/horas, valores, botões, tabelas e placeholders.
- Tirar snapshot programático da tipografia original antes de editar; preservar a variação original de cada breakpoint/estado (maximizada, reduzida, hover, foco etc.); comparar computed styles depois.
- Evitar mudança indireta por herança, seletores compartilhados ou reset CSS. Se a cor original não contrastar com o novo fundo, adaptar o fundo/cartão — nunca a fonte.
- Exceções pontuais precisam da permissão expressa do proprietário para **cada elemento e propriedade**. Sem isso, o auditor deve marcar FALHA e bloquear a homologação.
- A meta de fidelidade de 100% à arte aplica-se aos **elementos visuais autorizados**, respeitando esta exceção fixa de tipografia original. Isto é uma divergência deliberada da arte quando ela mostrar outros tamanhos/cores/fontes.

## Regra 10 SUPERIOR — desempenho progressivo por mudança visual
**Ler `docs/REGRA_DESEMPENHO_LAYOUT_POR_SETOR.md` em conjunto com a regra de tipografia congelada.**
- A cada nova parte implementada (menu, fundo, ícones, cards, tabela, abas), diagnosticar oportunidade de velocidade daquele setor, medir e otimizar sem custo visual/funcional não autorizado.
- Medir clique→feedback, clique→tela utilizável, frio/quente, rede, peso de recursos e erros antes/depois; usar mesma configuração e dados comparáveis.
- Otimização de imagens em WebP/AVIF com menor KB possível **sem diferença visual relevante** e sem transformar controles reais em uma imagem.
- Manter metas já existentes (feedback até 100 ms quando viável; navegação com dados disponíveis idealmente até 300 ms). Não são promessas fixas.
- O perfil `.agents/roles/performance.md` participa da auditoria do setor, e o QA não marca aprovado sem resultados. Se a otimização exigir alterar outro módulo, banco ou regra de negócio, pedir permissão primeiro.
