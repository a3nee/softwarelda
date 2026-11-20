// Cena 3D, construção, interface e menus. A lógica do jogo vive em sim.ts.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  AREAS, alvoFelicidade, arestaMaisProxima, avancar, cancelarProjeto, colocarObjeto, colocarParedes, colocarPorta, limiteSecretarias, moverMovel, rodarMovel,
  alugarCasa, arrendarCasa, CARROS, comprarCarro, comprarCasa, custosPatrimonio, defCasa, deixarAluguer, imovelDe,
  LISTA_CARROS, morarEm, PATRIMONIO, prestigio, rendaCasa, rendasRecebidas, valorCarro, valorCasa, valorPatrimonio,
  venderCarro, venderCasa, type IdCarro, APARENCIA_INICIAL, criarFundador, fundadorDe, type Aparencia,
  colocarSecretaria, comDependencias, CONQUISTAS, contratar, definirEquipa, demolirArestas, despedir, detetarSalas,
  ECON, eficienciaEquipa, estimarProjeto, euros, exportarJogo, fatorMercado, gerarCandidatos, importarJogo,
  iniciarProjeto, lerAresta, LISTA_OBJETOS, LISTA_TIPOS, membrosDe, mensagem, mesDeJogo, mesesRestantes, MIN_POR_DIA, MIN_POR_MES,
  minutoDoDia, NADA, NOME_AREA, NOME_ESTADO, novoJogo, OBJETOS, objetoEm, PORTA, qualidadeDoProjeto, removerObjeto,
  removerSecretaria, secretariaEm, segmento, semDependentes, textoData, tipoDisponivel, TIPOS, totalDaArea,
  trabalhoDoProjeto, vendasIniciais, areaDeTrabalho, bonusQualidade, comprarMelhoria, coordenacaoDe, HORA_FIM,
  HORA_INICIO, MELHORIAS, nivelDaEmpresa, pontosMelhoria, progressoNivel, rendaDe, serieDeLucro, temMelhoria,
  xpDeLancamento, avaliarEmpresa, rankingEmpresas, podeLevantar, levantarRonda, valorDaRonda, LISTA_RONDAS, RONDAS,
  LISTA_CAMPANHAS, CAMPANHAS, lancarCampanha, aceitarContrato, pagamentoDoContrato, DIAS_POR_MES,
  alternarCrunch, nomeSequela, deBaixa, eraAtual, proximaEra, tendenciasEra, fatorEra,
  escolherPesquisa, financiarPesquisa, funcionalidadeDisponivel, funcionalidadesDaTecnologia, iniciarManutencao, manutencaoDe,
  LISTA_TECNOLOGIAS, TECNOLOGIAS, PESQUISA, pesquisaPorMes, podeInvestigar, temTecnologia, vendasComBugs, fatorBugs,
  notaUtilizadores, BUGS, CRUNCH, velocidadeDe, procuraFuncionalidade,
  TRACOS, relacoesDe, iniciarFormacao, FORMACAO, ausente, ESCRITORIOS, mudarEscritorio, dentroDoEscritorio,
  comprarRival, precoAquisicao, AQUISICAO, entrarEmBolsa, podeEntrarEmBolsa, precoAcao, BOLSA, FEIRAS, irAFeira,
  feirasDisponiveis,
  type IdRonda, type IdCampanha, type Projeto, type OfertaContrato, type IdTecnologia, type DefEra,
  type Area, type IdMelhoria, type Aresta, type Competencias, type Estado, type Funcionario, type Mensagem, type Resultado,
  type TipoObjeto, type TipoSoftware,
  DESAFIOS, NOMES_MODO, mesesDoDesafio, textoMeses,
  plataformaDe, SERVIDORES, PLATAFORMA, iniciarUpdate, updateDe, funcionalidadesParaUpdate, mudarServidor, definirPlano,
  capacidadeServidor, cargaServidor, pagantesDe, receitaMensal, lucroMensal, eProdutoNovo, satisfacaoAlvo,
} from './sim.ts';
import {
  CADEIRA_Z, Confetes, corFelicidade, criarCafe, criarMatraquilhos, criarPlanta, criarSecretaria, criarSofa, MAT, mat,
} from './modelos.ts';
import { ALTURA_INDICADOR, modelosDe, Pessoa } from './pessoas.ts';
import { materialPBR, texturaNoMundo } from './recursos.ts';
import { Ambiente, type EstadoCasa } from './ambiente.ts';
import { guardarDefinicoes, lerDefinicoes, pixelRatio, type Definicoes } from './definicoes.ts';
import { configurarSom, som } from './som.ts';
import { desenharGrafico } from './grafico.ts';
import { Menus } from './menus.ts';
import { ic, type NomeIcone } from './icones.ts';
import { PosFx } from './posfx.ts';
import { Particulas } from './particulas.ts';
import { Celebracoes, numeroFlutuante } from './celebracoes.ts';
import { htmlMelhorias, PainelMissoes } from './progresso.ts';

// ---------------------------------------------------------------------------
// Jogos guardados (localStorage): um lugar manual e um autosave no fecho de cada mês
// ---------------------------------------------------------------------------

const LUGAR_MANUAL = 'software-lda.save';
const LUGAR_AUTO = 'software-lda.autosave';
const LARGURA = 24;
const ALTURA = 18;

function lerLugar(chave: string): ReturnType<typeof importarJogo> | null {
  let texto: string | null = null;
  try {
    texto = localStorage.getItem(chave);
  } catch {
    return null;
  }
  if (texto === null) return null;
  const r = importarJogo(texto);
  if (r.ok && (r.estado.largura !== LARGURA || r.estado.altura !== ALTURA))
    return { ok: false, msg: 'Jogo guardado com outro tamanho de terreno.' };
  return r;
}

function escreverLugar(chave: string, jogo: Estado): boolean {
  try {
    localStorage.setItem(chave, exportarJogo(jogo));
    return true;
  } catch {
    return false;
  }
}

/** O mais recente entre o save manual e o autosave (e o erro, se algum estiver estragado). */
function saveMaisRecente(): { melhor: { estado: Estado; guardadoEm: number } | null; erro: string } {
  let melhor: { estado: Estado; guardadoEm: number } | null = null;
  let erro = '';
  for (const r of [lerLugar(LUGAR_MANUAL), lerLugar(LUGAR_AUTO)]) {
    if (!r) continue;
    if (!r.ok) erro = r.msg;
    else if (!melhor || r.guardadoEm > melhor.guardadoEm) melhor = r;
  }
  return { melhor, erro };
}

// ---------------------------------------------------------------------------
// Estado: o jogo em curso, ou a "montra" que corre por trás do menu principal
// ---------------------------------------------------------------------------

function retangulo(e: Estado, x0: number, z0: number, x1: number, z1: number): void {
  colocarParedes(e, [...segmento(x0, z0, x1, z0), ...segmento(x0, z1, x1, z1), ...segmento(x0, z0, x0, z1), ...segmento(x1, z0, x1, z1)]);
}

/** Um escritório já montado, com gente a trabalhar, para o fundo do menu principal. Nunca é guardado. */
function criarMontra(): Estado {
  const d = novoJogo(2024, LARGURA, ALTURA);
  d.dinheiro = 1e8;
  retangulo(d, 2, 2, 11, 9);
  colocarPorta(d, { tipo: 'v', x: 2, z: 6 });
  retangulo(d, 13, 2, 21, 9);
  colocarPorta(d, { tipo: 'v', x: 13, z: 5 });
  retangulo(d, 13, 11, 21, 16);
  colocarPorta(d, { tipo: 'h', x: 15, z: 11 });
  for (const [x, z] of [[4, 4], [6, 4], [8, 4], [4, 7], [6, 7], [8, 7], [15, 4], [17, 4], [19, 4], [15, 7], [17, 7]])
    colocarSecretaria(d, x, z);
  const deco: [TipoObjeto, number, number][] = [
    ['planta', 3, 3], ['planta', 10, 3], ['planta', 10, 8], ['cafe', 20, 3], ['planta', 20, 8], ['sofa', 15, 15],
    ['sofa', 17, 15], ['matraquilhos', 19, 13], ['cafe', 14, 12], ['planta', 20, 15], ['planta', 12, 12],
  ];
  for (const [t, x, z] of deco) colocarObjeto(d, t, x, z);
  for (let i = 0; i < 10; i++) {
    contratar(d, 0);
    gerarCandidatos(d);
  }
  iniciarProjeto(d, 'Kernel Panic', 'utilitario');
  avancar(d, MIN_POR_DIA - minutoDoDia(d) + 9 * 60 + 30);
  d.mensagens = [];
  return d;
}

let s: Estado = criarMontra();
let montra = true;
let mesGuardado = mesDeJogo(s);
let def: Definicoes = lerDefinicoes();

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(pixelRatio(def.qualidade));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// As sombras são redesenhadas à mão (ver ciclo): a oclusão volta a desenhar a cena e, sozinho,
// o renderer refazia o mapa de sombras em cada uma dessas passagens.
renderer.shadowMap.autoUpdate = false;
// "Neutral" (Khronos) guarda as cores vivas, ao contrário do ACES que as desbota: dá o ar abonecado.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.92;
app.appendChild(renderer.domElement);

const cena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
const controlos = new OrbitControls(camara, renderer.domElement);
controlos.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
controlos.maxPolarAngle = Math.PI * 0.45;
controlos.minDistance = 5;
controlos.maxDistance = 70;
controlos.enableDamping = true;
controlos.dampingFactor = 0.12;
controlos.autoRotateSpeed = 0.6;

const centroTerreno = new THREE.Vector3((LARGURA - 1) / 2, 0, (ALTURA - 1) / 2);
function camaraDeJogo(): void {
  // Centro ligeiramente à direita, para o painel lateral não tapar o terreno.
  controlos.target.set(centroTerreno.x + 3, 0, centroTerreno.z);
  camara.position.set(centroTerreno.x + 13, 24, centroTerreno.z + 22);
  camara.clearViewOffset();
  controlos.autoRotate = false;
  controlos.update();
}
function camaraDeMenu(): void {
  controlos.target.copy(centroTerreno);
  camara.position.set(centroTerreno.x + 5, 17, centroTerreno.z + 23);
  vistaDeMenu();
  controlos.autoRotate = true;
  controlos.update();
}
/** No menu principal o escritório aparece à direita, ao lado do título. */
function vistaDeMenu(): void {
  camara.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.17, 0, innerWidth, innerHeight);
}

const ambiente = new Ambiente(cena, renderer, LARGURA, ALTURA, s.entrada);
const confetes = new Confetes(cena);
const particulas = new Particulas(cena);
const posfx = new PosFx(renderer, cena, camara);
posfx.excluirDaOclusao(particulas.grupo, confetes.malha, () => [imVidro]);
(window as unknown as Record<string, unknown>).__sl = { renderer, cena, posfx, ambiente };

// Chão: lajes de granito no espaço aberto (2 por célula, alinhadas com a grelha); soalho ou parquet nas salas.
// Uma instância por célula em cada tipo de chão; a célula só aparece no tipo que lhe cabe.
const geoCelula = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const PISOS = [
  texturaNoMundo(materialPBR('large_floor_tiles_02', 1, { color: 0xe6e3dc, roughness: 0.85 }), 2 / 3),
  texturaNoMundo(materialPBR('laminate_floor_02', 1, { roughness: 0.5 }), 0.98),
  texturaNoMundo(materialPBR('herringbone_parquet', 1, { roughness: 0.45 }), 0.49),
].map((m) => {
  const im = new THREE.InstancedMesh(geoCelula, m, LARGURA * ALTURA);
  im.receiveShadow = true;
  for (let i = 0; i < LARGURA * ALTURA; i++) im.setColorAt(i, new THREE.Color(0xffffff));
  cena.add(im);
  return im;
});

// Tons das salas: leves, para o chão continuar a parecer madeira
const CORES_SALA = [0x7dd3fc, 0xf9a8d4, 0x86efac, 0xfde68a, 0xc4b5fd, 0xfdba74, 0x5eead4, 0xfca5a5].map((c) =>
  new THREE.Color(0xffffff).lerp(new THREE.Color(c), 0.16));
let totalSalas = 0;
const COR_FORA = new THREE.Color(0x5a5f66); // terreno fora do escritório (ainda não é teu)
const BRANCO = new THREE.Color(0xffffff);

/** Pinta o chão: cada sala fechada tem o seu chão e o seu tom, o espaço aberto fica em betão. */
function pintarChao(): void {
  const salas = detetarSalas(s);
  totalSalas = salas.total;
  const m = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  salas.sala.forEach((n, i) => {
    const piso = n < 0 ? 0 : 1 + (n % 2);
    m.makeTranslation(i % LARGURA, 0, Math.floor(i / LARGURA));
    PISOS.forEach((im, k) => im.setMatrixAt(i, k === piso ? m : zero));
    const fora = !dentroDoEscritorio(s, i % LARGURA, Math.floor(i / LARGURA));
    if (fora) PISOS[piso].setColorAt(i, COR_FORA);
    else if (n >= 0) PISOS[piso].setColorAt(i, CORES_SALA[n % CORES_SALA.length]);
    else PISOS[piso].setColorAt(i, BRANCO);
  });
  for (const im of PISOS) {
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor!.needsUpdate = true;
    im.computeBoundingSphere();
  }
}

// Grelha (só aparece quando se constrói)
const grelha = (() => {
  const p: number[] = [];
  for (let x = 0; x <= LARGURA; x++) p.push(x - 0.5, 0.004, -0.5, x - 0.5, 0.004, ALTURA - 0.5);
  for (let z = 0; z <= ALTURA; z++) p.push(-0.5, 0.004, z - 0.5, LARGURA - 0.5, 0.004, z - 0.5);
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }));
})();
grelha.visible = false;
cena.add(grelha);

// Marca da entrada: capacho do lado de dentro
const entrada = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.8), mat(0x2f2a26, { roughness: 1 }));
entrada.position.set(s.entrada.x, 0.01, s.entrada.z);
entrada.receiveShadow = true;
cena.add(entrada);

// Cursores: célula, vértice (início de parede) e aresta (porta / demolir)
const matCursor = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
const cursor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), matCursor);
cursor.position.y = 0.02;
cena.add(cursor);
const cursorVertice = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
cursorVertice.position.y = 0.3;
cena.add(cursorVertice);
const matCursorAresta = new THREE.MeshBasicMaterial({ color: 0xffe066 });
const cursorAresta = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.16), matCursorAresta);
cena.add(cursorAresta);
cursor.visible = cursorVertice.visible = cursorAresta.visible = false;

// ---------------------------------------------------------------------------
// Objetos construídos (reconstruídos quando versaoMapa muda)
// ---------------------------------------------------------------------------

const grupoMapa = new THREE.Group();
cena.add(grupoMapa);
/** Ecrã de cada secretária (por id), para acender quando alguém está a trabalhar. */
const ecras = new Map<number, THREE.Mesh>();

function criarObjeto(tipo: TipoObjeto, id: number): THREE.Group {
  if (tipo === 'planta') return criarPlanta(id);
  if (tipo === 'sofa') return criarSofa(id);
  if (tipo === 'cafe') return criarCafe();
  return criarMatraquilhos();
}

// Paredes e portas
const ALTURA_PAREDE = 1.38; // ≈ 2,3 m (as paredes viradas para a câmara baixam, ver cortarParedes)
const ESPESSURA = 0.1;
const geoParede = new THREE.BoxGeometry(1 + ESPESSURA, ALTURA_PAREDE, ESPESSURA);
const geoOmbreira = new THREE.BoxGeometry(0.1, ALTURA_PAREDE, ESPESSURA + 0.04);
const geoVerga = new THREE.BoxGeometry(1, 0.16, ESPESSURA);
const geoFolha = new THREE.BoxGeometry(0.8, ALTURA_PAREDE - 0.2, 0.04);
const matParede = materialPBR('painted_plaster_wall', [0.55, 0.6], { color: 0xf3f0ea, roughness: 0.9 });
const matTopoParede = mat(0x2d3038, { roughness: 0.7 });
const geoTopoParede = new THREE.BoxGeometry(1 + ESPESSURA, 0.04, ESPESSURA + 0.02);
const matFolha = mat(0xcfe6f0, { transparent: true, opacity: 0.3, roughness: 0.04, metalness: 0.4, depthWrite: false });
const matFantasma = new THREE.MeshBasicMaterial({ color: 0x6fd68b, transparent: true, opacity: 0.45, depthWrite: false });
const matFantasmaMau = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.45, depthWrite: false });

/** Coloca um objeto no centro de uma aresta, alinhado com ela. */
function colocarNaAresta(o: THREE.Object3D, a: Aresta, y = 0): void {
  if (a.tipo === 'v') {
    o.position.set(a.x - 0.5, y, a.z);
    o.rotation.y = Math.PI / 2;
  } else {
    o.position.set(a.x, y, a.z - 0.5);
    o.rotation.y = 0;
  }
}

// Janelas nas paredes que separam uma sala do exterior: peitoril, vidro com caixilho e padieira.
const PEITORIL = 0.5; // ≈ 0,83 m
const TOPO_JANELA = 1.2; // ≈ 2,0 m
const geoPeitoril = new THREE.BoxGeometry(1 + ESPESSURA, PEITORIL, ESPESSURA);
const geoPadieira = new THREE.BoxGeometry(1 + ESPESSURA, ALTURA_PAREDE - TOPO_JANELA, ESPESSURA);
const geoVidro = new THREE.PlaneGeometry(1, TOPO_JANELA - PEITORIL);
const geoCaixilhoH = new THREE.BoxGeometry(1 + ESPESSURA, 0.035, ESPESSURA + 0.025);
const geoCaixilhoV = new THREE.BoxGeometry(0.035, TOPO_JANELA - PEITORIL, ESPESSURA + 0.025);
const matCaixilho = mat(0x30343c, { roughness: 0.35, metalness: 0.7 });
const matVidro = new THREE.MeshPhysicalMaterial({
  color: 0xc9dbe8, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
  depthWrite: false, envMapIntensity: 1.4, emissive: 0xffd9a0, emissiveIntensity: 0,
});
/** Junta peças [geometria, x, y] numa só geometria. */
function juntar(partes: [THREE.BufferGeometry, number, number][]): THREE.BufferGeometry {
  return mergeGeometries(partes.map(([g, x, y]) => g.clone().translate(x, y, 0)))!;
}
// Com a base em y = 0, para a parede baixar a partir do chão.
const geoParedeBase = geoParede.clone().translate(0, ALTURA_PAREDE / 2, 0);
const geoJanelaParede = juntar([[geoPeitoril, 0, PEITORIL / 2], [geoPadieira, 0, (ALTURA_PAREDE + TOPO_JANELA) / 2]]);
const geoJanelaCaixilho = juntar([
  [geoCaixilhoH, 0, PEITORIL + 0.017], [geoCaixilhoH, 0, TOPO_JANELA - 0.017],
  ...[-0.5, 0, 0.5].map((x): [THREE.BufferGeometry, number, number] => [geoCaixilhoV, x, (PEITORIL + TOPO_JANELA) / 2]),
]);
const geoJanelaVidro = geoVidro.clone().translate(0, (PEITORIL + TOPO_JANELA) / 2, 0);

function criarPorta(): THREE.Group {
  const g = new THREE.Group();
  for (const lado of [-0.45, 0.45]) {
    const o = new THREE.Mesh(geoOmbreira, MAT.madeiraEscura);
    o.position.set(lado, ALTURA_PAREDE / 2, 0);
    g.add(o);
  }
  const verga = new THREE.Mesh(geoVerga, matParede);
  verga.position.y = ALTURA_PAREDE - 0.08;
  g.add(verga);
  const folha = new THREE.Mesh(geoFolha, matFolha);
  folha.position.y = (ALTURA_PAREDE - 0.2) / 2;
  g.add(folha);
  g.traverse((o) => { if (o !== folha) o.castShadow = o.receiveShadow = true; });
  return g;
}

function todasAsArestas(): Aresta[] {
  const r: Aresta[] = [];
  for (let z = 0; z < ALTURA; z++) for (let x = 0; x <= LARGURA; x++) r.push({ tipo: 'v', x, z });
  for (let z = 0; z <= ALTURA; z++) for (let x = 0; x < LARGURA; x++) r.push({ tipo: 'h', x, z });
  return r;
}
const ARESTAS = todasAsArestas();

/**
 * Paredes, janelas e topos: uma InstancedMesh por peça para o mapa inteiro (uma chamada de desenho em vez de
 * uma por segmento, também nas sombras e na oclusão). As portas continuam a ser grupos.
 */
function instancias(geo: THREE.BufferGeometry, material: THREE.Material, sombra = true): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(geo, material, ARESTAS.length);
  im.count = 0;
  im.castShadow = sombra;
  im.receiveShadow = true;
  im.frustumCulled = false;
  cena.add(im);
  return im;
}
const imParede = instancias(geoParedeBase, matParede);
const imJanela = instancias(geoJanelaParede, matParede);
const imCaixilho = instancias(geoJanelaCaixilho, matCaixilho);
const imVidro = instancias(geoJanelaVidro, matVidro, false);
imVidro.renderOrder = 3;
const imTopo = instancias(geoTopoParede, matTopoParede);

