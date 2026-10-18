# Web/PC Clean Premium — acabamento inspirado na referência de 10/10/2026

## Objetivo
Aplicar ao **tema Clean do Web/PC**, sem alterar a estrutura desktop, a identidade da imagem aprovada pelo proprietário: fundo branco-azulado com rosa suave, sidebar branca/translúcida, seleção vermelha/rosa, botões 3D, painéis claros flutuantes, tabelas com separadores discretos e hierarquia tipográfica limpa.

## Arquivos desta execução
- `resources/css/web-clean-reference-20261010.css` (novo): camada visual limitada a `html[data-layout="desktop"][data-arl-appearance="clean"]` + `.shell.layout-desktop`. Os ajustes na área central da ARL excluem explicitamente `main[data-arl-expense-control-react="1"]`.
- `resources/js/main.tsx`: somente a linha de importação da folha de estilos, ao final das importações CSS existentes.
- `tests/e2e/web-clean-reference-20261010.spec.ts` (novo): confere o acabamento Clean, nove módulos ARL, ausência de overflow na largura desktop, tema Original intocado e mobile sem regressão.

## Preservações obrigatórias
- Web Original: visual e estrutura existentes continuam. O arquivo novo não se aplica em `data-arl-appearance="original"`.
- Mobile Clean: não recebeu estilos novos, dado que o arquivo novo exige `data-layout="desktop"`.
- Controle de Gastos: nenhum componente, regra, dado ou CSS do módulo foi editado. A área interna do módulo foi excluída dos seletores de acabamento. A barra da ARL Web fica sujeita à identidade da própria ARL.
- Não alterar banco de uso, .env, perfis, rotas, cálculos, serviços nem documentos históricos.
- Não publicar, não fazer push, não criar commits nem resetar Git.
- Preferência existente de fixar/recolher o menu continua funcional (no teste foi fixada somente no banco SQLite descartável).

## Backup anterior à mudança
`C:\Users\Allan\ARL-backups\web-clean-reference-20261009-231417`
Inclui cópia dos dois arquivos originais relevantes, SHA-256, patch de alterações existentes, lista de untracked, status do Git e histórico em `history.bundle` validado por `git bundle verify`.

## Validações
- DDEV: `npm run lint`, `npm run typecheck`, `npm run build` e `npm run test:unit` executados e aprovados (46/46 testes unitários).
- Playwright Chromium + PHP/SQLite **isolado no Windows**, sem usar o banco real: `3 passed` (26.5s), verificou Web Clean, Web Original e mobile.
- Telas visitadas no Web Clean pelo teste: Painel, Ordens, Clientes, Serviços, Produtos, Fornecedores, Financeiro, Pós-Venda e Configurações.
- Screenshots locais em `output/web-clean-reference-20261010`: `web-clean-ordens.png`, `web-clean-clientes.png`, `web-clean-financeiro.png`, `web-clean-painel.png`.
- A base de testes não contém OS reais; capturas automáticas podem registrar carregamento ou tabelas sem linhas. A homologação visual final com os dados de produção deve ser feita pelo proprietário, somente leitura.

## Pendências externas à rodada
- Homologação manual de tela completa, modais e resoluções usuais do PC.
- A regressão anterior de navegação do Controle de Gastos Web/PC permanece separada para auditoria; não houve autorização para alterar o módulo aprovado.
- A logo configurada no ambiente de teste era fallback; em produção manter a marca oficial já cadastrada.
