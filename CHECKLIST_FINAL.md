# Checklist final — estado desta entrega

Legenda: **[OK]** implementado e verificável; **[PENDENTE]** exige continuação. A validação automática final de backend, testes, TypeScript e build é feita pelo GitHub Actions antes do merge; validações físicas/produção continuam externas.

## Base e segurança
- [OK] Arquitetura Laravel/PHP + MySQL/MariaDB e React/TypeScript, sem Supabase/OpenAI e sem Node permanente em produção.
- [OK] Modelagem com chaves, índices, snapshots, auditoria, documentos, finanças, pós-venda e backups.
- [OK] Login protegido por sessão, CSRF e rate limit; perfis e autorização backend implementados.
- [OK] Instalador CLI de uso único para o primeiro Master, senha forte e hash seguro.
- [OK] Administração de usuários exclusiva do Master onde aplicável e proteção do último Master ativo.
- [PENDENTE] Recuperação pública de senha por e-mail. É opcional para esta publicação enquanto SMTP não estiver definido; a redefinição administrativa segura pelo Master está funcional.
- [OK] Diagnóstico administrativo de banco, migrations, storage, espaço, backup, scheduler, fila, HTTPS, PWA e Web Push sem expor secrets.

## Operação
- [OK] Clientes: cadastro/listagem, validação CPF/CNPJ, busca/paginação, ViaCEP com fallback manual, edição auditada e histórico de OS.
- [OK] OS: criação/listagem, número transacional, snapshot, histórico, impedimento de exclusão e separação entre pagamento e status operacional.
- [OK] Fotos privadas com otimização, remoção de metadados e limite de tamanho.
- [OK] Abertura/consulta de OS com Bancada/Externo, equipamento, fabricante, problema, checklist, avarias, foto e Serviços/Produtos opcionais com preço/garantia relidos pelo servidor.
- [OK] Catálogos de equipamentos, fabricantes, Serviços/Produtos e checklist por equipamento com desativação sem apagar históricos.
- [OK] Orçamento com revisões imutáveis, cálculo em centavos, aprovação/recusa auditável e garantia por item.
- [OK] Finalização obrigatória antes de Concluído, com laudo, itens/snapshots, desconto validado, garantia e orçamento aprovado autoritativo no servidor quando explicitamente escolhido.
- [OK] Laudos técnicos com modelos, rascunho/emissão, revisões imutáveis, fotos e avaliação de dano elétrico.

## Documentos e financeiro
- [OK] PDFs privados de termo, orçamento, laudos, fechamento e relatório financeiro A4, com snapshots, revisão/checksum e ações de visualizar/imprimir/baixar.
- [OK] Pagamento separado do status operacional; Entrada Rápida, Caixa Diário, Visão Geral, movimentações e fechamento mensal ligados às transações reais.
- [OK] Relatório mensal carrega sob demanda e não bloqueia a abertura do Financeiro.
- [OK] Dados da empresa persistentes, logo privada em seis variantes proporcionais e documentos com dados dinâmicos.
- [OK] Instagram oficial inicial alinhado para `https://www.instagram.com/allanluttembarck`; valores persistidos em Configurações prevalecem.
- [OK] Cores globais configuráveis e preservadas no snapshot histórico dos documentos.
- [OK] Garantia Geral configurável e snapshotada; itens sem garantia adicional não imprimem texto artificial de “sem garantia”.
- [OK] Laudo geral/dano elétrico com responsabilidade técnica e registro fotográfico.
- [OK] Referências visuais oficiais de Painel/Menu, Clientes, Nova OS, Status/OS, PDF A4, Pós-Venda, LOGO e TIMBRADO foram reenviadas em 04/09/2026 e registradas em `docs/REFERENCIAS_VISUAIS.md` com nomes e SHA-256.
- [OK] Captura automática de homologação sincronizada com dados reais; não fotografa mais o estado transitório de loading.
- [OK] Comparação visual automatizada revelou e corrigiu overflow das ações de Clientes no desktop e quebra excessiva do telefone no mobile. O Playwright agora mede a contenção dos botões, alvo de toque >=44 px, telefone `nowrap` e ausência de overflow horizontal.
- [OK] PDF final do artefato de homologação validado como página única A4, sem corte/overlap observado na renderização automática.
- [PENDENTE] No ambiente real, cadastrar a `LOGO.png` oficial em Configurações e gerar um documento de conferência com a imagem real. O fallback textual `ARL` é apenas para instalação ainda sem logo configurada.
- [PENDENTE] Homologação física de impressão A4 em impressora real.

