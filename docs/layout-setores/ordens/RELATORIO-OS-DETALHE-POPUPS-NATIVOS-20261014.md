# ARL Informática — OS detalhada e diálogos nativos — 14/10/2026

**STATUS: implementação local concluída, aguardando aprovação visual. NÃO publicado em produção.**

## Referências
Duas imagens enviadas, primeira com cabeçalho, etapas, ficha de entrada, fotos, serviços/produtos e laudo; segunda com orçamentos e painel de pagamento. O segundo print é continuação vertical da mesma tela. A implementação usa o layout perolado/dourado e botões preto/dourado, mantendo os componentes reais e as fontes do sistema.

## Alterações realizadas
- `resources/css/order-detail-gold-reference-20261014.css`: tema visual dedicado à OS, aplicado ao Original no desktop; cabeçalho, etapas, ficha de entrada, divisões, fotos, serviços/produtos, laudo, orçamentos, pagamento e responsividade. Classes de modais existentes recebem acabamento comum dourado. Sem alterações nas regras dos dados.
- `resources/js/order-detail-react.tsx`: cinco grupos de ícones SVG Lucide, de acabamento 3D leve: Ficha (ClipboardList), Serviços (Box), Laudo (FileText), Orçamentos (ReceiptText), Pagamento (Wallet). Somente ícones visuais e migração de alertas/confirmações.
- `resources/js/order-editor-unified.tsx`, `resources/js/order-detail-page.tsx`: confirmação de descarte agora assíncrona e interna, com cancelamento real, inclusive ao trocar a navegação lateral. A proteção nativa do navegador ao fechar a aba com dados não salvos (`beforeunload`) foi preservada.
- `resources/js/app-native-dialog.ts` e `resources/css/app-native-dialog.css`: novo componente global de aviso/confirmação/pergunta ARL (ARIA, foco, Escape, Tab, texto seguro, fila de promessas; perguntas de senha com tipo password).
- `resources/js/main.tsx`: import das duas folhas novas e migração de dois prompts / um alerta do navegador, sem alterar os menus.
- Migração explícita de alert/confirm/prompt nos módulos de Ordens, Painel, Clientes, Nova OS, Configurações, Fornecedores e manutenção legada, usando a mesma API de modal. NÃO foram modificados componentes da área interna desses setores.
- Popups existentes: Editor, Orçamento, seletor de Produtos/Serviços, envio de orçamento, pagamento, reabertura, câmera e outros são DOM/React do próprio sistema; padronização CSS perolada/dourada, com fundos e ações harmonizados.
- `docs/REGRA_POPUPS_NATIVOS_ARL_20261014.md`: regra oficial das próximas etapas.

## Proteção
- Backup original, nove arquivos verificados por SHA-256:
  `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\LAYOUT-DETALHE-OS-ANTES-20261014-203406`
- Backup adicional em `POPUPS-OUTROS-SETORES-ANTES`, dez arquivos verificados antes de migrar diálogos globais.
- Sem ações de banco, exclusões, pagamentos, envios de mensagens ou publicação na KingHost. Nenhuma escrita de dados reais pelos testes: o texto de validação de unsaved changes foi descartado sem salvar.
- Menu lateral e Painel previamente aprovados foram preservados visualmente. Tema Clean e layout mobile próprio não foram reformulados.

## Testes
- `npm run build` PASS
- `npm run lint` PASS
- `npm run test:unit` PASS
- `git diff --check` PASS
- Chromium com conta E2E local e OS #0000044: tamanhos 1672×941, 1366×768, 960×680, 760×640 e retorno a 1672×941. Cinco etapas e os seis principais grupos de informação presentes, sem overflow horizontal global. **PASS**.
- Menu de PDFs abre dentro da OS. **PASS**.
- Editor de OS abre como portal ARL, alteração simulada sem salvar; botão cancelar mantém editor, confirmação depois fecha. Nenhum `dialog` do navegador acionado nesse cenário. **PASS**.
- Pop-up Orçamento nativo **PASS**; Pop-up Produto/Serviço nativo **PASS**; ícones vetoriais de cinco seções presentes **PASS**.
- As imagens e ícones são SVG vetoriais/componentes já usados no app, sem novo fundo raster gigante nem novas consultas backend.
- Evidências locais:
  - `%LOCALAPPDATA%\ARL-Informatica-Dev\os-detail-gold-final-approved-candidate.png`
  - `%LOCALAPPDATA%\ARL-Informatica-Dev\os-native-confirm-demo.png`
  - `%LOCALAPPDATA%\ARL-Informatica-Dev\os-gold-budget-popup.png`
  - `%LOCALAPPDATA%\ARL-Informatica-Dev\os-gold-product-popup.png`

## Limitações explícitas
- A fidelidade é aproximada com microdiferenças de brilho/proporção; a referência não é um layout pixel-perfect em todos os breakpoints. O proprietário pode solicitar ajuste visual fino.
- Impressão, abertura do visualizador de PDF e WhatsApp continuam sendo fluxos de documentos/destinos externos quando solicitado pelo usuário, e não foram convertidos em falsos diálogos dentro do app.
- O `beforeunload` permanece sob controle do navegador, por exigência da plataforma web.
- Testes acima verificam visual, carregamento, navegação e cancelamento; nenhum fluxo de envio, exclusão, pagamento ou conclusão foi disparado.

**Próximo passo:** proprietário abre uma OS no ambiente local e avalia o visual. Não iniciar outro setor nem publicar sem autorização.
