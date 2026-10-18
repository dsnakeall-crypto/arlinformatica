# ARL Informática — Fase 1 de auditoria e otimização segura
**Data:** 15/10/2026. **Estado:** testes funcionais pontuais aprovados; **suíte E2E integral ainda pendente**. Trabalho local, sem publicação.

## Preservação
Projeto oficial: `C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica`; cópia de QA: `%LOCALAPPDATA%\ARL-Informatica-Dev\FASE0-CANDIDATO-GITHUB`. Mantidos branch/HEAD originais, sem commit, reset, clean, push, migração, deploy, alterações financeiras ou mudanças de UI aprovada. Todos os testes com escrita operacional ocorreram em banco SQLite descartável gerado no servidor de testes Playwright.

## Testes E2E revistos e executados (cada um em cópia isolada)
1. `clients-management.spec.ts` — **PASS**. O cadastro na lista agora é apresentado como `#ID`; imagem do ícone Visualizar é o PNG oficial; o campo "Clientes por página" existe no topo e no rodapé e passou a usar seletor exato. Preservados testes de paginação, busca remota, ordenação e botões.
2. `desktop-expense-shell.spec.ts` — **2/2 PASS** (desktop e mobile). Com a regra atual, `.app-head` de Gastos não deve ficar visível; mantidos testes de menu lateral, shell e troca de páginas.
3. `eight-improvements-focus.spec.ts` — **PASS**. O campo Nova OS recebe foco dourado; o seletor de status conserva foco azul. Mantidas verificações de 2px de outline, valor de status, cor funcional e erro 422 acessível.
4. `eight-improvements.spec.ts` — **PASS**. Grid de Instituições mostra sete colunas calculadas no viewport 1600px aprovado; o teste antigo esperava cinco. Preservadas verificações de alturas, navegação, fundo e 1024px.
5. `post-sale-bulk.spec.ts` — **PASS**. Teste atualizado do antigo card para a tabela atual. Criou 11 OS concluídas em SQLite descartável, fez seleção de dez, cancelou confirmação sem escrita, excluiu somente os dez acompanhamentos após consentimento e verificou permanência das dez OS concluídas e de seus PDFs, mais o registro não selecionado.
6. `post-sale-pagination-30.spec.ts` — **2/2 PASS na rodada imediatamente anterior**. 65 registros simulados, páginas 30/30/5, busca, seleção entre páginas e exclusão dos últimos cinco com ajuste de página.

Os cinco arquivos E2E acima foram promovidos para `tests/e2e/` no projeto local após backup independente e comparação SHA256 de cada original. Os arquivos de runtime React/PHP/CSS **NÃO foram alterados nesta fase**. A paginação React de 30 foi implantada na rodada anterior.

## Baterias adicionais
- `npm run lint`: PASS; `npm run typecheck`: PASS; `npm run test:unit`: PASS (61 testes); `npm run build`: PASS no projeto original após promoção; `git diff --check`: PASS.
- Backend original com SQLite `:memory:` e PHP CLI 512MB: **400 testes / 7439 asserts PASS**, tempo ≈62s e memória registrada ≈102 MB. Não houve escrita no MySQL oficial.
- Na cópia QA, 399 PHP testes passaram e 1 falhou por **erro de infraestrutura do ambiente de testes**: a pasta `vendor` foi ligada por junction ao projeto original, então Composer PSR-4 carregava a classe `OfficialLetterhead` do original, enquanto o teste local procurava o mesmo recurso na cópia. Uma reflexão PHP confirmou `ReflectionClass::getFileName()` apontando para o original. Portanto, **não alterar papel timbrado, checksum ou classe de produção**; a CI precisará instalar seu próprio `composer install` na cópia limpa.
- Playwright detecta atualmente **290 casos em 117 arquivos**. A suíte integral permanece **NÃO EXECUTADA** nesta fase: o início remoto da bateria completa havia sido bloqueado por configuração de segurança da ferramenta, e não tentamos contornar o bloqueio.

## Falha importante NÃO disfarçada
- `clean-appearance.spec.ts` (Original/Clean e impressão) ainda **FALHA** porque estilos computados de impressão diferem entre tema Original e Clean (ex.: fundo de aside/main). Uma mudança experimental no teste removeu apenas exigência de coordenadas idênticas na tela, mas a divergência de impressão permaneceu; o arquivo original foi restaurado tanto na cópia QA quanto no projeto. Não reduzir a exigência sem avaliação específica do comportamento de impressão aprovado.
- `budget-sharing-layout.spec.ts` exige rolagem interna ≤1px no orçamento a 1280×720 e recebeu 38px na auditoria anterior. Layout e código do modal não foram modificados aqui. Precisa verificar se os controles finais seguem acessíveis e definir o contrato correto.

## CSS e desempenho
- Análise de 66 CSS e 6046 regras localizou **zero repetições consecutivas literalmente idênticas**; repetições não adjacentes podem interferir na cascata. Nenhum CSS foi apagado automaticamente.
- A paginação de Pós-venda implementada anteriormente reduz DOM/renderização a até 30 linhas, mas a API ainda entrega a lista inteira. **Não foi medido ganho de tempo de rede/SQL nesta fase**.
- Não houve alteração de componentes nem resultados de performance antes/depois que autorizem prometer aplicação mais rápida. Sugerido medir clique→feedback, chamadas de API e render quente/frio por setor, antes de otimizar.

