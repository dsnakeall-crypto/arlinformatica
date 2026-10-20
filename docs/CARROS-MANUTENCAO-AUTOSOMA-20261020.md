# Ajustes Manutenção — Controle de Gastos Web/Mobile — 20/10/2026

## Autorização e escopo
O proprietário autorizou executar diretamente pelo Desktop Commander, sem Cloud/Codex.
Novas exigências para o formulário de Manutenção, aplicadas nos componentes compartilhados Web e Mobile:
- Próxima revisão por KM continua editável, sem necessidade de estimar data.
- Data da próxima revisão continua opcional e passa a gerar um lembrete VISUAL dentro da página Carros quando estiver até 30 dias de vencer ou vencida. **Não é uma notificação push nem uma tarefa em segundo plano**.
- Total manual opcional, checkbox DESLIGADO inicialmente; se desativado, somar somente os itens confirmados.
- Itens entram em modo fixo (descrição + valor) com lápis para editar; botão de confirmar item, e exclusão apenas enquanto edita.
- Campos “O que foi feito” e “O que ficar atento” unidos em um único campo opcional, depois dos itens cobrados. O banco mantém work_notes; registros históricos antigos com attention_notes seguem acessíveis no histórico.
- Lavagem, divisão Allan/Carol/Casal, instituição, tipo de dívida, operações financeiras e pagamentos permanecem intactos.

## Segurança e implementação
Branch local release/integracao-completa-20261018; HEAD inicial 8903365.
Arquivos alterados: resources/js/expense-vehicles-page.tsx, resources/css/expense-vehicles-20261020.css, app/Http/Controllers/ExpenseVehiclesController.php (retira obrigatoriedade de observação da manutenção), tests/Feature/ExpenseVehiclesTest.php e tests/e2e/expense-vehicles-20261020.spec.ts.
Não foram criadas migrations; esquema já aceitava work_notes e next_due_on como nullable.
O backend continua validando que o total não pode ser menor que a soma dos itens.
A validação do formulário impede salvar uma linha em edição parcial.
Backup dos arquivos originais (incluindo hash SHA256 e status Git): C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - MANUTENCAO-CARROS-AUTOSOMA.
Nenhum banco oficial, arquivo de cliente, foto ou configuração foi alterado nesta rodada.

## Evidências e resultado de testes
- npm run typecheck: PASS
- npm run lint: PASS
- npm run build: PASS
- php artisan test --filter=ExpenseVehiclesTest: 5 PASS, 55 assertions
- Playwright Web/Mobile: 3 PASS na suíte original, mais 1 PASS mobile 390px de soma automática/lembrete.
- Captura real após renderização e interação: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - MANUTENCAO-CARROS-AUTOSOMA\FORM-MOBILE-390.png
- A navegação Web e Mobile compartilha a mesma tela React, portanto os controles de manutenção são únicos e responsivos.

## Limites conhecidos / próximos gates
- A data opcional aciona apenas aviso visível ao abrir a página Carros; ainda não há push/email nem verificador periódico em segundo plano.
- Para próximas revisões só por KM, não se inventa estimativa de data; o app mostra os números salvos.
- Sem commit, push, instalação no servidor ou alteração na KingHost. As CIs integrais ainda precisam ser verificadas.
- Antes de qualquer deploy, fazer backup integral do servidor oficial e testar migrations em banco separado.
