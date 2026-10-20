# ARL — banco fictício da prévia + docks compactos — 20/10/2026

## Pedido e autorização
Proprietário solicitou dados fictícios para Clientes, Fornecedores, Produtos, Serviços e Controle de Gastos (instituições, faturas), e correção de ambos os menus móveis.

## Destino autorizado
- Endereço local EXCLUSIVO: http://127.0.0.1:8012
- Base SQLite DEMO persistente: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\ARL-PREVIA-DADOS-20261019\preview-persistente.sqlite`.
- O servidor ligado à porta 8012 está em APP_ENV=testing, DB_CONNECTION=sqlite com esse caminho e storage de demonstração. Não é o MySQL da KingHost.
- Antes de gravar, conferido `PRAGMA integrity_check=ok`, login e2e.master e contadores da ARL.
- Backup transacional via API SQLite backup para `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 09-10 - DADOS-DEMO-GASTOS-DOCK\backup-preview-ANTES-financas.sqlite`. Hash SHA256 `e1cc0d7f2cabe50485d1e73e1fab5438241e7e55e61398795986fa80f5e36fa2`, SQLite integrity_check=ok.

## Registros encontrados e preservados
- 20 clientes completos fictícios (DEMO)
- 20 fornecedores completos fictícios
- 20 produtos fictícios em service_catalog
- 20 serviços fictícios em service_catalog
- 20 ordens fictícias abertas e 20 orçamentos
- 1 serviço de catálogo adicional original do teste
- 2 titulares financeiros Allan/Carol no CG; 1 veículo de teste existente preservado

## Criados nesta rodada no Controle de Gastos (API oficial)
- 7 instituições fictícias com nome começando `DEMO FIN -`.
- 7 categorias de despesa fictícias `DEMO FIN -`.
- 16 dívidas/faturas fictícias `DEMO FIN 20261020 -`.
- 51 parcelas geradas pelo serviço de domínio, com mês inicial 10/2026 e várias prestações futuras.
- Categorias: cartão, moradia, financiamento, empréstimo, veículo, compras e serviços.
- Titularidades: 5 dívidas exclusivas de Allan, 5 exclusivas de Carol, 6 do casal, com divisão padrão 50/50; pagamentos ainda em aberto para testar os fluxos.
- Exemplos: cartão de crédito parcelado, aluguel, internet, empréstimo, financiamento de automóvel, manutenção, combustível, compras e seguros.
- API HTTP autenticada da prévia, sem inserts SQL diretos; request_key estável, e script repetível verificando nomes para não duplicar.
- Resumo de 10/2026 antes de qualquer pagamento: R$ 4.715,50, de acordo com as parcelas de outubro.
- Integrity_check final OK, foreign_key_check 0, 20/20/20/20 de cadastros da ARL preservados.

## Menu inferior ARL e Gastos
- Alterados localmente os imports de CSS de `resources/js/main.tsx` e `resources/js/expense-control-page.tsx`.
- Novo arquivo de estilos `resources/css/arl-gastos-docks-unificados-20261020.css` isolado por classes mobile, sem alterar navegação, pagamentos, dados ou desktop.
- Medição com navegador real, viewport 390×844: **ambas barras têm 57 px**; botões de 47 px, ícones laterais de 26 px; círculo central de 30×30 px; distância ícone→legenda central **5 px**. A legenda não encosta mais no botão.
- Capturas: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 09-10 - DADOS-DEMO-GASTOS-DOCK\BEFORE-ARL.png`, `BEFORE-GASTOS.png`, `AFTER-ARL.png`, `AFTER-GASTOS.png`.
- TypeScript, lint e build PASS. `build-final.log` confirma CSS final em bundle.
- Nenhuma edição no banco oficial, nenhuma migração, nenhuma destruição ou sobrescrita dos 20 cadastros da ARL.

## Validação e continuidade
- Geradores e logs ficam exclusivamente na pasta de backup externa: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 20-10-26 - 09-10 - DADOS-DEMO-GASTOS-DOCK`.
- Testes Playwright direcionados em `e2e-docks.log`.
- Conferir na interface: ARL Painel, Clientes, + Abrir OS, Gastos, Menu; Gastos Resumo, Instituições, Adicionar, Carros, Menu; faturas e titulares.
- CI completa do GitHub ainda NÃO considerada verde. Git local com centenas de alterações preexistentes; não usar git add ., clean, reset --hard.
- Não houve commit, push nem publicação/ação na KingHost.
