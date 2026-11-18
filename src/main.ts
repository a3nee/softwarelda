// Cena 3D, construção, interface e menus. A lógica do jogo vive em sim.ts.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  AREAS, alvoFelicidade, arestaMaisProxima, avancar, cancelarProjeto, colocarObjeto, colocarParedes, colocarPorta,
  colocarSecretaria, comDependencias, CONQUISTAS, contratar, definirEquipa, demolirArestas, despedir, detetarSalas,
  ECON, eficienciaEquipa, estimarProjeto, euros, exportarJogo, fatorMercado, gerarCandidatos, importarJogo,
  iniciarProjeto, lerAresta, LISTA_OBJETOS, LISTA_TIPOS, membrosDe, mensagem, mesDeJogo, mesesRestantes, MIN_POR_DIA, MIN_POR_MES,
  minutoDoDia, NADA, NOME_AREA, NOME_ESTADO, novoJogo, OBJETOS, objetoEm, PORTA, qualidadeDoProjeto, removerObjeto,
  removerSecretaria, secretariaEm, segmento, semDependentes, textoData, tipoDisponivel, TIPOS, totalDaArea,
  trabalhoDoProjeto, vendasIniciais,
  type Area, type Aresta, type Competencias, type Estado, type Funcionario, type Mensagem, type Resultado,
  type TipoObjeto, type TipoSoftware,
} from './sim.ts';
import {
  animarBoneco, Confetes, corFelicidade, criarBoneco, criarCafe, criarMatraquilhos, criarPlanta, criarSecretaria,
  criarSofa, MAT, mat, type Boneco,
} from './modelos.ts';
import { Ambiente } from './ambiente.ts';
import { guardarDefinicoes, lerDefinicoes, pixelRatio, type Definicoes } from './definicoes.ts';
import { configurarSom, som } from './som.ts';
import { desenharGrafico } from './grafico.ts';
import { ICONE_OBJETO, Menus } from './menus.ts';

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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
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

const ambiente = new Ambiente(cena, LARGURA, ALTURA, s.entrada);
const confetes = new Confetes(cena);

// Chão: uma instância por célula, para se poder colorir cada uma.
const geoCelula = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2);
const chao = new THREE.InstancedMesh(geoCelula, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), LARGURA * ALTURA);
chao.receiveShadow = true;
{
  const m = new THREE.Matrix4();
  for (let z = 0; z < ALTURA; z++)
    for (let x = 0; x < LARGURA; x++) {
      m.makeTranslation(x, 0, z);
      chao.setMatrixAt(z * LARGURA + x, m);
      chao.setColorAt(z * LARGURA + x, new THREE.Color(0xe4dfd5));
    }
}
cena.add(chao);

const COR_ABERTO = new THREE.Color(0xe4dfd5);
// Alcatifas das salas: cores vivas, mas não berrantes
const CORES_SALA = [0x7dd3fc, 0xf9a8d4, 0x86efac, 0xfde68a, 0xc4b5fd, 0xfdba74, 0x5eead4, 0xfca5a5].map((c) => new THREE.Color(c));
let totalSalas = 0;

/** Pinta o chão: cada sala fechada tem a sua cor, o espaço aberto fica claro. */
function pintarChao(): void {
  const salas = detetarSalas(s);
  totalSalas = salas.total;
  const cor = new THREE.Color();
  salas.sala.forEach((n, i) => {
    if (n < 0) cor.copy(COR_ABERTO);
    else cor.copy(CORES_SALA[n % CORES_SALA.length]);
    // Ligeiro xadrez, para o chão não parecer liso
    if ((i + Math.floor(i / LARGURA)) % 2) cor.offsetHSL(0, 0, -0.025);
    chao.setColorAt(i, cor);
  });
  chao.instanceColor!.needsUpdate = true;
}

// Marca da entrada: tapete verde do lado de dentro
const entrada = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.8), mat(0x16a34a, { roughness: 1 }));
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
const ALTURA_PAREDE = 1.1;
const ESPESSURA = 0.1;
const geoParede = new THREE.BoxGeometry(1 + ESPESSURA, ALTURA_PAREDE, ESPESSURA);
const geoOmbreira = new THREE.BoxGeometry(0.1, ALTURA_PAREDE, ESPESSURA + 0.04);
const geoVerga = new THREE.BoxGeometry(1, 0.16, ESPESSURA);
const geoFolha = new THREE.BoxGeometry(0.8, ALTURA_PAREDE - 0.2, 0.04);
const matParede = mat(0xf7f4ee, { roughness: 0.7 });
const matTopoParede = mat(0x475069, { roughness: 0.6 });
const geoTopoParede = new THREE.BoxGeometry(1 + ESPESSURA, 0.04, ESPESSURA + 0.02);
const matFolha = mat(0x7dd3fc, { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 });
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