/** Paredes e portas desenhadas, para as baixar quando estão entre a câmara e o que se está a ver. */
interface Parede3D {
  aresta: Aresta;
  x: number;
  z: number;
  f: number; // fração da altura (1 = inteira)
  porta: THREE.Object3D | null;
  janela: boolean;
  i: number; // índice nas instâncias de paredes ou de janelas
  topo: number; // índice nas instâncias de topos
}
const paredes3D: Parede3D[] = [];
const ALTURA_CORTADA = 0.16; // fração da altura que fica (um murete)
const RODA_V = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const RODA_H = new THREE.Quaternion();
const mInst = new THREE.Matrix4();
const pInst = new THREE.Vector3();
const eInst = new THREE.Vector3();

function colocarParede(p: Parede3D): void {
  if (p.porta) {
    p.porta.scale.y = p.f;
    return;
  }
  const q = p.aresta.tipo === 'v' ? RODA_V : RODA_H;
  mInst.compose(pInst.set(p.x, 0, p.z), q, eInst.set(1, p.f, 1));
  if (p.janela) for (const im of [imJanela, imCaixilho, imVidro]) im.setMatrixAt(p.i, mInst);
  else imParede.setMatrixAt(p.i, mInst);
  mInst.compose(pInst.set(p.x, ALTURA_PAREDE * p.f + 0.02, p.z), q, eInst.set(1, 1, 1));
  imTopo.setMatrixAt(p.topo, mInst);
}

function instanciasMudaram(): void {
  for (const im of [imParede, imJanela, imCaixilho, imVidro, imTopo]) im.instanceMatrix.needsUpdate = true;
}

function cortarParedes(dt: number): void {
  const t = controlos.target;
  const c = camara.position;
  const n = Math.hypot(c.x - t.x, c.z - t.z) || 1;
  const dx = (c.x - t.x) / n;
  const dz = (c.z - t.z) / n;
  const k = Math.min(1, dt * 9);
  let mudou = false;
  for (const p of paredes3D) {
    const doLadoDaCamara = (p.x - t.x) * dx + (p.z - t.z) * dz > -0.8;
    const virada = p.aresta.tipo === 'h' ? Math.abs(dz) > 0.3 : Math.abs(dx) > 0.3;
    const alvo = doLadoDaCamara && virada ? ALTURA_CORTADA : 1;
    if (Math.abs(p.f - alvo) < 0.002) continue;
    p.f += (alvo - p.f) * k;
    colocarParede(p);
    mudou = true;
  }
  if (mudou) instanciasMudaram();
}

let versaoDesenhada = -1;
function sincronizarMapa(): void {
  if (versaoDesenhada === s.versaoMapa) return;
  versaoDesenhada = s.versaoMapa;
  // O corte de cada parede mantém-se quando o mapa muda (não volta a subir de repente).
  const corte = new Map(paredes3D.map((p) => [`${p.aresta.tipo}${p.aresta.x},${p.aresta.z}`, p.f]));
  grupoMapa.clear();
  ecras.clear();
  paredes3D.length = 0;
  // Uma parede leva janela quando tem uma sala de um lado e o exterior do outro.
  const salas = detetarSalas(s);
  const salaEm = (x: number, z: number) => (x < 0 || z < 0 || x >= LARGURA || z >= ALTURA ? -1 : salas.sala[z * LARGURA + x]);
  const exterior = (a: Aresta) => {
    const [p, q] = a.tipo === 'v' ? [salaEm(a.x - 1, a.z), salaEm(a.x, a.z)] : [salaEm(a.x, a.z - 1), salaEm(a.x, a.z)];
    return (p < 0) !== (q < 0);
  };
  for (const d of s.secretarias) {
    const m = criarSecretaria(d.id);
    m.grupo.position.set(d.x, 0, d.z);
    m.grupo.rotation.y = ((d.rot ?? 0) * Math.PI) / 2;
    grupoMapa.add(m.grupo);
    ecras.set(d.id, m.ecra);
  }
  for (const o of s.objetos) {
    const g = criarObjeto(o.tipo, o.id);
    g.position.set(o.x, 0, o.z);
    g.rotation.y = ((o.rot ?? 0) * Math.PI) / 2;
    grupoMapa.add(g);
  }
  let nParedes = 0;
  let nJanelas = 0;
  let nTopos = 0;
  for (const a of ARESTAS) {
    const v = lerAresta(s, a);
    if (v === NADA) continue;
    const x = a.tipo === 'v' ? a.x - 0.5 : a.x;
    const z = a.tipo === 'v' ? a.z : a.z - 0.5;
    const f = corte.get(`${a.tipo}${a.x},${a.z}`) ?? 1;
    let p: Parede3D;
    if (v === PORTA) {
      const porta = criarPorta();
      colocarNaAresta(porta, a);
      grupoMapa.add(porta);
      p = { aresta: a, x, z, f, porta, janela: false, i: -1, topo: -1 };
    } else {
      const janela = exterior(a);
      p = { aresta: a, x, z, f, porta: null, janela, i: janela ? nJanelas++ : nParedes++, topo: nTopos++ };
    }
    paredes3D.push(p);
    colocarParede(p);
  }
  imParede.count = nParedes;
  imJanela.count = imCaixilho.count = imVidro.count = nJanelas;
  imTopo.count = nTopos;
  instanciasMudaram();
  pintarChao();
}

// Pré-visualização de paredes enquanto se arrasta
const fantasma = new THREE.Group();
cena.add(fantasma);
let textoArrasto = '';
function mostrarFantasma(arestas: Aresta[], demolir: boolean): void {
  fantasma.clear();
  const custo = arestas.filter((a) => lerAresta(s, a) === NADA).length * ECON.custoParede;
  const m = demolir || custo > s.dinheiro ? matFantasmaMau : matFantasma;
  for (const a of arestas) {
    const o = new THREE.Mesh(geoParede, m);
    colocarNaAresta(o, a, ALTURA_PAREDE / 2);
    o.scale.y = demolir ? 1.05 : 1;
    fantasma.add(o);
  }
  textoArrasto = demolir
    ? `🔨 Demolir ${arestas.filter((a) => lerAresta(s, a) !== NADA).length} segmento(s)`
    : `🧱 ${arestas.length} segmento(s) — ${euros(custo)}`;
}

// Pré-visualização de secretárias e decoração (verde se der, vermelho se não)
const fantasmaModelo = new THREE.Group();
cena.add(fantasmaModelo);
let chaveFantasma = '';
let fantasmaValido: boolean | null = null;
function mostrarModelo(chave: string, x: number, z: number, valido: boolean, rot = 0): void {
  if (chave !== chaveFantasma) {
    fantasmaModelo.clear();
    fantasmaModelo.add(chave === 'secretaria' ? criarSecretaria(1).grupo : criarObjeto(chave as TipoObjeto, 7));
    chaveFantasma = chave;
    fantasmaValido = null;
  }
  if (valido !== fantasmaValido) {
    fantasmaValido = valido;
    fantasmaModelo.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = valido ? matFantasma : matFantasmaMau;
        o.castShadow = false;
      }
    });
  }
  fantasmaModelo.position.set(x, 0, z);
  fantasmaModelo.rotation.y = (rot * Math.PI) / 2;
  fantasmaModelo.visible = true;
}

// ---------------------------------------------------------------------------
// Funcionários
// ---------------------------------------------------------------------------

const bonecos = new Map<number, Pessoa>();
const formaBoneco = new Map<number, string>();
const idDoGrupo = new WeakMap<THREE.Object3D, number>();
let selecionado: number | null = null;

function especialidadeDe(c: Competencias): Area {
  return AREAS.reduce((m, a) => (c[a] > c[m] ? a : m), AREAS[0]);
}
const especialidade = (f: Funcionario) => especialidadeDe(f.competencias);

function limparBonecos(): void {
  for (const b of bonecos.values()) cena.remove(b.grupo);
  bonecos.clear();
}

/** Acompanha o estado: a posição é suavizada, a pose e a direção vêm do que cada um está a fazer. */
function sincronizarFuncionarios(dt: number, agora: number): void {
  const vivos = new Set<number>();
  const md = minutoDoDia(s);
  const horario = md >= 9 * 60 && md < 17 * 60;
  for (const m of ecras.values()) m.material = MAT.ecraDesligado;
  for (const f of s.funcionarios) {
    vivos.add(f.id);
    let b = bonecos.get(f.id);
    const forma = f.aparencia ? `${f.aparencia.sexo}${f.aparencia.modelo}` : '';
    if (b && formaBoneco.get(f.id) !== forma) {
      cena.remove(b.grupo);
      bonecos.delete(f.id);
      b = undefined;
    }
    if (b && f.aparencia) b.mudarCores(f.aparencia);
    if (!b) {
      b = new Pessoa(f.id, f.nome, f.aparencia);
      formaBoneco.set(f.id, forma);
      b.grupo.position.set(f.x, 0, f.z);
      cena.add(b.grupo);
      bonecos.set(f.id, b);
      idDoGrupo.set(b.grupo, f.id);
    }
    const g = b.grupo;
    b.anel.visible = f.id === selecionado;
    if (!f.dentro) {
      g.visible = false;
      g.position.set(f.x, 0, f.z);
      continue;
    }
    const acabouDeEntrar = !g.visible;
    g.visible = true;
    const sentado = f.estado === 'aTrabalhar';
    // A cadeira fica atrás da secretária, conforme a rotação dela.
    const angSec = sentado ? (((s.secretarias.find((d) => d.id === f.secretariaId)?.rot ?? 0) * Math.PI) / 2) : 0;
    const alvoX = f.x + (sentado ? CADEIRA_Z * Math.sin(angSec) : 0);
    const alvoZ = f.z + (sentado ? CADEIRA_Z * Math.cos(angSec) : 0);
    if (acabouDeEntrar) g.position.set(alvoX, 0, alvoZ);
    const dx = alvoX - g.position.x;
    const dz = alvoZ - g.position.z;
    const k = Math.min(1, dt * 14);
    g.position.x += dx * k;
    g.position.z += dz * k;
    const aAndar = Math.hypot(dx, dz) > 0.02 && !sentado;
    // Virado para onde anda; sentado, virado para o ecrã (−z).
    const rumo = sentado ? Math.PI + angSec : aAndar ? Math.atan2(dx, dz) : g.rotation.y;
    let d = rumo - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 12);
    const anda = aAndar || f.estado === 'aCaminho' || f.estado === 'aSair';
    const veloc = dt > 0 ? (Math.hypot(dx, dz) * k) / dt : 0;
    const aEscrever = sentado && horario && f.secretariaId !== null && f.projetoId !== null;
    b.atualizar(dt, sentado ? 'trabalhar' : anda ? 'andar' : 'parado', veloc, aEscrever);
    // Indicador de felicidade por cima da cabeça
    b.indicador.visible = def.indicadores || f.id === selecionado;
    b.indicador.position.y = (sentado ? ALTURA_INDICADOR.sentado : ALTURA_INDICADOR.pe) + Math.sin(agora / 400 + f.id) * 0.02;
    b.indicador.rotation.y = agora / 700 + f.id;
    const mi = b.indicador.material as THREE.MeshStandardMaterial;
    corFelicidade(f.felicidade, mi.color);
    mi.emissive.copy(mi.color);
    // Ecrã aceso de quem está a trabalhar (cor conforme a especialidade)
    if (sentado && horario && f.secretariaId !== null) {
      const e = ecras.get(f.secretariaId);
      const area = especialidade(f);
      if (e) e.material = area === 'programacao' ? MAT.ecraCodigo : area === 'design' ? MAT.ecraDesign : MAT.ecraLigado;
    }
  }
  for (const [id, b] of bonecos)
    if (!vivos.has(id)) {
      cena.remove(b.grupo);
      bonecos.delete(id);
    }
  if (selecionado !== null && !vivos.has(selecionado)) selecionado = null;
}

// ---------------------------------------------------------------------------
// Ferramentas e rato
// ---------------------------------------------------------------------------

type Ferramenta = 'selecionar' | 'parede' | 'porta' | 'secretaria' | 'decoracao' | 'demolir' | 'mover';
const FERRAMENTAS: { id: Ferramenta; icone: NomeIcone; nome: string; preco: string; tecla: string; dica: string }[] = [
  { id: 'selecionar', icone: 'mouse-pointer-2', nome: 'Selecionar', preco: '', tecla: '1', dica: 'Clica num funcionário para ver a ficha. Botão direito roda a câmara, botão do meio arrasta, roda faz zoom (ou WASD e Q/E).' },
  { id: 'parede', icone: 'brick-wall', nome: 'Parede', preco: euros(ECON.custoParede), tecla: '2', dica: 'Arrasta entre cantos da grelha para desenhar uma parede. Fecha uma zona para criar uma sala.' },
  { id: 'porta', icone: 'door-open', nome: 'Porta', preco: euros(ECON.custoPorta), tecla: '3', dica: 'Clica numa parede para lhe abrir uma porta. Sem porta, ninguém entra na sala.' },
  { id: 'secretaria', icone: 'monitor', nome: 'Secretária', preco: euros(ECON.custoSecretaria), tecla: '4', dica: 'Clica numa célula para colocar uma secretária. Cada funcionário precisa de uma.' },
  { id: 'decoracao', icone: 'sprout', nome: 'Decoração', preco: '', tecla: '5', dica: 'Escolhe um objeto e clica numa célula. Alegra quem trabalha na mesma sala (fora das salas, quem está perto).' },
  { id: 'mover', icone: 'move', nome: 'Mover', preco: '', tecla: '6', dica: 'Clica numa secretária ou objeto para o levantar e clica onde o queres pôr. R roda. Grátis.' },
  { id: 'demolir', icone: 'hammer', nome: 'Demolir', preco: '', tecla: '7', dica: 'Clica numa parede, porta, secretária ou objeto para o remover, ou arrasta para demolir paredes. Sem reembolso.' },
];
let ferramenta: Ferramenta = 'selecionar';
let objetoEscolhido: TipoObjeto = 'planta';
/** Rotação (quartos de volta) com que se coloca a próxima secretária ou objeto. */
let rotEscolhida = 0;
/** Móvel levantado com a ferramenta Mover. */
let pegado: { x: number; z: number; chave: string; rot: number } | null = null;
let ultimoPonto: THREE.Vector3 | null = null;

function escolherFerramenta(f: Ferramenta): void {
  ferramenta = f;
  arrasto = null;
  pegado = null;
  fantasma.clear();
  textoArrasto = '';
  atualizarCursores(null);
  atualizarUI();
}

const raio = new THREE.Raycaster();
const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rato = new THREE.Vector2();

function apontar(ev: MouseEvent): void {
  rato.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  raio.setFromCamera(rato, camara);
}

function pontoNoChao(ev: MouseEvent): THREE.Vector3 | null {
  apontar(ev);
  const p = new THREE.Vector3();
  return raio.ray.intersectPlane(planoChao, p) ? p : null;
}

/** Funcionário debaixo do rato (o boneco inteiro conta). */
function funcionarioEm(ev: MouseEvent): number | null {
  apontar(ev);
  const alvos = [...bonecos.values()].filter((b) => b.grupo.visible).map((b) => b.grupo);
  const hit = raio.intersectObjects(alvos, true)[0];
  let o: THREE.Object3D | null = hit?.object ?? null;
  while (o && !idDoGrupo.has(o)) o = o.parent;
  if (o) return idDoGrupo.get(o)!;
  // Os bonecos são pequenos: aceita também um clique no chão mesmo ao lado.
  const p = new THREE.Vector3();
  if (!raio.ray.intersectPlane(planoChao, p)) return null;
  let melhor: number | null = null;
  let dist = 0.6;
  for (const [id, b] of bonecos) {
    if (!b.grupo.visible) continue;
    const d = Math.hypot(b.grupo.position.x - p.x, b.grupo.position.z - p.z);
    if (d < dist) {
      dist = d;
      melhor = id;
    }
  }
  return melhor;
}

const limitar = (v: number, max: number) => Math.max(0, Math.min(max, v));
/** Vértice da grelha mais próximo (cantos das células, de 0 a largura/altura). */
function verticeDe(p: THREE.Vector3): { x: number; z: number } {
  return { x: limitar(Math.round(p.x + 0.5), LARGURA), z: limitar(Math.round(p.z + 0.5), ALTURA) };
}
/** Aresta debaixo do rato, se estiver perto o suficiente de uma linha da grelha. */
function arestaDe(p: THREE.Vector3): Aresta | null {
  const { aresta, distancia } = arestaMaisProxima(p.x + 0.5, p.z + 0.5);
  return distancia < 0.25 && lerAresta(s, aresta) !== NADA ? aresta : null;
}

let arrasto: { x: number; z: number } | null = null;
function segmentoArrasto(p: THREE.Vector3): Aresta[] {
  const v = verticeDe(p);
  return arrasto ? segmento(arrasto.x, arrasto.z, v.x, v.z) : [];
}

function atualizarCursores(p: THREE.Vector3 | null): void {
  cursor.visible = cursorVertice.visible = cursorAresta.visible = fantasmaModelo.visible = false;
  if (!p || menus.ecra) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  const naGrelha = x >= 0 && z >= 0 && x < LARGURA && z < ALTURA;
  if (ferramenta === 'parede' || (ferramenta === 'demolir' && arrasto)) {
    const v = verticeDe(p);
    cursorVertice.visible = true;
    cursorVertice.position.set(v.x - 0.5, 0.3, v.z - 0.5);
    if (arrasto) mostrarFantasma(segmentoArrasto(p), ferramenta === 'demolir');
    return;
  }
  if (ferramenta === 'porta' || ferramenta === 'demolir') {
    const a = arestaDe(p);
    if (a) {
      matCursorAresta.color.set(ferramenta === 'demolir' ? 0xff6b6b : 0xffe066);
      cursorAresta.visible = true;
      colocarNaAresta(cursorAresta, a, ALTURA_PAREDE + 0.05);
      return;
    }
  }
  if (!naGrelha) return;
  if (ferramenta === 'mover') {
    const aqui = secretariaEm(s, x, z) ?? objetoEm(s, x, z);
    if (pegado) {
      const mesma = x === pegado.x && z === pegado.z;
      const valido = mesma || (dentroDoEscritorio(s, x, z) && !aqui && !(x === s.entrada.x && z === s.entrada.z));
      mostrarModelo(pegado.chave, x, z, valido, pegado.rot);
      matCursor.color.set(valido ? 0x6fd68b : 0xff6b6b);
    } else matCursor.color.set(aqui ? 0xffe066 : 0x8892a6);
    cursor.visible = !!pegado || !!aqui;
    cursor.position.set(x, 0.02, z);
    return;
  }
  if (ferramenta === 'secretaria' || ferramenta === 'decoracao') {
    const custo = ferramenta === 'secretaria' ? ECON.custoSecretaria : OBJETOS[objetoEscolhido].custo;
    const ocupada = !dentroDoEscritorio(s, x, z) || !!secretariaEm(s, x, z) || !!objetoEm(s, x, z) || (x === s.entrada.x && z === s.entrada.z);
    const cheio = ferramenta === 'secretaria' && s.secretarias.length >= limiteSecretarias(s);
    const valido = !ocupada && !cheio && s.dinheiro >= custo;
    mostrarModelo(ferramenta === 'secretaria' ? 'secretaria' : objetoEscolhido, x, z, valido, rotEscolhida);
    matCursor.color.set(valido ? 0x6fd68b : 0xff6b6b);
    cursor.visible = true;
    cursor.position.set(x, 0.02, z);
  } else if (ferramenta === 'demolir' && (secretariaEm(s, x, z) || objetoEm(s, x, z))) {
    matCursor.color.set(0xff6b6b);
    cursor.visible = true;
    cursor.position.set(x, 0.02, z);
  }
}

/** Resultado de uma ação do jogador: som de sucesso, ou aviso com a razão. */
function resultado(r: Resultado, somOk?: () => void): void {
  if (r.ok) somOk?.();
  else if (r.msg) erro(r.msg);
}

