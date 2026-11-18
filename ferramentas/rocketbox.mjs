// Converte pessoas e animações da Microsoft Rocketbox (licença MIT) para o jogo.
//
//   node ferramentas/rocketbox.mjs
//
// Descarrega os FBX e as texturas TGA do GitHub para uma pasta temporária, lê os FBX com o
// FBXLoader do three (em Node, sem DOM), escreve cada pessoa num GLB (malha + esqueleto, sem
// texturas) e cada animação num JSON (AnimationClip.toJSON). As texturas passam a JPG/PNG com o
// ffmpeg (tem de estar no PATH). Resultado em public/modelos/pessoas/ + pessoas.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const RAIZ = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets';
const CACHE = path.join(os.tmpdir(), 'software-lda-rocketbox');
const SAIDA = path.resolve('public/modelos/pessoas');

/** Pessoas escolhidas (roupa de escritório informal, variedade de aspeto). */
const PESSOAS = [
  ['Adults/Male_Adult_02', 'm'], ['Adults/Male_Adult_04', 'm'], ['Adults/Male_Adult_06', 'm'],
  ['Adults/Male_Adult_08', 'm'], ['Adults/Male_Adult_12', 'm'], ['Adults/Male_Adult_17', 'm'],
  ['Adults/Female_Adult_01', 'f'], ['Adults/Female_Adult_04', 'f'], ['Adults/Female_Adult_05', 'f'],
  ['Adults/Female_Adult_08', 'f'], ['Adults/Female_Adult_14', 'f'], ['Adults/Female_Adult_17', 'f'],
];

/** Animações por nome do jogo → ficheiro da Rocketbox (o prefixo m_/f_ é posto conforme o sexo). */
const ANIMACOES = {
  andar: 'all_animations_max_motextr_xy/{s}_walk_neutral_01',
  parado: 'all_animations_max_motextr_static/{s}_idle_neutral_01',
  trabalhar: 'all_animations_max_motextr_static/{s}_sit_table_idle_neutral_01',
  festejar: 'all_animations_max_motextr_static/{s}_cheer_01',
};
/** Imagens por segundo guardadas (andar precisa de mais; o resto é lento). */
const FPS = { andar: 30, parado: 15, trabalhar: 15, festejar: 20 };

