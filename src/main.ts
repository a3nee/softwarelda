// Cena 3D, construção e interface. A lógica do jogo vive em sim.ts.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  arestaMaisProxima, avancar, colocarParedes, colocarPorta, colocarSecretaria, contratar,
  demolirArestas, despedir, detetarSalas, ECON, euros, fatorMercado, iniciarProjeto, lerAresta,
  minutoDoDia, NADA, NOME_ESTADO, novoJogo, PORTA, removerSecretaria, secretariaEm, segmento,
  textoData, type Aresta, type Estado, type Funcionario, type Resultado,
} from './sim.ts';

const s: Estado = novoJogo(Date.now() & 0xffff);

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x1d2230);

const camara = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
// Centro ligeiramente à direita para o painel lateral não tapar o terreno.
const centro = new THREE.Vector3((s.largura - 1) / 2 + 3, 0, (s.altura - 1) / 2);
camara.position.set(centro.x + 10, 24, centro.z + 22);

const controlos = new OrbitControls(camara, renderer.domElement);
controlos.target.copy(centro);
controlos.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
controlos.maxPolarAngle = Math.PI * 0.45;
controlos.minDistance = 6;
controlos.maxDistance = 70;
controlos.update();

cena.add(new THREE.HemisphereLight(0xdde6ff, 0x404050, 1.6));
const sol = new THREE.DirectionalLight(0xffffff, 1.4);
sol.position.set(10, 25, 8);
cena.add(sol);

// Chão: uma instância por célula, para se poder colorir cada uma.
const geoCelula = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2);
const chao = new THREE.InstancedMesh(
  geoCelula,
  new THREE.MeshLambertMaterial({ color: 0xffffff }),
  s.largura * s.altura,
);
{
  const m = new THREE.Matrix4();
  for (let z = 0; z < s.altura; z++)
    for (let x = 0; x < s.largura; x++) {
      m.makeTranslation(x, 0, z);
      chao.setMatrixAt(z * s.largura + x, m);
      chao.setColorAt(z * s.largura + x, new THREE.Color(0x8a8f9e));
    }
}
cena.add(chao);

const COR_ABERTO = new THREE.Color(0x8a8f9e);
let totalSalas = 0;

/** Pinta o chão: cada sala fechada tem a sua cor, o espaço aberto fica cinzento. */
function pintarChao(): void {
  const salas = detetarSalas(s);
  totalSalas = salas.total;
  const cor = new THREE.Color();
  salas.sala.forEach((n, i) => {
    if (n < 0) cor.copy(COR_ABERTO);
    else cor.setHSL((0.08 + n * 0.17) % 1, 0.3, 0.6);
    chao.setColorAt(i, cor);
  });
  chao.instanceColor!.needsUpdate = true;
}

// Marca da entrada
const entrada = new THREE.Mesh(
  new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x5bd67a }),
);
entrada.position.set(s.entrada.x, 0.01, s.entrada.z);
cena.add(entrada);

// Cursores: célula, vértice (início de parede) e aresta (porta / demolir)
const cursor = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }),
);
cursor.position.y = 0.02;
cena.add(cursor);
const cursorVertice = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10),
  new THREE.MeshBasicMaterial({ color: 0xffe066 }),
);
cursorVertice.position.y = 0.3;
cena.add(cursorVertice);
const cursorAresta = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.08, 0.16),
  new THREE.MeshBasicMaterial({ color: 0xffe066 }),
);
cena.add(cursorAresta);
cursor.visible = cursorVertice.visible = cursorAresta.visible = false;

// ---------------------------------------------------------------------------
// Objetos construídos (reconstruídos quando versaoMapa muda)
// ---------------------------------------------------------------------------

const grupoMapa = new THREE.Group();
cena.add(grupoMapa);
const matTampo = new THREE.MeshLambertMaterial({ color: 0xb98b5e });
const matMonitor = new THREE.MeshLambertMaterial({ color: 0x22252e });
const matCadeira = new THREE.MeshLambertMaterial({ color: 0x3a5bd6 });
const geoTampo = new THREE.BoxGeometry(0.9, 0.06, 0.55);
const geoPerna = new THREE.BoxGeometry(0.06, 0.45, 0.06);
const geoMonitor = new THREE.BoxGeometry(0.4, 0.26, 0.04);
const geoCadeira = new THREE.BoxGeometry(0.35, 0.3, 0.35);

