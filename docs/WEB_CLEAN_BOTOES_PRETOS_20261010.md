# ARL — alterar SOMENTE botões rosa para degradê preto no Web Clean

Data: 10/10/2026

## Pedido final (confirmado)
Trocar EXCLUSIVAMENTE os botões que eram rosa/vermelhos para degradê preto com texto/ícone branco. NÃO recolorir status, cartões, elementos decorativos, ícones de ações (olho/lápis/lixeira/Maps/WhatsApp), botões neutros, Web Original, Mobile Clean nem Gestor de Gastos.

## Implementação isolada
- Criado `resources/css/web-clean-black-pink-buttons-20261010.css`.
- Adicionado somente seu import no final das importações de CSS de `resources/js/main.tsx`.
- Regras condicionadas a `html[data-layout="desktop"][data-arl-appearance="clean"]`.
- Estiliza botões que já eram rosa: Nova OS, ações principais da ARL (ex.: Entrada Rápida, Concluir, Pagamento, Salvar serviços, Salvar Laudo Final e Produto/Serviço), item de navegação ativo (botão), abas ativas e botões vermelhos de adicionar itens no seletor.
- Não modifica o HTML, a lógica, rotas, banco ou preferências de layout.
- Exclui explicitamente `main[data-arl-expense-control-react="1"]` e não altera CSS interno do Gestor de Gastos.
- Mantém botões secundários, status e ícones de listagens com suas cores originais.

## Backup e segurança
Cópia de `resources/js/main.tsx` e `resources/css/web-clean-reference-20261010.css` anterior a esta rodada em:
`C:\Users\Allan\ARL-backups\web-clean-black-buttons-20261010-001331`.

Sem reset do Git, sem commit, sem publicação KingHost e sem tocar no banco real.
Playwright utiliza banco SQLite de teste.

## Validações
- DDEV: lint, typecheck, build Vite e 50/50 testes unitários aprovados após a alteração do CSS.
- Playwright Chromium isolado: **2/2 cenários passaram** (Web Clean e Original). Validados botões pretos com texto branco em Painel/Ordens e detalhe da OS, botões secundários e ícones/status preservados.
- Evidência visual local: `output/web-clean-reference-20261010/web-clean-only-pink-buttons-black.png`.
- Homologação pelo proprietário recomendada nas telas com dados reais, sem alteração de produção.

## Observação da inspeção visual final
- O comando visual **Enviar foto** na OS também tinha fundo rosa-claro. Embora tecnicamente seja um `label` associado ao campo de upload, é um controle de ação em formato de botão. Foi aplicado o mesmo degradê preto **somente a esse comando**, sem modificar **Usar câmera** (branco).
- A faixa vermelha de etapas da OS foi mantida, pois é indicador de andamento e NÃO um botão. Status, ícones e demais elementos permanecem como antes.
- Repetidos o build/lint/typecheck/50 unitários e o Playwright 2/2 após essa exceção; captura atualizada comprova.
