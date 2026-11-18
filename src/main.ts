// Cena 3D, construção e interface. A lógica do jogo vive em sim.ts.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  AREAS, cancelarProjeto, definirEquipa, eficienciaEquipa, membrosDe, mesesRestantes, type Projeto,
  arestaMaisProxima, avancar, estimarProjeto, NOME_AREA, qualidadeDoProjeto, totalDaArea, type Area,
  type Competencias, colocarParedes, colocarPorta, colocarSecretaria, comDependencias,
  contratar, demolirArestas, despedir, detetarSalas, ECON, euros, fatorMercado, iniciarProjeto,
  lerAresta, LISTA_TIPOS, minutoDoDia, NADA, NOME_ESTADO, novoJogo, PORTA, removerSecretaria,
  secretariaEm, segmento, semDependentes, textoData, tipoDisponivel, TIPOS, trabalhoDoProjeto,
  exportarJogo, importarJogo, mensagem, mesDeJogo,
  vendasIniciais, type Aresta, type Estado, type Funcionario, type Resultado, type TipoSoftware,
  objetoEm, removerObjeto, type Mensagem, type TipoObjeto,
} from './sim.ts';
import {
  animarBoneco, Confetes, corFelicidade, criarBoneco, criarCafe, criarMatraquilhos, criarPlanta, criarSecretaria,
  criarSofa, MAT, mat, type Boneco,
} from './modelos.ts';
import { Ambiente } from './ambiente.ts';

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

/** No arranque continua o jogo guardado mais recente (manual ou autosave). */
function jogoInicial(): Estado {
  const lugares = [lerLugar(LUGAR_MANUAL), lerLugar(LUGAR_AUTO)];
  let melhor: { estado: Estado; guardadoEm: number } | null = null;
  let erro = '';
  for (const r of lugares) {
    if (!r) continue;
    if (!r.ok) erro = r.msg;
    else if (!melhor || r.guardadoEm > melhor.guardadoEm) melhor = r;
  }
  if (melhor) {
    mensagem(melhor.estado, 'Jogo carregado: continuas onde ficaste.');
    return melhor.estado;
  }
  const novo = novoJogo(Date.now() & 0xffff, LARGURA, ALTURA);
  if (erro) mensagem(novo, `⚠ Não foi possível carregar o jogo guardado. ${erro}`);
  return novo;
}

let s: Estado = jogoInicial();
let mesGuardado = mesDeJogo(s);

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const cena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
// Centro ligeiramente à direita para o painel lateral não tapar o terreno.
const centro = new THREE.Vector3((s.largura - 1) / 2 + 3, 0, (s.altura - 1) / 2);
camara.position.set(centro.x + 10, 24, centro.z + 22);

const controlos = new OrbitControls(camara, renderer.domElement);
controlos.target.copy(centro);
controlos.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
controlos.maxPolarAngle = Math.PI * 0.45;
controlos.minDistance = 6;
controlos.maxDistance = 70;
controlos.enableDamping = true;
controlos.dampingFactor = 0.12;
controlos.update();

const ambiente = new Ambiente(cena, s.largura, s.altura, s.entrada);
const confetes = new Confetes(cena);

// Chão: uma instância por célula, para se poder colorir cada uma.
const geoCelula = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2);
const chao = new THREE.InstancedMesh(
  geoCelula,
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
  s.largura * s.altura,
);
chao.receiveShadow = true;
{
  const m = new THREE.Matrix4();
  for (let z = 0; z < s.altura; z++)
    for (let x = 0; x < s.largura; x++) {
      m.makeTranslation(x, 0, z);
      chao.setMatrixAt(z * s.largura + x, m);
      chao.setColorAt(z * s.largura + x, new THREE.Color(0xe4dfd5));
    }
}
cena.add(chao);

const COR_ABERTO = new THREE.Color(0xe4dfd5);
// Alcatifas das salas: cores vivas, mas não berrantes
const CORES_SALA = [0x7dd3fc, 0xf9a8d4, 0x86efac, 0xfde68a, 0xc4b5fd, 0xfdba74, 0x5eead4, 0xfca5a5].map((c) => new THREE.Color(c));
let totalSalas = 0;

