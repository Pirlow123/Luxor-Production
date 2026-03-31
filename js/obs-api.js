/**
 * Luxor Production — OBS Studio WebSocket API Client
 * Protocol: obs-websocket v5 (WebSocket on port 4455)
 * Docs: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
 *
 * Op codes:
 *   0 = Hello, 1 = Identify, 2 = Identified,
 *   5 = Event, 6 = Request, 7 = RequestResponse
 */
class ObsAPI {
    constructor() {
        this.host = '';
        this.port = 4455;
        this.timeout = 10000;
        this._ws = null;
        this._requestId = 0;
        this._pending = {};
        this._connected = false;
    }

    configure(host, port = 4455) {
        this.host = host;
        this.port = port;
    }

    get configured() { return !!this.host; }

    // ================================================================
    // CONNECTION
    // ================================================================

    /** Inject a virtual WebSocket instead of creating a real one */
    useVirtualWs(ws) {
        this._virtualWs = ws;
    }

    async connect() {
        if (this._connected && this._ws?.readyState === 1) return;

        return new Promise((resolve, reject) => {
            const ws = this._virtualWs || new WebSocket(`ws://${this.host}:${this.port}`);
            this._virtualWs = null; // consume it
            const timer = setTimeout(() => {
                ws.close();
                reject(new Error(`OBS connection timeout after ${this.timeout}ms`));
            }, this.timeout);

            ws.onopen = () => {};

            ws.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }

                switch (msg.op) {
                    case 0: // Hello — respond with Identify
                        ws.send(JSON.stringify({
                            op: 1,
                            d: { rpcVersion: 1 }
                        }));
                        break;

                    case 2: // Identified — handshake complete
                        clearTimeout(timer);
                        this._ws = ws;
                        this._connected = true;
                        resolve();
                        break;

                    case 7: // RequestResponse
                        this._handleResponse(msg.d);
                        break;

                    case 5: // Event — ignored for now
                        break;
                }
            };

            ws.onerror = (err) => {
                clearTimeout(timer);
                reject(new Error(`OBS WebSocket error: ${err.message || 'connection failed'}`));
            };

            ws.onclose = () => {
                this._connected = false;
                this._ws = null;
                // Reject any pending requests
                for (const id of Object.keys(this._pending)) {
                    this._pending[id].reject(new Error('OBS WebSocket closed'));
                    delete this._pending[id];
                }
            };
        });
    }

    disconnect() {
        if (this._ws) {
            this._ws.close();
            this._ws = null;
            this._connected = false;
        }
    }

    // ================================================================
    // REQUEST / RESPONSE
    // ================================================================

    _handleResponse(data) {
        const id = data.requestId;
        if (id && this._pending[id]) {
            const { resolve, reject, timer } = this._pending[id];
            clearTimeout(timer);
            delete this._pending[id];

            if (data.requestStatus?.result === false) {
                reject(new Error(
                    `OBS request failed: ${data.requestStatus.comment || data.requestStatus.code}`
                ));
            } else {
                resolve(data.responseData || {});
            }
        }
    }

    async request(requestType, requestData = {}) {
        if (!this._connected) throw new Error('OBS not connected');

        const requestId = String(++this._requestId);

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                delete this._pending[requestId];
                reject(new Error(`OBS request timeout: ${requestType}`));
            }, this.timeout);

            this._pending[requestId] = { resolve, reject, timer };

            this._ws.send(JSON.stringify({
                op: 6,
                d: {
                    requestType,
                    requestId,
                    requestData: Object.keys(requestData).length ? requestData : undefined,
                }
            }));
        });
    }

    // ================================================================
    // HEALTH CHECK
    // ================================================================

    async healthCheck() {
        try {
            await this.connect();
            const version = await this.request('GetVersion');
            let scenes = '--', currentScene = '--', streaming = false, recording = false;
            try {
                const sl = await this.request('GetSceneList');
                scenes = sl?.scenes?.length ?? sl?.responseData?.scenes?.length ?? '--';
                currentScene = sl?.currentProgramSceneName ?? sl?.responseData?.currentProgramSceneName ?? '--';
            } catch (_) {}
            try {
                const ss = await this.request('GetStreamStatus');
                streaming = ss?.outputActive ?? ss?.responseData?.outputActive ?? false;
            } catch (_) {}
            try {
                const rs = await this.request('GetRecordStatus');
                recording = rs?.outputActive ?? rs?.responseData?.outputActive ?? false;
            } catch (_) {}
            return {
                ok: true,
                info: {
                    engineStatus: 'Running',
                    computerName: version.obsVersion ? `OBS Studio ${version.obsVersion}` : 'OBS Studio',
                    version: version.obsVersion || '',
                    platform: version.platform || '',
                    scenes,
                    currentScene,
                    streaming,
                    recording,
                    _obsInfo: { ...version, currentScene, streaming, recording },
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    // ================================================================
    // SCENES
    // ================================================================

    async getSceneList() {
        return this.request('GetSceneList');
    }

    async getCurrentScene() {
        return this.request('GetCurrentProgramScene');
    }

    async setCurrentScene(sceneName) {
        return this.request('SetCurrentProgramScene', { sceneName });
    }

    async getPreviewScene() {
        return this.request('GetCurrentPreviewScene');
    }

    async setPreviewScene(sceneName) {
        return this.request('SetCurrentPreviewScene', { sceneName });
    }

    // ================================================================
    // SCENE ITEMS
    // ================================================================

    async getSceneItems(sceneName) {
        return this.request('GetSceneItemList', { sceneName });
    }

    async setSceneItemEnabled(sceneName, sceneItemId, enabled) {
        return this.request('SetSceneItemEnabled', {
            sceneName,
            sceneItemId,
            sceneItemEnabled: enabled,
        });
    }

    // ================================================================
    // SOURCES / INPUTS
    // ================================================================

    async getSourceList() {
        return this.request('GetInputList');
    }

    async setVolume(inputName, volume) {
        const data = { inputName };
        if (typeof volume === 'number' && volume <= 0) {
            data.inputVolumeDb = volume;
        } else {
            data.inputVolumeMul = volume;
        }
        return this.request('SetInputVolume', data);
    }

    async setMute(inputName, muted) {
        return this.request('SetInputMute', { inputName, inputMuted: muted });
    }

    // ================================================================
    // RECORDING
    // ================================================================

    async startRecording() { return this.request('StartRecord'); }
    async stopRecording()  { return this.request('StopRecord'); }
    async getRecordStatus() { return this.request('GetRecordStatus'); }

    // ================================================================
    // STREAMING
    // ================================================================

    async startStreaming()  { return this.request('StartStream'); }
    async stopStreaming()   { return this.request('StopStream'); }
    async getStreamStatus() { return this.request('GetStreamStatus'); }

    // ================================================================
    // TRANSITIONS
    // ================================================================

    async triggerTransition() {
        return this.request('TriggerStudioModeTransition');
    }

    // ================================================================
    // SCENE COLLECTION
    // ================================================================

    async getSceneCollectionList() {
        return this.request('GetSceneCollectionList');
    }

    async setSceneCollection(name) {
        return this.request('SetCurrentSceneCollection', { sceneCollectionName: name });
    }

    // ================================================================
    // SCENE ITEMS ADVANCED
    // ================================================================

    async getSceneItemTransform(sceneName, sceneItemId) {
        return this.request('GetSceneItemTransform', { sceneName, sceneItemId });
    }

    async setSceneItemTransform(sceneName, sceneItemId, transform) {
        return this.request('SetSceneItemTransform', {
            sceneName,
            sceneItemId,
            sceneItemTransform: transform,
        });
    }

    async duplicateSceneItem(sceneName, sceneItemId, destScene) {
        const data = { sceneName, sceneItemId };
        if (destScene) data.destinationSceneName = destScene;
        return this.request('DuplicateSceneItem', data);
    }

    async removeSceneItem(sceneName, sceneItemId) {
        return this.request('RemoveSceneItem', { sceneName, sceneItemId });
    }

    async createSceneItem(sceneName, sourceName) {
        return this.request('CreateSceneItem', { sceneName, sourceName });
    }

    async getSceneItemIndex(sceneName, sceneItemId) {
        return this.request('GetSceneItemIndex', { sceneName, sceneItemId });
    }

    // ================================================================
    // SOURCES / INPUTS ADVANCED
    // ================================================================

    async getInputSettings(inputName) {
        return this.request('GetInputSettings', { inputName });
    }

    async setInputSettings(inputName, settings) {
        return this.request('SetInputSettings', { inputName, inputSettings: settings });
    }

    async getInputDefaultSettings(inputKind) {
        return this.request('GetInputDefaultSettings', { inputKind });
    }

    async createInput(sceneName, inputName, inputKind, settings) {
        const data = { sceneName, inputName, inputKind };
        if (settings) data.inputSettings = settings;
        return this.request('CreateInput', data);
    }

    async removeInput(inputName) {
        return this.request('RemoveInput', { inputName });
    }

    async getInputAudioBalance(inputName) {
        return this.request('GetInputAudioBalance', { inputName });
    }

    async setInputAudioBalance(inputName, balance) {
        return this.request('SetInputAudioBalance', { inputName, inputAudioBalance: balance });
    }

    // ================================================================
    // FILTERS / EFFECTS
    // ================================================================

    async getSourceFilters(sourceName) {
        return this.request('GetSourceFilterList', { sourceName });
    }

    async addSourceFilter(sourceName, filterName, filterKind, settings) {
        const data = { sourceName, filterName, filterKind };
        if (settings) data.filterSettings = settings;
        return this.request('CreateSourceFilter', data);
    }

    async removeSourceFilter(sourceName, filterName) {
        return this.request('RemoveSourceFilter', { sourceName, filterName });
    }

    async setSourceFilterEnabled(sourceName, filterName, enabled) {
        return this.request('SetSourceFilterEnabled', {
            sourceName,
            filterName,
            filterEnabled: enabled,
        });
    }

    async setSourceFilterSettings(sourceName, filterName, settings) {
        return this.request('SetSourceFilterSettings', {
            sourceName,
            filterName,
            filterSettings: settings,
        });
    }

    async getSourceFilterSettings(sourceName, filterName) {
        return this.request('GetSourceFilter', { sourceName, filterName });
    }

    // ================================================================
    // VIRTUAL CAMERA
    // ================================================================

    async startVirtualCam() { return this.request('StartVirtualCam'); }
    async stopVirtualCam()  { return this.request('StopVirtualCam'); }
    async getVirtualCamStatus() { return this.request('GetVirtualCamStatus'); }

    // ================================================================
    // REPLAY BUFFER
    // ================================================================

    async startReplayBuffer() { return this.request('StartReplayBuffer'); }
    async stopReplayBuffer()  { return this.request('StopReplayBuffer'); }
    async saveReplayBuffer()  { return this.request('SaveReplayBuffer'); }
    async getReplayBufferStatus() { return this.request('GetReplayBufferStatus'); }

    // ================================================================
    // OUTPUT
    // ================================================================

    async getOutputList() { return this.request('GetOutputList'); }

    async getOutputSettings(outputName) {
        return this.request('GetOutputSettings', { outputName });
    }

    async startOutput(outputName) {
        return this.request('StartOutput', { outputName });
    }

    async stopOutput(outputName) {
        return this.request('StopOutput', { outputName });
    }

    async getOutputStatus(outputName) {
        return this.request('GetOutputStatus', { outputName });
    }

    // ================================================================
    // HOTKEYS
    // ================================================================

    async getHotkeyList() { return this.request('GetHotkeyList'); }

    async triggerHotkey(hotkeyName) {
        return this.request('TriggerHotkeyByName', { hotkeyName });
    }

    async triggerHotkeySequence(keyId, modifiers) {
        const data = { keyId };
        if (modifiers) data.keyModifiers = modifiers;
        return this.request('TriggerHotkeyByKeySequence', data);
    }

    // ================================================================
    // PROFILES
    // ================================================================

    async getProfileList() { return this.request('GetProfileList'); }

    async setProfile(name) {
        return this.request('SetCurrentProfile', { profileName: name });
    }

    // ================================================================
    // STUDIO MODE
    // ================================================================

    async getStudioModeEnabled() {
        return this.request('GetStudioModeEnabled');
    }

    async setStudioModeEnabled(enabled) {
        return this.request('SetStudioModeEnabled', { studioModeEnabled: enabled });
    }

    // ================================================================
    // MEDIA INPUT
    // ================================================================

    async getMediaInputStatus(inputName) {
        return this.request('GetMediaInputStatus', { inputName });
    }

    async setMediaInputCursor(inputName, cursor) {
        return this.request('SetMediaInputCursor', { inputName, mediaCursor: cursor });
    }

    async offsetMediaInputCursor(inputName, offset) {
        return this.request('OffsetMediaInputCursor', { inputName, mediaCursorOffset: offset });
    }

    async triggerMediaInputAction(inputName, action) {
        return this.request('TriggerMediaInputAction', { inputName, mediaAction: action });
    }

    // ================================================================
    // SCREENSHOTS
    // ================================================================

    async getSourceScreenshot(sourceName, format, width, height) {
        const data = { sourceName, imageFormat: format };
        if (width) data.imageWidth = width;
        if (height) data.imageHeight = height;
        return this.request('GetSourceScreenshot', data);
    }

    async saveSourceScreenshot(sourceName, format, filePath) {
        return this.request('SaveSourceScreenshot', {
            sourceName,
            imageFormat: format,
            imageFilePath: filePath,
        });
    }
}

// Global singleton
const obsAPI = new ObsAPI();
