# Software Lda.

Protótipo de um jogo de gestão de uma empresa de software em 3D, inspirado no *Software Inc.*

**Stack:** TypeScript + Three.js + Vite. Sem outras dependências: o `npm run sim` usa o suporte nativo
do Node (≥ 22.18) para correr TypeScript.

## Comandos

| Comando         | O que faz                                                    |
|-----------------|--------------------------------------------------------------|
| `npm install`   | Instala as dependências                                      |
| `npm run dev`   | Servidor de desenvolvimento (abre em http://localhost:5173)  |
| `npx tsc`       | Verificação de tipos                                         |
| `npm run build` | Verificação de tipos + build de produção em `dist/`          |
| `npm run sim`   | Testes da lógica + cenários de equilíbrio (falha se algo falhar) |
| `npm run simtest` | Só os cenários de equilíbrio da economia                   |

## Estrutura

- `src/sim.ts` — toda a lógica de jogo (tempo, economia, funcionários, construção). **Não importa Three.js**
  nem o DOM, para poder ser testada em Node.
- `src/main.ts` — cena 3D, ferramentas de construção, interface (HTML por cima do canvas).
- `src/simrun.ts` — testes da lógica (caminhos, salas, mercado), sem 3D.
- `src/simtest.ts` — equilíbrio da economia: jogadores automáticos durante 2 anos, com 8 sementes, e metas a cumprir.

## Controlos

- **Botão direito** roda a câmara, **botão do meio** arrasta, **roda** faz zoom.
- Teclas **1–5** escolhem a ferramenta, **Esc** volta a Selecionar, **Espaço** pausa.
- **Parede** (100 € por segmento): arrasta entre dois cantos da grelha. Uma zona fechada por paredes passa a ser
  uma **sala** (o chão ganha cor). A parede exterior da entrada (quadrado verde) recebe sempre uma porta.
- **Porta** (300 €): clica numa parede existente.
- **Secretária** (500 €): clica numa célula.
- **Demolir**: clica numa parede, porta ou secretária, ou arrasta para demolir um troço de parede. Sem reembolso.
- Painel da direita: projeto, equipa, candidatos, produtos.

## Movimento dos funcionários

Andam pela grelha com **A\*** (4 direções): as paredes bloqueiam, as portas deixam passar e as secretárias são
obstáculos (menos a de destino). Quando o mapa muda, quem está a andar recalcula o caminho. Sem caminho, o
funcionário fica **Sem acesso à secretária** (espera à entrada) ou **Preso** (vai para casa à meia-noite); as duas
situações baixam a felicidade.

Em `npm run dev` ficam disponíveis na consola `__jogo` (estado) e `__ecra(x, z)` (vértice da grelha → píxeis).

## Regras do jogo (atuais)

- Cada mês tem 30 dias. Os funcionários chegam por volta das 8h, trabalham das 9h às 17h e vão para casa.
- Salários e renda (1 500 €) são pagos no fecho do mês. Salário de um candidato = 1 000 € + 2 500 € × competência.
- Um utilitário tem 30 000 pontos de trabalho (cerca de 2 meses com 2 pessoas). A qualidade depende da competência
  média de quem trabalhou nele.
- Os produtos vendem todos os meses (8 000 € × qualidade no 1.º mês), com as vendas a cair 20% por mês.
- **Saturação do mercado:** um produto novo vende menos se os anteriores ainda estiverem a vender
  (÷ (1 + 0,8 × vendas atuais / 8 000 €)). Lançar utilitários em série tem retornos decrescentes. O painel de
  Produtos mostra quanto venderia um produto novo.
- Abaixo de −10 000 € a empresa vai à falência.

## Equilíbrio (2 primeiros anos)

`npm run simtest` corre 4 jogadores automáticos com 8 sementes:

| Jogador | Comportamento | Meta |
|---|---|---|
| passivo | não faz nada | não ganha dinheiro (acaba abaixo de metade do inicial) |
| passivo c/ equipa | contrata 2, nunca faz projetos | falência antes do mês 12 |
| razoável | 2 pessoas, sempre um projeto; contrata com 2+ produtos e 6 meses de reserva | sem falências, vale nos primeiros meses, 60–200k ao fim de 2 anos, ano 2 melhor que o ano 1 |
| expansão rápida | 6 pessoas no 1.º mês | não compensa (menos de metade do razoável) e entra em dívida |

Resultado atual (mediana): o razoável acaba com cerca de **62k** (pior semente: 18k; caixa mínima: 10k). A expansão rápida acaba
com cerca de 16k, com 2 falências em 8.
