# REGRA PERMANENTE — TIPOGRAFIA ORIGINAL INALTERÁVEL
Definida pelo proprietário em 14/10/2026. Prioridade máxima para futuras substituições visuais do tema **Original** da ARL Informática.

## Escopo da permissão
O proprietário pode enviar imagens que definam novos fundos, formas, menus, cartões/cards, ícones, contornos, dimensões, brilho, profundidade/3D, sombras e posicionamento de elementos, **um setor por vez**.
A imagem serve como especificação **da aparência estrutural**, não como autorização para alterar a tipografia existente.

## Proibido alterar sem exceção explícita
Preservar o estado original existente do aplicativo para **todos os textos** no setor afetado, incluindo títulos, subtítulos, links, placeholders, campos, nomes, dispositivos, números, valores, data/hora, relato, etiquetas, botões, navegação, tabelas, cabeçalhos, estados e badges de status:
- família de fonte e fallback (font-family);
- tamanho de fonte (font-size), inclusive variantes nos breakpoints;
- cor das letras (color) em todos os estados, inclusive ativo, hover, disabled, foco e valores dinâmicos;
- peso (font-weight), estilo (font-style), transformação (text-transform);
- altura de linha (line-height), espaçamento entre letras/palavras (letter-spacing, word-spacing);
- decoração e legibilidade tipográfica existente (text-decoration, text-shadow, -webkit-text-stroke);
- formato e conteúdo real dos rótulos/números, exceto alterações funcionais aprovadas separadamente.

**Exemplo do Painel:** 'Ordens em andamento', 'Fechadas recentemente', #OS, data/hora sob a OS, cliente, dispositivo/Lenovo, status, relato, coluna Ações e todos os outros textos continuam com seu tamanho, família, peso e cor atuais. Se a arte tiver data amarela e o app original verde/preto, mantém-se a cor do **app original**. Se a arte usar fonte maior, não aumentar.

## Procedimento de garantia
1. ANTES de editar, capturar a página Original funcionando e guardar baseline tipográfica verificável por elemento/estado/resolução: seletor identificável, texto, font-family, font-size, color, font-weight, line-height, letter-spacing, text-shadow, etc. Usar Playwright + getComputedStyle quando possível.
2. Sempre comparar elementos **no mesmo viewport, escala, tema e estado** (desktop, janela reduzida, mobile se explicitamente no escopo). Quando a tipografia original varia com breakpoint, preservar exatamente essa variação.
3. IMPLEMENTADOR não pode alterar CSS global de tipografia, tokens de fonte, classes reutilizadas, regras herdadas ou breakpoints que afetem qualquer texto protegido. A proibição vale inclusive para mudanças indiretas por especificidade, herança e pseudo-elementos.
4. Se o novo fundo tiver contraste insuficiente com a cor original das letras, **ajustar o fundo, cartão ou área de leitura**, jamais a cor, o tamanho ou a espessura da fonte sem novo pedido do proprietário.
5. Comparar a referência com a implementação usando a **tipografia da linha de base**, não a tipografia da arte. As divergências textuais contra a imagem são uma exceção deliberada, não defeitos a corrigir.
6. AUDITOR independente faz diff tipográfico automatizado e visual de todas as regiões relevantes. Se a propriedade tipográfica divergir da baseline sem exceção registrada, marcar **FALHA/BLOQUEADO**. Não há aceite automático.
7. Se uma alteração estrutural exigir fonte menor, abreviar texto ou trocar cor para caber, parar e apresentar a limitação ao proprietário. Ele decide explicitamente uma exceção pontual ou outra estrutura.
8. Ao concluir a implementação e os testes de resize (maximizar → reduzir → maximizar), registrar comparativo ANTES/DEPOIS da tipografia, arquivos alterados, regressões e diferenças restantes.
9. O Clean, outras telas e outros estados não autorizados permanecem intactos. A aprovação é por setor e por exceção declarada.

## Precedência
Em caso de conflito com a imagem de referência, vence esta regra de preservação tipográfica.
Somente comando expresso do proprietário sobre um texto/propriedade específica pode abrir exceção. A autorização genérica para seguir uma imagem '100% fiel' não autoriza alterar fontes.

## Observação técnica
É possível mudar posição e contêiner dos textos para acompanhar o layout, desde que não mudem os atributos tipográficos protegidos ou o conteúdo funcional. A largura disponível poderá fazer textos quebrarem/truncarem; a implementação deverá preservar legibilidade com a estrutura, sem alterar a tipografia.
