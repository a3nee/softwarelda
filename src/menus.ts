// Menus em ecrã inteiro: principal, nova empresa, pausa, definições, como jogar e conquistas.
import { CONQUISTAS, DIFICULDADES, DECORACAO, ECON, euros, OBJETOS, LISTA_OBJETOS, type Dificuldade, type OpcoesJogo } from './sim.ts';
import type { Definicoes, Qualidade } from './definicoes.ts';

export type Ecra = 'principal' | 'novo' | 'pausa' | 'definicoes' | 'ajuda' | 'conquistas';

export interface InfoSave {
  nome: string;
  data: string;
  dinheiro: string;
}

export interface AcoesMenu {
  infoSave(): InfoSave | null;
  continuar(): void;
  fundar(opcoes: OpcoesJogo): void;
  voltarAoJogo(): void;
  guardar(): void;
  carregar(): void;
  sairParaMenu(): void;
  conquistas(): string[]; // desbloqueadas no jogo atual (ou no último guardado)
  definicoes(): Definicoes;
  mudarDefinicoes(d: Definicoes): void;
  clique(): void;
}

const ICONE_DIF: Record<Dificuldade, string> = { facil: '🌱', normal: '⚖️', dificil: '🔥' };
export const ICONE_OBJETO = { planta: '🪴', sofa: '🛋️', cafe: '☕', matraquilhos: '⚽' } as const;