function criarSecretaria(): THREE.Group {
  const g = new THREE.Group();
  const tampo = new THREE.Mesh(geoTampo, matTampo);
  tampo.position.set(0, 0.48, -0.15);
  g.add(tampo);
  for (const [px, pz] of [[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.08], [0.4, 0.08]]) {
    const p = new THREE.Mesh(geoPerna, matTampo);
    p.position.set(px, 0.225, pz);
    g.add(p);
  }
  const mon = new THREE.Mesh(geoMonitor, matMonitor);
  mon.position.set(0, 0.66, -0.32);
  g.add(mon);
  const cad = new THREE.Mesh(geoCadeira, matCadeira);
  cad.position.set(0, 0.15, 0.25);
  g.add(cad);
  return g;
}

// Paredes e portas
const ALTURA_PAREDE = 1.1;
const ESPESSURA = 0.1;
const geoParede = new THREE.BoxGeometry(1 + ESPESSURA, ALTURA_PAREDE, ESPESSURA);
const geoOmbreira = new THREE.BoxGeometry(0.1, ALTURA_PAREDE, ESPESSURA + 0.04);
const geoVerga = new THREE.BoxGeometry(1, 0.16, ESPESSURA);
const geoFolha = new THREE.BoxGeometry(0.8, ALTURA_PAREDE - 0.2, 0.04);
const matParede = new THREE.MeshLambertMaterial({ color: 0xe9e4da });
const matOmbreira = new THREE.MeshLambertMaterial({ color: 0x6b4a2e });
const matFolha = new THREE.MeshLambertMaterial({ color: 0xa8774a, transparent: true, opacity: 0.55 });
const matFantasma = new THREE.MeshBasicMaterial({ color: 0x6fd68b, transparent: true, opacity: 0.45 });
const matFantasmaMau = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.45 });

/** Coloca um objeto no centro de uma aresta, alinhado com ela. */
function colocarNaAresta(o: THREE.Object3D, a: Aresta, y = 0): void {
  if (a.tipo === 'v') {
    o.position.set(a.x - 0.5, y, a.z);
    o.rotation.y = Math.PI / 2;
  } else {
    o.position.set(a.x, y, a.z - 0.5);
    o.rotation.y = 0;
  }
}

function criarPorta(): THREE.Group {
  const g = new THREE.Group();
  for (const lado of [-0.45, 0.45]) {
    const o = new THREE.Mesh(geoOmbreira, matOmbreira);
    o.position.set(lado, ALTURA_PAREDE / 2, 0);
    g.add(o);
  }
  const verga = new THREE.Mesh(geoVerga, matParede);
  verga.position.y = ALTURA_PAREDE - 0.08;
  g.add(verga);
  const folha = new THREE.Mesh(geoFolha, matFolha);
  folha.position.y = (ALTURA_PAREDE - 0.2) / 2;
  g.add(folha);
  return g;
}

function todasAsArestas(): Aresta[] {
  const r: Aresta[] = [];
  for (let z = 0; z < s.altura; z++) for (let x = 0; x <= s.largura; x++) r.push({ tipo: 'v', x, z });
  for (let z = 0; z <= s.altura; z++) for (let x = 0; x < s.largura; x++) r.push({ tipo: 'h', x, z });
  return r;
}
const ARESTAS = todasAsArestas();

let versaoDesenhada = -1;
function sincronizarMapa(): void {
  if (versaoDesenhada === s.versaoMapa) return;
  versaoDesenhada = s.versaoMapa;
  grupoMapa.clear();
  for (const d of s.secretarias) {
    const g = criarSecretaria();
    g.position.set(d.x, 0, d.z);
    grupoMapa.add(g);
  }
  for (const a of ARESTAS) {
    const v = lerAresta(s, a);
    if (v === NADA) continue;
    if (v === PORTA) {
      const p = criarPorta();
      colocarNaAresta(p, a);
      grupoMapa.add(p);
    } else {
      const m = new THREE.Mesh(geoParede, matParede);
      colocarNaAresta(m, a, ALTURA_PAREDE / 2);
      grupoMapa.add(m);
    }
  }
  pintarChao();
}

