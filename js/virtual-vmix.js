/**
 * In-Browser Virtual vMix — Intercepts fetch for demo mode
 * Simulates the vMix Web API (XML responses on /api/)
 */
const VirtualVmix = (() => {

    function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }

    // ================================================================
    // DEMO STATE
    // ================================================================
    const _inputs = [
        { key: uuid(), number: 1, type: 'Camera',  title: 'Camera 1',     state: 'Running', duration: 0,      position: 0,     loop: false, muted: false, volume: 100, audiobusses: 'M' },
        { key: uuid(), number: 2, type: 'Camera',  title: 'Camera 2',     state: 'Running', duration: 0,      position: 0,     loop: false, muted: false, volume: 100, audiobusses: 'M' },
        { key: uuid(), number: 3, type: 'Video',   title: 'NDI Source',   state: 'Running', duration: 0,      position: 0,     loop: false, muted: false, volume: 80,  audiobusses: 'M' },
        { key: uuid(), number: 4, type: 'Video',   title: 'Media Player', state: 'Paused',  duration: 120000, position: 35000, loop: true,  muted: false, volume: 90,  audiobusses: 'M,A' },
        { key: uuid(), number: 5, type: 'Image',   title: 'Titles',       state: 'Running', duration: 0,      position: 0,     loop: false, muted: true,  volume: 0,   audiobusses: 'M' },
        { key: uuid(), number: 6, type: 'Video',   title: 'Stinger',      state: 'Paused',  duration: 2000,   position: 0,     loop: false, muted: false, volume: 100, audiobusses: 'M' },
        { key: uuid(), number: 7, type: 'Colour',  title: 'Color Bars',   state: 'Running', duration: 0,      position: 0,     loop: false, muted: true,  volume: 0,   audiobusses: 'M' },
        { key: uuid(), number: 8, type: 'Colour',  title: 'Black',        state: 'Running', duration: 0,      position: 0,     loop: false, muted: true,  volume: 0,   audiobusses: 'M' },
    ];

    let _state = {
        version: '27.0.0.49',
        edition: '4K Plus',
        activeInput: 1,
        previewInput: 2,
        overlays: [
            { number: 1, active: true,  inputNumber: 5 },
            { number: 2, active: false, inputNumber: 0 },
            { number: 3, active: false, inputNumber: 0 },
            { number: 4, active: false, inputNumber: 0 },
        ],
        recording: false,
        streaming: false,
        fadeToBlack: false,
        transition: { effect: 'Fade', duration: 1000 },
    };

    // ================================================================
    // XML BUILDER
    // ================================================================
    function boolStr(val) { return val ? 'True' : 'False'; }

    function buildVmixXml() {
        const inputsXml = _inputs.map(inp =>
            `        <input key="${inp.key}" number="${inp.number}" type="${inp.type}" ` +
            `title="${escXml(inp.title)}" state="${inp.state}" loop="${boolStr(inp.loop)}" ` +
            `muted="${boolStr(inp.muted)}" volume="${inp.volume}" audiobusses="${inp.audiobusses}" ` +
            `duration="${inp.duration}" position="${inp.position}">${escXml(inp.title)}</input>`
        ).join('\n');

        const overlaysXml = _state.overlays.map(ov =>
            `        <overlay number="${ov.number}" active="${boolStr(ov.active)}">${ov.active ? ov.inputNumber : ''}</overlay>`
        ).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<vmix>
    <version>${_state.version}</version>
    <edition>${_state.edition}</edition>
    <inputs>
${inputsXml}
    </inputs>
    <overlays>
${overlaysXml}
    </overlays>
    <preview>${_state.previewInput}</preview>
    <active>${_state.activeInput}</active>
    <fadeToBlack>${boolStr(_state.fadeToBlack)}</fadeToBlack>
    <recording>${boolStr(_state.recording)}</recording>
    <streaming>${boolStr(_state.streaming)}</streaming>
    <transition>
        <duration>${_state.transition.duration}</duration>
        <effect>${_state.transition.effect}</effect>
    </transition>
</vmix>`;
    }

    function escXml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    // ================================================================
    // FUNCTION HANDLER — processes ?Function= parameters
    // ================================================================
    function handleFunction(params) {
        const fn = params.get('Function');
        if (!fn) return;

        const input = params.get('Input');
        const value = params.get('Value');
        const inputNum = input ? parseInt(input) : null;

        switch (fn) {
            case 'ActiveInput':
                if (inputNum) _state.activeInput = inputNum;
                break;
            case 'PreviewInput':
                if (inputNum) _state.previewInput = inputNum;
                break;
            case 'Cut':
            case 'Fade': {
                const tmp = _state.activeInput;
                _state.activeInput = _state.previewInput;
                _state.previewInput = tmp;
                break;
            }
            case 'FadeToBlack':
                _state.fadeToBlack = !_state.fadeToBlack;
                break;
            case 'StartRecording':
                _state.recording = true;
                break;
            case 'StopRecording':
                _state.recording = false;
                break;
            case 'StartStreaming':
                _state.streaming = true;
                break;
            case 'StopStreaming':
                _state.streaming = false;
                break;
            case 'SetVolume': {
                const vol = value ? parseInt(value) : null;
                const inp = inputNum ? _inputs.find(i => i.number === inputNum) : null;
                if (inp && vol !== null && !isNaN(vol)) {
                    inp.volume = Math.max(0, Math.min(100, vol));
                }
                break;
            }
            case 'AudioOn': {
                const inp = inputNum ? _inputs.find(i => i.number === inputNum) : null;
                if (inp) inp.muted = false;
                break;
            }
            case 'AudioOff': {
                const inp = inputNum ? _inputs.find(i => i.number === inputNum) : null;
                if (inp) inp.muted = true;
                break;
            }
            case 'OverlayInput1On':
                _state.overlays[0].active = true;
                if (inputNum) _state.overlays[0].inputNumber = inputNum;
                break;
            case 'OverlayInput1Off':
                _state.overlays[0].active = false;
                break;
            case 'OverlayInput2On':
                _state.overlays[1].active = true;
                if (inputNum) _state.overlays[1].inputNumber = inputNum;
                break;
            case 'OverlayInput2Off':
                _state.overlays[1].active = false;
                break;
            case 'OverlayInput3On':
                _state.overlays[2].active = true;
                if (inputNum) _state.overlays[2].inputNumber = inputNum;
                break;
            case 'OverlayInput3Off':
                _state.overlays[2].active = false;
                break;
            case 'OverlayInput4On':
                _state.overlays[3].active = true;
                if (inputNum) _state.overlays[3].inputNumber = inputNum;
                break;
            case 'OverlayInput4Off':
                _state.overlays[3].active = false;
                break;
            case 'SetTransitionEffect1':
                if (value) _state.transition.effect = value;
                break;
            case 'SetTransitionDuration1':
                if (value) _state.transition.duration = parseInt(value) || 1000;
                break;
            case 'Play': {
                const inp = inputNum ? _inputs.find(i => i.number === inputNum) : null;
                if (inp) inp.state = 'Running';
                break;
            }
            case 'Pause': {
                const inp = inputNum ? _inputs.find(i => i.number === inputNum) : null;
                if (inp) inp.state = 'Paused';
                break;
            }
            case 'Loop': {
                const inp = inputNum ? _inputs.find(i => i.number === inputNum) : null;
                if (inp) inp.loop = !inp.loop;
                break;
            }
            default:
                console.log(`[VirtualVmix] Unhandled function: ${fn}`);
        }
    }

    // ================================================================
    // ROUTE HANDLER
    // ================================================================
    function handleRoute(url, fetchOpts) {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.replace(/\/$/, '');

        // /api or /api/ — main vMix API endpoint
        if (pathname === '/api' || pathname === '/API' || pathname.endsWith('/api')) {
            // Process any Function calls
            if (urlObj.searchParams.has('Function')) {
                handleFunction(urlObj.searchParams);
            }
            // Always return the full XML state
            return xmlResp(buildVmixXml());
        }

        // Fallback
        return xmlResp(buildVmixXml());
    }

    function jsonResp(data) {
        return new Response(JSON.stringify(data), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });
    }

    function xmlResp(data) {
        return new Response(data, {
            status: 200, headers: { 'Content-Type': 'text/xml' }
        });
    }

    // ================================================================
    // VIRTUAL WEBSOCKET — sends periodic tally updates
    // ================================================================
    class VmixVirtualWS {
        constructor() {
            this.readyState = 0;
            this._handlers = { open: [], message: [], close: [], error: [] };
            this._interval = null;
            setTimeout(() => {
                this.readyState = 1;
                this._emit('open', { type: 'open' });
                // Send initial tally
                this._sendTally();
                // Periodic tally updates
                this._interval = setInterval(() => {
                    if (this.readyState === 1) this._sendTally();
                }, 5000);
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
                const msg = String(data).trim();
                if (msg === 'SUBSCRIBE TALLY') {
                    console.log('[VirtualVmix WS] Subscribed to TALLY');
                    this._sendTally();
                } else if (msg === 'SUBSCRIBE ACTS') {
                    console.log('[VirtualVmix WS] Subscribed to ACTS');
                } else if (msg.startsWith('FUNCTION')) {
                    console.log('[VirtualVmix WS] Function via WS:', msg);
                }
            } catch {}
        }

        close() {
            this.readyState = 3;
            if (this._interval) { clearInterval(this._interval); this._interval = null; }
            this._emit('close', { type: 'close', code: 1000, reason: 'Normal' });
        }

        _emit(type, event) { (this._handlers[type] || []).forEach(fn => fn(event)); }

        _sendTally() {
            // vMix tally format: "TALLY OK 12001000"
            // Each digit = input state: 0=off, 1=active(program), 2=preview
            let tally = '';
            for (let i = 0; i < _inputs.length; i++) {
                const num = _inputs[i].number;
                if (num === _state.activeInput) tally += '1';
                else if (num === _state.previewInput) tally += '2';
                else tally += '0';
            }
            this._emit('message', { data: `TALLY OK ${tally}` });
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

        console.log('[VirtualVmix] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        if (_virtualWs) { _virtualWs.close(); _virtualWs = null; }
        console.log('[VirtualVmix] Deactivated');
    }

    function isActive() { return _active; }

    function createWebSocket() {
        _virtualWs = new VmixVirtualWS();
        return _virtualWs;
    }

    return { activate, deactivate, isActive, createWebSocket };
})();
