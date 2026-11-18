// Lógica pura do jogo. NÃO importar Three.js nem nada do DOM aqui:
// este ficheiro tem de correr em Node (npm run sim).

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

export const MIN_POR_DIA = 24 * 60;
export const DIAS_POR_MES = 30;
export const MIN_POR_MES = MIN_POR_DIA * DIAS_POR_MES;

export const HORA_CHEGADA = 8; // começam a chegar
export const HORA_INICIO = 9; // trabalho conta a partir daqui
export const HORA_FIM = 17; // vão para casa

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// ---------------------------------------------------------------------------
// Economia (valores provisórios; o equilíbrio fica para o objetivo 2)
// ---------------------------------------------------------------------------

export const ECON = {
  dinheiroInicial: 30000,
  rendaMensal: 1000,
  custoSecretaria: 500,
  custoParede: 100, // por segmento de uma célula
  custoPorta: 300,
  limiteFalencia: -10000,
  trabalhoProjeto: 12000, // pontos de trabalho de um utilitário
  vendasBase: 6000, // € no 1.º mês para qualidade 1
  quedaVendas: 0.8, // vendas do mês seguinte = vendas * quedaVendas
};

export const VELOCIDADE_ANDAR = 0.2; // células por minuto de jogo

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type EstadoFuncionario =
  | 'emCasa'
  | 'aCaminho'
  | 'aTrabalhar'
  | 'aSair'
  | 'semSecretaria'
  | 'semAcesso' // não há caminho até à secretária
  | 'preso'; // não há caminho até à saída

export const NOME_ESTADO: Record<EstadoFuncionario, string> = {
  emCasa: 'Em casa',
  aCaminho: 'A caminho',
  aTrabalhar: 'A trabalhar',
  aSair: 'A sair',
  semSecretaria: 'Sem secretária',
  semAcesso: 'Sem acesso à secretária',
  preso: 'Preso — sem caminho para a saída',
};

/** Conteúdo de uma aresta da grelha (a linha entre duas células). */
export const NADA = 0;
export const PAREDE = 1;
export const PORTA = 2;

/**
 * Aresta da grelha. As arestas vivem nas linhas entre células:
 * - 'v': linha vertical x (entre as células x-1 e x), na linha de células z. x vai de 0 a largura.
 * - 'h': linha horizontal z (entre as células z-1 e z), na coluna de células x. z vai de 0 a altura.
 */
export interface Aresta {
  tipo: 'v' | 'h';
  x: number;
  z: number;
}

export interface Celula {
  x: number;
  z: number;
}

export interface Funcionario {
  id: number;
  nome: string;
  competencia: number; // 0..1
  salario: number; // € por mês
  felicidade: number; // 0..100
  secretariaId: number | null;
  estado: EstadoFuncionario;
  dentro: boolean; // está no escritório (visível)
  x: number; // posição contínua; o centro da célula (i, j) é (i, j)
  z: number;
  caminho: Celula[]; // próximas células a percorrer
  versaoCaminho: number; // versaoMapa para a qual o caminho foi calculado
  horaChegada: number; // minuto do dia em que sai de casa
}

export interface Candidato {
  nome: string;
  competencia: number;
  salario: number;
}

export interface Secretaria {
  id: number;
  x: number;
  z: number;
}

export interface Projeto {
  nome: string;
  trabalhoFeito: number;
  trabalhoTotal: number;
  somaCompetencia: number; // para calcular a qualidade
}

export interface Produto {
  nome: string;
  qualidade: number; // 0..1
  vendasMes: number; // € previstos para o próximo fecho de mês
  receitaTotal: number;
  lancadoEm: number; // minuto de jogo
}

export interface Mensagem {
  minuto: number;
  texto: string;
}

