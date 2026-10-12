# Correções finais antes da publicação — 12/10/2026
Base aprovada eec107c; trabalho exclusivamente na cópia isolada, branch codex/oito-melhorias-20261012. Sem SSH/KingHost/SQL oficial/migration/schema/deploy.

- Indicador mensal usa saldo pendente; originais/pagamentos/histórico permanecem disponíveis.
- Faturas quitadas visíveis a zero, estado parcial/aberto/quitado e agrupamento por instituição + modalidade.
- Pop-up com quatro totais exclusivos calculados no backend; três ações reutilizam o serviço, transações, auditoria, autorização, CSRF e idempotência existentes. Scope obrigatório nas rotas novas, categoria/parte validadas no serviço e vinculadas ao hash da prévia.
- Quatro PDFs pendentes/zerados reutilizam jsPDF e download local; categorias exclusivas e três seções coloridas no geral, Total Fatura uma vez. Conferidos texto, somas, PDFs reais baixados e cinco renderizações.
- Resumo, detalhes de extrato/PDF e listas/prévias de pagamento rápido projetam recorrências pelo gerador existente, sem gravar parcelas. Mês recorrente ainda não registrado materializa somente na transação do pagamento confirmado. Cartões inferiores continuam capazes de pagar esse mês; leituras/prévias antigas com vencimento alterado preservadas. Fluxos legados de Gastos/Projeção não foram redesenhados.
- Correção apenas em helpers de teste: imports Kernel após uso estavam impedindo executar a prova de concorrência após o Pint anterior. Imports movidos antes do bootstrap; não alterado o aplicativo por esse problema.

Validações atuais: 73 PHP/1135 assertions SQLite; 61 PHP/869 assertions MySQL isolado; concorrência ledger 201/422, crédito único de 5000 sem overpayment; 57 unitários (6 PDF); lint/types/build e Pint PHP 8.2 Linux 234 arquivos; seis cenários E2E finais aprovados. Regressão inicial 32/35, falhas de expectativas/fixture e estilo diagnosticadas; nove cenários adicionais mobile/quick aprovados e dois novos aprovados após correção restrita da cor. Logs integrais CORRECOES*.log preservados.
Backup completo existente reutilizado. Proteção incremental de 13 arquivos antes da edição em Backups/oito-melhorias-base-20261012-012927/correcoes-finais-arquivos, hashes comparados; dois helpers adicionados à proteção incremental. Nenhum novo backup completo ou dump SQL.

Pendente: nova instrução do proprietário (cifrão entre texto e valor) em pop-up e cartões inferiores; validar posicionamento/clicks, commit final/push autorizado, CI completa verde e novo pacote/manifesto. Não abrir SSH nem publicar; rollback oficial continua e90. Não usar ZIP eec107c para estas correções.


## Ajuste final dos cifrões solicitado pelo proprietário
A instrução mais recente substitui o pedido anterior de cifrão antes do título: no pop-up e nos cartões inferiores, o botão agora ocupa a coluna central entre texto e valor. Alteração somente de marcação/CSS; handlers, valores, filtros, pagamento e PDF preservados.
Dois E2E desktop/mobile aprovados (54,6s), incluindo centro geométrico com tolerância de 1px, cifrões verdes novos com área 44px, três operações financeiras, partes preservadas, cinco PDFs baixados por cenário e mês quitado. Três regressões de pagamento rápido passaram após mudança de marcação; 57 unitários, lint/types/build aprovados. Captura revisada: output/correcoes-finais/mobile/popup.png.
Próxima etapa: enviar o commit final da mesma branch ao GitHub, aguardar CI completa verde e gerar/validar pacote de fonte correspondente. Nenhum SSH ou publicação. Candidatos eec107c e anteriores não servem para estas correções.


## Ajuste de regressões legadas após CI 310831d
CI 38265352728: backend SQLite/MySQL 395 testes e 7.356 assertions aprovados em cada driver, frontend aprovado; E2E 267 aprovados/4 falhas exclusivamente nas expectativas antigas de original mensal, texto monetário isolado e popup PDF antigo. Evidência CORRECOES_CI_310_E2E.json.
Atualizadas somente três fixtures/testes: indicador mensal confere saldo pendente e também valida originais históricos pelo backend; fatura confere valor exato no elemento numérico e estado em aberto, preservando métricas de alinhamento/overflow/altura; teste mobile mantém os três PDFs legados e acrescenta download geral pelo novo popup mensal. Nove E2E direcionados aprovados em 1,2 minuto, lint aprovado. Nenhum runtime, regra financeira ou teste desabilitado. Fontes/ZIP anteriores preservados; aguardar a nova CI e o pacote vinculado à fonte seguinte.