renderer.domElement.addEventListener('pointermove', (ev) => {
  ultimoPonto = pontoNoChao(ev);
  if (ferramenta === 'selecionar') renderer.domElement.style.cursor = ambiente.casaEm(raio) !== null ? 'pointer' : '';
  atualizarCursores(ultimoPonto);
});

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 || menus.ecra) return;
  const p = pontoNoChao(ev);
  if (!p) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  if (ferramenta === 'selecionar') {
    const id = funcionarioEm(ev);
    const casa = id === null ? ambiente.casaEm(raio) : null;
    if (id !== null) {
      som.clique();
      selecionarPessoa(id, false);
    } else if (casa !== null) abrirCasa(casa);
    else selecionado = null;
    atualizarUI();
    return;
  }
  if (ferramenta === 'parede' || ferramenta === 'demolir') {
    arrasto = verticeDe(p);
    renderer.domElement.setPointerCapture(ev.pointerId);
    if (ferramenta === 'parede') mostrarFantasma([], false);
  } else if (ferramenta === 'secretaria') resultado(colocarSecretaria(s, x, z, rotEscolhida), som.construir);
  else if (ferramenta === 'decoracao') resultado(colocarObjeto(s, objetoEscolhido, x, z, rotEscolhida), som.construir);
  else if (ferramenta === 'mover') {
    if (pegado) {
      const r = moverMovel(s, pegado.x, pegado.z, x, z, pegado.rot);
      resultado(r, som.construir);
      if (r.ok) pegado = null;
    } else {
      const d = secretariaEm(s, x, z);
      const o = d ? undefined : objetoEm(s, x, z);
      if (d || o) {
        som.clique();
        pegado = { x, z, chave: d ? 'secretaria' : o!.tipo, rot: (d ?? o)!.rot ?? 0 };
      }
    }
  }
  else if (ferramenta === 'porta') {
    const a = arestaDe(p);
    resultado(a ? colocarPorta(s, a) : { ok: false, msg: 'As portas têm de ser colocadas numa parede.' }, som.construir);
  }
  atualizarCursores(p);
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (ev.button !== 0 || !arrasto) return;
  const p = pontoNoChao(ev);
  const inicio = arrasto;
  const arestas = p ? segmentoArrasto(p) : [];
  arrasto = null;
  fantasma.clear();
  textoArrasto = '';
  if (!p) return;
  if (ferramenta === 'parede') {
    if (arestas.length) resultado(colocarParedes(s, arestas), som.construir);
  } else if (arestas.length) {
    resultado(demolirArestas(s, arestas), som.demolir);
  } else {
    // Clique simples com Demolir: aresta perto do rato, senão o que estiver na célula
    const v = verticeDe(p);
    if (v.x === inicio.x && v.z === inicio.z) {
      const a = arestaDe(p);
      const cx = Math.round(p.x);
      const cz = Math.round(p.z);
      const r = a ? demolirArestas(s, [a]) : objetoEm(s, cx, cz) ? removerObjeto(s, cx, cz) : removerSecretaria(s, cx, cz);
      resultado(r, som.demolir);
    }
  }
  atualizarCursores(p);
});

// ---------------------------------------------------------------------------
// Teclado e câmara
// ---------------------------------------------------------------------------

const VELOCIDADES = [0, 24, 72, 200]; // minutos de jogo por segundo real
let velocidade = 1;
let velocidadeAntes = 1;
const teclas = new Set<string>();
let focoCamara: THREE.Vector3 | null = null;

addEventListener('keydown', (ev) => {
  const alvo = ev.target as HTMLElement;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo.tagName) && ev.key !== 'Escape') return;
  if (ev.key === 'Escape') {
    if (document.querySelector('.modal')) return;
    if (menus.ecra) menus.voltar();
    else if (pegado) {
      pegado = null;
      atualizarCursores(ultimoPonto);
    } else if (arrasto || ferramenta !== 'selecionar') escolherFerramenta('selecionar');
    else if (selecionado !== null) selecionado = null;
    else if (!s.falencia) abrirPausa();
    return;
  }
  if (menus.ecra) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
    ev.preventDefault();
    guardar();
    return;
  }
  if (ev.key.toLowerCase() === 'm' && !ev.ctrlKey && !ev.metaKey) {
    abrirMelhorias();
    return;
  }
  if (ev.key.toLowerCase() === 'r' && !ev.ctrlKey && !ev.metaKey) {
    // R roda: o que se vai colocar, o que está levantado, ou o móvel debaixo do rato.
    if (ferramenta === 'secretaria' || ferramenta === 'decoracao') rotEscolhida = (rotEscolhida + 1) % 4;
    else if (pegado) pegado.rot = (pegado.rot + 1) % 4;
    else if (ultimoPonto && (ferramenta === 'mover' || ferramenta === 'selecionar')) {
      if (rodarMovel(s, Math.round(ultimoPonto.x), Math.round(ultimoPonto.z)).ok) som.clique();
    }
    atualizarCursores(ultimoPonto);
    return;
  }
  const f = FERRAMENTAS.find((o) => o.tecla === ev.key);
  if (f) escolherFerramenta(f.id);
  if (ev.key === ' ') {
    ev.preventDefault();
    if (velocidade === 0) velocidade = velocidadeAntes || 1;
    else {
      velocidadeAntes = velocidade;
      velocidade = 0;
    }
    atualizarUI();
  }
  teclas.add(ev.key.toLowerCase());
});
addEventListener('keyup', (ev) => teclas.delete(ev.key.toLowerCase()));
addEventListener('blur', () => teclas.clear());

function moverAlvo(d: THREE.Vector3): void {
  const t = controlos.target.clone().add(d);
  t.x = Math.max(-12, Math.min(LARGURA + 40, t.x));
  t.z = Math.max(-70, Math.min(ALTURA + 72, t.z));
  const real = t.sub(controlos.target);
  controlos.target.add(real);
  camara.position.add(real);
}

function moverCamara(dt: number): void {
  if (menus.ecra) return;
  const tem = (...k: string[]) => k.some((x) => teclas.has(x));
  const frente = (tem('w', 'arrowup') ? 1 : 0) - (tem('s', 'arrowdown') ? 1 : 0);
  const lado = (tem('d', 'arrowright') ? 1 : 0) - (tem('a', 'arrowleft') ? 1 : 0);
  const rodar = (tem('q') ? 1 : 0) - (tem('e') ? 1 : 0);
  if (frente || lado) {
    focoCamara = null;
    const f = new THREE.Vector3().subVectors(controlos.target, camara.position).setY(0).normalize();
    const direita = new THREE.Vector3(-f.z, 0, f.x);
    const v = dt * Math.max(6, camara.position.distanceTo(controlos.target) * 0.8);
    moverAlvo(f.multiplyScalar(frente * v).add(direita.multiplyScalar(lado * v)));
  }
  if (rodar) {
    const o = camara.position.clone().sub(controlos.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), rodar * dt * 1.6);
    camara.position.copy(controlos.target).add(o);
  }
  if (focoCamara) {
    const d = focoCamara.clone().sub(controlos.target).setY(0);
    if (d.length() < 0.05) focoCamara = null;
    else moverAlvo(d.multiplyScalar(Math.min(1, dt * 5)));
  }
}

const estadosCasas = new Map<number, EstadoCasa>();
function atualizarBairro(): void {
  estadosCasas.clear();
  for (const i of s.imoveis ?? []) estadosCasas.set(i.id, i.arrendada ? 'arrendada' : 'tua');
  if (s.morada !== undefined) estadosCasas.set(s.morada, 'morada');
  ambiente.marcarCasas(estadosCasas);
  ambiente.estacionamento((s.carros ?? []).map((c) => CARROS[c.modelo].cor), s.funcionarios.filter((f) => f.dentro).length);
}

function selecionarPessoa(id: number, focar: boolean): void {
  selecionado = id;
  const b = bonecos.get(id);
  if (focar && b?.grupo.visible) focoCamara = new THREE.Vector3(b.grupo.position.x, 0, b.grupo.position.z);
}

// ---------------------------------------------------------------------------
// Interface: barra de cima, ferramentas, painel lateral, notícias, avisos e ficha
// ---------------------------------------------------------------------------

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const e = t.content.firstElementChild as HTMLElement;
  document.body.appendChild(e);
  return e;
}

function esc(texto: string): string {
  return texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Só substitui o HTML quando muda, para não perder o foco nem o hover. */
function definir(e: HTMLElement, html: string): void {
  if (e.dataset.html !== html) {
    e.dataset.html = html;
    e.innerHTML = html;
  }
}

const ICONE_TIPO: Record<TipoSoftware, string> = {
  utilitario: ic('calculator'), editor: ic('file-text'), antivirus: ic('shield'), jogo: ic('gamepad-2'), ia: ic('sparkles'),
};
const ICONE_OBJ: Record<TipoObjeto, NomeIcone> = { planta: 'sprout', sofa: 'sofa', cafe: 'coffee', matraquilhos: 'trophy' };
const ICONE_CAMPANHA: Record<IdCampanha, NomeIcone> = { redes: 'smartphone', imprensa: 'newspaper', feira: 'presentation' };
/** Tira o emoji do início das mensagens do jogo (a interface mostra ícones próprios). */
const semEmoji = (texto: string) => texto.replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u, '');
/** Valor curto: 3,4 M€ · 650 k€ · 900 €. */
function compacto(v: number): string {
  const a = Math.abs(v);
  const sinal = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sinal}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',')} M€`;
  if (a >= 1e4) return `${sinal}${Math.round(a / 1e3)} k€`;
  return euros(v);
}
const percentagem = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1).replace('.', ',')}%`;
/** Linha de tendência em SVG. */
function sparkline(valores: number[], largura = 84, altura = 26): string {
  const tendencia = valores.length > 1 && valores[valores.length - 1] < valores[0] ? 'desce' : 'sobe';
  if (valores.length < 2) return `<svg class="spark" viewBox="0 0 ${largura} ${altura}"></svg>`;
  const min = Math.min(...valores);
  const d = Math.max(...valores) - min || 1;
  const pts = valores.map((v, i) => `${((i / (valores.length - 1)) * largura).toFixed(1)},${(altura - 2 - ((v - min) / d) * (altura - 4)).toFixed(1)}`).join(' ');
  return `<svg class="spark ${tendencia}" viewBox="0 0 ${largura} ${altura}" preserveAspectRatio="none"><polyline points="${pts}"/></svg>`;
}
const SIGLA_AREA: Record<Area, string> = { programacao: 'Prog', design: 'Des', testes: 'Test' };
const COR_FEL = (f: number) => (f >= 70 ? '#34d399' : f >= 40 ? '#fbbf24' : '#f87171');
const CARA_FEL = (f: number) => ic(f >= 85 ? 'laugh' : f >= 70 ? 'smile' : f >= 40 ? 'meh' : 'frown');
const mesesTexto = (m: number) => m.toFixed(1).replace('.', ',');

function avatar(nome: string, area: Area, grande = false): string {
  const ini = nome.split(' ').map((p) => p[0]).slice(0, 2).join('');
  return `<div class="avatar a-${area} ${grande ? 'grande' : ''}" title="${esc(nome)}">${esc(ini)}</div>`;
}

function barrasCompetencias(c: Competencias): string {
  const forte = especialidadeDe(c);
  return `<div class="comps">${AREAS.map((a) => {
    const v = Math.round(c[a] * 100);
    return `<div class="comp a-${a} ${a === forte ? 'forte' : ''}" title="${NOME_AREA[a]} ${v}"><span>${SIGLA_AREA[a]}</span>
      <div class="barra"><div style="width:${v}%"></div></div><b>${v}</b></div>`;
  }).join('')}</div>`;
}

function classeEstado(f: Funcionario): string {
  if (deBaixa(s, f) || ['semSecretaria', 'semAcesso', 'preso'].includes(f.estado)) return 'mau';
  return f.estado === 'aTrabalhar' ? 'bom' : '';
}

/** Nome do estado, com as baixas (que não são um estado de movimento). */
function nomeEstado(f: Funcionario): string {
  if (deBaixa(s, f)) return `De baixa · ${Math.ceil((f.baixaAte! - s.minuto) / MIN_POR_DIA)} d`;
  return NOME_ESTADO[f.estado];
}

// --- Barra de cima ---------------------------------------------------------

const topo = el(`<div id="topo" class="ui hud">
  <div class="grupo vidro marca">
    <span class="logo">SL</span><span class="empresa"></span>
    <button class="nivel-emblema" data-jogo="melhorias" title="Nível da empresa e melhorias (M)">
      <svg viewBox="0 0 40 40"><defs><linearGradient id="gradNivel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c8cff"/><stop offset="1" stop-color="#c084fc"/>
      </linearGradient></defs><circle class="fundo" cx="20" cy="20" r="17"/><circle class="arco" cx="20" cy="20" r="17"/></svg>
      <b class="n">1</b><span class="pontos"></span>
    </button>
  </div>
  <div class="grupo vidro numeros">
    <div class="chip dinheiro" title="Dinheiro em caixa"><span class="ic">${ic('wallet')}</span><b class="valor"></b><span class="delta"></span></div>
    <div class="chip saldo" title="Previsão para o próximo fecho do mês: vendas − salários − renda"><span class="ic seta">${ic('trending-up')}</span><span class="valor"></span></div>
    <div class="chip avaliacao-topo" data-jogo="mercado" title="Avaliação da empresa e lugar no ranking (separador Mercado)"><span class="ic">${ic('landmark')}</span><span class="valor"></span><span class="lugar"></span></div>
    <div class="chip" title="Funcionários"><span class="ic">${ic('users')}</span><span class="equipa"></span></div>
    <div class="chip" title="Felicidade média"><span class="ic cara">${ic('smile')}</span><span class="felicidade"></span></div>
    <div class="chip serie" title="Meses seguidos com lucro: cada um dá mais experiência"><span class="ic">${ic('flame')}</span><span class="valor"></span></div>
  </div>
  <div class="grupo vidro tempo">
    <div class="chip relogio"><span class="ic ceu">${ic('sun')}</span><span class="data"></span><b class="hora"></b></div>
    <div class="velocidades">
      <button data-vel="0" title="Pausa (Espaço)">${ic('pause')}</button><button data-vel="1" title="Normal">${ic('play')}</button>
      <button data-vel="2" title="Rápido">${ic('fast-forward')}</button><button data-vel="3" title="Muito rápido">${ic('zap')}</button>
    </div>
  </div>
  <div class="grupo vidro direita">
    <span class="guardado"></span>
    <button data-jogo="guardar" class="icone" title="Guardar (Ctrl+S)">${ic('save')}</button>
    <button data-jogo="menu" class="icone" title="Menu (Esc)">${ic('menu')}</button>
  </div>
</div>`);

topo.addEventListener('click', (ev) => {
  const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-jogo="mercado"]');
  if (chip) {
    som.clique();
    separador = 'mercado';
    painelAberto = true;
    atualizarUI();
    return;
  }
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  som.clique();
  if (b.dataset.vel) velocidade = Number(b.dataset.vel);
  else if (b.dataset.jogo === 'guardar') guardar();
  else if (b.dataset.jogo === 'menu') abrirPausa();
  else if (b.dataset.jogo === 'melhorias') abrirMelhorias();
  atualizarUI();
});

// --- Ferramentas -----------------------------------------------------------

const barraFerramentas = el(`<div id="ferramentas" class="ui vidro hud">${FERRAMENTAS.map((f) => `
  <button data-ferr="${f.id}" class="ferr" title="${f.dica}"><span class="ic">${ic(f.icone)}</span><span class="nome">${f.nome}</span>
    ${f.preco ? `<span class="preco">${f.preco}</span>` : ''}<kbd>${f.tecla}</kbd></button>`).join('')}</div>`);
const barraObjetos = el(`<div id="objetos" class="ui vidro hud">${LISTA_OBJETOS.map((o) => `
  <button data-obj="${o}" class="obj" title="${OBJETOS[o].descricao}"><span class="ic">${ic(ICONE_OBJ[o])}</span>
    <span class="txt"><b>${OBJETOS[o].nome}</b><small>${euros(OBJETOS[o].custo)} · felicidade +${OBJETOS[o].felicidade}</small></span></button>`).join('')}</div>`);
const dica = el(`<div id="dica" class="ui hud"></div>`);

barraFerramentas.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b?.dataset.ferr) return;
  som.clique();
  escolherFerramenta(b.dataset.ferr as Ferramenta);
});
barraObjetos.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b?.dataset.obj) return;
  som.clique();
  objetoEscolhido = b.dataset.obj as TipoObjeto;
  atualizarUI();
});

// --- Painel lateral com separadores ----------------------------------------

type Separador = 'projetos' | 'equipa' | 'contratar' | 'produtos' | 'pesquisa' | 'mercado' | 'empresa' | 'numeros';
const SEPARADORES: { id: Separador; icone: NomeIcone; nome: string }[] = [
  { id: 'projetos', icone: 'folder-kanban', nome: 'Projetos' },
  { id: 'equipa', icone: 'users', nome: 'Equipa' },
  { id: 'contratar', icone: 'user-plus', nome: 'Contratar' },
  { id: 'produtos', icone: 'package', nome: 'Produtos' },
  { id: 'pesquisa', icone: 'flask-conical', nome: 'Pesquisa' },
  { id: 'mercado', icone: 'building-2', nome: 'Mercado' },
  { id: 'empresa', icone: 'landmark', nome: 'Empresa' },
  { id: 'numeros', icone: 'chart-column', nome: 'Números' },
];
let separador: Separador = 'projetos';
let painelAberto = true;

const lateral = el(`<div id="lateral" class="ui vidro hud">
  <nav class="separadores">${SEPARADORES.map((t) => `
    <button data-sep="${t.id}" title="${t.nome}"><span class="ic">${ic(t.icone)}</span><span class="nome">${t.nome}</span><i class="badge"></i></button>`).join('')}
    <button data-painel title="Esconder / mostrar o painel" class="recolher">${ic('chevron-right')}</button>
  </nav>
  <div class="conteudo">
    <section data-sec="projetos">
      <div id="lista-projetos"></div>
      <div class="cartao novo-projeto">
        <h3>${ic('sparkles')} Novo projeto</h3>
        <input type="text" id="nome-projeto" placeholder="Nome do produto (opcional)" maxlength="30">
        <div id="config-projeto"></div>
      </div>
    </section>
    <section data-sec="equipa"><div id="p-equipa"></div></section>
    <section data-sec="contratar"><div id="p-candidatos"></div></section>
    <section data-sec="produtos"><div id="p-produtos"></div></section>
    <section data-sec="pesquisa"><div id="p-pesquisa"></div></section>
    <section data-sec="empresa"><div id="p-empresa"></div></section>
    <section data-sec="mercado"><div id="p-mercado"></div></section>
    <section data-sec="numeros">
      <div class="cartao"><h3>${ic('chart-line')} Últimos 24 meses</h3><canvas id="grafico"></canvas>
        <div class="legenda"><span class="l-rec">Receitas</span><span class="l-desp">Despesas</span><span class="l-caixa">Caixa</span></div></div>
      <div id="p-numeros"></div>
    </section>
  </div>
</div>`);

const caixaNoticias = el(`<div id="noticias" class="ui vidro hud"><div class="cab"><span>${ic('newspaper')} Notícias</span><button data-recolher title="Esconder / mostrar">${ic('minus')}</button></div><div class="lista"></div></div>`);
const caixaAvisos = el(`<div id="avisos" class="ui"></div>`);
const ficha = el(`<div id="ficha" class="ui vidro hud"></div>`);
const fim = el(`<div id="fim" class="ui"></div>`);
const painelMissoes = new PainelMissoes();
document.body.append(painelMissoes.raiz);

// Janelas que param o jogo (críticas, melhorias) sem serem menus.
let pausasModais = 0;
const celebracoes = new Celebracoes(() => pausasModais++, () => {
  pausasModais = Math.max(0, pausasModais - 1);
});

let janelaMelhorias: HTMLElement | null = null;
function abrirMelhorias(): void {
  if (montra || janelaMelhorias || menus.ecra || celebracoes.aberta) return;
  som.clique();
  pausasModais++;
  const j = el(`<div class="modal" id="j-melhorias">${htmlMelhorias(s)}</div>`);
  janelaMelhorias = j;
  const tecla = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape' && ev.key.toLowerCase() !== 'm') return;
    ev.stopPropagation();
    ev.preventDefault();
    fechar();
  };
  const fechar = () => {
    som.clique();
    j.remove();
    janelaMelhorias = null;
    pausasModais = Math.max(0, pausasModais - 1);
    removeEventListener('keydown', tecla, true);
  };
  addEventListener('keydown', tecla, true);
  j.addEventListener('click', (ev) => {
    const alvo = ev.target as HTMLElement;
    if (alvo === j || alvo.closest('[data-fechar]')) return fechar();
    const b = alvo.closest('[data-melhoria]') as HTMLElement | null;
    if (!b) return;
    const id = b.dataset.melhoria as IdMelhoria;
    const r = comprarMelhoria(s, id);
    if (!r.ok) return r.msg ? erro(r.msg) : undefined;
    som.melhoria();
    j.innerHTML = htmlMelhorias(s);
    j.querySelector(`[data-melhoria="${id}"]`)?.classList.add('acabada');
    confetes.disparar(centroDoEscritorio());
    atualizarUI();
  });
}

/** Centro das secretárias (ou do terreno), para confetes, moedas e números. */
function centroDoEscritorio(): THREE.Vector3 {
  const c = new THREE.Vector3();
  const ds = s.secretarias.length ? s.secretarias : [{ x: LARGURA / 2, z: ALTURA / 2 }];
  for (const d of ds) c.add(new THREE.Vector3(d.x, 0, d.z));
  return c.divideScalar(ds.length);
}

function paraEcra(v: THREE.Vector3): [number, number] {
  const p = v.clone().project(camara);
  return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight];
}

