/**
 * Presets Page — Browse, view, load, delete presets
 * Uses: GET /presets/{presettype}, GET /presets/thumb/{id}, GET /presets/delete/{id}
 * PresetCollectionInfo: { bankCount, banks[], presetType }
 * PresetBankInfo: { hasPresets, index, name, presets[], thumbPreset }
 * PresetInfo: { description, fadeTime, fadeType, filters, iD, index, name, presetType }
 */
const PresetsPage = {
    _type: 'mix',

    render() {
        if (!appState.get('connected')) return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first');

        return `
            <div class="section-header">
                <h2><i class="fas fa-bookmark"></i> Presets</h2>
                <button class="btn btn-sm btn-ghost" onclick="PresetsPage.refresh()"><i class="fas fa-sync-alt"></i></button>
            </div>

            ${UI.tabs([
                { id: 'mix', label: 'Mix Presets', content: '<div id="presets-mix-container">' + UI.loading() + '</div>' },
                { id: 'layer', label: 'Layer Presets', content: '<div id="presets-layer-container">' + UI.loading() + '</div>' },
            ], 'mix')}
        `;
    },

    _renderCollection(collection) {
        if (!collection || !collection.banks || collection.banks.length === 0) {
            return UI.empty('fa-bookmark', 'No Presets', `No ${collection?.presetType || ''} presets found`);
        }

        return collection.banks.map(bank => {
            if (!bank.hasPresets) return '';
            const presets = bank.presets || [];
            if (presets.length === 0) return '';

            return `
                <div class="card mb-md">
                    <div class="card-header">
                        <h3><i class="fas fa-folder"></i> Bank ${bank.index}: ${UI.esc(bank.name || 'Unnamed')}</h3>
                        <span class="text-muted" style="font-size:11px">${presets.length} presets</span>
                    </div>
                    <div class="card-body">
                        <div class="preset-grid">
                            ${presets.map(p => this._renderPreset(p, bank.index, collection.presetType)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('') || UI.empty('fa-bookmark', 'No Presets', 'All banks are empty');
    },

    _renderPreset(preset, bankIndex, presetType) {
        const thumbUrl = preset.iD ? hippoAPI.getPresetThumbUrl(preset.iD) : '';

        return `
            <div class="preset-card" onclick="PresetsPage.showDetail('${preset.iD}', '${presetType}', ${bankIndex}, ${preset.index})">
                <div class="preset-thumb">
                    ${thumbUrl ? `<img src="${thumbUrl}" onerror="this.style.display='none'" loading="lazy">` : ''}
                    <i class="fas fa-bookmark" style="${thumbUrl ? 'display:none' : ''}"></i>
                </div>
                <div class="preset-name">${UI.esc(preset.name || `Preset ${preset.index}`)}</div>
                <div class="preset-meta">B${bankIndex}:S${preset.index}</div>
            </div>
        `;
    },

    showDetail(presetId, type, bank, slot) {
        UI.openModal('Preset Detail', `
            <div style="text-align:center;margin-bottom:12px">
                <img src="${hippoAPI.getPresetThumbUrl(presetId)}" style="max-width:100%;max-height:180px;border-radius:var(--radius-md);background:var(--bg-tertiary)" onerror="this.style.display='none'">
            </div>
            <table>
                <tr><td class="text-muted">ID</td><td class="mono" style="font-size:10px">${UI.esc(presetId)}</td></tr>
                <tr><td class="text-muted">Type</td><td>${UI.esc(type)}</td></tr>
                <tr><td class="text-muted">Bank</td><td>${bank}</td></tr>
                <tr><td class="text-muted">Slot</td><td>${slot}</td></tr>
            </table>
            <p class="text-muted mt-md" style="font-size:11px">To load this preset, use the Mixes & Layers page to apply it to a specific mix or layer.</p>
        `, `<button class="btn" onclick="UI.closeModal()">Close</button>
            <button class="btn btn-danger" onclick="PresetsPage.deletePreset('${presetId}')">Delete</button>`);
    },

    async deletePreset(id) {
        UI.closeModal();
        const ok = await UI.confirm('Delete Preset', 'Permanently delete this preset?');
        if (!ok) return;
        try {
            await hippoAPI.deletePreset(id);
            UI.toast('Preset deleted', 'success');
            appState.log('INFO', `Deleted preset ${id}`, 'Presets');
            this.refresh();
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async refresh() {
        try {
            const [mix, layer] = await Promise.all([
                hippoAPI.getPresets('mix'),
                hippoAPI.getPresets('layer'),
            ]);
            appState.set('mixPresets', mix);
            appState.set('layerPresets', layer);

            const mc = document.getElementById('presets-mix-container');
            const lc = document.getElementById('presets-layer-container');
            if (mc) mc.innerHTML = this._renderCollection(mix);
            if (lc) lc.innerHTML = this._renderCollection(layer);
        } catch(e) {
            UI.toast(e.message, 'error');
        }
    },

    onActivate() { this.refresh(); },
};
