# Divisão por valores e formulários — 08/10/2026

Em Nova dívida e cadastro por foto, ao selecionar Casal, alternar entre Por porcentagem e Por valores. Exemplo: dez parcelas de R$400, com R$300 para o primeiro responsável e R$100 para o segundo, guarda essa divisão em cada parcela. O campo da outra pessoa acompanha o complemento; as partes devem somar o valor da parcela. Nomes continuam configuráveis.

Sem migrations: os valores exatos usam share_one_cents/share_two_cents existentes. O percentual da dívida permanece metadado compatível para filtros; não recalcula as parcelas. Valores não são convertidos para porcentagem inteira para cálculo. Dívidas antigas e pagamentos preservados. A edição de uma parcela sem histórico também aceita valores exatos e inicia com suas partes reais, evitando arredondamento ao editar apenas vencimento. Parcelas com lançamentos continuam bloqueadas.

Compras parceladas e únicas permitem valores; cobranças fixas mensais mantêm porcentagem para preservar a regra de geração futura sem acrescentar estado ao schema. Uma parcela mensal existente sem histórico pode ser ajustada individualmente por valores.

Popups manual/foto seguem as referências antigas enviadas: superfícies opacas azul-acinzentadas, campos brancos delimitados, títulos azuis, contraste e cards numerados com valor/parcela/total/restantes. Uma única rolagem no corpo da revisão e rodapé acessível. Nenhum campo financeiro ou consentimento de IA removido, nenhuma nova chamada paga. A indicação Após a parcela atual exclui explicitamente a parcela corrente; o total restante financeiro continua incluindo-a.

Higiene: caches, PDF de teste e artefatos privados deixam de ser versionados, sem apagar arquivos locais. GitHub público mantido conforme decisão do proprietário. Vite local preservado; build de release usa configuração oficial versionada. Alteração espontânea de cor permanece fora deste escopo.

Backup local validado: C:/Users/Allan/ARL-backups/expense-split-layout-20261008 (delta verificado, patch e histórico Git, referenciando o backup-base).

Publicação depende de CI verde e backup atual validado de banco/privados. Nenhuma migration ou limpeza de dados autorizada nesta atualização.
