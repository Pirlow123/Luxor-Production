/**
 * Engine Mixing Page — Universal Audio/Mixing/Layers page for all non-Hippo engines
 * Provides dedicated mixing controls: audio faders, layer controls, transform tools
 * Supports: vMix, OBS, ATEM, CasparCG, Barco, Pixera, Resolume, Disguise, QLab
 */
const EngineMixingPage = {
    _pollTimer: null,

    // ================================================================
    // RENDER
    // ================================================================

    render() {
        if (!appState.get('connected')) return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first');

        const serverType = appState.get('serverType');
        if (!serverType || serverType === 'hippo') {
            return UI.empty('fa-sliders-h', 'Hippo Detected', 'Use the Mixes & Layers page for Hippotizer mixing controls.');
        }

        switch (serverType) {
            case 'vmix':      return this._renderVmix();
            case 'obs':       return this._renderObs();
            case 'atem':      return this._renderAtem();
            case 'casparcg':  return this._renderCasparcg();
            case 'barco':     return this._renderBarco();
            case 'pixera':    return this._renderPixera();
            case 'resolume':  return this._renderResolume();
            case 'disguise':  return this._renderDisguise();
            case 'qlab':      return this._renderQlab();
            default:
                return UI.empty('fa-sliders-h', 'Unsupported Engine', `No mixing controls available for "${UI.esc(serverType)}".`);
        }
    },

    // ================================================================
    // HEADER HELPER
    // ================================================================

    _header(icon, title) {
        return `
            <div class="section-header">
                <h2><i class="fas fa-${icon}"></i> ${title}</h2>
                <button class="btn btn-sm btn-ghost" onclick="EngineMixingPage.refresh()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>`;
    },

    // ================================================================
    // VERTICAL FADER STRIP HELPER
    // ================================================================

    /**
     * Render a single vertical fader strip.
     * @param {object} opts - { id, label, value (0-100), muted, onInput, onMute, extraBtn, color }
     */
    _faderStrip(opts) {
        const { id, label, value, muted, onInput, onMute, extraBtn, color } = opts;
        const accentColor = color || 'var(--accent)';
        return `
            <div class="engine-fader-strip" style="text-align:center;min-width:64px;max-width:80px;flex-shrink:0;">
                <div class="engine-fader-label" style="font-size:10px;font-weight:700;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;" title="${UI.esc(label)}">${UI.esc(label)}</div>
                <input type="range" orient="vertical" min="0" max="100" value="${value}"
                    style="writing-mode:vertical-lr;direction:rtl;height:120px;accent-color:${accentColor};"
                    oninput="${onInput}" id="fader-${UI.esc(id)}">
                <div class="mono" style="font-size:10px;margin-top:4px;" id="fader-val-${UI.esc(id)}">${value}%</div>
                ${onMute ? `
                    <button class="btn btn-xs ${muted ? 'btn-danger' : ''}" onclick="${onMute}" style="margin-top:4px;" title="${muted ? 'Unmute' : 'Mute'}">
                        <i class="fas fa-${muted ? 'volume-mute' : 'volume-up'}"></i>
                    </button>` : ''}
                ${extraBtn || ''}
            </div>`;
    },

    // ================================================================
    // vMix
    // ================================================================

    _renderVmix() {
        const vs = appState.get('vmixState');
        const inputs = vs?.inputs || [];

        return `
            ${this._header('volume-up', 'vMix Audio Mixer')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Input Faders</h3></div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${inputs.length === 0 ? '<p class="text-muted">No inputs available</p>' :
                        inputs.map(inp => this._faderStrip({
                            id: `vmix-${inp.number}`,
                            label: inp.title || `Input ${inp.number}`,
                            value: inp.volume ?? 100,
                            muted: inp.muted,
                            onInput: `EngineMixingPage.vmixSetVolume(${inp.number}, this.value)`,
                            onMute: `EngineMixingPage.vmixToggleMute(${inp.number})`,
                        })).join('')}
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> Audio Bus Routing</h3></div>
                <div class="card-body">
                    <table style="width:100%;font-size:11px;border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <th style="text-align:left;padding:4px 8px;">Input</th>
                                <th style="text-align:center;padding:4px 8px;">Volume</th>
                                <th style="text-align:center;padding:4px 8px;">Muted</th>
                                <th style="text-align:center;padding:4px 8px;">Bus</th>
                                <th style="text-align:center;padding:4px 8px;">State</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inputs.map(inp => `
                                <tr style="border-bottom:1px solid var(--border-color);">
                                    <td style="padding:4px 8px;font-weight:600;">${UI.esc(inp.title)}</td>
                                    <td style="padding:4px 8px;text-align:center;" class="mono">${inp.volume ?? 100}%</td>
                                    <td style="padding:4px 8px;text-align:center;">${inp.muted ? '<span style="color:var(--danger);">MUTED</span>' : '<span style="color:var(--success);">ON</span>'}</td>
                                    <td style="padding:4px 8px;text-align:center;">${UI.esc(inp.audiobusses || 'M')}</td>
                                    <td style="padding:4px 8px;text-align:center;">${UI.esc(inp.state || '--')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    async vmixSetVolume(input, value) {
        const val = parseInt(value);
        const el = document.getElementById(`fader-val-vmix-${input}`);
        if (el) el.textContent = `${val}%`;
        try { await vmixAPI.setVolume(input, val); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async vmixToggleMute(input) {
        const vs = appState.get('vmixState');
        const inp = vs?.inputs?.find(i => i.number === input);
        if (!inp) return;
        try {
            inp.muted ? await vmixAPI.audioOn(input) : await vmixAPI.audioOff(input);
            await this._refreshVmix();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _refreshVmix() {
        try {
            const state = await vmixAPI.getState();
            appState.set('vmixState', state);
        } catch {}
        this._rerenderIfActive();
    },

    // ================================================================
    // OBS
    // ================================================================

    _renderObs() {
        const rawInputs = appState.get('obsInputs') || [];
        const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
        const audioInputs = inputs.filter(i =>
            i.inputKind?.includes('audio') || i.inputKind?.includes('wasapi') ||
            i.inputKind?.includes('pulse') || i.inputKind?.includes('alsa') ||
            i.inputKind?.includes('coreaudio') || i.inputKind?.includes('jack')
        );
        const allInputs = inputs.filter(i => !audioInputs.includes(i));

        return `
            ${this._header('volume-up', 'OBS Audio Mixer')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-microphone"></i> Audio Sources</h3></div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${audioInputs.length === 0 ? '<p class="text-muted">No dedicated audio sources found</p>' :
                        audioInputs.map(inp => this._faderStrip({
                            id: `obs-${inp.inputName}`,
                            label: inp.inputName,
                            value: Math.round((inp.volumeMul ?? 1) * 100),
                            muted: inp.muted,
                            onInput: `EngineMixingPage.obsSetVolume('${UI.esc(inp.inputName)}', this.value / 100)`,
                            onMute: `EngineMixingPage.obsToggleMute('${UI.esc(inp.inputName)}')`,
                            color: '#22c55e',
                        })).join('')}
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-video"></i> Other Sources with Audio</h3></div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${allInputs.length === 0 ? '<p class="text-muted">No other sources</p>' :
                        allInputs.map(inp => this._faderStrip({
                            id: `obs-${inp.inputName}`,
                            label: inp.inputName,
                            value: Math.round((inp.volumeMul ?? 1) * 100),
                            muted: inp.muted,
                            onInput: `EngineMixingPage.obsSetVolume('${UI.esc(inp.inputName)}', this.value / 100)`,
                            onMute: `EngineMixingPage.obsToggleMute('${UI.esc(inp.inputName)}')`,
                            color: '#3b82f6',
                        })).join('')}
                </div>
            </div>`;
    },

    async obsSetVolume(name, vol) {
        const pct = Math.round(vol * 100);
        const el = document.getElementById(`fader-val-obs-${name}`);
        if (el) el.textContent = `${pct}%`;
        try { await obsAPI.setVolume(name, vol); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async obsToggleMute(name) {
        const rawInputs = appState.get('obsInputs') || [];
        const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
        const inp = inputs.find(i => i.inputName === name);
        if (!inp) return;
        try {
            await obsAPI.setMute(name, !inp.muted);
            await this._refreshObs();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _refreshObs() {
        try {
            const inputResp = await obsAPI.getSourceList();
            appState.set('obsInputs', inputResp.inputs || inputResp);
        } catch {}
        this._rerenderIfActive();
    },

    // ================================================================
    // ATEM
    // ================================================================

    _renderAtem() {
        const state = appState.get('atemState') || {};
        const inputs = state.inputs || [];

        return `
            ${this._header('volume-up', 'ATEM Audio Mixer')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Input Audio Gain</h3></div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${inputs.length === 0 ? '<p class="text-muted">No inputs available</p>' :
                        inputs.map(inp => this._faderStrip({
                            id: `atem-${inp.id}`,
                            label: inp.name || `Input ${inp.id}`,
                            value: inp.audioGain ?? 50,
                            muted: inp.audioMix === 'off',
                            onInput: `EngineMixingPage.atemSetAudioGain(${inp.id}, this.value)`,
                            onMute: `EngineMixingPage.atemCycleAudioMix(${inp.id})`,
                            extraBtn: `<div style="font-size:9px;margin-top:4px;font-weight:700;color:${inp.audioMix === 'on' ? 'var(--success)' : inp.audioMix === 'afv' ? 'var(--warning)' : 'var(--text-muted)'};">${(inp.audioMix || 'OFF').toUpperCase()}</div>`,
                            color: inp.audioMix === 'on' ? '#22c55e' : inp.audioMix === 'afv' ? '#facc15' : '#666',
                        })).join('')}
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-broadcast-tower"></i> Master Audio</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:100px 1fr 60px;gap:8px;align-items:center;">
                        <span style="font-size:11px;font-weight:600;">Master Gain</span>
                        <input type="range" min="0" max="100" value="100" style="accent-color:var(--accent);"
                            oninput="EngineMixingPage.atemSetMasterGain(this.value)">
                        <span class="mono" style="font-size:11px;" id="atem-master-gain-val">100%</span>
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-list"></i> Audio Mix Mode Reference</h3></div>
                <div class="card-body">
                    <p style="font-size:11px;color:var(--text-muted);margin:0;">
                        <strong style="color:var(--success);">ON</strong> = Always active &nbsp;|&nbsp;
                        <strong style="color:var(--warning);">AFV</strong> = Audio Follow Video &nbsp;|&nbsp;
                        <strong style="color:var(--text-muted);">OFF</strong> = Muted.
                        Click the mute button on each fader to cycle between modes.
                    </p>
                </div>
            </div>`;
    },

    async atemSetAudioGain(id, val) {
        const v = parseInt(val);
        const el = document.getElementById(`fader-val-atem-${id}`);
        if (el) el.textContent = `${v}%`;
        try { await atemAPI.setAudioGain(id, v); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async atemCycleAudioMix(id) {
        const opts = ['off', 'on', 'afv'];
        const state = appState.get('atemState') || {};
        const cur = state.inputs?.find(i => i.id === id)?.audioMix || 'off';
        const next = opts[(opts.indexOf(cur) + 1) % opts.length];
        try {
            await atemAPI.setAudioMixOption(id, next);
            await this._refreshAtem();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async atemSetMasterGain(val) {
        const v = parseInt(val);
        const el = document.getElementById('atem-master-gain-val');
        if (el) el.textContent = `${v}%`;
        try { await atemAPI.setAudioMasterGain(v); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _refreshAtem() {
        try {
            const state = await atemAPI.getState();
            appState.set('atemState', state);
        } catch {}
        this._rerenderIfActive();
    },

    // ================================================================
    // CasparCG
    // ================================================================

    _renderCasparcg() {
        const channels = appState.get('casparcgChannels') || [];

        return `
            ${this._header('sliders-h', 'CasparCG Channel Mixer')}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Channel Mixer</h3></div>
                    <div class="card-body">
                        <p style="font-size:10px;color:var(--text-muted);margin-bottom:12px;">Brightness, contrast, saturation, and volume per channel.</p>
                        ${channels.length === 0 ? '<p class="text-muted">No channels</p>' :
                            channels.map((ch, ci) => {
                                const chId = ch.id || ci + 1;
                                return `
                                <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color);">
                                    <div style="font-weight:700;font-size:12px;margin-bottom:8px;">Channel ${chId}</div>
                                    <div style="display:grid;grid-template-columns:65px 1fr 50px;gap:6px;align-items:center;">
                                        <span style="font-size:9px;color:var(--text-muted);">Bright</span>
                                        <input type="range" min="0" max="100" value="100" style="accent-color:#facc15;"
                                            oninput="EngineMixingPage.ccgSetProp(${chId},1,'brightness',this.value/100,this)">
                                        <span class="mono" style="font-size:10px;">100%</span>
                                        <span style="font-size:9px;color:var(--text-muted);">Contrast</span>
                                        <input type="range" min="0" max="200" value="100" style="accent-color:#3b82f6;"
                                            oninput="EngineMixingPage.ccgSetProp(${chId},1,'contrast',this.value/100,this)">
                                        <span class="mono" style="font-size:10px;">100%</span>
                                        <span style="font-size:9px;color:var(--text-muted);">Satur.</span>
                                        <input type="range" min="0" max="200" value="100" style="accent-color:#a855f7;"
                                            oninput="EngineMixingPage.ccgSetProp(${chId},1,'saturation',this.value/100,this)">
                                        <span class="mono" style="font-size:10px;">100%</span>
                                        <span style="font-size:9px;color:var(--text-muted);">Volume</span>
                                        <input type="range" min="0" max="100" value="100" style="accent-color:#22c55e;"
                                            oninput="EngineMixingPage.ccgSetMasterVol(${chId},this.value/100,this)">
                                        <span class="mono" style="font-size:10px;">100%</span>
                                    </div>
                                    <div style="display:flex;gap:6px;margin-top:8px;">
                                        <button class="btn btn-xs" onclick="EngineMixingPage.ccgResetMixer(${chId},1)"><i class="fas fa-undo"></i> Reset Mixer</button>
                                    </div>
                                </div>`;
                            }).join('')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-expand-arrows-alt"></i> Transform / Fill</h3></div>
                    <div class="card-body">
                        <p style="font-size:10px;color:var(--text-muted);margin-bottom:12px;">Set fill position and scale for a layer.</p>
                        <div style="display:grid;grid-template-columns:80px 1fr;gap:6px;align-items:center;">
                            <span style="font-size:10px;font-weight:600;">Channel</span>
                            <select class="form-control" id="emix-ccg-ch" style="width:80px;">
                                ${channels.map((ch, ci) => `<option value="${ch.id || ci + 1}">${ch.id || ci + 1}</option>`).join('')}
                            </select>
                            <span style="font-size:10px;font-weight:600;">Layer</span>
                            <input type="number" id="emix-ccg-layer" value="10" min="1" max="999" class="form-control" style="width:80px;">
                        </div>
                        <div style="display:grid;grid-template-columns:40px 1fr 50px;gap:6px;align-items:center;margin-top:12px;">
                            <span style="font-size:9px;color:var(--text-muted);">X</span>
                            <input type="range" min="0" max="100" value="0" id="emix-fill-x" style="accent-color:var(--accent);"
                                oninput="this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:10px;">0%</span>
                            <span style="font-size:9px;color:var(--text-muted);">Y</span>
                            <input type="range" min="0" max="100" value="0" id="emix-fill-y" style="accent-color:var(--accent);"
                                oninput="this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:10px;">0%</span>
                            <span style="font-size:9px;color:var(--text-muted);">W</span>
                            <input type="range" min="0" max="100" value="100" id="emix-fill-w" style="accent-color:#facc15;"
                                oninput="this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:10px;">100%</span>
                            <span style="font-size:9px;color:var(--text-muted);">H</span>
                            <input type="range" min="0" max="100" value="100" id="emix-fill-h" style="accent-color:#facc15;"
                                oninput="this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:10px;">100%</span>
                        </div>
                        <button class="btn btn-sm btn-primary mt-md" onclick="EngineMixingPage.ccgApplyFill()"><i class="fas fa-check"></i> Apply Fill</button>
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-terminal"></i> AMCP Command Line</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px;">
                        <input type="text" class="form-control" id="emix-amcp-cmd" placeholder="e.g. PLAY 1-10 AMB LOOP" style="flex:1;">
                        <button class="btn btn-primary" onclick="EngineMixingPage.ccgSendAMCP()"><i class="fas fa-paper-plane"></i> Send</button>
                    </div>
                    <pre id="emix-amcp-result" style="margin-top:8px;font-size:10px;max-height:120px;overflow:auto;background:var(--bg-dark);padding:8px;border-radius:4px;color:var(--text-muted);display:none;"></pre>
                </div>
            </div>`;
    },

    async ccgSetProp(ch, layer, prop, val, el) {
        const pct = Math.round(val * 100);
        if (el?.nextElementSibling) el.nextElementSibling.textContent = `${pct}%`;
        try {
            switch (prop) {
                case 'brightness':  await casparcgAPI.setMixerBrightness(ch, layer, val); break;
                case 'contrast':    await casparcgAPI.setMixerContrast(ch, layer, val); break;
                case 'saturation':  await casparcgAPI.setMixerSaturation(ch, layer, val); break;
            }
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async ccgSetMasterVol(ch, val, el) {
        const pct = Math.round(val * 100);
        if (el?.nextElementSibling) el.nextElementSibling.textContent = `${pct}%`;
        try { await casparcgAPI.setMixerMasterVolume(ch, val); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async ccgResetMixer(ch, layer) {
        try { await casparcgAPI.clearMixer(ch, layer); UI.toast('Mixer reset', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async ccgApplyFill() {
        const ch = parseInt(document.getElementById('emix-ccg-ch')?.value) || 1;
        const layer = parseInt(document.getElementById('emix-ccg-layer')?.value) || 10;
        const x = (parseInt(document.getElementById('emix-fill-x')?.value) || 0) / 100;
        const y = (parseInt(document.getElementById('emix-fill-y')?.value) || 0) / 100;
        const w = (parseInt(document.getElementById('emix-fill-w')?.value) || 100) / 100;
        const h = (parseInt(document.getElementById('emix-fill-h')?.value) || 100) / 100;
        try {
            await casparcgAPI.setMixerFill(ch, layer, x, y, w, h);
            UI.toast('Fill applied', 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async ccgSendAMCP() {
        const input = document.getElementById('emix-amcp-cmd');
        const resultEl = document.getElementById('emix-amcp-result');
        const cmd = input?.value?.trim();
        if (!cmd) { UI.toast('Enter an AMCP command', 'warning'); return; }
        try {
            const result = await casparcgAPI.executeAMCP(cmd);
            if (resultEl) {
                resultEl.style.display = 'block';
                resultEl.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
            }
            UI.toast('Command sent', 'success');
        } catch (e) {
            if (resultEl) { resultEl.style.display = 'block'; resultEl.textContent = `ERROR: ${e.message}`; }
            UI.toast(e.message, 'error');
        }
    },

    // ================================================================
    // Barco E2/S3
    // ================================================================

    _renderBarco() {
        const state = appState.get('barcoState') || {};
        const destinations = state.destinations || [];
        const sources = state.sources || [];
        const superScreens = state.superScreens || [];

        return `
            ${this._header('layer-group', 'Barco Layer Controls')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-tv"></i> Destinations & Layers</h3></div>
                <div class="card-body">
                    ${destinations.length === 0 ? '<p class="text-muted">No destinations available</p>' :
                        destinations.map(dest => `
                            <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color);">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <span style="font-weight:700;font-size:12px;">${UI.esc(dest.name || `Destination ${dest.id}`)}</span>
                                    <button class="btn btn-xs" onclick="EngineMixingPage.barcoLoadLayers(${dest.id})"><i class="fas fa-layer-group"></i> Load Layers</button>
                                </div>
                                <div id="barco-layers-${dest.id}" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
                            </div>
                        `).join('')}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-exchange-alt"></i> Assign Source to Layer</h3></div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:80px 1fr;gap:6px;align-items:center;">
                            <span style="font-size:10px;font-weight:600;">Dest</span>
                            <select class="form-control" id="barco-assign-dest" style="width:100%;">
                                ${destinations.map(d => `<option value="${d.id}">${UI.esc(d.name || 'Dest ' + d.id)}</option>`).join('')}
                            </select>
                            <span style="font-size:10px;font-weight:600;">Layer</span>
                            <input type="number" class="form-control" id="barco-assign-layer" value="0" min="0" style="width:80px;">
                            <span style="font-size:10px;font-weight:600;">Source</span>
                            <select class="form-control" id="barco-assign-source" style="width:100%;">
                                ${sources.map(s => `<option value="${s.id}">${UI.esc(s.name || 'Source ' + s.id)}</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn btn-sm btn-primary mt-md" onclick="EngineMixingPage.barcoAssignSource()"><i class="fas fa-check"></i> Assign</button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-desktop"></i> SuperScreens</h3></div>
                    <div class="card-body">
                        ${superScreens.length === 0 ? '<p class="text-muted">No SuperScreens configured</p>' :
                            superScreens.map(ss => `
                                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color);">
                                    <span style="font-size:11px;font-weight:600;">${UI.esc(ss.name || `SuperScreen ${ss.id}`)}</span>
                                    <span class="mono" style="font-size:10px;color:var(--text-muted);">ID: ${ss.id}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>`;
    },

    async barcoLoadLayers(destId) {
        const container = document.getElementById(`barco-layers-${destId}`);
        if (!container) return;
        container.innerHTML = '<span class="text-muted" style="font-size:10px;">Loading...</span>';
        try {
            const layers = await barcoAPI.listLayers(destId);
            const layerList = Array.isArray(layers) ? layers : [];
            container.innerHTML = layerList.length === 0 ? '<span class="text-muted" style="font-size:10px;">No layers</span>' :
                layerList.map((l, i) => `
                    <div style="background:var(--bg-dark);padding:6px 10px;border-radius:4px;font-size:10px;">
                        <div style="font-weight:700;">Layer ${i}</div>
                        <div style="color:var(--text-muted);">${UI.esc(l.sourceName || l.source || 'No source')}</div>
                    </div>
                `).join('');
        } catch (e) {
            container.innerHTML = `<span style="color:var(--danger);font-size:10px;">${UI.esc(e.message)}</span>`;
        }
    },

    async barcoAssignSource() {
        const destId = parseInt(document.getElementById('barco-assign-dest')?.value);
        const layerIdx = parseInt(document.getElementById('barco-assign-layer')?.value) || 0;
        const sourceId = parseInt(document.getElementById('barco-assign-source')?.value);
        try {
            await barcoAPI.changeContent(destId, layerIdx, sourceId);
            UI.toast('Source assigned', 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // Pixera
    // ================================================================

    _renderPixera() {
        const state = appState.get('pixeraState') || {};
        const timelines = state.timelines || [];
        const screens = state.screens || [];

        return `
            ${this._header('layer-group', 'Pixera Layers & Mixing')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-film"></i> Timelines — Layer Controls</h3></div>
                <div class="card-body">
                    ${timelines.length === 0 ? '<p class="text-muted">No timelines available</p>' :
                        timelines.map((tl, ti) => `
                            <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color);">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <span style="font-weight:700;font-size:12px;">${UI.esc(tl.name || `Timeline ${ti}`)}</span>
                                    <button class="btn btn-xs" onclick="EngineMixingPage.pixeraLoadLayers('${tl.handle || tl}', ${ti})"><i class="fas fa-layer-group"></i> Load Layers</button>
                                </div>
                                <div id="pixera-layers-${ti}" style="display:flex;gap:16px;flex-wrap:wrap;"></div>
                            </div>
                        `).join('')}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-volume-up"></i> Master Controls</h3></div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:90px 1fr 50px;gap:8px;align-items:center;">
                            <span style="font-size:11px;font-weight:600;">Brightness</span>
                            <input type="range" min="0" max="100" value="100" style="accent-color:#facc15;"
                                oninput="EngineMixingPage.pixeraSetMasterBrightness(this.value/100); this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:10px;">100%</span>
                            <span style="font-size:11px;font-weight:600;">Volume</span>
                            <input type="range" min="0" max="100" value="100" style="accent-color:#22c55e;"
                                oninput="EngineMixingPage.pixeraSetMasterVolume(this.value/100); this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:10px;">100%</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-desktop"></i> Screens</h3></div>
                    <div class="card-body">
                        ${screens.length === 0 ? '<p class="text-muted">No screens</p>' :
                            screens.map((scr, si) => `
                                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color);">
                                    <span style="font-size:11px;font-weight:600;">${UI.esc(scr.name || `Screen ${si}`)}</span>
                                    <span class="mono" style="font-size:10px;color:var(--text-muted);">Handle: ${scr.handle || scr}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>`;
    },

    async pixeraLoadLayers(handle, tlIdx) {
        const container = document.getElementById(`pixera-layers-${tlIdx}`);
        if (!container) return;
        container.innerHTML = '<span class="text-muted" style="font-size:10px;">Loading...</span>';
        try {
            const layers = await pixeraAPI.getLayers(handle);
            const layerList = Array.isArray(layers) ? layers : [];
            if (layerList.length === 0) {
                container.innerHTML = '<span class="text-muted" style="font-size:10px;">No layers</span>';
                return;
            }
            // Load attributes for each layer
            const layerDetails = await Promise.all(layerList.map(async (l) => {
                try { return await pixeraAPI.getLayer(l.handle || l); } catch { return { handle: l.handle || l, name: `Layer` }; }
            }));
            container.innerHTML = layerDetails.map((ld, li) => `
                <div style="text-align:center;min-width:80px;background:var(--bg-dark);padding:8px;border-radius:6px;">
                    <div style="font-size:10px;font-weight:700;margin-bottom:6px;">${UI.esc(ld.name || `Layer ${li}`)}</div>
                    <div style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Opacity</div>
                    <input type="range" min="0" max="100" value="100" style="width:70px;accent-color:#a855f7;"
                        oninput="EngineMixingPage.pixeraSetLayerOpacity('${layerList[li].handle || layerList[li]}', this.value/100)">
                    <div style="font-size:9px;color:var(--text-muted);margin-top:4px;">Volume</div>
                    <input type="range" min="0" max="100" value="100" style="width:70px;accent-color:#22c55e;"
                        oninput="EngineMixingPage.pixeraSetLayerVolume('${layerList[li].handle || layerList[li]}', this.value/100)">
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = `<span style="color:var(--danger);font-size:10px;">${UI.esc(e.message)}</span>`;
        }
    },

    async pixeraSetMasterBrightness(val) {
        try { await pixeraAPI.setMasterBrightness(val); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraSetMasterVolume(val) {
        try { await pixeraAPI.setMasterVolume(val); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraSetLayerOpacity(handle, val) {
        try { await pixeraAPI.setLayerOpacity(handle, val); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraSetLayerVolume(handle, val) {
        try { await pixeraAPI.setLayerVolume(handle, val); } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // Resolume
    // ================================================================

    _renderResolume() {
        const comp = appState.get('composition');
        const layers = comp?.layers || [];

        return `
            ${this._header('layer-group', 'Resolume Layer Mixer')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Layer Master Controls</h3></div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${layers.length === 0 ? '<p class="text-muted">No layers in composition</p>' :
                        layers.map((layer, li) => {
                            const idx = li + 1;
                            const name = layer.name?.value || `Layer ${idx}`;
                            const opacity = layer.video?.opacity?.value != null ? Math.round(layer.video.opacity.value * 100) : 100;
                            const bypassed = layer.bypassed?.value === true;
                            const solo = layer.solo?.value === true;
                            return `
                            <div class="engine-fader-strip" style="text-align:center;min-width:80px;max-width:90px;flex-shrink:0;${bypassed ? 'opacity:0.4;' : ''}">
                                <div style="font-size:10px;font-weight:700;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;" title="${UI.esc(name)}">${UI.esc(name)}</div>
                                <input type="range" orient="vertical" min="0" max="100" value="${opacity}"
                                    style="writing-mode:vertical-lr;direction:rtl;height:120px;accent-color:${solo ? '#facc15' : '#a855f7'};"
                                    oninput="EngineMixingPage.resolumeSetOpacity(${idx}, this.value/100)">
                                <div class="mono" style="font-size:10px;margin-top:4px;">${opacity}%</div>
                                <div style="display:flex;gap:2px;justify-content:center;margin-top:4px;">
                                    <button class="btn btn-xs ${bypassed ? 'btn-danger' : ''}" onclick="EngineMixingPage.resolumeToggleBypass(${idx}, ${!bypassed})" title="Bypass">B</button>
                                    <button class="btn btn-xs ${solo ? 'btn-warning' : ''}" onclick="EngineMixingPage.resolumeToggleSolo(${idx}, ${!solo})" title="Solo">S</button>
                                    <button class="btn btn-xs" onclick="EngineMixingPage.resolumeClearLayer(${idx})" title="Clear"><i class="fas fa-times"></i></button>
                                </div>
                            </div>`;
                        }).join('')}
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> Layer Details</h3></div>
                <div class="card-body">
                    <table style="width:100%;font-size:11px;border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <th style="text-align:left;padding:4px 8px;">#</th>
                                <th style="text-align:left;padding:4px 8px;">Name</th>
                                <th style="text-align:center;padding:4px 8px;">Opacity</th>
                                <th style="text-align:center;padding:4px 8px;">Bypass</th>
                                <th style="text-align:center;padding:4px 8px;">Solo</th>
                                <th style="text-align:center;padding:4px 8px;">Blend</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${layers.map((layer, li) => {
                                const name = layer.name?.value || `Layer ${li + 1}`;
                                const opacity = layer.video?.opacity?.value != null ? Math.round(layer.video.opacity.value * 100) : 100;
                                const bypassed = layer.bypassed?.value === true;
                                const solo = layer.solo?.value === true;
                                const blend = layer.video?.blendMode?.value || '--';
                                return `
                                <tr style="border-bottom:1px solid var(--border-color);">
                                    <td style="padding:4px 8px;">${li + 1}</td>
                                    <td style="padding:4px 8px;font-weight:600;">${UI.esc(name)}</td>
                                    <td style="padding:4px 8px;text-align:center;" class="mono">${opacity}%</td>
                                    <td style="padding:4px 8px;text-align:center;">${bypassed ? '<span style="color:var(--danger);">YES</span>' : 'No'}</td>
                                    <td style="padding:4px 8px;text-align:center;">${solo ? '<span style="color:var(--warning);">SOLO</span>' : 'No'}</td>
                                    <td style="padding:4px 8px;text-align:center;">${UI.esc(String(blend))}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    async resolumeSetOpacity(layerIdx, val) {
        try { await resolumeAPI.updateLayer(layerIdx, { video: { opacity: { value: val } } }); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async resolumeToggleBypass(layerIdx, bypassed) {
        try {
            await resolumeAPI.updateLayer(layerIdx, { bypassed: { value: bypassed } });
            await this._refreshResolume();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async resolumeToggleSolo(layerIdx, solo) {
        try {
            await resolumeAPI.updateLayer(layerIdx, { solo: { value: solo } });
            await this._refreshResolume();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async resolumeClearLayer(layerIdx) {
        try {
            await resolumeAPI.clearLayer(layerIdx);
            UI.toast(`Layer ${layerIdx} cleared`, 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _refreshResolume() {
        try {
            const comp = await resolumeAPI.getComposition();
            appState.set('composition', comp);
            const info = appState.get('serverInfo');
            if (info) info._composition = comp;
        } catch {}
        this._rerenderIfActive();
    },

    // ================================================================
    // Disguise
    // ================================================================

    _renderDisguise() {
        const state = appState.get('disguiseState') || {};
        const tracks = state.tracks || [];
        const volume = state.volume ?? 100;
        const brightness = state.brightness ?? 100;
        const transport = state.transport || {};

        return `
            ${this._header('broadcast-tower', 'Disguise Audio & Output')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Master Controls</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:90px 1fr 50px;gap:10px;align-items:center;">
                        <span style="font-size:11px;font-weight:600;">Volume</span>
                        <input type="range" min="0" max="100" value="${volume}" style="accent-color:#22c55e;"
                            oninput="EngineMixingPage.disguiseSetVolume(this.value); this.nextElementSibling.textContent=this.value+'%'">
                        <span class="mono" style="font-size:10px;">${volume}%</span>
                        <span style="font-size:11px;font-weight:600;">Brightness</span>
                        <input type="range" min="0" max="100" value="${brightness}" style="accent-color:#facc15;"
                            oninput="EngineMixingPage.disguiseSetBrightness(this.value); this.nextElementSibling.textContent=this.value+'%'">
                        <span class="mono" style="font-size:10px;">${brightness}%</span>
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-music"></i> Tracks</h3></div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${tracks.length === 0 ? '<p class="text-muted">No tracks available</p>' :
                        tracks.map((track, ti) => {
                            const name = track.name || track.uid || `Track ${ti + 1}`;
                            const uid = track.uid || '';
                            return `
                            <div style="text-align:center;min-width:80px;max-width:100px;flex-shrink:0;background:var(--bg-dark);padding:10px 8px;border-radius:6px;">
                                <div style="font-size:10px;font-weight:700;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;" title="${UI.esc(name)}">${UI.esc(name)}</div>
                                <div style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Volume</div>
                                <input type="range" min="0" max="100" value="100" style="width:70px;accent-color:#22c55e;"
                                    oninput="EngineMixingPage.disguiseSetTrackVolume('${UI.esc(uid)}', this.value)">
                                <div class="mono" style="font-size:9px;margin-top:2px;">100%</div>
                                <button class="btn btn-xs mt-sm" onclick="EngineMixingPage.disguiseGoToTrack('${UI.esc(uid)}')" title="Go to track">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>`;
                        }).join('')}
                </div>
            </div>`;
    },

    async disguiseSetVolume(val) {
        const v = parseInt(val);
        const transport = (appState.get('disguiseState') || {}).transport || {};
        const tName = transport.name || transport.uid || '';
        try { await disguiseAPI.setVolume(tName, v); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async disguiseSetBrightness(val) {
        const v = parseInt(val);
        const transport = (appState.get('disguiseState') || {}).transport || {};
        const tName = transport.name || transport.uid || '';
        try { await disguiseAPI.setBrightness(tName, v); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async disguiseSetTrackVolume(trackUid, val) {
        // Disguise volume is per-transport; use track navigate + volume
        const v = parseInt(val);
        const transport = (appState.get('disguiseState') || {}).transport || {};
        const tName = transport.name || transport.uid || '';
        try { await disguiseAPI.setVolume(tName, v); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async disguiseGoToTrack(trackUid) {
        const transport = (appState.get('disguiseState') || {}).transport || {};
        const tName = transport.name || transport.uid || '';
        try {
            await disguiseAPI.goToTrack(tName, trackUid, 'play');
            UI.toast('Jumped to track', 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // QLab
    // ================================================================

    _renderQlab() {
        const state = appState.get('qlabState') || {};
        const wsId = state.workspaceId || '';
        const runningCues = state.runningCues || [];
        const cues = state.cues || [];

        return `
            ${this._header('volume-up', 'QLab Audio Controls')}
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Master Volume</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:100px 1fr 60px;gap:8px;align-items:center;">
                        <span style="font-size:11px;font-weight:600;">Master (dB)</span>
                        <input type="range" min="-60" max="12" value="0" step="0.5" style="accent-color:#22c55e;"
                            oninput="EngineMixingPage.qlabSetMasterVolume(this.value); this.nextElementSibling.textContent=this.value+' dB'">
                        <span class="mono" style="font-size:10px;">0 dB</span>
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-play-circle"></i> Running Cues</h3>
                    <button class="btn btn-xs btn-danger" onclick="EngineMixingPage.qlabPanic()" title="Panic — stop all cues"><i class="fas fa-exclamation-triangle"></i> Panic</button>
                </div>
                <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;padding:16px;overflow-x:auto;">
                    ${runningCues.length === 0 ? '<p class="text-muted">No cues currently running</p>' :
                        runningCues.map(cue => {
                            const name = cue.listName || cue.name || cue.number || 'Cue';
                            const num = cue.number || cue.uniqueID || '';
                            return `
                            <div style="text-align:center;min-width:90px;max-width:110px;flex-shrink:0;background:var(--bg-dark);padding:10px 8px;border-radius:6px;">
                                <div style="font-size:10px;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;" title="${UI.esc(name)}">${UI.esc(name)}</div>
                                <div class="mono" style="font-size:9px;color:var(--text-muted);margin-bottom:6px;">#${UI.esc(num)}</div>
                                <div style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Level (dB)</div>
                                <input type="range" min="-60" max="12" value="0" step="0.5" style="width:80px;accent-color:#a855f7;"
                                    oninput="EngineMixingPage.qlabSetCueLevel('${UI.esc(num)}', this.value)">
                                <div style="display:flex;gap:2px;justify-content:center;margin-top:6px;">
                                    <button class="btn btn-xs" onclick="EngineMixingPage.qlabStopCue('${UI.esc(num)}')" title="Stop"><i class="fas fa-stop"></i></button>
                                </div>
                            </div>`;
                        }).join('')}
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-list"></i> Audio Cues (from Cue List)</h3></div>
                <div class="card-body">
                    ${cues.filter(c => c.type === 'Audio' || c.type === 'Fade' || c.type === 'Mic').length === 0 ?
                        '<p class="text-muted">No audio/fade cues found in cue list</p>' :
                        `<table style="width:100%;font-size:11px;border-collapse:collapse;">
                            <thead>
                                <tr style="border-bottom:1px solid var(--border-color);">
                                    <th style="text-align:left;padding:4px 8px;">Number</th>
                                    <th style="text-align:left;padding:4px 8px;">Name</th>
                                    <th style="text-align:center;padding:4px 8px;">Type</th>
                                    <th style="text-align:center;padding:4px 8px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cues.filter(c => c.type === 'Audio' || c.type === 'Fade' || c.type === 'Mic').map(c => `
                                    <tr style="border-bottom:1px solid var(--border-color);">
                                        <td style="padding:4px 8px;" class="mono">${UI.esc(c.number || '--')}</td>
                                        <td style="padding:4px 8px;font-weight:600;">${UI.esc(c.listName || c.name || '--')}</td>
                                        <td style="padding:4px 8px;text-align:center;">${UI.esc(c.type)}</td>
                                        <td style="padding:4px 8px;text-align:center;">
                                            <button class="btn btn-xs" onclick="EngineMixingPage.qlabFireCue('${UI.esc(c.number || c.uniqueID)}')" title="Fire"><i class="fas fa-play"></i></button>
                                            <button class="btn btn-xs" onclick="EngineMixingPage.qlabStopCue('${UI.esc(c.number || c.uniqueID)}')" title="Stop"><i class="fas fa-stop"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>`}
                </div>
            </div>`;
    },

    async qlabSetMasterVolume(db) {
        const wsId = (appState.get('qlabState') || {}).workspaceId;
        if (!wsId) { UI.toast('No workspace', 'warning'); return; }
        try { await qlabAPI.setMasterVolume(wsId, parseFloat(db)); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async qlabSetCueLevel(cueNum, db) {
        const wsId = (appState.get('qlabState') || {}).workspaceId;
        if (!wsId) return;
        try { await qlabAPI.setCueAudioLevel(wsId, cueNum, 0, 0, parseFloat(db)); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async qlabFireCue(cueNum) {
        const wsId = (appState.get('qlabState') || {}).workspaceId;
        if (!wsId) return;
        try {
            await qlabAPI.fireCue(wsId, cueNum);
            UI.toast(`Cue ${cueNum} fired`, 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async qlabStopCue(cueNum) {
        const wsId = (appState.get('qlabState') || {}).workspaceId;
        if (!wsId) return;
        try {
            await qlabAPI.stopCue(wsId, cueNum);
            UI.toast(`Cue ${cueNum} stopped`, 'info');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async qlabPanic() {
        const wsId = (appState.get('qlabState') || {}).workspaceId;
        if (!wsId) return;
        try {
            await qlabAPI.panic(wsId);
            UI.toast('PANIC — all cues stopped', 'warning');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // REFRESH / LIFECYCLE
    // ================================================================

    async refresh() {
        const serverType = appState.get('serverType');
        try {
            switch (serverType) {
                case 'vmix':     await this._refreshVmix(); return;
                case 'obs':      await this._refreshObs(); return;
                case 'atem':     await this._refreshAtem(); return;
                case 'resolume': await this._refreshResolume(); return;
                case 'casparcg':
                    const ch = await casparcgAPI.getChannels().catch(() => null);
                    if (ch) appState.set('casparcgChannels', ch);
                    break;
                case 'barco':
                    const bs = await barcoAPI.getState().catch(() => null);
                    if (bs) appState.set('barcoState', bs);
                    break;
                case 'pixera':
                    const ps = await pixeraAPI.getState().catch(() => null);
                    if (ps) appState.set('pixeraState', ps);
                    break;
                case 'disguise':
                    const ds = await disguiseAPI.getState().catch(() => null);
                    if (ds) appState.set('disguiseState', ds);
                    break;
                case 'qlab':
                    const qs = await qlabAPI.getState().catch(() => null);
                    if (qs) appState.set('qlabState', qs);
                    break;
            }
        } catch {}
        this._rerenderIfActive();
        UI.toast('Mixer refreshed', 'info');
    },

    _rerenderIfActive() {
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'enginemixing') {
            c.innerHTML = this.render();
        }
    },

    onActivate() {
        this.refresh();
    },

    onDeactivate() {
        // Nothing to clean up
    },
};
