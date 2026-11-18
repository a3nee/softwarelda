// Recursos 3D carregados antes do jogo arrancar: pessoas (Rocketbox), animações, modelos (Poly Haven,
// Khronos) e texturas PBR. Sem lógica de jogo. Ver ferramentas/ para a origem de cada ficheiro.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Unidades do mundo por metro: uma célula da grelha mede 1/M ≈ 1,67 m. */
export const M = 0.6;

export type Sexo = 'm' | 'f';

export interface ModeloPessoa {
  nome: string;
  sexo: Sexo;
  cena: THREE.Object3D;
}

export interface AnimacoesSexo {
  clips: Record<string, THREE.AnimationClip>;
  /** Velocidade (m/s) a que a animação de andar foi gravada, para os pés não escorregarem. */
  velocidadeAndar: number;
}

export interface ConjuntoPBR {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  arm: THREE.Texture; // oclusão (r), rugosidade (g), metal (b)
}

export const R = {
  pessoas: [] as ModeloPessoa[],
  animacoes: {} as Record<Sexo, AnimacoesSexo>,
  modelos: {} as Record<string, THREE.Object3D>,
  pbr: {} as Record<string, ConjuntoPBR>,
};

interface ManifestoPessoas {
  pessoas: { nome: string; sexo: Sexo; ficheiro: string; materiais: Record<string, { parte: string; map?: string; normalMap?: string }> }[];
  animacoes: Record<Sexo, Record<string, { ficheiro: string; fps: number; n: number; pistas: string[] }> & { velocidadeAndar: number }>;
}

const MODELOS: Record<string, string> = {
  planta: 'modelos/potted_plant_02/potted_plant_02.gltf',
  plantaPequena: 'modelos/potted_plant_04/potted_plant_04.gltf',
  cafe: 'modelos/CoffeeCart_01/CoffeeCart_01.gltf',
  candeeiro: 'modelos/street_lamp_01/street_lamp_01.gltf',
  sofa: 'modelos/GlamVelvetSofa/GlamVelvetSofa.glb',
};
export const TEXTURAS = [
  'laminate_floor_02', 'herringbone_parquet', 'concrete_floor_worn_001', 'painted_plaster_wall', 'leafy_grass',
  'asphalt_02', 'pavement_04', 'brick_wall_001', 'concrete_wall_006', 'ash_veneer',
] as const;
export type IdTextura = (typeof TEXTURAS)[number];

const BASE = import.meta.env.BASE_URL;
const gltf = new GLTFLoader();
const texturas = new THREE.TextureLoader();
const anisotropia = 8; // o three limita ao máximo da placa gráfica