// Pré-visualização de paredes enquanto se arrasta
const fantasma = new THREE.Group();
cena.add(fantasma);
function mostrarFantasma(arestas: Aresta[], demolir: boolean): void {
  fantasma.clear();
  const custo = arestas.filter((a) => lerAresta(s, a) === NADA).length * ECON.custoParede;
  const mat = demolir || custo > s.dinheiro ? matFantasmaMau : matFantasma;
  for (const a of arestas) {
    const m = new THREE.Mesh(geoParede, mat);
    colocarNaAresta(m, a, ALTURA_PAREDE / 2);
    m.scale.y = demolir ? 1.05 : 1;
    fantasma.add(m);
  }
  textoArrasto = demolir
    ? `Demolir ${arestas.filter((a) => lerAresta(s, a) !== NADA).length} segmento(s)`
    : `${arestas.length} segmento(s) — ${euros(custo)}`;
}
let textoArrasto = '';

// ---------------------------------------------------------------------------
// Funcionários
// ---------------------------------------------------------------------------

const geoCorpo = new THREE.CylinderGeometry(0.16, 0.2, 0.55, 12);
const geoCabeca = new THREE.SphereGeometry(0.14, 16, 12);
const matPele = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
const bonecos = new Map<number, THREE.Group>();

function criarBoneco(f: Funcionario): THREE.Group {
  const g = new THREE.Group();
  const cor = new THREE.Color().setHSL((f.id * 0.137) % 1, 0.55, 0.5);
  const corpo = new THREE.Mesh(geoCorpo, new THREE.MeshLambertMaterial({ color: cor }));
  corpo.position.y = 0.3;
  g.add(corpo);
  const cabeca = new THREE.Mesh(geoCabeca, matPele);
  cabeca.position.y = 0.7;
  g.add(cabeca);
  cena.add(g);
  return g;
}

function sincronizarFuncionarios(): void {
  const vivos = new Set<number>();
  for (const f of s.funcionarios) {
    vivos.add(f.id);
    let g = bonecos.get(f.id);
    if (!g) {
      g = criarBoneco(f);
      bonecos.set(f.id, g);
    }
    g.visible = f.dentro;
    // A trabalhar: senta-se na cadeira (ligeiramente à frente da secretária).
    const sentado = f.estado === 'aTrabalhar';
    g.position.set(f.x, sentado ? 0.05 : 0, f.z + (sentado ? 0.25 : 0));
  }
  for (const [id, g] of bonecos)
    if (!vivos.has(id)) {
      cena.remove(g);
      bonecos.delete(id);
    }
}

// ---------------------------------------------------------------------------
// Ferramentas e rato
// ---------------------------------------------------------------------------

type Ferramenta = 'selecionar' | 'parede' | 'porta' | 'secretaria' | 'demolir';
const FERRAMENTAS: { id: Ferramenta; nome: string; tecla: string; dica: string }[] = [
  { id: 'selecionar', nome: 'Selecionar', tecla: '1', dica: 'Botão direito roda a câmara, botão do meio arrasta, roda faz zoom.' },
  { id: 'parede', nome: `Parede (${euros(ECON.custoParede)})`, tecla: '2', dica: 'Arrasta entre cantos da grelha para desenhar uma parede reta. Fecha uma zona para criar uma sala.' },
  { id: 'porta', nome: `Porta (${euros(ECON.custoPorta)})`, tecla: '3', dica: 'Clica numa parede para lhe abrir uma porta. Sem porta, ninguém entra na sala.' },
  { id: 'secretaria', nome: `Secretária (${euros(ECON.custoSecretaria)})`, tecla: '4', dica: 'Clica numa célula para colocar uma secretária.' },
  { id: 'demolir', nome: 'Demolir', tecla: '5', dica: 'Clica numa parede, porta ou secretária para a remover, ou arrasta para demolir uma parede inteira. Sem reembolso.' },
];
let ferramenta: Ferramenta = 'selecionar';

const raio = new THREE.Raycaster();
const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rato = new THREE.Vector2();

function pontoNoChao(ev: MouseEvent): THREE.Vector3 | null {
  rato.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  raio.setFromCamera(rato, camara);
  const p = new THREE.Vector3();
  return raio.ray.intersectPlane(planoChao, p) ? p : null;
}

