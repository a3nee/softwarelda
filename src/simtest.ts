// Cenários de equilíbrio da economia nos 2 primeiros anos.
// Corre com `npm run simtest` (também faz parte de `npm run sim`).
// Cada cenário é um "jogador" automático, corrido com várias sementes.
// Termina com erro se alguma meta de equilíbrio falhar.
import {
  avancar, colocarSecretaria, moverMovel, rodarMovel, APARENCIA_INICIAL, fundadorDe, criarFundador, despedir, valorCasa, comprarCasa, arrendarCasa, alugarCasa, rendasRecebidas, rendaCasa,
  custosPatrimonio, comprarCarro, prestigio, valorCarro, CARROS, PATRIMONIO, venderCasa, contratar, ECON, fatorMercado, iniciarProjeto, capacidadeServidor, potencialUtilizadores, pagantesDe, definirPlano, plataformaDe, updateDe, eProdutoNovo, funcionalidadesParaUpdate, iniciarUpdate, cargaServidor, SERVIDORES, mudarServidor, LISTA_TIPOS, MIN_POR_DIA, DIAS_POR_MES,
  MIN_POR_MES, novoJogo, textoData, tipoDisponivel, TIPOS, validarFuncionalidades, vendasIniciais,
  AREAS, competenciaMedia, definirEquipa, estimarProjeto, membrosDe, semProjeto,
  funcionalidadeDisponivel, iniciarManutencao, manutencaoDe, vendasComBugs, fatorBugs, alternarCrunch, deBaixa,
  escolherPesquisa, financiarPesquisa, temTecnologia, PESQUISA, TECNOLOGIAS, eraNoMes, fatorEraNa, fatorEra,
  exportarJogo, importarJogo, VERSAO_SAVE,
  TRACOS, relacaoEntre, AMIZADE, iniciarFormacao, FORMACAO, ausente, ESCRITORIOS, mudarEscritorio, dentroDoEscritorio,
  limitesDoEscritorio, rendaDe, comprarRival, precoAquisicao, entrarEmBolsa, podeEntrarEmBolsa, FEIRAS, irAFeira,
  feirasDisponiveis, avaliarEmpresa, SANDBOX_DINHEIRO, DESAFIOS,
  type Funcionario, type Area, type Competencias, type Estado, type TipoSoftware,
} from './sim.ts';

const MESES = 24;
// Com --missoes, os mesmos jogadores ganham também as recompensas das missões (o jogo a sério tem-nas ligadas).
const COM_MISSOES = ((globalThis as { process?: { argv: string[] } }).process?.argv ?? []).includes('--missoes');
const SEMENTES = [1, 2, 3, 4, 5, 6, 7, 8];
const RESERVA = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.RESERVA ?? 6); // meses de despesas que o jogador prudente quer guardar antes de contratar

/** Chamado todos os dias às 07:30, antes de os funcionários chegarem. */
type Jogador = (s: Estado, dia: number) => void;

// ---------------------------------------------------------------------------
// Ações comuns dos jogadores
// ---------------------------------------------------------------------------

/** Garante n secretárias, em filas perto da entrada. */
function secretarias(s: Estado, n: number): void {
  for (let i = s.secretarias.length; i < n; i++)
    if (!colocarSecretaria(s, 3 + (i % 8), 4 + 3 * Math.floor(i / 8)).ok) break;
}

/** Peso médio de cada área nos tipos de software desbloqueados. */
function pesosAreas(s: Estado): Competencias {
  const tipos = LISTA_TIPOS.filter((t) => tipoDisponivel(s, t));
  const r = { programacao: 0, design: 0, testes: 0 };
  for (const t of tipos) for (const a of AREAS) r[a] += TIPOS[t].areas[a] / tipos.length;
  return r;
}

/**
 * Candidato com melhor valor por euro (-1 se não houver): o que acrescenta onde a equipa é mais
 * fraca (pesado pelas áreas que os projetos pedem), mais um pouco pela competência geral.
 */
function melhorCandidato(s: Estado): number {
  const pesos = pesosAreas(s);
  const melhorEquipa = (a: Area) => Math.max(0, ...s.funcionarios.map((f) => f.competencias[a]));
  let melhor = -1;
  let valor = -Infinity;
  s.candidatos.forEach((c, i) => {
    const ganho = AREAS.reduce((t, a) => t + pesos[a] * Math.max(0, c.competencias[a] - melhorEquipa(a)), 0)
      + 0.25 * competenciaMedia(c.competencias);
    if (ganho / c.salario > valor) {
      valor = ganho / c.salario;
      melhor = i;
    }
  });
  return melhor;
}

function contratarMelhor(s: Estado): void {
  const i = melhorCandidato(s);
  if (i < 0) return;
  secretarias(s, s.funcionarios.length + 1);
  contratar(s, i);
}

function despesasMensais(s: Estado): number {
  return s.funcionarios.reduce((t, f) => t + f.salario, 0) + ECON.rendaMensal;
}

/** Subconjuntos de funcionalidades que respeitam as dependências. */
function combinacoes(s: Estado, tipo: TipoSoftware): string[][] {
  const ids = TIPOS[tipo].funcionalidades.filter((f) => funcionalidadeDisponivel(s, tipo, f.id)).map((f) => f.id);
  const r: string[][] = [];
  for (let m = 0; m < 1 << ids.length; m++) {
    const escolha = ids.filter((_, i) => m & (1 << i));
    if (validarFuncionalidades(tipo, escolha).ok) r.push(escolha);
  }
  return r;
}

