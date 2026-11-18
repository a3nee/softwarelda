// Testes da lógica sem 3D: correm em Node com `npm run sim` (seguidos de simtest.ts).
import {
  avancar, calcularCaminho, colocarParedes, colocarPorta, colocarSecretaria, contratar,
  comDependencias, detetarSalas, ECON, fatorMercado, iniciarProjeto, LISTA_TIPOS, MIN_POR_DIA,
  novoJogo, segmento, semDependentes, TIPOS, trabalhoDoProjeto, validarFuncionalidades, valorDoProjeto,
  vendasIniciais, AREAS, totalDaArea, areaDeTrabalho, estimarProjeto,
  type Estado, type TipoSoftware, type Trabalhador,
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
  // Definições dos tipos: dependências existem, são do mesmo tipo e não há ciclos
  for (const t of LISTA_TIPOS) {
    const ids = TIPOS[t].funcionalidades.map((f) => f.id);
    TIPOS[t].funcionalidades.forEach((f, i) =>
      verificar(f.requer.every((r) => ids.indexOf(r) >= 0 && ids.indexOf(r) < i),
        `${t}/${f.id}: dependências existem e vêm antes (sem ciclos)`));
  }

  // Dependências
  verificar(comDependencias('editor', ['tabelas']).join() === 'formatacao,tabelas', 'escolher tabelas junta a formatação');
  verificar(semDependentes('editor', ['corretor', 'formatacao', 'tabelas', 'nuvem'], 'formatacao').join() === 'corretor',
    'tirar a formatação tira tabelas e nuvem');
  verificar(!validarFuncionalidades('editor', ['tabelas']).ok, 'tabelas sem formatação é inválido');
  verificar(validarFuncionalidades('editor', ['formatacao', 'tabelas']).ok, 'tabelas com formatação é válido');
  verificar(trabalhoDoProjeto('utilitario', ['grafica', 'agendamento']) === 20000 + 6000 + 5000, 'trabalho soma as funcionalidades');
  verificar(Math.abs(valorDoProjeto('utilitario', ['grafica', 'agendamento']) - 1.45) < 1e-9, 'valor soma as funcionalidades');

  // Desbloqueio e validação ao iniciar
  const s = novoJogo(1);
  verificar(!iniciarProjeto(s, '', 'editor').ok, 'editor bloqueado sem produtos');
  verificar(!iniciarProjeto(s, '', 'utilitario', ['agendamento']).ok, 'projeto com dependência em falta é recusado');
  verificar(iniciarProjeto(s, '', 'utilitario', ['grafica']).ok, 'utilitário com interface gráfica começa');
  verificar(s.projeto!.trabalhoTotal === 26000 && s.projeto!.nome === 'Utilitário 1', 'projeto com trabalho e nome certos');
}

