/**
 * Engine Media Page — Universal media browser for all non-Hippo engines
 * Supports: CasparCG, Pixera, ATEM, vMix, OBS, Resolume, Disguise, Barco, QLab
 */
const EngineMediaPage = {
    _view: 'grid',
    _search: '',
    _ccgChannel: 1,
    _ccgLayer: 10,
    _pollTimer: null,

    render() {
        if (!appState.get('connected')) {
            return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first to browse media.');
        }

        const serverType = appState.get('serverType') || 'hippo';

        switch (serverType) {
            case 'casparcg':  return this._renderCasparcg();
            case 'pixera':    return this._renderPixera();
            case 'atem':      return this._renderAtem();
            case 'vmix':      return this._renderVmix();
            case 'obs':       return this._renderObs();
            case 'resolume':  return this._renderResolume();
            case 'disguise':
            case 'barco':
            case 'qlab':
                return this._renderUnsupported(serverType);
            default:
                return UI.empty('fa-photo-video', 'Unknown Engine', `Media browsing is not available for engine type "${UI.esc(serverType)}".`);
        }
    },

    // ================================================================
    // HEADER + SEARCH BAR (shared)
    // ================================================================

    _header(title, icon, buttons) {
        return `
            <div class="section-header">
                <h2><i class="fas ${icon}"></i> ${UI.esc(title)}</h2>
                <div class="flex gap-sm">
                    ${buttons || ''}
                    <button class="btn btn-sm btn-ghost" onclick="EngineMediaPage.refresh()"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>`;
    },

    _searchBar() {
        return `
            <div class="media-toolbar">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input class="form-control" placeholder="Search media..." value="${UI.esc(this._search)}" oninput="EngineMediaPage._filterMedia(this.value)">
                </div>
                <div class="media-view-toggle">
                    <button class="media-view-btn ${this._view === 'grid' ? 'active' : ''}" onclick="EngineMediaPage._setView('grid')"><i class="fas fa-th"></i></button>
                    <button class="media-view-btn ${this._view === 'list' ? 'active' : ''}" onclick="EngineMediaPage._setView('list')"><i class="fas fa-list"></i></button>
                </div>
            </div>`;
    },

    _filterMedia: UI.debounce(function(q) {
        EngineMediaPage._search = q;
        const c = document.getElementById('em-media-container');
        if (c) c.innerHTML = EngineMediaPage._renderCurrentItems();
    }, 200),

    _setView(v) {
        this._view = v;
        const c = document.getElementById('em-media-container');
        if (c) c.innerHTML = this._renderCurrentItems();
        document.querySelectorAll('.media-view-btn').forEach((b, i) =>
            b.classList.toggle('active', (v === 'grid' && i === 0) || (v === 'list' && i === 1))
        );
    },

    _renderCurrentItems() {
        const serverType = appState.get('serverType') || '';
        switch (serverType) {
            case 'casparcg':  return this._ccgMediaGrid() + this._ccgTemplatesSection();
            case 'pixera':    return this._pixeraResourceGrid();
            case 'atem':      return this._atemMediaGrid();
            case 'vmix':      return this._vmixInputGrid();
            case 'obs':       return this._obsInputGrid();
            case 'resolume':  return this._resolumeClipGrid();
            default:          return '';
        }
    },

    _applySearch(items, nameExtractor) {
        if (!this._search) return items;
        const q = this._search.toLowerCase();
        return items.filter(item => (nameExtractor(item) || '').toLowerCase().includes(q));
    },

    // ================================================================
    // CASPARCG
    // ================================================================

    _renderCasparcg() {
        const channels = appState.get('casparcgChannels') || [];
        return `
            ${this._header('CasparCG Media', 'fa-photo-video')}
            <div class="card mb-md">
                <div class="card-body" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                    <span style="font-size:11px;font-weight:600;color:var(--text-muted);">Play Target:</span>
                    <select class="form-control" style="width:120px;" onchange="EngineMediaPage._ccgChannel=parseInt(this.value)">
                        ${channels.length ? channels.map((ch, ci) =>
                            `<option value="${ch.id || ci+1}" ${(ch.id || ci+1) === this._ccgChannel ? 'selected' : ''}>Channel ${ch.id || ci+1}</option>`
                        ).join('') : '<option value="1">Channel 1</option>'}
                    </select>
                    <span style="font-size:11px;color:var(--text-muted);">Layer</span>
                    <input type="number" class="form-control" style="width:70px;" value="${this._ccgLayer}" min="1" max="999"
                        onchange="EngineMediaPage._ccgLayer=parseInt(this.value)">
                </div>
            </div>
            ${this._searchBar()}
            <div id="em-media-container">
                ${this._ccgMediaGrid()}
                ${this._ccgTemplatesSection()}
            </div>`;
    },

    _ccgMediaGrid() {
        const media = appState.get('casparcgMedia') || [];
        const filtered = this._applySearch(media, m => typeof m === 'string' ? m : (m.name || m.clip || ''));

        if (!filtered.length) {
            return UI.empty('fa-photo-video', 'No Media', 'No CasparCG media files found. Ensure the server is connected and has scanned its media folder.');
        }

        if (this._view === 'list') {
            return `
                <div class="card mb-md">
                    <div class="card-header"><h3><i class="fas fa-film"></i> Clips</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} items</span></div>
                    <div class="card-body">
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
                                <tbody>${filtered.map(m => {
                                    const name = typeof m === 'string' ? m : (m.name || m.clip);
                                    const type = (typeof m === 'object' && m.type) || 'video';
                                    const icon = type === 'audio' ? 'fa-music' : (type === 'still' ? 'fa-image' : 'fa-film');
                                    return `<tr>
                                        <td><i class="fas ${icon}" style="margin-right:6px;opacity:0.5;"></i> <strong>${UI.esc(name)}</strong></td>
                                        <td><span class="mono" style="font-size:11px;">${UI.esc(type)}</span></td>
                                        <td>
                                            <button class="btn btn-xs btn-accent" onclick="EngineMediaPage._ccgPlay('${UI.esc(name)}')" title="Play"><i class="fas fa-play"></i></button>
                                            <button class="btn btn-xs" onclick="EngineMediaPage._ccgLoad('${UI.esc(name)}')" title="Load BG"><i class="fas fa-download"></i></button>
                                            <button class="btn btn-xs" onclick="EngineMediaPage._ccgPreview('${UI.esc(name)}')" title="Preview"><i class="fas fa-eye"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="card mb-md">
                <div class="card-header"><h3><i class="fas fa-film"></i> Clips</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} items</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
                        ${filtered.map(m => {
                            const name = typeof m === 'string' ? m : (m.name || m.clip);
                            const type = (typeof m === 'object' && m.type) || 'video';
                            const icon = type === 'audio' ? 'fa-music' : (type === 'still' ? 'fa-image' : 'fa-film');
                            return `<div class="media-card" onclick="EngineMediaPage._ccgPreview('${UI.esc(name)}')" ondblclick="EngineMediaPage._ccgPlay('${UI.esc(name)}')">
                                <div class="media-thumb">
                                    <i class="fas ${icon}"></i>
                                    <span class="media-type-badge">${UI.esc(type)}</span>
                                </div>
                                <div class="media-info">
                                    <div class="media-name" title="${UI.esc(name)}">${UI.esc(name)}</div>
                                    <div class="media-meta">
                                        <button class="btn btn-xs btn-accent" onclick="event.stopPropagation();EngineMediaPage._ccgPlay('${UI.esc(name)}')" title="Play">
                                            <i class="fas fa-play"></i>
                                        </button>
                                        <button class="btn btn-xs" onclick="event.stopPropagation();EngineMediaPage._ccgLoad('${UI.esc(name)}')" title="Load BG">
                                            <i class="fas fa-download"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },

    _ccgTemplatesSection() {
        const templates = appState.get('casparcgTemplates') || [];
        const filtered = this._applySearch(templates, t => typeof t === 'string' ? t : (t.name || ''));

        if (!filtered.length) return '';

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-layer-group"></i> CG Templates</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} templates</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
                        ${filtered.map(t => {
                            const name = typeof t === 'string' ? t : (t.name || t);
                            return `<div style="border:1px solid var(--border-color);border-radius:var(--radius);padding:10px;background:var(--bg-secondary);">
                                <div style="font-weight:700;font-size:11px;margin-bottom:8px;word-break:break-all;"><i class="fas fa-code" style="margin-right:4px;opacity:0.4;"></i>${UI.esc(name)}</div>
                                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                    <button class="btn btn-xs btn-accent" onclick="EngineMediaPage._ccgCgAdd('${UI.esc(name)}')" title="Add & Play"><i class="fas fa-plus"></i> Add</button>
                                    <button class="btn btn-xs" onclick="EngineMediaPage._ccgCgPlay()" title="Play"><i class="fas fa-play"></i></button>
                                    <button class="btn btn-xs" onclick="EngineMediaPage._ccgCgNext()" title="Next"><i class="fas fa-forward"></i></button>
                                    <button class="btn btn-xs btn-danger" onclick="EngineMediaPage._ccgCgStop()" title="Stop"><i class="fas fa-stop"></i></button>
                                    <button class="btn btn-xs" onclick="EngineMediaPage._ccgCgRemove()" title="Remove"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },

    async _ccgPlay(clip) {
        try {
            await casparcgAPI.playMedia(this._ccgChannel, this._ccgLayer, clip);
            UI.toast(`Playing "${clip}" on CH${this._ccgChannel}-L${this._ccgLayer}`, 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _ccgLoad(clip) {
        try {
            await casparcgAPI.loadMedia(this._ccgChannel, this._ccgLayer, clip);
            UI.toast(`Loaded "${clip}" in background`, 'info');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    _ccgPreview(clip) {
        const type = 'video';
        UI.openModal('Media Preview', `
            <div style="text-align:center;padding:20px;">
                <i class="fas fa-film" style="font-size:48px;opacity:0.3;margin-bottom:12px;display:block;"></i>
                <h3 style="margin-bottom:4px;">${UI.esc(clip)}</h3>
                <p class="text-muted" style="font-size:12px;margin-bottom:16px;">CasparCG media clip</p>
                <div style="display:flex;gap:8px;justify-content:center;">
                    <button class="btn btn-accent" onclick="UI.closeModal();EngineMediaPage._ccgPlay('${UI.esc(clip)}')"><i class="fas fa-play"></i> Play</button>
                    <button class="btn" onclick="UI.closeModal();EngineMediaPage._ccgLoad('${UI.esc(clip)}')"><i class="fas fa-download"></i> Load BG</button>
                </div>
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Close</button>`);
    },

    async _ccgCgAdd(template) {
        try {
            await casparcgAPI.cgAdd(this._ccgChannel, this._ccgLayer, template, '', true);
            UI.toast(`Template "${template}" added`, 'success');
        } catch (e) { UI.toast(e.message, 'error'); }
    },
    async _ccgCgPlay()   { try { await casparcgAPI.cgPlay(this._ccgChannel, this._ccgLayer); } catch (e) { UI.toast(e.message, 'error'); } },
    async _ccgCgNext()   { try { await casparcgAPI.cgNext(this._ccgChannel, this._ccgLayer); } catch (e) { UI.toast(e.message, 'error'); } },
    async _ccgCgStop()   { try { await casparcgAPI.cgStop(this._ccgChannel, this._ccgLayer); } catch (e) { UI.toast(e.message, 'error'); } },
    async _ccgCgRemove() { try { await casparcgAPI.cgRemove(this._ccgChannel, this._ccgLayer); } catch (e) { UI.toast(e.message, 'error'); } },

    // ================================================================
    // PIXERA
    // ================================================================

    _renderPixera() {
        return `
            ${this._header('Pixera Resources', 'fa-folder-open',
                '<button class="btn btn-sm btn-primary" onclick="EngineMediaPage._pixeraImport()"><i class="fas fa-file-import"></i> Import</button>'
            )}
            ${this._searchBar()}
            <div id="em-media-container">${this._pixeraResourceGrid()}</div>`;
    },

    _pixeraResourceGrid() {
        const pState = appState.get('pixeraState') || {};
        const resources = pState.resources || [];
        const filtered = this._applySearch(resources, r => r.name || r.path || '');

        if (!filtered.length) {
            return UI.empty('fa-folder-open', 'No Resources', 'No Pixera resources found. Import media or ensure the project has resources loaded.');
        }

        if (this._view === 'list') {
            return `
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-folder-open"></i> Resources</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} items</span></div>
                    <div class="card-body">
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>Name</th><th>Type</th><th>Resolution</th><th>Duration</th><th>Actions</th></tr></thead>
                                <tbody>${filtered.map(r => {
                                    const name = r.name || r.path || 'Unnamed';
                                    const ext = name.split('.').pop().toLowerCase();
                                    const icon = this._pixeraFileIcon(ext);
                                    return `<tr>
                                        <td><i class="fas ${icon}" style="margin-right:6px;opacity:0.5;"></i> <strong>${UI.esc(name)}</strong></td>
                                        <td class="mono" style="font-size:11px;">${UI.esc(ext)}</td>
                                        <td class="mono">${r.width && r.height ? `${r.width}x${r.height}` : '--'}</td>
                                        <td>${r.duration ? UI.formatDuration(r.duration) : '--'}</td>
                                        <td>
                                            <button class="btn btn-xs" onclick="EngineMediaPage._pixeraInfo(${r.handle || 0})" title="Info"><i class="fas fa-info-circle"></i></button>
                                            <button class="btn btn-xs btn-danger" onclick="EngineMediaPage._pixeraDelete(${r.handle || 0})" title="Delete"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-folder-open"></i> Resources</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} items</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">
                        ${filtered.map(r => {
                            const name = r.name || r.path || 'Unnamed';
                            const ext = name.split('.').pop().toLowerCase();
                            const icon = this._pixeraFileIcon(ext);
                            return `<div class="media-card" onclick="EngineMediaPage._pixeraInfo(${r.handle || 0})">
                                <div class="media-thumb">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="media-info">
                                    <div class="media-name" title="${UI.esc(name)}">${UI.esc(name)}</div>
                                    <div class="media-meta">
                                        <span>${r.width && r.height ? `${r.width}x${r.height}` : ''}</span>
                                        <span>${r.duration ? UI.formatDuration(r.duration) : ''}</span>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },

    _pixeraFileIcon(ext) {
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'mxf', 'prores'];
        const imageExts = ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'tga', 'exr', 'psd'];
        const audioExts = ['wav', 'mp3', 'aac', 'ogg', 'flac', 'aiff'];
        if (videoExts.includes(ext)) return 'fa-film';
        if (imageExts.includes(ext)) return 'fa-image';
        if (audioExts.includes(ext)) return 'fa-music';
        return 'fa-file';
    },

    async _pixeraInfo(handle) {
        if (!handle) return;
        try {
            const info = await pixeraAPI.getResourceInfo(handle);
            UI.openModal('Resource Info', `
                <table>
                    <tr><td class="text-muted">Name</td><td>${UI.esc(info.name || '--')}</td></tr>
                    <tr><td class="text-muted">Path</td><td style="font-size:11px;word-break:break-all;">${UI.esc(info.path || info.filePath || '--')}</td></tr>
                    <tr><td class="text-muted">Resolution</td><td class="mono">${info.width && info.height ? `${info.width}x${info.height}` : '--'}</td></tr>
                    <tr><td class="text-muted">Duration</td><td>${info.duration ? UI.formatDuration(info.duration) : '--'}</td></tr>
                    <tr><td class="text-muted">FPS</td><td class="mono">${info.fps || '--'}</td></tr>
                    <tr><td class="text-muted">Codec</td><td class="mono">${UI.esc(info.codec || '--')}</td></tr>
                    <tr><td class="text-muted">Handle</td><td class="mono" style="font-size:10px;">${handle}</td></tr>
                </table>
            `, `<button class="btn" onclick="UI.closeModal()">Close</button>
                <button class="btn btn-danger" onclick="UI.closeModal();EngineMediaPage._pixeraDelete(${handle})">Delete</button>`);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _pixeraImport() {
        UI.openModal('Import Resource', `
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Enter the full file path on the Pixera server to import.</p>
            <input class="form-control" id="em-pixera-import-path" placeholder="/path/to/media/file.mp4" style="width:100%;">
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="EngineMediaPage._doPixeraImport()">Import</button>`);
    },

    async _doPixeraImport() {
        const path = document.getElementById('em-pixera-import-path')?.value;
        if (!path) { UI.toast('Please enter a file path', 'warning'); return; }
        UI.closeModal();
        try {
            await pixeraAPI.importResource(path);
            UI.toast('Resource imported', 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _pixeraDelete(handle) {
        const ok = await UI.confirm('Delete Resource', 'Permanently delete this resource from the Pixera project?');
        if (!ok) return;
        try {
            await pixeraAPI.deleteResource(handle);
            UI.toast('Resource deleted', 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // ATEM
    // ================================================================

    _renderAtem() {
        return `
            ${this._header('ATEM Media Pool', 'fa-images',
                '<button class="btn btn-sm btn-primary" onclick="EngineMediaPage._atemUpload()"><i class="fas fa-cloud-upload-alt"></i> Upload Still</button>'
            )}
            ${this._searchBar()}
            <div id="em-media-container">${this._atemMediaGrid()}</div>`;
    },

    _atemMediaGrid() {
        const atemState = appState.get('atemState') || {};
        const pool = atemState.mediaPool || {};
        const stills = pool.stills || [];
        const filtered = this._applySearch(stills, s => s.name || s.fileName || `Slot ${s.slot || s.index || '?'}`);

        if (!filtered.length) {
            return `
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-images"></i> Media Pool Stills</h3></div>
                    <div class="card-body">
                        ${UI.empty('fa-images', 'No Stills', 'The ATEM media pool is empty or has not been loaded. Upload stills to populate slots.')}
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:12px;">
                            ${Array.from({length: 20}, (_, i) => `
                                <div style="border:1px dashed var(--border-color);border-radius:var(--radius);padding:16px;text-align:center;opacity:0.4;">
                                    <i class="fas fa-plus" style="font-size:18px;display:block;margin-bottom:4px;"></i>
                                    <span style="font-size:10px;">Slot ${i + 1}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
        }

        if (this._view === 'list') {
            return `
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-images"></i> Media Pool Stills</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} stills</span></div>
                    <div class="card-body">
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>Slot</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>${filtered.map(s => {
                                    const slot = s.slot ?? s.index ?? '?';
                                    const name = s.name || s.fileName || `Still ${slot}`;
                                    const loaded = s.isUsed || s.loaded || s.name;
                                    return `<tr>
                                        <td class="mono">${slot}</td>
                                        <td><strong>${UI.esc(name)}</strong></td>
                                        <td>${loaded ? UI.badge('Loaded', 'green') : UI.badge('Empty', 'orange')}</td>
                                        <td>
                                            <button class="btn btn-xs btn-danger" onclick="EngineMediaPage._atemClearSlot(${slot})" title="Clear slot"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-images"></i> Media Pool Stills</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} stills</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
                        ${filtered.map(s => {
                            const slot = s.slot ?? s.index ?? '?';
                            const name = s.name || s.fileName || `Still ${slot}`;
                            const loaded = s.isUsed || s.loaded || s.name;
                            return `<div class="media-card" onclick="EngineMediaPage._atemPreviewSlot(${slot})">
                                <div class="media-thumb">
                                    <i class="fas ${loaded ? 'fa-image' : 'fa-plus'}" style="${loaded ? '' : 'opacity:0.3'}"></i>
                                    <span class="media-type-badge">Slot ${slot}</span>
                                </div>
                                <div class="media-info">
                                    <div class="media-name">${UI.esc(name)}</div>
                                    <div class="media-meta">
                                        ${loaded ? UI.badge('Loaded', 'green') : '<span class="text-muted">Empty</span>'}
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },

    _atemUpload() {
        UI.openModal('Upload Still to ATEM', `
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Select a slot and choose an image to upload to the ATEM media pool.</p>
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:600;">Target Slot:</span>
                <input type="number" class="form-control" id="em-atem-slot" value="1" min="1" max="32" style="width:80px;">
            </div>
            <div class="upload-area" onclick="document.getElementById('em-atem-file').click()">
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Click to select image</h3>
                <p>PNG or JPEG, 1920x1080 recommended</p>
            </div>
            <input type="file" id="em-atem-file" style="display:none" accept="image/*" onchange="EngineMediaPage._doAtemUpload(this.files)">
        `);
    },

    async _doAtemUpload(files) {
        if (!files || !files.length) return;
        const slot = parseInt(document.getElementById('em-atem-slot')?.value || '1');
        UI.closeModal();
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    await atemAPI.uploadStill(slot, reader.result);
                    UI.toast(`Still uploaded to slot ${slot}`, 'success');
                    this.refresh();
                } catch (e) { UI.toast(e.message, 'error'); }
            };
            reader.readAsDataURL(files[0]);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _atemClearSlot(slot) {
        const ok = await UI.confirm('Clear Slot', `Clear media pool slot ${slot}?`);
        if (!ok) return;
        try {
            await atemAPI.clearMediaSlot(slot);
            UI.toast(`Slot ${slot} cleared`, 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    _atemPreviewSlot(slot) {
        UI.openModal('Media Pool Slot', `
            <div style="text-align:center;padding:16px;">
                <i class="fas fa-image" style="font-size:48px;opacity:0.3;margin-bottom:12px;display:block;"></i>
                <h3>Slot ${slot}</h3>
                <p class="text-muted" style="font-size:12px;">ATEM media pool preview is not available via API.</p>
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Close</button>
            <button class="btn btn-danger" onclick="UI.closeModal();EngineMediaPage._atemClearSlot(${slot})">Clear Slot</button>`);
    },

    // ================================================================
    // vMix
    // ================================================================

    _renderVmix() {
        return `
            ${this._header('vMix Inputs', 'fa-video',
                '<button class="btn btn-sm btn-primary" onclick="EngineMediaPage._vmixAddInput()"><i class="fas fa-plus"></i> Add Input</button>'
            )}
            ${this._searchBar()}
            <div id="em-media-container">${this._vmixInputGrid()}</div>`;
    },

    _vmixInputGrid() {
        const vs = appState.get('vmixState') || {};
        const inputs = vs.inputs || [];
        const filtered = this._applySearch(inputs, i => i.name || i.title || '');

        if (!filtered.length) {
            return UI.empty('fa-video', 'No Inputs', 'No vMix inputs found. Add inputs to get started.');
        }

        if (this._view === 'list') {
            return `
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-video"></i> Inputs</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} inputs</span></div>
                    <div class="card-body">
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>#</th><th>Name</th><th>Type</th><th>State</th><th>Actions</th></tr></thead>
                                <tbody>${filtered.map(inp => {
                                    const name = inp.name || inp.title || `Input ${inp.number}`;
                                    const type = inp.type || '--';
                                    const state = inp.state || '';
                                    return `<tr>
                                        <td class="mono">${inp.number || inp.key || '--'}</td>
                                        <td><strong>${UI.esc(name)}</strong></td>
                                        <td class="mono" style="font-size:11px;">${UI.esc(type)}</td>
                                        <td>${state === 'Running' ? UI.badge('Running', 'green') : (state ? UI.badge(state, 'orange') : '--')}</td>
                                        <td>
                                            <button class="btn btn-xs btn-accent" onclick="EngineMediaPage._vmixPreview(${inp.number || inp.key})" title="Preview"><i class="fas fa-eye"></i></button>
                                            <button class="btn btn-xs btn-danger" onclick="EngineMediaPage._vmixRemoveInput(${inp.number || inp.key})" title="Remove"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-video"></i> Inputs</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} inputs</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
                        ${filtered.map(inp => {
                            const name = inp.name || inp.title || `Input ${inp.number}`;
                            const type = inp.type || '--';
                            const icon = this._vmixTypeIcon(type);
                            const state = inp.state || '';
                            return `<div class="media-card" onclick="EngineMediaPage._vmixPreview(${inp.number || inp.key})">
                                <div class="media-thumb">
                                    <i class="fas ${icon}"></i>
                                    <span class="media-type-badge">${UI.esc(type)}</span>
                                </div>
                                <div class="media-info">
                                    <div class="media-name">${UI.esc(name)}</div>
                                    <div class="media-meta">
                                        <span class="mono" style="font-size:10px;">#${inp.number || inp.key || '?'}</span>
                                        ${state === 'Running' ? UI.badge('Live', 'green') : ''}
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },

    _vmixTypeIcon(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('video') || t.includes('avi') || t.includes('mp4')) return 'fa-film';
        if (t.includes('image') || t.includes('photo')) return 'fa-image';
        if (t.includes('audio')) return 'fa-music';
        if (t.includes('camera') || t.includes('capture')) return 'fa-camera';
        if (t.includes('ndi')) return 'fa-network-wired';
        if (t.includes('title') || t.includes('gt')) return 'fa-font';
        if (t.includes('colour') || t.includes('color')) return 'fa-palette';
        if (t.includes('browser')) return 'fa-globe';
        return 'fa-video';
    },

    _vmixAddInput() {
        UI.openModal('Add vMix Input', `
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Enter the file path or URL to add as a new vMix input.</p>
            <select class="form-control" id="em-vmix-type" style="margin-bottom:8px;">
                <option value="Video">Video</option>
                <option value="Image">Image</option>
                <option value="AudioFile">Audio File</option>
                <option value="Colour">Colour</option>
                <option value="Browser">Browser</option>
                <option value="NDI">NDI</option>
            </select>
            <input class="form-control" id="em-vmix-path" placeholder="File path or URL" style="width:100%;">
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="EngineMediaPage._doVmixAdd()">Add</button>`);
    },

    async _doVmixAdd() {
        const type = document.getElementById('em-vmix-type')?.value || 'Video';
        const path = document.getElementById('em-vmix-path')?.value;
        if (!path) { UI.toast('Please enter a path or URL', 'warning'); return; }
        UI.closeModal();
        try {
            await vmixAPI.addInput(type, path);
            UI.toast(`Input added: ${type}`, 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _vmixPreview(num) {
        try {
            await vmixAPI.setPreview(num);
            UI.toast(`Input ${num} sent to Preview`, 'info');
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _vmixRemoveInput(num) {
        const ok = await UI.confirm('Remove Input', `Remove input #${num} from vMix?`);
        if (!ok) return;
        try {
            await vmixAPI.removeInput(num);
            UI.toast(`Input ${num} removed`, 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // OBS
    // ================================================================

    _renderObs() {
        return `
            ${this._header('OBS Sources & Inputs', 'fa-broadcast-tower',
                '<button class="btn btn-sm btn-primary" onclick="EngineMediaPage._obsCreateInput()"><i class="fas fa-plus"></i> Create Input</button>'
            )}
            ${this._searchBar()}
            <div id="em-media-container">${this._obsInputGrid()}</div>`;
    },

    _obsInputGrid() {
        const rawInputs = appState.get('obsInputs') || [];
        const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
        const filtered = this._applySearch(inputs, i => i.inputName || i.name || '');

        if (!filtered.length) {
            return UI.empty('fa-broadcast-tower', 'No Inputs', 'No OBS inputs found. Create sources in OBS or use the Create Input button.');
        }

        if (this._view === 'list') {
            return `
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-broadcast-tower"></i> Inputs</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} inputs</span></div>
                    <div class="card-body">
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>Name</th><th>Kind</th><th>Muted</th><th>Volume</th><th>Actions</th></tr></thead>
                                <tbody>${filtered.map(inp => {
                                    const name = inp.inputName || inp.name || 'Unnamed';
                                    const kind = inp.inputKind || inp.kind || '--';
                                    const muted = inp.inputMuted ?? inp.muted ?? false;
                                    return `<tr>
                                        <td><strong>${UI.esc(name)}</strong></td>
                                        <td class="mono" style="font-size:11px;">${UI.esc(kind)}</td>
                                        <td>${muted ? UI.badge('Muted', 'red') : UI.badge('On', 'green')}</td>
                                        <td><input type="range" min="0" max="100" value="${Math.round((inp.inputVolume ?? inp.volume ?? 1) * 100)}" style="width:60px;accent-color:var(--accent);"
                                            oninput="EngineMediaPage._obsSetVolume('${UI.esc(name)}', this.value/100)"></td>
                                        <td>
                                            <button class="btn btn-xs" onclick="EngineMediaPage._obsToggleMute('${UI.esc(name)}')" title="Toggle mute"><i class="fas fa-volume-mute"></i></button>
                                            <button class="btn btn-xs btn-danger" onclick="EngineMediaPage._obsRemoveInput('${UI.esc(name)}')" title="Remove"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>`;
                                }).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-broadcast-tower"></i> Inputs</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} inputs</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
                        ${filtered.map(inp => {
                            const name = inp.inputName || inp.name || 'Unnamed';
                            const kind = inp.inputKind || inp.kind || '--';
                            const muted = inp.inputMuted ?? inp.muted ?? false;
                            const icon = this._obsKindIcon(kind);
                            return `<div class="media-card" onclick="EngineMediaPage._obsToggleMute('${UI.esc(name)}')">
                                <div class="media-thumb">
                                    <i class="fas ${icon}"></i>
                                    <span class="media-type-badge">${UI.esc(kind.replace(/_/g, ' ').replace(/obs_|_v2|_source/gi, ''))}</span>
                                </div>
                                <div class="media-info">
                                    <div class="media-name">${UI.esc(name)}</div>
                                    <div class="media-meta">
                                        ${muted ? UI.badge('Muted', 'red') : UI.badge('On', 'green')}
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },

    _obsKindIcon(kind) {
        const k = (kind || '').toLowerCase();
        if (k.includes('video') || k.includes('capture') || k.includes('camera') || k.includes('dshow')) return 'fa-camera';
        if (k.includes('image')) return 'fa-image';
        if (k.includes('audio') || k.includes('wasapi') || k.includes('pulse')) return 'fa-music';
        if (k.includes('browser')) return 'fa-globe';
        if (k.includes('text') || k.includes('freetype')) return 'fa-font';
        if (k.includes('display') || k.includes('monitor') || k.includes('screen')) return 'fa-desktop';
        if (k.includes('window')) return 'fa-window-maximize';
        if (k.includes('ndi')) return 'fa-network-wired';
        if (k.includes('color') || k.includes('colour')) return 'fa-palette';
        if (k.includes('media') || k.includes('ffmpeg') || k.includes('vlc')) return 'fa-film';
        return 'fa-plug';
    },

    _obsCreateInput() {
        UI.openModal('Create OBS Input', `
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Create a new input source in OBS.</p>
            <div style="display:grid;gap:8px;">
                <input class="form-control" id="em-obs-name" placeholder="Input name">
                <select class="form-control" id="em-obs-kind">
                    <option value="browser_source">Browser Source</option>
                    <option value="ffmpeg_source">Media Source (FFmpeg)</option>
                    <option value="image_source">Image</option>
                    <option value="color_source_v3">Color Source</option>
                    <option value="text_gdiplus_v3">Text (GDI+)</option>
                    <option value="dshow_input">Video Capture Device</option>
                    <option value="wasapi_input_capture_v2">Audio Input Capture</option>
                    <option value="monitor_capture">Display Capture</option>
                    <option value="window_capture">Window Capture</option>
                </select>
                <input class="form-control" id="em-obs-scene" placeholder="Scene name (optional, adds to scene)">
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="EngineMediaPage._doObsCreate()">Create</button>`);
    },

    async _doObsCreate() {
        const name = document.getElementById('em-obs-name')?.value;
        const kind = document.getElementById('em-obs-kind')?.value;
        const scene = document.getElementById('em-obs-scene')?.value;
        if (!name) { UI.toast('Please enter an input name', 'warning'); return; }
        UI.closeModal();
        try {
            await obsAPI.createInput(name, kind, scene || undefined);
            UI.toast(`Input "${name}" created`, 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _obsToggleMute(name) {
        try {
            const rawInputs = appState.get('obsInputs') || [];
            const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
            const inp = inputs.find(i => (i.inputName || i.name) === name);
            const muted = inp?.inputMuted ?? inp?.muted ?? false;
            await obsAPI.setMuted(name, !muted);
            UI.toast(`${name}: ${muted ? 'Unmuted' : 'Muted'}`, 'info');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _obsSetVolume(name, vol) {
        try { await obsAPI.setVolume(name, vol); } catch (e) { UI.toast(e.message, 'error'); }
    },

    async _obsRemoveInput(name) {
        const ok = await UI.confirm('Remove Input', `Remove input "${name}" from OBS?`);
        if (!ok) return;
        try {
            await obsAPI.removeInput(name);
            UI.toast(`Input "${name}" removed`, 'success');
            this.refresh();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    // ================================================================
    // RESOLUME
    // ================================================================

    _renderResolume() {
        return `
            ${this._header('Resolume Composition Media', 'fa-th')}
            ${this._searchBar()}
            <div id="em-media-container">${this._resolumeClipGrid()}</div>`;
    },

    _resolumeClipGrid() {
        const comp = appState.get('composition');
        if (!comp || !comp.layers) {
            return UI.empty('fa-th', 'No Composition', 'Connect to Resolume Arena to browse composition clips.');
        }

        const layers = comp.layers || [];
        let allClips = [];
        layers.forEach((layer, li) => {
            const clips = layer.clips || [];
            clips.forEach((clip, ci) => {
                if (clip && clip.name && clip.name.value) {
                    allClips.push({
                        name: clip.name.value,
                        layerIndex: li + 1,
                        clipIndex: ci + 1,
                        connected: clip.connected?.value || false,
                        thumbnail: clip.thumbnail?.id || null,
                        layerName: layer.name?.value || `Layer ${li + 1}`,
                    });
                }
            });
        });

        const filtered = this._applySearch(allClips, c => c.name);

        if (!filtered.length) {
            return UI.empty('fa-th', 'No Clips', 'No clips found in the Resolume composition.');
        }

        if (this._view === 'list') {
            return `
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-th"></i> Composition Clips</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} clips</span></div>
                    <div class="card-body">
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>Name</th><th>Layer</th><th>Clip #</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>${filtered.map(c => `<tr>
                                    <td><strong>${UI.esc(c.name)}</strong></td>
                                    <td>${UI.esc(c.layerName)}</td>
                                    <td class="mono">${c.clipIndex}</td>
                                    <td>${c.connected ? UI.badge('Connected', 'green') : UI.badge('Idle', 'orange')}</td>
                                    <td>
                                        <button class="btn btn-xs btn-accent" onclick="EngineMediaPage._resolumeConnect(${c.layerIndex},${c.clipIndex})" title="Trigger"><i class="fas fa-play"></i></button>
                                    </td>
                                </tr>`).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-th"></i> Composition Clips</h3><span class="mono text-muted" style="font-size:11px;">${filtered.length} clips</span></div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
                        ${filtered.map(c => `
                            <div class="media-card ${c.connected ? 'media-card--active' : ''}"
                                 onclick="EngineMediaPage._resolumePreviewClip(${c.layerIndex},${c.clipIndex},'${UI.esc(c.name)}')"
                                 ondblclick="EngineMediaPage._resolumeConnect(${c.layerIndex},${c.clipIndex})">
                                <div class="media-thumb" style="${c.connected ? 'border-color:var(--green);' : ''}">
                                    ${c.thumbnail ? `<img src="/api/v1/composition/layers/${c.layerIndex}/clips/${c.clipIndex}/thumbnail" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">` : ''}
                                    <i class="fas fa-film" style="${c.thumbnail ? 'display:none' : ''}"></i>
                                </div>
                                <div class="media-info">
                                    <div class="media-name" title="${UI.esc(c.name)}">${UI.esc(c.name)}</div>
                                    <div class="media-meta">
                                        <span style="font-size:9px;">${UI.esc(c.layerName)}</span>
                                        ${c.connected ? UI.badge('Live', 'green') : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    },

    async _resolumeConnect(layer, clip) {
        try {
            await resolumeAPI.connectClip(layer, clip);
            UI.toast(`Clip ${layer}/${clip} triggered`, 'success');
            setTimeout(() => this.refresh(), 200);
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    _resolumePreviewClip(layer, clip, name) {
        UI.openModal('Clip Preview', `
            <div style="text-align:center;padding:16px;">
                <i class="fas fa-film" style="font-size:48px;opacity:0.3;margin-bottom:12px;display:block;"></i>
                <h3>${UI.esc(name)}</h3>
                <p class="text-muted" style="font-size:12px;">Layer ${layer}, Clip ${clip}</p>
            </div>
        `, `<button class="btn" onclick="UI.closeModal()">Close</button>
            <button class="btn btn-accent" onclick="UI.closeModal();EngineMediaPage._resolumeConnect(${layer},${clip})"><i class="fas fa-play"></i> Trigger</button>`);
    },

    // ================================================================
    // UNSUPPORTED ENGINES (Disguise, Barco, QLab)
    // ================================================================

    _renderUnsupported(serverType) {
        const names = { disguise: 'Disguise (d3)', barco: 'Barco EventMaster', qlab: 'QLab' };
        const displayName = names[serverType] || serverType;
        const explanations = {
            disguise: 'Disguise manages media through its own project system. Use the Disguise Designer application to import, organize, and manage media assets.',
            barco:    'Barco EventMaster does not expose media management through its API. Use the EventMaster Toolset software to manage presets and screen content.',
            qlab:     'QLab manages media cues within its workspace. Use the QLab application to add, organize, and configure media cues.',
        };

        return `
            ${this._header(`${displayName} Media`, 'fa-info-circle')}
            <div class="card">
                <div class="card-body" style="text-align:center;padding:48px 24px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--yellow);margin-bottom:16px;display:block;"></i>
                    <h3 style="margin-bottom:8px;">Media Management Not Available via API</h3>
                    <p style="color:var(--text-muted);max-width:480px;margin:0 auto 16px;">
                        ${explanations[serverType] || 'This engine does not support remote media management through its API.'}
                    </p>
                    <p style="font-size:12px;color:var(--text-muted);">
                        Other pages such as Dashboard and Show Run provide playback control for ${UI.esc(displayName)}.
                    </p>
                </div>
            </div>`;
    },

    // ================================================================
    // REFRESH / LIFECYCLE
    // ================================================================

    async refresh() {
        const serverType = appState.get('serverType') || '';
        try {
            switch (serverType) {
                case 'casparcg': {
                    const [media, templates, channels] = await Promise.all([
                        casparcgAPI.getMedia().catch(() => []),
                        casparcgAPI.getTemplates().catch(() => []),
                        casparcgAPI.getChannels().catch(() => []),
                    ]);
                    appState.set('casparcgMedia', media);
                    appState.set('casparcgTemplates', templates);
                    appState.set('casparcgChannels', channels);
                    break;
                }
                case 'pixera': {
                    const pState = await pixeraAPI.getState().catch(() => null);
                    if (pState) appState.set('pixeraState', pState);
                    break;
                }
                case 'atem': {
                    const atemState = await atemAPI.getState().catch(() => null);
                    if (atemState) appState.set('atemState', atemState);
                    break;
                }
                case 'vmix': {
                    // vMix state is polled by the main app loop
                    break;
                }
                case 'obs': {
                    // OBS inputs are polled by the main app loop
                    break;
                }
                case 'resolume': {
                    const comp = await resolumeAPI.getComposition().catch(() => null);
                    if (comp) appState.set('composition', comp);
                    break;
                }
            }
        } catch (e) {
            UI.toast('Refresh failed: ' + e.message, 'error');
        }

        // Re-render the media container
        const c = document.getElementById('em-media-container');
        if (c) c.innerHTML = this._renderCurrentItems();
    },

    onActivate() {
        this.refresh();
    },

    onDeactivate() {
        this._search = '';
    },
};
