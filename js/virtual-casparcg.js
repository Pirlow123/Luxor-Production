/**
 * In-Browser Virtual CasparCG Server — Intercepts fetch for demo mode
 * Simulates the CasparCG Server REST API (/api/v1)
 */
const VirtualCasparcg = (() => {

    // ================================================================
    // CHANNEL & LAYER STATE
    // ================================================================
    const CHANNEL_DEFS = [
        { id: 1, name: 'Program',  format: '1080i5000', width: 1920, height: 1080, layerCount: 20 },
        { id: 2, name: 'Preview',  format: '1080i5000', width: 1920, height: 1080, layerCount: 20 },
        { id: 3, name: 'Graphics', format: '1080i5000', width: 1920, height: 1080, layerCount: 10 },
    ];

    // layers[channelId][layerId] = { clip, playing, opacity, volume }
    const layers = {};

    function initLayers() {
        CHANNEL_DEFS.forEach(ch => {
            layers[ch.id] = {};
            for (let i = 1; i <= ch.layerCount; i++) {
                layers[ch.id][i] = { clip: null, playing: false, opacity: 0, volume: 0 };
            }
        });
        // Pre-populate some layers
        setLayer(1, 10, 'AMB',          true, 1.0, 0.8);
        setLayer(1, 20, 'LOWER_THIRD',  true, 1.0, 0.0);
        setLayer(3, 10, 'SCOREBOARD',   true, 1.0, 0.0);
    }

    function setLayer(ch, layer, clip, playing, opacity, volume) {
        if (!layers[ch]) return;
        if (!layers[ch][layer]) layers[ch][layer] = {};
        layers[ch][layer] = { clip, playing, opacity, volume };
    }

    function getLayer(ch, layer) {
        return (layers[ch] && layers[ch][layer]) || { clip: null, playing: false, opacity: 0, volume: 0 };
    }

    function getChannelLayers(ch) {
        const def = CHANNEL_DEFS.find(c => c.id === ch);
        if (!def) return [];
        const result = [];
        for (let i = 1; i <= def.layerCount; i++) {
            const l = getLayer(ch, i);
            if (l.clip) {
                result.push({ layer: i, clip: l.clip, playing: l.playing, opacity: l.opacity, volume: l.volume });
            }
        }
        return result;
    }

    initLayers();

    // ================================================================
    // MEDIA & TEMPLATES
    // ================================================================
    const MEDIA_LIBRARY = [
        { name: 'AMB',          type: 'video', duration: 300, fps: 50, size: 524288000 },
        { name: 'INTRO',        type: 'video', duration: 15,  fps: 50, size: 156000000 },
        { name: 'OUTRO',        type: 'video', duration: 20,  fps: 50, size: 180000000 },
        { name: 'LOWER_THIRD',  type: 'video', duration: 0,   fps: 0,  size: 5000000  },
        { name: 'FULL_FRAME',   type: 'video', duration: 60,  fps: 50, size: 350000000 },
        { name: 'STINGER',      type: 'video', duration: 2,   fps: 50, size: 45000000  },
        { name: 'LOOP_BG',      type: 'video', duration: 30,  fps: 25, size: 89000000  },
        { name: 'COUNTDOWN',    type: 'video', duration: 300, fps: 25, size: 210000000 },
    ];

    const TEMPLATE_LIBRARY = [
        { name: 'LOWER_THIRD', type: 'template', fields: ['f0', 'f1'] },
        { name: 'SCOREBOARD',  type: 'template', fields: ['home', 'away', 'score_home', 'score_away'] },
        { name: 'HEADLINE',    type: 'template', fields: ['title', 'subtitle'] },
        { name: 'CLOCK',       type: 'template', fields: ['timezone'] },
        { name: 'CREDITS',     type: 'template', fields: ['lines'] },
    ];

    // ================================================================
    // ROUTE HANDLER
    // ================================================================
    function handleRoute(pathname, fetchOpts) {
        const method = (fetchOpts?.method || 'GET').toUpperCase();
        const parts = pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);
        // parts[0] = resource name

        let body = {};
        if (fetchOpts?.body) {
            try { body = JSON.parse(fetchOpts.body); } catch {}
        }

        // GET /api/v1/server
        if (parts[0] === 'server' && method === 'GET') {
            return {
                json: {
                    version: '2.4.0',
                    name: 'CasparCG Virtual Server',
                    channels: CHANNEL_DEFS.map(ch => ({
                        id: ch.id,
                        name: ch.name,
                        format: ch.format,
                        width: ch.width,
                        height: ch.height,
                        layerCount: ch.layerCount,
                    })),
                },
            };
        }

        // GET /api/v1/channels
        if (parts[0] === 'channels' && parts.length === 1 && method === 'GET') {
            return {
                json: CHANNEL_DEFS.map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    format: ch.format,
                    width: ch.width,
                    height: ch.height,
                    layers: getChannelLayers(ch.id),
                })),
            };
        }

        // /api/v1/channels/:ch  and  /api/v1/channels/:ch/...
        if (parts[0] === 'channels' && parts.length >= 2) {
            const chId = parseInt(parts[1]);
            const chDef = CHANNEL_DEFS.find(c => c.id === chId);
            if (!chDef) return { status: 404, text: 'Channel not found' };

            // GET /api/v1/channels/:ch
            if (parts.length === 2 && method === 'GET') {
                return {
                    json: {
                        id: chDef.id,
                        name: chDef.name,
                        format: chDef.format,
                        width: chDef.width,
                        height: chDef.height,
                        layers: getChannelLayers(chId),
                    },
                };
            }

            // POST /api/v1/channels/:ch/clear
            if (parts[2] === 'clear' && method === 'POST') {
                for (let i = 1; i <= chDef.layerCount; i++) {
                    layers[chId][i] = { clip: null, playing: false, opacity: 0, volume: 0 };
                }
                return { json: { status: 'ok', channel: chId, action: 'clear' } };
            }

            // Layer-level routes: /api/v1/channels/:ch/layers/:layer/...
            if (parts[2] === 'layers' && parts.length >= 4) {
                const layerId = parseInt(parts[3]);
                if (isNaN(layerId) || layerId < 1 || layerId > chDef.layerCount) {
                    return { status: 404, text: 'Layer not found' };
                }

                const action = parts[4];

                // POST .../play
                if (action === 'play' && method === 'POST') {
                    const clip = body.clip || body.name || getLayer(chId, layerId).clip || 'UNKNOWN';
                    const opacity = body.opacity !== undefined ? body.opacity : getLayer(chId, layerId).opacity || 1.0;
                    const volume = body.volume !== undefined ? body.volume : getLayer(chId, layerId).volume || 0;
                    setLayer(chId, layerId, clip, true, opacity, volume);
                    return { json: { status: 'ok', channel: chId, layer: layerId, action: 'play', clip } };
                }

                // POST .../stop
                if (action === 'stop' && method === 'POST') {
                    const l = getLayer(chId, layerId);
                    l.playing = false;
                    return { json: { status: 'ok', channel: chId, layer: layerId, action: 'stop' } };
                }

                // POST .../clear
                if (action === 'clear' && method === 'POST') {
                    layers[chId][layerId] = { clip: null, playing: false, opacity: 0, volume: 0 };
                    return { json: { status: 'ok', channel: chId, layer: layerId, action: 'clear' } };
                }

                // POST .../opacity
                if (action === 'opacity' && method === 'POST') {
                    const l = getLayer(chId, layerId);
                    l.opacity = Math.max(0, Math.min(1, parseFloat(body.value ?? body.opacity ?? l.opacity)));
                    return { json: { status: 'ok', channel: chId, layer: layerId, opacity: l.opacity } };
                }

                // POST .../volume
                if (action === 'volume' && method === 'POST') {
                    const l = getLayer(chId, layerId);
                    l.volume = Math.max(0, Math.min(1, parseFloat(body.value ?? body.volume ?? l.volume)));
                    return { json: { status: 'ok', channel: chId, layer: layerId, volume: l.volume } };
                }

                // GET layer state (no action)
                if (!action && method === 'GET') {
                    const l = getLayer(chId, layerId);
                    return { json: { channel: chId, layer: layerId, ...l } };
                }
            }
        }

        // GET /api/v1/media
        if (parts[0] === 'media' && parts.length === 1 && method === 'GET') {
            return { json: MEDIA_LIBRARY };
        }

        // GET /api/v1/templates
        if (parts[0] === 'templates' && parts.length === 1 && method === 'GET') {
            return { json: TEMPLATE_LIBRARY };
        }

        return { text: 'OK' };
    }

    // ================================================================
    // VIRTUAL WEBSOCKET — Periodic channel state updates
    // ================================================================
    class CasparcgVirtualWS {
        constructor() {
            this.readyState = 0;
            this._handlers = { open: [], message: [], close: [], error: [] };
            this._interval = null;
            setTimeout(() => {
                this.readyState = 1;
                this._emit('open', { type: 'open' });
                // Send initial state
                this._sendState();
                // Periodic updates
                this._interval = setInterval(() => {
                    if (this.readyState !== 1) return;
                    this._sendState();
                }, 3000);
            }, 100);
        }

        addEventListener(type, fn) { if (this._handlers[type]) this._handlers[type].push(fn); }
        removeEventListener(type, fn) { if (this._handlers[type]) this._handlers[type] = this._handlers[type].filter(f => f !== fn); }
        set onopen(fn)    { this._handlers.open    = fn ? [fn] : []; }
        set onmessage(fn) { this._handlers.message = fn ? [fn] : []; }
        set onclose(fn)   { this._handlers.close   = fn ? [fn] : []; }
        set onerror(fn)   { this._handlers.error   = fn ? [fn] : []; }

        send(data) {
            // Accept but ignore inbound messages
            try {
                const parsed = JSON.parse(data);
                if (parsed.subscribe) {
                    console.log('[VirtualCasparcg WS] Subscription:', parsed.subscribe);
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

        _sendState() {
            const channelStates = CHANNEL_DEFS.map(ch => ({
                id: ch.id,
                name: ch.name,
                format: ch.format,
                layers: getChannelLayers(ch.id),
            }));
            this._send({ type: 'channel_update', channels: channelStates });
        }
    }

    // ================================================================
    // ACTIVE STATE & FETCH INTERCEPTION
    // ================================================================
    let _active = false;
    let _activeBaseUrl = '';
    let _originalFetch = null;
    let _virtualWs = null;

    function activate(baseUrl) {
        if (_active && _activeBaseUrl === baseUrl) return;
        _active = true;
        _activeBaseUrl = baseUrl;
        if (!_originalFetch) _originalFetch = window.fetch;

        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.startsWith(_activeBaseUrl)) {
                const pathname = url.slice(_activeBaseUrl.length);
                const result = handleRoute(decodeURIComponent(pathname), options);
                if (result.json !== undefined) {
                    return Promise.resolve(new Response(JSON.stringify(result.json), {
                        status: result.status || 200,
                        headers: { 'Content-Type': 'application/json' },
                    }));
                }
                return Promise.resolve(new Response(result.text || 'OK', {
                    status: result.status || 200,
                    headers: { 'Content-Type': 'text/plain' },
                }));
            }
            return _originalFetch.apply(this, arguments);
        };

        console.log('[VirtualCasparcg] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        if (_virtualWs) { _virtualWs.close(); _virtualWs = null; }
        console.log('[VirtualCasparcg] Deactivated');
    }

    function isActive() { return _active; }

    function createWebSocket() {
        _virtualWs = new CasparcgVirtualWS();
        return _virtualWs;
    }

    return { activate, deactivate, isActive, createWebSocket };
})();
