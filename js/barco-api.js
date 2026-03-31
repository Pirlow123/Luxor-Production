/**
 * Luxor Production — Barco E2/S3 JSON-RPC 2.0 API Client
 * Base URL: http://<host>:9999/api
 * Protocol: JSON-RPC 2.0 over HTTP POST
 */
class BarcoAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 9999;
        this.timeout = 10000;
        this._rpcId = 0;
    }

    configure(host, port = 9999) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api`;
    }

    get configured() { return !!this.baseUrl; }

    /**
     * Low-level JSON-RPC 2.0 request.
     * Every call is POST with { jsonrpc:"2.0", method, params, id }.
     */
    async request(method, params = {}, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'Barco API not configured', method);

        const url = this.baseUrl;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        const rpcPayload = {
            jsonrpc: '2.0',
            method,
            params,
            id: ++this._rpcId,
        };

        try {
            const fetchOpts = {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rpcPayload),
            };

            const response = await fetch(url, fetchOpts);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new APIError(response.status, errText || response.statusText, method);
            }

            const ct = response.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const json = await response.json();
                if (json.error) {
                    throw new APIError(json.error.code || -1, json.error.message || 'RPC error', method);
                }
                return json.result;
            }

            const text = await response.text();
            try {
                const parsed = JSON.parse(text);
                if (parsed.error) {
                    throw new APIError(parsed.error.code || -1, parsed.error.message || 'RPC error', method);
                }
                return parsed.result;
            } catch { return text; }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof APIError) throw err;
            if (err.name === 'AbortError') throw new APIError(0, 'Request timed out', method);
            throw new APIError(0, err.message, method);
        }
    }

    // ================================================================
    // DESTINATIONS
    // ================================================================

    /** List all destinations */
    async listDestinations() { return this.request('listDestinations'); }

    /** List screen destinations */
    async listScreenDestinations() { return this.request('listScreenDestinations'); }

    /** List aux destinations */
    async listAuxDestinations() { return this.request('listAuxDestinations'); }

    // ================================================================
    // SOURCES
    // ================================================================

    /** List all sources */
    async listSources() { return this.request('listSources'); }

    // ================================================================
    // PRESETS
    // ================================================================

    /** List all presets */
    async listPresets() { return this.request('listPresets'); }

    /** Activate a preset (type: 'program' or 'preview') */
    async activatePreset(presetId, type = 'program') {
        const typeCode = type === 'preview' ? 1 : 0;
        return this.request('activatePreset', { id: presetId, type: typeCode });
    }

    /** Recall a preset */
    async recallPreset(presetId) {
        return this.request('recallPreset', { id: presetId });
    }

    // ================================================================
    // TRANSITIONS
    // ================================================================

    /** Cut transition (instant) */
    async cut() { return this.request('transition', { type: 0 }); }

    /** Dissolve transition with duration in ms */
    async dissolve(duration = 1000) {
        return this.request('transition', { type: 1, duration });
    }

    // ================================================================
    // DESTINATION CONTROL
    // ================================================================

    /** Freeze a destination */
    async freezeDestination(destId) {
        return this.request('freezeDestination', { id: destId });
    }

    /** Unfreeze a destination */
    async unfreezeDestination(destId) {
        return this.request('unfreezeDestination', { id: destId });
    }

    // ================================================================
    // CONTENT
    // ================================================================

    /** Change content on an aux destination */
    async changeAuxContent(auxId, sourceId) {
        return this.request('changeAuxContent', { id: auxId, sourceId });
    }

    /** Change content on a destination layer */
    async changeContent(destId, layerIdx, sourceId) {
        return this.request('changeContent', { destId, layerIdx, sourceId });
    }

    // ================================================================
    // LAYERS
    // ================================================================

    /** List layers for a destination */
    async listLayers(destId) {
        return this.request('listLayers', { destId });
    }

    // ================================================================
    // FRAME & SYSTEM
    // ================================================================

    /** Get frame settings (outputs, resolution) */
    async getFrameSettings() { return this.request('getFrameSettings'); }

    /** Get power status */
    async powerStatus() { return this.request('powerStatus'); }

    // ================================================================
    // HEALTH CHECK
    // ================================================================
    async healthCheck() {
        try {
            const [power, presets] = await Promise.all([
                this.powerStatus(),
                this.listPresets(),
            ]);

            // Gather additional info for the dashboard
            let destinations = [];
            let sources = [];
            try { destinations = await this.listDestinations(); } catch {}
            try { sources = await this.listSources(); } catch {}

            return {
                ok: true,
                info: {
                    engineStatus: 'Running',
                    computerName: power.computerName || 'Barco E2',
                    product: 'Barco E2/S3',
                    productFamily: 'Barco',
                    softwareVersion: power.softwareVersion || '',
                    _destinations: destinations,
                    _sources: sources,
                    _presets: presets,
                    destinations: Array.isArray(destinations) ? destinations.length : 0,
                    sources: Array.isArray(sources) ? sources.length : 0,
                    presets: Array.isArray(presets) ? presets.length : 0,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const barcoAPI = new BarcoAPI();