/**
 * Escolha "razoável": entre os tipos permitidos, o projeto que a equipa acaba em 3 meses ou menos
 * (pela previsão do jogo) e que rende mais por mês de trabalho (qualidade prevista, mercado e curva
 * de vendas). Se nada couber em 3 meses, o mais rápido.
 */
function escolherProjeto(
  s: Estado, tipos: TipoSoftware[], equipa: Funcionario[],
): { tipo: TipoSoftware; funcionalidades: string[] } {
  let melhor = { tipo: 'utilitario' as TipoSoftware, funcionalidades: [] as string[] };
  let pontuacao = -Infinity;
  for (const tipo of tipos) {
    if (!tipoDisponivel(s, tipo)) continue;
    for (const escolha of combinacoes(s, tipo)) {
      const e = estimarProjeto(equipa, tipo, escolha);
      const receita = vendasIniciais(tipo, escolha, e.qualidade, fatorMercado(s, tipo)) / (1 - TIPOS[tipo].queda);
      const p = e.meses <= 3 ? receita / e.meses : -1e9 - e.meses; // fora do limite: só conta a rapidez
      if (p > pontuacao) {
        pontuacao = p;
        melhor = { tipo, funcionalidades: escolha };
      }
    }
  }
  return melhor;
}

/** Tamanho máximo das equipas que os jogadores formam. */
const TAMANHO_EQUIPA = 3;
/** Bugs a partir dos quais os jogadores prudentes fazem um patch (0 = nunca). */
const PATCH_BUGS = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PATCH_BUGS ?? 15);

/**
 * Ninguém fica parado: quem está livre forma uma equipa nova (até TAMANHO_EQUIPA pessoas) com o
 * melhor projeto para essa equipa; uma pessoa sozinha, havendo projetos, junta-se à equipa mais pequena.
 */
function gerirEquipas(s: Estado, tipos: TipoSoftware[] = LISTA_TIPOS): void {
  const plat = plataformaDe(s);
  for (let livres = semProjeto(s); livres.length > 0; livres = semProjeto(s)) {
    const menor = s.projetos
      .map((p) => ({ p, n: membrosDe(s, p.id).length }))
      .sort((a, b) => a.n - b.n)[0];
    if (menor && (menor.n < TAMANHO_EQUIPA || (plat !== undefined && updateDe(s, plat)) || s.projetos.some(eProdutoNovo))) {
      definirEquipa(s, livres[0].id, menor.p.id);
      continue;
    }
    const equipa = livres.slice(0, TAMANHO_EQUIPA).map((f) => f.id);
    if (plat === undefined) {
      const e = escolherProjeto(s, tipos, livres.slice(0, TAMANHO_EQUIPA));
      if (!iniciarProjeto(s, '', e.tipo, e.funcionalidades, equipa).ok) return;
    } else {
      const novas = funcionalidadesParaUpdate(s, plat).filter((f) => validarFuncionalidades(s.produtos[plat].tipo, [...s.produtos[plat].funcionalidades, f]).ok);
      if (!iniciarUpdate(s, plat, novas.slice(0, 1), equipa).ok) return;
    }
  }
}

/** Faz upgrade aos servidores antes de encherem (se houver dinheiro). */
function gerirServidores(s: Estado): void {
  const plat = plataformaDe(s);
  if (plat === undefined) return;
  const p = s.produtos[plat];
  const nivel = p.servidor ?? 0;
  if (cargaServidor(s, p) > 0.8 && SERVIDORES[nivel + 1] && s.dinheiro > SERVIDORES[nivel + 1].custo * 3) mudarServidor(s, plat, nivel + 1);
}

// ---------------------------------------------------------------------------
// Jogadores
// ---------------------------------------------------------------------------

/**
 * Contrata 2, põe toda a gente a trabalhar (equipas de até 3) e só cresce com 2+ produtos lançados
 * e uma reserva de 6 meses de despesas (já a contar com o novo salário). Máximo 6 pessoas.
 * Quando um produto que ainda vende bem tem muitos bugs, põe uma pessoa livre a fazer um patch.
 */
function prudente(tipos: TipoSoftware[]): Jogador {
  return (s, dia) => {
    if (dia === 0) {
      contratarMelhor(s);
      contratarMelhor(s);
    }
    const comBugs = PATCH_BUGS ? s.produtos.findIndex((p, i) => (p.bugs ?? 0) >= PATCH_BUGS && vendasComBugs(p) >= 2000 && !manutencaoDe(s, i)) : -1;
    const livres = semProjeto(s);
    if (comBugs >= 0 && livres.length) iniciarManutencao(s, comBugs, [livres[0].id]);
    gerirEquipas(s, tipos);
    gerirServidores(s);
    const c = s.candidatos[melhorCandidato(s)];
    if (c && s.produtos.length >= 1 && s.funcionarios.length < 6
      && s.dinheiro > RESERVA * (despesasMensais(s) + c.salario))
      contratarMelhor(s);
  };
}

const JOGADORES: Record<string, Jogador> = {
  /** Não faz nada: só paga a renda. */
  passivo: () => {},

  /** Contrata 2 pessoas mas nunca começa um projeto. */
  'passivo c/ equipa': (s, dia) => {
    if (dia === 0) {
      contratarMelhor(s);
      contratarMelhor(s);
    }
  },

  razoável: prudente(LISTA_TIPOS),

  /** Como o razoável, mas só faz utilitários (nunca diversifica). */
  'só utilitários': prudente(['utilitario']),

  /** Contrata 6 pessoas no 1.º mês e põe toda a gente a trabalhar. */
  'expansão rápida': (s, dia) => {
    if (dia === 0 || dia === DIAS_POR_MES) for (let i = 0; i < 3; i++) contratarMelhor(s);
    gerirEquipas(s);
    gerirServidores(s);
  },
};

