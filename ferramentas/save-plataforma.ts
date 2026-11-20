// Gera um jogo guardado com a plataforma já lançada (para capturas e testes manuais).
// Uso: node ferramentas/save-plataforma.ts > save.json
import {
  novoJogo, gerarCandidatos, contratar, colocarSecretaria, iniciarProjeto, avancar, exportarJogo, MIN_POR_DIA, MIN_POR_MES,
} from '../src/sim.ts';

const s = novoJogo(4242, 24, 18, { nome: 'Nuvem Lda.', missoes: false });
s.dinheiro = 200000;
for (let k = 0; k < 4; k++) {
  if (s.candidatos.length === 0) gerarCandidatos(s);
  colocarSecretaria(s, 3 + k, 4);
  contratar(s, 0);
}
iniciarProjeto(s, 'Nuvem', 'utilitario', ['grafica'], s.funcionarios.map((f) => f.id));
let dias = 0;
while (s.produtos.length === 0 && dias++ < 400) avancar(s, MIN_POR_DIA);
avancar(s, MIN_POR_MES * 3);
process.stdout.write(exportarJogo(s));
