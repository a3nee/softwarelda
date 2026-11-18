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
// Economia (afinada com `npm run simtest`)
// ---------------------------------------------------------------------------

export const ECON = {
  dinheiroInicial: 25000,
  rendaMensal: 1500,
  custoSecretaria: 500,
  custoParede: 100, // por segmento de uma célula
  custoPorta: 300,
  limiteFalencia: -10000,
  salarioBase: 1000, // salário = salarioBase + competência × salarioPorCompetencia
  salarioPorCompetencia: 2500,
  coordenacao: 0.08, // cada membro de uma equipa de n rende 1 / (1 + coordenacao × (n − 1))
  saturacao: 0.8, // vendas de um produto novo ÷ (1 + saturacao × ocupação do mercado do seu tipo)
};

// ---------------------------------------------------------------------------
// Tipos de software e funcionalidades
// ---------------------------------------------------------------------------

export type Area = 'programacao' | 'design' | 'testes';
export const AREAS: Area[] = ['programacao', 'design', 'testes'];
export const NOME_AREA: Record<Area, string> = { programacao: 'Programação', design: 'Design', testes: 'Testes' };
/** Competência (0–1) em cada área. */
export type Competencias = Record<Area, number>;

export function competenciaMedia(c: Competencias): number {
  return (c.programacao + c.design + c.testes) / 3;
}

export type TipoSoftware = 'utilitario' | 'editor' | 'antivirus' | 'jogo';

export interface Funcionalidade {
  id: string;
  nome: string;
  trabalho: number; // pontos de trabalho a mais
  valor: number; // vendas × (1 + Σ valor)
  requer: string[]; // ids de funcionalidades do mesmo tipo que têm de ser incluídas também
}

export interface DefTipo {
  nome: string; // singular
  plural: string;
  descricao: string;
  produtosNecessarios: number; // produtos lançados para desbloquear
  trabalho: number; // pontos de trabalho da versão base (2 pessoas fazem ~13 000 por mês)
  vendas: number; // € no 1.º mês com qualidade 100%, sem funcionalidades e com o mercado livre
  queda: number; // vendas do mês seguinte = vendas × queda
  exigencia: number; // vendas × qualidade^exigencia (os jogos castigam mais a falta de qualidade)
  areas: Competencias; // parte do trabalho de cada área (soma 1)
  funcionalidades: Funcionalidade[];
}

