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
- `src/simrun.ts` — testes da lógica (caminhos, salas, tipos, dependências, mercado), sem 3D.
- `src/simtest.ts` — equilíbrio da economia: jogadores automáticos durante 2 anos, com 8 sementes, e metas a cumprir.

## Controlos

- **Botão direito** roda a câmara, **botão do meio** arrasta, **roda** faz zoom.
- Teclas **1–5** escolhem a ferramenta, **Esc** volta a Selecionar, **Espaço** pausa.
- **Parede** (100 € por segmento): arrasta entre dois cantos da grelha. Uma zona fechada por paredes passa a ser
  uma **sala** (o chão ganha cor). A parede exterior da entrada (quadrado verde) recebe sempre uma porta.
- **Porta** (300 €): clica numa parede existente.
- **Secretária** (500 €): clica numa célula.
- **Demolir**: clica numa parede, porta ou secretária, ou arrasta para demolir um troço de parede. Sem reembolso.
- Painel da direita: projetos em curso, novo projeto (tipo, funcionalidades, equipa), equipa, candidatos, produtos e mercados.

## Movimento dos funcionários

Andam pela grelha com **A\*** (4 direções): as paredes bloqueiam, as portas deixam passar e as secretárias são
obstáculos (menos a de destino). Quando o mapa muda, quem está a andar recalcula o caminho. Sem caminho, o
funcionário fica **Sem acesso à secretária** (espera à entrada) ou **Preso** (vai para casa à meia-noite); as duas
situações baixam a felicidade.

Em `npm run dev` ficam disponíveis na consola `__jogo` (estado) e `__ecra(x, z)` (vértice da grelha → píxeis).

## Regras do jogo (atuais)

- Cada mês tem 30 dias. Os funcionários chegam por volta das 8h, trabalham das 9h às 17h e vão para casa.
- Começas com 25 000 €. Salários e renda (1 500 €) são pagos no fecho do mês.
- **Competências:** cada pessoa tem programação, design e testes (0–100), com uma especialidade forte (45–95) e as
  outras duas áreas mais fracas (20–50). Salário = 1 000 € + 2 500 € × média das três.
- Cada tipo de software divide o trabalho pelas três áreas (por exemplo, um jogo tem 45% de design). Cada pessoa
  trabalha na área por acabar em que é melhor, a competência × (0,5 + felicidade/200) pontos por minuto. O projeto
  acaba quando todas as áreas estão feitas.
- **Qualidade** = média das áreas, pesada pela parte de cada uma. Cada área vale a competência de quem a fez × 1,2,
  com máximo de 100%. Sem um designer, um jogo demora e sai fraco.
- **Equipas por projeto:** podes ter vários projetos ao mesmo tempo, cada um com a sua equipa. Quem está "Sem projeto"
  não trabalha (mas recebe). Ao lançar, a equipa fica livre. Um projeto sem equipa fica parado e pode ser cancelado
  (o trabalho perde-se).
- **Coordenação:** numa equipa de n pessoas, cada uma rende 1 / (1 + 0,08 × (n − 1)) (2 → 93%, 3 → 86%, 6 → 71%).
  Mais gente continua a acabar mais depressa, mas cada pessoa a mais rende menos.
- O painel de novo projeto prevê a duração e a qualidade com a equipa escolhida (`estimarProjeto` em `sim.ts`).
  Cada projeto em curso mostra quanto falta (`mesesRestantes`). Na Equipa, a lista de cada pessoa muda-a de projeto.
- Abaixo de −10 000 € a empresa vai à falência.

### Tipos de software

| Tipo | Desbloqueia com | Trabalho base | Vendas no 1.º mês* | Queda/mês | Notas |
|---|---|---|---|---|---|
| Utilitário | — | 20 000 | 7 600 € | 20% | rápido, vendas modestas |
| Editor de texto | 1 produto | 35 000 | 6 200 € | 15% | vende durante muito tempo |
| Antivírus | 2 produtos | 30 000 | 4 200 € | 10% | começa fraco, quase não cai |
| Jogo | 3 produtos | 40 000 | 24 600 € | 40% | vende muito no início; qualidade conta a dobrar (qualidade^1,5) |

\* com qualidade 100%, sem funcionalidades e com o mercado livre. Os valores estão em `TIPOS`, em `src/sim.ts`.

Cada tipo tem **funcionalidades** opcionais (mais trabalho, mais vendas). Algumas dependem de outras: marcar
*Tabelas* junta *Formatação rica*, desmarcar *Formatação rica* tira *Tabelas* e *Colaboração na nuvem*. O painel
mostra o trabalho total, o tempo previsto com a equipa atual e as vendas esperadas.

**Saturação do mercado, por tipo:** um produto novo vende menos se os anteriores **do mesmo tipo** ainda estiverem a
vender (÷ (1 + 0,8 × vendas atuais desse tipo / vendas base do tipo)). Diversificar compensa. O painel de Produtos
mostra quanto venderia um produto novo de cada tipo.

## Equilíbrio (2 primeiros anos)

`npm run simtest` corre 5 jogadores automáticos com 8 sementes. Os que fazem projetos escolhem, entre os tipos
desbloqueados, o projeto que a equipa acaba em 3 meses ou menos e que rende mais por mês (pela previsão do jogo).
Ninguém fica parado: quem está livre forma uma equipa (até 3 pessoas), e uma pessoa sozinha junta-se à equipa mais
pequena.

| Jogador | Comportamento | Meta |
|---|---|---|
| passivo | não faz nada | não ganha dinheiro (acaba abaixo de metade do inicial) |
| passivo c/ equipa | contrata 2, nunca faz projetos | falência antes do mês 12 |
| razoável | 2 pessoas; contrata com 2+ produtos e 6 meses de reserva | sem falências, vale nos primeiros meses, 60–200k ao fim de 2 anos, ano 2 melhor que o ano 1, pelo menos 3 tipos lançados |
| só utilitários | como o razoável, mas nunca diversifica | acaba abaixo do razoável |
| expansão rápida | 6 pessoas no 1.º mês | arriscada (falência em 2+ sementes, dívida em pelo menos metade) e não compensa (menos de metade do razoável) |

Resultado atual (mediana): o razoável acaba com cerca de **99k** (pior semente: 12k; caixa mínima: 6k) e lança os 4
tipos. O "só utilitários" acaba com 70k. O passivo vai à falência no mês 24. A expansão rápida vai à falência em 5 das 8
sementes, mas quem sobrevive acaba com cerca de 285k: é alto risco e alto retorno. Este resultado é sensível aos
parâmetros (com coordenação 0,1 são 4/8 falências).

Para depurar uma corrida: `DIARIO="razoável:3" npm run simtest` mostra as mensagens do jogo dessa corrida.
