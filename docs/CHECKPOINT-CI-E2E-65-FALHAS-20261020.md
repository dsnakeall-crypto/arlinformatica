# CI ARL — Diagnóstico da execução vermelha em 20/10/2026

## Estado confirmado ao vivo
- Branch: release/integracao-completa-20261018
- HEAD local e remoto: 8280da1c799846e5c4b0cd120cc6f410ddb88088
- GitHub Actions run 39425236328 (8280da1): **FAILURE**.
- Jobs backend, backend-mysql, frontend: **SUCCESS**.
- Job e2e: **FAILURE**, falha no passo `npm run test:e2e` com 65 testes reprovados.
- A etapa iPhone/WebKit antecedente **passou**; correção anterior aea196a está comprovadamente em execução.
- Run 39423866112 (aea196a) apresentou igualmente 65 testes E2E reprovados.
- Execução Playwright local isolada em 8038 (`npm run test:e2e`): **240 PASS / 71 FAIL**, 311 testes, aproximadamente 55 minutos.
- Divergência de seis testes entre GitHub e local: há 11 arquivos E2E não versionados/diagnósticos, as configurações de teste e o ambiente local variam. Nunca inferir que resultados locais equivalem ao CI.

## Análise inicial
Várias falhas são contratos visuais e de navegação de versões anteriores:
- Testes procuram `Abrir menu`, `Gestor de Gasto`, `Financeiro` no dock, embora a barra Premium oficial aprovada use Painel, Clientes, + Abrir OS, Gastos, Menu e gaveta direita.
- Testes exigem menu lateral compacto antigo, slider/timeout do trilho flutuante antigo e tamanho anterior 36-44px, substituídos por dock 57px, círculos laterais 26px, central 30px.
- Testes de Gastos tentam clicar Projeção diretamente no dock; agora ela está na gaveta.
- Há também reprovações NÃO classificadas como mera divergência visual: Pós-venda, aviso de alterações não salvas em OS, ditado de laudo, financeiro/parcelas, importação e responsividade desktop. **Exigem investigação funcional e não devem ser simplesmente desativadas ou reescritas até perder sua verificação.**
- O teste menu-referencia-3d foi temporariamente adaptado apenas nas medidas e continuou reprovando (gradiente); essa tentativa foi restaurada do backup, sem commit, por falta de validação.
- Dados reais e servidor KingHost não foram acessados.

## Evidências
- Diagnóstico individualizado da rodada local: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\APP ARL\BACKUPS APP\CI-20261020-RADIUS\DIAGNOSTICO-E2E-71-FALHAS.md`
- Log integral local: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\APP ARL\BACKUPS APP\CI-20261020-RADIUS\e2e-full-8038.log`
- Log WebKit local 8037: **2 PASS**
- Backup de teste: `C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\APP ARL\BACKUPS APP\CI-20261020-RADIUS\mobile-nav-viewport.mobile.spec.ts`
- Correção e limpeza seletiva já publicadas nos commits aea196a e 8280da1.

## Plano de correção, SEM maquiar a CI
1. Criar matriz de rastreabilidade: para cada um dos 65 testes GitHub, classificar [legado visual], [navegação], [fluxo/regra], [instabilidade de fixture] ou [bug real].
2. Priorizar fluxos críticos: OS/orçamento/pós-venda, autenticação/permissões, dívidas/cobrança, financeiras e estoque.
3. Atualizar seletores somente quando for mudança aprovada de UI; preservar asserts de função, valores e permissões. Para testes obsoletos, escrever equivalentes da UI atual ANTES de descomissionar o anterior, com rastreabilidade explícita.
4. Corrigir bugs reais no app em arquivos mínimos, com backups, evitar efeitos no desktop/KingHost.
5. Rodar testes selecionados com porta E2E isolada, TypeScript/lint/build/phpunit, depois suíte integral (311 testes).
6. Commit seletivo somente com resultados fundamentados; push e aguardar quatro jobs verdes. Não alterar release.yml nem desabilitar o job.

## Gate atual
**BLOQUEADO PARA DEPLOY**. Não afirmar CIs verdes. Não enviar novo commit de testes incompletos.

## Triagem complementar do dock 3D em 20/10/2026
- CI do HEAD remoto 8280da1, run 39425236328, está encerrada: backend, backend-mysql e frontend SUCCESS; E2E FAILURE com 65 testes.
- Investigado `tests/e2e/menu-referencia-3d.mobile.spec.ts`: teste legado exigia 34+ px nos discos laterais, +10px no centro, 50% no raio de TODOS os ícones e `radial-gradient` como superfície. No layout aprovado medido pela instrumentação da aplicação real, os laterais têm 26px, centro vermelho 30×30px com `backgroundColor: rgb(188,9,43)`, `boxShadow` existente e `borderRadius:50%`; o gradiente do disco está ausente mas ele tem cor e profundidade visível, e os ícones laterais não exigem borda circular.
- Atualizado APENAS o teste para aceitar os dois acabamentos válidos (gradiente OU preenchimento com sombra), manter botão central circular, mínimo lateral 24px, central pelo menos 2px maior, sem transbordamento, cinco botões funcionais e estado Clean. Playwright isolado porta 8057: **2 PASS/0 FAIL**.
- Typecheck, lint, git diff --check PASS. Arquivo alterado local `tests/e2e/menu-referencia-3d.mobile.spec.ts` ainda **NÃO COMMITADO**, pois a suite completa permanece vermelha; não enviar CI repetida a cada teste parcial.
- Diagnóstico instrumental temporário copiado com SHA256 para backup externo CI-20261020-RADIUS e retirado do diretório tests/e2e.
- Planilha das 71 falhas locais com causas primeiras disponível no backup externo em `DIAGNOSTICO-E2E-71-FALHAS.md`.
- Próximos: preservar asserts de funcionalidade ao atualizar navegação de versões anteriores e investigar falhas reais de financeiro/OS/Pós-Venda em conjunto antes de novo push.
