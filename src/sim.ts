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
  hype?: number; // 0–1: as vendas do lançamento são × (1 + hype). Sobe com as campanhas de marketing
  campanhas?: IdCampanha[]; // campanhas já feitas (cada uma só uma vez por projeto)
  contrato?: ContratoAtivo; // trabalho por encomenda: paga no fim e não vira produto
}

export interface Produto {
  nome: string;
  tipo: TipoSoftware;
  funcionalidades: string[];
  qualidade: number; // 0..1
  vendasMes: number; // € previstos para o próximo fecho de mês
  receitaTotal: number;
  lancadoEm: number; // minuto de jogo
  criticas?: number[]; // notas dos críticos (1–10); os saves antigos não as têm
}

/** Para a interface escolher cor, som e se mostra um aviso flutuante. */
export type TipoMensagem = 'info' | 'aviso' | 'lancamento' | 'desbloqueio' | 'conquista' | 'evento' | 'mes' | 'falencia'
  | 'nivel' | 'missao' | 'rival' | 'contrato' | 'investimento';

export interface Mensagem {
  minuto: number;
  texto: string;
  tipo?: TipoMensagem; // os saves da versão 1 não o têm
}

// ---------------------------------------------------------------------------
// Decoração: cada objeto ocupa uma célula e alegra quem trabalha no mesmo espaço
// ---------------------------------------------------------------------------

export type TipoObjeto = 'planta' | 'sofa' | 'cafe' | 'matraquilhos';

export interface DefObjeto {
  nome: string;
  custo: number;
  felicidade: number; // pontos a mais no alvo de felicidade (o 2.º do mesmo tipo vale metade, o 3.º um quarto…)
  descricao: string;
}

export const OBJETOS: Record<TipoObjeto, DefObjeto> = {
  planta: { nome: 'Planta', custo: 150, felicidade: 3, descricao: 'Um pouco de verde. Barata, mas vale pouco sozinha.' },
  sofa: { nome: 'Sofá', custo: 600, felicidade: 5, descricao: 'Para descansar entre duas tarefas.' },
  cafe: { nome: 'Máquina de café', custo: 900, felicidade: 8, descricao: 'O combustível de qualquer programador.' },
  matraquilhos: { nome: 'Matraquilhos', custo: 1500, felicidade: 10, descricao: 'Para as pausas mais renhidas.' },
};
export const LISTA_OBJETOS = Object.keys(OBJETOS) as TipoObjeto[];

export const DECORACAO = {
  bonusMaximo: 25, // o alvo de felicidade passa de 75 para, no máximo, 100
  raioEspacoAberto: 5, // fora das salas, conta a decoração até esta distância (em células)
};

