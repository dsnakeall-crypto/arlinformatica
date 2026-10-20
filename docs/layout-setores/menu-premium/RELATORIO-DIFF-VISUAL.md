# Comparação visual — menu Premium direito
ANTES: bottom-sheet flutuante estreito; fluxo vertical central próximo à barra inferior; ícones e cartões simples.
DEPOIS: gaveta alinhada à borda direita, altura total, largura 86% em 390px, painel de cabeçalho ARL preto/dourado, cartões verticais com ícone, nome, descrição curta, chevron e sombra 3D, botão Sair fixo no rodapé.
QA identificou durante implementação altura inicial de 775px em viewport 844px; foi corrigida impondo 100dvh. Foi corrigido contraste do título Menu que aparecia escuro sobre fundo preto.
Cartões de Painel, Ordens, Clientes, Serviços, Produtos, Fornecedores, Financeiro e Configurações receberam profundidade CSS leve (sombras e bordas), sem modificar dados e ações.
**Estado:** em avaliação visual do proprietário. A imagem final mantém diferenças de geometria entre 320px e 390px intencionalmente, para responsividade.