/** Símbolos a sair de quem está a trabalhar: azul código, rosa design, verde testes. */
let relogioParticulas = 0;
function emitirTrabalho(dt: number): void {
  const vel = montra ? 1 : menus.ecra || pausasModais ? 0 : velocidade;
  relogioParticulas += dt * Math.min(vel, 2);
  const md = minutoDoDia(s);
  if (md < HORA_INICIO * 60 || md >= HORA_FIM * 60) return;
  const ativos = s.funcionarios.filter((f) => f.estado === 'aTrabalhar' && f.projetoId !== null);
  if (!ativos.length || relogioParticulas < 1.5 / ativos.length) return;
  relogioParticulas = 0;
  const f = ativos[Math.floor(Math.random() * ativos.length)];
  const b = bonecos.get(f.id);
  const p = s.projetos.find((o) => o.id === f.projetoId);
  const a = p ? areaDeTrabalho(p, f) : null;
  if (b && b.grupo.visible && a) particulas.trabalho(a, b.grupo.position);
}

caixaNoticias.querySelector('[data-recolher]')!.addEventListener('click', () => {
  caixaNoticias.classList.toggle('recolhido');
  som.clique();
});
ficha.addEventListener('click', (ev) => {
  if ((ev.target as HTMLElement).closest('[data-fechar]')) {
    selecionado = null;
    atualizarUI();
  }
});

lateral.addEventListener('click', async (ev) => {
  const alvo = ev.target as HTMLElement;
  const b = alvo.closest('button');
  if (b?.dataset.sep) {
    som.clique();
    separador = b.dataset.sep as Separador;
    painelAberto = true;
    atualizarUI();
    return;
  }
  if (b?.hasAttribute('data-painel')) {
    som.clique();
    painelAberto = !painelAberto;
    atualizarUI();
    return;
  }
  if (!b) {
    // Clicar no cartão de uma pessoa seleciona-a e leva a câmara até ela.
    const c = alvo.closest<HTMLElement>('[data-pessoa]');
    if (c && !alvo.closest('select')) {
      som.clique();
      selecionarPessoa(Number(c.dataset.pessoa), true);
      atualizarUI();
    }
    return;
  }
  const a = b.dataset.acao;
  if (!a) return;
  som.clique();
  if (a === 'contratar') resultado(contratar(s, Number(b.dataset.i)), som.dinheiro);
  else if (a === 'despedir') {
    const f = s.funcionarios.find((o) => o.id === Number(b.dataset.id));
    if (f && await confirmar(`Despedir <b>${esc(f.nome)}</b>?`, 'Despedir')) resultado(despedir(s, f.id));
  } else if (a === 'tipo') {
    tipoEscolhido = b.dataset.tipo as TipoSoftware;
    funcEscolhidas = [];
    escolherSequela(null);
  } else if (a === 'projeto') {
    const input = document.getElementById('nome-projeto') as HTMLInputElement | null;
    const equipa = equipaEscolhida();
    const r = equipa.length === 0
      ? { ok: false, msg: 'Escolhe pelo menos uma pessoa para a equipa.' }
      : iniciarProjeto(s, input?.value ?? '', tipoEscolhido, funcEscolhidas, equipa.map((f) => f.id), sequelaEscolhida);
    resultado(r, som.evento);
    if (r.ok) {
      funcEscolhidas = [];
      marcacoes.clear();
      if (input) input.value = '';
      sequelaEscolhida = null;
      nomeSugerido = '';
    }
  } else if (a === 'update') {
    const i = plataformaDe(s);
    const equipa = equipaEscolhida();
    const r = i === undefined ? { ok: false, msg: 'Ainda não tens um produto lançado.' }
      : equipa.length === 0 ? { ok: false, msg: 'Escolhe pelo menos uma pessoa para a equipa.' }
      : iniciarUpdate(s, i, updEscolhidas, equipa.map((f) => f.id));
    resultado(r, som.evento);
    if (r.ok) { updEscolhidas = []; marcacoes.clear(); }
  } else if (a === 'servidor') {
    const i = plataformaDe(s);
    const n = Number(b.dataset.nivel);
    const sv = SERVIDORES[n];
    if (i !== undefined && sv && await confirmar(`Mudar para <b>${sv.nome}</b>?<br><small>Aguenta ${capacidadeServidor(s, n).toLocaleString('pt-PT')} utilizadores e custa ${euros(sv.custo)}/mês${n > (s.produtos[i].servidor ?? 0) ? `. A migração custa ${euros(sv.custo * 2)}` : ''}.</small>`, 'Mudar'))
      resultado(mudarServidor(s, i, n), som.dinheiro);
  } else if (a === 'plano') {
    const i = plataformaDe(s);
    if (i !== undefined) {
      const pl = { ...(s.produtos[i].plano ?? { gratis: false, preco: PLATAFORMA.precoReferencia, anuncios: false }) };
      const o = b.dataset.op;
      if (o === 'gratis') { pl.gratis = !pl.gratis; if (!pl.gratis) { pl.anuncios = false; if (pl.preco === 0) pl.preco = PLATAFORMA.precoReferencia; } }
      else if (o === 'anuncios') pl.anuncios = !pl.anuncios;
      else if (o === 'sem-pago') pl.preco = 0;
      else pl.preco = Math.max(pl.gratis ? 0 : 1, Math.round((pl.preco + Number(o)) * 100) / 100);
      resultado(definirPlano(s, i, pl));
    }
  } else if (a === 'crunch') {
    resultado(alternarCrunch(s, Number(b.dataset.id)), som.evento);
  } else if (a === 'patch') {
    resultado(iniciarManutencao(s, Number(b.dataset.produto)), som.evento);
  } else if (a === 'pesquisar') {
    const id = (b.dataset.tec || null) as IdTecnologia | null;
    resultado(escolherPesquisa(s, id));
  } else if (a === 'financiar') {
    resultado(financiarPesquisa(s), som.dinheiro);
  } else if (a === 'modo') {
    modoNovo = b.dataset.modo === 'contrato' ? 'contrato' : 'produto';
  } else if (a === 'oferta') {
    ofertaEscolhida = Number(b.dataset.oferta);
  } else if (a === 'contrato') {
    const equipa = equipaEscolhida();
    const r = ofertaEscolhida === null ? { ok: false, msg: 'Escolhe uma oferta.' }
      : aceitarContrato(s, ofertaEscolhida, equipa.map((f) => f.id));
    resultado(r, som.evento);
    if (r.ok) {
      marcacoes.clear();
      ofertaEscolhida = null;
    }
  } else if (a === 'campanha') {
    resultado(lancarCampanha(s, Number(b.dataset.id), b.dataset.campanha as IdCampanha), som.dinheiro);
  } else if (a === 'ronda') {
    const id = b.dataset.ronda as IdRonda;
    const d = RONDAS[id];
    const pct = `${Math.round(d.parte * 100)}%`;
    if (await confirmar(`Vender <b>${pct}</b> da empresa por <b>${euros(valorDaRonda(s, id))}</b>?<br><small>Os investidores passam a ficar com ${pct} do lucro de cada mês (dividendos).</small>`, 'Vender'))
      resultado(levantarRonda(s, id), som.dinheiro);
  } else if (a === 'escritorio') {
    const i = Number(b.dataset.i);
    const e = ESCRITORIOS[i];
    const renda = rendaDe(s) + e.renda - (ESCRITORIOS[s.escritorio ?? 0]?.renda ?? 0);
    if (await confirmar(`Mudar para <b>${e.nome}</b> (${e.largura}×${e.altura}) por <b>${euros(e.custo)}</b>?<br><small>A renda passa a ${euros(renda)}/mês. As paredes e a mobília ficam onde estão.</small>`, 'Mudar'))
      resultado(mudarEscritorio(s, i), som.dinheiro);
  } else if (a === 'comprar-rival') {
    const r = s.rivais.find((o) => o.id === Number(b.dataset.id));
    if (r && await confirmar(`Comprar a <b>${esc(r.nome)}</b> por <b>${euros(precoAquisicao(r))}</b>?<br><small>Sai do ranking e passa a dar-te cerca de ${euros(Math.round(r.valor * AQUISICAO.lucroMensal))} de lucro por mês.</small>`, 'Comprar'))
      resultado(comprarRival(s, r.id), som.dinheiro);
  } else if (a === 'bolsa') {
    const encaixe = Math.round(avaliarEmpresa(s).total * BOLSA.parteVendida * (1 - s.participacao));
    if (await confirmar(`Entrar em bolsa e vender <b>${Math.round(BOLSA.parteVendida * 100)}%</b> da tua parte por <b>${euros(encaixe)}</b>?<br><small>Os acionistas ficam com essa parte do lucro. Só se faz uma vez.</small>`, 'Entrar em bolsa'))
      resultado(entrarEmBolsa(s), som.dinheiro);
  } else if (a === 'personagem') {
    abrirEditorPersonagem();
  } else if (a === 'casa') {
    abrirCasa(Number(b.dataset.id));
  } else if (a === 'ver-bairro') {
    focoCamara = new THREE.Vector3(LARGURA + 22, 0, ALTURA / 2);
  } else if (a === 'comprar-carro') {
    const d = CARROS[b.dataset.modelo as IdCarro];
    if (await confirmar(`Comprar um carro <b>${d.nome.toLowerCase()}</b> por <b>${euros(d.preco)}</b>?<br><small>Manutenção: ${euros(d.preco * PATRIMONIO.manutencaoCarro)}/mês. Perde ${Math.round((1 - PATRIMONIO.carroNovo) * 100)}% do valor mal sai do stand.</small>`, 'Comprar'))
      resultado(comprarCarro(s, b.dataset.modelo as IdCarro), som.dinheiro);
  } else if (a === 'vender-carro') {
    const c = s.carros?.find((o) => o.id === Number(b.dataset.id));
    if (c && await confirmar(`Vender o carro <b>${CARROS[c.modelo].nome.toLowerCase()}</b> por <b>${euros(valorCarro(s, c))}</b>?`, 'Vender'))
      resultado(venderCarro(s, c.id), som.dinheiro);
  } else if (a === 'feira') {
    resultado(irAFeira(s, b.dataset.feira!), som.dinheiro);
  } else if (a === 'formacao') {
    resultado(iniciarFormacao(s, Number(b.dataset.id), b.dataset.area as Area), som.dinheiro);
  } else if (a === 'cancelar') {
    if (await confirmar('Cancelar o projeto? <b>O trabalho feito perde-se.</b>', 'Cancelar projeto'))
      resultado(cancelarProjeto(s, Number(b.dataset.id)));
  }
  atualizarUI();
});
// Funcionalidades: marcar junta as dependências, desmarcar tira o que dependia delas.
lateral.addEventListener('change', (ev) => {
  const c = ev.target as HTMLInputElement;
  const id = c.dataset.func;
  if (id) {
    funcEscolhidas = c.checked
      ? comDependencias(tipoEscolhido, [...funcEscolhidas, id])
      : semDependentes(tipoEscolhido, funcEscolhidas, id);
  } else if (c.dataset.upd) {
    const i = plataformaDe(s);
    if (i !== undefined) {
      const p = s.produtos[i];
      const todas = c.checked
        ? comDependencias(p.tipo, [...p.funcionalidades, ...updEscolhidas, c.dataset.upd])
        : semDependentes(p.tipo, [...p.funcionalidades, ...updEscolhidas], c.dataset.upd);
      updEscolhidas = todas.filter((f) => !p.funcionalidades.includes(f));
    }
  } else if (c.dataset.membro) {
    marcacoes.set(Number(c.dataset.membro), c.checked);
  } else if (c.hasAttribute('data-sequela')) {
    const valor = (c as unknown as HTMLSelectElement).value;
    escolherSequela(valor === '' ? null : Number(valor));
  } else if (c.dataset.equipa) {
    const valor = (c as unknown as HTMLSelectElement).value;
    resultado(definirEquipa(s, Number(c.dataset.equipa), valor === '' ? null : Number(valor)));
  }
  som.clique();
  atualizarUI();
});

// Escolhas do próximo projeto (estado só da interface)
let modoNovo: 'produto' | 'contrato' = 'produto';
let ofertaEscolhida: number | null = null;
let tipoEscolhido: TipoSoftware = 'utilitario';
let funcEscolhidas: string[] = [];
/** Funcionalidades novas escolhidas para o próximo update da plataforma. */
let updEscolhidas: string[] = [];
/** Escolhas feitas à mão nas caixas da equipa; quem não foi mexido entra se estiver sem projeto. */
const marcacoes = new Map<number, boolean>();
/** Produto (índice em s.produtos) de que o próximo projeto é uma nova versão. */
let sequelaEscolhida: number | null = null;
/** Último nome sugerido para a sequela (só se troca o nome se o jogador não o tiver mudado). */
let nomeSugerido = '';

function escolherSequela(indice: number | null): void {
  sequelaEscolhida = indice;
  const input = document.getElementById('nome-projeto') as HTMLInputElement | null;
  const nome = indice === null ? '' : nomeSequela(s, indice);
  if (input && (input.value === '' || input.value === nomeSugerido)) input.value = nome;
  nomeSugerido = nome;
}

function equipaEscolhida(): Funcionario[] {
  return s.funcionarios.filter((f) => marcacoes.get(f.id) ?? f.projetoId === null);
}

/** Janela de confirmação (substitui o confirm do browser). */
function confirmar(texto: string, sim: string): Promise<boolean> {
  return new Promise((resolver) => {
    const e = el(`<div class="modal"><div class="janela estreita"><p>${texto}</p>
      <div class="linha-botoes"><button data-r="0">Voltar</button><button data-r="1" class="perigo">${sim}</button></div></div></div>`);
    e.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      if (!b) return;
      som.clique();
      e.remove();
      resolver(b.dataset.r === '1');
    });
  });
}

// --- Conteúdo dos separadores ----------------------------------------------

function htmlListaProjetos(): string {
  if (s.projetos.length === 0) return '<div class="vazio">Nenhum projeto em curso. Começa um produto ou aceita um contrato aqui em baixo.</div>';
  const nivel = nivelDaEmpresa(s);
  return s.projetos.map((p) => {
    const pct = Math.min(100, (p.trabalhoFeito / p.trabalhoTotal) * 100);
    const funcs = p.funcionalidades.map((id) => TIPOS[p.tipo].funcionalidades.find((f) => f.id === id)!.nome);
    const membros = membrosDe(s, p.id);
    const prev = mesesRestantes(p, membros, coordenacaoDe(s), velocidadeDe(s));
    const alvo = p.manutencao !== undefined ? s.produtos[p.manutencao] : undefined;
    const doUpdate = p.update !== undefined ? s.produtos[p.update] : undefined;
    const q = Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s));
    const c = p.contrato;
    const dias = c ? Math.ceil((c.prazo - s.minuto) / MIN_POR_DIA) : 0;
    const sub = c ? `Contrato · ${esc(c.cliente)}`
      : alvo ? `Patch · ${Math.round(alvo.bugs ?? 0)} bugs por corrigir`
      : doUpdate ? `Update ${(doUpdate.updates ?? 0) + 1} de «${esc(doUpdate.nome)}»${funcs.length ? ` · ${funcs.join(', ')}` : ' · melhorias'}`
      : `${TIPOS[p.tipo].nome}${p.sequela ? ` · versão ${p.sequela.versao}` : ''}${funcs.length ? ` · ${funcs.join(', ')}` : ''}`;
    const stats = alvo
      ? `<div><b>${Math.round(alvo.bugs ?? 0)}</b><small>bugs</small></div>
        <div><b>${Number.isFinite(prev) ? mesesTexto(prev) : '—'}</b><small>${Number.isFinite(prev) ? 'meses' : 'parado'}</small></div>
        <div><b>${Math.round(fatorBugs(alvo.bugs ?? 0) * 100)}%</b><small>vendas</small></div>`
      : c
      ? `<div><b>${Math.round(q * 100)}%</b><small>qualidade</small></div>
        <div><b class="${c.atrasado ? 'mau' : dias <= 5 ? 'aviso' : ''}">${c.atrasado ? 'atrasado' : dias <= 0 ? 'hoje' : `${dias} d`}</b><small>prazo</small></div>
        <div><b>${compacto(pagamentoDoContrato(c, q))}</b><small>pagamento</small></div>`
      : `<div><b>${Math.round(q * 100)}%</b><small>qualidade</small></div>
        <div><b>${Number.isFinite(prev) ? mesesTexto(prev) : '—'}</b><small>${Number.isFinite(prev) ? 'meses' : 'parado'}</small></div>
        <div><b>${p.hype ? `+${Math.round(p.hype * 100)}%` : '—'}</b><small>expectativa</small></div>`;
    const crunch = `<button class="mini largo crunch ${p.crunch ? 'ligado' : ''}" data-acao="crunch" data-id="${p.id}"
      title="Horas extra: +${Math.round((CRUNCH.velocidade - 1) * 100)}% de ritmo, mas a equipa cansa-se, há mais baixas e mais bugs.">
      ${ic('flame')} ${p.crunch ? 'Horas extra ligadas — desligar' : 'Fazer horas extra'}</button>`;
    const marketing = c || alvo || doUpdate ? '' : `<div class="marketing"><div class="rotulo">${ic('megaphone')} Marketing</div><div class="campanhas">${LISTA_CAMPANHAS.map((id) => {
      const d = CAMPANHAS[id];
      const feita = p.campanhas?.includes(id) ?? false;
      const bloq = nivel < d.nivel;
      return `<button class="campanha ${feita ? 'feita' : ''}" data-acao="campanha" data-id="${p.id}" data-campanha="${id}" ${feita || bloq ? 'disabled' : ''}
        title="${d.descricao} Expectativa +${Math.round(d.hype * 100)}% (menos se já houver muita).">${ic(feita ? 'check' : bloq ? 'lock' : ICONE_CAMPANHA[id])}
        <span>${d.nome}</span><small>${feita ? 'feita' : bloq ? `nível ${d.nivel}` : euros(d.custo)}</small></button>`;
    }).join('')}</div></div>`;
    return `<div class="cartao projeto ${c ? 'contrato' : ''} ${p.crunch ? 'em-crunch' : ''}">
      <div class="cab"><span class="ic-tipo">${c ? ic('briefcase') : alvo ? ic('bug') : doUpdate ? ic('refresh-cw') : ICONE_TIPO[p.tipo]}</span>
        <div class="cresce"><b>${esc(p.nome)}</b><small>${sub}</small></div>
        <button class="mini perigo icone-mini" data-acao="cancelar" data-id="${p.id}" title="Cancelar (o trabalho perde-se)">${ic('x')}</button></div>
      <div class="progresso"><div style="width:${pct.toFixed(1)}%"></div><span>${pct.toFixed(0)}%</span></div>
      <div class="stats3">${stats}</div>
      ${AREAS.filter((a) => totalDaArea(p, a) > 0).map((a) => {
        const v = Math.min(100, (p.feito[a] / totalDaArea(p, a)) * 100);
        return `<div class="area a-${a}"><span>${NOME_AREA[a]}</span><div class="barra"><div style="width:${v.toFixed(1)}%"></div></div></div>`;
      }).join('')}
      <div class="chips-equipa">${membros.length
        ? membros.map((f) => avatar(f.nome, especialidade(f))).join('')
          + (membros.length > 1 ? `<small>rendimento ${Math.round(eficienciaEquipa(membros.length, coordenacaoDe(s)) * 100)}% por pessoa</small>` : '')
        : `<span class="aviso">${ic('triangle-alert')} Sem equipa: o projeto está parado.</span>`}</div>
      ${crunch}
      ${marketing}
    </div>`;
  }).join('');
}

function htmlDivisao(tipo: TipoSoftware): string {
  const d = TIPOS[tipo];
  return `<div class="divisao">${AREAS.map((a) => {
    const v = Math.round(d.areas[a] * 100);
    return `<div class="a-${a}" style="flex:${d.areas[a]}" title="${NOME_AREA[a]} ${v}%">${v >= 15 ? `${SIGLA_AREA[a]} ${v}%` : ''}</div>`;
  }).join('')}</div>`;
}

function htmlEscolhaEquipa(equipa: Funcionario[]): string {
  const pessoas = s.funcionarios.map((f) => {
    const outro = s.projetos.find((p) => p.id === f.projetoId);
    const on = equipa.includes(f);
    return `<label class="opcao-check pessoa-check ${on ? 'on' : ''}"><input type="checkbox" data-membro="${f.id}" ${on ? 'checked' : ''}>${avatar(f.nome, especialidade(f))}
      <span class="cresce"><b>${esc(f.nome)}</b><small>${AREAS.map((a) => `${SIGLA_AREA[a]} ${Math.round(f.competencias[a] * 100)}`).join(' · ')}${outro ? ` · sai de «${esc(outro.nome)}»` : ''}</small></span></label>`;
  }).join('');
  return `<div class="rotulo">Equipa${equipa.length > 1 ? ` · rendimento ${Math.round(eficienciaEquipa(equipa.length, coordenacaoDe(s)) * 100)}% por pessoa` : ''}</div>
    ${pessoas ? `<div class="lista-checks">${pessoas}</div>` : '<div class="vazio aviso">Contrata alguém primeiro (separador Contratar).</div>'}`;
}

