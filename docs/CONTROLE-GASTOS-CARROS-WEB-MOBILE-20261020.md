# Controle de Gastos: Carros no Web e Mobile — checkpoint 20/10/2026

## Pedido aprovado
- Compactar botões grandes de Instituições, Tipos de dívida e respectivos popups.
- Mobile: barra inferior Resumo | Instituições | Adicionar | Carros | Menu (substitui Projeção e Gastos, que passam para gaveta).
- Menu mobile abre pela direita e contém Gastos, Pagamentos, Projeção, Quitadas, Histórico e Ajustes.
- Web: aba Carros adicionada sem alterar o layout dos outros módulos.
- Carros: cadastro de veículos; lavagens com data/local/valor/responsável; manutenções com data, local, KM, próxima revisão por data e/ou KM, descrição livre, alertas e itens livres com "+" e valores.
- Responsável obrigatório Allan/Carol/Casal. Casal herda divisão percentual ATUAL de cg_people (sem regra nova de divisão).
- Despesa vira dívida única no livro existente: mesma instituição/tipo escolhidos, mesmas parcelas, contas a pagar e ações de pagamento; histórico do carro fica independente dos pagamentos.

## Segurança e banco
- Migrations ADITIVAS: database/migrations/2026_10_20_000000_create_expense_vehicles.php
  - cg_vehicles, cg_vehicle_events, cg_vehicle_event_items
  - FK para cg_debts e cg_institutions/cg_types, sem alteração destrutiva de tabelas existentes
  - request_key + payload_hash protegem contra duplicação após repetição da requisição
- Backend: app/Http/Controllers/ExpenseVehiclesController.php, três rotas protegidas pelo mesmo middleware auth + expense.access.
- Método de criação de dívida: `App\Services\ExpenseControl::createDebt`, já validado e usado pelo sistema; inserção de evento/dívida/itens transacional. Se falhar, nenhum registro parcial permanece.
- Histórico separado da quitação; ao pagar mantém datas, km, peças e próxima revisão, inclusive quando dívida vinculada fica cancelada.
- Paginação de 30 históricos e botão Ver mais; sem truncar silenciosamente anos anteriores.
- **PRODUÇÃO KINGHOST NÃO TOCADA. MIGRATION NÃO FOI APLICADA NO BANCO OFICIAL.**
- Banco temporário de testes do PHPUnit em memória SQLite; Playwright em SQLite descartável isolado.
- Banco persistente de prévia local `Backups/ARL-PREVIA-DADOS-20261019/preview-persistente.sqlite`: migration aplicada com APP_ENV=testing e DB_CONNECTION=sqlite após verificações de target. Backup pré-migration `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 08-30 - CARROS-E-MENU-GASTOS\preview-antes-carros.sqlite` criado por SQLite VACUUM INTO (integrity_check ok, SHA256 registrado).

## Frontend
- resources/js/expense-vehicles-page.tsx (novo; lazy loading)
- resources/css/expense-vehicles-20261020.css (novo)
- resources/js/expense-control-page.tsx: tab Web Carros; dock Mobile Carros + Menu; drawer por direita; preservadas as outras funções financeiras e a barra compacta.
- resources/css/expense-compact-menus-20261020.css: popup tipos de dívida, cabeçalhos/ação cadastro de instituições menores, ocultação do antigo nav duplicado somente no Mobile, nova gaveta direita responsiva.
- tests/e2e/helpers.ts: atualizado para navegação mobile pela nova gaveta.
- tests/e2e/expense-control-mobile.spec.ts: apenas expectativas legadas dos ícones ARL atualizadas ao dock Premium já aprovado.

## Testes e capturas
- `php artisan test tests/Feature/ExpenseVehiclesTest.php`: 4 PASS, 45 assertions. Inclui divisão 60/40, manutenção/itens, lavagem Carol, pagamento e histórico, request_key repetida, validação inválida, RBAC.
- `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- `npx playwright test tests/e2e/expense-vehicles-20261020.spec.ts --project=desktop-chromium`: 2 PASS/0 FAIL, abrangendo navegação mobile e gravação real Web.
- `expense-responsive.spec.ts` E2E direcionado 1 PASS. Suite `expense-control-mobile.spec.ts` teve duas expectativas antigas do dock ARL; testes foram corrigidos e estão sendo repetidos antes da entrega.
- Imagens locais `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 08-30 - CARROS-E-MENU-GASTOS\CARROS-MOBILE.png` e `CARROS-WEB.png` são do navegador real.
- E2E novos: tests/e2e/expense-vehicles-20261020.spec.ts; PHP novos: tests/Feature/ExpenseVehiclesTest.php.

## Backups e Git
- Backup antes de qualquer edição: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 08-30 - CARROS-E-MENU-GASTOS
- Contém arquivos anteriores, git status, diff e hashes SHA256.
- Branch release/integracao-completa-20261018, HEAD inicial 8903365, 412 alterações locais preexistentes.
- Não houve git add ., clean, reset, commit, push ou publicação.
- Deixar `CHECKLIST_FINAL.md` atualizado.
- Regressão E2E integral e GitHub Actions ainda precisam ser realizados e validados antes de qualquer deploy; servidor oficial requer autorização explícita e backup previamente verificado.

## Restrições remanescentes
- Registros de veículo são historicamente preservados; esta versão não oferece exclusão de manutenção vinculada, para evitar apagar dados financeiros. Edição/estorno deve usar as rotinas financeiras já existentes e futura regra de correção aprovada.
- Se faltarem instituições/tipos ativos, o formulário orienta criar os cadastros no módulo existente, sem criar entidades financeiras automaticamente.
- Nenhum dado real do servidor oficial foi copiado para a prévia.
