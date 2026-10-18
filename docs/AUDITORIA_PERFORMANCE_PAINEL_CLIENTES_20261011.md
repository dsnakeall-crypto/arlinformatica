# ARL Informática — Otimização de Painel, Ordens e Clientes
**Rodada de 11/10/2026 — preparação local, sem publicar.**

## Regras preservadas
- Os layouts Web Original, Web Clean e Mobile continuam congelados.
- Sem alteração no MySQL oficial, arquivos privados da KingHost, Git remoto ou DNS.
- Ensaios de carga exclusivamente em SQLite descartável, com clientes sintéticos.
- Backups desta rodada: `C:\Users\Allan\ARL-backups\resumo-otimizacao-20261011-001`, `C:\Users\Allan\ARL-backups\performance-painel-leve-20261011`, `C:\Users\Allan\ARL-backups\performance-stage-two-tests-20261011`.

## Clientes: paginação e pesquisa no servidor
A interface já estava convertida de `GET /clients?all=1` para requisições paginadas `GET /clients?q=...&sort=...&page=...&per_page=...`. Não reimplementar. Mantida compatibilidade `all=1` para consumidores antigos.

Teste de carga controlado: `tests/e2e/performance-clients-large-load-20261011.spec.ts` com 5.000 clientes sintéticos no SQLite temporário, aprovado.
- Lista antiga completa: 2.701.689 bytes, 795–1.177 ms na execução local.
- Lista paginada de 20: 12.353 bytes, 259 ms.
- Redução de transferência: **aproximadamente 219x**.
- Pesquisa por identificador único: 227 ms.
- Teste de regressão `tests/e2e/clients-management.spec.ts`: aprovado, inclusive frase exata, telefone, ordenação e controles visuais aprovados.

## Painel: endpoint leve da semana
O Painel só precisa de `data` e `total` de OS fechadas da semana, mas o endpoint `/orders?tab=closed_week` também calculava 2 resumos globais + 1 agregação de contadores de abas.

Mudança **somente local**:
- `resources/js/dashboard-page.tsx`: consulta `/orders?tab=closed_week&per_page=100&panel_light=1`.
- `app/Http/Controllers/ServiceOrderController.php`: se `tab=closed_week` e `panel_light=1`, devolve o mesmo paginador/OS/total sem executar as 3 consultas globais não utilizadas. Nas demais requisições mantém resposta anterior completa (ordens, filtros, totais).
- `tests/Feature/OrderTabCountersPerformanceTest.php`: comparação de SQL registrado, integridade da lista, total e metadados. **3 testes, 30 verificações aprovados** em ambiente isolado.
- `tests/e2e/performance-panel-light-20261011.spec.ts` + `tests/e2e/performance-stage-one.spec.ts` + `tests/e2e/clients-management.spec.ts`: **7/7 testes de navegador aprovados**.
- Lint/TypeScript/build e **50 testes frontend aprovados**.

## Backend PHP e diferenças de ambiente
A suíte `Feature` completa usando PHP Windows+SQLite em memória finalizou com **313 aprovados e 22 falhas**, todas relacionadas à extensão de imagem GD ausente no PHP Windows. Não tratar isso como aprovação de uma única execução.
Foi verificado que o PHP do DDEV contém GD e Imagick; em seguida os seis grupos afetados foram reexecutados no DDEV: **31/31 testes e 205 verificações aprovados**, incluindo todos os que dependem de GD, fotos, logos, assinatura e PDFs.
- Windows: `docs/PHP_SUITE_COMPLETA_20261011_LOG_LOCAL.txt`.
- DDEV: execução direcionada em SQLite em memória.
- Os cenários relevantes foram cobertos entre os dois ambientes; a suíte integral no DDEV ainda não foi concluída em uma única passagem devido à lentidão de IO em `/mnt/c`.

## Testes de cache de Clientes e Ordens
`tests/e2e/performance-stage-two.spec.ts` era anterior à paginação e interceptava `/clients?all=1`; os mocks foram atualizados para API paginada com filtros. A preparação da primeira busca aguarda o debounce antes de trocar a ordenação; o teste de refresh segura apenas a chamada que realmente corresponde à revalidação.
A execução completa de 10 casos foi iniciada; registrar resultado final após a conclusão.

## Próximas análises
- Medir renderização React e interação real clique → primeiro feedback, com Web e Mobile.
- Perfil de SQL no MySQL/MariaDB, PHP e caches/opcache, sem tocar produção sem autorização.
- Testar alteração de tela entre os dez módulos com perfis e volumes variados.
- Avaliar a diferença de IO entre projeto em `/mnt/c` e cópia no filesystem Linux WSL2.
- Completar regressão E2E ampla, revisão de segurança e preparação de pacote reproducível.
- Só publicar com backup remoto/restauração comprovada, validação humana, smoke test e consentimento expresso do proprietário.

