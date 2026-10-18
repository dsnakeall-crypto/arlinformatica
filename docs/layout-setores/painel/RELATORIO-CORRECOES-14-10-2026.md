# ARL Informática — Correção fina de layout (14/10/2026)
**Situação:** implementação concluída somente no ambiente local, aguardando avaliação visual do proprietário.

## Pedido do usuário
- Corrigir o menu lateral para ficar como na segunda imagem enviada: fotografia dos equipamentos com acabamento preto/dourado, sem fundo tecnológico anterior.
- Corrigir imagens e ícones do Painel, botões Nova OS/Entrada Rápida no cabeçalho, status truncado, fontes e transição da janela maximizada para estreita.
- Ícone de cadeado aberto em Ordens em andamento e cadeado fechado em Fechadas recentemente; ambos menores, quadrados e padronizados.

## Feito
1. Fundo único da lateral `public/arl-assets/arl-gold-sidebar-photo-continuous-20261014.webp`, 240×941 px, **4.868 bytes**, retirado da fotografia da referência e tratado para excluir controles/textos fictícios. O logo e os menus são componentes reais. SHA-256 `F220AD730CEBAB4FD0C06F926051DDA0A19BA677DF1C0F355876D46FD9927436`.
2. CSS `resources/css/arl-layout-gold-repair-20261014.css` importado em `resources/js/main.tsx` após as folhas de referência: conserta prioridade visual do fundo e dos menus, painel, tabelas e responsividade nas janelas estreitas.
3. CSS `resources/css/sidebar-gold-continuous-20261014.css` atualizado para foto nova, eliminando referência antiga de AVIF (8,3 KB). O arquivo AVIF antigo foi salvo no backup e retirado do aplicativo após verificar que não existiam referências no código.
4. CSS de Ordens e Painel aplica-se a `layout-desktop` independentemente de a janela ter mais ou menos de 801 px. Isso impede a volta ao visual antigo ao reduzir a largura. O layout mobile próprio não foi alterado.
5. Tabelas de Ordens e Painel com células e linhas tabulares, rolagem horizontal **dentro do cartão** em espaço reduzido; sem empilhar dados verticalmente.
6. Cabeçalho do Painel usa sino posicionado à direita, botões sem margens negativas. Maior contraste e espaços corrigidos.
7. Status `Em Análise` e `Aguardando Peça` têm ajuste local de fonte para **11 px** e menos preenchimento horizontal, evitando truncar `Aguardando Peça`; as outras fontes do sistema e a família original não foram alteradas.
8. Reaproveitamento dos ícones originais de ações `icon-web-eye-compact-2x.png`, `icon-web-edit-compact-2x.png` e `icon-web-delete-compact-2x.png` na lista de OS (Original desktop). WhatsApp e Maps mantidos.
9. `resources/js/dashboard-page.tsx`: ícones reais Lucide `LockKeyholeOpen` e `LockKeyhole` nos títulos. Duas caixas quadradas de **31×31 px**, SVG 17×17 px; não são imagens esticadas.
10. Se a janela desktop estiver abaixo de 801px, a lateral compacta mantém 58 px, sem rolagem do menu, com o estilo dourado preservado. Tipografia global intacta.

## Proteção e evidências
- Backup antes desta rodada, **7 arquivos com SHA-256 verificados**:
  `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\LAYOUT-CORRECOES-ANTES-20261014-200829`.
- Novo AVIF antigo também foi copiado ao backup antes de removê-lo.
- Nenhuma escrita em banco, autenticação, API ou servidor oficial; nenhuma publicação.
- Código e arquivos de auditorias anteriores não foram revertidos nem apagados.
- `npm run build`, `npm run lint` e `git diff --check`: **PASS**.
- Browser Chromium autenticado, Ordens e Painel: 1672×941, 1280×720, 960×600, 800×650, 760×650, 660×600 e retorno a 1672×941: **PASS**. A rolagem horizontal, onde necessária, fica apenas dentro da tabela; sem overflow horizontal da página. Menus sem rolagem própria. Dois cadeados presentes.
- Alternância da lateral recolhida 58px preservando fundo dourado: **PASS**.
- Tema Clean isolado: **PASS**.
- Navegação Painel → Ordens → Painel: **PASS**.
- Capturas em `%LOCALAPPDATA%\ARL-Informatica-Dev\gold-correction-{orders,dashboard}-{1672,760}.png`.

## Diferença visual remanescente
A logomarca permanece a original dinâmica do aplicativo (cores ARL oficial), enquanto a imagem exemplo tinha lettering dourado. A fotografia foi recortada da referência enviada e otimizada, então o resultado não foi declarado literalmente pixel-perfect.
