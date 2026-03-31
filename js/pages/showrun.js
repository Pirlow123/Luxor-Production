/**
 * SHOW RUN — Live Show Control Interface
 * Designed to be idiot-proof: big buttons, clear labels, obvious actions.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  TRANSPORT BAR — Big GO, Play/Stop, E-STOP, Clock       │
 *  ├──────────────┬──────────────────────┬────────────────────┤
 *  │ CUE LIST     │  PRESETS             │  MIX MASTERS       │
 *  │ (big items)  │  (big grid buttons)  │  (big faders)      │
 *  │              ├──────────────────────┤                    │
 *  │ TIMELINES    │  LAYER CONTROLS      │                    │
 *  └──────────────┴──────────────────────┴────────────────────┘
 */
const ShowRunPage = {
    _activeMix: 0,
    _presetType: 'mix',
    _selectedCue: null,
    _cueListTimeline: 0,

    render() {
        if (!appState.get('connected')) {
            return `<div class="sr-empty">
                <i class="fas fa-theater-masks"></i>
                <h2>No Server Connected</h2>
                <p>Connect to an engine to enter Show Mode</p>
                <button class="btn btn-primary btn-lg" onclick="HippoApp.showAddServer()"><i class="fas fa-plus"></i> Add Server</button>
            </div>`;
        }

        const serverType = appState.get('serverType');
        switch (serverType) {
            case 'resolume': return this._renderResolume();
            case 'vmix': return this._renderVmix();
            case 'casparcg': return this._renderCasparcg();
            case 'obs': return this._renderObs();
            case 'barco': return this._renderBarco();
            case 'qlab': return this._renderQlab();
            case 'disguise': return this._renderDisguise();
            case 'pixera': return this._renderPixera();
            default: return this._renderHippo();
        }
    },

    _renderHippo() {
        const info = appState.get('serverInfo');
        const mixes = info?.mixes || [];
        const timelines = appState.get('timelines') || [];

        return `
            <!-- TRANSPORT BAR -->
            <div class="sr-transport">
                <div class="sr-transport-group">
                    <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                    <div class="sr-timecode" id="sr-timecode" title="LTC Timecode">
                        <span class="sr-timecode-label">LTC</span>
                        <span id="sr-timecode-value">00:00:00:00</span>
                    </div>
                    <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
                </div>

                <div class="sr-transport-group sr-transport-main">
                    <button class="sr-btn sr-btn-reset" onclick="HippoApp.resetAll()" title="Reset All Timelines">
                        <i class="fas fa-backward-step"></i>
                        <span>RESET</span>
                    </button>
                    <button class="sr-btn sr-btn-stop" onclick="HippoApp.stopAll()" title="Stop All Timelines">
                        <i class="fas fa-stop"></i>
                        <span>STOP</span>
                    </button>
                    <button class="sr-btn sr-btn-play" onclick="HippoApp.playAll()" title="Play All Timelines">
                        <i class="fas fa-play"></i>
                        <span>PLAY</span>
                    </button>

                    <button class="sr-go-btn" onclick="ShowRunPage.goNextCue()" title="Fire Next Cue (Spacebar)">
                        GO
                        <span class="sr-go-sub" id="sr-go-label">Next Cue</span>
                    </button>

                    <button class="sr-btn sr-btn-estop" onclick="HippoApp.emergencyStop()" title="Emergency Stop — Stops Everything">
                        <i class="fas fa-circle-xmark"></i>
                        <span>E-STOP</span>
                    </button>
                </div>

                <div class="sr-transport-group sr-transport-end">
                    <div class="sr-status-pill" id="sr-engine-pill">
                        <span class="sr-status-dot online"></span>
                        <span id="sr-engine-label">Engine Running</span>
                    </div>
                </div>
            </div>

            <!-- MAIN LAYOUT -->
            <div class="sr-layout">
                <!-- LEFT: Cue List + Timelines -->
                <div class="sr-col-left">
                    <div class="sr-panel sr-panel-grow">
                        <div class="sr-panel-head">
                            <div class="sr-panel-title"><i class="fas fa-list-ol"></i> Cue List</div>
                            <select class="sr-select" id="show-cue-tl" onchange="ShowRunPage.switchCueTimeline(this.value)">
                                ${timelines.map(tl => `<option value="${tl.iD}" ${tl.iD === this._cueListTimeline ? 'selected' : ''}>${UI.esc(tl.name || `Timeline ${tl.iD}`)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="sr-panel-body sr-cuelist" id="show-cue-list">
                            ${this._renderCueList(timelines)}
                        </div>
                    </div>

                    <div class="sr-panel">
                        <div class="sr-panel-head">
                            <div class="sr-panel-title"><i class="fas fa-stream"></i> Timelines</div>
                        </div>
                        <div class="sr-panel-body" id="show-timelines">
                            ${this._renderTimelines(timelines)}
                        </div>
                    </div>
                </div>

                <!-- CENTER: Presets + Layers -->
                <div class="sr-col-center">
                    <div class="sr-panel sr-panel-grow">
                        <div class="sr-panel-head">
                            <div class="sr-panel-title"><i class="fas fa-th"></i> Presets</div>
                            <div class="sr-tab-bar">
                                <button class="sr-tab ${this._presetType === 'mix' ? 'active' : ''}" onclick="ShowRunPage.setPresetType('mix')">Mix Presets</button>
                                <button class="sr-tab ${this._presetType === 'layer' ? 'active' : ''}" onclick="ShowRunPage.setPresetType('layer')">Layer Presets</button>
                            </div>
                            <select class="sr-select" id="show-preset-mix" onchange="ShowRunPage.setActiveMix(parseInt(this.value))">
                                ${mixes.map(m => `<option value="${m.index}" ${m.index === this._activeMix ? 'selected' : ''}>${UI.esc(m.name || `Mix ${m.index}`)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="sr-panel-body" id="show-preset-grid">
                            ${this._renderPresetGrid()}
                        </div>
                    </div>

                    <div class="sr-panel">
                        <div class="sr-panel-head">
                            <div class="sr-panel-title"><i class="fas fa-layer-group"></i> Layers — ${mixes[this._activeMix]?.name || `Mix ${this._activeMix}`}</div>
                        </div>
                        <div class="sr-panel-body" id="show-layers">
                            ${this._renderLayers(mixes)}
                        </div>
                    </div>
                </div>

                <!-- RIGHT: Mix Faders -->
                <div class="sr-col-right">
                    <div class="sr-panel sr-panel-grow">
                        <div class="sr-panel-head">
                            <div class="sr-panel-title"><i class="fas fa-sliders-h"></i> Mix Masters</div>
                        </div>
                        <div class="sr-panel-body">
                            <div class="sr-faders" id="show-faders">
                                ${this._renderFaders(mixes)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ================================================================
    // RESOLUME SHOW RUN — Composition-style with integrated controls
    // ================================================================
    _renderResolume() {
        const comp = appState.get('composition');
        // Resolume displays layers bottom-to-top (highest layer at top)
        const layers = [...(comp?.layers || [])].reverse();
        const columns = comp?.columns || [];

        return `
            <!-- TRANSPORT BAR -->
            <div class="sr-transport">
                <div class="sr-transport-group">
                    <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                    <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
                </div>

                <div class="sr-transport-group sr-transport-main">
                    <div class="sr-res-master">
                        <span class="sr-res-master-lbl">MASTER</span>
                        <input type="range" min="0" max="100" value="${Math.round((comp?.master?.value ?? 1) * 100)}" class="sr-res-master-slider" oninput="ShowRunPage.setResolumeMaster(this.value)">
                        <span class="sr-res-master-val">${Math.round((comp?.master?.value ?? 1) * 100)}%</span>
                    </div>

                    <button class="sr-btn sr-btn-estop" onclick="ShowRunPage.resolumeClearAll()" title="Clear All Layers">
                        <i class="fas fa-circle-xmark"></i>
                        <span>CLEAR ALL</span>
                    </button>
                </div>

                <div class="sr-transport-group sr-transport-end">
                    <div class="sr-status-pill" id="sr-engine-pill">
                        <span class="sr-status-dot online"></span>
                        <span id="sr-engine-label">Resolume Arena</span>
                    </div>
                </div>
            </div>

            <!-- COMPOSITION-STYLE GRID -->
            <div class="sr-res-comp">
                <!-- Column triggers header -->
                <div class="sr-res-header">
                    <div class="sr-res-ctrl-col"></div>
                    ${columns.map((col, ci) => {
                        const colName = typeof col.name === 'object' ? col.name?.value : col.name;
                        return `
                        <div class="sr-res-col-btn" onclick="ShowRunPage.resolumeColumn(${ci + 1})">
                            <i class="fas fa-chevron-down"></i>
                            ${UI.esc(colName || 'Col ' + (ci + 1))}
                        </div>`;
                    }).join('')}
                </div>

                <!-- Layer rows with clips (reversed for Resolume top-to-bottom display) -->
                ${layers.map((layer, li) => {
                    // Real layer number in the composition (1-based, original order)
                    const realLayerNum = (comp?.layers || []).indexOf(layer) + 1;
                    const opacity = Math.round((layer.master?.value ?? 1) * 100);
                    const bypassed = layer.bypassed?.value || false;
                    const solo = layer.solo?.value || false;
                    return `
                    <div class="sr-res-layer-row ${bypassed ? 'sr-res-layer-bypassed' : ''}">
                        <div class="sr-res-ctrl-col">
                            <div class="sr-res-lname">${UI.esc((typeof layer.name === 'object' ? layer.name?.value : layer.name) || 'Layer ' + realLayerNum)}</div>
                            <div class="sr-res-lbtns">
                                <button class="sr-res-lb ${bypassed ? 'sr-res-lb-r' : ''}" onclick="ShowRunPage.resolumeToggleBypass(${realLayerNum})" title="Bypass">B</button>
                                <button class="sr-res-lb ${solo ? 'sr-res-lb-y' : ''}" onclick="ShowRunPage.resolumeToggleSolo(${realLayerNum})" title="Solo">S</button>
                                <button class="sr-res-lb" onclick="ShowRunPage.resolumeClearLayer(${realLayerNum})" title="Clear"><i class="fas fa-times"></i></button>
                            </div>
                            <div class="sr-res-lfader">
                                <input type="range" min="0" max="100" value="${opacity}" class="sr-res-lslider" oninput="ShowRunPage.setResolumeLayerLevel(${realLayerNum}, this.value)">
                                <span class="sr-res-lval">${opacity}%</span>
                            </div>
                        </div>
                        ${(layer.clips || []).map((clip, ci) => {
                            // Check for content: virtual uses _hasContent, real Resolume has video/source/name
                            const hasContent = clip._hasContent || clip.video?.sourceparams || (typeof clip.name === 'object' ? clip.name?.value : clip.name);
                            if (!clip || !hasContent) return '<div class="sr-res-cell sr-res-cell-empty"></div>';
                            const connVal = typeof clip.connected === 'object' ? clip.connected?.value : clip.connected;
                            const connected = connVal === 'Connected' || connVal === 'connected' || connVal === true;
                            const pos = clip.transport?.position?.value ?? 0;
                            return `
                            <div class="sr-res-cell ${connected ? 'sr-res-cell-live' : ''}" onclick="ShowRunPage.resolumeClip(${realLayerNum}, ${ci + 1})">
                                <div class="sr-res-cell-progress" style="width:${Math.round(pos * 100)}%"></div>
                                <div class="sr-res-cell-name">${UI.esc((typeof clip.name === 'object' ? clip.name?.value : clip.name) || '')}</div>
                                ${connected ? '<div class="sr-res-cell-badge">LIVE</div>' : ''}
                            </div>`;
                        }).join('')}
                    </div>`;
                }).join('')}
            </div>
        `;
    },

    async setResolumeMaster(val) {
        const comp = appState.get('composition');
        if (comp?.master) {
            comp.master.value = parseInt(val) / 100;
            try { if (comp.master.id) await resolumeAPI.setParameter(comp.master.id, parseInt(val) / 100); } catch {}
        }
    },

    async resolumeToggleBypass(layer) {
        const comp = appState.get('composition');
        const l = comp?.layers?.[layer - 1];
        if (!l) return;
        l.bypassed.value = !l.bypassed.value;
        try { await resolumeAPI.updateLayer(layer, { bypassed: { value: l.bypassed.value } }); } catch {}
        this._refreshResolume();
    },

    async resolumeToggleSolo(layer) {
        const comp = appState.get('composition');
        const l = comp?.layers?.[layer - 1];
        if (!l) return;
        l.solo.value = !l.solo.value;
        try { await resolumeAPI.updateLayer(layer, { solo: { value: l.solo.value } }); } catch {}
        this._refreshResolume();
    },

    async resolumeClip(layer, clip) {
        try {
            await resolumeAPI.connectClip(layer, clip);
            UI.toast(`Clip ${layer}/${clip} triggered`, 'success');
            appState.log('EVENT', `Trigger clip L${layer}/C${clip}`, 'Show');
            setTimeout(() => this._refreshResolume(), 200);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async resolumeColumn(col) {
        try {
            await resolumeAPI.connectColumn(col);
            UI.toast(`Column ${col} triggered`, 'success');
            appState.log('EVENT', `Trigger column ${col}`, 'Show');
            setTimeout(() => this._refreshResolume(), 200);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async resolumeClearLayer(layer) {
        try {
            await resolumeAPI.clearLayer(layer);
            setTimeout(() => this._refreshResolume(), 200);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async resolumeClearAll() {
        const comp = appState.get('composition');
        if (!comp?.layers) return;
        for (let i = 0; i < comp.layers.length; i++) {
            try { await resolumeAPI.clearLayer(i + 1); } catch {}
        }
        UI.toast('All layers cleared', 'warning');
        appState.log('EVENT', 'CLEAR ALL layers', 'Show');
        setTimeout(() => this._refreshResolume(), 200);
    },

    async setResolumeLayerLevel(layerIdx, val) {
        const v = parseInt(val);
        const el = document.getElementById(`show-mv-${layerIdx - 1}`);
        if (el) el.textContent = `${v}%`;
        const comp = appState.get('composition');
        const layer = comp?.layers?.[layerIdx - 1];
        if (layer?.master) {
            layer.master.value = v / 100;
            try { if (layer.master.id) await resolumeAPI.setParameter(layer.master.id, v / 100); } catch {}
        }
    },

    async _refreshResolume() {
        try {
            const comp = await resolumeAPI.getComposition();
            appState.set('composition', comp);
            const container = document.getElementById('page-container');
            if (container && appState.get('currentPage') === 'showrun') {
                container.innerHTML = this.render();
            }
        } catch {}
    },

    // ================================================================
    // CUE LIST
    // ================================================================
    _renderCueList(timelines) {
        const tl = timelines.find(t => t.iD === this._cueListTimeline) || timelines[0];
        if (!tl) return '<div class="sr-empty-small"><i class="fas fa-info-circle"></i> No timelines available</div>';

        const cues = tl.commands || [];
        if (cues.length === 0) return '<div class="sr-empty-small"><i class="fas fa-info-circle"></i> No cues in this timeline</div>';

        // The next cue to fire (selected or 0)
        const nextIdx = this._selectedCue ?? 0;

        return cues.map((c, i) => {
            const isNext = i === nextIdx;
            const isPast = i < nextIdx;
            return `
            <div class="sr-cue ${isNext ? 'sr-cue-next' : ''} ${isPast ? 'sr-cue-past' : ''}"
                 onclick="ShowRunPage.selectCue(${i})"
                 ondblclick="ShowRunPage.fireCue(${tl.iD}, ${c.cueNumber})">
                <div class="sr-cue-indicator">${isNext ? '<i class="fas fa-caret-right"></i>' : ''}</div>
                <div class="sr-cue-num">${c.cueNumber}</div>
                <div class="sr-cue-info">
                    <div class="sr-cue-name">${UI.esc(c.name || `Cue ${c.cueNumber}`)}</div>
                    <div class="sr-cue-time">${UI.formatDuration(c.timeSecs)}</div>
                </div>
                <button class="sr-cue-fire" onclick="event.stopPropagation();ShowRunPage.fireCue(${tl.iD}, ${c.cueNumber})" title="Fire This Cue">
                    GO
                </button>
            </div>`;
        }).join('');
    },

    _updateCueListVisuals() {
        const nextIdx = this._selectedCue ?? 0;
        document.querySelectorAll('.sr-cue').forEach((el, i) => {
            el.classList.toggle('sr-cue-next', i === nextIdx);
            el.classList.toggle('sr-cue-past', i < nextIdx);
        });
        // Update indicators
        document.querySelectorAll('.sr-cue-indicator').forEach((el, i) => {
            el.innerHTML = i === nextIdx ? '<i class="fas fa-caret-right"></i>' : '';
        });
        // Update GO button label
        const tl = (appState.get('timelines') || []).find(t => t.iD === this._cueListTimeline);
        const cues = tl?.commands || [];
        const nextCue = cues[nextIdx];
        const goLabel = document.getElementById('sr-go-label');
        if (goLabel) goLabel.textContent = nextCue ? nextCue.name : 'Next Cue';
        // Scroll active into view
        const activeEl = document.querySelector('.sr-cue.sr-cue-next');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },

    switchCueTimeline(val) {
        this._cueListTimeline = parseInt(val);
        this._selectedCue = null;
        const el = document.getElementById('show-cue-list');
        if (el) el.innerHTML = this._renderCueList(appState.get('timelines') || []);
    },

    selectCue(idx) {
        this._selectedCue = idx;
        this._updateCueListVisuals();
    },

    async fireCue(tlId, cueNum) {
        try {
            await hippoAPI.timelineGoCue(tlId, cueNum);
            UI.toast(`Cue ${cueNum} fired`, 'success');
            appState.log('EVENT', `GO cue ${cueNum} → TL ${tlId}`, 'Show');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async goNextCue() {
        const timelines = appState.get('timelines') || [];
        const tl = timelines.find(t => t.iD === this._cueListTimeline) || timelines[0];
        if (!tl) return;

        const cues = tl.commands || [];
        if (cues.length === 0) return;

        // Fire the currently selected cue (or first)
        const fireIdx = this._selectedCue ?? 0;
        const cue = cues[fireIdx];
        if (cue) this.fireCue(tl.iD, cue.cueNumber);

        // Advance to next
        this._selectedCue = Math.min(fireIdx + 1, cues.length - 1);
        this._updateCueListVisuals();
    },

    // ================================================================
    // TIMELINES
    // ================================================================
    _renderTimelines(timelines) {
        if (!timelines.length) return '<div class="sr-empty-small"><i class="fas fa-info-circle"></i> No timelines</div>';
        return timelines.map(tl => `
            <div class="sr-tl">
                <div class="sr-tl-info">
                    <span class="sr-tl-id">${tl.iD}</span>
                    <span class="sr-tl-name">${UI.esc(tl.name || `Timeline ${tl.iD}`)}</span>
                </div>
                <div class="sr-tl-actions">
                    <button class="sr-tl-btn sr-tl-play" onclick="HippoApp.tlPlay(${tl.iD})" title="Play"><i class="fas fa-play"></i></button>
                    <button class="sr-tl-btn sr-tl-stop" onclick="HippoApp.tlStop(${tl.iD})" title="Stop"><i class="fas fa-stop"></i></button>
                    <button class="sr-tl-btn" onclick="HippoApp.tlReset(${tl.iD})" title="Reset"><i class="fas fa-undo"></i></button>
                </div>
            </div>
        `).join('');
    },

    // ================================================================
    // PRESETS
    // ================================================================
    _renderPresetGrid() {
        const presets = this._presetType === 'mix' ? appState.get('mixPresets') : appState.get('layerPresets');
        if (!presets || !presets.banks) return UI.loading('Loading presets...');

        const banks = presets.banks.filter(b => b.hasPresets);
        if (banks.length === 0) return '<div class="sr-empty-small"><i class="fas fa-info-circle"></i> No presets available</div>';

        return banks.map(bank => `
            <div class="sr-preset-bank">
                <div class="sr-preset-bank-label">${UI.esc(bank.name || `Bank ${bank.index}`)}</div>
                <div class="sr-preset-grid">
                    ${(bank.presets || []).map(p => this._presetSlot(p, bank.index)).join('')}
                </div>
            </div>
        `).join('');
    },

    _presetSlot(preset, bankIdx) {
        return `
            <button class="sr-preset" onclick="ShowRunPage.firePreset('${preset.iD}', ${bankIdx}, ${preset.index})" title="Click to fire: ${UI.esc(preset.name)}">
                <div class="sr-preset-name">${UI.esc(preset.name || `Slot ${preset.index}`)}</div>
                <div class="sr-preset-meta">B${bankIdx}:S${preset.index}${preset.fadeTime ? ` · ${preset.fadeTime}s` : ''}</div>
            </button>
        `;
    },

    async firePreset(presetId, bank, slot) {
        const mixIndex = this._activeMix;
        try {
            if (this._presetType === 'mix') {
                await hippoAPI.loadMixPresetById(mixIndex, presetId);
            } else {
                await hippoAPI.loadLayerPresetById(mixIndex, 0, presetId);
            }
            UI.toast(`Preset fired on Mix ${mixIndex}`, 'success');
            appState.log('EVENT', `Fire preset B${bank}:S${slot} → Mix ${mixIndex}`, 'Show');

            // Visual feedback on clicked button
            const btn = event?.target?.closest('.sr-preset');
            if (btn) {
                btn.classList.add('sr-preset-fired');
                setTimeout(() => btn.classList.remove('sr-preset-fired'), 600);
            }
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    setPresetType(type) {
        this._presetType = type;
        document.querySelectorAll('.sr-tab').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().startsWith(type)));
        const grid = document.getElementById('show-preset-grid');
        if (grid) grid.innerHTML = this._renderPresetGrid();
    },

    setActiveMix(idx) {
        this._activeMix = idx;
        const grid = document.getElementById('show-preset-grid');
        if (grid) grid.innerHTML = this._renderPresetGrid();
        const layers = document.getElementById('show-layers');
        if (layers) layers.innerHTML = this._renderLayers(appState.get('serverInfo')?.mixes || []);
    },

    // ================================================================
    // LAYER CONTROLS
    // ================================================================
    _renderLayers(mixes) {
        const mix = mixes.find(m => m.index === this._activeMix) || mixes[0];
        if (!mix || !mix.hasLayers) return '<div class="sr-empty-small"><i class="fas fa-info-circle"></i> No layers on this mix</div>';

        const layers = [];
        for (let i = 0; i < (mix.layerCount || 0); i++) layers.push(i);

        return `<div class="sr-layer-grid">${layers.map(i => {
            const key = `${mix.index}-${i}`;
            const level = appState.get('layerLevels')[key] ?? 0;
            return `
                <div class="sr-layer">
                    <div class="sr-layer-head">
                        <span class="sr-layer-name">Layer ${i}</span>
                        <span class="sr-layer-val" id="show-lv-${key}">${level}%</span>
                    </div>
                    <input type="range" class="sr-layer-slider" min="0" max="100" value="${level}"
                        oninput="ShowRunPage.setLayerLevel(${mix.index}, ${i}, this.value)">
                    <div class="sr-layer-actions">
                        <button class="sr-layer-btn" onclick="ShowRunPage.setLayerLevel(${mix.index}, ${i}, 100)">Full</button>
                        <button class="sr-layer-btn sr-layer-btn-cut" onclick="ShowRunPage.setLayerLevel(${mix.index}, ${i}, 0)">Cut</button>
                        <button class="sr-layer-btn" onclick="ShowRunPage.pickLayerMedia(${mix.index}, ${i})"><i class="fas fa-film"></i> Media</button>
                    </div>
                </div>
            `;
        }).join('')}</div>`;
    },

    async setLayerLevel(mixIndex, layerIndex, val) {
        const v = parseInt(val);
        const key = `${mixIndex}-${layerIndex}`;
        const el = document.getElementById(`show-lv-${key}`);
        if (el) el.textContent = `${v}%`;
        // Update slider visually
        const slider = document.querySelector(`.sr-layer-slider[oninput*="setLayerLevel(${mixIndex}, ${layerIndex}"]`);
        if (slider && slider !== document.activeElement) slider.value = v;
        try { await hippoAPI.setLayerLevel(mixIndex, layerIndex, v); } catch {}
        appState.set('layerLevels', { ...appState.get('layerLevels'), [key]: v });
    },

    pickLayerMedia(mixIndex, layerIndex) {
        const map = appState.get('mediaMap');
        const entries = map?.entries || [];
        const list = entries.length === 0
            ? '<p style="text-align:center;color:var(--text-muted);padding:20px">No media files in the map</p>'
            : `<div class="sr-media-picker">${entries.map(e => `
                <button class="sr-media-pick-btn" onclick="ShowRunPage.loadLayerMedia(${mixIndex}, ${layerIndex}, '${e.mediaID}', '${UI.esc(e.name)}')">
                    <i class="fas fa-film"></i>
                    <span>${UI.esc(e.name || `#${e.index}`)}</span>
                </button>
            `).join('')}</div>`;
        UI.openModal(`Load Media → Layer ${layerIndex}`, list);
    },

    async loadLayerMedia(mixIndex, layerIndex, mediaID, name) {
        UI.closeModal();
        try {
            await hippoAPI.loadLayerMediaById(mixIndex, layerIndex, mediaID);
            UI.toast(`"${name}" loaded on Layer ${layerIndex}`, 'success');
            appState.log('EVENT', `Load ${name} → M${mixIndex}/L${layerIndex}`, 'Show');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // MIX FADERS
    // ================================================================
    _renderFaders(mixes) {
        if (!mixes.length) return '<div class="sr-empty-small">No mixes</div>';

        return mixes.map(m => {
            const level = appState.get('mixLevels')[m.index] ?? 0;
            return `
                <div class="sr-fader">
                    <div class="sr-fader-label">${UI.esc(m.name || `Mix ${m.index}`)}</div>
                    <div class="sr-fader-track">
                        <input type="range" class="sr-fader-input" min="0" max="100" value="${level}"
                            orient="vertical"
                            oninput="ShowRunPage.setMixLevel(${m.index}, this.value)">
                    </div>
                    <div class="sr-fader-value" id="show-mv-${m.index}">${level}%</div>
                    <div class="sr-fader-btns">
                        <button class="sr-fader-full" onclick="ShowRunPage.setMixLevel(${m.index}, 100)">FULL</button>
                        <button class="sr-fader-cut" onclick="ShowRunPage.setMixLevel(${m.index}, 0)">CUT</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async setMixLevel(mixIndex, val) {
        const v = parseInt(val);
        const el = document.getElementById(`show-mv-${mixIndex}`);
        if (el) el.textContent = `${v}%`;
        const slider = document.querySelector(`.sr-fader-input[oninput*="setMixLevel(${mixIndex},"]`);
        if (slider && slider !== document.activeElement) slider.value = v;
        try { await hippoAPI.setMixLevel(mixIndex, v); } catch {}
        appState.set('mixLevels', { ...appState.get('mixLevels'), [mixIndex]: v });
    },

    // ================================================================
    // VMIX SHOW RUN
    // ================================================================
    _renderVmix() {
        const vs = appState.get('vmixState');
        const inputs = vs?.inputs || [];
        const activeNum = vs?.activeInput || 1;
        const previewNum = vs?.previewInput || 2;
        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group">
                <button class="sr-btn sr-btn-go" onclick="ShowRunPage.vmixCut()" style="background:linear-gradient(135deg,#3b82f6,#2563eb);min-width:100px;">CUT</button>
                <button class="sr-btn sr-btn-accent" onclick="ShowRunPage.vmixFade()" style="min-width:100px;"><i class="fas fa-exchange-alt"></i> FADE</button>
                <button class="sr-btn ${vs?.fadeToBlack ? 'sr-btn-estop' : 'sr-btn-stop'}" onclick="ShowRunPage.vmixFTB()"><i class="fas fa-moon"></i> FTB</button>
            </div>
            <div class="sr-transport-group">
                <button class="sr-btn ${vs?.recording ? 'sr-btn-estop' : ''}" onclick="ShowRunPage.vmixToggleRecord()" style="min-width:80px;"><i class="fas fa-circle"></i> ${vs?.recording ? 'STOP REC' : 'REC'}</button>
                <button class="sr-btn ${vs?.streaming ? 'sr-btn-estop' : ''}" onclick="ShowRunPage.vmixToggleStream()" style="min-width:80px;"><i class="fas fa-broadcast-tower"></i> ${vs?.streaming ? 'STOP' : 'STREAM'}</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="card">
                <div class="card-header" style="background:rgba(34,197,94,0.1);"><h3 style="color:#4ade80;"><i class="fas fa-tv"></i> PROGRAM</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;">
                        ${inputs.map(inp => `
                            <button class="sr-btn" onclick="ShowRunPage.vmixSetActive(${inp.number})" style="
                                padding:14px 8px;font-size:11px;font-weight:700;text-align:center;
                                ${inp.number === activeNum ? 'background:#4ade80;color:#000;border-color:#4ade80;' : ''}
                            "><span style="display:block;font-size:16px;margin-bottom:4px;">${inp.number}</span>${UI.esc(inp.title)}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header" style="background:rgba(250,204,21,0.1);"><h3 style="color:#facc15;"><i class="fas fa-eye"></i> PREVIEW</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;">
                        ${inputs.map(inp => `
                            <button class="sr-btn" onclick="ShowRunPage.vmixSetPreview(${inp.number})" style="
                                padding:14px 8px;font-size:11px;font-weight:700;text-align:center;
                                ${inp.number === previewNum ? 'background:#facc15;color:#000;border-color:#facc15;' : ''}
                            "><span style="display:block;font-size:16px;margin-bottom:4px;">${inp.number}</span>${UI.esc(inp.title)}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="card mt-md">
            <div class="card-header"><h3><i class="fas fa-volume-up"></i> Audio</h3></div>
            <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;">
                ${inputs.map(inp => `
                    <div style="text-align:center;min-width:60px;">
                        <div style="font-size:10px;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;">${UI.esc(inp.title)}</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${inp.volume ?? 100}"
                            style="writing-mode:vertical-lr;direction:rtl;height:80px;accent-color:var(--accent);"
                            oninput="ShowRunPage.vmixSetVolume(${inp.number}, this.value)">
                        <div style="font-size:9px;margin-top:2px;" class="mono">${inp.volume ?? 100}%</div>
                        <button class="btn btn-xs ${inp.muted ? 'btn-danger' : ''}" onclick="ShowRunPage.vmixToggleMute(${inp.number})" style="margin-top:2px;">
                            <i class="fas fa-${inp.muted ? 'volume-mute' : 'volume-up'}"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    async vmixCut() { await vmixAPI.cut(); this._refreshVmix(); },
    async vmixFade() { await vmixAPI.fade(); this._refreshVmix(); },
    async vmixFTB() { await vmixAPI.fadeToBlack(); this._refreshVmix(); },
    async vmixSetActive(n) { await vmixAPI.setActive(n); this._refreshVmix(); },
    async vmixSetPreview(n) { await vmixAPI.setPreview(n); this._refreshVmix(); },
    async vmixSetVolume(n, v) { await vmixAPI.setVolume(n, v); },
    async vmixToggleMute(n) {
        const vs = appState.get('vmixState');
        const inp = vs?.inputs?.find(i => i.number === n);
        if (inp) { inp.muted ? await vmixAPI.audioOn(n) : await vmixAPI.audioOff(n); this._refreshVmix(); }
    },
    async vmixToggleRecord() { const vs = appState.get('vmixState'); vs?.recording ? await vmixAPI.stopRecording() : await vmixAPI.startRecording(); this._refreshVmix(); },
    async vmixToggleStream() { const vs = appState.get('vmixState'); vs?.streaming ? await vmixAPI.stopStreaming() : await vmixAPI.startStreaming(); this._refreshVmix(); },
    async _refreshVmix() {
        try { const s = await vmixAPI.getState(); appState.set('vmixState', s); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // CASPARCG SHOW RUN
    // ================================================================
    _renderCasparcg() {
        const channels = appState.get('casparcgChannels') || [];
        const media = appState.get('casparcgMedia') || [];
        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group">
                <button class="sr-btn sr-btn-estop" onclick="ShowRunPage.casparcgClearAll()"><i class="fas fa-ban"></i> CLEAR ALL</button>
            </div>
        </div>
        ${channels.map((ch, ci) => `
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-tv"></i> Channel ${ch.id || ci+1} <span class="mono text-muted" style="font-size:10px">${ch.format || '1080i5000'}</span></h3>
                    <button class="btn btn-xs btn-danger" onclick="ShowRunPage.casparcgClearChannel(${ch.id || ci+1})"><i class="fas fa-ban"></i> Clear</button>
                </div>
                <div class="card-body">
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
                        ${media.map(m => `
                            <button class="btn btn-xs" onclick="ShowRunPage.casparcgPlay(${ch.id || ci+1}, 10, '${m}')" style="font-size:10px;font-weight:600;">
                                <i class="fas fa-play"></i> ${UI.esc(typeof m === 'string' ? m : m.name || m.clip)}
                            </button>
                        `).join('')}
                    </div>
                    <table style="font-size:11px;">
                        <thead><tr><th>Layer</th><th>Clip</th><th>State</th><th>Opacity</th><th>Actions</th></tr></thead>
                        <tbody>
                        ${(ch.layers || []).filter(l => l.clip).map(l => `<tr>
                            <td class="mono">${l.id || l.layer}</td>
                            <td><strong>${UI.esc(l.clip)}</strong></td>
                            <td>${l.playing ? UI.badge('Playing', 'green') : UI.badge('Stopped', 'orange')}</td>
                            <td><input type="range" min="0" max="100" value="${Math.round((l.opacity??1)*100)}" style="width:60px;accent-color:var(--accent);"
                                oninput="ShowRunPage.casparcgSetOpacity(${ch.id||ci+1},${l.id||l.layer},this.value/100)"></td>
                            <td>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgStop(${ch.id||ci+1},${l.id||l.layer})"><i class="fas fa-stop"></i></button>
                                <button class="btn btn-xs btn-danger" onclick="ShowRunPage.casparcgClear(${ch.id||ci+1},${l.id||l.layer})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`).join('') || '<tr><td colspan="5" class="text-muted">No active layers</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('')}`;
    },

    async casparcgPlay(ch, layer, clip) { await casparcgAPI.playMedia(ch, layer, clip); this._refreshCasparcg(); },
    async casparcgStop(ch, layer) { await casparcgAPI.stopLayer(ch, layer); this._refreshCasparcg(); },
    async casparcgClear(ch, layer) { await casparcgAPI.clearLayer(ch, layer); this._refreshCasparcg(); },
    async casparcgClearChannel(ch) { await casparcgAPI.clearChannel(ch); this._refreshCasparcg(); },
    async casparcgClearAll() {
        const channels = appState.get('casparcgChannels') || [];
        for (const ch of channels) await casparcgAPI.clearChannel(ch.id || 1).catch(() => {});
        this._refreshCasparcg();
    },
    async casparcgSetOpacity(ch, layer, val) { await casparcgAPI.setOpacity(ch, layer, val); },
    async _refreshCasparcg() {
        try { const ch = await casparcgAPI.getChannels(); appState.set('casparcgChannels', ch); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // OBS SHOW RUN
    // ================================================================
    _renderObs() {
        const scenes = appState.get('obsScenes') || [];
        const currentScene = appState.get('obsCurrentScene');
        const previewScene = appState.get('obsPreviewScene');
        const rawInputs = appState.get('obsInputs') || [];
        const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
        const streamStatus = appState.get('obsStreamStatus');
        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group">
                <button class="sr-btn sr-btn-go" onclick="ShowRunPage.obsTransition()" style="background:linear-gradient(135deg,#22c55e,#16a34a);min-width:120px;"><i class="fas fa-exchange-alt"></i> TRANSITION</button>
                <button class="sr-btn ${streamStatus?.streaming ? 'sr-btn-estop' : ''}" onclick="ShowRunPage.obsToggleStream()" style="min-width:80px;"><i class="fas fa-broadcast-tower"></i> ${streamStatus?.streaming ? 'STOP' : 'STREAM'}</button>
                <button class="sr-btn ${streamStatus?.recording ? 'sr-btn-estop' : ''}" onclick="ShowRunPage.obsToggleRecord()" style="min-width:80px;"><i class="fas fa-circle"></i> ${streamStatus?.recording ? 'STOP' : 'REC'}</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="card">
                <div class="card-header" style="background:rgba(34,197,94,0.1);"><h3 style="color:#4ade80;"><i class="fas fa-camera"></i> PROGRAM</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;">
                        ${scenes.map(s => {
                            const name = s.sceneName || s;
                            return `<button class="sr-btn" onclick="ShowRunPage.obsSetProgram('${UI.esc(name)}')" style="
                                padding:16px 10px;font-size:12px;font-weight:700;text-align:center;
                                ${name === currentScene ? 'background:#4ade80;color:#000;border-color:#4ade80;' : ''}
                            ">${UI.esc(name)}</button>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header" style="background:rgba(250,204,21,0.1);"><h3 style="color:#facc15;"><i class="fas fa-eye"></i> PREVIEW</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;">
                        ${scenes.map(s => {
                            const name = s.sceneName || s;
                            return `<button class="sr-btn" onclick="ShowRunPage.obsSetPreview('${UI.esc(name)}')" style="
                                padding:16px 10px;font-size:12px;font-weight:700;text-align:center;
                                ${name === previewScene ? 'background:#facc15;color:#000;border-color:#facc15;' : ''}
                            ">${UI.esc(name)}</button>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="card mt-md">
            <div class="card-header"><h3><i class="fas fa-volume-up"></i> Audio Sources</h3></div>
            <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;">
                ${inputs.filter(i => i.inputKind?.includes('audio') || i.inputKind?.includes('wasapi') || i.inputKind?.includes('pulse')).map(inp => `
                    <div style="text-align:center;min-width:60px;">
                        <div style="font-size:10px;font-weight:700;margin-bottom:4px;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.esc(inp.inputName)}</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${Math.round((inp.volumeMul ?? 1) * 100)}"
                            style="writing-mode:vertical-lr;direction:rtl;height:80px;accent-color:var(--accent);"
                            oninput="ShowRunPage.obsSetVolume('${UI.esc(inp.inputName)}', this.value/100)">
                        <button class="btn btn-xs ${inp.muted ? 'btn-danger' : ''}" onclick="ShowRunPage.obsToggleMute('${UI.esc(inp.inputName)}')" style="margin-top:4px;">
                            <i class="fas fa-${inp.muted ? 'volume-mute' : 'volume-up'}"></i>
                        </button>
                    </div>
                `).join('') || '<p class="text-muted">No audio sources</p>'}
            </div>
        </div>`;
    },

    async obsTransition() { await obsAPI.triggerTransition(); this._refreshObs(); },
    async obsSetProgram(name) { await obsAPI.setCurrentScene(name); this._refreshObs(); },
    async obsSetPreview(name) { await obsAPI.setPreviewScene(name); this._refreshObs(); },
    async obsSetVolume(name, vol) { await obsAPI.setVolume(name, vol); },
    async obsToggleMute(name) {
        const rawInputs = appState.get('obsInputs') || [];
        const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
        const inp = inputs.find(i => i.inputName === name);
        if (inp) { await obsAPI.setMute(name, !inp.muted); this._refreshObs(); }
    },
    async obsToggleStream() { const s = appState.get('obsStreamStatus'); s?.streaming ? await obsAPI.stopStreaming() : await obsAPI.startStreaming(); this._refreshObs(); },
    async obsToggleRecord() { const s = appState.get('obsStreamStatus'); s?.recording ? await obsAPI.stopRecording() : await obsAPI.startRecording(); this._refreshObs(); },
    async _refreshObs() {
        try {
            const scenes = await obsAPI.getSceneList();
            if (scenes) {
                appState.set('obsScenes', scenes.scenes);
                appState.set('obsCurrentScene', scenes.currentProgramSceneName);
                appState.set('obsPreviewScene', scenes.currentPreviewSceneName);
            }
        } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // BARCO E2 SHOW RUN
    // ================================================================
    _renderBarco() {
        const barcoState = appState.get('barcoState') || {};
        const presets = barcoState.presets || [];
        const destinations = barcoState.destinations || [];
        const activePreset = barcoState.activePreset;
        const sources = barcoState.sources || [];

        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group sr-transport-main">
                <button class="sr-btn sr-btn-go" onclick="ShowRunPage.barcoCut()" style="background:linear-gradient(135deg,#ef4444,#dc2626);min-width:120px;font-size:18px;font-weight:900;">
                    <i class="fas fa-cut"></i> CUT
                </button>
                <button class="sr-btn sr-btn-accent" onclick="ShowRunPage.barcoDissolve()" style="min-width:120px;font-size:18px;font-weight:900;">
                    <i class="fas fa-exchange-alt"></i> DISSOLVE
                </button>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <div class="sr-status-pill" id="sr-engine-pill">
                    <span class="sr-status-dot online"></span>
                    <span id="sr-engine-label">Barco E2</span>
                </div>
            </div>
        </div>

        <!-- Program / Preview Destinations -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="card">
                <div class="card-header" style="background:rgba(34,197,94,0.1);"><h3 style="color:#4ade80;"><i class="fas fa-tv"></i> PROGRAM</h3></div>
                <div class="card-body">
                    ${destinations.map(dest => `
                        <div class="sr-tl" style="margin-bottom:8px;">
                            <div class="sr-tl-info">
                                <span class="sr-tl-name">${UI.esc(dest.name || 'Destination ' + dest.id)}</span>
                            </div>
                            <div class="sr-tl-actions">
                                <button class="sr-btn" onclick="ShowRunPage.barcoFreezeDestination(${dest.id})" title="Freeze"><i class="fas fa-snowflake"></i></button>
                                <button class="sr-btn" onclick="ShowRunPage.barcoUnfreezeDestination(${dest.id})" title="Unfreeze"><i class="fas fa-sun"></i></button>
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Source</label>
                            <select class="sr-select" onchange="ShowRunPage.barcoAssignSource(${dest.id}, this.value)">
                                <option value="">-- Select Source --</option>
                                ${sources.map(s => `<option value="${s.id}" ${dest.sourceId === s.id ? 'selected' : ''}>${UI.esc(s.name || 'Source ' + s.id)}</option>`).join('')}
                            </select>
                        </div>
                    `).join('') || '<p class="text-muted">No destinations</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header" style="background:rgba(250,204,21,0.1);"><h3 style="color:#facc15;"><i class="fas fa-eye"></i> PREVIEW</h3></div>
                <div class="card-body">
                    ${destinations.map(dest => `
                        <div class="sr-tl" style="margin-bottom:8px;">
                            <div class="sr-tl-info">
                                <span class="sr-tl-name">${UI.esc(dest.name || 'Destination ' + dest.id)}</span>
                            </div>
                        </div>
                    `).join('') || '<p class="text-muted">No destinations</p>'}
                </div>
            </div>
        </div>

        <!-- Preset Grid -->
        <div class="card mt-md">
            <div class="card-header"><h3><i class="fas fa-th"></i> Presets</h3></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
                    ${presets.map(p => `
                        <button class="sr-btn" onclick="ShowRunPage.barcoActivatePreset(${p.id})" ondblclick="ShowRunPage.barcoPreviewPreset(${p.id})" style="
                            padding:20px 12px;font-size:14px;font-weight:700;text-align:center;
                            ${p.id === activePreset ? 'background:#4ade80;color:#000;border-color:#4ade80;' : ''}
                        ">
                            <span style="display:block;font-size:10px;color:${p.id === activePreset ? '#000' : 'var(--text-muted)'};margin-bottom:4px;">Preset ${p.id}</span>
                            ${UI.esc(p.name || 'Preset ' + p.id)}
                        </button>
                    `).join('') || '<p class="text-muted">No presets available</p>'}
                </div>
            </div>
        </div>`;
    },

    async barcoCut() {
        try { await barcoAPI.cut(); UI.toast('CUT executed', 'success'); appState.log('EVENT', 'Barco CUT', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async barcoDissolve() {
        try { await barcoAPI.dissolve(); UI.toast('DISSOLVE executed', 'success'); appState.log('EVENT', 'Barco DISSOLVE', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async barcoActivatePreset(id) {
        try { await barcoAPI.activatePreset(id, 'program'); UI.toast(`Preset ${id} activated`, 'success'); appState.log('EVENT', `Barco activate preset ${id} → Program`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async barcoPreviewPreset(id) {
        try { await barcoAPI.activatePreset(id, 'preview'); UI.toast(`Preset ${id} previewed`, 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async barcoFreezeDestination(id) {
        try { await barcoAPI.freezeDestination(id); UI.toast(`Destination ${id} frozen`, 'warning'); appState.log('EVENT', `Barco freeze dest ${id}`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async barcoUnfreezeDestination(id) {
        try { await barcoAPI.unfreezeDestination(id); UI.toast(`Destination ${id} unfrozen`, 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async barcoAssignSource(destId, sourceId) {
        try { await barcoAPI.assignSource(destId, sourceId); UI.toast('Source assigned', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshBarco();
    },
    async _refreshBarco() {
        try { const s = await barcoAPI.getState(); appState.set('barcoState', s); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // QLAB SHOW RUN
    // ================================================================
    _renderQlab() {
        const qlabState = appState.get('qlabState') || {};
        const wsId = qlabState.workspaceId || '';
        const cues = qlabState.cues || [];
        const currentCueId = qlabState.currentCueId;
        const masterVolume = qlabState.masterVolume ?? 100;

        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group sr-transport-main">
                <button class="sr-btn" onclick="ShowRunPage.qlabPrevious()" style="min-width:60px;"><i class="fas fa-backward-step"></i> PREV</button>
                <button class="sr-go-btn" onclick="ShowRunPage.qlabGo()" title="GO — Fire Next Cue" style="background:linear-gradient(135deg,#22c55e,#16a34a);min-width:120px;min-height:80px;font-size:28px;font-weight:900;">
                    GO
                </button>
                <button class="sr-btn" onclick="ShowRunPage.qlabNext()" style="min-width:60px;">NEXT <i class="fas fa-forward-step"></i></button>
                <button class="sr-btn sr-btn-stop" onclick="ShowRunPage.qlabStop()" style="min-width:80px;"><i class="fas fa-stop"></i> STOP</button>
                <button class="sr-btn" onclick="ShowRunPage.qlabPause()" style="min-width:80px;"><i class="fas fa-pause"></i> PAUSE</button>
                <button class="sr-btn" onclick="ShowRunPage.qlabResume()" style="min-width:80px;"><i class="fas fa-play"></i> RESUME</button>
                <button class="sr-btn sr-btn-estop" onclick="ShowRunPage.qlabPanic()" title="PANIC — Stop Everything" style="min-width:80px;animation:sr-panic-flash 0.5s infinite;">
                    <i class="fas fa-exclamation-triangle"></i> PANIC
                </button>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <div class="sr-status-pill" id="sr-engine-pill">
                    <span class="sr-status-dot online"></span>
                    <span id="sr-engine-label">QLab</span>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 200px;gap:12px;margin-top:12px;">
            <!-- Cue List -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-list-ol"></i> Cue List</h3></div>
                <div class="card-body" style="max-height:60vh;overflow-y:auto;">
                    ${cues.length ? cues.map(cue => {
                        const isActive = cue.uniqueId === currentCueId || cue.number === currentCueId;
                        const statusClass = cue.isRunning ? 'green' : (cue.isLoaded ? 'blue' : 'gray');
                        const statusLabel = cue.isRunning ? 'Running' : (cue.isLoaded ? 'Loaded' : 'Idle');
                        return `
                        <div class="sr-cue ${isActive ? 'sr-cue-next' : ''}" onclick="ShowRunPage.qlabFireCue('${UI.esc(cue.number)}')" style="cursor:pointer;">
                            <div class="sr-cue-indicator">${isActive ? '<i class="fas fa-caret-right"></i>' : ''}</div>
                            <div class="sr-cue-num">${UI.esc(cue.number || '')}</div>
                            <div class="sr-cue-info">
                                <div class="sr-cue-name">${UI.esc(cue.name || 'Untitled')}</div>
                                <div class="sr-cue-time">
                                    <span class="badge" style="font-size:9px;background:var(--bg-tertiary);color:var(--text-muted);margin-right:4px;">${UI.esc(cue.type || 'Cue')}</span>
                                    ${cue.duration ? UI.formatDuration(cue.duration) : ''}
                                </div>
                            </div>
                            <div>${UI.badge(statusLabel, statusClass)}</div>
                        </div>`;
                    }).join('') : '<p class="text-muted" style="padding:20px;text-align:center;">No cues loaded</p>'}
                </div>
            </div>

            <!-- Master Volume -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-volume-up"></i> Master</h3></div>
                <div class="card-body" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                    <input type="range" orient="vertical" min="0" max="100" value="${masterVolume}"
                        style="writing-mode:vertical-lr;direction:rtl;height:200px;accent-color:var(--accent);"
                        oninput="ShowRunPage.qlabSetVolume(this.value)">
                    <div class="mono" style="font-size:14px;font-weight:700;">${masterVolume}%</div>
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Master Volume</div>
                </div>
            </div>
        </div>`;
    },

    async qlabGo() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.go(wsId); UI.toast('GO', 'success'); appState.log('EVENT', 'QLab GO', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabStop() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.stop(wsId); UI.toast('STOP', 'warning'); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabPause() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.pause(wsId); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabResume() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.resume(wsId); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabPanic() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.panic(wsId); UI.toast('PANIC — All cues stopped', 'error'); appState.log('EVENT', 'QLab PANIC', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabFireCue(num) {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.fireCue(wsId, num); UI.toast(`Cue ${num} fired`, 'success'); appState.log('EVENT', `QLab fire cue ${num}`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabNext() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.next(wsId); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabPrevious() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.previous(wsId); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabSetVolume(val) {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.setMasterVolume(wsId, parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async _refreshQlab() {
        try { const s = await qlabAPI.getState(); appState.set('qlabState', s); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // DISGUISE SHOW RUN
    // ================================================================
    _renderDisguise() {
        const dState = appState.get('disguiseState') || {};
        const transport = dState.transport || {};
        const tracks = dState.tracks || [];
        const currentSection = dState.currentSection || 'N/A';
        const timecode = dState.timecode || '00:00:00:00';
        const speed = dState.speed ?? 1;
        const masterBrightness = dState.masterBrightness ?? 100;
        const masterVolume = dState.masterVolume ?? 100;
        const isPlaying = transport.state === 'playing';
        const isPaused = transport.state === 'paused';

        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <div class="sr-timecode" id="sr-timecode" title="Timecode">
                    <span class="sr-timecode-label">TC</span>
                    <span id="sr-timecode-value">${UI.esc(timecode)}</span>
                </div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group sr-transport-main">
                <button class="sr-btn ${isPlaying ? 'sr-btn-play' : ''}" onclick="ShowRunPage.disguisePlay()" style="min-width:80px;"><i class="fas fa-play"></i> PLAY</button>
                <button class="sr-btn ${isPaused ? 'sr-btn-accent' : ''}" onclick="ShowRunPage.disguisePause()" style="min-width:80px;"><i class="fas fa-pause"></i> PAUSE</button>
                <button class="sr-btn sr-btn-stop" onclick="ShowRunPage.disguiseStop()" style="min-width:80px;"><i class="fas fa-stop"></i> STOP</button>
                <div style="display:flex;align-items:center;gap:6px;margin-left:16px;">
                    <button class="sr-btn" onclick="ShowRunPage.disguisePrevSection()" title="Previous Section"><i class="fas fa-backward-step"></i></button>
                    <div style="font-size:12px;font-weight:700;min-width:120px;text-align:center;padding:6px 12px;background:var(--bg-tertiary);border-radius:6px;">${UI.esc(currentSection)}</div>
                    <button class="sr-btn" onclick="ShowRunPage.disguiseNextSection()" title="Next Section"><i class="fas fa-forward-step"></i></button>
                </div>
                <div class="sr-status-pill" style="margin-left:12px;">
                    <span>Speed: ${speed}x</span>
                </div>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <div class="sr-status-pill" id="sr-engine-pill">
                    <span class="sr-status-dot online"></span>
                    <span id="sr-engine-label">Disguise</span>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 240px;gap:12px;margin-top:12px;">
            <!-- Tracks -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-stream"></i> Tracks</h3></div>
                <div class="card-body">
                    ${tracks.length ? tracks.map(track => `
                        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-color);">
                            <div style="min-width:120px;font-weight:700;font-size:12px;">${UI.esc(track.name || 'Track ' + track.id)}</div>
                            <div style="flex:1;display:flex;align-items:center;gap:8px;">
                                <span style="font-size:9px;color:var(--text-muted);width:50px;">VOL</span>
                                <input type="range" min="0" max="100" value="${track.volume ?? 100}" style="flex:1;accent-color:var(--accent);"
                                    oninput="ShowRunPage.disguiseSetTrackVolume('${track.id}', this.value)">
                                <span class="mono" style="font-size:10px;width:35px;">${track.volume ?? 100}%</span>
                            </div>
                            <div style="flex:1;display:flex;align-items:center;gap:8px;">
                                <span style="font-size:9px;color:var(--text-muted);width:50px;">BRT</span>
                                <input type="range" min="0" max="100" value="${track.brightness ?? 100}" style="flex:1;accent-color:#facc15;"
                                    oninput="ShowRunPage.disguiseSetTrackBrightness('${track.id}', this.value)">
                                <span class="mono" style="font-size:10px;width:35px;">${track.brightness ?? 100}%</span>
                            </div>
                            <button class="btn btn-xs ${track.muted ? 'btn-danger' : ''}" onclick="ShowRunPage.disguiseToggleMute('${track.id}')" title="${track.muted ? 'Unmute' : 'Mute'}">
                                <i class="fas fa-${track.muted ? 'volume-mute' : 'volume-up'}"></i>
                            </button>
                        </div>
                    `).join('') : '<p class="text-muted" style="padding:20px;text-align:center;">No tracks</p>'}
                </div>
            </div>

            <!-- Master Controls -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Master</h3></div>
                <div class="card-body" style="display:flex;flex-direction:column;gap:20px;align-items:center;">
                    <div style="text-align:center;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Brightness</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${masterBrightness}"
                            style="writing-mode:vertical-lr;direction:rtl;height:120px;accent-color:#facc15;"
                            oninput="ShowRunPage.disguiseSetMasterBrightness(this.value)">
                        <div class="mono" style="font-size:12px;margin-top:4px;">${masterBrightness}%</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Volume</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${masterVolume}"
                            style="writing-mode:vertical-lr;direction:rtl;height:120px;accent-color:var(--accent);"
                            oninput="ShowRunPage.disguiseSetMasterVolume(this.value)">
                        <div class="mono" style="font-size:12px;margin-top:4px;">${masterVolume}%</div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    async disguisePlay() {
        try { await disguiseAPI.play(); UI.toast('PLAY', 'success'); appState.log('EVENT', 'Disguise PLAY', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguisePause() {
        try { await disguiseAPI.pause(); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseStop() {
        try { await disguiseAPI.stop(); UI.toast('STOP', 'warning'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseNextSection() {
        try { await disguiseAPI.goToNextSection(); UI.toast('Next section', 'success'); appState.log('EVENT', 'Disguise next section', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguisePrevSection() {
        try { await disguiseAPI.goToPrevSection(); UI.toast('Previous section', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseSetTrackVolume(trackId, val) {
        try { await disguiseAPI.setTrackVolume(trackId, parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseSetTrackBrightness(trackId, val) {
        try { await disguiseAPI.setTrackBrightness(trackId, parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseToggleMute(trackId) {
        const tracks = appState.get('disguiseState')?.tracks || [];
        const track = tracks.find(t => String(t.id) === String(trackId));
        if (track) {
            try {
                if (track.muted) { await disguiseAPI.unmuteTrack(trackId); }
                else { await disguiseAPI.muteTrack(trackId); }
            } catch (e) { UI.toast(e.message, 'error'); }
            this._refreshDisguise();
        }
    },
    async disguiseSetMasterBrightness(val) {
        try { await disguiseAPI.setMasterBrightness(parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseSetMasterVolume(val) {
        try { await disguiseAPI.setMasterVolume(parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async _refreshDisguise() {
        try { const s = await disguiseAPI.getState(); appState.set('disguiseState', s); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // PIXERA SHOW RUN
    // ================================================================
    _renderPixera() {
        const pState = appState.get('pixeraState') || {};
        const timelines = pState.timelines || [];
        const cues = pState.cues || [];
        const screens = pState.screens || [];
        const masterBrightness = pState.masterBrightness ?? 100;
        const masterVolume = pState.masterVolume ?? 100;

        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group sr-transport-main">
                <div style="display:flex;align-items:center;gap:16px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Master</div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:9px;color:var(--text-muted);">BRT</span>
                        <input type="range" min="0" max="100" value="${masterBrightness}" style="width:100px;accent-color:#facc15;"
                            oninput="ShowRunPage.pixeraSetMasterBrightness(this.value)">
                        <span class="mono" style="font-size:10px;">${masterBrightness}%</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:9px;color:var(--text-muted);">VOL</span>
                        <input type="range" min="0" max="100" value="${masterVolume}" style="width:100px;accent-color:var(--accent);"
                            oninput="ShowRunPage.pixeraSetMasterVolume(this.value)">
                        <span class="mono" style="font-size:10px;">${masterVolume}%</span>
                    </div>
                </div>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <div class="sr-status-pill" id="sr-engine-pill">
                    <span class="sr-status-dot online"></span>
                    <span id="sr-engine-label">Pixera</span>
                </div>
            </div>
        </div>

        <!-- Timeline Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;margin-top:12px;">
            ${timelines.map(tl => {
                const progress = tl.duration ? Math.round((tl.currentTime / tl.duration) * 100) : 0;
                const stateLabel = tl.state === 'playing' ? 'Playing' : (tl.state === 'paused' ? 'Paused' : 'Stopped');
                const stateColor = tl.state === 'playing' ? 'green' : (tl.state === 'paused' ? 'blue' : 'gray');
                return `
                <div class="card">
                    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
                        <h3 style="font-size:13px;"><i class="fas fa-film"></i> ${UI.esc(tl.name || 'Timeline')}</h3>
                        ${UI.badge(stateLabel, stateColor)}
                    </div>
                    <div class="card-body">
                        <div style="display:flex;gap:6px;margin-bottom:10px;">
                            <button class="sr-btn sr-btn-play" onclick="ShowRunPage.pixeraPlayTimeline('${tl.handle}')" style="flex:1;"><i class="fas fa-play"></i> PLAY</button>
                            <button class="sr-btn" onclick="ShowRunPage.pixeraPauseTimeline('${tl.handle}')" style="flex:1;"><i class="fas fa-pause"></i> PAUSE</button>
                            <button class="sr-btn sr-btn-stop" onclick="ShowRunPage.pixeraStopTimeline('${tl.handle}')" style="flex:1;"><i class="fas fa-stop"></i> STOP</button>
                        </div>
                        <div style="margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:2px;">
                                <span class="mono">${UI.esc(tl.currentTimeDisplay || '00:00:00')}</span>
                                <span class="mono">${UI.esc(tl.durationDisplay || '00:00:00')}</span>
                            </div>
                            <div style="background:var(--bg-tertiary);border-radius:4px;height:6px;overflow:hidden;">
                                <div style="background:var(--accent);height:100%;width:${progress}%;border-radius:4px;transition:width 0.3s;"></div>
                            </div>
                        </div>
                        ${(tl.layers || []).length ? `
                            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:8px 0 4px;">Layers</div>
                            ${tl.layers.map(layer => `
                                <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px;">
                                    <span style="min-width:80px;font-weight:600;">${UI.esc(layer.name || 'Layer')}</span>
                                    <span style="font-size:9px;color:var(--text-muted);width:30px;">OPC</span>
                                    <input type="range" min="0" max="100" value="${layer.opacity ?? 100}" style="flex:1;accent-color:#facc15;"
                                        oninput="ShowRunPage.pixeraSetLayerOpacity('${layer.handle}', this.value)">
                                    <span style="font-size:9px;color:var(--text-muted);width:30px;">VOL</span>
                                    <input type="range" min="0" max="100" value="${layer.volume ?? 100}" style="flex:1;accent-color:var(--accent);"
                                        oninput="ShowRunPage.pixeraSetLayerVolume('${layer.handle}', this.value)">
                                </div>
                            `).join('')}
                        ` : ''}
                    </div>
                </div>`;
            }).join('') || '<div class="card"><div class="card-body"><p class="text-muted" style="text-align:center;">No timelines</p></div></div>'}
        </div>

        <!-- Cue Triggers + Screen Overview -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> Cue Triggers</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;">
                        ${cues.length ? cues.map(cue => `
                            <button class="sr-btn" onclick="ShowRunPage.pixeraFireCue('${cue.handle}')" style="padding:14px 8px;font-size:11px;font-weight:700;">
                                <i class="fas fa-bolt" style="margin-right:4px;"></i> ${UI.esc(cue.name || 'Cue')}
                            </button>
                        `).join('') : '<p class="text-muted" style="text-align:center;">No cues</p>'}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-desktop"></i> Screen Overview</h3></div>
                <div class="card-body">
                    ${screens.length ? screens.map(scr => `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
                            <i class="fas fa-display" style="color:var(--text-muted);"></i>
                            <span style="font-weight:600;font-size:12px;">${UI.esc(scr.name || 'Screen')}</span>
                            <span class="mono" style="font-size:10px;color:var(--text-muted);margin-left:auto;">${scr.width || '?'}x${scr.height || '?'}</span>
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No screens</p>'}
                </div>
            </div>
        </div>`;
    },

    async pixeraPlayTimeline(handle) {
        try { await pixeraAPI.playTimeline(handle); UI.toast('Timeline playing', 'success'); appState.log('EVENT', `Pixera play timeline ${handle}`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshPixera(), 200);
    },
    async pixeraPauseTimeline(handle) {
        try { await pixeraAPI.pauseTimeline(handle); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshPixera(), 200);
    },
    async pixeraStopTimeline(handle) {
        try { await pixeraAPI.stopTimeline(handle); UI.toast('Timeline stopped', 'warning'); } catch (e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshPixera(), 200);
    },
    async pixeraSetLayerOpacity(handle, val) {
        try { await pixeraAPI.setLayerOpacity(handle, parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraSetLayerVolume(handle, val) {
        try { await pixeraAPI.setLayerVolume(handle, parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraFireCue(handle) {
        try { await pixeraAPI.fireCue(handle); UI.toast('Cue fired', 'success'); appState.log('EVENT', `Pixera fire cue ${handle}`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraSetMasterBrightness(val) {
        try { await pixeraAPI.setMasterBrightness(parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async pixeraSetMasterVolume(val) {
        try { await pixeraAPI.setMasterVolume(parseInt(val)); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async _refreshPixera() {
        try { const s = await pixeraAPI.getState(); appState.set('pixeraState', s); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    _clockTimer: null,

    async onActivate() {
        const serverType = appState.get('serverType');

        // Start clock + sync timecode from TimecodePage
        this._clockTimer = setInterval(() => {
            const el = document.getElementById('show-clock');
            if (el) el.textContent = new Date().toLocaleTimeString();
            if (serverType === 'hippo') {
                const tcEl = document.getElementById('sr-timecode-value');
                if (tcEl && typeof TimecodePage !== 'undefined' && TimecodePage._formatTC) {
                    tcEl.textContent = TimecodePage._formatTC();
                }
            }
        }, 40);

        if (serverType === 'resolume') {
            try {
                const comp = await resolumeAPI.getComposition();
                appState.set('composition', comp);
                const container = document.getElementById('page-container');
                if (container && appState.get('currentPage') === 'showrun') {
                    container.innerHTML = this.render();
                }
            } catch {}
        } else if (serverType === 'vmix') {
            try { const s = await vmixAPI.getState(); appState.set('vmixState', s); } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else if (serverType === 'casparcg') {
            try { const ch = await casparcgAPI.getChannels(); appState.set('casparcgChannels', ch); } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else if (serverType === 'obs') {
            try {
                const scenes = await obsAPI.getSceneList();
                if (scenes) {
                    appState.set('obsScenes', scenes.scenes);
                    appState.set('obsCurrentScene', scenes.currentProgramSceneName);
                    appState.set('obsPreviewScene', scenes.currentPreviewSceneName);
                }
            } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else if (serverType === 'barco') {
            try { const s = await barcoAPI.getState(); appState.set('barcoState', s); } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else if (serverType === 'qlab') {
            try { const s = await qlabAPI.getState(); appState.set('qlabState', s); } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else if (serverType === 'disguise') {
            try { const s = await disguiseAPI.getState(); appState.set('disguiseState', s); } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else if (serverType === 'pixera') {
            try { const s = await pixeraAPI.getState(); appState.set('pixeraState', s); } catch {}
            const c = document.getElementById('page-container');
            if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
        } else {
            // Hippo: fetch presets if not loaded
            if (!appState.get('mixPresets') || !appState.get('layerPresets')) {
                try {
                    const [mix, layer] = await Promise.all([
                        hippoAPI.getPresets('mix'),
                        hippoAPI.getPresets('layer'),
                    ]);
                    appState.set('mixPresets', mix);
                    appState.set('layerPresets', layer);
                    const grid = document.getElementById('show-preset-grid');
                    if (grid) grid.innerHTML = this._renderPresetGrid();
                } catch {}
            }

            // Fetch mix/layer levels
            const info = appState.get('serverInfo');
            if (info?.mixes) {
                for (const m of info.mixes) {
                    try {
                        const lv = await hippoAPI.getMixLevel(m.index);
                        appState.set('mixLevels', { ...appState.get('mixLevels'), [m.index]: typeof lv === 'number' ? lv : parseInt(lv) || 0 });
                    } catch {}
                }
            }

            // Set default cue timeline
            const tls = appState.get('timelines') || [];
            if (tls.length > 0 && !tls.find(t => t.iD === this._cueListTimeline)) {
                this._cueListTimeline = tls[0].iD;
            }

            // Update GO label
            this._updateCueListVisuals();
        }
    },

    onDeactivate() {
        clearInterval(this._clockTimer);
    },
};
