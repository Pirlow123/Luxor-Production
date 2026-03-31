/**
 * In-Browser Virtual Disguise (d3) — Intercepts fetch for demo mode
 * Simulates the Disguise d3 REST API (port 80, /api/session)
 */
const VirtualDisguise = (() => {

    // ================================================================
    // DEMO DATA
    // ================================================================

    const SESSION_STATUS = {
        state: 'playing',
        fps: 60,
        projectName: 'Corporate Event 2026',
        softwareVersion: '23.4.1 (Virtual)',
        currentTime: 125.5,
        totalDuration: 3600,
        health: 'good',
    };

    let transportState = {
        playing: true,
        speed: 1.0,
        loop: false,
        currentTime: 125.5,
        currentTimecode: '00:02:05:15',
        totalDuration: 3600,
    };

    const TRACKS = [
        { id: 1, name: 'Main Content',     type: 'video',      volume: 1.0,  brightness: 1.0,  muted: false },
        { id: 2, name: 'Background',        type: 'video',      volume: 0.8,  brightness: 0.9,  muted: false },
        { id: 3, name: 'Overlay Graphics',  type: 'video',      volume: 1.0,  brightness: 1.0,  muted: false },
        { id: 4, name: 'Audio Bed',         type: 'audio',      volume: 0.6,  brightness: 1.0,  muted: false },
        { id: 5, name: 'Lighting Data',     type: 'dmx',        volume: 1.0,  brightness: 0.85, muted: false },
        { id: 6, name: 'Notch FX',          type: 'generative', volume: 1.0,  brightness: 1.0,  muted: false },
    ];

    const SECTIONS = [
        { index: 0, name: 'Pre-Show',  startTime: 0,    endTime: 300,  timecode: '00:00:00:00' },
        { index: 1, name: 'Opening',   startTime: 300,  endTime: 600,  timecode: '00:05:00:00' },
        { index: 2, name: 'Keynote',   startTime: 600,  endTime: 1500, timecode: '00:10:00:00' },
        { index: 3, name: 'Panel 1',   startTime: 1500, endTime: 2100, timecode: '00:25:00:00' },
        { index: 4, name: 'Break',     startTime: 2100, endTime: 2400, timecode: '00:35:00:00' },
        { index: 5, name: 'Panel 2',   startTime: 2400, endTime: 3000, timecode: '00:40:00:00' },
        { index: 6, name: 'Awards',    startTime: 3000, endTime: 3300, timecode: '00:50:00:00' },
        { index: 7, name: 'Closing',   startTime: 3300, endTime: 3600, timecode: '00:55:00:00' },
    ];

    const MACHINES = [
        { id: 1, name: 'd3-Master',   role: 'master', hostname: 'd3-master.local',   ip: '192.168.1.10', online: true, health: 'good', gpuUsage: 45, cpuUsage: 32 },
        { id: 2, name: 'd3-Actor-1',  role: 'actor',  hostname: 'd3-actor-1.local',  ip: '192.168.1.11', online: true, health: 'good', gpuUsage: 72, cpuUsage: 55 },
        { id: 3, name: 'd3-Actor-2',  role: 'actor',  hostname: 'd3-actor-2.local',  ip: '192.168.1.12', online: true, health: 'good', gpuUsage: 68, cpuUsage: 50 },
    ];

    const OUTPUTS = [
        { id: 1, name: 'Main LED',  width: 3840, height: 1080, active: true, assignedMachine: 'd3-Actor-1' },
        { id: 2, name: 'Side L',    width: 1920, height: 1080, active: true, assignedMachine: 'd3-Actor-1' },
        { id: 3, name: 'Side R',    width: 1920, height: 1080, active: true, assignedMachine: 'd3-Actor-2' },
        { id: 4, name: 'Floor',     width: 1920, height: 1080, active: true, assignedMachine: 'd3-Actor-2' },
    ];

    const ANNOTATIONS = [
        { id: 1, time: 0,    timecode: '00:00:00:00', text: 'Pre-show loop begins',     color: '#4CAF50' },
        { id: 2, time: 295,  timecode: '00:04:55:00', text: 'Standby for opening',       color: '#FF9800' },
        { id: 3, time: 300,  timecode: '00:05:00:00', text: 'Opening sequence start',     color: '#2196F3' },
        { id: 4, time: 600,  timecode: '00:10:00:00', text: 'Keynote presentation',       color: '#2196F3' },
        { id: 5, time: 1500, timecode: '00:25:00:00', text: 'Panel 1 discussion',         color: '#9C27B0' },
        { id: 6, time: 2100, timecode: '00:35:00:00', text: 'Break — hold pattern',       color: '#FF9800' },
        { id: 7, time: 3000, timecode: '00:50:00:00', text: 'Awards ceremony',            color: '#F44336' },
        { id: 8, time: 3300, timecode: '00:55:00:00', text: 'Closing remarks',            color: '#4CAF50' },
    ];

    const RENDERSTREAM = {
        enabled: true,
        status: 'streaming',
        frameRate: 60,
        resolution: { width: 3840, height: 2160 },
        codec: 'NDI',
        streams: [
            { name: 'Main Output', active: true, fps: 60 },
            { name: 'Preview', active: true, fps: 30 },
        ],
    };

    let masterBrightness = 1.0;
    let masterVolume = 1.0;

    // ================================================================
    // ROUTE HANDLER
    // ================================================================
    function handleRoute(pathname, fetchOpts) {
        const method = fetchOpts?.method?.toUpperCase() || 'GET';
        let body = {};
        if (fetchOpts?.body) {
            try { body = typeof fetchOpts.body === 'string' ? JSON.parse(fetchOpts.body) : fetchOpts.body; } catch {}
        }

        // --- Session Status ---
        if (pathname === '/session/status' && method === 'GET') {
            return { json: { ...SESSION_STATUS, currentTime: transportState.currentTime } };
        }

        // --- Transport ---
        if (pathname === '/session/transport' && method === 'GET') {
            return { json: { ...transportState } };
        }
        if (pathname === '/session/transport/play' && method === 'POST') {
            transportState.playing = true;
            return { json: { status: 'playing' } };
        }
        if (pathname === '/session/transport/pause' && method === 'POST') {
            transportState.playing = false;
            return { json: { status: 'paused' } };
        }
        if (pathname === '/session/transport/stop' && method === 'POST') {
            transportState.playing = false;
            transportState.currentTime = 0;
            transportState.currentTimecode = '00:00:00:00';
            return { json: { status: 'stopped' } };
        }
        if (pathname === '/session/transport/goToTime' && method === 'POST') {
            transportState.currentTime = body.time || 0;
            return { json: { currentTime: transportState.currentTime } };
        }
        if (pathname === '/session/transport/goToNextSection' && method === 'POST') {
            const current = transportState.currentTime;
            const next = SECTIONS.find(s => s.startTime > current);
            if (next) {
                transportState.currentTime = next.startTime;
                transportState.currentTimecode = next.timecode;
            }
            return { json: { currentTime: transportState.currentTime } };
        }
        if (pathname === '/session/transport/goToPrevSection' && method === 'POST') {
            const current = transportState.currentTime;
            let prev = SECTIONS[0];
            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                if (SECTIONS[i].startTime < current - 1) { prev = SECTIONS[i]; break; }
            }
            transportState.currentTime = prev.startTime;
            transportState.currentTimecode = prev.timecode;
            return { json: { currentTime: transportState.currentTime } };
        }
        if (pathname === '/session/transport/goToSection' && method === 'POST') {
            const idx = body.index ?? 0;
            const section = SECTIONS[idx];
            if (section) {
                transportState.currentTime = section.startTime;
                transportState.currentTimecode = section.timecode;
            }
            return { json: { currentTime: transportState.currentTime } };
        }

        // --- Tracks ---
        const trackMatch = pathname.match(/^\/session\/tracks\/(\d+)(?:\/(.+))?$/);
        if (pathname === '/session/tracks' && method === 'GET') {
            return { json: TRACKS };
        }
        if (trackMatch) {
            const trackId = parseInt(trackMatch[1]);
            const sub = trackMatch[2];
            const track = TRACKS.find(t => t.id === trackId);
            if (!track) return { status: 404, text: 'Track not found' };

            if (!sub && method === 'GET') {
                return { json: track };
            }
            if (sub === 'volume' && method === 'PUT') {
                track.volume = body.volume ?? track.volume;
                return { json: { id: track.id, volume: track.volume } };
            }
            if (sub === 'brightness' && method === 'PUT') {
                track.brightness = body.brightness ?? track.brightness;
                return { json: { id: track.id, brightness: track.brightness } };
            }
            if (sub === 'mute' && method === 'POST') {
                track.muted = true;
                return { json: { id: track.id, muted: true } };
            }
            if (sub === 'unmute' && method === 'POST') {
                track.muted = false;
                return { json: { id: track.id, muted: false } };
            }
        }

        // --- Sections ---
        if (pathname === '/session/sections' && method === 'GET') {
            return { json: SECTIONS };
        }

        // --- Annotations ---
        if (pathname === '/session/annotations' && method === 'GET') {
            return { json: ANNOTATIONS };
        }

        // --- Render Stream ---
        if (pathname === '/session/renderstream' && method === 'GET') {
            return { json: RENDERSTREAM };
        }

        // --- Machines ---
        if (pathname === '/session/machines' && method === 'GET') {
            return { json: MACHINES };
        }

        // --- Outputs ---
        if (pathname === '/session/outputs' && method === 'GET') {
            return { json: OUTPUTS };
        }

        // --- Master Controls ---
        if (pathname === '/session/master/brightness' && method === 'PUT') {
            masterBrightness = body.value ?? masterBrightness;
            return { json: { value: masterBrightness } };
        }
        if (pathname === '/session/master/volume' && method === 'PUT') {
            masterVolume = body.value ?? masterVolume;
            return { json: { value: masterVolume } };
        }

        return { text: 'OK' };
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

        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.startsWith(_activeBaseUrl)) {
                const pathname = url.slice(_activeBaseUrl.length);
                const result = handleRoute(decodeURIComponent(pathname), options);
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

        console.log('[VirtualDisguise] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        console.log('[VirtualDisguise] Deactivated');
    }

    function isActive() { return _active; }

    return { activate, deactivate, isActive };
})();