## Relacionamento, plataforma e administração
- [OK] Pós-venda simplificado/auditado com confirmações independentes, snapshots, lembrete idempotente e novo ciclo sem apagar a OS.
- [OK] Central interna de notificações, PWA, service worker, inscrições Web Push por dispositivo e catch-up/throttle.
- [OK] Web Push backend com `minishlink/web-push` v11, VAPID por configuração segura, payload mínimo e tratamento de inscrições expiradas.
- [PENDENTE] Validação física do Web Push em Android/iPhone com HTTPS e VAPID reais; roteiro em `docs/HOMOLOGACAO_WEB_PUSH.md`.
- [OK] Métricas/limpeza de fotos, Backup/restore ZIP com manifesto/checksums, proteção Zip Slip, staging, backup de segurança e autorização Master.
- [OK] Configurações em cards funcionais; seletor Web/PC e Mobile/Tablet é preferência local por dispositivo, com Web/PC como padrão e migração do valor antigo `automatic`.
- [OK] Menu/telas respeitam Master, Administrador e Funcionário; backend permanece autoridade de autorização.
- [OK] Backup manual/automático, retenção, heartbeat e guia de hospedagem/migração sem processo residente.

## Interface, qualidade e entrega
- [OK] Shell desktop responsivo, menu, cards, filtros, tabela e experiência mobile própria.
- [OK] PWA instalável com manifesto válido, navegação `standalone`, cores pretas, caminhos relativos para shared hosting, ícones 192/512/maskable e tags favicon/Apple Touch Icon.
- [OK] Documentação de arquitetura e deploy KingHost.
- [OK] CI valida backend SQLite, backend MySQL 8, Composer audit, dependências PHP de produção `--no-dev`, npm audit, TypeScript, build e Playwright.
- [OK] Telas operacionais usam backend real e tratam loading, erro, vazio e validação.
- [OK] Clientes desktop usa composição lista + cadastro; Nova OS usa painel de Serviços/Produtos; mobile é mobile-first.
- [OK] Playwright E2E versionado com `retries: 0`; não são usados `force:true`, clique JavaScript ou timeout artificial para esconder defeito.
- [OK] Preferência Web/PC ou Mobile/Tablet é local por dispositivo; não existe opção Automático nem `layout_mode` global em Settings.
- [OK] Mobile/Tablet explícito limita a navegação a OS abertas, Nova OS e Clientes; URL fora do alcance retorna ao início sem alterar autorização backend.
- [OK] Barra inferior fixa com OS abertas, Nova OS e Clientes respeita a safe area e está presente em todas as telas mobile.
- [OK] Card abre a OS mobile somente para leitura com cliente, equipamento, problema, checklist, serviços, WhatsApp e Rota; fotos, laudo, orçamento, pagamento e finalização não são renderizados.
- [OK] Web/PC preserva o fluxo completo, incluindo Foto, Status e Finalizar; a restrição mobile anterior de atendimento externo foi substituída pelo modo somente leitura desta etapa.
- [OK] Runtime PHP do servidor embutido E2E fica sem Zend OPcache; verificação explícita impede regressão do ambiente de teste sem alterar OPcache de produção.
- [OK] Persistência do tema após reload sincronizada com a resposta real de `GET /api/theme`.
- [OK] Workflow temporário `.github/workflows/diagnose-segfault.yml` removido; não permanece na branch.
- [OK] Último head **técnico** validado antes do fechamento documental: `cdffc543df5c147b64b9c87f14a20831145d962a`, **CI #356** integralmente verde: backend SQLite, backend MySQL 8, frontend e Playwright E2E. O E2E executou **26 testes, 26 aprovados**, sem SIGSEGV/queda do servidor observada no log.
- [PENDENTE] O head documental final criado após este checklist precisa passar novamente pela CI antes de qualquer autorização de merge.
- [PENDENTE] Executar manualmente o workflow **Preparar release** no head final e conferir o artefato `.tar.gz` + `.sha256`; o conector atual não oferece `workflow_dispatch`.
- [PENDENTE] Deploy real na KingHost e smoke test no ambiente real.

