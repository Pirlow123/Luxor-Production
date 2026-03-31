/**
 * Dashboard Page — Overview of connected server
 */
const DashboardPage = {
    render() {
        const info = appState.get('serverInfo');
        const connected = appState.get('connected');

        if (!connected) {
            return `
                <div class="empty-state" style="padding:80px 20px">
                    <i class="fas fa-plug" style="font-size:48px;opacity:0.15;margin-bottom:16px"></i>
                    <h3>No Server Connected</h3>
                    <p>Add a server (Hippotizer, Resolume, vMix, CasparCG, OBS, Barco E2, QLab, Disguise, Pixera) to begin.</p>
                    <button class="btn btn-primary mt-md" onclick="HippoApp.showAddServer()">
                        <i class="fas fa-plus"></i> Add Server
                    </button>
                </div>`;
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
                    <div style="width:1px;height:28px;background:var(--border);margin:0 4px;"></div>
                    <button class="btn btn-secondary" style="color:var(--danger)" onclick="HippoApp.emergencyStop()" title="Emergency Stop — Stop and Mute Everything"><i class="fas fa-exclamation-triangle"></i> E-STOP</button>
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

    _renderBarcoDash() {
        const presets = appState.get('barcoPresets') || {};
        const destinations = appState.get('barcoDestinations') || [];
        const sources = appState.get('barcoSources') || [];
        const activePreset = presets.active || '--';
        const previewPreset = presets.preview || '--';

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
        const workspaces = appState.get('qlabWorkspaces') || [];
        const cueLists = appState.get('qlabCueLists') || [];
        const activeWs = appState.get('qlabActiveWorkspace') || {};
        const wsName = activeWs.name || workspaces[0]?.name || '--';
        const playbackStatus = activeWs.playbackStatus || 'stopped';
        const currentCue = activeWs.currentCue || '--';
        const masterVolume = activeWs.masterVolume ?? 100;

        const statusColor = playbackStatus === 'playing' ? 'green' : playbackStatus === 'paused' ? 'orange' : 'red';

        // Flatten cue lists into cues for table
        const cues = cueLists.flatMap(cl => cl.cues || []);

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
                ${UI.statCard('fa-theater-masks', 'purple', 'Workspace', UI.esc(wsName), `${workspaces.length} workspace(s)`)}
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
        const tracks = appState.get('disguiseTracks') || [];
        const transport = appState.get('disguiseTransport') || {};
        const sections = appState.get('disguiseSections') || [];
        const machines = appState.get('disguiseMachines') || [];
        const outputs = transport.outputs || [];

        const timecode = transport.timecode || '--:--:--:--';
        const playing = transport.playing;
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
            </div>`;
    },

    _renderPixeraDash() {
        const timelines = appState.get('pixeraTimelines') || [];
        const screens = appState.get('pixeraScreens') || [];
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
            </div>`;
    },

    async onActivate() {
        if (!appState.get('connected')) return;
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
    }
};
