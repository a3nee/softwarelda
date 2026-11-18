// Testes da lógica sem 3D: correm em Node com `npm run sim` (seguidos de simtest.ts).
import {
  avancar, calcularCaminho, colocarParedes, colocarPorta, colocarSecretaria, contratar,
  detetarSalas, ECON, fatorMercado, iniciarProjeto, MIN_POR_DIA, novoJogo, segmento,
  type Estado,
} from './sim.ts';

// ---------------------------------------------------------------------------
// Testes da lógica (falham com exceção, o que faz o comando terminar com erro)
// ---------------------------------------------------------------------------

let testes = 0;
function verificar(condicao: boolean, descricao: string): void {
  testes++;
  if (!condicao) throw new Error(`Teste falhou: ${descricao}`);
}

/** Desenha um retângulo de paredes entre os vértices (x0,z0) e (x1,z1). */
function caixa(s: Estado, x0: number, z0: number, x1: number, z1: number): void {
  colocarParedes(s, [
    ...segmento(x0, z0, x1, z0), ...segmento(x0, z1, x1, z1),
    ...segmento(x0, z0, x0, z1), ...segmento(x1, z0, x1, z1),
  ]);
}

{
  const s = novoJogo(1);
  s.dinheiro = 1e6;
  const c = calcularCaminho(s, { x: 0, z: 0 }, { x: 3, z: 0 });
  verificar(c !== null && c.length === 3, 'caminho em espaço aberto tem 3 passos');

  // Parede vertical em toda a altura, na linha x = 5
  colocarParedes(s, segmento(5, 0, 5, s.altura));
  verificar(calcularCaminho(s, { x: 2, z: 2 }, { x: 8, z: 2 }) === null, 'parede corta o caminho');

  colocarPorta(s, { tipo: 'v', x: 5, z: 12 });
  const p = calcularCaminho(s, { x: 2, z: 2 }, { x: 8, z: 2 });
  verificar(p !== null, 'com porta já há caminho');
  verificar(p!.some((q) => q.x === 4 && q.z === 12) && p!.some((q) => q.x === 5 && q.z === 12),
    'o caminho passa pela porta');
  verificar(p!.length === 6 + 2 * 10, 'o caminho pela porta é o mais curto');

  // Secretárias bloqueiam a passagem, exceto a de destino
  const s2 = novoJogo(1);
  s2.dinheiro = 1e6;
  for (let z = 0; z < s2.altura; z++) colocarSecretaria(s2, 4, z);
  verificar(calcularCaminho(s2, { x: 0, z: 0 }, { x: 8, z: 0 }) === null, 'secretárias bloqueiam');
  verificar(calcularCaminho(s2, { x: 0, z: 0 }, { x: 4, z: 0 })?.length === 4, 'pode entrar na sua secretária');
}

{
  const s = novoJogo(1);
  s.dinheiro = 1e6;
  verificar(detetarSalas(s).total === 0, 'sem paredes não há salas');
  caixa(s, 10, 2, 13, 5);
  const salas = detetarSalas(s);
  verificar(salas.total === 1, 'uma caixa fechada é uma sala');
  verificar(salas.sala[3 * s.largura + 11] === 0, 'o interior pertence à sala');
  verificar(salas.sala[0] === -1, 'o resto é espaço aberto');
  colocarPorta(s, { tipo: 'h', x: 11, z: 5 });
  verificar(detetarSalas(s).total === 1, 'uma porta não desfaz a sala');
  caixa(s, 0, 0, s.largura, s.altura);
  verificar(detetarSalas(s).total === 2, 'muro à volta do terreno cria a segunda sala');
}

/** Escritório fechado com uma secretária; devolve o estado do funcionário a meio da manhã. */
function cenarioSala(comPorta: boolean): string {
  const s = novoJogo(7);
  s.dinheiro = 1e6;
  colocarSecretaria(s, 12, 9);
  caixa(s, 10, 7, 15, 12);
  if (comPorta) colocarPorta(s, { tipo: 'v', x: 10, z: 9 });
  contratar(s, 0);
  avancar(s, MIN_POR_DIA); // até às 07:30 do dia seguinte
  avancar(s, 3 * 60); // 10:30
  return s.funcionarios[0].estado;
}
verificar(cenarioSala(true) === 'aTrabalhar', 'com porta o funcionário chega à secretária');
verificar(cenarioSala(false) === 'semAcesso', 'sem porta fica sem acesso');

{
  // Prender alguém lá dentro: fecha a porta enquanto trabalha
  const s = novoJogo(7);
  s.dinheiro = 1e6;
  colocarSecretaria(s, 12, 9);
  caixa(s, 10, 7, 15, 12);
  colocarPorta(s, { tipo: 'v', x: 10, z: 9 });
  contratar(s, 0);
  avancar(s, MIN_POR_DIA + 3 * 60);
  colocarParedes(s, segmento(10, 9, 10, 10)); // não faz nada: já lá está a porta
  verificar(s.funcionarios[0].estado === 'aTrabalhar', 'porta continua aberta');
  s.paredesV[9 * (s.largura + 1) + 10] = 1; // porta vira parede
  s.versaoMapa++;
  avancar(s, 7 * 60); // 17:30
  verificar(s.funcionarios[0].estado === 'preso', 'sem saída fica preso');
  avancar(s, 7 * 60); // passa da meia-noite
  verificar(!s.funcionarios[0].dentro, 'à meia-noite vai para casa');
}

{
  // Saturação do mercado
  const s = novoJogo(1);
  verificar(fatorMercado(s) === 1, 'sem produtos o mercado está livre');
  s.produtos.push({ nome: 'A', qualidade: 1, vendasMes: ECON.vendasBase, receitaTotal: 0, lancadoEm: 0 });
  verificar(Math.abs(fatorMercado(s) - 1 / (1 + ECON.saturacao)) < 1e-9, 'um produto a vender bem satura o mercado');
  s.produtos[0].vendasMes = 0;
  verificar(fatorMercado(s) === 1, 'produtos que já não vendem não contam');

  // Um projeto quase acabado é lançado com vendas reduzidas pela saturação
  s.produtos[0].vendasMes = ECON.vendasBase;
  iniciarProjeto(s, 'B');
  s.projeto!.trabalhoFeito = s.projeto!.trabalhoTotal - 0.001;
  s.projeto!.somaCompetencia = s.projeto!.trabalhoFeito; // competência média 1 → qualidade 100%
  colocarSecretaria(s, 3, 3);
  contratar(s, 0);
  avancar(s, MIN_POR_DIA + 3 * 60);
  const b = s.produtos[1];
  verificar(b !== undefined && b.qualidade === 1, 'o projeto é lançado com qualidade 100%');
  verificar(b !== undefined && Math.abs(b.vendasMes - ECON.vendasBase / (1 + ECON.saturacao)) < 1,
    'as vendas do novo produto refletem a saturação');
}

console.log(`Testes: ${testes} OK`);
