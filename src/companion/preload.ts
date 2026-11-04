import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('brainrot', Object.freeze({
  importVideos: () => ipcRenderer.invoke('media:import'),
  environment: Object.freeze({ sandboxed: process.sandboxed, contextIsolated: process.contextIsolated }),
}));
