// Cenários de equilíbrio da economia nos 2 primeiros anos.
// Corre com `npm run simtest` (também faz parte de `npm run sim`).
// Cada cenário é um "jogador" automático, corrido com várias sementes.
// Termina com erro se alguma meta de equilíbrio falhar.
import {
  avancar, colocarSecretaria, contratar, ECON, iniciarProjeto, MIN_POR_DIA, MIN_POR_MES,
  novoJogo, type Estado,
} from './sim.ts';

const MESES = 24;
const SEMENTES = [1, 2, 3, 4, 5, 6, 7, 8];

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

/** Candidato com melhor relação competência/salário (-1 se não houver). */
function melhorCandidato(s: Estado): number {
  let melhor = -1;
  let valor = -Infinity;
  s.candidatos.forEach((c, i) => {
    if (c.competencia / c.salario > valor) {
      valor = c.competencia / c.salario;
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

// ---------------------------------------------------------------------------
// Jogadores
// ---------------------------------------------------------------------------

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

  /**
   * Contrata 2, tem sempre um projeto em curso e só cresce com 2+ produtos lançados
   * e uma reserva de 6 meses de despesas (já a contar com o novo salário). Máximo 6 pessoas.
   */
  razoável: (s, dia) => {
    if (dia === 0) {
      contratarMelhor(s);
      contratarMelhor(s);
    }
    if (!s.projeto) iniciarProjeto(s, '');
    const c = s.candidatos[melhorCandidato(s)];
    if (c && s.produtos.length >= 2 && s.funcionarios.length < 6
      && s.dinheiro > 6 * (despesasMensais(s) + c.salario))
      contratarMelhor(s);
  },

  /** Contrata 6 pessoas no 1.º mês e tem sempre um projeto em curso. */
  'expansão rápida': (s, dia) => {
    if (dia === 0 || dia === 30) for (let i = 0; i < 3; i++) contratarMelhor(s);
    if (!s.projeto) iniciarProjeto(s, '');
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
  equipa: number;
  caixaMensal: number[]; // dinheiro no fim de cada mês
}

function correr(jogador: Jogador, semente: number): Corrida {
  const s = novoJogo(semente);
  let minimo = s.dinheiro;
  const caixaMensal: number[] = [];
  for (let dia = 0; dia < MESES * 30 && !s.falencia; dia++) {
    jogador(s, dia);
    minimo = Math.min(minimo, s.dinheiro);
    const mes = Math.floor(s.minuto / MIN_POR_MES);
    avancar(s, MIN_POR_DIA);
    minimo = Math.min(minimo, s.dinheiro);
    if (Math.floor(s.minuto / MIN_POR_MES) > mes) caixaMensal.push(s.dinheiro);
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
  const r = SEMENTES.map((sem) => correr(jogador, sem));
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
meta('Expansão rápida não compensa: acaba com menos de metade do razoável (mediana, falências incluídas)',
  mediana(rapida.map((c) => c.final)) < mediana(finaisRazoavel) / 2);
meta('Expansão rápida entra em dívida (caixa < 0) em pelo menos metade das sementes',
  rapida.filter((c) => c.minimo < 0).length >= SEMENTES.length / 2);

if (falhas) throw new Error(`${falhas} meta(s) de equilíbrio falharam.`);
console.log('\nTodas as metas cumpridas.');
