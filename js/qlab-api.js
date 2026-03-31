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
}

// Global singleton
const qlabAPI = new QlabAPI();
