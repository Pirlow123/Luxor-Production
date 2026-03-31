/**
 * In-Browser Virtual Hippotizer — Intercepts fetch & WebSocket for demo mode
 * When a server is marked as virtual, all API calls are handled locally in the browser
 * with realistic demo data. No external server needed.
 */
const VirtualHippo = (() => {

    // ================================================================
    // DEMO DATA
    // ================================================================
    function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }

    const SERVER_INFO = {
        computerName: 'VIRTUAL-HIPPO-01',
        engineStatus: 'Running',
        hostName: 'virtual-hippo.local',
        iP: '127.0.0.1',
        mediaManagerStatus: 'Running',
        product: 'Hippotizer Karst+ (Virtual)',
        productFamily: 'Hippotizer V4',
        registeredOwner: 'Luxor Demo',
        softwareRevision: 'Build 9999 (Virtual)',
        softwareVersion: '4.8.1-virtual',
        mixes: [
            { fXCName: 'FXC_Mix1', hasLayers: true, index: 0, layerCount: 8, mixType: 'Standard', name: 'Main Stage' },
            { fXCName: 'FXC_Mix2', hasLayers: true, index: 1, layerCount: 4, mixType: 'Standard', name: 'LED Wall' },
            { fXCName: 'FXC_Mix3', hasLayers: true, index: 2, layerCount: 4, mixType: 'Standard', name: 'Floor Projection' },
            { fXCName: 'FXC_Mix4', hasLayers: true, index: 3, layerCount: 2, mixType: 'Aux', name: 'Confidence Monitor' },
        ],
    };

    const TIMELINES = [
        {
            iD: 0, name: 'Show Open', guid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            startTimeSecs: 0, endTimeSecs: 185.5,
            commands: [
                { cueNumber: 1, iD: 'cue-001', name: 'Blackout', timeSecs: 0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 2, iD: 'cue-002', name: 'Logo Reveal', timeSecs: 5.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 3, iD: 'cue-003', name: 'Intro Video', timeSecs: 15.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 4, iD: 'cue-004', name: 'Speaker Intro', timeSecs: 65.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 5, iD: 'cue-005', name: 'Full Stage Look', timeSecs: 120.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            ],
        },
        {
            iD: 1, name: 'Keynote Presentation', guid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            startTimeSecs: 0, endTimeSecs: 2400,
            commands: [
                { cueNumber: 1, iD: 'cue-101', name: 'Title Slide', timeSecs: 0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 2, iD: 'cue-102', name: 'Agenda', timeSecs: 30, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 3, iD: 'cue-103', name: 'Product Demo', timeSecs: 300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 4, iD: 'cue-104', name: 'Video Playback', timeSecs: 600, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 5, iD: 'cue-105', name: 'Q&A Background', timeSecs: 1200, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 6, iD: 'cue-106', name: 'Closing', timeSecs: 2100, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            ],
        },
        {
            iD: 2, name: 'Awards Ceremony', guid: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            startTimeSecs: 0, endTimeSecs: 3600,
            commands: [
                { cueNumber: 1, iD: 'cue-201', name: 'Walk-in Loop', timeSecs: 0, type: 'Cue', isJumpTargetSet: true, jumpTarget: 'cue-201' },
                { cueNumber: 2, iD: 'cue-202', name: 'Welcome', timeSecs: 60, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 3, iD: 'cue-203', name: 'Nominee VT 1', timeSecs: 300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 4, iD: 'cue-204', name: 'Winner Reveal', timeSecs: 450, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 5, iD: 'cue-205', name: 'Nominee VT 2', timeSecs: 900, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 6, iD: 'cue-206', name: 'Winner Reveal 2', timeSecs: 1050, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
                { cueNumber: 7, iD: 'cue-207', name: 'Finale', timeSecs: 3300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            ],
        },
        {
            iD: 3, name: 'Interval Loop', guid: 'd4e5f6a7-b8c9-0123-defa-234567890123',
            startTimeSecs: 0, endTimeSecs: 600,
            commands: [
                { cueNumber: 1, iD: 'cue-301', name: 'Sponsor Loop Start', timeSecs: 0, type: 'Cue', isJumpTargetSet: true, jumpTarget: 'cue-301' },
                { cueNumber: 2, iD: 'cue-302', name: 'Countdown 5min', timeSecs: 300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            ],
        },
    ];

    const MEDIA_ITEMS = [
        { iD: uuid(), fileName: 'show_open_v3.mov', name: 'Show Open V3', fileType: 'mov', fileSize: 524288000, width: 3840, height: 2160, fps: 50, duration: 185.5, durationFrames: 9275, aspectRatio: 1.778, hasAlpha: false, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/Show', timeUploaded: '2026-03-28T10:30:00Z', mapIndexes: [1] },
        { iD: uuid(), fileName: 'logo_reveal_4k.mov', name: 'Logo Reveal 4K', fileType: 'mov', fileSize: 156000000, width: 3840, height: 2160, fps: 50, duration: 12, durationFrames: 600, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Graphics', timeUploaded: '2026-03-28T10:35:00Z', mapIndexes: [2] },
        { iD: uuid(), fileName: 'keynote_bg_loop.mp4', name: 'Keynote BG Loop', fileType: 'mp4', fileSize: 89000000, width: 1920, height: 1080, fps: 25, duration: 30, durationFrames: 750, aspectRatio: 1.778, hasAlpha: false, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Backgrounds', timeUploaded: '2026-03-28T11:00:00Z', mapIndexes: [3] },
        { iD: uuid(), fileName: 'particle_overlay.mov', name: 'Particle Overlay', fileType: 'mov', fileSize: 210000000, width: 1920, height: 1080, fps: 50, duration: 20, durationFrames: 1000, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Effects', timeUploaded: '2026-03-28T11:05:00Z', mapIndexes: [4] },
        { iD: uuid(), fileName: 'awards_nominees_vt1.mp4', name: 'Nominees VT 1', fileType: 'mp4', fileSize: 1200000000, width: 3840, height: 2160, fps: 25, duration: 120, durationFrames: 3000, aspectRatio: 1.778, hasAlpha: false, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/VTs', timeUploaded: '2026-03-29T09:00:00Z', mapIndexes: [5] },
        { iD: uuid(), fileName: 'winner_sting.mov', name: 'Winner Sting', fileType: 'mov', fileSize: 45000000, width: 1920, height: 1080, fps: 50, duration: 5, durationFrames: 250, aspectRatio: 1.778, hasAlpha: true, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/Graphics', timeUploaded: '2026-03-29T09:10:00Z', mapIndexes: [6] },
        { iD: uuid(), fileName: 'sponsor_loop.mp4', name: 'Sponsor Loop', fileType: 'mp4', fileSize: 350000000, width: 1920, height: 1080, fps: 25, duration: 120, durationFrames: 3000, aspectRatio: 1.778, hasAlpha: false, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/Sponsors', timeUploaded: '2026-03-29T09:30:00Z', mapIndexes: [7] },
        { iD: uuid(), fileName: 'countdown_5min.mov', name: 'Countdown 5min', fileType: 'mov', fileSize: 180000000, width: 1920, height: 1080, fps: 25, duration: 300, durationFrames: 7500, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Graphics', timeUploaded: '2026-03-29T10:00:00Z', mapIndexes: [8] },
        { iD: uuid(), fileName: 'led_wall_abstract.mp4', name: 'LED Abstract', fileType: 'mp4', fileSize: 98000000, width: 2560, height: 720, fps: 50, duration: 60, durationFrames: 3000, aspectRatio: 3.556, hasAlpha: false, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/LED', timeUploaded: '2026-03-29T10:30:00Z', mapIndexes: [9] },
        { iD: uuid(), fileName: 'floor_map_grid.png', name: 'Floor Map Grid', fileType: 'png', fileSize: 5000000, width: 2048, height: 2048, fps: 0, duration: 0, durationFrames: 1, aspectRatio: 1.0, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Floor', timeUploaded: '2026-03-29T11:00:00Z', mapIndexes: [10] },
        { iD: uuid(), fileName: 'gradient_wash_blue.mp4', name: 'Gradient Blue', fileType: 'mp4', fileSize: 12000000, width: 1920, height: 1080, fps: 25, duration: 15, durationFrames: 375, aspectRatio: 1.778, hasAlpha: false, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Backgrounds', timeUploaded: '2026-03-30T08:00:00Z', mapIndexes: [11] },
        { iD: uuid(), fileName: 'confetti_overlay.mov', name: 'Confetti Overlay', fileType: 'mov', fileSize: 78000000, width: 1920, height: 1080, fps: 50, duration: 10, durationFrames: 500, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Effects', timeUploaded: '2026-03-30T08:15:00Z', mapIndexes: [12] },
    ];

    let MEDIA_MAP = {
        entries: MEDIA_ITEMS.map((m, i) => ({ index: i + 1, mediaID: m.iD, name: m.name })),
    };

    function makePresets(type) {
        const bankNames = ['Show Looks', 'Backgrounds', 'Effects', 'Transitions'];
        const slotNames = {
            'Show Looks': ['Blackout', 'Full Stage', 'Keynote Mode', 'Awards Mode', 'Walk-in', 'Interval', 'Finale', 'Emergency'],
            'Backgrounds': ['Blue Gradient', 'Dark Abstract', 'Particles', 'Corporate', 'Starfield', 'Warm Glow'],
            'Effects': ['Confetti', 'Starburst', 'Fade In', 'Fade Out', 'Cross Dissolve', 'Wipe Left'],
            'Transitions': ['Cut', 'Dip Black', 'Dip White', 'Dissolve 1s', 'Dissolve 2s', 'Dissolve 5s'],
        };
        return {
            bankCount: bankNames.length,
            presetType: type,
            banks: bankNames.map((name, bi) => ({
                hasPresets: true, index: bi, name, thumbPreset: '',
                presets: (slotNames[name] || []).map((pname, si) => ({
                    description: `${type} preset: ${pname}`,
                    fadeTime: type === 'mix' ? [0, 0, 0.5, 1, 2, 5][si % 6] : [0, 0.5, 1][si % 3],
                    fadeType: 'Linear', filters: '', iD: uuid(), index: si,
                    name: pname, presetType: type,
                })),
            })),
        };
    }

    const MIX_PRESETS = makePresets('mix');
    const LAYER_PRESETS = makePresets('layer');

    let mixLevels = { 0: 85, 1: 70, 2: 60, 3: 100 };
    let layerLevels = {};
    for (let m = 0; m < 4; m++) {
        const count = SERVER_INFO.mixes[m].layerCount;
        for (let l = 0; l < count; l++) {
            layerLevels[`${m}-${l}`] = Math.floor(Math.random() * 100);
        }
    }

    const PIN_VALUES = {
        'Engine': '1', 'Engine/Mix1': '1', 'Engine/Mix1/Layer1': '1',
        'Engine/Mix1/Layer1/Opacity': '78', 'Engine/Mix1/Layer1/Media': MEDIA_ITEMS[0].name,
        'Engine/Mix1/Layer1/PlayMode': 'Loop', 'Engine/Mix1/Layer1/Speed': '1.0',
        'Engine/Mix1/Layer1/PositionX': '0.5', 'Engine/Mix1/Layer1/PositionY': '0.5',
        'Engine/Mix1/Layer1/ScaleX': '1.0', 'Engine/Mix1/Layer1/ScaleY': '1.0',
        'Engine/Mix1/Layer1/Rotation': '0', 'Engine/Mix1/MasterLevel': '85',
        'Engine/Mix2': '1', 'Engine/Mix2/Layer1/Opacity': '70',
    };

    const PIN_INFO = {
        'Engine/Mix1/Layer1/Opacity': { dataType: 'Float', details: 'Range: 0-100', name: 'Opacity', pinType: 'Parameter' },
        'Engine/Mix1/Layer1/Speed': { dataType: 'Float', details: 'Range: -10 to 10', name: 'Speed', pinType: 'Parameter' },
        'Engine/Mix1/Layer1/PositionX': { dataType: 'Float', details: 'Range: 0-1', name: 'PositionX', pinType: 'Parameter' },
        'Engine/Mix1/Layer1/PositionY': { dataType: 'Float', details: 'Range: 0-1', name: 'PositionY', pinType: 'Parameter' },
        'Engine/Mix1/Layer1/ScaleX': { dataType: 'Float', details: 'Range: 0-10', name: 'ScaleX', pinType: 'Parameter' },
        'Engine/Mix1/Layer1/Rotation': { dataType: 'Float', details: 'Range: -360 to 360', name: 'Rotation', pinType: 'Parameter' },
        'Engine/Mix1/MasterLevel': { dataType: 'Int32', details: 'Range: 0-100', name: 'MasterLevel', pinType: 'Parameter' },
    };

    // 1x1 transparent PNG as data URL for thumbnails
    const THUMB_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==';

    // ================================================================
    // VIRTUAL WEBSOCKET — Fake WS that emits events
    // ================================================================
    let _wsListeners = {};
    let _wsInterval = null;

    class VirtualWebSocket {
        constructor() {
            this.readyState = 0; // CONNECTING
            this._handlers = { open: [], message: [], close: [], error: [] };
            // Simulate connection delay
            setTimeout(() => {
                this.readyState = 1; // OPEN
                this._emit('open', { type: 'open' });
                // Periodic heartbeat (silent — only used for connection keep-alive)
                _wsInterval = setInterval(() => {
                    if (this.readyState === 1) {
                        this._sendEvent('SYSTEM', 'SYSTEM_STATUS_CHANGED', 'Running');
                    }
                }, 60000); // Every 60s, not 15s
            }, 100);
        }

        addEventListener(type, fn) {
            if (this._handlers[type]) this._handlers[type].push(fn);
        }
        removeEventListener(type, fn) {
            if (this._handlers[type]) this._handlers[type] = this._handlers[type].filter(f => f !== fn);
        }
        set onopen(fn) { this._handlers.open = fn ? [fn] : []; }
        set onmessage(fn) { this._handlers.message = fn ? [fn] : []; }
        set onclose(fn) { this._handlers.close = fn ? [fn] : []; }
        set onerror(fn) { this._handlers.error = fn ? [fn] : []; }

        send(data) {
            // Handle subscription messages
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    parsed.forEach(d => {
                        if (d.subscribe?.category) {
                            console.log(`[Virtual WS] Subscribed to ${d.subscribe.category}`);
                        }
                    });
                }
            } catch {}
        }

        close() {
            this.readyState = 3; // CLOSED
            if (_wsInterval) { clearInterval(_wsInterval); _wsInterval = null; }
            this._emit('close', { type: 'close', code: 1000, reason: 'Normal' });
        }

        _emit(type, event) {
            (this._handlers[type] || []).forEach(fn => fn(event));
        }

        _sendEvent(category, event, data) {
            this._emit('message', { data: JSON.stringify({ category, event, data }) });
        }
    }

    // ================================================================
    // ROUTE HANDLER — matches mock-server.js routes
    // ================================================================
    function handleRoute(pathname, fetchOpts) {
        const parts = pathname.split('/').filter(Boolean);

        // /info
        if (pathname === '/info') return { json: SERVER_INFO };

        // /timelines
        if (pathname === '/timelines') return { json: TIMELINES };
        if (pathname.startsWith('/timelines/all/')) return { text: `All timelines ${parts[2]}` };
        if (parts[0] === 'timelines' && parts.length >= 3) return { text: `Timeline ${parts[1]} ${parts[2]}` };

        // /media
        if (pathname === '/media') return { json: MEDIA_ITEMS };
        if (pathname === '/media/map') return { json: MEDIA_MAP };
        if (pathname === '/media/sync') return { text: 'Sync started' };
        if (parts[0] === 'media' && parts[1] === 'thumb') return { thumb: true };
        if (parts[0] === 'media' && parts[1] === 'upload') {
            // Extract file info from FormData if available
            const body = fetchOpts?.body;
            let fileName = 'uploaded_file.mp4';
            let fileSize = 50000000;
            let fileType = 'mp4';
            if (body instanceof FormData) {
                const file = body.get('MediaFile');
                if (file && file.name) {
                    fileName = file.name;
                    fileSize = file.size || fileSize;
                    fileType = fileName.split('.').pop().toLowerCase() || 'mp4';
                }
            }
            const nameNoExt = fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
            const isImage = ['png','jpg','jpeg','bmp','tga','tiff'].includes(fileType);
            const isVideo = ['mp4','mov','avi','mkv','wmv','webm','mxf'].includes(fileType);
            const newId = uuid();
            const newItem = {
                iD: newId, fileName, name: nameNoExt, fileType,
                fileSize, width: 1920, height: 1080, fps: isImage ? 0 : 25,
                duration: isImage ? 0 : 30, durationFrames: isImage ? 1 : 750,
                aspectRatio: 1.778, hasAlpha: ['png','mov','tga'].includes(fileType),
                audioChannels: isVideo ? 2 : 0, audioSampleRate: isVideo ? 48000 : 0,
                canBeDeleted: true, folderPath: '/Content/Uploads',
                timeUploaded: new Date().toISOString(),
                mapIndexes: [MEDIA_ITEMS.length + 1],
            };
            MEDIA_ITEMS.push(newItem);
            MEDIA_MAP.entries.push({ index: MEDIA_ITEMS.length, mediaID: newId, name: newItem.name });
            return { json: { mediaID: newId } };
        }
        if (parts[0] === 'media' && parts[1] === 'delete') {
            // Remove from list
            const delId = parts[2];
            const idx = MEDIA_ITEMS.findIndex(m => m.iD === delId);
            if (idx >= 0) MEDIA_ITEMS.splice(idx, 1);
            MEDIA_MAP.entries = MEDIA_ITEMS.map((m, i) => ({ index: i + 1, mediaID: m.iD, name: m.name }));
            return { text: 'Deleted' };
        }
        if (parts[0] === 'media' && parts[1] === 'deletemapentry') return { text: 'Map entry removed' };
        if (parts[0] === 'media' && parts[1] === 'addmapentry') return { text: 'Map entry added' };
        if (parts[0] === 'media' && parts[1]) {
            const idx = parseInt(parts[1]);
            if (!isNaN(idx) && idx >= 1 && idx <= MEDIA_ITEMS.length) return { json: MEDIA_ITEMS[idx - 1] };
            const item = MEDIA_ITEMS.find(m => m.iD === parts[1]);
            if (item) return { json: item };
            return { json: MEDIA_ITEMS[0] };
        }

        // /mix
        if (parts[0] === 'mix' && parts.length >= 3) {
            const mixIdx = parseInt(parts[1]);
            if (parts[2] === 'level' && parts.length === 3) return { json: mixLevels[mixIdx] ?? 0 };
            if (parts[2] === 'level' && parts[3]) { mixLevels[mixIdx] = parseInt(parts[3]); return { text: 'OK' }; }
            if (parts[2] === 'preset') return { text: 'Preset loaded' };
            if (parts[2] === 'layer' && parts.length >= 5) {
                const layerIdx = parseInt(parts[3]);
                const key = `${mixIdx}-${layerIdx}`;
                if (parts[4] === 'level' && parts.length === 5) return { json: layerLevels[key] ?? 0 };
                if (parts[4] === 'level' && parts[5]) { layerLevels[key] = parseInt(parts[5]); return { text: 'OK' }; }
                if (parts[4] === 'media') return { text: 'Media loaded' };
                if (parts[4] === 'preset') return { text: 'Preset loaded' };
                if (parts[4] === 'mediaoneshot') return { text: 'One-shot triggered' };
            }
        }

        // /presets
        if (parts[0] === 'presets') {
            if (parts[1] === 'mix') return { json: MIX_PRESETS };
            if (parts[1] === 'layer') return { json: LAYER_PRESETS };
            if (parts[1] === 'delete') return { text: 'Deleted' };
            if (parts[1] === 'thumb') return { thumb: true };
            if (parts[1]) return { json: parts[1] === 'layer' ? LAYER_PRESETS : MIX_PRESETS };
        }

        // /pin
        if (parts[0] === 'pin') {
            const pinPath = parts.slice(2).join('/');
            if (parts[1] === 'getvalue') return { text: String(PIN_VALUES[pinPath] ?? '0') };
            if (parts[1] === 'setvalue') {
                const valParts = parts.slice(2);
                const value = valParts.pop();
                const path = valParts.join('/');
                PIN_VALUES[path] = value;
                return { text: `Set ${path} = ${value}` };
            }
            if (parts[1] === 'reset') { PIN_VALUES[pinPath] = '0'; return { text: 'Reset' }; }
            if (parts[1] === 'getinfo') {
                const info = PIN_INFO[pinPath] || { dataType: 'String', details: '', name: pinPath.split('/').pop(), pinType: 'Parameter' };
                return { json: info };
            }
            if (parts[1] === 'fadevalue') return { text: 'Fade started' };
        }

        return { text: 'OK' };
    }

    // ================================================================
    // ACTIVE STATE
    // ================================================================
    let _active = false;
    let _activeBaseUrl = '';
    let _originalFetch = null;
    let _virtualWs = null;

    function activate(baseUrl) {
        // Already active for this base — skip
        if (_active && _activeBaseUrl === baseUrl) return;

        _active = true;
        _activeBaseUrl = baseUrl;

        // Monkey-patch fetch to intercept virtual server requests
        if (!_originalFetch) _originalFetch = window.fetch;

        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.startsWith(_activeBaseUrl)) {
                const pathname = url.slice(_activeBaseUrl.length);
                const result = handleRoute(decodeURIComponent(pathname), options);
                if (result.thumb) {
                    // Return a tiny PNG blob
                    return fetch(THUMB_DATA_URL).then(r => r.blob()).then(blob =>
                        new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png' } })
                    );
                }
                if (result.json !== undefined) {
                    return Promise.resolve(new Response(JSON.stringify(result.json), {
                        status: 200, headers: { 'Content-Type': 'application/json' }
                    }));
                }
                return Promise.resolve(new Response(result.text || 'OK', {
                    status: 200, headers: { 'Content-Type': 'text/html' }
                }));
            }
            return _originalFetch.apply(this, arguments);
        };

        console.log('[VirtualHippo] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        if (_virtualWs) { _virtualWs.close(); _virtualWs = null; }
        console.log('[VirtualHippo] Deactivated');
    }

    function isActive() { return _active; }

    function createWebSocket() {
        _virtualWs = new VirtualWebSocket();
        return _virtualWs;
    }

    function getThumbUrl() {
        return THUMB_DATA_URL;
    }

    return { activate, deactivate, isActive, createWebSocket, getThumbUrl };
})();