/** Pinta o chão: cada sala fechada tem a sua cor, o espaço aberto fica cinzento. */
function pintarChao(): void {
  const salas = detetarSalas(s);
  totalSalas = salas.total;
  const cor = new THREE.Color();
  salas.sala.forEach((n, i) => {
    if (n < 0) cor.copy(COR_ABERTO);
    else cor.copy(CORES_SALA[n % CORES_SALA.length]);
    // Ligeiro xadrez, para o chão não parecer liso
    if ((i + Math.floor(i / s.largura)) % 2) cor.offsetHSL(0, 0, -0.025);
    chao.setColorAt(i, cor);
  });
  chao.instanceColor!.needsUpdate = true;
}

// Marca da entrada: tapete verde do lado de dentro
const entrada = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.02, 0.8),
  mat(0x16a34a, { roughness: 1 }),
);
entrada.position.set(s.entrada.x, 0.01, s.entrada.z);
entrada.receiveShadow = true;
cena.add(entrada);

// Cursores: célula, vértice (início de parede) e aresta (porta / demolir)
const cursor = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }),
);
cursor.position.y = 0.02;
cena.add(cursor);
const cursorVertice = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10),
  new THREE.MeshBasicMaterial({ color: 0xffe066 }),
);
cursorVertice.position.y = 0.3;
cena.add(cursorVertice);
const cursorAresta = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.08, 0.16),
  new THREE.MeshBasicMaterial({ color: 0xffe066 }),
);
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
const matOmbreira = MAT.madeiraEscura;
const matFolha = mat(0x7dd3fc, { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 });
const matFantasma = new THREE.MeshBasicMaterial({ color: 0x6fd68b, transparent: true, opacity: 0.45 });
const matFantasmaMau = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.45 });

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
    const o = new THREE.Mesh(geoOmbreira, matOmbreira);
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
  for (let z = 0; z < s.altura; z++) for (let x = 0; x <= s.largura; x++) r.push({ tipo: 'v', x, z });
  for (let z = 0; z <= s.altura; z++) for (let x = 0; x < s.largura; x++) r.push({ tipo: 'h', x, z });
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
function mostrarFantasma(arestas: Aresta[], demolir: boolean): void {
  fantasma.clear();
  const custo = arestas.filter((a) => lerAresta(s, a) === NADA).length * ECON.custoParede;
  const mat = demolir || custo > s.dinheiro ? matFantasmaMau : matFantasma;
  for (const a of arestas) {
    const m = new THREE.Mesh(geoParede, mat);
    colocarNaAresta(m, a, ALTURA_PAREDE / 2);
    m.scale.y = demolir ? 1.05 : 1;
    fantasma.add(m);
  }
  textoArrasto = demolir
    ? `Demolir ${arestas.filter((a) => lerAresta(s, a) !== NADA).length} segmento(s)`
    : `${arestas.length} segmento(s) — ${euros(custo)}`;
}
let textoArrasto = '';

// ---------------------------------------------------------------------------
// Funcionários
// ---------------------------------------------------------------------------

const bonecos = new Map<number, Boneco>();
let mostrarIndicadores = true;

function especialidade(f: Funcionario): Area {
  return AREAS.reduce((m, a) => (f.competencias[a] > f.competencias[m] ? a : m), AREAS[0]);
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
    }
    const g = b.grupo;
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
    animarBoneco(b, sentado ? 'sentado' : aAndar || f.estado === 'aCaminho' || f.estado === 'aSair' ? 'andar' : 'parado', agora / 1000 + f.id);
    // Indicador de felicidade por cima da cabeça
    b.indicador.visible = mostrarIndicadores;
    b.indicador.position.y = 1.12 + Math.sin(agora / 400 + f.id) * 0.03;
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
}

