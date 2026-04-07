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
        loadcell:     LoadCellPage,
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
        nethealth:    NetHealthPage,
        ipam:         IpamPage,
        dante:        DantePage,
        timecodegen:  TimecodeGenPage,
        oscrouter:    OscRouterPage,
        macrobuilder: MacroBuilderPage,
        ndidiscovery: NdiDiscoveryPage,
        riggingcalc:  RiggingCalcPage,
        weighttracker: WeightTrackerPage,
        sacnmonitor:  SacnMonitorPage,
        showclock:    ShowClockPage,
        specifications: SpecificationsPage,
        topology:     TopologyPage,
        enginemedia:  EngineMediaPage,
        enginemixing: EngineMixingPage,
        settings:     SettingsPage,
        logs:         LogsPage,
    },

    // Pages only visible for specific server types
    _hippoPages: ['timelines', 'media', 'mixes', 'presets', 'pins', 'timecode', 'network', 'dmx'],
    _resolumePages: ['composition'],
    // Common pages shown for all: showrun, dashboard, status, settings, logs, ledprocessor

    _currentPageObj: null,

    // ================================================================
    // INITIALIZATION
    // ================================================================
    init() {
        // No auto-seeding — user adds servers manually via Add Server dialog

        // Restore saved theme
        const savedTheme = localStorage.getItem('luxor_theme');
        if (savedTheme === 'light') {
            document.documentElement.dataset.theme = 'light';
        }

        this.populateServerSelect();
        this.setupDock();
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

        // Restore timecode generator state (survives page refresh)
        if (typeof TimecodeGenPage !== 'undefined') {
            TimecodeGenPage._loadSettings();
            TimecodeGenPage._restoreState();
        }

        // Always start on Dashboard — it's the home screen
        this.navigate('dashboard');

        // Restore last page from URL hash or localStorage
        const savedPage = location.hash.replace('#', '') || localStorage.getItem('luxor_last_page');

        // Auto-reconnect to last active server on startup — but only if the user
        // was on a server-specific page, not the home dashboard / topology
        const servers = appState.get('servers');
        const lastServerId = localStorage.getItem('luxor_last_server');
        const lastServer = lastServerId ? servers.find(s => s.id === lastServerId) : null;
        const homePages = ['dashboard', 'topology', 'settings', 'ledprocessor', 'ptz', 'netswitch', 'lighting', 'intercom', 'loadcell', 'logs'];
        const wasOnHomePage = !savedPage || homePages.includes(savedPage);

        if (lastServer && !wasOnHomePage) {
            document.getElementById('server-select').value = lastServer.id;
            this._startupPage = savedPage && this.pages[savedPage] ? savedPage : null;
            setTimeout(() => this.switchServer(lastServerId), 200);
        } else {
            // Restore the page the user was on (dashboard, topology, etc.)
            if (savedPage && this.pages[savedPage]) {
                this.navigate(savedPage);
            }
            this.updateNavVisibility(null);
        }

        appState.log('INFO', 'Luxor Production v1.5 started', 'System');

        // First-time disclaimer popup
        if (!localStorage.getItem('luxor_disclaimer_accepted')) {
            this._showDisclaimer();
        }
    },

    _showDisclaimer() {
        const overlay = document.createElement('div');
        overlay.id = 'luxor-disclaimer-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:luxorFadeIn 0.3s ease;';

        overlay.innerHTML = `
            <div style="
                background:var(--card-bg, #1a1d23);
                border:1px solid var(--border, #2a2d35);
                border-radius:16px;
                max-width:480px;
                width:90%;
                padding:40px 36px 32px;
                text-align:center;
                box-shadow:0 24px 80px rgba(0,0,0,0.6);
                animation:luxorSlideUp 0.35s ease;
            ">
                <img src="assets/logos/luxor.png" alt="Luxor" style="width:90px;height:90px;margin:0 auto 20px;display:block;filter:drop-shadow(0 4px 12px rgba(245,158,11,0.3));">

                <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:var(--text-primary, #fff);letter-spacing:0.5px;">Luxor Production</h2>
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f59e0b;margin-bottom:20px;">Beta Software</div>

                <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:16px;margin-bottom:20px;text-align:left;">
                    <p style="margin:0 0 10px;font-size:13px;color:var(--text-secondary, #ccc);line-height:1.6;">
                        This application is currently <strong style="color:#f59e0b;">under active development</strong> and is provided as a beta version for testing and evaluation purposes.
                    </p>
                    <p style="margin:0 0 10px;font-size:13px;color:var(--text-secondary, #ccc);line-height:1.6;">
                        Features may be incomplete, unstable, or change without notice. Some device integrations may not function as expected with all hardware configurations.
                    </p>
                    <p style="margin:0;font-size:13px;color:var(--text-secondary, #ccc);line-height:1.6;">
                        By continuing, you acknowledge that you use this software <strong style="color:var(--text-primary, #fff);">at your own risk</strong>. No warranty is provided, and the developers are not liable for any issues arising from its use in production environments.
                    </p>
                </div>

                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:20px;padding:10px 14px;border-radius:8px;border:1px solid var(--border, #2a2d35);background:var(--bg-secondary, #12141a);transition:border-color 0.15s;" id="luxor-accept-label">
                    <input type="checkbox" id="luxor-accept-check" style="width:18px;height:18px;accent-color:#f59e0b;cursor:pointer;flex-shrink:0;">
                    <span style="font-size:12px;color:var(--text-secondary, #ccc);text-align:left;line-height:1.4;">I understand this is beta software and accept the risks of using it</span>
                </label>

                <button id="luxor-accept-btn" disabled style="
                    width:100%;padding:14px;border-radius:10px;border:none;
                    font-size:14px;font-weight:700;cursor:not-allowed;
                    background:#3a3a3a;color:#666;
                    transition:all 0.2s ease;
                " onclick="HippoApp._acceptDisclaimer()">
                    Accept & Continue
                </button>

                <p style="margin:16px 0 0;font-size:10px;color:var(--text-muted, #666);">v1.5 Beta &mdash; Luxor Production Suite</p>
            </div>
        `;

        document.body.appendChild(overlay);

        // Enable button when checkbox is checked
        const check = document.getElementById('luxor-accept-check');
        const btn = document.getElementById('luxor-accept-btn');
        const label = document.getElementById('luxor-accept-label');
        check.addEventListener('change', () => {
            if (check.checked) {
                btn.disabled = false;
                btn.style.cssText = 'width:100%;padding:14px;border-radius:10px;border:none;font-size:14px;font-weight:700;cursor:pointer;background:#f59e0b;color:#000;transition:all 0.2s ease;';
                label.style.borderColor = '#f59e0b';
            } else {
                btn.disabled = true;
                btn.style.cssText = 'width:100%;padding:14px;border-radius:10px;border:none;font-size:14px;font-weight:700;cursor:not-allowed;background:#3a3a3a;color:#666;transition:all 0.2s ease;';
                label.style.borderColor = 'var(--border, #2a2d35)';
            }
        });

        // Add animations
        if (!document.getElementById('luxor-disclaimer-css')) {
            const style = document.createElement('style');
            style.id = 'luxor-disclaimer-css';
            style.textContent = `
                @keyframes luxorFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes luxorSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `;
            document.head.appendChild(style);
        }
    },

    _acceptDisclaimer() {
        localStorage.setItem('luxor_disclaimer_accepted', 'true');
        const overlay = document.getElementById('luxor-disclaimer-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.25s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 250);
        }
    },

    // ================================================================
    // DOCK + PANEL NAVIGATION
    // ================================================================
    _categoryTitles: {
        devices: 'Devices', led: 'LED Tools', tools: 'Tools',
        network: 'Network', production: 'Production', '3d': '3D Tools', system: 'Settings'
    },

    // Map page IDs to their category for auto-switching
    _pageToCategory: {
        showrun: 'devices', dashboard: 'devices', status: 'devices',
        composition: 'devices', timelines: 'devices', media: 'devices', mixes: 'devices',
        presets: 'devices', pins: 'devices', timecode: 'devices',
        ledprocessor: 'devices', ptz: 'devices', netswitch: 'devices', lighting: 'devices', intercom: 'devices', enginemedia: 'devices', enginemixing: 'devices',
        ledcalc: 'led', ledsetup: 'led', pixlgrid: 'led', ledconnect: 'led',
        timecodegen: 'tools', showclock: 'tools', macrobuilder: 'tools', oscrouter: 'tools',
        nethealth: 'network', ipam: 'network', dante: 'network', ndidiscovery: 'network',
        sacnmonitor: 'network', network: 'network', dmx: 'network', sync: 'network',
        diagram: 'production', truckpack: 'production', specifications: 'production',
        riggingcalc: 'production', weighttracker: 'production', power: 'production',
        fixtures: 'production', captureview: 'production',
        stage3d: 'production', ledpanel3d: 'production',
        settings: 'system', logs: 'logs',
    },

    _activeCategory: 'devices',

    setupDock() {
        document.querySelectorAll('#sidebar-dock .dock-icon[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cat = btn.dataset.category;
                HippoApp.switchCategory(cat);
                // Auto-navigate to settings when clicking the system dock icon
                if (cat === 'system') {
                    HippoApp.navigate('settings');
                }
            });
        });
    },

    switchCategory(cat) {
        if (!cat) return;
        this._activeCategory = cat;

        // Update dock icon active states
        document.querySelectorAll('#sidebar-dock .dock-icon[data-category]').forEach(b => {
            b.classList.toggle('active', b.dataset.category === cat);
        });

        // Update panel title
        const title = document.getElementById('panel-title');
        if (title) title.textContent = this._categoryTitles[cat] || cat;

        // Show matching category panel
        document.querySelectorAll('.panel-category').forEach(p => {
            p.classList.toggle('active', p.dataset.cat === cat);
        });

        // Open panel if collapsed
        const panel = document.getElementById('sidebar-panel');
        if (panel && panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
        }
    },

    togglePanel() {
        const panel = document.getElementById('sidebar-panel');
        if (panel) panel.classList.toggle('collapsed');
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section && link.dataset.page === 'settings') {
                    SettingsPage._section = section;
                }
                // Reset Show Run sub-page when clicking the main Show Run nav (show all sections)
                if (link.dataset.page === 'showrun' && !link.dataset.subpage) {
                    ShowRunPage._activeSubPage = null;
                }
                this.navigate(link.dataset.page);
                // Update active state for settings sub-items
                if (section) {
                    document.querySelectorAll('.nav-item[data-section]').forEach(l => {
                        l.classList.toggle('active', l.dataset.section === section);
                    });
                }
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
        localStorage.setItem('luxor_last_page', page);

        // Auto-switch dock category to match the page
        const cat = this._pageToCategory[page];
        if (cat && cat !== this._activeCategory) {
            this.switchCategory(cat);
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(l => {
            if (l.dataset.section) {
                // Settings sub-items: match by section
                l.classList.toggle('active', page === 'settings' && l.dataset.section === SettingsPage._section);
            } else {
                l.classList.toggle('active', l.dataset.page === page);
            }
        });

        // Clear ALL sidebar device selections (green border) — each page re-applies its own
        document.querySelectorAll('.sidebar-device-card.selected').forEach(el => el.classList.remove('selected'));

        // Re-render server list to update engine sub-nav active states
        this.renderServerList();

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
            container.innerHTML = '';
            return;
        }

        const statuses = appState.get('serverStatuses') || {};
        const currentPage = appState.get('currentPage');

        // Engine control sub-pages by server type
        const enginePages = {
            hippo: [
                { page: 'timelines', icon: 'fa-stream', label: 'Timelines' },
                { page: 'media', icon: 'fa-photo-video', label: 'Media' },
                { page: 'mixes', icon: 'fa-sliders-h', label: 'Mixes & Layers' },
                { page: 'presets', icon: 'fa-bookmark', label: 'Presets' },
                { page: 'pins', icon: 'fa-microchip', label: 'Pin Control' },
                { page: 'timecode', icon: 'fa-clock', label: 'Timecode' },
            ],
            resolume: [
                { page: 'composition', icon: 'fa-th', label: 'Composition' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Layer Mixer' },
            ],
            vmix: [
                { page: 'vmix-switching', icon: 'fa-tv', label: 'Switching' },
                { page: 'vmix-audio', icon: 'fa-volume-up', label: 'Audio Mixer' },
                { page: 'vmix-overlays', icon: 'fa-layer-group', label: 'Overlays' },
                { page: 'vmix-replay', icon: 'fa-redo', label: 'Replay' },
                { page: 'vmix-ptz', icon: 'fa-video', label: 'PTZ Control' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            obs: [
                { page: 'obs-scenes', icon: 'fa-tv', label: 'Scenes' },
                { page: 'obs-audio', icon: 'fa-volume-up', label: 'Audio Mixer' },
                { page: 'obs-media', icon: 'fa-photo-video', label: 'Media Inputs' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            casparcg: [
                { page: 'casparcg-channels', icon: 'fa-tv', label: 'Channels & Layers' },
                { page: 'casparcg-media', icon: 'fa-photo-video', label: 'Media Library' },
                { page: 'casparcg-templates', icon: 'fa-layer-group', label: 'Templates (CG)' },
                { page: 'casparcg-mixer', icon: 'fa-sliders-h', label: 'Mixer Controls' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            barco: [
                { page: 'barco-switching', icon: 'fa-tv', label: 'Destinations' },
                { page: 'barco-presets', icon: 'fa-bookmark', label: 'Presets' },
                { page: 'barco-aux', icon: 'fa-external-link-alt', label: 'AUX & Patterns' },
                { page: 'barco-layers', icon: 'fa-layer-group', label: 'Layers' },
                { page: 'barco-config', icon: 'fa-cog', label: 'System & I/O' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
            qlab: [
                { page: 'qlab-cues', icon: 'fa-list-ol', label: 'Cue List' },
                { page: 'qlab-active', icon: 'fa-play-circle', label: 'Active Cues' },
                { page: 'qlab-direct', icon: 'fa-bolt', label: 'Direct Fire' },
                { page: 'qlab-settings', icon: 'fa-cog', label: 'Workspace' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Audio Controls' },
            ],
            disguise: [
                { page: 'disguise-tracks', icon: 'fa-stream', label: 'Tracks & Master' },
                { page: 'disguise-sections', icon: 'fa-tags', label: 'Sections' },
                { page: 'disguise-transport', icon: 'fa-clock', label: 'Transport & Go-To' },
                { page: 'disguise-health', icon: 'fa-heartbeat', label: 'System Health' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Audio & Output' },
            ],
            pixera: [
                { page: 'pixera-timelines', icon: 'fa-film', label: 'Timelines' },
                { page: 'pixera-cues', icon: 'fa-bolt', label: 'Cue Triggers' },
                { page: 'pixera-screens', icon: 'fa-desktop', label: 'Screens & Outputs' },
                { page: 'pixera-resources', icon: 'fa-folder-open', label: 'Resources' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Layers & Mixing' },
            ],
            atem: [
                { page: 'atem-switching', icon: 'fa-tv', label: 'Program / Preview' },
                { page: 'atem-keyers', icon: 'fa-layer-group', label: 'Keyers' },
                { page: 'atem-aux', icon: 'fa-external-link-alt', label: 'AUX Outputs' },
                { page: 'atem-macros', icon: 'fa-magic', label: 'Macros' },
                { page: 'atem-audio', icon: 'fa-volume-up', label: 'Audio Mixer' },
                { page: 'enginemedia', icon: 'fa-photo-video', label: 'Media Pool' },
                { page: 'enginemixing', icon: 'fa-sliders-h', label: 'Full Mixer' },
            ],
        };

        container.innerHTML = servers.map(s => {
            const t = this._serverTypes[s.type] || this._serverTypes['hippo'];
            const isActive = s.id === activeId;
            const isOnline = isActive && connected;
            const wasOnline = statuses[s.id]?.online;
            const dotColor = isOnline ? '#4ade80' : isActive ? '#f59e0b' : wasOnline ? '#4ade80' : '#6b7280';
            // Only show green selected border when user is on an engine-related page
            const engineRelatedPages = ['showrun', 'dashboard', 'composition', 'timelines', 'media', 'mixes', 'presets', 'pins', 'timecode', 'status', 'enginemedia', 'enginemixing'];
            const isOnEnginePage = isActive && engineRelatedPages.includes(currentPage);

            let html = `
            <div class="sidebar-device-card ${isOnEnginePage ? 'selected' : ''}" onclick="HippoApp.switchServer('${s.id}')" title="${isActive ? 'Connected' : 'Click to connect'}">
                <span class="device-dot" style="background:${dotColor}"></span>
                <div class="device-info">
                    <div class="device-name">${UI.esc(s.name)}</div>
                    <div class="device-sub">${t.label} ${s.virtual ? '(Demo)' : s.host ? '— ' + s.host : ''}</div>
                </div>
                <button class="device-remove" onclick="event.stopPropagation();HippoApp.removeServer('${s.id}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;

            // Show engine control sub-pages under the connected server
            if (isOnline && enginePages[s.type]) {
                html += `<div class="engine-sub-nav">`;
                html += enginePages[s.type].map(p => {
                    // For Hippo/Resolume, these are real pages. For other engines, they navigate to showrun with a view.
                    const isEngineView = p.page.includes('-');
                    const isActive = isEngineView ? (currentPage === 'showrun' && ShowRunPage._activeSubPage === p.page) : (currentPage === p.page);
                    const clickHandler = isEngineView
                        ? `event.preventDefault();ShowRunPage._activeSubPage='${p.page}';HippoApp.navigate('showrun');`
                        : `event.preventDefault();HippoApp.navigate('${p.page}');`;
                    return `<a href="#${p.page}" class="nav-item engine-sub-item ${isActive ? 'active' : ''}" data-page="${isEngineView ? 'showrun' : p.page}" data-subpage="${p.page}" onclick="${clickHandler}">
                        <i class="fas ${p.icon}"></i><span>${p.label}</span>
                    </a>`;
                }).join('');
                html += `</div>`;
            }

            return html;
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
        if (!serverId) { this.disconnect(); return; }

        // If already connected to this server, stay on current page
        // (don't yank the user away from LED processors, PTZ, etc.)
        const activeId = appState.get('activeServerId');
        const connected = appState.get('connected');
        if (serverId === activeId && connected) {
            // Just make sure sidebar is visible — don't navigate away
            if (this._activeCategory !== 'devices') {
                this.switchCategory('devices');
            }
            this.renderServerList();
            return;
        }

        this.connectToServer(serverId);
    },

    async connectToServer(serverId) {
        const server = appState.get('servers').find(s => s.id === serverId);
        if (!server) { UI.toast('Server not found', 'error'); return; }

        // If already connected to this server, stay on current page
        const activeId = appState.get('activeServerId');
        const alreadyConnected = appState.get('connected');
        if (serverId === activeId && alreadyConnected) {
            if (this._activeCategory !== 'devices') {
                this.switchCategory('devices');
            }
            this.renderServerList();
            return;
        }

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
                case 'barco': {
                    const barcoState = await barcoAPI.getState().catch(() => null);
                    if (barcoState) appState.set('barcoState', barcoState);
                    break;
                }
                case 'qlab': {
                    const qlabState = await qlabAPI.getState().catch(() => null);
                    if (qlabState) appState.set('qlabState', qlabState);
                    break;
                }
                case 'disguise': {
                    const disguiseState = await disguiseAPI.getState().catch(() => null);
                    if (disguiseState) appState.set('disguiseState', disguiseState);
                    break;
                }
                case 'pixera': {
                    const pixeraState = await pixeraAPI.getState().catch(() => null);
                    if (pixeraState) appState.set('pixeraState', pixeraState);
                    break;
                }
                case 'atem': {
                    const atemState = await atemAPI.getState().catch(() => null);
                    if (atemState) appState.set('atemState', atemState);
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

            // Navigate — on startup reconnect, stay on whatever page the user was on
            // Otherwise go to the engine's default page
            const restoredPage = this._startupPage;
            this._startupPage = null;  // clear so it only applies once
            if (restoredPage && this.pages[restoredPage]) {
                // Startup reconnect — stay on the page from URL hash / localStorage
                this.navigate(restoredPage);
            } else if (ShowRunPage._returnToShowRun) {
                ShowRunPage._returnToShowRun = false;
                this.navigate('showrun');
            } else if (serverType === 'resolume') {
                this.navigate('composition');
            } else if (serverType === 'hippo') {
                this.navigate('dashboard');
            } else {
                // All other engines: go directly to Show Run
                this.navigate('showrun');
            }
            // Re-render server list to show selected state
            this.renderServerList();

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
        appState.set('barcoState', null);
        appState.set('qlabState', null);
        appState.set('disguiseState', null);
        appState.set('pixeraState', null);
        appState.set('atemState', null);
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

    /** Go to the home dashboard — disconnects from any active server first */
    goHome() {
        if (appState.get('connected') || appState.get('activeServerId')) {
            this.disconnect();
        }
        this.navigate('dashboard');
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
                    const barcoState = await barcoAPI.getState().catch(() => null);
                    if (barcoState) appState.set('barcoState', barcoState);
                    break;
                }
                case 'qlab': {
                    const qlabState = await qlabAPI.getState().catch(() => null);
                    if (qlabState) appState.set('qlabState', qlabState);
                    break;
                }
                case 'disguise': {
                    const disguiseState = await disguiseAPI.getState().catch(() => null);
                    if (disguiseState) appState.set('disguiseState', disguiseState);
                    break;
                }
                case 'pixera': {
                    const pixeraState = await pixeraAPI.getState().catch(() => null);
                    if (pixeraState) appState.set('pixeraState', pixeraState);
                    break;
                }
                case 'atem': {
                    const atemState = await atemAPI.getState().catch(() => null);
                    if (atemState) appState.set('atemState', atemState);
                    break;
                }
                default: {
                    const info = await hippoAPI.getFullStatus();
                    appState.set('serverInfo', info);
                    if (info._components) appState.set('componentStatuses', info._components);
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
    _alwaysVisiblePages: ['showrun', 'dashboard', 'settings', 'logs', 'status', 'ledprocessor', 'ledcalc', 'ledsetup', 'pixlgrid', 'diagram', 'ledconnect', 'ptz', 'netswitch', 'lighting', 'intercom', 'stage3d', 'ledpanel3d', 'power', 'fixtures', 'truckpack', 'captureview', 'nethealth', 'ipam', 'dante', 'timecodegen', 'specifications', 'oscrouter', 'macrobuilder', 'ndidiscovery', 'riggingcalc', 'weighttracker', 'sacnmonitor', 'showclock', 'enginemedia', 'enginemixing'],

    updateNavVisibility(serverType) {
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

        // Re-apply optional feature visibility (3D tools, capture viewer, power, fixtures)
        this.applySidebarVisibility();
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
    toggleTheme() {
        const current = document.documentElement.dataset.theme;
        const newTheme = current === 'light' ? 'dark' : 'light';
        if (newTheme === 'light') {
            document.documentElement.dataset.theme = 'light';
        } else {
            delete document.documentElement.dataset.theme;
        }
        localStorage.setItem('luxor_theme', newTheme);
    },

    toggleSidebar() {
        // Toggle the panel visibility (dock stays visible)
        this.togglePanel();
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
        const wsId = appState.get('qlabState')?.workspaceId;
        try {
            switch (action) {
                case 'go':     await qlabAPI.go(wsId); UI.toast('GO', 'success'); break;
                case 'stop':   await qlabAPI.stop(wsId); UI.toast('Stop', 'info'); break;
                case 'pause':  await qlabAPI.pause(wsId); UI.toast('Paused', 'info'); break;
                case 'resume': await qlabAPI.resume(wsId); UI.toast('Resume', 'success'); break;
                case 'panic':  await qlabAPI.panic(wsId); UI.toast('PANIC — All stopped', 'warning'); break;
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
                    const dests = appState.get('barcoState')?.destinations || [];
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
                tools3d: saved.tools3d === true,
                captureViewer: saved.captureViewer === true,
                power: saved.power === true,
                fixtures: saved.fixtures === true,
            };
        } catch {
            vis = { engines: true, ledProcessors: true, cameras: true, switches: true, consoles: true, intercom: true, tools3d: false, captureViewer: false, power: false, fixtures: false };
        }

        // Hide/show device sections in the Devices panel
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

        // Hide/show optional feature nav items + dock icons
        const hiddenPages = [];
        if (!vis.tools3d) hiddenPages.push('stage3d', 'ledpanel3d');
        if (!vis.captureViewer) hiddenPages.push('captureview');
        if (!vis.power) hiddenPages.push('power');
        if (!vis.fixtures) hiddenPages.push('fixtures');
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (hiddenPages.includes(page)) {
                item.style.display = 'none';
            }
        });

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
        this.renderLedProcessorList();
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
            container.innerHTML = '';
            return;
        }

        const activeId = (typeof LedProcessorPage !== 'undefined' && LedProcessorPage._activeProc) ? LedProcessorPage._activeProc.id : null;
        const onLedPage = appState.get('currentPage') === 'ledprocessor';
        container.innerHTML = procs.map(p => `
            <div class="sidebar-device-card ${onLedPage && p.id === activeId ? 'selected' : ''}" onclick="HippoApp.selectLedProcessor('${p.id}')" title="Click to open ${UI.esc(p.name)}">
                <span class="device-dot" style="background:${p.online ? '#4ade80' : '#ef4444'}"></span>
                <div class="device-info">
                    <div class="device-name">${UI.esc(p.name)}</div>
                    <div class="device-sub">${p.type} ${p.host && p.host !== 'virtual-led' ? '— ' + p.host : ''}${p.virtual ? ' (Demo)' : ''}</div>
                </div>
                <button class="device-remove" onclick="event.stopPropagation();HippoApp.removeLedProcessor('${p.id}')" title="Remove">
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