export const TIPOS: Record<TipoSoftware, DefTipo> = {
  utilitario: {
    nome: 'Utilitário',
    plural: 'Utilitários',
    descricao: 'Pequeno e rápido de fazer. Vendas modestas, que caem depressa.',
    produtosNecessarios: 0,
    trabalho: 20000,
    vendas: 7600,
    queda: 0.8,
    exigencia: 1,
    areas: { programacao: 0.6, design: 0.2, testes: 0.2 },
    funcionalidades: [
      { id: 'grafica', nome: 'Interface gráfica', trabalho: 6000, valor: 0.25, requer: [] },
      { id: 'agendamento', nome: 'Tarefas agendadas', trabalho: 5000, valor: 0.2, requer: ['grafica'] },
      { id: 'comandos', nome: 'Linha de comandos', trabalho: 3000, valor: 0.1, requer: [] },
    ],
  },
  editor: {
    nome: 'Editor de texto',
    plural: 'Editores de texto',
    descricao: 'Mais trabalho, mas continua a vender durante muito tempo.',
    produtosNecessarios: 1,
    trabalho: 35000,
    vendas: 6200,
    queda: 0.85,
    exigencia: 1,
    areas: { programacao: 0.5, design: 0.3, testes: 0.2 },
    funcionalidades: [
      { id: 'corretor', nome: 'Corretor ortográfico', trabalho: 8000, valor: 0.3, requer: [] },
      { id: 'formatacao', nome: 'Formatação rica', trabalho: 10000, valor: 0.35, requer: [] },
      { id: 'tabelas', nome: 'Tabelas', trabalho: 8000, valor: 0.25, requer: ['formatacao'] },
      { id: 'nuvem', nome: 'Colaboração na nuvem', trabalho: 15000, valor: 0.4, requer: ['formatacao'] },
    ],
  },
  antivirus: {
    nome: 'Antivírus',
    plural: 'Antivírus',
    descricao: 'Vendas baixas no lançamento, mas os clientes ficam: as vendas quase não caem.',
    produtosNecessarios: 2,
    trabalho: 30000,
    vendas: 4200,
    queda: 0.9,
    exigencia: 1,
    areas: { programacao: 0.5, design: 0.1, testes: 0.4 },
    funcionalidades: [
      { id: 'temporeal', nome: 'Proteção em tempo real', trabalho: 12000, valor: 0.4, requer: [] },
      { id: 'firewall', nome: 'Firewall', trabalho: 10000, valor: 0.3, requer: ['temporeal'] },
      { id: 'atualizacoes', nome: 'Atualizações automáticas', trabalho: 6000, valor: 0.2, requer: [] },
    ],
  },
  jogo: {
    nome: 'Jogo',
    plural: 'Jogos',
    descricao: 'Muito trabalho e vendas fortes, mas só no início. Exige uma equipa competente.',
    produtosNecessarios: 3,
    trabalho: 40000,
    vendas: 24600,
    queda: 0.6,
    exigencia: 1.5,
    areas: { programacao: 0.4, design: 0.45, testes: 0.15 },
    funcionalidades: [
      { id: 'graficos3d', nome: 'Gráficos 3D', trabalho: 20000, valor: 0.5, requer: [] },
      { id: 'historia', nome: 'Modo história', trabalho: 12000, valor: 0.3, requer: [] },
      { id: 'multijogador', nome: 'Multijogador', trabalho: 18000, valor: 0.45, requer: [] },
      { id: 'classificacoes', nome: 'Classificações online', trabalho: 6000, valor: 0.2, requer: ['multijogador'] },
    ],
  },
};

export const LISTA_TIPOS = Object.keys(TIPOS) as TipoSoftware[];

function funcionalidade(tipo: TipoSoftware, id: string): Funcionalidade | undefined {
  return TIPOS[tipo].funcionalidades.find((f) => f.id === id);
}

/** Junta às funcionalidades escolhidas tudo aquilo de que dependem (pela ordem da definição). */
export function comDependencias(tipo: TipoSoftware, ids: string[]): string[] {
  const escolhidas = new Set<string>();
  const juntar = (id: string) => {
    const f = funcionalidade(tipo, id);
    if (!f || escolhidas.has(id)) return;
    escolhidas.add(id);
    f.requer.forEach(juntar);
  };
  ids.forEach(juntar);
  return TIPOS[tipo].funcionalidades.filter((f) => escolhidas.has(f.id)).map((f) => f.id);
}

/** Tira uma funcionalidade e tudo o que dependia dela, direta ou indiretamente. */
export function semDependentes(tipo: TipoSoftware, ids: string[], remover: string): string[] {
  const fora = new Set([remover]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const id of ids)
      if (!fora.has(id) && funcionalidade(tipo, id)?.requer.some((r) => fora.has(r))) {
        fora.add(id);
        mudou = true;
      }
  }
  return ids.filter((id) => !fora.has(id));
}

export function validarFuncionalidades(tipo: TipoSoftware, ids: string[]): Resultado {
  for (const id of ids) {
    const f = funcionalidade(tipo, id);
    if (!f) return { ok: false, msg: `Funcionalidade desconhecida: ${id}.` };
    const falta = f.requer.find((r) => !ids.includes(r));
    if (falta) return { ok: false, msg: `«${f.nome}» precisa de «${funcionalidade(tipo, falta)!.nome}».` };
  }
  if (new Set(ids).size !== ids.length) return { ok: false, msg: 'Funcionalidade repetida.' };
  return { ok: true };
}

export function trabalhoDoProjeto(tipo: TipoSoftware, ids: string[]): number {
  return TIPOS[tipo].trabalho + ids.reduce((t, id) => t + (funcionalidade(tipo, id)?.trabalho ?? 0), 0);
}