const limitar = (v: number, max: number) => Math.max(0, Math.min(max, v));
/** Vértice da grelha mais próximo (cantos das células, de 0 a largura/altura). */
function verticeDe(p: THREE.Vector3): { x: number; z: number } {
  return { x: limitar(Math.round(p.x + 0.5), s.largura), z: limitar(Math.round(p.z + 0.5), s.altura) };
}
/** Aresta debaixo do rato, se estiver perto o suficiente de uma linha da grelha. */
function arestaDe(p: THREE.Vector3): Aresta | null {
  const { aresta, distancia } = arestaMaisProxima(p.x + 0.5, p.z + 0.5);
  return distancia < 0.25 && lerAresta(s, aresta) !== NADA ? aresta : null;
}

let arrasto: { x: number; z: number } | null = null;
function segmentoArrasto(p: THREE.Vector3): Aresta[] {
  const v = verticeDe(p);
  return arrasto ? segmento(arrasto.x, arrasto.z, v.x, v.z) : [];
}

function atualizarCursores(p: THREE.Vector3 | null): void {
  cursor.visible = cursorVertice.visible = cursorAresta.visible = false;
  if (!p) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  const naGrelha = x >= 0 && z >= 0 && x < s.largura && z < s.altura;
  if (ferramenta === 'parede' || (ferramenta === 'demolir' && arrasto)) {
    const v = verticeDe(p);
    cursorVertice.visible = true;
    cursorVertice.position.set(v.x - 0.5, 0.3, v.z - 0.5);
    if (arrasto) mostrarFantasma(segmentoArrasto(p), ferramenta === 'demolir');
    return;
  }
  if (ferramenta === 'porta' || ferramenta === 'demolir') {
    const a = arestaDe(p);
    if (a) {
      cursorAresta.visible = true;
      colocarNaAresta(cursorAresta, a, ALTURA_PAREDE + 0.05);
      return;
    }
  }
  if ((ferramenta === 'secretaria' || (ferramenta === 'demolir' && secretariaEm(s, x, z))) && naGrelha) {
    cursor.visible = true;
    cursor.position.set(x, 0.02, z);
  }
}

renderer.domElement.addEventListener('pointermove', (ev) => atualizarCursores(pontoNoChao(ev)));

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  const p = pontoNoChao(ev);
  if (!p) return;
  const x = Math.round(p.x);
  const z = Math.round(p.z);
  let r: Resultado = { ok: true };
  if (ferramenta === 'parede' || ferramenta === 'demolir') {
    arrasto = verticeDe(p);
    renderer.domElement.setPointerCapture(ev.pointerId);
    if (ferramenta === 'parede') mostrarFantasma([], false);
  } else if (ferramenta === 'secretaria') r = colocarSecretaria(s, x, z);
  else if (ferramenta === 'porta') {
    const a = arestaDe(p);
    r = a ? colocarPorta(s, a) : { ok: false, msg: 'As portas têm de ser colocadas numa parede.' };
  }
  if (!r.ok && r.msg) aviso(r.msg);
  atualizarCursores(p);
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (ev.button !== 0 || !arrasto) return;
  const p = pontoNoChao(ev);
  const inicio = arrasto;
  const arestas = p ? segmentoArrasto(p) : [];
  arrasto = null;
  fantasma.clear();
  textoArrasto = '';
  if (!p) return;
  let r: Resultado = { ok: true };
  if (ferramenta === 'parede') {
    if (arestas.length) r = colocarParedes(s, arestas);
  } else if (arestas.length) {
    r = demolirArestas(s, arestas);
  } else {
    // Clique simples com Demolir: aresta perto do rato, senão a secretária da célula
    const v = verticeDe(p);
    if (v.x === inicio.x && v.z === inicio.z) {
      const a = arestaDe(p);
      r = a ? demolirArestas(s, [a]) : removerSecretaria(s, Math.round(p.x), Math.round(p.z));
    }
  }
  if (!r.ok && r.msg) aviso(r.msg);
  atualizarCursores(p);
});

