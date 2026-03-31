/**
 * Truck Packer — 3D bin-packing tool for AV/production cases
 * Luxor Production
 */
const TruckPackPage = {

    // ================================================================
    // TRUCK PRESETS
    // ================================================================
    _presets: {
        'my-truck':      { label: 'Big Truck (6\u00d72.4\u00d72.2)',           l: 6.0,  w: 2.4, h: 2.2 },
        'e-transit':     { label: 'Ford E-Transit (3.5\u00d71.78\u00d71.83)',  l: 3.5,  w: 1.78, h: 1.83 },
        'vivaro':        { label: 'Opel Vivaro (2.86\u00d71.62\u00d71.39)',    l: 2.86, w: 1.62, h: 1.39 },
        'transit-conn':  { label: 'Ford Transit Connect (1.78\u00d71.49\u00d71.26)', l: 1.78, w: 1.49, h: 1.26 },
        'sprinter-lwb':  { label: 'Mercedes Sprinter LWB (4.3\u00d71.78\u00d71.94)', l: 4.3, w: 1.78, h: 1.94 },
        '12m-trailer':   { label: '12m Trailer (12\u00d72.4\u00d72.7)',        l: 12.0, w: 2.4, h: 2.7 },
        '20ft-container':{ label: '20ft Container (5.9\u00d72.35\u00d72.39)',  l: 5.9,  w: 2.35, h: 2.39 },
        '40ft-container':{ label: '40ft Container (12.03\u00d72.35\u00d72.39)',l: 12.03,w: 2.35, h: 2.39 },
        'custom':        { label: 'Custom', l: 6.0, w: 2.4, h: 2.2 },
    },

    // ================================================================
    // CASE LIBRARY
    // ================================================================
    _caseLibrary: [
        // ── LIGHTING FIXTURES (real flight case dims) ──
        { id: 'megapointe',     name: 'Robe MegaPointe Case (2-way)',     cat: 'Lighting', l: 1.24, w: 0.60, h: 0.72, weight: 65,  color: '#f97316', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'spiider',        name: 'Robe Spiider Case (2-way)',        cat: 'Lighting', l: 1.20, w: 0.60, h: 0.68, weight: 58,  color: '#fb923c', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'ledbeam150',     name: 'Robe LEDBeam 150 Case (4-way)',    cat: 'Lighting', l: 0.80, w: 0.60, h: 0.52, weight: 32,  color: '#fdba74', stackable: true,  fragile: false, maxStack: 160 },
        { id: 'robin-t1',       name: 'Robe Robin T1 Profile Case (2-way)',cat: 'Lighting',l: 1.28, w: 0.62, h: 0.76, weight: 70,  color: '#ea580c', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'bmfl',           name: 'Robe BMFL Spot Case (2-way)',      cat: 'Lighting', l: 1.30, w: 0.64, h: 0.80, weight: 78,  color: '#c2410c', stackable: true,  fragile: false, maxStack: 220 },
        { id: 'pixeline',       name: 'Acme Pixeline Case (4-way)',       cat: 'Lighting', l: 1.25, w: 0.40, h: 0.55, weight: 40,  color: '#a3e635', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'libra',          name: 'Acme Libra Case (2-way)',          cat: 'Lighting', l: 1.10, w: 0.56, h: 0.65, weight: 48,  color: '#84cc16', stackable: true,  fragile: false, maxStack: 190 },
        { id: 'colorstrike',    name: 'Chauvet Color Strike M Case',      cat: 'Lighting', l: 1.15, w: 0.45, h: 0.55, weight: 35,  color: '#fde047', stackable: true,  fragile: false, maxStack: 170 },
        { id: 'mac-aura',       name: 'Martin MAC Aura XB Case (2-way)',  cat: 'Lighting', l: 1.12, w: 0.56, h: 0.64, weight: 48,  color: '#f59e0b', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'sharpy-plus',    name: 'Clay Paky Sharpy Plus Case (4-way)',cat: 'Lighting',l: 1.20, w: 0.58, h: 0.70, weight: 60,  color: '#eab308', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'impression-x5',  name: 'GLP impression X5 Case (4-way)',   cat: 'Lighting', l: 0.80, w: 0.60, h: 0.50, weight: 38,  color: '#65a30d', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'atomic3000',     name: 'Atomic 3000 Strobe Case (4-way)',  cat: 'Lighting', l: 0.85, w: 0.62, h: 0.48, weight: 42,  color: '#fbbf24', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'led-par-8way',   name: 'LED Par Case (8-way)',             cat: 'Lighting', l: 1.00, w: 0.50, h: 0.40, weight: 35,  color: '#d97706', stackable: true,  fragile: false, maxStack: 150 },
        { id: 'source4',        name: 'ETC Source Four Case (6-way)',     cat: 'Lighting', l: 1.10, w: 0.55, h: 0.50, weight: 52,  color: '#ca8a04', stackable: true,  fragile: false, maxStack: 200 },
        // ── LIGHTING CONSOLES ──
        { id: 'gma3-full',      name: 'grandMA3 Full-Size Case',          cat: 'Consoles', l: 1.52, w: 0.85, h: 0.50, weight: 85,  color: '#7c3aed', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'gma3-light',     name: 'grandMA3 Light Case',              cat: 'Consoles', l: 1.30, w: 0.78, h: 0.45, weight: 65,  color: '#8b5cf6', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'gma3-compact',   name: 'grandMA3 Compact XT Case',         cat: 'Consoles', l: 1.00, w: 0.65, h: 0.40, weight: 42,  color: '#a78bfa', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'gma2-full',      name: 'grandMA2 Full-Size Case',          cat: 'Consoles', l: 1.50, w: 0.82, h: 0.48, weight: 80,  color: '#6d28d9', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'digico-sd7',     name: 'DiGiCo SD7 Case',                  cat: 'Consoles', l: 1.80, w: 1.00, h: 0.60, weight: 120, color: '#4338ca', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'digico-sd12',    name: 'DiGiCo SD12 Case',                 cat: 'Consoles', l: 1.35, w: 0.80, h: 0.45, weight: 65,  color: '#4f46e5', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'digico-sd5',     name: 'DiGiCo SD5 Case',                  cat: 'Consoles', l: 1.55, w: 0.90, h: 0.50, weight: 90,  color: '#3730a3', stackable: false, fragile: true,  maxStack: 0 },
        // ── AUDIO MIXERS ──
        { id: 'midas-m32',      name: 'Midas M32 Case',                   cat: 'Audio',    l: 1.20, w: 0.72, h: 0.42, weight: 55,  color: '#3b82f6', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'yamaha-cl5',     name: 'Yamaha CL5 Case',                  cat: 'Audio',    l: 1.42, w: 0.82, h: 0.48, weight: 72,  color: '#2563eb', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'yamaha-tf5',     name: 'Yamaha TF5 Case',                  cat: 'Audio',    l: 1.22, w: 0.72, h: 0.42, weight: 52,  color: '#1d4ed8', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'avid-s6l',       name: 'Avid VENUE S6L Case',              cat: 'Audio',    l: 1.55, w: 0.90, h: 0.50, weight: 95,  color: '#1e40af', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'allen-sq7',      name: 'Allen & Heath SQ-7 Case',          cat: 'Audio',    l: 1.10, w: 0.68, h: 0.40, weight: 42,  color: '#60a5fa', stackable: false, fragile: true,  maxStack: 0 },
        { id: 'stage-box',      name: 'DiGiCo SD-Rack / Stage Box Case',  cat: 'Audio',    l: 0.65, w: 0.55, h: 0.72, weight: 45,  color: '#93c5fd', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'spkr-jbl',       name: 'JBL VTX Speaker Case',             cat: 'Audio',    l: 1.10, w: 0.60, h: 0.85, weight: 65,  color: '#0284c7', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'amp-rack',       name: 'Amp Rack (4U)',                     cat: 'Audio',    l: 0.60, w: 0.50, h: 0.25, weight: 30,  color: '#0ea5e9', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'sub-jbl',        name: 'JBL VTX S28 Sub Case',             cat: 'Audio',    l: 0.90, w: 0.72, h: 0.60, weight: 55,  color: '#0369a1', stackable: true,  fragile: false, maxStack: 200 },
        // ── VIDEO ──
        { id: 'led-6pack',      name: 'LED Panel Case (6-pack)',          cat: 'Video',    l: 1.20, w: 0.70, h: 0.90, weight: 80,  color: '#ef4444', stackable: true,  fragile: false, maxStack: 250 },
        { id: 'proj-case',      name: 'Projector Case (Barco/Christie)',  cat: 'Video',    l: 0.85, w: 0.65, h: 0.55, weight: 45,  color: '#f87171', stackable: true,  fragile: true,  maxStack: 80 },
        { id: 'camera-case',    name: 'Camera Case (Blackmagic/Sony)',    cat: 'Video',    l: 0.60, w: 0.40, h: 0.35, weight: 15,  color: '#dc2626', stackable: true,  fragile: true,  maxStack: 50 },
        { id: 'novastar-proc',  name: 'Novastar Processor Case',          cat: 'Video',    l: 0.60, w: 0.50, h: 0.30, weight: 18,  color: '#b91c1c', stackable: true,  fragile: false, maxStack: 120 },
        // ── RIGGING — Movecat motors ──
        { id: 'movecat-250',    name: 'Movecat 250kg Motor Case',         cat: 'Rigging',  l: 0.62, w: 0.42, h: 0.48, weight: 38,  color: '#a855f7', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'movecat-500',    name: 'Movecat 500kg Motor Case',         cat: 'Rigging',  l: 0.70, w: 0.48, h: 0.55, weight: 52,  color: '#7c3aed', stackable: true,  fragile: false, maxStack: 250 },
        { id: 'movecat-1000',   name: 'Movecat 1000kg Motor Case',        cat: 'Rigging',  l: 0.80, w: 0.55, h: 0.62, weight: 75,  color: '#6d28d9', stackable: true,  fragile: false, maxStack: 300 },
        { id: 'rigging-hw',     name: 'Rigging Hardware Case',            cat: 'Rigging',  l: 0.60, w: 0.40, h: 0.35, weight: 25,  color: '#8b5cf6', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'shackle-case',   name: 'Shackle & Sling Case',             cat: 'Rigging',  l: 0.50, w: 0.40, h: 0.30, weight: 22,  color: '#c084fc', stackable: true,  fragile: false, maxStack: 180 },
        // ── CABLE & POWER ──
        { id: 'cable-trunk',    name: 'Cable Trunk',                      cat: 'Cable',    l: 1.20, w: 0.60, h: 0.60, weight: 50,  color: '#22c55e', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'power-distro',   name: 'Power Distro Case (63A)',          cat: 'Cable',    l: 0.80, w: 0.50, h: 0.45, weight: 40,  color: '#4ade80', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'socapex-case',   name: 'Socapex Cable Case',               cat: 'Cable',    l: 0.80, w: 0.50, h: 0.50, weight: 35,  color: '#16a34a', stackable: true,  fragile: false, maxStack: 180 },
        { id: 'dmx-case',       name: 'DMX / Data Cable Case',            cat: 'Cable',    l: 0.60, w: 0.40, h: 0.40, weight: 20,  color: '#86efac', stackable: true,  fragile: false, maxStack: 150 },
        // ── GENERIC ──
        { id: 'rc-small',       name: 'Road Case Small',                  cat: 'Generic',  l: 0.60, w: 0.40, h: 0.40, weight: 15,  color: '#64748b', stackable: true,  fragile: false, maxStack: 150 },
        { id: 'rc-medium',      name: 'Road Case Medium',                 cat: 'Generic',  l: 0.90, w: 0.60, h: 0.50, weight: 30,  color: '#94a3b8', stackable: true,  fragile: false, maxStack: 200 },
        { id: 'rc-large',       name: 'Road Case Large',                  cat: 'Generic',  l: 1.20, w: 0.80, h: 0.70, weight: 55,  color: '#475569', stackable: true,  fragile: false, maxStack: 250 },
        { id: 'pelican-1650',   name: 'Pelican 1650',                     cat: 'Generic',  l: 0.80, w: 0.50, h: 0.35, weight: 12,  color: '#334155', stackable: true,  fragile: false, maxStack: 100 },
    ],

    // ================================================================
    // STATE
    // ================================================================
    _truck: { preset: 'my-truck', l: 6.0, w: 2.4, h: 2.2, weightLimit: 2000 },
    _loadItems: [],       // { ...caseDef, qty: N, id: unique }
    _packedItems: [],     // { ...item, px, py, pz, pl, pw, ph, fitted: true/false }
    _overflow: [],
    _nextItemId: 1,
    _selectedPackedIdx: -1,

    // 3D state
    _scene: null,
    _camera: null,
    _renderer: null,
    _animFrame: null,
    _meshes: [],
    _truckMesh: null,
    _labelSprites: [],
    _orbitState: {
        theta: Math.PI / 4,
        phi: Math.PI / 4,
        radius: 8,
        target: { x: 3, y: 1, z: 1.2 },
        isOrbiting: false,
        isPanning: false,
        prevMouse: { x: 0, y: 0 },
    },
    _viewMode: 'solid',  // 'solid' or 'wireframe'

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        const t = this._truck;
        const presetOpts = Object.entries(this._presets).map(([k, v]) =>
            `<option value="${k}" ${k === t.preset ? 'selected' : ''}>${v.label}</option>`
        ).join('');

        const catGroups = {};
        this._caseLibrary.forEach(c => {
            if (!catGroups[c.cat]) catGroups[c.cat] = [];
            catGroups[c.cat].push(c);
        });

        return `
        <style>
            .tp-layout { display: grid; grid-template-columns: 65fr 35fr; gap: 16px; min-height: 520px; }
            .tp-3d-wrap { position: relative; background: #0d1117; border-radius: 10px; border: 1px solid var(--border); overflow: hidden; min-height: 520px; }
            .tp-3d-wrap canvas { width: 100% !important; height: 100% !important; display: block; }
            .tp-3d-toolbar { position: absolute; top: 10px; left: 10px; display: flex; gap: 6px; z-index: 10; flex-wrap: wrap; }
            .tp-3d-toolbar .btn { font-size: 11px; padding: 4px 10px; background: rgba(15,23,42,0.85); border: 1px solid var(--border); backdrop-filter: blur(6px); }
            .tp-3d-toolbar .btn:hover { background: rgba(30,41,59,0.9); }
            .tp-3d-toolbar .btn.active { color: var(--accent); border-color: var(--accent); }
            .tp-3d-info { position: absolute; bottom: 10px; left: 10px; font-size: 10px; color: var(--text-muted); z-index: 10; pointer-events: none; }
            .tp-info-panel { position: absolute; bottom: 10px; right: 10px; z-index: 10; background: rgba(15,23,42,0.92); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 11px; color: var(--text-secondary); min-width: 180px; backdrop-filter: blur(6px); display: none; }
            .tp-info-panel.visible { display: block; }
            .tp-info-panel h4 { font-size: 12px; color: var(--text-primary); margin: 0 0 6px 0; }
            .tp-info-row { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 3px; }
            .tp-info-label { color: var(--text-muted); }
            .tp-controls { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; max-height: 85vh; }
            .tp-input-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
            .tp-input-row label { min-width: 80px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
            .tp-input-row input, .tp-input-row select { max-width: 140px; }
            .tp-dim-row { display: flex; gap: 8px; }
            .tp-dim-row .form-group { flex: 1; }
            .tp-dim-row .form-group label { font-size: 10px; }
            .tp-dim-row .form-group input { width: 100%; }
            .tp-lib-grid { display: grid; grid-template-columns: 1fr; gap: 4px; max-height: 200px; overflow-y: auto; }
            .tp-lib-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
            .tp-lib-item:hover { background: rgba(255,255,255,0.06); }
            .tp-lib-color { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
            .tp-lib-info { flex: 1; overflow: hidden; }
            .tp-lib-name { font-size: 11px; color: var(--text-primary); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
            .tp-lib-dims { font-size: 9px; color: var(--text-muted); }
            .tp-load-list { max-height: 220px; overflow-y: auto; }
            .tp-load-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 4px; background: rgba(255,255,255,0.02); }
            .tp-load-item.overflow { border-color: #ef4444; background: rgba(239,68,68,0.08); }
            .tp-load-item .tp-lib-color { width: 12px; height: 12px; }
            .tp-load-item-name { flex: 1; font-size: 11px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .tp-load-item-qty { display: flex; align-items: center; gap: 4px; }
            .tp-load-item-qty input { width: 42px; text-align: center; padding: 2px 4px; font-size: 11px; }
            .tp-load-item-weight { font-size: 10px; color: var(--text-muted); min-width: 45px; text-align: right; }
            .tp-load-item .btn-xs { padding: 2px 6px; font-size: 10px; }
            .tp-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .tp-stat { text-align: center; padding: 10px 6px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border); }
            .tp-stat-val { font-size: 18px; font-weight: 800; color: var(--accent); }
            .tp-stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
            .tp-stat.warn .tp-stat-val { color: #f59e0b; }
            .tp-stat.danger .tp-stat-val { color: #ef4444; }
            .tp-stat.ok .tp-stat-val { color: #4ade80; }
            .tp-weight-bar { height: 10px; border-radius: 5px; background: rgba(255,255,255,0.06); overflow: hidden; margin-top: 6px; }
            .tp-weight-bar-fill { height: 100%; border-radius: 5px; transition: width 0.3s; }
            .tp-balance-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; margin-top: 6px; background: rgba(255,255,255,0.06); }
            .tp-balance-front { height: 100%; background: #3b82f6; transition: width 0.3s; }
            .tp-balance-back { height: 100%; background: #22c55e; transition: width 0.3s; }
            .tp-cat-header { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 0 3px; font-weight: 700; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
            .tp-load-table { margin-top: 16px; }
            .tp-load-table .table-cell { font-size: 11px; }
            .tp-filter-row { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
            .tp-filter-btn { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
            .tp-filter-btn:hover, .tp-filter-btn.active { color: var(--accent); border-color: var(--accent); background: rgba(0,212,170,0.08); }
        </style>

        <div class="section-header">
            <h2><i class="fas fa-truck-loading"></i> Truck Packer</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="TruckPackPage._importJSON()"><i class="fas fa-file-import"></i> Import</button>
                <button class="btn btn-sm" onclick="TruckPackPage._showExportMenu()"><i class="fas fa-file-export"></i> Export</button>
                <button class="btn btn-sm" onclick="TruckPackPage._clearAll()"><i class="fas fa-trash-alt"></i> Clear</button>
            </div>
        </div>

        <div class="tp-layout">
            <!-- 3D Viewer -->
            <div class="tp-3d-wrap" id="tp-3d-container">
                <div class="tp-3d-toolbar">
                    <button class="btn btn-xs" onclick="TruckPackPage._setView('perspective')" title="3D View"><i class="fas fa-cube"></i></button>
                    <button class="btn btn-xs" onclick="TruckPackPage._setView('front')" title="Front View"><i class="fas fa-arrow-right"></i></button>
                    <button class="btn btn-xs" onclick="TruckPackPage._setView('side')" title="Side View"><i class="fas fa-arrow-up"></i></button>
                    <button class="btn btn-xs" onclick="TruckPackPage._setView('top')" title="Top View"><i class="fas fa-arrow-down"></i></button>
                    <button class="btn btn-xs" id="tp-view-toggle" onclick="TruckPackPage._toggleViewMode()" title="Toggle Wireframe"><i class="fas fa-border-all"></i></button>
                    <button class="btn btn-xs" onclick="TruckPackPage._screenshotPNG()" title="Screenshot"><i class="fas fa-camera"></i></button>
                </div>
                <div class="tp-3d-info">Left-drag: orbit &middot; Right-drag: pan &middot; Scroll: zoom &middot; Click: select</div>
                <div class="tp-info-panel" id="tp-info-panel">
                    <h4 id="tp-info-name">--</h4>
                    <div class="tp-info-row"><span class="tp-info-label">Dimensions</span><span id="tp-info-dims">--</span></div>
                    <div class="tp-info-row"><span class="tp-info-label">Weight</span><span id="tp-info-weight">--</span></div>
                    <div class="tp-info-row"><span class="tp-info-label">Position</span><span id="tp-info-pos">--</span></div>
                    <div class="tp-info-row"><span class="tp-info-label">Stackable</span><span id="tp-info-stack">--</span></div>
                </div>
            </div>

            <!-- Controls -->
            <div class="tp-controls">
                <!-- Truck Config -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-truck"></i> Truck</h3></div>
                    <div class="card-body">
                        <div class="tp-input-row">
                            <label>Preset</label>
                            <select class="form-control" id="tp-preset" onchange="TruckPackPage._onPresetChange()" style="max-width:200px;">
                                ${presetOpts}
                            </select>
                        </div>
                        <div class="tp-dim-row" id="tp-dim-row">
                            <div class="form-group"><label class="form-label">L (m)</label><input type="number" class="form-control" id="tp-truck-l" value="${t.l}" step="0.1" min="0.5" max="20" onchange="TruckPackPage._onTruckDimChange()"></div>
                            <div class="form-group"><label class="form-label">W (m)</label><input type="number" class="form-control" id="tp-truck-w" value="${t.w}" step="0.1" min="0.5" max="5" onchange="TruckPackPage._onTruckDimChange()"></div>
                            <div class="form-group"><label class="form-label">H (m)</label><input type="number" class="form-control" id="tp-truck-h" value="${t.h}" step="0.1" min="0.5" max="5" onchange="TruckPackPage._onTruckDimChange()"></div>
                        </div>
                        <div class="tp-input-row">
                            <label>Weight Limit</label>
                            <input type="number" class="form-control" id="tp-weight-limit" value="${t.weightLimit}" step="100" min="0" onchange="TruckPackPage._onWeightLimitChange()" style="max-width:100px;">
                            <span style="font-size:11px;color:var(--text-muted);">kg</span>
                        </div>
                    </div>
                </div>

                <!-- Item Library -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-boxes"></i> Case Library</h3>
                        <button class="btn btn-xs btn-ghost" onclick="TruckPackPage._showCustomCaseModal()"><i class="fas fa-plus"></i> Custom</button>
                    </div>
                    <div class="card-body">
                        <div class="tp-filter-row" id="tp-cat-filters">
                            <span class="tp-filter-btn active" onclick="TruckPackPage._filterLib('all', this)">All</span>
                            ${[...new Set(this._caseLibrary.map(c => c.cat))].map(cat =>
                                `<span class="tp-filter-btn" onclick="TruckPackPage._filterLib('${cat}', this)">${cat}</span>`
                            ).join('')}
                        </div>
                        <div class="tp-lib-grid" id="tp-lib-grid">
                            ${this._renderLibrary('all')}
                        </div>
                    </div>
                </div>

                <!-- Load List -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-list"></i> Load List <span id="tp-item-count" style="font-size:11px;color:var(--text-muted);font-weight:400;">(0 items)</span></h3>
                        <button class="btn btn-xs btn-primary" onclick="TruckPackPage._autoPack()"><i class="fas fa-magic"></i> Auto-Pack</button>
                    </div>
                    <div class="card-body">
                        <div class="tp-load-list" id="tp-load-list">
                            ${this._renderLoadList()}
                        </div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-chart-bar"></i> Load Stats</h3></div>
                    <div class="card-body" id="tp-stats">
                        ${this._renderStats()}
                    </div>
                </div>
            </div>
        </div>

        <!-- Load Plan Table -->
        <div class="tp-load-table" id="tp-load-table">
            ${this._renderLoadTable()}
        </div>
        `;
    },

    // ================================================================
    // LIBRARY RENDERING
    // ================================================================
    _renderLibrary(filter) {
        const items = filter === 'all' ? this._caseLibrary : this._caseLibrary.filter(c => c.cat === filter);
        if (items.length === 0) return '<div style="font-size:11px;color:var(--text-muted);padding:8px;">No items</div>';

        let currentCat = '';
        let html = '';
        items.forEach(c => {
            if (c.cat !== currentCat) {
                currentCat = c.cat;
                if (filter === 'all') html += `<div class="tp-cat-header">${UI.esc(c.cat)}</div>`;
            }
            html += `
                <div class="tp-lib-item" onclick="TruckPackPage._addToLoad('${c.id}')" title="${UI.esc(c.name)}">
                    <div class="tp-lib-color" style="background:${c.color};"></div>
                    <div class="tp-lib-info">
                        <div class="tp-lib-name">${UI.esc(c.name)}</div>
                        <div class="tp-lib-dims">${c.l}\u00d7${c.w}\u00d7${c.h}m &middot; ${c.weight}kg</div>
                    </div>
                    <button class="btn btn-xs btn-ghost" title="Add"><i class="fas fa-plus"></i></button>
                </div>
            `;
        });
        return html;
    },

    _filterLib(cat, btn) {
        document.querySelectorAll('#tp-cat-filters .tp-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const grid = document.getElementById('tp-lib-grid');
        if (grid) grid.innerHTML = this._renderLibrary(cat);
    },

    // ================================================================
    // LOAD LIST MANAGEMENT
    // ================================================================
    _addToLoad(caseId) {
        const def = this._caseLibrary.find(c => c.id === caseId);
        if (!def) return;
        // Check if already in list - increment quantity
        const existing = this._loadItems.find(i => i.caseId === caseId);
        if (existing) {
            existing.qty++;
        } else {
            this._loadItems.push({ ...def, caseId: caseId, uid: this._nextItemId++, qty: 1 });
        }
        this._refreshLoadUI();
        UI.toast(`Added ${def.name}`, 'success');
    },

    _addCustomToLoad(item) {
        this._loadItems.push({ ...item, uid: this._nextItemId++, qty: 1 });
        this._refreshLoadUI();
        UI.toast(`Added ${item.name}`, 'success');
    },

    _removeFromLoad(uid) {
        this._loadItems = this._loadItems.filter(i => i.uid !== uid);
        this._refreshLoadUI();
    },

    _updateQty(uid, val) {
        const item = this._loadItems.find(i => i.uid === uid);
        if (item) {
            item.qty = Math.max(1, parseInt(val) || 1);
            this._refreshLoadUI();
        }
    },

    _refreshLoadUI() {
        this._persistState();
        const ll = document.getElementById('tp-load-list');
        if (ll) ll.innerHTML = this._renderLoadList();
        const st = document.getElementById('tp-stats');
        if (st) st.innerHTML = this._renderStats();
        const ct = document.getElementById('tp-item-count');
        if (ct) {
            const total = this._loadItems.reduce((s, i) => s + i.qty, 0);
            ct.textContent = `(${total} item${total !== 1 ? 's' : ''})`;
        }
        const lt = document.getElementById('tp-load-table');
        if (lt) lt.innerHTML = this._renderLoadTable();
    },

    _renderLoadList() {
        if (this._loadItems.length === 0) {
            return '<div style="font-size:11px;color:var(--text-muted);padding:12px;text-align:center;"><i class="fas fa-box-open" style="font-size:24px;display:block;margin-bottom:6px;opacity:0.3;"></i>Click items from the library to add them</div>';
        }

        const overflowIds = new Set(this._overflow.map(o => o.uid));

        return this._loadItems.map(item => {
            const isOverflow = overflowIds.has(item.uid);
            return `
                <div class="tp-load-item ${isOverflow ? 'overflow' : ''}">
                    <div class="tp-lib-color" style="background:${item.color};"></div>
                    <div class="tp-load-item-name">${UI.esc(item.name)} ${isOverflow ? '<span style="color:#ef4444;font-size:9px;">(overflow)</span>' : ''}</div>
                    <div class="tp-load-item-qty">
                        <button class="btn btn-xs btn-ghost" onclick="TruckPackPage._updateQty(${item.uid}, ${item.qty - 1})"><i class="fas fa-minus"></i></button>
                        <input type="number" class="form-control" value="${item.qty}" min="1" style="width:42px;text-align:center;padding:2px 4px;font-size:11px;" onchange="TruckPackPage._updateQty(${item.uid}, this.value)">
                        <button class="btn btn-xs btn-ghost" onclick="TruckPackPage._updateQty(${item.uid}, ${item.qty + 1})"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="tp-load-item-weight">${(item.weight * item.qty).toFixed(0)}kg</div>
                    <button class="btn btn-xs btn-ghost" style="color:#ef4444;" onclick="TruckPackPage._removeFromLoad(${item.uid})" title="Remove"><i class="fas fa-times"></i></button>
                </div>
            `;
        }).join('');
    },

    // ================================================================
    // STATS
    // ================================================================
    _getStats() {
        const t = this._truck;
        const truckVol = t.l * t.w * t.h;
        let totalWeight = 0, totalVol = 0, totalItems = 0;
        this._loadItems.forEach(item => {
            totalWeight += item.weight * item.qty;
            totalVol += item.l * item.w * item.h * item.qty;
            totalItems += item.qty;
        });
        const packedVol = this._packedItems.reduce((s, p) => s + p.pl * p.pw * p.ph, 0);
        const efficiency = truckVol > 0 ? (packedVol / truckVol) * 100 : 0;
        const weightPct = t.weightLimit > 0 ? (totalWeight / t.weightLimit) * 100 : 0;

        // Weight distribution (front = low X, back = high X)
        let frontWeight = 0, backWeight = 0;
        const midX = t.l / 2;
        this._packedItems.forEach(p => {
            const cx = p.px + p.pl / 2;
            if (cx < midX) frontWeight += p.weight;
            else backWeight += p.weight;
        });
        const packedWeight = frontWeight + backWeight;
        const frontPct = packedWeight > 0 ? (frontWeight / packedWeight) * 100 : 50;
        const backPct = packedWeight > 0 ? (backWeight / packedWeight) * 100 : 50;

        // Center of gravity
        let cogX = 0, cogY = 0, cogZ = 0;
        if (packedWeight > 0) {
            this._packedItems.forEach(p => {
                cogX += (p.px + p.pl / 2) * p.weight;
                cogY += (p.py + p.ph / 2) * p.weight;
                cogZ += (p.pz + p.pw / 2) * p.weight;
            });
            cogX /= packedWeight;
            cogY /= packedWeight;
            cogZ /= packedWeight;
        }

        return { truckVol, totalWeight, totalVol, totalItems, packedVol, efficiency, weightPct, frontPct, backPct, cogX, cogY, cogZ, packedWeight, frontWeight, backWeight };
    },

    _renderStats() {
        const s = this._getStats();
        const t = this._truck;
        const weightColor = s.weightPct > 100 ? '#ef4444' : s.weightPct > 80 ? '#f59e0b' : '#4ade80';
        const effColor = s.efficiency > 80 ? '#4ade80' : s.efficiency > 50 ? '#f59e0b' : 'var(--accent)';

        return `
            <div class="tp-stats-grid">
                <div class="tp-stat">
                    <div class="tp-stat-val">${s.totalItems}</div>
                    <div class="tp-stat-label">Total Items</div>
                </div>
                <div class="tp-stat ${s.weightPct > 100 ? 'danger' : s.weightPct > 80 ? 'warn' : 'ok'}">
                    <div class="tp-stat-val">${s.totalWeight.toFixed(0)}<span style="font-size:11px;font-weight:400;">/${t.weightLimit}kg</span></div>
                    <div class="tp-stat-label">Weight</div>
                </div>
                <div class="tp-stat">
                    <div class="tp-stat-val">${s.totalVol.toFixed(2)}<span style="font-size:11px;font-weight:400;">/${s.truckVol.toFixed(1)}m\u00b3</span></div>
                    <div class="tp-stat-label">Volume</div>
                </div>
                <div class="tp-stat">
                    <div class="tp-stat-val" style="color:${effColor}">${s.efficiency.toFixed(1)}%</div>
                    <div class="tp-stat-label">Pack Efficiency</div>
                </div>
            </div>
            <div style="margin-top:10px;">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Weight: ${s.totalWeight.toFixed(0)} / ${t.weightLimit} kg (${s.weightPct.toFixed(0)}%)</div>
                <div class="tp-weight-bar">
                    <div class="tp-weight-bar-fill" style="width:${Math.min(100, s.weightPct)}%;background:${weightColor};"></div>
                </div>
            </div>
            <div style="margin-top:10px;">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Balance: Front ${s.frontPct.toFixed(0)}% / Back ${s.backPct.toFixed(0)}%</div>
                <div class="tp-balance-bar">
                    <div class="tp-balance-front" style="width:${s.frontPct}%;"></div>
                    <div class="tp-balance-back" style="width:${s.backPct}%;"></div>
                </div>
            </div>
            ${s.packedWeight > 0 ? `
                <div style="margin-top:10px;font-size:10px;color:var(--text-muted);">
                    <i class="fas fa-crosshairs"></i> Center of gravity: X=${s.cogX.toFixed(2)}m Y=${s.cogY.toFixed(2)}m Z=${s.cogZ.toFixed(2)}m
                </div>
            ` : ''}
            ${this._overflow.length > 0 ? `
                <div style="margin-top:10px;padding:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;font-size:11px;color:#ef4444;">
                    <i class="fas fa-exclamation-triangle"></i> ${this._overflow.length} item(s) did not fit
                </div>
            ` : ''}
        `;
    },

    // ================================================================
    // LOAD TABLE
    // ================================================================
    _renderLoadTable() {
        if (this._packedItems.length === 0 && this._overflow.length === 0) return '';

        let rows = '';
        this._packedItems.forEach((p, i) => {
            rows += `
                <div class="table-row" style="cursor:pointer;" onclick="TruckPackPage._selectPacked(${i})">
                    <div class="table-cell" style="width:30px;"><div class="tp-lib-color" style="background:${p.color};width:12px;height:12px;"></div></div>
                    <div class="table-cell" style="flex:2;">${UI.esc(p.name)}</div>
                    <div class="table-cell" style="flex:1;">${p.pl.toFixed(2)}\u00d7${p.pw.toFixed(2)}\u00d7${p.ph.toFixed(2)}</div>
                    <div class="table-cell" style="flex:0.5;">${p.weight}kg</div>
                    <div class="table-cell" style="flex:1;">(${p.px.toFixed(2)}, ${p.py.toFixed(2)}, ${p.pz.toFixed(2)})</div>
                    <div class="table-cell" style="flex:0.5;">${UI.badge('Packed', 'green')}</div>
                </div>
            `;
        });
        this._overflow.forEach(p => {
            rows += `
                <div class="table-row" style="opacity:0.7;">
                    <div class="table-cell" style="width:30px;"><div class="tp-lib-color" style="background:${p.color};width:12px;height:12px;"></div></div>
                    <div class="table-cell" style="flex:2;">${UI.esc(p.name)}</div>
                    <div class="table-cell" style="flex:1;">${p.l.toFixed(2)}\u00d7${p.w.toFixed(2)}\u00d7${p.h.toFixed(2)}</div>
                    <div class="table-cell" style="flex:0.5;">${p.weight}kg</div>
                    <div class="table-cell" style="flex:1;">--</div>
                    <div class="table-cell" style="flex:0.5;">${UI.badge('Overflow', 'red')}</div>
                </div>
            `;
        });

        return `
            <div class="card" style="margin-top:16px;">
                <div class="card-header"><h3><i class="fas fa-clipboard-list"></i> Load Plan</h3></div>
                <div class="card-body" style="padding:0;">
                    <div class="table">
                        <div class="table-header">
                            <div class="table-cell" style="width:30px;"></div>
                            <div class="table-cell" style="flex:2;">Item</div>
                            <div class="table-cell" style="flex:1;">L\u00d7W\u00d7H (m)</div>
                            <div class="table-cell" style="flex:0.5;">Weight</div>
                            <div class="table-cell" style="flex:1;">Position (X,Y,Z)</div>
                            <div class="table-cell" style="flex:0.5;">Status</div>
                        </div>
                        ${rows}
                    </div>
                </div>
            </div>
        `;
    },

    // ================================================================
    // TRUCK CONFIG
    // ================================================================
    _onPresetChange() {
        const sel = document.getElementById('tp-preset');
        if (!sel) return;
        const key = sel.value;
        this._truck.preset = key;
        if (key !== 'custom') {
            const p = this._presets[key];
            this._truck.l = p.l;
            this._truck.w = p.w;
            this._truck.h = p.h;
            document.getElementById('tp-truck-l').value = p.l;
            document.getElementById('tp-truck-w').value = p.w;
            document.getElementById('tp-truck-h').value = p.h;
        }
        this._updateOrbitTarget();
        this._build3D();
    },

    _onTruckDimChange() {
        this._truck.l = parseFloat(document.getElementById('tp-truck-l').value) || 6;
        this._truck.w = parseFloat(document.getElementById('tp-truck-w').value) || 2.4;
        this._truck.h = parseFloat(document.getElementById('tp-truck-h').value) || 2.2;
        this._truck.preset = 'custom';
        document.getElementById('tp-preset').value = 'custom';
        this._updateOrbitTarget();
        this._build3D();
        this._refreshLoadUI();
    },

    _onWeightLimitChange() {
        this._truck.weightLimit = parseInt(document.getElementById('tp-weight-limit').value) || 2000;
        this._refreshLoadUI();
    },

    _updateOrbitTarget() {
        this._orbitState.target.x = this._truck.l / 2;
        this._orbitState.target.y = this._truck.h / 2;
        this._orbitState.target.z = this._truck.w / 2;
        this._orbitState.radius = Math.max(this._truck.l, this._truck.w, this._truck.h) * 1.5;
    },

    // ================================================================
    // AUTO-PACK ALGORITHM — 3D bin packing
    // ================================================================
    _autoPack() {
        const t = this._truck;
        this._packedItems = [];
        this._overflow = [];
        this._selectedPackedIdx = -1;

        // Expand items by quantity, sort: heavy first, then largest volume first
        let items = [];
        this._loadItems.forEach(item => {
            for (let q = 0; q < item.qty; q++) {
                items.push({
                    ...item,
                    vol: item.l * item.w * item.h,
                    _origIdx: item.uid,
                });
            }
        });

        // Sort: fragile last, then heavy first, then biggest first
        items.sort((a, b) => {
            if (a.fragile !== b.fragile) return a.fragile ? 1 : -1;
            if (b.weight !== a.weight) return b.weight - a.weight;
            return b.vol - a.vol;
        });

        // Spaces list: each space is an available rectangular region in the truck
        // Space: { x, y, z, l, w, h }
        // l = along truck length (X), w = along truck width (Z), h = up (Y)
        let spaces = [{ x: 0, y: 0, z: 0, l: t.l, w: t.w, h: t.h }];

        const EPSILON = 0.001;

        const fitsInSpace = (il, iw, ih, space) => {
            return il <= space.l + EPSILON && iw <= space.w + EPSILON && ih <= space.h + EPSILON;
        };

        const canStack = (item, y, il, iw, ih) => {
            // Check what is below this item
            if (y < EPSILON) return true; // On the floor
            // Find items below
            for (const packed of this._packedItems) {
                // Check if this item would sit on top of packed
                if (Math.abs(packed.py + packed.ph - y) < EPSILON) {
                    // Overlapping in XZ?
                    // (we don't need exact overlap check for stacking rules, just check fragile/stackable)
                    if (!packed.stackable) return false;
                    if (packed.fragile && item.weight > 5) return false;
                    if (packed.maxStack > 0 && item.weight > packed.maxStack) return false;
                }
            }
            return true;
        };

        for (const item of items) {
            let placed = false;
            const rotations = [
                { l: item.l, w: item.w, h: item.h },
                { l: item.w, w: item.l, h: item.h },
            ];

            // Sort spaces: prefer bottom (low Y), then back (low X), then left (low Z)
            spaces.sort((a, b) => {
                if (Math.abs(a.y - b.y) > EPSILON) return a.y - b.y;
                if (Math.abs(a.x - b.x) > EPSILON) return a.x - b.x;
                return a.z - b.z;
            });

            for (let si = 0; si < spaces.length && !placed; si++) {
                const space = spaces[si];
                for (const rot of rotations) {
                    if (fitsInSpace(rot.l, rot.w, rot.h, space) && canStack(item, space.y, rot.l, rot.w, rot.h)) {
                        // Place item
                        this._packedItems.push({
                            name: item.name,
                            color: item.color,
                            weight: item.weight,
                            stackable: item.stackable,
                            fragile: item.fragile,
                            maxStack: item.maxStack,
                            uid: item.uid,
                            caseId: item.caseId,
                            l: item.l, w: item.w, h: item.h,
                            px: space.x,
                            py: space.y,
                            pz: space.z,
                            pl: rot.l,
                            pw: rot.w,
                            ph: rot.h,
                        });

                        // Split the space into 3 remaining spaces
                        const newSpaces = [];

                        // Right space (along truck length)
                        const rl = space.l - rot.l;
                        if (rl > EPSILON) {
                            newSpaces.push({ x: space.x + rot.l, y: space.y, z: space.z, l: rl, w: space.w, h: space.h });
                        }

                        // Front space (along truck width)
                        const fw = space.w - rot.w;
                        if (fw > EPSILON) {
                            newSpaces.push({ x: space.x, y: space.y, z: space.z + rot.w, l: rot.l, w: fw, h: space.h });
                        }

                        // Top space (upward)
                        const th = space.h - rot.h;
                        if (th > EPSILON) {
                            newSpaces.push({ x: space.x, y: space.y + rot.h, z: space.z, l: rot.l, w: rot.w, h: th });
                        }

                        // Remove used space, add new ones
                        spaces.splice(si, 1, ...newSpaces);

                        // Merge overlapping / tiny spaces
                        spaces = spaces.filter(s => s.l > 0.01 && s.w > 0.01 && s.h > 0.01);

                        placed = true;
                        break;
                    }
                }
            }

            if (!placed) {
                this._overflow.push(item);
            }
        }

        const stats = this._getStats();
        this._refreshLoadUI();
        this._build3D();

        if (this._overflow.length > 0) {
            UI.toast(`Packed ${this._packedItems.length} items (${this._overflow.length} overflow). Efficiency: ${stats.efficiency.toFixed(1)}%`, 'warning');
        } else {
            UI.toast(`All ${this._packedItems.length} items packed! Efficiency: ${stats.efficiency.toFixed(1)}%`, 'success');
        }
    },

    // ================================================================
    // 3D VISUALIZATION
    // ================================================================
    _init3D() {
        const container = document.getElementById('tp-3d-container');
        if (!container || typeof THREE === 'undefined') return;

        // Clean up previous
        this._dispose3D();

        const rect = container.getBoundingClientRect();
        const w = rect.width || 800;
        const h = rect.height || 520;

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x0d1117);

        this._camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);

        this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this._renderer.setSize(w, h);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this._renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this._scene.add(ambient);
        const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
        dir1.position.set(5, 10, 7);
        this._scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
        dir2.position.set(-5, 3, -5);
        this._scene.add(dir2);

        // Grid
        const gridSize = 20;
        const grid = new THREE.GridHelper(gridSize, gridSize * 2, 0x333333, 0x222222);
        grid.position.set(gridSize / 2, 0, gridSize / 2);
        this._scene.add(grid);

        // Axes
        const axes = new THREE.AxesHelper(2);
        axes.position.set(-0.3, 0, -0.3);
        this._scene.add(axes);

        this._updateOrbitTarget();
        this._updateCamera();
        this._build3D();
        this._bindControls(container);
        this._animate();
    },

    _dispose3D() {
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        if (this._renderer) {
            const canvas = this._renderer.domElement;
            if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
            this._renderer.dispose();
            this._renderer = null;
        }
        if (this._scene) {
            this._scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            this._scene = null;
        }
        this._meshes = [];
        this._labelSprites = [];
        this._truckMesh = null;
    },

    _build3D() {
        if (!this._scene) return;

        // Remove old item meshes and truck
        this._meshes.forEach(m => this._scene.remove(m));
        this._labelSprites.forEach(s => this._scene.remove(s));
        if (this._truckMesh) {
            this._truckMesh.forEach(m => this._scene.remove(m));
        }
        this._meshes = [];
        this._labelSprites = [];
        this._truckMesh = [];

        const t = this._truck;

        // Truck floor
        const floorGeo = new THREE.PlaneGeometry(t.l, t.w);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(t.l / 2, 0, t.w / 2);
        this._scene.add(floor);
        this._truckMesh.push(floor);

        // Truck wireframe box
        const boxGeo = new THREE.BoxGeometry(t.l, t.h, t.w);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x4a5568, linewidth: 1 });
        const edges = new THREE.EdgesGeometry(boxGeo);
        const wireBox = new THREE.LineSegments(edges, edgeMat);
        wireBox.position.set(t.l / 2, t.h / 2, t.w / 2);
        this._scene.add(wireBox);
        this._truckMesh.push(wireBox);

        // Semi-transparent walls (back, left, right)
        const wallMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.08, side: THREE.DoubleSide });

        // Back wall (x=0)
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(t.w, t.h), wallMat);
        backWall.position.set(0, t.h / 2, t.w / 2);
        backWall.rotation.y = Math.PI / 2;
        this._scene.add(backWall);
        this._truckMesh.push(backWall);

        // Left wall (z=0)
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(t.l, t.h), wallMat);
        leftWall.position.set(t.l / 2, t.h / 2, 0);
        this._scene.add(leftWall);
        this._truckMesh.push(leftWall);

        // Right wall (z=w)
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(t.l, t.h), wallMat.clone());
        rightWall.position.set(t.l / 2, t.h / 2, t.w);
        this._scene.add(rightWall);
        this._truckMesh.push(rightWall);

        // Dimension labels using sprites
        this._addDimensionLabel(`${t.l}m`, t.l / 2, -0.2, -0.3);
        this._addDimensionLabel(`${t.w}m`, -0.3, -0.2, t.w / 2);
        this._addDimensionLabel(`${t.h}m`, -0.3, t.h / 2, -0.3);

        // Packed items
        this._packedItems.forEach((p, idx) => {
            this._addCaseMesh(p, idx);
        });
    },

    _addCaseMesh(p, idx) {
        const isSelected = idx === this._selectedPackedIdx;
        const color = new THREE.Color(p.color);

        if (this._viewMode === 'wireframe') {
            const geo = new THREE.BoxGeometry(p.pl, p.ph, p.pw);
            const edges = new THREE.EdgesGeometry(geo);
            const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 1 });
            const wire = new THREE.LineSegments(edges, mat);
            wire.position.set(p.px + p.pl / 2, p.py + p.ph / 2, p.pz + p.pw / 2);
            wire.userData = { packedIdx: idx };
            this._scene.add(wire);
            this._meshes.push(wire);
        } else {
            const geo = new THREE.BoxGeometry(p.pl, p.ph, p.pw);
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                transparent: true,
                opacity: isSelected ? 1.0 : 0.8,
                roughness: 0.6,
                metalness: 0.1,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(p.px + p.pl / 2, p.py + p.ph / 2, p.pz + p.pw / 2);
            mesh.userData = { packedIdx: idx };
            this._scene.add(mesh);
            this._meshes.push(mesh);

            // Edge outline
            const edgeMat = new THREE.LineBasicMaterial({ color: isSelected ? 0xffffff : 0x000000, linewidth: 1 });
            const edgeGeo = new THREE.EdgesGeometry(geo);
            const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
            edgeLine.position.copy(mesh.position);
            edgeLine.userData = { packedIdx: idx };
            this._scene.add(edgeLine);
            this._meshes.push(edgeLine);

            // Selection glow
            if (isSelected) {
                const glowGeo = new THREE.BoxGeometry(p.pl + 0.02, p.ph + 0.02, p.pw + 0.02);
                const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.BackSide });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.position.copy(mesh.position);
                this._scene.add(glow);
                this._meshes.push(glow);
            }
        }

        // Label sprite
        this._addItemLabel(p.name, p.px + p.pl / 2, p.py + p.ph + 0.12, p.pz + p.pw / 2);
    },

    _addItemLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 48;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 256, 48);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Truncate long names
        let display = text.length > 22 ? text.substring(0, 20) + '..' : text;
        ctx.fillText(display, 128, 24);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, y, z);
        sprite.scale.set(1.2, 0.25, 1);
        this._scene.add(sprite);
        this._labelSprites.push(sprite);
    },

    _addDimensionLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 16);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.8, 0.2, 1);
        this._scene.add(sprite);
        this._truckMesh.push(sprite);
    },

    // ================================================================
    // CUSTOM ORBIT CONTROLS
    // ================================================================
    _bindControls(container) {
        const canvas = this._renderer.domElement;
        const orbit = this._orbitState;

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                orbit.isOrbiting = true;
            } else if (e.button === 2) {
                orbit.isPanning = true;
            }
            orbit.prevMouse.x = e.clientX;
            orbit.prevMouse.y = e.clientY;
            e.preventDefault();
        });

        canvas.addEventListener('mousemove', (e) => {
            const dx = e.clientX - orbit.prevMouse.x;
            const dy = e.clientY - orbit.prevMouse.y;
            orbit.prevMouse.x = e.clientX;
            orbit.prevMouse.y = e.clientY;

            if (orbit.isOrbiting) {
                orbit.theta -= dx * 0.005;
                orbit.phi -= dy * 0.005;
                orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi));
                this._updateCamera();
            }

            if (orbit.isPanning) {
                const panSpeed = orbit.radius * 0.002;
                // Pan in camera's local right and up directions
                const right = new THREE.Vector3();
                const up = new THREE.Vector3();
                this._camera.matrix.extractBasis(right, up, new THREE.Vector3());
                orbit.target.x -= (right.x * dx - up.x * dy) * panSpeed;
                orbit.target.y -= (right.y * dx - up.y * dy) * panSpeed;
                orbit.target.z -= (right.z * dx - up.z * dy) * panSpeed;
                this._updateCamera();
            }
        });

        canvas.addEventListener('mouseup', () => {
            orbit.isOrbiting = false;
            orbit.isPanning = false;
        });

        canvas.addEventListener('mouseleave', () => {
            orbit.isOrbiting = false;
            orbit.isPanning = false;
        });

        canvas.addEventListener('wheel', (e) => {
            orbit.radius *= e.deltaY > 0 ? 1.08 : 0.92;
            orbit.radius = Math.max(1, Math.min(50, orbit.radius));
            this._updateCamera();
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Click to select
        canvas.addEventListener('click', (e) => {
            if (this._packedItems.length === 0) return;
            const rect = canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this._camera);
            const hits = raycaster.intersectObjects(this._meshes.filter(m => m.isMesh), false);
            if (hits.length > 0) {
                const idx = hits[0].object.userData.packedIdx;
                if (idx !== undefined) {
                    this._selectPacked(idx);
                    return;
                }
            }
            this._selectPacked(-1);
        });

        // Handle resize
        this._resizeHandler = () => {
            if (!this._renderer || !this._camera) return;
            const r = container.getBoundingClientRect();
            this._camera.aspect = r.width / r.height;
            this._camera.updateProjectionMatrix();
            this._renderer.setSize(r.width, r.height);
        };
        window.addEventListener('resize', this._resizeHandler);
    },

    _updateCamera() {
        if (!this._camera) return;
        const o = this._orbitState;
        const x = o.target.x + o.radius * Math.sin(o.phi) * Math.cos(o.theta);
        const y = o.target.y + o.radius * Math.cos(o.phi);
        const z = o.target.z + o.radius * Math.sin(o.phi) * Math.sin(o.theta);
        this._camera.position.set(x, y, z);
        this._camera.lookAt(o.target.x, o.target.y, o.target.z);
    },

    _animate() {
        if (!this._renderer || !this._scene || !this._camera) return;
        this._animFrame = requestAnimationFrame(() => this._animate());
        this._renderer.render(this._scene, this._camera);
    },

    _selectPacked(idx) {
        this._selectedPackedIdx = idx;
        this._build3D();

        const panel = document.getElementById('tp-info-panel');
        if (!panel) return;

        if (idx >= 0 && idx < this._packedItems.length) {
            const p = this._packedItems[idx];
            panel.classList.add('visible');
            document.getElementById('tp-info-name').textContent = p.name;
            document.getElementById('tp-info-dims').textContent = `${p.pl.toFixed(2)}\u00d7${p.pw.toFixed(2)}\u00d7${p.ph.toFixed(2)} m`;
            document.getElementById('tp-info-weight').textContent = `${p.weight} kg`;
            document.getElementById('tp-info-pos').textContent = `(${p.px.toFixed(2)}, ${p.py.toFixed(2)}, ${p.pz.toFixed(2)})`;
            document.getElementById('tp-info-stack').textContent = p.stackable ? 'Yes' : 'No';
        } else {
            panel.classList.remove('visible');
        }
    },

    // ================================================================
    // CAMERA PRESETS
    // ================================================================
    _setView(view) {
        const t = this._truck;
        const o = this._orbitState;
        o.target.x = t.l / 2;
        o.target.y = t.h / 2;
        o.target.z = t.w / 2;
        const maxDim = Math.max(t.l, t.w, t.h);

        switch (view) {
            case 'front':
                o.theta = 0;
                o.phi = Math.PI / 2;
                o.radius = maxDim * 1.5;
                break;
            case 'side':
                o.theta = Math.PI / 2;
                o.phi = Math.PI / 2;
                o.radius = maxDim * 1.5;
                break;
            case 'top':
                o.theta = 0;
                o.phi = 0.05;
                o.radius = maxDim * 1.8;
                break;
            case 'perspective':
            default:
                o.theta = Math.PI / 4;
                o.phi = Math.PI / 4;
                o.radius = maxDim * 1.5;
                break;
        }
        this._updateCamera();
    },

    _toggleViewMode() {
        this._viewMode = this._viewMode === 'solid' ? 'wireframe' : 'solid';
        const btn = document.getElementById('tp-view-toggle');
        if (btn) btn.classList.toggle('active', this._viewMode === 'wireframe');
        this._build3D();
    },

    // ================================================================
    // SCREENSHOT
    // ================================================================
    _screenshotPNG() {
        if (!this._renderer) return;
        this._renderer.render(this._scene, this._camera);
        const dataUrl = this._renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'truck-pack-3d.png';
        link.href = dataUrl;
        link.click();
        UI.toast('Screenshot saved', 'success');
    },

    // ================================================================
    // CUSTOM CASE MODAL
    // ================================================================
    _showCustomCaseModal() {
        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label class="form-label">Case Name</label><input type="text" class="form-control" id="tp-cc-name" placeholder="My Custom Case" style="grid-column:1/-1;"></div>
                <div class="form-group"><label class="form-label">Length (m)</label><input type="number" class="form-control" id="tp-cc-l" value="1.0" step="0.05" min="0.1"></div>
                <div class="form-group"><label class="form-label">Width (m)</label><input type="number" class="form-control" id="tp-cc-w" value="0.6" step="0.05" min="0.1"></div>
                <div class="form-group"><label class="form-label">Height (m)</label><input type="number" class="form-control" id="tp-cc-h" value="0.5" step="0.05" min="0.1"></div>
                <div class="form-group"><label class="form-label">Weight (kg)</label><input type="number" class="form-control" id="tp-cc-wt" value="30" step="1" min="0"></div>
                <div class="form-group"><label class="form-label">Color</label><input type="color" class="form-control" id="tp-cc-color" value="#06b6d4" style="height:36px;padding:2px;"></div>
                <div class="form-group"><label class="form-label">Max Stack Weight (kg)</label><input type="number" class="form-control" id="tp-cc-maxstack" value="150" step="10" min="0"></div>
                <div class="form-group" style="display:flex;align-items:center;gap:10px;"><label class="form-label" style="margin:0;">Stackable</label><input type="checkbox" id="tp-cc-stackable" checked></div>
                <div class="form-group" style="display:flex;align-items:center;gap:10px;"><label class="form-label" style="margin:0;">Fragile</label><input type="checkbox" id="tp-cc-fragile"></div>
            </div>
        `;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="TruckPackPage._addCustomCase()">Add to Load</button>
            <button class="btn btn-ghost" onclick="TruckPackPage._saveCustomToLibrary()">Save to Library</button>
        `;
        UI.openModal('Custom Case', body, footer);
    },

    _getCustomCaseFromModal() {
        const name = document.getElementById('tp-cc-name').value.trim() || 'Custom Case';
        return {
            id: 'custom-' + this._nextItemId,
            caseId: 'custom-' + this._nextItemId,
            name: name,
            cat: 'Custom',
            l: parseFloat(document.getElementById('tp-cc-l').value) || 1.0,
            w: parseFloat(document.getElementById('tp-cc-w').value) || 0.6,
            h: parseFloat(document.getElementById('tp-cc-h').value) || 0.5,
            weight: parseFloat(document.getElementById('tp-cc-wt').value) || 30,
            color: document.getElementById('tp-cc-color').value || '#06b6d4',
            stackable: document.getElementById('tp-cc-stackable').checked,
            fragile: document.getElementById('tp-cc-fragile').checked,
            maxStack: parseFloat(document.getElementById('tp-cc-maxstack').value) || 150,
        };
    },

    _addCustomCase() {
        const item = this._getCustomCaseFromModal();
        this._addCustomToLoad(item);
        UI.closeModal();
    },

    _saveCustomToLibrary() {
        const item = this._getCustomCaseFromModal();
        this._caseLibrary.push(item);
        this._persistCustomCases();
        // Refresh library
        const grid = document.getElementById('tp-lib-grid');
        if (grid) grid.innerHTML = this._renderLibrary('all');
        // Reset filter buttons
        document.querySelectorAll('#tp-cat-filters .tp-filter-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
        UI.toast(`"${item.name}" saved to library`, 'success');
        UI.closeModal();
    },

    _persistCustomCases() {
        try {
            // Save only user-added cases (those not in the original library by id)
            const builtinIds = new Set(['megapointe','spiider','ledbeam150','robin-t1','bmfl','pixeline','libra','colorstrike',
                'mac-aura','sharpy-plus','impression-x5','atomic3000','led-par-8way','source4',
                'gma3-full','gma3-light','gma3-compact','gma2-full','digico-sd7','digico-sd12','digico-sd5',
                'midas-m32','yamaha-cl5','yamaha-tf5','avid-s6l','allen-sq7','stage-box','spkr-jbl','amp-rack','sub-jbl',
                'led-6pack','proj-case','camera-case','novastar-proc',
                'movecat-250','movecat-500','movecat-1000','rigging-hw','shackle-case',
                'cable-trunk','power-distro','socapex-case','dmx-case',
                'rc-small','rc-medium','rc-large','pelican-1650']);
            const custom = this._caseLibrary.filter(c => !builtinIds.has(c.id));
            localStorage.setItem('luxor_truckpack_cases', JSON.stringify(custom));
        } catch (_) {}
    },

    _restoreCustomCases() {
        try {
            const json = localStorage.getItem('luxor_truckpack_cases');
            if (!json) return;
            const custom = JSON.parse(json);
            if (Array.isArray(custom) && custom.length) {
                // Add custom cases that aren't already in the library
                const existingIds = new Set(this._caseLibrary.map(c => c.id));
                for (const c of custom) {
                    if (!existingIds.has(c.id)) {
                        this._caseLibrary.push(c);
                    }
                }
            }
        } catch (_) {}
    },

    // ================================================================
    // EXPORT
    // ================================================================
    _showExportMenu() {
        const body = `
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="btn" onclick="TruckPackPage._exportJSON();UI.closeModal();"><i class="fas fa-file-code"></i> Export Load Plan (JSON)</button>
                <button class="btn" onclick="TruckPackPage._exportCSV();UI.closeModal();"><i class="fas fa-file-csv"></i> Export Load Plan (CSV)</button>
                <button class="btn" onclick="TruckPackPage._screenshotPNG();UI.closeModal();"><i class="fas fa-image"></i> Export 3D Screenshot (PNG)</button>
                <button class="btn" onclick="TruckPackPage._exportHTMLReport();UI.closeModal();"><i class="fas fa-print"></i> Print Report (HTML)</button>
            </div>
        `;
        UI.openModal('Export', body, '<button class="btn" onclick="UI.closeModal()">Close</button>');
    },

    _exportJSON() {
        const data = {
            truck: { ...this._truck },
            loadItems: this._loadItems.map(i => ({ name: i.name, l: i.l, w: i.w, h: i.h, weight: i.weight, qty: i.qty, color: i.color, stackable: i.stackable, fragile: i.fragile, maxStack: i.maxStack })),
            packedItems: this._packedItems.map(p => ({ name: p.name, l: p.l, w: p.w, h: p.h, weight: p.weight, color: p.color, px: p.px, py: p.py, pz: p.pz, pl: p.pl, pw: p.pw, ph: p.ph })),
            overflow: this._overflow.map(o => ({ name: o.name, l: o.l, w: o.w, h: o.h, weight: o.weight })),
            stats: this._getStats(),
            exportDate: new Date().toISOString(),
        };
        UI.exportFile('truck-load-plan.json', JSON.stringify(data, null, 2), [{ name: 'JSON', extensions: ['json'] }]);
    },

    _exportCSV() {
        let csv = 'Item,Qty,L(m),W(m),H(m),Weight(kg),PosX,PosY,PosZ,Status\n';
        this._packedItems.forEach(p => {
            csv += `"${p.name}",1,${p.pl.toFixed(3)},${p.pw.toFixed(3)},${p.ph.toFixed(3)},${p.weight},${p.px.toFixed(3)},${p.py.toFixed(3)},${p.pz.toFixed(3)},Packed\n`;
        });
        this._overflow.forEach(o => {
            csv += `"${o.name}",1,${o.l.toFixed(3)},${o.w.toFixed(3)},${o.h.toFixed(3)},${o.weight},,,, Overflow\n`;
        });
        UI.exportFile('truck-load-plan.csv', csv, [{ name: 'CSV', extensions: ['csv'] }]);
    },

    _exportHTMLReport() {
        const s = this._getStats();
        const t = this._truck;
        let rows = '';
        this._packedItems.forEach((p, i) => {
            rows += `<tr><td>${i + 1}</td><td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${p.color};vertical-align:middle;margin-right:6px;"></span>${p.name}</td><td>${p.pl.toFixed(2)}\u00d7${p.pw.toFixed(2)}\u00d7${p.ph.toFixed(2)}</td><td>${p.weight} kg</td><td>(${p.px.toFixed(2)}, ${p.py.toFixed(2)}, ${p.pz.toFixed(2)})</td><td style="color:green;">Packed</td></tr>`;
        });
        this._overflow.forEach((o, i) => {
            rows += `<tr style="background:#fff0f0;"><td>${this._packedItems.length + i + 1}</td><td><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${o.color};vertical-align:middle;margin-right:6px;"></span>${o.name}</td><td>${o.l.toFixed(2)}\u00d7${o.w.toFixed(2)}\u00d7${o.h.toFixed(2)}</td><td>${o.weight} kg</td><td>--</td><td style="color:red;">Overflow</td></tr>`;
        });

        // Get screenshot data if available
        let screenshotHtml = '';
        if (this._renderer) {
            this._renderer.render(this._scene, this._camera);
            const img = this._renderer.domElement.toDataURL('image/png');
            screenshotHtml = `<div style="text-align:center;margin:20px 0;"><img src="${img}" style="max-width:100%;border:1px solid #ddd;border-radius:8px;" /></div>`;
        }

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Truck Load Plan</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; color: #1e293b; }
            h1 { font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
            .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
            .stat-box .val { font-size: 22px; font-weight: 800; color: #0ea5e9; }
            .stat-box .lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
            th { background: #f1f5f9; font-weight: 600; }
            .meta { font-size: 12px; color: #94a3b8; margin-top: 30px; }
            @media print { body { margin: 0; } }
        </style></head><body>
            <h1>Truck Load Plan</h1>
            <p style="color:#64748b;">Truck: ${t.l}m \u00d7 ${t.w}m \u00d7 ${t.h}m &mdash; Weight limit: ${t.weightLimit} kg</p>
            <div class="stats">
                <div class="stat-box"><div class="val">${s.totalItems}</div><div class="lbl">Total Items</div></div>
                <div class="stat-box"><div class="val">${s.totalWeight.toFixed(0)} kg</div><div class="lbl">Total Weight</div></div>
                <div class="stat-box"><div class="val">${s.totalVol.toFixed(2)} m\u00b3</div><div class="lbl">Volume Used</div></div>
                <div class="stat-box"><div class="val">${s.efficiency.toFixed(1)}%</div><div class="lbl">Efficiency</div></div>
            </div>
            ${screenshotHtml}
            <table>
                <thead><tr><th>#</th><th>Item</th><th>Dimensions</th><th>Weight</th><th>Position</th><th>Status</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="meta">Generated ${new Date().toLocaleString()} &mdash; Luxor Production Truck Packer</div>
        </body></html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    },

    // ================================================================
    // IMPORT
    // ================================================================
    _importJSON() {
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <p style="font-size:12px;color:var(--text-secondary);">Import inventory from JSON or CSV file.</p>
                <div class="form-group">
                    <label class="form-label">Paste JSON or CSV</label>
                    <textarea class="form-control" id="tp-import-text" rows="10" placeholder='JSON: [{"name":"Case","l":1.2,"w":0.6,"h":0.5,"weight":30,"qty":2}]\nCSV: Name,Length,Width,Height,Weight,Quantity' style="font-family:monospace;font-size:11px;"></textarea>
                </div>
                <div style="font-size:10px;color:var(--text-muted);">
                    <strong>JSON format:</strong> Array of objects with: name, l, w, h, weight, qty (optional: color, stackable, fragile, maxStack)<br>
                    <strong>CSV format:</strong> Header row: Name,Length,Width,Height,Weight,Quantity
                </div>
            </div>
        `;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="TruckPackPage._doImport()">Import</button>
        `;
        UI.openModal('Import Inventory', body, footer);
    },

    _doImport() {
        const raw = document.getElementById('tp-import-text').value.trim();
        if (!raw) { UI.toast('Nothing to import', 'warning'); return; }

        try {
            // Try JSON first
            if (raw.startsWith('[') || raw.startsWith('{')) {
                let data = JSON.parse(raw);
                if (!Array.isArray(data)) {
                    // Could be full export with loadItems
                    if (data.loadItems) data = data.loadItems;
                    else data = [data];
                }
                let count = 0;
                data.forEach(item => {
                    const l = parseFloat(item.l || item.length || item.Length) || 1;
                    const w = parseFloat(item.w || item.width || item.Width) || 0.6;
                    const h = parseFloat(item.h || item.height || item.Height) || 0.5;
                    const weight = parseFloat(item.weight || item.Weight) || 20;
                    const qty = parseInt(item.qty || item.quantity || item.Quantity) || 1;
                    const name = item.name || item.Name || 'Imported Case';

                    this._loadItems.push({
                        id: 'import-' + this._nextItemId,
                        caseId: 'import-' + this._nextItemId,
                        uid: this._nextItemId++,
                        name, cat: 'Imported', l, w, h, weight, qty,
                        color: item.color || '#06b6d4',
                        stackable: item.stackable !== false,
                        fragile: !!item.fragile,
                        maxStack: item.maxStack || 200,
                    });
                    count++;
                });
                this._refreshLoadUI();
                UI.toast(`Imported ${count} item(s) from JSON`, 'success');
                UI.closeModal();
                return;
            }

            // Try CSV
            const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) { UI.toast('CSV needs header + data rows', 'error'); return; }

            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
            const nameIdx = header.findIndex(h => h.includes('name'));
            const lIdx = header.findIndex(h => h.includes('length') || h === 'l');
            const wIdx = header.findIndex(h => h.includes('width') || h === 'w');
            const hIdx = header.findIndex(h => h.includes('height') || h === 'h');
            const wtIdx = header.findIndex(h => h.includes('weight'));
            const qIdx = header.findIndex(h => h.includes('qty') || h.includes('quantity'));

            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                const name = nameIdx >= 0 ? cols[nameIdx] : `Item ${i}`;
                const l = lIdx >= 0 ? parseFloat(cols[lIdx]) || 1 : 1;
                const w = wIdx >= 0 ? parseFloat(cols[wIdx]) || 0.6 : 0.6;
                const h = hIdx >= 0 ? parseFloat(cols[hIdx]) || 0.5 : 0.5;
                const weight = wtIdx >= 0 ? parseFloat(cols[wtIdx]) || 20 : 20;
                const qty = qIdx >= 0 ? parseInt(cols[qIdx]) || 1 : 1;

                this._loadItems.push({
                    id: 'import-' + this._nextItemId,
                    caseId: 'import-' + this._nextItemId,
                    uid: this._nextItemId++,
                    name, cat: 'Imported', l, w, h, weight, qty,
                    color: '#06b6d4',
                    stackable: true, fragile: false, maxStack: 200,
                });
                count++;
            }
            this._refreshLoadUI();
            UI.toast(`Imported ${count} item(s) from CSV`, 'success');
            UI.closeModal();

        } catch (e) {
            UI.toast('Import failed: ' + e.message, 'error');
        }
    },

    // ================================================================
    // CLEAR ALL
    // ================================================================
    _clearAll() {
        this._loadItems = [];
        this._packedItems = [];
        this._overflow = [];
        this._selectedPackedIdx = -1;
        this._refreshLoadUI();
        this._build3D();
        this._persistState();
        UI.toast('Load cleared', 'info');
    },

    // ================================================================
    // PERSISTENCE — save/restore to localStorage
    // ================================================================
    _persistState() {
        try {
            const state = {
                truck: this._truck,
                loadItems: this._loadItems.map(i => ({
                    name: i.name, caseId: i.caseId, l: i.l, w: i.w, h: i.h,
                    weight: i.weight, qty: i.qty, color: i.color, cat: i.cat,
                    stackable: i.stackable, fragile: i.fragile, maxStack: i.maxStack
                })),
                nextItemId: this._nextItemId,
            };
            localStorage.setItem('luxor_truckpack', JSON.stringify(state));
        } catch (_) {}
    },

    _restoreState() {
        try {
            const json = localStorage.getItem('luxor_truckpack');
            if (!json) return false;
            const state = JSON.parse(json);
            if (state.truck) {
                this._truck = { ...this._truck, ...state.truck };
                // Update UI selectors
                const presetEl = document.getElementById('tp-preset');
                if (presetEl) presetEl.value = this._truck.preset || 'my-truck';
                const lEl = document.getElementById('tp-length');
                const wEl = document.getElementById('tp-width');
                const hEl = document.getElementById('tp-height');
                const wlEl = document.getElementById('tp-weight-limit');
                if (lEl) lEl.value = this._truck.l;
                if (wEl) wEl.value = this._truck.w;
                if (hEl) hEl.value = this._truck.h;
                if (wlEl) wlEl.value = this._truck.weightLimit;
            }
            if (state.loadItems && state.loadItems.length) {
                this._loadItems = state.loadItems.map(i => ({
                    ...i, uid: this._nextItemId++
                }));
            }
            if (state.nextItemId) this._nextItemId = Math.max(this._nextItemId, state.nextItemId);
            return this._loadItems.length > 0;
        } catch (_) { return false; }
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    onActivate() {
        setTimeout(() => {
            this._restoreCustomCases();
            const restored = this._restoreState();
            this._init3D();
            if (restored) {
                this._refreshLoadUI();
                UI.toast('Previous load restored', 'info');
            }
            // Re-render library grid to include any restored custom cases
            const grid = document.getElementById('tp-lib-grid');
            if (grid) grid.innerHTML = this._renderLibrary('all');
        }, 50);
    },

    onDeactivate() {
        this._persistState();
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        this._dispose3D();
    },
};
