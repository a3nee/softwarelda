// Testes da lógica sem 3D: correm em Node com `npm run sim` (seguidos de simtest.ts).
import {
  avancar, calcularCaminho, colocarParedes, colocarPorta, colocarSecretaria, contratar,
  comDependencias, detetarSalas, ECON, fatorMercado, iniciarProjeto, LISTA_TIPOS, MIN_POR_DIA,
  novoJogo, segmento, semDependentes, TIPOS, trabalhoDoProjeto, validarFuncionalidades, valorDoProjeto,
  vendasIniciais, AREAS, totalDaArea, areaDeTrabalho, estimarProjeto,
  cancelarProjeto, definirEquipa, despedir, eficienciaEquipa, membrosDe, semProjeto,
  exportarJogo, importarJogo, mesDeJogo, MIN_POR_MES, VERSAO_SAVE,
  bonusDecoracao, colocarObjeto, CONQUISTAS, DECORACAO, DIFICULDADES, EVENTOS, OBJETOS, objetoEm,
  removerObjeto, verificarConquistas, alvoFelicidade, comprarMelhoria, coordenacaoDe, criticasPara, ganharXp,
  nivelDaEmpresa, pontosMelhoria, rendaDe, verificarMissoes, xpDeLancamento, xpParaNivel, XP_CONQUISTA,
  avaliarEmpresa, rankingEmpresas, posicaoNoRanking, vendasFuturas, podeLevantar, levantarRonda, valorDaRonda,
  lancarCampanha, hypeComCampanha, aceitarContrato, pagamentoDoContrato,
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

  // Saves da versão 1 (antes da decoração, do histórico e das conquistas) continuam a carregar.
  const v1 = JSON.parse(bom);
  v1.versao = 1;
  for (const k of ['nome', 'dificuldade', 'eventos', 'objetos', 'historico', 'conquistas']) delete v1.estado[k];
  for (const m of v1.estado.mensagens) delete m.tipo;
  const r1 = importarJogo(JSON.stringify(v1));
  verificar(r1.ok && r1.estado.nome === 'Software Lda.' && r1.estado.objetos.length === 0 && !r1.estado.eventos,
    'um save da versão 1 carrega, com os valores por omissão da versão 2');
  verificar(!estragar((o) => { o.estado.objetos.push({ id: 9999, tipo: 'planta', x: 1, z: 1 }); }).ok, 'objeto com id inválido é recusado');
  verificar(!estragar((o) => { o.estado.objetos.push({ id: 1, tipo: 'piano', x: 1, z: 1 }); }).ok, 'objeto desconhecido é recusado');
  verificar(!estragar((o) => { o.estado.dificuldade = 'impossivel'; }).ok, 'dificuldade desconhecida é recusada');
}

// ---------------------------------------------------------------------------
// Empresa, decoração, histórico, conquistas e eventos
// ---------------------------------------------------------------------------

{
  const f = novoJogo(3, 24, 18, { nome: '  Bits & Bolos  ', dificuldade: 'facil', eventos: true });
  verificar(f.nome === 'Bits & Bolos' && f.dinheiro === DIFICULDADES.facil.dinheiro && f.eventos, 'opções do jogo novo');
  verificar(novoJogo(3, 24, 18, { dificuldade: 'dificil' }).dinheiro === DIFICULDADES.dificil.dinheiro, 'dificuldade difícil');
  verificar(novoJogo(3).nome === 'Software Lda.' && !novoJogo(3).eventos, 'por omissão: Software Lda., sem eventos');
}

