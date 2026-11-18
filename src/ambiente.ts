// Ambiente à volta do escritório: céu com ciclo dia/noite, sol com sombras, relva, estrada com carros,
// árvores, candeeiros, prédios ao fundo e nuvens. Só Three.js; a hora vem do jogo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hash, mat } from './modelos.ts';

/** Momentos do dia (hora → cores e intensidades); entre dois momentos interpola-se. */
const MOMENTOS: { h: number; ceu: number; sol: number; corSol: number; hemi: number; interior: number; luzes: number }[] = [
  { h: 0, ceu: 0x0b1430, sol: 0.3, corSol: 0x8fa6ff, hemi: 0.42, interior: 0.55, luzes: 1 },
  { h: 5, ceu: 0x1c2452, sol: 0.3, corSol: 0x8fa6ff, hemi: 0.45, interior: 0.55, luzes: 1 },
  { h: 6.5, ceu: 0xf5a37a, sol: 1.0, corSol: 0xffb27a, hemi: 0.85, interior: 0.5, luzes: 0.4 },
  { h: 8, ceu: 0x8fd0ff, sol: 2.6, corSol: 0xfff2dc, hemi: 1.15, interior: 0, luzes: 0 },
  { h: 17, ceu: 0x8fd0ff, sol: 2.6, corSol: 0xfff2dc, hemi: 1.15, interior: 0, luzes: 0 },
  { h: 18.7, ceu: 0xff8f6b, sol: 1.1, corSol: 0xff9d5c, hemi: 0.85, interior: 0.5, luzes: 0.6 },
  { h: 20, ceu: 0x2e2a66, sol: 0.35, corSol: 0xa5b4fc, hemi: 0.5, interior: 0.55, luzes: 1 },
  { h: 24, ceu: 0x0b1430, sol: 0.3, corSol: 0x8fa6ff, hemi: 0.42, interior: 0.55, luzes: 1 },
];

const HORA_FIXA = 13; // sem ciclo dia/noite
const COR_HEMI_DIA = new THREE.Color(0xdfeaff);
const COR_HEMI_NOITE = new THREE.Color(0x5566bb);

export class Ambiente {
  readonly sol: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly interior: THREE.DirectionalLight;
  private readonly ceu = new THREE.Color();
  private readonly fundo = new THREE.Color(0x8fd0ff);
  private readonly matLuz = mat(0x333333, { emissive: 0xffd58a, emissiveIntensity: 0 });
  private readonly matJanela = mat(0x37415a, { emissive: 0xffd27a, emissiveIntensity: 0, roughness: 0.3 });
  private readonly carros: { o: THREE.Group; v: number }[] = [];
  private readonly nuvens: THREE.Group[] = [];
  private readonly centro: THREE.Vector3;
  /** Quanto de noite está (0 de dia, 1 de noite), para a interface. */
  noite = 0;

  private readonly cena: THREE.Scene;

