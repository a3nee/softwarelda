// Definições do jogador (guardadas neste browser, à parte dos jogos guardados).

export type Qualidade = 'baixa' | 'media' | 'alta' | 'ultra';

export interface Definicoes {
  sombras: boolean;
  cicloDia: boolean;
  indicadores: boolean; // indicador de felicidade por cima das cabeças
  avisos: boolean; // avisos flutuantes (lançamentos, conquistas, eventos)
  sons: boolean;
  volume: number; // 0–1
  qualidade: Qualidade; // resolução do 3D
  fpsMax: number; // limite de imagens por segundo (0 = ilimitado)
  mostrarFps: boolean; // contador de FPS no canto do ecrã
}

/** Limites de FPS que o jogador pode escolher (0 = ilimitado). */
export const LIMITES_FPS = [60, 120, 144, 240, 360, 0] as const;

export const POR_OMISSAO: Definicoes = {
  fpsMax: 60,
  mostrarFps: false,
  sombras: true,
  cicloDia: true,
  indicadores: true,
  avisos: true,
  sons: true,
  volume: 0.6,
  qualidade: 'alta',
};

const CHAVE = 'software-lda.definicoes';

export function lerDefinicoes(): Definicoes {
  const d = { ...POR_OMISSAO };
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Record<string, unknown>;
    for (const k of Object.keys(d) as (keyof Definicoes)[])
      if (typeof o[k] === typeof d[k]) (d as Record<string, unknown>)[k] = o[k];
    if (!['baixa', 'media', 'alta', 'ultra'].includes(d.qualidade)) d.qualidade = POR_OMISSAO.qualidade;
    d.volume = Math.max(0, Math.min(1, d.volume));
    if (!(LIMITES_FPS as readonly number[]).includes(d.fpsMax)) d.fpsMax = POR_OMISSAO.fpsMax;
  } catch {
    // definições estragadas: ficam as de origem
  }
  return d;
}

export function guardarDefinicoes(d: Definicoes): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(d));
  } catch {
    // sem armazenamento: valem só nesta sessão
  }
}

/** Resolução do 3D para cada nível de qualidade. */
export function pixelRatio(q: Qualidade): number {
  const max = q === 'ultra' ? 2 : q === 'alta' ? 1.5 : q === 'media' ? 1.25 : 0.85;
  return Math.min(devicePixelRatio, max);
}
