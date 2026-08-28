const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ercmedTv', {
  setTvMuted: muted => ipcRenderer.send('ercmed-tv:set-muted', Boolean(muted)),
});
