const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getFiles: () => ipcRenderer.invoke('get-files'),
  uploadFile: () => ipcRenderer.invoke('upload-file'),
  downloadFile: (path, name) => ipcRenderer.invoke('download-file', path, name),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  moveToTrash: (path) => ipcRenderer.invoke('move-to-trash', path),
  restoreFromTrash: (path) => ipcRenderer.invoke('restore-from-trash', path),
  wipeVault: () => ipcRenderer.invoke('wipe-vault')
});