## Próximas etapas
1. Manter a versão local aprovada protegida por backup/manifest e usar cópia isolada.
2. Resolver/validar impressão Original versus Clean, sem afetar templates PDF e sem refazer layouts aprovados.
3. Avaliar contrato de rolagem do orçamento e tornar acessibilidade explícita no E2E.
4. Testar os **290 E2Es** integralmente quando uma execução legítima estiver disponível; somar MySQL isolado para concorrência e autorização; repetir 77+ viewports e telas críticas.
5. Medir baseline de performance (React, CSS e SQL/API) e otimizar por causa demonstrada; não excluir arquivos só pela data/nome.
6. Revisar secrets/untracked e criar pacote GitHub reproduzível. Push e publicação somente após autorização posterior; banco real sempre preservado.

## Evidências
Logs sob `%LOCALAPPDATA%\ARL-Informatica-Dev\fase1-*.log`; arquivo de descoberta `fase1-e2e-lista.txt`; varredura CSS `fase1-css-adjacent-duplicates.json`; backups verificados dos seis testes anteriores e dos cinco originais promovidos dentro da pasta da Fase 0.
**Conclusão:** progresso de qualidade REAL e verificado; nenhum conserto fictício; duas verificações visuais ainda abertas; release NÃO liberado.

## Adendo final — PHP independente e pré-revisão do GitHub
- Foi criada segunda cópia de homologação em `%LOCALAPPDATA%\ARL-Informatica-Dev\FASE1-PHP-AUTOLOAD-INDEPENDENTE` com todos os **9662 arquivos PHP de `vendor` realmente copiados**, sem junction; o autoload refletido apontou corretamente para a própria cópia. Esta cópia NÃO tem .env real, nem storage privado, nem conexão ao banco oficial.
- Na primeira tentativa PHP, o clone sem .env falhou com `MissingAppKeyException`: correção de ambiente, NÃO de aplicativo. Com **APP_KEY fixa exclusiva para a execução de testes**, `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, cache/session descartáveis e CLI 512MB, o clone passou: **400 testes / 7439 asserts, PASS**, 62,2s, ~104MB. Confirmado novamente que o papel timbrado oficial conserva dimensões e SHA sem adaptação.
- Pré-auditoria estática do futuro GitHub (cópia candidata, não publicação): 951 arquivos considerados, ~24,5 MiB; regex de credenciais comuns (chaves GitHub/OpenAI/AWS/Google e cabeçalho de chave privada) **não encontrou correspondências** nos textos lidos. `.env.example` é apenas um template; o rastreamento não substitui varredura completa nem revisão humana de segredos/dados.
- Inventário de **127 logs diagnósticos versionados, ~6,05 MiB**, potencialmente removíveis de release. Arquivados e verificados SHA256 em `LOGS-DIAGNOSTICO-GIT-LEGADOS-NAO-EXCLUIR-ATE-REVISAO.tar.gz` e `MANIFEST-LOGS-LEGADOS-GIT.csv`, exclusivamente dentro do backup atual. **NENHUM log foi removido do projeto ou do Git nesta fase**; a exclusão segura ainda demanda revisão de referências e seleção de arquivos para lançamento.
- Dois PNG antigos/alternativos de Fixos de Casa somam ~3,23 MiB; não apagar sem investigar vínculos dinâmicos/BD e fidelidade das artes aprovadas.
- Depois dessas verificações, continuam **PENDENTES**: E2E integral 290 casos, contrato Clean/impressão, formulário orçamento a 720px, MySQL concorrente sob dados descartáveis e benchmarks de velocidade comparáveis. Nenhuma alegação de aceleração geral.

## Nova tentativa de E2E integral — 15/10/2026, rodada seguinte
Por autorização do proprietário, iniciou-se nova bateria E2E na cópia de trabalho `%LOCALAPPDATA%\ARL-Informatica-Dev\FASE0-CANDIDATO-GITHUB`, sem banco real, com `--workers=2 --max-failures=20`, porta de testes 8131. Nesta cópia, o runner descobriu **293 casos** durante a execução. O teste de Clean/Original **reproduziu a falha de igualdade de posições do Painel** (diferenças nas coordenadas/medidas dos cards e botão). A execução remota encerrou prematuramente com código de processo -1/4294967295 após **15/293** terem iniciado, sem resumo confiável da suíte. Portanto NÃO declarar suite completa e nem 15 aprovados. Evidência: `%LOCALAPPDATA%\ARL-Informatica-Dev\fase2-e2e-completa.log`.
O código funcional, os estilos e os testes do original **não foram alterados nesta tentativa**. Em particular, não resolver a divergência revertendo layout aprovado ou removendo validações de impressão. Próximo passo recomendado: executar E2E via terminal local diretamente (quando autorizado/operacional) com runner que suporte permanência, capturando relatório JSON/JUnit e separando estabilidade de infraestrutura dos defeitos de UI.
