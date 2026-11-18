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
- `src/main.ts` — liga tudo: cena 3D, ferramentas de construção, HUD, painel lateral, avisos, ficha e ciclo.
- `src/modelos.ts` — modelos 3D (secretárias, decoração, bonecos animados, confetes). Só Three.js.
- `src/ambiente.ts` — céu com ciclo dia/noite, sol com sombras, relva, estrada com carros, árvores, prédios, nuvens.
- `src/menus.ts` — menus em ecrã inteiro: principal, nova empresa, pausa, definições, como jogar, conquistas.
- `src/definicoes.ts` — definições do jogador (`localStorage`, chave `software-lda.definicoes`).
- `src/som.ts` — efeitos sonoros sintetizados com WebAudio (sem ficheiros de som).
- `src/grafico.ts` — gráfico das estatísticas (canvas 2D).
- `src/posfx.ts` — pós-processamento: brilho (bloom), vinheta e saturação (addons do Three.js).
- `src/particulas.ts` — símbolos a sair de quem trabalha, moedas e estrelas.
- `src/celebracoes.ts` — janela de lançamento com as críticas, explosão de nível e números a subir.
- `src/progresso.ts` — painel de missões e janela das melhorias.
- `src/simrun.ts` — testes da lógica (caminhos, salas, tipos, dependências, mercado, equipas, guardar/carregar,
  decoração, conquistas, eventos), sem 3D.
- `src/simtest.ts` — equilíbrio da economia: jogadores automáticos durante 2 anos, com 8 sementes, e metas a cumprir.

## Menus e interface

- **Menu principal**: Continuar (o jogo guardado mais recente), Novo jogo, Como jogar, Conquistas, Definições.
  Por trás corre um escritório de montra (`criarMontra` em `main.ts`), que nunca é guardado.
- **Novo jogo**: nome da empresa, dificuldade (Fácil 50 000 €, Normal 25 000 €, Difícil 12 000 €) e eventos aleatórios.
- **Pausa** (**Esc** ou ☰): continuar, guardar, carregar, como jogar, conquistas, definições, sair (com autosave).
- **Definições**: qualidade (resolução), sombras, ciclo dia/noite, indicadores de felicidade, sons, volume, avisos.
- **Barra de cima**: dinheiro (anima até ao valor certo e mostra o saldo do mês que fechou), saldo previsto
  (vendas − salários − renda), equipa, felicidade média, data e hora (☀️/🌙), velocidade, guardar e menu.
- **Painel lateral** com separadores: Projetos (em curso + novo projeto), Equipa, Contratar, Produtos (mercado e
  produtos com estrelas) e Números (gráfico de 24 meses, recordes, conquistas). Os números nos separadores
  avisam de projetos, candidatos e pessoas com problemas.
- **Ficha do funcionário**: clica no boneco (ou no cartão na Equipa, e a câmara vai até ele). Mostra estado,
  projeto, felicidade, para onde tende (com o bónus da decoração) e o ritmo de trabalho.
- **Avisos flutuantes** e sons em lançamentos, conquistas, eventos, desbloqueios e fechos de mês; confetes nos
  lançamentos e conquistas. Erros das ações (dinheiro insuficiente, célula ocupada…) aparecem a vermelho.

## Progressão (viciante de propósito)

- **Experiência e nível** (até 30): lançamentos (mais com qualidade alta e tipos difíceis), conquistas (+100),
  missões e meses seguidos com lucro (20 XP × série, até 5). O emblema ao lado do nome mostra o nível, o anel de XP
  e os pontos por gastar; a série aparece como 🔥.
- **Melhorias** (tecla **M**): um ponto por nível. Marketing digital (+15% vendas), café de especialidade (+5
  felicidade), recrutador (+1 candidato), renda negociada (900 €), metodologia ágil (metade da coordenação),
  testes automáticos (+5 de qualidade), prémios de lançamento, formação contínua (+1 por mês na especialidade),
  fãs leais (vendas caem 40% mais devagar) e ronda de investimento (+25 000 €). Cada uma pede um nível mínimo.
- **Missões** (`opcoes.missoes`, ligadas nos jogos novos): três de cada vez, sempre à vista à esquerda. As três
  primeiras ensinam o jogo (contratar, sala, lançar); depois rodam por qualidade, faturação, tipos, decoração,
  caixa, felicidade e equipas, com alvos que crescem com o nível. Dão XP e, a partir do nível 4, dinheiro
  (`RECOMPENSAS` em `sim.ts`). Não usam o gerador aleatório.
- **Críticas**: cada lançamento recebe notas de 4 revistas (1–10, à volta de qualidade × 10, por hash), mostradas
  numa janela com as cartas a virar, a média e o veredicto. O jogo para enquanto a janela está aberta.
- `npm run sim` corre o equilíbrio duas vezes: sem missões (tem de dar o mesmo que antes) e com `--missoes`
  (as recompensas não podem salvar a expansão rápida). As melhorias não entram: os jogadores automáticos não as compram.

