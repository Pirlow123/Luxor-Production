/**
 * Luxor Production — Blackmagic ATEM REST API Client
 * Base URL: http://<host>:<port>/api/v1/switcher
 * ATEM uses an HTTP REST API exposed via ATEM Software Control
 * or the companion ATEM REST API proxy.
 */
class ATEMApi {
    constructor() {
        this.baseUrl = '';
        this.port = 80;
        this.timeout = 10000;
    }

    configure(host, port = 80) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api/v1/switcher`;
    }

    get configured() { return !!this.baseUrl; }

    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'ATEM API not configured', path);

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        try {
            const fetchOpts = {
                method: options.method || 'GET',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
            };
            if (options.body !== undefined) {
                fetchOpts.body = JSON.stringify(options.body);
            }

            const response = await fetch(url, fetchOpts);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new APIError(response.status, errText || response.statusText, path);
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return response.json();
            }
            return response.text();
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof APIError) throw err;
            if (err.name === 'AbortError') throw new APIError(0, 'Request timed out', path);
            throw new APIError(0, err.message, path);
        }
    }

    // ================================================================
    // DEVICE INFO
    // ================================================================

    /** GET /api/v1/switcher — device info (model, firmware) */
    async getDeviceInfo() {
        return this.request('');
    }

    /** GET /api/v1/switcher/inputs — list all inputs */
    async getInputs() {
        return this.request('/inputs');
    }

    // ================================================================
    // HEALTH CHECK
    // ================================================================

    async healthCheck() {
        try {
            const info = await this.getDeviceInfo();
            return {
                ok: true,
                info: {
                    model: info.model || 'ATEM',
                    firmware: info.firmware || '',
                    _atemState: info,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    // ================================================================
    // PROGRAM / PREVIEW
    // ================================================================

    /** POST /api/v1/switcher/program — set program (on-air) source */
    async setProgram(inputId, me = 0) {
        return this.request('/program', { method: 'POST', body: { input: inputId, me } });
    }

    /** POST /api/v1/switcher/preview — set preview source */
    async setPreview(inputId, me = 0) {
        return this.request('/preview', { method: 'POST', body: { input: inputId, me } });
    }

    // ================================================================
    // TRANSITIONS
    // ================================================================

    /** POST /api/v1/switcher/transition/auto — trigger auto transition */
    async transitionAuto(me = 0) {
        return this.request('/transition/auto', { method: 'POST', body: { me } });
    }

    /** POST /api/v1/switcher/transition/cut — trigger cut transition */
    async transitionCut(me = 0) {
        return this.request('/transition/cut', { method: 'POST', body: { me } });
    }

    /** POST /api/v1/switcher/transition/style — set transition style (mix, dip, wipe, stinger, dve) */
    async setTransitionStyle(style, me = 0) {
        return this.request('/transition/style', { method: 'POST', body: { style, me } });
    }

    /** POST /api/v1/switcher/transition/rate — set transition rate in frames */
    async setTransitionRate(rate, me = 0) {
        return this.request('/transition/rate', { method: 'POST', body: { rate, me } });
    }

    // ================================================================
    // FADE TO BLACK
    // ================================================================

    /** POST /api/v1/switcher/ftb — toggle fade to black */
    async fadeToBlack(me = 0) {
        return this.request('/ftb', { method: 'POST', body: { me } });
    }

    // ================================================================
    // DOWNSTREAM KEYERS (DSK)
    // ================================================================

    /** POST /api/v1/switcher/dsk/{id}/auto — auto-mix DSK on/off */
    async dskAuto(dskId) {
        return this.request(`/dsk/${dskId}/auto`, { method: 'POST' });
    }

    /** POST /api/v1/switcher/dsk/{id}/cut — cut DSK on/off */
    async dskCut(dskId) {
        return this.request(`/dsk/${dskId}/cut`, { method: 'POST' });
    }

    /** POST /api/v1/switcher/dsk/{id}/on-air — set DSK on-air state */
    async setDskOnAir(dskId, onAir) {
        return this.request(`/dsk/${dskId}/on-air`, { method: 'POST', body: { onAir } });
    }

    /** POST /api/v1/switcher/dsk/{id}/source — set DSK fill and key sources */
    async setDskSource(dskId, fillSource, keySource) {
        return this.request(`/dsk/${dskId}/source`, { method: 'POST', body: { fillSource, keySource } });
    }

    // ================================================================
    // UPSTREAM KEYERS (USK)
    // ================================================================

    /** POST /api/v1/switcher/usk/{id}/on-air — set USK on-air state */
    async setUskOnAir(uskId, onAir, me = 0) {
        return this.request(`/usk/${uskId}/on-air`, { method: 'POST', body: { onAir, me } });
    }

    /** POST /api/v1/switcher/usk/{id}/type — set USK type (luma, chroma, pattern, dve) */
    async setUskType(uskId, type, me = 0) {
        return this.request(`/usk/${uskId}/type`, { method: 'POST', body: { type, me } });
    }

    // ================================================================
    // AUX OUTPUTS
    // ================================================================

    /** GET /api/v1/switcher/aux/{id} — get current aux output source */
    async getAux(auxId) {
        return this.request(`/aux/${auxId}`);
    }

    /** POST /api/v1/switcher/aux/{id} — set aux output source */
    async setAux(auxId, inputId) {
        return this.request(`/aux/${auxId}`, { method: 'POST', body: { input: inputId } });
    }

    // ================================================================
    // MEDIA PLAYER
    // ================================================================

    /** POST /api/v1/switcher/media/{id}/source — set media player source */
    async setMediaSource(playerId, slot) {
        return this.request(`/media/${playerId}/source`, { method: 'POST', body: { slot } });
    }

    // ================================================================
    // AUDIO MIXER
    // ================================================================

    /** GET /api/v1/switcher/audio/mixer — get audio mixer state / levels */
    async getAudioMixer() {
        return this.request('/audio/mixer');
    }

    /** POST /api/v1/switcher/audio/mixer/{id}/gain — set audio input gain (dB) */
    async setAudioGain(inputId, gain) {
        return this.request(`/audio/mixer/${inputId}/gain`, { method: 'POST', body: { gain } });
    }

    /** POST /api/v1/switcher/audio/mixer/{id}/balance — set audio input balance (-1.0 to 1.0) */
    async setAudioBalance(inputId, balance) {
        return this.request(`/audio/mixer/${inputId}/balance`, { method: 'POST', body: { balance } });
    }

    /** POST /api/v1/switcher/audio/mixer/{id}/mixOption — set audio mix option (off, on, afv) */
    async setAudioMixOption(inputId, mixOption) {
        return this.request(`/audio/mixer/${inputId}/mixOption`, { method: 'POST', body: { mixOption } });
    }

    // ================================================================
    // SUPERSOURCE
    // ================================================================

    /** POST /api/v1/switcher/supersource/box/{id} — configure a SuperSource box */
    async setSuperSourceBox(boxId, config) {
        return this.request(`/supersource/box/${boxId}`, { method: 'POST', body: config });
    }

    // ================================================================
    // MACRO CONTROL
    // ================================================================

    /** POST /api/v1/switcher/macro/{id}/run — run a macro by index */
    async macroRun(macroId) {
        return this.request(`/macro/${macroId}/run`, { method: 'POST' });
    }

    /** POST /api/v1/switcher/macro/stop — stop the currently running macro */
    async macroStop() {
        return this.request('/macro/stop', { method: 'POST' });
    }

    /** POST /api/v1/switcher/macro/{id}/record — start recording a macro */
    async macroRecord(macroId) {
        return this.request(`/macro/${macroId}/record`, { method: 'POST' });
    }

    /** POST /api/v1/switcher/macro/record/stop — stop recording a macro */
    async macroRecordStop() {
        return this.request('/macro/record/stop', { method: 'POST' });
    }

    // ================================================================
    // STREAMING
    // ================================================================

    /** POST /api/v1/switcher/stream/start — start streaming */
    async startStreaming() {
        return this.request('/stream/start', { method: 'POST' });
    }

    /** POST /api/v1/switcher/stream/stop — stop streaming */
    async stopStreaming() {
        return this.request('/stream/stop', { method: 'POST' });
    }

    // ================================================================
    // RECORDING
    // ================================================================

    /** POST /api/v1/switcher/record/start — start recording */
    async startRecording() {
        return this.request('/record/start', { method: 'POST' });
    }

    /** POST /api/v1/switcher/record/stop — stop recording */
    async stopRecording() {
        return this.request('/record/stop', { method: 'POST' });
    }

    // ================================================================
    // MULTIVIEW
    // ================================================================

    /** GET /api/v1/switcher/multiview — get multiview configuration */
    async getMultiview() {
        return this.request('/multiview');
    }

    /** PUT /api/v1/switcher/multiview/window/{id} — set multiview window source */
    async setMultiviewWindow(windowIndex, inputId) {
        return this.request(`/multiview/window/${windowIndex}`, { method: 'PUT', body: { input: inputId } });
    }

    /** PUT /api/v1/switcher/multiview/layout — set multiview layout style */
    async setMultiviewLayout(layout) {
        return this.request('/multiview/layout', { method: 'PUT', body: { layout } });
    }

    // ================================================================
    // MEDIA POOL / STILLS
    // ================================================================

    /** GET /api/v1/switcher/media/pool — get media pool stills and clips */
    async getMediaPool() {
        return this.request('/media/pool');
    }

    /** PUT /api/v1/switcher/media/pool/still/{slot} — upload still to media pool */
    async uploadStill(slot, imageData) {
        return this.request(`/media/pool/still/${slot}`, { method: 'PUT', body: { imageData } });
    }

    /** DELETE /api/v1/switcher/media/pool/{slot} — clear media pool slot */
    async clearMediaSlot(slot) {
        return this.request(`/media/pool/${slot}`, { method: 'DELETE' });
    }

    /** GET /api/v1/switcher/media/{id}/status — get media player state */
    async getMediaPlayerStatus(playerId) {
        return this.request(`/media/${playerId}/status`);
    }

    // ================================================================
    // STREAMING SETTINGS
    // ================================================================

    /** GET /api/v1/switcher/stream/settings — get streaming URL, key, service */
    async getStreamingSettings() {
        return this.request('/stream/settings');
    }

    /** PUT /api/v1/switcher/stream/settings — configure streaming */
    async setStreamingSettings(url, key, service) {
        return this.request('/stream/settings', { method: 'PUT', body: { url, key, service } });
    }

    /** GET /api/v1/switcher/stream/status — get streaming status */
    async getStreamingStatus() {
        return this.request('/stream/status');
    }

    // ================================================================
    // RECORDING SETTINGS
    // ================================================================

    /** GET /api/v1/switcher/record/settings — get recording format, filename, disk */
    async getRecordingSettings() {
        return this.request('/record/settings');
    }

    /** PUT /api/v1/switcher/record/settings — configure recording */
    async setRecordingSettings(settings) {
        return this.request('/record/settings', { method: 'PUT', body: settings });
    }

    /** GET /api/v1/switcher/record/status — get recording status */
    async getRecordingStatus() {
        return this.request('/record/status');
    }

    // ================================================================
    // COLOR GENERATOR
    // ================================================================

    /** PUT /api/v1/switcher/color/{id} — set color generator */
    async setColorGenerator(genId, hue, saturation, luminance) {
        return this.request(`/color/${genId}`, { method: 'PUT', body: { hue, saturation, luminance } });
    }

    /** GET /api/v1/switcher/color/{id} — get color generator state */
    async getColorGenerator(genId) {
        return this.request(`/color/${genId}`);
    }

    // ================================================================
    // ADVANCED KEYERS
    // ================================================================

    /** PUT /api/v1/switcher/me/{me}/usk/{id}/chroma — set chroma key settings */
    async setChromaKey(me, keyerId, config) {
        return this.request(`/me/${me}/usk/${keyerId}/chroma`, { method: 'PUT', body: config });
    }

    /** PUT /api/v1/switcher/me/{me}/usk/{id}/luma — set luma key settings */
    async setLumaKey(me, keyerId, config) {
        return this.request(`/me/${me}/usk/${keyerId}/luma`, { method: 'PUT', body: config });
    }

    /** PUT /api/v1/switcher/me/{me}/usk/{id}/pattern — set pattern key settings */
    async setPatternKey(me, keyerId, config) {
        return this.request(`/me/${me}/usk/${keyerId}/pattern`, { method: 'PUT', body: config });
    }

    /** PUT /api/v1/switcher/me/{me}/usk/{id}/dve — set DVE settings (position, size, border, shadow) */
    async setDVEKey(me, keyerId, config) {
        return this.request(`/me/${me}/usk/${keyerId}/dve`, { method: 'PUT', body: config });
    }

    /** PUT /api/v1/switcher/me/{me}/usk/{id}/fly — set fly key run-to-position */
    async setFlyKey(me, keyerId, config) {
        return this.request(`/me/${me}/usk/${keyerId}/fly`, { method: 'PUT', body: config });
    }

    /** GET /api/v1/switcher/me/{me}/usk/{id} — get full keyer state */
    async getKeyerState(me, keyerId) {
        return this.request(`/me/${me}/usk/${keyerId}`);
    }

    // ================================================================
    // SUPERSOURCE ADVANCED
    // ================================================================

    /** GET /api/v1/switcher/supersource — get full supersource state */
    async getSuperSource() {
        return this.request('/supersource');
    }

    /** PUT /api/v1/switcher/supersource/box/{id}/border — set border settings */
    async setSuperSourceBorder(boxId, config) {
        return this.request(`/supersource/box/${boxId}/border`, { method: 'PUT', body: config });
    }

    /** PUT /api/v1/switcher/supersource/art — set art source settings (fill, key, premultiplied) */
    async setSuperSourceArt(config) {
        return this.request('/supersource/art', { method: 'PUT', body: config });
    }

    // ================================================================
    // AUDIO ADVANCED
    // ================================================================

    /** PUT /api/v1/switcher/audio/mixer/master/gain — set master audio gain */
    async setAudioMasterGain(gain) {
        return this.request('/audio/mixer/master/gain', { method: 'PUT', body: { gain } });
    }

    /** GET /api/v1/switcher/audio/meters — get audio meter peak/RMS levels */
    async getAudioMeterLevels() {
        return this.request('/audio/meters');
    }

    /** PUT /api/v1/switcher/audio/mixer/{id}/afv — set audio follow video mode */
    async setAudioFollowVideo(inputId, enabled) {
        return this.request(`/audio/mixer/${inputId}/afv`, { method: 'PUT', body: { enabled } });
    }

    /** PUT /api/v1/switcher/audio/mixer/{id}/delay — set audio delay in frames */
    async setAudioDelay(inputId, frames) {
        return this.request(`/audio/mixer/${inputId}/delay`, { method: 'PUT', body: { frames } });
    }

    /** GET /api/v1/switcher/audio/monitor — get monitor output settings */
    async getAudioMonitor() {
        return this.request('/audio/monitor');
    }

    /** PUT /api/v1/switcher/audio/monitor — set monitor settings (volume, mute, solo) */
    async setAudioMonitor(settings) {
        return this.request('/audio/monitor', { method: 'PUT', body: settings });
    }

    // ================================================================
    // MACRO ADVANCED
    // ================================================================

    /** GET /api/v1/switcher/macros — list all macros with names */
    async getMacros() {
        return this.request('/macros');
    }

    /** GET /api/v1/switcher/macro/state — get macro recording/running state */
    async getMacroState() {
        return this.request('/macro/state');
    }

    /** PUT /api/v1/switcher/macro/{id}/name — rename macro */
    async setMacroName(macroId, name) {
        return this.request(`/macro/${macroId}/name`, { method: 'PUT', body: { name } });
    }

    // ================================================================
    // TALLY
    // ================================================================

    /** GET /api/v1/switcher/tally — get tally state for all inputs */
    async getTally() {
        return this.request('/tally');
    }

    // ================================================================
    // CAMERA CONTROL
    // ================================================================

    /** PUT /api/v1/switcher/camera/{id}/control — set camera settings (iris, gain, shutter, white balance) */
    async setCameraControl(inputId, settings) {
        return this.request(`/camera/${inputId}/control`, { method: 'PUT', body: settings });
    }

    /** GET /api/v1/switcher/camera/{id}/control — get camera settings */
    async getCameraControl(inputId) {
        return this.request(`/camera/${inputId}/control`);
    }
}

// Global singleton
const atemAPI = new ATEMApi();
