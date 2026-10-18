# PLANO MESTRE — REFORMA MOBILE ARL + CLEAN + CONTROLE DE GASTOS
Data: 09/10/2026
Destino: Claude Code LOCAL, atuando EXCLUSIVAMENTE no projeto C:\laragon\www\arlinformatica
Status: ESPECIFICAÇÃO PARA EXECUÇÃO, NÃO IMPLEMENTAÇÃO CONCLUÍDA.

## ORDEM DE LEITURA OBRIGATÓRIA
1. AGENTS.md, docs/PROJETO_MESTRE.md, docs/REFERENCIAS_VISUAIS.md, README.md.
2. CHECKLIST_FINAL.md, docs/REFORMA_MOBILE_PERMISSOES_2026_10_09.md.
3. Este arquivo na íntegra.
4. Inspecionar arquivos alterados e não commitados (git status/diff); PRESERVAR tudo.
5. Consultar imagens de referência no repositório e o Word original do proprietário
   "Nesse card.docx" (disponível na conversa ChatGPT; especificação abaixo reproduz os pedidos).
6. Verificar testes existentes antes de implementar.
Não presumir que alterações parciais anteriores estejam concluídas.

## PRIORIDADES ABSOLUTAS
A. PRESERVAR a tela inicial/home do Mobile/Tablet que mostra os cartões de OS abertas:
   MESMA estrutura, ordenação e visualização dos cards; NÃO reformar essa tela.
   Não introduzir CSS global que a altere acidentalmente.
B. Refazer o RESTANTE do layout mobile como experiência própria, não web comprimida.
C. PC + mobile usam a MESMA base de dados, Laravel/PHP, API, regras de negócio,
   permissões, histórico, status e cálculos. Difere SÓ a apresentação/navegação.
D. Manter o visual Web/PC aprovado, alterando apenas o que foi expressamente solicitado.
E. A aparência CLEAN é a base estética preferida do proprietário.
F. Não mudar produção KingHost, não publicar, não tocar app Horímetro nem ERP-SaaS.
G. Não inventar novas regras comerciais/financeiras, especialmente 'descontos'.

## SEGURANÇA E BACKUP
- Projeto local: C:\laragon\www\arlinformatica (DDEV no WSL2).
- Existe um snapshot anterior em
  C:\Users\Allan\ARL-backups\mobile-rebuild-20261009\snapshot;
  CRIAR/VERIFICAR NOVA CÓPIA DO ESTADO ATUAL (inclui uncommitted) antes de editar.
- Nunca fazer git reset --hard, git clean -fd, sobrescrita indiscriminada,
  refatoração total sem revisão, nem excluir arquivos alterados.
- Banco DDEV já contém dados reais importados da KingHost. Não executar migrate:fresh,
  db:wipe, refresh de teste, seed/reset, exclusão nem tarefas que recriem o banco.
- Testes PHPUnit RefreshDatabase SOMENTE com banco isolado/verificado. Não rodar
  testes financeiros com RefreshDatabase contra o banco DDEV importado.
- Não copiar .env, segredos, fotos de clientes, banco, backups privados ou credenciais
  para modelos externos, commits, logs ou relatórios.
- API de produção e KingHost são intocáveis. Não alterar valores armazenados.
- Toda correção financeira deve ser cálculo de LEITURA sem migração destrutiva.
- Não editar vendor/, não quebrar autorização/perfil Administrador Simples e
  expense_control_access e não remover verificações de segurança.

## FASE 1 — DIAGNOSTICAR O MOBILE REAL E REGISTRAR O ESTADO INICIAL
Auditar em telas 320, 360, 375, 390, 414, 430, 768 e 1024 px e desktop 1366/1920.
Use Playwright com dados de teste isolados e screenshots REAIS das telas carregadas.
Verificar horizontal overflow, recortes, modais sem scroll útil, botões encobrindo
campos, header fixo, barra inferior, touch >=44px, ícones sem rótulo, foco e contraste.
Registrar problemas por tela e resolver causalmente, não com empilhamento de overrides.
Os testes só de 'não existe overflow horizontal' NÃO são suficientes: verificar
legibilidade, ações clicáveis, scroll, estados vazio/cheio e formulários completos.

