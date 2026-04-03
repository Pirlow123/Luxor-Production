/**
 * Intercom Controller — Riedel Bolero / Artist intercom system integration
 * Supports monitoring beltpacks, channels, antenna status, and system configuration
 * Riedel Artist series provides HTTP API for system management
 */
const IntercomPage = {

    // ---- System Database ----
    _systems: [], // { id, name, type: 'bolero', model, ip, connected, lastSeen, status }
    _selectedId: null,
    _isActive: false,
    _pollTimer: null,
    _pollInterval: 2000,

    // Device models
    _models: {
        bolero: ['Bolero Standalone', 'Bolero with Artist 64', 'Bolero with Artist 128', 'Bolero with Artist 1024'],
    },

    // ---- Riedel Artist / Bolero HTTP API ----
    _api: {
        baseUrl: (ip) => `http://${ip}`,

        // System endpoints
        system: {
            info:           { method: 'GET',  path: '/api/system/info' },        // model, firmware, serial, uptime
            status:         { method: 'GET',  path: '/api/system/status' },      // health, temperature, power
            network:        { method: 'GET',  path: '/api/system/network' },     // IP config, DHCP
            reboot:         { method: 'POST', path: '/api/system/reboot' },
            logs:           { method: 'GET',  path: '/api/system/logs' },
        },

        // Beltpack endpoints
        beltpacks: {
            list:           { method: 'GET',  path: '/api/beltpacks' },          // all registered beltpacks
            status:         { method: 'GET',  path: '/api/beltpacks/{id}' },     // battery, signal, channel assignment
            assign:         { method: 'POST', path: '/api/beltpacks/{id}/assign' }, // assign channel/group
            unregister:     { method: 'POST', path: '/api/beltpacks/{id}/unregister' },
        },

        // Channel / Partyline endpoints
        channels: {
            list:           { method: 'GET',  path: '/api/channels' },           // all channels with members
            get:            { method: 'GET',  path: '/api/channels/{id}' },      // channel detail
            create:         { method: 'POST', path: '/api/channels' },
            update:         { method: 'PUT',  path: '/api/channels/{id}' },
            delete:         { method: 'DELETE', path: '/api/channels/{id}' },
        },

        // Antenna / DECT endpoints
        antennas: {
            list:           { method: 'GET',  path: '/api/antennas' },           // all antennas with signal
            status:         { method: 'GET',  path: '/api/antennas/{id}' },
            config:         { method: 'POST', path: '/api/antennas/{id}/config' },
        },

        // Audio / Monitoring
        audio: {
            levels:         { method: 'GET',  path: '/api/audio/levels' },       // real-time audio levels
            mute:           { method: 'POST', path: '/api/audio/mute' },         // mute beltpack
            unmute:         { method: 'POST', path: '/api/audio/unmute' },
            volume:         { method: 'POST', path: '/api/audio/volume' },       // set volume
        },

        // Groups / Conferences
        groups: {
            list:           { method: 'GET',  path: '/api/groups' },
            create:         { method: 'POST', path: '/api/groups' },
            update:         { method: 'PUT',  path: '/api/groups/{id}' },
            delete:         { method: 'DELETE', path: '/api/groups/{id}' },
        },

        // Matrix / Crosspoints (Artist)
        matrix: {
            status:         { method: 'GET',  path: '/api/matrix' },
            setCrosspoint:  { method: 'POST', path: '/api/matrix/crosspoint' },
        },
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        const sys = this._getSelected();
        return `
        <div class="section-header">
            <h2><i class="fas fa-headset"></i> Intercom Systems</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="IntercomPage._reconnectAll()" title="Reconnect all systems"><i class="fas fa-sync-alt"></i> Reconnect</button>
                <button class="btn btn-sm btn-primary" onclick="IntercomPage.showAddSystem()"><i class="fas fa-plus"></i> Add System</button>
            </div>
        </div>

        <div class="ptz-layout">
            <!-- System List Sidebar -->
            <div class="ptz-camera-list">
                <div class="card" style="height:100%">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Systems</h3></div>
                    <div class="card-body" style="padding:0" id="ic-system-list">
                        ${this._renderSystemList()}
                    </div>
                </div>
            </div>

            <!-- Main Control Area -->
            <div class="ptz-controls-area" id="ic-controls">
                ${sys ? this._renderControls(sys) : this._renderNoSystem()}
            </div>
        </div>
        `;
    },

    // ---- System List ----
    _renderSystemList() {
        if (this._systems.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px;font-size:12px">No intercom systems added.<br>Click + Add System to get started.</div>';
        }
        return this._systems.map(s => {
            const sel = s.id === this._selectedId;
            const dot = s.connected ? 'var(--green)' : 'var(--red)';
            return `
                <div class="ptz-cam-card ${sel ? 'selected' : ''}" onclick="IntercomPage.selectSystem('${s.id}')">
                    <div class="flex" style="align-items:center;gap:8px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(s.name)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">Riedel ${UI.esc(s.model)} &bull; ${UI.esc(s.ip)}</div>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation();IntercomPage.removeSystem('${s.id}')" title="Remove"><i class="fas fa-times" style="font-size:10px"></i></button>
                    </div>
                </div>`;
        }).join('');
    },

    _renderNoSystem() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:400px;color:var(--text-muted)">
                <div style="text-align:center">
                    <i class="fas fa-headset" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block"></i>
                    <p>Select an intercom system or add one to get started</p>
                </div>
            </div>`;
    },

    // ---- Main Controls ----
    _renderControls(sys) {
        const st = sys.status || {};
        const sysInfo = st.info || {};
        const sysStatus = st.system || {};
        const beltpacks = st.beltpacks || [];
        const channels = st.channels || [];
        const antennas = st.antennas || [];
        const groups = st.groups || [];
        const matrix = st.matrix || {};

        return `
        <!-- Status Bar -->
        <div class="ptz-status-bar">
            <div class="flex gap-md" style="align-items:center">
                <span style="font-weight:700;font-size:14px">${UI.esc(sys.name)}</span>
                <span class="badge ${sys.connected ? 'badge-success' : 'badge-danger'}">${sys.connected ? 'CONNECTED' : 'OFFLINE'}</span>
                <span class="badge" style="background:var(--bg-tertiary)">Riedel ${UI.esc(sys.model)}</span>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="IntercomPage.refreshSystem('${sys.id}')"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:12px">

            <!-- System Info -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> System Info</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr><td class="text-muted">Model</td><td>${UI.esc(sysInfo.model || sys.model)}</td></tr>
                        <tr><td class="text-muted">Firmware</td><td>${UI.esc(sysInfo.firmware || '--')}</td></tr>
                        <tr><td class="text-muted">Serial</td><td class="mono">${UI.esc(sysInfo.serial || '--')}</td></tr>
                        <tr><td class="text-muted">IP Address</td><td class="mono">${UI.esc(sys.ip)}</td></tr>
                        <tr><td class="text-muted">Uptime</td><td>${this._formatUptime(sysInfo.uptime)}</td></tr>
                    </table>
                </div>
            </div>

            <!-- System Health -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-heartbeat"></i> System Health</h3></div>
                <div class="card-body">
                    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
                        ${this._healthStat('fa-thermometer-half', 'Temperature', sysStatus.temperature ? sysStatus.temperature + '\u00b0C' : '--', sysStatus.temperature > 55 ? 'var(--red)' : sysStatus.temperature > 40 ? 'var(--orange)' : 'var(--green)')}
                        ${this._healthStat('fa-headset', 'Beltpacks', beltpacks.length + ' registered', 'var(--accent)')}
                        ${this._healthStat('fa-broadcast-tower', 'Antennas', antennas.length + ' active', 'var(--cyan)')}
                        ${this._healthStat('fa-comments', 'Channels', channels.length + ' configured', 'var(--purple)')}
                        ${this._healthStat('fa-signal', 'DECT Status', sysStatus.dectStatus || '--', sysStatus.dectStatus === 'OK' ? 'var(--green)' : 'var(--orange)')}
                        ${this._healthStat('fa-bolt', 'Power', sysStatus.powerDraw ? sysStatus.powerDraw + 'W' : '--', 'var(--yellow)')}
                    </div>
                </div>
            </div>

            <!-- Beltpack Status (full width) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header">
                    <h3><i class="fas fa-headset"></i> Beltpacks</h3>
                </div>
                <div class="card-body">
                    ${this._renderBeltpacks(sys, beltpacks)}
                </div>
            </div>

            <!-- Channels / Partylines -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-comments"></i> Channels / Partylines</h3>
                    <button class="btn btn-sm" onclick="IntercomPage.showAddChannel('${sys.id}')"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body">
                    ${this._renderChannels(channels)}
                </div>
            </div>

            <!-- Groups -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-users"></i> Groups</h3>
                    <button class="btn btn-sm" onclick="IntercomPage.showAddGroup('${sys.id}')"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body">
                    ${this._renderGroups(groups)}
                </div>
            </div>

            <!-- Antenna Status (full width) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-broadcast-tower"></i> DECT Antennas</h3></div>
                <div class="card-body">
                    ${this._renderAntennas(antennas)}
                </div>
            </div>

            <!-- Matrix Overview -->
            ${Object.keys(matrix).length > 0 ? `
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-th"></i> Matrix Crosspoints</h3></div>
                <div class="card-body">
                    ${this._renderMatrix(matrix)}
                </div>
            </div>` : ''}

            <!-- System Logs -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-terminal"></i> System Logs</h3></div>
                <div class="card-body" id="ic-device-logs" style="max-height:200px;overflow-y:auto;font-family:var(--font-mono);font-size:11px">
                    ${this._renderLogs(st.logs || [])}
                </div>
            </div>
        </div>
        `;
    },

    // ---- Sub-renderers ----
    _healthStat(icon, label, value, color) {
        return `
            <div class="mini-stat" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center">
                <i class="fas ${icon}" style="color:${color};font-size:16px;margin-bottom:4px;display:block"></i>
                <div style="font-weight:700;font-size:14px;color:${color}">${value}</div>
                <div style="font-size:10px;color:var(--text-muted)">${label}</div>
            </div>`;
    },

    _renderBeltpacks(sys, beltpacks) {
        if (beltpacks.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">No beltpacks registered</div>';
        }
        return `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
                ${beltpacks.map(bp => {
                    const battColor = bp.battery > 60 ? 'var(--green)' : bp.battery > 25 ? 'var(--orange)' : 'var(--red)';
                    const battIcon = bp.battery > 75 ? 'fa-battery-full' : bp.battery > 50 ? 'fa-battery-three-quarters' : bp.battery > 25 ? 'fa-battery-half' : bp.battery > 10 ? 'fa-battery-quarter' : 'fa-battery-empty';
                    const sigBars = Math.ceil((bp.signal || 0) / 25);
                    return `
                        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;border-top:3px solid ${bp.online ? 'var(--green)' : 'var(--red)'}">
                            <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:6px">
                                <span style="font-weight:700;font-size:12px">${UI.esc(bp.name || 'BP ' + bp.id)}</span>
                                <span style="font-size:9px;color:${bp.online ? 'var(--green)' : 'var(--red)'};font-weight:600">${bp.online ? 'ONLINE' : 'OFFLINE'}</span>
                            </div>
                            <div style="font-size:10px;color:var(--text-muted);display:grid;grid-template-columns:1fr 1fr;gap:4px">
                                <div><i class="fas ${battIcon}" style="color:${battColor}"></i> ${bp.battery != null ? bp.battery + '%' : '--'}</div>
                                <div><i class="fas fa-signal" style="color:var(--cyan)"></i> ${bp.signal != null ? bp.signal + '%' : '--'}</div>
                                <div><i class="fas fa-comments"></i> ${UI.esc(bp.channel || '--')}</div>
                                <div>${bp.talking ? '<span style="color:var(--green);font-weight:600"><i class="fas fa-microphone"></i> TALK</span>' : bp.muted ? '<span style="color:var(--red)"><i class="fas fa-microphone-slash"></i> MUTED</span>' : '<i class="fas fa-microphone-slash" style="opacity:0.3"></i> Idle'}</div>
                            </div>
                            <div style="font-size:9px;color:var(--text-muted);margin-top:4px">
                                Serial: ${UI.esc(bp.serial || '--')} &bull; FW: ${UI.esc(bp.firmware || '--')}
                            </div>
                            <div class="flex gap-xs" style="margin-top:6px">
                                <button class="btn btn-xs" style="flex:1;font-size:9px" onclick="IntercomPage.toggleMute('${sys.id}','${bp.id}')">${bp.muted ? 'Unmute' : 'Mute'}</button>
                                <button class="btn btn-xs" style="flex:1;font-size:9px" onclick="IntercomPage.showAssignChannel('${sys.id}','${bp.id}')">Assign</button>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
    },

    _renderChannels(channels) {
        if (channels.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">No channels configured</div>';
        }
        return `
            <table class="data-table" style="font-size:11px">
                <thead><tr><th>CH</th><th>Name</th><th>Type</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    ${channels.map(ch => `
                        <tr>
                            <td style="font-weight:600">${ch.id}</td>
                            <td>${UI.esc(ch.name || '--')}</td>
                            <td><span class="badge" style="font-size:9px;background:${ch.type === 'partyline' ? 'rgba(168,85,247,0.15);color:#a855f7' : 'rgba(59,130,246,0.15);color:#3b82f6'}">${ch.type === 'partyline' ? 'Partyline' : 'Point-to-Point'}</span></td>
                            <td>${ch.members || 0}</td>
                            <td><span style="color:${ch.active ? 'var(--green)' : 'var(--text-muted)'}">${ch.active ? 'Active' : 'Idle'}</span></td>
                            <td>
                                ${ch.id > 1 ? `<button class="btn btn-xs btn-danger" onclick="IntercomPage.deleteChannel('${ch.id}')"><i class="fas fa-trash"></i></button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    _renderGroups(groups) {
        if (groups.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">No groups configured</div>';
        }
        return `
            <table class="data-table" style="font-size:11px">
                <thead><tr><th>Group</th><th>Name</th><th>Members</th><th>Actions</th></tr></thead>
                <tbody>
                    ${groups.map(g => `
                        <tr>
                            <td style="font-weight:600">${g.id}</td>
                            <td>${UI.esc(g.name || '--')}</td>
                            <td>${g.members || 0}</td>
                            <td><button class="btn btn-xs btn-danger" onclick="IntercomPage.deleteGroup('${g.id}')"><i class="fas fa-trash"></i></button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    _renderAntennas(antennas) {
        if (antennas.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">No antennas detected</div>';
        }
        return `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
                ${antennas.map(ant => {
                    const sigColor = ant.signal > 75 ? 'var(--green)' : ant.signal > 40 ? 'var(--orange)' : 'var(--red)';
                    return `
                        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;border-top:3px solid ${ant.online ? 'var(--green)' : 'var(--red)'}">
                            <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:4px">
                                <span style="font-weight:700;font-size:11px"><i class="fas fa-broadcast-tower" style="color:var(--cyan)"></i> ${UI.esc(ant.name || 'ANT ' + ant.id)}</span>
                                <div style="width:8px;height:8px;border-radius:50%;background:${ant.online ? 'var(--green)' : 'var(--red)'}"></div>
                            </div>
                            <div style="font-size:10px;color:var(--text-muted)">
                                <div>Signal: <span style="color:${sigColor};font-weight:600">${ant.signal != null ? ant.signal + '%' : '--'}</span></div>
                                <div>Frequency: ${UI.esc(ant.frequency || '--')}</div>
                                <div>Clients: ${ant.clients ?? '--'}</div>
                                <div>Location: ${UI.esc(ant.location || '--')}</div>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
    },

    _renderMatrix(matrix) {
        const sources = matrix.sources || [];
        const destinations = matrix.destinations || [];
        const crosspoints = matrix.crosspoints || [];
        if (sources.length === 0 || destinations.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">Matrix data not available</div>';
        }
        return `
            <div style="overflow-x:auto">
                <table style="font-size:10px;border-collapse:collapse;min-width:${(sources.length + 1) * 60}px">
                    <thead>
                        <tr>
                            <th style="padding:4px;border:1px solid var(--border);background:var(--bg-tertiary);min-width:80px"></th>
                            ${sources.map(s => `<th style="padding:4px;border:1px solid var(--border);background:var(--bg-tertiary);writing-mode:vertical-lr;text-align:center;min-width:30px">${UI.esc(s.name || s.id)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${destinations.map(d => `
                            <tr>
                                <td style="padding:4px;border:1px solid var(--border);background:var(--bg-tertiary);font-weight:600">${UI.esc(d.name || d.id)}</td>
                                ${sources.map(s => {
                                    const cp = crosspoints.find(c => c.src === s.id && c.dst === d.id);
                                    const active = cp && cp.level > 0;
                                    return `<td style="padding:4px;border:1px solid var(--border);text-align:center;background:${active ? 'rgba(74,222,128,0.15)' : 'transparent'};cursor:pointer" onclick="IntercomPage.toggleCrosspoint('${s.id}','${d.id}')">${active ? '<i class="fas fa-circle" style="font-size:8px;color:var(--green)"></i>' : ''}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    _renderLogs(logs) {
        if (logs.length === 0) return '<div class="text-muted" style="text-align:center;padding:8px">No system logs</div>';
        return logs.map(l => `<div class="log-line" style="padding:2px 0"><span style="color:var(--text-muted)">${l.time || ''}</span> <span style="color:${l.level === 'error' ? 'var(--red)' : l.level === 'warn' ? 'var(--orange)' : 'var(--text-secondary)'}">${UI.esc(l.message || '')}</span></div>`).join('');
    },

    // ---- Helpers ----
    _formatUptime(sec) {
        if (!sec || sec <= 0) return '--';
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    },

    // ============================================================
    // ADD / REMOVE SYSTEMS
    // ============================================================
    showAddSystem() {
        const html = `
            <div style="min-width:380px">
                <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:14px;margin-bottom:20px;text-align:center;">
                    <div style="font-size:12px;color:#10b981;font-weight:700;margin-bottom:6px;letter-spacing:0.5px;"><i class="fas fa-flask"></i> DEMO MODE</div>
                    <p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">No hardware? Try a virtual Bolero with realistic data.</p>
                    <button class="btn btn-sm" style="border-color:rgba(16,185,129,0.4);color:#10b981" onclick="UI.closeModal();IntercomPage.addVirtualSystem()"><i class="fas fa-plus"></i> Create Virtual Bolero</button>
                </div>
                <div class="form-group">
                    <label>System Name</label>
                    <input class="form-control" id="ic-add-name" placeholder="e.g. FOH Bolero">
                </div>
                <div class="form-group">
                    <label>System Type</label>
                    <select class="form-control" id="ic-add-type">
                        <option value="bolero">Riedel Bolero</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Configuration</label>
                    <select class="form-control" id="ic-add-model">
                        ${this._models.bolero.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>IP Address (Artist / Bolero Antenna)</label>
                    <input class="form-control" id="ic-add-ip" placeholder="192.168.1.100">
                </div>
            </div>`;
        UI.openModal('Add Intercom System', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="IntercomPage._confirmAddSystem()">Add System</button>`);
    },

    _confirmAddSystem() {
        const name = document.getElementById('ic-add-name')?.value?.trim();
        const type = document.getElementById('ic-add-type')?.value;
        const model = document.getElementById('ic-add-model')?.value;
        const ip = document.getElementById('ic-add-ip')?.value?.trim();
        if (!name || !ip) return UI.toast('Name and IP are required', 'error');
        UI.closeModal();
        this.addSystem({ name, type, model, ip });
    },

    addSystem(cfg) {
        const sys = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: cfg.name,
            type: cfg.type || 'bolero',
            model: cfg.model || 'Bolero Standalone',
            ip: cfg.ip,
            connected: false,
            lastSeen: null,
            status: {},
        };
        this._systems.push(sys);
        this._saveSystems();
        this._selectedId = sys.id;
        this._refreshAll();
        this._checkConnection(sys);
        UI.toast(`Intercom "${sys.name}" added`, 'success');
        appState.log('INFO', `Intercom system added: ${sys.name} (${sys.model} @ ${sys.ip})`, 'Intercom');
        this.renderSidebarList();
    },

    removeSystem(id) {
        const sys = this._systems.find(s => s.id === id);
        if (!sys) return;
        UI.openModal('Remove Intercom', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(sys.name)}</strong>?</p>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" onclick="IntercomPage._confirmRemoveSystem('${id}')">Remove</button>`);
    },

    _confirmRemoveSystem(id) {
        UI.closeModal();
        const sys = this._systems.find(s => s.id === id);
        this._systems = this._systems.filter(s => s.id !== id);
        if (this._selectedId === id) this._selectedId = this._systems[0]?.id || null;
        this._saveSystems();
        this._refreshAll();
        this.renderSidebarList();
        UI.toast(`Intercom "${sys?.name}" removed`, 'info');
        appState.log('INFO', `Intercom system removed: ${sys?.name}`, 'Intercom');
    },

    async selectSystem(id) {
        this._selectedId = id;
        this._refreshAll();
        const sys = this._getSelected();
        if (sys && !sys.virtual) {
            await this._checkConnection(sys);
            if (sys.connected) await this.refreshSystem(sys.id);
        }
    },

    _getSelected() {
        return this._systems.find(s => s.id === this._selectedId) || null;
    },

    // ---- Persistence ----
    _saveSystems() {
        const real = this._systems.filter(s => !s.virtual).map(s => ({ id: s.id, name: s.name, type: s.type, model: s.model, ip: s.ip }));
        try { localStorage.setItem('luxor_intercom_systems', JSON.stringify(real)); } catch {}
        const virt = this._systems.filter(s => s.virtual);
        try { localStorage.setItem('luxor_intercom_systems_virtual', JSON.stringify(virt)); } catch {}
    },

    _loadSystems() {
        try {
            const d = JSON.parse(localStorage.getItem('luxor_intercom_systems') || '[]');
            this._systems = d.map(s => ({ ...s, connected: false, lastSeen: null, status: {} }));
            const virt = JSON.parse(localStorage.getItem('luxor_intercom_systems_virtual') || '[]');
            virt.forEach(v => { if (!this._systems.find(s => s.id === v.id)) this._systems.push({ ...v, connected: true }); });
            if (this._systems.length > 0 && !this._selectedId) this._selectedId = this._systems[0].id;
        } catch { this._systems = []; }
    },

    // ============================================================
    // API COMMUNICATION
    // ============================================================
    async _apiCall(sys, section, endpoint, body) {
        const ep = this._api[section]?.[endpoint];
        if (!ep) return null;
        let path = ep.path;
        if (body?.id) { path = path.replace('{id}', body.id); delete body.id; }
        const url = `${this._api.baseUrl(sys.ip)}${path}`;
        try {
            const opts = { method: ep.method, signal: AbortSignal.timeout(3000) };
            if (body && (ep.method === 'POST' || ep.method === 'PUT')) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(body);
            }
            const resp = await fetch(url, opts);
            const text = await resp.text();
            sys.connected = true;
            sys.lastSeen = Date.now();
            try { return JSON.parse(text); } catch { return text; }
        } catch (e) {
            sys.connected = false;
            return null;
        }
    },

    async _checkConnection(sys) {
        const info = await this._apiCall(sys, 'system', 'info');
        sys.connected = info !== null;
        if (info) sys.status.info = info;
        this._updateList();
    },

    async refreshSystem(id) {
        const sys = this._systems.find(s => s.id === id);
        if (!sys) return;
        const [info, status, beltpacks, channels, antennas, groups, matrix, logs] = await Promise.allSettled([
            this._apiCall(sys, 'system', 'info'),
            this._apiCall(sys, 'system', 'status'),
            this._apiCall(sys, 'beltpacks', 'list'),
            this._apiCall(sys, 'channels', 'list'),
            this._apiCall(sys, 'antennas', 'list'),
            this._apiCall(sys, 'groups', 'list'),
            this._apiCall(sys, 'matrix', 'status'),
            this._apiCall(sys, 'system', 'logs'),
        ]);
        sys.status = {
            info: info.value || sys.status.info || {},
            system: status.value || {},
            beltpacks: beltpacks.value || [],
            channels: channels.value || [],
            antennas: antennas.value || [],
            groups: groups.value || [],
            matrix: matrix.value || {},
            logs: logs.value || [],
        };
        this._refreshAll();
    },

    // ---- Actions ----
    async toggleMute(sysId, bpId) {
        const sys = this._systems.find(s => s.id === sysId);
        if (!sys) return;
        const bp = (sys.status.beltpacks || []).find(b => b.id === bpId);
        if (!bp) return;
        const action = bp.muted ? 'unmute' : 'mute';
        await this._apiCall(sys, 'audio', action, { id: bpId });
        bp.muted = !bp.muted;
        UI.toast(`Beltpack ${bp.name || bpId} ${action}d`, 'info');
        this._refreshAll();
    },

    showAssignChannel(sysId, bpId) {
        const sys = this._systems.find(s => s.id === sysId);
        if (!sys) return;
        const channels = sys.status.channels || [];
        UI.openModal('Assign Channel', `
            <div class="form-group">
                <label>Channel</label>
                <select class="form-control" id="ic-assign-ch">
                    ${channels.map(ch => `<option value="${ch.id}">${ch.id} - ${UI.esc(ch.name || 'Channel ' + ch.id)}</option>`).join('')}
                </select>
            </div>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="IntercomPage._confirmAssign('${sysId}','${bpId}')">Assign</button>`);
    },

    async _confirmAssign(sysId, bpId) {
        const ch = document.getElementById('ic-assign-ch')?.value;
        UI.closeModal();
        const sys = this._systems.find(s => s.id === sysId);
        if (!sys) return;
        await this._apiCall(sys, 'beltpacks', 'assign', { id: bpId, channel: ch });
        UI.toast(`Beltpack assigned to channel ${ch}`, 'info');
        this.refreshSystem(sysId);
    },

    showAddChannel(sysId) {
        UI.openModal('Add Channel', `
            <div class="form-group"><label>Channel Name</label><input class="form-control" id="ic-ch-name" placeholder="e.g. Stage Manager"></div>
            <div class="form-group"><label>Type</label>
                <select class="form-control" id="ic-ch-type">
                    <option value="partyline">Partyline</option>
                    <option value="p2p">Point-to-Point</option>
                </select>
            </div>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="IntercomPage._confirmAddChannel('${sysId}')">Create</button>`);
    },

    async _confirmAddChannel(sysId) {
        const name = document.getElementById('ic-ch-name')?.value?.trim();
        const type = document.getElementById('ic-ch-type')?.value;
        if (!name) return UI.toast('Channel name is required', 'error');
        UI.closeModal();
        const sys = this._systems.find(s => s.id === sysId);
        if (!sys) return;
        await this._apiCall(sys, 'channels', 'create', { name, type });
        UI.toast(`Channel "${name}" created`, 'success');
        this.refreshSystem(sysId);
    },

    async deleteChannel(chId) {
        const sys = this._getSelected();
        if (!sys) return;
        await this._apiCall(sys, 'channels', 'delete', { id: chId });
        UI.toast(`Channel ${chId} deleted`, 'info');
        this.refreshSystem(sys.id);
    },

    showAddGroup(sysId) {
        UI.openModal('Add Group', `
            <div class="form-group"><label>Group Name</label><input class="form-control" id="ic-grp-name" placeholder="e.g. Camera Ops"></div>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="IntercomPage._confirmAddGroup('${sysId}')">Create</button>`);
    },

    async _confirmAddGroup(sysId) {
        const name = document.getElementById('ic-grp-name')?.value?.trim();
        if (!name) return UI.toast('Group name is required', 'error');
        UI.closeModal();
        const sys = this._systems.find(s => s.id === sysId);
        if (!sys) return;
        await this._apiCall(sys, 'groups', 'create', { name });
        UI.toast(`Group "${name}" created`, 'success');
        this.refreshSystem(sysId);
    },

    async deleteGroup(grpId) {
        const sys = this._getSelected();
        if (!sys) return;
        await this._apiCall(sys, 'groups', 'delete', { id: grpId });
        UI.toast(`Group ${grpId} deleted`, 'info');
        this.refreshSystem(sys.id);
    },

    async toggleCrosspoint(srcId, dstId) {
        const sys = this._getSelected();
        if (!sys) return;
        await this._apiCall(sys, 'matrix', 'setCrosspoint', { src: srcId, dst: dstId });
        UI.toast(`Crosspoint ${srcId} \u2192 ${dstId} toggled`, 'info');
        this.refreshSystem(sys.id);
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    renderSidebarList() {
        const container = document.getElementById('intercom-list');
        if (!container) return;
        if (this._systems.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = this._systems.map(s => {
            const dot = s.connected ? '#4ade80' : '#ef4444';
            return `
                <div class="sidebar-device-card" onclick="IntercomPage.selectSystem('${s.id}');HippoApp.navigate('intercom')">
                    <span class="device-dot" style="background:${dot}"></span>
                    <div class="device-info">
                        <div class="device-name">${UI.esc(s.name)}</div>
                        <div class="device-sub">Riedel ${UI.esc(s.model)}</div>
                    </div>
                    <button class="device-remove" onclick="event.stopPropagation();IntercomPage.removeSystem('${s.id}')" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
        }).join('');
    },

    initSidebar() {
        this._loadSystems();
        this._initVirtualDemo();
        this.renderSidebarList();
    },

    _initVirtualDemo() {
        // No auto-spawn — virtual demos are created manually via Add Intercom dialog
    },

    addVirtualSystem() {
        const id = 'virtual-bolero-' + Date.now().toString(36);
        const sys = {
            id,
            name: 'Virtual Bolero (Demo)',
            type: 'bolero',
            model: 'Bolero with Artist 64',
            ip: '192.168.1.100',
            connected: true,
            virtual: true,
            lastSeen: Date.now(),
            status: {
                info: { model: 'Bolero with Artist 64', firmware: '2.5.1', serial: 'RDL-BOL-A64-00891', uptime: 259200 },
                system: { temperature: 38, dectStatus: 'OK', powerDraw: 45 },
                beltpacks: [
                    { id:'BP1',name:'Stage Manager',serial:'BP-10042',firmware:'2.5.1',online:true,battery:92,signal:95,channel:'CH1 - Production',talking:false,muted:false },
                    { id:'BP2',name:'Lighting Op',serial:'BP-10043',firmware:'2.5.1',online:true,battery:78,signal:88,channel:'CH1 - Production',talking:true,muted:false },
                    { id:'BP3',name:'Camera 1',serial:'BP-10044',firmware:'2.5.1',online:true,battery:65,signal:82,channel:'CH2 - Cameras',talking:false,muted:false },
                    { id:'BP4',name:'Camera 2',serial:'BP-10045',firmware:'2.5.1',online:true,battery:43,signal:76,channel:'CH2 - Cameras',talking:false,muted:true },
                    { id:'BP5',name:'Audio A1',serial:'BP-10046',firmware:'2.5.1',online:true,battery:88,signal:91,channel:'CH3 - Audio',talking:false,muted:false },
                    { id:'BP6',name:'Floor Manager',serial:'BP-10047',firmware:'2.5.1',online:true,battery:55,signal:70,channel:'CH1 - Production',talking:false,muted:false },
                    { id:'BP7',name:'Graphics Op',serial:'BP-10048',firmware:'2.5.1',online:true,battery:97,signal:94,channel:'CH4 - Graphics',talking:false,muted:false },
                    { id:'BP8',name:'Spare 1',serial:'BP-10049',firmware:'2.5.1',online:false,battery:12,signal:0,channel:'--',talking:false,muted:false },
                ],
                channels: [
                    { id:1,name:'Production',type:'partyline',members:4,active:true },
                    { id:2,name:'Cameras',type:'partyline',members:2,active:true },
                    { id:3,name:'Audio',type:'partyline',members:1,active:true },
                    { id:4,name:'Graphics',type:'partyline',members:1,active:true },
                    { id:5,name:'SM Private',type:'p2p',members:2,active:false },
                ],
                antennas: [
                    { id:1,name:'ANT-1 Stage Left',online:true,signal:95,frequency:'1.88 GHz',clients:3,location:'Stage Left Truss' },
                    { id:2,name:'ANT-2 Stage Right',online:true,signal:88,frequency:'1.88 GHz',clients:3,location:'Stage Right Truss' },
                    { id:3,name:'ANT-3 FOH',online:true,signal:92,frequency:'1.89 GHz',clients:2,location:'FOH Position' },
                ],
                groups: [
                    { id:1,name:'All Crew',members:7 },
                    { id:2,name:'Camera Ops',members:2 },
                    { id:3,name:'Tech Team',members:4 },
                ],
                matrix: {
                    sources: [
                        { id:'BP1',name:'SM' },{ id:'BP2',name:'Lighting' },{ id:'BP3',name:'Cam 1' },
                        { id:'BP4',name:'Cam 2' },{ id:'BP5',name:'Audio' },{ id:'BP6',name:'Floor' },{ id:'BP7',name:'GFX' },
                    ],
                    destinations: [
                        { id:'CH1',name:'Production' },{ id:'CH2',name:'Cameras' },{ id:'CH3',name:'Audio' },{ id:'CH4',name:'Graphics' },
                    ],
                    crosspoints: [
                        { src:'BP1',dst:'CH1',level:100 },{ src:'BP2',dst:'CH1',level:100 },{ src:'BP6',dst:'CH1',level:100 },
                        { src:'BP3',dst:'CH2',level:100 },{ src:'BP4',dst:'CH2',level:100 },{ src:'BP1',dst:'CH2',level:80 },
                        { src:'BP5',dst:'CH3',level:100 },{ src:'BP1',dst:'CH3',level:60 },
                        { src:'BP7',dst:'CH4',level:100 },{ src:'BP1',dst:'CH4',level:70 },
                    ],
                },
                logs: [
                    { time:'15:12:03',level:'info',message:'BP2 (Lighting Op) talk key activated on CH1' },
                    { time:'15:10:45',level:'info',message:'BP4 (Camera 2) muted by operator' },
                    { time:'15:08:21',level:'warn',message:'BP8 (Spare 1) low battery warning (12%)' },
                    { time:'15:05:00',level:'info',message:'ANT-3 (FOH) DECT sync established' },
                    { time:'14:45:00',level:'info',message:'System started, firmware 2.5.1' },
                ],
            },
        };
        this._systems.push(sys);
        this._saveSystems();
        this._selectedId = id;
        this._refreshAll();
        this.renderSidebarList();
        UI.toast('Virtual Bolero created', 'success');
    },

    // ============================================================
    // POLLING / LIFECYCLE
    // ============================================================
    async _reconnectAll() {
        UI.toast('Reconnecting all intercom systems...', 'info');
        for (const sys of this._systems) {
            if (!sys.virtual) await this._checkConnection(sys);
        }
        this._refreshAll();
        const online = this._systems.filter(s => s.connected).length;
        UI.toast(`${online}/${this._systems.length} systems connected`, online > 0 ? 'success' : 'error');
    },

    _startPolling() {
        if (!this._pollTimer) {
            this._pollTimer = setInterval(() => this._pollAll(), this._pollInterval);
        }
    },

    _stopPolling() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    },

    _pollCount: 0,

    async _pollAll() {
        this._pollCount++;
        for (const sys of this._systems) {
            if (sys.virtual) continue;
            await this._checkConnection(sys);
            // Full data refresh every 5th poll for the selected system
            if (sys.connected && sys.id === this._selectedId && this._pollCount % 5 === 0) {
                await this.refreshSystem(sys.id);
            }
        }
    },

    _updateList() {
        if (this._isActive) {
            const list = document.getElementById('ic-system-list');
            if (list) list.innerHTML = this._renderSystemList();
        }
        this.renderSidebarList();
    },

    _refreshAll() {
        const list = document.getElementById('ic-system-list');
        const controls = document.getElementById('ic-controls');
        if (list) list.innerHTML = this._renderSystemList();
        const sys = this._getSelected();
        if (controls) controls.innerHTML = sys ? this._renderControls(sys) : this._renderNoSystem();
        this.renderSidebarList();
    },

    onActivate() {
        this._isActive = true;
        this._loadSystems();
        this._initVirtualDemo();
        this._startPolling();
        this.renderSidebarList();
        // Immediately fetch full data for the selected system
        const sys = this._getSelected();
        if (sys && !sys.virtual) {
            this._checkConnection(sys).then(() => {
                if (sys.connected) this.refreshSystem(sys.id);
            });
        }
    },

    onDeactivate() {
        this._isActive = false;
        // Timer keeps running in background
    },
};
