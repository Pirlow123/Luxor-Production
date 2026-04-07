/**
 * Topology Page — Live network topology map showing all devices with draggable nodes and connection lines
 * Inspired by Luminex Araneo — devices appear as visual nodes on a dark canvas
 */
const TopologyPage = {
    _nodes: [],          // { id, type, name, ip, online, x, y, width, height, icon, color, deviceRef }
    _connections: [],    // { from, to, label, color }
    _isActive: false,
    _canvas: null,
    _ctx: null,
    _dragNode: null,
    _dragOffset: { x: 0, y: 0 },
    _pan: { x: 0, y: 0 },
    _panStart: null,
    _zoom: 1,
    _hoveredNode: null,
    _selectedNode: null,
    _animFrame: null,
    _lastSync: 0,

    render() {
        return `
        <style>
            .topo-page { display:flex; flex-direction:column; height:100%; background:#050508; overflow:hidden; }
            .topo-toolbar { display:flex; align-items:center; gap:10px; padding:8px 16px; background:var(--bg-secondary); border-bottom:1px solid var(--border); flex-shrink:0; }
            .topo-toolbar .btn { font-size:11px; padding:4px 10px; }
            .topo-canvas-wrap { flex:1; position:relative; overflow:hidden; cursor:grab; }
            .topo-canvas-wrap.dragging { cursor:grabbing; }
            .topo-canvas { display:block; width:100%; height:100%; }
            .topo-info-panel { position:absolute; top:12px; right:12px; width:260px; background:rgba(15,15,20,0.92); border:1px solid var(--border); border-radius:var(--radius); padding:14px; font-size:11px; backdrop-filter:blur(8px); }
            .topo-info-panel h4 { font-size:13px; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
            .topo-info-row { display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
            .topo-info-row:last-child { border-bottom:none; }
            .topo-legend { position:absolute; bottom:12px; left:12px; display:flex; gap:14px; background:rgba(15,15,20,0.85); border:1px solid var(--border); border-radius:var(--radius); padding:8px 14px; font-size:10px; backdrop-filter:blur(8px); }
            .topo-legend-item { display:flex; align-items:center; gap:5px; color:var(--text-secondary); }
            .topo-legend-dot { width:10px; height:10px; border-radius:50%; }
            .topo-zoom-info { position:absolute; bottom:12px; right:12px; background:rgba(15,15,20,0.85); border:1px solid var(--border); border-radius:var(--radius); padding:6px 12px; font-size:10px; color:var(--text-muted); backdrop-filter:blur(8px); }
        </style>
        <div class="topo-page">
            <div class="topo-toolbar">
                <span style="font-weight:700;font-size:13px;letter-spacing:1px"><i class="fas fa-project-diagram" style="color:var(--blue)"></i> TOPOLOGY MAP</span>
                <div style="flex:1"></div>
                <button class="btn btn-sm" onclick="TopologyPage._autoLayout()"><i class="fas fa-magic"></i> Auto Layout</button>
                <button class="btn btn-sm" onclick="TopologyPage._fitView()"><i class="fas fa-compress-arrows-alt"></i> Fit View</button>
                <button class="btn btn-sm" onclick="TopologyPage._zoomIn()"><i class="fas fa-search-plus"></i></button>
                <button class="btn btn-sm" onclick="TopologyPage._zoomOut()"><i class="fas fa-search-minus"></i></button>
                <button class="btn btn-sm" onclick="TopologyPage.syncDevices()"><i class="fas fa-sync"></i> Refresh</button>
            </div>
            <div class="topo-canvas-wrap" id="topo-wrap">
                <canvas class="topo-canvas" id="topo-canvas"></canvas>
                <div id="topo-info" class="topo-info-panel" style="display:none"></div>
                <div class="topo-legend">
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#4ade80"></div> Online</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#f87171"></div> Offline</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#38bdf8"></div> Server</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#a78bfa"></div> Processor</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#fbbf24"></div> Camera</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#34d399"></div> Switch</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#f472b6"></div> Lighting</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#fb923c"></div> Intercom</div>
                    <div class="topo-legend-item"><div class="topo-legend-dot" style="background:#94a3b8"></div> Load Cell</div>
                </div>
                <div class="topo-zoom-info" id="topo-zoom">100%</div>
            </div>
        </div>`;
    },

    onActivate() {
        this._isActive = true;
        this._initCanvas();
        this.syncDevices();
        this._startRender();
        this._pollTimer = setInterval(() => this.syncDevices(), 5000);
    },

    onDeactivate() {
        this._isActive = false;
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        if (this._pollTimer) clearInterval(this._pollTimer);
        this._pollTimer = null;
    },

    refresh() {
        this.syncDevices();
    },

    // ════════════════════════════════════════════════════════════════
    // CANVAS INITIALIZATION
    // ════════════════════════════════════════════════════════════════
    _initCanvas() {
        this._canvas = document.getElementById('topo-canvas');
        if (!this._canvas) return;
        this._ctx = this._canvas.getContext('2d');
        this._resizeCanvas();

        const wrap = document.getElementById('topo-wrap');

        // Mouse events
        this._canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this._canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this._canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this._canvas.addEventListener('mouseleave', (e) => this._onMouseUp(e));
        this._canvas.addEventListener('wheel', (e) => this._onWheel(e));
        this._canvas.addEventListener('dblclick', (e) => this._onDblClick(e));

        window.addEventListener('resize', () => this._resizeCanvas());
    },

    _resizeCanvas() {
        if (!this._canvas) return;
        const wrap = this._canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        this._canvas.width = wrap.clientWidth * dpr;
        this._canvas.height = wrap.clientHeight * dpr;
        this._canvas.style.width = wrap.clientWidth + 'px';
        this._canvas.style.height = wrap.clientHeight + 'px';
        this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    // ════════════════════════════════════════════════════════════════
    // DEVICE SYNC — gathers all devices from across the app
    // ════════════════════════════════════════════════════════════════
    syncDevices() {
        const _load = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
        const savedPositions = this._loadPositions();
        const existingIds = new Set(this._nodes.map(n => n.id));
        const seenIds = new Set();

        const servers = appState.get('servers') || [];
        const statuses = appState.get('serverStatuses') || {};
        const ledProcs = _load('luxor_led_processors');
        const ptzCams = [..._load('luxor_ptz_cameras'), ..._load('luxor_ptz_cameras_virtual')];
        const netSwitches = [..._load('luxor_net_switches'), ..._load('luxor_net_switches_virtual')];
        const lightConsoles = [..._load('luxor_lighting_consoles'), ..._load('luxor_lighting_consoles_virtual')];
        const intercoms = [..._load('luxor_intercom_systems'), ..._load('luxor_intercom_systems_virtual')];
        const loadCells = _load('luxor_loadcells');

        const typeLabels = { hippo:'Hippotizer', resolume:'Resolume', vmix:'vMix', casparcg:'CasparCG', obs:'OBS', barco:'Barco E2', qlab:'QLab', disguise:'Disguise', pixera:'Pixera', atem:'ATEM' };

        // Servers
        servers.forEach(s => {
            const id = `srv-${s.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'server', name: s.name || typeLabels[s.type] || 'Server',
                ip: `${s.host}:${s.port}`, online: statuses[s.id]?.online || false,
                icon: '\uf233', color: '#38bdf8', deviceRef: s,
                subtype: s.type, label: typeLabels[s.type] || s.type
            }, savedPositions);
        });

        // LED Processors
        ledProcs.forEach(p => {
            const id = `led-${p.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'processor', name: p.name || p.type,
                ip: `${p.host}:${p.port}`, online: p.online || p.virtual || false,
                icon: '\uf26c', color: '#a78bfa', deviceRef: p,
                label: p.type
            }, savedPositions);
        });

        // PTZ Cameras
        ptzCams.forEach(c => {
            const id = `ptz-${c.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'camera', name: c.name || 'Camera',
                ip: c.ip || c.host || '--', online: c.connected || c.virtual || false,
                icon: '\uf030', color: '#fbbf24', deviceRef: c,
                label: c.model || 'PTZ'
            }, savedPositions);
        });

        // Network Switches
        netSwitches.forEach(s => {
            const id = `sw-${s.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'switch', name: s.name || 'Switch',
                ip: s.ip || s.host || '--', online: s.connected || s.virtual || false,
                icon: '\uf6ff', color: '#34d399', deviceRef: s,
                label: s.model || 'Switch'
            }, savedPositions);
        });

        // Lighting Consoles
        lightConsoles.forEach(c => {
            const id = `lt-${c.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'lighting', name: c.name || 'Console',
                ip: c.ip || c.host || '--', online: c.connected || c.virtual || false,
                icon: '\uf0eb', color: '#f472b6', deviceRef: c,
                label: c.model || 'Lighting'
            }, savedPositions);
        });

        // Intercom Systems
        intercoms.forEach(i => {
            const id = `ic-${i.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'intercom', name: i.name || 'Intercom',
                ip: i.ip || i.host || '--', online: i.connected || i.virtual || false,
                icon: '\uf130', color: '#fb923c', deviceRef: i,
                label: i.model || 'Intercom'
            }, savedPositions);
        });

        // Load Cells
        loadCells.forEach(c => {
            const id = `lc-${c.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'loadcell', name: c.name || 'Load Cell',
                ip: c.address || '--', online: c.online || false,
                icon: '\uf24e', color: '#94a3b8', deviceRef: c,
                label: `${c.value != null ? c.value.toFixed(1) : '--'} ${c.unit || 'kg'}`
            }, savedPositions);
        });

        // Auto-detect connections by shared IP subnet
        this._autoConnections();

        // First time — auto-layout
        if (this._nodes.length > 0 && !this._hasPositions) {
            this._autoLayout();
            this._fitView();
            this._hasPositions = true;
        }
    },

    _upsertNode(id, data, savedPositions) {
        let node = this._nodes.find(n => n.id === id);
        if (node) {
            // Update existing
            Object.assign(node, data);
        } else {
            // Create new
            const pos = savedPositions[id];
            node = {
                id, ...data,
                x: pos?.x ?? 100 + Math.random() * 600,
                y: pos?.y ?? 100 + Math.random() * 400,
                width: 180, height: 70,
            };
            this._nodes.push(node);
        }
    },

    // ════════════════════════════════════════════════════════════════
    // AUTO-CONNECTIONS — detect relationships by IP subnet
    // ════════════════════════════════════════════════════════════════
    _autoConnections() {
        this._connections = [];
        // Group devices by subnet (first 3 octets)
        const subnets = {};
        this._nodes.forEach(n => {
            const ip = (n.ip || '').split(':')[0];
            const parts = ip.split('.');
            if (parts.length === 4) {
                const subnet = parts.slice(0, 3).join('.');
                if (!subnets[subnet]) subnets[subnet] = [];
                subnets[subnet].push(n);
            }
        });

        // Connect devices on the same subnet through a switch if one exists, otherwise star topology
        Object.values(subnets).forEach(group => {
            if (group.length < 2) return;
            const sw = group.find(n => n.type === 'switch');
            if (sw) {
                // Star through switch
                group.forEach(n => {
                    if (n.id !== sw.id) {
                        this._connections.push({ from: sw.id, to: n.id, color: n.online && sw.online ? '#1a5c3a' : '#3a1a1a' });
                    }
                });
            } else {
                // Mesh — connect first to all others (simple star from first device)
                for (let i = 1; i < group.length; i++) {
                    this._connections.push({ from: group[0].id, to: group[i].id, color: group[0].online && group[i].online ? '#1a5c3a' : '#3a1a1a' });
                }
            }
        });
    },

    // ════════════════════════════════════════════════════════════════
    // RENDERING
    // ════════════════════════════════════════════════════════════════
    _startRender() {
        const render = () => {
            if (!this._isActive) return;
            this._draw();
            this._animFrame = requestAnimationFrame(render);
        };
        render();
    },

    _draw() {
        const ctx = this._ctx;
        if (!ctx || !this._canvas) return;
        const w = this._canvas.clientWidth;
        const h = this._canvas.clientHeight;

        ctx.save();
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.save();
        ctx.translate(this._pan.x, this._pan.y);
        ctx.scale(this._zoom, this._zoom);
        this._drawGrid(ctx, w, h);

        // Connections
        this._connections.forEach(c => {
            const from = this._nodes.find(n => n.id === c.from);
            const to = this._nodes.find(n => n.id === c.to);
            if (!from || !to) return;
            this._drawConnection(ctx, from, to, c);
        });

        // Nodes
        this._nodes.forEach(n => this._drawNode(ctx, n));

        ctx.restore();
        ctx.restore();
    },

    _drawGrid(ctx, w, h) {
        const gridSize = 40;
        const startX = Math.floor(-this._pan.x / this._zoom / gridSize) * gridSize - gridSize;
        const startY = Math.floor(-this._pan.y / this._zoom / gridSize) * gridSize - gridSize;
        const endX = startX + w / this._zoom + gridSize * 2;
        const endY = startY + h / this._zoom + gridSize * 2;

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = startX; x < endX; x += gridSize) {
            ctx.moveTo(x, startY); ctx.lineTo(x, endY);
        }
        for (let y = startY; y < endY; y += gridSize) {
            ctx.moveTo(startX, y); ctx.lineTo(endX, y);
        }
        ctx.stroke();
    },

    _drawConnection(ctx, from, to, conn) {
        const fx = from.x + from.width / 2;
        const fy = from.y + from.height / 2;
        const tx = to.x + to.width / 2;
        const ty = to.y + to.height / 2;

        const online = from.online && to.online;

        // Glow effect for online connections
        if (online) {
            ctx.save();
            ctx.strokeStyle = 'rgba(74,222,128,0.15)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.restore();
        }

        ctx.strokeStyle = online ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.2)';
        ctx.lineWidth = online ? 2 : 1;
        ctx.setLineDash(online ? [] : [5, 5]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated data flow dots on online connections
        if (online) {
            const t = (Date.now() % 3000) / 3000;
            const dx = fx + (tx - fx) * t;
            const dy = fy + (ty - fy) * t;
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(dx, dy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawNode(ctx, node) {
        const { x, y, width: w, height: h, name, ip, icon, color, online, type, label } = node;
        const isHovered = this._hoveredNode?.id === node.id;
        const isSelected = this._selectedNode?.id === node.id;

        // Shadow
        ctx.save();
        ctx.shadowColor = online ? color + '40' : 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = isHovered ? 20 : 10;
        ctx.shadowOffsetY = 2;

        // Background
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, isSelected ? '#1a2a3a' : '#111318');
        grad.addColorStop(1, isSelected ? '#141e2a' : '#0a0b0e');
        ctx.fillStyle = grad;

        // Rounded rect
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Border
        ctx.strokeStyle = isSelected ? color : isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Status indicator bar at top
        ctx.fillStyle = online ? color : '#f87171';
        ctx.fillRect(x + 1, y + 1, w - 2, 3);

        // Icon (left side)
        ctx.font = '18px "Font Awesome 6 Free"';
        ctx.fillStyle = online ? color : '#666';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x + 12, y + h / 2 - 4);

        // Name
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = online ? '#e2e8f0' : '#666';
        ctx.textAlign = 'left';
        ctx.fillText(this._truncate(name, 16), x + 40, y + 22);

        // IP / sublabel
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(ip || '--', x + 40, y + 36);

        // Type label
        ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = online ? color + 'aa' : '#555';
        ctx.fillText(label || type, x + 40, y + 50);

        // Online dot
        ctx.beginPath();
        ctx.arc(x + w - 14, y + 16, 4, 0, Math.PI * 2);
        ctx.fillStyle = online ? '#4ade80' : '#f87171';
        ctx.fill();
    },

    _truncate(str, max) {
        return str && str.length > max ? str.substring(0, max - 1) + '\u2026' : (str || '');
    },

    // ════════════════════════════════════════════════════════════════
    // MOUSE INTERACTION
    // ════════════════════════════════════════════════════════════════
    _screenToWorld(ex, ey) {
        const rect = this._canvas.getBoundingClientRect();
        return {
            x: (ex - rect.left - this._pan.x) / this._zoom,
            y: (ey - rect.top - this._pan.y) / this._zoom,
        };
    },

    _hitTest(wx, wy) {
        // Reverse order so topmost (last drawn) is hit first
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const n = this._nodes[i];
            if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
                return n;
            }
        }
        return null;
    },

    _onMouseDown(e) {
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);
        const node = this._hitTest(x, y);

        if (node) {
            this._dragNode = node;
            this._dragOffset = { x: x - node.x, y: y - node.y };
            this._selectedNode = node;
            this._showInfoPanel(node);
            e.preventDefault();
        } else {
            // Pan
            this._panStart = { x: e.clientX - this._pan.x, y: e.clientY - this._pan.y };
            this._selectedNode = null;
            this._hideInfoPanel();
        }
        document.getElementById('topo-wrap')?.classList.add('dragging');
    },

    _onMouseMove(e) {
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);

        if (this._dragNode) {
            this._dragNode.x = x - this._dragOffset.x;
            this._dragNode.y = y - this._dragOffset.y;
            this._savePositions();
        } else if (this._panStart) {
            this._pan.x = e.clientX - this._panStart.x;
            this._pan.y = e.clientY - this._panStart.y;
        } else {
            this._hoveredNode = this._hitTest(x, y);
            this._canvas.style.cursor = this._hoveredNode ? 'pointer' : 'grab';
        }
    },

    _onMouseUp(e) {
        this._dragNode = null;
        this._panStart = null;
        document.getElementById('topo-wrap')?.classList.remove('dragging');
    },

    _onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.2, Math.min(3, this._zoom * delta));

        // Zoom towards mouse position
        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this._pan.x = mx - (mx - this._pan.x) * (newZoom / this._zoom);
        this._pan.y = my - (my - this._pan.y) * (newZoom / this._zoom);
        this._zoom = newZoom;

        const el = document.getElementById('topo-zoom');
        if (el) el.textContent = `${Math.round(this._zoom * 100)}%`;
    },

    _onDblClick(e) {
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);
        const node = this._hitTest(x, y);
        if (node) {
            // Navigate to the device's page
            const pageMap = { server: 'dashboard', processor: 'ledprocessor', camera: 'ptz', switch: 'netswitch', lighting: 'lighting', intercom: 'intercom', loadcell: 'loadcell' };
            const page = pageMap[node.type];
            if (page) HippoApp.navigate(page);
        }
    },

    // ════════════════════════════════════════════════════════════════
    // INFO PANEL
    // ════════════════════════════════════════════════════════════════
    _showInfoPanel(node) {
        const el = document.getElementById('topo-info');
        if (!el) return;

        const d = node.deviceRef || {};
        let rows = `
            <div class="topo-info-row"><span class="text-muted">Type</span><span>${node.label || node.type}</span></div>
            <div class="topo-info-row"><span class="text-muted">IP</span><span class="mono">${node.ip}</span></div>
            <div class="topo-info-row"><span class="text-muted">Status</span><span style="color:${node.online ? '#4ade80' : '#f87171'}">${node.online ? 'Online' : 'Offline'}</span></div>
        `;

        // Type-specific info
        if (node.type === 'switch' && d.status?.system) {
            const s = d.status.system;
            rows += `
                ${s.temperature != null ? `<div class="topo-info-row"><span class="text-muted">Temp</span><span>${s.temperature}°C</span></div>` : ''}
                ${s.cpu != null ? `<div class="topo-info-row"><span class="text-muted">CPU</span><span>${s.cpu}%</span></div>` : ''}
                ${s.memory != null ? `<div class="topo-info-row"><span class="text-muted">Memory</span><span>${s.memory}%</span></div>` : ''}
            `;
        } else if (node.type === 'loadcell') {
            rows += `<div class="topo-info-row"><span class="text-muted">Value</span><span class="mono">${d.value != null ? d.value.toFixed(1) : '--'} ${d.unit || 'kg'}</span></div>`;
        } else if (node.type === 'processor') {
            rows += `
                ${d._resolution ? `<div class="topo-info-row"><span class="text-muted">Resolution</span><span>${d._resolution}</span></div>` : ''}
                ${d._activeInput ? `<div class="topo-info-row"><span class="text-muted">Input</span><span>${d._activeInput}</span></div>` : ''}
            `;
        }

        // Connected to
        const connections = this._connections.filter(c => c.from === node.id || c.to === node.id);
        if (connections.length > 0) {
            rows += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1)">
                <span class="text-muted" style="font-size:10px">CONNECTIONS (${connections.length})</span>
            </div>`;
            connections.forEach(c => {
                const otherId = c.from === node.id ? c.to : c.from;
                const other = this._nodes.find(n => n.id === otherId);
                if (other) {
                    rows += `<div class="topo-info-row"><span style="color:${other.color}">\u25CF ${other.name}</span><span class="mono" style="font-size:9px">${other.ip}</span></div>`;
                }
            });
        }

        el.innerHTML = `
            <h4><span style="color:${node.color}">\u25CF</span> ${node.name}</h4>
            ${rows}
            <div style="margin-top:10px">
                <button class="btn btn-xs btn-primary" onclick="TopologyPage._navigateToDevice('${node.id}')" style="width:100%">
                    <i class="fas fa-external-link-alt"></i> Open Device Page
                </button>
            </div>
        `;
        el.style.display = 'block';
    },

    _hideInfoPanel() {
        const el = document.getElementById('topo-info');
        if (el) el.style.display = 'none';
    },

    _navigateToDevice(nodeId) {
        const node = this._nodes.find(n => n.id === nodeId);
        if (!node) return;
        const pageMap = { server: 'dashboard', processor: 'ledprocessor', camera: 'ptz', switch: 'netswitch', lighting: 'lighting', intercom: 'intercom', loadcell: 'loadcell' };
        HippoApp.navigate(pageMap[node.type] || 'dashboard');
    },

    // ════════════════════════════════════════════════════════════════
    // LAYOUT
    // ════════════════════════════════════════════════════════════════
    _autoLayout() {
        if (this._nodes.length === 0) return;

        // Group by type
        const groups = {};
        this._nodes.forEach(n => {
            if (!groups[n.type]) groups[n.type] = [];
            groups[n.type].push(n);
        });

        const typeOrder = ['switch', 'server', 'processor', 'camera', 'lighting', 'intercom', 'loadcell'];
        const centerX = 600;
        let currentY = 80;

        // Switches at the top center (they're the network backbone)
        const switches = groups['switch'] || [];
        switches.forEach((n, i) => {
            n.x = centerX - (switches.length * 200 / 2) + i * 200;
            n.y = currentY;
        });
        if (switches.length > 0) currentY += 140;

        // Servers in the next row
        const srvs = groups['server'] || [];
        srvs.forEach((n, i) => {
            n.x = centerX - (srvs.length * 200 / 2) + i * 200;
            n.y = currentY;
        });
        if (srvs.length > 0) currentY += 140;

        // Other types in rows below
        typeOrder.filter(t => t !== 'switch' && t !== 'server').forEach(type => {
            const nodes = groups[type] || [];
            if (nodes.length === 0) return;
            nodes.forEach((n, i) => {
                n.x = centerX - (nodes.length * 200 / 2) + i * 200;
                n.y = currentY;
            });
            currentY += 120;
        });

        this._savePositions();
    },

    _fitView() {
        if (this._nodes.length === 0) return;
        const padding = 80;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this._nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width);
            maxY = Math.max(maxY, n.y + n.height);
        });
        const contentW = maxX - minX + padding * 2;
        const contentH = maxY - minY + padding * 2;
        const canvasW = this._canvas?.clientWidth || 800;
        const canvasH = this._canvas?.clientHeight || 600;
        this._zoom = Math.min(canvasW / contentW, canvasH / contentH, 1.5);
        this._pan.x = (canvasW - contentW * this._zoom) / 2 - minX * this._zoom + padding * this._zoom;
        this._pan.y = (canvasH - contentH * this._zoom) / 2 - minY * this._zoom + padding * this._zoom;
        const el = document.getElementById('topo-zoom');
        if (el) el.textContent = `${Math.round(this._zoom * 100)}%`;
    },

    _zoomIn() { this._zoom = Math.min(3, this._zoom * 1.2); const el = document.getElementById('topo-zoom'); if (el) el.textContent = `${Math.round(this._zoom * 100)}%`; },
    _zoomOut() { this._zoom = Math.max(0.2, this._zoom / 1.2); const el = document.getElementById('topo-zoom'); if (el) el.textContent = `${Math.round(this._zoom * 100)}%`; },

    // ════════════════════════════════════════════════════════════════
    // POSITION PERSISTENCE
    // ════════════════════════════════════════════════════════════════
    _savePositions() {
        const positions = {};
        this._nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y }; });
        try { localStorage.setItem('luxor_topo_positions', JSON.stringify(positions)); } catch {}
    },

    _loadPositions() {
        try { return JSON.parse(localStorage.getItem('luxor_topo_positions') || '{}'); } catch { return {}; }
    },
};
