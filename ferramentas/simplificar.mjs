// Simplifica as malhas dos modelos pesados (meshoptimizer), no próprio ficheiro.
// Os modelos da Poly Haven e da Khronos foram feitos para grandes planos; numa vista de cima
// sobram centenas de milhares de triângulos. Correr uma vez, sobre os ficheiros originais:
//   node ferramentas/simplificar.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

// [ficheiro, fração de triângulos a manter, erro máximo (relativo ao tamanho do modelo)]
const MODELOS = [
  ['public/modelos/CarConcept/CarConcept.glb', 0.08, 0.012],
  ['public/modelos/potted_plant_02/potted_plant_02.gltf', 0.12, 0.01],
  ['public/modelos/potted_plant_04/potted_plant_04.gltf', 0.3, 0.008],
  ['public/modelos/street_lamp_01/street_lamp_01.gltf', 0.15, 0.004],
  ['public/modelos/CoffeeCart_01/CoffeeCart_01.gltf', 0.3, 0.004],
];

function triangulos(doc) {
  let t = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const i = p.getIndices();
      t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    }
  return Math.round(t);
}

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const [ficheiro, ratio, error] of MODELOS) {
  const doc = await io.read(ficheiro);
  const antes = triangulos(doc);
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error }));
  const depois = triangulos(doc);
  await io.write(ficheiro, doc);
  console.log(`${ficheiro}: ${antes} → ${depois} triângulos`);
}