// Avisos que pedem efeitos (confetes nos lançamentos)
const vistas = new WeakSet<Mensagem>();
function marcarMensagensVistas(): void {
  for (const m of s.mensagens) vistas.add(m);
}
function processarMensagensNovas(): void {
  for (const m of s.mensagens) {
    if (vistas.has(m)) continue;
    vistas.add(m);
    if (m.tipo === 'lancamento' || m.tipo === 'conquista') {
      const c = new THREE.Vector3();
      const ds = s.secretarias.length ? s.secretarias : [{ x: s.largura / 2, z: s.altura / 2 }];
      for (const d of ds) c.add(new THREE.Vector3(d.x, 0, d.z));
      confetes.disparar(c.divideScalar(ds.length));
    }
  }
}
marcarMensagensVistas();

// ---------------------------------------------------------------------------
// Ferramentas e rato
// ---------------------------------------------------------------------------

type Ferramenta = 'selecionar' | 'parede' | 'porta' | 'secretaria' | 'demolir';
const FERRAMENTAS: { id: Ferramenta; nome: string; tecla: string; dica: string }[] = [
  { id: 'selecionar', nome: 'Selecionar', tecla: '1', dica: 'Botão direito roda a câmara, botão do meio arrasta, roda faz zoom.' },
  { id: 'parede', nome: `Parede (${euros(ECON.custoParede)})`, tecla: '2', dica: 'Arrasta entre cantos da grelha para desenhar uma parede reta. Fecha uma zona para criar uma sala.' },
  { id: 'porta', nome: `Porta (${euros(ECON.custoPorta)})`, tecla: '3', dica: 'Clica numa parede para lhe abrir uma porta. Sem porta, ninguém entra na sala.' },
  { id: 'secretaria', nome: `Secretária (${euros(ECON.custoSecretaria)})`, tecla: '4', dica: 'Clica numa célula para colocar uma secretária.' },
  { id: 'demolir', nome: 'Demolir', tecla: '5', dica: 'Clica numa parede, porta ou secretária para a remover, ou arrasta para demolir uma parede inteira. Sem reembolso.' },
];
let ferramenta: Ferramenta = 'selecionar';

const raio = new THREE.Raycaster();
const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rato = new THREE.Vector2();

function pontoNoChao(ev: MouseEvent): THREE.Vector3 | null {
  rato.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  raio.setFromCamera(rato, camara);
  const p = new THREE.Vector3();
  return raio.ray.intersectPlane(planoChao, p) ? p : null;
}

const limitar = (v: number, max: number) => Math.max(0, Math.min(max, v));
/** Vértice da grelha mais próximo (cantos das células, de 0 a largura/altura). */
function verticeDe(p: THREE.Vector3): { x: number; z: number } {
  return { x: limitar(Math.round(p.x + 0.5), s.largura), z: limitar(Math.round(p.z + 0.5), s.altura) };
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
  cursor.visible = cursorVertice.visible = cursorAresta.visible = false;
  if (!p) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  const naGrelha = x >= 0 && z >= 0 && x < s.largura && z < s.altura;
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
      cursorAresta.visible = true;
      colocarNaAresta(cursorAresta, a, ALTURA_PAREDE + 0.05);
      return;
    }
  }
  if ((ferramenta === 'secretaria' || (ferramenta === 'demolir' && (secretariaEm(s, x, z) || objetoEm(s, x, z)))) && naGrelha) {
    cursor.visible = true;
    cursor.position.set(x, 0.02, z);
  }
}

