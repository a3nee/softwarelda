// Modelos 3D (só Three.js, sem lógica de jogo): mobiliário, decoração, funcionários e confetes.
// Cada célula da grelha mede 1 × 1; os modelos estão centrados na célula, com o chão em y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// Materiais e geometrias partilhados
// ---------------------------------------------------------------------------

export function mat(cor: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.75, metalness: 0, ...extra });
}

export const MAT = {
  madeira: mat(0xd29a62, { roughness: 0.55 }),
  madeiraEscura: mat(0x8a5a36, { roughness: 0.6 }),
  branco: mat(0xf3f1ec, { roughness: 0.6 }),
  metal: mat(0xaab3c5, { metalness: 0.7, roughness: 0.3 }),
  preto: mat(0x1c1f2b, { roughness: 0.45 }),
  ecraDesligado: mat(0x0d1018, { roughness: 0.15, metalness: 0.2 }),
  ecraLigado: mat(0x0d1a2a, { emissive: 0x38bdf8, emissiveIntensity: 1.4, roughness: 0.2 }),
  ecraCodigo: mat(0x10241a, { emissive: 0x4ade80, emissiveIntensity: 1.2, roughness: 0.2 }),
  ecraDesign: mat(0x2a1024, { emissive: 0xf472b6, emissiveIntensity: 1.2, roughness: 0.2 }),
  terracota: mat(0xc8643c, { roughness: 0.8 }),
  terra: mat(0x4a3424, { roughness: 1 }),
  folha: mat(0x34c46a, { roughness: 0.7, flatShading: true }),
  folhaEscura: mat(0x1f9a55, { roughness: 0.7, flatShading: true }),
  vermelho: mat(0xef4444, { roughness: 0.5 }),
  azul: mat(0x3b82f6, { roughness: 0.5 }),
  relvaMesa: mat(0x16a34a, { roughness: 0.9 }),
  luzVermelha: mat(0x220000, { emissive: 0xff3b3b, emissiveIntensity: 2 }),
};

const cacheCaixas = new Map<string, THREE.BufferGeometry>();
/** Caixa de arestas arredondadas (geometria partilhada por tamanho). */
function geoCaixa(w: number, h: number, d: number, raio = 0): THREE.BufferGeometry {
  const k = `${w}|${h}|${d}|${raio}`;
  let g = cacheCaixas.get(k);
  if (!g) {
    g = raio > 0 ? new RoundedBoxGeometry(w, h, d, 2, raio) : new THREE.BoxGeometry(w, h, d);
    cacheCaixas.set(k, g);
  }
  return g;
}

