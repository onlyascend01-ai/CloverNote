const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content, defaultPath) => ipcRenderer.invoke('save-file', content, defaultPath),
  readFile: () => ipcRenderer.invoke('read-file'),
  pickAttachment: () => ipcRenderer.invoke('pick-attachment'),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  exportPDF: (title) => ipcRenderer.invoke('export-pdf', title),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // AI Agent (Talking to Main Process)
  generateAIContent: (prompt, apiKey) => ipcRenderer.invoke('generate-ai-content', prompt, apiKey),

  // CloverDrive Specific
  getFiles: () => ipcRenderer.invoke('get-files'),
  uploadFile: () => ipcRenderer.invoke('upload-file'),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  downloadFile: (path, name) => ipcRenderer.invoke('download-file', path, name),
  getVaultIndex: () => ipcRenderer.invoke('get-vault-index'),
  wipeVault: () => ipcRenderer.invoke('wipe-vault'),

  pickImage: () => ipcRenderer.invoke('pick-image'),

  onLoadExternal: (callback) => ipcRenderer.on('load-external-file', (event, value) => callback(value)),
  onProtocolSync: (callback) => ipcRenderer.on('protocol-sync', (event, value) => callback(value))
});
