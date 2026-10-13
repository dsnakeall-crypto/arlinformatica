# AGENTS.md — ARL Informática

## Regra principal

Antes de alterar qualquer código, leia integralmente:

1. `docs/PROJETO_MESTRE.md`
2. `docs/REFERENCIAS_VISUAIS.md`
3. `README.md`

O `docs/PROJETO_MESTRE.md` é a especificação funcional oficial do sistema.

## Princípios obrigatórios

- Projeto novo do zero.
- Não usar Supabase.
- Não criar dependência da OpenAI/ChatGPT/Codex em produção.
- Primeiro alvo de hospedagem: KingHost/shared hosting PHP + MySQL/MariaDB.
- Não exigir processo Node.js permanente em produção.
- GitHub é a fonte oficial do código.
- Preservar histórico: OS concluída nunca é excluída; documentos emitidos não mudam silenciosamente.
- Fotos de equipamentos armazenadas devem ter no máximo 100 KB.
- Segurança e autorização devem ser aplicadas no backend.
- Layout Web/PC deve seguir com alta fidelidade as referências anexadas.
- Mobile/Tablet possui interface própria.

## Fluxo de trabalho

Antes de editar, criar e verificar um backup local do estado atual (arquivos, alterações não commitadas e histórico Git), fora do repositório. Registrar o caminho para permitir retorno. Antes de mudanças de dados ou publicação em produção, criar e validar também o backup do banco e dos arquivos privados do servidor. Não incluir backups ou credenciais em commits ou pacotes de publicação.

1. Analise requisitos e referências.
2. Planeje arquitetura/modelagem.
3. Implemente em etapas funcionais.
4. Faça commits lógicos.
5. Rode testes, lint, typecheck e build.
6. Teste a aplicação em navegador.
7. Compare visualmente telas com as referências.
8. Documente decisões relevantes.
9. Não deixe placeholders marcados como concluídos.

## Ambiguidades

Para dúvidas pequenas, escolha uma solução conservadora e documente. Só interrompa para perguntar quando houver risco de perda de dados, segurança, custo/credencial externa ou mudança relevante de regra comercial.

## Entrega

Ao concluir, crie `CHECKLIST_FINAL.md` com requisitos `[OK]` ou `[PENDENTE]`, sem marcar `[OK]` em funcionalidade fictícia/mock.

## Diretriz permanente: desempenho máximo, responsividade e estabilidade (10/10/2026)

A fase de design do Web Original, Web Clean e Mobile está aprovada: **não alterar layout, cores, ícones, tamanhos, espaçamentos, textos ou fluxos aprovados** para otimizar velocidade, salvo correção de defeito comprovado e informada ao proprietário.

**Objetivo prioritário:** resposta perceptível ao clique em até 100 ms quando tecnicamente possível; troca de páginas com dados já disponíveis idealmente em até 300 ms. Esses tempos são **metas**, não garantias: registrar medições reais de cenários frios/quentes, com PC/celular, latência de rede e servidor.

1. Auditar profundamente frontend React (montagens/renderizações, estados, efeitos, fetches duplicados, carga de chunks, CSS, imagens, cache/invalidação, navegação intermediária, mensagens de loading); backend Laravel/PHP (tempos por rota, jobs, arquivos, queries, índices, N+1, OPcache) e MariaDB/MySQL (EXPLAIN, perfis de acesso).
2. **Mensurar primeiro, corrigir a causa depois**. Registrar baseline por interação: clique → feedback, renderização, carregamento, resposta API, contagem de chamadas, consumo de memória, erros e comparação após cada alteração.
3. Eliminar piscadas e telas intermediárias; adotar navegação direta e persistência de dados úteis. Nunca esconder erros, desabilitar validação, pular permissões ou servir cache obsoleto de saldos, pagamentos e dados sensíveis para forçar métricas.
4. Otimizar todo o sistema, não só o Controle de Gastos: Painel, Clientes, OS, Serviços, Financeiro, Pós-venda, Configurações, Relatórios, Web e Mobile. Investigar também gargalos de rede/hospedagem e do ambiente WSL2/DDEV; diferenciar lentidão local de produção.
5. Preservar 100% das regras financeiras, dados, documentos, fotos, histórico, autenticação e segurança. Testes destrutivos somente com SQLite/dados descartáveis e ambiente isolado; nunca enviar banco de desenvolvimento à KingHost.
6. Cada mudança precisa de backup externo verificado, teste E2E funcional/performance, lint/typecheck/build e testes PHP/React aplicáveis. Marcar regressões e bloquear lançamento se a suíte crítica falhar ou ficar incompleta.
7. Reunir análise, plano, mudanças, métricas e pendências em `docs/AUDITORIA_PERFORMANCE_RELEASE_20261010.md` (ou relatório sucessor) e `CHECKLIST_FINAL.md`. Quando for útil, preparar um briefing revisável para Codex/Claude; agentes não substituem confirmação por testes.
8. **Antes de qualquer alteração no servidor oficial, no banco real, backups remotos, DNS ou implantação, explicar exatamente os passos, riscos, rollback e solicitar autorização expressa.** Não publicar, resetar git, limpar diretórios ou modificar produção automaticamente.
9. Priorizar a experiência real do usuário: transições instantâneas quando há dados locais, feedback apropriado quando aguardar é necessário, zero flashes artificiais e redução de trabalho redundante. A meta é o melhor desempenho mensurável possível, não promessa impossível de ausência absoluta de latência.

