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
  trabalhoDoProjeto, vendasIniciais, areaDeTrabalho, bonusQualidade, comprarMelhoria, coordenacaoDe, HORA_FIM,
  HORA_INICIO, MELHORIAS, nivelDaEmpresa, pontosMelhoria, progressoNivel, rendaDe, serieDeLucro, temMelhoria,
  xpDeLancamento, avaliarEmpresa, rankingEmpresas, podeLevantar, levantarRonda, valorDaRonda, LISTA_RONDAS, RONDAS,
  LISTA_CAMPANHAS, CAMPANHAS, lancarCampanha, aceitarContrato, pagamentoDoContrato, DIAS_POR_MES,
  type IdRonda, type IdCampanha, type Projeto, type OfertaContrato,
  type Area, type IdMelhoria, type Aresta, type Competencias, type Estado, type Funcionario, type Mensagem, type Resultado,
  type TipoObjeto, type TipoSoftware,
} from './sim.ts';
import {
  CADEIRA_Z, Confetes, corFelicidade, criarCafe, criarMatraquilhos, criarPlanta, criarSecretaria, criarSofa, MAT, mat,
} from './modelos.ts';
import { ALTURA_INDICADOR, Pessoa } from './pessoas.ts';
import { materialPBR, texturaNoMundo } from './recursos.ts';
import { Ambiente } from './ambiente.ts';
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
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
posfx.excluirDaOclusao(particulas.grupo, confetes.malha);