function htmlConfigProjeto(): string {
  const modos = `<div class="segmentos modo">
    <button data-acao="modo" data-modo="produto" class="${modoNovo === 'produto' ? 'ativo' : ''}">${ic('rocket')} Produto próprio</button>
    <button data-acao="modo" data-modo="contrato" class="${modoNovo === 'contrato' ? 'ativo' : ''}">${ic('briefcase')} Contrato${s.ofertas.length ? ` <i class="conta">${s.ofertas.length}</i>` : ''}</button>
  </div>`;
  return modos + (modoNovo === 'contrato' ? htmlConfigContrato() : htmlConfigProduto());
}

function htmlConfigProduto(): string {
  if (plataformaDe(s) !== undefined) return htmlConfigUpdate();
  const emCurso = s.projetos.find(eProdutoNovo);
  if (emCurso) return `<div class="vazio">${ic('rocket')} A empresa tem um só produto: <b>${esc(emCurso.nome)}</b> está em desenvolvimento. Depois do lançamento, faz-lhe updates aqui.</div>`;
  if (!tipoDisponivel(s, tipoEscolhido)) tipoEscolhido = 'utilitario';
  const d = TIPOS[tipoEscolhido];
  const equipa = equipaEscolhida();
  funcEscolhidas = funcEscolhidas.filter((id) => funcionalidadeDisponivel(s, tipoEscolhido, id));
  const previsao = estimarProjeto(equipa, tipoEscolhido, funcEscolhidas, coordenacaoDe(s), velocidadeDe(s));
  previsao.qualidade = Math.min(1, previsao.qualidade + bonusQualidade(s));
  const mercado = fatorMercado(s, tipoEscolhido);
  const era = eraAtual(s);
  sequelaEscolhida = null;
  const vendas = vendasIniciais(tipoEscolhido, funcEscolhidas, previsao.qualidade, mercado)
    * fatorEra(s, tipoEscolhido, funcEscolhidas)
    * (temMelhoria(s, 'marketing') ? 1.15 : 1);
  const tipos = LISTA_TIPOS.map((t) => {
    const livre = tipoDisponivel(s, t);
    const n = TIPOS[t].produtosNecessarios;
    return `<button data-acao="tipo" data-tipo="${t}" class="tipo ${t === tipoEscolhido ? 'ativo' : ''}" ${livre ? '' : 'disabled'}
      title="${livre ? TIPOS[t].descricao : `Precisa de ${n} produto${n === 1 ? '' : 's'} lançado${n === 1 ? '' : 's'}`}">
      <span class="ic">${livre ? ICONE_TIPO[t] : ic('lock')}</span><b>${TIPOS[t].nome}</b>
      <small>${livre ? `${Math.round(trabalhoDoProjeto(t, []) / 1000)}k pontos` : `${n} produto${n === 1 ? '' : 's'}`}</small></button>`;
  }).join('');
  const funcs = d.funcionalidades.map((f) => {
    const req = f.requer.map((r) => d.funcionalidades.find((o) => o.id === r)!.nome);
    const on = funcEscolhidas.includes(f.id);
    const procura = procuraFuncionalidade(era, tipoEscolhido, f.id);
    const tag = procura > 1.05 ? ` <span class="tag-era sobe" title="Muito procurada na ${era.nome}">${ic('trending-up')}</span>`
      : procura < 0.95 ? ` <span class="tag-era desce" title="Já pouco procurada na ${era.nome}">${ic('trending-down')}</span>` : '';
    if (!funcionalidadeDisponivel(s, tipoEscolhido, f.id)) {
      const tec = TECNOLOGIAS[f.tecnologia!];
      return `<label class="opcao-check bloqueada" title="Investiga primeiro ${tec.nome} (separador Pesquisa)"><input type="checkbox" disabled><span class="caixa">${ic('lock')}</span>
      <span class="cresce"><b>${f.nome}${tag}</b><small>precisa da tecnologia ${tec.nome}</small></span></label>`;
    }
    return `<label class="opcao-check ${on ? 'on' : ''}"><input type="checkbox" data-func="${f.id}" ${on ? 'checked' : ''}><span class="caixa">${ic('check')}</span>
      <span class="cresce"><b>${f.nome}${tag}</b><small>+${(f.trabalho / 1000).toFixed(0)}k pontos · +${Math.round(f.valor * procura * 100)}% vendas${req.length ? ` · precisa de ${req.join(', ')}` : ''}</small></span></label>`;
  }).join('');
  const meses = previsao.meses;
  return `
    <div class="tipos">${tipos}</div>
    <p class="descricao">${d.descricao}</p>
    <div class="nota">${ic('star')} A empresa vive de <b>um só produto</b>: escolhe bem. Depois do lançamento ganha utilizadores, defines os planos de preço, aguentas os servidores e lanças updates.</div>
    <div class="rotulo">Trabalho por área</div>
    ${htmlDivisao(tipoEscolhido)}
    ${funcs ? `<div class="rotulo">Funcionalidades</div><div class="lista-checks">${funcs}</div>` : ''}
    ${htmlEscolhaEquipa(equipa)}
    <div class="previsao">
      <div><small>Duração</small><b>${Number.isFinite(meses) ? `${mesesTexto(meses)} m` : equipa.length ? '> 3 anos' : '—'}</b></div>
      <div><small>Qualidade</small><b>${equipa.length ? `${Math.round(previsao.qualidade * 100)}%` : '—'}</b></div>
      <div><small>Receita 1.º mês</small><b>${equipa.length ? euros(vendas) : '—'}</b></div>
    </div>
    <div class="nota">${era.icone} ${era.nome}: procura de ${d.plural.toLowerCase()} a ${Math.round((era.tipos[tipoEscolhido] ?? 1) * 100)}%.</div>
    <div class="nota">Durante o desenvolvimento podes fazer campanhas de marketing para vender mais no lançamento.</div>
    <button data-acao="projeto" class="primario largo">${ic('rocket')} Começar desenvolvimento · ${trabalhoDoProjeto(tipoEscolhido, funcEscolhidas).toLocaleString('pt-PT')} pontos</button>`;
}

/** Formulário do próximo update da plataforma: funcionalidades novas (ou só melhorias) e a equipa. */
function htmlConfigUpdate(): string {
  const i = plataformaDe(s)!;
  const p = s.produtos[i];
  const d = TIPOS[p.tipo];
  const emCurso = updateDe(s, i);
  if (emCurso) {
    const pct = Math.round((emCurso.trabalhoFeito / emCurso.trabalhoTotal) * 100);
    return `<div class="vazio">${ic('refresh-cw')} O update ${(p.updates ?? 0) + 1} de <b>${esc(p.nome)}</b> está a ${pct}%. Acompanha-o na lista de projetos.</div>`;
  }
  const disponiveis = new Set(funcionalidadesParaUpdate(s, i));
  updEscolhidas = updEscolhidas.filter((f) => disponiveis.has(f));
  const equipa = equipaEscolhida();
  const era = eraAtual(s);
  const funcs = d.funcionalidades.filter((f) => !p.funcionalidades.includes(f.id)).map((f) => {
    const on = updEscolhidas.includes(f.id);
    const procura = procuraFuncionalidade(era, p.tipo, f.id);
    if (!disponiveis.has(f.id)) {
      const tec = TECNOLOGIAS[f.tecnologia!];
      return `<label class="opcao-check bloqueada" title="Investiga primeiro ${tec.nome} (separador Pesquisa)"><input type="checkbox" disabled><span class="caixa">${ic('lock')}</span>
      <span class="cresce"><b>${f.nome}</b><small>precisa da tecnologia ${tec.nome}</small></span></label>`;
    }
    const req = f.requer.filter((x) => !p.funcionalidades.includes(x)).map((x) => d.funcionalidades.find((o) => o.id === x)!.nome);
    return `<label class="opcao-check ${on ? 'on' : ''}"><input type="checkbox" data-upd="${f.id}" ${on ? 'checked' : ''}><span class="caixa">${ic('check')}</span>
      <span class="cresce"><b>${f.nome}</b><small>+${(f.trabalho / 1000).toFixed(0)}k pontos · +${Math.round(f.valor * procura * 100)}% atração${req.length ? ` · precisa de ${req.join(', ')}` : ''}</small></span></label>`;
  }).join('');
  const meses = (s.minuto - (p.ultimoUpdate ?? p.lancadoEm)) / MIN_POR_MES;
  return `<div class="cartao"><h3>${ICONE_TIPO[p.tipo]} Update ${(p.updates ?? 0) + 1} de «${esc(p.nome)}»</h3>
      <div class="nota">Cada update melhora a qualidade e junta as funcionalidades escolhidas. Sem updates há mais de ${PLATAFORMA.semUpdateMeses} meses, os utilizadores ficam insatisfeitos${meses > PLATAFORMA.semUpdateMeses ? ` — <b class="mau">já lá vão ${mesesTexto(meses)} m</b>` : ` (último há ${mesesTexto(meses)} m)`}.</div></div>
    ${funcs ? `<div class="rotulo">Funcionalidades novas</div><div class="lista-checks">${funcs}</div>` : '<div class="nota">Já tens todas as funcionalidades: o update traz só melhorias de qualidade.</div>'}
    ${htmlEscolhaEquipa(equipa)}
    <button data-acao="update" class="primario largo">${ic('refresh-cw')} Começar update${updEscolhidas.length ? ` · ${updEscolhidas.length} funcionalidade${updEscolhidas.length === 1 ? '' : 's'}` : ' · só melhorias'}</button>`;
}

/** Previsão de um contrato com esta equipa: dias de trabalho e qualidade. */
function preverContrato(o: OfertaContrato, equipa: Funcionario[]): { dias: number; qualidade: number } {
  const p: Projeto = {
    id: 0, nome: '', tipo: o.tipo, funcionalidades: [], trabalhoFeito: 0, trabalhoTotal: o.trabalho,
    feito: { programacao: 0, design: 0, testes: 0 }, somaQualidade: { programacao: 0, design: 0, testes: 0 },
  };
  const meses = mesesRestantes(p, equipa, coordenacaoDe(s));
  const qualidade = Math.min(1, estimarProjeto(equipa, o.tipo, [], coordenacaoDe(s)).qualidade + bonusQualidade(s));
  return { dias: Number.isFinite(meses) ? Math.ceil(meses * DIAS_POR_MES) : Infinity, qualidade };
}

function htmlConfigContrato(): string {
  if (s.ofertas.length === 0)
    return '<div class="vazio">Não há mais ofertas este mês. Chegam três novas no início de cada mês.</div>';
  if (!s.ofertas.some((o) => o.id === ofertaEscolhida)) ofertaEscolhida = s.ofertas[0].id;
  const o = s.ofertas.find((x) => x.id === ofertaEscolhida)!;
  const equipa = equipaEscolhida();
  const prev = preverContrato(o, equipa);
  const atraso = prev.dias > o.prazoDias;
  const pago = pagamentoDoContrato({ cliente: o.cliente, pagamento: o.pagamento, prazo: 0, atrasado: atraso }, prev.qualidade);
  const ofertas = s.ofertas.map((x) => `<button class="oferta ${x.id === o.id ? 'ativo' : ''}" data-acao="oferta" data-oferta="${x.id}">
      <span class="ic-tipo">${ICONE_TIPO[x.tipo]}</span>
      <span class="cresce"><b>${esc(x.encomenda)}</b><small>${esc(x.cliente)} · ${(x.trabalho / 1000).toFixed(1).replace('.', ',')}k pontos</small></span>
      <span class="vendas"><b>${euros(x.pagamento)}</b><small>${x.prazoDias} dias</small></span></button>`).join('');
  return `<div class="nota">Trabalho por encomenda: paga no fim, conforme a qualidade. Se passar o prazo, o cliente paga só 60%.</div>
    <div class="lista-ofertas">${ofertas}</div>
    <div class="rotulo">Trabalho por área</div>
    ${htmlDivisao(o.tipo)}
    ${htmlEscolhaEquipa(equipa)}
    <div class="previsao">
      <div><small>Duração</small><b class="${atraso ? 'mau' : ''}">${equipa.length ? (Number.isFinite(prev.dias) ? `${prev.dias} d` : '—') : '—'}</b></div>
      <div><small>Prazo</small><b>${o.prazoDias} d</b></div>
      <div><small>Pagamento</small><b>${equipa.length ? euros(pago) : '—'}</b></div>
    </div>
    ${equipa.length && atraso ? `<div class="nota aviso">${ic('triangle-alert')} Com esta equipa não chegas a tempo.</div>` : ''}
    <button data-acao="contrato" class="primario largo">${ic('briefcase')} Assinar contrato · ${o.trabalho.toLocaleString('pt-PT')} pontos</button>`;
}

function htmlMercado(): string {
  const a = avaliarEmpresa(s);
  const rk = rankingEmpresas(s);
  const lugar = rk.findIndex((l) => l.jogador) + 1;
  const eu = rk[lugar - 1];
  const partes: [string, number, string][] = [
    ['Caixa', a.caixa, 'p-caixa'], ['Produtos', a.produtos, 'p-produtos'], ['Projetos', a.projetos, 'p-projetos'],
    ['Equipa', a.equipa, 'p-equipa'], ['Marca', a.marca, 'p-marca'], ['Escritório', a.ativos, 'p-ativos'],
  ];
  const variacao = eu.historico.length ? `<span class="var ${eu.variacao >= 0 ? 'sobe' : 'desce'}">${ic(eu.variacao >= 0 ? 'arrow-up-right' : 'arrow-down-right')}${percentagem(eu.variacao)}</span>` : '';
  const ranking = rk.map((l, i) => `<div class="lugar ${l.jogador ? 'eu' : ''}">
      <span class="pos p${i + 1}">${i + 1}</span>
      <span class="cresce"><b>${esc(l.nome)}</b><small>${l.jogador ? 'A tua empresa' : `${TIPOS[l.tipo!].plural}`}</small></span>
      ${sparkline(l.jogador ? [...l.historico, l.valor] : l.historico, 56, 20)}
      <span class="valor"><b>${compacto(l.valor)}</b><small class="${l.variacao >= 0 ? 'sobe' : 'desce'}">${l.historico.length ? percentagem(l.variacao) : ''}</small></span>
    </div>`).join('');
  const rondas = LISTA_RONDAS.map((id) => {
    const d = RONDAS[id];
    const feita = s.rondas.includes(id);
    const r = podeLevantar(s, id);
    return `<div class="ronda ${feita ? 'feita' : r.ok ? 'pode' : ''}">
      <span class="cresce"><b>${d.nome} · ${Math.round(d.parte * 100)}%</b><small>${d.descricao} Nível ${d.nivel}, avaliação de ${compacto(d.avaliacaoMinima)}.</small></span>
      ${feita ? `<span class="estado bom">${ic('check')} Feita</span>`
        : r.ok ? `<button class="mini primario" data-acao="ronda" data-ronda="${id}">Receber ${compacto(valorDaRonda(s, id))}</button>`
          : `<span class="estado" title="${esc(r.msg ?? '')}">${ic('lock')} ${esc(r.msg ?? '')}</span>`}
    </div>`;
  }).join('');
  return `<div class="cartao avaliacao">
      <div class="linha"><span class="rotulo">Avaliação da empresa</span><span class="lugar-rk">${lugar}.º lugar</span></div>
      <div class="valor-grande">${euros(a.total)}${variacao}</div>
      ${sparkline([...eu.historico, a.total], 320, 46)}
      <div class="barra-partes">${partes.filter((p) => p[1] > 0).map((p) => `<i class="${p[2]}" style="flex:${p[1]}" title="${p[0]} ${euros(p[1])}"></i>`).join('')}</div>
      <div class="partes">${partes.map((p) => `<div><i class="${p[2]}"></i><span>${p[0]}</span><b class="${p[1] < 0 ? 'mau' : ''}">${compacto(p[1])}</b></div>`).join('')}</div>
      ${s.participacao > 0 ? `<div class="nota">Os investidores têm ${Math.round(s.participacao * 100)}% da empresa: a tua parte vale <b>${euros(Math.round(a.total * (1 - s.participacao)))}</b>.</div>` : ''}
    </div>
    <div class="cartao"><h3>${ic('trophy')} Ranking de empresas <small>atualiza no fecho do mês</small></h3><div class="ranking">${ranking}</div></div>
    <div class="cartao"><h3>${ic('handshake')} Investidores <small>${s.participacao ? `têm ${Math.round(s.participacao * 100)}%` : 'ainda nenhum'}</small></h3>
      <div class="nota">Vende uma parte da empresa por dinheiro já. Em troca, os investidores ficam com essa parte do lucro de cada mês.</div>
      ${rondas}</div>`;
}

const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function htmlEmpresa(): string {
  const atual = s.escritorio;
  const escritorios = atual === undefined ? '<div class="nota">Já tens o terreno todo.</div>' : ESCRITORIOS.map((e, i) => {
    const pode = i > atual && s.dinheiro >= e.custo;
    const renda = e.renda > 0 ? `+${euros(e.renda)} de renda por mês` : e.renda < 0 ? `${euros(-e.renda)} a menos de renda por mês` : 'Renda normal';
    return `<div class="ronda ${i === atual ? 'feita' : pode ? 'pode' : ''}">
      <span class="cresce"><b>${e.nome} · ${e.largura}×${e.altura}</b><small>${renda} · até ${e.secretarias} secretárias${e.custo ? ` · mudança ${euros(e.custo)}` : ''}</small></span>
      ${i === atual ? `<span class="estado bom">${ic('house')} Atual</span>` : i < atual ? '' : `<button class="mini ${pode ? 'primario' : ''}" data-acao="escritorio" data-i="${i}" ${pode ? '' : 'disabled'}>Mudar</button>`}
    </div>`;
  }).join('');
  const nivel = nivelDaEmpresa(s);
  const subs = (s.subsidiarias ?? []).map((d) => `<div class="lugar"><span class="pos">${ic('briefcase')}</span>
      <span class="cresce"><b>${esc(d.nome)}</b><small>${TIPOS[d.tipo].plural}</small></span>
      <span class="valor"><b>${compacto(d.valor)}</b><small class="sobe">+${compacto(d.valor * AQUISICAO.lucroMensal)}/mês</small></span></div>`).join('');
  const rivais = nivel < AQUISICAO.nivelMinimo
    ? `<div class="nota">${ic('lock')} Precisas do nível ${AQUISICAO.nivelMinimo} para comprar concorrentes (estás no ${nivel}).</div>`
    : [...s.rivais].sort((a, b) => precoAquisicao(a) - precoAquisicao(b)).map((r) => {
      const preco = precoAquisicao(r);
      const pode = s.dinheiro >= preco;
      return `<div class="lugar"><span class="cresce"><b>${esc(r.nome)}</b><small>${TIPOS[r.tipo].plural} · lucro ${compacto(r.valor * AQUISICAO.lucroMensal)}/mês</small></span>
        <button class="mini ${pode ? 'primario' : ''}" data-acao="comprar-rival" data-id="${r.id}" ${pode ? '' : 'disabled'}>Comprar ${compacto(preco)}</button></div>`;
    }).join('');
  let bolsa: string;
  if (s.bolsa) {
    const h = s.bolsa.historico;
    const p = precoAcao(s);
    const ant = h[h.length - 2] ?? p;
    bolsa = `<div class="valor-grande">${p.toFixed(2).replace('.', ',')} €<span class="var ${p >= ant ? 'sobe' : 'desce'}">${ic(p >= ant ? 'arrow-up-right' : 'arrow-down-right')}${percentagem(ant ? p / ant - 1 : 0)}</span></div>
      ${sparkline(h, 320, 46)}
      <div class="nota">Preço de cada uma das ${BOLSA.acoes.toLocaleString('pt-PT')} ações, atualizado no fecho do mês. Acionistas e investidores têm ${Math.round(s.participacao * 100)}% da empresa.</div>`;
  } else {
    const r = podeEntrarEmBolsa(s);
    bolsa = `<div class="nota">Vende ${Math.round(BOLSA.parteVendida * 100)}% da tua parte ao público. É preciso o nível ${BOLSA.nivelMinimo} e uma avaliação de ${compacto(BOLSA.valorMinimo)}.</div>
      ${r.ok ? `<button class="primario largo" data-acao="bolsa">${ic('chart-line')} Entrar em bolsa (${compacto(avaliarEmpresa(s).total * BOLSA.parteVendida * (1 - s.participacao))})</button>`
        : `<span class="estado">${ic('lock')} ${esc(r.msg ?? '')}</span>`}`;
  }
  const agora = feirasDisponiveis(s);
  const feiras = FEIRAS.map((f) => {
    const pode = agora.includes(f);
    return `<div class="ronda ${pode ? 'pode' : ''}">
      <span class="cresce"><b>${f.icone} ${esc(f.nome)}</b><small>${esc(f.descricao)} Em ${MESES_NOME[f.mes]} · ${euros(f.custo)}</small></span>
      ${pode ? `<button class="mini primario" data-acao="feira" data-feira="${f.id}" ${s.dinheiro >= f.custo ? '' : 'disabled'}>Ir</button>` : ''}
    </div>`;
  }).join('');
  return `<div class="cartao"><h3>${ic('building-2')} Escritório <small>${atual === undefined ? 'terreno todo' : ESCRITORIOS[atual].nome}</small></h3>
      <div class="nota">Só podes construir dentro do escritório (o chão escuro ainda não é teu). Muda-te para um maior quando a equipa crescer.</div>
      ${escritorios}</div>
    ${htmlPatrimonio()}
    <div class="cartao"><h3>${ic('presentation')} Feiras e eventos <small>uma vez por ano</small></h3>
      <div class="nota">Mostrar o trabalho numa feira dá expectativa aos projetos em curso e vendas aos produtos.</div>${feiras}</div>
    <div class="cartao"><h3>${ic('briefcase')} Aquisições <small>${subs ? `${s.subsidiarias!.length} subsidiária(s)` : 'nenhuma'}</small></h3>
      ${subs ? `<div class="ranking">${subs}</div>` : ''}
      <div class="ranking">${rivais}</div></div>
    <div class="cartao"><h3>${ic('chart-line')} Bolsa <small>${s.bolsa ? 'cotada' : 'ainda não'}</small></h3>${bolsa}</div>`;
}

