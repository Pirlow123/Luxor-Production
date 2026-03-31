/**
 * LED Connection Auto-Config Page
 * Automatically calculates optimal data + power connections for LED walls
 * Uses real manufacturer panel & processor specifications
 */
const LedConnectPage = {

    // ================================================================
    // LED PANEL DATABASE — real manufacturer specs
    // ================================================================
    _panels: {
        // ROE Visual — specs from manufacturer datasheets
        'ROE BP2':       { brand: 'ROE Visual', model: 'Black Pearl BP2',    pitch: 2.84, px_w: 176, px_h: 176, cm_w: 50, cm_h: 50, weight: 9.35, power_avg: 80,  power_max: 160, max_panels_per_circuit: 23, data_per_panel: 1 },
        'ROE CB5':       { brand: 'ROE Visual', model: 'Carbon CB5',         pitch: 5.77, px_w: 104, px_h: 208, cm_w: 60, cm_h: 120, weight: 13.9, power_avg: 330, power_max: 650, max_panels_per_circuit: 5, data_per_panel: 1 },
        'ROE BM4':       { brand: 'ROE Visual', model: 'Black Marble BM4',  pitch: 4.76, px_w: 128, px_h: 128, cm_w: 60.96, cm_h: 60.96, weight: 16.75, power_avg: 145, power_max: 290, max_panels_per_circuit: 12, data_per_panel: 1 },
        // Absen — specs from PL Lite V10 datasheets (W/m² converted to per panel)
        'Absen PL2.9':  { brand: 'Absen', model: 'PL Lite 2.9',            pitch: 2.9,  px_w: 168, px_h: 168, cm_w: 50, cm_h: 50, weight: 6.4,  power_avg: 45,  power_max: 135, max_panels_per_circuit: 20, data_per_panel: 1 },
        'Absen PL3.9':  { brand: 'Absen', model: 'PL Lite 3.9',            pitch: 3.9,  px_w: 128, px_h: 128, cm_w: 50, cm_h: 50, weight: 7.6,  power_avg: 45,  power_max: 135, max_panels_per_circuit: 20, data_per_panel: 1 },
        'Absen X5':     { brand: 'Absen', model: 'X5 Outdoor',             pitch: 5.2,  px_w: 96,  px_h: 108, cm_w: 50, cm_h: 56.25, weight: 10,  power_avg: 52,  power_max: 156, max_panels_per_circuit: 23, data_per_panel: 1 },
        // Unilumin — specs from UPAD III/IV datasheets
        'Uni UpadIII 2.6': { brand: 'Unilumin', model: 'UPAD III 2.6',    pitch: 2.6,  px_w: 192, px_h: 192, cm_w: 50, cm_h: 50, weight: 9.0,  power_avg: 45,  power_max: 150, max_panels_per_circuit: 24, data_per_panel: 1 },
        'Uni UpadIII 3.9': { brand: 'Unilumin', model: 'UPAD III 3.9',    pitch: 3.9,  px_w: 128, px_h: 128, cm_w: 50, cm_h: 50, weight: 9.0,  power_avg: 40,  power_max: 120, max_panels_per_circuit: 30, data_per_panel: 1 },
        'Uni UHW II 0.9':  { brand: 'Unilumin', model: 'UHW II 0.9',      pitch: 0.93, px_w: 640, px_h: 360, cm_w: 60, cm_h: 33.75, weight: 6.5, power_avg: 60,  power_max: 150, max_panels_per_circuit: 24, data_per_panel: 1 },
        // Desay — specs from Vesta M datasheet (800x900mm panel)
        'Desay M6':     { brand: 'Desay', model: 'Vesta M6',               pitch: 6.25, px_w: 128, px_h: 144, cm_w: 80, cm_h: 90, weight: 19.8, power_avg: 137, power_max: 403, max_panels_per_circuit: 9, data_per_panel: 1 },
        'Desay HB1.5':  { brand: 'Desay', model: 'Halo HB1.5',            pitch: 1.56, px_w: 320, px_h: 160, cm_w: 50, cm_h: 25, weight: 5.2,  power_avg: 50,  power_max: 130, max_panels_per_circuit: 28, data_per_panel: 1 },
        // INFiLED — specs from DB Series Pro datasheet
        'INFiLED DB2':  { brand: 'INFiLED', model: 'DB 2.6 Pro',           pitch: 2.6,  px_w: 192, px_h: 192, cm_w: 50, cm_h: 50, weight: 8.8,  power_avg: 50,  power_max: 150, max_panels_per_circuit: 24, data_per_panel: 1 },
        'INFiLED ER5':  { brand: 'INFiLED', model: 'ER Series 5.9',        pitch: 5.9,  px_w: 84,  px_h: 84,  cm_w: 50, cm_h: 50, weight: 9.0,  power_avg: 60,  power_max: 180, max_panels_per_circuit: 20, data_per_panel: 1 },
        // Generic — typical specs for common pitches
        'Generic 1.5':  { brand: 'Generic', model: '1.5mm Indoor',          pitch: 1.56, px_w: 320, px_h: 160, cm_w: 50, cm_h: 25, weight: 5.5,  power_avg: 50,  power_max: 130, max_panels_per_circuit: 28, data_per_panel: 1 },
        'Generic 2.6':  { brand: 'Generic', model: '2.6mm Indoor',          pitch: 2.6,  px_w: 192, px_h: 192, cm_w: 50, cm_h: 50, weight: 8.5,  power_avg: 45,  power_max: 150, max_panels_per_circuit: 24, data_per_panel: 1 },
        'Generic 2.9':  { brand: 'Generic', model: '2.9mm Indoor',          pitch: 2.97, px_w: 168, px_h: 168, cm_w: 50, cm_h: 50, weight: 8.0,  power_avg: 45,  power_max: 135, max_panels_per_circuit: 20, data_per_panel: 1 },
        'Generic 3.9':  { brand: 'Generic', model: '3.9mm Indoor/Outdoor',  pitch: 3.91, px_w: 128, px_h: 128, cm_w: 50, cm_h: 50, weight: 8.5,  power_avg: 40,  power_max: 120, max_panels_per_circuit: 30, data_per_panel: 1 },
        'Generic 4.8':  { brand: 'Generic', model: '4.8mm Outdoor',         pitch: 4.81, px_w: 104, px_h: 104, cm_w: 50, cm_h: 50, weight: 9.0,  power_avg: 55,  power_max: 165, max_panels_per_circuit: 22, data_per_panel: 1 },
        'Custom':       { brand: 'Custom', model: 'Custom Panel',           pitch: 2.97, px_w: 168, px_h: 168, cm_w: 50, cm_h: 50, weight: 8.0,  power_avg: 45,  power_max: 135, max_panels_per_circuit: 20, data_per_panel: 1 },
    },

    // ================================================================
    // PROCESSOR DATABASE — real specs
    // ================================================================
    _processors: {
        // Novastar — verified from manufacturer datasheets (2026-03)
        'MCTRL4K':          { brand: 'Novastar', model: 'MCTRL4K',          max_pixels: 8800000,  outputs: 16, pixels_per_output: 650000,  input_types: ['HDMI 2.0', 'DP 1.2', 'Dual-Link DVI'], max_width: 7680,  max_height: 7680, has_backup: true },
        'NovaPro UHD Jr':   { brand: 'Novastar', model: 'NovaPro UHD Jr',   max_pixels: 10400000, outputs: 16, pixels_per_output: 650000,  input_types: ['HDMI 2.0', 'DP 1.2', 'DVI', '12G-SDI'], max_width: 16384, max_height: 8192, has_backup: true },
        'NovaPro UHD':      { brand: 'Novastar', model: 'NovaPro UHD',      max_pixels: 8800000,  outputs: 16, pixels_per_output: 650000,  input_types: ['HDMI 2.0', 'DP 1.2', 'DVI', '12G-SDI'], max_width: 8192, max_height: 8192, has_backup: true },
        'MCTRL660':         { brand: 'Novastar', model: 'MCTRL660',         max_pixels: 2600000,  outputs: 4,  pixels_per_output: 650000,  input_types: ['HDMI 1.4', 'DVI'], max_width: 3840, max_height: 3840, has_backup: false },
        'MCTRL300':         { brand: 'Novastar', model: 'MCTRL300',         max_pixels: 1300000,  outputs: 2,  pixels_per_output: 650000,  input_types: ['HDMI 1.3', 'DVI'], max_width: 3840, max_height: 3840, has_backup: false },
        'MCTRL R5':         { brand: 'Novastar', model: 'MCTRL R5',         max_pixels: 4140000,  outputs: 8,  pixels_per_output: 650000,  input_types: ['HDMI 1.4', 'Dual-Link DVI', '6G-SDI'], max_width: 3840, max_height: 3840, has_backup: true },
        'VX1000':           { brand: 'Novastar', model: 'VX1000',           max_pixels: 6500000,  outputs: 10, pixels_per_output: 650000,  input_types: ['HDMI 1.4', 'DVI', '3G-SDI'], max_width: 10240, max_height: 8192, has_backup: true },
        'VX600':            { brand: 'Novastar', model: 'VX600',            max_pixels: 3900000,  outputs: 6,  pixels_per_output: 650000,  input_types: ['HDMI 1.3', 'DVI', '3G-SDI'], max_width: 10240, max_height: 8192, has_backup: true },
        'VX400':            { brand: 'Novastar', model: 'VX400',            max_pixels: 2600000,  outputs: 4,  pixels_per_output: 650000,  input_types: ['HDMI 1.3', 'DVI', '3G-SDI'], max_width: 10240, max_height: 8192, has_backup: true },
        'MX40 Pro':         { brand: 'Novastar', model: 'MX40 Pro',         max_pixels: 9000000,  outputs: 20, pixels_per_output: 650000,  input_types: ['HDMI 2.0', 'DP 1.2', '12G-SDI'], max_width: 3840, max_height: 2160, has_backup: true },
        'CX40 Pro':         { brand: 'Novastar', model: 'CX40 Pro',         max_pixels: 9000000,  outputs: 6,  pixels_per_output: 2592000, input_types: ['HDMI 2.0', 'DP 1.2', '12G-SDI'], max_width: 4096, max_height: 2160, has_backup: true },
        'CX80 Pro':         { brand: 'Novastar', model: 'CX80 Pro',         max_pixels: 35400000, outputs: 16, pixels_per_output: 2592000, input_types: ['HDMI 2.1', 'DP 1.4', '12G-SDI'], max_width: 7680, max_height: 4320, has_backup: true },
        'H5':               { brand: 'Novastar', model: 'H Series H5',      max_pixels: 31200000, outputs: 48, pixels_per_output: 650000, input_types: ['HDMI 2.0', 'DP 1.2', '12G-SDI', 'DVI'], max_width: 4096, max_height: 2160, has_backup: true },
        'H9':               { brand: 'Novastar', model: 'H Series H9',      max_pixels: 65000000, outputs: 80, pixels_per_output: 650000, input_types: ['HDMI 2.0', 'DP 1.2', '12G-SDI', 'DVI'], max_width: 4096, max_height: 2160, has_backup: true },
        'H15':              { brand: 'Novastar', model: 'H Series H15',     max_pixels: 130000000, outputs: 160, pixels_per_output: 650000, input_types: ['HDMI 2.0', 'DP 1.2', '12G-SDI', 'DVI'], max_width: 8192, max_height: 4320, has_backup: true },
        // Brompton — verified from manufacturer datasheets (2026-03)
        'Tessera SX40':     { brand: 'Brompton', model: 'Tessera SX40',     max_pixels: 9000000,  outputs: 4,  pixels_per_output: 2250000, input_types: ['HDMI 2.0', '12G-SDI'], max_width: 4096, max_height: 2160, has_backup: true },
        'Tessera S8':       { brand: 'Brompton', model: 'Tessera S8',       max_pixels: 4200000,  outputs: 8,  pixels_per_output: 525000,  input_types: ['HDMI 2.0', '12G-SDI'], max_width: 4096, max_height: 2160, has_backup: true },
        'Tessera S4':       { brand: 'Brompton', model: 'Tessera S4',       max_pixels: 2100000,  outputs: 4,  pixels_per_output: 525000,  input_types: ['DVI'], max_width: 1920, max_height: 1200, has_backup: false },
        // Megapixel — verified from manufacturer datasheets (2026-03)
        'Helios':           { brand: 'Megapixel', model: 'Helios',          max_pixels: 34000000, outputs: 8,  pixels_per_output: 4250000, input_types: ['HDMI 2.0', 'DP 1.4', 'SDI', 'ST 2110'], max_width: 8192, max_height: 4320, has_backup: true },
        // Colorlight — verified from manufacturer datasheets (2026-03)
        'Colorlight X20':   { brand: 'Colorlight', model: 'X20',            max_pixels: 13000000, outputs: 20, pixels_per_output: 650000,  input_types: ['HDMI 2.0', 'HDMI 1.4', 'DP 1.2', 'DVI'], max_width: 16384, max_height: 8192, has_backup: true },
        'Colorlight X16':   { brand: 'Colorlight', model: 'X16',            max_pixels: 8880000,  outputs: 16, pixels_per_output: 555000,  input_types: ['HDMI 2.0', 'DVI', 'SDI'], max_width: 8192, max_height: 4096, has_backup: false },
        'Colorlight Z6':    { brand: 'Colorlight', model: 'Z6',             max_pixels: 8300000,  outputs: 16, pixels_per_output: 518750,  input_types: ['HDMI 2.0', 'DP 1.2', 'DVI', 'SDI'], max_width: 8192, max_height: 4096, has_backup: true },
    },

    // ================================================================
    // STATE
    // ================================================================
    _config: {
        panelKey: 'Absen PL2.9',
        processorKey: 'MCTRL4K',
        cols: 6,
        rows: 4,
        customPanel: null,
        powerCircuitAmps: 16,
        powerVoltage: 230,
        useBackup: false,
    },

    _result: null,

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        const c = this._config;
        const panel = this._panels[c.panelKey] || this._panels['Absen PL2.9'];
        const proc = this._processors[c.processorKey];

        // Group panels by brand
        const brandGroups = {};
        for (const [key, p] of Object.entries(this._panels)) {
            if (!brandGroups[p.brand]) brandGroups[p.brand] = [];
            brandGroups[p.brand].push({ key, ...p });
        }

        // Group processors by brand
        const procGroups = {};
        for (const [key, p] of Object.entries(this._processors)) {
            if (!procGroups[p.brand]) procGroups[p.brand] = [];
            procGroups[p.brand].push({ key, ...p });
        }

        return `
        <style>
            .lc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .lc-full { grid-column: 1 / -1; }
            .lc-input-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
            .lc-input-row label { min-width: 140px; font-size: 12px; color: var(--text-muted); font-weight: 600; }
            .lc-input-row .form-control { max-width: 200px; }
            .lc-stat { text-align: center; padding: 14px 10px; }
            .lc-stat-val { font-size: 22px; font-weight: 800; color: var(--accent); }
            .lc-stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
            .lc-stat.warn .lc-stat-val { color: #f59e0b; }
            .lc-stat.danger .lc-stat-val { color: #ef4444; }
            .lc-stat.ok .lc-stat-val { color: #4ade80; }
            .lc-port-map { display: flex; flex-direction: column; gap: 8px; }
            .lc-port-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border); }
            .lc-port-badge { min-width: 32px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; }
            .lc-port-info { flex: 1; font-size: 11px; color: var(--text-secondary); }
            .lc-port-panels { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
            .lc-port-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); margin-top: 4px; overflow: hidden; }
            .lc-port-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
            .lc-diagram-wrap { position: relative; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border); overflow: auto; min-height: 350px; }
            .lc-diagram-canvas { position: relative; min-width: 100%; min-height: 350px; }
            .lc-diagram-panel { position: absolute; width: 38px; height: 38px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800; color: #fff; border: 2px solid; transition: all 0.2s; cursor: default; }
            .lc-diagram-panel:hover { transform: scale(1.15); z-index: 10; }
            .lc-diagram-proc { position: absolute; background: var(--bg-tertiary); border: 2px solid var(--accent); border-radius: 8px; padding: 8px 14px; font-size: 11px; font-weight: 700; color: var(--accent); text-align: center; }
            .lc-diagram-line { position: absolute; pointer-events: none; }
            .lc-power-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border); margin-bottom: 6px; }
            .lc-power-icon { font-size: 16px; }
            .lc-power-info { flex: 1; }
            .lc-panel-spec { font-size: 11px; color: var(--text-secondary); display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border); }
            .lc-panel-spec span { display: flex; align-items: center; gap: 4px; }
            .lc-panel-spec i { color: var(--text-muted); font-size: 10px; }
        </style>

        <div class="section-header">
            <h2><i class="fas fa-plug"></i> LED Auto-Connect</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="LedConnectPage._reset()"><i class="fas fa-undo"></i> Reset</button>
                <button class="btn btn-sm btn-accent" onclick="LedConnectPage._exportReport()"><i class="fas fa-file-export"></i> Export Report</button>
            </div>
        </div>

        <div class="lc-grid">
            <!-- Panel Selection -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-th-large"></i> LED Panel</h3></div>
                <div class="card-body">
                    <div class="lc-input-row">
                        <label>Panel Type</label>
                        <select class="form-control" id="lc-panel" onchange="LedConnectPage._onPanelChange()" style="max-width:220px;">
                            ${Object.entries(brandGroups).map(([brand, items]) =>
                                `<optgroup label="${brand}">${items.map(i =>
                                    `<option value="${i.key}" ${i.key === c.panelKey ? 'selected' : ''}>${i.model} (${i.pitch}mm)</option>`
                                ).join('')}</optgroup>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="lc-panel-spec" id="lc-panel-spec">
                        <span><i class="fas fa-ruler"></i> ${panel.pitch}mm pitch</span>
                        <span><i class="fas fa-expand"></i> ${panel.px_w}×${panel.px_h}px</span>
                        <span><i class="fas fa-arrows-alt-h"></i> ${panel.cm_w}×${panel.cm_h}cm</span>
                        <span><i class="fas fa-weight-hanging"></i> ${panel.weight}kg</span>
                        <span><i class="fas fa-bolt"></i> ${panel.power_max}W max</span>
                        <span><i class="fas fa-plug"></i> ${panel.max_panels_per_circuit || 12} panels/circuit</span>
                    </div>
                    <div style="margin-top:12px;" id="lc-custom-fields" ${c.panelKey !== 'Custom' ? 'style="display:none;margin-top:12px;"' : ''}>
                        <div class="lc-input-row"><label>Pixel Width</label><input type="number" class="form-control" id="lc-cpx-w" value="${panel.px_w}" min="1" oninput="LedConnectPage._recalc()" style="max-width:100px;"></div>
                        <div class="lc-input-row"><label>Pixel Height</label><input type="number" class="form-control" id="lc-cpx-h" value="${panel.px_h}" min="1" oninput="LedConnectPage._recalc()" style="max-width:100px;"></div>
                        <div class="lc-input-row"><label>Panel Width (cm)</label><input type="number" class="form-control" id="lc-ccm-w" value="${panel.cm_w}" min="1" oninput="LedConnectPage._recalc()" style="max-width:100px;"></div>
                        <div class="lc-input-row"><label>Panel Height (cm)</label><input type="number" class="form-control" id="lc-ccm-h" value="${panel.cm_h}" min="1" oninput="LedConnectPage._recalc()" style="max-width:100px;"></div>
                        <div class="lc-input-row"><label>Power Max (W)</label><input type="number" class="form-control" id="lc-cpow" value="${panel.power_max}" min="1" oninput="LedConnectPage._recalc()" style="max-width:100px;"></div>
                    </div>
                </div>
            </div>

            <!-- Wall Size -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-expand-arrows-alt"></i> Wall Configuration</h3></div>
                <div class="card-body">
                    <div class="lc-input-row">
                        <label>Columns (wide)</label>
                        <input type="number" class="form-control" id="lc-cols" value="${c.cols}" min="1" max="200" oninput="LedConnectPage._recalc()" style="max-width:100px;">
                    </div>
                    <div class="lc-input-row">
                        <label>Rows (high)</label>
                        <input type="number" class="form-control" id="lc-rows" value="${c.rows}" min="1" max="200" oninput="LedConnectPage._recalc()" style="max-width:100px;">
                    </div>
                    <div class="lc-input-row">
                        <label>Power Circuit (A)</label>
                        <input type="number" class="form-control" id="lc-amps" value="${c.powerCircuitAmps}" min="1" max="63" oninput="LedConnectPage._recalc()" style="max-width:100px;">
                    </div>
                    <div class="lc-input-row">
                        <label>Voltage (V)</label>
                        <select class="form-control" id="lc-voltage" onchange="LedConnectPage._recalc()" style="max-width:100px;">
                            <option value="230" ${c.powerVoltage === 230 ? 'selected' : ''}>230V</option>
                            <option value="110" ${c.powerVoltage === 110 ? 'selected' : ''}>110V</option>
                        </select>
                    </div>
                    <div class="lc-input-row">
                        <label>Backup Data</label>
                        <label style="display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer;">
                            <input type="checkbox" id="lc-backup" ${c.useBackup ? 'checked' : ''} onchange="LedConnectPage._onBackupChange()">
                            <span style="font-size:11px;color:${proc.has_backup ? '#4ade80' : '#ef4444'};">${proc.has_backup ? 'Processor supports backup' : 'No backup on this processor'}</span>
                        </label>
                    </div>
                    <div id="lc-wall-summary" style="margin-top:10px;"></div>
                </div>
            </div>

            <!-- Processor Selection -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-microchip"></i> Processor</h3></div>
                <div class="card-body">
                    <div class="lc-input-row">
                        <label>Processor</label>
                        <select class="form-control" id="lc-proc" onchange="LedConnectPage._onProcChange()" style="max-width:220px;">
                            ${Object.entries(procGroups).map(([brand, items]) =>
                                `<optgroup label="${brand}">${items.map(i =>
                                    `<option value="${i.key}" ${i.key === c.processorKey ? 'selected' : ''}>${i.model} (${i.outputs} out)</option>`
                                ).join('')}</optgroup>`
                            ).join('')}
                        </select>
                    </div>
                    <div id="lc-proc-spec" class="lc-panel-spec" style="margin-top:8px;">
                        <span><i class="fas fa-microchip"></i> ${proc.brand} ${proc.model}</span>
                        <span><i class="fas fa-ethernet"></i> ${proc.outputs} outputs</span>
                        <span><i class="fas fa-th"></i> ${(proc.max_pixels / 1e6).toFixed(1)}M pixels</span>
                        <span><i class="fas fa-desktop"></i> ${proc.max_width}×${proc.max_height}</span>
                        <span><i class="fas fa-th-large"></i> Max ${this._getMaxPanelsPerPort(proc, panel)} panels/port</span>
                        <span><i class="fas fa-plug"></i> ${proc.input_types.join(', ')}</span>
                        ${proc.has_backup ? '<span style="color:#4ade80;"><i class="fas fa-shield-alt"></i> Backup</span>' : ''}
                    </div>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-chart-bar"></i> Overview</h3></div>
                <div class="card-body" id="lc-stats-body" style="padding:0;">
                    <!-- Filled by _recalc -->
                </div>
            </div>

            <!-- Auto-Config Button -->
            <div class="lc-full" style="text-align:center;padding:4px 0;">
                <button class="btn btn-accent" style="font-size:14px;padding:12px 40px;" onclick="LedConnectPage._autoConfig()">
                    <i class="fas fa-magic"></i> Auto Configure Connection Map
                </button>
            </div>

            <!-- Data Port Mapping -->
            <div class="card lc-full" id="lc-portmap-card" style="display:none;">
                <div class="card-header"><h3><i class="fas fa-ethernet"></i> Data Port Mapping</h3></div>
                <div class="card-body" id="lc-portmap-body"></div>
            </div>

            <!-- Power Distribution -->
            <div class="card lc-full" id="lc-power-card" style="display:none;">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> Power Distribution</h3></div>
                <div class="card-body" id="lc-power-body"></div>
            </div>

            <!-- Data Connection Diagram -->
            <div class="card lc-full" id="lc-data-diagram-card" style="display:none;">
                <div class="card-header"><h3><i class="fas fa-ethernet"></i> Data Connection Diagram</h3></div>
                <div class="card-body" style="padding:0;overflow-x:auto;" id="lc-data-diagram-body"></div>
            </div>

            <!-- Power Connection Diagram -->
            <div class="card lc-full" id="lc-power-diagram-card" style="display:none;">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> Power Connection Diagram</h3></div>
                <div class="card-body" style="padding:0;overflow-x:auto;" id="lc-power-diagram-body"></div>
            </div>
        </div>
        `;
    },

    onActivate() {
        this._recalc();
    },

    // ================================================================
    // EVENT HANDLERS
    // ================================================================
    _onPanelChange() {
        const sel = document.getElementById('lc-panel');
        this._config.panelKey = sel.value;
        const custom = document.getElementById('lc-custom-fields');
        if (custom) custom.style.display = sel.value === 'Custom' ? 'block' : 'none';
        this._updatePanelSpec();
        this._recalc();
    },

    _onProcChange() {
        const sel = document.getElementById('lc-proc');
        this._config.processorKey = sel.value;
        this._updateProcSpec();
        this._recalc();
    },

    _onBackupChange() {
        this._config.useBackup = document.getElementById('lc-backup')?.checked || false;
        this._recalc();
    },

    _updatePanelSpec() {
        const panel = this._getPanel();
        const el = document.getElementById('lc-panel-spec');
        if (!el) return;
        el.innerHTML = `
            <span><i class="fas fa-ruler"></i> ${panel.pitch}mm pitch</span>
            <span><i class="fas fa-expand"></i> ${panel.px_w}×${panel.px_h}px</span>
            <span><i class="fas fa-arrows-alt-h"></i> ${panel.cm_w}×${panel.cm_h}cm</span>
            <span><i class="fas fa-weight-hanging"></i> ${panel.weight}kg</span>
            <span><i class="fas fa-bolt"></i> ${panel.power_max}W max</span>
            <span><i class="fas fa-plug"></i> ${panel.max_panels_per_circuit || 12} panels/circuit</span>
        `;
    },

    _updateProcSpec() {
        const proc = this._getProc();
        const panel = this._getPanel();
        const el = document.getElementById('lc-proc-spec');
        if (!el) return;
        el.innerHTML = `
            <span><i class="fas fa-microchip"></i> ${proc.brand} ${proc.model}</span>
            <span><i class="fas fa-ethernet"></i> ${proc.outputs} outputs</span>
            <span><i class="fas fa-th"></i> ${(proc.max_pixels / 1e6).toFixed(1)}M pixels</span>
            <span><i class="fas fa-desktop"></i> ${proc.max_width}×${proc.max_height}</span>
            <span><i class="fas fa-th-large"></i> Max ${this._getMaxPanelsPerPort(proc, panel)} panels/port</span>
            <span><i class="fas fa-plug"></i> ${proc.input_types.join(', ')}</span>
            ${proc.has_backup ? '<span style="color:#4ade80;"><i class="fas fa-shield-alt"></i> Backup</span>' : ''}
        `;
    },

    _getPanel() {
        const c = this._config;
        const panel = { ...this._panels[c.panelKey] } || { ...this._panels['Absen PL2.9'] };
        if (c.panelKey === 'Custom') {
            const gv = (id, fb) => { const e = document.getElementById(id); return e ? parseInt(e.value) || fb : fb; };
            panel.px_w = gv('lc-cpx-w', 168);
            panel.px_h = gv('lc-cpx-h', 168);
            panel.cm_w = gv('lc-ccm-w', 50);
            panel.cm_h = gv('lc-ccm-h', 50);
            panel.power_max = gv('lc-cpow', 540);
        }
        return panel;
    },

    // Calculate max panels per port dynamically based on selected panel + processor
    _getMaxPanelsPerPort(proc, panel) {
        if (!proc || !panel) return 22;
        const pixelsPerPanel = panel.px_w * panel.px_h;
        if (pixelsPerPanel <= 0) return 22;
        return Math.floor(proc.pixels_per_output / pixelsPerPanel);
    },

    _getProc() {
        return this._processors[this._config.processorKey] || this._processors['MCTRL4K'];
    },

    // ================================================================
    // RECALCULATE (live stats, no auto-config yet)
    // ================================================================
    _recalc() {
        const c = this._config;
        c.cols = parseInt(document.getElementById('lc-cols')?.value) || c.cols;
        c.rows = parseInt(document.getElementById('lc-rows')?.value) || c.rows;
        c.powerCircuitAmps = parseInt(document.getElementById('lc-amps')?.value) || 16;
        c.powerVoltage = parseInt(document.getElementById('lc-voltage')?.value) || 230;

        const panel = this._getPanel();
        const proc = this._getProc();

        const totalPanels = c.cols * c.rows;
        const totalPxW = c.cols * panel.px_w;
        const totalPxH = c.rows * panel.px_h;
        const totalPixels = totalPxW * totalPxH;
        const wallW_m = (c.cols * panel.cm_w / 100).toFixed(2);
        const wallH_m = (c.rows * panel.cm_h / 100).toFixed(2);
        const totalWeight = (totalPanels * panel.weight).toFixed(1);
        const totalPowerMax = totalPanels * panel.power_max;
        const totalPowerAvg = totalPanels * panel.power_avg;

        const panelsPerCircuit = panel.max_panels_per_circuit || 12;
        const circuitsNeeded = Math.ceil(totalPanels / panelsPerCircuit);

        const portsByPixels = Math.ceil(totalPixels / proc.pixels_per_output);
        const maxPanelsPort = this._getMaxPanelsPerPort(proc, panel);
        const portsByPanels = Math.ceil(totalPanels / maxPanelsPort);
        const portsNeeded = Math.max(portsByPixels, portsByPanels);
        const availablePorts = c.useBackup ? Math.floor(proc.outputs / 2) : proc.outputs;
        const portsFit = portsNeeded <= availablePorts;
        const pixelsFit = totalPixels <= proc.max_pixels;
        const resFit = totalPxW <= proc.max_width && totalPxH <= proc.max_height;
        const allGood = portsFit && pixelsFit && resFit;

        // Wall summary
        const ws = document.getElementById('lc-wall-summary');
        if (ws) {
            ws.innerHTML = `
                <div class="lc-panel-spec">
                    <span><i class="fas fa-th"></i> ${totalPanels} panels</span>
                    <span><i class="fas fa-expand"></i> ${totalPxW}×${totalPxH} px</span>
                    <span><i class="fas fa-arrows-alt-h"></i> ${wallW_m}×${wallH_m} m</span>
                    <span><i class="fas fa-weight-hanging"></i> ${totalWeight} kg</span>
                </div>
            `;
        }

        // Stats
        const sb = document.getElementById('lc-stats-body');
        if (sb) {
            sb.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:8px;overflow:hidden;">
                    <div class="lc-stat"><div class="lc-stat-val">${totalPanels}</div><div class="lc-stat-label">Total Panels</div></div>
                    <div class="lc-stat"><div class="lc-stat-val">${totalPxW}×${totalPxH}</div><div class="lc-stat-label">Resolution</div></div>
                    <div class="lc-stat ${pixelsFit ? 'ok' : 'danger'}"><div class="lc-stat-val">${(totalPixels / 1e6).toFixed(2)}M</div><div class="lc-stat-label">Total Pixels</div></div>
                    <div class="lc-stat ${portsFit ? 'ok' : 'danger'}"><div class="lc-stat-val">${portsNeeded} / ${availablePorts}</div><div class="lc-stat-label">Ports ${c.useBackup ? '(+backup)' : ''}</div></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);overflow:hidden;">
                    <div class="lc-stat"><div class="lc-stat-val">${wallW_m}m</div><div class="lc-stat-label">Width</div></div>
                    <div class="lc-stat"><div class="lc-stat-val">${wallH_m}m</div><div class="lc-stat-label">Height</div></div>
                    <div class="lc-stat ${circuitsNeeded > 1 ? 'warn' : 'ok'}"><div class="lc-stat-val">${(totalPowerMax / 1000).toFixed(1)}kW</div><div class="lc-stat-label">Max Power</div></div>
                    <div class="lc-stat"><div class="lc-stat-val">${circuitsNeeded}</div><div class="lc-stat-label">Circuits (${panelsPerCircuit}p/cir)</div></div>
                </div>
                <div style="padding:10px 14px;">
                    ${allGood
                        ? `<div style="color:#4ade80;font-size:12px;font-weight:700;"><i class="fas fa-check-circle"></i> Processor can handle this wall — press Auto Configure</div>
                           ${c.useBackup ? '<div style="color:#06b6d4;font-size:11px;margin-top:4px;"><i class="fas fa-shield-alt"></i> Backup mode: ' + portsNeeded + ' primary + ' + portsNeeded + ' backup = ' + (portsNeeded * 2) + ' ports used of ' + proc.outputs + '</div>' : ''}`
                        : `<div style="color:#ef4444;font-size:12px;font-weight:700;"><i class="fas fa-exclamation-triangle"></i> ${!pixelsFit ? 'Exceeds processor pixel capacity!' : ''} ${!portsFit ? 'Not enough output ports!' + (c.useBackup ? ' (Backup uses half the ports)' : '') : ''} ${!resFit ? 'Resolution exceeds ' + proc.max_width + '×' + proc.max_height + ' max!' : ''}</div>
                           <div style="color:#f59e0b;font-size:11px;margin-top:4px;"><i class="fas fa-info-circle"></i> Consider using multiple processors or a higher-capacity unit.</div>`
                    }
                </div>
            `;
        }
    },

    // ================================================================
    // AUTO CONFIG — the main algorithm
    // ================================================================
    _autoConfig() {
        const c = this._config;
        const panel = this._getPanel();
        const proc = this._getProc();

        const totalPanels = c.cols * c.rows;
        const totalPxW = c.cols * panel.px_w;
        const totalPxH = c.rows * panel.px_h;
        const totalPixels = totalPxW * totalPxH;
        const pixelsPerPort = proc.pixels_per_output;
        const maxPanelsPerPort = this._getMaxPanelsPerPort(proc, panel);

        // Build panel grid with coordinates
        const panelGrid = [];
        for (let row = 0; row < c.rows; row++) {
            for (let col = 0; col < c.cols; col++) {
                panelGrid.push({
                    row, col,
                    id: row * c.cols + col,
                    px_x: col * panel.px_w,
                    px_y: row * panel.px_h,
                    pixels: panel.px_w * panel.px_h,
                });
            }
        }

        // Calculate how many ports we need, then distribute evenly
        // But if wall uses all available ports, fill each port to max capacity
        const availPorts = c.useBackup ? Math.floor(proc.outputs / 2) : proc.outputs;
        const pixelsPerPanel = panel.px_w * panel.px_h;
        const maxByPixels = Math.floor(pixelsPerPort / pixelsPerPanel);
        const maxPerPort = Math.min(maxByPixels, maxPanelsPerPort);
        const numPorts = Math.ceil(totalPanels / maxPerPort);
        // If we need all (or more than) available ports, fill to max — no point spreading thin
        const panelsPerPort = (numPorts >= availPorts)
            ? maxPerPort
            : Math.ceil(totalPanels / numPorts);

        // Build serpentine panel order (column by column, alternating direction)
        const orderedPanels = [];
        for (let col = 0; col < c.cols; col++) {
            const colPanels = panelGrid.filter(p => p.col === col);
            if (col % 2 === 1) colPanels.reverse();
            orderedPanels.push(...colPanels);
        }

        // Distribute panels evenly across ports
        const ports = [];
        for (let i = 0; i < numPorts; i++) {
            const start = i * panelsPerPort;
            const end = Math.min(start + panelsPerPort, totalPanels);
            const portPanels = orderedPanels.slice(start, end);
            ports.push({
                index: i,
                panels: portPanels,
                pixels: portPanels.length * pixelsPerPanel,
            });
        }

        // Check if we exceed available ports
        const portsNeeded = ports.length;
        const portsFit = portsNeeded <= proc.outputs;

        // Power distribution — distribute evenly using manufacturer max panels per circuit
        const powerPerPanel = panel.power_max;
        const maxPanelsPerCircuit = panel.max_panels_per_circuit || 12;
        const numCircuits = Math.ceil(totalPanels / maxPanelsPerCircuit);
        const panelsPerCircuit = Math.ceil(totalPanels / numCircuits); // even split
        const circuits = [];
        for (let i = 0; i < numCircuits; i++) {
            const start = i * panelsPerCircuit;
            const count = Math.min(panelsPerCircuit, totalPanels - start);
            circuits.push({
                index: i,
                panelStart: start,
                panelCount: count,
                watts: count * powerPerPanel,
                amps: ((count * powerPerPanel) / c.powerVoltage).toFixed(1),
            });
        }

        this._result = { ports, circuits, panel, proc, cols: c.cols, rows: c.rows, totalPanels, totalPixels, totalPxW, totalPxH };

        // Render port map
        this._renderPortMap(ports, proc, pixelsPerPort, portsFit);

        // Render power distribution
        this._renderPower(circuits);

        // Render diagrams (SVG)
        this._renderDataDiagram(ports, panel, proc);
        this._renderPowerDiagram(circuits, panel);

        // Show cards
        document.getElementById('lc-portmap-card').style.display = '';
        document.getElementById('lc-power-card').style.display = '';
        document.getElementById('lc-data-diagram-card').style.display = '';
        document.getElementById('lc-power-diagram-card').style.display = '';
    },

    // ================================================================
    // RENDER PORT MAP
    // ================================================================
    _renderPortMap(ports, proc, pixelsPerPort, portsFit) {
        const body = document.getElementById('lc-portmap-body');
        if (!body) return;

        const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
                        '#84cc16', '#e879f9', '#fb923c', '#38bdf8', '#c084fc', '#facc15', '#4ade80', '#f472b6', '#2dd4bf', '#a78bfa'];

        body.innerHTML = `
            ${!portsFit ? '<div style="padding:10px 14px;color:#ef4444;font-weight:700;font-size:12px;border-bottom:1px solid var(--border);"><i class="fas fa-exclamation-triangle"></i> Warning: Need ' + ports.length + ' ports but processor only has ' + proc.outputs + '. Consider multiple processors.</div>' : ''}
            <div class="lc-port-map">
                ${ports.map((port, i) => {
                    const pct = Math.round((port.pixels / pixelsPerPort) * 100);
                    const color = colors[i % colors.length];
                    const firstP = port.panels[0];
                    const lastP = port.panels[port.panels.length - 1];
                    const routeDir = firstP && lastP ? (firstP.row <= lastP.row ? '↓' : '↑') : '';
                    return `
                        <div class="lc-port-row">
                            <div class="lc-port-badge" style="background:${color};">P${i + 1}</div>
                            <div style="flex:1;">
                                <div class="lc-port-info">
                                    <strong>${port.panels.length} panels</strong> &nbsp;·&nbsp; ${port.pixels.toLocaleString()} pixels &nbsp;·&nbsp; ${pct}% capacity
                                    ${i >= proc.outputs ? ' <span style="color:#ef4444;font-weight:700;">⚠ OVERFLOW</span>' : ''}
                                </div>
                                <div class="lc-port-panels">
                                    ${routeDir} Route: ${port.panels.map(p => `[${p.col},${p.row}]`).join(' → ')}
                                </div>
                                <div class="lc-port-bar">
                                    <div class="lc-port-bar-fill" style="width:${Math.min(pct, 100)}%;background:${color};${pct > 90 ? 'box-shadow:0 0 6px ' + color + '80;' : ''}"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // ================================================================
    // RENDER POWER
    // ================================================================
    _renderPower(circuits) {
        const body = document.getElementById('lc-power-body');
        if (!body) return;
        const c = this._config;
        const panel = this._getPanel();
        const maxPerCircuit = panel.max_panels_per_circuit || 12;

        body.innerHTML = `
            <div style="margin-bottom:10px;font-size:12px;color:var(--text-secondary);">
                <i class="fas fa-info-circle" style="color:var(--accent);"></i>
                Max <strong>${maxPerCircuit} panels</strong> per circuit for ${panel.brand} ${panel.model}.
                Total circuits needed: <strong style="color:${circuits.length > 1 ? '#f59e0b' : '#4ade80'};">${circuits.length}</strong>
            </div>
            ${circuits.map((cir, i) => {
                const pct = Math.round((cir.panelCount / maxPerCircuit) * 100);
                return `
                    <div class="lc-power-row">
                        <div class="lc-power-icon" style="color:#f59e0b;">⚡</div>
                        <div class="lc-power-info">
                            <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Circuit ${i + 1}</div>
                            <div style="font-size:11px;color:var(--text-muted);">${cir.panelCount} panels · ${cir.watts}W (${cir.amps}A) · ${pct}% load</div>
                            <div class="lc-port-bar" style="margin-top:4px;">
                                <div class="lc-port-bar-fill" style="width:${Math.min(pct, 100)}%;background:${pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#4ade80'};"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    },

    // ================================================================
    // RENDER VISUAL DIAGRAM (Canvas)
    // ================================================================
    // ================================================================
    // DATA CONNECTION DIAGRAM (SVG — simple straight lines)
    // ================================================================
    _renderDataDiagram(ports, panel, proc) {
        const body = document.getElementById('lc-data-diagram-body');
        if (!body) return;

        const cols = this._config.cols;
        const rows = this._config.rows;
        const useBackup = this._config.useBackup;
        const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1',
                        '#84cc16','#e879f9','#fb923c','#38bdf8','#c084fc','#facc15','#4ade80','#f472b6','#2dd4bf','#a78bfa'];

        const cellW = 50, cellH = 50, gap = 4, pad = 24;
        const gridLeft = useBackup ? 260 : 140;
        const gridTop = 50;
        const procBoxW = useBackup ? 200 : 90;
        const portSpacing = 26;
        const totalPortRows = useBackup ? ports.length : ports.length;
        const procBoxH = Math.max(totalPortRows * portSpacing + 24, 60);
        const svgW = gridLeft + cols * (cellW + gap) + (useBackup ? 80 + ports.length * 4 : pad);
        const svgH = Math.max(gridTop + rows * (cellH + gap) + 40, gridTop + procBoxH + 40);

        // Panel→port lookup
        const panelInfo = {};
        ports.forEach((port, i) => {
            port.panels.forEach((p, pi) => { panelInfo[p.id] = { color: colors[i % colors.length], port: i + 1, order: pi + 1 }; });
        });

        // Build SVG
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="background:#0f1117;border-radius:8px;display:block;">`;
        svg += `<style>text{font-family:system-ui,-apple-system,sans-serif;}</style>`;

        // Processor box
        const procX = pad, procY = gridTop;
        svg += `<rect x="${procX}" y="${procY}" width="${procBoxW}" height="${procBoxH}" rx="6" fill="#1a1d27" stroke="#00d4aa" stroke-width="2"/>`;
        svg += `<text x="${procX + procBoxW/2}" y="${procY + 16}" text-anchor="middle" font-size="10" font-weight="700" fill="#00d4aa">${proc.model}</text>`;

        // Port labels + dots on processor
        ports.forEach((port, i) => {
            const py = procY + 30 + i * portSpacing;
            const color = colors[i % colors.length];
            svg += `<circle cx="${procX + procBoxW}" cy="${py}" r="4" fill="${color}"/>`;
            svg += `<text x="${procX + 8}" y="${py + 3}" font-size="9" font-weight="600" fill="#94a3b8">P${i + 1}</text>`;
            svg += `<text x="${procX + 30}" y="${py + 3}" font-size="8" fill="#64748b">${port.panels.length}p</text>`;
            if (useBackup) {
                // Show backup port label
                svg += `<text x="${procX + 58}" y="${py + 3}" font-size="7" font-weight="600" fill="#f59e0b">B${i + 1}</text>`;
                svg += `<circle cx="${procX + procBoxW - 8}" cy="${py}" r="3" fill="#f59e0b40" stroke="#f59e0b" stroke-width="1"/>`;
            }
        });

        // Connection lines (straight 90° lines: horizontal out, vertical to row, horizontal to panel)
        ports.forEach((port, i) => {
            if (port.panels.length === 0) return;
            const color = colors[i % colors.length];
            const fromY = procY + 30 + i * portSpacing;
            const first = port.panels[0];
            const toX = gridLeft + first.col * (cellW + gap) + cellW / 2;
            const toY = gridTop + first.row * (cellH + gap) + cellH / 2;
            // 90° route: horizontal → vertical → horizontal
            const midX = procX + procBoxW + 8 + i * 4;
            svg += `<polyline points="${procX + procBoxW + 4},${fromY} ${midX},${fromY} ${midX},${toY} ${toX},${toY}" fill="none" stroke="${color}80" stroke-width="1.5"/>`;

            // Chain arrows between panels (straight vertical or 90° turn)
            for (let j = 1; j < port.panels.length; j++) {
                const prev = port.panels[j-1];
                const curr = port.panels[j];
                const px = gridLeft + prev.col * (cellW + gap) + cellW / 2;
                const py2 = gridTop + prev.row * (cellH + gap) + cellH / 2;
                const cx = gridLeft + curr.col * (cellW + gap) + cellW / 2;
                const cy = gridTop + curr.row * (cellH + gap) + cellH / 2;

                if (prev.col === curr.col) {
                    // Straight vertical
                    svg += `<line x1="${px}" y1="${py2}" x2="${cx}" y2="${cy}" stroke="${color}50" stroke-width="1" stroke-dasharray="3,2"/>`;
                    // Arrow
                    const dir = cy > py2 ? 1 : -1;
                    svg += `<polygon points="${cx},${cy - dir * 2} ${cx - 3},${cy - dir * 7} ${cx + 3},${cy - dir * 7}" fill="${color}80"/>`;
                } else {
                    // 90° turn at column boundary
                    const midY = py2 + (cy > py2 ? (cellH + gap) / 2 : -(cellH + gap) / 2);
                    svg += `<polyline points="${px},${py2} ${px},${midY} ${cx},${midY} ${cx},${cy}" fill="none" stroke="${color}50" stroke-width="1" stroke-dasharray="3,2"/>`;
                }
            }
        });

        // LED panel cells
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const pid = row * cols + col;
                const info = panelInfo[pid] || { color: '#555', port: '?', order: 0 };
                const x = gridLeft + col * (cellW + gap);
                const y = gridTop + row * (cellH + gap);
                svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="${info.color}22" stroke="${info.color}" stroke-width="1.5"/>`;
                svg += `<text x="${x + cellW/2}" y="${y + 18}" text-anchor="middle" font-size="9" font-weight="700" fill="${info.color}">${col},${row}</text>`;
                svg += `<text x="${x + cellW/2}" y="${y + 32}" text-anchor="middle" font-size="8" fill="${info.color}99">P${info.port}</text>`;
                svg += `<text x="${x + cellW/2}" y="${y + 44}" text-anchor="middle" font-size="7" fill="${info.color}60">#${info.order}</text>`;
            }
        }

        // Legend
        // Backup connections (dashed orange from right side of grid)
        if (useBackup) {
            ports.forEach((port, i) => {
                if (port.panels.length === 0) return;
                const last = port.panels[port.panels.length - 1];
                const lx = gridLeft + last.col * (cellW + gap) + cellW;
                const ly = gridTop + last.row * (cellH + gap) + cellH / 2;
                const backupX = gridLeft + cols * (cellW + gap) + 10 + i * 4;
                const backupLabelY = procY + 30 + i * portSpacing;
                // Draw backup line from last panel to right margin
                svg += `<polyline points="${lx},${ly} ${backupX},${ly} ${backupX},${backupLabelY} ${gridLeft + cols * (cellW + gap) + 30},${backupLabelY}" fill="none" stroke="#f59e0b50" stroke-width="1.5" stroke-dasharray="4,3"/>`;
                // Backup label
                svg += `<text x="${gridLeft + cols * (cellW + gap) + 34}" y="${backupLabelY + 3}" font-size="8" font-weight="600" fill="#f59e0b">B${i + 1}</text>`;
            });
        }

        svg += `<text x="${gridLeft}" y="${svgH - 10}" font-size="9" fill="#475569">Color = Ethernet port · Dashed = data chain · # = chain order${useBackup ? ' · Orange dashed = backup path' : ''}</text>`;
        svg += `</svg>`;

        body.innerHTML = svg;
    },

    // ================================================================
    // POWER CONNECTION DIAGRAM (SVG)
    // ================================================================
    _renderPowerDiagram(circuits, panel) {
        const body = document.getElementById('lc-power-diagram-body');
        if (!body) return;

        const c = this._config;
        const cols = c.cols;
        const rows = c.rows;
        const cellW = 50, cellH = 50, gap = 4, pad = 24;
        const gridLeft = 140;
        const gridTop = 50;

        // Assign panels to circuits
        const panelCircuit = {};
        const circuitColors = ['#f59e0b','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
        circuits.forEach((cir, ci) => {
            for (let i = 0; i < cir.panelCount; i++) {
                panelCircuit[cir.panelStart + i] = { color: circuitColors[ci % circuitColors.length], circuit: ci + 1 };
            }
        });

        const distBoxW = 100;
        const circSpacing = 26;
        const distBoxH = Math.max(circuits.length * circSpacing + 24, 60);
        const svgW = gridLeft + cols * (cellW + gap) + pad;
        const svgH = Math.max(gridTop + rows * (cellH + gap) + 40, gridTop + distBoxH + 40);

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="background:#0f1117;border-radius:8px;display:block;">`;
        svg += `<style>text{font-family:system-ui,-apple-system,sans-serif;}</style>`;

        // Power distro box
        const distX = pad, distY = gridTop;
        svg += `<rect x="${distX}" y="${distY}" width="${distBoxW}" height="${distBoxH}" rx="6" fill="#1a1d27" stroke="#f59e0b" stroke-width="2"/>`;
        svg += `<text x="${distX + distBoxW/2}" y="${distY + 16}" text-anchor="middle" font-size="10" font-weight="700" fill="#f59e0b">⚡ Power Dist.</text>`;

        // Circuit labels
        circuits.forEach((cir, ci) => {
            const cy = distY + 30 + ci * circSpacing;
            const color = circuitColors[ci % circuitColors.length];
            svg += `<circle cx="${distX + distBoxW}" cy="${cy}" r="4" fill="${color}"/>`;
            svg += `<text x="${distX + 8}" y="${cy + 3}" font-size="9" font-weight="600" fill="#94a3b8">C${ci + 1}</text>`;
            svg += `<text x="${distX + 30}" y="${cy + 3}" font-size="8" fill="#64748b">${cir.amps}A</text>`;
        });

        // Connection lines from distro to first panel of each circuit
        circuits.forEach((cir, ci) => {
            const color = circuitColors[ci % circuitColors.length];
            const fromY = distY + 30 + ci * circSpacing;
            // First panel in this circuit
            const firstPanelId = cir.panelStart;
            const firstRow = Math.floor(firstPanelId / cols);
            const firstCol = firstPanelId % cols;
            const toX = gridLeft + firstCol * (cellW + gap) + cellW / 2;
            const toY = gridTop + firstRow * (cellH + gap) + cellH / 2;
            const midX = distX + distBoxW + 8 + ci * 4;
            svg += `<polyline points="${distX + distBoxW + 4},${fromY} ${midX},${fromY} ${midX},${toY} ${toX},${toY}" fill="none" stroke="${color}80" stroke-width="1.5"/>`;
        });

        // LED panel cells colored by circuit
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const pid = row * cols + col;
                const info = panelCircuit[pid] || { color: '#555', circuit: '?' };
                const x = gridLeft + col * (cellW + gap);
                const y = gridTop + row * (cellH + gap);
                svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="${info.color}22" stroke="${info.color}" stroke-width="1.5"/>`;
                svg += `<text x="${x + cellW/2}" y="${y + 20}" text-anchor="middle" font-size="9" font-weight="700" fill="${info.color}">${col},${row}</text>`;
                svg += `<text x="${x + cellW/2}" y="${y + 34}" text-anchor="middle" font-size="8" fill="${info.color}99">C${info.circuit}</text>`;
                svg += `<text x="${x + cellW/2}" y="${y + 44}" text-anchor="middle" font-size="7" fill="${info.color}60">${panel.power_max}W</text>`;
            }
        }

        // Legend
        svg += `<text x="${gridLeft}" y="${svgH - 10}" font-size="9" fill="#475569">Color = Power circuit · C = Circuit number · ${c.powerCircuitAmps}A @ ${c.powerVoltage}V per circuit (80% derated)</text>`;
        svg += `</svg>`;

        body.innerHTML = svg;
    },

    // ================================================================
    // EXPORT REPORT
    // ================================================================
    _exportReport() {
        if (!this._result) {
            this._autoConfig();
        }
        const r = this._result;
        if (!r) return;

        const defaultName = `LED-Connection-${r.cols}x${r.rows}-${r.panel.brand}`;
        const fileName = window.luxorProject ? defaultName : prompt('Save report as:', defaultName);
        if (!fileName) return;

        const c = this._config;
        const circuitWatts = c.powerCircuitAmps * c.powerVoltage * 0.8;
        const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1',
                        '#84cc16','#e879f9','#fb923c','#38bdf8','#c084fc','#facc15','#4ade80','#f472b6','#2dd4bf','#a78bfa'];

        // Build panel→port color map
        const panelPort = {};
        r.ports.forEach((port, i) => {
            port.panels.forEach(p => { panelPort[p.id] = { color: colors[i % colors.length], port: i + 1 }; });
        });

        // Generate SVG wall diagram
        const cellW = 52, cellH = 52, gap = 3, pad = 20;
        const svgW = r.cols * (cellW + gap) - gap + pad * 2;
        const svgH = r.rows * (cellH + gap) - gap + pad * 2 + 30;
        let svgPanels = '';
        for (let row = 0; row < r.rows; row++) {
            for (let col = 0; col < r.cols; col++) {
                const pid = row * r.cols + col;
                const info = panelPort[pid] || { color: '#999', port: '?' };
                const x = pad + col * (cellW + gap);
                const y = pad + row * (cellH + gap);
                svgPanels += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="${info.color}22" stroke="${info.color}" stroke-width="1.5"/>`;
                svgPanels += `<text x="${x + cellW/2}" y="${y + cellH/2 - 6}" text-anchor="middle" font-size="9" font-weight="700" fill="${info.color}">${col},${row}</text>`;
                svgPanels += `<text x="${x + cellW/2}" y="${y + cellH/2 + 8}" text-anchor="middle" font-size="8" fill="${info.color}99">P${info.port}</text>`;
            }
        }

        // Draw chain arrows in SVG
        let svgChains = '';
        r.ports.forEach((port, pi) => {
            const color = colors[pi % colors.length];
            for (let j = 1; j < port.panels.length; j++) {
                const prev = port.panels[j-1];
                const curr = port.panels[j];
                const px = pad + prev.col * (cellW + gap) + cellW / 2;
                const py = pad + prev.row * (cellH + gap) + cellH / 2;
                const cx = pad + curr.col * (cellW + gap) + cellW / 2;
                const cy = pad + curr.row * (cellH + gap) + cellH / 2;
                svgChains += `<line x1="${px}" y1="${py}" x2="${cx}" y2="${cy}" stroke="${color}60" stroke-width="1" stroke-dasharray="3,2"/>`;
            }
        });

        const wallSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="background:#0f1117;border-radius:8px;">
            ${svgChains}${svgPanels}
            <text x="${svgW/2}" y="${svgH - 8}" text-anchor="middle" font-size="9" fill="#64748b" font-family="system-ui,sans-serif">
                ${r.cols}×${r.rows} wall · ${r.panel.brand} ${r.panel.model} · Colors = Ethernet port assignment
            </text>
        </svg>`;

        // Build legend
        const legendHtml = r.ports.map((port, i) => {
            return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:11px;">
                <span style="width:12px;height:12px;border-radius:3px;background:${colors[i % colors.length]};display:inline-block;"></span>
                Port ${i + 1} (${port.panels.length} panels)
            </span>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>LED Connection Report — ${fileName}</title>
<style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#1a1a2e;padding:40px;max-width:1100px;margin:0 auto;}
    h1{font-size:22px;margin-bottom:4px;}
    .sub{color:#64748b;font-size:12px;margin-bottom:24px;}
    h2{font-size:16px;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;}
    th{background:#f1f5f9;text-align:left;padding:8px 10px;font-weight:700;border-bottom:2px solid #e2e8f0;}
    td{padding:6px 10px;border-bottom:1px solid #f1f5f9;}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:10px;color:#fff;}
    .stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;text-align:center;flex:1;min-width:120px;}
    .stat-val{font-size:20px;font-weight:800;color:#0f172a;}
    .stat-lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;}
    .warn{color:#f59e0b;}
    .ok{color:#22c55e;}
    .err{color:#ef4444;}
    .wall-diagram{text-align:center;margin:16px 0;overflow-x:auto;}
    .legend{padding:10px 0;margin-bottom:8px;}
    @media print{body{padding:20px;} .wall-diagram svg{max-width:100%;height:auto;}}
</style></head><body>
<h1>LED Connection Report</h1>
<div class="sub">Generated by Luxor Production · ${new Date().toLocaleDateString()} · ${fileName}</div>

<h2>Wall Configuration</h2>
<div class="stats">
    <div class="stat"><div class="stat-val">${r.totalPanels}</div><div class="stat-lbl">Panels</div></div>
    <div class="stat"><div class="stat-val">${r.totalPxW}×${r.totalPxH}</div><div class="stat-lbl">Resolution</div></div>
    <div class="stat"><div class="stat-val">${(r.totalPixels / 1e6).toFixed(2)}M</div><div class="stat-lbl">Total Pixels</div></div>
    <div class="stat"><div class="stat-val">${(r.cols * r.panel.cm_w / 100).toFixed(2)}m × ${(r.rows * r.panel.cm_h / 100).toFixed(2)}m</div><div class="stat-lbl">Physical Size</div></div>
    <div class="stat"><div class="stat-val">${(r.totalPanels * r.panel.weight).toFixed(0)}kg</div><div class="stat-lbl">Total Weight</div></div>
</div>

<table>
    <tr><th>Parameter</th><th>Value</th></tr>
    <tr><td>Panel</td><td>${r.panel.brand} ${r.panel.model} (${r.panel.pitch}mm)</td></tr>
    <tr><td>Panel Resolution</td><td>${r.panel.px_w}×${r.panel.px_h} px</td></tr>
    <tr><td>Panel Size</td><td>${r.panel.cm_w}×${r.panel.cm_h} cm</td></tr>
    <tr><td>Layout</td><td>${r.cols} cols × ${r.rows} rows</td></tr>
    <tr><td>Processor</td><td>${r.proc.brand} ${r.proc.model} (${r.proc.outputs} outputs, ${(r.proc.max_pixels / 1e6).toFixed(1)}M max pixels)</td></tr>
    <tr><td>Max Panels per Port</td><td>${this._getMaxPanelsPerPort(r.proc, r.panel)}</td></tr>
    <tr><td>Input Types</td><td>${r.proc.input_types.join(', ')}</td></tr>
</table>

<h2>Connection Diagram</h2>
<div class="legend">${legendHtml}</div>
<div class="wall-diagram">${wallSvg}</div>

<h2>Data Port Mapping</h2>
<table>
    <tr><th>Port</th><th>Panels</th><th>Pixels</th><th>Capacity</th><th>Route</th></tr>
    ${r.ports.map((port, i) => {
        const pct = Math.round((port.pixels / r.proc.pixels_per_output) * 100);
        return `<tr>
            <td><span class="badge" style="background:${colors[i % colors.length]};">P${i + 1}</span></td>
            <td>${port.panels.length}</td>
            <td>${port.pixels.toLocaleString()}</td>
            <td class="${pct > 90 ? 'err' : pct > 70 ? 'warn' : 'ok'}">${pct}%</td>
            <td style="font-size:10px;">${port.panels.map(p => `[${p.col},${p.row}]`).join(' → ')}</td>
        </tr>`;
    }).join('')}
</table>

<h2>Power Distribution</h2>
<table>
    <tr><th>Circuit</th><th>Panels</th><th>Power (W)</th><th>Current (A)</th><th>Load</th></tr>
    ${r.circuits.map((cir, i) => {
        const pct = Math.round((cir.watts / (c.powerCircuitAmps * c.powerVoltage)) * 100);
        return `<tr>
            <td>Circuit ${i + 1}</td>
            <td>${cir.panelCount}</td>
            <td>${cir.watts}W</td>
            <td>${cir.amps}A</td>
            <td class="${pct > 80 ? 'err' : pct > 60 ? 'warn' : 'ok'}">${pct}%</td>
        </tr>`;
    }).join('')}
</table>
<p style="font-size:11px;color:#64748b;margin-top:8px;">Based on ${c.powerCircuitAmps}A @ ${c.powerVoltage}V circuits. Max ${r.panel.max_panels_per_circuit || 12} panels per circuit for ${r.panel.brand} ${r.panel.model}.</p>

<h2>Power Connection Diagram</h2>
<div class="wall-diagram">${(() => {
    const circuitColors2 = ['#f59e0b','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
    const pCircuit = {};
    r.circuits.forEach((cir2, ci2) => {
        for (let i2 = 0; i2 < cir2.panelCount; i2++) { pCircuit[cir2.panelStart + i2] = { color: circuitColors2[ci2 % circuitColors2.length], circuit: ci2 + 1 }; }
    });
    const cW2 = 48, cH2 = 48, g2 = 3, p2 = 16;
    const sW2 = r.cols * (cW2 + g2) - g2 + p2 * 2;
    const sH2 = r.rows * (cH2 + g2) - g2 + p2 * 2 + 24;
    let s2 = '<svg xmlns="http://www.w3.org/2000/svg" width="' + sW2 + '" height="' + sH2 + '" style="background:#0f1117;border-radius:8px;"><style>text{font-family:system-ui,sans-serif;}</style>';
    for (let rr = 0; rr < r.rows; rr++) {
        for (let cc = 0; cc < r.cols; cc++) {
            const pid2 = rr * r.cols + cc;
            const inf = pCircuit[pid2] || { color: '#555', circuit: '?' };
            const xx = p2 + cc * (cW2 + g2), yy = p2 + rr * (cH2 + g2);
            s2 += '<rect x="' + xx + '" y="' + yy + '" width="' + cW2 + '" height="' + cH2 + '" rx="3" fill="' + inf.color + '22" stroke="' + inf.color + '" stroke-width="1.5"/>';
            s2 += '<text x="' + (xx + cW2/2) + '" y="' + (yy + 18) + '" text-anchor="middle" font-size="9" font-weight="700" fill="' + inf.color + '">' + cc + ',' + rr + '</text>';
            s2 += '<text x="' + (xx + cW2/2) + '" y="' + (yy + 32) + '" text-anchor="middle" font-size="8" fill="' + inf.color + '99">C' + inf.circuit + '</text>';
            s2 += '<text x="' + (xx + cW2/2) + '" y="' + (yy + 42) + '" text-anchor="middle" font-size="7" fill="' + inf.color + '60">' + r.panel.power_max + 'W</text>';
        }
    }
    s2 += '<text x="' + (sW2/2) + '" y="' + (sH2 - 6) + '" text-anchor="middle" font-size="9" fill="#64748b">Color = Power circuit · Max ' + (r.panel.max_panels_per_circuit || 12) + ' panels per circuit</text>';
    s2 += '</svg>';
    return s2;
})()}</div>

${c.useBackup ? '<h2>Backup Configuration</h2><p style="font-size:12px;color:#1a1a2e;">Backup mode enabled. Each primary data port (P1, P2, ...) is mirrored by a backup port (B1, B2, ...). Connect backup ports to the <strong>last panel</strong> in each chain. If the primary connection fails, the processor automatically switches to the backup path.</p><table><tr><th>Primary Port</th><th>Backup Port</th><th>Panels</th></tr>' + r.ports.map((port2, i2) => '<tr><td><span class="badge" style="background:' + colors[i2 % colors.length] + ';">P' + (i2+1) + '</span></td><td><span class="badge" style="background:#f59e0b;">B' + (i2+1) + '</span></td><td>' + port2.panels.length + '</td></tr>').join('') + '</table>' : ''}

<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:10px;text-align:center;">
    Luxor Production · LED Auto-Connect Report · ${new Date().toLocaleString()}
</div>
</body></html>`;

        UI.exportFile(fileName + '.html', html, [{ name: 'HTML Report', extensions: ['html'] }]);
    },

    // ================================================================
    // RESET
    // ================================================================
    _reset() {
        this._config = {
            panelKey: 'Absen PL2.9',
            processorKey: 'MCTRL4K',
            cols: 6,
            rows: 4,
            customPanel: null,
            powerCircuitAmps: 16,
            powerVoltage: 230,
        };
        this._result = null;
        const container = document.getElementById('page-container');
        if (container) container.innerHTML = this.render();
        this.onActivate();
    },
};