{
  const s = novoJogo(4);
  s.dinheiro = 1e6;
  caixa(s, 2, 2, 8, 8); // sala de 6×6 (células 2..7)
  colocarPorta(s, { tipo: 'v', x: 2, z: 4 });
  colocarSecretaria(s, 4, 4);
  verificar(bonusDecoracao(s, 4, 4) === 0, 'sem decoração não há bónus');
  verificar(colocarObjeto(s, 'planta', 6, 6).ok, 'coloca uma planta');
  verificar(!colocarObjeto(s, 'sofa', 6, 6).ok, 'não coloca dois objetos na mesma célula');
  verificar(!colocarObjeto(s, 'sofa', 4, 4).ok && !colocarSecretaria(s, 6, 6).ok, 'objetos e secretárias não se sobrepõem');
  verificar(!colocarObjeto(s, 'sofa', s.entrada.x, s.entrada.z).ok, 'não bloqueia a entrada');
  verificar(bonusDecoracao(s, 4, 4) === OBJETOS.planta.felicidade, 'uma planta na sala dá o seu bónus');
  colocarObjeto(s, 'planta', 6, 5);
  verificar(bonusDecoracao(s, 4, 4) === OBJETOS.planta.felicidade * 1.5, 'a segunda planta vale metade');
  colocarObjeto(s, 'cafe', 12, 12); // fora da sala
  verificar(bonusDecoracao(s, 4, 4) === OBJETOS.planta.felicidade * 1.5, 'decoração de fora da sala não conta');
  verificar(bonusDecoracao(s, 14, 12) === OBJETOS.cafe.felicidade, 'no espaço aberto conta a decoração perto');
  verificar(bonusDecoracao(s, 20, 3) === 0, 'no espaço aberto, a decoração longe não conta');
  for (let i = 0; i < 3; i++) colocarObjeto(s, 'matraquilhos', 3 + i, 7);
  colocarObjeto(s, 'cafe', 7, 3);
  colocarObjeto(s, 'sofa', 3, 3);
  verificar(bonusDecoracao(s, 4, 4) === DECORACAO.bonusMaximo, 'o bónus tem um máximo');
  verificar(calcularCaminho(s, { x: 12, z: 11 }, { x: 12, z: 13 })!.length > 2, 'os objetos bloqueiam a passagem');
  const din = s.dinheiro;
  verificar(removerObjeto(s, 12, 12).ok && s.dinheiro === din && !objetoEm(s, 12, 12), 'demolir um objeto (sem reembolso)');

  // Com decoração, a felicidade sobe acima dos 75 de uma secretária simples.
  contratar(s, 0);
  avancar(s, 40 * MIN_POR_DIA);
  verificar(s.funcionarios[0].felicidade > 90, 'a decoração deixa a equipa mais feliz');
  verificar(s.conquistas.includes('contratar') && s.conquistas.includes('decorador'), 'conquistas desbloqueadas');
  verificar(s.mensagens.some((m) => m.tipo === 'conquista'), 'as conquistas avisam com uma mensagem');
  verificar(s.historico.length === 1 && s.historico[0].mes === 0 && s.historico[0].dinheiro === s.dinheiro,
    'o fecho do mês fica no histórico');
  const n = s.conquistas.length;
  verificarConquistas(s);
  verificar(s.conquistas.length === n, 'uma conquista só se desbloqueia uma vez');
  verificar(CONQUISTAS.every((c, i) => CONQUISTAS.findIndex((o) => o.id === c.id) === i), 'ids de conquistas únicos');
}

{
  // Eventos: em 3 anos com eventos há bons e maus, e o estado continua válido.
  const s = novoJogo(8, 24, 18, { eventos: true });
  s.dinheiro = 40000;
  for (let i = 0; i < 4; i++) colocarSecretaria(s, 5 + i, 5);
  contratar(s, 0);
  contratar(s, 0);
  for (let i = 0; i < 18; i++) {
    if (s.projetos.length === 0) iniciarProjeto(s, `P${i}`, 'utilitario');
    avancar(s, 2 * MIN_POR_MES);
    s.dinheiro = Math.max(s.dinheiro, 20000); // não deixar ir à falência
  }
  const tipos = new Set(s.mensagens.map((m) => m.tipo));
  verificar(tipos.has('evento') && tipos.has('aviso'), 'há eventos bons e maus');
  verificar(importarJogo(exportarJogo(s)).ok, 'o estado continua válido depois dos eventos');
  verificar(Object.keys(EVENTOS).length >= 8, 'há vários eventos');
}

