# ARL Informática — Otimização da abertura do Pós-venda (17/10/2026)

## Histórico do problema
Proprietário relatou lentidão de aproximadamente 25–30 segundos na **primeira abertura do Pós-venda na versão ONLINE KingHost**, com somente 20–30 registros. Depois, excluiu os registros dessa lista online e não pode repetir a comparação com esses mesmos registros.

Não restaurar ou recolocar os registros apagados pelo usuário. Não copiar dados reais para testes.

## Diagnóstico de código
- Endpoint legado `GET /api/post-sales` chamava `PostSaleService::catchUp(false, now()->subDays(30))` sincronicamente **antes** de carregar a lista. Essa rotina verifica ciclos, ordens e notificações e pode bloquear a requisição por bastante tempo em hospedagem compartilhada.
- O React tinha paginação visual de 30 linhas, mas a API retornava **todos os registros**, filtrando e dividindo páginas no navegador.
- A rotina horária `post-sale:check` já consta em `routes/console.php`, mas é necessário confirmar que o cron/heartbeat da hospedagem realmente estão rodando após a publicação.

## Correções feitas SOMENTE na pasta de desenvolvimento
Projeto local: `C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica`.

1. `app/Http/Controllers/PostSaleController.php` — requests com `?page=...&per_page=30&q=...` seguem o caminho **SOMENTE LEITURA**, sem `catchUp`, notificações, transações de cadastro ou alterações. Consulta SQL com busca cliente/OS, contagem e paginação no banco, ordenação estável, máximo de 30 por requisição. Consultas às duas ações por ciclo feitas em lote; apresentação mantém os mesmos campos WhatsApp, elegibilidade e status. Endpoint sem parâmetros **permanece legado**, para compatibilidade e para preservar testes já existentes.
2. `resources/js/post-sale-page.tsx` — tela usa página/busca no backend, debounce 250ms na pesquisa, ignora respostas atrasadas, mantém 30 linhas, expandir detalhes, confirmação do WhatsApp, seleção múltipla entre páginas, exclusão em lote, mensagens de erro/repetir e paginação com total verdadeiro. Nenhuma mudança no CSS/identidade do layout.
3. `tests/Feature/PostSaleFastListTest.php` — cenários de 30, 65, 300, 3.000 registros fictícios, busca, tamanho máximo e garantia de **nenhuma criação de ciclos ou notificações ao listar**.
4. `tests/e2e/post-sale-pagination-30.spec.ts` — os mocks foram adaptados ao novo JSON paginado, preservando os testes existentes de seleção e exclusão entre páginas; a execução visual ainda não foi validada por completo e deve ser repetida em QA apropriado.

## Testes executados
- PHP syntax check do Controller: PASS.
- TypeScript `npm run typecheck`: PASS.
- ESLint direcionado ao componente Pós-venda: PASS.
- Frontend unit tests: **66 PASS / 0 FAIL**.
- Regressão backend `StageSixTest`: **13 PASS / 140 assertions**.
- Novo backend `PostSaleFastListTest`: **4 PASS / 39 assertions**.
- Total dos testes PHP focados: **17 PASS / 179 assertions**.
- Benchmark sintético em PHP + SQLite em memória: consulta à primeira página de **30 registros entre 3.000** usando quatro SELECTs relevantes em aproximadamente **8,04 milissegundos** na repetição mais recente. É medição local, **NÃO** é medição do servidor KingHost e **NÃO** permite prometer tempo final online.
- Build Vite em pasta isolada: PASS (sem substituir `public/build` definitivamente).
- Playwright E2E: primeira tentativa executou bundle local antigo, por isso falhou. Nova tentativa com build isolada foi interrompida durante a inicialização do servidor de testes, SEM validação visual conclusiva. O build original de `public/build` foi **restaurado com sucesso**. **PENDÊNCIA: refazer E2E na homologação antes de publicar**.

## Segurança
- **Banco oficial/KingHost não acessado, apagado, restaurado ou alterado**.
- Sem migrações, sem publicação, sem mexer no `public/build` oficial de forma permanente.
- Backups dos fontes anteriores e logs de QA:
  `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\OTIMIZACAO-POSTVENDA-2026-10-17-ANTES`.
- Nenhuma alteração às regras de: 7 dias para liberação, ciclo de 60 dias, exclusão com bloqueio de 35 dias, confirmações WhatsApp, histórico e trilha de auditoria.
- As mudanças não foram comitadas. A tela local usa fonte nova, mas para visualizá-la no navegador será preciso uma build/serviço de desenvolvimento apropriado; a versão ONLINE ainda está antiga.

## Gate obrigatório para hospedagem / KingHost
**Antes de publicar**, verificar que o cron/heartbeat está ativo. O caminho rápido só lê ciclos existentes; a rotina horária `post-sale:check` é responsável pela recuperação e notificações de ciclos elegíveis. Se o cron não roda, novas ordens podem não aparecer no Pós-venda até a sincronização. Não publicar sem validar essa condição ou oferecer mecanismo alternativo seguro de manutenção.

1. E2E homologado com bundle atualizado, preferencialmente com 30, 300 e 3.000 registros fictícios.
2. Confirmar cron e horário de criação de ciclo após OS concluída.
3. Com autorização específica, publicar alterações e comparar GET `/api/post-sales?page=1&per_page=30` na rede KingHost com primeira abertura, reabertura e pesquisa.
4. Validar integridade das mensagens, status, exclusão individual/em lote e apresentação mobile.
5. Se a lentidão persistir, recolher tempos de backend/DB/rede sem expor dados do cliente.

**STATUS:** implementação local e testes backend concluídos; QA visual/cron online/deploy **PENDENTES**.
