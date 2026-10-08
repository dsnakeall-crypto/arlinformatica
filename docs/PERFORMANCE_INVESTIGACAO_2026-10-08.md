# Investigação de lentidão na navegação — 08/10/2026

Status: investigação em andamento. Melhorias abaixo verificadas; causa completa do engasgo relatado no navegador do proprietário ainda não reproduzida. Não confundir redução de download com garantia de eliminar travamento gráfico.

## Proteção do estado

Backup externo de 2.028 arquivos, alterações locais e histórico Git, com ZIP/hashes e bundle verificados: `C:/Users/Allan/ARL-backups/performance-investigation-20261008`. Alterações anteriores em Vite, caches de ferramentas, SQLs e artefatos permanecem fora desta entrega. Banco de negócio não foi reescrito nem migrado. Backup oficial número 20 foi criado, baixado e validado, incluindo 162 entradas com checksum. A criação registra o próprio backup; não altera clientes, OS, dívidas ou pagamentos.

## Medições e limites

- Produção em `b62c9562967ffaa4d0b1f1e98a8836fde79d8ccb`, conferida pelo index público antes da conexão SSH autorizada.
- 12 endpoints, três leituras por endpoint, por kernel Laravel autenticado em CLI com transação revertida. Respostas HTTP 200; handlers entre aproximadamente 4 e 43 ms. Financeiro mensal: 20–38 ms, seis consultas, 12–20 ms de SQL. Esse ensaio reutiliza o processo e NÃO inclui bootstrap por requisição, TLS, rede, sessão real do navegador ou desenho da tela.
- Três processos novos: bootstrap 180,82 / 193,30 / 217,80 ms; caches de configuração e rotas ativos. CLI não comprova estado do OPcache do PHP web.
- HTTPS com conexão mantida: `/up` aproximadamente 196–216 ms após a primeira chamada; JS estático aproximadamente 12–13 ms. Isso confirma custo da requisição dinâmica neste ensaio, mas não identifica isoladamente fila da hospedagem, OPcache ou filesystem.
- Chromium isolado 1366×768, medição de frames/long tasks e callbacks de MutationObserver: cenário pequeno sem long tasks nas trocas. Controle que desativa callbacks legados não apresentou melhora consistente.
- Repetição com CPU limitada a 1/6 e respostas reais guardadas somente no backup privado local: primeiro acesso pode ter tarefas longas; retorno ao Financeiro não teve long task no recorte observado. Conteúdo não foi enviado a terceiros nem incluído no Git.
- Controle diagnóstico temporário sem sombras, filtros, animações e transições NÃO trouxe redução consistente de custo. Não alteramos o visual. Chromium headless não representa perfeitamente GPU, extensões, aceleração gráfica e browser usados pelo proprietário.
- O import estático de StorageAdmin em main parece contrariar lazy loading no fonte, mas o grafo do build comprova que o compilador elimina o código sem uso. Não foi tratado como gargalo nem alterado por justificativa falsa.

Evidências completas e scripts estão no backup externo: `production-timings.json`, `https-keepalive.json`, `navigation-cpu6.json`, `navigation-production-fixtures-cpu6.json`, `navigation-style-control-cpu6.json` e `apache-static-probe.json`. Fixtures privadas permanecem externas ao repositório.

## Melhorias implementadas

### Entrega estática

O servidor oficial não comprimia JS mesmo com `Accept-Encoding: gzip`. O pós-build agora gera `public/build/.htaccess`: compressão de tipos textuais se módulos Apache necessários existirem; cache longo somente para JS/CSS com hash do Vite; manifest.json com revalidação. Nenhuma regra incide sobre API, HTML, sessão, uploads ou arquivos privados. Não existe dependência de Node em produção.

Validação na KingHost em pasta estática temporária independente, após backup oficial: JS de 42.351 bytes transferido em 14.200 bytes com gzip (66,5% de redução), descompressão byte a byte idêntica, HTTP 200; cache dos hashes correto e manifesto sem cache longo. Pasta removida no finally; arquivos publicados existentes preservados. A entrega deve copiar também o arquivo oculto `.htaccess` do build. Rollback: restaurar/remover somente esse arquivo; hashes permanecem válidos.

### Consulta legada desnecessária

record-management verificava permissão via `/api/me` antes de procurar a listagem legada de OS, inclusive em Painel/Financeiro. Agora procura primeiro a tela aplicável, mantendo validação de permissão, checagem de propriedade React e rechecagem de conexão após await. Elimina a chamada inicial duplicada sem reutilizar identidade entre sessões nem remover a verificação ao retornar de outra janela.

Teste E2E de lazy loading agora exige uma chamada inicial de identidade no Painel. Quatro cenários de navegador passaram (Financeiro, reutilização dos módulos, carregamento lento/menu disponível e falha de download). Lint, 38 testes frontend e build/TypeScript passaram em cópia isolada com configuração oficial do Vite, preservando o Vite local alterado pelo usuário.

## Continuação necessária

1. Medir navegação e retorno de Alt+Tab autenticados no navegador oficial do proprietário. Aba aberta no Codex aguarda login do usuário, sem compartilhamento de senha.
2. Correlacionar pausa percebida com requisição `/api/me`, primeiro download de módulo e tarefa de renderização. Não afrouxar isolamento de sessão/cache para disfarçar atraso.
3. Se houver engasgo gráfico específico, comparar GPU/aceleração/extensões e efeitos no navegador afetado antes de propor mudança visual.
4. Verificar OPcache do PHP WEB e limites/fila da hospedagem por meio autorizado, sem inferir pela configuração CLI nem criar phpinfo público.
5. CI e publicação das melhorias preparadas continuam pendentes; teste estático temporário não é publicação da atualização.

O consumo da conta é acompanhado pela ferramenta de limites. Ao atingir aproximadamente 10% restante, salvar checkpoint e programar retomada para 20 minutos após o reset informado, conforme autorização do proprietário. Retomada depende da disponibilidade do aplicativo/computador e da conta; não pressupõe renovação garantida.
