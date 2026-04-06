/**
 * SHOW CLOCK / COUNTDOWN TIMER — Production Clock & Timer Suite
 * Large-format clock, named countdown timers, stopwatch, break timer & day schedule.
 *
 * Pattern: const ShowClockPage = { render(), onActivate(), onDeactivate(), refresh(),
 *          renderSidebarList(){}, initSidebar(){} }
 *
 * localStorage keys:
 *   luxor_show_timers   — array of named countdown timers (max 6)
 *   luxor_show_schedule — array of schedule items {time, description}
 *   luxor_showclock_theme — color theme id
 */
const ShowClockPage = {

    // ----------------------------------------------------------------
    // State
    // ----------------------------------------------------------------
    _timers: [],               // [{id, name, target, color}]  target = "HH:MM:SS"
    _schedule: [],             // [{id, time, description}]    time = "HH:MM"
    _theme: 'white',           // 'white' | 'green' | 'red'
    _fullscreen: false,

    _isActive: false,

    // Background interval (persists across page switches)
    _bgInterval: null,

    // Stopwatch
    _swRunning: false,
    _swStartTime: 0,
    _swElapsed: 0,             // accumulated ms
    _swLaps: [],               // [ms, ms, ...]

    // Break timer
    _breakEnd: null,            // Date.now() + duration ms, or null
    _breakDuration: 0,

    // Animation
    _rafId: null,

    // Storage keys
    _TIMERS_KEY: 'luxor_show_timers',
    _SCHEDULE_KEY: 'luxor_show_schedule',
    _THEME_KEY: 'luxor_showclock_theme',
    _SW_KEY: 'luxor_show_stopwatch',
    _BREAK_KEY: 'luxor_show_break',

    // ----------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------
    render() {
        this._loadState();

        return `
        <div class="section-header">
            <h2><i class="fas fa-clock"></i> Show Clock</h2>
            <div class="flex gap-sm">
                <select class="form-control" id="sc-theme-select" onchange="ShowClockPage._setTheme(this.value)" style="width:160px">
                    <option value="white" ${this._theme === 'white' ? 'selected' : ''}>White on Black</option>
                    <option value="green" ${this._theme === 'green' ? 'selected' : ''}>Green on Black</option>
                    <option value="red" ${this._theme === 'red' ? 'selected' : ''}>Red on Black</option>
                </select>
                <button class="btn btn-sm" onclick="ShowClockPage._toggleFullscreen()" title="Full Screen Clock">
                    <i class="fas fa-expand"></i> Full Screen
                </button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:16px;">

            <!-- Main Clock Display -->
            <div class="sc-clock-card ${this._themeClass()}" id="sc-clock-card">
                <div class="sc-main-time" id="sc-main-time">00:00:00</div>
                <div class="sc-main-date" id="sc-main-date"></div>
            </div>

            <!-- Countdown Timers -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-hourglass-half"></i> Countdown Timers</h3>
                    <button class="btn btn-sm btn-primary" onclick="ShowClockPage._addTimerDialog()" ${this._timers.length >= 6 ? 'disabled title="Max 6 timers"' : ''}>
                        <i class="fas fa-plus"></i> Add Timer
                    </button>
                </div>
                <div class="card-body" id="sc-timers-grid">
                    ${this._renderTimers()}
                </div>
            </div>

            <!-- Stopwatch & Break Timer row -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

                <!-- Stopwatch -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-stopwatch"></i> Stopwatch</h3></div>
                    <div class="card-body" style="text-align:center;">
                        <div class="sc-stopwatch-display" id="sc-sw-display">00:00:00.0</div>
                        <div class="flex gap-sm" style="justify-content:center;margin-top:12px;">
                            <button class="btn btn-sm btn-primary" id="sc-sw-start" onclick="ShowClockPage._swToggle()">
                                <i class="fas fa-play"></i> Start
                            </button>
                            <button class="btn btn-sm" onclick="ShowClockPage._swLap()" ${!this._swRunning ? 'disabled' : ''} id="sc-sw-lap">
                                <i class="fas fa-flag"></i> Lap
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="ShowClockPage._swReset()">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                        </div>
                        <div class="sc-laps" id="sc-sw-laps">
                            ${this._renderLaps()}
                        </div>
                    </div>
                </div>

                <!-- Break Timer -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-mug-hot"></i> Break Timer</h3></div>
                    <div class="card-body" style="text-align:center;">
                        <div class="sc-break-display" id="sc-break-display">${this._breakEnd ? '--:--' : 'No Break'}</div>
                        <div class="flex gap-sm" style="justify-content:center;margin-top:12px;flex-wrap:wrap;">
                            <button class="btn btn-sm" onclick="ShowClockPage._startBreak(5)">5 min</button>
                            <button class="btn btn-sm" onclick="ShowClockPage._startBreak(10)">10 min</button>
                            <button class="btn btn-sm" onclick="ShowClockPage._startBreak(15)">15 min</button>
                            <button class="btn btn-sm" onclick="ShowClockPage._startBreak(30)">30 min</button>
                            <button class="btn btn-sm btn-danger" onclick="ShowClockPage._cancelBreak()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Day Schedule -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-calendar-day"></i> Day Schedule</h3>
                    <button class="btn btn-sm btn-primary" onclick="ShowClockPage._addScheduleDialog()">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                </div>
                <div class="card-body" id="sc-schedule-body">
                    ${this._renderSchedule()}
                </div>
            </div>

        </div>`;
    },

    onActivate() {
        this._isActive = true;
        this._loadState();
        this._ensureBgInterval();
        this._startRAF();
        this.renderSidebarList();
    },

    onDeactivate() {
        this._isActive = false;
        this._stopRAF();
        // Background interval keeps running
    },

    refresh() {
        const card = document.getElementById('sc-clock-card');
        if (card) {
            card.className = 'sc-clock-card ' + this._themeClass();
        }
        this._updateTimersDOM();
        this._updateScheduleDOM();
        this.renderSidebarList();
    },

    // ----------------------------------------------------------------
    // Sidebar
    // ----------------------------------------------------------------
    renderSidebarList() {
        const container = document.getElementById('sc-sidebar-list');
        if (!container) return;
        if (this._timers.length === 0 && this._schedule.length === 0) {
            container.innerHTML = '<div style="padding:8px;color:var(--text-muted,#888);font-size:12px;">No timers or schedule items</div>';
            return;
        }
        let html = '';
        this._timers.forEach(t => {
            html += `<div class="sc-sidebar-item" onclick="ShowClockPage._scrollToTimers()">
                <span class="sc-sidebar-dot" style="background:${UI.esc(t.color)}"></span>
                <span class="sc-sidebar-label">${UI.esc(t.name)}</span>
                <span class="sc-sidebar-time">${UI.esc(t.target)}</span>
            </div>`;
        });
        this._schedule.forEach(s => {
            html += `<div class="sc-sidebar-item" onclick="ShowClockPage._scrollToSchedule()">
                <span class="sc-sidebar-dot" style="background:var(--accent,#00d4ff)"></span>
                <span class="sc-sidebar-label">${UI.esc(s.description)}</span>
                <span class="sc-sidebar-time">${UI.esc(s.time)}</span>
            </div>`;
        });
        container.innerHTML = html;
    },

    initSidebar() {
        this._loadState();
        this.renderSidebarList();
    },

    _scrollToTimers() {
        const el = document.getElementById('sc-timers-grid');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    _scrollToSchedule() {
        const el = document.getElementById('sc-schedule-body');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    // ----------------------------------------------------------------
    // Persistence
    // ----------------------------------------------------------------
    _loadState() {
        try {
            const t = localStorage.getItem(this._TIMERS_KEY);
            if (t) this._timers = JSON.parse(t);
        } catch (_) { this._timers = []; }
        try {
            const s = localStorage.getItem(this._SCHEDULE_KEY);
            if (s) this._schedule = JSON.parse(s);
        } catch (_) { this._schedule = []; }
        try {
            const th = localStorage.getItem(this._THEME_KEY);
            if (th) this._theme = th;
        } catch (_) {}
        // Restore stopwatch
        try {
            const sw = JSON.parse(localStorage.getItem(this._SW_KEY));
            if (sw) {
                this._swLaps = sw.laps || [];
                if (sw.running && sw.absStart) {
                    // Was running — resume from absolute timestamp
                    this._swRunning = true;
                    this._swElapsed = sw.elapsed || 0;
                    this._swStartTime = performance.now() - (Date.now() - sw.absStart);
                } else {
                    this._swRunning = false;
                    this._swElapsed = sw.elapsed || 0;
                    this._swStartTime = 0;
                }
            }
        } catch (_) {}
        // Restore break timer
        try {
            const br = JSON.parse(localStorage.getItem(this._BREAK_KEY));
            if (br && br.end) {
                this._breakEnd = br.end;
                this._breakDuration = br.duration || 0;
            }
        } catch (_) {}
    },

    _saveTimers() {
        localStorage.setItem(this._TIMERS_KEY, JSON.stringify(this._timers));
    },

    _saveSchedule() {
        localStorage.setItem(this._SCHEDULE_KEY, JSON.stringify(this._schedule));
    },

    _saveStopwatch() {
        const data = {
            running: this._swRunning,
            elapsed: this._swRunning ? this._swElapsed + (performance.now() - this._swStartTime) : this._swElapsed,
            absStart: this._swRunning ? Date.now() : null,
            laps: this._swLaps,
        };
        localStorage.setItem(this._SW_KEY, JSON.stringify(data));
    },

    _saveBreak() {
        if (this._breakEnd) {
            localStorage.setItem(this._BREAK_KEY, JSON.stringify({ end: this._breakEnd, duration: this._breakDuration }));
        } else {
            localStorage.removeItem(this._BREAK_KEY);
        }
    },

    // ----------------------------------------------------------------
    // Theme
    // ----------------------------------------------------------------
    _themeClass() {
        return 'sc-theme-' + this._theme;
    },

    _setTheme(val) {
        this._theme = val;
        localStorage.setItem(this._THEME_KEY, val);
        const card = document.getElementById('sc-clock-card');
        if (card) card.className = 'sc-clock-card ' + this._themeClass();
    },

    // ----------------------------------------------------------------
    // Full Screen
    // ----------------------------------------------------------------
    _toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Build a fullscreen overlay with all running info
            let overlay = document.getElementById('sc-fs-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sc-fs-overlay';
                overlay.className = 'sc-fs-overlay ' + this._themeClass();
                overlay.innerHTML = `
                    <div class="sc-fs-exit" onclick="document.exitFullscreen()" title="Exit Full Screen"><i class="fas fa-compress"></i></div>
                    <div class="sc-fs-main">
                        <div class="sc-main-time" id="sc-fs-time">00:00:00</div>
                        <div class="sc-main-date" id="sc-fs-date"></div>
                    </div>
                    <div class="sc-fs-panels" id="sc-fs-panels"></div>
                `;
                document.body.appendChild(overlay);
            }
            overlay.className = 'sc-fs-overlay ' + this._themeClass();
            this._updateFsPanels();
            overlay.requestFullscreen().catch(() => UI.toast('Fullscreen not supported', 'warning'));

            // Listen for exit
            const onFsChange = () => {
                if (!document.fullscreenElement) {
                    const ov = document.getElementById('sc-fs-overlay');
                    if (ov) ov.remove();
                    document.removeEventListener('fullscreenchange', onFsChange);
                }
            };
            document.addEventListener('fullscreenchange', onFsChange);
        } else {
            document.exitFullscreen();
        }
    },

    _updateFsPanels() {
        const container = document.getElementById('sc-fs-panels');
        if (!container) return;

        let panels = '';

        // Countdown timers
        if (this._timers.length > 0) {
            const now = new Date();
            const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            panels += '<div class="sc-fs-section">';
            this._timers.forEach(t => {
                const parts = t.target.split(':').map(Number);
                const targetSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                let diff = targetSec - nowSec;
                let display, isShowtime = false, isWarning = false;
                if (diff <= 0) {
                    display = 'SHOW TIME';
                    isShowtime = true;
                } else {
                    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
                    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                    const s = String(diff % 60).padStart(2, '0');
                    display = `${h}:${m}:${s}`;
                    if (diff < 300) isWarning = true;
                }
                panels += `<div class="sc-fs-timer-item ${isWarning ? 'sc-fs-warning' : ''}" style="border-color:${UI.esc(t.color)}">
                    <div class="sc-fs-timer-label" style="color:${UI.esc(t.color)}">${UI.esc(t.name)}</div>
                    <div class="sc-fs-timer-value ${isShowtime ? 'sc-showtime' : ''}" id="sc-fs-tcd-${UI.esc(t.id)}">${display}</div>
                </div>`;
            });
            panels += '</div>';
        }

        // Stopwatch (if running or has elapsed time)
        if (this._swRunning || this._swElapsed > 0) {
            let totalMs = this._swRunning ? this._swElapsed + (performance.now() - this._swStartTime) : this._swElapsed;
            panels += `<div class="sc-fs-section">
                <div class="sc-fs-timer-item" style="border-color:var(--accent)">
                    <div class="sc-fs-timer-label" style="color:var(--accent)">Stopwatch</div>
                    <div class="sc-fs-timer-value" id="sc-fs-sw" style="color:var(--accent)">${this._formatMs(totalMs)}</div>
                </div>
            </div>`;
        }

        // Break timer (if active)
        if (this._breakEnd) {
            const remaining = this._breakEnd - Date.now();
            let display, isWarning = false;
            if (remaining <= 0) {
                display = 'BREAK OVER';
                isWarning = true;
            } else {
                const totalSec = Math.ceil(remaining / 1000);
                const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
                const s = String(totalSec % 60).padStart(2, '0');
                display = `${m}:${s}`;
                if (remaining < 60000) isWarning = true;
            }
            panels += `<div class="sc-fs-section">
                <div class="sc-fs-timer-item ${isWarning ? 'sc-fs-warning' : ''}" style="border-color:#ff9f43">
                    <div class="sc-fs-timer-label" style="color:#ff9f43"><i class="fas fa-mug-hot"></i> Break</div>
                    <div class="sc-fs-timer-value ${isWarning ? 'sc-break-warning' : ''}" id="sc-fs-break">${display}</div>
                </div>
            </div>`;
        }

        // Day Schedule
        if (this._schedule.length > 0) {
            const now = new Date();
            const nowStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const sorted = [...this._schedule].sort((a, b) => a.time.localeCompare(b.time));
            panels += '<div class="sc-fs-schedule" id="sc-fs-schedule">';
            panels += '<div class="sc-fs-schedule-title"><i class="fas fa-calendar-day"></i> Schedule</div>';
            sorted.forEach((item, i) => {
                const isPast = item.time <= nowStr;
                const isCurrent = i < sorted.length - 1
                    ? (nowStr >= item.time && nowStr < sorted[i + 1].time)
                    : nowStr >= item.time;
                panels += `<div class="sc-fs-sched-item ${isPast ? 'sc-fs-sched-past' : ''} ${isCurrent ? 'sc-fs-sched-current' : ''}">
                    <span class="sc-fs-sched-time">${UI.esc(item.time)}</span>
                    <span class="sc-fs-sched-desc">${UI.esc(item.description)}</span>
                </div>`;
            });
            panels += '</div>';
        }

        container.innerHTML = panels;
    },

    _updateFsDOM() {
        // Update fullscreen overlay time
        const timeEl = document.getElementById('sc-fs-time');
        const dateEl = document.getElementById('sc-fs-date');
        if (!timeEl) return;
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${h}:${m}:${s}`;
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // Update countdown timers in FS
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        this._timers.forEach(t => {
            const el = document.getElementById('sc-fs-tcd-' + t.id);
            if (!el) return;
            const parts = t.target.split(':').map(Number);
            const targetSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            let diff = targetSec - nowSec;
            if (diff <= 0) {
                el.textContent = 'SHOW TIME';
                el.classList.add('sc-showtime');
            } else {
                el.classList.remove('sc-showtime');
                el.textContent = `${String(Math.floor(diff / 3600)).padStart(2, '0')}:${String(Math.floor((diff % 3600) / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`;
            }
        });

        // Update stopwatch in FS
        const swEl = document.getElementById('sc-fs-sw');
        if (swEl) {
            let totalMs = this._swRunning ? this._swElapsed + (performance.now() - this._swStartTime) : this._swElapsed;
            swEl.textContent = this._formatMs(totalMs);
        }

        // Update break timer in FS
        const breakEl = document.getElementById('sc-fs-break');
        if (breakEl && this._breakEnd) {
            const remaining = this._breakEnd - Date.now();
            if (remaining <= 0) {
                breakEl.textContent = 'BREAK OVER';
                breakEl.classList.add('sc-break-warning');
            } else {
                const totalSec = Math.ceil(remaining / 1000);
                breakEl.textContent = `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
            }
        }

        // Update schedule highlight in FS (once per minute)
        const fsSchedule = document.getElementById('sc-fs-schedule');
        if (fsSchedule && this._lastFsScheduleMin !== now.getMinutes()) {
            this._lastFsScheduleMin = now.getMinutes();
            this._updateFsPanels();
        }
    },

    // ----------------------------------------------------------------
    // Background Interval (persists even when page not active)
    // ----------------------------------------------------------------
    _ensureBgInterval() {
        if (this._bgInterval) return;
        this._bgInterval = setInterval(() => {
            // Keep stopwatch elapsed up-to-date
            // Break timer checked in RAF loop
        }, 500);
    },

    // ----------------------------------------------------------------
    // RAF Loop — smooth display updates while page is visible
    // ----------------------------------------------------------------
    _startRAF() {
        if (this._rafId) return;
        const tick = () => {
            this._updateClockDOM();
            this._updateTimerDisplays();
            this._updateStopwatchDOM();
            this._updateBreakDOM();
            this._updateScheduleIndicator();
            this._updateFsDOM();
            this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
    },

    _stopRAF() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    },

    // ----------------------------------------------------------------
    // Clock Display
    // ----------------------------------------------------------------
    _updateClockDOM() {
        const now = new Date();
        const timeEl = document.getElementById('sc-main-time');
        const dateEl = document.getElementById('sc-main-date');
        if (timeEl) {
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            timeEl.textContent = `${h}:${m}:${s}`;
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    },

    // ----------------------------------------------------------------
    // Countdown Timers
    // ----------------------------------------------------------------
    _renderTimers() {
        if (this._timers.length === 0) {
            return '<div style="color:var(--text-muted,#888);text-align:center;padding:24px;">No countdown timers. Click <b>Add Timer</b> to create one.</div>';
        }
        return `<div class="sc-timers-row">${this._timers.map(t => this._renderTimerCard(t)).join('')}</div>`;
    },

    _renderTimerCard(t) {
        return `<div class="sc-timer-card" id="sc-timer-${UI.esc(t.id)}" style="border-color:${UI.esc(t.color)}">
            <div class="sc-timer-name" style="color:${UI.esc(t.color)}">${UI.esc(t.name)}</div>
            <div class="sc-timer-target">Target: ${UI.esc(t.target)}</div>
            <div class="sc-timer-countdown" id="sc-tcd-${UI.esc(t.id)}">--:--:--</div>
            <div class="sc-timer-actions">
                <button class="btn btn-xs" onclick="ShowClockPage._editTimer('${UI.esc(t.id)}')" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="btn btn-xs btn-danger" onclick="ShowClockPage._removeTimer('${UI.esc(t.id)}')" title="Remove"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    },

    _updateTimerDisplays() {
        const now = new Date();
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        this._timers.forEach(t => {
            const el = document.getElementById('sc-tcd-' + t.id);
            if (!el) return;
            const parts = t.target.split(':').map(Number);
            if (parts.length !== 3) return;
            const targetSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            let diff = targetSec - nowSec;

            const card = document.getElementById('sc-timer-' + t.id);

            if (diff <= 0) {
                el.textContent = 'SHOW TIME';
                el.classList.add('sc-showtime');
                if (card) card.classList.remove('sc-timer-warning');
            } else {
                el.classList.remove('sc-showtime');
                const h = String(Math.floor(diff / 3600)).padStart(2, '0');
                const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                const s = String(diff % 60).padStart(2, '0');
                el.textContent = `${h}:${m}:${s}`;

                if (diff < 300 && card) {
                    card.classList.add('sc-timer-warning');
                } else if (card) {
                    card.classList.remove('sc-timer-warning');
                }
            }
        });
    },

    _updateTimersDOM() {
        const container = document.getElementById('sc-timers-grid');
        if (container) container.innerHTML = this._renderTimers();
    },

    _addTimerDialog() {
        if (this._timers.length >= 6) {
            UI.toast('Maximum 6 timers allowed', 'warning');
            return;
        }
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${UI.formGroup('Timer Name', '<input type="text" class="form-control" id="sc-dlg-tname" placeholder="e.g. Show Start" maxlength="30">')}
                ${UI.formGroup('Target Time (HH:MM:SS)', '<input type="time" class="form-control" id="sc-dlg-ttime" step="1" value="19:00:00">')}
                ${UI.formGroup('Color', '<input type="color" class="form-control" id="sc-dlg-tcolor" value="#00d4ff" style="width:60px;height:36px;padding:2px;">')}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ShowClockPage._addTimerConfirm()">Add Timer</button>`;
        UI.openModal('Add Countdown Timer', body, footer);
    },

    _addTimerConfirm() {
        const name = (document.getElementById('sc-dlg-tname')?.value || '').trim();
        const time = document.getElementById('sc-dlg-ttime')?.value || '';
        const color = document.getElementById('sc-dlg-tcolor')?.value || '#00d4ff';
        if (!name) { UI.toast('Please enter a timer name', 'warning'); return; }
        if (!time) { UI.toast('Please set a target time', 'warning'); return; }
        const target = time.length === 5 ? time + ':00' : time; // ensure HH:MM:SS
        const id = 't' + Date.now();
        this._timers.push({ id, name, target, color });
        this._saveTimers();
        UI.closeModal();
        this._updateTimersDOM();
        this.renderSidebarList();
        UI.toast(`Timer "${name}" added`, 'success');
    },

    _editTimer(id) {
        const t = this._timers.find(x => x.id === id);
        if (!t) return;
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${UI.formGroup('Timer Name', `<input type="text" class="form-control" id="sc-dlg-tname" value="${UI.esc(t.name)}" maxlength="30">`)}
                ${UI.formGroup('Target Time (HH:MM:SS)', `<input type="time" class="form-control" id="sc-dlg-ttime" step="1" value="${UI.esc(t.target)}">`)}
                ${UI.formGroup('Color', `<input type="color" class="form-control" id="sc-dlg-tcolor" value="${UI.esc(t.color)}" style="width:60px;height:36px;padding:2px;">`)}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ShowClockPage._editTimerConfirm('${UI.esc(id)}')">Save</button>`;
        UI.openModal('Edit Timer', body, footer);
    },

    _editTimerConfirm(id) {
        const t = this._timers.find(x => x.id === id);
        if (!t) return;
        const name = (document.getElementById('sc-dlg-tname')?.value || '').trim();
        const time = document.getElementById('sc-dlg-ttime')?.value || '';
        const color = document.getElementById('sc-dlg-tcolor')?.value || '#00d4ff';
        if (!name) { UI.toast('Please enter a timer name', 'warning'); return; }
        if (!time) { UI.toast('Please set a target time', 'warning'); return; }
        t.name = name;
        t.target = time.length === 5 ? time + ':00' : time;
        t.color = color;
        this._saveTimers();
        UI.closeModal();
        this._updateTimersDOM();
        this.renderSidebarList();
        UI.toast(`Timer "${name}" updated`, 'success');
    },

    _removeTimer(id) {
        const t = this._timers.find(x => x.id === id);
        if (!t) return;
        this._timers = this._timers.filter(x => x.id !== id);
        this._saveTimers();
        this._updateTimersDOM();
        this.renderSidebarList();
        UI.toast(`Timer "${t.name}" removed`, 'info');
    },

    // ----------------------------------------------------------------
    // Stopwatch
    // ----------------------------------------------------------------
    _swToggle() {
        if (this._swRunning) {
            // Stop
            this._swElapsed += performance.now() - this._swStartTime;
            this._swRunning = false;
        } else {
            // Start
            this._swStartTime = performance.now();
            this._swRunning = true;
        }
        this._updateSwButtons();
        this._saveStopwatch();
    },

    _swLap() {
        if (!this._swRunning) return;
        const total = this._swElapsed + (performance.now() - this._swStartTime);
        this._swLaps.push(total);
        const container = document.getElementById('sc-sw-laps');
        if (container) container.innerHTML = this._renderLaps();
        this._saveStopwatch();
    },

    _swReset() {
        this._swRunning = false;
        this._swElapsed = 0;
        this._swStartTime = 0;
        this._swLaps = [];
        this._updateSwButtons();
        const display = document.getElementById('sc-sw-display');
        if (display) display.textContent = '00:00:00.0';
        const container = document.getElementById('sc-sw-laps');
        if (container) container.innerHTML = '';
        this._saveStopwatch();
    },

    _updateSwButtons() {
        const startBtn = document.getElementById('sc-sw-start');
        const lapBtn = document.getElementById('sc-sw-lap');
        if (startBtn) {
            startBtn.innerHTML = this._swRunning
                ? '<i class="fas fa-pause"></i> Stop'
                : '<i class="fas fa-play"></i> Start';
        }
        if (lapBtn) lapBtn.disabled = !this._swRunning;
    },

    _updateStopwatchDOM() {
        const display = document.getElementById('sc-sw-display');
        if (!display) return;
        let totalMs;
        if (this._swRunning) {
            totalMs = this._swElapsed + (performance.now() - this._swStartTime);
        } else {
            totalMs = this._swElapsed;
        }
        display.textContent = this._formatMs(totalMs);
    },

    _formatMs(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        const tenths = String(Math.floor((ms % 1000) / 100));
        return `${h}:${m}:${s}.${tenths}`;
    },

    _renderLaps() {
        if (this._swLaps.length === 0) return '';
        return `<div class="sc-lap-list">${this._swLaps.map((ms, i) => {
            const prev = i > 0 ? this._swLaps[i - 1] : 0;
            const split = ms - prev;
            return `<div class="sc-lap-row">
                <span class="sc-lap-num">Lap ${i + 1}</span>
                <span class="sc-lap-split">${this._formatMs(split)}</span>
                <span class="sc-lap-total">${this._formatMs(ms)}</span>
            </div>`;
        }).reverse().join('')}</div>`;
    },

    // ----------------------------------------------------------------
    // Break Timer
    // ----------------------------------------------------------------
    _startBreak(minutes) {
        this._breakDuration = minutes * 60 * 1000;
        this._breakEnd = Date.now() + this._breakDuration;
        this._saveBreak();
        UI.toast(`${minutes} minute break started`, 'success');
    },

    _cancelBreak() {
        this._breakEnd = null;
        this._breakDuration = 0;
        this._saveBreak();
        const display = document.getElementById('sc-break-display');
        if (display) {
            display.textContent = 'No Break';
            display.classList.remove('sc-break-warning');
        }
    },

    _updateBreakDOM() {
        const display = document.getElementById('sc-break-display');
        if (!display) return;
        if (!this._breakEnd) {
            display.textContent = 'No Break';
            display.classList.remove('sc-break-warning');
            return;
        }
        const remaining = this._breakEnd - Date.now();
        if (remaining <= 0) {
            display.textContent = 'BREAK OVER';
            display.classList.add('sc-break-warning');
            return;
        }
        const totalSec = Math.ceil(remaining / 1000);
        const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        display.textContent = `${m}:${s}`;
        if (remaining < 60000) {
            display.classList.add('sc-break-warning');
        } else {
            display.classList.remove('sc-break-warning');
        }
    },

    // ----------------------------------------------------------------
    // Day Schedule
    // ----------------------------------------------------------------
    _renderSchedule() {
        if (this._schedule.length === 0) {
            return '<div style="color:var(--text-muted,#888);text-align:center;padding:24px;">No schedule items. Click <b>Add Item</b> to create one.</div>';
        }
        const sorted = [...this._schedule].sort((a, b) => a.time.localeCompare(b.time));
        const now = new Date();
        const nowStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        let html = '<div class="sc-schedule-timeline">';
        sorted.forEach((item, i) => {
            const isPast = item.time <= nowStr;
            const isCurrent = i < sorted.length - 1
                ? (nowStr >= item.time && nowStr < sorted[i + 1].time)
                : nowStr >= item.time;
            html += `<div class="sc-schedule-item ${isPast ? 'sc-sched-past' : ''} ${isCurrent ? 'sc-sched-current' : ''}">
                <div class="sc-sched-marker"></div>
                <div class="sc-sched-time">${UI.esc(item.time)}</div>
                <div class="sc-sched-desc">${UI.esc(item.description)}</div>
                <button class="btn btn-xs btn-danger sc-sched-rm" onclick="ShowClockPage._removeSchedule('${UI.esc(item.id)}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    _updateScheduleDOM() {
        const container = document.getElementById('sc-schedule-body');
        if (container) container.innerHTML = this._renderSchedule();
    },

    _updateScheduleIndicator() {
        // Only re-render once per minute to save CPU
        const now = new Date();
        if (this._lastScheduleMin === now.getMinutes()) return;
        this._lastScheduleMin = now.getMinutes();
        this._updateScheduleDOM();
    },

    _addScheduleDialog() {
        const body = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${UI.formGroup('Time (HH:MM)', '<input type="time" class="form-control" id="sc-dlg-stime" value="18:00">')}
                ${UI.formGroup('Description', '<input type="text" class="form-control" id="sc-dlg-sdesc" placeholder="e.g. Sound Check" maxlength="60">')}
            </div>`;
        const footer = `
            <button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ShowClockPage._addScheduleConfirm()">Add</button>`;
        UI.openModal('Add Schedule Item', body, footer);
    },

    _addScheduleConfirm() {
        const time = document.getElementById('sc-dlg-stime')?.value || '';
        const desc = (document.getElementById('sc-dlg-sdesc')?.value || '').trim();
        if (!time) { UI.toast('Please set a time', 'warning'); return; }
        if (!desc) { UI.toast('Please enter a description', 'warning'); return; }
        const id = 's' + Date.now();
        this._schedule.push({ id, time, description: desc });
        this._saveSchedule();
        UI.closeModal();
        this._updateScheduleDOM();
        this.renderSidebarList();
        UI.toast(`Schedule item "${desc}" added`, 'success');
    },

    _removeSchedule(id) {
        const item = this._schedule.find(x => x.id === id);
        this._schedule = this._schedule.filter(x => x.id !== id);
        this._saveSchedule();
        this._updateScheduleDOM();
        this.renderSidebarList();
        if (item) UI.toast(`"${item.description}" removed`, 'info');
    },
};


/* =====================================================================
   Injected CSS — scoped to sc- prefix
   ===================================================================== */
(function injectShowClockStyles() {
    if (document.getElementById('showclock-css')) return;
    const style = document.createElement('style');
    style.id = 'showclock-css';
    style.textContent = `

/* ---- Main Clock Card ---- */
.sc-clock-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px 28px;
    background: #000;
    border-radius: 10px;
    border: 1px solid var(--border, #2a2a3e);
    box-shadow: inset 0 2px 20px rgba(0,0,0,0.6);
    min-height: 180px;
    transition: background 0.3s;
}
.sc-main-time {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(60px, 12vw, 120px);
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1;
    user-select: all;
    transition: color 0.3s, text-shadow 0.3s;
}
.sc-main-date {
    margin-top: 10px;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: 0.04em;
    opacity: 0.75;
    transition: color 0.3s;
}

/* Themes */
.sc-theme-white .sc-main-time { color: #ffffff; text-shadow: 0 0 30px rgba(255,255,255,0.3); }
.sc-theme-white .sc-main-date { color: #aaaaaa; }

.sc-theme-green .sc-main-time { color: #00ff66; text-shadow: 0 0 30px rgba(0,255,102,0.4), 0 0 8px rgba(0,255,102,0.2); }
.sc-theme-green .sc-main-date { color: #66cc88; }

.sc-theme-red .sc-main-time { color: #ff3333; text-shadow: 0 0 30px rgba(255,51,51,0.4), 0 0 8px rgba(255,51,51,0.2); }
.sc-theme-red .sc-main-date { color: #cc6666; }

/* ---- Countdown Timers Grid ---- */
.sc-timers-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
}
.sc-timer-card {
    background: var(--bg-secondary, #1a1a2e);
    border: 2px solid var(--border, #2a2a3e);
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    transition: border-color 0.3s, box-shadow 0.3s;
    position: relative;
}
.sc-timer-name {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
}
.sc-timer-target {
    font-size: 11px;
    color: var(--text-muted, #888);
    margin-bottom: 8px;
}
.sc-timer-countdown {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 700;
    color: var(--text-primary, #eee);
    letter-spacing: 0.05em;
}
.sc-timer-countdown.sc-showtime {
    color: #00ff66;
    text-shadow: 0 0 12px rgba(0,255,102,0.5);
    animation: sc-pulse 1s ease-in-out infinite;
}
.sc-timer-actions {
    margin-top: 10px;
    display: flex;
    gap: 6px;
    justify-content: center;
}

/* Warning state — <5 min */
.sc-timer-warning {
    border-color: #ff3333 !important;
    box-shadow: 0 0 16px rgba(255,51,51,0.3);
    animation: sc-flash-border 1s ease-in-out infinite;
}
.sc-timer-warning .sc-timer-countdown {
    color: #ff3333;
    text-shadow: 0 0 10px rgba(255,51,51,0.5);
}

@keyframes sc-flash-border {
    0%, 100% { box-shadow: 0 0 8px rgba(255,51,51,0.2); }
    50% { box-shadow: 0 0 24px rgba(255,51,51,0.5); }
}
@keyframes sc-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* ---- Stopwatch ---- */
.sc-stopwatch-display {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 700;
    color: var(--accent, #00d4ff);
    text-shadow: 0 0 16px rgba(0,212,255,0.3);
    letter-spacing: 0.04em;
}
.sc-lap-list {
    margin-top: 12px;
    max-height: 200px;
    overflow-y: auto;
    text-align: left;
}
.sc-lap-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    color: var(--text-secondary, #bbb);
    border-bottom: 1px solid var(--border, #2a2a3e);
}
.sc-lap-num { color: var(--text-muted, #888); min-width: 50px; }
.sc-lap-split { color: var(--accent, #00d4ff); }
.sc-lap-total { color: var(--text-primary, #eee); }

/* ---- Break Timer ---- */
.sc-break-display {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 700;
    color: var(--text-primary, #eee);
    letter-spacing: 0.04em;
    transition: color 0.3s;
}
.sc-break-display.sc-break-warning {
    color: #ff3333;
    text-shadow: 0 0 12px rgba(255,51,51,0.5);
    animation: sc-pulse 0.8s ease-in-out infinite;
}

/* ---- Day Schedule Timeline ---- */
.sc-schedule-timeline {
    position: relative;
    padding-left: 20px;
    border-left: 2px solid var(--border, #2a2a3e);
    margin-left: 12px;
}
.sc-schedule-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 8px;
    position: relative;
    transition: background 0.2s;
    border-radius: 6px;
}
.sc-schedule-item:hover { background: rgba(255,255,255,0.03); }
.sc-sched-marker {
    position: absolute;
    left: -27px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--border, #2a2a3e);
    border: 2px solid var(--bg-primary, #111);
    transition: background 0.3s;
}
.sc-sched-current .sc-sched-marker {
    background: var(--accent, #00d4ff);
    box-shadow: 0 0 8px rgba(0,212,255,0.5);
}
.sc-sched-past .sc-sched-marker { background: var(--text-muted, #888); }
.sc-sched-time {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #eee);
    min-width: 50px;
}
.sc-sched-desc {
    font-size: 13px;
    color: var(--text-secondary, #bbb);
    flex: 1;
}
.sc-sched-past .sc-sched-time { color: var(--text-muted, #888); text-decoration: line-through; }
.sc-sched-past .sc-sched-desc { color: var(--text-muted, #888); text-decoration: line-through; }
.sc-sched-current {
    background: rgba(0, 212, 255, 0.06);
    border-left: 3px solid var(--accent, #00d4ff);
    margin-left: -3px;
}
.sc-sched-rm { opacity: 0; transition: opacity 0.2s; }
.sc-schedule-item:hover .sc-sched-rm { opacity: 1; }

/* ---- Sidebar Items ---- */
.sc-sidebar-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 12px;
    transition: background 0.15s;
}
.sc-sidebar-item:hover { background: rgba(255,255,255,0.05); }
.sc-sidebar-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.sc-sidebar-label {
    flex: 1;
    color: var(--text-secondary, #bbb);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.sc-sidebar-time {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: var(--text-muted, #888);
}

/* ---- Fullscreen Overlay ---- */
.sc-fs-overlay {
    position: fixed;
    inset: 0;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    gap: 24px;
    padding: 40px;
}
.sc-fs-exit {
    position: absolute;
    top: 16px;
    right: 20px;
    color: rgba(255,255,255,0.3);
    font-size: 20px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;
    z-index: 10;
}
.sc-fs-exit:hover { color: #fff; background: rgba(255,255,255,0.08); }
.sc-fs-main { text-align: center; }
.sc-fs-panels {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    max-width: 100%;
    width: 100%;
    padding: 0 20px;
}
.sc-fs-section {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
}
.sc-fs-timer-item {
    background: rgba(255,255,255,0.04);
    border: 2px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    padding: 16px 28px;
    text-align: center;
    min-width: 180px;
    transition: border-color 0.3s, box-shadow 0.3s;
}
.sc-fs-timer-label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
}
.sc-fs-timer-value {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(28px, 5vw, 48px);
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.04em;
}
.sc-fs-warning {
    border-color: #ff3333 !important;
    box-shadow: 0 0 20px rgba(255,51,51,0.3);
    animation: sc-flash-border 1s ease-in-out infinite;
}
.sc-fs-warning .sc-fs-timer-value {
    color: #ff3333;
}

/* ---- Fullscreen Schedule ---- */
.sc-fs-schedule {
    width: 100%;
    max-width: 600px;
    margin-top: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 14px 18px;
    text-align: left;
}
.sc-fs-schedule-title {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.5);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.sc-fs-sched-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 6px 8px;
    border-radius: 6px;
    transition: background 0.2s;
}
.sc-fs-sched-time {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    min-width: 55px;
}
.sc-fs-sched-desc {
    font-size: 14px;
    color: rgba(255,255,255,0.65);
}
.sc-fs-sched-current {
    background: rgba(0,212,255,0.1);
    border-left: 3px solid var(--accent, #00d4ff);
    padding-left: 11px;
}
.sc-fs-sched-current .sc-fs-sched-time { color: var(--accent, #00d4ff); }
.sc-fs-sched-current .sc-fs-sched-desc { color: rgba(255,255,255,0.9); }
.sc-fs-sched-past .sc-fs-sched-time { color: rgba(255,255,255,0.3); text-decoration: line-through; }
.sc-fs-sched-past .sc-fs-sched-desc { color: rgba(255,255,255,0.3); text-decoration: line-through; }

/* ---- Utility ---- */
.btn-xs {
    padding: 3px 8px;
    font-size: 11px;
    border-radius: 4px;
}
`;
    document.head.appendChild(style);
})();
