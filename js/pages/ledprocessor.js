/**
 * LED Processor Page — Multi-brand LED processor control
 * Supports Novastar (COEX, VX, NovaPro, MCTRL, J Series),
 * Megapixel (Helios), and
 * Brompton Tessera (SX40, S8, S4, XD, T1, R2)
 * HTTP REST API for COEX/VX/NovaPro/J/Helios/Brompton, TCP hex for MCTRL
 */
const LedProcessorPage = {
    _processors: [],  // { id, name, type, host, port, online }
    _activeProc: null,
    _status: {},
    _isActive: false,
    _pollTimer: null,

    // All supported Novastar processor models grouped by line
    _models: {
        'COEX': [
            { id: 'CX40 Pro', name: 'CX40 Pro', api: 'http', port: 8001, desc: '4-port Ethernet, 4K@60Hz', icon: 'fa-microchip', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'CX80 Pro', name: 'CX80 Pro', api: 'http', port: 8001, desc: '8-port Ethernet, 8K processing', icon: 'fa-microchip', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'MX40 Pro', name: 'MX40 Pro', api: 'http', port: 8001, desc: '4-port, HDR10, 7680×4320', icon: 'fa-microchip', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'MX40 Pro S', name: 'MX40 Pro S', api: 'http', port: 8001, desc: '4-port, compact touring', icon: 'fa-microchip', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
        ],
        'VX Series': [
            { id: 'VX1000', name: 'VX1000', api: 'http', port: 8001, desc: '10x Ethernet, 10.4M pixels', icon: 'fa-server', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'VX600', name: 'VX600', api: 'http', port: 8001, desc: '6x Ethernet, 3.9M pixels', icon: 'fa-server', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'VX400', name: 'VX400', api: 'http', port: 8001, desc: '4x Ethernet, 2.6M pixels', icon: 'fa-server', hasScaler: true, hasHDR: false, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'VX200', name: 'VX200', api: 'http', port: 8001, desc: '2x Ethernet, 1.3M pixels', icon: 'fa-server', hasScaler: true, hasHDR: false, hasGenlock: false, hasMediaPlayer: false, role: 'processor' },
        ],
        'NovaPro': [
            { id: 'NovaPro UHD Jr', name: 'NovaPro UHD Jr', api: 'http', port: 8001, desc: 'All-in-one 4K processor', icon: 'fa-tv', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'NovaPro UHD', name: 'NovaPro UHD', api: 'http', port: 8001, desc: 'Flagship 4K HDR processor', icon: 'fa-tv', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'NovaPro HD', name: 'NovaPro HD', api: 'http', port: 8001, desc: 'Full HD processor', icon: 'fa-tv', hasScaler: true, hasHDR: false, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
        ],
        'MCTRL': [
            { id: 'MCTRL 4K', name: 'MCTRL 4K', api: 'tcp', port: 5200, desc: '4K sending controller, 16x Ethernet + Fiber', icon: 'fa-hdd', hasScaler: false, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'sender' },
            { id: 'MCTRL R5', name: 'MCTRL R5', api: 'tcp', port: 5200, desc: '16x Ethernet, fiber output', icon: 'fa-hdd', hasScaler: false, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'sender' },
            { id: 'MCTRL 660', name: 'MCTRL 660', api: 'tcp', port: 5200, desc: '6x Ethernet, 1.95M pixels', icon: 'fa-hdd', hasScaler: false, hasHDR: false, hasGenlock: false, hasMediaPlayer: false, role: 'sender' },
            { id: 'MCTRL 660 Pro', name: 'MCTRL 660 Pro', api: 'tcp', port: 5200, desc: '6x Ethernet, HDR10, 3.9M', icon: 'fa-hdd', hasScaler: false, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'sender' },
            { id: 'MCTRL 600', name: 'MCTRL 600', api: 'tcp', port: 5200, desc: '6x Ethernet, basic sending controller', icon: 'fa-hdd', hasScaler: false, hasHDR: false, hasGenlock: false, hasMediaPlayer: false, role: 'sender' },
            { id: 'MCTRL 300', name: 'MCTRL 300', api: 'tcp', port: 5200, desc: '1x Ethernet, entry-level sender', icon: 'fa-hdd', hasScaler: false, hasHDR: false, hasGenlock: false, hasMediaPlayer: false, role: 'sender' },
        ],
        'J Series': [
            { id: 'J6', name: 'J6', api: 'http', port: 8001, desc: '6-port multimedia player + sender', icon: 'fa-play-circle', hasScaler: false, hasHDR: true, hasGenlock: false, hasMediaPlayer: true, role: 'player' },
            { id: 'JX1', name: 'JX1', api: 'http', port: 8001, desc: 'Compact multimedia player + sender', icon: 'fa-play-circle', hasScaler: false, hasHDR: false, hasGenlock: false, hasMediaPlayer: true, role: 'player' },
        ],
        'Megapixel': [
            { id: 'Helios', name: 'Helios', api: 'http', port: 80, desc: '8-port, 4K60, HDR, 10-bit LED processor', icon: 'fa-sun', brand: 'megapixel', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
        ],
        'Brompton': [
            { id: 'Tessera SX40', name: 'Tessera SX40', api: 'http', port: 80, desc: '4-port, 4K, flagship processor', icon: 'fa-gem', brand: 'brompton', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'Tessera S8', name: 'Tessera S8', api: 'http', port: 80, desc: '8-port, 4K@60Hz, HDR', icon: 'fa-gem', brand: 'brompton', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'Tessera S4', name: 'Tessera S4', api: 'http', port: 80, desc: '4-port, compact touring processor', icon: 'fa-gem', brand: 'brompton', hasScaler: true, hasHDR: false, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'Tessera XD', name: 'Tessera XD', api: 'http', port: 80, desc: '10-bit, extended data processor', icon: 'fa-gem', brand: 'brompton', hasScaler: true, hasHDR: true, hasGenlock: true, hasMediaPlayer: false, role: 'processor' },
            { id: 'Tessera T1', name: 'Tessera T1', api: 'http', port: 80, desc: '1-port, single link processor', icon: 'fa-gem', brand: 'brompton', hasScaler: false, hasHDR: false, hasGenlock: false, hasMediaPlayer: false, role: 'processor' },
            { id: 'Tessera R2', name: 'Tessera R2', api: 'http', port: 80, desc: 'Receiver card with 2 outputs', icon: 'fa-gem', brand: 'brompton', hasScaler: false, hasHDR: false, hasGenlock: false, hasMediaPlayer: false, role: 'receiver' },
        ],
    },

    render() {
        return `
        <div class="led-page">
            <div class="led-toolbar">
                <div class="led-toolbar-left">
                    <select class="sr-select" id="led-proc-select" onchange="LedProcessorPage.selectProcessor(this.value)">
                        <option value="">-- Select Processor --</option>
                        ${this._processors.map(p => `<option value="${p.id}" ${this._activeProc?.id === p.id ? 'selected' : ''}>${p.virtual ? '\u{1F9EA} ' : ''}${UI.esc(p.name)} (${p.type})</option>`).join('')}
                    </select>
                    <button class="btn btn-xs btn-primary" onclick="LedProcessorPage.showAddProcessor()"><i class="fas fa-plus"></i> Add</button>
                    ${this._activeProc ? `<button class="btn btn-xs" onclick="LedProcessorPage._reconnect()" title="Reconnect"><i class="fas fa-sync-alt"></i> Reconnect</button>` : ''}
                    ${this._activeProc ? `<button class="btn btn-xs btn-danger" onclick="LedProcessorPage.confirmRemoveProcessor()"><i class="fas fa-trash"></i> Remove</button>` : ''}
                </div>
                <div class="led-toolbar-right">
                    ${this._activeProc ? `<span class="led-status ${this._status.online ? 'led-status-on' : 'led-status-off'}">${this._status.online ? 'ONLINE' : 'OFFLINE'}</span>` : ''}
                </div>
            </div>

            ${!this._activeProc ? this._renderEmpty() : this._renderControls()}
        </div>`;
    },

    _renderEmpty() {
        return `
        <div class="sr-empty" style="padding:60px 20px;">
            <i class="fas fa-tv"></i>
            <h2>No LED Processor Selected</h2>
            <p>Add an LED processor (Novastar, Megapixel Helios, Brompton Tessera) to control your LED wall.</p>
            <button class="btn btn-primary" onclick="LedProcessorPage.showAddProcessor()"><i class="fas fa-plus"></i> Add Processor</button>
        </div>`;
    },

    _getBrand(proc) {
        const info = this._getModelInfo(proc?.type);
        if (info?.brand === 'megapixel') return 'megapixel';
        if (info?.brand === 'brompton') return 'brompton';
        return 'novastar';
    },

    _renderControls() {
        const p = this._activeProc;
        const s = this._status;
        const brand = this._getBrand(p);
        return `
        <div class="led-grid">
            <!-- Device Info (all brands) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-info-circle"></i> Device Info</div>
                <div class="led-card-body">
                    <table class="led-info-table">
                        <tr><td>Model</td><td><strong>${UI.esc(p.type)}</strong></td></tr>
                        <tr><td>Brand</td><td>${brand === 'megapixel' ? 'Megapixel' : brand === 'brompton' ? 'Brompton' : 'Novastar'}</td></tr>
                        <tr><td>Host</td><td class="mono">${UI.esc(p.host)}:${p.port}</td></tr>
                        <tr><td>Firmware</td><td class="mono">${UI.esc(s.firmware || '--')}</td></tr>
                        <tr><td>Serial</td><td class="mono">${UI.esc(s.serial || '--')}</td></tr>
                        <tr><td>Status</td><td>${s.online ? '<span style="color:#4ade80">Online</span>' : '<span style="color:#f87171">Offline</span>'}</td></tr>
                        <tr><td>Display Mode</td><td>${UI.esc(s.displayMode || 'Normal')}</td></tr>
                        <tr><td>Outputs</td><td>${s.outputs || '--'}</td></tr>
                        <tr><td>Temperature</td><td class="mono">${s.temperature ? s.temperature + '°C' : '--'}</td></tr>
                        <tr><td>Uptime</td><td class="mono">${s.uptime || '--'}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Brightness (all brands) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-sun"></i> Brightness</div>
                <div class="led-card-body led-card-center">
                    <div class="led-brightness-val" id="led-brightness-val">${s.brightness ?? 100}%</div>
                    <input type="range" class="led-brightness-slider" min="0" max="100" value="${s.brightness ?? 100}"
                        oninput="LedProcessorPage.setBrightness(this.value)">
                    <div class="led-brightness-presets">
                        <button class="led-pbtn" onclick="LedProcessorPage.setBrightness(0)">0%</button>
                        <button class="led-pbtn" onclick="LedProcessorPage.setBrightness(25)">25%</button>
                        <button class="led-pbtn" onclick="LedProcessorPage.setBrightness(50)">50%</button>
                        <button class="led-pbtn" onclick="LedProcessorPage.setBrightness(75)">75%</button>
                        <button class="led-pbtn" onclick="LedProcessorPage.setBrightness(100)">100%</button>
                    </div>
                </div>
            </div>

            <!-- Display Mode (all brands) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-desktop"></i> Display Mode</div>
                <div class="led-card-body">
                    <div class="led-mode-btns">
                        <button class="led-mode-btn ${s.displayMode === 'Normal' ? 'led-mode-active' : ''}" onclick="LedProcessorPage.setDisplayMode('Normal')">
                            <i class="fas fa-play-circle"></i> Normal
                        </button>
                        <button class="led-mode-btn ${s.displayMode === 'Freeze' ? 'led-mode-active-yellow' : ''}" onclick="LedProcessorPage.setDisplayMode('Freeze')">
                            <i class="fas fa-snowflake"></i> Freeze
                        </button>
                        <button class="led-mode-btn ${s.displayMode === 'Blackout' ? 'led-mode-active-red' : ''}" onclick="LedProcessorPage.setDisplayMode('Blackout')">
                            <i class="fas fa-moon"></i> Blackout
                        </button>
                    </div>
                </div>
            </div>

            <!-- Input Source (all brands) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-plug"></i> Input Source</div>
                <div class="led-card-body">
                    <div class="led-input-btns">
                        ${(s.inputs || ['HDMI 1', 'HDMI 2', 'DVI', 'DP 1']).map((inp, i) => `
                            <button class="led-input-btn ${s.activeInput === inp ? 'led-input-active' : ''}" onclick="LedProcessorPage.setInput('${inp}')">
                                <i class="fas fa-${inp.includes('HDMI') ? 'tv' : inp.includes('DP') ? 'display' : inp.includes('SDI') ? 'video' : 'desktop'}"></i>
                                ${inp}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Test Pattern (all brands) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-th"></i> Test Pattern</div>
                <div class="led-card-body">
                    <div class="led-pattern-grid">
                        ${(brand === 'brompton'
                            ? ['Off','White','Red','Green','Blue','Cyan','Magenta','Yellow','Horizontal','Vertical','Grid','Gradient','SMPTE Bars','Custom']
                            : brand === 'megapixel'
                            ? ['Off','White','Red','Green','Blue','Horizontal','Vertical','Gradient','Grid','Crosshatch','Color Bars','Moving']
                            : ['Off','White','Red','Green','Blue','Horizontal','Vertical','Gradient','Grid','Moving']
                        ).map(pat => `
                            <button class="led-pat-btn ${s.testPattern === pat ? 'led-pat-active' : ''}" onclick="LedProcessorPage.setTestPattern('${pat}')" style="${this._patternColor(pat)}">
                                ${pat}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Output Config (all brands, different details) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-th-large"></i> Output Configuration</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Resolution</span>
                            <span class="mono">${s.outputWidth || 3840} x ${s.outputHeight || 2160}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Refresh Rate</span>
                            <span class="mono">${s.refreshRate || 60} Hz</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Bit Depth</span>
                            <span class="mono">${s.bitDepth || 16}-bit</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Color Temp</span>
                            <span class="mono">${s.colorTemp || '6500'}K</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Gamma</span>
                            <input type="range" min="10" max="40" value="${(s.gamma || 2.2) * 10}" class="led-mini-slider"
                                oninput="LedProcessorPage.setGamma(this.value / 10)">
                            <span class="mono" style="min-width:32px">${(s.gamma || 2.2).toFixed(1)}</span>
                        </div>
                        ${brand === 'brompton' ? `
                        <div class="led-out-row">
                            <span class="text-muted">Color Space</span>
                            <span class="mono">${s.colorSpace || 'Rec. 709'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">HDR Mode</span>
                            <span class="mono">${s.hdrMode || 'SDR'}</span>
                        </div>
                        ` : ''}
                        ${brand === 'megapixel' ? `
                        <div class="led-out-row">
                            <span class="text-muted">Color Space</span>
                            <span class="mono">${s.colorSpace || 'Rec. 709'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">HDR</span>
                            <span class="mono">${s.hdrMode || 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Genlock</span>
                            <span class="mono">${s.genlock || 'Internal'}</span>
                        </div>
                        ` : ''}
                        ${brand === 'novastar' ? `
                        <div class="led-out-row">
                            <span class="text-muted">Scaling</span>
                            <span class="mono">${s.scaling || '1:1 Pixel'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Presets (all brands) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-bookmark"></i> Presets</div>
                <div class="led-card-body">
                    <div class="led-preset-list">
                        ${(s.presets || ['Default', 'Show Mode', 'Rehearsal', 'Ambient']).map((pr, i) => `
                            <button class="led-preset-btn ${s.activePreset === pr ? 'led-preset-active' : ''}" onclick="LedProcessorPage.loadPreset('${pr}')">
                                ${pr}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            ${brand === 'megapixel' ? this._renderHeliosCards(s) : ''}
            ${brand === 'brompton' ? this._renderBromptonCards(s) : ''}
            ${brand === 'novastar' ? this._renderNovastarCards(s) : ''}
        </div>`;
    },

    // ================================================================
    // MEGAPIXEL HELIOS — unique features
    // ================================================================
    _renderHeliosCards(s) {
        return `
            <!-- Dynamic Calibration -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-magic" style="color:#00d4ff !important;"></i> Dynamic Calibration</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Calibration</span>
                            <span class="mono" style="color:${s.dynCalEnabled ? '#4ade80' : '#f87171'}">${s.dynCalEnabled ? 'ACTIVE' : 'OFF'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Mode</span>
                            <span class="mono">${s.dynCalMode || 'Standard'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Last Calibrated</span>
                            <span class="mono">${s.lastCalibrated || '--'}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;">
                        <button class="led-pbtn" onclick="LedProcessorPage._heliosAction('toggleDynCal')" style="flex:1;${s.dynCalEnabled ? 'border-color:#4ade80;color:#4ade80;' : ''}">${s.dynCalEnabled ? 'Disable' : 'Enable'} Dyn-Cal</button>
                        <button class="led-pbtn" onclick="LedProcessorPage._heliosAction('recalibrate')" style="flex:1;">Recalibrate</button>
                    </div>
                </div>
            </div>

            <!-- Frame Remapping / Scaling -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-expand-arrows-alt" style="color:#00d4ff !important;"></i> Frame Remap & Scaling</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Scaling Engine</span>
                            <span class="mono">${s.scalingEngine || 'Bilinear'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Frame Remap</span>
                            <span class="mono" style="color:${s.frameRemap ? '#4ade80' : 'var(--text-muted)'}">${s.frameRemap ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Low Latency</span>
                            <span class="mono" style="color:${s.lowLatency ? '#4ade80' : 'var(--text-muted)'}">${s.lowLatency ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Latency</span>
                            <span class="mono">${s.processingLatency || '< 1'} frame</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;">
                        <button class="led-pbtn" onclick="LedProcessorPage._heliosAction('toggleLowLatency')" style="flex:1;${s.lowLatency ? 'border-color:#4ade80;color:#4ade80;' : ''}">
                            ${s.lowLatency ? 'Disable' : 'Enable'} Low Latency
                        </button>
                        <button class="led-pbtn" onclick="LedProcessorPage._heliosAction('toggleFrameRemap')" style="flex:1;">
                            ${s.frameRemap ? 'Disable' : 'Enable'} Remap
                        </button>
                    </div>
                </div>
            </div>

            <!-- Color Management -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-palette" style="color:#00d4ff !important;"></i> Color Management</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Color Space</span>
                            <select class="form-control" style="width:auto;font-size:11px;padding:3px 8px;" onchange="LedProcessorPage._heliosAction('setColorSpace',this.value)">
                                ${['Rec. 709','DCI-P3','Rec. 2020','Custom'].map(cs => `<option ${s.colorSpace === cs ? 'selected' : ''}>${cs}</option>`).join('')}
                            </select>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">HDR Mode</span>
                            <select class="form-control" style="width:auto;font-size:11px;padding:3px 8px;" onchange="LedProcessorPage._heliosAction('setHDR',this.value)">
                                ${['Off','HDR10','HLG','PQ'].map(h => `<option ${s.hdrMode === h ? 'selected' : ''}>${h}</option>`).join('')}
                            </select>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">EDID Mode</span>
                            <span class="mono">${s.edidMode || 'Auto'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">3D LUT</span>
                            <span class="mono" style="color:${s.lut3d ? '#4ade80' : 'var(--text-muted)'}">${s.lut3d || 'None'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Genlock / Sync -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-link" style="color:#00d4ff !important;"></i> Genlock & Sync</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Genlock Source</span>
                            <select class="form-control" style="width:auto;font-size:11px;padding:3px 8px;" onchange="LedProcessorPage._heliosAction('setGenlock',this.value)">
                                ${['Internal','Ext Tri-Level','Ext Black Burst','Input Lock'].map(g => `<option ${s.genlock === g ? 'selected' : ''}>${g}</option>`).join('')}
                            </select>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Genlock Status</span>
                            <span class="mono" style="color:${s.genlockLocked ? '#4ade80' : '#f59e0b'}">${s.genlockLocked ? 'LOCKED' : 'FREE RUN'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Phase Offset</span>
                            <span class="mono">${s.phaseOffset || 0} lines</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ================================================================
    // BROMPTON TESSERA — unique features
    // ================================================================
    _renderBromptonCards(s) {
        return `
            <!-- Tessera Features (ThermaCal, PureTone, ChromaTune) -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-gem" style="color:#e040fb !important;"></i> Tessera Processing</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">ThermaCal</span>
                            <span class="mono" style="color:${s.thermaCal ? '#4ade80' : 'var(--text-muted)'}">${s.thermaCal ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">PureTone</span>
                            <span class="mono" style="color:${s.pureTone ? '#4ade80' : 'var(--text-muted)'}">${s.pureTone ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">ChromaTune</span>
                            <span class="mono" style="color:${s.chromaTune ? '#4ade80' : 'var(--text-muted)'}">${s.chromaTune ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Extended Bit Depth</span>
                            <span class="mono">${s.extBitDepth || 'Standard'}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                        <button class="led-pbtn" onclick="LedProcessorPage._bromptonAction('toggleThermaCal')" style="${s.thermaCal ? 'border-color:#4ade80;color:#4ade80;' : ''}">ThermaCal</button>
                        <button class="led-pbtn" onclick="LedProcessorPage._bromptonAction('togglePureTone')" style="${s.pureTone ? 'border-color:#e040fb;color:#e040fb;' : ''}">PureTone</button>
                        <button class="led-pbtn" onclick="LedProcessorPage._bromptonAction('toggleChromaTune')" style="${s.chromaTune ? 'border-color:#60a5fa;color:#60a5fa;' : ''}">ChromaTune</button>
                    </div>
                </div>
            </div>

            <!-- Dark Magic -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-moon" style="color:#e040fb !important;"></i> Dark Magic</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Dark Magic</span>
                            <span class="mono" style="color:${s.darkMagic ? '#4ade80' : 'var(--text-muted)'}">${s.darkMagic ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Level</span>
                            <input type="range" min="0" max="100" value="${s.darkMagicLevel || 50}" class="led-mini-slider" style="accent-color:#e040fb;"
                                oninput="LedProcessorPage._bromptonAction('setDarkMagicLevel',this.value)">
                            <span class="mono" style="min-width:32px">${s.darkMagicLevel || 50}%</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Low Brightness</span>
                            <span class="mono">${s.lowBrightnessMode || 'Standard'}</span>
                        </div>
                    </div>
                    <div style="margin-top:10px;">
                        <button class="led-pbtn" onclick="LedProcessorPage._bromptonAction('toggleDarkMagic')" style="${s.darkMagic ? 'border-color:#e040fb;color:#e040fb;' : ''}">
                            ${s.darkMagic ? 'Disable' : 'Enable'} Dark Magic
                        </button>
                    </div>
                </div>
            </div>

            <!-- Color & HDR -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-palette" style="color:#e040fb !important;"></i> Color & HDR</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Color Space</span>
                            <select class="form-control" style="width:auto;font-size:11px;padding:3px 8px;" onchange="LedProcessorPage._bromptonAction('setColorSpace',this.value)">
                                ${['Rec. 709','DCI-P3','Rec. 2020','Native'].map(cs => `<option ${s.colorSpace === cs ? 'selected' : ''}>${cs}</option>`).join('')}
                            </select>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">HDR Mode</span>
                            <select class="form-control" style="width:auto;font-size:11px;padding:3px 8px;" onchange="LedProcessorPage._bromptonAction('setHDR',this.value)">
                                ${['SDR','HDR10','HLG','Dolby Vision'].map(h => `<option ${s.hdrMode === h ? 'selected' : ''}>${h}</option>`).join('')}
                            </select>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">3D LUT</span>
                            <span class="mono" style="color:${s.lut3d ? '#4ade80' : 'var(--text-muted)'}">${s.lut3d || 'None'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Peak Luminance</span>
                            <span class="mono">${s.peakLuminance || '--'} nits</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Receiver Card Status -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-sitemap" style="color:#e040fb !important;"></i> Receiver Cards</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Connected</span>
                            <span class="mono">${s.receiverCount || 0} cards</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Status</span>
                            <span class="mono" style="color:${s.receiverErrors ? '#f87171' : '#4ade80'}">${s.receiverErrors ? s.receiverErrors + ' errors' : 'All OK'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Panel Temp (avg)</span>
                            <span class="mono">${s.panelTempAvg || '--'}°C</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Panel Temp (max)</span>
                            <span class="mono" style="color:${(s.panelTempMax || 0) > 55 ? '#f87171' : 'var(--text-primary)'}">${s.panelTempMax || '--'}°C</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Fan Speed</span>
                            <span class="mono">${s.fanSpeed || '--'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Frame Remap -->
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-expand-arrows-alt" style="color:#e040fb !important;"></i> Frame Remap</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Frame Remap</span>
                            <span class="mono" style="color:${s.frameRemap ? '#4ade80' : 'var(--text-muted)'}">${s.frameRemap ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Seam Correction</span>
                            <span class="mono" style="color:${s.seamCorrection ? '#4ade80' : 'var(--text-muted)'}">${s.seamCorrection ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Stacking Mode</span>
                            <span class="mono">${s.stackingMode || 'Off'}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;">
                        <button class="led-pbtn" onclick="LedProcessorPage._bromptonAction('toggleFrameRemap')" style="${s.frameRemap ? 'border-color:#4ade80;color:#4ade80;' : ''}">Frame Remap</button>
                        <button class="led-pbtn" onclick="LedProcessorPage._bromptonAction('toggleSeamCorrection')" style="${s.seamCorrection ? 'border-color:#e040fb;color:#e040fb;' : ''}">Seam Correction</button>
                    </div>
                </div>
            </div>
        `;
    },

    // ================================================================
    // NOVASTAR — unique features
    // ================================================================
    _renderNovastarCards(s) {
        const proc = this._selected;
        const modelInfo = proc ? this._getModelInfo(proc.model) : null;
        const hasScaler = modelInfo?.hasScaler !== false;
        const hasMediaPlayer = modelInfo?.hasMediaPlayer === true;
        const role = modelInfo?.role || 'processor';

        let html = '';

        // Scaling card — only for processors with built-in scalers (NOT MCTRL senders or J Series players)
        if (hasScaler) {
            html += `
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-expand-arrows-alt"></i> Scaling & Mapping</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Scaling Mode</span>
                            <select class="form-control" style="width:auto;font-size:11px;padding:3px 8px;" onchange="LedProcessorPage._novaAction('setScaling',this.value)">
                                ${['1:1 Pixel','Fit','Fill','Custom'].map(sc => `<option ${s.scaling === sc ? 'selected' : ''}>${sc}</option>`).join('')}
                            </select>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Crop</span>
                            <span class="mono">${s.cropX || 0},${s.cropY || 0} — ${s.cropW || s.outputWidth || 3840}x${s.cropH || s.outputHeight || 2160}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Rotation</span>
                            <span class="mono">${s.rotation || 0}°</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // Sending controller info card — for MCTRL series
        if (role === 'sender') {
            html += `
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-arrow-right"></i> Sending Controller</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Role</span>
                            <span style="color:var(--accent);font-weight:600;">Sending Controller</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Note</span>
                            <span class="text-muted" style="font-size:10px;">No built-in scaler — requires external video source at native resolution</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // Media player card — for J Series
        if (hasMediaPlayer) {
            html += `
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-play-circle"></i> Media Player</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Role</span>
                            <span style="color:var(--accent);font-weight:600;">Multimedia Player + Sender</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Internal Playback</span>
                            <span class="mono" style="color:#4ade80;">Supported</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Note</span>
                            <span class="text-muted" style="font-size:10px;">Built-in media playback via USB/network — no external scaler</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // Calibration card — all Novastar models
        html += `
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-wrench"></i> Calibration</div>
                <div class="led-card-body">
                    <div class="led-output-info">
                        <div class="led-out-row">
                            <span class="text-muted">Cabinet Calibration</span>
                            <span class="mono" style="color:${s.cabinetCal ? '#4ade80' : 'var(--text-muted)'}">${s.cabinetCal ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Cab. Temp Comp</span>
                            <span class="mono" style="color:${s.cabTempComp ? '#4ade80' : 'var(--text-muted)'}">${s.cabTempComp ? 'Active' : 'Off'}</span>
                        </div>
                        <div class="led-out-row">
                            <span class="text-muted">Receiving Cards</span>
                            <span class="mono">${s.receivingCards || 0}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;">
                        <button class="led-pbtn" onclick="LedProcessorPage._novaAction('toggleCabinetCal')">
                            ${s.cabinetCal ? 'Disable' : 'Enable'} Cabinet Cal
                        </button>
                    </div>
                </div>
            </div>`;

        // Port Status card — all Novastar models
        html += `
            <div class="led-card">
                <div class="led-card-head"><i class="fas fa-ethernet"></i> Port Status</div>
                <div class="led-card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:4px;">
                        ${(s.portStatus || []).map((port, i) => `
                            <div style="text-align:center;padding:5px 3px;border-radius:5px;border:1px solid ${port.active ? 'rgba(74,222,128,0.3)' : 'var(--border)'};background:${port.active ? 'rgba(74,222,128,0.08)' : 'var(--bg-secondary)'};">
                                <div style="font-size:9px;font-weight:700;color:${port.active ? '#4ade80' : 'var(--text-muted)'};">Port ${i + 1}</div>
                                <div style="font-size:8px;color:var(--text-muted);margin-top:1px;">${port.active ? port.pixels || '--' : 'Off'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;

        return html;
    },

    _patternColor(pat) {
        const colors = { Red: 'border-color:#ef4444', Green: 'border-color:#22c55e', Blue: 'border-color:#3b82f6', White: 'border-color:#e5e5e5' };
        return colors[pat] || '';
    },

    // ================================================================
    // ACTIONS — send to API
    // ================================================================
    async setBrightness(val) {
        const v = parseInt(val);
        this._status.brightness = v;
        const el = document.getElementById('led-brightness-val');
        if (el) el.textContent = `${v}%`;
        // Update slider
        const slider = document.querySelector('.led-brightness-slider');
        if (slider && slider !== document.activeElement) slider.value = v;
        await this._apiCall('PUT', '/screen/brightness', { brightness: v });
        appState.log('EVENT', `LED brightness → ${v}%`, 'LED');
    },

    async setDisplayMode(mode) {
        this._status.displayMode = mode;
        await this._apiCall('PUT', '/device/screen/displaymode', { mode: mode.toLowerCase() });
        UI.toast(`Display mode: ${mode}`, mode === 'Blackout' ? 'warning' : 'info');
        appState.log('EVENT', `LED display mode → ${mode}`, 'LED');
        this.refresh();
    },

    async setInput(input) {
        this._status.activeInput = input;
        await this._apiCall('PUT', '/device/input/source', { source: input });
        UI.toast(`Input: ${input}`, 'success');
        appState.log('EVENT', `LED input → ${input}`, 'LED');
        this.refresh();
    },

    async setTestPattern(pattern) {
        this._status.testPattern = pattern === 'Off' ? null : pattern;
        await this._apiCall('PUT', '/device/screen/controller/pattern/test', { mode: pattern.toLowerCase(), state: pattern !== 'Off' });
        UI.toast(pattern === 'Off' ? 'Test pattern off' : `Test pattern: ${pattern}`, 'info');
        this.refresh();
    },

    async setGamma(val) {
        this._status.gamma = parseFloat(val);
        await this._apiCall('PUT', '/screen/gamma', { gamma: val });
        this.refresh();
    },

    async loadPreset(name) {
        this._status.activePreset = name;
        await this._apiCall('POST', '/preset/current/update', { name });
        UI.toast(`Preset: ${name}`, 'success');
        appState.log('EVENT', `LED preset → ${name}`, 'LED');
        this.refresh();
    },

    // ================================================================
    // HELIOS-SPECIFIC ACTIONS
    // ================================================================
    async _heliosAction(action, value) {
        const s = this._status;
        switch (action) {
            case 'toggleDynCal': s.dynCalEnabled = !s.dynCalEnabled; await this._apiCall('PUT', '/calibration/dynamic', { enabled: s.dynCalEnabled }); break;
            case 'recalibrate': await this._apiCall('POST', '/calibration/recalibrate'); UI.toast('Recalibrating...', 'info'); break;
            case 'toggleLowLatency': s.lowLatency = !s.lowLatency; await this._apiCall('PUT', '/processing/lowlatency', { enabled: s.lowLatency }); break;
            case 'toggleFrameRemap': s.frameRemap = !s.frameRemap; await this._apiCall('PUT', '/output/frameremap', { enabled: s.frameRemap }); break;
            case 'setColorSpace': s.colorSpace = value; await this._apiCall('PUT', '/color/space', { space: value }); break;
            case 'setHDR': s.hdrMode = value; await this._apiCall('PUT', '/color/hdr', { mode: value }); break;
            case 'setGenlock': s.genlock = value; await this._apiCall('PUT', '/sync/genlock', { source: value }); break;
        }
        appState.log('EVENT', `Helios ${action}${value ? ': ' + value : ''}`, 'LED');
        this.refresh();
    },

    // ================================================================
    // BROMPTON-SPECIFIC ACTIONS
    // ================================================================
    async _bromptonAction(action, value) {
        const s = this._status;
        switch (action) {
            case 'toggleThermaCal': s.thermaCal = !s.thermaCal; await this._apiCall('PUT', '/processing/thermacal', { enabled: s.thermaCal }); break;
            case 'togglePureTone': s.pureTone = !s.pureTone; await this._apiCall('PUT', '/processing/puretone', { enabled: s.pureTone }); break;
            case 'toggleChromaTune': s.chromaTune = !s.chromaTune; await this._apiCall('PUT', '/processing/chromatune', { enabled: s.chromaTune }); break;
            case 'toggleDarkMagic': s.darkMagic = !s.darkMagic; await this._apiCall('PUT', '/processing/darkmagic', { enabled: s.darkMagic }); break;
            case 'setDarkMagicLevel': s.darkMagicLevel = parseInt(value); await this._apiCall('PUT', '/processing/darkmagic/level', { level: parseInt(value) }); break;
            case 'setColorSpace': s.colorSpace = value; await this._apiCall('PUT', '/color/space', { space: value }); break;
            case 'setHDR': s.hdrMode = value; await this._apiCall('PUT', '/color/hdr', { mode: value }); break;
            case 'toggleFrameRemap': s.frameRemap = !s.frameRemap; await this._apiCall('PUT', '/output/frameremap', { enabled: s.frameRemap }); break;
            case 'toggleSeamCorrection': s.seamCorrection = !s.seamCorrection; await this._apiCall('PUT', '/output/seamcorrection', { enabled: s.seamCorrection }); break;
        }
        appState.log('EVENT', `Brompton ${action}${value ? ': ' + value : ''}`, 'LED');
        this.refresh();
    },

    // ================================================================
    // NOVASTAR-SPECIFIC ACTIONS
    // ================================================================
    async _novaAction(action, value) {
        const s = this._status;
        switch (action) {
            case 'setScaling': s.scaling = value; await this._apiCall('PUT', '/output/scaling', { mode: value }); break;
            case 'toggleCabinetCal': s.cabinetCal = !s.cabinetCal; await this._apiCall('PUT', '/calibration/cabinet', { enabled: s.cabinetCal }); break;
        }
        appState.log('EVENT', `Novastar ${action}${value ? ': ' + value : ''}`, 'LED');
        this.refresh();
    },

    // ================================================================
    // API CALL — HTTP to processor
    // ================================================================
    async _apiCall(method, path, body) {
        if (!this._activeProc) return;
        if (this._activeProc.virtual) return; // Virtual — no real call
        const url = `http://${this._activeProc.host}:${this._activeProc.port}/api/v1${path}`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });
        } catch (e) {
            // Silently fail — processor might be unreachable
            console.warn('[LED] API call failed:', e.message);
        }
    },

    // ================================================================
    // PROCESSOR MANAGEMENT
    // ================================================================
    _addStep: 'pick', // 'pick' = choose brand, 'product' = choose product, 'config' = enter connection details
    _selectedBrand: null,
    _selectedModel: null,

    // Brand definitions with colors and icons
    _brands: {
        'Novastar': { color: '#f59e0b', icon: 'fa-microchip', lines: ['COEX', 'VX Series', 'NovaPro', 'MCTRL', 'J Series'] },
        'Megapixel': { color: '#00d4ff', icon: 'fa-sun', lines: ['Megapixel'] },
        'Brompton': { color: '#e040fb', icon: 'fa-gem', lines: ['Brompton'] },
    },

    showAddProcessor() {
        this._addStep = 'pick';
        this._selectedBrand = null;
        this._selectedModel = null;
        this._renderAddDialog();
    },

    _renderAddDialog() {
        if (this._addStep === 'pick') {
            // Step 1: Choose Brand
            UI.openModal('Add LED Processor', `
                <div class="led-add-demo" style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04));border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:14px;margin-bottom:20px;text-align:center;">
                    <div style="font-size:12px;color:#f59e0b;font-weight:700;margin-bottom:6px;letter-spacing:0.5px;"><i class="fas fa-flask"></i> DEMO MODE</div>
                    <p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">No hardware? Try a virtual processor.</p>
                    <div style="display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;">
                        <select id="led-demo-brand" class="form-control" style="width:auto;min-width:150px;font-size:12px;padding:6px 10px;" onchange="LedProcessorPage._updateDemoProducts()">
                            <option value="">-- Brand --</option>
                            ${Object.keys(this._brands).map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                        <select id="led-demo-product" class="form-control" style="width:auto;min-width:170px;font-size:12px;padding:6px 10px;" disabled>
                            <option value="">-- Product --</option>
                        </select>
                        <button class="btn btn-xs" onclick="LedProcessorPage._addDemoFromDropdown()" style="background:#d97706;border-color:#d97706;color:#000;font-weight:700;padding:6px 14px;">
                            <i class="fas fa-play"></i> Add Virtual
                        </button>
                    </div>
                </div>
                <div style="text-align:center;color:var(--text-muted);font-size:10px;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;">— or select a brand —</div>
                <div class="led-brand-picker" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                    ${Object.entries(this._brands).map(([brand, info]) => `
                        <button class="led-brand-card" onclick="LedProcessorPage._pickBrand('${brand}')" style="
                            display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;border-radius:12px;
                            border:1px solid var(--border);background:var(--bg-secondary);cursor:pointer;
                            text-align:center;transition:all 0.15s;color:var(--text-primary);
                        " onmouseover="this.style.borderColor='${info.color}';this.style.background='${info.color}12'"
                           onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-secondary)'">
                            <div style="width:52px;height:52px;border-radius:12px;background:${info.color}18;display:flex;align-items:center;justify-content:center;">
                                <i class="fas ${info.icon}" style="color:${info.color};font-size:22px;"></i>
                            </div>
                            <div>
                                <div style="font-size:14px;font-weight:800;">${brand}</div>
                                <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">
                                    ${info.lines.reduce((c, l) => c + (this._models[l]?.length || 0), 0)} models
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>
            `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>`);
        } else if (this._addStep === 'product') {
            // Step 2: Choose Product within brand
            const brand = this._selectedBrand;
            const brandInfo = this._brands[brand];
            const brandLines = brandInfo.lines;
            UI.openModal(`${brand} — Select Product`, `
                <div style="display:flex;align-items:center;gap:12px;padding:14px;background:${brandInfo.color}0a;border:1px solid ${brandInfo.color}40;border-radius:10px;margin-bottom:20px;">
                    <div style="width:44px;height:44px;border-radius:8px;background:${brandInfo.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fas ${brandInfo.icon}" style="color:${brandInfo.color};font-size:20px;"></i>
                    </div>
                    <div>
                        <div style="font-size:16px;font-weight:800;color:var(--text-primary);">${brand}</div>
                        <div style="font-size:11px;color:var(--text-muted);">Select a processor model</div>
                    </div>
                </div>
                <div class="led-model-picker" style="max-height:380px;overflow-y:auto;">
                    ${brandLines.map(line => {
                        const models = this._models[line] || [];
                        if (!models.length) return '';
                        return `
                        <div class="led-model-group">
                            <div style="font-size:10px;font-weight:800;color:${brandInfo.color};text-transform:uppercase;letter-spacing:1px;padding:8px 0 4px;border-bottom:1px solid var(--border);margin-bottom:6px;">
                                ${line}
                            </div>
                            <div class="led-model-cards" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:12px;">
                                ${models.map(m => `
                                    <button class="led-model-card" onclick="LedProcessorPage._pickModel('${m.id}')" style="
                                        display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;
                                        border:1px solid var(--border);background:var(--bg-secondary);cursor:pointer;
                                        text-align:left;transition:all 0.15s;color:var(--text-primary);
                                    " onmouseover="this.style.borderColor='${brandInfo.color}';this.style.background='${brandInfo.color}0a'"
                                       onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-secondary)'">
                                        <div style="width:32px;height:32px;border-radius:6px;background:${brandInfo.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                            <i class="fas ${m.icon}" style="color:${brandInfo.color};font-size:14px;"></i>
                                        </div>
                                        <div style="min-width:0;">
                                            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
                                            <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.desc}</div>
                                        </div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            `, `<button class="btn" onclick="LedProcessorPage._addStep='pick';LedProcessorPage._selectedBrand=null;LedProcessorPage._renderAddDialog()"><i class="fas fa-arrow-left"></i> Back</button>
                <button class="btn" onclick="UI.closeModal()">Cancel</button>`);
        } else {
            // Step 3: Config — enter connection details
            const m = this._selectedModel;
            const modelInfo = this._getModelInfo(m);
            const brand = this._selectedBrand;
            const brandInfo = this._brands[brand] || { color: '#f59e0b', icon: 'fa-microchip' };
            const brandLabel = modelInfo?.brand === 'megapixel' ? 'Megapixel' : modelInfo?.brand === 'brompton' ? 'Brompton Tessera' : 'Novastar';
            UI.openModal('Connect to ' + m, `
                <div style="display:flex;align-items:center;gap:12px;padding:14px;background:${brandInfo.color}0a;border:1px solid ${brandInfo.color}30;border-radius:10px;margin-bottom:20px;">
                    <div style="width:44px;height:44px;border-radius:8px;background:${brandInfo.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fas ${modelInfo?.icon || brandInfo.icon}" style="color:${brandInfo.color};font-size:20px;"></i>
                    </div>
                    <div>
                        <div style="font-size:14px;font-weight:800;color:var(--text-primary);">${m}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${modelInfo?.desc || brandLabel + ' LED Processor'}</div>
                        <span style="display:inline-block;margin-top:4px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;background:${modelInfo?.api === 'tcp' ? 'rgba(168,85,247,0.15);color:#a855f7;' : `${brandInfo.color}18;color:${brandInfo.color};`}">${modelInfo?.api === 'tcp' ? 'TCP PROTOCOL' : 'HTTP API'}</span>
                    </div>
                </div>
                ${UI.formGroup('NAME', `<input class="form-control" id="led-add-name" placeholder="${m} — Main Stage">`)}
                ${UI.formGroup('HOST / IP', '<input class="form-control" id="led-add-host" placeholder="192.168.1.50">')}
                ${UI.formGroup('PORT', `<input class="form-control" type="number" id="led-add-port" value="${modelInfo?.port || 8001}">`, modelInfo?.api === 'tcp' ? 'Default TCP port: 5200' : `Default HTTP port: ${modelInfo?.port || 8001}`)}
            `, `<button class="btn" onclick="LedProcessorPage._addStep='product';LedProcessorPage._renderAddDialog()"><i class="fas fa-arrow-left"></i> Back</button>
                <button class="btn btn-primary" onclick="LedProcessorPage.addProcessor()"><i class="fas fa-plus"></i> Add Processor</button>`);
        }
    },

    _pickBrand(brand) {
        this._selectedBrand = brand;
        this._addStep = 'product';
        this._renderAddDialog();
    },

    _updateDemoProducts() {
        const brandSel = document.getElementById('led-demo-brand');
        const prodSel = document.getElementById('led-demo-product');
        if (!brandSel || !prodSel) return;
        const brand = brandSel.value;
        if (!brand) {
            prodSel.innerHTML = '<option value="">-- Product --</option>';
            prodSel.disabled = true;
            return;
        }
        const brandInfo = this._brands[brand];
        const products = [];
        for (const line of brandInfo.lines) {
            for (const m of (this._models[line] || [])) {
                products.push(m);
            }
        }
        prodSel.innerHTML = '<option value="">-- Product --</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        prodSel.disabled = false;
    },

    _addDemoFromDropdown() {
        const prodSel = document.getElementById('led-demo-product');
        if (!prodSel || !prodSel.value) {
            UI.toast('Select a brand and product first', 'warning');
            return;
        }
        this.addVirtualProcessor(prodSel.value);
    },

    _pickModel(modelId) {
        this._selectedModel = modelId;
        // Ensure brand is set if coming from product step
        if (!this._selectedBrand) {
            const modelInfo = this._getModelInfo(modelId);
            if (modelInfo?.brand === 'megapixel') this._selectedBrand = 'Megapixel Helios';
            else if (modelInfo?.brand === 'brompton') this._selectedBrand = 'Brompton';
            else this._selectedBrand = 'Novastar';
        }
        this._addStep = 'config';
        this._renderAddDialog();
    },

    _getModelInfo(modelId) {
        for (const models of Object.values(this._models)) {
            const found = models.find(m => m.id === modelId);
            if (found) return found;
        }
        return null;
    },

    addProcessor() {
        const type = this._selectedModel;
        const name = document.getElementById('led-add-name').value.trim();
        const host = document.getElementById('led-add-host').value.trim();
        const modelInfo = this._getModelInfo(type);
        const port = parseInt(document.getElementById('led-add-port').value) || (modelInfo?.port || 8001);

        if (!host) { UI.toast('Host/IP is required', 'warning'); return; }

        const proc = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: name || `${type} (${host})`,
            type, host, port, online: false
        };
        this._processors.push(proc);
        this._saveProcessors();
        UI.closeModal();
        UI.toast(`Processor "${proc.name}" added`, 'success');
        this.selectProcessor(proc.id);
        this.refresh();
    },

    addVirtualProcessor(type) {
        const modelInfo = this._getModelInfo(type);
        const proc = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: `Virtual ${type} (Demo)`,
            type, host: 'virtual-led', port: modelInfo?.port || 8001,
            online: true, virtual: true,
        };
        this._processors.push(proc);
        this._saveProcessors();
        UI.closeModal();
        this._activeProc = proc;
        this._status = this._virtualStatus(type);
        UI.toast(`Virtual ${type} added`, 'success');
        this.refresh();
    },

    confirmRemoveProcessor() {
        if (!this._activeProc) return;
        const name = this._activeProc.name;
        UI.openModal('Remove Processor', `
            <p style="text-align:center;padding:12px 0;">
                <i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i>
            </p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(name)}</strong>?</p>
            <p style="text-align:center;font-size:11px;color:var(--text-muted);">This cannot be undone.</p>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="LedProcessorPage.removeProcessor('${this._activeProc.id}');UI.closeModal();UI.toast('Processor removed','info');">Remove</button>`);
    },

    _virtualStatus(type) {
        const specs = {
            'CX40 Pro':       { fw: 'V5.2.0', out: '6x 5G Ethernet + 1x 40G Fiber', inputs: ['HDMI 1','HDMI 2','DP 1','SDI'], w: 4096, h: 2160 },
            'CX80 Pro':       { fw: 'V5.2.0', out: '16x 5G Ethernet + 2x 40G Fiber', inputs: ['HDMI 2.1','DP 1.4','SDI 1','SDI 2','SDI 3','SDI 4'], w: 7680, h: 4320 },
            'MX40 Pro':       { fw: 'V4.8.2', out: '20x Ethernet + 4x 10G Fiber', inputs: ['HDMI 1','HDMI 2','HDMI 3','DP 1','SDI'], w: 3840, h: 2160 },
            'MX40 Pro S':     { fw: 'V4.8.2', out: '20x Ethernet + 4x 10G Fiber', inputs: ['HDMI 1','HDMI 2','DP 1','DP 2'], w: 3840, h: 2160 },
            'VX1000':         { fw: 'V4.6.1', out: '10x Ethernet + 2x 10G Fiber', inputs: ['HDMI 1','HDMI 2','DVI','DP 1','SDI'], w: 10240, h: 8192 },
            'VX600':          { fw: 'V4.6.1', out: '6x Ethernet + 2x 10G Fiber', inputs: ['HDMI 1','HDMI 2','DVI','SDI'], w: 10240, h: 8192 },
            'VX400':          { fw: 'V4.6.1', out: '4x Ethernet + 2x 10G Fiber', inputs: ['HDMI 1','DVI','SDI'], w: 10240, h: 8192 },
            'VX200':          { fw: 'V4.6.1', out: '2x Ethernet', inputs: ['HDMI 1','DVI'], w: 1920, h: 1200 },
            'NovaPro UHD Jr': { fw: 'V4.5.0', out: '16x Ethernet + 4x Fiber', inputs: ['HDMI 1','HDMI 2','DP 1','DVI 1','SDI 1','SDI 2'], w: 16384, h: 8192 },
            'NovaPro UHD':    { fw: 'V4.5.0', out: '16x Ethernet + 4x Fiber', inputs: ['HDMI 1','HDMI 2','DP 1','DVI 1','SDI'], w: 8192, h: 8192 },
            'NovaPro HD':     { fw: 'V3.8.0', out: '4x Ethernet', inputs: ['HDMI 1','DVI','VGA'], w: 1920, h: 1200 },
            'MCTRL 4K':       { fw: 'V3.6.0', out: '16x Ethernet + 4x 10G Fiber', inputs: ['HDMI 1','HDMI 2','DVI 1','DVI 2','DP 1'], w: 7680, h: 7680 },
            'MCTRL R5':       { fw: 'V3.4.0', out: '8x Ethernet + 2x 10G Fiber', inputs: ['HDMI 1','DVI 1','SDI'], w: 3840, h: 3840 },
            'MCTRL 660':      { fw: 'V3.2.0', out: '4x Ethernet', inputs: ['HDMI 1','DVI 1'], w: 3840, h: 3840 },
            'MCTRL 660 Pro':  { fw: 'V3.4.0', out: '4x Ethernet', inputs: ['HDMI 1','HDMI 2','DVI 1','DP 1'], w: 3840, h: 1080 },
            'MCTRL 600':      { fw: 'V3.0.0', out: '6x Ethernet', inputs: ['HDMI 1','DVI 1'], w: 1920, h: 1200 },
            'MCTRL 300':      { fw: 'V2.8.0', out: '2x Ethernet', inputs: ['HDMI 1','DVI 1'], w: 3840, h: 3840 },
            'J6':             { fw: 'V2.1.0', out: '6x Ethernet', inputs: ['Internal','HDMI 1'], w: 3840, h: 2160 },
            'JX1':            { fw: 'V2.0.0', out: '1x Ethernet', inputs: ['Internal','HDMI 1'], w: 1920, h: 1080 },
            // Megapixel Helios
            'Helios':         { fw: 'V3.5.2', out: '8x 10G SFP+ Fiber', inputs: ['HDMI 2.0','DP 1.4','SDI','ST 2110'], w: 8192, h: 4320, bits: 10 },
            // Brompton Tessera
            'Tessera SX40':   { fw: 'V3.4.0', out: '4x 10G Fiber + 4x 10G Copper', inputs: ['HDMI 2.0','12G-SDI'], w: 4096, h: 2160, bits: 12 },
            'Tessera S8':     { fw: 'V3.4.0', out: '8x Ethernet', inputs: ['HDMI 2.0','12G-SDI'], w: 4096, h: 2160, bits: 12 },
            'Tessera S4':     { fw: 'V3.2.0', out: '4x Ethernet', inputs: ['DVI'], w: 1920, h: 1200, bits: 12 },
            'Tessera XD':     { fw: 'V3.2.0', out: '4x Ethernet', inputs: ['HDMI 2.0','DP 1.2','12G-SDI'], w: 3840, h: 2160, bits: 10 },
            'Tessera T1':     { fw: 'V3.0.0', out: '1x Ethernet', inputs: ['HDMI 1.4','DP 1.2'], w: 1920, h: 1200, bits: 10 },
            'Tessera R2':     { fw: 'V2.8.0', out: '2x Ethernet', inputs: ['Data In'], w: 1024, h: 768, bits: 12 },
        };
        const s = specs[type] || specs['MX40 Pro'];
        const modelInfo = this._getModelInfo(type);
        const brand = modelInfo?.brand;

        // Base status (all brands share these)
        const base = {
            online: true,
            firmware: s.fw,
            serial: 'SN-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
            displayMode: 'Normal',
            brightness: 80,
            outputs: s.out,
            activeInput: s.inputs[0],
            inputs: s.inputs,
            testPattern: null,
            outputWidth: s.w,
            outputHeight: s.h,
            refreshRate: 60,
            bitDepth: s.bits || 16,
            colorTemp: 6500,
            gamma: 2.2,
            temperature: Math.floor(Math.random() * 10 + 38),
            uptime: Math.floor(Math.random() * 48 + 1) + 'h ' + Math.floor(Math.random() * 60) + 'm',
            presets: ['Default', 'Show Mode', 'Rehearsal', 'Ambient', 'Outdoor Bright', 'Night Mode'],
            activePreset: 'Default',
        };

        // Megapixel Helios — unique fields
        if (brand === 'megapixel') {
            return { ...base,
                colorSpace: 'Rec. 709', hdrMode: 'Off', genlock: 'Internal', genlockLocked: true, phaseOffset: 0,
                dynCalEnabled: true, dynCalMode: 'Standard', lastCalibrated: '2026-03-28 14:30',
                scalingEngine: 'Bilinear', frameRemap: false, lowLatency: true, processingLatency: '< 1',
                edidMode: 'Auto', lut3d: null,
            };
        }

        // Brompton Tessera — unique fields
        if (brand === 'brompton') {
            return { ...base,
                colorSpace: 'Rec. 709', hdrMode: 'SDR',
                thermaCal: true, pureTone: true, chromaTune: false,
                extBitDepth: '14-bit equivalent',
                darkMagic: true, darkMagicLevel: 65, lowBrightnessMode: 'Standard',
                lut3d: null, peakLuminance: 1200,
                receiverCount: Math.floor(Math.random() * 40 + 20), receiverErrors: 0,
                panelTempAvg: Math.floor(Math.random() * 8 + 36), panelTempMax: Math.floor(Math.random() * 8 + 42),
                fanSpeed: 'Auto',
                frameRemap: false, seamCorrection: true, stackingMode: 'Off',
            };
        }

        // Novastar — unique fields
        const portCount = parseInt((s.out.match(/(\d+)x/) || [0, 4])[1]);
        return { ...base,
            scaling: '1:1 Pixel', cropX: 0, cropY: 0, cropW: s.w, cropH: s.h, rotation: 0,
            cabinetCal: true, cabTempComp: false, receivingCards: Math.floor(Math.random() * 30 + 10),
            portStatus: Array.from({ length: portCount }, (_, i) => ({
                active: i < portCount - 1 || Math.random() > 0.3,
                pixels: (Math.floor(Math.random() * 500 + 200) * 1000).toLocaleString(),
            })),
        };
    },

    async selectProcessor(id) {
        const proc = this._processors.find(p => p.id === id);
        this._activeProc = proc || null;
        if (proc?.virtual) {
            this._status = this._virtualStatus(proc.type);
        } else {
            this._status = { online: false };
            if (proc) await this._fetchStatus();
        }
        this.refresh();
    },

    removeProcessor(id) {
        this._processors = this._processors.filter(p => p.id !== id);
        this._saveProcessors();
        if (this._activeProc?.id === id) {
            this._activeProc = null;
            this._status = {};
        }
        this.refresh();
    },

    async _fetchStatus() {
        if (!this._activeProc || this._activeProc.virtual) return;
        const base = `http://${this._activeProc.host}:${this._activeProc.port}/api/v1`;
        const wasOnline = this._status.online;
        try {
            // Fetch hardware info + brightness + input source in parallel
            const [hwResp, brightResp, inputResp, tempResp] = await Promise.allSettled([
                fetch(`${base}/device/hw`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${base}/device/brightness`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${base}/device/input/source`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${base}/device/temperature`, { signal: AbortSignal.timeout(3000) }),
            ]);

            let online = false;
            const status = { ...this._status };

            if (hwResp.status === 'fulfilled' && hwResp.value.ok) {
                const data = await hwResp.value.json();
                Object.assign(status, { online: true, firmware: data.firmware || status.firmware || '--', model: data.model || status.model, serial: data.serial || status.serial });
                online = true;
            }
            if (brightResp.status === 'fulfilled' && brightResp.value.ok) {
                try { const d = await brightResp.value.json(); status.brightness = d.brightness ?? d.value ?? status.brightness; } catch {}
                online = true;
            }
            if (inputResp.status === 'fulfilled' && inputResp.value.ok) {
                try { const d = await inputResp.value.json(); status.input = d.source ?? d.input ?? status.input; } catch {}
                online = true;
            }
            if (tempResp.status === 'fulfilled' && tempResp.value.ok) {
                try { const d = await tempResp.value.json(); status.temperature = d.temperature ?? d.temp ?? status.temperature; } catch {}
            }

            status.online = online;
            this._status = status;

            // Update the active processor's online flag
            if (this._activeProc) this._activeProc.online = online;

        } catch {
            this._status = { ...this._status, online: false };
            if (this._activeProc) this._activeProc.online = false;
        }

        // Refresh UI if status changed and page is active
        if (wasOnline !== this._status.online) {
            if (this._isActive) this.refresh();
            this._saveProcessors();
        }
        // Always update sidebar dots so status stays current
        if (typeof HippoApp !== 'undefined' && HippoApp.renderLedProcessorList) {
            HippoApp.renderLedProcessorList();
        }
        // Update inline status elements only when page is active
        if (this._isActive) this._updateStatusDisplay();
    },

    _updateStatusDisplay() {
        // Update the online/offline badge
        const badge = document.querySelector('.led-status');
        if (badge) {
            badge.className = `led-status ${this._status.online ? 'led-status-on' : 'led-status-off'}`;
            badge.textContent = this._status.online ? 'ONLINE' : 'OFFLINE';
        }
        // Update brightness display
        const brightEl = document.getElementById('led-brightness-val');
        if (brightEl && this._status.brightness !== undefined) brightEl.textContent = `${this._status.brightness}%`;
        // Update temperature display
        const tempEl = document.getElementById('led-temp-val');
        if (tempEl && this._status.temperature !== undefined) tempEl.textContent = `${this._status.temperature}\u00B0C`;
    },

    async _reconnect() {
        if (!this._activeProc || this._activeProc.virtual) return;
        UI.toast(`Reconnecting to ${this._activeProc.name}...`, 'info');
        await this._fetchStatus();
        this.refresh();
        UI.toast(this._status.online ? `Connected to ${this._activeProc.name}` : `Cannot reach ${this._activeProc.name}`, this._status.online ? 'success' : 'error');
    },

    _saveProcessors() {
        try { localStorage.setItem('luxor_led_processors', JSON.stringify(this._processors)); } catch {}
        // Update sidebar Active LED Processors list
        if (typeof HippoApp !== 'undefined' && HippoApp.renderLedProcessorList) {
            HippoApp.renderLedProcessorList();
        }
    },

    _loadProcessors() {
        try {
            const data = localStorage.getItem('luxor_led_processors');
            if (data) this._processors = JSON.parse(data);
        } catch {}
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'ledprocessor') {
            container.innerHTML = this.render();
        }
    },

    onActivate() {
        this._isActive = true;
        this._loadProcessors();
        this.refresh();
        // Poll status every 5 seconds for live data updates
        if (this._activeProc && !this._activeProc.virtual) this._fetchStatus();
        if (!this._pollTimer) {
            this._pollTimer = setInterval(() => {
                if (this._activeProc && !this._activeProc.virtual) this._fetchStatus();
            }, 5000);
        }
    },

    onDeactivate() {
        this._isActive = false;
        // Timer keeps running in background
    },
};

// ================================================================
// CSS — injected once
// ================================================================
(function() {
    if (document.getElementById('led-page-css')) return;
    const style = document.createElement('style');
    style.id = 'led-page-css';
    style.textContent = `
    .led-page { display: flex; flex-direction: column; gap: 16px; }
    .led-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .led-toolbar-left { display: flex; align-items: center; gap: 8px; }
    .led-toolbar-right { display: flex; align-items: center; gap: 8px; }

    .led-status { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 12px; letter-spacing: 0.5px; }
    .led-status-on { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .led-status-off { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

    .led-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 12px;
        flex: 1;
        overflow-y: auto;
    }

    .led-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
    }
    .led-card-head {
        padding: 10px 14px;
        background: rgba(0,0,0,0.15);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .led-card-head i { color: #f59e0b; }
    .led-card-body { padding: 14px; }
    .led-card-center { display: flex; flex-direction: column; align-items: center; gap: 12px; }

    .led-info-table { width: 100%; }
    .led-info-table td { padding: 4px 0; font-size: 12px; }
    .led-info-table td:first-child { color: var(--text-muted); width: 100px; }

    .led-brightness-val { font-size: 36px; font-weight: 900; font-family: var(--font-mono); color: #f59e0b; }
    .led-brightness-slider { width: 100%; accent-color: #f59e0b; height: 8px; }
    .led-brightness-presets { display: flex; gap: 6px; flex-wrap: wrap; }
    .led-pbtn {
        padding: 5px 14px; border-radius: 6px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 11px; font-weight: 600; transition: all 0.12s;
    }
    .led-pbtn:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }

    .led-mode-btns { display: flex; gap: 8px; }
    .led-mode-btn {
        flex: 1; padding: 14px 10px; border-radius: 8px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 12px; font-weight: 700; text-align: center; transition: all 0.12s;
        display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .led-mode-btn i { font-size: 20px; }
    .led-mode-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
    .led-mode-active { border-color: #4ade80 !important; color: #4ade80 !important; background: rgba(34,197,94,0.1) !important; }
    .led-mode-active-yellow { border-color: #facc15 !important; color: #facc15 !important; background: rgba(250,204,21,0.1) !important; }
    .led-mode-active-red { border-color: #f87171 !important; color: #f87171 !important; background: rgba(248,113,113,0.1) !important; }

    .led-input-btns { display: flex; flex-wrap: wrap; gap: 6px; }
    .led-input-btn {
        padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 11px; font-weight: 600; transition: all 0.12s;
        display: flex; align-items: center; gap: 6px;
    }
    .led-input-btn:hover { border-color: #f59e0b; color: #f59e0b; }
    .led-input-active { border-color: #f59e0b !important; color: #f59e0b !important; background: rgba(245,158,11,0.12) !important; }

    .led-pattern-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .led-pat-btn {
        padding: 8px 6px; border-radius: 6px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 10px; font-weight: 700; text-align: center; transition: all 0.12s;
    }
    .led-pat-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
    .led-pat-active { border-color: #f59e0b !important; color: #f59e0b !important; background: rgba(245,158,11,0.12) !important; }

    .led-output-info { display: flex; flex-direction: column; gap: 10px; }
    .led-out-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
    .led-mini-slider { flex: 1; accent-color: #f59e0b; max-width: 120px; }

    .led-preset-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .led-preset-btn {
        padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 11px; font-weight: 600; transition: all 0.12s;
    }
    .led-preset-btn:hover { border-color: #f59e0b; color: #f59e0b; }
    .led-preset-active { border-color: #f59e0b !important; color: #000 !important; background: #f59e0b !important; }
    `;
    document.head.appendChild(style);
})();
