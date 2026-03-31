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
    // SPATIAL / 3D
    // ================================================================

    /** GET /session/spatialcalibrations — spatial calibration data */
    async getSpatialCalibrations() { return this.request('/session/spatialcalibrations'); }

    /** GET /session/projectors — all projector configurations with positions, rotations, lens data */
    async getProjectors() { return this.request('/session/projectors'); }

    /** GET /session/projectors/{uid} — single projector details */
    async getProjector(uid) { return this.request(`/session/projectors/${uid}`); }

    /** GET /session/screens — all screens with geometry, resolution, 3D transform */
    async getScreens() { return this.request('/session/screens'); }

    /** GET /session/screens/{uid} — single screen details */
    async getScreen(uid) { return this.request(`/session/screens/${uid}`); }

    /** GET /session/mappings — content mapping to screens */
    async getMappings() { return this.request('/session/mappings'); }

    /** GET /session/stageobjects — all 3D stage objects */
    async getStageObjects() { return this.request('/session/stageobjects'); }

    // ================================================================
    // MIXED REALITY / CAMERA TRACKING
    // ================================================================

    /** GET /session/mrsets — mixed reality sets */
    async getMRSets() { return this.request('/session/mrsets'); }

    /** GET /session/cameratracking — camera tracking data */
    async getCameraTracking() { return this.request('/session/cameratracking'); }

    /** GET /session/trackinginputs — tracking system inputs */
    async getTrackingInputs() { return this.request('/session/trackinginputs'); }

    // ================================================================
    // RENDER / OUTPUT CONTROL
    // ================================================================

    /** GET /session/outputassignments — output assignment configuration */
    async getOutputAssignments() { return this.request('/session/outputassignments'); }

    /** POST /session/outputs/{outputId}/enabled — toggle output enabled state */
    async setOutputEnabled(outputId, enabled) { return this.request(`/session/outputs/${outputId}/enabled`, { method: 'POST', body: { enabled } }); }

    /** GET /session/renderconfig — render configuration */
    async getRenderConfig() { return this.request('/session/renderconfig'); }

    /** POST /session/capture — capture a frame/screenshot from a machine */
    async captureFrame(machineId) { return this.request('/session/capture', { method: 'POST', body: { machineId } }); }

    // ================================================================
    // NOTIFICATIONS / EVENTS
    // ================================================================

    /** GET /session/notifications — system notifications and warnings */
    async getNotifications() { return this.request('/session/notifications'); }

    /** GET /session/health — detailed system health */
    async getHealth() { return this.request('/session/health'); }

    // ================================================================
    // NETWORK
    // ================================================================

    /** GET /session/networkadapters — network adapter configuration */
    async getNetworkAdapters() { return this.request('/session/networkadapters'); }

    /** GET /session/dmx/outputs — DMX universe output configuration */
    async getDMXOutputs() { return this.request('/session/dmx/outputs'); }

    /** POST /session/dmx/outputs — set a DMX channel value */
    async setDMXValue(universe, channel, value) { return this.request('/session/dmx/outputs', { method: 'POST', body: { universe, channel, value } }); }

    // ================================================================
    // CONTENT / MEDIA
    // ================================================================

    /** GET /session/content — content folder structure */
    async getContentFolders() { return this.request('/session/content'); }

    /** GET /session/videoinputs — NDI/SDI/capture video inputs */
    async getVideoInputs() { return this.request('/session/videoinputs'); }

    /** GET /session/audiodevices — audio device list */
    async getAudioDevices() { return this.request('/session/audiodevices'); }

    // ================================================================
    // SHOW CONTROL
    // ================================================================

    /** POST /session/transport/tcpstring — send TCP string command */
    async fireTCPString(command) { return this.request('/session/transport/tcpstring', { method: 'POST', body: { command } }); }

    /** POST /session/tags/{tagName} — set show tag value */
    async setTag(tagName, value) { return this.request(`/session/tags/${encodeURIComponent(tagName)}`, { method: 'POST', body: { value } }); }

    /** GET /session/tags/{tagName} — get show tag value */
    async getTag(tagName) { return this.request(`/session/tags/${encodeURIComponent(tagName)}`); }

    /** GET /session/tags — all show tags */
    async getTags() { return this.request('/session/tags'); }

    /** POST /session/expressions/{exprName} — set expression value */
    async setExpression(exprName, value) { return this.request(`/session/expressions/${encodeURIComponent(exprName)}`, { method: 'POST', body: { value } }); }

    /** GET /session/expressions — all expressions */
    async getExpressions() { return this.request('/session/expressions'); }

    // ================================================================
    // OSC CONTROL
    // ================================================================

    /** POST /session/osc — send OSC message */
    async sendOSC(address, args) { return this.request('/session/osc', { method: 'POST', body: { address, args } }); }

    // ================================================================
    // TIMELINE ENHANCED
    // ================================================================

    /** GET /session/tracks/{trackId}/layers — track layers */
    async getTrackLayers(trackId) { return this.request(`/session/tracks/${trackId}/layers`); }

    /** PUT /session/tracks/{trackId}/opacity — set track opacity */
    async setTrackOpacity(trackId, opacity) { return this.request(`/session/tracks/${trackId}/opacity`, { method: 'PUT', body: { opacity } }); }

    /** GET /session/cues — cue/note list from timeline */
    async getTimelineCues() { return this.request('/session/cues'); }

    /** POST /session/cues/{cueId}/activate — go to / activate cue */
    async setCueActive(cueId) { return this.request(`/session/cues/${cueId}/activate`, { method: 'POST' }); }

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
            const screens = await this.getScreens().catch(() => []);
            const projectors = await this.getProjectors().catch(() => []);
            const notifications = await this.getNotifications().catch(() => []);
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
                    _screens: screens,
                    _projectors: projectors,
                    _notifications: notifications,
                    tracks: Array.isArray(tracks) ? tracks.length : 0,
                    screens: Array.isArray(screens) ? screens.length : 0,
                    projectors: Array.isArray(projectors) ? projectors.length : 0,
                    notificationSummary: Array.isArray(notifications) ? {
                        total: notifications.length,
                        errors: notifications.filter(n => n.severity === 'error' || n.level === 'error').length,
                        warnings: notifications.filter(n => n.severity === 'warning' || n.level === 'warning').length,
                    } : { total: 0, errors: 0, warnings: 0 },
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const disguiseAPI = new DisguiseAPI();
