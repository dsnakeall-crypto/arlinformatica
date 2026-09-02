# Checklist final — estado desta entrega

Legenda: **[OK]** implementado e verificável; **[PENDENTE]** exige continuação. A validação final de backend, testes, TypeScript e build é feita pelo GitHub Actions antes do merge; itens apenas visuais ou demonstrativos não contam como funcionalidade concluída.

## Base e segurança
- [OK] Arquitetura Laravel/PHP + MySQL/MariaDB e React/TypeScript, sem Supabase/OpenAI e sem Node permanente.
- [OK] Modelagem inicial com chaves, índices, snapshots, auditoria, documentos, finanças, pós-venda e backups.
- [OK] Perfis modelados e login protegido por sessão, CSRF e rate limit.
- [OK] Instalador CLI de uso único para o primeiro Master, com senha forte e hash seguro.
- [OK] Autorização backend por perfil nas rotas administrativas, com administração de usuários exclusiva do Master e proteção do último Master ativo.
- [PENDENTE] Recuperação pública de senha por e-mail; a redefinição administrativa segura pelo Master está funcional sem exigir SMTP.
- [OK] Diagnóstico administrativo real de banco, migrations, storage, espaço, backup, scheduler, fila, HTTPS, PWA e Web Push, sem expor secrets.

## Operação
- [OK] API e interface autenticadas para listar/cadastrar clientes, normalizar/validar/bloquear CPF/CNPJ, buscar e paginar; endereço tem ViaCEP com fallback manual.
- [OK] API autenticada para criar/listar OS, gerar número transacional, snapshot e histórico inicial.
- [OK] Impedimento explícito de exclusão de OS e separação estrutural de pagamento/status.
- [OK] Otimizador de foto no servidor com reamostragem, remoção de metadados e teto de 100 KB, ligado à abertura e visualização da OS.
- [OK] Abertura e consulta de OS reais com cliente, Bancada/Externo, equipamento, fabricante, problema, snapshot, histórico, checklist 100% OK/avarias e foto privada.
- [OK] Catálogos backend de equipamentos, fabricantes e Serviços, e templates iniciais completos do checklist por equipamento.
- [OK] Administração real de Serviços/produtos, equipamentos, fabricantes e checklist por equipamento, com desativação sem apagar históricos.
- [OK] Edição auditada de clientes sem alterar snapshots, com atalhos WhatsApp/Maps centralizados e observação obrigatória do item "Outro" preservada na OS/documentos.
- [OK] Orçamento funcional dentro da OS, cálculo em centavos, revisões imutáveis, aprovação/recusa auditável e snapshot opcional de garantia por item (dias/meses/anos).
- [OK] Finalização obrigatória antes do status Concluído, com resultado estruturado, laudo condicional, itens/snapshots, desconto validado em centavos, garantia e cópia idempotente de orçamento aprovado.
- [OK] Laudos técnicos com modelos configuráveis, fluxo rascunho/emissão, revisões imutáveis, fotos existentes e avaliação de dano elétrico escolhida pelo técnico.

## Documentos e financeiro
- [OK] Geração privada de PDF do termo e orçamento A4 com Dompdf, snapshot de conteúdo/empresa/logo, checksum e histórico de revisões.
- [OK] PDFs privados de laudo e fechamento, com snapshot, fotos incorporadas, checksum SHA-256, revisão e ações de visualizar/imprimir/baixar.
- [OK] PDF privado de relatório financeiro mensal, com snapshot, checksum, revisões, empresa atual na emissão, resumos, formas, faturamento diário e itens.
- [OK] Pagamento separado do status operacional, Entrada Rápida, correção auditável, Visão Geral, Caixa Diário automático, movimentações e fechamento mensal ligados às transações reais.
- [OK] Dados da empresa persistentes, logo privada em seis variantes proporcionais e documentos timbrados com dados dinâmicos.
- [OK] Laudo geral e de dano elétrico com responsabilidade técnica explícita, timbrado dinâmico e registro fotográfico.
- [PENDENTE] Comparação visual final de todos os documentos em ambiente de navegador com dependências instaladas.

## Relacionamento, plataforma e administração
- [OK] Pós-venda real e simplificado com três confirmações independentes, snapshots, auditoria, lembrete idempotente após 5 dias e substituição do ciclo após 60 dias sem apagar a OS.
- [OK] Central interna com sino, contador, leitura individual/global e eventos de cliente, OS e pós-venda; PWA instalável, service worker, inscrições Web Push por dispositivo e catch-up com throttle.
- [OK] Disparo Web Push criptografado pelo backend com `minishlink/web-push` v11, VAPID por configuração segura, integração aos eventos, payload mínimo, tratamento de falhas/inscrições expiradas e teste individual; `composer.json`/`composer.lock` foram validados pela CI. Não se afirma entrega em dispositivo físico sem teste real.
- [OK] Métricas reais de fotos/arquivos privados, prévia e limpeza de fotos exclusiva do Master com confirmação forte e auditoria, sem excluir a OS.
- [OK] Backup/restore ZIP executável com dados e arquivos privados, manifesto, checksums, validação, confirmação forte, backup de segurança, autorização Master, download privado, proteção Zip Slip e auditoria.
- [OK] Central de Configurações em cards com Dados da Empresa, Identidade Visual, Documentos e Layout básico; escrita restrita a Master/Administrador.
- [OK] Usuários com pesquisa, criação, edição, perfis, ativação, proteção do último Master e redefinição de senha forte com hash/auditoria.
- [OK] Backup manual/automático, retenção protegida, heartbeat e guia de hospedagem/migração executáveis sem processo residente.

## Interface, qualidade e entrega
- [OK] Shell desktop responsivo com identidade verde, menu, cards, filtros, tabela e cards mobile próprios.
- [OK] PWA instalável com manifesto completo, ícones 192/512, service worker e tratamento de notificações recebidas.
- [OK] Documentação de arquitetura e deploy KingHost.
- [OK] CI preparada para PHP, lint, testes, TypeScript e build.
- [OK] Telas operacionais de clientes, Nova OS, listagem e visualização de OS usam backend real, com estados de carregamento, erro, vazio e validação.
- [OK] Etapa 7 administrativa ligada ao backend real, com telas responsivas e testes de segurança, históricos, catálogos, checklist e fotos.
- [OK] Playwright E2E versionado no `package.json`/`package-lock.json`, com SQLite isolado, seed próprio, servidor Laravel local, fluxo operacional principal, autorização por perfis, viewport mobile e `retries: 0`; execução real validada pelo GitHub Actions.
- [PENDENTE] Validação física do Web Push em Android/iPhone com HTTPS e VAPID reais; roteiro em `docs/HOMOLOGACAO_WEB_PUSH.md`.
- [PENDENTE] Comparação visual final: as oito referências foram fornecidas nesta tarefa, mas a captura/comparação automatizada completa e a homologação de impressão física ainda precisam ser concluídas.
- [PENDENTE] Deploy real na KingHost; o workflow manual de release está preparado, porém não foi executado no GitHub Actions nesta branch.
- [PENDENTE] Preferência Aparência e Layout por dispositivo ainda requer validação/ajuste funcional completo.
- [PENDENTE] Recuperação pública de senha por e-mail é opcional e não foi implementada; o reset administrativo Master permanece funcional.
