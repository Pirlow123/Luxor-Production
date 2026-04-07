/**
 * Broadweigh Load Cell Monitoring Page
 * Real-time wireless load cell monitoring for motors/hoists in live events.
 * Connects via USB base station to up to 8 Broadweigh wireless load cells.
 * Currently uses simulated data; hooks ready for Python DLL bridge integration.
 */
const LoadCellPage = {
    _cells: [],        // { id, name, address, host, online, value, unit, min, max, avg, peak, tare, underload, warning, overload, battery, signal, lastUpdate, log:[] }
    _activeCell: null,
    _connected: false,
    _simulated: false,    // true = simulation mode (no real DLL/hardware)
    _baseStationId: null, // real base station hex ID
    _comPort: '',
    _isActive: false,
    _simTimer: null,
    _simRunning: false,
    _readingCount: {},  // track count per cell for running average

    render() {
        return `
        <style>${LoadCellPage._css()}</style>
        <div class="section-header">
            <h2><i class="fas fa-weight-hanging"></i> Broadweigh Load Cells</h2>
            <div class="flex gap-sm" style="align-items:center;">
                <select id="lc-com-port" class="form-control" style="width:140px;font-size:11px;padding:4px 8px;">
                    <option value="">-- COM Port --</option>
                    <option value="COM1">COM1</option>
                    <option value="COM2">COM2</option>
                    <option value="COM3">COM3</option>
                    <option value="COM4">COM4</option>
                    <option value="COM5">COM5</option>
                    <option value="COM6">COM6</option>
                    <option value="COM7">COM7</option>
                    <option value="COM8">COM8</option>
                </select>
                ${this._connected
                    ? `<button class="btn btn-sm btn-danger" onclick="LoadCellPage._disconnect()"><i class="fas fa-unlink"></i> Disconnect</button>`
                    : `<button class="btn btn-sm btn-primary" onclick="LoadCellPage._connect()"><i class="fas fa-link"></i> Connect</button>`
                }
                <span class="lc-conn-badge ${this._connected ? (this._simulated ? 'lc-conn-sim' : 'lc-conn-online') : 'lc-conn-offline'}">
                    <span class="lc-conn-dot"></span> ${this._connected
                        ? (this._simulated ? 'SIMULATED' : 'HARDWARE')
                        : 'OFFLINE'}
                </span>
                ${this._connected && this._baseStationId ? `<span style="font-size:9px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;">BS: ${this._baseStationId}</span>` : ''}
                <button class="btn btn-sm btn-primary" onclick="LoadCellPage.showAddCell()"><i class="fas fa-plus"></i> Add Load Cell</button>
            </div>
        </div>
        <div class="ptz-layout">
            <div class="ptz-camera-list">
                <div class="card" style="height:100%">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Load Cells</h3></div>
                    <div class="card-body" style="padding:0" id="lc-list-inner">
                        ${this._renderCellList()}
                    </div>
                </div>
            </div>
            <div class="ptz-controls-area" id="lc-controls">
                ${this._activeCell ? this._renderDetail() : this._renderOverview()}
            </div>
        </div>`;
    },

    // ── Sidebar cell list ──────────────────────────────────────────
    _renderCellList() {
        if (this._cells.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px;font-size:12px">No load cells configured.<br>Click + Add Load Cell to get started.</div>';
        }
        return this._cells.map(c => {
            const sel = this._activeCell?.id === c.id ? 'selected' : '';
            const status = this._getCellStatus(c);
            const dotColor = { ok: '#4ade80', warning: '#fbbf24', overload: '#f87171', offline: '#6b7280' }[status];
            const valStr = c.online ? `${this._fmt(c.value)} ${c.unit}` : 'OFFLINE';
            return `
                <div class="ptz-cam-card ${sel}" onclick="LoadCellPage.selectCell('${c.id}')">
                    <div class="flex" style="align-items:center;gap:8px">
                        <div style="width:10px;height:10px;border-radius:50%;background:${dotColor};flex-shrink:0;box-shadow:0 0 6px ${dotColor}80;"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(c.name)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">${UI.esc(c.address)} &bull; <span class="mono">${UI.esc(valStr)}</span></div>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation();LoadCellPage._removeCell('${c.id}')" title="Remove"><i class="fas fa-times" style="font-size:10px"></i></button>
                    </div>
                </div>`;
        }).join('');
    },

    // ── Overview mode (no cell selected) ───────────────────────────
    _renderOverview() {
        if (this._cells.length === 0) {
            return `
            <div class="sr-empty" style="padding:60px 20px;">
                <i class="fas fa-weight-hanging"></i>
                <h2>No Load Cells Configured</h2>
                <p>Add Broadweigh wireless load cells to monitor real-time weight readings from your motors and hoists.</p>
                <button class="btn btn-primary" onclick="LoadCellPage.showAddCell()"><i class="fas fa-plus"></i> Add Load Cell</button>
            </div>`;
        }
        return `
        <div class="lc-overview-header">
            <h3 style="margin:0;font-size:14px;color:var(--text-secondary);"><i class="fas fa-th-large"></i> All Load Cells Overview</h3>
            <button class="btn btn-sm" onclick="LoadCellPage._activeCell=null;LoadCellPage._refreshAll();" style="font-size:11px;">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        <div class="lc-overview-grid">
            ${this._cells.map(c => this._renderOverviewCard(c)).join('')}
        </div>`;
    },

    _renderOverviewCard(c) {
        const status = this._getCellStatus(c);
        const colors = {
            ok:       { bg: 'linear-gradient(135deg, #064e3b, #065f46)', border: '#4ade80', text: '#4ade80', badge: '#166534' },
            warning:  { bg: 'linear-gradient(135deg, #78350f, #92400e)', border: '#fbbf24', text: '#fbbf24', badge: '#854d0e' },
            overload: { bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: '#f87171', text: '#f87171', badge: '#dc2626' },
            offline:  { bg: 'linear-gradient(135deg, #1f2937, #374151)', border: '#6b7280', text: '#9ca3af', badge: '#4b5563' }
        };
        const col = colors[status];
        const valStr = c.online ? this._fmt(c.value) : '---';
        return `
        <div class="lc-overview-card" onclick="LoadCellPage.selectCell('${c.id}')" style="background:${col.bg};border-color:${col.border}40;">
            <div class="lc-ov-status-bar" style="background:${col.border};"></div>
            <div class="lc-ov-header">
                <span class="lc-ov-name">${UI.esc(c.name)}</span>
                <span class="lc-ov-badge" style="background:${col.badge};color:${col.text};">${status.toUpperCase()}</span>
            </div>
            <div class="lc-ov-value" style="color:${col.text};">${valStr}</div>
            <div class="lc-ov-unit">${c.unit}</div>
            <div class="lc-ov-footer">
                <span>Min: <span class="mono">${this._fmt(c.min)}</span></span>
                <span>Max: <span class="mono">${this._fmt(c.max)}</span></span>
            </div>
        </div>`;
    },

    // ── Detail mode (cell selected) ────────────────────────────────
    _renderDetail() {
        const c = this._activeCell;
        if (!c) return this._renderOverview();
        const status = this._getCellStatus(c);
        const colors = { ok: '#4ade80', warning: '#fbbf24', overload: '#f87171', offline: '#6b7280' };
        const bgGrad = {
            ok:       'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))',
            warning:  'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
            overload: 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(248,113,113,0.08))',
            offline:  'linear-gradient(135deg, rgba(107,114,128,0.15), rgba(107,114,128,0.05))'
        };
        const col = colors[status];
        const valStr = c.online ? this._fmt(c.value) : '---';

        return `
        <!-- Back button -->
        <div style="margin-bottom:12px;">
            <button class="btn btn-sm" onclick="LoadCellPage._activeCell=null;LoadCellPage._refreshAll();">
                <i class="fas fa-arrow-left"></i> All Load Cells
            </button>
        </div>

        <!-- Top bar: large weight display -->
        <div class="lc-topbar" style="background:${bgGrad[status]};border-color:${col}40;">
            <div class="lc-topbar-left">
                <div class="lc-topbar-name">${UI.esc(c.name)}</div>
                <div class="lc-topbar-address">${UI.esc(c.address)}</div>
            </div>
            <div class="lc-topbar-center">
                <div class="lc-topbar-value mono" style="color:${col};" id="lc-live-value">${valStr}</div>
                <div class="lc-topbar-unit">${c.unit}</div>
            </div>
            <div class="lc-topbar-right">
                <span class="lc-status-badge" style="background:${col}25;color:${col};border-color:${col}50;">${status.toUpperCase()}</span>
            </div>
        </div>

        <!-- Cards Row 1: Chart + Statistics -->
        <div class="lc-card-row">
            <div class="card lc-card-flex">
                <div class="card-header"><h3><i class="fas fa-chart-line"></i> Live Graph</h3></div>
                <div class="card-body" style="padding:8px;">
                    <div id="loadcell-chart" class="lc-chart-placeholder">
                        <div class="lc-chart-bars" id="lc-chart-bars"></div>
                        <div class="lc-chart-label">Real-time weight over last 60 readings</div>
                    </div>
                </div>
            </div>
            <div class="card lc-card-flex" style="max-width:320px;">
                <div class="card-header"><h3><i class="fas fa-chart-bar"></i> Statistics</h3></div>
                <div class="card-body" style="padding:0;">
                    <table class="lc-stats-table">
                        <tr><td class="text-muted">Minimum</td><td class="mono" style="color:#38bdf8;">${this._fmt(c.min)} ${c.unit}</td></tr>
                        <tr><td class="text-muted">Maximum</td><td class="mono" style="color:#f87171;">${this._fmt(c.max)} ${c.unit}</td></tr>
                        <tr><td class="text-muted">Average</td><td class="mono" style="color:#fbbf24;">${this._fmt(c.avg)} ${c.unit}</td></tr>
                        <tr><td class="text-muted">Peak</td><td class="mono" style="color:#f87171;font-weight:700;">${this._fmt(c.peak)} ${c.unit}</td></tr>
                        <tr><td class="text-muted">Tare</td><td class="mono">${this._fmt(c.tare)} ${c.unit}</td></tr>
                    </table>
                </div>
            </div>
        </div>

        <!-- Cards Row 2: Limits + Device Info -->
        <div class="lc-card-row">
            <div class="card lc-card-flex">
                <div class="card-header"><h3><i class="fas fa-exclamation-triangle"></i> Limits</h3></div>
                <div class="card-body" style="padding:12px;">
                    <div class="lc-limit-row">
                        <div class="lc-limit-dot" style="background:#38bdf8;"></div>
                        <span class="lc-limit-label">Underload</span>
                        <input type="number" class="form-control lc-limit-input mono" value="${c.underload}" onchange="LoadCellPage._updateLimit('${c.id}','underload',this.value)">
                        <span class="text-muted">${c.unit}</span>
                    </div>
                    <div class="lc-limit-row">
                        <div class="lc-limit-dot" style="background:#fbbf24;"></div>
                        <span class="lc-limit-label">Warning</span>
                        <input type="number" class="form-control lc-limit-input mono" value="${c.warning}" onchange="LoadCellPage._updateLimit('${c.id}','warning',this.value)">
                        <span class="text-muted">${c.unit}</span>
                    </div>
                    <div class="lc-limit-row">
                        <div class="lc-limit-dot" style="background:#f87171;"></div>
                        <span class="lc-limit-label">Overload</span>
                        <input type="number" class="form-control lc-limit-input mono" value="${c.overload}" onchange="LoadCellPage._updateLimit('${c.id}','overload',this.value)">
                        <span class="text-muted">${c.unit}</span>
                    </div>
                    <div class="lc-limit-bar-container">
                        <div class="lc-limit-bar">
                            <div class="lc-limit-zone" style="width:${this._limitPct(c, c.underload)}%;background:#38bdf820;border-right:2px solid #38bdf8;"></div>
                            <div class="lc-limit-zone" style="width:${this._limitPct(c, c.warning) - this._limitPct(c, c.underload)}%;background:#4ade8020;"></div>
                            <div class="lc-limit-zone" style="width:${this._limitPct(c, c.overload) - this._limitPct(c, c.warning)}%;background:#fbbf2420;border-right:2px solid #fbbf24;"></div>
                            <div class="lc-limit-zone" style="flex:1;background:#f8717120;"></div>
                            ${c.online ? `<div class="lc-limit-needle" style="left:${this._limitPct(c, c.value)}%;"></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="card lc-card-flex" style="max-width:320px;">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> Device Info</h3></div>
                <div class="card-body" style="padding:0;">
                    <table class="lc-stats-table">
                        <tr><td class="text-muted">Address</td><td class="mono">${UI.esc(c.address)}</td></tr>
                        <tr><td class="text-muted">Signal</td><td>${this._renderSignalBar(c.signal)}</td></tr>
                        <tr><td class="text-muted">Battery</td><td>${this._renderBattery(c.battery)}</td></tr>
                        <tr><td class="text-muted">Last Update</td><td class="mono" style="font-size:10px;">${c.lastUpdate || '--'}</td></tr>
                    </table>
                </div>
            </div>
        </div>

        <!-- Cards Row 3: Actions + Log -->
        <div class="lc-card-row">
            <div class="card lc-card-flex" style="max-width:320px;">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Actions</h3></div>
                <div class="card-body" style="padding:12px;">
                    <div class="flex gap-sm" style="flex-wrap:wrap;">
                        <button class="btn btn-sm" onclick="LoadCellPage._tare('${c.id}')"><i class="fas fa-balance-scale"></i> Tare / Zero</button>
                        <button class="btn btn-sm" onclick="LoadCellPage._resetPeak('${c.id}')"><i class="fas fa-undo"></i> Reset Peak</button>
                        <button class="btn btn-sm" onclick="LoadCellPage._exportData('${c.id}')"><i class="fas fa-file-export"></i> Export Data</button>
                    </div>
                </div>
            </div>
            <div class="card lc-card-flex">
                <div class="card-header"><h3><i class="fas fa-terminal"></i> Event Log</h3></div>
                <div class="card-body" style="padding:0;">
                    <div class="lc-log-container" id="lc-log-container">
                        ${(c.log && c.log.length > 0)
                            ? c.log.slice(-50).reverse().map(l => `<div class="lc-log-entry ${l.type || ''}">${UI.esc(l.time)} &mdash; ${UI.esc(l.msg)}</div>`).join('')
                            : '<div class="text-muted" style="padding:12px;font-size:11px;text-align:center;">No events yet</div>'
                        }
                    </div>
                </div>
            </div>
        </div>`;
    },

    // ── Mini chart (bar-style sparkline) ───────────────────────────
    _chartHistory: {},

    _pushChartValue(cellId, value) {
        if (!this._chartHistory[cellId]) this._chartHistory[cellId] = [];
        this._chartHistory[cellId].push(value);
        if (this._chartHistory[cellId].length > 60) this._chartHistory[cellId].shift();
    },

    _renderChartBars(cellId) {
        const data = this._chartHistory[cellId] || [];
        if (data.length < 2) return '';
        const max = Math.max(...data, 1);
        return data.map(v => {
            const pct = Math.max(2, (v / max) * 100);
            const cell = this._cells.find(c => c.id === cellId);
            let barColor = '#4ade80';
            if (cell) {
                if (v >= cell.overload) barColor = '#f87171';
                else if (v >= cell.warning) barColor = '#fbbf24';
            }
            return `<div class="lc-chart-bar" style="height:${pct}%;background:${barColor};"></div>`;
        }).join('');
    },

    // ── Helpers ─────────────────────────────────────────────────────
    _fmt(val) {
        if (val == null || isNaN(val)) return '0.0';
        return Number(val).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },

    _getCellStatus(c) {
        if (!c.online) return 'offline';
        if (c.value >= c.overload) return 'overload';
        if (c.value >= c.warning) return 'warning';
        return 'ok';
    },

    _limitPct(c, val) {
        const range = (c.overload || 1000) * 1.2;
        return Math.min(100, Math.max(0, (val / range) * 100));
    },

    _renderSignalBar(signal) {
        const s = signal || 0;
        const bars = [20, 40, 60, 80, 100];
        return `<div style="display:inline-flex;align-items:flex-end;gap:1px;height:14px;">
            ${bars.map(thresh => `<div style="width:3px;height:${thresh / 100 * 14}px;border-radius:1px;background:${s >= thresh ? '#4ade80' : '#333'};"></div>`).join('')}
            <span class="mono" style="font-size:10px;margin-left:4px;">${s}%</span>
        </div>`;
    },

    _renderBattery(bat) {
        const b = bat || 0;
        const col = b > 50 ? '#4ade80' : b > 20 ? '#fbbf24' : '#f87171';
        return `<div style="display:inline-flex;align-items:center;gap:4px;">
            <div style="width:24px;height:12px;border:1px solid ${col};border-radius:2px;padding:1px;position:relative;">
                <div style="width:${b}%;height:100%;background:${col};border-radius:1px;"></div>
                <div style="position:absolute;right:-4px;top:3px;width:2px;height:6px;background:${col};border-radius:0 1px 1px 0;"></div>
            </div>
            <span class="mono" style="font-size:10px;">${b}%</span>
        </div>`;
    },

    // ── Cell selection ──────────────────────────────────────────────
    selectCell(id) {
        this._activeCell = this._cells.find(c => c.id === id) || null;
        this._refreshAll();
    },

    // ── Add cell modal ─────────────────────────────────────────────
    showAddCell() {
        UI.openModal('Add Load Cell', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <label style="font-size:12px;color:var(--text-secondary);">Name
                    <input type="text" id="lc-add-name" class="form-control" placeholder="e.g. Motor 1" style="margin-top:4px;">
                </label>
                <label style="font-size:12px;color:var(--text-secondary);">Address (hex expression)
                    <input type="text" id="lc-add-address" class="form-control mono" placeholder="e.g. <5CB7>" style="margin-top:4px;">
                </label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="font-size:12px;color:var(--text-secondary);">Unit
                        <select id="lc-add-unit" class="form-control" style="margin-top:4px;">
                            <option value="kg">kg</option>
                            <option value="lbs">lbs</option>
                            <option value="kN">kN</option>
                            <option value="t">t (tonnes)</option>
                        </select>
                    </label>
                    <label style="font-size:12px;color:var(--text-secondary);">Tare Value
                        <input type="number" id="lc-add-tare" class="form-control mono" value="0" style="margin-top:4px;">
                    </label>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    <label style="font-size:12px;color:#38bdf8;">Underload Limit
                        <input type="number" id="lc-add-underload" class="form-control mono" value="50" style="margin-top:4px;">
                    </label>
                    <label style="font-size:12px;color:#fbbf24;">Warning Limit
                        <input type="number" id="lc-add-warning" class="form-control mono" value="800" style="margin-top:4px;">
                    </label>
                    <label style="font-size:12px;color:#f87171;">Overload Limit
                        <input type="number" id="lc-add-overload" class="form-control mono" value="1000" style="margin-top:4px;">
                    </label>
                </div>
            </div>
        `, `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="LoadCellPage._addCell()"><i class="fas fa-plus"></i> Add</button>
        `);
    },

    _addCell() {
        const name = (document.getElementById('lc-add-name')?.value || '').trim();
        const address = (document.getElementById('lc-add-address')?.value || '').trim();
        const unit = document.getElementById('lc-add-unit')?.value || 'kg';
        const tare = parseFloat(document.getElementById('lc-add-tare')?.value) || 0;
        const underload = parseFloat(document.getElementById('lc-add-underload')?.value) || 50;
        const warning = parseFloat(document.getElementById('lc-add-warning')?.value) || 800;
        const overload = parseFloat(document.getElementById('lc-add-overload')?.value) || 1000;

        if (!name) { UI.toast('Name is required', 'error'); return; }
        if (this._cells.length >= 8) { UI.toast('Maximum 8 load cells supported', 'error'); return; }

        const cell = {
            id: 'lc_' + Date.now(),
            name,
            address: address || '<0000>',
            host: '',
            online: false,
            value: 0,
            unit,
            min: 0,
            max: 0,
            avg: 0,
            peak: 0,
            tare,
            underload,
            warning,
            overload,
            battery: 0,
            signal: 0,
            lastUpdate: null,
            log: []
        };

        this._cells.push(cell);
        this._readingCount[cell.id] = 0;
        this._saveCells();
        UI.closeModal();
        UI.toast(`Added load cell "${name}"`, 'success');
        this._refreshAll();

        // Auto-start simulation if connected
        if (this._connected) this._bringOnline(cell);
    },

    _removeCell(id) {
        UI.confirm('Remove Load Cell', 'Are you sure you want to remove this load cell?').then(ok => {
            if (!ok) return;
            this._cells = this._cells.filter(c => c.id !== id);
            delete this._chartHistory[id];
            delete this._readingCount[id];
            if (this._activeCell?.id === id) this._activeCell = null;
            this._saveCells();
            this._refreshAll();
            UI.toast('Load cell removed', 'info');
        });
    },

    // ── Limit editing ──────────────────────────────────────────────
    _updateLimit(cellId, field, value) {
        const cell = this._cells.find(c => c.id === cellId);
        if (cell) {
            cell[field] = parseFloat(value) || 0;
            this._saveCells();
            // Refresh only if this is the active cell
            if (this._activeCell?.id === cellId) {
                this._activeCell = cell;
            }
        }
    },

    // ── Actions ────────────────────────────────────────────────────
    _tare(cellId) {
        const cell = this._cells.find(c => c.id === cellId);
        if (!cell) return;
        cell.tare = cell.value;
        this._logEvent(cell, 'Tare set to ' + this._fmt(cell.tare) + ' ' + cell.unit);
        this._saveCells();
        this._refreshAll();
        UI.toast('Tare value set to ' + this._fmt(cell.tare) + ' ' + cell.unit, 'success');
    },

    _resetPeak(cellId) {
        const cell = this._cells.find(c => c.id === cellId);
        if (!cell) return;
        cell.peak = cell.value;
        cell.min = cell.value;
        cell.max = cell.value;
        this._readingCount[cellId] = 1;
        cell.avg = cell.value;
        this._logEvent(cell, 'Peak/Min/Max reset');
        this._saveCells();
        this._refreshAll();
        UI.toast('Statistics reset', 'success');
    },

    _exportData(cellId) {
        const cell = this._cells.find(c => c.id === cellId);
        if (!cell) return;
        const history = this._chartHistory[cellId] || [];
        const lines = [
            'Broadweigh Load Cell Export',
            `Name: ${cell.name}`,
            `Address: ${cell.address}`,
            `Unit: ${cell.unit}`,
            `Exported: ${new Date().toISOString()}`,
            '',
            'Statistics:',
            `  Min: ${cell.min}`,
            `  Max: ${cell.max}`,
            `  Avg: ${cell.avg}`,
            `  Peak: ${cell.peak}`,
            `  Tare: ${cell.tare}`,
            '',
            'Limits:',
            `  Underload: ${cell.underload}`,
            `  Warning: ${cell.warning}`,
            `  Overload: ${cell.overload}`,
            '',
            'Recent Readings (' + history.length + '):',
            ...history.map((v, i) => `  ${i + 1}: ${v}`),
            '',
            'Event Log:',
            ...cell.log.map(l => `  [${l.time}] ${l.msg}`)
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loadcell_${cell.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Data exported', 'success');
    },

    // ── Event logging ──────────────────────────────────────────────
    _logEvent(cell, msg, type) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
        cell.log.push({ time, msg, type: type || '' });
        if (cell.log.length > 200) cell.log.splice(0, cell.log.length - 200);
    },

    // ── Connection ─────────────────────────────────────────────────
    async _connect() {
        const isElectron = typeof window.luxorBroadweigh !== 'undefined';

        if (isElectron) {
            // Real bridge via Electron IPC
            UI.toast('Starting Broadweigh bridge...', 'info');
            this._simulated = false;
            this._baseStationId = null;
            const result = await window.luxorBroadweigh.start();
            if (!result.ok) {
                UI.toast(result.error || 'Failed to start bridge', 'error');
                return;
            }
            this._connected = true;
            this._setupBridgeListener();
            UI.toast('Broadweigh bridge started', 'success');
        } else {
            // Simulation mode in browser
            const port = document.getElementById('lc-com-port')?.value;
            this._comPort = port || 'SIM';
            this._connected = true;
            this._simulated = true;
            this._baseStationId = null;
            UI.toast('Connected (simulation mode — no Electron/DLL)', 'warning');
            this._cells.forEach(c => this._bringOnline(c));
            this._startSimulation();
        }
        this._refreshAll();
    },

    async _disconnect() {
        const isElectron = typeof window.luxorBroadweigh !== 'undefined';
        if (isElectron) {
            await window.luxorBroadweigh.stop();
        }
        this._connected = false;
        this._simulated = false;
        this._baseStationId = null;
        this._stopSimulation();
        this._cells.forEach(c => {
            c.online = false;
            this._logEvent(c, 'Disconnected');
        });
        this._refreshAll();
        UI.toast('Disconnected', 'info');
    },

    _bridgeListenerSetup: false,
    _setupBridgeListener() {
        if (this._bridgeListenerSetup) return;
        this._bridgeListenerSetup = true;

        window.luxorBroadweigh.onData((data) => {
            if (data.type === 'data') {
                // Match data tag to a cell by address
                const tag = data.tag?.toLowerCase();
                const cell = this._cells.find(c => c.address?.toLowerCase().replace(/[<>]/g, '') === tag);
                if (cell) {
                    cell.online = true;
                    cell.signal = data.rssi ? Math.min(100, Math.max(0, 100 + data.rssi)) : cell.signal;
                    cell.battery = data.lowBatt ? 10 : (cell.battery || 100);
                    cell.lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });
                    const value = data.value - (cell.tare || 0);
                    this._onDataReceived(cell.id, value);
                    this._updateLiveUI();
                }
            } else if (data.type === 'status') {
                if (data.connected === false) {
                    this._connected = false;
                    this._simulated = false;
                    this._baseStationId = null;
                    this._cells.forEach(c => { c.online = false; });
                    this._refreshAll();
                    if (data.reason) UI.toast(`Bridge: ${data.reason}`, 'warning');
                } else if (data.simulated) {
                    this._simulated = true;
                    this._baseStationId = null;
                    UI.toast('Running in SIMULATION mode (no DLL/hardware detected)', 'warning');
                    this._cells.forEach(c => this._bringOnline(c));
                    this._refreshAll();
                } else {
                    this._simulated = false;
                    if (data.baseStationId) {
                        this._baseStationId = data.baseStationId;
                        UI.toast(`Base station connected (ID: ${data.baseStationId}, Ch: ${data.channel})`, 'success');
                    }
                    this._cells.forEach(c => this._bringOnline(c));
                    this._refreshAll();
                }
                this._refreshAll();
            } else if (data.type === 'error') {
                console.error('[Broadweigh]', data.message);
                UI.toast(`Broadweigh: ${data.message}`, 'error');
            } else if (data.type === 'info') {
                console.log('[Broadweigh]', data.message);
            }
        });
    },

    _bringOnline(cell) {
        cell.online = true;
        cell.battery = 75 + Math.floor(Math.random() * 25);
        cell.signal = 60 + Math.floor(Math.random() * 40);
        cell.value = 200 + Math.random() * 400;
        cell.min = cell.value;
        cell.max = cell.value;
        cell.avg = cell.value;
        cell.peak = cell.value;
        this._readingCount[cell.id] = 1;
        this._logEvent(cell, 'Cell online');
    },

    // ── Simulation ─────────────────────────────────────────────────
    _startSimulation() {
        if (this._simRunning) return;
        this._simRunning = true;
        this._simTimer = setInterval(() => this._simulateData(), 1000);
    },

    _stopSimulation() {
        this._simRunning = false;
        if (this._simTimer) { clearInterval(this._simTimer); this._simTimer = null; }
    },

    _simulateData() {
        if (!this._isActive || !this._connected) return;

        this._cells.forEach(c => {
            if (!c.online) return;

            // Random walk around a base load with occasional spikes
            const drift = (Math.random() - 0.48) * 30;
            const spike = Math.random() < 0.02 ? (Math.random() * 200) : 0;
            let newVal = c.value + drift + spike;
            // Keep value somewhat realistic
            newVal = Math.max(0, Math.min(c.overload * 1.3, newVal));

            this._onDataReceived(c.id, newVal);
        });

        // Targeted UI updates (avoid full re-render for performance)
        this._updateLiveUI();
    },

    // ── Hook: called when real data arrives from DLL bridge ────────
    _onDataReceived(cellId, value) {
        const cell = this._cells.find(c => c.id === cellId);
        if (!cell) return;

        const prevStatus = this._getCellStatus(cell);
        cell.value = value;
        cell.lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false });

        // Statistics
        if (value < cell.min) cell.min = value;
        if (value > cell.max) cell.max = value;
        if (value > cell.peak) cell.peak = value;

        // Running average
        const count = (this._readingCount[cellId] || 0) + 1;
        this._readingCount[cellId] = count;
        cell.avg = cell.avg + (value - cell.avg) / count;

        // Chart
        this._pushChartValue(cellId, value);

        // Status change logging
        const newStatus = this._getCellStatus(cell);
        if (newStatus !== prevStatus) {
            if (newStatus === 'overload') {
                this._logEvent(cell, `OVERLOAD! ${this._fmt(value)} ${cell.unit} exceeds limit of ${this._fmt(cell.overload)} ${cell.unit}`, 'error');
            } else if (newStatus === 'warning') {
                this._logEvent(cell, `Warning: ${this._fmt(value)} ${cell.unit} approaching limit`, 'warn');
            } else if (newStatus === 'ok' && prevStatus !== 'offline') {
                this._logEvent(cell, `Returned to normal: ${this._fmt(value)} ${cell.unit}`);
            }
        }
    },

    // ── Bridge commands ──────────────────────────────────────────────
    async _bridgeCommand(cmd) {
        if (typeof window.luxorBroadweigh !== 'undefined') {
            return await window.luxorBroadweigh.command(cmd);
        }
        return { ok: false, error: 'Not in Electron' };
    },

    async _wakeAll() {
        await this._bridgeCommand({ cmd: 'wakeAll' });
        UI.toast('Wake All sent', 'info');
    },

    async _sleepAll() {
        await this._bridgeCommand({ cmd: 'sleepAll' });
        UI.toast('Sleep All sent', 'info');
    },

    // ── Live UI updates (partial, avoids full re-render) ───────────
    _updateLiveUI() {
        // Update sidebar list
        const listEl = document.getElementById('lc-list-inner');
        if (listEl) listEl.innerHTML = this._renderCellList();

        if (this._activeCell) {
            // Update the detail view's live value
            const c = this._cells.find(x => x.id === this._activeCell.id);
            if (c) {
                this._activeCell = c;
                const status = this._getCellStatus(c);
                const colors = { ok: '#4ade80', warning: '#fbbf24', overload: '#f87171', offline: '#6b7280' };
                const col = colors[status];

                const valEl = document.getElementById('lc-live-value');
                if (valEl) {
                    valEl.textContent = c.online ? this._fmt(c.value) : '---';
                    valEl.style.color = col;
                }

                // Update chart
                const chartEl = document.getElementById('lc-chart-bars');
                if (chartEl) chartEl.innerHTML = this._renderChartBars(c.id);

                // Update log (only if log container visible)
                const logEl = document.getElementById('lc-log-container');
                if (logEl && c.log.length > 0) {
                    logEl.innerHTML = c.log.slice(-50).reverse().map(l =>
                        `<div class="lc-log-entry ${l.type || ''}">${UI.esc(l.time)} &mdash; ${UI.esc(l.msg)}</div>`
                    ).join('');
                }
            }
        } else {
            // Overview mode: update all overview cards
            const ctrlEl = document.getElementById('lc-controls');
            if (ctrlEl && !this._activeCell) {
                ctrlEl.innerHTML = this._renderOverview();
            }
        }
    },

    // ── Full refresh ───────────────────────────────────────────────
    _refreshAll() {
        const listEl = document.getElementById('lc-list-inner');
        if (listEl) listEl.innerHTML = this._renderCellList();
        const ctrlEl = document.getElementById('lc-controls');
        if (ctrlEl) ctrlEl.innerHTML = this._activeCell ? this._renderDetail() : this._renderOverview();

        // Render chart bars if in detail view
        if (this._activeCell) {
            const chartEl = document.getElementById('lc-chart-bars');
            if (chartEl) chartEl.innerHTML = this._renderChartBars(this._activeCell.id);
        }
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && this._isActive) {
            if (document.getElementById('lc-controls')) {
                this._refreshAll();
            } else {
                container.innerHTML = this.render();
            }
        }
    },

    // ── Persistence ────────────────────────────────────────────────
    _saveCells() {
        try {
            // Save without log arrays to keep storage small
            const lite = this._cells.map(c => {
                const copy = { ...c };
                copy.log = [];
                return copy;
            });
            localStorage.setItem('luxor_loadcells', JSON.stringify(lite));
        } catch {}
    },

    _loadCells() {
        try {
            const data = localStorage.getItem('luxor_loadcells');
            if (data) {
                this._cells = JSON.parse(data).map(c => {
                    c.log = c.log || [];
                    c.online = false;
                    return c;
                });
            }
        } catch {}
    },

    // ── Lifecycle ──────────────────────────────────────────────────
    onActivate() {
        this._isActive = true;
        this._loadCells();
        // Re-select previously active cell
        if (this._activeCell) {
            this._activeCell = this._cells.find(c => c.id === this._activeCell.id) || null;
        }
        this.refresh();
    },

    onDeactivate() {
        this._isActive = false;
        this._stopSimulation();
    },

    // ── Page CSS ───────────────────────────────────────────────────
    _css() {
        return `
        /* Connection badge */
        .lc-conn-badge {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
            padding: 4px 12px; border-radius: 12px;
        }
        .lc-conn-online { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
        .lc-conn-sim { background: rgba(250,204,21,0.15); color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
        .lc-conn-offline { background: rgba(107,114,128,0.15); color: #9ca3af; border: 1px solid rgba(107,114,128,0.3); }
        .lc-conn-dot {
            width: 7px; height: 7px; border-radius: 50%;
        }
        .lc-conn-online .lc-conn-dot { background: #4ade80; box-shadow: 0 0 6px #4ade8080; }
        .lc-conn-sim .lc-conn-dot { background: #facc15; box-shadow: 0 0 6px #facc1580; }
        .lc-conn-offline .lc-conn-dot { background: #6b7280; }

        /* Top bar — large weight display */
        .lc-topbar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px 24px; border-radius: 12px;
            border: 1px solid; margin-bottom: 16px;
        }
        .lc-topbar-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
        .lc-topbar-address { font-size: 11px; color: var(--text-muted); font-family: var(--mono); margin-top: 2px; }
        .lc-topbar-center { text-align: center; }
        .lc-topbar-value { font-size: 56px; font-weight: 800; line-height: 1; letter-spacing: -1px; }
        .lc-topbar-unit { font-size: 16px; color: var(--text-secondary); margin-top: 4px; font-weight: 600; }
        .lc-topbar-right { text-align: right; }
        .lc-status-badge {
            display: inline-block; font-size: 11px; font-weight: 700;
            padding: 5px 14px; border-radius: 12px; letter-spacing: 0.5px;
            border: 1px solid;
        }

        /* Card rows */
        .lc-card-row {
            display: flex; gap: 12px; margin-bottom: 12px;
        }
        .lc-card-flex { flex: 1; min-width: 0; }

        /* Statistics table */
        .lc-stats-table { width: 100%; border-collapse: collapse; }
        .lc-stats-table td {
            padding: 8px 14px; font-size: 12px;
            border-bottom: 1px solid var(--border-light);
        }
        .lc-stats-table tr:last-child td { border-bottom: none; }
        .lc-stats-table td:first-child { width: 100px; }
        .lc-stats-table td:last-child { text-align: right; font-weight: 500; }

        /* Limits */
        .lc-limit-row {
            display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
        }
        .lc-limit-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .lc-limit-label { font-size: 12px; font-weight: 600; width: 80px; color: var(--text-secondary); }
        .lc-limit-input { width: 100px; font-size: 12px; padding: 4px 8px; }
        .lc-limit-bar-container { margin-top: 12px; }
        .lc-limit-bar {
            display: flex; height: 8px; border-radius: 4px; overflow: hidden;
            background: var(--bg-tertiary); position: relative;
        }
        .lc-limit-zone { height: 100%; }
        .lc-limit-needle {
            position: absolute; top: -4px; width: 3px; height: 16px;
            background: #fff; border-radius: 2px;
            box-shadow: 0 0 6px rgba(255,255,255,0.5);
            transform: translateX(-50%);
        }

        /* Chart placeholder */
        .lc-chart-placeholder {
            height: 200px; background: var(--bg-primary); border-radius: 8px;
            display: flex; flex-direction: column; position: relative; overflow: hidden;
        }
        .lc-chart-bars {
            flex: 1; display: flex; align-items: flex-end; gap: 1px; padding: 8px;
        }
        .lc-chart-bar {
            flex: 1; min-width: 1px; border-radius: 1px 1px 0 0;
            transition: height 0.3s ease;
        }
        .lc-chart-label {
            text-align: center; font-size: 10px; color: var(--text-muted);
            padding: 4px 0 6px; background: var(--bg-primary);
        }

        /* Log */
        .lc-log-container {
            max-height: 180px; overflow-y: auto; font-size: 11px;
            font-family: var(--mono);
        }
        .lc-log-entry {
            padding: 4px 12px; border-bottom: 1px solid var(--border-light);
            color: var(--text-secondary);
        }
        .lc-log-entry.error { color: #f87171; }
        .lc-log-entry.warn { color: #fbbf24; }

        /* Overview grid */
        .lc-overview-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 16px;
        }
        .lc-overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 14px;
        }
        .lc-overview-card {
            position: relative; border-radius: 14px; padding: 20px 22px 16px;
            border: 1px solid; cursor: pointer;
            transition: transform 0.15s, box-shadow 0.15s;
            overflow: hidden;
        }
        .lc-overview-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .lc-ov-status-bar {
            position: absolute; top: 0; left: 0; right: 0; height: 4px;
        }
        .lc-ov-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 10px;
        }
        .lc-ov-name {
            font-size: 14px; font-weight: 700; color: var(--text-primary);
        }
        .lc-ov-badge {
            font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
            padding: 3px 10px; border-radius: 8px;
        }
        .lc-ov-value {
            font-size: 42px; font-weight: 800; font-family: var(--mono);
            line-height: 1; letter-spacing: -1px;
        }
        .lc-ov-unit {
            font-size: 14px; color: var(--text-muted); font-weight: 600;
            margin-top: 2px; margin-bottom: 12px;
        }
        .lc-ov-footer {
            display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 900px) {
            .lc-card-row { flex-direction: column; }
            .lc-card-flex { max-width: 100% !important; }
            .lc-topbar { flex-direction: column; text-align: center; gap: 12px; }
            .lc-topbar-right { text-align: center; }
            .lc-overview-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        }
        `;
    }
};
