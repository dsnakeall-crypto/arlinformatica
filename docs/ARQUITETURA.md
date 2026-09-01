# Arquitetura e decisões

## Visão geral

Monólito modular Laravel 12/PHP 8.2 com API autenticada por sessão e SPA React/TypeScript compilada pelo Vite. O artefato estático é servido pelo PHP/Apache: Node não participa da produção. MySQL/MariaDB é o banco oficial e o SQLite pode ser usado nos testes.

Os módulos são **Identidade**, **Clientes**, **Catálogo**, **Ordens**, **Documentos**, **Financeiro**, **Pós-venda**, **Configurações** e **Auditoria**. Regras críticas vivem em serviços de domínio transacionais; policies e middleware aplicam autorização no servidor.

## Histórico e concorrência

- O contador de OS é travado com `SELECT … FOR UPDATE`; o índice único é a última barreira contra clique duplo.
- Dados usados numa OS são copiados para snapshots JSON imutáveis.
- Status operacional e pagamento são entidades separadas.
- Uma OS concluída é protegida contra exclusão; correções de documentos criam revisões.
- Catálogo, modelos e cadastros referenciados são desativados/soft-deleted, nunca usados para reescrever o passado.
- Dinheiro é armazenado em centavos (`BIGINT`), evitando erro de ponto flutuante.

## Arquivos e segurança

Uploads ficam no disco privado. Fotos são decodificadas, orientadas e reamostradas no servidor, sem EXIF, até no máximo 100 KB. Downloads exigem policy ou URL assinada. Senhas usam o hasher do Laravel; login tem rate limit; todas as mutações usam CSRF, Form Requests, transações e auditoria.

## Produção compartilhada

O document root aponta para `public/`. `storage` fica fora da web e gravável pelo PHP. Scheduler é acionado por cron; rotinas de pós-venda também fazem *catch-up*. Backups possuem manifesto, checksum e versão do schema. Veja `docs/KINGHOST_DEPLOY.md`.

## Pós-venda, notificações e PWA

`PostSaleService` concentra as regras idempotentes: somente conclusão com `repair_completed`, elegibilidade após cinco dias, trava pessimista no cliente e apenas um ciclo ativo. Uma nova conclusão separada por pelo menos 60 dias arquiva exclusivamente o ciclo anterior. As três ações preservam mensagem, usuário e horário de confirmação; abrir WhatsApp nunca confirma envio.

Notificações internas são individuais, possuem chave de deduplicação e continuam sendo a fonte primária. O scheduler executa `post-sale:check`; Painel e Pós-Venda fazem catch-up limitado por cache. A PWA guarda apenas ativos estáticos públicos no cache, nunca respostas autenticadas. Inscrições Push pertencem ao usuário e segredos VAPID permanecem no `.env`; a entrega Web Push criptografada pelo backend requer a biblioteca PHP padrão e segue pendente enquanto o ambiente de dependências estiver bloqueado.