let versaoDesenhada = -1;
function sincronizarMapa(): void {
  if (versaoDesenhada === s.versaoMapa) return;
  versaoDesenhada = s.versaoMapa;
  grupoMapa.clear();
  ecras.clear();
  for (const d of s.secretarias) {
    const m = criarSecretaria(d.id);
    m.grupo.position.set(d.x, 0, d.z);
    grupoMapa.add(m.grupo);
    ecras.set(d.id, m.ecra);
  }
  for (const o of s.objetos) {
    const g = criarObjeto(o.tipo, o.id);
    g.position.set(o.x, 0, o.z);
    grupoMapa.add(g);
  }
  for (const a of ARESTAS) {
    const v = lerAresta(s, a);
    if (v === NADA) continue;
    if (v === PORTA) {
      const p = criarPorta();
      colocarNaAresta(p, a);
      grupoMapa.add(p);
    } else {
      const m = new THREE.Mesh(geoParede, matParede);
      m.castShadow = m.receiveShadow = true;
      colocarNaAresta(m, a, ALTURA_PAREDE / 2);
      grupoMapa.add(m);
      const topo = new THREE.Mesh(geoTopoParede, matTopoParede);
      colocarNaAresta(topo, a, ALTURA_PAREDE + 0.02);
      grupoMapa.add(topo);
    }
  }
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
function mostrarModelo(chave: string, x: number, z: number, valido: boolean): void {
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
  fantasmaModelo.visible = true;
}

// ---------------------------------------------------------------------------
// Funcionários
// ---------------------------------------------------------------------------

const bonecos = new Map<number, Boneco>();
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
    if (!b) {
      b = criarBoneco(f.id, especialidade(f));
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
    const alvoX = f.x;
    const alvoZ = f.z + (sentado ? 0.34 : 0);
    if (acabouDeEntrar) g.position.set(alvoX, 0, alvoZ);
    const dx = alvoX - g.position.x;
    const dz = alvoZ - g.position.z;
    const k = Math.min(1, dt * 14);
    g.position.x += dx * k;
    g.position.z += dz * k;
    const aAndar = Math.hypot(dx, dz) > 0.02 && !sentado;
    // Virado para onde anda; sentado, virado para o ecrã (−z).
    const rumo = sentado ? Math.PI : aAndar ? Math.atan2(dx, dz) : g.rotation.y;
    let d = rumo - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 12);
    const anda = aAndar || f.estado === 'aCaminho' || f.estado === 'aSair';
    animarBoneco(b, sentado ? 'sentado' : anda ? 'andar' : 'parado', agora / 1000 + f.id);
    // Indicador de felicidade por cima da cabeça
    b.indicador.visible = def.indicadores || f.id === selecionado;
    b.indicador.position.y = (sentado ? 1.2 : 1.12) + Math.sin(agora / 400 + f.id) * 0.03;
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

type Ferramenta = 'selecionar' | 'parede' | 'porta' | 'secretaria' | 'decoracao' | 'demolir';
const FERRAMENTAS: { id: Ferramenta; icone: string; nome: string; preco: string; tecla: string; dica: string }[] = [
  { id: 'selecionar', icone: '🖱️', nome: 'Selecionar', preco: '', tecla: '1', dica: 'Clica num funcionário para ver a ficha. Botão direito roda a câmara, botão do meio arrasta, roda faz zoom (ou WASD e Q/E).' },
  { id: 'parede', icone: '🧱', nome: 'Parede', preco: euros(ECON.custoParede), tecla: '2', dica: 'Arrasta entre cantos da grelha para desenhar uma parede. Fecha uma zona para criar uma sala.' },
  { id: 'porta', icone: '🚪', nome: 'Porta', preco: euros(ECON.custoPorta), tecla: '3', dica: 'Clica numa parede para lhe abrir uma porta. Sem porta, ninguém entra na sala.' },
  { id: 'secretaria', icone: '🖥️', nome: 'Secretária', preco: euros(ECON.custoSecretaria), tecla: '4', dica: 'Clica numa célula para colocar uma secretária. Cada funcionário precisa de uma.' },
  { id: 'decoracao', icone: '🪴', nome: 'Decoração', preco: '', tecla: '5', dica: 'Escolhe um objeto e clica numa célula. Alegra quem trabalha na mesma sala (fora das salas, quem está perto).' },
  { id: 'demolir', icone: '🔨', nome: 'Demolir', preco: '', tecla: '6', dica: 'Clica numa parede, porta, secretária ou objeto para o remover, ou arrasta para demolir paredes. Sem reembolso.' },
];
let ferramenta: Ferramenta = 'selecionar';
let objetoEscolhido: TipoObjeto = 'planta';

function escolherFerramenta(f: Ferramenta): void {
  ferramenta = f;
  arrasto = null;
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
  if (ferramenta === 'secretaria' || ferramenta === 'decoracao') {
    const custo = ferramenta === 'secretaria' ? ECON.custoSecretaria : OBJETOS[objetoEscolhido].custo;
    const ocupada = !!secretariaEm(s, x, z) || !!objetoEm(s, x, z) || (x === s.entrada.x && z === s.entrada.z);
    const valido = !ocupada && s.dinheiro >= custo;
    mostrarModelo(ferramenta === 'secretaria' ? 'secretaria' : objetoEscolhido, x, z, valido);
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

renderer.domElement.addEventListener('pointermove', (ev) => atualizarCursores(pontoNoChao(ev)));

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 || menus.ecra) return;
  const p = pontoNoChao(ev);
  if (!p) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  if (ferramenta === 'selecionar') {
    const id = funcionarioEm(ev);
    if (id !== null) {
      som.clique();
      selecionarPessoa(id, false);
    } else selecionado = null;
    atualizarUI();
    return;
  }
  if (ferramenta === 'parede' || ferramenta === 'demolir') {
    arrasto = verticeDe(p);
    renderer.domElement.setPointerCapture(ev.pointerId);
    if (ferramenta === 'parede') mostrarFantasma([], false);
  } else if (ferramenta === 'secretaria') resultado(colocarSecretaria(s, x, z), som.construir);
  else if (ferramenta === 'decoracao') resultado(colocarObjeto(s, objetoEscolhido, x, z), som.construir);
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
    else if (arrasto || ferramenta !== 'selecionar') escolherFerramenta('selecionar');
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
  t.x = Math.max(-8, Math.min(LARGURA + 8, t.x));
  t.z = Math.max(-8, Math.min(ALTURA + 8, t.z));
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

const ICONE_TIPO: Record<TipoSoftware, string> = { utilitario: '🧮', editor: '📝', antivirus: '🛡️', jogo: '🎮' };
const SIGLA_AREA: Record<Area, string> = { programacao: 'Prog', design: 'Des', testes: 'Test' };
const COR_FEL = (f: number) => (f >= 70 ? '#34d399' : f >= 40 ? '#fbbf24' : '#f87171');
const CARA_FEL = (f: number) => (f >= 85 ? '😄' : f >= 70 ? '🙂' : f >= 40 ? '😐' : '😟');
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
  if (['semSecretaria', 'semAcesso', 'preso'].includes(f.estado)) return 'mau';
  return f.estado === 'aTrabalhar' ? 'bom' : '';
}

// --- Barra de cima ---------------------------------------------------------

const topo = el(`<div id="topo" class="ui vidro hud">
  <div class="marca"><span class="logo">SL</span><span class="empresa"></span></div>
  <div class="chip dinheiro" title="Dinheiro em caixa"><span class="ic">💶</span><b class="valor"></b><span class="delta"></span></div>
  <div class="chip saldo" title="Previsão para o próximo fecho do mês: vendas − salários − renda"><span class="ic">📈</span><span class="valor"></span></div>
  <div class="chip" title="Funcionários"><span class="ic">👥</span><span class="equipa"></span></div>
  <div class="chip" title="Felicidade média"><span class="ic cara">😊</span><span class="felicidade"></span></div>
  <div class="chip relogio"><span class="ic ceu">☀️</span><span class="data"></span><b class="hora"></b></div>
  <div class="velocidades">
    <button data-vel="0" title="Pausa (Espaço)">⏸</button><button data-vel="1" title="Normal">▶</button>
    <button data-vel="2" title="Rápido">▶▶</button><button data-vel="3" title="Muito rápido">▶▶▶</button>
  </div>
  <div class="direita">
    <span class="guardado"></span>
    <button data-jogo="guardar" class="icone" title="Guardar (Ctrl+S)">💾</button>
    <button data-jogo="menu" class="icone" title="Menu (Esc)">☰</button>
  </div>
</div>`);

topo.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  som.clique();
  if (b.dataset.vel) velocidade = Number(b.dataset.vel);
  else if (b.dataset.jogo === 'guardar') guardar();
  else if (b.dataset.jogo === 'menu') abrirPausa();
  atualizarUI();
});