## Gráficos

Sombras PCF do sol, tone mapping ACES, céu e luzes que mudam com a hora (candeeiros e janelas acendem à noite),
alcatifas coloridas nas salas, secretárias com monitor que acende na cor da especialidade de quem trabalha
(azul programação, rosa design, verde testes), bonecos com camisola da cor da especialidade que andam e se
sentam a escrever, e um losango por cima da cabeça com a felicidade (verde ≥ 70, amarelo ≥ 40, vermelho).
Na qualidade alta há brilho (bloom) nos ecrãs, losangos, candeeiros, janelas e partículas; na média, só a vinheta e
a saturação. De quem trabalha sobem símbolos da sua área (`</>`, ◆, ✓); no fecho de um mês com lucro sai um repuxo
de moedas e o saldo sobe no ecrã.

## Controlos

- **Botão direito** roda a câmara, **botão do meio** arrasta, **roda** faz zoom; **WASD**/setas movem, **Q/E** rodam.
- Teclas **1–6** escolhem a ferramenta, **Esc** cancela / abre a pausa, **Espaço** pausa, **Ctrl+S** guarda, **M** melhorias.
- **Parede** (100 € por segmento): arrasta entre dois cantos da grelha. Uma zona fechada por paredes passa a ser
  uma **sala** (o chão ganha cor). A parede exterior da entrada (quadrado verde) recebe sempre uma porta.
- **Porta** (300 €): clica numa parede existente.
- **Secretária** (500 €): clica numa célula.
- **Decoração**: planta (150 €, +3), sofá (600 €, +5), máquina de café (900 €, +8), matraquilhos (1 500 €, +10).
  Ocupa uma célula e bloqueia a passagem. Sobe o alvo de felicidade (75) de quem trabalha na mesma sala; fora das
  salas, de quem está a 5 células ou menos. Cada objeto repetido do mesmo tipo vale metade do anterior; máximo +25.
  Mais felicidade = mais ritmo de trabalho (competência × (0,5 + felicidade/200)).
- **Demolir**: clica numa parede, porta, secretária ou objeto, ou arrasta para demolir um troço de parede. Sem reembolso.
- Secretárias e decoração mostram uma pré-visualização: verde se dá para colocar, vermelha se não.

## Guardar e carregar

- **Guardar** (barra de cima) guarda o jogo neste browser (`localStorage`, chave `software-lda.save`).
- **Autosave** no fecho de cada mês (`software-lda.autosave`), exceto depois de uma falência, para não
  apagar o último jogo bom.
- **Carregar** e o arranque da página usam o mais recente dos dois. Um jogo novo passa logo a ser o mais recente.
- O save é o `Estado` em JSON com uma versão (`VERSAO_SAVE`, agora 3; os saves das versões 1 e 2 são migrados). `importarJogo` em `sim.ts` valida tudo
  (campos, tamanhos das paredes, ids de projetos e secretárias referidos pelos funcionários…) e recusa um save
  corrompido com uma mensagem, em vez de o deixar estragar o jogo. Como o gerador aleatório vive no estado, um jogo
  carregado continua exatamente como o original continuaria (há um teste para isso).

## Conquistas e eventos

- **15 conquistas** (`CONQUISTAS` em `sim.ts`): primeira contratação, primeiro produto, 5 e 10 funcionários,
  3 salas, 5 objetos de decoração, bom ambiente, qualidade 90%, lançar um jogo, um de cada tipo, 20 000 € num mês,
  100 000 € e 1 000 000 € em caixa, 1 e 5 anos. Ficam no estado (`s.conquistas`) e no save.
- **Eventos aleatórios** (opção do jogo novo): no fecho de cada mês, 35% de hipótese de um evento entre os
  possíveis — revista elogia um produto (+50% vendas), investidor (+6 000 € se houver pouco dinheiro), prémio,
  feira de emprego (+2 candidatos), jantar de equipa (+10 felicidade), avaria, gripe, pirataria (−30% vendas),
  inspeção das Finanças. Os cenários de equilíbrio correm **sem** eventos, por isso as metas não mudam.
- **Histórico**: cada fecho de mês guarda receitas, despesas e caixa (`s.historico`), para o gráfico.

## Movimento dos funcionários

Andam pela grelha com **A\*** (4 direções): as paredes bloqueiam, as portas deixam passar e as secretárias são
obstáculos (menos a de destino), tal como a decoração. Quando o mapa muda, quem está a andar recalcula o caminho. Sem caminho, o
funcionário fica **Sem acesso à secretária** (espera à entrada) ou **Preso** (vai para casa à meia-noite); as duas
situações baixam a felicidade.

Em `npm run dev` ficam disponíveis na consola `__jogo` (estado), `__camara`, `__controlos` e `__ecra(x, z)`
(vértice da grelha → píxeis).

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
