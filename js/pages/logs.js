/**
 * Event Log Page — Shows all application and WebSocket callback events
 */
const LogsPage = {
    _filter: 'ALL',
    _autoScroll: true,

    render() {
        return `
            <div class="section-header">
                <h2><i class="fas fa-terminal"></i> Event Log</h2>
                <div class="flex gap-sm">
                    <button class="btn btn-sm btn-danger" onclick="LogsPage.clearLogs()"><i class="fas fa-trash"></i> Clear</button>
                    <div class="form-inline">
                        <span style="font-size:11px">Auto-scroll</span>
                        ${UI.toggle('log-autoscroll', this._autoScroll, "LogsPage._autoScroll=this.checked")}
                    </div>
                </div>
            </div>

            <div class="log-controls">
                <div class="filter-group">
                    ${['ALL','INFO','WARN','ERROR','EVENT','DEBUG'].map(f =>
                        `<button class="filter-btn ${this._filter === f ? 'active' : ''}" onclick="LogsPage.setFilter('${f}')">${f}</button>`
                    ).join('')}
                </div>
                <div class="search-box" style="max-width:240px">
                    <i class="fas fa-search"></i>
                    <input class="form-control" id="log-search" placeholder="Filter logs..." oninput="LogsPage.updateView()">
                </div>
            </div>

            <div class="log-viewer" id="log-viewer">
                ${this._renderLogs()}
            </div>
        `;
    },

    _renderLogs() {
        let logs = appState.get('logs');
        if (this._filter !== 'ALL') {
            logs = logs.filter(l => l.level === this._filter);
        }

        const search = document.getElementById('log-search')?.value?.toLowerCase() || '';
        if (search) {
            logs = logs.filter(l => l.msg.toLowerCase().includes(search) || l.source.toLowerCase().includes(search));
        }

        if (logs.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px">No log entries</div>';
        }

        return logs.map(l => `
            <div class="log-line">
                <span class="log-time">${UI.formatTimestamp(l.ts)}</span>
                <span class="log-level ${l.level}">${l.level}</span>
                <span class="log-source">${UI.esc(l.source)}</span>
                <span class="log-msg">${UI.esc(l.msg)}</span>
            </div>
        `).join('');
    },

    setFilter(f) {
        this._filter = f;
        this.updateView();
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.textContent === f));
    },

    updateView() {
        const viewer = document.getElementById('log-viewer');
        if (viewer) {
            viewer.innerHTML = this._renderLogs();
            if (this._autoScroll) viewer.scrollTop = 0;
        }
    },

    clearLogs() {
        appState.set('logs', []);
        appState._save('luxor_event_logs', []);
        this.updateView();
        UI.toast('Logs cleared', 'info');
    },

    onActivate() {
        // Subscribe to state changes for live updates
        this._unsub = appState.on('logs', () => {
            if (appState.get('currentPage') === 'logs') this.updateView();
        });
    },

    onDeactivate() {
        if (this._unsub) this._unsub();
    },
};
