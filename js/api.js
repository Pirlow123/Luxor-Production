/**
 * Luxor Production - Hippotizer REST API Client
 * Matches the official Swagger spec exactly (REST_Hippotizer_current.json v1.2)
 * Base URL: http://<host>:40512
 */
class HippoAPI {
    constructor() {
        this.baseUrl = '';
        this.port = 40512;
        this.timeout = 10000;
    }

    configure(host, port = 40512) {
        this.port = port;
        this.baseUrl = `http://${host}:${port}`;
    }

    get configured() { return !!this.baseUrl; }

    async request(path, options = {}) {
        if (!this.baseUrl) throw new APIError(0, 'API not configured — set server address first', path);

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        try {
            const fetchOpts = {
                method: options.method || 'GET',
                signal: controller.signal,
            };

            // Only set headers if not FormData (browser sets multipart boundary automatically)
            if (options.body instanceof FormData) {
                fetchOpts.body = options.body;
            } else if (options.body) {
                fetchOpts.headers = { 'Content-Type': 'application/json' };
                fetchOpts.body = options.body;
            }

            const response = await fetch(url, fetchOpts);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new APIError(response.status, errText || response.statusText, path);
            }

            const ct = response.headers.get('content-type') || '';

            // Image responses (thumbnails)
            if (ct.includes('image/')) return response.blob();

            // JSON responses
            if (ct.includes('application/json')) return response.json();

            // Text/HTML responses (most action endpoints return text/html)
            const text = await response.text();

            // Try parsing as JSON in case content-type header is wrong
            try { return JSON.parse(text); } catch { return text; }
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof APIError) throw err;
            if (err.name === 'AbortError') throw new APIError(0, 'Request timed out', path);
            throw new APIError(0, err.message, path);
        }
    }

    // ================================================================
    // INFO — GET /info → ServerInfo
    // ServerInfo: { computerName, engineStatus, hostName, iP, mediaManagerStatus,
    //              mixes[], product, productFamily, registeredOwner, softwareRevision, softwareVersion }
    // MixInfo: { fXCName, hasLayers, index, layerCount, mixType, name }
    // ================================================================
    async getInfo() { return this.request('/info'); }

    // ================================================================
    // TIMELINES
    // GET /timelines → TimelineCollection (array of TimelineInfoModel)
    // TimelineInfoModel: { commands[], endTimeSecs, guid, iD (int32), name, startTimeSecs }
    // TimelineCommandInfoModel: { cueNumber, iD, isJumpTargetSet, jumpTarget, name, timeSecs, type }
    // ================================================================
    async getTimelines() { return this.request('/timelines'); }

    // All timelines — returns text/html, status 200|500
    async playAll()          { return this.request('/timelines/all/play'); }
    async stopAll()          { return this.request('/timelines/all/stop'); }
    async resetAll()         { return this.request('/timelines/all/reset'); }
    async muteAll()          { return this.request('/timelines/all/mute'); }
    async unmuteAll()        { return this.request('/timelines/all/unmute'); }
    async goNextCueAll()     { return this.request('/timelines/all/gonextcue'); }
    async goPrevCueAll()     { return this.request('/timelines/all/gopreviouscue'); }
    /** @param {number} cuenumber - double */
    async goCueAll(cuenumber) { return this.request(`/timelines/all/gocue/${cuenumber}`); }

    // Single timeline — timeline param is int32, returns text/html, status 200|400|500
    async timelinePlay(id)        { return this.request(`/timelines/${id}/play`); }
    async timelineStop(id)        { return this.request(`/timelines/${id}/stop`); }
    async timelineReset(id)       { return this.request(`/timelines/${id}/reset`); }
    async timelineMute(id)        { return this.request(`/timelines/${id}/mute`); }
    async timelineUnmute(id)      { return this.request(`/timelines/${id}/unmute`); }
    async timelineNextCue(id)     { return this.request(`/timelines/${id}/gonextcue`); }
    async timelinePrevCue(id)     { return this.request(`/timelines/${id}/gopreviouscue`); }
    /** @param {number} id - int32, @param {number} cuenumber - double */
    async timelineGoCue(id, cuenumber) { return this.request(`/timelines/${id}/gocue/${cuenumber}`); }

    // ================================================================
    // MEDIA
    // Models:
    //   MediaDatabaseInformationModel (from GET /media)
    //   MediaInformationModel: { aspectRatio, audioChannels, audioSampleRate, canBeDeleted,
    //     duration, durationFrames, fileName, fileSize, fileType, fps, hasAlpha,
    //     height, iD, mapIndexes[], timeUploaded, width }
    //   MediaIdModel: { mediaID }
    //   MediaMapModel: { entries[] }  — MediaMapEntry: { index, mediaID, name }
    // ================================================================

    /** GET /media → MediaDatabaseInformationModel */
    async getMedia() { return this.request('/media'); }

    /** GET /media/{mediaID} — mediaID is UUID string → MediaInformationModel */
    async getMediaById(mediaID) { return this.request(`/media/${encodeURIComponent(mediaID)}`); }

    /** GET /media/{mapIndex} — mapIndex is int32 (1-65535) → MediaInformationModel */
    async getMediaByMapIndex(mapIndex) { return this.request(`/media/${mapIndex}`); }

    /** GET /media/map → MediaMapModel { entries: MediaMapEntry[] } */
    async getMediaMap() { return this.request('/media/map'); }

    /** GET /media/thumb/{mediaID} → image/png | text/html */
    async getMediaThumbById(mediaID) { return this.request(`/media/thumb/${encodeURIComponent(mediaID)}`); }

    /** GET /media/thumb/{mapIndex} → image/png | text/html (mapIndex: 1-65535) */
    async getMediaThumbByIndex(mapIndex) { return this.request(`/media/thumb/${mapIndex}`); }

    /** Returns direct URL for img src usage */
    getMediaThumbUrl(mediaIDorIndex) { return `${this.baseUrl}/media/thumb/${mediaIDorIndex}`; }

    /**
     * POST /media/upload
     * @param {File} file - The media file
     * @param {Object} opts - { addToMap: bool (default true), mapIndex: int32 (default -1), customFolderPath: string }
     * @returns {Promise<MediaIdModel>} { mediaID }
     */
    async uploadMedia(file, opts = {}) {
        const form = new FormData();
        form.append('MediaFile', file);
        if (opts.addToMap !== undefined) form.append('addToMap', String(opts.addToMap));
        if (opts.mapIndex !== undefined) form.append('mapIndex', String(opts.mapIndex));
        if (opts.customFolderPath) form.append('customFolderPath', opts.customFolderPath);

        return this.request('/media/upload', {
            method: 'POST',
            body: form,
            timeout: 600000, // 10 min for large files
        });
    }

    /** GET /media/delete/{mediaID} or DELETE — mediaID is UUID */
    async deleteMedia(mediaID) { return this.request(`/media/delete/${encodeURIComponent(mediaID)}`); }

    /** GET /media/deletemapentry/{mapIndex} or DELETE — mapIndex: 1-65535 */
    async deleteMapEntry(mapIndex) { return this.request(`/media/deletemapentry/${mapIndex}`); }

    /** GET or PUT /media/addmapentry/{mapIndex}/{mediaID} — mapIndex: 1-65535, mediaID: string */
    async addMapEntry(mapIndex, mediaID) { return this.request(`/media/addmapentry/${mapIndex}/${encodeURIComponent(mediaID)}`); }

    /** GET /media/sync — triggers sync to other networked machines */
    async syncMedia() { return this.request('/media/sync'); }

    // ================================================================
    // MIX CONTROL
    // mixIndex: int32
    // ================================================================

    /** GET /mix/{mixIndex}/level → int32 (0-100) */
    async getMixLevel(mixIndex) { return this.request(`/mix/${mixIndex}/level`); }

    /** GET /mix/{mixIndex}/level/{level} — level: int32 (0-100) → text/html */
    async setMixLevel(mixIndex, level) { return this.request(`/mix/${mixIndex}/level/${level}`); }

    /** GET /mix/{mixIndex}/preset/{preset} — preset: int32 → int32 */
    async loadMixPresetByIndex(mixIndex, preset) { return this.request(`/mix/${mixIndex}/preset/${preset}`); }

    /** GET /mix/{mixIndex}/preset/{bankindex}/{slotindex} → text/html */
    async loadMixPresetBySlot(mixIndex, bankindex, slotindex) { return this.request(`/mix/${mixIndex}/preset/${bankindex}/${slotindex}`); }

    /** GET /mix/{mixIndex}/preset/{presetid} — presetid: UUID string → text/html */
    async loadMixPresetById(mixIndex, presetid) { return this.request(`/mix/${mixIndex}/preset/${encodeURIComponent(presetid)}`); }

    // ================================================================
    // LAYER CONTROL
    // mixIndex: int32, layerIndex: int32
    // ================================================================

    /** GET /mix/{mixIndex}/layer/{layerIndex}/level → int32 (0-100) */
    async getLayerLevel(mixIndex, layerIndex) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/level`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/level/{level} — level: int32 → text/html */
    async setLayerLevel(mixIndex, layerIndex, level) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/level/${level}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/media/{mediaID} — mediaID: UUID → int32 */
    async loadLayerMediaById(mixIndex, layerIndex, mediaID) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/media/${encodeURIComponent(mediaID)}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/media/{mapIndex} — mapIndex: int32 → int32 */
    async loadLayerMediaByIndex(mixIndex, layerIndex, mapIndex) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/media/${mapIndex}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/preset/{preset} — preset: int32 → int32 */
    async loadLayerPresetByIndex(mixIndex, layerIndex, preset) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/preset/${preset}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/preset/{bankindex}/{slotindex} → text/html */
    async loadLayerPresetBySlot(mixIndex, layerIndex, bankindex, slotindex) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/preset/${bankindex}/${slotindex}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/preset/{presetid} — presetid: UUID → text/html */
    async loadLayerPresetById(mixIndex, layerIndex, presetid) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/preset/${encodeURIComponent(presetid)}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/mediaoneshot/{mediaID} — mediaID: UUID → int32 */
    async layerMediaOneshotById(mixIndex, layerIndex, mediaID) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/mediaoneshot/${encodeURIComponent(mediaID)}`); }

    /** GET /mix/{mixIndex}/layer/{layerIndex}/mediaoneshot/{mapIndex} — mapIndex: int32 → int32 */
    async layerMediaOneshotByIndex(mixIndex, layerIndex, mapIndex) { return this.request(`/mix/${mixIndex}/layer/${layerIndex}/mediaoneshot/${mapIndex}`); }

    // ================================================================
    // PRESETS
    // PresetCollectionInfo: { bankCount, banks[], presetType }
    // PresetBankInfo: { hasPresets, index, name, presets[], thumbPreset }
    // PresetInfo: { description, fadeTime, fadeType, filters, iD, index, name, presetType }
    // ================================================================

    /** GET /presets/{presettype} — presettype: string ("mix"|"layer") → PresetCollectionInfo */
    async getPresets(presetType) { return this.request(`/presets/${presetType}`); }

    /** GET /presets/delete/{presetid} — presetid: UUID → string */
    async deletePreset(presetid) { return this.request(`/presets/delete/${encodeURIComponent(presetid)}`); }

    /** GET /presets/thumb/{presettype}/{bankindex}/{slotindex} → image/png */
    async getPresetThumbBySlot(presettype, bankindex, slotindex) {
        return this.request(`/presets/thumb/${presettype}/${bankindex}/${slotindex}`);
    }

    /** GET /presets/thumb/{presetid} → image/png */
    async getPresetThumbById(presetid) { return this.request(`/presets/thumb/${encodeURIComponent(presetid)}`); }

    /** Direct URL for img src */
    getPresetThumbUrl(presetid) { return `${this.baseUrl}/presets/thumb/${encodeURIComponent(presetid)}`; }
    getPresetThumbSlotUrl(type, bank, slot) { return `${this.baseUrl}/presets/thumb/${type}/${bank}/${slot}`; }

    // ================================================================
    // PIN CONTROL
    // pathToPin: string (e.g. "Engine/Mix1/Layer1/Opacity")
    // PinInformation: { dataType, details, name, pinType }
    // ================================================================

    /** GET /pin/getvalue/{pathToPin} → string */
    async getPinValue(pathToPin) { return this.request(`/pin/getvalue/${pathToPin}`); }

    /** GET /pin/setvalue/{pathToPin}/{value} → string */
    async setPinValue(pathToPin, value) { return this.request(`/pin/setvalue/${pathToPin}/${encodeURIComponent(value)}`); }

    /** GET /pin/reset/{pathToPin} → string */
    async resetPin(pathToPin) { return this.request(`/pin/reset/${pathToPin}`); }

    /** GET /pin/getinfo/{pathToPin} → PinInformation { dataType, details, name, pinType } */
    async getPinInfo(pathToPin) { return this.request(`/pin/getinfo/${pathToPin}`); }

    /** GET /pin/fadevalue/{pathToPin}/{value}/{fadetime} — fadetime in ms → string */
    async fadePinValue(pathToPin, value, fadetime) {
        return this.request(`/pin/fadevalue/${pathToPin}/${encodeURIComponent(value)}/${fadetime}`);
    }

    // ================================================================
    // HEALTH CHECK (convenience)
    // ================================================================
    async healthCheck() {
        try {
            const info = await this.getInfo();
            return { ok: true, info };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }
}

class APIError extends Error {
    constructor(status, message, path) {
        super(`[${status}] ${path}: ${message}`);
        this.name = 'APIError';
        this.status = status;
        this.path = path;
    }
}

// Global singleton
const hippoAPI = new HippoAPI();
