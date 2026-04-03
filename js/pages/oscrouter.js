/**
 * OSC Router — Open Sound Control message routing, sending, and monitoring
 * Supports manual OSC target management, message composition, route mapping,
 * preset quick-fire buttons, and activity logging.
 * Actual OSC UDP transport requires Node.js dgram in Electron context.
 */
const OscRouterPage = {

    // ---- Data ----
    _targets: [],       // { id, name, ip, port, status, lastPing }
    _routes: [],        // { id, inAddress, outAddress, targetId, enabled }
    _log: [],           // { ts, address, args, targetName, targetIp, type }
    _view: 'connections', // 'connections' | 'sender' | 'routes' | 'presets' | 'log'
    _pollTimer: null,
    _pollInterval: 5000,
    _maxLogEntries: 500,

    _storageKeys: {
        targets: 'luxor_osc_targets',
        routes:  'luxor_osc_routes',
    },

    // ---- Preset Messages ----
    _presets: [
        { category: 'QLab', icon: 'fa-play-circle', color: '#4CAF50', items: [
            { label: 'GO',    address: '/go',         args: [], desc: 'Fire current cue' },
            { label: 'STOP',  address: '/stop',       args: [], desc: 'Stop current cue' },
            { label: 'PANIC', address: '/panic',      args: [], desc: 'Panic — stop all' },
            { label: 'Pause', address: '/pause',      args: [], desc: 'Pause current cue' },
            { label: 'Resume',address: '/resume',     args: [], desc: 'Resume current cue' },
            { label: 'Reset', address: '/reset',      args: [], desc: 'Reset playhead' },
            { label: 'Next',  address: '/playhead/next', args: [], desc: 'Move playhead next' },
            { label: 'Prev',  address: '/playhead/previous', args: [], desc: 'Move playhead previous' },
        ]},
        { category: 'Resolume Arena', icon: 'fa-film', color: '#FF9800', items: [
            { label: 'Layer 1 Clip 1', address: '/composition/layers/1/clips/1/connect', args: [{ type: 'int', value: 1 }], desc: 'Trigger clip 1 on layer 1' },
            { label: 'Layer 1 Clip 2', address: '/composition/layers/1/clips/2/connect', args: [{ type: 'int', value: 1 }], desc: 'Trigger clip 2 on layer 1' },
            { label: 'Layer 2 Clip 1', address: '/composition/layers/2/clips/1/connect', args: [{ type: 'int', value: 1 }], desc: 'Trigger clip 1 on layer 2' },
            { label: 'Layer 1 Opacity', address: '/composition/layers/1/video/opacity', args: [{ type: 'float', value: 1.0 }], desc: 'Set layer 1 opacity to 100%' },
            { label: 'Layer 1 Clear', address: '/composition/layers/1/clear', args: [{ type: 'int', value: 1 }], desc: 'Clear layer 1' },
            { label: 'Column 1', address: '/composition/columns/1/connect', args: [{ type: 'int', value: 1 }], desc: 'Trigger column 1' },
        ]},
        { category: 'ETC Eos', icon: 'fa-lightbulb', color: '#E91E63', items: [
            { label: 'Cue 1 GO',    address: '/eos/cue/1/fire', args: [], desc: 'Fire cue 1' },
            { label: 'Cue 2 GO',    address: '/eos/cue/2/fire', args: [], desc: 'Fire cue 2' },
            { label: 'Cue 5 GO',    address: '/eos/cue/5/fire', args: [], desc: 'Fire cue 5' },
            { label: 'Cue 10 GO',   address: '/eos/cue/10/fire', args: [], desc: 'Fire cue 10' },
            { label: 'Grand Master', address: '/eos/fader/1/1', args: [{ type: 'float', value: 1.0 }], desc: 'Grand master to full' },
            { label: 'Blackout',     address: '/eos/fader/1/1', args: [{ type: 'float', value: 0.0 }], desc: 'Grand master blackout' },
        ]},
        { category: 'Generic', icon: 'fa-broadcast-tower', color: '#2196F3', items: [
            { label: 'Ping',        address: '/ping',          args: [], desc: 'Send /ping' },
            { label: 'Heartbeat',   address: '/heartbeat',     args: [{ type: 'int', value: 1 }], desc: 'Send heartbeat' },
            { label: 'Go Cue',      address: '/cue/1/go',      args: [], desc: 'Generic cue GO' },
            { label: 'Standby',     address: '/cue/1/standby',  args: [], desc: 'Generic standby' },
        ]},
    ],

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        this._loadData();
        const onlineCount = this._targets.filter(t => t.status === 'online').length;
        const totalTargets = this._targets.length;
        const routeCount = this._routes.length;
        const activeRoutes = this._routes.filter(r => r.enabled).length;

        return `
        <div class="osc-page">
            <div class="osc-header">
                <div style="display:flex;align-items:center;gap:12px;flex:1">
                    <h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-exchange-alt" style="color:var(--accent);margin-right:8px"></i>OSC Router</h2>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${totalTargets} target${totalTargets !== 1 ? 's' : ''}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-sm" onclick="OscRouterPage._pingAll()" title="Ping All Targets"><i class="fas fa-sync-alt"></i> Refresh</button>
                    <button class="btn btn-sm btn-primary" onclick="OscRouterPage._showAddTarget()"><i class="fas fa-plus"></i> Add Target</button>
                </div>
            </div>

            <!-- Summary Bar -->
            <div class="osc-summary">
                <div class="osc-summary-card">
                    <div class="osc-summary-icon" style="color:var(--accent)"><i class="fas fa-server"></i></div>
                    <div class="osc-summary-data">
                        <div class="osc-summary-val">${totalTargets}</div>
                        <div class="osc-summary-label">Targets</div>
                    </div>
                </div>
                <div class="osc-summary-card">
                    <div class="osc-summary-icon" style="color:var(--green)"><i class="fas fa-circle"></i></div>
                    <div class="osc-summary-data">
                        <div class="osc-summary-val">${onlineCount}</div>
                        <div class="osc-summary-label">Online</div>
                    </div>
                </div>
                <div class="osc-summary-card">
                    <div class="osc-summary-icon" style="color:var(--accent)"><i class="fas fa-route"></i></div>
                    <div class="osc-summary-data">
                        <div class="osc-summary-val">${routeCount}</div>
                        <div class="osc-summary-label">Routes</div>
                    </div>
                </div>
                <div class="osc-summary-card">
                    <div class="osc-summary-icon" style="color:var(--green)"><i class="fas fa-check-circle"></i></div>
                    <div class="osc-summary-data">
                        <div class="osc-summary-val">${activeRoutes}</div>
                        <div class="osc-summary-label">Active Routes</div>
                    </div>
                </div>
            </div>

            <!-- View Tabs -->
            <div class="osc-tabs">
                <button class="osc-tab ${this._view === 'connections' ? 'active' : ''}" onclick="OscRouterPage._setView('connections')"><i class="fas fa-plug"></i> Connections</button>
                <button class="osc-tab ${this._view === 'sender' ? 'active' : ''}" onclick="OscRouterPage._setView('sender')"><i class="fas fa-paper-plane"></i> Message Sender</button>
                <button class="osc-tab ${this._view === 'routes' ? 'active' : ''}" onclick="OscRouterPage._setView('routes')"><i class="fas fa-project-diagram"></i> Route Map</button>
                <button class="osc-tab ${this._view === 'presets' ? 'active' : ''}" onclick="OscRouterPage._setView('presets')"><i class="fas fa-bolt"></i> Presets</button>
                <button class="osc-tab ${this._view === 'log' ? 'active' : ''}" onclick="OscRouterPage._setView('log')"><i class="fas fa-list-alt"></i> Activity Log</button>
            </div>

            <!-- View Content -->
            <div class="osc-content" id="osc-content">
                ${this._renderView()}
            </div>
        </div>`;
    },

    _renderView() {
        switch (this._view) {
            case 'connections': return this._renderConnectionsView();
            case 'sender':     return this._renderSenderView();
            case 'routes':     return this._renderRoutesView();
            case 'presets':    return this._renderPresetsView();
            case 'log':        return this._renderLogView();
            default:           return this._renderConnectionsView();
        }
    },

    // ============================================================
    // CONNECTIONS VIEW
    // ============================================================
    _renderConnectionsView() {
        if (this._targets.length === 0) {
            return `<div class="osc-empty">
                <i class="fas fa-plug" style="font-size:32px;opacity:0.3"></i>
                <p>No OSC targets configured.<br>Click <strong>+ Add Target</strong> to register an OSC destination.</p>
            </div>`;
        }
        return `<div class="osc-grid">${this._targets.map(t => this._renderTargetCard(t)).join('')}</div>`;
    },

    _renderTargetCard(t) {
        const status = t.status || 'unknown';
        const statusColor = status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--text-muted)';
        const statusIcon = status === 'online' ? 'fa-check-circle' : status === 'offline' ? 'fa-times-circle' : 'fa-question-circle';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const routeCount = this._routes.filter(r => r.targetId === t.id).length;

        return `
        <div class="osc-card ${status}">
            <div class="osc-card-header">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                    <i class="fas ${statusIcon}" style="color:${statusColor};font-size:14px"></i>
                    <div style="flex:1;min-width:0">
                        <div class="osc-card-name">${UI.esc(t.name)}</div>
                        <div class="osc-card-meta">OSC Target</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="OscRouterPage._pingTarget('${t.id}')" title="Ping"><i class="fas fa-satellite-dish"></i></button>
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="OscRouterPage._showEditTarget('${t.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="OscRouterPage._removeTarget('${t.id}')" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="osc-card-ip">${UI.esc(t.ip)}:${UI.esc(String(t.port))}</div>
            <div class="osc-card-stats">
                <div class="osc-stat">
                    <div class="osc-stat-val">${t.port}</div>
                    <div class="osc-stat-label">Port</div>
                </div>
                <div class="osc-stat">
                    <div class="osc-stat-val">${routeCount}</div>
                    <div class="osc-stat-label">Routes</div>
                </div>
                <div class="osc-stat">
                    <div class="osc-stat-val">${t.lastPing ? Math.round((Date.now() - t.lastPing) / 1000) + 's' : '--'}</div>
                    <div class="osc-stat-label">Last Ping</div>
                </div>
            </div>
            <div class="osc-card-footer">
                <span style="font-size:10px;color:${statusColor}"><i class="fas ${statusIcon}"></i> ${statusLabel}</span>
                <button class="btn btn-sm" style="padding:2px 10px;font-size:10px" onclick="OscRouterPage._quickSend('${t.id}')"><i class="fas fa-paper-plane"></i> Quick Send</button>
            </div>
        </div>`;
    },

    // ============================================================
    // MESSAGE SENDER VIEW
    // ============================================================
    _renderSenderView() {
        const targetOpts = this._targets.map(t => `<option value="${t.id}">${UI.esc(t.name)} (${UI.esc(t.ip)}:${t.port})</option>`).join('');

        return `
        <div class="osc-sender-panel">
            <div class="osc-sender-card">
                <h3 style="font-size:14px;font-weight:600;margin:0 0 16px 0"><i class="fas fa-paper-plane" style="margin-right:6px;color:var(--accent)"></i>Compose OSC Message</h3>

                <div class="osc-form-row">
                    <div class="osc-form-group" style="flex:2">
                        <label class="osc-form-label">Target</label>
                        <select id="osc-send-target" class="osc-input">
                            <option value="">-- Select Target --</option>
                            ${targetOpts}
                        </select>
                    </div>
                </div>

                <div class="osc-form-row">
                    <div class="osc-form-group" style="flex:3">
                        <label class="osc-form-label">Address Pattern</label>
                        <input type="text" id="osc-send-address" class="osc-input" placeholder="/cue/1/go" spellcheck="false">
                    </div>
                </div>

                <div id="osc-args-container">
                    <label class="osc-form-label" style="margin-bottom:6px">Arguments</label>
                    <div id="osc-args-list"></div>
                    <button class="btn btn-sm" style="margin-top:6px" onclick="OscRouterPage._addArgField()"><i class="fas fa-plus"></i> Add Argument</button>
                </div>

                <div style="margin-top:16px;display:flex;gap:8px">
                    <button class="btn btn-primary" onclick="OscRouterPage._sendFromForm()"><i class="fas fa-paper-plane"></i> Send Message</button>
                    <button class="btn btn-sm" onclick="OscRouterPage._clearSenderForm()"><i class="fas fa-eraser"></i> Clear</button>
                </div>
            </div>

            <!-- Recent from log -->
            <div class="osc-sender-card" style="margin-top:16px">
                <h3 style="font-size:14px;font-weight:600;margin:0 0 12px 0"><i class="fas fa-history" style="margin-right:6px;color:var(--text-muted)"></i>Recent Messages</h3>
                <div class="osc-recent-list">
                    ${this._log.length === 0 ? '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px">No messages sent yet.</div>' : ''}
                    ${this._log.slice(0, 10).map(entry => `
                        <div class="osc-recent-item" onclick="OscRouterPage._resend(${JSON.stringify(entry).replace(/"/g, '&quot;')})">
                            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
                                <i class="fas fa-arrow-right" style="color:var(--accent);font-size:9px"></i>
                                <span class="osc-recent-addr">${UI.esc(entry.address)}</span>
                                <span style="font-size:10px;color:var(--text-muted)">${UI.esc(entry.targetName || '')}</span>
                            </div>
                            <span style="font-size:9px;color:var(--text-muted)">${this._formatTime(entry.ts)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    // ============================================================
    // ROUTE MAP VIEW
    // ============================================================
    _renderRoutesView() {
        return `
        <div class="osc-routes-panel">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                <h3 style="font-size:14px;font-weight:600;margin:0"><i class="fas fa-project-diagram" style="margin-right:6px;color:var(--accent)"></i>OSC Route Map</h3>
                <button class="btn btn-sm btn-primary" onclick="OscRouterPage._showAddRoute()"><i class="fas fa-plus"></i> Add Route</button>
            </div>
            ${this._routes.length === 0 ? `
                <div class="osc-empty">
                    <i class="fas fa-project-diagram" style="font-size:32px;opacity:0.3"></i>
                    <p>No routes configured.<br>Create a route to map incoming OSC addresses to outgoing destinations.</p>
                </div>
            ` : `
                <div class="osc-route-list">
                    <div class="osc-route-header-row">
                        <span style="flex:1">Incoming Address</span>
                        <span style="width:30px;text-align:center"><i class="fas fa-arrow-right"></i></span>
                        <span style="flex:1">Outgoing Address</span>
                        <span style="flex:1">Target</span>
                        <span style="width:60px;text-align:center">Enabled</span>
                        <span style="width:60px;text-align:center">Actions</span>
                    </div>
                    ${this._routes.map(r => {
                        const target = this._targets.find(t => t.id === r.targetId);
                        const targetName = target ? target.name : 'Unknown';
                        const statusDot = target ? (target.status === 'online' ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)';
                        return `
                        <div class="osc-route-row ${r.enabled ? '' : 'disabled'}">
                            <span class="osc-route-addr" style="flex:1">${UI.esc(r.inAddress)}</span>
                            <span style="width:30px;text-align:center;color:var(--accent)"><i class="fas fa-arrow-right"></i></span>
                            <span class="osc-route-addr" style="flex:1">${UI.esc(r.outAddress)}</span>
                            <span style="flex:1;display:flex;align-items:center;gap:6px">
                                <i class="fas fa-circle" style="font-size:6px;color:${statusDot}"></i>
                                <span style="font-size:11px">${UI.esc(targetName)}</span>
                            </span>
                            <span style="width:60px;text-align:center">
                                <label class="osc-toggle-mini">
                                    <input type="checkbox" ${r.enabled ? 'checked' : ''} onchange="OscRouterPage._toggleRoute('${r.id}')">
                                    <span class="osc-toggle-slider-mini"></span>
                                </label>
                            </span>
                            <span style="width:60px;text-align:center;display:flex;gap:4px;justify-content:center">
                                <button class="btn btn-sm" style="padding:2px 6px;font-size:10px" onclick="OscRouterPage._showEditRoute('${r.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                                <button class="btn btn-sm" style="padding:2px 6px;font-size:10px" onclick="OscRouterPage._removeRoute('${r.id}')" title="Remove"><i class="fas fa-trash"></i></button>
                            </span>
                        </div>`;
                    }).join('')}
                </div>
            `}
        </div>`;
    },

    // ============================================================
    // PRESETS VIEW
    // ============================================================
    _renderPresetsView() {
        const targetOpts = this._targets.map(t => `<option value="${t.id}">${UI.esc(t.name)} (${UI.esc(t.ip)}:${t.port})</option>`).join('');

        return `
        <div class="osc-presets-panel">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <label class="osc-form-label" style="margin:0">Send to:</label>
                <select id="osc-preset-target" class="osc-input" style="max-width:300px">
                    <option value="">-- Select Target --</option>
                    ${targetOpts}
                </select>
            </div>
            ${this._presets.map(cat => `
                <div class="osc-preset-category">
                    <h3 class="osc-preset-cat-title"><i class="fas ${cat.icon}" style="color:${cat.color};margin-right:8px"></i>${UI.esc(cat.category)}</h3>
                    <div class="osc-preset-grid">
                        ${cat.items.map((p, idx) => `
                            <button class="osc-preset-btn" onclick="OscRouterPage._firePreset('${cat.category}', ${idx})" title="${UI.esc(p.desc + ' — ' + p.address)}">
                                <div class="osc-preset-btn-label">${UI.esc(p.label)}</div>
                                <div class="osc-preset-btn-addr">${UI.esc(p.address)}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>`;
    },

    // ============================================================
    // ACTIVITY LOG VIEW
    // ============================================================
    _renderLogView() {
        return `
        <div class="osc-log-panel">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <h3 style="font-size:14px;font-weight:600;margin:0"><i class="fas fa-list-alt" style="margin-right:6px;color:var(--accent)"></i>Activity Log</h3>
                <div style="display:flex;gap:8px">
                    <span style="font-size:10px;color:var(--text-muted);align-self:center">${this._log.length} entries</span>
                    <button class="btn btn-sm" onclick="OscRouterPage._clearLog()"><i class="fas fa-eraser"></i> Clear</button>
                </div>
            </div>
            <div class="osc-log-scroll" id="osc-log-scroll">
                ${this._log.length === 0 ? '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:32px">No activity yet. Send a message or fire a preset to see entries here.</div>' : ''}
                <table class="osc-log-table">
                    <thead>
                        <tr>
                            <th style="width:80px">Time</th>
                            <th style="width:60px">Type</th>
                            <th>Address</th>
                            <th>Arguments</th>
                            <th>Target</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._log.map(entry => `
                            <tr>
                                <td class="osc-log-time">${this._formatTime(entry.ts)}</td>
                                <td><span class="osc-log-type-badge ${entry.type || 'send'}">${UI.esc(entry.type || 'send')}</span></td>
                                <td class="osc-log-addr">${UI.esc(entry.address)}</td>
                                <td class="osc-log-args">${UI.esc(this._formatArgs(entry.args))}</td>
                                <td style="font-size:11px">${UI.esc(entry.targetName || '--')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    // ============================================================
    // DATA MANAGEMENT
    // ============================================================
    _loadData() {
        try { this._targets = JSON.parse(localStorage.getItem(this._storageKeys.targets)) || []; } catch { this._targets = []; }
        try { this._routes = JSON.parse(localStorage.getItem(this._storageKeys.routes)) || []; } catch { this._routes = []; }
    },

    _saveTargets() {
        localStorage.setItem(this._storageKeys.targets, JSON.stringify(this._targets));
    },

    _saveRoutes() {
        localStorage.setItem(this._storageKeys.routes, JSON.stringify(this._routes));
    },

    // ============================================================
    // TARGET MANAGEMENT
    // ============================================================
    _showAddTarget() {
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px">
                ${UI.formGroup('Name', '<input type="text" id="osc-t-name" class="form-control" placeholder="QLab Mac Pro">')}
                ${UI.formGroup('IP Address', '<input type="text" id="osc-t-ip" class="form-control" placeholder="192.168.1.100">')}
                ${UI.formGroup('Port', '<input type="number" id="osc-t-port" class="form-control" placeholder="53000" value="53000">')}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="OscRouterPage._addTarget()">Add Target</button>`;
        UI.openModal('Add OSC Target', body, footer);
    },

    _addTarget() {
        const name = document.getElementById('osc-t-name')?.value.trim();
        const ip   = document.getElementById('osc-t-ip')?.value.trim();
        const port = parseInt(document.getElementById('osc-t-port')?.value, 10);
        if (!name || !ip || !port) { UI.toast('Please fill all fields', 'warning'); return; }
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) { UI.toast('Invalid IP address format', 'warning'); return; }
        if (port < 1 || port > 65535) { UI.toast('Port must be 1-65535', 'warning'); return; }

        const target = {
            id: 'osc-' + Date.now().toString(36),
            name, ip, port,
            status: 'unknown',
            lastPing: null,
        };
        this._targets.push(target);
        this._saveTargets();
        UI.closeModal();
        UI.toast('Target added: ' + name, 'success');
        this._pingTarget(target.id);
        this.refresh();
    },

    _showEditTarget(id) {
        const t = this._targets.find(x => x.id === id);
        if (!t) return;
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px">
                ${UI.formGroup('Name', `<input type="text" id="osc-t-name" class="form-control" value="${UI.esc(t.name)}">`)}
                ${UI.formGroup('IP Address', `<input type="text" id="osc-t-ip" class="form-control" value="${UI.esc(t.ip)}">`)}
                ${UI.formGroup('Port', `<input type="number" id="osc-t-port" class="form-control" value="${t.port}">`)}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="OscRouterPage._updateTarget('${id}')">Save</button>`;
        UI.openModal('Edit OSC Target', body, footer);
    },

    _updateTarget(id) {
        const t = this._targets.find(x => x.id === id);
        if (!t) return;
        const name = document.getElementById('osc-t-name')?.value.trim();
        const ip   = document.getElementById('osc-t-ip')?.value.trim();
        const port = parseInt(document.getElementById('osc-t-port')?.value, 10);
        if (!name || !ip || !port) { UI.toast('Please fill all fields', 'warning'); return; }
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) { UI.toast('Invalid IP address format', 'warning'); return; }

        t.name = name; t.ip = ip; t.port = port;
        this._saveTargets();
        UI.closeModal();
        UI.toast('Target updated: ' + name, 'success');
        this.refresh();
    },

    async _removeTarget(id) {
        const t = this._targets.find(x => x.id === id);
        if (!t) return;
        const ok = await UI.confirm('Remove Target', `Remove "${t.name}" (${t.ip}:${t.port})? Routes assigned to this target will also be removed.`);
        if (!ok) return;
        this._targets = this._targets.filter(x => x.id !== id);
        this._routes = this._routes.filter(r => r.targetId !== id);
        this._saveTargets();
        this._saveRoutes();
        UI.toast('Target removed', 'success');
        this.refresh();
    },

    // ============================================================
    // CONNECTION / PING
    // ============================================================
    async _pingTarget(id) {
        const t = this._targets.find(x => x.id === id);
        if (!t) return;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            await fetch(`http://${t.ip}`, { mode: 'no-cors', signal: controller.signal });
            clearTimeout(timeout);
            t.status = 'online';
            t.lastPing = Date.now();
        } catch {
            t.status = 'offline';
            t.lastPing = Date.now();
        }
        this._saveTargets();
        this._refreshContent();
    },

    async _pingAll() {
        await Promise.allSettled(this._targets.map(t => this._pingTarget(t.id)));
    },

    // ============================================================
    // OSC SEND — dgram (Electron) with browser fallback
    // ============================================================
    _sendOSC(ip, port, address, args) {
        try {
            // Attempt Node.js dgram (Electron context)
            const dgram = require('dgram');
            const client = dgram.createSocket('udp4');
            const buf = this._buildOSCBuffer(address, args);
            client.send(buf, 0, buf.length, port, ip, (err) => {
                client.close();
                if (err) {
                    UI.toast('Send error: ' + err.message, 'error');
                } else {
                    UI.toast(`Sent ${address} to ${ip}:${port}`, 'success');
                }
            });
            return true;
        } catch (e) {
            // Browser context — dgram not available
            UI.toast(`OSC message queued: ${address} to ${ip}:${port} (UDP requires Electron/Node.js)`, 'warning');
            return false;
        }
    },

    /**
     * Build a minimal OSC message buffer.
     * OSC spec: address (null-padded to 4-byte boundary), type tag string, arguments.
     */
    _buildOSCBuffer(address, args) {
        const parts = [];

        // Address string (null-terminated, padded to 4 bytes)
        parts.push(this._oscString(address));

        // Type tag string
        let typeTag = ',';
        const argBuffers = [];
        (args || []).forEach(a => {
            switch (a.type) {
                case 'int': {
                    typeTag += 'i';
                    const b = Buffer.alloc(4);
                    b.writeInt32BE(parseInt(a.value, 10), 0);
                    argBuffers.push(b);
                    break;
                }
                case 'float': {
                    typeTag += 'f';
                    const b = Buffer.alloc(4);
                    b.writeFloatBE(parseFloat(a.value), 0);
                    argBuffers.push(b);
                    break;
                }
                case 'string': {
                    typeTag += 's';
                    argBuffers.push(this._oscString(String(a.value)));
                    break;
                }
            }
        });
        parts.push(this._oscString(typeTag));
        argBuffers.forEach(b => parts.push(b));

        return Buffer.concat(parts);
    },

    _oscString(str) {
        const len = Buffer.byteLength(str, 'utf8') + 1; // include null
        const padded = len + (4 - (len % 4)) % 4;
        const buf = Buffer.alloc(padded, 0);
        buf.write(str, 0, 'utf8');
        return buf;
    },

    // ============================================================
    // SENDER FORM
    // ============================================================
    _argFieldCount: 0,

    _addArgField() {
        const list = document.getElementById('osc-args-list');
        if (!list) return;
        const idx = this._argFieldCount++;
        const row = document.createElement('div');
        row.className = 'osc-arg-row';
        row.id = 'osc-arg-' + idx;
        row.innerHTML = `
            <select id="osc-arg-type-${idx}" class="osc-input" style="width:90px">
                <option value="int">int</option>
                <option value="float">float</option>
                <option value="string">string</option>
            </select>
            <input type="text" id="osc-arg-val-${idx}" class="osc-input" placeholder="Value" style="flex:1">
            <button class="btn btn-sm" style="padding:2px 8px" onclick="document.getElementById('osc-arg-${idx}').remove()"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(row);
    },

    _clearSenderForm() {
        const addr = document.getElementById('osc-send-address');
        if (addr) addr.value = '';
        const list = document.getElementById('osc-args-list');
        if (list) list.innerHTML = '';
        this._argFieldCount = 0;
    },

    _sendFromForm() {
        const targetId = document.getElementById('osc-send-target')?.value;
        const address = document.getElementById('osc-send-address')?.value.trim();
        if (!targetId) { UI.toast('Select a target', 'warning'); return; }
        if (!address || !address.startsWith('/')) { UI.toast('Address must start with /', 'warning'); return; }

        const target = this._targets.find(t => t.id === targetId);
        if (!target) { UI.toast('Target not found', 'error'); return; }

        // Collect args
        const args = [];
        const list = document.getElementById('osc-args-list');
        if (list) {
            list.querySelectorAll('.osc-arg-row').forEach(row => {
                const sel = row.querySelector('select');
                const inp = row.querySelector('input');
                if (sel && inp && inp.value.trim()) {
                    args.push({ type: sel.value, value: inp.value.trim() });
                }
            });
        }

        this._sendOSC(target.ip, target.port, address, args);
        this._addLogEntry(address, args, target, 'send');
        this._refreshContent();
    },

    _quickSend(targetId) {
        this._view = 'sender';
        this.refresh();
        setTimeout(() => {
            const sel = document.getElementById('osc-send-target');
            if (sel) sel.value = targetId;
        }, 50);
    },

    _resend(entry) {
        if (!entry) return;
        const target = this._targets.find(t => t.name === entry.targetName);
        if (target) {
            this._sendOSC(target.ip, target.port, entry.address, entry.args || []);
            this._addLogEntry(entry.address, entry.args || [], target, 'resend');
        } else {
            UI.toast('Original target no longer exists', 'warning');
        }
    },

    // ============================================================
    // PRESETS
    // ============================================================
    _firePreset(category, idx) {
        const cat = this._presets.find(c => c.category === category);
        if (!cat || !cat.items[idx]) return;

        const targetId = document.getElementById('osc-preset-target')?.value;
        if (!targetId) { UI.toast('Select a target first', 'warning'); return; }
        const target = this._targets.find(t => t.id === targetId);
        if (!target) { UI.toast('Target not found', 'error'); return; }

        const preset = cat.items[idx];
        this._sendOSC(target.ip, target.port, preset.address, preset.args || []);
        this._addLogEntry(preset.address, preset.args || [], target, 'preset');
    },

    // ============================================================
    // ROUTE MANAGEMENT
    // ============================================================
    _showAddRoute() {
        const targetOpts = this._targets.map(t => `<option value="${t.id}">${UI.esc(t.name)} (${UI.esc(t.ip)}:${t.port})</option>`).join('');
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px">
                ${UI.formGroup('Incoming OSC Address', '<input type="text" id="osc-r-in" class="form-control" placeholder="/cue/*/go" spellcheck="false">', 'The address pattern to match. Use * as wildcard.')}
                ${UI.formGroup('Outgoing OSC Address', '<input type="text" id="osc-r-out" class="form-control" placeholder="/go" spellcheck="false">', 'The address to send to the target.')}
                ${UI.formGroup('Target', `<select id="osc-r-target" class="form-control"><option value="">-- Select --</option>${targetOpts}</select>`)}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="OscRouterPage._addRoute()">Add Route</button>`;
        UI.openModal('Add OSC Route', body, footer);
    },

    _addRoute() {
        const inAddr  = document.getElementById('osc-r-in')?.value.trim();
        const outAddr = document.getElementById('osc-r-out')?.value.trim();
        const targetId = document.getElementById('osc-r-target')?.value;
        if (!inAddr || !outAddr || !targetId) { UI.toast('Please fill all fields', 'warning'); return; }
        if (!inAddr.startsWith('/') || !outAddr.startsWith('/')) { UI.toast('Addresses must start with /', 'warning'); return; }

        const route = {
            id: 'route-' + Date.now().toString(36),
            inAddress: inAddr,
            outAddress: outAddr,
            targetId,
            enabled: true,
        };
        this._routes.push(route);
        this._saveRoutes();
        UI.closeModal();
        UI.toast('Route added', 'success');
        this.refresh();
    },

    _showEditRoute(id) {
        const r = this._routes.find(x => x.id === id);
        if (!r) return;
        const targetOpts = this._targets.map(t => `<option value="${t.id}" ${t.id === r.targetId ? 'selected' : ''}>${UI.esc(t.name)} (${UI.esc(t.ip)}:${t.port})</option>`).join('');
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px">
                ${UI.formGroup('Incoming OSC Address', `<input type="text" id="osc-r-in" class="form-control" value="${UI.esc(r.inAddress)}" spellcheck="false">`)}
                ${UI.formGroup('Outgoing OSC Address', `<input type="text" id="osc-r-out" class="form-control" value="${UI.esc(r.outAddress)}" spellcheck="false">`)}
                ${UI.formGroup('Target', `<select id="osc-r-target" class="form-control"><option value="">-- Select --</option>${targetOpts}</select>`)}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="OscRouterPage._updateRoute('${id}')">Save</button>`;
        UI.openModal('Edit OSC Route', body, footer);
    },

    _updateRoute(id) {
        const r = this._routes.find(x => x.id === id);
        if (!r) return;
        const inAddr  = document.getElementById('osc-r-in')?.value.trim();
        const outAddr = document.getElementById('osc-r-out')?.value.trim();
        const targetId = document.getElementById('osc-r-target')?.value;
        if (!inAddr || !outAddr || !targetId) { UI.toast('Please fill all fields', 'warning'); return; }

        r.inAddress = inAddr; r.outAddress = outAddr; r.targetId = targetId;
        this._saveRoutes();
        UI.closeModal();
        UI.toast('Route updated', 'success');
        this.refresh();
    },

    _toggleRoute(id) {
        const r = this._routes.find(x => x.id === id);
        if (!r) return;
        r.enabled = !r.enabled;
        this._saveRoutes();
    },

    async _removeRoute(id) {
        const ok = await UI.confirm('Remove Route', 'Remove this route?');
        if (!ok) return;
        this._routes = this._routes.filter(x => x.id !== id);
        this._saveRoutes();
        UI.toast('Route removed', 'success');
        this.refresh();
    },

    // ============================================================
    // ACTIVITY LOG
    // ============================================================
    _addLogEntry(address, args, target, type) {
        this._log.unshift({
            ts: Date.now(),
            address,
            args: args || [],
            targetName: target ? target.name : '--',
            targetIp: target ? target.ip + ':' + target.port : '--',
            type: type || 'send',
        });
        if (this._log.length > this._maxLogEntries) {
            this._log = this._log.slice(0, this._maxLogEntries);
        }
    },

    _clearLog() {
        this._log = [];
        this._refreshContent();
        UI.toast('Activity log cleared', 'info');
    },

    // ============================================================
    // HELPERS
    // ============================================================
    _formatTime(ts) {
        if (!ts) return '--';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    _formatArgs(args) {
        if (!args || args.length === 0) return '(none)';
        return args.map(a => `${a.type}:${a.value}`).join(', ');
    },

    _refreshContent() {
        const el = document.getElementById('osc-content');
        if (el) el.innerHTML = this._renderView();
    },

    _setView(view) {
        this._view = view;
        this.refresh();
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    renderSidebarList() {
        // OSC Router has no sidebar items
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
        if (container && appState.get('currentPage') === 'oscrouter') {
            container.innerHTML = this.render();
        }
    },
};

// ================================================================
// CSS — injected once
// ================================================================
(function() {
    if (document.getElementById('oscrouter-css')) return;
    const s = document.createElement('style');
    s.id = 'oscrouter-css';
    s.textContent = `
    .osc-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .osc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }

    /* Summary Cards */
    .osc-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .osc-summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .osc-summary-icon { font-size: 22px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); }
    .osc-summary-val { font-size: 24px; font-weight: 700; line-height: 1; }
    .osc-summary-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* View Tabs */
    .osc-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
    .osc-tab { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-muted); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .osc-tab:hover { border-color: var(--accent); color: var(--text-primary); }
    .osc-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Empty State */
    .osc-empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .osc-empty p { margin-top: 12px; font-size: 13px; }

    /* Target Grid */
    .osc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }

    /* Target Card */
    .osc-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: all 0.2s; }
    .osc-card:hover { border-color: var(--accent); transform: translateY(-1px); }
    .osc-card.offline { border-left: 3px solid var(--red); }
    .osc-card.online { border-left: 3px solid var(--green); }
    .osc-card.unknown { border-left: 3px solid var(--text-muted); }
    .osc-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .osc-card-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .osc-card-meta { font-size: 10px; color: var(--text-muted); }
    .osc-card-ip { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px; padding: 3px 8px; background: var(--bg-tertiary); border-radius: 4px; display: inline-block; }
    .osc-card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
    .osc-stat { text-align: center; }
    .osc-stat-val { font-size: 14px; font-weight: 700; line-height: 1.2; }
    .osc-stat-label { font-size: 9px; color: var(--text-muted); }
    .osc-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); }

    /* Sender Panel */
    .osc-sender-panel { max-width: 700px; }
    .osc-sender-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
    .osc-form-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .osc-form-group { display: flex; flex-direction: column; }
    .osc-form-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
    .osc-input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box; }
    .osc-input:focus { border-color: var(--accent); }
    .osc-arg-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }

    /* Recent Messages */
    .osc-recent-list { display: flex; flex-direction: column; gap: 2px; max-height: 260px; overflow-y: auto; }
    .osc-recent-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
    .osc-recent-item:hover { background: var(--bg-tertiary); }
    .osc-recent-addr { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; }

    /* Route Map */
    .osc-routes-panel { }
    .osc-route-list { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .osc-route-header-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--bg-tertiary); font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .osc-route-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border); transition: background 0.15s; }
    .osc-route-row:hover { background: var(--bg-tertiary); }
    .osc-route-row.disabled { opacity: 0.5; }
    .osc-route-addr { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; }

    /* Mini Toggle */
    .osc-toggle-mini { position: relative; display: inline-block; width: 32px; height: 18px; cursor: pointer; }
    .osc-toggle-mini input { opacity: 0; width: 0; height: 0; }
    .osc-toggle-slider-mini { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--bg-tertiary); border-radius: 18px; border: 1px solid var(--border); transition: 0.2s; }
    .osc-toggle-slider-mini::before { content: ''; position: absolute; height: 12px; width: 12px; left: 2px; top: 2px; background: var(--text-muted); border-radius: 50%; transition: 0.2s; }
    .osc-toggle-mini input:checked + .osc-toggle-slider-mini { background: var(--accent); border-color: var(--accent); }
    .osc-toggle-mini input:checked + .osc-toggle-slider-mini::before { transform: translateX(14px); background: #fff; }

    /* Presets */
    .osc-presets-panel { }
    .osc-preset-category { margin-bottom: 20px; }
    .osc-preset-cat-title { font-size: 14px; font-weight: 600; margin: 0 0 10px 0; }
    .osc-preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .osc-preset-btn { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px 10px; cursor: pointer; text-align: center; transition: all 0.2s; }
    .osc-preset-btn:hover { border-color: var(--accent); transform: translateY(-1px); background: var(--bg-tertiary); }
    .osc-preset-btn:active { transform: translateY(0); }
    .osc-preset-btn-label { font-size: 12px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); }
    .osc-preset-btn-addr { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-muted); word-break: break-all; }

    /* Activity Log */
    .osc-log-panel { }
    .osc-log-scroll { max-height: 500px; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; }
    .osc-log-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .osc-log-table thead { position: sticky; top: 0; z-index: 1; }
    .osc-log-table th { background: var(--bg-tertiary); padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
    .osc-log-table td { padding: 6px 10px; border-bottom: 1px solid var(--border); }
    .osc-log-table tr:hover td { background: var(--bg-tertiary); }
    .osc-log-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); }
    .osc-log-addr { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    .osc-log-args { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); }
    .osc-log-type-badge { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
    .osc-log-type-badge.send { background: var(--accent); color: #fff; }
    .osc-log-type-badge.preset { background: var(--green); color: #fff; }
    .osc-log-type-badge.resend { background: var(--bg-tertiary); color: var(--text-muted); }
    .osc-log-type-badge.route { background: #FF9800; color: #fff; }

    @media (max-width: 800px) {
        .osc-summary { grid-template-columns: repeat(2, 1fr); }
        .osc-grid { grid-template-columns: 1fr; }
        .osc-preset-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
        .osc-route-header-row, .osc-route-row { font-size: 10px; padding: 8px 10px; }
    }
    @media (max-width: 500px) {
        .osc-summary { grid-template-columns: 1fr; }
        .osc-tabs { flex-direction: column; }
    }
    `;
    document.head.appendChild(s);
})();