{
  // Saturação do mercado, separada por tipo
  const s = novoJogo(1);
  const produto = (tipo: TipoSoftware, vendasMes: number) =>
    ({ nome: 'X', tipo, funcionalidades: [], qualidade: 1, vendasMes, receitaTotal: 0, lancadoEm: 0 });
  verificar(fatorMercado(s, 'utilitario') === 1, 'sem produtos o mercado está livre');
  s.produtos.push(produto('utilitario', TIPOS.utilitario.vendas));
  verificar(Math.abs(fatorMercado(s, 'utilitario') - 1 / (1 + ECON.saturacao)) < 1e-9, 'um produto a vender bem satura o mercado');
  verificar(fatorMercado(s, 'editor') === 1, 'um utilitário não satura o mercado dos editores');
  s.produtos[0].vendasMes = 0;
  verificar(fatorMercado(s, 'utilitario') === 1, 'produtos que já não vendem não contam');

  // Um editor quase acabado é lançado com vendas reduzidas pela saturação dos editores
  s.produtos[0].vendasMes = TIPOS.utilitario.vendas;
  s.produtos.push(produto('editor', TIPOS.editor.vendas));
  verificar(iniciarProjeto(s, 'B', 'editor', ['corretor']).ok, 'editor desbloqueado com produtos lançados');
  // Quase acabado e feito por gente com competência 1 em todas as áreas → qualidade 100%
  const pr = s.projeto!;
  for (const a of AREAS) {
    pr.feito[a] = totalDaArea(pr, a) - 0.001;
    pr.somaQualidade[a] = pr.feito[a];
  }
  pr.trabalhoFeito = pr.trabalhoTotal;
  colocarSecretaria(s, 3, 3);
  contratar(s, 0);
  avancar(s, MIN_POR_DIA + 3 * 60);
  const b = s.produtos[2];
  verificar(b !== undefined && b.qualidade === 1 && b.tipo === 'editor', 'o editor é lançado com qualidade 100%');
  verificar(b !== undefined && Math.abs(b.vendasMes - TIPOS.editor.vendas * 1.3 / (1 + ECON.saturacao)) < 1,
    'as vendas do editor refletem as funcionalidades e a saturação');
  verificar(Math.abs(vendasIniciais('jogo', [], 0.5, 1) - TIPOS.jogo.vendas * 0.5 ** 1.5) < 1e-6,
    'os jogos castigam mais a falta de qualidade');
}

{
  // Competências por área
  for (const t of LISTA_TIPOS)
    verificar(Math.abs(AREAS.reduce((x, a) => x + TIPOS[t].areas[a], 0) - 1) < 1e-9, `${t}: as áreas somam 100%`);
  const s = novoJogo(3);
  verificar(s.candidatos.every((c) => AREAS.every((a) => c.competencias[a] > 0 && c.competencias[a] <= 1)),
    'candidatos com competências entre 0 e 1');

  const prog: Trabalhador = { competencias: { programacao: 0.9, design: 0.2, testes: 0.3 }, felicidade: 70 };
  const designer: Trabalhador = { competencias: { programacao: 0.2, design: 0.9, testes: 0.3 }, felicidade: 70 };
  const p = {
    tipo: 'jogo' as TipoSoftware, trabalhoTotal: 1000, trabalhoFeito: 0,
    feito: { programacao: 0, design: 0, testes: 0 }, somaQualidade: { programacao: 0, design: 0, testes: 0 },
  };
  verificar(areaDeTrabalho(p, prog) === 'programacao' && areaDeTrabalho(p, designer) === 'design',
    'cada um trabalha na sua especialidade');
  p.feito.programacao = totalDaArea(p, 'programacao');
  verificar(areaDeTrabalho(p, prog) === 'testes', 'acabada a programação, o programador passa para a sua melhor área seguinte');

  const soProg = estimarProjeto([prog, prog], 'jogo', []);
  const mista = estimarProjeto([prog, designer], 'jogo', []);
  verificar(mista.meses < soProg.meses, 'um jogo com designer acaba mais depressa do que só com programadores');
  verificar(mista.qualidade > soProg.qualidade + 0.2, 'e com muito melhor qualidade');
  verificar(estimarProjeto([], 'utilitario', []).meses === Infinity, 'sem equipa não acaba');

  // A previsão bate com a simulação a sério (mesmo funcionário, utilitário base)
  const r = novoJogo(5);
  colocarSecretaria(r, 3, 3);
  contratar(r, 0);
  const f = r.funcionarios[0];
  const previsto = estimarProjeto([f], 'utilitario', []);
  iniciarProjeto(r, '', 'utilitario');
  let dias = 0;
  while (r.produtos.length === 0 && dias < 400) {
    avancar(r, MIN_POR_DIA);
    dias++;
  }
  verificar(Math.abs(dias / 30 - previsto.meses) < 0.25, `a previsão de duração acerta (${previsto.meses.toFixed(2)} vs ${(dias / 30).toFixed(2)} meses)`);
  verificar(Math.abs(r.produtos[0].qualidade - previsto.qualidade) < 0.02, 'a previsão de qualidade acerta');
}

console.log(`Testes: ${testes} OK`);