function estadoCasa(id: number): string {
  const i = imovelDe(s, id);
  if (s.morada === id) return i ? 'Tua · moras aqui' : 'Alugada · moras aqui';
  if (i) return i.arrendada ? 'Tua · arrendada' : 'Tua · vazia';
  return 'À venda';
}

function htmlPatrimonio(): string {
  const casas = [...(s.imoveis ?? []).map((i) => i.id), ...(s.casaAlugada !== undefined ? [s.casaAlugada] : [])];
  const listaCasas = casas.map((id) => {
    const d = defCasa(id);
    return `<div class="lugar"><span class="pos">${ic(imovelDe(s, id)?.arrendada ? 'key-round' : 'house')}</span>
      <span class="cresce"><b>${esc(d.morada)}</b><small>${d.tipologia} · ${estadoCasa(id)} · vale ${compacto(valorCasa(s, id))}</small></span>
      <button class="mini" data-acao="casa" data-id="${id}">Abrir</button></div>`;
  }).join('');
  const carros = (s.carros ?? []).map((c) => {
    const d = CARROS[c.modelo];
    return `<div class="lugar"><span class="pos" style="color:#${d.cor.toString(16).padStart(6, '0')}">${ic('car')}</span>
      <span class="cresce"><b>${d.nome}</b><small>vale ${euros(valorCarro(s, c))}</small></span>
      <button class="mini perigo" data-acao="vender-carro" data-id="${c.id}">Vender</button></div>`;
  }).join('');
  const cheio = (s.carros?.length ?? 0) >= PATRIMONIO.lugares;
  const stand = LISTA_CARROS.map((m) => {
    const d = CARROS[m];
    const pode = !cheio && s.dinheiro >= d.preco;
    return `<div class="ronda ${pode ? 'pode' : ''}"><span class="cresce"><b>${d.nome}</b><small>${esc(d.descricao)} · ${euros(d.preco)}</small></span>
      <button class="mini ${pode ? 'primario' : ''}" data-acao="comprar-carro" data-modelo="${m}" ${pode ? '' : 'disabled'}>Comprar</button></div>`;
  }).join('');
  const morada = s.morada === undefined ? 'Ainda não tens casa.' : `Moras na ${esc(defCasa(s.morada).morada)}.`;
  return `<div class="cartao"><h3>${ic('house')} Casas <small>prestígio ${Math.round(prestigio(s) * 100)}%</small></h3>
      <div class="resumo">
        <div><small>Património</small><b>${compacto(valorPatrimonio(s))}</b></div>
        <div><small>Rendas</small><b class="bom">+${euros(rendasRecebidas(s))}</b></div>
        <div><small>Custos</small><b>${euros(custosPatrimonio(s))}</b></div>
      </div>
      <div class="nota">${morada} Clica numa casa do bairro (do outro lado do estacionamento) para a comprar, alugar ou arrendar. Onde moras e os teus carros dão prestígio: aparecem candidatos melhores.</div>
      ${listaCasas ? `<div class="ranking">${listaCasas}</div>` : ''}
      <button class="largo" data-acao="ver-bairro">${ic('house')} Ver o bairro</button></div>
    <div class="cartao"><h3>${ic('car')} Carros <small>${s.carros?.length ?? 0}/${PATRIMONIO.lugares} lugares</small></h3>
      <div class="nota">Ficam no estacionamento ao lado do escritório, junto aos carros da equipa.</div>
      ${carros ? `<div class="ranking">${carros}</div>` : ''}${stand}</div>`;
}

/** Janela de uma casa do bairro: comprar, alugar, arrendar, morar ou vender. */
function abrirCasa(id: number): void {
  if (document.querySelector('#j-casa')) return;
  som.clique();
  pausasModais++;
  const j = el(`<div class="modal" id="j-casa"></div>`);
  const desenhar = () => {
    const d = defCasa(id);
    const i = imovelDe(s, id);
    const valor = valorCasa(s, id);
    const renda = rendaCasa(s, id);
    const botoes: string[] = [];
    if (!i) {
      botoes.push(`<button class="primario" data-c="comprar" ${s.dinheiro >= valor ? '' : 'disabled'}>${ic('circle-dollar-sign')} Comprar ${compacto(valor)}</button>`);
      if (s.casaAlugada === id) botoes.push(`<button class="perigo" data-c="sair">Deixar a casa</button>`);
      else botoes.push(`<button data-c="alugar" ${s.dinheiro >= renda ? '' : 'disabled'}>${ic('key-round')} Alugar para morar</button>`);
    } else {
      if (s.morada !== id && !i.arrendada) botoes.push(`<button data-c="morar">${ic('house')} Morar aqui</button>`);
      if (i.arrendada) botoes.push(`<button data-c="desarrendar">Acabar o arrendamento</button>`);
      else if (s.morada !== id) botoes.push(`<button class="primario" data-c="arrendar">${ic('key-round')} Arrendar (+${euros(renda)}/mês)</button>`);
      const recebe = Math.round(valor * (1 - PATRIMONIO.comissaoVenda));
      const lucro = recebe - i.compradaPor;
      botoes.push(`<button class="perigo" data-c="vender" title="${lucro >= 0 ? 'Ganhas' : 'Perdes'} ${euros(Math.abs(lucro))} face ao que pagaste">Vender por ${compacto(recebe)}</button>`);
    }
    j.innerHTML = `<div class="janela estreita">
      <h2>${ic('house')} ${esc(d.morada)}</h2>
      <div class="resumo">
        <div><small>Casa</small><b>${d.tipologia} · ${d.area} m²</b></div>
        <div><small>Valor</small><b>${euros(valor)}</b></div>
        <div><small>Renda</small><b>${euros(renda)}/mês</b></div>
      </div>
      <div class="nota"><b>${estadoCasa(id)}.</b> As casas valorizam ${Math.round(PATRIMONIO.valorizacaoAno * 100)}% por ano. Sendo tua, pagas ${euros(valor * PATRIMONIO.encargosMes)}/mês de IMI e obras; arrendada, recebes a renda no fecho de cada mês. Ao vender, a imobiliária fica com ${Math.round(PATRIMONIO.comissaoVenda * 100)}%.</div>
      <div class="linha-botoes">${botoes.join('')}<button data-fechar>Fechar</button></div></div>`;
  };
  const tecla = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return;
    ev.stopPropagation();
    ev.preventDefault();
    fechar();
  };
  const fechar = () => {
    j.remove();
    pausasModais = Math.max(0, pausasModais - 1);
    removeEventListener('keydown', tecla, true);
  };
  addEventListener('keydown', tecla, true);
  j.addEventListener('click', async (ev) => {
    const alvo = ev.target as HTMLElement;
    if (alvo === j || alvo.closest('[data-fechar]')) {
      som.clique();
      return fechar();
    }
    const b = alvo.closest('[data-c]') as HTMLElement | null;
    if (!b) return;
    const c = b.dataset.c;
    if (c === 'comprar') resultado(comprarCasa(s, id), som.dinheiro);
    else if (c === 'alugar') resultado(alugarCasa(s, id), som.dinheiro);
    else if (c === 'sair') resultado(deixarAluguer(s), som.clique);
    else if (c === 'morar') resultado(morarEm(s, id), som.clique);
    else if (c === 'arrendar') resultado(arrendarCasa(s, id, true), som.dinheiro);
    else if (c === 'desarrendar') resultado(arrendarCasa(s, id, false), som.clique);
    else if (c === 'vender') {
      j.style.display = 'none';
      const sim = await confirmar(`Vender a casa da <b>${esc(defCasa(id).morada)}</b> por <b>${euros(Math.round(valorCasa(s, id) * (1 - PATRIMONIO.comissaoVenda)))}</b>?`, 'Vender');
      j.style.display = '';
      if (sim) resultado(venderCasa(s, id), som.dinheiro);
    }
    desenhar();
    atualizarUI();
  });
  desenhar();
}

const CORES_CABELO = [0x17110d, 0x3b2a1e, 0x6b4428, 0x9a5b2e, 0xb8742f, 0xd9b26a, 0xe8d6a8, 0x8f8a86, 0xe6e3de, 0x3b5bd9, 0xd94f8a, 0x2fa36b];
const CORES_ROUPA = [0x2f6fb8, 0x1f3a6e, 0x17181c, 0xf2f2ee, 0x8c8c8c, 0xc0161d, 0xe0b23a, 0x2f8f6a, 0x7a4fd1, 0xe07a2f, 0xd94f8a, 0x6b4428];
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Editor do teu personagem: nome, modelo, cabelo, roupa e pele, com pré-visualização 3D a rodar. */
function abrirEditorPersonagem(): void {
  if (montra || document.querySelector('#j-personagem')) return;
  const dono = fundadorDe(s);
  const a: Aparencia = { ...(dono?.aparencia ?? APARENCIA_INICIAL) };
  let nome = dono?.nome ?? '';
  pausasModais++;
  const j = el(`<div class="modal" id="j-personagem"><div class="janela personagem">
    <h2>${ic('user-round')} O teu personagem</h2>
    <div class="editor-personagem">
      <canvas class="previa" width="300" height="400"></canvas>
      <div class="opcoes-personagem"></div>
    </div>
    <div class="linha-botoes"><button data-p="fechar">${dono ? 'Cancelar' : 'Mais tarde'}</button><button data-p="guardar" class="primario">${ic('check')} ${dono ? 'Guardar' : 'Criar personagem'}</button></div>
  </div></div>`);
  const opcoes = j.querySelector('.opcoes-personagem') as HTMLElement;
  const canvas = j.querySelector('canvas') as HTMLCanvasElement;

  // Pré-visualização: uma cena pequena só com o boneco a rodar devagar
  const r3 = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r3.setPixelRatio(Math.min(2, devicePixelRatio));
  r3.toneMapping = THREE.NeutralToneMapping;
  const c3 = new THREE.Scene();
  c3.add(new THREE.HemisphereLight(0xdfe8ff, 0x5a4a3a, 1.6));
  const luz = new THREE.DirectionalLight(0xfff2e0, 2.4);
  luz.position.set(1.5, 3, 2.5);
  c3.add(luz);
  const cam = new THREE.PerspectiveCamera(30, 300 / 400, 0.05, 20);
  cam.position.set(0, 0.66, 2.15);
  cam.lookAt(0, 0.56, 0);
  let boneco: Pessoa | null = null;
  let forma = '';
  const montar = () => {
    if (forma !== `${a.sexo}${a.modelo}`) {
      if (boneco) c3.remove(boneco.grupo);
      boneco = new Pessoa(0, nome, a);
      boneco.indicador.visible = false;
      c3.add(boneco.grupo);
      forma = `${a.sexo}${a.modelo}`;
    } else boneco!.mudarCores(a);
  };
  let ultimo = performance.now();
  let vivo = true;
  const animar = (agora: number) => {
    if (!vivo) return;
    const dt = Math.min(0.1, (agora - ultimo) / 1000);
    ultimo = agora;
    if (boneco) {
      boneco.grupo.rotation.y += dt * 0.6;
      boneco.atualizar(dt, 'parado', 0, false);
    }
    r3.render(c3, cam);
    requestAnimationFrame(animar);
  };

  const desenhar = () => {
    const n = modelosDe(a.sexo);
    const amostras = (lista: number[], campo: 'cabelo' | 'roupa') => lista.map((c) =>
      `<button class="amostra ${a[campo] === c ? 'ativo' : ''}" data-cor="${campo}" data-v="${c}" style="background:${hex(c)}" title="${hex(c)}"></button>`).join('');
    opcoes.innerHTML = `<label class="campo"><span>Nome</span><input type="text" data-p="nome" maxlength="24" placeholder="O teu nome" value="${esc(nome)}"></label>
      <div class="rotulo">Corpo</div>
      <div class="linha-botoes"><button class="mini ${a.sexo === 'm' ? 'ligado' : ''}" data-sexo="m">Homem</button><button class="mini ${a.sexo === 'f' ? 'ligado' : ''}" data-sexo="f">Mulher</button></div>
      <div class="linha-botoes preco"><button class="mini" data-modelo="-1">${ic('chevron-left')}</button><b>Rosto ${a.modelo % n + 1} de ${n}</b><button class="mini" data-modelo="1">${ic('chevron-right')}</button></div>
      <div class="rotulo">Tom de pele</div>
      <input type="range" data-p="pele" min="-100" max="100" value="${Math.round(a.pele * 100)}">
      <div class="rotulo">Cabelo</div><div class="amostras">${amostras(CORES_CABELO, 'cabelo')}</div>
      <div class="rotulo">Roupa</div><div class="amostras">${amostras(CORES_ROUPA, 'roupa')}</div>
      <div class="nota">O teu personagem trabalha nos projetos como os outros (sem salário) e não pode ser despedido. Precisa de uma secretária.</div>`;
    montar();
  };
  const fechar = () => {
    vivo = false;
    r3.dispose();
    j.remove();
    pausasModais = Math.max(0, pausasModais - 1);
    removeEventListener('keydown', tecla, true);
  };
  const tecla = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return;
    ev.stopPropagation();
    ev.preventDefault();
    fechar();
  };
  addEventListener('keydown', tecla, true);
  j.addEventListener('input', (ev) => {
    const i = ev.target as HTMLInputElement;
    if (i.dataset.p === 'nome') nome = i.value;
    if (i.dataset.p === 'pele') {
      a.pele = Number(i.value) / 100;
      montar();
    }
  });
  j.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!b) return;
    som.clique();
    if (b.dataset.p === 'fechar') return fechar();
    if (b.dataset.p === 'guardar') {
      const r = criarFundador(s, nome, a);
      resultado(r);
      if (r.ok) {
        fechar();
        atualizarUI();
      }
      return;
    }
    if (b.dataset.sexo) {
      a.sexo = b.dataset.sexo as 'm' | 'f';
      a.modelo = 0;
    } else if (b.dataset.modelo) {
      const n = modelosDe(a.sexo);
      a.modelo = (a.modelo + Number(b.dataset.modelo) + n) % n;
    } else if (b.dataset.cor) a[b.dataset.cor as 'cabelo' | 'roupa'] = Number(b.dataset.v);
    desenhar();
  });
  desenhar();
  requestAnimationFrame(animar);
}

function htmlEquipa(): string {
  const semDono = !fundadorDe(s) ? `<div class="cartao"><div class="nota">${ic('user-round')} Ainda não tens personagem. Cria-o: trabalha nos projetos como os outros, sem salário.</div>
    <button class="primario largo" data-acao="personagem">${ic('user-round')} Criar o teu personagem</button></div>` : '';
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const media = s.funcionarios.length ? s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length : 0;
  const opcoes = (f: Funcionario) => [`<option value="" ${f.projetoId === null ? 'selected' : ''}>Sem projeto (investiga)</option>`,
    ...s.projetos.map((p) => `<option value="${p.id}" ${f.projetoId === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`)].join('');
  return `${semDono}<div class="resumo">
      <div><small>Pessoas</small><b>${s.funcionarios.length}</b></div>
      <div><small>Salários</small><b>${euros(salarios)}</b></div>
      <div><small>Felicidade</small><b style="color:${COR_FEL(media)}">${s.funcionarios.length ? Math.round(media) : '—'}</b></div>
    </div>
    ${s.funcionarios.length === 0 ? '<div class="vazio">Ainda não tens funcionários. Vê o separador Contratar.</div>' : ''}
    ${s.funcionarios.map((f) => `<div class="cartao pessoa ${f.id === selecionado ? 'selecionado' : ''}" data-pessoa="${f.id}" title="Clica para ver no escritório">
      ${avatar(f.nome, especialidade(f))}
      <div class="cresce">
        <div class="linha"><b>${esc(f.nome)}</b><span class="estado ${classeEstado(f)}">${nomeEstado(f)}</span></div>
        ${barrasCompetencias(f.competencias)}
        <div class="linha sub"><span style="color:${COR_FEL(f.felicidade)}">${CARA_FEL(f.felicidade)} ${Math.round(f.felicidade)}</span><span>${euros(f.salario)}/mês</span></div>
        <div class="linha"><select data-equipa="${f.id}" class="${f.projetoId === null ? 'aviso' : ''}">${opcoes(f)}</select>
          ${f.dono ? `<button class="mini" data-acao="personagem">${ic('palette')} Editar</button>` : `<button class="mini perigo" data-acao="despedir" data-id="${f.id}">Despedir</button>`}</div>
      </div></div>`).join('')}`;
}

function htmlCandidatos(): string {
  const livres = s.secretarias.length - s.funcionarios.length;
  return `<div class="nota">Novos candidatos no início de cada mês. O salário depende da competência.</div>
    ${livres <= 0 ? `<div class="nota aviso">${ic('triangle-alert')} Não há secretárias livres: quem contratares fica sem trabalhar até colocares mais uma (tecla 4).</div>` : ''}
    ${s.candidatos.length === 0 ? '<div class="vazio">Sem candidatos este mês.</div>' : ''}
    ${s.candidatos.map((c, i) => {
      const area = especialidadeDe(c.competencias);
      return `<div class="cartao pessoa candidato">${avatar(c.nome, area)}
        <div class="cresce">
          <div class="linha"><b>${esc(c.nome)}</b><span class="chip-area a-${area}">${NOME_AREA[area]}</span></div>
          ${barrasCompetencias(c.competencias)}
          <div class="linha"><span class="salario">${euros(c.salario)}/mês</span><button class="primario mini" data-acao="contratar" data-i="${i}">Contratar</button></div>
        </div></div>`;
    }).join('')}`;
}

/** Linha de bugs de um produto: contagem, efeito nas vendas e botão de patch. */
function htmlBugs(i: number): string {
  const p = s.produtos[i];
  const bugs = Math.round(p.bugs ?? 0);
  const patch = manutencaoDe(s, i);
  const classe = bugs >= BUGS.alto ? 'mau' : bugs > 0 ? 'aviso' : 'bom';
  const perda = Math.round((1 - fatorBugs(p.bugs ?? 0)) * 100);
  const novos = Math.round(p.ritmoBugs ?? 0);
  const acao = patch
    ? `<small class="em-patch">${ic('hammer')} patch ${Math.round((patch.trabalhoFeito / patch.trabalhoTotal) * 100)}%</small>`
    : bugs > 0 && p.vendasMes > 0
      ? `<button class="mini" data-acao="patch" data-produto="${i}" title="Põe quem está sem projeto a corrigir os bugs (programação e testes)">${ic('hammer')} Patch</button>`
      : '';
  return `<div class="linha-bugs ${classe}" title="Nota dos utilizadores ${notaUtilizadores(p).toLocaleString('pt-PT')}/10${novos ? ` · ~${novos} bugs novos por aparecer no próximo mês` : ''}">
    <span>${ic('bug')} ${bugs ? `${bugs} bug${bugs === 1 ? '' : 's'}${perda ? ` · −${perda}% vendas` : ''}` : 'Sem bugs conhecidos'}</span>${acao}</div>`;
}

/** Cartão da era tecnológica: atual, o que está na moda e a próxima. */
function htmlEra(): string {
  const era: DefEra = eraAtual(s);
  const prox = proximaEra(s);
  const t = tendenciasEra(era);
  const mes = Math.floor(s.minuto / MIN_POR_MES);
  return `<div class="cartao era"><h3>${era.icone} ${era.nome}</h3>
    <div class="nota">${era.descricao}</div>
    ${t.sobe.length ? `<div class="tendencia sobe">${ic('trending-up')} Em alta: ${t.sobe.join(', ')}</div>` : ''}
    ${t.desce.length ? `<div class="tendencia desce">${ic('trending-down')} Em baixa: ${t.desce.join(', ')}</div>` : ''}
    ${prox ? `<small class="sub">Próxima: ${prox.icone} ${prox.nome} daqui a ${mesesTexto(prox.inicioMes - mes)} m</small>` : ''}</div>`;
}

