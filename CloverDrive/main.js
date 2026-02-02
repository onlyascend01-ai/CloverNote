const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
// Define the local vault paths
const VAULT_PATH = path.join(app.getPath('userData'), 'CloverVault');
const TRASH_PATH = path.join(app.getPath('userData'), 'CloverTrash');

// Ensure the directories exist
[VAULT_PATH, TRASH_PATH].forEach(p => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 900,
    minHeight: 700,
    frame: false,
    show: false,
    backgroundColor: '#064e3b',
    icon: path.join(__dirname, 'CloverDrive.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      zoomFactor: 0.8
    }
  });

  win.loadFile('CloverDrive.html');

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Drive Specific Handlers
ipcMain.handle('get-files', async () => {
  try {
    const getDirFiles = (dirPath) => {
      if (!fs.existsSync(dirPath)) return [];
      const fileNames = fs.readdirSync(dirPath);
      return fileNames.map(name => {
        const filePath = path.join(dirPath, name);
        const stats = fs.statSync(filePath);
        return {
          id: stats.ino.toString(),
          name: name,
          size: (stats.size / 1024).toFixed(1) + ' KB',
          date: stats.mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          path: filePath,
          type: path.extname(name).toLowerCase().replace('.', ''),
          inTrash: dirPath === TRASH_PATH
        };
      });
    };

    return [...getDirFiles(VAULT_PATH), ...getDirFiles(TRASH_PATH)];
  } catch (err) {
    console.error('Failed to get files:', err);
    return [];
  }
});

ipcMain.handle('upload-file', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  });

  if (filePaths) {
    filePaths.forEach(srcPath => {
      const fileName = path.basename(srcPath);
      const destPath = path.join(VAULT_PATH, fileName);
      fs.copyFileSync(srcPath, destPath);
    });
    return true;
  }
  return false;
});

ipcMain.handle('download-file', async (event, sourcePath, fileName) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: fileName,
  });

  if (filePath) {
    try {
      fs.copyFileSync(sourcePath, filePath);
      return true;
    } catch (err) {
      console.error('Download failed:', err);
      return false;
    }
  }
  return false;
});

ipcMain.handle('open-file', async (event, filePath) => {
  shell.openPath(filePath);
});

ipcMain.handle('delete-file', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('move-to-trash', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    const fileName = path.basename(filePath);
    const destPath = path.join(TRASH_PATH, fileName);
    fs.renameSync(filePath, destPath);
    return true;
  }
  return false;
});

ipcMain.handle('restore-from-trash', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    const fileName = path.basename(filePath);
    const destPath = path.join(VAULT_PATH, fileName);
    fs.renameSync(filePath, destPath);
    return true;
  }
  return false;
});

ipcMain.handle('wipe-vault', async () => {
  try {
    [VAULT_PATH, TRASH_PATH].forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          fs.unlinkSync(path.join(dir, file));
        }
      }
    });
    return true;
  } catch (err) {
    console.error('Failed to wipe vault:', err);
    return false;
  }
});
