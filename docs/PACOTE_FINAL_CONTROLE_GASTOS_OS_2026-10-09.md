# Pacote final — Controle de Gastos + Ordens de Serviço (09/10/2026)

**Status:** Implementado e validado no projeto local `C:\laragon\www\arlinformatica`; **sem commit, sem deploy KingHost, sem atualização de banco**. Trabalho executado diretamente pelo ChatGPT para auditoria posterior pelo Claude/Codex.

## Fonte: pedidos do proprietário nesta conversa
### Controle de Gastos mobile
1. Barra inferior no **mesmo padrão visual 3D/Clean da ARL** aprovado em imagem anterior: cinco botões circulares, base flutuante arredondada, + central vermelho e maior. Ordem funcional final: **Resumo / Instituições / Adicionar / Projeção / Gastos**. A última referência visual (barra ARL) prevalece sobre o pedido anterior de retirar toda a base da barra. Navegação original e permissões mantidas.
2. Seletor de mês: tirar moldura/container branco externo, preservar apenas as setas e botão de mês independentes. Fundo geral da área dos cards transparente; sem camada cinza/branca extra por trás das superfícies.
3. Indicador **Total a pagar no mês**: exibir somente título e valor bruto/original em números (sem rótulo “original”, sem linha repetitiva). Allan, Carol, Casal: total e linha **Falta pagar** em texto simples, sem moldura. Frase redundante “Já incluído nos totais...” removida. Dados financeiros continuam vindo do backend.
4. **Próximo pagamento**: somente data no card, clique abre popup com a relação de cobranças daquele próximo vencimento.
5. **Faturas do mês**: cada cartão compacto exibe somente “Instituição - Tipo”, vencimento e valor pendente; notas, data de cadastro e metadados longos ocultos, sem alterar dados.
6. Histórico de gastos: filtros de pessoa, mês início e mês final compactados no mobile.
7. Tipos de dívida: no mobile, a lista de gestão sai da tela principal e é exibida em modal ao clicar em **Cadastrar tipo de dívida**. Edição/exclusão usam o catálogo e as permissões existentes; a lista de instituições não foi modificada funcionalmente.
8. PDF dos quatro indicadores mês/Allan/Carol/Casal: clique no card abre confirmação; após aceitar, geração `jsPDF` **no navegador** e download do arquivo `controle-gastos-AAAA-MM-escopo.pdf`, sem upload, gravação no servidor ou alteração no BD. Resumo mostra valores originais, crédito e saldo, divisão pessoal/casal quando aplicável, instituição e faturas com vencimento (saldo das faturas explicitamente separado do bruto por instituição). Visões por pessoa mostram instituições com saldo devido, não alocação individual bruta inventada.
9. Controle de Gastos continua **exclusivamente com identidade visual Clean** e sem seletor de tema Original no módulo. O seletor global ARL Web/PC foi preservado.

### Ordens de Serviço mobile
1. Guia de pagamento abreviada como **AGU. PGTO**, número do status à frente. Web/PC mantém o texto antigo.
2. Nomes dos clientes no cartão da listagem centralizados; demais detalhes e botões preservados.
3. Ficha de entrada: **Entrada / Saída** lado a lado, **Atendimento** sozinho abaixo, botões **Senha do usuário** (se houver senha e permissão) e **Imprimir Etiqueta** lado a lado na linha seguinte. Operações e segurança inalteradas.
4. Preservados menu flutuante anterior, Home mobile das OS, orçamento, fotos, laudo, Serviços/Produtos, histórico, pagamentos e recursos não mencionados.

## Arquivos desta rodada
- `resources/js/expense-summary-overview.tsx`
- `resources/js/expense-control-mobile-summary.tsx`
- `resources/js/expense-control-page.tsx`
- `resources/js/expense-month-details.tsx`
- `resources/js/expense-statement-pdf.ts` (novo: somente geração client-side)
- `resources/css/expense-final-mobile.css` (novo)
- `resources/js/orders-page.tsx`
- `resources/js/order-detail-react.tsx`
- `resources/css/arl-os-final-mobile.css` (novo)
- `resources/js/main.tsx` (imports CSS)
- `package.json` e `package-lock.json` (nova dependência `jspdf@3.0.4`)
- `tests/e2e/expense-indicators-fixture.ts` (expectativas atualizadas ao novo texto/visibilidade)
- `tests/e2e/pacote-mobile-final-20261009.mobile.spec.ts` (novo)
- `tests/e2e/pacote-os-detalhe.mobile.spec.ts` (novo)

## Segurança e retorno
- Backup de estado local antes de tocar nos arquivos: `C:\Users\Allan\ARL-backups\pacote-ui-final-20261009-193144`, com `history.bundle` verificado, 74 arquivos alterados/não rastreados copiados e `private-local-env.txt` privado.
- Nenhuma migração, SQL de escrita ou alteração no banco real DDEV; o Playwright usa seu próprio SQLite de teste, e o PHP Feature usa SQLite `:memory:`.
- Sem reset do Git, sem commits, sem alteração da home das OS e sem publicação.
- Não publicar backups/arquivos .env nem colocá-los no Git.

## Validação
- [OK] TypeScript/Vite build com `jspdf` lazy-loaded; build local final efetuado.
- [OK] Lint ESLint.
- [OK] 41 testes unitários de frontend.
- [OK] 6 testes PHP financeiros / 172 verificações, isolados em SQLite em memória.
- [OK] 6 cenários E2E consolidados: indicadores PC e mobile com exemplo bruto R$1.900/saldo R$1.600; barra igual ARL e ordem correta; 4 downloads PDF validamente iniciados; popup do próximo pagamento; popup de tipos; abreviação e centralização em OS.
- [OK] E2E adicional com OS de teste: verificação mobile das posições de Entrada/Saída, Atendimento e botões Senha/Imprimir Etiqueta (1 cenário).
- [OK] `git diff --check` sem erros; bundle pré-mudanças verificado.

## Pendências explícitas
- [PENDENTE] Avaliação visual final em celular real pelo proprietário (320 a 430 px e aparelhos com barras de gestos/notch).
- [PENDENTE] Regressão completa da suíte E2E existente: testes antigos não foram todos executados; alguns já aguardam atualização para as navegações reformuladas.
- [PENDENTE] Visualizar PDF manualmente em telefone físico, validando distribuição de páginas, impressão e abertura do arquivo.
- [PENDENTE] Auditoria de CSS para possíveis regras legadas que ainda conflitem em cores/temas ou telas específicas; Claude/Codex pode atuar como revisor, sem redesenhar a interface aprovada.
- [PENDENTE] Homologação no DDEV autenticado com os dados reais do proprietário, sem alterar dados.
