/**
 * Luxor Production — vMix REST API Client
 * Base URL: http://<host>:8088/api/
 * vMix uses HTTP GET requests with function parameters
 */
class VmixAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 8088;
        this.timeout = 10000;
    }

    configure(host, port = 8088) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}/api`;
    }

    get configured() { return !!this.baseUrl; }

    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'vMix API not configured', path);

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new APIError(response.status, errText || response.statusText, path);
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
    // XML PARSING
    // ================================================================

    /** Parse vMix XML state into a DOM document */
    parseXML(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) throw new APIError(0, 'Failed to parse vMix XML response', '/api/');
        return doc;
    }

    // ================================================================
    // STATE
    // ================================================================

    /** GET /api/ — fetch and parse full vMix XML state into JS object */
    async getState() {
        const xmlText = await this.request('/');
        const doc = this.parseXML(xmlText);
        return this._docToState(doc);
    }

    /** Convert vMix XML Document to a plain JS object */
    _docToState(doc) {
        const getText = (tag) => doc.querySelector(tag)?.textContent || '';
        const inputEls = doc.querySelectorAll('inputs > input');
        const inputs = Array.from(inputEls).map(el => ({
            key: el.getAttribute('key'),
            number: parseInt(el.getAttribute('number')) || 0,
            type: el.getAttribute('type') || '',
            title: el.getAttribute('title') || el.textContent || '',
            state: el.getAttribute('state') || 'Running',
            loop: el.getAttribute('loop') === 'True',
            muted: el.getAttribute('muted') === 'True',
            volume: parseInt(el.getAttribute('volume')) || 0,
            audiobusses: el.getAttribute('audiobusses') || 'M',
            duration: parseInt(el.getAttribute('duration')) || 0,
            position: parseInt(el.getAttribute('position')) || 0,
        }));
        const overlayEls = doc.querySelectorAll('overlays > overlay');
        const overlays = Array.from(overlayEls).map(el => ({
            number: parseInt(el.getAttribute('number')) || 0,
            active: el.getAttribute('active') === 'True',
            inputNumber: parseInt(el.textContent) || 0,
        }));
        return {
            version: getText('version'),
            edition: getText('edition'),
            activeInput: parseInt(getText('active')) || 1,
            previewInput: parseInt(getText('preview')) || 2,
            inputs,
            overlays,
            recording: getText('recording') === 'True',
            streaming: getText('streaming') === 'True',
            fadeToBlack: getText('fadeToBlack') === 'True',
            transition: {
                effect: doc.querySelector('transition > effect')?.textContent || 'Fade',
                duration: parseInt(doc.querySelector('transition > duration')?.textContent) || 1000,
            },
        };
    }

    // ================================================================
    // HEALTH CHECK
    // ================================================================

    async healthCheck() {
        try {
            const xmlText = await this.request('/');
            const doc = this.parseXML(xmlText);
            const state = this._docToState(doc);

            return {
                ok: true,
                info: {
                    engineStatus: 'Running',
                    computerName: 'vMix',
                    version: state.version,
                    inputs: state.inputs.length,
                    streaming: state.streaming,
                    recording: state.recording,
                    _vmixState: state,
                },
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    // ================================================================
    // FUNCTION EXECUTION
    // ================================================================

    /** Execute a vMix function via GET parameters */
    async executeFunction(name, params = {}) {
        const query = new URLSearchParams({ Function: name, ...params });
        return this.request(`/?${query.toString()}`);
    }

    // ================================================================
    // TRANSITIONS
    // ================================================================

    /** Cut to program */
    async cut() { return this.executeFunction('Cut'); }

    /** Fade transition with duration in ms */
    async fade(duration = 1000) {
        return this.executeFunction('Fade', { Duration: duration });
    }

    /** Fade to black */
    async fadeToBlack() { return this.executeFunction('FadeToBlack'); }

    // ================================================================
    // INPUT CONTROL
    // ================================================================

    /** Set an input as preview */
    async setPreview(input) {
        return this.executeFunction('PreviewInput', { Input: input });
    }

    /** Set an input as active (program) */
    async setActive(input) {
        return this.executeFunction('ActiveInput', { Input: input });
    }

    // ================================================================
    // AUDIO
    // ================================================================

    /** Set input volume (0-100) */
    async setVolume(input, volume) {
        return this.executeFunction('SetVolume', { Input: input, Value: volume });
    }

    /** Enable audio on input */
    async audioOn(input) {
        return this.executeFunction('AudioOn', { Input: input });
    }

    /** Disable audio on input */
    async audioOff(input) {
        return this.executeFunction('AudioOff', { Input: input });
    }

    // ================================================================
    // RECORDING & STREAMING
    // ================================================================

    async startRecording() { return this.executeFunction('StartRecording'); }
    async stopRecording() { return this.executeFunction('StopRecording'); }
    async startStreaming() { return this.executeFunction('StartStreaming'); }
    async stopStreaming() { return this.executeFunction('StopStreaming'); }

    // ================================================================
    // OVERLAYS
    // ================================================================

    /** Activate overlay (1-4) with given input */
    async setOverlay(overlayNum, input) {
        return this.executeFunction(`OverlayInput${overlayNum}`, { Input: input });
    }

    /** Deactivate overlay (1-4) */
    async overlayOff(overlayNum) {
        return this.executeFunction(`OverlayInput${overlayNum}Off`);
    }
}

// Global singleton
const vmixAPI = new VmixAPI();