export interface Objeto {
  id: number;
  tipo: TipoObjeto;
  x: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Empresa e dificuldade
// ---------------------------------------------------------------------------

export type Dificuldade = 'facil' | 'normal' | 'dificil';

export const DIFICULDADES: Record<Dificuldade, { nome: string; dinheiro: number; descricao: string }> = {
  facil: { nome: 'Fácil', dinheiro: 50000, descricao: 'Começas com 50 000 €. Ideal para aprender.' },
  normal: { nome: 'Normal', dinheiro: 25000, descricao: 'Começas com 25 000 €. O jogo equilibrado.' },
  dificil: { nome: 'Difícil', dinheiro: 12000, descricao: 'Começas com 12 000 €. Cada euro conta.' },
};

export interface OpcoesJogo {
  nome?: string;
  dificuldade?: Dificuldade;
  eventos?: boolean; // eventos aleatórios no fecho do mês
  missoes?: boolean; // missões com recompensas (os testes de equilíbrio correm sem elas)
}

/** Um fecho de mês, para os gráficos das estatísticas. */
export interface RegistoMes {
  mes: number; // mês que fechou (0 = o primeiro)
  receitas: number;
  despesas: number;
  dinheiro: number; // em caixa depois do fecho
  valor?: number; // avaliação da empresa depois do fecho (os saves antigos não a têm)
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
  nome: string; // nome da empresa
  dificuldade: Dificuldade;
  eventos: boolean;
  objetos: Objeto[]; // decoração
  historico: RegistoMes[];
  conquistas: string[]; // ids de CONQUISTAS já desbloqueadas
  xp: number; // experiência da empresa (dá o nível)
  melhorias: IdMelhoria[];
  comMissoes: boolean;
  missoes: Missao[]; // ativas (até 3)
  missoesFeitas: number;
  proximaMissao: number; // quantas missões já foram geradas (escolhe a próxima)
  sementeMundo: number; // fixa: decide concorrentes e contratos sem tocar no gerador aleatório
  rivais: Rival[];
  participacao: number; // parte da empresa (0–1) que já pertence a investidores
  rondas: IdRonda[];
  ofertas: OfertaContrato[]; // contratos de clientes disponíveis este mês
  contratosFeitos: number;
  extraMes: number; // receitas deste mês fora das vendas (contratos), para o histórico
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

export function novoJogo(semente = 12345, largura = 24, altura = 18, opcoes: OpcoesJogo = {}): Estado {
  const dificuldade = opcoes.dificuldade ?? 'normal';
  const nome = opcoes.nome?.trim().slice(0, 30) || 'Software Lda.';
  const s: Estado = {
    largura,
    altura,
    entrada: { x: 0, z: Math.floor(altura / 2) },
    minuto: HORA_INICIO * 60 - 90,
    dinheiro: dificuldade === 'normal' ? ECON.dinheiroInicial : DIFICULDADES[dificuldade].dinheiro,
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
    nome,
    dificuldade,
    eventos: opcoes.eventos ?? false,
    objetos: [],
    historico: [],
    conquistas: [],
    xp: 0,
    melhorias: [],
    comMissoes: opcoes.missoes ?? false,
    missoes: [],
    missoesFeitas: 0,
    proximaMissao: 0,
    sementeMundo: semente,
    rivais: criarRivais(semente),
    participacao: 0,
    rondas: [],
    ofertas: [],
    contratosFeitos: 0,
    extraMes: 0,
  };
  gerarOfertas(s);
  gerarCandidatos(s);
  completarMissoes(s);
  mensagem(s, `Bem-vindo à ${nome}! Coloca secretárias e contrata a tua equipa.`);
  return s;
}

export function mensagem(s: Estado, texto: string, tipo: TipoMensagem = 'info'): void {
  s.mensagens.push({ minuto: s.minuto, texto, tipo });
  if (s.mensagens.length > 60) s.mensagens.shift();
}

export function gerarCandidatos(s: Estado): void {
  s.candidatos = [];
  const n = temMelhoria(s, 'recrutador') ? 4 : 3;
  for (let i = 0; i < n; i++) s.candidatos.push(novoCandidato(s));
}

function novoCandidato(s: Estado): Candidato {
  // Uma especialidade forte; as outras áreas mais fracas.
  const especialidade = escolher(s, AREAS);
  const competencias = {} as Competencias;
  for (const a of AREAS) {
    const v = a === especialidade ? 0.45 + aleatorio(s) * 0.5 : 0.2 + aleatorio(s) * 0.3;
    competencias[a] = Math.round(v * 100) / 100;
  }
  const salario = Math.round(
    (ECON.salarioBase + competenciaMedia(competencias) * ECON.salarioPorCompetencia) / 50) * 50;
  return { nome: `${escolher(s, NOMES)} ${escolher(s, APELIDOS)}`, competencias, salario };
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
  if (objetoEm(s, x, z)) return { ok: false, msg: 'Já há um objeto aqui.' };
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

export function objetoEm(s: Estado, x: number, z: number): Objeto | undefined {
  return s.objetos.find((o) => o.x === x && o.z === z);
}

export function colocarObjeto(s: Estado, tipo: TipoObjeto, x: number, z: number): Resultado {
  const def = OBJETOS[tipo];
  if (!def) return { ok: false };
  if (!dentroDaGrelha(s, x, z)) return { ok: false, msg: 'Fora do terreno.' };
  if (x === s.entrada.x && z === s.entrada.z) return { ok: false, msg: 'Não podes bloquear a entrada.' };
  if (secretariaEm(s, x, z) || objetoEm(s, x, z)) return { ok: false, msg: 'Esta célula já está ocupada.' };
  if (s.dinheiro < def.custo) return { ok: false, msg: 'Dinheiro insuficiente.' };
  s.dinheiro -= def.custo;
  s.objetos.push({ id: s.proximoId++, tipo, x, z });
  s.versaoMapa++;
  verificarConquistas(s);
  return { ok: true };
}

export function removerObjeto(s: Estado, x: number, z: number): Resultado {
  const o = objetoEm(s, x, z);
  if (!o) return { ok: false };
  s.objetos = s.objetos.filter((d) => d !== o);
  s.versaoMapa++;
  return { ok: true };
}

/**
 * Pontos de felicidade a mais para quem trabalha na célula (x, z). Numa sala conta a decoração dessa
 * sala; no espaço aberto, a do espaço aberto que esteja perto. Objetos repetidos valem cada vez menos.
 */
export function bonusDecoracao(s: Estado, x: number, z: number, salas: Salas = detetarSalas(s)): number {
  const aqui = salas.sala[z * s.largura + x];
  const porTipo = new Map<TipoObjeto, number>();
  for (const o of s.objetos) {
    const ali = salas.sala[o.z * s.largura + o.x];
    const conta = aqui >= 0
      ? ali === aqui
      : ali < 0 && Math.abs(o.x - x) + Math.abs(o.z - z) <= DECORACAO.raioEspacoAberto;
    if (conta) porTipo.set(o.tipo, (porTipo.get(o.tipo) ?? 0) + 1);
  }
  let bonus = 0;
  for (const [t, n] of porTipo) bonus += OBJETOS[t].felicidade * (2 - 2 ** (1 - n)); // 1 + ½ + ¼ + …
  return Math.min(DECORACAO.bonusMaximo, bonus);
}

/** Felicidade para a qual o funcionário tende, dia a dia. */
export function alvoFelicidade(s: Estado, f: Funcionario, salas?: Salas): number {
  const d = f.secretariaId === null ? undefined : s.secretarias.find((o) => o.id === f.secretariaId);
  if (!d) return 40;
  const cafe = temMelhoria(s, 'cafe') ? 5 : 0;
  return Math.min(100, 75 + cafe + (s.objetos.length ? bonusDecoracao(s, d.x, d.z, salas) : 0));
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
  verificarConquistas(s);
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
  verificarConquistas(s);
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
export function eficienciaEquipa(n: number, coordenacao = ECON.coordenacao): number {
  return n <= 1 ? 1 : 1 / (1 + coordenacao * (n - 1));
}

/** Coordenação desta empresa (a metodologia ágil corta-a para metade). */
export function coordenacaoDe(s: Estado): number {
  return temMelhoria(s, 'agil') ? ECON.coordenacao / 2 : ECON.coordenacao;
}

/** Renda mensal desta empresa. */
export function rendaDe(s: Estado): number {
  return temMelhoria(s, 'renda') ? 900 : ECON.rendaMensal;
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
  equipa: Trabalhador[], tipo: TipoSoftware, funcionalidades: string[], coordenacao = ECON.coordenacao,
): { meses: number; qualidade: number } {
  return simularAteAcabar({
    tipo,
    trabalhoTotal: trabalhoDoProjeto(tipo, funcionalidades),
    trabalhoFeito: 0,
    feito: { programacao: 0, design: 0, testes: 0 },
    somaQualidade: { programacao: 0, design: 0, testes: 0 },
  }, equipa, coordenacao);
}

/** Meses que faltam a um projeto em curso com esta equipa (Infinity se parado). */
export function mesesRestantes(p: Projeto, equipa: Trabalhador[], coordenacao = ECON.coordenacao): number {
  return simularAteAcabar(
    { ...p, feito: { ...p.feito }, somaQualidade: { ...p.somaQualidade } }, equipa, coordenacao).meses;
}

function simularAteAcabar(
  p: TrabalhoPorAreas, equipa: Trabalhador[], coordenacao: number,
): { meses: number; qualidade: number } {
  if (equipa.length === 0) return { meses: Infinity, qualidade: qualidadeDoProjeto(p) };
  const LIMITE = 36 * DIAS_POR_MES * 8;
  const ef = eficienciaEquipa(equipa.length, coordenacao);
  let horas = 0;
  while (!projetoAcabado(p) && horas < LIMITE) {
    for (const f of equipa) trabalharUmMinuto(p, f, 60, ef);
    horas++;
  }
  return { meses: projetoAcabado(p) ? horas / 8 / DIAS_POR_MES : Infinity, qualidade: qualidadeDoProjeto(p) };
}

function lancarProjeto(s: Estado, p: Projeto): void {
  if (p.contrato) return entregarContrato(s, p);
  const qualidade = Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s));
  const mercado = fatorMercado(s, p.tipo);
  const marketing = temMelhoria(s, 'marketing') ? 1.15 : 1;
  const produto: Produto = {
    nome: p.nome,
    tipo: p.tipo,
    funcionalidades: p.funcionalidades,
    qualidade,
    vendasMes: vendasIniciais(p.tipo, p.funcionalidades, qualidade, mercado) * marketing * (1 + (p.hype ?? 0)),
    receitaTotal: 0,
    lancadoEm: s.minuto,
    criticas: criticasPara(p.nome, qualidade, s.minuto),
  };
  s.produtos.push(produto);
  s.projetos = s.projetos.filter((o) => o !== p);
  for (const f of membrosDe(s, p.id)) {
    f.projetoId = null;
    if (temMelhoria(s, 'premios')) f.felicidade = Math.min(100, f.felicidade + 15);
  }
  const perda = Math.round((1 - mercado) * 100);
  const novos = LISTA_TIPOS.filter((t) => TIPOS[t].produtosNecessarios === s.produtos.length);
  mensagem(s, `«${produto.nome}» foi lançado! Qualidade ${Math.round(qualidade * 100)}%. A equipa está livre.`
    + (perda >= 5 ? ` O mercado de ${TIPOS[p.tipo].plural.toLowerCase()} está saturado: vendas −${perda}%.` : ''),
  'lancamento');
  for (const t of novos) mensagem(s, `Novo tipo de software disponível: ${TIPOS[t].nome.toLowerCase()}.`, 'desbloqueio');
  ganharXp(s, xpDeLancamento(p.tipo, qualidade));
  verificarConquistas(s);
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
  for (const o of s.objetos) bloqueada[o.z * W + o.x] = 1; // a decoração nunca é destino

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
        : `${f.nome} está preso(a) e não consegue sair do escritório.`, 'aviso');
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

// Versão 2: nome da empresa, dificuldade, eventos, decoração, histórico e conquistas.
export const VERSAO_SAVE = 4;

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
  if (o.versao < 2 && objeto(o.estado)) migrarDaVersao1(o.estado);
  if (o.versao < 3 && objeto(o.estado)) migrarDaVersao2(o.estado);
  if (o.versao < 4 && objeto(o.estado)) migrarDaVersao3(o.estado);
  const erro = erroNoEstado(o.estado);
  if (erro) return { ok: false, msg: `Jogo guardado inválido: ${erro}.` };
  return { ok: true, estado: o.estado as Estado, guardadoEm: typeof o.guardadoEm === 'number' ? o.guardadoEm : 0 };
}

/** Os campos que a versão 2 acrescentou, com os valores de um jogo antigo. */
function migrarDaVersao1(e: Record<string, unknown>): void {
  e.nome ??= 'Software Lda.';
  e.dificuldade ??= 'normal';
  e.eventos ??= false;
  e.objetos ??= [];
  e.historico ??= [];
  e.conquistas ??= [];
}

/** Os campos que a versão 3 acrescentou. As missões aparecem na primeira verificação. */
function migrarDaVersao2(e: Record<string, unknown>): void {
  e.xp ??= 0;
  e.melhorias ??= [];
  e.comMissoes ??= true;
  e.missoes ??= [];
  e.missoesFeitas ??= 0;
  e.proximaMissao ??= 0;
}

/** Os campos que a versão 4 acrescentou: os concorrentes aparecem já com os meses que passaram. */
function migrarDaVersao3(e: Record<string, unknown>): void {
  const semente = numero(e.semente) ? e.semente | 0 : 12345;
  e.sementeMundo ??= semente;
  if (e.rivais === undefined) {
    const rivais = criarRivais(e.sementeMundo as number);
    const mes = numero(e.minuto) ? Math.floor(e.minuto / MIN_POR_MES) : 0;
    for (let m = 1; m <= Math.min(mes, 600); m++) for (const r of rivais) passoDoRival(r, e.sementeMundo as number, m);
    e.rivais = rivais;
  }
  e.participacao ??= 0;
  e.rondas ??= [];
  e.ofertas ??= [];
  e.contratosFeitos ??= 0;
  e.extraMes ??= 0;
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
    if (p.hype !== undefined && !(numero(p.hype) && p.hype >= 0 && p.hype <= HYPE_MAXIMO)) return 'hype do projeto';
    if (p.campanhas !== undefined && !(Array.isArray(p.campanhas) && p.campanhas.every((c) => typeof c === 'string' && c in CAMPANHAS)
      && new Set(p.campanhas).size === p.campanhas.length)) return 'campanhas do projeto';
    const c = p.contrato;
    if (c !== undefined && !(objeto(c) && typeof c.cliente === 'string' && numero(c.pagamento) && c.pagamento >= 0
      && numero(c.prazo) && (c.atrasado === undefined || typeof c.atrasado === 'boolean'))) return 'contrato do projeto';
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
      || !numero(p.receitaTotal) || !numero(p.lancadoEm)
      || (p.criticas !== undefined && !(Array.isArray(p.criticas) && p.criticas.every(numero)))) return 'produto';
  for (const m of e.mensagens as unknown[])
    if (!objeto(m) || !numero(m.minuto) || typeof m.texto !== 'string'
      || (m.tipo !== undefined && typeof m.tipo !== 'string')) return 'mensagem';