// ---------------------------------------------------------------------------
// Corrida
// ---------------------------------------------------------------------------

interface Corrida {
  falenciaMes: number | null;
  minimo: number;
  final: number;
  lucroAno1: number;
  lucroAno2: number;
  primeiroLancamento: number | null; // mês (1 = janeiro do ano 1)
  produtos: number;
  porTipo: Record<TipoSoftware, number>;
  equipa: number;
  caixaMensal: number[]; // dinheiro no fim de cada mês
}

// Depuração: DIARIO="razoável:3" mostra as mensagens do jogo dessa corrida.
const DIARIO = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.DIARIO;

function correr(jogador: Jogador, semente: number, nome = ''): Corrida {
  const s = novoJogo(semente, 24, 18, { missoes: COM_MISSOES });
  let minimo = s.dinheiro;
  const caixaMensal: number[] = [];
  const diario = DIARIO === `${nome}:${semente}`;
  let vistas = 0;
  for (let dia = 0; dia < MESES * DIAS_POR_MES && !s.falencia; dia++) {
    jogador(s, dia);
    minimo = Math.min(minimo, s.dinheiro);
    const mes = Math.floor(s.minuto / MIN_POR_MES);
    avancar(s, MIN_POR_DIA);
    minimo = Math.min(minimo, s.dinheiro);
    if (Math.floor(s.minuto / MIN_POR_MES) > mes) caixaMensal.push(s.dinheiro);
    if (diario) {
      const novas = s.mensagens.filter((m) => m.minuto > vistas && !m.texto.includes('não consegue'));
      for (const m of novas) console.log(`  [${textoData(m.minuto)}] ${m.texto}`);
      if (s.mensagens.length) vistas = s.mensagens[s.mensagens.length - 1].minuto;
    }
  }
  const caixa = (m: number) => (m === 0 ? ECON.dinheiroInicial : caixaMensal[m - 1] ?? s.dinheiro);
  const p0 = s.produtos[0];
  return {
    falenciaMes: s.falencia ? caixaMensal.length : null,
    minimo,
    final: s.dinheiro,
    lucroAno1: caixa(12) - caixa(0),
    lucroAno2: caixa(24) - caixa(12),
    primeiroLancamento: p0 ? Math.floor(p0.lancadoEm / MIN_POR_MES) + 1 : null,
    produtos: s.produtos.length,
    porTipo: Object.fromEntries(LISTA_TIPOS.map((t) => [t, s.produtos.filter((p) => p.tipo === t).length])) as Record<TipoSoftware, number>,
    equipa: s.funcionarios.length,
    caixaMensal,
  };
}