// --- Ferramentas -----------------------------------------------------------

const barraFerramentas = el(`<div id="ferramentas" class="ui vidro hud">${FERRAMENTAS.map((f) => `
  <button data-ferr="${f.id}" class="ferr" title="${f.dica}"><span class="ic">${f.icone}</span><span class="nome">${f.nome}</span>
    ${f.preco ? `<span class="preco">${f.preco}</span>` : ''}<kbd>${f.tecla}</kbd></button>`).join('')}</div>`);
const barraObjetos = el(`<div id="objetos" class="ui vidro hud">${LISTA_OBJETOS.map((o) => `
  <button data-obj="${o}" class="obj" title="${OBJETOS[o].descricao}"><span class="ic">${ICONE_OBJETO[o]}</span>
    <span class="txt"><b>${OBJETOS[o].nome}</b><small>${euros(OBJETOS[o].custo)} · 😊 +${OBJETOS[o].felicidade}</small></span></button>`).join('')}</div>`);
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

type Separador = 'projetos' | 'equipa' | 'contratar' | 'produtos' | 'numeros';
const SEPARADORES: { id: Separador; icone: string; nome: string }[] = [
  { id: 'projetos', icone: '📁', nome: 'Projetos' },
  { id: 'equipa', icone: '👥', nome: 'Equipa' },
  { id: 'contratar', icone: '🤝', nome: 'Contratar' },
  { id: 'produtos', icone: '📦', nome: 'Produtos' },
  { id: 'numeros', icone: '📊', nome: 'Números' },
];
let separador: Separador = 'projetos';
let painelAberto = true;