renderer.domElement.addEventListener('pointermove', (ev) => atualizarCursores(pontoNoChao(ev)));

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  const p = pontoNoChao(ev);
  if (!p) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  let r: Resultado = { ok: true };
  if (ferramenta === 'parede' || ferramenta === 'demolir') {
    arrasto = verticeDe(p);
    renderer.domElement.setPointerCapture(ev.pointerId);
    if (ferramenta === 'parede') mostrarFantasma([], false);
  } else if (ferramenta === 'secretaria') r = colocarSecretaria(s, x, z);
  else if (ferramenta === 'porta') {
    const a = arestaDe(p);
    r = a ? colocarPorta(s, a) : { ok: false, msg: 'As portas têm de ser colocadas numa parede.' };
  }
  if (!r.ok && r.msg) aviso(r.msg);
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
  let r: Resultado = { ok: true };
  if (ferramenta === 'parede') {
    if (arestas.length) r = colocarParedes(s, arestas);
  } else if (arestas.length) {
    r = demolirArestas(s, arestas);
  } else {
    // Clique simples com Demolir: aresta perto do rato, senão a secretária da célula
    const v = verticeDe(p);
    if (v.x === inicio.x && v.z === inicio.z) {
      const a = arestaDe(p);
      const cx = Math.round(p.x);
      const cz = Math.round(p.z);
      r = a ? demolirArestas(s, [a]) : objetoEm(s, cx, cz) ? removerObjeto(s, cx, cz) : removerSecretaria(s, cx, cz);
    }
  }
  if (!r.ok && r.msg) aviso(r.msg);
  atualizarCursores(p);
});

addEventListener('keydown', (ev) => {
  if ((ev.target as HTMLElement).tagName === 'INPUT') return;
  const f = FERRAMENTAS.find((o) => o.tecla === ev.key);
  if (f) {
    ferramenta = f.id;
    atualizarCursores(null);
  }
  if (ev.key === 'Escape') {
    arrasto = null;
    fantasma.clear();
    textoArrasto = '';
    ferramenta = 'selecionar';
  }
  if (ev.key === ' ') velocidade = velocidade === 0 ? 1 : 0;
});

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const e = t.content.firstElementChild as HTMLElement;
  document.body.appendChild(e);
  return e;
}

const topo = el(`<div id="topo" class="ui painel">
  <strong>Software Lda.</strong>
  <span class="dinheiro"></span>
  <span class="data"></span>
  <span class="salas sub"></span>
  <span>
    <button data-vel="0">⏸</button>
    <button data-vel="1">▶</button>
    <button data-vel="2">▶▶</button>
    <button data-vel="3">▶▶▶</button>
  </span>
  <span class="jogo">
    <span class="sub guardado"></span>
    <button data-jogo="guardar" title="Guarda neste browser. Há também um autosave no fecho de cada mês.">Guardar</button>
    <button data-jogo="carregar" title="Volta ao último jogo guardado (manual ou autosave)">Carregar</button>
    <button data-jogo="novo">Novo jogo</button>
  </span>
</div>`);
const ferramentas = el(`<div id="ferramentas" class="ui painel">${FERRAMENTAS.map(
  (f) => `<button data-ferr="${f.id}" title="Tecla ${f.tecla}">${f.nome}</button>`,
).join('')}</div>`);
const dica = el(`<div id="dica" class="ui painel"></div>`);
const lateral = el(`<div id="lateral" class="ui">
  <div class="painel" id="p-projeto"></div>
  <div class="painel" id="p-equipa"></div>
  <div class="painel" id="p-candidatos"></div>
  <div class="painel" id="p-produtos"></div>
</div>`);
const caixaMensagens = el(`<div id="mensagens" class="ui painel"></div>`);
const fim = el(`<div id="fim" class="ui"><div class="painel">Falência! A Software Lda. fechou portas.
  <div class="linha"><button data-jogo="carregar">Carregar jogo guardado</button><button data-jogo="novo">Novo jogo</button></div></div></div>`);

const VELOCIDADES = [0, 24, 72, 200]; // minutos de jogo por segundo real
let velocidade = 1;

topo.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (b?.dataset.vel) velocidade = Number(b.dataset.vel);
});
for (const e of [topo, fim])
  e.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button');
    const a = b?.dataset.jogo;
    if (a === 'guardar') guardar();
    else if (a === 'carregar') carregar();
    else if (a === 'novo' && (s.falencia || confirm('Começar um jogo novo? O jogo atual perde-se se não o guardares.'))) {
      usarEstado(novoJogo(Date.now() & 0xffff, LARGURA, ALTURA));
      // Passa a ser o jogo mais recente: ao recarregar a página continua este, não o antigo.
      escreverLugar(LUGAR_AUTO, s);
    }
    atualizarUI();
  });

