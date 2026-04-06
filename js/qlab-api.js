/**
 * Luxor Production — QLab WebSocket API Client
 * Protocol: QLab JSON over WebSocket on port 53000
 * Docs: https://qlab.app/docs/v5/scripting/osc-dictionary-v5/
 *
 * Messages:
 *   Send:    { address: "/osc/path", args: [...] }
 *   Receive: { address: "/reply/osc/path", data: {...}, status: "ok" }
 */
class QlabAPI {
    constructor() {
        this.host = '';
        this.port = 53000;
        this.timeout = 10000;
        this._ws = null;
        this._connected = false;
        this._requestId = 0;
        this._pending = {};
    }

    configure(host, port = 53000) {
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
                reject(new Error(`QLab connection timeout after ${this.timeout}ms`));
            }, this.timeout);

            ws.onopen = () => {
                clearTimeout(timer);
                this._ws = ws;
                this._connected = true;
                resolve();
            };

            ws.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }
                this._handleResponse(msg);
            };

            ws.onerror = (err) => {
                clearTimeout(timer);
                reject(new Error(`QLab WebSocket error: ${err.message || 'connection failed'}`));
            };

            ws.onclose = () => {
                this._connected = false;
                this._ws = null;
                // Reject any pending requests
                for (const id of Object.keys(this._pending)) {
                    this._pending[id].reject(new Error('QLab WebSocket closed'));
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

    _handleResponse(msg) {
        const address = msg.address || '';
        // Match reply to pending request by address
        for (const id of Object.keys(this._pending)) {
            const pending = this._pending[id];
            if (address === `/reply${pending.address}`) {
                clearTimeout(pending.timer);
                delete this._pending[id];

                if (msg.status && msg.status !== 'ok') {
                    pending.reject(new Error(`QLab request failed: ${msg.status}`));
                } else {
                    pending.resolve(msg.data !== undefined ? msg.data : msg);
                }
                return;
            }
        }
    }

    async send(address, args = []) {
        if (!this._connected) throw new Error('QLab not connected');

        const requestId = String(++this._requestId);

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                delete this._pending[requestId];
                reject(new Error(`QLab request timeout: ${address}`));
            }, this.timeout);

            this._pending[requestId] = { resolve, reject, timer, address };

            this._ws.send(JSON.stringify({ address, args }));
        });
    }

    // ================================================================
    // COMPOSITE STATE
    // ================================================================
    async getState() {
        await this.connect();
        const workspaces = await this.getWorkspaces().catch(() => []);
        const wsList = Array.isArray(workspaces) ? workspaces : [];
        const wsId = wsList[0]?.uniqueID || '';
        let cues = [];
        let currentCueId = null;
        let masterVolume = 100;
        let runningCues = [];
        if (wsId) {
            try {
                const cueLists = await this.getCueList(wsId);
                const lists = Array.isArray(cueLists) ? cueLists : [];
                for (const list of lists) {
                    if (Array.isArray(list.cues)) cues = cues.concat(list.cues);
                }
            } catch {}
            try { const pos = await this.getPlaybackPosition(wsId); currentCueId = pos?.uniqueID || pos?.number; } catch {}
            try { const rc = await this.getRunningCues(wsId); runningCues = Array.isArray(rc) ? rc : []; } catch {}
        }
        return { workspaceId: wsId, cues, currentCueId, masterVolume, runningCues };
    }

    // ================================================================
    // HEALTH CHECK
    // ================================================================

    async healthCheck() {
        try {
            await this.connect();
            const workspaces = await this.getWorkspaces();
            const _workspaces = Array.isArray(workspaces) ? workspaces : [];

            // Count total cues across all workspaces
            let cueCount = 0;
            for (const ws of _workspaces) {
                try {
                    const cueLists = await this.getCueList(ws.uniqueID);
                    const lists = Array.isArray(cueLists) ? cueLists : [];
                    for (const list of lists) {
                        cueCount += Array.isArray(list.cues) ? list.cues.length : 0;
                    }
                } catch { /* ignore */ }
            }

            return {
                ok: true,
                info: {
                    engineStatus: 'Running',
                    computerName: 'QLab',
                    product: 'QLab 5',
                    _workspaces,
                    workspaces: _workspaces.length,
                    cues: cueCount,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    // ================================================================
    // WORKSPACES
    // ================================================================

    async getWorkspaces() {
        return this.send('/workspaces');
    }

    async getWorkspace(wsId) {
        return this.send(`/workspace/${wsId}`);
    }

    // ================================================================
    // CUE LISTS & CUES
    // ================================================================

    async getCueList(wsId) {
        return this.send(`/workspace/${wsId}/cueLists`);
    }

    async getCue(wsId, cueId) {
        return this.send(`/workspace/${wsId}/cue/${cueId}`);
    }

    // ================================================================
    // TRANSPORT CONTROLS
    // ================================================================

    async go(wsId) {
        return this.send(`/workspace/${wsId}/go`);
    }

    async stop(wsId) {
        return this.send(`/workspace/${wsId}/stop`);
    }

    async pause(wsId) {
        return this.send(`/workspace/${wsId}/pause`);
    }

    async resume(wsId) {
        return this.send(`/workspace/${wsId}/resume`);
    }

    async reset(wsId) {
        return this.send(`/workspace/${wsId}/reset`);
    }

    async panic(wsId) {
        return this.send(`/workspace/${wsId}/panic`);
    }

    // ================================================================
    // CUE-SPECIFIC CONTROLS
    // ================================================================

    async fireCue(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/start`);
    }

    async stopCue(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/stop`);
    }

    async setCueProperty(wsId, cueNumber, property, value) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/${property}`, [value]);
    }

    // ================================================================
    // PLAYBACK POSITION & NAVIGATION
    // ================================================================

    async getPlaybackPosition(wsId) {
        return this.send(`/workspace/${wsId}/playbackPosition`);
    }

    async next(wsId) {
        return this.send(`/workspace/${wsId}/next`);
    }

    async previous(wsId) {
        return this.send(`/workspace/${wsId}/previous`);
    }

    // ================================================================
    // MASTER VOLUME
    // ================================================================

    async setMasterVolume(wsId, db) {
        return this.send(`/workspace/${wsId}/masterVolume`, [db]);
    }

    // ================================================================
    // CUE CREATION / MANAGEMENT
    // ================================================================

    /** Create a new cue (audio, video, midi, osc, network, fade, etc.) */
    async createCue(wsId, type) {
        return this.send(`/workspace/${wsId}/new`, [type]);
    }

    /** Delete a cue */
    async deleteCue(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/delete`);
    }

    /** Move a cue to a target cue list at a given index */
    async moveCue(wsId, cueNumber, targetCueList, index) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/move`, [targetCueList, index]);
    }

    /** Duplicate a cue */
    async copyCue(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/copy`);
    }

    // ================================================================
    // CUE PROPERTIES
    // ================================================================

    /** Set cue name */
    async setCueName(wsId, cueNumber, name) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/name`, [name]);
    }

    /** Set cue number */
    async setCueNumber(wsId, cueNumber, newNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/number`, [newNumber]);
    }

    /** Set pre-wait time */
    async setCuePreWait(wsId, cueNumber, time) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/preWait`, [time]);
    }

    /** Set post-wait time */
    async setCuePostWait(wsId, cueNumber, time) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/postWait`, [time]);
    }

    /** Set cue duration */
    async setCueDuration(wsId, cueNumber, duration) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/duration`, [duration]);
    }

    /** Set cue target */
    async setCueTarget(wsId, cueNumber, targetId) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/cueTargetId`, [targetId]);
    }

    /** Set continue mode (0 = no continue, 1 = auto continue, 2 = auto follow) */
    async setCueContinueMode(wsId, cueNumber, mode) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/continueMode`, [mode]);
    }

    /** Arm or disarm a cue */
    async setCueArmed(wsId, cueNumber, armed) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/armed`, [armed]);
    }

    /** Set cue color label */
    async setCueColor(wsId, cueNumber, color) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/colorName`, [color]);
    }

    /** Set cue notes text */
    async setCueNotes(wsId, cueNumber, notes) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/notes`, [notes]);
    }

    // ================================================================
    // AUDIO CUE PROPERTIES
    // ================================================================

    /** Set audio matrix level (row, col, dB) */
    async setCueAudioLevel(wsId, cueNumber, row, col, db) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/sliderLevel`, [row, col, db]);
    }

    /** Set audio playback rate */
    async setCueAudioRate(wsId, cueNumber, rate) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/rate`, [rate]);
    }

    /** Set audio file target */
    async setCueAudioFile(wsId, cueNumber, filePath) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/fileTarget`, [filePath]);
    }

    // ================================================================
    // VIDEO CUE PROPERTIES
    // ================================================================

    /** Set video cue opacity */
    async setCueVideoOpacity(wsId, cueNumber, opacity) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/opacity`, [opacity]);
    }

    /** Set video cue geometry (position, scale, rotation) */
    async setCueVideoGeometry(wsId, cueNumber, geometry) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/surfaceGeometry`, [geometry]);
    }

    /** Set video file target */
    async setCueVideoFile(wsId, cueNumber, filePath) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/fileTarget`, [filePath]);
    }

    // ================================================================
    // FADE CUE
    // ================================================================

    /** Set fade cue level (dB) */
    async setCueFadeLevel(wsId, cueNumber, db) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/sliderLevel`, [db]);
    }

    /** Set fade cue duration */
    async setCueFadeDuration(wsId, cueNumber, duration) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/duration`, [duration]);
    }

    // ================================================================
    // NETWORK / OSC CUE
    // ================================================================

    /** Set OSC message for a cue */
    async setCueOSCMessage(wsId, cueNumber, address, args) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/customString`, [address, args]);
    }

    /** Set network patch for a cue */
    async setCueNetworkPatch(wsId, cueNumber, patchNum) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/patch`, [patchNum]);
    }

    // ================================================================
    // WORKSPACE CONTROL
    // ================================================================

    /** Audition mode go */
    async auditionGo(wsId) {
        return this.send(`/workspace/${wsId}/auditionGo`);
    }

    /** Audition stop */
    async auditionStop(wsId) {
        return this.send(`/workspace/${wsId}/auditionStop`);
    }

    /** Select a cue list to override */
    async overrideList(wsId, cueName) {
        return this.send(`/workspace/${wsId}/select/${cueName}`);
    }

    /** Toggle fullscreen */
    async toggleFullScreen(wsId) {
        return this.send(`/workspace/${wsId}/fullScreen`);
    }

    /** Set minimum time between GOs */
    async setMinimumGoInterval(wsId, interval) {
        return this.send(`/workspace/${wsId}/minGoTime`, [interval]);
    }

    // ================================================================
    // SHOW CONTROL
    // ================================================================

    /** List running cues */
    async getRunningCues(wsId) {
        return this.send(`/workspace/${wsId}/runningCues`);
    }

    /** List selected cues */
    async getSelectedCues(wsId) {
        return this.send(`/workspace/${wsId}/selectedCues`);
    }

    /** Hard stop all cues */
    async hardStop(wsId) {
        return this.send(`/workspace/${wsId}/hardStop`);
    }

    /** Hard stop a specific cue */
    async hardStopCue(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/hardStop`);
    }

    /** Preload a cue */
    async load(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/load`);
    }

    /** Preview/audition a cue */
    async preview(wsId, cueNumber) {
        return this.send(`/workspace/${wsId}/cue/${cueNumber}/preview`);
    }

    // ================================================================
    // SETTINGS
    // ================================================================

    /** Get workspace settings */
    async getSettings(wsId) {
        return this.send(`/workspace/${wsId}/settings`);
    }

    /** Get active overrides */
    async getOverrides(wsId) {
        return this.send(`/workspace/${wsId}/overrides`);
    }
}

// Global singleton
const qlabAPI = new QlabAPI();
