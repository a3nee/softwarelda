// Partículas 3D: símbolos que sobem de quem está a trabalhar (código, design, testes) e moedas nos fechos
// de mês com lucro. Só Three.js, sem lógica de jogo.
import * as THREE from 'three';

type Grupo = 'programacao' | 'design' | 'testes' | 'moeda' | 'estrela';

const GLIFOS: Record<Grupo, string[]> = {
  programacao: ['</>', '{ }', '01', '=>'],
  design: ['◆', '✦', '●', '▲'],
  testes: ['✓', '✔', '⚙', '?'],
  moeda: ['€'],
  estrela: ['★'],
};

// Cores acima de 1 passam o limiar do brilho (bloom).
const CORES: Record<Grupo, THREE.Color> = {
  programacao: new THREE.Color(0x60a5fa).multiplyScalar(1.8),
  design: new THREE.Color(0xf472b6).multiplyScalar(1.8),
  testes: new THREE.Color(0x4ade80).multiplyScalar(1.8),
  moeda: new THREE.Color(0xfbbf24).multiplyScalar(2.2),
  estrela: new THREE.Color(0xfde68a).multiplyScalar(2.4),
};

const texturas = new Map<string, THREE.Texture>();
function textura(glifo: string): THREE.Texture {
  let t = texturas.get(glifo);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.font = `900 ${glifo.length > 2 ? 26 : glifo.length > 1 ? 32 : 44}px "Segoe UI", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,255,255,0.9)';
  g.shadowBlur = 6;
  g.fillStyle = '#fff';
  g.fillText(glifo, 32, 34);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texturas.set(glifo, t);
  return t;
}

interface Particula {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  vida: number;
  duracao: number;
  escala: number;
  gravidade: number;
}

export class Particulas {
  private readonly livres: THREE.Sprite[] = [];
  private readonly vivas: Particula[] = [];
  private readonly grupo = new THREE.Group();

  constructor(cena: THREE.Scene, maximo = 160) {
    cena.add(this.grupo);
    for (let i = 0; i < maximo; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      s.visible = false;
      s.renderOrder = 5;
      this.grupo.add(s);
      this.livres.push(s);
    }
  }

  private lancar(g: Grupo, pos: THREE.Vector3, vel: THREE.Vector3, duracao: number, escala: number, gravidade = 0): void {
    const sprite = this.livres.pop();
    if (!sprite) return;
    const lista = GLIFOS[g];
    const m = sprite.material;
    m.map = textura(lista[Math.floor(Math.random() * lista.length)]);
    m.color.copy(CORES[g]);
    m.opacity = 0;
    m.needsUpdate = true;
    sprite.position.copy(pos);
    sprite.scale.setScalar(0.01);
    sprite.visible = true;
    this.vivas.push({ sprite, vel, vida: 0, duracao, escala, gravidade });
  }

  /** Um símbolo a sair do ecrã de quem trabalha nesta área. */
  trabalho(area: 'programacao' | 'design' | 'testes', pos: THREE.Vector3): void {
    const p = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.95, (Math.random() - 0.5) * 0.3));
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.55 + Math.random() * 0.25, (Math.random() - 0.5) * 0.15);
    this.lancar(area, p, v, 1.8 + Math.random() * 0.6, 0.32);
  }

  /** Repuxo de moedas (fecho do mês com lucro) ou estrelas (subir de nível). */
  repuxo(pos: THREE.Vector3, n = 24, tipo: 'moeda' | 'estrela' = 'moeda'): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 1.4;
      const v = new THREE.Vector3(Math.cos(a) * r, 3.2 + Math.random() * 2.2, Math.sin(a) * r);
      this.lancar(tipo, pos.clone().add(new THREE.Vector3(0, 0.6, 0)), v, 1.6 + Math.random() * 0.6, 0.45, 6);
    }
  }

  atualizar(dt: number): void {
    for (let i = this.vivas.length - 1; i >= 0; i--) {
      const p = this.vivas[i];
      p.vida += dt;
      const t = p.vida / p.duracao;
      if (t >= 1) {
        p.sprite.visible = false;
        this.livres.push(p.sprite);
        this.vivas.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravidade * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const entrada = Math.min(1, t * 6);
      p.sprite.scale.setScalar(p.escala * (0.6 + 0.4 * entrada) * (1 + t * 0.3));
      p.sprite.material.opacity = entrada * (1 - Math.max(0, (t - 0.6) / 0.4));
    }
  }
}