const lateral = el(`<div id="lateral" class="ui vidro hud">
  <nav class="separadores">${SEPARADORES.map((t) => `
    <button data-sep="${t.id}" title="${t.nome}"><span class="ic">${t.icone}</span><span class="nome">${t.nome}</span><i class="badge"></i></button>`).join('')}
    <button data-painel title="Esconder / mostrar o painel" class="recolher">⟩</button>
  </nav>
  <div class="conteudo">
    <section data-sec="projetos">
      <div id="lista-projetos"></div>
      <div class="cartao novo-projeto">
        <h3>✨ Novo projeto</h3>
        <input type="text" id="nome-projeto" placeholder="Nome do produto (opcional)" maxlength="30">
        <div id="config-projeto"></div>
      </div>
    </section>
    <section data-sec="equipa"><div id="p-equipa"></div></section>
    <section data-sec="contratar"><div id="p-candidatos"></div></section>
    <section data-sec="produtos"><div id="p-produtos"></div></section>
    <section data-sec="numeros">
      <div class="cartao"><h3>📈 Últimos 24 meses</h3><canvas id="grafico"></canvas>
        <div class="legenda"><span class="l-rec">Receitas</span><span class="l-desp">Despesas</span><span class="l-caixa">Caixa</span></div></div>
      <div id="p-numeros"></div>
    </section>
  </div>
</div>`);

const caixaNoticias = el(`<div id="noticias" class="ui vidro hud"><div class="cab"><span>📰 Notícias</span><button data-recolher title="Esconder / mostrar">–</button></div><div class="lista"></div></div>`);
const caixaAvisos = el(`<div id="avisos" class="ui"></div>`);
const ficha = el(`<div id="ficha" class="ui vidro hud"></div>`);
const fim = el(`<div id="fim" class="ui"></div>`);

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
  } else if (a === 'projeto') {
    const input = document.getElementById('nome-projeto') as HTMLInputElement | null;
    const equipa = equipaEscolhida();
    const r = equipa.length === 0
      ? { ok: false, msg: 'Escolhe pelo menos uma pessoa para a equipa.' }
      : iniciarProjeto(s, input?.value ?? '', tipoEscolhido, funcEscolhidas, equipa.map((f) => f.id));
    resultado(r, som.evento);
    if (r.ok) {
      funcEscolhidas = [];
      marcacoes.clear();
      if (input) input.value = '';
    }
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
  } else if (c.dataset.membro) {
    marcacoes.set(Number(c.dataset.membro), c.checked);
  } else if (c.dataset.equipa) {
    const valor = (c as unknown as HTMLSelectElement).value;
    resultado(definirEquipa(s, Number(c.dataset.equipa), valor === '' ? null : Number(valor)));
  }
  som.clique();
  atualizarUI();
});

// Escolhas do próximo projeto (estado só da interface)
let tipoEscolhido: TipoSoftware = 'utilitario';
let funcEscolhidas: string[] = [];
/** Escolhas feitas à mão nas caixas da equipa; quem não foi mexido entra se estiver sem projeto. */
const marcacoes = new Map<number, boolean>();

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
  if (s.projetos.length === 0) return '<div class="vazio">Nenhum projeto em curso. Escolhe um tipo e a equipa aqui em baixo.</div>';
  return s.projetos.map((p) => {
    const pct = Math.min(100, (p.trabalhoFeito / p.trabalhoTotal) * 100);
    const funcs = p.funcionalidades.map((id) => TIPOS[p.tipo].funcionalidades.find((f) => f.id === id)!.nome);
    const membros = membrosDe(s, p.id);
    const prev = mesesRestantes(p, membros);
    return `<div class="cartao projeto">
      <div class="cab"><span class="ic-tipo">${ICONE_TIPO[p.tipo]}</span>
        <div class="cresce"><b>${esc(p.nome)}</b><small>${TIPOS[p.tipo].nome}${funcs.length ? ` · ${funcs.join(', ')}` : ''}</small></div>
        <button class="mini perigo" data-acao="cancelar" data-id="${p.id}" title="Cancelar (o trabalho perde-se)">✕</button></div>
      <div class="progresso"><div style="width:${pct.toFixed(1)}%"></div><span>${pct.toFixed(0)}%</span></div>
      <div class="stats3">
        <div><b>${Math.round(qualidadeDoProjeto(p) * 100)}%</b><small>qualidade</small></div>
        <div><b>${Number.isFinite(prev) ? mesesTexto(prev) : '—'}</b><small>${Number.isFinite(prev) ? 'meses' : 'parado'}</small></div>
        <div><b>${membros.length}</b><small>${membros.length === 1 ? 'pessoa' : 'pessoas'}</small></div>
      </div>
      ${AREAS.filter((a) => totalDaArea(p, a) > 0).map((a) => {
        const v = Math.min(100, (p.feito[a] / totalDaArea(p, a)) * 100);
        return `<div class="area a-${a}"><span>${NOME_AREA[a]}</span><div class="barra"><div style="width:${v.toFixed(1)}%"></div></div></div>`;
      }).join('')}
      <div class="chips-equipa">${membros.length
        ? membros.map((f) => avatar(f.nome, especialidade(f))).join('')
          + (membros.length > 1 ? `<small>rendimento ${Math.round(eficienciaEquipa(membros.length) * 100)}% por pessoa</small>` : '')
        : '<span class="aviso">⚠ Sem equipa: o projeto está parado.</span>'}</div>
    </div>`;
  }).join('');
}

