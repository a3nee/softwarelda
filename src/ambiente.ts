// Ambiente à volta do escritório: céu físico (com nuvens) que ilumina a cena, sol com sombras e ciclo
// dia/noite, relva, estrada com carros, candeeiros, árvores e prédios. Só Three.js; a hora vem do jogo.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Tree } from '@dgreenheck/ez-tree';
import { hash, mat } from './modelos.ts';
import { M, materialPBR, R, texturaNoMundo } from './recursos.ts';
import type { Qualidade } from './definicoes.ts';

const HORA_FIXA = 13; // sem ciclo dia/noite
const COR_SOL_ALTO = new THREE.Color(0xfff4e6);
const COR_SOL_BAIXO = new THREE.Color(0xff9a52);
const COR_LUA = new THREE.Color(0x9fb4ff);
const NEVOA_DIA = new THREE.Color(0xc4d6ea);
const NEVOA_POR = new THREE.Color(0xe7b48e);
const NEVOA_NOITE = new THREE.Color(0x0c1324);

// Traçado das ruas (em unidades do mundo)
const RUA_X = -6.5; // estrada principal, em frente ao escritório (ao longo de z)
const RUA_T_Z = -22; // rua transversal (ao longo de x)
const MEIA_RUA = 2.1; // meia largura do asfalto
const MEIA_RUA_PASSEIO = 3.4; // meia largura do asfalto + passeio

export type EstadoCasa = 'tua' | 'arrendada' | 'morada';

/** Material de placa com texto branco sobre a cor dada (dos dois lados). */
function placaMaterial(texto: string, cor: string): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 144);
  g.fillStyle = cor;
  g.fillRect(8, 8, 240, 128);
  g.fillStyle = '#ffffff';
  g.font = 'bold 40px Inter, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, 128, 74);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide });
}

interface Retangulo {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Se a relva (tufos e flores) pode lá crescer. */
  relva: boolean;
}

/** Muda as UV de uma caixa (medidas em unidades) para a textura ter `ladoTextura` metros, sem esticar. */
function uvEmMetros(geo: THREE.BoxGeometry, w: number, h: number, d: number, ladoTextura: number): THREE.BoxGeometry {
  const uv = geo.attributes.uv;
  // Ordem das faces da BoxGeometry: +x, −x, +y, −y, +z, −z (4 vértices cada)
  const tam = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * tam[f][0]) / (ladoTextura * M), (uv.getY(i) * tam[f][1]) / (ladoTextura * M));
    }
  return geo;
}

/** Troca os materiais Phong da árvore por PBR (para a luz do céu os iluminar como ao resto). */
function arvorePBR(t: Tree): void {
  const ramos = t.branchesMesh.material as THREE.MeshPhongMaterial;
  t.branchesMesh.material = new THREE.MeshStandardMaterial({
    color: ramos.color, map: ramos.map, normalMap: ramos.normalMap, aoMap: ramos.aoMap,
    roughnessMap: (ramos as unknown as { roughnessMap: THREE.Texture | null }).roughnessMap, roughness: 1,
  });
  const folhas = t.leavesMesh.material as THREE.MeshPhongMaterial;
  const nova = new THREE.MeshStandardMaterial({
    color: folhas.color, map: folhas.map, side: THREE.DoubleSide, alphaTest: folhas.alphaTest, roughness: 0.8,
  });
  const original = folhas.onBeforeCompile.bind(folhas);
  nova.onBeforeCompile = (sh, r) => {
    original(sh, r);
    nova.userData.shader = sh;
  };
  t.leavesMesh.material = nova;
}

export class Ambiente {
  readonly sol: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly interior: THREE.DirectionalLight;
  /** Luz difusa quente das salas à noite (ilumina também as paredes de lado). */
  private readonly interiorDifusa = new THREE.HemisphereLight(0xffe6c4, 0x7a5a3c, 0);
  private readonly ceu: Sky;
  private readonly cenaCeu = new THREE.Scene();
  private readonly pmrem: THREE.PMREMGenerator;
  private alvoAmbiente: THREE.WebGLRenderTarget | null = null;
  private readonly ultimoSol = new THREE.Vector3(0, -1, 0);
  private tempoAmbiente = 0;
  private readonly matLuz = mat(0x222222, { emissive: 0xffd9a0, emissiveIntensity: 0 });
  private readonly matJanelaAcesa = mat(0x222222, { emissive: 0xffd8a0, emissiveIntensity: 0, roughness: 0.4 });
  private readonly matPoca: THREE.MeshBasicMaterial;
  private readonly carros: { o: THREE.Object3D; v: number; eixo: 'x' | 'z'; min: number; max: number }[] = [];
  private readonly arvores: THREE.Object3D[] = [];
  /** Zonas onde não se planta nada (escritório, ruas, casas, cidade). */
  private readonly ocupado: Retangulo[] = [];
  private variantes: { t: Tree; alturaModelo: number }[] = [];
  private arbusto!: { t: Tree; alturaModelo: number };
  private readonly relvas: THREE.InstancedMesh[] = [];
  private readonly uTempoRelva = { value: 0 };
  /** Rua do bairro de casas (ao longo de z), do outro lado do escritório. */
  private readonly ruaBairro: number;
  /** Árvores geradas (fora da cena): animam o vento das folhas, que todas as cópias partilham. */
  private readonly especies: Tree[] = [];
  private readonly dirSol = new THREE.Vector3();
  private readonly centro: THREE.Vector3;
  private tempo = 0;
  /** Quanto de noite está (0 de dia, 1 de noite), para a interface. */
  noite = 0;

  private readonly cena: THREE.Scene;

  constructor(cena: THREE.Scene, renderer: THREE.WebGLRenderer, largura: number, altura: number, entrada: { x: number; z: number }) {
    this.cena = cena;
    this.centro = new THREE.Vector3((largura - 1) / 2, 0, (altura - 1) / 2);
    this.pmrem = new THREE.PMREMGenerator(renderer);

    this.ceu = new Sky();
    this.ceu.scale.setScalar(900);
    const u = this.ceu.material.uniforms;
    u.turbidity.value = 4;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    u.cloudCoverage.value = 0.35;
    u.cloudDensity.value = 0.45;
    cena.add(this.ceu);
    this.cenaCeu.add(new Sky()); // cópia só para gerar a luz do ambiente
    cena.fog = new THREE.FogExp2(NEVOA_DIA.getHex(), 0.0065);

    // Céu azulado por cima: as sombras ficam claras e frias em vez de cinzentas
    this.hemi = new THREE.HemisphereLight(0xc8dcff, 0x6a7a3c, 0.25);
    cena.add(this.hemi);
    this.sol = new THREE.DirectionalLight(0xfff2dc, 3);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const c = this.sol.shadow.camera;
    c.left = c.bottom = -21;
    c.right = c.top = 21;
    c.near = 1;
    c.far = 160;
    this.sol.shadow.bias = -0.00025;
    this.sol.shadow.normalBias = 0.02;
    this.sol.shadow.radius = 4; // contornos macios, de desenho animado
    this.sol.target.position.copy(this.centro);
    cena.add(this.sol, this.sol.target);
    // Luz do escritório à noite (de cima, sem sombras)
    this.interior = new THREE.DirectionalLight(0xffe2b8, 0);
    this.interior.position.set(this.centro.x, 30, this.centro.z + 4);
    this.interior.target.position.copy(this.centro);
    cena.add(this.interior, this.interior.target, this.interiorDifusa);

    const poca = document.createElement('canvas');
    poca.width = poca.height = 128;
    const g = poca.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,214,150,0.85)');
    grad.addColorStop(0.5, 'rgba(255,190,120,0.25)');
    grad.addColorStop(1, 'rgba(255,180,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.matPoca = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(poca), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.ruaBairro = largura + 22;
    const grande = 1e4;
    this.ocupado.push(
      { x0: -2.8, x1: largura + 2, z0: -2.8, z1: altura + 2, relva: true }, // jardim do escritório (sem árvores)
      { // laje do escritório
        x0: this.centro.x - (largura + 0.5) / 2, x1: this.centro.x + (largura + 0.5) / 2,
        z0: this.centro.z - (altura + 0.5) / 2, z1: this.centro.z + (altura + 0.5) / 2, relva: false,
      },
      { x0: -2.8, x1: this.centro.x - (largura + 0.5) / 2, z0: entrada.z - 0.6, z1: entrada.z + 0.6, relva: false }, // caminho da entrada
      { x0: -2.8, x1: -2.2, z0: -grande, z1: grande, relva: true }, // sebe
      { x0: -grande, x1: -11.5, z0: -grande, z1: grande, relva: false }, // cidade
    );
    for (const x of [RUA_X, this.ruaBairro])
      this.ocupado.push({ x0: x - MEIA_RUA_PASSEIO - 0.4, x1: x + MEIA_RUA_PASSEIO + 0.4, z0: -grande, z1: grande, relva: false });
    this.ocupado.push({ x0: -grande, x1: grande, z0: RUA_T_Z - MEIA_RUA_PASSEIO - 0.4, z1: RUA_T_Z + MEIA_RUA_PASSEIO + 0.4, relva: false });

    // Estacionamento entre o escritório e a rua do bairro
    this.lote = { x0: largura + 3.5, x1: this.ruaBairro - MEIA_RUA_PASSEIO, z0: this.centro.z - 13.2, z1: this.centro.z + 5.8 };
    this.ocupado.push({ ...this.lote, x0: this.lote.x0 - 0.5, z0: this.lote.z0 - 0.5, z1: this.lote.z1 + 0.5, relva: false });
    this.criarTerreno(largura, altura, entrada);
    this.criarEstrada(altura, entrada);
    this.criarArvores(altura);
    this.criarBairro();
    this.plantarArvoresSoltas(largura, altura);
    this.criarCidade();
    this.criarEstacionamento();
    this.criarRelva();
  }

