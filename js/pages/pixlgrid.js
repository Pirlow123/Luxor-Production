/**
 * PIXL Grid Page — LED Test Pattern Generator
 * Inspired by Video Walrus PIXL Grid application
 * Canvas-based grid generator for LED screen builds:
 *   - Custom panel types with pixel dimensions
 *   - Multiple grids on one canvas
 *   - Test patterns (grid, checkerboard, gradient, color bars, SMPTE, etc.)
 *   - Tile numbering and labeling
 *   - Color palettes (RGB, CMY, custom)
 *   - Live cursor animation
 *   - PNG export
 *   - Raster overlay with coordinates
 */
const PixlGridPage = {
    _canvas: null,
    _ctx: null,
    _animFrame: null,
    _cursorPos: { x: 0, y: 0 },
    _cursorDir: { x: 1, y: 1 },
    _cursorSpeed: 2,
    _liveCursor: false,

    // Canvas config
    _canvasW: 1920,
    _canvasH: 1080,
    _zoom: 1.0, // 0.1 to 5.0
    _bgColor: '#000000',
    _showRaster: true,
    _showNumbers: true,
    _showCoords: true,
    _rasterEdge: 1,
    _transparent: false,

    // Grids on the canvas
    _grids: [],
    _selectedGrid: null,

    // Current test pattern mode
    _patternMode: 'grid', // grid, checkerboard, gradient, colorbars, smpte, solid, crosshatch, moving, off
    _patternColor: '#ffffff',
    _solidColor: '#ff0000',
    _gradientDir: 'horizontal', // horizontal, vertical, diagonal

    // Panel type presets
    _panelTypes: [
        { id: 'roe-cb5', name: 'ROE CB5', w: 96, h: 96, physW: 500, physH: 500, pitch: 5.21 },
        { id: 'roe-bp2', name: 'ROE BP2', w: 240, h: 120, physW: 500, physH: 250, pitch: 2.08 },
        { id: 'absen-pl2.9', name: 'Absen PL2.9', w: 168, h: 168, physW: 500, physH: 500, pitch: 2.97 },
        { id: 'absen-pl3.9', name: 'Absen PL3.9', w: 128, h: 128, physW: 500, physH: 500, pitch: 3.91 },
        { id: 'unilumin-upanel', name: 'Unilumin UPanel II', w: 192, h: 192, physW: 500, physH: 500, pitch: 2.6 },
        { id: 'inf-vf2.6', name: 'INFiLED VF2.6', w: 192, h: 192, physW: 500, physH: 500, pitch: 2.6 },
        { id: 'desay-m2.6', name: 'Desay M2.6', w: 192, h: 192, physW: 500, physH: 500, pitch: 2.6 },
        { id: 'brompton-demo', name: 'Demo 16x16', w: 16, h: 16, physW: 250, physH: 250, pitch: 15.6 },
        { id: 'custom', name: 'Custom', w: 128, h: 128, physW: 500, physH: 500, pitch: 3.9 },
    ],

    // Color palettes
    _palettes: {
        'RGB': ['#ff0000', '#00ff00', '#0000ff'],
        'CMY': ['#00ffff', '#ff00ff', '#ffff00'],
        'RGBCMY': ['#ff0000', '#00ff00', '#0000ff', '#00ffff', '#ff00ff', '#ffff00'],
        'Greyscale': ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'],
        'Warm': ['#ff0000', '#ff4400', '#ff8800', '#ffbb00', '#ffff00', '#ffffff'],
        'Cool': ['#0000ff', '#0044ff', '#0088ff', '#00bbff', '#00ffff', '#ffffff'],
        'Pastel': ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8baff'],
    },
    _activePalette: 'RGBCMY',

    render() {
        return `
        <div class="pixl-page">
            <div class="pixl-toolbar">
                <div class="pixl-toolbar-left">
                    <span class="pixl-brand"><i class="fas fa-th"></i> PIXL Grid</span>
                    <div class="pixl-toolbar-sep"></div>
                    <span class="pixl-canvas-size">${this._canvasW} x ${this._canvasH}</span>
                </div>
                <div class="pixl-toolbar-right">
                    <div class="pixl-zoom-group">
                        <button class="pixl-tbtn" onclick="PixlGridPage.zoomOut()" title="Zoom Out"><i class="fas fa-search-minus"></i></button>
                        <span class="pixl-zoom-label" id="pixl-zoom-label">${Math.round(this._zoom * 100)}%</span>
                        <button class="pixl-tbtn" onclick="PixlGridPage.zoomIn()" title="Zoom In"><i class="fas fa-search-plus"></i></button>
                        <button class="pixl-tbtn" onclick="PixlGridPage.zoomFit()" title="Fit to View"><i class="fas fa-expand"></i></button>
                        <button class="pixl-tbtn" onclick="PixlGridPage.zoomReset()" title="100%"><i class="fas fa-compress-arrows-alt"></i></button>
                    </div>
                    <div class="pixl-toolbar-sep"></div>
                    <button class="pixl-tbtn ${this._liveCursor ? 'pixl-tbtn-active' : ''}" onclick="PixlGridPage.toggleLiveCursor()" title="Live Cursor">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                    <button class="pixl-tbtn" onclick="PixlGridPage.exportPNG()" title="Export PNG">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="pixl-tbtn" onclick="PixlGridPage.showCanvasSettings()" title="Canvas Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>

            <div class="pixl-main">
                <!-- Left panel: controls -->
                <div class="pixl-sidebar">
                    ${this._renderSidebarControls()}
                </div>

                <!-- Center: canvas -->
                <div class="pixl-canvas-wrap" id="pixl-canvas-wrap">
                    <canvas id="pixl-canvas" width="${this._canvasW}" height="${this._canvasH}"></canvas>
                </div>

                <!-- Right panel: grid list -->
                <div class="pixl-gridlist">
                    ${this._renderGridList()}
                </div>
            </div>
        </div>`;
    },

    _renderSidebarControls() {
        return `
            <!-- Panel Type -->
            <div class="pixl-panel">
                <div class="pixl-panel-head">Panel Type</div>
                <div class="pixl-panel-body">
                    <select class="form-control pixl-select" id="pixl-panel-type" onchange="PixlGridPage._onPanelTypeChange(this.value)">
                        ${this._panelTypes.map(p => `<option value="${p.id}">${p.name} (${p.w}x${p.h})</option>`).join('')}
                    </select>
                    <div class="pixl-row" style="margin-top:8px;">
                        <div class="pixl-field">
                            <label>Width (px)</label>
                            <input type="number" class="form-control pixl-input" id="pixl-pw" value="128" min="1" max="1024">
                        </div>
                        <div class="pixl-field">
                            <label>Height (px)</label>
                            <input type="number" class="form-control pixl-input" id="pixl-ph" value="128" min="1" max="1024">
                        </div>
                    </div>
                    <div class="pixl-row">
                        <div class="pixl-field">
                            <label>Cols</label>
                            <input type="number" class="form-control pixl-input" id="pixl-cols" value="4" min="1" max="100">
                        </div>
                        <div class="pixl-field">
                            <label>Rows</label>
                            <input type="number" class="form-control pixl-input" id="pixl-rows" value="2" min="1" max="100">
                        </div>
                    </div>
                    <div class="pixl-row">
                        <div class="pixl-field">
                            <label>Offset X</label>
                            <input type="number" class="form-control pixl-input" id="pixl-ox" value="0" min="0">
                        </div>
                        <div class="pixl-field">
                            <label>Offset Y</label>
                            <input type="number" class="form-control pixl-input" id="pixl-oy" value="0" min="0">
                        </div>
                    </div>
                    <button class="btn btn-xs btn-primary w-full" style="margin-top:8px;" onclick="PixlGridPage.addGrid()">
                        <i class="fas fa-plus"></i> Add Grid to Canvas
                    </button>
                </div>
            </div>

            <!-- Test Pattern -->
            <div class="pixl-panel">
                <div class="pixl-panel-head">Test Pattern</div>
                <div class="pixl-panel-body">
                    <div class="pixl-pattern-btns">
                        ${[
                            ['grid', 'Grid Lines', 'fa-th'],
                            ['checkerboard', 'Checker', 'fa-chess-board'],
                            ['gradient', 'Gradient', 'fa-adjust'],
                            ['colorbars', 'Color Bars', 'fa-columns'],
                            ['smpte', 'SMPTE Bars', 'fa-film'],
                            ['crosshatch', 'Crosshatch', 'fa-hashtag'],
                            ['solid', 'Solid Color', 'fa-square-full'],
                            ['moving', 'Moving', 'fa-arrows-alt'],
                            ['off', 'Off', 'fa-ban'],
                        ].map(([mode, label, icon]) => `
                            <button class="pixl-pat-btn ${this._patternMode === mode ? 'pixl-pat-active' : ''}"
                                onclick="PixlGridPage.setPattern('${mode}')">
                                <i class="fas ${icon}"></i> ${label}
                            </button>
                        `).join('')}
                    </div>
                    ${this._patternMode === 'solid' ? `
                    <div style="margin-top:8px;">
                        <label style="font-size:10px;color:var(--text-muted);">Solid Color</label>
                        <div class="pixl-color-row">
                            ${['#ff0000','#00ff00','#0000ff','#00ffff','#ff00ff','#ffff00','#ffffff','#000000'].map(c => `
                                <button class="pixl-color-swatch ${this._solidColor === c ? 'pixl-swatch-active' : ''}"
                                    style="background:${c};" onclick="PixlGridPage.setSolidColor('${c}')"></button>
                            `).join('')}
                        </div>
                    </div>` : ''}
                    ${this._patternMode === 'gradient' ? `
                    <div style="margin-top:8px;">
                        <label style="font-size:10px;color:var(--text-muted);">Direction</label>
                        <div class="pixl-row" style="gap:4px;">
                            ${['horizontal','vertical','diagonal'].map(d => `
                                <button class="pixl-pat-btn ${this._gradientDir === d ? 'pixl-pat-active' : ''}" style="flex:1;font-size:10px;padding:4px;"
                                    onclick="PixlGridPage.setGradientDir('${d}')">${d.charAt(0).toUpperCase() + d.slice(1)}</button>
                            `).join('')}
                        </div>
                    </div>` : ''}
                </div>
            </div>

            <!-- Color Palette -->
            <div class="pixl-panel">
                <div class="pixl-panel-head">Color Palette</div>
                <div class="pixl-panel-body">
                    <select class="form-control pixl-select" onchange="PixlGridPage.setPalette(this.value)">
                        ${Object.keys(this._palettes).map(p => `<option value="${p}" ${this._activePalette === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                    <div class="pixl-color-row" style="margin-top:8px;">
                        ${(this._palettes[this._activePalette] || []).map(c => `
                            <div class="pixl-color-swatch" style="background:${c};cursor:default;" title="${c}"></div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Display Options -->
            <div class="pixl-panel">
                <div class="pixl-panel-head">Display Options</div>
                <div class="pixl-panel-body">
                    <label class="pixl-check"><input type="checkbox" ${this._showRaster ? 'checked' : ''} onchange="PixlGridPage.toggleOpt('showRaster',this.checked)"> Show Raster</label>
                    <label class="pixl-check"><input type="checkbox" ${this._showNumbers ? 'checked' : ''} onchange="PixlGridPage.toggleOpt('showNumbers',this.checked)"> Tile Numbers</label>
                    <label class="pixl-check"><input type="checkbox" ${this._showCoords ? 'checked' : ''} onchange="PixlGridPage.toggleOpt('showCoords',this.checked)"> Coordinates</label>
                    <div class="pixl-row" style="margin-top:6px;">
                        <div class="pixl-field" style="flex:1;">
                            <label>Grid Color</label>
                            <input type="color" class="pixl-color-input" value="${this._patternColor}" onchange="PixlGridPage._patternColor=this.value;PixlGridPage._draw();">
                        </div>
                        <div class="pixl-field" style="flex:1;">
                            <label>BG Color</label>
                            <input type="color" class="pixl-color-input" value="${this._bgColor}" onchange="PixlGridPage._bgColor=this.value;PixlGridPage._draw();">
                        </div>
                    </div>
                    <div class="pixl-row" style="margin-top:6px;">
                        <div class="pixl-field" style="flex:1;">
                            <label>Raster Edge</label>
                            <input type="range" min="1" max="5" value="${this._rasterEdge}" class="pixl-slider"
                                oninput="PixlGridPage._rasterEdge=parseInt(this.value);PixlGridPage._draw();">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Keyboard Shortcuts -->
            <div class="pixl-panel">
                <div class="pixl-panel-head">Keyboard Shortcuts</div>
                <div class="pixl-panel-body" style="font-size:10px;color:var(--text-muted);line-height:1.8;">
                    <kbd>R</kbd> Red &nbsp; <kbd>G</kbd> Green &nbsp; <kbd>B</kbd> Blue<br>
                    <kbd>C</kbd> Cyan &nbsp; <kbd>M</kbd> Magenta &nbsp; <kbd>Y</kbd> Yellow<br>
                    <kbd>W</kbd> White &nbsp; <kbd>K</kbd> Black &nbsp; <kbd>Space</kbd> Toggle cursor
                </div>
            </div>
        `;
    },

    _renderGridList() {
        return `
            <div class="pixl-panel">
                <div class="pixl-panel-head">Grids (${this._grids.length})</div>
                <div class="pixl-panel-body">
                    ${this._grids.length === 0 ? '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:12px;">No grids added.<br>Choose a panel type and click "Add Grid".</div>' : ''}
                    ${this._grids.map((g, i) => `
                        <div class="pixl-grid-item ${this._selectedGrid === i ? 'pixl-grid-selected' : ''}" onclick="PixlGridPage.selectGrid(${i})">
                            <div class="pixl-grid-item-color" style="background:${g.color};"></div>
                            <div class="pixl-grid-item-info">
                                <div class="pixl-grid-item-name">${g.name}</div>
                                <div class="pixl-grid-item-desc">${g.cols}x${g.rows} tiles, ${g.panelW}x${g.panelH}px each</div>
                                <div class="pixl-grid-item-desc">${g.cols * g.panelW}x${g.rows * g.panelH}px total @ ${g.offsetX},${g.offsetY}</div>
                            </div>
                            <div class="pixl-grid-item-actions">
                                <button class="pixl-grid-btn" onclick="event.stopPropagation();PixlGridPage.toggleGridVisible(${i})" title="${g.visible ? 'Hide' : 'Show'}">
                                    <i class="fas fa-${g.visible ? 'eye' : 'eye-slash'}"></i>
                                </button>
                                <button class="pixl-grid-btn" onclick="event.stopPropagation();PixlGridPage.removeGrid(${i})" title="Remove">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Grid Stats -->
            ${this._grids.length > 0 ? `
            <div class="pixl-panel">
                <div class="pixl-panel-head">Statistics</div>
                <div class="pixl-panel-body" style="font-size:11px;">
                    <table class="pixl-stats-table">
                        <tr><td>Total Pixels</td><td class="mono">${this._getTotalPixels().toLocaleString()}</td></tr>
                        <tr><td>Total Tiles</td><td class="mono">${this._grids.reduce((s,g) => s + g.cols * g.rows, 0)}</td></tr>
                        <tr><td>Canvas</td><td class="mono">${this._canvasW}x${this._canvasH}</td></tr>
                        <tr><td>Coverage</td><td class="mono">${(this._getCoverage() * 100).toFixed(1)}%</td></tr>
                    </table>
                </div>
            </div>` : ''}
        `;
    },

    // ================================================================
    // GRID MANAGEMENT
    // ================================================================
    addGrid() {
        const typeId = document.getElementById('pixl-panel-type')?.value || 'custom';
        const panelW = parseInt(document.getElementById('pixl-pw')?.value) || 128;
        const panelH = parseInt(document.getElementById('pixl-ph')?.value) || 128;
        const cols = parseInt(document.getElementById('pixl-cols')?.value) || 4;
        const rows = parseInt(document.getElementById('pixl-rows')?.value) || 2;
        const offsetX = parseInt(document.getElementById('pixl-ox')?.value) || 0;
        const offsetY = parseInt(document.getElementById('pixl-oy')?.value) || 0;
        const type = this._panelTypes.find(t => t.id === typeId);
        const palette = this._palettes[this._activePalette] || this._palettes['RGBCMY'];
        const color = palette[this._grids.length % palette.length];

        this._grids.push({
            name: type?.name || 'Custom Grid',
            panelW, panelH, cols, rows,
            offsetX, offsetY,
            color, visible: true,
            halfHeight: false,
            id: Date.now(),
        });

        this._selectedGrid = this._grids.length - 1;
        UI.toast(`Grid added: ${cols}x${rows} @ ${panelW}x${panelH}px`, 'success');
        this._draw();
        this.refresh();
    },

    removeGrid(index) {
        this._grids.splice(index, 1);
        if (this._selectedGrid >= this._grids.length) this._selectedGrid = this._grids.length - 1;
        if (this._selectedGrid < 0) this._selectedGrid = null;
        this._draw();
        this.refresh();
    },

    selectGrid(index) {
        this._selectedGrid = index;
        this._draw();
        this.refresh();
    },

    toggleGridVisible(index) {
        this._grids[index].visible = !this._grids[index].visible;
        this._draw();
        this.refresh();
    },

    // ================================================================
    // TEST PATTERNS
    // ================================================================
    setPattern(mode) {
        this._patternMode = mode;
        if (mode === 'moving') {
            this._liveCursor = true;
            this._startAnimation();
        } else if (mode === 'off') {
            this._liveCursor = false;
            this._stopAnimation();
        }
        this._draw();
        this.refresh();
    },

    setSolidColor(c) {
        this._solidColor = c;
        this._draw();
        this.refresh();
    },

    setGradientDir(d) {
        this._gradientDir = d;
        this._draw();
        this.refresh();
    },

    setPalette(name) {
        this._activePalette = name;
        this._draw();
        this.refresh();
    },

    toggleOpt(key, val) {
        this['_' + key] = val;
        this._draw();
    },

    toggleLiveCursor() {
        this._liveCursor = !this._liveCursor;
        if (this._liveCursor) this._startAnimation();
        else this._stopAnimation();
        this._draw();
        this.refresh();
    },

    // ================================================================
    // ZOOM
    // ================================================================
    zoomIn() {
        this._zoom = Math.min(5, this._zoom * 1.25);
        this._applyZoom();
    },

    zoomOut() {
        this._zoom = Math.max(0.05, this._zoom / 1.25);
        this._applyZoom();
    },

    zoomFit() {
        const wrap = document.getElementById('pixl-canvas-wrap');
        if (!wrap) return;
        const scaleX = (wrap.clientWidth - 24) / this._canvasW;
        const scaleY = (wrap.clientHeight - 24) / this._canvasH;
        this._zoom = Math.min(scaleX, scaleY);
        this._applyZoom();
    },

    zoomReset() {
        this._zoom = 1.0;
        this._applyZoom();
    },

    _applyZoom() {
        if (!this._canvas) return;
        this._canvas.style.width = (this._canvasW * this._zoom) + 'px';
        this._canvas.style.height = (this._canvasH * this._zoom) + 'px';
        const label = document.getElementById('pixl-zoom-label');
        if (label) label.textContent = Math.round(this._zoom * 100) + '%';
    },

    // ================================================================
    // CANVAS DRAWING
    // ================================================================
    _draw() {
        if (!this._canvas || !this._ctx) return;
        const ctx = this._ctx;
        const W = this._canvasW;
        const H = this._canvasH;

        // Clear
        if (this._transparent) {
            ctx.clearRect(0, 0, W, H);
        } else {
            ctx.fillStyle = this._bgColor;
            ctx.fillRect(0, 0, W, H);
        }

        // Draw full-canvas test pattern first (behind grids)
        this._drawTestPattern(ctx, 0, 0, W, H);

        // Draw each grid
        for (let gi = 0; gi < this._grids.length; gi++) {
            const g = this._grids[gi];
            if (!g.visible) continue;

            const totalW = g.cols * g.panelW;
            const totalH = g.rows * g.panelH;
            const ox = g.offsetX;
            const oy = g.offsetY;
            const isSelected = gi === this._selectedGrid;
            const edge = this._rasterEdge;

            // Draw tile outlines
            for (let row = 0; row < g.rows; row++) {
                for (let col = 0; col < g.cols; col++) {
                    const tx = ox + col * g.panelW;
                    const ty = oy + row * g.panelH;
                    const tileNum = row * g.cols + col + 1;

                    // Tile border
                    ctx.strokeStyle = g.color;
                    ctx.lineWidth = edge;
                    ctx.strokeRect(tx + 0.5, ty + 0.5, g.panelW - 1, g.panelH - 1);

                    // Tile number
                    if (this._showNumbers) {
                        const fontSize = Math.max(8, Math.min(14, Math.floor(g.panelW / 6)));
                        ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
                        ctx.fillStyle = g.color;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(tileNum.toString(), tx + g.panelW / 2, ty + g.panelH / 2);
                    }

                    // Coordinates
                    if (this._showCoords) {
                        const cSize = Math.max(7, Math.min(10, Math.floor(g.panelW / 10)));
                        ctx.font = `${cSize}px 'JetBrains Mono', monospace`;
                        ctx.fillStyle = g.color + '99';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        ctx.fillText(`${tx},${ty}`, tx + 3, ty + 3);
                    }
                }
            }

            // Grid label (top-left above grid)
            const labelSize = Math.max(10, Math.min(16, Math.floor(totalW / 20)));
            ctx.font = `bold ${labelSize}px Inter, sans-serif`;
            ctx.fillStyle = g.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${g.name} — ${g.cols}x${g.rows} (${totalW}x${totalH})`, ox + 4, oy - 4);

            // Selection highlight
            if (isSelected) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(ox - 1, oy - 1, totalW + 2, totalH + 2);
                ctx.setLineDash([]);
            }

            // Raster overlay
            if (this._showRaster) {
                ctx.strokeStyle = g.color + '40';
                ctx.lineWidth = 0.5;
                // Vertical lines at panel boundaries
                for (let col = 0; col <= g.cols; col++) {
                    const lx = ox + col * g.panelW;
                    ctx.beginPath();
                    ctx.moveTo(lx, oy);
                    ctx.lineTo(lx, oy + totalH);
                    ctx.stroke();
                }
                // Horizontal lines at panel boundaries
                for (let row = 0; row <= g.rows; row++) {
                    const ly = oy + row * g.panelH;
                    ctx.beginPath();
                    ctx.moveTo(ox, ly);
                    ctx.lineTo(ox + totalW, ly);
                    ctx.stroke();
                }
            }
        }

        // Live cursor
        if (this._liveCursor) {
            this._drawCursor(ctx, W, H);
        }
    },

    _drawTestPattern(ctx, x, y, w, h) {
        const palette = this._palettes[this._activePalette] || ['#ff0000', '#00ff00', '#0000ff'];

        switch (this._patternMode) {
            case 'grid': {
                ctx.strokeStyle = this._patternColor + '30';
                ctx.lineWidth = 0.5;
                const step = 32;
                for (let gx = x; gx <= x + w; gx += step) {
                    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
                }
                for (let gy = y; gy <= y + h; gy += step) {
                    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
                }
                break;
            }
            case 'checkerboard': {
                const sz = 32;
                for (let cy = 0; cy < h; cy += sz) {
                    for (let cx = 0; cx < w; cx += sz) {
                        const isOdd = ((Math.floor(cx / sz) + Math.floor(cy / sz)) % 2) === 0;
                        ctx.fillStyle = isOdd ? this._patternColor + '20' : this._bgColor;
                        ctx.fillRect(x + cx, y + cy, sz, sz);
                    }
                }
                break;
            }
            case 'gradient': {
                let grad;
                if (this._gradientDir === 'horizontal') {
                    grad = ctx.createLinearGradient(x, y, x + w, y);
                } else if (this._gradientDir === 'vertical') {
                    grad = ctx.createLinearGradient(x, y, x, y + h);
                } else {
                    grad = ctx.createLinearGradient(x, y, x + w, y + h);
                }
                grad.addColorStop(0, '#000000');
                grad.addColorStop(1, '#ffffff');
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, w, h);
                break;
            }
            case 'colorbars': {
                const barW = w / palette.length;
                palette.forEach((c, i) => {
                    ctx.fillStyle = c;
                    ctx.fillRect(x + i * barW, y, barW + 1, h);
                });
                break;
            }
            case 'smpte': {
                // Top 2/3: 7 color bars
                const smpteColors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
                const barW = w / 7;
                const topH = h * 0.67;
                smpteColors.forEach((c, i) => {
                    ctx.fillStyle = c;
                    ctx.fillRect(x + i * barW, y, barW + 1, topH);
                });
                // Middle: reverse bars
                const midH = h * 0.08;
                const midColors = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
                midColors.forEach((c, i) => {
                    ctx.fillStyle = c;
                    ctx.fillRect(x + i * barW, y + topH, barW + 1, midH);
                });
                // Bottom: ramp + pluge
                const botY = y + topH + midH;
                const botH = h - topH - midH;
                const rampW = w / 4;
                ctx.fillStyle = '#00214c'; ctx.fillRect(x, botY, rampW, botH);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(x + rampW, botY, rampW, botH);
                ctx.fillStyle = '#32006a'; ctx.fillRect(x + rampW * 2, botY, rampW, botH);
                ctx.fillStyle = '#131313'; ctx.fillRect(x + rampW * 3, botY, rampW, botH);
                // PLUGE bars inside black
                const plugeX = x + rampW * 3;
                const plugeW = rampW / 3;
                ctx.fillStyle = '#090909'; ctx.fillRect(plugeX, botY, plugeW, botH);
                ctx.fillStyle = '#131313'; ctx.fillRect(plugeX + plugeW, botY, plugeW, botH);
                ctx.fillStyle = '#1d1d1d'; ctx.fillRect(plugeX + plugeW * 2, botY, plugeW, botH);
                break;
            }
            case 'crosshatch': {
                ctx.strokeStyle = this._patternColor + '40';
                ctx.lineWidth = 1;
                const spacing = 64;
                // Diagonal lines
                for (let d = -h; d < w + h; d += spacing) {
                    ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h, y + h); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); ctx.stroke();
                }
                // Center cross
                ctx.strokeStyle = this._patternColor + '80';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
                // Center circle
                ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 4, 0, Math.PI * 2); ctx.stroke();
                break;
            }
            case 'solid': {
                ctx.fillStyle = this._solidColor;
                ctx.fillRect(x, y, w, h);
                break;
            }
            case 'moving': {
                // Animated — handled by cursor + strips
                const t = Date.now() / 1000;
                // Moving horizontal strip
                const stripH = 4;
                const stripY = y + ((t * 100) % h);
                ctx.fillStyle = this._patternColor + '60';
                ctx.fillRect(x, stripY, w, stripH);
                // Moving vertical strip
                const stripW = 4;
                const stripX = x + ((t * 150) % w);
                ctx.fillStyle = this._patternColor + '60';
                ctx.fillRect(stripX, y, stripW, h);
                break;
            }
            case 'off':
            default:
                break;
        }
    },

    _drawCursor(ctx, W, H) {
        const cx = this._cursorPos.x;
        const cy = this._cursorPos.y;

        // Crosshair
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        ctx.setLineDash([]);

        // Cursor dot
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Coord label
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Math.round(cx)}, ${Math.round(cy)}`, cx + 8, cy - 8);
    },

    // ================================================================
    // ANIMATION
    // ================================================================
    _startAnimation() {
        if (this._animFrame) return;
        const tick = () => {
            this._cursorPos.x += this._cursorDir.x * this._cursorSpeed;
            this._cursorPos.y += this._cursorDir.y * this._cursorSpeed;
            if (this._cursorPos.x <= 0 || this._cursorPos.x >= this._canvasW) this._cursorDir.x *= -1;
            if (this._cursorPos.y <= 0 || this._cursorPos.y >= this._canvasH) this._cursorDir.y *= -1;
            this._draw();
            this._animFrame = requestAnimationFrame(tick);
        };
        this._cursorPos = { x: this._canvasW / 2, y: this._canvasH / 2 };
        this._animFrame = requestAnimationFrame(tick);
    },

    _stopAnimation() {
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
    },

    // ================================================================
    // KEYBOARD
    // ================================================================
    _handleKey(e) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
        const map = { r: '#ff0000', g: '#00ff00', b: '#0000ff', c: '#00ffff', m: '#ff00ff', y: '#ffff00', w: '#ffffff', k: '#000000' };
        const key = e.key.toLowerCase();
        if (map[key]) {
            e.preventDefault();
            this._solidColor = map[key];
            this._patternMode = 'solid';
            this._draw();
            this.refresh();
        } else if (key === ' ') {
            e.preventDefault();
            this.toggleLiveCursor();
        }
    },

    // ================================================================
    // EXPORT
    // ================================================================
    exportPNG() {
        if (!this._canvas) return;
        const link = document.createElement('a');
        link.download = `pixlgrid_${this._canvasW}x${this._canvasH}_${Date.now()}.png`;
        link.href = this._canvas.toDataURL('image/png');
        link.click();
        UI.toast('PNG exported', 'success');
        appState.log('EVENT', `PIXL Grid exported ${this._canvasW}x${this._canvasH} PNG`, 'PIXL');
    },

    // ================================================================
    // CANVAS SETTINGS
    // ================================================================
    showCanvasSettings() {
        UI.openModal('Canvas Settings', `
            <div class="pixl-row">
                <div class="pixl-field" style="flex:1;">
                    ${UI.formGroup('WIDTH (px)', `<input class="form-control" type="number" id="pixl-cw" value="${this._canvasW}" min="64" max="15360">`)}
                </div>
                <div class="pixl-field" style="flex:1;">
                    ${UI.formGroup('HEIGHT (px)', `<input class="form-control" type="number" id="pixl-ch" value="${this._canvasH}" min="64" max="8640">`)}
                </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                ${[
                    ['1920x1080', 'HD'],
                    ['3840x2160', '4K UHD'],
                    ['2560x1440', 'QHD'],
                    ['1280x720', '720p'],
                    ['4096x2160', '4K DCI'],
                    ['7680x4320', '8K'],
                ].map(([res, label]) => `
                    <button class="btn btn-xs" onclick="document.getElementById('pixl-cw').value=${res.split('x')[0]};document.getElementById('pixl-ch').value=${res.split('x')[1]};" style="font-size:10px;">
                        ${label} (${res})
                    </button>
                `).join('')}
            </div>
            ${UI.formGroup('BACKGROUND', `<input type="color" class="form-control" id="pixl-cbg" value="${this._bgColor}" style="height:32px;padding:2px 4px;">`)}
            <label class="pixl-check"><input type="checkbox" id="pixl-ctrans" ${this._transparent ? 'checked' : ''}> Transparent Background</label>
        `, `<button class="btn" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PixlGridPage._applyCanvasSettings()">Apply</button>`);
    },

    _applyCanvasSettings() {
        this._canvasW = parseInt(document.getElementById('pixl-cw')?.value) || 1920;
        this._canvasH = parseInt(document.getElementById('pixl-ch')?.value) || 1080;
        this._bgColor = document.getElementById('pixl-cbg')?.value || '#000000';
        this._transparent = document.getElementById('pixl-ctrans')?.checked || false;
        UI.closeModal();
        this.refresh();
        this._initCanvas();
    },

    // ================================================================
    // PANEL TYPE CHANGE
    // ================================================================
    _onPanelTypeChange(typeId) {
        const type = this._panelTypes.find(t => t.id === typeId);
        if (!type) return;
        const pw = document.getElementById('pixl-pw');
        const ph = document.getElementById('pixl-ph');
        if (pw) pw.value = type.w;
        if (ph) ph.value = type.h;
    },

    // ================================================================
    // HELPERS
    // ================================================================
    _getTotalPixels() {
        return this._grids.reduce((s, g) => s + (g.cols * g.panelW * g.rows * g.panelH), 0);
    },

    _getCoverage() {
        const total = this._canvasW * this._canvasH;
        if (!total) return 0;
        const used = this._grids.reduce((s, g) => s + (g.cols * g.panelW * g.rows * g.panelH), 0);
        return Math.min(1, used / total);
    },

    // ================================================================
    // LIFECYCLE
    // ================================================================
    _initCanvas() {
        this._canvas = document.getElementById('pixl-canvas');
        if (!this._canvas) return;
        this._canvas.width = this._canvasW;
        this._canvas.height = this._canvasH;
        this._ctx = this._canvas.getContext('2d');

        // Auto-fit on first load if zoom is 1.0 and canvas is larger than wrap
        const wrap = document.getElementById('pixl-canvas-wrap');
        if (wrap && this._zoom === 1.0) {
            const scaleX = (wrap.clientWidth - 24) / this._canvasW;
            const scaleY = (wrap.clientHeight - 24) / this._canvasH;
            const fitScale = Math.min(scaleX, scaleY);
            if (fitScale < 1) this._zoom = fitScale;
        }
        this._applyZoom();
        this._draw();
    },

    _keyHandler: null,

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'pixlgrid') {
            container.innerHTML = this.render();
            setTimeout(() => this._initCanvas(), 0);
        }
    },

    onActivate() {
        this._keyHandler = (e) => this._handleKey(e);
        document.addEventListener('keydown', this._keyHandler);
        setTimeout(() => this._initCanvas(), 50);
    },

    onDeactivate() {
        this._stopAnimation();
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },
};

