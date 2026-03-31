/**
 * Network Configuration Page — All protocol settings
 * Art-Net, sACN, HippoNet, OSC, MIDI, TCP/IP, CITP, General
 */
const NetworkPage = {
    render() {
        const cfg = appState.get('networkConfig');

        return `
            <div class="section-header">
                <h2><i class="fas fa-network-wired"></i> Network Configuration</h2>
                <button class="btn btn-sm btn-primary" onclick="NetworkPage.saveAll()"><i class="fas fa-save"></i> Save All</button>
            </div>

            ${UI.tabs([
                { id: 'general', label: 'General', content: this._generalTab(cfg.general) },
                { id: 'hipponet', label: 'HippoNet', content: this._hipponetTab(cfg.hipponet) },
                { id: 'artnet', label: 'Art-Net', content: this._artnetTab(cfg.artnet) },
                { id: 'sacn', label: 'sACN', content: this._sacnTab(cfg.sacn) },
                { id: 'osc', label: 'OSC', content: this._oscTab(cfg.osc) },
                { id: 'midi', label: 'MIDI', content: this._midiTab(cfg.midi) },
                { id: 'tcp', label: 'TCP/IP', content: this._tcpTab(cfg.tcp) },
                { id: 'citp', label: 'CITP', content: this._citpTab(cfg.citp) },
                { id: 'manet', label: 'MA-Net', content: this._manetTab(cfg.manet) },
            ], 'general')}
        `;
    },

    _generalTab(g) {
        return `
            <div class="network-grid">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-globe"></i> Network Interfaces</h3></div>
                    <div class="card-body">
                        ${UI.formGroup('HOSTNAME', `<input class="form-control" id="net-hostname" value="${UI.esc(g.hostname)}" placeholder="Auto-detect">`)}
                        ${UI.formGroup('PRIMARY INTERFACE', UI.select('net-primary-iface', [{value:'auto',label:'Auto-detect'},{value:'eth0',label:'eth0'},{value:'eth1',label:'eth1'}], g.primaryInterface))}
                        ${UI.formGroup('MTU SIZE', `<input class="form-control" type="number" id="net-mtu" value="${g.mtu}" min="576" max="9000">`, 'Default: 1500. Use 9000 for jumbo frames')}
                        ${UI.formGroup('QOS PRIORITY', UI.select('net-qos', ['normal','high','realtime'], g.qos))}
                        ${UI.formGroup('BANDWIDTH LIMIT (MBPS)', `<input class="form-control" type="number" id="net-bw" value="${g.bandwidthLimit}" min="0">`, '0 = unlimited')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-clock"></i> Time Sync</h3></div>
                    <div class="card-body">
                        <div class="form-inline mb-md">
                            <span style="font-size:12px">NTP Enabled</span>
                            ${UI.toggle('net-ntp-enabled', g.ntpEnabled)}
                        </div>
                        ${UI.formGroup('NTP SERVER', `<input class="form-control mono" id="net-ntp-server" value="${UI.esc(g.ntpServer)}">`)}
                    </div>
                </div>
            </div>
        `;
    },

    _hipponetTab(h) {
        return `
            <div class="network-grid">
                <div class="card full-width">
                    <div class="card-header">
                        <h3><i class="fas fa-project-diagram"></i> HippoNet</h3>
                        <div class="form-inline">${UI.toggle('hn-enabled', h.enabled)} <span style="font-size:11px">Enabled</span></div>
                    </div>
                    <div class="card-body">
                        <div class="form-row">
                            ${UI.formGroup('INTERFACE', UI.select('hn-iface', [{value:'auto',label:'Auto'},{value:'eth0',label:'eth0'},{value:'eth1',label:'eth1'}], h.interface))}
                            ${UI.formGroup('PORT', `<input class="form-control" type="number" id="hn-port" value="${h.port}" min="1" max="65535">`)}
                            ${UI.formGroup('MAX NODES', `<input class="form-control" type="number" id="hn-maxnodes" value="${h.maxNodes}" min="1" max="256">`)}
                        </div>
                        <div class="form-row">
                            ${UI.formGroup('MASTER IP', `<input class="form-control mono" id="hn-master" value="${UI.esc(h.masterIp)}" placeholder="Auto-elect">`, 'Leave empty for auto-election')}
                            ${UI.formGroup('HEARTBEAT (S)', `<input class="form-control" type="number" id="hn-heartbeat" value="${h.heartbeat}" min="1">`)}
                            ${UI.formGroup('TIMEOUT (S)', `<input class="form-control" type="number" id="hn-timeout" value="${h.timeout}" min="5">`)}
                        </div>
                        <div class="flex gap-md mt-sm">
                            <div class="form-inline">${UI.toggle('hn-discovery', h.discovery)} <span style="font-size:11px">Auto Discovery</span></div>
                            <div class="form-inline">${UI.toggle('hn-sync', h.syncEnabled)} <span style="font-size:11px">Sync Enabled</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    _artnetTab(a) {
        const universeRows = (a.universes || []).map((u, i) => `
            <div class="layer-row" style="display:grid;grid-template-columns:60px 80px 80px 1fr 60px 40px;gap:8px;align-items:center">
                <span class="mono" style="font-size:11px">#${i}</span>
                <input class="form-control" type="number" value="${u.sub}" min="0" max="15" placeholder="Sub" style="font-size:11px" data-uni="${i}" data-field="sub">
                <input class="form-control" type="number" value="${u.uni}" min="0" max="15" placeholder="Uni" style="font-size:11px" data-uni="${i}" data-field="uni">
                <input class="form-control" value="${UI.esc(u.label)}" placeholder="Label" style="font-size:11px" data-uni="${i}" data-field="label">
                ${UI.toggle(`artnet-uni-en-${i}`, u.enabled)}
                <button class="btn btn-xs btn-danger" onclick="NetworkPage.removeArtnetUni(${i})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');

        return `
            <div class="network-grid">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-broadcast-tower"></i> Art-Net</h3>
                        <div class="form-inline">${UI.toggle('artnet-enabled', a.enabled)} <span style="font-size:11px">Enabled</span></div>
                    </div>
                    <div class="card-body">
                        ${UI.formGroup('MODE', UI.select('artnet-mode', [{value:'broadcast',label:'Broadcast'},{value:'unicast',label:'Unicast'}], a.mode))}
                        ${UI.formGroup('INTERFACE', UI.select('artnet-iface', [{value:'auto',label:'Auto'},{value:'eth0',label:'eth0'},{value:'eth1',label:'eth1'}], a.interface))}
                        <div class="form-row">
                            ${UI.formGroup('NET', `<input class="form-control" type="number" id="artnet-net" value="${a.net}" min="0" max="127">`)}
                            ${UI.formGroup('SUBNET', `<input class="form-control" type="number" id="artnet-subnet" value="${a.subnet}" min="0" max="15">`)}
                            ${UI.formGroup('UNIVERSE', `<input class="form-control" type="number" id="artnet-universe" value="${a.universe}" min="0" max="15">`)}
                        </div>
                        ${UI.formGroup('BROADCAST IP', `<input class="form-control mono" id="artnet-broadcast" value="${UI.esc(a.broadcastIp)}">`)}
                        ${UI.formGroup('REFRESH RATE (HZ)', `<input class="form-control" type="number" id="artnet-refresh" value="${a.refreshRate}" min="1" max="44">`)}
                        ${UI.formGroup('MERGE MODE', UI.select('artnet-merge', ['HTP','LTP'], a.mergeMode))}
                        <div class="flex gap-md mt-sm flex-wrap">
                            <div class="form-inline">${UI.toggle('artnet-artsync', a.artSync)} <span style="font-size:11px">ArtSync</span></div>
                            <div class="form-inline">${UI.toggle('artnet-rdm', a.rdm)} <span style="font-size:11px">RDM</span></div>
                            <div class="form-inline">${UI.toggle('artnet-input', a.input)} <span style="font-size:11px">Input</span></div>
                            <div class="form-inline">${UI.toggle('artnet-output', a.output)} <span style="font-size:11px">Output</span></div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Universe Mapping</h3>
                        <button class="btn btn-xs btn-accent" onclick="NetworkPage.addArtnetUni()"><i class="fas fa-plus"></i> Add</button>
                    </div>
                    <div class="card-body" id="artnet-universes">
                        ${universeRows || '<div class="text-muted" style="font-size:11px">No universes configured</div>'}
                    </div>
                </div>
            </div>
        `;
    },

    _sacnTab(s) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-wave-square"></i> sACN (Streaming ACN / E1.31)</h3>
                    <div class="form-inline">${UI.toggle('sacn-enabled', s.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('PRIORITY', `<input class="form-control" type="number" id="sacn-priority" value="${s.priority}" min="0" max="200">`)}
                        ${UI.formGroup('SOURCE NAME', `<input class="form-control" id="sacn-source" value="${UI.esc(s.sourceName)}">`)}
                        ${UI.formGroup('REFRESH RATE (HZ)', `<input class="form-control" type="number" id="sacn-refresh" value="${s.refreshRate}" min="1" max="44">`)}
                    </div>
                    ${UI.formGroup('UNIVERSES (comma-separated)', `<input class="form-control mono" id="sacn-universes" value="${(s.universes || []).join(', ')}">`)}
                    ${UI.formGroup('SYNC UNIVERSE', `<input class="form-control" type="number" id="sacn-sync-uni" value="${s.syncUniverse}" min="0">`)}
                    <div class="flex gap-md mt-sm flex-wrap">
                        <div class="form-inline">${UI.toggle('sacn-multicast', s.multicast)} <span style="font-size:11px">Multicast</span></div>
                        <div class="form-inline">${UI.toggle('sacn-psp', s.perSourcePriority)} <span style="font-size:11px">Per-Source Priority</span></div>
                        <div class="form-inline">${UI.toggle('sacn-accept-all', s.acceptAll)} <span style="font-size:11px">Accept All Sources</span></div>
                    </div>
                    ${UI.formGroup('UNICAST TARGETS', `<textarea class="form-control mono" id="sacn-unicast" rows="2" placeholder="One IP per line">${(s.unicastTargets || []).join('\\n')}</textarea>`)}
                    ${UI.formGroup('ALLOWED SOURCES', `<textarea class="form-control mono" id="sacn-allowed" rows="2" placeholder="One IP per line (if not accept all)">${(s.allowedSources || []).join('\\n')}</textarea>`)}
                </div>
            </div>
        `;
    },

    _oscTab(o) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-wave-square"></i> OSC (Open Sound Control)</h3>
                    <div class="form-inline">${UI.toggle('osc-enabled', o.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('PROTOCOL', UI.select('osc-proto', ['udp','tcp'], o.protocol))}
                        ${UI.formGroup('LISTEN PORT', `<input class="form-control" type="number" id="osc-listen" value="${o.listenPort}" min="1" max="65535">`)}
                    </div>
                    <div class="form-row">
                        ${UI.formGroup('SEND HOST', `<input class="form-control mono" id="osc-send-host" value="${UI.esc(o.sendHost)}">`)}
                        ${UI.formGroup('SEND PORT', `<input class="form-control" type="number" id="osc-send-port" value="${o.sendPort}" min="1" max="65535">`)}
                    </div>
                </div>
            </div>
        `;
    },

    _midiTab(m) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-music"></i> MIDI</h3>
                    <div class="form-inline">${UI.toggle('midi-enabled', m.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('INPUT DEVICE', `<input class="form-control" id="midi-input" value="${UI.esc(m.inputDevice)}" placeholder="Device name">`)}
                        ${UI.formGroup('OUTPUT DEVICE', `<input class="form-control" id="midi-output" value="${UI.esc(m.outputDevice)}" placeholder="Device name">`)}
                    </div>
                    <div class="form-row">
                        ${UI.formGroup('CHANNEL', `<input class="form-control" type="number" id="midi-channel" value="${m.channel}" min="0" max="15">`)}
                    </div>
                    <div class="flex gap-md mt-sm">
                        <div class="form-inline">${UI.toggle('midi-msc', m.mscEnabled)} <span style="font-size:11px">MSC (MIDI Show Control)</span></div>
                    </div>
                    ${UI.formGroup('MSC DEVICE ID', `<input class="form-control" type="number" id="midi-msc-id" value="${m.mscDeviceId}" min="0" max="127">`)}
                </div>
            </div>
        `;
    },

    _tcpTab(t) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-plug"></i> TCP/IP Control</h3>
                    <div class="form-inline">${UI.toggle('tcp-enabled', t.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('LISTEN PORT', `<input class="form-control" type="number" id="tcp-port" value="${t.listenPort}" min="1" max="65535">`)}
                        ${UI.formGroup('MAX CONNECTIONS', `<input class="form-control" type="number" id="tcp-max" value="${t.maxConnections}" min="1" max="100">`)}
                    </div>
                    <div class="form-row">
                        ${UI.formGroup('DELIMITER', `<input class="form-control mono" id="tcp-delimiter" value="${UI.esc(t.delimiter)}">`)}
                    </div>
                    <div class="form-inline mt-sm">${UI.toggle('tcp-keepalive', t.keepAlive)} <span style="font-size:11px">Keep-Alive</span></div>
                </div>
            </div>
        `;
    },

    _citpTab(c) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-image"></i> CITP (Thumbnail Exchange)</h3>
                    <div class="form-inline">${UI.toggle('citp-enabled', c.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('PEER NAME', `<input class="form-control" id="citp-peer" value="${UI.esc(c.peerName)}">`)}
                        ${UI.formGroup('PORT', `<input class="form-control" type="number" id="citp-port" value="${c.port}" min="1" max="65535">`)}
                    </div>
                    ${UI.formGroup('THUMBNAIL SIZE', UI.select('citp-thumb-size', ['small','medium','large'], c.thumbnailSize))}
                </div>
            </div>
        `;
    },

    _manetTab(m) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-plug"></i> MA-Net (grandMA Compatible)</h3>
                    <div class="form-inline">${UI.toggle('manet-enabled', m.enabled)} <span style="font-size:11px">Enabled</span></div>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        ${UI.formGroup('SESSION ID', `<input class="form-control" type="number" id="manet-session" value="${m.sessionId}" min="1" max="255">`)}
                        ${UI.formGroup('MODE', UI.select('manet-mode', ['passive','active'], m.mode))}
                        ${UI.formGroup('INTERFACE', UI.select('manet-iface', [{value:'auto',label:'Auto'},{value:'eth0',label:'eth0'}], m.interface))}
                    </div>
                </div>
            </div>
        `;
    },

    addArtnetUni() {
        const cfg = appState.get('networkConfig');
        cfg.artnet.universes.push({ idx: cfg.artnet.universes.length, sub: 0, uni: cfg.artnet.universes.length, enabled: true, label: `Universe ${cfg.artnet.universes.length + 1}` });
        appState.setNetworkConfig(cfg);
        HippoApp.renderPage();
    },

    removeArtnetUni(i) {
        const cfg = appState.get('networkConfig');
        cfg.artnet.universes.splice(i, 1);
        appState.setNetworkConfig(cfg);
        HippoApp.renderPage();
    },

    _val(id, fallback) { const el = document.getElementById(id); return el ? el.value : fallback; },
    _num(id, fallback) { const el = document.getElementById(id); return el ? (parseInt(el.value) || fallback) : fallback; },
    _chk(id) { const el = document.getElementById(id); return el ? el.checked : false; },
    _sel(id, fallback) { const el = document.getElementById(id); return el ? el.value : fallback; },

    saveAll() {
        const cfg = appState.get('networkConfig');

        // General
        cfg.general.hostname = this._val('net-hostname', cfg.general.hostname);
        cfg.general.primaryInterface = this._sel('net-primary-iface', cfg.general.primaryInterface);
        cfg.general.mtu = this._num('net-mtu', cfg.general.mtu);
        cfg.general.qos = this._sel('net-qos', cfg.general.qos);
        cfg.general.bandwidthLimit = this._num('net-bw', cfg.general.bandwidthLimit);
        cfg.general.ntpEnabled = this._chk('net-ntp-enabled');
        cfg.general.ntpServer = this._val('net-ntp-server', cfg.general.ntpServer);

        // HippoNet
        cfg.hipponet.enabled = this._chk('hn-enabled');
        cfg.hipponet.interface = this._sel('hn-iface', cfg.hipponet.interface);
        cfg.hipponet.port = this._num('hn-port', cfg.hipponet.port);
        cfg.hipponet.maxNodes = this._num('hn-maxnodes', cfg.hipponet.maxNodes);
        cfg.hipponet.masterIp = this._val('hn-master', cfg.hipponet.masterIp);
        cfg.hipponet.heartbeat = this._num('hn-heartbeat', cfg.hipponet.heartbeat);
        cfg.hipponet.timeout = this._num('hn-timeout', cfg.hipponet.timeout);
        cfg.hipponet.discovery = this._chk('hn-discovery');
        cfg.hipponet.syncEnabled = this._chk('hn-sync');

        // Art-Net
        cfg.artnet.enabled = this._chk('artnet-enabled');
        cfg.artnet.mode = this._sel('artnet-mode', cfg.artnet.mode);
        cfg.artnet.interface = this._sel('artnet-iface', cfg.artnet.interface);
        cfg.artnet.net = this._num('artnet-net', cfg.artnet.net);
        cfg.artnet.subnet = this._num('artnet-subnet', cfg.artnet.subnet);
        cfg.artnet.universe = this._num('artnet-universe', cfg.artnet.universe);
        cfg.artnet.broadcastIp = this._val('artnet-broadcast', cfg.artnet.broadcastIp);
        cfg.artnet.refreshRate = this._num('artnet-refresh', cfg.artnet.refreshRate);
        cfg.artnet.mergeMode = this._sel('artnet-merge', cfg.artnet.mergeMode);
        cfg.artnet.artSync = this._chk('artnet-artsync');
        cfg.artnet.rdm = this._chk('artnet-rdm');
        cfg.artnet.input = this._chk('artnet-input');
        cfg.artnet.output = this._chk('artnet-output');

        // Art-Net universes
        (cfg.artnet.universes || []).forEach((u, i) => {
            const subEl = document.querySelector(`[data-uni="${i}"][data-field="sub"]`);
            const uniEl = document.querySelector(`[data-uni="${i}"][data-field="uni"]`);
            const labelEl = document.querySelector(`[data-uni="${i}"][data-field="label"]`);
            if (subEl) u.sub = parseInt(subEl.value) || 0;
            if (uniEl) u.uni = parseInt(uniEl.value) || 0;
            if (labelEl) u.label = labelEl.value;
            u.enabled = this._chk(`artnet-uni-en-${i}`);
        });

        // sACN
        cfg.sacn.enabled = this._chk('sacn-enabled');
        cfg.sacn.priority = this._num('sacn-priority', cfg.sacn.priority);
        cfg.sacn.sourceName = this._val('sacn-source', cfg.sacn.sourceName);
        cfg.sacn.refreshRate = this._num('sacn-refresh', cfg.sacn.refreshRate);
        const sacnUniStr = this._val('sacn-universes', '');
        if (sacnUniStr) cfg.sacn.universes = sacnUniStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        cfg.sacn.syncUniverse = this._num('sacn-sync-uni', cfg.sacn.syncUniverse);
        cfg.sacn.multicast = this._chk('sacn-multicast');
        cfg.sacn.perSourcePriority = this._chk('sacn-psp');
        cfg.sacn.acceptAll = this._chk('sacn-accept-all');
        const sacnUnicast = this._val('sacn-unicast', '');
        if (sacnUnicast !== undefined) cfg.sacn.unicastTargets = sacnUnicast.split('\n').map(s => s.trim()).filter(Boolean);
        const sacnAllowed = this._val('sacn-allowed', '');
        if (sacnAllowed !== undefined) cfg.sacn.allowedSources = sacnAllowed.split('\n').map(s => s.trim()).filter(Boolean);

        // OSC
        cfg.osc.enabled = this._chk('osc-enabled');
        cfg.osc.protocol = this._sel('osc-proto', cfg.osc.protocol);
        cfg.osc.listenPort = this._num('osc-listen', cfg.osc.listenPort);
        cfg.osc.sendHost = this._val('osc-send-host', cfg.osc.sendHost);
        cfg.osc.sendPort = this._num('osc-send-port', cfg.osc.sendPort);

        // MIDI
        cfg.midi.enabled = this._chk('midi-enabled');
        cfg.midi.inputDevice = this._val('midi-input', cfg.midi.inputDevice);
        cfg.midi.outputDevice = this._val('midi-output', cfg.midi.outputDevice);
        cfg.midi.channel = this._num('midi-channel', cfg.midi.channel);
        cfg.midi.mscEnabled = this._chk('midi-msc');
        cfg.midi.mscDeviceId = this._num('midi-msc-id', cfg.midi.mscDeviceId);

        // TCP
        cfg.tcp.enabled = this._chk('tcp-enabled');
        cfg.tcp.listenPort = this._num('tcp-port', cfg.tcp.listenPort);
        cfg.tcp.maxConnections = this._num('tcp-max', cfg.tcp.maxConnections);
        cfg.tcp.delimiter = this._val('tcp-delimiter', cfg.tcp.delimiter);
        cfg.tcp.keepAlive = this._chk('tcp-keepalive');

        // CITP
        cfg.citp.enabled = this._chk('citp-enabled');
        cfg.citp.peerName = this._val('citp-peer', cfg.citp.peerName);
        cfg.citp.port = this._num('citp-port', cfg.citp.port);
        cfg.citp.thumbnailSize = this._sel('citp-thumb-size', cfg.citp.thumbnailSize);

        // MA-Net
        cfg.manet.enabled = this._chk('manet-enabled');
        cfg.manet.sessionId = this._num('manet-session', cfg.manet.sessionId);
        cfg.manet.mode = this._sel('manet-mode', cfg.manet.mode);
        cfg.manet.interface = this._sel('manet-iface', cfg.manet.interface);

        appState.setNetworkConfig(cfg);
        UI.toast('Network settings saved', 'success');
        appState.log('INFO', 'Network configuration saved', 'Network');
    },

    onActivate() {},
};