  if (typeof e.nome !== 'string' || e.nome.length > 40) return 'nome da empresa';
  if (typeof e.dificuldade !== 'string' || !(e.dificuldade in DIFICULDADES)) return 'dificuldade';
  if (typeof e.eventos !== 'boolean') return 'campo «eventos» em falta';
  for (const k of ['objetos', 'historico', 'conquistas'])
    if (!Array.isArray(e[k])) return `lista «${k}» em falta`;
  const ocupadas = new Set((e.secretarias as { x: number; z: number }[]).map((d) => d.z * L + d.x));
  const ids = new Set([...secretarias, ...projetos, ...funcionarios]);
  for (const o of e.objetos as unknown[]) {
    if (!objeto(o) || !idValido(o.id) || !celulaValida(o, L, A) || !inteiro(o.x) || !inteiro(o.z)) return 'objeto';
    if (typeof o.tipo !== 'string' || !(o.tipo in OBJETOS)) return 'objeto desconhecido';
    if (ids.has(o.id as number)) return 'objeto repetido';
    ids.add(o.id as number);
    const c = (o.z as number) * L + (o.x as number);
    if (ocupadas.has(c)) return 'dois objetos na mesma célula';
    ocupadas.add(c);
  }
  for (const r of e.historico as unknown[])
    if (!objeto(r) || !numero(r.mes) || !numero(r.receitas) || !numero(r.despesas) || !numero(r.dinheiro)
      || (r.valor !== undefined && !numero(r.valor))) return 'histórico';
  if (!(e.conquistas as unknown[]).every((c) => typeof c === 'string')) return 'conquistas';
  if (!numero(e.xp) || e.xp < 0) return 'experiência';
  const melhorias = e.melhorias;
  if (!Array.isArray(melhorias) || !melhorias.every((m) => typeof m === 'string' && m in MELHORIAS)) return 'melhorias';
  if (new Set(melhorias).size !== melhorias.length) return 'melhoria repetida';
  if (typeof e.comMissoes !== 'boolean') return 'campo «comMissoes» em falta';
  if (!inteiro(e.missoesFeitas) || !inteiro(e.proximaMissao)) return 'contador de missões';
  if (!Array.isArray(e.missoes) || e.missoes.length > MISSOES_ATIVAS) return 'lista «missoes»';
  for (const m of e.missoes as unknown[])
    if (!objeto(m) || !inteiro(m.id) || typeof m.tipo !== 'string' || !(m.tipo in TEXTO_MISSAO) || !numero(m.alvo)
      || !numero(m.desde) || !numero(m.dinheiro) || !numero(m.xp)
      || (m.software !== undefined && !(typeof m.software === 'string' && m.software in TIPOS))) return 'missão';
  if (!numero(e.sementeMundo)) return 'campo «sementeMundo» em falta';
  if (!Array.isArray(e.rivais) || e.rivais.length > 20) return 'lista «rivais»';
  for (const r of e.rivais as unknown[])
    if (!objeto(r) || !inteiro(r.id) || typeof r.nome !== 'string' || typeof r.tipo !== 'string' || !(r.tipo in TIPOS)
      || !numero(r.valor) || r.valor < 0 || !numero(r.tendencia) || !inteiro(r.produtos)
      || !Array.isArray(r.historico) || r.historico.length > HISTORICO_RIVAL || !r.historico.every(numero)) return 'concorrente';
  if (!numero(e.participacao) || e.participacao < 0 || e.participacao >= 1) return 'participação dos investidores';
  const rondas = e.rondas;
  if (!Array.isArray(rondas) || !rondas.every((r) => typeof r === 'string' && r in RONDAS) || new Set(rondas).size !== rondas.length)
    return 'rondas de investimento';
  if (!Array.isArray(e.ofertas) || e.ofertas.length > 10) return 'lista «ofertas»';
  for (const o of e.ofertas as unknown[])
    if (!objeto(o) || !inteiro(o.id) || typeof o.cliente !== 'string' || typeof o.encomenda !== 'string'
      || typeof o.tipo !== 'string' || !(o.tipo in TIPOS) || !numero(o.trabalho) || o.trabalho <= 0
      || !numero(o.pagamento) || o.pagamento < 0 || !numero(o.prazoDias) || o.prazoDias <= 0) return 'oferta de contrato';
  if (!inteiro(e.contratosFeitos) || e.contratosFeitos < 0) return 'contador de contratos';
  if (!numero(e.extraMes)) return 'campo «extraMes» em falta';
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
      if (p) trabalharUmMinuto(p, f, 1, eficienciaEquipa(tamanho.get(p.id) ?? 1, coordenacaoDe(s)));
    }
  }

  for (const p of s.projetos.filter(projetoAcabado)) lancarProjeto(s, p);

  if (md === 0) fimDoDia(s);
  if (s.minuto % MIN_POR_MES === 0) fimDoMes(s);
}

function fimDoDia(s: Estado): void {
  const salas = s.objetos.length ? detetarSalas(s) : undefined;
  for (const f of s.funcionarios) {
    // Quem ficou preso acaba por ir para casa (e não fica contente).
    if (f.dentro) {
      if (f.estado === 'preso') f.felicidade = Math.max(0, f.felicidade - 10);
      f.dentro = false;
      f.caminho = [];
      f.estado = f.secretariaId === null ? 'semSecretaria' : 'emCasa';
    }
    const alvo = alvoFelicidade(s, f, salas);
    f.felicidade += Math.sign(alvo - f.felicidade) * Math.min(2, Math.abs(alvo - f.felicidade));
  }
  for (const p of s.projetos)
    if (p.contrato && !p.contrato.atrasado && s.minuto > p.contrato.prazo) {
      p.contrato.atrasado = true;
      mensagem(s, `⏰ O prazo de «${p.nome}» passou: o cliente vai pagar menos (−${Math.round((1 - CONTRATOS.multaAtraso) * 100)}%).`, 'aviso');
    }
  verificarConquistas(s);
}

function fimDoMes(s: Estado): void {
  let receitas = 0;
  for (const p of s.produtos) {
    receitas += p.vendasMes;
    p.receitaTotal += p.vendasMes;
    const q = TIPOS[p.tipo].queda;
    p.vendasMes *= temMelhoria(s, 'fas') ? q + (1 - q) * 0.4 : q;
  }
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const despesas = salarios + rendaDe(s);
  const extra = s.extraMes;
  s.extraMes = 0;
  // Os investidores ficam com a sua parte do lucro do mês.
  const lucro = receitas + extra - despesas;
  const dividendos = s.participacao > 0 && lucro > 0 ? Math.round(lucro * s.participacao) : 0;
  s.dinheiro += receitas - despesas - dividendos;
  mensagem(s, `Fecho do mês: receitas ${euros(receitas + extra)}, despesas ${euros(despesas)}`
    + (dividendos ? `, dividendos aos investidores ${euros(dividendos)}` : '') + '.', 'mes');
  s.historico.push({ mes: mesDeJogo(s) - 1, receitas: receitas + extra, despesas: despesas + dividendos, dinheiro: s.dinheiro });
  if (s.historico.length > 240) s.historico.shift();
  if (temMelhoria(s, 'formacao')) for (const f of s.funcionarios) {
    const a = AREAS.reduce((m, o) => (f.competencias[o] > f.competencias[m] ? o : m), AREAS[0]);
    f.competencias[a] = Math.min(1, Math.round((f.competencias[a] + 0.01) * 100) / 100);
  }
  if (receitas + extra > despesas + dividendos) ganharXp(s, 20 * Math.min(5, serieDeLucro(s)));
  gerarCandidatos(s);
  if (s.dinheiro < ECON.limiteFalencia) {
    s.falencia = true;
    mensagem(s, 'Falência! A empresa ficou sem dinheiro.', 'falencia');
    return;
  }
  s.historico[s.historico.length - 1].valor = avaliarEmpresa(s).total;
  atualizarRivais(s);
  gerarOfertas(s);
  if (s.eventos && aleatorio(s) < PROBABILIDADE_EVENTO) eventoAleatorio(s);
  verificarConquistas(s);
}

