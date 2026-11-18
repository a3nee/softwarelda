// Modelos 3D (só Three.js, sem lógica de jogo): mobiliário, decoração e confetes.
// Cada célula da grelha mede 1 × 1 unidade (≈ 1,67 m, ver M em recursos.ts). Os móveis são feitos em
// metros dentro de um grupo à escala M; os modelos reais vêm de recursos.ts. Chão em y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, materialPBR, R } from './recursos.ts';

// ---------------------------------------------------------------------------
// Materiais e geometrias partilhados
// ---------------------------------------------------------------------------

export function mat(cor: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.75, metalness: 0, ...extra });
}

/** Pseudo-aleatório a partir de um número (para variar modelos sem mexer no aleatório do jogo). */
export function hash(n: number): number {
  let t = (n * 0x9e3779b1) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Ecrã desenhado num canvas: editor de código, programa de design ou testes a correr. */
function texturaEcra(tipo: 'codigo' | 'design' | 'testes'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 296;
  const g = c.getContext('2d')!;
  let s = tipo === 'codigo' ? 7 : tipo === 'design' ? 11 : 23;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (tipo === 'design') {
    g.fillStyle = '#e9e9ee';
    g.fillRect(0, 0, 512, 296);
    g.fillStyle = '#2b2d36';
    g.fillRect(0, 0, 512, 22);
    g.fillRect(0, 22, 40, 274);
    g.fillRect(420, 22, 92, 274);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = '#4b4f5c';
      g.fillRect(10, 34 + i * 30, 20, 20);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(70, 44, 320, 220);
    const cores = ['#f472b6', '#22d3ee', '#8b5cf6', '#facc15', '#34d399', '#fb923c'];
    for (let i = 0; i < 9; i++) {
      g.fillStyle = cores[i % cores.length];
      const x = 85 + rnd() * 240, y = 60 + rnd() * 160;
      if (i % 3 === 0) {
        g.beginPath();
        g.arc(x + 20, y + 20, 14 + rnd() * 26, 0, Math.PI * 2);
        g.fill();
      } else g.fillRect(x, y, 30 + rnd() * 70, 14 + rnd() * 40);
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 4 === 0 ? '#8b5cf6' : '#5b6070';
      g.fillRect(430, 36 + i * 18, 30 + rnd() * 45, 7);
    }
  } else {
    g.fillStyle = tipo === 'codigo' ? '#1e1f29' : '#0c0f14';
    g.fillRect(0, 0, 512, 296);
    g.fillStyle = '#2d2f3d';
    g.fillRect(0, 0, 512, 20);
    for (const [i, cor] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
      g.fillStyle = cor;
      g.beginPath();
      g.arc(12 + i * 14, 10, 4, 0, Math.PI * 2);
      g.fill();
    }
    if (tipo === 'codigo') {
      g.fillStyle = '#252734';
      g.fillRect(0, 20, 110, 276);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = i === 3 ? '#8b5cf6' : '#4a4e63';
        g.fillRect(12 + (i % 4 === 0 ? 0 : 10), 32 + i * 17, 40 + rnd() * 45, 6);
      }
    }
    const x0 = tipo === 'codigo' ? 126 : 12;
    const corLinha = tipo === 'codigo' ? ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#d0d4e4'] : ['#4ade80', '#4ade80', '#4ade80', '#f87171', '#94a3b8'];
    let ind = 0;
    for (let i = 0; i < 17; i++) {
      const y = 30 + i * 15.5;
      if (tipo === 'codigo') {
        g.fillStyle = '#4a4e63';
        g.fillRect(x0 - 6, y, 8, 5);
        ind = Math.max(0, Math.min(4, ind + (rnd() < 0.3 ? 1 : rnd() < 0.3 ? -1 : 0)));
      }
      let x = x0 + 14 + ind * 18;
      const pedacos = 1 + Math.floor(rnd() * 4);
      for (let k = 0; k < pedacos && x < 500; k++) {
        const w = 14 + rnd() * 70;
        g.fillStyle = corLinha[Math.floor(rnd() * corLinha.length)];
        g.fillRect(x, y, w, 6);
        x += w + 7;
      }
    }
    if (tipo === 'testes') {
      g.fillStyle = '#1f2937';
      g.fillRect(12, 276, 488, 10);
      g.fillStyle = '#22c55e';
      g.fillRect(12, 276, 330, 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function materialEcra(tipo: 'codigo' | 'design' | 'testes'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0xffffff, emissiveMap: texturaEcra(tipo), emissiveIntensity: 1.05, roughness: 0.22, metalness: 0,
  });
}

let mats: ReturnType<typeof criarMateriais> | null = null;
function criarMateriais() {
  return {
    madeiraClara: materialPBR('ash_veneer', [1.4, 0.72], { roughness: 0.55 }),
    madeiraEscura: materialPBR('ash_veneer', [1.4, 0.72], { color: 0x7a5a42, roughness: 0.5 }),
    tampoBranco: mat(0xf1f0ec, { roughness: 0.32 }),
    aco: mat(0x1b1c1f, { roughness: 0.42, metalness: 0.75 }),
    aluminio: mat(0xbfc3ca, { roughness: 0.3, metalness: 0.95 }),
    cromado: mat(0xe6e8ec, { roughness: 0.12, metalness: 1 }),
    plasticoEscuro: mat(0x26282d, { roughness: 0.5 }),
    plasticoPreto: mat(0x111214, { roughness: 0.38 }),
    borracha: mat(0x0b0b0c, { roughness: 0.85 }),
    ceramica: [0xf4f1ea, 0x1f2a44, 0xc2410c, 0x0f766e, 0xe8c547].map((c) => mat(c, { roughness: 0.28 })),
    papel: mat(0xf7f6f2, { roughness: 0.9 }),
    ecraDesligado: mat(0x050608, { roughness: 0.06, metalness: 0.1 }),
    ecraCodigo: materialEcra('codigo'),
    ecraDesign: materialEcra('design'),
    ecraTestes: materialEcra('testes'),
    tecido: [0x2b2e35, 0x1f2a44, 0x3b3f47, 0x14403d, 0x4a1f2a, 0x2b2e35].map((c) =>
      new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.95, sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color(c).offsetHSL(0, 0, 0.06) })),
    teclas: texturaTeclado(),
    relvaMesa: mat(0x1c7a3a, { roughness: 0.85 }),
    vermelho: mat(0xc81e1e, { roughness: 0.4 }),
    azul: mat(0x1d4ed8, { roughness: 0.4 }),
  };
}
/** Materiais partilhados (criados depois de as texturas estarem carregadas). */
export function materiais() {
  return (mats ??= criarMateriais());
}