function htmlConfigProjeto(): string {
  if (!tipoDisponivel(s, tipoEscolhido)) tipoEscolhido = 'utilitario';
  const d = TIPOS[tipoEscolhido];
  const equipa = equipaEscolhida();
  const previsao = estimarProjeto(equipa, tipoEscolhido, funcEscolhidas);
  const mercado = fatorMercado(s, tipoEscolhido);
  const vendas = vendasIniciais(tipoEscolhido, funcEscolhidas, previsao.qualidade, mercado);
  const tipos = LISTA_TIPOS.map((t) => {
    const livre = tipoDisponivel(s, t);
    const n = TIPOS[t].produtosNecessarios;
    return `<button data-acao="tipo" data-tipo="${t}" class="tipo ${t === tipoEscolhido ? 'ativo' : ''}" ${livre ? '' : 'disabled'}
      title="${livre ? TIPOS[t].descricao : `Precisa de ${n} produto${n === 1 ? '' : 's'} lançado${n === 1 ? '' : 's'}`}">
      <span class="ic">${livre ? ICONE_TIPO[t] : '🔒'}</span><b>${TIPOS[t].nome}</b>
      <small>${livre ? `${Math.round(trabalhoDoProjeto(t, []) / 1000)}k pontos` : `${n} produto${n === 1 ? '' : 's'}`}</small></button>`;
  }).join('');
  const divisao = AREAS.map((a) => {
    const v = Math.round(d.areas[a] * 100);
    return `<div class="a-${a}" style="flex:${d.areas[a]}" title="${NOME_AREA[a]} ${v}%">${v >= 15 ? `${SIGLA_AREA[a]} ${v}%` : ''}</div>`;
  }).join('');
  const funcs = d.funcionalidades.map((f) => {
    const req = f.requer.map((r) => d.funcionalidades.find((o) => o.id === r)!.nome);
    const on = funcEscolhidas.includes(f.id);
    return `<label class="opcao-check ${on ? 'on' : ''}"><input type="checkbox" data-func="${f.id}" ${on ? 'checked' : ''}><span class="caixa"></span>
      <span class="cresce"><b>${f.nome}</b><small>+${(f.trabalho / 1000).toFixed(0)}k pontos · +${Math.round(f.valor * 100)}% vendas${req.length ? ` · precisa de ${req.join(', ')}` : ''}</small></span></label>`;
  }).join('');
  const pessoas = s.funcionarios.map((f) => {
    const outro = s.projetos.find((p) => p.id === f.projetoId);
    const on = equipa.includes(f);
    return `<label class="opcao-check pessoa-check ${on ? 'on' : ''}"><input type="checkbox" data-membro="${f.id}" ${on ? 'checked' : ''}>${avatar(f.nome, especialidade(f))}
      <span class="cresce"><b>${esc(f.nome)}</b><small>${AREAS.map((a) => `${SIGLA_AREA[a]} ${Math.round(f.competencias[a] * 100)}`).join(' · ')}${outro ? ` · sai de «${esc(outro.nome)}»` : ''}</small></span></label>`;
  }).join('');
  const meses = previsao.meses;
  const m = Math.round(mercado * 100);
  return `
    <div class="tipos">${tipos}</div>
    <p class="descricao">${d.descricao}</p>
    <div class="rotulo">Trabalho por área</div>
    <div class="divisao">${divisao}</div>
    ${funcs ? `<div class="rotulo">Funcionalidades</div><div class="lista-checks">${funcs}</div>` : ''}
    <div class="rotulo">Equipa${equipa.length > 1 ? ` · rendimento ${Math.round(eficienciaEquipa(equipa.length) * 100)}% por pessoa` : ''}</div>
    ${pessoas ? `<div class="lista-checks">${pessoas}</div>` : '<div class="vazio aviso">Contrata alguém primeiro (separador 🤝 Contratar).</div>'}
    <div class="previsao">
      <div><small>Duração</small><b>${Number.isFinite(meses) ? `${mesesTexto(meses)} m` : equipa.length ? '> 3 anos' : '—'}</b></div>
      <div><small>Qualidade</small><b>${equipa.length ? `${Math.round(previsao.qualidade * 100)}%` : '—'}</b></div>
      <div><small>Vendas 1.º mês</small><b>${equipa.length ? euros(vendas) : '—'}</b></div>
    </div>
    <div class="mercado ${m < 70 ? 'aviso' : ''}" title="Os produtos do mesmo tipo ainda à venda ocupam o mercado."><span>Mercado livre</span>
      <div class="barra"><div style="width:${m}%"></div></div><b>${m}%</b></div>
    <button data-acao="projeto" class="primario largo">🚀 Começar desenvolvimento · ${trabalhoDoProjeto(tipoEscolhido, funcEscolhidas).toLocaleString('pt-PT')} pontos</button>`;
}

