// Cenários de equilíbrio da economia nos 2 primeiros anos.
// Corre com `npm run simtest` (também faz parte de `npm run sim`).
// Cada cenário é um "jogador" automático, corrido com várias sementes.
// Termina com erro se alguma meta de equilíbrio falhar.
import {
  avancar, colocarSecretaria, contratar, ECON, fatorMercado, iniciarProjeto, LISTA_TIPOS, MIN_POR_DIA,
  MIN_POR_MES, novoJogo, textoData, tipoDisponivel, TIPOS, validarFuncionalidades, vendasIniciais,
  AREAS, competenciaMedia, definirEquipa, estimarProjeto, membrosDe, semProjeto, type Funcionario, type Area, type Competencias, type Estado, type TipoSoftware,
} from './sim.ts';

const MESES = 24;
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
function combinacoes(tipo: TipoSoftware): string[][] {
  const ids = TIPOS[tipo].funcionalidades.map((f) => f.id);
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
    for (const escolha of combinacoes(tipo)) {
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

/**
 * Ninguém fica parado: quem está livre forma uma equipa nova (até TAMANHO_EQUIPA pessoas) com o
 * melhor projeto para essa equipa; uma pessoa sozinha, havendo projetos, junta-se à equipa mais pequena.
 */
function gerirEquipas(s: Estado, tipos: TipoSoftware[] = LISTA_TIPOS): void {
  for (let livres = semProjeto(s); livres.length > 0; livres = semProjeto(s)) {
    const menor = s.projetos
      .map((p) => ({ p, n: membrosDe(s, p.id).length }))
      .sort((a, b) => a.n - b.n)[0];
    if (livres.length === 1 && menor && menor.n < TAMANHO_EQUIPA) {
      definirEquipa(s, livres[0].id, menor.p.id);
      continue;
    }
    const equipa = livres.slice(0, TAMANHO_EQUIPA);
    const e = escolherProjeto(s, tipos, equipa);
    iniciarProjeto(s, '', e.tipo, e.funcionalidades, equipa.map((f) => f.id));
  }
}

// ---------------------------------------------------------------------------
// Jogadores
// ---------------------------------------------------------------------------

/**
 * Contrata 2, põe toda a gente a trabalhar (equipas de até 3) e só cresce com 2+ produtos lançados
 * e uma reserva de 6 meses de despesas (já a contar com o novo salário). Máximo 6 pessoas.
 */
function prudente(tipos: TipoSoftware[]): Jogador {
  return (s, dia) => {
    if (dia === 0) {
      contratarMelhor(s);
      contratarMelhor(s);
    }
    gerirEquipas(s, tipos);
    const c = s.candidatos[melhorCandidato(s)];
    if (c && s.produtos.length >= 2 && s.funcionarios.length < 6
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
    if (dia === 0 || dia === 30) for (let i = 0; i < 3; i++) contratarMelhor(s);
    gerirEquipas(s);
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
  const s = novoJogo(semente);
  let minimo = s.dinheiro;
  const caixaMensal: number[] = [];
  const diario = DIARIO === `${nome}:${semente}`;
  let vistas = 0;
  for (let dia = 0; dia < MESES * 30 && !s.falencia; dia++) {
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
console.log(`Equilíbrio: ${MESES} meses × ${SEMENTES.length} sementes (valores em milhares de €)\n`);
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
meta('Diversificar compensa: o razoável acaba acima do "só utilitários" (mediana)',
  mediana(finaisRazoavel) > mediana(resultados['só utilitários'].map((c) => c.final)));
meta('O razoável lança pelo menos 3 tipos de software diferentes (mediana)',
  mediana(razoavel.map((c) => LISTA_TIPOS.filter((t) => c.porTipo[t] > 0).length)) >= 3);
meta('Expansão rápida é arriscada: vai à falência em pelo menos 2 das 8 sementes',
  rapida.filter((c) => c.falenciaMes !== null).length >= 2);
meta('Expansão rápida entra em dívida (caixa < 0) em pelo menos metade das sementes',
  rapida.filter((c) => c.minimo < 0).length >= SEMENTES.length / 2);

meta('Expansão rápida não compensa: acaba com menos de metade do razoável (mediana, falências incluídas)',
  mediana(rapida.map((c) => c.final)) < mediana(finaisRazoavel) / 2);

if (falhas) throw new Error(`${falhas} meta(s) de equilíbrio falharam.`);
console.log('\nTodas as metas cumpridas.');
