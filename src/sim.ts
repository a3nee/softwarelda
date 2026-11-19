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
  tecnologia?: IdTecnologia; // só se pode escolher depois de investigar esta tecnologia
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
      { id: 'relatorios', nome: 'Relatórios e gráficos', trabalho: 7000, valor: 0.3, requer: ['grafica'], tecnologia: 'dados' },
      { id: 'sincronizacao', nome: 'Sincronização na cloud', trabalho: 9000, valor: 0.4, requer: [], tecnologia: 'cloud' },
      { id: 'appmovel', nome: 'Versão para telemóvel', trabalho: 10000, valor: 0.45, requer: ['grafica'], tecnologia: 'mobile' },
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
      { id: 'publicarweb', nome: 'Publicação na web', trabalho: 7000, valor: 0.3, requer: [], tecnologia: 'internet' },
      { id: 'appmovel', nome: 'Edição no telemóvel', trabalho: 12000, valor: 0.4, requer: [], tecnologia: 'mobile' },
      { id: 'assistenteia', nome: 'Assistente de escrita com IA', trabalho: 16000, valor: 0.6, requer: ['corretor'], tecnologia: 'ia' },
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
      { id: 'cifra', nome: 'Cifragem de ficheiros', trabalho: 9000, valor: 0.3, requer: [], tecnologia: 'seguranca' },
      { id: 'cofre', nome: 'Cofre de palavras-passe', trabalho: 8000, valor: 0.35, requer: ['cifra'], tecnologia: 'criptografia' },
      { id: 'analisecloud', nome: 'Análise na cloud', trabalho: 10000, valor: 0.4, requer: ['temporeal'], tecnologia: 'cloud' },
      { id: 'detecaoia', nome: 'Deteção de ameaças com IA', trabalho: 14000, valor: 0.55, requer: ['temporeal'], tecnologia: 'ia' },
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
      { id: 'mundoaberto', nome: 'Mundo aberto', trabalho: 22000, valor: 0.5, requer: ['graficos3d'], tecnologia: 'motor3d' },
      { id: 'fisica', nome: 'Física realista', trabalho: 12000, valor: 0.3, requer: ['graficos3d'], tecnologia: 'fisica' },
      { id: 'jogomovel', nome: 'Versão para telemóvel', trabalho: 14000, valor: 0.4, requer: [], tecnologia: 'mobile' },
      { id: 'mmo', nome: 'Mundo persistente online', trabalho: 26000, valor: 0.6, requer: ['multijogador'], tecnologia: 'servidores' },
      { id: 'rv', nome: 'Modo realidade virtual', trabalho: 24000, valor: 0.65, requer: ['graficos3d'], tecnologia: 'rv' },
      { id: 'npcia', nome: 'Personagens com IA', trabalho: 16000, valor: 0.5, requer: ['historia'], tecnologia: 'ia' },
      { id: 'mundosgerados', nome: 'Mundos gerados por IA', trabalho: 18000, valor: 0.55, requer: [], tecnologia: 'iagenerativa' },
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

/** Uma funcionalidade está disponível se não precisar de tecnologia ou se esta já foi investigada. */
export function funcionalidadeDisponivel(s: Estado, tipo: TipoSoftware, id: string): boolean {
  const t = funcionalidade(tipo, id)?.tecnologia;
  return !t || temTecnologia(s, t);
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
  baixaAte?: number; // de baixa (fica em casa) até este minuto de jogo
  tracos?: IdTraco[]; // personalidade (saves antigos: nenhum)
  formacao?: { area: Area; ate: number }; // num curso (fica fora do escritório) até este minuto
}

export interface Candidato {
  nome: string;
  competencias: Competencias;
  salario: number;
  tracos?: IdTraco[];
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
  manutencao?: number; // patch: índice em s.produtos do produto cujos bugs se estão a corrigir
  sequela?: { de: number; versao: number }; // nova versão do produto s.produtos[de]
  crunch?: boolean; // horas extra: trabalha-se mais depressa, mas cansa e cria bugs
  crunchFeito?: number; // pontos de trabalho feitos em horas extra
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
  bugs?: number; // bugs por corrigir (os saves antigos não os têm: 0)
  ritmoBugs?: number; // bugs novos que os utilizadores vão encontrar no próximo mês (desce todos os meses)
  avisoBugs?: boolean; // já se avisou que tem bugs a mais
  serie?: string; // nome da série (o do produto original); só as sequelas o têm
  versao?: number; // 2, 3… nas sequelas
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
  escritorio?: number; // começa num escritório pequeno (índice em ESCRITORIOS); sem valor: o terreno todo
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
  tecnologias: IdTecnologia[]; // já investigadas
  pesquisaAtual: IdTecnologia | null; // em investigação
  pesquisaProgresso: number; // pontos já investidos na pesquisaAtual
  pesquisaReserva: number; // pontos de investigação ainda por gastar
  // Campos opcionais (saves antigos não os têm; os valores por omissão estão nas funções):
  relacoes?: Relacao[]; // amizades e conflitos entre colegas
  escritorio?: number; // índice em ESCRITORIOS (sem valor: o terreno todo)
  subsidiarias?: Subsidiaria[]; // concorrentes comprados
  bolsa?: { acoes: number; historico: number[] }; // depois da entrada em bolsa
  feiras?: Record<string, number>; // id da feira → último ano em que se foi
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
    tecnologias: [],
    pesquisaAtual: null,
    pesquisaProgresso: 0,
    pesquisaReserva: 0,
    ...(opcoes.escritorio !== undefined ? { escritorio: opcoes.escritorio } : {}),
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
  const nome = `${escolher(s, NOMES)} ${escolher(s, APELIDOS)}`;
  return { nome, competencias, salario, tracos: sortearTracos(s, nome) };
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
  if (!dentroDoEscritorio(s, x, z)) return { ok: false, msg: FORA_DO_ESCRITORIO };
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
  if (!dentroDoEscritorio(s, x, z)) return { ok: false, msg: FORA_DO_ESCRITORIO };
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
  const pessoal = felicidadePessoal(s, f);
  if (!d) return Math.max(0, Math.min(100, 40 + pessoal));
  const cafe = temMelhoria(s, 'cafe') ? 5 : 0;
  return Math.max(0, Math.min(100, 75 + cafe + pessoal + (s.objetos.length ? bonusDecoracao(s, d.x, d.z, salas) : 0)));
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
  const todas = arestas.filter((a) => arestaValida(s, a) && lerAresta(s, a) === NADA);
  const novas = todas.filter((a) => arestaNoEscritorio(s, a));
  if (novas.length === 0)
    return todas.length ? { ok: false, msg: 'Isso fica fora do teu escritório. Muda-te para um maior.' } : { ok: false };
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
    ...(c.tracos?.length ? { tracos: [...c.tracos] } : {}),
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
  const base = temMelhoria(s, 'renda') ? 900 : ECON.rendaMensal;
  const extra = rendaExtraEscritorio(s);
  return extra ? Math.max(200, base + extra) : base;
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
  sequelaDe: number | null = null, // índice em s.produtos do produto de que esta é uma nova versão
): Resultado {
  const def = TIPOS[tipo];
  if (!def) return { ok: false, msg: 'Tipo de software desconhecido.' };
  if (!tipoDisponivel(s, tipo)) {
    const n = def.produtosNecessarios;
    return { ok: false, msg: `Para fazer um ${def.nome.toLowerCase()} precisas de ${n} produto${n === 1 ? '' : 's'} lançado${n === 1 ? '' : 's'}.` };
  }
  const v = validarFuncionalidades(tipo, funcionalidades);
  if (!v.ok) return v;
  const bloqueada = funcionalidades.find((f) => !funcionalidadeDisponivel(s, tipo, f));
  if (bloqueada) {
    const f = funcionalidade(tipo, bloqueada)!;
    return { ok: false, msg: `«${f.nome}» precisa da tecnologia «${TECNOLOGIAS[f.tecnologia!].nome}» (separador Investigação).` };
  }
  if (equipa.some((id) => !s.funcionarios.some((f) => f.id === id)))
    return { ok: false, msg: 'Funcionário desconhecido.' };
  let sequela: Projeto['sequela'];
  let hype = 0;
  if (sequelaDe !== null) {
    const o = s.produtos[sequelaDe];
    if (!o) return { ok: false, msg: 'Produto original desconhecido.' };
    if (o.tipo !== tipo) return { ok: false, msg: 'Uma nova versão tem de ser do mesmo tipo do original.' };
    if (!podeTerSequela(s, sequelaDe)) return { ok: false, msg: `Já há uma versão mais recente de «${o.nome}» (ou uma em desenvolvimento).` };
    sequela = { de: sequelaDe, versao: (o.versao ?? 1) + 1 };
    hype = bonusSequela(s, sequelaDe);
  }
  const doTipo = s.produtos.filter((p) => p.tipo === tipo).length + s.projetos.filter((p) => p.tipo === tipo).length;
  const limpo = nome.trim() || (sequelaDe !== null ? nomeSequela(s, sequelaDe) : `${def.nome} ${doTipo + 1}`);
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
    ...(sequela ? { sequela, hype } : {}),
  });
  for (const fid of equipa) definirEquipa(s, fid, id);
  const n = equipa.length;
  mensagem(s, `Começou o desenvolvimento de «${limpo}» (${def.nome.toLowerCase()}), `
    + (n ? `com ${n} pessoa${n === 1 ? '' : 's'}.` : 'ainda sem equipa.')
    + (sequela ? ` Os fãs de «${s.produtos[sequela.de].nome}» já estão à espera: expectativa +${Math.round(hype * 100)}%.` : ''));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Sequelas e novas versões: herdam os fãs do original (expectativa), mas os críticos
