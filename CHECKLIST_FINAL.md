# Checklist final — estado desta entrega

Legenda: **[OK]** implementado e verificável; **[PENDENTE]** exige continuação. A validação final de backend, testes, TypeScript e build é feita pelo GitHub Actions antes do merge; itens apenas visuais ou demonstrativos não contam como funcionalidade concluída.

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
- [PENDENTE] Disparo Web Push criptografado pelo backend (as inscrições, VAPID e recebimento no service worker estão preparados, mas a biblioteca PHP não pôde ser adicionada neste ambiente sem acesso ao Packagist).
- [PENDENTE] Backup/restore executável, limpeza segura de fotos e armazenamento/diagnóstico.
- [OK] Central de Configurações em cards com Dados da Empresa, Identidade Visual, Documentos e Layout básico; escrita restrita a Master/Administrador.
- [PENDENTE] Administração completa de usuários/permissões, armazenamento e backup/hospedagem.

## Interface, qualidade e entrega
- [OK] Shell desktop responsivo com identidade verde, menu, cards, filtros, tabela e cards mobile próprios.
- [OK] PWA instalável com manifesto completo, ícones 192/512, service worker e tratamento de notificações recebidas.
- [OK] Documentação de arquitetura e deploy KingHost.
- [OK] CI preparada para PHP, lint, testes, TypeScript e build.
- [OK] Telas operacionais de clientes, Nova OS, listagem e visualização de OS usam backend real, com estados de carregamento, erro, vazio e validação.
- [PENDENTE] Implementar módulos posteriores à Etapa 6, administração completa de catálogos e E2E Playwright.
- [PENDENTE] Comparação final em navegador com todas as referências e testes funcionais completos do Projeto Mestre.
