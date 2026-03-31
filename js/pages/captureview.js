/**
 * Capture 2025 File Viewer — .c2p project file explorer
 * Luxor Production
 *
 * Opens Capture 2025 .c2p project files, decompresses their contents,
 * extracts readable strings, embedded images, and renders a best-effort
 * 3D visualization of discovered trusses and fixtures.
 */
const CaptureViewPage = {

    // ================================================================
    // STATE
    // ================================================================
    _file: null,            // raw File reference
    _header: null,          // parsed header info
    _decompressed: null,    // Uint8Array of decompressed data
    _strings: [],           // extracted string objects { offset, text }
    _categorized: null,     // { layers, trusses, fixtures, scenes, media, other }
    _images: [],            // extracted JPEG blobs
    _scene: null,
    _camera: null,
    _renderer: null,
    _animId: null,
    _resizeObserver: null,
    _orbitState: null,
    _filterText: '',

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        return `
        <style>
            .cv-dropzone {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 420px; border: 2px dashed var(--border-color); border-radius: var(--radius-xl);
                background: var(--bg-card); cursor: pointer; transition: all 0.2s;
                padding: 60px 40px; text-align: center; margin: 40px auto; max-width: 600px;
            }
            .cv-dropzone:hover, .cv-dropzone.cv-drag-over {
                border-color: var(--accent); background: var(--accent-glow);
            }
            .cv-dropzone i.cv-drop-icon { font-size: 56px; color: var(--text-muted); margin-bottom: 20px; }
            .cv-dropzone:hover i.cv-drop-icon, .cv-dropzone.cv-drag-over i.cv-drop-icon { color: var(--accent); }
            .cv-dropzone h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 8px; }
            .cv-dropzone p { font-size: 12px; color: var(--text-muted); }
            .cv-file-input { display: none; }

            .cv-stats-bar { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px; }
            .cv-main { display: grid; grid-template-columns: 3fr 2fr; gap: 12px; min-height: 460px; }
            .cv-viewer-wrap { position: relative; background: #0a0a0c; border-radius: var(--radius-lg); border: 1px solid var(--border-color); overflow: hidden; min-height: 400px; }
            .cv-viewer-canvas { width: 100%; height: 100%; }
            .cv-viewer-toolbar { position: absolute; top: 10px; left: 10px; display: flex; gap: 4px; z-index: 10; }
            .cv-viewer-hint { position: absolute; bottom: 8px; left: 10px; font-size: 9px; color: var(--text-muted); z-index: 10; }

            .cv-sidebar { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: calc(100vh - 220px); }
            .cv-tree { font-size: 11px; }
            .cv-tree-section { margin-bottom: 6px; }
            .cv-tree-header {
                display: flex; align-items: center; gap: 6px; padding: 6px 10px; cursor: pointer;
                background: var(--bg-tertiary); border-radius: var(--radius-sm); font-weight: 700;
                color: var(--text-secondary); font-size: 11px; user-select: none;
            }
            .cv-tree-header:hover { color: var(--text-primary); background: var(--bg-hover); }
            .cv-tree-header i.cv-chevron { font-size: 8px; transition: transform 0.15s; }
            .cv-tree-header.cv-collapsed i.cv-chevron { transform: rotate(-90deg); }
            .cv-tree-items { padding: 2px 0 2px 18px; }
            .cv-tree-items.cv-hidden { display: none; }
            .cv-tree-item {
                display: flex; align-items: center; gap: 6px; padding: 3px 8px;
                border-radius: var(--radius-xs); font-size: 11px; color: var(--text-secondary);
                cursor: default; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .cv-tree-item:hover { background: var(--bg-hover); color: var(--text-primary); }
            .cv-tree-item i { font-size: 10px; flex-shrink: 0; }

            .cv-raw-section { margin-top: 12px; }
            .cv-raw-header {
                display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
                background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);
                cursor: pointer; user-select: none;
            }
            .cv-raw-header:hover { border-color: var(--accent); }
            .cv-raw-header h3 { font-size: 13px; display: flex; align-items: center; gap: 8px; }
            .cv-raw-body { padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
            .cv-raw-body.cv-hidden { display: none; }

            .cv-search { display: flex; gap: 8px; margin-bottom: 10px; }
            .cv-search input { flex: 1; }

            .cv-str-category { margin-bottom: 12px; }
            .cv-str-category-title { font-size: 11px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
            .cv-str-list { display: flex; flex-wrap: wrap; gap: 4px; }
            .cv-str-chip {
                padding: 2px 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color);
                border-radius: var(--radius-sm); font-size: 10px; color: var(--text-secondary);
                font-family: var(--mono); max-width: 300px; overflow: hidden; text-overflow: ellipsis;
                white-space: nowrap;
            }

            .cv-images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
            .cv-thumb {
                aspect-ratio: 16/9; border-radius: var(--radius-sm); border: 1px solid var(--border-color);
                overflow: hidden; cursor: pointer; transition: all 0.15s; background: var(--bg-primary);
            }
            .cv-thumb:hover { border-color: var(--accent); transform: scale(1.03); }
            .cv-thumb img { width: 100%; height: 100%; object-fit: cover; }

            .cv-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: var(--text-muted); font-size: 13px; }
            .cv-loading .spinner { width: 20px; height: 20px; border: 2px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>

        <div class="section-header">
            <h2><i class="fas fa-cube"></i> Capture 2025 Viewer</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="CaptureViewPage._reset()" title="Close current file"><i class="fas fa-times"></i> Close</button>
                <button class="btn btn-sm" onclick="CaptureViewPage._exportJSON()" title="Export extracted data as JSON"><i class="fas fa-file-export"></i> Export JSON</button>
                <button class="btn btn-sm btn-accent" onclick="CaptureViewPage._exportPNG()" title="Export 3D view as PNG"><i class="fas fa-camera"></i> Export PNG</button>
            </div>
        </div>

        <div id="cv-root">
            <!-- Dropzone shown when no file loaded -->
            <div id="cv-dropzone" class="cv-dropzone">
                <i class="fas fa-cube cv-drop-icon"></i>
                <h3>Drop a Capture 2025 (.c2p) file here</h3>
                <p>or click to browse</p>
                <input type="file" accept=".c2p" class="cv-file-input" id="cv-file-input">
            </div>

            <!-- Loading state -->
            <div id="cv-loading" class="cv-loading" style="display:none;">
                <div class="spinner"></div>
                <span>Decompressing and analysing project file...</span>
            </div>

            <!-- Project content (hidden until file loaded) -->
            <div id="cv-content" style="display:none;">
                <!-- Stats bar -->
                <div class="cv-stats-bar" id="cv-stats-bar"></div>

                <!-- Main two-column layout -->
                <div class="cv-main">
                    <!-- 3D Viewer -->
                    <div class="cv-viewer-wrap">
                        <div id="cv-3d-canvas" class="cv-viewer-canvas"></div>
                        <div class="cv-viewer-toolbar">
                            <button class="btn btn-xs btn-secondary" onclick="CaptureViewPage._setCameraPreset('perspective')" title="Perspective"><i class="fas fa-video"></i></button>
                            <button class="btn btn-xs btn-secondary" onclick="CaptureViewPage._setCameraPreset('front')" title="Front View"><i class="fas fa-arrow-right"></i> Front</button>
                            <button class="btn btn-xs btn-secondary" onclick="CaptureViewPage._setCameraPreset('top')" title="Top View"><i class="fas fa-arrow-down"></i> Top</button>
                        </div>
                        <div class="cv-viewer-hint">Orbit: Left drag &middot; Pan: Right drag &middot; Zoom: Scroll</div>
                    </div>

                    <!-- Sidebar: tree + properties -->
                    <div class="cv-sidebar">
                        <div class="card" style="margin:0;">
                            <div class="card-header" style="padding:8px 12px;"><h3 style="font-size:12px;"><i class="fas fa-stream"></i> Project Info</h3></div>
                            <div class="card-body" style="padding:8px 12px;" id="cv-project-info"></div>
                        </div>
                        <div class="card" style="margin:0;flex:1;overflow-y:auto;">
                            <div class="card-header" style="padding:8px 12px;"><h3 style="font-size:12px;"><i class="fas fa-sitemap"></i> Layer / Truss Tree</h3></div>
                            <div class="card-body cv-tree" style="padding:6px 8px;" id="cv-tree-body"></div>
                        </div>
                        <div class="card" style="margin:0;" id="cv-images-card">
                            <div class="card-header" style="padding:8px 12px;"><h3 style="font-size:12px;"><i class="fas fa-image"></i> Embedded Images <span id="cv-img-count" class="badge badge-cyan" style="margin-left:6px;">0</span></h3></div>
                            <div class="card-body" style="padding:8px;" id="cv-images-body"></div>
                        </div>
                    </div>
                </div>

                <!-- Raw Data Explorer (collapsible) -->
                <div class="cv-raw-section">
                    <div class="cv-raw-header" onclick="CaptureViewPage._toggleRaw()">
                        <h3><i class="fas fa-database"></i> Raw Data Explorer</h3>
                        <i class="fas fa-chevron-down" id="cv-raw-chevron"></i>
                    </div>
                    <div class="cv-raw-body cv-hidden" id="cv-raw-body">
                        <div class="cv-search">
                            <input type="text" class="form-control" id="cv-raw-search" placeholder="Filter strings..." oninput="CaptureViewPage._onFilterChange()">
                            <button class="btn btn-sm" onclick="CaptureViewPage._copyStrings()"><i class="fas fa-copy"></i> Copy All</button>
                        </div>
                        <div id="cv-raw-content"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    onActivate() {
        setTimeout(() => this._bindDropzone(), 50);
    },

    onDeactivate() {
        this._cleanup3D();
    },

    // ================================================================
    // FILE DROP / BROWSE
    // ================================================================
    _bindDropzone() {
        const dz = document.getElementById('cv-dropzone');
        const fi = document.getElementById('cv-file-input');
        if (!dz || !fi) return;

        dz.addEventListener('click', () => {
            // In Electron, <input type="file"> click can sometimes be blocked.
            // Use the Electron native dialog as fallback if available.
            if (typeof window.electronAPI !== 'undefined' || typeof window.luxorProject !== 'undefined') {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = '.c2p';
                inp.style.display = 'none';
                document.body.appendChild(inp);
                inp.addEventListener('change', (e) => {
                    if (e.target.files.length) this._loadFile(e.target.files[0]);
                    inp.remove();
                });
                inp.click();
            } else {
                fi.click();
            }
        });
        fi.addEventListener('change', (e) => {
            if (e.target.files.length) this._loadFile(e.target.files[0]);
        });

        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('cv-drag-over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('cv-drag-over'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.classList.remove('cv-drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this._loadFile(file);
        });
    },

    // ================================================================
    // FILE PARSING
    // ================================================================
    async _loadFile(file) {
        if (!file.name.toLowerCase().endsWith('.c2p')) {
            UI.toast('Please select a .c2p file', 'warning');
            return;
        }

        this._file = file;
        document.getElementById('cv-dropzone').style.display = 'none';
        document.getElementById('cv-loading').style.display = 'flex';
        document.getElementById('cv-content').style.display = 'none';

        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            // Parse header (first 64 bytes)
            this._header = this._parseHeader(bytes);

            // Skip 2-byte zlib header (78 9c at offset 62), raw deflate data starts at 64
            const compressedSlice = bytes.slice(64);
            this._decompressed = await this._decompress(compressedSlice);

            // Extract strings
            this._strings = this._extractStrings(this._decompressed);

            // Categorize strings
            this._categorized = this._categorizeStrings(this._strings);

            // Extract embedded JPEG images
            this._images = this._extractImages(this._decompressed);

            // Show content
            document.getElementById('cv-loading').style.display = 'none';
            document.getElementById('cv-content').style.display = '';

            this._renderStats();
            this._renderProjectInfo();
            this._renderTree();
            this._renderImages();
            this._renderRawData();
            setTimeout(() => this._init3D(), 80);

            UI.toast(`Loaded ${file.name} — ${this._strings.length} strings extracted`, 'success');
        } catch (err) {
            document.getElementById('cv-loading').style.display = 'none';
            document.getElementById('cv-dropzone').style.display = '';
            console.error('CaptureView parse error:', err);
            UI.toast('Failed to parse .c2p file: ' + err.message, 'error');
        }
    },

    _parseHeader(bytes) {
        // First 64 bytes: magic + metadata strings
        const headerBytes = bytes.slice(0, 64);
        let headerText = '';
        for (let i = 0; i < headerBytes.length; i++) {
            const b = headerBytes[i];
            if (b >= 32 && b < 127) headerText += String.fromCharCode(b);
            else if (headerText.length) headerText += ' ';
        }

        // Try to find version-like patterns
        const versionMatch = headerText.match(/(\d+\.\d+[\.\d]*)/);
        const softwareVersion = versionMatch ? versionMatch[1] : 'Unknown';

        // Check for known magic strings
        const hasProject = headerText.toLowerCase().includes('project');
        const hasSoftware = headerText.toLowerCase().includes('software') || headerText.toLowerCase().includes('capture');

        return {
            raw: headerText.trim(),
            softwareVersion,
            hasProject,
            hasSoftware,
            fileSize: bytes.length
        };
    },

    async _decompress(compressed) {
        // Use deflate-raw to decompress (data is raw deflate after the 2-byte zlib header)
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();

        // Write compressed data — close may throw if there's trailing data
        writer.write(compressed);
        writer.close().catch(() => {});

        // Read all decompressed chunks — c2p files often have trailing data
        // after the deflate stream which causes an error, but we keep what we got
        const chunks = [];
        let totalLen = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                totalLen += value.length;
            }
        } catch (_) {
            // Trailing data after deflate stream — decompressed data is still valid
        }

        // Merge into single Uint8Array
        const result = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    },

    _extractStrings(data) {
        const strings = [];
        const seen = new Set();

        // ── Pass 1: ASCII strings (bytes 32–126) ──
        let current = '';
        let startOffset = 0;
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            if (byte >= 32 && byte < 127) {
                if (!current.length) startOffset = i;
                current += String.fromCharCode(byte);
            } else {
                if (current.length >= 3) {
                    strings.push({ offset: startOffset, text: current, encoding: 'ascii' });
                    seen.add(current);
                }
                current = '';
            }
        }
        if (current.length >= 3) {
            strings.push({ offset: startOffset, text: current, encoding: 'ascii' });
            seen.add(current);
        }

        // ── Pass 2: UTF-16LE strings (.NET/C# stores strings this way) ──
        let u16 = '';
        let u16Start = 0;
        for (let i = 0; i < data.length - 1; i += 2) {
            const lo = data[i], hi = data[i + 1];
            const ch = lo | (hi << 8);
            if (ch >= 32 && ch < 0xFFFE && hi < 0x10) {
                if (!u16.length) u16Start = i;
                u16 += String.fromCharCode(ch);
            } else {
                if (u16.length >= 3 && !seen.has(u16)) {
                    strings.push({ offset: u16Start, text: u16, encoding: 'utf16' });
                    seen.add(u16);
                }
                u16 = '';
            }
        }
        if (u16.length >= 3 && !seen.has(u16)) {
            strings.push({ offset: u16Start, text: u16, encoding: 'utf16' });
        }

        // ── Pass 3: .NET length-prefixed strings ──
        // .NET BinaryWriter prefixes strings with a 7-bit encoded length byte
        for (let i = 0; i < data.length - 4; i++) {
            const len = data[i];
            if (len >= 3 && len <= 200 && i + 1 + len <= data.length) {
                let valid = true;
                let str = '';
                for (let j = 0; j < len; j++) {
                    const b = data[i + 1 + j];
                    if (b >= 32 && b < 127) {
                        str += String.fromCharCode(b);
                    } else {
                        valid = false;
                        break;
                    }
                }
                if (valid && str.length >= 3 && !seen.has(str)) {
                    // Verify it looks like a real string (has letters)
                    if (/[a-zA-Z]/.test(str)) {
                        strings.push({ offset: i, text: str, encoding: 'lenprefix' });
                        seen.add(str);
                    }
                }
            }
        }

        // Sort by offset
        strings.sort((a, b) => a.offset - b.offset);
        return strings;
    },

    _categorizeStrings(strings) {
        const layers = [];
        const trusses = [];
        const fixtures = [];
        const scenes = [];
        const media = [];
        const dmx = [];
        const equipment = [];
        const positions = [];
        const other = [];

        // Patterns to filter out (UI state / binary artifacts)
        const junkPatterns = [
            /^[A-Za-z]:\\/, /^System\./, /^\{[0-9a-f-]+\}$/i, /^Microsoft\./,
            /^Windows\./, /^HKEY_/, /^REG_/, /^<\/?[a-z]+/i,
            /^(true|false|null|undefined)$/i, /^\s+$/,
            /^(Width|Height|Top|Left|Visible|Enabled|Font|Color|Size|Position|Dock|Anchor|Tab)/,
            /^(get_|set_|add_|remove_|op_|\.ctor)/, /^System\b/,
            /^[A-Z][a-z]+[A-Z][a-z]+[A-Z]/, // CamelCase code identifiers with 3+ humps
        ];

        // Known fixture brand/model names for better matching
        const fixturePatterns = /\b(fixture|dimmer|wash|spot|beam|moving.?head|par\b|profile|follow.?spot|strobe|blinder|gobo|prism|iris|zoom|pan|tilt|shutter|frost|cto|ctb|cmyk|gel|barn.?door|scroller)\b/i;
        const fixtureManufacturers = /\b(Robe|Martin|Clay.?Paky|GLP|Vari.?Lite|Ayrton|Chauvet|Elation|ETC|Philips|High.?End|JB.?Lighting|Robert.?Juliat|Astera|Prolights|Acme|SGM|Claypaky|ADJ|Showline|dTS|PR.?Lighting)\b/i;
        const fixtureModels = /\b(MegaPointe|Spiider|LEDBeam|BMFL|Robin|T[12]\s|Pointe|LEDWash|DL[47]|Sharpy|Scenius|Mythos|Impression|MAC\s|Aura|Quantum|Viper|ERA|iForte|Maverick|Ovation|Platinum|VL\d|Source.?Four|ColorSource|MagicPanel|Pixeline|Libra|Color.?Strike|Force|Solo|Encore|Fuze|Arena|Esprite|Forte|Tarrantula|SuperStar)\b/i;

        const trussPatterns = /\b(truss|rigg|pipe|batten|bar\s|ladder|box.?truss|tri.?truss|pre.?rig|ground.?support|tower|sleeve.?block|corner|hinge|baseplate)\b/i;
        const dmxPatterns = /\b(dmx|universe|address|channel|artnet|sacn|rdm|dmx.?\d|uni\.?\s?\d|addr\.?\s?\d|patch|protocol)\b/i;
        const posPatterns = /^-?\d+\.?\d*[,;]\s*-?\d+\.?\d*[,;]\s*-?\d+\.?\d*$/;

        for (const s of strings) {
            const t = s.text;

            // Skip very short strings or junk
            if (t.length < 3) continue;
            if (junkPatterns.some(p => p.test(t))) continue;

            // Pure numbers — check if it could be a DMX/coordinate value, otherwise skip
            if (/^[0-9.]+$/.test(t)) {
                if (posPatterns.test(t)) { positions.push(s); }
                continue;
            }

            if (trussPatterns.test(t)) {
                trusses.push(s);
            } else if (fixturePatterns.test(t) || fixtureModels.test(t)) {
                fixtures.push(s);
            } else if (fixtureManufacturers.test(t)) {
                equipment.push(s);
            } else if (/layer/i.test(t)) {
                layers.push(s);
            } else if (dmxPatterns.test(t)) {
                dmx.push(s);
            } else if (/scene/i.test(t)) {
                scenes.push(s);
            } else if (/\.(jpg|jpeg|png|bmp|tga|tif|mp4|mov|avi|exr|hdr|obj|3ds|fbx)$/i.test(t)) {
                media.push(s);
            } else if (posPatterns.test(t)) {
                positions.push(s);
            } else {
                other.push(s);
            }
        }

        return { layers, trusses, fixtures, scenes, media, dmx, equipment, positions, other };
    },

    _extractImages(data) {
        const images = [];
        // Scan for JPEG SOI markers: FF D8 FF
        for (let i = 0; i < data.length - 3; i++) {
            if (data[i] === 0xFF && data[i + 1] === 0xD8 && data[i + 2] === 0xFF) {
                // Find end marker FF D9
                let end = -1;
                for (let j = i + 3; j < data.length - 1; j++) {
                    if (data[j] === 0xFF && data[j + 1] === 0xD9) {
                        end = j + 2;
                        break;
                    }
                }
                if (end > i && (end - i) > 100) { // skip tiny artifacts
                    const jpegData = data.slice(i, end);
                    const blob = new Blob([jpegData], { type: 'image/jpeg' });
                    images.push({ offset: i, size: end - i, blob, url: URL.createObjectURL(blob) });
                    i = end; // skip past this image
                }
            }
        }
        return images;
    },

    // ================================================================
    // UI RENDERING
    // ================================================================
    _renderStats() {
        const c = this._categorized;
        const el = document.getElementById('cv-stats-bar');
        if (!el) return;

        el.innerHTML = [
            UI.statCard('fa-layer-group', 'accent', 'Layers', c.layers.length),
            UI.statCard('fa-grip-lines', 'blue', 'Trusses', c.trusses.length),
            UI.statCard('fa-lightbulb', 'orange', 'Fixtures', c.fixtures.length),
            UI.statCard('fa-industry', 'yellow', 'Equipment', c.equipment.length),
            UI.statCard('fa-sliders-h', 'green', 'DMX', c.dmx.length),
            UI.statCard('fa-film', 'purple', 'Scenes', c.scenes.length),
            UI.statCard('fa-image', 'cyan', 'Images', this._images.length),
            UI.statCard('fa-database', 'muted', 'Total Strings', this._strings.length),
        ].join('');
    },

    _renderProjectInfo() {
        const el = document.getElementById('cv-project-info');
        if (!el) return;

        // First meaningful string is often the project title
        const titleCandidate = this._strings.find(s => s.text.length > 4 && !/^[{(<]/.test(s.text) && !/^\d+$/.test(s.text));
        const projectName = titleCandidate ? titleCandidate.text : 'Unknown Project';

        el.innerHTML = `
            <div style="font-size:11px;color:var(--text-secondary);display:flex;flex-direction:column;gap:4px;">
                <div><span style="color:var(--text-muted);min-width:100px;display:inline-block;">Project:</span> <strong style="color:var(--text-primary);">${UI.esc(projectName)}</strong></div>
                <div><span style="color:var(--text-muted);min-width:100px;display:inline-block;">Software:</span> Capture ${UI.esc(this._header.softwareVersion)}</div>
                <div><span style="color:var(--text-muted);min-width:100px;display:inline-block;">File Size:</span> ${UI.formatBytes(this._header.fileSize)}</div>
                <div><span style="color:var(--text-muted);min-width:100px;display:inline-block;">Decompressed:</span> ${UI.formatBytes(this._decompressed.length)}</div>
                <div><span style="color:var(--text-muted);min-width:100px;display:inline-block;">Header:</span> <span style="font-family:var(--mono);font-size:10px;">${UI.esc(this._header.raw.substring(0, 60))}</span></div>
            </div>
        `;
    },

    _renderTree() {
        const el = document.getElementById('cv-tree-body');
        if (!el) return;

        const c = this._categorized;
        const sections = [
            { key: 'layers',    label: 'Layers',    icon: 'fa-layer-group', color: 'var(--accent)',  items: c.layers },
            { key: 'trusses',   label: 'Trusses',   icon: 'fa-grip-lines',  color: 'var(--blue)',    items: c.trusses },
            { key: 'fixtures',  label: 'Fixtures',   icon: 'fa-lightbulb',   color: 'var(--orange)',  items: c.fixtures },
            { key: 'equipment', label: 'Equipment',  icon: 'fa-industry',    color: '#eab308',        items: c.equipment },
            { key: 'dmx',       label: 'DMX / Patch',icon: 'fa-sliders-h',   color: 'var(--green)',   items: c.dmx },
            { key: 'scenes',    label: 'Scenes',     icon: 'fa-film',        color: 'var(--purple)',  items: c.scenes },
            { key: 'media',     label: 'Media',      icon: 'fa-image',       color: 'var(--cyan)',    items: c.media },
            { key: 'positions', label: 'Positions',  icon: 'fa-crosshairs',  color: 'var(--text-muted)', items: c.positions },
        ];

        el.innerHTML = sections.map(sec => {
            if (!sec.items.length) return '';
            // De-duplicate by text
            const unique = [...new Map(sec.items.map(s => [s.text, s])).values()];
            return `
                <div class="cv-tree-section">
                    <div class="cv-tree-header" onclick="CaptureViewPage._toggleTreeSection(this)">
                        <i class="fas fa-chevron-down cv-chevron" style="font-size:8px;"></i>
                        <i class="fas ${sec.icon}" style="color:${sec.color};font-size:10px;"></i>
                        <span>${sec.label}</span>
                        <span class="badge badge-cyan" style="margin-left:auto;font-size:9px;">${unique.length}</span>
                    </div>
                    <div class="cv-tree-items">
                        ${unique.slice(0, 100).map(s => `
                            <div class="cv-tree-item" title="Offset: 0x${s.offset.toString(16)}">
                                <i class="fas ${sec.icon}" style="color:${sec.color};"></i>
                                <span>${UI.esc(s.text)}</span>
                            </div>
                        `).join('')}
                        ${unique.length > 100 ? `<div class="cv-tree-item" style="color:var(--text-muted);font-style:italic;">+${unique.length - 100} more...</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    _toggleTreeSection(header) {
        header.classList.toggle('cv-collapsed');
        const items = header.nextElementSibling;
        if (items) items.classList.toggle('cv-hidden');
    },

    _renderImages() {
        const countEl = document.getElementById('cv-img-count');
        const bodyEl = document.getElementById('cv-images-body');
        const cardEl = document.getElementById('cv-images-card');
        if (!bodyEl) return;

        if (countEl) countEl.textContent = this._images.length;

        if (!this._images.length) {
            if (cardEl) cardEl.style.display = 'none';
            return;
        }

        bodyEl.innerHTML = `
            <div class="cv-images-grid">
                ${this._images.map((img, i) => `
                    <div class="cv-thumb" onclick="CaptureViewPage._viewImage(${i})" title="Image #${i + 1} (${UI.formatBytes(img.size)}) at offset 0x${img.offset.toString(16)}">
                        <img src="${img.url}" alt="Embedded image ${i + 1}">
                    </div>
                `).join('')}
            </div>
        `;
    },

    _viewImage(idx) {
        const img = this._images[idx];
        if (!img) return;
        UI.openModal(
            `Embedded Image #${idx + 1}`,
            `<div style="text-align:center;">
                <img src="${img.url}" style="max-width:100%;max-height:70vh;border-radius:var(--radius-md);">
                <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
                    Size: ${UI.formatBytes(img.size)} &middot; Offset: 0x${img.offset.toString(16)}
                </div>
            </div>`,
            `<button class="btn" onclick="UI.closeModal()">Close</button>`
        );
    },

    _renderRawData() {
        this._renderFilteredRawData();
    },

    _onFilterChange() {
        const input = document.getElementById('cv-raw-search');
        this._filterText = input ? input.value.toLowerCase() : '';
        this._renderFilteredRawData();
    },

    _renderFilteredRawData() {
        const el = document.getElementById('cv-raw-content');
        if (!el) return;

        const c = this._categorized;
        const filter = this._filterText;

        const cats = [
            { key: 'layers',    label: 'Layers',    items: c.layers },
            { key: 'trusses',   label: 'Trusses',   items: c.trusses },
            { key: 'fixtures',  label: 'Fixtures',   items: c.fixtures },
            { key: 'equipment', label: 'Equipment',  items: c.equipment },
            { key: 'dmx',       label: 'DMX / Patch',items: c.dmx },
            { key: 'scenes',    label: 'Scenes',     items: c.scenes },
            { key: 'media',     label: 'Media',      items: c.media },
            { key: 'positions', label: 'Positions',  items: c.positions },
            { key: 'other',     label: 'Other',      items: c.other },
        ];

        el.innerHTML = cats.map(cat => {
            let items = cat.items;
            if (filter) {
                items = items.filter(s => s.text.toLowerCase().includes(filter));
            }
            if (!items.length) return '';
            // De-duplicate
            const unique = [...new Map(items.map(s => [s.text, s])).values()];

            return `
                <div class="cv-str-category">
                    <div class="cv-str-category-title">
                        ${cat.label}
                        <span class="badge badge-cyan" style="font-size:9px;">${unique.length}</span>
                        <button class="btn btn-xs btn-secondary" style="margin-left:auto;font-size:9px;padding:1px 6px;" onclick="CaptureViewPage._copyCategoryStrings('${cat.key}')"><i class="fas fa-copy"></i></button>
                    </div>
                    <div class="cv-str-list">
                        ${unique.slice(0, 200).map(s => `<div class="cv-str-chip" title="Offset: 0x${s.offset.toString(16)}">${UI.esc(s.text)}</div>`).join('')}
                        ${unique.length > 200 ? `<div class="cv-str-chip" style="color:var(--text-muted);font-style:italic;">+${unique.length - 200} more</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    _toggleRaw() {
        const body = document.getElementById('cv-raw-body');
        const chevron = document.getElementById('cv-raw-chevron');
        if (!body) return;
        body.classList.toggle('cv-hidden');
        if (chevron) {
            chevron.style.transform = body.classList.contains('cv-hidden') ? '' : 'rotate(180deg)';
        }
    },

    _copyStrings() {
        if (!this._categorized) return;
        const allUnique = [...new Map(this._strings.map(s => [s.text, s])).values()];
        const text = allUnique.map(s => s.text).join('\n');
        navigator.clipboard.writeText(text).then(
            () => UI.toast(`Copied ${allUnique.length} strings to clipboard`, 'success'),
            () => UI.toast('Failed to copy to clipboard', 'error')
        );
    },

    _copyCategoryStrings(key) {
        if (!this._categorized || !this._categorized[key]) return;
        const unique = [...new Map(this._categorized[key].map(s => [s.text, s])).values()];
        const text = unique.map(s => s.text).join('\n');
        navigator.clipboard.writeText(text).then(
            () => UI.toast(`Copied ${unique.length} ${key} strings`, 'success'),
            () => UI.toast('Failed to copy to clipboard', 'error')
        );
    },

    // ================================================================
    // 3D VISUALIZATION
    // ================================================================
    _init3D() {
        const container = document.getElementById('cv-3d-canvas');
        if (!container || !window.THREE) return;

        this._cleanup3D();

        // Scene
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x0a0a0c);
        this._scene.fog = new THREE.Fog(0x0a0a0c, 40, 100);

        // Camera
        this._camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
        this._camera.position.set(14, 10, 18);
        this._camera.lookAt(0, 3, 0);

        // Renderer
        this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this._renderer.setSize(container.clientWidth, container.clientHeight);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.innerHTML = '';
        container.appendChild(this._renderer.domElement);

        // Orbit controls (manual spherical implementation)
        this._setupOrbitControls(container);

        // Lights
        const ambient = new THREE.AmbientLight(0x404060, 0.6);
        this._scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        this._scene.add(dirLight);
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362a28, 0.3);
        this._scene.add(hemiLight);

        // Grid
        const grid = new THREE.GridHelper(40, 40, 0x222233, 0x111122);
        this._scene.add(grid);

        // Stage floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this._scene.add(floor);

        // Axes helper
        const axes = new THREE.AxesHelper(2);
        axes.position.set(-18, 0.01, -18);
        this._scene.add(axes);

        // Build 3D objects from discovered data
        this._buildSceneFromData();

        // Resize
        this._resizeObserver = new ResizeObserver(() => {
            if (!this._camera || !this._renderer) return;
            this._camera.aspect = container.clientWidth / container.clientHeight;
            this._camera.updateProjectionMatrix();
            this._renderer.setSize(container.clientWidth, container.clientHeight);
        });
        this._resizeObserver.observe(container);

        // Animate
        this._startAnimation();
    },

    _setupOrbitControls(container) {
        let isOrbiting = false;
        let isPanning = false;
        let prevX = 0, prevY = 0;
        const cam = this._camera;
        const spherical = {
            theta: Math.atan2(cam.position.x, cam.position.z),
            phi: Math.acos(cam.position.y / cam.position.length()),
            radius: cam.position.length()
        };
        const target = new THREE.Vector3(0, 3, 0);

        const updateCamera = () => {
            const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            const y = spherical.radius * Math.cos(spherical.phi);
            const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            this._camera.position.set(target.x + x, target.y + y, target.z + z);
            this._camera.lookAt(target);
        };

        this._orbitState = { spherical, target, updateCamera };

        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) isOrbiting = true;
            else if (e.button === 2) isPanning = true;
            prevX = e.clientX; prevY = e.clientY;
        });

        container.addEventListener('mousemove', (e) => {
            const dx = e.clientX - prevX;
            const dy = e.clientY - prevY;
            prevX = e.clientX; prevY = e.clientY;

            if (isOrbiting) {
                spherical.theta -= dx * 0.005;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.005));
                updateCamera();
            }
            if (isPanning) {
                const panSpeed = 0.02 * spherical.radius;
                const right = new THREE.Vector3();
                const up = new THREE.Vector3(0, 1, 0);
                right.crossVectors(this._camera.getWorldDirection(new THREE.Vector3()), up).normalize();
                target.add(right.multiplyScalar(-dx * panSpeed * 0.1));
                target.y += dy * panSpeed * 0.1;
                updateCamera();
            }
        });

        const onUp = () => { isOrbiting = false; isPanning = false; };
        container.addEventListener('mouseup', onUp);
        container.addEventListener('mouseleave', onUp);

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            spherical.radius = Math.max(3, Math.min(60, spherical.radius + e.deltaY * 0.02));
            updateCamera();
        }, { passive: false });

        container.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    _buildSceneFromData() {
        if (!this._scene || !this._categorized) return;

        const c = this._categorized;

        // De-duplicate names
        const trussNames = [...new Map(c.trusses.map(s => [s.text, s])).values()].map(s => s.text);
        const fixtureNames = [...new Map(c.fixtures.map(s => [s.text, s])).values()].map(s => s.text);
        const equipNames = [...new Map(c.equipment.map(s => [s.text, s])).values()].map(s => s.text);
        // Combine fixtures + equipment for 3D placement
        const allFixtures = [...fixtureNames, ...equipNames];

        const trussColor = 0x94a3b8;
        const fixtureColor = 0xeab308;
        const equipColor = 0xf97316;

        // Calculate stage size based on content
        const trussCount = Math.min(trussNames.length, 20);
        const totalFixtures = Math.min(allFixtures.length, 60);
        const stageWidth = Math.max(12, Math.min(24, trussCount * 2 + 8));
        const stageDepth = Math.max(8, Math.min(20, trussCount * 2.5 + 4));

        // Place trusses at staggered positions along the stage
        for (let i = 0; i < trussCount; i++) {
            const name = trussNames[i];
            const zPos = -2 - (i * (stageDepth / Math.max(trussCount, 1)));
            const yPos = 6 + (i % 3) * 0.5;
            const width = stageWidth - 2 + (i % 4) * 1;

            // Main truss bar
            this._addTrussBar(0, yPos, zPos, width, 0.25, 0.25, trussColor, name);

            // Cross-hatch lattice detail
            const segments = Math.floor(width / 0.8);
            for (let s = 0; s < segments; s++) {
                const xOff = -width / 2 + s * (width / segments) + (width / segments / 2);
                const strut = new THREE.Mesh(
                    new THREE.BoxGeometry(0.04, 0.25, 0.04),
                    new THREE.MeshStandardMaterial({ color: trussColor, roughness: 0.5 })
                );
                strut.position.set(xOff, yPos, zPos);
                this._scene.add(strut);

                if (s % 2 === 0) {
                    const brace = new THREE.Mesh(
                        new THREE.BoxGeometry(width / segments * 0.9, 0.03, 0.03),
                        new THREE.MeshStandardMaterial({ color: trussColor, roughness: 0.6, metalness: 0.3 })
                    );
                    brace.position.set(xOff, yPos + 0.08, zPos + 0.1);
                    brace.rotation.z = 0.4;
                    this._scene.add(brace);
                }
            }

            this._addLabel(name, 0, yPos + 0.5, zPos, '#94a3b8');
        }

        // Place fixture markers under trusses — distribute evenly
        const fixturesPerTruss = trussCount > 0 ? Math.ceil(totalFixtures / trussCount) : totalFixtures;
        for (let i = 0; i < totalFixtures; i++) {
            const trussIdx = trussCount > 0 ? (i % trussCount) : 0;
            const posInTruss = Math.floor(i / Math.max(trussCount, 1));
            const zPos = -2 - (trussIdx * (stageDepth / Math.max(trussCount, 1)));
            const yPos = 5.5 + (trussIdx % 3) * 0.5;
            const spread = stageWidth - 4;
            const xPos = -spread / 2 + (posInTruss % fixturesPerTruss) * (spread / Math.max(fixturesPerTruss - 1, 1));

            const isEquip = i >= fixtureNames.length;
            const color = isEquip ? equipColor : fixtureColor;
            const name = allFixtures[i];

            const fixture = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8),
                new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.4 })
            );
            fixture.position.set(xPos, yPos, zPos);
            this._scene.add(fixture);

            // Clamp (attaches fixture to truss)
            const clamp = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6),
                new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.7 })
            );
            clamp.position.set(xPos, yPos + 0.25, zPos);
            this._scene.add(clamp);

            // Light beam cone
            const beam = new THREE.Mesh(
                new THREE.ConeGeometry(0.8, 4, 8, 1, true),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.04, side: THREE.DoubleSide })
            );
            beam.position.set(xPos, yPos - 2.2, zPos);
            this._scene.add(beam);

            // Label every 3rd fixture to avoid clutter
            if (i % 3 === 0 && name) {
                this._addLabel(name.substring(0, 25), xPos, yPos - 0.5, zPos, isEquip ? '#f97316' : '#eab308');
            }
        }

        // Stage floor
        const stageGeo = new THREE.BoxGeometry(stageWidth, 0.05, stageDepth);
        const stageMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
        const stageMesh = new THREE.Mesh(stageGeo, stageMat);
        stageMesh.position.set(0, 0.025, -(stageDepth / 2));
        stageMesh.receiveShadow = true;
        this._scene.add(stageMesh);

        // Stage edge highlight
        const edgeGeo = new THREE.BoxGeometry(stageWidth + 0.2, 0.15, 0.1);
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x00d4aa, emissive: 0x00d4aa, emissiveIntensity: 0.3 });
        const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
        edgeMesh.position.set(0, 0.075, 0.05);
        this._scene.add(edgeMesh);

        // Grid lines on stage floor
        const gridMat = new THREE.LineBasicMaterial({ color: 0x2a2a4e, transparent: true, opacity: 0.4 });
        for (let x = -stageWidth / 2; x <= stageWidth / 2; x += 2) {
            const pts = [new THREE.Vector3(x, 0.06, 0), new THREE.Vector3(x, 0.06, -stageDepth)];
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            this._scene.add(new THREE.Line(geo, gridMat));
        }
        for (let z = 0; z >= -stageDepth; z -= 2) {
            const pts = [new THREE.Vector3(-stageWidth / 2, 0.06, z), new THREE.Vector3(stageWidth / 2, 0.06, z)];
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            this._scene.add(new THREE.Line(geo, gridMat));
        }
    },

    _addTrussBar(x, y, z, w, h, d, color, name) {
        // Main horizontal bar (top chord)
        const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(w, 0.04, 0.04),
            new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 })
        );
        topBar.position.set(x, y + h / 2, z - d / 2);
        topBar.castShadow = true;
        this._scene.add(topBar);

        // Bottom chord
        const botBar = new THREE.Mesh(
            new THREE.BoxGeometry(w, 0.04, 0.04),
            new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 })
        );
        botBar.position.set(x, y - h / 2, z - d / 2);
        this._scene.add(botBar);

        // Top back chord
        const topBack = new THREE.Mesh(
            new THREE.BoxGeometry(w, 0.04, 0.04),
            new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 })
        );
        topBack.position.set(x, y + h / 2, z + d / 2);
        this._scene.add(topBack);

        // Bottom back chord
        const botBack = new THREE.Mesh(
            new THREE.BoxGeometry(w, 0.04, 0.04),
            new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 })
        );
        botBack.position.set(x, y - h / 2, z + d / 2);
        this._scene.add(botBack);
    },

    _addLabel(text, x, y, z, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 256, 64);
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayText = text.length > 28 ? text.substring(0, 25) + '...' : text;
        ctx.fillText(displayText, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y, z);
        sprite.scale.set(3, 0.75, 1);
        this._scene.add(sprite);
    },

    _startAnimation() {
        const animate = () => {
            this._animId = requestAnimationFrame(animate);
            if (this._renderer && this._scene && this._camera) {
                this._renderer.render(this._scene, this._camera);
            }
        };
        animate();
    },

    _stopAnimation() {
        if (this._animId) {
            cancelAnimationFrame(this._animId);
            this._animId = null;
        }
    },

    _cleanup3D() {
        this._stopAnimation();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._renderer) {
            this._renderer.dispose();
            this._renderer = null;
        }
        this._scene = null;
        this._camera = null;
        this._orbitState = null;
    },

    // ================================================================
    // CAMERA PRESETS
    // ================================================================
    _setCameraPreset(preset) {
        if (!this._orbitState) return;
        const s = this._orbitState.spherical;
        const t = this._orbitState.target;

        switch (preset) {
            case 'front':
                s.theta = 0;
                s.phi = Math.PI / 2;
                s.radius = 20;
                t.set(0, 3, 0);
                break;
            case 'top':
                s.theta = 0;
                s.phi = 0.15;
                s.radius = 25;
                t.set(0, 0, -5);
                break;
            case 'perspective':
            default:
                s.theta = Math.atan2(14, 18);
                s.phi = Math.acos(10 / Math.sqrt(14 * 14 + 10 * 10 + 18 * 18));
                s.radius = Math.sqrt(14 * 14 + 10 * 10 + 18 * 18);
                t.set(0, 3, 0);
                break;
        }
        this._orbitState.updateCamera();
    },

    // ================================================================
    // EXPORT
    // ================================================================
    _exportJSON() {
        if (!this._categorized) {
            UI.toast('No file loaded', 'warning');
            return;
        }

        const data = {
            fileName: this._file ? this._file.name : 'unknown',
            header: this._header,
            fileSize: this._header.fileSize,
            decompressedSize: this._decompressed ? this._decompressed.length : 0,
            stringsTotal: this._strings.length,
            layers: [...new Map(this._categorized.layers.map(s => [s.text, s])).values()].map(s => s.text),
            trusses: [...new Map(this._categorized.trusses.map(s => [s.text, s])).values()].map(s => s.text),
            fixtures: [...new Map(this._categorized.fixtures.map(s => [s.text, s])).values()].map(s => s.text),
            equipment: [...new Map(this._categorized.equipment.map(s => [s.text, s])).values()].map(s => s.text),
            dmx: [...new Map(this._categorized.dmx.map(s => [s.text, s])).values()].map(s => s.text),
            scenes: [...new Map(this._categorized.scenes.map(s => [s.text, s])).values()].map(s => s.text),
            media: [...new Map(this._categorized.media.map(s => [s.text, s])).values()].map(s => s.text),
            positions: [...new Map(this._categorized.positions.map(s => [s.text, s])).values()].map(s => s.text),
            embeddedImages: this._images.length,
            allStrings: [...new Map(this._strings.map(s => [s.text, s])).values()].map(s => ({ offset: s.offset, text: s.text }))
        };

        const json = JSON.stringify(data, null, 2);
        const name = this._file ? this._file.name.replace(/\.c2p$/i, '') + '_data.json' : 'capture_data.json';
        UI.exportFile(name, json, [{ name: 'JSON', extensions: ['json'] }]);
    },

    _exportPNG() {
        if (!this._renderer) {
            UI.toast('No 3D view to export', 'warning');
            return;
        }

        // Force a render
        if (this._scene && this._camera) {
            this._renderer.render(this._scene, this._camera);
        }

        const dataURL = this._renderer.domElement.toDataURL('image/png');

        // Convert data URL to blob for export
        const byteString = atob(dataURL.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'image/png' });

        const name = this._file ? this._file.name.replace(/\.c2p$/i, '') + '_3d.png' : 'capture_3d.png';

        // Use browser download fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('3D view exported as PNG', 'success');
    },

    // ================================================================
    // RESET
    // ================================================================
    _reset() {
        this._cleanup3D();

        // Revoke image blob URLs
        for (const img of this._images) {
            if (img.url) URL.revokeObjectURL(img.url);
        }

        this._file = null;
        this._header = null;
        this._decompressed = null;
        this._strings = [];
        this._categorized = null;
        this._images = [];
        this._filterText = '';

        // Reset UI
        const dz = document.getElementById('cv-dropzone');
        const loading = document.getElementById('cv-loading');
        const content = document.getElementById('cv-content');
        if (dz) dz.style.display = '';
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';

        // Re-bind dropzone events
        setTimeout(() => this._bindDropzone(), 50);
    }
};