// ---------------------------------------------------------------------------
// Eventos aleatórios no fecho do mês (só com s.eventos; os testes de equilíbrio correm sem eles)
// ---------------------------------------------------------------------------

export const PROBABILIDADE_EVENTO = 0.35;

interface DefEvento {
  bom: boolean;
  possivel: (s: Estado) => boolean;
  aplicar: (s: Estado) => string; // devolve a mensagem
}

const comVendas = (s: Estado) => s.produtos.filter((p) => p.vendasMes >= 300);
function mudarFelicidade(s: Estado, d: number): void {
  for (const f of s.funcionarios) f.felicidade = Math.max(0, Math.min(100, f.felicidade + d));
}

export const EVENTOS: Record<string, DefEvento> = {
  revista: {
    bom: true,
    possivel: (s) => comVendas(s).length > 0,
    aplicar: (s) => {
      const p = escolher(s, comVendas(s));
      p.vendasMes *= 1.5;
      return `📰 Uma revista de tecnologia elogiou «${p.nome}»: as vendas sobem 50%.`;
    },
  },
  investidor: {
    bom: true,
    possivel: (s) => s.dinheiro < 15000,
    aplicar: (s) => {
      s.dinheiro += 6000;
      return `💼 Um investidor-anjo acredita na ${s.nome}: recebes ${euros(6000)}.`;
    },
  },
  premio: {
    bom: true,
    possivel: (s) => s.produtos.length >= 2,
    aplicar: (s) => {
      const v = Math.min(6000, 1500 + 500 * s.produtos.length);
      s.dinheiro += v;
      return `🏅 A ${s.nome} ganhou o prémio de startup do ano: ${euros(v)}.`;
    },
  },
  feira: {
    bom: true,
    possivel: (s) => s.candidatos.length < 5,
    aplicar: (s) => {
      s.candidatos.push(novoCandidato(s), novoCandidato(s));
      return '🎓 Feira de emprego: há dois candidatos novos à tua espera.';
    },
  },
  jantar: {
    bom: true,
    possivel: (s) => s.funcionarios.length >= 2,
    aplicar: (s) => {
      mudarFelicidade(s, 10);
      return '🎉 O jantar de equipa correu lindamente: felicidade +10 para todos.';
    },
  },
  avaria: {
    bom: false,
    possivel: (s) => s.secretarias.length >= 2,
    aplicar: (s) => {
      const v = Math.min(3000, 600 + 150 * s.secretarias.length);
      s.dinheiro -= v;
      return `🔥 Avaria nos servidores: a reparação custou ${euros(v)}.`;
    },
  },
  gripe: {
    bom: false,
    possivel: (s) => s.funcionarios.length >= 1,
    aplicar: (s) => {
      mudarFelicidade(s, -8);
      return '🤧 Uma gripe passou pelo escritório: felicidade −8 para todos.';
    },
  },
  pirataria: {
    bom: false,
    possivel: (s) => comVendas(s).length > 0,
    aplicar: (s) => {
      const p = escolher(s, comVendas(s));
      p.vendasMes *= 0.7;
      return `🏴 «${p.nome}» foi pirateado: as vendas descem 30%.`;
    },
  },
  financas: {
    bom: false,
    possivel: (s) => s.dinheiro > 30000,
    aplicar: (s) => {
      const v = Math.min(6000, Math.round((s.dinheiro * 0.06) / 50) * 50);
      s.dinheiro -= v;
      return `🧾 Inspeção das Finanças: pagaste ${euros(v)} de acertos.`;
    },
  },
};

function eventoAleatorio(s: Estado): void {
  const ids = Object.keys(EVENTOS).filter((id) => EVENTOS[id].possivel(s));
  if (ids.length === 0) return;
  const e = EVENTOS[escolher(s, ids)];
  mensagem(s, e.aplicar(s), e.bom ? 'evento' : 'aviso');
}

// ---------------------------------------------------------------------------
// Conquistas
// ---------------------------------------------------------------------------

export interface Conquista {
  id: string;
  icone: string;
  nome: string;
  descricao: string;
  cumprida: (s: Estado) => boolean;
}

const lancou = (s: Estado, t: TipoSoftware) => s.produtos.some((p) => p.tipo === t);

export const CONQUISTAS: Conquista[] = [
  { id: 'contratar', icone: '🤝', nome: 'Primeira contratação', descricao: 'Contrata o teu primeiro funcionário.',
    cumprida: (s) => s.funcionarios.length >= 1 },
  { id: 'produto', icone: '🚀', nome: 'Olá, mundo!', descricao: 'Lança o primeiro produto.',
    cumprida: (s) => s.produtos.length >= 1 },
  { id: 'equipa5', icone: '👥', nome: 'Startup a sério', descricao: 'Tem 5 funcionários ao mesmo tempo.',
    cumprida: (s) => s.funcionarios.length >= 5 },
  { id: 'equipa10', icone: '🏢', nome: 'Pequena empresa', descricao: 'Tem 10 funcionários ao mesmo tempo.',
    cumprida: (s) => s.funcionarios.length >= 10 },
  { id: 'salas3', icone: '📐', nome: 'Arquiteto', descricao: 'Constrói 3 salas fechadas.',
    cumprida: (s) => detetarSalas(s).total >= 3 },
  { id: 'decorador', icone: '🪴', nome: 'Decorador', descricao: 'Coloca 5 objetos de decoração.',
    cumprida: (s) => s.objetos.length >= 5 },
  { id: 'feliz', icone: '😄', nome: 'Bom ambiente', descricao: 'Tem pelo menos 3 funcionários, todos com felicidade 85 ou mais.',
    cumprida: (s) => s.funcionarios.length >= 3 && s.funcionarios.every((f) => f.felicidade >= 85) },
  { id: 'qualidade90', icone: '💎', nome: 'Obra-prima', descricao: 'Lança um produto com qualidade de 90% ou mais.',
    cumprida: (s) => s.produtos.some((p) => p.qualidade >= 0.9) },
  { id: 'jogo', icone: '🎮', nome: 'Estúdio de jogos', descricao: 'Lança um jogo.',
    cumprida: (s) => lancou(s, 'jogo') },
  { id: 'todos', icone: '🧰', nome: 'Faz-tudo', descricao: 'Lança um produto de cada tipo.',
    cumprida: (s) => LISTA_TIPOS.every((t) => lancou(s, t)) },
  { id: 'mes20k', icone: '💰', nome: 'Mês de ouro', descricao: 'Fatura 20 000 € num só mês.',
    cumprida: (s) => s.historico.some((r) => r.receitas >= 20000) },
  { id: 'cemmil', icone: '🏦', nome: 'Seis dígitos', descricao: 'Junta 100 000 € em caixa.',
    cumprida: (s) => s.dinheiro >= 100000 },
  { id: 'milionario', icone: '👑', nome: 'Milionário', descricao: 'Junta 1 000 000 € em caixa.',
    cumprida: (s) => s.dinheiro >= 1000000 },
  { id: 'ano1', icone: '🎂', nome: 'Sobrevivente', descricao: 'Chega ao fim do primeiro ano.',
    cumprida: (s) => mesDeJogo(s) >= 12 },
  { id: 'ano5', icone: '🏆', nome: 'Veterano', descricao: 'Chega ao fim do quinto ano.',
    cumprida: (s) => mesDeJogo(s) >= 60 },
  { id: 'contrato', icone: '🤝', nome: 'Ao serviço do cliente', descricao: 'Entrega o primeiro contrato de um cliente.',
    cumprida: (s) => s.contratosFeitos >= 1 },
  { id: 'podio', icone: '🥉', nome: 'No pódio', descricao: 'Entra no top 3 do ranking de empresas.',
    cumprida: (s) => posicaoNoRanking(s) <= 3 },
  { id: 'lider', icone: '🥇', nome: 'Número um', descricao: 'Lidera o ranking de empresas.',
    cumprida: (s) => posicaoNoRanking(s) === 1 },
  { id: 'avaliacao1m', icone: '🦄', nome: 'Avaliada em milhões', descricao: 'A empresa vale 1 000 000 € ou mais.',
    cumprida: (s) => avaliarEmpresa(s).total >= 1000000 },
];

/** Desbloqueia as conquistas cumpridas (com uma mensagem cada) e devolve as novas. */
export function verificarConquistas(s: Estado): Conquista[] {
  if (s.falencia) return [];
  const novas = CONQUISTAS.filter((c) => !s.conquistas.includes(c.id) && c.cumprida(s));
  for (const c of novas) {
    s.conquistas.push(c.id);
    mensagem(s, `${c.icone} Conquista desbloqueada: ${c.nome}!`, 'conquista');
    ganharXp(s, XP_CONQUISTA);
  }
  verificarMissoes(s);
  return novas;
}

