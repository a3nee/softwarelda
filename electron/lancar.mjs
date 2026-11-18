// Abre a app Electron.  npm run app (versão compilada em dist/)  ·  npm run app:dev (servidor do Vite, recarrega ao editar)
import { spawn } from 'node:child_process';
import electron from 'electron';

const dev = process.argv.includes('--dev');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; // o VS Code define-a e o Electron arrancaria como Node
let servidor = null;
if (dev) {
  const { createServer } = await import('vite');
  servidor = await createServer();
  await servidor.listen();
  env.SL_DEV_URL = servidor.resolvedUrls?.local[0];
  console.log(`Vite em ${env.SL_DEV_URL} — a abrir a app…`);
}
const proc = spawn(electron, ['.'], { stdio: 'inherit', env });
proc.on('exit', async (codigo) => {
  await servidor?.close();
  process.exit(codigo ?? 0);
});
