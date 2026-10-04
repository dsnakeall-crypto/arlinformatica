# Menu lateral: abertura somente pelo botão de fixação

## Resultado

Commit funcional: `6f34d448a0af92bcfb49d7eaddf72e5af6275ae0` na branch `codex/pos-venda-selecao-em-lote`.

No Web/PC, desfixar mantém o menu recolhido em 58px. Passar o mouse mostra o nome dos botões pelo tooltip nativo, sem expandir o menu ou deslocar a página. Fixar abre o menu de 240px. A preferência autenticada do backend determina a largura também após recarregar; a antiga chave local não interfere. Mobile/Tablet mantém sua navegação própria. Sem mudanças no backend, migrations, autorização ou dados comerciais.

## Backup e preparação

Backup externo anterior à edição: `C:/Users/Allan/ARL-backups/sidebar-static-20261004-135625`. ZIP com 2.099 arquivos, hashes e CRC verificados; alterações locais e histórico Git completo preservados em bundle validado. Dependências reinstaláveis excluídas do backup; alterações preexistentes não foram incluídas no commit.

Build local atualizado. Pacote completo preparado a partir de clone do commit oficial, com Composer sem dependências de desenvolvimento, build novo e arquivos estáticos/OCR. Manifesto e arquivo tar.gz verificados: 7.720 arquivos; identidade e SHA-256 registrados externamente em `release-package.json` no backup desta etapa. Sem `.env`, banco, storage privado, testes, backups ou credenciais. Antes do deploy, a identidade do pacote deve corresponder exatamente ao commit aprovado na CI.

## Validação

- Seis testes específicos do menu passaram, incluindo hover em todos os botões, geometria estável, navegação por ícone, preferência autenticada após recarga, chave local antiga, menu expandido/recolhido em 1280/1920px e destinos mobile.
- Teste de adaptação desktop passou nas oito dimensões e onze telas.
- Capturas dos menus expandido e recolhido revisadas visualmente em 1280/1920px.
- 22 testes frontend, lint, TypeScript/build, Pint e auditoria npm de runtime sem vulnerabilidades aprovados.
- 307 testes PHP em SQLite e 307 em MySQL isolado, com 6.450 assertions em cada execução, passaram. MySQL de teste: `arl_sidebar_test_20261004`; nenhum teste usa o banco real.
- Regressão completa: 144 cenários aprovados; um teste novo comparava indevidamente a altura total da página antes/depois do carregamento dos dados. Menu permaneceu em 58px e conteúdo com a mesma posição/largura. Corrigida somente a verificação para comparar largura/posição horizontal, mantendo checagens de hover, título, recarga e navegação. Não houve correção adicional de código de execução por esta falha. Reteste final: os seis cenários do menu passaram em 28,3 segundos. A suíte completa não foi repetida após esta correção restrita ao teste; a execução integral no GitHub permanece pendente do desbloqueio.

## Publicação pendente

[CI 37219042532](https://github.com/dsnakeall-crypto/arlinformatica/actions/runs/37219042532) foi bloqueada antes de iniciar qualquer etapa. Todos os quatro jobs possuem zero steps e nenhum runner. A anotação informa: “The job was not started because your account is locked due to a billing issue.” Repositório conferido como público e jobs configurados com runners padrão.

O proprietário identificou uma cobrança de US$40 não processada. Orientado a regularizar em Settings → Billing & Licensing → Payment information, conforme a documentação oficial do GitHub. Não foi efetuada cobrança ou mudança comercial pelo agente.

O usuário condicionou o deploy à CI verde. Portanto, nenhum arquivo, migration ou registro foi alterado no servidor nesta etapa. A release anterior permanece ativa. Após a regularização, reexecutar a CI do commit funcional; somente com sucesso integral criar/baixar/validar backup atualizado do banco e arquivos privados, reconferir schema e release ativa, e publicar reversivelmente. O pacote preparado não substitui o backup fresco exigido para produção.