function htmlEquipa(): string {
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const media = s.funcionarios.length ? s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length : 0;
  const opcoes = (f: Funcionario) => [`<option value="" ${f.projetoId === null ? 'selected' : ''}>Sem projeto</option>`,
    ...s.projetos.map((p) => `<option value="${p.id}" ${f.projetoId === p.id ? 'selected' : ''}>📁 ${esc(p.nome)}</option>`)].join('');
  return `<div class="resumo">
      <div><small>Pessoas</small><b>${s.funcionarios.length}</b></div>
      <div><small>Salários</small><b>${euros(salarios)}</b></div>
      <div><small>Felicidade</small><b style="color:${COR_FEL(media)}">${s.funcionarios.length ? Math.round(media) : '—'}</b></div>
    </div>
    ${s.funcionarios.length === 0 ? '<div class="vazio">Ainda não tens funcionários. Vê o separador 🤝 Contratar.</div>' : ''}
    ${s.funcionarios.map((f) => `<div class="cartao pessoa ${f.id === selecionado ? 'selecionado' : ''}" data-pessoa="${f.id}" title="Clica para ver no escritório">
      ${avatar(f.nome, especialidade(f))}
      <div class="cresce">
        <div class="linha"><b>${esc(f.nome)}</b><span class="estado ${classeEstado(f)}">${NOME_ESTADO[f.estado]}</span></div>
        ${barrasCompetencias(f.competencias)}
        <div class="linha sub"><span style="color:${COR_FEL(f.felicidade)}">${CARA_FEL(f.felicidade)} ${Math.round(f.felicidade)}</span><span>${euros(f.salario)}/mês</span></div>
        <div class="linha"><select data-equipa="${f.id}" class="${f.projetoId === null ? 'aviso' : ''}">${opcoes(f)}</select>
          <button class="mini perigo" data-acao="despedir" data-id="${f.id}">Despedir</button></div>
      </div></div>`).join('')}`;
}

function htmlCandidatos(): string {
  const livres = s.secretarias.length - s.funcionarios.length;
  return `<div class="nota">Novos candidatos no início de cada mês. O salário depende da competência.</div>
    ${livres <= 0 ? `<div class="nota aviso">⚠ Não há secretárias livres: quem contratares fica sem trabalhar até colocares mais uma (tecla 4).</div>` : ''}
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

function htmlProdutos(): string {
  const vendas = s.produtos.reduce((t, p) => t + p.vendasMes, 0);
  const total = s.produtos.reduce((t, p) => t + p.receitaTotal, 0);
  const mercados = LISTA_TIPOS.filter((t) => tipoDisponivel(s, t)).map((t) => {
    const m = Math.round(fatorMercado(s, t) * 100);
    return `<div class="mercado ${m < 70 ? 'aviso' : ''}"><span>${ICONE_TIPO[t]} ${TIPOS[t].plural}</span><div class="barra"><div style="width:${m}%"></div></div><b>${m}%</b></div>`;
  }).join('');
  const estrelas = (q: number) => {
    const n = Math.max(1, Math.round(q * 5));
    return `<span class="estrelas" title="Qualidade ${Math.round(q * 100)}%">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  };
  return `<div class="resumo">
      <div><small>Próximo mês</small><b class="bom">${euros(vendas)}</b></div>
      <div><small>Receita total</small><b>${euros(total)}</b></div>
      <div><small>Produtos</small><b>${s.produtos.length}</b></div>
    </div>
    <div class="cartao"><h3>🛒 Mercado livre</h3><div class="nota">Quanto venderia um produto novo de cada tipo.</div>${mercados}</div>
    ${s.produtos.length === 0 ? '<div class="vazio">Nenhum produto lançado ainda.</div>' : ''}
    ${s.produtos.slice(-15).reverse().map((p) => `<div class="cartao produto">
      <span class="ic-tipo">${ICONE_TIPO[p.tipo]}</span>
      <div class="cresce"><b>${esc(p.nome)}</b><small>${TIPOS[p.tipo].nome} · total ${euros(p.receitaTotal)}</small>${estrelas(p.qualidade)}</div>
      <div class="vendas"><b>${euros(p.vendasMes)}</b><small>por mês</small></div></div>`).join('')}`;
}

