/**
 * Bitfocus Companion Satellite API Client
 * Connects via WebSocket (port 16623) or TCP (port 16622) to register
 * Luxor as a virtual surface inside Companion.
 */
const CompanionAPI = {

    // Connection state
    _ws: null,
    _connected: false,
    _reconnectTimer: null,
    _pingTimer: null,
    _config: {
        host: '127.0.0.1',
        port: 16623,
        enabled: false,
        rows: 4,
        cols: 8,
        deviceId: 'luxor:panel-01',
        deviceName: 'Luxor Production',
    },

    // Button state received from Companion
    _buttons: {},      // key => { bitmap, text, textColor, bgColor, fontSize }
    _brightness: 100,
    _companionVersion: '',
    _apiVersion: '',

    // Callbacks
    _onStateChange: null,
    _onButtonUpdate: null,

    // ================================================================
    // CONFIG PERSISTENCE
    // ================================================================

    loadConfig() {
        try {
            const saved = JSON.parse(localStorage.getItem('luxor_companion_config') || '{}');
            Object.assign(this._config, saved);
        } catch {}
    },

    saveConfig() {
        try {
            localStorage.setItem('luxor_companion_config', JSON.stringify(this._config));
        } catch {}
    },

    getConfig() {
        return { ...this._config };
    },

    updateConfig(cfg) {
        const wasEnabled = this._config.enabled;
        const wasHost = this._config.host;
        const wasPort = this._config.port;
        Object.assign(this._config, cfg);
        this.saveConfig();

        // Reconnect if connection settings changed while enabled
        if (this._config.enabled) {
            if (!wasEnabled || wasHost !== this._config.host || wasPort !== this._config.port) {
                this.disconnect();
                this.connect();
            }
        } else {
            this.disconnect();
        }
    },

    // ================================================================
    // CONNECTION
    // ================================================================

    connect() {
        if (!this._config.enabled) return;
        if (this._ws) this.disconnect();

        const url = `ws://${this._config.host}:${this._config.port}`;
        console.log(`[Companion] Connecting to ${url}...`);

        try {
            this._ws = new WebSocket(url);
        } catch (e) {
            console.warn('[Companion] WebSocket creation failed:', e);
            this._scheduleReconnect();
            return;
        }

        this._ws.onopen = () => {
            console.log('[Companion] WebSocket connected');
            // Wait for BEGIN message from server before registering
        };

        this._ws.onmessage = (evt) => {
            this._handleMessage(String(evt.data));
        };

        this._ws.onerror = (err) => {
            console.warn('[Companion] WebSocket error:', err);
        };

        this._ws.onclose = () => {
            console.log('[Companion] WebSocket closed');
            this._connected = false;
            this._stopPing();
            this._notify();
            this._scheduleReconnect();
        };
    },

    disconnect() {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
        this._stopPing();

        if (this._ws) {
            try {
                // Send QUIT before closing
                if (this._ws.readyState === WebSocket.OPEN) {
                    this._send('QUIT');
                }
                this._ws.onclose = null;
                this._ws.close();
            } catch {}
            this._ws = null;
        }

        this._connected = false;
        this._buttons = {};
        this._notify();
    },

    _scheduleReconnect() {
        if (!this._config.enabled) return;
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => this.connect(), 5000);
    },

    _send(msg) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(msg + '\n');
        }
    },

    // ================================================================
    // SATELLITE PROTOCOL
    // ================================================================

    _handleMessage(raw) {
        // Companion sends line-delimited messages, may batch multiple lines
        const lines = raw.split('\n').filter(l => l.trim());
        for (const line of lines) {
            this._processLine(line.trim());
        }
    },

    _processLine(line) {
        // Parse key=value pairs from a message line
        const parseArgs = (str) => {
            const args = {};
            const re = /(\w+)=(?:"([^"]*)"|([\S]*))/g;
            let m;
            while ((m = re.exec(str))) {
                args[m[1]] = m[2] !== undefined ? m[2] : m[3];
            }
            return args;
        };

        if (line.startsWith('BEGIN')) {
            // BEGIN CompanionVersion=3.4.0 ApiVersion=1.10.0
            const args = parseArgs(line);
            this._companionVersion = args.CompanionVersion || '';
            this._apiVersion = args.ApiVersion || '';
            console.log(`[Companion] Server: Companion v${this._companionVersion}, API v${this._apiVersion}`);

            // Register our virtual surface
            this._registerDevice();
            this._connected = true;
            this._startPing();
            this._notify();
            return;
        }

        if (line === 'PONG') {
            return; // Keepalive response
        }

        if (line.startsWith('KEY-STATE')) {
            const args = parseArgs(line);
            const key = args.KEY;
            if (key === undefined) return;

            this._buttons[key] = {
                bitmap: args.BITMAP || null,
                text: args.TEXT ? this._decodeBase64(args.TEXT) : '',
                textColor: args.TEXTCOLOR || '#ffffff',
                bgColor: args.COLOR || '#000000',
                fontSize: parseInt(args.FONT_SIZE) || 14,
                type: args.TYPE || 'BUTTON',
            };

            if (this._onButtonUpdate) this._onButtonUpdate(key, this._buttons[key]);
            return;
        }

        if (line.startsWith('KEYS-CLEAR')) {
            this._buttons = {};
            if (this._onButtonUpdate) this._onButtonUpdate(null, null);
            return;
        }

        if (line.startsWith('BRIGHTNESS')) {
            const args = parseArgs(line);
            this._brightness = parseInt(args.VALUE) || 100;
            this._notify();
            return;
        }
    },

    _registerDevice() {
        const total = this._config.rows * this._config.cols;
        const cmd = [
            'ADD-DEVICE',
            `DEVICEID=${this._config.deviceId}`,
            `PRODUCT_NAME="${this._config.deviceName}"`,
            `KEYS_TOTAL=${total}`,
            `KEYS_PER_ROW=${this._config.cols}`,
            'BITMAPS=72',
            'COLORS=hex',
            'TEXT=true',
            'TEXT_STYLE=true',
        ].join(' ');
        this._send(cmd);
        console.log(`[Companion] Registered device: ${this._config.deviceId} (${this._config.cols}x${this._config.rows})`);
    },

    // ================================================================
    // BUTTON PRESS / INTERACTION
    // ================================================================

    pressButton(keyIndex) {
        this._send(`KEY-PRESS DEVICEID=${this._config.deviceId} KEY=${keyIndex} PRESSED=true`);
    },

    releaseButton(keyIndex) {
        this._send(`KEY-PRESS DEVICEID=${this._config.deviceId} KEY=${keyIndex} PRESSED=false`);
    },

    rotateEncoder(keyIndex, direction) {
        // direction: 1 = right, -1 = left
        this._send(`KEY-ROTATE DEVICEID=${this._config.deviceId} KEY=${keyIndex} DIRECTION=${direction}`);
    },

    // ================================================================
    // KEEPALIVE
    // ================================================================

    _startPing() {
        this._stopPing();
        this._pingTimer = setInterval(() => this._send('PING'), 2000);
    },

    _stopPing() {
        clearInterval(this._pingTimer);
        this._pingTimer = null;
    },

    // ================================================================
    // HELPERS
    // ================================================================

    _decodeBase64(b64) {
        try { return atob(b64); } catch { return b64; }
    },

    _notify() {
        if (this._onStateChange) this._onStateChange();
    },

    isConnected() {
        return this._connected;
    },

    getButtons() {
        return this._buttons;
    },

    getButtonState(keyIndex) {
        return this._buttons[keyIndex] || null;
    },

    // ================================================================
    // INIT
    // ================================================================

    init() {
        this.loadConfig();
        if (this._config.enabled) {
            this.connect();
        }
    },
};
