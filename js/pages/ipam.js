/**
 * IP Address Manager — centralized IP inventory for all networked devices
 * Aggregates devices from PTZ, Network Switches, Lighting, Intercom, LED Processors
 * plus user-defined manual entries. Subnet grouping, conflict detection, VLAN tags, CSV export.
 */
const IpamPage = {

    _devices: [],           // aggregated device list
    _manualEntries: [],     // user-added manual entries (persisted to localStorage)
    _searchQuery: '',
    _groupBySubnet: true,
    _sortBy: 'ip',          // ip, name, type, status

    _STORAGE_KEY: 'luxor_ipam_entries',
    _DISCOVERED_KEY: 'luxor_ipam_discovered',

    // Scanner state
    _scanRunning: false,
    _scanProgress: 0,
    _scanTotal: 0,
    _scanAbort: null,        // AbortController reference
    _discoveredDevices: [],
    _backgroundScanEnabled: false,
    _backgroundScanTimer: null,

    _CATEGORY_LABELS: {
        ptz:      'PTZ Camera',
        network:  'Network Switch',
        lighting: 'Lighting Console',
        intercom: 'Intercom',
        led:      'LED Processor',
        manual:   'Manual',
    },

    _CATEGORY_ICONS: {
        ptz:      'fa-video',
        network:  'fa-network-wired',
        lighting: 'fa-lightbulb',
        intercom: 'fa-headset',
        led:      'fa-microchip',
        manual:   'fa-pen',
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        this._gatherDevices();
        this._loadManualEntries();
        const all = this._getAllDevices();
        const filtered = this._getFiltered(all);
        const summary = this._getSummary(all);
        const conflicts = this._getConflicts(all);
        const subnets = this._getSubnets(filtered);

        return `
        <div class="ipam-page">
            ${this._renderScanner()}

            <div class="ipam-header">
                <div style="display:flex;align-items:center;gap:12px;flex:1">
                    <h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-project-diagram" style="color:var(--accent);margin-right:8px"></i>IP Address Manager</h2>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${all.length} devices</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-sm" onclick="IpamPage._openAddModal()" title="Add Manual Entry"><i class="fas fa-plus"></i> Add Device</button>
                    <button class="btn btn-sm" onclick="IpamPage._exportCSV()" title="Copy CSV to clipboard"><i class="fas fa-file-csv"></i> Export CSV</button>
                    <button class="btn btn-sm" onclick="IpamPage.refresh()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>

            <!-- Summary Bar -->
            <div class="ipam-summary">
                <div class="ipam-summary-card">
                    <div class="ipam-summary-icon" style="color:var(--accent)"><i class="fas fa-server"></i></div>
                    <div class="ipam-summary-data">
                        <div class="ipam-summary-val">${summary.total}</div>
                        <div class="ipam-summary-label">Total Devices</div>
                    </div>
                </div>
                <div class="ipam-summary-card">
                    <div class="ipam-summary-icon" style="color:var(--green)"><i class="fas fa-sitemap"></i></div>
                    <div class="ipam-summary-data">
                        <div class="ipam-summary-val">${summary.subnets}</div>
                        <div class="ipam-summary-label">Subnets</div>
                    </div>
                </div>
                <div class="ipam-summary-card">
                    <div class="ipam-summary-icon" style="color:${summary.conflicts > 0 ? 'var(--red)' : 'var(--green)'}"><i class="fas ${summary.conflicts > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i></div>
                    <div class="ipam-summary-data">
                        <div class="ipam-summary-val">${summary.conflicts}</div>
                        <div class="ipam-summary-label">IP Conflicts</div>
                    </div>
                </div>
                <div class="ipam-summary-card">
                    <div class="ipam-summary-icon" style="color:var(--green)"><i class="fas fa-link"></i></div>
                    <div class="ipam-summary-data">
                        <div class="ipam-summary-val">${summary.connected}</div>
                        <div class="ipam-summary-label">Connected</div>
                    </div>
                </div>
            </div>

            <!-- Search / Filter Bar -->
            <div class="ipam-filters">
                <div style="display:flex;gap:8px;align-items:center;flex:1">
                    <div class="ipam-search-wrap">
                        <i class="fas fa-search ipam-search-icon"></i>
                        <input type="text" class="ipam-search" id="ipam-search" placeholder="Search by name, IP, or type..." value="${UI.esc(this._searchQuery)}" oninput="IpamPage._onSearch(this.value)">
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                    <label class="ipam-toggle" title="Group by subnet">
                        <input type="checkbox" ${this._groupBySubnet ? 'checked' : ''} onchange="IpamPage._toggleGrouping(this.checked)">
                        <span style="font-size:11px;color:var(--text-muted)">Group by Subnet</span>
                    </label>
                    <select class="ipam-sort-select" onchange="IpamPage._setSort(this.value)" title="Sort by">
                        <option value="ip" ${this._sortBy === 'ip' ? 'selected' : ''}>Sort: IP</option>
                        <option value="name" ${this._sortBy === 'name' ? 'selected' : ''}>Sort: Name</option>
                        <option value="type" ${this._sortBy === 'type' ? 'selected' : ''}>Sort: Type</option>
                        <option value="status" ${this._sortBy === 'status' ? 'selected' : ''}>Sort: Status</option>
                    </select>
                </div>
            </div>

            <!-- Device Table -->
            <div class="ipam-table-wrap" id="ipam-table-wrap">
                ${this._renderTable(filtered, subnets, conflicts)}
            </div>
        </div>`;
    },

    // ============================================================
    // NETWORK SCANNER
    // ============================================================
    _renderScanner() {
        this._loadDiscovered();
        const pct = this._scanTotal > 0 ? Math.round((this._scanProgress / this._scanTotal) * 100) : 0;
        const discovered = this._discoveredDevices;

        return `
        <div class="ipam-scanner">
            <div class="ipam-scanner-header">
                <div style="display:flex;align-items:center;gap:10px">
                    <h3 style="margin:0;font-size:15px;font-weight:700"><i class="fas fa-search-location" style="color:var(--accent);margin-right:6px"></i>Network Scanner</h3>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${discovered.length} discovered</span>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                    <label class="ipam-toggle" title="Auto-scan every 60 seconds">
                        <input type="checkbox" id="ipam-bg-scan" ${this._backgroundScanEnabled ? 'checked' : ''} onchange="IpamPage._toggleBackgroundScan(this.checked)">
                        <span style="font-size:11px;color:var(--text-muted)">Auto-scan (60s)</span>
                    </label>
                    ${discovered.length > 0 ? `<button class="btn btn-xs" onclick="IpamPage._clearDiscovered()" title="Clear discovered"><i class="fas fa-eraser"></i> Clear</button>` : ''}
                </div>
            </div>

            <div class="ipam-scanner-controls">
                <div class="ipam-scanner-input-row">
                    <div class="ipam-scanner-input-wrap">
                        <i class="fas fa-network-wired ipam-scanner-input-icon"></i>
                        <input type="text" class="ipam-scanner-input" id="ipam-scan-range" placeholder="e.g. 192.168.1.1-254" value="192.168.1.1-254">
                    </div>
                    ${this._scanRunning
                        ? `<button class="btn btn-sm" style="background:var(--red);border-color:var(--red)" onclick="IpamPage._stopScan()"><i class="fas fa-stop"></i> Stop</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="IpamPage._startScan()"><i class="fas fa-play"></i> Scan Network</button>`
                    }
                </div>
                <div class="ipam-scanner-presets">
                    <span style="font-size:10px;color:var(--text-muted);margin-right:4px">Presets:</span>
                    <button class="ipam-preset-btn" onclick="IpamPage._setPreset('192.168.1')">192.168.1.x</button>
                    <button class="ipam-preset-btn" onclick="IpamPage._setPreset('192.168.0')">192.168.0.x</button>
                    <button class="ipam-preset-btn" onclick="IpamPage._setPreset('10.0.0')">10.0.0.x</button>
                    <button class="ipam-preset-btn" onclick="IpamPage._setPreset('172.16.0')">172.16.0.x</button>
                </div>
            </div>

            ${this._scanRunning || this._scanProgress > 0 ? `
            <div class="ipam-scanner-progress">
                <div class="ipam-progress-bar">
                    <div class="ipam-progress-fill" style="width:${pct}%"></div>
                </div>
                <span class="ipam-progress-text">${this._scanRunning ? 'Scanning...' : 'Complete'} ${this._scanProgress}/${this._scanTotal} (${pct}%)</span>
            </div>` : ''}

            ${discovered.length > 0 ? `
            <div class="ipam-discovered-section" id="ipam-discovered-section">
                <div class="ipam-discovered-header">Discovered Devices</div>
                <div class="ipam-discovered-list">
                    ${discovered.map((d, i) => `
                    <div class="ipam-discovered-row">
                        <div class="ipam-discovered-ip"><code>${UI.esc(d.ip)}</code></div>
                        <div class="ipam-discovered-latency"><i class="fas fa-clock" style="opacity:0.4;margin-right:3px"></i>${d.latency}ms</div>
                        <div class="ipam-discovered-status"><span class="ipam-http-badge ipam-http-${Math.floor(d.status / 100)}xx">${d.status}</span></div>
                        <div class="ipam-discovered-server" title="${UI.esc(d.server || '')}">${UI.esc(d.server || '--')}</div>
                        <div class="ipam-discovered-type">${d.detectedType ? `<span class="ipam-type-badge">${UI.esc(d.detectedType)}</span>` : ''}</div>
                        <div class="ipam-discovered-actions">
                            <button class="btn btn-xs btn-primary" onclick="IpamPage._addDiscoveredToIPAM(${i})" title="Add to IPAM"><i class="fas fa-plus"></i> Add to IPAM</button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : ''}
        </div>`;
    },

    _setPreset(base) {
        const input = document.getElementById('ipam-scan-range');
        if (input) input.value = base + '.1-254';
    },

    _parseRange(rangeStr) {
        // Parse "192.168.1.1-254" or "10.0.0.1-254"
        const str = (rangeStr || '').trim();
        const match = str.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{1,3})-(\d{1,3})$/);
        if (!match) return null;
        const base = match[1];
        const start = parseInt(match[2], 10);
        const end = parseInt(match[3], 10);
        if (start < 0 || start > 255 || end < 0 || end > 255 || start > end) return null;
        // validate base octets
        const octets = base.split('.');
        if (octets.some(o => { const n = parseInt(o, 10); return isNaN(n) || n < 0 || n > 255; })) return null;
        const ips = [];
        for (let i = start; i <= end; i++) {
            ips.push(base + '.' + i);
        }
        return ips;
    },

    async _startScan() {
        const input = document.getElementById('ipam-scan-range');
        const range = input ? input.value : '192.168.1.1-254';
        const ips = this._parseRange(range);
        if (!ips || ips.length === 0) {
            UI.toast('Invalid IP range. Use format like 192.168.1.1-254', 'error');
            return;
        }

        this._scanRunning = true;
        this._scanProgress = 0;
        this._scanTotal = ips.length;
        this._scanAbort = new AbortController();
        this._discoveredDevices = [];
        this._refreshScannerUI();
        UI.toast('Scanning ' + ips.length + ' addresses...', 'info');

        const BATCH_SIZE = 20;
        const TIMEOUT = 1500;
        const signal = this._scanAbort.signal;

        for (let i = 0; i < ips.length; i += BATCH_SIZE) {
            if (signal.aborted) break;
            const batch = ips.slice(i, i + BATCH_SIZE);
            const promises = batch.map(ip => this._probeIP(ip, TIMEOUT, signal));
            const results = await Promise.allSettled(promises);

            results.forEach(r => {
                if (r.status === 'fulfilled' && r.value) {
                    this._discoveredDevices.push(r.value);
                }
            });

            this._scanProgress = Math.min(i + BATCH_SIZE, ips.length);
            this._refreshScannerUI();
        }

        this._scanRunning = false;
        this._saveDiscovered();
        this._refreshScannerUI();

        if (!signal.aborted) {
            UI.toast('Scan complete. Found ' + this._discoveredDevices.length + ' device(s).', 'success');
            // Run device type detection on discovered devices
            this._detectDeviceTypes();
        }
    },

    _stopScan() {
        if (this._scanAbort) {
            this._scanAbort.abort();
        }
        this._scanRunning = false;
        this._refreshScannerUI();
        UI.toast('Scan stopped.', 'info');
    },

    async _probeIP(ip, timeout, signal) {
        const start = performance.now();
        try {
            const controller = new AbortController();
            const combinedSignal = signal;
            const timer = setTimeout(() => controller.abort(), timeout);

            // Listen for parent abort
            const onAbort = () => controller.abort();
            signal.addEventListener('abort', onAbort, { once: true });

            const response = await fetch('http://' + ip + '/', {
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal,
                cache: 'no-store',
            }).catch(async () => {
                // no-cors gives opaque responses; try with cors to get status
                return fetch('http://' + ip + '/', {
                    method: 'HEAD',
                    signal: controller.signal,
                    cache: 'no-store',
                }).catch(() => null);
            });

            clearTimeout(timer);
            signal.removeEventListener('abort', onAbort);

            const latency = Math.round(performance.now() - start);

            if (response) {
                // An opaque response (type === 'opaque') means something responded
                const status = response.type === 'opaque' ? 200 : (response.status || 0);
                const server = (response.headers && response.headers.get('server')) || '';
                return { ip, latency, status, server, detectedType: '' };
            }
            return null;
        } catch (e) {
            // If the fetch was aborted by the user, return null
            if (e.name === 'AbortError') return null;
            // A network error with a short latency means nothing there; long latency = maybe firewall
            const latency = Math.round(performance.now() - start);
            if (latency > timeout * 0.5) {
                // Possible device behind firewall - still count it
                return { ip, latency, status: 0, server: 'timeout/filtered', detectedType: '' };
            }
            return null;
        }
    },

    async _detectDeviceTypes() {
        const TIMEOUT = 2000;
        for (const dev of this._discoveredDevices) {
            if (!dev || dev.detectedType) continue;
            // Try known endpoints
            try {
                const checks = [
                    { url: 'http://' + dev.ip + '/api/system/info', type: 'Luminex' },
                    { url: 'http://' + dev.ip + '/cgi-bin/aw_ptz', type: 'Panasonic PTZ' },
                    { url: 'http://' + dev.ip + ':4430/', type: 'Avolites Titan' },
                ];
                for (const check of checks) {
                    try {
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), TIMEOUT);
                        const r = await fetch(check.url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' }).catch(() => null);
                        clearTimeout(timer);
                        if (r && (r.ok || r.status === 401 || r.status === 403 || r.status === 404)) {
                            dev.detectedType = check.type;
                            break;
                        }
                    } catch (_) { /* ignore */ }
                }
            } catch (_) { /* ignore */ }
        }
        this._saveDiscovered();
        this._refreshScannerUI();
    },

    _addDiscoveredToIPAM(index) {
        const dev = this._discoveredDevices[index];
        if (!dev) return;
        // Check if already in manual entries
        if (this._manualEntries.some(e => e.ip === dev.ip)) {
            UI.toast('Device ' + dev.ip + ' is already in IPAM.', 'info');
            return;
        }
        const name = dev.detectedType
            ? dev.detectedType + ' (' + dev.ip + ')'
            : 'Discovered Device (' + dev.ip + ')';
        const entry = {
            id: 'manual-' + Date.now() + '-' + index,
            name: name,
            ip: dev.ip,
            subnetMask: '255.255.255.0',
            mac: '',
            vlan: '',
            connected: true,
        };
        this._manualEntries.push(entry);
        this._saveManualEntries();
        UI.toast('Added ' + dev.ip + ' to IPAM.', 'success');
        this.refresh();
    },

    _clearDiscovered() {
        this._discoveredDevices = [];
        this._scanProgress = 0;
        this._scanTotal = 0;
        this._saveDiscovered();
        this._refreshScannerUI();
        UI.toast('Discovered devices cleared.', 'info');
    },

    _loadDiscovered() {
        if (this._discoveredDevices.length > 0) return; // already loaded
        try {
            const raw = localStorage.getItem(this._DISCOVERED_KEY);
            this._discoveredDevices = raw ? JSON.parse(raw) : [];
        } catch (_) {
            this._discoveredDevices = [];
        }
    },

    _saveDiscovered() {
        localStorage.setItem(this._DISCOVERED_KEY, JSON.stringify(this._discoveredDevices));
    },

    _toggleBackgroundScan(enabled) {
        this._backgroundScanEnabled = enabled;
        if (enabled) {
            UI.toast('Background scan enabled (every 60s).', 'info');
            this._backgroundScanTimer = setInterval(() => {
                if (!this._scanRunning) {
                    this._startScan();
                }
            }, 60000);
        } else {
            if (this._backgroundScanTimer) {
                clearInterval(this._backgroundScanTimer);
                this._backgroundScanTimer = null;
            }
            UI.toast('Background scan disabled.', 'info');
        }
    },

    _refreshScannerUI() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'ipam') {
            // Re-render only the scanner section to avoid losing table state
            const scannerEl = container.querySelector('.ipam-scanner');
            if (scannerEl) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this._renderScanner();
                const newScanner = tempDiv.firstElementChild;
                scannerEl.replaceWith(newScanner);
                return;
            }
        }
    },

    // ============================================================
    // TABLE RENDERING
    // ============================================================
    _renderTable(filtered, subnets, conflicts) {
        if (filtered.length === 0) {
            return `<div class="ipam-empty"><i class="fas fa-inbox" style="font-size:32px;opacity:0.3"></i><p>No devices found. Add devices via other pages or click <b>Add Device</b>.</p></div>`;
        }

        if (this._groupBySubnet) {
            return Object.keys(subnets).sort().map(subnet => {
                const devices = subnets[subnet];
                return `
                <div class="ipam-subnet-group">
                    <div class="ipam-subnet-header">
                        <span class="ipam-subnet-badge">${UI.esc(subnet)}</span>
                        <span class="ipam-subnet-count">${devices.length} device${devices.length !== 1 ? 's' : ''}</span>
                    </div>
                    ${this._renderTableRows(devices, conflicts)}
                </div>`;
            }).join('');
        }

        return this._renderTableRows(filtered, conflicts);
    },

    _renderTableRows(devices, conflicts) {
        const header = `
        <div class="ipam-row ipam-row-header">
            <div class="ipam-col-status"></div>
            <div class="ipam-col-name">Name</div>
            <div class="ipam-col-ip">IP Address</div>
            <div class="ipam-col-subnet">Subnet</div>
            <div class="ipam-col-type">Type</div>
            <div class="ipam-col-mac">MAC</div>
            <div class="ipam-col-vlan">VLAN</div>
            <div class="ipam-col-actions"></div>
        </div>`;

        const rows = devices.map(d => {
            const hasConflict = conflicts.has(d.ip);
            const isConnected = d.connected;
            const statusIcon = hasConflict
                ? '<i class="fas fa-exclamation-triangle" style="color:var(--red)" title="IP Conflict"></i>'
                : isConnected
                    ? '<i class="fas fa-circle" style="color:var(--green);font-size:8px" title="Connected"></i>'
                    : '<i class="fas fa-circle" style="color:var(--text-muted);font-size:8px" title="Disconnected"></i>';
            const catIcon = this._CATEGORY_ICONS[d.category] || 'fa-question';
            const catLabel = this._CATEGORY_LABELS[d.category] || d.category;
            const isManual = d.category === 'manual';

            return `
            <div class="ipam-row ${hasConflict ? 'ipam-row-conflict' : ''} ${!isConnected ? 'ipam-row-offline' : ''}">
                <div class="ipam-col-status">${statusIcon}</div>
                <div class="ipam-col-name" title="${UI.esc(d.name)}">${UI.esc(d.name)}</div>
                <div class="ipam-col-ip"><code>${UI.esc(d.ip)}</code></div>
                <div class="ipam-col-subnet"><code>${UI.esc(d.subnet)}</code></div>
                <div class="ipam-col-type"><i class="fas ${catIcon}" style="margin-right:4px;opacity:0.6"></i>${UI.esc(catLabel)}</div>
                <div class="ipam-col-mac"><code>${UI.esc(d.mac || '--')}</code></div>
                <div class="ipam-col-vlan">${d.vlan ? '<span class="ipam-vlan-tag">' + UI.esc(String(d.vlan)) + '</span>' : '<span style="color:var(--text-muted)">--</span>'}</div>
                <div class="ipam-col-actions">${isManual ? `
                    <button class="btn btn-xs" onclick="IpamPage._editEntry('${UI.esc(d.id)}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-xs" onclick="IpamPage._deleteEntry('${UI.esc(d.id)}')" title="Delete"><i class="fas fa-trash"></i></button>` : `
                    <button class="btn btn-xs" onclick="IpamPage._editVlan('${UI.esc(d.id)}')" title="Set VLAN"><i class="fas fa-tag"></i></button>`}
                </div>
            </div>`;
        }).join('');

        return header + rows;
    },

    // ============================================================
    // DATA GATHERING
    // ============================================================
    _gatherDevices() {
        this._devices = [];

        // PTZ Cameras
        const cams = (typeof PtzPage !== 'undefined' && PtzPage._cameras) || [];
        cams.forEach(c => {
            if (c.virtual) return;
            this._devices.push({
                id: 'ptz-' + c.id, name: c.name, ip: c.ip || '', model: c.model,
                category: 'ptz', connected: !!c.connected, mac: c.mac || (c.status && c.status.mac) || '',
                vlan: c.vlan || '', subnet: this._extractSubnet(c.ip),
            });
        });

        // Network Switches
        const switches = (typeof NetSwitchPage !== 'undefined' && NetSwitchPage._switches) || [];
        switches.forEach(s => {
            if (s.virtual) return;
            this._devices.push({
                id: 'net-' + s.id, name: s.name, ip: s.ip || '', model: s.model,
                category: 'network', connected: !!s.connected, mac: s.mac || (s.status && s.status.mac) || '',
                vlan: s.vlan || '', subnet: this._extractSubnet(s.ip),
            });
        });

        // Lighting Consoles
        const consoles = (typeof LightingPage !== 'undefined' && LightingPage._consoles) || [];
        consoles.forEach(c => {
            if (c.virtual) return;
            this._devices.push({
                id: 'light-' + c.id, name: c.name, ip: c.ip || '', model: c.model,
                category: 'lighting', connected: !!c.connected, mac: c.mac || (c.status && c.status.mac) || '',
                vlan: c.vlan || '', subnet: this._extractSubnet(c.ip),
            });
        });

        // Intercom Systems
        const systems = (typeof IntercomPage !== 'undefined' && IntercomPage._systems) || [];
        systems.forEach(s => {
            if (s.virtual) return;
            this._devices.push({
                id: 'icom-' + s.id, name: s.name, ip: s.ip || '', model: s.model,
                category: 'intercom', connected: !!s.connected, mac: s.mac || (s.status && s.status.mac) || '',
                vlan: s.vlan || '', subnet: this._extractSubnet(s.ip),
            });
        });

        // LED Processors
        const procs = (typeof LedProcessorPage !== 'undefined' && LedProcessorPage._processors) || [];
        procs.forEach(p => {
            if (p.virtual) return;
            const ip = p.host || p.ip || '';
            this._devices.push({
                id: 'led-' + p.id, name: p.name, ip: ip, model: p.type,
                category: 'led', connected: !!p.online, mac: p.mac || (p.status && p.status.mac) || '',
                vlan: p.vlan || '', subnet: this._extractSubnet(ip),
            });
        });
    },

    // ============================================================
    // MANUAL ENTRIES (localStorage)
    // ============================================================
    _loadManualEntries() {
        try {
            const raw = localStorage.getItem(this._STORAGE_KEY);
            this._manualEntries = raw ? JSON.parse(raw) : [];
        } catch (_) {
            this._manualEntries = [];
        }
    },

    _saveManualEntries() {
        localStorage.setItem(this._STORAGE_KEY, JSON.stringify(this._manualEntries));
    },

    _openAddModal() {
        const body = `
            <div class="form-group"><label class="form-label">Device Name</label>
                <input type="text" class="form-control" id="ipam-m-name" placeholder="e.g. Stage Left Router">
            </div>
            <div class="form-group"><label class="form-label">IP Address</label>
                <input type="text" class="form-control" id="ipam-m-ip" placeholder="e.g. 192.168.1.100">
            </div>
            <div class="form-group"><label class="form-label">Subnet Mask</label>
                <input type="text" class="form-control" id="ipam-m-subnet" placeholder="e.g. 255.255.255.0" value="255.255.255.0">
            </div>
            <div class="form-group"><label class="form-label">MAC Address (optional)</label>
                <input type="text" class="form-control" id="ipam-m-mac" placeholder="e.g. AA:BB:CC:DD:EE:FF">
            </div>
            <div class="form-group"><label class="form-label">VLAN (optional)</label>
                <input type="number" class="form-control" id="ipam-m-vlan" placeholder="e.g. 10">
            </div>`;
        const footer = `<button class="btn btn-primary" onclick="IpamPage._addEntryConfirm()">Add Device</button>`;
        UI.openModal('Add Manual Device', body, footer);
    },

    _addEntryConfirm() {
        const name = (document.getElementById('ipam-m-name')?.value || '').trim();
        const ip = (document.getElementById('ipam-m-ip')?.value || '').trim();
        const subnetMask = (document.getElementById('ipam-m-subnet')?.value || '255.255.255.0').trim();
        const mac = (document.getElementById('ipam-m-mac')?.value || '').trim();
        const vlan = (document.getElementById('ipam-m-vlan')?.value || '').trim();

        if (!name || !ip) {
            UI.toast('Name and IP address are required.', 'error');
            return;
        }
        if (!this._isValidIP(ip)) {
            UI.toast('Invalid IP address format.', 'error');
            return;
        }

        const entry = {
            id: 'manual-' + Date.now(),
            name, ip, subnetMask, mac, vlan: vlan ? parseInt(vlan, 10) : '',
            connected: true,
        };
        this._manualEntries.push(entry);
        this._saveManualEntries();
        if (typeof UI.closeModal === 'function') UI.closeModal();
        UI.toast('Device added.', 'success');
        this.refresh();
    },

    _editEntry(id) {
        const entry = this._manualEntries.find(e => e.id === id);
        if (!entry) return;

        const body = `
            <div class="form-group"><label class="form-label">Device Name</label>
                <input type="text" class="form-control" id="ipam-m-name" value="${UI.esc(entry.name)}">
            </div>
            <div class="form-group"><label class="form-label">IP Address</label>
                <input type="text" class="form-control" id="ipam-m-ip" value="${UI.esc(entry.ip)}">
            </div>
            <div class="form-group"><label class="form-label">Subnet Mask</label>
                <input type="text" class="form-control" id="ipam-m-subnet" value="${UI.esc(entry.subnetMask || '255.255.255.0')}">
            </div>
            <div class="form-group"><label class="form-label">MAC Address (optional)</label>
                <input type="text" class="form-control" id="ipam-m-mac" value="${UI.esc(entry.mac || '')}">
            </div>
            <div class="form-group"><label class="form-label">VLAN (optional)</label>
                <input type="number" class="form-control" id="ipam-m-vlan" value="${entry.vlan || ''}">
            </div>`;
        const footer = `<button class="btn btn-primary" onclick="IpamPage._updateEntryConfirm('${UI.esc(id)}')">Save Changes</button>`;
        UI.openModal('Edit Device', body, footer);
    },

    _updateEntryConfirm(id) {
        const entry = this._manualEntries.find(e => e.id === id);
        if (!entry) return;
        const name = (document.getElementById('ipam-m-name')?.value || '').trim();
        const ip = (document.getElementById('ipam-m-ip')?.value || '').trim();
        if (!name || !ip) { UI.toast('Name and IP are required.', 'error'); return; }
        if (!this._isValidIP(ip)) { UI.toast('Invalid IP address format.', 'error'); return; }

        entry.name = name;
        entry.ip = ip;
        entry.subnetMask = (document.getElementById('ipam-m-subnet')?.value || '255.255.255.0').trim();
        entry.mac = (document.getElementById('ipam-m-mac')?.value || '').trim();
        const vlan = (document.getElementById('ipam-m-vlan')?.value || '').trim();
        entry.vlan = vlan ? parseInt(vlan, 10) : '';

        this._saveManualEntries();
        if (typeof UI.closeModal === 'function') UI.closeModal();
        UI.toast('Device updated.', 'success');
        this.refresh();
    },

    _deleteEntry(id) {
        this._manualEntries = this._manualEntries.filter(e => e.id !== id);
        this._saveManualEntries();
        UI.toast('Device removed.', 'success');
        this.refresh();
    },

    // ============================================================
    // VLAN EDITING (for aggregated devices)
    // ============================================================
    _editVlan(id) {
        const all = this._getAllDevices();
        const dev = all.find(d => d.id === id);
        if (!dev) return;
        const body = `
            <div class="form-group"><label class="form-label">VLAN Tag for ${UI.esc(dev.name)}</label>
                <input type="number" class="form-control" id="ipam-m-vlan-edit" placeholder="e.g. 10" value="${dev.vlan || ''}">
            </div>
            <p style="font-size:11px;color:var(--text-muted)">VLAN assignment is stored locally for reference.</p>`;
        const footer = `<button class="btn btn-primary" onclick="IpamPage._saveVlan('${UI.esc(id)}')">Save</button>`;
        UI.openModal('Set VLAN', body, footer);
    },

    _saveVlan(id) {
        const vlan = (document.getElementById('ipam-m-vlan-edit')?.value || '').trim();
        // Store VLAN overrides in localStorage
        let overrides = {};
        try { overrides = JSON.parse(localStorage.getItem('luxor_ipam_vlans') || '{}'); } catch (_) {}
        overrides[id] = vlan ? parseInt(vlan, 10) : '';
        localStorage.setItem('luxor_ipam_vlans', JSON.stringify(overrides));
        if (typeof UI.closeModal === 'function') UI.closeModal();
        UI.toast('VLAN updated.', 'success');
        this.refresh();
    },

    _getVlanOverride(id) {
        try {
            const overrides = JSON.parse(localStorage.getItem('luxor_ipam_vlans') || '{}');
            return overrides[id] !== undefined ? overrides[id] : '';
        } catch (_) { return ''; }
    },

    // ============================================================
    // HELPERS
    // ============================================================
    _getAllDevices() {
        // Merge aggregated + manual, apply VLAN overrides
        const manual = this._manualEntries.map(e => ({
            id: e.id, name: e.name, ip: e.ip, mac: e.mac || '', vlan: e.vlan || '',
            category: 'manual', connected: e.connected !== false,
            subnet: this._extractSubnet(e.ip), model: '',
        }));
        const all = [...this._devices, ...manual];
        // Apply VLAN overrides
        all.forEach(d => {
            const override = this._getVlanOverride(d.id);
            if (override !== '') d.vlan = override;
        });
        return all;
    },

    _extractSubnet(ip) {
        if (!ip) return 'Unknown';
        const parts = ip.split('.');
        if (parts.length !== 4) return 'Unknown';
        return parts[0] + '.' + parts[1] + '.' + parts[2] + '.x';
    },

    _isValidIP(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every(p => { const n = parseInt(p, 10); return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p; });
    },

    _getFiltered(all) {
        let list = [...all];
        if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            list = list.filter(d =>
                (d.name || '').toLowerCase().includes(q) ||
                (d.ip || '').toLowerCase().includes(q) ||
                (this._CATEGORY_LABELS[d.category] || '').toLowerCase().includes(q) ||
                (d.mac || '').toLowerCase().includes(q)
            );
        }
        list.sort((a, b) => {
            switch (this._sortBy) {
                case 'name': return (a.name || '').localeCompare(b.name || '');
                case 'type': return (a.category || '').localeCompare(b.category || '');
                case 'status': {
                    if (a.connected !== b.connected) return a.connected ? 1 : -1;
                    return this._ipToNum(a.ip) - this._ipToNum(b.ip);
                }
                case 'ip':
                default:
                    return this._ipToNum(a.ip) - this._ipToNum(b.ip);
            }
        });
        return list;
    },

    _ipToNum(ip) {
        if (!ip) return 0;
        const p = ip.split('.');
        if (p.length !== 4) return 0;
        return ((parseInt(p[0]) << 24) + (parseInt(p[1]) << 16) + (parseInt(p[2]) << 8) + parseInt(p[3])) >>> 0;
    },

    _getSubnets(devices) {
        const groups = {};
        devices.forEach(d => {
            const sub = d.subnet || 'Unknown';
            if (!groups[sub]) groups[sub] = [];
            groups[sub].push(d);
        });
        return groups;
    },

    _getConflicts(all) {
        const ipCount = {};
        all.forEach(d => {
            if (!d.ip) return;
            ipCount[d.ip] = (ipCount[d.ip] || 0) + 1;
        });
        const conflicts = new Set();
        Object.keys(ipCount).forEach(ip => {
            if (ipCount[ip] > 1) conflicts.add(ip);
        });
        return conflicts;
    },

    _getSummary(all) {
        const subnets = new Set();
        all.forEach(d => { if (d.subnet && d.subnet !== 'Unknown') subnets.add(d.subnet); });
        const conflicts = this._getConflicts(all);
        return {
            total: all.length,
            subnets: subnets.size,
            conflicts: conflicts.size,
            connected: all.filter(d => d.connected).length,
        };
    },

    // ============================================================
    // SEARCH / FILTER / SORT
    // ============================================================
    _onSearch(val) {
        this._searchQuery = val;
        this._updateTable();
    },

    _toggleGrouping(checked) {
        this._groupBySubnet = checked;
        this._updateTable();
    },

    _setSort(val) {
        this._sortBy = val;
        this._updateTable();
    },

    _updateTable() {
        const wrap = document.getElementById('ipam-table-wrap');
        if (!wrap) return;
        const all = this._getAllDevices();
        const filtered = this._getFiltered(all);
        const conflicts = this._getConflicts(all);
        const subnets = this._getSubnets(filtered);
        wrap.innerHTML = this._renderTable(filtered, subnets, conflicts);
    },

    // ============================================================
    // CSV EXPORT
    // ============================================================
    _exportCSV() {
        const all = this._getAllDevices();
        const sorted = this._getFiltered(all);
        const header = 'Name,IP Address,Subnet,Type,Status,MAC,VLAN';
        const rows = sorted.map(d => {
            const esc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
            return [
                esc(d.name), esc(d.ip), esc(d.subnet),
                esc(this._CATEGORY_LABELS[d.category] || d.category),
                esc(d.connected ? 'Connected' : 'Disconnected'),
                esc(d.mac || ''), esc(d.vlan || ''),
            ].join(',');
        });
        const csv = header + '\n' + rows.join('\n');
        navigator.clipboard.writeText(csv).then(() => {
            UI.toast('CSV copied to clipboard (' + sorted.length + ' rows).', 'success');
        }).catch(() => {
            UI.toast('Failed to copy to clipboard.', 'error');
        });
    },

    // ============================================================
    // SIDEBAR (empty — IPAM has no sidebar items)
    // ============================================================
    renderSidebarList() {
        // IPAM does not use a sidebar device list
    },

    initSidebar() {
        // No sidebar initialization needed
    },

    // ============================================================
    // LIFECYCLE
    // ============================================================
    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'ipam') {
            container.innerHTML = this.render();
        }
    },

    onActivate() {
        // Nothing to poll — data is gathered fresh on each render
    },

    onDeactivate() {
        // Stop background scan when leaving page
        if (this._backgroundScanTimer) {
            clearInterval(this._backgroundScanTimer);
            this._backgroundScanTimer = null;
        }
        this._backgroundScanEnabled = false;
        // Abort any running scan
        if (this._scanAbort) {
            this._scanAbort.abort();
            this._scanRunning = false;
        }
    },
};

