/**
 * DMX / Art-Net Monitor Page
 */
const DmxPage = {
    render() {
        const cfg = appState.get('networkConfig');
        const artnet = cfg.artnet;
        const sacn = cfg.sacn;

        return `
            <div class="section-header">
                <h2><i class="fas fa-lightbulb"></i> DMX / Art-Net Monitor</h2>
            </div>

            <div class="dashboard-stats" style="margin-bottom:16px">
                ${UI.statCard('fa-broadcast-tower', 'accent', 'Art-Net', artnet.enabled ? 'Enabled' : 'Disabled', `${artnet.mode} mode`)}
                ${UI.statCard('fa-wave-square', 'blue', 'sACN', sacn.enabled ? 'Enabled' : 'Disabled', `Priority ${sacn.priority}`)}
                ${UI.statCard('fa-hashtag', 'purple', 'Universes', (artnet.universes || []).length, 'Art-Net universes')}
                ${UI.statCard('fa-exchange-alt', 'orange', 'Merge Mode', artnet.mergeMode, artnet.refreshRate + ' Hz')}
            </div>

            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-th"></i> Universe Grid</h3>
                </div>
                <div class="card-body">
                    <div class="dmx-universe-grid">
                        ${(artnet.universes || []).map((u, i) => this._renderUniverse(u, i)).join('')}
                    </div>
                    ${(artnet.universes || []).length === 0 ? UI.empty('fa-lightbulb', 'No Universes', 'Configure universes in Network settings') : ''}
                </div>
            </div>

            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-info-circle"></i> Art-Net Status</h3>
                </div>
                <div class="card-body">
                    <table>
                        <tr><td class="text-muted">Mode</td><td>${artnet.mode}</td></tr>
                        <tr><td class="text-muted">Net</td><td class="mono">${artnet.net}</td></tr>
                        <tr><td class="text-muted">Subnet</td><td class="mono">${artnet.subnet}</td></tr>
                        <tr><td class="text-muted">Universe</td><td class="mono">${artnet.universe}</td></tr>
                        <tr><td class="text-muted">Broadcast IP</td><td class="mono">${artnet.broadcastIp}</td></tr>
                        <tr><td class="text-muted">ArtSync</td><td>${artnet.artSync ? UI.badge('ON', 'green') : UI.badge('OFF', 'red')}</td></tr>
                        <tr><td class="text-muted">RDM</td><td>${artnet.rdm ? UI.badge('ON', 'green') : UI.badge('OFF', 'red')}</td></tr>
                        <tr><td class="text-muted">Input</td><td>${artnet.input ? UI.badge('ON', 'green') : UI.badge('OFF', 'red')}</td></tr>
                        <tr><td class="text-muted">Output</td><td>${artnet.output ? UI.badge('ON', 'green') : UI.badge('OFF', 'red')}</td></tr>
                    </table>
                </div>
            </div>
        `;
    },

    _renderUniverse(u, idx) {
        // Render a 16x32 DMX channel grid (512 channels)
        let channels = '';
        for (let c = 1; c <= 512; c++) {
            channels += `<div class="dmx-channel" title="Ch ${c}">${c}</div>`;
        }

        return `
            <div class="card">
                <div class="card-header">
                    <h3>${UI.esc(u.label || `Universe ${idx}`)}</h3>
                    ${u.enabled ? UI.badge('Active', 'green') : UI.badge('Disabled', 'red')}
                </div>
                <div class="card-body">
                    <div class="text-muted" style="font-size:10px;margin-bottom:4px">Sub:${u.sub} Uni:${u.uni} — 512 channels</div>
                    <div class="dmx-channel-grid" style="grid-template-columns:repeat(32,1fr)">${channels}</div>
                </div>
            </div>
        `;
    },

    onActivate() {},
};