addEventListener('keydown', (ev) => {
  if ((ev.target as HTMLElement).tagName === 'INPUT') return;
  const f = FERRAMENTAS.find((o) => o.tecla === ev.key);
  if (f) {
    ferramenta = f.id;
    atualizarCursores(null);
  }
  if (ev.key === 'Escape') {
    arrasto = null;
    fantasma.clear();
    textoArrasto = '';
    ferramenta = 'selecionar';
  }
  if (ev.key === ' ') velocidade = velocidade === 0 ? 1 : 0;
});

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const e = t.content.firstElementChild as HTMLElement;
  document.body.appendChild(e);
  return e;
}

const topo = el(`<div id="topo" class="ui painel">
  <strong>Software Lda.</strong>
  <span class="dinheiro"></span>
  <span class="data"></span>
  <span class="salas sub"></span>
  <span>
    <button data-vel="0">⏸</button>
    <button data-vel="1">▶</button>
    <button data-vel="2">▶▶</button>
    <button data-vel="3">▶▶▶</button>
  </span>
</div>`);
const ferramentas = el(`<div id="ferramentas" class="ui painel">${FERRAMENTAS.map(
  (f) => `<button data-ferr="${f.id}" title="Tecla ${f.tecla}">${f.nome}</button>`,
).join('')}</div>`);
const dica = el(`<div id="dica" class="ui painel"></div>`);
const lateral = el(`<div id="lateral" class="ui">
  <div class="painel" id="p-projeto"></div>
  <div class="painel" id="p-equipa"></div>
  <div class="painel" id="p-candidatos"></div>
  <div class="painel" id="p-produtos"></div>
</div>`);
const caixaMensagens = el(`<div id="mensagens" class="ui painel"></div>`);
const fim = el(`<div id="fim" class="ui"><div class="painel">Falência! A Software Lda. fechou portas.</div></div>`);

const VELOCIDADES = [0, 24, 72, 200]; // minutos de jogo por segundo real
let velocidade = 1;

topo.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (b?.dataset.vel) velocidade = Number(b.dataset.vel);
});
ferramentas.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (b?.dataset.ferr) {
    ferramenta = b.dataset.ferr as Ferramenta;
    atualizarCursores(null);
  }
});
lateral.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  const a = b.dataset.acao;
  let r = { ok: true } as { ok: boolean; msg?: string };
  if (a === 'contratar') r = contratar(s, Number(b.dataset.i));
  else if (a === 'despedir') r = despedir(s, Number(b.dataset.id));
  else if (a === 'projeto') {
    const input = document.getElementById('nome-projeto') as HTMLInputElement | null;
    r = iniciarProjeto(s, input?.value ?? '');
  }
  if (!r.ok && r.msg) aviso(r.msg);
});

function aviso(texto: string): void {
  s.mensagens.push({ minuto: s.minuto, texto: `⚠ ${texto}` });
}

/** Só substitui o HTML quando muda, para não perder o foco nem o hover. */
function definir(e: HTMLElement, html: string): void {
  if (e.dataset.html !== html) {
    e.dataset.html = html;
    e.innerHTML = html;
  }
}

