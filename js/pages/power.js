/**
 * Power Distribution Page
 * Manage power sources, distribution equipment, and output assignments for live events
 * Luxor Production
 */
const PowerDistPage = {

    // ================================================================
    // CONSTANTS
    // ================================================================
    _SOURCE_TYPES: {
        '63A 3-Phase':       { amps: 63,  phases: 3, voltage: 400, label: '63A 3-Phase' },
        '32A 3-Phase':       { amps: 32,  phases: 3, voltage: 400, label: '32A 3-Phase' },
        '16A Single Phase':  { amps: 16,  phases: 1, voltage: 230, label: '16A Single Phase' },
        '125A Powerlock':    { amps: 125, phases: 3, voltage: 400, label: '125A Powerlock' },
        'Custom':            { amps: 32,  phases: 1, voltage: 230, label: 'Custom' },
    },

    _DISTRO_TYPES: {
        'LSC Powerpoint':     { label: 'LSC Powerpoint',     outputs: 6,  outputType: 'Socapex' },
        'Powerlock Distro':   { label: 'Powerlock Distro',   outputs: 6,  outputType: 'Powerlock' },
        'Socapex Breakout':   { label: 'Socapex Breakout',   outputs: 6,  outputType: 'Powercon' },
        'Camlock Distro':     { label: 'Camlock Distro',     outputs: 4,  outputType: '32A CEE' },
        'Custom':             { label: 'Custom',             outputs: 4,  outputType: 'Powercon' },
    },

    _OUTPUT_TYPES: ['Socapex', 'Powercon', '16A CEE', '32A CEE', 'Powerlock'],

    _CABLE_TYPES: [
        { id: 'socapex',   label: 'Socapex',         color: '#f97316' },
        { id: 'powercon',  label: 'PowerCON',        color: '#3b82f6' },
        { id: 'cee16',     label: '16A CEE',         color: '#22c55e' },
        { id: 'cee32',     label: '32A CEE',         color: '#ef4444' },
        { id: 'cee63',     label: '63A CEE',         color: '#a855f7' },
        { id: 'powerlock', label: 'Powerlock',       color: '#eab308' },
        { id: 'camlock',   label: 'Camlock',         color: '#ec4899' },
        { id: 'custom',    label: 'Custom',          color: '#94a3b8' },
    ],

    _CABLE_LENGTHS: [5, 10, 15, 20, 25, 30, 40, 50],

    _DEST_TYPES: ['LED Wall', 'LED Processor', 'Media Server', 'Lighting Truss', 'Camera', 'Audio', 'Rigging Motor', 'Custom'],

    _PHASE_COLORS: {
        L1: '#8B6914',   // brown
        L2: '#333333',   // black
        L3: '#888888',   // grey
        N:  '#3b82f6',   // blue
        PE: '#84cc16',   // green-yellow
    },

    // ================================================================
    // DATA
    // ================================================================
    _data: {
        sources: [],
        distros: [],
        assignments: [],
    },
    _nextId: 1,
    _canvas: null,
    _ctx: null,
    _animFrame: null,
    _dragNode: null,
    _dragOffset: { x: 0, y: 0 },
    _nodes: [],       // computed node positions for canvas
    _hoveredNode: null,
    _mousePos: { x: 0, y: 0 },

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        return `
        <style>
            .pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .pd-full { grid-column: 1 / -1; }
            .pd-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border); margin-bottom: 6px; transition: background 0.15s; }
            .pd-row:hover { background: rgba(255,255,255,0.06); }
            .pd-row-icon { font-size: 18px; width: 28px; text-align: center; }
            .pd-row-info { flex: 1; min-width: 0; }
            .pd-row-name { font-size: 12px; font-weight: 700; color: var(--text-primary); }
            .pd-row-detail { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
            .pd-row-actions { display: flex; gap: 6px; }
            .pd-capacity-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); margin-top: 4px; overflow: hidden; max-width: 200px; }
            .pd-capacity-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
            .pd-canvas-wrap { position: relative; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border); overflow: hidden; }
            .pd-canvas { display: block; width: 100%; min-height: 500px; cursor: grab; }
            .pd-canvas.grabbing { cursor: grabbing; }
            .pd-assign-table { width: 100%; }
            .pd-assign-row { display: grid; grid-template-columns: 40px 1fr 1fr 120px 90px 60px 50px; gap: 8px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border); font-size: 11px; }
            .pd-assign-header { font-weight: 700; color: var(--text-muted); text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .pd-legend { display: flex; gap: 14px; flex-wrap: wrap; padding: 8px 12px; font-size: 10px; color: var(--text-muted); }
            .pd-legend-item { display: flex; align-items: center; gap: 4px; }
            .pd-legend-dot { width: 12px; height: 4px; border-radius: 2px; }
            .pd-toolbar { display: flex; gap: 6px; flex-wrap: wrap; }
        </style>

        <div class="section-header">
            <h2><i class="fas fa-bolt"></i> Power Distribution</h2>
            <div class="pd-toolbar">
                <button class="btn btn-sm" onclick="PowerDistPage._importConfig()"><i class="fas fa-file-import"></i> Import</button>
                <button class="btn btn-sm" onclick="PowerDistPage._exportJSON()"><i class="fas fa-file-export"></i> Export JSON</button>
                <button class="btn btn-sm btn-accent" onclick="PowerDistPage._exportPNG()"><i class="fas fa-image"></i> Export PNG</button>
            </div>
        </div>

        <!-- Stats -->
        <div class="stat-grid" id="pd-stats">
            ${this._renderStats()}
        </div>

        <div class="pd-grid">
            <!-- Power Sources -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-car-battery"></i> Power Sources</h3>
                    <button class="btn btn-xs btn-primary" onclick="PowerDistPage._addSource()"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body" id="pd-sources-list">
                    ${this._renderSources()}
                </div>
            </div>

            <!-- Distribution Equipment -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-project-diagram"></i> Distribution</h3>
                    <button class="btn btn-xs btn-primary" onclick="PowerDistPage._addDistro()"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body" id="pd-distros-list">
                    ${this._renderDistros()}
                </div>
            </div>

            <!-- Output Assignments -->
            <div class="card pd-full">
                <div class="card-header">
                    <h3><i class="fas fa-plug"></i> Output Assignments</h3>
                    <button class="btn btn-xs btn-primary" onclick="PowerDistPage._addAssignment()"><i class="fas fa-plus"></i> Add</button>
                </div>
                <div class="card-body" id="pd-assignments-list">
                    ${this._renderAssignments()}
                </div>
            </div>

            <!-- Visual Power Map -->
            <div class="card pd-full">
                <div class="card-header">
                    <h3><i class="fas fa-sitemap"></i> Power Map</h3>
                    <div class="flex gap-sm">
                        <button class="btn btn-xs" onclick="PowerDistPage._autoLayout()"><i class="fas fa-magic"></i> Auto Layout</button>
                        <button class="btn btn-xs" onclick="PowerDistPage._zoomFit()"><i class="fas fa-compress-arrows-alt"></i> Fit</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0;">
                    <div class="pd-canvas-wrap">
                        <canvas id="pd-canvas" class="pd-canvas" width="1200" height="500"></canvas>
                    </div>
                    <div class="pd-legend">
                        <div class="pd-legend-item"><div class="pd-legend-dot" style="background:#8B6914"></div> L1</div>
                        <div class="pd-legend-item"><div class="pd-legend-dot" style="background:#333"></div> L2</div>
                        <div class="pd-legend-item"><div class="pd-legend-dot" style="background:#888"></div> L3</div>
                        <div class="pd-legend-item"><div class="pd-legend-dot" style="background:#3b82f6"></div> N</div>
                        <div class="pd-legend-item"><div class="pd-legend-dot" style="background:#84cc16"></div> PE</div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    onActivate() {
        this._initCanvas();
        this._autoLayout();
        this._startRender();
    },

    onDeactivate() {
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        this._removeCanvasListeners();
    },

    // ================================================================
    // STATS
    // ================================================================
    _renderStats() {
        const stats = this._calcStats();
        const capPct = stats.totalAvailable > 0 ? ((stats.totalAvailable - stats.totalAllocated) / stats.totalAvailable * 100) : 100;
        const capColor = capPct > 30 ? 'green' : capPct > 10 ? 'orange' : 'red';
        return UI.statCard('fa-bolt', 'orange', 'Total Available', stats.totalAvailable.toFixed(1) + ' kW') +
               UI.statCard('fa-plug', 'cyan', 'Total Allocated', stats.totalAllocated.toFixed(1) + ' kW') +
               UI.statCard('fa-battery-three-quarters', capColor, 'Remaining Capacity', capPct.toFixed(0) + '%') +
               UI.statCard('fa-code-branch', 'purple', 'Circuits', String(stats.circuits));
    },

    _calcStats() {
        let totalAvailable = 0;
        let totalAllocated = 0;
        const circuits = this._data.assignments.length;

        for (const s of this._data.sources) {
            const kw = (s.amps * s.voltage * (s.phases === 3 ? Math.sqrt(3) : 1)) / 1000;
            totalAvailable += kw;
        }

        for (const a of this._data.assignments) {
            const kw = (a.load * 230) / 1000;
            totalAllocated += kw;
        }

        return { totalAvailable, totalAllocated, circuits };
    },

    _refreshStats() {
        const el = document.getElementById('pd-stats');
        if (el) el.innerHTML = this._renderStats();
    },

    // ================================================================
    // POWER SOURCES
    // ================================================================
    _renderSources() {
        if (!this._data.sources.length) {
            return UI.empty('fa-car-battery', 'No Power Sources', 'Add a power source to get started.');
        }
        return this._data.sources.map(s => {
            const usedAmps = this._getSourceUsedAmps(s.id);
            const pct = s.amps > 0 ? (usedAmps / s.amps * 100) : 0;
            const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#4ade80';
            const kw = (s.amps * s.voltage * (s.phases === 3 ? Math.sqrt(3) : 1)) / 1000;
            return `<div class="pd-row">
                <div class="pd-row-icon" style="color:#ef4444"><i class="fas fa-car-battery"></i></div>
                <div class="pd-row-info">
                    <div class="pd-row-name">${UI.esc(s.name)}</div>
                    <div class="pd-row-detail">${UI.esc(s.type)} &middot; ${s.amps}A &middot; ${s.voltage}V &middot; ${s.phases === 3 ? '3-Phase' : 'Single Phase'} &middot; ${kw.toFixed(1)} kW</div>
                    <div class="pd-capacity-bar"><div class="pd-capacity-fill" style="width:${Math.min(100, pct)}%;background:${barColor}"></div></div>
                    <div class="pd-row-detail">${usedAmps.toFixed(1)}A / ${s.amps}A used</div>
                </div>
                <div class="pd-row-actions">
                    <button class="btn btn-xs btn-ghost" onclick="PowerDistPage._editSource(${s.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-xs btn-ghost" onclick="PowerDistPage._removeSource(${s.id})" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    _getSourceUsedAmps(sourceId) {
        let used = 0;
        for (const d of this._data.distros) {
            if (d.sourceId === sourceId) {
                for (const a of this._data.assignments) {
                    if (a.distroId === d.id) {
                        used += a.load || 0;
                    }
                }
            }
        }
        return used;
    },

    _addSource() {
        const typeOpts = Object.keys(this._SOURCE_TYPES).map(t =>
            `<option value="${t}">${t}</option>`
        ).join('');

        UI.openModal('Add Power Source', `
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" id="pd-src-name" placeholder="e.g. Generator A" value="Source ${this._data.sources.length + 1}">
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" id="pd-src-type" onchange="PowerDistPage._onSourceTypeChange()">
                    ${typeOpts}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Amps</label>
                <input type="number" class="form-input" id="pd-src-amps" value="63" min="1">
            </div>
            <div class="form-group">
                <label class="form-label">Phases</label>
                <select class="form-select" id="pd-src-phases">
                    <option value="3">3-Phase</option>
                    <option value="1">Single Phase</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Voltage</label>
                <input type="number" class="form-input" id="pd-src-voltage" value="400" min="1">
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PowerDistPage._saveSource()">Add Source</button>`);

        this._onSourceTypeChange();
    },

    _onSourceTypeChange() {
        const sel = document.getElementById('pd-src-type');
        if (!sel) return;
        const t = this._SOURCE_TYPES[sel.value];
        if (!t) return;
        const ampsEl = document.getElementById('pd-src-amps');
        const phaseEl = document.getElementById('pd-src-phases');
        const voltEl = document.getElementById('pd-src-voltage');
        if (sel.value !== 'Custom') {
            if (ampsEl) ampsEl.value = t.amps;
            if (phaseEl) phaseEl.value = t.phases;
            if (voltEl) voltEl.value = t.voltage;
        }
    },

    _saveSource(editId) {
        const name = document.getElementById('pd-src-name')?.value?.trim() || 'Unnamed';
        const type = document.getElementById('pd-src-type')?.value || '63A 3-Phase';
        const amps = parseFloat(document.getElementById('pd-src-amps')?.value) || 63;
        const phases = parseInt(document.getElementById('pd-src-phases')?.value) || 3;
        const voltage = parseFloat(document.getElementById('pd-src-voltage')?.value) || 400;

        if (editId) {
            const src = this._data.sources.find(s => s.id === editId);
            if (src) {
                Object.assign(src, { name, type, amps, phases, voltage });
            }
        } else {
            this._data.sources.push({ id: this._nextId++, name, type, amps, phases, voltage });
        }

        UI.closeModal();
        this._refreshAll();
        UI.toast(editId ? 'Source updated' : 'Power source added', 'success');
    },

    _editSource(id) {
        const s = this._data.sources.find(x => x.id === id);
        if (!s) return;

        const typeOpts = Object.keys(this._SOURCE_TYPES).map(t =>
            `<option value="${t}" ${t === s.type ? 'selected' : ''}>${t}</option>`
        ).join('');

        UI.openModal('Edit Power Source', `
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" id="pd-src-name" value="${UI.esc(s.name)}">
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" id="pd-src-type">${typeOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Amps</label>
                <input type="number" class="form-input" id="pd-src-amps" value="${s.amps}" min="1">
            </div>
            <div class="form-group">
                <label class="form-label">Phases</label>
                <select class="form-select" id="pd-src-phases">
                    <option value="3" ${s.phases === 3 ? 'selected' : ''}>3-Phase</option>
                    <option value="1" ${s.phases === 1 ? 'selected' : ''}>Single Phase</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Voltage</label>
                <input type="number" class="form-input" id="pd-src-voltage" value="${s.voltage}" min="1">
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PowerDistPage._saveSource(${id})">Save</button>`);
    },

    async _removeSource(id) {
        const ok = await UI.confirm('Remove Source', 'Remove this power source? Connected distros will be unlinked.');
        if (!ok) return;
        this._data.sources = this._data.sources.filter(s => s.id !== id);
        this._data.distros.forEach(d => { if (d.sourceId === id) d.sourceId = null; });
        this._refreshAll();
        UI.toast('Source removed', 'info');
    },

    // ================================================================
    // DISTRIBUTION EQUIPMENT
    // ================================================================
    _renderDistros() {
        if (!this._data.distros.length) {
            return UI.empty('fa-project-diagram', 'No Distros', 'Add distribution equipment.');
        }
        return this._data.distros.map(d => {
            const src = this._data.sources.find(s => s.id === d.sourceId);
            const assignCount = this._data.assignments.filter(a => a.distroId === d.id).length;
            return `<div class="pd-row">
                <div class="pd-row-icon" style="color:#f59e0b"><i class="fas fa-project-diagram"></i></div>
                <div class="pd-row-info">
                    <div class="pd-row-name">${UI.esc(d.name)}</div>
                    <div class="pd-row-detail">${UI.esc(d.type)} &middot; ${d.numOutputs} x ${d.outputType} outputs &middot; ${assignCount} assigned</div>
                    <div class="pd-row-detail">Source: ${src ? UI.esc(src.name) : '<span style="color:#ef4444">Unlinked</span>'}</div>
                </div>
                <div class="pd-row-actions">
                    <button class="btn btn-xs btn-ghost" onclick="PowerDistPage._editDistro(${d.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-xs btn-ghost" onclick="PowerDistPage._removeDistro(${d.id})" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    _addDistro() {
        const typeOpts = Object.keys(this._DISTRO_TYPES).map(t =>
            `<option value="${t}">${t}</option>`
        ).join('');
        const srcOpts = `<option value="">-- None --</option>` +
            this._data.sources.map(s => `<option value="${s.id}">${UI.esc(s.name)} (${s.type})</option>`).join('');
        const outOpts = this._OUTPUT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

        UI.openModal('Add Distribution', `
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" id="pd-dist-name" placeholder="e.g. Distro A" value="Distro ${this._data.distros.length + 1}">
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" id="pd-dist-type" onchange="PowerDistPage._onDistroTypeChange()">
                    ${typeOpts}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Input Source</label>
                <select class="form-select" id="pd-dist-source">${srcOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Number of Outputs</label>
                <input type="number" class="form-input" id="pd-dist-outputs" value="6" min="1" max="48">
            </div>
            <div class="form-group">
                <label class="form-label">Output Type</label>
                <select class="form-select" id="pd-dist-outtype">${outOpts}</select>
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PowerDistPage._saveDistro()">Add Distro</button>`);

        this._onDistroTypeChange();
    },

    _onDistroTypeChange() {
        const sel = document.getElementById('pd-dist-type');
        if (!sel) return;
        const t = this._DISTRO_TYPES[sel.value];
        if (!t || sel.value === 'Custom') return;
        const outEl = document.getElementById('pd-dist-outputs');
        const outTypeEl = document.getElementById('pd-dist-outtype');
        if (outEl) outEl.value = t.outputs;
        if (outTypeEl) outTypeEl.value = t.outputType;
    },

    _saveDistro(editId) {
        const name = document.getElementById('pd-dist-name')?.value?.trim() || 'Unnamed';
        const type = document.getElementById('pd-dist-type')?.value || 'LSC Powerpoint';
        const sourceId = parseInt(document.getElementById('pd-dist-source')?.value) || null;
        const numOutputs = parseInt(document.getElementById('pd-dist-outputs')?.value) || 6;
        const outputType = document.getElementById('pd-dist-outtype')?.value || 'Socapex';

        if (editId) {
            const dist = this._data.distros.find(d => d.id === editId);
            if (dist) {
                Object.assign(dist, { name, type, sourceId, numOutputs, outputType });
            }
        } else {
            this._data.distros.push({ id: this._nextId++, name, type, sourceId, numOutputs, outputType });
        }

        UI.closeModal();
        this._refreshAll();
        UI.toast(editId ? 'Distro updated' : 'Distro added', 'success');
    },

    _editDistro(id) {
        const d = this._data.distros.find(x => x.id === id);
        if (!d) return;

        const typeOpts = Object.keys(this._DISTRO_TYPES).map(t =>
            `<option value="${t}" ${t === d.type ? 'selected' : ''}>${t}</option>`
        ).join('');
        const srcOpts = `<option value="">-- None --</option>` +
            this._data.sources.map(s => `<option value="${s.id}" ${s.id === d.sourceId ? 'selected' : ''}>${UI.esc(s.name)} (${s.type})</option>`).join('');
        const outOpts = this._OUTPUT_TYPES.map(t =>
            `<option value="${t}" ${t === d.outputType ? 'selected' : ''}>${t}</option>`
        ).join('');

        UI.openModal('Edit Distribution', `
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" id="pd-dist-name" value="${UI.esc(d.name)}">
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" id="pd-dist-type">${typeOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Input Source</label>
                <select class="form-select" id="pd-dist-source">${srcOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Number of Outputs</label>
                <input type="number" class="form-input" id="pd-dist-outputs" value="${d.numOutputs}" min="1" max="48">
            </div>
            <div class="form-group">
                <label class="form-label">Output Type</label>
                <select class="form-select" id="pd-dist-outtype">${outOpts}</select>
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PowerDistPage._saveDistro(${id})">Save</button>`);
    },

    async _removeDistro(id) {
        const ok = await UI.confirm('Remove Distro', 'Remove this distribution? Its output assignments will be deleted.');
        if (!ok) return;
        this._data.distros = this._data.distros.filter(d => d.id !== id);
        this._data.assignments = this._data.assignments.filter(a => a.distroId !== id);
        this._refreshAll();
        UI.toast('Distro removed', 'info');
    },

    // ================================================================
    // OUTPUT ASSIGNMENTS
    // ================================================================
    _renderAssignments() {
        if (!this._data.assignments.length) {
            return UI.empty('fa-plug', 'No Assignments', 'Assign distro outputs to destinations.');
        }

        let html = `<div class="pd-assign-table">
            <div class="pd-assign-row pd-assign-header">
                <div>#</div><div>Distro / Output</div><div>Destination</div><div>Cable</div><div>Name/ND</div><div>Load (A)</div><div></div>
            </div>`;

        this._data.assignments.forEach((a, i) => {
            const dist = this._data.distros.find(d => d.id === a.distroId);
            const ct = this._CABLE_TYPES.find(c => c.id === a.cableType);
            const cableLabel = ct ? ct.label : (a.cableType || '--');
            html += `<div class="pd-assign-row">
                <div style="color:var(--text-muted)">${i + 1}</div>
                <div>${dist ? UI.esc(dist.name) + ' / Out ' + a.outputIndex : '<span style="color:#ef4444">Unlinked</span>'}</div>
                <div>${UI.badge(a.destType, a.destType === 'LED Wall' ? 'cyan' : a.destType === 'Lighting Truss' ? 'yellow' : 'purple')} ${UI.esc(a.destName)}</div>
                <div><span style="color:${ct?.color || 'var(--text-secondary)'}">${UI.esc(cableLabel)}</span> ${a.cableLength}m</div>
                <div style="font-weight:600;color:var(--accent);">${UI.esc(a.cableName || '--')}</div>
                <div>${a.load}A</div>
                <div>
                    <button class="btn btn-xs btn-ghost" onclick="PowerDistPage._editAssignment(${a.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-xs btn-ghost" onclick="PowerDistPage._removeAssignment(${a.id})" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        });

        html += '</div>';
        return html;
    },

    _addAssignment() {
        if (!this._data.distros.length) {
            UI.toast('Add a distro first', 'warning');
            return;
        }

        const distOpts = this._data.distros.map(d =>
            `<option value="${d.id}">${UI.esc(d.name)} (${d.type})</option>`
        ).join('');
        const destOpts = this._DEST_TYPES.map(t =>
            `<option value="${t}">${t}</option>`
        ).join('');

        const cableOpts = this._CABLE_TYPES.map(c =>
            `<option value="${c.id}">${c.label}</option>`
        ).join('');
        const cableLenOpts = this._CABLE_LENGTHS.map(l =>
            `<option value="${l}">${l}m</option>`
        ).join('');

        UI.openModal('Add Assignment', `
            <div class="form-group">
                <label class="form-label">Distribution</label>
                <select class="form-select" id="pd-asgn-distro" onchange="PowerDistPage._onAssignDistroChange()">
                    ${distOpts}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Output Number</label>
                <select class="form-select" id="pd-asgn-output"></select>
            </div>
            <div class="form-group">
                <label class="form-label">Destination Type</label>
                <select class="form-select" id="pd-asgn-desttype">${destOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Destination Name</label>
                <input type="text" class="form-input" id="pd-asgn-destname" placeholder="e.g. LED Wall Stage Left" value="">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="form-group">
                    <label class="form-label">Cable Type</label>
                    <select class="form-select" id="pd-asgn-cabletype">${cableOpts}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Cable Length</label>
                    <select class="form-select" id="pd-asgn-cable">
                        ${cableLenOpts}
                        <option value="0">Custom</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Cable Name / ND Label</label>
                <input type="text" class="form-input" id="pd-asgn-cablename" placeholder="e.g. ND 4, Socapex Run 1" value="">
            </div>
            <div class="form-group">
                <label class="form-label">Load (Amps)</label>
                <input type="number" class="form-input" id="pd-asgn-load" value="5" min="0" step="0.1">
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PowerDistPage._saveAssignment()">Add Assignment</button>`);

        this._onAssignDistroChange();
    },

    _onAssignDistroChange() {
        const distId = parseInt(document.getElementById('pd-asgn-distro')?.value);
        const dist = this._data.distros.find(d => d.id === distId);
        const outEl = document.getElementById('pd-asgn-output');
        if (!dist || !outEl) return;

        const usedOutputs = this._data.assignments.filter(a => a.distroId === distId).map(a => a.outputIndex);
        let opts = '';
        for (let i = 1; i <= dist.numOutputs; i++) {
            const used = usedOutputs.includes(i);
            opts += `<option value="${i}" ${used ? 'disabled' : ''}>Output ${i}${used ? ' (assigned)' : ''}</option>`;
        }
        outEl.innerHTML = opts;
    },

    _saveAssignment(editId) {
        const distroId = parseInt(document.getElementById('pd-asgn-distro')?.value) || null;
        const outputIndex = parseInt(document.getElementById('pd-asgn-output')?.value) || 1;
        const destType = document.getElementById('pd-asgn-desttype')?.value || 'Custom';
        const destName = document.getElementById('pd-asgn-destname')?.value?.trim() || destType;
        const cableLength = parseFloat(document.getElementById('pd-asgn-cable')?.value) || 0;
        const cableType = document.getElementById('pd-asgn-cabletype')?.value || 'socapex';
        const cableName = document.getElementById('pd-asgn-cablename')?.value?.trim() || '';
        const load = parseFloat(document.getElementById('pd-asgn-load')?.value) || 0;

        if (editId) {
            const a = this._data.assignments.find(x => x.id === editId);
            if (a) Object.assign(a, { distroId, outputIndex, destType, destName, cableLength, cableType, cableName, load });
        } else {
            this._data.assignments.push({ id: this._nextId++, distroId, outputIndex, destType, destName, cableLength, cableType, cableName, load });
        }

        UI.closeModal();
        this._refreshAll();
        UI.toast(editId ? 'Assignment updated' : 'Assignment added', 'success');
    },

    _editAssignment(id) {
        const a = this._data.assignments.find(x => x.id === id);
        if (!a) return;

        const distOpts = this._data.distros.map(d =>
            `<option value="${d.id}" ${d.id === a.distroId ? 'selected' : ''}>${UI.esc(d.name)} (${d.type})</option>`
        ).join('');
        const destOpts = this._DEST_TYPES.map(t =>
            `<option value="${t}" ${t === a.destType ? 'selected' : ''}>${t}</option>`
        ).join('');

        const dist = this._data.distros.find(d => d.id === a.distroId);
        const numOut = dist ? dist.numOutputs : 6;
        let outOpts = '';
        for (let i = 1; i <= numOut; i++) {
            outOpts += `<option value="${i}" ${i === a.outputIndex ? 'selected' : ''}>Output ${i}</option>`;
        }

        const cableOpts = this._CABLE_TYPES.map(c =>
            `<option value="${c.id}" ${c.id === a.cableType ? 'selected' : ''}>${c.label}</option>`
        ).join('');
        const cableLenOpts = this._CABLE_LENGTHS.map(l =>
            `<option value="${l}" ${l === a.cableLength ? 'selected' : ''}>${l}m</option>`
        ).join('') + `<option value="${this._CABLE_LENGTHS.includes(a.cableLength) ? 0 : a.cableLength}" ${!this._CABLE_LENGTHS.includes(a.cableLength) ? 'selected' : ''}>Custom</option>`;

        UI.openModal('Edit Assignment', `
            <div class="form-group">
                <label class="form-label">Distribution</label>
                <select class="form-select" id="pd-asgn-distro" onchange="PowerDistPage._onAssignDistroChange()">
                    ${distOpts}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Output Number</label>
                <select class="form-select" id="pd-asgn-output">${outOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Destination Type</label>
                <select class="form-select" id="pd-asgn-desttype">${destOpts}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Destination Name</label>
                <input type="text" class="form-input" id="pd-asgn-destname" value="${UI.esc(a.destName)}">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="form-group">
                    <label class="form-label">Cable Type</label>
                    <select class="form-select" id="pd-asgn-cabletype">${cableOpts}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Cable Length</label>
                    <select class="form-select" id="pd-asgn-cable">${cableLenOpts}</select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Cable Name / ND Label</label>
                <input type="text" class="form-input" id="pd-asgn-cablename" value="${UI.esc(a.cableName || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Load (Amps)</label>
                <input type="number" class="form-input" id="pd-asgn-load" value="${a.load}" min="0" step="0.1">
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PowerDistPage._saveAssignment(${id})">Save</button>`);
    },

    async _removeAssignment(id) {
        const ok = await UI.confirm('Remove Assignment', 'Remove this output assignment?');
        if (!ok) return;
        this._data.assignments = this._data.assignments.filter(a => a.id !== id);
        this._refreshAll();
        UI.toast('Assignment removed', 'info');
    },

    // ================================================================
    // REFRESH ALL SECTIONS
    // ================================================================
    _refreshAll() {
        const srcEl = document.getElementById('pd-sources-list');
        if (srcEl) srcEl.innerHTML = this._renderSources();

        const distEl = document.getElementById('pd-distros-list');
        if (distEl) distEl.innerHTML = this._renderDistros();

        const asgnEl = document.getElementById('pd-assignments-list');
        if (asgnEl) asgnEl.innerHTML = this._renderAssignments();

        this._refreshStats();
        this._autoLayout();
    },

    // ================================================================
    // CANVAS — POWER MAP
    // ================================================================
    _initCanvas() {
        const canvasEl = document.getElementById('pd-canvas');
        if (!canvasEl) return;

        this._canvas = canvasEl;
        this._ctx = canvasEl.getContext('2d');

        // Resize canvas to fill container
        this._resizeCanvas();
        this._addCanvasListeners();
    },

    _resizeCanvas() {
        const c = this._canvas;
        if (!c) return;
        const wrap = c.parentElement;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(800, rect.width);
        const h = Math.max(500, 500);
        c.width = w * (window.devicePixelRatio || 1);
        c.height = h * (window.devicePixelRatio || 1);
        c.style.width = w + 'px';
        c.style.height = h + 'px';
        this._ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    },

    _addCanvasListeners() {
        const c = this._canvas;
        if (!c) return;

        this._boundMouseDown = (e) => this._onCanvasMouseDown(e);
        this._boundMouseMove = (e) => this._onCanvasMouseMove(e);
        this._boundMouseUp = (e) => this._onCanvasMouseUp(e);
        this._boundResize = () => { this._resizeCanvas(); this._autoLayout(); };

        c.addEventListener('mousedown', this._boundMouseDown);
        c.addEventListener('mousemove', this._boundMouseMove);
        c.addEventListener('mouseup', this._boundMouseUp);
        c.addEventListener('mouseleave', this._boundMouseUp);
        window.addEventListener('resize', this._boundResize);
    },

    _removeCanvasListeners() {
        const c = this._canvas;
        if (!c) return;
        if (this._boundMouseDown) c.removeEventListener('mousedown', this._boundMouseDown);
        if (this._boundMouseMove) c.removeEventListener('mousemove', this._boundMouseMove);
        if (this._boundMouseUp) c.removeEventListener('mouseup', this._boundMouseUp);
        if (this._boundMouseUp) c.removeEventListener('mouseleave', this._boundMouseUp);
        if (this._boundResize) window.removeEventListener('resize', this._boundResize);
    },

    _getCanvasCoords(e) {
        const rect = this._canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },

    _hitTestNode(x, y) {
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const n = this._nodes[i];
            if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) {
                return n;
            }
        }
        return null;
    },

    _onCanvasMouseDown(e) {
        const pos = this._getCanvasCoords(e);
        const node = this._hitTestNode(pos.x, pos.y);
        if (node) {
            this._dragNode = node;
            this._dragOffset = { x: pos.x - node.x, y: pos.y - node.y };
            this._canvas.classList.add('grabbing');
        }
    },

    _onCanvasMouseMove(e) {
        const pos = this._getCanvasCoords(e);
        this._mousePos = pos;

        if (this._dragNode) {
            this._dragNode.x = Math.max(0, pos.x - this._dragOffset.x);
            this._dragNode.y = Math.max(0, pos.y - this._dragOffset.y);
        } else {
            const node = this._hitTestNode(pos.x, pos.y);
            this._hoveredNode = node;
            this._canvas.style.cursor = node ? 'grab' : 'default';
        }
    },

    _onCanvasMouseUp() {
        this._dragNode = null;
        this._canvas?.classList.remove('grabbing');
    },

    // ================================================================
    // CANVAS RENDERING
    // ================================================================
    _startRender() {
        const render = () => {
            this._drawCanvas();
            this._animFrame = requestAnimationFrame(render);
        };
        this._animFrame = requestAnimationFrame(render);
    },

    _drawCanvas() {
        const ctx = this._ctx;
        const c = this._canvas;
        if (!ctx || !c) return;

        const W = parseInt(c.style.width);
        const H = parseInt(c.style.height);

        // Clear with theme background
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Draw connections first (behind nodes)
        this._drawConnections(ctx, W, H);

        // Draw nodes
        for (const node of this._nodes) {
            this._drawNode(ctx, node);
        }

        // Tier labels
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'left';
        if (this._nodes.length > 0) {
            ctx.fillText('POWER SOURCES', 12, 20);
            ctx.fillText('DISTRIBUTION', 12, H * 0.4 - 10);
            ctx.fillText('END DEVICES', 12, H * 0.75 - 10);
        }
    },

    _drawNode(ctx, node) {
        const isHovered = this._hoveredNode === node;
        const isDragged = this._dragNode === node;

        // Shadow
        if (isHovered || isDragged) {
            ctx.shadowColor = node.color + '44';
            ctx.shadowBlur = 16;
        }

        // Background
        ctx.fillStyle = isHovered ? node.color + '30' : node.color + '18';
        ctx.strokeStyle = isHovered ? node.color : node.color + '80';
        ctx.lineWidth = isDragged ? 2.5 : 2;

        const r = 8;
        this._roundRect(ctx, node.x, node.y, node.w, node.h, r);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Icon bar at top
        ctx.fillStyle = node.color + '28';
        this._roundRectTop(ctx, node.x, node.y, node.w, 24, r);
        ctx.fill();

        // Icon
        ctx.fillStyle = node.color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.icon, node.x + node.w / 2, node.y + 13);

        // Label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px sans-serif';
        ctx.textBaseline = 'middle';
        const labelY = node.y + 24 + (node.h - 24) * 0.35;
        const maxLabelW = node.w - 12;
        let label = node.label;
        while (ctx.measureText(label).width > maxLabelW && label.length > 3) {
            label = label.slice(0, -1);
        }
        if (label !== node.label) label += '..';
        ctx.fillText(label, node.x + node.w / 2, labelY);

        // Sub text
        if (node.sub) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '9px sans-serif';
            ctx.fillText(node.sub, node.x + node.w / 2, labelY + 14);
        }
    },

    _drawConnections(ctx, W, H) {
        // Source -> Distro lines
        for (const d of this._data.distros) {
            if (!d.sourceId) continue;
            const srcNode = this._nodes.find(n => n.type === 'source' && n.dataId === d.sourceId);
            const distNode = this._nodes.find(n => n.type === 'distro' && n.dataId === d.id);
            if (!srcNode || !distNode) continue;

            const src = this._data.sources.find(s => s.id === d.sourceId);
            const phases = src ? src.phases : 1;

            // Draw phase lines
            if (phases === 3) {
                const offsets = [-4, 0, 4];
                const phaseKeys = ['L1', 'L2', 'L3'];
                for (let p = 0; p < 3; p++) {
                    ctx.strokeStyle = this._PHASE_COLORS[phaseKeys[p]];
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(srcNode.x + srcNode.w / 2 + offsets[p], srcNode.y + srcNode.h);
                    ctx.bezierCurveTo(
                        srcNode.x + srcNode.w / 2 + offsets[p], srcNode.y + srcNode.h + 40,
                        distNode.x + distNode.w / 2 + offsets[p], distNode.y - 40,
                        distNode.x + distNode.w / 2 + offsets[p], distNode.y
                    );
                    ctx.stroke();
                }
            } else {
                ctx.strokeStyle = this._PHASE_COLORS.L1;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(srcNode.x + srcNode.w / 2, srcNode.y + srcNode.h);
                ctx.bezierCurveTo(
                    srcNode.x + srcNode.w / 2, srcNode.y + srcNode.h + 40,
                    distNode.x + distNode.w / 2, distNode.y - 40,
                    distNode.x + distNode.w / 2, distNode.y
                );
                ctx.stroke();
            }

            // Neutral line
            ctx.strokeStyle = this._PHASE_COLORS.N;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(srcNode.x + srcNode.w / 2 + 8, srcNode.y + srcNode.h);
            ctx.bezierCurveTo(
                srcNode.x + srcNode.w / 2 + 8, srcNode.y + srcNode.h + 40,
                distNode.x + distNode.w / 2 + 8, distNode.y - 40,
                distNode.x + distNode.w / 2 + 8, distNode.y
            );
            ctx.stroke();
            ctx.setLineDash([]);

            // Load label at midpoint
            const usedAmps = this._getSourceUsedAmps(d.sourceId);
            if (usedAmps > 0) {
                const mx = (srcNode.x + srcNode.w / 2 + distNode.x + distNode.w / 2) / 2;
                const my = (srcNode.y + srcNode.h + distNode.y) / 2;
                ctx.fillStyle = 'rgba(15,17,23,0.85)';
                const txt = usedAmps.toFixed(1) + 'A';
                const tw = ctx.measureText(txt).width + 8;
                ctx.fillRect(mx - tw / 2, my - 8, tw, 16);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(txt, mx, my);
            }
        }

        // Distro -> Device lines (with cable type coloring and name/ND labels)
        for (const a of this._data.assignments) {
            const distNode = this._nodes.find(n => n.type === 'distro' && n.dataId === a.distroId);
            const devNode = this._nodes.find(n => n.type === 'device' && n.dataId === a.id);
            if (!distNode || !devNode) continue;

            // Use cable type color if available
            const ct = this._CABLE_TYPES.find(c => c.id === a.cableType);
            ctx.strokeStyle = ct ? ct.color + 'cc' : (this._PHASE_COLORS.L1 + 'aa');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(distNode.x + distNode.w / 2, distNode.y + distNode.h);
            ctx.bezierCurveTo(
                distNode.x + distNode.w / 2, distNode.y + distNode.h + 30,
                devNode.x + devNode.w / 2, devNode.y - 30,
                devNode.x + devNode.w / 2, devNode.y
            );
            ctx.stroke();

            // Cable name/ND label and load at midpoint
            const mx = (distNode.x + distNode.w / 2 + devNode.x + devNode.w / 2) / 2;
            const my = (distNode.y + distNode.h + devNode.y) / 2;
            const labels = [];
            if (a.cableName) labels.push(a.cableName);
            if (ct) labels.push(ct.label + ' ' + a.cableLength + 'm');
            if (a.load > 0) labels.push(a.load + 'A');
            if (labels.length > 0) {
                const txt = labels.join(' | ');
                ctx.font = 'bold 9px sans-serif';
                const tw = ctx.measureText(txt).width + 12;
                ctx.fillStyle = 'rgba(15,17,23,0.9)';
                ctx.fillRect(mx - tw / 2, my - 9, tw, 18);
                ctx.strokeStyle = ct ? ct.color + '66' : 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(mx - tw / 2, my - 9, tw, 18);
                ctx.fillStyle = ct ? ct.color : '#94a3b8';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(txt, mx, my);
            }
        }
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _roundRectTop(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    // ================================================================
    // AUTO LAYOUT
    // ================================================================
    _autoLayout() {
        if (!this._canvas) return;
        const W = parseInt(this._canvas.style.width) || 800;
        const H = parseInt(this._canvas.style.height) || 500;

        const nodeW = 120;
        const nodeH = 60;
        this._nodes = [];

        // Tier 1: Power Sources (top)
        const sources = this._data.sources;
        const srcY = 30;
        const srcSpacing = Math.min(160, (W - 40) / Math.max(1, sources.length));
        const srcStartX = (W - srcSpacing * sources.length) / 2 + srcSpacing / 2 - nodeW / 2;
        sources.forEach((s, i) => {
            const kw = (s.amps * s.voltage * (s.phases === 3 ? Math.sqrt(3) : 1)) / 1000;
            this._nodes.push({
                type: 'source', dataId: s.id,
                x: srcStartX + i * srcSpacing, y: srcY,
                w: nodeW, h: nodeH,
                color: '#ef4444',
                icon: '\u26A1',
                label: s.name,
                sub: s.type + ' / ' + kw.toFixed(1) + 'kW',
            });
        });

        // Tier 2: Distribution (middle)
        const distros = this._data.distros;
        const distY = H * 0.38;
        const distSpacing = Math.min(160, (W - 40) / Math.max(1, distros.length));
        const distStartX = (W - distSpacing * distros.length) / 2 + distSpacing / 2 - nodeW / 2;
        distros.forEach((d, i) => {
            this._nodes.push({
                type: 'distro', dataId: d.id,
                x: distStartX + i * distSpacing, y: distY,
                w: nodeW, h: nodeH,
                color: '#f59e0b',
                icon: '\u2394',
                label: d.name,
                sub: d.numOutputs + 'x ' + d.outputType,
            });
        });

        // Tier 3: End Devices (bottom)
        const assignments = this._data.assignments;
        const devY = H * 0.72;
        const devSpacing = Math.min(140, (W - 40) / Math.max(1, assignments.length));
        const devStartX = (W - devSpacing * assignments.length) / 2 + devSpacing / 2 - nodeW / 2;
        assignments.forEach((a, i) => {
            this._nodes.push({
                type: 'device', dataId: a.id,
                x: devStartX + i * devSpacing, y: devY,
                w: nodeW, h: nodeH,
                color: '#3b82f6',
                icon: this._getDeviceIcon(a.destType),
                label: a.destName || a.destType,
                sub: a.load + 'A / ' + a.cableLength + 'm',
            });
        });
    },

    _getDeviceIcon(destType) {
        const icons = {
            'LED Wall': '\u25A3', 'LED Processor': '\u2339', 'Media Server': '\u2616',
            'Lighting Truss': '\u2600', 'Camera': '\u25CE', 'Audio': '\u266B',
            'Rigging Motor': '\u2699', 'Custom': '\u25C6',
        };
        return icons[destType] || '\u25C6';
    },

    _zoomFit() {
        this._resizeCanvas();
        this._autoLayout();
    },

    // ================================================================
    // IMPORT / EXPORT
    // ================================================================
    _exportJSON() {
        const json = JSON.stringify(this._data, null, 2);
        UI.exportFile('power-distribution.json', json, [
            { name: 'JSON Files', extensions: ['json'] }
        ]);
    },

    _exportPNG() {
        if (!this._canvas) {
            UI.toast('No canvas to export', 'warning');
            return;
        }
        // Force a clean draw
        this._drawCanvas();

        try {
            const dataUrl = this._canvas.toDataURL('image/png');
            // Convert data URL to binary for export
            const binary = atob(dataUrl.split(',')[1]);
            const arr = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
            const blob = new Blob([arr], { type: 'image/png' });

            if (window.luxorProject?.exportFile) {
                // Use canvas toBlob for Electron
                this._canvas.toBlob(async (b) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const buffer = reader.result;
                        const result = await window.luxorProject.exportFile('power-map.png', new Uint8Array(buffer), [
                            { name: 'PNG Images', extensions: ['png'] }
                        ]);
                        if (result.ok) UI.toast('PNG exported to ' + result.path, 'success');
                    };
                    reader.readAsArrayBuffer(b);
                }, 'image/png');
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'power-map.png';
                a.click();
                URL.revokeObjectURL(url);
                UI.toast('PNG exported', 'success');
            }
        } catch (err) {
            UI.toast('Export failed: ' + err.message, 'error');
        }
    },

    _importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.sources && data.distros && data.assignments) {
                        this._data = data;
                        // Recalculate next ID
                        let maxId = 0;
                        for (const s of data.sources) maxId = Math.max(maxId, s.id || 0);
                        for (const d of data.distros) maxId = Math.max(maxId, d.id || 0);
                        for (const a of data.assignments) maxId = Math.max(maxId, a.id || 0);
                        this._nextId = maxId + 1;
                        this._refreshAll();
                        UI.toast('Configuration imported', 'success');
                    } else {
                        UI.toast('Invalid power config file', 'error');
                    }
                } catch (err) {
                    UI.toast('Failed to parse JSON: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },
};