## Atualização verificada — cache de navegação, 11/10/2026
A suíte `tests/e2e/performance-stage-two.spec.ts` foi adaptada para mocks paginados em vez da API legada `all=1` e **10/10 testes passaram (47,3 s)**. Cobre preservação de pesquisa, ordenação, paginação, cache/TTL, atualização após cadastro/edição/exclusão, rejeição de resposta atrasada e segurança na troca de usuário.
Nos testes legados o debounce podia não ter disparado antes da mudança de ordenação; agora a espera da resposta é explícita. Eram problemas na preparação da suíte, não justificativa para remover debounce do produto.
Lint e TypeScript foram novamente executados depois dessa atualização e passaram.
Arquivo de execução: `docs/PERFORMANCE_CACHE_PAGINADO_APROVACAO_20261011_LOG_LOCAL.txt`.

## Retomada após interrupção da conversa — Mobile
- Reconexionado ao DESKTOP-BCLK2QK; todos os arquivos anteriores preservados, nenhum Playwright pendurado no começo da retomada.
- `tests/e2e/mobile-client-modal-hit-test-20261011.spec.ts`: **1/1 aprovado**; janela de Novo Cliente tem botão "Salvar cliente" realmente tocável.
- `tests/e2e/mobile.spec.ts`, projeto `mobile-chromium`: primeira passagem **4/5 aprovados**; falha restante do cenário grande decorrente de expectativa antiga do menu `PDF's e Reaberturas OS`, agora substituído pelo botão `PDF's` no cabeçalho da ficha completa. Teste atualizado conforme UI aprovada, sem alterações no produto.
- Uma segunda execução mostrou que clicar num título atrás do menu de PDFs aberto não é ação válida; agora o teste toca área externa à janela.
- A terceira execução desse cenário mostrou que o botão do modal Novo Cliente pode ocupar a mesma altura da navegação fixa porque **o modal fica em primeiro plano e cobre a barra**; o clique real foi confirmado separado e a captura não mostrou obstrução. Ajustada a asserção: botões normais ficam acima da barra; botões no popup exigem teste de hit target, pois estão em outra camada.
- Reexecução do cenário completo para validar paginação de Clientes de dez por página no Mobile: `docs/REGRESSAO_MOBILE_TESTE_FICHA_R3_20261011_LOG_LOCAL.txt`, resultado ainda em andamento no momento desta nota.

**Ainda pendente:** suíte completa Mobile sem falhas, teste das faturas diretas do Gestor de Gastos, auditoria ampla de módulos e validação da implantação oficial com aprovação explícita.

## Resultados adicionais confirmados após reconexão
- `docs/MOBILE_CLIENTE_POPUP_20261011_LOG_LOCAL.txt`: **1/1 aprovado**; botão de salvar no popup de cliente realmente tocável.
- `docs/REGRESSAO_MOBILE_CHROMIUM_20261011_LOG_LOCAL.txt`: execução inicial **4/5 aprovados**; cenário restante foi modernizado para a UI da ficha de OS atual (botão `PDF's`), entrada de Clientes e paginação Mobile de 10 registros.
- `docs/REGRESSAO_MOBILE_TESTE_FICHA_FINAL_20261011_LOG_LOCAL.txt`: repetição do cenário remanescente **1/1 aprovado**. Verifica criação de OS, menu PDF, saída por toque externo e Escape, popup de cliente e paginação com scroll para o último cartão. Assim todos os 5 cenários do arquivo `mobile.spec.ts` foram cobertos por execuções aprovadas, embora em dois runs diferentes.
- `docs/REGRESSAO_GASTOS_FATURA_DIRETA_20261011_LOG_LOCAL.txt`: **2/2 aprovados**; fatura consolidada e fatura individual abrem diretamente em Gastos sem grids intermediários de instituição/tipo.
- `docs/REGRESSAO_DEZ_MENUS_20261011_LOG_LOCAL.txt`: **1/1 aprovado**, cobrindo 10 módulos. Tempo máximo de uma única solicitação HTTP no ambiente local: Painel 444 ms, Controle de Gastos 401 ms, demais 197–232 ms. Cada menu inclui espera intencional de 950 ms no teste, portanto `elapsedMs` perto de 1 segundo NÃO é a latência de clique/renderização.
- Causa real corrigida nesta rodada: a barra Mobile interceptava o clique de **Registrar entrada avulsa**. `resources/css/mobile-modal-nav-click-safety-20261011.css` limita o ajuste aos instantes em que um popup `.modal` está aberto; o teste `mobile-modal-nav-click-safety-20261011.spec.ts` passou e confirmou POST 201 e retorno da navegação após fechar popup.
- `tests/e2e/mobile-home.spec.ts`: 6/6 testes aprovados refletindo a home atual com cinco atalhos e ficha OS completa. `tests/e2e/mobile.spec.ts` ajustado à ficha/PDF atuais e paginação: não alterar componentes visuais por causa dos testes antigos.
- Publicação, Git commit/push, MySQL e arquivos privados oficiais **não foram tocados**.

### Próximas validações necessárias antes de release
- Medir clique→primeiro feedback/primeira renderização e long tasks via browser trace; a medição HTTP sozinha não demonstra 100% fluidez.
- Revisar consultas SQL de todos os módulos com índices e plano de execução no MariaDB de testes, comparar com o comportamento da KingHost só após autorização.
- Repetir suíte E2E ampla completa e PHP Feature em um mesmo ambiente com GD; homologação física Android/iPhone e conexão mais lenta; backup/restauração oficial autorizados e plano de rollback.
