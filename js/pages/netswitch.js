/**
 * Network Switch Controller — Luminex GigaCore / LumiNode / Cameo XNode monitoring & configuration
 * Supports full REST API for port status, VLANs, PoE, system health, DMX routing
 */
const NetSwitchPage = {

    // ---- Switch Database ----
    _switches: [], // { id, name, type, model, ip, connected, lastSeen, status }
    _selectedId: null,
    _isActive: false,
    _pollTimer: null,
    _pollInterval: 3000,

    // Device models
    _models: {
        gigacore: ['GigaCore 10', 'GigaCore 12', 'GigaCore 14R', 'GigaCore 16t', 'GigaCore 16Xt', 'GigaCore 16RFO', 'GigaCore 26i', 'GigaCore 30i'],
        luminode: ['LumiNode 1', 'LumiNode 2', 'LumiNode 4', 'LumiNode 12', 'LumiNode MX40'],
        cameo: ['XNode 4', 'XNode 8'],
    },

    // ---- Luminex REST API ----
    _api: {
        baseUrl: (ip) => `http://${ip}`,

        // System endpoints
        system: {
            info:           { method: 'GET',  path: '/api/system/info' },       // model, firmware, serial, uptime, mac
            status:         { method: 'GET',  path: '/api/system/status' },     // temperature, fans, power, cpu
            reboot:         { method: 'POST', path: '/api/system/reboot' },
            factoryReset:   { method: 'POST', path: '/api/system/factory-reset' },
            hostname:       { method: 'GET',  path: '/api/system/hostname' },
            setHostname:    { method: 'POST', path: '/api/system/hostname' },
            firmware:       { method: 'GET',  path: '/api/system/firmware' },
            time:           { method: 'GET',  path: '/api/system/time' },
            logs:           { method: 'GET',  path: '/api/system/logs' },
        },

        // Port endpoints
        ports: {
            list:           { method: 'GET',  path: '/api/ports' },            // all ports with status
            status:         { method: 'GET',  path: '/api/ports/{id}/status' }, // link, speed, duplex, traffic
            config:         { method: 'GET',  path: '/api/ports/{id}/config' }, // vlan, speed setting, enabled
            setConfig:      { method: 'POST', path: '/api/ports/{id}/config' },
            stats:          { method: 'GET',  path: '/api/ports/{id}/stats' }, // tx/rx bytes, packets, errors
            enable:         { method: 'POST', path: '/api/ports/{id}/enable' },
            disable:        { method: 'POST', path: '/api/ports/{id}/disable' },
            resetCounters:  { method: 'POST', path: '/api/ports/{id}/reset-counters' },
        },

        // PoE endpoints
        poe: {
            status:         { method: 'GET',  path: '/api/poe' },              // global PoE status
            portStatus:     { method: 'GET',  path: '/api/poe/{id}' },         // per-port PoE
            portConfig:     { method: 'POST', path: '/api/poe/{id}' },         // enable/disable, priority
            budget:         { method: 'GET',  path: '/api/poe/budget' },       // total budget, used, available
        },

        // VLAN endpoints
        vlans: {
            list:           { method: 'GET',  path: '/api/vlans' },
            get:            { method: 'GET',  path: '/api/vlans/{id}' },
            create:         { method: 'POST', path: '/api/vlans' },
            update:         { method: 'PUT',  path: '/api/vlans/{id}' },
            delete:         { method: 'DELETE', path: '/api/vlans/{id}' },
        },

        // Network protocol endpoints
        network: {
            igmp:           { method: 'GET',  path: '/api/network/igmp' },
            setIgmp:        { method: 'POST', path: '/api/network/igmp' },
            stp:            { method: 'GET',  path: '/api/network/stp' },
            setStp:         { method: 'POST', path: '/api/network/stp' },
            lldp:           { method: 'GET',  path: '/api/network/lldp' },     // neighbor discovery
            multicast:      { method: 'GET',  path: '/api/network/multicast' },
        },

        // DMX/Protocol endpoints (LumiNode)
        dmx: {
            ports:          { method: 'GET',  path: '/api/dmx/ports' },
            portConfig:     { method: 'GET',  path: '/api/dmx/{id}/config' },
            setPortConfig:  { method: 'POST', path: '/api/dmx/{id}/config' },  // universe, protocol, direction
            merge:          { method: 'GET',  path: '/api/dmx/merge' },
            setMerge:       { method: 'POST', path: '/api/dmx/merge' },
        },

        // Presets / Groups
        presets: {
            list:           { method: 'GET',  path: '/api/presets' },
            recall:         { method: 'POST', path: '/api/presets/{id}/recall' },
            store:          { method: 'POST', path: '/api/presets/{id}/store' },
            delete:         { method: 'DELETE', path: '/api/presets/{id}' },
        },
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        const sw = this._getSelected();
        return `
        <div class="section-header">
            <h2><i class="fas fa-network-wired"></i> Network Switches</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="NetSwitchPage._reconnectAll()" title="Reconnect all switches"><i class="fas fa-sync-alt"></i> Reconnect</button>
                <button class="btn btn-sm btn-primary" onclick="NetSwitchPage.showAddSwitch()"><i class="fas fa-plus"></i> Add Switch</button>
            </div>
        </div>

        <div class="ptz-layout">
            <!-- Switch List Sidebar -->
            <div class="ptz-camera-list">
                <div class="card" style="height:100%">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Devices</h3></div>
                    <div class="card-body" style="padding:0" id="ns-switch-list">
                        ${this._renderSwitchList()}
                    </div>
                </div>
            </div>

            <!-- Main Control Area -->
            <div class="ptz-controls-area" id="ns-controls">
                ${sw ? this._renderControls(sw) : this._renderNoSwitch()}
            </div>
        </div>
        `;
    },

    // ---- Switch List ----
    _renderSwitchList() {
        if (this._switches.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px;font-size:12px">No switches added.<br>Click + Add Switch to get started.</div>';
        }
        return this._switches.map(s => {
            const sel = s.id === this._selectedId;
            const dot = s.connected ? 'var(--green)' : 'var(--red)';
            const typeLabel = s.type === 'luminode' ? 'LumiNode' : s.type === 'cameo' ? 'Cameo' : 'GigaCore';
            return `
                <div class="ptz-cam-card ${sel ? 'selected' : ''}" onclick="NetSwitchPage.selectSwitch('${s.id}')">
                    <div class="flex" style="align-items:center;gap:8px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(s.name)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">${typeLabel} ${UI.esc(s.model)} &bull; ${UI.esc(s.ip)}</div>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation();NetSwitchPage.removeSwitch('${s.id}')" title="Remove"><i class="fas fa-times" style="font-size:10px"></i></button>
                    </div>
                </div>`;
        }).join('');
    },

    _renderNoSwitch() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:400px;color:var(--text-muted)">
                <div style="text-align:center">
                    <i class="fas fa-network-wired" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block"></i>
                    <p>Select a switch or add one to get started</p>
                </div>
            </div>`;
    },

    // ---- Main Controls ----
    _renderControls(sw) {
        const st = sw.status || {};
        const sysInfo = st.info || {};
        const sysStatus = st.system || {};
        const ports = st.ports || [];
        const poe = st.poe || {};
        const vlans = st.vlans || [];
        const isLumiNode = sw.type === 'luminode';

        return `
        <!-- Status Bar -->
        <div class="ptz-status-bar">
            <div class="flex gap-md" style="align-items:center">
                <span style="font-weight:700;font-size:14px">${UI.esc(sw.name)}</span>
                <span class="badge ${sw.connected ? 'badge-success' : 'badge-danger'}">${sw.connected ? 'CONNECTED' : 'OFFLINE'}</span>
                <span class="badge" style="background:var(--bg-tertiary)">${sw.type === 'luminode' ? 'LumiNode' : 'GigaCore'} ${UI.esc(sw.model)}</span>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="NetSwitchPage.refreshSwitch('${sw.id}')"><i class="fas fa-sync-alt"></i> Refresh</button>
                <button class="btn btn-sm btn-danger" onclick="NetSwitchPage.rebootSwitch('${sw.id}')"><i class="fas fa-power-off"></i> Reboot</button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:12px">

            <!-- System Info -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> System Info</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr><td class="text-muted">Model</td><td>${UI.esc(sysInfo.model || sw.model)}</td></tr>
                        <tr><td class="text-muted">Firmware</td><td>${UI.esc(sysInfo.firmware || '--')}</td></tr>
                        <tr><td class="text-muted">Serial</td><td>${UI.esc(sysInfo.serial || '--')}</td></tr>
                        <tr><td class="text-muted">MAC Address</td><td>${UI.esc(sysInfo.mac || '--')}</td></tr>
                        <tr><td class="text-muted">IP Address</td><td>${UI.esc(sw.ip)}</td></tr>
                        <tr><td class="text-muted">Hostname</td><td>${UI.esc(sysInfo.hostname || '--')}</td></tr>
                        <tr><td class="text-muted">Uptime</td><td>${this._formatUptime(sysInfo.uptime)}</td></tr>
                    </table>
                </div>
            </div>

            <!-- System Health -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-heartbeat"></i> System Health</h3></div>
                <div class="card-body">
                    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
                        ${this._healthStat('fa-thermometer-half', 'Temperature', sysStatus.temperature ? sysStatus.temperature + '°C' : '--', sysStatus.temperature > 60 ? 'var(--red)' : sysStatus.temperature > 45 ? 'var(--orange)' : 'var(--green)')}
                        ${this._healthStat('fa-fan', 'Fan Speed', sysStatus.fanSpeed ? sysStatus.fanSpeed + ' RPM' : '--', 'var(--cyan)')}
                        ${this._healthStat('fa-microchip', 'CPU Usage', sysStatus.cpu ? sysStatus.cpu + '%' : '--', sysStatus.cpu > 80 ? 'var(--red)' : 'var(--green)')}
                        ${this._healthStat('fa-memory', 'Memory', sysStatus.memory ? sysStatus.memory + '%' : '--', 'var(--accent)')}
                        ${this._healthStat('fa-bolt', 'Power', sysStatus.powerDraw ? sysStatus.powerDraw + 'W' : '--', 'var(--yellow)')}
                        ${this._healthStat('fa-clock', 'Uptime', this._formatUptime(sysInfo.uptime), 'var(--text-muted)')}
                    </div>
                </div>
            </div>

            <!-- Port Status Grid (full width) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header">
                    <h3><i class="fas fa-ethernet"></i> Port Status</h3>
                    <div class="flex gap-sm">
                        <button class="btn btn-sm" onclick="NetSwitchPage._resetAllCounters('${sw.id}')"><i class="fas fa-undo"></i> Reset Counters</button>
                    </div>
                </div>
                <div class="card-body">
                    ${this._renderPortGrid(sw, ports)}
                </div>
            </div>

            <!-- PoE Status -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> PoE Status</h3></div>
                <div class="card-body">
                    ${this._renderPoE(poe, ports)}
                </div>
            </div>

            <!-- VLANs -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-project-diagram"></i> VLANs</h3>
                    <button class="btn btn-sm" onclick="NetSwitchPage.showAddVlan('${sw.id}')"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body">
                    ${this._renderVlans(vlans)}
                </div>
            </div>

            <!-- Network Protocols -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sitemap"></i> Network Protocols</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr>
                            <td class="text-muted">IGMP Snooping</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm ${st.igmp?.enabled ? 'btn-primary' : ''}" onclick="NetSwitchPage.setIgmp('${sw.id}', true)">Enabled</button>
                                    <button class="btn btn-sm ${!st.igmp?.enabled ? 'btn-primary' : ''}" onclick="NetSwitchPage.setIgmp('${sw.id}', false)">Disabled</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Spanning Tree (STP)</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm ${st.stp?.enabled ? 'btn-primary' : ''}" onclick="NetSwitchPage.setStp('${sw.id}', true)">Enabled</button>
                                    <button class="btn btn-sm ${!st.stp?.enabled ? 'btn-primary' : ''}" onclick="NetSwitchPage.setStp('${sw.id}', false)">Disabled</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Multicast Filtering</td>
                            <td><span style="color:var(--green)">${st.multicast?.filtering ? 'Active' : 'Inactive'}</span></td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- LLDP Neighbors -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-search-location"></i> LLDP Neighbors</h3></div>
                <div class="card-body">
                    ${this._renderLldp(st.lldp || [])}
                </div>
            </div>

            ${isLumiNode ? `
            <!-- DMX Ports (LumiNode only) -->
            <div class="card" style="grid-column:1 / -1">
                <div class="card-header"><h3><i class="fas fa-lightbulb"></i> DMX / Protocol Routing</h3></div>
                <div class="card-body">
                    ${this._renderDmxPorts(st.dmx || [])}
                </div>
            </div>
            ` : ''}

            <!-- Presets -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-bookmark"></i> Presets</h3></div>
                <div class="card-body">
                    <div class="ptz-preset-grid" style="grid-template-columns:repeat(4,1fr)">
                        ${Array.from({length: 8}, (_, i) => `
                            <button class="btn btn-sm" onclick="NetSwitchPage.recallPreset('${sw.id}', ${i+1})">Preset ${i+1}</button>
                        `).join('')}
                    </div>
                    <div style="margin-top:8px">
                        <button class="btn btn-sm btn-primary w-full" onclick="NetSwitchPage.storePreset('${sw.id}')"><i class="fas fa-save"></i> Store Current as Preset</button>
                    </div>
                </div>
            </div>

            <!-- System Logs -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-terminal"></i> Device Logs</h3></div>
                <div class="card-body" id="ns-device-logs" style="max-height:200px;overflow-y:auto;font-family:var(--font-mono);font-size:11px">
                    ${this._renderDeviceLogs(st.logs || [])}
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

    _renderPortGrid(sw, ports) {
        // Generate mock ports if none available
        const portCount = this._getPortCount(sw.model);
        if (ports.length === 0) {
            ports = Array.from({length: portCount}, (_, i) => ({
                id: i + 1,
                name: `Port ${i + 1}`,
                link: false,
                speed: '--',
                duplex: '--',
                txBytes: 0,
                rxBytes: 0,
                txPackets: 0,
                rxPackets: 0,
                errors: 0,
                vlan: 1,
                enabled: true,
                type: i >= portCount - 2 ? 'sfp' : 'rj45',
            }));
        }
        return `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px">
                ${ports.map(p => {
                    const linkColor = !p.enabled ? 'var(--text-muted)' : p.link ? 'var(--green)' : 'var(--red)';
                    const icon = p.type === 'sfp' ? 'fa-fiber-manual-record' : 'fa-ethernet';
                    return `
                        <div class="ns-port-card" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;border-top:3px solid ${linkColor}">
                            <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:4px">
                                <span style="font-weight:700;font-size:11px">${p.type === 'sfp' ? 'SFP' : ''} ${p.id}</span>
                                <div style="width:8px;height:8px;border-radius:50%;background:${linkColor}"></div>
                            </div>
                            <div style="font-size:9px;color:var(--text-muted)">
                                ${p.link ? `<span style="color:var(--green)">${p.speed || '1G'}</span>` : '<span style="color:var(--red)">No Link</span>'}
                                ${p.enabled ? '' : '<span style="color:var(--orange)"> (Disabled)</span>'}
                            </div>
                            <div style="font-size:9px;color:var(--text-muted);margin-top:2px">VLAN ${p.vlan || 1}</div>
                            <div style="font-size:8px;color:var(--text-muted);margin-top:2px">
                                TX: ${this._formatBytes(p.txBytes)} / RX: ${this._formatBytes(p.rxBytes)}
                            </div>
                            ${p.errors > 0 ? `<div style="font-size:8px;color:var(--red)">Errors: ${p.errors}</div>` : ''}
                            <div class="flex gap-xs" style="margin-top:4px">
                                <button class="btn btn-xs" style="flex:1;font-size:9px" onclick="NetSwitchPage.togglePort('${p.id}', ${!p.enabled})">${p.enabled ? 'Disable' : 'Enable'}</button>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
    },

    _renderPoE(poe, ports) {
        const budget = poe.budget || 0;
        const used = poe.used || 0;
        const available = budget - used;
        const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;

        return `
            <div style="margin-bottom:12px">
                <div class="flex" style="justify-content:space-between;font-size:11px;margin-bottom:4px">
                    <span class="text-muted">Power Budget</span>
                    <span>${used}W / ${budget}W (${pct}%)</span>
                </div>
                <div style="height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:${pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--orange)' : 'var(--green)'};border-radius:4px;transition:width 0.3s"></div>
                </div>
            </div>
            <table class="data-table" style="font-size:11px">
                <thead><tr><th>Port</th><th>Status</th><th>Power</th><th>Class</th><th>Control</th></tr></thead>
                <tbody>
                    ${(poe.ports || []).map(p => `
                        <tr>
                            <td>Port ${p.id}</td>
                            <td><span style="color:${p.delivering ? 'var(--green)' : 'var(--text-muted)'}">${p.delivering ? 'Delivering' : p.enabled ? 'Waiting' : 'Disabled'}</span></td>
                            <td>${p.power ? p.power + 'W' : '--'}</td>
                            <td>${p.class || '--'}</td>
                            <td>
                                <button class="btn btn-xs" onclick="NetSwitchPage.togglePoE('${p.id}', ${!p.enabled})">${p.enabled ? 'Disable' : 'Enable'}</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="5" class="text-muted" style="text-align:center">No PoE data available</td></tr>'}
                </tbody>
            </table>`;
    },

    _renderVlans(vlans) {
        if (vlans.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">No VLANs configured (Default VLAN 1)</div>';
        }
        return `
            <table class="data-table" style="font-size:11px">
                <thead><tr><th>VLAN ID</th><th>Name</th><th>Ports</th><th>Actions</th></tr></thead>
                <tbody>
                    ${vlans.map(v => `
                        <tr>
                            <td style="font-weight:600">${v.id}</td>
                            <td>${UI.esc(v.name || '--')}</td>
                            <td style="font-size:10px">${v.ports ? v.ports.join(', ') : '--'}</td>
                            <td>
                                ${v.id !== 1 ? `<button class="btn btn-xs btn-danger" onclick="NetSwitchPage.deleteVlan('${v.id}')"><i class="fas fa-trash"></i></button>` : '<span class="text-muted">Default</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    _renderLldp(neighbors) {
        if (neighbors.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:12px;font-size:11px">No LLDP neighbors discovered</div>';
        }
        return `
            <table class="data-table" style="font-size:11px">
                <thead><tr><th>Local Port</th><th>Neighbor</th><th>Model</th><th>IP</th></tr></thead>
                <tbody>
                    ${neighbors.map(n => `
                        <tr>
                            <td>Port ${n.localPort}</td>
                            <td>${UI.esc(n.name || '--')}</td>
                            <td>${UI.esc(n.model || '--')}</td>
                            <td>${UI.esc(n.ip || '--')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    _renderDmxPorts(dmxPorts) {
        if (dmxPorts.length === 0) {
            // Generate mock for LumiNode
            const sw = this._getSelected();
            const count = sw?.model?.includes('12') ? 12 : sw?.model?.includes('4') ? 4 : sw?.model?.includes('2') ? 2 : 1;
            dmxPorts = Array.from({length: count}, (_, i) => ({
                id: i + 1,
                protocol: 'Art-Net',
                direction: 'Output',
                universe: i,
                subnet: 0,
                net: 0,
                mergeMode: 'HTP',
                active: false,
            }));
        }
        return `
            <table class="data-table" style="font-size:11px">
                <thead><tr><th>DMX Port</th><th>Protocol</th><th>Direction</th><th>Universe</th><th>Subnet</th><th>Net</th><th>Merge</th><th>Status</th></tr></thead>
                <tbody>
                    ${dmxPorts.map(d => `
                        <tr>
                            <td style="font-weight:600">Port ${d.id}</td>
                            <td>
                                <select class="form-control" style="font-size:10px;padding:2px 4px;width:80px" onchange="NetSwitchPage.setDmxProtocol(${d.id}, this.value)">
                                    <option ${d.protocol === 'Art-Net' ? 'selected' : ''}>Art-Net</option>
                                    <option ${d.protocol === 'sACN' ? 'selected' : ''}>sACN</option>
                                </select>
                            </td>
                            <td>
                                <select class="form-control" style="font-size:10px;padding:2px 4px;width:70px" onchange="NetSwitchPage.setDmxDirection(${d.id}, this.value)">
                                    <option ${d.direction === 'Input' ? 'selected' : ''}>Input</option>
                                    <option ${d.direction === 'Output' ? 'selected' : ''}>Output</option>
                                </select>
                            </td>
                            <td><input type="number" class="form-control" style="font-size:10px;padding:2px 4px;width:50px" value="${d.universe}" min="0" max="32767" onchange="NetSwitchPage.setDmxUniverse(${d.id}, this.value)"></td>
                            <td><input type="number" class="form-control" style="font-size:10px;padding:2px 4px;width:40px" value="${d.subnet}" min="0" max="15" onchange="NetSwitchPage.setDmxSubnet(${d.id}, this.value)"></td>
                            <td><input type="number" class="form-control" style="font-size:10px;padding:2px 4px;width:40px" value="${d.net}" min="0" max="127" onchange="NetSwitchPage.setDmxNet(${d.id}, this.value)"></td>
                            <td>
                                <select class="form-control" style="font-size:10px;padding:2px 4px;width:55px" onchange="NetSwitchPage.setDmxMerge(${d.id}, this.value)">
                                    <option ${d.mergeMode === 'HTP' ? 'selected' : ''}>HTP</option>
                                    <option ${d.mergeMode === 'LTP' ? 'selected' : ''}>LTP</option>
                                </select>
                            </td>
                            <td><span style="color:${d.active ? 'var(--green)' : 'var(--text-muted)'}">${d.active ? 'Active' : 'Idle'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    _renderDeviceLogs(logs) {
        if (logs.length === 0) return '<div class="text-muted" style="text-align:center;padding:8px">No device logs</div>';
        return logs.map(l => `<div class="log-line" style="padding:2px 0"><span style="color:var(--text-muted)">${l.time || ''}</span> <span style="color:${l.level === 'error' ? 'var(--red)' : l.level === 'warn' ? 'var(--orange)' : 'var(--text-secondary)'}">${UI.esc(l.message || '')}</span></div>`).join('');
    },

    // ---- Helpers ----
    _getPortCount(model) {
        const counts = { 'GigaCore 10': 10, 'GigaCore 12': 12, 'GigaCore 14R': 14, 'GigaCore 16t': 16, 'GigaCore 16Xt': 16, 'GigaCore 16RFO': 16, 'GigaCore 26i': 26, 'GigaCore 30i': 30, 'LumiNode 1': 2, 'LumiNode 2': 2, 'LumiNode 4': 2, 'LumiNode 12': 2, 'XNode 4': 2, 'XNode 8': 2 };
        return counts[model] || 16;
    },

    _formatBytes(b) {
        if (!b || b === 0) return '0';
        if (b < 1024) return b + 'B';
        if (b < 1048576) return (b / 1024).toFixed(1) + 'K';
        if (b < 1073741824) return (b / 1048576).toFixed(1) + 'M';
        return (b / 1073741824).toFixed(1) + 'G';
    },

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
    // SWITCH MANAGEMENT
    // ============================================================
    showAddSwitch() {
        const html = `
            <div style="min-width:380px">
                <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04));border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:14px;margin-bottom:20px;text-align:center;">
                    <div style="font-size:12px;color:#f59e0b;font-weight:700;margin-bottom:6px;letter-spacing:0.5px;"><i class="fas fa-flask"></i> DEMO MODE</div>
                    <p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">No hardware? Try a virtual switch with realistic data.</p>
                    <button class="btn btn-sm" style="border-color:rgba(245,158,11,0.4);color:#f59e0b" onclick="UI.closeModal();NetSwitchPage.addVirtualSwitch()"><i class="fas fa-plus"></i> Create Virtual GigaCore 16Xt</button>
                </div>
                <div class="form-group">
                    <label>Device Name</label>
                    <input class="form-control" id="ns-add-name" placeholder="e.g. FOH Switch 1">
                </div>
                <div class="form-group">
                    <label>Device Type</label>
                    <select class="form-control" id="ns-add-type" onchange="NetSwitchPage._onTypeChange()">
                        <option value="gigacore">Luminex GigaCore</option>
                        <option value="luminode">Luminex LumiNode</option>
                        <option value="cameo">Cameo XNode</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <select class="form-control" id="ns-add-model">
                        ${this._models.gigacore.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>IP Address</label>
                    <input class="form-control" id="ns-add-ip" placeholder="192.168.1.1">
                </div>
            </div>`;
        UI.openModal('Add Network Switch', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="NetSwitchPage._confirmAddSwitch()">Add Device</button>`);
    },

    _confirmAddSwitch() {
        const name = document.getElementById('ns-add-name')?.value?.trim();
        const type = document.getElementById('ns-add-type')?.value;
        const model = document.getElementById('ns-add-model')?.value;
        const ip = document.getElementById('ns-add-ip')?.value?.trim();
        if (!name || !ip) return UI.toast('Name and IP are required', 'error');
        UI.closeModal();
        this.addSwitch({ name, type, model, ip });
    },

    _onTypeChange() {
        const type = document.getElementById('ns-add-type')?.value;
        const modelSel = document.getElementById('ns-add-model');
        if (!modelSel) return;
        const models = this._models[type] || [];
        modelSel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    },

    addSwitch(cfg) {
        const sw = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: cfg.name,
            type: cfg.type || 'gigacore',
            model: cfg.model || 'GigaCore 16Xt',
            ip: cfg.ip,
            connected: false,
            lastSeen: null,
            status: {},
        };
        this._switches.push(sw);
        this._saveSwitches();
        this._selectedId = sw.id;
        this._refreshAll();
        this._checkConnection(sw);
        UI.toast(`Switch "${sw.name}" added`, 'success');
        appState.log('INFO', `Network switch added: ${sw.name} (${sw.model} @ ${sw.ip})`, 'Network');
        this.renderSidebarList();
    },

    removeSwitch(id) {
        const sw = this._switches.find(s => s.id === id);
        if (!sw) return;
        UI.openModal('Remove Switch', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(sw.name)}</strong>?</p>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" onclick="NetSwitchPage._confirmRemoveSwitch('${id}')">Remove</button>`);
    },

    _confirmRemoveSwitch(id) {
        UI.closeModal();
        const sw = this._switches.find(s => s.id === id);
        this._switches = this._switches.filter(s => s.id !== id);
        if (this._selectedId === id) this._selectedId = this._switches[0]?.id || null;
        this._saveSwitches();
        this._refreshAll();
        this.renderSidebarList();
        UI.toast(`Switch "${sw?.name}" removed`, 'info');
        appState.log('INFO', `Network switch removed: ${sw?.name}`, 'Network');
    },

    async selectSwitch(id) {
        this._selectedId = id;
        this._refreshAll();
        const sw = this._getSelected();
        if (sw && !sw.virtual) {
            await this._checkConnection(sw);
            if (sw.connected) await this.refreshSwitch(sw.id);
        }
    },

    _getSelected() {
        return this._switches.find(s => s.id === this._selectedId) || null;
    },

    // ---- Persistence ----
    _saveSwitches() {
        const real = this._switches.filter(s => !s.virtual).map(s => ({ id: s.id, name: s.name, type: s.type, model: s.model, ip: s.ip }));
        try { localStorage.setItem('luxor_net_switches', JSON.stringify(real)); } catch {}
        const virt = this._switches.filter(s => s.virtual);
        try { localStorage.setItem('luxor_net_switches_virtual', JSON.stringify(virt)); } catch {}
    },

    _loadSwitches() {
        try {
            const d = JSON.parse(localStorage.getItem('luxor_net_switches') || '[]');
            this._switches = d.map(s => ({ ...s, connected: false, lastSeen: null, status: {} }));
            const virt = JSON.parse(localStorage.getItem('luxor_net_switches_virtual') || '[]');
            virt.forEach(v => { if (!this._switches.find(s => s.id === v.id)) this._switches.push({ ...v, connected: true }); });
            if (this._switches.length > 0 && !this._selectedId) this._selectedId = this._switches[0].id;
        } catch { this._switches = []; }
    },

    // ============================================================
    // API COMMUNICATION
    // ============================================================
    async _apiCall(sw, section, endpoint, body) {
        const ep = this._api[section]?.[endpoint];
        if (!ep) return null;
        let path = ep.path;
        if (body?.id) { path = path.replace('{id}', body.id); delete body.id; }
        const url = `${this._api.baseUrl(sw.ip)}${path}`;
        try {
            const opts = { method: ep.method, signal: AbortSignal.timeout(5000) };
            if (body && (ep.method === 'POST' || ep.method === 'PUT')) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(body);
            }
            const resp = await fetch(url, opts);
            const text = await resp.text();
            sw.connected = true;
            sw.lastSeen = Date.now();
            try { return JSON.parse(text); } catch { return text; }
        } catch (e) {
            // Fallback: try root URL to check if device is reachable at all
            if (section === 'system' && endpoint === 'info') {
                try {
                    const fallback = await fetch(`http://${sw.ip}/`, { signal: AbortSignal.timeout(5000) });
                    if (fallback.ok || fallback.status < 500) {
                        sw.connected = true;
                        sw.lastSeen = Date.now();
                        return { model: sw.model, firmware: 'N/A (web only)' };
                    }
                } catch {}
            }
            sw.connected = false;
            return null;
        }
    },

    async _checkConnection(sw) {
        const info = await this._apiCall(sw, 'system', 'info');
        sw.connected = info !== null;
        if (info) {
            sw.status.info = info;
        }
        this._updateList();
    },

    async refreshSwitch(id) {
        const sw = this._switches.find(s => s.id === id);
        if (!sw) return;
        const [info, status, ports, poe, vlans, igmp, stp, lldp, logs] = await Promise.allSettled([
            this._apiCall(sw, 'system', 'info'),
            this._apiCall(sw, 'system', 'status'),
            this._apiCall(sw, 'ports', 'list'),
            this._apiCall(sw, 'poe', 'status'),
            this._apiCall(sw, 'vlans', 'list'),
            this._apiCall(sw, 'network', 'igmp'),
            this._apiCall(sw, 'network', 'stp'),
            this._apiCall(sw, 'network', 'lldp'),
            this._apiCall(sw, 'system', 'logs'),
        ]);
        sw.status = {
            info: info.value || sw.status.info || {},
            system: status.value || {},
            ports: ports.value || [],
            poe: poe.value || {},
            vlans: vlans.value || [],
            igmp: igmp.value || {},
            stp: stp.value || {},
            lldp: lldp.value || [],
            logs: logs.value || [],
        };
        if (sw.type === 'luminode') {
            const dmx = await this._apiCall(sw, 'dmx', 'ports');
            sw.status.dmx = dmx || [];
        }
        this._refreshAll();
    },

    // ---- Actions ----
    async togglePort(portId, enable) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'ports', enable ? 'enable' : 'disable', { id: portId });
        UI.toast(`Port ${portId} ${enable ? 'enabled' : 'disabled'}`, 'info');
        this.refreshSwitch(sw.id);
    },

    async togglePoE(portId, enable) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'poe', 'portConfig', { id: portId, enabled: enable });
        UI.toast(`PoE Port ${portId} ${enable ? 'enabled' : 'disabled'}`, 'info');
        this.refreshSwitch(sw.id);
    },

    async setIgmp(swId, enabled) {
        const sw = this._switches.find(s => s.id === swId);
        if (!sw) return;
        await this._apiCall(sw, 'network', 'setIgmp', { enabled });
        UI.toast(`IGMP Snooping ${enabled ? 'enabled' : 'disabled'}`, 'info');
        this.refreshSwitch(swId);
    },

    async setStp(swId, enabled) {
        const sw = this._switches.find(s => s.id === swId);
        if (!sw) return;
        await this._apiCall(sw, 'network', 'setStp', { enabled });
        UI.toast(`Spanning Tree ${enabled ? 'enabled' : 'disabled'}`, 'info');
        this.refreshSwitch(swId);
    },

    showAddVlan(swId) {
        UI.openModal('Add VLAN', `
            <div class="form-group"><label>VLAN ID</label><input class="form-control" id="ns-vlan-id" type="number" min="2" max="4094" placeholder="e.g. 100"></div>
            <div class="form-group"><label>VLAN Name</label><input class="form-control" id="ns-vlan-name" placeholder="e.g. Lighting"></div>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="NetSwitchPage._confirmAddVlan('${swId}')">Create</button>`);
    },

    async _confirmAddVlan(swId) {
        const id = parseInt(document.getElementById('ns-vlan-id')?.value);
        const name = document.getElementById('ns-vlan-name')?.value?.trim();
        if (!id || id < 2) return UI.toast('VLAN ID must be 2-4094', 'error');
        UI.closeModal();
        const sw = this._switches.find(s => s.id === swId);
        if (!sw) return;
        await this._apiCall(sw, 'vlans', 'create', { id, name });
        UI.toast(`VLAN ${id} created`, 'success');
        this.refreshSwitch(swId);
    },

    async deleteVlan(vlanId) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'vlans', 'delete', { id: vlanId });
        UI.toast(`VLAN ${vlanId} deleted`, 'info');
        this.refreshSwitch(sw.id);
    },

    async rebootSwitch(id) {
        const sw = this._switches.find(s => s.id === id);
        if (!sw) return;
        UI.openModal('Reboot Switch', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-power-off" style="color:var(--red);font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Reboot <strong>${UI.esc(sw.name)}</strong>?</p>
            <p style="text-align:center;font-size:11px;color:var(--text-muted)">This will temporarily disconnect all devices on this switch.</p>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" onclick="NetSwitchPage._confirmReboot('${id}')">Reboot</button>`);
    },

    async _confirmReboot(id) {
        UI.closeModal();
        const sw = this._switches.find(s => s.id === id);
        if (!sw) return;
        await this._apiCall(sw, 'system', 'reboot');
        UI.toast(`Reboot command sent to ${sw.name}`, 'info');
        appState.log('WARN', `Network switch rebooted: ${sw.name}`, 'Network');
    },

    async recallPreset(swId, n) {
        const sw = this._switches.find(s => s.id === swId);
        if (!sw) return;
        await this._apiCall(sw, 'presets', 'recall', { id: n });
        UI.toast(`Preset ${n} recalled`, 'info');
        this.refreshSwitch(swId);
    },

    async storePreset(swId) {
        UI.openModal('Store Preset', `
            <div class="form-group"><label>Preset Number</label>
                <select class="form-control" id="ns-store-preset">
                    ${Array.from({length: 8}, (_, i) => `<option value="${i+1}">Preset ${i+1}</option>`).join('')}
                </select>
            </div>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="NetSwitchPage._confirmStorePreset('${swId}')">Store</button>`);
    },

    async _confirmStorePreset(swId) {
        const n = parseInt(document.getElementById('ns-store-preset')?.value) || 1;
        UI.closeModal();
        const sw = this._switches.find(s => s.id === swId);
        if (!sw) return;
        await this._apiCall(sw, 'presets', 'store', { id: n });
        UI.toast(`Current config stored as Preset ${n}`, 'success');
    },

    async _resetAllCounters(swId) {
        const sw = this._switches.find(s => s.id === swId);
        if (!sw) return;
        const portCount = this._getPortCount(sw.model);
        for (let i = 1; i <= portCount; i++) {
            await this._apiCall(sw, 'ports', 'resetCounters', { id: i });
        }
        UI.toast('All port counters reset', 'info');
        this.refreshSwitch(swId);
    },

    // DMX config (LumiNode)
    async setDmxProtocol(portId, protocol) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'dmx', 'setPortConfig', { id: portId, protocol });
    },

    async setDmxDirection(portId, direction) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'dmx', 'setPortConfig', { id: portId, direction });
    },

    async setDmxUniverse(portId, universe) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'dmx', 'setPortConfig', { id: portId, universe: parseInt(universe) });
    },

    async setDmxSubnet(portId, subnet) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'dmx', 'setPortConfig', { id: portId, subnet: parseInt(subnet) });
    },

    async setDmxNet(portId, net) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'dmx', 'setPortConfig', { id: portId, net: parseInt(net) });
    },

    async setDmxMerge(portId, mergeMode) {
        const sw = this._getSelected();
        if (!sw) return;
        await this._apiCall(sw, 'dmx', 'setPortConfig', { id: portId, mergeMode });
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    renderSidebarList() {
        const container = document.getElementById('net-switch-list');
        if (!container) return;
        if (this._switches.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = this._switches.map(s => {
            const dot = s.connected ? '#4ade80' : '#ef4444';
            const typeLabel = s.type === 'luminode' ? 'LumiNode' : s.type === 'cameo' ? 'Cameo' : 'GigaCore';
            return `
                <div class="sidebar-device-card" onclick="NetSwitchPage.selectSwitch('${s.id}');HippoApp.navigate('netswitch')">
                    <span class="device-dot" style="background:${dot}"></span>
                    <div class="device-info">
                        <div class="device-name">${UI.esc(s.name)}</div>
                        <div class="device-sub">${typeLabel} ${UI.esc(s.model)}</div>
                    </div>
                    <button class="device-remove" onclick="event.stopPropagation();NetSwitchPage.removeSwitch('${s.id}')" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
        }).join('');
    },

    initSidebar() {
        this._loadSwitches();
        this._initVirtualDemo();
        this.renderSidebarList();
    },

    _initVirtualDemo() {
        // No auto-spawn — virtual demos are created manually via Add Switch dialog
    },

    addVirtualSwitch() {
        const id = 'virtual-gc16xt-' + Date.now().toString(36);
        const sw = {
            id,
            name: 'Virtual GigaCore 16Xt (Demo)',
            type: 'gigacore',
            model: 'GigaCore 16Xt',
            ip: '192.168.1.1',
            connected: true,
            virtual: true,
            lastSeen: Date.now(),
            status: {
                info: { model: 'GigaCore 16Xt', firmware: '6.2.1', serial: 'LX-GC16XT-0042781', mac: '00:50:C2:AB:34:56', hostname: 'GC16Xt-FOH', uptime: 432000 },
                system: { temperature: 42, fanSpeed: 2400, cpu: 18, memory: 34, powerDraw: 85 },
                ports: [
                    { id:1,name:'Port 1',link:true,speed:'1G',duplex:'Full',txBytes:487329841,rxBytes:312847562,txPackets:4821093,rxPackets:3129847,errors:0,vlan:1,enabled:true,type:'rj45' },
                    { id:2,name:'Port 2',link:true,speed:'1G',duplex:'Full',txBytes:1248573921,rxBytes:982347128,txPackets:12384729,rxPackets:9823471,errors:0,vlan:1,enabled:true,type:'rj45' },
                    { id:3,name:'Port 3',link:true,speed:'1G',duplex:'Full',txBytes:38472891,rxBytes:27384729,txPackets:384729,rxPackets:273847,errors:0,vlan:10,enabled:true,type:'rj45' },
                    { id:4,name:'Port 4',link:true,speed:'1G',duplex:'Full',txBytes:92847392,rxBytes:74829384,txPackets:928473,rxPackets:748293,errors:0,vlan:10,enabled:true,type:'rj45' },
                    { id:5,name:'Port 5',link:true,speed:'1G',duplex:'Full',txBytes:182938471,rxBytes:129384712,txPackets:1829384,rxPackets:1293847,errors:0,vlan:20,enabled:true,type:'rj45' },
                    { id:6,name:'Port 6',link:false,speed:'--',duplex:'--',txBytes:0,rxBytes:0,txPackets:0,rxPackets:0,errors:0,vlan:1,enabled:true,type:'rj45' },
                    { id:7,name:'Port 7',link:true,speed:'1G',duplex:'Full',txBytes:547382910,rxBytes:423847291,txPackets:5473829,rxPackets:4238472,errors:0,vlan:1,enabled:true,type:'rj45' },
                    { id:8,name:'Port 8',link:true,speed:'1G',duplex:'Full',txBytes:284739281,rxBytes:198472938,txPackets:2847392,rxPackets:1984729,errors:2,vlan:20,enabled:true,type:'rj45' },
                    { id:9,name:'Port 9',link:false,speed:'--',duplex:'--',txBytes:0,rxBytes:0,txPackets:0,rxPackets:0,errors:0,vlan:1,enabled:false,type:'rj45' },
                    { id:10,name:'Port 10',link:true,speed:'1G',duplex:'Full',txBytes:38291847,rxBytes:29384712,txPackets:382918,rxPackets:293847,errors:0,vlan:10,enabled:true,type:'rj45' },
                    { id:11,name:'Port 11',link:true,speed:'100M',duplex:'Full',txBytes:9847291,rxBytes:7382910,txPackets:98472,rxPackets:73829,errors:0,vlan:30,enabled:true,type:'rj45' },
                    { id:12,name:'Port 12',link:true,speed:'1G',duplex:'Full',txBytes:648392184,rxBytes:524839210,txPackets:6483921,rxPackets:5248392,errors:0,vlan:1,enabled:true,type:'rj45' },
                    { id:13,name:'Port 13',link:false,speed:'--',duplex:'--',txBytes:0,rxBytes:0,txPackets:0,rxPackets:0,errors:0,vlan:1,enabled:true,type:'rj45' },
                    { id:14,name:'Port 14',link:true,speed:'1G',duplex:'Full',txBytes:172839412,rxBytes:138472910,txPackets:1728394,rxPackets:1384729,errors:0,vlan:20,enabled:true,type:'rj45' },
                    { id:15,name:'SFP 1',link:true,speed:'10G',duplex:'Full',txBytes:3847291840,rxBytes:2938471280,txPackets:38472918,rxPackets:29384712,errors:0,vlan:1,enabled:true,type:'sfp' },
                    { id:16,name:'SFP 2',link:true,speed:'10G',duplex:'Full',txBytes:2938471280,rxBytes:2384719280,txPackets:29384712,rxPackets:23847192,errors:0,vlan:1,enabled:true,type:'sfp' },
                ],
                poe: {
                    budget: 240, used: 87,
                    ports: [
                        { id:1,enabled:true,delivering:true,power:15.4,class:'Class 3' },
                        { id:2,enabled:true,delivering:true,power:12.8,class:'Class 3' },
                        { id:3,enabled:true,delivering:true,power:7.2,class:'Class 2' },
                        { id:4,enabled:true,delivering:true,power:7.1,class:'Class 2' },
                        { id:5,enabled:true,delivering:true,power:25.5,class:'Class 4' },
                        { id:6,enabled:true,delivering:false,power:0,class:'--' },
                        { id:7,enabled:true,delivering:true,power:12.9,class:'Class 3' },
                        { id:8,enabled:true,delivering:true,power:6.1,class:'Class 2' },
                        { id:9,enabled:false,delivering:false,power:0,class:'--' },
                        { id:10,enabled:true,delivering:false,power:0,class:'--' },
                        { id:11,enabled:true,delivering:false,power:0,class:'--' },
                        { id:12,enabled:true,delivering:false,power:0,class:'--' },
                        { id:13,enabled:true,delivering:false,power:0,class:'--' },
                        { id:14,enabled:true,delivering:false,power:0,class:'--' },
                    ],
                },
                vlans: [
                    { id:1,name:'Default',ports:[1,2,6,7,9,12,13,15,16] },
                    { id:10,name:'Art-Net',ports:[3,4,10] },
                    { id:20,name:'Media',ports:[5,8,14] },
                    { id:30,name:'Management',ports:[11] },
                ],
                igmp: { enabled: true }, stp: { enabled: true }, multicast: { filtering: true },
                lldp: [
                    { localPort:1,name:'Hippo-Engine-1',model:'Hippotizer Karst+',ip:'192.168.1.10' },
                    { localPort:2,name:'Hippo-Engine-2',model:'Hippotizer Karst+',ip:'192.168.1.11' },
                    { localPort:3,name:'LumiNode-FOH',model:'LumiNode 4',ip:'192.168.1.20' },
                    { localPort:5,name:'NovaStar-VX6s',model:'VX6s',ip:'192.168.1.30' },
                    { localPort:7,name:'PTZ-Cam-1',model:'AW-HE160',ip:'192.168.1.40' },
                    { localPort:12,name:'grandMA3',model:'grandMA3 full-size',ip:'192.168.1.50' },
                    { localPort:15,name:'GigaCore-Stage',model:'GigaCore 14R',ip:'192.168.1.2' },
                    { localPort:16,name:'GigaCore-Patch',model:'GigaCore 12',ip:'192.168.1.3' },
                ],
                logs: [
                    { time:'14:32:01',level:'info',message:'Port 15 (SFP 1) link up at 10Gbps' },
                    { time:'14:30:12',level:'info',message:'IGMP snooping: joined group 239.255.0.1 on port 3' },
                    { time:'14:28:45',level:'warn',message:'Port 8: 2 CRC errors detected' },
                    { time:'14:25:00',level:'info',message:'STP topology stable, root bridge elected' },
                    { time:'14:15:00',level:'info',message:'System started, firmware 6.2.1' },
                ],
            },
        };
        this._switches.push(sw);
        this._saveSwitches();
        this._selectedId = id;
        this._refreshAll();
        this.renderSidebarList();
        UI.toast('Virtual GigaCore 16Xt created', 'success');
    },

    // ============================================================
    // RECONNECT
    // ============================================================
    async _reconnectAll() {
        UI.toast('Reconnecting all switches...', 'info');
        for (const sw of this._switches) {
            if (!sw.virtual) await this._checkConnection(sw);
        }
        // Full refresh for selected switch
        const sel = this._getSelected();
        if (sel && sel.connected) await this.refreshSwitch(sel.id);
        this._refreshAll();
        const online = this._switches.filter(s => s.connected).length;
        UI.toast(`${online}/${this._switches.length} switches connected`, online > 0 ? 'success' : 'error');
    },

    // ============================================================
    // POLLING / LIFECYCLE
    // ============================================================
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
        for (const sw of this._switches) {
            if (sw.virtual) continue;
            await this._checkConnection(sw);
            // Full data refresh every 5th poll (~15s) for the selected switch
            if (sw.connected && sw.id === this._selectedId && this._pollCount % 5 === 0) {
                await this.refreshSwitch(sw.id);
            }
        }
    },

    _updateList() {
        if (this._isActive) {
            const list = document.getElementById('ns-switch-list');
            if (list) list.innerHTML = this._renderSwitchList();
        }
        this.renderSidebarList();
    },

    _refreshAll() {
        const list = document.getElementById('ns-switch-list');
        const controls = document.getElementById('ns-controls');
        if (list) list.innerHTML = this._renderSwitchList();
        const sw = this._getSelected();
        if (controls) controls.innerHTML = sw ? this._renderControls(sw) : this._renderNoSwitch();
        this.renderSidebarList();
    },

    onActivate() {
        this._isActive = true;
        this._loadSwitches();
        this._initVirtualDemo();
        this._startPolling();
        this.renderSidebarList();
        // Immediately fetch full data for the selected switch
        const sw = this._getSelected();
        if (sw && !sw.virtual) {
            this._checkConnection(sw).then(() => {
                if (sw.connected) this.refreshSwitch(sw.id);
            });
        }
    },

    onDeactivate() {
        this._isActive = false;
        // Timer keeps running in background
    },
};