// ================================================================
// CSS
// ================================================================
(function() {
    if (document.getElementById('pixl-page-css')) return;
    const style = document.createElement('style');
    style.id = 'pixl-page-css';
    style.textContent = `
    .pixl-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .pixl-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 12px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }
    .pixl-toolbar-left, .pixl-toolbar-right { display: flex; align-items: center; gap: 10px; }
    .pixl-brand { font-size: 14px; font-weight: 800; color: #f59e0b; letter-spacing: 0.5px; }
    .pixl-toolbar-sep { width: 1px; height: 20px; background: var(--border); }
    .pixl-canvas-size { font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); }

    .pixl-tbtn {
        width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: all 0.12s;
    }
    .pixl-tbtn:hover { border-color: #f59e0b; color: #f59e0b; }
    .pixl-tbtn-active { border-color: #4ade80 !important; color: #4ade80 !important; background: rgba(74,222,128,0.1) !important; }

    .pixl-zoom-group { display: flex; align-items: center; gap: 4px; }
    .pixl-zoom-label { font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); min-width: 38px; text-align: center; }

    .pixl-main { display: flex; flex: 1; overflow: hidden; gap: 0; }

    .pixl-sidebar {
        width: 240px; flex-shrink: 0; overflow-y: auto; border-right: 1px solid var(--border);
        background: rgba(0,0,0,0.1); padding: 8px;
    }
    .pixl-gridlist {
        width: 220px; flex-shrink: 0; overflow-y: auto; border-left: 1px solid var(--border);
        background: rgba(0,0,0,0.1); padding: 8px;
    }

    .pixl-canvas-wrap {
        flex: 1; display: flex; align-items: center; justify-content: center;
        background: #0a0a0a; overflow: auto; padding: 12px;
        background-image: linear-gradient(45deg, #111 25%, transparent 25%),
                          linear-gradient(-45deg, #111 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, #111 75%),
                          linear-gradient(-45deg, transparent 75%, #111 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .pixl-canvas-wrap canvas {
        border: 1px solid var(--border);
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
        image-rendering: pixelated;
    }

    .pixl-panel { margin-bottom: 8px; }
    .pixl-panel-head {
        font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
        color: var(--text-muted); padding: 6px 8px; background: rgba(0,0,0,0.2);
        border-radius: 6px 6px 0 0; border: 1px solid var(--border); border-bottom: none;
    }
    .pixl-panel-body {
        padding: 8px; border: 1px solid var(--border); border-radius: 0 0 6px 6px;
        background: var(--card-bg);
    }

    .pixl-select { font-size: 11px !important; padding: 5px 8px !important; }
    .pixl-input { font-size: 11px !important; padding: 5px 8px !important; }
    .pixl-row { display: flex; gap: 6px; }
    .pixl-field { flex: 1; }
    .pixl-field label { display: block; font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .pixl-color-input { width: 100%; height: 28px; padding: 1px 2px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-secondary); cursor: pointer; }
    .pixl-slider { width: 100%; accent-color: #f59e0b; }

    .pixl-pattern-btns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
    .pixl-pat-btn {
        padding: 6px 4px; border-radius: 5px; border: 1px solid var(--border);
        background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
        font-size: 9px; font-weight: 600; text-align: center; transition: all 0.1s;
        display: flex; flex-direction: column; align-items: center; gap: 3px;
    }
    .pixl-pat-btn i { font-size: 12px; }
    .pixl-pat-btn:hover { border-color: #f59e0b; color: #f59e0b; }
    .pixl-pat-active { border-color: #f59e0b !important; color: #f59e0b !important; background: rgba(245,158,11,0.12) !important; }

    .pixl-color-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .pixl-color-swatch {
        width: 24px; height: 24px; border-radius: 4px; border: 2px solid transparent;
        cursor: pointer; transition: all 0.1s;
    }
    .pixl-color-swatch:hover { transform: scale(1.15); }
    .pixl-swatch-active { border-color: #ffffff !important; box-shadow: 0 0 6px rgba(255,255,255,0.4); }

    .pixl-check {
        display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary);
        cursor: pointer; padding: 3px 0;
    }
    .pixl-check input { accent-color: #f59e0b; }

    .pixl-grid-item {
        display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px;
        border: 1px solid var(--border); background: var(--bg-secondary); cursor: pointer;
        margin-bottom: 4px; transition: all 0.1s;
    }
    .pixl-grid-item:hover { border-color: var(--text-muted); }
    .pixl-grid-selected { border-color: #f59e0b !important; background: rgba(245,158,11,0.06) !important; }
    .pixl-grid-item-color { width: 10px; height: 36px; border-radius: 3px; flex-shrink: 0; }
    .pixl-grid-item-info { flex: 1; min-width: 0; }
    .pixl-grid-item-name { font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pixl-grid-item-desc { font-size: 9px; color: var(--text-muted); }
    .pixl-grid-item-actions { display: flex; gap: 2px; }
    .pixl-grid-btn {
        width: 24px; height: 24px; border-radius: 4px; border: 1px solid transparent;
        background: transparent; color: var(--text-muted); cursor: pointer; font-size: 10px;
        display: flex; align-items: center; justify-content: center;
    }
    .pixl-grid-btn:hover { color: #f87171; border-color: rgba(248,113,113,0.3); }

    .pixl-stats-table { width: 100%; }
    .pixl-stats-table td { padding: 3px 0; font-size: 11px; }
    .pixl-stats-table td:first-child { color: var(--text-muted); }
    .pixl-stats-table td:last-child { text-align: right; font-weight: 600; }

    @media (max-width: 1100px) {
        .pixl-sidebar { width: 200px; }
        .pixl-gridlist { width: 180px; }
    }
    `;
    document.head.appendChild(style);
})();