  /** Árvores espalhadas pelos relvados à volta, longe das ruas e das casas. */
  private plantarArvoresSoltas(largura: number, altura: number): void {
    let n = 0;
    for (let i = 0; i < 3000 && n < 80; i++) {
      const x = -11 + hash(i * 3 + 1) * (this.ruaBairro + 40);
      const z = -45 + hash(i * 3 + 2) * (altura + 90);
      if (!this.livre(x, z, 1.2)) continue;
      n++;
      this.plantarArvore(i, x, z, (7 + hash(i * 3 + 3) * 6) * M);
    }
    void largura;
  }

  /** Se (x, z) está longe (pelo menos `margem`) de tudo o que está construído. */
  private livre(x: number, z: number, margem: number, paraRelva = false): boolean {
    for (const r of this.ocupado) {
      if (paraRelva && r.relva) continue;
      if (x > r.x0 - margem && x < r.x1 + margem && z > r.z0 - margem && z < r.z1 + margem) return false;
    }
    return true;
  }

  private plantarArvore(i: number, x: number, z: number, alvo: number): void {
    const v = this.variantes[i % this.variantes.length];
    const a = new THREE.Group();
    a.add(v.t.branchesMesh.clone(), v.t.leavesMesh.clone());
    a.scale.setScalar(alvo / v.alturaModelo);
    a.rotation.y = hash(i + 5) * Math.PI * 2;
    a.position.set(x, -0.12, z);
    this.cena.add(a);
    this.arvores.push(a);
  }

  private plantarArbusto(x: number, z: number, alvo: number): void {
    const b = new THREE.Group();
    b.add(this.arbusto.t.branchesMesh.clone(), this.arbusto.t.leavesMesh.clone());
    b.scale.setScalar(alvo / this.arbusto.alturaModelo);
    b.rotation.y = hash(x * 13 + z * 7) * 6;
    b.position.set(x, -0.12, z);
    this.cena.add(b);
  }

  set sombras(v: boolean) {
    this.sol.castShadow = v;
  }

  /** Resolução das sombras e número de árvores visíveis conforme a qualidade. */
  qualidade(q: Qualidade): void {
    // Com sombras suaves (raio grande), 2048 chega para os 42 m que a câmara de sombras cobre.
    const n = q === 'baixa' ? 1024 : 2048;
    if (this.sol.shadow.mapSize.x !== n) {
      this.sol.shadow.mapSize.set(n, n);
      this.sol.shadow.map?.dispose();
      this.sol.shadow.map = null;
    }
    this.arvores.forEach((a, i) => (a.visible = q !== 'baixa' || i % 2 === 0));
    // Relva: as instâncias estão baralhadas, por isso mostrar só as primeiras tira-as por igual
    const fracao = q === 'baixa' ? 0.3 : q === 'media' ? 0.65 : 1;
    for (const r of this.relvas) r.count = Math.floor((r.userData.total as number) * fracao);
  }

  // -------------------------------------------------------------------------

