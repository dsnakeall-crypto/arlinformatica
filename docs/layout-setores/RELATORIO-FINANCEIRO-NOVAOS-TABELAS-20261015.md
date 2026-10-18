# ARL Informática — Rodada Financeiro + Nova OS + tabelas + fundo (15/10/2026)

## Estado
**Implementado e testado no ambiente local. Aguardando aprovação visual do proprietário. Não publicar em produção.**

## Correções feitas
1. Painel / Ordens — as duas tabelas usam agora borda bege fina, fundo perolado, cantos arredondados, faixas alternadas claras e cabeçalho de 44px. Na tabela do Painel, espaço adicional para os ícones de ações; colunas Dispositivo/Status/Relato reorganizadas. Números e datas da OS permanecem pretos. Fontes preservadas.
2. Financeiro — aparência uniforme claro/perolado + dourado, botões preto/dourados em todas as **sete** abas: Visão Geral, Caixa Diário, Movimentações, A Receber, Mensal, Relatórios, Despesas. Reaproveitados todos os estados, consultas, API, validações, permissões, recibos e ações originais; cálculos dinâmicos não foram alterados.
3. Financeiro Mensal — bloco Serviços e produtos convertido de texto simples para tabela semântica de Descrição, Quantidade, Valor total. É preenchida exclusivamente com `month.items` obtido da API existente (sem cadastro inventado).
4. Nova OS — cartões, campos, abas de atendimento, ícones, ações, fotos e seletor Produtos/Serviços recebem acabamento perolado/dourado, sem reescrever o formulário, os uploads ou o fluxo de cadastro.
5. Fundo decorativo superior antigo — **removido apenas o banner bitmap borrado** dos layouts que o exibiam em Painel, Ordens, Clientes, Produtos, Serviços e Fornecedores. Substituído por gradiente CSS discreto e leve, sem downloads adicionais de imagens. O novo Financeiro e a Nova OS também usam apenas gradientes CSS, não imagens ampliadas. **Não foi alterada a imagem de fundo do menu lateral**.
6. Garantia adicional — `font-size:11px` apenas dentro dos dois campos compactos de duração e unidade em Produtos/Serviços, preservando tamanho dos cartões. Campos Dias/Meses/Anos devem caber sem corte.

## Arquivos
- `resources/js/main.tsx` — imports de três folhas específicas, no fim da cascata dos estilos.
- `resources/js/finance-page.tsx` — apresentação dos itens do mês em tabela semântica, sem alteração do uso da API.
- `resources/css/financeiro-gold-reference-20261015.css` — 7 abas do Financeiro.
- `resources/css/nova-os-gold-reference-20261015.css` — abertura de OS.
- `resources/css/tabelas-topo-gold-refino-20261015.css` — Painel, Ordens, top antigo e garantia.

## Backup
- Originais anteriores à rodada preservados e verificados por SHA256, 8 arquivos:
  `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\FINANCEIRO-NOVAOS-TABELAS-ANTES-20261014-230522`
- O repositório já continha alterações de outras rodadas. Não houve limpeza, reset, troca de branch, alteração de banco nem publicação.

## Verificações concluídas
- `npm run build`: PASS (inclui TypeScript e Vite).
- `npm run lint`: PASS.
- `npm run test:unit`: PASS.
- `git diff --check`: PASS.
- Playwright autenticado contra `arlinformatica.test`: alternância das **7 abas**, todos os painéis visíveis, carregamento de dados reais, nenhum sino duplicado no Financeiro, **zero overflow global**, janela em 1672/1366/960/760 px: PASS.
- Abertura de **Nova OS**: quatro blocos da ficha, formulário e envio presentes, câmera presente, zero overflow nas quatro larguras: PASS. Nenhuma OS foi criada.
- Tabela de Ordens: 44px no cabeçalho, sem banner borrado, sem overflow: PASS.
- Conferência final após retoques: aba Mensal renderizou **8 linhas reais** da API (dados deste ambiente; valores variam), cabeçalho tem linha bege/dourada no lugar da vermelha; seletor Produto/Serviço da Nova OS tem botão preto/dourado: PASS.
- Capturas: `%LOCALAPPDATA%\ARL-Informatica-Dev\finance-gold-*.png`, `new-os-gold-*.png`, `nova-os-final.png`, `finance-monthly-final.png`, `orders-tables-gold.png`.

## Limitações e observações
- Arte visual aplicada ao **tema Original no desktop**; demais temas/mobile preservados. A equivalência é uma aproximação fiel com componentes React/CSS, não cópia pixel-a-pixel de imagens estáticas.
- Não foi adicionada imagem de topo HD artificial. A alternativa aprovada pelo proprietário foi retirar o banner borrado em vez de ampliar imagem muito comprimida. Para trocar futuramente por uma nova arte, solicitar nova autorização e arquivo HD original.
- Os valores das capturas de teste refletem o banco local, não os valores ilustrativos das referências.
- Nenhuma operação real de Despesa, Entrada Rápida, criação de OS, pagamento, estorno ou upload foi disparada pelos testes.

**Próximo passo**: proprietário revisar visualmente as telas localmente e informar ajustes finos antes de qualquer publicação.
