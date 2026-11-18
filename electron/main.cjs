// Processo principal da app de ambiente de trabalho (Electron).
// Em produção serve a pasta dist/ pelo protocolo app:// (o fetch dos modelos 3D não funciona
// em file://); em desenvolvimento abre o servidor do Vite (variável SL_DEV_URL, ver dev.mjs).
const { app, BrowserWindow, Menu, ipcMain, net, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.SL_DEV_URL;
const DIST = path.join(__dirname, '..', 'dist');
// Para testes automáticos: SL_CAPTURA=imagem.png [SL_EVAL=código] [SL_ESPERA=ms] guarda a janela e fecha.
const CAPTURA = process.env.SL_CAPTURA;

// Placa gráfica dedicada em portáteis/PCs com duas (a integrada é muito mais lenta).
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

/** @type {BrowserWindow | null} */
let janela = null;

function criarJanela() {
  janela = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 640,
    title: 'Software Lda',
    backgroundColor: '#070b18',
    icon: path.join(__dirname, 'icone.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  janela.once('ready-to-show', () => {
    janela.maximize();
    janela.show();
  });
  const origem = DEV_URL ?? 'app://jogo/';
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  janela.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(origem)) e.preventDefault();
  });
  janela.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      janela.setFullScreen(!janela.isFullScreen());
      e.preventDefault();
    } else if (input.key === 'F12' && DEV_URL) {
      janela.webContents.toggleDevTools();
    }
  });
  janela.on('closed', () => (janela = null));
  if (CAPTURA) {
    janela.webContents.on('console-message', (e, nivel, msg) => console.log('[consola]', e.message ?? msg));
    janela.webContents.once('did-finish-load', async () => {
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      await espera(Number(process.env.SL_ESPERA ?? 6000));
      if (process.env.SL_EVAL) console.log('[eval]', await janela.webContents.executeJavaScript(process.env.SL_EVAL).catch((e) => 'ERRO ' + e));
      await espera(Number(process.env.SL_ESPERA2 ?? 1500));
      fs.writeFileSync(CAPTURA, (await janela.webContents.capturePage()).toPNG());
      app.quit();
    });
  }
  janela.loadURL(DEV_URL ?? 'app://jogo/index.html');
}

app.on('second-instance', () => {
  if (!janela) return;
  if (janela.isMinimized()) janela.restore();
  janela.focus();
});

app.whenReady().then(() => {
  protocol.handle('app', (pedido) => {
    const rel = decodeURIComponent(new URL(pedido.url).pathname).replace(/^\/+/, '') || 'index.html';
    const ficheiro = path.normalize(path.join(DIST, rel));
    if (!ficheiro.startsWith(DIST + path.sep)) return new Response('Proibido', { status: 403 });
    return net.fetch(pathToFileURL(ficheiro).toString());
  });
  ipcMain.handle('ecra-inteiro', (e, valor) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return false;
    w.setFullScreen(typeof valor === 'boolean' ? valor : !w.isFullScreen());
    return w.isFullScreen();
  });
  ipcMain.handle('esta-em-ecra-inteiro', (e) => BrowserWindow.fromWebContents(e.sender)?.isFullScreen() ?? false);
  ipcMain.on('sair', () => app.quit());
  criarJanela();
});

app.on('window-all-closed', () => app.quit());
