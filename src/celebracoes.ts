// Momentos de festa da interface: janela de lançamento com as críticas a virar uma a uma, explosão ao subir
// de nível e números que sobem no ecrã. Só DOM; a lógica fica em sim.ts.
import { CRITICOS, euros, MELHORIAS, TIPOS, veredicto, type IdMelhoria, type Produto } from './sim.ts';
import { som } from './som.ts';

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface InfoLancamento {
  produto: Produto;
  xp: number;
  icone: string;
}

const classeNota = (n: number) => (n >= 8 ? 'boa' : n >= 6 ? 'media' : 'ma');
const estrelas = (media: number) => {
  const n = Math.round(media / 2);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};

export class Celebracoes {
  private readonly fila: InfoLancamento[] = [];
  private janela: HTMLElement | null = null;
  private readonly aoAbrir: () => void;
  private readonly aoFechar: () => void;
  private readonly tecla = (ev: KeyboardEvent) => {
    if (!this.janela) return;
    ev.stopPropagation();
    if (['Enter', ' ', 'Escape'].includes(ev.key)) {
      ev.preventDefault();
      this.fechar();
    }
  };

  /** aoAbrir/aoFechar: o jogo para enquanto a janela está aberta. */
  constructor(aoAbrir: () => void, aoFechar: () => void) {
    this.aoAbrir = aoAbrir;
    this.aoFechar = aoFechar;
    addEventListener('keydown', this.tecla, true);
  }

  get aberta(): boolean {
    return this.janela !== null;
  }

  lancamento(info: InfoLancamento): void {
    this.fila.push(info);
    if (!this.janela) {
      this.aoAbrir();
      this.mostrar(this.fila.shift()!);
    }
  }

  private mostrar({ produto: p, xp, icone }: InfoLancamento): void {
    const notas = p.criticas ?? [];
    const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : p.qualidade * 10;
    const j = el(`<div class="modal celebracao">
      <div class="janela lancamento">
        <div class="raios"></div>
        <div class="cab">
          <span class="ic-grande">${icone}</span>
          <div><small>Lançamento · ${TIPOS[p.tipo].nome}</small><h2>${esc(p.nome)}</h2></div>
        </div>
        <div class="criticas">${notas.map((n, i) => `
          <div class="critica" data-i="${i}">
            <div class="carta"><div class="tras">?</div><div class="frente ${classeNota(n)}"><b>${n}</b><small>/10</small></div></div>
            <span class="revista">${CRITICOS[i]}</span>
          </div>`).join('')}</div>
        <div class="resultado">
          <div class="media"><b class="valor">0,0</b><span class="estrelas">${estrelas(media)}</span></div>
          <div class="veredicto ${classeNota(media)}">${veredicto(media)}</div>
          <div class="info">
            <span>💎 Qualidade <b>${Math.round(p.qualidade * 100)}%</b></span>
            <span>💶 1.º mês <b>${euros(p.vendasMes)}</b></span>
            <span class="xp">⭐ <b>+${xp} XP</b></span>
          </div>
        </div>
        <div class="linha-botoes"><button class="primario" data-continuar>Continuar</button></div>
      </div>
    </div>`);
    j.querySelector('[data-continuar]')!.addEventListener('click', () => this.fechar());
    document.body.append(j);
    this.janela = j;
    som.lancamento();

    const cartas = j.querySelectorAll<HTMLElement>('.critica');
    cartas.forEach((c, i) => setTimeout(() => {
      if (this.janela !== j) return;
      c.classList.add('virada');
      som.critica(notas[i]);
    }, 700 + i * 600));
    setTimeout(() => {
      if (this.janela !== j) return;
      j.querySelector('.resultado')!.classList.add('mostrar');
      const valor = j.querySelector('.media .valor')!;
      const t0 = performance.now();
      const contar = (agora: number) => {
        if (this.janela !== j) return;
        const t = Math.min(1, (agora - t0) / 700);
        valor.textContent = (media * (1 - (1 - t) ** 3)).toFixed(1).replace('.', ',');
        if (t < 1) requestAnimationFrame(contar);
      };
      requestAnimationFrame(contar);
      if (media >= 7.5) som.conquista();
      else if (media < 5) som.aviso();
    }, 700 + cartas.length * 600 + 150);
  }

  private fechar(): void {
    if (!this.janela) return;
    som.clique();
    const j = this.janela;
    j.classList.add('sair');
    setTimeout(() => j.remove(), 220);
    const seguinte = this.fila.shift();
    if (seguinte) this.mostrar(seguinte);
    else {
      this.janela = null;
      this.aoFechar();
    }
  }

  /** Explosão de nível: não pára o jogo e desaparece sozinha. */
  nivel(n: number, novas: IdMelhoria[]): void {
    // Vários níveis de seguida juntam-se numa só explosão (com os pontos e as melhorias somados).
    const anterior = this.ultimoNivel;
    let pontos = 1;
    const juntar = !!anterior && anterior.e.isConnected && !anterior.e.classList.contains('sair');
    if (anterior && juntar) {
      pontos += anterior.pontos;
      novas = [...anterior.novas, ...novas];
      anterior.e.remove();
    }
    const e = el(`<div class="subida-nivel">
      <div class="raios"></div>
      <div class="conteudo">
        <small>A tua empresa subiu ao</small>
        <b>Nível ${n}</b>
        <span class="ponto">+${pontos} ponto${pontos > 1 ? 's' : ''} de melhoria · tecla <kbd>M</kbd></span>
        ${novas.length ? `<div class="novas">${novas.map((id) => `<span>${MELHORIAS[id].icone} ${MELHORIAS[id].nome}</span>`).join('')}</div>` : ''}
      </div>
    </div>`);
    document.body.append(e);
    this.ultimoNivel = { e, pontos, novas };
    if (!juntar) som.nivel();
    setTimeout(() => e.classList.add('sair'), 3000);
    setTimeout(() => e.remove(), 3600);
  }

  private ultimoNivel: { e: HTMLElement; pontos: number; novas: IdMelhoria[] } | null = null;
}

/** Texto que sobe e desaparece a partir de um ponto do ecrã. */
export function numeroFlutuante(texto: string, classe: string, x: number, y: number): void {
  const e = document.createElement('div');
  e.className = `num-flut ${classe}`;
  e.textContent = texto;
  e.style.left = `${Math.round(x)}px`;
  e.style.top = `${Math.round(y)}px`;
  document.body.append(e);
  setTimeout(() => e.remove(), 2500);
}