// Chão: betão polido no espaço aberto; soalho ou parquet nas salas (com um tom por sala).
// Uma instância por célula em cada tipo de chão; a célula só aparece no tipo que lhe cabe.
const geoCelula = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const PISOS = [
  texturaNoMundo(materialPBR('concrete_floor_worn_001', 1, { color: 0xf2f0ec, roughness: 0.5 }), 0.56, 0.12),
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
    if (n >= 0) PISOS[piso].setColorAt(i, CORES_SALA[n % CORES_SALA.length]);
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

/** Paredes e portas desenhadas, para as baixar quando estão entre a câmara e o que se está a ver. */
interface Parede3D { o: THREE.Object3D; topo: THREE.Object3D | null; x: number; z: number; tipo: 'v' | 'h'; porta: boolean; f: number }
const paredes3D: Parede3D[] = [];
const ALTURA_CORTADA = 0.16; // fração da altura que fica (um murete)

function cortarParedes(dt: number): void {
  const t = controlos.target;
  const c = camara.position;
  const n = Math.hypot(c.x - t.x, c.z - t.z) || 1;
  const dx = (c.x - t.x) / n;
  const dz = (c.z - t.z) / n;
  const k = Math.min(1, dt * 9);
  for (const p of paredes3D) {
    const doLadoDaCamara = (p.x - t.x) * dx + (p.z - t.z) * dz > -0.8;
    const virada = p.tipo === 'h' ? Math.abs(dz) > 0.3 : Math.abs(dx) > 0.3;
    const alvo = doLadoDaCamara && virada ? ALTURA_CORTADA : 1;
    if (Math.abs(p.f - alvo) < 0.002) continue;
    p.f += (alvo - p.f) * k;
    p.o.scale.y = p.f;
    if (!p.porta) p.o.position.y = (ALTURA_PAREDE * p.f) / 2;
    if (p.topo) p.topo.position.y = ALTURA_PAREDE * p.f + 0.02;
  }
}

let versaoDesenhada = -1;
function sincronizarMapa(): void {
  if (versaoDesenhada === s.versaoMapa) return;
  versaoDesenhada = s.versaoMapa;
  grupoMapa.clear();
  ecras.clear();
  paredes3D.length = 0;
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
      paredes3D.push({ o: p, topo: null, x: p.position.x, z: p.position.z, tipo: a.tipo, porta: true, f: 1 });
    } else {
      const m = new THREE.Mesh(geoParede, matParede);
      m.castShadow = m.receiveShadow = true;
      colocarNaAresta(m, a, ALTURA_PAREDE / 2);
      grupoMapa.add(m);
      const topo = new THREE.Mesh(geoTopoParede, matTopoParede);
      colocarNaAresta(topo, a, ALTURA_PAREDE + 0.02);
      grupoMapa.add(topo);
      paredes3D.push({ o: m, topo, x: m.position.x, z: m.position.z, tipo: a.tipo, porta: false, f: 1 });
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

const bonecos = new Map<number, Pessoa>();
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
      b = new Pessoa(f.id, f.nome);
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
    const alvoZ = f.z + (sentado ? CADEIRA_Z : 0);
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

type Ferramenta = 'selecionar' | 'parede' | 'porta' | 'secretaria' | 'decoracao' | 'demolir';
const FERRAMENTAS: { id: Ferramenta; icone: NomeIcone; nome: string; preco: string; tecla: string; dica: string }[] = [
  { id: 'selecionar', icone: 'mouse-pointer-2', nome: 'Selecionar', preco: '', tecla: '1', dica: 'Clica num funcionário para ver a ficha. Botão direito roda a câmara, botão do meio arrasta, roda faz zoom (ou WASD e Q/E).' },
  { id: 'parede', icone: 'brick-wall', nome: 'Parede', preco: euros(ECON.custoParede), tecla: '2', dica: 'Arrasta entre cantos da grelha para desenhar uma parede. Fecha uma zona para criar uma sala.' },
  { id: 'porta', icone: 'door-open', nome: 'Porta', preco: euros(ECON.custoPorta), tecla: '3', dica: 'Clica numa parede para lhe abrir uma porta. Sem porta, ninguém entra na sala.' },
  { id: 'secretaria', icone: 'monitor', nome: 'Secretária', preco: euros(ECON.custoSecretaria), tecla: '4', dica: 'Clica numa célula para colocar uma secretária. Cada funcionário precisa de uma.' },
  { id: 'decoracao', icone: 'sprout', nome: 'Decoração', preco: '', tecla: '5', dica: 'Escolhe um objeto e clica numa célula. Alegra quem trabalha na mesma sala (fora das salas, quem está perto).' },
  { id: 'demolir', icone: 'hammer', nome: 'Demolir', preco: '', tecla: '6', dica: 'Clica numa parede, porta, secretária ou objeto para o remover, ou arrasta para demolir paredes. Sem reembolso.' },
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
  if (ev.key.toLowerCase() === 'm' && !ev.ctrlKey && !ev.metaKey) {
    abrirMelhorias();
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

const ICONE_TIPO: Record<TipoSoftware, string> = {
  utilitario: ic('calculator'), editor: ic('file-text'), antivirus: ic('shield'), jogo: ic('gamepad-2'),
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
  if (['semSecretaria', 'semAcesso', 'preso'].includes(f.estado)) return 'mau';
  return f.estado === 'aTrabalhar' ? 'bom' : '';
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

type Separador = 'projetos' | 'equipa' | 'contratar' | 'produtos' | 'mercado' | 'numeros';
const SEPARADORES: { id: Separador; icone: NomeIcone; nome: string }[] = [
  { id: 'projetos', icone: 'folder-kanban', nome: 'Projetos' },
  { id: 'equipa', icone: 'users', nome: 'Equipa' },
  { id: 'contratar', icone: 'user-plus', nome: 'Contratar' },
  { id: 'produtos', icone: 'package', nome: 'Produtos' },
  { id: 'mercado', icone: 'building-2', nome: 'Mercado' },
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
let modoNovo: 'produto' | 'contrato' = 'produto';
let ofertaEscolhida: number | null = null;
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
  if (s.projetos.length === 0) return '<div class="vazio">Nenhum projeto em curso. Começa um produto ou aceita um contrato aqui em baixo.</div>';
  const nivel = nivelDaEmpresa(s);
  return s.projetos.map((p) => {
    const pct = Math.min(100, (p.trabalhoFeito / p.trabalhoTotal) * 100);
    const funcs = p.funcionalidades.map((id) => TIPOS[p.tipo].funcionalidades.find((f) => f.id === id)!.nome);
    const membros = membrosDe(s, p.id);
    const prev = mesesRestantes(p, membros, coordenacaoDe(s));
    const q = Math.min(1, qualidadeDoProjeto(p) + bonusQualidade(s));
    const c = p.contrato;
    const dias = c ? Math.ceil((c.prazo - s.minuto) / MIN_POR_DIA) : 0;
    const sub = c ? `Contrato · ${esc(c.cliente)}` : `${TIPOS[p.tipo].nome}${funcs.length ? ` · ${funcs.join(', ')}` : ''}`;
    const stats = c
      ? `<div><b>${Math.round(q * 100)}%</b><small>qualidade</small></div>
        <div><b class="${c.atrasado ? 'mau' : dias <= 5 ? 'aviso' : ''}">${c.atrasado ? 'atrasado' : dias <= 0 ? 'hoje' : `${dias} d`}</b><small>prazo</small></div>
        <div><b>${compacto(pagamentoDoContrato(c, q))}</b><small>pagamento</small></div>`
      : `<div><b>${Math.round(q * 100)}%</b><small>qualidade</small></div>
        <div><b>${Number.isFinite(prev) ? mesesTexto(prev) : '—'}</b><small>${Number.isFinite(prev) ? 'meses' : 'parado'}</small></div>
        <div><b>${p.hype ? `+${Math.round(p.hype * 100)}%` : '—'}</b><small>expectativa</small></div>`;
    const marketing = c ? '' : `<div class="marketing"><div class="rotulo">${ic('megaphone')} Marketing</div><div class="campanhas">${LISTA_CAMPANHAS.map((id) => {
      const d = CAMPANHAS[id];
      const feita = p.campanhas?.includes(id) ?? false;
      const bloq = nivel < d.nivel;
      return `<button class="campanha ${feita ? 'feita' : ''}" data-acao="campanha" data-id="${p.id}" data-campanha="${id}" ${feita || bloq ? 'disabled' : ''}
        title="${d.descricao} Expectativa +${Math.round(d.hype * 100)}% (menos se já houver muita).">${ic(feita ? 'check' : bloq ? 'lock' : ICONE_CAMPANHA[id])}
        <span>${d.nome}</span><small>${feita ? 'feita' : bloq ? `nível ${d.nivel}` : euros(d.custo)}</small></button>`;
    }).join('')}</div></div>`;
    return `<div class="cartao projeto ${c ? 'contrato' : ''}">
      <div class="cab"><span class="ic-tipo">${c ? ic('briefcase') : ICONE_TIPO[p.tipo]}</span>
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
  if (!tipoDisponivel(s, tipoEscolhido)) tipoEscolhido = 'utilitario';
  const d = TIPOS[tipoEscolhido];
  const equipa = equipaEscolhida();
  const previsao = estimarProjeto(equipa, tipoEscolhido, funcEscolhidas, coordenacaoDe(s));
  previsao.qualidade = Math.min(1, previsao.qualidade + bonusQualidade(s));
  const mercado = fatorMercado(s, tipoEscolhido);
  const vendas = vendasIniciais(tipoEscolhido, funcEscolhidas, previsao.qualidade, mercado)
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
    return `<label class="opcao-check ${on ? 'on' : ''}"><input type="checkbox" data-func="${f.id}" ${on ? 'checked' : ''}><span class="caixa">${ic('check')}</span>
      <span class="cresce"><b>${f.nome}</b><small>+${(f.trabalho / 1000).toFixed(0)}k pontos · +${Math.round(f.valor * 100)}% vendas${req.length ? ` · precisa de ${req.join(', ')}` : ''}</small></span></label>`;
  }).join('');
  const meses = previsao.meses;
  const m = Math.round(mercado * 100);
  return `
    <div class="tipos">${tipos}</div>
    <p class="descricao">${d.descricao}</p>
    <div class="rotulo">Trabalho por área</div>
    ${htmlDivisao(tipoEscolhido)}
    ${funcs ? `<div class="rotulo">Funcionalidades</div><div class="lista-checks">${funcs}</div>` : ''}
    ${htmlEscolhaEquipa(equipa)}
    <div class="previsao">
      <div><small>Duração</small><b>${Number.isFinite(meses) ? `${mesesTexto(meses)} m` : equipa.length ? '> 3 anos' : '—'}</b></div>
      <div><small>Qualidade</small><b>${equipa.length ? `${Math.round(previsao.qualidade * 100)}%` : '—'}</b></div>
      <div><small>Vendas 1.º mês</small><b>${equipa.length ? euros(vendas) : '—'}</b></div>
    </div>
    <div class="mercado ${m < 70 ? 'aviso' : ''}" title="Os produtos do mesmo tipo ainda à venda ocupam o mercado."><span>Mercado livre</span>
      <div class="barra"><div style="width:${m}%"></div></div><b>${m}%</b></div>
    <div class="nota">Durante o desenvolvimento podes fazer campanhas de marketing para vender mais no lançamento.</div>
    <button data-acao="projeto" class="primario largo">${ic('rocket')} Começar desenvolvimento · ${trabalhoDoProjeto(tipoEscolhido, funcEscolhidas).toLocaleString('pt-PT')} pontos</button>`;
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

function htmlEquipa(): string {
  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const media = s.funcionarios.length ? s.funcionarios.reduce((t, f) => t + f.felicidade, 0) / s.funcionarios.length : 0;
  const opcoes = (f: Funcionario) => [`<option value="" ${f.projetoId === null ? 'selected' : ''}>Sem projeto</option>`,
    ...s.projetos.map((p) => `<option value="${p.id}" ${f.projetoId === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`)].join('');
  return `<div class="resumo">
      <div><small>Pessoas</small><b>${s.funcionarios.length}</b></div>
      <div><small>Salários</small><b>${euros(salarios)}</b></div>
      <div><small>Felicidade</small><b style="color:${COR_FEL(media)}">${s.funcionarios.length ? Math.round(media) : '—'}</b></div>
    </div>
    ${s.funcionarios.length === 0 ? '<div class="vazio">Ainda não tens funcionários. Vê o separador Contratar.</div>' : ''}
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
    <div class="cartao"><h3>${ic('chart-column')} Mercado livre</h3><div class="nota">Quanto venderia um produto novo de cada tipo.</div>${mercados}</div>
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
    <div class="linha"><span class="estado ${classeEstado(f)}">${NOME_ESTADO[f.estado]}</span>
      <span>${proj ? `${ic('folder-open')} ${esc(proj.nome)}` : '<span class="aviso">Sem projeto</span>'}</span></div>
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
  const vendas = s.produtos.reduce((t, p) => t + p.vendasMes, 0);
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
  definir(dica, textoArrasto || (ferramenta === 'selecionar' ? '' : `${ic(fer.icone)} <span>${fer.dica}</span>`));
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
    mercado: String(LISTA_RONDAS.filter((id) => podeLevantar(s, id).ok).length || ''),
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
      lateral.querySelector('.novo-projeto')!.classList.toggle('modo-contrato', modoNovo === 'contrato');
    } else if (separador === 'equipa') definir(document.getElementById('p-equipa')!, htmlEquipa());
    else if (separador === 'contratar') definir(document.getElementById('p-candidatos')!, htmlCandidatos());
    else if (separador === 'produtos') definir(document.getElementById('p-produtos')!, htmlProdutos());
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
    comecarJogo(novoJogo(Date.now() & 0xffff, LARGURA, ALTURA, { ...opcoes, missoes: true }));
    // Passa a ser o jogo mais recente: ao recarregar a página continua este, não o antigo.
    escreverLugar(LUGAR_AUTO, s);
    avisoFlutuante(`Bem-vindo à <b>${esc(s.nome)}</b>! Segue as missões à esquerda: começa por colocar secretárias (tecla 4) e contratar no separador Contratar.`, 'info', ic('sparkles'));
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
function ciclo(agora: number): void {
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
  posfx.render();
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
    __renderer: renderer,
    __controlos: controlos,
    __ecra: (vx: number, vz: number) => {
      const v = new THREE.Vector3(vx - 0.5, 0, vz - 0.5).project(camara);
      return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)];
    },
  });
}
