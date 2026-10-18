# ARL Informática — Correções 1 a 5 (15/10/2026)

**Estado:** implementadas localmente; aguardando aprovação visual. Não publicar na KingHost sem autorização.

## Item 1 — Painel, Ordens e Clientes
- Painel: linhas das duas tabelas de OS aumentadas para 57px; células com padding vertical de 10px, leitura e alinhamento restaurados sem mexer nas fontes.
- Painel e Ordens: número da OS, data e hora em preto `#18191d`; cores das etiquetas de status preservadas.
- Clientes: somente o ícone de visualizar passa a usar o arquivo `/arl-assets/icons/icon-web-eye-compact-2x.png`, exatamente o mesmo usado em Ordens/Painel. Demais ícones inalterados.

## Item 2 — Notificações
- `NotificationBell` só é montado quando `page === "dashboard" && !detail`. Em Ordens, detalhe da OS, Clientes, Serviços, Produtos, Fornecedores e demais menus não é renderizado.
- No Painel, o componente real continua exibindo contador dinâmico e as notificações completas, com posição no meio da faixa superior conforme marca rosa da referência.
- Eliminada a altura reservada de 66px da antiga faixa de sino nas demais telas do desktop, sem mexer no menu lateral ou no cabeçalho mobile.
- **Pendente de fidelidade de imagem:** substituição por arquivo do sino 3D da referência em maior definição (a cópia atualmente dentro do projeto tem 96px). Não declarar melhora de qualidade do sino sem substituição comprovada.
- **Pendente de arquivo original:** arte superior em qualidade máxima de todos os menus. O proprietário disse que enviaria um arquivo de referência separado. A rodada visual preservou os fundos já utilizados, sem inventar detalhe ausente no original.

## Itens 3 e 4 — Garantia adicional
- Mesmo layout compacto aplicado aos cadastros de Serviços e de Produtos por CSS comum.
- Descrição alinhada à esquerda, duração com **94px**, unidade com **108px**, espaçamento de 16px e quebra controlada em janelas estreitas.
- Estado, validação e tratamento dos campos originais React preservados.

## Item 5 — Legibilidade das listagens
- Produtos e Serviços: espaços entre título, descrição e cards Mais usados.
- Mais respiro abaixo do título de cadastrados.
- Entre itens da lista: intervalo de 4px, linhas de mínimo 43px, bordas suaves e arredondamento leve; botões, números e conteúdo preservados.

## Arquivos
- `resources/js/main.tsx` — sino apenas Painel e import da folha.
- `resources/js/clients-page.tsx` — substituição exclusiva do olho, limpeza do import inutilizado.
- `resources/css/ajustes-layout-itens-01-05-20261015.css` — CSS isolado com as regras acima.
- `docs/REGRA_SINO_GLOBAL_ARL_20261015.md` — regra atualizada para sino SOMENTE NO PAINEL (substitui a decisão anterior de sino em todos os menus).

## Proteção e testes
- Backup SHA256 8 arquivos antes de alterações: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\CORRECOES-ITENS-1-A-5-20261014-222120`
- Build: PASS; lint: PASS; git diff --check: PASS.
- `npm run test:unit`: 61/61 PASS.
- Playwright, navegação autenticada: Painel, Ordens, Clientes, Serviços, Produtos, Fornecedores e detalhe da OS. Todas as páginas com contador correto de sinos (1 apenas Painel, 0 demais), sem overflow horizontal; cores dos números e datas RGB(24,25,29); linhas Painel de 57px; olho Clientes correto; duração/unidade compactas 94/108px; janelas 1672px e 760px: PASS.
- Capturas em `%LOCALAPPDATA%\ARL-Informatica-Dev\correcoes-itens-01-05-*.png`. Testes não gravaram/editaram dados: checkbox de garantia apenas ativado temporariamente no navegador.

**Revisão pendente:** receber a arte de fundo superior de alta definição para otimizar e trocar em todas as telas; validar nova versão do sino em resolução mais alta antes de declarar este item visual concluído.
