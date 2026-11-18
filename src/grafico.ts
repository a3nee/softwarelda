// Gráfico das estatísticas (canvas 2D): receitas e despesas por mês em barras, caixa em linha.
import type { RegistoMes } from './sim.ts';

const COR = { receitas: '#34d399', despesas: '#f472b6', caixa: '#22d3ee', grelha: 'rgba(255,255,255,0.08)', texto: '#9aa3c7' };

function compacto(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1).replace('.', ',')}M`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)}k`;
  return `${s}${Math.round(a)}`;
}

export function desenharGrafico(canvas: HTMLCanvasElement, historico: RegistoMes[], meses = 24): void {
  const r = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0) return;
  if (canvas.width !== Math.round(w * r)) canvas.width = Math.round(w * r);
  if (canvas.height !== Math.round(h * r)) canvas.height = Math.round(h * r);
  const c = canvas.getContext('2d')!;
  c.setTransform(r, 0, 0, r, 0, 0);
  c.clearRect(0, 0, w, h);
  c.font = '10px system-ui, sans-serif';

  const dados = historico.slice(-meses);
  if (dados.length === 0) {
    c.fillStyle = COR.texto;
    c.textAlign = 'center';
    c.fillText('O gráfico aparece no fecho do primeiro mês.', w / 2, h / 2);
    return;
  }
  const esq = 34;
  const baixo = 16;
  const alto = 8;
  const valores = dados.flatMap((d) => [d.receitas, d.despesas, d.dinheiro, 0]);
  let max = Math.max(...valores);
  let min = Math.min(...valores);
  if (max === min) max = min + 1;
  const folga = (max - min) * 0.08;
  max += folga;
  min -= min < 0 ? folga : 0;
  const y = (v: number) => alto + (1 - (v - min) / (max - min)) * (h - alto - baixo);
  const passo = (w - esq - 4) / dados.length;

  // Grelha e eixo
  c.strokeStyle = COR.grelha;
  c.fillStyle = COR.texto;
  c.textAlign = 'right';
  c.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const v = min + ((max - min) * i) / 3;
    c.beginPath();
    c.moveTo(esq, Math.round(y(v)) + 0.5);
    c.lineTo(w, Math.round(y(v)) + 0.5);
    c.stroke();
    c.fillText(compacto(v), esq - 4, y(v) + 3);
  }
  c.strokeStyle = 'rgba(255,255,255,0.25)';
  c.beginPath();
  c.moveTo(esq, Math.round(y(0)) + 0.5);
  c.lineTo(w, Math.round(y(0)) + 0.5);
  c.stroke();

  // Barras
  const lb = Math.max(2, passo * 0.32);
  dados.forEach((d, i) => {
    const x = esq + i * passo + passo / 2;
    c.fillStyle = COR.receitas;
    c.fillRect(x - lb, y(d.receitas), lb - 1, y(0) - y(d.receitas));
    c.fillStyle = COR.despesas;
    c.fillRect(x, y(d.despesas), lb - 1, y(0) - y(d.despesas));
  });

  // Caixa: linha com área por baixo
  const pontos = dados.map((d, i) => [esq + i * passo + passo / 2, y(d.dinheiro)] as const);
  const grad = c.createLinearGradient(0, alto, 0, h - baixo);
  grad.addColorStop(0, 'rgba(34,211,238,0.35)');
  grad.addColorStop(1, 'rgba(34,211,238,0)');
  c.beginPath();
  c.moveTo(pontos[0][0], y(0));
  for (const [px, py] of pontos) c.lineTo(px, py);
  c.lineTo(pontos[pontos.length - 1][0], y(0));
  c.closePath();
  c.fillStyle = grad;
  c.fill();
  c.beginPath();
  pontos.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.strokeStyle = COR.caixa;
  c.lineWidth = 2;
  c.stroke();
  for (const [px, py] of pontos) {
    c.beginPath();
    c.arc(px, py, 2.2, 0, Math.PI * 2);
    c.fillStyle = COR.caixa;
    c.fill();
  }

  // Meses por baixo
  c.fillStyle = COR.texto;
  c.textAlign = 'center';
  const cada = Math.ceil(dados.length / 8);
  dados.forEach((d, i) => {
    if (i % cada === 0 || i === dados.length - 1) c.fillText(`M${d.mes + 1}`, esq + i * passo + passo / 2, h - 4);
  });
}
