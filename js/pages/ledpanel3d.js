/**
 * Luxor Production v1.3 — 3D LED Panel Layout
 * Visualize LED panel arrays in 3D space with pixel mapping
 */
const LedPanel3dPage = {
    _scene: null,
    _camera: null,
    _renderer: null,
    _animId: null,
    _panels: [],
    _selectedPanel: null,
    _gridHelper: null,
    _raycaster: null,
    _mouse: null,
    _showPixelGrid: true,
    _showLabels: true,

    // Common LED panel specs
    _panelTypes: {
        'ROE BP2V2':     { w: 0.5, h: 0.5, px: 256, py: 256, pitch: '2.84mm', weight: '7.5kg' },
        'ROE CB5':       { w: 0.5, h: 0.5, px: 176, py: 176, pitch: '2.84mm', weight: '8.2kg' },
        'Absen PL2.5':   { w: 0.5, h: 0.5, px: 192, py: 192, pitch: '2.6mm', weight: '7.8kg' },
        'Absen A3 Pro':  { w: 0.5, h: 0.5, px: 168, py: 168, pitch: '2.97mm', weight: '8.0kg' },
        'Unilumin UPP1.5': { w: 0.6, h: 0.338, px: 384, py: 216, pitch: '1.56mm', weight: '6.5kg' },
        'INFiLED DB2.6': { w: 0.5, h: 0.5, px: 192, py: 192, pitch: '2.6mm', weight: '7.6kg' },
        'Brompton Hydra':{ w: 0.5, h: 0.5, px: 208, py: 208, pitch: '2.4mm', weight: '7.2kg' },
        'Custom':        { w: 0.5, h: 0.5, px: 192, py: 192, pitch: 'Custom', weight: '-' },
    },

    _layouts: {
        'flat':    { name: 'Flat Wall', desc: 'Standard flat LED wall' },
        'curved':  { name: 'Curved Wall', desc: 'Concave curved surface' },
        'corner':  { name: 'Corner (L)', desc: 'Two walls at 90°' },
        'u-shape': { name: 'U-Shape', desc: 'Three-wall surround' },
        'floor':   { name: 'Floor', desc: 'Floor-mounted panels' },
        'ceiling': { name: 'Ceiling', desc: 'Overhead mounted panels' },
        'custom':  { name: 'Custom', desc: 'Place panels individually' },
    },

    render() {
        return `
            <div style="display:flex;gap:0;height:calc(100vh - 60px);overflow:hidden;">
                <!-- 3D Viewport -->
                <div style="flex:1;position:relative;background:#0a0a0c;">
                    <div id="led3d-canvas" style="width:100%;height:100%;"></div>
                    <div style="position:absolute;top:12px;left:12px;display:flex;gap:6px;z-index:10;">
                        <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.resetCamera()" title="Reset Camera"><i class="fas fa-home"></i></button>
                        <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.topView()" title="Top View"><i class="fas fa-arrow-down"></i> Top</button>
                        <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.frontView()" title="Front View"><i class="fas fa-arrow-right"></i> Front</button>
                        <div style="width:1px;height:24px;background:var(--border);margin:0 2px;"></div>
                        <button class="btn btn-xs ${this._showPixelGrid ? 'btn-primary' : 'btn-secondary'}" onclick="LedPanel3dPage.togglePixelGrid()" title="Pixel Grid"><i class="fas fa-border-all"></i></button>
                        <button class="btn btn-xs ${this._showLabels ? 'btn-primary' : 'btn-secondary'}" onclick="LedPanel3dPage.toggleLabels()" title="Labels"><i class="fas fa-tag"></i></button>
                    </div>
                    <!-- Stats overlay -->
                    <div id="led3d-stats" style="position:absolute;bottom:12px;left:12px;display:flex;gap:16px;font-size:10px;color:var(--text-muted);z-index:10;background:rgba(10,10,12,0.8);padding:6px 12px;border-radius:6px;">
                        <span>Panels: <strong id="led3d-count" style="color:var(--accent);">0</strong></span>
                        <span>Total Pixels: <strong id="led3d-pixels" style="color:#0ea5e9;">0</strong></span>
                        <span>Size: <strong id="led3d-size" style="color:#a855f7;">0m x 0m</strong></span>
                        <span>Weight: <strong id="led3d-weight" style="color:#f59e0b;">0 kg</strong></span>
                    </div>
                </div>
                <!-- Right Panel -->
                <div style="width:300px;background:var(--bg-primary);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;">
                    <!-- Panel Type -->
                    <div style="padding:12px;border-bottom:1px solid var(--border);">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Panel Type</div>
                        <select class="form-control" id="led3d-panel-type" onchange="LedPanel3dPage._updatePanelInfo()">
                            ${Object.entries(this._panelTypes).map(([k, v]) => `<option value="${k}">${k} (${v.pitch})</option>`).join('')}
                        </select>
                        <div id="led3d-panel-info" style="margin-top:8px;font-size:10px;"></div>
                    </div>
                    <!-- Layout Generator -->
                    <div style="padding:12px;border-bottom:1px solid var(--border);">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Layout Generator</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
                            ${Object.entries(this._layouts).map(([k, v]) => `
                                <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.generateLayout('${k}')" title="${v.desc}" style="text-align:left;padding:6px 8px;">
                                    <div style="font-weight:600;font-size:10px;">${v.name}</div>
                                    <div style="font-size:8px;color:var(--text-muted);margin-top:1px;">${v.desc}</div>
                                </button>
                            `).join('')}
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;">
                            <label class="text-muted">Columns</label>
                            <input type="number" id="led3d-cols" class="form-control" style="font-size:10px;padding:2px 6px;" value="8" min="1" max="50">
                            <label class="text-muted">Rows</label>
                            <input type="number" id="led3d-rows" class="form-control" style="font-size:10px;padding:2px 6px;" value="4" min="1" max="30">
                            <label class="text-muted">Gap (mm)</label>
                            <input type="number" id="led3d-gap" class="form-control" style="font-size:10px;padding:2px 6px;" value="0" min="0" max="10" step="0.5">
                            <label class="text-muted">Curve Radius</label>
                            <input type="number" id="led3d-radius" class="form-control" style="font-size:10px;padding:2px 6px;" value="8" min="2" max="30" step="0.5">
                        </div>
                    </div>
                    <!-- Actions -->
                    <div style="padding:12px;border-bottom:1px solid var(--border);">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Actions</div>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">
                            <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.clearAll()"><i class="fas fa-trash"></i> Clear All</button>
                            <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.addSinglePanel()"><i class="fas fa-plus"></i> Add Panel</button>
                            <button class="btn btn-xs btn-secondary" onclick="LedPanel3dPage.exportLayout()"><i class="fas fa-download"></i> Export</button>
                        </div>
                    </div>
                    <!-- Selected Panel Properties -->
                    <div style="padding:12px;flex:1;">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Panel Properties</div>
                        <div id="led3d-props">
                            <div class="text-muted" style="font-size:11px;">Click a panel to select</div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    onActivate() {
        setTimeout(() => {
            this._initScene();
            this._updatePanelInfo();
        }, 50);
    },

    onDeactivate() {
        this._stopAnimation();
        if (this._renderer) { this._renderer.dispose(); this._renderer = null; }
        this._scene = null; this._camera = null;
    },

    _initScene() {
        const container = document.getElementById('led3d-canvas');
        if (!container || !window.THREE) return;

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x0a0a0c);
        this._scene.fog = new THREE.Fog(0x0a0a0c, 40, 100);

        this._camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
        this._camera.position.set(0, 3, 10);
        this._camera.lookAt(0, 2, 0);

        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setSize(container.clientWidth, container.clientHeight);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = true;
        container.innerHTML = '';
        container.appendChild(this._renderer.domElement);

        // Controls - reuse same pattern from stage3d
        this._setupControls(container);

        // Lights
        this._scene.add(new THREE.AmbientLight(0x404060, 0.5));
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(5, 10, 8);
        dir.castShadow = true;
        this._scene.add(dir);
        this._scene.add(new THREE.HemisphereLight(0x87ceeb, 0x362a28, 0.3));

        // Grid
        this._gridHelper = new THREE.GridHelper(30, 30, 0x222233, 0x111122);
        this._scene.add(this._gridHelper);

        // Ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this._scene.add(ground);

        // Raycaster
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();
        this._renderer.domElement.addEventListener('click', (e) => this._onClick(e));

        // Resize
        this._resizeObserver = new ResizeObserver(() => {
            if (!this._camera || !this._renderer) return;
            this._camera.aspect = container.clientWidth / container.clientHeight;
            this._camera.updateProjectionMatrix();
            this._renderer.setSize(container.clientWidth, container.clientHeight);
        });
        this._resizeObserver.observe(container);

        this._startAnimation();

        // Generate default layout
        this.generateLayout('flat');
    },

    _setupControls(container) {
        let isOrbiting = false, isPanning = false, prevX = 0, prevY = 0;
        let spherical = { theta: 0, phi: Math.PI / 3, radius: 12 };
        let target = new THREE.Vector3(0, 2, 0);

        const updateCamera = () => {
            const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            const y = spherical.radius * Math.cos(spherical.phi);
            const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            this._camera.position.set(target.x + x, target.y + y, target.z + z);
            this._camera.lookAt(target);
        };
        this._orbitState = { spherical, target, updateCamera };
        updateCamera();

        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) isOrbiting = true;
            else if (e.button === 2) isPanning = true;
            prevX = e.clientX; prevY = e.clientY;
        });
        container.addEventListener('mousemove', (e) => {
            const dx = e.clientX - prevX, dy = e.clientY - prevY;
            prevX = e.clientX; prevY = e.clientY;
            if (isOrbiting) {
                spherical.theta -= dx * 0.005;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.005));
                updateCamera();
            }
            if (isPanning) {
                const ps = 0.01 * spherical.radius;
                const right = new THREE.Vector3();
                right.crossVectors(this._camera.getWorldDirection(new THREE.Vector3()), new THREE.Vector3(0, 1, 0)).normalize();
                target.add(right.multiplyScalar(-dx * ps));
                target.y += dy * ps;
                updateCamera();
            }
        });
        const onUp = () => { isOrbiting = false; isPanning = false; };
        container.addEventListener('mouseup', onUp);
        container.addEventListener('mouseleave', onUp);
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            spherical.radius = Math.max(2, Math.min(50, spherical.radius + e.deltaY * 0.02));
            updateCamera();
        }, { passive: false });
        container.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    _startAnimation() {
        const animate = () => {
            this._animId = requestAnimationFrame(animate);
            if (this._selectedPanel?.mesh) {
                const t = Date.now() * 0.004;
                this._selectedPanel.mesh.children.forEach(c => {
                    if (c.isLineSegments) c.material.opacity = 0.5 + Math.sin(t) * 0.3;
                });
            }
            if (this._renderer && this._scene && this._camera) {
                this._renderer.render(this._scene, this._camera);
            }
        };
        animate();
    },

    _stopAnimation() {
        if (this._animId) cancelAnimationFrame(this._animId);
        if (this._resizeObserver) this._resizeObserver.disconnect();
    },

    _onClick(e) {
        if (!this._renderer || !this._raycaster) return;
        const rect = this._renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this._raycaster.setFromCamera(this._mouse, this._camera);
        const meshes = this._panels.map(p => p.mesh).filter(Boolean);
        const intersects = this._raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            const panel = this._panels.find(p => p.mesh === intersects[0].object);
            this._selectPanel(panel);
        } else {
            this._selectPanel(null);
        }
    },

    _selectPanel(panel) {
        if (this._selectedPanel?.mesh) {
            this._selectedPanel.mesh.material.emissiveIntensity = 0.3;
        }
        this._selectedPanel = panel;
        if (panel?.mesh) {
            panel.mesh.material.emissiveIntensity = 0.7;
        }
        this._updateProps();
    },

    _updateProps() {
        const el = document.getElementById('led3d-props');
        if (!el) return;
        const p = this._selectedPanel;
        if (!p) { el.innerHTML = '<div class="text-muted" style="font-size:11px;">Click a panel to select</div>'; return; }
        el.innerHTML = `
            <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px;">Panel ${p.col},${p.row}</div>
            <table style="font-size:10px;width:100%;">
                <tr><td class="text-muted">Type</td><td>${UI.esc(p.panelType)}</td></tr>
                <tr><td class="text-muted">Size</td><td class="mono">${p.w.toFixed(2)}m x ${p.h.toFixed(2)}m</td></tr>
                <tr><td class="text-muted">Pixels</td><td class="mono">${p.px} x ${p.py} (${(p.px * p.py).toLocaleString()})</td></tr>
                <tr><td class="text-muted">Position</td><td class="mono">${p.mesh.position.x.toFixed(2)}, ${p.mesh.position.y.toFixed(2)}, ${p.mesh.position.z.toFixed(2)}</td></tr>
                <tr><td class="text-muted">Rotation</td><td class="mono">${Math.round(p.mesh.rotation.y * 180 / Math.PI)}°</td></tr>
                <tr><td class="text-muted">Pitch</td><td>${p.pitch}</td></tr>
                <tr><td class="text-muted">Weight</td><td>${p.weight}</td></tr>
                <tr><td class="text-muted">Port</td><td class="mono">${p.port || '--'}</td></tr>
            </table>`;
    },

    _updatePanelInfo() {
        const el = document.getElementById('led3d-panel-info');
        const sel = document.getElementById('led3d-panel-type');
        if (!el || !sel) return;
        const spec = this._panelTypes[sel.value];
        if (!spec) return;
        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;color:var(--text-secondary);">
                <span>Size: <strong class="mono">${spec.w}m x ${spec.h}m</strong></span>
                <span>Pitch: <strong>${spec.pitch}</strong></span>
                <span>Pixels: <strong class="mono">${spec.px} x ${spec.py}</strong></span>
                <span>Weight: <strong>${spec.weight}</strong></span>
            </div>`;
    },

    // ================================================================
    // LAYOUT GENERATION
    // ================================================================
    generateLayout(layout) {
        this.clearAll();
        const typeSelect = document.getElementById('led3d-panel-type');
        const typeName = typeSelect?.value || 'ROE BP2V2';
        const spec = this._panelTypes[typeName];
        const cols = parseInt(document.getElementById('led3d-cols')?.value) || 8;
        const rows = parseInt(document.getElementById('led3d-rows')?.value) || 4;
        const gap = (parseFloat(document.getElementById('led3d-gap')?.value) || 0) / 1000;
        const radius = parseFloat(document.getElementById('led3d-radius')?.value) || 8;

        const pw = spec.w + gap;
        const ph = spec.h + gap;
        const totalW = cols * pw;

        switch (layout) {
            case 'flat':
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        this._addPanel(typeName, spec, c, r,
                            (c - (cols - 1) / 2) * pw, (rows - 1 - r) * ph + spec.h / 2, 0, 0);
                    }
                }
                break;
            case 'curved': {
                const anglePerPanel = (pw / radius);
                const totalAngle = cols * anglePerPanel;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const angle = (c - (cols - 1) / 2) * anglePerPanel;
                        const x = Math.sin(angle) * radius;
                        const z = -(Math.cos(angle) * radius - radius);
                        this._addPanel(typeName, spec, c, r, x, (rows - 1 - r) * ph + spec.h / 2, z, -angle);
                    }
                }
                break;
            }
            case 'corner': {
                const half = Math.ceil(cols / 2);
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < half; c++) {
                        this._addPanel(typeName, spec, c, r,
                            -(half - c) * pw * Math.cos(Math.PI / 4), (rows - 1 - r) * ph + spec.h / 2,
                            -(half - c) * pw * Math.sin(Math.PI / 4), Math.PI / 4);
                    }
                    for (let c = 0; c < half; c++) {
                        this._addPanel(typeName, spec, half + c, r,
                            c * pw * Math.cos(Math.PI / 4), (rows - 1 - r) * ph + spec.h / 2,
                            -c * pw * Math.sin(Math.PI / 4), -Math.PI / 4);
                    }
                }
                break;
            }
            case 'u-shape': {
                const side = Math.floor(cols / 4);
                const back = cols - side * 2;
                for (let r = 0; r < rows; r++) {
                    // Left wall
                    for (let c = 0; c < side; c++) {
                        this._addPanel(typeName, spec, c, r,
                            -(back * pw) / 2, (rows - 1 - r) * ph + spec.h / 2, -(side - 1 - c) * pw, Math.PI / 2);
                    }
                    // Back wall
                    for (let c = 0; c < back; c++) {
                        this._addPanel(typeName, spec, side + c, r,
                            (c - (back - 1) / 2) * pw, (rows - 1 - r) * ph + spec.h / 2, -side * pw, 0);
                    }
                    // Right wall
                    for (let c = 0; c < side; c++) {
                        this._addPanel(typeName, spec, side + back + c, r,
                            (back * pw) / 2, (rows - 1 - r) * ph + spec.h / 2, -(side - 1 - c) * pw, -Math.PI / 2);
                    }
                }
                break;
            }
            case 'floor':
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const mesh = this._addPanel(typeName, spec, c, r,
                            (c - (cols - 1) / 2) * pw, 0.02, -(r - (rows - 1) / 2) * ph, 0);
                        if (mesh?.mesh) mesh.mesh.rotation.x = -Math.PI / 2;
                    }
                }
                break;
            case 'ceiling':
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const mesh = this._addPanel(typeName, spec, c, r,
                            (c - (cols - 1) / 2) * pw, 5, -(r - (rows - 1) / 2) * ph, 0);
                        if (mesh?.mesh) mesh.mesh.rotation.x = Math.PI / 2;
                    }
                }
                break;
            default: // custom — empty
                break;
        }

        this._updateStats();
        UI.toast(`Generated: ${this._layouts[layout]?.name || layout} — ${this._panels.length} panels`, 'success');
    },

    _addPanel(typeName, spec, col, row, x, y, z, rotY) {
        if (!this._scene) return null;
        const geo = new THREE.BoxGeometry(spec.w, spec.h, 0.04);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x111122,
            emissive: 0x0ea5e9,
            emissiveIntensity: 0.3,
            roughness: 0.2,
            metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotY;
        mesh.castShadow = true;

        // Panel edge lines
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.5 }));
        mesh.add(line);

        // Pixel grid overlay
        if (this._showPixelGrid) {
            const gridGeo = new THREE.PlaneGeometry(spec.w * 0.95, spec.h * 0.95);
            const gridMat = new THREE.MeshBasicMaterial({
                color: 0x0ea5e9,
                transparent: true,
                opacity: 0.05,
                side: THREE.FrontSide,
            });
            const gridMesh = new THREE.Mesh(gridGeo, gridMat);
            gridMesh.position.z = 0.021;
            mesh.add(gridMesh);
        }

        this._scene.add(mesh);

        const portIndex = Math.floor((col + row * 100) / 4) + 1;
        const panel = {
            mesh, col, row, panelType: typeName,
            w: spec.w, h: spec.h,
            px: spec.px, py: spec.py,
            pitch: spec.pitch, weight: spec.weight,
            port: `Port ${portIndex}`,
        };
        this._panels.push(panel);
        return panel;
    },

    addSinglePanel() {
        const typeSelect = document.getElementById('led3d-panel-type');
        const typeName = typeSelect?.value || 'ROE BP2V2';
        const spec = this._panelTypes[typeName];
        const col = this._panels.length % 20;
        const row = Math.floor(this._panels.length / 20);
        this._addPanel(typeName, spec, col, row, 0, 2, 0, 0);
        this._updateStats();
    },

    clearAll() {
        this._panels.forEach(p => {
            this._scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        });
        this._panels = [];
        this._selectedPanel = null;
        this._updateStats();
        this._updateProps();
    },

    _updateStats() {
        const count = this._panels.length;
        const totalPixels = this._panels.reduce((s, p) => s + p.px * p.py, 0);
        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this._panels.forEach(p => {
            minX = Math.min(minX, p.mesh.position.x - p.w / 2);
            maxX = Math.max(maxX, p.mesh.position.x + p.w / 2);
            minY = Math.min(minY, p.mesh.position.y - p.h / 2);
            maxY = Math.max(maxY, p.mesh.position.y + p.h / 2);
        });
        const sizeW = count > 0 ? (maxX - minX).toFixed(1) : 0;
        const sizeH = count > 0 ? (maxY - minY).toFixed(1) : 0;
        const weightNum = this._panels.reduce((s, p) => {
            const w = parseFloat(p.weight) || 0;
            return s + w;
        }, 0);

        const el = (id) => document.getElementById(id);
        if (el('led3d-count')) el('led3d-count').textContent = count;
        if (el('led3d-pixels')) el('led3d-pixels').textContent = totalPixels.toLocaleString();
        if (el('led3d-size')) el('led3d-size').textContent = `${sizeW}m x ${sizeH}m`;
        if (el('led3d-weight')) el('led3d-weight').textContent = `${weightNum.toFixed(1)} kg`;
    },

    togglePixelGrid() {
        this._showPixelGrid = !this._showPixelGrid;
        UI.toast(this._showPixelGrid ? 'Pixel grid ON' : 'Pixel grid OFF', 'info', 1500);
    },

    toggleLabels() {
        this._showLabels = !this._showLabels;
        UI.toast(this._showLabels ? 'Labels ON' : 'Labels OFF', 'info', 1500);
    },

    resetCamera() {
        if (!this._orbitState) return;
        this._orbitState.spherical.theta = 0;
        this._orbitState.spherical.phi = Math.PI / 3;
        this._orbitState.spherical.radius = 12;
        this._orbitState.target.set(0, 2, 0);
        this._orbitState.updateCamera();
    },

    topView() {
        if (!this._orbitState) return;
        this._orbitState.spherical.theta = 0;
        this._orbitState.spherical.phi = 0.01;
        this._orbitState.spherical.radius = 15;
        this._orbitState.target.set(0, 0, 0);
        this._orbitState.updateCamera();
    },

    frontView() {
        if (!this._orbitState) return;
        this._orbitState.spherical.theta = 0;
        this._orbitState.spherical.phi = Math.PI / 2;
        this._orbitState.spherical.radius = 12;
        this._orbitState.target.set(0, 2, 0);
        this._orbitState.updateCamera();
    },

    async exportLayout() {
        const data = {
            panelType: document.getElementById('led3d-panel-type')?.value,
            panels: this._panels.map(p => ({
                col: p.col, row: p.row, type: p.panelType,
                x: p.mesh.position.x.toFixed(3), y: p.mesh.position.y.toFixed(3), z: p.mesh.position.z.toFixed(3),
                rotY: Math.round(p.mesh.rotation.y * 180 / Math.PI),
                px: p.px, py: p.py,
            })),
            totalPanels: this._panels.length,
            totalPixels: this._panels.reduce((s, p) => s + p.px * p.py, 0),
        };
        const content = JSON.stringify(data, null, 2);
        await UI.exportFile('led-layout-3d.json', content, [
            { name: 'JSON', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
        ]);
    },
};