function htmlPesquisa(): string {
  const porMes = pesquisaPorMes(s);
  const atual = s.pesquisaAtual ? TECNOLOGIAS[s.pesquisaAtual] : null;
  const pct = atual ? Math.min(100, (s.pesquisaProgresso / atual.custo) * 100) : 0;
  const falta = atual ? Math.max(0, atual.custo - s.pesquisaProgresso - s.pesquisaReserva) : 0;
  const niveis = [...new Set(LISTA_TECNOLOGIAS.map((id) => TECNOLOGIAS[id].nivel))].sort((a, b) => a - b);
  const cartao = (id: IdTecnologia) => {
    const d = TECNOLOGIAS[id];
    const feita = temTecnologia(s, id);
    const pode = podeInvestigar(s, id);
    const aInvestigar = s.pesquisaAtual === id;
    const funcs = funcionalidadesDaTecnologia(id).map((x) => `${x.funcionalidade.nome} (${TIPOS[x.tipo].nome.toLowerCase()})`);
    const efeitos = [...funcs, ...(d.bonus ? [d.bonus] : [])].join(' · ');
    const requer = d.requer.length ? `Requer ${d.requer.map((r) => TECNOLOGIAS[r].nome).join(' e ')}` : '';
    const estado = feita ? 'feita' : aInvestigar ? 'atual' : pode.ok ? 'livre' : 'bloq';
    return `<button class="tecnologia ${estado}" data-acao="pesquisar" data-tec="${aInvestigar ? '' : id}" ${feita || (!pode.ok && !aInvestigar) ? 'disabled' : ''}
      title="${esc(d.descricao)}${requer ? ` ${requer}.` : ''}${aInvestigar ? ' (clica para parar)' : ''}">
      <span class="ic">${feita ? ic('check') : estado === 'bloq' ? ic('lock') : d.icone}</span>
      <span class="cresce"><b>${d.nome}</b><small>${efeitos}</small>${!feita && requer && estado === 'bloq' ? `<small class="req">${requer}</small>` : ''}</span>
      <small class="custo">${feita ? 'feita' : aInvestigar ? `${Math.round(pct)}%` : `${d.custo.toLocaleString('pt-PT')} pts`}</small></button>`;
  };
  return `<div class="resumo">
      <div><small>Por mês</small><b class="bom">${Math.round(porMes).toLocaleString('pt-PT')} pts</b></div>
      <div><small>Em reserva</small><b>${Math.round(s.pesquisaReserva).toLocaleString('pt-PT')} pts</b></div>
      <div><small>Tecnologias</small><b>${s.tecnologias.length}/${LISTA_TECNOLOGIAS.length}</b></div>
    </div>
    ${htmlEra()}
    <div class="cartao"><h3>${ic('flask-conical')} ${atual ? `A investigar: ${atual.nome}` : 'Nada em investigação'}</h3>
      ${atual ? `<div class="progresso"><div style="width:${pct.toFixed(1)}%"></div><span>${pct.toFixed(0)}%</span></div>
      <div class="nota">${falta > 0 ? porMes > 0 ? `Faltam ${Math.round(falta).toLocaleString('pt-PT')} pontos, ~${mesesTexto(falta / porMes)} m a este ritmo.` : 'Ninguém está a investigar: tira alguém de um projeto.' : 'Quase concluída.'}</div>`
        : '<div class="nota">Escolhe uma tecnologia em baixo. Quem está sem projeto investiga; os pontos sem destino ficam em reserva.</div>'}
      <button class="largo" data-acao="financiar" ${s.dinheiro < PESQUISA.custoPacote ? 'disabled' : ''}>${ic('banknote')} Contratar consultores · +${PESQUISA.pontosPacote.toLocaleString('pt-PT')} pts por ${euros(PESQUISA.custoPacote)}</button>
    </div>
    ${niveis.map((n) => `<div class="rotulo">Nível ${n}</div><div class="arvore">${LISTA_TECNOLOGIAS.filter((id) => TECNOLOGIAS[id].nivel === n).map(cartao).join('')}</div>`).join('')}`;
}

