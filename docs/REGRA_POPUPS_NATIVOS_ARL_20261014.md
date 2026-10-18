# REGRA PERMANENTE — Pop-ups e modais nativos da ARL Informática
**Instituída em 14/10/2026 por autorização expressa do proprietário.**

1. Todo diálogo de interação do sistema deve ser desenhado **dentro do aplicativo**, em DOM/React com identidade ARL. É proibido criar novos fluxos com `window.alert`, `window.confirm` ou `window.prompt` e equivalentes.
2. Para confirmações, avisos e entrada curta de texto, usar `resources/js/app-native-dialog.ts`: `appConfirm`, `appAlert`, `appPrompt`. Ações destrutivas **só continuam após confirmação positiva explícita**. O diálogo deve renderizar texto seguro e não HTML de dados externos.
3. Para edição detalhada, orçamento, anexos, produtos/serviços, histórico, pagamento, reabertura e demais formulários: usar os modais próprios já existentes (React/DOM), aplicando o mesmo padrão **claro/perolado + bordas douradas + botões preto/dourados**. Não substituir funcionalidades reais por mockups.
4. Todos devem ser acessíveis: `role=dialog/alertdialog`, `aria-modal=true`, foco inicial, proteção de Tab e Esc, cancelamento reversível, retorno do foco e rolagem interna responsiva. Não fechar com ação destrutiva ao clicar fora.
5. Estética padronizada **sem alterar a tipografia do sistema** (família, tamanhos, pesos e cores de textos de dados), exceto ajustes pontuais aprovados. Fotos e imagens leve/otimizadas; preferir ícones vetoriais.
6. Não abrir uma janela do navegador para perguntas, edição, validação ou confirmação do sistema. Impressão, links externos (WhatsApp e outros) e visualização dos próprios arquivos PDF são destinos de documento/serviço, **não diálogos do aplicativo**; não converter silenciosamente para outro fluxo sem etapa autorizada.
7. A proteção nativa `beforeunload`, controlada pelo navegador ao tentar fechar uma aba com informações não salvas, não pode ser substituída com segurança por diálogo React; mantê-la onde necessária. A navegação **dentro do aplicativo**, porém, deve usar o diálogo próprio ARL.
8. Toda nova alteração passa por backup, build, lint, testes das interações, responsividade e avaliação visual antes de avançar de setor.

## Implementação inicial — 14/10/2026
- `resources/js/app-native-dialog.ts` / `resources/css/app-native-dialog.css` centralizam as mensagens do aplicativo. Uso assíncrono com Promises e fila sequencial.
- Migração das chamadas explícitas de `alert/confirm/prompt` em frontend de OS, Painel, Ordens, Clientes, Nova OS, Fornecedores, Configurações e módulos de manutenção legados. Os usos `confirm(...)` remanescentes em busca textual referem-se a **funções de negócio/métodos**, não ao diálogo do navegador.
- CSS `resources/css/order-detail-gold-reference-20261014.css` padroniza a tela OS e modais existentes, incluindo Editor, Orçamento e seletor Produto/Serviço, preservando o Clean e os dados.
- O alerta próprio e o modal Editor foram testados com alteração **não salva** sem persistência: Cancelar mantém o editor aberto; Confirmar descarta o teste. Nenhum popup nativo do navegador ocorreu nesse teste.

**Não publicar em produção sem autorização posterior.**
