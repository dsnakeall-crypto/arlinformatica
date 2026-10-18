# Restauração Web ARL + relatório detalhado do Controle de Gastos — 09/10/2026

## Prioridade interrompida pelo proprietário
O proprietário interrompeu a implantação do PDF detalhado para exigir que a **versão Web/PC** preserve o layout principal existente da ARL. Ao selecionar **Controle de Gasto**, deve aparecer no painel à direita, mantendo menu ARL à esquerda, cabeçalho e demais seções. **Somente o mobile** deve abrir miniapp financeiro separado, com sua barra 3D própria. O layout do painel ARL Web e os cards já existentes NÃO foram refeitos nem tiveram CSS alterado neste ajuste.

### Código web
- `resources/js/main.tsx`: alterado `expenseWorkspace` de `expenseOnly || page === 'expense-control'` para `expenseOnly || (mobileLayout && page === 'expense-control')`. Exceção deliberada: a conta exclusiva com função **Controle de Gasto** nunca recebe menus ARL aos quais não tem acesso.
- `resources/js/expense-control-page.tsx`: dentro da ARL Web, não renderiza barra duplicada **Voltar para ARL / Ajustes** no topo do Controle de Gastos; mobile e conta dedicada preservam navegação independente.
- Desktop sidebar usa a preferência de menu (fixado ou compacto) que já existia, sem redefinir configurações do usuário.
- Capturas Playwright produzidas em `output/web-integrado-20261009/dashboard-web.png` e `controle-gastos-web-integrado.png`.
- Verificar fidelidade visual exata à imagem enviada pelo proprietário, pois a aprovação subjetiva é dele.

### Relatório PDF detalhado (pedido em andamento antes da interrupção)
- `routes/api.php`: nova rota `GET /api/expense-control/statement-details?month=YYYY-MM`, sob proteção existente `expense.access`.
- `ExpenseControlController::statementDetails()`: somente consulta a parcelas e cotas existentes, reutilizando `ExpenseControl::figures`, sem mexer em dados e sem `ensureMonth` ou criação de registros. Responde parcelas incluindo quitadas com instituição, tipo, nome, vencimento, posição da parcela, original/crédito/saldo por responsável e total do casal. Cache-Control private,no-store.
- `resources/js/expense-statement-data.ts`: agrupa linhas por instituição > fatura de cartão ou contrato > cada compra/parcela, com divisão exata em centavos. Responsável 1 e 2 incluem a dívida pessoal e apenas sua cota dos gastos do casal; Casal apenas despesas compartilhadas; mês total sem duplicar a soma do casal. Créditos aplicados ao titular da cota, independente de quem pagou. Linhas quitadas continuam no relatório.
- `resources/js/expense-statement-pdf.ts`: documento em A4, título, período, pessoa, 3 totais, composição pessoal/casal, subtotais de cada instituição, fatura e parcelas com valores originais, pagos e faltantes; paginação e rodapé. Gerado por jsPDF **exclusivamente no navegador**. Nunca salva PDF no banco, uploads nem servidor. Verifica reconciliação com os indicadores antes de permitir download.
- `resources/js/expense-control-page.tsx`: ao aceitar modal dos cards mês/pessoa 1/pessoa 2/casal, consulta dados somente-leitura e baixa PDF, rejeitando divergências.

### Backup antes de alterações
- Backup de projeto anterior ao trabalho no relatório: `C:\Users\Allan\ARL-backups\pdf-detalhado-gastos-20261009-201756` (Git bundle e cópias físicas de arquivos não commitados).
- Backup adicional antes da restauração Web: `C:\Users\Allan\ARL-backups\restaurar-web-integrado-20261009-202703` (Git bundle, cópias de main.tsx, expense-control-page.tsx, arl-mobile-reform.css e estado Git).
- Não houve alteração no MariaDB real do DDEV, nem acesso de escrita na KingHost, nem commit/push.

### Testes com DB SQLite isolado, não BD real
- [OK] TypeScript/Vite build e ESLint.
- [OK] 46 testes frontend, 0 falhas. Novos testes de alocação por pessoa + banco + parcelas + mês + Casal.
- [OK] 7 testes PHP / 206 asserts da suíte financeira: inclusive GET detalhado verificando centavos, fatura quitada e ausência de escrita.
- [OK] 6 testes E2E Playwright em sequência: Web ARL integrado e menu esquerdo, mobile independente, barra 3D Gastos, 4 downloads de PDF verificados, popup do próximo vencimento, cadastro de tipos e abreviação de OS.
- [OK] Captura de dashboard Web e Gestor de Gastos integrado em desktop.
- [PENDENTE] Aprovação visual pelo proprietário da fidelidade à imagem Web de referência.
- [PENDENTE] Verificação manual de visual/impressão de PDF com dados reais de muitas faturas, nomes compridos e páginas múltiplas (somente leitura).
- [PENDENTE] Suite E2E completa de regressão, sem publicar em produção.

## Guardrails para auditoria Claude/Codex
Não unificar Web e Mobile em miniapp independente; não esconder a sidebar da ARL na versão Web; não alterar home desktop aprovada; não publicar sem autorização; não usar `migrate:fresh`/testes destrutivos no DDEV importado. Confirmar que a função Conta exclusiva Controle de Gastos nunca vê menus administrativos da ARL.
