# Reforma do Mobile Premium ARL — referência 3D oficial, 20/10/2026

## Referência e autorização
- Solicitação do proprietário: reproduzir fielmente, pixel a pixel onde viável, o screenshot mais recente (1024×1536) do Painel ARL com cabeçalho preto/dourado, ícones metálicos, indicadores e cartões 3D, lista recente e dock 3D.
- Original da imagem é o anexo mais recente da conversa de 20/10/2026; não confundir a barra de título do Windows com a UI do app.
- O screenshot da referência está disponível na conversa. As capturas abaixo são de navegador REAL.
- Aplicação autorizada: somente Mobile Premium ARL. Não modificar regras, dados, componentes Web/PC ou Controle de Gastos.

## Execução local via Desktop Commander
Projeto: C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica
Branch: release/integracao-completa-20261018
HEAD no início: 8903365
Git com 408 alterações anteriores; nenhuma foi revertida ou adicionada em massa.

Backup ANTES com originais + git status, diff binário e SHA-256:
C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 05-15 - ARL-MOBILE-3D-REFERENCIA

Arquivos alterados somente nesta rodada:
- resources/js/mobile-home.ts: `premiumIcon` produz SVGs metálicos vetoriais com gradientes, contorno de profundidade e sombra individual para os 8 ícones do Painel; preserva dados e handlers.
- resources/js/main.tsx: adiciona import CSS por último, sem mexer em roteamento, permissão ou lógica.
- resources/css/arl-mobile-3d-reference-20261020.css (novo): acabamento específico ao Mobile Premium — hero preto/dourado, cartões e atalhos elevados, status/ações, dock e formulários de módulos internos.
- public/arl-assets/arl-mobile-premium-gold-ribbon-20261020.svg (novo): curva vetorial brilhante sobre o cabeçalho escuro; não é screenshot achatado.
- tests/e2e/mobile-premium-3d-reference-20261020.spec.ts (novo): proteção da aparência 3D e isolamento Web/PC.

## Diretrizes de implementação
- Reutiliza componentes reais existentes de Ordens, Clientes, Abrir OS, Serviços, Produtos, Fornecedores, Financeiro, Configurações.
- Os cards 3D são CSS com brilho interno e sombras múltiplas, sem gráficos pesados externos.
- SVG vetorial para ícones, gradientes dourado/azul e curva do cabeçalho.
- Dock mantém destinos aprovados: Painel, Clientes, + Abrir OS, Gastos, Menu. Gaveta direita preservada.
- Controle de Gastos NÃO é afetado pelos novos estilos, pois todas as regras CSS são escopadas com `.arl-mobile-premium-mode:not(.arl-expense-workspace)`.
- O Web/PC não é afetado.

## Capturas e testes
Pasta externa: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 05-15 - ARL-MOBILE-3D-REFERENCIA
- PAINEL-3D-320.png
- PAINEL-3D-375.png
- PAINEL-3D-390.png
- PAINEL-3D-409.png
- PAINEL-3D-430.png
- MENU-3D-390.png
- PRODUTOS-3D-390.png
Logs: typecheck.log, lint.log, build.log, build-banner-final.log, e2e-3d-final.log, verificacao-visual-3d-final.log e e2e-reference-contract-r2.log.
Checks concluídos: TypeScript, lint e build 0 erros; 8 testes E2E direcionados e walkthrough dos módulos inclusos, sem overflow horizontal nas larguras acima. Novos E2E de contrato visual executados separadamente.
Os 20 registros do banco de teste aparecem na prévia HTTP 127.0.0.1:8012. Nenhuma migração/seed desta rodada.

## Limites e próximos gates
- **Não afirmar precisão de 100% pixel a pixel.** A referência inclui ícones rasterizados 3D específicos, enquanto a implementação atual usa SVGs vetoriais metálicos e sombra CSS; a aproximação visual é alta mas não matematicamente idêntica.
- Ajustar diffs finos de ícones e brilho dos cards conforme feedback visual do proprietário, sem quebrar a responsividade ou a tipografia original.
- CI integral GitHub e revisão de performance completa ainda não concluídas; NÃO publicar.
- Git: sem git add ., git clean, reset hard, commits, push ou deploy.
- KingHost, MySQL oficial, fotos/documentos e configurações oficiais intocados.
