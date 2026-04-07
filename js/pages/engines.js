/**
 * Engines Page — Sidebar list of all media servers/engines with detail panel
 * Same layout pattern as LED Processors and PTZ Cameras pages
 */
const EnginesPage = {
    _activeId: null,
    _isActive: false,
    _pollTimer: null,

    render() {
        return `
        <div class="section-header">
            <h2><i class="fas fa-server"></i> Engines</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm btn-primary" onclick="HippoApp.showAddServer()"><i class="fas fa-plus"></i> Add Engine</button>
            </div>
        </div>
        <div class="ptz-layout">
            <div class="ptz-camera-list">
                <div class="card" style="height:100%">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Engines</h3></div>
                    <div class="card-body" style="padding:0" id="engines-list-inner">
                        ${this._renderEngineList()}
                    </div>
                </div>
            </div>
            <div class="ptz-controls-area" id="engines-detail">
                ${this._renderDetail()}
            </div>
        </div>`;
    },

    onActivate() {
        this._isActive = true;
        // Auto-select connected server if none selected
        if (!this._activeId) {
            const activeId = appState.get('activeServerId');
            if (activeId) this._activeId = activeId;
            else {
                const servers = appState.get('servers') || [];
                if (servers.length > 0) this._activeId = servers[0].id;
            }
        }
        this._refresh();
        this._pollTimer = setInterval(() => this._refresh(), 3000);
    },

    onDeactivate() {
        this._isActive = false;
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    },

    selectEngine(id) {
        this._activeId = id;
        this._refreshAll();
    },

    connectEngine(id) {
        HippoApp.switchServer(id);
        this._activeId = id;
        setTimeout(() => this._refreshAll(), 500);
    },

    disconnectEngine() {
        HippoApp.disconnect();
        setTimeout(() => this._refreshAll(), 200);
    },

    _refresh() {
        if (!this._isActive) return;
        const listEl = document.getElementById('engines-list-inner');
        if (listEl) listEl.innerHTML = this._renderEngineList();
        // Only update detail if it exists (don't flash during connect)
        const detailEl = document.getElementById('engines-detail');
        if (detailEl) detailEl.innerHTML = this._renderDetail();
    },

    _refreshAll() {
        this._refresh();
    },

    // ════════════════════════════════════════════════════════════════
    // ENGINE LIST (sidebar)
    // ════════════════════════════════════════════════════════════════
    _renderEngineList() {
        const servers = appState.get('servers') || [];
        if (servers.length === 0) {
            return `<div class="text-muted" style="text-align:center;padding:20px;font-size:12px">
                No engines added.<br>Click <strong>+ Add Engine</strong> to get started.
            </div>`;
        }

        const activeServerId = appState.get('activeServerId');
        const connected = appState.get('connected');
        const statuses = appState.get('serverStatuses') || {};
        const types = HippoApp._serverTypes || {};

        return servers.map(s => {
            const t = types[s.type] || types['hippo'];
            const isConnected = s.id === activeServerId && connected;
            const wasOnline = statuses[s.id]?.online;
            const isSelected = this._activeId === s.id;
            const dotColor = isConnected ? '#4ade80' : wasOnline ? '#facc15' : '#6b7280';
            const logo = t.logo;
            const ip = s.virtual ? 'Virtual' : (s.host || '--');

            return `
                <div class="ptz-cam-card ${isSelected ? 'selected' : ''}" onclick="EnginesPage.selectEngine('${s.id}')">
                    <div class="flex" style="align-items:center;gap:8px">
                        ${logo
                            ? `<img src="${logo}" style="width:22px;height:22px;object-fit:contain;flex-shrink:0;border-radius:3px;${isConnected ? '' : 'opacity:0.5;filter:grayscale(1);'}" alt="${t.label}">`
                            : `<div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></div>`
                        }
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(s.name)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">${t.label} &bull; ${UI.esc(ip)}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:4px;">
                            <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></div>
                            ${isConnected ? '<span style="font-size:8px;color:#4ade80;font-weight:700;">LIVE</span>' : ''}
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation();HippoApp.removeServer('${s.id}')" title="Remove" style="flex-shrink:0;">
                            <i class="fas fa-times" style="font-size:10px"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    },

    // ════════════════════════════════════════════════════════════════
    // DETAIL PANEL (right side)
    // ════════════════════════════════════════════════════════════════
    _renderDetail() {
        if (!this._activeId) {
            return this._renderEmpty();
        }

        const servers = appState.get('servers') || [];
        const server = servers.find(s => s.id === this._activeId);
        if (!server) return this._renderEmpty();

        const types = HippoApp._serverTypes || {};
        const t = types[server.type] || types['hippo'];
        const activeServerId = appState.get('activeServerId');
        const connected = appState.get('connected');
        const isConnected = server.id === activeServerId && connected;
        const statuses = appState.get('serverStatuses') || {};
        const serverStatus = statuses[server.id];
        const info = isConnected ? (appState.get('serverInfo') || {}) : (serverStatus?.info || {});
        const isOnline = isConnected || serverStatus?.online;

        const ip = server.virtual ? 'Virtual' : (server.host || '--');
        const port = server.port || t.port || '--';
        const logo = t.logo;

        // Engine-specific quick stats
        let quickStats = '';
        if (isConnected) {
            quickStats = this._getQuickStats(server.type, info);
        }

        // Engine sub-pages / navigation
        const enginePages = this._getEnginePages(server.type);

        return `
        <div class="card" style="margin-bottom:12px;">
            <div class="card-body" style="padding:16px;">
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
                    ${logo
                        ? `<img src="${logo}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;${isOnline ? '' : 'opacity:0.4;filter:grayscale(1);'}" alt="${t.label}">`
                        : `<div style="width:40px;height:40px;border-radius:6px;background:${t.color};display:flex;align-items:center;justify-content:center;"><i class="fas ${t.icon}" style="color:#fff;font-size:18px;"></i></div>`
                    }
                    <div style="flex:1;">
                        <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${UI.esc(server.name)}</div>
                        <div style="font-size:12px;color:var(--text-muted);">${t.label} ${server.virtual ? '(Demo)' : ''}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${isConnected
                            ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(74,222,128,0.12);color:#4ade80;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;">
                                <span style="width:8px;height:8px;border-radius:50%;background:#4ade80;"></span> Connected
                               </span>
                               <button class="btn btn-sm btn-secondary" onclick="EnginesPage.disconnectEngine()"><i class="fas fa-unlink"></i> Disconnect</button>`
                            : `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(107,114,128,0.15);color:#9ca3af;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;">
                                <span style="width:8px;height:8px;border-radius:50%;background:#6b7280;"></span> Disconnected
                               </span>
                               <button class="btn btn-sm btn-primary" onclick="EnginesPage.connectEngine('${server.id}')"><i class="fas fa-plug"></i> Connect</button>`
                        }
                    </div>
                </div>

                <!-- Connection Info -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:${quickStats ? '16px' : '0'};">
                    <div style="background:var(--bg-secondary);border-radius:6px;padding:10px 12px;">
                        <div style="font-size:9px;text-transform:uppercase;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;">IP Address</div>
                        <div class="mono" style="font-size:13px;font-weight:600;margin-top:2px;">${UI.esc(ip)}</div>
                    </div>
                    <div style="background:var(--bg-secondary);border-radius:6px;padding:10px 12px;">
                        <div style="font-size:9px;text-transform:uppercase;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;">Port</div>
                        <div class="mono" style="font-size:13px;font-weight:600;margin-top:2px;">${port}</div>
                    </div>
                    <div style="background:var(--bg-secondary);border-radius:6px;padding:10px 12px;">
                        <div style="font-size:9px;text-transform:uppercase;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;">Protocol</div>
                        <div style="font-size:13px;font-weight:600;margin-top:2px;">${t.sub || '--'}</div>
                    </div>
                    <div style="background:var(--bg-secondary);border-radius:6px;padding:10px 12px;">
                        <div style="font-size:9px;text-transform:uppercase;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;">Status</div>
                        <div style="font-size:13px;font-weight:600;margin-top:2px;">${isOnline
                            ? '<span style="color:#4ade80;">Online</span>'
                            : '<span style="color:#f87171;">Offline</span>'
                        }</div>
                    </div>
                </div>

                ${quickStats}
            </div>
        </div>

        ${isConnected && enginePages.length > 0 ? `
        <div class="card" style="margin-bottom:12px;">
            <div class="card-header"><h3><i class="fas fa-compass"></i> Engine Controls</h3></div>
            <div class="card-body" style="padding:8px;">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;">
                    ${enginePages.map(p => {
                        const isView = p.page.includes('-');
                        const onclick = isView
                            ? `ShowRunPage._activeSubPage='${p.page}';HippoApp.navigate('showrun');`
                            : `HippoApp.navigate('${p.page}');`;
                        return `<button class="btn btn-sm btn-secondary" onclick="${onclick}" style="justify-content:flex-start;gap:8px;padding:10px 12px;">
                            <i class="fas ${p.icon}" style="color:${t.color};width:16px;text-align:center;"></i>
                            <span>${p.label}</span>
                        </button>`;
                    }).join('')}
                    <button class="btn btn-sm btn-secondary" onclick="HippoApp.navigate('showrun')" style="justify-content:flex-start;gap:8px;padding:10px 12px;">
                        <i class="fas fa-theater-masks" style="color:${t.color};width:16px;text-align:center;"></i>
                        <span>Show Run</span>
                    </button>
                </div>
            </div>
        </div>` : ''}

        ${this._renderServerInfo(server, t, info, isConnected)}
        `;
    },

    _renderEmpty() {
        return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:12px;padding:40px;">
            <i class="fas fa-server" style="font-size:48px;opacity:0.15;"></i>
            <div style="font-size:14px;font-weight:600;">No Engine Selected</div>
            <div style="font-size:12px;text-align:center;">Select an engine from the list or click <strong>+ Add Engine</strong> to add one.</div>
        </div>`;
    },

    // ════════════════════════════════════════════════════════════════
    // QUICK STATS per engine type
    // ════════════════════════════════════════════════════════════════
    _getQuickStats(type, info) {
        const _stat = (icon, label, value, color) => `
            <div style="background:var(--bg-secondary);border-radius:6px;padding:10px 12px;">
                <div style="font-size:9px;text-transform:uppercase;color:var(--text-muted);font-weight:600;letter-spacing:0.5px;"><i class="fas ${icon}" style="margin-right:4px;"></i>${label}</div>
                <div style="font-size:13px;font-weight:600;margin-top:2px;${color ? 'color:' + color : ''}">${value}</div>
            </div>`;

        let stats = '';

        if (type === 'hippo') {
            const engine = info.engineStatus || '--';
            const media = info.mediaManagerStatus || '--';
            const version = info.softwareVersion || '--';
            const product = info.product || 'Hippotizer';
            stats = _stat('fa-play-circle', 'Engine', engine, engine === 'Running' ? '#4ade80' : '#f87171')
                + _stat('fa-database', 'Media Manager', media, media === 'Running' ? '#4ade80' : '#f87171')
                + _stat('fa-code-branch', 'Version', version)
                + _stat('fa-box', 'Product', product);
        } else if (type === 'resolume') {
            const comp = appState.get('composition');
            const layers = comp?.layers?.length || 0;
            stats = _stat('fa-layer-group', 'Layers', layers)
                + _stat('fa-th', 'Columns', comp?.columns?.length || 0)
                + _stat('fa-music', 'BPM', comp?.tempocontroller?.tempo?.value || '--')
                + _stat('fa-code-branch', 'Version', info.softwareVersion || '--');
        } else if (type === 'vmix') {
            const vs = appState.get('vmixState') || {};
            stats = _stat('fa-th-list', 'Inputs', vs.inputs?.length || 0)
                + _stat('fa-circle', 'Recording', vs.recording ? 'ON' : 'Off', vs.recording ? '#f87171' : null)
                + _stat('fa-broadcast-tower', 'Streaming', vs.streaming ? 'LIVE' : 'Off', vs.streaming ? '#f87171' : null)
                + _stat('fa-code-branch', 'Version', vs.version || info.softwareVersion || '--');
        } else if (type === 'obs') {
            const scenes = appState.get('obsScenes') || [];
            const stream = appState.get('obsStreamStatus') || {};
            stats = _stat('fa-camera', 'Program', appState.get('obsCurrentScene') || '--')
                + _stat('fa-th-list', 'Scenes', scenes.length)
                + _stat('fa-broadcast-tower', 'Stream', stream.streaming ? 'LIVE' : 'Off', stream.streaming ? '#f87171' : null)
                + _stat('fa-circle', 'Record', stream.recording ? 'ON' : 'Off', stream.recording ? '#f87171' : null);
        } else if (type === 'casparcg') {
            const channels = appState.get('casparcgChannels') || [];
            stats = _stat('fa-tv', 'Channels', channels.length)
                + _stat('fa-film', 'Media', (appState.get('casparcgMedia') || []).length)
                + _stat('fa-code-branch', 'Version', info.softwareVersion || '--');
        } else if (type === 'barco') {
            const bs = appState.get('barcoState') || {};
            stats = _stat('fa-bookmark', 'Active Preset', bs.activePreset || '--')
                + _stat('fa-desktop', 'Destinations', (bs.destinations || []).length)
                + _stat('fa-photo-video', 'Sources', (bs.sources || []).length);
        } else if (type === 'atem') {
            stats = _stat('fa-tv', 'Program', info.programInput || '--')
                + _stat('fa-eye', 'Preview', info.previewInput || '--')
                + _stat('fa-code-branch', 'Version', info.softwareVersion || info.firmware || '--');
        } else if (type === 'disguise') {
            stats = _stat('fa-heartbeat', 'Health', info.health || '--')
                + _stat('fa-code-branch', 'Version', info.softwareVersion || '--');
        } else if (type === 'pixera') {
            stats = _stat('fa-film', 'Timelines', info.timelineCount || '--')
                + _stat('fa-code-branch', 'Version', info.softwareVersion || '--');
        } else if (type === 'qlab') {
            stats = _stat('fa-list-ol', 'Cues', info.cueCount || '--')
                + _stat('fa-code-branch', 'Version', info.softwareVersion || '--');
        }

        if (!stats) return '';
        return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;">${stats}</div>`;
    },

    // ════════════════════════════════════════════════════════════════
    // SERVER INFO TABLE
    // ════════════════════════════════════════════════════════════════
    _renderServerInfo(server, t, info, isConnected) {
        const rows = [];
        rows.push(['Type', t.label]);
        rows.push(['Description', t.desc]);
        if (server.host) rows.push(['Host', server.host]);
        if (server.port) rows.push(['Port', server.port]);
        if (server.wsPort) rows.push(['WS Port', server.wsPort]);
        if (server.virtual) rows.push(['Mode', 'Virtual (Demo)']);
        if (server.created) rows.push(['Added', new Date(server.created).toLocaleDateString()]);

        if (isConnected && info) {
            if (info.product) rows.push(['Product', info.product]);
            if (info.productFamily) rows.push(['Family', info.productFamily]);
            if (info.softwareVersion) rows.push(['Version', info.softwareVersion]);
            if (info.softwareRevision) rows.push(['Revision', info.softwareRevision]);
            if (info.computerName) rows.push(['Hostname', info.computerName]);
            if (info.hostName) rows.push(['Host Name', info.hostName]);
            if (info.iP) rows.push(['IP Address', info.iP]);
            if (info.registeredOwner) rows.push(['Owner', info.registeredOwner]);
            if (info.firmware) rows.push(['Firmware', info.firmware]);
        }

        return `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-info-circle"></i> Server Details</h3></div>
            <div class="card-body">
                <table style="font-size:12px;">
                    ${rows.map(([label, value]) => `
                        <tr>
                            <td class="text-muted" style="padding:4px 12px 4px 0;white-space:nowrap;">${label}</td>
                            <td class="mono" style="padding:4px 0;">${UI.esc(String(value || '--'))}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>`;
    },

    // ════════════════════════════════════════════════════════════════
    // ENGINE SUB-PAGES
    // ════════════════════════════════════════════════════════════════
    _getEnginePages(type) {
        const pages = {
            hippo: [
                { page: 'timelines', icon: 'fa-stream', label: 'Timelines' },
                { page: 'media', icon: 'fa-photo-video', label: 'Media' },
                { page: 'mixes', icon: 'fa-sliders-h', label: 'Mixes & Layers' },
                { page: 'presets', icon: 'fa-bookmark', label: 'Presets' },
                { page: 'pins', icon: 'fa-microchip', label: 'Pin Control' },
                { page: 'timecode', icon: 'fa-clock', label: 'Timecode' },
            ],
            resolume: [
                { page: 'composition', icon: 'fa-th', label: 'Composition' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Layer Mixer' },
            ],
            vmix: [
                { page: 'vmix-switching', icon: 'fa-tv', label: 'Switching' },
                { page: 'vmix-audio', icon: 'fa-volume-up', label: 'Audio Mixer' },
                { page: 'vmix-overlays', icon: 'fa-layer-group', label: 'Overlays' },
                { page: 'vmix-replay', icon: 'fa-redo', label: 'Replay' },
                { page: 'vmix-ptz', icon: 'fa-video', label: 'PTZ Control' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            obs: [
                { page: 'obs-scenes', icon: 'fa-tv', label: 'Scenes' },
                { page: 'obs-audio', icon: 'fa-volume-up', label: 'Audio Mixer' },
                { page: 'obs-media', icon: 'fa-photo-video', label: 'Media Inputs' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            casparcg: [
                { page: 'casparcg-channels', icon: 'fa-tv', label: 'Channels & Layers' },
                { page: 'casparcg-media', icon: 'fa-photo-video', label: 'Media Library' },
                { page: 'casparcg-templates', icon: 'fa-layer-group', label: 'Templates (CG)' },
                { page: 'casparcg-mixer', icon: 'fa-sliders-h', label: 'Mixer Controls' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            barco: [
                { page: 'barco-switching', icon: 'fa-tv', label: 'Destinations' },
                { page: 'barco-presets', icon: 'fa-bookmark', label: 'Presets' },
                { page: 'barco-aux', icon: 'fa-external-link-alt', label: 'AUX & Patterns' },
                { page: 'barco-layers', icon: 'fa-layer-group', label: 'Layers' },
                { page: 'barco-config', icon: 'fa-cog', label: 'System & I/O' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            qlab: [
                { page: 'qlab-cues', icon: 'fa-list-ol', label: 'Cue List' },
                { page: 'qlab-active', icon: 'fa-play-circle', label: 'Active Cues' },
                { page: 'qlab-direct', icon: 'fa-bolt', label: 'Direct Fire' },
                { page: 'qlab-settings', icon: 'fa-cog', label: 'Workspace' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Audio Controls' },
            ],
            disguise: [
                { page: 'disguise-tracks', icon: 'fa-stream', label: 'Tracks & Master' },
                { page: 'disguise-sections', icon: 'fa-tags', label: 'Sections' },
                { page: 'disguise-transport', icon: 'fa-clock', label: 'Transport & Go-To' },
                { page: 'disguise-health', icon: 'fa-heartbeat', label: 'System Health' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Audio & Output' },
            ],
            pixera: [
                { page: 'pixera-timelines', icon: 'fa-film', label: 'Timelines' },
                { page: 'pixera-cues', icon: 'fa-bolt', label: 'Cue Triggers' },
                { page: 'pixera-screens', icon: 'fa-desktop', label: 'Screens & Outputs' },
                { page: 'pixera-resources', icon: 'fa-folder-open', label: 'Resources' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Layers & Mixing' },
            ],
            atem: [
                { page: 'atem-switching', icon: 'fa-tv', label: 'Program / Preview' },
                { page: 'atem-keyers', icon: 'fa-layer-group', label: 'Keyers' },
                { page: 'atem-aux', icon: 'fa-external-link-alt', label: 'AUX Outputs' },
                { page: 'atem-macros', icon: 'fa-magic', label: 'Macros' },
                { page: 'atem-audio', icon: 'fa-volume-up', label: 'Audio Mixer' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media Pool' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
        };
        return pages[type] || [];
    },
};
