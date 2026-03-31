/**
 * Luxor Production — Virtual Blackmagic ATEM Switcher
 * Intercepts fetch for demo mode, simulates ATEM REST API
 */
const VirtualAtem = (() => {

    // ================================================================
    // DEMO STATE
    // ================================================================
    const _inputs = [
        { id: 1, name: 'Camera 1', type: 'SDI', shortName: 'CAM1' },
        { id: 2, name: 'Camera 2', type: 'SDI', shortName: 'CAM2' },
        { id: 3, name: 'Camera 3', type: 'SDI', shortName: 'CAM3' },
        { id: 4, name: 'Camera 4', type: 'SDI', shortName: 'CAM4' },
        { id: 5, name: 'Media Player 1', type: 'MediaPlayer', shortName: 'MP1' },
        { id: 6, name: 'Media Player 2', type: 'MediaPlayer', shortName: 'MP2' },
        { id: 7, name: 'Color Bars', type: 'Internal', shortName: 'BARS' },
        { id: 8, name: 'Black', type: 'Internal', shortName: 'BLK' },
        { id: 1000, name: 'Program', type: 'Program', shortName: 'PGM' },
        { id: 2001, name: 'Clean Feed 1', type: 'AuxOutput', shortName: 'CF1' },
    ];

    let _state = {
        model: 'ATEM Television Studio HD8 ISO',
        firmware: '9.6.2',
        program: 1,
        preview: 2,
        me: [
            { id: 0, program: 1, preview: 2 },
        ],
        transition: { style: 'mix', rate: 30 },
        ftb: false,
        dsk: [
            { id: 0, onAir: false, fillSource: 5, keySource: 5 },
            { id: 1, onAir: false, fillSource: 6, keySource: 6 },
        ],
        usk: [
            { id: 0, onAir: false, type: 'luma', fillSource: 5 },
        ],
        aux: [
            { id: 0, source: 1 },
            { id: 1, source: 2 },
            { id: 2, source: 1000 },
        ],
        audio: {
            master: { gain: 0, balance: 0 },
            inputs: [
                { id: 1, gain: 0, balance: 0, mixOption: 'on' },
                { id: 2, gain: 0, balance: 0, mixOption: 'afv' },
                { id: 3, gain: -6, balance: 0, mixOption: 'afv' },
                { id: 4, gain: -6, balance: 0, mixOption: 'off' },
            ],
        },
        streaming: false,
        recording: false,
        macros: [
            { id: 0, name: 'Open Show', isUsed: true },
            { id: 1, name: 'End Show', isUsed: true },
            { id: 2, name: 'PIP Layout', isUsed: true },
            { id: 3, name: '', isUsed: false },
        ],
        supersource: {
            boxes: [
                { id: 0, enabled: true, source: 1, x: -480, y: 270, size: 500 },
                { id: 1, enabled: true, source: 2, x: 480, y: 270, size: 500 },
                { id: 2, enabled: false, source: 3, x: -480, y: -270, size: 500 },
                { id: 3, enabled: false, source: 4, x: 480, y: -270, size: 500 },
            ],
        },
    };

    // ================================================================
    // ROUTE HANDLER
    // ================================================================
    function handleRoute(url, fetchOpts) {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.replace(/\/$/, '');
        const method = (fetchOpts?.method || 'GET').toUpperCase();
        let body = null;
        if (fetchOpts?.body) {
            try { body = JSON.parse(fetchOpts.body); } catch { body = fetchOpts.body; }
        }

        // Base path — device info
        const base = pathname.replace(/.*\/api\/v1\/switcher/, '');

        if (base === '' || base === '/') {
            return jsonResp({ model: _state.model, firmware: _state.firmware, inputs: _inputs.length, me: _state.me.length });
        }

        // Inputs
        if (base === '/inputs') return jsonResp(_inputs);

        // Program
        if (base === '/program' && method === 'POST') {
            const me = body?.me || 0;
            _state.me[me] = _state.me[me] || { id: me, program: 1, preview: 2 };
            _state.me[me].program = body?.input ?? _state.me[me].program;
            _state.program = _state.me[0].program;
            return jsonResp({ ok: true });
        }

        // Preview
        if (base === '/preview' && method === 'POST') {
            const me = body?.me || 0;
            _state.me[me] = _state.me[me] || { id: me, program: 1, preview: 2 };
            _state.me[me].preview = body?.input ?? _state.me[me].preview;
            _state.preview = _state.me[0].preview;
            return jsonResp({ ok: true });
        }

        // Transition — auto
        if (base === '/transition/auto' && method === 'POST') {
            const me = body?.me || 0;
            const meState = _state.me[me] || _state.me[0];
            const tmp = meState.program;
            meState.program = meState.preview;
            meState.preview = tmp;
            _state.program = _state.me[0].program;
            _state.preview = _state.me[0].preview;
            return jsonResp({ ok: true });
        }

        // Transition — cut
        if (base === '/transition/cut' && method === 'POST') {
            const me = body?.me || 0;
            const meState = _state.me[me] || _state.me[0];
            const tmp = meState.program;
            meState.program = meState.preview;
            meState.preview = tmp;
            _state.program = _state.me[0].program;
            _state.preview = _state.me[0].preview;
            return jsonResp({ ok: true });
        }

        // Transition style
        if (base === '/transition/style' && method === 'POST') {
            _state.transition.style = body?.style || _state.transition.style;
            return jsonResp({ ok: true });
        }

        // Transition rate
        if (base === '/transition/rate' && method === 'POST') {
            _state.transition.rate = body?.rate ?? _state.transition.rate;
            return jsonResp({ ok: true });
        }

        // FTB
        if (base === '/ftb' && method === 'POST') {
            _state.ftb = !_state.ftb;
            return jsonResp({ ok: true, ftb: _state.ftb });
        }

        // DSK
        const dskMatch = base.match(/^\/dsk\/(\d+)\/(auto|cut|on-air|source)$/);
        if (dskMatch && method === 'POST') {
            const dskId = parseInt(dskMatch[1]);
            const dsk = _state.dsk[dskId];
            if (!dsk) return jsonResp({ error: 'DSK not found' }, 404);
            switch (dskMatch[2]) {
                case 'auto': case 'cut': dsk.onAir = !dsk.onAir; break;
                case 'on-air': dsk.onAir = body?.onAir ?? !dsk.onAir; break;
                case 'source':
                    if (body?.fillSource !== undefined) dsk.fillSource = body.fillSource;
                    if (body?.keySource !== undefined) dsk.keySource = body.keySource;
                    break;
            }
            return jsonResp({ ok: true });
        }

        // USK
        const uskMatch = base.match(/^\/usk\/(\d+)\/(on-air|type)$/);
        if (uskMatch && method === 'POST') {
            const uskId = parseInt(uskMatch[1]);
            const usk = _state.usk[uskId] || _state.usk[0];
            switch (uskMatch[2]) {
                case 'on-air': usk.onAir = body?.onAir ?? !usk.onAir; break;
                case 'type': usk.type = body?.type || usk.type; break;
            }
            return jsonResp({ ok: true });
        }

        // AUX
        const auxMatch = base.match(/^\/aux\/(\d+)$/);
        if (auxMatch) {
            const auxId = parseInt(auxMatch[1]);
            const aux = _state.aux[auxId];
            if (!aux) return jsonResp({ error: 'Aux not found' }, 404);
            if (method === 'POST') {
                aux.source = body?.input ?? aux.source;
                return jsonResp({ ok: true });
            }
            return jsonResp(aux);
        }

        // Audio mixer
        if (base === '/audio/mixer') return jsonResp(_state.audio);
        const audioMatch = base.match(/^\/audio\/mixer\/(\d+)\/(gain|balance|mixOption)$/);
        if (audioMatch && method === 'POST') {
            const inputId = parseInt(audioMatch[1]);
            const audioInput = _state.audio.inputs.find(a => a.id === inputId);
            if (audioInput) {
                if (audioMatch[2] === 'gain') audioInput.gain = body?.gain ?? audioInput.gain;
                if (audioMatch[2] === 'balance') audioInput.balance = body?.balance ?? audioInput.balance;
                if (audioMatch[2] === 'mixOption') audioInput.mixOption = body?.mixOption ?? audioInput.mixOption;
            }
            return jsonResp({ ok: true });
        }

        // SuperSource
        const ssMatch = base.match(/^\/supersource\/box\/(\d+)$/);
        if (ssMatch && method === 'POST') {
            const boxId = parseInt(ssMatch[1]);
            const box = _state.supersource.boxes[boxId];
            if (box && body) Object.assign(box, body);
            return jsonResp({ ok: true });
        }

        // Macros
        const macroRunMatch = base.match(/^\/macro\/(\d+)\/run$/);
        if (macroRunMatch && method === 'POST') {
            return jsonResp({ ok: true, macro: parseInt(macroRunMatch[1]) });
        }
        if (base === '/macro/stop' && method === 'POST') return jsonResp({ ok: true });
        const macroRecMatch = base.match(/^\/macro\/(\d+)\/record$/);
        if (macroRecMatch && method === 'POST') return jsonResp({ ok: true });
        if (base === '/macro/record/stop' && method === 'POST') return jsonResp({ ok: true });

        // Streaming
        if (base === '/stream/start' && method === 'POST') { _state.streaming = true; return jsonResp({ ok: true }); }
        if (base === '/stream/stop' && method === 'POST') { _state.streaming = false; return jsonResp({ ok: true }); }

        // Recording
        if (base === '/record/start' && method === 'POST') { _state.recording = true; return jsonResp({ ok: true }); }
        if (base === '/record/stop' && method === 'POST') { _state.recording = false; return jsonResp({ ok: true }); }

        // Fallback — return full state
        return jsonResp({
            model: _state.model,
            firmware: _state.firmware,
            program: _state.program,
            preview: _state.preview,
            me: _state.me,
            transition: _state.transition,
            ftb: _state.ftb,
            dsk: _state.dsk,
            usk: _state.usk,
            aux: _state.aux,
            streaming: _state.streaming,
            recording: _state.recording,
            inputs: _inputs,
        });
    }

    function jsonResp(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status, headers: { 'Content-Type': 'application/json' }
        });
    }

    // ================================================================
    // VIRTUAL WEBSOCKET
    // ================================================================
    class AtemVirtualWS {
        constructor() {
            this.readyState = 0;
            this._handlers = { open: [], message: [], close: [], error: [] };
            this._interval = null;
            setTimeout(() => {
                this.readyState = 1;
                this._emit('open', { type: 'open' });
                this._sendState();
                this._interval = setInterval(() => {
                    if (this.readyState === 1) this._sendState();
                }, 5000);
            }, 100);
        }
        addEventListener(type, fn) { if (this._handlers[type]) this._handlers[type].push(fn); }
        removeEventListener(type, fn) { if (this._handlers[type]) this._handlers[type] = this._handlers[type].filter(f => f !== fn); }
        set onopen(fn) { this._handlers.open = fn ? [fn] : []; }
        set onmessage(fn) { this._handlers.message = fn ? [fn] : []; }
        set onclose(fn) { this._handlers.close = fn ? [fn] : []; }
        set onerror(fn) { this._handlers.error = fn ? [fn] : []; }
        send() {}
        close() {
            this.readyState = 3;
            if (this._interval) { clearInterval(this._interval); this._interval = null; }
            this._emit('close', { type: 'close', code: 1000, reason: 'Normal' });
        }
        _emit(type, event) { (this._handlers[type] || []).forEach(fn => fn(event)); }
        _sendState() {
            this._emit('message', { data: JSON.stringify({
                type: 'atemState',
                program: _state.program,
                preview: _state.preview,
                ftb: _state.ftb,
                streaming: _state.streaming,
                recording: _state.recording,
            })});
        }
    }

    // ================================================================
    // ACTIVE STATE
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
                return Promise.resolve(handleRoute(url, options));
            }
            return _originalFetch.apply(this, arguments);
        };

        console.log('[VirtualAtem] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        if (_virtualWs) { _virtualWs.close(); _virtualWs = null; }
        console.log('[VirtualAtem] Deactivated');
    }

    function isActive() { return _active; }

    function createWebSocket() {
        _virtualWs = new AtemVirtualWS();
        return _virtualWs;
    }

    return { activate, deactivate, isActive, createWebSocket };
})();
