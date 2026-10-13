# Barra inferior ARL — investigação e correção local

## Evidências e limites
O proprietário relata saltos intermitentes nos navegadores do iPhone, sem sequência determinística. Não há iPhone físico conectado; não afirmar que o sintoma esporádico foi reproduzido em hardware real.

A inspeção em WebKit e Chromium encontrou position:fixed na barra. Ancestrais .shell, #root, body e html: transform/filter/backdrop-filter/contain ausentes, overflow visible e will-change auto. O blur14px pertence à própria barra; não foi removido. Nenhum código legado reposiciona essa navegação.

Defeito demonstrável: a barra se ancorava no viewport de layout por bottom:0, sem sincronização com a área visível. Um teste CONTROLADO da API VisualViewport, com layout664px e área visível450px, reprovou antes:214px de diferença. Não confundir essa fixture com o gesto/toolbar nativo do Safari. Rolagens comuns em emulação não reproduziram os saltos espontâneos descritos.

Referências: [VisualViewport e os dois viewports](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [medição antes da pintura em React](https://react.dev/reference/react/useLayoutEffect), [propriedades de containing block para fixed](https://lists.w3.org/Archives/Public/public-css-archive/2025Apr/0518.html).

## Correção
- MobileBottomBar mede sua altura e acompanha height/offsetTop do VisualViewport. Fallback:innerHeight. Escuta resize/scroll/pageshow/retorno da aba; requestAnimationFrame reúne eventos, sem renderizar React em cada scroll. Eventos/observer/frame são liberados ao desmontar.
- Posicionamento concentrado em arl-reference-bottom-nav.css: fixed e top calculado pela borda visível menos altura real; bottom:auto. Removidos dois overrides posteriores da barra ARL em arl-eight-improvements; sem translateZ, portal, GPU/will-change ou novos !important de posicionamento.
- Reserva ao final do main mantém o mínimo anterior128px+safe-area e aumenta quando a barra cresce. Scroll-margin acompanha altura. Safe area mantida por env(safe-area-inset-bottom), com viewport-fit=cover já presente.
- Padding inferior4px+safe-area consolidado mantém o valor efetivo aprovado anteriormente, inclusive telas320px. Gradientes, sombras3D, círculos, tamanhos, ícones, cores, navegação/permissões e menu de3s preservados.
- Barra própria do Controle de Gastos e desktop não recebem esse hook; regressão verifica a independência existente.
- Servidor E2E torna explícitos cookies locais HTTP/host-only para WebKit. Mudança restrita ao processo testing/loopback; nenhum config/session.php, .env ou cookie de produção alterado.

## Arquivos
resources/js/main.tsx; novo resources/js/use-mobile-nav-viewport.ts; resources/css/arl-reference-bottom-nav.css; resources/css/arl-eight-improvements-20261012.css; scripts/e2e-server.mjs; novo playwright.ios-nav.config.ts; novo tests/e2e/mobile-nav-viewport.mobile.spec.ts; .github/workflows/ci.yml.

## Validação local
- Backup externo integral, incluindo Git/modificações/não rastreados: C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups/01 - 13-10-26 - 18-03/ARL-ANTES-BARRA-MOBILE.tar.gz;5680entradas;SHA256692c128dd99f0b1718d27be8f301530e7a61efe1f0d4dd9c6b8295b882fed962. Vendor/node_modules regeneráveis excluídos do arquivo e preservados no disco.
- Lint, TypeScript e build aprovados;61unitários aprovados.
- WebKit26.0/Playwright1.55.1:iPhone13 emulado,2cenários aprovados,39,3s na rodada final. Chromium:2cenários reforçados aprovados,31,3s; regressão anterior13cenários aprovados,1,5min.
-11rotas: Painel,Clientes,NovaOS,Ordens,Financeiro,Serviços,Produtos,Fornecedores,Configurações,Usuários,Pós-venda. Em cada rota:320x568,390x664,844x390 e oito mudanças de scroll;264amostras por motor, com pelo menos uma rolagem real>200px. Resizes/offsets visual controlados e texto26px; espaço ao fim da NovaOS verificado por posição do último botão. Testes aguardam identidade e heading, não apenas a moldura em carregamento.
- Imagem final WebKit inspecionada: output/mobile-nav-viewport-webkit.png; cinco ações3D e botão final do formulário visíveis. Screenshot de carregamento intermediária foi substituída no teste por espera do conteúdo pronto.
- Falhas preservadas: baseline negativo214px; primeiro teste reforçado Chromium reprovou por serialização CSS11,999875vs12. Comparação arredondada para centésimos de pixel; verificação independente de ausência de sobreposição permanece. Nenhum teste desativado/retries0.
- Regressão ampliada mobile em andamento: output/BARRA_REGRESSAO_FORMULARIOS.log. Atualizar conclusão ao terminar.

## Segurança e continuidade
Somente Laragon/SQLite descartável para testes. Nenhuma mudança no banco oficial, KingHost, TERRAPLAN, original C:/laragon/www/arlinformatica ou preferências de backup. Sem mudança de regras financeiras. Senha SSH não acessada nesta correção.

Produção permanece na release01dcd01 publicada anteriormente. Esta correção ainda não foi publicada. Confirmar em iPhone físico com barras do navegador/teclado/rolagem inercial e retorno de aba; emulação WebKit não fornece a interface do Safari nem safe-area real do aparelho. Não prometer validação física concluída.

Comandos: npm run lint; npm run typecheck; npm run build; npm run test:unit; npx playwright install webkit; npx playwright test --config playwright.ios-nav.config.ts; npx playwright test mobile-nav-viewport.mobile.spec.ts. Publicador antigo ainda aponta para base5c já removida; uma próxima publicação exige preparar base/rollback01 e novo backup local verificado, sem SQL de escrita.