  private criarTerreno(largura: number, altura: number, entrada: { x: number; z: number }): void {
    const relva = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320).rotateX(-Math.PI / 2),
      texturaNoMundo(materialPBR('leafy_grass', 1, { color: 0xb4e07c, roughness: 1 }), 0.6, 0.55),
    );
    relva.position.set(this.centro.x, -0.12, this.centro.z);
    relva.receiveShadow = true;
    this.cena.add(relva);

    // Laje do edifício (betão), com um rebordo escuro
    const laje = new THREE.Mesh(
      uvEmMetros(new THREE.BoxGeometry(largura + 0.5, 0.14, altura + 0.5), largura + 0.5, 0.14, altura + 0.5, 2),
      materialPBR('concrete_wall_006', 1, { color: 0xb8b8b4 }),
    );
    laje.position.set(this.centro.x, -0.075, this.centro.z);
    laje.receiveShadow = laje.castShadow = true;
    this.cena.add(laje);

    // Caminho de entrada até ao passeio, com tapete e dois arbustos em vasos
    const caminho = new THREE.Mesh(
      uvEmMetros(new THREE.BoxGeometry(3.4, 0.05, 1.1), 3.4, 0.05, 1.1, 1.6),
      materialPBR('pavement_04', 1),
    );
    caminho.position.set(entrada.x - 2.2, -0.095, entrada.z);
    caminho.receiveShadow = true;
    this.cena.add(caminho);
    const tapete = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 0.75), mat(0x3a2f2a, { roughness: 1 }));
    tapete.position.set(entrada.x - 0.8, -0.062, entrada.z);
    tapete.receiveShadow = true;
    this.cena.add(tapete);
    for (const dz of [-0.85, 0.85]) {
      const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.32, 24), mat(0x30343b, { roughness: 0.6 }));
      vaso.position.set(entrada.x - 1.1, 0.04, entrada.z + dz);
      vaso.castShadow = vaso.receiveShadow = true;
      this.cena.add(vaso);
      const p = R.modelos.planta.clone();
      const tam = R.modelos.planta.userData.tamanho as THREE.Vector3;
      p.scale.setScalar(0.62 / tam.y);
      p.position.set(entrada.x - 1.1, 0.13, entrada.z + dz);
      this.cena.add(p);
    }
  }

  private matsRua?: { asfalto: THREE.Material; risco: THREE.Material; passeio: THREE.Material; lancil: THREE.Material };

  /**
   * Uma rua com asfalto, traço ao centro, linhas nas bermas e passeios com lancil, ao longo de `eixo`,
   * de `de` a `ate`. Em `cortes` cruzam ruas perpendiculares: aí o passeio e as linhas param.
   * `cruza`: esta rua passa por cima das outras (só o asfalto para, para não se sobrepor).
   */
  private criarRua(eixo: 'x' | 'z', pos: number, de: number, ate: number, cortes: number[], cruza: boolean): void {
    this.matsRua ??= {
      asfalto: texturaNoMundo(materialPBR('asphalt_02', 1, { color: 0x8a8a8a, roughness: 1 }), 0.55, 0.25),
      risco: mat(0xf2f2ee, { roughness: 0.7 }),
      passeio: texturaNoMundo(materialPBR('pavement_04', 1), 0.54, 0.2),
      lancil: mat(0xa7a7a2, { roughness: 0.85 }),
    };
    const m = this.matsRua;
    const troços = (folga: number): [number, number][] => {
      const r: [number, number][] = [];
      let a = de;
      for (const c of [...cortes].sort((p, q) => p - q)) {
        if (c - folga > a) r.push([a, c - folga]);
        a = Math.max(a, c + folga);
      }
      if (ate > a) r.push([a, ate]);
      return r;
    };
    // Peça ao longo da rua: `lateral` é o desvio para o lado, `larg` a largura e `alt` a espessura (0 = plano)
    const peca = (a: number, b: number, lateral: number, larg: number, y: number, alt: number, material: THREE.Material, sombra = true) => {
      const comp = b - a;
      const geo = alt > 0
        ? eixo === 'z' ? new THREE.BoxGeometry(larg, alt, comp) : new THREE.BoxGeometry(comp, alt, larg)
        : (eixo === 'z' ? new THREE.PlaneGeometry(larg, comp) : new THREE.PlaneGeometry(comp, larg)).rotateX(-Math.PI / 2);
      const o = new THREE.Mesh(geo, material);
      const meio = (a + b) / 2;
      if (eixo === 'z') o.position.set(pos + lateral, y, meio);
      else o.position.set(meio, y, pos + lateral);
      o.receiveShadow = sombra;
      this.cena.add(o);
    };
    for (const [a, b] of cruza ? troços(MEIA_RUA) : [[de, ate] as [number, number]])
      peca(a, b, 0, MEIA_RUA * 2, cruza ? -0.107 : -0.105, 0, m.asfalto);
    // Traço descontínuo ao centro (instanciado) e linhas contínuas nas bermas
    const tracos: THREE.Matrix4[] = [];
    const mtx = new THREE.Matrix4();
    for (const [a, b] of troços(MEIA_RUA_PASSEIO))
      for (let t = a + 1; t < b - 1; t += 3.6) {
        if (eixo === 'z') mtx.makeTranslation(pos, -0.1, t);
        else mtx.makeRotationY(Math.PI / 2).setPosition(t, -0.1, pos);
        tracos.push(mtx.clone());
      }
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 1.6).rotateX(-Math.PI / 2), m.risco, tracos.length);
    tracos.forEach((t, k) => im.setMatrixAt(k, t));
    im.receiveShadow = true;
    this.cena.add(im);
    for (const [a, b] of troços(MEIA_RUA))
      for (const bx of [-1.9, 1.9]) peca(a, b, bx, 0.06, -0.1, 0, m.risco, false);
    // Passeios (calçada) com lancil de betão. Na rua que cruza, o passeio dobra as esquinas.
    for (const [a, b] of troços(cruza ? MEIA_RUA : MEIA_RUA_PASSEIO))
      for (const lado of [1, -1]) {
        peca(a, b, lado * 2.75, 1.3, -0.07, 0.1, m.passeio);
        peca(a, b, lado * 2.09, 0.09, -0.065, 0.11, m.lancil);
      }
  }

  /** Um carro a circular numa rua (ao longo de `eixo`), na faixa do seu sentido. */
  private carroNaRua(eixo: 'x' | 'z', pos: number, min: number, max: number, i: number): void {
    const CORES = [0x9b1b1b, 0x1f3a6e, 0xd8d8d8, 0x2b2d31, 0x6b7280, 0x0f4c3a, 0xb45309, 0xf2f2f2, 0x2f7fb8, 0xe0b23a];
    const g = this.criarCarro(CORES[(i * 7) % CORES.length], i);
    const sentido = i % 2 ? 1 : -1;
    const ao = min + hash(i + 40) * (max - min);
    if (eixo === 'z') {
      g.position.set(pos + sentido * 1.0, -0.1, ao);
      g.rotation.y = sentido > 0 ? 0 : Math.PI;
    } else {
      g.position.set(ao, -0.1, pos - sentido * 1.0);
      g.rotation.y = sentido > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    this.cena.add(g);
    this.carros.push({ o: g, v: sentido * (4.5 + hash(i) * 3.5), eixo, min, max });
  }

  private criarEstrada(altura: number, entrada: { x: number; z: number }): void {
    const x = RUA_X;
    const z0 = this.centro.z - 160;
    const z1 = this.centro.z + 160;
    this.criarRua('z', RUA_X, z0, z1, [RUA_T_Z], false);
    this.criarRua('z', this.ruaBairro, z0, z1, [RUA_T_Z], false);
    this.criarRua('x', RUA_T_Z, -160, 160, [RUA_X, this.ruaBairro], true);
    // Candeeiros clássicos (Poly Haven), com poça de luz no chão à noite
    const vidros: THREE.Material[] = [];
    const modelo = R.modelos.candeeiro;
    modelo.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      // Só o vidro e a lâmpada (o material do poste também se chama "street_lamp_01")
      if (m && /_(glass|bulb)$/i.test(m.name) && !vidros.includes(m)) vidros.push(m);
    });
    const tamanho = modelo.userData.tamanho as THREE.Vector3;
    const geoPoca = new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2);
    for (let z = -16; z <= altura + 16; z += 6) {
      if (Math.abs(z - entrada.z) < 1.5) continue;
      const c = modelo.clone();
      c.scale.setScalar((3.9 * M) / tamanho.y);
      c.position.set(x + 2.75 - 0.45, -0.02, z);
      c.rotation.y = Math.PI / 2;
      this.cena.add(c);
      const p = new THREE.Mesh(geoPoca, this.matPoca);
      p.position.set(x + 1.9, -0.095, z);
      p.renderOrder = 2;
      this.cena.add(p);
    }
    // Candeeiros na rua do bairro (do lado de cá) e na transversal
    const candeeiro = (cx: number, cz: number, rot: number, px: number, pz: number) => {
      const c = modelo.clone();
      c.scale.setScalar((3.9 * M) / tamanho.y);
      c.position.set(cx, -0.02, cz);
      c.rotation.y = rot;
      this.cena.add(c);
      const p = new THREE.Mesh(geoPoca, this.matPoca);
      p.position.set(px, -0.095, pz);
      p.renderOrder = 2;
      this.cena.add(p);
    };
    const xb = this.ruaBairro;
    for (let z = RUA_T_Z - 40; z <= altura + 40; z += 11) {
      if (Math.abs(z - RUA_T_Z) < 5) continue;
      candeeiro(xb - 2.3, z, -Math.PI / 2, xb - 1.9, z);
    }
    for (let cx = RUA_X + 9; cx < xb - 5; cx += 11) candeeiro(cx, RUA_T_Z + 2.3, Math.PI, cx, RUA_T_Z + 1.9);
    // O vidro dos candeeiros passa a emitir luz (o mesmo material serve para todos)
    for (const v of vidros) {
      const m = v as THREE.MeshStandardMaterial;
      m.emissive = new THREE.Color(0xffd29a);
      m.emissiveIntensity = 0;
      this.matLuzes.push(m);
    }
    // Trânsito: na estrada principal, na rua do bairro e na transversal
    for (let i = 0; i < 10; i++) this.carroNaRua('z', RUA_X, -130, 150, i);
    for (let i = 10; i < 15; i++) this.carroNaRua('z', xb, -130, 150, i);
    for (let i = 15; i < 22; i++) this.carroNaRua('x', RUA_T_Z, -150, 150, i);
    // Bancos de jardim na relva entre o passeio e o terreno, virados para a rua
    const banco = R.modelos.banco;
    if (banco) for (let z = -13; z <= altura + 12; z += 6) {
      if (Math.abs(z - entrada.z) < 1.8) continue;
      const b = banco.clone();
      b.position.set(-2.35, -0.1, z);
      b.rotation.y = -Math.PI / 2;
      this.cena.add(b);
    }
    // Mesas de piquenique na relva do lado de lá do escritório
    const mesa = R.modelos.mesaPiquenique;
    if (mesa) for (const [z, r] of [[3.5, 0.25], [altura / 2 + 1, -0.15], [altura - 3, 0.1]] as const) {
      const m = mesa.clone();
      m.position.set(this.centro.x * 2 + 1.25, -0.1, z);
      m.rotation.y = Math.PI / 2 + r;
      this.cena.add(m);
    }
  }

  private readonly matLuzes: THREE.MeshStandardMaterial[] = [];

  /** Casas do bairro, pela ordem dos ids do jogo (ver NUM_CASAS em sim.ts). */
  private readonly casas: { malhas: THREE.Object3D[]; placa: THREE.Mesh; centro: THREE.Vector3 }[] = [];
  private readonly matPlacas: Record<EstadoCasa, THREE.MeshStandardMaterial> = {
    tua: placaMaterial('CASA TUA', '#2f9e5b'),
    arrendada: placaMaterial('ARRENDADA', '#2f6fb8'),
    morada: placaMaterial('MORAS AQUI', '#d9822b'),
  };
  private readonly lote: { x0: number; x1: number; z0: number; z1: number };
  private readonly lugares: { x: number; z: number; rot: number }[] = [];
  private readonly carrosLote: (THREE.Object3D | null)[] = [];
  /** Retângulos dos edifícios (casas e prédios), onde não se pode andar nem conduzir. */
  readonly obstaculos: { x0: number; x1: number; z0: number; z1: number }[] = [];

  private obstaculo(o: THREE.Object3D): void {
    const b = new THREE.Box3().setFromObject(o);
    this.obstaculos.push({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
  }

  /** O carro estacionado no lugar k (os teus carros estão nos primeiros lugares). */
  carroDoLugar(k: number): THREE.Object3D | null {
    return this.carrosLote[k] ?? null;
  }

  /** Volta a pôr os carros nos lugares (depois de os conduzires). */
  reporEstacionamento(): void {
    for (const m of this.manobras) this.cena.remove(m.obj);
    this.manobras.length = 0;
    this.carrosLote.forEach((c) => c && this.cena.remove(c));
    this.carrosLote.fill(null);
    this.assinaturaLote = '';
  }
  private assinaturaLote = '';

  /** Casa do bairro debaixo do raio (ou null). */
  casaEm(raio: THREE.Raycaster): number | null {
    const hit = raio.intersectObjects(this.casas.flatMap((c) => c.malhas), false)[0];
    return hit ? (hit.object.userData.casa as number) : null;
  }

  /** Centro de uma casa do bairro (para a câmara lá ir). */
  centroCasa(id: number): THREE.Vector3 | null {
    return this.casas[id]?.centro.clone() ?? null;
  }

  /** Placas à frente das casas que são tuas, arrendadas ou onde moras. */
  marcarCasas(estados: Map<number, EstadoCasa>): void {
    this.casas.forEach((c, id) => {
      const e = estados.get(id);
      c.placa.visible = !!e;
      if (e) (c.placa.children[0] as THREE.Mesh).material = this.matPlacas[e];
    });
  }

  /**
   * Carros no estacionamento: os teus (cores) primeiro e depois os da equipa que está no escritório.
   * Só reconstrói quando muda alguma coisa.
   */
  /** Carros da equipa a entrar ou a sair do estacionamento (curva da rua até ao lugar). */
  private readonly manobras: { obj: THREE.Object3D; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; t: number; dur: number; sair: boolean }[] = [];

  private manobra(obj: THREE.Object3D, l: { x: number; z: number }, sair: boolean): void {
    const cz = (this.lote.z0 + this.lote.z1) / 2;
    const cx = (this.lote.x0 + this.lote.x1) / 2;
    const a = new THREE.Vector3(this.ruaBairro - 1, -0.1, cz + (sair ? -1 : 1) * 0.9); // na rua
    const b = new THREE.Vector3(cx, -0.1, l.z); // corredor
    const c = new THREE.Vector3(l.x, -0.1, l.z); // lugar
    const dur = (a.distanceTo(b) + b.distanceTo(c)) / 5;
    this.manobras.push({ obj, a, b, c, t: 0, dur, sair });
  }

  private avancarManobras(dt: number): void {
    const p = new THREE.Vector3();
    const d = new THREE.Vector3();
    for (let i = this.manobras.length - 1; i >= 0; i--) {
      const m = this.manobras[i];
      m.t = Math.min(1, m.t + dt / m.dur);
      const e = m.t * m.t * (3 - 2 * m.t); // acelera e trava
      const u = m.sair ? 1 - e : e; // a sair faz o caminho ao contrário
      const v = 1 - u;
      p.set(0, 0, 0).addScaledVector(m.a, v * v).addScaledVector(m.b, 2 * v * u).addScaledVector(m.c, u * u);
      d.copy(m.b).sub(m.a).multiplyScalar(2 * v).addScaledVector(m.c.clone().sub(m.b), 2 * u);
      if (m.sair) d.negate();
      m.obj.position.copy(p);
      if (d.lengthSq() > 1e-6) m.obj.rotation.y = Math.atan2(d.x, d.z);
      if (m.t >= 1) {
        if (m.sair) this.cena.remove(m.obj);
        this.manobras.splice(i, 1);
      }
    }
  }

  estacionamento(meus: number[], equipa: number): void {
    const assinatura = `${meus.join(',')}|${Math.min(equipa, this.lugares.length)}`;
    if (assinatura === this.assinaturaLote) return;
    const primeira = this.assinaturaLote === '';
    this.assinaturaLote = assinatura;
    const CORES = [0x6b7280, 0x9b1b1b, 0xd8d8d8, 0x2b2d31, 0x0f4c3a, 0xb45309, 0xf2f2f2, 0x2f7fb8, 0xe0b23a, 0x1f3a6e];
    this.lugares.forEach((l, k) => {
      const cor = k < meus.length ? meus[k] : k < meus.length + equipa ? CORES[(k * 7) % CORES.length] : null;
      const atual = this.carrosLote[k];
      const daEquipa = k >= meus.length;
      if (atual && (cor === null || atual.userData.cor !== cor)) {
        // Quem sai da equipa vai-se embora a conduzir; os teus carros desaparecem logo (foram vendidos).
        if (atual.userData.equipa && cor === null && !primeira) this.manobra(atual, l, true);
        else this.cena.remove(atual);
        this.carrosLote[k] = null;
      }
      if (cor !== null && !this.carrosLote[k]) {
        const c = this.criarCarro(cor, 900 + k);
        c.userData.cor = cor;
        c.userData.equipa = daEquipa;
        c.position.set(l.x, -0.1, l.z);
        c.rotation.y = l.rot;
        this.cena.add(c);
        this.carrosLote[k] = c;
        if (daEquipa && !primeira) this.manobra(c, l, false);
      }
    });
  }

  /** Parque de asfalto com uma fila de lugares de cada lado e uma saída para a rua do bairro. */
  private criarEstacionamento(): void {
    const { x0, x1, z0, z1 } = this.lote;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const asfalto = texturaNoMundo(materialPBR('asphalt_02', 1, { color: 0x7d7d7d, roughness: 1 }), 0.55, 0.25);
    const pintura = mat(0xf2f2ee, { roughness: 0.7 });
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), asfalto);
    chao.position.set(cx, -0.108, cz);
    chao.receiveShadow = true;
    this.cena.add(chao);
    // Medidas do lugar a partir do carro
    const amostra = new THREE.Box3().setFromObject(this.criarCarro(0xffffff, 0)).getSize(new THREE.Vector3());
    const compCarro = Math.max(amostra.x, amostra.z);
    const largCarro = Math.min(amostra.x, amostra.z);
    const largLugar = largCarro + 0.55;
    const fundo = compCarro + 0.6;
    const saida = largLugar * 2.2; // largura da saída para a rua
    // Saída: atravessa o passeio até ao asfalto da rua
    const xr = this.ruaBairro - MEIA_RUA;
    const rampa = new THREE.Mesh(new THREE.PlaneGeometry(xr - x1 + 0.05, saida).rotateX(-Math.PI / 2), asfalto);
    rampa.position.set((x1 + xr) / 2, -0.012, cz);
    rampa.receiveShadow = true;
    this.cena.add(rampa);
    // Lancil à volta (menos na saída)
    const lancil = mat(0xbdb9b0, { roughness: 0.85 });
    const borda = (bx: number, bz: number, lx: number, lz: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(lx, 0.12, lz), lancil);
      b.position.set(bx, -0.06, bz);
      b.castShadow = b.receiveShadow = true;
      this.cena.add(b);
    };
    borda(cx, z0, x1 - x0 + 0.12, 0.12);
    borda(cx, z1, x1 - x0 + 0.12, 0.12);
    borda(x0, cz, 0.12, z1 - z0);
    const meioSaida = saida / 2;
    borda(x1, (z0 + cz - meioSaida) / 2, 0.12, cz - meioSaida - z0);
    borda(x1, (z1 + cz + meioSaida) / 2, 0.12, z1 - cz - meioSaida);
    // Lugares: uma fila junto ao lado do escritório e outra junto à rua (menos em frente à saída)
    const tiras: THREE.Matrix4[] = [];
    const mtx = new THREE.Matrix4();
    const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    const n = Math.floor((z1 - z0 - 0.4) / largLugar);
    const zi = cz - (n * largLugar) / 2;
    for (const lado of [-1, 1]) {
      const xf = lado < 0 ? x0 : x1; // fundo do lugar (junto ao lancil)
      const xc = xf - lado * (fundo / 2);
      for (let k = 0; k <= n; k++) {
        const zl = zi + k * largLugar;
        if (lado > 0 && Math.abs(zl - cz) < meioSaida) continue;
        mtx.copy(rot).setPosition(xc, -0.1, zl);
        tiras.push(mtx.clone());
      }
      for (let k = 0; k < n; k++) {
        const zl = zi + (k + 0.5) * largLugar;
        if (lado > 0 && Math.abs(zl - cz) < meioSaida + largLugar / 2) continue;
        this.lugares.push({ x: xc - lado * 0.1, z: zl, rot: lado < 0 ? -Math.PI / 2 : Math.PI / 2 });
      }
    }
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, fundo).rotateX(-Math.PI / 2), pintura, tiras.length);
    tiras.forEach((m, k) => im.setMatrixAt(k, m));
    im.receiveShadow = true;
    this.cena.add(im);
    // Os lugares mais perto da saída primeiro
    this.lugares.sort((a, b) => Math.abs(a.z - cz) + (x1 - a.x) * 0.05 - (Math.abs(b.z - cz) + (x1 - b.x) * 0.05));
    this.carrosLote.length = this.lugares.length;
    this.carrosLote.fill(null);
  }

  /** Carro de passeio (em metros: 4,4 × 1,8 × 1,45), com pintura com verniz, vidros escuros e faróis. */
  private criarCarro(cor: number, i: number): THREE.Object3D {
    // Modelo real (Khronos CarConcept), com a pintura de cada carro na sua cor
    const base = R.modelos.carro;
    if (base) {
      const c = base.clone();
      c.name = 'carro';
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const material = m.material as THREE.MeshPhysicalMaterial;
        if (/^Paint 1/.test(material.name)) {
          const p = material.clone();
          p.color.set(cor);
          p.clearcoat = 1;
          p.clearcoatRoughness = 0.05;
          m.material = p;
        } else if (material.name === 'Headlight') {
          if (!this.matLuzes.includes(material)) this.matLuzes.push(material);
        } else if (material.name === 'Brakelight' || material.name === 'Signallight') {
          material.emissiveIntensity = 0.6;
        }
      });
      return c;
    }
    const g = new THREE.Group();
    const m = new THREE.Group();
    m.scale.setScalar(M);
    g.add(m);
    const pintura = new THREE.MeshPhysicalMaterial({ color: cor, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
    const vidro = new THREE.MeshPhysicalMaterial({ color: 0x0b0f16, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
    const borracha = mat(0x101012, { roughness: 0.9 });
    const jante = mat(0xb9bdc4, { metalness: 1, roughness: 0.3 });
    const extrudir = (pts: [number, number][], largura: number, material: THREE.Material, bisel: number) => {
      const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
      const geo = new THREE.ExtrudeGeometry(s, { depth: largura - bisel * 2, bevelEnabled: true, bevelSize: bisel, bevelThickness: bisel, bevelSegments: 3, curveSegments: 6 });
      geo.translate(0, 0, -(largura - bisel * 2) / 2);
      geo.rotateY(-Math.PI / 2); // perfil desenhado em (z, y), extrudido ao longo de x
      const o = new THREE.Mesh(geo, material);
      o.castShadow = o.receiveShadow = true;
      return o;
    };
    const suv = hash(i + 3) < 0.3;
    const a = suv ? 0.12 : 0;
    // Carroçaria até à linha da cintura
    m.add(extrudir([[2.2, 0.32], [2.22, 0.62], [2.05, 0.8 + a], [1.0, 0.92 + a], [-1.7, 0.96 + a], [-2.18, 0.86 + a], [-2.2, 0.36], [-1.6, 0.28], [1.6, 0.28]], 1.8, pintura, 0.07));
    // Habitáculo de vidro e tejadilho
    m.add(extrudir([[0.95, 0.9 + a], [0.15, 1.38 + a], [-1.05, 1.4 + a], [-1.75, 0.95 + a]], 1.56, vidro, 0.05));
    m.add(extrudir([[0.1, 1.36 + a], [-1.0, 1.38 + a], [-1.08, 1.43 + a], [0.12, 1.42 + a]], 1.5, pintura, 0.04));
    // Rodas
    const geoPneu = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24).rotateZ(Math.PI / 2);
    const geoJante = new THREE.CylinderGeometry(0.21, 0.21, 0.23, 16).rotateZ(Math.PI / 2);
    for (const [rx, rz] of [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.3], [0.8, -1.3]]) {
      const p = new THREE.Mesh(geoPneu, borracha);
      p.position.set(rx, 0.33, rz);
      p.castShadow = true;
      const j = new THREE.Mesh(geoJante, jante);
      j.position.copy(p.position);
      m.add(p, j);
    }
    // Faróis e farolins
    const farol = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.4, roughness: 0.1 });
    const farolim = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: 0.6, roughness: 0.2 });
    this.matLuzes.push(farol);
    for (const fx of [-0.62, 0.62]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05), farol);
      f.position.set(fx, 0.72 + a, 2.2);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.05), farolim);
      t.position.set(fx, 0.8 + a, -2.2);
      m.add(f, t);
    }
    return g;
  }

  private criarArvores(altura: number): void {
    // Poucas variantes geradas (ez-tree), muitas cópias: a geometria é partilhada.
    const especies = ['Ash Medium', 'Oak Medium', 'Aspen Medium', 'Ash Small', 'Oak Small', 'Pine Medium'];
    const variantes = especies.map((nome, k) => {
      const t = new Tree();
      t.loadPreset(nome);
      t.options.seed = 1000 + k * 77;
      t.generate();
      arvorePBR(t);
      t.updateMatrixWorld(true);
      const caixa = new THREE.Box3().setFromObject(t);
      return { t, alturaModelo: caixa.max.y - caixa.min.y };
    });
    const arbusto = new Tree();
    arbusto.loadPreset('Bush 1');
    arbusto.generate();
    arvorePBR(arbusto);
    const alturaArbusto = new THREE.Box3().setFromObject(arbusto).getSize(new THREE.Vector3()).y;

    this.variantes = variantes;
    this.arbusto = { t: arbusto, alturaModelo: alturaArbusto };
    // Sebe baixa ao longo do terreno (do lado de dentro do passeio)
    for (let z = -1.5; z <= altura + 0.5; z += 1.6) {
      const b = new THREE.Group();
      b.add(arbusto.branchesMesh.clone(), arbusto.leavesMesh.clone());
      b.scale.setScalar((0.9 * M) / alturaArbusto);
      b.rotation.y = hash(z * 10) * 6;
      b.position.set(-2.6, -0.12, z);
      this.cena.add(b);
    }
    this.especies.push(...variantes.map((v) => v.t), arbusto);
  }

  /**
   * Bairro de moradias dos dois lados da rua do bairro: paredes em tons pastel, telhados de duas
   * águas, portas, janelas com moldura, chaminés, caminhos, arbustos, árvores nos quintais e
   * alguns carros estacionados à porta.
   */
  private criarBairro(): void {
    const xb = this.ruaBairro;
    const paredes = [0xf6e3c0, 0xdbe9f2, 0xf3d2c9, 0xe2efd3, 0xfff4d8, 0xe8ddf3, 0xf7f1e8].map((c) =>
      materialPBR('painted_plaster_wall', 1, { color: c }),
    );
    const telhas = [0xb4553a, 0x8f3d2c, 0x5c6169, 0xa1603d, 0x6e4a3a].map((c) => mat(c, { roughness: 0.75 }));
    const portasCor = [0x2f5d8a, 0x8a2f2f, 0x2f6b4a, 0x7a4b2e, 0xe0b23a].map((c) => mat(c, { roughness: 0.55 }));
    const branco = mat(0xf7f6f2, { roughness: 0.6 });
    const tijolo = materialPBR('brick_wall_001', 1, { roughness: 0.9 });
    const cimento = texturaNoMundo(materialPBR('concrete_wall_006', 1, { color: 0xcfcac0 }), 0.5, 0.2);
    const vidro = new THREE.MeshStandardMaterial({ color: 0x1a2431, metalness: 0.85, roughness: 0.08 });
    const geoJanela = new THREE.BoxGeometry(0.04, 0.6, 0.55);
    const geoMoldura = new THREE.BoxGeometry(0.03, 0.72, 0.67);
    const janelas: THREE.Matrix4[] = [];
    const acesas: THREE.Matrix4[] = [];
    const molduras: THREE.Matrix4[] = [];
    const mtx = new THREE.Matrix4();
    const rotZ = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    // Janela numa fachada virada para ±x (normal = sinal) ou ±z
    const janela = (x: number, y: number, z: number, viradaX: boolean, sinal: number, semente: number) => {
      const off = sinal * 0.012;
      (viradaX ? mtx.makeTranslation(x + off, y, z) : mtx.copy(rotZ).setPosition(x, y, z + off));
      (hash(semente) < 0.45 ? acesas : janelas).push(mtx.clone());
      (viradaX ? mtx.makeTranslation(x, y, z) : mtx.copy(rotZ).setPosition(x, y, z));
      molduras.push(mtx.clone());
    };

    let i = 0;
    for (const lado of [-1, 1])
      for (let z = this.centro.z - 75; z < this.centro.z + 80; z += 9.5) {
        i++;
        if (Math.abs(z - RUA_T_Z) < 9) continue;
        if (lado < 0 && z > this.lote.z0 - 1 && z < this.lote.z1 + 1) continue; // estacionamento
        const s = i * 11 + (lado > 0 ? 500 : 0);
        const w = 4.6 + hash(s + 1) * 1.8; // ao longo de z
        const d = 4.4 + hash(s + 2) * 1.6; // ao longo de x
        const pisos = hash(s + 3) < 0.55 ? 2 : 1;
        const hp = 1.6;
        const h = pisos * hp + 0.15;
        const frente = xb + lado * (MEIA_RUA_PASSEIO + 3.2); // fachada da frente
        const xc = frente + lado * (d / 2);
        const y0 = -0.12;
        const corpo = new THREE.Mesh(uvEmMetros(new THREE.BoxGeometry(d, h, w), d, h, w, 3), paredes[s % paredes.length]);
        corpo.position.set(xc, y0 + h / 2, z);
        corpo.castShadow = corpo.receiveShadow = true;
        this.cena.add(corpo);
        const idCasa = this.casas.length;
        corpo.userData.casa = idCasa;
        this.obstaculo(corpo);
        // Soco de tijolo à volta da base
        const soco = new THREE.Mesh(uvEmMetros(new THREE.BoxGeometry(d + 0.06, 0.35, w + 0.06), d, 0.35, w, 3), tijolo);
        soco.position.set(xc, y0 + 0.175, z);
        soco.receiveShadow = true;
        this.cena.add(soco);
        // Telhado de duas águas (cumeeira ao longo de z), com beiral
        const rh = d * (0.3 + hash(s + 4) * 0.12);
        const forma = new THREE.Shape([
          new THREE.Vector2(-(d / 2 + 0.3), 0), new THREE.Vector2(d / 2 + 0.3, 0), new THREE.Vector2(0, rh),
        ]);
        // Grupos da ExtrudeGeometry: 0 = topos (as empenas, da cor da parede), 1 = águas (telha)
        const geoTelhado = new THREE.ExtrudeGeometry(forma, { depth: w + 0.02, bevelEnabled: false }).translate(0, 0, -(w + 0.02) / 2);
        const telhado = new THREE.Mesh(geoTelhado, [paredes[s % paredes.length], telhas[(s >> 1) % telhas.length]]);
        telhado.position.set(xc, y0 + h - 0.02, z);
        telhado.castShadow = telhado.receiveShadow = true;
        this.cena.add(telhado);
        telhado.userData.casa = idCasa;
        {
          // Placa no jardim da frente (só aparece nas casas que são tuas)
          const placa = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), branco);
          const px = xb + lado * (MEIA_RUA_PASSEIO + 0.75);
          placa.position.set(px, y0 + 0.42, z - w * 0.42);
          placa.castShadow = true;
          const tabua = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.42), this.matPlacas.tua);
          tabua.position.set(0, 0.32, 0);
          tabua.rotation.y = -lado * Math.PI / 2;
          tabua.castShadow = true;
          placa.add(tabua);
          placa.visible = false;
          this.cena.add(placa);
          this.casas.push({ malhas: [corpo, telhado], placa, centro: new THREE.Vector3(xc, 0, z) });
        }
        // Beirados: tábuas de telha um pouco mais compridas que a casa, por cima das águas
        const comp = Math.hypot(d / 2 + 0.3, rh);
        const incl = Math.atan2(rh, d / 2 + 0.3);
        for (const lx of [-1, 1]) {
          const agua = new THREE.Mesh(new THREE.BoxGeometry(comp + 0.08, 0.07, w + 0.5), telhas[(s >> 1) % telhas.length]);
          agua.position.set(xc + (lx * (d / 2 + 0.3)) / 2, y0 + h - 0.02 + rh / 2 + 0.03, z);
          agua.rotation.z = -lx * incl;
          agua.castShadow = agua.receiveShadow = true;
          this.cena.add(agua);
        }
        if (hash(s + 5) < 0.6) {
          const ch = new THREE.Mesh(uvEmMetros(new THREE.BoxGeometry(0.4, 1.1, 0.4), 0.4, 1.1, 0.4, 3), tijolo);
          ch.position.set(xc + lado * d * 0.2, y0 + h + rh * 0.55, z + w * 0.28);
          ch.castShadow = true;
          this.cena.add(ch);
        }
        // Porta (com degrau) e janelas na frente
        const zPorta = z - w * 0.22;
        const porta = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.6), portasCor[s % portasCor.length]);
        porta.position.set(frente - lado * 0.03, y0 + 0.2 + 0.575, zPorta);
        this.cena.add(porta);
        const degrau = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.95), cimento);
        degrau.position.set(frente - lado * 0.25, y0 + 0.1, zPorta);
        degrau.receiveShadow = true;
        this.cena.add(degrau);
        const fx = frente - lado * 0.015;
        for (let p = 0; p < pisos; p++) {
          const y = y0 + 0.95 + p * hp;
          const zs = p === 0 ? [z + w * 0.12, z + w * 0.32] : [z - w * 0.25, z, z + w * 0.25];
          zs.forEach((jz, k) => janela(fx, y, jz, true, -lado, s * 7 + p * 3 + k));
          for (const lz of [-1, 1]) janela(xc, y, z + lz * (w / 2 + 0.015), false, lz, s * 5 + p + lz);
        }
        // Caminho até ao passeio, entrada da garagem e arbustos no jardim da frente
        const passeioX = xb + lado * MEIA_RUA_PASSEIO;
        const caminho = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(frente - passeioX), 0.7).rotateX(-Math.PI / 2), cimento);
        caminho.position.set((frente + passeioX) / 2, -0.112, zPorta);
        caminho.receiveShadow = true;
        this.cena.add(caminho);
        const zGaragem = z + w / 2 + 1.1;
        const garagem = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(frente - passeioX) + d * 0.6, 1.6).rotateX(-Math.PI / 2), cimento);
        garagem.position.set((frente + passeioX) / 2 + lado * d * 0.3, -0.113, zGaragem);
        garagem.receiveShadow = true;
        this.cena.add(garagem);
        if (hash(s + 6) < 0.45) {
          const carro = this.criarCarro([0x9b1b1b, 0x1f3a6e, 0xd8d8d8, 0x2b2d31, 0x2f7fb8][s % 5], s + 300);
          carro.position.set(frente - lado * 1.35, -0.1, zGaragem);
          carro.rotation.y = lado > 0 ? Math.PI / 2 : -Math.PI / 2;
          this.cena.add(carro);
        }
        for (const bz of [zPorta - 0.75, zPorta + 0.75, z + w * 0.22])
          this.plantarArbusto(frente - lado * 0.55, bz, (0.7 + hash(bz * 3) * 0.35) * M);
        // Cerca baixa de madeira branca ao longo do passeio
        const cerca = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, w * 0.6), branco);
        cerca.position.set(passeioX + lado * 0.15, y0 + 0.25, z + w * 0.2);
        cerca.castShadow = true;
        this.cena.add(cerca);
        // Árvore no quintal das traseiras
        if (hash(s + 7) < 0.8)
          this.plantarArvore(s, xc + lado * (d / 2 + 2.4 + hash(s + 8) * 3), z + (hash(s + 9) - 0.5) * 5, (6 + hash(s + 10) * 5) * M);
        // Nada de árvores na casa e no jardim da frente; a relva cresce no jardim mas não na casa
        const xs = [passeioX, xc + lado * (d / 2 + 0.6)];
        this.ocupado.push({ x0: Math.min(...xs), x1: Math.max(...xs), z0: z - w / 2 - 0.6, z1: zGaragem + 0.9, relva: true });
        const xsCasa = [frente, xc + lado * (d / 2 + 0.3)];
        this.ocupado.push({ x0: Math.min(...xsCasa) - 0.3, x1: Math.max(...xsCasa), z0: z - w / 2 - 0.3, z1: z + w / 2 + 0.3, relva: false });
        const xsGaragem = [passeioX, frente + lado * d * 0.6];
        this.ocupado.push({ x0: Math.min(...xsGaragem), x1: Math.max(...xsGaragem), z0: zGaragem - 0.8, z1: zGaragem + 0.8, relva: false });
        this.ocupado.push({ x0: Math.min(frente, passeioX), x1: Math.max(frente, passeioX), z0: zPorta - 0.35, z1: zPorta + 0.35, relva: false });
      }
    for (const [lista, material] of [[janelas, vidro], [acesas, this.matJanelaAcesa]] as const) {
      const im = new THREE.InstancedMesh(geoJanela, material, lista.length);
      lista.forEach((mm, k) => im.setMatrixAt(k, mm));
      this.cena.add(im);
    }
    const imM = new THREE.InstancedMesh(geoMoldura, branco, molduras.length);
    molduras.forEach((mm, k) => imM.setMatrixAt(k, mm));
    this.cena.add(imM);
  }

  /**
   * Tufos de relva (com vento) e flores de várias cores espalhados pelos relvados. Tudo instanciado:
   * duas chamadas de desenho para milhares de tufos.
   */
  private criarRelva(): void {
    const mtx = new THREE.Matrix4();
    // Tufo: 9 folhas em leque largo, escuras em baixo (da cor do chão) e claras na ponta. Os tufos
    // tocam-se uns nos outros e formam um tapete contínuo.
    const pos: number[] = [];
    const cor: number[] = [];
    const base = new THREE.Color(0x4d7a26);
    const ponta = new THREE.Color(0xa6d85c);
    for (let k = 0; k < 9; k++) {
      const ang = (k / 9) * Math.PI * 2 + hash(k + 70) * 0.7;
      const r = 0.03 + hash(k + 80) * 0.16;
      const cx = Math.cos(ang) * r;
      const cz = Math.sin(ang) * r;
      const h = 0.12 + hash(k + 90) * 0.1;
      const lean = 0.05 + hash(k + 95) * 0.06;
      const px = -Math.sin(ang) * 0.04;
      const pz = Math.cos(ang) * 0.04;
      pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + Math.cos(ang) * lean, h, cz + Math.sin(ang) * lean);
      cor.push(base.r, base.g, base.b, base.r, base.g, base.b, ponta.r, ponta.g, ponta.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
    // Normais para cima: a relva fica iluminada como o chão, sem folhas pretas de costas para o sol
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 3).fill(0).map((_, j) => (j % 3 === 1 ? 1 : 0)), 3));
    const uTempo = this.uTempoRelva;
    const vento = (m: THREE.MeshStandardMaterial, forca: number) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTempo = uTempo;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTempo;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec2 fase = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
  float o = sin(uTempo * 1.7 + fase.x * 0.35 + fase.y * 0.22) + 0.5 * sin(uTempo * 3.1 + fase.y * 0.6);
  transformed.xz += vec2(0.7, 0.4) * o * ${forca.toFixed(3)} * position.y;`);
      };
    };
    const matRelva = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 });
    vento(matRelva, 0.35);

    // Grelha com desvio aleatório (sem falhas nem amontoados): densa até 48 de raio do escritório,
    // e mais rala até à orla (lá ao longe a textura do chão chega).
    const xMin = -11.5;
    const xMax = this.ruaBairro + 24;
    const zMin = this.centro.z - 60;
    const zMax = this.centro.z + 60;
    const PASSO = 0.34;
    const pontos: { x: number; z: number; s: number }[] = [];
    let s = 0;
    for (let gx = xMin; gx < xMax; gx += PASSO)
      for (let gz = zMin; gz < zMax; gz += PASSO) {
        s++;
        const dist = Math.hypot(gx - this.centro.x, gz - this.centro.z);
        if (dist > 48 && hash(s * 3 + 1) > Math.max(0.12, 1 - (dist - 48) / 14)) continue;
        const x = gx + (hash(s * 3 + 2) - 0.5) * PASSO;
        const z = gz + (hash(s * 3 + 3) - 0.5) * PASSO;
        if (this.livre(x, z, 0.08, true)) pontos.push({ x, z, s });
      }
    // Baralha, para que mostrar só as primeiras N (qualidade baixa) as tire por igual de todo o lado
    for (let k = pontos.length - 1; k > 0; k--) {
      const j = Math.floor(hash(k * 7 + 5) * (k + 1));
      [pontos[k], pontos[j]] = [pontos[j], pontos[k]];
    }
    const sorteio = (seed: number) => {
      const x = xMin + hash(seed * 13 + 1) * (xMax - xMin);
      const z = zMin + hash(seed * 13 + 2) * (zMax - zMin);
      const dist = Math.hypot(x - this.centro.x, z - this.centro.z);
      return { x, z, aceite: hash(seed * 13 + 3) < Math.max(0.25, 1 - dist / 70) };
    };
    const N = pontos.length;
    const tufos = new THREE.InstancedMesh(geo, matRelva, N);
    const q = new THREE.Quaternion();
    const e = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const c = new THREE.Color();
    let n = 0;
    for (const pt of pontos) {
      const esc = 0.85 + hash(pt.s * 5 + 1) * 0.45;
      q.setFromAxisAngle(up, hash(pt.s * 5 + 2) * Math.PI * 2);
      mtx.compose(p.set(pt.x, -0.12, pt.z), q, e.set(esc, esc * (0.7 + hash(pt.s * 5 + 3) * 0.6), esc));
      tufos.setMatrixAt(n, mtx);
      // Variação suave de tom em manchas largas (como num relvado verdadeiro) e um pouco por tufo
      const mancha = Math.sin(pt.x * 0.21 + Math.sin(pt.z * 0.13) * 2) * 0.5 + 0.5;
      tufos.setColorAt(n, c.setHSL(0.2 + mancha * 0.08 + hash(pt.s * 5 + 4) * 0.03, 0.35, 0.8 + mancha * 0.06 + hash(pt.s * 5 + 4) * 0.06));
      n++;
    }
    tufos.count = n;
    tufos.userData.total = n;
    tufos.receiveShadow = true;
    tufos.frustumCulled = false;
    this.cena.add(tufos);
    this.relvas.push(tufos);

    // Flores: pequenos canteiros espontâneos de 5 a 12 flores da mesma cor
    const CORES_FLOR = [0xffffff, 0xffd23f, 0xff6fa8, 0xb07cff, 0xff5a4a, 0x6fb8ff, 0xffa53f];
    const geoFlor = new THREE.IcosahedronGeometry(0.055, 0).translate(0, 0.17, 0);
    const caule = new THREE.CylinderGeometry(0.008, 0.008, 0.17, 3).translate(0, 0.085, 0);
    const matFlor = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true });
    vento(matFlor, 0.25);
    const matCaule = new THREE.MeshStandardMaterial({ color: 0x4f7f2a, roughness: 0.9 });
    vento(matCaule, 0.25);
    const MAX_FLORES = 1600;
    const flores = new THREE.InstancedMesh(geoFlor, matFlor, MAX_FLORES);
    const caules = new THREE.InstancedMesh(caule, matCaule, MAX_FLORES);
    let f = 0;
    for (let seed = 1; f < MAX_FLORES - 12 && seed < 4000; seed++) {
      const r = sorteio(seed + 1000);
      if (!r.aceite) continue;
      const corF = CORES_FLOR[Math.floor(hash(seed + 0.41) * CORES_FLOR.length)];
      const quantas = 5 + Math.floor(hash(seed + 0.43) * 8);
      for (let k = 0; k < quantas; k++) {
        const fx = r.x + (hash(seed * 3 + k) - 0.5) * 1.4;
        const fz = r.z + (hash(seed * 5 + k) - 0.5) * 1.4;
        if (!this.livre(fx, fz, 0.15, true)) continue;
        const esc = 0.5 + hash(seed + k * 0.1) * 0.3;
        mtx.compose(p.set(fx, -0.12, fz), q.identity(), e.set(esc, esc, esc));
        flores.setMatrixAt(f, mtx);
        caules.setMatrixAt(f, mtx);
        flores.setColorAt(f, c.set(corF).offsetHSL(0, 0, (hash(seed + k) - 0.5) * 0.1));
        f++;
      }
    }
    for (const im of [flores, caules]) {
      im.count = f;
      im.userData.total = f;
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.cena.add(im);
      this.relvas.push(im);
    }
  }

  private criarCidade(): void {
    const fachadas = [
      materialPBR('brick_wall_001', 1, { roughness: 0.9 }),
      materialPBR('concrete_wall_006', 1, { color: 0xd8d2c6 }),
      materialPBR('brick_wall_001', 1, { color: 0xc9b9a6, roughness: 0.9 }),
      materialPBR('painted_plaster_wall', 1, { color: 0xe8d9b5 }),
      materialPBR('painted_plaster_wall', 1, { color: 0xf3f0ea }),
    ];
    const vidro = new THREE.MeshStandardMaterial({ color: 0x1a2431, metalness: 0.85, roughness: 0.08 });
    const telhado = mat(0x3a3d42, { roughness: 0.9 });
    const geoJanela = new THREE.BoxGeometry(0.04, 0.62, 0.52);
    const janelas: THREE.Matrix4[] = [];
    const acesas: THREE.Matrix4[] = [];
    const mtx = new THREE.Matrix4();
    // Duas filas: a da frente, virada para a estrada, e uma de prédios mais altos atrás
    for (let i = 0; i < 44; i++) {
      const fila = i < 22 ? 0 : 1;
      const k = i % 22;
      const w = 3.4 + hash(i + 200) * 3;
      const d = 4.5 + hash(i + 300) * 3.5;
      const pisos = fila === 0 ? 2 + Math.floor(hash(i + 400) * 6) : 5 + Math.floor(hash(i + 400) * 9);
      const h = pisos * 1.75 + 0.4;
      const x = fila === 0 ? -14.2 - w / 2 - hash(i + 500) * 6 : -30 - w / 2 - hash(i + 500) * 8;
      const z = -58 + k * 7.6 + hash(i + 600) * 1.5 + fila * 3.5;
      if (Math.abs(z - RUA_T_Z) < d / 2 + MEIA_RUA_PASSEIO + 0.6) continue;
      const corpo = new THREE.Mesh(uvEmMetros(new THREE.BoxGeometry(w, h, d), w, h, d, 3), fachadas[i % fachadas.length]);
      corpo.position.set(x, h / 2 - 0.12, z);
      corpo.castShadow = corpo.receiveShadow = true;
      this.cena.add(corpo);
      this.obstaculo(corpo);
      const topo = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12), telhado);
      topo.position.set(x, h - 0.06, z);
      topo.castShadow = true;
      this.cena.add(topo);
      // Janelas nas fachadas viradas para a estrada (+x) e para os lados (±z)
      for (let p = 0; p < pisos; p++) {
        const y = 0.95 + p * 1.75 - 0.12;
        for (let k = -d / 2 + 0.75; k < d / 2 - 0.4; k += 1.15) {
          mtx.makeTranslation(x + w / 2 + 0.01, y, z + k);
          (hash(i * 97 + p * 13 + k * 7) < 0.45 ? acesas : janelas).push(mtx.clone());
        }
        for (const lado of [-1, 1])
          for (let k = -w / 2 + 0.75; k < w / 2 - 0.4; k += 1.3) {
            mtx.makeRotationY(Math.PI / 2).setPosition(x + k, y, z + lado * (d / 2 + 0.01));
            (hash(i * 31 + p * 7 + k * 11 + lado) < 0.4 ? acesas : janelas).push(mtx.clone());
          }
      }
    }
    for (const [lista, material] of [[janelas, vidro], [acesas, this.matJanelaAcesa]] as const) {
      const im = new THREE.InstancedMesh(geoJanela, material, lista.length);
      lista.forEach((mm, k) => im.setMatrixAt(k, mm));
      this.cena.add(im);
    }
    // As janelas que acendem à noite são vidro durante o dia
    this.matJanelaAcesa.color.copy(vidro.color);
    this.matJanelaAcesa.metalness = 0.85;
    this.matJanelaAcesa.roughness = 0.08;
  }

  // -------------------------------------------------------------------------

  /** Atualiza céu, luzes e coisas que mexem. `minutoDoDia` vem do jogo. */
  atualizar(dt: number, minutoDoDia: number, ciclo: boolean): void {
    this.tempo += dt;
    const h = ciclo ? minutoDoDia / 60 : HORA_FIXA;
    // Sol: nasce às 6h a este, põe-se às 19h30 a oeste; elevação máxima ~62°.
    const fase = (h - 6) / 13.5;
    const elev = Math.sin(fase * Math.PI) * 1.08 - 0.06; // radianos; < 0 de noite
    const azim = Math.PI * (0.15 + fase * 0.7);
    const dirSol = this.dirSol.set(Math.cos(azim) * Math.cos(elev), Math.sin(elev), Math.sin(azim) * Math.cos(elev) * 0.6 + 0.35).normalize();
    const dia = THREE.MathUtils.smoothstep(elev, -0.08, 0.12);
    const alto = THREE.MathUtils.smoothstep(elev, 0.05, 0.6);
    this.noite = 1 - dia;

    const u = this.ceu.material.uniforms;
    u.sunPosition.value.copy(dirSol);
    u.time.value = this.tempo;
    u.rayleigh.value = 1.2 + (1 - alto) * 1.6;
    u.turbidity.value = 3 + (1 - alto) * 4;

    // Luz direta: sol (quente ao nascer/pôr) ou lua (azulada, fraca)
    if (dia > 0.02) {
      this.sol.position.copy(this.centro).addScaledVector(dirSol, 60);
      this.sol.color.copy(COR_SOL_BAIXO).lerp(COR_SOL_ALTO, alto);
      this.sol.intensity = 3.4 * dia * (0.35 + 0.65 * alto);
    } else {
      this.sol.position.set(this.centro.x - 20, 50, this.centro.z + 25);
      this.sol.color.copy(COR_LUA);
      this.sol.intensity = 0.35;
    }
    // De noite o céu não dá luz de ambiente: o hemisfério faz de luar difuso e luz da cidade.
    this.hemi.intensity = 0.3 + 0.25 * dia;
    this.interior.intensity = (1 - dia) * 0.75;
    this.interiorDifusa.intensity = (1 - dia) * 0.55;
    const luzes = 1 - THREE.MathUtils.smoothstep(elev, -0.02, 0.14);
    this.matLuz.emissiveIntensity = luzes * 3;
    for (const m of this.matLuzes) m.emissiveIntensity = 0.3 + luzes * 4;
    this.matJanelaAcesa.emissiveIntensity = luzes * 1.6;
    this.matPoca.opacity = luzes * 0.55;

    const nevoa = this.cena.fog as THREE.FogExp2;
    nevoa.color.copy(NEVOA_POR).lerp(NEVOA_DIA, alto).lerp(NEVOA_NOITE, 1 - dia);
    // O céu do Sky é muito luminoso (HDR): como luz de ambiente usa-se só uma parte.
    this.cena.environmentIntensity = 0.05 + 0.32 * dia;
    this.cena.backgroundIntensity = 1;

    // Luz do ambiente (reflexos e luz difusa) gerada a partir do céu, quando o sol mexe o suficiente
    this.tempoAmbiente -= dt;
    if (this.ultimoSol.angleTo(dirSol) > 0.02 && this.tempoAmbiente <= 0) {
      this.ultimoSol.copy(dirSol);
      this.tempoAmbiente = 0.5;
      const copia = this.cenaCeu.children[0] as Sky;
      const uc = copia.material.uniforms;
      for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'cloudCoverage', 'cloudDensity'])
        uc[k].value = u[k].value;
      uc.sunPosition.value.copy(dirSol);
      uc.showSunDisc.value = 0;
      copia.scale.setScalar(100);
      const novo = this.pmrem.fromScene(this.cenaCeu, 0, 0.1, 400);
      this.cena.environment = novo.texture;
      this.alvoAmbiente?.dispose();
      this.alvoAmbiente = novo;
    }

    for (const c of this.carros) {
      const p = c.o.position;
      p[c.eixo] += c.v * dt;
      if (p[c.eixo] > c.max) p[c.eixo] = c.min;
      if (p[c.eixo] < c.min) p[c.eixo] = c.max;
    }
    this.uTempoRelva.value = this.tempo;
    this.avancarManobras(dt);
    for (const e of this.especies) e.update(this.tempo);
  }
}
