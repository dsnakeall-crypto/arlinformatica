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
- [OK] Abertura e consulta de OS reais com cliente, Bancada/Externo, equipamento, fabricante, problema, snapshot, histórico, checklist 100% OK/avarias, foto privada e Serviços/Produtos opcionais com preço/garantia relidos do catálogo pelo servidor.
- [OK] Catálogos backend de equipamentos, fabricantes e Serviços, e templates iniciais completos do checklist por equipamento.
- [OK] Administração real de Serviços/produtos, equipamentos, fabricantes e checklist por equipamento, incluindo tipo Serviço/Produto, preço e garantia adicional em dias/meses/anos, com desativação sem apagar históricos.
- [OK] Edição auditada de clientes sem alterar snapshots, com atalhos WhatsApp/Maps centralizados e observação obrigatória do item "Outro" preservada na OS/documentos.
- [OK] Orçamento funcional dentro da OS, cálculo em centavos, revisões imutáveis, aprovação/recusa auditável e snapshot opcional de garantia por item (dias/meses/anos).
- [OK] Finalização obrigatória antes do status Concluído, com resultado estruturado, laudo condicional, itens/snapshots, desconto validado em centavos, garantia e uso idempotente do orçamento aprovado somente quando escolhido na finalização.
- [OK] Laudos técnicos com modelos configuráveis, fluxo rascunho/emissão, revisões imutáveis, fotos existentes e avaliação de dano elétrico escolhida pelo técnico.

## Documentos e financeiro
- [OK] Geração privada de PDF do termo e orçamento A4 com Dompdf, snapshot de conteúdo/empresa/logo, checksum e histórico de revisões.
- [OK] PDFs privados de laudo e fechamento, com snapshot, fotos incorporadas, checksum SHA-256, revisão e ações de visualizar/imprimir/baixar.
- [OK] PDF privado de relatório financeiro mensal, com snapshot, checksum, revisões, empresa atual na emissão, resumos, formas, faturamento diário e itens.
- [OK] Pagamento separado do status operacional, Entrada Rápida, correção auditável, Visão Geral, Caixa Diário automático, movimentações e fechamento mensal ligados às transações reais; o relatório mensal é carregado sob demanda e não bloqueia a abertura do Financeiro.
- [OK] Dados da empresa persistentes, logo privada em seis variantes proporcionais e documentos timbrados com dados dinâmicos.
- [OK] Dados oficiais do timbrado ARL (CNPJ, telefone, endereço, e-mail e Instagram) são os padrões iniciais editáveis; valores persistidos em Configurações continuam prevalecendo.
- [OK] Cores globais configuráveis controlam a identidade do app e o PDF A4; o PDF preserva as cores no snapshot histórico da OS.
- [OK] Garantia Geral configurável pode ser incluída no PDF final e é preservada no snapshot histórico; itens sem garantia adicional não imprimem seção de “sem garantia”.
- [OK] Laudo geral e de dano elétrico com responsabilidade técnica explícita, timbrado dinâmico e registro fotográfico.
- [PENDENTE] Homologação visual final contra as referências oficiais antigas de Painel/Menu, Clientes, Nova OS, Status/OS, PDF A4, Pós-Venda, LOGO e TIMBRADO. Os anexos visuais precisam ser reenviados na etapa final; até lá não se afirma comparação concluída.
- [PENDENTE] Homologação física de impressão A4 em impressora real.

## Relacionamento, plataforma e administração
- [OK] Pós-venda real e simplificado com três confirmações independentes, snapshots, auditoria, lembrete idempotente após 5 dias e substituição do ciclo após 60 dias sem apagar a OS.
- [OK] Central interna com sino, contador, leitura individual/global e eventos de cliente, OS e pós-venda; PWA instalável, service worker, inscrições Web Push por dispositivo e catch-up com throttle.
- [OK] Disparo Web Push criptografado pelo backend com `minishlink/web-push` v11, VAPID por configuração segura, integração aos eventos, payload mínimo, tratamento de falhas/inscrições expiradas e teste individual; `composer.json`/`composer.lock` foram validados pela CI. Não se afirma entrega em dispositivo físico sem teste real.
- [OK] Métricas reais de fotos/arquivos privados, prévia e limpeza de fotos exclusiva do Master com confirmação forte e auditoria, sem excluir a OS.
- [OK] Backup/restore ZIP executável com dados e arquivos privados gerenciados, manifesto, checksums, validação, confirmação forte, backup de segurança, autorização Master, download privado, proteção Zip Slip e auditoria; framework/logs, backups e temporários de recuperação são preservados. Banco e filesystem não são apresentados como uma única transação atômica.
- [OK] Central de Configurações em cards funcionais com Dados da Empresa, Identidade Visual, Documentos, Garantia Geral e infraestrutura conforme perfil; nenhum card usa “Disponível” para função inexistente. Layout é explicitamente uma preferência local por dispositivo.
- [OK] Menu e telas administrativas respeitam o perfil: Master vê tudo; Administrador acessa a administração permitida sem gestão exclusiva do Master; Funcionário vê somente as operações permitidas. O backend permanece a autoridade de autorização.
- [OK] Usuários com pesquisa, criação, edição, perfis, ativação, proteção do último Master e redefinição de senha forte com hash/auditoria.
- [OK] Backup manual/automático, retenção protegida, heartbeat e guia de hospedagem/migração executáveis sem processo residente.