// ---------------------------------------------------------------------------
// Progressão: experiência, nível da empresa, melhorias, missões e críticas.
// Nada disto usa o gerador aleatório, e as missões só existem com s.comMissoes,
// por isso os testes de equilíbrio dão o mesmo que antes.
// ---------------------------------------------------------------------------

export const NIVEL_MAXIMO = 30;
export const XP_CONQUISTA = 100;

/** Experiência total para chegar ao nível n (começa-se no 1). */
export function xpParaNivel(n: number): number {
  return 120 * (n - 1) * n;
}

export function nivelDaEmpresa(s: Estado): number {
  let n = 1;
  while (n < NIVEL_MAXIMO && s.xp >= xpParaNivel(n + 1)) n++;
  return n;
}

/** Experiência feita dentro do nível atual e a que falta para o seguinte (0/0 no nível máximo). */
export function progressoNivel(s: Estado): { feito: number; precisa: number } {
  const n = nivelDaEmpresa(s);
  if (n >= NIVEL_MAXIMO) return { feito: 0, precisa: 0 };
  return { feito: s.xp - xpParaNivel(n), precisa: xpParaNivel(n + 1) - xpParaNivel(n) };
}

export function ganharXp(s: Estado, xp: number): void {
  if (xp <= 0 || s.falencia) return;
  const antes = nivelDaEmpresa(s);
  s.xp += Math.round(xp);
  for (let n = antes + 1; n <= nivelDaEmpresa(s); n++)
    mensagem(s, `⭐ A ${s.nome} subiu ao nível ${n}! Ganhaste um ponto de melhoria.`, 'nivel');
}

/** Experiência de um lançamento: mais qualidade e tipos mais difíceis dão mais. */
export function xpDeLancamento(tipo: TipoSoftware, qualidade: number): number {
  return Math.round(50 + qualidade * 150 * (1 + LISTA_TIPOS.indexOf(tipo) * 0.3));
}

/** Meses seguidos com lucro, a contar do último fecho. */
export function serieDeLucro(s: Estado): number {
  let n = 0;
  for (let i = s.historico.length - 1; i >= 0 && s.historico[i].receitas > s.historico[i].despesas; i--) n++;
  return n;
}

// --- Melhorias: um ponto por nível ------------------------------------------

export type IdMelhoria = 'marketing' | 'cafe' | 'recrutador' | 'renda' | 'agil' | 'qualidade' | 'premios'
  | 'formacao' | 'fas' | 'investidores';

export interface DefMelhoria {
  icone: string;
  nome: string;
  descricao: string;
  nivel: number; // nível mínimo da empresa
}

export const MELHORIAS: Record<IdMelhoria, DefMelhoria> = {
  marketing: { icone: '📣', nome: 'Marketing digital', descricao: 'Os produtos novos vendem mais 15%.', nivel: 2 },
  cafe: { icone: '☕', nome: 'Café de especialidade', descricao: 'Mais 5 de felicidade para toda a equipa.', nivel: 2 },
  recrutador: { icone: '🧲', nome: 'Recrutador', descricao: 'Aparece mais um candidato todos os meses.', nivel: 3 },
  renda: { icone: '🏷️', nome: 'Renda negociada', descricao: 'A renda baixa de 1 500 € para 900 € por mês.', nivel: 3 },
  agil: { icone: '🔁', nome: 'Metodologia ágil', descricao: 'Equipas grandes perdem só metade do que perdiam a coordenar-se.', nivel: 4 },
  qualidade: { icone: '🧪', nome: 'Testes automáticos', descricao: 'Mais 5 pontos de qualidade em cada lançamento.', nivel: 4 },
  premios: { icone: '🎉', nome: 'Prémios de lançamento', descricao: 'Quem lança um produto ganha 15 de felicidade.', nivel: 5 },
  formacao: { icone: '🎓', nome: 'Formação contínua', descricao: 'Todos melhoram 1 ponto na especialidade, todos os meses.', nivel: 5 },
  fas: { icone: '❤️', nome: 'Fãs leais', descricao: 'As vendas dos produtos caem 40% mais devagar.', nivel: 6 },
  investidores: { icone: '💼', nome: 'Ronda de investimento', descricao: 'Um investidor entra com 25 000 €, de uma vez.', nivel: 6 },
};
export const LISTA_MELHORIAS = Object.keys(MELHORIAS) as IdMelhoria[];

export function temMelhoria(s: Estado, id: IdMelhoria): boolean {
  return s.melhorias.includes(id);
}

/** Um ponto por cada nível acima do primeiro, menos os já gastos. */
export function pontosMelhoria(s: Estado): number {
  return nivelDaEmpresa(s) - 1 - s.melhorias.length;
}

export function bonusQualidade(s: Estado): number {
  return temMelhoria(s, 'qualidade') ? 0.05 : 0;
}

export function comprarMelhoria(s: Estado, id: IdMelhoria): Resultado {
  const m = MELHORIAS[id];
  if (!m) return { ok: false };
  if (temMelhoria(s, id)) return { ok: false, msg: 'Já tens esta melhoria.' };
  if (nivelDaEmpresa(s) < m.nivel) return { ok: false, msg: `Precisa do nível ${m.nivel}.` };
  if (pontosMelhoria(s) < 1) return { ok: false, msg: 'Não tens pontos de melhoria. Sobe de nível para ganhar mais.' };
  s.melhorias.push(id);
  if (id === 'investidores') s.dinheiro += 25000;
  if (id === 'recrutador') s.candidatos.push(novoCandidato(s));
  mensagem(s, `${m.icone} Melhoria nova: ${m.nome}.`, 'desbloqueio');
  verificarMissoes(s);
  return { ok: true };
}

// --- Missões: três de cada vez, com dinheiro e experiência ------------------

export type TipoMissao = 'contratar' | 'sala' | 'lancar' | 'qualidade' | 'faturar' | 'tipo' | 'decorar' | 'caixa'
  | 'feliz' | 'equipa';

export interface Missao {
  id: number;
  tipo: TipoMissao;
  alvo: number;
  software?: TipoSoftware; // só na missão 'tipo'
  desde: number; // minuto em que começou: os lançamentos e os fechos contam a partir daqui
  dinheiro: number; // recompensa
  xp: number;
}

export const MISSOES_ATIVAS = 3;

/** Recompensas (afinadas com o simtest ligado às missões: o jogo fica mais generoso, mas mantém o vale). */
export const RECOMPENSAS = { dinheiroBase: -2000, dinheiroPorNivel: 1000, xpBase: 80, xpPorNivel: 20 };

export const TEXTO_MISSAO: Record<TipoMissao, { icone: string; texto: (m: Missao) => string }> = {
  contratar: { icone: '🤝', texto: (m) => `Tem ${m.alvo} funcionários` },
  sala: { icone: '📐', texto: (m) => (m.alvo === 1 ? 'Constrói uma sala fechada' : `Tem ${m.alvo} salas fechadas`) },
  lancar: { icone: '🚀', texto: (m) => (m.alvo === 1 ? 'Lança um produto' : `Lança ${m.alvo} produtos`) },
  qualidade: { icone: '💎', texto: (m) => `Lança um produto com qualidade de ${m.alvo}% ou mais` },
  faturar: { icone: '💰', texto: (m) => `Fatura ${euros(m.alvo)} num só mês` },
  tipo: { icone: '🧰', texto: (m) => `Lança um ${TIPOS[m.software ?? 'utilitario'].nome.toLowerCase()}` },
  decorar: { icone: '🪴', texto: (m) => `Tem ${m.alvo} objetos de decoração` },
  caixa: { icone: '🏦', texto: (m) => `Junta ${euros(m.alvo)} em caixa` },
  feliz: { icone: '😄', texto: (m) => `Felicidade média de ${m.alvo} (3 pessoas ou mais)` },
  equipa: { icone: '👥', texto: (m) => `Põe ${m.alvo} pessoas no mesmo projeto` },
};

export function descricaoMissao(m: Missao): string {
  return TEXTO_MISSAO[m.tipo].texto(m);
}

// As três primeiras ensinam o jogo; depois vão rodando.
const ORDEM_MISSOES: TipoMissao[] = ['contratar', 'sala', 'lancar', 'qualidade', 'faturar', 'tipo', 'decorar',
  'caixa', 'feliz', 'equipa'];

/** Arredonda para cima, com 2 algarismos significativos (12 345 → 13 000). */
function redondo(v: number): number {
  const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, v))) - 1);
  return Math.ceil(v / p) * p;
}

const lancadosDesde = (s: Estado, m: Missao) => s.produtos.filter((p) => p.lancadoEm >= m.desde);