// --- Progressão: nível, melhorias, missões e críticas ---
{
  verificar(xpParaNivel(1) === 0 && xpParaNivel(3) - xpParaNivel(2) > xpParaNivel(2) - xpParaNivel(1),
    'cada nível pede mais experiência do que o anterior');
  verificar(novoJogo(7).missoes.length === 0, 'sem a opção não há missões (os testes de equilíbrio correm assim)');
  const s = novoJogo(7, 24, 18, { missoes: true });
  verificar(s.missoes.map((m) => m.tipo).join() === 'contratar,sala,lancar', 'um jogo novo começa com as 3 missões de ensino');
  verificar(nivelDaEmpresa(s) === 1 && pontosMelhoria(s) === 0 && !comprarMelhoria(s, 'marketing').ok,
    'começa no nível 1, sem pontos para melhorias');

  for (let i = 0; i < 4; i++) colocarSecretaria(s, 3 + i, 3);
  const premio = s.missoes[0].dinheiro;
  const d0 = s.dinheiro;
  contratar(s, 0);
  verificar(s.missoesFeitas === 0, 'a missão só fica cumprida quando se chega ao alvo');
  contratar(s, 0);
  verificar(s.missoesFeitas === 1 && s.dinheiro === d0 + premio, 'cumprir uma missão paga a recompensa');
  verificar(s.missoes.length === 3 && !s.missoes.some((m) => m.tipo === 'contratar'), 'e aparece outra no lugar');
  verificar(s.xp === XP_CONQUISTA + 100, 'a conquista e a missão dão experiência');
  const semente = s.semente;
  s.missoes[0].alvo = 0;
  verificarMissoes(s);
  verificar(s.semente === semente && s.missoesFeitas === 2, 'gerar e pagar missões não usa o gerador aleatório');

  verificar(alvoFelicidade(s, s.funcionarios[0]) === 75, 'sem melhorias o alvo de felicidade é 75');
  s.xp = xpParaNivel(4) - 1;
  ganharXp(s, 1);
  verificar(nivelDaEmpresa(s) === 4 && pontosMelhoria(s) === 3 && s.mensagens.some((m) => m.tipo === 'nivel'),
    'subir de nível dá pontos de melhoria e uma mensagem');
  verificar(!comprarMelhoria(s, 'fas').ok, 'melhorias de nível alto ficam bloqueadas');
  verificar(comprarMelhoria(s, 'agil').ok && !comprarMelhoria(s, 'agil').ok, 'compra-se cada melhoria uma vez');
  verificar(eficienciaEquipa(4, coordenacaoDe(s)) > eficienciaEquipa(4), 'a metodologia ágil melhora as equipas grandes');
  comprarMelhoria(s, 'cafe');
  verificar(alvoFelicidade(s, s.funcionarios[0]) === 80, 'o café sobe o alvo de felicidade');
  comprarMelhoria(s, 'renda');
  verificar(rendaDe(s) < ECON.rendaMensal && pontosMelhoria(s) === 0, 'a renda negociada baixa a renda e gasta o último ponto');
  s.xp = xpParaNivel(6);
  const d1 = s.dinheiro;
  verificar(comprarMelhoria(s, 'investidores').ok && s.dinheiro === d1 + 25000, 'a ronda de investimento dá 25 000 €');

  const xp0 = s.xp;
  iniciarProjeto(s, 'Calculadora', 'utilitario');
  for (let i = 0; i < 12 && s.produtos.length === 0; i++) avancar(s, MIN_POR_MES / 2);
  const p = s.produtos[0];
  verificar(p !== undefined && p.criticas?.length === 4 && p.criticas.every((n) => n >= 1 && n <= 10), 'cada lançamento tem 4 críticas de 1 a 10');
  const media = p.criticas!.reduce((a, b) => a + b, 0) / 4;
  verificar(Math.abs(media - p.qualidade * 10) <= 1.8, 'as críticas andam à volta da qualidade');
  verificar(JSON.stringify(criticasPara('X', 0.7, 100)) === JSON.stringify(criticasPara('X', 0.7, 100)), 'as críticas são determinísticas');
  verificar(s.xp >= xp0 + xpDeLancamento('utilitario', p.qualidade), 'lançar dá experiência');
  verificar(s.missoesFeitas >= 3, 'lançar um produto cumpre a missão de lançamento');

  const bom = exportarJogo(s);
  const r = importarJogo(bom);
  verificar(r.ok && r.estado.melhorias.length === 4 && r.estado.missoes.length === s.missoes.length, 'a progressão é guardada');
  const estragar = (f: (o: any) => void) => { const o = JSON.parse(bom); f(o); return importarJogo(JSON.stringify(o)).ok; };
  verificar(!estragar((o) => { o.estado.melhorias.push('voar'); }), 'melhoria desconhecida é recusada');
  verificar(!estragar((o) => { o.estado.melhorias.push('agil'); }), 'melhoria repetida é recusada');
  verificar(!estragar((o) => { o.estado.missoes[0].tipo = 'dormir'; }), 'missão desconhecida é recusada');
  verificar(!estragar((o) => { o.estado.xp = -5; }), 'experiência negativa é recusada');
  const v2 = JSON.parse(bom);
  v2.versao = 2;
  for (const k of ['xp', 'melhorias', 'comMissoes', 'missoes', 'missoesFeitas', 'proximaMissao']) delete v2.estado[k];
  const r2 = importarJogo(JSON.stringify(v2));
  verificar(r2.ok && r2.estado.xp === 0 && r2.estado.comMissoes && r2.estado.missoes.length === 0,
    'um save da versão 2 carrega, sem experiência e com missões ligadas');
  if (r2.ok) {
    verificarMissoes(r2.estado);
    verificar(r2.estado.missoes.length === 3, 'e as missões aparecem na primeira verificação');
  }
}

