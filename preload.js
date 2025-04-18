// Preload script runs in isolated context but has access to Node.js APIs
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // File operations
    receiveFileOpened: (callback) => {
      ipcRenderer.on('file-opened', (event, ...args) => callback(...args));
    },
    receiveNewFile: (callback) => {
      ipcRenderer.on('menu-new', (event, ...args) => callback(...args));
    },
    receiveSaveRequest: (callback) => {
      ipcRenderer.on('menu-save', (event, ...args) => callback(...args));
    },
    receiveSaveAsRequest: (callback) => {
      ipcRenderer.on('menu-save-as', (event, ...args) => callback(...args));
    },
    saveFileAs: (content) => ipcRenderer.invoke('save-file-as', content),
    openFile: () => ipcRenderer.send('open-file'),
    
    // Import/Export operations
    receiveImportUrlRequest: (callback) => {
      ipcRenderer.on('menu-import-url', (event, ...args) => callback(...args));
    },
    receiveImportClipboard: (callback) => {
      ipcRenderer.on('import-clipboard', (event, ...args) => callback(...args));
    },
    receiveExportClipboardRequest: (callback) => {
      ipcRenderer.on('menu-export-clipboard', (event, ...args) => callback(...args));
    },
    importFromUrl: (url) => ipcRenderer.invoke('import-from-url', url),
    exportToClipboard: (content) => ipcRenderer.send('export-to-clipboard', content),
    receiveExportComplete: (callback) => {
      ipcRenderer.on('export-complete', (event, ...args) => callback(...args));
    },
    
    // JSON operations
    receiveFormatRequest: (callback) => {
      ipcRenderer.on('menu-format', (event, ...args) => callback(...args));
    },
    receiveCompressRequest: (callback) => {
      ipcRenderer.on('menu-compress', (event, ...args) => callback(...args));
    },
    receiveValidateRequest: (callback) => {
      ipcRenderer.on('menu-validate', (event, ...args) => callback(...args));
    },
    
    // View operations
    receiveToggleTreeView: (callback) => {
      ipcRenderer.on('toggle-tree-view', (event, ...args) => callback(...args));
    },
    receiveCollapseAll: (callback) => {
      ipcRenderer.on('menu-collapse-all', (event, ...args) => callback(...args));
    },
    receiveExpandAll: (callback) => {
      ipcRenderer.on('menu-expand-all', (event, ...args) => callback(...args));
    },
    
    // Search operations
    receiveFindRequest: (callback) => {
      ipcRenderer.on('menu-find', (event, ...args) => callback(...args));
    },
    
    // Schema operations
    receiveSchemaLoaded: (callback) => {
      ipcRenderer.on('schema-loaded', (event, ...args) => callback(...args));
    },
    receiveGenerateSchemaRequest: (callback) => {
      ipcRenderer.on('menu-generate-schema', (event, ...args) => callback(...args));
    },
    receiveValidateSchemaRequest: (callback) => {
      ipcRenderer.on('menu-validate-schema', (event, ...args) => callback(...args));
    },
    receiveClearSchemaRequest: (callback) => {
      ipcRenderer.on('menu-clear-schema', (event, ...args) => callback(...args));
    },
    
    // Help operations
    receiveShowShortcutsRequest: (callback) => {
      ipcRenderer.on('menu-show-shortcuts', (event, ...args) => callback(...args));
    }
  }
); 