function htmlNumeros(): string {
  const tem = new Set(s.conquistas);
  const melhor = s.produtos.reduce((m, p) => Math.max(m, p.qualidade), 0);
  const recorde = s.historico.reduce((m, r) => Math.max(m, r.receitas), 0);
  const total = s.produtos.reduce((t, p) => t + p.receitaTotal, 0);
  return `<div class="resumo grelha">
      <div><small>Meses de vida</small><b>${mesDeJogo(s)}</b></div>
      <div><small>Produtos lançados</small><b>${s.produtos.length}</b></div>
      <div><small>Melhor qualidade</small><b>${s.produtos.length ? `${Math.round(melhor * 100)}%` : '—'}</b></div>
      <div><small>Melhor mês</small><b>${euros(recorde)}</b></div>
      <div><small>Receita total</small><b>${euros(total)}</b></div>
      <div><small>Salas</small><b>${totalSalas}</b></div>
    </div>
    <div class="cartao"><h3>🏆 Conquistas <small>${tem.size} de ${CONQUISTAS.length}</small></h3>
      <div class="mini-conquistas">${CONQUISTAS.map((c) => `<span class="${tem.has(c.id) ? 'feita' : ''}" title="${c.nome}: ${c.descricao}">${tem.has(c.id) ? c.icone : '🔒'}</span>`).join('')}</div></div>`;
}

