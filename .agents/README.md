# Equipe de agentes ARL APP

Perfis locais em `.agents/roles/`. Sao instrucoes especializadas, nao processos automaticos nem novos modelos instalados.

## Como usar no Codex
Ao abrir este repositorio, peça: "Atue como coordenador ARL. Leia AGENTS.md e .agents/roles/coordenador.md. Para a tarefa [X], consulte o perfil especializado correspondente, primeiro em modo leitura, apresente evidencias e plano; nao altere producao."

## Escalonamento economico
1. Inspecao, revisao e testes locais antes de chamar modelos caros.
2. Se houver edicao, uma especialidade por conjunto de arquivos; nao executar edicoes concorrentes.
3. Revisor de arquitetura para alteracoes grandes; Seguranca e Testes/CI antes de PR.
4. Publicacao apenas depois da PR e backup restauravel verificado.

## Perfis
- coordenador: organiza tarefas e risco
- seguranca: vulnerabilidades e autorizacao
- performance: metricas e gargalos
- testes-ci: PHPUnit, frontend, Playwright e Actions
- banco-dados: consultas, migrations e integridade
- frontend-mobile: interfaces aprovadas
- revisor-arquitetura: diffs e qualidade
- publicacao: release, backup e rollback

## Marco de retomada
PR #59 de dsnakeall-crypto/arlinformatica. Antes de qualquer publicacao, conferir CI mais recente (especialmente E2E), revisar diff, validar backup/restauracao oficial e rollback. Merge, deploy e alteracoes KingHost somente com autorizacao expressa.

## Equipe de fidelidade de layout por setor (14/10/2026)
Regra oficial: docs/PROTOCOLO_LAYOUT_FIEL_POR_SETOR.md.
Perfis adicionais (instruções de papéis, não agentes automáticos instalados):
- roles/layout-coordenador.md — limita escopo, autorização, backup e aceite.
- roles/layout-analista-visual.md — mede imagem, cores, tipografia e ativos.
- roles/layout-implementador.md — desenvolve somente setor permitido.
- roles/layout-auditor-visual.md — compara screenshot real x referência, independente do autor.
- roles/layout-qa-responsivo.md — testa resize, outras telas, Clean e regressões.

**Prompt de início para Codex:**
> Atue como coordenador de fidelidade visual ARL. Leia AGENTS.md e docs/PROTOCOLO_LAYOUT_FIEL_POR_SETOR.md, depois os papéis .agents/roles/layout-*.md. Primeiro receba um setor autorizado e sua imagem, descreva exatamente ALTERAR/PRESERVAR/EXCEÇÕES e tire baseline. Não edite nada até o proprietário aprovar o setor. Faça backup externo, use um implementador, auditor independente e QA. Não altere outros setores, dados reais ou produção. Compare capturas e teste maximizar/reduzir/maximizar antes de pedir aprovação visual.

## Regra de tipografia congelada
**Ler `docs/REGRA_TIPOGRAFIA_ORIGINAL_CONGELADA.md` antes de qualquer trabalho dos agentes de layout.** A referência do proprietário define estrutura, fundos, cards, menus e ícones; fontes permanecem no padrão do Original. O analista mede baseline, o implementador não edita tipografia, o auditor compara computed styles e o QA bloqueia regressões por viewport/estado. Exceções somente mediante autorização expressa e pontual do proprietário.

## A cada alteração de layout: performance obrigatória
Antes de iniciar, ler `docs/REGRA_DESEMPENHO_LAYOUT_POR_SETOR.md`. O perfil **performance** já existente em `.agents/roles/performance.md` colabora em cada setor com diagnóstico e comparação de métricas (não é agente autônomo). Implementador otimiza imagens/CSS/componentes, auditor preserva fidelidade e tipografia, QA compara antes/depois e bloqueia regressões.
