# ARL Informática — Etapa 2: otimização do Controle de Gastos e Fornecedores
**Data:** 15/10/2026. **Escopo autorizado:** performance sem alteração de layout, banco, backend, permissões, cálculos, histórico ou arte. **Status:** implantado SOMENTE no código local aprovado, com testes e rollback; sem publicação no GitHub/KingHost.

## Estado e preservação
- Projeto local oficial `C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica`, branch `original-restaurado-20261014`, HEAD `53bb453` (HEAD não equivale ao estado aprovado, porque há alterações locais).
- Cópia isolada `%LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE`, com banco E2E descartável e sem uso de MySQL real.
- Antes de editar, backup com hashes SHA-256 de original e QA dos arquivos correspondentes na pasta `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\Backups\01 - 15-10-26 - 13-03 - PERFORMANCE-ETAPA2-ANTES`, com `MANIFEST-SHA256.csv`. Backup anterior de código completo/ Git da Fase 0/1 permanece preservado.
- Durante implantação, foi reconferido que cada arquivo oficial ainda correspondia ao hash do backup; copiados **exclusivamente** `resources/js/expense-control-page.tsx` e `resources/js/suppliers-page.tsx`; SHA-256 pós-cópia idêntico ao QA validado. Caso divergisse, script preparou rollback automático dos dois. Nenhum CSS, rota Laravel, SQL, arquivo privado, vhost, outra pasta de projeto ou deploy alterado.
- Outros arquivos locais já existentes (inclusive logs diagnósticos historicamente apagados) não foram tocados nem restaurados; nenhuma limpeza de Git.

## 1. O que mudou na programação
**Fornecedores:** os componentes `SupplierWorkspace`, `SupplierProductDetails` e `PurchasePayments`, antes importados imediatamente, agora usam `React.lazy` e `Suspense`, sendo baixados apenas ao entrar nos respectivos detalhes/abas/popups. A primeira tela padrão preserva seus dados, layout e ações. A espera inicial desses painéis sob demanda pode variar com a rede (o `Suspense` usa fallback nulo, sem mudança de layout final).
**Gastos:** `ExpenseSpendingHistory`, `ProjectionMonth` e `ExpenseMonthlyInvoice` agora são carregados sob demanda nas abas e janelas específicas. O cadastro por foto já era sob demanda e foi preservado. Sem mudança de API, SQL, saldos, operação financeira, cache ou permissão.
**Ambas:** formatador de dinheiro BRL `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` passou a ser criado **uma única vez por módulo** e reutilizado, mantendo a mesma formatação exata.

## 2. Redução de JavaScript na primeira abertura
Comparação reproduzível do grafo de imports do `public/build/manifest.json` + arquivos do Vite, antes e depois do mesmo conteúdo funcional.

| Módulo | Antes bruto | Depois bruto | Antes gzip estimado | Depois gzip estimado |
|---|---:|---:|---:|---:|
| Fornecedores (incremental) | 136,03 KiB | **100,42 KiB** | 35,23 KiB | **26,46 KiB** |
| Controle de Gastos (incremental) | 364,96 KiB | **357,91 KiB** | 75,04 KiB | **73,41 KiB** |

Fornecedores: redução de aproximadamente **26,2%** de tamanho bruto / **24,9%** de gzip estimado na primeira abertura. Gastos: aproximadamente **1,9% bruto / 2,2% gzip**. O restante do código vai para chunks adicionais que são carregados somente ao abrir seus respectivos conteúdos; bytes totais de uma sessão que usa *todas* as abas podem não diminuir. Gzip acima é cálculo local em disco, não benchmark direto de velocidade da KingHost.
**Microbenchmark isolado:** formatação BRL de 5.000 valores em Node demorou ~97 ms criando 5.000 objetos e ~2 ms reutilizando um objeto (cerca de 50x nessa operação). Não significa que a tela completa fique 50x mais rápida; não se mediu ganho global de FPS ou TTI nesta rodada.

## 3. Validações
- Na cópia otimizada: `npm run lint` PASS; `typecheck` PASS; `test:unit` (61 testes) PASS; `npm run build` PASS.
- E2E desktop em SQLite descartável: **19/21 casos PASS**, cobrindo Fornecedores, compra, recebimentos, abas adicionais, histórico e operações relevantes de Gastos. **2/21 falharam**, ambas preexistentes: `expense-control.spec.ts:626` espera botão de Notificações visível em Gastos (layout independente aprovado), e `expense-control.spec.ts:686` exige o antigo fundo azul no pagamento (layout dourado atual).
- **Contraprova real:** os dois cenários falhos foram executados novamente na mesma QA com os arquivos **ORIGINAIS restaurados e build original**. Resultado: **as mesmas duas falhas**. Portanto não foram introduzidas por esta otimização. Não corrigimos testes cegamente nem alteramos o layout só para passarem.
- E2E mobile/responsivo adicional: **8/8 PASS**, sem novas falhas.
- Após recuperar o código otimizado na QA e promover os dois arquivos, o projeto ORIGINAL passou em lint, typecheck, 61 unit, build e `git diff --check`. Os arquivos foram verificados por SHA256 na promoção.
- Logs e medição técnica estão em `%LOCALAPPDATA%\ARL-Informatica-Dev\PERFORMANCE-ETAPA2-20261015`, incluindo `bundle-stage2-before-after.json`, `stage2-focused-e2e.log`, `stage2-mobile-e2e.log`, `baseline-two-old-failures.log`, arquivos de lint/build/unit e `promover-etapa2.ps1`.
- Bateria PHP em SQLite memória será registrada no adendo após concluir; não declarar até verificar exit code.

## 4. Pendências e próxima investigação
- Atualizar com base no layout realmente aprovado **os dois testes E2E antigos de Gastos** em etapa de manutenção de testes, preservando checagens reais de comportamento. Não marcar suite integral E2E como verde.
- Medir em navegador real, com cache frio/quente, o tempo de montagem, requisições e renderização das subabas de Gastos e Fornecedores; o impacto transferido em gzip é pequeno especialmente para Gastos.
- Considerar novos recortes de CSS ou subcomponentes somente com comparação visual rigorosa e medição, pois o CSS aprovado possui cascata complexa.
- Depois atacar queries PHP/MySQL e PostSaleService com massas sintéticas e autorizações; manter banco oficial intacto.
- Não publicar no GitHub/KingHost automaticamente.

## Adendo final — PHP e status de aprovação
A bateria backend foi executada DEPOIS da promoção ao original, com `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` e PHP CLI 512 MB: **400/400 testes e 7.439 assertions PASS**, 70,6 s, memória máxima 104 MB. Log no diretório externo de evidências `original-phpunit-etapa2.log`. Nada foi enviado/escrito ao banco MySQL oficial.
O projeto ORIGINAL também passou `npm run lint`, `npm run typecheck`, `npm run test:unit` (61), `npm run build` e `git diff --check` após aplicar a otimização.
**Decisão:** Etapa 2 aplicada localmente e validada, com **27 de 29 E2Es dirigidos aprovados** e **2 E2Es antigos reprovados também na versão anterior à otimização**. A suíte E2E total de 293 casos NÃO foi concluída neste ciclo; não declarar release aprovado. Próximo foco: revisar os dois contratos obsoletos e medir cenários reais de rede e processamento sem mascarar falhas.
