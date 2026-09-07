# Relatórios

A página **Relatórios** reúne quatro abas: Vendas, Produtos mais vendidos, Estoque baixo e Caixa. Segue a arquitetura do aplicativo: tipos e schemas Zod compartilhados, repository, service, IPC, preload e API React. Todas as consultas são somente leitura e usam as tabelas existentes; não há nova migração ou acumuladores persistidos.

## Filtros e datas

Vendas, produtos e caixa começam no primeiro dia do mês atual e terminam hoje. Cada aba mantém seus próprios campos enquanto a página está aberta. Entrar em uma aba atualiza seu resultado; **Gerar relatório** aplica os campos editados. A legenda “Filtros aplicados” identifica o período e a forma de pagamento usados no resultado, mesmo que os campos sejam editados depois.

Datas são strings `YYYY-MM-DD`, validadas no renderer e no backend, incluindo existência da data e início menor ou igual ao fim. O período usa o fuso local do computador: início inclusivo à meia-noite e fim exclusivo à meia-noite do dia seguinte à data final. As duas meias-noites são construídas separadamente para respeitar mudanças de horário de verão.

As consultas comparam os instantes com `julianday`, que interpreta timestamps SQLite sem sufixo como UTC e normaliza timestamps ISO com fuso. A exibição também interpreta `CURRENT_TIMESTAMP` como UTC antes de converter para a hora local. Valores monetários são apresentados em reais e quantidades em português brasileiro; os controles nativos de data seguem as preferências do ambiente.

## Vendas

Somente vendas com status `paid` entram no relatório. O período corresponde à data de criação da venda; no fluxo atual, a venda é criada e finalizada na mesma transação.

- Quantidade: número de vendas, contado uma única vez por venda.
- Total vendido: soma de `sales.totalInCents`, já líquido dos descontos.
- Total por pagamento: soma dos pagamentos das vendas selecionadas, incluindo as quatro formas cadastradas, mesmo quando o total de uma delas é zero.
- Ticket médio: total vendido dividido pela quantidade de vendas, arredondado em centavos. Sem vendas, todos os indicadores são zero.

O filtro de pagamento seleciona **vendas completas** que contenham a forma escolhida. Exemplo: uma venda de R$ 100 com R$ 40 em Pix e R$ 60 em dinheiro, filtrada por Pix, mostra uma venda, R$ 100 vendidos, ticket de R$ 100 e ambos os pagamentos. O filtro usa `EXISTS`; a agregação das vendas é separada dos pagamentos, dentro da mesma transação de leitura. Pagamentos mistos ou repetidos não multiplicam a contagem nem o total.

Vendas gratuitas entram na quantidade e no ticket médio quando não há filtro de pagamento; como não possuem pagamentos, não aparecem ao selecionar uma forma específica.

## Produtos mais vendidos

Considera os itens das vendas pagas no período e agrupa pelo ID do produto, inclusive produtos atualmente inativos. O nome é o snapshot do item na venda mais recente do período, com desempate por ID da venda e do item. Alterar o cadastro não muda o nome histórico exibido.

Quantidade vendida é a soma das quantidades dos itens, preservando frações. O valor vendido é líquido dos descontos dos itens e do desconto geral da venda:

1. Usar como peso o total de cada item após seu próprio desconto.
2. Distribuir o desconto geral proporcionalmente aos pesos.
3. Atribuir inicialmente a parte inteira dos centavos de desconto a cada item.
4. Distribuir os centavos restantes pelas maiores frações, com desempate pelo menor ID de item.

Exemplo: dois itens de R$ 1 com desconto geral de R$ 0,01 ficam com valores líquidos de R$ 0,99 e R$ 1,00; o item de menor ID recebe o centavo de desconto. A soma confere com o total líquido da venda. O cálculo intermediário usa `BigInt` para preservar os restos exatos. Subtotal zero não faz divisão; descontos integrais resultam em valores líquidos zero.

