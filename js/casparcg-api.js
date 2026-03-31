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
