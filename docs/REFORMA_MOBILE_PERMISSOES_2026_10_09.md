# Reforma mobile e autorização individual — 09/10/2026

## Escopo realizado somente no ambiente local

Este trabalho foi solicitado para o sistema pessoal ARL Informática e não autoriza publicação. A cópia do banco KingHost no DDEV serve apenas para testes. O banco oficial e os arquivos privados hospedados continuam sendo fonte da verdade e nunca devem ser substituídos por dados deste ambiente.

### Segurança antes das alterações

- Backup local pré-alteração: `C:\Users\Allan\ARL-backups\arl-reforma-20261009\snapshot`, criado por robocopy (sem falhas na cópia).
- Exportação do MySQL DDEV **antes da migration**: `C:\Users\Allan\ARL-backups\arl-reforma-20261009\banco-ddev-antes-da-migracao.sql.gz` (arquivo privado, não versionar).
- Migration única aplicada **somente** no DDEV: `2026_10_09_105900_add_simple_admin_expense_access`, aditiva, nova coluna booleana com valor inicial falso.
- Após a migration: 636 clientes, 67 ordens de serviço, 4 usuários existentes e novo perfil disponível; nenhum usuário existente mudou de perfil automaticamente.
- Proteção de release GitHub reforçada em `.github/workflows/release.yml` e `.gitignore`: não publicar .env, SQL, SQLite, backups, storage/app ou .ddev. O pacote fictício e o dry-run real de exclusões passaram; produção não foi acessada.
- **A publicação futura requer** backup remoto validado, migration autorizada, conferência do método exato de deploy, CI e validação da aplicação sobre o banco oficial sem repor dados locais.

### UI / navegação mobile

- `resources/js/main.tsx`, `resources/css/arl-mobile-reform.css`: barra inferior mobile com Painel, Clientes, Abrir OS, Financeiro e Gestor de Gasto; autorizações filtram atalhos. Os destinos existentes continuam no menu lateral.
- Segundo modo selecionável: sidebar compacta de 58 px com ícones. Preferência `arl-mobile-nav-{id}`, exclusiva do usuário e navegador. Troca de menu e de modo Web/Mobile em Configurações, não no cabeçalho principal.
- `resources/js/dashboard-page.tsx`: totais e listas desktop não são renderizados no mobile. A home mobile mantém os cards próprios de OS abertas via `mobile-home.ts`.
- `resources/js/expense-control-page.tsx`: ambiente visualmente independente da navegação ARL. Cabeçalho Voltar para ARL / Ajustes; menu próprio mobile Resumo, Gastos, Adicionar, Instituições, Projeção; Quitadas como opção secundária de Gastos e Pagamentos como opção secundária de Projeção. **Nenhuma fórmula, lançamento ou layout dos cards do Resumo foi reescrito.**

### Papéis e permissões

- `Administrador Simples`: acesso aos módulos operacionais e financeiros, acesso apenas de leitura a um resumo explicitamente permitido das configurações da empresa e ao menu pessoal do dispositivo. Usuários, backups, credenciais, assinatura, armazenamento privado e mudanças nas configurações gerais continuam protegidos.
- O Controle de Gastos é de acesso individual: `users.expense_control_access`, **false por padrão** para Administrador e Administrador Simples. Master e perfil exclusivo de Gastos continuam com acesso. Usuário local não ganha Gastos nem com sinalizador definido indevidamente.
- O Master configura o sinalizador em `Configurações > Usuários` individualmente. **A conta da Carol não foi modificada automaticamente.** O proprietário deve confirmar seu perfil e marcar a permissão explícita.
- `ExpenseNotifications` e `NotificationController` aplicam o mesmo critério individual para proteger valores pessoais em notificações.
- Middleware `RequireExpenseAccess` protege as rotas do Controle de Gastos no backend; a ocultação de menus por React é só apresentação.
- Nova rota `GET /api/settings/overview` usa lista branca de dados públicos da empresa para perfil simples e não entrega toda a configuração.

### Testes e limitações

- TypeScript, ESLint e build React passaram durante esta implementação; formatação Pint de arquivos alterados ajustada.
- Novos testes PHP `SimpleAdminAuthorizationTest`: 3 aprovados, 18 verificações.
- Teste focado de notificações financeiras, após atualizar expectativa de autorização individual: aprovado com 24 verificações.
- Suíte de 64 testes relacionados de finanças/fornecedores/segurança: 63 passaram e 1 falhou inicialmente por expectativa antiga; o cenário atualizado passou isoladamente. **Ainda falta repetir todos os 64 juntos.**
- Testes de navegador Playwright usando SQLite descartável: 3 cenários novos aprovados (inclui Administrador Simples e mudança de permissão real), 2 cenários legados focados aprovados, e 5 testes completos de `mobile.spec.ts` aprovados.
- Não foi realizada uma homologação visual humana em aparelhos reais. Verificar sobreposição de popups, barra e menus em iPhone, Android e desktop.
- **Pendente:** suíte PHP completa, suíte E2E completa, testes no navegador da KingHost somente após autorização e otimização de performance final.
- A pasta do Windows em `/mnt/c` continua bastante lenta no DDEV, problema de ambiente investigado apenas de forma preliminar; não misturar com a validação funcional da reforma.

### Restrições obrigatórias

Nunca executar `migrate:fresh`, `db:wipe`, copiar a base DDEV para KingHost, publicar backups ou sincronizar PDFs/arquivos privados deste projeto com produção. Não fazer push/merge/deploy automaticamente. Nenhuma conta real recebeu nova senha ou permissão durante este trabalho.
