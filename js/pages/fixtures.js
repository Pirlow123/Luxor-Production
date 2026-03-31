/**
 * Fixture Patch / Universe Distribution Page
 * Capture 2025-style truss layout with fixture patching, canvas visualization,
 * cable runs, and universe management.
 * Luxor Production
 */
const FixturesPage = {

    // ================================================================
    // FIXTURE TYPE LIBRARY
    // ================================================================
    _fixtureTypes: [
        // ── Robe ──
        { id: 'megapointe',  name: 'Robe MegaPointe',         shortName: 'MP',   channels: 34, weight: 22.5, power: 470,  icon: 'spot',   color: '#f97316' },
        { id: 'spiider',     name: 'Robe Spiider',            shortName: 'SPI',  channels: 46, weight: 14.0, power: 360,  icon: 'wash',   color: '#fb923c' },
        { id: 'ledbeam150',  name: 'Robe LEDBeam 150',        shortName: 'LB',   channels: 21, weight: 5.8,  power: 180,  icon: 'beam',   color: '#fdba74' },
        { id: 'robin-t1',    name: 'Robe Robin T1 Profile',   shortName: 'T1',   channels: 38, weight: 23.0, power: 468,  icon: 'spot',   color: '#ea580c' },
        { id: 'bmfl',        name: 'Robe BMFL Spot',          shortName: 'BMFL', channels: 38, weight: 36.0, power: 1700, icon: 'spot',   color: '#c2410c' },
        { id: 'forte',       name: 'Robe Forte',              shortName: 'FT',   channels: 48, weight: 37.5, power: 1000, icon: 'spot',   color: '#9a3412' },
        { id: 'esprite',     name: 'Robe Esprite',            shortName: 'ESP',  channels: 42, weight: 25.5, power: 650,  icon: 'spot',   color: '#b45309' },
        // ── Acme ──
        { id: 'pixeline',    name: 'Acme Pixeline',           shortName: 'PXL',  channels: 24, weight: 10.0, power: 320,  icon: 'strip',  color: '#a3e635' },
        { id: 'libra',       name: 'Acme Libra',              shortName: 'LIB',  channels: 20, weight: 10.5, power: 350,  icon: 'wash',   color: '#84cc16' },
        // ── Chauvet ──
        { id: 'colorstrike', name: 'Chauvet Color Strike M',  shortName: 'CSM',  channels: 14, weight: 10.0, power: 370,  icon: 'strobe', color: '#fde047' },
        // ── Martin ──
        { id: 'mac-aura',    name: 'Martin MAC Aura XB',      shortName: 'AXB',  channels: 29, weight: 7.9,  power: 270,  icon: 'wash',   color: '#f59e0b' },
        // ── Clay Paky ──
        { id: 'sharpy-plus', name: 'Clay Paky Sharpy Plus',   shortName: 'SHP',  channels: 24, weight: 19.0, power: 330,  icon: 'beam',   color: '#eab308' },
        // ── GLP ──
        { id: 'impression-x5',name: 'GLP impression X5',      shortName: 'X5',   channels: 20, weight: 7.8,  power: 250,  icon: 'wash',   color: '#65a30d' },
        // ── Generic types ──
        { id: 'mh-wash',     name: 'Moving Head Wash',        shortName: 'MHW',  channels: 37, weight: 23.5, power: 550,  icon: 'wash',   color: '#a855f7' },
        { id: 'mh-spot',     name: 'Moving Head Spot',        shortName: 'MHS',  channels: 38, weight: 25.0, power: 600,  icon: 'spot',   color: '#3b82f6' },
        { id: 'led-par',     name: 'LED Par',                 shortName: 'LP',   channels: 8,  weight: 4.0,  power: 120,  icon: 'par',    color: '#eab308' },
        { id: 'blinder',     name: 'Blinder',                 shortName: 'BL',   channels: 2,  weight: 6.0,  power: 1300, icon: 'blinder',color: '#f97316' },
        { id: 'strobe',      name: 'Atomic 3000',             shortName: 'AT3',  channels: 6,  weight: 7.3,  power: 3000, icon: 'strobe', color: '#ef4444' },
        { id: 'followspot',  name: 'Follow Spot',             shortName: 'FS',   channels: 0,  weight: 12.0, power: 800,  icon: 'follow', color: '#f5f5f5' },
        { id: 'led-strip',   name: 'LED Strip/Bar',           shortName: 'LS',   channels: 36, weight: 3.5,  power: 100,  icon: 'strip',  color: '#ec4899' },
        { id: 'source4',     name: 'ETC Source Four',          shortName: 'S4',   channels: 1,  weight: 8.0,  power: 750,  icon: 'spot',   color: '#ca8a04' },
        { id: 'custom',      name: 'Custom',                  shortName: 'CU',   channels: 1,  weight: 5.0,  power: 200,  icon: 'custom', color: '#94a3b8' },
    ],

    // ================================================================
    // TRUSS TYPES
    // ================================================================
    _trussTypes: [
        { id: 'hd34',  label: 'Eurotruss HD34',  profile: '340×340mm', weight: 9.8,  maxLoad: 2250, desc: 'Heavy duty box truss' },
        { id: 'fd34',  label: 'Eurotruss FD34',  profile: '340×340mm', weight: 6.8,  maxLoad: 1500, desc: 'Folding box truss' },
        { id: 'xd',    label: 'Eurotruss XD',    profile: '400×400mm', weight: 12.5, maxLoad: 3000, desc: 'Extra heavy duty' },
        { id: 'st',    label: 'Eurotruss ST',    profile: '300×300mm', weight: 5.0,  maxLoad: 800,  desc: 'Standard truss' },
        { id: 'prerig',label: 'Eurotruss Pre-rig',profile: '340×340mm',weight: 9.8,  maxLoad: 2250, desc: 'Pre-rigged HD34' },
    ],

    // ================================================================
    // STATE
    // ================================================================
    _trusses: [],
    _fixtures: [],
    _nextTrussId: 1,
    _nextFixtureId: 1,
    _selectedFixtureId: null,
    _selectedTrussId: null,
    _canvas: null,
    _ctx: null,
    _canvasScale: 1,
    _canvasOffset: { x: 0, y: 0 },
    _isDragging: false,
    _dragStart: null,
    _hoveredFixtureId: null,

    // ================================================================
    // UNIVERSE HELPERS
    // ================================================================
    _universeLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',

    _addrToUniverseLabel(addr) {
        if (addr < 1) return '--';
        const uniIdx = Math.floor((addr - 1) / 512);
        const ch = (addr - 1) % 512 + 1;
        const letter = this._universeLetters[uniIdx] || ('U' + (uniIdx + 1));
        return letter + '.' + ch;
    },

    _universeOf(addr) {
        return Math.floor((addr - 1) / 512);
    },

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        return `
        <style>
            .fx-layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
            .fx-main { display: flex; flex-direction: column; gap: 16px; }
            .fx-sidebar { display: flex; flex-direction: column; gap: 16px; }
            .fx-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .fx-toolbar .btn { white-space: nowrap; }
            .fx-canvas-wrap { position: relative; background: #0d1117; border-radius: 8px; border: 1px solid var(--border); overflow: hidden; min-height: 600px; }
            .fx-canvas { display: block; width: 100%; height: 600px; cursor: grab; }
            .fx-canvas:active { cursor: grabbing; }
            .fx-canvas-controls { position: absolute; bottom: 12px; right: 12px; display: flex; gap: 6px; z-index: 5; }
            .fx-canvas-controls .btn { background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15); padding: 6px 10px; font-size: 12px; }
            .fx-canvas-controls .btn:hover { background: rgba(255,255,255,0.1); }
            .fx-truss-list { max-height: 240px; overflow-y: auto; }
            .fx-truss-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; font-size: 12px; }
            .fx-truss-item:hover { background: rgba(255,255,255,0.04); }
            .fx-truss-item.selected { background: rgba(0,212,170,0.08); border-color: var(--accent); }
            .fx-truss-item .fx-truss-color { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
            .fx-truss-item .fx-truss-name { flex: 1; font-weight: 600; color: var(--text-primary); }
            .fx-truss-item .fx-truss-meta { font-size: 10px; color: var(--text-muted); }
            .fx-truss-item .fx-truss-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
            .fx-truss-item:hover .fx-truss-actions { opacity: 1; }
            .fx-prop-group { margin-bottom: 12px; }
            .fx-prop-group h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 6px; font-weight: 700; }
            .fx-prop-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
            .fx-prop-row label { min-width: 80px; color: var(--text-muted); font-weight: 600; }
            .fx-prop-row .val { color: var(--text-primary); font-weight: 500; }
            .fx-prop-row input, .fx-prop-row select { max-width: 140px; font-size: 12px; }
            .fx-universe-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 4px; font-size: 11px; background: rgba(255,255,255,0.02); }
            .fx-universe-row.conflict { border-color: #ef4444; background: rgba(239,68,68,0.08); }
            .fx-universe-letter { font-size: 16px; font-weight: 800; min-width: 24px; text-align: center; }
            .fx-universe-info { flex: 1; color: var(--text-secondary); }
            .fx-universe-bar { height: 6px; width: 100%; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; margin-top: 3px; }
            .fx-universe-bar-fill { height: 100%; border-radius: 3px; }
            .fx-legend { display: flex; gap: 16px; flex-wrap: wrap; padding: 8px 0; }
            .fx-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--text-muted); }
            .fx-legend-line { width: 20px; height: 3px; border-radius: 2px; }
            .fx-empty-hint { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 13px; }
            .fx-empty-hint i { font-size: 32px; display: block; margin-bottom: 12px; opacity: 0.3; }
            @media (max-width: 1100px) {
                .fx-layout { grid-template-columns: 1fr; }
                .fx-sidebar { order: -1; }
            }
        </style>

        <div class="section-header">
            <h2><i class="fas fa-lightbulb"></i> Fixture Patch</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="FixturesPage._importJSON()"><i class="fas fa-file-import"></i> Import</button>
                <button class="btn btn-sm" onclick="FixturesPage._importC2PDialog()"><i class="fas fa-file-import"></i> Import .c2p</button>
                <button class="btn btn-sm" onclick="FixturesPage._exportJSON()"><i class="fas fa-file-export"></i> JSON</button>
                <button class="btn btn-sm" onclick="FixturesPage._exportCSV()"><i class="fas fa-table"></i> CSV</button>
                <button class="btn btn-sm" onclick="FixturesPage._exportPNG()"><i class="fas fa-image"></i> PNG</button>
            </div>
        </div>

        <div class="stat-grid" id="fx-stats"></div>

        <div class="fx-layout">
            <div class="fx-main">
                <!-- Toolbar -->
                <div class="card">
                    <div class="card-body" style="padding:10px 14px;">
                        <div class="fx-toolbar">
                            <button class="btn btn-sm btn-primary" onclick="FixturesPage._addTrussModal()"><i class="fas fa-plus"></i> Add Truss</button>
                            <button class="btn btn-sm" onclick="FixturesPage._addFixtureModal()" id="fx-btn-add-fixture"><i class="fas fa-plus"></i> Add Fixtures</button>
                            <button class="btn btn-sm" onclick="FixturesPage._autoPatch()"><i class="fas fa-magic"></i> Auto-Patch</button>
                            <button class="btn btn-sm" onclick="FixturesPage._bulkSetModal()"><i class="fas fa-tags"></i> Set IDs/ND</button>
                            <div style="flex:1;"></div>
                            <button class="btn btn-sm btn-ghost" onclick="FixturesPage._clearAll()"><i class="fas fa-trash"></i> Clear All</button>
                        </div>
                    </div>
                </div>

                <!-- Canvas -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-drafting-compass"></i> Fixture Layout</h3></div>
                    <div class="card-body" style="padding:0;">
                        <div class="fx-canvas-wrap">
                            <canvas id="fx-canvas" class="fx-canvas" width="1200" height="600"></canvas>
                            <div class="fx-canvas-controls">
                                <button class="btn btn-xs" onclick="FixturesPage._zoomIn()"><i class="fas fa-search-plus"></i></button>
                                <button class="btn btn-xs" onclick="FixturesPage._zoomOut()"><i class="fas fa-search-minus"></i></button>
                                <button class="btn btn-xs" onclick="FixturesPage._zoomFit()"><i class="fas fa-expand"></i> Fit</button>
                            </div>
                        </div>
                        <div class="fx-legend" style="padding: 8px 14px;">
                            <div class="fx-legend-item"><div class="fx-legend-line" style="background:#ef4444;"></div> AC Power</div>
                            <div class="fx-legend-item"><div class="fx-legend-line" style="background:#22c55e;"></div> DMX</div>
                            <div class="fx-legend-item"><div class="fx-legend-line" style="background:#3b82f6;"></div> Data/HDMI</div>
                        </div>
                    </div>
                </div>

                <!-- Universe Summary -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-th"></i> Universe Summary</h3></div>
                    <div class="card-body" id="fx-universe-body"></div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="fx-sidebar">
                <!-- Trusses -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-grip-lines-vertical"></i> Trusses</h3>
                    </div>
                    <div class="card-body" style="padding:8px;">
                        <div class="fx-truss-list" id="fx-truss-list"></div>
                    </div>
                </div>

                <!-- Properties -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Properties</h3></div>
                    <div class="card-body" id="fx-props-body" style="padding:10px 12px;">
                        <div class="fx-empty-hint">
                            <i class="fas fa-mouse-pointer"></i>
                            Select a fixture or truss to view properties
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    onActivate() {
        this._initCanvas();
        this._refreshAll();
    },

    onDeactivate() {
        this._selectedFixtureId = null;
        this._selectedTrussId = null;
    },

    // ================================================================
    // CANVAS INIT
    // ================================================================
    _initCanvas() {
        const c = document.getElementById('fx-canvas');
        if (!c) return;
        this._canvas = c;
        this._ctx = c.getContext('2d');

        // High-DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = c.getBoundingClientRect();
        c.width = rect.width * dpr;
        c.height = rect.height * dpr;
        c.style.width = rect.width + 'px';
        c.style.height = rect.height + 'px';
        this._ctx.scale(dpr, dpr);
        this._canvasW = rect.width;
        this._canvasH = rect.height;

        // Pan
        c.addEventListener('mousedown', (e) => this._onCanvasMouseDown(e));
        c.addEventListener('mousemove', (e) => this._onCanvasMouseMove(e));
        c.addEventListener('mouseup', () => this._onCanvasMouseUp());
        c.addEventListener('mouseleave', () => this._onCanvasMouseUp());
        c.addEventListener('wheel', (e) => this._onCanvasWheel(e), { passive: false });
        c.addEventListener('click', (e) => this._onCanvasClick(e));

        this._canvasScale = 1;
        this._canvasOffset = { x: 40, y: 40 };

        // Demo data if empty
        if (this._trusses.length === 0) {
            this._addDefaultData();
        }

        this._zoomFit();
    },

    _addDefaultData() {
        // Add two trusses with some fixtures for demonstration
        const t1 = this._createTruss('FOH Truss', 12, 6, 0, 'hd34');
        const t2 = this._createTruss('Midstage Truss', 10, 4, 8, 'fd34');
        const t3 = this._createTruss('Upstage Truss', 14, 3, 16, 'prerig');

        this._trusses.push(t1, t2, t3);

        // Add fixtures to FOH
        this._addFixturesToTruss(t1.id, 'mh-wash', 6, true);
        this._addFixturesToTruss(t1.id, 'mh-spot', 4, true);

        // Add fixtures to Midstage
        this._addFixturesToTruss(t2.id, 'led-wash', 8, true);
        this._addFixturesToTruss(t2.id, 'strobe', 3, true);

        // Add fixtures to Upstage
        this._addFixturesToTruss(t3.id, 'mh-wash', 8, true);
        this._addFixturesToTruss(t3.id, 'led-par', 12, true);
        this._addFixturesToTruss(t3.id, 'blinder', 4, true);

        this._autoPatch();
    },

    _createTruss(name, length, height, posY, type) {
        const colors = ['#00d4aa', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#ec4899', '#22c55e', '#06b6d4'];
        const id = this._nextTrussId++;
        return {
            id,
            name,
            length,
            height,
            posY,
            type: type || 'box',
            color: colors[(id - 1) % colors.length],
        };
    },

    // ================================================================
    // FIXTURE MANAGEMENT
    // ================================================================
    _getFixtureType(typeId) {
        return this._fixtureTypes.find(t => t.id === typeId) || this._fixtureTypes[0];
    },

    _addFixturesToTruss(trussId, typeId, qty, autoSpace) {
        const truss = this._trusses.find(t => t.id === trussId);
        if (!truss) return;
        const ft = this._getFixtureType(typeId);
        const existing = this._fixtures.filter(f => f.trussId === trussId);
        const startIdx = existing.length;

        for (let i = 0; i < qty; i++) {
            const pos = autoSpace
                ? ((i + 0.5) / qty) * truss.length
                : ((startIdx + i + 0.5) / (startIdx + qty)) * truss.length;
            this._fixtures.push({
                id: this._nextFixtureId++,
                trussId,
                typeId,
                position: Math.round(pos * 100) / 100,
                address: 0,
                channels: ft.channels,
                customChannels: ft.id === 'custom' ? 1 : null,
                fixtureId: '',      // User-defined fixture ID (e.g. "MH01")
                acCircuit: '',      // AC circuit name (e.g. "L1.3")
                nd: '',             // ND / power distribution (e.g. "ND 4")
                notes: '',
            });
        }
    },

    _removeFixture(id) {
        this._fixtures = this._fixtures.filter(f => f.id !== id);
        if (this._selectedFixtureId === id) this._selectedFixtureId = null;
        this._refreshAll();
    },

    _removeTruss(id) {
        this._trusses = this._trusses.filter(t => t.id !== id);
        this._fixtures = this._fixtures.filter(f => f.trussId !== id);
        if (this._selectedTrussId === id) this._selectedTrussId = null;
        this._refreshAll();
    },

    // ================================================================
    // AUTO-PATCH
    // ================================================================
    _autoPatch() {
        let addr = 1;
        // Sort fixtures by truss order then position
        const trussOrder = {};
        this._trusses.forEach((t, i) => { trussOrder[t.id] = i; });
        const sorted = [...this._fixtures].sort((a, b) => {
            const tDiff = (trussOrder[a.trussId] || 0) - (trussOrder[b.trussId] || 0);
            if (tDiff !== 0) return tDiff;
            return a.position - b.position;
        });
        sorted.forEach(fix => {
            const ft = this._getFixtureType(fix.typeId);
            const ch = fix.customChannels || ft.channels;
            if (ch === 0) {
                fix.address = 0;
                return;
            }
            // If current address would cross universe boundary, jump to next universe
            const uniStart = Math.floor((addr - 1) / 512) * 512 + 1;
            if (addr + ch - 1 > uniStart + 511) {
                addr = uniStart + 512;
            }
            fix.address = addr;
            fix.channels = ch;
            addr += ch;
        });
        // Write back
        sorted.forEach(s => {
            const f = this._fixtures.find(ff => ff.id === s.id);
            if (f) { f.address = s.address; f.channels = s.channels; }
        });
        this._refreshAll();
        UI.toast('Auto-patch applied', 'success');
    },

    _bulkSetModal() {
        if (!this._fixtures.length) { UI.toast('No fixtures to configure', 'warning'); return; }
        const trussOpts = [
            '<option value="all">All Trusses</option>',
            ...this._trusses.map(t => `<option value="${t.id}" ${t.id === this._selectedTrussId ? 'selected' : ''}>${UI.esc(t.name)}</option>`)
        ].join('');

        UI.openModal('Bulk Set Fixture IDs / ND', `
            <div class="form-group"><label class="form-label">Apply To</label>
                <select class="form-control" id="fx-bulk-truss">${trussOpts}</select>
            </div>
            <div class="form-group"><label class="form-label">Starting Fixture ID</label>
                <input type="text" class="form-control" id="fx-bulk-fid" placeholder="e.g. MH01 (auto-increments)" value="">
                <small style="color:var(--text-muted);">Leave empty to skip. Uses prefix + number, e.g. MH01, MH02...</small>
            </div>
            <div class="form-group"><label class="form-label">ND / Power Label</label>
                <input type="text" class="form-control" id="fx-bulk-nd" placeholder="e.g. ND 4" value="">
                <small style="color:var(--text-muted);">Leave empty to skip. Applied to all selected fixtures.</small>
            </div>
            <div class="form-group"><label class="form-label">AC Circuit (prefix)</label>
                <input type="text" class="form-control" id="fx-bulk-ac" placeholder="e.g. L1. (auto-numbers: L1.1, L1.2...)" value="">
                <small style="color:var(--text-muted);">Leave empty to skip.</small>
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="FixturesPage._bulkSetConfirm()">Apply</button>`);
    },

    _bulkSetConfirm() {
        const trussVal = document.getElementById('fx-bulk-truss')?.value;
        const fid = document.getElementById('fx-bulk-fid')?.value?.trim() || '';
        const nd = document.getElementById('fx-bulk-nd')?.value?.trim() || '';
        const ac = document.getElementById('fx-bulk-ac')?.value?.trim() || '';

        let targets = this._fixtures;
        if (trussVal !== 'all') {
            targets = targets.filter(f => f.trussId === parseInt(trussVal));
        }
        // Sort by truss order then position
        const trussOrder = {};
        this._trusses.forEach((t, i) => { trussOrder[t.id] = i; });
        targets.sort((a, b) => {
            const tDiff = (trussOrder[a.trussId] || 0) - (trussOrder[b.trussId] || 0);
            return tDiff !== 0 ? tDiff : a.position - b.position;
        });

        // Parse fixture ID prefix/number
        const fidMatch = fid.match(/^([A-Za-z]*)(\d+)$/);
        const fidPrefix = fidMatch ? fidMatch[1] : fid;
        let fidNum = fidMatch ? parseInt(fidMatch[2]) : 1;
        const fidPad = fidMatch ? fidMatch[2].length : 0;

        let count = 0;
        targets.forEach((f, i) => {
            if (fid) f.fixtureId = fidPrefix + String(fidNum + i).padStart(fidPad, '0');
            if (nd) f.nd = nd;
            if (ac) f.acCircuit = ac + (i + 1);
            count++;
        });

        UI.closeModal();
        this._refreshAll();
        UI.toast(`Updated ${count} fixtures`, 'success');
    },

    // ================================================================
    // STATS
    // ================================================================
    _getStats() {
        const totalFixtures = this._fixtures.length;
        const usedAddresses = new Set();
        let maxAddr = 0;
        let totalWeight = 0;
        let totalPower = 0;
        const conflicts = [];
        const trussWeight = {};
        const trussPower = {};

        this._fixtures.forEach(f => {
            const ft = this._getFixtureType(f.typeId);
            totalWeight += ft.weight;
            totalPower += ft.power;
            if (!trussWeight[f.trussId]) trussWeight[f.trussId] = 0;
            if (!trussPower[f.trussId]) trussPower[f.trussId] = 0;
            trussWeight[f.trussId] += ft.weight;
            trussPower[f.trussId] += ft.power;

            if (f.address > 0 && f.channels > 0) {
                for (let ch = f.address; ch < f.address + f.channels; ch++) {
                    if (usedAddresses.has(ch)) {
                        conflicts.push(ch);
                    }
                    usedAddresses.add(ch);
                    if (ch > maxAddr) maxAddr = ch;
                }
            }
        });

        const totalUniverses = maxAddr > 0 ? Math.ceil(maxAddr / 512) : 0;
        return { totalFixtures, totalUniverses, totalChannels: usedAddresses.size, totalWeight, totalPower, conflicts: [...new Set(conflicts)], trussWeight, trussPower };
    },

    _renderStats() {
        const el = document.getElementById('fx-stats');
        if (!el) return;
        const s = this._getStats();
        el.innerHTML =
            UI.statCard('fa-lightbulb', 'accent', 'Fixtures', s.totalFixtures) +
            UI.statCard('fa-th', 'purple', 'Universes', s.totalUniverses) +
            UI.statCard('fa-hashtag', 'blue', 'Channels', s.totalChannels) +
            UI.statCard('fa-weight-hanging', 'orange', 'Total Weight', s.totalWeight.toFixed(1) + ' kg') +
            UI.statCard('fa-bolt', 'yellow', 'Total Power', (s.totalPower / 1000).toFixed(1) + ' kW') +
            UI.statCard('fa-exclamation-triangle', s.conflicts.length > 0 ? 'red' : 'green', 'Conflicts', s.conflicts.length);
    },

    // ================================================================
    // TRUSS LIST
    // ================================================================
    _renderTrussList() {
        const el = document.getElementById('fx-truss-list');
        if (!el) return;
        if (this._trusses.length === 0) {
            el.innerHTML = '<div class="fx-empty-hint"><i class="fas fa-plus-circle"></i>Add a truss to get started</div>';
            return;
        }
        const stats = this._getStats();
        el.innerHTML = this._trusses.map(t => {
            const fixCount = this._fixtures.filter(f => f.trussId === t.id).length;
            const w = (stats.trussWeight[t.id] || 0).toFixed(1);
            const selected = this._selectedTrussId === t.id ? ' selected' : '';
            return `<div class="fx-truss-item${selected}" onclick="FixturesPage._selectTruss(${t.id})" data-truss="${t.id}">
                <div class="fx-truss-color" style="background:${t.color};"></div>
                <span class="fx-truss-name">${UI.esc(t.name)}</span>
                <span class="fx-truss-meta">${fixCount}fx | ${w}kg | ${t.length}m</span>
                <div class="fx-truss-actions">
                    <button class="btn btn-xs btn-ghost" onclick="event.stopPropagation();FixturesPage._editTrussModal(${t.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-xs btn-ghost" onclick="event.stopPropagation();FixturesPage._confirmRemoveTruss(${t.id})" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    _selectTruss(id) {
        this._selectedTrussId = id;
        this._selectedFixtureId = null;
        this._renderTrussList();
        this._renderProperties();
        this._drawCanvas();
    },

    // ================================================================
    // PROPERTIES PANEL
    // ================================================================
    _renderProperties() {
        const el = document.getElementById('fx-props-body');
        if (!el) return;

        if (this._selectedFixtureId) {
            const fix = this._fixtures.find(f => f.id === this._selectedFixtureId);
            if (!fix) { el.innerHTML = ''; return; }
            const ft = this._getFixtureType(fix.typeId);
            const truss = this._trusses.find(t => t.id === fix.trussId);
            const trussIdx = this._fixtures.filter(f => f.trussId === fix.trussId).sort((a, b) => a.position - b.position).findIndex(f => f.id === fix.id) + 1;

            el.innerHTML = `
                <div class="fx-prop-group">
                    <h4>Fixture</h4>
                    <div class="fx-prop-row"><label>Fixture ID</label>
                        <input type="text" class="form-control" value="${UI.esc(fix.fixtureId || '')}" placeholder="e.g. MH01" style="max-width:90px;font-size:12px;"
                            onchange="FixturesPage._setFixtureProp(${fix.id}, 'fixtureId', this.value)">
                    </div>
                    <div class="fx-prop-row"><label>Name</label><span class="val">${UI.esc(ft.name)}</span></div>
                    <div class="fx-prop-row"><label>Number</label><span class="val">#${trussIdx} on ${UI.esc(truss?.name || '--')}</span></div>
                    <div class="fx-prop-row"><label>Type</label><span class="val">${UI.badge(ft.shortName, 'cyan')}</span></div>
                </div>
                <div class="fx-prop-group">
                    <h4>DMX Patch</h4>
                    <div class="fx-prop-row"><label>Universe</label><span class="val" style="font-weight:800;color:var(--accent);">${fix.address > 0 ? this._addrToUniverseLabel(fix.address) : 'Unpatched'}</span></div>
                    <div class="fx-prop-row"><label>Address</label>
                        <input type="number" class="form-control" value="${fix.address}" min="0" max="8192" style="max-width:80px;font-size:12px;"
                            onchange="FixturesPage._setFixtureAddress(${fix.id}, this.value)">
                    </div>
                    <div class="fx-prop-row"><label>Channels</label><span class="val">${fix.channels}</span></div>
                    <div class="fx-prop-row"><label>Range</label><span class="val">${fix.address > 0 && fix.channels > 0 ? this._addrToUniverseLabel(fix.address) + ' \u2013 ' + this._addrToUniverseLabel(fix.address + fix.channels - 1) : '--'}</span></div>
                </div>
                <div class="fx-prop-group">
                    <h4>Power</h4>
                    <div class="fx-prop-row"><label>AC Circuit</label>
                        <input type="text" class="form-control" value="${UI.esc(fix.acCircuit || '')}" placeholder="e.g. L1.3" style="max-width:90px;font-size:12px;"
                            onchange="FixturesPage._setFixtureProp(${fix.id}, 'acCircuit', this.value)">
                    </div>
                    <div class="fx-prop-row"><label>ND</label>
                        <input type="text" class="form-control" value="${UI.esc(fix.nd || '')}" placeholder="e.g. ND 4" style="max-width:90px;font-size:12px;"
                            onchange="FixturesPage._setFixtureProp(${fix.id}, 'nd', this.value)">
                    </div>
                    <div class="fx-prop-row"><label>Power</label><span class="val">${ft.power} W</span></div>
                </div>
                <div class="fx-prop-group">
                    <h4>Position</h4>
                    <div class="fx-prop-row"><label>Truss</label><span class="val">${UI.esc(truss?.name || '--')}</span></div>
                    <div class="fx-prop-row"><label>Pos X</label>
                        <input type="number" class="form-control" value="${fix.position}" min="0" max="${truss?.length || 20}" step="0.1" style="max-width:80px;font-size:12px;"
                            onchange="FixturesPage._setFixturePosition(${fix.id}, this.value)">
                        <span class="val" style="font-size:10px;color:var(--text-muted);">m</span>
                    </div>
                    <div class="fx-prop-row"><label>Height</label><span class="val">${truss?.height || 0}m (truss)</span></div>
                    <div class="fx-prop-row"><label>Weight</label><span class="val">${ft.weight} kg</span></div>
                </div>
                <div class="fx-prop-group">
                    <h4>Notes</h4>
                    <textarea class="form-control" style="width:100%;min-height:50px;font-size:11px;resize:vertical;"
                        onchange="FixturesPage._setFixtureProp(${fix.id}, 'notes', this.value)">${UI.esc(fix.notes)}</textarea>
                </div>
                <div style="margin-top:8px;">
                    <button class="btn btn-xs btn-ghost" style="color:#ef4444;" onclick="FixturesPage._removeFixture(${fix.id})"><i class="fas fa-trash"></i> Remove Fixture</button>
                </div>
            `;
        } else if (this._selectedTrussId) {
            const truss = this._trusses.find(t => t.id === this._selectedTrussId);
            if (!truss) { el.innerHTML = ''; return; }
            const fixes = this._fixtures.filter(f => f.trussId === truss.id);
            const stats = this._getStats();
            const w = (stats.trussWeight[truss.id] || 0).toFixed(1);
            const p = (stats.trussPower[truss.id] || 0);

            // Count by type
            const typeCounts = {};
            fixes.forEach(f => {
                const ft = this._getFixtureType(f.typeId);
                typeCounts[ft.shortName] = (typeCounts[ft.shortName] || 0) + 1;
            });

            const tt = this._trussTypes.find(t => t.id === truss.type);
            const trussWeight = tt ? (tt.weight * truss.length).toFixed(1) : '--';
            const maxLoad = tt ? tt.maxLoad : '--';
            el.innerHTML = `
                <div class="fx-prop-group">
                    <h4>Truss</h4>
                    <div class="fx-prop-row"><label>Name</label><span class="val">${UI.esc(truss.name)}</span></div>
                    <div class="fx-prop-row"><label>Type</label><span class="val">${UI.esc(tt?.label || truss.type)}</span></div>
                    <div class="fx-prop-row"><label>Profile</label><span class="val">${UI.esc(tt?.profile || '--')}</span></div>
                    <div class="fx-prop-row"><label>Length</label><span class="val">${truss.length}m</span></div>
                    <div class="fx-prop-row"><label>Trim Height</label><span class="val">${truss.height}m</span></div>
                    <div class="fx-prop-row"><label>Truss Weight</label><span class="val">${trussWeight} kg</span></div>
                    <div class="fx-prop-row"><label>Max Load</label><span class="val">${maxLoad} kg</span></div>
                </div>
                <div class="fx-prop-group">
                    <h4>Load</h4>
                    <div class="fx-prop-row"><label>Fixtures</label><span class="val">${fixes.length}</span></div>
                    <div class="fx-prop-row"><label>Fixture Weight</label><span class="val">${w} kg</span></div>
                    <div class="fx-prop-row"><label>Total Weight</label><span class="val">${(parseFloat(w) + parseFloat(trussWeight || 0)).toFixed(1)} kg</span></div>
                    <div class="fx-prop-row"><label>Power</label><span class="val">${(p / 1000).toFixed(1)} kW</span></div>
                </div>
                <div class="fx-prop-group">
                    <h4>Fixture Breakdown</h4>
                    ${Object.entries(typeCounts).map(([name, cnt]) =>
                        `<div class="fx-prop-row"><label>${name}</label><span class="val">${cnt}</span></div>`
                    ).join('')}
                </div>
            `;
        } else {
            el.innerHTML = '<div class="fx-empty-hint"><i class="fas fa-mouse-pointer"></i>Select a fixture or truss to view properties</div>';
        }
    },

    _setFixtureAddress(id, val) {
        const f = this._fixtures.find(ff => ff.id === id);
        if (f) { f.address = Math.max(0, parseInt(val) || 0); this._refreshAll(); }
    },

    _setFixturePosition(id, val) {
        const f = this._fixtures.find(ff => ff.id === id);
        if (f) { f.position = Math.max(0, parseFloat(val) || 0); this._refreshAll(); }
    },

    _setFixtureProp(id, prop, val) {
        const f = this._fixtures.find(ff => ff.id === id);
        if (f) { f[prop] = val; this._drawCanvas(); }
    },

    _setFixtureNotes(id, val) {
        const f = this._fixtures.find(ff => ff.id === id);
        if (f) f.notes = val;
    },

    // ================================================================
    // UNIVERSE SUMMARY
    // ================================================================
    _renderUniverseSummary() {
        const el = document.getElementById('fx-universe-body');
        if (!el) return;

        if (this._fixtures.length === 0) {
            el.innerHTML = '<div class="fx-empty-hint">No fixtures patched</div>';
            return;
        }

        // Build universe map
        const universes = {};
        this._fixtures.forEach(f => {
            if (f.address <= 0 || f.channels <= 0) return;
            const uniIdx = this._universeOf(f.address);
            if (!universes[uniIdx]) universes[uniIdx] = { fixtures: [], channels: new Set(), types: {} };
            universes[uniIdx].fixtures.push(f);
            const ft = this._getFixtureType(f.typeId);
            universes[uniIdx].types[ft.shortName] = (universes[uniIdx].types[ft.shortName] || 0) + 1;
            for (let ch = f.address; ch < f.address + f.channels; ch++) {
                universes[uniIdx].channels.add(ch);
            }
        });

        // Check for conflicts per universe
        const stats = this._getStats();
        const conflictUniverses = new Set();
        stats.conflicts.forEach(ch => conflictUniverses.add(this._universeOf(ch)));

        const sorted = Object.keys(universes).sort((a, b) => a - b);
        el.innerHTML = sorted.map(uniIdx => {
            const u = universes[uniIdx];
            const letter = this._universeLetters[uniIdx] || ('U' + (parseInt(uniIdx) + 1));
            const used = u.channels.size;
            const pct = Math.round((used / 512) * 100);
            const hasConflict = conflictUniverses.has(parseInt(uniIdx));
            const typeSummary = Object.entries(u.types).map(([t, c]) => `${c}x ${t}`).join(', ');
            const trussSummary = [...new Set(u.fixtures.map(f => {
                const t = this._trusses.find(tr => tr.id === f.trussId);
                return t ? t.name : '?';
            }))].join(', ');

            const barColor = hasConflict ? '#ef4444' : pct > 90 ? '#f59e0b' : '#00d4aa';

            return `<div class="fx-universe-row${hasConflict ? ' conflict' : ''}">
                <span class="fx-universe-letter" style="color:${barColor};">${letter}</span>
                <div class="fx-universe-info">
                    <div><strong>${used}</strong> / 512 channels (${pct}%) &mdash; ${typeSummary}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${trussSummary}${hasConflict ? ' <span style="color:#ef4444;font-weight:700;">CONFLICT</span>' : ''}</div>
                    <div class="fx-universe-bar"><div class="fx-universe-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
                </div>
            </div>`;
        }).join('');
    },

    // ================================================================
    // CANVAS DRAWING (Capture 2025 style)
    // ================================================================
    _drawCanvas() {
        const ctx = this._ctx;
        const canvas = this._canvas;
        if (!ctx || !canvas) return;

        const W = this._canvasW;
        const H = this._canvasH;
        const scale = this._canvasScale;
        const ox = this._canvasOffset.x;
        const oy = this._canvasOffset.y;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0d1117');
        grad.addColorStop(1, '#161b22');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Grid
        this._drawGrid(ctx, W, H, scale, ox, oy);

        if (this._trusses.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Add a truss to begin designing your fixture layout', W / 2, H / 2);
            return;
        }

        // Draw each truss and its fixtures
        const METER_PX = 50 * scale;
        this._trusses.forEach((truss, ti) => {
            const tx = ox;
            const ty = oy + ti * 120 * scale;
            const tw = truss.length * METER_PX;
            const trussH = 18 * scale;

            // Truss bar
            this._drawTruss(ctx, tx, ty, tw, trussH, truss, scale);

            // Truss label
            ctx.fillStyle = truss.color;
            ctx.font = `bold ${11 * scale}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(truss.name, tx, ty - 8 * scale);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = `${9 * scale}px Inter, sans-serif`;
            const tt = this._trussTypes.find(t => t.id === truss.type);
            ctx.fillText(`${truss.length}m  |  ${truss.height}m trim  |  ${tt?.label || ''}  ${tt?.profile || ''}`, tx + ctx.measureText(truss.name + '  ').width + 4, ty - 8 * scale);

            // Fixtures on this truss
            const fixes = this._fixtures.filter(f => f.trussId === truss.id).sort((a, b) => a.position - b.position);
            fixes.forEach((fix, fi) => {
                const ft = this._getFixtureType(fix.typeId);
                const fx_x = tx + (fix.position / truss.length) * tw;
                const fx_y = ty + trussH + 12 * scale;
                const r = 14 * scale;

                // Hanging line
                ctx.beginPath();
                ctx.moveTo(fx_x, ty + trussH);
                ctx.lineTo(fx_x, fx_y);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1 * scale;
                ctx.stroke();

                // Fixture circle
                const isSelected = this._selectedFixtureId === fix.id;
                const isHovered = this._hoveredFixtureId === fix.id;
                const isDragTarget = this._dragFixtureId === fix.id;

                ctx.beginPath();
                ctx.arc(fx_x, fx_y, r, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? ft.color : this._hexToRgba(ft.color, 0.85);
                ctx.fill();
                if (isSelected || isHovered || isDragTarget) {
                    ctx.lineWidth = 2.5 * scale;
                    ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
                    ctx.stroke();
                }

                // Fixture label inside circle — show Fixture ID or number
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${fix.fixtureId ? 7 : 10}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(fix.fixtureId || String(fi + 1), fx_x, fx_y);

                // Universe + DMX address label below
                ctx.textBaseline = 'top';
                if (fix.address > 0) {
                    const uniIdx = this._universeOf(fix.address);
                    const uniLetter = this._universeLetters[uniIdx] || ('U' + (uniIdx + 1));
                    const uniColors = ['#3b82f6','#22c55e','#f97316','#a855f7','#ec4899','#eab308','#06b6d4','#ef4444'];
                    const uniColor = uniColors[uniIdx % uniColors.length];
                    // Universe badge
                    ctx.font = `bold ${7 * scale}px Inter, sans-serif`;
                    ctx.fillStyle = uniColor;
                    ctx.fillText('U:' + uniLetter, fx_x, fx_y + r + 2 * scale);
                    // Address
                    ctx.font = `bold ${7 * scale}px 'Courier New', monospace`;
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    const ch = (fix.address - 1) % 512 + 1;
                    ctx.fillText('.' + ch, fx_x, fx_y + r + 11 * scale);
                } else {
                    ctx.font = `bold ${8 * scale}px 'Courier New', monospace`;
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillText('--', fx_x, fx_y + r + 3 * scale);
                }

                // ND label below address
                let labelOffset = 20;
                if (fix.nd) {
                    ctx.font = `bold ${7 * scale}px Inter, sans-serif`;
                    ctx.fillStyle = '#ef4444';
                    ctx.fillText(fix.nd, fx_x, fx_y + r + labelOffset * scale);
                    labelOffset += 10;
                }

                // AC circuit below ND
                if (fix.acCircuit) {
                    ctx.font = `${6 * scale}px Inter, sans-serif`;
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillText('AC:' + fix.acCircuit, fx_x, fx_y + r + labelOffset * scale);
                    labelOffset += 10;
                }

                // Short name (type) at bottom
                ctx.font = `${7 * scale}px Inter, sans-serif`;
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fillText(ft.shortName, fx_x, fx_y + r + labelOffset * scale);

                // Store hit area for click detection
                fix._hitX = fx_x;
                fix._hitY = fx_y;
                fix._hitR = r;
            });
        });

        // Scale indicator
        this._drawScaleIndicator(ctx, W, H, METER_PX);
    },

    _drawGrid(ctx, W, H, scale, ox, oy) {
        const METER_PX = 50 * scale;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;

        const startX = ox % METER_PX;
        const startY = oy % METER_PX;
        for (let x = startX; x < W; x += METER_PX) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = startY; y < H; y += METER_PX) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
    },

    _drawTruss(ctx, x, y, w, h, truss, scale) {
        const isSelected = this._selectedTrussId === truss.id;

        // Main bar
        ctx.fillStyle = isSelected ? this._hexToRgba(truss.color, 0.25) : 'rgba(255,255,255,0.08)';
        ctx.strokeStyle = isSelected ? truss.color : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = isSelected ? 2 * scale : 1.5 * scale;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 3 * scale);
        ctx.fill();
        ctx.stroke();

        // Cross-hatching pattern
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 3 * scale);
        ctx.clip();

        ctx.strokeStyle = isSelected ? this._hexToRgba(truss.color, 0.35) : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.8 * scale;
        const spacing = 10 * scale;
        for (let i = -h; i < w + h; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i + h, y + h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + i + h, y);
            ctx.lineTo(x + i, y + h);
            ctx.stroke();
        }
        ctx.restore();

        // End caps
        const capW = 4 * scale;
        ctx.fillStyle = isSelected ? truss.color : 'rgba(255,255,255,0.15)';
        ctx.fillRect(x - capW / 2, y - 2 * scale, capW, h + 4 * scale);
        ctx.fillRect(x + w - capW / 2, y - 2 * scale, capW, h + 4 * scale);
    },

    // Cable runs removed per user request — only truss length shown

    _drawScaleIndicator(ctx, W, H, meterPx) {
        const barW = meterPx;
        const bx = W - barW - 20;
        const by = H - 24;

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + barW, by);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by - 4);
        ctx.lineTo(bx, by + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + barW, by - 4);
        ctx.lineTo(bx + barW, by + 4);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('1 meter', bx + barW / 2, by + 6);
    },

    // ================================================================
    // CANVAS INTERACTION
    // ================================================================
    _dragFixtureId: null,

    _onCanvasMouseDown(e) {
        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check if clicking on a fixture — start fixture drag
        let hitFixture = null;
        this._fixtures.forEach(f => {
            if (f._hitX !== undefined) {
                const dx = mx - f._hitX;
                const dy = my - f._hitY;
                if (Math.sqrt(dx * dx + dy * dy) <= (f._hitR || 14)) {
                    hitFixture = f;
                }
            }
        });

        if (hitFixture) {
            this._dragFixtureId = hitFixture.id;
            this._selectedFixtureId = hitFixture.id;
            this._selectedTrussId = null;
            this._canvas.style.cursor = 'grabbing';
            this._renderProperties();
            this._renderTrussList();
            this._drawCanvas();
            return;
        }

        // Otherwise start canvas pan
        this._isDragging = true;
        this._dragStart = { x: e.clientX - this._canvasOffset.x, y: e.clientY - this._canvasOffset.y };
    },

    _onCanvasMouseMove(e) {
        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Fixture dragging — move fixture along its truss
        if (this._dragFixtureId) {
            const fix = this._fixtures.find(f => f.id === this._dragFixtureId);
            if (fix) {
                const truss = this._trusses.find(t => t.id === fix.trussId);
                if (truss) {
                    const METER_PX = 50 * this._canvasScale;
                    const ti = this._trusses.indexOf(truss);
                    const tx = this._canvasOffset.x;
                    const tw = truss.length * METER_PX;
                    // Convert mouse X to position along truss
                    const relX = mx - tx;
                    const newPos = Math.max(0, Math.min(truss.length, (relX / tw) * truss.length));
                    fix.position = Math.round(newPos * 100) / 100;
                    this._drawCanvas();
                    this._renderProperties();
                }
            }
            return;
        }

        // Canvas panning
        if (this._isDragging && this._dragStart) {
            this._canvasOffset.x = e.clientX - this._dragStart.x;
            this._canvasOffset.y = e.clientY - this._dragStart.y;
            this._drawCanvas();
            return;
        }

        // Hover detection
        let hovered = null;
        this._fixtures.forEach(f => {
            if (f._hitX !== undefined) {
                const dx = mx - f._hitX;
                const dy = my - f._hitY;
                if (Math.sqrt(dx * dx + dy * dy) <= (f._hitR || 14)) {
                    hovered = f.id;
                }
            }
        });
        if (hovered !== this._hoveredFixtureId) {
            this._hoveredFixtureId = hovered;
            this._canvas.style.cursor = hovered ? 'grab' : 'default';
            this._drawCanvas();
        }
    },

    _onCanvasMouseUp(e) {
        if (this._dragFixtureId) {
            this._dragFixtureId = null;
            this._canvas.style.cursor = 'default';
            this._drawCanvas();
        }
        this._isDragging = false;
        this._dragStart = null;
    },

    _onCanvasWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.3, Math.min(4, this._canvasScale * delta));

        // Zoom toward cursor
        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this._canvasOffset.x = mx - (mx - this._canvasOffset.x) * (newScale / this._canvasScale);
        this._canvasOffset.y = my - (my - this._canvasOffset.y) * (newScale / this._canvasScale);

        this._canvasScale = newScale;
        this._drawCanvas();
    },

    _onCanvasClick(e) {
        if (this._isDragging) return;
        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let clicked = null;
        this._fixtures.forEach(f => {
            if (f._hitX !== undefined) {
                const dx = mx - f._hitX;
                const dy = my - f._hitY;
                if (Math.sqrt(dx * dx + dy * dy) <= (f._hitR || 14)) {
                    clicked = f;
                }
            }
        });

        if (clicked) {
            this._selectedFixtureId = clicked.id;
            this._selectedTrussId = null;
        } else {
            // Check if clicked on truss area
            const METER_PX = 50 * this._canvasScale;
            let clickedTruss = null;
            this._trusses.forEach((truss, ti) => {
                const tx = this._canvasOffset.x;
                const ty = this._canvasOffset.y + ti * 120 * this._canvasScale;
                const tw = truss.length * METER_PX;
                const trussH = 18 * this._canvasScale;
                if (mx >= tx && mx <= tx + tw && my >= ty - 10 && my <= ty + trussH + 10) {
                    clickedTruss = truss;
                }
            });
            if (clickedTruss) {
                this._selectedTrussId = clickedTruss.id;
                this._selectedFixtureId = null;
            } else {
                this._selectedFixtureId = null;
                this._selectedTrussId = null;
            }
        }
        this._renderTrussList();
        this._renderProperties();
        this._drawCanvas();
    },

    _zoomIn() {
        this._canvasScale = Math.min(4, this._canvasScale * 1.2);
        this._drawCanvas();
    },

    _zoomOut() {
        this._canvasScale = Math.max(0.3, this._canvasScale * 0.8);
        this._drawCanvas();
    },

    _zoomFit() {
        if (this._trusses.length === 0) {
            this._canvasScale = 1;
            this._canvasOffset = { x: 40, y: 40 };
            this._drawCanvas();
            return;
        }
        const maxLen = Math.max(...this._trusses.map(t => t.length));
        const numTrusses = this._trusses.length;
        const totalH = numTrusses * 120;
        const scaleX = (this._canvasW - 120) / (maxLen * 50);
        const scaleY = (this._canvasH - 80) / totalH;
        this._canvasScale = Math.min(scaleX, scaleY, 2);
        this._canvasOffset = { x: 50, y: 40 };
        this._drawCanvas();
    },

    // ================================================================
    // MODALS
    // ================================================================
    _addTrussModal() {
        const body = `
            <div class="form-group"><label class="form-label">Truss Name</label><input type="text" class="form-control" id="fx-m-truss-name" value="Truss ${this._trusses.length + 1}" /></div>
            <div class="form-group"><label class="form-label">Type</label>
                <select class="form-control" id="fx-m-truss-type">
                    ${this._trussTypes.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label class="form-label">Length (meters)</label><input type="number" class="form-control" id="fx-m-truss-length" value="12" min="1" max="50" step="0.5" /></div>
            <div class="form-group"><label class="form-label">Height (meters)</label><input type="number" class="form-control" id="fx-m-truss-height" value="5" min="0" max="30" step="0.5" /></div>
        `;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="FixturesPage._addTrussConfirm()">Add Truss</button>
        `;
        UI.openModal('Add Truss', body, footer);
    },

    _addTrussConfirm() {
        const name = document.getElementById('fx-m-truss-name')?.value || 'Truss';
        const type = document.getElementById('fx-m-truss-type')?.value || 'box';
        const length = parseFloat(document.getElementById('fx-m-truss-length')?.value) || 12;
        const height = parseFloat(document.getElementById('fx-m-truss-height')?.value) || 5;
        const posY = this._trusses.length * 8;

        const truss = this._createTruss(name, length, height, posY, type);
        this._trusses.push(truss);
        UI.closeModal();
        this._refreshAll();
        UI.toast(`Truss "${name}" added`, 'success');
    },

    _editTrussModal(id) {
        const truss = this._trusses.find(t => t.id === id);
        if (!truss) return;
        const body = `
            <div class="form-group"><label class="form-label">Truss Name</label><input type="text" class="form-control" id="fx-m-truss-name" value="${UI.esc(truss.name)}" /></div>
            <div class="form-group"><label class="form-label">Type</label>
                <select class="form-control" id="fx-m-truss-type">
                    ${this._trussTypes.map(t => `<option value="${t.id}" ${t.id === truss.type ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label class="form-label">Length (meters)</label><input type="number" class="form-control" id="fx-m-truss-length" value="${truss.length}" min="1" max="50" step="0.5" /></div>
            <div class="form-group"><label class="form-label">Height (meters)</label><input type="number" class="form-control" id="fx-m-truss-height" value="${truss.height}" min="0" max="30" step="0.5" /></div>
        `;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="FixturesPage._editTrussConfirm(${id})">Save</button>
        `;
        UI.openModal('Edit Truss', body, footer);
    },

    _editTrussConfirm(id) {
        const truss = this._trusses.find(t => t.id === id);
        if (!truss) return;
        truss.name = document.getElementById('fx-m-truss-name')?.value || truss.name;
        truss.type = document.getElementById('fx-m-truss-type')?.value || truss.type;
        truss.length = parseFloat(document.getElementById('fx-m-truss-length')?.value) || truss.length;
        truss.height = parseFloat(document.getElementById('fx-m-truss-height')?.value) || truss.height;
        UI.closeModal();
        this._refreshAll();
        UI.toast('Truss updated', 'success');
    },

    async _confirmRemoveTruss(id) {
        const truss = this._trusses.find(t => t.id === id);
        if (!truss) return;
        const fixCount = this._fixtures.filter(f => f.trussId === id).length;
        const ok = await UI.confirm('Remove Truss', `Remove "${truss.name}" and its ${fixCount} fixture(s)?`);
        if (ok) {
            this._removeTruss(id);
            UI.toast('Truss removed', 'info');
        }
    },

    _addFixtureModal() {
        if (this._trusses.length === 0) {
            UI.toast('Add a truss first', 'warning');
            return;
        }
        const defaultTruss = this._selectedTrussId || this._trusses[0].id;
        // Calculate next available address
        const maxAddr = this._fixtures.reduce((m, f) => Math.max(m, f.address + f.channels), 1);

        // Group fixture types by brand
        const grouped = {};
        this._fixtureTypes.forEach(t => {
            const brand = t.name.split(' ')[0];
            if (!grouped[brand]) grouped[brand] = [];
            grouped[brand].push(t);
        });
        const typeOptions = Object.entries(grouped).map(([brand, types]) =>
            `<optgroup label="${brand}">${types.map(t => `<option value="${t.id}">${t.name} (${t.channels}ch, ${t.weight}kg)</option>`).join('')}</optgroup>`
        ).join('');

        const body = `
            <div class="form-group"><label class="form-label">Truss</label>
                <select class="form-control" id="fx-m-fix-truss">
                    ${this._trusses.map(t => `<option value="${t.id}" ${t.id === defaultTruss ? 'selected' : ''}>${UI.esc(t.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label class="form-label">Fixture Type</label>
                <select class="form-control" id="fx-m-fix-type" onchange="FixturesPage._onFixtureTypeModalChange()">
                    ${typeOptions}
                </select>
            </div>
            <div class="form-group" id="fx-m-custom-ch-wrap" style="display:none;">
                <label class="form-label">Custom Channels</label>
                <input type="number" class="form-control" id="fx-m-custom-ch" value="1" min="1" max="512" />
            </div>
            <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-control" id="fx-m-fix-qty" value="4" min="1" max="100" /></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="form-group"><label class="form-label">DMX Universe</label>
                    <select class="form-control" id="fx-m-fix-universe">
                        ${[...Array(16)].map((_, i) => `<option value="${i}" ${i === Math.floor((maxAddr - 1) / 512) ? 'selected' : ''}>${this._universeLetters[i] || 'U' + (i + 1)} (Universe ${i + 1})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Start Address</label>
                    <input type="number" class="form-control" id="fx-m-fix-addr" value="${((maxAddr - 1) % 512) + 1}" min="1" max="512" />
                </div>
            </div>
            <div class="form-group"><label class="form-label">Starting Fixture ID</label>
                <input type="text" class="form-control" id="fx-m-fix-fid" placeholder="e.g. MH01 (auto-increments)" value="" />
            </div>
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="fx-m-fix-auto" checked />
                    <span style="font-size:12px;">Auto-space evenly along truss</span>
                </label>
            </div>
        `;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="FixturesPage._addFixtureConfirm()">Add Fixtures</button>
        `;
        UI.openModal('Add Fixtures', body, footer);
    },

    _onFixtureTypeModalChange() {
        const sel = document.getElementById('fx-m-fix-type');
        const wrap = document.getElementById('fx-m-custom-ch-wrap');
        if (sel && wrap) {
            wrap.style.display = sel.value === 'custom' ? 'block' : 'none';
        }
    },

    _addFixtureConfirm() {
        const trussId = parseInt(document.getElementById('fx-m-fix-truss')?.value);
        const typeId = document.getElementById('fx-m-fix-type')?.value || 'megapointe';
        const qty = parseInt(document.getElementById('fx-m-fix-qty')?.value) || 1;
        const autoSpace = document.getElementById('fx-m-fix-auto')?.checked !== false;
        const customCh = parseInt(document.getElementById('fx-m-custom-ch')?.value) || 1;
        const universe = parseInt(document.getElementById('fx-m-fix-universe')?.value) || 0;
        const startAddr = parseInt(document.getElementById('fx-m-fix-addr')?.value) || 1;
        const startFid = document.getElementById('fx-m-fix-fid')?.value?.trim() || '';

        if (typeId === 'custom') {
            const ft = this._fixtureTypes.find(t => t.id === 'custom');
            if (ft) ft.channels = customCh;
        }

        this._addFixturesToTruss(trussId, typeId, qty, autoSpace);

        // Apply DMX addresses, Fixture IDs to the newly added fixtures
        const addedFixtures = this._fixtures.slice(-qty);
        const ft = this._getFixtureType(typeId);
        let addr = universe * 512 + startAddr;
        const chPerFixture = (typeId === 'custom' ? customCh : ft.channels) || 1;

        // Parse starting Fixture ID for auto-increment (e.g. "MH01" -> prefix "MH", num 1)
        const fidMatch = startFid.match(/^([A-Za-z]*)(\d+)$/);
        const fidPrefix = fidMatch ? fidMatch[1] : startFid;
        let fidNum = fidMatch ? parseInt(fidMatch[2]) : 1;
        const fidPad = fidMatch ? fidMatch[2].length : 0;

        addedFixtures.forEach((f, i) => {
            // DMX address
            if (startAddr > 0) {
                // Check universe boundary
                const uniStart = Math.floor((addr - 1) / 512) * 512 + 1;
                if (addr + chPerFixture - 1 > uniStart + 511) {
                    addr = uniStart + 512; // jump to next universe
                }
                f.address = addr;
                addr += chPerFixture;
            }
            // Fixture ID
            if (startFid) {
                f.fixtureId = fidPrefix + String(fidNum + i).padStart(fidPad, '0');
            }
            // Custom channels
            if (typeId === 'custom') {
                f.customChannels = customCh;
                f.channels = customCh;
            }
        });

        UI.closeModal();
        this._refreshAll();
        UI.toast(`Added ${qty}x ${ft.name}`, 'success');
    },

    // ================================================================
    // EXPORT
    // ================================================================
    _exportCSV() {
        if (this._fixtures.length === 0) { UI.toast('No fixtures to export', 'warning'); return; }
        const trussOrder = {};
        this._trusses.forEach((t, i) => { trussOrder[t.id] = i; });
        const sorted = [...this._fixtures].sort((a, b) => {
            const tDiff = (trussOrder[a.trussId] || 0) - (trussOrder[b.trussId] || 0);
            if (tDiff !== 0) return tDiff;
            return a.position - b.position;
        });

        let csv = 'Fixture#,Type,ShortName,Universe,Address,Channels,Truss,Position(m),Weight(kg),Power(W)\n';
        sorted.forEach((f, i) => {
            const ft = this._getFixtureType(f.typeId);
            const truss = this._trusses.find(t => t.id === f.trussId);
            const addr = f.address > 0 ? this._addrToUniverseLabel(f.address) : 'Unpatched';
            csv += `${i + 1},"${ft.name}",${ft.shortName},${addr},${f.address},${f.channels},"${truss?.name || ''}",${f.position},${ft.weight},${ft.power}\n`;
        });
        UI.exportFile('fixture-patch.csv', csv, [{ name: 'CSV', extensions: ['csv'] }]);
    },

    _exportJSON() {
        const data = {
            version: '1.0',
            exported: new Date().toISOString(),
            trusses: this._trusses.map(t => ({ id: t.id, name: t.name, length: t.length, height: t.height, posY: t.posY, type: t.type, color: t.color })),
            fixtures: this._fixtures.map(f => ({ id: f.id, trussId: f.trussId, typeId: f.typeId, position: f.position, address: f.address, channels: f.channels, customChannels: f.customChannels, notes: f.notes })),
        };
        UI.exportFile('fixture-patch.json', JSON.stringify(data, null, 2), [{ name: 'JSON', extensions: ['json'] }]);
    },

    _importJSON() {
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
                    if (data.trusses && data.fixtures) {
                        this._trusses = data.trusses;
                        this._fixtures = data.fixtures;
                        this._nextTrussId = Math.max(0, ...this._trusses.map(t => t.id)) + 1;
                        this._nextFixtureId = Math.max(0, ...this._fixtures.map(f => f.id)) + 1;
                        this._selectedFixtureId = null;
                        this._selectedTrussId = null;
                        this._refreshAll();
                        UI.toast('Patch imported', 'success');
                    } else {
                        UI.toast('Invalid patch file format', 'error');
                    }
                } catch (err) {
                    UI.toast('Failed to parse JSON: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    _exportPNG() {
        const canvas = this._canvas;
        if (!canvas) { UI.toast('Canvas not available', 'warning'); return; }
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'fixture-layout.png';
            link.href = dataUrl;
            link.click();
            UI.toast('PNG exported', 'success');
        } catch (err) {
            UI.toast('Failed to export PNG: ' + err.message, 'error');
        }
    },

    // ================================================================
    // CLEAR ALL
    // ================================================================
    async _clearAll() {
        const ok = await UI.confirm('Clear All', 'Remove all trusses and fixtures? This cannot be undone.');
        if (!ok) return;
        this._trusses = [];
        this._fixtures = [];
        this._nextTrussId = 1;
        this._nextFixtureId = 1;
        this._selectedFixtureId = null;
        this._selectedTrussId = null;
        this._refreshAll();
        UI.toast('All cleared', 'info');
    },

    // ================================================================
    // REFRESH ALL UI
    // ================================================================
    _refreshAll() {
        this._renderStats();
        this._renderTrussList();
        this._renderProperties();
        this._renderUniverseSummary();
        this._drawCanvas();
    },

    // ================================================================
    // UTILITY
    // ================================================================
    _hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    },

    // ================================================================
    // CAPTURE 2025 .c2p IMPORT
    // ================================================================
    _importC2PDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.c2p';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                this._importC2P(ev.target.result);
            };
            reader.readAsArrayBuffer(file);
        };
        input.click();
    },

    async _importC2P(buffer) {
        try {
            // Validate binary header
            const headerBytes = new Uint8Array(buffer, 0, 64);
            const headerStr = new TextDecoder('utf-8', { fatal: false }).decode(headerBytes);
            if (!headerStr.includes('Project') && !headerStr.includes('SoftwareVersion')) {
                UI.toast('Invalid .c2p file — missing header signature', 'error');
                return;
            }

            // Decompress: skip 2-byte zlib header (78 9c at offset 62), raw deflate at 64
            let decompressed;
            try {
                const bytes = new Uint8Array(buffer);
                const compressed = bytes.slice(64);
                const ds = new DecompressionStream('deflate-raw');
                const reader = ds.readable.getReader();
                const writer = ds.writable.getWriter();
                writer.write(compressed);
                writer.close().catch(() => {});
                const chunks = [];
                let totalLen = 0;
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                        totalLen += value.length;
                    }
                } catch (_) { /* trailing data after deflate stream */ }
                decompressed = new Uint8Array(totalLen);
                let off = 0;
                for (const c of chunks) { decompressed.set(c, off); off += c.length; }
            } catch (err) {
                UI.toast('Failed to decompress .c2p data: ' + err.message, 'error');
                return;
            }

            // Extract readable strings from decompressed binary data (ASCII + UTF-16LE)
            const extractStrings = (data, minLen) => {
                const strings = [];
                const seen = new Set();

                // Pass 1: ASCII strings
                let current = '';
                for (let i = 0; i < data.length; i++) {
                    const byte = data[i];
                    if ((byte >= 0x20 && byte <= 0x7E) || (byte >= 0xC0 && byte <= 0xFD)) {
                        current += String.fromCharCode(byte);
                    } else if (byte >= 0x80 && byte <= 0xBF && current.length > 0) {
                        current += String.fromCharCode(byte);
                    } else {
                        if (current.length >= minLen) { strings.push(current); seen.add(current); }
                        current = '';
                    }
                }
                if (current.length >= minLen) { strings.push(current); seen.add(current); }

                // Pass 2: UTF-16LE strings (.NET stores strings this way)
                let u16 = '';
                for (let i = 0; i < data.length - 1; i += 2) {
                    const ch = data[i] | (data[i + 1] << 8);
                    if (ch >= 32 && ch < 0xFFFE && data[i + 1] < 0x10) {
                        u16 += String.fromCharCode(ch);
                    } else {
                        if (u16.length >= minLen && !seen.has(u16)) { strings.push(u16); seen.add(u16); }
                        u16 = '';
                    }
                }
                if (u16.length >= minLen && !seen.has(u16)) { strings.push(u16); seen.add(u16); }

                return strings;
            };

            const rawStrings = extractStrings(decompressed, 3);

            // Decode any mangled UTF-8 by re-encoding then decoding properly
            const decoded = rawStrings.map(s => {
                try {
                    const bytes = new Uint8Array([...s].map(c => c.charCodeAt(0)));
                    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                } catch { return s; }
            });

            // Filter for likely truss/layer names:
            // - skip strings that look like paths, code, numbers, GUIDs, XML tags
            // - keep names that look like labels (mixed case, spaces, Icelandic chars, short identifiers)
            const namePattern = /^[A-Za-z\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F ./_-]{1,48}$/;
            const skipPatterns = [
                /^[0-9.]+$/, /^[{(]/, /[<>{}\\]/, /^https?:/, /^[A-F0-9-]{8,}$/i,
                /^\s*$/, /^(true|false|null|none|undefined)$/i, /^(xmlns|http|www)/i,
                /\.(dll|exe|xml|json|txt|png|jpg|dat|ini)$/i,
            ];

            const seen = new Set();
            const trussNames = [];
            for (const s of decoded) {
                const trimmed = s.trim();
                if (!namePattern.test(trimmed)) continue;
                if (skipPatterns.some(p => p.test(trimmed))) continue;
                const key = trimmed.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                trussNames.push(trimmed);
            }

            // Cap at a reasonable number to avoid flooding
            const candidates = trussNames.slice(0, 50);

            if (candidates.length === 0) {
                UI.toast('No truss/layer names found in .c2p file', 'warning');
                return;
            }

            // Show confirmation modal with checkboxes for discovered names
            const listHtml = candidates.map((name, i) =>
                `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer;">
                    <input type="checkbox" class="c2p-truss-cb" data-index="${i}" checked />
                    <span>${UI.esc(name)}</span>
                </label>`
            ).join('');

            const body = `
                <p style="margin-bottom:12px;font-size:13px;color:var(--text-muted);">
                    Found <strong>${candidates.length}</strong> potential truss/layer names in the Capture 2025 project file.
                    Select which ones to import as trusses:
                </p>
                <div style="max-height:320px;overflow-y:auto;padding:4px 0;" id="c2p-name-list">
                    ${listHtml}
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;">
                    <button class="btn btn-xs" onclick="document.querySelectorAll('.c2p-truss-cb').forEach(cb=>cb.checked=true)">Select All</button>
                    <button class="btn btn-xs" onclick="document.querySelectorAll('.c2p-truss-cb').forEach(cb=>cb.checked=false)">Deselect All</button>
                </div>
            `;
            const footer = `
                <button class="btn" onclick="UI.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="FixturesPage._importC2PConfirm()">Import Selected</button>
            `;

            // Store candidates for the confirm handler
            this._c2pCandidates = candidates;
            UI.openModal('Import Capture 2025 Project', body, footer);
        } catch (err) {
            UI.toast('Failed to parse .c2p file: ' + err.message, 'error');
        }
    },

    _importC2PConfirm() {
        const candidates = this._c2pCandidates || [];
        const checkboxes = document.querySelectorAll('.c2p-truss-cb');
        const selected = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const idx = parseInt(cb.dataset.index, 10);
                if (candidates[idx]) selected.push(candidates[idx]);
            }
        });

        if (selected.length === 0) {
            UI.toast('No trusses selected', 'warning');
            return;
        }

        // Create trusses from selected names
        let addedCount = 0;
        selected.forEach((name, i) => {
            const posY = (this._trusses.length) * 8;
            const length = 12; // default length
            const height = 5 - i * 0.5; // stagger heights slightly
            const truss = this._createTruss(name, length, Math.max(1, height), posY, 'box');
            this._trusses.push(truss);
            addedCount++;
        });

        this._c2pCandidates = null;
        UI.closeModal();
        this._autoPatch();
        this._refreshAll();
        UI.toast(`Imported ${addedCount} trusses from Capture 2025 project`, 'success');
    },
};
