/**
 * Network Health Dashboard — real-time ping, latency, packet loss, and device status
 * Aggregates all devices from PTZ, Network Switches, Lighting, Intercom, LED Processors
 */
const NetHealthPage = {

    _devices: [],       // aggregated device list
    _pingResults: {},   // { deviceId: { latency[], avgLatency, minLatency, maxLatency, packetLoss, status, lastCheck } }
    _pollTimer: null,
    _isActive: false,
    _pollInterval: 3000,
    _pingCount: 0,
    _maxHistory: 60,    // keep 60 data points (~3 min of history)
    _sortBy: 'status',  // status, name, latency, loss
    _filterType: 'all', // all, ptz, network, lighting, intercom, led

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        this._gatherDevices();
        const devices = this._getFilteredDevices();
        const summary = this._getSummary();

        return `
        <div class="nh-page">
            <div class="nh-header">
                <div style="display:flex;align-items:center;gap:12px;flex:1">
                    <h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-heartbeat" style="color:var(--accent);margin-right:8px"></i>Network Health</h2>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${devices.length} devices</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-sm" onclick="NetHealthPage._pingAll()" title="Ping All Now"><i class="fas fa-sync-alt"></i> Refresh</button>
                    <button class="btn btn-sm" onclick="NetHealthPage._resetStats()" title="Reset Statistics"><i class="fas fa-undo"></i> Reset</button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="nh-summary">
                <div class="nh-summary-card">
                    <div class="nh-summary-icon" style="color:var(--green)"><i class="fas fa-check-circle"></i></div>
                    <div class="nh-summary-data">
                        <div class="nh-summary-val">${summary.online}</div>
                        <div class="nh-summary-label">Online</div>
                    </div>
                </div>
                <div class="nh-summary-card">
                    <div class="nh-summary-icon" style="color:var(--red)"><i class="fas fa-times-circle"></i></div>
                    <div class="nh-summary-data">
                        <div class="nh-summary-val">${summary.offline}</div>
                        <div class="nh-summary-label">Offline</div>
                    </div>
                </div>
                <div class="nh-summary-card">
                    <div class="nh-summary-icon" style="color:var(--accent)"><i class="fas fa-tachometer-alt"></i></div>
                    <div class="nh-summary-data">
                        <div class="nh-summary-val">${summary.avgLatency}<span style="font-size:11px;font-weight:400">ms</span></div>
                        <div class="nh-summary-label">Avg Latency</div>
                    </div>
                </div>
                <div class="nh-summary-card">
                    <div class="nh-summary-icon" style="color:${summary.healthPct >= 90 ? 'var(--green)' : summary.healthPct >= 60 ? 'var(--warning)' : 'var(--red)'}"><i class="fas fa-shield-alt"></i></div>
                    <div class="nh-summary-data">
                        <div class="nh-summary-val">${summary.healthPct}<span style="font-size:11px;font-weight:400">%</span></div>
                        <div class="nh-summary-label">Network Health</div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="nh-filters">
                <div class="nh-filter-pills">
                    ${['all','ptz','network','lighting','intercom','led'].map(t => `
                        <button class="nh-pill ${this._filterType === t ? 'active' : ''}" onclick="NetHealthPage._setFilter('${t}')">
                            <i class="fas ${this._typeIcon(t)}"></i> ${this._typeLabel(t)}
                        </button>
                    `).join('')}
                </div>
                <div class="nh-sort">
                    <label style="font-size:10px;color:var(--text-muted)">Sort:</label>
                    <select class="sr-select" style="width:auto;min-width:100px;font-size:11px" onchange="NetHealthPage._setSort(this.value)">
                        <option value="status" ${this._sortBy==='status'?'selected':''}>Status</option>
                        <option value="name" ${this._sortBy==='name'?'selected':''}>Name</option>
                        <option value="latency" ${this._sortBy==='latency'?'selected':''}>Latency</option>
                        <option value="loss" ${this._sortBy==='loss'?'selected':''}>Packet Loss</option>
                    </select>
                </div>
            </div>

            <!-- Device Grid -->
            <div class="nh-grid" id="nh-device-grid">
                ${devices.length === 0 ? '<div class="nh-empty"><i class="fas fa-network-wired" style="font-size:32px;opacity:0.3"></i><p>No devices found. Add devices in PTZ, Network Switches, Lighting, Intercom, or LED Processor pages.</p></div>' : ''}
                ${devices.map(d => this._renderDeviceCard(d)).join('')}
            </div>

            <!-- Latency Chart -->
            ${devices.length > 0 ? `
            <div class="nh-chart-section">
                <h3 style="font-size:14px;font-weight:600;margin:0 0 12px 0"><i class="fas fa-chart-line" style="margin-right:6px;color:var(--accent)"></i>Latency Overview</h3>
                <div class="nh-chart" id="nh-latency-chart">
                    ${this._renderLatencyBars(devices)}
                </div>
            </div>` : ''}
        </div>`;
    },

    _renderDeviceCard(d) {
        const r = this._pingResults[d.id] || {};
        const status = r.status || 'unknown';
        const latency = r.avgLatency !== undefined ? r.avgLatency.toFixed(0) : '--';
        const loss = r.packetLoss !== undefined ? r.packetLoss.toFixed(0) : '--';
        const min = r.minLatency !== undefined ? r.minLatency.toFixed(0) : '--';
        const max = r.maxLatency !== undefined ? r.maxLatency.toFixed(0) : '--';
        const statusColor = status === 'online' ? 'var(--green)' : status === 'offline' ? 'var(--red)' : 'var(--text-muted)';
        const statusIcon = status === 'online' ? 'fa-check-circle' : status === 'offline' ? 'fa-times-circle' : 'fa-question-circle';
        const latencyColor = r.avgLatency !== undefined ? (r.avgLatency < 20 ? 'var(--green)' : r.avgLatency < 100 ? 'var(--warning)' : 'var(--red)') : 'var(--text-muted)';
        const lossColor = r.packetLoss !== undefined ? (r.packetLoss === 0 ? 'var(--green)' : r.packetLoss < 10 ? 'var(--warning)' : 'var(--red)') : 'var(--text-muted)';
        const sparkline = this._renderSparkline(d.id);

        return `
        <div class="nh-card ${status}">
            <div class="nh-card-header">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                    <i class="fas ${statusIcon}" style="color:${statusColor};font-size:14px"></i>
                    <div style="flex:1;min-width:0">
                        <div class="nh-card-name">${UI.esc(d.name)}</div>
                        <div class="nh-card-meta">
                            <i class="fas ${this._typeIcon(d.category)}" style="margin-right:3px"></i>${this._typeLabel(d.category)}
                            <span style="margin:0 4px;opacity:0.3">|</span>${UI.esc(d.model || '')}
                        </div>
                    </div>
                </div>
                <button class="btn btn-sm" style="padding:2px 8px;font-size:10px" onclick="NetHealthPage._pingSingle('${d.id}')" title="Ping"><i class="fas fa-satellite-dish"></i></button>
            </div>
            <div class="nh-card-ip">${UI.esc(d.ip)}</div>
            <div class="nh-card-stats">
                <div class="nh-stat">
                    <div class="nh-stat-val" style="color:${latencyColor}">${latency}<span class="nh-stat-unit">ms</span></div>
                    <div class="nh-stat-label">Avg Latency</div>
                </div>
                <div class="nh-stat">
                    <div class="nh-stat-val">${min}<span class="nh-stat-unit">ms</span></div>
                    <div class="nh-stat-label">Min</div>
                </div>
                <div class="nh-stat">
                    <div class="nh-stat-val">${max}<span class="nh-stat-unit">ms</span></div>
                    <div class="nh-stat-label">Max</div>
                </div>
                <div class="nh-stat">
                    <div class="nh-stat-val" style="color:${lossColor}">${loss}<span class="nh-stat-unit">%</span></div>
                    <div class="nh-stat-label">Pkt Loss</div>
                </div>
            </div>
            <div class="nh-sparkline">${sparkline}</div>
        </div>`;
    },

    _renderSparkline(id) {
        const r = this._pingResults[id];
        if (!r || !r.latency || r.latency.length < 2) return '<div style="font-size:9px;color:var(--text-muted);text-align:center;padding:4px">Collecting data...</div>';
        const points = r.latency.slice(-30);
        const max = Math.max(...points.filter(p => p !== null), 1);
        const w = 100;
        const h = 24;
        const step = w / (points.length - 1);
        let path = '';
        let lastX = 0, lastY = h;
        points.forEach((val, i) => {
            const x = (i * step).toFixed(1);
            const y = val !== null ? (h - (val / max * h * 0.9)).toFixed(1) : h;
            if (i === 0) path += `M${x},${y}`;
            else path += ` L${x},${y}`;
            lastX = x; lastY = y;
        });
        const color = r.avgLatency < 20 ? 'var(--green)' : r.avgLatency < 100 ? 'var(--warning)' : 'var(--red)';
        return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px"><path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    },

    _renderLatencyBars(devices) {
        const sorted = [...devices].sort((a, b) => {
            const la = this._pingResults[a.id]?.avgLatency ?? 9999;
            const lb = this._pingResults[b.id]?.avgLatency ?? 9999;
            return la - lb;
        });
        const maxLat = Math.max(...sorted.map(d => this._pingResults[d.id]?.avgLatency || 0), 1);
        return `<div class="nh-bars">${sorted.map(d => {
            const r = this._pingResults[d.id] || {};
            const lat = r.avgLatency || 0;
            const pct = Math.min((lat / Math.max(maxLat, 10)) * 100, 100);
            const color = lat < 20 ? 'var(--green)' : lat < 100 ? 'var(--warning)' : 'var(--red)';
            const status = r.status || 'unknown';
            return `
                <div class="nh-bar-row ${status === 'offline' ? 'offline' : ''}">
                    <div class="nh-bar-label" title="${UI.esc(d.ip)}">${UI.esc(d.name)}</div>
                    <div class="nh-bar-track">
                        <div class="nh-bar-fill" style="width:${status === 'offline' ? 0 : pct}%;background:${color}"></div>
                    </div>
                    <div class="nh-bar-val">${status === 'offline' ? '<span style="color:var(--red)">DOWN</span>' : lat.toFixed(0) + 'ms'}</div>
                </div>`;
        }).join('')}</div>`;
    },

    // ============================================================
    // DEVICE GATHERING
    // ============================================================
    _gatherDevices() {
        this._devices = [];

        // PTZ Cameras
        const cams = (typeof PtzPage !== 'undefined' && PtzPage._cameras) || [];
        cams.forEach(c => {
            if (c.virtual) return;
            this._devices.push({ id: 'ptz-' + c.id, name: c.name, ip: c.ip, model: c.model, category: 'ptz', sourceId: c.id });
        });

        // Network Switches
        const switches = (typeof NetSwitchPage !== 'undefined' && NetSwitchPage._switches) || [];
        switches.forEach(s => {
            if (s.virtual) return;
            this._devices.push({ id: 'net-' + s.id, name: s.name, ip: s.ip, model: s.model, category: 'network', sourceId: s.id });
        });

        // Lighting Consoles
        const consoles = (typeof LightingPage !== 'undefined' && LightingPage._consoles) || [];
        consoles.forEach(c => {
            if (c.virtual) return;
            this._devices.push({ id: 'light-' + c.id, name: c.name, ip: c.ip, model: c.model, category: 'lighting', sourceId: c.id });
        });

        // Intercom Systems
        const systems = (typeof IntercomPage !== 'undefined' && IntercomPage._systems) || [];
        systems.forEach(s => {
            if (s.virtual) return;
            this._devices.push({ id: 'icom-' + s.id, name: s.name, ip: s.ip, model: s.model, category: 'intercom', sourceId: s.id });
        });

        // LED Processors
        const procs = (typeof LedProcessorPage !== 'undefined' && LedProcessorPage._processors) || [];
        procs.forEach(p => {
            if (p.virtual) return;
            this._devices.push({ id: 'led-' + p.id, name: p.name, ip: p.host, model: p.type, category: 'led', sourceId: p.id });
        });
    },

    // ============================================================
    // PING / HEALTH CHECK
    // ============================================================
    async _pingDevice(device) {
        const start = performance.now();
        let reachable = false;

        try {
            // HTTP-based ping — try to reach the device's web interface
            let url;
            if (device.category === 'led') {
                // Novastar uses port — find original processor
                const proc = (LedProcessorPage._processors || []).find(p => p.id === device.sourceId);
                url = proc ? `http://${proc.host}:${proc.port}/api/v1/device/hw` : `http://${device.ip}/`;
            } else if (device.category === 'network') {
                url = `http://${device.ip}/api/system/info`;
            } else if (device.category === 'ptz') {
                url = `http://${device.ip}/cgi-bin/aw_ptz?cmd=%23O&res=1`;
            } else if (device.category === 'lighting') {
                const con = (LightingPage._consoles || []).find(c => c.id === device.sourceId);
                url = con?.type === 'titan' ? `http://${device.ip}:4430/titan/get/System/` : `http://${device.ip}/`;
            } else {
                url = `http://${device.ip}/`;
            }

            const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
            reachable = true;
        } catch {
            // Fallback: try root URL
            if (device.category !== 'led') {
                try {
                    await fetch(`http://${device.ip}/`, { signal: AbortSignal.timeout(3000) });
                    reachable = true;
                } catch {}
            }
        }

        const latency = performance.now() - start;

        // Update results
        if (!this._pingResults[device.id]) {
            this._pingResults[device.id] = { latency: [], pings: 0, failures: 0, status: 'unknown' };
        }
        const r = this._pingResults[device.id];
        r.pings++;

        if (reachable) {
            r.latency.push(Math.round(latency));
            r.status = 'online';
        } else {
            r.latency.push(null);
            r.failures++;
            r.status = 'offline';
        }

        // Trim history
        if (r.latency.length > this._maxHistory) r.latency = r.latency.slice(-this._maxHistory);

        // Calculate stats
        const valid = r.latency.filter(v => v !== null);
        if (valid.length > 0) {
            r.avgLatency = valid.reduce((a, b) => a + b, 0) / valid.length;
            r.minLatency = Math.min(...valid);
            r.maxLatency = Math.max(...valid);
        }
        r.packetLoss = r.pings > 0 ? (r.failures / r.pings) * 100 : 0;
        r.lastCheck = Date.now();
    },

    async _pingAll() {
        this._gatherDevices();
        this._pingCount++;
        const promises = this._devices.map(d => this._pingDevice(d));
        await Promise.allSettled(promises);
        if (this._isActive) this._updateGrid();
    },

    async _pingSingle(id) {
        const device = this._devices.find(d => d.id === id);
        if (!device) return;
        await this._pingDevice(device);
        this._updateGrid();
    },

    _resetStats() {
        this._pingResults = {};
        this._pingCount = 0;
        this.refresh();
    },

    // ============================================================
    // FILTERING & SORTING
    // ============================================================
    _getFilteredDevices() {
        let list = [...this._devices];
        if (this._filterType !== 'all') list = list.filter(d => d.category === this._filterType);

        list.sort((a, b) => {
            const ra = this._pingResults[a.id] || {};
            const rb = this._pingResults[b.id] || {};
            switch (this._sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'latency': return (ra.avgLatency ?? 9999) - (rb.avgLatency ?? 9999);
                case 'loss': return (rb.packetLoss ?? 0) - (ra.packetLoss ?? 0);
                case 'status':
                default:
                    // offline first, then by latency
                    if (ra.status !== rb.status) {
                        if (ra.status === 'offline') return -1;
                        if (rb.status === 'offline') return 1;
                    }
                    return (ra.avgLatency ?? 9999) - (rb.avgLatency ?? 9999);
            }
        });
        return list;
    },

    _setFilter(type) {
        this._filterType = type;
        this.refresh();
    },

    _setSort(val) {
        this._sortBy = val;
        this.refresh();
    },

    // ============================================================
    // HELPERS
    // ============================================================
    _getSummary() {
        const all = this._devices;
        let online = 0, offline = 0, totalLat = 0, latCount = 0;
        all.forEach(d => {
            const r = this._pingResults[d.id];
            if (r?.status === 'online') { online++; if (r.avgLatency !== undefined) { totalLat += r.avgLatency; latCount++; } }
            else if (r?.status === 'offline') offline++;
        });
        const unknown = all.length - online - offline;
        const avgLatency = latCount > 0 ? (totalLat / latCount).toFixed(0) : '--';
        const healthPct = all.length > 0 ? Math.round(((online) / all.length) * 100) : 100;
        return { online, offline, unknown, avgLatency, healthPct };
    },

    _typeIcon(type) {
        const icons = { all: 'fa-globe', ptz: 'fa-video', network: 'fa-network-wired', lighting: 'fa-sliders-h', intercom: 'fa-headset', led: 'fa-tv' };
        return icons[type] || 'fa-circle';
    },

    _typeLabel(type) {
        const labels = { all: 'All Devices', ptz: 'PTZ Cameras', network: 'Switches', lighting: 'Lighting', intercom: 'Intercom', led: 'LED Processors' };
        return labels[type] || type;
    },

    // ============================================================
    // UI UPDATES
    // ============================================================
    _updateGrid() {
        const grid = document.getElementById('nh-device-grid');
        const chart = document.getElementById('nh-latency-chart');
        if (grid) {
            const devices = this._getFilteredDevices();
            grid.innerHTML = devices.length === 0
                ? '<div class="nh-empty"><i class="fas fa-network-wired" style="font-size:32px;opacity:0.3"></i><p>No devices found.</p></div>'
                : devices.map(d => this._renderDeviceCard(d)).join('');
        }
        if (chart) chart.innerHTML = this._renderLatencyBars(this._getFilteredDevices());
        // Update summary inline
        const summary = this._getSummary();
        const summaryCards = document.querySelectorAll('.nh-summary-val');
        if (summaryCards.length >= 4) {
            summaryCards[0].textContent = summary.online;
            summaryCards[1].textContent = summary.offline;
            summaryCards[2].innerHTML = `${summary.avgLatency}<span style="font-size:11px;font-weight:400">ms</span>`;
            summaryCards[3].innerHTML = `${summary.healthPct}<span style="font-size:11px;font-weight:400">%</span>`;
        }
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'nethealth') {
            container.innerHTML = this.render();
        }
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    renderSidebarList() {
        // Network health has no sidebar items
    },

    initSidebar() {},

    // ============================================================
    // LIFECYCLE
    // ============================================================
    onActivate() {
        this._isActive = true;
        this._gatherDevices();
        // Immediate ping on activation
        this._pingAll();
        if (!this._pollTimer) {
            this._pollTimer = setInterval(() => this._pingAll(), this._pollInterval);
        }
    },

    onDeactivate() {
        this._isActive = false;
        // Timer keeps running in background
    },
};

