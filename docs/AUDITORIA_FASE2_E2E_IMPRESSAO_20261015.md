# ARL Informática — Fase 2: estabilidade E2E, impressão Clean, orçamento
**Data:** 15/10/2026. **Estado:** AUDITORIA EM EXECUÇÃO (ver resultado integral antes de liberar).

## Proteção
- Original local: `C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica`, Laragon, branch `original-restaurado-20261014`, HEAD `53bb453` mais alterações locais aprovadas.
- Cópia independente de testes: `%LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE`, com `vendor` PHP próprio, Node dependências em ligação de desenvolvimento, build local e SQLite descartável.
- SEM alteração de banco oficial, servidor, usuários reais, outros projetos ou GitHub. Nenhum novo CSS funcional foi promovido ao original nesta fase.

## Achado 1 — Impressão do tema Clean
- Diagnóstico com `tests/e2e/qa-clean-print-metrics.spec.ts` (somente QA): `@media print` do Clean exibia lateral vermelho-preta legada, enquanto o Original usava imagem dourada e o main perolado. Diferenças de y dos cards eram da apresentação em tela entre temas, não prova de recorte na impressão.
- Correção experimental **SOMENTE NA CÓPIA**: adicionar exclusivamente dentro de `@media print` ao final de `resources/css/clean-appearance.css` regras restritas à lateral `#arl-main-sidebar` do desktop, reproduzindo a arte `arl-gold-sidebar-photo-continuous-20261014.webp` na escala 240px × 941px, borda e sombras, e restaurar fundo perolado de main no Painel/Ordens. CSS para tela e Mobile não foi modificado.
- `clean-appearance.spec.ts` somente na QA: em TELA manter igualdade geométrica da moldura (aside/main), dimensões e ausência de overflow, permitindo diferenças de espaço dos cards aprovadas; em IMPRESSÃO comparar rigorosamente cores/fundos/bordas/sombras/raios dos 5 seletores representativos. Restauração Original mantida.
- **E2E focado PASS**: `print-parity-focused-v2.log`. Build QA PASS.
- Backup QA anterior protegido em `Backups/...FASE-00-VERSAO-LOCAL-APROVADA/FASE2-IMPRESSAO-ANTES`.
- O comando de comparação para promoção ao original foi bloqueado pela segurança do Desktop Commander; **não foi contornado** e os arquivos QA **não foram promovidos**. Aguardar verificação/autorização operacional segura para aplicar.

## Achado 2 — Orçamento em viewport baixa
- A cópia QA possuía `budget-sharing-layout.spec.ts` ANTIGO (exigia scroll interno de no máximo 1px e falhava com 38px). O teste **ATUAL do original** permite rolagem interna para manter todos os campos e rodapé acessíveis, preservando conteúdo e funções.
- Sincronizado somente o teste atualizado do original para QA. **E2E completo do orçamento PASS** (`budget-current-e2e.log`): viewport 1366×768, 1280×720, mobile 390×844; editor, geração e download PDF, link de compartilhamento e teste CSRF 419, aprovação, confirmação humana. Dados simulados apenas no banco descartável.
- NENHUMA alteração ao CSS/React de orçamento.

## Achado 3 — Estabilidade do runner remoto
- Execução integral anterior era encerrada pelo tempo da sessão remota por volta de 15/293 casos, sem resumo confiável.
- Novo runner iniciou como processo local independente, com porta 8259, um worker, `--max-failures=25`, reporter dot e logs direcionados a `%LOCALAPPDATA%\ARL-Informatica-Dev\QA-FASE2-20261015\integral-stdout.log` e `integral-status.txt`.
- PID inicial do runner: 36152, início registrado 15/10/2026 09:54:40 (-03:00); testando SQLite em diretório QA isolado. **Verificar `END=... EXIT=...` antes de afirmar resultado.** A suite não usa banco MySQL oficial.
- Falhas do runner completo ainda NÃO classificadas neste ponto.

## Próximos passos
1. Obter término/relatório da suíte integral ou seu limite de falhas, separar regressões reais de testes antigos; registrar totais exatos.
2. Se houver autorização técnica e comparação de hashes possível, promover print-only CSS e teste Clean ao original após nova cópia SHA256; executar build/lint/typecheck/61 unit + E2E.
3. Testar mais resoluções, PDF e telas críticas com dados descartáveis; nenhum deploy sem aprovação posterior.