function mediana(v: number[]): number {
  if (v.length === 0) return NaN;
  const o = [...v].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

const k = (v: number) => (Number.isFinite(v) ? `${(v / 1000).toFixed(0)}k` : '—');

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

const resultados: Record<string, Corrida[]> = {};
console.log(`${COM_MISSOES ? '\n=== Com missões ===\n' : ''}Equilíbrio: ${MESES} meses × ${SEMENTES.length} sementes (valores em milhares de €)\n`);
console.log('Cenário            | Falências | Caixa mín. | Final mín/med/máx | Lucro ano1/ano2 | 1.º lanç. | Produtos | Equipa');
for (const [nome, jogador] of Object.entries(JOGADORES)) {
  const r = SEMENTES.map((sem) => correr(jogador, sem, nome));
  resultados[nome] = r;
  const vivos = r.filter((c) => c.falenciaMes === null);
  const fal = r.filter((c) => c.falenciaMes !== null).map((c) => c.falenciaMes!);
  const finais = vivos.map((c) => c.final);
  const lanc = r.map((c) => c.primeiroLancamento).filter((m): m is number => m !== null);
  console.log([
    nome.padEnd(18),
    `${fal.length}/${r.length}${fal.length ? ` (m${Math.min(...fal)})` : ''}`.padEnd(9),
    k(Math.min(...r.map((c) => c.minimo))).padStart(10),
    `${k(Math.min(...finais))}/${k(mediana(finais))}/${k(Math.max(...finais))}`.padStart(17),
    `${k(mediana(vivos.map((c) => c.lucroAno1)))}/${k(mediana(vivos.map((c) => c.lucroAno2)))}`.padStart(15),
    (lanc.length ? `mês ${mediana(lanc)}` : '—').padStart(9),
    String(mediana(r.map((c) => c.produtos))).padStart(8),
    String(mediana(r.map((c) => c.equipa))).padStart(6),
  ].join(' | '));
}

const curva = resultados['razoável'][0].caixaMensal;
console.log(`\nCaixa do jogador razoável (semente ${SEMENTES[0]}), fim de cada mês:`);
console.log(curva.map((v, i) => `${i + 1}:${k(v)}`).join(' '));
console.log(`Caixa mínima do razoável por semente: ${resultados['razoável'].map((c) => k(c.minimo)).join(' ')}`);
for (const nome of ['razoável', 'expansão rápida'])
  console.log(`Produtos por tipo (${nome}, mediana): ${LISTA_TIPOS.map((t) => `${TIPOS[t].plural} ${mediana(resultados[nome].map((c) => c.porTipo[t]))}`).join(' · ')}`);

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

let falhas = 0;
function meta(descricao: string, ok: boolean): void {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${descricao}`);
}

const passivo = resultados['passivo'];
const passivoEquipa = resultados['passivo c/ equipa'];
const razoavel = resultados['razoável'];
const rapida = resultados['expansão rápida'];
const finaisRazoavel = razoavel.map((c) => c.final);

console.log('\nMetas:');
meta('Passivo não ganha dinheiro: acaba abaixo de metade do dinheiro inicial',
  passivo.every((c) => c.final < ECON.dinheiroInicial / 2));
meta('Passivo com equipa vai à falência antes do mês 12 em todas as sementes',
  passivoEquipa.every((c) => c.falenciaMes !== null && c.falenciaMes < 12));
meta('Razoável nunca vai à falência', razoavel.every((c) => c.falenciaMes === null));
meta('Razoável passa por um vale: a caixa desce abaixo de 75% do dinheiro inicial em todas as sementes',
  razoavel.every((c) => c.minimo < ECON.dinheiroInicial * 0.75));
meta('Razoável lança o 1.º produto entre o mês 2 e o 4 (mediana)',
  ((m) => m >= 2 && m <= 4)(mediana(razoavel.map((c) => c.primeiroLancamento ?? 99))));
meta('Razoável acaba os 2 anos entre 60k e 200k (mediana)',
  ((m) => m >= 60000 && m <= 200000)(mediana(finaisRazoavel)));
meta('Razoável lucra mais no ano 2 do que no ano 1 (mediana)',
  mediana(razoavel.map((c) => c.lucroAno2)) > mediana(razoavel.map((c) => c.lucroAno1)));
meta('Produto único: o razoável lança exatamente 1 produto e depois só faz updates',
  razoavel.every((c) => c.produtos === 1));
meta('Expansão rápida é arriscada: vai à falência em pelo menos 2 das 8 sementes',
  rapida.filter((c) => c.falenciaMes !== null).length >= 2);
meta('Expansão rápida entra em dívida (caixa < 0) em pelo menos metade das sementes',
  rapida.filter((c) => c.minimo < 0).length >= SEMENTES.length / 2);

meta('Expansão rápida é uma aposta: vai à falência em pelo menos 3 das 8 sementes',
  rapida.filter((c) => c.falenciaMes !== null).length >= 3);

// ---------------------------------------------------------------------------
// Cenários das mecânicas: bugs e patches, sequelas, investigação, eras e horas extra
// ---------------------------------------------------------------------------

console.log('\nMecânicas:');

/** Um jogo com n pessoas contratadas (secretárias perto da entrada) e sem eventos. */
function jogoCom(semente: number, n: number): Estado {
  const s = novoJogo(semente, 24, 18, { missoes: false });
  s.dinheiro = 200000;
  for (let i = 0; i < n; i++) contratarMelhor(s);
  return s;
}

/** Avança dia a dia até a condição se cumprir (ou até ao limite de dias). Devolve os dias que passaram. */
function avancarAte(s: Estado, condicao: () => boolean, limite = 720): number {
  let dias = 0;
  while (!condicao() && dias < limite && !s.falencia) {
    avancar(s, MIN_POR_DIA);
    dias++;
  }
  return dias;
}

const ids = (s: Estado) => s.funcionarios.map((f) => f.id);

{
  // Bugs: aparecem no lançamento, crescem com o tempo, cortam as vendas e um patch tira-os.
  const s = jogoCom(11, 2);
  iniciarProjeto(s, 'Bugado', 'utilitario', [], ids(s));
  avancarAte(s, () => s.produtos.length > 0);
  const p = s.produtos[0];
  const noLancamento = p.bugs ?? 0;
  meta('Bugs: um produto sai com bugs', noLancamento > 0 && (p.ritmoBugs ?? 0) > 0);
  avancarAte(s, () => false, 90);
  meta('Bugs: os utilizadores encontram mais bugs com o tempo', (p.bugs ?? 0) > noLancamento);
  p.bugs = 40;
  p.avisoBugs = false;
  p.vendasMes = Math.max(p.vendasMes, 3000);
  meta('Bugs: os bugs cortam as vendas', vendasComBugs(p) < p.vendasMes && fatorBugs(40) < fatorBugs(10));
  const antes = s.mensagens.length;
  avancarAte(s, () => s.mensagens.slice(antes).some((m) => m.texto.startsWith('🐞')), 31);
  meta('Bugs: há um aviso quando um produto tem bugs a mais', s.mensagens.slice(antes).some((m) => m.texto.startsWith('🐞')));
  const r = iniciarManutencao(s, 0, ids(s));
  meta('Bugs: um patch começa e não há dois para o mesmo produto', r.ok && !iniciarManutencao(s, 0, []).ok);
  const comBugs = p.bugs ?? 0;
  const dias = avancarAte(s, () => !manutencaoDe(s, 0));
  meta(`Bugs: o patch acaba (${dias} dias) e tira os bugs (${comBugs.toFixed(0)} → ${p.bugs})`,
    !manutencaoDe(s, 0) && (p.bugs ?? 0) < comBugs / 4 && semProjeto(s).length === 2);
}

{
  // Plataforma: um só produto, com utilizadores, planos, servidores e updates.
  const s = jogoCom(12, 2);
  iniciarProjeto(s, 'Calculadora', 'utilitario', [], ids(s));
  meta('Plataforma: não se pode começar um segundo produto enquanto se faz o primeiro', !iniciarProjeto(s, 'Outro', 'utilitario', [], []).ok);
  avancarAte(s, () => s.produtos.length > 0);
  const p = s.produtos[0];
  meta(`Plataforma: lança com utilizadores (${Math.round(p.utilizadores ?? 0)}) e não há segundo produto`,
    (p.utilizadores ?? 0) > 0 && !iniciarProjeto(s, 'Outro', 'utilitario', [], ids(s)).ok);
  const u0 = p.utilizadores ?? 0;
  avancarAte(s, () => false, 14);
  meta(`Plataforma: os utilizadores crescem (${Math.round(u0)} → ${Math.round(p.utilizadores ?? 0)})`, (p.utilizadores ?? 0) > u0);
  p.utilizadores = capacidadeServidor(s, 0) * 2;
  const sat = p.satisfacao ?? 0;
  avancarAte(s, () => false, 3);
  meta('Plataforma: servidores sobrecarregados fazem fugir utilizadores e descer a satisfação',
    (p.utilizadores ?? 0) < capacidadeServidor(s, 0) * 2 && (p.satisfacao ?? 0) < sat && s.mensagens.some((m) => m.texto.startsWith('🔥')));
  s.dinheiro = 100000;
  meta('Plataforma: upgrade de servidor', mudarServidor(s, 0, 2).ok && p.servidor === 2 && cargaServidor(s, p) < 1);
  const gratis = { ...p, plano: { gratis: true, preco: 6, anuncios: false } };
  meta('Plataforma: com plano grátis o potencial é maior, mas paga menos gente',
    potencialUtilizadores(s, gratis) > potencialUtilizadores(s, p) && pagantesDe(gratis) < pagantesDe(p));
  meta('Plataforma: planos inválidos são recusados', !definirPlano(s, 0, { gratis: false, preco: 0, anuncios: false }).ok
    && definirPlano(s, 0, { gratis: true, preco: 9, anuncios: true }).ok);
  const nf = p.funcionalidades.length;
  const novas = funcionalidadesParaUpdate(s, 0).filter((f) => validarFuncionalidades('utilitario', [...p.funcionalidades, f]).ok).slice(0, 1);
  meta('Plataforma: um update começa e não há dois ao mesmo tempo', iniciarUpdate(s, 0, novas, ids(s)).ok && !iniciarUpdate(s, 0, [], []).ok);
  avancarAte(s, () => !updateDe(s, 0));
  meta(`Plataforma: o update acaba e junta a funcionalidade (versão 1.${p.updates})`,
    p.funcionalidades.length === nf + novas.length && p.updates === 1 && semProjeto(s).length === 2);
  const r2 = importarJogo(exportarJogo(s));
  meta('Plataforma: utilizadores, plano e servidor sobrevivem a guardar e carregar',
    r2.ok && r2.estado.produtos[0].servidor === 2 && r2.estado.produtos[0].plano?.anuncios === true);
}

{
  // Investigação: desbloqueia funcionalidades; os pontos vêm de quem está sem projeto ou do dinheiro.
  const s = jogoCom(13, 2);
  meta('Investigação: «Relatórios e gráficos» está bloqueada sem a tecnologia',
    !funcionalidadeDisponivel(s, 'utilitario', 'relatorios') && !iniciarProjeto(s, '', 'utilitario', ['grafica', 'relatorios'], []).ok);
  meta('Investigação: «Análise de dados» precisa primeiro de «Internet»', !escolherPesquisa(s, 'dados').ok && escolherPesquisa(s, 'internet').ok);
  const dias = avancarAte(s, () => temTecnologia(s, 'internet'), 240);
  meta(`Investigação: 2 pessoas sem projeto investigam a Internet em ${dias} dias`, temTecnologia(s, 'internet') && dias > 1 && dias < 60);
  escolherPesquisa(s, 'dados');
  const dinheiro = s.dinheiro;
  let pacotes = 0;
  while (!temTecnologia(s, 'dados') && financiarPesquisa(s).ok) pacotes++;
  meta(`Investigação: comprar pontos também investiga (${pacotes} pacotes)`,
    temTecnologia(s, 'dados') && s.dinheiro === dinheiro - pacotes * PESQUISA.custoPacote && pacotes <= Math.ceil(TECNOLOGIAS.dados.custo / PESQUISA.pontosPacote));
  meta('Investigação: a tecnologia desbloqueia a funcionalidade',
    funcionalidadeDisponivel(s, 'utilitario', 'relatorios') && iniciarProjeto(s, '', 'utilitario', ['grafica', 'relatorios'], ids(s)).ok);
}

{
  // Eras: a procura muda com os anos.
  const desktop = eraNoMes(0), web = eraNoMes(24), mobile = eraNoMes(50), ia = eraNoMes(130);
  meta('Eras: Desktop → Web (ano 3) → Mobile → … → IA', desktop.id === 'desktop' && eraNoMes(23).id === 'desktop'
    && web.id === 'web' && mobile.id === 'mobile' && ia.id === 'ia');
  meta('Eras: a Era Desktop é neutra', LISTA_TIPOS.every((t) => fatorEraNa(desktop, t, TIPOS[t].funcionalidades.map((f) => f.id).slice(0, 2)) === 1));
  meta('Eras: na Era Web os antivírus vendem mais e a linha de comandos vale menos',
    fatorEraNa(web, 'antivirus', []) > 1 && fatorEraNa(web, 'utilitario', ['comandos']) < fatorEraNa(web, 'utilitario', []));
  meta('Eras: na Era Mobile as funcionalidades mobile valem mais',
    fatorEraNa(mobile, 'jogo', ['jogomovel']) > fatorEraNa(mobile, 'jogo', []));
  const s = jogoCom(14, 0);
  s.produtos.push({ nome: 'Escudo', tipo: 'antivirus', funcionalidades: [], qualidade: 0.8, vendasMes: 4000, receitaTotal: 0, lancadoEm: 0 });
  s.minuto = 24 * MIN_POR_MES - 1;
  const antes = fatorEra(s, 'antivirus', []);
  avancar(s, 1);
  meta(`Eras: no ano 3 começa a Era Web (notícia) e o antivírus à venda ganha procura (${s.produtos[0].vendasMes.toFixed(0)} €)`,
    antes === 1 && fatorEra(s, 'antivirus', []) > 1 && s.mensagens.some((m) => m.texto.includes('Era Web'))
    && s.produtos[0].vendasMes > 4000 * TIPOS.antivirus.queda);
}

{
  // Horas extra: mais depressa, mas mais bugs, menos felicidade e baixas.
  const corrida = (crunch: boolean, semente = 15) => {
    const s = jogoCom(semente, 3);
    iniciarProjeto(s, 'Grande', 'utilitario', ['grafica', 'agendamento', 'comandos'], ids(s));
    if (crunch) alternarCrunch(s, s.projetos[0].id);
    let baixas = 0, veioDeBaixa = false;
    const dias = avancarAte(s, () => {
      for (const f of s.funcionarios) if (deBaixa(s, f)) {
        baixas++;
        // Quem está de baixa não vem trabalhar (meio do dia: não está no escritório).
        const copia = JSON.parse(exportarJogo(s)).estado as Estado;
        avancar(copia, 6 * 60);
        if (copia.funcionarios.find((o) => o.id === f.id)!.dentro) veioDeBaixa = true;
      }
      return s.produtos.length > 0;
    });
    const fel = s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length;
    const p = s.produtos[0];
    return { dias, bugs: (p?.bugs ?? 0) + (p?.ritmoBugs ?? 0) * 5, fel, baixas, veioDeBaixa, s };
  };
  const normal = corrida(false);
  const crunch = corrida(true);
  meta(`Horas extra: o projeto acaba mais depressa (${crunch.dias} vs ${normal.dias} dias)`, crunch.dias < normal.dias * 0.9);
  meta(`Horas extra: o produto sai com mais bugs (${crunch.bugs.toFixed(0)} vs ${normal.bugs.toFixed(0)})`, crunch.bugs > normal.bugs * 1.3);
  meta(`Horas extra: a equipa fica menos feliz (${crunch.fel.toFixed(0)} vs ${normal.fel.toFixed(0)})`, crunch.fel < normal.fel - 10);
  meta('Horas extra: há baixas, e quem está de baixa não vem trabalhar',
    ((outras) => outras.some((c) => c.baixas > 0) && outras.every((c) => !c.veioDeBaixa && (c.baixas === 0 || c.s.mensagens.some((m) => m.texto.startsWith('🤒')))))(
      [crunch, ...[16, 17, 18, 19, 20].map((sm) => corrida(true, sm))])
    && normal.baixas === 0 && !crunch.veioDeBaixa);
}

{
  // Saves: os campos novos guardam-se, e um save da versão 4 carrega com os valores por omissão.
  const s = jogoCom(16, 1);
  s.tecnologias.push('internet');
  s.pesquisaAtual = 'mobile';
  s.pesquisaProgresso = 100;
  s.produtos.push({ nome: 'X', tipo: 'utilitario', funcionalidades: [], qualidade: 0.5, vendasMes: 100, receitaTotal: 0, lancadoEm: 0, bugs: 3, ritmoBugs: 1 });
  iniciarManutencao(s, 0, []);
  alternarCrunch(s, s.projetos[0].id);
  s.funcionarios[0].baixaAte = s.minuto + 1000;
  const r = importarJogo(exportarJogo(s));
  meta('Saves: investigação, bugs, patches, horas extra e baixas sobrevivem a guardar e carregar',
    VERSAO_SAVE === 6 && r.ok && r.estado.tecnologias.join() === 'internet' && r.estado.pesquisaAtual === 'mobile'
    && r.estado.projetos[0].manutencao === 0 && r.estado.projetos[0].crunch === true && r.estado.funcionarios[0].baixaAte !== undefined);
  const v4 = JSON.parse(exportarJogo(jogoCom(17, 1)));
  v4.versao = 4;
  for (const k of ['tecnologias', 'pesquisaAtual', 'pesquisaProgresso', 'pesquisaReserva']) delete v4.estado[k];
  const r4 = importarJogo(JSON.stringify(v4));
  meta('Saves: um save da versão 4 carrega, sem tecnologias', r4.ok && r4.estado.tecnologias.length === 0 && r4.estado.pesquisaAtual === null);
  const mau = JSON.parse(exportarJogo(s));
  mau.estado.tecnologias = ['teletransporte'];
  meta('Saves: tecnologia desconhecida é recusada', !importarJogo(JSON.stringify(mau)).ok);
}

{
  // Personalidades: os candidatos têm traços válidos e os colegas de equipa ficam amigos (ou em conflito).
  const s = jogoCom(21, 3);
  const comTracos = s.candidatos.concat(s.funcionarios).filter((c) => (c.tracos?.length ?? 0) > 0);
  meta('Personalidades: há candidatos com traços, todos conhecidos',
    comTracos.length > 0 && comTracos.every((c) => c.tracos!.every((t) => t in TRACOS)));
  for (const f of s.funcionarios) { f.tracos = ['sociavel']; f.felicidade = 80; }
  iniciarProjeto(s, 'Teste', 'utilitario', [], s.funcionarios.map((f) => f.id));
  avancarAte(s, () => relacaoEntre(s, s.funcionarios[0].id, s.funcionarios[1].id) >= AMIZADE, 200);
  meta('Personalidades: colegas sociáveis na mesma equipa tornam-se amigos',
    relacaoEntre(s, s.funcionarios[0].id, s.funcionarios[1].id) >= AMIZADE && s.mensagens.some((m) => m.texto.startsWith('🤝')));
}

{
  // Formação: o funcionário fica fora uns dias e volta melhor.
  const s = jogoCom(22, 1);
  const f = s.funcionarios[0];
  const antes = f.competencias.testes;
  const ok = iniciarFormacao(s, f.id, 'testes').ok;
  avancar(s, MIN_POR_DIA * 2);
  const fora = ausente(s, f);
  avancar(s, MIN_POR_DIA * (FORMACAO.dias + 1));
  meta(`Formação: fica fora e volta melhor em testes (${Math.round(antes * 100)} → ${Math.round(f.competencias.testes * 100)})`,
    ok && fora && !ausente(s, f) && f.competencias.testes > antes && f.formacao === undefined);
}

{
  // Escritórios: começa pequeno, não se constrói fora, a mudança alarga e encarece a renda.
  const s = novoJogo(23, 24, 18, { missoes: false, escritorio: 0 });
  s.dinheiro = 200000;
  const l = limitesDoEscritorio(s);
  const fora = colocarSecretaria(s, l.x1 + 1, l.z0);
  const renda0 = rendaDe(s);
  const mudou = mudarEscritorio(s, 2).ok;
  meta(`Escritórios: a ${ESCRITORIOS[0].nome} tem a entrada lá dentro e não se constrói fora; mudar alarga e custa mais renda`,
    dentroDoEscritorio(s, s.entrada.x, s.entrada.z) && !fora.ok && mudou && colocarSecretaria(s, l.x1 + 1, l.z0).ok
    && rendaDe(s) > renda0 && !mudarEscritorio(s, 1).ok);
}

{
  // Património: comprar, arrendar, morar, alugar, vender casas e carros.
  const s = novoJogo(26, 24, 18, { missoes: false });
  s.dinheiro = 2_000_000;
  const preco = valorCasa(s, 3);
  const comprou = comprarCasa(s, 3).ok && s.dinheiro === 2_000_000 - preco && s.morada === 3;
  const naoArrendaMorada = !arrendarCasa(s, 3, true).ok;
  const aluga = alugarCasa(s, 7).ok && s.morada === 7 && s.casaAlugada === 7;
  const arrenda = arrendarCasa(s, 3, true).ok && rendasRecebidas(s) === rendaCasa(s, 3);
  const custos = custosPatrimonio(s) >= rendaCasa(s, 7);
  const carro = comprarCarro(s, 'desportivo').ok && prestigio(s) > 0;
  const antesValor = valorCasa(s, 3);
  avancar(s, MIN_POR_DIA * DIAS_POR_MES * 12);
  const valoriza = valorCasa(s, 3) > antesValor && valorCarro(s, s.carros![0]) < CARROS.desportivo.preco * PATRIMONIO.carroNovo;
  const volta = importarJogo(exportarJogo(s));
  const guardado = volta.ok && volta.estado.imoveis?.[0].arrendada === true && volta.estado.casaAlugada === 7 && volta.estado.carros?.length === 1;
  const dinheiroAntes = s.dinheiro;
  const vende = venderCasa(s, 3).ok && s.dinheiro > dinheiroAntes && !s.imoveis!.length;
  meta('Património: compra, arrenda, aluga, valoriza, guarda e vende casas e carros',
    comprou && naoArrendaMorada && aluga && arrenda && custos && carro && valoriza && guardado && vende);
  const lugares = novoJogo(27, 24, 18, { missoes: false });
  lugares.dinheiro = 1e7;
  for (let i = 0; i < PATRIMONIO.lugares; i++) comprarCarro(lugares, 'citadino');
  meta(`Património: o estacionamento leva ${PATRIMONIO.lugares} carros`, !comprarCarro(lugares, 'citadino').ok);
}

{
  // O teu personagem: trabalha sem salário, não se despede e fica guardado.
  const s = novoJogo(28, 24, 18, { missoes: false, fundador: { nome: 'Ana', aparencia: { ...APARENCIA_INICIAL, sexo: 'f', cabelo: 0xd9b26a } } });
  const eu = fundadorDe(s)!;
  colocarSecretaria(s, 3, 4);
  iniciarProjeto(s, 'Sozinho', 'utilitario', [], [eu.id]);
  avancar(s, MIN_POR_DIA * 3);
  const trabalhou = s.projetos[0].trabalhoFeito > 0;
  const volta = importarJogo(exportarJogo(s));
  meta('Personagem: o fundador trabalha sozinho, sem salário, não se despede e o aspeto fica guardado',
    eu.salario === 0 && eu.secretariaId !== null && trabalhou && !despedir(s, eu.id).ok
    && volta.ok && volta.estado.funcionarios[0].aparencia?.cabelo === 0xd9b26a
    && criarFundador(s, 'Ana Silva', { ...eu.aparencia!, roupa: 0xc0161d }).ok && fundadorDe(s)!.nome === 'Ana Silva'
    && s.funcionarios.filter((f) => f.dono).length === 1);
}

{
  // Mobília: limite de secretárias por escritório, mover e rodar.
  const s = novoJogo(25, 24, 18, { missoes: false, escritorio: 0 });
  s.dinheiro = 200000;
  const l = limitesDoEscritorio(s);
  const celulas: [number, number][] = [];
  for (let z = l.z0; z < l.z1; z++)
    for (let x = l.x0; x < l.x1; x++) if (x !== s.entrada.x || z !== s.entrada.z) celulas.push([x, z]);
  let postas = 0;
  for (const [x, z] of celulas.slice(0, 6)) if (colocarSecretaria(s, x, z).ok) postas++;
  const limite = postas === ESCRITORIOS[0].secretarias;
  const [ax, az] = celulas[0];
  const [bx, bz] = celulas[10];
  const d = s.secretarias[0];
  const moveu = moverMovel(s, ax, az, bx, bz, 3).ok && d.x === bx && d.z === bz && d.rot === 3;
  const ocupada = !moverMovel(s, bx, bz, celulas[1][0], celulas[1][1]).ok;
  const rodou = rodarMovel(s, bx, bz).ok && d.rot === undefined && rodarMovel(s, bx, bz).ok && d.rot === 1;
  const volta = importarJogo(exportarJogo(s));
  meta(`Mobília: a ${ESCRITORIOS[0].nome} leva ${ESCRITORIOS[0].secretarias} secretárias; mover e rodar são grátis e ficam guardados`,
    limite && moveu && ocupada && rodou && volta.ok && volta.estado!.secretarias[0].rot === 1);
}

{
  // Aquisições e bolsa.
  const s = jogoCom(24, 1);
  s.xp = 1e7;
  s.dinheiro = 5e7;
  const r = s.rivais[0];
  const antes = avaliarEmpresa(s).ativos;
  const comprou = comprarRival(s, r.id).ok;
  const dinheiro = s.dinheiro;
  avancarAte(s, () => s.historico.length >= 1, 40);
  meta(`Aquisições: comprar um concorrente (${Math.round(precoAquisicao(r) / 1000)}k) tira-o do ranking e dá lucro mensal`,
    comprou && !s.rivais.some((o) => o.id === r.id) && s.subsidiarias!.length === 1 && avaliarEmpresa(s).ativos > antes
    && s.historico[s.historico.length - 1].receitas > 0 && dinheiro > 0);
  const podia = podeEntrarEmBolsa(s).ok;
  const p0 = s.participacao, d0 = s.dinheiro;
  const entrou = entrarEmBolsa(s).ok;
  avancarAte(s, () => (s.bolsa?.historico.length ?? 0) >= 2, 40);
  meta('Bolsa: a entrada em bolsa dá dinheiro, vende uma parte e o preço das ações é atualizado todos os meses',
    podia && entrou && s.participacao > p0 && s.dinheiro > d0 - 100000 && s.bolsa!.historico.length >= 2 && !entrarEmBolsa(s).ok);
  const r2 = importarJogo(exportarJogo(s));
  meta('Saves: subsidiárias e bolsa sobrevivem a guardar e carregar',
    r2.ok && r2.estado.subsidiarias?.length === 1 && r2.estado.bolsa?.historico.length === s.bolsa!.historico.length);
}

{
  // Feiras: só no mês certo, uma vez por ano, e dão expectativa aos projetos em curso.
  const s = jogoCom(25, 1);
  const f = FEIRAS[0];
  const cedo = irAFeira(s, f.id).ok;
  avancarAte(s, () => feirasDisponiveis(s).includes(f), 400);
  iniciarProjeto(s, 'Feira', 'utilitario', [], [s.funcionarios[0].id]);
  const p = s.projetos[s.projetos.length - 1];
  const h = p.hype ?? 0;
  const foi = irAFeira(s, f.id).ok;
  meta(`Feiras: a ${f.nome} só se visita no seu mês, uma vez por ano, e dá expectativa`,
    !cedo && foi && (p.hype ?? 0) > h && !irAFeira(s, f.id).ok && s.mensagens.some((m) => m.texto.includes(f.nome)));
}

{
  // Modos de jogo
  const sb = novoJogo(31, 24, 18, { modo: 'sandbox', eventos: false });
  sb.dinheiro = -500_000;
  avancarAte(sb, () => false, 35);
  meta('Sandbox: começa com dinheiro infinito e nunca vai à falência',
    !sb.falencia && sb.dinheiro >= SANDBOX_DINHEIRO / 2);

  const sf = novoJogo(32, 24, 18, { semFalencia: true, dinheiroInicial: 2000, eventos: false });
  const din0 = sf.dinheiro;
  sf.dinheiro = -200_000;
  avancarAte(sf, () => false, 35);
  meta('Personalizada: dinheiro inicial à escolha e "sem falência" aguenta dívidas', din0 === 2000 && !sf.falencia);

  const d = novoJogo(33, 24, 18, { modo: 'desafio', desafio: 'milhao', eventos: false });
  d.dinheiro = 2_000_000;
  avancarAte(d, () => d.desafio?.resultado !== 'curso', 40);
  const perde = novoJogo(34, 24, 18, { modo: 'desafio', desafio: 'jogos', eventos: false, semFalencia: true });
  avancarAte(perde, () => perde.desafio?.resultado !== 'curso', DESAFIOS.jogos.anos * 12 * 30 + 40);
  const volta = importarJogo(exportarJogo(d));
  meta('Desafios: ganha-se ao cumprir o objetivo, perde-se quando o prazo acaba, e o save guarda o modo',
    d.desafio?.resultado === 'ganho' && perde.desafio?.resultado === 'perdido'
    && volta.ok && volta.estado?.desafio?.resultado === 'ganho');
}

if (falhas) throw new Error(`${falhas} meta(s) de equilíbrio falharam.`);
console.log('\nTodas as metas cumpridas.');
