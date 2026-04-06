/**
 * Luxor Production — Disguise (d3) REST API Client
 * Base URL: http://<host>:80/api/session
 * Docs: https://developer.disguise.one/api/introduction/
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
    // TRANSPORT CONTROL
    // ================================================================

    /** POST /session/transport/play */
    async play() { return this.request('/session/transport/play', { method: 'POST' }); }

    /** POST /session/transport/pause — pause playback */
    async pause() { return this.request('/session/transport/pause', { method: 'POST' }); }

    /** POST /session/transport/stop */
    async stop() { return this.request('/session/transport/stop', { method: 'POST' }); }

    /** POST /session/transport/returntostart */
    async returnToStart() { return this.request('/session/transport/returntostart', { method: 'POST' }); }

    /** POST /session/transport/playsection — play to end of current section */
    async playSection() { return this.request('/session/transport/playsection', { method: 'POST' }); }

    /** POST /session/transport/playloopsection — loop current section */
    async playLoopSection() { return this.request('/session/transport/playloopsection', { method: 'POST' }); }

    /** POST /session/transport/gotoframe — jump to frame */
    async goToFrame(transport, frame, playmode) { return this.request('/session/transport/gotoframe', { method: 'POST', body: { transport, frame, playmode } }); }

    /** POST /session/transport/gototime — jump to time position */
    async goToTime(transport, time, playmode) { return this.request('/session/transport/gototime', { method: 'POST', body: { transport, time, playmode } }); }

    /** POST /session/transport/gototimecode — jump to timecode */
    async goToTimecode(transport, timecode, playmode) { return this.request('/session/transport/gototimecode', { method: 'POST', body: { transport, timecode, playmode } }); }

    /** POST /session/transport/gototrack — jump to start of track */
    async goToTrack(transport, track, playmode) { return this.request('/session/transport/gototrack', { method: 'POST', body: { transport, track, playmode } }); }

    /** POST /session/transport/gotonexttrack */
    async goToNextTrack() { return this.request('/session/transport/gotonexttrack', { method: 'POST' }); }

    /** POST /session/transport/gotoprevtrack */
    async goToPrevTrack() { return this.request('/session/transport/gotoprevtrack', { method: 'POST' }); }

    /** POST /session/transport/gotosection — jump to section */
    async goToSection(transport, section, playmode) { return this.request('/session/transport/gotosection', { method: 'POST', body: { transport, section, playmode } }); }

    /** POST /session/transport/gotonextsection */
    async goToNextSection() { return this.request('/session/transport/gotonextsection', { method: 'POST' }); }

    /** POST /session/transport/gotoprevsection */
    async goToPrevSection() { return this.request('/session/transport/gotoprevsection', { method: 'POST' }); }

    /** POST /session/transport/gotonote — navigate to a note */
    async goToNote(transport, note, playmode) { return this.request('/session/transport/gotonote', { method: 'POST', body: { transport, note, playmode } }); }

    /** POST /session/transport/gototag — jump to tag */
    async goToTag(transport, tagType, tagValue, playmode) { return this.request('/session/transport/gototag', { method: 'POST', body: { transport, tagType, tagValue, playmode } }); }

    /** POST /session/transport/volume — set transport volume */
    async setVolume(transport, volume) { return this.request('/session/transport/volume', { method: 'POST', body: { transport, volume } }); }

    /** POST /session/transport/brightness — set transport brightness */
    async setBrightness(transport, brightness) { return this.request('/session/transport/brightness', { method: 'POST', body: { transport, brightness } }); }

    /** POST /session/transport/engaged — set engaged status */
    async setEngaged(transport, engaged) { return this.request('/session/transport/engaged', { method: 'POST', body: { transport, engaged } }); }

    // ================================================================
    // TRANSPORT QUERIES
    // ================================================================

    /** GET /session/transport/activetransport — active transport */
    async getActiveTransport() { return this.request('/session/transport/activetransport'); }

    /** GET /session/transport/tracks — all tracks */
    async getTracks() { return this.request('/session/transport/tracks'); }

    /** GET /session/transport/annotations — annotations in a track */
    async getAnnotations(uid) { return this.request(`/session/transport/annotations${uid ? '?uid=' + uid : ''}`); }

    /** GET /session/transport/transports — all transports */
    async getTransports() { return this.request('/session/transport/transports'); }

    /** GET /session/transport/setlists — all set lists */
    async getSetLists() { return this.request('/session/transport/setlists'); }

    // ================================================================
    // STATUS
    // ================================================================

    /** GET /session/status/health — machine health */
    async getHealth() { return this.request('/session/status/health'); }

    /** GET /session/status/notifications — system notifications */
    async getNotifications() { return this.request('/session/status/notifications'); }

    /** GET /session/status/project — project info */
    async getProject() { return this.request('/session/status/project'); }

    /** GET /session/status/session — session config */
    async getSession() { return this.request('/session/status/session'); }

    // ================================================================
    // SEQUENCING (Indirections)
    // ================================================================

    /** GET /session/sequencing/indirections — list indirections */
    async getIndirections() { return this.request('/session/sequencing/indirections'); }

    /** GET /session/sequencing/indirectionresources — resources for indirection */
    async getIndirectionResources(uid) { return this.request(`/session/sequencing/indirectionresources?uid=${uid}`); }

    /** POST /session/sequencing/changeindirections — change indirections */
    async changeIndirections(changes) { return this.request('/session/sequencing/changeindirections', { method: 'POST', body: changes }); }

    // ================================================================
    // NOTES
    // ================================================================

    /** GET /session/notes — list all notes */
    async getNotes(start, count) { return this.request(`/session/notes${start != null ? '?start=' + start + '&count=' + (count || 50) : ''}`); }

    /** GET /session/note — get a note by uid or name */
    async getNote(uid) { return this.request(`/session/note?uid=${uid}`); }

    /** POST /session/note — create/update note */
    async setNote(note) { return this.request('/session/note', { method: 'POST', body: note }); }

    // ================================================================
    // SOCKPUPPET (Live Parameter Control)
    // ================================================================

    /** GET /session/sockpuppet/patches — HTTP sockpuppet patches */
    async getSockpuppetPatches() { return this.request('/session/sockpuppet/patches'); }

    /** POST /session/sockpuppet/live — send live changes */
    async sockpuppetLive(address, field, value) { return this.request('/session/sockpuppet/live', { method: 'POST', body: { address, field, value } }); }

    // ================================================================
    // COLOUR
    // ================================================================

    /** GET /session/colour/cdls — list CDLs */
    async getCDLs() { return this.request('/session/colour/cdls'); }

    /** POST /session/colour/cdl — set CDL */
    async setCDL(cdl) { return this.request('/session/colour/cdl', { method: 'POST', body: cdl }); }

    // ================================================================
    // RENDERSTREAM
    // ================================================================

    /** GET /session/renderstream/layers — RenderStream layers */
    async getRenderStreamLayers() { return this.request('/session/renderstream/layers'); }

    /** GET /session/renderstream/layerstatus — layer status */
    async getRenderStreamLayerStatus(uid) { return this.request(`/session/renderstream/layerstatus?uid=${uid}`); }

    /** POST /session/renderstream/startlayers — start workload */
    async startRenderStreamLayers(layers) { return this.request('/session/renderstream/startlayers', { method: 'POST', body: { layers } }); }

    /** POST /session/renderstream/stoplayers — stop workload */
    async stopRenderStreamLayers(layers) { return this.request('/session/renderstream/stoplayers', { method: 'POST', body: { layers } }); }

    /** POST /session/renderstream/restartlayers — restart workload */
    async restartRenderStreamLayers(layers) { return this.request('/session/renderstream/restartlayers', { method: 'POST', body: { layers } }); }

    /** POST /session/renderstream/synclayers — sync workload */
    async syncRenderStreamLayers(layers) { return this.request('/session/renderstream/synclayers', { method: 'POST', body: { layers } }); }

    // ================================================================
    // FAILOVER
    // ================================================================

    /** POST /session/failover/failovermachine — failover a machine */
    async failoverMachine(machine) { return this.request('/session/failover/failovermachine', { method: 'POST', body: { machine } }); }

    /** POST /session/failover/restoremachine — restore machine */
    async restoreMachine(machine) { return this.request('/session/failover/restoremachine', { method: 'POST', body: { machine } }); }

    /** GET /session/failover/settings — failover settings */
    async getFailoverSettings() { return this.request('/session/failover/settings'); }

    // ================================================================
    // MIXED REALITY
    // ================================================================

    /** GET /session/mixedreality/cameras */
    async getMRCameras() { return this.request('/session/mixedreality/cameras'); }

    /** GET /session/mixedreality/mrsets */
    async getMRSets() { return this.request('/session/mixedreality/mrsets'); }

    // ================================================================
    // SHOT RECORDER
    // ================================================================

    /** GET /session/shotrecorder/recorders */
    async getShotRecorders() { return this.request('/session/shotrecorder/recorders'); }

    /** POST /session/shotrecorder/record */
    async shotRecord(engage, name, slate, take) { return this.request('/session/shotrecorder/record', { method: 'POST', body: { engage, name, slate, take } }); }

    // ================================================================
    // SHOW CONTROL
    // ================================================================

    /** POST /session/transport/tcpstring — send TCP string command */
    async fireTCPString(command) { return this.request('/session/transport/tcpstring', { method: 'POST', body: { command } }); }

    /** POST /session/osc — send OSC message */
    async sendOSC(address, args) { return this.request('/session/osc', { method: 'POST', body: { address, args } }); }

    // ================================================================
    // SYSTEM
    // ================================================================

    /** GET /service/system/detectsystems — machines on network */
    async detectSystems() { return this.request('/service/system/detectsystems'); }

    // ================================================================
    // ALIASES (for compatibility with app.js connectToServer/poll)
    // ================================================================

    /** Alias — getTransportStatus → getActiveTransport */
    async getTransportStatus() { return this.getActiveTransport(); }

    /** Alias — getSections → getAnnotations (sections are annotations in d3) */
    async getSections() { return this.getAnnotations(); }

    /** Alias — getMachines → getHealth (machine health) */
    async getMachines() { return this.getHealth(); }

    // ================================================================
    // COMPOSITE STATE (for Show Run)
    // ================================================================

    async getState() {
        const [transport, tracks, annotations, health, project] = await Promise.all([
            this.getActiveTransport().catch(() => ({})),
            this.getTracks().catch(() => []),
            this.getAnnotations().catch(() => []),
            this.getHealth().catch(() => []),
            this.getProject().catch(() => ({})),
        ]);

        // Parse transport state
        const result = transport?.result || transport || {};
        const trackList = Array.isArray(tracks?.result) ? tracks.result : (Array.isArray(tracks) ? tracks : []);
        const annotList = Array.isArray(annotations?.result) ? annotations.result : (Array.isArray(annotations) ? annotations : []);
        const healthList = Array.isArray(health?.result) ? health.result : (Array.isArray(health) ? health : []);

        return {
            transport: result,
            tracks: trackList,
            annotations: annotList,
            health: healthList,
            project: project?.result || project || {},
            currentTrack: result.currentTrack || result.track || null,
            currentSection: result.currentSection || result.section || null,
            timecode: result.currentTime || result.timecode || '00:00:00:00',
            isPlaying: result.playing === true || result.state === 'playing',
            isPaused: result.state === 'paused',
            engaged: result.engaged !== false,
            volume: result.volume ?? 100,
            brightness: result.brightness ?? 100,
        };
    }

    // ================================================================
    // HEALTH CHECK
    // ================================================================
    async healthCheck() {
        try {
            const project = await this.getProject();
            const health = await this.getHealth().catch(() => []);
            const tracks = await this.getTracks().catch(() => []);
            const transport = await this.getActiveTransport().catch(() => ({}));
            const notifications = await this.getNotifications().catch(() => []);

            const healthList = Array.isArray(health?.result) ? health.result : (Array.isArray(health) ? health : []);
            const trackList = Array.isArray(tracks?.result) ? tracks.result : (Array.isArray(tracks) ? tracks : []);
            const notifList = Array.isArray(notifications?.result) ? notifications.result : (Array.isArray(notifications) ? notifications : []);

            return {
                ok: true,
                info: {
                    engineStatus: 'Running',
                    computerName: 'Disguise',
                    product: 'Disguise d3',
                    softwareVersion: (project?.result || project)?.version || '',
                    _status: { project: project?.result || project, transport: transport?.result || transport, health: healthList },
                    _tracks: trackList,
                    tracks: trackList.length,
                    notificationSummary: {
                        total: notifList.length,
                        errors: notifList.filter(n => n.severity === 'error' || n.level === 'error').length,
                        warnings: notifList.filter(n => n.severity === 'warning' || n.level === 'warning').length,
                    },
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const disguiseAPI = new DisguiseAPI();
