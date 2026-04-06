/**
 * Dashboard Page — UniFi-style overview homepage + server-specific dashboards
 */
const DashboardPage = {
    render() {
        const info = appState.get('serverInfo');
        const connected = appState.get('connected');

        if (!connected) {
            return this._renderHomeDashboard();
        }

        const serverType = appState.get('serverType');
        const isResolume = serverType === 'resolume';

        const engineStatus = info?.engineStatus || 'Unknown';
        const mediaStatus = info?.mediaManagerStatus || 'Unknown';
        const product = info?.product || (isResolume ? 'Resolume Arena' : 'Hippotizer');
        const version = info?.softwareVersion || '--';
        const hostname = info?.computerName || info?.hostName || '--';
        const ip = info?.iP || '--';

        // vMix dashboard
        if (serverType === 'vmix') {
            const vs = appState.get('vmixState');
            const inputCount = vs?.inputs?.length || 0;
            const activeInput = vs?.inputs?.find(i => i.number === vs?.activeInput);
            const previewInput = vs?.inputs?.find(i => i.number === vs?.previewInput);
            return `
                <div class="dashboard-stats">
                    ${UI.statCard('fa-video', 'blue', 'Server', this._statusBadge(engineStatus), product)}
                    ${UI.statCard('fa-tv', 'accent', 'Active', activeInput?.title || '--', 'Program output')}
                    ${UI.statCard('fa-eye', 'purple', 'Preview', previewInput?.title || '--', 'Preview output')}
                    ${UI.statCard('fa-th-list', 'orange', 'Inputs', inputCount, 'Total inputs')}
                </div>
                <div class="dashboard-panels">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                            <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('showrun')"><i class="fas fa-theater-masks"></i> Open Show Run</button>
                        </div>
                        <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                            <button class="btn btn-primary" onclick="HippoApp.vmixDashAction('cut')" title="Cut to Preview"><i class="fas fa-cut"></i> CUT</button>
                            <button class="btn btn-secondary" onclick="HippoApp.vmixDashAction('fade')" title="Fade Transition"><i class="fas fa-wave-square"></i> FADE</button>
                            <button class="btn ${vs?.fadeToBlack ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.vmixDashAction('ftb')" title="Fade to Black">
                                <i class="fas fa-moon"></i> FTB ${vs?.fadeToBlack ? '(ON)' : ''}
                            </button>
                            <div style="width:1px;height:28px;background:var(--border);margin:0 4px;"></div>
                            <button class="btn ${vs?.recording ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.vmixDashAction('record')" title="Toggle Recording">
                                <i class="fas fa-circle"></i> ${vs?.recording ? 'STOP REC' : 'REC'}
                            </button>
                            <button class="btn ${vs?.streaming ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.vmixDashAction('stream')" title="Toggle Stream">
                                <i class="fas fa-broadcast-tower"></i> ${vs?.streaming ? 'STOP STREAM' : 'STREAM'}
                            </button>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3><i class="fas fa-list"></i> Inputs</h3></div>
                        <div class="card-body">
                            <table>
                                <thead><tr><th>#</th><th>Name</th><th>Type</th><th>State</th><th>Audio</th><th>Actions</th></tr></thead>
                                <tbody>
                                ${(vs?.inputs || []).map(inp => `<tr>
                                    <td class="mono">${inp.number}</td>
                                    <td><strong>${UI.esc(inp.title)}</strong> ${inp.number === vs?.activeInput ? '<span style="color:#4ade80;font-size:9px;font-weight:700"> PGM</span>' : ''} ${inp.number === vs?.previewInput ? '<span style="color:#facc15;font-size:9px;font-weight:700"> PVW</span>' : ''}</td>
                                    <td class="text-muted">${inp.type || '--'}</td>
                                    <td>${inp.state === 'Running' ? UI.badge('Running', 'green') : UI.badge(inp.state || 'Idle', 'orange')}</td>
                                    <td>${inp.muted ? '<i class="fas fa-volume-mute text-muted"></i>' : '<i class="fas fa-volume-up" style="color:var(--accent)"></i>'} <span class="mono">${inp.volume ?? 100}%</span></td>
                                    <td style="display:flex;gap:3px;">
                                        <button class="tl-transport play" onclick="HippoApp.vmixDashAction('pgm',${inp.number})" title="Send to Program"><i class="fas fa-tv"></i></button>
                                        <button class="tl-transport" onclick="HippoApp.vmixDashAction('pvw',${inp.number})" title="Send to Preview"><i class="fas fa-eye"></i></button>
                                    </td>
                                </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="card mt-md">
                    <div class="card-header"><h3><i class="fas fa-info-circle"></i> Server Info</h3></div>
                    <div class="card-body">
                        <table>
                            <tr><td class="text-muted">Product</td><td>vMix ${vs?.edition || ''}</td></tr>
                            <tr><td class="text-muted">Version</td><td class="mono">${UI.esc(vs?.version || version)}</td></tr>
                            <tr><td class="text-muted">Host</td><td class="mono">${UI.esc(hostname)}</td></tr>
                            <tr><td class="text-muted">Recording</td><td>${vs?.recording ? UI.badge('Recording', 'red') : UI.badge('Stopped', 'orange')}</td></tr>
                            <tr><td class="text-muted">Streaming</td><td>${vs?.streaming ? UI.badge('Live', 'red') : UI.badge('Offline', 'orange')}</td></tr>
                            <tr><td class="text-muted">FTB</td><td>${vs?.fadeToBlack ? UI.badge('Active', 'red') : UI.badge('Off', 'green')}</td></tr>
                            <tr><td class="text-muted">Transition</td><td>${vs?.transition?.effect || 'Fade'} (${vs?.transition?.duration || 1000}ms)</td></tr>
                        </table>
                    </div>
                </div>`;
        }

        // CasparCG dashboard
        if (serverType === 'casparcg') {
            const channels = appState.get('casparcgChannels') || [];
            const media = appState.get('casparcgMedia') || [];
            const activeLayers = channels.reduce((sum, ch) => sum + (ch.layers || []).filter(l => l.clip && l.playing).length, 0);
            return `
                <div class="dashboard-stats">
                    ${UI.statCard('fa-play-circle', 'orange', 'Server', this._statusBadge(engineStatus), product)}
                    ${UI.statCard('fa-tv', 'accent', 'Channels', channels.length, `${activeLayers} active layers`)}
                    ${UI.statCard('fa-film', 'blue', 'Media', media.length, 'Available clips')}
                    ${UI.statCard('fa-code', 'purple', 'Version', version, hostname)}
                </div>
                <div class="dashboard-panels">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                            <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('showrun')"><i class="fas fa-theater-masks"></i> Open Show Run</button>
                        </div>
                        <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button class="btn btn-danger" onclick="HippoApp.casparcgDashAction('clearAll')" title="Clear all channels"><i class="fas fa-trash"></i> CLEAR ALL</button>
                            ${channels.map((ch, i) => `
                                <button class="btn btn-secondary" onclick="HippoApp.casparcgDashAction('clearChannel',${ch.id || i+1})" title="Clear Channel ${ch.id || i+1}">
                                    <i class="fas fa-times"></i> Clear Ch${ch.id || i+1}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3><i class="fas fa-tv"></i> Channels</h3></div>
                        <div class="card-body">
                            ${channels.map((ch, i) => `
                                <div style="margin-bottom:16px;padding-bottom:12px;${i < channels.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}">
                                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                                        <div style="font-weight:700;font-size:13px;">
                                            <i class="fas fa-tv" style="color:var(--accent);margin-right:4px;"></i>
                                            Channel ${ch.id || i+1}
                                            <span class="mono text-muted" style="font-size:10px;margin-left:4px;">${ch.format || '1080i5000'}</span>
                                        </div>
                                        <span style="font-size:10px;color:var(--text-muted);">${(ch.layers || []).filter(l => l.clip).length} active layers</span>
                                    </div>
                                    <table style="font-size:11px;">
                                        ${(ch.layers || []).filter(l => l.clip).map(l => `<tr>
                                            <td class="text-muted" style="width:60px">Layer ${l.id || l.layer}</td>
                                            <td><strong>${UI.esc(l.clip)}</strong></td>
                                            <td>${l.playing ? UI.badge('Playing', 'green') : UI.badge('Stopped', 'orange')}</td>
                                            <td class="mono">${Math.round((l.opacity ?? 1) * 100)}%</td>
                                            <td style="display:flex;gap:3px;">
                                                <button class="tl-transport ${l.playing ? '' : 'play'}" onclick="HippoApp.casparcgDashAction('${l.playing ? 'stop' : 'play'}',${ch.id || i+1},${l.id || l.layer})" title="${l.playing ? 'Stop' : 'Resume'}">
                                                    <i class="fas fa-${l.playing ? 'stop' : 'play'}"></i>
                                                </button>
                                                <button class="tl-transport stop" onclick="HippoApp.casparcgDashAction('clear',${ch.id || i+1},${l.id || l.layer})" title="Clear Layer">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </td>
                                        </tr>`).join('') || '<tr><td class="text-muted" colspan="5">No active layers</td></tr>'}
                                    </table>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="card mt-md">
                    <div class="card-header"><h3><i class="fas fa-info-circle"></i> Server Info</h3></div>
                    <div class="card-body">
                        <table>
                            <tr><td class="text-muted">Product</td><td>CasparCG Server</td></tr>
                            <tr><td class="text-muted">Version</td><td class="mono">${UI.esc(version)}</td></tr>
                            <tr><td class="text-muted">Host</td><td class="mono">${UI.esc(hostname)}</td></tr>
                            <tr><td class="text-muted">Channels</td><td>${channels.length}</td></tr>
                            <tr><td class="text-muted">Media Files</td><td>${media.length}</td></tr>
                        </table>
                    </div>
                </div>`;
        }

        // OBS dashboard
        if (serverType === 'obs') {
            const scenes = appState.get('obsScenes') || [];
            const currentScene = appState.get('obsCurrentScene') || '--';
            const previewScene = appState.get('obsPreviewScene') || '--';
            const rawInputs = appState.get('obsInputs') || [];
            const inputs = Array.isArray(rawInputs) ? rawInputs : (rawInputs.inputs || []);
            const streamStatus = appState.get('obsStreamStatus');
            return `
                <div class="dashboard-stats">
                    ${UI.statCard('fa-broadcast-tower', 'green', 'Server', this._statusBadge(engineStatus), product)}
                    ${UI.statCard('fa-camera', 'accent', 'Program', currentScene, 'Active scene')}
                    ${UI.statCard('fa-eye', 'purple', 'Preview', previewScene, 'Preview scene')}
                    ${UI.statCard('fa-th-list', 'blue', 'Scenes', scenes.length, `${inputs.length} sources`)}
                </div>
                <div class="dashboard-panels">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                            <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('showrun')"><i class="fas fa-theater-masks"></i> Open Show Run</button>
                        </div>
                        <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                            <button class="btn btn-primary" onclick="HippoApp.obsDashAction('transition')" title="Transition Preview to Program"><i class="fas fa-exchange-alt"></i> TRANSITION</button>
                            <div style="width:1px;height:28px;background:var(--border);margin:0 4px;"></div>
                            <button class="btn ${streamStatus?.streaming ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.obsDashAction('stream')" title="Toggle Stream">
                                <i class="fas fa-broadcast-tower"></i> ${streamStatus?.streaming ? 'STOP STREAM' : 'GO LIVE'}
                            </button>
                            <button class="btn ${streamStatus?.recording ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.obsDashAction('record')" title="Toggle Recording">
                                <i class="fas fa-circle"></i> ${streamStatus?.recording ? 'STOP REC' : 'REC'}
                            </button>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3><i class="fas fa-th-list"></i> Scenes <span class="text-muted" style="font-size:10px;font-weight:400;">Click to switch</span></h3></div>
                        <div class="card-body">
                            ${scenes.map(s => {
                                const name = s.sceneName || s;
                                const isPgm = name === currentScene;
                                const isPvw = name === previewScene;
                                return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;border-radius:6px;border:1px solid ${isPgm ? 'rgba(74,222,128,0.3)' : isPvw ? 'rgba(250,204,21,0.2)' : 'var(--border)'};background:${isPgm ? 'rgba(74,222,128,0.06)' : isPvw ? 'rgba(250,204,21,0.04)' : 'var(--bg-secondary)'};cursor:pointer;transition:all 0.12s;" onclick="HippoApp.obsDashAction('scene','${UI.esc(name)}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='${isPgm ? 'rgba(74,222,128,0.3)' : isPvw ? 'rgba(250,204,21,0.2)' : 'var(--border)'}'" title="Click to set as Program">
                                    <span style="font-size:12px;font-weight:${isPgm ? '800' : '500'};color:${isPgm ? '#4ade80' : isPvw ? '#facc15' : 'var(--text-primary)'};">${UI.esc(name)}</span>
                                    ${isPgm ? '<span style="margin-left:auto;font-size:9px;font-weight:700;color:#4ade80;background:rgba(34,197,94,0.15);padding:2px 6px;border-radius:4px;">PGM</span>' : ''}
                                    ${isPvw ? '<span style="margin-left:auto;font-size:9px;font-weight:700;color:#facc15;background:rgba(250,204,21,0.15);padding:2px 6px;border-radius:4px;">PVW</span>' : ''}
                                    ${!isPgm && !isPvw ? '<span style="margin-left:auto;"><button class="tl-transport play" onclick="event.stopPropagation();HippoApp.obsDashAction(\'preview\',\'' + UI.esc(name) + '\')" title="Set as Preview"><i class="fas fa-eye"></i></button></span>' : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
                <div class="card mt-md">
                    <div class="card-header"><h3><i class="fas fa-info-circle"></i> Server Info</h3></div>
                    <div class="card-body">
                        <table>
                            <tr><td class="text-muted">Product</td><td>OBS Studio</td></tr>
                            <tr><td class="text-muted">Version</td><td class="mono">${UI.esc(version)}</td></tr>
                            <tr><td class="text-muted">Platform</td><td class="mono">${UI.esc(info?.platform || '--')}</td></tr>
                            <tr><td class="text-muted">Host</td><td class="mono">${UI.esc(hostname)}</td></tr>
                            <tr><td class="text-muted">Streaming</td><td>${streamStatus?.streaming ? UI.badge('Live', 'red') : UI.badge('Offline', 'orange')}</td></tr>
                            <tr><td class="text-muted">Recording</td><td>${streamStatus?.recording ? UI.badge('Recording', 'red') : UI.badge('Stopped', 'orange')}</td></tr>
                            <tr><td class="text-muted">Scenes</td><td>${scenes.length}</td></tr>
                            <tr><td class="text-muted">Sources</td><td>${inputs.length}</td></tr>
                        </table>
                    </div>
                </div>`;
        }

        // Barco E2 dashboard
        if (serverType === 'barco') return this._renderBarcoDash();

        // QLab dashboard
        if (serverType === 'qlab') return this._renderQlabDash();

        // Disguise dashboard
        if (serverType === 'disguise') return this._renderDisguiseDash();

        // Pixera dashboard
        if (serverType === 'pixera') return this._renderPixeraDash();

        // Blackmagic ATEM dashboard
        if (serverType === 'atem') return this._renderAtemDash();

        if (isResolume) {
            const comp = appState.get('composition');
            const layerCount = comp?.layers?.length || 0;
            const colCount = comp?.columns?.length || 0;
            const clipCount = (comp?.layers || []).reduce((sum, l) => sum + (l.clips || []).filter(c => c._hasContent).length, 0);

            return `
                <div class="dashboard-stats">
                    ${UI.statCard('fa-film', 'purple', 'Server', this._statusBadge(engineStatus), product)}
                    ${UI.statCard('fa-layer-group', 'accent', 'Layers', layerCount, (comp?.layers || []).map(l => l.name?.value).filter(Boolean).join(', ') || 'None')}
                    ${UI.statCard('fa-th', 'blue', 'Clips', clipCount, `${colCount} columns`)}
                    ${UI.statCard('fa-music', 'orange', 'BPM', comp?.tempocontroller?.tempo?.value || '--', 'Tempo controller')}
                </div>

                <div class="dashboard-panels">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                            <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('composition')"><i class="fas fa-th"></i> Open Composition</button>
                        </div>
                        <div class="card-body">
                            <div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Trigger Column</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
                                ${(comp?.columns || []).slice(0, 16).map((col, i) => `
                                    <button class="btn btn-xs ${col.connected?.value === 'Connected' ? 'btn-primary' : 'btn-secondary'}" onclick="HippoApp.resolumeDashAction('column',${i+1})" title="Trigger Column ${i+1}" style="min-width:36px;">
                                        ${i+1}
                                    </button>
                                `).join('')}
                            </div>
                            <div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Layers</div>
                            ${(comp?.layers || []).map((l, i) => {
                                const activeClip = (l.clips || []).find(c => c.connected?.value === 'Connected');
                                const opacity = Math.round((l.master?.value ?? 1) * 100);
                                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:4px;border-radius:6px;border:1px solid var(--border);background:var(--bg-secondary);">
                                    <span style="font-size:11px;font-weight:600;min-width:80px;color:var(--text-primary);">${UI.esc(l.name?.value || 'Layer ' + (i+1))}</span>
                                    <span style="font-size:11px;color:${activeClip ? 'var(--accent)' : 'var(--text-muted)'};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${activeClip ? UI.esc(activeClip.name?.value) : '—'}</span>
                                    <span class="mono" style="font-size:10px;color:var(--text-secondary);min-width:32px;text-align:right;">${opacity}%</span>
                                    <button class="tl-transport stop" onclick="HippoApp.resolumeDashAction('clearLayer',${i+1})" title="Clear Layer"><i class="fas fa-times"></i></button>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-info-circle"></i> Server Info</h3>
                        </div>
                        <div class="card-body">
                            <table>
                                <tr><td class="text-muted">Product</td><td>${UI.esc(product)}</td></tr>
                                <tr><td class="text-muted">Version</td><td><span class="mono">${UI.esc(version)}</span></td></tr>
                                <tr><td class="text-muted">Host</td><td><span class="mono">${UI.esc(hostname)}</span></td></tr>
                                <tr><td class="text-muted">IP</td><td><span class="mono">${UI.esc(ip)}</span></td></tr>
                                <tr><td class="text-muted">Status</td><td>${this._statusBadge(engineStatus)}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        const mixes = info?.mixes || [];

        const timelines = appState.get('timelines');
        const tlCount = Array.isArray(timelines) ? timelines.length : 0;

        return `
            <!-- Stats row -->
            <div class="dashboard-stats">
                ${UI.statCard('fa-server', 'accent', 'Engine', this._statusBadge(engineStatus), hostname)}
                ${UI.statCard('fa-database', 'blue', 'Media Manager', this._statusBadge(mediaStatus), `${product} ${version}`)}
                ${UI.statCard('fa-layer-group', 'purple', 'Mixes', mixes.length, mixes.map(m => m.name || `Mix ${m.index}`).join(', ') || 'None')}
                ${UI.statCard('fa-stream', 'orange', 'Timelines', tlCount, 'Total configured')}
            </div>

            <div class="card" style="margin-bottom:12px;">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                    <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('showrun')"><i class="fas fa-theater-masks"></i> Open Show Run</button>
                </div>
                <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <button class="btn btn-primary" onclick="HippoApp.playAll()" title="Play All Timelines"><i class="fas fa-play"></i> PLAY ALL</button>
                    <button class="btn btn-secondary" onclick="HippoApp.stopAll()" title="Stop All Timelines"><i class="fas fa-stop"></i> STOP ALL</button>
                    <button class="btn btn-secondary" onclick="HippoApp.resetAll()" title="Reset All Timelines"><i class="fas fa-backward-step"></i> RESET ALL</button>
                </div>
            </div>

            <div class="dashboard-panels">
                <!-- Timelines Quick View -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-stream"></i> Timelines</h3>
                        <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('timelines')">View All</button>
                    </div>
                    <div class="card-body" id="dash-timelines">
                        ${this._renderTimelines(timelines)}
                    </div>
                </div>

                <!-- Server Info -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-info-circle"></i> Server Info</h3>
                    </div>
                    <div class="card-body">
                        <table>
                            <tr><td class="text-muted">Product</td><td>${UI.esc(info?.product || '--')}</td></tr>
                            <tr><td class="text-muted">Family</td><td>${UI.esc(info?.productFamily || '--')}</td></tr>
                            <tr><td class="text-muted">Version</td><td><span class="mono">${UI.esc(info?.softwareVersion || '--')}</span></td></tr>
                            <tr><td class="text-muted">Revision</td><td><span class="mono">${UI.esc(info?.softwareRevision || '--')}</span></td></tr>
                            <tr><td class="text-muted">Hostname</td><td><span class="mono">${UI.esc(info?.computerName || '--')}</span></td></tr>
                            <tr><td class="text-muted">Host</td><td><span class="mono">${UI.esc(info?.hostName || '--')}</span></td></tr>
                            <tr><td class="text-muted">IP</td><td><span class="mono">${UI.esc(info?.iP || '--')}</span></td></tr>
                            <tr><td class="text-muted">Owner</td><td>${UI.esc(info?.registeredOwner || '--')}</td></tr>
                            <tr><td class="text-muted">Engine</td><td>${this._statusBadge(engineStatus)}</td></tr>
                            <tr><td class="text-muted">Media Mgr</td><td>${this._statusBadge(mediaStatus)}</td></tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Mixes Quick View -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-sliders-h"></i> Mix Overview</h3>
                    <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('mixes')">Open Mixer</button>
                </div>
                <div class="card-body" id="dash-mixes">
                    ${this._renderMixes(mixes)}
                </div>
            </div>
        `;
    },

    _statusBadge(status) {
        if (!status) return UI.badge('Unknown', 'orange');
        const s = status.toLowerCase();
        if (s === 'running' || s === 'ok' || s === 'started' || s === 'ready') return UI.badge(status, 'green');
        if (s === 'stopped' || s === 'error' || s === 'failed') return UI.badge(status, 'red');
        return UI.badge(status, 'orange');
    },

    _renderTimelines(timelines) {
        if (!Array.isArray(timelines) || timelines.length === 0) {
            return UI.empty('fa-stream', 'No Timelines', 'No timelines found on this server');
        }
        return timelines.slice(0, 8).map(tl => `
            <div class="tl-item">
                <div class="tl-index">${tl.iD}</div>
                <div class="tl-info">
                    <div class="tl-name">${UI.esc(tl.name || `Timeline ${tl.iD}`)}</div>
                    <div class="tl-meta">
                        <span>${UI.formatDuration(tl.endTimeSecs)}</span>
                        <span>${(tl.commands || []).length} cues</span>
                    </div>
                </div>
                <div class="tl-controls">
                    <button class="tl-transport play" onclick="HippoApp.tlPlay(${tl.iD})" title="Play"><i class="fas fa-play"></i></button>
                    <button class="tl-transport stop" onclick="HippoApp.tlStop(${tl.iD})" title="Stop"><i class="fas fa-stop"></i></button>
                    <button class="tl-transport" onclick="HippoApp.tlReset(${tl.iD})" title="Reset"><i class="fas fa-backward-step"></i></button>
                </div>
            </div>
        `).join('');
    },

    _renderMixes(mixes) {
        if (!mixes || mixes.length === 0) return UI.empty('fa-sliders-h', 'No Mixes', 'No mix configuration found');
        return mixes.map(m => `
            <div class="layer-row" style="margin-bottom:6px">
                <span class="layer-idx">${m.index}</span>
                <span style="font-size:12px;font-weight:600;min-width:100px">${UI.esc(m.name || `Mix ${m.index}`)}</span>
                <span class="text-muted" style="font-size:11px">${m.mixType || '--'}</span>
                <span class="text-muted" style="font-size:11px">${m.layerCount || 0} layers</span>
                <div id="dash-mix-level-${m.index}" style="flex:1">${UI.levelBar(appState.get('mixLevels')[m.index] ?? 0)}</div>
            </div>
        `).join('');
    },

    /* ── Home Dashboard — category card grid with device info ── */
    _renderHomeDashboard() {
        const servers = appState.get('servers') || [];
        const statuses = appState.get('serverStatuses') || {};

        // Load all device lists from localStorage (merge real + virtual)
        const _load = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
        const ledProcs = _load('luxor_led_processors');
        const ptzCams = [..._load('luxor_ptz_cameras'), ..._load('luxor_ptz_cameras_virtual')];
        const netSwitches = [..._load('luxor_net_switches'), ..._load('luxor_net_switches_virtual')];
        const lightConsoles = [..._load('luxor_lighting_consoles'), ..._load('luxor_lighting_consoles_virtual')];
        const intercoms = [..._load('luxor_intercom_systems'), ..._load('luxor_intercom_systems_virtual')];

        const typeLabel = (t) => ({ hippo: 'Hippotizer', resolume: 'Resolume', vmix: 'vMix', casparcg: 'CasparCG', obs: 'OBS', barco: 'Barco E2', qlab: 'QLab', disguise: 'Disguise', pixera: 'Pixera', atem: 'ATEM' }[t] || t);

        // Color-coding helpers: green=good, yellow=warn, orange=high, red=critical
        const _tempColor = (v) => { if (v == null) return ''; if (v < 45) return 'text-green'; if (v < 60) return 'text-yellow'; if (v < 75) return 'text-orange'; return 'text-red'; };
        const _cpuColor = (v) => { if (v == null) return ''; if (v < 50) return 'text-green'; if (v < 75) return 'text-yellow'; if (v < 90) return 'text-orange'; return 'text-red'; };
        const _memColor = (v) => { if (v == null) return ''; if (v < 60) return 'text-green'; if (v < 80) return 'text-yellow'; if (v < 90) return 'text-orange'; return 'text-red'; };
        const _powerColor = (v) => { if (v == null) return ''; if (v < 100) return 'text-green'; if (v < 200) return 'text-yellow'; if (v < 300) return 'text-orange'; return 'text-red'; };
        const _fanColor = (v) => { if (v == null) return ''; if (v < 3000) return 'text-green'; if (v < 5000) return 'text-yellow'; if (v < 7000) return 'text-orange'; return 'text-red'; };
        const _dectColor = (v) => { if (!v) return ''; if (v === 'OK') return 'text-green'; if (v === 'Warning') return 'text-yellow'; return 'text-red'; };
        const _gmColor = (v) => { if (v == null) return ''; if (v >= 90) return 'text-green'; if (v >= 50) return 'text-yellow'; if (v >= 20) return 'text-orange'; return 'text-red'; };

        // Helper: build a stat cell
        const _stat = (label, value, colorClass) => `<div class="dash-stat"><span class="dash-stat-label">${label}</span><span class="dash-stat-value ${colorClass || ''}">${value}</span></div>`;

        // Helper: build a device card
        const _devCard = (name, ip, online, onclick, statsHtml) => `
            <div class="dash-device-card" onclick="${onclick}">
                <div class="dash-device-top">
                    <span class="dash-status-dot ${online ? 'online' : 'offline'}"></span>
                    <span class="dash-device-name">${UI.esc(name)}</span>
                    <span class="dash-device-ip">${UI.esc(ip)}</span>
                </div>
                <div class="dash-stats-grid">${statsHtml}</div>
            </div>`;

        // Build server items
        const serverItems = servers.map(s => {
            const info = statuses[s.id]?.info || {};
            const online = statuses[s.id]?.online;
            const ip = s.virtual ? 'Virtual' : `${s.host}:${s.port}`;
            const engine = info.engineStatus || (online ? 'Running' : '--');
            const system = info.mediaManagerStatus || '--';
            const firmware = info.softwareVersion || info.version || info.firmware || '--';
            const stats = _stat('Engine', engine, engine === 'Running' ? 'text-green' : engine === '--' ? '' : 'text-red')
                + _stat('System', system, system === 'Running' ? 'text-green' : system === '--' ? '' : 'text-red')
                + _stat('Type', typeLabel(s.type))
                + _stat('Firmware', firmware);
            return _devCard(s.name, ip, online, `HippoApp.connectToServer('${s.id}')`, stats);
        }).join('');

        // Build LED processor items
        const procItems = ledProcs.map(p => {
            const online = p.online || p.virtual;
            const ip = p.virtual ? 'Virtual' : (p.host + ':' + p.port);
            const stats = _stat('Resolution', p._resolution || '--')
                + _stat('Input', p._activeInput || '--')
                + _stat('Status', online ? 'Online' : 'Offline', online ? 'text-green' : 'text-red')
                + (p._firmware ? _stat('Firmware', p._firmware) : '');
            return _devCard(p.name, ip, online, `HippoApp.navigate('ledprocessor')`, stats);
        }).join('');

        // Build PTZ items
        const ptzItems = ptzCams.map(c => {
            const online = c.connected || c.virtual;
            const ip = c.virtual ? 'Virtual' : (c.host || '--');
            const stats = _stat('Model', c.model || c.type || '--')
                + _stat('Status', online ? 'Online' : 'Offline', online ? 'text-green' : 'text-red');
            return _devCard(c.name, ip, online, `HippoApp.navigate('ptz')`, stats);
        }).join('');

        // Build net switch items
        const _fmtUptime = (sec) => { if (!sec) return '--'; const d = Math.floor(sec/86400); const h = Math.floor((sec%86400)/3600); return `${d}d ${h}h`; };
        const switchItems = netSwitches.map(s => {
            const online = s.connected || s.virtual;
            const st = s.status || {}; const sys = st.system || {}; const info = st.info || {};
            const ip = s.virtual ? 'Virtual' : (s.ip || s.host || '--');
            const stats = _stat('Temp', sys.temperature ? sys.temperature + '°C' : '--', _tempColor(sys.temperature))
                + _stat('Fan', sys.fanSpeed ? sys.fanSpeed + ' RPM' : '--', _fanColor(sys.fanSpeed))
                + _stat('CPU', sys.cpu !== undefined ? sys.cpu + '%' : '--', _cpuColor(sys.cpu))
                + _stat('Memory', sys.memory !== undefined ? sys.memory + '%' : '--', _memColor(sys.memory))
                + _stat('Power', sys.powerDraw ? sys.powerDraw + 'W' : '--', _powerColor(sys.powerDraw))
                + _stat('Uptime', info.uptime ? _fmtUptime(info.uptime) : '--', 'text-green');
            return _devCard(s.name, ip, online, `HippoApp.navigate('netswitch')`, stats);
        }).join('');

        // Build lighting items
        const lightItems = lightConsoles.map(c => {
            const online = c.connected || c.virtual;
            const st = c.status || {};
            const session = st.session; const gm = st.grandmaster;
            const activeExecs = (st.executors || []).filter(e => e.active).length;
            const totalExecs = (st.executors || []).length;
            const ip = c.virtual ? 'Virtual' : (c.ip || c.host || '--');
            let stats = _stat('Model', c.model || c.type || '--');
            if (session) stats += _stat('Showfile', session.showFile || '--', 'text-green');
            if (gm !== undefined) stats += _stat('Grand Master', gm + '%', _gmColor(gm));
            if (totalExecs) stats += _stat('Executors', activeExecs + '/' + totalExecs, 'text-green');
            return _devCard(c.name, ip, online, `HippoApp.navigate('lighting')`, stats);
        }).join('');

        // Build intercom items
        const intercomItems = intercoms.map(i => {
            const online = i.connected || i.virtual;
            const st = i.status || {}; const sys = st.system || {};
            const beltpacks = st.beltpacks || []; const antennas = st.antennas || []; const channels = st.channels || [];
            const ip = i.virtual ? 'Virtual' : (i.ip || i.host || '--');
            const stats = _stat('Temp', sys.temperature ? sys.temperature + '°C' : '--', _tempColor(sys.temperature))
                + _stat('Beltpacks', beltpacks.length, 'text-green')
                + _stat('Antennas', antennas.length, 'text-green')
                + _stat('Channels', channels.length, 'text-green')
                + _stat('DECT', sys.dectStatus || '--', _dectColor(sys.dectStatus))
                + _stat('Power', sys.powerDraw ? sys.powerDraw + 'W' : '--', _powerColor(sys.powerDraw));
            return _devCard(i.name, ip, online, `HippoApp.navigate('intercom')`, stats);
        }).join('');

        // Category card builder with icon
        const catCard = (icon, title, page, items, count, addAction) => `
            <div class="dash-category-card">
                <div class="dash-cat-header">
                    <div class="dash-cat-header-left">
                        <div class="dash-cat-icon"><i class="fas ${icon}"></i></div>
                        <span class="dash-cat-title">${title}<span class="dash-cat-count"> (${count})</span></span>
                    </div>
                    <button class="btn-inline-add" onclick="event.stopPropagation();${addAction}" title="Add"><i class="fas fa-plus"></i></button>
                </div>
                <div class="dash-cat-body">
                    ${items || '<div class="dash-cat-empty">No devices</div>'}
                </div>
            </div>`;

        return `
            <div class="dash-grid">
                ${catCard('fa-server', 'Media Servers', 'dashboard', serverItems, servers.length, 'HippoApp.showAddServer()')}
                ${catCard('fa-microchip', 'Processors', 'ledprocessor', procItems, ledProcs.length, 'HippoApp.showAddLedProcessor()')}
                ${catCard('fa-network-wired', 'Network', 'netswitch', switchItems, netSwitches.length, 'NetSwitchPage.showAddSwitch()')}
                ${catCard('fa-lightbulb', 'Lighting', 'lighting', lightItems, lightConsoles.length, 'LightingPage.showAddConsole()')}
                ${catCard('fa-headset', 'Intercom', 'intercom', intercomItems, intercoms.length, 'IntercomPage.showAddSystem()')}
                ${catCard('fa-video', 'PTZ Cameras', 'ptz', ptzItems, ptzCams.length, 'PtzPage.showAddCamera()')}
            </div>
        `;
    },

    _renderBarcoDash() {
        const barcoState = appState.get('barcoState') || {};
        const presets = barcoState.presets || [];
        const destinations = barcoState.destinations || [];
        const sources = barcoState.sources || [];
        const activePreset = barcoState.activePreset || '--';
        const previewPreset = barcoState.previewPreset || '--';

        return `
            <div class="dashboard-stats">
                ${UI.statCard('fa-display', 'accent', 'Active Preset', UI.esc(activePreset), 'Program output')}
                ${UI.statCard('fa-eye', 'purple', 'Preview Preset', UI.esc(previewPreset), 'Preview output')}
                ${UI.statCard('fa-desktop', 'blue', 'Destinations', destinations.length, 'Output destinations')}
                ${UI.statCard('fa-photo-video', 'orange', 'Sources', sources.length, 'Input sources')}
            </div>
            <div class="dashboard-panels">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-desktop"></i> Destinations</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>Name</th><th>Size</th><th>Layers</th><th>Freeze</th></tr></thead>
                            <tbody>
                            ${destinations.length ? destinations.map(d => `<tr>
                                <td><strong>${UI.esc(d.name || '--')}</strong></td>
                                <td class="mono">${UI.esc(d.size || '--')}</td>
                                <td class="mono">${d.layers ?? '--'}</td>
                                <td>${d.freeze ? UI.badge('Frozen', 'blue') : UI.badge('Live', 'green')}</td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="4">No destinations</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-photo-video"></i> Sources</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
                            <tbody>
                            ${sources.length ? sources.map(s => `<tr>
                                <td><strong>${UI.esc(s.name || '--')}</strong></td>
                                <td class="text-muted">${UI.esc(s.type || '--')}</td>
                                <td>${s.status === 'active' ? UI.badge('Active', 'green') : UI.badge(s.status || 'Idle', 'orange')}</td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="3">No sources</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-bolt"></i> Quick Actions</h3></div>
                <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="HippoApp.barcoAction('cut')"><i class="fas fa-cut"></i> Cut</button>
                    <button class="btn btn-secondary" onclick="HippoApp.barcoAction('dissolve')"><i class="fas fa-wave-square"></i> Dissolve</button>
                    <button class="btn btn-secondary" onclick="HippoApp.barcoAction('freezeAll')"><i class="fas fa-snowflake"></i> Freeze All</button>
                </div>
            </div>`;
    },

    _renderQlabDash() {
        const qlabState = appState.get('qlabState') || {};
        const cues = qlabState.cues || [];
        const wsId = qlabState.workspaceId || '';
        const wsName = wsId || '--';
        const playbackStatus = qlabState.runningCues?.length ? 'playing' : 'stopped';
        const currentCue = qlabState.currentCueId || '--';
        const masterVolume = qlabState.masterVolume ?? 100;

        const statusColor = playbackStatus === 'playing' ? 'green' : playbackStatus === 'paused' ? 'orange' : 'red';

        // cues already loaded from qlabState.cues above

        const cueTypeBadge = (type) => {
            const t = (type || '').toLowerCase();
            if (t === 'audio') return UI.badge('Audio', 'blue');
            if (t === 'video') return UI.badge('Video', 'purple');
            if (t === 'midi') return UI.badge('MIDI', 'orange');
            if (t === 'osc') return UI.badge('OSC', 'accent');
            if (t === 'group') return UI.badge('Group', 'green');
            if (t === 'fade') return UI.badge('Fade', 'orange');
            if (t === 'network') return UI.badge('Network', 'blue');
            return UI.badge(type || '--', 'orange');
        };

        return `
            <div class="dashboard-stats">
                ${UI.statCard('fa-theater-masks', 'purple', 'Workspace', UI.esc(wsName), wsId ? '1 workspace' : 'No workspace')}
                ${UI.statCard('fa-play-circle', statusColor, 'Playback', UI.badge(playbackStatus.charAt(0).toUpperCase() + playbackStatus.slice(1), statusColor), 'Transport state')}
                ${UI.statCard('fa-list-ol', 'accent', 'Current Cue', UI.esc(currentCue), 'Active cue position')}
                ${UI.statCard('fa-volume-up', 'blue', 'Master Volume', `${masterVolume}%`, 'Output level')}
            </div>
            <div class="dashboard-panels">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Cue List</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Duration</th><th>Armed</th></tr></thead>
                            <tbody>
                            ${cues.length ? cues.slice(0, 50).map(c => `<tr>
                                <td class="mono">${UI.esc(c.number || '--')}</td>
                                <td><strong>${UI.esc(c.name || '--')}</strong></td>
                                <td>${cueTypeBadge(c.type)}</td>
                                <td class="mono">${c.duration ? UI.formatDuration(c.duration) : '--'}</td>
                                <td>${c.armed !== false ? '<i class="fas fa-check" style="color:var(--accent)"></i>' : '<i class="fas fa-minus text-muted"></i>'}</td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="5">No cues</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-gamepad"></i> Transport Controls</h3></div>
                    <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="HippoApp.qlabAction('go')"><i class="fas fa-play"></i> GO</button>
                        <button class="btn btn-secondary" onclick="HippoApp.qlabAction('stop')"><i class="fas fa-stop"></i> Stop</button>
                        <button class="btn btn-secondary" onclick="HippoApp.qlabAction('pause')"><i class="fas fa-pause"></i> Pause</button>
                        <button class="btn btn-secondary" onclick="HippoApp.qlabAction('resume')"><i class="fas fa-play"></i> Resume</button>
                        <button class="btn btn-secondary" style="color:var(--danger)" onclick="HippoApp.qlabAction('panic')"><i class="fas fa-exclamation-triangle"></i> Panic</button>
                    </div>
                </div>
            </div>`;
    },

    _renderDisguiseDash() {
        const dState = appState.get('disguiseState') || {};
        const tracks = dState.tracks || [];
        const transport = dState.transport || {};
        const sections = dState.annotations || [];
        const machines = dState.health || [];
        const outputs = transport.outputs || [];

        const timecode = dState.timecode || '--:--:--:--';
        const playing = dState.isPlaying;
        const speed = transport.speed ?? 1;
        const currentSection = transport.currentSection || '--';

        const transportStatus = playing ? 'Playing' : 'Paused';
        const transportColor = playing ? 'green' : 'orange';

        return `
            <div class="dashboard-stats">
                ${UI.statCard('fa-clock', transportColor, 'Timecode', `<span class="mono">${UI.esc(timecode)}</span>`, transportStatus)}
                ${UI.statCard('fa-play-circle', transportColor, 'Transport', UI.badge(transportStatus, transportColor), `Speed: ${speed}x`)}
                ${UI.statCard('fa-map-marker-alt', 'purple', 'Section', UI.esc(currentSection), 'Current section')}
                ${UI.statCard('fa-server', 'blue', 'Machines', machines.length, `${tracks.length} tracks`)}
            </div>
            <div class="dashboard-panels">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-film"></i> Tracks</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>Name</th><th>Type</th><th>Volume</th><th>Brightness</th><th>Muted</th></tr></thead>
                            <tbody>
                            ${tracks.length ? tracks.map(t => `<tr>
                                <td><strong>${UI.esc(t.name || '--')}</strong></td>
                                <td class="text-muted">${UI.esc(t.type || '--')}</td>
                                <td class="mono">${t.volume ?? '--'}${typeof t.volume === 'number' ? '%' : ''}</td>
                                <td class="mono">${t.brightness ?? '--'}${typeof t.brightness === 'number' ? '%' : ''}</td>
                                <td>${t.muted ? '<i class="fas fa-volume-mute text-muted"></i>' : '<i class="fas fa-volume-up" style="color:var(--accent)"></i>'}</td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="5">No tracks</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-server"></i> Machines</h3></div>
                    <div class="card-body">
                        ${machines.length ? machines.map(m => `
                            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
                                <span style="width:8px;height:8px;border-radius:50%;background:${m.online ? '#4ade80' : '#ef4444'};flex-shrink:0;"></span>
                                <strong style="font-size:12px;">${UI.esc(m.name || '--')}</strong>
                                <span class="text-muted" style="font-size:11px;">${UI.esc(m.role || '--')}</span>
                                <span style="margin-left:auto;">${m.online ? UI.badge('Online', 'green') : UI.badge('Offline', 'red')}</span>
                            </div>
                        `).join('') : UI.empty('fa-server', 'No Machines', 'No machines configured')}
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-gamepad"></i> Transport Controls</h3>
                    <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('showrun')"><i class="fas fa-theater-masks"></i> Open Show Run</button>
                </div>
                <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <button class="btn ${playing ? 'btn-primary' : 'btn-secondary'}" onclick="HippoApp.disguiseDashAction('play')" title="Play"><i class="fas fa-play"></i> PLAY</button>
                    <button class="btn ${!playing ? 'btn-primary' : 'btn-secondary'}" onclick="HippoApp.disguiseDashAction('pause')" title="Pause"><i class="fas fa-pause"></i> PAUSE</button>
                    <button class="btn btn-secondary" onclick="HippoApp.disguiseDashAction('stop')" title="Stop"><i class="fas fa-stop"></i> STOP</button>
                    <div style="width:1px;height:28px;background:var(--border);margin:0 4px;"></div>
                    <button class="btn btn-secondary" onclick="HippoApp.disguiseDashAction('prevSection')" title="Previous Section"><i class="fas fa-step-backward"></i></button>
                    <span class="mono" style="font-size:11px;color:var(--text-secondary);padding:0 4px;">${UI.esc(currentSection)}</span>
                    <button class="btn btn-secondary" onclick="HippoApp.disguiseDashAction('nextSection')" title="Next Section"><i class="fas fa-step-forward"></i></button>
                </div>
            </div>
            <div class="dashboard-panels" style="margin-top:12px;">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-tv"></i> Outputs</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>Name</th><th>Resolution</th></tr></thead>
                            <tbody>
                            ${outputs.length ? outputs.map(o => `<tr>
                                <td><strong>${UI.esc(o.name || '--')}</strong></td>
                                <td class="mono">${UI.esc(o.resolution || '--')}</td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="2">No outputs</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-map-signs"></i> Sections</h3></div>
                    <div class="card-body" style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${sections.length ? sections.map(s => `
                            <button class="btn btn-xs ${s.name === currentSection ? 'btn-primary' : 'btn-ghost'}" onclick="HippoApp.disguiseGoToSection('${UI.esc(s.name || '')}')">
                                ${UI.esc(s.name || '--')}
                            </button>
                        `).join('') : '<span class="text-muted">No sections</span>'}
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-cube"></i> 3D Stage Preview &mdash; Disguise</h3>
                    <div style="display:flex;gap:6px;">
                        <button class="btn btn-xs btn-ghost" onclick="DashboardPage._initDisguise3D()"><i class="fas fa-sync-alt"></i> Refresh Preview</button>
                        <button class="btn btn-xs btn-primary" onclick="HippoApp.navigate('stage3d')"><i class="fas fa-expand"></i> Open in 3D Visualizer</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0;position:relative;">
                    <div id="disguise-3d-preview" style="width:100%;height:300px;background:#0a0a0c;border-radius:0 0 8px 8px;overflow:hidden;"></div>
                </div>
            </div>`;
    },

    _renderPixeraDash() {
        const pState = appState.get('pixeraState') || {};
        const timelines = pState.timelines || [];
        const screens = pState.screens || [];
        const resourceCount = timelines.reduce((sum, tl) => sum + (tl.resources || 0), 0);

        const playingCount = timelines.filter(tl => tl.state === 'playing').length;

        const stateBadge = (state) => {
            const s = (state || '').toLowerCase();
            if (s === 'playing') return UI.badge('Playing', 'green');
            if (s === 'paused') return UI.badge('Paused', 'orange');
            return UI.badge('Stopped', 'red');
        };

        return `
            <div class="dashboard-stats">
                ${UI.statCard('fa-stream', 'accent', 'Timelines', timelines.length, `${playingCount} playing`)}
                ${UI.statCard('fa-tv', 'blue', 'Screens', screens.length, 'Output screens')}
                ${UI.statCard('fa-photo-video', 'purple', 'Resources', resourceCount, 'Across all timelines')}
                ${UI.statCard('fa-play-circle', 'green', 'Playing', playingCount, `of ${timelines.length} timelines`)}
            </div>
            <div class="dashboard-panels">
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-stream"></i> Timelines</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>Name</th><th>State</th><th>Current Time</th><th>Duration</th><th>Controls</th></tr></thead>
                            <tbody>
                            ${timelines.length ? timelines.map((tl, i) => `<tr>
                                <td><strong>${UI.esc(tl.name || `Timeline ${i + 1}`)}</strong></td>
                                <td>${stateBadge(tl.state)}</td>
                                <td class="mono">${tl.currentTime ? UI.formatDuration(tl.currentTime) : '--:--'}</td>
                                <td class="mono">${tl.duration ? UI.formatDuration(tl.duration) : '--:--'}</td>
                                <td style="display:flex;gap:4px;">
                                    <button class="tl-transport play" onclick="HippoApp.pixeraTransport(${tl.id ?? i}, 'play')" title="Play"><i class="fas fa-play"></i></button>
                                    <button class="tl-transport" onclick="HippoApp.pixeraTransport(${tl.id ?? i}, 'pause')" title="Pause"><i class="fas fa-pause"></i></button>
                                    <button class="tl-transport stop" onclick="HippoApp.pixeraTransport(${tl.id ?? i}, 'stop')" title="Stop"><i class="fas fa-stop"></i></button>
                                </td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="5">No timelines</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-tv"></i> Screens</h3></div>
                    <div class="card-body">
                        <table>
                            <thead><tr><th>Name</th><th>Resolution</th></tr></thead>
                            <tbody>
                            ${screens.length ? screens.map(s => `<tr>
                                <td><strong>${UI.esc(s.name || '--')}</strong></td>
                                <td class="mono">${UI.esc(s.resolution || '--')}</td>
                            </tr>`).join('') : '<tr><td class="text-muted" colspan="2">No screens</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-cube"></i> 3D Stage Preview &mdash; Pixera</h3>
                    <div style="display:flex;gap:6px;">
                        <button class="btn btn-xs btn-ghost" onclick="DashboardPage._initPixera3D()"><i class="fas fa-sync-alt"></i> Refresh Preview</button>
                        <button class="btn btn-xs btn-primary" onclick="HippoApp.navigate('stage3d')"><i class="fas fa-expand"></i> Open in 3D Visualizer</button>
                    </div>
                </div>
                <div class="card-body" style="padding:0;position:relative;">
                    <div id="pixera-3d-preview" style="width:100%;height:300px;background:#0a0a0c;border-radius:0 0 8px 8px;overflow:hidden;"></div>
                </div>
            </div>`;
    },

    _renderAtemDash() {
        const info = appState.get('serverInfo') || {};
        const atemState = appState.get('atemState') || {};
        const inputs = atemState.inputs || [];
        const model = info.model || atemState.model || 'Blackmagic ATEM';
        const firmware = info.firmware || atemState.firmware || '--';
        const pgmId = atemState.program ?? info.program ?? 1;
        const pvwId = atemState.preview ?? info.preview ?? 2;
        const pgmInput = inputs.find(i => i.id === pgmId);
        const pvwInput = inputs.find(i => i.id === pvwId);
        const ftb = atemState.ftb || false;
        const streaming = atemState.streaming || false;
        const recording = atemState.recording || false;
        const dsk = atemState.dsk || [];

        return `
            <div class="dashboard-stats">
                ${UI.statCard('fa-random', 'accent', 'Switcher', this._statusBadge('Running'), model)}
                ${UI.statCard('fa-tv', 'green', 'Program', pgmInput?.shortName || pgmInput?.name || `Input ${pgmId}`, 'On-Air')}
                ${UI.statCard('fa-eye', 'purple', 'Preview', pvwInput?.shortName || pvwInput?.name || `Input ${pvwId}`, 'Preview')}
                ${UI.statCard('fa-th-list', 'blue', 'Inputs', inputs.length, `FW: ${UI.esc(firmware)}`)}
            </div>
            <div class="dashboard-panels">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                        <button class="btn btn-xs btn-ghost" onclick="HippoApp.navigate('showrun')"><i class="fas fa-theater-masks"></i> Open Show Run</button>
                    </div>
                    <div class="card-body" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                        <button class="btn btn-danger" onclick="HippoApp.atemDashAction('cut')" title="Cut"><i class="fas fa-cut"></i> CUT</button>
                        <button class="btn btn-primary" onclick="HippoApp.atemDashAction('auto')" title="Auto Transition"><i class="fas fa-wave-square"></i> AUTO</button>
                        <button class="btn ${ftb ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.atemDashAction('ftb')" title="Fade to Black">
                            <i class="fas fa-moon"></i> FTB ${ftb ? '(ON)' : ''}
                        </button>
                        <div style="width:1px;height:28px;background:var(--border);margin:0 4px;"></div>
                        <button class="btn ${recording ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.atemDashAction('record')" title="Toggle Recording">
                            <i class="fas fa-circle"></i> ${recording ? 'STOP REC' : 'REC'}
                        </button>
                        <button class="btn ${streaming ? 'btn-danger' : 'btn-secondary'}" onclick="HippoApp.atemDashAction('stream')" title="Toggle Stream">
                            <i class="fas fa-broadcast-tower"></i> ${streaming ? 'STOP STREAM' : 'STREAM'}
                        </button>
                        <div style="width:1px;height:28px;background:var(--border);margin:0 4px;"></div>
                        ${dsk.map((d, i) => `
                            <button class="btn ${d.onAir ? 'btn-warning' : 'btn-secondary'}" onclick="HippoApp.atemDashAction('dskAuto',${i})" title="DSK ${i + 1}">
                                <i class="fas fa-key"></i> DSK${i + 1} ${d.onAir ? '(ON)' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-th-list"></i> Input Sources <span class="text-muted" style="font-size:10px;font-weight:400;">Click to switch</span></h3></div>
                    <div class="card-body">
                        ${inputs.filter(inp => inp.type !== 'Program' && inp.type !== 'AuxOutput').map(inp => {
                            const isPgm = inp.id === pgmId;
                            const isPvw = inp.id === pvwId;
                            return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;border-radius:6px;border:1px solid ${isPgm ? 'rgba(74,222,128,0.3)' : isPvw ? 'rgba(250,204,21,0.2)' : 'var(--border)'};background:${isPgm ? 'rgba(74,222,128,0.06)' : isPvw ? 'rgba(250,204,21,0.04)' : 'var(--bg-secondary)'};cursor:pointer;transition:all 0.12s;" onclick="HippoApp.atemDashAction('pgm',${inp.id})" title="Send to Program">
                                <span class="mono" style="font-size:10px;color:var(--text-muted);min-width:36px;">${UI.esc(inp.shortName || inp.id)}</span>
                                <span style="font-size:12px;font-weight:${isPgm ? '800' : '500'};color:${isPgm ? '#4ade80' : isPvw ? '#facc15' : 'var(--text-primary)'};">${UI.esc(inp.name)}</span>
                                <span class="text-muted" style="font-size:10px;margin-left:auto;">${UI.esc(inp.type)}</span>
                                ${isPgm ? '<span style="font-size:9px;font-weight:700;color:#4ade80;background:rgba(34,197,94,0.15);padding:2px 6px;border-radius:4px;">PGM</span>' : ''}
                                ${isPvw ? '<span style="font-size:9px;font-weight:700;color:#facc15;background:rgba(250,204,21,0.15);padding:2px 6px;border-radius:4px;">PVW</span>' : ''}
                                ${!isPgm && !isPvw ? `<button class="tl-transport play" onclick="event.stopPropagation();HippoApp.atemDashAction('pvw',${inp.id})" title="Set as Preview"><i class="fas fa-eye"></i></button>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="card mt-md">
                <div class="card-header"><h3><i class="fas fa-info-circle"></i> Switcher Info</h3></div>
                <div class="card-body">
                    <table>
                        <tr><td class="text-muted">Model</td><td>${UI.esc(model)}</td></tr>
                        <tr><td class="text-muted">Firmware</td><td class="mono">${UI.esc(firmware)}</td></tr>
                        <tr><td class="text-muted">Inputs</td><td>${inputs.length}</td></tr>
                        <tr><td class="text-muted">Streaming</td><td>${streaming ? UI.badge('Live', 'red') : UI.badge('Offline', 'orange')}</td></tr>
                        <tr><td class="text-muted">Recording</td><td>${recording ? UI.badge('Recording', 'red') : UI.badge('Stopped', 'orange')}</td></tr>
                        <tr><td class="text-muted">FTB</td><td>${ftb ? UI.badge('Active', 'red') : UI.badge('Off', 'green')}</td></tr>
                    </table>
                </div>
            </div>`;
    },

    /* ── 3D Stage Preview (shared state) ── */
    _dash3D: null, // { renderer, scene, camera, animId, orbitState, resizeHandler }

    _cleanup3D() {
        if (!this._dash3D) return;
        const s = this._dash3D;
        if (s.animId) cancelAnimationFrame(s.animId);
        if (s.resizeHandler) window.removeEventListener('resize', s.resizeHandler);
        if (s.renderer) { s.renderer.dispose(); s.renderer.domElement.remove(); }
        this._dash3D = null;
    },

    /**
     * Shared helper: build a mini 3D scene inside `containerId`.
     * Returns the state object stored in _dash3D.
     */
    _build3DPreview(containerId) {
        this._cleanup3D();
        const container = document.getElementById(containerId);
        if (!container || typeof THREE === 'undefined') return null;

        // Clear previous content
        container.innerHTML = '';

        const w = container.clientWidth || 400;
        const h = container.clientHeight || 300;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0c);
        scene.fog = new THREE.Fog(0x0a0a0c, 40, 100);

        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
        camera.position.set(10, 7, 14);
        camera.lookAt(0, 2, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0x404060, 0.6);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(8, 12, 10);
        dir.castShadow = true;
        scene.add(dir);
        scene.add(new THREE.HemisphereLight(0x8090b0, 0x303030, 0.4));

        // Grid helper
        const grid = new THREE.GridHelper(30, 30, 0x333344, 0x1a1a2e);
        scene.add(grid);

        // Stage floor (grey plane)
        const floorGeo = new THREE.PlaneGeometry(20, 14);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Orbit controls (same pattern as stage3d.js)
        let isOrbiting = false, isPanning = false, prevX = 0, prevY = 0;
        const spherical = {
            theta: Math.atan2(camera.position.x, camera.position.z),
            phi: Math.acos(camera.position.y / camera.position.length()),
            radius: camera.position.length()
        };
        const target = new THREE.Vector3(0, 2, 0);

        const updateCamera = () => {
            const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            const y = spherical.radius * Math.cos(spherical.phi);
            const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            camera.position.set(target.x + x, target.y + y, target.z + z);
            camera.lookAt(target);
        };

        const el = renderer.domElement;
        el.addEventListener('mousedown', (e) => {
            if (e.button === 0) isOrbiting = true;
            else if (e.button === 2) isPanning = true;
            prevX = e.clientX; prevY = e.clientY;
        });
        el.addEventListener('mousemove', (e) => {
            const dx = e.clientX - prevX, dy = e.clientY - prevY;
            prevX = e.clientX; prevY = e.clientY;
            if (isOrbiting) {
                spherical.theta -= dx * 0.005;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.005));
                updateCamera();
            }
            if (isPanning) {
                const ps = 0.02 * spherical.radius;
                const right = new THREE.Vector3();
                right.crossVectors(camera.getWorldDirection(new THREE.Vector3()), new THREE.Vector3(0, 1, 0)).normalize();
                target.add(right.multiplyScalar(-dx * ps * 0.1));
                target.y += dy * ps * 0.1;
                updateCamera();
            }
        });
        const onUp = () => { isOrbiting = false; isPanning = false; };
        el.addEventListener('mouseup', onUp);
        el.addEventListener('mouseleave', onUp);
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            spherical.radius = Math.max(2, Math.min(60, spherical.radius + e.deltaY * 0.02));
            updateCamera();
        }, { passive: false });
        el.addEventListener('contextmenu', (e) => e.preventDefault());

        // Resize handler
        const resizeHandler = () => {
            const nw = container.clientWidth || 400;
            const nh = container.clientHeight || 300;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', resizeHandler);

        // Animation loop
        let animId;
        const animate = () => {
            animId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        const state = { renderer, scene, camera, get animId() { return animId; }, orbitState: { spherical, target, updateCamera }, resizeHandler };
        // Store animId setter so cleanup works
        Object.defineProperty(state, 'animId', {
            get() { return animId; },
            set(v) { animId = v; },
            configurable: true
        });
        this._dash3D = state;
        return state;
    },

    /**
     * Add an LED wall / screen rectangle to the scene.
     */
    _add3DScreen(scene, { x, y, z, w, h, rotY, color, label }) {
        x = x || 0; y = y || 0; z = z || 0;
        w = w || 4; h = h || 2.5;
        rotY = rotY || 0;
        color = color || 0x1a6bff;

        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshStandardMaterial({
            color, emissive: color, emissiveIntensity: 0.25,
            side: THREE.DoubleSide, roughness: 0.3, metalness: 0.6
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y + h / 2, z);
        mesh.rotation.y = rotY;
        mesh.castShadow = true;
        scene.add(mesh);

        // Border wireframe
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4488ff, linewidth: 1 }));
        line.position.copy(mesh.position);
        line.rotation.copy(mesh.rotation);
        scene.add(line);
    },

    /**
     * Add a camera frustum wireframe to the scene.
     */
    _add3DCameraFrustum(scene, { x, y, z, lookX, lookY, lookZ, color }) {
        x = x ?? 0; y = y ?? 5; z = z ?? 10;
        lookX = lookX ?? 0; lookY = lookY ?? 2; lookZ = lookZ ?? 0;
        color = color || 0x00ff88;

        // Camera body indicator
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.3, 0.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(x, y, z);
        scene.add(body);

        // Frustum cone from camera to target
        const from = new THREE.Vector3(x, y, z);
        const to = new THREE.Vector3(lookX, lookY, lookZ);
        const dir = new THREE.Vector3().subVectors(to, from);
        const len = Math.min(dir.length(), 8);
        dir.normalize();

        const fovHalf = 0.35; // ~20 deg
        const endW = len * Math.tan(fovHalf);
        const endH = endW * 0.5625; // 16:9 aspect

        const right = new THREE.Vector3();
        right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3();
        up.crossVectors(right, dir).normalize();

        const endCenter = from.clone().add(dir.clone().multiplyScalar(len));
        const corners = [
            endCenter.clone().add(right.clone().multiplyScalar(endW)).add(up.clone().multiplyScalar(endH)),
            endCenter.clone().add(right.clone().multiplyScalar(-endW)).add(up.clone().multiplyScalar(endH)),
            endCenter.clone().add(right.clone().multiplyScalar(-endW)).add(up.clone().multiplyScalar(-endH)),
            endCenter.clone().add(right.clone().multiplyScalar(endW)).add(up.clone().multiplyScalar(-endH)),
        ];

        const pts = [];
        for (let i = 0; i < 4; i++) {
            pts.push(from, corners[i]);
            pts.push(corners[i], corners[(i + 1) % 4]);
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
        scene.add(new THREE.LineSegments(lineGeo, lineMat));
    },

    /* ── Disguise 3D preview ── */
    async _initDisguise3D() {
        const state = this._build3DPreview('disguise-3d-preview');
        if (!state) return;
        const { scene } = state;

        const dState = appState.get('disguiseState') || {};
        const machines = dState.health || [];
        const transport = dState.transport || {};
        const outputs = transport.outputs || [];

        // Try to fetch real spatial data from the deep API
        let spatialScreens = null, projectors = null, stageObjects = null;
        try {
            [spatialScreens, projectors, stageObjects] = await Promise.all([
                disguiseAPI.getScreens().catch(() => null),
                disguiseAPI.getProjectors().catch(() => null),
                disguiseAPI.getStageObjects().catch(() => null),
            ]);
        } catch {}

        // Use spatial screen data if available (has real 3D transforms)
        if (spatialScreens && Array.isArray(spatialScreens) && spatialScreens.length) {
            spatialScreens.forEach(s => {
                const pos = s.position || {};
                const rot = s.rotation || {};
                const size = s.size || {};
                this._add3DScreen(scene, {
                    x: pos.x || 0, y: pos.y || 0, z: pos.z || 0,
                    w: size.width || 5, h: size.height || 3,
                    rotY: (rot.y || 0) * Math.PI / 180,
                    color: 0x1a6bff,
                    label: s.name || s.uid || 'Screen'
                });
            });
        } else if (outputs.length) {
            // Fallback: position LED walls in a semicircle from transport outputs
            outputs.forEach((o, i) => {
                const angle = (-0.4 + i * 0.8 / Math.max(outputs.length - 1, 1)) * Math.PI;
                const r = 6;
                this._add3DScreen(scene, {
                    x: Math.sin(angle) * r, y: 0, z: -Math.cos(angle) * r,
                    w: 5, h: 3, rotY: angle, color: 0x1a6bff, label: o.name
                });
            });
        } else {
            // Demo walls
            this._add3DScreen(scene, { x: 0, y: 0, z: -6, w: 8, h: 4, rotY: 0, color: 0x1a6bff });
            this._add3DScreen(scene, { x: -5, y: 0, z: -3, w: 5, h: 3, rotY: Math.PI * 0.3, color: 0x1a5bdd });
            this._add3DScreen(scene, { x: 5, y: 0, z: -3, w: 5, h: 3, rotY: -Math.PI * 0.3, color: 0x1a5bdd });
        }

        // Projectors from spatial API
        if (projectors && Array.isArray(projectors) && projectors.length) {
            projectors.forEach(p => {
                const pos = p.position || {};
                this._add3DCameraFrustum(scene, {
                    x: pos.x || 0, y: pos.y || 4, z: pos.z || 8,
                    lookX: 0, lookY: 2, lookZ: -3,
                    color: 0xffaa00 // orange for projectors
                });
            });
        }

        // Stage objects from spatial API (render as boxes)
        if (stageObjects && Array.isArray(stageObjects) && stageObjects.length) {
            stageObjects.forEach(obj => {
                const pos = obj.position || {};
                const size = obj.size || {};
                const geo = new THREE.BoxGeometry(size.width || 1, size.height || 1, size.depth || 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.4, wireframe: true });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(pos.x || 0, (pos.y || 0) + (size.height || 1) / 2, pos.z || 0);
                scene.add(mesh);
            });
        }

        // Virtual cameras from machines
        if (machines.length) {
            machines.forEach((m, i) => {
                const xOff = (i - (machines.length - 1) / 2) * 3;
                this._add3DCameraFrustum(scene, {
                    x: xOff, y: 4, z: 8,
                    lookX: 0, lookY: 2, lookZ: -3,
                    color: m.online ? 0x00ff88 : 0xff4444
                });
            });
        } else if (!projectors || !projectors.length) {
            // Demo camera only if no projectors found
            this._add3DCameraFrustum(scene, { x: 0, y: 4, z: 10, lookX: 0, lookY: 2, lookZ: -3, color: 0x00ff88 });
        }
    },

    /* ── Pixera 3D preview ── */
    async _initPixera3D() {
        const state = this._build3DPreview('pixera-3d-preview');
        if (!state) return;
        const { scene } = state;

        const screens = appState.get('pixeraState')?.screens || [];

        // Try to fetch deep spatial data from Pixera API
        let screenDetails = null, devices = null;
        try {
            const screenHandles = await pixeraAPI.getScreens().catch(() => []);
            if (screenHandles && screenHandles.length) {
                screenDetails = await Promise.all(
                    screenHandles.map(h => pixeraAPI.getScreen(h).catch(() => null))
                ).then(arr => arr.filter(Boolean));
            }
            devices = await pixeraAPI.getDevices().catch(() => null);
        } catch {}

        // Use detailed screen data if available (has 3D position/rotation)
        if (screenDetails && screenDetails.length) {
            screenDetails.forEach((s, i) => {
                const pos = s.position || {};
                const rot = s.rotation || {};
                let sw = 5, sh = 3;
                if (s.resolution) {
                    const rw = s.resolution.width || s.resolution.x || 1920;
                    const rh = s.resolution.height || s.resolution.y || 1080;
                    sh = sw * (rh / rw);
                }
                this._add3DScreen(scene, {
                    x: pos.x || (i - (screenDetails.length - 1) / 2) * 6,
                    y: pos.y || 0,
                    z: pos.z || -5,
                    w: sw, h: sh,
                    rotY: (rot.y || 0) * Math.PI / 180,
                    color: 0x8844ff,
                    label: s.name || `Screen ${i + 1}`
                });
            });
        } else if (screens.length) {
            // Fallback: use appState screens with resolution parsing
            screens.forEach((s, i) => {
                const xOff = (i - (screens.length - 1) / 2) * 6;
                let sw = 5, sh = 3;
                if (s.resolution) {
                    const parts = s.resolution.split(/[x×]/i);
                    if (parts.length === 2) {
                        const rw = parseInt(parts[0]) || 1920;
                        const rh = parseInt(parts[1]) || 1080;
                        sh = sw * (rh / rw);
                    }
                }
                this._add3DScreen(scene, {
                    x: xOff, y: 0, z: -5, w: sw, h: sh,
                    rotY: 0, color: 0x8844ff, label: s.name
                });
            });
        } else {
            // Demo screens
            this._add3DScreen(scene, { x: 0, y: 0, z: -6, w: 8, h: 4.5, rotY: 0, color: 0x8844ff });
            this._add3DScreen(scene, { x: -6, y: 0, z: -4, w: 4, h: 2.5, rotY: Math.PI * 0.25, color: 0x6633cc });
            this._add3DScreen(scene, { x: 6, y: 0, z: -4, w: 4, h: 2.5, rotY: -Math.PI * 0.25, color: 0x6633cc });
        }

        // Output devices as camera/projector frustums
        if (devices && Array.isArray(devices) && devices.length) {
            for (let i = 0; i < Math.min(devices.length, 4); i++) {
                const xOff = (i - (Math.min(devices.length, 4) - 1) / 2) * 3;
                this._add3DCameraFrustum(scene, {
                    x: xOff, y: 4, z: 10,
                    lookX: 0, lookY: 2, lookZ: -3,
                    color: 0x00ff88
                });
            }
        } else {
            this._add3DCameraFrustum(scene, { x: 0, y: 4, z: 10, lookX: 0, lookY: 2, lookZ: -3, color: 0x00ff88 });
        }
    },

    _homeRefreshTimer: null,

    async onActivate() {
        if (!appState.get('connected')) {
            // Home dashboard — start fast refresh to keep device info updated
            this._startHomeRefresh();
            return;
        }
        // Fetch mix levels
        const info = appState.get('serverInfo');
        if (info?.mixes) {
            for (const m of info.mixes) {
                try {
                    const level = await hippoAPI.getMixLevel(m.index);
                    const levels = { ...appState.get('mixLevels'), [m.index]: typeof level === 'number' ? level : parseInt(level) || 0 };
                    appState.set('mixLevels', levels);
                    const el = document.getElementById(`dash-mix-level-${m.index}`);
                    if (el) el.innerHTML = UI.levelBar(levels[m.index]);
                } catch {}
            }
        }
        // Init 3D preview for Disguise / Pixera dashboards (after DOM is ready)
        const serverType = appState.get('serverType');
        if (serverType === 'disguise') {
            setTimeout(() => this._initDisguise3D(), 50);
        } else if (serverType === 'pixera') {
            setTimeout(() => this._initPixera3D(), 50);
        }
    },

    onDeactivate() {
        this._cleanup3D();
        this._stopHomeRefresh();
    },

    _startHomeRefresh() {
        this._stopHomeRefresh();
        // Poll all servers for status every 3 seconds
        this._pollAllServers();
        this._homeRefreshTimer = setInterval(() => this._pollAllServers(), 3000);
    },

    _stopHomeRefresh() {
        if (this._homeRefreshTimer) {
            clearInterval(this._homeRefreshTimer);
            this._homeRefreshTimer = null;
        }
    },

    async _pollAllServers() {
        const servers = appState.get('servers') || [];
        if (servers.length === 0) return;

        // Ping each server in parallel for fast updates
        const promises = servers.map(async (s) => {
            if (s.virtual) {
                // Preserve existing info (version etc.), add type-specific defaults
                const existing = (appState.get('serverStatuses') || {})[s.id]?.info || {};
                const vInfo = { ...existing, engineStatus: 'Running', mediaManagerStatus: 'Running' };
                // Inject version from virtual engines if not already set
                if (!vInfo.softwareVersion && !vInfo.version && !vInfo.firmware) {
                    const versionMap = { hippo: '4.8.1', resolume: '7.18.0', vmix: '27.0.0', casparcg: '2.3.3', obs: '30.2.0', barco: '11.3', qlab: '5.4', disguise: 'r27.1', pixera: '2.1.23', atem: '9.6.2' };
                    vInfo.softwareVersion = (versionMap[s.type] || '1.0') + ' (Virtual)';
                }
                appState.updateServerStatus(s.id, { online: true, info: vInfo });
                return;
            }
            try {
                const url = `http://${s.host}:${s.port}`;
                let info = {};
                const serverType = s.type || 'hippo';
                switch (serverType) {
                    case 'hippo':
                        const res = await fetch(`${url}/api/v4/info`, { signal: AbortSignal.timeout(2000) });
                        if (res.ok) info = await res.json();
                        break;
                    case 'resolume':
                        const rr = await fetch(`${url}/api/v1/product`, { signal: AbortSignal.timeout(2000) });
                        if (rr.ok) info = await rr.json();
                        break;
                    case 'vmix':
                        const vr = await fetch(`${url}/api`, { signal: AbortSignal.timeout(2000) });
                        if (vr.ok) info = { engineStatus: 'Running' };
                        break;
                    default:
                        const dr = await fetch(url, { signal: AbortSignal.timeout(2000) });
                        if (dr.ok) info = { engineStatus: 'Running' };
                        break;
                }
                appState.updateServerStatus(s.id, { online: true, info });
            } catch {
                appState.updateServerStatus(s.id, { online: false });
            }
        });

        await Promise.allSettled(promises);

        // Re-render the dashboard grid with updated info
        const container = document.getElementById('page-content');
        if (container && appState.get('currentPage') === 'dashboard' && !appState.get('connected')) {
            container.innerHTML = this._renderHomeDashboard();
        }
    }
};
