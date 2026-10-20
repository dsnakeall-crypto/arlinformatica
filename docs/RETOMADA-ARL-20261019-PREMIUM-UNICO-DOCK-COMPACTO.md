# ARL — Mobile Premium único e dock compacto ARL / Controle de Gastos

**Data:** 19/10/2026. **Status:** implementado e validado LOCALMENTE; aguarda aceite, regressão integral e CI GitHub antes de publicação.

## Decisão do proprietário
- O único mobile oficial do aplicativo ARL é o **Mobile Premium**.
- Manter opção Web/PC para desktop.
- Antigos layouts Mobile com barra inferior clássica e Mobile compacto não devem mais aparecer em Configurações.
- O Controle de Gastos é outro módulo e mantém seu visual próprio e suas regras financeiras, mas seu dock inferior deve ficar compacto no mesmo tamanho do dock da ARL.
- Na ARL: Painel | Clientes | + Abrir OS | Gastos | Menu.
- Na área financeira: Resumo | Instituições | Adicionar | Projeção | Gastos (nomes e fluxos existentes preservados).
- Os módulos internos da ARL receberam CSS visual Premium nas telas reais, sem substituir suas funções.

## Alterações locais
- resources/js/main.tsx: mobileNavMode inicial 'premium' e migração das preferências per-user `arl-mobile-nav-ID` anteriores (bottom/compact) para 'premium', sem mudanças no banco.
- resources/js/layouts-settings.tsx: LayoutSelection somente desktop/premium; somente duas escolhas Web/PC e Mobile Premium.
- resources/css/arl-premium-internal-pages-20261019.css: nova apresentação das áreas reais apenas sob .arl-mobile-premium-mode e compactação da barra ARL.
- resources/js/expense-control-page.tsx: carrega o CSS do dock financeiro compacto, sem mexer na lógica de pagamentos/parcelas ou divisões de pessoas.
- resources/css/expense-mobile-compact-dock-20261019.css: compactação exclusiva do dock do Controle de Gastos, cobrindo também o botão Adicionar enquanto desabilitado/carregando.
- tests/e2e/four-mobile-layouts-20261019.spec.ts: mantém nome histórico, agora verifica duas escolhas e migração das antigas.
- tests/e2e/premium-dock-compact-20261019.spec.ts: mede tamanhos reais e valida os botões ARL/Gastos.
- Os layouts antigos não foram apagados fisicamente do histórico; estão fora das opções e suas preferências são migradas. Cópias de segurança antes da alteração permitem reversão segura.

## Evidências conferidas
- TypeScript: PASS
- ESLint: PASS
- Build: PASS
- Playwright direcionado: **6 PASS / 0 FAIL** (Web↔mobile; opção exclusiva; migração; navegação ARL; Gastos; ambos os docks).
- Navegador real no viewport CSS 390×844:
  - Dock ARL: altura 59 px; cinco botões com altura 49 px.
  - Dock Gastos: altura 59 px; cinco botões com altura 49 px (inclusive Adicionar).
- Capturas do navegador real de teste, com dados do E2E: ARL-DOCK-COMPACTO-REAL.png e GASTOS-DOCK-COMPACTO-REAL.png.
- Backup dos arquivos e hashes em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\MOBILE-PREMIUM-UNICO-DOCK-MENOR-20261019
- O banco persistente com dados fictícios da prévia permanece isolado, em Backups/ARL-PREVIA-DADOS-20261019/preview-persistente.sqlite.

## Segurança e próximos gates
- Git ainda no HEAD 8903365, alterações locais sem commit/push; não usar git add ., git clean ou reset --hard.
- KingHost e banco oficial **NÃO ALTERADOS**.
- A aprovação visual e os testes integrais/CI de backend, MySQL, frontend e E2E ainda são gates de publicação.
- Conferir novamente o Financeiro com dados de dívida e pagamento real de TESTE antes do deploy, sem alterar regras já aprovadas.
