# ARL Informática — Relatório 15/10/2026

**Estado:** alterações locais realizadas, aguardando aprovação visual. Produção intocada.

## Alterações
1. Pagamento Rápido WEB: textos alinhados à esquerda, valores vermelhos à direita, grid responsivo, 15px de margem na linha e cifrão 3D preto/dourado de 33px. Sem alterar pagamentos nem backend.
2. Histórico do Cliente WEB: cabeçalho, dados e cartões de OS com fundo perolado, bordas douradas, sombras e botão Ver escuro. PDF e histórico reais preservados.
3. Painel WEB: texto das linhas das tabelas inferiores ajustado de 13px para 11,6667px, igual às legendas dos quatro cards superiores. Títulos e ícones intocados.

## Arquivos
- resources/css/arl-correcao-global-popups-settings-20261015.css
- resources/css/clients-history-gold-20261015.css (novo)
- resources/js/clients-page.tsx (somente import CSS)
- resources/css/dashboard-reference-gold-20261014.css

## Validação
Build PASS; lint PASS; typecheck PASS; unitários 61/61 PASS; git diff --check PASS.
Playwright: Painel 11,6667px em ambas as regiões; Histórico com 2 OS e PDF em 1366/960/760px, sem overflow.
Pagamento Rápido abriu para Allan e Carol e Cancelar funcionou. Ambos sem dívidas pendentes no mês local 10/2026: não foi possível testar linhas com dívidas reais.
Teste visual temporário somente no DOM, com nome extenso e valor grande, PASS nas larguras 1672/1366/960/760/380. Este teste NÃO gravou dados.
Logs e capturas de QA: %LOCALAPPDATA%/ARL-Informatica-Dev, prefixo qa-20261015.
Desempenho frio/quente e regressão visual integral de Clean/Mobile não foram medidos nesta rodada.

## Backups SHA-256 antes de editar
- 01 - 15-10-26 - 00-53 - PAGAMENTO-RAPIDO-WEB
- 01 - 15-10-26 - 00-54 - HISTORICO-CLIENTE
- 01 - 15-10-26 - 00-54 - PAINEL-FONTE

Todos ficam em C:/Users/Allan/OneDrive/Programacao APP/App Arl Informatica/Backups.
Nenhum pagamento, alteração de banco, publicação, merge ou limpeza Git.
**Pendências:** conferência visual do proprietário e teste do Pagamento Rápido com dívidas reais sem confirmar o pagamento. Status: EM AJUSTES.

## Adendo — botão Voltar do Histórico do Cliente (15/10/2026)
Por autorização do proprietário, o botão superior do Histórico do Cliente no WEB Original foi igualado visualmente ao botão Voltar da tela da OS: texto `← Voltar`, fundo branco/bege, borda dourada #f2d8a8, raio 999px, sombra suave, padding 9px 16px e cor #322514. Atributo aria-label preserva o destino real (`Voltar aos clientes` ou `Voltar para a OS`), mantendo o mesmo onClose. A apresentação anterior com rótulo completo foi mantida fora do WEB Original (Mobile/Clean).
Arquivos alterados apenas: `resources/css/clients-history-gold-20261015.css` e `resources/js/clients-page.tsx`. Backup prévio SHA-256: `Backups/02 - 15-10-26 - 01-11 - BOTAO-VOLTAR-HISTORICO`.
Testes: `npm run build`, `npm run lint`, `npm run typecheck`, `git diff --check`: PASS. Playwright desktop Original nas larguras 1672, 960 e 760px: dimensões 92,53 × 40px, aparência esperada, sem overflow e retorno efetivo à listagem de clientes; screenshot em `%LOCALAPPDATA%/ARL-Informatica-Dev/qa-client-history-back-reference-1672.png`. Não houve alteração de banco, serviço, servidor nem deploy. Segue aguardando conferência visual do proprietário.
