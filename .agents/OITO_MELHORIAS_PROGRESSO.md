# Checkpoint — oito melhorias ARL — 12/10/2026

Cópia isolada: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\02 - Desenvolvimento\arl-oito-melhorias-20261012
Branch: codex/oito-melhorias-20261012
Base publicada: e90f11fea20839e573df7a40d67489301dbcaad7
Backup externo verificado: C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\oito-melhorias-base-20261012-012927 (ZIP e bundle Git verificados).

## Estado preservado
- Implementados backend de pagamento por responsável/dívida, prévia verificável, distribuição por vencimento, idempotência e transação no mecanismo financeiro existente.
- Valor personalizado significa dinheiro efetivamente pago, conforme resposta do proprietário.
- Implementados totais por instituição incluindo parcelas futuras, sem materializar parcelas durante cálculo.
- Interface inicial de pagamento rápido, identificação compacta das parcelas e aria-pressed dos botões de atendimento implementados, ainda em validação.
- Pendente: criar CSS importado arl-eight-improvements-20261012.css; o build neste checkpoint ainda está incompleto.
- Pendente: validar concorrência real, CSRF, regressão financeira, Playwright das oito alterações, lint, TypeScript, build e testes unitários.
- Pendente: corrigir cancelamento de prévia da interface (loading), revisar efeitos colaterais, pacote/publicação revisáveis e relatório final.
- Nenhuma migration nova. Nenhuma alteração no repositório original ou em produção. Nenhum push.

## Evidências
- PHPUnit ExpensePersonPaymentTest: 10 testes, 112 assertions aprovados em SQLite isolado.
- Uma assertion adicional de saldo futuro por instituição foi acrescentada depois e precisa ser reexecutada.
- Sintaxe PHP do controller e serviço aprovada antes das últimas mudanças; repetir ao concluir.
- Uso consultado: 76% consumido / 24% restante da janela de 300 minutos. Este registro é uma medição pontual, não previsão.

## Retomada
Executar na cópia isolada acima:
    git status --short
    git branch --show-current
    git log -1 --format=%H
    $env:APP_KEY='base64:'+ [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    php vendor/phpunit/phpunit/phpunit tests/Feature/ExpensePersonPaymentTest.php
    npm run lint
    npm run build
    npm run test:unit

O hash deste checkpoint é obtido por git log -1 e registrado também no arquivo externo CHECKPOINT-OITO-MELHORIAS.txt dentro do backup. Nunca executar comandos de escrita na cópia original. Não ativar release sem autorização final expressa.

## Checkpoint 2 — validações incrementais
- CSS das oito melhorias criado; build agora aprovado. Cancelamento de prévia corrige estado de loading.
- Lint e TypeScript aprovados; testes unitários: 51 aprovados.
- PHP financeiro/regressão: 63 testes, 977 assertions aprovados (SQLite isolado).
- Playwright rápido desktop e mobile: 2 aprovados; confirma mês/valor parcial/total, preservação da outra parte, ausência de desconto e rejeição HTTP 419 sem CSRF.
- MySQL isolado local 127.0.0.1:33458, schema arl_oito_test_20261012, datadir confirmado em ARL-backups/missao-final-mysql-20261011/data: dois processos de usuários distintos com saldo compartilhado, somente uma gravação de 5000, segunda rejeitada 422. Três rodadas passaram.
- Importante: diagnóstico inicial da concorrência era uma fixture incorreta que consultava o usuário dentro da transação. Corrigida para reproduzir autenticação real. O mecanismo financeiro original foi mantido; comparação com ele também passou em três rodadas. Logs BEFORE/AFTER registram a investigação, não são evidência de defeito em produção.
- Regressão Playwright de gastos, valores compartilhados, correções de compra e responsividade, mais layout desktop/atendimento mobile: em execução no momento do checkpoint. Resultado ainda pendente.
- Pendente: revisão visual/evidências, testes adicionais de duplicação/retentativa concorrente, persistência de OS ao salvar/reabrir, segurança final, pacote e autorização expressa de ativação.
- Produção, banco oficial e repositório original permanecem sem alteração. Nenhum push.
