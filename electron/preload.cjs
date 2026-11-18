// Ponte mínima entre o jogo e a app (só o que o jogo precisa: ecrã inteiro e sair).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appDesktop', {
  ecraInteiro: (valor) => ipcRenderer.invoke('ecra-inteiro', valor),
  estaEmEcraInteiro: () => ipcRenderer.invoke('esta-em-ecra-inteiro'),
  sair: () => ipcRenderer.send('sair'),
});