function malha(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

function caixa(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, raio = 0): THREE.Mesh {
  return malha(geoCaixa(w, h, d, raio), m, x, y, z);
}

const cacheCilindros = new Map<string, THREE.BufferGeometry>();
function cilindro(rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, lados = 16): THREE.Mesh {
  const k = `${rt}|${rb}|${h}|${lados}`;
  let g = cacheCilindros.get(k);
  if (!g) cacheCilindros.set(k, (g = new THREE.CylinderGeometry(rt, rb, h, lados)));
  return malha(g, m, x, y, z);
}

/** Pseudo-aleatório a partir de um número (para variar modelos sem mexer no aleatório do jogo). */
export function hash(n: number): number {
  let t = (n * 0x9e3779b1) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Secretária (quem trabalha senta-se em +z, virado para −z)
// ---------------------------------------------------------------------------

const CORES_CADEIRA = [0x6366f1, 0xec4899, 0x14b8a6, 0xf59e0b, 0x8b5cf6, 0x0ea5e9];
const CORES_CANECA = [0xffffff, 0xfacc15, 0xf43f5e, 0x22d3ee, 0xa3e635];

export interface ModeloSecretaria {
  grupo: THREE.Group;
  ecra: THREE.Mesh;
}

export function criarSecretaria(id: number): ModeloSecretaria {
  const g = new THREE.Group();
  g.add(caixa(0.94, 0.05, 0.58, MAT.madeira, 0, 0.5, -0.12, 0.015));
  for (const x of [-0.43, 0.43]) g.add(caixa(0.04, 0.48, 0.52, MAT.branco, x, 0.24, -0.12));
  g.add(caixa(0.82, 0.22, 0.03, MAT.branco, 0, 0.36, -0.38)); // painel de trás
  // Monitor
  g.add(caixa(0.14, 0.015, 0.1, MAT.preto, 0, 0.532, -0.3));
  g.add(caixa(0.03, 0.14, 0.03, MAT.preto, 0, 0.6, -0.32));
  g.add(caixa(0.5, 0.31, 0.03, MAT.preto, 0, 0.75, -0.3, 0.01));
  const ecra = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.27), MAT.ecraDesligado);
  ecra.position.set(0, 0.75, -0.284);
  g.add(ecra);
  // Teclado, rato e caneca
  g.add(caixa(0.32, 0.015, 0.11, MAT.preto, -0.02, 0.532, -0.06, 0.005));
  g.add(caixa(0.05, 0.015, 0.08, MAT.preto, 0.24, 0.532, -0.05, 0.007));
  g.add(cilindro(0.035, 0.03, 0.08, mat(CORES_CANECA[Math.floor(hash(id + 3) * CORES_CANECA.length)]), -0.34, 0.565, -0.2, 10));
  // Cadeira de escritório
  const corCadeira = mat(CORES_CADEIRA[Math.floor(hash(id) * CORES_CADEIRA.length)], { roughness: 0.6 });
  const cad = new THREE.Group();
  cad.add(cilindro(0.2, 0.2, 0.03, MAT.preto, 0, 0.04, 0, 5));
  cad.add(cilindro(0.025, 0.025, 0.24, MAT.metal, 0, 0.17, 0, 8));
  cad.add(caixa(0.4, 0.07, 0.38, corCadeira, 0, 0.3, 0, 0.03));
  cad.add(caixa(0.4, 0.38, 0.06, corCadeira, 0, 0.53, 0.19, 0.03));
  cad.position.z = 0.34;
  g.add(cad);
  return { grupo: g, ecra };
}

// ---------------------------------------------------------------------------
// Decoração
// ---------------------------------------------------------------------------

const geoFolhagem = new THREE.IcosahedronGeometry(0.2, 0);

export function criarPlanta(id: number): THREE.Group {
  const g = new THREE.Group();
  g.add(cilindro(0.17, 0.13, 0.3, MAT.terracota, 0, 0.15, 0, 14));
  g.add(cilindro(0.16, 0.16, 0.02, MAT.terra, 0, 0.29, 0, 14));
  const n = 4 + Math.floor(hash(id) * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(id + i) * 0.5;
    const f = malha(geoFolhagem, i % 2 ? MAT.folha : MAT.folhaEscura, Math.cos(a) * 0.1, 0.5 + hash(id * 7 + i) * 0.25, Math.sin(a) * 0.1);
    f.scale.setScalar(0.7 + hash(id * 3 + i) * 0.5);
    f.rotation.set(hash(i) * 3, hash(i + 9) * 3, 0);
    g.add(f);
  }
  return g;
}

const CORES_SOFA = [0xec4899, 0x14b8a6, 0x8b5cf6, 0xf97316];

export function criarSofa(id: number): THREE.Group {
  const g = new THREE.Group();
  const c = mat(CORES_SOFA[Math.floor(hash(id) * CORES_SOFA.length)], { roughness: 0.9 });
  const almofada = mat(new THREE.Color(CORES_SOFA[Math.floor(hash(id) * CORES_SOFA.length)]).offsetHSL(0, -0.1, 0.12), { roughness: 0.95 });
  g.add(caixa(0.92, 0.2, 0.56, c, 0, 0.16, 0, 0.05));
  g.add(caixa(0.92, 0.42, 0.14, c, 0, 0.36, -0.22, 0.05));
  for (const x of [-0.42, 0.42]) g.add(caixa(0.12, 0.32, 0.56, c, x, 0.3, 0, 0.05));
  for (const x of [-0.18, 0.18]) g.add(caixa(0.34, 0.08, 0.4, almofada, x, 0.3, 0.04, 0.04));
  for (const [x, z] of [[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]]) g.add(caixa(0.05, 0.06, 0.05, MAT.madeiraEscura, x, 0.03, z));
  return g;
}

