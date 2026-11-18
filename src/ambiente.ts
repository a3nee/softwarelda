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
  private readonly carros: { o: THREE.Group; v: number }[] = [];
  private readonly arvores: THREE.Object3D[] = [];
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

    this.hemi = new THREE.HemisphereLight(0xdfeaff, 0x4a5a32, 0.25);
    cena.add(this.hemi);
    this.sol = new THREE.DirectionalLight(0xfff2dc, 3);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(4096, 4096);
    const c = this.sol.shadow.camera;
    c.left = c.bottom = -21;
    c.right = c.top = 21;
    c.near = 1;
    c.far = 160;
    this.sol.shadow.bias = -0.00025;
    this.sol.shadow.normalBias = 0.02;
    this.sol.shadow.radius = 2.5;
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

    this.criarTerreno(largura, altura, entrada);
    this.criarEstrada(altura, entrada);
    this.criarArvores(largura, altura);
    this.criarCidade();
  }

  set sombras(v: boolean) {
    this.sol.castShadow = v;
  }

  /** Resolução das sombras e número de árvores visíveis conforme a qualidade. */
  qualidade(q: Qualidade): void {
    const n = q === 'alta' ? 4096 : q === 'media' ? 2048 : 1024;
    if (this.sol.shadow.mapSize.x !== n) {
      this.sol.shadow.mapSize.set(n, n);
      this.sol.shadow.map?.dispose();
      this.sol.shadow.map = null;
    }
    this.arvores.forEach((a, i) => (a.visible = q !== 'baixa' || i % 2 === 0));
  }

  // -------------------------------------------------------------------------

  private criarTerreno(largura: number, altura: number, entrada: { x: number; z: number }): void {
    const relva = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320).rotateX(-Math.PI / 2),
      texturaNoMundo(materialPBR('leafy_grass', 1, { color: 0xc4d6a0, roughness: 1 }), 0.6, 0.55),
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

  private criarEstrada(altura: number, entrada: { x: number; z: number }): void {
    const x = -6.5;
    const asfalto = texturaNoMundo(materialPBR('asphalt_02', 1, { color: 0x8a8a8a, roughness: 1 }), 0.55, 0.25);
    const estrada = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 320).rotateX(-Math.PI / 2), asfalto);
    estrada.position.set(x, -0.105, this.centro.z);
    estrada.receiveShadow = true;
    this.cena.add(estrada);
    // Traço descontínuo ao centro e linhas contínuas nas bermas
    const matRisco = mat(0xf2f2ee, { roughness: 0.7 });
    const geoRisco = new THREE.PlaneGeometry(0.07, 1.6).rotateX(-Math.PI / 2);
    for (let z = -140; z < 160; z += 3.6) {
      const r = new THREE.Mesh(geoRisco, matRisco);
      r.position.set(x, -0.1, z);
      r.receiveShadow = true;
      this.cena.add(r);
    }
    for (const bx of [-1.9, 1.9]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 320).rotateX(-Math.PI / 2), matRisco);
      l.position.set(x + bx, -0.1, this.centro.z);
      this.cena.add(l);
    }
    // Passeios (calçada) com lancil de betão
    const matPasseio = texturaNoMundo(materialPBR('pavement_04', 1), 0.54, 0.2);
    const matLancil = mat(0xa7a7a2, { roughness: 0.85 });
    for (const lado of [1, -1]) {
      const px = x + lado * 2.75;
      const passeio = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 320), matPasseio);
      passeio.position.set(px, -0.07, this.centro.z);
      passeio.receiveShadow = true;
      this.cena.add(passeio);
      const lancil = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 320), matLancil);
      lancil.position.set(px - lado * 0.66, -0.065, this.centro.z);
      lancil.receiveShadow = true;
      this.cena.add(lancil);
    }
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
    // O vidro dos candeeiros passa a emitir luz (o mesmo material serve para todos)
    for (const v of vidros) {
      const m = v as THREE.MeshStandardMaterial;
      m.emissive = new THREE.Color(0xffd29a);
      m.emissiveIntensity = 0;
      this.matLuzes.push(m);
    }
    // Carros
    const CORES = [0x9b1b1b, 0x1f3a6e, 0xd8d8d8, 0x2b2d31, 0x6b7280, 0x0f4c3a, 0xb45309, 0xf2f2f2];
    for (let i = 0; i < 7; i++) {
      const g = this.criarCarro(CORES[i % CORES.length], i);
      const sentido = i % 2 ? 1 : -1;
      g.position.set(x + sentido * 1.0, -0.1, -120 + hash(i + 40) * 260);
      g.rotation.y = sentido > 0 ? 0 : Math.PI;
      this.cena.add(g);
      this.carros.push({ o: g, v: sentido * (5 + hash(i) * 3) });
    }
  }

  private readonly matLuzes: THREE.MeshStandardMaterial[] = [];

  /** Carro de passeio (em metros: 4,4 × 1,8 × 1,45), com pintura com verniz, vidros escuros e faróis. */
  private criarCarro(cor: number, i: number): THREE.Group {
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

  private criarArvores(largura: number, altura: number): void {
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

    let n = 0;
    for (let i = 0; i < 500 && n < 42; i++) {
      const x = -34 + hash(i * 3 + 1) * (largura + 70);
      const z = -30 + hash(i * 3 + 2) * (altura + 60);
      const dentro = x > -2.8 && x < largura + 2 && z > -2.8 && z < altura + 2;
      const naEstrada = x > -10.5 && x < -2.2;
      const naCidade = x < -11.5;
      if (dentro || naEstrada || naCidade) continue;
      n++;
      const v = variantes[i % variantes.length];
      const alvo = (7 + hash(i * 3 + 3) * 6) * M;
      const a = new THREE.Group();
      a.add(v.t.branchesMesh.clone(), v.t.leavesMesh.clone());
      a.scale.setScalar(alvo / v.alturaModelo);
      a.rotation.y = hash(i + 5) * Math.PI * 2;
      a.position.set(x, -0.12, z);
      this.cena.add(a);
      this.arvores.push(a);
    }
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
    for (let i = 0; i < 20; i++) {
      const w = 3.4 + hash(i + 200) * 3;
      const d = 4.5 + hash(i + 300) * 3.5;
      const pisos = 2 + Math.floor(hash(i + 400) * 6);
      const h = pisos * 1.75 + 0.4;
      const x = -14.2 - w / 2 - hash(i + 500) * 6;
      const z = -44 + i * 7.2 + hash(i + 600) * 1.5;
      const corpo = new THREE.Mesh(uvEmMetros(new THREE.BoxGeometry(w, h, d), w, h, d, 3), fachadas[i % fachadas.length]);
      corpo.position.set(x, h / 2 - 0.12, z);
      corpo.castShadow = corpo.receiveShadow = true;
      this.cena.add(corpo);
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
    this.hemi.intensity = 0.3 - 0.08 * dia;
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
      c.o.position.z += c.v * dt;
      if (c.o.position.z > 150) c.o.position.z = -130;
      if (c.o.position.z < -130) c.o.position.z = 150;
    }
    for (const e of this.especies) e.update(this.tempo);
  }
}
