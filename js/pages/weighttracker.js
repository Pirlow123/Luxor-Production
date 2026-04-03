/**
 * Weight Tracker Page — Rigging point load management and capacity monitoring
 * Track motor/rigging points, assign load items, monitor utilization
 * Luxor Production
 */
const WeightTrackerPage = {

    // ================================================================
    // STATE
    // ================================================================
    _points: [],     // { id, name, location, capacity, items: [{ id, name, weight, qty }] }
    _nextId: 1,
    _selectedPointId: null,

    // Common equipment weight database (kg)
    _EQUIPMENT_DB: [
        { name: 'Robe MegaPointe',           weight: 39, cat: 'Lighting' },
        { name: 'Robe Spiider',              weight: 23, cat: 'Lighting' },
        { name: 'Robe BMFL Spot',            weight: 37, cat: 'Lighting' },
        { name: 'Robe Robin T1 Profile',     weight: 32, cat: 'Lighting' },
        { name: 'Robe LEDBeam 150',          weight: 6.5, cat: 'Lighting' },
        { name: 'Robe Forte',                weight: 39.5, cat: 'Lighting' },
        { name: 'Martin MAC Aura XB',        weight: 6.8, cat: 'Lighting' },
        { name: 'Clay Paky Sharpy Plus',     weight: 19, cat: 'Lighting' },
        { name: 'GLP impression X5',         weight: 8.5, cat: 'Lighting' },
        { name: 'Chauvet Color Strike M',    weight: 13.3, cat: 'Lighting' },
        { name: 'ETC Source Four',           weight: 8.5, cat: 'Lighting' },
        { name: 'Atomic 3000 Strobe',        weight: 7, cat: 'Lighting' },
        { name: 'LED Par (generic)',         weight: 3, cat: 'Lighting' },
        { name: 'grandMA3 Full-Size',        weight: 35, cat: 'Consoles' },
        { name: 'grandMA3 Light',            weight: 26, cat: 'Consoles' },
        { name: 'grandMA3 Compact XT',       weight: 15, cat: 'Consoles' },
        { name: 'CM Lodestar 1T Motor',      weight: 45, cat: 'Rigging' },
        { name: 'CM Lodestar 500kg Motor',   weight: 32, cat: 'Rigging' },
        { name: 'Movecat 250kg Motor',       weight: 25, cat: 'Rigging' },
        { name: 'Movecat 500kg Motor',       weight: 38, cat: 'Rigging' },
        { name: 'Movecat 1000kg Motor',      weight: 55, cat: 'Rigging' },
        { name: 'Truss 2m (12" box)',        weight: 12, cat: 'Truss' },
        { name: 'Truss 3m (12" box)',        weight: 18, cat: 'Truss' },
        { name: 'Truss 2m (20.5" box)',      weight: 22, cat: 'Truss' },
        { name: 'Truss 3m (20.5" box)',      weight: 33, cat: 'Truss' },
        { name: 'Truss corner block',        weight: 8, cat: 'Truss' },
        { name: 'LED Panel (50x50cm)',       weight: 8, cat: 'Video' },
        { name: 'LED Panel (50x100cm)',      weight: 13.5, cat: 'Video' },
        { name: 'Novastar MCTRL4K',         weight: 5, cat: 'Video' },
        { name: 'Socapex cable (25m)',       weight: 12, cat: 'Cable' },
        { name: 'DMX cable (25m)',           weight: 2, cat: 'Cable' },
        { name: 'Powercon cable (25m)',      weight: 5, cat: 'Cable' },
        { name: 'Shackle 1T',               weight: 0.8, cat: 'Rigging' },
        { name: 'Shackle 2T',               weight: 1.5, cat: 'Rigging' },
        { name: 'Steelwire 1m',             weight: 1, cat: 'Rigging' },
        { name: 'Round Sling 1T',           weight: 0.5, cat: 'Rigging' },
        { name: 'Round Sling 2T',           weight: 1, cat: 'Rigging' },
        { name: 'JBL VTX A12',              weight: 37, cat: 'Audio' },
        { name: 'JBL VTX S28 Sub',          weight: 57, cat: 'Audio' },
        { name: 'd&b E12 Speaker',          weight: 18, cat: 'Audio' },
        { name: 'L-Acoustics K2',           weight: 45, cat: 'Audio' },
    ],

    // ================================================================
    // CSS INJECTION
    // ================================================================
    _injectCSS() {
        if (document.getElementById('weighttracker-css')) return;
        const style = document.createElement('style');
        style.id = 'weighttracker-css';
        style.textContent = `
            .wt-layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; min-height: 500px; }
            .wt-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
            .wt-card-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
            .wt-card-header h3 { font-size: 13px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; }
            .wt-card-body { padding: 16px; }
            .wt-point-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
            .wt-point-item:hover { background: rgba(255,255,255,0.04); }
            .wt-point-item.selected { background: rgba(255,255,255,0.06); border-left: 3px solid var(--accent); }
            .wt-point-item:last-child { border-bottom: none; }
            .wt-point-icon { font-size: 16px; color: var(--accent); width: 24px; text-align: center; }
            .wt-point-info { flex: 1; min-width: 0; }
            .wt-point-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .wt-point-detail { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
            .wt-util-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; margin-top: 4px; }
            .wt-util-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
            .wt-load-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border); margin-bottom: 6px; }
            .wt-load-info { flex: 1; min-width: 0; }
            .wt-load-name { font-size: 11px; font-weight: 600; }
            .wt-load-detail { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
            .wt-load-weight { font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace; min-width: 70px; text-align: right; }
            .wt-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
            .wt-stat { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
            .wt-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
            .wt-stat-value { font-size: 20px; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
            .wt-bar-chart { display: flex; flex-direction: column; gap: 8px; }
            .wt-bar-row { display: flex; align-items: center; gap: 10px; }
            .wt-bar-label { font-size: 11px; min-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .wt-bar-track { flex: 1; height: 20px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; position: relative; }
            .wt-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; display: flex; align-items: center; padding-left: 6px; }
            .wt-bar-text { font-size: 9px; font-weight: 700; color: #fff; white-space: nowrap; }
            .wt-bar-pct { font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; min-width: 50px; text-align: right; }
            .wt-warn { color: #ef4444; }
            .wt-caution { color: #eab308; }
            .wt-ok { color: #22c55e; }
            .wt-alert-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 12px; font-weight: 600; }
            .wt-alert-red { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
            .wt-alert-yellow { background: rgba(234,179,8,0.12); color: #eab308; border: 1px solid rgba(234,179,8,0.3); }
            .wt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .wt-full { grid-column: 1 / -1; }
            .wt-input-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
            .wt-input-row label { font-size: 11px; color: var(--text-muted); min-width: 100px; flex-shrink: 0; }
            .wt-input-row input, .wt-input-row select { width: 180px; }
            .wt-totals-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-tertiary); border-radius: 8px; margin-top: 12px; font-weight: 700; font-size: 12px; }
            .wt-totals-row .mono { font-family: 'JetBrains Mono', monospace; }
            @media (max-width: 900px) {
                .wt-layout { grid-template-columns: 1fr; }
                .wt-stat-grid { grid-template-columns: repeat(2, 1fr); }
                .wt-grid-2 { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    },

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        this._injectCSS();
        const stats = this._calcStats();

        return `
        <div class="section-header">
            <h2><i class="fas fa-weight-hanging"></i> Weight Tracker</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="WeightTrackerPage._exportCSV()"><i class="fas fa-file-csv"></i> Export CSV</button>
                <button class="btn btn-sm btn-primary" onclick="WeightTrackerPage._showAddPoint()"><i class="fas fa-plus"></i> Add Point</button>
            </div>
        </div>

        <!-- Stats -->
        <div class="wt-stat-grid">
            <div class="wt-stat">
                <div class="wt-stat-label">Total Points</div>
                <div class="wt-stat-value">${stats.totalPoints}</div>
            </div>
            <div class="wt-stat">
                <div class="wt-stat-label">Total Weight</div>
                <div class="wt-stat-value">${stats.totalWeight.toFixed(1)} <span style="font-size:12px;color:var(--text-muted)">kg</span></div>
            </div>
            <div class="wt-stat">
                <div class="wt-stat-label">Avg Utilization</div>
                <div class="wt-stat-value ${stats.avgUtil > 100 ? 'wt-warn' : stats.avgUtil > 80 ? 'wt-caution' : 'wt-ok'}">${stats.avgUtil.toFixed(1)}%</div>
            </div>
            <div class="wt-stat">
                <div class="wt-stat-label">Alerts</div>
                <div class="wt-stat-value ${stats.alerts > 0 ? 'wt-warn' : 'wt-ok'}">${stats.alerts}</div>
            </div>
        </div>

        <!-- Safety Alerts -->
        <div id="wt-alerts">${this._renderAlerts()}</div>

        <div class="wt-layout">
            <!-- Points List -->
            <div>
                <div class="wt-card" style="height:100%">
                    <div class="wt-card-header">
                        <h3><i class="fas fa-map-marker-alt"></i> Rigging Points</h3>
                        <button class="btn btn-xs btn-primary" onclick="WeightTrackerPage._showAddPoint()"><i class="fas fa-plus"></i></button>
                    </div>
                    <div style="padding:0;max-height:500px;overflow-y:auto" id="wt-points-list">
                        ${this._renderPointsList()}
                    </div>
                </div>
            </div>

            <!-- Detail Area -->
            <div>
                <div class="wt-grid-2">
                    <!-- Point Detail / Load Items -->
                    <div class="wt-card wt-full" id="wt-detail">
                        ${this._renderDetail()}
                    </div>

                    <!-- Bar Chart -->
                    <div class="wt-card wt-full">
                        <div class="wt-card-header"><h3><i class="fas fa-chart-bar"></i> Visual Overview</h3></div>
                        <div class="wt-card-body" id="wt-chart">
                            ${this._renderBarChart()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // ================================================================
    // STATS
    // ================================================================
    _calcStats() {
        let totalWeight = 0, totalCapacity = 0, alerts = 0;
        for (const pt of this._points) {
            const w = this._pointWeight(pt);
            totalWeight += w;
            totalCapacity += pt.capacity;
            const pct = pt.capacity > 0 ? (w / pt.capacity) * 100 : 0;
            if (pct > 100) alerts++;
        }
        const avgUtil = this._points.length > 0 && totalCapacity > 0 ? (totalWeight / totalCapacity) * 100 : 0;
        return { totalPoints: this._points.length, totalWeight, avgUtil, alerts };
    },

    _pointWeight(pt) {
        return pt.items.reduce((s, it) => s + it.weight * it.qty, 0);
    },

    // ================================================================
    // ALERTS
    // ================================================================
    _renderAlerts() {
        let html = '';
        for (const pt of this._points) {
            const w = this._pointWeight(pt);
            const pct = pt.capacity > 0 ? (w / pt.capacity) * 100 : 0;
            if (pct > 100) {
                html += `<div class="wt-alert-banner wt-alert-red"><i class="fas fa-exclamation-triangle"></i> <strong>${UI.esc(pt.name)}</strong> is OVER CAPACITY (${pct.toFixed(0)}%) &mdash; ${w.toFixed(1)} kg / ${pt.capacity} kg</div>`;
            } else if (pct > 80) {
                html += `<div class="wt-alert-banner wt-alert-yellow"><i class="fas fa-exclamation-circle"></i> <strong>${UI.esc(pt.name)}</strong> nearing capacity (${pct.toFixed(0)}%) &mdash; ${w.toFixed(1)} kg / ${pt.capacity} kg</div>`;
            }
        }
        return html;
    },

    // ================================================================
    // POINTS LIST
    // ================================================================
    _renderPointsList() {
        if (this._points.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:30px;font-size:12px"><i class="fas fa-map-marker-alt" style="font-size:24px;opacity:0.2;display:block;margin-bottom:8px"></i>No rigging points added.<br>Click + to get started.</div>';
        }
        return this._points.map(pt => {
            const w = this._pointWeight(pt);
            const pct = pt.capacity > 0 ? (w / pt.capacity) * 100 : 0;
            const color = pct > 100 ? '#ef4444' : pct > 80 ? '#eab308' : '#22c55e';
            const sel = pt.id === this._selectedPointId;
            return `
            <div class="wt-point-item ${sel ? 'selected' : ''}" onclick="WeightTrackerPage._selectPoint('${pt.id}')">
                <div class="wt-point-icon"><i class="fas fa-map-pin"></i></div>
                <div class="wt-point-info">
                    <div class="wt-point-name">${UI.esc(pt.name)}</div>
                    <div class="wt-point-detail">${UI.esc(pt.location)} &bull; ${w.toFixed(1)} / ${pt.capacity} kg</div>
                    <div class="wt-util-bar"><div class="wt-util-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div></div>
                </div>
                <span style="font-size:11px;font-weight:700;color:${color};font-family:'JetBrains Mono',monospace">${pct.toFixed(0)}%</span>
                <button class="btn-icon" onclick="event.stopPropagation();WeightTrackerPage._removePoint('${pt.id}')" title="Remove"><i class="fas fa-times" style="font-size:10px;color:var(--red)"></i></button>
            </div>`;
        }).join('');
    },

    // ================================================================
    // DETAIL PANEL
    // ================================================================
    _renderDetail() {
        const pt = this._points.find(p => p.id === this._selectedPointId);
        if (!pt) {
            return `
            <div class="wt-card-header"><h3><i class="fas fa-list"></i> Load Items</h3></div>
            <div class="wt-card-body" style="text-align:center;padding:40px;color:var(--text-muted)">
                <i class="fas fa-hand-pointer" style="font-size:32px;opacity:0.2;display:block;margin-bottom:12px"></i>
                <p>Select a rigging point to view and manage its load items.</p>
            </div>`;
        }

        const w = this._pointWeight(pt);
        const pct = pt.capacity > 0 ? (w / pt.capacity) * 100 : 0;
        const remaining = pt.capacity - w;
        const color = pct > 100 ? '#ef4444' : pct > 80 ? '#eab308' : '#22c55e';

        const itemRows = pt.items.length === 0
            ? '<div class="text-muted" style="text-align:center;padding:20px;font-size:11px">No items loaded on this point.</div>'
            : pt.items.map((it, i) => `
                <div class="wt-load-row">
                    <div class="wt-load-info">
                        <div class="wt-load-name">${UI.esc(it.name)}</div>
                        <div class="wt-load-detail">${it.weight} kg &times; ${it.qty}</div>
                    </div>
                    <div class="wt-load-weight">${(it.weight * it.qty).toFixed(1)} kg</div>
                    <button class="btn-icon" onclick="WeightTrackerPage._removeItem('${pt.id}',${i})" title="Remove"><i class="fas fa-times" style="font-size:10px;color:var(--red)"></i></button>
                </div>
            `).join('');

        return `
        <div class="wt-card-header">
            <h3><i class="fas fa-map-pin"></i> ${UI.esc(pt.name)}</h3>
            <div class="flex gap-sm">
                <button class="btn btn-xs" onclick="WeightTrackerPage._showEditPoint('${pt.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-xs btn-primary" onclick="WeightTrackerPage._showAddItem('${pt.id}')"><i class="fas fa-plus"></i> Add Item</button>
            </div>
        </div>
        <div class="wt-card-body">
            <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">
                <div><span class="text-muted" style="font-size:10px">Location:</span><br><strong style="font-size:12px">${UI.esc(pt.location)}</strong></div>
                <div><span class="text-muted" style="font-size:10px">Capacity:</span><br><strong style="font-size:12px">${pt.capacity} kg</strong></div>
                <div><span class="text-muted" style="font-size:10px">Current Load:</span><br><strong style="font-size:12px;color:${color}">${w.toFixed(1)} kg (${pct.toFixed(0)}%)</strong></div>
                <div><span class="text-muted" style="font-size:10px">Remaining:</span><br><strong style="font-size:12px;color:${remaining < 0 ? '#ef4444' : 'var(--text-primary)'}">${remaining.toFixed(1)} kg</strong></div>
            </div>
            <div class="wt-util-bar" style="height:10px;margin-bottom:14px"><div class="wt-util-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div></div>
            ${itemRows}
            <div class="wt-totals-row">
                <span style="flex:1">Total</span>
                <span class="mono" style="color:${color}">${w.toFixed(1)} kg</span>
            </div>
        </div>`;
    },

    // ================================================================
    // BAR CHART
    // ================================================================
    _renderBarChart() {
        if (this._points.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:30px;font-size:11px">Add rigging points to see the visual overview.</div>';
        }

        return '<div class="wt-bar-chart">' + this._points.map(pt => {
            const w = this._pointWeight(pt);
            const pct = pt.capacity > 0 ? (w / pt.capacity) * 100 : 0;
            const color = pct > 100 ? '#ef4444' : pct > 80 ? '#eab308' : '#22c55e';
            const barPct = Math.min(pct, 100);
            return `
            <div class="wt-bar-row">
                <div class="wt-bar-label">${UI.esc(pt.name)}</div>
                <div class="wt-bar-track">
                    <div class="wt-bar-fill" style="width:${barPct}%;background:${color};">
                        <span class="wt-bar-text">${w.toFixed(0)} / ${pt.capacity} kg</span>
                    </div>
                    ${pct > 100 ? `<div style="position:absolute;right:4px;top:2px;font-size:9px;color:#ef4444;font-weight:700"><i class="fas fa-exclamation-triangle"></i> ${pct.toFixed(0)}%</div>` : ''}
                </div>
                <div class="wt-bar-pct" style="color:${color}">${pct.toFixed(0)}%</div>
            </div>`;
        }).join('') + '</div>';
    },

    // ================================================================
    // ADD / EDIT / REMOVE POINT
    // ================================================================
    _showAddPoint() {
        UI.openModal('Add Rigging Point', `
            <div class="form-group">
                <label class="form-label">Point Name</label>
                <input type="text" class="form-control" id="wt-new-name" placeholder="e.g. Motor 1 - DSL" style="width:100%">
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-control" id="wt-new-loc" placeholder="e.g. Downstage Left" style="width:100%">
            </div>
            <div class="form-group">
                <label class="form-label">Rated Capacity (kg)</label>
                <input type="number" class="form-control" id="wt-new-cap" value="1000" min="1" style="width:150px">
            </div>
            <div class="flex gap-sm" style="margin-top:16px;justify-content:flex-end">
                <button class="btn btn-sm" onclick="UI.closeModal()">Cancel</button>
                <button class="btn btn-sm btn-primary" onclick="WeightTrackerPage._doAddPoint()"><i class="fas fa-plus"></i> Add</button>
            </div>
        `);
        setTimeout(() => document.getElementById('wt-new-name')?.focus(), 100);
    },

    _doAddPoint() {
        const name = document.getElementById('wt-new-name')?.value.trim();
        const loc  = document.getElementById('wt-new-loc')?.value.trim();
        const cap  = parseFloat(document.getElementById('wt-new-cap')?.value) || 1000;
        if (!name) { UI.toast('Enter a point name', 'error'); return; }

        const id = 'pt-' + (this._nextId++);
        this._points.push({ id, name, location: loc || '', capacity: cap, items: [] });
        this._selectedPointId = id;
        this._persist();
        UI.closeModal();
        this.refresh();
        UI.toast('Rigging point added', 'success');
    },

    _showEditPoint(id) {
        const pt = this._points.find(p => p.id === id);
        if (!pt) return;
        UI.openModal('Edit Rigging Point', `
            <div class="form-group">
                <label class="form-label">Point Name</label>
                <input type="text" class="form-control" id="wt-edit-name" value="${UI.esc(pt.name)}" style="width:100%">
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-control" id="wt-edit-loc" value="${UI.esc(pt.location)}" style="width:100%">
            </div>
            <div class="form-group">
                <label class="form-label">Rated Capacity (kg)</label>
                <input type="number" class="form-control" id="wt-edit-cap" value="${pt.capacity}" min="1" style="width:150px">
            </div>
            <div class="flex gap-sm" style="margin-top:16px;justify-content:flex-end">
                <button class="btn btn-sm" onclick="UI.closeModal()">Cancel</button>
                <button class="btn btn-sm btn-primary" onclick="WeightTrackerPage._doEditPoint('${id}')"><i class="fas fa-check"></i> Save</button>
            </div>
        `);
    },

    _doEditPoint(id) {
        const pt = this._points.find(p => p.id === id);
        if (!pt) return;
        pt.name     = document.getElementById('wt-edit-name')?.value.trim() || pt.name;
        pt.location = document.getElementById('wt-edit-loc')?.value.trim() || '';
        pt.capacity = parseFloat(document.getElementById('wt-edit-cap')?.value) || pt.capacity;
        this._persist();
        UI.closeModal();
        this.refresh();
        UI.toast('Point updated', 'success');
    },

    _removePoint(id) {
        this._points = this._points.filter(p => p.id !== id);
        if (this._selectedPointId === id) this._selectedPointId = this._points[0]?.id || null;
        this._persist();
        this.refresh();
        UI.toast('Point removed', 'info');
    },

    _selectPoint(id) {
        this._selectedPointId = id;
        this._refreshUI();
    },

    // ================================================================
    // ADD / REMOVE LOAD ITEMS
    // ================================================================
    _showAddItem(pointId) {
        const catGroups = {};
        for (const eq of this._EQUIPMENT_DB) {
            if (!catGroups[eq.cat]) catGroups[eq.cat] = [];
            catGroups[eq.cat].push(eq);
        }
        const dbOptions = Object.entries(catGroups).map(([cat, items]) =>
            `<optgroup label="${UI.esc(cat)}">${items.map(eq => `<option value="${eq.weight}" data-name="${UI.esc(eq.name)}">${UI.esc(eq.name)} (${eq.weight} kg)</option>`).join('')}</optgroup>`
        ).join('');

        UI.openModal('Add Load Item', `
            <div class="form-group">
                <label class="form-label">Quick Select from Database</label>
                <select class="form-control" id="wt-item-db" style="width:100%" onchange="WeightTrackerPage._onDbSelect()">
                    <option value="">-- Custom Item --</option>
                    ${dbOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Item Name</label>
                <input type="text" class="form-control" id="wt-item-name" placeholder="e.g. Robe MegaPointe" style="width:100%">
            </div>
            <div class="form-group">
                <label class="form-label">Weight per Unit (kg)</label>
                <input type="number" class="form-control" id="wt-item-weight" value="10" min="0.1" step="0.1" style="width:150px">
            </div>
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" class="form-control" id="wt-item-qty" value="1" min="1" step="1" style="width:100px">
            </div>
            <div class="flex gap-sm" style="margin-top:16px;justify-content:flex-end">
                <button class="btn btn-sm" onclick="UI.closeModal()">Cancel</button>
                <button class="btn btn-sm btn-primary" onclick="WeightTrackerPage._doAddItem('${pointId}')"><i class="fas fa-plus"></i> Add</button>
            </div>
        `);
    },

    _onDbSelect() {
        const sel = document.getElementById('wt-item-db');
        if (!sel || !sel.value) return;
        const opt = sel.selectedOptions[0];
        const nameEl = document.getElementById('wt-item-name');
        const weightEl = document.getElementById('wt-item-weight');
        if (nameEl) nameEl.value = opt.dataset.name || '';
        if (weightEl) weightEl.value = sel.value;
    },

    _doAddItem(pointId) {
        const pt = this._points.find(p => p.id === pointId);
        if (!pt) return;
        const name   = document.getElementById('wt-item-name')?.value.trim();
        const weight = parseFloat(document.getElementById('wt-item-weight')?.value) || 0;
        const qty    = parseInt(document.getElementById('wt-item-qty')?.value) || 1;
        if (!name) { UI.toast('Enter an item name', 'error'); return; }
        if (weight <= 0) { UI.toast('Enter a valid weight', 'error'); return; }

        pt.items.push({ id: 'it-' + Date.now().toString(36), name, weight, qty });
        this._persist();
        UI.closeModal();
        this._refreshUI();
        UI.toast(`${name} added to ${pt.name}`, 'success');
    },

    _removeItem(pointId, idx) {
        const pt = this._points.find(p => p.id === pointId);
        if (!pt) return;
        pt.items.splice(idx, 1);
        this._persist();
        this._refreshUI();
    },

    // ================================================================
    // EXPORT CSV
    // ================================================================
    _exportCSV() {
        if (this._points.length === 0) { UI.toast('No data to export', 'error'); return; }

        let csv = 'Point Name,Location,Capacity (kg),Item Name,Item Weight (kg),Quantity,Item Total (kg)\n';
        let grandTotal = 0;
        for (const pt of this._points) {
            if (pt.items.length === 0) {
                csv += `"${pt.name}","${pt.location}",${pt.capacity},,,,\n`;
            } else {
                for (const it of pt.items) {
                    const total = it.weight * it.qty;
                    grandTotal += total;
                    csv += `"${pt.name}","${pt.location}",${pt.capacity},"${it.name}",${it.weight},${it.qty},${total.toFixed(1)}\n`;
                }
            }
        }
        // Totals row
        csv += `\nTOTAL,,,,,,"${grandTotal.toFixed(1)}"\n`;

        // Summary
        csv += '\n\nSUMMARY\n';
        csv += 'Point,Load (kg),Capacity (kg),Utilization (%)\n';
        for (const pt of this._points) {
            const w = this._pointWeight(pt);
            const pct = pt.capacity > 0 ? (w / pt.capacity * 100).toFixed(1) : '0.0';
            csv += `"${pt.name}",${w.toFixed(1)},${pt.capacity},${pct}\n`;
        }

        try {
            navigator.clipboard.writeText(csv);
            UI.toast('Weight report copied to clipboard as CSV', 'success');
        } catch (e) {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = csv;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            UI.toast('Weight report copied to clipboard', 'success');
        }
    },

    // ================================================================
    // PERSISTENCE
    // ================================================================
    _persist() {
        try {
            localStorage.setItem('luxor_weight_points', JSON.stringify({ points: this._points, nextId: this._nextId }));
        } catch (e) { /* quota */ }
    },

    _load() {
        try {
            const raw = localStorage.getItem('luxor_weight_points');
            if (raw) {
                const data = JSON.parse(raw);
                this._points = data.points || [];
                this._nextId = data.nextId || 1;
                if (this._points.length > 0 && !this._selectedPointId) {
                    this._selectedPointId = this._points[0].id;
                }
            }
        } catch (e) {
            this._points = [];
        }
    },

    // ================================================================
    // UI REFRESH (partial)
    // ================================================================
    _refreshUI() {
        const list = document.getElementById('wt-points-list');
        if (list) list.innerHTML = this._renderPointsList();
        const detail = document.getElementById('wt-detail');
        if (detail) detail.innerHTML = this._renderDetail();
        const chart = document.getElementById('wt-chart');
        if (chart) chart.innerHTML = this._renderBarChart();
        const alerts = document.getElementById('wt-alerts');
        if (alerts) alerts.innerHTML = this._renderAlerts();
        // Update stat grid
        const stats = this._calcStats();
        const statGrid = document.querySelector('.wt-stat-grid');
        if (statGrid) {
            const vals = statGrid.querySelectorAll('.wt-stat-value');
            if (vals[0]) vals[0].textContent = stats.totalPoints;
            if (vals[1]) vals[1].innerHTML = `${stats.totalWeight.toFixed(1)} <span style="font-size:12px;color:var(--text-muted)">kg</span>`;
            if (vals[2]) { vals[2].textContent = stats.avgUtil.toFixed(1) + '%'; vals[2].className = 'wt-stat-value ' + (stats.avgUtil > 100 ? 'wt-warn' : stats.avgUtil > 80 ? 'wt-caution' : 'wt-ok'); }
            if (vals[3]) { vals[3].textContent = stats.alerts; vals[3].className = 'wt-stat-value ' + (stats.alerts > 0 ? 'wt-warn' : 'wt-ok'); }
        }
        this.renderSidebarList();
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    onActivate() {
        this._load();
        this.renderSidebarList();
    },

    onDeactivate() {
        // nothing to clean up
    },

    refresh() {
        const main = document.getElementById('main-content');
        if (main) main.innerHTML = this.render();
    },

    // ================================================================
    // SIDEBAR
    // ================================================================
    renderSidebarList() {
        const container = document.getElementById('weighttracker-sidebar-list');
        if (!container) return;
        if (this._points.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = this._points.map(pt => {
            const w = this._pointWeight(pt);
            const pct = pt.capacity > 0 ? (w / pt.capacity) * 100 : 0;
            const color = pct > 100 ? 'var(--red)' : pct > 80 ? '#eab308' : 'var(--green)';
            return `
            <div class="server-card" style="cursor:pointer" onclick="WeightTrackerPage._selectPoint('${pt.id}');HippoApp.navigate('weighttracker')">
                <div style="display:flex;align-items:center;gap:6px">
                    <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(pt.name)}</div>
                        <div style="font-size:9px;color:var(--text-muted)">${w.toFixed(0)} / ${pt.capacity} kg (${pct.toFixed(0)}%)</div>
                    </div>
                    ${pct > 100 ? '<i class="fas fa-exclamation-triangle" style="font-size:10px;color:var(--red)"></i>' : ''}
                </div>
            </div>`;
        }).join('');
    },

    initSidebar() {
        this._load();
        this.renderSidebarList();
    },
};
