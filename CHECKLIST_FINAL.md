# Checklist final — estado desta entrega

Legenda: **[OK]** implementado e verificável; **[PENDENTE]** exige continuação. A tela inicial usa dados demonstrativos somente para validar a composição visual e, por isso, não conta como funcionalidade concluída.

## Base e segurança
- [OK] Arquitetura Laravel/PHP + MySQL/MariaDB e React/TypeScript, sem Supabase/OpenAI e sem Node permanente.
- [OK] Modelagem inicial com chaves, índices, snapshots, auditoria, documentos, finanças, pós-venda e backups.
- [OK] Perfis modelados e login protegido por sessão, CSRF e rate limit.
- [OK] Instalador CLI de uso único para o primeiro Master, com senha forte e hash seguro.
- [PENDENTE] Policies completas, recuperação de senha e diagnóstico.

## Operação
- [OK] API e interface autenticadas para listar/cadastrar clientes, normalizar/validar/bloquear CPF/CNPJ, buscar e paginar; endereço tem ViaCEP com fallback manual.
- [OK] API autenticada para criar/listar OS, gerar número transacional, snapshot e histórico inicial.
- [OK] Impedimento explícito de exclusão de OS e separação estrutural de pagamento/status.
- [OK] Otimizador de foto no servidor com reamostragem, remoção de metadados e teto de 100 KB, ligado à abertura e visualização da OS.
- [OK] Abertura e consulta de OS reais com cliente, Bancada/Externo, equipamento, fabricante, problema, snapshot, histórico, checklist 100% OK/avarias e foto privada.
- [OK] Catálogos backend de equipamentos, fabricantes e Serviços, e templates iniciais completos do checklist por equipamento.
- [PENDENTE] Interface administrativa completa para editar/desativar catálogos e checklist; edição de clientes, WhatsApp/Maps e campo de observação do item "Outro".
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
- [OK] Telas operacionais de clientes, Nova OS, listagem e visualização de OS usam backend real, com estados de carregamento, erro, vazio e validação.
- [PENDENTE] Implementar rotas/telas dos módulos de etapas futuras, administração completa de catálogos e E2E Playwright.
- [PENDENTE] Comparação final em navegador com todas as referências e testes funcionais completos do Projeto Mestre.
