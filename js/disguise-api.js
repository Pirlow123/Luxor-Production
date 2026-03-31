/**
 * Luxor Production — Disguise (d3) REST API Client
 * Base URL: http://<host>:80/api/session
 * Docs: https://developer.disguise.one/
 */
class DisguiseAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 80;
        this.timeout = 10000;
    }

    configure(host, port = 80) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api`;
    }

    get configured() { return !!this.baseUrl; }

    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'Disguise API not configured', path);

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
    // SESSION STATUS
    // ================================================================

    /** GET /session/status — session state, fps, project name */
    async getStatus() { return this.request('/session/status'); }

    /** GET /session/transport — play/pause/speed/currentTime */
    async getTransportStatus() { return this.request('/session/transport'); }

    // ================================================================
    // TRANSPORT CONTROL
    // ================================================================

    /** POST /session/transport/play */
    async play() { return this.request('/session/transport/play', { method: 'POST' }); }

    /** POST /session/transport/pause */
    async pause() { return this.request('/session/transport/pause', { method: 'POST' }); }

    /** POST /session/transport/stop */
    async stop() { return this.request('/session/transport/stop', { method: 'POST' }); }

    /** POST /session/transport/goToTime — jump to specific time */
    async goToTime(time) { return this.request('/session/transport/goToTime', { method: 'POST', body: { time } }); }

    /** POST /session/transport/goToNextSection */
    async goToNextSection() { return this.request('/session/transport/goToNextSection', { method: 'POST' }); }

    /** POST /session/transport/goToPrevSection */
    async goToPrevSection() { return this.request('/session/transport/goToPrevSection', { method: 'POST' }); }

    /** POST /session/transport/goToSection — jump to section by index */
    async goToSection(sectionIndex) { return this.request('/session/transport/goToSection', { method: 'POST', body: { index: sectionIndex } }); }

    // ================================================================
    // TRACKS
    // ================================================================

    /** GET /session/tracks — list all tracks */
    async getTracks() { return this.request('/session/tracks'); }

    /** GET /session/tracks/{trackId} — single track details */
    async getTrack(trackId) { return this.request(`/session/tracks/${trackId}`); }

    /** PUT /session/tracks/{trackId}/volume — set track volume */
    async setTrackVolume(trackId, volume) { return this.request(`/session/tracks/${trackId}/volume`, { method: 'PUT', body: { volume } }); }

    /** PUT /session/tracks/{trackId}/brightness — set track brightness */
    async setTrackBrightness(trackId, brightness) { return this.request(`/session/tracks/${trackId}/brightness`, { method: 'PUT', body: { brightness } }); }

    /** POST /session/tracks/{trackId}/mute */
    async muteTrack(trackId) { return this.request(`/session/tracks/${trackId}/mute`, { method: 'POST' }); }

    /** POST /session/tracks/{trackId}/unmute */
    async unmuteTrack(trackId) { return this.request(`/session/tracks/${trackId}/unmute`, { method: 'POST' }); }

    // ================================================================
    // SECTIONS & ANNOTATIONS
    // ================================================================

    /** GET /session/sections — list all sections */
    async getSections() { return this.request('/session/sections'); }

    /** GET /session/annotations — list all annotations */
    async getAnnotations() { return this.request('/session/annotations'); }

    // ================================================================
    // RENDER STREAM & MACHINES
    // ================================================================

    /** GET /session/renderstream — render stream status */
    async getRenderStream() { return this.request('/session/renderstream'); }

    /** GET /session/machines — all d3 machines in the cluster */
    async getMachines() { return this.request('/session/machines'); }

    /** GET /session/outputs — display outputs */
    async getOutputs() { return this.request('/session/outputs'); }

    // ================================================================
    // MASTER CONTROLS
    // ================================================================

    /** PUT /session/master/brightness — set master brightness */
    async setMasterBrightness(value) { return this.request('/session/master/brightness', { method: 'PUT', body: { value } }); }

    /** PUT /session/master/volume — set master volume */
    async setMasterVolume(value) { return this.request('/session/master/volume', { method: 'PUT', body: { value } }); }

    // ================================================================
    // HEALTH CHECK
    // ================================================================
    async healthCheck() {
        try {
            const status = await this.getStatus();
            const tracks = await this.getTracks().catch(() => []);
            const transport = await this.getTransportStatus().catch(() => ({}));
            const sections = await this.getSections().catch(() => []);
            const machines = await this.getMachines().catch(() => []);
            return {
                ok: true,
                info: {
                    engineStatus: status.state || 'Running',
                    computerName: 'Disguise',
                    product: 'Disguise d3',
                    softwareVersion: status.softwareVersion || '',
                    _status: { ...status, transport, machines },
                    _tracks: tracks,
                    _sections: sections,
                    tracks: Array.isArray(tracks) ? tracks.length : 0,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const disguiseAPI = new DisguiseAPI();