function htmlProdutos(): string {
  const i = plataformaDe(s);
  const antigos = s.produtos.map((p, k) => ({ p, k })).filter(({ k }) => k !== i);
  const estrelas = (q: number) => {
    const n = Math.max(1, Math.round(q * 5));
    return `<span class="estrelas" title="Qualidade ${Math.round(q * 100)}%">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  };
  const lista = antigos.length ? `<div class="rotulo">Produtos antigos (à venda até saírem do mercado)</div>
    ${antigos.slice(-10).reverse().map(({ p, k }) => `<div class="cartao produto">
      <span class="ic-tipo">${ICONE_TIPO[p.tipo]}</span>
      <div class="cresce"><b>${esc(p.nome)}</b><small>${TIPOS[p.tipo].nome} · total ${euros(p.receitaTotal)}</small>${estrelas(p.qualidade)}</div>
      <div class="vendas"><b>${euros(vendasComBugs(p))}</b><small>por mês</small></div>
      ${htmlBugs(k)}</div>`).join('')}` : '';
  if (i === undefined) {
    const proj = s.projetos.find(eProdutoNovo);
    return `${proj ? `<div class="vazio">${ic('rocket')} <b>${esc(proj.nome)}</b> está em desenvolvimento (${Math.round((proj.trabalhoFeito / proj.trabalhoTotal) * 100)}%). Quando for lançado, gere-o aqui: utilizadores, planos, servidores e updates.</div>`
      : `<div class="vazio">${ic('rocket')} Ainda não tens produto. Começa-o no separador Projetos: a empresa vive de um só produto, que cresce com updates.</div>`}${lista}`;
  }
  const p = s.produtos[i];
  const u = Math.round(p.utilizadores ?? 0);
  const pag = Math.round(pagantesDe(p));
  const carga = cargaServidor(s, p);
  const cargaPct = Math.round(carga * 100);
  const nivel = p.servidor ?? 0;
  const sv = SERVIDORES[nivel];
  const plano = p.plano ?? { gratis: false, preco: PLATAFORMA.precoReferencia, anuncios: false };
  const sat = Math.round(p.satisfacao ?? 70);
  const alvo = Math.round(satisfacaoAlvo(s, p));
  const lucro = lucroMensal(s, p);
  const hist = [...(p.historicoUtilizadores ?? []), u];
  const upd = updateDe(s, i);
  const corCarga = carga > 1 ? 'mau' : carga > 0.85 ? 'aviso' : 'bom';
  const servidores = SERVIDORES.map((d, n) => {
    const atual = n === nivel;
    const cap = capacidadeServidor(s, n);
    return `<button class="servidor ${atual ? 'ativo' : ''}" data-acao="servidor" data-nivel="${n}" ${atual || (n > nivel && s.dinheiro < d.custo * 2) ? 'disabled' : ''}
      title="${d.nome}: aguenta ${cap.toLocaleString('pt-PT')} utilizadores">
      <b>${d.nome}</b><small>${cap >= 1e6 ? `${(cap / 1e6).toLocaleString('pt-PT')} M` : cap >= 1000 ? `${(cap / 1000).toLocaleString('pt-PT')} mil` : cap} utilizadores · ${euros(d.custo)}/mês</small>${atual ? '<small class="bom">atual</small>' : n > nivel ? `<small>migração ${euros(d.custo * 2)}</small>` : '<small>descer</small>'}</button>`;
  }).join('');
  return `<div class="cartao plataforma">
      <div class="cab"><span class="ic-tipo">${ICONE_TIPO[p.tipo]}</span>
        <div class="cresce"><b>${esc(p.nome)}</b><small>${TIPOS[p.tipo].nome} · versão 1.${p.updates ?? 0}${upd ? ` · update a ${Math.round((upd.trabalhoFeito / upd.trabalhoTotal) * 100)}%` : ''}</small>${estrelas(p.qualidade)}</div></div>
      <div class="resumo">
        <div><small>Utilizadores</small><b>${u.toLocaleString('pt-PT')}</b></div>
        <div><small>Pagantes</small><b>${pag.toLocaleString('pt-PT')}</b></div>
        <div><small>Lucro/mês</small><b class="${lucro >= 0 ? 'bom' : 'mau'}">${euros(lucro)}</b></div>
      </div>
      <div class="grafico-utiliz" title="Utilizadores no fim de cada mês">${sparkline(hist, 300, 46)}</div>
      <div class="nota">Receita ${euros(receitaMensal(p))}/mês − servidor ${euros(sv.custo)}/mês · total ganho ${euros(p.receitaTotal)}</div>
      <div class="area"><span>Satisfação ${sat}%${alvo < sat - 2 ? ` ${ic('trending-down')}` : alvo > sat + 2 ? ` ${ic('trending-up')}` : ''}</span><div class="barra"><div style="width:${sat}%;background:${corFelicidade(sat)}"></div></div></div>
      ${htmlBugs(i)}
    </div>
    <div class="cartao"><h3>${ic('server')} Servidores · <span class="${corCarga}">${cargaPct}% de carga</span></h3>
      <div class="area larga"><span>${u.toLocaleString('pt-PT')} / ${capacidadeServidor(s, nivel).toLocaleString('pt-PT')}</span><div class="barra carga-${corCarga}"><div style="width:${Math.min(100, cargaPct)}%"></div></div></div>
      <div class="nota">${carga > 1 ? '<b class="mau">Sobrecarregados!</b> O serviço cai, ninguém novo consegue entrar e os utilizadores fogem. Faz upgrade já.' : carga > 0.85 ? 'Quase cheios: quando passarem dos 100% o serviço começa a cair.' : 'Com folga. Se os utilizadores passarem a capacidade, o serviço cai.'}</div>
      <div class="servidores">${servidores}</div></div>
    <div class="cartao"><h3>${ic('wallet')} Planos de preço</h3>
      <div class="linha-botoes">
        <button class="mini ${plano.gratis ? 'ligado' : ''}" data-acao="plano" data-op="gratis">${ic(plano.gratis ? 'check' : 'x')} Plano grátis</button>
        <button class="mini ${plano.anuncios ? 'ligado' : ''}" data-acao="plano" data-op="anuncios" ${plano.gratis ? '' : 'disabled'}>${ic(plano.anuncios ? 'check' : 'x')} Anúncios no grátis</button>
      </div>
      <div class="linha-botoes preco">
        <button class="mini" data-acao="plano" data-op="-5">−5</button><button class="mini" data-acao="plano" data-op="-1">−1</button>
        <b>${plano.preco > 0 ? `${plano.preco.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mês` : 'sem plano pago'}</b>
        <button class="mini" data-acao="plano" data-op="1">+1</button><button class="mini" data-acao="plano" data-op="5">+5</button>
        ${plano.gratis && plano.preco > 0 ? '<button class="mini" data-acao="plano" data-op="sem-pago">Só grátis</button>' : ''}
      </div>
      <div class="nota">O utilizador médio aceita pagar ~${euros(PLATAFORMA.precoReferencia)}/mês: mais caro afasta gente e baixa a satisfação. O grátis traz ${PLATAFORMA.multGratis}× mais utilizadores, mas só ~${Math.round(PLATAFORMA.conversaoGratis * 100)}% passa a pagar; os anúncios rendem ${euros(PLATAFORMA.receitaAnuncio)}/mês por utilizador grátis, mas irritam.</div></div>
    ${lista}`;
}

function htmlNumeros(): string {
  const tem = new Set(s.conquistas);
  const melhor = s.produtos.reduce((m, p) => Math.max(m, p.qualidade), 0);
  const recorde = s.historico.reduce((m, r) => Math.max(m, r.receitas), 0);
  const total = s.produtos.reduce((t, p) => t + p.receitaTotal, 0);
  return `${htmlDesafio()}<div class="resumo grelha">
      <div><small>Meses de vida</small><b>${mesDeJogo(s)}</b></div>
      <div><small>Produtos lançados</small><b>${s.produtos.length}</b></div>
      <div><small>Melhor qualidade</small><b>${s.produtos.length ? `${Math.round(melhor * 100)}%` : '—'}</b></div>
      <div><small>Melhor mês</small><b>${euros(recorde)}</b></div>
      <div><small>Receita total</small><b>${euros(total)}</b></div>
      <div><small>Salas</small><b>${totalSalas}</b></div>
    </div>
    <div class="cartao"><h3>${ic('trophy')} Conquistas <small>${tem.size} de ${CONQUISTAS.length}</small></h3>
      <div class="mini-conquistas">${CONQUISTAS.map((c) => `<span class="${tem.has(c.id) ? 'feita' : ''}" title="${c.nome}: ${c.descricao}">${tem.has(c.id) ? c.icone : ic('lock')}</span>`).join('')}</div></div>`;
}

function htmlFicha(f: Funcionario): string {
  const area = especialidade(f);
  const alvo = alvoFelicidade(s, f);
  const proj = s.projetos.find((p) => p.id === f.projetoId);
  const ritmo = Math.round((0.5 + f.felicidade / 200) * 100);
  const nota = alvo > 75 ? ` (decoração +${Math.round(alvo - 75)})` : alvo < 75 ? ' (sem secretária)' : '';
  return `<div class="cab">${avatar(f.nome, area, true)}
      <div class="cresce"><b>${esc(f.nome)}</b><small>Especialista em ${NOME_AREA[area].toLowerCase()} · ${euros(f.salario)}/mês</small></div>
      <button class="mini icone-mini" data-fechar title="Fechar (Esc)">${ic('x')}</button></div>
    <div class="linha"><span class="estado ${classeEstado(f)}">${nomeEstado(f)}</span>
      <span>${proj ? `${ic(proj.crunch ? 'flame' : 'folder-open')} ${esc(proj.nome)}` : s.pesquisaAtual ? `${ic('flask-conical')} A investigar` : '<span class="aviso">Sem projeto</span>'}</span></div>
    <div class="felicidade">
      <div class="linha"><span>${CARA_FEL(f.felicidade)} Felicidade</span><b style="color:${COR_FEL(f.felicidade)}">${Math.round(f.felicidade)}</b></div>
      <div class="barra"><div style="width:${Math.round(f.felicidade)}%;background:${COR_FEL(f.felicidade)}"></div></div>
      <small>Tende para ${Math.round(alvo)}${nota} · ritmo de trabalho ${ritmo}%</small>
    </div>
    ${barrasCompetencias(f.competencias)}
    ${htmlPessoal(f)}`;
}

/** Personalidade, amigos e conflitos, e a formação. */
function htmlPessoal(f: Funcionario): string {
  const tracos = (f.tracos ?? []).map((t) => `<span class="chip-tipo" title="${esc(TRACOS[t].descricao)}">${TRACOS[t].icone} ${TRACOS[t].nome}</span>`).join(' ');
  const rel = relacoesDe(s, f.id);
  const relacoes = [
    rel.amigos.length ? `🤝 Amigo de ${rel.amigos.map(esc).join(', ')}` : '',
    rel.conflitos.length ? `💢 Em conflito com ${rel.conflitos.map(esc).join(', ')}` : '',
  ].filter(Boolean).join('<br>');
  const formacao = f.formacao
    ? `<div class="nota">${ic('medal')} Em formação de ${NOME_AREA[f.formacao.area].toLowerCase()}.</div>`
    : `<div class="linha formacao"><small>${ic('medal')} Formação · ${FORMACAO.dias} dias · ${euros(FORMACAO.custo)}</small>
        ${AREAS.map((a) => `<button class="mini" data-acao="formacao" data-id="${f.id}" data-area="${a}" ${f.competencias[a] >= 1 || ausente(s, f) || s.dinheiro < FORMACAO.custo ? 'disabled' : ''}>${NOME_AREA[a]}</button>`).join('')}</div>`;
  return `${tracos ? `<div class="linha tracos">${tracos}</div>` : ''}
    ${relacoes ? `<div class="nota">${relacoes}</div>` : ''}
    ${formacao}`;
}

function htmlFalencia(): string {
  const total = s.produtos.reduce((t, p) => t + p.receitaTotal, 0);
  return `<div class="janela estreita falencia">
    <div class="grande-ic">💥</div>
    <h2>Falência!</h2>
    <p>A <b>${esc(s.nome)}</b> fechou portas ao fim de ${mesDeJogo(s)} ${mesDeJogo(s) === 1 ? 'mês' : 'meses'}.</p>
    <div class="resumo">
      <div><small>Produtos</small><b>${s.produtos.length}</b></div>
      <div><small>Receita total</small><b>${euros(total)}</b></div>
      <div><small>Conquistas</small><b>${s.conquistas.length}/${CONQUISTAS.length}</b></div>
    </div>
    <div class="lista-botoes">
      <button data-fim="carregar" class="primario">${ic('folder-open')} Carregar último jogo guardado</button>
      <button data-fim="novo">${ic('sparkles')} Novo jogo</button>
      <button data-fim="menu">${ic('house')} Menu principal</button>
    </div></div>`;
}

fim.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  const a = b?.dataset.fim;
  if (!a) return;
  som.clique();
  if (a === 'carregar') carregar();
  else if (a === 'novo') {
    irParaMenuPrincipal();
    menus.mostrar('novo');
  } else if (a === 'menu') irParaMenuPrincipal();
});

// --- Avisos flutuantes e notícias ------------------------------------------

const ICONE_AVISO: Partial<Record<string, string>> = {
  nivel: ic('star'), missao: ic('target'), lancamento: ic('rocket'), desbloqueio: ic('unlock'), falencia: ic('triangle-alert'),
  erro: ic('circle-x'), info: ic('info'), conquista: ic('trophy'), evento: ic('sparkles'), aviso: ic('triangle-alert'),
  contrato: ic('briefcase'), investimento: ic('handshake'),
};

function avisoFlutuante(texto: string, tipo: string, icone = ICONE_AVISO[tipo] ?? ''): void {
  const e = document.createElement('div');
  e.className = `aviso-flut t-${tipo}`;
  e.innerHTML = `${icone ? `<span class="ic">${icone}</span>` : ''}<span>${texto}</span>`;
  caixaAvisos.prepend(e);
  while (caixaAvisos.children.length > 4) caixaAvisos.lastElementChild!.remove();
  setTimeout(() => e.classList.add('sair'), tipo === 'erro' ? 2600 : 4600);
  setTimeout(() => e.remove(), tipo === 'erro' ? 3000 : 5000);
}

function erro(texto: string): void {
  avisoFlutuante(esc(texto), 'erro');
  som.erro();
}

const vistas = new WeakSet<Mensagem>();
function marcarMensagensVistas(): void {
  for (const m of s.mensagens) vistas.add(m);
}

/** Mensagens novas do jogo: avisos, sons e confetes conforme o tipo. Na montra só há confetes. */
function processarMensagensNovas(): void {
  for (const m of s.mensagens) {
    if (vistas.has(m)) continue;
    vistas.add(m);
    if (m.tipo === 'lancamento' || m.tipo === 'conquista' || m.tipo === 'nivel') confetes.disparar(centroDoEscritorio());
    if (m.tipo === 'lancamento') for (const b of bonecos.values()) b.festejar(4);
    if (montra) continue;
    const t = m.tipo ?? 'info';
    if (t === 'mes') {
      const r = s.historico.find((h) => h.mes === Math.round(m.minuto / MIN_POR_MES) - 1);
      const saldo = r ? r.receitas - r.despesas : 0;
      mostrarDelta(saldo);
      const centro = centroDoEscritorio();
      if (saldo > 0) particulas.repuxo(centro, Math.min(40, 10 + Math.round(saldo / 600)), 'moeda');
      const [x, y] = paraEcra(centro.setY(1.8));
      numeroFlutuante(`${saldo >= 0 ? '+' : ''}${euros(saldo)}`, saldo >= 0 ? 'bom' : 'mau', x, y);
      if (def.avisos) avisoFlutuante(`Fecho do mês: <b>${saldo >= 0 ? '+' : ''}${euros(saldo)}</b>`, saldo >= 0 ? 'mes-bom' : 'mes-mau', ic('banknote'));
      if (saldo > 0) som.dinheiro();
      continue;
    }
    if (t === 'lancamento') {
      const p = [...s.produtos].reverse().find((o) => o.lancadoEm === m.minuto);
      if (p) {
        celebracoes.lancamento({ produto: p, xp: xpDeLancamento(p.tipo, p.qualidade), icone: ICONE_TIPO[p.tipo] });
        if (def.avisos && m.texto.includes('saturado')) avisoFlutuante(esc(m.texto.slice(m.texto.indexOf('O mercado'))), 'aviso', ic('trending-down'));
        continue;
      }
    }
    if (t === 'nivel') {
      const n = Number(/nível (\d+)/.exec(m.texto)?.[1] ?? nivelDaEmpresa(s));
      celebracoes.nivel(n, (Object.keys(MELHORIAS) as IdMelhoria[]).filter((id) => MELHORIAS[id].nivel === n));
      particulas.repuxo(centroDoEscritorio(), 30, 'estrela');
      continue;
    }
    if (t === 'missao') {
      som.missao();
      if (def.avisos) avisoFlutuante(esc(semEmoji(m.texto)), 'missao');
      painelMissoes.raiz.classList.remove('cumpriu');
      void painelMissoes.raiz.offsetWidth;
      painelMissoes.raiz.classList.add('cumpriu');
      continue;
    }
    if (t === 'contrato' && m.texto.startsWith('✅')) {
      particulas.repuxo(centroDoEscritorio(), 18, 'moeda');
      for (const f of s.funcionarios) if (f.projetoId === null) bonecos.get(f.id)?.festejar(3);
    }
    const efeitos: Partial<Record<string, () => void>> = {
      lancamento: som.lancamento, conquista: som.conquista, desbloqueio: som.evento, evento: som.evento,
      aviso: som.aviso, falencia: som.falencia, contrato: som.dinheiro, investimento: som.dinheiro,
    };
    if (efeitos[t]) {
      efeitos[t]!();
      if (def.avisos || t === 'falencia') avisoFlutuante(esc(semEmoji(m.texto)), t);
    }
  }
}

let deltaAte = 0;
function mostrarDelta(v: number): void {
  const e = topo.querySelector('.delta') as HTMLElement;
  e.textContent = `${v >= 0 ? '+' : ''}${euros(v)}`;
  e.className = `delta ${v >= 0 ? 'bom' : 'mau'} mostrar`;
  deltaAte = performance.now() + 2500;
}

// --- Atualização -------------------------------------------------------------

let textoGuardado = '';
let dinheiroMostrado = s.dinheiro;
let graficoDesenhado = '';

function texto(sel: string, valor: string, raiz: HTMLElement = topo): void {
  const e = raiz.querySelector(sel) as HTMLElement;
  if (e.textContent !== valor) e.textContent = valor;
}
function html(sel: string, valor: string, raiz: HTMLElement = topo): void {
  definir(raiz.querySelector(sel) as HTMLElement, valor);
}

/** Barra de cima: atualizada a cada imagem (o dinheiro conta até ao valor certo). */
function atualizarTopo(dt: number): void {
  dinheiroMostrado += (s.dinheiro - dinheiroMostrado) * Math.min(1, dt * 6);
  if (Math.abs(s.dinheiro - dinheiroMostrado) < 1) dinheiroMostrado = s.dinheiro;
  texto('.dinheiro .valor', euros(dinheiroMostrado));
  topo.querySelector('.dinheiro')!.classList.toggle('negativo', s.dinheiro < 0);
  if (deltaAte && performance.now() > deltaAte) {
    topo.querySelector('.delta')!.classList.remove('mostrar');
    deltaAte = 0;
  }
  const [data, hora] = textoData(s.minuto).split(' — ');
  texto('.data', data);
  texto('.hora', hora);
  html('.ceu', ic(ambiente.noite > 0.5 && def.cicloDia ? 'moon' : 'sun'));

  const emblema = topo.querySelector('.nivel-emblema') as HTMLElement;
  texto('.nivel-emblema .n', String(nivelDaEmpresa(s)));
  const pr = progressoNivel(s);
  const arco = (CIRCUNFERENCIA * (1 - (pr.precisa ? pr.feito / pr.precisa : 1))).toFixed(1);
  if (arco !== arcoMostrado) {
    (topo.querySelector('.nivel-emblema .arco') as SVGElement).style.strokeDashoffset = arco;
    arcoMostrado = arco;
  }
  const pontos = pontosMelhoria(s);
  texto('.nivel-emblema .pontos', pontos > 0 ? String(pontos) : '');
  emblema.classList.toggle('com-pontos', pontos > 0);
  if (xpMostrado < 0 || xpMostrado > s.xp) xpMostrado = s.xp;
  if (s.xp > xpMostrado) {
    const r = emblema.getBoundingClientRect();
    numeroFlutuante(`+${s.xp - xpMostrado} XP`, 'xp', r.left + r.width / 2, r.bottom + 14);
    emblema.classList.remove('ganhou');
    void emblema.offsetWidth;
    emblema.classList.add('ganhou');
    xpMostrado = s.xp;
  }
  const serie = serieDeLucro(s);
  (topo.querySelector('.serie') as HTMLElement).style.display = serie >= 2 ? '' : 'none';
  texto('.serie .valor', `${serie} meses`);
}

const CIRCUNFERENCIA = 2 * Math.PI * 17;
let arcoMostrado = '';
let xpMostrado = -1;

function atualizarUI(): void {
  painelMissoes.atualizar(s, !montra);
  if (montra) return;
  texto('.empresa', s.nome);
  const vendas = s.produtos.reduce((t, p) => t + vendasComBugs(p), 0);
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const saldo = vendas - salarios - rendaDe(s);
  texto('.saldo .valor', `${saldo >= 0 ? '+' : ''}${euros(saldo)}/mês`);
  topo.querySelector('.saldo')!.classList.toggle('negativo', saldo < 0);
  html('.saldo .seta', ic(saldo >= 0 ? 'trending-up' : 'trending-down'));
  const lugar = rankingEmpresas(s).findIndex((l) => l.jogador) + 1;
  texto('.avaliacao-topo .valor', compacto(avaliarEmpresa(s).total));
  texto('.avaliacao-topo .lugar', `${lugar}.º`);
  texto('.equipa', String(s.funcionarios.length));
  const media = s.funcionarios.length ? s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length : 0;
  texto('.felicidade', s.funcionarios.length ? String(Math.round(media)) : '—');
  html('.cara', s.funcionarios.length ? CARA_FEL(media) : ic('smile'));
  texto('.guardado', textoGuardado);
  topo.querySelectorAll<HTMLButtonElement>('[data-vel]').forEach((b) => b.classList.toggle('ativo', Number(b.dataset.vel) === velocidade));

  barraFerramentas.querySelectorAll<HTMLButtonElement>('[data-ferr]').forEach((b) => b.classList.toggle('ativo', b.dataset.ferr === ferramenta));
  barraObjetos.classList.toggle('visivel', ferramenta === 'decoracao');
  barraObjetos.querySelectorAll<HTMLButtonElement>('[data-obj]').forEach((b) => {
    const t = b.dataset.obj as TipoObjeto;
    b.classList.toggle('ativo', t === objetoEscolhido);
    b.classList.toggle('caro', OBJETOS[t].custo > s.dinheiro);
  });
  const fer = FERRAMENTAS.find((f) => f.id === ferramenta)!;
  const lim = limiteSecretarias(s);
  const extra = ferramenta === 'secretaria' && Number.isFinite(lim) ? ` (${s.secretarias.length}/${lim} neste escritório)`
    : ferramenta === 'mover' && pegado ? ' — a mover: clica no destino, R roda, Esc cancela.'
    : ferramenta === 'secretaria' || ferramenta === 'decoracao' ? ' R roda.' : '';
  definir(dica, textoArrasto || (ferramenta === 'selecionar' ? '' : `${ic(fer.icone)} <span>${fer.dica}${extra}</span>`));
  dica.classList.toggle('vazia', !textoArrasto && ferramenta === 'selecionar');

  // Separadores: conteúdo só do que está aberto; os números pequenos sempre
  lateral.classList.toggle('fechado', !painelAberto);
  lateral.querySelectorAll<HTMLButtonElement>('[data-sep]').forEach((b) => b.classList.toggle('ativo', painelAberto && b.dataset.sep === separador));
  lateral.querySelectorAll<HTMLElement>('[data-sec]').forEach((e) => e.classList.toggle('ativo', e.dataset.sec === separador));
  const problemas = s.funcionarios.filter((f) => classeEstado(f) === 'mau' || f.projetoId === null).length;
  const badges: Record<Separador, string> = {
    projetos: s.projetos.length ? String(s.projetos.length) : '',
    equipa: problemas ? String(problemas) : '',
    contratar: s.candidatos.length ? String(s.candidatos.length) : '',
    produtos: String(s.produtos.filter((p) => (p.bugs ?? 0) >= BUGS.alto && p.vendasMes > 0 && !manutencaoDe(s, s.produtos.indexOf(p))).length || ''),
    empresa: feirasDisponiveis(s).length ? '!' : '',
    pesquisa: s.pesquisaAtual ? '' : LISTA_TECNOLOGIAS.some((id) => podeInvestigar(s, id).ok) ? '!' : '',
    mercado: String(LISTA_RONDAS.filter((id) => podeLevantar(s, id).ok).length || ''),
    numeros: '',
  };
  lateral.querySelectorAll<HTMLButtonElement>('[data-sep]').forEach((b) => {
    const i = b.querySelector('.badge') as HTMLElement;
    const v = badges[b.dataset.sep as Separador];
    if (i.textContent !== v) i.textContent = v;
    i.classList.toggle('alerta', (b.dataset.sep === 'equipa' && problemas > 0) || (b.dataset.sep === 'produtos' && v !== ''));
  });
  if (painelAberto) {
    if (separador === 'projetos') {
      definir(document.getElementById('lista-projetos')!, htmlListaProjetos());
      definir(document.getElementById('config-projeto')!, htmlConfigProjeto());
      lateral.querySelector('.novo-projeto')!.classList.toggle('modo-contrato', modoNovo === 'contrato');
    } else if (separador === 'equipa') definir(document.getElementById('p-equipa')!, htmlEquipa());
    else if (separador === 'contratar') definir(document.getElementById('p-candidatos')!, htmlCandidatos());
    else if (separador === 'produtos') definir(document.getElementById('p-produtos')!, htmlProdutos());
    else if (separador === 'pesquisa') definir(document.getElementById('p-pesquisa')!, htmlPesquisa());
    else if (separador === 'empresa') definir(document.getElementById('p-empresa')!, htmlEmpresa());
    else if (separador === 'mercado') definir(document.getElementById('p-mercado')!, htmlMercado());
    else {
      definir(document.getElementById('p-numeros')!, htmlNumeros());
      const chave = `${s.historico.length}|${s.historico[s.historico.length - 1]?.dinheiro}|${innerWidth}`;
      if (chave !== graficoDesenhado) {
        graficoDesenhado = chave;
        desenharGrafico(document.getElementById('grafico') as HTMLCanvasElement, s.historico);
      }
    }
  }
  if (separador !== 'numeros') graficoDesenhado = '';

  const cor: Record<string, string> = {
    lancamento: 'bom', conquista: 'ouro', evento: 'info', aviso: 'mau', falencia: 'mau', desbloqueio: 'roxo', mes: 'mes',
    contrato: 'bom', investimento: 'ouro', rival: 'rival', missao: 'bom', nivel: 'ouro',
  };
  definir(caixaNoticias.querySelector('.lista') as HTMLElement, s.mensagens.slice(-25).reverse().map(
    (m) => `<div class="n-${cor[m.tipo ?? 'info'] ?? 'normal'}"><span class="hora">${textoData(m.minuto).split(' — ')[0]}</span>${esc(semEmoji(m.texto))}</div>`,
  ).join(''));

  const fs = s.funcionarios.find((f) => f.id === selecionado);
  ficha.classList.toggle('visivel', !!fs);
  if (fs) definir(ficha, htmlFicha(fs));

  fim.classList.toggle('visivel', s.falencia);
  if (s.falencia) definir(fim, htmlFalencia());
}

// ---------------------------------------------------------------------------
// Jogo: menus, guardar, carregar
// ---------------------------------------------------------------------------

function aplicarDefinicoes(): void {
  renderer.setPixelRatio(pixelRatio(def.qualidade));
  renderer.setSize(innerWidth, innerHeight);
  ambiente.sombras = def.sombras;
  ambiente.qualidade(def.qualidade);
  configurarSom(def.sons, def.volume);
  posfx.definir(def.qualidade === 'alta' ? 'completo' : def.qualidade === 'media' ? 'acabamento' : 'nenhum');
  posfx.redimensionar(innerWidth, innerHeight, pixelRatio(def.qualidade));
  contadorFps.style.display = def.mostrarFps ? 'block' : 'none';
}

/** Contador de FPS (canto inferior direito), atualizado duas vezes por segundo. */
const contadorFps = document.createElement('div');
contadorFps.style.cssText =
  'position:fixed;right:10px;bottom:8px;z-index:50;pointer-events:none;font:600 12px/1 system-ui,sans-serif;' +
  'color:#d9f99d;background:rgba(15,23,42,.6);padding:5px 8px;border-radius:6px;display:none';
document.body.appendChild(contadorFps);
let quadrosFps = 0;
let inicioFps = performance.now();
function contarFps(agora: number): void {
  quadrosFps++;
  if (agora - inicioFps < 500) return;
  contadorFps.textContent = `${Math.round((quadrosFps * 1000) / (agora - inicioFps))} FPS`;
  quadrosFps = 0;
  inicioFps = agora;
}

/** Troca o jogo em curso; a cena e as escolhas da interface voltam a ser construídas a partir dele. */
function usarEstado(novo: Estado, eMontra = false): void {
  s = novo;
  montra = eMontra;
  mesGuardado = mesDeJogo(s);
  versaoDesenhada = -1;
  limparBonecos();
  selecionado = null;
  focoCamara = null;
  tipoEscolhido = 'utilitario';
  funcEscolhidas = [];
  marcacoes.clear();
  textoGuardado = '';
  arrasto = null;
  fantasma.clear();
  textoArrasto = '';
  ferramenta = 'selecionar';
  dinheiroMostrado = s.dinheiro;
  xpMostrado = -1;
  marcarMensagensVistas();
  document.title = eMontra ? 'Software Lda.' : `${s.nome} — Software Lda.`;
  if (import.meta.env.DEV) Object.assign(window, { __jogo: s });
}

function comecarJogo(novo: Estado): void {
  usarEstado(novo);
  velocidade = 1;
  menus.mostrar(null);
  camaraDeJogo();
  atualizarUI();
}

function irParaMenuPrincipal(): void {
  usarEstado(criarMontra(), true);
  camaraDeMenu();
  menus.mostrar('principal');
}

function abrirPausa(): void {
  if (montra) return;
  arrasto = null;
  fantasma.clear();
  atualizarCursores(null);
  menus.mostrar('pausa');
}

function guardar(): void {
  if (montra) return;
  if (escreverLugar(LUGAR_MANUAL, s)) {
    textoGuardado = `Guardado ${textoData(s.minuto).split(' — ')[0]}`;
    mensagem(s, 'Jogo guardado.');
    marcarMensagensVistas();
    avisoFlutuante('Jogo guardado.', 'info', ic('save'));
  } else erro('Não foi possível guardar (o armazenamento do browser está cheio ou bloqueado).');
  atualizarUI();
}

/** Carrega o mais recente entre o save manual e o autosave. */
function carregar(): void {
  const { melhor, erro: e } = saveMaisRecente();
  if (!melhor) return erro(e || 'Não há nenhum jogo guardado.');
  mensagem(melhor.estado, 'Jogo carregado: continuas onde ficaste.');
  comecarJogo(melhor.estado);
  avisoFlutuante(`Bem-vindo de volta à <b>${esc(s.nome)}</b>!`, 'info', ic('folder-open'));
}

/** Autosave no fecho de cada mês (não guarda uma falência por cima do último jogo bom). */
function autosave(): void {
  if (montra) return;
  const mes = mesDeJogo(s);
  if (mes === mesGuardado) return;
  mesGuardado = mes;
  if (s.falencia) return;
  if (escreverLugar(LUGAR_AUTO, s)) textoGuardado = `Autosave ${textoData(s.minuto).split(' — ')[0]}`;
}

const menus = new Menus({
  infoSave: () => {
    const { melhor } = saveMaisRecente();
    if (!melhor) return null;
    const e = melhor.estado;
    return { nome: e.nome, data: textoData(e.minuto).split(' — ')[0], dinheiro: euros(e.dinheiro) };
  },
  continuar: carregar,
  fundar: (opcoes) => {
    comecarJogo(novoJogo(Date.now() & 0xffff, LARGURA, ALTURA, { ...opcoes, missoes: true, escritorio: 0 }));
    // Passa a ser o jogo mais recente: ao recarregar a página continua este, não o antigo.
    escreverLugar(LUGAR_AUTO, s);
    avisoFlutuante(`Bem-vindo à <b>${esc(s.nome)}</b>! Segue as missões à esquerda: começa por colocar secretárias (tecla 4) e contratar no separador Contratar.`, 'info', ic('sparkles'));
    abrirEditorPersonagem();
  },
  voltarAoJogo: () => {
    menus.mostrar(null);
    atualizarUI();
  },
  guardar: () => {
    guardar();
    menus.mostrar(null);
  },
  carregar,
  sairParaMenu: () => {
    if (!s.falencia) escreverLugar(LUGAR_AUTO, s);
    irParaMenuPrincipal();
  },
  conquistas: () => (montra ? saveMaisRecente().melhor?.estado.conquistas ?? [] : s.conquistas),
  definicoes: () => def,
  mudarDefinicoes: (d) => {
    def = d;
    guardarDefinicoes(d);
    aplicarDefinicoes();
  },
  clique: () => som.clique(),
});

// ---------------------------------------------------------------------------
// Ciclo
// ---------------------------------------------------------------------------

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  posfx.redimensionar(innerWidth, innerHeight, pixelRatio(def.qualidade));
  if (montra) vistaDeMenu();
  graficoDesenhado = '';
});

let ultimo = performance.now();
let acumulado = 0;
let ultimaUI = 0;
let proximoQuadro = 0;
let ultimaSombra = 0;
function ciclo(agora: number): void {
  requestAnimationFrame(ciclo);
  // Limite de FPS. Na app o vsync está desligado (electron/main.cjs), por isso sem limite o
  // browser chama isto tão depressa quanto a placa gráfica aguenta.
  if (def.fpsMax > 0) {
    const intervalo = 1000 / def.fpsMax;
    if (agora + 0.4 < proximoQuadro) return;
    proximoQuadro = agora - proximoQuadro > intervalo ? agora + intervalo : proximoQuadro + intervalo;
  }
  contarFps(agora);
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  // A montra corre sempre; o jogo a sério para enquanto há um menu aberto.
  if ((montra || (!menus.ecra && pausasModais === 0)) && !s.falencia) {
    // Fora do horário e sem ninguém no escritório, o tempo corre mais depressa.
    const vazio = s.funcionarios.every((f) => !f.dentro);
    const md = minutoDoDia(s);
    const noite = vazio && (md < 7 * 60 || md > 18 * 60);
    acumulado += dt * VELOCIDADES[montra ? 1 : velocidade] * (noite ? 8 : 1);
    const minutos = Math.floor(acumulado);
    acumulado -= minutos;
    if (minutos > 0) avancar(s, minutos);
  }
  autosave();

  sincronizarMapa();
  sincronizarFuncionarios(dt, agora);
  processarMensagensNovas();
  moverCamara(dt);
  grelha.visible = !montra && ferramenta !== 'selecionar';
  cortarParedes(dt);
  ambiente.atualizar(dt, minutoDoDia(s) + acumulado, def.cicloDia);
  atualizarBairro();
  confetes.atualizar(dt);
  emitirTrabalho(dt);
  particulas.atualizar(dt);
  if (!montra) atualizarTopo(dt);
  if (agora - ultimaUI > 150) {
    atualizarUI();
    ultimaUI = agora;
  }
  controlos.update(dt);
  posfx.intensidade(def.cicloDia ? ambiente.noite : 0);
  matVidro.emissiveIntensity = (def.cicloDia ? ambiente.noite : 0) * 0.35;
  // Sombras a 60 Hz na qualidade alta e a 30 nas outras, seja qual for o FPS: só as pessoas e os
  // carros mexem, e devagar.
  if (agora - ultimaSombra >= (def.qualidade === 'alta' ? 16 : 32)) {
    renderer.shadowMap.needsUpdate = true;
    ultimaSombra = agora;
  }
  posfx.render();
}

aplicarDefinicoes();
irParaMenuPrincipal();
{
  const { erro: e } = saveMaisRecente();
  if (e) avisoFlutuante(`Não foi possível carregar o jogo guardado. ${esc(e)}`, 'erro');
}
requestAnimationFrame(ciclo);

// Só em desenvolvimento: acesso ao estado e projeção de vértices da grelha para o ecrã (testes manuais).
if (import.meta.env.DEV) {
  Object.assign(window, {
    __jogo: s,
    __camara: camara,
    __renderer: renderer,
    __cena: cena,
    __controlos: controlos,
    __ecra: (vx: number, vz: number) => {
      const v = new THREE.Vector3(vx - 0.5, 0, vz - 0.5).project(camara);
      return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)];
    },
  });
}

/** Cartão do modo de jogo: progresso e prazo do desafio, ou o nome do modo sandbox. */
function htmlDesafio(): string {
  if (s.modo === 'sandbox') return `<div class="cartao"><h3>${ic('sparkles')} ${NOMES_MODO.sandbox.nome}</h3><div class="nota">${NOMES_MODO.sandbox.descricao}</div></div>`;
  if (!s.desafio) return s.semFalencia ? `<div class="cartao"><div class="nota">${ic('shield')} Sem falência: a empresa pode ficar com dívidas.</div></div>` : '';
  const def = DESAFIOS[s.desafio.id];
  const p = def.progresso(s);
  const pct = Math.round(Math.min(1, p.valor) * 100);
  const estado = s.desafio.resultado === 'ganho' ? `${ic('trophy')} Cumprido em ${textoMeses(s.desafio.mesFim ?? 0)}!`
    : s.desafio.resultado === 'perdido' ? `${ic('hourglass')} O prazo acabou. Continua em modo livre.`
    : `${ic('timer')} Faltam ${textoMeses(mesesDoDesafio(s))}`;
  return `<div class="cartao"><h3>${ic('target')} Desafio: ${esc(def.nome)}</h3>
    <div class="nota">${esc(def.descricao)}</div>
    <div class="linha"><span>${esc(p.texto)}</span><b>${pct}%</b></div>
    <div class="barra"><div style="width:${pct}%"></div></div>
    <div class="nota">${estado}</div></div>`;
}
