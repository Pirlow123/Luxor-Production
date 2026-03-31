const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('luxorProject', {
    save: (filePath, data) => ipcRenderer.invoke('save-project', { path: filePath, data }),
    getPath: () => ipcRenderer.invoke('get-project-path'),
    dialogSaveAs: () => ipcRenderer.invoke('dialog-save-as'),
    dialogOpen: () => ipcRenderer.invoke('dialog-open'),
    onSavePath: (callback) => ipcRenderer.on('save-project-path', (_, path) => callback(path)),
    onLoadData: (callback) => ipcRenderer.on('load-project-data', (_, data) => callback(data)),
    onMenuNew: (callback) => ipcRenderer.on('menu-new-project', () => callback()),
    onMenuSave: (callback) => ipcRenderer.on('menu-save-project', () => callback()),
});
