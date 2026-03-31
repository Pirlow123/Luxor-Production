/**
 * Luxor Production — Resolume Arena REST API Client
 * Base URL: http://<host>:8080/api/v1
 * Docs: https://resolume.com/support/en/restapi
 */
class ResolumeAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 8080;
        this.timeout = 10000;
    }

    configure(host, port = 8080) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api/v1`;
    }

    get configured() { return !!this.baseUrl; }

    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'Resolume API not configured', path);

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
    // COMPOSITION
    // ================================================================

    /** GET /composition — full composition state */
    async getComposition() { return this.request('/composition'); }

    /** PUT /composition — update composition properties */
    async updateComposition(data) { return this.request('/composition', { method: 'PUT', body: data }); }

    // ================================================================
    // LAYERS
    // ================================================================

    /** GET /composition/layers/{index} */
    async getLayer(index) { return this.request(`/composition/layers/${index}`); }

    /** PUT /composition/layers/{index} — update layer (opacity, bypass, solo, name) */
    async updateLayer(index, data) { return this.request(`/composition/layers/${index}`, { method: 'PUT', body: data }); }

    /** POST /composition/layers/add */
    async addLayer() { return this.request('/composition/layers/add', { method: 'POST' }); }

    /** DELETE /composition/layers/{index} */
    async removeLayer(index) { return this.request(`/composition/layers/${index}`, { method: 'DELETE' }); }

    /** POST /composition/layers/{index}/clear */
    async clearLayer(index) { return this.request(`/composition/layers/${index}/clear`, { method: 'POST' }); }

    // ================================================================
    // CLIPS
    // ================================================================

    /** GET /composition/layers/{layer}/clips/{clip} */
    async getClip(layer, clip) { return this.request(`/composition/layers/${layer}/clips/${clip}`); }

    /** POST /composition/layers/{layer}/clips/{clip}/connect — trigger clip */
    async connectClip(layer, clip) { return this.request(`/composition/layers/${layer}/clips/${clip}/connect`, { method: 'POST' }); }

    /** GET /composition/layers/{layer}/clips/{clip}/thumbnail */
    async getClipThumbnail(layer, clip) { return this.request(`/composition/layers/${layer}/clips/${clip}/thumbnail`); }

    /** Direct URL for clip thumbnail */
    getClipThumbUrl(layer, clip) { return `${this.baseUrl}/composition/layers/${layer}/clips/${clip}/thumbnail`; }

    /** GET /composition/clips/selected */
    async getSelectedClip() { return this.request('/composition/clips/selected'); }

    // ================================================================
    // COLUMNS
    // ================================================================

    /** POST /composition/columns/{column}/connect — trigger entire column */
    async connectColumn(column) { return this.request(`/composition/columns/${column}/connect`, { method: 'POST' }); }

    /** POST /composition/columns/add */
    async addColumn() { return this.request('/composition/columns/add', { method: 'POST' }); }

    /** DELETE /composition/columns/{column} */
    async removeColumn(column) { return this.request(`/composition/columns/${column}`, { method: 'DELETE' }); }

    // ================================================================
    // DECKS
    // ================================================================

    /** POST /composition/decks/{deck}/select */
    async selectDeck(deck) { return this.request(`/composition/decks/${deck}/select`, { method: 'POST' }); }

    // ================================================================
    // EFFECTS & SOURCES
    // ================================================================

    /** GET /effects */
    async getEffects() { return this.request('/effects'); }

    /** GET /sources */
    async getSources() { return this.request('/sources'); }

    /** POST /composition/layers/{layer}/effects/add */
    async addEffect(layer, effectData) { return this.request(`/composition/layers/${layer}/effects/add`, { method: 'POST', body: effectData }); }

    /** DELETE /composition/layers/{layer}/effects/{effect} */
    async removeEffect(layer, effect) { return this.request(`/composition/layers/${layer}/effects/${effect}`, { method: 'DELETE' }); }

    // ================================================================
    // PARAMETERS (by ID)
    // ================================================================

    /** GET /parameter/by-id/{id} */
    async getParameter(id) { return this.request(`/parameter/by-id/${id}`); }

    /** PUT /parameter/by-id/{id} */
    async setParameter(id, value) { return this.request(`/parameter/by-id/${id}`, { method: 'PUT', body: { value } }); }

    // ================================================================
    // TEMPO
    // ================================================================

    /** GET /composition/tempocontroller */
    async getTempo() { return this.request('/composition/tempocontroller'); }

    /** PUT /composition/tempocontroller */
    async setTempo(data) { return this.request('/composition/tempocontroller', { method: 'PUT', body: data }); }

    // ================================================================
    // AUTOPILOT
    // ================================================================

    /** GET /composition/autopilot — autopilot state */
    async getAutopilot() { return this.request('/composition/autopilot'); }

    /** PUT /composition/autopilot — enable/disable autopilot */
    async setAutopilot(enabled) { return this.request('/composition/autopilot', { method: 'PUT', body: { enabled } }); }

    /** PUT /composition/autopilot — set autopilot BPM */
    async setAutopilotBpm(bpm) { return this.request('/composition/autopilot', { method: 'PUT', body: { bpm } }); }

    // ================================================================
    // DASHBOARD / PARAMETERS
    // ================================================================

    /** GET /composition/dashboard — all dashboard parameters */
    async getDashboard() { return this.request('/composition/dashboard'); }

    /** PUT /composition/dashboard/{id} — set a dashboard parameter value */
    async setDashboardParam(id, value) { return this.request(`/composition/dashboard/${id}`, { method: 'PUT', body: { value } }); }

    // ================================================================
    // OUTPUT
    // ================================================================

    /** GET /output — output configuration */
    async getOutput() { return this.request('/output'); }

    /** GET /output/screens — output screens */
    async getOutputScreens() { return this.request('/output/screens'); }

    /** PUT /output — enable/disable output */
    async setOutputEnabled(enabled) { return this.request('/output', { method: 'PUT', body: { enabled } }); }

    // ================================================================
    // ADVANCED COMPOSITION (columns & decks)
    // ================================================================

    /** GET /composition/columns — all columns info */
    async getCompositionColumns() { return this.request('/composition/columns'); }

    /** GET /composition/columns/{index} — specific column */
    async getColumn(index) { return this.request(`/composition/columns/${index}`); }

    /** PUT /composition/columns/{index} — update column properties */
    async updateColumn(index, data) { return this.request(`/composition/columns/${index}`, { method: 'PUT', body: data }); }

    /** GET /composition/decks/{index} — specific deck */
    async getDeck(index) { return this.request(`/composition/decks/${index}`); }

    /** GET /composition/decks — all decks */
    async getDecks() { return this.request('/composition/decks'); }

    /** PUT /composition/decks/{index} — update deck properties */
    async updateDeck(index, data) { return this.request(`/composition/decks/${index}`, { method: 'PUT', body: data }); }

    // ================================================================
    // CLIP ADVANCED
    // ================================================================

    /** PUT /composition/layers/{layer}/clips/{clip} — update clip properties (speed, direction, blend) */
    async updateClip(layer, clip, data) { return this.request(`/composition/layers/${layer}/clips/${clip}`, { method: 'PUT', body: data }); }

    /** PUT /composition/layers/{layer}/clips/{clip}/transport — play/pause/stop clip */
    async setClipTransport(layer, clip, transport) { return this.request(`/composition/layers/${layer}/clips/${clip}/transport`, { method: 'PUT', body: { transport } }); }

    /** GET /composition/layers/{layer}/clips/{clip}/audio — clip audio properties */
    async getClipAudio(layer, clip) { return this.request(`/composition/layers/${layer}/clips/${clip}/audio`); }

    /** PUT /composition/layers/{layer}/clips/{clip}/audio — set audio volume, pan */
    async setClipAudio(layer, clip, data) { return this.request(`/composition/layers/${layer}/clips/${clip}/audio`, { method: 'PUT', body: data }); }

    // ================================================================
    // LAYER ADVANCED
    // ================================================================

    /** GET /composition/layers/{layer}/effects — layer effect chain */
    async getLayerEffects(layer) { return this.request(`/composition/layers/${layer}/effects`); }

    /** PUT /composition/layers/{layer}/blendmode — set blend mode */
    async setLayerBlendMode(layer, mode) { return this.request(`/composition/layers/${layer}/blendmode`, { method: 'PUT', body: { mode } }); }

    /** GET /composition/layers/{layer}/dashboard — layer dashboard params */
    async getLayerDashboard(layer) { return this.request(`/composition/layers/${layer}/dashboard`); }

    /** POST /composition/layers/{layer}/clips/{column}/connect — trigger specific clip in layer */
    async triggerLayerColumn(layer, column) { return this.request(`/composition/layers/${layer}/clips/${column}/connect`, { method: 'POST' }); }

    // ================================================================
    // BPM / TEMPO
    // ================================================================

    /** POST /composition/tempocontroller/tap — tap tempo */
    async tapTempo() { return this.request('/composition/tempocontroller/tap', { method: 'POST' }); }

    /** POST /composition/tempocontroller/resync — resync tempo */
    async resyncTempo() { return this.request('/composition/tempocontroller/resync', { method: 'POST' }); }

    // ================================================================
    // RECORDING
    // ================================================================

    /** POST /recording/start — start output recording */
    async startRecording() { return this.request('/recording/start', { method: 'POST' }); }

    /** POST /recording/stop — stop recording */
    async stopRecording() { return this.request('/recording/stop', { method: 'POST' }); }

    /** GET /recording — recording state */
    async getRecordingStatus() { return this.request('/recording'); }

    // ================================================================
    // NDI
    // ================================================================

    /** GET /sources/ndi — available NDI inputs */
    async getNDISources() { return this.request('/sources/ndi'); }

    // ================================================================
    // HEALTH CHECK — use composition endpoint as health probe
    // ================================================================
    async healthCheck() {
        try {
            const comp = await this.getComposition();
            // Build a serverInfo-like object for consistent UI
            return {
                ok: true,
                info: {
                    computerName: 'Resolume Arena',
                    engineStatus: 'Running',
                    hostName: this.baseUrl.replace('/api/v1', ''),
                    iP: this.baseUrl.split('//')[1]?.split(':')[0] || '',
                    mediaManagerStatus: 'Running',
                    product: 'Resolume Arena',
                    productFamily: 'Resolume',
                    softwareVersion: comp.version || '',
                    softwareRevision: '',
                    registeredOwner: '',
                    mixes: [],
                    // Store full composition for Resolume pages
                    _composition: comp,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const resolumeAPI = new ResolumeAPI();
