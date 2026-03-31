/**
 * LED Setup Calculator — Crew time estimates for LED screen builds
 * Calculates setup time for flown or ground-stacked LED walls
 */
const LedSetupPage = {

    // Panel presets (shared with LedCalcPage concept)
    _panels: {
        'ROE CB5':     { cm_w: 50, cm_h: 50, weight: 8.2 },
        'ROE BP2V2':   { cm_w: 50, cm_h: 50, weight: 7.5 },
        'PL2.9':       { cm_w: 50, cm_h: 50, weight: 8 },
        'PL3.9':       { cm_w: 50, cm_h: 50, weight: 8 },
        'PL3.9XL':     { cm_w: 50, cm_h: 100, weight: 13.5 },
        'Absen PL3.9': { cm_w: 50, cm_h: 50, weight: 7.8 },
        'Absen A27':   { cm_w: 50, cm_h: 50, weight: 8.5 },
        'Custom':      { cm_w: 50, cm_h: 50, weight: 8 },
    },

    // Time constants (minutes per unit)
    _rates: {
        groundSupport:  8,    // min per meter width for first meter of ground support
        sandbag:        1,    // min per sandbag
        heightPerSqm:   3,    // min per sqm in height build
        cablingPerSqm:  1.2,  // min per sqm for data & power cabling
        dataLine:       2,    // min per data line marking & running
        powerLine:      1,    // min per power line marking & running
        flyingRig:      15,   // min per motor point rigging
        flyingPanel:    0.8,  // min per panel attaching to fly frame
        trimHeight:     5,    // min per trim adjustment
    },

    // Height factor lookup (ground-stacked only)
    _heightFactors: {
        2:   1.20,
        2.5: 1.25,
        3:   1.30,
        3.5: 1.35,
        4:   1.40,
        4.5: 1.45,
        5:   1.50,
        5.5: 1.55,
    },

    render() {
        return `
        <div class="section-header">
            <h2><i class="fas fa-hard-hat"></i> LED Setup Calculator</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="LedSetupPage._reset()"><i class="fas fa-undo"></i> Reset</button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:16px;">

            <!-- Screen Configuration -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-tv"></i> Screen Configuration</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr>
                            <td class="text-muted">Panel Type</td>
                            <td>
                                <select class="form-control" id="ls-panel" onchange="LedSetupPage._onPanelChange()" style="width:180px">
                                    ${Object.keys(this._panels).map(k => `<option value="${k}">${k}</option>`).join('')}
                                </select>
                            </td>
                        </tr>
                        <tr id="ls-custom-row" style="display:none">
                            <td class="text-muted">Custom Panel (cm)</td>
                            <td class="flex gap-sm" style="align-items:center">
                                <input type="number" class="form-control" id="ls-custom-w" value="50" min="1" max="200" style="width:70px" oninput="LedSetupPage._recalc()">
                                <span class="text-muted">x</span>
                                <input type="number" class="form-control" id="ls-custom-h" value="50" min="1" max="200" style="width:70px" oninput="LedSetupPage._recalc()">
                                <span class="text-muted">Weight (kg)</span>
                                <input type="number" class="form-control" id="ls-custom-wt" value="8" min="0.1" max="50" step="0.1" style="width:70px" oninput="LedSetupPage._recalc()">
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Screen Width (panels)</td>
                            <td><input type="number" class="form-control" id="ls-cols" value="10" min="1" max="200" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Screen Height (panels)</td>
                            <td><input type="number" class="form-control" id="ls-rows" value="6" min="1" max="200" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Setup Method -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-cogs"></i> Setup Method</h3></div>
                <div class="card-body">
                    <div class="flex gap-md" style="margin-bottom:16px">
                        <label class="flex gap-xs" style="align-items:center;cursor:pointer">
                            <input type="radio" name="ls-method" value="ground" checked onchange="LedSetupPage._recalc()">
                            <span><i class="fas fa-arrows-alt-v"></i> Ground Stacked</span>
                        </label>
                        <label class="flex gap-xs" style="align-items:center;cursor:pointer">
                            <input type="radio" name="ls-method" value="flown" onchange="LedSetupPage._recalc()">
                            <span><i class="fas fa-link"></i> Flown</span>
                        </label>
                    </div>

                    <table class="ledcalc-input-table">
                        <tr id="ls-sandbag-row">
                            <td class="text-muted">Sandbags</td>
                            <td><input type="number" class="form-control" id="ls-sandbags" value="12" min="0" max="200" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                        <tr id="ls-motor-row" style="display:none">
                            <td class="text-muted">Motor Points</td>
                            <td><input type="number" class="form-control" id="ls-motors" value="4" min="1" max="50" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Data Lines</td>
                            <td><input type="number" class="form-control" id="ls-data" value="4" min="0" max="100" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Power Lines</td>
                            <td><input type="number" class="form-control" id="ls-power" value="3" min="0" max="100" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Crew Size</td>
                            <td><input type="number" class="form-control" id="ls-crew" value="4" min="1" max="50" oninput="LedSetupPage._recalc()" style="width:100px"></td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Screen Summary -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> Screen Summary</h3></div>
                <div class="card-body" id="ls-summary">
                    ${this._renderSummary()}
                </div>
            </div>

            <!-- Time Breakdown -->
            <div class="card" style="grid-column: 1 / -1">
                <div class="card-header"><h3><i class="fas fa-stopwatch"></i> Setup Time Breakdown</h3></div>
                <div class="card-body" id="ls-breakdown">
                    ${this._renderBreakdown()}
                </div>
            </div>
        </div>
        `;
    },

    // ---- Getters ----
    _getPanel() {
        const key = document.getElementById('ls-panel')?.value || 'PL2.9';
        if (key === 'Custom') {
            return {
                cm_w: parseFloat(document.getElementById('ls-custom-w')?.value) || 50,
                cm_h: parseFloat(document.getElementById('ls-custom-h')?.value) || 50,
                weight: parseFloat(document.getElementById('ls-custom-wt')?.value) || 8,
            };
        }
        return this._panels[key] || this._panels['PL2.9'];
    },

    _getInputs() {
        const panel = this._getPanel();
        const cols = parseInt(document.getElementById('ls-cols')?.value) || 10;
        const rows = parseInt(document.getElementById('ls-rows')?.value) || 6;
        const method = document.querySelector('input[name="ls-method"]:checked')?.value || 'ground';
        const sandbags = parseInt(document.getElementById('ls-sandbags')?.value) || 0;
        const motors = parseInt(document.getElementById('ls-motors')?.value) || 4;
        const dataLines = parseInt(document.getElementById('ls-data')?.value) || 0;
        const powerLines = parseInt(document.getElementById('ls-power')?.value) || 0;
        const crew = parseInt(document.getElementById('ls-crew')?.value) || 4;

        const widthM = (cols * panel.cm_w) / 100;
        const heightM = (rows * panel.cm_h) / 100;
        const totalPanels = cols * rows;
        const totalSqm = widthM * heightM;
        const totalWeight = totalPanels * panel.weight;

        return { panel, cols, rows, method, sandbags, motors, dataLines, powerLines, crew, widthM, heightM, totalPanels, totalSqm, totalWeight };
    },

    // ---- Calculation ----
    _calcTasks(inp) {
        const r = this._rates;
        const tasks = [];

        if (inp.method === 'ground') {
            // Ground-stacked tasks
            tasks.push({ name: 'Ground support (first meter)', minutes: inp.widthM * r.groundSupport, note: `${inp.widthM.toFixed(1)}m width x ${r.groundSupport} min/m` });
            tasks.push({ name: 'Sandbag placement', minutes: inp.sandbags * r.sandbag, note: `${inp.sandbags} sandbags x ${r.sandbag} min` });
            tasks.push({ name: 'Panel stacking (height build)', minutes: (inp.totalSqm * r.heightPerSqm) - inp.widthM, note: `(${inp.totalSqm.toFixed(1)} sqm x ${r.heightPerSqm}) - ${inp.widthM.toFixed(1)}m base` });
            tasks.push({ name: 'Cabling (data & power)', minutes: inp.totalSqm * r.cablingPerSqm, note: `${inp.totalSqm.toFixed(1)} sqm x ${r.cablingPerSqm} min` });
            tasks.push({ name: 'Data line routing', minutes: inp.dataLines * r.dataLine, note: `${inp.dataLines} lines x ${r.dataLine} min` });
            tasks.push({ name: 'Power line routing', minutes: inp.powerLines * r.powerLine, note: `${inp.powerLines} lines x ${r.powerLine} min` });

            // Height factor
            const hf = this._getHeightFactor(inp.heightM);
            if (hf > 1) {
                const stackTime = (inp.totalSqm * r.heightPerSqm) - inp.widthM;
                const extra = Math.ceil((stackTime * hf) - stackTime);
                tasks.push({ name: `Height factor (${inp.heightM.toFixed(1)}m = ${hf}x)`, minutes: extra, note: `Extra time for working at height` });
            }
        } else {
            // Flown tasks
            tasks.push({ name: 'Rigging motor points', minutes: inp.motors * r.flyingRig, note: `${inp.motors} points x ${r.flyingRig} min` });
            tasks.push({ name: 'Attaching panels to fly frame', minutes: inp.totalPanels * r.flyingPanel, note: `${inp.totalPanels} panels x ${r.flyingPanel} min` });
            tasks.push({ name: 'Cabling (data & power)', minutes: inp.totalSqm * r.cablingPerSqm, note: `${inp.totalSqm.toFixed(1)} sqm x ${r.cablingPerSqm} min` });
            tasks.push({ name: 'Data line routing', minutes: inp.dataLines * r.dataLine, note: `${inp.dataLines} lines x ${r.dataLine} min` });
            tasks.push({ name: 'Power line routing', minutes: inp.powerLines * r.powerLine, note: `${inp.powerLines} lines x ${r.powerLine} min` });
            tasks.push({ name: 'Trim height adjustment', minutes: inp.motors * r.trimHeight, note: `${inp.motors} points x ${r.trimHeight} min` });
        }

        // Filter out zero/negative tasks
        return tasks.filter(t => t.minutes > 0);
    },

    _getHeightFactor(heightM) {
        // Find closest height factor
        const keys = Object.keys(this._heightFactors).map(Number).sort((a, b) => a - b);
        if (heightM <= keys[0]) return 1;
        for (let i = keys.length - 1; i >= 0; i--) {
            if (heightM >= keys[i]) return this._heightFactors[keys[i]];
        }
        return 1;
    },

    // ---- Rendering ----
    _renderSummary() {
        const inp = this._getInputs();
        return `
            <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
                <div class="mini-stat">
                    <div class="mini-stat-value">${inp.totalPanels}</div>
                    <div class="mini-stat-label">Total Panels</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">${inp.widthM.toFixed(1)}m x ${inp.heightM.toFixed(1)}m</div>
                    <div class="mini-stat-label">Screen Size</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">${inp.totalSqm.toFixed(1)} m&sup2;</div>
                    <div class="mini-stat-label">Total Area</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">${inp.totalWeight.toFixed(0)} kg</div>
                    <div class="mini-stat-label">Total Weight</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value" style="text-transform:capitalize">${inp.method === 'ground' ? 'Ground Stacked' : 'Flown'}</div>
                    <div class="mini-stat-label">Method</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-value">${inp.crew}</div>
                    <div class="mini-stat-label">Crew</div>
                </div>
            </div>
        `;
    },

    _renderBreakdown() {
        const inp = this._getInputs();
        const tasks = this._calcTasks(inp);
        const totalMin = tasks.reduce((s, t) => s + t.minutes, 0);
        const totalHrs = Math.ceil(totalMin / 60);
        const perPerson = Math.ceil(totalMin / inp.crew);
        const perPersonHrs = Math.ceil(perPerson / 60);

        return `
            <table class="data-table" style="margin-bottom:16px">
                <thead>
                    <tr>
                        <th>Task</th>
                        <th>Details</th>
                        <th style="text-align:right">Minutes</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(t => `
                        <tr>
                            <td>${t.name}</td>
                            <td class="text-muted" style="font-size:11px">${t.note}</td>
                            <td style="text-align:right;font-weight:600">${Math.ceil(t.minutes)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="border-top:2px solid var(--border)">
                        <td colspan="2" style="font-weight:700">Total Build Time</td>
                        <td style="text-align:right;font-weight:700">${Math.ceil(totalMin)} min (~${totalHrs} hrs)</td>
                    </tr>
                </tfoot>
            </table>

            <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
                <div class="mini-stat" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px">
                    <div class="mini-stat-value" style="color:var(--accent);font-size:24px">${Math.ceil(totalMin)} min</div>
                    <div class="mini-stat-label">Total Work (1 person)</div>
                </div>
                <div class="mini-stat" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px">
                    <div class="mini-stat-value" style="color:var(--cyan);font-size:24px">${perPerson} min</div>
                    <div class="mini-stat-label">Per Person (${inp.crew} crew)</div>
                </div>
                <div class="mini-stat" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px">
                    <div class="mini-stat-value" style="color:var(--green);font-size:24px">~${perPersonHrs} hrs</div>
                    <div class="mini-stat-label">Estimated Wall Time</div>
                </div>
                <div class="mini-stat" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px">
                    <div class="mini-stat-value" style="color:var(--yellow);font-size:24px">${(totalMin * inp.crew / 60).toFixed(1)} hrs</div>
                    <div class="mini-stat-label">Total Crew Hours</div>
                </div>
            </div>
        `;
    },

    // ---- Event Handlers ----
    _onPanelChange() {
        const key = document.getElementById('ls-panel')?.value;
        const customRow = document.getElementById('ls-custom-row');
        if (customRow) customRow.style.display = key === 'Custom' ? '' : 'none';
        this._recalc();
    },

    _recalc() {
        const method = document.querySelector('input[name="ls-method"]:checked')?.value || 'ground';
        const sandbagRow = document.getElementById('ls-sandbag-row');
        const motorRow = document.getElementById('ls-motor-row');
        if (sandbagRow) sandbagRow.style.display = method === 'ground' ? '' : 'none';
        if (motorRow) motorRow.style.display = method === 'flown' ? '' : 'none';

        const summary = document.getElementById('ls-summary');
        const breakdown = document.getElementById('ls-breakdown');
        if (summary) summary.innerHTML = this._renderSummary();
        if (breakdown) breakdown.innerHTML = this._renderBreakdown();
    },

    _reset() {
        const ids = { 'ls-cols': 10, 'ls-rows': 6, 'ls-sandbags': 12, 'ls-motors': 4, 'ls-data': 4, 'ls-power': 3, 'ls-crew': 4, 'ls-custom-w': 50, 'ls-custom-h': 50, 'ls-custom-wt': 8 };
        for (const [id, val] of Object.entries(ids)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
        const panel = document.getElementById('ls-panel');
        if (panel) panel.value = 'PL2.9';
        const ground = document.querySelector('input[name="ls-method"][value="ground"]');
        if (ground) ground.checked = true;
        document.getElementById('ls-custom-row').style.display = 'none';
        this._recalc();
        UI.toast('Reset to defaults', 'info');
    },

    onActivate() {},
    onDeactivate() {},
};
