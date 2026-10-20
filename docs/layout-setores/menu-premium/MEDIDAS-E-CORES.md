# Menu à direita — medidas e estilo
Teste Playwright real com viewport CSS 390×844: posição x=54,61, largura=335,39, direita=390, topo=0, fundo=844.
Teste com viewport CSS 320×568: x=32, largura=288, direita=320, rolagem interna com clientHeight=367 e scrollHeight=611.
Regra: largura min(86vw,365px), e até 360px min(90vw,330px). Altura 100dvh. Abertura translateX(101%) -> 0 em 230ms; animação desligada com prefers-reduced-motion.
Cabeçalho: degradê preto/âmbar, marca vetorizada original; título Menu branco.
Cards de menu: uma coluna, altura mínima 67px, ícones 43×45px; bordas claras e sombras duplas suaves.
Fundo externo escurecido rgba(11,16,25,.54), blur 2px; toque fora fecha.
Efeito 3D nos cards existentes: inset highlight + sombras de 2 a 9px, sem filtros pesados em listas ou substituição de textos.
Peso adicional de CSS isolado: cerca de 9,5 KB antes de minificação. Parte antiga do CSS do popup inferior, cerca de 3,8 KB, removida em favor do novo componente.
