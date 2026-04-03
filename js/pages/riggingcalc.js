/**
 * Rigging Calculator Page — Bridle, dead hang, beam loading & sling capacity tools
 * Physics-based calculations for entertainment rigging safety
 * Luxor Production
 */
const RiggingCalcPage = {

    // ================================================================
    // STATE
    // ================================================================
    _units: 'metric', // 'metric' or 'imperial'
    _savedCalcs: [],
    _activeTab: 'bridle',

    // Conversion factors
    _KG_TO_LBS: 2.20462,
    _M_TO_FT: 3.28084,
    _LBS_TO_KG: 0.453592,
    _FT_TO_M: 0.3048,

    // Sling capacity lookup (WLL in kg at various angles)
    _SLING_TABLE: [
        { type: 'Round Sling 1T',  color: '#a855f7', wll_0: 1000, wll_30: 866, wll_45: 707, wll_60: 500 },
        { type: 'Round Sling 2T',  color: '#8b5cf6', wll_0: 2000, wll_30: 1732, wll_45: 1414, wll_60: 1000 },
        { type: 'Round Sling 3T',  color: '#7c3aed', wll_0: 3000, wll_30: 2598, wll_45: 2121, wll_60: 1500 },
        { type: 'Round Sling 5T',  color: '#6d28d9', wll_0: 5000, wll_30: 4330, wll_45: 3536, wll_60: 2500 },
        { type: 'Wire Rope 8mm',   color: '#64748b', wll_0: 640,  wll_30: 554,  wll_45: 452,  wll_60: 320 },
        { type: 'Wire Rope 10mm',  color: '#475569', wll_0: 1000, wll_30: 866,  wll_45: 707,  wll_60: 500 },
        { type: 'Wire Rope 12mm',  color: '#334155', wll_0: 1500, wll_30: 1299, wll_45: 1061, wll_60: 750 },
        { type: 'Wire Rope 16mm',  color: '#1e293b', wll_0: 2600, wll_30: 2252, wll_45: 1838, wll_60: 1300 },
        { type: 'Chain 8mm Gr80',  color: '#f97316', wll_0: 2000, wll_30: 1732, wll_45: 1414, wll_60: 1000 },
        { type: 'Chain 10mm Gr80', color: '#ea580c', wll_0: 3150, wll_30: 2728, wll_45: 2227, wll_60: 1575 },
        { type: 'Chain 13mm Gr80', color: '#c2410c', wll_0: 5300, wll_30: 4591, wll_45: 3748, wll_60: 2650 },
    ],

    // ================================================================
    // CSS INJECTION
    // ================================================================
    _injectCSS() {
        if (document.getElementById('riggingcalc-css')) return;
        const style = document.createElement('style');
        style.id = 'riggingcalc-css';
        style.textContent = `
            .rig-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
            .rig-tab { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
            .rig-tab:hover { background: var(--bg-tertiary); color: var(--text-primary); }
            .rig-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
            .rig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .rig-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
            .rig-full { grid-column: 1 / -1; }
            .rig-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
            .rig-card-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
            .rig-card-header h3 { font-size: 13px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; }
            .rig-card-body { padding: 16px; }
            .rig-input-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
            .rig-input-row label { font-size: 11px; color: var(--text-muted); min-width: 140px; flex-shrink: 0; }
            .rig-input-row input { width: 120px; }
            .rig-input-row .rig-unit { font-size: 10px; color: var(--text-muted); min-width: 30px; }
            .rig-result { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; }
            .rig-result-label { font-size: 11px; color: var(--text-muted); min-width: 160px; }
            .rig-result-value { font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
            .rig-safety { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
            .rig-safety-green { background: rgba(34,197,94,0.15); color: #22c55e; }
            .rig-safety-yellow { background: rgba(234,179,8,0.15); color: #eab308; }
            .rig-safety-red { background: rgba(239,68,68,0.15); color: #ef4444; }
            .rig-svg-wrap { display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.15); border-radius: 8px; min-height: 200px; }
            .rig-sling-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .rig-sling-table th { padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); border-bottom: 2px solid var(--border); }
            .rig-sling-table td { padding: 7px 10px; border-bottom: 1px solid var(--border); }
            .rig-sling-table tr:hover { background: rgba(255,255,255,0.03); }
            .rig-sling-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; vertical-align: middle; }
            .rig-toggle { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
            .rig-toggle-btn { padding: 4px 12px; font-size: 11px; font-weight: 600; cursor: pointer; background: var(--bg-secondary); color: var(--text-muted); border: none; transition: all 0.15s; }
            .rig-toggle-btn.active { background: var(--accent); color: #fff; }
            .rig-beam-point { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid var(--border); }
            .rig-beam-point input { width: 90px; }
            .rig-beam-point label { font-size: 10px; color: var(--text-muted); min-width: 60px; }
            .rig-saved-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
            .rig-saved-item:hover { background: rgba(255,255,255,0.04); }
            .rig-saved-item:last-child { border-bottom: none; }
            .rig-saved-icon { font-size: 14px; color: var(--accent); }
            .rig-saved-info { flex: 1; min-width: 0; }
            .rig-saved-name { font-size: 11px; font-weight: 600; }
            .rig-saved-detail { font-size: 9px; color: var(--text-muted); margin-top: 2px; }
            @media (max-width: 900px) {
                .rig-grid, .rig-grid-3 { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    },

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        this._injectCSS();
        return `
        <div class="section-header">
            <h2><i class="fas fa-drafting-compass"></i> Rigging Calculator</h2>
            <div class="flex gap-sm">
                <div class="rig-toggle">
                    <button class="rig-toggle-btn ${this._units === 'metric' ? 'active' : ''}" onclick="RiggingCalcPage._setUnits('metric')">Metric (kg/m)</button>
                    <button class="rig-toggle-btn ${this._units === 'imperial' ? 'active' : ''}" onclick="RiggingCalcPage._setUnits('imperial')">Imperial (lbs/ft)</button>
                </div>
                <button class="btn btn-sm" onclick="RiggingCalcPage._showSaved()"><i class="fas fa-save"></i> Saved</button>
            </div>
        </div>

        <div class="rig-tabs">
            <button class="rig-tab ${this._activeTab === 'bridle' ? 'active' : ''}" onclick="RiggingCalcPage._setTab('bridle')"><i class="fas fa-project-diagram"></i> Bridle</button>
            <button class="rig-tab ${this._activeTab === 'deadhang' ? 'active' : ''}" onclick="RiggingCalcPage._setTab('deadhang')"><i class="fas fa-arrows-alt-v"></i> Dead Hang</button>
            <button class="rig-tab ${this._activeTab === 'beam' ? 'active' : ''}" onclick="RiggingCalcPage._setTab('beam')"><i class="fas fa-ruler-horizontal"></i> Beam Loading</button>
            <button class="rig-tab ${this._activeTab === 'sling' ? 'active' : ''}" onclick="RiggingCalcPage._setTab('sling')"><i class="fas fa-link"></i> Sling Capacity</button>
        </div>

        <div id="rig-content">
            ${this._renderTab()}
        </div>
        `;
    },

    _renderTab() {
        switch (this._activeTab) {
            case 'bridle':   return this._renderBridle();
            case 'deadhang': return this._renderDeadHang();
            case 'beam':     return this._renderBeam();
            case 'sling':    return this._renderSlingTable();
            default:         return '';
        }
    },

    // ================================================================
    // BRIDLE CALCULATOR
    // ================================================================
    _renderBridle() {
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';
        return `
        <div class="rig-grid">
            <div class="rig-card">
                <div class="rig-card-header"><h3><i class="fas fa-project-diagram"></i> Bridle Input</h3></div>
                <div class="rig-card-body">
                    <div class="rig-input-row">
                        <label>Sling Length</label>
                        <input type="number" class="form-control" id="rig-br-sling" value="3" min="0.1" step="0.1" oninput="RiggingCalcPage._calcBridle()">
                        <span class="rig-unit">${lU}</span>
                    </div>
                    <div class="rig-input-row">
                        <label>Spread Distance</label>
                        <input type="number" class="form-control" id="rig-br-spread" value="2" min="0.1" step="0.1" oninput="RiggingCalcPage._calcBridle()">
                        <span class="rig-unit">${lU}</span>
                    </div>
                    <div class="rig-input-row">
                        <label>Load Weight</label>
                        <input type="number" class="form-control" id="rig-br-weight" value="500" min="1" step="1" oninput="RiggingCalcPage._calcBridle()">
                        <span class="rig-unit">${wU}</span>
                    </div>
                    <div class="rig-input-row">
                        <label>Sling WLL</label>
                        <input type="number" class="form-control" id="rig-br-wll" value="2000" min="1" step="1" oninput="RiggingCalcPage._calcBridle()">
                        <span class="rig-unit">${wU}</span>
                    </div>
                    <div style="margin-top:12px">
                        <button class="btn btn-sm btn-primary" onclick="RiggingCalcPage._saveBridle()"><i class="fas fa-save"></i> Save Calculation</button>
                    </div>
                </div>
            </div>

            <div class="rig-card">
                <div class="rig-card-header"><h3><i class="fas fa-chart-bar"></i> Results</h3></div>
                <div class="rig-card-body" id="rig-br-results">
                    ${this._calcBridleHTML()}
                </div>
            </div>

            <div class="rig-card rig-full">
                <div class="rig-card-header"><h3><i class="fas fa-draw-polygon"></i> Bridle Diagram</h3></div>
                <div class="rig-card-body">
                    <div class="rig-svg-wrap" id="rig-br-diagram">
                        ${this._renderBridleSVG()}
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    _calcBridle() {
        const el = document.getElementById('rig-br-results');
        if (el) el.innerHTML = this._calcBridleHTML();
        const diag = document.getElementById('rig-br-diagram');
        if (diag) diag.innerHTML = this._renderBridleSVG();
    },

    _calcBridleHTML() {
        const slingLen = parseFloat(document.getElementById('rig-br-sling')?.value) || 3;
        const spread   = parseFloat(document.getElementById('rig-br-spread')?.value) || 2;
        const weight   = parseFloat(document.getElementById('rig-br-weight')?.value) || 500;
        const wll      = parseFloat(document.getElementById('rig-br-wll')?.value) || 2000;

        const wU = this._units === 'metric' ? 'kg' : 'lbs';

        // Validate: spread must be less than 2 * sling length
        if (spread >= 2 * slingLen) {
            return '<div class="text-muted" style="text-align:center;padding:20px">Spread distance must be less than 2 x sling length</div>';
        }

        // Included angle: theta = 2 * arcsin(spread / (2 * sling_length))
        const halfAngle = Math.asin(spread / (2 * slingLen));
        const theta = 2 * halfAngle;
        const thetaDeg = theta * (180 / Math.PI);

        // Tension per leg: T = W / (2 * cos(theta/2))
        const tension = weight / (2 * Math.cos(halfAngle));

        // Safety factor
        const sf = wll / tension;
        const sfClass = sf >= 8 ? 'green' : sf >= 5 ? 'yellow' : 'red';

        // Vertical height of bridle
        const vertHeight = Math.sqrt(slingLen * slingLen - (spread / 2) * (spread / 2));
        const lU = this._units === 'metric' ? 'm' : 'ft';

        return `
            <div class="rig-result">
                <span class="rig-result-label">Included Angle</span>
                <span class="rig-result-value">${thetaDeg.toFixed(1)}&deg;</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Tension per Leg</span>
                <span class="rig-result-value">${tension.toFixed(1)} ${wU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Vertical Height</span>
                <span class="rig-result-value">${vertHeight.toFixed(2)} ${lU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Safety Factor</span>
                <span class="rig-safety rig-safety-${sfClass}">${sf.toFixed(1)} : 1</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Status</span>
                <span class="rig-safety rig-safety-${sfClass}">
                    <i class="fas fa-${sf >= 5 ? 'check-circle' : 'exclamation-triangle'}"></i>
                    ${sf >= 8 ? 'SAFE' : sf >= 5 ? 'CAUTION' : 'DANGER'}
                </span>
            </div>
        `;
    },

    _renderBridleSVG() {
        const slingLen = parseFloat(document.getElementById('rig-br-sling')?.value) || 3;
        const spread   = parseFloat(document.getElementById('rig-br-spread')?.value) || 2;
        const weight   = parseFloat(document.getElementById('rig-br-weight')?.value) || 500;

        if (spread >= 2 * slingLen) {
            return '<svg viewBox="0 0 400 250" style="max-width:500px;width:100%"><text x="200" y="125" text-anchor="middle" fill="var(--text-muted)" font-size="12">Invalid geometry</text></svg>';
        }

        const halfAngle = Math.asin(spread / (2 * slingLen));
        const thetaDeg = (2 * halfAngle * 180 / Math.PI).toFixed(1);
        const vertHeight = Math.sqrt(slingLen * slingLen - (spread / 2) * (spread / 2));
        const tension = weight / (2 * Math.cos(halfAngle));

        // SVG coordinates: center top = support beam, bottom center = load
        const svgW = 400, svgH = 250;
        const cx = svgW / 2;
        const topY = 30;
        const halfSpreadPx = 120;
        const heightPx = 160;

        const leftX = cx - halfSpreadPx;
        const rightX = cx + halfSpreadPx;
        const bottomY = topY + heightPx;

        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';

        return `
        <svg viewBox="0 0 ${svgW} ${svgH}" style="max-width:500px;width:100%">
            <!-- Support beam -->
            <line x1="${leftX - 20}" y1="${topY}" x2="${rightX + 20}" y2="${topY}" stroke="var(--text-muted)" stroke-width="3" stroke-linecap="round"/>
            <!-- Support points -->
            <circle cx="${leftX}" cy="${topY}" r="5" fill="var(--accent)"/>
            <circle cx="${rightX}" cy="${topY}" r="5" fill="var(--accent)"/>
            <!-- Slings -->
            <line x1="${leftX}" y1="${topY}" x2="${cx}" y2="${bottomY}" stroke="#a855f7" stroke-width="2.5"/>
            <line x1="${rightX}" y1="${topY}" x2="${cx}" y2="${bottomY}" stroke="#a855f7" stroke-width="2.5"/>
            <!-- Load point -->
            <circle cx="${cx}" cy="${bottomY}" r="7" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
            <!-- Angle arc -->
            <path d="M ${cx - 25} ${bottomY - 35} A 35 35 0 0 1 ${cx + 25} ${bottomY - 35}" fill="none" stroke="#eab308" stroke-width="1.5" stroke-dasharray="3,2"/>
            <!-- Labels -->
            <text x="${cx}" y="${bottomY + 20}" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="700">${weight} ${wU}</text>
            <text x="${cx}" y="${bottomY - 40}" text-anchor="middle" fill="#eab308" font-size="10" font-weight="600">${thetaDeg}&deg;</text>
            <text x="${(leftX + cx) / 2 - 15}" y="${(topY + bottomY) / 2}" text-anchor="middle" fill="#a855f7" font-size="10">${tension.toFixed(0)} ${wU}</text>
            <text x="${(rightX + cx) / 2 + 15}" y="${(topY + bottomY) / 2}" text-anchor="middle" fill="#a855f7" font-size="10">${tension.toFixed(0)} ${wU}</text>
            <!-- Dimension: spread -->
            <line x1="${leftX}" y1="${topY - 12}" x2="${rightX}" y2="${topY - 12}" stroke="var(--text-muted)" stroke-width="0.5" marker-start="url(#rig-arrowL)" marker-end="url(#rig-arrowR)"/>
            <text x="${cx}" y="${topY - 16}" text-anchor="middle" fill="var(--text-muted)" font-size="9">${spread} ${lU} spread</text>
            <!-- Arrow markers -->
            <defs>
                <marker id="rig-arrowL" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6" fill="none" stroke="var(--text-muted)" stroke-width="0.8"/></marker>
                <marker id="rig-arrowR" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--text-muted)" stroke-width="0.8"/></marker>
            </defs>
        </svg>
        `;
    },

    _saveBridle() {
        const slingLen = parseFloat(document.getElementById('rig-br-sling')?.value) || 3;
        const spread   = parseFloat(document.getElementById('rig-br-spread')?.value) || 2;
        const weight   = parseFloat(document.getElementById('rig-br-weight')?.value) || 500;
        const wll      = parseFloat(document.getElementById('rig-br-wll')?.value) || 2000;
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';

        if (spread >= 2 * slingLen) { UI.toast('Invalid geometry', 'error'); return; }
        const halfAngle = Math.asin(spread / (2 * slingLen));
        const tension = weight / (2 * Math.cos(halfAngle));
        const sf = wll / tension;

        this._savedCalcs.push({
            id: Date.now().toString(36),
            type: 'bridle',
            date: new Date().toISOString(),
            summary: `Bridle: ${weight}${wU} @ ${spread}${lU} spread`,
            data: { slingLen, spread, weight, wll, units: this._units },
            result: { angle: (2 * halfAngle * 180 / Math.PI).toFixed(1), tension: tension.toFixed(1), sf: sf.toFixed(1) }
        });
        this._persistSaved();
        UI.toast('Bridle calculation saved', 'success');
    },

    // ================================================================
    // DEAD HANG CALCULATOR
    // ================================================================
    _renderDeadHang() {
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        return `
        <div class="rig-grid">
            <div class="rig-card">
                <div class="rig-card-header"><h3><i class="fas fa-arrows-alt-v"></i> Dead Hang Input</h3></div>
                <div class="rig-card-body">
                    <div class="rig-input-row">
                        <label>Total Load Weight</label>
                        <input type="number" class="form-control" id="rig-dh-weight" value="1000" min="1" step="1" oninput="RiggingCalcPage._calcDeadHang()">
                        <span class="rig-unit">${wU}</span>
                    </div>
                    <div class="rig-input-row">
                        <label>Number of Pickup Points</label>
                        <input type="number" class="form-control" id="rig-dh-points" value="4" min="1" max="50" step="1" oninput="RiggingCalcPage._calcDeadHang()">
                        <span class="rig-unit">pts</span>
                    </div>
                    <div class="rig-input-row">
                        <label>Span Length</label>
                        <input type="number" class="form-control" id="rig-dh-span" value="12" min="0.1" step="0.1" oninput="RiggingCalcPage._calcDeadHang()">
                        <span class="rig-unit">${this._units === 'metric' ? 'm' : 'ft'}</span>
                    </div>
                    <div class="rig-input-row">
                        <label>Motor/Point WLL</label>
                        <input type="number" class="form-control" id="rig-dh-wll" value="1000" min="1" step="1" oninput="RiggingCalcPage._calcDeadHang()">
                        <span class="rig-unit">${wU}</span>
                    </div>
                    <div style="margin-top:12px">
                        <button class="btn btn-sm btn-primary" onclick="RiggingCalcPage._saveDeadHang()"><i class="fas fa-save"></i> Save Calculation</button>
                    </div>
                </div>
            </div>

            <div class="rig-card">
                <div class="rig-card-header"><h3><i class="fas fa-chart-bar"></i> Results</h3></div>
                <div class="rig-card-body" id="rig-dh-results">
                    ${this._calcDeadHangHTML()}
                </div>
            </div>
        </div>
        `;
    },

    _calcDeadHang() {
        const el = document.getElementById('rig-dh-results');
        if (el) el.innerHTML = this._calcDeadHangHTML();
    },

    _calcDeadHangHTML() {
        const weight = parseFloat(document.getElementById('rig-dh-weight')?.value) || 1000;
        const points = parseInt(document.getElementById('rig-dh-points')?.value) || 4;
        const span   = parseFloat(document.getElementById('rig-dh-span')?.value) || 12;
        const wll    = parseFloat(document.getElementById('rig-dh-wll')?.value) || 1000;
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';

        const loadPerPoint = weight / points;
        const sf = wll / loadPerPoint;
        const sfClass = sf >= 8 ? 'green' : sf >= 5 ? 'yellow' : 'red';
        const spacing = points > 1 ? span / (points - 1) : span;

        return `
            <div class="rig-result">
                <span class="rig-result-label">Load per Point</span>
                <span class="rig-result-value">${loadPerPoint.toFixed(1)} ${wU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Point Spacing</span>
                <span class="rig-result-value">${points > 1 ? spacing.toFixed(2) : '--'} ${lU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Safety Factor</span>
                <span class="rig-safety rig-safety-${sfClass}">${sf.toFixed(1)} : 1</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Total Capacity (all pts)</span>
                <span class="rig-result-value">${(wll * points).toFixed(0)} ${wU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Utilization</span>
                <span class="rig-result-value">${((weight / (wll * points)) * 100).toFixed(1)}%</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Status</span>
                <span class="rig-safety rig-safety-${sfClass}">
                    <i class="fas fa-${sf >= 5 ? 'check-circle' : 'exclamation-triangle'}"></i>
                    ${sf >= 8 ? 'SAFE' : sf >= 5 ? 'CAUTION' : 'DANGER'}
                </span>
            </div>
        `;
    },

    _saveDeadHang() {
        const weight = parseFloat(document.getElementById('rig-dh-weight')?.value) || 1000;
        const points = parseInt(document.getElementById('rig-dh-points')?.value) || 4;
        const wll    = parseFloat(document.getElementById('rig-dh-wll')?.value) || 1000;
        const wU = this._units === 'metric' ? 'kg' : 'lbs';

        const loadPerPoint = weight / points;
        const sf = wll / loadPerPoint;

        this._savedCalcs.push({
            id: Date.now().toString(36),
            type: 'deadhang',
            date: new Date().toISOString(),
            summary: `Dead Hang: ${weight}${wU} on ${points} points`,
            data: { weight, points, wll, units: this._units },
            result: { loadPerPoint: loadPerPoint.toFixed(1), sf: sf.toFixed(1) }
        });
        this._persistSaved();
        UI.toast('Dead hang calculation saved', 'success');
    },

    // ================================================================
    // BEAM LOADING CALCULATOR
    // ================================================================
    _beamPoints: [{ position: 3, load: 500 }],

    _renderBeam() {
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';
        const pointRows = this._beamPoints.map((p, i) => `
            <div class="rig-beam-point">
                <label>Pos</label>
                <input type="number" class="form-control" value="${p.position}" min="0" step="0.1" oninput="RiggingCalcPage._updateBeamPoint(${i},'position',this.value)">
                <span class="rig-unit">${lU}</span>
                <label>Load</label>
                <input type="number" class="form-control" value="${p.load}" min="0" step="1" oninput="RiggingCalcPage._updateBeamPoint(${i},'load',this.value)">
                <span class="rig-unit">${wU}</span>
                <button class="btn-icon" onclick="RiggingCalcPage._removeBeamPoint(${i})" title="Remove"><i class="fas fa-times" style="font-size:10px;color:var(--red)"></i></button>
            </div>
        `).join('');

        return `
        <div class="rig-grid">
            <div class="rig-card">
                <div class="rig-card-header">
                    <h3><i class="fas fa-ruler-horizontal"></i> Beam Input</h3>
                    <button class="btn btn-xs btn-primary" onclick="RiggingCalcPage._addBeamPoint()"><i class="fas fa-plus"></i> Add Load</button>
                </div>
                <div class="rig-card-body">
                    <div class="rig-input-row">
                        <label>Beam Span</label>
                        <input type="number" class="form-control" id="rig-bm-span" value="12" min="0.1" step="0.1" oninput="RiggingCalcPage._calcBeam()">
                        <span class="rig-unit">${lU}</span>
                    </div>
                    <p style="font-size:10px;color:var(--text-muted);margin:8px 0 4px">Point Loads:</p>
                    <div id="rig-bm-points">${pointRows}</div>
                    <div style="margin-top:12px">
                        <button class="btn btn-sm btn-primary" onclick="RiggingCalcPage._saveBeam()"><i class="fas fa-save"></i> Save Calculation</button>
                    </div>
                </div>
            </div>

            <div class="rig-card">
                <div class="rig-card-header"><h3><i class="fas fa-chart-bar"></i> Results</h3></div>
                <div class="rig-card-body" id="rig-bm-results">
                    ${this._calcBeamHTML()}
                </div>
            </div>

            <div class="rig-card rig-full">
                <div class="rig-card-header"><h3><i class="fas fa-draw-polygon"></i> Beam Diagram</h3></div>
                <div class="rig-card-body">
                    <div class="rig-svg-wrap" id="rig-bm-diagram">
                        ${this._renderBeamSVG()}
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    _addBeamPoint() {
        const span = parseFloat(document.getElementById('rig-bm-span')?.value) || 12;
        this._beamPoints.push({ position: span / 2, load: 200 });
        this._refreshBeamUI();
    },

    _removeBeamPoint(i) {
        if (this._beamPoints.length <= 1) { UI.toast('Need at least one load point', 'error'); return; }
        this._beamPoints.splice(i, 1);
        this._refreshBeamUI();
    },

    _updateBeamPoint(i, field, val) {
        this._beamPoints[i][field] = parseFloat(val) || 0;
        this._calcBeam();
    },

    _calcBeam() {
        const el = document.getElementById('rig-bm-results');
        if (el) el.innerHTML = this._calcBeamHTML();
        const diag = document.getElementById('rig-bm-diagram');
        if (diag) diag.innerHTML = this._renderBeamSVG();
    },

    _refreshBeamUI() {
        const content = document.getElementById('rig-content');
        if (content) content.innerHTML = this._renderBeam();
    },

    _calcBeamHTML() {
        const L = parseFloat(document.getElementById('rig-bm-span')?.value) || 12;
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';
        const fU = this._units === 'metric' ? 'kg' : 'lbs';

        if (this._beamPoints.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px">Add at least one point load</div>';
        }

        // Simply supported beam: R1 = SUM(P * (L - a)) / L, R2 = SUM(P * a) / L
        let sumR1 = 0, sumR2 = 0;
        let maxMoment = 0;
        let maxMomentPos = 0;

        for (const p of this._beamPoints) {
            const a = Math.max(0, Math.min(p.position, L));
            sumR1 += p.load * (L - a) / L;
            sumR2 += p.load * a / L;
        }

        // Find max bending moment: check at each load point
        const checkPositions = this._beamPoints.map(p => Math.max(0, Math.min(p.position, L)));
        for (const x of checkPositions) {
            let moment = sumR1 * x;
            for (const p of this._beamPoints) {
                const a = Math.max(0, Math.min(p.position, L));
                if (a < x) {
                    moment -= p.load * (x - a);
                }
            }
            if (moment > maxMoment) {
                maxMoment = moment;
                maxMomentPos = x;
            }
        }

        const totalLoad = this._beamPoints.reduce((s, p) => s + p.load, 0);
        const momentUnit = this._units === 'metric' ? 'kg\u00B7m' : 'lb\u00B7ft';

        return `
            <div class="rig-result">
                <span class="rig-result-label">Reaction at Left (R1)</span>
                <span class="rig-result-value">${sumR1.toFixed(1)} ${fU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Reaction at Right (R2)</span>
                <span class="rig-result-value">${sumR2.toFixed(1)} ${fU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Total Load</span>
                <span class="rig-result-value">${totalLoad.toFixed(1)} ${wU}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Max Bending Moment</span>
                <span class="rig-result-value">${maxMoment.toFixed(1)} ${momentUnit}</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Max Moment Position</span>
                <span class="rig-result-value">${maxMomentPos.toFixed(2)} ${lU} from left</span>
            </div>
            <div class="rig-result">
                <span class="rig-result-label">Verification (R1+R2)</span>
                <span class="rig-result-value">${(sumR1 + sumR2).toFixed(1)} ${fU}</span>
            </div>
        `;
    },

    _renderBeamSVG() {
        const L = parseFloat(document.getElementById('rig-bm-span')?.value) || 12;
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const svgW = 500, svgH = 200;
        const margin = 50;
        const beamY = 100;
        const beamW = svgW - 2 * margin;

        const xScale = (pos) => margin + (pos / L) * beamW;

        // Calculate reactions
        let sumR1 = 0, sumR2 = 0;
        for (const p of this._beamPoints) {
            const a = Math.max(0, Math.min(p.position, L));
            sumR1 += p.load * (L - a) / L;
            sumR2 += p.load * a / L;
        }

        // Load arrows
        const arrows = this._beamPoints.map(p => {
            const x = xScale(Math.max(0, Math.min(p.position, L)));
            return `
                <line x1="${x}" y1="${beamY - 50}" x2="${x}" y2="${beamY - 5}" stroke="#ef4444" stroke-width="2" marker-end="url(#rig-arrowDown)"/>
                <text x="${x}" y="${beamY - 55}" text-anchor="middle" fill="#ef4444" font-size="9" font-weight="600">${p.load}${wU}</text>
            `;
        }).join('');

        // Reaction arrows
        const r1x = xScale(0);
        const r2x = xScale(L);

        return `
        <svg viewBox="0 0 ${svgW} ${svgH}" style="max-width:600px;width:100%">
            <defs>
                <marker id="rig-arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto"><path d="M0,0 L4,8 L8,0" fill="#ef4444"/></marker>
                <marker id="rig-arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto"><path d="M0,8 L4,0 L8,8" fill="#22c55e"/></marker>
            </defs>
            <!-- Beam -->
            <line x1="${margin}" y1="${beamY}" x2="${svgW - margin}" y2="${beamY}" stroke="var(--text-primary)" stroke-width="4" stroke-linecap="round"/>
            <!-- Supports -->
            <polygon points="${r1x - 10},${beamY + 5} ${r1x + 10},${beamY + 5} ${r1x},${beamY + 20}" fill="var(--accent)" opacity="0.6"/>
            <polygon points="${r2x - 10},${beamY + 5} ${r2x + 10},${beamY + 5} ${r2x},${beamY + 20}" fill="var(--accent)" opacity="0.6"/>
            <!-- Load arrows -->
            ${arrows}
            <!-- Reaction arrows -->
            <line x1="${r1x}" y1="${beamY + 50}" x2="${r1x}" y2="${beamY + 25}" stroke="#22c55e" stroke-width="2" marker-end="url(#rig-arrowUp)"/>
            <text x="${r1x}" y="${beamY + 62}" text-anchor="middle" fill="#22c55e" font-size="9" font-weight="600">R1=${sumR1.toFixed(0)}${wU}</text>
            <line x1="${r2x}" y1="${beamY + 50}" x2="${r2x}" y2="${beamY + 25}" stroke="#22c55e" stroke-width="2" marker-end="url(#rig-arrowUp)"/>
            <text x="${r2x}" y="${beamY + 62}" text-anchor="middle" fill="#22c55e" font-size="9" font-weight="600">R2=${sumR2.toFixed(0)}${wU}</text>
            <!-- Span label -->
            <text x="${svgW / 2}" y="${beamY + 82}" text-anchor="middle" fill="var(--text-muted)" font-size="9">Span: ${L} ${this._units === 'metric' ? 'm' : 'ft'}</text>
        </svg>
        `;
    },

    _saveBeam() {
        const L = parseFloat(document.getElementById('rig-bm-span')?.value) || 12;
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const lU = this._units === 'metric' ? 'm' : 'ft';
        let sumR1 = 0, sumR2 = 0;
        for (const p of this._beamPoints) {
            const a = Math.max(0, Math.min(p.position, L));
            sumR1 += p.load * (L - a) / L;
            sumR2 += p.load * a / L;
        }
        const totalLoad = this._beamPoints.reduce((s, p) => s + p.load, 0);

        this._savedCalcs.push({
            id: Date.now().toString(36),
            type: 'beam',
            date: new Date().toISOString(),
            summary: `Beam: ${totalLoad}${wU} on ${L}${lU} span (${this._beamPoints.length} loads)`,
            data: { span: L, points: JSON.parse(JSON.stringify(this._beamPoints)), units: this._units },
            result: { R1: sumR1.toFixed(1), R2: sumR2.toFixed(1) }
        });
        this._persistSaved();
        UI.toast('Beam calculation saved', 'success');
    },

    // ================================================================
    // SLING CAPACITY TABLE
    // ================================================================
    _renderSlingTable() {
        const wU = this._units === 'metric' ? 'kg' : 'lbs';
        const factor = this._units === 'imperial' ? this._KG_TO_LBS : 1;

        const rows = this._SLING_TABLE.map(s => {
            const fmt = (v) => (v * factor).toFixed(0);
            return `
            <tr>
                <td><span class="rig-sling-dot" style="background:${s.color}"></span>${UI.esc(s.type)}</td>
                <td class="mono" style="text-align:right">${fmt(s.wll_0)}</td>
                <td class="mono" style="text-align:right">${fmt(s.wll_30)}</td>
                <td class="mono" style="text-align:right">${fmt(s.wll_45)}</td>
                <td class="mono" style="text-align:right">${fmt(s.wll_60)}</td>
            </tr>`;
        }).join('');

        return `
        <div class="rig-card">
            <div class="rig-card-header"><h3><i class="fas fa-link"></i> Sling Working Load Limits (${wU})</h3></div>
            <div class="rig-card-body" style="padding:0;overflow-x:auto;">
                <table class="rig-sling-table">
                    <thead>
                        <tr>
                            <th>Sling Type</th>
                            <th style="text-align:right">Vertical (0&deg;)</th>
                            <th style="text-align:right">30&deg;</th>
                            <th style="text-align:right">45&deg;</th>
                            <th style="text-align:right">60&deg;</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        <p style="font-size:10px;color:var(--text-muted);margin-top:8px;padding:0 4px;">
            <i class="fas fa-info-circle"></i> WLL values decrease as the included angle increases. At 60&deg; from vertical, capacity is 50% of the straight pull rating.
            Capacity at angle = WLL &times; cos(&theta;). Always verify with manufacturer data.
        </p>
        `;
    },

    // ================================================================
    // UNIT TOGGLE
    // ================================================================
    _setUnits(u) {
        this._units = u;
        this.refresh();
    },

    // ================================================================
    // TAB SWITCHING
    // ================================================================
    _setTab(tab) {
        this._activeTab = tab;
        const content = document.getElementById('rig-content');
        if (content) content.innerHTML = this._renderTab();
        // Update tab buttons
        document.querySelectorAll('.rig-tab').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab === 'deadhang' ? 'dead' : tab === 'sling' ? 'sling' : tab));
        });
    },

    // ================================================================
    // SAVED CALCULATIONS
    // ================================================================
    _persistSaved() {
        try { localStorage.setItem('luxor_rigging_calcs', JSON.stringify(this._savedCalcs)); } catch (e) { /* quota */ }
    },

    _loadSaved() {
        try {
            const raw = localStorage.getItem('luxor_rigging_calcs');
            if (raw) this._savedCalcs = JSON.parse(raw);
        } catch (e) { this._savedCalcs = []; }
    },

    _showSaved() {
        if (this._savedCalcs.length === 0) {
            UI.openModal('Saved Calculations', `
                <div style="text-align:center;padding:30px;color:var(--text-muted)">
                    <i class="fas fa-calculator" style="font-size:32px;opacity:0.3;margin-bottom:12px;display:block"></i>
                    <p>No saved calculations yet.</p>
                    <p style="font-size:11px">Use the Save button on any calculator to store results.</p>
                </div>
            `);
            return;
        }

        const items = this._savedCalcs.slice().reverse().map(c => {
            const icon = c.type === 'bridle' ? 'project-diagram' : c.type === 'deadhang' ? 'arrows-alt-v' : 'ruler-horizontal';
            const date = new Date(c.date).toLocaleDateString() + ' ' + new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const sfVal = parseFloat(c.result.sf || 0);
            const sfClass = sfVal >= 8 ? 'green' : sfVal >= 5 ? 'yellow' : 'red';
            const sfBadge = c.result.sf ? `<span class="rig-safety rig-safety-${sfClass}" style="font-size:10px">${c.result.sf}:1</span>` : '';
            return `
                <div class="rig-saved-item">
                    <i class="fas fa-${icon} rig-saved-icon"></i>
                    <div class="rig-saved-info">
                        <div class="rig-saved-name">${UI.esc(c.summary)}</div>
                        <div class="rig-saved-detail">${date}</div>
                    </div>
                    ${sfBadge}
                    <button class="btn-icon" onclick="RiggingCalcPage._deleteSaved('${c.id}')" title="Delete"><i class="fas fa-trash" style="font-size:10px;color:var(--red)"></i></button>
                </div>
            `;
        }).join('');

        UI.openModal('Saved Calculations', `
            <div style="max-height:400px;overflow-y:auto">${items}</div>
            <div style="margin-top:12px;text-align:right">
                <button class="btn btn-sm" onclick="RiggingCalcPage._clearAllSaved()"><i class="fas fa-trash"></i> Clear All</button>
            </div>
        `);
    },

    _deleteSaved(id) {
        this._savedCalcs = this._savedCalcs.filter(c => c.id !== id);
        this._persistSaved();
        this._showSaved();
        UI.toast('Calculation deleted', 'info');
    },

    _clearAllSaved() {
        this._savedCalcs = [];
        this._persistSaved();
        UI.toast('All saved calculations cleared', 'info');
        this._showSaved();
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    onActivate() {
        this._loadSaved();
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
        const container = document.getElementById('riggingcalc-sidebar-list');
        if (!container) return;
        const tabs = [
            { key: 'bridle',   icon: 'project-diagram', label: 'Bridle Calculator' },
            { key: 'deadhang', icon: 'arrows-alt-v',    label: 'Dead Hang' },
            { key: 'beam',     icon: 'ruler-horizontal', label: 'Beam Loading' },
            { key: 'sling',    icon: 'link',             label: 'Sling Capacity' },
        ];
        container.innerHTML = tabs.map(t => `
            <div class="server-card" style="cursor:pointer;${this._activeTab === t.key ? 'background:rgba(255,255,255,0.06)' : ''}" onclick="RiggingCalcPage._setTab('${t.key}');HippoApp.navigate('riggingcalc')">
                <div style="display:flex;align-items:center;gap:6px">
                    <i class="fas fa-${t.icon}" style="font-size:11px;color:var(--accent);width:16px;text-align:center"></i>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.label}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    initSidebar() {
        this.renderSidebarList();
    },
};