## FASE 2 — MOBILE DO ZERO, EXCETO A HOME DE OS
Reprojetar e implementar telas específicas para celular, usando componentes responsivos
próprios quando necessário, reutilizando as mesmas funções/APIs e validações:
- Clientes: busca/filtro, lista legível, cartões responsivos, telefones/endereço e ações;
  Novo/Editar Cliente em formulário de uma coluna; nenhum campo/botão oculto ou cortado;
  histórico e PDFs acessíveis.
- Nova OS: abertura, cadastro, equipamentos, acessórios, fotos, campos obrigatórios,
  alertas de chamados existentes e confirmação; todos os fluxos intactos.
- Detalhe da OS: header compacto legível, identidade, cliente, equipamento,
  status/etapas, fotos, orçamento, serviço/produto, pagamento, PDF, Concluir,
  histórico e ações acessíveis; jamais reduzir campos financeiros a miniaturas
  ilegíveis; modais/painéis de finalização adaptados ao celular.
- Financeiro ARL: visão geral, períodos, totais, despesas, entrada rápida,
  recebimentos, movimentações, relatórios e filtros. Nada de aba horizontal
  com rótulos escondidos; todos os recursos visíveis por agrupamento mobile.
  NÃO misturar Financeiro empresarial ARL com Controle de Gastos pessoal.
- Pós-venda, Serviços, Produtos, Fornecedores, Estoque se existir, Agenda/Chamados,
  Usuários (se permitido), notificações e TODAS as demais telas acessíveis:
  redesenhar listas densas, botões, painéis e modais para uso vertical mobile.
- Configurações: em celular navegar por CATEGORIAS com cartões/menus completos,
  submenu de Sistema e retorno explícito, sem depender de arrastar abas para
  visualizar opções. Preservar controles existentes e autorizações por perfil.
- Modo menu inferior com atalhos Painel, Clientes, Abrir OS, Financeiro,
  Gestor de Gasto + acesso ao restante pelo menu; e modo menu lateral compacto
  com ícones/rótulos acessíveis. Os dois devem funcionar em 320px.
- Não sacrificar funcionalidades do PC; os dois layouts compartilham dados
  em tempo real e não exigem duplicar backend nem DB.

## FASE 3 — CONFIGURAÇÕES > LAYOUTS
Criar/aperfeiçoar aba/submenu REAL 'Layouts' em Configurações:
1. Web / PC;
2. Mobile — barra inferior e menu lateral complementar;
3. Mobile — menu lateral compacto.
Cards modernos clicáveis, mini-prévia desenhada, indicador selecionado,
seletor evidente, sem selects simples feios. Salvar preferência por
dispositivo/usuário como já ocorre, sem alterar permissões.
INSPECIONAR as implementações parciais já presentes em
resources/js/layouts-settings.tsx, settings-page.tsx e main.tsx.
Não duplicar páginas, não apagar estado atual do trabalho.

## FASE 4 — CLEAN PREMIUM, BONITO E LEGÍVEL (WEB E MOBILE)
O proprietário AMA o modo Clean e quer manter essa identidade, mas hoje os
botões ficaram brancos e sem personalidade visual.
- Fundo branco/cinza claro com sutis matizes da paleta configurada, não template genérico.
- Efeito 3D leve: gradientes discretos, bordas finas, luz superior, sombra de
  elevação suave, estados hover/pressed/selected e profundidade.
- Transparência/glass controlada, se melhora o visual, NUNCA perder legibilidade
  do texto/dado. Sem blur exagerado ou efeito pesado que aumente latência.
- Botões com hierarquia: primário visível, secundário elevado, neutro, perigo,
  ativado, desativado. Evitar todos branco liso ou só sombra vermelha.
- Preservar contraste alto, estados semânticos, teclado, toque e prefers-reduced-motion.
- Preservar variantes não-Clean e escolha de cor/acento.
- Cuidado: clean-appearance.css contém overrides amplos; limitar alterações
  ao tema Clean, priorizar tokens e exceções necessárias. O Controle de Gastos
  tem identidade própria: melhorar responsividade sem alterar sua aparência
  aprovada, salvo refinamentos Clean pedidos que respeitem sua identidade.
- Não alterar o desenho da HOME MOBILE de OS.

