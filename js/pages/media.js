/**
 * Media Page — Browse, upload, manage media files & media map
 * Uses: GET /media, GET /media/map, GET /media/{id}, POST /media/upload,
 *       GET /media/thumb/{id}, DELETE /media/delete/{id}, etc.
 */
const MediaPage = {
    _view: 'grid',
    _search: '',
    _mediaDetails: {},

    render() {
        if (!appState.get('connected')) return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first');

        return `
            <div class="section-header">
                <h2><i class="fas fa-photo-video"></i> Media Library</h2>
                <div class="flex gap-sm">
                    <button class="btn btn-sm btn-primary" onclick="MediaPage.showUpload()"><i class="fas fa-cloud-upload-alt"></i> Upload</button>
                    <button class="btn btn-sm btn-accent" onclick="MediaPage.syncMedia()"><i class="fas fa-sync-alt"></i> Sync to Network</button>
                    <button class="btn btn-sm btn-ghost" onclick="MediaPage.refresh()"><i class="fas fa-refresh"></i></button>
                </div>
            </div>

            ${UI.tabs([
                { id: 'library', label: 'Library', content: this._libraryTab() },
                { id: 'map', label: 'Media Map', content: this._mapTab() },
            ], 'library')}
        `;
    },

    _libraryTab() {
        return `
            <div class="media-toolbar">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input class="form-control" placeholder="Search media..." oninput="MediaPage.filterMedia(this.value)">
                </div>
                <div class="media-view-toggle">
                    <button class="media-view-btn ${this._view === 'grid' ? 'active' : ''}" onclick="MediaPage.setView('grid')"><i class="fas fa-th"></i></button>
                    <button class="media-view-btn ${this._view === 'list' ? 'active' : ''}" onclick="MediaPage.setView('list')"><i class="fas fa-list"></i></button>
                </div>
            </div>
            <div id="media-container">${this._renderMedia()}</div>
        `;
    },

    _mapTab() {
        const map = appState.get('mediaMap');
        if (!map || !map.entries || map.entries.length === 0) {
            return UI.empty('fa-map', 'Empty Media Map', 'No entries in the media map');
        }

        return `
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Index</th><th>Name</th><th>Media ID</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${map.entries.map(e => `
                            <tr>
                                <td><span class="mono">${e.index}</span></td>
                                <td>${UI.esc(e.name || '--')}</td>
                                <td><span class="mono" style="font-size:10px">${UI.esc(e.mediaID || '--')}</span></td>
                                <td>
                                    <button class="btn btn-xs" onclick="MediaPage.showDetail('${e.mediaID}')"><i class="fas fa-info-circle"></i></button>
                                    <button class="btn btn-xs btn-danger" onclick="MediaPage.deleteMapEntry(${e.index})"><i class="fas fa-unlink"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    _renderMedia() {
        const db = appState.get('mediaDatabase');
        if (!db) return UI.loading('Loading media...');

        let items = [];
        // MediaDatabaseInformationModel can have different structures; handle array or object
        if (Array.isArray(db)) items = db;
        else if (db.items) items = db.items;
        else if (db.media) items = db.media;

        if (this._search) {
            const q = this._search.toLowerCase();
            items = items.filter(m => (m.name || m.fileName || '').toLowerCase().includes(q));
        }

        if (items.length === 0) return UI.empty('fa-photo-video', 'No Media', 'No media files found');

        if (this._view === 'grid') {
            return `<div class="media-grid">${items.map(m => this._mediaCard(m)).join('')}</div>`;
        }

        return `
            <div class="table-wrapper">
                <table>
                    <thead><tr><th></th><th>Name</th><th>Type</th><th>Size</th><th>Resolution</th><th>Duration</th><th>Actions</th></tr></thead>
                    <tbody>${items.map(m => this._mediaRow(m)).join('')}</tbody>
                </table>
            </div>
        `;
    },

    _mediaCard(m) {
        const id = m.mediaID || m.iD || m.id || '';
        const name = m.name || m.fileName || 'Untitled';
        const type = m.fileType || '';
        const thumbUrl = id ? hippoAPI.getMediaThumbUrl(id) : '';

        return `
            <div class="media-card" onclick="MediaPage.showDetail('${id}')">
                <div class="media-thumb">
                    ${thumbUrl ? `<img src="${thumbUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">` : ''}
                    <i class="fas fa-film" style="${thumbUrl ? 'display:none' : ''}"></i>
                    ${type ? `<span class="media-type-badge">${UI.esc(type)}</span>` : ''}
                </div>
                <div class="media-info">
                    <div class="media-name">${UI.esc(name)}</div>
                    <div class="media-meta">
                        <span>${m.width && m.height ? `${m.width}x${m.height}` : '--'}</span>
                        <span>${m.fileSize ? UI.formatBytes(m.fileSize) : ''}</span>
                    </div>
                </div>
            </div>
        `;
    },

    _mediaRow(m) {
        const id = m.mediaID || m.iD || m.id || '';
        const name = m.name || m.fileName || 'Untitled';
        return `
            <tr>
                <td style="width:40px"><img src="${hippoAPI.getMediaThumbUrl(id)}" style="width:36px;height:20px;object-fit:cover;border-radius:2px" onerror="this.src=''"></td>
                <td>${UI.esc(name)}</td>
                <td><span class="mono" style="font-size:11px">${UI.esc(m.fileType || '--')}</span></td>
                <td>${m.fileSize ? UI.formatBytes(m.fileSize) : '--'}</td>
                <td class="mono">${m.width && m.height ? `${m.width}x${m.height}` : '--'}</td>
                <td>${m.duration ? UI.formatDuration(m.duration) : '--'}</td>
                <td>
                    <button class="btn btn-xs" onclick="MediaPage.showDetail('${id}')"><i class="fas fa-info-circle"></i></button>
                    <button class="btn btn-xs btn-danger" onclick="MediaPage.deleteMedia('${id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    },

    async showDetail(mediaID) {
        if (!mediaID) return;
        try {
            const info = await hippoAPI.getMediaById(mediaID);
            const thumbUrl = hippoAPI.getMediaThumbUrl(mediaID);
            UI.openModal('Media Detail', `
                <div style="text-align:center;margin-bottom:12px">
                    <img src="${thumbUrl}" style="max-width:100%;max-height:200px;border-radius:var(--radius-md);background:var(--bg-tertiary)" onerror="this.style.display='none'">
                </div>
                <table>
                    <tr><td class="text-muted">File</td><td>${UI.esc(info.fileName)}</td></tr>
                    <tr><td class="text-muted">Type</td><td>${UI.esc(info.fileType)}</td></tr>
                    <tr><td class="text-muted">Resolution</td><td class="mono">${info.width}x${info.height}</td></tr>
                    <tr><td class="text-muted">FPS</td><td class="mono">${info.fps || '--'}</td></tr>
                    <tr><td class="text-muted">Duration</td><td>${UI.formatDuration(info.duration)} (${info.durationFrames || 0} frames)</td></tr>
                    <tr><td class="text-muted">Size</td><td>${UI.formatBytes(info.fileSize)}</td></tr>
                    <tr><td class="text-muted">Aspect</td><td class="mono">${info.aspectRatio?.toFixed(3) || '--'}</td></tr>
                    <tr><td class="text-muted">Alpha</td><td>${info.hasAlpha ? UI.badge('Yes', 'green') : 'No'}</td></tr>
                    <tr><td class="text-muted">Audio</td><td>${info.audioChannels ? `${info.audioChannels}ch @ ${info.audioSampleRate}Hz` : 'None'}</td></tr>
                    <tr><td class="text-muted">Map Indexes</td><td class="mono">${(info.mapIndexes || []).join(', ') || 'None'}</td></tr>
                    <tr><td class="text-muted">Uploaded</td><td>${info.timeUploaded || '--'}</td></tr>
                    <tr><td class="text-muted">ID</td><td class="mono" style="font-size:10px">${UI.esc(info.iD)}</td></tr>
                    <tr><td class="text-muted">Deletable</td><td>${info.canBeDeleted ? 'Yes' : 'No'}</td></tr>
                </table>
            `, `<button class="btn" onclick="UI.closeModal()">Close</button>
                ${info.canBeDeleted ? `<button class="btn btn-danger" onclick="UI.closeModal();setTimeout(()=>MediaPage.deleteMedia('${info.iD}'),100)">Delete</button>` : ''}`);
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    showUpload() {
        UI.openModal('Upload Media', `
            <div class="upload-area" id="upload-drop-zone" onclick="document.getElementById('upload-file-input').click()">
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Drop files here or click to browse</h3>
                <p>Supported: Video, Image, Audio files</p>
            </div>
            <input type="file" id="upload-file-input" style="display:none" multiple accept="video/*,image/*,audio/*" onchange="MediaPage.handleFileSelect(this.files)">
            ${UI.formGroup('ADD TO MAP', UI.toggle('upload-add-map', true), 'Automatically add to media map')}
            ${UI.formGroup('CUSTOM FOLDER', '<input class="form-control" id="upload-folder" placeholder="Optional subfolder path">')}
            <div id="upload-progress-list" class="upload-progress-list"></div>
        `);

        // Set up drag and drop
        setTimeout(() => {
            const zone = document.getElementById('upload-drop-zone');
            if (!zone) return;
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
            zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.handleFileSelect(e.dataTransfer.files); });
        }, 100);
    },

    async handleFileSelect(files) {
        const list = document.getElementById('upload-progress-list');
        const addToMap = document.getElementById('upload-add-map')?.checked ?? true;
        const folder = document.getElementById('upload-folder')?.value || '';

        for (const file of files) {
            const itemId = 'up-' + Date.now();
            list.innerHTML += `<div class="upload-item" id="${itemId}"><span class="upload-item-name">${UI.esc(file.name)}</span><div class="upload-item-progress">${UI.progressBar(0, 'accent')}</div><span class="upload-item-status">0%</span></div>`;

            try {
                const result = await hippoAPI.uploadMedia(file, { addToMap, customFolderPath: folder });
                const el = document.getElementById(itemId);
                if (el) {
                    el.querySelector('.upload-item-progress').innerHTML = UI.progressBar(100, 'green');
                    el.querySelector('.upload-item-status').textContent = 'Done';
                    el.querySelector('.upload-item-status').style.color = 'var(--green)';
                }
                appState.log('INFO', `Uploaded: ${file.name} → ${result?.mediaID || 'OK'}`, 'Media');
                UI.toast(`Uploaded ${file.name}`, 'success');
            } catch(e) {
                const el = document.getElementById(itemId);
                if (el) {
                    el.querySelector('.upload-item-progress').innerHTML = UI.progressBar(100, 'red');
                    el.querySelector('.upload-item-status').textContent = 'Error';
                    el.querySelector('.upload-item-status').style.color = 'var(--red)';
                }
                UI.toast(`Upload failed: ${file.name} — ${e.message}`, 'error');
            }
        }

        this.refresh();
    },

    async deleteMedia(mediaID) {
        const ok = await UI.confirm('Delete Media', 'Permanently delete this media file?');
        if (!ok) return;
        try {
            await hippoAPI.deleteMedia(mediaID);
            UI.toast('Media deleted', 'success');
            appState.log('INFO', `Deleted media ${mediaID}`, 'Media');
            this.refresh();
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async deleteMapEntry(mapIndex) {
        const ok = await UI.confirm('Remove Map Entry', 'Remove this entry from the media map? (File will not be deleted)');
        if (!ok) return;
        try {
            await hippoAPI.deleteMapEntry(mapIndex);
            UI.toast('Map entry removed', 'success');
            this.refresh();
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async syncMedia() {
        try {
            await hippoAPI.syncMedia();
            UI.toast('Media sync started', 'success');
            appState.log('INFO', 'Media sync triggered', 'Media');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    setView(v) {
        this._view = v;
        const c = document.getElementById('media-container');
        if (c) c.innerHTML = this._renderMedia();
        document.querySelectorAll('.media-view-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(v === 'grid' ? '□' : '≡') || false));
    },

    filterMedia: UI.debounce(function(q) {
        MediaPage._search = q;
        const c = document.getElementById('media-container');
        if (c) c.innerHTML = MediaPage._renderMedia();
    }, 200),

    async refresh() {
        try {
            const [db, map] = await Promise.all([hippoAPI.getMedia(), hippoAPI.getMediaMap()]);
            appState.set('mediaDatabase', db);
            appState.set('mediaMap', map);
            const c = document.getElementById('media-container');
            if (c) c.innerHTML = this._renderMedia();
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    onActivate() { this.refresh(); },
};
