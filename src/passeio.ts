// Passeio: o teu personagem sai do escritório e anda pelo mapa (WASD, Shift corre), e conduz os teus
// carros. A câmara segue atrás. A lógica do jogo continua a correr; só o teu personagem deixa de trabalhar.
import * as THREE from 'three';
import { M } from './recursos.ts';
import { Pessoa } from './pessoas.ts';
import type { Aparencia } from './sim.ts';

export interface Obstaculo { x0: number; x1: number; z0: number; z1: number }

const ANDAR = 1.5 * M; // unidades por segundo
const CORRER = 4.2 * M;
const VIRAR = 2.6; // rad/s a pé
const CARRO = { maxima: 16, re: 4, aceleracao: 7, travao: 14, atrito: 3, virar: 1.9 };
const LIMITES = { x0: -70, x1: 120, z0: -95, z1: 110 };

export class Passeio {
  ativo = false;
  private avatar: Pessoa | null = null;
  readonly pos = new THREE.Vector3();
  rumo = 0;
  private vel = 0;
  /** Carro que estás a conduzir (o objeto 3D do estacionamento) e o índice do lugar. */
  carro: { obj: THREE.Object3D; lugar: number } | null = null;
  private readonly alvoCam = new THREE.Vector3();
  private readonly olhar = new THREE.Vector3();
  private readonly cena: THREE.Scene;
  private readonly camara: THREE.PerspectiveCamera;
  private readonly obstaculos: () => Obstaculo[];

  constructor(cena: THREE.Scene, camara: THREE.PerspectiveCamera, obstaculos: () => Obstaculo[]) {
    this.cena = cena;
    this.camara = camara;
    this.obstaculos = obstaculos;
  }

  iniciar(aparencia: Aparencia, nome: string, x: number, z: number, rumo: number): void {
    this.terminar();
    this.ativo = true;
    this.avatar = new Pessoa(0, nome, aparencia);
    this.avatar.indicador.visible = false;
    this.cena.add(this.avatar.grupo);
    this.pos.set(x, 0, z);
    this.rumo = rumo;
    this.vel = 0;
    this.avatar.grupo.position.copy(this.pos);
    this.avatar.grupo.rotation.y = rumo;
    this.posicionarCamara(1);
  }

  terminar(): void {
    if (this.avatar) this.cena.remove(this.avatar.grupo);
    this.avatar = null;
    this.carro = null;
    this.ativo = false;
  }

  /** Muda as cores do personagem se o jogador as mudou entretanto. */
  pintar(a: Aparencia): void {
    this.avatar?.mudarCores(a);
  }

  entrarNoCarro(obj: THREE.Object3D, lugar: number): void {
    this.carro = { obj, lugar };
    this.pos.copy(obj.position).setY(0);
    this.rumo = obj.rotation.y;
    this.vel = 0;
    if (this.avatar) this.avatar.grupo.visible = false;
  }

  /** Sai do carro: o personagem fica ao lado da porta do condutor. */
  sairDoCarro(): void {
    if (!this.carro) return;
    const lado = new THREE.Vector3(Math.cos(this.rumo), 0, -Math.sin(this.rumo)).multiplyScalar(1.1);
    let p = this.pos.clone().add(lado);
    if (this.colide(p, 0.25)) p = this.pos.clone().sub(lado);
    this.pos.copy(p);
    this.carro = null;
    this.vel = 0;
    if (this.avatar) {
      this.avatar.grupo.visible = true;
      this.avatar.grupo.position.copy(this.pos);
    }
  }

  private colide(p: THREE.Vector3, raio: number): boolean {
    if (p.x < LIMITES.x0 || p.x > LIMITES.x1 || p.z < LIMITES.z0 || p.z > LIMITES.z1) return true;
    for (const o of this.obstaculos())
      if (p.x > o.x0 - raio && p.x < o.x1 + raio && p.z > o.z0 - raio && p.z < o.z1 + raio) return true;
    return false;
  }

  /** Avança o passeio. `teclas` são as teclas carregadas (minúsculas). Devolve a velocidade em km/h no carro. */
  atualizar(dt: number, teclas: Set<string>): number {
    if (!this.ativo) return 0;
    const tem = (...k: string[]) => k.some((x) => teclas.has(x));
    const frente = (tem('w', 'arrowup') ? 1 : 0) - (tem('s', 'arrowdown') ? 1 : 0);
    const virar = (tem('a', 'arrowleft') ? 1 : 0) - (tem('d', 'arrowright') ? 1 : 0);
    if (this.carro) {
      const c = CARRO;
      if (frente > 0) this.vel += (this.vel < 0 ? c.travao : c.aceleracao) * dt;
      else if (frente < 0) this.vel -= (this.vel > 0 ? c.travao : c.aceleracao) * dt;
      else this.vel -= Math.sign(this.vel) * Math.min(Math.abs(this.vel), c.atrito * dt);
      this.vel = Math.max(-c.re, Math.min(c.maxima, this.vel));
      // Só vira quando se move (e ao contrário em marcha-atrás)
      this.rumo += virar * c.virar * dt * Math.max(-1, Math.min(1, this.vel / 4));
      const passo = new THREE.Vector3(Math.sin(this.rumo), 0, Math.cos(this.rumo)).multiplyScalar(this.vel * dt);
      const novo = this.pos.clone().add(passo);
      const frenteCarro = novo.clone().addScaledVector(new THREE.Vector3(Math.sin(this.rumo), 0, Math.cos(this.rumo)), Math.sign(this.vel || 1) * 1.2);
      if (this.colide(novo, 0.6) || this.colide(frenteCarro, 0.5)) this.vel *= -0.25;
      else this.pos.copy(novo);
      this.carro.obj.position.set(this.pos.x, -0.1, this.pos.z);
      this.carro.obj.rotation.y = this.rumo;
    } else if (this.avatar) {
      this.rumo += virar * VIRAR * dt;
      const correr = tem('shift');
      const v = frente * (correr && frente > 0 ? CORRER : ANDAR) * (frente < 0 ? 0.6 : 1);
      const novo = this.pos.clone().add(new THREE.Vector3(Math.sin(this.rumo), 0, Math.cos(this.rumo)).multiplyScalar(v * dt));
      if (!this.colide(novo, 0.25)) this.pos.copy(novo);
      this.avatar.grupo.position.copy(this.pos);
      this.avatar.grupo.rotation.y = this.rumo;
      this.avatar.atualizar(dt, frente !== 0 ? 'andar' : 'parado', Math.abs(v), false);
    }
    this.posicionarCamara(Math.min(1, dt * 4));
    return Math.round((Math.abs(this.vel) / M) * 3.6);
  }

  private posicionarCamara(k: number): void {
    const longe = this.carro ? 6.5 : 3.4;
    const alto = this.carro ? 3.1 : 2.1;
    this.alvoCam.set(this.pos.x - Math.sin(this.rumo) * longe, alto, this.pos.z - Math.cos(this.rumo) * longe);
    this.camara.position.lerp(this.alvoCam, k);
    this.olhar.lerp(new THREE.Vector3(this.pos.x, this.carro ? 0.7 : 0.75, this.pos.z), k === 1 ? 1 : Math.min(1, k * 2));
    this.camara.lookAt(this.olhar);
  }
}
