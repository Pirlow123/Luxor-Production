/**
 * Luxor Production v1.3 — 3D Stage Visualizer
 * Interactive Three.js based stage layout with LED walls, screens, cameras, trusses
 */
const Stage3dPage = {
    _scene: null,
    _camera: null,
    _renderer: null,
    _controls: null,
    _animId: null,
    _objects: [],
    _selectedObj: null,
    _gridHelper: null,
    _raycaster: null,
    _mouse: null,
    _transformMode: 'translate', // translate, rotate, scale
    _stagePresets: {
        'empty':     { name: 'Empty Stage', objects: [] },
        'concert':   { name: 'Concert Stage', objects: [
            { type: 'led-wall', name: 'Main LED', x: 0, y: 4, z: -6, w: 12, h: 6, d: 0.1, color: '#0ea5e9' },
            { type: 'led-wall', name: 'Left Wing', x: -8, y: 3, z: -4, w: 4, h: 4, d: 0.1, ry: 30, color: '#8b5cf6' },
            { type: 'led-wall', name: 'Right Wing', x: 8, y: 3, z: -4, w: 4, h: 4, d: 0.1, ry: -30, color: '#8b5cf6' },
            { type: 'led-floor', name: 'LED Floor', x: 0, y: 0.02, z: -2, w: 8, h: 0.05, d: 4, color: '#06b6d4' },
            { type: 'truss', name: 'Front Truss', x: 0, y: 7, z: 0, w: 14, h: 0.3, d: 0.3, color: '#94a3b8' },
            { type: 'truss', name: 'Mid Truss', x: 0, y: 7.5, z: -4, w: 14, h: 0.3, d: 0.3, color: '#94a3b8' },
            { type: 'truss', name: 'Rear Truss', x: 0, y: 8, z: -7, w: 14, h: 0.3, d: 0.3, color: '#94a3b8' },
            { type: 'camera', name: 'FOH Camera', x: 0, y: 2, z: 10, w: 0.4, h: 0.4, d: 0.6, color: '#ef4444' },
            { type: 'camera', name: 'Stage Left Cam', x: -6, y: 1.5, z: 2, w: 0.4, h: 0.4, d: 0.6, ry: 45, color: '#ef4444' },
            { type: 'camera', name: 'Stage Right Cam', x: 6, y: 1.5, z: 2, w: 0.4, h: 0.4, d: 0.6, ry: -45, color: '#ef4444' },
            { type: 'projector', name: 'Projector L', x: -3, y: 7, z: 2, w: 0.5, h: 0.4, d: 0.8, color: '#f59e0b' },
            { type: 'projector', name: 'Projector R', x: 3, y: 7, z: 2, w: 0.5, h: 0.4, d: 0.8, color: '#f59e0b' },
        ]},
        'broadcast': { name: 'Broadcast Studio', objects: [
            { type: 'led-wall', name: 'Backdrop LED', x: 0, y: 2.5, z: -5, w: 8, h: 4, d: 0.1, color: '#3b82f6' },
            { type: 'led-wall', name: 'Desk Front', x: 0, y: 0.5, z: -1.5, w: 4, h: 0.8, d: 0.1, color: '#0ea5e9' },
            { type: 'screen', name: 'Monitor L', x: -3, y: 2, z: -4, w: 2, h: 1.2, d: 0.1, ry: 20, color: '#64748b' },
            { type: 'screen', name: 'Monitor R', x: 3, y: 2, z: -4, w: 2, h: 1.2, d: 0.1, ry: -20, color: '#64748b' },
            { type: 'camera', name: 'Camera 1', x: 0, y: 1.5, z: 4, w: 0.4, h: 0.4, d: 0.6, color: '#ef4444' },
            { type: 'camera', name: 'Camera 2', x: -3, y: 1.5, z: 3, w: 0.4, h: 0.4, d: 0.6, ry: 25, color: '#ef4444' },
            { type: 'camera', name: 'Camera 3', x: 3, y: 1.5, z: 3, w: 0.4, h: 0.4, d: 0.6, ry: -25, color: '#ef4444' },
            { type: 'truss', name: 'Lighting Grid', x: 0, y: 4, z: 0, w: 10, h: 0.3, d: 8, color: '#94a3b8' },
        ]},
        'corporate': { name: 'Corporate Event', objects: [
            { type: 'led-wall', name: 'Main Screen', x: 0, y: 3, z: -6, w: 10, h: 5, d: 0.1, color: '#0ea5e9' },
            { type: 'screen', name: 'Side Screen L', x: -7, y: 2.5, z: -4, w: 3, h: 2, d: 0.1, ry: 30, color: '#64748b' },
            { type: 'screen', name: 'Side Screen R', x: 7, y: 2.5, z: -4, w: 3, h: 2, d: 0.1, ry: -30, color: '#64748b' },
            { type: 'camera', name: 'Wide Shot', x: 0, y: 2, z: 12, w: 0.4, h: 0.4, d: 0.6, color: '#ef4444' },
            { type: 'truss', name: 'Front Truss', x: 0, y: 5, z: 0, w: 16, h: 0.3, d: 0.3, color: '#94a3b8' },
        ]},
    },

    render() {
        return `
            <div style="display:flex;gap:0;height:calc(100vh - 60px);overflow:hidden;">
                <!-- 3D Viewport -->
                <div style="flex:1;position:relative;background:#0a0a0c;">
                    <div id="stage3d-canvas" style="width:100%;height:100%;"></div>
                    <!-- Toolbar overlay -->
                    <div style="position:absolute;top:12px;left:12px;display:flex;gap:6px;z-index:10;">
                        <button class="btn btn-xs ${this._transformMode === 'translate' ? 'btn-primary' : 'btn-secondary'}" onclick="Stage3dPage.setTransformMode('translate')" title="Move (G)"><i class="fas fa-arrows-alt"></i></button>
                        <button class="btn btn-xs ${this._transformMode === 'rotate' ? 'btn-primary' : 'btn-secondary'}" onclick="Stage3dPage.setTransformMode('rotate')" title="Rotate (R)"><i class="fas fa-sync-alt"></i></button>
                        <button class="btn btn-xs ${this._transformMode === 'scale' ? 'btn-primary' : 'btn-secondary'}" onclick="Stage3dPage.setTransformMode('scale')" title="Scale (S)"><i class="fas fa-expand-arrows-alt"></i></button>
                        <div style="width:1px;height:24px;background:var(--border);margin:0 2px;"></div>
                        <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.resetCamera()" title="Reset Camera"><i class="fas fa-home"></i></button>
                        <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.toggleGrid()" title="Toggle Grid"><i class="fas fa-border-all"></i></button>
                        <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.topView()" title="Top View"><i class="fas fa-arrow-down"></i> Top</button>
                        <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.frontView()" title="Front View"><i class="fas fa-arrow-right"></i> Front</button>
                    </div>
                    <!-- Info overlay -->
                    <div id="stage3d-info" style="position:absolute;bottom:12px;left:12px;font-size:10px;color:var(--text-muted);z-index:10;">
                        Orbit: Left drag | Pan: Right drag | Zoom: Scroll | Click: Select
                    </div>
                </div>
                <!-- Right Panel -->
                <div style="width:280px;background:var(--bg-primary);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;">
                    <!-- Presets -->
                    <div style="padding:12px;border-bottom:1px solid var(--border);">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Stage Presets</div>
                        <select class="form-control" onchange="Stage3dPage.loadPreset(this.value)" id="stage3d-preset">
                            ${Object.entries(this._stagePresets).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
                        </select>
                        <button class="btn btn-xs btn-primary w-full mt-sm" onclick="Stage3dPage.loadPreset(document.getElementById('stage3d-preset').value)">
                            <i class="fas fa-download"></i> Load Preset
                        </button>
                    </div>
                    <!-- Add Object -->
                    <div style="padding:12px;border-bottom:1px solid var(--border);">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Add Object</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('led-wall')"><i class="fas fa-tv" style="color:#0ea5e9"></i> LED Wall</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('led-floor')"><i class="fas fa-square" style="color:#06b6d4"></i> LED Floor</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('screen')"><i class="fas fa-desktop" style="color:#64748b"></i> Screen</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('projector')"><i class="fas fa-video" style="color:#f59e0b"></i> Projector</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('camera')"><i class="fas fa-camera" style="color:#ef4444"></i> Camera</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('truss')"><i class="fas fa-grip-lines" style="color:#94a3b8"></i> Truss</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('speaker')"><i class="fas fa-volume-up" style="color:#a855f7"></i> Speaker</button>
                            <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.addObject('processor')"><i class="fas fa-microchip" style="color:#22c55e"></i> Processor</button>
                        </div>
                    </div>
                    <!-- Object List -->
                    <div style="padding:12px;border-bottom:1px solid var(--border);flex:1;overflow-y:auto;">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Scene Objects</div>
                        <div id="stage3d-objlist"></div>
                    </div>
                    <!-- Properties Panel -->
                    <div style="padding:12px;border-top:1px solid var(--border);">
                        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Properties</div>
                        <div id="stage3d-props">
                            <div class="text-muted" style="font-size:11px;">Select an object</div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    onActivate() {
        setTimeout(() => this._initScene(), 50);
    },

    onDeactivate() {
        this._stopAnimation();
        if (this._renderer) {
            this._renderer.dispose();
            this._renderer = null;
        }
        this._scene = null;
        this._camera = null;
        this._controls = null;
    },

    _initScene() {
        const container = document.getElementById('stage3d-canvas');
        if (!container || !window.THREE) return;

        // Scene
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x0a0a0c);
        this._scene.fog = new THREE.Fog(0x0a0a0c, 30, 80);

        // Camera
        this._camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
        this._camera.position.set(12, 8, 16);
        this._camera.lookAt(0, 2, 0);

        // Renderer
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setSize(container.clientWidth, container.clientHeight);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.innerHTML = '';
        container.appendChild(this._renderer.domElement);

        // Orbit Controls (manual implementation since we can't import OrbitControls module)
        this._setupControls(container);

        // Lights
        const ambient = new THREE.AmbientLight(0x404060, 0.6);
        this._scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this._scene.add(dirLight);
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362a28, 0.3);
        this._scene.add(hemiLight);

        // Grid
        this._gridHelper = new THREE.GridHelper(40, 40, 0x222233, 0x111122);
        this._scene.add(this._gridHelper);

        // Ground plane
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this._scene.add(ground);

        // Axes helper (small)
        const axes = new THREE.AxesHelper(2);
        axes.position.set(-18, 0.01, -18);
        this._scene.add(axes);

        // Raycaster for selection
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();
        this._renderer.domElement.addEventListener('click', (e) => this._onMouseClick(e));

        // Resize
        this._resizeObserver = new ResizeObserver(() => {
            if (!this._camera || !this._renderer) return;
            this._camera.aspect = container.clientWidth / container.clientHeight;
            this._camera.updateProjectionMatrix();
            this._renderer.setSize(container.clientWidth, container.clientHeight);
        });
        this._resizeObserver.observe(container);

        // Keyboard
        this._keyHandler = (e) => this._onKeyDown(e);
        window.addEventListener('keydown', this._keyHandler);

        // Load default preset
        this.loadPreset('concert');

        // Start animation
        this._startAnimation();
    },

    _setupControls(container) {
        // Simple orbit controls implementation
        let isOrbiting = false;
        let isPanning = false;
        let prevX = 0, prevY = 0;
        let spherical = { theta: Math.atan2(this._camera.position.x, this._camera.position.z), phi: Math.acos(this._camera.position.y / this._camera.position.length()), radius: this._camera.position.length() };
        let target = new THREE.Vector3(0, 2, 0);

        const updateCamera = () => {
            const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            const y = spherical.radius * Math.cos(spherical.phi);
            const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            this._camera.position.set(target.x + x, target.y + y, target.z + z);
            this._camera.lookAt(target);
        };

        this._orbitState = { spherical, target, updateCamera };

        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { isOrbiting = true; }
            else if (e.button === 2) { isPanning = true; }
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
            spherical.radius = Math.max(2, Math.min(60, spherical.radius + e.deltaY * 0.02));
            updateCamera();
        }, { passive: false });

        container.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    _startAnimation() {
        const animate = () => {
            this._animId = requestAnimationFrame(animate);
            // Pulse selected object
            if (this._selectedObj?.mesh) {
                const t = Date.now() * 0.003;
                this._selectedObj.mesh.material.emissiveIntensity = 0.3 + Math.sin(t) * 0.15;
            }
            if (this._renderer && this._scene && this._camera) {
                this._renderer.render(this._scene, this._camera);
            }
        };
        animate();
    },

    _stopAnimation() {
        if (this._animId) cancelAnimationFrame(this._animId);
        this._animId = null;
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    },

    _onMouseClick(e) {
        if (!this._renderer || !this._raycaster) return;
        const rect = this._renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this._raycaster.setFromCamera(this._mouse, this._camera);
        const meshes = this._objects.map(o => o.mesh).filter(Boolean);
        const intersects = this._raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            const obj = this._objects.find(o => o.mesh === intersects[0].object);
            if (obj) this.selectObject(obj);
        } else {
            this.selectObject(null);
        }
    },

    _onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        switch (e.key.toLowerCase()) {
            case 'g': this.setTransformMode('translate'); break;
            case 'r': this.setTransformMode('rotate'); break;
            case 's': this.setTransformMode('scale'); break;
            case 'delete': case 'backspace': this.deleteSelected(); break;
            case 'd': if (e.ctrlKey) { e.preventDefault(); this.duplicateSelected(); } break;
        }
    },

    // ================================================================
    // OBJECT MANAGEMENT
    // ================================================================
    _typeDefaults: {
        'led-wall':  { w: 6, h: 3, d: 0.1, color: '#0ea5e9', emissive: 0.4 },
        'led-floor': { w: 4, h: 0.05, d: 3, color: '#06b6d4', emissive: 0.3 },
        'screen':    { w: 3, h: 1.8, d: 0.08, color: '#64748b', emissive: 0.2 },
        'projector': { w: 0.5, h: 0.4, d: 0.8, color: '#f59e0b', emissive: 0.1 },
        'camera':    { w: 0.4, h: 0.4, d: 0.6, color: '#ef4444', emissive: 0.1 },
        'truss':     { w: 10, h: 0.3, d: 0.3, color: '#94a3b8', emissive: 0 },
        'speaker':   { w: 0.6, h: 1, d: 0.5, color: '#a855f7', emissive: 0.05 },
        'processor': { w: 0.5, h: 0.15, d: 0.4, color: '#22c55e', emissive: 0.1 },
    },

    _typeIcons: {
        'led-wall': 'fa-tv', 'led-floor': 'fa-square', 'screen': 'fa-desktop',
        'projector': 'fa-video', 'camera': 'fa-camera', 'truss': 'fa-grip-lines',
        'speaker': 'fa-volume-up', 'processor': 'fa-microchip',
    },

    addObject(type, opts = {}) {
        if (!this._scene) return;
        const def = this._typeDefaults[type] || this._typeDefaults['led-wall'];
        const w = opts.w || def.w;
        const h = opts.h || def.h;
        const d = opts.d || def.d;
        const color = opts.color || def.color;
        const emissive = def.emissive || 0;

        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: emissive,
            roughness: type.startsWith('led') ? 0.3 : 0.7,
            metalness: type === 'truss' ? 0.8 : 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(opts.x || 0, opts.y || (type === 'led-floor' ? 0.02 : 2), opts.z || 0);
        if (opts.ry) mesh.rotation.y = (opts.ry * Math.PI) / 180;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this._scene.add(mesh);

        // Edge highlight
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x444466, transparent: true, opacity: 0.4 }));
        mesh.add(line);

        const obj = {
            id: Date.now() + Math.random(),
            type,
            name: opts.name || `${type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} ${this._objects.filter(o => o.type === type).length + 1}`,
            mesh,
            color,
            w, h, d,
        };
        this._objects.push(obj);
        this._updateObjectList();
        return obj;
    },

    deleteSelected() {
        if (!this._selectedObj) return;
        this._scene.remove(this._selectedObj.mesh);
        this._selectedObj.mesh.geometry.dispose();
        this._selectedObj.mesh.material.dispose();
        this._objects = this._objects.filter(o => o !== this._selectedObj);
        this._selectedObj = null;
        this._updateObjectList();
        this._updateProps();
    },

    duplicateSelected() {
        if (!this._selectedObj) return;
        const s = this._selectedObj;
        const newObj = this.addObject(s.type, {
            name: s.name + ' Copy',
            x: s.mesh.position.x + 1,
            y: s.mesh.position.y,
            z: s.mesh.position.z + 1,
            w: s.w, h: s.h, d: s.d,
            color: s.color,
        });
        this.selectObject(newObj);
    },

    selectObject(obj) {
        // Deselect previous
        if (this._selectedObj?.mesh) {
            const def = this._typeDefaults[this._selectedObj.type];
            this._selectedObj.mesh.material.emissiveIntensity = def?.emissive || 0;
        }
        this._selectedObj = obj;
        if (obj?.mesh) {
            obj.mesh.material.emissiveIntensity = 0.5;
        }
        this._updateObjectList();
        this._updateProps();
    },

    _updateObjectList() {
        const el = document.getElementById('stage3d-objlist');
        if (!el) return;
        if (this._objects.length === 0) {
            el.innerHTML = '<div class="text-muted" style="font-size:11px;">No objects — add or load a preset</div>';
            return;
        }
        el.innerHTML = this._objects.map(o => `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;margin-bottom:2px;border-radius:4px;cursor:pointer;border:1px solid ${this._selectedObj === o ? 'var(--accent)' : 'transparent'};background:${this._selectedObj === o ? 'rgba(0,212,170,0.08)' : 'transparent'};font-size:11px;" onclick="Stage3dPage.selectObjectById(${o.id})">
                <i class="fas ${this._typeIcons[o.type] || 'fa-cube'}" style="color:${o.color};font-size:10px;width:14px;"></i>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${this._selectedObj === o ? 'color:var(--accent);font-weight:600;' : ''}">${UI.esc(o.name)}</span>
                <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px;padding:2px;" onclick="event.stopPropagation();Stage3dPage.selectObjectById(${o.id});Stage3dPage.deleteSelected()"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    },

    _updateProps() {
        const el = document.getElementById('stage3d-props');
        if (!el) return;
        const o = this._selectedObj;
        if (!o) { el.innerHTML = '<div class="text-muted" style="font-size:11px;">Select an object</div>'; return; }
        const p = o.mesh.position;
        const r = o.mesh.rotation;
        el.innerHTML = `
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px;"><i class="fas ${this._typeIcons[o.type] || 'fa-cube'}"></i> ${UI.esc(o.name)}</div>
            <div style="display:grid;grid-template-columns:40px 1fr;gap:4px;font-size:10px;">
                <span class="text-muted">Name</span><input class="form-control" style="font-size:10px;padding:2px 6px;" value="${UI.esc(o.name)}" onchange="Stage3dPage.setProp('name',this.value)">
                <span class="text-muted">Pos X</span><input type="number" step="0.1" class="form-control" style="font-size:10px;padding:2px 6px;" value="${p.x.toFixed(1)}" onchange="Stage3dPage.setProp('px',this.value)">
                <span class="text-muted">Pos Y</span><input type="number" step="0.1" class="form-control" style="font-size:10px;padding:2px 6px;" value="${p.y.toFixed(1)}" onchange="Stage3dPage.setProp('py',this.value)">
                <span class="text-muted">Pos Z</span><input type="number" step="0.1" class="form-control" style="font-size:10px;padding:2px 6px;" value="${p.z.toFixed(1)}" onchange="Stage3dPage.setProp('pz',this.value)">
                <span class="text-muted">Rot Y</span><input type="number" step="5" class="form-control" style="font-size:10px;padding:2px 6px;" value="${Math.round(r.y * 180 / Math.PI)}" onchange="Stage3dPage.setProp('ry',this.value)">
                <span class="text-muted">Color</span><input type="color" value="${o.color}" style="width:100%;height:22px;border:none;cursor:pointer;" onchange="Stage3dPage.setProp('color',this.value)">
            </div>
            <div style="display:flex;gap:4px;margin-top:8px;">
                <button class="btn btn-xs btn-secondary" onclick="Stage3dPage.duplicateSelected()"><i class="fas fa-copy"></i> Duplicate</button>
                <button class="btn btn-xs btn-danger" onclick="Stage3dPage.deleteSelected()"><i class="fas fa-trash"></i> Delete</button>
            </div>`;
    },

    setProp(prop, val) {
        const o = this._selectedObj;
        if (!o) return;
        switch (prop) {
            case 'name': o.name = val; this._updateObjectList(); break;
            case 'px': o.mesh.position.x = parseFloat(val) || 0; break;
            case 'py': o.mesh.position.y = parseFloat(val) || 0; break;
            case 'pz': o.mesh.position.z = parseFloat(val) || 0; break;
            case 'ry': o.mesh.rotation.y = ((parseFloat(val) || 0) * Math.PI) / 180; break;
            case 'color':
                o.color = val;
                o.mesh.material.color.set(val);
                o.mesh.material.emissive.set(val);
                this._updateObjectList();
                break;
        }
    },

    selectObjectById(id) {
        const obj = this._objects.find(o => o.id === id);
        if (obj) this.selectObject(obj);
    },

    // ================================================================
    // CAMERA / VIEW
    // ================================================================
    resetCamera() {
        if (!this._orbitState) return;
        this._orbitState.spherical.theta = Math.atan2(12, 16);
        this._orbitState.spherical.phi = Math.acos(8 / Math.sqrt(12*12+8*8+16*16));
        this._orbitState.spherical.radius = Math.sqrt(12*12+8*8+16*16);
        this._orbitState.target.set(0, 2, 0);
        this._orbitState.updateCamera();
    },

    topView() {
        if (!this._orbitState) return;
        this._orbitState.spherical.theta = 0;
        this._orbitState.spherical.phi = 0.01;
        this._orbitState.spherical.radius = 25;
        this._orbitState.target.set(0, 0, 0);
        this._orbitState.updateCamera();
    },

    frontView() {
        if (!this._orbitState) return;
        this._orbitState.spherical.theta = 0;
        this._orbitState.spherical.phi = Math.PI / 2;
        this._orbitState.spherical.radius = 20;
        this._orbitState.target.set(0, 3, 0);
        this._orbitState.updateCamera();
    },

    toggleGrid() {
        if (this._gridHelper) this._gridHelper.visible = !this._gridHelper.visible;
    },

    setTransformMode(mode) {
        this._transformMode = mode;
        // Re-render toolbar to show active state
        const btns = document.querySelectorAll('#stage3d-canvas + div button');
        // Just update UI toast
        UI.toast(`Transform: ${mode}`, 'info', 1500);
    },

    // ================================================================
    // PRESETS
    // ================================================================
    loadPreset(key) {
        const preset = this._stagePresets[key];
        if (!preset) return;
        // Clear existing
        this._objects.forEach(o => {
            this._scene.remove(o.mesh);
            o.mesh.geometry.dispose();
            o.mesh.material.dispose();
        });
        this._objects = [];
        this._selectedObj = null;
        // Add preset objects
        preset.objects.forEach(o => this.addObject(o.type, o));
        this._updateObjectList();
        this._updateProps();
        UI.toast(`Loaded: ${preset.name}`, 'success');
    },
};
