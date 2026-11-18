// Simulação sem 3D: corre em Node com `npm run sim`.
import {
  avancar, colocarSecretaria, contratar, euros, iniciarProjeto, MIN_POR_MES, novoJogo,
} from './sim.ts';

const s = novoJogo(42);
colocarSecretaria(s, 5, 5);
colocarSecretaria(s, 6, 5);
contratar(s, 0);
contratar(s, 0);

console.log('Mês | Dinheiro    | Func. | Produtos | Projeto');
for (let mes = 1; mes <= 24 && !s.falencia; mes++) {
  if (!s.projeto) iniciarProjeto(s, '');
  avancar(s, MIN_POR_MES);
  const prog = s.projeto ? `${Math.round((s.projeto.trabalhoFeito / s.projeto.trabalhoTotal) * 100)}%` : '-';
  console.log(
    `${String(mes).padStart(3)} | ${euros(s.dinheiro).padStart(11)} | ${String(s.funcionarios.length).padStart(5)} | ${String(s.produtos.length).padStart(8)} | ${prog}`,
  );
}
console.log(s.falencia ? 'Resultado: FALÊNCIA' : `Resultado: ${euros(s.dinheiro)} ao fim de 2 anos`);
