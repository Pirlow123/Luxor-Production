/**
 * Dante / AES67 Monitor — manual device management, routing matrix, clock status, presets
 * Since Dante discovery requires native mDNS/Bonjour (unavailable in Electron renderer),
 * devices are added manually and monitored via HTTP ping.
 */
const DantePage = {

    // ---- Device Database ----
    _devices: [],       // { id, name, ip, txChannels, rxChannels, sampleRate, bitDepth, deviceType }
    _routes: {},        // { "txId-txCh": { "rxId-rxCh": true } }
    _presets: [],       // { id, name, routes, createdAt }
    _clockMasterId: null,
    _pingResults: {},   // { deviceId: { status, latency, lastCheck } }
    _pollTimer: null,
    _pollInterval: 5000,
    _view: 'devices',   // 'devices' | 'matrix' | 'clock'

    _deviceTypes: ['Console', 'Stage Box', 'Amplifier', 'Processor', 'Interface', 'Computer', 'Other'],
    _sampleRates: ['44100', '48000', '96000'],
    _bitDepths: ['16', '24', '32'],

    _storageKeys: {
        devices: 'luxor_dante_devices',
        routes:  'luxor_dante_routes',
        presets: 'luxor_dante_presets',
        clock:   'luxor_dante_clock_master',
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        this._loadData();
        const summary = this._getSummary();

        return `
        <div class="dan-page">
            <div class="dan-header">
                <div style="display:flex;align-items:center;gap:12px;flex:1">
                    <h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-wave-square" style="color:var(--accent);margin-right:8px"></i>Dante / AES67 Monitor</h2>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${this._devices.length} devices</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-sm" onclick="DantePage._pingAll()" title="Ping All"><i class="fas fa-sync-alt"></i> Refresh</button>
                    <button class="btn btn-sm btn-primary" onclick="DantePage._showAddDevice()"><i class="fas fa-plus"></i> Add Device</button>
                </div>
            </div>

            <!-- Summary Bar -->
            <div class="dan-summary">
                <div class="dan-summary-card">
                    <div class="dan-summary-icon" style="color:var(--accent)"><i class="fas fa-microchip"></i></div>
                    <div class="dan-summary-data">
                        <div class="dan-summary-val">${summary.totalDevices}</div>
                        <div class="dan-summary-label">Devices</div>
                    </div>
                </div>
                <div class="dan-summary-card">
                    <div class="dan-summary-icon" style="color:var(--green)"><i class="fas fa-exchange-alt"></i></div>
                    <div class="dan-summary-data">
                        <div class="dan-summary-val">${summary.totalChannels}</div>
                        <div class="dan-summary-label">Total Channels</div>
                    </div>
                </div>
                <div class="dan-summary-card">
                    <div class="dan-summary-icon" style="color:var(--accent)"><i class="fas fa-clock"></i></div>
                    <div class="dan-summary-data">
                        <div class="dan-summary-val">${UI.esc(summary.clockMasterName)}</div>
                        <div class="dan-summary-label">Clock Master</div>
                    </div>
                </div>
                <div class="dan-summary-card">
                    <div class="dan-summary-icon" style="color:${summary.healthPct >= 80 ? 'var(--green)' : summary.healthPct >= 50 ? 'var(--warning, orange)' : 'var(--red)'}"><i class="fas fa-heartbeat"></i></div>
                    <div class="dan-summary-data">
                        <div class="dan-summary-val">${summary.healthPct}<span style="font-size:11px;font-weight:400">%</span></div>
                        <div class="dan-summary-label">Network Health</div>
                    </div>
                </div>
            </div>

            <!-- View Tabs -->
            <div class="dan-tabs">
                <button class="dan-tab ${this._view === 'devices' ? 'active' : ''}" onclick="DantePage._setView('devices')"><i class="fas fa-server"></i> Devices</button>
                <button class="dan-tab ${this._view === 'matrix' ? 'active' : ''}" onclick="DantePage._setView('matrix')"><i class="fas fa-th"></i> Routing Matrix</button>
                <button class="dan-tab ${this._view === 'clock' ? 'active' : ''}" onclick="DantePage._setView('clock')"><i class="fas fa-clock"></i> Clock Status</button>
            </div>

            <!-- View Content -->
            <div class="dan-content" id="dan-content">
                ${this._renderView()}
            </div>
        </div>`;
    },

    _renderView() {
        switch (this._view) {
            case 'devices': return this._renderDevicesView();
            case 'matrix':  return this._renderMatrixView();
            case 'clock':   return this._renderClockView();
            default:        return this._renderDevicesView();
        }
    },

    // ============================================================
    // DEVICES VIEW
    // ============================================================
    _renderDevicesView() {
        if (this._devices.length === 0) {
            return `<div class="dan-empty">
                <i class="fas fa-wave-square" style="font-size:32px;opacity:0.3"></i>
                <p>No Dante devices added.<br>Click <strong>+ Add Device</strong> to register a device manually.</p>
            </div>`;
        }
        return `<div class="dan-grid">${this._devices.map(d => this._renderDeviceCard(d)).join('')}</div>`;
    },

    _renderDeviceCard(d) {
        const ping = this._pingResults[d.id] || {};
        const status = ping.status || 'unknown';
        const statusColor = status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--text-muted)';
        const statusIcon = status === 'online' ? 'fa-check-circle' : status === 'offline' ? 'fa-times-circle' : 'fa-question-circle';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const isMaster = d.id === this._clockMasterId;
        const srLabel = this._formatSampleRate(d.sampleRate);
        const typeIcon = this._deviceTypeIcon(d.deviceType);

        return `
        <div class="dan-card ${status}">
            <div class="dan-card-header">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                    <i class="fas ${statusIcon}" style="color:${statusColor};font-size:14px"></i>
                    <div style="flex:1;min-width:0">
                        <div class="dan-card-name">${UI.esc(d.name)}${isMaster ? ' <span style="color:var(--accent);font-size:9px;font-weight:700">MASTER</span>' : ''}</div>
                        <div class="dan-card-meta"><i class="fas ${typeIcon}" style="margin-right:3px"></i>${UI.esc(d.deviceType)}</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="DantePage._showEditDevice('${d.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="DantePage._removeDevice('${d.id}')" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="dan-card-ip">${UI.esc(d.ip)}</div>
            <div class="dan-card-stats">
                <div class="dan-stat">
                    <div class="dan-stat-val">${d.txChannels}</div>
                    <div class="dan-stat-label">TX Ch</div>
                </div>
                <div class="dan-stat">
                    <div class="dan-stat-val">${d.rxChannels}</div>
                    <div class="dan-stat-label">RX Ch</div>
                </div>
                <div class="dan-stat">
                    <div class="dan-stat-val">${srLabel}</div>
                    <div class="dan-stat-label">Sample Rate</div>
                </div>
                <div class="dan-stat">
                    <div class="dan-stat-val">${d.bitDepth}<span class="dan-stat-unit">bit</span></div>
                    <div class="dan-stat-label">Bit Depth</div>
                </div>
            </div>
            <div class="dan-card-footer">
                <span style="font-size:10px;color:${statusColor}"><i class="fas ${statusIcon}"></i> ${statusLabel}</span>
                ${ping.latency !== undefined ? `<span style="font-size:10px;color:var(--text-muted)">${ping.latency}ms</span>` : ''}
            </div>
        </div>`;
    },

    // ============================================================
    // ROUTING MATRIX VIEW
    // ============================================================
    _renderMatrixView() {
        const txDevices = this._devices.filter(d => d.txChannels > 0);
        const rxDevices = this._devices.filter(d => d.rxChannels > 0);

        if (txDevices.length === 0 || rxDevices.length === 0) {
            return `<div class="dan-empty">
                <i class="fas fa-th" style="font-size:32px;opacity:0.3"></i>
                <p>Need at least one transmitter and one receiver to display routing matrix.</p>
            </div>`;
        }

        // Build TX channel list (columns)
        const txCols = [];
        txDevices.forEach(d => {
            for (let ch = 1; ch <= d.txChannels; ch++) {
                txCols.push({ deviceId: d.id, deviceName: d.name, ch });
            }
        });

        // Build RX channel list (rows)
        const rxRows = [];
        rxDevices.forEach(d => {
            for (let ch = 1; ch <= d.rxChannels; ch++) {
                rxRows.push({ deviceId: d.id, deviceName: d.name, ch });
            }
        });

        // Limit display to prevent massive grids
        const maxCols = 32;
        const maxRows = 32;
        const displayCols = txCols.slice(0, maxCols);
        const displayRows = rxRows.slice(0, maxRows);

        return `
        <div class="dan-matrix-toolbar">
            <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:12px;font-weight:600">Routing Matrix</span>
                <span style="font-size:10px;color:var(--text-muted)">${txCols.length} TX x ${rxRows.length} RX</span>
                ${txCols.length > maxCols || rxRows.length > maxRows ? `<span style="font-size:10px;color:var(--red)">Showing first ${maxCols}x${maxRows}</span>` : ''}
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-sm" onclick="DantePage._clearAllRoutes()"><i class="fas fa-eraser"></i> Clear</button>
                <button class="btn btn-sm" onclick="DantePage._showSavePreset()"><i class="fas fa-save"></i> Save Preset</button>
                <button class="btn btn-sm" onclick="DantePage._showLoadPreset()"><i class="fas fa-folder-open"></i> Load Preset</button>
            </div>
        </div>
        <div class="dan-matrix-wrap">
            <table class="dan-matrix">
                <thead>
                    <tr>
                        <th class="dan-matrix-corner">TX &rarr;<br>&darr; RX</th>
                        ${displayCols.map(c => `<th class="dan-matrix-col-header" title="${UI.esc(c.deviceName)} TX ${c.ch}"><div class="dan-matrix-col-label">${UI.esc(c.deviceName.substring(0, 6))}<br>${c.ch}</div></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${displayRows.map(r => `
                        <tr>
                            <td class="dan-matrix-row-header" title="${UI.esc(r.deviceName)} RX ${r.ch}">${UI.esc(r.deviceName.substring(0, 8))} ${r.ch}</td>
                            ${displayCols.map(c => {
                                const txKey = c.deviceId + '-' + c.ch;
                                const rxKey = r.deviceId + '-' + r.ch;
                                const active = this._routes[txKey] && this._routes[txKey][rxKey];
                                return `<td class="dan-matrix-cell ${active ? 'active' : ''}" onclick="DantePage._toggleRoute('${txKey}','${rxKey}')" title="TX: ${UI.esc(c.deviceName)} ch${c.ch} -> RX: ${UI.esc(r.deviceName)} ch${r.ch}"></td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    },

    // ============================================================
    // CLOCK STATUS VIEW
    // ============================================================
    _renderClockView() {
        const master = this._devices.find(d => d.id === this._clockMasterId);
        const masterSR = master ? this._formatSampleRate(master.sampleRate) : '--';
        const masterStatus = master ? (this._pingResults[master.id]?.status || 'unknown') : 'none';
        const syncColor = masterStatus === 'online' ? 'var(--green)' : masterStatus === 'offline' ? 'var(--red)' : 'var(--text-muted)';
        const syncLabel = masterStatus === 'online' ? 'Synced' : masterStatus === 'offline' ? 'Lost' : 'Unknown';

        return `
        <div class="dan-clock-section">
            <div class="dan-clock-master-card">
                <h3 style="font-size:14px;font-weight:600;margin:0 0 16px 0"><i class="fas fa-clock" style="margin-right:6px;color:var(--accent)"></i>PTP Clock Master</h3>
                <div class="dan-clock-row">
                    <label style="font-size:12px;font-weight:500;min-width:110px">Clock Master</label>
                    <select class="dan-select" onchange="DantePage._setClockMaster(this.value)">
                        <option value="">-- None --</option>
                        ${this._devices.map(d => `<option value="${d.id}" ${d.id === this._clockMasterId ? 'selected' : ''}>${UI.esc(d.name)} (${UI.esc(d.ip)})</option>`).join('')}
                    </select>
                </div>
                <div class="dan-clock-row">
                    <label style="font-size:12px;font-weight:500;min-width:110px">Sample Rate</label>
                    <span style="font-size:13px;font-weight:600">${masterSR}</span>
                </div>
                <div class="dan-clock-row">
                    <label style="font-size:12px;font-weight:500;min-width:110px">Sync Status</label>
                    <span class="dan-sync-badge" style="background:${syncColor}">${syncLabel}</span>
                </div>
            </div>

            <h3 style="font-size:14px;font-weight:600;margin:24px 0 12px 0"><i class="fas fa-network-wired" style="margin-right:6px;color:var(--accent)"></i>Device Clock Status</h3>
            <div class="dan-clock-grid">
                ${this._devices.length === 0 ? '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px">No devices.</div>' : ''}
                ${this._devices.map(d => {
                    const ping = this._pingResults[d.id] || {};
                    const st = ping.status || 'unknown';
                    const isMaster = d.id === this._clockMasterId;
                    const sColor = st === 'online' ? 'var(--green)' : st === 'offline' ? 'var(--red)' : 'var(--text-muted)';
                    const sLabel = isMaster ? 'Master' : (st === 'online' ? 'Slave (Synced)' : st === 'offline' ? 'Offline' : 'Unknown');
                    return `
                    <div class="dan-clock-device">
                        <div style="display:flex;align-items:center;gap:8px">
                            <i class="fas fa-circle" style="font-size:8px;color:${sColor}"></i>
                            <span style="font-weight:600;font-size:12px">${UI.esc(d.name)}</span>
                            ${isMaster ? '<span style="font-size:9px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:8px">MASTER</span>' : ''}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${UI.esc(d.ip)} &mdash; ${this._formatSampleRate(d.sampleRate)} / ${d.bitDepth}bit</div>
                        <div style="font-size:11px;margin-top:4px;color:${sColor}">${sLabel}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    // ============================================================
    // DATA MANAGEMENT
    // ============================================================
    _loadData() {
        try { this._devices = JSON.parse(localStorage.getItem(this._storageKeys.devices)) || []; } catch { this._devices = []; }
        try { this._routes = JSON.parse(localStorage.getItem(this._storageKeys.routes)) || {}; } catch { this._routes = {}; }
        try { this._presets = JSON.parse(localStorage.getItem(this._storageKeys.presets)) || []; } catch { this._presets = []; }
        this._clockMasterId = localStorage.getItem(this._storageKeys.clock) || null;
    },

    _saveDevices() {
        localStorage.setItem(this._storageKeys.devices, JSON.stringify(this._devices));
    },

    _saveRoutes() {
        localStorage.setItem(this._storageKeys.routes, JSON.stringify(this._routes));
    },

    _savePresets() {
        localStorage.setItem(this._storageKeys.presets, JSON.stringify(this._presets));
    },

    _saveClockMaster() {
        if (this._clockMasterId) {
            localStorage.setItem(this._storageKeys.clock, this._clockMasterId);
        } else {
            localStorage.removeItem(this._storageKeys.clock);
        }
    },

    // ============================================================
    // SUMMARY
    // ============================================================
    _getSummary() {
        const totalDevices = this._devices.length;
        const totalChannels = this._devices.reduce((sum, d) => sum + (parseInt(d.txChannels) || 0) + (parseInt(d.rxChannels) || 0), 0);
        const master = this._devices.find(d => d.id === this._clockMasterId);
        const clockMasterName = master ? master.name : 'None';
        const onlineCount = this._devices.filter(d => this._pingResults[d.id]?.status === 'online').length;
        const healthPct = totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0;
        return { totalDevices, totalChannels, clockMasterName, healthPct };
    },

    // ============================================================
    // ADD / EDIT / REMOVE DEVICE
    // ============================================================
    _showAddDevice() {
        const typeOpts = this._deviceTypes.map(t => `<option value="${UI.esc(t)}">${UI.esc(t)}</option>`).join('');
        const srOpts = this._sampleRates.map(sr => `<option value="${sr}" ${sr === '48000' ? 'selected' : ''}>${this._formatSampleRate(sr)}</option>`).join('');
        const bdOpts = this._bitDepths.map(bd => `<option value="${bd}" ${bd === '24' ? 'selected' : ''}>${bd}-bit</option>`).join('');

        const html = `
            <div style="display:flex;flex-direction:column;gap:12px">
                <div><label class="dan-form-label">Device Name</label><input id="dan-add-name" class="dan-input" placeholder="e.g. FOH Console"></div>
                <div><label class="dan-form-label">IP Address</label><input id="dan-add-ip" class="dan-input" placeholder="e.g. 192.168.1.100"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><label class="dan-form-label">TX Channels</label><input id="dan-add-tx" class="dan-input" type="number" min="0" max="512" value="8"></div>
                    <div><label class="dan-form-label">RX Channels</label><input id="dan-add-rx" class="dan-input" type="number" min="0" max="512" value="8"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><label class="dan-form-label">Sample Rate</label><select id="dan-add-sr" class="dan-select">${srOpts}</select></div>
                    <div><label class="dan-form-label">Bit Depth</label><select id="dan-add-bd" class="dan-select">${bdOpts}</select></div>
                </div>
                <div><label class="dan-form-label">Device Type</label><select id="dan-add-type" class="dan-select">${typeOpts}</select></div>
            </div>`;

        UI.openModal('Add Dante Device', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="DantePage._doAddDevice()">Add Device</button>`);
    },

    _doAddDevice() {
        const name = document.getElementById('dan-add-name').value.trim();
        const ip = document.getElementById('dan-add-ip').value.trim();
        const txChannels = parseInt(document.getElementById('dan-add-tx').value) || 0;
        const rxChannels = parseInt(document.getElementById('dan-add-rx').value) || 0;
        const sampleRate = document.getElementById('dan-add-sr').value;
        const bitDepth = document.getElementById('dan-add-bd').value;
        const deviceType = document.getElementById('dan-add-type').value;

        if (!name) { UI.toast('Device name is required', 'error'); return; }
        if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { UI.toast('Valid IP address is required', 'error'); return; }

        const device = {
            id: 'dan-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            name, ip, txChannels, rxChannels, sampleRate, bitDepth, deviceType,
        };
        this._devices.push(device);
        this._saveDevices();
        UI.closeModal();
        UI.toast('Device added: ' + name, 'success');
        this.refresh();
    },

    _showEditDevice(id) {
        const d = this._devices.find(dev => dev.id === id);
        if (!d) return;

        const typeOpts = this._deviceTypes.map(t => `<option value="${UI.esc(t)}" ${d.deviceType === t ? 'selected' : ''}>${UI.esc(t)}</option>`).join('');
        const srOpts = this._sampleRates.map(sr => `<option value="${sr}" ${d.sampleRate === sr ? 'selected' : ''}>${this._formatSampleRate(sr)}</option>`).join('');
        const bdOpts = this._bitDepths.map(bd => `<option value="${bd}" ${d.bitDepth === bd ? 'selected' : ''}>${bd}-bit</option>`).join('');

        const html = `
            <div style="display:flex;flex-direction:column;gap:12px">
                <div><label class="dan-form-label">Device Name</label><input id="dan-edit-name" class="dan-input" value="${UI.esc(d.name)}"></div>
                <div><label class="dan-form-label">IP Address</label><input id="dan-edit-ip" class="dan-input" value="${UI.esc(d.ip)}"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><label class="dan-form-label">TX Channels</label><input id="dan-edit-tx" class="dan-input" type="number" min="0" max="512" value="${d.txChannels}"></div>
                    <div><label class="dan-form-label">RX Channels</label><input id="dan-edit-rx" class="dan-input" type="number" min="0" max="512" value="${d.rxChannels}"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><label class="dan-form-label">Sample Rate</label><select id="dan-edit-sr" class="dan-select">${srOpts}</select></div>
                    <div><label class="dan-form-label">Bit Depth</label><select id="dan-edit-bd" class="dan-select">${bdOpts}</select></div>
                </div>
                <div><label class="dan-form-label">Device Type</label><select id="dan-edit-type" class="dan-select">${typeOpts}</select></div>
            </div>`;

        UI.openModal('Edit Dante Device', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="DantePage._doEditDevice('${id}')">Save Changes</button>`);
    },

    _doEditDevice(id) {
        const d = this._devices.find(dev => dev.id === id);
        if (!d) return;

        const name = document.getElementById('dan-edit-name').value.trim();
        const ip = document.getElementById('dan-edit-ip').value.trim();
        if (!name) { UI.toast('Device name is required', 'error'); return; }
        if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { UI.toast('Valid IP address is required', 'error'); return; }

        d.name = name;
        d.ip = ip;
        d.txChannels = parseInt(document.getElementById('dan-edit-tx').value) || 0;
        d.rxChannels = parseInt(document.getElementById('dan-edit-rx').value) || 0;
        d.sampleRate = document.getElementById('dan-edit-sr').value;
        d.bitDepth = document.getElementById('dan-edit-bd').value;
        d.deviceType = document.getElementById('dan-edit-type').value;

        this._saveDevices();
        UI.closeModal();
        UI.toast('Device updated: ' + name, 'success');
        this.refresh();
    },

    async _removeDevice(id) {
        const d = this._devices.find(dev => dev.id === id);
        if (!d) return;
        const ok = await UI.confirm('Remove Device', `Remove <strong>${UI.esc(d.name)}</strong> (${UI.esc(d.ip)})? This will also remove any routes involving this device.`);
        if (!ok) return;

        this._devices = this._devices.filter(dev => dev.id !== id);
        // Clean up routes referencing this device
        const newRoutes = {};
        for (const txKey of Object.keys(this._routes)) {
            if (txKey.startsWith(id + '-')) continue;
            const inner = {};
            for (const rxKey of Object.keys(this._routes[txKey])) {
                if (!rxKey.startsWith(id + '-')) {
                    inner[rxKey] = true;
                }
            }
            if (Object.keys(inner).length > 0) newRoutes[txKey] = inner;
        }
        this._routes = newRoutes;
        this._saveRoutes();

        if (this._clockMasterId === id) {
            this._clockMasterId = null;
            this._saveClockMaster();
        }
        delete this._pingResults[id];
        this._saveDevices();
        UI.toast('Device removed', 'success');
        this.refresh();
    },

    // ============================================================
    // ROUTING
    // ============================================================
    _toggleRoute(txKey, rxKey) {
        if (!this._routes[txKey]) this._routes[txKey] = {};
        if (this._routes[txKey][rxKey]) {
            delete this._routes[txKey][rxKey];
            if (Object.keys(this._routes[txKey]).length === 0) delete this._routes[txKey];
        } else {
            this._routes[txKey][rxKey] = true;
        }
        this._saveRoutes();
        this._updateContent();
    },

    _clearAllRoutes() {
        this._routes = {};
        this._saveRoutes();
        UI.toast('All routes cleared', 'info');
        this._updateContent();
    },

    // ============================================================
    // PRESETS
    // ============================================================
    _showSavePreset() {
        const html = `
            <div style="display:flex;flex-direction:column;gap:12px">
                <div><label class="dan-form-label">Preset Name</label><input id="dan-preset-name" class="dan-input" placeholder="e.g. Show Day 1"></div>
            </div>`;
        UI.openModal('Save Routing Preset', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="DantePage._doSavePreset()">Save</button>`);
    },

    _doSavePreset() {
        const name = document.getElementById('dan-preset-name').value.trim();
        if (!name) { UI.toast('Preset name is required', 'error'); return; }

        const preset = {
            id: 'pre-' + Date.now(),
            name,
            routes: JSON.parse(JSON.stringify(this._routes)),
            createdAt: new Date().toISOString(),
        };
        this._presets.push(preset);
        this._savePresets();
        UI.closeModal();
        UI.toast('Preset saved: ' + name, 'success');
    },

    _showLoadPreset() {
        if (this._presets.length === 0) {
            UI.toast('No presets saved yet', 'info');
            return;
        }

        const list = this._presets.map(p => {
            const date = new Date(p.createdAt).toLocaleDateString();
            const routeCount = Object.values(p.routes || {}).reduce((sum, inner) => sum + Object.keys(inner).length, 0);
            return `
            <div class="dan-preset-item">
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:12px">${UI.esc(p.name)}</div>
                    <div style="font-size:10px;color:var(--text-muted)">${date} &mdash; ${routeCount} route(s)</div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm btn-primary" style="font-size:10px" onclick="DantePage._doLoadPreset('${p.id}')">Load</button>
                    <button class="btn btn-sm" style="font-size:10px" onclick="DantePage._deletePreset('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');

        UI.openModal('Load Routing Preset', `<div class="dan-preset-list">${list}</div>`,
            `<button class="btn" onclick="UI.closeModal()">Close</button>`);
    },

    _doLoadPreset(presetId) {
        const preset = this._presets.find(p => p.id === presetId);
        if (!preset) return;
        this._routes = JSON.parse(JSON.stringify(preset.routes));
        this._saveRoutes();
        UI.closeModal();
        UI.toast('Preset loaded: ' + preset.name, 'success');
        this._updateContent();
    },

    _deletePreset(presetId) {
        this._presets = this._presets.filter(p => p.id !== presetId);
        this._savePresets();
        UI.toast('Preset deleted', 'info');
        // Re-open the list
        this._showLoadPreset();
    },

    // ============================================================
    // CLOCK
    // ============================================================
    _setClockMaster(id) {
        this._clockMasterId = id || null;
        this._saveClockMaster();
        this._updateContent();
    },

    // ============================================================
    // PING / CONNECTION CHECK
    // ============================================================
    async _pingDevice(device) {
        const start = performance.now();
        let reachable = false;

        try {
            await fetch(`http://${device.ip}/`, { signal: AbortSignal.timeout(4000) });
            reachable = true;
        } catch {
            // Device unreachable
        }

        const latency = Math.round(performance.now() - start);

        this._pingResults[device.id] = {
            status: reachable ? 'online' : 'offline',
            latency: reachable ? latency : undefined,
            lastCheck: Date.now(),
        };
    },

    async _pingAll() {
        const promises = this._devices.map(d => this._pingDevice(d));
        await Promise.allSettled(promises);
        this._updateGrid();
    },

    // ============================================================
    // UI UPDATES (partial DOM updates to avoid full re-render during polling)
    // ============================================================
    _updateGrid() {
        const container = document.getElementById('dan-content');
        if (container && this._view === 'devices') {
            container.innerHTML = this._renderDevicesView();
        }
        // Also update summary
        this._updateSummary();
    },

    _updateContent() {
        const container = document.getElementById('dan-content');
        if (container) {
            container.innerHTML = this._renderView();
        }
    },

    _updateSummary() {
        const cards = document.querySelectorAll('.dan-summary-card');
        if (cards.length < 4) return;
        const summary = this._getSummary();
        // Update health percentage
        const healthVal = cards[3].querySelector('.dan-summary-val');
        if (healthVal) healthVal.innerHTML = `${summary.healthPct}<span style="font-size:11px;font-weight:400">%</span>`;
    },

    // ============================================================
    // HELPERS
    // ============================================================
    _formatSampleRate(sr) {
        const n = parseInt(sr);
        if (n === 44100) return '44.1k';
        if (n === 48000) return '48k';
        if (n === 96000) return '96k';
        return (n / 1000).toFixed(1) + 'k';
    },

    _deviceTypeIcon(type) {
        const map = {
            'Console': 'fa-sliders-h',
            'Stage Box': 'fa-box',
            'Amplifier': 'fa-volume-up',
            'Processor': 'fa-microchip',
            'Interface': 'fa-ethernet',
            'Computer': 'fa-desktop',
            'Other': 'fa-cube',
        };
        return map[type] || 'fa-cube';
    },

    _setView(view) {
        this._view = view;
        this.refresh();
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    renderSidebarList() {
        // Dante page has no sidebar items
    },

    initSidebar() {},

    // ============================================================
    // LIFECYCLE
    // ============================================================
    onActivate() {
        this._loadData();
        this._pingAll();
        this._pollTimer = setInterval(() => this._pingAll(), this._pollInterval);
    },

    onDeactivate() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'dante') {
            container.innerHTML = this.render();
        }
    },
};

// ================================================================
// CSS — injected once
// ================================================================
(function() {
    if (document.getElementById('dante-css')) return;
    const s = document.createElement('style');
    s.id = 'dante-css';
    s.textContent = `
    .dan-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .dan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }

    /* Summary Cards */
    .dan-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .dan-summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .dan-summary-icon { font-size: 22px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); }
    .dan-summary-val { font-size: 24px; font-weight: 700; line-height: 1; }
    .dan-summary-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* View Tabs */
    .dan-tabs { display: flex; gap: 4px; margin-bottom: 20px; }
    .dan-tab { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-muted); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .dan-tab:hover { border-color: var(--accent); color: var(--text-primary); }
    .dan-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Device Grid */
    .dan-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .dan-empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .dan-empty p { margin-top: 12px; font-size: 13px; }

    /* Device Card */
    .dan-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: all 0.2s; }
    .dan-card:hover { border-color: var(--accent); transform: translateY(-1px); }
    .dan-card.offline { border-left: 3px solid var(--red); }
    .dan-card.online { border-left: 3px solid var(--green); }
    .dan-card.unknown { border-left: 3px solid var(--text-muted); }
    .dan-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .dan-card-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dan-card-meta { font-size: 10px; color: var(--text-muted); }
    .dan-card-ip { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px; padding: 3px 8px; background: var(--bg-tertiary); border-radius: 4px; display: inline-block; }
    .dan-card-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
    .dan-stat { text-align: center; }
    .dan-stat-val { font-size: 14px; font-weight: 700; line-height: 1.2; }
    .dan-stat-unit { font-size: 9px; font-weight: 400; opacity: 0.6; }
    .dan-stat-label { font-size: 9px; color: var(--text-muted); }
    .dan-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); }

    /* Routing Matrix */
    .dan-matrix-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .dan-matrix-wrap { overflow: auto; max-height: 600px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; }
    .dan-matrix { border-collapse: collapse; font-size: 10px; }
    .dan-matrix th, .dan-matrix td { border: 1px solid var(--border); padding: 0; text-align: center; }
    .dan-matrix-corner { position: sticky; left: 0; top: 0; z-index: 3; background: var(--bg-tertiary); padding: 6px 8px; font-size: 9px; color: var(--text-muted); min-width: 80px; }
    .dan-matrix-col-header { position: sticky; top: 0; z-index: 2; background: var(--bg-tertiary); padding: 4px 2px; min-width: 36px; max-width: 36px; }
    .dan-matrix-col-label { font-size: 8px; line-height: 1.2; color: var(--text-muted); font-weight: 600; overflow: hidden; }
    .dan-matrix-row-header { position: sticky; left: 0; z-index: 1; background: var(--bg-tertiary); padding: 4px 6px; font-size: 9px; font-weight: 600; color: var(--text-primary); white-space: nowrap; text-align: left; min-width: 80px; }
    .dan-matrix-cell { width: 36px; height: 28px; cursor: pointer; background: var(--bg-secondary); transition: background 0.15s; }
    .dan-matrix-cell:hover { background: var(--bg-tertiary); }
    .dan-matrix-cell.active { background: var(--accent); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.2); }

    /* Clock Status */
    .dan-clock-section { max-width: 800px; }
    .dan-clock-master-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
    .dan-clock-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .dan-clock-row:last-child { border-bottom: none; }
    .dan-clock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .dan-clock-device { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .dan-sync-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; color: #fff; }

    /* Preset list */
    .dan-preset-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
    .dan-preset-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 8px; }

    /* Form elements */
    .dan-form-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
    .dan-input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box; }
    .dan-input:focus { border-color: var(--accent); }
    .dan-select { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box; }
    .dan-select:focus { border-color: var(--accent); }

    @media (max-width: 800px) {
        .dan-summary { grid-template-columns: repeat(2, 1fr); }
        .dan-grid { grid-template-columns: 1fr; }
        .dan-clock-grid { grid-template-columns: 1fr; }
    }
    `;
    document.head.appendChild(s);
})();
