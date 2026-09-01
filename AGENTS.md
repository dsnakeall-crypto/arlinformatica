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