// --- Avaliação, concorrentes e ranking ---
{
  const s = novoJogo(7);
  const a = avaliarEmpresa(s);
  verificar(a.total === 25000 && a.caixa === 25000, 'uma empresa nova vale o que tem em caixa');
  verificar(s.rivais.length === 6 && new Set(s.rivais.map((r) => r.nome)).size === 6, 'há 6 concorrentes com nomes diferentes');
  const r = rankingEmpresas(s);
  verificar(r.length === 7 && r.every((l, i) => i === 0 || r[i - 1].valor >= l.valor), 'o ranking tem 7 empresas por ordem de valor');
  verificar(posicaoNoRanking(s) === 7, 'uma empresa nova começa em último lugar');
  verificar(r.filter((l) => l.jogador).length === 1 && r.find((l) => l.jogador)!.nome === s.nome, 'o jogador aparece uma vez no ranking');

  const sem = novoJogo(7);
  sem.rivais = [];
  avancar(s, MIN_POR_MES);
  avancar(sem, MIN_POR_MES);
  verificar(s.semente === sem.semente, 'os concorrentes e os contratos não usam o gerador aleatório');
  const outro = novoJogo(7);
  avancar(outro, MIN_POR_MES);
  verificar(JSON.stringify(outro.rivais) === JSON.stringify(s.rivais), 'os concorrentes são determinísticos');
  verificar(s.rivais.every((x) => x.historico.length === 1), 'cada concorrente regista o fecho do mês');
  verificar(s.historico[0].valor === avaliarEmpresa(s).total, 'o fecho do mês regista a avaliação da empresa');
  verificar(s.ofertas.length === 3 && s.ofertas.every((o) => o.trabalho > 0 && o.pagamento > 0 && o.prazoDias >= 15),
    'há 3 ofertas de contrato por mês');
  verificar(JSON.stringify(s.ofertas) === JSON.stringify(outro.ofertas), 'as ofertas são determinísticas');

  s.produtos.push({ nome: 'X', tipo: 'utilitario', funcionalidades: [], qualidade: 0.8, vendasMes: 8000, receitaTotal: 0, lancadoEm: 0 });
  verificar(avaliarEmpresa(s).produtos === Math.round(vendasFuturas(8000, TIPOS.utilitario.queda) / 100) * 100,
    'os produtos valem as vendas futuras descontadas');
  verificar(vendasFuturas(8000, 0.8) > 8000 * 3 && vendasFuturas(8000, 0.8) < 8000 / 0.2, 'vendas futuras entre 3 meses e a soma infinita');
}