function atualizarUI(): void {
  const din = topo.querySelector('.dinheiro') as HTMLElement;
  din.textContent = euros(s.dinheiro);
  din.classList.toggle('negativo', s.dinheiro < 0);
  (topo.querySelector('.data') as HTMLElement).textContent = textoData(s.minuto);
  topo.querySelectorAll<HTMLButtonElement>('[data-vel]').forEach((b) =>
    b.classList.toggle('ativo', Number(b.dataset.vel) === velocidade));
  ferramentas.querySelectorAll<HTMLButtonElement>('[data-ferr]').forEach((b) =>
    b.classList.toggle('ativo', b.dataset.ferr === ferramenta));
  definir(dica, textoArrasto || FERRAMENTAS.find((f) => f.id === ferramenta)!.dica);
  (topo.querySelector('.salas') as HTMLElement).textContent = totalSalas === 1 ? '1 sala' : `${totalSalas} salas`;

  const pProjeto = document.getElementById('p-projeto')!;
  if (s.projeto) {
    const pct = Math.min(100, (s.projeto.trabalhoFeito / s.projeto.trabalhoTotal) * 100);
    definir(pProjeto, `<h3>Projeto: ${s.projeto.nome}</h3>
      <div class="barra"><div style="width:${pct.toFixed(1)}%"></div></div>
      <div class="sub">${pct.toFixed(0)}% concluído</div>`);
  } else {
    definir(pProjeto, `<h3>Novo projeto</h3>
      <div class="linha"><input type="text" id="nome-projeto" placeholder="Nome do utilitário" maxlength="30"></div>
      <div class="linha"><button data-acao="projeto">Começar desenvolvimento</button></div>`);
  }

  const salarios = s.funcionarios.reduce((t, f) => t + f.salario, 0);
  definir(document.getElementById('p-equipa')!, `<h3>Equipa (${s.funcionarios.length}) — ${euros(salarios)}/mês</h3>
    ${s.funcionarios.length === 0 ? '<div class="sub">Ainda não tens funcionários.</div>' : ''}
    ${s.funcionarios.map((f) => `<div class="linha">
      <div>${f.nome}<div class="sub ${['semSecretaria', 'semAcesso', 'preso'].includes(f.estado) ? 'aviso' : ''}">
        ${NOME_ESTADO[f.estado]} · comp. ${Math.round(f.competencia * 100)} · 😊 ${Math.round(f.felicidade)}</div></div>
      <button data-acao="despedir" data-id="${f.id}">Despedir</button></div>`).join('')}`);

  definir(document.getElementById('p-candidatos')!, `<h3>Candidatos</h3>
    ${s.candidatos.length === 0 ? '<div class="sub">Novos candidatos no próximo mês.</div>' : ''}
    ${s.candidatos.map((c, i) => `<div class="linha">
      <div>${c.nome}<div class="sub">comp. ${Math.round(c.competencia * 100)} · ${euros(c.salario)}/mês</div></div>
      <button data-acao="contratar" data-i="${i}">Contratar</button></div>`).join('')}`);

  const mercado = Math.round(fatorMercado(s) * 100);
  definir(document.getElementById('p-produtos')!, `<h3>Produtos</h3>
    <div class="sub ${mercado < 70 ? 'aviso' : ''}" title="Um utilitário novo vende esta percentagem do normal. Os produtos ainda à venda ocupam o mercado.">
      Mercado de utilitários: um produto novo venderia ${mercado}% do normal</div>
    ${s.produtos.length === 0 ? '<div class="sub">Nenhum produto lançado.</div>' : ''}
    ${s.produtos.slice(-8).reverse().map((p) => `<div class="linha">
      <div>${p.nome}<div class="sub">qualidade ${Math.round(p.qualidade * 100)}% · total ${euros(p.receitaTotal)}</div></div>
      <span>${euros(p.vendasMes)}/mês</span></div>`).join('')}`);

  definir(caixaMensagens, s.mensagens.slice(-12).reverse().map(
    (m) => `<div><span class="hora">${textoData(m.minuto).split(' — ')[0]}</span>${m.texto}</div>`,
  ).join(''));

  fim.style.display = s.falencia ? 'flex' : 'none';
}

// ---------------------------------------------------------------------------
// Ciclo
// ---------------------------------------------------------------------------

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let ultimo = performance.now();
let acumulado = 0;
let ultimaUI = 0;
function ciclo(agora: number): void {
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  // Fora do horário e sem ninguém no escritório, o tempo corre mais depressa.
  const vazio = s.funcionarios.every((f) => !f.dentro);
  const md = minutoDoDia(s);
  const noite = vazio && (md < 7 * 60 || md > 18 * 60);
  acumulado += dt * VELOCIDADES[velocidade] * (noite ? 8 : 1);
  const minutos = Math.floor(acumulado);
  acumulado -= minutos;
  if (minutos > 0) avancar(s, minutos);

  sincronizarMapa();
  sincronizarFuncionarios();
  if (agora - ultimaUI > 150) {
    atualizarUI();
    ultimaUI = agora;
  }
  controlos.update();
  renderer.render(cena, camara);
  requestAnimationFrame(ciclo);
}
requestAnimationFrame(ciclo);

// Só em desenvolvimento: acesso ao estado e projeção de vértices da grelha para o ecrã (testes manuais).
if (import.meta.env.DEV) {
  Object.assign(window, {
    __jogo: s,
    __ecra: (vx: number, vz: number) => {
      const v = new THREE.Vector3(vx - 0.5, 0, vz - 0.5).project(camara);
      return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)];
    },
  });
}
