/**
 * Settings Page — Application settings, server management, API configuration, Companion
 */
const SettingsPage = {
    _section: 'servers',

    render() {
        return `
            <div class="settings-content" id="settings-content">
                ${this._renderSection()}
            </div>
        `;
    },

    showSection(s) {
        this._section = s;
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
        // Update sidebar nav active state
        document.querySelectorAll('.nav-item[data-section]').forEach(l => {
            l.classList.toggle('active', l.dataset.section === s);
        });
    },

    _renderSection() {
        switch (this._section) {
            case 'project': return this._projectSection();
            case 'servers': return this._serversSection();
            case 'network': return this._networkSection();
            case 'cluster': return this._clusterSection();
            case 'api': return this._apiSection();
            case 'companion': return this._companionSection();
            case 'display': return this._displaySection();
            case 'updates': return this._updatesSection();
            case 'about': return this._aboutSection();
            default: return '';
        }
    },

    _projectSection() {
        const projectName = HippoApp._projectName || 'Untitled';
        const projectPath = HippoApp._projectPath || 'Not saved';
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-folder-open"></i> Project</h3>
                </div>
                <div class="card-body">
                    <table>
                        <tr><td class="text-muted">Project Name</td><td><strong>${UI.esc(projectName)}</strong></td></tr>
                        <tr><td class="text-muted">File Path</td><td class="mono" style="font-size:11px;word-break:break-all;">${UI.esc(projectPath)}</td></tr>
                    </table>
                    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="HippoApp.newProject()"><i class="fas fa-file"></i> New Project</button>
                        <button class="btn" onclick="HippoApp.openProject()"><i class="fas fa-folder-open"></i> Open Project</button>
                        <button class="btn" onclick="HippoApp.saveProject()"><i class="fas fa-save"></i> Save Project</button>
                        <button class="btn" onclick="HippoApp.saveProjectAs()"><i class="fas fa-save"></i> Save As...</button>
                    </div>
                    <p style="color:var(--text-muted);font-size:11px;margin-top:12px;">
                        Projects save your server list, network configuration, and settings as a <code>.luxor</code> file you can share or reopen later.
                    </p>
                </div>
            </div>
        `;
    },

    _serversSection() {
        const servers = appState.get('servers');
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-server"></i> Server List</h3>
                    <button class="btn btn-xs btn-primary" onclick="HippoApp.showAddServer()"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body">
                    ${servers.length === 0 ? '<p class="text-muted">No servers configured</p>' : `
                        <table>
                            <thead><tr><th>Name</th><th>Type</th><th>Host</th><th>Port</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${servers.map(s => `
                                    <tr>
                                        <td><strong>${s.virtual ? '\u{1F9EA} ' : ''}${UI.esc(s.name)}</strong></td>
                                        <td><span class="badge badge-${{hippo:'accent',resolume:'purple',vmix:'blue',casparcg:'orange',obs:'green',barco:'red',qlab:'purple',disguise:'pink',pixera:'cyan'}[s.type||'hippo']||'accent'}" style="font-size:9px;${{barco:'background:#ef4444;color:#fff;',disguise:'background:#ec4899;color:#fff;'}[s.type||'']||''}">${(s.type || 'hippo').toUpperCase()}</span></td>
                                        <td class="mono">${UI.esc(s.host)}</td>
                                        <td class="mono">${s.port}</td>
                                        <td>
                                            <button class="btn btn-xs btn-accent" onclick="HippoApp.connectToServer('${s.id}')"><i class="fas fa-plug"></i></button>
                                            <button class="btn btn-xs" onclick="StatusPage.editServer('${s.id}')"><i class="fas fa-pen"></i></button>
                                            <button class="btn btn-xs btn-danger" onclick="StatusPage.removeServer('${s.id}')"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
    },

    // ================================================================
    // NETWORK & NTP — moved from Network Config page
    // ================================================================
    _networkSection() {
        const cfg = appState.get('networkConfig');
        const g = cfg.general;
        return `
            <div class="section-header">
                <h2><i class="fas fa-globe"></i> Network & NTP</h2>
                <button class="btn btn-sm btn-primary" onclick="SettingsPage.saveNetworkSettings()"><i class="fas fa-save"></i> Save</button>
            </div>
            <div class="network-grid">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-globe"></i> Network Interfaces</h3></div>
                    <div class="card-body">
                        ${UI.formGroup('HOSTNAME', '<input class="form-control" id="net-hostname" value="' + UI.esc(g.hostname) + '" placeholder="Auto-detect">')}
                        ${UI.formGroup('PRIMARY INTERFACE', UI.select('net-primary-iface', [{value:'auto',label:'Auto-detect'},{value:'eth0',label:'eth0'},{value:'eth1',label:'eth1'}], g.primaryInterface))}
                        ${UI.formGroup('MTU SIZE', '<input class="form-control" type="number" id="net-mtu" value="' + g.mtu + '" min="576" max="9000">', 'Default: 1500. Use 9000 for jumbo frames')}
                        ${UI.formGroup('QOS PRIORITY', UI.select('net-qos', ['normal','high','realtime'], g.qos))}
                        ${UI.formGroup('BANDWIDTH LIMIT (MBPS)', '<input class="form-control" type="number" id="net-bw" value="' + g.bandwidthLimit + '" min="0">', '0 = unlimited')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-clock"></i> Time Sync (NTP)</h3></div>
                    <div class="card-body">
                        <div class="form-inline mb-md">
                            <span style="font-size:12px">NTP Enabled</span>
                            ${UI.toggle('net-ntp-enabled', g.ntpEnabled)}
                        </div>
                        ${UI.formGroup('NTP SERVER', '<input class="form-control mono" id="net-ntp-server" value="' + UI.esc(g.ntpServer) + '">')}
                        <p style="color:var(--text-muted);font-size:11px;margin-top:12px;">
                            NTP synchronises clocks across all machines on your show network. Use a local NTP server for best accuracy.
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    saveNetworkSettings() {
        const cfg = appState.get('networkConfig');
        cfg.general.hostname = document.getElementById('net-hostname')?.value ?? cfg.general.hostname;
        cfg.general.primaryInterface = document.getElementById('net-primary-iface')?.value ?? cfg.general.primaryInterface;
        cfg.general.mtu = parseInt(document.getElementById('net-mtu')?.value) || cfg.general.mtu;
        cfg.general.qos = document.getElementById('net-qos')?.value ?? cfg.general.qos;
        cfg.general.bandwidthLimit = parseInt(document.getElementById('net-bw')?.value) || 0;
        cfg.general.ntpEnabled = document.getElementById('net-ntp-enabled')?.checked ?? cfg.general.ntpEnabled;
        cfg.general.ntpServer = document.getElementById('net-ntp-server')?.value ?? cfg.general.ntpServer;
        appState.setNetworkConfig(cfg);
        UI.toast('Network settings saved', 'success');
        appState.log('INFO', 'Network settings updated', 'Settings');
    },

    // ================================================================
    // CLUSTER & SYNC — moved from Sync & Cluster page
    // ================================================================
    _clusterSection() {
        const cfg = appState.get('networkConfig');
        const h = cfg.hipponet;
        const servers = appState.get('servers');
        const statuses = appState.get('serverStatuses');
        const connected = appState.get('connected');

        return `
            <div class="section-header">
                <h2><i class="fas fa-project-diagram"></i> Cluster & Sync</h2>
                <div class="flex gap-sm">
                    <button class="btn btn-sm btn-primary" onclick="SettingsPage.saveClusterSettings()"><i class="fas fa-save"></i> Save</button>
                    ${connected ? '<button class="btn btn-sm btn-accent" onclick="SettingsPage.triggerSync()"><i class="fas fa-sync-alt"></i> Sync Media Now</button>' : ''}
                </div>
            </div>

            <!-- Cluster Node Overview -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-server"></i> Cluster Nodes</h3></div>
                <div class="card-body">
                    <div class="cluster-grid" style="display:flex;flex-wrap:wrap;gap:10px;">
                        ${servers.map(s => {
                            const st = statuses[s.id];
                            const online = st?.online;
                            return '<div class="server-node ' + (online ? 'online' : 'offline') + '" style="min-width:140px;padding:12px;border:1px solid var(--border-color);border-radius:var(--radius);background:var(--bg-secondary);">' +
                                '<div style="display:flex;align-items:center;gap:8px;">' +
                                    '<i class="fas fa-server" style="color:var(--text-muted);"></i>' +
                                    '<div><div style="font-weight:700;font-size:12px;">' + UI.esc(s.name) + '</div>' +
                                    '<div class="mono" style="font-size:10px;color:var(--text-muted);">' + UI.esc(s.host) + ':' + s.port + '</div></div>' +
                                '</div>' +
                                '<div style="text-align:center;padding:4px;margin-top:6px;">' + (online ? UI.badge('ONLINE', 'green') : UI.badge('OFFLINE', 'red')) + '</div>' +
                            '</div>';
                        }).join('')}
                        ${servers.length === 0 ? '<p class="text-muted">No servers configured. Add servers in the Servers section.</p>' : ''}
                    </div>
                </div>
            </div>

            <!-- HippoNet Configuration -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-project-diagram"></i> HippoNet Configuration</h3>
                    <div class="form-inline">${UI.toggle('hn-enabled', h.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('INTERFACE', UI.select('hn-iface', [{value:'auto',label:'Auto'},{value:'eth0',label:'eth0'},{value:'eth1',label:'eth1'}], h.interface))}
                        ${UI.formGroup('PORT', '<input class="form-control" type="number" id="hn-port" value="' + h.port + '" min="1" max="65535">')}
                        ${UI.formGroup('MAX NODES', '<input class="form-control" type="number" id="hn-maxnodes" value="' + h.maxNodes + '" min="1" max="256">')}
                    </div>
                    <div class="form-row">
                        ${UI.formGroup('MASTER IP', '<input class="form-control mono" id="hn-master" value="' + UI.esc(h.masterIp) + '" placeholder="Auto-elect">', 'Leave empty for auto-election')}
                        ${UI.formGroup('HEARTBEAT (S)', '<input class="form-control" type="number" id="hn-heartbeat" value="' + h.heartbeat + '" min="1">')}
                        ${UI.formGroup('TIMEOUT (S)', '<input class="form-control" type="number" id="hn-timeout" value="' + h.timeout + '" min="5">')}
                    </div>
                    <div class="flex gap-md mt-sm">
                        <div class="form-inline">${UI.toggle('hn-discovery', h.discovery)} <span style="font-size:11px">Auto Discovery</span></div>
                        <div class="form-inline">${UI.toggle('hn-sync', h.syncEnabled)} <span style="font-size:11px">Sync Enabled</span></div>
                    </div>
                </div>
            </div>

            <!-- Sync Operations -->
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-exchange-alt"></i> Sync Operations</h3></div>
                <div class="card-body">
                    <p style="color:var(--text-secondary);font-size:12px;margin-bottom:12px">
                        Trigger media sync to push all media files from the active server to all other Hippotizer nodes on the HippoNet network.
                    </p>
                    <div class="flex gap-sm">
                        <button class="btn btn-primary" onclick="SettingsPage.triggerSync()" ${!connected ? 'disabled' : ''}>
                            <i class="fas fa-cloud-upload-alt"></i> Sync Media to All Nodes
                        </button>
                        <button class="btn" onclick="StatusPage.refreshAll()"><i class="fas fa-sync-alt"></i> Refresh Status</button>
                    </div>
                    <div id="sync-log" class="mt-md"></div>
                </div>
            </div>
        `;
    },

    saveClusterSettings() {
        const cfg = appState.get('networkConfig');
        cfg.hipponet.enabled = document.getElementById('hn-enabled')?.checked ?? cfg.hipponet.enabled;
        cfg.hipponet.interface = document.getElementById('hn-iface')?.value ?? cfg.hipponet.interface;
        cfg.hipponet.port = parseInt(document.getElementById('hn-port')?.value) || cfg.hipponet.port;
        cfg.hipponet.maxNodes = parseInt(document.getElementById('hn-maxnodes')?.value) || cfg.hipponet.maxNodes;
        cfg.hipponet.masterIp = document.getElementById('hn-master')?.value ?? cfg.hipponet.masterIp;
        cfg.hipponet.heartbeat = parseInt(document.getElementById('hn-heartbeat')?.value) || cfg.hipponet.heartbeat;
        cfg.hipponet.timeout = parseInt(document.getElementById('hn-timeout')?.value) || cfg.hipponet.timeout;
        cfg.hipponet.discovery = document.getElementById('hn-discovery')?.checked ?? cfg.hipponet.discovery;
        cfg.hipponet.syncEnabled = document.getElementById('hn-sync')?.checked ?? cfg.hipponet.syncEnabled;
        appState.setNetworkConfig(cfg);
        UI.toast('Cluster settings saved', 'success');
        appState.log('INFO', 'Cluster settings updated', 'Settings');
    },

    async triggerSync() {
        try {
            await hippoAPI.syncMedia();
            UI.toast('Media sync triggered successfully', 'success');
            appState.log('INFO', 'Media sync triggered to network', 'Sync');
            const log = document.getElementById('sync-log');
            if (log) log.innerHTML = '<div class="badge badge-green" style="font-size:12px;padding:6px 10px"><i class="fas fa-check"></i> Sync initiated at ' + new Date().toLocaleTimeString() + '</div>';
        } catch(e) {
            UI.toast('Sync failed: ' + e.message, 'error');
        }
    },

    _apiSection() {
        const server = appState.get('servers').find(s => s.id === appState.get('activeServerId'));
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-plug"></i> API Connection</h3></div>
                <div class="card-body">
                    ${server ? `
                        <table>
                            <tr><td class="text-muted">REST API</td><td class="mono">http://${server.host}:${server.port}</td></tr>
                            <tr><td class="text-muted">WebSocket</td><td class="mono">ws://${server.host}:${server.wsPort || 40513}</td></tr>
                            <tr><td class="text-muted">Docs</td><td class="mono">http://${server.host}:${server.port}/docs</td></tr>
                            <tr><td class="text-muted">Status</td><td>${appState.get('connected') ? UI.badge('Connected', 'green') : UI.badge('Disconnected', 'red')}</td></tr>
                            <tr><td class="text-muted">WebSocket</td><td>${appState.get('wsConnected') ? UI.badge('Connected', 'green') : UI.badge('Disconnected', 'red')}</td></tr>
                        </table>
                        <div class="flex gap-sm mt-md">
                            <button class="btn btn-sm btn-primary" onclick="HippoApp.connectToServer('${server.id}')"><i class="fas fa-plug"></i> Reconnect</button>
                            <button class="btn btn-sm" onclick="HippoApp.disconnect()"><i class="fas fa-unlink"></i> Disconnect</button>
                            <a class="btn btn-sm" href="http://${server.host}:${server.port}/docs" target="_blank"><i class="fas fa-external-link-alt"></i> API Docs</a>
                        </div>
                    ` : '<p class="text-muted">No active server. Connect to a server first.</p>'}
                </div>
            </div>

            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-clock"></i> Polling</h3></div>
                <div class="card-body">
                    ${UI.formGroup('POLL INTERVAL (MS)', `<input class="form-control" type="number" id="poll-interval" value="${appState.get('pollInterval')}" min="1000" max="60000" step="1000">`, 'How often to poll server for updates')}
                    <button class="btn btn-sm btn-primary mt-sm" onclick="SettingsPage.savePollInterval()">Apply</button>
                </div>
            </div>
        `;
    },

    // ================================================================
    // COMPANION SECTION
    // ================================================================

    _companionSection() {
        const cfg = CompanionAPI.getConfig();
        const connected = CompanionAPI.isConnected();
        const version = CompanionAPI._companionVersion;

        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-gamepad"></i> Bitfocus Companion</h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${connected
                            ? UI.badge('Connected' + (version ? ' v' + version : ''), 'green')
                            : (cfg.enabled ? UI.badge('Connecting...', 'orange') : UI.badge('Disabled', 'red'))}
                    </div>
                </div>
                <div class="card-body">
                    <p style="color:var(--text-muted);font-size:11px;margin-bottom:16px;">
                        Connect to Bitfocus Companion via the Satellite API. Luxor registers as a virtual surface
                        so Companion buttons appear here and presses are sent back to Companion.
                    </p>

                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:10px 14px;background:var(--bg-secondary);border-radius:var(--radius);border:1px solid var(--border);">
                        <span style="font-size:12px;font-weight:600;">Enable Companion</span>
                        <div style="flex:1"></div>
                        <label class="toggle-switch" style="margin:0;">
                            <input type="checkbox" id="comp-enabled" ${cfg.enabled ? 'checked' : ''} onchange="SettingsPage._companionToggle(this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                        <div>
                            <label style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;display:block;margin-bottom:4px;">Companion Host</label>
                            <input class="form-control" type="text" id="comp-host" value="${UI.esc(cfg.host)}" placeholder="127.0.0.1" style="font-family:monospace;">
                        </div>
                        <div>
                            <label style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;display:block;margin-bottom:4px;">WebSocket Port</label>
                            <input class="form-control" type="number" id="comp-port" value="${cfg.port}" min="1" max="65535" style="font-family:monospace;">
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                        <div>
                            <label style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;display:block;margin-bottom:4px;">Grid Columns</label>
                            <select class="form-control" id="comp-cols">
                                ${[4,6,8,10,12].map(n => `<option value="${n}" ${cfg.cols === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;display:block;margin-bottom:4px;">Grid Rows</label>
                            <select class="form-control" id="comp-rows">
                                ${[2,3,4,5,6,8].map(n => `<option value="${n}" ${cfg.rows === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                        <div>
                            <label style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;display:block;margin-bottom:4px;">Device ID</label>
                            <input class="form-control" type="text" id="comp-deviceid" value="${UI.esc(cfg.deviceId)}" style="font-family:monospace;font-size:11px;">
                        </div>
                        <div>
                            <label style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;display:block;margin-bottom:4px;">Device Name</label>
                            <input class="form-control" type="text" id="comp-devicename" value="${UI.esc(cfg.deviceName)}">
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-primary" onclick="SettingsPage._companionSave()"><i class="fas fa-save"></i> Save & Connect</button>
                        <button class="btn" onclick="SettingsPage._companionTest()"><i class="fas fa-sync"></i> Test Connection</button>
                        ${connected ? `<button class="btn btn-danger" onclick="SettingsPage._companionDisconnect()"><i class="fas fa-unlink"></i> Disconnect</button>` : ''}
                    </div>
                </div>
            </div>

            <!-- Virtual Button Grid -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-th"></i> Virtual Surface</h3>
                    <span style="font-size:10px;color:var(--text-muted);">${cfg.cols} x ${cfg.rows} (${cfg.cols * cfg.rows} buttons)</span>
                </div>
                <div class="card-body" style="padding:12px;">
                    ${connected
                        ? this._renderButtonGrid(cfg)
                        : `<div style="text-align:center;padding:40px;color:var(--text-muted);">
                            <i class="fas fa-gamepad" style="font-size:32px;opacity:0.2;display:block;margin-bottom:12px;"></i>
                            <p style="font-size:13px;">Connect to Companion to see your buttons here</p>
                            <p style="font-size:11px;margin-top:6px;">Make sure Companion is running and the Satellite API is enabled (port ${cfg.port})</p>
                          </div>`
                    }
                </div>
            </div>

            <!-- How to Use -->
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-book-open"></i> How to Use</h3></div>
                <div class="card-body" style="font-size:12px;color:var(--text-secondary);">

                    <!-- What is this -->
                    <div style="padding:12px 14px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:var(--radius);margin-bottom:16px;">
                        <p style="font-weight:600;color:var(--text-primary);margin-bottom:6px;"><i class="fas fa-info-circle" style="color:#3b82f6;margin-right:6px;"></i>What is this?</p>
                        <p style="line-height:1.7;">Luxor connects to <strong>Bitfocus Companion</strong> using the <strong>Satellite API</strong> and registers as a <strong>virtual Stream Deck</strong>.
                        Any buttons you configure in Companion will appear live in the grid above. Clicking a button in Luxor is the same as pressing it on a physical Stream Deck —
                        it triggers the actions you've configured in Companion (fire cues, switch scenes, control lights, etc.).</p>
                    </div>

                    <!-- Setup Steps -->
                    <p style="font-weight:700;color:var(--text-primary);font-size:13px;margin-bottom:12px;"><i class="fas fa-cogs" style="color:var(--accent);margin-right:6px;"></i>Setup Steps</p>
                    <div class="comp-steps">
                        <div class="comp-step">
                            <div class="comp-step-num">1</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Open Bitfocus Companion</p>
                                <p>Launch Companion on your machine or any machine on the same network. Open the Companion web GUI (usually <code>http://127.0.0.1:8000</code>).</p>
                            </div>
                        </div>
                        <div class="comp-step">
                            <div class="comp-step-num">2</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Enable the Satellite API</p>
                                <p>In Companion, go to the <strong>Settings</strong> tab. Find <strong>"Satellite"</strong> and make sure it's <strong>enabled</strong>.
                                The default WebSocket port is <code>16623</code>. Don't change it unless you have a reason to.</p>
                            </div>
                        </div>
                        <div class="comp-step">
                            <div class="comp-step-num">3</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Configure the connection in Luxor</p>
                                <p>Enter the <strong>IP address</strong> of the machine running Companion above. If it's the same machine, use <code>127.0.0.1</code>.
                                Set the port to <code>16623</code> (default). Choose your preferred <strong>grid size</strong> (columns x rows).</p>
                            </div>
                        </div>
                        <div class="comp-step">
                            <div class="comp-step-num">4</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Connect</p>
                                <p>Click <strong>"Save & Connect"</strong>. The status badge should change to <span style="color:#22c55e;font-weight:600;">Connected</span>.
                                If it doesn't, click <strong>"Test Connection"</strong> to diagnose the issue.</p>
                            </div>
                        </div>
                        <div class="comp-step">
                            <div class="comp-step-num">5</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Assign the surface in Companion</p>
                                <p>Go to the <strong>Surfaces</strong> tab in Companion. You'll see <strong>"${UI.esc(cfg.deviceName)}"</strong> listed as a new surface.
                                Click the <strong>page selector</strong> to assign which button page this surface shows.</p>
                            </div>
                        </div>
                        <div class="comp-step">
                            <div class="comp-step-num">6</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Configure buttons</p>
                                <p>Go to the <strong>Buttons</strong> tab in Companion. Configure your buttons with actions, feedbacks, and styles as usual.
                                Everything you set up will appear <strong>live in the Luxor grid</strong> above — colors, text, and images.</p>
                            </div>
                        </div>
                        <div class="comp-step">
                            <div class="comp-step-num">7</div>
                            <div class="comp-step-content">
                                <p class="comp-step-title">Use it!</p>
                                <p>Click any button in the Virtual Surface grid to trigger it. Hold a button for press-and-hold actions.
                                It works exactly like a physical Stream Deck connected to Companion.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Use Cases -->
                    <p style="font-weight:700;color:var(--text-primary);font-size:13px;margin:20px 0 12px;"><i class="fas fa-rocket" style="color:var(--accent);margin-right:6px;"></i>What Can You Do With This?</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                        <div class="comp-usecase"><i class="fas fa-play" style="color:#22c55e;"></i><span>Fire show cues and timelines</span></div>
                        <div class="comp-usecase"><i class="fas fa-exchange-alt" style="color:#3b82f6;"></i><span>Switch video sources on ATEM / E2</span></div>
                        <div class="comp-usecase"><i class="fas fa-lightbulb" style="color:#f59e0b;"></i><span>Trigger lighting presets on grandMA3</span></div>
                        <div class="comp-usecase"><i class="fas fa-volume-up" style="color:#a855f7;"></i><span>Mute/unmute audio channels</span></div>
                        <div class="comp-usecase"><i class="fas fa-tv" style="color:#ec4899;"></i><span>Control Resolume / Hippo playback</span></div>
                        <div class="comp-usecase"><i class="fas fa-camera" style="color:#06b6d4;"></i><span>Recall PTZ camera presets</span></div>
                        <div class="comp-usecase"><i class="fas fa-th-large" style="color:#f97316;"></i><span>Run OBS scene transitions</span></div>
                        <div class="comp-usecase"><i class="fas fa-headset" style="color:#ef4444;"></i><span>Trigger intercom talkback</span></div>
                    </div>

                    <!-- Troubleshooting -->
                    <p style="font-weight:700;color:var(--text-primary);font-size:13px;margin-bottom:12px;"><i class="fas fa-wrench" style="color:var(--accent);margin-right:6px;"></i>Troubleshooting</p>
                    <div style="font-size:11px;line-height:1.8;">
                        <div class="comp-trouble"><strong>Can't connect?</strong> Make sure Companion is running, Satellite is enabled in Companion settings, and the IP/port are correct. Check your firewall isn't blocking port ${cfg.port}.</div>
                        <div class="comp-trouble"><strong>Buttons not showing?</strong> After connecting, go to Companion's Surfaces tab and make sure the Luxor surface is assigned to a button page.</div>
                        <div class="comp-trouble"><strong>Connection drops?</strong> Luxor auto-reconnects every 5 seconds. If Companion restarts, the connection will restore automatically.</div>
                        <div class="comp-trouble"><strong>Wrong grid size?</strong> Change the columns/rows above, click Save & Connect. The surface will re-register with the new size. You may need to re-assign the surface page in Companion.</div>
                    </div>

                    <!-- Tip -->
                    <div style="margin-top:16px;padding:10px 14px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:var(--radius);">
                        <p style="font-weight:600;color:#22c55e;margin-bottom:4px;"><i class="fas fa-lightbulb" style="margin-right:6px;"></i>Pro Tip</p>
                        <p style="line-height:1.7;">You can run Companion on a separate machine (e.g., a show network laptop) and connect Luxor to it remotely.
                        Multiple Luxor instances can connect to the same Companion — each with a different Device ID — giving you multiple virtual panels across the team.</p>
                    </div>
                </div>
            </div>
        `;
    },

    _renderButtonGrid(cfg) {
        const buttons = CompanionAPI.getButtons();
        const total = cfg.cols * cfg.rows;
        let html = `<div class="comp-grid" style="display:grid;grid-template-columns:repeat(${cfg.cols}, 1fr);gap:4px;">`;

        for (let i = 0; i < total; i++) {
            const btn = buttons[String(i)];
            const bgColor = btn ? btn.bgColor : '#1a1a2e';
            const text = btn ? btn.text : '';
            const textColor = btn ? btn.textColor : '#555';
            const fontSize = btn ? Math.min(btn.fontSize, 14) : 10;
            const hasBitmap = btn && btn.bitmap;

            html += `
                <button class="comp-btn"
                        style="background:${bgColor};color:${textColor};font-size:${fontSize}px;"
                        onmousedown="SettingsPage._companionBtnDown(${i})"
                        onmouseup="SettingsPage._companionBtnUp(${i})"
                        onmouseleave="SettingsPage._companionBtnUp(${i})"
                        title="Button ${i + 1}">
                    ${hasBitmap
                        ? `<img src="data:image/png;base64,${btn.bitmap}" style="width:100%;height:100%;object-fit:contain;position:absolute;top:0;left:0;border-radius:6px;">`
                        : `<span class="comp-btn-text">${UI.esc(text)}</span>`
                    }
                    <span class="comp-btn-idx">${i + 1}</span>
                </button>`;
        }

        html += '</div>';
        return html;
    },

    // ================================================================
    // COMPANION ACTIONS
    // ================================================================

    _companionToggle(enabled) {
        const cfg = CompanionAPI.getConfig();
        cfg.enabled = enabled;
        CompanionAPI.updateConfig(cfg);
        // Re-render to update UI state
        setTimeout(() => {
            const el = document.getElementById('settings-content');
            if (el) el.innerHTML = this._renderSection();
        }, 500);
    },

    _companionSave() {
        const host = document.getElementById('comp-host')?.value?.trim() || '127.0.0.1';
        const port = parseInt(document.getElementById('comp-port')?.value) || 16623;
        const cols = parseInt(document.getElementById('comp-cols')?.value) || 8;
        const rows = parseInt(document.getElementById('comp-rows')?.value) || 4;
        const deviceId = document.getElementById('comp-deviceid')?.value?.trim() || 'luxor:panel-01';
        const deviceName = document.getElementById('comp-devicename')?.value?.trim() || 'Luxor Production';

        CompanionAPI.updateConfig({
            host, port, cols, rows, deviceId, deviceName,
            enabled: true,
        });

        UI.toast('Companion settings saved — connecting...', 'info');

        // Re-render after connection attempt
        setTimeout(() => {
            const el = document.getElementById('settings-content');
            if (el) el.innerHTML = this._renderSection();

            if (CompanionAPI.isConnected()) {
                UI.toast('Connected to Companion!', 'success');
            }
        }, 2000);
    },

    _companionTest() {
        const host = document.getElementById('comp-host')?.value?.trim() || '127.0.0.1';
        const port = parseInt(document.getElementById('comp-port')?.value) || 16623;

        UI.toast(`Testing connection to ${host}:${port}...`, 'info');

        const testWs = new WebSocket(`ws://${host}:${port}`);
        const timeout = setTimeout(() => {
            testWs.close();
            UI.toast('Connection timed out — check host/port and that Companion Satellite is enabled', 'error');
        }, 5000);

        testWs.onopen = () => {
            clearTimeout(timeout);
            UI.toast('Connection successful! Companion is reachable.', 'success');
            testWs.close();
        };

        testWs.onerror = () => {
            clearTimeout(timeout);
            UI.toast('Connection failed — check host/port and that Companion is running', 'error');
        };
    },

    _companionDisconnect() {
        CompanionAPI.updateConfig({ enabled: false });
        UI.toast('Disconnected from Companion', 'info');
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
    },

    _companionBtnDown(idx) {
        CompanionAPI.pressButton(idx);
        const btn = document.querySelectorAll('.comp-btn')[idx];
        if (btn) btn.classList.add('comp-btn-active');
    },

    _companionBtnUp(idx) {
        CompanionAPI.releaseButton(idx);
        const btn = document.querySelectorAll('.comp-btn')[idx];
        if (btn) btn.classList.remove('comp-btn-active');
    },

    // ================================================================
    // SIDEBAR DISPLAY SETTINGS
    // ================================================================

    _sectionLabels: {
        engines: 'Media Servers',
        ledProcessors: 'LED Processors',
        cameras: 'PTZ Cameras',
        switches: 'Network Switches',
        consoles: 'Lighting Consoles',
        intercom: 'Intercom Systems',
    },

    _sectionIcons: {
        engines: 'fa-server',
        ledProcessors: 'fa-tv',
        cameras: 'fa-video',
        switches: 'fa-network-wired',
        consoles: 'fa-lightbulb',
        intercom: 'fa-headset',
    },

    _featureLabels: {
        tools3d: '3D Tools (Stage Visualizer & LED Layout)',
        captureViewer: 'Capture Viewer (.c2p import)',
        power: 'Power Distribution',
        fixtures: 'Fixture Patch View',
    },

    _featureIcons: {
        tools3d: 'fa-cube',
        captureViewer: 'fa-eye',
        power: 'fa-bolt',
        fixtures: 'fa-lightbulb',
    },

    _displaySection() {
        const vis = SettingsPage._getSidebarVisibility();
        const order = SettingsPage._getSidebarOrder();
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-desktop"></i> Display Settings</h3></div>
                <div class="card-body">
                    <div class="form-inline mb-md" style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border)">
                        <i class="fas ${(localStorage.getItem('luxor_theme') || 'dark') === 'light' ? 'fa-sun' : 'fa-moon'}" style="font-size:12px;color:var(--text-muted);width:16px;text-align:center"></i>
                        <span style="font-size:12px;flex:1">Dark / Light Theme</span>
                        ${UI.toggle('setting-theme', (localStorage.getItem('luxor_theme') || 'dark') === 'light', "HippoApp.toggleTheme(); SettingsPage._section === 'display' && SettingsPage.refresh()")}
                    </div>
                    <div class="form-inline mb-md" style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border)">
                        <i class="fas fa-columns" style="font-size:12px;color:var(--text-muted);width:16px;text-align:center"></i>
                        <span style="font-size:12px;flex:1">Collapsed Sidebar</span>
                        ${UI.toggle('setting-sidebar', appState.get('sidebarCollapsed'), "HippoApp.toggleSidebar()")}
                    </div>
                </div>
            </div>

            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-eye"></i> Sidebar Sections</h3></div>
                <div class="card-body">
                    <p class="text-muted" style="font-size:11px;margin-bottom:12px">Show, hide, and reorder sidebar sections. Use arrows to change order. Changes are saved automatically.</p>
                    ${order.map((key, idx) => `
                        <div class="form-inline mb-md" style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border)">
                            <div style="display:flex;flex-direction:column;gap:2px">
                                <button class="btn btn-xs" style="padding:1px 6px;font-size:9px;line-height:1" onclick="SettingsPage._moveSidebarSection('${key}',-1)" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                                <button class="btn btn-xs" style="padding:1px 6px;font-size:9px;line-height:1" onclick="SettingsPage._moveSidebarSection('${key}',1)" ${idx === order.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                            </div>
                            <i class="fas ${this._sectionIcons[key] || 'fa-circle'}" style="font-size:12px;color:var(--text-muted);width:16px;text-align:center"></i>
                            <span style="font-size:12px;flex:1">${this._sectionLabels[key] || key}</span>
                            ${UI.toggle('vis-' + key, vis[key], "SettingsPage._toggleSidebarSection('" + key + "')")}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-flask"></i> Optional Features</h3></div>
                <div class="card-body">
                    <p class="text-muted" style="font-size:11px;margin-bottom:12px">Enable or disable experimental features. These are hidden by default.</p>
                    ${['tools3d', 'captureViewer', 'power', 'fixtures'].map(key => `
                        <div class="form-inline mb-md" style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border)">
                            <i class="fas ${this._featureIcons[key] || 'fa-circle'}" style="font-size:12px;color:var(--text-muted);width:16px;text-align:center"></i>
                            <span style="font-size:12px;flex:1">${this._featureLabels[key] || key}</span>
                            ${UI.toggle('feat-' + key, vis[key], "SettingsPage._toggleFeature('" + key + "')")}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    _toggleFeature(key) {
        const vis = this._getSidebarVisibility();
        vis[key] = !vis[key];
        try { localStorage.setItem('luxor_sidebar_visibility', JSON.stringify(vis)); } catch {}
        HippoApp.applySidebarVisibility();
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
    },

    _getSidebarVisibility() {
        try {
            const saved = JSON.parse(localStorage.getItem('luxor_sidebar_visibility') || '{}');
            return {
                engines: saved.engines !== false,
                ledProcessors: saved.ledProcessors !== false,
                cameras: saved.cameras !== false,
                switches: saved.switches !== false,
                consoles: saved.consoles !== false,
                intercom: saved.intercom !== false,
                tools3d: saved.tools3d === true,
                captureViewer: saved.captureViewer === true,
                power: saved.power === true,
                fixtures: saved.fixtures === true,
            };
        } catch {
            return { engines: true, ledProcessors: true, cameras: true, switches: true, consoles: true, intercom: true, tools3d: false, captureViewer: false, power: false, fixtures: false };
        }
    },

    _toggleSidebarSection(key) {
        const vis = this._getSidebarVisibility();
        vis[key] = !vis[key];
        try { localStorage.setItem('luxor_sidebar_visibility', JSON.stringify(vis)); } catch {}
        HippoApp.applySidebarVisibility();
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
    },

    _defaultOrder: ['engines', 'ledProcessors', 'cameras', 'switches', 'consoles', 'intercom'],

    _getSidebarOrder() {
        try {
            const saved = JSON.parse(localStorage.getItem('luxor_sidebar_order') || '[]');
            if (Array.isArray(saved) && saved.length === this._defaultOrder.length) return saved;
        } catch {}
        return [...this._defaultOrder];
    },

    _moveSidebarSection(key, direction) {
        const order = this._getSidebarOrder();
        const idx = order.indexOf(key);
        if (idx < 0) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= order.length) return;
        [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
        try { localStorage.setItem('luxor_sidebar_order', JSON.stringify(order)); } catch {}
        HippoApp.applySidebarVisibility();
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
    },

    // ================================================================
    // AUTO-UPDATER SECTION
    // ================================================================
    _updateState: { status: 'idle', version: null, percent: 0, message: '' },

    _updatesSection() {
        const s = this._updateState;
        const currentVersion = '1.5.0';
        const isElectron = typeof window.luxorUpdater !== 'undefined';

        let statusIcon, statusColor, statusText, actionBtn;
        switch (s.status) {
            case 'checking':
                statusIcon = 'fa-spinner fa-spin';
                statusColor = 'var(--blue)';
                statusText = 'Checking for updates...';
                actionBtn = '';
                break;
            case 'available':
                statusIcon = 'fa-arrow-circle-up';
                statusColor = '#4ade80';
                statusText = `Update available: v${s.version}`;
                actionBtn = `<button class="btn btn-primary" onclick="SettingsPage._downloadUpdate()"><i class="fas fa-download"></i> Download Update</button>`;
                break;
            case 'downloading':
                statusIcon = 'fa-spinner fa-spin';
                statusColor = 'var(--blue)';
                statusText = `Downloading... ${s.percent}%`;
                actionBtn = '';
                break;
            case 'ready':
                statusIcon = 'fa-check-circle';
                statusColor = '#4ade80';
                statusText = `Update v${s.version} downloaded — ready to install`;
                actionBtn = `<button class="btn btn-primary" onclick="SettingsPage._installUpdate()"><i class="fas fa-redo"></i> Restart & Install</button>`;
                break;
            case 'up-to-date':
                statusIcon = 'fa-check-circle';
                statusColor = '#4ade80';
                statusText = 'You are up to date!';
                actionBtn = '';
                break;
            case 'error':
                statusIcon = 'fa-exclamation-triangle';
                statusColor = '#f87171';
                statusText = `Update error: ${s.message}`;
                actionBtn = '';
                break;
            default:
                statusIcon = 'fa-cloud-download-alt';
                statusColor = 'var(--text-muted)';
                statusText = 'Click below to check for updates';
                actionBtn = '';
        }

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-cloud-download-alt"></i> Software Updates</h3></div>
                <div class="card-body" style="text-align:center;padding:32px">
                    <div style="margin-bottom:24px">
                        <i class="fas ${statusIcon}" style="font-size:48px;color:${statusColor};margin-bottom:16px;display:block"></i>
                        <p style="font-size:14px;font-weight:600;margin-bottom:4px">${statusText}</p>
                        <p style="color:var(--text-muted);font-size:12px">Current version: v${currentVersion}</p>
                    </div>

                    ${s.status === 'downloading' ? `
                        <div style="background:var(--bg-tertiary);border-radius:8px;height:8px;overflow:hidden;margin:16px auto;max-width:400px;">
                            <div style="background:var(--blue);height:100%;width:${s.percent}%;border-radius:8px;transition:width 0.3s ease"></div>
                        </div>
                        <p style="color:var(--text-muted);font-size:11px">${this._formatBytes(s.transferred || 0)} / ${this._formatBytes(s.total || 0)}</p>
                    ` : ''}

                    ${s.status === 'available' && s.releaseNotes ? `
                        <div style="text-align:left;max-width:500px;margin:16px auto;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius);font-size:12px;color:var(--text-secondary);max-height:200px;overflow-y:auto;">
                            <strong style="display:block;margin-bottom:8px">Release Notes:</strong>
                            ${typeof s.releaseNotes === 'string' ? s.releaseNotes.replace(/\n/g, '<br>') : ''}
                        </div>
                    ` : ''}

                    <div style="display:flex;gap:8px;justify-content:center;margin-top:20px;">
                        ${s.status !== 'checking' && s.status !== 'downloading' ? `
                            <button class="btn btn-primary" onclick="SettingsPage._checkForUpdates()">
                                <i class="fas fa-sync"></i> Check for Updates
                            </button>
                        ` : ''}
                        ${actionBtn}
                    </div>

                    ${!isElectron ? `
                        <div style="margin-top:16px;padding:10px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:var(--radius);max-width:400px;margin-left:auto;margin-right:auto;">
                            <p style="color:#fbbf24;font-size:11px;margin:0">
                                <i class="fas fa-exclamation-triangle"></i> Auto-update is only available in the desktop Electron app.
                                In browser mode, download the latest version from GitHub.
                            </p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="card" style="margin-top:16px;">
                <div class="card-header"><h3><i class="fab fa-github"></i> Manual Download</h3></div>
                <div class="card-body">
                    <p style="color:var(--text-secondary);font-size:12px;margin-bottom:12px">
                        You can also download the latest version directly from GitHub:
                    </p>
                    <a href="https://github.com/Pirlow123/Luxor-Production/releases"
                       style="color:var(--blue);font-size:12px;text-decoration:underline;cursor:pointer"
                       onclick="if(window.require){require('electron').shell.openExternal(this.href);return false;}">
                        github.com/Pirlow123/Luxor-Production/releases
                    </a>
                </div>
            </div>
        `;
    },

    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    async _checkForUpdates() {
        if (typeof window.luxorUpdater === 'undefined') {
            UI.toast('Auto-update only works in the desktop app', 'warning');
            return;
        }
        this._updateState = { status: 'checking' };
        this._refreshUpdatesUI();
        const result = await window.luxorUpdater.check();
        if (!result.ok) {
            this._updateState = { status: 'error', message: result.error };
            this._refreshUpdatesUI();
        }
    },

    async _downloadUpdate() {
        if (typeof window.luxorUpdater === 'undefined') return;
        this._updateState.status = 'downloading';
        this._updateState.percent = 0;
        this._refreshUpdatesUI();
        const result = await window.luxorUpdater.download();
        if (!result.ok) {
            this._updateState = { status: 'error', message: result.error };
            this._refreshUpdatesUI();
        }
    },

    _installUpdate() {
        if (typeof window.luxorUpdater === 'undefined') return;
        window.luxorUpdater.install();
    },

    _refreshUpdatesUI() {
        if (this._section === 'updates') {
            const el = document.getElementById('settings-content');
            if (el) el.innerHTML = this._renderSection();
        }
    },

    _initUpdaterListener() {
        if (typeof window.luxorUpdater !== 'undefined') {
            window.luxorUpdater.onStatus((data) => {
                this._updateState = data;
                this._refreshUpdatesUI();
            });
        }
    },

    _aboutSection() {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> About</h3></div>
                <div class="card-body" style="text-align:center;padding:32px">
                    <img src="assets/logos/luxor.png" alt="Luxor" style="width:80px;height:80px;margin:0 auto 12px;display:block">
                    <h2 style="font-size:20px;font-weight:800;letter-spacing:2px">LUXOR</h2>
                    <p style="color:var(--text-muted);font-size:11px;letter-spacing:1px;margin-bottom:16px">PRODUCTION CONTROLLER</p>
                    <p style="color:var(--text-secondary);font-size:12px">
                        Universal production control platform for live events,<br>
                        broadcast, and AV installations.<br><br>
                        Media Servers: Hippotizer, Resolume Arena, vMix, CasparCG,<br>
                        OBS Studio, Barco E2/S3, QLab, Disguise, Pixera, ATEM<br><br>
                        Production: Power Distribution, Fixture Patch, Truck Packer,<br>
                        Capture Viewer, Equipment Specifications<br><br>
                        LED, PTZ, Network, Lighting, Intercom, 3D Visualization
                    </p>
                    <div class="mt-md" style="font-size:11px;color:var(--text-muted)">
                        <p>Version: 1.5</p>
                    </div>
                </div>
            </div>
        `;
    },

    savePollInterval() {
        const val = parseInt(document.getElementById('poll-interval')?.value) || 3000;
        appState.data.pollInterval = val;
        HippoApp.restartPolling();
        UI.toast(`Poll interval set to ${val}ms`, 'success');
    },

    onActivate() {
        // Set up updater listener
        this._initUpdaterListener();
        // Set up live button updates from Companion
        CompanionAPI._onButtonUpdate = () => {
            if (this._section === 'companion') {
                const el = document.getElementById('settings-content');
                if (el) el.innerHTML = this._renderSection();
            }
        };
        CompanionAPI._onStateChange = () => {
            if (this._section === 'companion') {
                const el = document.getElementById('settings-content');
                if (el) el.innerHTML = this._renderSection();
            }
        };
    },
};
