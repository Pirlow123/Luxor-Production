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
    // COMPOSITING / EFFECTS
    // ================================================================

    /** Get all effects on a layer */
    async getEffects(layerHandle) { return this.rpc('Pixera.Timelines.Layer.getEffects', { handle: layerHandle }); }

    /** Add an effect to a layer by name */
    async addEffect(layerHandle, effectName) { return this.rpc('Pixera.Timelines.Layer.addEffect', { handle: layerHandle, effectName }); }

    /** Remove an effect from a layer by index */
    async removeEffect(layerHandle, effectIndex) { return this.rpc('Pixera.Timelines.Layer.removeEffect', { handle: layerHandle, effectIndex }); }

    /** Set an effect parameter value */
    async setEffectParam(effectHandle, paramName, value) { return this.rpc('Pixera.Effects.Effect.setParameterValue', { handle: effectHandle, paramName, value }); }

    /** Get all parameters of an effect */
    async getEffectParams(effectHandle) { return this.rpc('Pixera.Effects.Effect.getParameters', { handle: effectHandle }); }

    // ================================================================
    // SCREENS
    // ================================================================

    /** Get all screen handles */
    async getScreens() { return this.rpc('Pixera.Screens.getScreens'); }

    /** Get screen attributes by handle */
    async getScreen(handle) { return this.rpc('Pixera.Screens.Screen.getAttributes', { handle }); }

    // ================================================================
    // SCREEN MAPPING / GEOMETRY
    // ================================================================

    /** Get screen UV mapping data */
    async getScreenMapping(handle) { return this.rpc('Pixera.Screens.Screen.getMapping', { handle }); }

    /** Set screen 3D position */
    async setScreenPosition(handle, x, y, z) { return this.rpc('Pixera.Screens.Screen.setPosition', { handle, x, y, z }); }

    /** Set screen 3D rotation */
    async setScreenRotation(handle, rx, ry, rz) { return this.rpc('Pixera.Screens.Screen.setRotation', { handle, rx, ry, rz }); }

    /** Set screen dimensions */
    async setScreenSize(handle, w, h) { return this.rpc('Pixera.Screens.Screen.setSize', { handle, w, h }); }

    /** Get screen resolution */
    async getScreenResolution(handle) { return this.rpc('Pixera.Screens.Screen.getResolution', { handle }); }

    /** Get screen perspective/warp data */
    async getScreenPerspective(handle) { return this.rpc('Pixera.Screens.Screen.getPerspective', { handle }); }

    // ================================================================
    // RESOURCES / MEDIA MANAGEMENT
    // ================================================================

    /** Get all resources */
    async getResources() { return this.rpc('Pixera.Resources.getResources'); }

    /** Get all resource folders */
    async getResourceFolders() { return this.rpc('Pixera.Resources.getFolders'); }

    /** Get resources in a specific folder */
    async getResourcesByFolder(folderPath) { return this.rpc('Pixera.Resources.getByFolder', { folderPath }); }

    /** Get detailed resource info (resolution, duration, codec) */
    async getResourceInfo(handle) { return this.rpc('Pixera.Resources.Resource.getAttributes', { handle }); }

    /** Import a resource from a file path */
    async importResource(filePath) { return this.rpc('Pixera.Resources.import', { filePath }); }

    /** Delete a resource */
    async deleteResource(handle) { return this.rpc('Pixera.Resources.Resource.delete', { handle }); }

    /** Get resource thumbnail */
    async getResourceThumbnail(handle) { return this.rpc('Pixera.Resources.Resource.getThumbnail', { handle }); }

    // ================================================================
    // DEVICE / OUTPUT MANAGEMENT
    // ================================================================

    /** Get all output device handles */
    async getDevices() { return this.rpc('Pixera.Devices.getHandles'); }

    /** Get device attributes by handle */
    async getDevice(handle) { return this.rpc('Pixera.Devices.Device.getAttributes', { handle }); }

    /** Get outputs for a device */
    async getDeviceOutputs(handle) { return this.rpc('Pixera.Devices.Device.getOutputs', { handle }); }

    /** Enable or disable a device */
    async setDeviceEnabled(handle, enabled) { return this.rpc('Pixera.Devices.Device.setEnabled', { handle, enabled }); }

    // ================================================================
    // DMX / ART-NET
    // ================================================================

    /** Get all DMX universes */
    async getDMXUniverses() { return this.rpc('Pixera.DMX.getUniverses'); }

    /** Set a DMX channel value */
    async setDMXValue(universe, channel, value) { return this.rpc('Pixera.DMX.setValue', { universe, channel, value }); }

    /** Get a DMX channel value */
    async getDMXValue(universe, channel) { return this.rpc('Pixera.DMX.getValue', { universe, channel }); }

    // ================================================================
    // TRANSPORT ENHANCED
    // ================================================================

    /** Set timeline playback speed */
    async setTimelineSpeed(handle, speed) { return this.rpc('Pixera.Timelines.Timeline.setSpeed', { handle, speed }); }

    /** Get timeline total duration */
    async getTimelineDuration(handle) { return this.rpc('Pixera.Timelines.Timeline.getDuration', { handle }); }

    /** Enable or disable timeline looping */
    async setTimelineLoop(handle, enabled) { return this.rpc('Pixera.Timelines.Timeline.setLoop', { handle, enabled }); }

    /** Get detailed timeline state (playing/paused/stopped) */
    async getTimelineState(handle) { return this.rpc('Pixera.Timelines.Timeline.getState', { handle }); }

    /** Crossfade/blend a timeline over a duration (seconds) */
    async blendTimeline(handle, duration) { return this.rpc('Pixera.Timelines.Timeline.blend', { handle, duration }); }

    // ================================================================
    // CUES / MARKERS ENHANCED
    // ================================================================

    /** Get all cues for a timeline */
    async getCues(timelineHandle) { return this.rpc('Pixera.Timelines.Timeline.getCues', { handle: timelineHandle }); }

    /** Fire (trigger) a cue */
    async fireCue(handle) { return this.rpc('Pixera.Timelines.Cue.fire', { handle }); }

    /** Create a new cue on a timeline */
    async createCue(timelineHandle, time, name) { return this.rpc('Pixera.Timelines.Timeline.createCue', { handle: timelineHandle, time, name }); }

    /** Delete a cue */
    async deleteCue(handle) { return this.rpc('Pixera.Timelines.Cue.delete', { handle }); }

    /** Set a cue's time position */
    async setCueTime(handle, time) { return this.rpc('Pixera.Timelines.Cue.setTime', { handle, time }); }

    /** Set a cue's name */
    async setCueName(handle, name) { return this.rpc('Pixera.Timelines.Cue.setName', { handle, name }); }

    // ================================================================
    // NETWORK / NDI
    // ================================================================

    /** Get available NDI sources */
    async getNDISources() { return this.rpc('Pixera.Network.getNDISources'); }

    /** Set an NDI source on a layer */
    async setNDISource(layerHandle, sourceName) { return this.rpc('Pixera.Timelines.Layer.setNDISource', { handle: layerHandle, sourceName }); }

    // ================================================================
    // SYSTEM
    // ================================================================

    /** Get system info (version, GPU, CPU) */
    async getSystemInfo() { return this.rpc('Pixera.System.getInfo'); }

    /** Get performance stats (FPS, GPU load, memory) */
    async getPerformanceStats() { return this.rpc('Pixera.System.getPerformance'); }

    /** Get license info */
    async getLicenseInfo() { return this.rpc('Pixera.System.getLicense'); }

    // ================================================================
    // PROJECT
    // ================================================================

    /** Get current project name */
    async getProjectName() { return this.rpc('Pixera.Project.getName'); }

    /** Save current project */
    async saveProject() { return this.rpc('Pixera.Project.save'); }

    /** Get project settings */
    async getProjectSettings() { return this.rpc('Pixera.Project.getSettings'); }

    // ================================================================
    // HEALTH CHECK
    // ================================================================
    async healthCheck() {
        try {
            const status = await this.getStatus();
            const _timelines = await this.getTimelines().catch(() => []);
            const _screens = await this.getScreens().catch(() => []);
            const _devices = await this.getDevices().catch(() => []);
            const _resources = await this.getResources().catch(() => []);
            const _performance = await this.getPerformanceStats().catch(() => null);

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
                    devices: Array.isArray(_devices) ? _devices.length : 0,
                    resources: Array.isArray(_resources) ? _resources.length : 0,
                    performance: _performance,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const pixeraAPI = new PixeraAPI();
