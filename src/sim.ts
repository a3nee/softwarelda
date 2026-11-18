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
  | 'semSecretaria';

export const NOME_ESTADO: Record<EstadoFuncionario, string> = {
  emCasa: 'Em casa',
  aCaminho: 'A caminho',
  aTrabalhar: 'A trabalhar',
  aSair: 'A sair',
  semSecretaria: 'Sem secretária',
};

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

/** Caminho da posição atual até ao destino (por agora em linha reta). */
export function calcularCaminho(_s: Estado, _de: Celula, para: Celula): Celula[] | null {
  return [para];
}

function planearChegada(s: Estado, f: Funcionario): void {
  const d = s.secretarias.find((o) => o.id === f.secretariaId);
  if (!d) return;
  f.dentro = true;
  f.x = s.entrada.x;
  f.z = s.entrada.z;
  f.caminho = calcularCaminho(s, s.entrada, d) ?? [];
  f.estado = 'aCaminho';
}

function planearSaida(s: Estado, f: Funcionario): void {
  f.caminho = calcularCaminho(s, celulaDe(f), s.entrada) ?? [];
  f.estado = 'aSair';
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
    if (md === HORA_FIM * 60 && f.estado !== 'aSair') planearSaida(s, f);

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
