// Descarrega modelos e texturas do Poly Haven (CC0) e um sofá dos exemplos da Khronos (CC-BY 4.0).
//
//   node ferramentas/polyhaven.mjs
//
// Modelos em glTF a 1k → public/modelos/<id>/ ; texturas PBR a 1k (cor, normal GL, ARM = oclusão,
// rugosidade, metal) → public/texturas/<id>/. Escreve também public/CREDITOS.txt.
import fs from 'node:fs';
import path from 'node:path';

const UA = { 'User-Agent': 'SoftwareLda/1.0 (jogo pessoal)' };
const MODELOS = ['potted_plant_02', 'potted_plant_04', 'CoffeeCart_01', 'street_lamp_01'];
const TEXTURAS = [
  'laminate_floor_02', 'herringbone_parquet', 'concrete_floor_worn_001', 'painted_plaster_wall', 'leafy_grass', 'asphalt_02',
  'pavement_04', 'brick_wall_001', 'concrete_wall_006', 'ash_veneer',
];
const KHRONOS = [['GlamVelvetSofa', 'Eric Chadwick (Wayfair), CC-BY 4.0']];

async function obter(url, destino) {
  if (fs.existsSync(destino) && fs.statSync(destino).size > 0) return;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}
const json = async (url) => (await fetch(url, { headers: UA })).json();

const creditos = [];
for (const id of MODELOS) {
  const f = (await json(`https://api.polyhaven.com/files/${id}`)).gltf['1k'].gltf;
  const pasta = path.resolve('public/modelos', id);
  await obter(f.url, path.join(pasta, `${id}.gltf`));
  for (const [rel, inc] of Object.entries(f.include)) await obter(inc.url, path.join(pasta, rel));
  const info = await json(`https://api.polyhaven.com/info/${id}`);
  creditos.push(`${info.name} — ${Object.keys(info.authors).join(', ')} — Poly Haven, CC0 (modelos/${id})`);
  console.log('modelo', id);
}
for (const id of TEXTURAS) {
  const f = await json(`https://api.polyhaven.com/files/${id}`);
  const pasta = path.resolve('public/texturas', id);
  await obter(f.Diffuse['1k'].jpg.url, path.join(pasta, 'cor.jpg'));
  await obter(f.nor_gl['1k'].jpg.url, path.join(pasta, 'normal.jpg'));
  await obter(f.arm['1k'].jpg.url, path.join(pasta, 'arm.jpg'));
  const info = await json(`https://api.polyhaven.com/info/${id}`);
  creditos.push(`${info.name} — ${Object.keys(info.authors).join(', ')} — Poly Haven, CC0 (texturas/${id})`);
  console.log('textura', id);
}
for (const [id, autor] of KHRONOS) {
  await obter(`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${id}/glTF-Binary/${id}.glb`,
    path.resolve('public/modelos', id, `${id}.glb`));
  creditos.push(`${id} — ${autor} — Khronos glTF Sample Assets (modelos/${id})`);
  console.log('modelo', id);
}
creditos.push('Pessoas e animações — Microsoft Rocketbox Avatar Library, licença MIT (modelos/pessoas, ver LICENCA-Rocketbox.txt)');
fs.writeFileSync(path.resolve('public/CREDITOS.txt'), `Software Lda — créditos dos recursos 3D\n\n${creditos.join('\n')}\n`);
console.log('feito');