export interface Estado {
  largura: number;
  altura: number;
  entrada: Celula;
  minuto: number; // minutos desde o início do jogo
  dinheiro: number;
  funcionarios: Funcionario[];
  candidatos: Candidato[];
  secretarias: Secretaria[];
  paredesV: number[]; // (largura + 1) * altura — ver Aresta
  paredesH: number[]; // largura * (altura + 1)
  projeto: Projeto | null;
  produtos: Produto[];
  mensagens: Mensagem[];
  falencia: boolean;
  semente: number; // estado do gerador aleatório (determinístico)
  proximoId: number;
  versaoMapa: number; // muda sempre que algo construído muda
}

// ---------------------------------------------------------------------------
// Aleatório determinístico (mulberry32), para os testes serem reprodutíveis
// ---------------------------------------------------------------------------

export function aleatorio(s: Estado): number {
  s.semente = (s.semente + 0x6d2b79f5) | 0;
  let t = s.semente;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const NOMES = [
  'Ana', 'João', 'Maria', 'Pedro', 'Inês', 'Tiago', 'Beatriz', 'Rui', 'Sofia',
  'Miguel', 'Carla', 'Nuno', 'Rita', 'Hugo', 'Marta', 'Duarte', 'Leonor', 'Bruno',
];
const APELIDOS = [
  'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues',
  'Martins', 'Sousa', 'Fernandes', 'Gonçalves', 'Lopes', 'Marques', 'Almeida',
];

function escolher<T>(s: Estado, lista: T[]): T {
  return lista[Math.floor(aleatorio(s) * lista.length)];
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export function novoJogo(semente = 12345, largura = 24, altura = 18): Estado {
  const s: Estado = {
    largura,
    altura,
    entrada: { x: 0, z: Math.floor(altura / 2) },
    minuto: HORA_INICIO * 60 - 90,
    dinheiro: ECON.dinheiroInicial,
    funcionarios: [],
    candidatos: [],
    secretarias: [],
    paredesV: new Array((largura + 1) * altura).fill(NADA),
    paredesH: new Array(largura * (altura + 1)).fill(NADA),
    projeto: null,
    produtos: [],
    mensagens: [],
    falencia: false,
    semente,
    proximoId: 1,
    versaoMapa: 0,
  };
  gerarCandidatos(s);
  mensagem(s, 'Bem-vindo à Software Lda.! Coloca secretárias e contrata a tua equipa.');
  return s;
}

export function mensagem(s: Estado, texto: string): void {
  s.mensagens.push({ minuto: s.minuto, texto });
  if (s.mensagens.length > 60) s.mensagens.shift();
}

export function gerarCandidatos(s: Estado): void {
  s.candidatos = [];
  for (let i = 0; i < 3; i++) {
    const competencia = Math.round((0.25 + aleatorio(s) * 0.6) * 100) / 100;
    const salario = Math.round((1000 + competencia * 2500) / 50) * 50;
    s.candidatos.push({
      nome: `${escolher(s, NOMES)} ${escolher(s, APELIDOS)}`,
      competencia,
      salario,
    });
  }
}

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

export function minutoDoDia(s: Estado): number {
  return ((s.minuto % MIN_POR_DIA) + MIN_POR_DIA) % MIN_POR_DIA;
}

export function textoData(minuto: number): string {
  const dia = Math.floor(minuto / MIN_POR_DIA);
  const mes = Math.floor(dia / DIAS_POR_MES);
  const ano = Math.floor(mes / 12) + 1;
  const md = minuto % MIN_POR_DIA;
  const h = String(Math.floor(md / 60)).padStart(2, '0');
  const m = String(md % 60).padStart(2, '0');
  return `${(dia % DIAS_POR_MES) + 1} de ${MESES[mes % 12]}, ano ${ano} — ${h}:${m}`;
}

export function euros(v: number): string {
  const sinal = v < 0 ? '-' : '';
  const n = Math.round(Math.abs(v))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sinal}${n} €`;
}

// ---------------------------------------------------------------------------
// Construção
// ---------------------------------------------------------------------------

export interface Resultado {
  ok: boolean;
  msg?: string;
}

export function dentroDaGrelha(s: Estado, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < s.largura && z < s.altura;
}

export function secretariaEm(s: Estado, x: number, z: number): Secretaria | undefined {
  return s.secretarias.find((d) => d.x === x && d.z === z);
}

export function colocarSecretaria(s: Estado, x: number, z: number): Resultado {
  if (!dentroDaGrelha(s, x, z)) return { ok: false, msg: 'Fora do terreno.' };
  if (x === s.entrada.x && z === s.entrada.z)
    return { ok: false, msg: 'Não podes bloquear a entrada.' };
  if (secretariaEm(s, x, z)) return { ok: false, msg: 'Já há uma secretária aqui.' };
  if (s.dinheiro < ECON.custoSecretaria) return { ok: false, msg: 'Dinheiro insuficiente.' };
  s.dinheiro -= ECON.custoSecretaria;
  s.secretarias.push({ id: s.proximoId++, x, z });
  s.versaoMapa++;
  atribuirSecretarias(s);
  return { ok: true };
}

export function removerSecretaria(s: Estado, x: number, z: number): Resultado {
  const d = secretariaEm(s, x, z);
  if (!d) return { ok: false };
  s.secretarias = s.secretarias.filter((o) => o !== d);
  for (const f of s.funcionarios) {
    if (f.secretariaId === d.id) {
      f.secretariaId = null;
      if (f.dentro) planearSaida(s, f);
    }
  }
  s.versaoMapa++;
  atribuirSecretarias(s);
  return { ok: true };
}

function atribuirSecretarias(s: Estado): void {
  const ocupadas = new Set(s.funcionarios.map((f) => f.secretariaId));
  for (const f of s.funcionarios) {
    if (f.secretariaId !== null) continue;
    const livre = s.secretarias.find((d) => !ocupadas.has(d.id));
    if (!livre) {
      f.estado = f.dentro ? f.estado : 'semSecretaria';
      continue;
    }
    f.secretariaId = livre.id;
    ocupadas.add(livre.id);
    if (f.estado === 'semSecretaria') f.estado = 'emCasa';
  }
}

// ---------------------------------------------------------------------------
// Paredes e portas
// ---------------------------------------------------------------------------

export function arestaValida(s: Estado, a: Aresta): boolean {
  if (!Number.isInteger(a.x) || !Number.isInteger(a.z)) return false;
  return a.tipo === 'v'
    ? a.x >= 0 && a.x <= s.largura && a.z >= 0 && a.z < s.altura
    : a.x >= 0 && a.x < s.largura && a.z >= 0 && a.z <= s.altura;
}

export function lerAresta(s: Estado, a: Aresta): number {
  if (!arestaValida(s, a)) return NADA;
  return a.tipo === 'v' ? s.paredesV[a.z * (s.largura + 1) + a.x] : s.paredesH[a.z * s.largura + a.x];
}

function escreverAresta(s: Estado, a: Aresta, valor: number): void {
  if (a.tipo === 'v') s.paredesV[a.z * (s.largura + 1) + a.x] = valor;
  else s.paredesH[a.z * s.largura + a.x] = valor;
}

/** A aresta exterior da entrada (no limite do terreno) leva sempre uma porta. */
function eArestaDaEntrada(s: Estado, a: Aresta): boolean {
  const e = s.entrada;
  if (e.x === 0) return a.tipo === 'v' && a.x === 0 && a.z === e.z;
  if (e.x === s.largura - 1) return a.tipo === 'v' && a.x === s.largura && a.z === e.z;
  if (e.z === 0) return a.tipo === 'h' && a.z === 0 && a.x === e.x;
  return a.tipo === 'h' && a.z === s.altura && a.x === e.x;
}

/**
 * Arestas de um segmento reto entre dois vértices da grelha (cantos das células,
 * de (0,0) a (largura, altura)). Usa o eixo dominante, como ao arrastar o rato.
 */
export function segmento(x0: number, z0: number, x1: number, z1: number): Aresta[] {
  const r: Aresta[] = [];
  if (Math.abs(x1 - x0) >= Math.abs(z1 - z0)) {
    for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x++) r.push({ tipo: 'h', x, z: z0 });
  } else {
    for (let z = Math.min(z0, z1); z < Math.max(z0, z1); z++) r.push({ tipo: 'v', x: x0, z });
  }
  return r;
}

/**
 * Aresta mais próxima de um ponto em coordenadas da grelha
 * (onde a célula i ocupa [i, i+1]). Devolve também a distância à linha.
 */
export function arestaMaisProxima(gx: number, gz: number): { aresta: Aresta; distancia: number } {
  const dv = Math.abs(gx - Math.round(gx));
  const dh = Math.abs(gz - Math.round(gz));
  return dv < dh
    ? { aresta: { tipo: 'v', x: Math.round(gx), z: Math.floor(gz) }, distancia: dv }
    : { aresta: { tipo: 'h', x: Math.floor(gx), z: Math.round(gz) }, distancia: dh };
}

/** Coloca paredes nas arestas vazias do segmento. Só cobra as novas. */
export function colocarParedes(s: Estado, arestas: Aresta[]): Resultado {
  const novas = arestas.filter((a) => arestaValida(s, a) && lerAresta(s, a) === NADA);
  if (novas.length === 0) return { ok: false };
  const custo = novas.length * ECON.custoParede;
  if (s.dinheiro < custo) return { ok: false, msg: `Dinheiro insuficiente (custa ${euros(custo)}).` };
  s.dinheiro -= custo;
  for (const a of novas) escreverAresta(s, a, eArestaDaEntrada(s, a) ? PORTA : PAREDE);
  s.versaoMapa++;
  return { ok: true };
}

/** Transforma uma parede existente numa porta. */
export function colocarPorta(s: Estado, a: Aresta): Resultado {
  const atual = lerAresta(s, a);
  if (atual === PORTA) return { ok: false, msg: 'Já há uma porta aqui.' };
  if (atual !== PAREDE) return { ok: false, msg: 'As portas têm de ser colocadas numa parede.' };
  if (s.dinheiro < ECON.custoPorta) return { ok: false, msg: 'Dinheiro insuficiente.' };
  s.dinheiro -= ECON.custoPorta;
  escreverAresta(s, a, PORTA);
  s.versaoMapa++;
  return { ok: true };
}

/** Remove paredes e portas (sem reembolso). */
export function demolirArestas(s: Estado, arestas: Aresta[]): Resultado {
  let n = 0;
  for (const a of arestas)
    if (arestaValida(s, a) && lerAresta(s, a) !== NADA) {
      escreverAresta(s, a, NADA);
      n++;
    }
  if (n === 0) return { ok: false };
  s.versaoMapa++;
  return { ok: true };
}

/** Valor da aresta entre a célula (x, z) e a vizinha (x+dx, z+dz). */
export function arestaEntre(s: Estado, x: number, z: number, dx: number, dz: number): number {
  if (dx === 1) return s.paredesV[z * (s.largura + 1) + x + 1];
  if (dx === -1) return s.paredesV[z * (s.largura + 1) + x];
  if (dz === 1) return s.paredesH[(z + 1) * s.largura + x];
  return s.paredesH[z * s.largura + x];
}

const VIZINHOS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------

export interface Salas {
  /** Por célula (z * largura + x): número da sala, ou -1 se for espaço aberto. */
  sala: number[];
  total: number;
}

/**
 * Uma sala é uma zona de células separada do resto por paredes ou portas e que
 * não está aberta para o exterior (limite do terreno sem parede).
 */
export function detetarSalas(s: Estado): Salas {
  const W = s.largura;
  const H = s.altura;
  const zona = new Array<number>(W * H).fill(-1);
  const abertas: boolean[] = [];
  const pilha: number[] = [];
  for (let inicio = 0; inicio < W * H; inicio++) {
    if (zona[inicio] !== -1) continue;
    const id = abertas.length;
    let aberta = false;
    zona[inicio] = id;
    pilha.push(inicio);
    while (pilha.length) {
      const c = pilha.pop()!;
      const x = c % W;
      const z = (c - x) / W;
      for (const [dx, dz] of VIZINHOS) {
        const nx = x + dx;
        const nz = z + dz;
        const fechada = arestaEntre(s, x, z, dx, dz) !== NADA;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) {
          if (!fechada) aberta = true;
          continue;
        }
        const n = nz * W + nx;
        if (fechada || zona[n] !== -1) continue;
        zona[n] = id;
        pilha.push(n);
      }
    }
    abertas.push(aberta);
  }
  // Renumerar: só as zonas fechadas contam como salas.
  const numero = abertas.map(() => -1);
  let total = 0;
  abertas.forEach((a, i) => {
    if (!a) numero[i] = total++;
  });
  return { sala: zona.map((z) => numero[z]), total };
}

// ---------------------------------------------------------------------------
// Pessoal
// ---------------------------------------------------------------------------

export function contratar(s: Estado, indice: number): Resultado {
  const c = s.candidatos[indice];
  if (!c) return { ok: false };
  const f: Funcionario = {
    id: s.proximoId++,
    nome: c.nome,
    competencia: c.competencia,
    salario: c.salario,
    felicidade: 70,
    secretariaId: null,
    estado: 'emCasa',
    dentro: false,
    x: s.entrada.x,
    z: s.entrada.z,
    caminho: [],
    versaoCaminho: -1,
    horaChegada: HORA_CHEGADA * 60 + Math.floor(aleatorio(s) * 40),
  };
  s.funcionarios.push(f);
  s.candidatos.splice(indice, 1);
  atribuirSecretarias(s);
  mensagem(s, `Contrataste ${f.nome} (${euros(f.salario)}/mês).`);
  return { ok: true };
}

export function despedir(s: Estado, id: number): Resultado {
  const f = s.funcionarios.find((o) => o.id === id);
  if (!f) return { ok: false };
  s.funcionarios = s.funcionarios.filter((o) => o !== f);
  mensagem(s, `${f.nome} foi despedido(a).`);
  atribuirSecretarias(s);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Projetos e produtos
// ---------------------------------------------------------------------------

export function iniciarProjeto(s: Estado, nome: string): Resultado {
  if (s.projeto) return { ok: false, msg: 'Já há um projeto em curso.' };
  const limpo = nome.trim() || `Utilitário ${s.produtos.length + 1}`;
  s.projeto = { nome: limpo, trabalhoFeito: 0, trabalhoTotal: ECON.trabalhoProjeto, somaCompetencia: 0 };
  mensagem(s, `Começou o desenvolvimento de «${limpo}».`);
  return { ok: true };
}

function lancarProjeto(s: Estado): void {
  const p = s.projeto!;
  const qualidade = Math.min(1, (p.somaCompetencia / Math.max(1, p.trabalhoFeito)) * 1.2);
  const produto: Produto = {
    nome: p.nome,
    qualidade,
    vendasMes: ECON.vendasBase * qualidade,
    receitaTotal: 0,
    lancadoEm: s.minuto,
  };
  s.produtos.push(produto);
  s.projeto = null;
  mensagem(s, `«${produto.nome}» foi lançado! Qualidade ${Math.round(qualidade * 100)}%.`);
}

// ---------------------------------------------------------------------------
// Movimento
// ---------------------------------------------------------------------------

function celulaDe(f: Funcionario): Celula {
  return { x: Math.round(f.x), z: Math.round(f.z) };
}

/**
 * A* na grelha (4 direções). Não atravessa paredes (as portas deixam passar) nem
 * secretárias, exceto a de destino. Devolve as células a percorrer sem a de
 * partida, ou null se não houver caminho.
 */
export function calcularCaminho(s: Estado, de: Celula, para: Celula): Celula[] | null {
  const W = s.largura;
  const H = s.altura;
  if (!dentroDaGrelha(s, de.x, de.z) || !dentroDaGrelha(s, para.x, para.z)) return null;
  const inicio = de.z * W + de.x;
  const fim = para.z * W + para.x;
  if (inicio === fim) return [];

  const bloqueada = new Uint8Array(W * H);
  for (const d of s.secretarias) bloqueada[d.z * W + d.x] = 1;
  bloqueada[fim] = 0;

  const g = new Float64Array(W * H).fill(Infinity);
  const veio = new Int32Array(W * H).fill(-1);
  const fechada = new Uint8Array(W * H);
  const h = (c: number) => Math.abs((c % W) - para.x) + Math.abs(Math.floor(c / W) - para.z);

  // Fila de prioridade (heap binário) de [f, célula]
  const heap: [number, number][] = [];
  const push = (f: number, c: number) => {
    heap.push([f, c]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): number => {
    const topo = heap[0][1];
    const ult = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = ult;
      let i = 0;
      for (;;) {
        const a = 2 * i + 1;
        const b = a + 1;
        let m = i;
        if (a < heap.length && heap[a][0] < heap[m][0]) m = a;
        if (b < heap.length && heap[b][0] < heap[m][0]) m = b;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return topo;
  };

  g[inicio] = 0;
  push(h(inicio), inicio);
  while (heap.length) {
    const c = pop();
    if (c === fim) break;
    if (fechada[c]) continue;
    fechada[c] = 1;
    const x = c % W;
    const z = (c - x) / W;
    for (const [dx, dz] of VIZINHOS) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const n = nz * W + nx;
      if (bloqueada[n] || fechada[n]) continue;
      if (arestaEntre(s, x, z, dx, dz) === PAREDE) continue;
      const custo = g[c] + 1;
      if (custo < g[n]) {
        g[n] = custo;
        veio[n] = c;
        push(custo + h(n), n);
      }
    }
  }
  if (veio[fim] === -1) return null;
  const caminho: Celula[] = [];
  for (let c = fim; c !== inicio; c = veio[c]) caminho.push({ x: c % W, z: Math.floor(c / W) });
  return caminho.reverse();
}

function secretariaDe(s: Estado, f: Funcionario): Secretaria | undefined {
  return s.secretarias.find((o) => o.id === f.secretariaId);
}

/** (Re)calcula o caminho para o destino do estado atual, a partir da célula onde está. */
function recalcular(s: Estado, f: Funcionario): void {
  f.versaoCaminho = s.versaoMapa;
  const aEntrar = f.estado === 'aCaminho' || f.estado === 'semAcesso';
  const destino = aEntrar ? secretariaDe(s, f) : s.entrada;
  if (!destino) return;
  const c = celulaDe(f);
  const caminho = calcularCaminho(s, c, destino);
  // Primeiro volta ao centro da célula atual, para nunca atravessar uma parede nova.
  if (caminho) {
    f.caminho = [c, ...caminho];
    f.estado = aEntrar ? 'aCaminho' : 'aSair';
  } else {
    f.caminho = [c];
    const novo = aEntrar ? 'semAcesso' : 'preso';
    if (f.estado !== novo)
      mensagem(s, aEntrar
        ? `${f.nome} não consegue chegar à secretária. Falta uma porta?`
        : `${f.nome} está preso(a) e não consegue sair do escritório.`);
    f.estado = novo;
  }
}

function planearChegada(s: Estado, f: Funcionario): void {
  if (!secretariaDe(s, f)) return;
  f.dentro = true;
  f.x = s.entrada.x;
  f.z = s.entrada.z;
  f.estado = 'aCaminho';
  recalcular(s, f);
}

function planearSaida(s: Estado, f: Funcionario): void {
  if (f.estado === 'semAcesso') f.felicidade = Math.max(0, f.felicidade - 5);
  f.estado = 'aSair';
  recalcular(s, f);
}

function andar(f: Funcionario): boolean {
  let resta = VELOCIDADE_ANDAR;
  while (resta > 0 && f.caminho.length > 0) {
    const alvo = f.caminho[0];
    const dx = alvo.x - f.x;
    const dz = alvo.z - f.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= resta) {
      f.x = alvo.x;
      f.z = alvo.z;
      f.caminho.shift();
      resta -= dist;
    } else {
      f.x += (dx / dist) * resta;
      f.z += (dz / dist) * resta;
      resta = 0;
    }
  }
  return f.caminho.length === 0; // chegou
}

// ---------------------------------------------------------------------------
// Ciclo principal
// ---------------------------------------------------------------------------

export function avancar(s: Estado, minutos: number): void {
  for (let i = 0; i < minutos && !s.falencia; i++) minutoSeguinte(s);
}

function minutoSeguinte(s: Estado): void {
  s.minuto++;
  const md = minutoDoDia(s);
  const horario = md >= HORA_INICIO * 60 && md < HORA_FIM * 60;

  for (const f of s.funcionarios) {
    if (!f.dentro) {
      if (md === f.horaChegada && f.secretariaId !== null) planearChegada(s, f);
      continue;
    }
    if (md === HORA_FIM * 60 && f.estado !== 'aSair' && f.estado !== 'preso') planearSaida(s, f);

    // O mapa mudou: quem está a andar (ou à espera de caminho) volta a planear.
    const espera = f.estado === 'semAcesso' || f.estado === 'preso';
    if ((espera || f.estado === 'aCaminho' || f.estado === 'aSair') && f.versaoCaminho !== s.versaoMapa)
      recalcular(s, f);

    if (f.estado === 'aCaminho' || f.estado === 'aSair') {
      if (andar(f)) {
        if (f.estado === 'aSair') {
          f.dentro = false;
          f.estado = f.secretariaId === null ? 'semSecretaria' : 'emCasa';
        } else {
          f.estado = 'aTrabalhar';
        }
      }
    } else if (f.estado === 'aTrabalhar' && horario && s.projeto) {
      const rendimento = f.competencia * (0.5 + f.felicidade / 200);
      s.projeto.trabalhoFeito += rendimento;
      s.projeto.somaCompetencia += rendimento * f.competencia;
    }
  }

  if (s.projeto && s.projeto.trabalhoFeito >= s.projeto.trabalhoTotal) lancarProjeto(s);

  if (md === 0) fimDoDia(s);
  if (s.minuto % MIN_POR_MES === 0) fimDoMes(s);
}

function fimDoDia(s: Estado): void {
  for (const f of s.funcionarios) {
    // Quem ficou preso acaba por ir para casa (e não fica contente).
    if (f.dentro) {
      if (f.estado === 'preso') f.felicidade = Math.max(0, f.felicidade - 10);
      f.dentro = false;
      f.caminho = [];
      f.estado = f.secretariaId === null ? 'semSecretaria' : 'emCasa';
    }
    const alvo = f.secretariaId === null ? 40 : 75;
    f.felicidade += Math.sign(alvo - f.felicidade) * Math.min(2, Math.abs(alvo - f.felicidade));
  }
}

function fimDoMes(s: Estado): void {
  let receitas = 0;
  for (const p of s.produtos) {
    receitas += p.vendasMes;
    p.receitaTotal += p.vendasMes;
    p.vendasMes *= ECON.quedaVendas;
  }
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const despesas = salarios + ECON.rendaMensal;
  s.dinheiro += receitas - despesas;
  mensagem(s, `Fecho do mês: receitas ${euros(receitas)}, despesas ${euros(despesas)}.`);
  gerarCandidatos(s);
  if (s.dinheiro < ECON.limiteFalencia) {
    s.falencia = true;
    mensagem(s, 'Falência! A empresa ficou sem dinheiro.');
  }
}