Os itens são carregados em uma consulta para o período e o rateio é calculado por venda em memória, sem consultas por produto. Ordenação: quantidade decrescente, valor decrescente e ID crescente. Não há limite arbitrário de produtos no ranking.

## Estoque baixo

Reutiliza a consulta do módulo de estoque: apenas produtos ativos com saldo **menor ou igual** ao mínimo. Exibe produto, estoque atual, estoque mínimo e **diferença (quantidade faltante)**, calculada como mínimo menos atual, com a unidade do produto. Um produto exatamente no mínimo aparece com diferença zero. A lista é ordenada por nome e representa a posição atual, sem período histórico.

## Caixa

O período seleciona caixas pela **data de abertura**, incluindo abertos e fechados, em ordem de abertura decrescente, com desempate pelo ID decrescente. Os totais consideram todas as vendas pagas vinculadas ao caixa, mesmo quando foram feitas após o período selecionado.

- Valor inicial: valor informado na abertura.
- Total vendido: soma das vendas pagas, em todas as formas de pagamento.
- Valor esperado: valor inicial mais pagamentos em dinheiro das vendas pagas.
- Valor informado e diferença: valores persistidos no fechamento; diferença igual a informado menos esperado, positiva para sobra e negativa para falta.

Um caixa com R$ 10 iniciais, R$ 100 vendidos (R$ 60 em dinheiro e R$ 40 em Pix) e R$ 69 informados tem valor esperado de R$ 70 e diferença de -R$ 1. Caixas abertos exibem “—” para fechamento, valor informado e diferença. Caixas sem vendas também aparecem. As somas de vendas e dinheiro são agregadas separadamente e associadas aos caixas em uma única consulta, evitando duplicações e consultas por caixa.

## API e interface

O preload expõe `window.hardwareStore.reports`:

| Método | Entrada | Resultado de sucesso |
| --- | --- | --- |
| `sales` | `{ startDate, endDate, paymentMethod? }` | Indicadores e totais por pagamento |
| `topProducts` | `{ startDate, endDate }` | Lista de produtos e totais líquidos |
| `lowStock` | Sem parâmetros | Lista de produtos no mínimo ou abaixo |
| `cashRegisters` | `{ startDate, endDate }` | Lista de caixas e valores |

Os métodos retornam `Promise<{ success: true, data } | { success: false, error, issues? }>`. Valores monetários permanecem em centavos nos contratos; dados de fechamento ausentes permanecem `null`.

A interface trata carregamento, validação, falha de consulta e ausência de resultados. Apenas a aba ativa consulta dados. Identificadores de requisição impedem que respostas antigas sobrescrevam consultas novas ou resultados após uma troca de aba. As abas oferecem navegação por setas, Home e End; tabelas largas têm rolagem horizontal própria. Esta entrega não inclui exportação nem impressão.

## Validação realizada

```sh
npm test
npm run build
npm run test:ui:reports
npm run test:ui
```

- **86 testes automatizados passaram**, incluindo 12 específicos dos relatórios. Integração com SQLite em memória, migrações e triggers reais: pagamentos mistos/repetidos, vendas gratuitas e não pagas, períodos e limites de dias, datas inválidas, nomes históricos, produtos inativos, frações, rateio, estoque no limite, caixas abertos/fechados e diferenças positivas/negativas.
- `npm run build` passou, incluindo `tsc --noEmit`.
- O teste de relatórios no Electron passou usando renderer e preload compilados e handlers IPC com dados controlados. Cobriu as quatro abas, filtros, validação, estados vazios, erros, respostas fora de ordem, teclado e janela de 900 px. Captura em `/tmp/hardware-reports.png`.
- O teste de interface existente do PDV passou, verificando a regressão de navegação, carrinho, pagamentos e recibo.

Os testes Electron exigem acesso ao ambiente gráfico. Nesta execução, a inicialização foi bloqueada pelo sandbox e os testes passaram após execução autorizada fora dele. Nenhum banco de desenvolvimento ou produção foi usado pelos testes.
