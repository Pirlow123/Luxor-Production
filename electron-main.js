const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Luxor Production',
        backgroundColor: '#0a0a0c',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Allow cross-origin API calls to local servers
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, 'assets', 'logos', 'luxor.png'),
        autoHideMenuBar: true,
        show: false,
    });

    mainWindow.loadFile('index.html');

    // Show window once content is ready (avoids white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Prevent the app from navigating to external URLs (e.g., server API endpoints)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        // Only allow loading the local index.html
        if (!url.startsWith('file://')) {
            event.preventDefault();
        }
    });

    // Also block new window creation from links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            require('electron').shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Build menu
    const menu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-project') },
                { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: () => handleOpenProject() },
                { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save-project') },
                { label: 'Save Project As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => handleSaveProjectAs() },
                { type: 'separator' },
                { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
                { label: 'Toggle DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
                { type: 'separator' },
                { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
            ]
        },
        {
            label: 'View',
            submenu: [
                { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
                { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
                { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
                { type: 'separator' },
                { label: 'Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
            ]
        },
        {
            label: 'Help',
            submenu: [
                { label: 'About Luxor Production', click: () => {
                    dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'Luxor Production',
                        message: 'Luxor Production v1.2',
                        detail: 'Universal production control platform.\nSupports Hippotizer, Resolume Arena, vMix, CasparCG, OBS Studio, Barco E2/S3, QLab, Disguise, and Pixera.\nIncludes LED Processor control (Novastar, Megapixel Helios, Brompton Tessera), PTZ camera control (Panasonic, BirdDog), network switch monitoring (Luminex GigaCore), lighting console integration (grandMA3, Avolites Titan), Riedel Bolero intercom, and PIXL Grid test patterns.\n\nBuilt with Electron.',
                    });
                }},
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);
}

// ================================================================
// PROJECT FILE HANDLING
// ================================================================
let currentProjectPath = null;

async function handleSaveProjectAs() {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Project',
        defaultPath: currentProjectPath || 'Untitled.luxor',
        filters: [
            { name: 'Luxor Project', extensions: ['luxor'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });
    if (!result.canceled && result.filePath) {
        currentProjectPath = result.filePath;
        mainWindow.webContents.send('save-project-path', result.filePath);
    }
}

async function handleOpenProject() {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Project',
        filters: [
            { name: 'Luxor Project', extensions: ['luxor'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        currentProjectPath = filePath;
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            mainWindow.webContents.send('load-project-data', { path: filePath, data });
        } catch (e) {
            dialog.showErrorBox('Error', `Failed to open project: ${e.message}`);
        }
    }
}

// IPC handlers
ipcMain.handle('save-project', async (event, { path: filePath, data }) => {
    try {
        fs.writeFileSync(filePath, data, 'utf8');
        currentProjectPath = filePath;
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
});

ipcMain.handle('get-project-path', () => currentProjectPath);

ipcMain.handle('dialog-save-as', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Project',
        defaultPath: currentProjectPath || 'Untitled.luxor',
        filters: [
            { name: 'Luxor Project', extensions: ['luxor'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });
    if (!result.canceled && result.filePath) {
        currentProjectPath = result.filePath;
        return result.filePath;
    }
    return null;
});

ipcMain.handle('dialog-open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Project',
        filters: [
            { name: 'Luxor Project', extensions: ['luxor'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        currentProjectPath = filePath;
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return { path: filePath, data };
        } catch (e) {
            return { error: e.message };
        }
    }
    return null;
});

// Handle app lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // On macOS, apps stay active until Cmd+Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
