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
| `npm run sim`   | Simulação sem 3D em Node (economia e testes da lógica)       |

## Estrutura

- `src/sim.ts` — toda a lógica de jogo (tempo, economia, funcionários, construção). **Não importa Three.js**
  nem o DOM, para poder ser testada em Node.
- `src/main.ts` — cena 3D, ferramentas de construção, interface (HTML por cima do canvas).
- `src/simrun.ts` — simulação headless usada por `npm run sim`.

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
- Salários e renda são pagos no fecho do mês; os produtos lançados vendem todos os meses, com vendas a cair.
- Abaixo de −10 000 € a empresa vai à falência.
