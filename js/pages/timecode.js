/**
 * Timecode Page — LTC (Linear Timecode) Monitor & Simulator
 * Displays incoming timecode, frame rate, source, lock status,
 * and a history of timecode events.
 * In virtual/demo mode the timecode is simulated locally.
 */
const TimecodePage = {
    // ----------------------------------------------------------------
    // State
    // ----------------------------------------------------------------
    _running: false,
    _frameRate: 25,
    _source: 'LTC Input',
    _status: 'No Signal',   // 'Locked' | 'Unlocked' | 'No Signal'

    // Internal timecode counters
    _hh: 1,
    _mm: 0,
    _ss: 0,
    _ff: 0,

    _tickTimer: null,
    _frameAccum: 0,        // fractional-frame accumulator for smooth 25/30fps ticking
    _lastTick: null,       // Date.now() of last animation frame

    // Event history  (newest first)
    _history: [],

    // ----------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------
    render() {
        const tc = this._formatTC();

        const sourceOptions = ['LTC Input', 'MTC', 'Internal', 'ArtNet', 'Free-Run'];
        const frameRates    = [24, 25, 29.97, 30, 48, 50, 60];

        return `
            <div class="section-header">
                <h2><i class="fas fa-clock"></i> LTC Timecode Monitor</h2>
                <div class="flex gap-sm"></div>
            </div>

            <!-- ── Big timecode display ── -->
            <div class="tc-display-wrapper">
                <div class="tc-display" id="tc-display">${tc}</div>
                <div class="tc-display-labels">
                    <span>HH</span><span class="tc-sep-lbl"></span>
                    <span>MM</span><span class="tc-sep-lbl"></span>
                    <span>SS</span><span class="tc-sep-lbl"></span>
                    <span>FF</span>
                </div>
            </div>

            <!-- ── Stat row ── -->
            <div class="tc-stat-row">
                ${UI.statCard('fa-film', 'accent',  'Frame Rate', this._frameRate + ' fps', 'Frames per second')}
                ${UI.statCard('fa-plug', 'blue',    'Source',     this._source,             'Timecode input')}
                ${UI.statCard('fa-lock', this._statusColor(), 'Status', this._status, this._running ? 'Running' : 'Stopped')}
                ${UI.statCard('fa-history', 'purple', 'Events', this._history.length, 'Timecode events logged')}
            </div>

            <!-- ── Controls ── -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-sliders-h"></i> Simulation Controls</h3>
                </div>
                <div class="card-body">
                    <div class="tc-controls-row">
                        <!-- Transport buttons -->
                        <div class="tc-transport">
                            <button class="tc-btn tc-btn-play ${this._running ? 'active' : ''}"
                                    id="tc-play-btn"
                                    onclick="TimecodePage.play()"
                                    ${this._running ? 'disabled' : ''}>
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button class="tc-btn tc-btn-stop"
                                    id="tc-stop-btn"
                                    onclick="TimecodePage.stop()"
                                    ${!this._running ? 'disabled' : ''}>
                                <i class="fas fa-stop"></i> Stop
                            </button>
                            <button class="tc-btn tc-btn-reset" onclick="TimecodePage.reset()">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                        </div>

                        <!-- Frame rate selector -->
                        <div class="tc-field-group">
                            <label class="tc-label">Frame Rate</label>
                            <select class="form-control tc-select" id="tc-fps-select"
                                    onchange="TimecodePage.setFrameRate(parseFloat(this.value))">
                                ${frameRates.map(f =>
                                    `<option value="${f}" ${f === this._frameRate ? 'selected' : ''}>${f} fps</option>`
                                ).join('')}
                            </select>
                        </div>

                        <!-- Source selector -->
                        <div class="tc-field-group">
                            <label class="tc-label">Source</label>
                            <select class="form-control tc-select" id="tc-source-select"
                                    onchange="TimecodePage.setSource(this.value)">
                                ${sourceOptions.map(s =>
                                    `<option value="${s}" ${s === this._source ? 'selected' : ''}>${UI.esc(s)}</option>`
                                ).join('')}
                            </select>
                        </div>

                        <!-- Manual set -->
                        <div class="tc-field-group">
                            <label class="tc-label">Jump To</label>
                            <div class="tc-jumpto-row">
                                <input class="form-control tc-input-small" id="tc-jump-hh" type="number"
                                       min="0" max="23" placeholder="HH" value="${this._hh}">
                                <span class="tc-jump-sep">:</span>
                                <input class="form-control tc-input-small" id="tc-jump-mm" type="number"
                                       min="0" max="59" placeholder="MM" value="${this._mm}">
                                <span class="tc-jump-sep">:</span>
                                <input class="form-control tc-input-small" id="tc-jump-ss" type="number"
                                       min="0" max="59" placeholder="SS" value="${this._ss}">
                                <span class="tc-jump-sep">:</span>
                                <input class="form-control tc-input-small" id="tc-jump-ff" type="number"
                                       min="0" max="99" placeholder="FF" value="${this._ff}">
                                <button class="btn btn-sm btn-accent" onclick="TimecodePage.jumpTo()">
                                    <i class="fas fa-location-arrow"></i> Set
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Event History ── -->
            <div class="card mt-md">
                <div class="card-header">
                    <h3><i class="fas fa-list-alt"></i> Event History</h3>
                    <button class="btn btn-xs btn-ghost" onclick="TimecodePage.clearHistory()">
                        <i class="fas fa-trash"></i> Clear
                    </button>
                </div>
                <div class="card-body tc-history-body" id="tc-history">
                    ${this._renderHistory()}
                </div>
            </div>
        `;
    },

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------
    _pad(n, w = 2) {
        return String(Math.floor(n)).padStart(w, '0');
    },

    _formatTC() {
        return `${this._pad(this._hh)}:${this._pad(this._mm)}:${this._pad(this._ss)}:${this._pad(this._ff)}`;
    },

    _statusColor() {
        if (this._status === 'Locked')    return 'green';
        if (this._status === 'Unlocked')  return 'orange';
        return 'red';
    },

    _renderHistory() {
        if (this._history.length === 0) {
            return UI.empty('fa-list-alt', 'No Events', 'Start the timecode to generate events');
        }
        return this._history.map(e => `
            <div class="tc-history-row">
                <span class="tc-history-time">${UI.esc(e.ts)}</span>
                <span class="tc-history-tc mono">${UI.esc(e.tc)}</span>
                <span class="tc-history-msg">${UI.esc(e.msg)}</span>
            </div>
        `).join('');
    },

    _logEvent(msg) {
        const entry = {
            ts:  new Date().toLocaleTimeString(),
            tc:  this._formatTC(),
            msg,
        };
        this._history.unshift(entry);
        if (this._history.length > 50) this._history.pop();

        appState.log('EVENT', `TC ${entry.tc} — ${msg}`, 'Timecode');

        const el = document.getElementById('tc-history');
        if (el) el.innerHTML = this._renderHistory();
    },

    _refreshDisplay() {
        const el = document.getElementById('tc-display');
        if (el) el.textContent = this._formatTC();
    },

    _refreshStatRow() {
        // Re-render stat cards and transport button states without a full page re-render
        // The stat row is inside .tc-stat-row — quickest to just update individual pieces
        // via querySelector since statCard returns raw HTML with no stable IDs.
        // We do a targeted re-render of the stat row + button states.
        const statRow = document.querySelector('.tc-stat-row');
        if (statRow) {
            statRow.innerHTML = `
                ${UI.statCard('fa-film',    'accent',                  'Frame Rate', this._frameRate + ' fps', 'Frames per second')}
                ${UI.statCard('fa-plug',    'blue',                    'Source',     this._source,             'Timecode input')}
                ${UI.statCard('fa-lock',    this._statusColor(),       'Status',     this._status,             this._running ? 'Running' : 'Stopped')}
                ${UI.statCard('fa-history', 'purple',                  'Events',     this._history.length,     'Timecode events logged')}
            `;
        }

        const playBtn = document.getElementById('tc-play-btn');
        const stopBtn = document.getElementById('tc-stop-btn');
        if (playBtn) {
            playBtn.disabled = this._running;
            playBtn.classList.toggle('active', this._running);
        }
        if (stopBtn) {
            stopBtn.disabled = !this._running;
        }
    },

    // ----------------------------------------------------------------
    // Tick — advances the timecode by one frame
    // ----------------------------------------------------------------
    _advanceFrame() {
        const maxFrames = Math.round(this._frameRate);   // treat 29.97 as 30 for display
        this._ff++;
        if (this._ff >= maxFrames) {
            this._ff = 0;
            this._ss++;
            if (this._ss >= 60) {
                this._ss = 0;
                this._mm++;
                if (this._mm >= 60) {
                    this._mm = 0;
                    this._hh++;
                    if (this._hh >= 24) this._hh = 0;
                    this._logEvent(`Hour wrap → ${this._formatTC()}`);
                }
            }
        }
        this._refreshDisplay();
    },

    // Use requestAnimationFrame (via setInterval fallback) for smooth ticking
    _tick() {
        if (!this._running) return;
        const now = Date.now();
        const elapsed = now - (this._lastTick || now);
        this._lastTick = now;

        // Accumulate elapsed time in frames
        this._frameAccum += elapsed * (this._frameRate / 1000);

        while (this._frameAccum >= 1) {
            this._frameAccum -= 1;
            this._advanceFrame();
        }
    },

    _startTimer() {
        // ~16ms interval — advance fractional frames every tick
        this._lastTick    = Date.now();
        this._frameAccum  = 0;
        this._tickTimer   = setInterval(() => this._tick(), 16);
    },

    _stopTimer() {
        clearInterval(this._tickTimer);
        this._tickTimer = null;
    },

    // ----------------------------------------------------------------
    // Public Controls
    // ----------------------------------------------------------------
    play() {
        if (this._running) return;
        this._running = true;
        this._status  = 'Locked';
        this._startTimer();
        this._logEvent(`Started at ${this._formatTC()} — ${this._source} @ ${this._frameRate} fps`);
        this._refreshStatRow();
        UI.toast('Timecode running', 'success');
    },

    stop() {
        if (!this._running) return;
        this._running = false;
        this._status  = 'Unlocked';
        this._stopTimer();
        this._logEvent(`Stopped at ${this._formatTC()}`);
        this._refreshStatRow();
        UI.toast('Timecode stopped', 'info');
    },

    reset() {
        const wasRunning = this._running;
        if (wasRunning) this.stop();
        this._hh = 1; this._mm = 0; this._ss = 0; this._ff = 0;
        this._status = 'No Signal';
        this._logEvent('Reset to 01:00:00:00');
        this._refreshDisplay();
        this._refreshStatRow();
        UI.toast('Timecode reset', 'info');
    },

    setFrameRate(fps) {
        this._frameRate = fps;
        if (this._running) {
            this._logEvent(`Frame rate changed to ${fps} fps`);
        }
        this._refreshStatRow();
    },

    setSource(src) {
        this._source = src;
        if (this._running) {
            this._logEvent(`Source switched to ${src}`);
        }
        this._refreshStatRow();
    },

    jumpTo() {
        const hh = parseInt(document.getElementById('tc-jump-hh')?.value) || 0;
        const mm = parseInt(document.getElementById('tc-jump-mm')?.value) || 0;
        const ss = parseInt(document.getElementById('tc-jump-ss')?.value) || 0;
        const ff = parseInt(document.getElementById('tc-jump-ff')?.value) || 0;

        this._hh = Math.min(Math.max(hh, 0), 23);
        this._mm = Math.min(Math.max(mm, 0), 59);
        this._ss = Math.min(Math.max(ss, 0), 59);
        this._ff = Math.min(Math.max(ff, 0), Math.round(this._frameRate) - 1);

        this._logEvent(`Jumped to ${this._formatTC()}`);
        this._refreshDisplay();
        UI.toast(`Timecode set to ${this._formatTC()}`, 'info');
    },

    clearHistory() {
        this._history = [];
        const el = document.getElementById('tc-history');
        if (el) el.innerHTML = this._renderHistory();
        this._refreshStatRow();
    },

    // ----------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------
    onActivate() {
        // If already running (e.g. user navigated away and back), restart timer
        if (this._running) {
            this._startTimer();
        }

        // Log initial status to history if empty
        if (this._history.length === 0) {
            this._logEvent(`Monitor opened — ${this._source} @ ${this._frameRate} fps`);
        }
    },

    onDeactivate() {
        // Stop the timer when navigating away to avoid orphaned intervals
        this._stopTimer();
    },
};