// --- Investidores ---
{
  const s = novoJogo(9);
  s.dinheiro = 100000;
  verificar(!podeLevantar(s, 'semente').ok, 'a ronda semente precisa do nível 3');
  s.xp = xpParaNivel(3);
  verificar(!podeLevantar(s, 'serieA').ok, 'a série A precisa da ronda semente primeiro');
  const v = valorDaRonda(s, 'semente');
  const d0 = s.dinheiro;
  verificar(v > 0 && levantarRonda(s, 'semente').ok && s.dinheiro === d0 + v && Math.abs(s.participacao - 0.1) < 1e-9,
    'a ronda semente vende 10% da empresa por dinheiro');
  verificar(!levantarRonda(s, 'semente').ok, 'cada ronda só se faz uma vez');
  s.produtos.push({ nome: 'X', tipo: 'utilitario', funcionalidades: [], qualidade: 0.8, vendasMes: 8000, receitaTotal: 0, lancadoEm: 0 });
  const antes = s.dinheiro;
  avancar(s, MIN_POR_MES - (s.minuto % MIN_POR_MES));
  const lucro = 8000 - rendaDe(s);
  verificar(s.dinheiro === antes + lucro - Math.round(lucro * 0.1), 'os investidores ficam com a sua parte do lucro do mês');
}

// --- Campanhas de marketing ---
{
  const s = novoJogo(11);
  s.dinheiro = 1e6;
  colocarSecretaria(s, 3, 3);
  contratar(s, 0);
  iniciarProjeto(s, 'Calc', 'utilitario');
  const gemeo = importarJogo(exportarJogo(s));
  verificar(gemeo.ok, 'o jogo com campanhas é copiado');
  const p = s.projetos[0];
  verificar(lancarCampanha(s, p.id, 'redes').ok && Math.abs(p.hype! - 0.12) < 1e-9, 'as redes sociais dão 12% de expectativa');
  verificar(!lancarCampanha(s, p.id, 'redes').ok, 'cada campanha só uma vez por projeto');
  verificar(!lancarCampanha(s, p.id, 'imprensa').ok, 'a imprensa precisa do nível 3');
  s.xp = xpParaNivel(6);
  lancarCampanha(s, p.id, 'imprensa');
  lancarCampanha(s, p.id, 'feira');
  const esperado = hypeComCampanha(hypeComCampanha(0.12, 'imprensa'), 'feira');
  verificar(Math.abs(p.hype! - esperado) < 1e-9 && p.hype! < 0.12 + 0.3 + 0.6 && p.hype! <= 1, 'as campanhas somam cada vez menos');
  if (gemeo.ok) {
    const g = gemeo.estado;
    for (let i = 0; i < 200 && s.produtos.length === 0; i++) { avancar(s, MIN_POR_DIA); avancar(g, MIN_POR_DIA); }
    verificar(s.produtos.length === 1 && g.produtos.length === 1
      && Math.abs(s.produtos[0].vendasMes / g.produtos[0].vendasMes - (1 + esperado)) < 1e-9,
    'o lançamento vende × (1 + expectativa)');
  }
}

