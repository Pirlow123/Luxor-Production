/**
 * In-Browser Virtual Resolume Arena — Intercepts fetch for demo mode
 * Simulates the Resolume Arena REST API (port 8080, /api/v1)
 */
const VirtualResolume = (() => {

    function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }
    let _nextParamId = 1000;
    function paramId() { return _nextParamId++; }

    // ================================================================
    // Helper: create a parameter object like Resolume returns
    // ================================================================
    function paramRange(name, value, min = 0, max = 1) {
        return { id: paramId(), name, valuetype: 'ParamRange', value, min, max };
    }
    function paramString(name, value) {
        return { id: paramId(), name, value };
    }
    function paramBool(name, value) {
        return { id: paramId(), name, valuetype: 'ParamBool', value };
    }
    function paramChoice(name, value, options) {
        return { id: paramId(), name, valuetype: 'ParamChoice', value, options };
    }

    // ================================================================
    // DEMO COMPOSITION DATA
    // ================================================================
    const CLIP_NAMES = [
        // Column 1-8 names per layer
        ['Intro Loop', 'Keynote BG', 'Award Sting', 'Particles', 'Logo Reveal', 'Gradient Blue', 'Sponsor Reel', 'Blackout'],
        ['LED Pattern A', 'LED Pattern B', 'LED Rainbow', 'LED Pulse', 'LED Strobe', 'LED Solid', '', ''],
        ['Floor Grid', 'Floor Waves', 'Floor Stars', 'Floor Logo', '', '', '', ''],
        ['Confidence 1', 'Confidence 2', 'Timer 5min', 'Timer 10min', '', '', '', ''],
    ];

    const LAYER_NAMES = ['Main Stage', 'LED Wall', 'Floor Projection', 'Confidence'];

    function buildClip(name, layerIdx, clipIdx) {
        const connected = (layerIdx === 0 && clipIdx === 0);
        return {
            name: paramString('name', name),
            connected: paramChoice('connected', connected ? 'Connected' : 'Disconnected', ['Connected', 'Disconnected', 'Preview']),
            transport: {
                position: paramRange('position', connected ? 0.35 : 0),
                controls: {
                    playdirection: paramChoice('playdirection', 'Forward', ['Forward', 'Reverse', 'Bounce', 'Random']),
                    playmode: paramChoice('playmode', 'Loop', ['Loop', 'Once', 'Bounce', 'Random']),
                    speed: paramRange('speed', 1.0, 0, 10),
                }
            },
            video: {
                opacity: paramRange('opacity', connected ? 1.0 : 0, 0, 1),
                width: paramRange('width', 1920, 0, 7680),
                height: paramRange('height', 1080, 0, 4320),
                description: name ? `${name} — 1920x1080 @ 25fps` : '',
            },
            audio: {
                volume: paramRange('volume', 0.8, 0, 1),
            },
            _hasContent: !!name,
        };
    }

    function buildLayer(name, layerIdx) {
        const clips = [];
        for (let c = 0; c < 8; c++) {
            const clipName = (CLIP_NAMES[layerIdx] && CLIP_NAMES[layerIdx][c]) || '';
            clips.push(buildClip(clipName, layerIdx, c));
        }
        return {
            name: paramString('name', name),
            bypassed: paramBool('bypassed', false),
            solo: paramBool('solo', false),
            master: paramRange('master', layerIdx === 0 ? 1.0 : 0.8, 0, 1),
            crossfader: paramRange('crossfader', 0.5, 0, 1),
            clips,
        };
    }

    function buildComposition() {
        const layers = LAYER_NAMES.map((name, i) => buildLayer(name, i));
        return {
            name: paramString('name', 'Luxor Demo Show'),
            master: paramRange('master', 1.0, 0, 1),
            speed: paramRange('speed', 1.0, 0, 10),
            layers,
            decks: [
                { name: paramString('name', 'Deck 1'), selected: true },
                { name: paramString('name', 'Deck 2'), selected: false },
            ],
            columns: Array.from({ length: 8 }, (_, i) => ({
                name: paramString('name', `Column ${i + 1}`),
            })),
            tempocontroller: {
                tempo: paramRange('tempo', 120, 20, 999),
                resync: paramBool('resync', false),
            },
            version: '7.18.0 (Virtual)',
        };
    }

    let COMPOSITION = buildComposition();

    // Track connected clips per layer
    let connectedClips = { 0: 0, 1: -1, 2: -1, 3: -1 };

    // Effects & Sources
    const EFFECTS = [
        { name: 'Blur', category: 'Filter' },
        { name: 'Glow', category: 'Filter' },
        { name: 'Color Correction', category: 'Color' },
        { name: 'Hue Rotate', category: 'Color' },
        { name: 'Mirror', category: 'Transform' },
        { name: 'Kaleidoscope', category: 'Transform' },
        { name: 'Slice Transform', category: 'Transform' },
        { name: 'Text Block', category: 'Source' },
        { name: 'Chroma Key', category: 'Key' },
        { name: 'Luma Key', category: 'Key' },
    ];

    const SOURCES = [
        { name: 'Color', category: 'Generator' },
        { name: 'Gradient', category: 'Generator' },
        { name: 'Noise', category: 'Generator' },
        { name: 'NDI Receiver', category: 'Input' },
        { name: 'Spout Receiver', category: 'Input' },
        { name: 'Camera', category: 'Input' },
        { name: 'Screen Capture', category: 'Input' },
    ];

    // Parameter value store (by ID)
    const paramValues = {};

    // Collect all parameter IDs and values from composition
    function indexParams(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (obj.id !== undefined && obj.value !== undefined) {
            paramValues[obj.id] = obj.value;
        }
        for (const key in obj) {
            if (typeof obj[key] === 'object') indexParams(obj[key]);
        }
    }
    indexParams(COMPOSITION);

    // ================================================================
    // ROUTE HANDLER
    // ================================================================
    function handleRoute(pathname, fetchOpts) {
        const method = fetchOpts?.method?.toUpperCase() || 'GET';
        const parts = pathname.split('/').filter(Boolean);
        // parts: ['composition'], ['composition','layers','1'], etc.

        // GET /composition
        if (pathname === '/composition' && method === 'GET') {
            return { json: COMPOSITION };
        }

        // PUT /composition
        if (pathname === '/composition' && method === 'PUT') {
            return { json: COMPOSITION };
        }

        // GET /composition/tempocontroller
        if (pathname === '/composition/tempocontroller') {
            return { json: COMPOSITION.tempocontroller };
        }

        // Layers
        if (parts[0] === 'composition' && parts[1] === 'layers') {
            // POST /composition/layers/add
            if (parts[2] === 'add' && method === 'POST') {
                const newLayer = buildLayer(`Layer ${COMPOSITION.layers.length + 1}`, COMPOSITION.layers.length);
                COMPOSITION.layers.push(newLayer);
                return { json: newLayer };
            }

            const layerIdx = parseInt(parts[2]);
            if (isNaN(layerIdx)) return { json: {} };

            const layer = COMPOSITION.layers[layerIdx - 1];
            if (!layer) return { status: 404, text: 'Layer not found' };

            // DELETE /composition/layers/{index}
            if (method === 'DELETE' && parts.length === 3) {
                COMPOSITION.layers.splice(layerIdx - 1, 1);
                return { text: 'Layer removed' };
            }

            // POST /composition/layers/{index}/clear
            if (parts[3] === 'clear' && method === 'POST') {
                if (connectedClips[layerIdx - 1] >= 0) {
                    const oldClip = layer.clips[connectedClips[layerIdx - 1]];
                    if (oldClip) oldClip.connected.value = 'Disconnected';
                    connectedClips[layerIdx - 1] = -1;
                }
                return { text: 'Layer cleared' };
            }

            // GET /composition/layers/{index}
            if (parts.length === 3 && method === 'GET') {
                return { json: layer };
            }

            // PUT /composition/layers/{index}
            if (parts.length === 3 && method === 'PUT') {
                return { json: layer };
            }

            // Clips
            if (parts[3] === 'clips') {
                const clipIdx = parseInt(parts[4]);
                if (isNaN(clipIdx)) return { json: {} };
                const clip = layer.clips[clipIdx - 1];
                if (!clip) return { status: 404, text: 'Clip not found' };

                // POST .../connect
                if (parts[5] === 'connect' && method === 'POST') {
                    // Disconnect previous
                    const prevClip = connectedClips[layerIdx - 1];
                    if (prevClip >= 0 && layer.clips[prevClip]) {
                        layer.clips[prevClip].connected.value = 'Disconnected';
                    }
                    clip.connected.value = 'Connected';
                    connectedClips[layerIdx - 1] = clipIdx - 1;
                    return { text: 'Clip connected' };
                }

                // GET .../thumbnail
                if (parts[5] === 'thumbnail') {
                    return { thumb: true };
                }

                // GET clip
                if (method === 'GET') return { json: clip };
            }

            // Effects
            if (parts[3] === 'effects') {
                if (parts[4] === 'add' && method === 'POST') return { text: 'Effect added' };
                if (method === 'DELETE') return { text: 'Effect removed' };
            }
        }

        // Columns
        if (parts[0] === 'composition' && parts[1] === 'columns') {
            if (parts[2] === 'add' && method === 'POST') {
                COMPOSITION.columns.push({ name: paramString('name', `Column ${COMPOSITION.columns.length + 1}`) });
                return { text: 'Column added' };
            }
            const colIdx = parseInt(parts[2]);
            if (!isNaN(colIdx) && parts[3] === 'connect' && method === 'POST') {
                // Trigger all clips in column
                COMPOSITION.layers.forEach((layer, li) => {
                    const prevClip = connectedClips[li];
                    if (prevClip >= 0 && layer.clips[prevClip]) {
                        layer.clips[prevClip].connected.value = 'Disconnected';
                    }
                    if (layer.clips[colIdx - 1] && layer.clips[colIdx - 1]._hasContent) {
                        layer.clips[colIdx - 1].connected.value = 'Connected';
                        connectedClips[li] = colIdx - 1;
                    } else {
                        connectedClips[li] = -1;
                    }
                });
                return { text: 'Column connected' };
            }
            if (!isNaN(colIdx) && method === 'DELETE') {
                COMPOSITION.columns.splice(colIdx - 1, 1);
                return { text: 'Column removed' };
            }
        }

        // Decks
        if (parts[0] === 'composition' && parts[1] === 'decks') {
            const deckIdx = parseInt(parts[2]);
            if (!isNaN(deckIdx) && parts[3] === 'select') {
                COMPOSITION.decks.forEach((d, i) => d.selected = (i === deckIdx - 1));
                return { text: 'Deck selected' };
            }
        }

        // Selected clip
        if (pathname === '/composition/clips/selected') {
            for (let li = 0; li < COMPOSITION.layers.length; li++) {
                const ci = connectedClips[li];
                if (ci >= 0) return { json: { layer: li + 1, clip: ci + 1, ...COMPOSITION.layers[li].clips[ci] } };
            }
            return { json: {} };
        }

        // Effects
        if (pathname === '/effects') return { json: EFFECTS };

        // Sources
        if (pathname === '/sources') return { json: SOURCES };

        // Parameter by ID
        if (parts[0] === 'parameter' && parts[1] === 'by-id') {
            const pid = parseInt(parts[2]);
            if (method === 'GET') {
                return { json: { id: pid, value: paramValues[pid] ?? 0 } };
            }
            if (method === 'PUT') {
                let body = {};
                try { body = JSON.parse(fetchOpts?.body || '{}'); } catch {}
                paramValues[pid] = body.value ?? 0;
                return { json: { id: pid, value: paramValues[pid] } };
            }
        }

        return { text: 'OK' };
    }

    // ================================================================
    // VIRTUAL WEBSOCKET for Resolume
    // ================================================================
    class ResolumeVirtualWS {
        constructor(composition) {
            this.readyState = 0;
            this._handlers = { open: [], message: [], close: [], error: [] };
            this._interval = null;
            setTimeout(() => {
                this.readyState = 1;
                this._emit('open', { type: 'open' });
                // Send initial composition state
                this._send({ type: 'composition_update', value: composition });
                this._send({ type: 'sources_update', value: SOURCES });
                this._send({ type: 'effects_update', value: EFFECTS });
                // Periodic position updates
                this._interval = setInterval(() => {
                    if (this.readyState !== 1) return;
                    // Simulate transport position advancing for connected clips
                    COMPOSITION.layers.forEach((layer, li) => {
                        const ci = connectedClips[li];
                        if (ci >= 0 && layer.clips[ci]) {
                            const pos = layer.clips[ci].transport.position;
                            pos.value = (pos.value + 0.01) % 1;
                            this._send({ type: 'parameter_update', parameter: `/parameter/by-id/${pos.id}`, value: pos.value });
                        }
                    });
                }, 1000);
            }, 100);
        }

        addEventListener(type, fn) { if (this._handlers[type]) this._handlers[type].push(fn); }
        removeEventListener(type, fn) { if (this._handlers[type]) this._handlers[type] = this._handlers[type].filter(f => f !== fn); }
        set onopen(fn) { this._handlers.open = fn ? [fn] : []; }
        set onmessage(fn) { this._handlers.message = fn ? [fn] : []; }
        set onclose(fn) { this._handlers.close = fn ? [fn] : []; }
        set onerror(fn) { this._handlers.error = fn ? [fn] : []; }

        send(data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.action === 'subscribe') {
                    this._send({ type: 'parameter_subscribed', parameter: parsed.parameter, value: 0 });
                }
            } catch {}
        }

        close() {
            this.readyState = 3;
            if (this._interval) { clearInterval(this._interval); this._interval = null; }
            this._emit('close', { type: 'close', code: 1000, reason: 'Normal' });
        }

        _emit(type, event) { (this._handlers[type] || []).forEach(fn => fn(event)); }
        _send(data) { this._emit('message', { data: JSON.stringify(data) }); }
    }

    // ================================================================
    // ACTIVE STATE
    // ================================================================
    let _active = false;
    let _activeBaseUrl = '';
    let _originalFetch = null;
    let _virtualWs = null;

    // 1x1 cyan PNG for thumbnails
    const THUMB_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12P4z8DwHwAFAAH/VscqYQAAAABJRU5ErkJggg==';

    function activate(baseUrl) {
        if (_active && _activeBaseUrl === baseUrl) return;
        _active = true;
        _activeBaseUrl = baseUrl;
        if (!_originalFetch) _originalFetch = window.fetch;

        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.startsWith(_activeBaseUrl)) {
                const pathname = url.slice(_activeBaseUrl.length);
                const result = handleRoute(decodeURIComponent(pathname), options);
                if (result.thumb) {
                    return fetch(THUMB_DATA_URL).then(r => r.blob()).then(blob =>
                        new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png' } })
                    );
                }
                if (result.json !== undefined) {
                    return Promise.resolve(new Response(JSON.stringify(result.json), {
                        status: result.status || 200, headers: { 'Content-Type': 'application/json' }
                    }));
                }
                return Promise.resolve(new Response(result.text || 'OK', {
                    status: result.status || 200, headers: { 'Content-Type': 'text/html' }
                }));
            }
            return _originalFetch.apply(this, arguments);
        };

        console.log('[VirtualResolume] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        if (_virtualWs) { _virtualWs.close(); _virtualWs = null; }
        console.log('[VirtualResolume] Deactivated');
    }

    function isActive() { return _active; }

    function createWebSocket() {
        _virtualWs = new ResolumeVirtualWS(COMPOSITION);
        return _virtualWs;
    }

    function getThumbUrl() { return THUMB_DATA_URL; }

    return { activate, deactivate, isActive, createWebSocket, getThumbUrl };
})();