// comparam-nas com a versão anterior.
// ---------------------------------------------------------------------------

export const SEQUELAS = {
  hypeBase: 0.1,
  hypeQualidade: 0.25, // × qualidade do original
  hypeFama: 0.25, // × fama do original (receita total face às vendas base do tipo × 4)
  hypeMaximo: 0.6,
  penalizacao: 2, // vendas × (1 − 2 × qualidade perdida) se sair pior do que o original
  bonusMelhor: 0.1, // vendas × 1,1 se for claramente melhor (+5 pontos de qualidade)
};

function serieDe(p: Produto): string {
  return p.serie ?? p.nome;
}

/** Só a versão mais recente de uma série pode ter sequela, e só uma de cada vez. */
export function podeTerSequela(s: Estado, indice: number): boolean {
  const o = s.produtos[indice];
  if (!o) return false;
  const serie = serieDe(o);
  const versao = o.versao ?? 1;
  if (s.produtos.some((p, i) => i !== indice && serieDe(p) === serie && p.tipo === o.tipo && (p.versao ?? 1) > versao)) return false;
  return !s.projetos.some((p) => p.sequela && s.produtos[p.sequela.de] && serieDe(s.produtos[p.sequela.de]) === serie);
}

/** Expectativa (hype) inicial de uma sequela: os fãs do original, menos os que os bugs afastaram. */
export function bonusSequela(s: Estado, indice: number): number {
  const o = s.produtos[indice];
  if (!o) return 0;
  const fama = Math.min(1, o.receitaTotal / (TIPOS[o.tipo].vendas * 4));
  const bugs = Math.min(0.5, (o.bugs ?? 0) / BUGS.metadeVendas / 2);
  const v = (SEQUELAS.hypeBase + SEQUELAS.hypeQualidade * o.qualidade + SEQUELAS.hypeFama * fama) * (1 - bugs);
  return Math.round(Math.min(SEQUELAS.hypeMaximo, v) * 100) / 100;
}

/** «Nome 2» para jogos, «Nome v2» para o resto. */
export function nomeSequela(s: Estado, indice: number): string {
  const o = s.produtos[indice];
  const v = (o.versao ?? 1) + 1;
  return `${serieDe(o).slice(0, 26)} ${o.tipo === 'jogo' ? '' : 'v'}${v}`;
}

