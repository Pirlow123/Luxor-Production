/**
 * LED Screen Calculator Page — Panel configuration, processor, power & weight calculations
 * Replicates LED engineering spreadsheet functionality with real-time updates
 */
const LedCalcPage = {
    _presets: {
        'PL2.9':   { px_wide: 168, px_high: 168, cm_wide: 50, cm_high: 50, weight: 8,    power_avg: 180, power_max: 540, pitch: 2.976, max_w_circuit: 2850 },
        'PL3.9XL': { px_wide: 128, px_high: 256, cm_wide: 50, cm_high: 100, weight: 13.5, power_avg: 190, power_max: 570, pitch: 3.906, max_w_circuit: 2700 },
        'PL3.9':   { px_wide: 128, px_high: 128, cm_wide: 50, cm_high: 50, weight: 8,    power_avg: 190, power_max: 570, pitch: 3.906, max_w_circuit: 2700 },
        'Custom':  { px_wide: 128, px_high: 128, cm_wide: 50, cm_high: 50, weight: 8,    power_avg: 200, power_max: 600, pitch: 3.9,   max_w_circuit: 2700 },
    },

    render() {
        return `
        <div class="section-header">
            <h2><i class="fas fa-calculator"></i> LED Screen Calculator</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="LedCalcPage._resetDefaults()"><i class="fas fa-undo"></i> Reset</button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:16px;">

            <!-- Section 1: Screen Configuration -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-th"></i> Screen Configuration</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr>
                            <td class="text-muted">Panel Preset</td>
                            <td>
                                <select class="form-control" id="lc-preset" onchange="LedCalcPage._onPresetChange()" style="width:180px">
                                    <option value="PL2.9" selected>PL2.9</option>
                                    <option value="PL3.9XL">PL3.9XL</option>
                                    <option value="PL3.9">PL3.9</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Columns (width)</td>
                            <td><input type="number" class="form-control" id="lc-cols" value="6" min="1" max="200" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Rows (height)</td>
                            <td><input type="number" class="form-control" id="lc-rows" value="6" min="1" max="200" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Refresh Rate (Hz)</td>
                            <td><input type="number" class="form-control" id="lc-refresh" value="50" min="1" max="240" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Bit Depth</td>
                            <td><input type="number" class="form-control" id="lc-bitdepth" value="8" min="1" max="16" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                    </table>

                    <!-- Custom panel fields (hidden by default) -->
                    <div id="lc-custom-fields" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
                        <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px;"><i class="fas fa-info-circle"></i> Custom panel dimensions</p>
                        <table class="ledcalc-input-table">
                            <tr>
                                <td class="text-muted">Pixels wide per panel</td>
                                <td><input type="number" class="form-control" id="lc-px-wide" value="128" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                            <tr>
                                <td class="text-muted">Pixels high per panel</td>
                                <td><input type="number" class="form-control" id="lc-px-high" value="128" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                            <tr>
                                <td class="text-muted">Width per panel (cm)</td>
                                <td><input type="number" class="form-control" id="lc-cm-wide" value="50" min="1" step="0.1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                            <tr>
                                <td class="text-muted">Height per panel (cm)</td>
                                <td><input type="number" class="form-control" id="lc-cm-high" value="50" min="1" step="0.1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                            <tr>
                                <td class="text-muted">Weight per panel (kg)</td>
                                <td><input type="number" class="form-control" id="lc-weight" value="8" min="0" step="0.1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                            <tr>
                                <td class="text-muted">Power AVG per panel (W)</td>
                                <td><input type="number" class="form-control" id="lc-power-avg" value="200" min="0" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                            <tr>
                                <td class="text-muted">Power MAX per panel (W)</td>
                                <td><input type="number" class="form-control" id="lc-power-max" value="600" min="0" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section 2: Screen Info Results -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-ruler-combined"></i> Screen Info</h3></div>
                <div class="card-body">
                    <table class="ledcalc-result-table">
                        <tr><td class="text-muted">Total Panels</td><td id="lc-total-panels" class="mono">--</td></tr>
                        <tr><td class="text-muted">Screen Size</td><td id="lc-screen-size" class="mono">--</td></tr>
                        <tr><td class="text-muted">Square Meters</td><td id="lc-sqm" class="mono">--</td></tr>
                        <tr><td class="text-muted">Total Resolution</td><td id="lc-resolution" class="mono">--</td></tr>
                        <tr><td class="text-muted">Total Pixels</td><td id="lc-total-px" class="mono">--</td></tr>
                        <tr><td class="text-muted">Diagonal (inches)</td><td id="lc-diag-in" class="mono">--</td></tr>
                        <tr><td class="text-muted">Diagonal (cm)</td><td id="lc-diag-cm" class="mono">--</td></tr>
                        <tr><td class="text-muted">Effective Pixel Pitch</td><td id="lc-pitch" class="mono">--</td></tr>
                    </table>
                </div>
            </div>

            <!-- Section 2b: Processor Calculations -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-microchip"></i> Processor Calculations</h3></div>
                <div class="card-body">
                    <table class="ledcalc-result-table">
                        <tr><td class="text-muted">Port Capacity (adjusted)</td><td id="lc-port-cap" class="mono">--</td><td class="text-muted" style="font-size:10px">pixels per port at current refresh/bit depth</td></tr>
                        <tr><td class="text-muted">Optimal Port Capacity</td><td class="mono">650,000</td><td class="text-muted" style="font-size:10px">base constant</td></tr>
                        <tr><td class="text-muted">Ports Needed (no backup)</td><td id="lc-ports-nobu" class="mono">--</td><td class="text-muted" style="font-size:10px">ceil(total pixels / port capacity)</td></tr>
                        <tr><td class="text-muted">Ports Needed (with backup)</td><td id="lc-ports-bu" class="mono">--</td><td class="text-muted" style="font-size:10px">ports x 2</td></tr>
                        <tr style="border-top:1px solid var(--border)"><td class="text-muted">Panels Per Port</td><td id="lc-panels-per-port" class="mono">--</td><td class="text-muted" style="font-size:10px">real-world: floor(port cap / panel pixels)</td></tr>
                        <tr><td class="text-muted">Ports (real world, no BU)</td><td id="lc-ports-rw-nobu" class="mono">--</td><td class="text-muted" style="font-size:10px">ceil(total panels / panels per port)</td></tr>
                        <tr><td class="text-muted">Ports (real world, with BU)</td><td id="lc-ports-rw-bu" class="mono">--</td><td class="text-muted" style="font-size:10px">real-world ports x 2</td></tr>
                    </table>
                </div>
            </div>

            <!-- Section 2c: Power Calculations -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> Power Calculations</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table" style="margin-bottom:12px;">
                        <tr>
                            <td class="text-muted">Max W per circuit</td>
                            <td><input type="number" class="form-control" id="lc-max-w-circuit" value="2850" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Amps per circuit</td>
                            <td><input type="number" class="form-control" id="lc-amps-circuit" value="12" min="1" step="0.1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Sq meters per circuit</td>
                            <td><input type="number" class="form-control" id="lc-sqm-circuit" value="5" min="0.1" step="0.1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                    </table>
                    <table class="ledcalc-result-table">
                        <tr><td class="text-muted">W AVG Total</td><td id="lc-w-avg" class="mono">--</td></tr>
                        <tr><td class="text-muted">W MAX Total</td><td id="lc-w-max" class="mono">--</td></tr>
                        <tr><td class="text-muted">3-Phase W AVG</td><td id="lc-3p-avg" class="mono">--</td></tr>
                        <tr><td class="text-muted">3-Phase W MAX</td><td id="lc-3p-max" class="mono">--</td></tr>
                        <tr style="border-top:1px solid var(--border)"><td class="text-muted">Amps AVG Total</td><td id="lc-a-avg" class="mono">--</td></tr>
                        <tr><td class="text-muted">Amps MAX Total</td><td id="lc-a-max" class="mono">--</td></tr>
                        <tr style="border-top:1px solid var(--border)"><td class="text-muted">Circuits (from W avg)</td><td id="lc-circ-w-avg" class="mono">--</td></tr>
                        <tr><td class="text-muted">Circuits (from W max)</td><td id="lc-circ-w-max" class="mono">--</td></tr>
                        <tr><td class="text-muted">Circuits (from A avg)</td><td id="lc-circ-a-avg" class="mono">--</td></tr>
                        <tr><td class="text-muted">Circuits (from A max)</td><td id="lc-circ-a-max" class="mono">--</td></tr>
                    </table>
                </div>
            </div>

            <!-- Section 2d: Weight Calculations -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-weight-hanging"></i> Weight & Rigging</h3></div>
                <div class="card-body">
                    <table class="ledcalc-result-table">
                        <tr><td class="text-muted">Total Screen Weight</td><td id="lc-weight-total" class="mono">--</td></tr>
                        <tr><td class="text-muted">Counterweight (est.)</td><td id="lc-counterweight" class="mono">--</td></tr>
                        <tr><td class="text-muted">Flying Brackets</td><td id="lc-brackets" class="mono">--</td></tr>
                    </table>
                </div>
            </div>

            <!-- Section 3: Pulse & Latency Calculator -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-wave-square"></i> Pulse & Latency Calculator</h3></div>
                <div class="card-body">

                    <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;font-weight:600;">Pulse Calculation</p>
                    <table class="ledcalc-input-table" style="margin-bottom:8px;">
                        <tr>
                            <td class="text-muted">Input FPS</td>
                            <td><input type="number" class="form-control" id="lc-pulse-fps" value="50" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Panel Hz</td>
                            <td><input type="number" class="form-control" id="lc-pulse-panelhz" value="6400" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                    </table>
                    <table class="ledcalc-result-table" style="margin-bottom:16px;">
                        <tr><td class="text-muted">Input Hz</td><td id="lc-pulse-inputhz" class="mono">--</td></tr>
                        <tr><td class="text-muted">On/Off Pulses per Frame</td><td id="lc-pulse-onoff" class="mono">--</td></tr>
                        <tr><td class="text-muted">Frame Multiplication</td><td id="lc-pulse-mult" class="mono">--</td></tr>
                    </table>

                    <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;font-weight:600;">Shutter Speed Calculator</p>
                    <table class="ledcalc-input-table" style="margin-bottom:8px;">
                        <tr>
                            <td class="text-muted">Camera FPS</td>
                            <td><input type="number" class="form-control" id="lc-shutter-fps" value="25" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Shutter Angle</td>
                            <td><input type="number" class="form-control" id="lc-shutter-angle" value="180" min="1" max="360" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                    </table>
                    <table class="ledcalc-result-table" style="margin-bottom:16px;">
                        <tr><td class="text-muted">Shutter Speed (1/x)</td><td id="lc-shutter-speed" class="mono">--</td></tr>
                        <tr><td class="text-muted">Exposure Time</td><td id="lc-shutter-exposure" class="mono">--</td></tr>
                    </table>

                    <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;font-weight:600;">Latency Calculator</p>
                    <table class="ledcalc-input-table" style="margin-bottom:8px;">
                        <tr>
                            <td class="text-muted">Input Hz</td>
                            <td><input type="number" class="form-control" id="lc-lat-hz" value="50" min="1" step="1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Latency (ms)</td>
                            <td><input type="number" class="form-control" id="lc-lat-ms" value="5" min="0" step="0.1" oninput="LedCalcPage._recalculate()" style="width:100px"></td>
                        </tr>
                    </table>
                    <table class="ledcalc-result-table">
                        <tr><td class="text-muted">ms per Frame</td><td id="lc-lat-msframe" class="mono">--</td></tr>
                        <tr><td class="text-muted">Frames in Latency</td><td id="lc-lat-frames" class="mono">--</td></tr>
                    </table>
                </div>
            </div>

        </div>

        <style>
            .ledcalc-input-table { width: 100%; border-collapse: collapse; }
            .ledcalc-input-table td { padding: 4px 8px 4px 0; vertical-align: middle; }
            .ledcalc-input-table td:first-child { width: 200px; font-size: 12px; }
            .ledcalc-input-table input, .ledcalc-input-table select { font-size: 12px; padding: 4px 8px; }
            .ledcalc-result-table { width: 100%; border-collapse: collapse; }
            .ledcalc-result-table td { padding: 5px 8px; vertical-align: middle; font-size: 12px; }
            .ledcalc-result-table td:first-child { width: 200px; }
            .ledcalc-result-table tr:hover { background: rgba(255,255,255,0.02); }
            .ledcalc-result-table .lc-good { color: #4ade80; font-weight: 600; }
            .ledcalc-result-table .lc-warn { color: #facc15; font-weight: 600; }
            .ledcalc-result-table .lc-bad  { color: #f87171; font-weight: 600; }
        </style>
        `;
    },

    onActivate() {
        // Run initial calculation after DOM is ready
        setTimeout(() => this._recalculate(), 0);
    },

    onDeactivate() {
        // Nothing to clean up
    },

    /* ------------------------------------------------------------------ */
    /*  Preset change handler                                              */
    /* ------------------------------------------------------------------ */
    _onPresetChange() {
        const presetName = document.getElementById('lc-preset')?.value || 'PL2.9';
        const preset = this._presets[presetName];
        const customFields = document.getElementById('lc-custom-fields');

        if (presetName === 'Custom') {
            if (customFields) customFields.style.display = 'block';
        } else {
            if (customFields) customFields.style.display = 'none';
            // Update custom fields to preset values (so recalculate reads them)
            this._setVal('lc-px-wide', preset.px_wide);
            this._setVal('lc-px-high', preset.px_high);
            this._setVal('lc-cm-wide', preset.cm_wide);
            this._setVal('lc-cm-high', preset.cm_high);
            this._setVal('lc-weight', preset.weight);
            this._setVal('lc-power-avg', preset.power_avg);
            this._setVal('lc-power-max', preset.power_max);
            // Update max W per circuit to match preset default
            this._setVal('lc-max-w-circuit', preset.max_w_circuit);
        }
        this._recalculate();
    },

    /* ------------------------------------------------------------------ */
    /*  Reset to defaults                                                  */
    /* ------------------------------------------------------------------ */
    _resetDefaults() {
        this._setVal('lc-preset', 'PL2.9');
        this._setVal('lc-cols', 6);
        this._setVal('lc-rows', 6);
        this._setVal('lc-refresh', 50);
        this._setVal('lc-bitdepth', 8);
        this._setVal('lc-px-wide', 168);
        this._setVal('lc-px-high', 168);
        this._setVal('lc-cm-wide', 50);
        this._setVal('lc-cm-high', 50);
        this._setVal('lc-weight', 8);
        this._setVal('lc-power-avg', 180);
        this._setVal('lc-power-max', 540);
        this._setVal('lc-max-w-circuit', 2850);
        this._setVal('lc-amps-circuit', 12);
        this._setVal('lc-sqm-circuit', 5);
        this._setVal('lc-pulse-fps', 50);
        this._setVal('lc-pulse-panelhz', 6400);
        this._setVal('lc-shutter-fps', 25);
        this._setVal('lc-shutter-angle', 180);
        this._setVal('lc-lat-hz', 50);
        this._setVal('lc-lat-ms', 5);
        const customFields = document.getElementById('lc-custom-fields');
        if (customFields) customFields.style.display = 'none';
        this._recalculate();
        UI.toast('Calculator reset to defaults', 'info');
    },

    /* ------------------------------------------------------------------ */
    /*  Main recalculation — reads all inputs, writes all outputs          */
    /* ------------------------------------------------------------------ */
    _recalculate() {
        // --- Read inputs ---
        const presetName = this._getVal('lc-preset') || 'PL2.9';
        const cols       = this._num('lc-cols', 1);
        const rows       = this._num('lc-rows', 1);
        const refreshHz  = this._num('lc-refresh', 50);
        const bitDepth   = this._num('lc-bitdepth', 8);

        let px_wide, px_high, cm_wide, cm_high, weight, power_avg, power_max;
        if (presetName !== 'Custom') {
            const p   = this._presets[presetName];
            px_wide   = p.px_wide;
            px_high   = p.px_high;
            cm_wide   = p.cm_wide;
            cm_high   = p.cm_high;
            weight    = p.weight;
            power_avg = p.power_avg;
            power_max = p.power_max;
        } else {
            px_wide   = this._num('lc-px-wide', 128);
            px_high   = this._num('lc-px-high', 128);
            cm_wide   = this._num('lc-cm-wide', 50);
            cm_high   = this._num('lc-cm-high', 50);
            weight    = this._num('lc-weight', 8);
            power_avg = this._num('lc-power-avg', 200);
            power_max = this._num('lc-power-max', 600);
        }

        const maxWCircuit  = this._num('lc-max-w-circuit', 2850);
        const ampsCircuit  = this._num('lc-amps-circuit', 12);
        const sqmCircuit   = this._num('lc-sqm-circuit', 5);

        // --- Screen Info ---
        const totalPanels = cols * rows;
        const widthM      = (cols * cm_wide) / 100;
        const heightM     = (rows * cm_high) / 100;
        const sqMeters    = widthM * heightM;
        const resW        = cols * px_wide;
        const resH        = rows * px_high;
        const totalPx     = resW * resH;
        const widthCm     = cols * cm_wide;
        const heightCm    = rows * cm_high;
        const diagCm      = Math.sqrt(widthCm * widthCm + heightCm * heightCm);
        const diagIn      = diagCm / 2.54;
        const effPitch    = (cm_wide / px_wide) * 10; // mm

        this._setText('lc-total-panels', totalPanels.toLocaleString());
        this._setText('lc-screen-size', `${widthM.toFixed(2)} m x ${heightM.toFixed(2)} m`);
        this._setText('lc-sqm', `${sqMeters.toFixed(2)} m\u00B2`);
        this._setText('lc-resolution', `${resW.toLocaleString()} x ${resH.toLocaleString()}`);
        this._setText('lc-total-px', totalPx.toLocaleString() + ' px');
        this._setText('lc-diag-in', diagIn.toFixed(1) + '"');
        this._setText('lc-diag-cm', diagCm.toFixed(1) + ' cm');
        this._setText('lc-pitch', effPitch.toFixed(3) + ' mm');

        // --- Processor Calculations ---
        // Gigabit Ethernet usable bandwidth = 936 Mbps (after encoding overhead)
        // pixels per port = bandwidth / refresh_rate / (bit_depth * 3 channels)
        const ethBandwidth = 936000000;
        const portCapacity = Math.floor(ethBandwidth / refreshHz / (bitDepth * 3));
        const portsNobu    = Math.ceil(totalPx / portCapacity);
        const portsBu      = portsNobu * 2;

        const panelPx       = px_wide * px_high;
        const panelsPerPort = Math.floor(portCapacity / panelPx);
        const portsRwNobu   = panelsPerPort > 0 ? Math.ceil(totalPanels / panelsPerPort) : totalPanels;
        const portsRwBu     = portsRwNobu * 2;

        this._setText('lc-port-cap', portCapacity.toLocaleString() + ' px');
        this._setText('lc-ports-nobu', portsNobu);
        this._setText('lc-ports-bu', portsBu);
        this._setText('lc-panels-per-port', panelsPerPort);
        this._setText('lc-ports-rw-nobu', portsRwNobu);
        this._setText('lc-ports-rw-bu', portsRwBu);

        // Color-code ports
        this._colorize('lc-ports-rw-bu', portsRwBu <= 4 ? 'good' : portsRwBu <= 8 ? 'warn' : 'bad');

        // --- Power Calculations ---
        const wAvg      = totalPanels * power_avg;
        const wMax      = totalPanels * power_max;
        const threeAvg  = wAvg / 3;
        const threeMax  = wMax / 3;
        const ampsAvg   = Math.round(wAvg / 230);
        const ampsMax   = Math.round(wMax / 230);

        const circWAvg  = Math.ceil(wAvg / maxWCircuit);
        const circWMax  = Math.ceil(wMax / maxWCircuit);
        const circAAvg  = Math.ceil(ampsAvg / ampsCircuit);
        const circAMax  = Math.ceil(ampsMax / ampsCircuit);

        this._setText('lc-w-avg', wAvg.toLocaleString() + ' W');
        this._setText('lc-w-max', wMax.toLocaleString() + ' W');
        this._setText('lc-3p-avg', Math.round(threeAvg).toLocaleString() + ' W');
        this._setText('lc-3p-max', Math.round(threeMax).toLocaleString() + ' W');
        this._setText('lc-a-avg', ampsAvg.toLocaleString() + ' A');
        this._setText('lc-a-max', ampsMax.toLocaleString() + ' A');
        this._setText('lc-circ-w-avg', circWAvg + ' circuits');
        this._setText('lc-circ-w-max', circWMax + ' circuits');
        this._setText('lc-circ-a-avg', circAAvg + ' circuits');
        this._setText('lc-circ-a-max', circAMax + ' circuits');

        // Color-code power
        this._colorize('lc-w-max', wMax <= 10000 ? 'good' : wMax <= 30000 ? 'warn' : 'bad');
        this._colorize('lc-a-max', ampsMax <= 30 ? 'good' : ampsMax <= 80 ? 'warn' : 'bad');

        // --- Weight Calculations ---
        const totalWeight   = totalPanels * weight;
        const counterWeight = totalPanels * 8.33;
        const brackets      = cols * rows;

        this._setText('lc-weight-total', totalWeight.toFixed(1) + ' kg');
        this._setText('lc-counterweight', counterWeight.toFixed(1) + ' kg (est.)');
        this._setText('lc-brackets', brackets);

        this._colorize('lc-weight-total', totalWeight <= 200 ? 'good' : totalWeight <= 500 ? 'warn' : 'bad');

        // --- Pulse & Latency ---
        const pulseFps    = this._num('lc-pulse-fps', 50);
        const panelHz     = this._num('lc-pulse-panelhz', 6400);
        const pulseOnOff  = panelHz / pulseFps;
        const pulseMult   = (panelHz % pulseFps === 0) ? 1 : (panelHz / pulseFps).toFixed(3);

        this._setText('lc-pulse-inputhz', pulseFps + ' Hz');
        this._setText('lc-pulse-onoff', pulseOnOff.toFixed(1));
        this._setText('lc-pulse-mult', pulseMult);
        this._colorize('lc-pulse-mult', pulseMult == 1 ? 'good' : 'warn');

        // Shutter speed
        const shutterFps   = this._num('lc-shutter-fps', 25);
        const shutterAngle = this._num('lc-shutter-angle', 180);
        const shutterSpeed = (shutterFps * 360) / shutterAngle;
        const exposureMs   = 1000 / shutterSpeed;

        this._setText('lc-shutter-speed', '1/' + shutterSpeed.toFixed(1));
        this._setText('lc-shutter-exposure', exposureMs.toFixed(2) + ' ms');

        // Latency
        const latHz       = this._num('lc-lat-hz', 50);
        const latMs       = this._num('lc-lat-ms', 5);
        const msPerFrame  = 1000 / latHz;
        const framesInLat = latMs / msPerFrame;

        this._setText('lc-lat-msframe', msPerFrame.toFixed(2) + ' ms');
        this._setText('lc-lat-frames', framesInLat.toFixed(2) + ' frames');
        this._colorize('lc-lat-frames', framesInLat <= 1 ? 'good' : framesInLat <= 3 ? 'warn' : 'bad');
    },

    /* ------------------------------------------------------------------ */
    /*  DOM helpers                                                        */
    /* ------------------------------------------------------------------ */
    _getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    },

    _num(id, fallback) {
        const v = parseFloat(this._getVal(id));
        return isNaN(v) || v <= 0 ? fallback : v;
    },

    _setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    },

    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    _colorize(id, level) {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = 'mono';
        if (level === 'good') el.classList.add('lc-good');
        else if (level === 'warn') el.classList.add('lc-warn');
        else if (level === 'bad') el.classList.add('lc-bad');
    },
};