let textoGuardado = '';
function guardar(): void {
  if (escreverLugar(LUGAR_MANUAL, s)) {
    textoGuardado = `Guardado: ${textoData(s.minuto).split(' — ')[0]}`;
    mensagem(s, 'Jogo guardado.');
  } else aviso('Não foi possível guardar (o armazenamento do browser está cheio ou bloqueado).');
}

/** Carrega o mais recente entre o save manual e o autosave. */
function carregar(): void {
  let melhor: { estado: Estado; guardadoEm: number } | null = null;
  let erro = 'Não há nenhum jogo guardado.';
  for (const r of [lerLugar(LUGAR_MANUAL), lerLugar(LUGAR_AUTO)]) {
    if (!r) continue;
    if (!r.ok) erro = r.msg;
    else if (!melhor || r.guardadoEm > melhor.guardadoEm) melhor = r;
  }
  if (!melhor) return aviso(erro);
  mensagem(melhor.estado, 'Jogo carregado.');
  usarEstado(melhor.estado);
}

/** Troca o jogo em curso; a cena e as escolhas da interface voltam a ser construídas a partir dele. */
function usarEstado(novo: Estado): void {
  s = novo;
  mesGuardado = mesDeJogo(s);
  versaoDesenhada = -1;
  tipoEscolhido = 'utilitario';
  funcEscolhidas = [];
  marcacoes.clear();
  textoGuardado = '';
  arrasto = null;
  fantasma.clear();
  textoArrasto = '';
  marcarMensagensVistas();
  if (import.meta.env.DEV) Object.assign(window, { __jogo: s });
}

/** Autosave no fecho de cada mês (não guarda uma falência por cima do último jogo bom). */
function autosave(): void {
  const mes = mesDeJogo(s);
  if (mes === mesGuardado) return;
  mesGuardado = mes;
  if (s.falencia) return;
  if (escreverLugar(LUGAR_AUTO, s)) textoGuardado = `Autosave: ${textoData(s.minuto).split(' — ')[0]}`;
}
ferramentas.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (b?.dataset.ferr) {
    ferramenta = b.dataset.ferr as Ferramenta;
    atualizarCursores(null);
  }
});
lateral.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  const a = b.dataset.acao;
  let r = { ok: true } as { ok: boolean; msg?: string };
  if (a === 'contratar') r = contratar(s, Number(b.dataset.i));
  else if (a === 'despedir') r = despedir(s, Number(b.dataset.id));
  else if (a === 'tipo') {
    tipoEscolhido = b.dataset.tipo as TipoSoftware;
    funcEscolhidas = [];
  } else if (a === 'projeto') {
    const input = document.getElementById('nome-projeto') as HTMLInputElement | null;
    const equipa = equipaEscolhida();
    if (equipa.length === 0) r = { ok: false, msg: 'Escolhe pelo menos uma pessoa para a equipa.' };
    else r = iniciarProjeto(s, input?.value ?? '', tipoEscolhido, funcEscolhidas, equipa.map((f) => f.id));
    if (r.ok) {
      funcEscolhidas = [];
      marcacoes.clear();
      if (input) input.value = '';
    }
  } else if (a === 'cancelar') {
    if (confirm('Cancelar o projeto? O trabalho feito perde-se.')) r = cancelarProjeto(s, Number(b.dataset.id));
  }
  if (!r.ok && r.msg) aviso(r.msg);
  atualizarUI();
});
// Funcionalidades: marcar junta as dependências, desmarcar tira o que dependia delas.
// Equipa do novo projeto: caixas de seleção. Mudar alguém de projeto: lista na Equipa.
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
    const r = definirEquipa(s, Number(c.dataset.equipa), valor === '' ? null : Number(valor));
    if (!r.ok && r.msg) aviso(r.msg);
  }
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

function estimarProjetoEmCurso(p: Projeto, membros: Funcionario[]): number {
  return mesesRestantes(p, membros);
}

const SIGLA_AREA: Record<Area, string> = { programacao: 'Prog', design: 'Des', testes: 'Test' };