function textura(url: string, cor: boolean): Promise<THREE.Texture> {
  return texturas.loadAsync(BASE + url).then((t) => {
    t.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = anisotropia;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/** Animação no formato binário de ferramentas/rocketbox.mjs (Int16, fps constante). */
function descodificarClip(nome: string, buf: ArrayBuffer, fps: number, n: number, pistas: string[]): THREE.AnimationClip {
  const dados = new Int16Array(buf);
  const tempos = new Float32Array(n);
  for (let i = 0; i < n; i++) tempos[i] = i / fps;
  let p = 0;
  const tracks: THREE.KeyframeTrack[] = [];
  for (const nomePista of pistas) {
    const pos = nomePista.endsWith('.position');
    const dim = pos ? 3 : 4;
    const v = new Float32Array(n * dim);
    for (let i = 0; i < v.length; i++) v[i] = pos ? dados[p + i] / 10 : dados[p + i] / 32767;
    p += n * dim;
    tracks.push(pos ? new THREE.VectorKeyframeTrack(nomePista, tempos, v) : new THREE.QuaternionKeyframeTrack(nomePista, tempos, v));
  }
  return new THREE.AnimationClip(nome, (n - 1) / fps, tracks);
}

/** Põe o modelo assente no chão, centrado em x/z, à escala do jogo, com sombras. */
function prepararModelo(o: THREE.Object3D): THREE.Object3D {
  const g = new THREE.Group();
  g.add(o);
  o.scale.multiplyScalar(M);
  o.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(o);
  o.position.x -= (caixa.min.x + caixa.max.x) / 2;
  o.position.z -= (caixa.min.z + caixa.max.z) / 2;
  o.position.y -= caixa.min.y;
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
  });
  g.userData.tamanho = caixa.getSize(new THREE.Vector3());
  return g;
}

/** Carrega tudo; `progresso` recebe 0–1. Os erros sobem (o arranque mostra-os). */
export async function carregarRecursos(progresso: (f: number) => void): Promise<void> {
  const manifesto = (await (await fetch(`${BASE}modelos/pessoas/pessoas.json`)).json()) as ManifestoPessoas;
  const tarefas: (() => Promise<void>)[] = [];

  for (const p of manifesto.pessoas) {
    tarefas.push(async () => {
      const r = await gltf.loadAsync(`${BASE}modelos/pessoas/${p.ficheiro}`);
      const materiais = new Map<string, THREE.Material>();
      for (const [nome, m] of Object.entries(p.materiais)) {
        const [map, normalMap] = await Promise.all([
          m.map ? textura(`modelos/pessoas/${m.map}`, true) : null,
          m.normalMap ? textura(`modelos/pessoas/${m.normalMap}`, false) : null,
        ]);
        for (const t of [map, normalMap]) if (t) t.flipY = true, t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        const cabelo = m.parte === 'cabelo';
        materiais.set(nome, new THREE.MeshStandardMaterial({
          name: nome,
          map,
          normalMap,
          roughness: m.parte === 'cabeca' ? 0.55 : cabelo ? 0.6 : 0.78,
          metalness: 0,
          alphaTest: cabelo ? 0.45 : 0,
          alphaToCoverage: cabelo,
          side: cabelo ? THREE.DoubleSide : THREE.FrontSide,
        }));
      }
      r.scene.traverse((o) => {
        const malha = o as THREE.SkinnedMesh;
        if (!malha.isMesh) return;
        malha.castShadow = true;
        malha.receiveShadow = true;
        malha.frustumCulled = false;
        const troca = (x: THREE.Material) => materiais.get(x.name) ?? x;
        malha.material = Array.isArray(malha.material) ? malha.material.map(troca) : troca(malha.material);
      });
      R.pessoas.push({ nome: p.nome, sexo: p.sexo, cena: r.scene });
    });
  }
  for (const sexo of ['m', 'f'] as const) {
    const a = manifesto.animacoes[sexo];
    R.animacoes[sexo] = { clips: {}, velocidadeAndar: a.velocidadeAndar };
    for (const [nome, info] of Object.entries(a)) {
      if (typeof info !== 'object') continue;
      tarefas.push(async () => {
        const buf = await (await fetch(`${BASE}modelos/pessoas/${info.ficheiro}`)).arrayBuffer();
        R.animacoes[sexo].clips[nome] = descodificarClip(nome, buf, info.fps, info.n, info.pistas);
      });
    }
  }
  for (const [nome, url] of Object.entries(MODELOS)) {
    tarefas.push(async () => {
      const r = await gltf.loadAsync(BASE + url);
      R.modelos[nome] = prepararModelo(r.scene);
    });
  }
  for (const id of TEXTURAS) {
    tarefas.push(async () => {
      const [map, normalMap, arm] = await Promise.all([
        textura(`texturas/${id}/cor.jpg`, true),
        textura(`texturas/${id}/normal.jpg`, false),
        textura(`texturas/${id}/arm.jpg`, false),
      ]);
      R.pbr[id] = { map, normalMap, arm };
    });
  }

  let feitas = 0;
  progresso(0);
  await Promise.all(tarefas.map((t) => t().then(() => progresso(++feitas / tarefas.length))));
  R.pessoas.sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Material PBR com uma das texturas do Poly Haven, repetida `rep` vezes (ou [x, y]). */
export function materialPBR(
  id: IdTextura, rep: number | [number, number], extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  const p = R.pbr[id];
  const [rx, ry] = typeof rep === 'number' ? [rep, rep] : rep;
  const c = (t: THREE.Texture) => {
    const n = t.clone();
    n.repeat.set(rx, ry);
    return n;
  };
  const arm = c(p.arm);
  return new THREE.MeshStandardMaterial({
    map: c(p.map), normalMap: c(p.normalMap), roughnessMap: arm, aoMap: arm, aoMapIntensity: 0.8, metalness: 0, ...extra,
  });
}

/**
 * Faz o material usar coordenadas do mundo (x/z) em vez das UV: o padrão continua de uma célula
 * para a outra (soalho, relva, alcatrão) em vez de se repetir em cada peça. `escala` = repetições por unidade.
 */
export function texturaNoMundo(m: THREE.MeshStandardMaterial, escala: number, variacao = 0): THREE.MeshStandardMaterial {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.escalaMundo = { value: escala };
    sh.uniforms.variacaoMundo = { value: variacao };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float escalaMundo;\nvarying vec2 vPosMundo;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
  vec4 pm = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    pm = instanceMatrix * pm;
  #endif
  pm = modelMatrix * pm;
  vPosMundo = pm.xz;
  vec2 uvM = pm.xz * escalaMundo;
  #ifdef USE_MAP
    vMapUv = uvM;
  #endif
  #ifdef USE_NORMALMAP
    vNormalMapUv = uvM;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = uvM;
  #endif
  #ifdef USE_AOMAP
    vAoMapUv = uvM;
  #endif`);
    // Variação de grande escala (manchas claras/escuras), para a repetição não se notar ao longe.
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float variacaoMundo;
varying vec2 vPosMundo;
float ruidoM(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  if (variacaoMundo > 0.0) {
    float r = ruidoM(vPosMundo * 0.11) * 0.6 + ruidoM(vPosMundo * 0.37) * 0.4;
    diffuseColor.rgb *= 1.0 + (r - 0.5) * variacaoMundo;
  }`);
  };
  m.customProgramCacheKey = () => `mundo-${variacao > 0}`;
  return m;
}
