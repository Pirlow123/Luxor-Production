/**
 * Luxor Production — Pixera Media Server JSON-RPC API Client
 * Base URL: http://<host>:1400/api
 * Protocol: JSON-RPC 2.0 over HTTP POST
 */
class PixeraAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 1400;
        this.timeout = 10000;
        this._rpcId = 0;
    }

    configure(host, port = 1400) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api`;
    }

    get configured() { return !!this.baseUrl; }

    /**
     * Send a JSON-RPC 2.0 call to the Pixera API.
     * @param {string} method — fully-qualified method name, e.g. "Pixera.Utility.getStatus"
     * @param {object} params — method parameters
     * @returns {Promise<*>} the "result" field from the JSON-RPC response
     */
    async rpc(method, params = {}) {
        if (!this.baseUrl) throw new APIError(0, 'Pixera API not configured', method);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const id = ++this._rpcId;

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method, params, id }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new APIError(response.status, errText || response.statusText, method);
            }

            const json = await response.json();

            if (json.error) {
                throw new APIError(json.error.code || -1, json.error.message || 'RPC error', method);
            }

            return json.result;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof APIError) throw err;
            if (err.name === 'AbortError') throw new APIError(0, 'Request timed out', method);
            throw new APIError(0, err.message, method);
        }
    }

    /**
     * Generic fetch wrapper for non-RPC calls (same pattern as other API clients).
     */
    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'Pixera API not configured', path);

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        try {
            const fetchOpts = {
                method: options.method || 'GET',
                signal: controller.signal,
            };

            if (options.body && !(options.body instanceof FormData)) {
                fetchOpts.headers = { 'Content-Type': 'application/json' };
                fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            } else if (options.body) {
                fetchOpts.body = options.body;
            }

            const response = await fetch(url, fetchOpts);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new APIError(response.status, errText || response.statusText, path);
            }

            const ct = response.headers.get('content-type') || '';
            if (ct.includes('image/')) return response.blob();
            if (ct.includes('application/json')) return response.json();

            const text = await response.text();
            try { return JSON.parse(text); } catch { return text; }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof APIError) throw err;
            if (err.name === 'AbortError') throw new APIError(0, 'Request timed out', path);
            throw new APIError(0, err.message, path);
        }
    }

    // ================================================================
    // UTILITY
    // ================================================================

    /** Get Pixera system status */
    async getStatus() { return this.rpc('Pixera.Utility.getStatus'); }

    /** Set master brightness (0.0–1.0) */
    async setMasterBrightness(value) { return this.rpc('Pixera.Utility.setMasterBrightness', { value }); }

    /** Set master volume (0.0–1.0) */
    async setMasterVolume(value) { return this.rpc('Pixera.Utility.setMasterVolume', { value }); }

    // ================================================================
    // TIMELINES
    // ================================================================

    /** Get all timeline handles */
    async getTimelines() { return this.rpc('Pixera.Timelines.getTimelines'); }

    /** Get timeline attributes by handle */
    async getTimeline(handle) { return this.rpc('Pixera.Timelines.Timeline.getAttributes', { handle }); }

    /** Play a timeline */
    async playTimeline(handle) { return this.rpc('Pixera.Timelines.Timeline.play', { handle }); }

    /** Pause a timeline */
    async pauseTimeline(handle) { return this.rpc('Pixera.Timelines.Timeline.pause', { handle }); }

    /** Stop a timeline */
    async stopTimeline(handle) { return this.rpc('Pixera.Timelines.Timeline.stop', { handle }); }

    /** Set current time position on a timeline */
    async setTimelineTime(handle, time) { return this.rpc('Pixera.Timelines.Timeline.setCurrentTime', { handle, time }); }

    /** Get current time position of a timeline */
    async getTimelineTime(handle) { return this.rpc('Pixera.Timelines.Timeline.getCurrentTime', { handle }); }

    // ================================================================
    // LAYERS
    // ================================================================

    /** Get all layers for a timeline */
    async getLayers(timelineHandle) { return this.rpc('Pixera.Timelines.Timeline.getLayers', { handle: timelineHandle }); }

    /** Get layer attributes by handle */
    async getLayer(handle) { return this.rpc('Pixera.Timelines.Layer.getAttributes', { handle }); }

    /** Set layer opacity (0.0–1.0) */
    async setLayerOpacity(handle, opacity) { return this.rpc('Pixera.Timelines.Layer.setOpacity', { handle, opacity }); }

    /** Set layer volume (0.0–1.0) */
    async setLayerVolume(handle, volume) { return this.rpc('Pixera.Timelines.Layer.setVolume', { handle, volume }); }

    /** Assign a resource to a layer by path */
    async assignResource(layerHandle, resourcePath) { return this.rpc('Pixera.Timelines.Layer.assignResource', { handle: layerHandle, path: resourcePath }); }

    // ================================================================
    // SCREENS
    // ================================================================

    /** Get all screen handles */
    async getScreens() { return this.rpc('Pixera.Screens.getScreens'); }

    /** Get screen attributes by handle */
    async getScreen(handle) { return this.rpc('Pixera.Screens.Screen.getAttributes', { handle }); }

    // ================================================================
    // RESOURCES
    // ================================================================

    /** Get all resources */
    async getResources() { return this.rpc('Pixera.Resources.getResources'); }

    // ================================================================
    // CUES
    // ================================================================

    /** Get all cues for a timeline */
    async getCues(timelineHandle) { return this.rpc('Pixera.Timelines.Timeline.getCues', { handle: timelineHandle }); }

    /** Fire (trigger) a cue */
    async fireCue(handle) { return this.rpc('Pixera.Timelines.Cue.fire', { handle }); }

    // ================================================================
    // HEALTH CHECK
    // ================================================================
    async healthCheck() {
        try {
            const status = await this.getStatus();
            const _timelines = await this.getTimelines().catch(() => []);
            const _screens = await this.getScreens().catch(() => []);

            return {
                ok: true,
                info: {
                    engineStatus: status.state || 'Running',
                    computerName: 'Pixera',
                    product: 'Pixera',
                    softwareVersion: status.version || '',
                    _timelines,
                    timelines: Array.isArray(_timelines) ? _timelines.length : 0,
                    screens: Array.isArray(_screens) ? _screens.length : 0,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const pixeraAPI = new PixeraAPI();