function htmlFicha(f: Funcionario): string {
  const area = especialidade(f);
  const alvo = alvoFelicidade(s, f);
  const proj = s.projetos.find((p) => p.id === f.projetoId);
  const ritmo = Math.round((0.5 + f.felicidade / 200) * 100);
  const nota = alvo > 75 ? ` (decoração +${Math.round(alvo - 75)})` : alvo < 75 ? ' (sem secretária)' : '';
  return `<div class="cab">${avatar(f.nome, area, true)}
      <div class="cresce"><b>${esc(f.nome)}</b><small>Especialista em ${NOME_AREA[area].toLowerCase()} · ${euros(f.salario)}/mês</small></div>
      <button class="mini" data-fechar title="Fechar (Esc)">✕</button></div>
    <div class="linha"><span class="estado ${classeEstado(f)}">${NOME_ESTADO[f.estado]}</span>
      <span>${proj ? `📁 ${esc(proj.nome)}` : '<span class="aviso">Sem projeto</span>'}</span></div>
    <div class="felicidade">
      <div class="linha"><span>${CARA_FEL(f.felicidade)} Felicidade</span><b style="color:${COR_FEL(f.felicidade)}">${Math.round(f.felicidade)}</b></div>
      <div class="barra"><div style="width:${Math.round(f.felicidade)}%;background:${COR_FEL(f.felicidade)}"></div></div>
      <small>Tende para ${Math.round(alvo)}${nota} · ritmo de trabalho ${ritmo}%</small>
    </div>
    ${barrasCompetencias(f.competencias)}`;
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
      <button data-fim="carregar" class="primario">📂 Carregar último jogo guardado</button>
      <button data-fim="novo">✨ Novo jogo</button>
      <button data-fim="menu">🏠 Menu principal</button>
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

const ICONE_AVISO: Partial<Record<string, string>> = { lancamento: '🚀', desbloqueio: '🔓', falencia: '💥', erro: '⛔', info: 'ℹ️' };

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
    if (m.tipo === 'lancamento' || m.tipo === 'conquista') {
      const c = new THREE.Vector3();
      const ds = s.secretarias.length ? s.secretarias : [{ x: LARGURA / 2, z: ALTURA / 2 }];
      for (const d of ds) c.add(new THREE.Vector3(d.x, 0, d.z));
      confetes.disparar(c.divideScalar(ds.length));
    }
    if (montra) continue;
    const t = m.tipo ?? 'info';
    if (t === 'mes') {
      const r = s.historico.find((h) => h.mes === Math.round(m.minuto / MIN_POR_MES) - 1);
      const saldo = r ? r.receitas - r.despesas : 0;
      mostrarDelta(saldo);
      if (def.avisos) avisoFlutuante(`Fecho do mês: <b>${saldo >= 0 ? '+' : ''}${euros(saldo)}</b>`, saldo >= 0 ? 'mes-bom' : 'mes-mau', '💶');
      if (saldo > 0) som.dinheiro();
      continue;
    }
    const efeitos: Partial<Record<string, () => void>> = {
      lancamento: som.lancamento, conquista: som.conquista, desbloqueio: som.evento, evento: som.evento,
      aviso: som.aviso, falencia: som.falencia,
    };
    if (efeitos[t]) {
      efeitos[t]!();
      if (def.avisos || t === 'falencia') avisoFlutuante(esc(m.texto), t);
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
  texto('.ceu', ambiente.noite > 0.5 && def.cicloDia ? '🌙' : '☀️');
}

function atualizarUI(): void {
  if (montra) return;
  texto('.empresa', s.nome);
  const vendas = s.produtos.reduce((t, p) => t + p.vendasMes, 0);
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const saldo = vendas - salarios - ECON.rendaMensal;
  texto('.saldo .valor', `${saldo >= 0 ? '+' : ''}${euros(saldo)}/mês`);
  topo.querySelector('.saldo')!.classList.toggle('negativo', saldo < 0);
  texto('.equipa', String(s.funcionarios.length));
  const media = s.funcionarios.length ? s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length : 0;
  texto('.felicidade', s.funcionarios.length ? String(Math.round(media)) : '—');
  texto('.cara', s.funcionarios.length ? CARA_FEL(media) : '😊');
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
  definir(dica, textoArrasto || (ferramenta === 'selecionar' ? '' : `${fer.icone} ${fer.dica}`));
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
    produtos: '',
    numeros: '',
  };
  lateral.querySelectorAll<HTMLButtonElement>('[data-sep]').forEach((b) => {
    const i = b.querySelector('.badge') as HTMLElement;
    const v = badges[b.dataset.sep as Separador];
    if (i.textContent !== v) i.textContent = v;
    i.classList.toggle('alerta', b.dataset.sep === 'equipa' && problemas > 0);
  });
  if (painelAberto) {
    if (separador === 'projetos') {
      definir(document.getElementById('lista-projetos')!, htmlListaProjetos());
      definir(document.getElementById('config-projeto')!, htmlConfigProjeto());
    } else if (separador === 'equipa') definir(document.getElementById('p-equipa')!, htmlEquipa());
    else if (separador === 'contratar') definir(document.getElementById('p-candidatos')!, htmlCandidatos());
    else if (separador === 'produtos') definir(document.getElementById('p-produtos')!, htmlProdutos());
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

  const cor: Record<string, string> = { lancamento: 'bom', conquista: 'ouro', evento: 'info', aviso: 'mau', falencia: 'mau', desbloqueio: 'roxo', mes: 'mes' };
  definir(caixaNoticias.querySelector('.lista') as HTMLElement, s.mensagens.slice(-25).reverse().map(
    (m) => `<div class="n-${cor[m.tipo ?? 'info'] ?? 'normal'}"><span class="hora">${textoData(m.minuto).split(' — ')[0]}</span>${esc(m.texto)}</div>`,
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
  configurarSom(def.sons, def.volume);
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
    avisoFlutuante('Jogo guardado neste browser.', 'info', '💾');
  } else erro('Não foi possível guardar (o armazenamento do browser está cheio ou bloqueado).');
  atualizarUI();
}

/** Carrega o mais recente entre o save manual e o autosave. */
function carregar(): void {
  const { melhor, erro: e } = saveMaisRecente();
  if (!melhor) return erro(e || 'Não há nenhum jogo guardado.');
  mensagem(melhor.estado, 'Jogo carregado: continuas onde ficaste.');
  comecarJogo(melhor.estado);
  avisoFlutuante(`Bem-vindo de volta à <b>${esc(s.nome)}</b>!`, 'info', '📂');
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
    comecarJogo(novoJogo(Date.now() & 0xffff, LARGURA, ALTURA, opcoes));
    // Passa a ser o jogo mais recente: ao recarregar a página continua este, não o antigo.
    escreverLugar(LUGAR_AUTO, s);
    avisoFlutuante(`Bem-vindo à <b>${esc(s.nome)}</b>! Começa por colocar secretárias (tecla 4) e contratar no separador 🤝 Contratar.`, 'info', '👋');
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
  if (montra) vistaDeMenu();
  graficoDesenhado = '';
});

let ultimo = performance.now();
let acumulado = 0;
let ultimaUI = 0;
function ciclo(agora: number): void {
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  // A montra corre sempre; o jogo a sério para enquanto há um menu aberto.
  if ((montra || !menus.ecra) && !s.falencia) {
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
  ambiente.atualizar(dt, minutoDoDia(s) + acumulado, def.cicloDia);
  confetes.atualizar(dt);
  if (!montra) atualizarTopo(dt);
  if (agora - ultimaUI > 150) {
    atualizarUI();
    ultimaUI = agora;
  }
  controlos.update(dt);
  renderer.render(cena, camara);
  requestAnimationFrame(ciclo);
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
    __controlos: controlos,
    __ecra: (vx: number, vz: number) => {
      const v = new THREE.Vector3(vx - 0.5, 0, vz - 0.5).project(camara);
      return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)];
    },
  });
}
