/**
 * In-Browser Virtual Barco E2/S3 — Intercepts fetch for demo mode
 * Simulates the Barco E2/S3 JSON-RPC 2.0 API (port 9999, /api)
 */
const VirtualBarco = (() => {

    // ================================================================
    // DEMO DATA
    // ================================================================

    const SCREEN_DESTINATIONS = [
        { id: 0, name: 'Main LED Wall', hSize: 3840, vSize: 2160, layers: 4, frozen: false },
        { id: 1, name: 'Side Screen L', hSize: 1920, vSize: 1080, layers: 2, frozen: false },
        { id: 2, name: 'Side Screen R', hSize: 1920, vSize: 1080, layers: 2, frozen: false },
        { id: 3, name: 'IMAG Screen', hSize: 1920, vSize: 1080, layers: 3, frozen: false },
    ];

    const SOURCES = [
        { id: 0, name: 'Camera 1', type: 'input', hSize: 1920, vSize: 1080, inputNum: 1 },
        { id: 1, name: 'Camera 2', type: 'input', hSize: 1920, vSize: 1080, inputNum: 2 },
        { id: 2, name: 'Camera 3', type: 'input', hSize: 1920, vSize: 1080, inputNum: 3 },
        { id: 3, name: 'Laptop 1', type: 'input', hSize: 1920, vSize: 1080, inputNum: 4 },
        { id: 4, name: 'Laptop 2', type: 'input', hSize: 1920, vSize: 1080, inputNum: 5 },
        { id: 5, name: 'Media Player', type: 'input', hSize: 1920, vSize: 1080, inputNum: 6 },
    ];

    const PRESETS = [
        { id: 0, name: 'Full Screen Cam1', sno: 1 },
        { id: 1, name: 'Side by Side', sno: 2 },
        { id: 2, name: 'PIP Lower Right', sno: 3 },
        { id: 3, name: 'Triple Split', sno: 4 },
        { id: 4, name: 'Laptop Full', sno: 5 },
        { id: 5, name: 'Media Playback', sno: 6 },
        { id: 6, name: 'Awards Layout', sno: 7 },
        { id: 7, name: 'Blackout', sno: 8 },
    ];

    const AUX_DESTINATIONS = [
        { id: 0, name: 'Confidence Monitor', hSize: 1920, vSize: 1080, sourceId: 0 },
        { id: 1, name: 'Record Feed', hSize: 1920, vSize: 1080, sourceId: 5 },
    ];

    const FRAME_SETTINGS = {
        hSize: 3840,
        vSize: 2160,
        outputs: [
            { id: 0, name: 'Output 1', hSize: 1920, vSize: 1080, connector: 'HDMI', enabled: true },
            { id: 1, name: 'Output 2', hSize: 1920, vSize: 1080, connector: 'HDMI', enabled: true },
            { id: 2, name: 'Output 3', hSize: 1920, vSize: 1080, connector: 'HDMI', enabled: true },
            { id: 3, name: 'Output 4', hSize: 1920, vSize: 1080, connector: 'HDMI', enabled: true },
        ],
    };

    // Mutable state
    let activePresetId = 0;
    let previewPresetId = -1;

    // Build layer data for destinations
    function buildLayers(destId) {
        const dest = SCREEN_DESTINATIONS.find(d => d.id === destId);
        if (!dest) return [];
        const count = dest.layers || 2;
        const layers = [];
        for (let i = 0; i < count; i++) {
            layers.push({
                id: i,
                name: `Layer ${i + 1}`,
                sourceId: i < SOURCES.length ? SOURCES[i].id : -1,
                sourceName: i < SOURCES.length ? SOURCES[i].name : 'None',
                hPos: 0,
                vPos: 0,
                hSize: dest.hSize,
                vSize: dest.vSize,
                priority: i,
            });
        }
        return layers;
    }

    // ================================================================
    // JSON-RPC METHOD HANDLER
    // ================================================================
    function handleMethod(method, params) {
        switch (method) {

            case 'listDestinations':
                return SCREEN_DESTINATIONS;

            case 'listScreenDestinations':
                return SCREEN_DESTINATIONS;

            case 'listSources':
                return SOURCES;

            case 'listPresets':
                return PRESETS;

            case 'activatePreset': {
                const preset = PRESETS.find(p => p.id === params.id);
                if (!preset) return { success: false, error: 'Preset not found' };
                if (params.type === 1) {
                    previewPresetId = params.id;
                } else {
                    activePresetId = params.id;
                }
                return { success: true, presetId: params.id, type: params.type };
            }

            case 'recallPreset': {
                const preset = PRESETS.find(p => p.id === params.id);
                if (!preset) return { success: false, error: 'Preset not found' };
                activePresetId = params.id;
                return { success: true, presetId: params.id };
            }

            case 'transition': {
                if (previewPresetId >= 0) {
                    activePresetId = previewPresetId;
                    previewPresetId = -1;
                }
                return { success: true, type: params.type, duration: params.duration || 0 };
            }

            case 'freezeDestination': {
                const dest = SCREEN_DESTINATIONS.find(d => d.id === params.id);
                if (!dest) return { success: false, error: 'Destination not found' };
                dest.frozen = true;
                return { success: true, id: params.id, frozen: true };
            }

            case 'unfreezeDestination': {
                const dest = SCREEN_DESTINATIONS.find(d => d.id === params.id);
                if (!dest) return { success: false, error: 'Destination not found' };
                dest.frozen = false;
                return { success: true, id: params.id, frozen: false };
            }

            case 'changeAuxContent': {
                const aux = AUX_DESTINATIONS.find(a => a.id === params.id);
                if (!aux) return { success: false, error: 'Aux destination not found' };
                aux.sourceId = params.sourceId;
                return { success: true, id: params.id, sourceId: params.sourceId };
            }

            case 'changeContent': {
                return { success: true, destId: params.destId, layerIdx: params.layerIdx, sourceId: params.sourceId };
            }

            case 'listLayers': {
                return buildLayers(params.destId);
            }

            case 'listAuxDestinations':
                return AUX_DESTINATIONS;

            case 'getFrameSettings':
                return FRAME_SETTINGS;

            case 'powerStatus':
                return {
                    status: 'on',
                    computerName: 'Barco E2 (Virtual)',
                    softwareVersion: '8.3.0 (Virtual)',
                    uptime: 86400,
                    activePreset: activePresetId,
                    previewPreset: previewPresetId,
                };

            default:
                return { error: `Unknown method: ${method}` };
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

        window.fetch = function(url, options) {
            if (typeof url === 'string' && url.startsWith(_activeBaseUrl)) {
                // Parse JSON-RPC body
                let rpcRequest;
                try {
                    rpcRequest = JSON.parse(options?.body || '{}');
                } catch {
                    return Promise.resolve(new Response(JSON.stringify({
                        jsonrpc: '2.0',
                        error: { code: -32700, message: 'Parse error' },
                        id: null,
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }));
                }

                const result = handleMethod(rpcRequest.method || '', rpcRequest.params || {});

                const rpcResponse = {
                    jsonrpc: '2.0',
                    result,
                    id: rpcRequest.id || 0,
                };

                return Promise.resolve(new Response(JSON.stringify(rpcResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }));
            }
            return _originalFetch.apply(this, arguments);
        };

        console.log('[VirtualBarco] Activated — intercepting requests to', baseUrl);
    }

    function deactivate() {
        _active = false;
        _activeBaseUrl = '';
        if (_originalFetch) { window.fetch = _originalFetch; _originalFetch = null; }
        console.log('[VirtualBarco] Deactivated');
    }

    function isActive() { return _active; }

    return { activate, deactivate, isActive };
})();
