/**
 * In-Browser Virtual OBS Studio — Mock WebSocket for demo mode
 * Simulates obs-websocket v5 protocol so ObsAPI can connect without a real OBS instance.
 * Since OBS uses WebSocket (not HTTP fetch), this provides a fake WebSocket object
 * that speaks the obs-websocket v5 op-code protocol.
 */
const VirtualObs = (() => {

    let _active = false;

    // ================================================================
    // VIRTUAL STATE
    // ================================================================

    const SCENES = [
        { sceneName: 'Main Camera',    sceneIndex: 0 },
        { sceneName: 'Screen Share',   sceneIndex: 1 },
        { sceneName: 'BRB',            sceneIndex: 2 },
        { sceneName: 'Starting Soon',  sceneIndex: 3 },
        { sceneName: 'Ending',         sceneIndex: 4 },
        { sceneName: 'Just Chatting',  sceneIndex: 5 },
    ];

    const SCENE_ITEMS = {
        'Main Camera': [
            { sceneItemId: 1, sourceName: 'Webcam',    inputKind: 'v4l2_input',            sceneItemEnabled: true },
            { sceneItemId: 2, sourceName: 'Mic Audio',  inputKind: 'wasapi_input_capture',  sceneItemEnabled: true },
            { sceneItemId: 3, sourceName: 'Overlay',    inputKind: 'image_source',          sceneItemEnabled: true },
        ],
        'Screen Share': [
            { sceneItemId: 4, sourceName: 'Display Capture', inputKind: 'monitor_capture',       sceneItemEnabled: true },
            { sceneItemId: 5, sourceName: 'Mic Audio',       inputKind: 'wasapi_input_capture',  sceneItemEnabled: true },
        ],
        'BRB': [
            { sceneItemId: 6, sourceName: 'BRB Image',  inputKind: 'image_source',          sceneItemEnabled: true },
            { sceneItemId: 7, sourceName: 'Media Source', inputKind: 'ffmpeg_source',        sceneItemEnabled: true },
        ],
        'Starting Soon': [
            { sceneItemId: 8, sourceName: 'Starting Image', inputKind: 'image_source',      sceneItemEnabled: true },
            { sceneItemId: 9, sourceName: 'Desktop Audio',  inputKind: 'wasapi_output_capture', sceneItemEnabled: true },
        ],
        'Ending': [
            { sceneItemId: 10, sourceName: 'Ending Image', inputKind: 'image_source',       sceneItemEnabled: true },
        ],
        'Just Chatting': [
            { sceneItemId: 11, sourceName: 'Webcam',       inputKind: 'v4l2_input',            sceneItemEnabled: true },
            { sceneItemId: 12, sourceName: 'Desktop Audio', inputKind: 'wasapi_output_capture', sceneItemEnabled: true },
            { sceneItemId: 13, sourceName: 'Overlay',       inputKind: 'image_source',          sceneItemEnabled: false },
        ],
    };

    const INPUTS = [
        { inputName: 'Webcam',          inputKind: 'v4l2_input',            unversionedInputKind: 'v4l2_input' },
        { inputName: 'Display Capture', inputKind: 'monitor_capture',       unversionedInputKind: 'monitor_capture' },
        { inputName: 'Mic Audio',       inputKind: 'wasapi_input_capture',  unversionedInputKind: 'wasapi_input_capture' },
        { inputName: 'Desktop Audio',   inputKind: 'wasapi_output_capture', unversionedInputKind: 'wasapi_output_capture' },
        { inputName: 'Media Source',    inputKind: 'ffmpeg_source',         unversionedInputKind: 'ffmpeg_source' },
        { inputName: 'Overlay',         inputKind: 'image_source',          unversionedInputKind: 'image_source' },
    ];

    let _state = {
        currentProgramSceneName: 'Main Camera',
        currentPreviewSceneName: 'Screen Share',
        studioMode: true,
        recording: false,
        streaming: false,
        recordTimecode: '00:00:00.000',
        streamTimecode: '00:00:00.000',
        outputDuration: 0,
        inputs: {},
    };

    // Initialise per-input state
    INPUTS.forEach(inp => {
        _state.inputs[inp.inputName] = {
            inputVolumeDb: -10,
            inputVolumeMul: 0.316,
            inputMuted: false,
        };
    });

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

        // Send Hello (op 0) after a tick, just like the real server
        setTimeout(() => {
            ws.readyState = WebSocket.OPEN;
            dispatch(ws, {
                op: 0,
                d: {
                    obsWebSocketVersion: '5.4.0',
                    rpcVersion: 1,
                },
            });
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
        // op 1 = Identify (client handshake)
        if (msg.op === 1) {
            dispatch(ws, { op: 2, d: { negotiatedRpcVersion: 1 } });
            return;
        }

        // op 6 = Request
        if (msg.op === 6) {
            handleRequest(ws, msg.d);
        }
    }

    // ================================================================
    // REQUEST ROUTER
    // ================================================================

    function handleRequest(ws, req) {
        const { requestType, requestId, requestData } = req;
        let responseData = {};
        let success = true;

        switch (requestType) {

            // --- Version ---
            case 'GetVersion':
                responseData = {
                    obsVersion: '30.2.3',
                    obsWebSocketVersion: '5.4.0',
                    rpcVersion: 1,
                    availableRequests: [],
                    supportedImageFormats: ['png', 'jpg', 'bmp'],
                    platform: 'windows',
                    platformDescription: 'Windows 11 (Virtual)',
                };
                break;

            // --- Scenes ---
            case 'GetSceneList':
                responseData = {
                    currentProgramSceneName: _state.currentProgramSceneName,
                    currentPreviewSceneName: _state.currentPreviewSceneName,
                    scenes: SCENES.slice().reverse(),
                };
                break;

            case 'GetCurrentProgramScene':
                responseData = { currentProgramSceneName: _state.currentProgramSceneName };
                break;

            case 'SetCurrentProgramScene':
                if (requestData?.sceneName) {
                    _state.currentProgramSceneName = requestData.sceneName;
                }
                responseData = {};
                break;

            case 'GetCurrentPreviewScene':
                responseData = { currentPreviewSceneName: _state.currentPreviewSceneName };
                break;

            case 'SetCurrentPreviewScene':
                if (requestData?.sceneName) {
                    _state.currentPreviewSceneName = requestData.sceneName;
                }
                responseData = {};
                break;

            // --- Scene Items ---
            case 'GetSceneItemList': {
                const scene = requestData?.sceneName || _state.currentProgramSceneName;
                const items = SCENE_ITEMS[scene] || [];
                responseData = { sceneItems: items };
                break;
            }

            case 'SetSceneItemEnabled': {
                const scene = requestData?.sceneName;
                const itemId = requestData?.sceneItemId;
                const enabled = requestData?.sceneItemEnabled;
                if (scene && SCENE_ITEMS[scene]) {
                    const item = SCENE_ITEMS[scene].find(i => i.sceneItemId === itemId);
                    if (item) item.sceneItemEnabled = enabled;
                }
                responseData = {};
                break;
            }

            // --- Inputs / Sources ---
            case 'GetInputList':
                responseData = { inputs: INPUTS };
                break;

            case 'SetInputVolume': {
                const name = requestData?.inputName;
                if (name && _state.inputs[name]) {
                    if (requestData.inputVolumeDb !== undefined) {
                        _state.inputs[name].inputVolumeDb = requestData.inputVolumeDb;
                        _state.inputs[name].inputVolumeMul = Math.pow(10, requestData.inputVolumeDb / 20);
                    }
                    if (requestData.inputVolumeMul !== undefined) {
                        _state.inputs[name].inputVolumeMul = requestData.inputVolumeMul;
                        _state.inputs[name].inputVolumeDb = 20 * Math.log10(requestData.inputVolumeMul || 0.0001);
                    }
                }
                responseData = {};
                break;
            }

            case 'SetInputMute': {
                const name = requestData?.inputName;
                if (name && _state.inputs[name]) {
                    _state.inputs[name].inputMuted = !!requestData.inputMuted;
                }
                responseData = {};
                break;
            }

            // --- Recording ---
            case 'StartRecord':
                _state.recording = true;
                _state.recordTimecode = '00:00:00.000';
                responseData = {};
                break;

            case 'StopRecord':
                _state.recording = false;
                responseData = { outputPath: 'C:/Videos/virtual-recording.mkv' };
                break;

            case 'GetRecordStatus':
                responseData = {
                    outputActive: _state.recording,
                    outputPaused: false,
                    outputTimecode: _state.recordTimecode,
                    outputBytes: _state.recording ? 1048576 : 0,
                };
                break;

            // --- Streaming ---
            case 'StartStream':
                _state.streaming = true;
                _state.streamTimecode = '00:00:00.000';
                _state.outputDuration = 0;
                responseData = {};
                break;

            case 'StopStream':
                _state.streaming = false;
                responseData = {};
                break;

            case 'GetStreamStatus':
                responseData = {
                    outputActive: _state.streaming,
                    outputReconnecting: false,
                    outputTimecode: _state.streamTimecode,
                    outputDuration: _state.outputDuration,
                    outputCongestion: 0,
                    outputBytes: _state.streaming ? 524288 : 0,
                    outputSkippedFrames: 0,
                    outputTotalFrames: _state.streaming ? 3600 : 0,
                };
                break;

            // --- Studio Mode Transition ---
            case 'TriggerStudioModeTransition': {
                const temp = _state.currentProgramSceneName;
                _state.currentProgramSceneName = _state.currentPreviewSceneName;
                _state.currentPreviewSceneName = temp;
                responseData = {};
                break;
            }

            // --- Fallback ---
            default:
                success = false;
                break;
        }

        dispatch(ws, {
            op: 7,
            d: {
                requestType,
                requestId,
                requestStatus: {
                    result: success,
                    code: success ? 100 : 600,
                    comment: success ? undefined : `Unknown request type: ${requestType}`,
                },
                responseData: success ? responseData : undefined,
            },
        });
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