/** Onde está a missão: o valor atual e o alvo. */
export function progressoMissao(s: Estado, m: Missao): { atual: number; alvo: number } {
  let atual = 0;
  switch (m.tipo) {
    case 'contratar': atual = s.funcionarios.length; break;
    case 'sala': atual = detetarSalas(s).total; break;
    case 'lancar': atual = lancadosDesde(s, m).length; break;
    case 'qualidade': atual = Math.round(Math.max(0, ...lancadosDesde(s, m).map((p) => p.qualidade)) * 100); break;
    case 'faturar': atual = Math.max(0, ...s.historico
      .filter((r) => (r.mes + 1) * MIN_POR_MES > m.desde).map((r) => Math.round(r.receitas))); break;
    case 'tipo': atual = lancadosDesde(s, m).filter((p) => p.tipo === m.software).length; break;
    case 'decorar': atual = s.objetos.length; break;
    case 'caixa': atual = Math.round(s.dinheiro); break;
    case 'feliz': atual = s.funcionarios.length >= 3
      ? Math.round(s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length) : 0; break;
    case 'equipa': atual = Math.max(0, ...s.projetos.map((p) => membrosDe(s, p.id).length)); break;
  }
  return { atual: Math.max(0, atual), alvo: m.alvo };
}

/** O alvo de uma missão deste tipo agora (null se não faz sentido neste momento). */
function alvoMissao(s: Estado, tipo: TipoMissao, nivel: number): { alvo: number; software?: TipoSoftware } | null {
  const n = s.funcionarios.length;
  switch (tipo) {
    case 'contratar': return n >= 40 ? null : { alvo: n === 0 ? 2 : n + 1 + Math.floor(nivel / 4) };
    case 'sala': { const salas = detetarSalas(s).total; return salas >= 8 ? null : { alvo: salas + 1 }; }
    case 'lancar': return { alvo: 1 + Math.floor(nivel / 5) };
    case 'qualidade': return n === 0 ? null : { alvo: Math.min(95, 60 + 5 * Math.floor(nivel / 2)) };
    case 'faturar': {
      if (s.produtos.length === 0) return null;
      const melhor = Math.max(0, ...s.historico.map((r) => r.receitas));
      return { alvo: redondo(Math.max(3000, melhor * 1.25)) };
    }
    case 'tipo': {
      const tipos = LISTA_TIPOS.filter((t) => tipoDisponivel(s, t));
      if (n === 0 || tipos.length < 2) return null;
      const conta = (t: TipoSoftware) => s.produtos.filter((p) => p.tipo === t).length;
      const software = tipos.reduce((a, b) => (conta(b) < conta(a) ? b : a));
      return { alvo: 1, software };
    }
    case 'decorar': return s.objetos.length >= 30 ? null : { alvo: s.objetos.length + 2 + Math.floor(nivel / 3) };
    case 'caixa': return { alvo: redondo(Math.max(20000, s.dinheiro * 1.6)) };
    case 'feliz': return n < 3 ? null : { alvo: Math.min(95, 80 + nivel) };
    case 'equipa': {
      const alvo = Math.min(n, 3 + Math.floor(nivel / 3));
      const atual = Math.max(0, ...s.projetos.map((p) => membrosDe(s, p.id).length));
      return n < 3 || alvo <= atual ? null : { alvo };
    }
  }
}

/** A próxima missão da rotação que faça sentido e ainda não esteja ativa nem cumprida. */
function novaMissao(s: Estado): Missao | null {
  const nivel = nivelDaEmpresa(s);
  for (let k = 0; k < ORDEM_MISSOES.length; k++) {
    const tipo = ORDEM_MISSOES[(s.proximaMissao + k) % ORDEM_MISSOES.length];
    if (s.missoes.some((m) => m.tipo === tipo)) continue;
    const a = alvoMissao(s, tipo, nivel);
    if (!a) continue;
    const m: Missao = {
      id: s.proximaMissao + k, tipo, alvo: a.alvo, desde: s.minuto,
      dinheiro: Math.max(0, redondo(RECOMPENSAS.dinheiroBase + RECOMPENSAS.dinheiroPorNivel * (nivel - 1))),
      xp: RECOMPENSAS.xpBase + RECOMPENSAS.xpPorNivel * nivel,
    };
    if (a.software) m.software = a.software;
    const p = progressoMissao(s, m);
    if (p.atual >= p.alvo) continue;
    s.proximaMissao += k + 1;
    m.id = s.proximaMissao;
    return m;
  }
  return null;
}

/** Enche a lista até haver três missões (quando há missões que façam sentido). */
function completarMissoes(s: Estado): void {
  if (!s.comMissoes) return;
  while (s.missoes.length < MISSOES_ATIVAS) {
    const m = novaMissao(s);
    if (!m) return;
    s.missoes.push(m);
  }
}

/** Paga as missões cumpridas e põe outras no lugar. */
export function verificarMissoes(s: Estado): Missao[] {
  if (!s.comMissoes || s.falencia) return [];
  const feitas = s.missoes.filter((m) => { const p = progressoMissao(s, m); return p.atual >= p.alvo; });
  for (const m of feitas) {
    s.missoes = s.missoes.filter((o) => o !== m);
    s.missoesFeitas++;
    s.dinheiro += m.dinheiro;
    mensagem(s, `🎯 Missão cumprida: ${descricaoMissao(m)}! ${m.dinheiro ? `+${euros(m.dinheiro)} e ` : ''}+${m.xp} XP.`, 'missao');
    ganharXp(s, m.xp);
  }
  completarMissoes(s);
  return feitas;
}

// --- Críticas: notas de 1 a 10 à volta da qualidade, sem o aleatório do jogo ---

export const CRITICOS = ['Bits & Bytes', 'Revista PC', 'TecnoBlog', 'Pixel Diário'];

function hashTexto(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193);
  // Mistura final (fmix32 do murmur3): textos quase iguais dão valores bem diferentes.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function criticasPara(nome: string, qualidade: number, minuto: number): number[] {
  return CRITICOS.map((_, i) => {
    const nota = qualidade * 10 + (hashTexto(`${nome}|${minuto}|${i}`) - 0.5) * 2.6;
    return Math.max(1, Math.min(10, Math.round(nota)));
  });
}

/** Frase do veredicto para uma nota média. */
export function veredicto(media: number): string {
  return media >= 9 ? 'Obra-prima!' : media >= 7.5 ? 'Grande sucesso' : media >= 6 ? 'Bem recebido'
    : media >= 4 ? 'Morno' : 'Um fracasso';
}

// ---------------------------------------------------------------------------
// Avaliação da empresa, concorrentes e ranking. Nada disto usa o gerador aleatório
// (os concorrentes vêm de hashes da sementeMundo), por isso o equilíbrio não muda.
// ---------------------------------------------------------------------------

export const AVALIACAO = {
  mesesFuturos: 24, // meses de vendas futuras que contam
  desconto: 0.97, // cada mês futuro vale 3% menos do que o anterior
  porPessoa: 14000, // uma pessoa com competência média 1 e felicidade 100
  porNivel: 3000,
  porConquista: 1500,
  porSucesso: 2500, // por produto com média das críticas de 7,5 ou mais
  ativos: 0.6, // secretárias e decoração valem 60% do que custaram
  projetos: 0.5, // um projeto vale metade das vendas futuras previstas × a parte já feita
};

export interface Avaliacao {
  caixa: number;
  produtos: number; // vendas futuras dos produtos à venda
  projetos: number; // projetos e contratos em curso
  equipa: number;
  marca: number; // nível, conquistas e sucessos de crítica
  ativos: number; // escritório
  total: number;
}

function quedaEfetiva(s: Estado, tipo: TipoSoftware): number {
  const q = TIPOS[tipo].queda;
  return temMelhoria(s, 'fas') ? q + (1 - q) * 0.4 : q;
}

/** Soma descontada das vendas dos próximos meses de um produto que vende `vendasMes` agora. */
export function vendasFuturas(vendasMes: number, queda: number): number {
  let total = 0, v = vendasMes, d = 1;
  for (let m = 0; m < AVALIACAO.mesesFuturos; m++) {
    total += v * d;
    v *= queda;
    d *= AVALIACAO.desconto;
  }
  return total;
}

