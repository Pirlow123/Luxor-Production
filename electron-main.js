const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
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

    // Handle file downloads (blob exports from LED Auto-Connect, Diagram Builder, etc.)
    mainWindow.webContents.session.on('will-download', (event, item) => {
        const fileName = item.getFilename();
        const result = dialog.showSaveDialogSync(mainWindow, {
            title: 'Save Export',
            defaultPath: fileName,
            filters: [
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        if (result) {
            item.setSavePath(result);
        } else {
            item.cancel();
        }
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
                        message: 'Luxor Production v1.5.1',
                        detail: 'Universal production control platform for live events, broadcast, and AV installations.\n\nMedia Servers: Hippotizer, Resolume Arena, vMix, CasparCG, OBS Studio, Barco E2/S3, QLab, Disguise, Pixera, Blackmagic ATEM\n\nLED Tools: LED Calculator, LED Setup Calc, PIXL Grid, Diagram Builder, LED Auto-Connect, 3D Stage Visualizer, 3D LED Layout\n\nProduction: Power Distribution, Fixture Patch, Truck Packer, Capture Viewer, Equipment Specifications\n\nNetwork & Control: LED Processors (Novastar, Helios, Brompton), PTZ Cameras, Network Switches, Lighting Consoles, Intercom Systems\n\nBuilt with Electron.',
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

ipcMain.handle('export-file', async (event, { defaultName, content, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export',
        defaultPath: defaultName,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (!result.canceled && result.filePath) {
        try {
            fs.writeFileSync(result.filePath, content, 'utf8');
            return { ok: true, path: result.filePath };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
    return { ok: false, canceled: true };
});

// ================================================================
// BROADWEIGH LOAD CELL BRIDGE (Python subprocess)
// ================================================================
let broadweighProcess = null;

ipcMain.handle('broadweigh-start', async () => {
    if (broadweighProcess) {
        return { ok: true, message: 'Already running' };
    }

    // Find Python executable
    const pythonCandidates = ['python', 'python3', 'py'];
    let pythonExe = null;
    for (const candidate of pythonCandidates) {
        try {
            const { execSync } = require('child_process');
            execSync(`${candidate} --version`, { timeout: 3000, stdio: 'ignore' });
            pythonExe = candidate;
            break;
        } catch {}
    }

    if (!pythonExe) {
        return { ok: false, error: 'Python not found. Install Python 3.x to use load cell monitoring.' };
    }

    const bridgePath = path.join(__dirname, 'tools', 'broadweigh', 'bridge.py');
    if (!fs.existsSync(bridgePath)) {
        return { ok: false, error: 'Bridge script not found at: ' + bridgePath };
    }

    try {
        broadweighProcess = spawn(pythonExe, [bridgePath], {
            cwd: path.join(__dirname, 'tools', 'broadweigh'),
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let buffer = '';
        broadweighProcess.stdout.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line.trim());
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('broadweigh-data', data);
                        }
                    } catch {}
                }
            }
        });

        broadweighProcess.stderr.on('data', (chunk) => {
            const msg = chunk.toString().trim();
            if (msg && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('broadweigh-data', { type: 'error', message: msg });
            }
        });

        broadweighProcess.on('exit', (code) => {
            broadweighProcess = null;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('broadweigh-data', { type: 'status', connected: false, reason: `Process exited (code ${code})` });
            }
        });

        broadweighProcess.on('error', (err) => {
            broadweighProcess = null;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('broadweigh-data', { type: 'error', message: err.message });
            }
        });

        return { ok: true };
    } catch (e) {
        broadweighProcess = null;
        return { ok: false, error: e.message };
    }
});

ipcMain.handle('broadweigh-stop', () => {
    if (broadweighProcess) {
        try { broadweighProcess.stdin.write(JSON.stringify({ cmd: 'quit' }) + '\n'); } catch {}
        setTimeout(() => {
            if (broadweighProcess) {
                try { broadweighProcess.kill(); } catch {}
                broadweighProcess = null;
            }
        }, 2000);
    }
    return { ok: true };
});

ipcMain.handle('broadweigh-command', (event, cmd) => {
    if (broadweighProcess && broadweighProcess.stdin.writable) {
        try {
            broadweighProcess.stdin.write(JSON.stringify(cmd) + '\n');
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
    return { ok: false, error: 'Bridge not running' };
});

// Clean up on app quit
app.on('before-quit', () => {
    if (broadweighProcess) {
        try { broadweighProcess.stdin.write(JSON.stringify({ cmd: 'quit' }) + '\n'); } catch {}
        try { broadweighProcess.kill(); } catch {}
        broadweighProcess = null;
    }
});

// ================================================================
// AUTO-UPDATER (checks GitHub Releases)
// ================================================================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateStatus(status, info) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater-status', { status, ...info });
    }
}

autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking', {});
});

autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || '',
    });
});

autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus('up-to-date', { version: info.version });
});

autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('downloading', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
        speed: progress.bytesPerSecond,
    });
});

autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('ready', { version: info.version });
});

autoUpdater.on('error', (err) => {
    sendUpdateStatus('error', { message: err?.message || 'Unknown error' });
});

// IPC: renderer asks to check for updates
ipcMain.handle('updater-check', async () => {
    try {
        const result = await autoUpdater.checkForUpdates();
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
});

// IPC: renderer asks to download the update
ipcMain.handle('updater-download', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
});

// IPC: renderer asks to install and restart
ipcMain.handle('updater-install', () => {
    autoUpdater.quitAndInstall(false, true);
});

// IPC: get current app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
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
