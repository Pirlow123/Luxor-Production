/**
 * Pin Control Page — Read, set, reset, fade pin values
 * Uses: /pin/getvalue/{path}, /pin/setvalue/{path}/{value},
 *       /pin/reset/{path}, /pin/getinfo/{path}, /pin/fadevalue/{path}/{value}/{fadetime}
 * PinInformation: { dataType, details, name, pinType }
 */
const PinsPage = {
    _history: [],
    _currentPath: '',
    _pinInfo: null,
    _pinValue: '',

    render() {
        if (!appState.get('connected')) return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first');

        return `
            <div class="section-header">
                <h2><i class="fas fa-microchip"></i> Pin Control</h2>
            </div>

            <div class="pin-control-layout">
                <!-- Pin Path Browser -->
                <div class="pin-browser">
                    <div class="pin-browser-header">
                        <i class="fas fa-folder-tree"></i> Pin Path
                    </div>
                    <div style="padding:10px">
                        <div class="form-group">
                            <label>PIN PATH</label>
                            <input class="form-control mono" id="pin-path-input" placeholder="e.g. Engine/Mix1/Layer1/Opacity"
                                value="${UI.esc(this._currentPath)}"
                                onkeydown="if(event.key==='Enter') PinsPage.queryPin()">
                        </div>
                        <div class="flex gap-xs flex-wrap">
                            <button class="btn btn-xs btn-accent" onclick="PinsPage.queryPin()"><i class="fas fa-search"></i> Query</button>
                            <button class="btn btn-xs" onclick="PinsPage.getInfo()"><i class="fas fa-info-circle"></i> Info</button>
                            <button class="btn btn-xs" onclick="PinsPage.resetPin()"><i class="fas fa-undo"></i> Reset</button>
                        </div>
                    </div>

                    <!-- Common Pin Paths -->
                    <div class="pin-browser-header" style="margin-top:4px">
                        <i class="fas fa-star"></i> Common Paths
                    </div>
                    <div id="pin-common-paths">
                        ${this._commonPaths()}
                    </div>

                    <!-- History -->
                    <div class="pin-browser-header">
                        <i class="fas fa-history"></i> Recent
                    </div>
                    <div id="pin-history">
                        ${this._history.length === 0
                            ? '<div class="text-muted" style="padding:10px;font-size:11px">No recent queries</div>'
                            : this._history.slice(0, 20).map(h => `
                                <div class="pin-item" onclick="PinsPage.setPath('${UI.esc(h)}')">
                                    <i class="fas fa-clock"></i>
                                    <span class="pin-path">${UI.esc(h)}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <!-- Pin Detail / Control -->
                <div class="pin-detail">
                    <div class="card-header">
                        <h3><i class="fas fa-sliders-h"></i> Pin Value</h3>
                    </div>
                    <div class="card-body" id="pin-detail-body">
                        ${this._currentPath ? this._renderPinDetail() : UI.empty('fa-microchip', 'Select a Pin', 'Enter a pin path and click Query to read its value')}
                    </div>
                </div>
            </div>
        `;
    },

    _commonPaths() {
        const paths = [
            'Engine', 'Engine/Mix1', 'Engine/Mix1/Layer1',
            'Engine/Mix1/Layer1/Opacity', 'Engine/Mix1/Layer1/Media',
            'Engine/Mix1/Layer1/PlayMode', 'Engine/Mix1/Layer1/Speed',
            'Engine/Mix1/Layer1/PositionX', 'Engine/Mix1/Layer1/PositionY',
            'Engine/Mix1/Layer1/ScaleX', 'Engine/Mix1/Layer1/ScaleY',
            'Engine/Mix1/Layer1/Rotation', 'Engine/Mix1/MasterLevel',
            'Engine/Mix2', 'Engine/Mix2/Layer1/Opacity',
        ];

        return paths.map(p => `
            <div class="pin-item" onclick="PinsPage.setPath('${p}')">
                <i class="fas fa-map-pin"></i>
                <span class="pin-path">${p}</span>
            </div>
        `).join('');
    },

    _renderPinDetail() {
        const info = this._pinInfo;
        const value = this._pinValue;

        return `
            <div class="mb-md">
                <table>
                    <tr><td class="text-muted" style="width:100px">Path</td><td class="mono">${UI.esc(this._currentPath)}</td></tr>
                    <tr><td class="text-muted">Current Value</td><td><span class="inline-value">${UI.esc(value)}</span></td></tr>
                    ${info ? `
                        <tr><td class="text-muted">Name</td><td>${UI.esc(info.name)}</td></tr>
                        <tr><td class="text-muted">Data Type</td><td class="mono">${UI.esc(info.dataType)}</td></tr>
                        <tr><td class="text-muted">Pin Type</td><td class="mono">${UI.esc(info.pinType)}</td></tr>
                        <tr><td class="text-muted">Details</td><td>${UI.esc(info.details || '--')}</td></tr>
                    ` : ''}
                </table>
            </div>

            <div class="card" style="margin-bottom:12px">
                <div class="card-header"><h3>Set Value</h3></div>
                <div class="card-body">
                    <div class="form-inline">
                        <input class="form-control mono" id="pin-set-value" placeholder="New value" value="${UI.esc(value)}" style="flex:1">
                        <button class="btn btn-primary" onclick="PinsPage.setValue()">Set</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Fade Value</h3></div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('TARGET VALUE', '<input class="form-control mono" id="pin-fade-value" placeholder="Target value">')}
                        ${UI.formGroup('FADE TIME (MS)', '<input class="form-control mono" type="number" id="pin-fade-time" value="1000" min="0">')}
                    </div>
                    <button class="btn btn-accent mt-sm" onclick="PinsPage.fadeValue()"><i class="fas fa-wave-square"></i> Fade</button>
                </div>
            </div>
        `;
    },

    setPath(path) {
        this._currentPath = path;
        const input = document.getElementById('pin-path-input');
        if (input) input.value = path;
        this.queryPin();
    },

    async queryPin() {
        const path = (document.getElementById('pin-path-input')?.value || '').trim();
        if (!path) { UI.toast('Enter a pin path', 'warning'); return; }

        this._currentPath = path;

        // Add to history
        this._history = [path, ...this._history.filter(h => h !== path)].slice(0, 30);

        try {
            this._pinValue = await hippoAPI.getPinValue(path);
            appState.log('DEBUG', `Pin ${path} = ${this._pinValue}`, 'Pin');
        } catch(e) {
            this._pinValue = `Error: ${e.message}`;
        }

        try {
            this._pinInfo = await hippoAPI.getPinInfo(path);
        } catch {
            this._pinInfo = null;
        }

        const el = document.getElementById('pin-detail-body');
        if (el) el.innerHTML = this._renderPinDetail();
    },

    async getInfo() {
        const path = (document.getElementById('pin-path-input')?.value || '').trim();
        if (!path) return;
        try {
            const info = await hippoAPI.getPinInfo(path);
            this._pinInfo = info;
            UI.toast(`Pin info: ${info.name} (${info.dataType})`, 'info');
            const el = document.getElementById('pin-detail-body');
            if (el) el.innerHTML = this._renderPinDetail();
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async setValue() {
        const path = this._currentPath;
        const value = document.getElementById('pin-set-value')?.value;
        if (!path || value === undefined) return;
        try {
            await hippoAPI.setPinValue(path, value);
            this._pinValue = value;
            UI.toast(`Set ${path} = ${value}`, 'success');
            appState.log('INFO', `Set pin ${path} = ${value}`, 'Pin');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async resetPin() {
        const path = (document.getElementById('pin-path-input')?.value || '').trim();
        if (!path) return;
        try {
            await hippoAPI.resetPin(path);
            UI.toast(`Pin ${path} reset`, 'info');
            this.queryPin();
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async fadeValue() {
        const path = this._currentPath;
        const value = document.getElementById('pin-fade-value')?.value;
        const time = document.getElementById('pin-fade-time')?.value;
        if (!path || !value || !time) { UI.toast('Fill in all fields', 'warning'); return; }
        try {
            await hippoAPI.fadePinValue(path, value, time);
            UI.toast(`Fading ${path} → ${value} over ${time}ms`, 'success');
            appState.log('INFO', `Fade pin ${path} → ${value} (${time}ms)`, 'Pin');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    onActivate() {},
};
