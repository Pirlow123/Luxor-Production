/**
 * Sync & Cluster Page — Multi-server sync and media distribution
 * Uses: GET /media/sync
 */
const SyncPage = {
    render() {
        const servers = appState.get('servers');
        const statuses = appState.get('serverStatuses');
        const connected = appState.get('connected');

        return `
            <div class="section-header">
                <h2><i class="fas fa-sync-alt"></i> Sync & Cluster</h2>
                <div class="flex gap-sm">
                    ${connected ? `<button class="btn btn-sm btn-accent" onclick="SyncPage.triggerSync()"><i class="fas fa-sync-alt"></i> Sync Media Now</button>` : ''}
                </div>
            </div>

            <!-- Cluster Overview -->
            <div class="cluster-grid">
                ${servers.map(s => {
                    const st = statuses[s.id];
                    const online = st?.online;
                    return `
                        <div class="server-node ${online ? 'online' : 'offline'}">
                            <div class="server-node-header">
                                <div class="server-node-icon"><i class="fas fa-server"></i></div>
                                <div class="server-node-title">
                                    <div class="server-node-name">${UI.esc(s.name)}</div>
                                    <div class="server-node-ip">${UI.esc(s.host)}:${s.port}</div>
                                </div>
                            </div>
                            <div style="text-align:center;padding:4px">
                                ${online ? UI.badge('ONLINE', 'green') : UI.badge('OFFLINE', 'red')}
                            </div>
                        </div>
                    `;
                }).join('')}
                ${servers.length === 0 ? UI.empty('fa-server', 'No Servers', 'Add servers to build a cluster') : ''}
            </div>

            <!-- HippoNet Config Summary -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-project-diagram"></i> HippoNet Status</h3>
                </div>
                <div class="card-body">
                    ${this._hipponetSummary()}
                </div>
            </div>

            <!-- Sync Operations -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-exchange-alt"></i> Sync Operations</h3>
                </div>
                <div class="card-body">
                    <p style="color:var(--text-secondary);font-size:12px;margin-bottom:12px">
                        Trigger media sync to push all media files from the active server to all other Hippotizer nodes on the HippoNet network.
                    </p>
                    <div class="flex gap-sm">
                        <button class="btn btn-primary" onclick="SyncPage.triggerSync()" ${!connected ? 'disabled' : ''}>
                            <i class="fas fa-cloud-upload-alt"></i> Sync Media to All Nodes
                        </button>
                        <button class="btn" onclick="StatusPage.refreshAll()"><i class="fas fa-sync-alt"></i> Refresh Status</button>
                    </div>
                    <div id="sync-log" class="mt-md"></div>
                </div>
            </div>
        `;
    },

    _hipponetSummary() {
        const cfg = appState.get('networkConfig');
        const hn = cfg.hipponet;
        return `
            <table>
                <tr><td class="text-muted">Enabled</td><td>${hn.enabled ? UI.badge('YES', 'green') : UI.badge('NO', 'red')}</td></tr>
                <tr><td class="text-muted">Port</td><td class="mono">${hn.port}</td></tr>
                <tr><td class="text-muted">Max Nodes</td><td>${hn.maxNodes}</td></tr>
                <tr><td class="text-muted">Master IP</td><td class="mono">${hn.masterIp || 'Auto-elect'}</td></tr>
                <tr><td class="text-muted">Discovery</td><td>${hn.discovery ? 'Enabled' : 'Disabled'}</td></tr>
                <tr><td class="text-muted">Sync</td><td>${hn.syncEnabled ? 'Enabled' : 'Disabled'}</td></tr>
                <tr><td class="text-muted">Heartbeat</td><td>${hn.heartbeat}s</td></tr>
                <tr><td class="text-muted">Timeout</td><td>${hn.timeout}s</td></tr>
            </table>
        `;
    },

    async triggerSync() {
        try {
            await hippoAPI.syncMedia();
            UI.toast('Media sync triggered successfully', 'success');
            appState.log('INFO', 'Media sync triggered to network', 'Sync');
            const log = document.getElementById('sync-log');
            if (log) log.innerHTML = `<div class="badge badge-green" style="font-size:12px;padding:6px 10px"><i class="fas fa-check"></i> Sync initiated at ${new Date().toLocaleTimeString()}</div>`;
        } catch(e) {
            UI.toast(`Sync failed: ${e.message}`, 'error');
        }
    },

    onActivate() {},
};
