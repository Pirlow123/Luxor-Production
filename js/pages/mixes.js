/**
 * Mixes & Layers Page — Level control, media loading, preset loading
 * Uses: /mix/{mixIndex}/level, /mix/{mixIndex}/layer/{layerIndex}/level,
 *       /mix/{mixIndex}/layer/{layerIndex}/media/{id}, etc.
 */
const MixesPage = {
    _expandedMixes: new Set([0]),

    render() {
        if (!appState.get('connected')) return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first');
        const info = appState.get('serverInfo');
        const mixes = info?.mixes || [];

        if (mixes.length === 0) return UI.empty('fa-sliders-h', 'No Mixes', 'No mix configuration on this server');

        return `
            <div class="section-header">
                <h2><i class="fas fa-sliders-h"></i> Mixes & Layers</h2>
                <button class="btn btn-sm btn-ghost" onclick="MixesPage.refreshAll()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
            <div id="mixes-container">${mixes.map(m => this._renderMix(m)).join('')}</div>
        `;
    },

    _renderMix(mix) {
        const expanded = this._expandedMixes.has(mix.index);
        const level = appState.get('mixLevels')[mix.index] ?? 0;

        return `
            <div class="mix-panel" id="mix-panel-${mix.index}">
                <div class="mix-header" onclick="MixesPage.toggleMix(${mix.index})">
                    <h3>
                        <span class="mix-badge">${mix.index}</span>
                        ${UI.esc(mix.name || `Mix ${mix.index}`)}
                        <span class="text-muted" style="font-size:10px;font-weight:400">${UI.esc(mix.mixType || '')} — ${mix.layerCount || 0} layers</span>
                    </h3>
                    <div class="flex items-center gap-md">
                        <div class="level-display">
                            <input type="range" class="range-slider" style="width:120px" min="0" max="100" value="${level}"
                                onclick="event.stopPropagation()"
                                oninput="MixesPage.setMixLevel(${mix.index}, this.value)">
                            <span class="level-value" id="mix-val-${mix.index}">${level}%</span>
                        </div>
                        <i class="fas fa-chevron-${expanded ? 'up' : 'down'}" style="color:var(--text-muted);font-size:11px"></i>
                    </div>
                </div>
                ${expanded && mix.hasLayers ? `
                    <div class="mix-body" id="mix-body-${mix.index}">
                        ${this._renderLayers(mix)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    _renderLayers(mix) {
        const layers = [];
        for (let i = 0; i < (mix.layerCount || 0); i++) layers.push(i);
        if (layers.length === 0) return '<div class="text-muted" style="padding:8px;font-size:12px">No layers</div>';

        return layers.map(i => {
            const key = `${mix.index}-${i}`;
            const level = appState.get('layerLevels')[key] ?? 0;
            return `
                <div class="layer-row">
                    <span class="layer-idx">${i}</span>
                    <span class="layer-name" id="layer-name-${key}">Layer ${i}</span>
                    <div class="layer-slider-wrap">
                        <input type="range" class="range-slider" min="0" max="100" value="${level}"
                            oninput="MixesPage.setLayerLevel(${mix.index}, ${i}, this.value)">
                        <span class="level-value" id="layer-val-${key}">${level}%</span>
                    </div>
                    <div class="layer-actions">
                        <button class="btn btn-xs" onclick="MixesPage.showLoadMedia(${mix.index}, ${i})" title="Load Media"><i class="fas fa-film"></i></button>
                        <button class="btn btn-xs" onclick="MixesPage.showLoadPreset(${mix.index}, ${i})" title="Load Preset"><i class="fas fa-bookmark"></i></button>
                        <button class="btn btn-xs" onclick="MixesPage.oneshotMedia(${mix.index}, ${i})" title="One-shot"><i class="fas fa-bolt"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    toggleMix(idx) {
        if (this._expandedMixes.has(idx)) this._expandedMixes.delete(idx);
        else this._expandedMixes.add(idx);
        HippoApp.renderPage();
    },

    async setMixLevel(mixIndex, level) {
        const val = parseInt(level);
        document.getElementById(`mix-val-${mixIndex}`).textContent = `${val}%`;
        try { await hippoAPI.setMixLevel(mixIndex, val); } catch {}
        appState.set('mixLevels', { ...appState.get('mixLevels'), [mixIndex]: val });
    },

    async setLayerLevel(mixIndex, layerIndex, level) {
        const val = parseInt(level);
        const key = `${mixIndex}-${layerIndex}`;
        document.getElementById(`layer-val-${key}`).textContent = `${val}%`;
        try { await hippoAPI.setLayerLevel(mixIndex, layerIndex, val); } catch {}
        appState.set('layerLevels', { ...appState.get('layerLevels'), [key]: val });
    },

    showLoadMedia(mixIndex, layerIndex) {
        const map = appState.get('mediaMap');
        const entries = map?.entries || [];
        const list = entries.length === 0
            ? '<p class="text-muted">No media in map. Upload media first.</p>'
            : entries.map(e => `
                <div class="pin-item" onclick="MixesPage.loadMedia(${mixIndex}, ${layerIndex}, '${e.mediaID}', '${UI.esc(e.name)}')">
                    <i class="fas fa-film"></i>
                    <span class="pin-path">${UI.esc(e.name || `Index ${e.index}`)}</span>
                    <span class="pin-val">#${e.index}</span>
                </div>
            `).join('');

        UI.openModal(`Load Media → Mix ${mixIndex} / Layer ${layerIndex}`, `
            <div style="max-height:400px;overflow-y:auto">${list}</div>
        `);
    },

    async loadMedia(mixIndex, layerIndex, mediaID, name) {
        UI.closeModal();
        try {
            await hippoAPI.loadLayerMediaById(mixIndex, layerIndex, mediaID);
            UI.toast(`Loaded "${name}" on Mix ${mixIndex} Layer ${layerIndex}`, 'success');
            appState.log('INFO', `Load media ${name} → Mix ${mixIndex}/Layer ${layerIndex}`, 'Layer');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    showLoadPreset(mixIndex, layerIndex) {
        UI.openModal(`Load Preset → Mix ${mixIndex} / Layer ${layerIndex}`, `
            <div class="form-row">
                ${UI.formGroup('BANK INDEX', '<input class="form-control" type="number" id="preset-bank" value="0" min="0" max="255">')}
                ${UI.formGroup('SLOT INDEX', '<input class="form-control" type="number" id="preset-slot" value="0" min="0" max="255">')}
            </div>
            <p class="text-muted mt-sm" style="font-size:11px">Or enter a preset UUID:</p>
            ${UI.formGroup('PRESET ID', '<input class="form-control" id="preset-uuid" placeholder="UUID">')}
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="MixesPage.applyPreset(${mixIndex}, ${layerIndex})">Load Preset</button>`);
    },

    async applyPreset(mixIndex, layerIndex) {
        const uuid = document.getElementById('preset-uuid').value.trim();
        const bank = parseInt(document.getElementById('preset-bank').value);
        const slot = parseInt(document.getElementById('preset-slot').value);
        UI.closeModal();

        try {
            if (uuid) {
                await hippoAPI.loadLayerPresetById(mixIndex, layerIndex, uuid);
            } else {
                await hippoAPI.loadLayerPresetBySlot(mixIndex, layerIndex, bank, slot);
            }
            UI.toast(`Preset loaded on Mix ${mixIndex} Layer ${layerIndex}`, 'success');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async oneshotMedia(mixIndex, layerIndex) {
        const map = appState.get('mediaMap');
        const entries = map?.entries || [];
        if (entries.length === 0) { UI.toast('No media available', 'warning'); return; }

        const list = entries.map(e => `
            <div class="pin-item" onclick="MixesPage.doOneshot(${mixIndex}, ${layerIndex}, '${e.mediaID}', '${UI.esc(e.name)}')">
                <i class="fas fa-bolt"></i>
                <span class="pin-path">${UI.esc(e.name || `Index ${e.index}`)}</span>
            </div>
        `).join('');

        UI.openModal(`One-shot → Mix ${mixIndex} / Layer ${layerIndex}`, `<div style="max-height:400px;overflow-y:auto">${list}</div>`);
    },

    async doOneshot(mixIndex, layerIndex, mediaID, name) {
        UI.closeModal();
        try {
            await hippoAPI.layerMediaOneshotById(mixIndex, layerIndex, mediaID);
            UI.toast(`One-shot "${name}" on Mix ${mixIndex} Layer ${layerIndex}`, 'success');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async refreshAll() {
        const info = appState.get('serverInfo');
        if (!info?.mixes) return;

        for (const mix of info.mixes) {
            try {
                const level = await hippoAPI.getMixLevel(mix.index);
                appState.set('mixLevels', { ...appState.get('mixLevels'), [mix.index]: typeof level === 'number' ? level : parseInt(level) || 0 });
            } catch {}

            if (mix.hasLayers) {
                for (let i = 0; i < (mix.layerCount || 0); i++) {
                    try {
                        const lv = await hippoAPI.getLayerLevel(mix.index, i);
                        const key = `${mix.index}-${i}`;
                        appState.set('layerLevels', { ...appState.get('layerLevels'), [key]: typeof lv === 'number' ? lv : parseInt(lv) || 0 });
                    } catch {}
                }
            }
        }

        HippoApp.renderPage();
        UI.toast('Levels refreshed', 'info');
    },

    onActivate() { this.refreshAll(); },
};