  constructor(cena: THREE.Scene, largura: number, altura: number, entrada: { x: number; z: number }) {
    this.cena = cena;
    this.centro = new THREE.Vector3((largura - 1) / 2, 0, (altura - 1) / 2);
    cena.background = this.fundo;
    cena.fog = new THREE.Fog(0x8fd0ff, 70, 170);

    this.hemi = new THREE.HemisphereLight(0xdfeaff, 0x5c7a3a, 1.1);
    cena.add(this.hemi);
    this.sol = new THREE.DirectionalLight(0xfff2dc, 2.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const c = this.sol.shadow.camera;
    c.left = c.bottom = -24;
    c.right = c.top = 24;
    c.near = 1;
    c.far = 140;
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.03;
    this.sol.shadow.radius = 3;
    this.sol.target.position.copy(this.centro);
    cena.add(this.sol, this.sol.target);
    // Luz do escritório à noite (de cima, sem sombras)
    this.interior = new THREE.DirectionalLight(0xffe2b8, 0);
    this.interior.position.set(this.centro.x, 30, this.centro.z + 4);
    this.interior.target.position.copy(this.centro);
    cena.add(this.interior, this.interior.target);

    this.criarTerreno(largura, altura, entrada);
    this.criarEstrada(altura, entrada);
    this.criarArvores(largura, altura);
    this.criarCidade();
    this.criarNuvens();
  }

  set sombras(v: boolean) {
    this.sol.castShadow = v;
  }

  // -------------------------------------------------------------------------

  private criarTerreno(largura: number, altura: number, entrada: { x: number; z: number }): void {
    // Relva com variação de cor por vértice
    const geo = new THREE.PlaneGeometry(260, 260, 60, 60).rotateX(-Math.PI / 2);
    const cores: number[] = [];
    const cor = new THREE.Color();
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = hash(i * 13 + 7);
      cor.setHSL(0.27 + v * 0.05, 0.5, 0.42 + v * 0.08);
      cores.push(cor.r, cor.g, cor.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    const relva = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    relva.position.set(this.centro.x, -0.12, this.centro.z);
    relva.receiveShadow = true;
    this.cena.add(relva);

    // Laje do edifício (vê-se entre as células do chão, como juntas)
    const laje = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.5, 0.12, altura + 0.5), mat(0xa3a8b8, { roughness: 0.9 }));
    laje.position.set(this.centro.x, -0.065, this.centro.z);
    laje.receiveShadow = true;
    this.cena.add(laje);
    // Rodapé exterior escuro
    const rodape = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.7, 0.06, altura + 0.7), mat(0x4b5163));
    rodape.position.set(this.centro.x, -0.1, this.centro.z);
    this.cena.add(rodape);

    // Caminho de entrada até ao passeio, com tapete e dois arbustos
    const caminho = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 1.1), mat(0xe7dcc8, { roughness: 0.9 }));
    caminho.position.set(entrada.x - 2.2, -0.09, entrada.z);
    caminho.receiveShadow = true;
    this.cena.add(caminho);
    const tapete = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.02, 0.8, 2, 0.01), mat(0xb91c1c, { roughness: 1 }));
    tapete.position.set(entrada.x - 0.85, -0.055, entrada.z);
    this.cena.add(tapete);
    for (const dz of [-0.85, 0.85]) {
      const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 12), mat(0x334155));
      vaso.position.set(entrada.x - 1.1, 0.06, entrada.z + dz);
      vaso.castShadow = true;
      const arbusto = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), mat(0x22a35a, { flatShading: true }));
      arbusto.position.set(entrada.x - 1.1, 0.42, entrada.z + dz);
      arbusto.castShadow = true;
      this.cena.add(vaso, arbusto);
    }
  }

  private criarEstrada(altura: number, entrada: { x: number; z: number }): void {
    const x = -6.5;
    const estrada = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.02, 260), mat(0x3a3f4b, { roughness: 0.95 }));
    estrada.position.set(x, -0.115, this.centro.z);
    estrada.receiveShadow = true;
    this.cena.add(estrada);
    // Riscos ao centro
    const geoRisco = new THREE.BoxGeometry(0.12, 0.005, 1.2);
    const matRisco = mat(0xf8fafc, { roughness: 0.6 });
    for (let z = -110; z < 130; z += 3) {
      const r = new THREE.Mesh(geoRisco, matRisco);
      r.position.set(x, -0.1, z);
      this.cena.add(r);
    }
    // Passeios
    for (const px of [x + 2.75, x - 2.75]) {
      const passeio = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 260), mat(0xcfd4dc, { roughness: 0.9 }));
      passeio.position.set(px, -0.07, this.centro.z);
      passeio.receiveShadow = true;
      this.cena.add(passeio);
    }
    // Candeeiros
    const geoPoste = new THREE.CylinderGeometry(0.05, 0.07, 3, 8);
    const matPoste = mat(0x374151, { metalness: 0.5, roughness: 0.4 });
    for (let z = -14; z <= altura + 14; z += 7) {
      if (Math.abs(z - entrada.z) < 1.5) continue;
      const g = new THREE.Group();
      const poste = new THREE.Mesh(geoPoste, matPoste);
      poste.position.y = 1.5;
      poste.castShadow = true;
      const braco = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), matPoste);
      braco.position.set(-0.32, 3, 0);
      const lampada = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.2), this.matLuz);
      lampada.position.set(-0.6, 2.95, 0);
      g.add(poste, braco, lampada);
      g.position.set(x + 2.6, -0.02, z);
      this.cena.add(g);
    }
    // Carros
    const CORES = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xf97316, 0xe5e7eb];
    for (let i = 0; i < 5; i++) {
      const g = this.criarCarro(CORES[i % CORES.length]);
      const sentido = i % 2 ? 1 : -1;
      g.position.set(x + sentido * 1.0, -0.1, -100 + hash(i + 40) * 220);
      g.rotation.y = sentido > 0 ? 0 : Math.PI;
      this.cena.add(g);
      this.carros.push({ o: g, v: sentido * (5 + hash(i) * 4) });
    }
  }

  private criarCarro(cor: number): THREE.Group {
    const g = new THREE.Group();
    const m = mat(cor, { roughness: 0.35, metalness: 0.3 });
    const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.38, 2.0, 2, 0.12), m);
    corpo.position.y = 0.38;
    const cabine = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.34, 1.05, 2, 0.12), mat(0x1e293b, { roughness: 0.15, metalness: 0.5 }));
    cabine.position.set(0, 0.7, -0.1);
    corpo.castShadow = cabine.castShadow = true;
    g.add(corpo, cabine);
    const geoRoda = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 12).rotateZ(Math.PI / 2);
    for (const [rx, rz] of [[-0.45, 0.6], [0.45, 0.6], [-0.45, -0.6], [0.45, -0.6]]) {
      const r = new THREE.Mesh(geoRoda, mat(0x111111));
      r.position.set(rx, 0.17, rz);
      g.add(r);
    }
    for (const fx of [-0.3, 0.3]) {
      const farol = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), this.matLuz);
      farol.position.set(fx, 0.42, 1.0);
      g.add(farol);
    }
    return g;
  }

  private criarArvores(largura: number, altura: number): void {
    const tronco = mat(0x7c4a2a, { roughness: 0.9 });
    const copas = [0x2fb35d, 0x4cc76f, 0x1f9a55, 0x86d65a].map((c) => mat(c, { flatShading: true, roughness: 0.8 }));
    const geoCopa = new THREE.IcosahedronGeometry(1, 0);
    const geoPinheiro = new THREE.ConeGeometry(1, 1.6, 7);
    const geoTronco = new THREE.CylinderGeometry(0.12, 0.17, 1, 7);
    let n = 0;
    for (let i = 0; i < 400 && n < 46; i++) {
      const x = -30 + hash(i * 3 + 1) * (largura + 60);
      const z = -26 + hash(i * 3 + 2) * (altura + 52);
      const dentro = x > -2.5 && x < largura + 1.5 && z > -2.5 && z < altura + 1.5;
      const naEstrada = x > -10.5 && x < -2.2;
      const naCidade = x < -11;
      if (dentro || naEstrada || naCidade) continue;
      n++;
      const t = 0.8 + hash(i * 3 + 3) * 0.7;
      const g = new THREE.Group();
      const tr = new THREE.Mesh(geoTronco, tronco);
      tr.position.y = 0.5 * t;
      tr.scale.setScalar(t);
      tr.castShadow = true;
      g.add(tr);
      const copa = copas[i % copas.length];
      if (hash(i + 77) < 0.35) {
        for (let k = 0; k < 3; k++) {
          const c = new THREE.Mesh(geoPinheiro, copa);
          c.position.y = (1.2 + k * 0.7) * t;
          c.scale.setScalar((1.1 - k * 0.25) * t);
          c.castShadow = true;
          g.add(c);
        }
      } else {
        for (let k = 0; k < 3; k++) {
          const c = new THREE.Mesh(geoCopa, copa);
          c.position.set((hash(i + k) - 0.5) * 0.7 * t, (1.5 + hash(i * 5 + k) * 0.6) * t, (hash(i + k + 9) - 0.5) * 0.7 * t);
          c.scale.setScalar((0.6 + hash(i * 7 + k) * 0.35) * t);
          c.rotation.set(hash(k) * 3, hash(k + i) * 3, 0);
          c.castShadow = true;
          g.add(c);
        }
      }
      g.position.set(x, -0.12, z);
      this.cena.add(g);
    }
  }

  private criarCidade(): void {
    const CORES = [0xfca5a5, 0x93c5fd, 0xfde68a, 0xc4b5fd, 0x99f6e4, 0xfdba74, 0xe2e8f0];
    for (let i = 0; i < 18; i++) {
      const w = 3 + hash(i + 200) * 3;
      const d = 4 + hash(i + 300) * 4;
      const h = 3 + hash(i + 400) * 9;
      const x = -14 - w / 2 - hash(i + 500) * 8;
      const z = -40 + i * 7 + hash(i + 600) * 2;
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(CORES[i % CORES.length], { roughness: 0.85 }));
      corpo.position.y = h / 2;
      corpo.castShadow = corpo.receiveShadow = true;
      g.add(corpo);
      // Janelas na fachada virada para a estrada
      for (let y = 1.2; y < h - 0.5; y += 1.4)
        for (let k = -d / 2 + 0.8; k < d / 2 - 0.4; k += 1.2) {
          const j = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.6), this.matJanela);
          j.position.set(w / 2 + 0.02, y, k);
          g.add(j);
        }
      g.position.set(x, -0.12, z);
      this.cena.add(g);
    }
  }

  private criarNuvens(): void {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
    const geo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(hash(i + 800) * 3);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(geo, m);
        b.position.set(k * 1.5 - n * 0.7, hash(i * 9 + k) * 0.6, (hash(i * 4 + k) - 0.5) * 1.2);
        b.scale.set(1.6 + hash(k + i) * 0.8, 0.9 + hash(k * 2 + i) * 0.4, 1.3);
        g.add(b);
      }
      g.position.set(-60 + hash(i + 900) * 140, 20 + hash(i + 950) * 8, -50 + hash(i + 990) * 120);
      this.cena.add(g);
      this.nuvens.push(g);
    }
  }

  // -------------------------------------------------------------------------

  /** Atualiza céu, luzes e coisas que mexem. `minutoDoDia` vem do jogo. */
  atualizar(dt: number, minutoDoDia: number, ciclo: boolean): void {
    const h = ciclo ? minutoDoDia / 60 : HORA_FIXA;
    let i = 0;
    while (i < MOMENTOS.length - 2 && MOMENTOS[i + 1].h <= h) i++;
    const a = MOMENTOS[i];
    const b = MOMENTOS[i + 1];
    const t = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h)));
    const mistura = (x: number, y: number) => x + (y - x) * t;

    this.ceu.setHex(a.ceu).lerp(new THREE.Color(b.ceu), t);
    this.fundo.copy(this.ceu);
    this.cena.fog!.color.copy(this.ceu);
    this.sol.intensity = mistura(a.sol, b.sol);
    this.sol.color.setHex(a.corSol).lerp(new THREE.Color(b.corSol), t);
    this.hemi.intensity = mistura(a.hemi, b.hemi);
    this.hemi.color.copy(COR_HEMI_DIA).lerp(COR_HEMI_NOITE, mistura(a.luzes, b.luzes));
    this.interior.intensity = mistura(a.interior, b.interior) * 1.1;
    const luzes = mistura(a.luzes, b.luzes);
    this.matLuz.emissiveIntensity = luzes * 2.2;
    this.matJanela.emissiveIntensity = luzes * 1.3;
    this.noite = luzes;

    // Sol de este (manhã) para oeste (tarde); de noite, a lua fica alta e fixa.
    const dia = h >= 6 && h <= 19.5;
    const ang = dia ? ((h - 6) / 13.5) * Math.PI : Math.PI * 0.35;
    this.sol.position.set(
      this.centro.x + Math.cos(ang) * 32,
      Math.max(8, Math.sin(ang) * 34),
      this.centro.z + 16,
    );

    for (const c of this.carros) {
      c.o.position.z += c.v * dt;
      if (c.o.position.z > 130) c.o.position.z = -110;
      if (c.o.position.z < -110) c.o.position.z = 130;
    }
    for (const n of this.nuvens) {
      n.position.x += dt * 0.6;
      if (n.position.x > 90) n.position.x = -70;
    }
  }
}
