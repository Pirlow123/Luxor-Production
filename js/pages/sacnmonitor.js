/**
 * sACN / Art-Net DMX Monitor
 * Live 512-channel grid with universe selection, channel detail, heatmap,
 * snapshot comparison, filters, stats, and simulated / live data support.
 */
const SacnMonitorPage = {

    // ---- State ----
    _mode: 'sacn',           // 'sacn' | 'artnet'
    _universe: 1,
    _dmx: new Uint8Array(512),
    _snapshot: null,          // Uint8Array(512) or null
    _labels: {},              // { "ch_1": "Dimmer", ... }
    _selectedCh: null,        // 0-based index or null
    _history: {},             // { chIndex: [val, val, ...] }  (last 60 samples)
    _maxHistory: 60,
    _filterActive: false,
    _filterLabeled: false,
    _isActive: false,
    _pollTimer: null,
    _dgramSocket: null,
    _randomTimer: null,

    _STORAGE_KEY: 'luxor_dmx_labels',
    _COLS: 32,
    _ROWS: 16,

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        this._loadLabels();
        const stats = this._getStats();

        return `
        <div class="sacn-page">
            <div class="sacn-header">
                <div style="display:flex;align-items:center;gap:12px;flex:1">
                    <h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-broadcast-tower" style="color:var(--accent);margin-right:8px"></i>sACN / Art-Net DMX Monitor</h2>
                    <span class="badge" style="background:var(--bg-tertiary);font-size:10px">Universe ${this._universe}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-sm" onclick="SacnMonitorPage._clearAll()" title="Clear All"><i class="fas fa-eraser"></i> Clear</button>
                    <button class="btn btn-sm" onclick="SacnMonitorPage._takeSnapshot()" title="Snapshot"><i class="fas fa-camera"></i> Snapshot</button>
                    ${this._snapshot ? `<button class="btn btn-sm btn-danger" onclick="SacnMonitorPage._clearSnapshot()" title="Clear Snapshot"><i class="fas fa-times"></i> Clear Snap</button>` : ''}
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="sacn-summary">
                <div class="sacn-summary-card">
                    <div class="sacn-summary-icon" style="color:var(--accent)"><i class="fas fa-hashtag"></i></div>
                    <div class="sacn-summary-data">
                        <div class="sacn-summary-val">${stats.active}</div>
                        <div class="sacn-summary-label">Active Channels</div>
                    </div>
                </div>
                <div class="sacn-summary-card">
                    <div class="sacn-summary-icon" style="color:var(--green)"><i class="fas fa-arrow-up"></i></div>
                    <div class="sacn-summary-data">
                        <div class="sacn-summary-val">${stats.max}</div>
                        <div class="sacn-summary-label">Max Value</div>
                    </div>
                </div>
                <div class="sacn-summary-card">
                    <div class="sacn-summary-icon" style="color:var(--accent)"><i class="fas fa-arrow-down"></i></div>
                    <div class="sacn-summary-data">
                        <div class="sacn-summary-val">${stats.minNonZero}</div>
                        <div class="sacn-summary-label">Min Non-Zero</div>
                    </div>
                </div>
                <div class="sacn-summary-card">
                    <div class="sacn-summary-icon" style="color:var(--text-muted)"><i class="fas fa-chart-bar"></i></div>
                    <div class="sacn-summary-data">
                        <div class="sacn-summary-val">${stats.avg}</div>
                        <div class="sacn-summary-label">Average</div>
                    </div>
                </div>
            </div>

            <!-- Mode Tabs & Universe Selector -->
            <div class="sacn-controls">
                <div class="sacn-tabs">
                    <button class="sacn-tab ${this._mode === 'sacn' ? 'active' : ''}" onclick="SacnMonitorPage._setMode('sacn')"><i class="fas fa-wave-square"></i> sACN</button>
                    <button class="sacn-tab ${this._mode === 'artnet' ? 'active' : ''}" onclick="SacnMonitorPage._setMode('artnet')"><i class="fas fa-broadcast-tower"></i> Art-Net</button>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <label style="font-size:11px;color:var(--text-muted)">Universe:</label>
                    <input type="number" class="sacn-input" style="width:90px" id="sacn-uni-input"
                        min="${this._mode === 'sacn' ? 1 : 0}" max="${this._mode === 'sacn' ? 63999 : 32767}"
                        value="${this._universe}"
                        onchange="SacnMonitorPage._setUniverse(Number(this.value))">
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <label class="sacn-check-label"><input type="checkbox" ${this._filterActive ? 'checked' : ''} onchange="SacnMonitorPage._toggleFilter('active', this.checked)"> Active only</label>
                    <label class="sacn-check-label"><input type="checkbox" ${this._filterLabeled ? 'checked' : ''} onchange="SacnMonitorPage._toggleFilter('labeled', this.checked)"> Labeled only</label>
                </div>
            </div>

            <!-- Main Content: Grid + Detail -->
            <div class="sacn-main">
                <div class="sacn-grid-section">
                    <!-- Universe Overview Heatmap -->
                    <div class="sacn-heatmap-wrap">
                        <div class="sacn-heatmap-title"><i class="fas fa-th"></i> Universe Overview</div>
                        <div class="sacn-heatmap" id="sacn-heatmap">${this._renderHeatmap()}</div>
                    </div>

                    <!-- DMX Grid -->
                    <div class="sacn-grid-wrap">
                        <div class="sacn-grid" id="sacn-grid">${this._renderGrid()}</div>
                    </div>
                </div>

                <!-- Channel Detail Panel -->
                <div class="sacn-detail" id="sacn-detail">
                    ${this._renderDetail()}
                </div>
            </div>
        </div>`;
    },

    // ============================================================
    // DMX GRID
    // ============================================================
    _renderGrid() {
        let html = '';
        for (let i = 0; i < 512; i++) {
            const ch = i + 1;
            const val = this._dmx[i];
            const label = this._labels['ch_' + ch] || '';
            const pct = val / 255;
            const isSelected = this._selectedCh === i;
            const isSnapped = this._snapshot && this._snapshot[i] !== this._dmx[i];

            // Filter logic
            if (this._filterActive && val === 0) continue;
            if (this._filterLabeled && !label) continue;

            const bg = this._channelColor(pct);
            const textColor = pct > 0.55 ? '#000' : 'var(--text-primary)';

            html += `<div class="sacn-cell${isSelected ? ' selected' : ''}${isSnapped ? ' snapped' : ''}"
                style="background:${bg};color:${textColor}"
                onclick="SacnMonitorPage._selectChannel(${i})"
                title="Ch ${ch}${label ? ' - ' + label : ''}: ${val}">
                <span class="sacn-cell-ch">${ch}</span>
                <span class="sacn-cell-val">${val}</span>
            </div>`;
        }
        return html;
    },

    _channelColor(pct) {
        if (pct === 0) return 'var(--bg-tertiary)';
        // Blend from dark to accent color
        const r = Math.round(30 + pct * 70);
        const g = Math.round(30 + pct * 160);
        const b = Math.round(40 + pct * 215);
        return `rgb(${r}, ${g}, ${b})`;
    },

    // ============================================================
    // HEATMAP (mini overview)
    // ============================================================
    _renderHeatmap() {
        let html = '';
        for (let i = 0; i < 512; i++) {
            const pct = this._dmx[i] / 255;
            const bg = this._channelColor(pct);
            html += `<div class="sacn-heat-cell" style="background:${bg}" title="Ch ${i + 1}: ${this._dmx[i]}" onclick="SacnMonitorPage._selectChannel(${i})"></div>`;
        }
        return html;
    },

    // ============================================================
    // CHANNEL DETAIL
    // ============================================================
    _renderDetail() {
        if (this._selectedCh === null) {
            return `<div class="sacn-detail-empty"><i class="fas fa-mouse-pointer" style="font-size:24px;opacity:0.3"></i><p>Click a channel to inspect</p></div>`;
        }
        const i = this._selectedCh;
        const ch = i + 1;
        const val = this._dmx[i];
        const hex = '0x' + val.toString(16).toUpperCase().padStart(2, '0');
        const pctVal = ((val / 255) * 100).toFixed(1);
        const label = this._labels['ch_' + ch] || '';
        const history = this._history[i] || [];
        const snapVal = this._snapshot ? this._snapshot[i] : null;
        const snapDiff = snapVal !== null && snapVal !== val;

        return `
        <div class="sacn-detail-header">
            <span class="sacn-detail-ch">Channel ${ch}</span>
            ${snapDiff ? `<span class="badge badge-orange" style="font-size:10px">Changed</span>` : ''}
        </div>
        <div class="sacn-detail-value">${val}</div>
        <div class="sacn-detail-row"><span class="sacn-detail-lbl">Hex</span><span class="sacn-detail-data mono">${hex}</span></div>
        <div class="sacn-detail-row"><span class="sacn-detail-lbl">Percent</span><span class="sacn-detail-data">${pctVal}%</span></div>
        ${snapVal !== null ? `<div class="sacn-detail-row"><span class="sacn-detail-lbl">Snapshot</span><span class="sacn-detail-data${snapDiff ? ' sacn-changed' : ''}">${snapVal}</span></div>` : ''}
        <div class="sacn-detail-row" style="margin-top:8px">
            <label class="sacn-detail-lbl">Label</label>
            <input class="sacn-input" style="flex:1" value="${UI.esc(label)}" placeholder="e.g. Dimmer"
                onchange="SacnMonitorPage._setLabel(${ch}, this.value)">
        </div>
        <div class="sacn-detail-row" style="margin-top:8px">
            <label class="sacn-detail-lbl">Set Value</label>
            <input type="number" class="sacn-input" style="width:70px" min="0" max="255" value="${val}"
                onchange="SacnMonitorPage._setManualValue(${i}, Number(this.value))">
        </div>

        <!-- Mini History Chart -->
        <div class="sacn-detail-chart-title">History (last ${this._maxHistory} samples)</div>
        <div class="sacn-chart" id="sacn-chart">
            ${this._renderMiniChart(history)}
        </div>`;
    },

    _renderMiniChart(history) {
        if (!history.length) return '<div style="color:var(--text-muted);font-size:10px;padding:8px">No history yet</div>';
        const w = 220, h = 60;
        const maxPts = this._maxHistory;
        const step = w / Math.max(maxPts - 1, 1);
        let path = '';
        for (let j = 0; j < history.length; j++) {
            const x = (j * step).toFixed(1);
            const y = (h - (history[j] / 255) * h).toFixed(1);
            path += (j === 0 ? 'M' : 'L') + x + ',' + y;
        }
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
            <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="1.5" />
        </svg>`;
    },

    // ============================================================
    // STATS
    // ============================================================
    _getStats() {
        let active = 0, max = 0, minNZ = 256, sum = 0;
        for (let i = 0; i < 512; i++) {
            const v = this._dmx[i];
            if (v > 0) { active++; sum += v; if (v < minNZ) minNZ = v; }
            if (v > max) max = v;
        }
        return {
            active,
            max,
            minNonZero: active > 0 ? minNZ : 0,
            avg: active > 0 ? (sum / active).toFixed(1) : '0',
        };
    },

    // ============================================================
    // ACTIONS
    // ============================================================
    _setMode(mode) {
        this._mode = mode;
        // Clamp universe to valid range
        if (mode === 'sacn' && this._universe < 1) this._universe = 1;
        if (mode === 'sacn' && this._universe > 63999) this._universe = 63999;
        if (mode === 'artnet' && this._universe > 32767) this._universe = 32767;
        this._restartListener();
        this.refresh();
    },

    _setUniverse(u) {
        const minU = this._mode === 'sacn' ? 1 : 0;
        const maxU = this._mode === 'sacn' ? 63999 : 32767;
        this._universe = Math.max(minU, Math.min(maxU, u || minU));
        this._dmx.fill(0);
        this._history = {};
        this._snapshot = null;
        this._restartListener();
        this.refresh();
    },

    _selectChannel(i) {
        this._selectedCh = i;
        const el = document.getElementById('sacn-detail');
        if (el) el.innerHTML = this._renderDetail();
        // Highlight in grid
        document.querySelectorAll('.sacn-cell.selected').forEach(c => c.classList.remove('selected'));
        const cells = document.querySelectorAll('.sacn-cell');
        cells.forEach(c => {
            const chNum = parseInt(c.querySelector('.sacn-cell-ch')?.textContent);
            if (chNum === i + 1) c.classList.add('selected');
        });
    },

    _setManualValue(i, val) {
        val = Math.max(0, Math.min(255, val));
        this._dmx[i] = val;
        this._pushHistory(i, val);
        this._updateGridCell(i);
        this._updateHeatCell(i);
        this._updateStats();
        if (this._selectedCh === i) {
            const el = document.getElementById('sacn-detail');
            if (el) el.innerHTML = this._renderDetail();
        }
    },

    _setLabel(ch, label) {
        label = label.trim();
        if (label) {
            this._labels['ch_' + ch] = label;
        } else {
            delete this._labels['ch_' + ch];
        }
        this._saveLabels();
        UI.toast('Label updated for channel ' + ch, 'success');
    },

    _toggleFilter(type, checked) {
        if (type === 'active') this._filterActive = checked;
        if (type === 'labeled') this._filterLabeled = checked;
        const gridEl = document.getElementById('sacn-grid');
        if (gridEl) gridEl.innerHTML = this._renderGrid();
    },

    _clearAll() {
        this._dmx.fill(0);
        this._history = {};
        this._refreshGridAndHeatmap();
        this._updateStats();
        if (this._selectedCh !== null) {
            const el = document.getElementById('sacn-detail');
            if (el) el.innerHTML = this._renderDetail();
        }
        UI.toast('All channels cleared', 'info');
    },

    _takeSnapshot() {
        this._snapshot = new Uint8Array(this._dmx);
        this._refreshGridAndHeatmap();
        UI.toast('Snapshot captured (' + this._getStats().active + ' active channels)', 'success');
    },

    _clearSnapshot() {
        this._snapshot = null;
        this._refreshGridAndHeatmap();
        UI.toast('Snapshot cleared', 'info');
    },

    // ============================================================
    // INCREMENTAL UPDATES
    // ============================================================
    _updateGridCell(i) {
        const gridEl = document.getElementById('sacn-grid');
        if (!gridEl) return;
        // Full re-render of grid (filters make indexing unreliable)
        gridEl.innerHTML = this._renderGrid();
    },

    _updateHeatCell(i) {
        const heatEl = document.getElementById('sacn-heatmap');
        if (!heatEl || !heatEl.children[i]) return;
        const pct = this._dmx[i] / 255;
        heatEl.children[i].style.background = this._channelColor(pct);
        heatEl.children[i].title = 'Ch ' + (i + 1) + ': ' + this._dmx[i];
    },

    _updateStats() {
        // Re-render summary by refreshing the whole page is costly;
        // for live updates, just update the grid + detail.
    },

    _refreshGridAndHeatmap() {
        const gridEl = document.getElementById('sacn-grid');
        if (gridEl) gridEl.innerHTML = this._renderGrid();
        const heatEl = document.getElementById('sacn-heatmap');
        if (heatEl) heatEl.innerHTML = this._renderHeatmap();
    },

    _pushHistory(i, val) {
        if (!this._history[i]) this._history[i] = [];
        this._history[i].push(val);
        if (this._history[i].length > this._maxHistory) this._history[i].shift();
    },

    // ============================================================
    // LIVE DATA (Electron dgram for Art-Net)
    // ============================================================
    _restartListener() {
        this._stopListener();
        if (typeof require === 'undefined') return; // Not in Electron
        try {
            const dgram = require('dgram');
            if (this._mode === 'artnet') {
                this._dgramSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
                this._dgramSocket.on('message', (msg) => this._handleArtNetPacket(msg));
                this._dgramSocket.on('error', (err) => {
                    console.warn('[sACN Monitor] dgram error:', err.message);
                    this._stopListener();
                });
                this._dgramSocket.bind(6454, () => {
                    console.log('[sACN Monitor] Listening for Art-Net on port 6454');
                });
            }
        } catch (e) {
            // dgram not available in this environment
        }
    },

    _stopListener() {
        if (this._dgramSocket) {
            try { this._dgramSocket.close(); } catch (e) { /* ignore */ }
            this._dgramSocket = null;
        }
    },

    _handleArtNetPacket(buf) {
        // Art-Net header: "Art-Net\0", opcode 0x5000 (DMX), protocol version
        if (buf.length < 18) return;
        const header = buf.toString('ascii', 0, 7);
        if (header !== 'Art-Net') return;
        const opcode = buf.readUInt16LE(8);
        if (opcode !== 0x5000) return; // OpDmx
        const subUni = buf[14];
        const net = buf[15];
        const packetUni = (net << 8) | subUni;
        if (packetUni !== this._universe) return;
        const length = buf.readUInt16BE(16);
        const dmxData = buf.slice(18, 18 + Math.min(length, 512));
        for (let i = 0; i < dmxData.length; i++) {
            this._dmx[i] = dmxData[i];
            this._pushHistory(i, dmxData[i]);
        }
        if (this._isActive) {
            this._refreshGridAndHeatmap();
            if (this._selectedCh !== null) {
                const el = document.getElementById('sacn-detail');
                if (el) el.innerHTML = this._renderDetail();
            }
        }
    },

    // ============================================================
    // LABELS (localStorage)
    // ============================================================
    _loadLabels() {
        try {
            const raw = localStorage.getItem(this._STORAGE_KEY);
            this._labels = raw ? JSON.parse(raw) : {};
        } catch (e) { this._labels = {}; }
    },

    _saveLabels() {
        try { localStorage.setItem(this._STORAGE_KEY, JSON.stringify(this._labels)); } catch (e) { /* ignore */ }
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    renderSidebarList() {
        // sACN monitor has no sidebar items
    },

    initSidebar() {},

    // ============================================================
    // LIFECYCLE
    // ============================================================
    onActivate() {
        this._isActive = true;
        this._loadLabels();
        if (!this._dgramSocket) this._restartListener();
    },

    onDeactivate() {
        this._isActive = false;
        // Listener keeps running in background to accumulate DMX data
        if (this._randomTimer) { clearInterval(this._randomTimer); this._randomTimer = null; }
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'sacnmonitor') {
            container.innerHTML = this.render();
        }
    },
};

// ================================================================
// CSS -- injected once
// ================================================================
(function() {
    if (document.getElementById('sacn-css')) return;
    const s = document.createElement('style');
    s.id = 'sacn-css';
    s.textContent = `
    .sacn-page { padding: 20px; max-width: 1600px; margin: 0 auto; }
    .sacn-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }

    /* Summary Cards */
    .sacn-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .sacn-summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .sacn-summary-icon { font-size: 22px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-tertiary); }
    .sacn-summary-val { font-size: 24px; font-weight: 700; line-height: 1; }
    .sacn-summary-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* Controls Bar */
    .sacn-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .sacn-tabs { display: flex; gap: 4px; }
    .sacn-tab { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-muted); font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .sacn-tab:hover { border-color: var(--accent); color: var(--text-primary); }
    .sacn-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .sacn-input { padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; outline: none; box-sizing: border-box; }
    .sacn-input:focus { border-color: var(--accent); }
    .sacn-check-label { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; cursor: pointer; }

    /* Main Layout */
    .sacn-main { display: flex; gap: 16px; }
    .sacn-grid-section { flex: 1; min-width: 0; }

    /* Heatmap Overview */
    .sacn-heatmap-wrap { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
    .sacn-heatmap-title { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
    .sacn-heatmap-title i { margin-right: 4px; }
    .sacn-heatmap { display: grid; grid-template-columns: repeat(64, 1fr); gap: 1px; }
    .sacn-heat-cell { width: 100%; aspect-ratio: 1; border-radius: 1px; cursor: pointer; transition: transform 0.1s; }
    .sacn-heat-cell:hover { transform: scale(1.8); z-index: 2; position: relative; }

    /* DMX Grid */
    .sacn-grid-wrap { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; overflow: auto; max-height: 620px; }
    .sacn-grid { display: grid; grid-template-columns: repeat(32, 1fr); gap: 2px; }
    .sacn-cell { width: 40px; height: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 3px; cursor: pointer; font-family: 'JetBrains Mono', monospace; transition: outline 0.15s, transform 0.1s; user-select: none; position: relative; }
    .sacn-cell:hover { outline: 2px solid var(--accent); transform: scale(1.08); z-index: 1; }
    .sacn-cell.selected { outline: 2px solid #fff; box-shadow: 0 0 8px rgba(255,255,255,0.3); }
    .sacn-cell.snapped { box-shadow: inset 0 0 0 2px var(--warning, orange); }
    .sacn-cell-ch { font-size: 8px; opacity: 0.65; line-height: 1; }
    .sacn-cell-val { font-size: 11px; font-weight: 700; line-height: 1.2; }

    /* Detail Panel */
    .sacn-detail { width: 260px; min-width: 260px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px; align-self: flex-start; position: sticky; top: 20px; }
    .sacn-detail-empty { text-align: center; padding: 32px 12px; color: var(--text-muted); }
    .sacn-detail-empty p { margin-top: 8px; font-size: 12px; }
    .sacn-detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .sacn-detail-ch { font-size: 14px; font-weight: 700; }
    .sacn-detail-value { font-size: 48px; font-weight: 800; text-align: center; padding: 12px 0; font-family: 'JetBrains Mono', monospace; color: var(--accent); }
    .sacn-detail-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .sacn-detail-lbl { color: var(--text-muted); font-size: 11px; min-width: 60px; }
    .sacn-detail-data { font-weight: 600; }
    .sacn-detail-data.mono { font-family: 'JetBrains Mono', monospace; }
    .sacn-changed { color: var(--warning, orange); }
    .sacn-detail-chart-title { font-size: 10px; color: var(--text-muted); margin-top: 12px; margin-bottom: 4px; }
    .sacn-chart { background: var(--bg-tertiary); border-radius: 6px; padding: 6px; }

    @media (max-width: 1100px) {
        .sacn-main { flex-direction: column; }
        .sacn-detail { width: 100%; min-width: unset; position: static; }
        .sacn-summary { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
        .sacn-grid { grid-template-columns: repeat(16, 1fr); }
        .sacn-heatmap { grid-template-columns: repeat(32, 1fr); }
    }
    `;
    document.head.appendChild(s);
})();