export function criarCafe(): THREE.Group {
  const g = new THREE.Group();
  g.add(caixa(0.8, 0.5, 0.5, MAT.madeira, 0, 0.25, -0.1, 0.02));
  g.add(caixa(0.82, 0.04, 0.52, MAT.branco, 0, 0.52, -0.1, 0.01));
  // Máquina
  g.add(caixa(0.3, 0.38, 0.28, MAT.metal, -0.12, 0.73, -0.16, 0.03));
  g.add(caixa(0.26, 0.08, 0.06, MAT.preto, -0.12, 0.84, -0.01, 0.01));
  g.add(caixa(0.04, 0.04, 0.02, MAT.luzVermelha, -0.04, 0.84, 0.03));
  g.add(cilindro(0.04, 0.035, 0.07, MAT.branco, -0.12, 0.58, 0.0, 10));
  // Chávenas
  for (let i = 0; i < 3; i++) g.add(cilindro(0.035, 0.03, 0.06, MAT.branco, 0.12 + i * 0.09, 0.57, -0.05, 10));
  return g;
}

export function criarMatraquilhos(): THREE.Group {
  const g = new THREE.Group();
  g.add(caixa(0.6, 0.16, 0.9, MAT.madeiraEscura, 0, 0.52, 0, 0.02));
  g.add(caixa(0.52, 0.02, 0.82, MAT.relvaMesa, 0, 0.6, 0));
  for (const [x, z] of [[-0.26, -0.4], [0.26, -0.4], [-0.26, 0.4], [0.26, 0.4]]) g.add(caixa(0.06, 0.45, 0.06, MAT.madeiraEscura, x, 0.22, z));
  const geoVara = new THREE.CylinderGeometry(0.008, 0.008, 0.8, 6).rotateZ(Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const z = -0.3 + i * 0.2;
    g.add(malha(geoVara, MAT.metal, 0, 0.66, z));
    const equipa = i % 2 ? MAT.azul : MAT.vermelho;
    for (const x of i === 0 || i === 3 ? [0] : [-0.13, 0.13]) g.add(caixa(0.04, 0.09, 0.035, equipa, x, 0.65, z));
    for (const x of [-0.36, 0.36]) g.add(caixa(0.03, 0.03, 0.03, MAT.preto, x, 0.66, z, 0.01));
  }
  g.rotation.y = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------------------
// Funcionários: estilo "cabeçudo", virados para +z
// ---------------------------------------------------------------------------

export const COR_AREA = { programacao: 0x3b82f6, design: 0xec4899, testes: 0x22c55e } as const;
const PELES = [0xf5d0b0, 0xe8b48f, 0xc98e66, 0x9c6644, 0x6e4630, 0xf2c6a5];
const CABELOS = [0x2b1d14, 0x5a3825, 0xd9a441, 0x1a1a1a, 0xa0522d, 0xe5e5e5, 0x7c3aed, 0xb91c1c];
const CALCAS = [0x1e3a5f, 0x374151, 0x111827, 0x78716c, 0x1e40af];

export interface Boneco {
  grupo: THREE.Group;
  corpo: THREE.Group; // sobe e desce ao andar
  pernas: [THREE.Group, THREE.Group];
  bracos: [THREE.Group, THREE.Group];
  indicador: THREE.Mesh;
  anel: THREE.Mesh; // seleção
}

const geoIndicador = new THREE.OctahedronGeometry(0.075, 0).scale(1, 1.6, 1);
const geoAnel = new THREE.RingGeometry(0.26, 0.33, 32).rotateX(-Math.PI / 2);
const matAnel = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 });

