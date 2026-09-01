# Checklist final — estado desta entrega

Legenda: **[OK]** implementado e verificável; **[PENDENTE]** exige continuação. A tela inicial usa dados demonstrativos somente para validar a composição visual e, por isso, não conta como funcionalidade concluída.

## Base e segurança
- [OK] Arquitetura Laravel/PHP + MySQL/MariaDB e React/TypeScript, sem Supabase/OpenAI e sem Node permanente.
- [OK] Modelagem inicial com chaves, índices, snapshots, auditoria, documentos, finanças, pós-venda e backups.
- [OK] Perfis modelados e login protegido por sessão, CSRF e rate limit.
- [OK] Instalador CLI de uso único para o primeiro Master, com senha forte e hash seguro.
- [PENDENTE] Policies completas, recuperação de senha e diagnóstico.

## Operação
- [OK] API autenticada para listar/cadastrar clientes, normalizar/validar/bloquear CPF/CNPJ e buscar/paginar.
- [OK] API autenticada para criar/listar OS, gerar número transacional, snapshot e histórico inicial.
- [OK] Impedimento explícito de exclusão de OS e separação estrutural de pagamento/status.
- [OK] Otimizador de foto no servidor com reamostragem, remoção de metadados e teto de 100 KB.
- [PENDENTE] CEP/ViaCEP, upload ligado à UI, catálogo CRUD, checklist configurável completo e WhatsApp/Maps.
- [PENDENTE] Fluxos funcionais de orçamento, aprovação, laudo/revisão, conclusão e garantias.

## Documentos e financeiro
- [PENDENTE] Geração/preview dos PDFs de termo, orçamento, laudo, fechamento e relatório financeiro.
- [PENDENTE] Pagamento, Entrada Rápida, correção auditável, painéis e fechamento mensal.
- [PENDENTE] Logo/configurações versionadas e incorporação de TIMBRADO.

## Relacionamento, plataforma e administração
- [PENDENTE] Pós-venda com confirmação, lembrete de 5 dias e ciclo de 60 dias.
- [PENDENTE] Central interna, Web Push, service worker/offline e catch-up.
- [PENDENTE] Backup/restore executável, limpeza segura de fotos e armazenamento/diagnóstico.
- [PENDENTE] Configurações, usuários e permissões administrativas completos.

## Interface, qualidade e entrega
- [OK] Shell desktop responsivo com identidade verde, menu, cards, filtros, tabela e cards mobile próprios.
- [OK] Manifesto PWA inicial.
- [OK] Documentação de arquitetura e deploy KingHost.
- [OK] CI preparada para PHP, lint, testes, TypeScript e build.
- [PENDENTE] Trocar dados demonstrativos da tela pelo backend, implementar rotas/telas restantes e E2E Playwright.
- [PENDENTE] Comparação final em navegador com todas as referências e testes funcionais completos do Projeto Mestre.
