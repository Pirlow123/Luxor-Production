/**
 * In-Browser Virtual QLab — Mock WebSocket for demo mode
 * Simulates QLab JSON-over-WebSocket protocol so QlabAPI can connect
 * without a real QLab instance.
 * Since QLab uses WebSocket (not HTTP fetch), this provides a fake WebSocket
 * object that speaks the QLab address/reply protocol.
 */
const VirtualQlab = (() => {

    let _active = false;

    // ================================================================
    // VIRTUAL STATE — WORKSPACES
    // ================================================================

    const WORKSPACE_ID = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';

    const WORKSPACES = [
        {
            uniqueID: WORKSPACE_ID,
            displayName: 'Main Show',
            hasPasscode: false,
            port: 53000,
            version: '5.3.2',
        },
    ];

    // ================================================================
    // VIRTUAL STATE — CUES
    // ================================================================

    const MAIN_CUE_LIST_ID = 'CL-MAIN-0001';
    const PRE_SHOW_LIST_ID = 'CL-PRE-0001';

    const MAIN_CUES = [
        { uniqueID: 'CUE-001', number: '1',  name: 'House Open',       type: 'Audio', duration: 300, colorName: 'blue',   flagged: false, armed: true  },
        { uniqueID: 'CUE-002', number: '2',  name: 'Pre-Show Video',   type: 'Video', duration: 180, colorName: 'purple', flagged: false, armed: true  },
        { uniqueID: 'CUE-003', number: '3',  name: 'Welcome Music',    type: 'Audio', duration: 60,  colorName: 'blue',   flagged: false, armed: true  },
        { uniqueID: 'CUE-004', number: '4',  name: 'Lights Down',      type: 'Light', duration: 3,   colorName: 'yellow', flagged: true,  armed: true  },
        { uniqueID: 'CUE-005', number: '5',  name: 'Intro Video',      type: 'Video', duration: 45,  colorName: 'purple', flagged: false, armed: true  },
        { uniqueID: 'CUE-006', number: '6',  name: 'Speaker Walk-on',  type: 'Audio', duration: 10,  colorName: 'blue',   flagged: false, armed: true  },
        {
            uniqueID: 'CUE-007', number: '7', name: 'Keynote Start', type: 'Group', duration: 0, colorName: 'green', flagged: true, armed: true,
            cues: [
                { uniqueID: 'CUE-007A', number: '7.1', name: 'Keynote Lights',    type: 'Light', duration: 2,   colorName: 'yellow', flagged: false, armed: true },
                { uniqueID: 'CUE-007B', number: '7.2', name: 'Keynote Lower Third', type: 'Video', duration: 5, colorName: 'purple', flagged: false, armed: true },
                { uniqueID: 'CUE-007C', number: '7.3', name: 'Keynote Mic Open',  type: 'Mic',   duration: 0,   colorName: 'red',    flagged: false, armed: true },
            ],
        },
        { uniqueID: 'CUE-008', number: '8',  name: 'Break Music',      type: 'Audio', duration: 600, colorName: 'blue',   flagged: false, armed: true  },
        { uniqueID: 'CUE-009', number: '9',  name: 'Panel Discussion', type: 'Mic',   duration: 0,   colorName: 'red',    flagged: false, armed: true  },
        { uniqueID: 'CUE-010', number: '10', name: 'Award Sting',      type: 'Video', duration: 8,   colorName: 'purple', flagged: true,  armed: true  },
        { uniqueID: 'CUE-011', number: '11', name: 'Closing Video',    type: 'Video', duration: 120, colorName: 'purple', flagged: false, armed: true  },
        { uniqueID: 'CUE-012', number: '12', name: 'House Lights Up',  type: 'Light', duration: 5,   colorName: 'yellow', flagged: false, armed: true  },
    ];

    const PRE_SHOW_CUES = [
        { uniqueID: 'CUE-101', number: '101', name: 'Holding Slide',  type: 'Video', duration: 0,   colorName: 'purple', flagged: false, armed: true },
        { uniqueID: 'CUE-102', number: '102', name: 'Ambient Music',  type: 'Audio', duration: 900, colorName: 'blue',   flagged: false, armed: true },
    ];

    const CUE_LISTS = [
        {
            uniqueID: MAIN_CUE_LIST_ID,
            number: '',
            name: 'Main Cue List',
            type: 'Cue List',
            cues: MAIN_CUES,
        },
        {
            uniqueID: PRE_SHOW_LIST_ID,
            number: '',
            name: 'Pre-Show',
            type: 'Cue List',
            cues: PRE_SHOW_CUES,
        },
    ];

    // ================================================================
    // PLAYBACK STATE
    // ================================================================

    let _state = {
        playbackPosition: '1',   // current cue number
        running: true,           // Q1 "House Open" is running
        paused: false,
        masterVolume: 1.0,       // 0 dB
        runningCues: { 'CUE-001': true }, // track which cues are running
    };

    // Build a flat lookup of all cues by number and uniqueID
    function _allCues() {
        const all = [];
        function collect(cues) {
            for (const c of cues) {
                all.push(c);
                if (c.cues) collect(c.cues);
            }
        }
        CUE_LISTS.forEach(cl => collect(cl.cues));
        return all;
    }

    function _findCue(numberOrId) {
        const all = _allCues();
        return all.find(c => c.number === numberOrId || c.uniqueID === numberOrId);
    }

    // ================================================================
    // ACTIVATION
    // ================================================================

    function activate()   { _active = true; }
    function deactivate() { _active = false; }
    function isActive()   { return _active; }

    // ================================================================
    // MOCK WEBSOCKET FACTORY
    // ================================================================

    function createWebSocket() {
        const ws = new EventTarget();
        ws.readyState = WebSocket.CONNECTING;
        ws.close = () => { ws.readyState = WebSocket.CLOSED; };
        ws.send = (data) => {
            const msg = JSON.parse(data);
            // Handle asynchronously to mimic real network
            setTimeout(() => handleMessage(ws, msg), 5);
        };

        // QLab opens and is ready immediately (no handshake like OBS)
        setTimeout(() => {
            ws.readyState = WebSocket.OPEN;
            fireEvent(ws, 'open');
        }, 50);

        return ws;
    }

    // ================================================================
    // MESSAGE DISPATCH
    // ================================================================

    function dispatch(ws, msg) {
        const event = new MessageEvent('message', { data: JSON.stringify(msg) });
        ws.dispatchEvent(event);
        if (typeof ws.onmessage === 'function') ws.onmessage(event);
    }

    function fireEvent(ws, eventName) {
        const event = new Event(eventName);
        ws.dispatchEvent(event);
        const handler = ws['on' + eventName];
        if (typeof handler === 'function') handler(event);
    }

    // ================================================================
    // INCOMING MESSAGE HANDLER
    // ================================================================

    function handleMessage(ws, msg) {
        const { address, args } = msg;
        routeRequest(ws, address || '', args || []);
    }

    // ================================================================
    // REQUEST ROUTER
    // ================================================================

    function routeRequest(ws, address, args) {
        let data = null;
        let status = 'ok';

        // --- /workspaces ---
        if (address === '/workspaces') {
            data = WORKSPACES;
        }

        // --- /workspace/<id> ---
        else if (/^\/workspace\/[^/]+$/.test(address) && !address.includes('/cueLists') && !address.includes('/cue/')) {
            data = WORKSPACES[0];
        }

        // --- /workspace/<id>/cueLists ---
        else if (/^\/workspace\/[^/]+\/cueLists$/.test(address)) {
            data = CUE_LISTS;
        }

        // --- /workspace/<id>/cue/<cueId>/<property> (SET) ---
        else if (/^\/workspace\/[^/]+\/cue\/[^/]+\/[^/]+$/.test(address)) {
            const parts = address.split('/');
            // parts: ['', 'workspace', wsId, 'cue', cueNumber, action]
            const cueNumber = parts[4];
            const action = parts[5];

            const cue = _findCue(cueNumber);

            if (action === 'start') {
                if (cue) {
                    _state.runningCues[cue.uniqueID] = true;
                    _state.running = true;
                    _state.paused = false;
                }
                data = 'ok';
            } else if (action === 'stop') {
                if (cue) {
                    delete _state.runningCues[cue.uniqueID];
                }
                data = 'ok';
            } else if (args.length > 0 && cue) {
                // setCueProperty
                cue[action] = args[0];
                data = 'ok';
            } else if (cue) {
                // getCue property
                data = cue[action] !== undefined ? cue[action] : null;
            } else {
                status = 'error';
                data = `Cue not found: ${cueNumber}`;
            }
        }

        // --- /workspace/<id>/cue/<cueId> (GET cue) ---
        else if (/^\/workspace\/[^/]+\/cue\/[^/]+$/.test(address)) {
            const parts = address.split('/');
            const cueId = parts[4];
            const cue = _findCue(cueId);
            data = cue || null;
            if (!cue) status = 'error';
        }

        // --- /workspace/<id>/go ---
        else if (/^\/workspace\/[^/]+\/go$/.test(address)) {
            const cue = _findCue(_state.playbackPosition);
            if (cue) {
                _state.runningCues[cue.uniqueID] = true;
                _state.running = true;
                _state.paused = false;
                // Advance playback position to next cue
                _advancePlaybackPosition();
            }
            data = 'ok';
        }

        // --- /workspace/<id>/stop ---
        else if (/^\/workspace\/[^/]+\/stop$/.test(address)) {
            _state.runningCues = {};
            _state.running = false;
            _state.paused = false;
            data = 'ok';
        }

        // --- /workspace/<id>/pause ---
        else if (/^\/workspace\/[^/]+\/pause$/.test(address)) {
            _state.paused = true;
            data = 'ok';
        }

        // --- /workspace/<id>/resume ---
        else if (/^\/workspace\/[^/]+\/resume$/.test(address)) {
            _state.paused = false;
            data = 'ok';
        }

        // --- /workspace/<id>/reset ---
        else if (/^\/workspace\/[^/]+\/reset$/.test(address)) {
            _state.runningCues = {};
            _state.running = false;
            _state.paused = false;
            _state.playbackPosition = '1';
            data = 'ok';
        }

        // --- /workspace/<id>/panic ---
        else if (/^\/workspace\/[^/]+\/panic$/.test(address)) {
            _state.runningCues = {};
            _state.running = false;
            _state.paused = false;
            data = 'ok';
        }

        // --- /workspace/<id>/playbackPosition ---
        else if (/^\/workspace\/[^/]+\/playbackPosition$/.test(address)) {
            data = _state.playbackPosition;
        }

        // --- /workspace/<id>/next ---
        else if (/^\/workspace\/[^/]+\/next$/.test(address)) {
            _advancePlaybackPosition();
            data = 'ok';
        }

        // --- /workspace/<id>/previous ---
        else if (/^\/workspace\/[^/]+\/previous$/.test(address)) {
            _retreatPlaybackPosition();
            data = 'ok';
        }

        // --- /workspace/<id>/masterVolume ---
        else if (/^\/workspace\/[^/]+\/masterVolume$/.test(address)) {
            if (args.length > 0) {
                _state.masterVolume = args[0];
            }
            data = _state.masterVolume;
        }

        // --- Fallback ---
        else {
            status = 'error';
            data = `Unknown address: ${address}`;
        }

        // Send reply
        dispatch(ws, {
            address: `/reply${address}`,
            data,
            status,
        });
    }

    // ================================================================
    // PLAYBACK POSITION HELPERS
    // ================================================================

    function _getMainCueNumbers() {
        return MAIN_CUES.map(c => c.number);
    }

    function _advancePlaybackPosition() {
        const numbers = _getMainCueNumbers();
        const idx = numbers.indexOf(_state.playbackPosition);
        if (idx >= 0 && idx < numbers.length - 1) {
            _state.playbackPosition = numbers[idx + 1];
        }
    }

    function _retreatPlaybackPosition() {
        const numbers = _getMainCueNumbers();
        const idx = numbers.indexOf(_state.playbackPosition);
        if (idx > 0) {
            _state.playbackPosition = numbers[idx - 1];
        }
    }

    // ================================================================
    // PUBLIC API
    // ================================================================

    return {
        activate,
        deactivate,
        isActive,
        createWebSocket,
    };

})();