/** Produtos (índices) que podem ter uma nova versão deste tipo. */
export function candidatosSequela(s: Estado, tipo: TipoSoftware): number[] {
  return s.produtos.map((_, i) => i).filter((i) => s.produtos[i].tipo === tipo && podeTerSequela(s, i));
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

type TrabalhoPorAreas = Pick<Projeto, 'tipo' | 'trabalhoTotal' | 'trabalhoFeito' | 'feito' | 'somaQualidade' | 'manutencao'>;

/** Um patch é só programação e testes. */
export const AREAS_MANUTENCAO: Competencias = { programacao: 0.5, design: 0, testes: 0.5 };

export function areasDoProjeto(p: Pick<Projeto, 'tipo' | 'manutencao'>): Competencias {
  return p.manutencao !== undefined ? AREAS_MANUTENCAO : TIPOS[p.tipo].areas;
}

export function totalDaArea(p: Pick<Projeto, 'tipo' | 'trabalhoTotal' | 'manutencao'>, a: Area): number {
  return p.trabalhoTotal * areasDoProjeto(p)[a];
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

/** Trabalha e devolve os pontos feitos. */
function trabalharUmMinuto(p: TrabalhoPorAreas, f: Trabalhador, minutos: number, eficiencia: number,
  extraQualidade?: (a: Area) => number): number {
  const a = areaDeTrabalho(p, f);
  if (!a) return 0;
  const r = rendimento(f, a) * minutos * eficiencia;
  p.feito[a] += r;
  p.somaQualidade[a] += r * Math.min(1, f.competencias[a] + (extraQualidade ? extraQualidade(a) : 0));
  p.trabalhoFeito += r;
  return r;
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

/** Qualidade (0–1) de uma só área do trabalho feito (1 se a área não tiver trabalho). */
export function qualidadeDaArea(p: TrabalhoPorAreas, a: Area): number {
  if (p.feito[a] <= 0) return 1;
  return Math.min(1, (p.somaQualidade[a] / p.feito[a]) * 1.2);
}

/**
 * Previsão para a interface e para os jogadores automáticos: meses até acabar e qualidade final,
 * se esta equipa trabalhar 8 h por dia (passos de 1 h). meses = Infinity se não acabar em 3 anos.
 */
export function estimarProjeto(
  equipa: Trabalhador[], tipo: TipoSoftware, funcionalidades: string[], coordenacao = ECON.coordenacao, velocidade = 1,
): { meses: number; qualidade: number } {
  return simularAteAcabar({
    tipo,
    trabalhoTotal: trabalhoDoProjeto(tipo, funcionalidades),
    trabalhoFeito: 0,
    feito: { programacao: 0, design: 0, testes: 0 },
    somaQualidade: { programacao: 0, design: 0, testes: 0 },
  }, equipa, coordenacao, velocidade);
}

/** Multiplicador de velocidade do desenvolvimento desta empresa (tecnologias). */
export function velocidadeDe(s: Estado): number {
  return temTecnologia(s, 'iagenerativa') ? 1.1 : 1;
}

/** Meses que faltam a um projeto em curso com esta equipa (Infinity se parado). */
export function mesesRestantes(p: Projeto, equipa: Trabalhador[], coordenacao = ECON.coordenacao, velocidade = 1): number {
  return simularAteAcabar(
    { ...p, feito: { ...p.feito }, somaQualidade: { ...p.somaQualidade } }, equipa, coordenacao,
    velocidade * (p.crunch ? CRUNCH.velocidade : 1)).meses;
}

function simularAteAcabar(
  p: TrabalhoPorAreas, equipa: Trabalhador[], coordenacao: number, velocidade = 1,
): { meses: number; qualidade: number } {
  if (equipa.length === 0) return { meses: Infinity, qualidade: qualidadeDoProjeto(p) };
  const LIMITE = 36 * DIAS_POR_MES * 8;
  const ef = eficienciaEquipa(equipa.length, coordenacao) * velocidade;
  let horas = 0;
  while (!projetoAcabado(p) && horas < LIMITE) {
    for (const f of equipa) trabalharUmMinuto(p, f, 60, ef);
    horas++;
  }
  return { meses: projetoAcabado(p) ? horas / 8 / DIAS_POR_MES : Infinity, qualidade: qualidadeDoProjeto(p) };
}

function lancarProjeto(s: Estado, p: Projeto): void {
  if (p.contrato) return entregarContrato(s, p);
  if (p.manutencao !== undefined) return concluirManutencao(s, p);
  const qualidade = Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s));
  const mercado = fatorMercado(s, p.tipo);
  const marketing = (temMelhoria(s, 'marketing') ? 1.15 : 1) * (temTecnologia(s, 'dados') ? 1.1 : 1);
  // Sequela: os críticos comparam com a versão anterior.
  const original = p.sequela ? s.produtos[p.sequela.de] : undefined;
  const diferenca = original ? qualidade - original.qualidade : 0;
  const comparacao = !original ? 1 : diferenca < 0 ? Math.max(0.4, 1 + SEQUELAS.penalizacao * diferenca)
    : diferenca >= 0.05 ? 1 + SEQUELAS.bonusMelhor : 1;
  const notaCriticos = original ? Math.max(0, Math.min(1, qualidade + (diferenca < 0 ? diferenca * 0.8 : Math.min(0.05, diferenca / 2)))) : qualidade;
  const bugs = bugsDoLancamento(s, p);
  const produto: Produto = {
    nome: p.nome,
    tipo: p.tipo,
    funcionalidades: p.funcionalidades,
    qualidade,
    vendasMes: vendasIniciais(p.tipo, p.funcionalidades, qualidade, mercado) * marketing * (1 + (p.hype ?? 0))
      * fatorEra(s, p.tipo, p.funcionalidades) * comparacao,
    receitaTotal: 0,
    lancadoEm: s.minuto,
    criticas: criticasPara(p.nome, notaCriticos, s.minuto),
    bugs: Math.round(bugs * BUGS.noLancamento),
    ritmoBugs: Math.round(bugs * BUGS.ritmoInicial * 10) / 10,
  };
  if (original && p.sequela) {
    produto.serie = serieDe(original);
    produto.versao = p.sequela.versao;
  }
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
  if (original) {
    const pontos = Math.round(Math.abs(diferenca) * 100);
    mensagem(s, diferenca < 0
      ? `📉 Os críticos comparam «${produto.nome}» com «${original.nome}»: está pior (−${pontos} pontos de qualidade) e os fãs ficaram desiludidos.`
      : diferenca >= 0.05
        ? `🌟 «${produto.nome}» supera «${original.nome}» (+${pontos} pontos de qualidade): os fãs adoraram.`
        : `«${produto.nome}» está ao nível de «${original.nome}»: os fãs ficaram satisfeitos.`, diferenca < 0 ? 'aviso' : 'info');
  }
  if ((produto.bugs ?? 0) >= BUGS.alto) {
    produto.avisoBugs = true;
    mensagem(s, `🐞 «${produto.nome}» saiu com ${produto.bugs} bugs. Põe uma equipa a fazer um patch (separador Produtos).`, 'aviso');
  }
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
// Versão 5: investigação (tecnologias), bugs, sequelas, horas extra e baixas.
export const VERSAO_SAVE = 5;

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
  if (o.versao < 5 && objeto(o.estado)) migrarDaVersao4(o.estado);
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

/**
 * Os campos que a versão 5 acrescentou: a investigação começa do zero. Os produtos antigos não
 * têm bugs (os campos novos dos produtos, projetos e funcionários são opcionais).
 */
function migrarDaVersao4(e: Record<string, unknown>): void {
  e.tecnologias ??= [];
  e.pesquisaAtual ??= null;
  e.pesquisaProgresso ??= 0;
  e.pesquisaReserva ??= 0;
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
    const nProdutos = (e.produtos as unknown[]).length;
    if (p.manutencao !== undefined && !(inteiro(p.manutencao) && p.manutencao >= 0 && p.manutencao < nProdutos)) return 'patch do projeto';
    const sq = p.sequela;
    if (sq !== undefined && !(objeto(sq) && inteiro(sq.de) && sq.de >= 0 && sq.de < nProdutos && inteiro(sq.versao) && sq.versao >= 2))
      return 'sequela do projeto';
    if ((p.crunch !== undefined && typeof p.crunch !== 'boolean') || (p.crunchFeito !== undefined && !(numero(p.crunchFeito) && p.crunchFeito >= 0)))
      return 'horas extra do projeto';
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
    if (f.baixaAte !== undefined && !numero(f.baixaAte)) return 'baixa do funcionário';
    if (!tracosValidos(f.tracos)) return 'personalidade do funcionário';
    if (f.formacao !== undefined && !(objeto(f.formacao) && AREAS.includes(f.formacao.area as Area) && numero(f.formacao.ate)))
      return 'formação do funcionário';
  }
  for (const c of e.candidatos as unknown[])
    if (!objeto(c) || typeof c.nome !== 'string' || !competenciasValidas(c.competencias) || !numero(c.salario)
      || !tracosValidos(c.tracos)) return 'candidato';
  for (const p of e.produtos as unknown[])
    if (!objeto(p) || typeof p.nome !== 'string' || typeof p.tipo !== 'string' || !(p.tipo in TIPOS)
      || !Array.isArray(p.funcionalidades) || !numero(p.qualidade) || !numero(p.vendasMes)
      || !numero(p.receitaTotal) || !numero(p.lancadoEm)
      || (p.criticas !== undefined && !(Array.isArray(p.criticas) && p.criticas.every(numero)))
      || (p.bugs !== undefined && !(numero(p.bugs) && p.bugs >= 0))
      || (p.ritmoBugs !== undefined && !(numero(p.ritmoBugs) && p.ritmoBugs >= 0))
      || (p.avisoBugs !== undefined && typeof p.avisoBugs !== 'boolean')
      || (p.serie !== undefined && typeof p.serie !== 'string')
      || (p.versao !== undefined && !inteiro(p.versao))) return 'produto';
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
  const tec = e.tecnologias;
  if (!Array.isArray(tec) || !tec.every((t) => typeof t === 'string' && t in TECNOLOGIAS) || new Set(tec).size !== tec.length)
    return 'tecnologias';
  if (e.pesquisaAtual !== null && !(typeof e.pesquisaAtual === 'string' && e.pesquisaAtual in TECNOLOGIAS)) return 'investigação em curso';
  if (!numero(e.pesquisaProgresso) || e.pesquisaProgresso < 0 || !numero(e.pesquisaReserva) || e.pesquisaReserva < 0)
    return 'pontos de investigação';
  return erroNosExtras(e);
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

  const velocidade = velocidadeDe(s);
  let pesquisa = 0;
  for (const f of s.funcionarios) {
    if (!f.dentro) {
      if (md === f.horaChegada && f.secretariaId !== null && !ausente(s, f)) planearChegada(s, f);
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
      if (p) {
        const pessoal = f.tracos?.length || s.relacoes?.length;
        const r = trabalharUmMinuto(p, f, 1, eficienciaEquipa(tamanho.get(p.id) ?? 1, coordenacaoDe(s))
          * (p.crunch ? CRUNCH.velocidade : 1) * (p.manutencao === undefined ? velocidade : 1)
          * (pessoal ? velocidadePessoal(s, f) : 1), f.tracos?.length ? (a) => qualidadeDosTracos(f, a) : undefined);
        if (p.crunch) p.crunchFeito = (p.crunchFeito ?? 0) + r;
        if (p.manutencao !== undefined) {
          const produto = s.produtos[p.manutencao];
          if (produto) produto.bugs = Math.max(0, (produto.bugs ?? 0) - r / pontosPorBug(s));
        }
      }
    } else if (f.estado === 'aTrabalhar' && horario) {
      // Quem não está em nenhum projeto investiga.
      pesquisa += rendimentoPesquisa(f);
    }
  }
  if (pesquisa > 0) s.pesquisaReserva += pesquisa;
  if (s.pesquisaAtual && s.pesquisaReserva > 0) avancarPesquisa(s);

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
    if (f.baixaAte !== undefined && s.minuto >= f.baixaAte) {
      delete f.baixaAte;
      f.felicidade = Math.min(100, f.felicidade + CRUNCH.felicidadeRegresso);
      mensagem(s, `${f.nome} voltou da baixa, mais descansado(a).`);
    }
    // Horas extra: cansam todos os dias e podem acabar em baixa (o aleatório só é usado com horas extra).
    const p = f.projetoId === null ? undefined : s.projetos.find((o) => o.id === f.projetoId);
    if (p?.crunch && !ausente(s, f)) {
      f.felicidade = Math.max(0, f.felicidade - CRUNCH.felicidadeDia * cansacoDosTracos(f));
      if (aleatorio(s) < chanceDeBaixa(f)) {
        const dias = CRUNCH.baixaMin + Math.floor(aleatorio(s) * (CRUNCH.baixaMax - CRUNCH.baixaMin + 1));
        f.baixaAte = s.minuto + dias * MIN_POR_DIA;
        mensagem(s, `🤒 ${f.nome} está de baixa por ${dias} dias: esgotamento por causa das horas extra em «${p.nome}».`, 'aviso');
      }
    }
  }
  diaPessoal(s);
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
    const vendas = vendasComBugs(p);
    receitas += vendas;
    p.receitaTotal += vendas;
    const q = TIPOS[p.tipo].queda;
    p.vendasMes *= temMelhoria(s, 'fas') ? q + (1 - q) * 0.4 : q;
    acumularBugs(s, p);
  }
  mudarDeEra(s);
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const despesas = salarios + rendaDe(s);
  if (s.subsidiarias?.length) receberDasSubsidiarias(s);
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
  if (s.bolsa) atualizarBolsa(s);
  anunciarFeiras(s);
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
  { id: 'sequela', icone: '🎬', nome: 'Franquia', descricao: 'Lança uma nova versão de um produto.',
    cumprida: (s) => s.produtos.some((p) => (p.versao ?? 1) >= 2) },
  { id: 'laboratorio', icone: '🔬', nome: 'Laboratório', descricao: 'Investiga 3 tecnologias.',
    cumprida: (s) => s.tecnologias.length >= 3 },
  { id: 'vanguarda', icone: '🚀', nome: 'Vanguarda', descricao: 'Investiga todas as tecnologias.',
    cumprida: (s) => s.tecnologias.length >= LISTA_TECNOLOGIAS.length },
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
  const produtos = s.produtos.reduce((t, p) => t + vendasFuturas(vendasComBugs(p), quedaEfetiva(s, p.tipo)), 0);
  const projetos = s.projetos.reduce((t, p) => {
    const feito = Math.min(1, p.trabalhoFeito / p.trabalhoTotal);
    if (p.contrato) return t + feito * p.contrato.pagamento;
    if (p.manutencao !== undefined) return t; // o patch já se vê nas vendas do produto quando acabar
    const q = Math.max(0.4, Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s)));
    const vendas = vendasIniciais(p.tipo, p.funcionalidades, q, fatorMercado(s, p.tipo)) * (1 + (p.hype ?? 0))
      * fatorEra(s, p.tipo, p.funcionalidades);
    return t + feito * AVALIACAO.projetos * vendasFuturas(vendas, quedaEfetiva(s, p.tipo));
  }, 0);
  const equipa = s.funcionarios.reduce((t, f) =>
    t + competenciaMedia(f.competencias) * AVALIACAO.porPessoa * (0.6 + 0.4 * f.felicidade / 100), 0);
  const sucessos = s.produtos.filter((p) => p.criticas && p.criticas.reduce((a, b) => a + b, 0) / p.criticas.length >= 7.5).length;
  const marca = (nivelDaEmpresa(s) - 1) * AVALIACAO.porNivel + s.conquistas.length * AVALIACAO.porConquista
    + sucessos * AVALIACAO.porSucesso;
  const ativos = AVALIACAO.ativos * (s.secretarias.length * ECON.custoSecretaria
    + s.objetos.reduce((t, o) => t + OBJETOS[o.tipo].custo, 0)) + valorDasSubsidiarias(s);
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
      // Especialidades variadas: roda os 4 tipos a partir de um ponto escolhido pela semente.
      tipo: LISTA_TIPOS[(i + Math.floor(h(`${semente}|tipo`) * LISTA_TIPOS.length)) % LISTA_TIPOS.length],
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
  // Como nos concorrentes: a variação é a do último fecho de mês.
  const variacao = hist.length > 1 && hist[hist.length - 2] ? hist[hist.length - 1] / hist[hist.length - 2] - 1 : 0;
  const lista: LugarRanking[] = s.rivais.map((r) => {
    const a = r.historico.length > 1 ? r.historico[r.historico.length - 2] : r.valor;
    return { nome: r.nome, valor: r.valor, variacao: a ? r.valor / a - 1 : 0, jogador: false, tipo: r.tipo, historico: r.historico };
  });
  lista.push({ nome: s.nome, valor, variacao, jogador: true, tipo: null, historico: hist });
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
  if (p.manutencao !== undefined) return { ok: false, msg: 'Um patch não precisa de marketing.' };
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
  // Encomendas e clientes diferentes entre si, numa ordem que muda todos os meses.
  const ordem = <T>(lista: T[], k: string) => [...lista].sort((a, b) =>
    h(`${s.sementeMundo}|${mes}|${k}|${JSON.stringify(a)}`) - h(`${s.sementeMundo}|${mes}|${k}|${JSON.stringify(b)}`));
  const encomendas = ordem(ENCOMENDAS, 'enc');
  const clientes = ordem(CLIENTES, 'cli');
  s.ofertas = [];
  for (let i = 0; i < CONTRATOS.ofertas; i++) {
    const base = `${s.sementeMundo}|oferta|${mes}|${i}`;
    const e = encomendas[i];
    const trabalho = Math.round((e.trabalho * escala * (0.85 + 0.3 * h(base + '|trab'))) / 500) * 500;
    s.ofertas.push({
      id: mes * 10 + i + 1,
      cliente: clientes[i],
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

// ---------------------------------------------------------------------------
// Bugs e manutenção: cada produto lançado tem bugs, que os utilizadores vão encontrando
// nos meses seguintes. Os bugs cortam as vendas; um patch (programação e testes) corrige-os.
// Nada disto usa o gerador aleatório.
// ---------------------------------------------------------------------------

export const BUGS = {
  porMilPontos: 0.4, // bugs escondidos por cada 1000 pontos de trabalho, com testes fracos
  noLancamento: 0.4, // parte deles que se vê logo no lançamento
  crunch: 1.5, // um projeto todo feito em horas extra sai com 2,5× mais bugs
  ritmoInicial: 0.25, // no 1.º mês encontram-se mais 25% dos escondidos
  decaimento: 0.8, // e cada mês encontram-se menos 20% do que no anterior
  metadeVendas: 100, // com 100 bugs as vendas caem para metade
  alto: 20, // a partir daqui, aviso
  pontosPorBug: 300, // trabalho de um patch por bug
};

/** Fator (0–1] das vendas de um produto com estes bugs. */
export function fatorBugs(bugs: number): number {
  return 1 / (1 + Math.max(0, bugs) / BUGS.metadeVendas);
}

/** O que o produto vende de facto este mês, já com o efeito dos bugs. */
export function vendasComBugs(p: Produto): number {
  return p.vendasMes * fatorBugs(p.bugs ?? 0);
}

/** Nota dos utilizadores (1–10): a dos críticos, menos o que os bugs irritam. */
export function notaUtilizadores(p: Produto): number {
  const media = p.criticas?.length ? p.criticas.reduce((a, b) => a + b, 0) / p.criticas.length : p.qualidade * 10;
  return Math.round(Math.max(1, Math.min(10, media - (p.bugs ?? 0) / 8)) * 10) / 10;
}

/** Bugs com que um projeto sai: mais com testes fracos e horas extra; menos com garantia de qualidade. */
export function bugsDoLancamento(s: Estado, p: Projeto): number {
  const testes = qualidadeDaArea(p, 'testes');
  const crunch = Math.min(1, (p.crunchFeito ?? 0) / Math.max(1, p.trabalhoFeito));
  return (p.trabalhoTotal / 1000) * BUGS.porMilPontos * Math.max(0.1, 1.15 - testes - bonusQualidade(s))
    * (1 + BUGS.crunch * crunch) * (temTecnologia(s, 'qa') ? 0.7 : 1);
}

function acumularBugs(s: Estado, p: Produto): void {
  const ritmo = p.ritmoBugs ?? 0;
  if (ritmo > 0) {
    p.bugs = (p.bugs ?? 0) + ritmo * (temTecnologia(s, 'devops') ? 0.7 : 1);
    p.ritmoBugs = ritmo * BUGS.decaimento < 0.05 ? 0 : Math.round(ritmo * BUGS.decaimento * 100) / 100;
  }
  const bugs = p.bugs ?? 0;
  const indice = s.produtos.indexOf(p);
  if (bugs >= BUGS.alto && !p.avisoBugs && p.vendasMes >= 200 && !manutencaoDe(s, indice)) {
    p.avisoBugs = true;
    mensagem(s, `🐞 Os utilizadores de «${p.nome}» já encontraram ${Math.round(bugs)} bugs: as vendas estão a cair `
      + `(−${Math.round((1 - fatorBugs(bugs)) * 100)}%). Faz um patch no separador Produtos.`, 'aviso');
  } else if (bugs < BUGS.alto / 2) p.avisoBugs = false;
}

/** Trabalho de um patch por bug (DevOps torna-os mais rápidos). */
export function pontosPorBug(s: Estado): number {
  return BUGS.pontosPorBug / (temTecnologia(s, 'devops') ? 1.5 : 1);
}

/** O patch em curso de um produto, se houver. */
export function manutencaoDe(s: Estado, indice: number): Projeto | undefined {
  return s.projetos.find((p) => p.manutencao === indice);
}

/**
 * Começa um patch para o produto s.produtos[indice]: um projeto só de programação e testes que tira
 * bugs à medida que avança. A equipa são os indicados (por omissão, quem está sem projeto).
 */
export function iniciarManutencao(s: Estado, indice: number, equipa: number[] = semProjeto(s).map((f) => f.id)): Resultado {
  const produto = s.produtos[indice];
  if (!produto) return { ok: false, msg: 'Produto desconhecido.' };
  if (manutencaoDe(s, indice)) return { ok: false, msg: `Já há um patch em curso para «${produto.nome}».` };
  const bugs = Math.round(produto.bugs ?? 0);
  if (bugs < 1) return { ok: false, msg: `«${produto.nome}» não tem bugs conhecidos.` };
  if (equipa.some((id) => !s.funcionarios.some((f) => f.id === id))) return { ok: false, msg: 'Funcionário desconhecido.' };
  const id = s.proximoId++;
  s.projetos.push({
    id,
    nome: `Patch · ${produto.nome}`,
    tipo: produto.tipo,
    funcionalidades: [],
    trabalhoFeito: 0,
    trabalhoTotal: Math.max(500, bugs * pontosPorBug(s)),
    feito: { programacao: 0, design: 0, testes: 0 },
    somaQualidade: { programacao: 0, design: 0, testes: 0 },
    manutencao: indice,
  });
  for (const fid of equipa) definirEquipa(s, fid, id);
  const n = equipa.length;
  mensagem(s, `🛠️ Começou um patch para «${produto.nome}» (${bugs} bugs), `
    + (n ? `com ${n} pessoa${n === 1 ? '' : 's'}.` : 'ainda sem equipa: escolhe quem trabalha nele no separador Equipa.'));
  return { ok: true };
}

function concluirManutencao(s: Estado, p: Projeto): void {
  const produto = s.produtos[p.manutencao!];
  s.projetos = s.projetos.filter((o) => o !== p);
  for (const f of membrosDe(s, p.id)) f.projetoId = null;
  if (!produto) return;
  produto.bugs = Math.round(produto.bugs ?? 0);
  produto.avisoBugs = false;
  mensagem(s, `🛠️ Patch de «${produto.nome}» publicado! `
    + (produto.bugs ? `Ainda há ${produto.bugs} bugs que apareceram entretanto.` : 'Já não há bugs conhecidos.')
    + ' As vendas recuperam. A equipa está livre.', 'lancamento');
  ganharXp(s, 15);
  verificarConquistas(s);
}

// ---------------------------------------------------------------------------
// Horas extra (crunch): por projeto. Trabalha-se mais depressa, mas a felicidade cai todos
// os dias, há baixas por esgotamento e o produto sai com mais bugs.
// ---------------------------------------------------------------------------

export const CRUNCH = {
  velocidade: 1.35,
  felicidadeDia: 2.5, // perde-se por dia de horas extra (a felicidade quase deixa de recuperar)
  felicidadeRegresso: 10, // quem volta de uma baixa vem mais descansado
  baixaBase: 0.002, // probabilidade de baixa por dia de horas extra
  baixaInfeliz: 0.04, // mais esta × quanto a felicidade está abaixo de 60 (0 a 1)
  baixaMin: 3, // dias
  baixaMax: 7,
};

export function deBaixa(s: Estado, f: Funcionario): boolean {
  return f.baixaAte !== undefined && s.minuto < f.baixaAte;
}

/** Probabilidade de baixa por cada dia de horas extra. */
export function chanceDeBaixa(f: Funcionario): number {
  return CRUNCH.baixaBase + CRUNCH.baixaInfeliz * Math.max(0, (60 - f.felicidade) / 60);
}

/** Liga ou desliga as horas extra de um projeto (por omissão, troca). */
export function alternarCrunch(s: Estado, projetoId: number, ligar?: boolean): Resultado {
  const p = s.projetos.find((o) => o.id === projetoId);
  if (!p) return { ok: false, msg: 'Projeto desconhecido.' };
  const novo = ligar ?? !p.crunch;
  if (novo === !!p.crunch) return { ok: true };
  if (novo) p.crunch = true;
  else delete p.crunch;
  mensagem(s, novo
    ? `🔥 Horas extra em «${p.nome}»: a equipa trabalha ${Math.round((CRUNCH.velocidade - 1) * 100)}% mais depressa, mas cansa-se, pode ficar de baixa e deixa mais bugs.`
    : `Acabaram as horas extra em «${p.nome}».`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Investigação: quem está sem projeto investiga (ou compram-se pontos). As tecnologias
// desbloqueiam funcionalidades novas e dão bónus.
// ---------------------------------------------------------------------------

export type IdTecnologia = 'internet' | 'seguranca' | 'motor3d' | 'qa' | 'mobile' | 'cloud' | 'dados' | 'fisica'
  | 'servidores' | 'criptografia' | 'devops' | 'ia' | 'rv' | 'iagenerativa';

export interface DefTecnologia {
  nome: string;
  icone: string;
  descricao: string;
  custo: number; // pontos de investigação
  requer: IdTecnologia[];
  nivel: number; // patamar da árvore (1–4)
  bonus?: string; // efeito além das funcionalidades
}

export const TECNOLOGIAS: Record<IdTecnologia, DefTecnologia> = {
  internet: { nome: 'Internet', icone: '🌐', descricao: 'Programas que comunicam pela rede.', custo: 5000, requer: [], nivel: 1 },
  seguranca: { nome: 'Segurança', icone: '🔒', descricao: 'Proteger os dados dos utilizadores.', custo: 5000, requer: [], nivel: 1 },
  motor3d: { nome: 'Motor gráfico 3D', icone: '🧊', descricao: 'Um motor próprio para mundos 3D.', custo: 6000, requer: [], nivel: 1 },
  qa: { nome: 'Garantia de qualidade', icone: '🧪', descricao: 'Processos de testes a sério.', custo: 5000, requer: [], nivel: 1,
    bonus: 'Os produtos saem com menos 30% de bugs.' },
  mobile: { nome: 'Mobile', icone: '📱', descricao: 'Aplicações para telemóveis.', custo: 9000, requer: ['internet'], nivel: 2 },
  cloud: { nome: 'Cloud', icone: '☁️', descricao: 'Servidores na nuvem, sempre disponíveis.', custo: 9000, requer: ['internet'], nivel: 2 },
  dados: { nome: 'Análise de dados', icone: '📊', descricao: 'Perceber o que os utilizadores querem.', custo: 8000, requer: ['internet'], nivel: 2,
    bonus: 'Os produtos novos vendem mais 10%.' },
  fisica: { nome: 'Motor de física', icone: '⚙️', descricao: 'Colisões, gravidade e objetos realistas.', custo: 8000, requer: ['motor3d'], nivel: 2 },
  servidores: { nome: 'Servidores dedicados', icone: '🖥️', descricao: 'Milhares de jogadores ao mesmo tempo.', custo: 10000, requer: ['internet', 'motor3d'], nivel: 2 },
  criptografia: { nome: 'Criptografia avançada', icone: '🔐', descricao: 'Cifras que nem os melhores piratas quebram.', custo: 13000, requer: ['seguranca', 'cloud'], nivel: 3 },
  devops: { nome: 'DevOps', icone: '🔁', descricao: 'Integração e entrega contínuas.', custo: 13000, requer: ['qa', 'cloud'], nivel: 3,
    bonus: 'Patches 50% mais rápidos e menos 30% de bugs novos com o tempo.' },
  ia: { nome: 'Inteligência artificial', icone: '🤖', descricao: 'Programas que aprendem.', custo: 16000, requer: ['dados', 'cloud'], nivel: 3 },
  rv: { nome: 'Realidade virtual', icone: '🥽', descricao: 'Mergulhar dentro do jogo.', custo: 15000, requer: ['fisica'], nivel: 3 },
  iagenerativa: { nome: 'IA generativa', icone: '✨', descricao: 'A IA cria texto, imagens e mundos.', custo: 24000, requer: ['ia'], nivel: 4,
    bonus: 'Todos os projetos avançam 10% mais depressa.' },
};
export const LISTA_TECNOLOGIAS = Object.keys(TECNOLOGIAS) as IdTecnologia[];

export const PESQUISA = {
  ritmo: 0.6, // pontos por minuto de trabalho = competência média × ânimo × ritmo
  custoPacote: 2500, // € por um pacote de pontos (consultores e universidades)
  pontosPacote: 1500,
};

export function temTecnologia(s: Estado, id: IdTecnologia): boolean {
  return s.tecnologias.includes(id);
}

/** As funcionalidades que uma tecnologia desbloqueia, em todos os tipos. */
export function funcionalidadesDaTecnologia(id: IdTecnologia): { tipo: TipoSoftware; funcionalidade: Funcionalidade }[] {
  return LISTA_TIPOS.flatMap((tipo) => TIPOS[tipo].funcionalidades.filter((f) => f.tecnologia === id).map((f) => ({ tipo, funcionalidade: f })));
}

/** Pontos de investigação por minuto de quem está sem projeto. */
export function rendimentoPesquisa(f: Trabalhador): number {
  return competenciaMedia(f.competencias) * (0.5 + f.felicidade / 200) * PESQUISA.ritmo;
}

/** Previsão de pontos por mês, com quem está agora sem projeto (8 h por dia). */
export function pesquisaPorMes(s: Estado): number {
  return semProjeto(s).filter((f) => f.secretariaId !== null && !deBaixa(s, f))
    .reduce((t, f) => t + rendimentoPesquisa(f), 0) * 8 * 60 * DIAS_POR_MES;
}

export function podeInvestigar(s: Estado, id: IdTecnologia): Resultado {
  const d = TECNOLOGIAS[id];
  if (!d) return { ok: false, msg: 'Tecnologia desconhecida.' };
  if (temTecnologia(s, id)) return { ok: false, msg: 'Já investigada.' };
  const falta = d.requer.filter((r) => !temTecnologia(s, r));
  if (falta.length) return { ok: false, msg: `Precisa de ${falta.map((r) => TECNOLOGIAS[r].nome).join(' e ')}.` };
  return { ok: true };
}

/** Escolhe o que investigar (null para parar). Os pontos já investidos noutra voltam à reserva. */
export function escolherPesquisa(s: Estado, id: IdTecnologia | null): Resultado {
  if (id !== null) {
    const r = podeInvestigar(s, id);
    if (!r.ok) return r;
  }
  if (s.pesquisaAtual === id) return { ok: true };
  s.pesquisaReserva += s.pesquisaProgresso;
  s.pesquisaProgresso = 0;
  s.pesquisaAtual = id;
  if (id) avancarPesquisa(s);
  return { ok: true };
}

/** Compra um pacote de pontos de investigação. */
export function financiarPesquisa(s: Estado): Resultado {
  if (s.dinheiro < PESQUISA.custoPacote) return { ok: false, msg: `Precisas de ${euros(PESQUISA.custoPacote)}.` };
  s.dinheiro -= PESQUISA.custoPacote;
  s.pesquisaReserva += PESQUISA.pontosPacote;
  mensagem(s, `🔬 Contrataste consultores e uma universidade: +${PESQUISA.pontosPacote.toLocaleString('pt-PT')} pontos de investigação.`);
  if (s.pesquisaAtual) avancarPesquisa(s);
  return { ok: true };
}

/** Passa pontos da reserva para a investigação em curso e conclui-a quando chegar ao custo. */
function avancarPesquisa(s: Estado): void {
  const id = s.pesquisaAtual;
  if (!id) return;
  const d = TECNOLOGIAS[id];
  const usa = Math.min(s.pesquisaReserva, d.custo - s.pesquisaProgresso);
  s.pesquisaProgresso += usa;
  s.pesquisaReserva -= usa;
  if (s.pesquisaProgresso < d.custo - 1e-6) return;
  s.tecnologias.push(id);
  s.pesquisaAtual = null;
  s.pesquisaProgresso = 0;
  const funcs = funcionalidadesDaTecnologia(id).map((o) => `${o.funcionalidade.nome} (${TIPOS[o.tipo].nome.toLowerCase()})`);
  mensagem(s, `🔬 Investigação concluída: ${d.nome}!`
    + (funcs.length ? ` Novas funcionalidades: ${funcs.join(', ')}.` : '') + (d.bonus ? ` ${d.bonus}` : ''), 'desbloqueio');
  ganharXp(s, 30 * d.nivel);
  verificarConquistas(s);
}

// ---------------------------------------------------------------------------
// Eras tecnológicas: o mercado muda com os anos. Cada era mexe na procura de cada tipo de
// software e no valor das funcionalidades (as das tecnologias novas valem mais, as antigas menos).
// Os 2 primeiros anos são a Era Desktop, neutra (os testes de equilíbrio não mudam).
// ---------------------------------------------------------------------------

export type IdEra = 'desktop' | 'web' | 'mobile' | 'cloud' | 'ia';

export interface DefEra {
  id: IdEra;
  nome: string;
  icone: string;
  inicioMes: number; // mês de jogo em que começa (0 = janeiro do ano 1)
  descricao: string;
  tipos: Partial<Record<TipoSoftware, number>>; // procura de cada tipo (1 = normal)
  tecnologias: Partial<Record<IdTecnologia, number>>; // valor das funcionalidades que precisam desta tecnologia
  funcionalidades: Partial<Record<string, number>>; // 'tipo/id' → valor (sobrepõe-se ao da tecnologia)
}

export const ERAS: DefEra[] = [
  { id: 'desktop', nome: 'Era Desktop', icone: '🖥️', inicioMes: 0,
    descricao: 'Programas instalados no computador de casa e do escritório.', tipos: {}, tecnologias: {}, funcionalidades: {} },
  { id: 'web', nome: 'Era Web', icone: '🌐', inicioMes: 24,
    descricao: 'Toda a gente se liga à Internet: o que funciona em rede vale mais.',
    tipos: { editor: 1.1, antivirus: 1.15, utilitario: 0.95 },
    tecnologias: { internet: 1.6, seguranca: 1.3, servidores: 1.3 },
    funcionalidades: { 'utilitario/comandos': 0.6, 'jogo/classificacoes': 1.5 } },
  { id: 'mobile', nome: 'Era Mobile', icone: '📱', inicioMes: 48,
    descricao: 'O telemóvel passa a ser o primeiro ecrã: jogos e aplicações rápidas em alta.',
    tipos: { jogo: 1.2, utilitario: 1.1, editor: 0.9 },
    tecnologias: { mobile: 2, internet: 1.2, servidores: 1.3 },
    funcionalidades: { 'utilitario/comandos': 0.4, 'jogo/graficos3d': 0.9 } },
  { id: 'cloud', nome: 'Era Cloud', icone: '☁️', inicioMes: 84,
    descricao: 'Tudo na nuvem e sempre sincronizado. A segurança nunca foi tão importante.',
    tipos: { editor: 1.15, antivirus: 1.2, utilitario: 0.95 },
    tecnologias: { cloud: 2, servidores: 1.5, mobile: 1.3, criptografia: 1.5, seguranca: 1.3 },
    funcionalidades: { 'editor/nuvem': 1.8, 'utilitario/comandos': 0.3, 'antivirus/atualizacoes': 0.7 } },
  { id: 'ia', nome: 'Era IA', icone: '🤖', inicioMes: 120,
    descricao: 'A inteligência artificial muda tudo: quem não a usa fica para trás.',
    tipos: { jogo: 1.1, editor: 1.1, utilitario: 0.9 },
    tecnologias: { ia: 2.2, iagenerativa: 2.5, dados: 1.5, cloud: 1.3, mobile: 1.2 },
    funcionalidades: { 'editor/corretor': 0.5, 'utilitario/comandos': 0.3, 'utilitario/agendamento': 0.7, 'editor/formatacao': 0.8 } },
];

export function eraNoMes(mes: number): DefEra {
  let era = ERAS[0];
  for (const e of ERAS) if (e.inicioMes <= mes) era = e;
  return era;
}

export function eraAtual(s: Estado): DefEra {
  return eraNoMes(mesDeJogo(s));
}

export function proximaEra(s: Estado): DefEra | null {
  return ERAS.find((e) => e.inicioMes > mesDeJogo(s)) ?? null;
}

/** Quanto vale uma funcionalidade nesta era (1 = o normal). */
export function procuraFuncionalidade(era: DefEra, tipo: TipoSoftware, id: string): number {
  const f = funcionalidade(tipo, id);
  if (!f) return 1;
  return era.funcionalidades[`${tipo}/${id}`] ?? (f.tecnologia ? era.tecnologias[f.tecnologia] ?? 1 : 1);
}

/** Multiplicador das vendas de um produto com estas funcionalidades, nesta era. */
export function fatorEraNa(era: DefEra, tipo: TipoSoftware, ids: string[]): number {
  const valor = 1 + ids.reduce((t, id) => t + (funcionalidade(tipo, id)?.valor ?? 0) * procuraFuncionalidade(era, tipo, id), 0);
  return (era.tipos[tipo] ?? 1) * valor / valorDoProjeto(tipo, ids);
}

export function fatorEra(s: Estado, tipo: TipoSoftware, ids: string[]): number {
  return fatorEraNa(eraAtual(s), tipo, ids);
}

/** O que sobe e o que desce numa era, para a interface e para as notícias. */
export function tendenciasEra(era: DefEra): { sobe: string[]; desce: string[] } {
  const sobe: string[] = [];
  const desce: string[] = [];
  for (const t of LISTA_TIPOS) {
    const v = era.tipos[t] ?? 1;
    if (v > 1) sobe.push(TIPOS[t].plural);
    else if (v < 1) desce.push(TIPOS[t].plural);
  }
  for (const id of LISTA_TECNOLOGIAS) if ((era.tecnologias[id] ?? 1) > 1) sobe.push(TECNOLOGIAS[id].nome);
  for (const [k, v] of Object.entries(era.funcionalidades)) {
    const [tipo, id] = k.split('/') as [TipoSoftware, string];
    const nome = funcionalidade(tipo, id)?.nome;
    if (nome && v !== undefined) (v > 1 ? sobe : desce).push(nome);
  }
  return { sobe: [...new Set(sobe)], desce: [...new Set(desce)] };
}

/** No fecho do mês: se começou uma era nova, os produtos à venda ganham ou perdem procura. */
function mudarDeEra(s: Estado): void {
  const mes = mesDeJogo(s);
  const nova = eraNoMes(mes);
  const antiga = eraNoMes(mes - 1);
  if (mes <= 0 || nova === antiga) return;
  for (const p of s.produtos) p.vendasMes *= fatorEraNa(nova, p.tipo, p.funcionalidades) / fatorEraNa(antiga, p.tipo, p.funcionalidades);
  const t = tendenciasEra(nova);
  mensagem(s, `${nova.icone} Começou a ${nova.nome}! ${nova.descricao}`
    + (t.sobe.length ? ` Em alta: ${t.sobe.join(', ')}.` : '') + (t.desce.length ? ` Em queda: ${t.desce.join(', ')}.` : ''), 'evento');
}

// ---------------------------------------------------------------------------
// Personalidades e relações entre colegas
// ---------------------------------------------------------------------------

export type IdTraco = 'perfeccionista' | 'preguicoso' | 'mentor' | 'sociavel' | 'resistente' | 'ambicioso' | 'criativo' | 'conflituoso';

export interface DefTraco {
  nome: string;
  icone: string;
  descricao: string;
}

export const TRACOS: Record<IdTraco, DefTraco> = {
  perfeccionista: { nome: 'Perfeccionista', icone: '🔍', descricao: 'Trabalho com mais qualidade, mas 10% mais lento.' },
  preguicoso: { nome: 'Preguiçoso', icone: '😴', descricao: '15% mais lento, mas mais feliz. Cansa-se mais com horas extra.' },
  mentor: { nome: 'Mentor', icone: '🎓', descricao: 'Os colegas do mesmo projeto rendem mais 5%.' },
  sociavel: { nome: 'Sociável', icone: '😄', descricao: 'Mais feliz e faz amigos depressa.' },
  resistente: { nome: 'Resistente', icone: '💪', descricao: 'As horas extra cansam-no metade.' },
  ambicioso: { nome: 'Ambicioso', icone: '🚀', descricao: '10% mais rápido, mas menos satisfeito.' },
  criativo: { nome: 'Criativo', icone: '🎨', descricao: 'Design com mais qualidade.' },
  conflituoso: { nome: 'Conflituoso', icone: '😠', descricao: 'Entra em conflito com os colegas de equipa.' },
};
export const LISTA_TRACOS = Object.keys(TRACOS) as IdTraco[];

export interface Relacao {
  a: number; // ids dos dois funcionários (a < b)
  b: number;
  valor: number; // −100 (conflito) a 100 (amizade)
}
export const AMIZADE = 50;
export const CONFLITO = -50;

/** Traços de um candidato novo (0 a 2), sem tocar no gerador aleatório do jogo. */
function sortearTracos(s: Estado, nome: string): IdTraco[] {
  const base = `${s.sementeMundo}|${nome}|${s.minuto}|${s.candidatos.length}`;
  const n = hashTexto(base + '|n') < 0.35 ? 0 : hashTexto(base + '|m') < 0.6 ? 1 : 2;
  const out: IdTraco[] = [];
  for (let i = 0; out.length < n && i < 10; i++) {
    const t = LISTA_TRACOS[Math.floor(hashTexto(`${base}|${i}`) * LISTA_TRACOS.length)];
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

function temTraco(f: { tracos?: IdTraco[] }, t: IdTraco): boolean {
  return !!f.tracos?.includes(t);
}

function tracosValidos(t: unknown): boolean {
  return t === undefined || (Array.isArray(t) && t.length <= 3 && new Set(t).size === t.length
    && t.every((x) => typeof x === 'string' && x in TRACOS));
}

export function relacaoEntre(s: Estado, a: number, b: number): number {
  const [x, y] = a < b ? [a, b] : [b, a];
  return s.relacoes?.find((r) => r.a === x && r.b === y)?.valor ?? 0;
}

/** Amigos e conflitos de um funcionário (para a interface). */
export function relacoesDe(s: Estado, id: number): { amigos: string[]; conflitos: string[] } {
  const nome = (o: number) => s.funcionarios.find((f) => f.id === o)?.nome ?? '?';
  const amigos: string[] = [], conflitos: string[] = [];
  for (const r of s.relacoes ?? []) {
    if (r.a !== id && r.b !== id) continue;
    const outro = r.a === id ? r.b : r.a;
    if (r.valor >= AMIZADE) amigos.push(nome(outro));
    else if (r.valor <= CONFLITO) conflitos.push(nome(outro));
  }
  return { amigos, conflitos };
}

function felicidadePessoal(s: Estado, f: Funcionario): number {
  let v = (temTraco(f, 'preguicoso') ? 5 : 0) + (temTraco(f, 'sociavel') ? 3 : 0) - (temTraco(f, 'ambicioso') ? 3 : 0);
  let amigos = 0, conflitos = 0;
  for (const r of s.relacoes ?? []) {
    if (r.a !== f.id && r.b !== f.id) continue;
    if (r.valor >= AMIZADE) amigos++;
    else if (r.valor <= CONFLITO) conflitos++;
  }
  v += Math.min(2, amigos) * 3 - Math.min(2, conflitos) * 6;
  return v;
}

function velocidadePessoal(s: Estado, f: Funcionario): number {
  let v = (temTraco(f, 'perfeccionista') ? 0.9 : 1) * (temTraco(f, 'preguicoso') ? 0.85 : 1) * (temTraco(f, 'ambicioso') ? 1.1 : 1);
  if (f.projetoId === null) return v;
  // Conta só uma vez cada efeito (equipas grandes não somam bónus sem fim).
  let mentor = false, amigo = false, conflito = false;
  for (const o of s.funcionarios) {
    if (o.id === f.id || o.projetoId !== f.projetoId || ausente(s, o)) continue;
    if (temTraco(o, 'mentor')) mentor = true;
    const r = relacaoEntre(s, f.id, o.id);
    if (r >= AMIZADE) amigo = true;
    else if (r <= CONFLITO) conflito = true;
  }
  return v * (mentor ? 1.05 : 1) * (amigo ? 1.03 : 1) * (conflito ? 0.9 : 1);
}

function qualidadeDosTracos(f: Funcionario, a: Area): number {
  return (temTraco(f, 'perfeccionista') ? 0.05 : 0) + (temTraco(f, 'criativo') && a === 'design' ? 0.08 : 0);
}

function cansacoDosTracos(f: Funcionario): number {
  return temTraco(f, 'resistente') ? 0.5 : temTraco(f, 'preguicoso') ? 1.3 : 1;
}

/** De baixa ou numa formação: não vem ao escritório. */
export function ausente(s: Estado, f: Funcionario): boolean {
  return (f.baixaAte !== undefined && s.minuto < f.baixaAte) || (f.formacao !== undefined && s.minuto < f.formacao.ate);
}

/** Uma vez por dia: as relações entre colegas da mesma equipa evoluem e as formações acabam. */
function diaPessoal(s: Estado): void {
  const dia = Math.floor(s.minuto / MIN_POR_DIA);
  for (const f of s.funcionarios) {
    if (!f.formacao || s.minuto < f.formacao.ate) continue;
    const a = f.formacao.area;
    f.competencias[a] = Math.min(1, Math.round((f.competencias[a] + FORMACAO.ganho) * 100) / 100);
    delete f.formacao;
    mensagem(s, `🎓 ${f.nome} acabou a formação em ${NOME_AREA[a]} (${Math.round(f.competencias[a] * 100)}).`);
  }
  const fs = s.funcionarios.filter((f) => f.projetoId !== null && !ausente(s, f));
  for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
    const f = fs[i], g = fs[j];
    if (f.projetoId !== g.projetoId) continue;
    const [x, y] = f.id < g.id ? [f.id, g.id] : [g.id, f.id];
    const sorte = hashTexto(`${s.sementeMundo}|${dia}|${x}|${y}`);
    let d = 0.4 + (sorte - 0.5) * 3;
    if (temTraco(f, 'sociavel') || temTraco(g, 'sociavel')) d += 1.5;
    if (temTraco(f, 'conflituoso') || temTraco(g, 'conflituoso')) d -= 3;
    if (f.felicidade < 30 || g.felicidade < 30) d -= 1;
    s.relacoes ??= [];
    let r = s.relacoes.find((o) => o.a === x && o.b === y);
    if (!r) { r = { a: x, b: y, valor: 0 }; s.relacoes.push(r); }
    const antes = r.valor;
    r.valor = Math.max(-100, Math.min(100, Math.round((r.valor + d) * 10) / 10));
    if (antes < AMIZADE && r.valor >= AMIZADE) mensagem(s, `🤝 ${f.nome} e ${g.nome} ficaram amigos.`);
    if (antes > CONFLITO && r.valor <= CONFLITO) mensagem(s, `💢 ${f.nome} e ${g.nome} estão em conflito.`, 'aviso');
  }
  // Quem saiu da empresa deixa de ter relações.
  if (s.relacoes?.length) {
    const ids = new Set(s.funcionarios.map((f) => f.id));
    s.relacoes = s.relacoes.filter((r) => ids.has(r.a) && ids.has(r.b));
  }
}

// ---------------------------------------------------------------------------
// Formação
// ---------------------------------------------------------------------------

export const FORMACAO = { custo: 3000, dias: 5, ganho: 0.1 };

/** Manda um funcionário a uma formação: fica fora uns dias e volta melhor numa área. */
export function iniciarFormacao(s: Estado, id: number, area: Area): Resultado {
  const f = s.funcionarios.find((o) => o.id === id);
  if (!f) return { ok: false, msg: 'Funcionário desconhecido.' };
  if (!AREAS.includes(area)) return { ok: false, msg: 'Área desconhecida.' };
  if (ausente(s, f)) return { ok: false, msg: `${f.nome} não está disponível.` };
  if (f.competencias[area] >= 1) return { ok: false, msg: `${f.nome} já é excelente em ${NOME_AREA[area]}.` };
  if (s.dinheiro < FORMACAO.custo) return { ok: false, msg: `Dinheiro insuficiente (custa ${euros(FORMACAO.custo)}).` };
  s.dinheiro -= FORMACAO.custo;
  // Começa no dia seguinte (quem está no escritório acaba o dia normalmente).
  const amanha = (Math.floor(s.minuto / MIN_POR_DIA) + 1) * MIN_POR_DIA;
  f.formacao = { area, ate: amanha + FORMACAO.dias * MIN_POR_DIA };
  mensagem(s, `🎓 ${f.nome} vai fazer uma formação em ${NOME_AREA[area]} durante ${FORMACAO.dias} dias.`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Escritórios (mudar para um maior)
// ---------------------------------------------------------------------------

export interface DefEscritorio {
  nome: string;
  largura: number;
  altura: number;
  renda: number; // diferença na renda mensal
  custo: number; // custo da mudança
}

export const ESCRITORIOS: DefEscritorio[] = [
  { nome: 'Garagem', largura: 8, altura: 6, renda: -900, custo: 0 },
  { nome: 'Loja', largura: 12, altura: 10, renda: -500, custo: 8000 },
  { nome: 'Andar de escritórios', largura: 18, altura: 14, renda: 0, custo: 25000 },
  { nome: 'Edifício próprio', largura: 24, altura: 18, renda: 1500, custo: 80000 },
];

const FORA_DO_ESCRITORIO = 'Isso fica fora do teu escritório. Muda-te para um maior.';

/** Retângulo do escritório atual (células x0..x1−1, z0..z1−1), sempre com a entrada lá dentro. */
export function limitesDoEscritorio(s: Estado): { x0: number; z0: number; x1: number; z1: number } {
  const e = s.escritorio === undefined ? undefined : ESCRITORIOS[s.escritorio];
  if (!e) return { x0: 0, z0: 0, x1: s.largura, z1: s.altura };
  const w = Math.min(s.largura, e.largura), h = Math.min(s.altura, e.altura);
  const ex = s.entrada.x, ez = s.entrada.z;
  const x0 = Math.max(0, Math.min(s.largura - w, ex === s.largura - 1 ? s.largura - w : ex === 0 ? 0 : ex - Math.floor(w / 2)));
  const z0 = Math.max(0, Math.min(s.altura - h, ez === s.altura - 1 ? s.altura - h : ez === 0 ? 0 : ez - Math.floor(h / 2)));
  return { x0, z0, x1: x0 + w, z1: z0 + h };
}

export function dentroDoEscritorio(s: Estado, x: number, z: number): boolean {
  const l = limitesDoEscritorio(s);
  return x >= l.x0 && z >= l.z0 && x < l.x1 && z < l.z1;
}

function arestaNoEscritorio(s: Estado, a: Aresta): boolean {
  const l = limitesDoEscritorio(s);
  return a.tipo === 'v'
    ? a.x >= l.x0 && a.x <= l.x1 && a.z >= l.z0 && a.z < l.z1
    : a.x >= l.x0 && a.x < l.x1 && a.z >= l.z0 && a.z <= l.z1;
}

function rendaExtraEscritorio(s: Estado): number {
  return s.escritorio === undefined ? 0 : ESCRITORIOS[s.escritorio]?.renda ?? 0;
}

/** Muda para um escritório maior (as paredes e mobília ficam onde estão). */
export function mudarEscritorio(s: Estado, indice: number): Resultado {
  if (s.escritorio === undefined) return { ok: false, msg: 'Já tens o terreno todo.' };
  const e = ESCRITORIOS[indice];
  if (!e || indice <= s.escritorio) return { ok: false, msg: 'Só te podes mudar para um escritório maior.' };
  if (s.dinheiro < e.custo) return { ok: false, msg: `Dinheiro insuficiente (custa ${euros(e.custo)}).` };
  s.dinheiro -= e.custo;
  s.escritorio = indice;
  s.versaoMapa++;
  mensagem(s, `🏢 A empresa mudou-se para: ${e.nome} (${e.largura}×${e.altura}).`, 'conquista');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Aquisições e bolsa
// ---------------------------------------------------------------------------

export interface Subsidiaria {
  nome: string;
  tipo: TipoSoftware;
  valor: number;
  tendencia: number;
}

export const AQUISICAO = { premio: 1.3, lucroMensal: 0.012, nivelMinimo: 4 };
export const BOLSA = { valorMinimo: 2000000, nivelMinimo: 6, parteVendida: 0.2, acoes: 1000000 };

export function precoAquisicao(r: Rival): number {
  return Math.round(r.valor * AQUISICAO.premio / 1000) * 1000;
}

/** Compra um concorrente: sai do ranking e passa a dar lucro todos os meses. */
export function comprarRival(s: Estado, id: number): Resultado {
  const i = s.rivais.findIndex((r) => r.id === id);
  if (i < 0) return { ok: false, msg: 'Concorrente desconhecido.' };
  if (nivelDaEmpresa(s) < AQUISICAO.nivelMinimo) return { ok: false, msg: `Precisas do nível ${AQUISICAO.nivelMinimo} para comprar empresas.` };
  const r = s.rivais[i];
  const preco = precoAquisicao(r);
  if (s.dinheiro < preco) return { ok: false, msg: `Dinheiro insuficiente (custa ${euros(preco)}).` };
  s.dinheiro -= preco;
  s.rivais.splice(i, 1);
  (s.subsidiarias ??= []).push({ nome: r.nome, tipo: r.tipo, valor: r.valor, tendencia: r.tendencia });
  mensagem(s, `🏦 Compraste a ${r.nome} por ${euros(preco)}! Passa a ser uma subsidiária.`, 'conquista');
  return { ok: true };
}

function receberDasSubsidiarias(s: Estado): void {
  let total = 0;
  for (const d of s.subsidiarias ?? []) {
    d.valor = Math.max(10000, Math.round(d.valor * (1 + d.tendencia)));
    total += Math.round(d.valor * AQUISICAO.lucroMensal);
  }
  s.extraMes += total;
}

function valorDasSubsidiarias(s: Estado): number {
  return (s.subsidiarias ?? []).reduce((t, d) => t + d.valor, 0);
}

export function podeEntrarEmBolsa(s: Estado): Resultado {
  if (s.bolsa) return { ok: false, msg: 'A empresa já está em bolsa.' };
  if (nivelDaEmpresa(s) < BOLSA.nivelMinimo) return { ok: false, msg: `Precisas do nível ${BOLSA.nivelMinimo}.` };
  if (avaliarEmpresa(s).total < BOLSA.valorMinimo) return { ok: false, msg: `A empresa tem de valer pelo menos ${euros(BOLSA.valorMinimo)}.` };
  return { ok: true };
}

/** Entra em bolsa (IPO): vende uma parte da empresa ao público. */
export function entrarEmBolsa(s: Estado): Resultado {
  const r = podeEntrarEmBolsa(s);
  if (!r.ok) return r;
  const valor = avaliarEmpresa(s).total;
  const encaixe = Math.round(valor * BOLSA.parteVendida * (1 - s.participacao));
  s.dinheiro += encaixe;
  s.participacao = 1 - (1 - s.participacao) * (1 - BOLSA.parteVendida);
  s.bolsa = { acoes: BOLSA.acoes, historico: [Math.round(valor / BOLSA.acoes * 100) / 100] };
  mensagem(s, `🔔 A ${s.nome} entrou em bolsa! Encaixe de ${euros(encaixe)}.`, 'conquista');
  return { ok: true };
}

export function precoAcao(s: Estado): number {
  return s.bolsa ? s.bolsa.historico[s.bolsa.historico.length - 1] ?? 0 : 0;
}

function atualizarBolsa(s: Estado): void {
  const b = s.bolsa!;
  const antes = precoAcao(s);
  // O mercado exagera: o preço segue a avaliação com algum ruído.
  const ruido = 1 + (hashTexto(`${s.sementeMundo}|bolsa|${mesDeJogo(s)}`) - 0.5) * 0.2;
  const preco = Math.round(avaliarEmpresa(s).total / b.acoes * ruido * 100) / 100;
  b.historico.push(preco);
  if (b.historico.length > 36) b.historico.shift();
  if (antes > 0 && Math.abs(preco / antes - 1) >= 0.1)
    mensagem(s, `📈 As ações da ${s.nome} ${preco > antes ? 'subiram' : 'caíram'} ${Math.round(Math.abs(preco / antes - 1) * 100)}% (${preco.toFixed(2)} € por ação).`,
      preco > antes ? 'info' : 'aviso');
}

// ---------------------------------------------------------------------------
// Feiras e eventos do setor
// ---------------------------------------------------------------------------

export interface DefFeira {
  id: string;
  nome: string;
  icone: string;
  mes: number; // 0–11
  custo: number;
  hype: number; // somado a todos os projetos em curso
  vendas: number; // multiplica as vendas dos produtos já lançados
  descricao: string;
}

export const FEIRAS: DefFeira[] = [
  { id: 'tech', nome: 'Feira de Tecnologia de Lisboa', icone: '💻', mes: 2, custo: 6000, hype: 0.15, vendas: 1.03, descricao: 'Apresenta os teus projetos a empresas e programadores.' },
  { id: 'apps', nome: 'Encontro de Apps do Porto', icone: '📱', mes: 5, custo: 4000, hype: 0.1, vendas: 1.05, descricao: 'Mostra as tuas aplicações ao público.' },
  { id: 'jogos', nome: 'Semana dos Jogos', icone: '🎮', mes: 9, custo: 10000, hype: 0.25, vendas: 1.04, descricao: 'A maior feira de jogos do país.' },
  { id: 'cimeira', nome: 'Cimeira da Web', icone: '🌐', mes: 10, custo: 15000, hype: 0.3, vendas: 1.06, descricao: 'Investidores e imprensa de todo o mundo.' },
];

function anoDoJogo(s: Estado): number {
  return Math.floor(mesDeJogo(s) / 12);
}

/** Feiras a que se pode ir neste mês. */
export function feirasDisponiveis(s: Estado): DefFeira[] {
  const mes = mesDeJogo(s) % 12, ano = anoDoJogo(s);
  return FEIRAS.filter((f) => f.mes === mes && s.feiras?.[f.id] !== ano);
}

export function irAFeira(s: Estado, id: string): Resultado {
  const f = FEIRAS.find((o) => o.id === id);
  if (!f) return { ok: false, msg: 'Feira desconhecida.' };
  if (!feirasDisponiveis(s).includes(f)) return { ok: false, msg: 'Essa feira não está a decorrer (ou já lá foste este ano).' };
  if (s.dinheiro < f.custo) return { ok: false, msg: `Dinheiro insuficiente (custa ${euros(f.custo)}).` };
  s.dinheiro -= f.custo;
  (s.feiras ??= {})[f.id] = anoDoJogo(s);
  for (const p of s.projetos) if (p.manutencao === undefined && !p.contrato) p.hype = Math.min(HYPE_MAXIMO, (p.hype ?? 0) + f.hype);
  for (const p of s.produtos) p.vendasMes *= f.vendas;
  ganharXp(s, 30);
  mensagem(s, `${f.icone} Estiveste na ${f.nome}: mais expectativa para os projetos em curso e mais vendas.`, 'evento');
  return { ok: true };
}

/** No fecho do mês: avisa das feiras do mês que começa. */
function anunciarFeiras(s: Estado): void {
  for (const f of feirasDisponiveis(s))
    mensagem(s, `${f.icone} Este mês há a ${f.nome} (${euros(f.custo)}). ${f.descricao}`, 'evento');
}

/** Valida os campos opcionais (saves antigos não os têm). */
function erroNosExtras(e: Obj): string | null {
  if (e.relacoes !== undefined && !(Array.isArray(e.relacoes) && e.relacoes.every((r) =>
    objeto(r) && inteiro(r.a) && inteiro(r.b) && numero(r.valor) && r.valor >= -100 && r.valor <= 100)))
    return 'relações';
  if (e.escritorio !== undefined && !(inteiro(e.escritorio) && e.escritorio >= 0 && e.escritorio < ESCRITORIOS.length))
    return 'escritório';
  if (e.subsidiarias !== undefined && !(Array.isArray(e.subsidiarias) && e.subsidiarias.every((d) =>
    objeto(d) && typeof d.nome === 'string' && typeof d.tipo === 'string' && d.tipo in TIPOS && numero(d.valor) && numero(d.tendencia))))
    return 'subsidiárias';
  if (e.bolsa !== undefined && !(objeto(e.bolsa) && numero(e.bolsa.acoes) && e.bolsa.acoes > 0
    && Array.isArray(e.bolsa.historico) && e.bolsa.historico.every(numero)))
    return 'bolsa';
  if (e.feiras !== undefined && !(objeto(e.feiras) && Object.values(e.feiras).every(inteiro))) return 'feiras';
  return null;
}
