// Efeitos sonoros sintetizados com WebAudio (sem ficheiros de som nem dependências).

let contexto: AudioContext | null = null;
let ligado = true;
let volume = 0.6;

export function configurarSom(sons: boolean, vol: number): void {
  ligado = sons;
  volume = vol;
}

function ctx(): AudioContext | null {
  if (!ligado || volume <= 0) return null;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

/** Uma nota com envolvente curta; `ate` faz a frequência deslizar. */
function tom(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', ganho = 0.2, ate?: number): void {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + inicio;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t0);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, ganho * volume), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const som = {
  clique: () => tom(740, 0, 0.05, 'triangle', 0.1),
  construir: () => {
    tom(200, 0, 0.1, 'square', 0.05, 100);
    tom(110, 0.01, 0.16, 'sine', 0.25, 70);
  },
  demolir: () => {
    tom(260, 0, 0.22, 'sawtooth', 0.06, 60);
    tom(90, 0.02, 0.2, 'sine', 0.2, 50);
  },
  dinheiro: () => {
    tom(988, 0, 0.1, 'square', 0.05);
    tom(1319, 0.07, 0.35, 'square', 0.05);
  },
  lancamento: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, i * 0.09, 0.35, 'triangle', 0.16)),
  conquista: () => {
    [784, 988, 1175].forEach((f, i) => tom(f, i * 0.1, 0.25, 'triangle', 0.14));
    tom(1568, 0.3, 0.7, 'triangle', 0.14);
  },
  evento: () => {
    tom(880, 0, 0.25, 'sine', 0.14);
    tom(1320, 0.12, 0.35, 'sine', 0.1);
  },
  aviso: () => {
    tom(392, 0, 0.18, 'triangle', 0.14);
    tom(311, 0.16, 0.28, 'triangle', 0.14);
  },
  erro: () => tom(150, 0, 0.16, 'sawtooth', 0.07, 110),
  falencia: () => [392, 330, 262, 196].forEach((f, i) => tom(f, i * 0.24, 0.45, 'triangle', 0.16)),
};