export function avaliarEmpresa(s: Estado): Avaliacao {
  const produtos = s.produtos.reduce((t, p) => t + vendasFuturas(p.vendasMes, quedaEfetiva(s, p.tipo)), 0);
  const projetos = s.projetos.reduce((t, p) => {
    const feito = Math.min(1, p.trabalhoFeito / p.trabalhoTotal);
    if (p.contrato) return t + feito * p.contrato.pagamento;
    const q = Math.max(0.4, Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s)));
    const vendas = vendasIniciais(p.tipo, p.funcionalidades, q, fatorMercado(s, p.tipo)) * (1 + (p.hype ?? 0));
    return t + feito * AVALIACAO.projetos * vendasFuturas(vendas, quedaEfetiva(s, p.tipo));
  }, 0);
  const equipa = s.funcionarios.reduce((t, f) =>
    t + competenciaMedia(f.competencias) * AVALIACAO.porPessoa * (0.6 + 0.4 * f.felicidade / 100), 0);
  const sucessos = s.produtos.filter((p) => p.criticas && p.criticas.reduce((a, b) => a + b, 0) / p.criticas.length >= 7.5).length;
  const marca = (nivelDaEmpresa(s) - 1) * AVALIACAO.porNivel + s.conquistas.length * AVALIACAO.porConquista
    + sucessos * AVALIACAO.porSucesso;
  const ativos = AVALIACAO.ativos * (s.secretarias.length * ECON.custoSecretaria
    + s.objetos.reduce((t, o) => t + OBJETOS[o.tipo].custo, 0));
  const r = (v: number) => Math.round(v / 100) * 100;
  const a = { caixa: r(s.dinheiro), produtos: r(produtos), projetos: r(projetos), equipa: r(equipa), marca: r(marca), ativos: r(ativos) };
  return { ...a, total: Math.max(0, a.caixa + a.produtos + a.projetos + a.equipa + a.marca + a.ativos) };
}

export interface Rival {
  id: number;
  nome: string;
  tipo: TipoSoftware; // em que é especialista
  valor: number;
  tendencia: number; // crescimento médio por mês
  produtos: number; // lançados desde o início do jogo
  historico: number[]; // avaliação nos últimos fechos de mês
}

export const HISTORICO_RIVAL = 24;
const NOMES_RIVAIS = ['ByteNorte', 'Lusitânia Soft', 'Atlântico Apps', 'Cortiça Labs', 'Galo Interactive',
  'Bacalhau Bits', 'Tejo Systems', 'Pastel de Código', 'Serra Digital', 'Azulejo Studios'];
const VALORES_RIVAIS = [45000, 120000, 280000, 650000, 1500000, 3400000];
const PREFIXOS = ['Nuvem', 'Turbo', 'Pixel', 'Quantum', 'Zen', 'Hiper', 'Ultra', 'Nova'];
const SUFIXOS: Record<TipoSoftware, string[]> = {
  utilitario: ['Calc', 'Sync', 'Limpa', 'Zip'],
  editor: ['Notas', 'Escreve', 'Docs', 'Pad'],
  antivirus: ['Guarda', 'Escudo', 'Seguro', 'Cofre'],
  jogo: ['Quest', 'Corrida', 'Lendas', 'Saga'],
};

const h = (texto: string) => hashTexto(texto);

function criarRivais(semente: number): Rival[] {
  const nomes = [...NOMES_RIVAIS].sort((a, b) => h(`${semente}|nome|${a}`) - h(`${semente}|nome|${b}`));
  return VALORES_RIVAIS.map((v, i) => {
    const x = h(`${semente}|rival|${i}`);
    return {
      id: i + 1,
      nome: nomes[i],
      tipo: LISTA_TIPOS[Math.floor(h(`${semente}|tipo|${i}`) * LISTA_TIPOS.length)],
      valor: Math.round((v * (0.85 + 0.3 * x)) / 1000) * 1000,
      tendencia: (0.034 - 0.004 * i) * (0.6 + 0.8 * h(`${semente}|tendencia|${i}`)), // as pequenas crescem mais depressa
      produtos: 0,
      historico: [],
    };
  });
}

/** Um mês na vida de um concorrente. Devolve o que aconteceu, para as notícias. */
function passoDoRival(r: Rival, semente: number, mes: number): { lancou?: string; crise?: boolean } {
  const base = `${semente}|${r.id}|${mes}`;
  const x = h(base + '|var');
  let variacao = r.tendencia + (x - 0.5) * 0.1;
  const out: { lancou?: string; crise?: boolean } = {};
  if (h(base + '|lanca') < 0.12) {
    variacao += 0.04 + 0.08 * h(base + '|sucesso');
    r.produtos++;
    const pre = PREFIXOS[Math.floor(h(base + '|pre') * PREFIXOS.length)];
    const suf = SUFIXOS[r.tipo][Math.floor(h(base + '|suf') * 4)];
    out.lancou = `${pre}${suf}${r.produtos > 1 ? ` ${r.produtos}` : ''}`;
  } else if (x < 0.04) {
    variacao -= 0.15;
    out.crise = true;
  }
  r.valor = Math.max(5000, Math.round((r.valor * (1 + variacao)) / 100) * 100);
  r.historico.push(r.valor);
  if (r.historico.length > HISTORICO_RIVAL) r.historico.shift();
  return out;
}

function atualizarRivais(s: Estado): void {
  const mes = mesDeJogo(s);
  for (const r of s.rivais) {
    const o = passoDoRival(r, s.sementeMundo, mes);
    if (o.lancou) mensagem(s, `📣 A ${r.nome} lançou «${o.lancou}», um ${TIPOS[r.tipo].nome.toLowerCase()} novo.`, 'rival');
    else if (o.crise) mensagem(s, `📉 A ${r.nome} anunciou despedimentos: a avaliação caiu.`, 'rival');
  }
}

export interface LugarRanking {
  nome: string;
  valor: number;
  variacao: number; // em relação ao fecho anterior (0,05 = +5%)
  jogador: boolean;
  tipo: TipoSoftware | null;
  historico: number[];
}

export function rankingEmpresas(s: Estado): LugarRanking[] {
  const valor = avaliarEmpresa(s).total;
  const hist = s.historico.filter((r) => r.valor !== undefined).map((r) => r.valor!).slice(-HISTORICO_RIVAL);
  const antes = hist.length ? hist[hist.length - 1] : valor;
  const lista: LugarRanking[] = s.rivais.map((r) => {
    const a = r.historico.length > 1 ? r.historico[r.historico.length - 2] : r.valor;
    return { nome: r.nome, valor: r.valor, variacao: a ? r.valor / a - 1 : 0, jogador: false, tipo: r.tipo, historico: r.historico };
  });
  lista.push({ nome: s.nome, valor, variacao: antes ? valor / antes - 1 : 0, jogador: true, tipo: null, historico: hist });
  return lista.sort((a, b) => b.valor - a.valor || (a.jogador ? -1 : 1));
}

export function posicaoNoRanking(s: Estado): number {
  return rankingEmpresas(s).findIndex((l) => l.jogador) + 1;
}

// ---------------------------------------------------------------------------
// Investidores: vende-se uma parte da empresa por dinheiro já; em troca, eles ficam
// com essa parte do lucro de cada mês (dividendos).
// ---------------------------------------------------------------------------

export type IdRonda = 'semente' | 'serieA' | 'serieB';

export interface DefRonda {
  nome: string;
  descricao: string;
  nivel: number;
  avaliacaoMinima: number;
  parte: number; // da empresa (0–1)
}

export const RONDAS: Record<IdRonda, DefRonda> = {
  semente: { nome: 'Ronda semente', descricao: 'Business angels apostam numa empresa jovem.', nivel: 3, avaliacaoMinima: 60000, parte: 0.1 },
  serieA: { nome: 'Série A', descricao: 'Um fundo de capital de risco entra para acelerar o crescimento.', nivel: 8, avaliacaoMinima: 300000, parte: 0.15 },
  serieB: { nome: 'Série B', descricao: 'Investidores internacionais para conquistar o mercado.', nivel: 14, avaliacaoMinima: 1500000, parte: 0.2 },
};
export const LISTA_RONDAS = Object.keys(RONDAS) as IdRonda[];
export const DESCONTO_RONDA = 0.8; // os investidores pagam 80% do que a parte vale

export function valorDaRonda(s: Estado, id: IdRonda): number {
  return Math.round((RONDAS[id].parte * avaliarEmpresa(s).total * DESCONTO_RONDA) / 500) * 500;
}

/** Se a ronda pode ser feita agora (ok) ou porquê não (msg). */
export function podeLevantar(s: Estado, id: IdRonda): Resultado {
  const d = RONDAS[id];
  if (!d) return { ok: false, msg: 'Ronda desconhecida.' };
  if (s.rondas.includes(id)) return { ok: false, msg: 'Esta ronda já foi feita.' };
  const i = LISTA_RONDAS.indexOf(id);
  if (i > 0 && !s.rondas.includes(LISTA_RONDAS[i - 1])) return { ok: false, msg: `Primeiro a ${RONDAS[LISTA_RONDAS[i - 1]].nome}.` };
  if (nivelDaEmpresa(s) < d.nivel) return { ok: false, msg: `Precisa do nível ${d.nivel}.` };
  if (avaliarEmpresa(s).total < d.avaliacaoMinima) return { ok: false, msg: `A empresa tem de valer ${euros(d.avaliacaoMinima)}.` };
  return { ok: true };
}