// ================================================================
// CSS — injected once
// ================================================================
(function() {
    if (document.getElementById('ipam-css')) return;
    const s = document.createElement('style');
    s.id = 'ipam-css';
    s.textContent = `
    .ipam-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .ipam-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }

    /* Summary Cards */
    .ipam-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .ipam-summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .ipam-summary-icon { font-size: 22px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); }
    .ipam-summary-val { font-size: 24px; font-weight: 700; line-height: 1; }
    .ipam-summary-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .ipam-summary-data { display: flex; flex-direction: column; }

    /* Filters */
    .ipam-filters { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .ipam-search-wrap { position: relative; flex: 1; max-width: 360px; }
    .ipam-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px; pointer-events: none; }
    .ipam-search { width: 100%; padding: 7px 10px 7px 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 12px; outline: none; transition: border-color 0.2s; }
    .ipam-search:focus { border-color: var(--accent); }
    .ipam-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .ipam-sort-select { padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); font-size: 11px; }

    /* Subnet Group */
    .ipam-subnet-group { margin-bottom: 20px; }
    .ipam-subnet-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 0 4px; }
    .ipam-subnet-badge { background: var(--accent); color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
    .ipam-subnet-count { font-size: 11px; color: var(--text-muted); }

    /* Table */
    .ipam-table-wrap { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .ipam-subnet-group .ipam-table-wrap { margin: 0; }
    .ipam-subnet-group { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
    .ipam-row { display: grid; grid-template-columns: 36px 1.5fr 1.2fr 1fr 1.2fr 1.2fr 70px 70px; gap: 8px; align-items: center; padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 12px; transition: background 0.15s; }
    .ipam-row:last-child { border-bottom: none; }
    .ipam-row:not(.ipam-row-header):hover { background: rgba(255,255,255,0.03); }
    .ipam-row-header { font-weight: 700; color: var(--text-muted); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border); }
    .ipam-row-conflict { background: rgba(239,68,68,0.08); }
    .ipam-row-conflict:hover { background: rgba(239,68,68,0.12); }
    .ipam-row-offline { opacity: 0.65; }
    .ipam-col-status { text-align: center; }
    .ipam-col-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ipam-col-ip code, .ipam-col-subnet code, .ipam-col-mac code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; }
    .ipam-col-type { font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ipam-col-actions { display: flex; gap: 4px; justify-content: flex-end; }

    .ipam-vlan-tag { background: var(--accent); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }

    /* Empty state */
    .ipam-empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .ipam-empty p { margin-top: 12px; font-size: 13px; }

    /* ---- Network Scanner ---- */
    .ipam-scanner { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 20px; }
    .ipam-scanner-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .ipam-scanner-controls { display: flex; flex-direction: column; gap: 8px; }
    .ipam-scanner-input-row { display: flex; gap: 8px; align-items: center; }
    .ipam-scanner-input-wrap { position: relative; flex: 1; max-width: 340px; }
    .ipam-scanner-input-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px; pointer-events: none; }
    .ipam-scanner-input { width: 100%; padding: 7px 10px 7px 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; font-family: 'JetBrains Mono', monospace; outline: none; transition: border-color 0.2s; }
    .ipam-scanner-input:focus { border-color: var(--accent); }
    .ipam-scanner-presets { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .ipam-preset-btn { background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-secondary); padding: 3px 10px; border-radius: 6px; font-size: 10px; font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.15s; }
    .ipam-preset-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Progress */
    .ipam-scanner-progress { margin-top: 10px; display: flex; align-items: center; gap: 10px; }
    .ipam-progress-bar { flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
    .ipam-progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s ease; }
    .ipam-progress-text { font-size: 10px; color: var(--text-muted); white-space: nowrap; min-width: 140px; }

    /* Discovered section */
    .ipam-discovered-section { margin-top: 14px; }
    .ipam-discovered-header { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ipam-discovered-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .ipam-discovered-row { display: grid; grid-template-columns: 140px 80px 60px 1fr 120px auto; gap: 10px; align-items: center; padding: 8px 12px; font-size: 11px; border-bottom: 1px solid var(--border); background: var(--bg-tertiary); transition: background 0.15s; }
    .ipam-discovered-row:last-child { border-bottom: none; }
    .ipam-discovered-row:hover { background: rgba(255,255,255,0.04); }
    .ipam-discovered-ip code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-primary); background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; }
    .ipam-discovered-latency { color: var(--text-muted); font-size: 10px; }
    .ipam-discovered-server { color: var(--text-muted); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ipam-discovered-actions { display: flex; justify-content: flex-end; }

    /* HTTP status badges */
    .ipam-http-badge { padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
    .ipam-http-2xx { background: rgba(34,197,94,0.15); color: var(--green); }
    .ipam-http-3xx { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .ipam-http-4xx { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .ipam-http-5xx { background: rgba(239,68,68,0.15); color: var(--red); }
    .ipam-http-0xx { background: rgba(156,163,175,0.15); color: var(--text-muted); }

    /* Device type badge */
    .ipam-type-badge { background: rgba(139,92,246,0.15); color: #8b5cf6; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; white-space: nowrap; }

    /* Responsive */
    @media (max-width: 900px) {
        .ipam-summary { grid-template-columns: repeat(2, 1fr); }
        .ipam-row { grid-template-columns: 30px 1fr 1fr 1fr; font-size: 11px; }
        .ipam-col-subnet, .ipam-col-mac, .ipam-col-vlan { display: none; }
        .ipam-discovered-row { grid-template-columns: 1fr 60px 50px auto; }
        .ipam-discovered-server, .ipam-discovered-type { display: none; }
    }
    `;
    document.head.appendChild(s);
})();
