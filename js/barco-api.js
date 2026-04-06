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
    // MULTI-SCREEN / SUPERSCREEN
    // ================================================================

    /** List all super destinations */
    async getSuperScreens() { return this.request('listSuperDestinations'); }

    /** Get super destination details */
    async getSuperScreen(id) {
        return this.request('getSuperDestination', { id });
    }

    /** Activate a super preset (type: 'program' or 'preview') */
    async activateSuperPreset(presetId, type = 'program') {
        const typeCode = type === 'preview' ? 1 : 0;
        return this.request('activateSuperPreset', { id: presetId, type: typeCode });
    }

    // ================================================================
    // OUTPUT CONFIGURATION
    // ================================================================

    /** List all physical outputs */
    async getOutputConfig() { return this.request('listOutputs'); }

    /** Toggle an output on or off */
    async setOutputEnabled(outputId, enabled) {
        return this.request('toggleOutput', { id: outputId, enabled });
    }

    /** List all inputs */
    async getInputConfig() { return this.request('listInputs'); }

    /** Set input format */
    async setInputFormat(inputId, format) {
        return this.request('setInputFormat', { id: inputId, format });
    }

    // ================================================================
    // TEST PATTERNS
    // ================================================================

    /** Set test pattern on a destination (grid, color bars, crosshatch, white, black, off) */
    async setTestPattern(destId, pattern) {
        return this.request('setTestPattern', { destId, pattern });
    }

    /** Clear test pattern from a destination */
    async clearTestPattern(destId) {
        return this.request('clearTestPattern', { destId });
    }

    // ================================================================
    // BACKGROUND / FILL
    // ================================================================

    /** Set background color on a destination */
    async setBackground(destId, r, g, b) {
        return this.request('setBackgroundColor', { destId, r, g, b });
    }

    /** Set background image source on a destination */
    async setBackgroundImage(destId, source) {
        return this.request('setBackgroundSource', { destId, source });
    }

    // ================================================================
    // LAYER ADVANCED
    // ================================================================

    /** Add a layer to a destination */
    async addLayer(destId) {
        return this.request('addLayer', { destId });
    }

    /** Remove a layer from a destination */
    async removeLayer(destId, layerIndex) {
        return this.request('removeLayer', { destId, layerIndex });
    }

    /** Set layer position and size */
    async setLayerPosition(destId, layerIdx, x, y, w, h) {
        return this.request('positionLayer', { destId, layerIdx, x, y, w, h });
    }

    /** Set layer source content */
    async setLayerSource(destId, layerIdx, sourceId) {
        return this.request('setLayerContent', { destId, layerIdx, sourceId });
    }

    /** Set layer z-order */
    async setLayerZOrder(destId, layerIdx, zOrder) {
        return this.request('setLayerZOrder', { destId, layerIdx, zOrder });
    }

    /** Set layer opacity/transparency */
    async setLayerOpacity(destId, layerIdx, opacity) {
        return this.request('setLayerTransparency', { destId, layerIdx, opacity });
    }

    // ================================================================
    // PRESET MANAGEMENT
    // ================================================================

    /** Create a new preset */
    async createPreset(name) {
        return this.request('createPreset', { name });
    }

    /** Delete a preset */
    async deletePreset(presetId) {
        return this.request('deletePreset', { id: presetId });
    }

    /** Rename a preset */
    async renamePreset(presetId, name) {
        return this.request('renamePreset', { id: presetId, name });
    }

    /** Save current state to a preset */
    async saveToPreset(presetId) {
        return this.request('saveCurrentAsPreset', { id: presetId });
    }

    /** Get preset configuration details */
    async listPresetDetails(presetId) {
        return this.request('getPresetDetails', { id: presetId });
    }

    // ================================================================
    // MULTIVIEWER
    // ================================================================

    /** Get multiviewer layout */
    async getMultiviewerLayout() { return this.request('getMVLayout'); }

    /** Set multiviewer window source */
    async setMultiviewerSource(windowId, sourceId) {
        return this.request('setMVWindowSource', { windowId, sourceId });
    }

    // ================================================================
    // SYSTEM
    // ================================================================

    /** Get system status (temperature, uptime, etc.) */
    async getSystemStatus() { return this.request('getSystemStatus'); }

    /** Get network configuration */
    async getNetworkConfig() { return this.request('getNetworkSettings'); }

    /** Reboot the device */
    async reboot() { return this.request('reboot'); }

    /** Get firmware version info */
    async getFirmwareVersion() { return this.request('getFirmwareInfo'); }

    // ================================================================
    // STILL STORE
    // ================================================================

    /** List all still images */
    async listStills() { return this.request('listStillImages'); }

    /** Capture a still image from a destination */
    async captureStill(destId, name) {
        return this.request('captureStillImage', { destId, name });
    }

    /** Load a still image onto a destination layer */
    async loadStill(destId, layerIdx, stillId) {
        return this.request('loadStillImage', { destId, layerIdx, stillId });
    }

    // ================================================================
    // COMPOSITE STATE
    // ================================================================
    async getState() {
        const [destinations, sources, presets, auxDests] = await Promise.all([
            this.listDestinations().catch(() => []),
            this.listSources().catch(() => []),
            this.listPresets().catch(() => []),
            this.listAuxDestinations().catch(() => []),
        ]);
        let superScreens = [];
        try { superScreens = await this.getSuperScreens(); } catch {}
        let firmware = '';
        try { firmware = await this.getFirmwareVersion(); } catch {}
        let powerOk = true;
        try { const ps = await this.powerStatus(); powerOk = ps?.status !== 'error'; } catch { powerOk = false; }
        return { destinations, sources, presets, auxDestinations: auxDests, superScreens, firmware, powerOk };
    }

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
