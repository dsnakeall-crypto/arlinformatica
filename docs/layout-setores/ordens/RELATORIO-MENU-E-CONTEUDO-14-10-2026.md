# ARL Informática — Menu e Ordens dourados (14/10/2026)

**Situação: IMPLEMENTADO NO AMBIENTE LOCAL; AGUARDANDO APROVAÇÃO VISUAL.**

## Referência e escopo
Autorização expressa para modificar menu lateral do tema Original e conteúdo central de Ordens com base na imagem anexada `image(20261014-211811).png` (1672×941). Menus internos de Clientes, Financeiro e outros setores permanecem preservados. Sem alterações no Clean/Mobile, backend, dados, SQL, KingHost ou produção.

## Mudanças
- Menu lateral preto/dourado, fotografia recortada, logo oficial configurável, bordas e brilho dourados, contador com fundo dourado, botão Nova OS e item ativo metálicos. Fixar/desfixar continua funcional.
- Somente no conteúdo central de Ordens: fundo claro areia com foto no canto, cabeçalho dourado, botão Nova OS, cinco abas com ícones dourados e contadores dinâmicos, busca, tabela clara, status coloridos e paginação.
- Tipografia Original (famílias, tamanhos, cores, pesos) mantida, bem como ícones de ações e lógica das operações.
- Dados da imagem NÃO copiados: registros, nomes, quantidade de OS e datas são os retornados pelo ambiente de homologação.

## Arquivos modificados/criados
- `resources/js/main.tsx`: import único da folha nova no fim dos CSS.
- `resources/js/orders-page.tsx`: somente ícones nas cinco abas existentes.
- `resources/css/orders-reference-gold-20261014.css`: isolado por tema Original/desktop e setor Ordens.
- `public/arl-assets/orders-gold-sidebar-photo-20261014.webp` (2.396 bytes).
- `public/arl-assets/orders-gold-corner-20261014.webp` (2.058 bytes).
- Recursos extraídos da referência e transferidos com comparação de SHA-256.

## Backup e regressão
- Backup anterior à edição (8 arquivos verificados por SHA-256): `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 14-10-26 - 18-25-03 - MENU-ORDENS-OURO-ANTES`.
- Branch inicial `original-restaurado-20261014`, commit `53bb453`. O arquivo AGENTS.md com alterações anteriores e outros arquivos não relacionados não foram alterados.
- Build, ESLint e git diff --check: aprovados.
- Playwright autenticado: 1672×941, 1366×768, 1280×720, 960×600 e maximizar novamente. Sem sobreposição, rolagem interna do menu, ou overflow horizontal do documento. Troca de abas Finalizadas → Em Andamento aprovada. Temas separados e arquivos WebP HTTP 200. Nenhum erro JS reportado.
- Captura local `%LOCALAPPDATA%\ARL-Informatica-Dev\orders-gold-final-20261014.png`.
- Navegação fria/quente não teve benchmark quantitativo final; os novos assets somam 4.454 bytes.

## Diferenças residuais
Não declarar 100% pixel-perfect: fotografia lateral foi comprimida e ampliada; logo real configurável é diferente da imagem ilustrativa dourada; fontes e cores textuais mantêm a regra do Original; há 4 registros no teste contra 6 linhas ilustradas; sombras e microespaçamentos são aproximados.

**Próximo passo: aprovação visual do usuário. Sem avanço ou publicação antes da aprovação.**