const { contextBridge, ipcRenderer } = require('electron');

// Auto-updater API
contextBridge.exposeInMainWorld('luxorUpdater', {
    check: () => ipcRenderer.invoke('updater-check'),
    download: () => ipcRenderer.invoke('updater-download'),
    install: () => ipcRenderer.invoke('updater-install'),
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    onStatus: (callback) => ipcRenderer.on('updater-status', (_, data) => callback(data)),
});

contextBridge.exposeInMainWorld('luxorProject', {
    save: (filePath, data) => ipcRenderer.invoke('save-project', { path: filePath, data }),
    getPath: () => ipcRenderer.invoke('get-project-path'),
    dialogSaveAs: () => ipcRenderer.invoke('dialog-save-as'),
    dialogOpen: () => ipcRenderer.invoke('dialog-open'),
    onSavePath: (callback) => ipcRenderer.on('save-project-path', (_, path) => callback(path)),
    onLoadData: (callback) => ipcRenderer.on('load-project-data', (_, data) => callback(data)),
    onMenuNew: (callback) => ipcRenderer.on('menu-new-project', () => callback()),
    onMenuSave: (callback) => ipcRenderer.on('menu-save-project', () => callback()),
    exportFile: (defaultName, content, filters) => ipcRenderer.invoke('export-file', { defaultName, content, filters }),
});