function membro(w: number, h: number, d: number, m: THREE.Material, x: number, y: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const o = caixa(w, h, d, m, 0, -h / 2, 0, Math.min(w, d) * 0.4);
  pivot.add(o);
  return pivot;
}

export function criarBoneco(id: number, area: keyof typeof COR_AREA): Boneco {
  const grupo = new THREE.Group();
  const corpo = new THREE.Group();
  grupo.add(corpo);
  const camisola = mat(COR_AREA[area], { roughness: 0.8 });
  const pele = mat(PELES[Math.floor(hash(id + 11) * PELES.length)], { roughness: 0.7 });
  const cabelo = mat(CABELOS[Math.floor(hash(id + 23) * CABELOS.length)], { roughness: 0.9 });
  const calcas = mat(CALCAS[Math.floor(hash(id + 37) * CALCAS.length)], { roughness: 0.85 });

  const pernas: [THREE.Group, THREE.Group] = [membro(0.1, 0.3, 0.11, calcas, -0.065, 0.32), membro(0.1, 0.3, 0.11, calcas, 0.065, 0.32)];
  for (const p of pernas) {
    p.add(caixa(0.11, 0.05, 0.15, MAT.preto, 0, -0.285, 0.025, 0.02)); // sapato
    corpo.add(p);
  }
  corpo.add(caixa(0.28, 0.3, 0.17, camisola, 0, 0.46, 0, 0.06));
  const bracos: [THREE.Group, THREE.Group] = [membro(0.075, 0.26, 0.08, camisola, -0.18, 0.59), membro(0.075, 0.26, 0.08, camisola, 0.18, 0.59)];
  for (const b of bracos) {
    b.add(caixa(0.07, 0.06, 0.07, pele, 0, -0.27, 0, 0.025)); // mão
    corpo.add(b);
  }
  // Cabeça, olhos e cabelo
  const cabeca = new THREE.Group();
  cabeca.position.y = 0.76;
  cabeca.add(caixa(0.26, 0.25, 0.24, pele, 0, 0, 0, 0.07));
  for (const x of [-0.06, 0.06]) cabeca.add(caixa(0.035, 0.05, 0.01, MAT.preto, x, 0.0, 0.121));
  const estilo = Math.floor(hash(id + 5) * 3);
  cabeca.add(caixa(0.28, 0.08, 0.26, cabelo, 0, 0.1, -0.005, 0.04));
  cabeca.add(caixa(0.28, 0.2, 0.07, cabelo, 0, 0.02, -0.1, 0.03));
  if (estilo === 1) for (const x of [-0.13, 0.13]) cabeca.add(caixa(0.04, 0.24, 0.2, cabelo, x, -0.04, -0.03, 0.02)); // cabelo comprido
  if (estilo === 2) cabeca.add(caixa(0.12, 0.08, 0.1, cabelo, 0, 0.16, -0.02, 0.04)); // poupa
  corpo.add(cabeca);

  const indicador = new THREE.Mesh(geoIndicador, mat(0x34d399, { emissive: 0x34d399, emissiveIntensity: 0.8, roughness: 0.3 }));
  indicador.position.y = 1.12;
  grupo.add(indicador);
  const anel = new THREE.Mesh(geoAnel, matAnel);
  anel.position.y = 0.02;
  anel.visible = false;
  grupo.add(anel);
  return { grupo, corpo, pernas, bracos, indicador, anel };
}