export function levantarRonda(s: Estado, id: IdRonda): Resultado {
  const r = podeLevantar(s, id);
  if (!r.ok) return r;
  const valor = valorDaRonda(s, id);
  s.dinheiro += valor;
  s.participacao = 1 - (1 - s.participacao) * (1 - RONDAS[id].parte);
  s.rondas.push(id);
  mensagem(s, `💼 ${RONDAS[id].nome}: os investidores pagaram ${euros(valor)} por ${Math.round(RONDAS[id].parte * 100)}% da empresa.`, 'investimento');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Campanhas de marketing: durante o desenvolvimento, gastar dinheiro para criar expectativa
// (hype). Cada campanha soma menos quando já há muita expectativa.
// ---------------------------------------------------------------------------

export type IdCampanha = 'redes' | 'imprensa' | 'feira';

export interface DefCampanha {
  nome: string;
  icone: string;
  descricao: string;
  custo: number;
  hype: number;
  nivel: number;
}

export const CAMPANHAS: Record<IdCampanha, DefCampanha> = {
  redes: { nome: 'Redes sociais', icone: '📱', descricao: 'Anúncios e influenciadores.', custo: 1500, hype: 0.12, nivel: 1 },
  imprensa: { nome: 'Imprensa', icone: '📰', descricao: 'Artigos e entrevistas nas revistas de tecnologia.', custo: 4000, hype: 0.3, nivel: 3 },
  feira: { nome: 'Feira de tecnologia', icone: '🎪', descricao: 'Um stand na maior feira do país.', custo: 9000, hype: 0.6, nivel: 6 },
};
export const LISTA_CAMPANHAS = Object.keys(CAMPANHAS) as IdCampanha[];
export const HYPE_MAXIMO = 1;

/** Hype depois desta campanha (sobe menos quando já há muito). */
export function hypeComCampanha(hype: number, id: IdCampanha): number {
  return Math.min(HYPE_MAXIMO, hype + CAMPANHAS[id].hype * (1 - hype / HYPE_MAXIMO));
}

export function lancarCampanha(s: Estado, projetoId: number, id: IdCampanha): Resultado {
  const p = s.projetos.find((o) => o.id === projetoId);
  const d = CAMPANHAS[id];
  if (!p || !d) return { ok: false };
  if (p.contrato) return { ok: false, msg: 'Os contratos de clientes não precisam de marketing.' };
  if (p.campanhas?.includes(id)) return { ok: false, msg: 'Essa campanha já foi feita para este projeto.' };
  if (nivelDaEmpresa(s) < d.nivel) return { ok: false, msg: `Precisa do nível ${d.nivel}.` };
  if (s.dinheiro < d.custo) return { ok: false, msg: `Precisas de ${euros(d.custo)}.` };
  s.dinheiro -= d.custo;
  p.hype = hypeComCampanha(p.hype ?? 0, id);
  (p.campanhas ??= []).push(id);
  mensagem(s, `${d.icone} Campanha «${d.nome}» para «${p.nome}»: expectativa +${Math.round(p.hype * 100)}% nas vendas do lançamento.`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Contratos de clientes: trabalho por encomenda, com prazo. Pagam no fim (menos se
// atrasado) e não viram produto. Três ofertas novas por mês, decididas por hash.
// ---------------------------------------------------------------------------

export interface OfertaContrato {
  id: number;
  cliente: string;
  encomenda: string;
  tipo: TipoSoftware; // perfil de trabalho por áreas
  trabalho: number;
  pagamento: number;
  prazoDias: number;
}

export interface ContratoAtivo {
  cliente: string;
  pagamento: number; // com qualidade 100% e dentro do prazo
  prazo: number; // minuto de jogo
  atrasado?: boolean;
}

export const CONTRATOS = {
  ofertas: 3,
  multaAtraso: 0.6, // atrasado, o cliente paga 60%
  pontosPorDia: 13000 / DIAS_POR_MES, // o que 2 pessoas médias fazem (para o prazo)
  folgaPrazo: 1.6,
};

const CLIENTES = ['Câmara Municipal de Braga', 'Pastelaria Aurora', 'Clínica Sorriso', 'Banco do Minho',
  'Escola Secundária do Lumiar', 'Hotel Ribeira', 'Clube Desportivo da Amadora', 'Farmácia Central',
  'Transportes do Tejo', 'Quinta dos Vinhos do Douro', 'Livraria Bertrand de Bairro', 'Ginásio Atlas'];
const ENCOMENDAS: { nome: string; tipo: TipoSoftware; trabalho: number }[] = [
  { nome: 'Site institucional', tipo: 'editor', trabalho: 9000 },
  { nome: 'Aplicação de reservas', tipo: 'utilitario', trabalho: 14000 },
  { nome: 'Sistema de faturação', tipo: 'utilitario', trabalho: 22000 },
  { nome: 'Auditoria de segurança', tipo: 'antivirus', trabalho: 12000 },
  { nome: 'Jogo promocional', tipo: 'jogo', trabalho: 18000 },
  { nome: 'Loja online', tipo: 'editor', trabalho: 16000 },
  { nome: 'Migração de dados', tipo: 'utilitario', trabalho: 8000 },
];

function gerarOfertas(s: Estado): void {
  const mes = mesDeJogo(s);
  const escala = 1 + Math.min(mes, 36) * 0.04;
  s.ofertas = [];
  for (let i = 0; i < CONTRATOS.ofertas; i++) {
    const base = `${s.sementeMundo}|oferta|${mes}|${i}`;
    const e = ENCOMENDAS[Math.floor(h(base + '|enc') * ENCOMENDAS.length)];
    const trabalho = Math.round((e.trabalho * escala * (0.85 + 0.3 * h(base + '|trab'))) / 500) * 500;
    s.ofertas.push({
      id: mes * 10 + i + 1,
      cliente: CLIENTES[Math.floor(h(base + '|cli') * CLIENTES.length)],
      encomenda: e.nome,
      tipo: e.tipo,
      trabalho,
      pagamento: Math.round((trabalho * (0.8 + 0.35 * h(base + '|pag'))) / 100) * 100,
      prazoDias: Math.max(15, Math.ceil((trabalho / CONTRATOS.pontosPorDia) * CONTRATOS.folgaPrazo / 5) * 5),
    });
  }
}

export function aceitarContrato(s: Estado, ofertaId: number, equipa: number[]): Resultado {
  const o = s.ofertas.find((x) => x.id === ofertaId);
  if (!o) return { ok: false, msg: 'Esta oferta já não está disponível.' };
  if (equipa.length === 0) return { ok: false, msg: 'Escolhe pelo menos uma pessoa para a equipa.' };
  if (equipa.some((id) => !s.funcionarios.some((f) => f.id === id))) return { ok: false, msg: 'Funcionário desconhecido.' };
  const id = s.proximoId++;
  s.projetos.push({
    id,
    nome: `${o.encomenda} · ${o.cliente}`,
    tipo: o.tipo,
    funcionalidades: [],
    trabalhoFeito: 0,
    trabalhoTotal: o.trabalho,
    feito: { programacao: 0, design: 0, testes: 0 },
    somaQualidade: { programacao: 0, design: 0, testes: 0 },
    contrato: { cliente: o.cliente, pagamento: o.pagamento, prazo: s.minuto + o.prazoDias * MIN_POR_DIA },
  });
  s.ofertas = s.ofertas.filter((x) => x !== o);
  for (const fid of equipa) definirEquipa(s, fid, id);
  mensagem(s, `📝 Contrato assinado com ${o.cliente}: ${o.encomenda.toLowerCase()} em ${o.prazoDias} dias, por ${euros(o.pagamento)}.`, 'contrato');
  return { ok: true };
}

/** Quanto o cliente paga, dada a qualidade (0–1) e o atraso. */
export function pagamentoDoContrato(c: ContratoAtivo, qualidade: number): number {
  return Math.round((c.pagamento * (0.7 + 0.3 * qualidade) * (c.atrasado ? CONTRATOS.multaAtraso : 1)) / 10) * 10;
}

function entregarContrato(s: Estado, p: Projeto): void {
  const c = p.contrato!;
  const qualidade = Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s));
  const pago = pagamentoDoContrato(c, qualidade);
  s.dinheiro += pago;
  s.extraMes += pago;
  s.contratosFeitos++;
  s.projetos = s.projetos.filter((o) => o !== p);
  for (const f of membrosDe(s, p.id)) f.projetoId = null;
  mensagem(s, `✅ Entregaste «${p.nome}»${c.atrasado ? ' com atraso' : ' a tempo'} (qualidade ${Math.round(qualidade * 100)}%): `
    + `${c.cliente} pagou ${euros(pago)}. A equipa está livre.`, 'contrato');
  ganharXp(s, 30 + Math.round(qualidade * 30));
  verificarConquistas(s);
}