## Interface, qualidade e entrega
- [OK] Shell desktop responsivo com identidade configurável, menu, cards, filtros, tabela e cards mobile próprios.
- [OK] PWA instalável com manifesto completo, ícones 192/512, service worker e tratamento de notificações recebidas.
- [OK] Documentação de arquitetura e deploy KingHost.
- [OK] CI valida backend SQLite, backend MySQL 8, Composer audit, dependências PHP de produção `--no-dev`, npm audit, TypeScript, build e Playwright.
- [OK] Telas operacionais de clientes, Nova OS, listagem e visualização de OS usam backend real, com estados de carregamento, erro, vazio e validação.
- [OK] Clientes desktop usa composição lista + cadastro em telas grandes; Nova OS possui painel de Serviços/Produtos; mobile segue metodologia mobile-first e fecha o menu ao navegar.
- [OK] Etapa 7 administrativa ligada ao backend real, com telas responsivas e testes de segurança, históricos, catálogos, checklist e fotos.
- [OK] Playwright E2E versionado no `package.json`/`package-lock.json`, com SQLite isolado, seed próprio, servidor Laravel local, fluxo operacional principal, autorização por perfis, viewport mobile e `retries: 0`; execução real é exigida pelo GitHub Actions antes do merge.
- [OK] Preferência Automático/Web-PC/Mobile-Tablet persistida localmente por dispositivo, aplicada ao shell e validada pelo E2E; não existe configuração global `layout_mode` na tela de Settings.
- [OK] OS externa no mobile expõe atalhos WhatsApp, Maps, Foto, Status e Finalizar; a mensagem inicial do WhatsApp inclui OS e avarias registradas, e abrir a conversa não registra envio.
- [OK] Head técnico imediatamente anterior a este ajuste documental: `05e41622bf47fab8f943564cd6ab14408a339a00`, CI #286 com backend SQLite, backend MySQL 8, frontend e Playwright verdes após rerun controlado do E2E.
- [PENDENTE] Validação física do Web Push em Android/iPhone com HTTPS e VAPID reais; roteiro em `docs/HOMOLOGACAO_WEB_PUSH.md`.
- [PENDENTE] Homologação física de impressão A4.
- [PENDENTE] Deploy real na KingHost; o workflow manual de release está preparado e exige testes/auditorias/E2E antes de montar o pacote.
- [PENDENTE] Recuperação pública de senha por e-mail é opcional e não foi implementada; o reset administrativo Master permanece funcional.

## Auditoria da Etapa 10
- [OK] Painel operacional sem faturamento, com indicadores de OS, ações rápidas, dados reais, busca, filtro, ordenação e paginação.
- [OK] Mesa de Chamados usa endpoint dedicado sem paginação e retorna todas as OS abertas agrupadas pelos status operacionais; teste de backend cobre mais de 20 OS abertas.
- [OK] Seletor de status na OS; escolher Concluído encaminha obrigatoriamente à finalização.
- [OK] Visualização do cliente com dados atuais e histórico decrescente, valor, OS e PDF final quando emitido.
- [OK] Orçamento usa validade configurada; “Aprovar orçamento” altera somente o status, e os itens do orçamento aprovado só são usados quando a ação explícita da finalização é escolhida.
- [OK] Preferência Automático/Web-PC/Mobile-Tablet persistida localmente por dispositivo e aplicada ao shell.
- [OK] Perfis/menu role-aware com checagem E2E e autorização backend preservada.
- [OK] Serviços/Produtos permitem criar e editar preço, tipo e garantia adicional; Garantia Geral é persistida e historicamente snapshotada.
- [OK] OS externa possui atalhos mobile e WhatsApp pré-preenchido com avarias sem confundir abertura da conversa com envio confirmado.
- [OK] Backup automático persistido no banco, configurável somente pelo Master, auditado e respeitado pelo comando/scheduler.
- [OK] Zip Slip cobre barras invertidas, segmentos `..`, absolutos, drive letter, byte nulo, PHP e `.env`; restauração usa staging e semântica de snapshot apenas no domínio privado gerenciado.
- [PENDENTE] Referências visuais oficiais ainda precisam ser reenviadas e comparadas na homologação final; até essa etapa não se considera a comparação visual concluída.
- [PENDENTE] Homologação Web Push em Android/iPhone físico, impressão A4 física e deploy real na KingHost dependem de ambiente externo.
- [PENDENTE] Recuperação pública por e-mail permanece opcional enquanto SMTP não estiver definido.
