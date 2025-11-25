const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

// Disable GPU acceleration to avoid GPU process errors on Windows
// This is a common workaround for GPU driver compatibility issues
app.disableHardwareAcceleration();

// Alternatively, you can use these command line switches:
// Uncomment these if the above doesn't work or you need more control:
// app.commandLine.appendSwitch('disable-gpu');
// app.commandLine.appendSwitch('disable-gpu-compositing');
// app.commandLine.appendSwitch('disable-software-rasterizer');

function createWindow() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'icon.png');
  const windowOptions = {
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  // Only set icon if it exists
  try {
    const fs = require('fs');
    if (fs.existsSync(iconPath)) {
      windowOptions.icon = iconPath;
    }
  } catch (err) {
    // Ignore icon errors
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load index.html from dist (development/build) or app directory (packaged)
  // In packaged app, electron-builder puts files in resources/app
  let indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // Check if dist/index.html exists, if not, show error
  const fs = require('fs');
  if (!fs.existsSync(indexPath)) {
    console.error('ERROR: dist/index.html not found. Please run "npm run build" or "npm run dev:watch" first.');
    mainWindow.loadURL('data:text/html,<html><body style="background:#1e1e1e;color:#e0e0e0;font-family:sans-serif;padding:20px;"><h1>Build Required</h1><p>Please run <code>npm run build</code> or <code>npm run dev:watch</code> first to build the application.</p><p>For packaging, run <code>npm run dist</code> after building.</p></body></html>');
    return;
  }
  
  mainWindow.loadFile(indexPath);

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Suppress GPU process errors in console (they're non-fatal)
  app.on('gpu-process-crashed', (event, killed) => {
    console.log('GPU process crashed (non-fatal):', killed);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for file operations
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Tune Files', extensions: ['tune'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  try {
    const filePath = result.filePaths[0];
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const tuneData = JSON.parse(fileContent);
    
    return {
      path: filePath,
      name: path.basename(filePath),
      data: tuneData
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const tuneData = JSON.parse(fileContent);
    
    return {
      path: filePath,
      name: path.basename(filePath),
      data: tuneData
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