// ================================================================
// CSS — injected once
// ================================================================
(function() {
    if (document.getElementById('nethealth-css')) return;
    const s = document.createElement('style');
    s.id = 'nethealth-css';
    s.textContent = `
    .nh-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .nh-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }

    /* Summary Cards */
    .nh-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .nh-summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .nh-summary-icon { font-size: 22px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); }
    .nh-summary-val { font-size: 24px; font-weight: 700; line-height: 1; }
    .nh-summary-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* Filters */
    .nh-filters { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .nh-filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .nh-pill { padding: 5px 12px; border-radius: 16px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s; }
    .nh-pill:hover { border-color: var(--accent); color: var(--text-primary); }
    .nh-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .nh-sort { display: flex; align-items: center; gap: 6px; }

    /* Device Grid */
    .nh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .nh-empty { grid-column: 1/-1; text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .nh-empty p { margin-top: 12px; font-size: 13px; }

    /* Device Card */
    .nh-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: all 0.2s; }
    .nh-card:hover { border-color: var(--accent); transform: translateY(-1px); }
    .nh-card.offline { border-left: 3px solid var(--red); }
    .nh-card.online { border-left: 3px solid var(--green); }
    .nh-card.unknown { border-left: 3px solid var(--text-muted); }
    .nh-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .nh-card-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nh-card-meta { font-size: 10px; color: var(--text-muted); }
    .nh-card-ip { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); margin-bottom: 10px; padding: 3px 8px; background: var(--bg-tertiary); border-radius: 4px; display: inline-block; }
    .nh-card-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
    .nh-stat { text-align: center; }
    .nh-stat-val { font-size: 14px; font-weight: 700; line-height: 1.2; }
    .nh-stat-unit { font-size: 9px; font-weight: 400; opacity: 0.6; }
    .nh-stat-label { font-size: 9px; color: var(--text-muted); }
    .nh-sparkline { height: 24px; overflow: hidden; border-radius: 4px; background: var(--bg-tertiary); }

    /* Latency Chart */
    .nh-chart-section { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
    .nh-bars { display: flex; flex-direction: column; gap: 6px; }
    .nh-bar-row { display: flex; align-items: center; gap: 10px; }
    .nh-bar-row.offline { opacity: 0.5; }
    .nh-bar-label { width: 140px; font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
    .nh-bar-track { flex: 1; height: 16px; background: var(--bg-tertiary); border-radius: 8px; overflow: hidden; }
    .nh-bar-fill { height: 100%; border-radius: 8px; transition: width 0.5s ease; min-width: 2px; }
    .nh-bar-val { width: 50px; text-align: right; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }

    @media (max-width: 800px) {
        .nh-summary { grid-template-columns: repeat(2, 1fr); }
        .nh-grid { grid-template-columns: 1fr; }
    }
    `;
    document.head.appendChild(s);
})();
