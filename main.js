const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { GoogleGenerativeAI } = require("@google/generative-ai");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    frame: false,
    show: false,
    backgroundColor: '#064e3b',
    icon: path.join(__dirname, 'CloverNote.png'), 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile('CloverNote.html');

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  ipcMain.on('window-minimize', () => win && win.minimize());
  ipcMain.on('window-maximize', () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('window-close', () => win && win.close());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// CloverAI Agent Handler with Fallback Logic
ipcMain.handle('generate-ai-content', async (event, prompt, apiKey) => {
  if (!apiKey) throw new Error("API Key is missing. Please set it in Preferences.");

  const genAI = new GoogleGenerativeAI(apiKey);

  // Updated list of models to try in order of preference
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro"
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting to use model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const fullPrompt = `System Instruction: You are CloverAI Agent, a premium AI writing assistant. Format your response using HTML (<h3>, <p>, <strong>, <ul>, <li>). Do not use Markdown. Start immediately with the content.\n\nUser Request: ${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return text.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      lastError = error;

      // If it's a permission/key error (403, 401), stop and report it
      if (error.message.includes("403") || error.message.includes("API_KEY_INVALID") || error.message.includes("permission")) {
        throw new Error(`API Key error: ${error.message}. Please check your key permissions.`);
      }

      // Continue to next model if this one wasn't found or is overloaded
    }
  }

  // If we get here, all models failed
  console.error("All Gemini models failed to load.");
  const detailedError = lastError ? lastError.message : "Unknown error";
  throw new Error(`Compatible model not found. Last error: ${detailedError}. Ensure 'Generative Language API' is enabled in your Google AI Studio or Cloud Console.`);
});

ipcMain.handle('save-file', async (event, content, defaultPath) => {
  const { filePath } = await dialog.showSaveDialog({ defaultPath: defaultPath || 'untitled.txt' });
  if (filePath) {
    fs.writeFileSync(filePath, content);
    return filePath;
  }
  return null;
});

ipcMain.handle('read-file', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (filePaths && filePaths.length > 0) {
    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { name: path.basename(filePath), content, path: filePath };
  }
  return null;
});

ipcMain.handle('pick-image', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }]
  });
  if (filePaths && filePaths.length > 0) {
    const filePath = filePaths[0];
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const extension = path.extname(filePath).substring(1);
    return `data:image/${extension};base64,${base64Image}`;
  }
  return null;
});

ipcMain.handle('export-pdf', async (event, title) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `${title || 'note'}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  if (filePath) {
    const data = await win.webContents.printToPDF({ printBackground: true });
    fs.writeFileSync(filePath, data);
    return true;
  }
  return false;
});

ipcMain.handle('get-files', async () => {
  const userDataPath = app.getPath('userData');
  const vaultPath = path.join(userDataPath, 'vault');
  if (!fs.existsSync(vaultPath)) fs.mkdirSync(vaultPath, { recursive: true });
  return fs.readdirSync(vaultPath).map(name => {
    const stats = fs.statSync(path.join(vaultPath, name));
    return { id: name, name: name, path: path.join(vaultPath, name), size: (stats.size / 1024).toFixed(1) + ' KB' };
  });
});

ipcMain.handle('wipe-vault', async () => {
  const userDataPath = app.getPath('userData');
  const vaultPath = path.join(userDataPath, 'vault');
  if (fs.existsSync(vaultPath)) fs.rmSync(vaultPath, { recursive: true, force: true });
  fs.mkdirSync(vaultPath, { recursive: true });
  return true;
});
