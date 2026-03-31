/**
 * Timelines Page — Full transport control for all timelines
 * Uses: GET /timelines, /timelines/{id}/play|stop|reset|mute|unmute|gonextcue|gopreviouscue|gocue/{n}
 */
const TimelinesPage = {
    render() {
        if (!appState.get('connected')) return UI.empty('fa-plug', 'Not Connected', 'Connect to a server first');
        const timelines = appState.get('timelines');

        return `
            <div class="section-header">
                <h2><i class="fas fa-stream"></i> Timelines</h2>
                <div class="flex gap-sm">
                    <button class="btn btn-sm btn-success" onclick="HippoApp.playAll()"><i class="fas fa-play"></i> Play All</button>
                    <button class="btn btn-sm btn-warning" onclick="HippoApp.stopAll()"><i class="fas fa-stop"></i> Stop All</button>
                    <button class="btn btn-sm" onclick="HippoApp.resetAll()"><i class="fas fa-backward-step"></i> Reset All</button>
                    <button class="btn btn-sm" onclick="TimelinesPage.muteAll()"><i class="fas fa-volume-mute"></i> Mute All</button>
                    <button class="btn btn-sm" onclick="TimelinesPage.unmuteAll()"><i class="fas fa-volume-up"></i> Unmute All</button>
                    <button class="btn btn-sm btn-ghost" onclick="TimelinesPage.refresh()"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>

            <div id="timelines-list">
                ${this._renderList(timelines)}
            </div>
        `;
    },

    _renderList(timelines) {
        if (!Array.isArray(timelines) || timelines.length === 0) {
            return UI.empty('fa-stream', 'No Timelines', 'No timelines configured on this server');
        }

        return timelines.map(tl => {
            const cues = tl.commands || [];
            const duration = UI.formatDuration(tl.endTimeSecs);
            const cueList = cues.map(c => `<span class="badge badge-blue" style="cursor:pointer;margin:1px" onclick="TimelinesPage.goCue(${tl.iD}, ${c.cueNumber})" title="${UI.esc(c.name || `Cue ${c.cueNumber}`)}">${c.cueNumber}</span>`).join(' ');

            return `
                <div class="tl-item" style="flex-wrap:wrap">
                    <div class="tl-index">${tl.iD}</div>
                    <div class="tl-info" style="min-width:150px">
                        <div class="tl-name">${UI.esc(tl.name || `Timeline ${tl.iD}`)}</div>
                        <div class="tl-meta">
                            <span><i class="fas fa-clock"></i> ${duration}</span>
                            <span><i class="fas fa-flag"></i> ${cues.length} cues</span>
                            <span class="mono" style="font-size:9px">${UI.esc(tl.guid || '')}</span>
                        </div>
                    </div>
                    <div class="tl-controls">
                        <button class="tl-transport" onclick="TimelinesPage.prevCue(${tl.iD})" title="Prev Cue"><i class="fas fa-backward-step"></i></button>
                        <button class="tl-transport stop" onclick="TimelinesPage.stop(${tl.iD})" title="Stop"><i class="fas fa-stop"></i></button>
                        <button class="tl-transport play" onclick="TimelinesPage.play(${tl.iD})" title="Play"><i class="fas fa-play"></i></button>
                        <button class="tl-transport" onclick="TimelinesPage.nextCue(${tl.iD})" title="Next Cue"><i class="fas fa-forward-step"></i></button>
                        <button class="tl-transport" onclick="TimelinesPage.reset(${tl.iD})" title="Reset"><i class="fas fa-rotate-left"></i></button>
                        <button class="tl-transport" onclick="TimelinesPage.mute(${tl.iD})" title="Mute"><i class="fas fa-volume-mute"></i></button>
                        <button class="tl-transport" onclick="TimelinesPage.unmute(${tl.iD})" title="Unmute"><i class="fas fa-volume-up"></i></button>
                    </div>
                    ${cues.length > 0 ? `<div style="width:100%;padding:4px 0 0 42px;font-size:10px;color:var(--text-muted)">Cues: ${cueList}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    async play(id) { try { await hippoAPI.timelinePlay(id); UI.toast(`Timeline ${id} playing`, 'success'); appState.log('INFO', `Timeline ${id} play`, 'Timeline'); } catch(e) { UI.toast(e.message, 'error'); } },
    async stop(id) { try { await hippoAPI.timelineStop(id); UI.toast(`Timeline ${id} stopped`, 'info'); appState.log('INFO', `Timeline ${id} stop`, 'Timeline'); } catch(e) { UI.toast(e.message, 'error'); } },
    async reset(id) { try { await hippoAPI.timelineReset(id); UI.toast(`Timeline ${id} reset`, 'info'); } catch(e) { UI.toast(e.message, 'error'); } },
    async mute(id) { try { await hippoAPI.timelineMute(id); UI.toast(`Timeline ${id} muted`, 'info'); } catch(e) { UI.toast(e.message, 'error'); } },
    async unmute(id) { try { await hippoAPI.timelineUnmute(id); UI.toast(`Timeline ${id} unmuted`, 'info'); } catch(e) { UI.toast(e.message, 'error'); } },
    async nextCue(id) { try { await hippoAPI.timelineNextCue(id); UI.toast(`Timeline ${id} → next cue`, 'info'); } catch(e) { UI.toast(e.message, 'error'); } },
    async prevCue(id) { try { await hippoAPI.timelinePrevCue(id); UI.toast(`Timeline ${id} → prev cue`, 'info'); } catch(e) { UI.toast(e.message, 'error'); } },

    async goCue(id, cueNum) {
        try {
            await hippoAPI.timelineGoCue(id, cueNum);
            UI.toast(`Timeline ${id} → cue ${cueNum}`, 'success');
            appState.log('INFO', `Timeline ${id} go to cue ${cueNum}`, 'Timeline');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    async muteAll() { try { await hippoAPI.muteAll(); UI.toast('All timelines muted', 'info'); } catch(e) { UI.toast(e.message, 'error'); } },
    async unmuteAll() { try { await hippoAPI.unmuteAll(); UI.toast('All timelines unmuted', 'info'); } catch(e) { UI.toast(e.message, 'error'); } },

    async refresh() {
        try {
            const tl = await hippoAPI.getTimelines();
            appState.set('timelines', Array.isArray(tl) ? tl : (tl?.timelines || []));
            const el = document.getElementById('timelines-list');
            if (el) el.innerHTML = this._renderList(appState.get('timelines'));
            UI.toast('Timelines refreshed', 'info');
        } catch(e) { UI.toast(e.message, 'error'); }
    },

    onActivate() { this.refresh(); },
};
