/**
 * Luxor Production - Application State
 */
class AppState {
    constructor() {
        this.data = {
            // Servers
            servers: this._load('luxor_servers', []),
            activeServerId: null,
            connected: false,
            wsConnected: false,

            // Server info (from GET /info → ServerInfo model)
            serverInfo: null,
            // { computerName, engineStatus, hostName, iP, mediaManagerStatus,
            //   mixes: MixInfo[], product, productFamily, registeredOwner, softwareRevision, softwareVersion }

            // Timelines (from GET /timelines)
            timelines: [],

            // Media
            mediaDatabase: null, // from GET /media
            mediaMap: null,      // from GET /media/map → { entries: MediaMapEntry[] }

            // Mix levels cache: { [mixIndex]: level }
            mixLevels: {},

            // Layer levels cache: { [`${mix}-${layer}`]: level }
            layerLevels: {},

            // Presets
            mixPresets: null,   // from GET /presets/mix
            layerPresets: null, // from GET /presets/layer

            // Resolume Arena state
            composition: null,     // from GET /api/v1/composition
            resolumeEffects: null, // from GET /api/v1/effects
            resolumeSources: null, // from GET /api/v1/sources

            // vMix state
            vmixState: null,       // parsed XML state

            // CasparCG state
            casparcgChannels: null, // from GET /api/v1/channels
            casparcgMedia: null,    // from GET /api/v1/media

            // OBS state
            obsScenes: null,        // from GetSceneList
            obsCurrentScene: null,  // current program scene name
            obsPreviewScene: null,  // current preview scene name
            obsInputs: null,        // from GetInputList
            obsStreamStatus: null,  // streaming/recording status

            // Server type: 'hippo' | 'resolume' | 'vmix' | 'casparcg' | 'obs'
            serverType: null,

            // Multi-server status tracking
            serverStatuses: {}, // { [serverId]: { info, lastSeen, online, ... } }

            // UI
            currentPage: 'dashboard',
            sidebarCollapsed: false,

            // Network config (persisted locally)
            networkConfig: this._load('luxor_network', this._defaultNetwork()),

            // Logs (persisted to localStorage)
            logs: this._load('luxor_event_logs', []),
            maxLogs: 500,

            // Polling
            pollInterval: 3000,
            pollTimer: null,
        };

        this._watchers = new Map();
    }

    get(key) { return this.data[key]; }

    set(key, value) {
        const old = this.data[key];
        this.data[key] = value;
        this._notify(key, value, old);
    }

    on(key, fn) {
        if (!this._watchers.has(key)) this._watchers.set(key, new Set());
        this._watchers.get(key).add(fn);
        return () => this._watchers.get(key)?.delete(fn);
    }

    _notify(key, val, old) {
        this._watchers.get(key)?.forEach(fn => { try { fn(val, old); } catch(e) { console.error(e); } });
        this._watchers.get('*')?.forEach(fn => { try { fn(key, val, old); } catch(e) { console.error(e); } });
    }

    // ---- Server management ----
    addServer(s) {
        const type = s.type || 'hippo';
        const defaultPorts = { hippo: 40512, resolume: 8080, vmix: 8088, casparcg: 8000, obs: 4455, barco: 9999, qlab: 53000, disguise: 80, pixera: 1400 };
        const defaultWsPorts = { hippo: 40513, resolume: 8080, vmix: 8088, casparcg: 8000, obs: 4455, barco: 9999, qlab: 53000, disguise: 80, pixera: 1400 };
        const server = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: s.name || s.host,
            host: s.host,
            port: s.port || defaultPorts[type] || 40512,
            wsPort: s.wsPort || defaultWsPorts[type] || 40513,
            type,
            created: new Date().toISOString(),
        };
        const servers = [...this.data.servers, server];
        this.set('servers', servers);
        this._save('luxor_servers', servers);
        return server;
    }

    removeServer(id) {
        const servers = this.data.servers.filter(s => s.id !== id);
        this.set('servers', servers);
        this._save('luxor_servers', servers);
        // Clean up status
        const statuses = { ...this.data.serverStatuses };
        delete statuses[id];
        this.set('serverStatuses', statuses);
    }

    updateServer(id, updates) {
        const servers = this.data.servers.map(s => s.id === id ? { ...s, ...updates } : s);
        this.set('servers', servers);
        this._save('luxor_servers', servers);
    }

    updateServerStatus(id, status) {
        const statuses = { ...this.data.serverStatuses, [id]: { ...this.data.serverStatuses[id], ...status, lastSeen: Date.now() } };
        this.set('serverStatuses', statuses);
    }

    // ---- Network config ----
    setNetworkConfig(cfg) {
        this.set('networkConfig', cfg);
        this._save('luxor_network', cfg);
    }

    _defaultNetwork() {
        return {
            hipponet: { enabled: true, interface: 'auto', port: 7400, discovery: true, syncEnabled: true, masterIp: '', maxNodes: 64, heartbeat: 5, timeout: 30 },
            artnet: { enabled: true, mode: 'broadcast', interface: 'auto', subnet: 0, universe: 0, net: 0, broadcastIp: '255.255.255.255', unicastTargets: [], artSync: true, rdm: false, input: true, output: false, mergeMode: 'HTP', refreshRate: 44, universes: [{ idx: 0, sub: 0, uni: 0, enabled: true, label: 'Universe 1' }] },
            sacn: { enabled: false, priority: 100, universes: [1], multicast: true, unicastTargets: [], perSourcePriority: false, syncUniverse: 0, acceptAll: true, allowedSources: [], sourceName: 'Luxor', refreshRate: 44 },
            manet: { enabled: false, sessionId: 1, mode: 'passive', interface: 'auto' },
            osc: { enabled: false, listenPort: 8000, sendPort: 9000, sendHost: '127.0.0.1', protocol: 'udp' },
            midi: { enabled: false, inputDevice: '', outputDevice: '', channel: 0, mscEnabled: false, mscDeviceId: 1 },
            tcp: { enabled: false, listenPort: 40513, maxConnections: 10, keepAlive: true, delimiter: '\\n' },
            citp: { enabled: false, thumbnailSize: 'medium', port: 4809, peerName: 'Luxor' },
            general: { hostname: '', primaryInterface: 'auto', mtu: 1500, qos: 'normal', bandwidthLimit: 0, ntpServer: 'pool.ntp.org', ntpEnabled: true },
        };
    }

    // ---- Logging ----
    log(level, msg, source = 'System') {
        const entry = { id: Date.now() + Math.random(), ts: new Date().toISOString(), level, msg, source };
        const logs = [entry, ...this.data.logs].slice(0, this.data.maxLogs);
        this.set('logs', logs);
        this._save('luxor_event_logs', logs);
        return entry;
    }

    // ---- Persistence ----
    _load(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
        catch { return fallback; }
    }

    _save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }
}

const appState = new AppState();
