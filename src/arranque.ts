// Arranque: carrega os modelos e texturas (com barra de progresso) e só depois o jogo.
import { carregarRecursos } from './recursos.ts';

const ecra = document.getElementById('carregamento')!;
const barra = ecra.querySelector<HTMLElement>('.carr-barra i')!;
const texto = ecra.querySelector<HTMLElement>('.carr-texto')!;
const FRASES = ['A montar o escritório…', 'A ligar os monitores…', 'A regar as plantas…', 'A chamar a equipa…', 'A fazer café…'];

try {
  await carregarRecursos((f) => {
    barra.style.width = `${Math.round(f * 100)}%`;
    texto.textContent = FRASES[Math.min(FRASES.length - 1, Math.floor(f * FRASES.length))];
  });
  texto.textContent = 'A preparar a cidade…';
  await new Promise((r) => requestAnimationFrame(r));
  await import('./main.ts');
  ecra.classList.add('fim');
  setTimeout(() => ecra.remove(), 700);
} catch (e) {
  console.error(e);
  ecra.classList.add('erro');
  texto.textContent = `Não foi possível carregar os modelos 3D (${e instanceof Error ? e.message : String(e)}).`;
}
