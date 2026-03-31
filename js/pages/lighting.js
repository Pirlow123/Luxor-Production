/**
 * Lighting Console Controller — grandMA3/grandMA2 and Avolites Titan integration
 * Supports Web Remote API (MA) and Web API (Titan) for playback control and monitoring
 */
const LightingPage = {

    // ---- Console Database ----
    _consoles: [], // { id, name, type: 'ma'|'titan', model, ip, connected, lastSeen, status }
    _selectedId: null,
    _pollTimer: null,
    _pollInterval: 2000,

    // Console model presets
    _models: {
        ma: ['grandMA3 full-size', 'grandMA3 light', 'grandMA3 compact XT', 'grandMA2 full-size', 'grandMA2 light', 'grandMA2 ultra-light', 'grandMA3 onPC', 'grandMA2 onPC'],
        titan: ['Arena', 'Sapphire Touch', 'Tiger Touch II', 'Quartz', 'T1', 'T2', 'Titan Go', 'Titan Mobile'],
    },

    // ---- grandMA Web Remote API ----
    _ma: {
        baseUrl: (ip) => `http://${ip}/`,

        endpoints: {
            // Session / status
            sessionInfo:    { method: 'GET',  path: '' },
            programmerStatus:{ method: 'GET', path: '' },

            // Executor status
            executors:      { method: 'GET',  path: '' },

            // Playback commands (POST via web remote)
            go:             { method: 'POST', path: '' },
            pause:          { method: 'POST', path: '' },
            goBack:         { method: 'POST', path: '' },
            flash:          { method: 'POST', path: '' },
            top:            { method: 'POST', path: '' },

            // Cue list monitoring
            cueList:        { method: 'GET',  path: '' },

            // Grandmaster fader
            grandmaster:    { method: 'GET',  path: '' },
            setGrandmaster: { method: 'POST', path: '' },
        },

        // Playback command types
        commands: {
            go:      'Go',
            pause:   'Pause',
            goBack:  'GoBack',
            flash:   'Flash',
            top:     'Top',
        },
    },

    // ---- Avolites Titan Web API ----
    _titan: {
        baseUrl: (ip) => `http://${ip}:4430/titan/`,

        endpoints: {
            // Playback monitoring
            playbacks:      { method: 'GET',  path: 'get/Playbacks/' },
            handles:        { method: 'GET',  path: 'get/Handles/' },

            // Fire/kill cues
            firePlayback:   { method: 'POST', path: 'script/Playbacks/FirePlaybackAtLevel' },
            killPlayback:   { method: 'POST', path: 'script/Playbacks/KillPlayback' },

            // Handle management
            handleInfo:     { method: 'GET',  path: 'get/Handles/' },

            // Command line
            sendCommand:    { method: 'POST', path: 'script/Titan/SendCommand' },

            // System info
            systemInfo:     { method: 'GET',  path: 'get/System/' },
        },
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        const con = this._getSelected();
        return `
        <div class="section-header">
            <h2><i class="fas fa-lightbulb"></i> Lighting Console Controller</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm btn-primary" onclick="LightingPage.showAddConsole()"><i class="fas fa-plus"></i> Add Console</button>
            </div>
        </div>

        <div class="ptz-layout">
            <!-- Console List Sidebar -->
            <div class="ptz-camera-list">
                <div class="card" style="height:100%">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Consoles</h3></div>
                    <div class="card-body" style="padding:0" id="lc-console-list">
                        ${this._renderConsoleList()}
                    </div>
                </div>
            </div>

            <!-- Main Control Area -->
            <div class="ptz-controls-area" id="lc-controls">
                ${con ? this._renderControls(con) : this._renderNoConsole()}
            </div>
        </div>
        `;
    },

    // ---- Console List ----
    _renderConsoleList() {
        if (this._consoles.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px;font-size:12px">No consoles added.<br>Click + Add Console to get started.</div>';
        }
        return this._consoles.map(c => {
            const sel = c.id === this._selectedId;
            const dot = c.connected ? 'var(--green)' : 'var(--red)';
            const brand = c.type === 'ma' ? 'MA Lighting' : 'Avolites';
            return `
                <div class="ptz-cam-card ${sel ? 'selected' : ''}" onclick="LightingPage.selectConsole('${c.id}')">
                    <div class="flex" style="align-items:center;gap:8px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(c.name)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">${brand} ${UI.esc(c.model)} &bull; ${UI.esc(c.ip)}</div>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation();LightingPage.removeConsole('${c.id}')" title="Remove"><i class="fas fa-times" style="font-size:10px"></i></button>
                    </div>
                </div>`;
        }).join('');
    },

    _renderNoConsole() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:400px;color:var(--text-muted)">
                <div style="text-align:center">
                    <i class="fas fa-lightbulb" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block"></i>
                    <p>Select a console or add one to get started</p>
                </div>
            </div>`;
    },

    // ---- Main Controls ----
    _renderControls(con) {
        const brand = con.type === 'ma' ? 'MA Lighting' : 'Avolites';
        return `
        <!-- Console Status Bar -->
        <div class="ptz-status-bar">
            <div class="flex gap-md" style="align-items:center">
                <span style="font-weight:700;font-size:14px">${UI.esc(con.name)}</span>
                <span class="badge ${con.connected ? 'badge-success' : 'badge-danger'}">${con.connected ? 'CONNECTED' : 'OFFLINE'}</span>
                <span class="badge" style="background:var(--bg-tertiary)">${brand} ${UI.esc(con.model)}</span>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="LightingPage.refreshConsole('${con.id}')"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:12px">
            ${con.type === 'ma' ? this._renderMAControls(con) : this._renderTitanControls(con)}
        </div>
        `;
    },

    // ---- MA Controls ----
    _renderMAControls(con) {
        const st = con.status || {};
        const session = st.session || {};
        const programmer = st.programmer || {};
        const gm = st.grandmaster ?? '--';

        return `
            <!-- Session Info -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> Session Info</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr><td class="text-muted">Model</td><td>${UI.esc(con.model)}</td></tr>
                        <tr><td class="text-muted">IP Address</td><td class="mono">${UI.esc(con.ip)}</td></tr>
                        <tr><td class="text-muted">Session</td><td>${UI.esc(session.name || '--')}</td></tr>
                        <tr><td class="text-muted">User</td><td>${UI.esc(session.user || '--')}</td></tr>
                        <tr><td class="text-muted">Show File</td><td>${UI.esc(session.showFile || '--')}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Grandmaster -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Grandmaster</h3></div>
                <div class="card-body" style="text-align:center">
                    <div style="font-size:36px;font-weight:800;color:var(--accent);margin-bottom:8px">${gm !== '--' ? gm + '%' : '--'}</div>
                    <input type="range" min="0" max="100" value="${gm !== '--' ? gm : 100}" style="width:100%"
                        oninput="LightingPage._setGrandmaster('${con.id}', this.value)">
                </div>
            </div>

            <!-- Programmer Status -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-edit"></i> Programmer</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr><td class="text-muted">Active</td><td>${programmer.active ? '<span style="color:var(--green)">Yes</span>' : '<span style="color:var(--text-muted)">No</span>'}</td></tr>
                        <tr><td class="text-muted">Values</td><td>${programmer.values ?? '--'}</td></tr>
                        <tr><td class="text-muted">Fixtures</td><td>${programmer.fixtures ?? '--'}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Playback Controls (full width) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-play-circle"></i> Playback Controls</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:16px">
                        <button class="btn btn-success" onclick="LightingPage._maCommand('${con.id}','go')"><i class="fas fa-play"></i> Go</button>
                        <button class="btn btn-warning" onclick="LightingPage._maCommand('${con.id}','pause')"><i class="fas fa-pause"></i> Pause</button>
                        <button class="btn" onclick="LightingPage._maCommand('${con.id}','goBack')"><i class="fas fa-step-backward"></i> Go Back</button>
                        <button class="btn btn-accent" onclick="LightingPage._maCommand('${con.id}','flash')"><i class="fas fa-bolt"></i> Flash</button>
                        <button class="btn" onclick="LightingPage._maCommand('${con.id}','top')"><i class="fas fa-fast-backward"></i> Top</button>
                    </div>
                    ${this._renderExecutorStatus(st.executors || [])}
                </div>
            </div>

            <!-- Cue List -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-list-ol"></i> Cue List</h3></div>
                <div class="card-body">
                    ${this._renderCueList(st.cueList || [])}
                </div>
            </div>
        `;
    },

    _renderExecutorStatus(executors) {
        if (!executors || executors.length === 0) {
            return '<p class="text-muted" style="font-size:11px;text-align:center">No executor data available</p>';
        }
        return `
            <table style="width:100%;font-size:11px">
                <thead><tr><th>Executor</th><th>Name</th><th>Cue</th><th>Level</th><th>Status</th></tr></thead>
                <tbody>
                    ${executors.map(e => `
                        <tr>
                            <td class="mono">${UI.esc(String(e.id ?? '--'))}</td>
                            <td>${UI.esc(e.name || '--')}</td>
                            <td class="mono">${UI.esc(String(e.cue ?? '--'))}</td>
                            <td>${e.level != null ? UI.levelBar(e.level) : '--'}</td>
                            <td>${e.active ? '<span style="color:var(--green)">Active</span>' : '<span class="text-muted">Off</span>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    _renderCueList(cues) {
        if (!cues || cues.length === 0) {
            return '<p class="text-muted" style="font-size:11px;text-align:center">No cue data available</p>';
        }
        return `
            <table style="width:100%;font-size:11px">
                <thead><tr><th>Cue</th><th>Name</th><th>Fade</th><th>Delay</th><th>Status</th></tr></thead>
                <tbody>
                    ${cues.map(c => `
                        <tr style="${c.active ? 'background:rgba(74,222,128,0.08)' : ''}">
                            <td class="mono">${UI.esc(String(c.number ?? '--'))}</td>
                            <td>${UI.esc(c.name || '--')}</td>
                            <td class="mono">${c.fade ?? '--'}s</td>
                            <td class="mono">${c.delay ?? '--'}s</td>
                            <td>${c.active ? '<span style="color:var(--green);font-weight:600">Active</span>' : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ---- Titan Controls ----
    _renderTitanControls(con) {
        const st = con.status || {};
        const playbacks = st.playbacks || [];
        const handles = st.handles || [];
        const sysInfo = st.systemInfo || {};

        return `
            <!-- System Info -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> System Info</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr><td class="text-muted">Model</td><td>${UI.esc(con.model)}</td></tr>
                        <tr><td class="text-muted">IP Address</td><td class="mono">${UI.esc(con.ip)}</td></tr>
                        <tr><td class="text-muted">Software</td><td>${UI.esc(sysInfo.software || '--')}</td></tr>
                        <tr><td class="text-muted">Show</td><td>${UI.esc(sysInfo.showName || '--')}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Command Line -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-terminal"></i> Command Line</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px">
                        <input class="form-control" id="titan-cmd-input" placeholder="Enter Titan command..." style="flex:1"
                            onkeydown="if(event.key==='Enter')LightingPage._sendTitanCommand('${con.id}')">
                        <button class="btn btn-primary" onclick="LightingPage._sendTitanCommand('${con.id}')"><i class="fas fa-paper-plane"></i> Send</button>
                    </div>
                </div>
            </div>

            <!-- Playback Monitor (full width) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-play-circle"></i> Playback Monitor</h3></div>
                <div class="card-body">
                    ${this._renderPlaybacks(con, playbacks)}
                </div>
            </div>

            <!-- Handle Management (full width) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-th"></i> Handles</h3></div>
                <div class="card-body">
                    ${this._renderHandles(handles)}
                </div>
            </div>
        `;
    },

    _renderPlaybacks(con, playbacks) {
        if (!playbacks || playbacks.length === 0) {
            return '<p class="text-muted" style="font-size:11px;text-align:center">No playback data available</p>';
        }
        return `
            <table style="width:100%;font-size:11px">
                <thead><tr><th>Playback</th><th>Name</th><th>Level</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${playbacks.map(p => `
                        <tr>
                            <td class="mono">${UI.esc(String(p.id ?? '--'))}</td>
                            <td>${UI.esc(p.name || '--')}</td>
                            <td>${p.level != null ? UI.levelBar(p.level) : '--'}</td>
                            <td>${p.active ? '<span style="color:var(--green)">Running</span>' : '<span class="text-muted">Off</span>'}</td>
                            <td>
                                <button class="btn btn-xs btn-success" onclick="LightingPage._firePlayback('${con.id}','${p.id}',100)" title="Fire at 100%"><i class="fas fa-play"></i></button>
                                <button class="btn btn-xs btn-danger" onclick="LightingPage._killPlayback('${con.id}','${p.id}')" title="Kill"><i class="fas fa-stop"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    _renderHandles(handles) {
        if (!handles || handles.length === 0) {
            return '<p class="text-muted" style="font-size:11px;text-align:center">No handle data available</p>';
        }
        return `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
                ${handles.map(h => `
                    <div style="padding:8px;background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--border);text-align:center">
                        <div style="font-size:10px;font-weight:700;color:var(--text-primary)">${UI.esc(h.name || '--')}</div>
                        <div style="font-size:9px;color:var(--text-muted)">${UI.esc(h.type || '--')}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ============================================================
    // ADD / REMOVE CONSOLES
    // ============================================================
    showAddConsole() {
        const html = `
            <div style="min-width:380px">
                <div style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(168,85,247,0.04));border:1px solid rgba(168,85,247,0.3);border-radius:10px;padding:14px;margin-bottom:20px;text-align:center;">
                    <div style="font-size:12px;color:#a855f7;font-weight:700;margin-bottom:6px;letter-spacing:0.5px;"><i class="fas fa-flask"></i> DEMO MODE</div>
                    <p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">No hardware? Try a virtual console with realistic data.</p>
                    <button class="btn btn-sm" style="border-color:rgba(168,85,247,0.4);color:#a855f7" onclick="UI.closeModal();LightingPage.addVirtualConsole()"><i class="fas fa-plus"></i> Create Virtual grandMA3</button>
                </div>
                <div class="form-group">
                    <label>Console Name</label>
                    <input class="form-control" id="lc-add-name" placeholder="e.g. FOH grandMA3">
                </div>
                <div class="form-group">
                    <label>Console Type</label>
                    <select class="form-control" id="lc-add-type" onchange="LightingPage._onTypeChange()">
                        <option value="ma">MA Lighting (grandMA3 / grandMA2)</option>
                        <option value="titan">Avolites Titan</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <select class="form-control" id="lc-add-model">
                        ${this._models.ma.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>IP Address</label>
                    <input class="form-control" id="lc-add-ip" placeholder="192.168.1.50">
                </div>
            </div>`;
        UI.openModal('Add Lighting Console', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="LightingPage._confirmAddConsole()">Add Console</button>`);
    },

    _confirmAddConsole() {
        const name = document.getElementById('lc-add-name')?.value?.trim();
        const type = document.getElementById('lc-add-type')?.value;
        const model = document.getElementById('lc-add-model')?.value;
        const ip = document.getElementById('lc-add-ip')?.value?.trim();
        if (!name || !ip) return UI.toast('Name and IP are required', 'error');
        UI.closeModal();
        this.addConsole({ name, type, model, ip });
    },

    _onTypeChange() {
        const type = document.getElementById('lc-add-type')?.value;
        const modelSel = document.getElementById('lc-add-model');
        if (!modelSel) return;
        const models = this._models[type] || [];
        modelSel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    },

    addConsole(cfg) {
        const con = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: cfg.name,
            type: cfg.type || 'ma',
            model: cfg.model || 'grandMA3 full-size',
            ip: cfg.ip,
            connected: false,
            lastSeen: null,
            status: {},
        };
        this._consoles.push(con);
        this._saveConsoles();
        this._selectedId = con.id;
        this._refreshAll();
        this._checkConnection(con);
        UI.toast(`Console "${con.name}" added`, 'success');
        appState.log('INFO', `Lighting console added: ${con.name} (${con.type === 'ma' ? 'MA' : 'Titan'} ${con.model} @ ${con.ip})`, 'Lighting');
        this.renderSidebarList();
    },

    removeConsole(id) {
        const con = this._consoles.find(c => c.id === id);
        if (!con) return;
        UI.openModal('Remove Console', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(con.name)}</strong>?</p>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" onclick="LightingPage._confirmRemoveConsole('${id}')">Remove</button>`);
    },

    _confirmRemoveConsole(id) {
        UI.closeModal();
        const con = this._consoles.find(c => c.id === id);
        this._consoles = this._consoles.filter(c => c.id !== id);
        if (this._selectedId === id) this._selectedId = this._consoles[0]?.id || null;
        this._saveConsoles();
        this._refreshAll();
        this.renderSidebarList();
        UI.toast(`Console "${con?.name}" removed`, 'info');
        appState.log('INFO', `Lighting console removed: ${con?.name}`, 'Lighting');
    },

    selectConsole(id) {
        this._selectedId = id;
        this._refreshAll();
        const con = this._getSelected();
        if (con) this._checkConnection(con);
    },

    _getSelected() {
        return this._consoles.find(c => c.id === this._selectedId) || null;
    },

    // ---- Persistence ----
    _saveConsoles() {
        const real = this._consoles.filter(c => !c.virtual).map(c => ({ id: c.id, name: c.name, type: c.type, model: c.model, ip: c.ip }));
        try { localStorage.setItem('luxor_lighting_consoles', JSON.stringify(real)); } catch {}
        const virt = this._consoles.filter(c => c.virtual);
        try { localStorage.setItem('luxor_lighting_consoles_virtual', JSON.stringify(virt)); } catch {}
    },

    _loadConsoles() {
        try {
            const d = JSON.parse(localStorage.getItem('luxor_lighting_consoles') || '[]');
            this._consoles = d.map(c => ({ ...c, connected: false, lastSeen: null, status: {} }));
            const virt = JSON.parse(localStorage.getItem('luxor_lighting_consoles_virtual') || '[]');
            virt.forEach(v => { if (!this._consoles.find(c => c.id === v.id)) this._consoles.push(v); });
            if (this._consoles.length > 0 && !this._selectedId) this._selectedId = this._consoles[0].id;
        } catch { this._consoles = []; }
    },

    // ============================================================
    // API COMMUNICATION
    // ============================================================
    async _apiCall(con, url, method = 'GET', body = null) {
        try {
            const opts = { method, signal: AbortSignal.timeout(3000) };
            if (body && (method === 'POST' || method === 'PUT')) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(body);
            }
            const resp = await fetch(url, opts);
            const text = await resp.text();
            con.connected = true;
            con.lastSeen = Date.now();
            try { return JSON.parse(text); } catch { return text; }
        } catch (e) {
            con.connected = false;
            return null;
        }
    },

    async _checkConnection(con) {
        let result;
        if (con.type === 'ma') {
            result = await this._apiCall(con, this._ma.baseUrl(con.ip));
        } else {
            result = await this._apiCall(con, this._titan.baseUrl(con.ip) + 'get/System/');
        }
        con.connected = result !== null;
        if (result && con.type === 'titan') {
            con.status.systemInfo = result;
        }
        this._updateList();
    },

    async refreshConsole(id) {
        const con = this._consoles.find(c => c.id === id);
        if (!con) return;

        if (con.type === 'ma') {
            const base = this._ma.baseUrl(con.ip);
            const info = await this._apiCall(con, base);
            if (info) {
                con.status.session = info.session || info;
                con.status.programmer = info.programmer || {};
                con.status.executors = info.executors || [];
                con.status.cueList = info.cueList || [];
                con.status.grandmaster = info.grandmaster ?? con.status.grandmaster;
            }
        } else {
            const base = this._titan.baseUrl(con.ip);
            const [playbacks, handles, sysInfo] = await Promise.allSettled([
                this._apiCall(con, base + 'get/Playbacks/'),
                this._apiCall(con, base + 'get/Handles/'),
                this._apiCall(con, base + 'get/System/'),
            ]);
            con.status = {
                playbacks: playbacks.value || con.status.playbacks || [],
                handles: handles.value || con.status.handles || [],
                systemInfo: sysInfo.value || con.status.systemInfo || {},
            };
        }
        this._refreshAll();
    },

    // ---- MA Commands ----
    async _maCommand(conId, cmd) {
        const con = this._consoles.find(c => c.id === conId);
        if (!con || con.type !== 'ma') return;
        const base = this._ma.baseUrl(con.ip);
        await this._apiCall(con, base, 'POST', { command: this._ma.commands[cmd] });
        UI.toast(`${cmd} sent to ${con.name}`, 'info');
        this._updateList();
    },

    async _setGrandmaster(conId, value) {
        const con = this._consoles.find(c => c.id === conId);
        if (!con || con.type !== 'ma') return;
        const base = this._ma.baseUrl(con.ip);
        await this._apiCall(con, base, 'POST', { grandmaster: parseInt(value) });
        con.status.grandmaster = parseInt(value);
    },

    // ---- Titan Commands ----
    async _firePlayback(conId, playbackId, level) {
        const con = this._consoles.find(c => c.id === conId);
        if (!con || con.type !== 'titan') return;
        const base = this._titan.baseUrl(con.ip);
        await this._apiCall(con, base + 'script/Playbacks/FirePlaybackAtLevel', 'POST', { playbackId, level });
        UI.toast(`Playback ${playbackId} fired at ${level}%`, 'info');
        this._updateList();
    },

    async _killPlayback(conId, playbackId) {
        const con = this._consoles.find(c => c.id === conId);
        if (!con || con.type !== 'titan') return;
        const base = this._titan.baseUrl(con.ip);
        await this._apiCall(con, base + 'script/Playbacks/KillPlayback', 'POST', { playbackId });
        UI.toast(`Playback ${playbackId} killed`, 'info');
        this._updateList();
    },

    async _sendTitanCommand(conId) {
        const con = this._consoles.find(c => c.id === conId);
        if (!con || con.type !== 'titan') return;
        const input = document.getElementById('titan-cmd-input');
        const cmd = input?.value?.trim();
        if (!cmd) return;
        const base = this._titan.baseUrl(con.ip);
        await this._apiCall(con, base + 'script/Titan/SendCommand', 'POST', { command: cmd });
        UI.toast(`Command sent: ${cmd}`, 'info');
        input.value = '';
    },

    // ============================================================
    // SIDEBAR CONSOLE LIST
    // ============================================================
    renderSidebarList() {
        const container = document.getElementById('lighting-console-list');
        if (!container) return;
        if (this._consoles.length === 0) {
            container.innerHTML = '<div style="font-size:10px;color:var(--text-muted);text-align:center;padding:4px">No consoles</div>';
            return;
        }
        container.innerHTML = this._consoles.map(c => {
            const dot = c.connected ? 'var(--green)' : 'var(--red)';
            const brand = c.type === 'ma' ? 'MA' : 'Avolites';
            return `
                <div class="server-card" style="cursor:pointer" onclick="LightingPage.selectConsole('${c.id}');HippoApp.navigate('lighting')">
                    <div style="display:flex;align-items:center;gap:6px">
                        <div style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(c.name)}</div>
                            <div style="font-size:9px;color:var(--text-muted)">${brand} ${UI.esc(c.model)}</div>
                        </div>
                        <button class="server-card-remove" onclick="event.stopPropagation();LightingPage.removeConsole('${c.id}')" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    },

    initSidebar() {
        this._loadConsoles();
        this._initVirtualDemo();
        this.renderSidebarList();
    },

    _initVirtualDemo() {
        // No auto-spawn — virtual demos are created manually via Add Console dialog
    },

    addVirtualConsole() {
        const id = 'virtual-ma3-' + Date.now().toString(36);
        const con = {
            id,
            name: 'Virtual grandMA3 (Demo)',
            type: 'ma',
            model: 'grandMA3 full-size',
            ip: '192.168.1.50',
            connected: true,
            virtual: true,
            lastSeen: Date.now(),
            status: {
                session: { name: 'Session 1', user: 'Admin', showFile: 'Corporate_Awards_2026.show' },
                programmer: { active: true, values: 48, fixtures: 12 },
                grandmaster: 100,
                executors: [
                    { id:1,name:'Main Cue List',cue:'14.0',level:100,active:true },
                    { id:2,name:'House Lights',cue:'3.0',level:0,active:false },
                    { id:3,name:'Stage Wash',cue:'1.0',level:85,active:true },
                    { id:4,name:'Specials',cue:'7.0',level:100,active:true },
                    { id:5,name:'Moving Lights',cue:'5.0',level:75,active:true },
                    { id:6,name:'LED Strips',cue:'2.0',level:60,active:true },
                    { id:7,name:'Blinders',cue:'1.0',level:0,active:false },
                    { id:8,name:'Haze',cue:'1.0',level:40,active:true },
                    { id:9,name:'Audience Wash',cue:'1.0',level:0,active:false },
                    { id:10,name:'Effects',cue:'3.0',level:90,active:true },
                ],
                cueList: [
                    { number:'10.0',name:'Preset / Walk-in',fade:3,delay:0,active:false },
                    { number:'11.0',name:'Opening Look',fade:2,delay:0,active:false },
                    { number:'12.0',name:'Keynote Speaker',fade:1.5,delay:0,active:false },
                    { number:'13.0',name:'Video Playback',fade:2,delay:0,active:false },
                    { number:'14.0',name:'Award Presentation',fade:2,delay:0,active:true },
                    { number:'15.0',name:'Winner Walk-up',fade:1,delay:0.5,active:false },
                    { number:'16.0',name:'Photo Moment',fade:0.5,delay:0,active:false },
                    { number:'17.0',name:'Musical Performance',fade:3,delay:0,active:false },
                    { number:'18.0',name:'Finale / Confetti',fade:0,delay:0,active:false },
                    { number:'19.0',name:'House Lights Up',fade:5,delay:1,active:false },
                    { number:'20.0',name:'Blackout',fade:0,delay:0,active:false },
                ],
            },
        };
        this._consoles.push(con);
        this._saveConsoles();
        this._selectedId = id;
        this._refreshAll();
        this.renderSidebarList();
        UI.toast('Virtual grandMA3 created', 'success');
    },

    // ============================================================
    // POLLING / LIFECYCLE
    // ============================================================
    _startPolling() {
        this._stopPolling();
        this._pollTimer = setInterval(() => this._pollAll(), this._pollInterval);
    },

    _stopPolling() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    },

    async _pollAll() {
        for (const con of this._consoles) {
            await this._checkConnection(con);
        }
    },

    _updateList() {
        const list = document.getElementById('lc-console-list');
        if (list) list.innerHTML = this._renderConsoleList();
        this.renderSidebarList();
    },

    _refreshAll() {
        const list = document.getElementById('lc-console-list');
        const controls = document.getElementById('lc-controls');
        if (list) list.innerHTML = this._renderConsoleList();
        const con = this._getSelected();
        if (controls) controls.innerHTML = con ? this._renderControls(con) : this._renderNoConsole();
        this.renderSidebarList();
    },

    onActivate() {
        this._loadConsoles();
        this._initVirtualDemo();
        this._startPolling();
        this.renderSidebarList();
    },

    onDeactivate() {
        this._stopPolling();
    },
};