/** Multiplicador de vendas das funcionalidades: 1 + Σ valor. */
export function valorDoProjeto(tipo: TipoSoftware, ids: string[]): number {
  return 1 + ids.reduce((t, id) => t + (funcionalidade(tipo, id)?.valor ?? 0), 0);
}

export function tipoDisponivel(s: Estado, tipo: TipoSoftware): boolean {
  return s.produtos.length >= TIPOS[tipo].produtosNecessarios;
}

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
  competencias: Competencias;
  projetoId: number | null; // equipa a que pertence (null = sem projeto, não trabalha)
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
  competencias: Competencias;
  salario: number;
}

export interface Secretaria {
  id: number;
  x: number;
  z: number;
}

export interface Projeto {
  id: number;
  nome: string;
  tipo: TipoSoftware;
  funcionalidades: string[];
  trabalhoFeito: number; // soma de feito (para a barra de progresso)
  trabalhoTotal: number;
  feito: Competencias; // pontos feitos em cada área (o total de cada área é trabalhoTotal × areas do tipo)
  somaQualidade: Competencias; // Σ rendimento × competência, por área, para calcular a qualidade
}

export interface Produto {
  nome: string;
  tipo: TipoSoftware;
  funcionalidades: string[];
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
  projetos: Projeto[]; // em desenvolvimento, cada um com a sua equipa
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
    projetos: [],
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
    // Uma especialidade forte; as outras áreas mais fracas.
    const especialidade = escolher(s, AREAS);
    const competencias = {} as Competencias;
    for (const a of AREAS) {
      const v = a === especialidade ? 0.45 + aleatorio(s) * 0.5 : 0.2 + aleatorio(s) * 0.3;
      competencias[a] = Math.round(v * 100) / 100;
    }
    const salario = Math.round(
      (ECON.salarioBase + competenciaMedia(competencias) * ECON.salarioPorCompetencia) / 50) * 50;
    s.candidatos.push({
      nome: `${escolher(s, NOMES)} ${escolher(s, APELIDOS)}`,
      competencias,
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
    competencias: { ...c.competencias },
    projetoId: null,
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

export function membrosDe(s: Estado, projetoId: number): Funcionario[] {
  return s.funcionarios.filter((f) => f.projetoId === projetoId);
}

export function semProjeto(s: Estado): Funcionario[] {
  return s.funcionarios.filter((f) => f.projetoId === null);
}

/** Rendimento de cada membro de uma equipa de n pessoas (coordenação: equipas grandes rendem menos por pessoa). */
export function eficienciaEquipa(n: number): number {
  return n <= 1 ? 1 : 1 / (1 + ECON.coordenacao * (n - 1));
}

/** Põe um funcionário na equipa de um projeto (ou tira-o, com null). */
export function definirEquipa(s: Estado, funcionarioId: number, projetoId: number | null): Resultado {
  const f = s.funcionarios.find((o) => o.id === funcionarioId);
  if (!f) return { ok: false, msg: 'Funcionário desconhecido.' };
  if (projetoId !== null && !s.projetos.some((p) => p.id === projetoId))
    return { ok: false, msg: 'Projeto desconhecido.' };
  f.projetoId = projetoId;
  return { ok: true };
}

/**
 * Começa um projeto. A equipa são os funcionários indicados (por omissão, todos os que estão sem
 * projeto); quem já estava noutro projeto muda de equipa.
 */
export function iniciarProjeto(
  s: Estado, nome: string, tipo: TipoSoftware = 'utilitario', funcionalidades: string[] = [],
  equipa: number[] = semProjeto(s).map((f) => f.id),
): Resultado {
  const def = TIPOS[tipo];
  if (!def) return { ok: false, msg: 'Tipo de software desconhecido.' };
  if (!tipoDisponivel(s, tipo)) {
    const n = def.produtosNecessarios;
    return { ok: false, msg: `Para fazer um ${def.nome.toLowerCase()} precisas de ${n} produto${n === 1 ? '' : 's'} lançado${n === 1 ? '' : 's'}.` };
  }
  const v = validarFuncionalidades(tipo, funcionalidades);
  if (!v.ok) return v;
  if (equipa.some((id) => !s.funcionarios.some((f) => f.id === id)))
    return { ok: false, msg: 'Funcionário desconhecido.' };
  const doTipo = s.produtos.filter((p) => p.tipo === tipo).length + s.projetos.filter((p) => p.tipo === tipo).length;
  const limpo = nome.trim() || `${def.nome} ${doTipo + 1}`;
  const id = s.proximoId++;
  s.projetos.push({
    id,
    nome: limpo,
    tipo,
    funcionalidades: comDependencias(tipo, funcionalidades),
    trabalhoFeito: 0,
    trabalhoTotal: trabalhoDoProjeto(tipo, funcionalidades),
    feito: { programacao: 0, design: 0, testes: 0 },
    somaQualidade: { programacao: 0, design: 0, testes: 0 },
  });
  for (const fid of equipa) definirEquipa(s, fid, id);
  const n = equipa.length;
  mensagem(s, `Começou o desenvolvimento de «${limpo}» (${def.nome.toLowerCase()}), `
    + (n ? `com ${n} pessoa${n === 1 ? '' : 's'}.` : 'ainda sem equipa.'));
  return { ok: true };
}

/** Abandona um projeto em curso: o trabalho perde-se e a equipa fica livre. */
export function cancelarProjeto(s: Estado, projetoId: number): Resultado {
  const p = s.projetos.find((o) => o.id === projetoId);
  if (!p) return { ok: false };
  for (const f of membrosDe(s, projetoId)) f.projetoId = null;
  s.projetos = s.projetos.filter((o) => o !== p);
  mensagem(s, `O projeto «${p.nome}» foi cancelado.`);
  return { ok: true };
}

/**
 * Quanto do mercado de um tipo já está ocupado pelos nossos produtos desse tipo ainda à venda
 * (soma das vendas mensais atuais, em unidades das vendas base do tipo).
 */
export function ocupacaoMercado(s: Estado, tipo: TipoSoftware): number {
  return s.produtos.filter((p) => p.tipo === tipo).reduce((t, p) => t + p.vendasMes, 0) / TIPOS[tipo].vendas;
}

/** Fator (0–1] das vendas de um produto desse tipo lançado agora, devido à saturação do mercado. */
export function fatorMercado(s: Estado, tipo: TipoSoftware): number {
  return 1 / (1 + ECON.saturacao * ocupacaoMercado(s, tipo));
}

/** Vendas do 1.º mês de um produto, dada a qualidade (0–1) e o fator de mercado. */
export function vendasIniciais(tipo: TipoSoftware, funcionalidades: string[], qualidade: number, mercado: number): number {
  const def = TIPOS[tipo];
  return def.vendas * valorDoProjeto(tipo, funcionalidades) * qualidade ** def.exigencia * mercado;
}

// ---------------------------------------------------------------------------
// Trabalho por áreas
// ---------------------------------------------------------------------------

/** O mínimo que o trabalho por áreas precisa de saber de quem trabalha. */
export interface Trabalhador {
  competencias: Competencias;
  felicidade: number;
}

type TrabalhoPorAreas = Pick<Projeto, 'tipo' | 'trabalhoTotal' | 'trabalhoFeito' | 'feito' | 'somaQualidade'>;

export function totalDaArea(p: Pick<Projeto, 'tipo' | 'trabalhoTotal'>, a: Area): number {
  return p.trabalhoTotal * TIPOS[p.tipo].areas[a];
}

/** Pontos por minuto de um trabalhador numa área. */
export function rendimento(f: Trabalhador, a: Area): number {
  return f.competencias[a] * (0.5 + f.felicidade / 200);
}

/** Cada um trabalha na área por acabar em que é mais competente (null se já está tudo feito). */
export function areaDeTrabalho(p: TrabalhoPorAreas, f: Trabalhador): Area | null {
  let melhor: Area | null = null;
  for (const a of AREAS)
    if (p.feito[a] < totalDaArea(p, a) && (melhor === null || f.competencias[a] > f.competencias[melhor])) melhor = a;
  return melhor;
}

function trabalharUmMinuto(p: TrabalhoPorAreas, f: Trabalhador, minutos: number, eficiencia: number): void {
  const a = areaDeTrabalho(p, f);
  if (!a) return;
  const r = rendimento(f, a) * minutos * eficiencia;
  p.feito[a] += r;
  p.somaQualidade[a] += r * f.competencias[a];
  p.trabalhoFeito += r;
}

export function projetoAcabado(p: TrabalhoPorAreas): boolean {
  return AREAS.every((a) => p.feito[a] >= totalDaArea(p, a));
}

/** Qualidade (0–1): média das áreas, pesada pela parte de cada uma; cada área vale a competência de quem a fez × 1,2. */
export function qualidadeDoProjeto(p: TrabalhoPorAreas): number {
  let q = 0;
  for (const a of AREAS) {
    const peso = TIPOS[p.tipo].areas[a];
    if (peso > 0) q += peso * Math.min(1, (p.somaQualidade[a] / Math.max(1e-9, p.feito[a])) * 1.2);
  }
  return q;
}

/**
 * Previsão para a interface e para os jogadores automáticos: meses até acabar e qualidade final,
 * se esta equipa trabalhar 8 h por dia (passos de 1 h). meses = Infinity se não acabar em 3 anos.
 */
export function estimarProjeto(
  equipa: Trabalhador[], tipo: TipoSoftware, funcionalidades: string[],
): { meses: number; qualidade: number } {
  return simularAteAcabar({
    tipo,
    trabalhoTotal: trabalhoDoProjeto(tipo, funcionalidades),
    trabalhoFeito: 0,
    feito: { programacao: 0, design: 0, testes: 0 },
    somaQualidade: { programacao: 0, design: 0, testes: 0 },
  }, equipa);
}

/** Meses que faltam a um projeto em curso com esta equipa (Infinity se parado). */
export function mesesRestantes(p: Projeto, equipa: Trabalhador[]): number {
  return simularAteAcabar(
    { ...p, feito: { ...p.feito }, somaQualidade: { ...p.somaQualidade } }, equipa).meses;
}

function simularAteAcabar(p: TrabalhoPorAreas, equipa: Trabalhador[]): { meses: number; qualidade: number } {
  if (equipa.length === 0) return { meses: Infinity, qualidade: qualidadeDoProjeto(p) };
  const LIMITE = 36 * DIAS_POR_MES * 8;
  const ef = eficienciaEquipa(equipa.length);
  let horas = 0;
  while (!projetoAcabado(p) && horas < LIMITE) {
    for (const f of equipa) trabalharUmMinuto(p, f, 60, ef);
    horas++;
  }
  return { meses: projetoAcabado(p) ? horas / 8 / DIAS_POR_MES : Infinity, qualidade: qualidadeDoProjeto(p) };
}

function lancarProjeto(s: Estado, p: Projeto): void {
  const qualidade = qualidadeDoProjeto(p);
  const mercado = fatorMercado(s, p.tipo);
  const produto: Produto = {
    nome: p.nome,
    tipo: p.tipo,
    funcionalidades: p.funcionalidades,
    qualidade,
    vendasMes: vendasIniciais(p.tipo, p.funcionalidades, qualidade, mercado),
    receitaTotal: 0,
    lancadoEm: s.minuto,
  };
  s.produtos.push(produto);
  s.projetos = s.projetos.filter((o) => o !== p);
  for (const f of membrosDe(s, p.id)) f.projetoId = null;
  const perda = Math.round((1 - mercado) * 100);
  const novos = LISTA_TIPOS.filter((t) => TIPOS[t].produtosNecessarios === s.produtos.length);
  mensagem(s, `«${produto.nome}» foi lançado! Qualidade ${Math.round(qualidade * 100)}%. A equipa está livre.`
    + (perda >= 5 ? ` O mercado de ${TIPOS[p.tipo].plural.toLowerCase()} está saturado: vendas −${perda}%.` : ''));
  for (const t of novos) mensagem(s, `Novo tipo de software disponível: ${TIPOS[t].nome.toLowerCase()}.`);
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
// Guardar e carregar (o Estado é JSON puro; o aleatório vive em s.semente)
// ---------------------------------------------------------------------------

export const VERSAO_SAVE = 1;

export interface Save {
  versao: number;
  guardadoEm: number; // Date.now() de quando foi guardado
  estado: Estado;
}

export function exportarJogo(s: Estado, guardadoEm = Date.now()): string {
  const save: Save = { versao: VERSAO_SAVE, guardadoEm, estado: s };
  return JSON.stringify(save);
}

export type ResultadoCarregar = { ok: true; estado: Estado; guardadoEm: number } | { ok: false; msg: string };

/** Lê um save e valida-o por inteiro: um save corrompido nunca chega ao jogo. */
export function importarJogo(texto: string): ResultadoCarregar {
  let o: unknown;
  try {
    o = JSON.parse(texto);
  } catch {
    return { ok: false, msg: 'O ficheiro guardado está corrompido (não é JSON válido).' };
  }
  if (!objeto(o) || typeof o.versao !== 'number') return { ok: false, msg: 'Isto não é um jogo guardado.' };
  if (o.versao > VERSAO_SAVE) return { ok: false, msg: 'Este jogo foi guardado numa versão mais recente.' };
  const erro = erroNoEstado(o.estado);
  if (erro) return { ok: false, msg: `Jogo guardado inválido: ${erro}.` };
  return { ok: true, estado: o.estado as Estado, guardadoEm: typeof o.guardadoEm === 'number' ? o.guardadoEm : 0 };
}

/** Mês de jogo em que estamos (0 = o primeiro); muda no fecho de cada mês. */
export function mesDeJogo(s: Estado): number {
  return Math.floor(s.minuto / MIN_POR_MES);
}

type Obj = Record<string, unknown>;
function objeto(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function numero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function inteiro(v: unknown): v is number {
  return Number.isInteger(v);
}
function competenciasValidas(v: unknown): boolean {
  return objeto(v) && AREAS.every((a) => numero(v[a]) && v[a] >= 0);
}
function celulaValida(v: unknown, largura: number, altura: number): boolean {
  return objeto(v) && numero(v.x) && numero(v.z) && v.x >= 0 && v.z >= 0 && v.x < largura && v.z < altura;
}

/** Devolve a descrição do primeiro problema, ou null se o estado estiver bom. */
function erroNoEstado(e: unknown): string | null {
  if (!objeto(e)) return 'falta o estado';
  for (const k of ['minuto', 'dinheiro', 'semente', 'proximoId', 'versaoMapa'])
    if (!numero(e[k])) return `campo «${k}» em falta`;
  const L = e.largura, A = e.altura;
  if (!inteiro(L) || !inteiro(A) || L < 2 || A < 2 || L > 200 || A > 200) return 'tamanho do terreno';
  if (!celulaValida(e.entrada, L, A)) return 'entrada fora do terreno';
  if (typeof e.falencia !== 'boolean') return 'campo «falencia» em falta';
  const arestas = (v: unknown, n: number) =>
    Array.isArray(v) && v.length === n && v.every((x) => x === NADA || x === PAREDE || x === PORTA);
  if (!arestas(e.paredesV, (L + 1) * A) || !arestas(e.paredesH, L * (A + 1))) return 'paredes';
  for (const k of ['funcionarios', 'candidatos', 'secretarias', 'projetos', 'produtos', 'mensagens'])
    if (!Array.isArray(e[k])) return `lista «${k}» em falta`;
  const proximoId = e.proximoId as number;
  const idValido = (v: unknown) => inteiro(v) && v > 0 && v < proximoId;

  const secretarias = new Set<number>();
  for (const d of e.secretarias as unknown[]) {
    if (!objeto(d) || !idValido(d.id) || !celulaValida(d, L, A)) return 'secretária';
    if (secretarias.has(d.id as number)) return 'secretária repetida';
    secretarias.add(d.id as number);
  }
  const projetos = new Set<number>();
  for (const p of e.projetos as unknown[]) {
    if (!objeto(p) || !idValido(p.id) || typeof p.nome !== 'string') return 'projeto';
    if (typeof p.tipo !== 'string' || !(p.tipo in TIPOS)) return 'tipo de projeto desconhecido';
    if (!Array.isArray(p.funcionalidades) || !p.funcionalidades.every((f) => typeof f === 'string')
      || !validarFuncionalidades(p.tipo as TipoSoftware, p.funcionalidades as string[]).ok) return 'funcionalidades do projeto';
    if (!numero(p.trabalhoFeito) || !numero(p.trabalhoTotal) || p.trabalhoTotal <= 0) return 'trabalho do projeto';
    if (!competenciasValidas(p.feito) || !competenciasValidas(p.somaQualidade)) return 'áreas do projeto';
    if (projetos.has(p.id as number)) return 'projeto repetido';
    projetos.add(p.id as number);
  }
  const funcionarios = new Set<number>();
  for (const f of e.funcionarios as unknown[]) {
    if (!objeto(f) || !idValido(f.id) || typeof f.nome !== 'string') return 'funcionário';
    if (funcionarios.has(f.id as number)) return 'funcionário repetido';
    funcionarios.add(f.id as number);
    if (!competenciasValidas(f.competencias)) return 'competências';
    if (!numero(f.salario) || !numero(f.felicidade) || !numero(f.x) || !numero(f.z) || !numero(f.horaChegada)
      || !numero(f.versaoCaminho)) return 'funcionário';
    if (f.projetoId !== null && !projetos.has(f.projetoId as number)) return 'funcionário num projeto que não existe';
    if (f.secretariaId !== null && !secretarias.has(f.secretariaId as number)) return 'funcionário numa secretária que não existe';
    if (typeof f.estado !== 'string' || !(f.estado in NOME_ESTADO)) return 'estado de funcionário desconhecido';
    if (typeof f.dentro !== 'boolean') return 'funcionário';
    if (!Array.isArray(f.caminho) || !f.caminho.every((c) => celulaValida(c, L, A))) return 'caminho';
  }
  for (const c of e.candidatos as unknown[])
    if (!objeto(c) || typeof c.nome !== 'string' || !competenciasValidas(c.competencias) || !numero(c.salario)) return 'candidato';
  for (const p of e.produtos as unknown[])
    if (!objeto(p) || typeof p.nome !== 'string' || typeof p.tipo !== 'string' || !(p.tipo in TIPOS)
      || !Array.isArray(p.funcionalidades) || !numero(p.qualidade) || !numero(p.vendasMes)
      || !numero(p.receitaTotal) || !numero(p.lancadoEm)) return 'produto';
  for (const m of e.mensagens as unknown[])
    if (!objeto(m) || !numero(m.minuto) || typeof m.texto !== 'string') return 'mensagem';
  return null;
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
  // Tamanho de cada equipa (a eficiência conta com a equipa inteira, esteja ou não toda presente).
  const tamanho = new Map<number, number>();
  for (const f of s.funcionarios)
    if (f.projetoId !== null) tamanho.set(f.projetoId, (tamanho.get(f.projetoId) ?? 0) + 1);

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
    } else if (f.estado === 'aTrabalhar' && horario && f.projetoId !== null) {
      const p = s.projetos.find((o) => o.id === f.projetoId);
      if (p) trabalharUmMinuto(p, f, 1, eficienciaEquipa(tamanho.get(p.id) ?? 1));
    }
  }

  for (const p of s.projetos.filter(projetoAcabado)) lancarProjeto(s, p);

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
    p.vendasMes *= TIPOS[p.tipo].queda;
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
