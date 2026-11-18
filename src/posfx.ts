// Pós-processamento: brilho (bloom) nos ecrãs, candeeiros e janelas, mais uma vinheta e cores mais vivas.
// Usa os addons que já vêm com o Three.js (sem dependências novas).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** Vinheta suave e um toque de saturação, depois do tone mapping. */
const Acabamento = {
  uniforms: {
    tDiffuse: { value: null },
    vinheta: { value: 0.32 },
    saturacao: { value: 1.12 },
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
      c.rgb *= mix(1.0 - vinheta, 1.0, smoothstep(0.82, 0.22, length(d)));
      gl_FragColor = c;
    }`,
};

export type NivelFx = 'nenhum' | 'acabamento' | 'completo';

export class PosFx {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cena: THREE.Scene;
  private readonly camara: THREE.Camera;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  nivel: NivelFx = 'completo';

  constructor(renderer: THREE.WebGLRenderer, cena: THREE.Scene, camara: THREE.Camera) {
    this.renderer = renderer;
    this.cena = cena;
    this.camara = camara;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(cena, camara));
    // Só o que brilha a sério passa o limiar (ecrãs, luzes, confetes); a luz do sol fica quase de fora.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(Acabamento));
  }

  definir(nivel: NivelFx): void {
    this.nivel = nivel;
    this.bloom.enabled = nivel === 'completo';
  }

  /** À noite o brilho sobe um pouco: as janelas e os candeeiros ficam com auréola. */
  intensidade(noite: number): void {
    this.bloom.strength = 0.45 + noite * 0.35;
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
