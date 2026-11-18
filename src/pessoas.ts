// Pessoas realistas (Microsoft Rocketbox): esqueleto animado, escolha do modelo pelo nome e pelo id,
// indicador de felicidade e anel de seleção. Só aspeto — o que cada um faz vem de sim.ts.
import * as THREE from 'three';
import { clone as clonarComEsqueleto } from 'three/addons/utils/SkeletonUtils.js';
import { M, R, type Sexo } from './recursos.ts';

export type Pose = 'andar' | 'trabalhar' | 'parado' | 'festejar';

/** Nomes próprios femininos de sim.ts (o resto é masculino). */
const FEMININOS = new Set(['Ana', 'Maria', 'Inês', 'Beatriz', 'Sofia', 'Carla', 'Rita', 'Marta', 'Leonor']);

/** Altura (unidades do mundo) a que fica o indicador de felicidade, de pé e sentado. */
export const ALTURA_INDICADOR = { pe: 2.05 * M, sentado: 1.62 * M };

const geoIndicador = new THREE.OctahedronGeometry(0.06, 0).scale(1, 1.6, 1);
const geoAnel = new THREE.RingGeometry(0.24, 0.3, 40).rotateX(-Math.PI / 2);
const matAnel = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, depthWrite: false });

function hash(n: number): number {
  let t = (n * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 2246822507);
  t = Math.imul(t ^ (t >>> 13), 3266489909);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

export function sexoDe(nome: string): Sexo {
  return FEMININOS.has(nome.split(' ')[0]) ? 'f' : 'm';
}

export class Pessoa {
  readonly grupo = new THREE.Group();
  readonly indicador: THREE.Mesh;
  readonly anel: THREE.Mesh;
  readonly sexo: Sexo;
  private readonly corpo: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer;
  private readonly acoes = new Map<Pose, THREE.AnimationAction>();
  private atual: Pose | null = null;
  private readonly maos: THREE.Bone[] = [];
  private readonly fase: number;
  private festaAte = 0;
  private tempo = 0;
  /** Unidades do mundo por segundo a que a animação de andar foi gravada. */
  private readonly passo: number;

  constructor(id: number, nome: string) {
    this.sexo = sexoDe(nome);
    const lista = R.pessoas.filter((p) => p.sexo === this.sexo);
    const modelo = lista[(id * 7 + Math.floor(hash(id) * 3)) % lista.length];
    this.corpo = clonarComEsqueleto(modelo.cena);
    this.corpo.scale.setScalar(0.01 * M); // modelos em centímetros
    this.grupo.add(this.corpo);
    this.fase = hash(id + 99);

    const anim = R.animacoes[this.sexo];
    this.passo = anim.velocidadeAndar * M;
    this.mixer = new THREE.AnimationMixer(this.corpo);
    for (const pose of ['andar', 'trabalhar', 'parado', 'festejar'] as Pose[]) {
      const clip = anim.clips[pose];
      if (!clip) continue;
      const a = this.mixer.clipAction(clip);
      if (pose === 'festejar') a.setLoop(THREE.LoopRepeat, Infinity);
      this.acoes.set(pose, a);
    }
    this.corpo.traverse((o) => {
      if ((o as THREE.Bone).isBone && /^Bip01_[LR]_Hand$/.test(o.name)) this.maos.push(o as THREE.Bone);
    });

    this.indicador = new THREE.Mesh(
      geoIndicador,
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 1.8, roughness: 0.3 }),
    );
    this.indicador.position.y = ALTURA_INDICADOR.pe;
    this.grupo.add(this.indicador);
    this.anel = new THREE.Mesh(geoAnel, matAnel);
    this.anel.position.y = 0.015;
    this.anel.visible = false;
    this.grupo.add(this.anel);
    this.definirPose('parado');
  }

  private definirPose(pose: Pose): void {
    if (pose === this.atual) return;
    const nova = this.acoes.get(pose);
    if (!nova) return;
    const antiga = this.atual ? this.acoes.get(this.atual) : undefined;
    nova.reset();
    nova.enabled = true;
    nova.setEffectiveWeight(1);
    // Cada pessoa começa num ponto diferente da animação, para não se mexerem todas ao mesmo tempo.
    if (pose !== 'andar' && pose !== 'festejar') nova.time = this.fase * nova.getClip().duration;
    nova.play();
    if (antiga) antiga.crossFadeTo(nova, pose === 'andar' || this.atual === 'andar' ? 0.25 : 0.45, false);
    this.atual = pose;
  }

  /** Festeja durante `segundos` (lançamentos, conquistas), por cima do que estiver a fazer. */
  festejar(segundos: number): void {
    this.festaAte = this.tempo + segundos;
  }

  /**
   * Avança a animação. `velocidade` em unidades/s (para o passo bater com o chão); `escrever`
   * mexe as mãos sobre o teclado quando está sentado com o ecrã ligado.
   */
  atualizar(dt: number, pose: Pose, velocidade: number, escrever: boolean): void {
    this.tempo += dt;
    const p = this.tempo < this.festaAte && pose !== 'andar' ? 'festejar' : pose;
    this.definirPose(p);
    const andar = this.acoes.get('andar');
    if (andar) andar.timeScale = p === 'andar' ? THREE.MathUtils.clamp(velocidade / this.passo, 0.6, 2.2) : 1;
    this.mixer.update(dt);
    if (p === 'trabalhar' && escrever) {
      const t = this.tempo * 9 + this.fase * 20;
      this.maos.forEach((m, i) => {
        m.rotateZ(Math.sin(t + i * 2.1) * 0.12 + Math.sin(t * 2.7 + i) * 0.05);
      });
    }
  }
}
