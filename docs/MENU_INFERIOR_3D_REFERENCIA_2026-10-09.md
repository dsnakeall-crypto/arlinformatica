# Menu inferior 3D — referência enviada em 09/10/2026

## Escopo
Reforma **somente do visual** da barra inferior do ARL no modo **Mobile > Barra inferior**, conforme a imagem enviada pelo proprietário: base flutuante branca arredondada, cinco ícones sobre discos redondos de relevo 3D, botão central **Abrir OS** maior e vermelho, etiquetas abaixo. O texto do botão vermelho ficou vermelho-escuro, em vez de branco sobre branco da imagem, para assegurar contraste.

Preservados: destinos, permissões, clique dos cinco botões, painel mobile inicial de OS, versão Web/PC, modo Mobile lateral compacto, menu lateral aberto pelos três tracinhos e navegação independente do Controle de Gastos.

## Arquivos
- `resources/js/main.tsx`: envolver cada ícone em `.arl-nav-icon-disc`, rótulo em `.arl-nav-caption` e marcar apenas os botões da barra com `.arl-nav-reference-button`; importar folha específica por último.
- `resources/css/arl-reference-bottom-nav.css`: acabamento 3D responsivo, círculos, estados ativo/foco/toque, barra flutuante de largura máxima 510px, área inferior para evitar sobreposição. Ajustes para 320px e 1024px.
- `resources/css/clean-appearance.css`: excluir exclusivamente os cinco botões marcados da regra genérica de botão secundário, que possui especificidade elevada; manter a aparência Clean em todo o restante.
- `tests/e2e/menu-referencia-3d.mobile.spec.ts`: teste próprio de tamanhos, geometria/overflow, tema Clean e funcionamento de Painel/Clientes/Abrir OS.

## Segurança e retorno
Backup **pré-mudanças**, com bundle Git verificado, 68 arquivos do estado anterior e cópia privada de .env: `C:\Users\Allan\ARL-backups\nav-3d-referencia-20261009-183606`. Não fazer commit de segredos. Nenhum banco real ou produção foi alterado, sem deploy e sem commits.

## Resultados
- Build Vite/TypeScript: **OK**.
- ESLint: **OK**.
- 41 testes de frontend: **OK**.
- Playwright mobile 320, 360, 390, 430, 768 e 1024 pixels: **OK** sem overflow horizontal ou círculos cortados nas laterais.
- Playwright Clean e navegação Painel/Clientes/Abrir OS: **OK**.
- Capturas: `output/menu-inferior-3d-20261009/barra-320px.png`, `barra-390px.png`, `barra-430px.png`.

## A validar
- [PENDENTE] Avaliação subjetiva e toque no aparelho real do proprietário (cores/tamanho/relevo). Mudanças apenas locais.
