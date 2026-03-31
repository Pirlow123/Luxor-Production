/**
 * Settings Page — Application settings, server management, API configuration
 */
const SettingsPage = {
    _section: 'servers',

    render() {
        return `
            <div class="settings-layout">
                <div class="settings-nav">
                    ${['project','servers','api','display','about'].map(s => `
                        <button class="settings-nav-item ${this._section === s ? 'active' : ''}" onclick="SettingsPage.showSection('${s}')">
                            <i class="fas fa-${s === 'project' ? 'folder-open' : s === 'servers' ? 'server' : s === 'api' ? 'plug' : s === 'display' ? 'desktop' : 'info-circle'}"></i>
                            <span>${s.charAt(0).toUpperCase() + s.slice(1)}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="settings-content" id="settings-content">
                    ${this._renderSection()}
                </div>
            </div>
        `;
    },

    showSection(s) {
        this._section = s;
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
        document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase() === s));
    },

    _renderSection() {
        switch (this._section) {
            case 'project': return this._projectSection();
            case 'servers': return this._serversSection();
            case 'api': return this._apiSection();
            case 'display': return this._displaySection();
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

    _displaySection() {
        const vis = SettingsPage._getSidebarVisibility();
        const order = SettingsPage._getSidebarOrder();
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-desktop"></i> Display Settings</h3></div>
                <div class="card-body">
                    <div class="form-inline mb-md">
                        <span style="font-size:12px">Collapsed Sidebar</span>
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
        `;
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
            };
        } catch {
            return { engines: true, ledProcessors: true, cameras: true, switches: true, consoles: true, intercom: true };
        }
    },

    _toggleSidebarSection(key) {
        const vis = this._getSidebarVisibility();
        vis[key] = !vis[key];
        try { localStorage.setItem('luxor_sidebar_visibility', JSON.stringify(vis)); } catch {}
        HippoApp.applySidebarVisibility();
        // Re-render to update toggle state
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
        // Swap
        [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
        try { localStorage.setItem('luxor_sidebar_order', JSON.stringify(order)); } catch {}
        HippoApp.applySidebarVisibility();
        // Re-render settings to update button states
        const el = document.getElementById('settings-content');
        if (el) el.innerHTML = this._renderSection();
    },

    _aboutSection() {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> About</h3></div>
                <div class="card-body" style="text-align:center;padding:32px">
                    <img src="assets/logos/luxor.png" alt="Luxor" style="width:80px;height:80px;margin:0 auto 12px;display:block">
                    <h2 style="font-size:20px;font-weight:800;letter-spacing:2px">LUXOR</h2>
                    <p style="color:var(--text-muted);font-size:11px;letter-spacing:1px;margin-bottom:16px">MEDIA CONTROLLER</p>
                    <p style="color:var(--text-secondary);font-size:12px">
                        Universal media server control platform.<br>
                        Supports Hippotizer, Resolume Arena, vMix, CasparCG, OBS Studio,<br>
                        Barco E2/S3, QLab, Disguise, and Pixera.<br>
                        LED Processors: Novastar, Megapixel Helios, Brompton Tessera.<br>
                        Includes PIXL Grid test pattern generator.
                    </p>
                    <div class="mt-md" style="font-size:11px;color:var(--text-muted)">
                        <p>API Version: 1.2</p>
                        <p>Luxor Version: 1.1</p>
                    </div>
                    <div style="margin-top:16px;padding:8px 16px;background:rgba(74,184,224,0.1);border:1px solid rgba(74,184,224,0.3);border-radius:var(--radius-md);display:inline-block">
                        <span style="color:#4CB5E0;font-size:11px;font-weight:600;letter-spacing:0.5px"><i class="fas fa-wrench"></i> WORK IN PROGRESS</span>
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

    onActivate() {},
};