/* ===================================================================
   Injected CSS — scoped to tc- prefix
   =================================================================== */
(function injectTcStyles() {
    if (document.getElementById('tc-styles')) return;
    const style = document.createElement('style');
    style.id = 'tc-styles';
    style.textContent = `
/* ── Timecode display ── */
.tc-display-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px 8px;
    background: var(--bg-card, #1a1a2e);
    border-radius: 12px;
    margin-bottom: 20px;
    border: 1px solid var(--border, #2a2a3e);
    box-shadow: inset 0 2px 16px rgba(0,0,0,0.4);
}
.tc-display {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(48px, 8vw, 96px);
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--accent, #00d4ff);
    text-shadow: 0 0 32px rgba(0, 212, 255, 0.45), 0 0 8px rgba(0, 212, 255, 0.25);
    line-height: 1;
    user-select: all;
}
.tc-display-labels {
    display: flex;
    gap: 0;
    margin-top: 6px;
    font-size: 11px;
    color: var(--text-muted, #666);
    letter-spacing: 0.05em;
    text-transform: uppercase;
}
.tc-display-labels span {
    min-width: 3.2ch;
    text-align: center;
}
.tc-sep-lbl {
    min-width: 0.8ch !important;
}

/* ── Stat row ── */
.tc-stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 0;
}
@media (max-width: 700px) {
    .tc-stat-row { grid-template-columns: repeat(2, 1fr); }
}

/* ── Virtual badge ── */
.tc-virtual-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 99px;
    background: rgba(255, 200, 0, 0.12);
    color: #ffc800;
    border: 1px solid rgba(255, 200, 0, 0.3);
    letter-spacing: 0.04em;
}

/* ── Controls ── */
.tc-controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-end;
}

/* Transport buttons */
.tc-transport {
    display: flex;
    gap: 8px;
    align-items: center;
}
.tc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--border, #333);
    background: var(--bg-card, #1e1e30);
    color: var(--text, #e0e0e0);
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s, box-shadow 0.15s;
}
.tc-btn:hover:not(:disabled) {
    background: var(--bg-hover, #2a2a40);
}
.tc-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
}
.tc-btn-play {
    background: rgba(0, 212, 100, 0.1);
    border-color: rgba(0, 212, 100, 0.4);
    color: #00d464;
}
.tc-btn-play.active,
.tc-btn-play:hover:not(:disabled) {
    background: rgba(0, 212, 100, 0.22);
    box-shadow: 0 0 12px rgba(0, 212, 100, 0.25);
}
.tc-btn-stop {
    background: rgba(255, 80, 80, 0.1);
    border-color: rgba(255, 80, 80, 0.35);
    color: #ff5050;
}
.tc-btn-stop:hover:not(:disabled) {
    background: rgba(255, 80, 80, 0.22);
    box-shadow: 0 0 12px rgba(255, 80, 80, 0.2);
}
.tc-btn-reset {
    background: rgba(180, 140, 255, 0.08);
    border-color: rgba(180, 140, 255, 0.3);
    color: #b48cff;
}
.tc-btn-reset:hover:not(:disabled) {
    background: rgba(180, 140, 255, 0.18);
}

/* Field groups */
.tc-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.tc-label {
    font-size: 11px;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.tc-select {
    min-width: 130px;
}

/* Jump-to row */
.tc-jumpto-row {
    display: flex;
    align-items: center;
    gap: 4px;
}
.tc-input-small {
    width: 52px !important;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 13px;
}
.tc-jump-sep {
    color: var(--accent, #00d4ff);
    font-weight: 700;
    font-size: 16px;
    line-height: 1;
    margin: 0 1px;
}

/* ── Event history ── */
.tc-history-body {
    max-height: 220px;
    overflow-y: auto;
}
.tc-history-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid var(--border-faint, rgba(255,255,255,0.05));
    font-size: 12px;
    line-height: 1.4;
}
.tc-history-row:last-child { border-bottom: none; }
.tc-history-time {
    color: var(--text-muted, #777);
    white-space: nowrap;
    min-width: 72px;
}
.tc-history-tc {
    color: var(--accent, #00d4ff);
    white-space: nowrap;
    min-width: 100px;
    font-size: 11px;
}
.tc-history-msg {
    color: var(--text, #ccc);
    flex: 1;
}
    `;
    document.head.appendChild(style);
}());