/** "Prog 70 · Des 30 · Test 25", com a especialidade (a área mais forte) destacada. */
function textoCompetencias(c: Competencias): string {
  const forte = AREAS.reduce((m, a) => (c[a] > c[m] ? a : m), AREAS[0]);
  return AREAS.map((a) => {
    const v = `${SIGLA_AREA[a]} ${Math.round(c[a] * 100)}`;
    return a === forte ? `<b>${v}</b>` : v;
  }).join(' · ');
}

function esc(texto: string): string {
  return texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function aviso(texto: string): void {
  s.mensagens.push({ minuto: s.minuto, texto: `⚠ ${texto}` });
}

/** Só substitui o HTML quando muda, para não perder o foco nem o hover. */
function definir(e: HTMLElement, html: string): void {
  if (e.dataset.html !== html) {
    e.dataset.html = html;
    e.innerHTML = html;
  }
}

function atualizarUI(): void {
  const din = topo.querySelector('.dinheiro') as HTMLElement;
  din.textContent = euros(s.dinheiro);
  din.classList.toggle('negativo', s.dinheiro < 0);
  (topo.querySelector('.data') as HTMLElement).textContent = textoData(s.minuto);
  topo.querySelectorAll<HTMLButtonElement>('[data-vel]').forEach((b) =>
    b.classList.toggle('ativo', Number(b.dataset.vel) === velocidade));
  ferramentas.querySelectorAll<HTMLButtonElement>('[data-ferr]').forEach((b) =>
    b.classList.toggle('ativo', b.dataset.ferr === ferramenta));
  definir(dica, textoArrasto || FERRAMENTAS.find((f) => f.id === ferramenta)!.dica);
  (topo.querySelector('.guardado') as HTMLElement).textContent = textoGuardado;
  (topo.querySelector('.salas') as HTMLElement).textContent = totalSalas === 1 ? '1 sala' : `${totalSalas} salas`;

  const pProjeto = document.getElementById('p-projeto')!;
  // O campo do nome fica fora das partes redesenhadas, para não perder o foco ao escrever.
  definir(pProjeto, `<div id="lista-projetos"></div>
    <h3>Novo projeto</h3>
    <div class="linha"><input type="text" id="nome-projeto" placeholder="Nome (opcional)" maxlength="30"></div>
    <div id="config-projeto"></div>`);

  definir(document.getElementById('lista-projetos')!, s.projetos.map((p) => {
    const pct = Math.min(100, (p.trabalhoFeito / p.trabalhoTotal) * 100);
    const funcs = p.funcionalidades.map((id) => TIPOS[p.tipo].funcionalidades.find((f) => f.id === id)!.nome);
    const membros = membrosDe(s, p.id);
    const prev = estimarProjetoEmCurso(p, membros);
    return `<div class="projeto">
      <div class="linha"><h3>${esc(p.nome)}</h3><button data-acao="cancelar" data-id="${p.id}" title="O trabalho feito perde-se">Cancelar</button></div>
      <div class="sub">${TIPOS[p.tipo].nome}${funcs.length ? ` · ${funcs.join(', ')}` : ''}</div>
      <div class="barra"><div style="width:${pct.toFixed(1)}%"></div></div>
      <div class="sub">${pct.toFixed(0)}% · qualidade ${Math.round(qualidadeDoProjeto(p) * 100)}%
        · ${Number.isFinite(prev) ? `faltam ~${prev.toFixed(1).replace('.', ',')} meses` : 'parado'}</div>
      ${AREAS.filter((a) => totalDaArea(p, a) > 0).map((a) => {
        const v = Math.min(100, (p.feito[a] / totalDaArea(p, a)) * 100);
        return `<div class="area"><span class="sub">${NOME_AREA[a]}</span>
          <div class="barra fina"><div style="width:${v.toFixed(1)}%"></div></div></div>`;
      }).join('')}
      <div class="sub ${membros.length ? '' : 'aviso'}">${membros.length
        ? `Equipa: ${membros.map((f) => esc(f.nome.split(' ')[0])).join(', ')}${membros.length > 1 ? ` (rendimento ${Math.round(eficienciaEquipa(membros.length) * 100)}% por pessoa)` : ''}`
        : 'Sem equipa: o projeto está parado.'}</div>
    </div>`;
  }).join(''));

  if (!tipoDisponivel(s, tipoEscolhido)) tipoEscolhido = 'utilitario';
  const def = TIPOS[tipoEscolhido];
  const equipa = equipaEscolhida();
  const trabalho = trabalhoDoProjeto(tipoEscolhido, funcEscolhidas);
  const previsao = estimarProjeto(equipa, tipoEscolhido, funcEscolhidas);
  const qualidade = previsao.qualidade;
  const mercado = fatorMercado(s, tipoEscolhido);
  const vendas = vendasIniciais(tipoEscolhido, funcEscolhidas, qualidade, mercado);
  const tipos = LISTA_TIPOS.map((t) => {
    const livre = tipoDisponivel(s, t);
    const n = TIPOS[t].produtosNecessarios;
    return `<button data-acao="tipo" data-tipo="${t}" class="${t === tipoEscolhido ? 'ativo' : ''}" ${livre ? '' : 'disabled'}
      title="${livre ? TIPOS[t].descricao : `Precisa de ${n} produto${n === 1 ? '' : 's'} lançado${n === 1 ? '' : 's'}`}">${livre ? '' : '🔒 '}${TIPOS[t].nome}</button>`;
  }).join('');
  const funcs = def.funcionalidades.map((f) => {
    const req = f.requer.map((r) => def.funcionalidades.find((o) => o.id === r)!.nome);
    return `<label class="func"><input type="checkbox" data-func="${f.id}" ${funcEscolhidas.includes(f.id) ? 'checked' : ''}>
      <span>${f.nome}<div class="sub">+${(f.trabalho / 1000).toFixed(0)}k pontos · +${Math.round(f.valor * 100)}% vendas${req.length ? ` · precisa de ${req.join(', ')}` : ''}</div></span></label>`;
  }).join('');
  const pessoas = s.funcionarios.map((f) => {
    const outro = s.projetos.find((p) => p.id === f.projetoId);
    return `<label class="func"><input type="checkbox" data-membro="${f.id}" ${equipa.includes(f) ? 'checked' : ''}>
      <span>${esc(f.nome)}<div class="sub">${textoCompetencias(f.competencias)}${outro ? ` · sai de «${esc(outro.nome)}»` : ''}</div></span></label>`;
  }).join('');
  const meses = previsao.meses;
  const areas = AREAS.map((a) => `${NOME_AREA[a]} ${Math.round(def.areas[a] * 100)}%`).join(' · ');
  definir(document.getElementById('config-projeto')!, `
    <div class="tipos">${tipos}</div>
    <div class="sub">${def.descricao}</div>
    <div class="sub">Trabalho por área: ${areas}</div>
    ${funcs ? `<div class="funcs">${funcs}</div>` : ''}
    <div class="sub">Equipa${equipa.length > 1 ? ` (rendimento ${Math.round(eficienciaEquipa(equipa.length) * 100)}% por pessoa)` : ''}:</div>
    ${pessoas ? `<div class="funcs">${pessoas}</div>` : '<div class="sub aviso">Contrata alguém primeiro.</div>'}
    <div class="sub">Trabalho: ${trabalho.toLocaleString('pt-PT')} pontos
      (${Number.isFinite(meses) ? `~${meses.toFixed(1).replace('.', ',')} meses com esta equipa` : equipa.length ? 'mais de 3 anos' : 'sem equipa'})</div>
    <div class="sub ${mercado < 0.7 ? 'aviso' : ''}">Vendas no 1.º mês: ~${euros(vendas)}
      (qualidade ~${Math.round(qualidade * 100)}%, mercado ${Math.round(mercado * 100)}%)</div>
    <div class="linha"><button data-acao="projeto">Começar desenvolvimento</button></div>`);

  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  const opcoes = (f: Funcionario) => [`<option value="" ${f.projetoId === null ? 'selected' : ''}>Sem projeto</option>`,
    ...s.projetos.map((p) => `<option value="${p.id}" ${f.projetoId === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`)].join('');
  definir(document.getElementById('p-equipa')!, `<h3>Equipa (${s.funcionarios.length}) — ${euros(salarios)}/mês</h3>
    ${s.funcionarios.length === 0 ? '<div class="sub">Ainda não tens funcionários.</div>' : ''}
    ${s.funcionarios.map((f) => `<div class="linha">
      <div>${esc(f.nome)}<div class="sub ${['semSecretaria', 'semAcesso', 'preso'].includes(f.estado) ? 'aviso' : ''}">
        ${NOME_ESTADO[f.estado]} · 😊 ${Math.round(f.felicidade)}</div><div class="sub">${textoCompetencias(f.competencias)}</div>
        <select data-equipa="${f.id}" class="${f.projetoId === null ? 'aviso' : ''}">${opcoes(f)}</select></div>
      <button data-acao="despedir" data-id="${f.id}">Despedir</button></div>`).join('')}`);

  definir(document.getElementById('p-candidatos')!, `<h3>Candidatos</h3>
    ${s.candidatos.length === 0 ? '<div class="sub">Novos candidatos no próximo mês.</div>' : ''}
    ${s.candidatos.map((c, i) => `<div class="linha">
      <div>${c.nome}<div class="sub">${textoCompetencias(c.competencias)}</div><div class="sub">${euros(c.salario)}/mês</div></div>
      <button data-acao="contratar" data-i="${i}">Contratar</button></div>`).join('')}`);

  const mercados = LISTA_TIPOS.filter((t) => tipoDisponivel(s, t)).map((t) => {
    const m = Math.round(fatorMercado(s, t) * 100);
    return `<div class="linha sub ${m < 70 ? 'aviso' : ''}"><span>${TIPOS[t].plural}</span><span>${m}%</span></div>`;
  }).join('');
  definir(document.getElementById('p-produtos')!, `<h3>Produtos</h3>
    <div class="sub" title="Quanto um produto novo de cada tipo venderia em relação ao normal. Os produtos do mesmo tipo ainda à venda ocupam o mercado.">
      Mercado livre (um produto novo venderia):</div>
    ${mercados}
    ${s.produtos.length === 0 ? '<div class="sub">Nenhum produto lançado.</div>' : ''}
    ${s.produtos.slice(-8).reverse().map((p) => `<div class="linha">
      <div>${esc(p.nome)}<div class="sub">${TIPOS[p.tipo].nome} · qualidade ${Math.round(p.qualidade * 100)}% · total ${euros(p.receitaTotal)}</div></div>
      <span>${euros(p.vendasMes)}/mês</span></div>`).join('')}`);

  definir(caixaMensagens, s.mensagens.slice(-12).reverse().map(
    (m) => `<div><span class="hora">${textoData(m.minuto).split(' — ')[0]}</span>${m.texto}</div>`,
  ).join(''));

  fim.style.display = s.falencia ? 'flex' : 'none';
}

// ---------------------------------------------------------------------------
// Ciclo
// ---------------------------------------------------------------------------

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let ultimo = performance.now();
let acumulado = 0;
let ultimaUI = 0;
function ciclo(agora: number): void {
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  // Fora do horário e sem ninguém no escritório, o tempo corre mais depressa.
  const vazio = s.funcionarios.every((f) => !f.dentro);
  const md = minutoDoDia(s);
  const noite = vazio && (md < 7 * 60 || md > 18 * 60);
  acumulado += dt * VELOCIDADES[velocidade] * (noite ? 8 : 1);
  const minutos = Math.floor(acumulado);
  acumulado -= minutos;
  if (minutos > 0) avancar(s, minutos);
  autosave();

  sincronizarMapa();
  sincronizarFuncionarios(dt, agora);
  processarMensagensNovas();
  ambiente.atualizar(dt, minutoDoDia(s) + acumulado, true);
  confetes.atualizar(dt);
  if (agora - ultimaUI > 150) {
    atualizarUI();
    ultimaUI = agora;
  }
  controlos.update();
  renderer.render(cena, camara);
  requestAnimationFrame(ciclo);
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
