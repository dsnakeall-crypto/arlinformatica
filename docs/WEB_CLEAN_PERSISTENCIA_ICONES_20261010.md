# ARL Informática — persistência do layout, temas e ações 3D (10/10/2026)

## Implementado
1. A preferência `arl-layout-mode` tornou-se independente das dimensões temporárias do navegador. Se o usuário escolhe Web/PC, não troca para mobile ao minimizar, arrastar entre monitores ou reduzir a janela. A preferência salva continua após recarga; o modo mobile escolhido também não muda sozinho ao ampliar.
2. Dispositivos identificados como celulares/tablets pelo user-agent usam interface mobile; apenas Clean. No Web/PC, `Original` e `Clean` estão visíveis em **Configurações > Layouts**, além da opção já existente na seção Identidade para Master/Admin.
3. A sincronização da aparência `resources/js/appearance.ts` agora acompanha o layout efetivo em vez de forçar Clean por `matchMedia(max-width:1024px)` quando uma janela desktop é reduzida.
4. Ícones olho, lápis e lixeira extraídos da referência enviada, recortados para arquivos transparentes e otimizados. Usados somente no **Web Clean** nas ações da lista de Clientes e Ordens; acessibilidade (rótulos) e cliques originais preservados; WhatsApp, Maps e botões do Web Original/mobile permanecem como estavam.
5. Destaques dos menus, botões primários e abas ativas do Web Clean alterados de rosa para vermelho. O tema Original e o Gestor de Gastos não tiveram o acabamento modificado.

## Alterações da rodada
- `resources/js/layout-preference.ts` (novo, resolução e identificação de dispositivo).
- `resources/js/main.tsx` (não impor mobile por evento de redimensionamento; persistir layout).
- `resources/js/appearance.ts` (respeitar a escolha persistida).
- `resources/js/layouts-settings.tsx` (seletor Original/Clean também em Layouts Web).
- `resources/css/web-clean-reference-20261010.css` (vermelho mais intenso e ícones 3D somente Web Clean).
- `public/arl-assets/icons/icon-web-eye.png`, `icon-web-edit.png`, `icon-web-delete.png` (novos, transparentes).
- `tests/frontend/layout-preference.test.mjs` (4 testes novos).
- `tests/e2e/web-layout-persist-icons-20261010.spec.ts` (3 cenários).

## Backup e proteção
Backup anterior à rodada: `C:\Users\Allan\ARL-backups\layout-persist-icons-webclean-20261009-234010`.
Contém cópias dos arquivos existentes relevantes, status Git, alterações anteriores em patch, lista dos não rastreados, SHA-256 e `history.bundle` validado. Mantido integralmente. Não foi executado reset do Git, nenhum commit, push, publicação, migração nem gravação em banco real. Testes E2E usam SQLite temporário descartável.

## Validação
- DDEV: lint, typecheck, build Vite e **50/50 testes unitários passaram**.
- Playwright (Chromium, PHP local temporário + SQLite isolado): **3/3 cenários passaram** para tema Original/Clean no Web, persistência entre 790px/1440px com recarga, mobile Clean persistido e ícones 3D no cadastro de cliente temporário. Acrescidos aos 3 cenários existentes de Web Clean anteriormente aprovados.
- Asset files retornaram HTTP 200 e CSS computado confirmou uso de cada arquivo.
- Captura final `output/web-clean-reference-20261010/web-clean-clientes-icones.png` (após o reteste visual).
- Homologação manual em dois monitores físicos e em telefone real permanece recomendada antes de publicar.

## Restrições
- Controle de Gastos: sem alterações nesta rodada, continua aprovado.
- Web/PC Original: estilo preservado, opção restaurada e disponível.
- Mobile: Clean obrigatório, apenas duas opções de navegação.
- Nenhuma operação em KingHost/produção.