## FASE 5 — CONTROLE DE GASTOS, REGRAS DEFINITIVAS (MESMO BACKEND WEB/MOBILE)
ESTE É O TRECHO MAIS CRÍTICO. Preservar lançamentos, pagamentos, parcelas e
dados existentes. É app de VISUALIZAÇÃO/ACOMPANHAMENTO DE DÍVIDAS PESSOAIS;
NÃO é contabilidade, fluxo de caixa ou financeiro empresarial.
Não adicionar funcionalidade de desconto nova. Se existem créditos antigos do
tipo 'discount' no código, preservar a compatibilidade e o histórico.

Card por responsável: REMOVER o card separado 'Casal' da área com cards de
pessoas. Mostrar apenas os cards individuais Allan e Carol (nomes devem vir
dos dados configurados, não hardcoded), ambos com CINCO informações:
  Valor Pessoal = valores ORIGINAIS exclusivamente da pessoa no mês;
  Valor Casal = parte ORIGINAL daquela pessoa nas dívidas compartilhadas do mês;
  Pago / Abatido = créditos já aplicados à parte daquela pessoa, incluindo
       pagamentos normais e antecipações; se houver abatimento legado, respeitar
       redução real já registrada, sem criar nova operação.
  Valor Total = Valor Pessoal + Valor Casal (ORIGINAL; NÃO DIMINUI ao pagar).
  Falta pagar = Valor Total - Pago / Abatido (reduz com baixas).
Exemplo obrigatório: Allan Pessoal R$1.000 + Casal R$500 = Valor Total
R$1.500. Já pagou/adiantou R$500 => Pago/Abatido R$500 e Falta pagar
R$1.000. Valor Total continua R$1.500 até virar outro mês/alterar a dívida.
Carol idêntico, com parte própria.
R$400 de casal com divisão POR VALORES R$300 Allan / R$100 Carol:
  Valor Casal Allan = R$300; Valor Casal Carol = R$100.
O código já contém split_mode='amount' para compras únicas/parceladas
e split por percentuais; PRESERVAR essas regras exatamente. Dívidas
recorrentes mensais têm regra existente de divisão percentual, não mudar.

Painel superior (PC e mobile):
- Passar de 4 para CINCO indicadores: (1) Total a pagar no mês,
  (2) Total Allan, (3) Total Carol, (4) Total Casal,
  (5) Próximo Pagamento (a DATA relevante do próximo vencimento pendente).
- Total a pagar no mês SEMPRE valor ORIGINAL agregado do mês; pagamentos,
  antecipações e abatimentos NÃO DIMINUEM esse indicador.
- Total Allan = Pessoal Original Allan + cota compartilhada original Allan;
  Total Carol equivalente; Total Casal = total original de todas as partes
  COMPARTILHADAS (já incluídas em Total Allan e Total Carol).
- Nunca somar 'Total Casal' novamente ao total Allan + Total Carol:
  DUPLICAÇÃO! Global Original = Total Allan + Total Carol.
- Distinguir de modo visual inequívoco ORIGINAIS versus FALTA PAGAR.
- Remover seletor superior 'visão geral' com três ícones Allan/Carol/Casal;
  não remover filtros financeiros úteis em outras telas.
- Ajustar cartões de cinco indicadores com fonte proporcional e grid
  adaptativo; no smartphone reflow em 1/2 colunas sem cortar dinheiro.
- PRESERVAR cálculos de fatura por instituição, pagamento, antecipação,
  parcela, conta individual, casal, estorno, histórico, projeções.

IMPLEMENTAÇÃO MATEMÁTICA:
- Obter soma de cada parcela original pelo responsável, e por origem
  (pessoal versus compartilhado), do endpoint de RESUMO único.
- Somar créditos por DESTINATÁRIO da parte da dívida, não por paid_by:
  paid_by é QUEM desembolsou, podendo não ser o titular da cota.
- Retornar campos adicionais na API, de forma ADITIVA/compatível com
  clientes anteriores; NÃO alterar os significados dos campos existentes.
- Calcular em CENTAVOS inteiros no backend, não com floats JS nem com
  strings formatadas para cálculo.
- Confirmar invariantes:
    total_allan_original + total_carol_original == total_global_original
    total_casal_original == soma das cotas originais compartilhadas
    falta_allan + falta_carol == falta_global
    original_responsavel - baixas_responsavel == saldo_responsavel
  Inclua pagamentos parciais, adiantamentos, abatimentos legados e estornos.
- Favor seguir a regra EXPLICADA E CONFIRMADA PELO PROPRIETÁRIO NESTA CONVERSA;
  não inventar regra de 'Valor Total ajustado' que diminui com adiantamento.

