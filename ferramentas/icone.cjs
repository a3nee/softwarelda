// Gera electron/icone.png (512×512) a partir do ícone SVG do jogo.  npx electron ferramentas/icone.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='512' height='512'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#22d3ee'/>
<stop offset='.55' stop-color='#8b5cf6'/><stop offset='1' stop-color='#f472b6'/></linearGradient></defs>
<rect width='64' height='64' rx='14' fill='url(#g)'/>
<text x='32' y='42' font-family='Segoe UI,Arial' font-size='26' font-weight='900' fill='white' text-anchor='middle'>SL</text></svg>`;

app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true, useContentSize: true });
  await w.loadURL(`data:text/html,${encodeURIComponent(`<html><body style="margin:0;background:transparent">${SVG}</body></html>`)}`);
  await new Promise((r) => setTimeout(r, 300));
  const img = await w.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  fs.writeFileSync(path.join(__dirname, '..', 'electron', 'icone.png'), img.resize({ width: 512, height: 512 }).toPNG());
  app.quit();
});
