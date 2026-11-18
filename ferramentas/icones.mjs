// Descarrega os ícones Lucide (licença ISC) usados na interface e gera src/icones.ts,
// e a fonte Inter (licença OFL 1.1) para public/fontes/. Corre com: node ferramentas/icones.mjs
import fs from 'node:fs';

const VERSAO_LUCIDE = '1.75.0';
const ICONES = [
  'wallet', 'trending-up', 'trending-down', 'users', 'smile', 'meh', 'frown', 'laugh', 'flame', 'sun', 'moon',
  'pause', 'play', 'fast-forward', 'chevrons-right', 'save', 'menu', 'folder-kanban', 'user-plus', 'package',
  'chart-column', 'building-2', 'mouse-pointer-2', 'brick-wall', 'door-open', 'monitor', 'sprout', 'hammer', 'x',
  'chevron-right', 'chevron-left', 'chevron-down', 'newspaper', 'target', 'rocket', 'briefcase', 'megaphone',
  'handshake', 'lock', 'check', 'clock', 'star', 'calculator', 'file-text', 'shield', 'gamepad-2', 'sofa', 'coffee',
  'leaf', 'minus', 'plus', 'trophy', 'landmark', 'sparkles', 'circle-dollar-sign', 'info', 'triangle-alert', 'crown',
  'arrow-up-right', 'arrow-down-right', 'party-popper', 'calendar', 'timer', 'gem', 'zap', 'badge-percent',
  'chart-line', 'circle-check', 'circle-x', 'unlock', 'trash-2', 'eye', 'settings', 'house', 'folder-open',
  'trophy', 'medal', 'banknote', 'piggy-bank', 'hourglass', 'mic', 'smartphone', 'tent', 'presentation',
];

const LICENCA = `ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby
granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN
AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.`;

const corpos = {};
for (const nome of [...new Set(ICONES)]) {
  const r = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@${VERSAO_LUCIDE}/icons/${nome}.svg`);
  if (!r.ok) throw new Error(`Ícone ${nome}: ${r.status}`);
  const svg = await r.text();
  const corpo = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')
    .replace(/\s*\n\s*/g, '').trim();
  corpos[nome] = corpo;
}

const ts = `// Gerado por ferramentas/icones.mjs — ícones Lucide ${VERSAO_LUCIDE} (https://lucide.dev), licença ISC:
/*
${LICENCA}
*/

const ICONES = ${JSON.stringify(corpos, null, 0).replace(/","/g, '",\n  "').replace(/^\{/, '{\n  ').replace(/\}$/, ',\n}')} as const;

export type NomeIcone = keyof typeof ICONES;

/** SVG em linha de um ícone (herda a cor do texto; o tamanho vem do CSS, 1em por omissão). */
export function ic(nome: NomeIcone, classe = ''): string {
  return \`<svg class="i\${classe ? \` \${classe}\` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"\`
    + \` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\${ICONES[nome]}</svg>\`;
}
`;
fs.writeFileSync('src/icones.ts', ts);
console.log(`src/icones.ts: ${Object.keys(corpos).length} ícones`);

fs.mkdirSync('public/fontes', { recursive: true });
const fonte = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2');
if (!fonte.ok) throw new Error(`Fonte: ${fonte.status}`);
fs.writeFileSync('public/fontes/Inter.woff2', Buffer.from(await fonte.arrayBuffer()));
console.log('public/fontes/Inter.woff2');