## Auditoria da Etapa 10
- [OK] Financeiro destaca "Recebido no mês" e "A receber", reúne os indicadores de hoje em um card, exibe recebido/gasto/sobrou e permite trocar o mês no topo; o gráfico mostra todos os dias do mês em barras finas, sem rolagem horizontal, preservando eixo, valores e datas brasileiras.
- [OK] Painel operacional **sem faturamento**, com indicadores de OS, ações rápidas, dados reais, busca, filtros, ordenação e paginação. A referência histórica com faturamento não substitui essa regra atual.
- [OK] Mesa usa endpoint dedicado sem paginação e retorna todas as OS abertas nos status operacionais.
- [OK] Status Concluído encaminha obrigatoriamente à finalização; `Pago` não é reintroduzido como status porque pagamento é domínio separado.
- [OK] Cliente mostra dados atuais e histórico decrescente com valor/OS/PDF quando emitido.
- [OK] Orçamento aprovado só fornece itens à finalização mediante escolha explícita, e o servidor relê os dados autoritativos.
- [OK] Perfis/menu role-aware e autorização backend preservados.
- [OK] Serviços/Produtos e Garantia Geral persistentes e historicamente snapshotados.
- [OK] Backup automático persistido/auditado e restauração com staging no domínio privado gerenciado.
- [OK] Pós-Venda mantém o modelo simplificado do Projeto Mestre mesmo que a referência histórica mostre uma tela de automação mais complexa.
- [PENDENTE] Logo real configurada + impressão A4 física + Web Push físico + deploy/smoke KingHost dependem do ambiente externo.
- [PENDENTE] Recuperação pública por e-mail permanece opcional enquanto SMTP não estiver definido.

## Gate de publicação/merge

Não interpretar “Able to merge” como autorização. Antes de liberar merge/publicação definitiva:

1. CI do **head final** com SQLite + MySQL + frontend + E2E verde.
2. Workflow manual **Preparar release** concluído com artefato válido.
3. KingHost configurada com PHP/MySQL/HTTPS e deploy do pacote aprovado.
4. Cadastrar a LOGO oficial no ambiente real e conferir PDF; realizar impressão A4 física.
5. Testar PWA/Web Push em dispositivo real quando VAPID/HTTPS estiverem configurados.
6. Smoke test real: login, banco, OS, clientes, fotos, PDFs, financeiro, backup, scheduler/heartbeat e diagnóstico.
7. Merge continua sendo ação manual do proprietário; não fazer automaticamente.

## Configurações — correções da tela atual
- [OK] Alterações em Dados da Empresa são enviadas ao backend, persistidas e recarregadas pela interface; a regressão possui cobertura E2E.
- [OK] A barra geral de salvar aparece somente nas abas com configurações editáveis por esse formulário e não antecede o conteúdo de Armazenamento.
- [OK] A navegação de Configurações exibe em uma única linha somente Empresa, Identidade, Documentos, Garantia, Notificações, Backup, Sistema e Armazenamento; recursos ocultos continuam preservados no código e no banco.
- [PENDENTE] O CEP da empresa continua vazio porque não há valor cadastrado em `settings` e o valor inicial oficial também não foi fornecido; nenhum CEP foi inventado.

## Continuação da PR #11 — papel timbrado oficial
- [OK] `papel-timbrado.png` validado em runtime e por teste com 1055 × 1491 px e SHA-256 `5e640a129a7b33d954e9f3b44a872b6f003ed8266f30039a578c11fe599e0087`, sem alteração do arquivo recebido.
- [OK] Orçamento e PDF final usam a base A4 compartilhada, com fundo integral e área útil de 180 × 195 mm (margens 68/34/15 mm), sem redesenhar ou duplicar logo/dados empresariais.
- [OK] Termo permanece fora do papel timbrado e novos termos incluem o parágrafo LGPD; versões e PDFs já emitidos permanecem imutáveis.
- [OK] Geração de orçamento ocorre em modal com busca do catálogo, itens, quantidades, valores e total, mantendo o fluxo E2E de geração e aprovação.
- [OK] Histórico do cliente lista todas as revisões de orçamento e oferece acesso ao PDF preservado.

## Financeiro — Parte 3C
- [OK] Despesa simples de material de uso registra apenas data, descrição e valor; Master/Administrador podem criar e excluir, sempre com auditoria e exclusão lógica.
- [OK] Despesas alimentam Gasto/Sobrou no mês selecionado e aparecem em vermelho, no dia correspondente, junto das entradas do gráfico.
- [OK] Entrada Rápida no Painel, Financeiro e cabeçalho Mobile/Tablet aceita somente o valor; descrição curta é opcional e, quando vazia, preserva o padrão do backend. O atalho mobile não libera acesso ao Financeiro.
