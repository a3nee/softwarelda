// Interface da progressão: painel de missões (sempre à vista) e janela das melhorias. Só DOM.
import {
  descricaoMissao, euros, LISTA_MELHORIAS, MELHORIAS, nivelDaEmpresa, pontosMelhoria, progressoMissao,
  progressoNivel, temMelhoria, TEXTO_MISSAO, type Estado, type Missao,
} from './sim.ts';

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

function textoProgresso(m: Missao, atual: number): string {
  if (m.tipo === 'faturar' || m.tipo === 'caixa') return `${euros(Math.min(atual, m.alvo))} / ${euros(m.alvo)}`;
  if (m.tipo === 'qualidade') return `${atual}% / ${m.alvo}%`;
  return `${Math.min(atual, m.alvo)} / ${m.alvo}`;
}

export class PainelMissoes {
  readonly raiz: HTMLElement;
  private assinatura = '';
  private readonly conhecidas = new Set<number>();
  private recolhido = false;

  constructor() {
    this.raiz = el(`<div id="missoes" class="ui vidro hud">
      <div class="cab"><b>🎯 Missões</b><small class="feitas"></small><button class="recolher" title="Recolher">–</button></div>
      <div class="lista"></div>
    </div>`);
    this.raiz.querySelector('.recolher')!.addEventListener('click', () => {
      this.recolhido = !this.recolhido;
      this.raiz.classList.toggle('recolhido', this.recolhido);
      this.raiz.querySelector('.recolher')!.textContent = this.recolhido ? '+' : '–';
    });
  }

  atualizar(s: Estado, visivel: boolean): void {
    this.raiz.style.display = visivel && s.comMissoes ? '' : 'none';
    if (!visivel || !s.comMissoes) return;
    const linhas = s.missoes.map((m) => ({ m, p: progressoMissao(s, m) }));
    const assinatura = JSON.stringify([s.missoesFeitas, linhas.map(({ m, p }) => [m.id, p.atual])]);
    if (assinatura === this.assinatura) return;
    this.assinatura = assinatura;
    (this.raiz.querySelector('.feitas') as HTMLElement).textContent =
      s.missoesFeitas ? `${s.missoesFeitas} cumprida${s.missoesFeitas === 1 ? '' : 's'}` : '';
    const lista = this.raiz.querySelector('.lista') as HTMLElement;
    lista.innerHTML = linhas.length ? linhas.map(({ m, p }) => {
      const pct = Math.min(100, (p.atual / Math.max(1, p.alvo)) * 100);
      return `<div class="missao${this.conhecidas.has(m.id) ? '' : ' nova'}${pct >= 75 ? ' quase' : ''}">
        <span class="ic">${TEXTO_MISSAO[m.tipo].icone}</span>
        <div class="corpo">
          <span class="txt">${descricaoMissao(m)}</span>
          <div class="barra"><i style="width:${pct.toFixed(1)}%"></i></div>
          <small>${textoProgresso(m, p.atual)}</small>
        </div>
        <span class="premio">${m.dinheiro ? `<b>${euros(m.dinheiro)}</b>` : ''}<span>+${m.xp} XP</span></span>
      </div>`;
    }).join('') : '<div class="vazio">Sem missões por agora.</div>';
    for (const { m } of linhas) this.conhecidas.add(m.id);
  }
}

/** Conteúdo da janela das melhorias (o main.ts trata dos cliques em data-melhoria e data-fechar). */
export function htmlMelhorias(s: Estado): string {
  const n = nivelDaEmpresa(s);
  const pr = progressoNivel(s);
  const pontos = pontosMelhoria(s);
  const pct = pr.precisa ? (pr.feito / pr.precisa) * 100 : 100;
  return `<div class="janela larga melhorias">
    <div class="cab-nivel">
      <div class="medalha"><b>${n}</b><small>nível</small></div>
      <div class="info">
        <h2>Melhorias da empresa</h2>
        <div class="xp-barra"><i style="width:${pct.toFixed(1)}%"></i></div>
        <small>${pr.precisa ? `${pr.feito} / ${pr.precisa} XP para o nível ${n + 1}` : 'Nível máximo!'}</small>
      </div>
      <div class="pontos ${pontos ? 'tem' : ''}"><b>${pontos}</b><small>ponto${pontos === 1 ? '' : 's'}</small></div>
    </div>
    <p class="nota">Ganhas experiência ao lançar produtos (mais com qualidade alta), ao cumprir missões e conquistas e
      ao fechar meses seguidos com lucro 🔥. Cada nível dá um ponto.</p>
    <div class="grelha-melhorias">${LISTA_MELHORIAS.map((id) => {
      const d = MELHORIAS[id];
      const tem = temMelhoria(s, id);
      const bloqueada = n < d.nivel;
      const pode = !tem && !bloqueada && pontos > 0;
      const estado = tem ? '✓ Ativa' : bloqueada ? `🔒 Nível ${d.nivel}` : pode ? 'Desbloquear · 1 ponto' : 'Sem pontos';
      return `<button class="melhoria ${tem ? 'tem' : bloqueada ? 'bloq' : pode ? 'pode' : ''}" data-melhoria="${id}"${pode ? '' : ' disabled'}>
        <span class="ic">${d.icone}</span><b>${d.nome}</b><small>${d.descricao}</small><span class="estado">${estado}</span>
      </button>`;
    }).join('')}</div>
    <div class="linha-botoes"><button class="primario" data-fechar>Fechar</button></div>
  </div>`;
}
