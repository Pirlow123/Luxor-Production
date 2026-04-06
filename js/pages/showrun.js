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
    _activeSubPage: null,       // sidebar sub-page routing (e.g. 'vmix-switching', 'atem-audio')

    // Helper: check if a section should be visible based on sidebar sub-page selection
    // If no sub-page is set (Show Run clicked directly), show ALL sections
    _showSection(subPage) {
        return !this._activeSubPage || this._activeSubPage === subPage;
    },

    render() {
        const servers = appState.get('servers') || [];
        const activeId = appState.get('activeServerId');
        const connected = appState.get('connected');

        // Engine selector bar — always visible
        const engineBar = this._renderEngineBar(servers, activeId, connected);

        // Single engine view
        if (!connected) {
            return engineBar + `<div class="sr-empty">
                <i class="fas fa-theater-masks"></i>
                <h2>No Engine Selected</h2>
                <p>Select an engine above to enter Show Mode</p>
                ${servers.length === 0 ? `<button class="btn btn-primary btn-lg" onclick="HippoApp.showAddServer()"><i class="fas fa-plus"></i> Add Server</button>` : ''}
            </div>`;
        }

        const serverType = appState.get('serverType');
        switch (serverType) {
            case 'resolume': return engineBar + this._renderResolume();
            case 'vmix': return engineBar + this._renderVmix();
            case 'casparcg': return engineBar + this._renderCasparcg();
            case 'obs': return engineBar + this._renderObs();
            case 'barco': return engineBar + this._renderBarco();
            case 'qlab': return engineBar + this._renderQlab();
            case 'disguise': return engineBar + this._renderDisguise();
            case 'pixera': return engineBar + this._renderPixera();
            case 'atem': return engineBar + this._renderAtem();
            default: return engineBar + this._renderHippo();
        }
    },

    _renderEngineBar(servers, activeId, connected) {
        const types = HippoApp._serverTypes || {};
        const statuses = appState.get('serverStatuses') || {};

        return `
        <div class="sr-engine-bar">
            <div class="sr-engine-tabs">
                ${servers.map(s => {
                    const t = types[s.type] || { label: s.type, icon: 'fa-server', color: 'var(--accent)' };
                    const isActive = s.id === activeId && connected;
                    const wasOnline = statuses[s.id]?.online;
                    return `<button class="sr-engine-tab ${isActive ? 'active' : ''}" onclick="ShowRunPage.switchEngine('${s.id}')" title="${t.label}${s.virtual ? ' (Demo)' : ''}">
                        <span class="sr-engine-dot" style="background:${isActive ? '#4ade80' : wasOnline ? '#f59e0b' : '#6b7280'}"></span>
                        <span class="sr-engine-name">${UI.esc(s.name)}</span>
                        <span class="sr-engine-type" style="color:${t.color}">${(s.type || 'hippo').toUpperCase()}</span>
                    </button>`;
                }).join('')}
                ${servers.length === 0 ? `<span style="color:var(--text-muted);font-size:12px;padding:0 8px;">No engines configured</span>` : ''}
            </div>
            <div class="sr-engine-actions">
                <button class="btn btn-xs" onclick="HippoApp.showAddServer()" title="Add Engine"><i class="fas fa-plus"></i></button>
            </div>
        </div>`;
    },

    switchEngine(serverId) {
        const currentId = appState.get('activeServerId');
        if (serverId === currentId && appState.get('connected')) return; // Already active
        // Set flag so we navigate back to showrun after connection
        this._returnToShowRun = true;
        HippoApp.switchServer(serverId);
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

        ${this._showSection('vmix-switching') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
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
        </div>` : ''}

        ${this._showSection('vmix-audio') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-volume-up"></i> Audio Mixer</h3></div>
            <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;">
                ${inputs.map(inp => `
                    <div style="text-align:center;min-width:60px;">
                        <div style="font-size:10px;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;">${UI.esc(inp.title)}</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${inp.volume ?? 100}"
                            style="writing-mode:vertical-lr;direction:rtl;height:100px;accent-color:var(--accent);"
                            oninput="ShowRunPage.vmixSetVolume(${inp.number}, this.value)">
                        <div style="font-size:9px;margin-top:2px;" class="mono">${inp.volume ?? 100}%</div>
                        <button class="btn btn-xs ${inp.muted ? 'btn-danger' : ''}" onclick="ShowRunPage.vmixToggleMute(${inp.number})" style="margin-top:2px;">
                            <i class="fas fa-${inp.muted ? 'volume-mute' : 'volume-up'}"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        ${this._showSection('vmix-overlays') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-layer-group"></i> Overlays</h3></div>
            <div class="card-body">
                ${[1,2,3,4].map(n => `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
                        <span style="font-weight:700;font-size:12px;min-width:80px;">Overlay ${n}</span>
                        <select class="sr-select" onchange="ShowRunPage.vmixSetOverlay(${n}, this.value)" style="flex:1;">
                            <option value="">-- Off --</option>
                            ${inputs.map(inp => `<option value="${inp.number}" ${vs?.overlays?.[n-1] === inp.number ? 'selected' : ''}>${UI.esc(inp.title)}</option>`).join('')}
                        </select>
                        <button class="btn btn-xs btn-danger" onclick="ShowRunPage.vmixOverlayOff(${n})" title="Turn Off"><i class="fas fa-times"></i></button>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        ${this._showSection('vmix-replay') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-redo"></i> Replay</h3></div>
            <div class="card-body">
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayPlay()" style="flex:1;"><i class="fas fa-play"></i> Play</button>
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayPause()" style="flex:1;"><i class="fas fa-pause"></i> Pause</button>
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayJumpToNow()" style="flex:1;"><i class="fas fa-clock"></i> Live</button>
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayMark()" style="flex:1;"><i class="fas fa-bookmark"></i> Mark</button>
                </div>
                <div style="display:flex;gap:6px;margin-top:8px;">
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayFF(2)"><i class="fas fa-forward"></i> 2x</button>
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayFF(4)"><i class="fas fa-forward"></i> 4x</button>
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayBW(2)"><i class="fas fa-backward"></i> 2x</button>
                    <button class="sr-btn" onclick="ShowRunPage.vmixReplayBW(4)"><i class="fas fa-backward"></i> 4x</button>
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('vmix-ptz') ? `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-video"></i> PTZ Camera Control</h3>
                <select class="sr-select" id="vmix-ptz-input" style="min-width:140px;">
                    ${inputs.map(inp => `<option value="${inp.number}">${UI.esc(inp.title)}</option>`).join('')}
                </select>
            </div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:180px 1fr;gap:20px;">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
                        <div></div>
                        <button class="sr-btn" onclick="ShowRunPage.vmixPTZ('Up')"><i class="fas fa-chevron-up"></i></button>
                        <div></div>
                        <button class="sr-btn" onclick="ShowRunPage.vmixPTZ('Left')"><i class="fas fa-chevron-left"></i></button>
                        <button class="sr-btn" onclick="ShowRunPage.vmixPTZ('Home')" style="font-size:10px;"><i class="fas fa-home"></i></button>
                        <button class="sr-btn" onclick="ShowRunPage.vmixPTZ('Right')"><i class="fas fa-chevron-right"></i></button>
                        <div></div>
                        <button class="sr-btn" onclick="ShowRunPage.vmixPTZ('Down')"><i class="fas fa-chevron-down"></i></button>
                        <div></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:10px;font-weight:700;min-width:50px;">ZOOM</span>
                            <button class="sr-btn" onclick="ShowRunPage.vmixPTZZoom('In')" style="flex:1;"><i class="fas fa-search-plus"></i> In</button>
                            <button class="sr-btn" onclick="ShowRunPage.vmixPTZZoom('Out')" style="flex:1;"><i class="fas fa-search-minus"></i> Out</button>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:10px;font-weight:700;min-width:50px;">FOCUS</span>
                            <button class="sr-btn" onclick="ShowRunPage.vmixPTZFocus('Near')" style="flex:1;">Near</button>
                            <button class="sr-btn" onclick="ShowRunPage.vmixPTZFocus('Far')" style="flex:1;">Far</button>
                            <button class="sr-btn" onclick="ShowRunPage.vmixPTZFocus('Auto')" style="flex:1;">Auto</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>` : ''}`;
    },

    // View setter methods removed — sidebar sub-page navigation replaces in-page dropdowns

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
    async vmixSetOverlay(n, input) { try { await vmixAPI.setOverlay(n, input); } catch(e) { UI.toast(e.message,'error'); } this._refreshVmix(); },
    async vmixOverlayOff(n) { try { await vmixAPI.overlayOff(n); } catch(e) { UI.toast(e.message,'error'); } this._refreshVmix(); },
    async vmixReplayPlay() { try { await vmixAPI.replayPlay(); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixReplayPause() { try { await vmixAPI.replayPause(); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixReplayJumpToNow() { try { await vmixAPI.replayJumpToNow(); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixReplayMark() { try { await vmixAPI.replayMark(); UI.toast('Replay marked','success'); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixReplayFF(speed) { try { await vmixAPI.replayFastForward(speed); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixReplayBW(speed) { try { await vmixAPI.replayFastBackward(speed); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixPTZ(dir) { const inp = document.getElementById('vmix-ptz-input')?.value; try { await vmixAPI.ptzMove(inp, dir); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixPTZZoom(dir) { const inp = document.getElementById('vmix-ptz-input')?.value; try { await vmixAPI.ptzZoom(inp, dir); } catch(e) { UI.toast(e.message,'error'); } },
    async vmixPTZFocus(mode) { const inp = document.getElementById('vmix-ptz-input')?.value; try { await vmixAPI.ptzFocus(inp, mode); } catch(e) { UI.toast(e.message,'error'); } },
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
        const templates = appState.get('casparcgTemplates') || [];
        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group">
                <button class="sr-btn sr-btn-stop" onclick="ShowRunPage.casparcgClearAll()"><i class="fas fa-ban"></i> CLEAR ALL</button>
            </div>
        </div>

        ${this._showSection('casparcg-channels') ? channels.map((ch, ci) => `
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-tv"></i> Channel ${ch.id || ci+1} <span class="mono text-muted" style="font-size:10px">${ch.format || '1080i5000'}</span></h3>
                    <button class="btn btn-xs btn-danger" onclick="ShowRunPage.casparcgClearChannel(${ch.id || ci+1})"><i class="fas fa-ban"></i> Clear</button>
                </div>
                <div class="card-body">
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
                        ${media.slice(0, 20).map(m => {
                            const name = typeof m === 'string' ? m : m.name || m.clip;
                            return `<button class="btn btn-xs" onclick="ShowRunPage.casparcgPlay(${ch.id || ci+1}, 10, '${name}')" style="font-size:10px;font-weight:600;">
                                <i class="fas fa-play"></i> ${UI.esc(name)}
                            </button>`;
                        }).join('')}
                    </div>
                    <table style="font-size:11px;">
                        <thead><tr><th>Layer</th><th>Clip</th><th>State</th><th>Opacity</th><th>Volume</th><th>Actions</th></tr></thead>
                        <tbody>
                        ${(ch.layers || []).filter(l => l.clip).map(l => `<tr>
                            <td class="mono">${l.id || l.layer}</td>
                            <td><strong>${UI.esc(l.clip)}</strong></td>
                            <td>${l.playing ? UI.badge('Playing', 'green') : UI.badge('Stopped', 'orange')}</td>
                            <td><input type="range" min="0" max="100" value="${Math.round((l.opacity??1)*100)}" style="width:60px;accent-color:var(--accent);"
                                oninput="ShowRunPage.casparcgSetOpacity(${ch.id||ci+1},${l.id||l.layer},this.value/100)"></td>
                            <td><input type="range" min="0" max="100" value="${Math.round((l.volume??1)*100)}" style="width:60px;accent-color:#a855f7;"
                                oninput="ShowRunPage.casparcgSetVolume(${ch.id||ci+1},${l.id||l.layer},this.value/100)"></td>
                            <td>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgPause(${ch.id||ci+1},${l.id||l.layer})" title="Pause"><i class="fas fa-pause"></i></button>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgResume(${ch.id||ci+1},${l.id||l.layer})" title="Resume"><i class="fas fa-play"></i></button>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgStop(${ch.id||ci+1},${l.id||l.layer})"><i class="fas fa-stop"></i></button>
                                <button class="btn btn-xs btn-danger" onclick="ShowRunPage.casparcgClear(${ch.id||ci+1},${l.id||l.layer})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`).join('') || '<tr><td colspan="6" class="text-muted">No active layers</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('') : ''}

        ${this._showSection('casparcg-media') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-photo-video"></i> Media Library</h3></div>
            <div class="card-body">
                <p style="font-size:10px;color:var(--text-muted);margin-bottom:10px;">Click a clip to play it on Channel 1, Layer 10. Right-click for options.</p>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
                    ${media.length ? media.map(m => {
                        const name = typeof m === 'string' ? m : m.name || m.clip;
                        const type = (typeof m === 'object' && m.type) || 'video';
                        const icon = type === 'audio' ? 'fa-music' : (type === 'still' ? 'fa-image' : 'fa-film');
                        return `<button class="sr-btn" onclick="ShowRunPage.casparcgPlay(1, 10, '${UI.esc(name)}')" style="padding:12px 8px;font-size:11px;font-weight:600;text-align:center;">
                            <i class="fas ${icon}" style="display:block;font-size:16px;margin-bottom:4px;opacity:0.5;"></i>
                            ${UI.esc(name)}
                        </button>`;
                    }).join('') : '<p class="text-muted" style="text-align:center;">No media files. Connect to scan library.</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('casparcg-templates') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-layer-group"></i> CG Templates</h3></div>
            <div class="card-body">
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
                    <select class="sr-select" id="ccg-tpl-channel" style="width:100px;">
                        ${channels.map((ch, ci) => `<option value="${ch.id||ci+1}">Ch ${ch.id||ci+1}</option>`).join('')}
                    </select>
                    <input type="number" id="ccg-tpl-layer" value="20" min="1" max="999" style="width:60px;padding:6px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-size:11px;" placeholder="Layer">
                    <span style="font-size:10px;color:var(--text-muted);">Target channel & layer for CG operations</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
                    ${templates.length ? templates.map(t => {
                        const name = typeof t === 'string' ? t : t.name || t;
                        return `<div style="border:1px solid var(--border-color);border-radius:var(--radius);padding:10px;background:var(--bg-secondary);">
                            <div style="font-weight:700;font-size:11px;margin-bottom:8px;word-break:break-all;">${UI.esc(name)}</div>
                            <div style="display:flex;gap:4px;">
                                <button class="btn btn-xs btn-accent" onclick="ShowRunPage.casparcgCgAdd('${UI.esc(name)}')" title="Add"><i class="fas fa-plus"></i> Add</button>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgCgPlay('${UI.esc(name)}')" title="Play"><i class="fas fa-play"></i></button>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgCgNext('${UI.esc(name)}')" title="Next"><i class="fas fa-forward"></i></button>
                                <button class="btn btn-xs btn-danger" onclick="ShowRunPage.casparcgCgStop('${UI.esc(name)}')" title="Stop"><i class="fas fa-stop"></i></button>
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgCgRemove('${UI.esc(name)}')" title="Remove"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>`;
                    }).join('') : '<p class="text-muted" style="text-align:center;grid-column:1/-1;">No templates found. Connect to scan templates.</p>'}
                </div>
            </div>
        </div>
        <div class="card mt-md">
            <div class="card-header"><h3><i class="fas fa-terminal"></i> AMCP Command</h3></div>
            <div class="card-body">
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" id="ccg-amcp-cmd" placeholder="e.g. PLAY 1-10 AMB LOOP" style="flex:1;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:12px;">
                    <button class="sr-btn sr-btn-play" onclick="ShowRunPage.casparcgExecAMCP()" style="min-width:80px;"><i class="fas fa-terminal"></i> SEND</button>
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('casparcg-mixer') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Channel Mixer</h3></div>
                <div class="card-body">
                    <p style="font-size:10px;color:var(--text-muted);margin-bottom:10px;">Adjust mixer properties per channel/layer.</p>
                    ${channels.map((ch, ci) => `
                        <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color);">
                            <div style="font-weight:700;font-size:12px;margin-bottom:8px;">Channel ${ch.id || ci+1}</div>
                            <div style="display:grid;grid-template-columns:60px 1fr 60px 1fr;gap:6px;align-items:center;">
                                <span style="font-size:9px;color:var(--text-muted);">Bright</span>
                                <input type="range" min="0" max="100" value="100" style="accent-color:#facc15;" oninput="ShowRunPage.casparcgSetBrightness(${ch.id||ci+1},1,this.value/100)">
                                <span style="font-size:9px;color:var(--text-muted);">Contrast</span>
                                <input type="range" min="0" max="200" value="100" style="accent-color:#3b82f6;" oninput="ShowRunPage.casparcgSetContrast(${ch.id||ci+1},1,this.value/100)">
                                <span style="font-size:9px;color:var(--text-muted);">Satur.</span>
                                <input type="range" min="0" max="200" value="100" style="accent-color:#a855f7;" oninput="ShowRunPage.casparcgSetSaturation(${ch.id||ci+1},1,this.value/100)">
                                <span style="font-size:9px;color:var(--text-muted);">Volume</span>
                                <input type="range" min="0" max="100" value="100" style="accent-color:#22c55e;" oninput="ShowRunPage.casparcgSetMasterVolume(${ch.id||ci+1},this.value/100)">
                            </div>
                            <div style="display:flex;gap:6px;margin-top:8px;">
                                <button class="btn btn-xs" onclick="ShowRunPage.casparcgClearMixer(${ch.id||ci+1},1)"><i class="fas fa-undo"></i> Reset Mixer</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-expand-arrows-alt"></i> Transform</h3></div>
                <div class="card-body">
                    <p style="font-size:10px;color:var(--text-muted);margin-bottom:10px;">Set fill position & scale for a layer.</p>
                    <div style="display:grid;grid-template-columns:80px 1fr;gap:6px;align-items:center;">
                        <span style="font-size:10px;font-weight:600;">Channel</span>
                        <select class="sr-select" id="ccg-mix-ch" style="width:80px;">
                            ${channels.map((ch, ci) => `<option value="${ch.id||ci+1}">${ch.id||ci+1}</option>`).join('')}
                        </select>
                        <span style="font-size:10px;font-weight:600;">Layer</span>
                        <input type="number" id="ccg-mix-layer" value="10" min="1" max="999" class="form-control" style="width:80px;">
                    </div>
                    <div style="display:grid;grid-template-columns:50px 1fr 50px;gap:6px;align-items:center;margin-top:12px;">
                        <span style="font-size:9px;color:var(--text-muted);">X</span>
                        <input type="range" min="0" max="100" value="0" id="ccg-fill-x" style="accent-color:var(--accent);">
                        <span class="mono" style="font-size:10px;">0%</span>
                        <span style="font-size:9px;color:var(--text-muted);">Y</span>
                        <input type="range" min="0" max="100" value="0" id="ccg-fill-y" style="accent-color:var(--accent);">
                        <span class="mono" style="font-size:10px;">0%</span>
                        <span style="font-size:9px;color:var(--text-muted);">W</span>
                        <input type="range" min="0" max="100" value="100" id="ccg-fill-w" style="accent-color:#facc15;">
                        <span class="mono" style="font-size:10px;">100%</span>
                        <span style="font-size:9px;color:var(--text-muted);">H</span>
                        <input type="range" min="0" max="100" value="100" id="ccg-fill-h" style="accent-color:#facc15;">
                        <span class="mono" style="font-size:10px;">100%</span>
                    </div>
                    <button class="btn btn-sm btn-primary mt-md" onclick="ShowRunPage.casparcgApplyFill()"><i class="fas fa-check"></i> Apply Fill</button>
                </div>
            </div>
        </div>` : ''}`;
    },

    async casparcgPlay(ch, layer, clip) { try { await casparcgAPI.playMedia(ch, layer, clip); } catch(e) { UI.toast(e.message,'error'); } this._refreshCasparcg(); },
    async casparcgStop(ch, layer) { try { await casparcgAPI.stopLayer(ch, layer); } catch(e) { UI.toast(e.message,'error'); } this._refreshCasparcg(); },
    async casparcgPause(ch, layer) { try { await casparcgAPI.pauseLayer(ch, layer); } catch(e) { UI.toast(e.message,'error'); } this._refreshCasparcg(); },
    async casparcgResume(ch, layer) { try { await casparcgAPI.resumeLayer(ch, layer); } catch(e) { UI.toast(e.message,'error'); } this._refreshCasparcg(); },
    async casparcgClear(ch, layer) { try { await casparcgAPI.clearLayer(ch, layer); } catch(e) { UI.toast(e.message,'error'); } this._refreshCasparcg(); },
    async casparcgClearChannel(ch) { try { await casparcgAPI.clearChannel(ch); } catch(e) { UI.toast(e.message,'error'); } this._refreshCasparcg(); },
    async casparcgClearAll() {
        const channels = appState.get('casparcgChannels') || [];
        for (const ch of channels) await casparcgAPI.clearChannel(ch.id || 1).catch(() => {});
        this._refreshCasparcg();
    },
    async casparcgSetOpacity(ch, layer, val) { try { await casparcgAPI.setOpacity(ch, layer, val); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgSetVolume(ch, layer, val) { try { await casparcgAPI.setVolume(ch, layer, val); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgSetBrightness(ch, layer, val) { try { await casparcgAPI.setMixerBrightness(ch, layer, val); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgSetContrast(ch, layer, val) { try { await casparcgAPI.setMixerContrast(ch, layer, val); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgSetSaturation(ch, layer, val) { try { await casparcgAPI.setMixerSaturation(ch, layer, val); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgSetMasterVolume(ch, val) { try { await casparcgAPI.setMixerMasterVolume(ch, val); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgClearMixer(ch, layer) { try { await casparcgAPI.clearMixer(ch, layer); UI.toast('Mixer reset', 'success'); } catch(e) { UI.toast(e.message,'error'); } },
    async casparcgApplyFill() {
        const ch = parseInt(document.getElementById('ccg-mix-ch')?.value) || 1;
        const layer = parseInt(document.getElementById('ccg-mix-layer')?.value) || 10;
        const x = (parseInt(document.getElementById('ccg-fill-x')?.value) || 0) / 100;
        const y = (parseInt(document.getElementById('ccg-fill-y')?.value) || 0) / 100;
        const w = (parseInt(document.getElementById('ccg-fill-w')?.value) || 100) / 100;
        const h = (parseInt(document.getElementById('ccg-fill-h')?.value) || 100) / 100;
        try { await casparcgAPI.setMixerFill(ch, layer, x, y, w, h); UI.toast('Fill applied', 'success'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async casparcgCgAdd(tpl) {
        const ch = parseInt(document.getElementById('ccg-tpl-channel')?.value) || 1;
        const layer = parseInt(document.getElementById('ccg-tpl-layer')?.value) || 20;
        try { await casparcgAPI.cgAdd(ch, layer, tpl, true); UI.toast(`Template added: ${tpl}`, 'success'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async casparcgCgPlay(tpl) {
        const ch = parseInt(document.getElementById('ccg-tpl-channel')?.value) || 1;
        const layer = parseInt(document.getElementById('ccg-tpl-layer')?.value) || 20;
        try { await casparcgAPI.cgPlay(ch, layer); UI.toast('CG Play', 'success'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async casparcgCgNext(tpl) {
        const ch = parseInt(document.getElementById('ccg-tpl-channel')?.value) || 1;
        const layer = parseInt(document.getElementById('ccg-tpl-layer')?.value) || 20;
        try { await casparcgAPI.cgNext(ch, layer); } catch(e) { UI.toast(e.message,'error'); }
    },
    async casparcgCgStop(tpl) {
        const ch = parseInt(document.getElementById('ccg-tpl-channel')?.value) || 1;
        const layer = parseInt(document.getElementById('ccg-tpl-layer')?.value) || 20;
        try { await casparcgAPI.cgStop(ch, layer); UI.toast('CG Stopped', 'warning'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async casparcgCgRemove(tpl) {
        const ch = parseInt(document.getElementById('ccg-tpl-channel')?.value) || 1;
        const layer = parseInt(document.getElementById('ccg-tpl-layer')?.value) || 20;
        try { await casparcgAPI.cgRemove(ch, layer); UI.toast('CG Removed', 'warning'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async casparcgExecAMCP() {
        const input = document.getElementById('ccg-amcp-cmd');
        if (!input || !input.value.trim()) return;
        try { const r = await casparcgAPI.executeAMCP(input.value.trim()); UI.toast('AMCP: ' + (typeof r === 'string' ? r.substring(0,60) : 'OK'), 'success'); appState.log('EVENT', 'CasparCG AMCP: ' + input.value, 'Show'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async _refreshCasparcg() {
        try { const ch = await casparcgAPI.getChannels(); appState.set('casparcgChannels', ch); } catch {}
        try { const m = await casparcgAPI.getMedia(); appState.set('casparcgMedia', m); } catch {}
        try { const t = await casparcgAPI.getTemplates(); appState.set('casparcgTemplates', t); } catch {}
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
                <button class="sr-btn ${streamStatus?.virtualCam ? 'sr-btn-play' : ''}" onclick="ShowRunPage.obsToggleVirtualCam()" style="min-width:80px;"><i class="fas fa-camera"></i> VCAM</button>
                <button class="sr-btn" onclick="ShowRunPage.obsToggleStudioMode()" style="min-width:80px;"><i class="fas fa-columns"></i> STUDIO</button>
                <button class="sr-btn" onclick="ShowRunPage.obsSaveReplay()" title="Save Replay Buffer"><i class="fas fa-redo"></i> REPLAY</button>
            </div>
        </div>

        ${this._showSection('obs-scenes') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
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
        </div>` : ''}

        ${this._showSection('obs-audio') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-volume-up"></i> Audio Sources</h3></div>
            <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;">
                ${inputs.filter(i => i.inputKind?.includes('audio') || i.inputKind?.includes('wasapi') || i.inputKind?.includes('pulse')).map(inp => `
                    <div style="text-align:center;min-width:60px;">
                        <div style="font-size:10px;font-weight:700;margin-bottom:4px;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.esc(inp.inputName)}</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${Math.round((inp.volumeMul ?? 1) * 100)}"
                            style="writing-mode:vertical-lr;direction:rtl;height:100px;accent-color:var(--accent);"
                            oninput="ShowRunPage.obsSetVolume('${UI.esc(inp.inputName)}', this.value/100)">
                        <button class="btn btn-xs ${inp.muted ? 'btn-danger' : ''}" onclick="ShowRunPage.obsToggleMute('${UI.esc(inp.inputName)}')" style="margin-top:4px;">
                            <i class="fas fa-${inp.muted ? 'volume-mute' : 'volume-up'}"></i>
                        </button>
                    </div>
                `).join('') || '<p class="text-muted">No audio sources</p>'}
            </div>
        </div>` : ''}

        ${this._showSection('obs-media') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-photo-video"></i> Media Inputs</h3></div>
            <div class="card-body">
                ${inputs.filter(i => i.inputKind?.includes('media') || i.inputKind?.includes('vlc') || i.inputKind?.includes('ffmpeg')).map(inp => `
                    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                        <span style="font-weight:700;font-size:12px;min-width:140px;">${UI.esc(inp.inputName)}</span>
                        <button class="sr-btn" onclick="ShowRunPage.obsMediaAction('${UI.esc(inp.inputName)}','OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY')"><i class="fas fa-play"></i></button>
                        <button class="sr-btn" onclick="ShowRunPage.obsMediaAction('${UI.esc(inp.inputName)}','OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE')"><i class="fas fa-pause"></i></button>
                        <button class="sr-btn" onclick="ShowRunPage.obsMediaAction('${UI.esc(inp.inputName)}','OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP')"><i class="fas fa-stop"></i></button>
                        <button class="sr-btn" onclick="ShowRunPage.obsMediaAction('${UI.esc(inp.inputName)}','OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART')"><i class="fas fa-undo"></i></button>
                        <span class="mono" style="font-size:10px;color:var(--text-muted);">${UI.esc(inp.inputKind || '')}</span>
                    </div>
                `).join('') || '<p class="text-muted" style="text-align:center;">No media inputs detected</p>'}
            </div>
        </div>` : ''}`;
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
    async obsToggleVirtualCam() { const s = appState.get('obsStreamStatus'); try { s?.virtualCam ? await obsAPI.stopVirtualCam() : await obsAPI.startVirtualCam(); } catch(e) { UI.toast(e.message,'error'); } this._refreshObs(); },
    async obsToggleStudioMode() { try { const enabled = await obsAPI.getStudioModeEnabled(); await obsAPI.setStudioModeEnabled(!enabled?.studioModeEnabled); } catch(e) { UI.toast(e.message,'error'); } this._refreshObs(); },
    async obsSaveReplay() { try { await obsAPI.saveReplayBuffer(); UI.toast('Replay saved', 'success'); } catch(e) { UI.toast(e.message,'error'); } },
    async obsMediaAction(inputName, action) { try { await obsAPI.triggerMediaInputAction(inputName, action); } catch(e) { UI.toast(e.message,'error'); } },
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
        const auxDests = barcoState.auxDestinations || [];
        const layers = barcoState.layers || [];
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

        ${this._showSection('barco-switching') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header" style="background:rgba(34,197,94,0.1);"><h3 style="color:#4ade80;"><i class="fas fa-tv"></i> PROGRAM</h3></div>
                <div class="card-body">
                    ${destinations.map(dest => `
                        <div class="sr-tl" style="margin-bottom:8px;">
                            <div class="sr-tl-info"><span class="sr-tl-name">${UI.esc(dest.name || 'Destination ' + dest.id)}</span></div>
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
                        <div class="sr-tl" style="margin-bottom:8px;"><div class="sr-tl-info"><span class="sr-tl-name">${UI.esc(dest.name || 'Destination ' + dest.id)}</span></div></div>
                    `).join('') || '<p class="text-muted">No destinations</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('barco-presets') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-th"></i> Presets</h3><span style="font-size:10px;color:var(--text-muted);">Click = Activate | Double-click = Preview</span></div>
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
                    `).join('') || '<p class="text-muted" style="text-align:center;">No presets available</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('barco-aux') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-external-link-alt"></i> AUX Destinations</h3></div>
                <div class="card-body">
                    ${auxDests.length ? auxDests.map(aux => `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
                            <span style="font-weight:700;font-size:12px;min-width:100px;">${UI.esc(aux.name || 'AUX ' + aux.id)}</span>
                            <select class="sr-select" onchange="ShowRunPage.barcoChangeAux(${aux.id}, this.value)" style="flex:1;">
                                <option value="">-- Select Source --</option>
                                ${sources.map(s => `<option value="${s.id}" ${s.id === aux.sourceId ? 'selected' : ''}>${UI.esc(s.name || 'Source ' + s.id)}</option>`).join('')}
                            </select>
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No AUX destinations</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-th-large"></i> Test Patterns</h3></div>
                <div class="card-body">
                    ${destinations.map(dest => `
                        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                            <span style="font-size:11px;font-weight:600;min-width:100px;">${UI.esc(dest.name || 'Dest ' + dest.id)}</span>
                            <select class="sr-select" onchange="ShowRunPage.barcoSetTestPattern(${dest.id}, this.value)" style="flex:1;">
                                <option value="">Off</option>
                                ${['grid','colorbars','crosshatch','ramp','white','red','green','blue'].map(p => `<option value="${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
                            </select>
                            <button class="btn btn-xs" onclick="ShowRunPage.barcoClearTestPattern(${dest.id})" title="Clear"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('') || '<p class="text-muted" style="text-align:center;">No destinations</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('barco-layers') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-layer-group"></i> Layers</h3></div>
                <div class="card-body">
                    ${destinations.map(dest => `
                        <div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color);">
                            <div style="font-weight:700;font-size:12px;margin-bottom:6px;">${UI.esc(dest.name || 'Dest ' + dest.id)}</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                ${(dest.layers || []).map(l => `
                                    <div style="border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:6px 8px;font-size:10px;min-width:80px;">
                                        <div style="font-weight:600;">${UI.esc(l.name || 'Layer ' + l.id)}</div>
                                        <div style="color:var(--text-muted);">Src: ${UI.esc(l.source || '—')}</div>
                                        <div style="display:flex;gap:4px;margin-top:4px;">
                                            <button class="btn btn-xs" onclick="ShowRunPage.barcoSetLayerSource(${dest.id},${l.id})" title="Change Source"><i class="fas fa-exchange-alt"></i></button>
                                        </div>
                                    </div>
                                `).join('') || '<span class="text-muted" style="font-size:10px;">No layers</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-expand-arrows-alt"></i> SuperScreens</h3></div>
                <div class="card-body">
                    ${(barcoState.superScreens || []).length ? (barcoState.superScreens || []).map(ss => `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                            <span style="font-weight:700;font-size:12px;">${UI.esc(ss.name || 'SuperScreen ' + ss.id)}</span>
                            <span class="mono" style="font-size:10px;color:var(--text-muted);margin-left:auto;">${ss.width || '?'}x${ss.height || '?'}</span>
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No SuperScreens configured</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('barco-config') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> System</h3></div>
                <div class="card-body">
                    <table style="font-size:11px;">
                        <tr><td class="text-muted">Firmware</td><td class="mono">${UI.esc(barcoState.firmware || '—')}</td></tr>
                        <tr><td class="text-muted">Power</td><td>${barcoState.powerOk ? UI.badge('OK', 'green') : UI.badge('Issue', 'red')}</td></tr>
                    </table>
                    <div style="display:flex;gap:6px;margin-top:12px;">
                        <button class="btn btn-xs btn-danger" onclick="ShowRunPage.barcoReboot()" title="Reboot E2"><i class="fas fa-power-off"></i> Reboot</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sign-in-alt"></i> Inputs</h3></div>
                <div class="card-body">
                    ${sources.map(s => `
                        <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-color);font-size:11px;">
                            <span style="font-weight:600;">${UI.esc(s.name || 'Source ' + s.id)}</span>
                            <span class="mono" style="font-size:9px;color:var(--text-muted);margin-left:auto;">${UI.esc(s.format || '')}</span>
                        </div>
                    `).join('') || '<p class="text-muted">No sources</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sign-out-alt"></i> Outputs</h3></div>
                <div class="card-body">
                    ${destinations.map(d => `
                        <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border-color);font-size:11px;">
                            <span style="font-weight:600;">${UI.esc(d.name || 'Dest ' + d.id)}</span>
                            <span class="mono" style="font-size:9px;color:var(--text-muted);margin-left:auto;">${UI.esc(d.resolution || '')}</span>
                        </div>
                    `).join('') || '<p class="text-muted">No outputs</p>'}
                </div>
            </div>
        </div>` : ''}`;
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
    async barcoChangeAux(auxId, sourceId) {
        try { await barcoAPI.changeAuxContent(auxId, sourceId); UI.toast('AUX source changed', 'success'); } catch(e) { UI.toast(e.message,'error'); }
        this._refreshBarco();
    },
    async barcoSetTestPattern(destId, pattern) {
        try { if (pattern) { await barcoAPI.setTestPattern(destId, pattern); UI.toast(`Test pattern: ${pattern}`, 'success'); } else { await barcoAPI.clearTestPattern(destId); } } catch(e) { UI.toast(e.message,'error'); }
    },
    async barcoClearTestPattern(destId) {
        try { await barcoAPI.clearTestPattern(destId); UI.toast('Test pattern cleared', 'success'); } catch(e) { UI.toast(e.message,'error'); }
    },
    async barcoSetLayerSource(destId, layerId) {
        const src = prompt('Enter source ID:');
        if (src) { try { await barcoAPI.setLayerSource(destId, layerId, src); UI.toast('Layer source updated', 'success'); } catch(e) { UI.toast(e.message,'error'); } this._refreshBarco(); }
    },
    async barcoReboot() {
        if (!confirm('Reboot the Barco E2/S3? This will interrupt all outputs.')) return;
        try { await barcoAPI.reboot(); UI.toast('Reboot initiated', 'warning'); appState.log('EVENT', 'Barco reboot', 'Show'); } catch(e) { UI.toast(e.message,'error'); }
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
        const runningCues = qlabState.runningCues || [];
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
                <button class="sr-btn" onclick="ShowRunPage.qlabReset()" style="min-width:70px;"><i class="fas fa-undo"></i> RESET</button>
                <button class="sr-btn sr-btn-estop" onclick="ShowRunPage.qlabPanic()" style="min-width:80px;font-weight:900;"><i class="fas fa-exclamation-triangle"></i> PANIC</button>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <div class="sr-status-pill" id="sr-engine-pill">
                    <span class="sr-status-dot online"></span>
                    <span id="sr-engine-label">QLab</span>
                </div>
            </div>
        </div>

        ${this._showSection('qlab-cues') ? `
        <div style="display:grid;grid-template-columns:1fr 200px;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-list-ol"></i> Cue List</h3></div>
                <div class="card-body" style="max-height:60vh;overflow-y:auto;">
                    ${cues.length ? cues.map(cue => {
                        const isActive = cue.uniqueId === currentCueId || cue.number === currentCueId;
                        const statusClass = cue.isRunning ? 'green' : (cue.isLoaded ? 'blue' : 'gray');
                        const statusLabel = cue.isRunning ? 'Running' : (cue.isLoaded ? 'Loaded' : 'Idle');
                        const typeIcon = {Audio:'fa-volume-up',Video:'fa-film',Fade:'fa-adjust',Group:'fa-folder',Network:'fa-wifi',OSC:'fa-satellite',MIDI:'fa-music',Light:'fa-lightbulb'}[cue.type] || 'fa-bolt';
                        return `
                        <div class="sr-cue ${isActive ? 'sr-cue-next' : ''}" onclick="ShowRunPage.qlabFireCue('${UI.esc(cue.number)}')" style="cursor:pointer;">
                            <div class="sr-cue-indicator">${isActive ? '<i class="fas fa-caret-right"></i>' : ''}</div>
                            <div class="sr-cue-num">${UI.esc(cue.number || '')}</div>
                            <div class="sr-cue-info">
                                <div class="sr-cue-name">${UI.esc(cue.name || 'Untitled')}</div>
                                <div class="sr-cue-time">
                                    <span class="badge" style="font-size:9px;background:var(--bg-tertiary);color:var(--text-muted);margin-right:4px;"><i class="fas ${typeIcon}" style="margin-right:3px;"></i>${UI.esc(cue.type || 'Cue')}</span>
                                    ${cue.preWait ? '<span style="font-size:9px;color:var(--text-muted);margin-right:4px;">Pre:' + cue.preWait + 's</span>' : ''}
                                    ${cue.duration ? UI.formatDuration(cue.duration) : ''}
                                    ${cue.postWait ? '<span style="font-size:9px;color:var(--text-muted);margin-left:4px;">Post:' + cue.postWait + 's</span>' : ''}
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;">
                                ${!cue.armed ? '<i class="fas fa-lock" style="font-size:9px;color:var(--text-muted);" title="Disarmed"></i>' : ''}
                                ${cue.color ? '<span style="width:8px;height:8px;border-radius:50%;background:' + cue.color + ';display:inline-block;"></span>' : ''}
                                ${UI.badge(statusLabel, statusClass)}
                            </div>
                        </div>`;
                    }).join('') : '<p class="text-muted" style="padding:20px;text-align:center;">No cues loaded</p>'}
                </div>
            </div>
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
        </div>` : ''}

        ${this._showSection('qlab-active') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-play-circle"></i> Active / Running Cues</h3>
                <button class="btn btn-xs btn-danger" onclick="ShowRunPage.qlabPanic()"><i class="fas fa-exclamation-triangle"></i> PANIC ALL</button>
            </div>
            <div class="card-body">
                ${(cues.filter(c => c.isRunning).length || runningCues.length) ?
                    (cues.filter(c => c.isRunning).length ? cues.filter(c => c.isRunning) : runningCues).map(cue => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color);">
                        <span class="mono" style="font-weight:700;min-width:50px;font-size:13px;">${UI.esc(cue.number || '')}</span>
                        <span style="font-weight:600;font-size:12px;flex:1;">${UI.esc(cue.name || 'Untitled')}</span>
                        <span class="badge" style="font-size:9px;background:var(--bg-tertiary);color:var(--text-muted);">${UI.esc(cue.type || 'Cue')}</span>
                        ${UI.badge('Running', 'green')}
                        <button class="btn btn-xs" onclick="ShowRunPage.qlabStopCue('${UI.esc(cue.number || cue.uniqueId)}')" title="Stop this cue"><i class="fas fa-stop"></i></button>
                        <button class="btn btn-xs btn-danger" onclick="ShowRunPage.qlabHardStopCue('${UI.esc(cue.number || cue.uniqueId)}')" title="Hard stop"><i class="fas fa-times"></i></button>
                    </div>
                `).join('') : '<p class="text-muted" style="padding:20px;text-align:center;">No cues currently running</p>'}
            </div>
        </div>` : ''}

        ${this._showSection('qlab-direct') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> Fire Cue by Number</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="text" id="qlab-direct-cuenum" placeholder="Cue number..." style="flex:1;padding:10px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:16px;">
                        <button class="sr-btn sr-btn-play" onclick="ShowRunPage.qlabDirectFire()" style="min-width:80px;font-size:14px;font-weight:900;"><i class="fas fa-bolt"></i> FIRE</button>
                    </div>
                    <p style="font-size:10px;color:var(--text-muted);margin-top:8px;">Enter a cue number and press FIRE to trigger it directly.</p>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-eye"></i> Audition / Preview</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="text" id="qlab-audition-cuenum" placeholder="Cue number..." style="flex:1;padding:10px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:16px;">
                        <button class="sr-btn" onclick="ShowRunPage.qlabAudition()" style="min-width:80px;"><i class="fas fa-eye"></i> AUDITION</button>
                        <button class="sr-btn" onclick="ShowRunPage.qlabPreviewCue()" style="min-width:80px;"><i class="fas fa-search"></i> PREVIEW</button>
                    </div>
                    <p style="font-size:10px;color:var(--text-muted);margin-top:8px;">Audition plays without advancing playhead. Preview loads without playing.</p>
                </div>
            </div>
        </div>
        <div class="card mt-md">
            <div class="card-header"><h3><i class="fas fa-th"></i> Quick Fire Grid</h3></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;">
                    ${cues.filter(c => c.number).slice(0, 40).map(cue => `
                        <button class="sr-btn" onclick="ShowRunPage.qlabFireCue('${UI.esc(cue.number)}')" style="padding:12px 6px;font-size:11px;font-weight:700;text-align:center;
                            ${cue.isRunning ? 'background:#4ade80;color:#000;border-color:#4ade80;' : ''}">
                            <span style="display:block;font-size:13px;margin-bottom:2px;">${UI.esc(cue.number)}</span>
                            <span style="font-size:9px;opacity:0.7;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.esc(cue.name || '')}</span>
                        </button>
                    `).join('') || '<p class="text-muted">No numbered cues</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('qlab-settings') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-folder-open"></i> Workspace</h3></div>
                <div class="card-body">
                    <table style="font-size:11px;">
                        <tr><td class="text-muted">Workspace ID</td><td class="mono">${UI.esc(wsId || '—')}</td></tr>
                        <tr><td class="text-muted">Cue Count</td><td>${cues.length}</td></tr>
                        <tr><td class="text-muted">Running Cues</td><td>${cues.filter(c => c.isRunning).length}</td></tr>
                        <tr><td class="text-muted">Master Volume</td><td>${masterVolume}%</td></tr>
                    </table>
                    <div style="display:flex;gap:6px;margin-top:12px;">
                        <button class="btn btn-sm" onclick="ShowRunPage.qlabToggleFullScreen()"><i class="fas fa-expand"></i> Toggle Fullscreen</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Master Controls</h3></div>
                <div class="card-body" style="display:flex;flex-direction:column;gap:12px;">
                    <div>
                        <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Master Volume</label>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                            <input type="range" min="0" max="100" value="${masterVolume}" style="flex:1;accent-color:var(--accent);"
                                oninput="ShowRunPage.qlabSetVolume(this.value);this.nextElementSibling.textContent=this.value+'%'">
                            <span class="mono" style="font-size:12px;min-width:40px;">${masterVolume}%</span>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Min GO Interval (s)</label>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                            <input type="number" id="qlab-min-go" value="0" min="0" max="60" step="0.1" class="form-control" style="width:80px;">
                            <button class="btn btn-xs" onclick="ShowRunPage.qlabSetMinGo()">Apply</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>` : ''}`;
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
    async qlabReset() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.reset(wsId); UI.toast('Workspace reset', 'warning'); appState.log('EVENT', 'QLab RESET', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
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
    async qlabStopCue(num) {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.stopCue(wsId, num); UI.toast(`Cue ${num} stopped`, 'warning'); } catch(e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabHardStopCue(num) {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.hardStopCue(wsId, num); UI.toast(`Cue ${num} hard stopped`, 'warning'); } catch(e) { UI.toast(e.message, 'error'); }
        setTimeout(() => this._refreshQlab(), 200);
    },
    async qlabDirectFire() {
        const input = document.getElementById('qlab-direct-cuenum');
        if (!input || !input.value.trim()) return;
        this.qlabFireCue(input.value.trim());
    },
    async qlabAudition() {
        const input = document.getElementById('qlab-audition-cuenum');
        if (!input || !input.value.trim()) return;
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.auditionGo(wsId); UI.toast('Audition GO', 'success'); } catch(e) { UI.toast(e.message, 'error'); }
    },
    async qlabPreviewCue() {
        const input = document.getElementById('qlab-audition-cuenum');
        if (!input || !input.value.trim()) return;
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.preview(wsId, input.value.trim()); UI.toast('Preview loaded', 'success'); } catch(e) { UI.toast(e.message, 'error'); }
    },
    async qlabToggleFullScreen() {
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.toggleFullScreen(wsId); UI.toast('Fullscreen toggled', 'success'); } catch(e) { UI.toast(e.message, 'error'); }
    },
    async qlabSetMinGo() {
        const val = parseFloat(document.getElementById('qlab-min-go')?.value) || 0;
        const wsId = appState.get('qlabState')?.workspaceId;
        try { await qlabAPI.setMinimumGoInterval(wsId, val); UI.toast(`Min GO interval: ${val}s`, 'success'); } catch(e) { UI.toast(e.message, 'error'); }
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
        const annotations = dState.annotations || [];
        const timecode = dState.timecode || '00:00:00:00';
        const isPlaying = dState.isPlaying;
        const isPaused = dState.isPaused;
        const engaged = dState.engaged;
        const volume = dState.volume ?? 100;
        const brightness = dState.brightness ?? 100;
        return `
        <!-- TRANSPORT BAR -->
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
                <button class="sr-btn sr-btn-reset" onclick="ShowRunPage.disguiseReturnToStart()" title="Return to Start"><i class="fas fa-backward-step"></i></button>
                <button class="sr-btn ${isPlaying ? 'sr-btn-play' : ''}" onclick="ShowRunPage.disguisePlay()" style="min-width:80px;"><i class="fas fa-play"></i> PLAY</button>
                <button class="sr-btn sr-btn-stop" onclick="ShowRunPage.disguiseStop()" style="min-width:80px;"><i class="fas fa-stop"></i> STOP</button>
                <button class="sr-btn" onclick="ShowRunPage.disguisePlaySection()" title="Play to End of Section"><i class="fas fa-step-forward"></i> SECTION</button>
                <button class="sr-btn" onclick="ShowRunPage.disguisePlayLoopSection()" title="Loop Current Section"><i class="fas fa-sync"></i> LOOP</button>
                <div style="display:flex;align-items:center;gap:4px;margin-left:12px;">
                    <button class="sr-btn" onclick="ShowRunPage.disguisePrevSection()" title="Previous Section"><i class="fas fa-backward-step"></i></button>
                    <span style="font-size:10px;font-weight:700;color:var(--text-muted);padding:0 4px;">SEC</span>
                    <button class="sr-btn" onclick="ShowRunPage.disguiseNextSection()" title="Next Section"><i class="fas fa-forward-step"></i></button>
                </div>
                <div style="display:flex;align-items:center;gap:4px;margin-left:8px;">
                    <button class="sr-btn" onclick="ShowRunPage.disguisePrevTrack()" title="Previous Track"><i class="fas fa-backward-step"></i></button>
                    <span style="font-size:10px;font-weight:700;color:var(--text-muted);padding:0 4px;">TRK</span>
                    <button class="sr-btn" onclick="ShowRunPage.disguiseNextTrack()" title="Next Track"><i class="fas fa-forward-step"></i></button>
                </div>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <div class="sr-status-pill ${engaged ? '' : 'sr-status-disengaged'}" id="sr-engine-pill">
                    <span class="sr-status-dot ${engaged ? 'online' : ''}"></span>
                    <span id="sr-engine-label">Disguise${engaged ? '' : ' (Disengaged)'}</span>
                </div>
            </div>
        </div>

        ${this._showSection('disguise-tracks') ? this._renderDisguiseTracks(tracks, volume, brightness) : ''}
        ${this._showSection('disguise-sections') ? this._renderDisguiseSections(tracks, annotations, dState) : ''}
        ${this._showSection('disguise-transport') ? this._renderDisguiseTransport(annotations) : ''}
        ${this._showSection('disguise-health') ? this._renderDisguiseHealth(dState) : ''}
        `;
    },

    _renderDisguiseTracks(tracks, volume, brightness) {
        return `
        <div style="display:grid;grid-template-columns:1fr 200px;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-stream"></i> Tracks</h3></div>
                <div class="card-body">
                    ${tracks.length ? tracks.map(track => `
                        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                            <button class="sr-btn" onclick="ShowRunPage.disguiseGoToTrack('${track.uid || track.id}')" title="Go to track" style="min-width:130px;font-size:11px;font-weight:700;text-align:left;">
                                <i class="fas fa-play" style="margin-right:4px;font-size:9px;opacity:0.5;"></i> ${UI.esc(track.name || 'Track ' + (track.uid || track.id))}
                            </button>
                            <span class="mono" style="font-size:10px;color:var(--text-muted);min-width:60px;">${track.length || ''}</span>
                            ${track.crossfade != null ? `<span style="font-size:9px;color:var(--text-muted);">Xfade: ${track.crossfade}</span>` : ''}
                        </div>
                    `).join('') : '<p class="text-muted" style="padding:20px;text-align:center;">No tracks</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Master</h3></div>
                <div class="card-body" style="display:flex;flex-direction:column;gap:20px;align-items:center;">
                    <div style="text-align:center;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Brightness</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${Math.round(brightness * (brightness > 1 ? 1 : 100))}"
                            style="writing-mode:vertical-lr;direction:rtl;height:120px;accent-color:#facc15;"
                            oninput="ShowRunPage.disguiseSetBrightness(this.value)">
                        <div class="mono" style="font-size:12px;margin-top:4px;">${Math.round(brightness * (brightness > 1 ? 1 : 100))}%</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Volume</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${Math.round(volume * (volume > 1 ? 1 : 100))}"
                            style="writing-mode:vertical-lr;direction:rtl;height:120px;accent-color:var(--accent);"
                            oninput="ShowRunPage.disguiseSetVolume(this.value)">
                        <div class="mono" style="font-size:12px;margin-top:4px;">${Math.round(volume * (volume > 1 ? 1 : 100))}%</div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    _renderDisguiseSections(tracks, annotations, dState) {
        const currentTrack = dState.currentTrack;
        const currentSection = dState.currentSection;
        return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-film"></i> Tracks</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;">
                        ${tracks.map(track => `
                            <button class="sr-btn" onclick="ShowRunPage.disguiseGoToTrack('${track.uid || track.id}')" style="padding:14px 8px;font-size:11px;font-weight:600;text-align:center;
                                ${(track.uid || track.name) === currentTrack ? 'background:var(--accent-glow);border-color:var(--accent);color:var(--accent);' : ''}">
                                <i class="fas fa-film" style="margin-right:4px;"></i> ${UI.esc(track.name || 'Track')}
                            </button>
                        `).join('') || '<p class="text-muted" style="text-align:center;">No tracks</p>'}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-tags"></i> Annotations</h3></div>
                <div class="card-body" style="max-height:400px;overflow-y:auto;">
                    ${annotations.length ? annotations.map(a => `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:11px;cursor:pointer;" onclick="ShowRunPage.disguiseGoToAnnotation('${a.uid || a.id || ''}')">
                            <span class="mono" style="font-size:10px;color:var(--accent);min-width:60px;">${a.time || a.timeDisplay || ''}</span>
                            <span style="font-weight:600;">${UI.esc(a.text || a.name || a.type || 'Note')}</span>
                            ${a.type ? `<span style="font-size:9px;color:var(--text-muted);margin-left:auto;">${UI.esc(a.type)}</span>` : ''}
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No annotations</p>'}
                </div>
            </div>
        </div>`;
    },

    _renderDisguiseTransport(annotations) {
        return `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-clock"></i> Go To Time</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="text" id="disguise-goto-time" placeholder="Seconds or time" style="flex:1;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:14px;">
                        <button class="sr-btn sr-btn-play" onclick="ShowRunPage.disguiseGoToTime()" style="min-width:60px;"><i class="fas fa-arrow-right"></i> GO</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-stopwatch"></i> Go To Timecode</h3></div>
                <div class="card-body">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="text" id="disguise-goto-tc" placeholder="HH:MM:SS:FF" style="flex:1;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:14px;">
                        <button class="sr-btn sr-btn-play" onclick="ShowRunPage.disguiseGoToTimecode()" style="min-width:60px;"><i class="fas fa-arrow-right"></i> GO</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-terminal"></i> Show Control</h3></div>
                <div class="card-body">
                    <div style="margin-bottom:10px;">
                        <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">TCP String Command</label>
                        <div style="display:flex;gap:6px;margin-top:4px;">
                            <input type="text" id="disguise-tcp-cmd" placeholder="TCP command..." style="flex:1;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:12px;">
                            <button class="sr-btn" onclick="ShowRunPage.disguiseSendTCP()" style="min-width:50px;">SEND</button>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">OSC Message</label>
                        <div style="display:flex;gap:6px;margin-top:4px;">
                            <input type="text" id="disguise-osc-addr" placeholder="/address" style="flex:1;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:12px;">
                            <input type="text" id="disguise-osc-args" placeholder="args" style="width:80px;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--mono);font-size:12px;">
                            <button class="sr-btn" onclick="ShowRunPage.disguiseSendOSC()" style="min-width:50px;">SEND</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    _renderDisguiseHealth(dState) {
        const health = dState.health || [];
        const project = dState.project || {};
        return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-heartbeat"></i> Machine Health</h3></div>
                <div class="card-body">
                    ${health.length ? health.map(m => `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                            <span class="sr-status-dot ${m.status === 'ok' || m.status === 'good' ? 'online' : ''}" style="width:8px;height:8px;border-radius:50;"></span>
                            <span style="font-weight:700;font-size:12px;">${UI.esc(m.name || m.hostname || 'Machine')}</span>
                            <span class="mono" style="font-size:10px;color:var(--text-muted);margin-left:auto;">${m.fps ? m.fps + ' fps' : ''}</span>
                            ${m.droppedFrames ? `<span style="font-size:10px;color:var(--orange);">Dropped: ${m.droppedFrames}</span>` : ''}
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No health data</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-folder-open"></i> Project</h3></div>
                <div class="card-body">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${project.path ? `<div><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Path</span><div class="mono" style="font-size:11px;word-break:break-all;">${UI.esc(project.path)}</div></div>` : ''}
                        ${project.version ? `<div><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Version</span><div style="font-size:12px;">${UI.esc(project.version)}</div></div>` : ''}
                        ${project.name ? `<div><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Name</span><div style="font-size:12px;">${UI.esc(project.name)}</div></div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    },

    async disguisePlay() {
        try { await disguiseAPI.play(); UI.toast('PLAY', 'success'); appState.log('EVENT', 'Disguise PLAY', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseStop() {
        try { await disguiseAPI.stop(); UI.toast('STOP', 'warning'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseReturnToStart() {
        try { await disguiseAPI.returnToStart(); UI.toast('Return to start', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguisePlaySection() {
        try { await disguiseAPI.playSection(); UI.toast('Play to end of section', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguisePlayLoopSection() {
        try { await disguiseAPI.playLoopSection(); UI.toast('Looping section', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
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
    async disguiseNextTrack() {
        try { await disguiseAPI.goToNextTrack(); UI.toast('Next track', 'success'); appState.log('EVENT', 'Disguise next track', 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguisePrevTrack() {
        try { await disguiseAPI.goToPrevTrack(); UI.toast('Previous track', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseGoToTrack(trackUid) {
        try { await disguiseAPI.goToTrack(null, { uid: trackUid }); UI.toast('Go to track', 'success'); appState.log('EVENT', `Disguise go to track`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseGoToSection(sectionRef) {
        try { await disguiseAPI.goToSection(null, sectionRef); UI.toast('Go to section', 'success'); appState.log('EVENT', `Disguise go to section`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseGoToTime() {
        const input = document.getElementById('disguise-goto-time');
        if (!input || !input.value) return;
        try { await disguiseAPI.goToTime(null, input.value); UI.toast(`Go to ${input.value}`, 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseGoToTimecode() {
        const input = document.getElementById('disguise-goto-tc');
        if (!input || !input.value) return;
        try { await disguiseAPI.goToTimecode(null, input.value); UI.toast(`Go to TC ${input.value}`, 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    async disguiseSetVolume(val) {
        try { await disguiseAPI.setVolume(null, parseInt(val) / 100); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseSetBrightness(val) {
        try { await disguiseAPI.setBrightness(null, parseInt(val) / 100); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseSendTCP() {
        const input = document.getElementById('disguise-tcp-cmd');
        if (!input || !input.value) return;
        try { await disguiseAPI.fireTCPString(input.value); UI.toast(`TCP: ${input.value}`, 'success'); appState.log('EVENT', `Disguise TCP: ${input.value}`, 'Show'); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseSendOSC() {
        const addr = document.getElementById('disguise-osc-addr');
        const args = document.getElementById('disguise-osc-args');
        if (!addr || !addr.value) return;
        try { await disguiseAPI.sendOSC(addr.value, args?.value || ''); UI.toast(`OSC: ${addr.value}`, 'success'); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async disguiseGoToAnnotation(uid) {
        try { await disguiseAPI.goToNote(null, { uid }); UI.toast('Go to annotation', 'success'); } catch (e) { UI.toast(e.message, 'error'); }
        this._refreshDisguise();
    },
    // setDisguiseView removed — sidebar sub-page navigation replaces in-page dropdowns
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
        const resources = pState.resources || [];
        const devices = pState.devices || [];
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

        ${this._showSection('pixera-timelines') ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">
            ${timelines.map(tl => {
                const progress = tl.duration ? Math.round((tl.currentTime / tl.duration) * 100) : 0;
                const stateLabel = tl.state === 'playing' ? 'Playing' : (tl.state === 'paused' ? 'Paused' : 'Stopped');
                const stateColor = tl.state === 'playing' ? 'green' : (tl.state === 'paused' ? 'blue' : 'gray');
                return `
                <div class="card">
                    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
                        <h3 style="font-size:13px;"><i class="fas fa-film"></i> ${UI.esc(tl.name || 'Timeline')}</h3>
                        <div style="display:flex;align-items:center;gap:6px;">
                            ${tl.loop ? '<i class="fas fa-sync" style="font-size:9px;color:var(--accent);" title="Looping"></i>' : ''}
                            ${UI.badge(stateLabel, stateColor)}
                        </div>
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
                        <div style="display:flex;gap:6px;margin-bottom:8px;">
                            <span style="font-size:9px;color:var(--text-muted);">Speed</span>
                            <input type="range" min="0" max="200" value="${Math.round((tl.speed ?? 1) * 100)}" style="flex:1;accent-color:#a855f7;"
                                oninput="ShowRunPage.pixeraSetTimelineSpeed('${tl.handle}', this.value/100)">
                            <span class="mono" style="font-size:9px;min-width:30px;">${Math.round((tl.speed ?? 1) * 100)}%</span>
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
        </div>` : ''}

        ${this._showSection('pixera-cues') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-bolt"></i> Cue Triggers</h3></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
                    ${cues.length ? cues.map(cue => `
                        <button class="sr-btn" onclick="ShowRunPage.pixeraFireCue('${cue.handle}')" style="padding:16px 10px;font-size:12px;font-weight:700;text-align:center;">
                            <i class="fas fa-bolt" style="display:block;font-size:14px;margin-bottom:4px;opacity:0.5;"></i>
                            ${UI.esc(cue.name || 'Cue')}
                            ${cue.time != null ? '<div class="mono" style="font-size:9px;color:var(--text-muted);margin-top:2px;">' + cue.time + '</div>' : ''}
                        </button>
                    `).join('') : '<p class="text-muted" style="text-align:center;grid-column:1/-1;">No cues configured</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('pixera-screens') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-desktop"></i> Screens</h3></div>
                <div class="card-body">
                    ${screens.length ? screens.map(scr => `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                            <i class="fas fa-display" style="color:var(--text-muted);font-size:14px;"></i>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:12px;">${UI.esc(scr.name || 'Screen')}</div>
                                <div class="mono" style="font-size:10px;color:var(--text-muted);">${scr.width || '?'}x${scr.height || '?'}</div>
                            </div>
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No screens</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-server"></i> Output Devices</h3></div>
                <div class="card-body">
                    ${devices.length ? devices.map(dev => `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
                            <i class="fas fa-hdd" style="color:var(--text-muted);"></i>
                            <span style="font-weight:600;font-size:12px;flex:1;">${UI.esc(dev.name || 'Device')}</span>
                            ${dev.enabled ? UI.badge('Enabled', 'green') : UI.badge('Disabled', 'red')}
                        </div>
                    `).join('') : '<p class="text-muted" style="text-align:center;">No devices</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('pixera-resources') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-folder-open"></i> Resources</h3></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
                    ${resources.length ? resources.map(r => {
                        const name = r.name || r.path || 'Resource';
                        const ext = name.split('.').pop().toLowerCase();
                        const icon = ['mp4','mov','avi','wmv','mkv'].includes(ext) ? 'fa-film' : (['png','jpg','jpeg','bmp','tga','tiff'].includes(ext) ? 'fa-image' : 'fa-file');
                        return `<div style="border:1px solid var(--border-color);border-radius:var(--radius);padding:10px;background:var(--bg-secondary);">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                                <i class="fas ${icon}" style="color:var(--text-muted);"></i>
                                <span style="font-weight:600;font-size:11px;word-break:break-all;">${UI.esc(name)}</span>
                            </div>
                            ${r.duration ? '<div class="mono" style="font-size:9px;color:var(--text-muted);">Duration: ' + r.duration + '</div>' : ''}
                            ${r.resolution ? '<div class="mono" style="font-size:9px;color:var(--text-muted);">' + r.resolution + '</div>' : ''}
                        </div>`;
                    }).join('') : '<p class="text-muted" style="text-align:center;grid-column:1/-1;">No resources loaded. Connect to scan library.</p>'}
                </div>
            </div>
        </div>` : ''}`;
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
    async pixeraSetTimelineSpeed(handle, speed) {
        try { await pixeraAPI.setTimelineSpeed(handle, speed); } catch (e) { UI.toast(e.message, 'error'); }
    },
    async _refreshPixera() {
        try { const s = await pixeraAPI.getState(); appState.set('pixeraState', s); } catch {}
        const c = document.getElementById('page-container');
        if (c && appState.get('currentPage') === 'showrun') c.innerHTML = this.render();
    },

    // ================================================================
    // ATEM — Live Switcher
    // ================================================================
    _renderAtem() {
        const as = appState.get('atemState') || {};
        const inputs = as.inputs || [];
        const programId = as.programInput ?? 1;
        const previewId = as.previewInput ?? 2;
        const ftb = as.fadeToBlack || false;
        const transStyle = as.transitionStyle || 'mix';
        const transRate = as.transitionRate ?? 30;
        const dsks = as.dsks || [];
        const usks = as.usks || [];
        const auxOutputs = as.auxOutputs || [];
        const streaming = as.streaming || false;
        const recording = as.recording || false;
        const macros = as.macros || [];
        return `
        <div class="sr-transport">
            <div class="sr-transport-group">
                <div class="sr-live-badge"><span class="sr-live-dot"></span> LIVE</div>
                <span class="sr-clock" id="show-clock">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="sr-transport-group sr-transport-main">
                <button class="sr-btn sr-btn-go" onclick="ShowRunPage.atemCut()" style="background:linear-gradient(135deg,#ef4444,#dc2626);min-width:100px;font-size:16px;font-weight:900;">CUT</button>
                <button class="sr-btn sr-btn-accent" onclick="ShowRunPage.atemAuto()" style="min-width:100px;font-size:16px;font-weight:900;"><i class="fas fa-exchange-alt"></i> AUTO</button>
                <button class="sr-btn ${ftb ? 'sr-btn-estop' : 'sr-btn-stop'}" onclick="ShowRunPage.atemFTB()" style="min-width:80px;"><i class="fas fa-moon"></i> FTB</button>
                <select class="sr-select" onchange="ShowRunPage.atemSetTransStyle(this.value)" style="margin-left:12px;">
                    ${['mix','dip','wipe','stinger','dve'].map(s => `<option value="${s}" ${s === transStyle ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
                </select>
                <div style="display:flex;align-items:center;gap:4px;margin-left:8px;">
                    <span style="font-size:9px;color:var(--text-muted)">RATE</span>
                    <input type="number" value="${transRate}" min="1" max="250" style="width:50px;font-size:11px;padding:4px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary);"
                        onchange="ShowRunPage.atemSetTransRate(this.value)">
                    <span style="font-size:9px;color:var(--text-muted)">f</span>
                </div>
            </div>
            <div class="sr-transport-group sr-transport-end">
                <button class="sr-btn ${streaming ? 'sr-btn-estop' : ''}" onclick="ShowRunPage.atemToggleStream()" style="min-width:70px;"><i class="fas fa-broadcast-tower"></i> ${streaming ? 'STOP' : 'STREAM'}</button>
                <button class="sr-btn ${recording ? 'sr-btn-estop' : ''}" onclick="ShowRunPage.atemToggleRecord()" style="min-width:70px;"><i class="fas fa-circle"></i> ${recording ? 'STOP' : 'REC'}</button>
            </div>
        </div>

        ${this._showSection('atem-switching') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header" style="background:rgba(239,68,68,0.1);"><h3 style="color:#ef4444;"><i class="fas fa-tv"></i> PROGRAM</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;">
                        ${inputs.map(inp => `
                            <button class="sr-btn" onclick="ShowRunPage.atemSetProgram(${inp.id})" style="
                                padding:14px 6px;font-size:11px;font-weight:700;text-align:center;
                                ${inp.id === programId ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : ''}
                            "><span style="display:block;font-size:14px;margin-bottom:2px;">${inp.id}</span>${UI.esc(inp.name || 'Input ' + inp.id)}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header" style="background:rgba(34,197,94,0.1);"><h3 style="color:#4ade80;"><i class="fas fa-eye"></i> PREVIEW</h3></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;">
                        ${inputs.map(inp => `
                            <button class="sr-btn" onclick="ShowRunPage.atemSetPreview(${inp.id})" style="
                                padding:14px 6px;font-size:11px;font-weight:700;text-align:center;
                                ${inp.id === previewId ? 'background:#4ade80;color:#000;border-color:#4ade80;' : ''}
                            "><span style="display:block;font-size:14px;margin-bottom:2px;">${inp.id}</span>${UI.esc(inp.name || 'Input ' + inp.id)}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('atem-keyers') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-layer-group"></i> Downstream Keys</h3></div>
                <div class="card-body">
                    ${dsks.length ? dsks.map((dsk, i) => `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                            <span style="font-weight:700;font-size:12px;min-width:50px;">DSK ${i+1}</span>
                            <button class="sr-btn ${dsk.onAir ? 'sr-btn-play' : ''}" onclick="ShowRunPage.atemDskToggle(${i})" style="flex:1;">${dsk.onAir ? 'ON AIR' : 'OFF'}</button>
                            <button class="sr-btn" onclick="ShowRunPage.atemDskAuto(${i})" style="min-width:50px;">AUTO</button>
                        </div>
                    `).join('') : '<p class="text-muted">No DSKs available</p>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-key"></i> Upstream Keys</h3></div>
                <div class="card-body">
                    ${usks.length ? usks.map((usk, i) => `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                            <span style="font-weight:700;font-size:12px;min-width:50px;">USK ${i+1}</span>
                            <button class="sr-btn ${usk.onAir ? 'sr-btn-play' : ''}" onclick="ShowRunPage.atemUskToggle(${i})" style="flex:1;">${usk.onAir ? 'ON AIR' : 'OFF'}</button>
                            <select class="sr-select" onchange="ShowRunPage.atemSetUskType(${i}, this.value)" style="min-width:80px;">
                                ${['luma','chroma','pattern','dve'].map(t => `<option value="${t}" ${t === usk.type ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                    `).join('') : '<p class="text-muted">No USKs available</p>'}
                </div>
            </div>
        </div>` : ''}

        ${this._showSection('atem-aux') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-external-link-alt"></i> AUX Outputs</h3></div>
            <div class="card-body">
                ${auxOutputs.length ? auxOutputs.map((aux, i) => `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color);">
                        <span style="font-weight:700;font-size:12px;min-width:60px;">AUX ${i+1}</span>
                        <select class="sr-select" onchange="ShowRunPage.atemSetAux(${i}, parseInt(this.value))" style="flex:1;max-width:300px;">
                            ${inputs.map(inp => `<option value="${inp.id}" ${inp.id === aux.sourceId ? 'selected' : ''}>${UI.esc(inp.name || 'Input ' + inp.id)}</option>`).join('')}
                        </select>
                    </div>
                `).join('') : '<p class="text-muted">No AUX outputs configured</p>'}
            </div>
        </div>` : ''}

        ${this._showSection('atem-macros') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-magic"></i> Macros</h3></div>
            <div class="card-body">
                ${macros.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
                    ${macros.map(m => `
                        <button class="sr-btn" onclick="ShowRunPage.atemRunMacro(${m.id})" style="padding:16px 10px;font-size:12px;font-weight:700;">
                            <i class="fas fa-play" style="margin-right:6px;"></i> ${UI.esc(m.name || 'Macro ' + m.id)}
                        </button>
                    `).join('')}
                </div>` : '<p class="text-muted" style="text-align:center;">No macros configured</p>'}
            </div>
        </div>` : ''}

        ${this._showSection('atem-audio') ? `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-volume-up"></i> Audio Mixer</h3></div>
            <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;">
                ${inputs.map(inp => `
                    <div style="text-align:center;min-width:55px;">
                        <div style="font-size:9px;font-weight:700;margin-bottom:4px;max-width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.esc(inp.name || 'In ' + inp.id)}</div>
                        <input type="range" orient="vertical" min="0" max="100" value="${inp.audioGain ?? 50}"
                            style="writing-mode:vertical-lr;direction:rtl;height:100px;accent-color:var(--accent);"
                            oninput="ShowRunPage.atemSetAudioGain(${inp.id}, this.value)">
                        <div style="font-size:8px;margin-top:2px;color:var(--text-muted);" class="mono">${inp.audioGain ?? 50}%</div>
                        <button class="btn btn-xs" onclick="ShowRunPage.atemCycleAudioMix(${inp.id})" style="margin-top:2px;font-size:8px;">${inp.audioMix || 'OFF'}</button>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}`;
    },

    // ATEM actions
    async atemCut() { try { await atemAPI.transitionCut(); UI.toast('CUT', 'success'); appState.log('EVENT', 'ATEM CUT', 'Show'); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemAuto() { try { await atemAPI.transitionAuto(); UI.toast('AUTO', 'success'); appState.log('EVENT', 'ATEM AUTO', 'Show'); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemFTB() { try { await atemAPI.fadeToBlack(); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemSetProgram(id) { try { await atemAPI.setProgram(id); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemSetPreview(id) { try { await atemAPI.setPreview(id); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemSetTransStyle(style) { try { await atemAPI.setTransitionStyle(style); } catch(e) { UI.toast(e.message,'error'); } },
    async atemSetTransRate(rate) { try { await atemAPI.setTransitionRate(parseInt(rate)); } catch(e) { UI.toast(e.message,'error'); } },
    async atemDskToggle(i) { try { const dsks = appState.get('atemState')?.dsks || []; await atemAPI.setDskOnAir(i, !dsks[i]?.onAir); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemDskAuto(i) { try { await atemAPI.dskAuto(i); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemUskToggle(i) { try { const usks = appState.get('atemState')?.usks || []; await atemAPI.setUskOnAir(i, !usks[i]?.onAir); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemSetUskType(i, type) { try { await atemAPI.setUskType(i, type); } catch(e) { UI.toast(e.message,'error'); } },
    async atemSetAux(auxId, inputId) { try { await atemAPI.setAux(auxId, inputId); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemRunMacro(id) { try { await atemAPI.macroRun(id); UI.toast(`Macro ${id} running`, 'success'); appState.log('EVENT', `ATEM macro ${id}`, 'Show'); } catch(e) { UI.toast(e.message,'error'); } },
    async atemSetAudioGain(id, val) { try { await atemAPI.setAudioGain(id, parseInt(val)); } catch(e) { UI.toast(e.message,'error'); } },
    async atemCycleAudioMix(id) { const opts = ['off','on','afv']; const cur = appState.get('atemState')?.inputs?.find(i=>i.id===id)?.audioMix||'off'; const next = opts[(opts.indexOf(cur)+1)%opts.length]; try { await atemAPI.setAudioMixOption(id, next); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemToggleStream() { const s = appState.get('atemState'); try { s?.streaming ? await atemAPI.stopStreaming() : await atemAPI.startStreaming(); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async atemToggleRecord() { const s = appState.get('atemState'); try { s?.recording ? await atemAPI.stopRecording() : await atemAPI.startRecording(); } catch(e) { UI.toast(e.message,'error'); } this._refreshAtem(); },
    async _refreshAtem() {
        try { const s = await atemAPI.getState?.() || {}; appState.set('atemState', s); } catch {}
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
            try { const m = await casparcgAPI.getMedia(); appState.set('casparcgMedia', m); } catch {}
            try { const t = await casparcgAPI.getTemplates(); appState.set('casparcgTemplates', t); } catch {}
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
