const { app, BrowserWindow, Menu, dialog, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      worldSafeExecuteJavaScript: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset', // For a more native macOS look
    backgroundColor: '#f5f5f5',
    // Add icon for the window
    icon: path.join(__dirname, 'build/icons/icon.png')
  });

  // Load the main HTML file
  mainWindow.loadFile('index.html');
  
  // Open DevTools in development mode
//   mainWindow.webContents.openDevTools();

  // Create application menu
  createMenu();

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new')
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });
            if (!canceled && filePaths.length > 0) {
              const content = fs.readFileSync(filePaths[0], 'utf8');
              mainWindow.webContents.send('file-opened', { path: filePaths[0], content });
            }
          }
        },
        {
          label: 'Import from URL',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow.webContents.send('menu-import-url')
        },
        {
          label: 'Import from Clipboard',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            const text = clipboard.readText();
            if (text) {
              mainWindow.webContents.send('import-clipboard', text);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as')
        },
        {
          label: 'Export to Clipboard',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('menu-export-clipboard')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Format JSON',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow.webContents.send('menu-format')
        },
        {
          label: 'Compress JSON',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow.webContents.send('menu-compress')
        },
        {
          label: 'Validate JSON',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => mainWindow.webContents.send('menu-validate')
        },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu-find')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Tree View',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow.webContents.send('toggle-tree-view')
        },
        {
          label: 'Collapse All',
          accelerator: 'CmdOrCtrl+[',
          click: () => mainWindow.webContents.send('menu-collapse-all')
        },
        {
          label: 'Expand All',
          accelerator: 'CmdOrCtrl+]',
          click: () => mainWindow.webContents.send('menu-expand-all')
        }
      ]
    },
    {
      label: 'Schema',
      submenu: [
        {
          label: 'Load Schema',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [{ name: 'JSON Schema', extensions: ['json'] }]
            });
            if (!canceled && filePaths.length > 0) {
              const content = fs.readFileSync(filePaths[0], 'utf8');
              mainWindow.webContents.send('schema-loaded', { path: filePaths[0], content });
            }
          }
        },
        {
          label: 'Generate Schema from Current JSON',
          click: () => mainWindow.webContents.send('menu-generate-schema')
        },
        {
          label: 'Validate Against Schema',
          click: () => mainWindow.webContents.send('menu-validate-schema')
        },
        {
          label: 'Clear Schema',
          click: () => mainWindow.webContents.send('menu-clear-schema')
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/yourusername/json-editor-app');
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => mainWindow.webContents.send('menu-show-shortcuts')
        }
      ]
    }
  ];

  // macOS specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle file save as
ipcMain.handle('save-file-as', async (event, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: 'untitled.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, content);
    return filePath;
  }
  return null;
});

// Handle file open request
ipcMain.on('open-file', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  if (!canceled && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], 'utf8');
    event.sender.send('file-opened', { path: filePaths[0], content });
  }
});

// Handle clipboard export
ipcMain.on('export-to-clipboard', (event, content) => {
  clipboard.writeText(content);
  event.reply('export-complete', 'Copied to clipboard');
});

// Handle URL import
ipcMain.handle('import-from-url', async (event, url) => {
  try {
    const content = await fetchUrl(url);
    return content;
  } catch (error) {
    throw new Error(`Failed to import from URL: ${error.message}`);
  }
});

// Fetch URL content
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`Status Code: ${response.statusCode}`));
      }
      
      const data = [];
      response.on('data', (chunk) => {
        data.push(chunk);
      });
      
      response.on('end', () => {
        try {
          const content = Buffer.concat(data).toString();
          resolve(content);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.end();
  });
}

// When Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS where it's typical
// for applications to remain open until the user quits with Cmd + Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 