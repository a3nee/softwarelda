// Testes da lógica sem 3D: correm em Node com `npm run sim` (seguidos de simtest.ts).
import {
  avancar, calcularCaminho, colocarParedes, colocarPorta, colocarSecretaria, contratar,
  comDependencias, detetarSalas, ECON, fatorMercado, iniciarProjeto, LISTA_TIPOS, MIN_POR_DIA,
  novoJogo, segmento, semDependentes, TIPOS, trabalhoDoProjeto, validarFuncionalidades, valorDoProjeto,
  vendasIniciais, AREAS, totalDaArea, areaDeTrabalho, estimarProjeto,
  cancelarProjeto, definirEquipa, despedir, eficienciaEquipa, membrosDe, semProjeto,
  exportarJogo, importarJogo, mesDeJogo, MIN_POR_MES, VERSAO_SAVE,
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
  verificar(s.projetos[0].trabalhoTotal === 26000 && s.projetos[0].nome === 'Utilitário 1', 'projeto com trabalho e nome certos');
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
  const pr = s.projetos[0];
  for (const a of AREAS) {
    pr.feito[a] = totalDaArea(pr, a) - 0.001;
    pr.somaQualidade[a] = pr.feito[a];
  }
  pr.trabalhoFeito = pr.trabalhoTotal;
  colocarSecretaria(s, 3, 3);
  contratar(s, 0);
  avancar(s, MIN_POR_DIA + 3 * 60);
  verificar(s.produtos.length === 2, 'sem ninguém na equipa o projeto não avança');
  definirEquipa(s, s.funcionarios[0].id, pr.id);
  avancar(s, MIN_POR_DIA);
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

{
  // Equipas por projeto
  verificar(eficienciaEquipa(1) === 1 && eficienciaEquipa(2) < 1, 'equipas de 2+ perdem eficiência por pessoa');
  verificar(4 * eficienciaEquipa(4) > 3 * eficienciaEquipa(3), 'mas mais gente continua a fazer mais no total');
  const um: Trabalhador = { competencias: { programacao: 0.7, design: 0.7, testes: 0.7 }, felicidade: 70 };
  const sozinho = estimarProjeto([um], 'utilitario', []).meses;
  const seis = estimarProjeto([um, um, um, um, um, um], 'utilitario', []).meses;
  verificar(seis > sozinho / 6 * 1.2 && Math.abs(seis - sozinho / (6 * eficienciaEquipa(6))) < 0.05,
    'seis pessoas não fazem o projeto seis vezes mais depressa (perdem o custo de coordenação)');

  const s = novoJogo(9);
  s.dinheiro = 1e6;
  for (let i = 0; i < 3; i++) colocarSecretaria(s, 3 + i, 3);
  contratar(s, 0);
  contratar(s, 0);
  contratar(s, 0);
  const [a, b, c] = s.funcionarios.map((f) => f.id);
  verificar(iniciarProjeto(s, 'A', 'utilitario', [], [a, b]).ok, 'projeto A com 2 pessoas');
  verificar(semProjeto(s).length === 1, 'a terceira fica livre');
  verificar(iniciarProjeto(s, 'B', 'utilitario').ok, 'projeto B com quem está livre');
  const [pa, pb] = s.projetos;
  verificar(membrosDe(s, pa.id).length === 2 && membrosDe(s, pb.id).length === 1, 'cada projeto tem a sua equipa');
  verificar(iniciarProjeto(s, 'C', 'utilitario', [], [999]).ok === false, 'equipa com funcionário desconhecido é recusada');

  avancar(s, MIN_POR_DIA + 4 * 60);
  verificar(pa.trabalhoFeito > 0 && pb.trabalhoFeito > 0, 'os dois projetos avançam ao mesmo tempo');
  const feitoB = pb.trabalhoFeito;
  definirEquipa(s, c, pa.id);
  avancar(s, 60);
  verificar(pb.trabalhoFeito === feitoB, 'sem equipa o projeto B para');

  verificar(cancelarProjeto(s, pb.id).ok && s.projetos.length === 1, 'cancelar tira o projeto');
  despedir(s, a);
  verificar(membrosDe(s, pa.id).length === 2, 'despedir tira a pessoa da equipa');

  // Lançar liberta a equipa
  for (const ar of AREAS) pa.feito[ar] = totalDaArea(pa, ar);
  avancar(s, 1);
  verificar(s.projetos.length === 0 && semProjeto(s).length === 2, 'ao lançar, a equipa fica livre');
}

// ---------------------------------------------------------------------------
// Guardar e carregar
// ---------------------------------------------------------------------------
{
  // Um jogo a meio: paredes, porta, secretárias, equipa, projeto em curso e produto lançado.
  const s = novoJogo(21);
  caixa(s, 2, 2, 8, 8);
  colocarPorta(s, { tipo: 'v', x: 2, z: 4 });
  for (let i = 0; i < 3; i++) colocarSecretaria(s, 3 + i, 4);
  contratar(s, 0);
  contratar(s, 0);
  contratar(s, 0);
  iniciarProjeto(s, 'Primeiro', 'utilitario');
  avancar(s, 2 * MIN_POR_MES + 777);
  iniciarProjeto(s, 'Segundo', 'utilitario');
  avancar(s, 5 * MIN_POR_DIA + 600); // a meio de um dia de trabalho, com gente a andar
  verificar(s.produtos.length > 0 && s.projetos.length > 0, 'o jogo de teste tem produtos e um projeto em curso');

  const bom = exportarJogo(s);
  const r = importarJogo(bom);
  verificar(r.ok, 'um save acabado de exportar carrega');
  if (!r.ok) throw new Error(r.msg);
  const c = r.estado;
  verificar(JSON.stringify(c) === JSON.stringify(s), 'o estado carregado é igual ao guardado');
  verificar(c !== s && c.funcionarios[0] !== s.funcionarios[0], 'o estado carregado é uma cópia independente');

  // Determinismo: o jogo carregado continua exatamente como o original continuaria.
  avancar(s, 3 * MIN_POR_MES);
  avancar(c, 3 * MIN_POR_MES);
  verificar(JSON.stringify(c) === JSON.stringify(s), 'depois de carregar, o jogo segue igual ao original (3 meses depois)');
  verificar(mesDeJogo(s) === Math.floor(s.minuto / MIN_POR_MES), 'mesDeJogo conta os fechos de mês');

  // Saves maus são recusados com uma mensagem, nunca com uma exceção.
  const estragar = (f: (o: any) => void) => {
    const o = JSON.parse(bom);
    f(o);
    return importarJogo(JSON.stringify(o));
  };
  verificar(!importarJogo('{isto não é json').ok, 'JSON inválido é recusado');
  verificar(!importarJogo('[]').ok && !importarJogo('null').ok, 'algo que não é um save é recusado');
  verificar(!estragar((o) => { o.versao = VERSAO_SAVE + 1; }).ok, 'save de uma versão mais recente é recusado');
  verificar(!estragar((o) => { delete o.estado.dinheiro; }).ok, 'falta de um campo é recusada');
  verificar(!estragar((o) => { o.estado.paredesV.pop(); }).ok, 'paredes com o tamanho errado são recusadas');
  verificar(!estragar((o) => { o.estado.paredesH[0] = 7; }).ok, 'valor de aresta desconhecido é recusado');
  verificar(!estragar((o) => { o.estado.funcionarios[0].projetoId = 9999; }).ok, 'funcionário num projeto inexistente é recusado');
  verificar(!estragar((o) => { o.estado.funcionarios[0].secretariaId = 9999; }).ok, 'secretária inexistente é recusada');
  verificar(!estragar((o) => { o.estado.projetos[0].tipo = 'xadrez'; }).ok, 'tipo de software desconhecido é recusado');
  verificar(!estragar((o) => { o.estado.projetos.push({ ...o.estado.projetos[0] }); }).ok, 'ids repetidos são recusados');
  verificar(!estragar((o) => { o.estado.funcionarios[0].estado = 'aDormir'; }).ok, 'estado de funcionário desconhecido é recusado');
  verificar(!estragar((o) => { o.estado.dinheiro = 'muito'; }).ok, 'número que não é número é recusado');
  const msg = estragar((o) => { o.estado.paredesV.pop(); });
  verificar(!msg.ok && msg.msg.includes('paredes'), 'a mensagem diz o que está mal');
}

console.log(`Testes: ${testes} OK`);
