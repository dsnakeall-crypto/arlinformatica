# Ajustes de compras — 08/10/2026

- Observação por compra no cadastro manual e por foto, reapresentada discretamente nas parcelas, faturas e projeção. Todas as parcelas da compra compartilham a observação; não há campo independente por mês.
- Assinatura mensal por foto ou cadastro manual usa a recorrência existente, sem prazo final. Encerrar recorrência cancela os meses futuros; a divisão mensal permanece por porcentagem.
- Editar identificação permite corrigir instituição/cartão, primeiro mês e dia, reorganizando os vencimentos e preservando IDs, valores e divisão. A operação é transacional e bloqueada após qualquer lançamento financeiro, inclusive estornado. Nome e observação continuam editáveis.
- Ajustes inclui Original/Clean no computador e celular. A preferência existente é do dispositivo e aplica-se ao aplicativo inteiro.
- Interface desktop compactada sem remover rolagem necessária a listas extensas. Mobile mantém áreas de toque.
- Vite `base: './'` faz dependências lazy usarem URLs absolutas equivalentes às tags Laravel: impede reinserção do CSS principal depois do CSS de aparência ao abrir cadastro por foto. Não comprova solução da lentidão geral.
- Sem migrations ou alterações de schema. Arquivos locais anteriores não relacionados permanecem fora da entrega.

Validação local: 40 testes backend/579 verificações, 41 testes frontend, TypeScript, lint, build, testes de estabilidade Original/Clean e ajustes responsivos. Publicação depende da CI do commit e backup atual validado; evidência final fica no relatório externo.
