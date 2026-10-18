# CONTINUIDADE IMEDIATA — ARL mobile — 09/10/2026

## Por que este arquivo existe
A conversa do ChatGPT atingiu o limite de tamanho **NO MEIO DA IMPLEMENTAÇÃO**. Ao iniciar um novo chat no Projeto "App - Arl Informática", ler este arquivo e o AGENTS.md antes de editar. **NÃO INFORMAR QUE O PACOTE ESTÁ PRONTO**, pois os testes finais NÃO foram executados e parte das mudanças pode ainda estar parcial/inconsistente.

## Ambiente / estado
- Computador conectado Desktop Commander: DESKTOP-BCLK2QK, ID 1dad5632-9485-43f4-a48e-f31e3c01e101.
- Projeto original, editado diretamente: `C:\laragon\www\arlinformatica`.
- DDEV no WSL: `wsl -d DDEV -- sh -lc 'cd /mnt/c/laragon/www/arlinformatica && ddev npm run build'`.
- BACKUP ANTES DESTA RODADA: `C:\Users\Allan\ARL-backups\mobile-only-clean-20261009-213027`; contém `history.bundle`, `files/` com cópias físicas dos arquivos modificados/não rastreados (92 arquivos), `status-before.txt`, `private-env.txt`. Não publicar essas informações privadas.
- Há dezenas de arquivos intencionalmente não commitados ANTES desta rodada; não fazer `git reset --hard`, `git clean`, `migrate:fresh`, não descartar alterações alheias. Sem commit, push, deploy ou modificação da base KingHost.
- Database DDEV contém dados importados de cliente real. **Nunca rodar testes destrutivos no MariaDB DDEV**. Playwright usa SQLite descartável isolado.

## Trabalho final solicitado — SOMENTE ARL MOBILE
O usuário disse explicitamente que **Gestor de Gastos está fechado/100% aprovado**; jamais alterar o miniapp Gastos nesta rodada, nem suas seis telas. Preservar integralmente Web/PC e tela inicial de OS abertas no mobile.

1. Menu lateral compacto (e drawer flutuante do modo barra inferior): eliminar anel cinza/roxo, moldura e fundo de ícone ativo; ícone selecionado **vermelho**. O botão central `+ Abrir OS` permanece como está.
2. Listagem de Ordens de Serviço mobile: número, data e cliente já estavam centralizados; acrescentar centralização do **equipamento**, ex. "Notebook" na OS de Celsuite do Martins, sem mudar o relato/status/ações. WhatsApp intacto; Google Maps, olho, lápis e lixeira **sem fundo/borda quadrada**, ícones soltos preservando superfície clicável >=44 px. Somente mobile.
3. Gestão de Clientes mobile: campo de busca por **nome**, ordenação **alfabética automática**, paginação fixa **10 clientes/página**, controles desktop "por página" e "Ordenar" ESCONDIDOS apenas mobile; paginação anterior/próximo funcional, mais compacta. Ícones visíveis: WhatsApp, Maps, olho (histórico), lápis (editar). **Ocultar prancheta Nova OS e lixeira Excluir** somente na listagem mobile; desktop mantém todas as ações; olho e lápis sem borda/fundo, mantendo área de toque.
4. Serviços, Produtos e Fornecedores: SEM ALTERAÇÕES.
5. Financeiro da ARL mobile: seletor **Mês exibido** com aparência mais bonita, próximo ao seletor visual do Gestor de Gastos, sem alterar comportamento/dados; títulos/textos de "Lançamentos identificados" um pouco menores com espaçamento da barrinha verde.
6. Pós-Venda/Reputação: retirar ícone de telefone e acesso por menus da ARL **somente no mobile**; desktop continua normalmente. Proteger também contra abrir diretamente URL `/post-sale` em mobile, sem mudar backend.
7. **Somente Clean no mobile**, sem opção "Original". Em Configurações > Layouts mostrar apenas **Mobile — barra inferior** e **Mobile — menu lateral compacto**, sem Web/PC. No celular impedir selecionar layout Desktop via estado/URL/preferência antiga; Web/PC continua com sua escolha de aparência e layout. Conservar a preferência Clean Original desktop independente.

## Estado exato no momento da interrupção
Começaram alterações, mas NÃO foram terminadas nem testadas:
- `resources/js/main.tsx`: mudanças de layout mobile, navegação/ocultação de Pós-Venda e envio do parâmetro `mobile` para Clientes estavam sendo aplicadas.
- `resources/js/layouts-settings.tsx`: filtro para tirar opção Web/PC quando o modo selecionado é mobile.
- `resources/js/appearance.ts`: força valor visual Clean no documento quando móvel sem regravar preferência Web; sincroniza evento de layout.
- `resources/js/appearance-settings.tsx`: oculta Original e desabilita troca de modo no mobile.
- `resources/js/settings-page.tsx`: passa `mobileOnly` para AppearanceSettings.
- `resources/js/clients-page.tsx`: parâmetro `mobile`, `mobileList`, `effectivePerPage=10` já foram vistos no código; OUTRAS PARTES podem estar incompletas. Verificar imediatamente JSX dos controles e botões.
- Ações/ícones de Ordens e CSS de menu, Clients e Financeiro ainda precisam de confirmação/conclusão. Não alterar Gestor de Gastos.
- Uma inspeção em 09/10 às ~22:05 encontrou 92 arquivos preservados no backup. **NENHUM TESTE FINAL DESTA RODADA FOI CONCLUÍDO**.

## Próximos passos para o novo chat
1. Inspecionar estado atual (`git status`, diffs exclusivamente dos arquivos da rodada), confirmar backup.
2. Concluir os componentes/estilos mobile e menus sem quebrar JSX/TS. Evitar CSS global afetando Web e Gestor de Gastos.
3. `ddev npm run lint`, `ddev npm run typecheck`, `ddev npm run build`, `ddev npm run test:unit`.
4. Testes Playwright focados no banco e storage **isolados**: mobile barra inferior e compacto, ícones ativos, OS equipamento + botões, busca/paginação 10 em Clientes e visibilidade das ações, mês/lançamentos Financeiro, Pós-Venda oculto e URL, Layouts só 2 opções, aparência Clean fixa, regressão Web/PC e Gestor de Gastos intactos.
5. Screenshot responsivo 320/390/430/desktop; aprovação visual pelo proprietário antes de auditoria Claude/Codex.
6. Atualizar `CHECKLIST_FINAL.md` com cada item [OK]/[PENDENTE] e documentar testes.
7. **NÃO PUBLICAR NA KINGHOST**. Usuário quer testar, depois Claude/Codex auditar, depois eventualmente autorizar deploy real.
