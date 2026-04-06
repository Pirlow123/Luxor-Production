/**
 * Timecode Generator Page — SMPTE 12M-compliant timecode generator, converter & calculator
 * Based on SuperTimecodeConverter (C++ SMPTE timecode tool), rebuilt in vanilla JS.
 * Supports all standard frame rates including drop-frame (29.97 DF, 59.94 DF).
 */
const TimecodeGenPage = {

    // ----------------------------------------------------------------
    // State
    // ----------------------------------------------------------------
    _running: false,
    _mode: 'stopped',          // 'running' | 'paused' | 'stopped'
    _countdownMode: false,
    _countdownTarget: 0,       // total frames for countdown target

    // Generator timing
    _startTime: 0,             // performance.now() when started
    _startFrameOffset: 0,      // frame offset from start TC
    _pauseElapsed: 0,          // accumulated ms when paused
    _currentTotalFrames: 0,    // current display frame count
    _rafId: null,              // requestAnimationFrame handle

    // Frame rate
    _fps: 25,
    _fpsActual: 25,            // actual numeric fps (e.g. 29.97)
    _fpsNominal: 30,           // nominal integer fps for math
    _dropFrame: false,

    // Offset
    _offsetFrames: 0,

    // Start TC
    _startH: 0,
    _startM: 0,
    _startS: 0,
    _startF: 0,

    // Tap tempo
    _tapTimes: [],
    _tapBPM: 0,

    // Output devices
    _midiAccess: null,
    _midiOutputId: null,
    _midiOutput: null,
    _mtcEnabled: false,
    _mtcLastQF: -1,            // last quarter-frame sent
    _ltcEnabled: false,
    _ltcAudioCtx: null,
    _ltcGainNode: null,
    _ltcOutputDeviceId: '',
    _artnetEnabled: false,
    _artnetIp: '255.255.255.255',
    _artnetPort: 6454,

    // Settings persistence key
    _STORAGE_KEY: 'luxor_tcgen_settings',
    _STATE_KEY: 'luxor_tcgen_state',

    // Frame rate definitions: [label, actualFps, nominalFps, isDropFrame]
    _FRAME_RATES: [
        ['23.976 fps (Cinema Pulldown)',  23.976, 24, false],
        ['24 fps (Cinema)',               24,     24, false],
        ['25 fps (PAL/EBU)',              25,     25, false],
        ['29.97 fps NDF (NTSC)',          29.97,  30, false],
        ['29.97 fps DF (NTSC Drop)',      29.97,  30, true],
        ['30 fps',                        30,     30, false],
        ['50 fps (PAL High-Speed)',       50,     50, false],
        ['59.94 fps DF (NTSC HS Drop)',   59.94,  60, true],
        ['60 fps',                        60,     60, false],
    ],

    // ----------------------------------------------------------------
    // SMPTE Timecode Math
    // ----------------------------------------------------------------

    /** Number of frames skipped per minute for drop-frame at given nominal fps */
    _dropCount(nomFps) {
        // 29.97 DF skips 2, 59.94 DF skips 4
        return nomFps === 60 ? 4 : 2;
    },

    /** TC components to total frame count (drop-frame) */
    _tcToFramesDF(h, m, s, f, nomFps) {
        const d = this._dropCount(nomFps);
        const totalMinutes = h * 60 + m;
        const dropped = d * (totalMinutes - Math.floor(totalMinutes / 10));
        return (h * 3600 + m * 60 + s) * nomFps + f - dropped;
    },

    /** Total frame count to TC components (drop-frame) */
    _framesToTcDF(totalFrames, nomFps) {
        const d = this._dropCount(nomFps);
        const framesPerMin = nomFps * 60 - d;               // 1798 for 30, 3596 for 60
        const framesPer10Min = framesPerMin * 10 + d;        // 17982 for 30, 35964 for 60
        const block10 = Math.floor(totalFrames / framesPer10Min);
        const rem = totalFrames % framesPer10Min;
        let adj;
        if (rem < d) {
            adj = totalFrames + 9 * d * block10;
        } else {
            adj = totalFrames + d * (9 * block10 + Math.floor((rem - d) / framesPerMin));
        }
        return {
            h: Math.floor(adj / (nomFps * 3600)) % 24,
            m: Math.floor(adj / (nomFps * 60)) % 60,
            s: Math.floor(adj / nomFps) % 60,
            f: adj % nomFps
        };
    },

    /** TC components to total frame count (non-drop-frame) */
    _tcToFramesNDF(h, m, s, f, nomFps) {
        return h * 3600 * nomFps + m * 60 * nomFps + s * nomFps + f;
    },

    /** Total frame count to TC components (non-drop-frame) */
    _framesToTcNDF(totalFrames, nomFps) {
        const absFrames = Math.abs(totalFrames);
        return {
            h: Math.floor(absFrames / (nomFps * 3600)) % 24,
            m: Math.floor(absFrames / (nomFps * 60)) % 60,
            s: Math.floor(absFrames / nomFps) % 60,
            f: absFrames % nomFps
        };
    },

    /** Generic TC to frames using current settings */
    _tcToFrames(h, m, s, f) {
        return this._dropFrame
            ? this._tcToFramesDF(h, m, s, f, this._fpsNominal)
            : this._tcToFramesNDF(h, m, s, f, this._fpsNominal);
    },

    /** Generic frames to TC using current settings */
    _framesToTc(totalFrames) {
        return this._dropFrame
            ? this._framesToTcDF(totalFrames, this._fpsNominal)
            : this._framesToTcNDF(totalFrames, this._fpsNominal);
    },

    /** TC to milliseconds */
    _tcToMs(h, m, s, f, fps, df, nomFps) {
        const frames = df
            ? this._tcToFramesDF(h, m, s, f, nomFps)
            : this._tcToFramesNDF(h, m, s, f, nomFps);
        return frames / fps * 1000;
    },

    /** Milliseconds to TC */
    _msToTc(ms, fps, df, nomFps) {
        const totalFrames = Math.floor(ms / 1000 * fps);
        return df
            ? this._framesToTcDF(totalFrames, nomFps)
            : this._framesToTcNDF(totalFrames, nomFps);
    },

    /** Frame rate conversion preserving real-time position */
    _convertFrameRate(h, m, s, f, fromFps, fromDF, fromNom, toFps, toDF, toNom) {
        const srcFrames = fromDF
            ? this._tcToFramesDF(h, m, s, f, fromNom)
            : this._tcToFramesNDF(h, m, s, f, fromNom);
        const ms = srcFrames / fromFps * 1000;
        const dstFrames = Math.floor(ms / 1000 * toFps);
        return toDF
            ? this._framesToTcDF(dstFrames, toNom)
            : this._framesToTcNDF(dstFrames, toNom);
    },

    /** Max total frames before 24h wrap */
    _maxFrames(nomFps, df) {
        return df
            ? this._tcToFramesDF(23, 59, 59, nomFps - 1, nomFps) + 1
            : 24 * 3600 * nomFps;
    },

    /** Wrap frame count into 0..maxFrames-1 */
    _wrapFrames(frames, nomFps, df) {
        const max = this._maxFrames(nomFps, df);
        return ((frames % max) + max) % max;
    },

    // ----------------------------------------------------------------
    // Formatting helpers
    // ----------------------------------------------------------------
    _pad(n) {
        return String(Math.floor(Math.abs(n))).padStart(2, '0');
    },

    _formatTcObj(tc, df) {
        const sep = df ? ';' : ':';
        return `${this._pad(tc.h)}:${this._pad(tc.m)}:${this._pad(tc.s)}${sep}${this._pad(tc.f)}`;
    },

    _formatCurrentTc() {
        const tc = this._framesToTc(this._currentTotalFrames);
        return this._formatTcObj(tc, this._dropFrame);
    },

    /** Parse a TC string like "01:02:03:04" or "01:02:03;04" into {h,m,s,f,df} */
    _parseTcString(str) {
        if (!str) return null;
        str = str.trim();
        const df = str.includes(';');
        const parts = str.replace(/;/g, ':').split(':');
        if (parts.length !== 4) return null;
        const nums = parts.map(p => parseInt(p, 10));
        if (nums.some(isNaN)) return null;
        return { h: nums[0], m: nums[1], s: nums[2], f: nums[3], df };
    },

    // ----------------------------------------------------------------
    // Drop-Frame Validation
    // ----------------------------------------------------------------
    _isValidTc(h, m, s, f, nomFps, df) {
        if (h < 0 || h > 23) return false;
        if (m < 0 || m > 59) return false;
        if (s < 0 || s > 59) return false;
        if (f < 0 || f >= nomFps) return false;
        // Drop-frame: frames 0..(d-1) are skipped at non-10th minute boundaries
        if (df) {
            const d = this._dropCount(nomFps);
            if (s === 0 && f < d && (m % 10 !== 0)) return false;
        }
        return true;
    },

    // ----------------------------------------------------------------
    // Generator Engine
    // ----------------------------------------------------------------
    _generatorTick() {
        if (this._mode !== 'running') return;

        const elapsed = performance.now() - this._startTime;
        let totalFrames = Math.floor(elapsed / 1000 * this._fpsActual) + this._startFrameOffset + this._offsetFrames;
        totalFrames = this._wrapFrames(totalFrames, this._fpsNominal, this._dropFrame);

        if (this._countdownMode) {
            let remaining = this._countdownTarget - totalFrames;
            if (remaining <= 0) {
                remaining = 0;
                this._stop();
                UI.toast('Countdown complete!', 'success');
            }
            this._currentTotalFrames = remaining;
        } else {
            this._currentTotalFrames = totalFrames;
        }

        this._updateMainDisplay();
        // Send output signals on each new frame
        this._sendOutputs();
        this._rafId = requestAnimationFrame(() => this._generatorTick());
    },

    _play() {
        if (this._mode === 'running') return;

        if (this._mode === 'paused') {
            // Resume from pause — adjust _absStartTime by how long we were paused
            const pauseDuration = Date.now() - this._absPauseTime;
            this._absStartTime += pauseDuration;
            this._startTime = performance.now() - this._pauseElapsed;
        } else {
            // Fresh start
            this._startFrameOffset = this._tcToFrames(this._startH, this._startM, this._startS, this._startF);
            this._startTime = performance.now();
            this._absStartTime = Date.now();
            this._pauseElapsed = 0;
        }

        this._mode = 'running';
        this._running = true;
        this._saveState();
        this._updateTransportButtons();
        this._generatorTick();
    },

    _pause() {
        if (this._mode !== 'running') return;
        this._pauseElapsed = performance.now() - this._startTime;
        this._absPauseTime = Date.now();
        this._mode = 'paused';
        this._running = false;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        if (this._bgTimer) { clearInterval(this._bgTimer); this._bgTimer = null; }
        this._saveState();
        this._updateTransportButtons();
        this._updateTopbarTc();
    },

    _stop() {
        this._mode = 'stopped';
        this._running = false;
        this._pauseElapsed = 0;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        if (this._bgTimer) { clearInterval(this._bgTimer); this._bgTimer = null; }
        this._currentTotalFrames = this._tcToFrames(this._startH, this._startM, this._startS, this._startF);
        this._saveState();
        this._updateMainDisplay();
        this._updateTransportButtons();
        this._updateTopbarTc();
    },

    _reset() {
        this._stop();
        this._startH = 0;
        this._startM = 0;
        this._startS = 0;
        this._startF = 0;
        this._offsetFrames = 0;
        this._countdownMode = false;
        this._currentTotalFrames = 0;
        this._updateMainDisplay();
        this._updateStartTcInputs();

        const offsetEl = document.getElementById('tcg-offset-input');
        if (offsetEl) offsetEl.value = '00:00:00:00';
        const cdEl = document.getElementById('tcg-countdown-toggle');
        if (cdEl) cdEl.checked = false;
    },

    // ----------------------------------------------------------------
    // UI Update Helpers
    // ----------------------------------------------------------------
    _updateMainDisplay() {
        const el = document.getElementById('tcg-main-display');
        if (el) el.textContent = this._formatCurrentTc();

        // Update frame counter
        const frEl = document.getElementById('tcg-frame-counter');
        if (frEl) frEl.textContent = 'Frame: ' + this._currentTotalFrames;

        // Always update topbar timecode
        this._updateTopbarTc();
    },

    _updateTransportButtons() {
        const playBtn = document.getElementById('tcg-btn-play');
        const pauseBtn = document.getElementById('tcg-btn-pause');
        const stopBtn = document.getElementById('tcg-btn-stop');
        if (playBtn) {
            playBtn.disabled = this._mode === 'running';
            playBtn.classList.toggle('active', this._mode === 'running');
        }
        if (pauseBtn) {
            pauseBtn.disabled = this._mode !== 'running';
            pauseBtn.classList.toggle('active', this._mode === 'paused');
        }
        if (stopBtn) {
            stopBtn.disabled = this._mode === 'stopped';
        }
    },

    _updateStartTcInputs() {
        const ids = ['tcg-start-hh', 'tcg-start-mm', 'tcg-start-ss', 'tcg-start-ff'];
        const vals = [this._startH, this._startM, this._startS, this._startF];
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.value = vals[i];
        });
    },

    _updateJamSync() {
        const el = document.getElementById('tcg-jam-sync');
        if (!el) return;
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();
        const ms = now.getMilliseconds();
        const f = Math.floor(ms / 1000 * this._fpsActual);
        const sep = this._dropFrame ? ';' : ':';
        el.textContent = `${this._pad(h)}:${this._pad(m)}:${this._pad(s)}${sep}${this._pad(f)}`;
    },

    // ----------------------------------------------------------------
    // Frame Rate Selection
    // ----------------------------------------------------------------
    _setFrameRate(index) {
        const rate = this._FRAME_RATES[index];
        if (!rate) return;
        this._fpsActual = rate[1];
        this._fpsNominal = rate[2];
        this._dropFrame = rate[3];
        this._fps = rate[1];

        const labelEl = document.getElementById('tcg-fps-label');
        if (labelEl) labelEl.textContent = rate[0];

        const dfEl = document.getElementById('tcg-df-indicator');
        if (dfEl) {
            dfEl.textContent = rate[3] ? 'DF' : 'NDF';
            dfEl.className = 'tcg-df-badge ' + (rate[3] ? 'tcg-df-active' : 'tcg-df-inactive');
        }

        // If stopped, recalculate display from start TC
        if (this._mode === 'stopped') {
            this._currentTotalFrames = this._tcToFrames(this._startH, this._startM, this._startS, this._startF);
            this._updateMainDisplay();
        }

        this._saveSettings();
    },

    // ----------------------------------------------------------------
    // Start TC input
    // ----------------------------------------------------------------
    _applyStartTc() {
        const h = parseInt(document.getElementById('tcg-start-hh')?.value || '0', 10);
        const m = parseInt(document.getElementById('tcg-start-mm')?.value || '0', 10);
        const s = parseInt(document.getElementById('tcg-start-ss')?.value || '0', 10);
        const f = parseInt(document.getElementById('tcg-start-ff')?.value || '0', 10);

        if (!this._isValidTc(h, m, s, f, this._fpsNominal, this._dropFrame)) {
            UI.toast('Invalid timecode for current frame rate', 'error');
            return;
        }

        this._startH = h;
        this._startM = m;
        this._startS = s;
        this._startF = f;

        if (this._mode === 'stopped') {
            this._currentTotalFrames = this._tcToFrames(h, m, s, f);
            this._updateMainDisplay();
        }

        UI.toast('Start TC set to ' + this._formatTcObj({ h, m, s, f }, this._dropFrame), 'info');
        this._saveSettings();
    },

    // ----------------------------------------------------------------
    // Offset
    // ----------------------------------------------------------------
    _applyOffset() {
        const val = document.getElementById('tcg-offset-input')?.value || '00:00:00:00';
        const sign = document.getElementById('tcg-offset-sign')?.value || '+';
        const parsed = this._parseTcString(val);
        if (!parsed) {
            UI.toast('Invalid offset timecode', 'error');
            return;
        }
        let frames = this._dropFrame
            ? this._tcToFramesDF(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsNominal)
            : this._tcToFramesNDF(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsNominal);
        if (sign === '-') frames = -frames;
        this._offsetFrames = frames;
        UI.toast('Offset applied: ' + sign + val, 'info');
    },

    // ----------------------------------------------------------------
    // Countdown
    // ----------------------------------------------------------------
    _toggleCountdown() {
        this._countdownMode = document.getElementById('tcg-countdown-toggle')?.checked || false;
        if (this._countdownMode) {
            const val = document.getElementById('tcg-countdown-target')?.value || '01:00:00:00';
            const parsed = this._parseTcString(val);
            if (!parsed) {
                UI.toast('Invalid countdown target', 'error');
                const cb = document.getElementById('tcg-countdown-toggle');
                if (cb) cb.checked = false;
                this._countdownMode = false;
                return;
            }
            this._countdownTarget = this._dropFrame
                ? this._tcToFramesDF(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsNominal)
                : this._tcToFramesNDF(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsNominal);
            UI.toast('Countdown mode enabled', 'info');
        }
    },

    // ----------------------------------------------------------------
    // Tap Tempo
    // ----------------------------------------------------------------
    _tap() {
        const now = performance.now();
        this._tapTimes.push(now);
        // Keep last 8 taps
        if (this._tapTimes.length > 8) this._tapTimes.shift();

        if (this._tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < this._tapTimes.length; i++) {
                intervals.push(this._tapTimes[i] - this._tapTimes[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            this._tapBPM = Math.round(60000 / avgInterval * 10) / 10;

            const bpmEl = document.getElementById('tcg-tap-bpm');
            if (bpmEl) bpmEl.textContent = this._tapBPM + ' BPM';

            const fIntEl = document.getElementById('tcg-tap-frame-interval');
            if (fIntEl) {
                const framesPerBeat = this._fpsActual * 60 / this._tapBPM;
                fIntEl.textContent = framesPerBeat.toFixed(2) + ' frames/beat';
            }
        }

        // Reset if no tap within 3 seconds
        clearTimeout(this._tapResetTimer);
        this._tapResetTimer = setTimeout(() => {
            this._tapTimes = [];
        }, 3000);
    },

    // ----------------------------------------------------------------
    // Converter
    // ----------------------------------------------------------------
    _convertTcToFrames() {
        const val = document.getElementById('tcg-conv-tc')?.value || '';
        const parsed = this._parseTcString(val);
        if (!parsed) { UI.toast('Invalid TC input', 'error'); return; }
        const frames = this._dropFrame
            ? this._tcToFramesDF(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsNominal)
            : this._tcToFramesNDF(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsNominal);
        const el = document.getElementById('tcg-conv-result');
        if (el) el.textContent = frames + ' frames';
    },

    _convertFramesToTc() {
        const val = parseInt(document.getElementById('tcg-conv-frames')?.value || '0', 10);
        if (isNaN(val) || val < 0) { UI.toast('Invalid frame count', 'error'); return; }
        const tc = this._framesToTc(val);
        const el = document.getElementById('tcg-conv-result');
        if (el) el.textContent = this._formatTcObj(tc, this._dropFrame);
    },

    _convertTcToMs() {
        const val = document.getElementById('tcg-conv-tc')?.value || '';
        const parsed = this._parseTcString(val);
        if (!parsed) { UI.toast('Invalid TC input', 'error'); return; }
        const ms = this._tcToMs(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsActual, this._dropFrame, this._fpsNominal);
        const el = document.getElementById('tcg-conv-result');
        if (el) el.textContent = ms.toFixed(3) + ' ms';
    },

    _convertMsToTc() {
        const val = parseFloat(document.getElementById('tcg-conv-ms')?.value || '0');
        if (isNaN(val) || val < 0) { UI.toast('Invalid milliseconds', 'error'); return; }
        const tc = this._msToTc(val, this._fpsActual, this._dropFrame, this._fpsNominal);
        const el = document.getElementById('tcg-conv-result');
        if (el) el.textContent = this._formatTcObj(tc, this._dropFrame);
    },

    _convertTcToSeconds() {
        const val = document.getElementById('tcg-conv-tc')?.value || '';
        const parsed = this._parseTcString(val);
        if (!parsed) { UI.toast('Invalid TC input', 'error'); return; }
        const ms = this._tcToMs(parsed.h, parsed.m, parsed.s, parsed.f, this._fpsActual, this._dropFrame, this._fpsNominal);
        const el = document.getElementById('tcg-conv-result');
        if (el) el.textContent = (ms / 1000).toFixed(6) + ' seconds';
    },

    _convertFrameRateAtoB() {
        const val = document.getElementById('tcg-conv-tc')?.value || '';
        const parsed = this._parseTcString(val);
        if (!parsed) { UI.toast('Invalid TC input', 'error'); return; }

        const fromIdx = parseInt(document.getElementById('tcg-conv-from-fps')?.value || '0', 10);
        const toIdx = parseInt(document.getElementById('tcg-conv-to-fps')?.value || '0', 10);
        const from = this._FRAME_RATES[fromIdx];
        const to = this._FRAME_RATES[toIdx];
        if (!from || !to) return;

        const result = this._convertFrameRate(
            parsed.h, parsed.m, parsed.s, parsed.f,
            from[1], from[3], from[2],
            to[1], to[3], to[2]
        );
        const el = document.getElementById('tcg-conv-result');
        if (el) el.textContent = this._formatTcObj(result, to[3]);
    },

    // ----------------------------------------------------------------
    // Calculator
    // ----------------------------------------------------------------
    _calcAdd() {
        const a = this._parseTcString(document.getElementById('tcg-calc-a')?.value);
        const b = this._parseTcString(document.getElementById('tcg-calc-b')?.value);
        if (!a || !b) { UI.toast('Invalid TC input', 'error'); return; }
        const fa = this._tcToFrames(a.h, a.m, a.s, a.f);
        const fb = this._tcToFrames(b.h, b.m, b.s, b.f);
        const result = this._wrapFrames(fa + fb, this._fpsNominal, this._dropFrame);
        const tc = this._framesToTc(result);
        const el = document.getElementById('tcg-calc-result');
        if (el) el.textContent = this._formatTcObj(tc, this._dropFrame);
    },

    _calcSubtract() {
        const a = this._parseTcString(document.getElementById('tcg-calc-a')?.value);
        const b = this._parseTcString(document.getElementById('tcg-calc-b')?.value);
        if (!a || !b) { UI.toast('Invalid TC input', 'error'); return; }
        const fa = this._tcToFrames(a.h, a.m, a.s, a.f);
        const fb = this._tcToFrames(b.h, b.m, b.s, b.f);
        const diff = fa - fb;
        const negative = diff < 0;
        const result = this._wrapFrames(Math.abs(diff), this._fpsNominal, this._dropFrame);
        const tc = this._framesToTc(result);
        const el = document.getElementById('tcg-calc-result');
        if (el) el.textContent = (negative ? '-' : '') + this._formatTcObj(tc, this._dropFrame);
    },

    _calcDuration() {
        const a = this._parseTcString(document.getElementById('tcg-calc-a')?.value);
        const b = this._parseTcString(document.getElementById('tcg-calc-b')?.value);
        if (!a || !b) { UI.toast('Invalid TC input', 'error'); return; }
        const fa = this._tcToFrames(a.h, a.m, a.s, a.f);
        const fb = this._tcToFrames(b.h, b.m, b.s, b.f);
        const dur = Math.abs(fb - fa);
        const tc = this._framesToTc(dur);
        const el = document.getElementById('tcg-calc-result');
        if (el) el.textContent = this._formatTcObj(tc, this._dropFrame) + ' (' + dur + ' frames)';
    },

    _calcMultiply() {
        const a = this._parseTcString(document.getElementById('tcg-calc-a')?.value);
        const n = parseFloat(document.getElementById('tcg-calc-mult')?.value || '1');
        if (!a || isNaN(n)) { UI.toast('Invalid input', 'error'); return; }
        const fa = this._tcToFrames(a.h, a.m, a.s, a.f);
        const result = this._wrapFrames(Math.round(fa * n), this._fpsNominal, this._dropFrame);
        const tc = this._framesToTc(result);
        const el = document.getElementById('tcg-calc-result');
        if (el) el.textContent = this._formatTcObj(tc, this._dropFrame);
    },

    // ----------------------------------------------------------------
    // Validator
    // ----------------------------------------------------------------
    _validate() {
        const val = document.getElementById('tcg-validate-input')?.value || '';
        const parsed = this._parseTcString(val);
        const el = document.getElementById('tcg-validate-result');
        if (!el) return;

        if (!parsed) {
            el.innerHTML = '<span class="tcg-invalid">Invalid format. Use HH:MM:SS:FF or HH:MM:SS;FF</span>';
            return;
        }

        const { h, m, s, f } = parsed;
        const lines = [];
        const valid = this._isValidTc(h, m, s, f, this._fpsNominal, this._dropFrame);

        if (valid) {
            lines.push('<span class="tcg-valid">Valid timecode for ' + UI.esc(this._fpsActual + ' fps' + (this._dropFrame ? ' DF' : ' NDF')) + '</span>');
        } else {
            lines.push('<span class="tcg-invalid">Invalid timecode for ' + UI.esc(this._fpsActual + ' fps' + (this._dropFrame ? ' DF' : ' NDF')) + '</span>');
        }

        // Show why invalid
        if (h < 0 || h > 23) lines.push('<span class="tcg-invalid">Hours must be 0-23</span>');
        if (m < 0 || m > 59) lines.push('<span class="tcg-invalid">Minutes must be 0-59</span>');
        if (s < 0 || s > 59) lines.push('<span class="tcg-invalid">Seconds must be 0-59</span>');
        if (f < 0 || f >= this._fpsNominal) lines.push('<span class="tcg-invalid">Frames must be 0-' + (this._fpsNominal - 1) + ' at ' + this._fpsNominal + ' fps nominal</span>');

        if (this._dropFrame && s === 0 && f < this._dropCount(this._fpsNominal) && (m % 10 !== 0)) {
            const d = this._dropCount(this._fpsNominal);
            lines.push('<span class="tcg-invalid">Drop-frame: frames 0-' + (d - 1) + ' are skipped at minute ' + m + ' (not a 10th minute)</span>');
        }

        // Max values
        lines.push('<span class="text-muted" style="font-size:11px;">Max TC: 23:59:59:' + this._pad(this._fpsNominal - 1) + ' | Max frames: ' + (this._maxFrames(this._fpsNominal, this._dropFrame) - 1) + '</span>');

        el.innerHTML = lines.join('<br>');
    },

    // ----------------------------------------------------------------
    // OUTPUT: MIDI Timecode (MTC)
    // ----------------------------------------------------------------
    async _initMidi() {
        if (this._midiAccess) return;
        try {
            this._midiAccess = await navigator.requestMIDIAccess({ sysex: true });
            this._midiAccess.onstatechange = () => this._updateMidiDeviceList();
        } catch (e) {
            console.warn('MIDI not available:', e);
        }
    },

    _getMidiOutputs() {
        if (!this._midiAccess) return [];
        const outputs = [];
        this._midiAccess.outputs.forEach((port, id) => {
            outputs.push({ id, name: port.name, manufacturer: port.manufacturer });
        });
        return outputs;
    },

    _updateMidiDeviceList() {
        const sel = document.getElementById('tcg-midi-output');
        if (!sel) return;
        const outputs = this._getMidiOutputs();
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- None --</option>' +
            outputs.map(o => `<option value="${o.id}">${UI.esc(o.name)}</option>`).join('');
        if (currentVal && outputs.find(o => o.id === currentVal)) sel.value = currentVal;
    },

    _selectMidiOutput(id) {
        this._midiOutputId = id;
        if (id && this._midiAccess) {
            this._midiOutput = this._midiAccess.outputs.get(id) || null;
        } else {
            this._midiOutput = null;
        }
        this._saveSettings();
    },

    _toggleMtc(enabled) {
        this._mtcEnabled = enabled;
        this._mtcLastQF = -1;
        if (enabled && !this._midiAccess) this._initMidi();
        this._saveSettings();
    },

    // Send MTC Quarter-Frame messages (8 per frame, 2 frames per cycle)
    _sendMtcQuarterFrame(tc) {
        if (!this._mtcEnabled || !this._midiOutput) return;
        const { h, m, s, f } = tc;
        // MTC rate code: 0=24, 1=25, 2=29.97DF, 3=30
        let rateCode = 0;
        if (this._fpsNominal === 25) rateCode = 1;
        else if (this._fpsNominal === 30 && this._dropFrame) rateCode = 2;
        else if (this._fpsNominal === 30) rateCode = 3;

        // 8 quarter-frame messages cycle through frame nibbles
        const qf = (this._mtcLastQF + 1) % 8;
        this._mtcLastQF = qf;

        let data;
        switch (qf) {
            case 0: data = 0x00 | (f & 0x0F); break;           // Frame LS nibble
            case 1: data = 0x10 | ((f >> 4) & 0x01); break;    // Frame MS nibble
            case 2: data = 0x20 | (s & 0x0F); break;           // Seconds LS
            case 3: data = 0x30 | ((s >> 4) & 0x03); break;    // Seconds MS
            case 4: data = 0x40 | (m & 0x0F); break;           // Minutes LS
            case 5: data = 0x50 | ((m >> 4) & 0x03); break;    // Minutes MS
            case 6: data = 0x60 | (h & 0x0F); break;           // Hours LS
            case 7: data = 0x70 | ((rateCode << 1) | ((h >> 4) & 0x01)); break; // Hours MS + rate
        }
        try {
            this._midiOutput.send([0xF1, data]);
        } catch (e) { /* port may have disconnected */ }
    },

    // Send MTC Full Frame message (SysEx)
    _sendMtcFullFrame(tc) {
        if (!this._mtcEnabled || !this._midiOutput) return;
        const { h, m, s, f } = tc;
        let rateCode = 0;
        if (this._fpsNominal === 25) rateCode = 1;
        else if (this._fpsNominal === 30 && this._dropFrame) rateCode = 2;
        else if (this._fpsNominal === 30) rateCode = 3;
        try {
            this._midiOutput.send([
                0xF0, 0x7F, 0x7F, 0x01, 0x01,
                (rateCode << 5) | (h & 0x1F), m & 0x3F, s & 0x3F, f & 0x1F,
                0xF7
            ]);
        } catch (e) { /* ignore */ }
    },

    // ----------------------------------------------------------------
    // OUTPUT: LTC Audio
    // ----------------------------------------------------------------
    async _getAudioOutputs() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'audiooutput' && d.deviceId);
        } catch { return []; }
    },

    async _updateAudioDeviceList() {
        const sel = document.getElementById('tcg-audio-output');
        if (!sel) return;
        const devices = await this._getAudioOutputs();
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- Default --</option>' +
            devices.map(d => `<option value="${d.deviceId}">${UI.esc(d.label || 'Audio Output ' + d.deviceId.substring(0,8))}</option>`).join('');
        if (currentVal) sel.value = currentVal;
    },

    _selectAudioOutput(id) {
        this._ltcOutputDeviceId = id;
        this._saveSettings();
    },

    _toggleLtc(enabled) {
        this._ltcEnabled = enabled;
        if (enabled) {
            this._startLtcOutput();
        } else {
            this._stopLtcOutput();
        }
        this._saveSettings();
    },

    _startLtcOutput() {
        if (this._ltcAudioCtx) return;
        try {
            this._ltcAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this._ltcGainNode = this._ltcAudioCtx.createGain();
            this._ltcGainNode.gain.value = 0.8;
            this._ltcGainNode.connect(this._ltcAudioCtx.destination);
            // Set output device if supported
            if (this._ltcOutputDeviceId && this._ltcAudioCtx.setSinkId) {
                this._ltcAudioCtx.setSinkId(this._ltcOutputDeviceId).catch(() => {});
            }
        } catch (e) {
            UI.toast('Failed to start audio output: ' + e.message, 'error');
        }
    },

    _stopLtcOutput() {
        if (this._ltcAudioCtx) {
            this._ltcAudioCtx.close().catch(() => {});
            this._ltcAudioCtx = null;
            this._ltcGainNode = null;
        }
    },

    // Encode and play a single LTC frame as biphase-mark audio
    _sendLtcFrame(tc) {
        if (!this._ltcEnabled || !this._ltcAudioCtx || !this._ltcGainNode) return;
        const { h, m, s, f } = tc;
        const ctx = this._ltcAudioCtx;
        const sampleRate = ctx.sampleRate;
        const bitRate = this._fpsActual * 80; // 80 bits per frame
        const samplesPerBit = Math.round(sampleRate / bitRate);

        // Build 80-bit LTC frame
        const bits = new Uint8Array(80);
        // Frame units (0-3), user bits (4-7), frame tens (8-9), DF flag (10), CF flag (11), user bits (12-15)
        bits[0] = (f % 10) & 1; bits[1] = ((f % 10) >> 1) & 1; bits[2] = ((f % 10) >> 2) & 1; bits[3] = ((f % 10) >> 3) & 1;
        bits[4] = 0; bits[5] = 0; bits[6] = 0; bits[7] = 0; // user bits
        bits[8] = Math.floor(f / 10) & 1; bits[9] = (Math.floor(f / 10) >> 1) & 1;
        bits[10] = this._dropFrame ? 1 : 0; // DF flag
        bits[11] = 0; // color frame
        bits[12] = 0; bits[13] = 0; bits[14] = 0; bits[15] = 0;
        // Seconds units (16-19), user bits (20-23), seconds tens (24-26), parity (27), user bits (28-31)
        bits[16] = (s % 10) & 1; bits[17] = ((s % 10) >> 1) & 1; bits[18] = ((s % 10) >> 2) & 1; bits[19] = ((s % 10) >> 3) & 1;
        bits[20] = 0; bits[21] = 0; bits[22] = 0; bits[23] = 0;
        bits[24] = Math.floor(s / 10) & 1; bits[25] = (Math.floor(s / 10) >> 1) & 1; bits[26] = (Math.floor(s / 10) >> 2) & 1;
        bits[27] = 0; // parity
        bits[28] = 0; bits[29] = 0; bits[30] = 0; bits[31] = 0;
        // Minutes units (32-35), user bits (36-39), minutes tens (40-42), binary group flag (43), user bits (44-47)
        bits[32] = (m % 10) & 1; bits[33] = ((m % 10) >> 1) & 1; bits[34] = ((m % 10) >> 2) & 1; bits[35] = ((m % 10) >> 3) & 1;
        bits[36] = 0; bits[37] = 0; bits[38] = 0; bits[39] = 0;
        bits[40] = Math.floor(m / 10) & 1; bits[41] = (Math.floor(m / 10) >> 1) & 1; bits[42] = (Math.floor(m / 10) >> 2) & 1;
        bits[43] = 0;
        bits[44] = 0; bits[45] = 0; bits[46] = 0; bits[47] = 0;
        // Hours units (48-51), user bits (52-55), hours tens (56-57), binary group flags (58-59), user bits (60-63)
        bits[48] = (h % 10) & 1; bits[49] = ((h % 10) >> 1) & 1; bits[50] = ((h % 10) >> 2) & 1; bits[51] = ((h % 10) >> 3) & 1;
        bits[52] = 0; bits[53] = 0; bits[54] = 0; bits[55] = 0;
        bits[56] = Math.floor(h / 10) & 1; bits[57] = (Math.floor(h / 10) >> 1) & 1;
        bits[58] = 0; bits[59] = 0;
        bits[60] = 0; bits[61] = 0; bits[62] = 0; bits[63] = 0;
        // Sync word: 0011 1111 1111 1101 (bits 64-79)
        const syncWord = [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1];
        for (let i = 0; i < 16; i++) bits[64 + i] = syncWord[i];

        // Biphase-mark encode: transition at start of every bit; extra mid-bit transition for '1'
        const totalSamples = samplesPerBit * 80;
        const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
        const data = buffer.getChannelData(0);
        let level = 1.0;
        for (let b = 0; b < 80; b++) {
            level = -level; // transition at start of every bit
            const start = b * samplesPerBit;
            const mid = start + Math.floor(samplesPerBit / 2);
            const end = start + samplesPerBit;
            if (bits[b] === 1) {
                // '1' bit: transition at midpoint too
                for (let i = start; i < mid; i++) data[i] = level;
                level = -level;
                for (let i = mid; i < end; i++) data[i] = level;
            } else {
                // '0' bit: no mid transition
                for (let i = start; i < end; i++) data[i] = level;
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this._ltcGainNode);
        source.start(ctx.currentTime);
    },

    // ----------------------------------------------------------------
    // OUTPUT: Art-Net Timecode
    // ----------------------------------------------------------------
    _toggleArtnet(enabled) {
        this._artnetEnabled = enabled;
        this._saveSettings();
    },

    _setArtnetIp(ip) {
        this._artnetIp = ip || '255.255.255.255';
        this._saveSettings();
    },

    // Art-Net timecode would need UDP (not available in browser context)
    // but in Electron we can use Node.js dgram module
    _sendArtnetTc(tc) {
        if (!this._artnetEnabled) return;
        // Check if we have access to Electron's Node integration
        if (typeof require === 'undefined') return;
        try {
            const dgram = require('dgram');
            const { h, m, s, f } = tc;
            let rateCode = 0; // 0=Film(24), 1=EBU(25), 2=DF(29.97), 3=SMPTE(30)
            if (this._fpsNominal === 25) rateCode = 1;
            else if (this._fpsNominal === 30 && this._dropFrame) rateCode = 2;
            else if (this._fpsNominal === 30) rateCode = 3;
            // Art-Net TimeCode packet (OpTimeCode = 0x9700)
            const buf = Buffer.alloc(19);
            buf.write('Art-Net\0', 0);      // ID
            buf.writeUInt16LE(0x9700, 8);    // OpCode
            buf.writeUInt16BE(14, 10);       // ProtVer Hi/Lo
            buf.writeUInt8(0, 12);           // Filler1
            buf.writeUInt8(0, 13);           // Filler2
            buf.writeUInt8(f, 14);           // Frames
            buf.writeUInt8(s, 15);           // Seconds
            buf.writeUInt8(m, 16);           // Minutes
            buf.writeUInt8(h, 17);           // Hours
            buf.writeUInt8(rateCode, 18);    // Type
            const client = dgram.createSocket('udp4');
            client.setBroadcast(true);
            client.send(buf, 0, 19, this._artnetPort, this._artnetIp, () => client.close());
        } catch (e) { /* ignore in browser context */ }
    },

    // Dispatch outputs from generator tick
    _sendOutputs() {
        const tc = this._framesToTc(this._currentTotalFrames);
        if (this._mtcEnabled) this._sendMtcQuarterFrame(tc);
        if (this._ltcEnabled) this._sendLtcFrame(tc);
        if (this._artnetEnabled) this._sendArtnetTc(tc);
    },

    // ----------------------------------------------------------------
    // OUTPUT: Render section
    // ----------------------------------------------------------------
    _renderOutputSection() {
        const midiOutputs = this._getMidiOutputs();
        return `
            <div class="card" style="margin-top:16px;">
                <div class="card-header"><h3><i class="fas fa-broadcast-tower"></i> Output Devices</h3></div>
                <div class="card-body">
                    <div class="tcg-output-grid">
                        <!-- MTC Output -->
                        <div class="tcg-output-card">
                            <div class="tcg-output-header">
                                <i class="fas fa-music" style="color:var(--accent)"></i>
                                <span class="tcg-output-title">MIDI Timecode (MTC)</span>
                                <label class="tcg-output-toggle">
                                    <input type="checkbox" id="tcg-mtc-toggle" ${this._mtcEnabled ? 'checked' : ''} onchange="TimecodeGenPage._toggleMtc(this.checked)">
                                    <span class="tcg-toggle-slider"></span>
                                </label>
                            </div>
                            <div class="tcg-output-body">
                                <label class="tcg-label" style="font-size:10px">MIDI Output Device</label>
                                <select class="form-control tcg-select" id="tcg-midi-output" onchange="TimecodeGenPage._selectMidiOutput(this.value)" style="font-size:11px">
                                    <option value="">-- None --</option>
                                    ${midiOutputs.map(o => `<option value="${o.id}" ${o.id === this._midiOutputId ? 'selected' : ''}>${UI.esc(o.name)}</option>`).join('')}
                                </select>
                                <div class="tcg-output-status">${this._mtcEnabled && this._midiOutput ? '<span style="color:var(--green)"><i class="fas fa-circle" style="font-size:6px"></i> Sending MTC</span>' : '<span style="color:var(--text-muted)"><i class="fas fa-circle" style="font-size:6px"></i> Idle</span>'}</div>
                                <button class="btn btn-sm" style="margin-top:6px;font-size:10px" onclick="TimecodeGenPage._initMidi().then(()=>TimecodeGenPage._updateMidiDeviceList())"><i class="fas fa-sync-alt"></i> Refresh Devices</button>
                            </div>
                        </div>

                        <!-- LTC Audio Output -->
                        <div class="tcg-output-card">
                            <div class="tcg-output-header">
                                <i class="fas fa-volume-up" style="color:var(--green)"></i>
                                <span class="tcg-output-title">LTC Audio Output</span>
                                <label class="tcg-output-toggle">
                                    <input type="checkbox" id="tcg-ltc-toggle" ${this._ltcEnabled ? 'checked' : ''} onchange="TimecodeGenPage._toggleLtc(this.checked)">
                                    <span class="tcg-toggle-slider"></span>
                                </label>
                            </div>
                            <div class="tcg-output-body">
                                <label class="tcg-label" style="font-size:10px">Audio Output Device</label>
                                <select class="form-control tcg-select" id="tcg-audio-output" onchange="TimecodeGenPage._selectAudioOutput(this.value)" style="font-size:11px">
                                    <option value="">-- Default --</option>
                                </select>
                                <div class="tcg-output-status">${this._ltcEnabled ? '<span style="color:var(--green)"><i class="fas fa-circle" style="font-size:6px"></i> LTC Active</span>' : '<span style="color:var(--text-muted)"><i class="fas fa-circle" style="font-size:6px"></i> Idle</span>'}</div>
                                <button class="btn btn-sm" style="margin-top:6px;font-size:10px" onclick="TimecodeGenPage._updateAudioDeviceList()"><i class="fas fa-sync-alt"></i> Refresh Devices</button>
                            </div>
                        </div>

                        <!-- Art-Net Timecode -->
                        <div class="tcg-output-card">
                            <div class="tcg-output-header">
                                <i class="fas fa-ethernet" style="color:var(--warning)"></i>
                                <span class="tcg-output-title">Art-Net Timecode</span>
                                <label class="tcg-output-toggle">
                                    <input type="checkbox" id="tcg-artnet-toggle" ${this._artnetEnabled ? 'checked' : ''} onchange="TimecodeGenPage._toggleArtnet(this.checked)">
                                    <span class="tcg-toggle-slider"></span>
                                </label>
                            </div>
                            <div class="tcg-output-body">
                                <label class="tcg-label" style="font-size:10px">Broadcast IP</label>
                                <input class="form-control" id="tcg-artnet-ip" type="text" value="${UI.esc(this._artnetIp)}" placeholder="255.255.255.255" style="font-size:11px" onchange="TimecodeGenPage._setArtnetIp(this.value)">
                                <div class="tcg-output-status">${this._artnetEnabled ? '<span style="color:var(--green)"><i class="fas fa-circle" style="font-size:6px"></i> Broadcasting</span>' : '<span style="color:var(--text-muted)"><i class="fas fa-circle" style="font-size:6px"></i> Idle</span>'}</div>
                                <div class="text-muted" style="font-size:9px;margin-top:4px">Port 6454 (standard Art-Net)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // ----------------------------------------------------------------
    // Settings Persistence
    // ----------------------------------------------------------------
    _saveSettings() {
        try {
            const idx = this._FRAME_RATES.findIndex(r =>
                r[1] === this._fpsActual && r[2] === this._fpsNominal && r[3] === this._dropFrame
            );
            localStorage.setItem(this._STORAGE_KEY, JSON.stringify({
                fpsIndex: idx >= 0 ? idx : 2,
                startH: this._startH,
                startM: this._startM,
                startS: this._startS,
                startF: this._startF,
                midiOutputId: this._midiOutputId,
                mtcEnabled: this._mtcEnabled,
                ltcEnabled: this._ltcEnabled,
                ltcOutputDeviceId: this._ltcOutputDeviceId,
                artnetEnabled: this._artnetEnabled,
                artnetIp: this._artnetIp,
            }));
        } catch (e) { /* localStorage may be unavailable */ }
    },

    // --- Bulletproof state persistence (survives page refresh) ---
    _absStartTime: 0,     // Date.now() when started (absolute wall clock)
    _absPauseTime: 0,     // Date.now() when paused

    _saveState() {
        try {
            localStorage.setItem(this._STATE_KEY, JSON.stringify({
                mode: this._mode,
                absStartTime: this._absStartTime,
                absPauseTime: this._absPauseTime,
                startFrameOffset: this._startFrameOffset,
                offsetFrames: this._offsetFrames,
                fpsActual: this._fpsActual,
                fpsNominal: this._fpsNominal,
                dropFrame: this._dropFrame,
                countdownMode: this._countdownMode,
                countdownTarget: this._countdownTarget,
                pauseElapsed: this._pauseElapsed,
            }));
        } catch {}
    },

    _restoreState() {
        try {
            const raw = localStorage.getItem(this._STATE_KEY);
            if (!raw) return false;
            const s = JSON.parse(raw);
            if (!s || s.mode === 'stopped') return false;

            // Restore frame rate
            this._fpsActual = s.fpsActual;
            this._fpsNominal = s.fpsNominal;
            this._dropFrame = s.dropFrame;
            this._startFrameOffset = s.startFrameOffset;
            this._offsetFrames = s.offsetFrames || 0;
            this._countdownMode = s.countdownMode || false;
            this._countdownTarget = s.countdownTarget || 0;
            this._absStartTime = s.absStartTime;
            this._absPauseTime = s.absPauseTime || 0;

            if (s.mode === 'running') {
                // Reconstruct performance.now()-based timing from absolute wall clock
                const wallElapsed = Date.now() - this._absStartTime;
                this._startTime = performance.now() - wallElapsed;
                this._pauseElapsed = 0;
                this._mode = 'running';
                this._running = true;
                // Start background timer immediately (RAF starts when page activates)
                this._bgTimer = setInterval(() => {
                    const elapsed = performance.now() - this._startTime;
                    let totalFrames = Math.floor(elapsed / 1000 * this._fpsActual) + this._startFrameOffset + this._offsetFrames;
                    this._currentTotalFrames = this._wrapFrames(totalFrames, this._fpsNominal, this._dropFrame);
                    this._updateTopbarTc();
                }, 100);
                return true;
            } else if (s.mode === 'paused') {
                this._pauseElapsed = s.pauseElapsed || 0;
                this._startTime = performance.now() - this._pauseElapsed;
                const elapsed = this._pauseElapsed;
                let totalFrames = Math.floor(elapsed / 1000 * this._fpsActual) + this._startFrameOffset + this._offsetFrames;
                this._currentTotalFrames = this._wrapFrames(totalFrames, this._fpsNominal, this._dropFrame);
                this._mode = 'paused';
                this._running = false;
                this._updateTopbarTc();
                return true;
            }
        } catch {}
        return false;
    },

    _updateTopbarTc() {
        const container = document.getElementById('topbar-timecode');
        const valueEl = document.getElementById('topbar-tc-value');
        if (!container) return;
        if (this._mode === 'stopped') {
            container.style.display = 'none';
        } else {
            container.style.display = 'flex';
            container.classList.toggle('paused', this._mode === 'paused');
            if (valueEl) valueEl.textContent = this._formatCurrentTc();
        }
    },

    _loadSettings() {
        try {
            const raw = localStorage.getItem(this._STORAGE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw);
            if (typeof s.fpsIndex === 'number') {
                const rate = this._FRAME_RATES[s.fpsIndex];
                if (rate) {
                    this._fpsActual = rate[1];
                    this._fpsNominal = rate[2];
                    this._dropFrame = rate[3];
                    this._fps = rate[1];
                }
            }
            if (typeof s.startH === 'number') this._startH = s.startH;
            if (typeof s.startM === 'number') this._startM = s.startM;
            if (typeof s.startS === 'number') this._startS = s.startS;
            if (typeof s.startF === 'number') this._startF = s.startF;
            if (s.midiOutputId) this._midiOutputId = s.midiOutputId;
            if (s.mtcEnabled) this._mtcEnabled = true;
            if (s.ltcEnabled) this._ltcEnabled = true;
            if (s.ltcOutputDeviceId) this._ltcOutputDeviceId = s.ltcOutputDeviceId;
            if (s.artnetEnabled) this._artnetEnabled = true;
            if (s.artnetIp) this._artnetIp = s.artnetIp;
        } catch (e) { /* ignore */ }
    },

    // ----------------------------------------------------------------
    // Jam Sync timer (updates every frame while page is active)
    // ----------------------------------------------------------------
    _jamSyncId: null,

    _startJamSync() {
        const tick = () => {
            this._updateJamSync();
            this._jamSyncId = requestAnimationFrame(tick);
        };
        this._jamSyncId = requestAnimationFrame(tick);
    },

    _stopJamSync() {
        if (this._jamSyncId) {
            cancelAnimationFrame(this._jamSyncId);
            this._jamSyncId = null;
        }
    },

    // ----------------------------------------------------------------
    // Sidebar (empty, as required)
    // ----------------------------------------------------------------
    renderSidebarList() { return ''; },
    initSidebar() {},

    // ----------------------------------------------------------------
    // Lifecycle
    // ----------------------------------------------------------------
    _isPageActive: false,
    _bgTimer: null,

    onActivate() {
        this._isPageActive = true;

        // Only load settings on first activation (not when returning to page with running generator)
        if (this._mode === 'stopped' && !this._running) {
            this._loadSettings();
            // Try to restore a running/paused state from a previous session (page refresh)
            if (!this._restoreState()) {
                this._currentTotalFrames = this._tcToFrames(this._startH, this._startM, this._startS, this._startF);
            }
        }

        setTimeout(() => {
            // Set frame rate dropdown to saved value
            const idx = this._FRAME_RATES.findIndex(r =>
                r[1] === this._fpsActual && r[2] === this._fpsNominal && r[3] === this._dropFrame
            );
            const sel = document.getElementById('tcg-fps-select');
            if (sel && idx >= 0) sel.value = idx;

            if (this._mode === 'stopped') {
                this._setFrameRate(idx >= 0 ? idx : 2);
            }
            this._updateMainDisplay();
            this._updateStartTcInputs();
            this._updateTransportButtons();
            this._startJamSync();

            // Initialize output devices
            this._initMidi().then(() => {
                this._updateMidiDeviceList();
                if (this._midiOutputId) this._selectMidiOutput(this._midiOutputId);
            });
            this._updateAudioDeviceList();
            if (this._ltcEnabled) this._startLtcOutput();

            // Resume RAF display updates if generator is running in background
            if (this._mode === 'running' && !this._rafId) {
                if (this._bgTimer) { clearInterval(this._bgTimer); this._bgTimer = null; }
                this._generatorTick();
            }
        }, 0);
    },

    onDeactivate() {
        this._isPageActive = false;
        // Stop RAF display updates but keep generator timing alive
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        // Use a lightweight background timer to keep frame count advancing
        if (this._mode === 'running' && !this._bgTimer) {
            this._bgTimer = setInterval(() => {
                const elapsed = performance.now() - this._startTime;
                let totalFrames = Math.floor(elapsed / 1000 * this._fpsActual) + this._startFrameOffset + this._offsetFrames;
                this._currentTotalFrames = this._wrapFrames(totalFrames, this._fpsNominal, this._dropFrame);
            }, 100);
        }
        this._stopJamSync();
    },

    refresh() {
        this._updateMainDisplay();
    },

    // ----------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------
    render() {
        const fpsOptions = this._FRAME_RATES.map((r, i) =>
            `<option value="${i}">${UI.esc(r[0])}</option>`
        ).join('');

        const currentIdx = this._FRAME_RATES.findIndex(r =>
            r[1] === this._fpsActual && r[2] === this._fpsNominal && r[3] === this._dropFrame
        );

        return `
            <div class="section-header">
                <h2><i class="fas fa-stopwatch"></i> Timecode Generator</h2>
                <div class="flex gap-sm">
                    <span id="tcg-fps-label" class="text-muted" style="font-size:12px;line-height:28px;">${UI.esc(this._FRAME_RATES[currentIdx >= 0 ? currentIdx : 2][0])}</span>
                    <span id="tcg-df-indicator" class="tcg-df-badge ${this._dropFrame ? 'tcg-df-active' : 'tcg-df-inactive'}">${this._dropFrame ? 'DF' : 'NDF'}</span>
                </div>
            </div>

            <!-- ===== Main TC Display ===== -->
            <div class="tcg-display-card">
                <div class="tcg-main-display" id="tcg-main-display">${UI.esc(this._formatCurrentTc())}</div>
                <div class="tcg-display-labels">
                    <span>HH</span><span class="tcg-sep-lbl"></span>
                    <span>MM</span><span class="tcg-sep-lbl"></span>
                    <span>SS</span><span class="tcg-sep-lbl"></span>
                    <span>FF</span>
                </div>
                <div id="tcg-frame-counter" class="tcg-frame-counter">Frame: ${this._currentTotalFrames}</div>
            </div>

            <!-- ===== Transport & Settings ===== -->
            <div class="card" style="margin-top:16px;">
                <div class="card-header"><h3><i class="fas fa-play-circle"></i> Transport Controls</h3></div>
                <div class="card-body">
                    <div class="tcg-transport-row">
                        <div class="tcg-transport-btns">
                            <button class="tcg-btn tcg-btn-play" id="tcg-btn-play" onclick="TimecodeGenPage._play()"><i class="fas fa-play"></i> Play</button>
                            <button class="tcg-btn tcg-btn-pause" id="tcg-btn-pause" onclick="TimecodeGenPage._pause()" disabled><i class="fas fa-pause"></i> Pause</button>
                            <button class="tcg-btn tcg-btn-stop" id="tcg-btn-stop" onclick="TimecodeGenPage._stop()" disabled><i class="fas fa-stop"></i> Stop</button>
                            <button class="tcg-btn tcg-btn-reset" onclick="TimecodeGenPage._reset()"><i class="fas fa-undo"></i> Reset</button>
                        </div>
                        <div class="tcg-field-group">
                            <label class="tcg-label">Frame Rate</label>
                            <select class="form-control tcg-select" id="tcg-fps-select" onchange="TimecodeGenPage._setFrameRate(parseInt(this.value, 10))">
                                ${fpsOptions}
                            </select>
                        </div>
                    </div>
                    <!-- Start TC -->
                    <div class="tcg-start-row" style="margin-top:12px;">
                        <label class="tcg-label">Start TC</label>
                        <div class="tcg-tc-input-group">
                            <input class="form-control tcg-tc-input" id="tcg-start-hh" type="number" min="0" max="23" value="${this._startH}" placeholder="HH">
                            <span class="tcg-tc-sep">:</span>
                            <input class="form-control tcg-tc-input" id="tcg-start-mm" type="number" min="0" max="59" value="${this._startM}" placeholder="MM">
                            <span class="tcg-tc-sep">:</span>
                            <input class="form-control tcg-tc-input" id="tcg-start-ss" type="number" min="0" max="59" value="${this._startS}" placeholder="SS">
                            <span class="tcg-tc-sep">:</span>
                            <input class="form-control tcg-tc-input" id="tcg-start-ff" type="number" min="0" max="${this._fpsNominal - 1}" value="${this._startF}" placeholder="FF">
                            <button class="btn btn-sm btn-accent" onclick="TimecodeGenPage._applyStartTc()"><i class="fas fa-check"></i> Set</button>
                        </div>
                    </div>
                </div>
            </div>

            ${this._renderOutputSection()}

            <!-- ===== Two-Column: Converter + Calculator ===== -->
            <div class="tcg-two-col" style="margin-top:16px;">

                <!-- Left: Converter -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-exchange-alt"></i> Converter</h3></div>
                    <div class="card-body">
                        <div class="tcg-conv-group">
                            <label class="tcg-label">Timecode</label>
                            <input class="form-control tcg-input-mono" id="tcg-conv-tc" type="text" value="01:00:00:00" placeholder="HH:MM:SS:FF">
                        </div>
                        <div class="tcg-conv-group">
                            <label class="tcg-label">Total Frames</label>
                            <input class="form-control tcg-input-mono" id="tcg-conv-frames" type="number" min="0" value="0" placeholder="Frames">
                        </div>
                        <div class="tcg-conv-group">
                            <label class="tcg-label">Milliseconds</label>
                            <input class="form-control tcg-input-mono" id="tcg-conv-ms" type="number" min="0" step="0.001" value="0" placeholder="ms">
                        </div>
                        <div class="tcg-conv-btns">
                            <button class="btn btn-sm" onclick="TimecodeGenPage._convertTcToFrames()">TC &rarr; Frames</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._convertFramesToTc()">Frames &rarr; TC</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._convertTcToMs()">TC &rarr; ms</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._convertMsToTc()">ms &rarr; TC</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._convertTcToSeconds()">TC &rarr; Seconds</button>
                        </div>
                        <div class="tcg-conv-group" style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
                            <label class="tcg-label">Frame Rate Conversion</label>
                            <div class="tcg-fps-conv-row">
                                <select class="form-control tcg-select-sm" id="tcg-conv-from-fps">${fpsOptions}</select>
                                <span class="text-muted">&rarr;</span>
                                <select class="form-control tcg-select-sm" id="tcg-conv-to-fps">${fpsOptions}</select>
                            </div>
                            <button class="btn btn-sm" style="margin-top:6px;" onclick="TimecodeGenPage._convertFrameRateAtoB()">Convert Frame Rate</button>
                        </div>
                        <div class="tcg-conv-result" id="tcg-conv-result">--</div>
                    </div>
                </div>

                <!-- Right: Calculator -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-calculator"></i> Calculator</h3></div>
                    <div class="card-body">
                        <div class="tcg-conv-group">
                            <label class="tcg-label">TC A</label>
                            <input class="form-control tcg-input-mono" id="tcg-calc-a" type="text" value="01:00:00:00" placeholder="HH:MM:SS:FF">
                        </div>
                        <div class="tcg-conv-group">
                            <label class="tcg-label">TC B</label>
                            <input class="form-control tcg-input-mono" id="tcg-calc-b" type="text" value="00:30:00:00" placeholder="HH:MM:SS:FF">
                        </div>
                        <div class="tcg-conv-group">
                            <label class="tcg-label">Multiplier</label>
                            <input class="form-control tcg-input-mono" id="tcg-calc-mult" type="number" step="0.1" value="2" style="width:80px;">
                        </div>
                        <div class="tcg-conv-btns">
                            <button class="btn btn-sm" onclick="TimecodeGenPage._calcAdd()">A + B</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._calcSubtract()">A - B</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._calcDuration()">Duration</button>
                            <button class="btn btn-sm" onclick="TimecodeGenPage._calcMultiply()">A &times; N</button>
                        </div>
                        <div class="tcg-conv-result" id="tcg-calc-result">--</div>
                    </div>
                </div>
            </div>

            <!-- ===== Validator ===== -->
            <div class="card" style="margin-top:16px;">
                <div class="card-header"><h3><i class="fas fa-check-circle"></i> Timecode Validator</h3></div>
                <div class="card-body">
                    <div class="tcg-validate-row">
                        <input class="form-control tcg-input-mono" id="tcg-validate-input" type="text" placeholder="Enter TC to validate (e.g. 01:00:59;02)" style="max-width:220px;">
                        <button class="btn btn-sm btn-accent" onclick="TimecodeGenPage._validate()"><i class="fas fa-check"></i> Validate</button>
                    </div>
                    <div id="tcg-validate-result" class="tcg-validate-result" style="margin-top:8px;">--</div>
                </div>
            </div>

            <!-- ===== Bottom Section: Tap Tempo, Jam Sync, Countdown, Offset ===== -->
            <div class="tcg-bottom-grid" style="margin-top:16px;">

                <!-- Tap Tempo -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-drum"></i> Tap Tempo</h3></div>
                    <div class="card-body tcg-tap-body">
                        <button class="tcg-tap-btn" onclick="TimecodeGenPage._tap()">TAP</button>
                        <div class="tcg-tap-info">
                            <div id="tcg-tap-bpm" class="tcg-tap-bpm">-- BPM</div>
                            <div id="tcg-tap-frame-interval" class="text-muted" style="font-size:11px;">-- frames/beat</div>
                        </div>
                    </div>
                </div>

                <!-- Jam Sync (System Time as TC) -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-satellite-dish"></i> Jam Sync (System Time)</h3></div>
                    <div class="card-body" style="text-align:center;">
                        <div id="tcg-jam-sync" class="tcg-jam-display">--:--:--;--</div>
                        <div class="text-muted" style="font-size:11px;margin-top:4px;">System clock as timecode at current frame rate</div>
                    </div>
                </div>

                <!-- Countdown -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-hourglass-half"></i> Countdown</h3></div>
                    <div class="card-body">
                        <div class="tcg-countdown-row">
                            <label class="tcg-label" style="min-width:auto;">Target</label>
                            <input class="form-control tcg-input-mono" id="tcg-countdown-target" type="text" value="01:00:00:00" placeholder="HH:MM:SS:FF" style="max-width:160px;">
                            <label class="tcg-label" style="min-width:auto;margin-left:8px;">
                                <input type="checkbox" id="tcg-countdown-toggle" onchange="TimecodeGenPage._toggleCountdown()"> Enable
                            </label>
                        </div>
                        <div class="text-muted" style="font-size:11px;margin-top:6px;">Counts down from target to 00:00:00:00</div>
                    </div>
                </div>

                <!-- Offset -->
                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-arrows-alt-h"></i> Offset</h3></div>
                    <div class="card-body">
                        <div class="tcg-offset-row">
                            <select class="form-control" id="tcg-offset-sign" style="width:50px;">
                                <option value="+">+</option>
                                <option value="-">-</option>
                            </select>
                            <input class="form-control tcg-input-mono" id="tcg-offset-input" type="text" value="00:00:00:00" placeholder="HH:MM:SS:FF" style="max-width:160px;">
                            <button class="btn btn-sm btn-accent" onclick="TimecodeGenPage._applyOffset()"><i class="fas fa-check"></i> Apply</button>
                        </div>
                        <div class="text-muted" style="font-size:11px;margin-top:6px;">Apply a +/- frame offset to the running generator</div>
                    </div>
                </div>
            </div>
        `;
    },
};


/* =====================================================================
   Injected CSS — scoped to tcg- prefix
   ===================================================================== */
(function injectTcgStyles() {
    if (document.getElementById('tcg-css')) return;
    const style = document.createElement('style');
    style.id = 'tcg-css';
    style.textContent = `
/* ---- Main TC Display ---- */
.tcg-display-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px 12px;
    background: var(--bg-secondary, #1a1a2e);
    border-radius: 10px;
    margin-bottom: 4px;
    border: 1px solid var(--border, #2a2a3e);
    box-shadow: inset 0 2px 16px rgba(0,0,0,0.4);
}
.tcg-main-display {
    font-family: 'Courier New', Courier, monospace;
    font-size: clamp(48px, 8vw, 72px);
    font-weight: 700;
    letter-spacing: 0.10em;
    color: var(--accent, #00d4ff);
    text-shadow: 0 0 32px rgba(0, 212, 255, 0.45), 0 0 8px rgba(0, 212, 255, 0.25);
    line-height: 1;
    user-select: all;
}
.tcg-display-labels {
    display: flex;
    gap: 30px;
    margin-top: 6px;
    font-size: 10px;
    color: var(--text-muted, #888);
    letter-spacing: 0.2em;
    text-transform: uppercase;
}
.tcg-display-labels .tcg-sep-lbl { width: 12px; }
.tcg-frame-counter {
    margin-top: 8px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: var(--text-muted, #888);
}

/* ---- DF Badge ---- */
.tcg-df-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
}
.tcg-df-active {
    background: rgba(239, 68, 68, 0.2);
    color: var(--red, #ef4444);
    border: 1px solid var(--red, #ef4444);
}
.tcg-df-inactive {
    background: rgba(74, 222, 128, 0.15);
    color: var(--green, #4ade80);
    border: 1px solid rgba(74, 222, 128, 0.3);
}

/* ---- Transport ---- */
.tcg-transport-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
}
.tcg-transport-btns {
    display: flex;
    gap: 6px;
}
.tcg-btn {
    padding: 6px 14px;
    border: 1px solid var(--border, #2a2a3e);
    border-radius: 6px;
    background: var(--bg-tertiary, #252540);
    color: var(--text-primary, #e0e0e0);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}
.tcg-btn:hover:not(:disabled) { background: var(--bg-secondary, #1a1a2e); border-color: var(--accent, #00d4ff); }
.tcg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tcg-btn-play.active { background: rgba(74, 222, 128, 0.2); border-color: var(--green, #4ade80); color: var(--green, #4ade80); }
.tcg-btn-pause.active { background: rgba(250, 204, 21, 0.2); border-color: #facc15; color: #facc15; }

/* ---- Field groups ---- */
.tcg-field-group { display: flex; flex-direction: column; gap: 3px; }
.tcg-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    min-width: 60px;
}
.tcg-select { min-width: 200px; }
.tcg-select-sm { min-width: 140px; font-size: 12px; }

/* ---- Start TC row ---- */
.tcg-start-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.tcg-tc-input-group {
    display: flex;
    align-items: center;
    gap: 4px;
}
.tcg-tc-input {
    width: 52px !important;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 14px;
}
.tcg-tc-sep {
    font-family: 'Courier New', monospace;
    color: var(--text-muted, #888);
    font-size: 16px;
}

/* ---- Two-Column Layout ---- */
.tcg-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
@media (max-width: 900px) {
    .tcg-two-col { grid-template-columns: 1fr; }
}

/* ---- Converter / Calculator shared ---- */
.tcg-conv-group {
    margin-bottom: 8px;
}
.tcg-conv-group .tcg-label {
    display: block;
    margin-bottom: 3px;
}
.tcg-input-mono {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    max-width: 240px;
}
.tcg-conv-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}
.tcg-conv-result {
    margin-top: 12px;
    padding: 10px 14px;
    background: var(--bg-secondary, #1a1a2e);
    border-radius: 8px;
    border: 1px solid var(--border, #2a2a3e);
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--accent, #00d4ff);
    min-height: 20px;
}
.tcg-fps-conv-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

/* ---- Validator ---- */
.tcg-validate-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}
.tcg-validate-result {
    font-size: 13px;
    line-height: 1.6;
}
.tcg-valid { color: var(--green, #4ade80); font-weight: 600; }
.tcg-invalid { color: var(--red, #ef4444); font-weight: 600; }

/* ---- Bottom Grid ---- */
.tcg-bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
@media (max-width: 900px) {
    .tcg-bottom-grid { grid-template-columns: 1fr; }
}

/* ---- Tap Tempo ---- */
.tcg-tap-body {
    display: flex;
    align-items: center;
    gap: 16px;
}
.tcg-tap-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 2px solid var(--accent, #00d4ff);
    background: var(--bg-tertiary, #252540);
    color: var(--accent, #00d4ff);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.1s, transform 0.08s;
    flex-shrink: 0;
}
.tcg-tap-btn:active {
    background: rgba(0, 212, 255, 0.2);
    transform: scale(0.94);
}
.tcg-tap-bpm {
    font-family: 'Courier New', monospace;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary, #e0e0e0);
}

/* ---- Jam Sync ---- */
.tcg-jam-display {
    font-family: 'Courier New', monospace;
    font-size: 28px;
    font-weight: 700;
    color: var(--accent, #00d4ff);
    letter-spacing: 0.06em;
}

/* ---- Countdown ---- */
.tcg-countdown-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

/* ---- Offset ---- */
.tcg-offset-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

/* ---- Output Devices ---- */
.tcg-output-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}
@media (max-width: 900px) { .tcg-output-grid { grid-template-columns: 1fr; } }
.tcg-output-card {
    background: var(--bg-tertiary, #1e1e2e);
    border: 1px solid var(--border, #2a2a3e);
    border-radius: 10px;
    overflow: hidden;
}
.tcg-output-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--bg-secondary, #1a1a2e);
    border-bottom: 1px solid var(--border, #2a2a3e);
}
.tcg-output-title {
    font-size: 12px;
    font-weight: 600;
    flex: 1;
}
.tcg-output-body {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.tcg-output-status {
    font-size: 10px;
    margin-top: 2px;
}
/* Toggle switch */
.tcg-output-toggle {
    position: relative;
    width: 34px;
    height: 18px;
    flex-shrink: 0;
    cursor: pointer;
}
.tcg-output-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.tcg-toggle-slider {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--bg-tertiary, #2a2a3e);
    border-radius: 9px;
    border: 1px solid var(--border, #3a3a4e);
    transition: all 0.3s;
}
.tcg-toggle-slider::before {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    left: 2px;
    top: 2px;
    background: var(--text-muted, #888);
    border-radius: 50%;
    transition: all 0.3s;
}
.tcg-output-toggle input:checked + .tcg-toggle-slider {
    background: var(--accent, #00d4aa);
    border-color: var(--accent, #00d4aa);
}
.tcg-output-toggle input:checked + .tcg-toggle-slider::before {
    transform: translateX(16px);
    background: #fff;
}
    `;
    document.head.appendChild(style);
})();