MOBILE DO CONTROLE DE GASTOS:
- É miniapp visual próprio com navegação inferior pessoal (Resumo, Gastos,
  Adicionar, Instituições, Projeção); Quitadas em Gastos e Pagamentos na
  área correspondente; voltar para ARL; manter as funcionalidades reais.
- Atualmente quebrado: corrigir espaçamento, tabulação, modais, cards de
  instituições, compras, faturas, ações, detalhamento de parcelas, filtros
  e projeções. NADA cortado ou invisível no celular.
- Retirar card Casal e aplicar 5 indicadores e 2 cards pessoais também no
  mobile; mesmos valores do web, lidos do MESMO resumo/API.
- NÃO mexer na lógica de cobrança, responsabilidade, parcelas, projeções,
  cadastro por foto e divisão de valores.
- Testar a navegação do miniapp separada da barra inferior global da ARL:
  não sobrepor dois rodapés, não perder o botão de voltar.

## FASE 6 — TESTES FINANCEIROS OBRIGATÓRIOS (ISOLADOS!)
Dados artificiais por fixture: Allan pessoa R$1.000, Carol pessoa R$500,
Casal R$400 dividido em R$300 Allan e R$100 Carol:
- Total geral BRUTO R$1.900.
- Total Allan BRUTO R$1.300; Carol BRUTO R$600; Casal BRUTO R$400.
- Baixa antecipada Allan R$200 => falta Allan R$1.100.
- Baixa normal Carol R$100 => falta Carol R$500.
- Bruto global PERMANECE R$1.900; falta global R$1.600.
- Reconciliação com todas as partes, centavos arredondados consistentemente.
- Transferência paid_by Carol em parcela Allan deve baixar responsabilidade
  de Allan sem alterar o total original.
- Testar reembolso/estorno, várias faturas em mesma instituição, parcelas
  em diferentes meses, 50/50, 300/100, zeros, dívida quitada, mês sem dívidas.
- Assert mensagens/valores tanto no Web/PC quanto no mobile.
- Rodar testes existentes da feature e E2E, Playwright 320/360/375/390/
  414/430/768/1024 e 1366/1920; checar screenshots e scroll end-to-end.

## FASE 7 — ENTREGA COM EVIDÊNCIAS
- TypeScript (typecheck), lint, Vite build, PHP test (base isolada),
  Playwright visual/funcional e checagem de regressão dos fluxos críticos.
- Comparar screenshots ANTES/DEPOIS e registros de medida de overflow,
  screenshots de formulários, OS detalhe, Financeiro, Configurações, Controle.
- Limpar APENAS artefatos temporários próprios com segurança; não alterar
  arquivos existentes sem revisar. Não apagar novos arquivos de outros agentes.
- Não declarar OK telas não abertas/testadas. Registrar testes que falharam
  e motivos técnicos, etapas pendentes, métricas de performance se possível.
- Atualizar CHECKLIST_FINAL.md e relatório de implementação; commits
  separados e lógicos só se política de trabalho atual permitir; não publicar.
- Se precisar mudar regra de negócio, fazer operação destrutiva, comprar serviço,
  acessar produção ou requisitar nova credencial: PARAR e pedir aprovação.
- Trabalhar sequencialmente por etapas, com update ao proprietário e evidências.
- NÃO executar mudança ampla às cegas, e NÃO parar em um mockup estático.

## CONTEXTO TÉCNICO
Laravel/PHP backend + MySQL/MariaDB; React/TypeScript/Vite; DDEV WSL2.
Inspecionar: resources/js/main.tsx, settings-page.tsx,
layouts-settings.tsx (mudança parcial já existe),
resources/js/order-detail-react.tsx, finance-page.tsx,
clients-page.tsx, expense-control-page.tsx,
expense-control-mobile-summary.tsx,
resources/css/arl-mobile-reform.css, clean-appearance.css,
expense-control-mobile.css, order-detail-layout.css,
app/Http/Controllers/ExpenseControlController.php,
app/Services/ExpenseControl.php,
tests/Feature/ExpenseControlTest.php, tests/e2e/expense-control-mobile.spec.ts.
Observação: não se limitar a esses arquivos; mapear as telas reais primeiro.

APROVAÇÃO: solicitada pelo proprietário para implementação LOCAL completa após
auditoria e backup. Produção: explicitamente NÃO AUTORIZADA.