function esc(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export class Menus {
  readonly raiz: HTMLElement;
  ecra: Ecra | null = null;
  private origem: 'principal' | 'pausa' = 'principal';
  private dificuldade: Dificuldade = 'normal';
  private readonly acoes: AcoesMenu;

  constructor(acoes: AcoesMenu) {
    this.acoes = acoes;
    this.raiz = document.createElement('div');
    this.raiz.id = 'menu';
    document.body.appendChild(this.raiz);
    this.raiz.addEventListener('click', (ev) => this.clicar(ev));
    this.raiz.addEventListener('input', (ev) => this.mudar(ev));
    this.raiz.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.target as HTMLElement).id === 'm-nome') this.fundar();
    });
  }

  mostrar(e: Ecra | null): void {
    this.ecra = e;
    if (e === 'principal' || e === 'pausa') this.origem = e;
    document.body.classList.toggle('em-menu', e !== null);
    document.body.classList.toggle('menu-principal', e !== null && this.origem === 'principal');
    this.raiz.className = e ? `ativo ecra-${e}` : '';
    this.raiz.innerHTML = e ? this.html(e) : '';
    if (e === 'novo') (this.raiz.querySelector('#m-nome') as HTMLInputElement | null)?.focus();
  }

  /** Esc: dos sub-ecrãs volta ao menu de onde se veio; da pausa volta ao jogo. */
  voltar(): void {
    if (this.ecra === 'pausa') this.acoes.voltarAoJogo();
    else if (this.ecra && this.ecra !== 'principal') this.mostrar(this.origem);
  }

  private fundar(): void {
    const nome = (this.raiz.querySelector('#m-nome') as HTMLInputElement | null)?.value ?? '';
    const eventos = (this.raiz.querySelector('#m-eventos') as HTMLInputElement | null)?.checked ?? true;
    this.acoes.fundar({ nome, dificuldade: this.dificuldade, eventos });
  }

  private clicar(ev: MouseEvent): void {
    const b = (ev.target as HTMLElement).closest('button');
    if (!b) return;
    this.acoes.clique();
    const a = b.dataset.m;
    if (b.dataset.dif) {
      this.dificuldade = b.dataset.dif as Dificuldade;
      this.raiz.querySelectorAll('[data-dif]').forEach((o) => o.classList.toggle('ativo', o === b));
    } else if (b.dataset.qual) {
      this.acoes.mudarDefinicoes({ ...this.acoes.definicoes(), qualidade: b.dataset.qual as Qualidade });
      this.raiz.querySelectorAll('[data-qual]').forEach((o) => o.classList.toggle('ativo', o === b));
    } else if (a === 'continuar') this.acoes.continuar();
    else if (a === 'fundar') this.fundar();
    else if (a === 'jogo') this.acoes.voltarAoJogo();
    else if (a === 'guardar') this.acoes.guardar();
    else if (a === 'carregar') this.acoes.carregar();
    else if (a === 'sair') this.acoes.sairParaMenu();
    else if (a === 'voltar') this.voltar();
    else if (a === 'novo' || a === 'ajuda' || a === 'conquistas' || a === 'definicoes') this.mostrar(a);
  }

  private mudar(ev: Event): void {
    const i = ev.target as HTMLInputElement;
    const k = i.dataset.def as keyof Definicoes | undefined;
    if (!k) return;
    const d = { ...this.acoes.definicoes() };
    if (k === 'volume') d.volume = Number(i.value) / 100;
    else if (k !== 'qualidade') d[k] = i.checked;
    this.acoes.mudarDefinicoes(d);
  }

  // -------------------------------------------------------------------------

  private html(e: Ecra): string {
    if (e === 'principal') return this.principal();
    if (e === 'novo') return this.novo();
    if (e === 'pausa') return this.pausa();
    if (e === 'definicoes') return this.ecraDefinicoes();
    if (e === 'ajuda') return this.ajuda();
    return this.ecraConquistas();
  }

  private principal(): string {
    const save = this.acoes.infoSave();
    const n = this.acoes.conquistas().length;
    const botao = (m: string, ic: string, t: string, sub: string, primario = false) =>
      `<button data-m="${m}" class="opcao ${primario ? 'primario' : ''}"><span class="ic">${ic}</span><span class="txt"><b>${t}</b><small>${sub}</small></span></button>`;
    return `<div class="principal">
      <div class="titulo-jogo">
        <div class="logo-grande">SL</div>
        <h1>Software <span>Lda.</span></h1>
        <p>Do primeiro utilitário ao grande estúdio de jogos: constrói a maior empresa de software do país.</p>
      </div>
      <div class="opcoes">
        ${save ? botao('continuar', '▶', 'Continuar', `${esc(save.nome)} · ${save.data} · ${save.dinheiro}`, true) : ''}
        ${botao('novo', '✨', 'Novo jogo', 'Funda a tua empresa', !save)}
        ${botao('ajuda', '📖', 'Como jogar', 'Regras, dicas e atalhos')}
        ${botao('conquistas', '🏆', 'Conquistas', `${n} de ${CONQUISTAS.length} desbloqueadas`)}
        ${botao('definicoes', '⚙️', 'Definições', 'Gráficos, som e avisos')}
      </div>
      <div class="rodape">Software Lda. v0.3 · Three.js</div>
    </div>`;
  }

  private novo(): string {
    const difs = (Object.keys(DIFICULDADES) as Dificuldade[]).map((d) => `
      <button data-dif="${d}" class="dif ${d === this.dificuldade ? 'ativo' : ''}">
        <span class="ic">${ICONE_DIF[d]}</span><b>${DIFICULDADES[d].nome}</b><small>${DIFICULDADES[d].descricao}</small>
      </button>`).join('');
    return `<div class="janela">
      <h2>✨ Nova empresa</h2>
      <label class="campo"><span>Nome da empresa</span><input id="m-nome" type="text" maxlength="30" placeholder="Software Lda." autocomplete="off"></label>
      <div class="rotulo">Dificuldade</div>
      <div class="dificuldades">${difs}</div>
      <label class="interruptor"><input type="checkbox" id="m-eventos" checked><i></i>
        <span><b>Eventos aleatórios</b><small>Notícias, avarias, prémios e investidores no fecho do mês.</small></span></label>
      <div class="linha-botoes"><button data-m="voltar">Voltar</button><button data-m="fundar" class="primario">🚀 Fundar empresa</button></div>
    </div>`;
  }

  private pausa(): string {
    return `<div class="janela estreita">
      <h2>⏸ Pausa</h2>
      <div class="lista-botoes">
        <button data-m="jogo" class="primario">▶ Continuar</button>
        <button data-m="guardar">💾 Guardar jogo</button>
        <button data-m="carregar">📂 Carregar último jogo guardado</button>
        <button data-m="ajuda">📖 Como jogar</button>
        <button data-m="conquistas">🏆 Conquistas</button>
        <button data-m="definicoes">⚙️ Definições</button>
        <button data-m="sair" class="perigo">🚪 Sair para o menu principal</button>
      </div>
      <p class="nota">Ao sair, o jogo fica guardado automaticamente.</p>
    </div>`;
  }

  private ecraDefinicoes(): string {
    const d = this.acoes.definicoes();
    const int = (k: keyof Definicoes, t: string, sub: string) => `<label class="interruptor">
      <input type="checkbox" data-def="${k}" ${d[k] ? 'checked' : ''}><i></i><span><b>${t}</b><small>${sub}</small></span></label>`;
    const q = (v: Qualidade, t: string) => `<button data-qual="${v}" class="${d.qualidade === v ? 'ativo' : ''}">${t}</button>`;
    return `<div class="janela">
      <h2>⚙️ Definições</h2>
      <div class="grupo-def">
        <div class="rotulo">Gráficos</div>
        <div class="segmentos">${q('baixa', 'Baixa')}${q('media', 'Média')}${q('alta', 'Alta')}</div>
        ${int('sombras', 'Sombras', 'Sombras suaves do sol. Desliga se o jogo estiver lento.')}
        ${int('cicloDia', 'Ciclo dia/noite', 'O céu e as luzes mudam com as horas do jogo.')}
        ${int('indicadores', 'Indicadores de felicidade', 'O losango por cima de cada funcionário: verde, amarelo ou vermelho.')}
      </div>
      <div class="grupo-def">
        <div class="rotulo">Som e avisos</div>
        ${int('sons', 'Efeitos sonoros', 'Construção, vendas, lançamentos e conquistas.')}
        <label class="campo"><span>Volume</span><input type="range" min="0" max="100" value="${Math.round(d.volume * 100)}" data-def="volume"></label>
        ${int('avisos', 'Avisos flutuantes', 'Mostra lançamentos, conquistas e eventos no topo do ecrã.')}
      </div>
      <div class="linha-botoes"><button data-m="voltar" class="primario">Feito</button></div>
    </div>`;
  }

  private ajuda(): string {
    const cartao = (ic: string, t: string, texto: string) => `<div class="cartao-ajuda"><div class="ic">${ic}</div><div><h3>${t}</h3><p>${texto}</p></div></div>`;
    const objetos = LISTA_OBJETOS.map((o) => `${ICONE_OBJETO[o]} ${OBJETOS[o].nome} (+${OBJETOS[o].felicidade})`).join(', ');
    return `<div class="janela larga">
      <h2>📖 Como jogar</h2>
      <div class="grelha-ajuda">
        ${cartao('🏗️', 'Constrói', `Coloca <b>secretárias</b> (${euros(ECON.custoSecretaria)}): cada funcionário precisa de uma. Desenha <b>paredes</b> para fechar salas (o chão ganha cor) e abre-lhes <b>portas</b>, senão ninguém entra.`)}
        ${cartao('🤝', 'Contrata', 'Os candidatos mudam todos os meses. Cada pessoa sabe de <b>programação</b>, <b>design</b> e <b>testes</b>, com uma especialidade forte. A cor da camisola diz qual: <span class="c-prog">azul</span>, <span class="c-des">rosa</span> ou <span class="c-test">verde</span>.')}
        ${cartao('📁', 'Desenvolve', 'Escolhe o tipo de software, as funcionalidades e a equipa. Cada tipo pede áreas diferentes (um jogo precisa de muito design). Equipas grandes acabam mais depressa, mas cada pessoa rende menos.')}
        ${cartao('📦', 'Vende', 'Um produto lançado vende todos os meses, cada vez menos. Vários produtos do mesmo tipo saturam o mercado. Lançar produtos desbloqueia tipos novos: editor de texto, antivírus e jogo.')}
        ${cartao('😊', 'Felicidade', `O losango por cima da cabeça mostra a felicidade. Quem está feliz trabalha mais depressa. A decoração alegra quem trabalha na mesma sala: ${objetos}. Objetos repetidos valem menos; no máximo +${DECORACAO.bonusMaximo}.`)}
        ${cartao('💶', 'Dinheiro', `Salários e renda (${euros(ECON.rendaMensal)}) pagam-se no fecho do mês. Abaixo de ${euros(ECON.limiteFalencia)}, a empresa vai à falência. Há autosave no fecho de cada mês.`)}
      </div>
      <h3 class="titulo-atalhos">⌨️ Atalhos</h3>
      <div class="atalhos">
        <span><kbd>1</kbd>–<kbd>6</kbd> ferramentas</span><span><kbd>Espaço</kbd> pausa</span><span><kbd>Esc</kbd> menu / cancelar</span>
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover a câmara</span><span><kbd>Q</kbd><kbd>E</kbd> rodar</span>
        <span>Botão direito: rodar · meio: arrastar · roda: zoom</span><span><kbd>Ctrl</kbd>+<kbd>S</kbd> guardar</span>
      </div>
      <div class="linha-botoes"><button data-m="voltar" class="primario">Percebi!</button></div>
    </div>`;
  }

  private ecraConquistas(): string {
    const tem = new Set(this.acoes.conquistas());
    return `<div class="janela larga">
      <h2>🏆 Conquistas <small>${tem.size} de ${CONQUISTAS.length}</small></h2>
      <div class="grelha-conquistas">${CONQUISTAS.map((c) => `
        <div class="conquista ${tem.has(c.id) ? 'feita' : ''}"><div class="ic">${tem.has(c.id) ? c.icone : '🔒'}</div>
          <div><b>${c.nome}</b><small>${c.descricao}</small></div></div>`).join('')}
      </div>
      <div class="linha-botoes"><button data-m="voltar" class="primario">Voltar</button></div>
    </div>`;
  }
}
