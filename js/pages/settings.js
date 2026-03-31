/**
 * Settings Page — Application settings, server management, API configuration, Companion
 */
const SettingsPage = {
    _section: 'servers',

    render() {
        return `
            <div class="settings-layout">
                <div class="settings-nav">
                    ${['project','servers','api','companion','display','about'].map(s => `
                        <button class="settings-nav-item ${this._section === s ? 'active' : ''}" onclick="SettingsPage.showSection('${s}')">
                            <i class="fas fa-${
                                s === 'project' ? 'folder-open' :
                                s === 'servers' ? 'server' :
                                s === 'api' ? 'plug' :
                                s === 'companion' ? 'gamepad' :
                                s === 'display' ? 'desktop' : 'info-circle'
                            }"></i>
                            <span>${s === 'api' ? 'API' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
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
        document.querySelectorAll('.settings-nav-item').forEach(b => {
            const label = b.textContent.trim().toLowerCase();
            b.classList.toggle('active', label === s || (s === 'api' && label === 'api'));
        });
    },

    _renderSection() {
        switch (this._section) {
            case 'project': return this._projectSection();
            case 'servers': return this._serversSection();
            case 'api': return this._apiSection();
            case 'companion': return this._companionSection();
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
                        <p>Version: 1.3</p>
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
