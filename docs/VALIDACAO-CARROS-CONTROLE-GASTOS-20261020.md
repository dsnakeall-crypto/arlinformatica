# Controle de Gastos — Carros Web/Mobile — validação 20/10/2026

## Situação encontrada
Ao iniciar a execução solicitada, os arquivos de implementação de Carros já existiam no workspace local, datados de 20/10/2026, mas com alterações não commitadas. Para não sobrescrever trabalho existente, foram inspecionados e validados.

## Funcionalidades constatadas no código
- Web: nova aba Carros; Mobile: dock Resumo / Instituições / Adicionar / Carros / Menu, menu lateral acessa as demais abas (incluindo Projeção e Gastos).
- Cadastro de veículos com nome/placa/observações; registro de lavagem e manutenção.
- Manutenção guarda data/local, KM atual, próxima data/KM, descrição livre do realizado e observações de atenção.
- Lista livre de itens/peças e seus valores; valor total; instituição e tipo de dívida existentes.
- Responsabilidade one/two/shared aplica regras percentuais atuais de Allan/Carol/Casal; despesa criada via ExpenseControl::createDebt em transação, com request_key idempotente.
- Histórico de manutenção fica em tabelas próprias mesmo após pagamento.
- Acesso restrito pelo middleware expense.access.
- Ajustes compactos de botões/popups e tema CSS no workspace.

## Backups e evidências
Cópia antes da validação e SHA256: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 07-35 - CARROS-VALIDACAO.
Typecheck 0, lint 0, build 0.
`php artisan test --filter=ExpenseVehiclesTest`: 4 PASS, 45 assertions, incluindo 1 dívida, repetição idempotente, manutenção, pagamento e permissão.
`npx playwright test tests/e2e/expense-vehicles-20261020.spec.ts --project=desktop-chromium`: 2 PASS (testes de navegação mobile e cadastro Web com integração financeira).
Nenhuma migração executada em banco oficial.

## Gates ainda pendentes
- CI completa do GitHub NÃO comprovadamente verde.
- Migração e implantação na KingHost NÃO executadas.
- Antes de produção: backup integral de banco, fotos e arquivos, validar migrations em cópia isolada, conferir split financeiro e duplicação.
- Aguardar validação visual do proprietário no teste local e autorização separada para publicar.