/** Pose do boneco: a andar (fase avança com o tempo), sentado a escrever ou parado. */
export function animarBoneco(b: Boneco, pose: 'andar' | 'sentado' | 'parado', t: number): void {
  const [pe, pd] = b.pernas;
  const [be, bd] = b.bracos;
  if (pose === 'andar') {
    const a = Math.sin(t * 11) * 0.6;
    pe.rotation.x = a;
    pd.rotation.x = -a;
    be.rotation.x = -a * 0.8;
    bd.rotation.x = a * 0.8;
    b.corpo.position.y = Math.abs(Math.cos(t * 11)) * 0.03;
  } else if (pose === 'sentado') {
    pe.rotation.x = pd.rotation.x = -Math.PI / 2;
    be.rotation.x = -1.15 + Math.sin(t * 18) * 0.08;
    bd.rotation.x = -1.15 + Math.sin(t * 18 + 2) * 0.08;
    b.corpo.position.y = 0;
  } else {
    pe.rotation.x = pd.rotation.x = be.rotation.x = bd.rotation.x = 0;
    b.corpo.position.y = 0;
  }
}

const COR_FELIZ = new THREE.Color(0x34d399);
const COR_MEIO = new THREE.Color(0xfbbf24);
const COR_TRISTE = new THREE.Color(0xf87171);

/** Cor do indicador de felicidade (0–100), como no ícone por cima da cabeça. */
export function corFelicidade(f: number, alvo = new THREE.Color()): THREE.Color {
  return alvo.copy(f >= 70 ? COR_FELIZ : f >= 40 ? COR_MEIO : COR_TRISTE);
}

// ---------------------------------------------------------------------------
// Confetes (lançamento de produtos, conquistas)
// ---------------------------------------------------------------------------

const CORES_CONFETES = [0xf472b6, 0x22d3ee, 0xfacc15, 0x34d399, 0xa78bfa, 0xfb923c];

export class Confetes {
  private readonly malha: THREE.InstancedMesh;
  private readonly pos: THREE.Vector3[] = [];
  private readonly vel: THREE.Vector3[] = [];
  private readonly rot: THREE.Euler[] = [];
  private readonly giro: THREE.Vector3[] = [];
  private vida = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly um = new THREE.Vector3(1, 1, 1);

  private readonly n: number;

  constructor(cena: THREE.Scene, n = 260) {
    this.n = n;
    this.malha = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.09, 0.05),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      n,
    );
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      this.malha.setColorAt(i, c.setHex(CORES_CONFETES[i % CORES_CONFETES.length]));
      this.pos.push(new THREE.Vector3());
      this.vel.push(new THREE.Vector3());
      this.rot.push(new THREE.Euler());
      this.giro.push(new THREE.Vector3());
    }
    this.malha.visible = false;
    this.malha.frustumCulled = false;
    cena.add(this.malha);
  }

  disparar(centro: THREE.Vector3): void {
    for (let i = 0; i < this.n; i++) {
      this.pos[i].copy(centro).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.5, (Math.random() - 0.5) * 1.5));
      const a = Math.random() * Math.PI * 2;
      const v = 1.5 + Math.random() * 3;
      this.vel[i].set(Math.cos(a) * v, 4 + Math.random() * 4, Math.sin(a) * v);
      this.giro[i].set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    }
    this.vida = 3.5;
    this.malha.visible = true;
  }

  atualizar(dt: number): void {
    if (this.vida <= 0) return;
    this.vida -= dt;
    if (this.vida <= 0) {
      this.malha.visible = false;
      return;
    }
    for (let i = 0; i < this.n; i++) {
      const v = this.vel[i];
      v.y -= 9 * dt;
      v.multiplyScalar(1 - 1.8 * dt); // resistência do ar: cai a flutuar
      this.pos[i].addScaledVector(v, dt);
      if (this.pos[i].y < 0.02) {
        this.pos[i].y = 0.02;
        v.set(0, 0, 0);
      } else {
        const r = this.rot[i];
        r.set(r.x + this.giro[i].x * dt, r.y + this.giro[i].y * dt, r.z + this.giro[i].z * dt);
      }
      const escala = Math.min(1, this.vida / 0.6);
      this.m.compose(this.pos[i], this.q.setFromEuler(this.rot[i]), this.um.setScalar(escala));
      this.malha.setMatrixAt(i, this.m);
    }
    this.malha.instanceMatrix.needsUpdate = true;
  }
}
