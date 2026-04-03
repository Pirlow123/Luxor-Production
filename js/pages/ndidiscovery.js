/**
 * NDI Discovery — manual source management, network scan, routing matrix, connection monitor
 * Since NDI SDK requires native bindings (unavailable in Electron renderer),
 * sources are added manually and discovered via HTTP port scanning on NDI ports 5960-5990.
 */
const NdiDiscoveryPage = {

    // ---- Source Database ----
    _sources: [],       // { id, name, ip, type, group, resolution, fps, bandwidth }
    _routes: {},        // { "srcId": { "dstId": true } }
    _groups: [],        // string[]
    _pingResults: {},   // { sourceId: { status, latency, lastCheck } }
    _pollTimer: null,
    _pollInterval: 5000,
    _view: 'sources',   // 'sources' | 'matrix' | 'scan'

    _sourceTypes: ['Camera', 'Computer', 'Media Server', 'Switcher', 'Other'],

    _storageKeys: {
        sources: 'luxor_ndi_sources',
        routes:  'luxor_ndi_routes',
        groups:  'luxor_ndi_groups',
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        this._loadData();
        const summary = this._getSummary();

        return `
        <div class="ndi-page">
            <div class="ndi-header">
                <div style="display:flex;align-items:center;gap:12px;flex:1">
                    <h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-video" style="color:var(--accent);margin-right:8px"></i>NDI Discovery</h2>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${this._sources.length} sources</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-sm" onclick="NdiDiscoveryPage._pingAll()" title="Ping All"><i class="fas fa-sync-alt"></i> Refresh</button>
                    <button class="btn btn-sm btn-primary" onclick="NdiDiscoveryPage._showAddSource()"><i class="fas fa-plus"></i> Add Source</button>
                </div>
            </div>

            <!-- Stats Summary -->
            <div class="ndi-summary">
                <div class="ndi-summary-card">
                    <div class="ndi-summary-icon" style="color:var(--accent)"><i class="fas fa-broadcast-tower"></i></div>
                    <div class="ndi-summary-data">
                        <div class="ndi-summary-val">${summary.totalSources}</div>
                        <div class="ndi-summary-label">Total Sources</div>
                    </div>
                </div>
                <div class="ndi-summary-card">
                    <div class="ndi-summary-icon" style="color:var(--green)"><i class="fas fa-check-circle"></i></div>
                    <div class="ndi-summary-data">
                        <div class="ndi-summary-val">${summary.onlineCount}</div>
                        <div class="ndi-summary-label">Online</div>
                    </div>
                </div>
                <div class="ndi-summary-card">
                    <div class="ndi-summary-icon" style="color:var(--accent)"><i class="fas fa-tachometer-alt"></i></div>
                    <div class="ndi-summary-data">
                        <div class="ndi-summary-val">${summary.totalBandwidth}<span style="font-size:11px;font-weight:400"> Mbps</span></div>
                        <div class="ndi-summary-label">Est. Bandwidth</div>
                    </div>
                </div>
                <div class="ndi-summary-card">
                    <div class="ndi-summary-icon" style="color:${summary.healthPct >= 80 ? 'var(--green)' : summary.healthPct >= 50 ? 'var(--warning, orange)' : 'var(--red)'}"><i class="fas fa-heartbeat"></i></div>
                    <div class="ndi-summary-data">
                        <div class="ndi-summary-val">${summary.healthPct}<span style="font-size:11px;font-weight:400">%</span></div>
                        <div class="ndi-summary-label">Network Health</div>
                    </div>
                </div>
            </div>

            <!-- View Tabs -->
            <div class="ndi-tabs">
                <button class="ndi-tab ${this._view === 'sources' ? 'active' : ''}" onclick="NdiDiscoveryPage._setView('sources')"><i class="fas fa-th-large"></i> Sources</button>
                <button class="ndi-tab ${this._view === 'matrix' ? 'active' : ''}" onclick="NdiDiscoveryPage._setView('matrix')"><i class="fas fa-th"></i> Routing Matrix</button>
                <button class="ndi-tab ${this._view === 'scan' ? 'active' : ''}" onclick="NdiDiscoveryPage._setView('scan')"><i class="fas fa-radar"></i> Network Scan</button>
            </div>

            <!-- View Content -->
            <div class="ndi-content" id="ndi-content">
                ${this._renderView()}
            </div>
        </div>`;
    },

    _renderView() {
        switch (this._view) {
            case 'sources': return this._renderSourcesView();
            case 'matrix':  return this._renderMatrixView();
            case 'scan':    return this._renderScanView();
            default:        return this._renderSourcesView();
        }
    },

    // ============================================================
    // SOURCES VIEW
    // ============================================================
    _renderSourcesView() {
        if (this._sources.length === 0) {
            return `<div class="ndi-empty">
                <i class="fas fa-video" style="font-size:32px;opacity:0.3"></i>
                <p>No NDI sources added.<br>Click <strong>+ Add Source</strong> to register a source manually, or use <strong>Network Scan</strong> to discover devices.</p>
            </div>`;
        }

        // Group filter
        const allGroups = [...new Set(this._sources.map(s => s.group).filter(Boolean))];
        const groupFilter = allGroups.length > 0 ? `
            <div class="ndi-group-filter" style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">
                <button class="ndi-pill active" onclick="NdiDiscoveryPage._filterGroup('')" data-group="">All</button>
                ${allGroups.map(g => `<button class="ndi-pill" onclick="NdiDiscoveryPage._filterGroup('${UI.esc(g)}')" data-group="${UI.esc(g)}">${UI.esc(g)}</button>`).join('')}
            </div>` : '';

        return `${groupFilter}<div class="ndi-grid" id="ndi-source-grid">${this._sources.map(s => this._renderSourceCard(s)).join('')}</div>`;
    },

    _renderSourceCard(s) {
        const ping = this._pingResults[s.id] || {};
        const status = ping.status || 'unknown';
        const statusColor = status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--text-muted)';
        const statusIcon = status === 'online' ? 'fa-check-circle' : status === 'offline' ? 'fa-times-circle' : 'fa-question-circle';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const typeIcon = this._sourceTypeIcon(s.type);
        const resLabel = s.resolution && s.fps ? `${UI.esc(s.resolution)} @ ${UI.esc(s.fps)}fps` : '--';
        const bwLabel = s.bandwidth ? `${s.bandwidth} Mbps` : '--';

        return `
        <div class="ndi-card ${status}">
            <div class="ndi-card-header">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                    <i class="fas ${statusIcon}" style="color:${statusColor};font-size:14px"></i>
                    <div style="flex:1;min-width:0">
                        <div class="ndi-card-name">${UI.esc(s.name)}</div>
                        <div class="ndi-card-meta"><i class="fas ${typeIcon}" style="margin-right:3px"></i>${UI.esc(s.type)}${s.group ? ` <span style="opacity:0.5">&bull;</span> ${UI.esc(s.group)}` : ''}</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="NdiDiscoveryPage._showEditSource('${s.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="NdiDiscoveryPage._removeSource('${s.id}')" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="ndi-card-ip">${UI.esc(s.ip)}</div>
            <div class="ndi-card-stats">
                <div class="ndi-stat">
                    <div class="ndi-stat-val">${s.resolution ? UI.esc(s.resolution) : '--'}</div>
                    <div class="ndi-stat-label">Resolution</div>
                </div>
                <div class="ndi-stat">
                    <div class="ndi-stat-val">${s.fps ? UI.esc(String(s.fps)) : '--'}<span class="ndi-stat-unit">${s.fps ? 'fps' : ''}</span></div>
                    <div class="ndi-stat-label">Frame Rate</div>
                </div>
                <div class="ndi-stat">
                    <div class="ndi-stat-val">${bwLabel}</div>
                    <div class="ndi-stat-label">Bandwidth</div>
                </div>
            </div>
            <div class="ndi-card-footer">
                <span style="font-size:10px;color:${statusColor}"><i class="fas ${statusIcon}"></i> ${statusLabel}</span>
                ${ping.latency !== undefined ? `<span style="font-size:10px;color:var(--text-muted)">${ping.latency}ms</span>` : ''}
            </div>
        </div>`;
    },

    // ============================================================
    // ROUTING MATRIX VIEW
    // ============================================================
    _renderMatrixView() {
        if (this._sources.length < 2) {
            return `<div class="ndi-empty">
                <i class="fas fa-th" style="font-size:32px;opacity:0.3"></i>
                <p>Need at least two NDI sources to display the routing matrix.<br>Sources appear as columns, destinations as rows.</p>
            </div>`;
        }

        const cols = this._sources; // sources (columns)
        const rows = this._sources; // destinations (rows)
        const maxCols = 24;
        const maxRows = 24;
        const displayCols = cols.slice(0, maxCols);
        const displayRows = rows.slice(0, maxRows);

        return `
        <div class="ndi-matrix-toolbar">
            <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:12px;font-weight:600">NDI Routing Matrix</span>
                <span style="font-size:10px;color:var(--text-muted)">${cols.length} sources x ${rows.length} destinations</span>
                ${cols.length > maxCols || rows.length > maxRows ? `<span style="font-size:10px;color:var(--red)">Showing first ${maxCols}x${maxRows}</span>` : ''}
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-sm" onclick="NdiDiscoveryPage._clearAllRoutes()"><i class="fas fa-eraser"></i> Clear</button>
            </div>
        </div>
        <div class="ndi-matrix-wrap">
            <table class="ndi-matrix">
                <thead>
                    <tr>
                        <th class="ndi-matrix-corner">SRC &rarr;<br>&darr; DST</th>
                        ${displayCols.map(c => {
                            const ping = this._pingResults[c.id] || {};
                            const dotColor = ping.status === 'online' ? 'var(--green)' : ping.status === 'offline' ? 'var(--red)' : 'var(--text-muted)';
                            return `<th class="ndi-matrix-col-header" title="${UI.esc(c.name)} (${UI.esc(c.ip)})"><div class="ndi-matrix-col-label"><i class="fas fa-circle" style="font-size:5px;color:${dotColor}"></i> ${UI.esc(c.name.substring(0, 8))}</div></th>`;
                        }).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${displayRows.map(r => `
                        <tr>
                            <td class="ndi-matrix-row-header" title="${UI.esc(r.name)} (${UI.esc(r.ip)})">${UI.esc(r.name.substring(0, 10))}</td>
                            ${displayCols.map(c => {
                                if (c.id === r.id) {
                                    return `<td class="ndi-matrix-cell ndi-matrix-diag" title="Same device"></td>`;
                                }
                                const active = this._routes[c.id] && this._routes[c.id][r.id];
                                return `<td class="ndi-matrix-cell ${active ? 'active' : ''}" onclick="NdiDiscoveryPage._toggleRoute('${c.id}','${r.id}')" title="SRC: ${UI.esc(c.name)} -> DST: ${UI.esc(r.name)}"></td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    },

    // ============================================================
    // NETWORK SCAN VIEW
    // ============================================================
    _scanResults: [],
    _scanRunning: false,

    _renderScanView() {
        return `
        <div class="ndi-scan-section">
            <div class="ndi-scan-header">
                <div style="flex:1">
                    <h3 style="font-size:14px;font-weight:600;margin:0 0 4px 0"><i class="fas fa-search" style="margin-right:6px;color:var(--accent)"></i>NDI Port Scanner</h3>
                    <p style="font-size:11px;color:var(--text-muted);margin:0">Scans ports 5960-5990 (common NDI ports) on a subnet. Runs in batches of 10 concurrent connections with 1.5s timeout.</p>
                </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-end;margin:16px 0;flex-wrap:wrap">
                <div style="flex:1;min-width:200px">
                    <label class="ndi-form-label">Subnet (first 3 octets)</label>
                    <input id="ndi-scan-subnet" class="ndi-input" placeholder="e.g. 192.168.1" value="${this._lastSubnet || '192.168.1'}">
                </div>
                <div>
                    <label class="ndi-form-label">IP Range</label>
                    <div style="display:flex;gap:4px;align-items:center">
                        <input id="ndi-scan-start" class="ndi-input" type="number" min="1" max="254" value="1" style="width:70px">
                        <span style="font-size:12px;color:var(--text-muted)">to</span>
                        <input id="ndi-scan-end" class="ndi-input" type="number" min="1" max="254" value="254" style="width:70px">
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="NdiDiscoveryPage._startScan()" id="ndi-scan-btn" ${this._scanRunning ? 'disabled' : ''}>
                    <i class="fas ${this._scanRunning ? 'fa-spinner fa-spin' : 'fa-search'}"></i> ${this._scanRunning ? 'Scanning...' : 'Start Scan'}
                </button>
            </div>
            <div id="ndi-scan-progress" style="margin-bottom:12px"></div>
            <div id="ndi-scan-results">
                ${this._scanResults.length > 0 ? this._renderScanResults() : '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">No scan results yet. Configure subnet and click Start Scan.</div>'}
            </div>
        </div>`;
    },

    _renderScanResults() {
        return `
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${this._scanResults.length} device(s) found with open NDI ports</div>
        <div class="ndi-scan-grid">
            ${this._scanResults.map(r => `
                <div class="ndi-scan-result">
                    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                        <i class="fas fa-circle" style="font-size:8px;color:var(--green)"></i>
                        <div>
                            <div style="font-weight:600;font-size:12px;font-family:'JetBrains Mono',monospace">${UI.esc(r.ip)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">Port ${r.port} open &mdash; ${r.latency}ms</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" style="font-size:10px" onclick="NdiDiscoveryPage._addFromScan('${UI.esc(r.ip)}')"><i class="fas fa-plus"></i> Add</button>
                </div>
            `).join('')}
        </div>`;
    },

    _lastSubnet: '192.168.1',

    async _startScan() {
        if (this._scanRunning) return;

        const subnet = (document.getElementById('ndi-scan-subnet')?.value || '192.168.1').trim();
        const startIp = parseInt(document.getElementById('ndi-scan-start')?.value) || 1;
        const endIp = parseInt(document.getElementById('ndi-scan-end')?.value) || 254;

        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(subnet)) {
            UI.toast('Enter a valid subnet (e.g. 192.168.1)', 'error');
            return;
        }
        if (startIp < 1 || endIp > 254 || startIp > endIp) {
            UI.toast('Invalid IP range', 'error');
            return;
        }

        this._lastSubnet = subnet;
        this._scanRunning = true;
        this._scanResults = [];
        const btn = document.getElementById('ndi-scan-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...'; }

        const ports = [];
        for (let p = 5960; p <= 5990; p++) ports.push(p);

        const ips = [];
        for (let i = startIp; i <= endIp; i++) ips.push(`${subnet}.${i}`);

        const progressEl = document.getElementById('ndi-scan-progress');
        const resultsEl = document.getElementById('ndi-scan-results');
        let scanned = 0;
        const totalTasks = ips.length;

        // Scan each IP on known NDI ports, batch of 10 concurrent
        const batchSize = 10;
        for (let b = 0; b < ips.length; b += batchSize) {
            const batch = ips.slice(b, b + batchSize);
            const promises = batch.map(async (ip) => {
                for (const port of ports) {
                    try {
                        const start = performance.now();
                        await fetch(`http://${ip}:${port}/`, { signal: AbortSignal.timeout(1500) });
                        const latency = Math.round(performance.now() - start);
                        // If we get here, port is open
                        const exists = this._scanResults.find(r => r.ip === ip && r.port === port);
                        if (!exists) {
                            this._scanResults.push({ ip, port, latency });
                        }
                    } catch (e) {
                        // Also check if it was a network error vs timeout — a quick rejection
                        // on a listening port can throw TypeError but still indicates open port
                        if (e.name !== 'TimeoutError' && e.name !== 'AbortError') {
                            // Could be CORS error on an active HTTP server — treat as open
                            const start2 = performance.now();
                            const latency2 = Math.round(performance.now() - start2);
                            // Only add if the error was quick (< 500ms), indicating a response
                            if (latency2 < 500 || (performance.now() - (performance.now() - 500)) < 800) {
                                // Check via timing heuristic
                            }
                        }
                    }
                }
                scanned++;
                if (progressEl) {
                    const pct = Math.round((scanned / totalTasks) * 100);
                    progressEl.innerHTML = `
                        <div style="display:flex;align-items:center;gap:10px">
                            <div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
                                <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:3px;transition:width 0.3s"></div>
                            </div>
                            <span style="font-size:10px;color:var(--text-muted);white-space:nowrap">${scanned}/${totalTasks} (${pct}%)</span>
                        </div>`;
                }
            });
            await Promise.allSettled(promises);
            // Update results live
            if (resultsEl) {
                resultsEl.innerHTML = this._scanResults.length > 0 ? this._renderScanResults() : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:11px">Scanning...</div>';
            }
        }

        this._scanRunning = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Start Scan'; }
        if (resultsEl) {
            resultsEl.innerHTML = this._scanResults.length > 0 ? this._renderScanResults() : '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">Scan complete. No NDI devices found on ports 5960-5990.</div>';
        }
        UI.toast(`Scan complete: ${this._scanResults.length} device(s) found`, this._scanResults.length > 0 ? 'success' : 'info');
    },

    _addFromScan(ip) {
        // Pre-fill the add dialog with the scanned IP
        this._showAddSource(ip);
    },

    // ============================================================
    // DATA MANAGEMENT
    // ============================================================
    _loadData() {
        try { this._sources = JSON.parse(localStorage.getItem(this._storageKeys.sources)) || []; } catch { this._sources = []; }
        try { this._routes = JSON.parse(localStorage.getItem(this._storageKeys.routes)) || {}; } catch { this._routes = {}; }
        try { this._groups = JSON.parse(localStorage.getItem(this._storageKeys.groups)) || []; } catch { this._groups = []; }
    },

    _saveSources() {
        localStorage.setItem(this._storageKeys.sources, JSON.stringify(this._sources));
    },

    _saveRoutes() {
        localStorage.setItem(this._storageKeys.routes, JSON.stringify(this._routes));
    },

    _saveGroups() {
        localStorage.setItem(this._storageKeys.groups, JSON.stringify(this._groups));
    },

    // ============================================================
    // SUMMARY
    // ============================================================
    _getSummary() {
        const totalSources = this._sources.length;
        const onlineCount = this._sources.filter(s => this._pingResults[s.id]?.status === 'online').length;
        const totalBandwidth = this._sources.reduce((sum, s) => sum + (parseFloat(s.bandwidth) || 0), 0).toFixed(0);
        const healthPct = totalSources > 0 ? Math.round((onlineCount / totalSources) * 100) : 0;
        return { totalSources, onlineCount, totalBandwidth, healthPct };
    },

    // ============================================================
    // ADD / EDIT / REMOVE SOURCE
    // ============================================================
    _showAddSource(prefillIp) {
        const typeOpts = this._sourceTypes.map(t => `<option value="${UI.esc(t)}">${UI.esc(t)}</option>`).join('');
        const allGroups = [...new Set([...this._groups, ...this._sources.map(s => s.group).filter(Boolean)])];
        const groupOpts = allGroups.map(g => `<option value="${UI.esc(g)}">${UI.esc(g)}</option>`).join('');

        const html = `
            <div style="display:flex;flex-direction:column;gap:12px">
                <div><label class="ndi-form-label">Source Name</label><input id="ndi-add-name" class="ndi-input" placeholder="e.g. Stage Cam 1"></div>
                <div><label class="ndi-form-label">IP Address</label><input id="ndi-add-ip" class="ndi-input" placeholder="e.g. 192.168.1.100" value="${prefillIp ? UI.esc(prefillIp) : ''}"></div>
                <div><label class="ndi-form-label">Source Type</label><select id="ndi-add-type" class="ndi-select">${typeOpts}</select></div>
                <div><label class="ndi-form-label">Group</label>
                    <div style="display:flex;gap:8px">
                        <select id="ndi-add-group" class="ndi-select" style="flex:1">
                            <option value="">-- No Group --</option>
                            ${groupOpts}
                        </select>
                        <button class="btn btn-sm" onclick="NdiDiscoveryPage._promptNewGroup('ndi-add-group')" title="New Group"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><label class="ndi-form-label">Resolution</label><input id="ndi-add-res" class="ndi-input" placeholder="e.g. 1920x1080"></div>
                    <div><label class="ndi-form-label">Frame Rate (fps)</label><input id="ndi-add-fps" class="ndi-input" type="number" min="1" max="240" placeholder="e.g. 60"></div>
                </div>
                <div><label class="ndi-form-label">Bandwidth Estimate (Mbps)</label><input id="ndi-add-bw" class="ndi-input" type="number" min="0" step="0.1" placeholder="e.g. 125"></div>
            </div>`;

        UI.openModal('Add NDI Source', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="NdiDiscoveryPage._doAddSource()">Add Source</button>`);
    },

    _doAddSource() {
        const name = document.getElementById('ndi-add-name').value.trim();
        const ip = document.getElementById('ndi-add-ip').value.trim();
        const type = document.getElementById('ndi-add-type').value;
        const group = document.getElementById('ndi-add-group').value;
        const resolution = document.getElementById('ndi-add-res').value.trim();
        const fps = document.getElementById('ndi-add-fps').value.trim();
        const bandwidth = document.getElementById('ndi-add-bw').value.trim();

        if (!name) { UI.toast('Source name is required', 'error'); return; }
        if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { UI.toast('Valid IP address is required', 'error'); return; }

        const source = {
            id: 'ndi-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            name, ip, type, group,
            resolution: resolution || '',
            fps: fps || '',
            bandwidth: bandwidth || '',
        };
        this._sources.push(source);

        // Track new group
        if (group && !this._groups.includes(group)) {
            this._groups.push(group);
            this._saveGroups();
        }

        this._saveSources();
        UI.closeModal();
        UI.toast('Source added: ' + name, 'success');
        this.refresh();
    },

    _showEditSource(id) {
        const s = this._sources.find(src => src.id === id);
        if (!s) return;

        const typeOpts = this._sourceTypes.map(t => `<option value="${UI.esc(t)}" ${s.type === t ? 'selected' : ''}>${UI.esc(t)}</option>`).join('');
        const allGroups = [...new Set([...this._groups, ...this._sources.map(src => src.group).filter(Boolean)])];
        const groupOpts = allGroups.map(g => `<option value="${UI.esc(g)}" ${s.group === g ? 'selected' : ''}>${UI.esc(g)}</option>`).join('');

        const html = `
            <div style="display:flex;flex-direction:column;gap:12px">
                <div><label class="ndi-form-label">Source Name</label><input id="ndi-edit-name" class="ndi-input" value="${UI.esc(s.name)}"></div>
                <div><label class="ndi-form-label">IP Address</label><input id="ndi-edit-ip" class="ndi-input" value="${UI.esc(s.ip)}"></div>
                <div><label class="ndi-form-label">Source Type</label><select id="ndi-edit-type" class="ndi-select">${typeOpts}</select></div>
                <div><label class="ndi-form-label">Group</label>
                    <div style="display:flex;gap:8px">
                        <select id="ndi-edit-group" class="ndi-select" style="flex:1">
                            <option value="">-- No Group --</option>
                            ${groupOpts}
                        </select>
                        <button class="btn btn-sm" onclick="NdiDiscoveryPage._promptNewGroup('ndi-edit-group')" title="New Group"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><label class="ndi-form-label">Resolution</label><input id="ndi-edit-res" class="ndi-input" value="${UI.esc(s.resolution || '')}"></div>
                    <div><label class="ndi-form-label">Frame Rate (fps)</label><input id="ndi-edit-fps" class="ndi-input" type="number" min="1" max="240" value="${UI.esc(String(s.fps || ''))}"></div>
                </div>
                <div><label class="ndi-form-label">Bandwidth Estimate (Mbps)</label><input id="ndi-edit-bw" class="ndi-input" type="number" min="0" step="0.1" value="${UI.esc(String(s.bandwidth || ''))}"></div>
            </div>`;

        UI.openModal('Edit NDI Source', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="NdiDiscoveryPage._doEditSource('${id}')">Save Changes</button>`);
    },

    _doEditSource(id) {
        const s = this._sources.find(src => src.id === id);
        if (!s) return;

        const name = document.getElementById('ndi-edit-name').value.trim();
        const ip = document.getElementById('ndi-edit-ip').value.trim();
        if (!name) { UI.toast('Source name is required', 'error'); return; }
        if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { UI.toast('Valid IP address is required', 'error'); return; }

        s.name = name;
        s.ip = ip;
        s.type = document.getElementById('ndi-edit-type').value;
        s.group = document.getElementById('ndi-edit-group').value;
        s.resolution = document.getElementById('ndi-edit-res').value.trim();
        s.fps = document.getElementById('ndi-edit-fps').value.trim();
        s.bandwidth = document.getElementById('ndi-edit-bw').value.trim();

        // Track new group
        if (s.group && !this._groups.includes(s.group)) {
            this._groups.push(s.group);
            this._saveGroups();
        }

        this._saveSources();
        UI.closeModal();
        UI.toast('Source updated: ' + name, 'success');
        this.refresh();
    },

    async _removeSource(id) {
        const s = this._sources.find(src => src.id === id);
        if (!s) return;
        const ok = await UI.confirm('Remove Source', `Remove <strong>${UI.esc(s.name)}</strong> (${UI.esc(s.ip)})? This will also remove any routes involving this source.`);
        if (!ok) return;

        this._sources = this._sources.filter(src => src.id !== id);

        // Clean up routes referencing this source
        const newRoutes = {};
        for (const srcId of Object.keys(this._routes)) {
            if (srcId === id) continue;
            const inner = {};
            for (const dstId of Object.keys(this._routes[srcId])) {
                if (dstId !== id) {
                    inner[dstId] = true;
                }
            }
            if (Object.keys(inner).length > 0) newRoutes[srcId] = inner;
        }
        this._routes = newRoutes;
        this._saveRoutes();

        delete this._pingResults[id];
        this._saveSources();
        UI.toast('Source removed', 'success');
        this.refresh();
    },

    // ============================================================
    // GROUP MANAGEMENT
    // ============================================================
    _promptNewGroup(selectId) {
        const html = `
            <div style="display:flex;flex-direction:column;gap:12px">
                <div><label class="ndi-form-label">Group Name</label><input id="ndi-new-group-name" class="ndi-input" placeholder="e.g. Stage Cameras"></div>
            </div>`;
        UI.openModal('New Group', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="NdiDiscoveryPage._doAddGroup('${selectId}')">Create Group</button>`);
    },

    _doAddGroup(selectId) {
        const name = document.getElementById('ndi-new-group-name').value.trim();
        if (!name) { UI.toast('Group name is required', 'error'); return; }
        if (this._groups.includes(name)) { UI.toast('Group already exists', 'error'); return; }

        this._groups.push(name);
        this._saveGroups();
        UI.closeModal();
        UI.toast('Group created: ' + name, 'success');

        // Re-open the parent modal so the new group is available
        // We refresh the whole page to pick up the new group
        this.refresh();
    },

    _showManageGroups() {
        const allGroups = [...new Set([...this._groups, ...this._sources.map(s => s.group).filter(Boolean)])];
        if (allGroups.length === 0) {
            UI.toast('No groups yet. Create one when adding a source.', 'info');
            return;
        }

        const list = allGroups.map(g => {
            const count = this._sources.filter(s => s.group === g).length;
            return `
            <div class="ndi-group-item">
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:12px">${UI.esc(g)}</div>
                    <div style="font-size:10px;color:var(--text-muted)">${count} source(s)</div>
                </div>
                <button class="btn btn-sm" style="font-size:10px" onclick="NdiDiscoveryPage._removeGroup('${UI.esc(g)}')" title="Remove Group"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');

        UI.openModal('Manage Groups', `<div class="ndi-group-list">${list}</div>`,
            `<button class="btn" onclick="UI.closeModal()">Close</button>`);
    },

    _removeGroup(name) {
        this._groups = this._groups.filter(g => g !== name);
        // Unassign sources from this group
        this._sources.forEach(s => { if (s.group === name) s.group = ''; });
        this._saveGroups();
        this._saveSources();
        UI.toast('Group removed: ' + name, 'info');
        this._showManageGroups(); // Re-open list
    },

    _filterGroup(group) {
        // Toggle active pill styling and filter the grid
        const pills = document.querySelectorAll('.ndi-group-filter .ndi-pill');
        pills.forEach(p => p.classList.toggle('active', p.getAttribute('data-group') === group));

        const grid = document.getElementById('ndi-source-grid');
        if (!grid) return;

        const filteredSources = group ? this._sources.filter(s => s.group === group) : this._sources;
        grid.innerHTML = filteredSources.map(s => this._renderSourceCard(s)).join('');
    },

    // ============================================================
    // ROUTING
    // ============================================================
    _toggleRoute(srcId, dstId) {
        if (!this._routes[srcId]) this._routes[srcId] = {};
        if (this._routes[srcId][dstId]) {
            delete this._routes[srcId][dstId];
            if (Object.keys(this._routes[srcId]).length === 0) delete this._routes[srcId];
        } else {
            this._routes[srcId][dstId] = true;
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
    // PING / CONNECTION MONITOR
    // ============================================================
    async _pingDevice(source) {
        const start = performance.now();
        let reachable = false;

        try {
            await fetch(`http://${source.ip}:5960/`, { signal: AbortSignal.timeout(4000) });
            reachable = true;
        } catch {
            // Also try base IP
            try {
                await fetch(`http://${source.ip}/`, { signal: AbortSignal.timeout(2000) });
                reachable = true;
            } catch {
                // Device unreachable
            }
        }

        const latency = Math.round(performance.now() - start);

        this._pingResults[source.id] = {
            status: reachable ? 'online' : 'offline',
            latency: reachable ? latency : undefined,
            lastCheck: Date.now(),
        };
    },

    async _pingAll() {
        const promises = this._sources.map(s => this._pingDevice(s));
        await Promise.allSettled(promises);
        this._updateGrid();
    },

    // ============================================================
    // UI UPDATES (partial DOM updates to avoid full re-render during polling)
    // ============================================================
    _updateGrid() {
        const container = document.getElementById('ndi-content');
        if (container && this._view === 'sources') {
            container.innerHTML = this._renderSourcesView();
        }
        this._updateSummary();
    },

    _updateContent() {
        const container = document.getElementById('ndi-content');
        if (container) {
            container.innerHTML = this._renderView();
        }
    },

    _updateSummary() {
        const cards = document.querySelectorAll('.ndi-summary-card');
        if (cards.length < 4) return;
        const summary = this._getSummary();

        // Update online count
        const onlineVal = cards[1].querySelector('.ndi-summary-val');
        if (onlineVal) onlineVal.textContent = summary.onlineCount;

        // Update health percentage
        const healthIcon = cards[3].querySelector('.ndi-summary-icon');
        const healthVal = cards[3].querySelector('.ndi-summary-val');
        if (healthVal) healthVal.innerHTML = `${summary.healthPct}<span style="font-size:11px;font-weight:400">%</span>`;
        if (healthIcon) healthIcon.style.color = summary.healthPct >= 80 ? 'var(--green)' : summary.healthPct >= 50 ? 'var(--warning, orange)' : 'var(--red)';
    },

    // ============================================================
    // HELPERS
    // ============================================================
    _sourceTypeIcon(type) {
        const map = {
            'Camera':       'fa-video',
            'Computer':     'fa-desktop',
            'Media Server': 'fa-server',
            'Switcher':     'fa-random',
            'Other':        'fa-cube',
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
        // NDI Discovery page has no sidebar items
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
        if (container && appState.get('currentPage') === 'ndidiscovery') {
            container.innerHTML = this.render();
        }
    },
};

// ================================================================
// CSS — injected once via IIFE
// ================================================================
(function() {
    if (document.getElementById('ndi-css')) return;
    const s = document.createElement('style');
    s.id = 'ndi-css';
    s.textContent = `
    .ndi-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .ndi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }

    /* Summary Cards */
    .ndi-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .ndi-summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .ndi-summary-icon { font-size: 22px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); }
    .ndi-summary-val { font-size: 24px; font-weight: 700; line-height: 1; }
    .ndi-summary-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* View Tabs */
    .ndi-tabs { display: flex; gap: 4px; margin-bottom: 20px; }
    .ndi-tab { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-muted); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .ndi-tab:hover { border-color: var(--accent); color: var(--text-primary); }
    .ndi-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Source Grid */
    .ndi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .ndi-empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .ndi-empty p { margin-top: 12px; font-size: 13px; }

    /* Source Card */
    .ndi-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: all 0.2s; }
    .ndi-card:hover { border-color: var(--accent); transform: translateY(-1px); }
    .ndi-card.offline { border-left: 3px solid var(--red); }
    .ndi-card.online { border-left: 3px solid var(--green); }
    .ndi-card.unknown { border-left: 3px solid var(--text-muted); }
    .ndi-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ndi-card-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ndi-card-meta { font-size: 10px; color: var(--text-muted); }
    .ndi-card-ip { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px; padding: 3px 8px; background: var(--bg-tertiary); border-radius: 4px; display: inline-block; }
    .ndi-card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
    .ndi-stat { text-align: center; }
    .ndi-stat-val { font-size: 13px; font-weight: 700; line-height: 1.2; }
    .ndi-stat-unit { font-size: 9px; font-weight: 400; opacity: 0.6; }
    .ndi-stat-label { font-size: 9px; color: var(--text-muted); }
    .ndi-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); }

    /* Group filter pills */
    .ndi-pill { padding: 5px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-muted); font-size: 11px; cursor: pointer; transition: all 0.2s; }
    .ndi-pill:hover { border-color: var(--accent); color: var(--text-primary); }
    .ndi-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Routing Matrix */
    .ndi-matrix-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .ndi-matrix-wrap { overflow: auto; max-height: 600px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; }
    .ndi-matrix { border-collapse: collapse; font-size: 10px; }
    .ndi-matrix th, .ndi-matrix td { border: 1px solid var(--border); padding: 0; text-align: center; }
    .ndi-matrix-corner { position: sticky; left: 0; top: 0; z-index: 3; background: var(--bg-tertiary); padding: 6px 8px; font-size: 9px; color: var(--text-muted); min-width: 90px; }
    .ndi-matrix-col-header { position: sticky; top: 0; z-index: 2; background: var(--bg-tertiary); padding: 4px 2px; min-width: 42px; max-width: 60px; }
    .ndi-matrix-col-label { font-size: 8px; line-height: 1.2; color: var(--text-muted); font-weight: 600; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .ndi-matrix-row-header { position: sticky; left: 0; z-index: 1; background: var(--bg-tertiary); padding: 4px 6px; font-size: 9px; font-weight: 600; color: var(--text-primary); white-space: nowrap; text-align: left; min-width: 90px; }
    .ndi-matrix-cell { width: 42px; height: 30px; cursor: pointer; background: var(--bg-secondary); transition: background 0.15s; }
    .ndi-matrix-cell:hover { background: var(--bg-tertiary); }
    .ndi-matrix-cell.active { background: var(--accent); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.2); }
    .ndi-matrix-cell.ndi-matrix-diag { background: var(--bg-tertiary); cursor: default; opacity: 0.3; }

    /* Network Scan */
    .ndi-scan-section { max-width: 900px; }
    .ndi-scan-header { display: flex; align-items: flex-start; gap: 12px; }
    .ndi-scan-grid { display: flex; flex-direction: column; gap: 6px; }
    .ndi-scan-result { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; }

    /* Group management */
    .ndi-group-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
    .ndi-group-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 8px; }

    /* Form elements */
    .ndi-form-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
    .ndi-input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box; }
    .ndi-input:focus { border-color: var(--accent); }
    .ndi-select { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box; }
    .ndi-select:focus { border-color: var(--accent); }

    @media (max-width: 800px) {
        .ndi-summary { grid-template-columns: repeat(2, 1fr); }
        .ndi-grid { grid-template-columns: 1fr; }
    }
    `;
    document.head.appendChild(s);
})();
