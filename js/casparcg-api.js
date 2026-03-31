/**
 * Luxor Production — CasparCG REST API Client
 * Base URL: http://<host>:8000/api/v1
 * Default HTTP API port: 8000
 */
class CasparcgAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 8000;
        this.timeout = 10000;
    }

    configure(host, port = 8000) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api/v1`;
    }

    get configured() { return !!this.baseUrl; }

    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'CasparCG API not configured', path);

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
    // SERVER INFO
    // ================================================================

    /** GET /api/v1/server — server version and channel list */
    async getServerInfo() { return this.request('/server'); }

    // ================================================================
    // CHANNELS
    // ================================================================

    /** GET /api/v1/channels — list all channels with current state */
    async getChannels() { return this.request('/channels'); }

    /** GET /api/v1/channels/<ch> — specific channel info */
    async getChannel(ch) { return this.request(`/channels/${ch}`); }

    /** POST /api/v1/channels/<ch>/clear — clear entire channel */
    async clearChannel(channel) { return this.request(`/channels/${channel}/clear`, { method: 'POST' }); }

    // ================================================================
    // LAYER PLAYBACK
    // ================================================================

    /** POST /api/v1/channels/<ch>/layers/<layer>/play — play media on layer */
    async playMedia(channel, layer, clip) {
        return this.request(`/channels/${channel}/layers/${layer}/play`, {
            method: 'POST',
            body: { clip },
        });
    }

    /** POST /api/v1/channels/<ch>/layers/<layer>/stop — stop layer */
    async stopLayer(channel, layer) {
        return this.request(`/channels/${channel}/layers/${layer}/stop`, { method: 'POST' });
    }

    /** POST /api/v1/channels/<ch>/layers/<layer>/load — load media in background */
    async loadMedia(channel, layer, clip) {
        return this.request(`/channels/${channel}/layers/${layer}/load`, {
            method: 'POST',
            body: { clip },
        });
    }

    /** POST /api/v1/channels/<ch>/layers/<layer>/clear — clear layer */
    async clearLayer(channel, layer) {
        return this.request(`/channels/${channel}/layers/${layer}/clear`, { method: 'POST' });
    }

    // ================================================================
    // LAYER PROPERTIES
    // ================================================================

    /** POST /api/v1/channels/<ch>/layers/<layer>/opacity — set layer opacity (0.0-1.0) */
    async setOpacity(channel, layer, value) {
        return this.request(`/channels/${channel}/layers/${layer}/opacity`, {
            method: 'POST',
            body: { value },
        });
    }

    /** POST /api/v1/channels/<ch>/layers/<layer>/volume — set layer volume (0.0-1.0) */
    async setVolume(channel, layer, value) {
        return this.request(`/channels/${channel}/layers/${layer}/volume`, {
            method: 'POST',
            body: { value },
        });
    }

    // ================================================================
    // MEDIA & TEMPLATES
    // ================================================================

    /** GET /api/v1/media — list available media files */
    async getMedia() { return this.request('/media'); }

    /** GET /api/v1/templates — list available templates */
    async getTemplates() { return this.request('/templates'); }

    // ================================================================
    // MIXER / TRANSFORM
    // ================================================================

    /** POST mixer opacity (0.0–1.0) */
    async setMixerOpacity(ch, layer, value) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/opacity`, {
            method: 'POST',
            body: { value },
        });
    }

    /** POST mixer brightness (0.0–1.0) */
    async setMixerBrightness(ch, layer, value) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/brightness`, {
            method: 'POST',
            body: { value },
        });
    }

    /** POST mixer contrast (0.0–1.0) */
    async setMixerContrast(ch, layer, value) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/contrast`, {
            method: 'POST',
            body: { value },
        });
    }

    /** POST mixer saturation (0.0–1.0) */
    async setMixerSaturation(ch, layer, value) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/saturation`, {
            method: 'POST',
            body: { value },
        });
    }

    /** POST mixer fill — position and scale on output */
    async setMixerFill(ch, layer, x, y, xScale, yScale) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/fill`, {
            method: 'POST',
            body: { x, y, xScale, yScale },
        });
    }

    /** POST mixer clip — crop/clip region */
    async setMixerClip(ch, layer, x, y, width, height) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/clip`, {
            method: 'POST',
            body: { x, y, width, height },
        });
    }

    /** POST mixer rotation in degrees */
    async setMixerRotation(ch, layer, angle) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/rotation`, {
            method: 'POST',
            body: { angle },
        });
    }

    /** POST mixer keyer toggle */
    async setMixerKeyer(ch, layer, enabled) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/keyer`, {
            method: 'POST',
            body: { enabled },
        });
    }

    /** POST mixer blend mode (add, screen, multiply, etc.) */
    async setMixerBlend(ch, layer, mode) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/blend`, {
            method: 'POST',
            body: { mode },
        });
    }

    /** POST clear all mixer transforms on layer */
    async clearMixer(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/clear`, { method: 'POST' });
    }

    /** POST mixer anchor point */
    async setMixerAnchor(ch, layer, x, y) {
        return this.request(`/channels/${ch}/layers/${layer}/mixer/anchor`, {
            method: 'POST',
            body: { x, y },
        });
    }

    /** POST commit deferred mixer changes on channel */
    async commitMixer(ch) {
        return this.request(`/channels/${ch}/mixer/commit`, { method: 'POST' });
    }

    // ================================================================
    // TEMPLATE / CG
    // ================================================================

    /** POST add CG template to layer */
    async cgAdd(ch, layer, template, data, playOnLoad = false) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/add`, {
            method: 'POST',
            body: { template, data, playOnLoad },
        });
    }

    /** POST play CG template */
    async cgPlay(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/play`, { method: 'POST' });
    }

    /** POST stop CG template */
    async cgStop(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/stop`, { method: 'POST' });
    }

    /** POST remove CG template */
    async cgRemove(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/remove`, { method: 'POST' });
    }

    /** POST update CG template data (JSON) */
    async cgUpdate(ch, layer, data) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/update`, {
            method: 'POST',
            body: { data },
        });
    }

    /** POST advance CG template to next step */
    async cgNext(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/next`, { method: 'POST' });
    }

    /** POST invoke CG template method */
    async cgInvoke(ch, layer, method) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/invoke`, {
            method: 'POST',
            body: { method },
        });
    }

    /** GET CG template info */
    async cgInfo(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/cg/info`);
    }

    // ================================================================
    // TRANSITION PLAYBACK
    // ================================================================

    /** POST play media with transition (MIX, CUT, PUSH, WIPE, SLIDE) */
    async playWithTransition(ch, layer, clip, transition, duration, easing) {
        return this.request(`/channels/${ch}/layers/${layer}/play`, {
            method: 'POST',
            body: { clip, transition, duration, easing },
        });
    }

    /** POST load media in background with transition */
    async loadBG(ch, layer, clip, transition, duration) {
        return this.request(`/channels/${ch}/layers/${layer}/loadbg`, {
            method: 'POST',
            body: { clip, transition, duration },
        });
    }

    /** POST pause playback on layer */
    async pauseLayer(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/pause`, { method: 'POST' });
    }

    /** POST resume playback on layer */
    async resumeLayer(ch, layer) {
        return this.request(`/channels/${ch}/layers/${layer}/resume`, { method: 'POST' });
    }

    /** POST seek to specific frame on layer */
    async callLayer(ch, layer, frame) {
        return this.request(`/channels/${ch}/layers/${layer}/call`, {
            method: 'POST',
            body: { frame },
        });
    }

    // ================================================================
    // ROUTE
    // ================================================================

    /** POST route source channel/layer to destination channel/layer */
    async routeChannel(srcCh, srcLayer, destCh, destLayer) {
        return this.request(`/channels/${destCh}/layers/${destLayer}/route`, {
            method: 'POST',
            body: { channel: srcCh, layer: srcLayer },
        });
    }

    // ================================================================
    // SYSTEM
    // ================================================================

    /** GET system info (version, channels) */
    async getSystemInfo() { return this.request('/system'); }

    /** GET media/template/log paths */
    async getPaths() { return this.request('/paths'); }

    /** GET list all thumbnails */
    async getThumbnails() { return this.request('/thumbnails'); }

    /** GET specific thumbnail (base64) */
    async getThumbnail(filename) {
        return this.request(`/thumbnails/${encodeURIComponent(filename)}`);
    }

    /** GET performance diagnostics */
    async getDiagnostics() { return this.request('/diagnostics'); }

    /** POST restart CasparCG server */
    async restart() { return this.request('/restart', { method: 'POST' }); }

    // ================================================================
    // AMCP RAW
    // ================================================================

    /** POST raw AMCP command */
    async executeAMCP(command) {
        return this.request('/amcp', {
            method: 'POST',
            body: { command },
        });
    }

    // ================================================================
    // AUDIO
    // ================================================================

    /** POST set layer volume with optional fade duration (ms) */
    async setMixerVolume(ch, layer, volume, fadeDuration) {
        const body = { volume };
        if (fadeDuration !== undefined) body.duration = fadeDuration;
        return this.request(`/channels/${ch}/layers/${layer}/mixer/volume`, {
            method: 'POST',
            body,
        });
    }

    /** POST set master channel volume */
    async setMixerMasterVolume(ch, volume) {
        return this.request(`/channels/${ch}/mixer/mastervolume`, {
            method: 'POST',
            body: { volume },
        });
    }

    // ================================================================
    // HEALTH CHECK — use server endpoint as health probe
    // ================================================================
    async healthCheck() {
        try {
            const server = await this.getServerInfo();
            const channels = server.channels || [];
            return {
                ok: true,
                info: {
                    engineStatus: 'Running',
                    computerName: server.name || 'CasparCG Server',
                    version: server.version || '',
                    channels: channels.length,
                    _serverInfo: server,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

// Global singleton
const casparcgAPI = new CasparcgAPI();