## Limite de uso — regra prioritária do proprietário (12/10/2026)
Ao atingir 8% restante da janela de cinco horas (92% consumido), ou houver risco de interrupção, finalizar somente escritas em andamento, preservar todas as alterações na cópia isolada e criar commit local de checkpoint, incluindo trabalho incompleto e registro dos testes, pendências, branch e comandos de retomada. Parar imediatamente novas implementações, auditorias e testes longos. Não modificar o original nem acessar produção.
Retomar somente quando houver 100% de uso disponível na janela E novo comando explícito do proprietário para reiniciar. A renovação do limite sozinha não autoriza retomada. Não criar automação de reinício. Consultar o uso real quando possível; nunca inventar percentual. Checkpoints periódicos locais continuam autorizados. A publicação e o SSH permanecem bloqueados até confirmação explícita.


## Especialistas ARL (11/10/2026)
Para trabalhos especializados, consultar o perfil pertinente em `.agents/roles/` e as instrucoes em `.agents/README.md`. Os perfis sao checklists de delegacao, nao permissoes extras. Nenhum agente pode fazer merge, deploy, alterar ambiente KingHost, dados reais ou configuracoes globais sem autorizacao expressa. Para PR #59, comecar por `testes-ci`, `seguranca` e `publicacao`, sempre com leitura e diagnostico antes de propor mudancas.

## Regra permanente prioritária — limite de uso (13/10/2026)
Ao atingir 8% ou menos disponível na janela de cinco horas, interromper imediatamente novas tarefas, testes demorados e publicações. Em operação crítica, concluir somente o necessário para deixar o sistema seguro. Salvar os arquivos modificados, registrar progresso, pendências, testes e resultados, criar checkpoint Git local sem segredos e atualizar RETOMADA-CODEX.md com branch, hash e próximo passo exato.
Informar exatamente: "PAUSADO — LIMITE DE 8% ATINGIDO. Progresso preservado. Aguardando autorização para continuar."
Não retomar automaticamente após renovação. Retomar somente mediante novo comando explícito do proprietário; antes, ler RETOMADA-CODEX.md e conferir Git, sem repetir trabalho concluído. Consultar percentual real ao longo da execução quando disponível. Se indisponível, informar a limitação e solicitar leitura do indicador; nunca inventar percentuais. Nunca iniciar publicação com 8% ou menos disponível.
Todos os backups ARL, manifests e evidências de recuperação ficam exclusivamente em C:\Users\Allan\OneDrive\Programacao APP\App Arl Informatica\APP ARL\BACKUPS APP, fora do servidor e do Git. Preservar absolutamente TERRAPLAN, seus arquivos, configurações e banco.

Pasta oficial de desenvolvimento: C:\Users\Allan\OneDrive\Programacao APP\www\arlinformatica. Usar Laragon e bancos descartáveis para testes, sem DDEV. A publicação do novo pacote consolidado aguarda confirmação expressa após os testes. O domínio/certificado fica para o proprietário, conforme comando de 13/10/2026.