/** Compatibilidade com o main.ts: ecrãs e madeira das portas. */
export const MAT = {
  get ecraDesligado() { return materiais().ecraDesligado; },
  get ecraLigado() { return materiais().ecraTestes; },
  get ecraCodigo() { return materiais().ecraCodigo; },
  get ecraDesign() { return materiais().ecraDesign; },
  get madeiraEscura() { return materiais().madeiraEscura; },
};

function texturaTeclado(): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1a1b1e';
  g.fillRect(0, 0, 256, 80);
  g.fillStyle = '#34363c';
  for (let l = 0; l < 5; l++) for (let k = 0; k < 15; k++) g.fillRect(4 + k * 16.6 + (l % 2) * 4, 4 + l * 15, 13.5, 12);
  g.fillRect(60, 4 + 5 * 15 - 2, 130, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.2 });
}

const cacheCaixas = new Map<string, THREE.BufferGeometry>();
/** Caixa (geometria partilhada por tamanho), com arestas arredondadas se `raio` > 0. */
function geoCaixa(w: number, h: number, d: number, raio = 0): THREE.BufferGeometry {
  const k = `${w}|${h}|${d}|${raio}`;
  let g = cacheCaixas.get(k);
  if (!g) {
    g = raio > 0 ? new RoundedBoxGeometry(w, h, d, 3, raio) : new THREE.BoxGeometry(w, h, d);
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
function cilindro(rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, lados = 20): THREE.Mesh {
  const k = `${rt}|${rb}|${h}|${lados}`;
  let g = cacheCilindros.get(k);
  if (!g) cacheCilindros.set(k, (g = new THREE.CylinderGeometry(rt, rb, h, lados)));
  return malha(g, m, x, y, z);
}

/** Grupo exterior (unidades do jogo) com um interior em metros. */
function emMetros(): { g: THREE.Group; m: THREE.Group } {
  const g = new THREE.Group();
  const m = new THREE.Group();
  m.scale.setScalar(M);
  g.add(m);
  return { g, m };
}

/** Cópia de um modelo carregado, ajustada a uma altura (ou largura máxima) em unidades do jogo. */
function copiaModelo(nome: string, altura: number, larguraMax = Infinity): THREE.Object3D {
  const t = R.modelos[nome];
  const tam = t.userData.tamanho as THREE.Vector3;
  const k = Math.min(altura / tam.y, larguraMax / Math.max(tam.x, tam.z));
  const o = t.clone();
  o.scale.setScalar(k);
  return o;
}

// ---------------------------------------------------------------------------
// Secretária (quem trabalha senta-se em +z, virado para −z)
// ---------------------------------------------------------------------------

/** Distância (unidades) do centro da célula a que fica a cadeira, onde a pessoa se senta. */
export const CADEIRA_Z = 0.34;
const CADEIRA_ZM = CADEIRA_Z / M;

export interface ModeloSecretaria {
  grupo: THREE.Group;
  ecra: THREE.Mesh;
}

function criarCadeira(id: number): THREE.Group {
  const k = materiais();
  const tecido = k.tecido[Math.floor(hash(id) * k.tecido.length)];
  const c = new THREE.Group();
  // Base em estrela com rodízios
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const braco = caixa(0.3, 0.035, 0.05, k.plasticoPreto, Math.cos(a) * 0.15, 0.085, Math.sin(a) * 0.15, 0.012);
    braco.rotation.y = -a;
    c.add(braco);
    c.add(cilindro(0.026, 0.026, 0.04, k.borracha, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, 12));
  }
  c.add(cilindro(0.05, 0.06, 0.06, k.plasticoPreto, 0, 0.09, 0));
  c.add(cilindro(0.024, 0.024, 0.32, k.cromado, 0, 0.26, 0));
  c.add(caixa(0.2, 0.04, 0.2, k.plasticoPreto, 0, 0.405, 0.02, 0.01));
  // Assento, costas e braços
  c.add(caixa(0.5, 0.075, 0.48, tecido, 0, 0.445, 0.02, 0.035));
  const costas = caixa(0.46, 0.56, 0.06, tecido, 0, 0.86, 0.27, 0.03);
  costas.rotation.x = 0.13;
  c.add(costas);
  const espinha = caixa(0.07, 0.36, 0.03, k.plasticoPreto, 0, 0.6, 0.27, 0.012);
  espinha.rotation.x = 0.1;
  c.add(espinha);
  for (const x of [-0.27, 0.27]) {
    c.add(caixa(0.035, 0.2, 0.04, k.plasticoPreto, x, 0.56, 0.07, 0.01));
    c.add(caixa(0.065, 0.028, 0.26, k.plasticoEscuro, x, 0.67, 0.03, 0.012));
  }
  c.rotation.y = (hash(id + 5) - 0.5) * 0.5;
  return c;
}

export function criarSecretaria(id: number): ModeloSecretaria {
  const k = materiais();
  const { g, m } = emMetros();
  const v = hash(id + 17);
  const tampo = v < 0.45 ? k.madeiraClara : v < 0.8 ? k.tampoBranco : k.madeiraEscura;
  const ZM = -0.22; // centro do tampo
  m.add(caixa(1.4, 0.026, 0.72, tampo, 0, 0.727, ZM, 0.006));
  // Pernas em T de aço preto, com barra de ligação atrás
  for (const x of [-0.64, 0.64]) {
    m.add(caixa(0.06, 0.7, 0.06, k.aco, x, 0.36, ZM, 0.008));
    m.add(caixa(0.07, 0.03, 0.66, k.aco, x, 0.015, ZM, 0.008));
    m.add(caixa(0.05, 0.03, 0.62, k.aco, x, 0.7, ZM, 0.006));
  }
  m.add(caixa(1.24, 0.05, 0.025, k.aco, 0, 0.66, ZM - 0.3, 0.006));
  // Monitor
  const zMon = -0.42;
  m.add(caixa(0.25, 0.012, 0.18, k.aluminio, 0, 0.746, zMon, 0.005));
  m.add(caixa(0.05, 0.3, 0.022, k.aluminio, 0, 0.9, zMon - 0.03, 0.006));
  m.add(caixa(0.63, 0.375, 0.03, k.plasticoEscuro, 0, 1.06, zMon, 0.008));
  const ecra = malha(new THREE.PlaneGeometry(0.606, 0.35), k.ecraDesligado, 0, 1.063, zMon + 0.0155);
  ecra.castShadow = false;
  m.add(ecra);
  // Teclado, rato, caneca e (às vezes) papéis e uma planta
  m.add(caixa(0.44, 0.016, 0.135, k.plasticoPreto, -0.02, 0.748, -0.04, 0.004));
  const teclas = malha(new THREE.PlaneGeometry(0.42, 0.12).rotateX(-Math.PI / 2), k.teclas, -0.02, 0.7566, -0.04);
  teclas.castShadow = false;
  m.add(teclas);
  m.add(caixa(0.06, 0.03, 0.1, k.plasticoPreto, 0.3, 0.755, -0.03, 0.014));
  m.add(cilindro(0.04, 0.036, 0.095, k.ceramica[Math.floor(hash(id + 3) * k.ceramica.length)], -0.5, 0.788, -0.2));
  if (hash(id + 8) < 0.5) {
    const p = caixa(0.21, 0.006, 0.297, k.papel, -0.38, 0.744, -0.3);
    p.rotation.y = hash(id + 9) - 0.5;
    m.add(p);
  }
  if (hash(id + 21) < 0.45) {
    const pl = copiaModelo('plantaPequena', 0.2 * M);
    pl.position.set(0.54 * M, 0.74 * M, -0.44 * M);
    pl.rotation.y = hash(id) * 6;
    g.add(pl);
  }
  const cadeira = criarCadeira(id);
  cadeira.position.z = CADEIRA_ZM;
  m.add(cadeira);
  return { grupo: g, ecra };
}

// ---------------------------------------------------------------------------
// Decoração (modelos reais do Poly Haven e da Khronos, matraquilhos feitos aqui)
// ---------------------------------------------------------------------------

export function criarPlanta(id: number): THREE.Group {
  const g = new THREE.Group();
  const p = copiaModelo('planta', (0.95 + hash(id) * 0.2) * M, 0.85);
  p.rotation.y = hash(id + 1) * Math.PI * 2;
  g.add(p);
  return g;
}

export function criarSofa(id: number): THREE.Group {
  const g = new THREE.Group();
  const s = copiaModelo('sofa', 0.85 * M, 0.98);
  s.rotation.y = hash(id) < 0.5 ? 0 : Math.PI;
  g.add(s);
  return g;
}

export function criarCafe(): THREE.Group {
  const g = new THREE.Group();
  const c = copiaModelo('cafe', 1.72 * M, 0.92);
  g.add(c);
  return g;
}

export function criarMatraquilhos(): THREE.Group {
  const k = materiais();
  const { g, m } = emMetros();
  const madeira = k.madeiraEscura;
  // Caixa da mesa (comprida em x), pernas e campo
  m.add(caixa(1.18, 0.22, 0.74, madeira, 0, 0.8, 0, 0.015));
  for (const [x, z] of [[-0.52, -0.3], [0.52, -0.3], [-0.52, 0.3], [0.52, 0.3]]) m.add(caixa(0.08, 0.7, 0.08, madeira, x, 0.35, z, 0.01));
  m.add(caixa(1.1, 0.012, 0.66, k.relvaMesa, 0, 0.83, 0));
  for (const x of [-0.25, 0, 0.25]) m.add(caixa(0.006, 0.013, 0.66, k.papel, x * 2 === 0 ? 0 : x * 2, 0.837, 0));
  m.add(caixa(0.012, 0.013, 0.2, k.papel, 0, 0.837, 0));
  // Varas: 1-2-5-3 de cada equipa, alternadas
  const geoVara = new THREE.CylinderGeometry(0.008, 0.008, 1.06, 10).rotateX(Math.PI / 2);
  const jogadores = [1, 2, 3, 5, 5, 3, 2, 1];
  jogadores.forEach((n, i) => {
    const x = -0.49 + i * 0.14;
    m.add(malha(geoVara, k.cromado, x, 0.93, 0));
    const eq = i === 0 || i === 1 || i === 3 || i === 5 ? k.vermelho : k.azul;
    for (let j = 0; j < n; j++) {
      const z = n === 1 ? 0 : -0.25 + (j * 0.5) / (n - 1);
      m.add(caixa(0.025, 0.085, 0.035, eq, x, 0.9, z, 0.008));
      m.add(malha(new THREE.SphereGeometry(0.017, 12, 8), eq, x, 0.955, z));
    }
    m.add(cilindro(0.016, 0.016, 0.09, k.plasticoPreto, x, 0.93, i % 2 ? 0.58 : -0.58).rotateX(Math.PI / 2));
  });
  g.rotation.y = Math.PI / 2;
  return g;
}

// ---------------------------------------------------------------------------
// Felicidade e confetes
// ---------------------------------------------------------------------------

export const COR_AREA = { programacao: 0x3b82f6, design: 0xec4899, testes: 0x22c55e } as const;

const COR_FELIZ = new THREE.Color(0x34d399);
const COR_MEIO = new THREE.Color(0xfbbf24);
const COR_TRISTE = new THREE.Color(0xf87171);

/** Cor do indicador de felicidade (0–100), como no ícone por cima da cabeça. */
export function corFelicidade(f: number, alvo = new THREE.Color()): THREE.Color {
  return alvo.copy(f >= 70 ? COR_FELIZ : f >= 40 ? COR_MEIO : COR_TRISTE);
}

const CORES_CONFETES = [0xf472b6, 0x22d3ee, 0xfacc15, 0x34d399, 0xa78bfa, 0xfb923c];

export class Confetes {
  readonly malha: THREE.InstancedMesh;
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
      new THREE.PlaneGeometry(0.06, 0.035),
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
