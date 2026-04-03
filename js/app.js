/**
 * LUXOR Media Server — Main Application Controller
 * Handles routing, server connections, polling, and WebSocket integration
 */
const HippoApp = {
    // Page registry
    pages: {
        showrun:      ShowRunPage,
        dashboard:    DashboardPage,
        status:       StatusPage,
        composition:  CompositionPage,
        timelines:    TimelinesPage,
        media:        MediaPage,
        mixes:        MixesPage,
        presets:      PresetsPage,
        pins:         PinsPage,
        timecode:     TimecodePage,
        network:      NetworkPage,
        dmx:          DmxPage,
        sync:         SyncPage,
        ledprocessor: LedProcessorPage,
        ledcalc:      LedCalcPage,
        ledsetup:     LedSetupPage,
        ptz:          PtzPage,
        netswitch:    NetSwitchPage,
        lighting:     LightingPage,
        intercom:     IntercomPage,
        pixlgrid:     PixlGridPage,
        diagram:      DiagramPage,
        ledconnect:   LedConnectPage,
        stage3d:      Stage3dPage,
        ledpanel3d:   LedPanel3dPage,
        power:        PowerDistPage,
        fixtures:     FixturesPage,
        truckpack:    TruckPackPage,
        captureview:  CaptureViewPage,
        specifications: SpecificationsPage,
        settings:     SettingsPage,
        logs:         LogsPage,
    },

    // Pages only visible for specific server types
    _hippoPages: ['timelines', 'media', 'mixes', 'presets', 'pins', 'timecode', 'network', 'dmx', 'sync'],
    _resolumePages: ['composition'],
    // Common pages shown for all: showrun, dashboard, status, settings, logs, ledprocessor

    _currentPageObj: null,

    // ================================================================
    // INITIALIZATION
    // ================================================================
    init() {
        // No auto-seeding — user adds servers manually via Add Server dialog

        this.populateServerSelect();
        this.setupNavigation();
        this.setupWebSocketListeners();
        this.setupKeyboardShortcuts();
        this.initProjectSystem();
        this.initLedProcessors();
        this.initPtzCameras();
        this.initNetSwitches();
        this.initLightingConsoles();
        this.initIntercomSystems();
        this.applySidebarVisibility();

        // Initialize Companion Satellite connection
        if (typeof CompanionAPI !== 'undefined') CompanionAPI.init();

        // Navigate to hash or default
        const hash = location.hash.replace('#', '') || 'dashboard';
        this.navigate(hash);

        // Populate server select but do NOT auto-connect on startup
        const servers = appState.get('servers');
        const lastServerId = localStorage.getItem('luxor_last_server');
        const lastServer = lastServerId ? servers.find(s => s.id === lastServerId) : null;
        if (lastServer) {
            document.getElementById('server-select').value = lastServer.id;
        }

        // Hide nav until a server is connected
        this.updateNavVisibility(null);

        appState.log('INFO', 'Luxor Production v1.3 started', 'System');
    },

    // ================================================================
    // NAVIGATION
    // ================================================================
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(link.dataset.page);
            });
        });

        window.addEventListener('hashchange', () => {
            const hash = location.hash.replace('#', '');
            if (hash && this.pages[hash]) this.navigate(hash);
        });
    },

    navigate(page) {
        if (!this.pages[page]) page = 'dashboard';

        // Deactivate previous page
        if (this._currentPageObj?.onDeactivate) {
            this._currentPageObj.onDeactivate();
        }

        appState.set('currentPage', page);
        location.hash = page;

        // Update nav
        document.querySelectorAll('.nav-item').forEach(l => l.classList.toggle('active', l.dataset.page === page));

        // Update title
        const titles = {
            showrun: 'Show Run', dashboard: 'Dashboard', status: 'System Status',
            composition: 'Composition', timelines: 'Timelines',
            media: 'Media Library', mixes: 'Mixes & Layers', presets: 'Presets',
            pins: 'Pin Control', ledprocessor: 'LED Processor', network: 'Network Config', dmx: 'DMX / Art-Net',
            sync: 'Sync & Cluster', lighting: 'Lighting Console', intercom: 'Intercom', settings: 'Settings', logs: 'Event Log',
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        this.renderPage();

        // Activate new page
        this._currentPageObj = this.pages[page];
        if (this._currentPageObj?.onActivate) {
            this._currentPageObj.onActivate();
        }
    },

    renderPage() {
        const page = appState.get('currentPage');
        const pageObj = this.pages[page];
        if (!pageObj) return;
        document.getElementById('page-container').innerHTML = pageObj.render();
    },

    // ================================================================
    // SERVER CONNECTION
    // ================================================================
    populateServerSelect() {
        // Keep hidden select in sync for internal use
        const select = document.getElementById('server-select');
        const servers = appState.get('servers');
        const activeId = appState.get('activeServerId');

        select.innerHTML = '<option value="">-- Select Server --</option>' +
            servers.map(s => {
                const icon = s.virtual ? '\u{1F9EA} ' : (s.type === 'resolume' ? '\u{1F3AC} ' : '\u{1F3A5} ');
                const suffix = s.virtual ? '' : ` (${s.host}:${s.port})`;
                return `<option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>${icon}${UI.esc(s.name)}${suffix}</option>`;
            }).join('');

        // Render card-style server list
        this.renderServerList();
    },

    renderServerList() {
        const container = document.getElementById('server-list');
        if (!container) return;

        const servers = appState.get('servers');
        const activeId = appState.get('activeServerId');
        const connected = appState.get('connected');

        if (servers.length === 0) {
            container.innerHTML = `<div style="font-size:10px;color:var(--text-muted);padding:4px 0;">No servers added</div>`;
            return;
        }

        container.innerHTML = servers.map(s => {
            const t = this._serverTypes[s.type] || this._serverTypes['hippo'];
            const isActive = s.id === activeId;
            const isOnline = isActive && connected;
            const borderColor = isActive ? t.color : 'var(--border)';
            return `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:${isActive ? 'rgba(' + t.rgb + ',0.08)' : 'var(--bg-tertiary)'};border-radius:6px;border:1px solid ${borderColor};cursor:pointer;"
                 onclick="HippoApp.switchServer('${s.id}')" title="${isActive ? 'Connected' : 'Click to connect'}">
                <span style="width:6px;height:6px;border-radius:50%;background:${isOnline ? '#4ade80' : isActive ? '#f59e0b' : '#6b7280'};flex-shrink:0;"></span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:10px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${UI.esc(s.name)}
                    </div>
                    <div style="font-size:8px;color:var(--text-muted);">
                        ${t.label} ${s.virtual ? '(Demo)' : s.host ? '— ' + s.host : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation();HippoApp.removeServer('${s.id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px;padding:2px;" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        }).join('');
    },

    removeServer(id) {
        const server = appState.get('servers').find(s => s.id === id);
        if (!server) return;
        UI.openModal('Remove Server', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(server.name)}</strong>?</p>
            <p style="text-align:center;font-size:11px;color:var(--text-muted);">This will disconnect and remove the server.</p>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="HippoApp._confirmRemoveServer('${id}')">Remove</button>`);
    },

    _confirmRemoveServer(id) {
        const servers = appState.get('servers').filter(s => s.id !== id);
        const activeId = appState.get('activeServerId');
        if (id === activeId) this.disconnect();
        appState.set('servers', servers);
        appState._save('luxor_servers', servers);
        this.populateServerSelect();
        UI.closeModal();
        UI.toast('Server removed', 'info');
    },

    switchServer(serverId) {
        if (serverId) this.connectToServer(serverId);
        else this.disconnect();
    },

    async connectToServer(serverId) {
        const server = appState.get('servers').find(s => s.id === serverId);
        if (!server) { UI.toast('Server not found', 'error'); return; }

        // Disconnect existing
        this.disconnect();

        const serverType = server.type || 'hippo';
        const isVirtual = !!server.virtual;

        appState.set('activeServerId', serverId);
        appState.set('serverType', serverType);
        localStorage.setItem('luxor_last_server', serverId);

        // Update UI
        this.setConnectionStatus('connecting', 'CONNECTING');

        // Activate ALL virtual servers so System Status can query them all simultaneously
        this._activateAllVirtualServers();

        // Configure appropriate API
        switch (serverType) {
            case 'resolume':
                resolumeAPI.configure(server.host, server.port);
                break;
            case 'vmix':
                vmixAPI.configure(server.host, server.port);
                break;
            case 'casparcg':
                casparcgAPI.configure(server.host, server.port);
                break;
            case 'obs':
                obsAPI.configure(server.host, server.port);
                // For virtual OBS, inject the virtual WebSocket before connect
                if (isVirtual) obsAPI.useVirtualWs(VirtualObs.createWebSocket());
                break;
            case 'barco':
                barcoAPI.configure(server.host, server.port);
                break;
            case 'qlab':
                qlabAPI.configure(server.host, server.port);
                // For virtual QLab, inject the virtual WebSocket
                if (isVirtual) qlabAPI.useVirtualWs(VirtualQlab.createWebSocket());
                break;
            case 'disguise':
                disguiseAPI.configure(server.host, server.port);
                break;
            case 'pixera':
                pixeraAPI.configure(server.host, server.port);
                break;
            case 'atem':
                atemAPI.configure(server.host, server.port);
                break;
            default:
                hippoAPI.configure(server.host, server.port);
                if (!isVirtual) hippoWS.configure(server.host, server.wsPort || 40513);
                break;
        }

        // Test connection
        try {
            let health;
            switch (serverType) {
                case 'resolume': health = await resolumeAPI.healthCheck(); break;
                case 'vmix': health = await vmixAPI.healthCheck(); break;
                case 'casparcg': health = await casparcgAPI.healthCheck(); break;
                case 'obs': health = await obsAPI.healthCheck(); break;
                case 'barco': health = await barcoAPI.healthCheck(); break;
                case 'qlab': health = await qlabAPI.healthCheck(); break;
                case 'disguise': health = await disguiseAPI.healthCheck(); break;
                case 'pixera': health = await pixeraAPI.healthCheck(); break;
                case 'atem': health = await atemAPI.healthCheck(); break;
                default: health = await hippoAPI.healthCheck(); break;
            }

            if (!health.ok) throw new Error(health.error);

            appState.set('connected', true);
            appState.set('serverInfo', health.info);
            appState.updateServerStatus(serverId, { online: true, info: health.info });

            this.setConnectionStatus('connected', 'ONLINE');
            this.updateTopbarStatus(health.info);
            this.updateEngineFooter(health.info);

            // Update nav visibility for server type
            this.updateNavVisibility(serverType);

            const typeLabel = { hippo: 'Hippo', resolume: 'Resolume', vmix: 'vMix', casparcg: 'CasparCG', obs: 'OBS', barco: 'Barco E2', qlab: 'QLab', disguise: 'Disguise', pixera: 'Pixera' }[serverType] || serverType;
            appState.log('INFO', `Connected to ${server.name} [${typeLabel}]${isVirtual ? ' (Virtual)' : ''}`, 'Connection');
            UI.toast(`Connected to ${server.name}`, 'success');

            // Fetch initial data
            switch (serverType) {
                case 'resolume':
                    if (health.info._composition) appState.set('composition', health.info._composition);
                    break;
                case 'vmix':
                    if (health.info._vmixState) appState.set('vmixState', health.info._vmixState);
                    break;
                case 'casparcg':
                    if (health.info._serverInfo) {
                        const ch = await casparcgAPI.getChannels().catch(() => null);
                        if (ch) appState.set('casparcgChannels', ch);
                        const media = await casparcgAPI.getMedia().catch(() => null);
                        if (media) appState.set('casparcgMedia', media);
                    }
                    break;
                case 'obs':
                    if (health.info._obsInfo) {
                        const scenes = await obsAPI.getSceneList().catch(() => null);
                        if (scenes) {
                            appState.set('obsScenes', scenes.scenes);
                            appState.set('obsCurrentScene', scenes.currentProgramSceneName);
                            appState.set('obsPreviewScene', scenes.currentPreviewSceneName);
                        }
                        const inputResp = await obsAPI.getSourceList().catch(() => null);
                        if (inputResp) appState.set('obsInputs', inputResp.inputs || inputResp);
                    }
                    break;
                case 'barco':
                    if (health.info._presets) {
                        appState.set('barcoPresets', health.info._presets);
                        appState.set('barcoDestinations', health.info._destinations || []);
                        appState.set('barcoSources', health.info._sources || []);
                    }
                    break;
                case 'qlab': {
                    const ws = await qlabAPI.getWorkspaces().catch(() => null);
                    if (ws && ws.length > 0) {
                        appState.set('qlabWorkspaces', ws);
                        appState.set('qlabActiveWorkspace', ws[0].uniqueID || ws[0].id);
                        const cues = await qlabAPI.getCueList(ws[0].uniqueID || ws[0].id).catch(() => null);
                        if (cues) appState.set('qlabCueLists', cues);
                    }
                    break;
                }
                case 'disguise': {
                    const tracks = await disguiseAPI.getTracks().catch(() => null);
                    if (tracks) appState.set('disguiseTracks', tracks);
                    const transport = await disguiseAPI.getTransportStatus().catch(() => null);
                    if (transport) appState.set('disguiseTransport', transport);
                    const sections = await disguiseAPI.getSections().catch(() => null);
                    if (sections) appState.set('disguiseSections', sections);
                    const machines = await disguiseAPI.getMachines().catch(() => null);
                    if (machines) appState.set('disguiseMachines', machines);
                    break;
                }
                case 'pixera': {
                    const timelines = await pixeraAPI.getTimelines().catch(() => null);
                    if (timelines) appState.set('pixeraTimelines', timelines);
                    const screens = await pixeraAPI.getScreens().catch(() => null);
                    if (screens) appState.set('pixeraScreens', screens);
                    break;
                }
                case 'atem': {
                    const inputs = await atemAPI.getInputs().catch(() => null);
                    if (inputs) appState.set('atemInputs', inputs);
                    const audio = await atemAPI.getAudioMixer().catch(() => null);
                    if (audio) appState.set('atemAudio', audio);
                    break;
                }
                default:
                    await this.fetchInitialData();
                    break;
            }

            // Start WebSocket (virtual or real)
            if (isVirtual) {
                switch (serverType) {
                    case 'resolume': this._virtualWs = VirtualResolume.createWebSocket(); break;
                    case 'vmix': this._virtualWs = VirtualVmix.createWebSocket(); break;
                    case 'casparcg': this._virtualWs = VirtualCasparcg.createWebSocket(); break;
                    case 'obs': this._virtualWs = VirtualObs.createWebSocket(); break;
                    case 'qlab': this._virtualWs = VirtualQlab.createWebSocket(); break;
                    case 'atem': this._virtualWs = VirtualAtem.createWebSocket(); break;
                    default: this._virtualWs = VirtualHippo.createWebSocket(); break;
                }
                this._virtualWs.addEventListener('open', () => {
                    appState.set('wsConnected', true);
                    document.getElementById('ws-badge').classList.add('connected');
                });
                this._virtualWs.addEventListener('message', (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (serverType === 'resolume') {
                            this.handleResolumeWsEvent(msg);
                        } else {
                            this.handleWsEvent(msg);
                        }
                    } catch {}
                });
            } else if (serverType === 'hippo') {
                hippoWS.connect();
            } else if (serverType === 'obs') {
                // OBS uses WebSocket natively — connect the real API
                try { await obsAPI.connect(); appState.set('wsConnected', true); document.getElementById('ws-badge').classList.add('connected'); } catch {}
            }

            // Start polling
            this.startPolling();

            // Navigate to appropriate default page
            const currentPage = appState.get('currentPage');
            if (serverType === 'resolume' && this._hippoPages.includes(currentPage)) {
                this.navigate('composition');
            } else if (this._hippoPages.includes(currentPage) && serverType !== 'hippo') {
                this.navigate('dashboard');
            } else if (this._resolumePages.includes(currentPage) && serverType !== 'resolume') {
                this.navigate('dashboard');
            } else {
                this.renderPage();
                if (this._currentPageObj?.onActivate) this._currentPageObj.onActivate();
            }

        } catch (e) {
            appState.set('connected', false);
            appState.updateServerStatus(serverId, { online: false, error: e.message });
            this.setConnectionStatus('disconnected', 'OFFLINE');
            UI.toast(`Connection failed: ${e.message}`, 'error');
            appState.log('ERROR', `Connection failed: ${e.message}`, 'Connection');
        }

        this.populateServerSelect();
    },

    _deactivateAllVirtualServers() {
        if (VirtualHippo.isActive()) VirtualHippo.deactivate();
        if (VirtualResolume.isActive()) VirtualResolume.deactivate();
        if (typeof VirtualVmix !== 'undefined' && VirtualVmix.isActive()) VirtualVmix.deactivate();
        if (typeof VirtualCasparcg !== 'undefined' && VirtualCasparcg.isActive()) VirtualCasparcg.deactivate();
        if (typeof VirtualObs !== 'undefined' && VirtualObs.isActive()) VirtualObs.deactivate();
        if (typeof VirtualBarco !== 'undefined' && VirtualBarco.isActive()) VirtualBarco.deactivate();
        if (typeof VirtualQlab !== 'undefined' && VirtualQlab.isActive()) VirtualQlab.deactivate();
        if (typeof VirtualDisguise !== 'undefined' && VirtualDisguise.isActive()) VirtualDisguise.deactivate();
        if (typeof VirtualPixera !== 'undefined' && VirtualPixera.isActive()) VirtualPixera.deactivate();
        if (typeof VirtualAtem !== 'undefined' && VirtualAtem.isActive()) VirtualAtem.deactivate();
    },

    _activateAllVirtualServers() {
        // Deactivate all first to reset fetch chain
        this._deactivateAllVirtualServers();
        // Activate all virtual servers so System Status can query them all simultaneously
        const servers = appState.get('servers');
        const virtualMap = {
            hippo:    (s) => VirtualHippo.activate(`http://${s.host}:${s.port}`),
            resolume: (s) => VirtualResolume.activate(`http://${s.host}:${s.port}/api/v1`),
            vmix:     (s) => typeof VirtualVmix !== 'undefined' && VirtualVmix.activate(`http://${s.host}:${s.port}`),
            casparcg: (s) => typeof VirtualCasparcg !== 'undefined' && VirtualCasparcg.activate(`http://${s.host}:${s.port}`),
            obs:      (s) => typeof VirtualObs !== 'undefined' && VirtualObs.activate(),
            barco:    (s) => typeof VirtualBarco !== 'undefined' && VirtualBarco.activate(`http://${s.host}:${s.port}`),
            qlab:     (s) => typeof VirtualQlab !== 'undefined' && VirtualQlab.activate(),
            disguise: (s) => typeof VirtualDisguise !== 'undefined' && VirtualDisguise.activate(`http://${s.host}:${s.port}/api`),
            pixera:   (s) => typeof VirtualPixera !== 'undefined' && VirtualPixera.activate(`http://${s.host}:${s.port}`),
            atem:     (s) => typeof VirtualAtem !== 'undefined' && VirtualAtem.activate(`http://${s.host}:${s.port}/api/v1/switcher`),
        };
        servers.forEach(s => {
            if (s.virtual) {
                const activator = virtualMap[s.type || 'hippo'];
                if (activator) activator(s);
            }
        });
    },

    disconnect() {
        this.stopPolling();
        hippoWS.disconnect();
        if (typeof obsAPI !== 'undefined') obsAPI.disconnect();
        if (typeof qlabAPI !== 'undefined') qlabAPI.disconnect();
        // Clean up all virtual modes
        this._deactivateAllVirtualServers();
        if (this._virtualWs) { this._virtualWs.close(); this._virtualWs = null; }
        appState.set('connected', false);
        appState.set('wsConnected', false);
        appState.set('activeServerId', null);
        appState.set('serverInfo', null);
        appState.set('serverType', null);
        appState.set('timelines', []);
        appState.set('mediaDatabase', null);
        appState.set('mediaMap', null);
        appState.set('mixLevels', {});
        appState.set('layerLevels', {});
        appState.set('mixPresets', null);
        appState.set('layerPresets', null);
        appState.set('composition', null);
        appState.set('resolumeEffects', null);
        appState.set('resolumeSources', null);
        appState.set('vmixState', null);
        appState.set('casparcgChannels', null);
        appState.set('casparcgMedia', null);
        appState.set('obsScenes', null);
        appState.set('obsCurrentScene', null);
        appState.set('obsPreviewScene', null);
        appState.set('obsInputs', null);
        appState.set('obsStreamStatus', null);
        appState.set('barcoPresets', null);
        appState.set('barcoDestinations', null);
        appState.set('barcoSources', null);
        appState.set('qlabWorkspaces', null);
        appState.set('qlabActiveWorkspace', null);
        appState.set('qlabCueLists', null);
        appState.set('disguiseTracks', null);
        appState.set('disguiseTransport', null);
        appState.set('disguiseSections', null);
        appState.set('disguiseMachines', null);
        appState.set('pixeraTimelines', null);
        appState.set('pixeraScreens', null);
        this.setConnectionStatus('disconnected', 'OFFLINE');
        document.getElementById('engine-status-text').textContent = '--';
        document.getElementById('media-status-text').textContent = '--';
        document.getElementById('topbar-conn-dot').style.color = 'var(--text-muted)';
        const srvInfo = document.getElementById('stat-server-info');
        if (srvInfo) srvInfo.style.display = 'none';
        document.getElementById('engine-dot').className = 'engine-dot offline';
        document.getElementById('engine-text').textContent = 'No Engine';
        document.getElementById('ws-badge').classList.remove('connected');
        this.updateNavVisibility(null);
        this.renderPage();
    },

    async fetchInitialData() {
        try {
            const [timelines, media, map] = await Promise.allSettled([
                hippoAPI.getTimelines(),
                hippoAPI.getMedia(),
                hippoAPI.getMediaMap(),
            ]);

            if (timelines.status === 'fulfilled') {
                const tl = timelines.value;
                appState.set('timelines', Array.isArray(tl) ? tl : (tl?.timelines || []));
            }
            if (media.status === 'fulfilled') appState.set('mediaDatabase', media.value);
            if (map.status === 'fulfilled') appState.set('mediaMap', map.value);
        } catch {}
    },

    // ================================================================
    // POLLING
    // ================================================================
    startPolling() {
        this.stopPolling();
        const interval = appState.get('pollInterval');
        appState.data.pollTimer = setInterval(() => this.poll(), interval);
    },

    stopPolling() {
        clearInterval(appState.data.pollTimer);
        appState.data.pollTimer = null;
    },

    restartPolling() {
        this.stopPolling();
        if (appState.get('connected')) this.startPolling();
    },

    async poll() {
        if (!appState.get('connected')) return;
        const serverType = appState.get('serverType');
        try {
            switch (serverType) {
                case 'resolume': {
                    const comp = await resolumeAPI.getComposition();
                    appState.set('composition', comp);
                    const info = appState.get('serverInfo');
                    if (info) info._composition = comp;
                    break;
                }
                case 'vmix': {
                    const state = await vmixAPI.getState();
                    appState.set('vmixState', state);
                    break;
                }
                case 'casparcg': {
                    const ch = await casparcgAPI.getChannels();
                    appState.set('casparcgChannels', ch);
                    break;
                }
                case 'obs': {
                    const scenes = await obsAPI.getSceneList().catch(() => null);
                    if (scenes) {
                        appState.set('obsScenes', scenes.scenes);
                        appState.set('obsCurrentScene', scenes.currentProgramSceneName);
                        appState.set('obsPreviewScene', scenes.currentPreviewSceneName);
                    }
                    break;
                }
                case 'barco': {
                    const presets = await barcoAPI.listPresets().catch(() => null);
                    if (presets) appState.set('barcoPresets', presets);
                    break;
                }
                case 'qlab': {
                    const wsId = appState.get('qlabActiveWorkspace');
                    if (wsId) {
                        const cues = await qlabAPI.getCueList(wsId).catch(() => null);
                        if (cues) appState.set('qlabCueLists', cues);
                    }
                    break;
                }
                case 'disguise': {
                    const transport = await disguiseAPI.getTransportStatus().catch(() => null);
                    if (transport) appState.set('disguiseTransport', transport);
                    break;
                }
                case 'pixera': {
                    const timelines = await pixeraAPI.getTimelines().catch(() => null);
                    if (timelines) appState.set('pixeraTimelines', timelines);
                    break;
                }
                case 'atem': {
                    const atemInfo = await atemAPI.getDeviceInfo().catch(() => null);
                    if (atemInfo) {
                        appState.set('atemState', {
                            ...atemInfo,
                            program: atemInfo.program ?? appState.get('atemState')?.program,
                            preview: atemInfo.preview ?? appState.get('atemState')?.preview,
                        });
                    }
                    break;
                }
                default: {
                    const info = await hippoAPI.getInfo();
                    appState.set('serverInfo', info);
                    this.updateTopbarStatus(info);
                    this.updateEngineFooter(info);
                    break;
                }
            }
        } catch {}
    },

    // ================================================================
    // WEBSOCKET EVENTS
    // ================================================================
    setupWebSocketListeners() {
        hippoWS.on('connected', () => {
            appState.set('wsConnected', true);
            document.getElementById('ws-badge').classList.add('connected');
            appState.log('EVENT', 'WebSocket connected', 'WebSocket');
        });

        hippoWS.on('disconnected', () => {
            appState.set('wsConnected', false);
            document.getElementById('ws-badge').classList.remove('connected');
            appState.log('WARN', 'WebSocket disconnected', 'WebSocket');
        });

        hippoWS.on('reconnecting', (data) => {
            appState.log('DEBUG', `WebSocket reconnecting (attempt ${data.attempt})`, 'WebSocket');
        });

        // MEDIA callbacks
        hippoWS.on('MEDIAMAP_CHANGED', () => {
            appState.log('EVENT', 'Media map changed', 'Callback');
            // Refresh media data
            hippoAPI.getMediaMap().then(map => appState.set('mediaMap', map)).catch(() => {});
            hippoAPI.getMedia().then(db => appState.set('mediaDatabase', db)).catch(() => {});
            if (appState.get('currentPage') === 'media') MediaPage.refresh();
        });

        hippoWS.on('MEDIAFILES_ADDED', (data) => {
            const ids = Array.isArray(data) ? data.map(d => d.mediaID).join(', ') : '';
            appState.log('EVENT', `Media files added: ${ids}`, 'Callback');
            UI.toast('New media files added', 'info');
            if (appState.get('currentPage') === 'media') MediaPage.refresh();
        });

        hippoWS.on('MEDIAFILE_DELETED', (mediaID) => {
            appState.log('EVENT', `Media file deleted: ${mediaID}`, 'Callback');
            if (appState.get('currentPage') === 'media') MediaPage.refresh();
        });

        hippoWS.on('MEDIAFILE_CHANGED', (mediaID) => {
            appState.log('EVENT', `Media file changed: ${mediaID}`, 'Callback');
        });

        // PRESET callbacks
        hippoWS.on('PRESET_ADDED', (data) => {
            appState.log('EVENT', `Preset added: ${data?.presetid} (${data?.type} B${data?.bank}:S${data?.slot})`, 'Callback');
            if (appState.get('currentPage') === 'presets') PresetsPage.refresh();
        });

        hippoWS.on('PRESET_DELETED', (presetId) => {
            appState.log('EVENT', `Preset deleted: ${presetId}`, 'Callback');
            if (appState.get('currentPage') === 'presets') PresetsPage.refresh();
        });

        hippoWS.on('PRESET_CHANGED', (data) => {
            appState.log('EVENT', `Preset changed: ${data?.presetid}`, 'Callback');
        });

        hippoWS.on('PRESETS_RESET', () => {
            appState.log('EVENT', 'All presets reset', 'Callback');
            UI.toast('Presets have been reset', 'warning');
            if (appState.get('currentPage') === 'presets') PresetsPage.refresh();
        });

        // SYSTEM callbacks
        hippoWS.on('CONFIG_CHANGED', () => {
            appState.log('EVENT', 'System config changed', 'Callback');
            UI.toast('Server configuration changed', 'info');
            // Re-fetch server info
            hippoAPI.getInfo().then(info => {
                appState.set('serverInfo', info);
                this.updateTopbarStatus(info);
                if (appState.get('currentPage') === 'dashboard') this.renderPage();
            }).catch(() => {});
        });

        this._lastEngineStatus = null;
        hippoWS.on('SYSTEM_STATUS_CHANGED', (status) => {
            // Only log and toast when the status actually changes
            if (status !== this._lastEngineStatus) {
                appState.log('EVENT', `Engine status: ${status}`, 'Callback');
                // Only notify on concerning status changes, not routine "Running"
                if (status && status !== 'Running') {
                    UI.toast(`Engine status: ${status}`, 'warning');
                } else if (this._lastEngineStatus && this._lastEngineStatus !== 'Running' && status === 'Running') {
                    UI.toast('Engine back online', 'success');
                }
                this._lastEngineStatus = status;
            }
        });
    },

    // Handle a WebSocket event from the virtual server
    handleWsEvent(msg) {
        if (!msg || !msg.event) return;
        // Dispatch to hippoWS emitter so all existing listeners fire
        hippoWS._emit(msg.event, msg.data);
        hippoWS._emit(`${msg.category}:${msg.event}`, msg.data);
        hippoWS._emit(msg.category, { event: msg.event, data: msg.data });
        hippoWS._emit('event', msg);
    },

    // Handle a Resolume WebSocket event
    handleResolumeWsEvent(msg) {
        if (!msg || !msg.type) return;
        if (msg.type === 'composition_update') {
            appState.set('composition', msg.value);
        } else if (msg.type === 'parameter_update') {
            // Could update individual param values here
        }
    },

    // ================================================================
    // NAV VISIBILITY — show/hide pages based on server type
    // ================================================================
    // Pages that are always visible (even when disconnected)
    _alwaysVisiblePages: ['settings', 'logs', 'status', 'ledprocessor', 'ledcalc', 'ledsetup', 'pixlgrid', 'diagram', 'ledconnect', 'ptz', 'netswitch', 'lighting', 'intercom', 'stage3d', 'ledpanel3d', 'power', 'fixtures', 'truckpack', 'captureview', 'specifications'],

    updateNavVisibility(serverType) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        nav.style.display = '';

        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (!page) return;

            // Always-visible pages stay shown regardless of connection
            if (this._alwaysVisiblePages.includes(page)) {
                item.style.display = '';
                return;
            }

            // Not connected — hide all other nav items
            if (!serverType) {
                item.style.display = 'none';
                return;
            }

            // Connected — show/hide based on server type
            if (this._hippoPages.includes(page)) {
                item.style.display = serverType === 'hippo' ? '' : 'none';
            } else if (this._resolumePages.includes(page)) {
                item.style.display = serverType === 'resolume' ? '' : 'none';
            } else {
                item.style.display = '';
            }
        });

        // Hide section labels if all their items are hidden
        document.querySelectorAll('.nav-section-label').forEach(label => {
            let next = label.nextElementSibling;
            let anyVisible = false;
            while (next && !next.classList.contains('nav-section-label')) {
                if (next.classList.contains('nav-item') && next.style.display !== 'none') {
                    anyVisible = true;
                    break;
                }
                next = next.nextElementSibling;
            }
            label.style.display = anyVisible ? '' : 'none';
        });
    },

    // ================================================================
    // UI UPDATES
    // ================================================================
    setConnectionStatus(state, text) {
        const badge = document.getElementById('connection-status');
        const textEl = document.getElementById('conn-text');
        if (badge) badge.className = `connection-badge ${state}`;
        if (textEl) textEl.textContent = text;
        // Refresh server cards to update status dots
        this.renderServerList();
    },

    updateTopbarStatus(info) {
        if (!info) return;
        const engine = document.getElementById('engine-status-text');
        const media = document.getElementById('media-status-text');
        const connDot = document.getElementById('topbar-conn-dot');
        const serverInfo = document.getElementById('stat-server-info');
        const serverIp = document.getElementById('server-ip-text');

        const status = (info.engineStatus || '').toLowerCase();
        const isOk = status === 'running' || status === 'ok' || status === 'started' || status === 'ready';

        if (engine) engine.textContent = info.engineStatus || '--';
        if (media) media.textContent = info.mediaManagerStatus || info.product || '--';
        if (connDot) connDot.style.color = isOk ? 'var(--green)' : status === 'stopped' || status === 'error' ? 'var(--red)' : 'var(--orange)';

        // Show server IP/port in topbar
        const server = appState.get('servers').find(s => s.id === appState.get('activeServerId'));
        if (server && serverInfo && serverIp) {
            serverInfo.style.display = '';
            serverIp.textContent = `${server.host}:${server.port}`;
        }
    },

    updateEngineFooter(info) {
        if (!info) return;
        const dot = document.getElementById('engine-dot');
        const text = document.getElementById('engine-text');
        const status = (info.engineStatus || '').toLowerCase();
        dot.className = 'engine-dot ' + (status === 'running' || status === 'ok' || status === 'started' ? 'online' : status === 'stopped' || status === 'error' ? 'offline' : 'warning');
        text.textContent = info.computerName || info.hostName || 'Engine';
    },

    reconnectWs() {
        const serverId = appState.get('activeServerId');
        if (serverId) {
            this.connectToServer(serverId);
            UI.toast('Reconnecting...', 'info');
        } else {
            UI.toast('No server selected', 'warning');
        }
    },

    // ================================================================
    // SIDEBAR
    // ================================================================
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('mobile-open');
        appState.set('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    },

    // ================================================================
    // MODAL (delegate)
    // ================================================================
    closeModal() { UI.closeModal(); },

    // ================================================================
    // ADD SERVER
    // ================================================================
    showAddServer() {
        this._addServerType = 'hippo';
        this._addServerStep = 'pick'; // 'pick' or 'config'
        this._renderAddServerDialog();
    },

    _addServerType: 'hippo',
    _addServerStep: 'pick',

    // Server type definitions for Add Server UI
    _serverTypes: {
        hippo:    { label: 'Hippotizer', icon: 'fa-server', color: 'var(--accent)', rgb: '0,212,170', desc: 'Media Server', sub: 'REST API + WebSocket', port: 40512, wsPort: 40513, logo: 'assets/logos/hippo.svg' },
        resolume: { label: 'Resolume Arena', icon: 'fa-film', color: '#a855f7', rgb: '168,85,247', desc: 'VJ / Media Server', sub: 'REST API + WebSocket', port: 8080, wsPort: 8080, logo: 'assets/logos/resolume.svg' },
        vmix:     { label: 'vMix', icon: 'fa-video', color: '#3b82f6', rgb: '59,130,246', desc: 'Live Production', sub: 'HTTP API (XML)', port: 8088, wsPort: 8088, logo: 'assets/logos/vmix.svg' },
        casparcg: { label: 'CasparCG', icon: 'fa-play-circle', color: '#f97316', rgb: '249,115,22', desc: 'Broadcast Graphics', sub: 'REST API (JSON)', port: 8000, wsPort: 8000, logo: 'assets/logos/casparcg.svg' },
        obs:      { label: 'OBS Studio', icon: 'fa-broadcast-tower', color: '#22c55e', rgb: '34,197,94', desc: 'Streaming / Recording', sub: 'WebSocket v5', port: 4455, wsPort: 4455, logo: 'assets/logos/obs.svg' },
        barco:    { label: 'Barco E2/S3', icon: 'fa-th-large', color: '#ef4444', rgb: '239,68,68', desc: 'Video Processor', sub: 'JSON-RPC 2.0', port: 9999, wsPort: 9999, logo: 'assets/logos/barco.svg' },
        qlab:     { label: 'QLab', icon: 'fa-list-ol', color: '#8b5cf6', rgb: '139,92,246', desc: 'Show Control', sub: 'WebSocket (JSON)', port: 53000, wsPort: 53000, logo: 'assets/logos/qlab.svg' },
        disguise: { label: 'Disguise', icon: 'fa-cube', color: '#ec4899', rgb: '236,72,153', desc: 'Media Server', sub: 'REST API (JSON)', port: 80, wsPort: 80, logo: 'assets/logos/disguise.svg' },
        pixera:   { label: 'Pixera', icon: 'fa-layer-group', color: '#06b6d4', rgb: '6,182,212', desc: 'Media Server', sub: 'JSON-RPC 2.0', port: 1400, wsPort: 1400, logo: 'assets/logos/pixera.svg' },
        atem:     { label: 'Blackmagic ATEM', icon: 'fa-random', color: '#facc15', rgb: '250,204,21', desc: 'Live Switcher', sub: 'REST API (JSON)', port: 80, wsPort: 80, logo: 'assets/logos/atem.svg' },
    },

    _renderAddServerDialog() {
        if (this._addServerStep === 'pick') {
            const types = this._serverTypes;

            const demoOptions = Object.entries(types).map(([key, t]) =>
                `<option value="${key}" style="padding:4px;">${t.label} — ${t.desc}</option>`
            ).join('');

            const cards = Object.entries(types).map(([key, t]) =>
                `<button class="add-srv-card" onclick="HippoApp._pickServerType('${key}')" style="
                    min-width:0;padding:16px 10px;border-radius:10px;border:2px solid var(--border);background:var(--bg-secondary);
                    cursor:pointer;text-align:center;transition:all 0.15s;color:var(--text-primary);display:flex;flex-direction:column;align-items:center;gap:8px;box-sizing:border-box;
                " onmouseover="this.style.borderColor='${t.color}';this.style.background='rgba(${t.rgb},0.06)'"
                   onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-secondary)'">
                    <div style="height:44px;display:flex;align-items:center;justify-content:center;padding:0 6px;">
                        <img src="${t.logo}" alt="${t.label}" style="height:36px;width:auto;max-width:130px;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                        <div style="display:none;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(${t.rgb},0.2),rgba(${t.rgb},0.08));align-items:center;justify-content:center;">
                            <i class="fas ${t.icon}" style="font-size:20px;color:${t.color};"></i>
                        </div>
                    </div>
                    <div style="font-size:11px;font-weight:800;letter-spacing:0.3px;white-space:nowrap;">${t.label}</div>
                    <div style="font-size:9px;color:var(--text-muted);line-height:1.4;">${t.desc}</div>
                    <span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(${t.rgb},0.12);color:${t.color};">PORT ${t.port}</span>
                </button>`
            ).join('');

            UI.openModal('Add Server', `
                <div style="background:linear-gradient(135deg,rgba(0,212,170,0.1),rgba(0,212,170,0.03));border:1px solid rgba(0,212,170,0.25);border-radius:10px;padding:14px;margin-bottom:16px;">
                    <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:8px;letter-spacing:0.5px;text-align:center;"><i class="fas fa-flask"></i> DEMO MODE</div>
                    <p style="font-size:10px;color:var(--text-secondary);margin-bottom:10px;text-align:center;">No hardware? Launch a virtual demo engine to explore the interface.</p>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <select id="demo-engine-select" class="form-control" style="flex:1;font-size:12px;padding:8px 10px;" onchange="HippoApp._updateDemoPreview()">
                            ${demoOptions}
                        </select>
                        <button class="btn btn-accent" onclick="HippoApp.addVirtualServer(document.getElementById('demo-engine-select').value)" style="white-space:nowrap;font-weight:700;padding:8px 16px;">
                            <i class="fas fa-play"></i> Launch Demo
                        </button>
                    </div>
                    <div id="demo-engine-preview" style="margin-top:10px;padding:8px 12px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border);display:flex;align-items:center;gap:10px;"></div>
                </div>
                <div style="text-align:center;color:var(--text-muted);font-size:10px;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">— or connect to real hardware —</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">${cards}</div>
            `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>`);

            // Show initial preview after modal renders
            setTimeout(() => this._updateDemoPreview(), 0);
        } else {
            const t = this._serverTypes[this._addServerType];
            UI.openModal('Connect to ' + t.label, `
                <div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(${t.rgb},0.06);border:1px solid rgba(${t.rgb},0.2);border-radius:10px;margin-bottom:20px;">
                    <div style="width:50px;height:40px;border-radius:8px;background:rgba(${t.rgb},0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:4px;">
                        <img src="${t.logo}" alt="${t.label}" style="height:28px;width:auto;max-width:46px;object-fit:contain;" onerror="this.outerHTML='<i class=\\'fas ${t.icon}\\' style=\\'color:${t.color};font-size:20px;\\'></i>';">
                    </div>
                    <div>
                        <div style="font-size:14px;font-weight:800;color:var(--text-primary);">${t.label}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${t.desc} — ${t.sub}</div>
                    </div>
                </div>
                ${UI.formGroup('NAME', `<input class="form-control" id="add-srv-name" placeholder="My ${t.label}">`)}
                ${UI.formGroup('HOST / IP', '<input class="form-control" id="add-srv-host" placeholder="192.168.1.100">')}
                <div class="form-row">
                    ${UI.formGroup('PORT', `<input class="form-control" type="number" id="add-srv-port" value="${t.port}">`, 'API port')}
                    ${UI.formGroup('WS PORT', `<input class="form-control" type="number" id="add-srv-wsport" value="${t.wsPort}">`, 'WebSocket port')}
                </div>
            `, `<button class="btn" onclick="HippoApp._addServerStep='pick';HippoApp._renderAddServerDialog()"><i class="fas fa-arrow-left"></i> Back</button>
                <button class="btn btn-primary" onclick="HippoApp.addServer()"><i class="fas fa-plus"></i> Add Server</button>`);
        }
    },

    _updateDemoPreview() {
        const select = document.getElementById('demo-engine-select');
        const preview = document.getElementById('demo-engine-preview');
        if (!select || !preview) return;
        const type = select.value;
        const t = this._serverTypes[type];
        if (!t) return;
        preview.innerHTML = `
            <div style="height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <img src="${t.logo}" alt="${t.label}" style="height:28px;width:auto;max-width:120px;object-fit:contain;" onerror="this.outerHTML='<i class=\\'fas ${t.icon}\\' style=\\'color:${t.color};font-size:18px;\\'></i>';">
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${t.label}</div>
                <div style="font-size:10px;color:var(--text-muted);">${t.desc} — ${t.sub}</div>
            </div>
            <span style="font-size:9px;font-weight:700;padding:3px 8px;border-radius:4px;background:rgba(${t.rgb},0.12);color:${t.color};white-space:nowrap;">PORT ${t.port}</span>
        `;
    },

    _pickServerType(type) {
        this._addServerType = type;
        this._addServerStep = 'config';
        this._renderAddServerDialog();
    },

    addVirtualServer(type = 'hippo') {
        // Check if a virtual server of this type already exists
        const existing = appState.get('servers').find(s => s.virtual && (s.type || 'hippo') === type);
        if (existing) {
            UI.closeModal();
            UI.toast('Virtual server already exists — connecting...', 'info');
            this.connectToServer(existing.id);
            document.getElementById('server-select').value = existing.id;
            return;
        }
        const t = this._serverTypes[type] || this._serverTypes.hippo;
        const hosts = { hippo: 'virtual', resolume: 'virtual-resolume', vmix: 'virtual-vmix', casparcg: 'virtual-casparcg', obs: 'virtual-obs', barco: 'virtual-barco', qlab: 'virtual-qlab', disguise: 'virtual-disguise', pixera: 'virtual-pixera' };
        const config = {
            name: `Virtual ${t.label} (Demo)`,
            host: hosts[type] || 'virtual',
            port: t.port,
            wsPort: t.wsPort,
            type,
        };

        const server = appState.addServer(config);
        appState.updateServer(server.id, { virtual: true });
        UI.closeModal();
        UI.toast(`Virtual ${t.label} Demo Server added`, 'success');
        appState.log('INFO', `Virtual ${t.label} demo server added`, 'System');
        this.populateServerSelect();
        this.connectToServer(server.id);
    },

    addServer() {
        const name = document.getElementById('add-srv-name').value.trim();
        const host = document.getElementById('add-srv-host').value.trim();
        const type = this._addServerType || 'hippo';
        const t = this._serverTypes[type] || this._serverTypes.hippo;
        const port = parseInt(document.getElementById('add-srv-port').value) || t.port;
        const wsPort = parseInt(document.getElementById('add-srv-wsport').value) || t.wsPort;

        if (!host) { UI.toast('Host/IP is required', 'warning'); return; }

        const server = appState.addServer({ name: name || host, host, port, wsPort, type });
        UI.closeModal();
        UI.toast(`Server "${server.name}" added (${t.label})`, 'success');
        appState.log('INFO', `Server added: ${server.name} [${t.label}] (${host}:${port})`, 'System');
        this.populateServerSelect();

        // Auto-connect
        this.connectToServer(server.id);
    },

    // ================================================================
    // GLOBAL TRANSPORT CONTROLS
    // ================================================================
    async playAll() {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try { await hippoAPI.playAll(); UI.toast('All timelines playing', 'success'); appState.log('INFO', 'Play All', 'Transport'); }
        catch(e) { UI.toast(e.message, 'error'); }
    },

    async stopAll() {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try { await hippoAPI.stopAll(); UI.toast('All timelines stopped', 'info'); appState.log('INFO', 'Stop All', 'Transport'); }
        catch(e) { UI.toast(e.message, 'error'); }
    },

    async resetAll() {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try { await hippoAPI.resetAll(); UI.toast('All timelines reset', 'info'); appState.log('INFO', 'Reset All', 'Transport'); }
        catch(e) { UI.toast(e.message, 'error'); }
    },

    // Single timeline shortcuts (used by dashboard)
    async tlPlay(id) { try { await hippoAPI.timelinePlay(id); UI.toast(`TL ${id} play`, 'success'); } catch(e) { UI.toast(e.message, 'error'); } },
    async tlStop(id) { try { await hippoAPI.timelineStop(id); UI.toast(`TL ${id} stop`, 'info'); } catch(e) { UI.toast(e.message, 'error'); } },
    async tlReset(id) { try { await hippoAPI.timelineReset(id); } catch(e) { UI.toast(e.message, 'error'); } },

    // ================================================================
    // PROJECT SAVE / LOAD
    // ================================================================
    _projectPath: null,
    _projectName: 'Untitled',

    initProjectSystem() {
        // Only works in Electron (luxorProject bridge)
        if (typeof window.luxorProject === 'undefined') return;

        window.luxorProject.onMenuNew(() => this.newProject());
        window.luxorProject.onMenuSave(() => this.saveProject());
        window.luxorProject.onSavePath((path) => {
            this._projectPath = path;
            this._projectName = path.split(/[\\/]/).pop().replace('.luxor', '');
            this._updateProjectTitle();
            this._doSave(path);
        });
        window.luxorProject.onLoadData(({ path, data }) => {
            this._loadProjectData(path, data);
        });
    },

    _getProjectData() {
        return JSON.stringify({
            version: 1,
            name: this._projectName,
            servers: appState.get('servers'),
            networkConfig: appState.get('networkConfig'),
            lastServerId: appState.get('activeServerId'),
        }, null, 2);
    },

    async _doSave(filePath) {
        if (!filePath) return;
        const data = this._getProjectData();
        if (typeof window.luxorProject !== 'undefined') {
            const result = await window.luxorProject.save(filePath, data);
            if (result.ok) {
                UI.toast(`Project saved: ${this._projectName}`, 'success');
                appState.log('INFO', `Project saved to ${filePath}`, 'Project');
            } else {
                UI.toast(`Save failed: ${result.error}`, 'error');
            }
        } else {
            // Browser fallback — download as file
            const blob = new Blob([data], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (this._projectName || 'Untitled') + '.luxor';
            a.click();
            URL.revokeObjectURL(a.href);
            UI.toast('Project downloaded', 'success');
        }
    },

    async saveProject() {
        if (this._projectPath) {
            await this._doSave(this._projectPath);
        } else {
            await this.saveProjectAs();
        }
    },

    async saveProjectAs() {
        if (typeof window.luxorProject !== 'undefined') {
            const filePath = await window.luxorProject.dialogSaveAs();
            if (filePath) {
                this._projectPath = filePath;
                this._projectName = filePath.split(/[\\/]/).pop().replace('.luxor', '');
                this._updateProjectTitle();
                await this._doSave(filePath);
            }
        } else {
            // Browser fallback — prompt for filename
            const name = prompt('Project filename:', this._projectName || 'Untitled');
            if (name) {
                this._projectName = name;
                this._updateProjectTitle();
                await this._doSave('download');
            }
        }
    },

    async openProject() {
        if (typeof window.luxorProject !== 'undefined') {
            const result = await window.luxorProject.dialogOpen();
            if (result && !result.error) {
                this._loadProjectData(result.path, result.data);
            } else if (result?.error) {
                UI.toast(`Failed to open: ${result.error}`, 'error');
            }
        } else {
            // Browser fallback — file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.luxor,.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this._loadProjectData(file.name, ev.target.result);
                };
                reader.readAsText(file);
            };
            input.click();
        }
    },

    _loadProjectData(filePath, rawData) {
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            if (!data.servers) throw new Error('Invalid project file');

            // Disconnect current
            this.disconnect();

            // Load servers
            appState.set('servers', data.servers);
            appState._save('luxor_servers', data.servers);

            // Load network config
            if (data.networkConfig) {
                appState.setNetworkConfig(data.networkConfig);
            }

            this._projectPath = filePath;
            this._projectName = (data.name || filePath.split(/[\\/]/).pop().replace('.luxor', ''));
            this._updateProjectTitle();

            this.populateServerSelect();

            UI.toast(`Project loaded: ${this._projectName}`, 'success');
            appState.log('INFO', `Project loaded from ${filePath}`, 'Project');

            // Auto-connect to last server
            if (data.lastServerId) {
                const srv = data.servers.find(s => s.id === data.lastServerId);
                if (srv) {
                    document.getElementById('server-select').value = srv.id;
                    this.connectToServer(srv.id);
                }
            }
        } catch (e) {
            UI.toast(`Failed to load project: ${e.message}`, 'error');
        }
    },

    newProject() {
        this.disconnect();
        appState.set('servers', []);
        appState._save('luxor_servers', []);
        this._projectPath = null;
        this._projectName = 'Untitled';
        this._updateProjectTitle();
        this.populateServerSelect();
        this.renderPage();
        UI.toast('New project created', 'info');
    },

    _updateProjectTitle() {
        const subtitle = document.getElementById('page-subtitle');
        if (subtitle) subtitle.textContent = this._projectName ? `— ${this._projectName}` : '';
    },

    // ================================================================
    // DASHBOARD ACTION HANDLERS
    // ================================================================
    async resolumeDashAction(action, index) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'column':     await resolumeAPI.connectColumn(index); UI.toast(`Column ${index} triggered`, 'success'); break;
                case 'clearLayer': await resolumeAPI.clearLayer(index); UI.toast(`Layer ${index} cleared`, 'info'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async vmixDashAction(action, input) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'cut':    await vmixAPI.cut(); UI.toast('Cut', 'success'); break;
                case 'fade':   await vmixAPI.fade(); UI.toast('Fade', 'success'); break;
                case 'ftb':    await vmixAPI.fadeToBlack(); UI.toast('Fade to Black', 'info'); break;
                case 'record':
                    const vs = appState.get('vmixState') || {};
                    if (vs.recording) { await vmixAPI.stopRecording(); UI.toast('Recording stopped', 'info'); }
                    else { await vmixAPI.startRecording(); UI.toast('Recording started', 'success'); }
                    break;
                case 'stream':
                    const vs2 = appState.get('vmixState') || {};
                    if (vs2.streaming) { await vmixAPI.stopStreaming(); UI.toast('Stream stopped', 'info'); }
                    else { await vmixAPI.startStreaming(); UI.toast('Stream started', 'success'); }
                    break;
                case 'pgm':    await vmixAPI.setActive(input); UI.toast(`Input ${input} → Program`, 'success'); break;
                case 'pvw':    await vmixAPI.setPreview(input); UI.toast(`Input ${input} → Preview`, 'info'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async obsDashAction(action, name) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'transition': await obsAPI.triggerTransition(); UI.toast('Transition', 'success'); break;
                case 'stream':
                    const ss = appState.get('obsStreamStatus') || {};
                    if (ss.streaming) { await obsAPI.stopStreaming(); UI.toast('Stream stopped', 'info'); }
                    else { await obsAPI.startStreaming(); UI.toast('Stream started', 'success'); }
                    break;
                case 'record':
                    const rs = appState.get('obsRecordStatus') || appState.get('obsStreamStatus') || {};
                    if (rs.recording) { await obsAPI.stopRecording(); UI.toast('Recording stopped', 'info'); }
                    else { await obsAPI.startRecording(); UI.toast('Recording started', 'success'); }
                    break;
                case 'scene':    await obsAPI.setCurrentScene(name); UI.toast(`Scene: ${name}`, 'success'); break;
                case 'preview':  await obsAPI.setPreviewScene(name); UI.toast(`Preview: ${name}`, 'info'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async casparcgDashAction(action, ch, layer) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'clearAll':
                    const channels = appState.get('casparcgChannels') || [];
                    for (const c of channels) await casparcgAPI.clearChannel(c.id || channels.indexOf(c) + 1);
                    UI.toast('All channels cleared', 'info');
                    break;
                case 'clearChannel': await casparcgAPI.clearChannel(ch); UI.toast(`Channel ${ch} cleared`, 'info'); break;
                case 'play':  await casparcgAPI.playMedia(ch, layer); UI.toast(`CH${ch} L${layer} play`, 'success'); break;
                case 'stop':  await casparcgAPI.stopLayer(ch, layer); UI.toast(`CH${ch} L${layer} stop`, 'info'); break;
                case 'clear': await casparcgAPI.clearLayer(ch, layer); UI.toast(`CH${ch} L${layer} cleared`, 'info'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async disguiseDashAction(action) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'play':        await disguiseAPI.play(); UI.toast('Play', 'success'); break;
                case 'pause':       await disguiseAPI.pause(); UI.toast('Paused', 'info'); break;
                case 'stop':        await disguiseAPI.stop(); UI.toast('Stopped', 'info'); break;
                case 'nextSection': await disguiseAPI.goToNextSection(); UI.toast('Next Section', 'success'); break;
                case 'prevSection': await disguiseAPI.goToPrevSection(); UI.toast('Previous Section', 'success'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async disguiseGoToSection(name) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            await disguiseAPI.goToSection(name);
            UI.toast(`Section: ${name}`, 'success');
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async qlabAction(action) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'go':     await qlabAPI.go(); UI.toast('GO', 'success'); break;
                case 'stop':   await qlabAPI.stop(); UI.toast('Stop', 'info'); break;
                case 'pause':  await qlabAPI.pause(); UI.toast('Paused', 'info'); break;
                case 'resume': await qlabAPI.resume(); UI.toast('Resume', 'success'); break;
                case 'panic':  await qlabAPI.panic(); UI.toast('PANIC — All stopped', 'warning'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async barcoAction(action) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'cut':       await barcoAPI.cut(); UI.toast('Cut', 'success'); break;
                case 'dissolve':  await barcoAPI.dissolve(); UI.toast('Dissolve', 'success'); break;
                case 'freezeAll':
                    const dests = appState.get('barcoDestinations') || [];
                    for (const d of dests) await barcoAPI.freezeDestination(d.id);
                    UI.toast('All frozen', 'info');
                    break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async pixeraTransport(id, action) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'play':  await pixeraAPI.playTimeline(id); UI.toast(`Timeline ${id} play`, 'success'); break;
                case 'pause': await pixeraAPI.pauseTimeline(id); UI.toast(`Timeline ${id} paused`, 'info'); break;
                case 'stop':  await pixeraAPI.stopTimeline(id); UI.toast(`Timeline ${id} stopped`, 'info'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    async atemDashAction(action, value) {
        if (!appState.get('connected')) { UI.toast('Not connected', 'warning'); return; }
        try {
            switch (action) {
                case 'cut':    await atemAPI.transitionCut(); UI.toast('Cut', 'success'); break;
                case 'auto':   await atemAPI.transitionAuto(); UI.toast('Auto Transition', 'success'); break;
                case 'ftb':    await atemAPI.fadeToBlack(); UI.toast('Fade to Black', 'info'); break;
                case 'pgm':    await atemAPI.setProgram(value); UI.toast(`Input ${value} → Program`, 'success'); break;
                case 'pvw':    await atemAPI.setPreview(value); UI.toast(`Input ${value} → Preview`, 'info'); break;
                case 'stream':
                    const as = appState.get('atemState') || {};
                    if (as.streaming) { await atemAPI.stopStreaming(); UI.toast('Stream stopped', 'info'); }
                    else { await atemAPI.startStreaming(); UI.toast('Stream started', 'success'); }
                    break;
                case 'record':
                    const ar = appState.get('atemState') || {};
                    if (ar.recording) { await atemAPI.stopRecording(); UI.toast('Recording stopped', 'info'); }
                    else { await atemAPI.startRecording(); UI.toast('Recording started', 'success'); }
                    break;
                case 'dskAuto':  await atemAPI.dskAuto(value); UI.toast(`DSK ${value + 1} toggle`, 'info'); break;
                case 'macro':    await atemAPI.macroRun(value); UI.toast(`Macro ${value} triggered`, 'success'); break;
            }
            this.refreshDashboard();
        } catch (e) { UI.toast(e.message, 'error'); }
    },

    refreshDashboard() {
        // Trigger a re-poll and re-render of the dashboard after a short delay
        setTimeout(() => {
            if (this._currentPage === 'dashboard') this.renderPage();
        }, 300);
    },

    // ================================================================
    // KEYBOARD SHORTCUTS
    // ================================================================
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            if (e.key === 'Escape') {
                UI.closeModal();
            }
            if (e.key === ' ' && e.ctrlKey) {
                e.preventDefault();
                this.playAll();
            }
            if (e.key === '.' && e.ctrlKey) {
                e.preventDefault();
                this.stopAll();
            }
        });
    },

    // ================================================================
    // ACTIVE LED PROCESSORS — uses LedProcessorPage data
    // ================================================================
    initLedProcessors() {
        // Load processors from same localStorage as LedProcessorPage
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage._loadProcessors();
        }
        this.renderLedProcessorList();
    },

    initPtzCameras() {
        if (typeof PtzPage !== 'undefined') {
            PtzPage.initSidebar();
        }
    },

    initNetSwitches() {
        if (typeof NetSwitchPage !== 'undefined') {
            NetSwitchPage.initSidebar();
        }
    },

    initLightingConsoles() {
        if (typeof LightingPage !== 'undefined') {
            LightingPage.initSidebar();
        }
    },

    initIntercomSystems() {
        if (typeof IntercomPage !== 'undefined') {
            IntercomPage.initSidebar();
        }
    },

    applySidebarVisibility() {
        let vis;
        try {
            const saved = JSON.parse(localStorage.getItem('luxor_sidebar_visibility') || '{}');
            vis = {
                engines: saved.engines !== false,
                ledProcessors: saved.ledProcessors !== false,
                cameras: saved.cameras !== false,
                switches: saved.switches !== false,
                consoles: saved.consoles !== false,
                intercom: saved.intercom !== false,
                tools3d: saved.tools3d === true,           // disabled by default
                captureViewer: saved.captureViewer === true, // disabled by default
            };
        } catch {
            vis = { engines: true, ledProcessors: true, cameras: true, switches: true, consoles: true, intercom: true, tools3d: false, captureViewer: false };
        }
        const map = {
            engines: 'server-selector',
            ledProcessors: 'led-processor-selector',
            cameras: 'ptz-camera-selector',
            switches: 'net-switch-selector',
            consoles: 'lighting-console-selector',
            intercom: 'intercom-selector',
        };
        for (const [key, id] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.style.display = vis[key] ? '' : 'none';
        }

        // Hide/show 3D Tools and Capture Viewer nav items based on settings
        const hiddenPages = [];
        if (!vis.tools3d) hiddenPages.push('stage3d', 'ledpanel3d');
        if (!vis.captureViewer) hiddenPages.push('captureview');
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (hiddenPages.includes(page)) {
                item.style.display = 'none';
            }
        });

        // Apply sidebar section ordering
        try {
            const defaultOrder = ['engines', 'ledProcessors', 'cameras', 'switches', 'consoles', 'intercom'];
            const savedOrder = JSON.parse(localStorage.getItem('luxor_sidebar_order') || '[]');
            const order = (Array.isArray(savedOrder) && savedOrder.length === defaultOrder.length) ? savedOrder : defaultOrder;
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                // Get the nav element as anchor point — sections go before it
                const nav = document.getElementById('sidebar-nav');
                if (nav) {
                    order.forEach(key => {
                        const el = document.getElementById(map[key]);
                        if (el) sidebar.insertBefore(el, nav);
                    });
                }
            }
        } catch {}
    },

    showAddLedProcessor() {
        // Delegate to LedProcessorPage's add dialog
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage.showAddProcessor();
        }
    },

    selectLedProcessor(id) {
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage._loadProcessors();
            LedProcessorPage.selectProcessor(id);
        }
        this.navigate('ledprocessor');
    },

    removeLedProcessor(id) {
        let procs = [];
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage._loadProcessors();
            procs = LedProcessorPage._processors || [];
        }
        const proc = procs.find(p => p.id === id);
        const name = proc ? proc.name : 'this processor';
        UI.openModal('Remove Processor', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(name)}</strong>?</p>
            <p style="text-align:center;font-size:11px;color:var(--text-muted);">This cannot be undone.</p>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="HippoApp._confirmRemoveLedProcessor('${id}')">Remove</button>`);
    },

    _confirmRemoveLedProcessor(id) {
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage._loadProcessors();
            LedProcessorPage.removeProcessor(id);
        }
        this.renderLedProcessorList();
        UI.closeModal();
        UI.toast('Processor removed', 'info');
    },

    renderLedProcessorList() {
        const container = document.getElementById('led-processor-list');
        if (!container) return;

        // Read from LedProcessorPage's data (same localStorage key)
        let procs = [];
        if (typeof LedProcessorPage !== 'undefined') {
            LedProcessorPage._loadProcessors();
            procs = LedProcessorPage._processors || [];
        } else {
            try {
                const data = localStorage.getItem('luxor_led_processors');
                if (data) procs = JSON.parse(data);
            } catch {}
        }

        if (procs.length === 0) {
            container.innerHTML = `<div style="font-size:10px;color:var(--text-muted);padding:4px 0;">No processors added</div>`;
            return;
        }

        container.innerHTML = procs.map(p => `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-tertiary);border-radius:6px;border:1px solid var(--border);cursor:pointer;"
                 onclick="HippoApp.selectLedProcessor('${p.id}')" title="Click to open ${UI.esc(p.name)}">
                <span style="width:6px;height:6px;border-radius:50%;background:${p.online ? '#4ade80' : '#ef4444'};flex-shrink:0;"></span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:10px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${UI.esc(p.name)}
                    </div>
                    <div style="font-size:8px;color:var(--text-muted);">
                        ${p.type} ${p.host && p.host !== 'virtual-led' ? '— ' + p.host : ''}${p.virtual ? ' (Demo)' : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation();HippoApp.removeLedProcessor('${p.id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px;padding:2px;" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },
};

// ================================================================
// BOOT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    HippoApp.init();
});