// --- Ambiente Node sem DOM -------------------------------------------------------------
THREE.TextureLoader.prototype.load = function (url) {
  const t = new THREE.Texture();
  t.userData.ficheiro = decodeURIComponent(url.split(/[\\/]/).pop());
  return t;
};
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) {
    b.arrayBuffer().then((r) => {
      this.result = `data:${b.type || 'application/octet-stream'};base64,${Buffer.from(r).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

async function descarregar(rel) {
  const destino = path.join(CACHE, rel);
  if (fs.existsSync(destino) && fs.statSync(destino).size > 0) return destino;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const r = await fetch(`${RAIZ}/${rel.split('/').map(encodeURIComponent).join('/')}`);
  if (!r.ok) throw new Error(`${r.status} ${rel}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
}

function lerFbx(ficheiro) {
  const b = fs.readFileSync(ficheiro);
  return new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
}

function ffmpeg(entrada, saida, largura, png = false) {
  const args = ['-loglevel', 'error', '-y', '-i', entrada, '-vf', `scale=${largura}:-1`];
  if (png) args.push('-pix_fmt', 'rgba');
  else args.push('-q:v', '4');
  execFileSync('ffmpeg', [...args, saida]);
}

/**
 * Formato binário das animações (little-endian): cada pista é amostrada a `fps` constantes e
 * guardada em Int16 — quaterniões × 32767, posições em cm × 10. O pessoas.json tem os nomes das
 * pistas, o fps e o número de imagens.
 */
function codificar(clip, fps) {
  const n = Math.max(2, Math.round(clip.duration * fps) + 1);
  const pistas = [];
  const partes = [];
  for (const t of clip.tracks) {
    const pos = t.name.endsWith('.position');
    const dim = pos ? 3 : 4;
    const inter = t.createInterpolant();
    const out = new Int16Array(n * dim);
    for (let i = 0; i < n; i++) {
      const v = inter.evaluate(Math.min(clip.duration, i / fps));
      for (let k = 0; k < dim; k++) out[i * dim + k] = Math.round(pos ? v[k] * 10 : v[k] * 32767);
    }
    pistas.push(t.name);
    partes.push(Buffer.from(out.buffer));
  }
  return { fps, n, pistas, bin: Buffer.concat(partes) };
}

// --- Pessoas --------------------------------------------------------------------------------
fs.mkdirSync(path.join(SAIDA, 'anim'), { recursive: true });
const manifesto = { pessoas: [], animacoes: { m: {}, f: {} } };
const ossosPorSexo = { m: new Set(), f: new Set() };

for (const [rel, sexo] of PESSOAS) {
  const nome = rel.split('/').pop();
  const fbx = lerFbx(await descarregar(`Avatars/${rel}/Export/${nome}.fbx`));
  const pasta = path.join(SAIDA, nome);
  fs.mkdirSync(pasta, { recursive: true });
  const materiais = {};
  let malha = null;
  fbx.traverse((o) => { if (o.isSkinnedMesh) malha = o; if (o.isBone) ossosPorSexo[sexo].add(o.name); });
  for (const l of fbx.children.filter((c) => c.isLight)) fbx.remove(l);
  const lista = Array.isArray(malha.material) ? malha.material : [malha.material];
  const novos = [];
  for (const m of lista) {
    const parte = /head/.test(m.name) ? 'cabeca' : /opacity/.test(m.name) ? 'cabelo' : 'corpo';
    const tex = {};
    const fontes = { map: m.map, normalMap: m.normalMap };
    for (const [chave, t] of Object.entries(fontes)) {
      if (!t) continue;
      const tga = await descarregar(`Avatars/${rel}/Textures/${t.userData.ficheiro}`);
      const png = parte === 'cabelo';
      const largura = chave === 'map' ? (parte === 'corpo' ? 1024 : 512) : parte === 'corpo' ? 512 : 256;
      const saida = `${parte}_${chave === 'map' ? 'cor' : 'normal'}.${png && chave === 'map' ? 'png' : 'jpg'}`;
      ffmpeg(tga, path.join(pasta, saida), largura, png && chave === 'map');
      tex[chave] = `${nome}/${saida}`;
    }
    materiais[m.name] = { parte, ...tex };
    const n = new THREE.MeshStandardMaterial({ name: m.name });
    novos.push(n);
  }
  malha.material = Array.isArray(malha.material) ? novos : novos[0];
  const glb = await new GLTFExporter().parseAsync(fbx, { binary: true });
  fs.writeFileSync(path.join(SAIDA, `${nome}.glb`), Buffer.from(glb));
  const caixa = new THREE.Box3().setFromObject(fbx);
  manifesto.pessoas.push({ nome, sexo, ficheiro: `${nome}.glb`, altura: Math.round(caixa.max.y), materiais });
  console.log(nome, sexo, `${(glb.byteLength / 1e6).toFixed(2)} MB`, 'altura', caixa.max.y.toFixed(1), Object.keys(materiais).join(','));
}

// --- Animações ------------------------------------------------------------------------------
for (const sexo of ['m', 'f']) {
  for (const [jogo, modelo] of Object.entries(ANIMACOES)) {
    const rel = `Animations/${modelo.replace('{s}', sexo)}.max.fbx`;
    const fbx = lerFbx(await descarregar(rel));
    const clip = fbx.animations[0];
    const ossos = ossosPorSexo[sexo];
    clip.tracks = clip.tracks.filter((t) => {
      const [osso, prop] = t.name.split('.');
      if (!ossos.has(osso) || osso === 'Bip01_Footsteps') return false;
      return prop === 'quaternion' || (prop === 'position' && osso === 'Bip01');
    });
    const pos = clip.tracks.find((t) => t.name === 'Bip01.position');
    // Andar no sítio: o jogo é que desloca a pessoa (tira-se o avanço da raiz em x/z).
    if (jogo === 'andar' && pos) {
      const v = pos.values;
      const passo = (v[v.length - 1] - v[2]) / 100;
      manifesto.animacoes[sexo].velocidadeAndar = Math.round((passo / clip.duration) * 1000) / 1000;
      for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; }
    }
    if (pos) {
      const v = pos.values;
      const eixo = (k) => { let a = Infinity, b = -Infinity; for (let i = k; i < v.length; i += 3) { a = Math.min(a, v[i]); b = Math.max(b, v[i]); } return `${a.toFixed(1)}..${b.toFixed(1)}`; };
      console.log(sexo, jogo, `${clip.duration.toFixed(2)}s`, clip.tracks.length, 'pistas; Bip01 x', eixo(0), 'y', eixo(1), 'z', eixo(2));
    }
    const { fps, n, pistas, bin } = codificar(clip, FPS[jogo]);
    const ficheiro = `anim/${sexo}_${jogo}.bin`;
    fs.writeFileSync(path.join(SAIDA, ficheiro), bin);
    manifesto.animacoes[sexo][jogo] = { ficheiro, fps, n, pistas };
    console.log('  ->', ficheiro, `${(bin.length / 1e3).toFixed(0)} kB`);
  }
}

fs.writeFileSync(path.join(SAIDA, 'pessoas.json'), JSON.stringify(manifesto, null, 1));
fs.writeFileSync(path.join(SAIDA, 'LICENCA-Rocketbox.txt'), await (await fetch('https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/LICENSE.md')).text());
console.log('feito:', SAIDA);