// --- Contratos de clientes ---
{
  const s = novoJogo(5);
  s.dinheiro = 1e6;
  colocarSecretaria(s, 3, 3);
  colocarSecretaria(s, 5, 3);
  contratar(s, 0);
  contratar(s, 0);
  const o = s.ofertas[0];
  verificar(!aceitarContrato(s, o.id, []).ok, 'um contrato precisa de equipa');
  verificar(aceitarContrato(s, o.id, s.funcionarios.map((f) => f.id)).ok && s.ofertas.length === 2, 'aceitar um contrato tira-o das ofertas');
  const p = s.projetos[0];
  verificar(p.contrato?.pagamento === o.pagamento && p.trabalhoTotal === o.trabalho && membrosDe(s, p.id).length === 2,
    'o contrato vira um projeto com a equipa');
  verificar(!lancarCampanha(s, p.id, 'redes').ok, 'os contratos não têm marketing');
  verificar(!aceitarContrato(s, o.id, s.funcionarios.map((f) => f.id)).ok, 'a mesma oferta não se aceita duas vezes');
  for (let i = 0; i < 150 && s.projetos.length; i++) avancar(s, MIN_POR_DIA);
  verificar(s.projetos.length === 0 && s.produtos.length === 0 && s.contratosFeitos === 1, 'entregar um contrato não cria um produto');
  verificar(s.conquistas.includes('contrato') && semProjeto(s).length === 2, 'a equipa fica livre e a conquista desbloqueia');
  avancar(s, MIN_POR_MES - (s.minuto % MIN_POR_MES));
  verificar(s.historico[s.historico.length - 1].receitas > 0 && s.extraMes === 0, 'o pagamento entra nas receitas do mês');
  const c = { cliente: 'X', pagamento: 10000, prazo: 0 };
  verificar(pagamentoDoContrato(c, 1) === 10000 && pagamentoDoContrato(c, 0) === 7000
    && pagamentoDoContrato({ ...c, atrasado: true }, 1) === 6000, 'o pagamento depende da qualidade e do atraso');
  const o2 = s.ofertas[0];
  aceitarContrato(s, o2.id, [s.funcionarios[0].id]);
  s.projetos[0].contrato!.prazo = s.minuto;
  avancar(s, MIN_POR_DIA);
  verificar(s.projetos[0].contrato!.atrasado === true, 'passado o prazo, o contrato fica atrasado');

  // Guardar e carregar
  const bom = exportarJogo(s);
  const r = importarJogo(bom);
  verificar(r.ok && r.estado.rivais.length === 6 && r.estado.projetos[0].contrato?.atrasado === true, 'concorrentes e contratos são guardados');
  const estragar = (fn: (o: any) => void) => { const x = JSON.parse(bom); fn(x); return importarJogo(JSON.stringify(x)).ok; };
  verificar(!estragar((x) => { x.estado.rivais[0].tipo = 'banco'; }), 'concorrente com tipo desconhecido é recusado');
  verificar(!estragar((x) => { x.estado.participacao = 1; }), 'participação de 100% é recusada');
  verificar(!estragar((x) => { x.estado.rondas = ['semente', 'semente']; }), 'ronda repetida é recusada');
  verificar(!estragar((x) => { x.estado.ofertas[0].trabalho = -1; }), 'oferta estragada é recusada');
  verificar(!estragar((x) => { x.estado.projetos[0].contrato.pagamento = 'muito'; }), 'contrato estragado é recusado');
  verificar(!estragar((x) => { x.estado.projetos[0].campanhas = ['tv']; }), 'campanha desconhecida é recusada');
  const v3 = JSON.parse(bom);
  v3.versao = 3;
  v3.estado.minuto = 5 * MIN_POR_MES + 100;
  for (const k of ['sementeMundo', 'rivais', 'participacao', 'rondas', 'ofertas', 'contratosFeitos', 'extraMes']) delete v3.estado[k];
  const r3 = importarJogo(JSON.stringify(v3));
  verificar(r3.ok && r3.estado.rivais.length === 6 && r3.estado.rivais.every((x) => x.historico.length === 5)
    && r3.estado.participacao === 0, 'um save da versão 3 carrega, com os concorrentes já nos meses que passaram');
}

console.log(`Testes: ${testes} OK`);
