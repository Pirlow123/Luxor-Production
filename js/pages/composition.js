/**
 * Composition Page — Resolume Arena clip grid, layers, columns
 * Main interaction paradigm for Resolume servers
 */
const CompositionPage = {
    _pollTimer: null,

    render() {
        if (!appState.get('connected')) return UI.empty('fa-th', 'Not Connected', 'Connect to a Resolume Arena server to view composition.');
        const comp = appState.get('composition');
        if (!comp || !comp.layers) return UI.empty('fa-th', 'Loading Composition...', 'Fetching data from Resolume Arena.');

        const layers = comp.layers || [];
        const columns = comp.columns || [];
        const decks = comp.decks || [];

        return `
        <div class="comp-page">
            <!-- Deck selector -->
            <div class="comp-toolbar">
                <div class="comp-decks">
                    ${decks.map((d, i) => `
                        <button class="comp-deck-btn ${d.selected ? 'active' : ''}" onclick="CompositionPage.selectDeck(${i + 1})">
                            ${UI.esc(d.name?.value || 'Deck ' + (i + 1))}
                        </button>
                    `).join('')}
                </div>
                <div class="comp-master">
                    <span class="comp-master-label">MASTER</span>
                    <input type="range" class="comp-master-slider" min="0" max="100" value="${Math.round((comp.master?.value ?? 1) * 100)}" oninput="CompositionPage.setMaster(this.value)">
                    <span class="comp-master-val">${Math.round((comp.master?.value ?? 1) * 100)}%</span>
                </div>
                <div class="comp-actions">
                    <button class="btn btn-xs btn-ghost" onclick="CompositionPage.refresh()"><i class="fas fa-sync-alt"></i> Refresh</button>
                </div>
            </div>

            <!-- Column triggers -->
            <div class="comp-grid-wrap">
                <div class="comp-grid">
                    <!-- Column header row -->
                    <div class="comp-row comp-col-header">
                        <div class="comp-layer-ctrl comp-corner"></div>
                        ${columns.map((col, ci) => `
                            <div class="comp-col-trigger" onclick="CompositionPage.triggerColumn(${ci + 1})">
                                <i class="fas fa-chevron-down"></i>
                                <span>${UI.esc(col.name?.value || 'Col ' + (ci + 1))}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Layer rows -->
                    ${layers.map((layer, li) => this._renderLayerRow(layer, li, columns.length)).join('')}
                </div>
            </div>
        </div>`;
    },

    _renderLayerRow(layer, li, colCount) {
        const opacity = Math.round((layer.master?.value ?? 1) * 100);
        const bypassed = layer.bypassed?.value || false;
        const solo = layer.solo?.value || false;
        const clips = layer.clips || [];

        return `
        <div class="comp-row ${bypassed ? 'comp-row-bypassed' : ''}">
            <div class="comp-layer-ctrl">
                <div class="comp-layer-name">${UI.esc(layer.name?.value || 'Layer ' + (li + 1))}</div>
                <div class="comp-layer-btns">
                    <button class="comp-lbtn ${bypassed ? 'comp-lbtn-active-red' : ''}" onclick="CompositionPage.toggleBypass(${li + 1})" title="Bypass">B</button>
                    <button class="comp-lbtn ${solo ? 'comp-lbtn-active-yellow' : ''}" onclick="CompositionPage.toggleSolo(${li + 1})" title="Solo">S</button>
                    <button class="comp-lbtn" onclick="CompositionPage.clearLayer(${li + 1})" title="Clear"><i class="fas fa-times"></i></button>
                </div>
                <div class="comp-layer-fader">
                    <input type="range" min="0" max="100" value="${opacity}" class="comp-layer-slider" oninput="CompositionPage.setLayerOpacity(${li + 1}, this.value)">
                    <span class="comp-layer-val">${opacity}%</span>
                </div>
            </div>
            ${Array.from({ length: colCount }, (_, ci) => {
                const clip = clips[ci];
                return this._renderClip(clip, li, ci);
            }).join('')}
        </div>`;
    },

    _renderClip(clip, li, ci) {
        if (!clip || !clip._hasContent) {
            return `<div class="comp-clip comp-clip-empty" onclick="CompositionPage.triggerClip(${li + 1}, ${ci + 1})"></div>`;
        }
        const connected = clip.connected?.value === 'Connected';
        const name = clip.name?.value || '';
        const pos = clip.transport?.position?.value ?? 0;

        return `
        <div class="comp-clip ${connected ? 'comp-clip-connected' : ''}" onclick="CompositionPage.triggerClip(${li + 1}, ${ci + 1})">
            <div class="comp-clip-progress" style="width:${Math.round(pos * 100)}%"></div>
            <div class="comp-clip-name">${UI.esc(name)}</div>
            ${connected ? '<div class="comp-clip-badge">LIVE</div>' : ''}
        </div>`;
    },

    // ================================================================
    // ACTIONS
    // ================================================================
    async triggerClip(layer, clip) {
        try {
            await resolumeAPI.connectClip(layer, clip);
            UI.toast(`Clip ${layer}/${clip} triggered`, 'success');
            setTimeout(() => this.loadComposition(), 150);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async triggerColumn(col) {
        try {
            await resolumeAPI.connectColumn(col);
            UI.toast(`Column ${col} triggered`, 'success');
            setTimeout(() => this.loadComposition(), 150);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async clearLayer(layer) {
        try {
            await resolumeAPI.clearLayer(layer);
            setTimeout(() => this.loadComposition(), 150);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async toggleBypass(layer) {
        const comp = appState.get('composition');
        const l = comp?.layers?.[layer - 1];
        if (!l) return;
        const current = l.bypassed?.value || false;
        try {
            await resolumeAPI.updateLayer(layer, { bypassed: { value: !current } });
            l.bypassed.value = !current;
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async toggleSolo(layer) {
        const comp = appState.get('composition');
        const l = comp?.layers?.[layer - 1];
        if (!l) return;
        const current = l.solo?.value || false;
        try {
            await resolumeAPI.updateLayer(layer, { solo: { value: !current } });
            l.solo.value = !current;
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async setLayerOpacity(layer, val) {
        const comp = appState.get('composition');
        const l = comp?.layers?.[layer - 1];
        if (l?.master) l.master.value = val / 100;
        try {
            if (l?.master?.id) await resolumeAPI.setParameter(l.master.id, val / 100);
        } catch {}
    },

    async setMaster(val) {
        const comp = appState.get('composition');
        if (comp?.master) comp.master.value = val / 100;
        try {
            if (comp?.master?.id) await resolumeAPI.setParameter(comp.master.id, val / 100);
        } catch {}
    },

    async selectDeck(deck) {
        try {
            await resolumeAPI.selectDeck(deck);
            UI.toast(`Deck ${deck} selected`, 'info');
            setTimeout(() => this.loadComposition(), 200);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // DATA
    // ================================================================
    async loadComposition() {
        try {
            const comp = await resolumeAPI.getComposition();
            appState.set('composition', comp);
            this.refresh();
        } catch {}
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'composition') {
            container.innerHTML = this.render();
        }
    },

    onActivate() {
        this.loadComposition();
        this._pollTimer = setInterval(() => this.loadComposition(), 5000);
    },

    onDeactivate() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    },
};

// ================================================================
// CSS — injected once
// ================================================================
(function() {
    if (document.getElementById('comp-page-css')) return;
    const style = document.createElement('style');
    style.id = 'comp-page-css';
    style.textContent = `
    .comp-page { display: flex; flex-direction: column; gap: 16px; height: 100%; }

    .comp-toolbar {
        display: flex; align-items: center; gap: 16px; padding: 12px 16px;
        background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
    }
    .comp-decks { display: flex; gap: 6px; }
    .comp-deck-btn {
        padding: 6px 16px; border-radius: 6px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 12px; font-weight: 600; transition: all 0.15s;
    }
    .comp-deck-btn:hover { border-color: var(--accent); color: var(--text-primary); }
    .comp-deck-btn.active { background: var(--accent); color: #000; border-color: var(--accent); }

    .comp-master { display: flex; align-items: center; gap: 8px; margin-left: auto; }
    .comp-master-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 1px; }
    .comp-master-slider { width: 120px; accent-color: var(--accent); }
    .comp-master-val { font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono); min-width: 36px; }

    .comp-grid-wrap { flex: 1; overflow: auto; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); }
    .comp-grid { display: flex; flex-direction: column; min-width: fit-content; }

    .comp-row {
        display: flex; border-bottom: 1px solid var(--border);
    }
    .comp-row-bypassed { opacity: 0.4; }

    .comp-col-header { background: rgba(255,255,255,0.02); }
    .comp-corner { background: rgba(0,0,0,0.2); }

    .comp-col-trigger {
        min-width: 130px; max-width: 130px; padding: 8px 6px; text-align: center;
        border-right: 1px solid var(--border); cursor: pointer;
        font-size: 11px; color: var(--text-muted); transition: all 0.15s;
        display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .comp-col-trigger:hover { background: rgba(0,212,170,0.08); color: var(--accent); }
    .comp-col-trigger i { font-size: 10px; }

    .comp-layer-ctrl {
        min-width: 160px; max-width: 160px; padding: 10px 12px;
        border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px;
        background: rgba(0,0,0,0.15);
    }
    .comp-layer-name { font-size: 12px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .comp-layer-btns { display: flex; gap: 4px; }
    .comp-lbtn {
        width: 24px; height: 20px; border-radius: 3px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-muted); cursor: pointer;
        font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
    }
    .comp-lbtn:hover { border-color: var(--text-secondary); color: var(--text-primary); }
    .comp-lbtn-active-red { background: #b91c1c; color: #fff; border-color: #b91c1c; }
    .comp-lbtn-active-yellow { background: #ca8a04; color: #000; border-color: #ca8a04; }

    .comp-layer-fader { display: flex; align-items: center; gap: 4px; }
    .comp-layer-slider { flex: 1; height: 4px; accent-color: var(--accent); }
    .comp-layer-val { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); min-width: 30px; text-align: right; }

    .comp-clip {
        min-width: 130px; max-width: 130px; min-height: 60px; padding: 8px 6px;
        border-right: 1px solid var(--border); cursor: pointer; position: relative;
        overflow: hidden; transition: all 0.15s; background: rgba(0,0,0,0.1);
    }
    .comp-clip:hover { background: rgba(255,255,255,0.04); }
    .comp-clip-empty { opacity: 0.3; }
    .comp-clip-empty:hover { opacity: 0.5; background: rgba(0,212,170,0.04); }

    .comp-clip-connected {
        background: rgba(0,212,170,0.12) !important;
        border-bottom: 2px solid var(--accent);
    }

    .comp-clip-progress {
        position: absolute; bottom: 0; left: 0; height: 3px;
        background: var(--accent); transition: width 0.3s linear;
    }

    .comp-clip-name {
        font-size: 11px; font-weight: 500; color: var(--text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .comp-clip-badge {
        position: absolute; top: 4px; right: 4px; font-size: 8px; font-weight: 800;
        background: var(--accent); color: #000; padding: 1px 4px; border-radius: 3px;
        letter-spacing: 0.5px;
    }
    `;
    document.head.appendChild(style);
})();
