/**
 * In-Browser Virtual Pixera — Intercepts fetch for demo mode
 * Simulates the Pixera JSON-RPC 2.0 API (port 1400, POST /api)
 */
const VirtualPixera = (() => {

    // ================================================================
    // DEMO DATA
    // ================================================================

    const STATUS = {
        version: '2.0.65',
        fps: 60,
        state: 'running',
    };

    // --- Timelines ---
    const TIMELINES = {
        1001: {
            handle: 1001,
            name: 'Main Show',
            state: 'playing',
            duration: 3600,
            currentTime: 245.5,
            loop: false,
            fps: 60,
        },
        1002: {
            handle: 1002,
            name: 'Background Loop',
            state: 'playing',
            duration: 300,
            currentTime: 42.8,
            loop: true,
            fps: 60,
        },
        1003: {
            handle: 1003,
            name: 'Lower Thirds',
            state: 'paused',
            duration: 60,
            currentTime: 12.0,
            loop: false,
            fps: 30,
        },
        1004: {
            handle: 1004,
            name: 'Emergency Content',
            state: 'stopped',
            duration: 30,
            currentTime: 0,
            loop: false,
            fps: 30,
        },
    };

    // --- Layers per timeline ---
    const LAYERS = {
        // Main Show layers
        2001: { handle: 2001, timelineHandle: 1001, name: 'Video Layer',    opacity: 1.0, volume: 0.85, resource: '/media/videos/keynote_main.mp4' },
        2002: { handle: 2002, timelineHandle: 1001, name: 'Graphics Layer', opacity: 0.9, volume: 0.0,  resource: '/media/images/overlay_graphics.png' },
        2003: { handle: 2003, timelineHandle: 1001, name: 'Text Layer',     opacity: 1.0, volume: 0.0,  resource: '/media/generative/text_crawl' },
        // Background Loop layers
        2004: { handle: 2004, timelineHandle: 1002, name: 'BG Video',       opacity: 1.0, volume: 0.3,  resource: '/media/videos/ambient_loop.mp4' },
        2005: { handle: 2005, timelineHandle: 1002, name: 'BG Overlay',     opacity: 0.5, volume: 0.0,  resource: '/media/images/particle_overlay.png' },
        // Lower Thirds layers
        2006: { handle: 2006, timelineHandle: 1003, name: 'Name Plate',     opacity: 1.0, volume: 0.0,  resource: '/media/images/nameplate_template.png' },
        2007: { handle: 2007, timelineHandle: 1003, name: 'Title Bar',      opacity: 0.95, volume: 0.0, resource: '/media/images/title_bar.png' },
        // Emergency layers
        2008: { handle: 2008, timelineHandle: 1004, name: 'Alert Layer',    opacity: 1.0, volume: 1.0,  resource: '/media/videos/emergency_alert.mp4' },
    };

    // Map timeline handle -> layer handles
    const TIMELINE_LAYERS = {
        1001: [2001, 2002, 2003],
        1002: [2004, 2005],
        1003: [2006, 2007],
        1004: [2008],
    };

    // --- Screens ---
    const SCREENS = {
        3001: { handle: 3001, name: 'Main LED Wall',  width: 3840, height: 1080 },
        3002: { handle: 3002, name: 'Side Screen L',   width: 1920, height: 1080 },
        3003: { handle: 3003, name: 'Side Screen R',   width: 1920, height: 1080 },
        3004: { handle: 3004, name: 'Confidence',      width: 1920, height: 1080 },
    };

    // --- Resources ---
    const RESOURCES = [
        { handle: 4001, path: '/media/videos/keynote_main.mp4',       type: 'video',      size: 524288000, duration: 3600 },
        { handle: 4002, path: '/media/videos/ambient_loop.mp4',       type: 'video',      size: 104857600, duration: 300 },
        { handle: 4003, path: '/media/videos/emergency_alert.mp4',    type: 'video',      size: 31457280,  duration: 30 },
        { handle: 4004, path: '/media/videos/sponsor_reel.mp4',       type: 'video',      size: 209715200, duration: 120 },
        { handle: 4005, path: '/media/videos/intro_sequence.mp4',     type: 'video',      size: 157286400, duration: 45 },
        { handle: 4006, path: '/media/videos/transition_wipe.mp4',    type: 'video',      size: 10485760,  duration: 3 },
        { handle: 4007, path: '/media/images/overlay_graphics.png',   type: 'image',      size: 2097152 },
        { handle: 4008, path: '/media/images/particle_overlay.png',   type: 'image',      size: 1048576 },
        { handle: 4009, path: '/media/images/nameplate_template.png', type: 'image',      size: 524288 },
        { handle: 4010, path: '/media/images/title_bar.png',          type: 'image',      size: 409600 },
        { handle: 4011, path: '/media/images/logo_main.png',          type: 'image',      size: 819200 },
        { handle: 4012, path: '/media/images/background_static.jpg',  type: 'image',      size: 3145728 },
        { handle: 4013, path: '/media/generative/text_crawl',         type: 'generative', size: 0 },
        { handle: 4014, path: '/media/generative/color_gradient',     type: 'generative', size: 0 },
        { handle: 4015, path: '/media/generative/noise_pattern',      type: 'generative', size: 0 },
    ];

    // --- Cues per timeline ---
    const CUES = {
        1001: [
            { handle: 5001, name: 'Show Start',      time: 0,      timelineHandle: 1001 },
            { handle: 5002, name: 'Opening Video',    time: 10.0,   timelineHandle: 1001 },
            { handle: 5003, name: 'Speaker Intro',    time: 60.0,   timelineHandle: 1001 },
            { handle: 5004, name: 'Segment A',        time: 300.0,  timelineHandle: 1001 },
            { handle: 5005, name: 'Break',            time: 900.0,  timelineHandle: 1001 },
            { handle: 5006, name: 'Segment B',        time: 1200.0, timelineHandle: 1001 },
            { handle: 5007, name: 'Sponsor Roll',     time: 2700.0, timelineHandle: 1001 },
            { handle: 5008, name: 'Show End',         time: 3550.0, timelineHandle: 1001 },
        ],
        1002: [
            { handle: 5009, name: 'Loop Start',       time: 0,      timelineHandle: 1002 },
            { handle: 5010, name: 'Color Shift',      time: 150.0,  timelineHandle: 1002 },
        ],
        1003: [
            { handle: 5011, name: 'Name In',          time: 0,      timelineHandle: 1003 },
            { handle: 5012, name: 'Name Out',         time: 5.0,    timelineHandle: 1003 },
        ],
        1004: [
            { handle: 5013, name: 'Alert Trigger',    time: 0,      timelineHandle: 1004 },
        ],
    };

    // Master brightness/volume
    let masterBrightness = 1.0;
    let masterVolume = 0.8;

    // ================================================================
    // Advance playing timelines (called periodically when active)
    // ================================================================
    let _tickInterval = null;

    function tick() {
        for (const tl of Object.values(TIMELINES)) {
            if (tl.state === 'playing') {
                tl.currentTime += 0.1;
                if (tl.currentTime >= tl.duration) {
                    tl.currentTime = tl.loop ? 0 : tl.duration;
                    if (!tl.loop) tl.state = 'stopped';
                }
            }
        }
    }

    // ================================================================
    // JSON-RPC HANDLER
    // ================================================================
    function handleRpc(body) {
        const { method, params, id } = body;

        function ok(result) { return { jsonrpc: '2.0', result, id }; }
        function err(code, message) { return { jsonrpc: '2.0', error: { code, message }, id }; }

        switch (method) {

            // --- Utility ---
            case 'Pixera.Utility.getStatus':
                return ok(STATUS);

            case 'Pixera.Utility.setMasterBrightness':
                masterBrightness = params.value ?? masterBrightness;
                return ok(masterBrightness);

            case 'Pixera.Utility.setMasterVolume':
                masterVolume = params.value ?? masterVolume;
                return ok(masterVolume);

            // --- Timelines ---
            case 'Pixera.Timelines.getTimelines':
                return ok(Object.keys(TIMELINES).map(Number));

            case 'Pixera.Timelines.Timeline.getAttributes': {
                const tl = TIMELINES[params.handle];
                if (!tl) return err(-1, 'Timeline not found');
                return ok({ ...tl });
            }

            case 'Pixera.Timelines.Timeline.play': {
                const tl = TIMELINES[params.handle];
                if (!tl) return err(-1, 'Timeline not found');
                tl.state = 'playing';
                return ok(true);
            }

            case 'Pixera.Timelines.Timeline.pause': {
                const tl = TIMELINES[params.handle];
                if (!tl) return err(-1, 'Timeline not found');
                tl.state = 'paused';
                return ok(true);
            }

            case 'Pixera.Timelines.Timeline.stop': {
                const tl = TIMELINES[params.handle];
                if (!tl) return err(-1, 'Timeline not found');
                tl.state = 'stopped';
                tl.currentTime = 0;
                return ok(true);
            }

            case 'Pixera.Timelines.Timeline.setCurrentTime': {
                const tl = TIMELINES[params.handle];
                if (!tl) return err(-1, 'Timeline not found');
                tl.currentTime = Math.max(0, Math.min(params.time, tl.duration));
                return ok(tl.currentTime);
            }

            case 'Pixera.Timelines.Timeline.getCurrentTime': {
                const tl = TIMELINES[params.handle];
                if (!tl) return err(-1, 'Timeline not found');
                return ok(tl.currentTime);
            }

            // --- Layers ---
            case 'Pixera.Timelines.Timeline.getLayers': {
                const layerHandles = TIMELINE_LAYERS[params.handle];
                if (!layerHandles) return err(-1, 'Timeline not found');
                return ok(layerHandles);
            }

            case 'Pixera.Timelines.Layer.getAttributes': {
                const layer = LAYERS[params.handle];
                if (!layer) return err(-1, 'Layer not found');
                return ok({ ...layer });
            }

            case 'Pixera.Timelines.Layer.setOpacity': {
                const layer = LAYERS[params.handle];
                if (!layer) return err(-1, 'Layer not found');
                layer.opacity = Math.max(0, Math.min(params.opacity, 1));
                return ok(layer.opacity);
            }

            case 'Pixera.Timelines.Layer.setVolume': {
                const layer = LAYERS[params.handle];
                if (!layer) return err(-1, 'Layer not found');
                layer.volume = Math.max(0, Math.min(params.volume, 1));
                return ok(layer.volume);
            }

            case 'Pixera.Timelines.Layer.assignResource': {
                const layer = LAYERS[params.handle];
                if (!layer) return err(-1, 'Layer not found');
                layer.resource = params.path;
                return ok(true);
            }

            // --- Screens ---
            case 'Pixera.Screens.getScreens':
                return ok(Object.keys(SCREENS).map(Number));

            case 'Pixera.Screens.Screen.getAttributes': {
                const screen = SCREENS[params.handle];
                if (!screen) return err(-1, 'Screen not found');
                return ok({ ...screen });
            }

            // --- Resources ---
            case 'Pixera.Resources.getResources':
                return ok(RESOURCES.map(r => r.handle));

            // --- Cues ---
            case 'Pixera.Timelines.Timeline.getCues': {
                const cues = CUES[params.handle];
                if (!cues) return err(-1, 'Timeline not found');
                return ok(cues.map(c => c.handle));
            }

            case 'Pixera.Timelines.Cue.fire': {
                // Find the cue across all timelines
                for (const cueList of Object.values(CUES)) {
                    const cue = cueList.find(c => c.handle === params.handle);
                    if (cue) {
                        const tl = TIMELINES[cue.timelineHandle];
                        if (tl) {
                            tl.currentTime = cue.time;
                            tl.state = 'playing';
                        }
                        return ok(true);
                    }
                }
                return err(-1, 'Cue not found');
            }

            default:
                return err(-32601, `Method not found: ${method}`);
        }
    }

    // ================================================================
    // ACTIVE STATE
    // ================================================================
    let _active = false;
    let _activeBaseUrl = '';
    let _originalFetch = null;

    function activate(baseUrl) {
        if (_active && _activeBaseUrl === baseUrl) return;
        _active = true;
        _activeBaseUrl = baseUrl;
        if (!_originalFetch) _originalFetch = window.fetch;

        // Start ticking timelines
        if (_tickInterval) clearInterval(_tickInterval);
        _tickInterval = setInterval(tick, 100);

        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.startsWith(_activeBaseUrl)) {
                const method = (options?.method || 'GET').toUpperCase();

                // Intercept POST to /api (JSON-RPC endpoint)
                if (method === 'POST') {
                    let body = {};
                    try {
                        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                    } catch { /* ignore */ }

                    const result = handleRpc(body);

                    return Promise.resolve(new Response(JSON.stringify(result), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }));
                }

                // Any other method — return 200 OK
                return Promise.resolve(new Response('OK', {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' },
                }));
            }
            return _originalFetch.apply(this, arguments);
        };

        console.log('[VirtualPixera] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
        console.log('[VirtualPixera] Deactivated');
    }

    function isActive() { return _active; }

    return { activate, deactivate, isActive };
})();
