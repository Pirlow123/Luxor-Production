/**
 * Luxor Production - Hippotizer WebSocket Callback Client
 * Matches the official Callback API spec exactly.
 *
 * Connection: ws://<host>:40513
 * Subscription: Send JSON array of { "subscribe": { "category": "<CAT>" } }
 * Categories: MEDIA, PRESETS, SYSTEM
 *
 * Events received:
 *   MEDIA:   MEDIAMAP_CHANGED, MEDIAFILES_ADDED, MEDIAFILE_DELETED, MEDIAFILE_CHANGED
 *   PRESETS: PRESET_ADDED, PRESET_DELETED, PRESET_CHANGED, PRESETS_RESET
 *   SYSTEM:  CONFIG_CHANGED, SYSTEM_STATUS_CHANGED
 */
class HippoWebSocket {
    constructor() {
        this.ws = null;
        this.url = '';
        this.connected = false;
        this.intentionalClose = false;

        // Reconnection
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 100;
        this.baseDelay = 2000;
        this.maxDelay = 30000;
        this.reconnectTimer = null;

        // Event listeners
        this._listeners = new Map();

        // Categories to subscribe on connect
        this.categories = ['MEDIA', 'PRESETS', 'SYSTEM'];
    }

    configure(host, port = 40513) {
        this.url = `ws://${host}:${port}`;
    }

    connect() {
        if (!this.url) return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

        this.intentionalClose = false;
        this._emit('connecting');

        try {
            this.ws = new WebSocket(this.url);
        } catch (e) {
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this._emit('connected');

            // Send subscription for all categories per spec
            const subscriptions = this.categories.map(cat => ({ subscribe: { category: cat } }));
            this.ws.send(JSON.stringify(subscriptions));
        };

        this.ws.onmessage = (evt) => {
            let data;
            try {
                data = JSON.parse(evt.data);
            } catch {
                this._emit('raw', evt.data);
                return;
            }

            // Handle both single object and array of events
            const events = Array.isArray(data) ? data : [data];
            events.forEach(e => this._handleEvent(e));
        };

        this.ws.onerror = (err) => {
            this._emit('error', err);
        };

        this.ws.onclose = (evt) => {
            this.connected = false;
            this._emit('disconnected', { code: evt.code, reason: evt.reason });

            if (!this.intentionalClose) {
                this._scheduleReconnect();
            }
        };
    }

    disconnect() {
        this.intentionalClose = true;
        clearTimeout(this.reconnectTimer);
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.connected = false;
        this.reconnectAttempts = 0;
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this._emit('reconnect_failed');
            return;
        }

        const delay = Math.min(this.baseDelay * Math.pow(1.5, this.reconnectAttempts), this.maxDelay);
        this.reconnectAttempts++;
        this._emit('reconnecting', { attempt: this.reconnectAttempts, delay });
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    /**
     * Handle incoming event from server.
     * Per spec, events have: { category, event, data? }
     */
    _handleEvent(evt) {
        const category = evt.category;   // "MEDIA" | "PRESETS" | "SYSTEM"
        const eventName = evt.event;     // e.g. "MEDIAFILES_ADDED"
        const eventData = evt.data;      // varies by event

        // Emit specific event: e.g. "MEDIA:MEDIAFILES_ADDED"
        if (category && eventName) {
            this._emit(`${category}:${eventName}`, eventData);
        }

        // Emit by category: e.g. "MEDIA"
        if (category) {
            this._emit(category, { event: eventName, data: eventData });
        }

        // Emit generic
        this._emit('event', evt);

        // Emit by event name alone for convenience
        if (eventName) {
            this._emit(eventName, eventData);
        }
    }

    // ---- Event emitter ----
    on(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(fn);
        return () => this.off(event, fn);
    }

    off(event, fn) {
        const s = this._listeners.get(event);
        if (s) s.delete(fn);
    }

    _emit(event, data) {
        const s = this._listeners.get(event);
        if (s) s.forEach(fn => { try { fn(data); } catch (e) { console.error('[WS listener]', e); } });
    }
}

// Global singleton
const hippoWS = new HippoWebSocket();
