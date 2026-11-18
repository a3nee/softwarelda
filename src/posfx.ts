// Pós-processamento: oclusão ambiente (GTAO, sombras de contacto), brilho (bloom) nos ecrãs e luzes,
// antialiasing (MSAA) e uma vinheta suave. Usa os addons que já vêm com o Three.js.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** Vinheta suave e saturação ligeira, depois do tone mapping. */
const Acabamento = {
  uniforms: {
    tDiffuse: { value: null },
    vinheta: { value: 0.26 },
    saturacao: { value: 1.04 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vinheta;
    uniform float saturacao;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturacao);
      vec2 d = (vUv - 0.5) * vec2(1.15, 1.0);
      c.rgb *= mix(1.0 - vinheta, 1.0, smoothstep(0.85, 0.25, length(d)));
      gl_FragColor = c;
    }`,
};

export type NivelFx = 'nenhum' | 'acabamento' | 'completo';

export class PosFx {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cena: THREE.Scene;
  private readonly camara: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly ao: GTAOPass;
  /** Objetos que não entram na oclusão (sprites e partículas: seriam quadrados escuros). */
  private readonly semOclusao: THREE.Object3D[] = [];
  nivel: NivelFx = 'completo';

  constructor(renderer: THREE.WebGLRenderer, cena: THREE.Scene, camara: THREE.PerspectiveCamera) {
    this.renderer = renderer;
    this.cena = cena;
    this.camara = camara;
    const alvo = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, alvo);
    this.composer.addPass(new RenderPass(cena, camara));
    this.ao = new GTAOPass(cena, camara, innerWidth, innerHeight);
    this.ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 16 });
    this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    this.ao.blendIntensity = 0.9;
    const renderAO = this.ao.render.bind(this.ao);
    this.ao.render = (...args: Parameters<GTAOPass['render']>) => {
      const antes = this.semOclusao.map((o) => o.visible);
      for (const o of this.semOclusao) o.visible = false;
      renderAO(...args);
      this.semOclusao.forEach((o, i) => (o.visible = antes[i]));
    };
    this.composer.addPass(this.ao);
    // Só o que brilha a sério passa o limiar (ecrãs, luzes, confetes); a luz do sol fica de fora.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.45, 1.6);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(Acabamento));
  }

  excluirDaOclusao(...objetos: THREE.Object3D[]): void {
    this.semOclusao.push(...objetos);
  }

  definir(nivel: NivelFx): void {
    this.nivel = nivel;
    this.bloom.enabled = nivel === 'completo';
    this.ao.enabled = nivel === 'completo';
  }

  /** À noite o brilho sobe um pouco: as janelas e os candeeiros ficam com auréola. */
  intensidade(noite: number): void {
    this.bloom.strength = 0.22 + noite * 0.45;
  }

  redimensionar(largura: number, altura: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(largura, altura);
  }

  render(): void {
    if (this.nivel === 'nenhum') this.renderer.render(this.cena, this.camara);
    else this.composer.render();
  }
}
