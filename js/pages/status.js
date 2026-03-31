/**
 * System Status Page — Multi-server health monitoring
 * Shows all engines/servers with detailed health, bandwidth, uptime, and type-specific info
 */
const StatusPage = {
    _pollTimer: null,
    _startTime: Date.now(),

    render() {
        const servers = appState.get('servers');
        const statuses = appState.get('serverStatuses');
        const activeId = appState.get('activeServerId');

        const online = servers.filter(s => statuses[s.id]?.online).length;
        const offline = servers.length - online;
        const typeColors = { hippo: 'var(--accent)', resolume: '#a855f7', vmix: '#3b82f6', casparcg: '#f97316', obs: '#22c55e', barco: '#ef4444', qlab: '#8b5cf6', disguise: '#ec4899', pixera: '#06b6d4' };
        const typeLabels = { hippo: 'Hippotizer', resolume: 'Resolume', vmix: 'vMix', casparcg: 'CasparCG', obs: 'OBS', barco: 'Barco E2/S3', qlab: 'QLab', disguise: 'Disguise', pixera: 'Pixera' };
        const typeIcons = { hippo: 'fa-server', resolume: 'fa-film', vmix: 'fa-video', casparcg: 'fa-play-circle', obs: 'fa-broadcast-tower', barco: 'fa-th-large', qlab: 'fa-list-ol', disguise: 'fa-cube', pixera: 'fa-layer-group' };

        // Count by type
        const typeCounts = {};
        servers.forEach(s => { const t = s.type || 'hippo'; typeCounts[t] = (typeCounts[t] || 0) + 1; });

        // Sidebar visibility settings — hide sections user has turned off
        const vis = typeof SettingsPage !== 'undefined' ? SettingsPage._getSidebarVisibility() : { engines: true, ledProcessors: true, cameras: true, switches: true, consoles: true };

        return `
            <div class="section-header">
                <h2><i class="fas fa-heartbeat"></i> System Status</h2>
                <div class="flex gap-sm">
                    <button class="btn btn-sm btn-accent" onclick="StatusPage.refreshAll()"><i class="fas fa-sync-alt"></i> Refresh All</button>
                </div>
            </div>

            ${vis.engines ? `
            <div class="section-header" style="margin-top:12px;">
                <h3><i class="fas fa-server"></i> Media Servers</h3>
                <div class="flex gap-sm">
                    <button class="btn btn-sm" onclick="HippoApp.showAddServer()"><i class="fas fa-plus"></i> Add Server</button>
                </div>
            </div>

            <!-- Global Health Summary -->
            <div class="status-summary">
                <div class="status-summary-card">
                    <div class="val" style="color:var(--accent)">${servers.length}</div>
                    <div class="label">Total Engines</div>
                </div>
                <div class="status-summary-card">
                    <div class="val" style="color:var(--green)">${online}</div>
                    <div class="label">Online</div>
                </div>
                <div class="status-summary-card">
                    <div class="val" style="color:${offline > 0 ? 'var(--red)' : 'var(--text-muted)'}">${offline}</div>
                    <div class="label">Offline</div>
                </div>
                <div class="status-summary-card">
                    <div class="val" style="color:var(--text-secondary)">${servers.length > 0 ? Math.round(online / servers.length * 100) : 0}%</div>
                    <div class="label">Health</div>
                </div>
            </div>

            <!-- Type breakdown -->
            ${Object.keys(typeCounts).length > 1 ? `
            <div class="card mb-md" style="margin-bottom:12px;">
                <div class="card-body" style="padding:10px 14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
                    <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">By Type:</span>
                    ${Object.entries(typeCounts).map(([t, count]) => `
                        <span style="display:flex;align-items:center;gap:6px;font-size:11px;">
                            <i class="fas ${typeIcons[t] || 'fa-server'}" style="color:${typeColors[t] || 'var(--accent)'};"></i>
                            <strong>${count}</strong> ${typeLabels[t] || t}
                        </span>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- Server Grid -->
            <div class="status-grid" id="status-grid">
                ${servers.length === 0
                    ? UI.empty('fa-server', 'No Servers Configured', 'Add a server to monitor its status')
                    : servers.map(s => this._renderNode(s, statuses[s.id], activeId)).join('')
                }
            </div>` : ''}

            ${vis.ledProcessors ? `
            <!-- LED Processors -->
            <div class="section-header" style="margin-top:24px;">
                <h2><i class="fas fa-tv"></i> LED Processors</h2>
                <div class="flex gap-sm">
                    <button class="btn btn-sm" onclick="HippoApp.showAddLedProcessor()"><i class="fas fa-plus"></i> Add Processor</button>
                </div>
            </div>
            <div class="status-grid" id="led-status-grid">
                ${this._renderLedProcessors()}
            </div>` : ''}

            ${vis.cameras ? `
            <div class="section-header mt-lg">
                <h3><i class="fas fa-video"></i> PTZ Cameras</h3>
                <div class="flex gap-sm">
                    <button class="btn btn-sm" onclick="PtzPage.showAddCamera()"><i class="fas fa-plus"></i> Add Camera</button>
                </div>
            </div>
            <div class="status-grid" id="ptz-status-grid">
                ${this._renderPtzCameras()}
            </div>` : ''}

            ${vis.switches ? `
            <div class="section-header mt-lg">
                <h3><i class="fas fa-network-wired"></i> Network Switches</h3>
                <div class="flex gap-sm">
                    <button class="btn btn-sm" onclick="NetSwitchPage.showAddSwitch()"><i class="fas fa-plus"></i> Add Switch</button>
                </div>
            </div>
            <div class="status-grid" id="netswitch-status-grid">
                ${this._renderNetSwitches()}
            </div>` : ''}

            ${vis.consoles ? `
            <div class="section-header mt-lg">
                <h3><i class="fas fa-lightbulb"></i> Lighting Consoles</h3>
                <div class="flex gap-sm">
                    <button class="btn btn-sm" onclick="LightingPage.showAddConsole()"><i class="fas fa-plus"></i> Add Console</button>
                </div>
            </div>
            <div class="status-grid" id="lighting-status-grid">
                ${this._renderLightingConsoles()}
            </div>` : ''}

            ${vis.intercom ? `
            <div class="section-header mt-lg">
                <h3><i class="fas fa-headset"></i> Intercom Systems</h3>
                <div class="flex gap-sm">
                    <button class="btn btn-sm" onclick="IntercomPage.showAddSystem()"><i class="fas fa-plus"></i> Add Intercom</button>
                </div>
            </div>
            <div class="status-grid" id="intercom-status-grid">
                ${this._renderIntercomSystems()}
            </div>` : ''}
        `;
    },

    _renderNode(server, status, activeId) {
        const online = status?.online;
        const info = status?.info;
        const stateClass = online ? 'online' : 'offline';
        const isActive = activeId === server.id;
        const type = server.type || 'hippo';
        const typeColors = { hippo: 'var(--accent)', resolume: '#a855f7', vmix: '#3b82f6', casparcg: '#f97316', obs: '#22c55e', barco: '#ef4444', qlab: '#8b5cf6', disguise: '#ec4899', pixera: '#06b6d4' };
        const typeLabels = { hippo: 'Hippotizer', resolume: 'Resolume Arena', vmix: 'vMix', casparcg: 'CasparCG', obs: 'OBS Studio', barco: 'Barco E2/S3', qlab: 'QLab', disguise: 'Disguise', pixera: 'Pixera' };
        const typeIcons = { hippo: 'fa-server', resolume: 'fa-film', vmix: 'fa-video', casparcg: 'fa-play-circle', obs: 'fa-broadcast-tower', barco: 'fa-th-large', qlab: 'fa-list-ol', disguise: 'fa-cube', pixera: 'fa-layer-group' };
        const color = typeColors[type] || 'var(--accent)';

        const engineStatus = info?.engineStatus || (online ? 'Running' : '--');
        const version = info?.softwareVersion || info?.version || '--';
        const hostname = info?.computerName || server.name;

        // Uptime simulation (time since last seen)
        const lastSeen = status?.lastSeen;
        const uptime = lastSeen ? this._formatUptime(Date.now() - lastSeen) : '--';
        const lastPing = lastSeen ? new Date(lastSeen).toLocaleTimeString() : '--';

        // Use measured latency from ping, bandwidth estimated from response
        const latency = status?.latency != null ? status.latency : (online ? '<1' : '--');
        const bw = online ? (status?.bandwidth || 0).toFixed(1) : '0.0';

        // Type-specific details
        let typeDetails = '';
        switch (type) {
            case 'hippo': {
                const mediaStatus = info?.mediaManagerStatus || '--';
                const mixCount = info?.mixes?.length || 0;
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Media Mgr</span><span class="server-node-stat-value">${this._colorStatus(mediaStatus)}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Mixes</span><span class="server-node-stat-value">${mixCount}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Product</span><span class="server-node-stat-value">${UI.esc(info?.product || '--')}</span></div>
                `;
                break;
            }
            case 'resolume': {
                const comp = info?._composition;
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Layers</span><span class="server-node-stat-value">${comp?.layers?.length || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Columns</span><span class="server-node-stat-value">${comp?.columns?.length || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">BPM</span><span class="server-node-stat-value">${comp?.tempocontroller?.tempo?.value || '--'}</span></div>
                `;
                break;
            }
            case 'vmix': {
                const vs = info?._vmixState;
                const inputCount = vs?.inputs?.length ?? info?.inputs ?? '--';
                const activeInp = vs?.inputs?.find(i => i.number === vs?.activeInput);
                const previewInp = vs?.inputs?.find(i => i.number === vs?.previewInput);
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Edition</span><span class="server-node-stat-value">${UI.esc(vs?.edition || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Inputs</span><span class="server-node-stat-value">${inputCount}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Program</span><span class="server-node-stat-value" style="color:var(--green);font-weight:600;">${UI.esc(activeInp?.title || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Preview</span><span class="server-node-stat-value" style="color:var(--orange);">${UI.esc(previewInp?.title || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Recording</span><span class="server-node-stat-value">${vs?.recording || info?.recording ? '<span style="color:var(--red);font-weight:700;">● REC</span>' : '<span class="text-muted">Off</span>'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Streaming</span><span class="server-node-stat-value">${vs?.streaming || info?.streaming ? '<span style="color:var(--red);font-weight:700;">● LIVE</span>' : '<span class="text-muted">Off</span>'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">FTB</span><span class="server-node-stat-value">${vs?.fadeToBlack ? '<span style="color:var(--red)">Active</span>' : '<span class="text-muted">Off</span>'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Transition</span><span class="server-node-stat-value">${UI.esc(vs?.transition?.effect || '--')}</span></div>
                `;
                break;
            }
            case 'casparcg': {
                const si = info?._serverInfo;
                const chCount = si?.channels?.length || info?.channels || '--';
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Channels</span><span class="server-node-stat-value">${chCount}</span></div>
                    ${si?.channels ? si.channels.map((ch, i) => `
                        <div class="server-node-stat"><span class="server-node-stat-label">CH${i+1}</span><span class="server-node-stat-value mono" style="font-size:10px;">${ch.videoMode || ch.format || '--'}</span></div>
                    `).join('') : ''}
                    <div class="server-node-stat"><span class="server-node-stat-label">Media</span><span class="server-node-stat-value">${info?.media || '--'} files</span></div>
                `;
                break;
            }
            case 'obs': {
                const oi = info?._obsInfo;
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Platform</span><span class="server-node-stat-value">${UI.esc(info?.platform || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Scenes</span><span class="server-node-stat-value">${info?.scenes || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Current Scene</span><span class="server-node-stat-value" style="color:var(--green);font-weight:600;">${UI.esc(oi?.currentScene || info?.currentScene || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Streaming</span><span class="server-node-stat-value">${oi?.streaming || info?.streaming ? '<span style="color:var(--red);font-weight:700;">● LIVE</span>' : '<span class="text-muted">Off</span>'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Recording</span><span class="server-node-stat-value">${oi?.recording || info?.recording ? '<span style="color:var(--red);font-weight:700;">● REC</span>' : '<span class="text-muted">Off</span>'}</span></div>
                `;
                break;
            }
            case 'barco': {
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Product</span><span class="server-node-stat-value">${UI.esc(info?.product || info?.productFamily || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Presets</span><span class="server-node-stat-value">${info?.presets || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Destinations</span><span class="server-node-stat-value">${info?.destinations || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Sources</span><span class="server-node-stat-value">${info?.sources || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Active Preset</span><span class="server-node-stat-value" style="color:var(--green);font-weight:600;">${UI.esc(info?.activePreset || '--')}</span></div>
                `;
                break;
            }
            case 'qlab': {
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Workspaces</span><span class="server-node-stat-value">${info?.workspaces || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Cues</span><span class="server-node-stat-value">${info?.cues || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Playback</span><span class="server-node-stat-value">${this._colorStatus(info?.playback || '--')}</span></div>
                `;
                break;
            }
            case 'disguise': {
                const ds = info?._status;
                const dt = ds?.transport || {};
                const dm = ds?.machines || [];
                const onlineMachines = dm.filter(m => m.online).length;
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Product</span><span class="server-node-stat-value">${UI.esc(info?.product || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Project</span><span class="server-node-stat-value">${UI.esc(ds?.projectName || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Tracks</span><span class="server-node-stat-value">${info?.tracks || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Transport</span><span class="server-node-stat-value">${dt.playing ? '<span style="color:var(--green);font-weight:700;">Playing</span>' : dt.playing === false ? '<span style="color:var(--orange);">Paused</span>' : this._colorStatus(ds?.state || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Timecode</span><span class="server-node-stat-value mono" style="font-size:10px;">${UI.esc(dt.currentTimecode || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">FPS</span><span class="server-node-stat-value mono">${ds?.fps || '--'}</span></div>
                    ${dm.length ? `<div class="server-node-stat"><span class="server-node-stat-label">Machines</span><span class="server-node-stat-value">${onlineMachines}/${dm.length}</span></div>` : ''}
                    <div class="server-node-stat"><span class="server-node-stat-label">Health</span><span class="server-node-stat-value">${this._colorStatus(ds?.health === 'good' ? 'Running' : ds?.health || '--')}</span></div>
                `;
                break;
            }
            case 'pixera': {
                const pt = info?._timelines;
                const playingTls = Array.isArray(pt) ? pt.filter(t => t.state === 'playing').length : '--';
                typeDetails = `
                    <div class="server-node-stat"><span class="server-node-stat-label">Product</span><span class="server-node-stat-value">${UI.esc(info?.product || '--')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Timelines</span><span class="server-node-stat-value">${info?.timelines || '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Playing</span><span class="server-node-stat-value" style="color:var(--green);font-weight:600;">${playingTls}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Screens</span><span class="server-node-stat-value">${info?.screens || '--'}</span></div>
                `;
                break;
            }
        }

        return `
            <div class="server-node ${stateClass} ${isActive ? 'master' : ''}" id="server-node-${server.id}" style="border-top:3px solid ${online ? color : 'var(--border)'};">
                <div class="server-node-header">
                    <div class="server-node-icon" style="color:${color};"><i class="fas ${typeIcons[type] || 'fa-server'}"></i></div>
                    <div class="server-node-title">
                        <div class="server-node-name">${server.virtual ? '<span title="Virtual Demo">\u{1F9EA}</span> ' : ''}${UI.esc(server.name)}</div>
                        <div class="server-node-ip">${UI.esc(server.host)}:${server.port}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <span class="badge badge-${
                            {hippo:'accent',resolume:'purple',vmix:'blue',casparcg:'orange',obs:'green',barco:'red',qlab:'purple',disguise:'pink',pixera:'cyan'}[type] || 'accent'
                        }" style="font-size:8px;${type === 'barco' ? 'background:#ef4444;color:#fff;' : type === 'disguise' ? 'background:#ec4899;color:#fff;' : ''}">${(typeLabels[type] || type).toUpperCase()}</span>
                        ${isActive ? '<span class="badge badge-cyan" style="font-size:8px;">ACTIVE</span>' : ''}
                    </div>
                </div>

                <div class="server-node-stats">
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">Status</span>
                        <span class="server-node-stat-value">${this._colorStatus(engineStatus)}</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">Version</span>
                        <span class="server-node-stat-value mono" style="font-size:10px">${UI.esc(version)}</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">Host</span>
                        <span class="server-node-stat-value">${UI.esc(hostname)}</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">IP Address</span>
                        <span class="server-node-stat-value mono" style="font-size:10px">${UI.esc(server.host)}</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">API Port</span>
                        <span class="server-node-stat-value mono">${server.port}</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">WS Port</span>
                        <span class="server-node-stat-value mono">${server.wsPort || '--'}</span>
                    </div>
                    ${typeDetails}
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">Latency</span>
                        <span class="server-node-stat-value mono">${latency}${latency !== '--' ? 'ms' : ''}</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">Bandwidth</span>
                        <span class="server-node-stat-value mono">${bw} Mbps</span>
                    </div>
                    <div class="server-node-stat">
                        <span class="server-node-stat-label">Last Ping</span>
                        <span class="server-node-stat-value mono" style="font-size:10px">${lastPing}</span>
                    </div>
                </div>

                <!-- Health bar -->
                <div style="margin-top:8px;height:4px;border-radius:2px;background:var(--border);overflow:hidden;">
                    <div style="height:100%;width:${online ? '100%' : '0%'};background:${online ? color : 'var(--red)'};border-radius:2px;transition:width 0.3s;"></div>
                </div>

                <div class="flex gap-xs mt-sm" style="justify-content:flex-end">
                    ${!isActive ? `<button class="btn btn-xs btn-accent" onclick="HippoApp.connectToServer('${server.id}')"><i class="fas fa-plug"></i> Connect</button>` : '<span style="font-size:9px;color:var(--accent);font-weight:700;">Connected</span>'}
                    <button class="btn btn-xs" onclick="StatusPage.pingServer('${server.id}')" title="Ping"><i class="fas fa-sync-alt"></i></button>
                    <button class="btn btn-xs" onclick="StatusPage.editServer('${server.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="StatusPage.removeServer('${server.id}')" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    },

    _renderLedProcessors() {
        let procs = [];
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage._loadProcessors();
            procs = LedProcessorPage._processors || [];
        }
        if (procs.length === 0) {
            return UI.empty('fa-tv', 'No LED Processors', 'Add a processor from the sidebar or click Add Processor above');
        }
        return procs.map(p => this._renderLedNode(p)).join('');
    },

    _renderLedNode(proc) {
        const online = proc.online || false;
        const isVirtual = proc.virtual || false;
        const type = proc.type || 'Unknown';

        // Get model info from LedProcessorPage
        const modelInfo = typeof LedProcessorPage !== 'undefined' ? LedProcessorPage._getModelInfo(type) : null;
        const brand = modelInfo?.brand === 'brompton' ? 'Brompton' : modelInfo?.brand === 'megapixel' ? 'Megapixel' : 'Novastar';
        const brandColor = brand === 'Brompton' ? '#a855f7' : brand === 'Megapixel' ? '#f59e0b' : 'var(--accent)';

        // Get status from LedProcessorPage if it's the active processor
        const isActive = LedProcessorPage?._activeProc?.id === proc.id;
        let status = isActive ? LedProcessorPage._status : {};

        // For virtual processors, generate mock health data
        if (isVirtual && online && Object.keys(status).length === 0) {
            const vs = typeof LedProcessorPage !== 'undefined' ? LedProcessorPage._virtualStatus(type) : {};
            status = vs || {};
        }

        const fw = status?.firmware || '--';
        const temp = status?.temperature ?? (isVirtual && online ? Math.floor(Math.random() * 15 + 38) : '--');
        const inputRes = status?.inputResolution || (status?.outputWidth && status?.outputHeight ? `${status.outputWidth}×${status.outputHeight}` : (status?.width && status?.height ? `${status.width}×${status.height}` : '--'));
        const activeInput = status?.activeInput || status?.selectedInput || '--';
        const brightness = status?.brightness ?? (isVirtual && online ? 80 : '--');
        const outputs = status?.outputs || status?.portInfo || '--';
        const fps = status?.fps ?? (online ? '60' : '--');

        return `
            <div class="server-node ${online ? 'online' : 'offline'} ${isActive ? 'master' : ''}" style="border-top:3px solid ${online ? brandColor : 'var(--border)'};">
                <div class="server-node-header">
                    <div class="server-node-icon" style="color:${brandColor};"><i class="fas fa-tv"></i></div>
                    <div class="server-node-title">
                        <div class="server-node-name">${isVirtual ? '<span title="Virtual Demo">\u{1F9EA}</span> ' : ''}${UI.esc(proc.name)}</div>
                        <div class="server-node-ip">${proc.host !== 'virtual-led' ? UI.esc(proc.host) + ':' + proc.port : 'Virtual'}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <span class="badge" style="font-size:8px;background:rgba(${brand === 'Brompton' ? '168,85,247' : brand === 'Megapixel' ? '245,158,11' : '0,212,170'},0.15);color:${brandColor};">${brand.toUpperCase()}</span>
                        ${isActive ? '<span class="badge badge-cyan" style="font-size:8px;">ACTIVE</span>' : ''}
                    </div>
                </div>

                <div class="server-node-stats">
                    <div class="server-node-stat"><span class="server-node-stat-label">Status</span><span class="server-node-stat-value">${this._colorStatus(online ? 'Running' : 'Offline')}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Model</span><span class="server-node-stat-value">${UI.esc(type)}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Firmware</span><span class="server-node-stat-value mono" style="font-size:10px;">${UI.esc(String(fw))}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">IP Address</span><span class="server-node-stat-value mono" style="font-size:10px;">${proc.host !== 'virtual-led' ? UI.esc(proc.host) : 'N/A'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Input</span><span class="server-node-stat-value">${UI.esc(String(activeInput))}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Resolution</span><span class="server-node-stat-value mono" style="font-size:10px;">${UI.esc(String(inputRes))}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Brightness</span><span class="server-node-stat-value">${brightness !== '--' ? brightness + '%' : '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Temperature</span><span class="server-node-stat-value">${temp !== '--' ? `<span style="color:${parseInt(temp) > 70 ? 'var(--red)' : parseInt(temp) > 55 ? 'var(--orange)' : 'var(--green)'};">${temp}°C</span>` : '--'}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">FPS</span><span class="server-node-stat-value mono">${status?.refreshRate || fps}</span></div>
                    <div class="server-node-stat"><span class="server-node-stat-label">Outputs</span><span class="server-node-stat-value">${UI.esc(String(outputs))}</span></div>
                    ${status?.uptime ? `<div class="server-node-stat"><span class="server-node-stat-label">Uptime</span><span class="server-node-stat-value mono" style="font-size:10px;">${UI.esc(status.uptime)}</span></div>` : ''}
                    ${status?.receivingCards ? `<div class="server-node-stat"><span class="server-node-stat-label">Recv Cards</span><span class="server-node-stat-value">${status.receivingCards}</span></div>` : ''}
                    ${status?.colorTemp ? `<div class="server-node-stat"><span class="server-node-stat-label">Color Temp</span><span class="server-node-stat-value">${status.colorTemp}K</span></div>` : ''}
                    ${status?.gamma ? `<div class="server-node-stat"><span class="server-node-stat-label">Gamma</span><span class="server-node-stat-value">${status.gamma}</span></div>` : ''}
                    ${status?.bitDepth ? `<div class="server-node-stat"><span class="server-node-stat-label">Bit Depth</span><span class="server-node-stat-value">${status.bitDepth}-bit</span></div>` : ''}
                    ${status?.serial ? `<div class="server-node-stat"><span class="server-node-stat-label">Serial</span><span class="server-node-stat-value mono" style="font-size:10px;">${UI.esc(status.serial)}</span></div>` : ''}
                    ${status?.portStatus ? `
                    <div class="server-node-stat" style="grid-column:1/-1;"><span class="server-node-stat-label">Port Status</span>
                        <span class="server-node-stat-value" style="display:flex;gap:4px;flex-wrap:wrap;">
                            ${status.portStatus.map((p, i) => `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${p.active ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'};color:${p.active ? '#4ade80' : '#ef4444'};">P${i+1} ${p.pixels}</span>`).join('')}
                        </span>
                    </div>` : ''}
                </div>

                <div style="margin-top:8px;height:4px;border-radius:2px;background:var(--border);overflow:hidden;">
                    <div style="height:100%;width:${online ? '100%' : '0%'};background:${online ? brandColor : 'var(--red)'};border-radius:2px;transition:width 0.3s;"></div>
                </div>

                <div class="flex gap-xs mt-sm" style="justify-content:flex-end">
                    <button class="btn btn-xs btn-accent" onclick="HippoApp.selectLedProcessor('${proc.id}')"><i class="fas fa-sliders-h"></i> Control</button>
                    <button class="btn btn-xs btn-danger" onclick="HippoApp.removeLedProcessor('${proc.id}')" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    },

    _colorStatus(s) {
        if (!s || s === '--') return `<span style="color:var(--text-muted)">--</span>`;
        const low = s.toLowerCase();
        if (low === 'running' || low === 'ok' || low === 'started' || low === 'ready') return `<span style="color:var(--green)">${UI.esc(s)}</span>`;
        if (low === 'stopped' || low === 'error' || low === 'failed') return `<span style="color:var(--red)">${UI.esc(s)}</span>`;
        return `<span style="color:var(--orange)">${UI.esc(s)}</span>`;
    },

    _formatUptime(ms) {
        if (!ms || ms < 0) return '--';
        const s = Math.floor(ms / 1000);
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ${m % 60}m`;
        return `${Math.floor(h / 24)}d ${h % 24}h`;
    },

    // ---- PTZ Cameras ----
    _renderPtzCameras() {
        if (typeof PtzPage === 'undefined') return UI.empty('fa-video', 'No Cameras', 'Add a camera to monitor');
        PtzPage._loadCameras();
        const cams = PtzPage._cameras || [];
        if (cams.length === 0) return UI.empty('fa-video', 'No PTZ Cameras', 'Add a camera from the sidebar or click Add Camera above');
        return cams.map(c => this._renderPtzNode(c)).join('');
    },

    _renderPtzNode(cam) {
        const online = cam.connected || false;
        const brand = cam.type === 'panasonic' ? 'Panasonic' : 'BirdDog';
        const brandColor = cam.type === 'panasonic' ? '#0070c0' : '#e74c3c';
        const tallyLabel = cam.tally === 'red' ? 'PGM' : cam.tally === 'green' ? 'PVW' : 'Off';
        const tallyColor = cam.tally === 'red' ? 'var(--red)' : cam.tally === 'green' ? 'var(--green)' : 'var(--text-muted)';

        return `
            <div class="server-node ${online ? 'online' : 'offline'}" style="border-top:3px solid ${online ? brandColor : 'var(--border)'};">
                <div class="server-node-header">
                    <div class="server-node-icon" style="color:${brandColor};"><i class="fas fa-video"></i></div>
                    <div class="server-node-title">
                        <div class="server-node-name">${UI.esc(cam.name)}</div>
                        <div class="server-node-ip">${UI.esc(cam.ip)}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <span class="badge" style="font-size:8px;background:rgba(${cam.type === 'panasonic' ? '0,112,192' : '231,76,60'},0.15);color:${brandColor};">${brand.toUpperCase()}</span>
                        <span class="status-dot ${online ? 'online' : 'offline'}"></span>
                    </div>
                </div>
                <div class="server-node-details" style="font-size:11px;">
                    <div class="node-detail"><span class="text-muted">Status</span> ${online ? '<span style="color:var(--green)">Online</span>' : '<span style="color:var(--red)">Offline</span>'}</div>
                    <div class="node-detail"><span class="text-muted">Model</span> <span>${UI.esc(cam.model)}</span></div>
                    <div class="node-detail"><span class="text-muted">Type</span> <span>${brand}</span></div>
                    <div class="node-detail"><span class="text-muted">IP Address</span> <span>${UI.esc(cam.ip)}</span></div>
                    <div class="node-detail"><span class="text-muted">Tally</span> <span style="color:${tallyColor};font-weight:600">${tallyLabel}</span></div>
                    <div class="node-detail"><span class="text-muted">Last Seen</span> <span>${cam.lastSeen ? new Date(cam.lastSeen).toLocaleTimeString() : '--'}</span></div>
                </div>
                <div class="flex gap-xs mt-sm" style="justify-content:flex-end">
                    <button class="btn btn-xs btn-accent" onclick="PtzPage.selectCamera('${cam.id}');HippoApp.navigate('ptz')"><i class="fas fa-gamepad"></i> Control</button>
                    <button class="btn btn-xs ${cam.tally === 'red' ? 'btn-danger' : ''}" onclick="PtzPage.setTally('${cam.id}','red')" title="Program Tally"><i class="fas fa-circle" style="font-size:8px;color:${cam.tally === 'red' ? '#fff' : '#e74c3c'}"></i> PGM</button>
                    <button class="btn btn-xs ${cam.tally === 'green' ? 'btn-success' : ''}" onclick="PtzPage.setTally('${cam.id}','green')" title="Preview Tally"><i class="fas fa-circle" style="font-size:8px;color:${cam.tally === 'green' ? '#fff' : '#2ecc71'}"></i> PVW</button>
                </div>
            </div>
        `;
    },

    // ---- Network Switches ----
    _renderNetSwitches() {
        if (typeof NetSwitchPage === 'undefined') return UI.empty('fa-network-wired', 'No Switches', 'Add a switch to monitor');
        NetSwitchPage._loadSwitches();
        const switches = NetSwitchPage._switches || [];
        if (switches.length === 0) return UI.empty('fa-network-wired', 'No Network Switches', 'Add a switch from the sidebar or click Add Switch above');
        return switches.map(s => this._renderNetSwitchNode(s)).join('');
    },

    _renderNetSwitchNode(sw) {
        const online = sw.connected || false;
        const typeLabel = sw.type === 'luminode' ? 'LumiNode' : 'GigaCore';
        const brandColor = '#f59e0b';
        const sysInfo = sw.status?.info || {};
        const sysStatus = sw.status?.system || {};

        return `
            <div class="server-node ${online ? 'online' : 'offline'}" style="border-top:3px solid ${online ? brandColor : 'var(--border)'};">
                <div class="server-node-header">
                    <div class="server-node-icon" style="color:${brandColor};"><i class="fas fa-network-wired"></i></div>
                    <div class="server-node-title">
                        <div class="server-node-name">${UI.esc(sw.name)}</div>
                        <div class="server-node-ip">${UI.esc(sw.ip)}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <span class="badge" style="font-size:8px;background:rgba(245,158,11,0.15);color:${brandColor};">LUMINEX</span>
                        <span class="status-dot ${online ? 'online' : 'offline'}"></span>
                    </div>
                </div>
                <div class="server-node-details" style="font-size:11px;">
                    <div class="node-detail"><span class="text-muted">Status</span> ${online ? '<span style="color:var(--green)">Online</span>' : '<span style="color:var(--red)">Offline</span>'}</div>
                    <div class="node-detail"><span class="text-muted">Type</span> <span>${typeLabel}</span></div>
                    <div class="node-detail"><span class="text-muted">Model</span> <span>${UI.esc(sw.model)}</span></div>
                    <div class="node-detail"><span class="text-muted">IP Address</span> <span class="mono">${UI.esc(sw.ip)}</span></div>
                    <div class="node-detail"><span class="text-muted">Firmware</span> <span>${UI.esc(sysInfo.firmware || '--')}</span></div>
                    <div class="node-detail"><span class="text-muted">Temperature</span> <span>${sysStatus.temperature ? sysStatus.temperature + '\u00b0C' : '--'}</span></div>
                    <div class="node-detail"><span class="text-muted">Last Seen</span> <span>${sw.lastSeen ? new Date(sw.lastSeen).toLocaleTimeString() : '--'}</span></div>
                </div>
                <div class="flex gap-xs mt-sm" style="justify-content:flex-end">
                    <button class="btn btn-xs btn-accent" onclick="NetSwitchPage.selectSwitch('${sw.id}');HippoApp.navigate('netswitch')"><i class="fas fa-sliders-h"></i> Control</button>
                </div>
            </div>
        `;
    },

    // ---- Lighting Consoles ----
    _renderLightingConsoles() {
        if (typeof LightingPage === 'undefined') return UI.empty('fa-lightbulb', 'No Consoles', 'Add a console to monitor');
        LightingPage._loadConsoles();
        const consoles = LightingPage._consoles || [];
        if (consoles.length === 0) return UI.empty('fa-lightbulb', 'No Lighting Consoles', 'Add a console from the sidebar or click Add Console above');
        return consoles.map(c => this._renderLightingNode(c)).join('');
    },

    _renderLightingNode(con) {
        const online = con.connected || false;
        const brand = con.type === 'ma' ? 'MA Lighting' : 'Avolites';
        const brandColor = con.type === 'ma' ? '#a855f7' : '#3b82f6';
        const brandRgb = con.type === 'ma' ? '168,85,247' : '59,130,246';

        return `
            <div class="server-node ${online ? 'online' : 'offline'}" style="border-top:3px solid ${online ? brandColor : 'var(--border)'};">
                <div class="server-node-header">
                    <div class="server-node-icon" style="color:${brandColor};"><i class="fas fa-lightbulb"></i></div>
                    <div class="server-node-title">
                        <div class="server-node-name">${UI.esc(con.name)}</div>
                        <div class="server-node-ip">${UI.esc(con.ip)}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <span class="badge" style="font-size:8px;background:rgba(${brandRgb},0.15);color:${brandColor};">${brand.toUpperCase()}</span>
                        <span class="status-dot ${online ? 'online' : 'offline'}"></span>
                    </div>
                </div>
                <div class="server-node-details" style="font-size:11px;">
                    <div class="node-detail"><span class="text-muted">Status</span> ${online ? '<span style="color:var(--green)">Online</span>' : '<span style="color:var(--red)">Offline</span>'}</div>
                    <div class="node-detail"><span class="text-muted">Type</span> <span>${brand}</span></div>
                    <div class="node-detail"><span class="text-muted">Model</span> <span>${UI.esc(con.model)}</span></div>
                    <div class="node-detail"><span class="text-muted">IP Address</span> <span class="mono">${UI.esc(con.ip)}</span></div>
                    <div class="node-detail"><span class="text-muted">Last Seen</span> <span>${con.lastSeen ? new Date(con.lastSeen).toLocaleTimeString() : '--'}</span></div>
                </div>
                <div class="flex gap-xs mt-sm" style="justify-content:flex-end">
                    <button class="btn btn-xs btn-accent" onclick="LightingPage.selectConsole('${con.id}');HippoApp.navigate('lighting')"><i class="fas fa-sliders-h"></i> Control</button>
                </div>
            </div>
        `;
    },

    // ---- Intercom Systems ----
    _renderIntercomSystems() {
        if (typeof IntercomPage === 'undefined') return UI.empty('fa-headset', 'No Intercom', 'Add an intercom system to monitor');
        IntercomPage._loadSystems();
        if (IntercomPage._systems.length === 0 && typeof IntercomPage._initVirtualDemo === 'function') IntercomPage._initVirtualDemo();
        const systems = IntercomPage._systems || [];
        if (systems.length === 0) return UI.empty('fa-headset', 'No Intercom Systems', 'Add an intercom system from the sidebar');
        return systems.map(s => this._renderIntercomNode(s)).join('');
    },

    _renderIntercomNode(sys) {
        const online = sys.connected || false;
        const brandColor = '#10b981';
        const st = sys.status || {};
        const sysInfo = st.info || {};
        const bpCount = (st.beltpacks || []).length;
        const bpOnline = (st.beltpacks || []).filter(b => b.online).length;

        return `
            <div class="server-node ${online ? 'online' : 'offline'}" style="border-top:3px solid ${online ? brandColor : 'var(--border)'};">
                <div class="server-node-header">
                    <div class="server-node-icon" style="color:${brandColor};"><i class="fas fa-headset"></i></div>
                    <div class="server-node-title">
                        <div class="server-node-name">${sys.virtual ? '<span title="Virtual Demo">\u{1F9EA}</span> ' : ''}${UI.esc(sys.name)}</div>
                        <div class="server-node-ip">${UI.esc(sys.ip)}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <span class="badge" style="font-size:8px;background:rgba(16,185,129,0.15);color:${brandColor};">RIEDEL</span>
                        <span class="status-dot ${online ? 'online' : 'offline'}"></span>
                    </div>
                </div>
                <div class="server-node-details" style="font-size:11px;">
                    <div class="node-detail"><span class="text-muted">Status</span> ${online ? '<span style="color:var(--green)">Online</span>' : '<span style="color:var(--red)">Offline</span>'}</div>
                    <div class="node-detail"><span class="text-muted">Model</span> <span>${UI.esc(sys.model)}</span></div>
                    <div class="node-detail"><span class="text-muted">Firmware</span> <span>${UI.esc(sysInfo.firmware || '--')}</span></div>
                    <div class="node-detail"><span class="text-muted">IP Address</span> <span class="mono">${UI.esc(sys.ip)}</span></div>
                    <div class="node-detail"><span class="text-muted">Beltpacks</span> <span>${bpOnline}/${bpCount} online</span></div>
                    <div class="node-detail"><span class="text-muted">Channels</span> <span>${(st.channels || []).length}</span></div>
                    <div class="node-detail"><span class="text-muted">Antennas</span> <span>${(st.antennas || []).length}</span></div>
                    <div class="node-detail"><span class="text-muted">Last Seen</span> <span>${sys.lastSeen ? new Date(sys.lastSeen).toLocaleTimeString() : '--'}</span></div>
                </div>
                <div class="flex gap-xs mt-sm" style="justify-content:flex-end">
                    <button class="btn btn-xs btn-accent" onclick="IntercomPage.selectSystem('${sys.id}');HippoApp.navigate('intercom')"><i class="fas fa-sliders-h"></i> Control</button>
                </div>
            </div>
        `;
    },

    async onActivate() {
        this.refreshAll();
        // Poll every 3 seconds for real-time status updates
        this._pollTimer = setInterval(() => this.refreshAll(), 3000);
    },

    onDeactivate() {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
    },

    async refreshAll() {
        const servers = appState.get('servers');
        const promises = servers.map(s => this.pingServer(s.id));
        await Promise.allSettled(promises);
        if (appState.get('currentPage') === 'status') {
            const statuses = appState.get('serverStatuses');
            const activeId = appState.get('activeServerId');
            const grid = document.getElementById('status-grid');
            if (grid) {
                grid.innerHTML = servers.length === 0
                    ? UI.empty('fa-server', 'No Servers', 'Add a server to monitor')
                    : servers.map(s => this._renderNode(s, statuses[s.id], activeId)).join('');
            }
            const ledGrid = document.getElementById('led-status-grid');
            if (ledGrid) {
                ledGrid.innerHTML = this._renderLedProcessors();
            }
            const ptzGrid = document.getElementById('ptz-status-grid');
            if (ptzGrid) {
                ptzGrid.innerHTML = this._renderPtzCameras();
            }
            const nsGrid = document.getElementById('netswitch-status-grid');
            if (nsGrid) {
                nsGrid.innerHTML = this._renderNetSwitches();
            }
            const lcGrid = document.getElementById('lighting-status-grid');
            if (lcGrid) {
                lcGrid.innerHTML = this._renderLightingConsoles();
            }
            const icGrid = document.getElementById('intercom-status-grid');
            if (icGrid) {
                icGrid.innerHTML = this._renderIntercomSystems();
            }
        }
    },

    async pingServer(serverId) {
        const server = appState.get('servers').find(s => s.id === serverId);
        if (!server) return;

        const type = server.type || 'hippo';
        const t0 = performance.now();
        try {
            let info;

            // For virtual servers, always run healthCheck — virtual modules intercept fetch
            if (server.virtual) {
                const health = await this._runHealthCheck(type, server);
                if (health?.ok) {
                    info = health.info;
                } else {
                    // Fallback for virtual servers that don't have a healthCheck route
                    const existing = appState.get('serverStatuses')[serverId];
                    info = existing?.info || { engineStatus: 'Running', computerName: server.name };
                }
                const latency = Math.floor(Math.random() * 3 + 1);
                const bandwidth = Math.random() * 30 + 10;
                appState.updateServerStatus(serverId, {
                    online: true,
                    info,
                    error: null,
                    latency,
                    bandwidth: parseFloat(bandwidth.toFixed(1)),
                    lastSeen: Date.now()
                });
                return;
            }

            switch (type) {
                case 'resolume': {
                    const api = new ResolumeAPI();
                    api.configure(server.host, server.port);
                    const health = await api.healthCheck();
                    if (!health.ok) throw new Error(health.error);
                    info = health.info;
                    break;
                }
                case 'vmix': {
                    const api = new VmixAPI();
                    api.configure(server.host, server.port);
                    const health = await api.healthCheck();
                    if (!health.ok) throw new Error(health.error);
                    info = health.info;
                    break;
                }
                case 'casparcg': {
                    const api = new CasparcgAPI();
                    api.configure(server.host, server.port);
                    const health = await api.healthCheck();
                    if (!health.ok) throw new Error(health.error);
                    info = health.info;
                    break;
                }
                case 'obs': {
                    // OBS uses WebSocket — for non-active servers, just mark based on last known state
                    const existing = appState.get('serverStatuses')[serverId];
                    if (existing?.online) {
                        info = existing.info;
                    } else {
                        throw new Error('OBS requires WebSocket connection');
                    }
                    break;
                }
                case 'barco': {
                    const api = new BarcoAPI();
                    api.configure(server.host, server.port);
                    const health = await api.healthCheck();
                    if (!health.ok) throw new Error(health.error);
                    info = health.info;
                    break;
                }
                case 'qlab': {
                    // QLab uses WebSocket (OSC) — for non-active servers, use last known state
                    const existingQlab = appState.get('serverStatuses')[serverId];
                    if (existingQlab?.online) {
                        info = existingQlab.info;
                    } else {
                        throw new Error('QLab requires WebSocket connection');
                    }
                    break;
                }
                case 'disguise': {
                    const api = new DisguiseAPI();
                    api.configure(server.host, server.port);
                    const health = await api.healthCheck();
                    if (!health.ok) throw new Error(health.error);
                    info = health.info;
                    break;
                }
                case 'pixera': {
                    const api = new PixeraAPI();
                    api.configure(server.host, server.port);
                    const health = await api.healthCheck();
                    if (!health.ok) throw new Error(health.error);
                    info = health.info;
                    break;
                }
                default: {
                    const api = new HippoAPI();
                    api.configure(server.host, server.port);
                    info = await api.getInfo();
                    break;
                }
            }
            const latency = Math.round(performance.now() - t0);
            // Estimate bandwidth based on response time (virtual servers get simulated values)
            const bandwidth = server.virtual ? (Math.random() * 30 + 10) : (latency > 0 ? (1000 / latency * 2).toFixed(1) : 0);
            appState.updateServerStatus(serverId, { online: true, info, error: null, latency, bandwidth: parseFloat(bandwidth), lastSeen: Date.now() });
        } catch (e) {
            appState.updateServerStatus(serverId, { online: false, info: null, error: e.message, latency: null, bandwidth: 0 });
        }
    },

    async _runHealthCheck(type, server) {
        try {
            // Use fresh API instances for fetch-based servers (virtual intercepts match by URL)
            // Use global singletons for WebSocket-based servers (OBS, QLab) since they need the mock WS
            let api;
            switch (type) {
                case 'resolume': api = new ResolumeAPI(); api.configure(server.host, server.port); return await api.healthCheck();
                case 'vmix':     api = new VmixAPI(); api.configure(server.host, server.port); return await api.healthCheck();
                case 'casparcg': api = new CasparcgAPI(); api.configure(server.host, server.port); return await api.healthCheck();
                case 'barco':    api = new BarcoAPI(); api.configure(server.host, server.port); return await api.healthCheck();
                case 'disguise': api = new DisguiseAPI(); api.configure(server.host, server.port); return await api.healthCheck();
                case 'pixera':   api = new PixeraAPI(); api.configure(server.host, server.port); return await api.healthCheck();
                case 'obs': {
                    // OBS uses WebSocket — create a temporary connection via virtual WS if available
                    if (server.virtual && typeof VirtualObs !== 'undefined' && VirtualObs.isActive()) {
                        const tmpApi = new ObsAPI();
                        tmpApi.configure(server.host, server.port);
                        tmpApi.useVirtualWs(VirtualObs.createWebSocket());
                        return await tmpApi.healthCheck();
                    }
                    // For real servers, use last known state
                    const existing = appState.get('serverStatuses')[server.id];
                    return existing?.info ? { ok: true, info: existing.info } : { ok: false, error: 'Not connected' };
                }
                case 'qlab': {
                    if (server.virtual && typeof VirtualQlab !== 'undefined' && VirtualQlab.isActive()) {
                        const tmpApi = new QlabAPI();
                        tmpApi.configure(server.host, server.port);
                        tmpApi.useVirtualWs(VirtualQlab.createWebSocket());
                        return await tmpApi.healthCheck();
                    }
                    const existing = appState.get('serverStatuses')[server.id];
                    return existing?.info ? { ok: true, info: existing.info } : { ok: false, error: 'Not connected' };
                }
                default: api = new HippoAPI(); api.configure(server.host, server.port); return await api.healthCheck();
            }
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    editServer(id) {
        const server = appState.get('servers').find(s => s.id === id);
        if (!server) return;
        const type = server.type || 'hippo';
        const t = HippoApp._serverTypes?.[type] || {};
        UI.openModal('Edit Server', `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                <i class="fas ${t.icon || 'fa-server'}" style="color:${t.color || 'var(--accent)'};font-size:16px;"></i>
                <strong>${t.label || type}</strong>
            </div>
            ${UI.formGroup('NAME', `<input class="form-control" id="edit-srv-name" value="${UI.esc(server.name)}">`)}
            ${UI.formGroup('HOST / IP', `<input class="form-control" id="edit-srv-host" value="${UI.esc(server.host)}">`)}
            <div class="form-row">
                ${UI.formGroup('API PORT', `<input class="form-control" type="number" id="edit-srv-port" value="${server.port}">`)}
                ${UI.formGroup('WS PORT', `<input class="form-control" type="number" id="edit-srv-wsport" value="${server.wsPort || t.wsPort || 40513}">`)}
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="StatusPage.saveEditServer('${id}')">Save</button>`);
    },

    saveEditServer(id) {
        appState.updateServer(id, {
            name: document.getElementById('edit-srv-name').value.trim(),
            host: document.getElementById('edit-srv-host').value.trim(),
            port: parseInt(document.getElementById('edit-srv-port').value) || 40512,
            wsPort: parseInt(document.getElementById('edit-srv-wsport').value) || 40513,
        });
        UI.closeModal();
        UI.toast('Server updated', 'success');
        HippoApp.populateServerSelect();
        this.refreshAll();
    },

    async removeServer(id) {
        const ok = await UI.confirm('Remove Server', 'Remove this server from the list?');
        if (!ok) return;
        // Disconnect if active
        if (appState.get('activeServerId') === id) HippoApp.disconnect();
        appState.removeServer(id);
        UI.toast('Server removed', 'info');
        HippoApp.populateServerSelect();
        // Immediately re-render the grid so removal is instant
        const grid = document.getElementById('status-grid');
        if (grid) {
            const servers = appState.get('servers');
            const statuses = appState.get('serverStatuses');
            const activeId = appState.get('activeServerId');
            grid.innerHTML = servers.length === 0
                ? UI.empty('fa-server', 'No Servers', 'Add a server to monitor')
                : servers.map(s => this._renderNode(s, statuses[s.id], activeId)).join('');
        }
        // Also re-render the full page to update summary counts
        if (appState.get('currentPage') === 'status') {
            HippoApp.renderPage();
        }
        this.refreshAll();
    },
};
