/**
 * Topology Page — Live network topology map showing all devices with draggable nodes and connection lines
 * Inspired by Luminex Araneo — devices drawn as realistic device shapes on a dark canvas
 * Supports manual connections: click "Connect" then click two nodes to link them
 */
const TopologyPage = {
    _nodes: [],          // { id, type, name, ip, online, x, y, width, height, icon, color, deviceRef, subtype, label }
    _connections: [],    // { from, to, color, manual }
    _manualConns: [],    // persisted manual connections [{ from, to }]
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
    _hasPositions: false,
    _infoPanelId: null,
    _zoomInfoId: null,

    // Manual connection mode
    _connectMode: false,
    _connectFrom: null,   // first node in manual connect

    render() {
        return `
        <style>
            .topo-page { display:flex; flex-direction:column; height:100%; background:#050508; overflow:hidden; }
            .topo-toolbar { display:flex; align-items:center; gap:10px; padding:8px 16px; background:var(--bg-secondary); border-bottom:1px solid var(--border); flex-shrink:0; }
            .topo-toolbar .btn { font-size:11px; padding:4px 10px; }
            .topo-toolbar .btn.connect-active { background:var(--green); color:#000; font-weight:700; }
            .topo-canvas-wrap { flex:1; position:relative; overflow:hidden; cursor:grab; }
            .topo-canvas-wrap.dragging { cursor:grabbing; }
            .topo-canvas-wrap.connect-mode { cursor:crosshair !important; }
            .topo-canvas { display:block; width:100%; height:100%; }
            .topo-info-panel { position:absolute; top:12px; right:12px; width:260px; background:rgba(15,15,20,0.92); border:1px solid var(--border); border-radius:var(--radius); padding:14px; font-size:11px; backdrop-filter:blur(8px); z-index:10; }
            .topo-info-panel h4 { font-size:13px; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
            .topo-info-row { display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
            .topo-info-row:last-child { border-bottom:none; }
            .topo-legend { position:absolute; bottom:12px; left:12px; display:flex; gap:14px; background:rgba(15,15,20,0.85); border:1px solid var(--border); border-radius:var(--radius); padding:8px 14px; font-size:10px; backdrop-filter:blur(8px); }
            .topo-legend-item { display:flex; align-items:center; gap:5px; color:var(--text-secondary); }
            .topo-legend-dot { width:10px; height:10px; border-radius:50%; }
            .topo-zoom-info { position:absolute; bottom:12px; right:12px; background:rgba(15,15,20,0.85); border:1px solid var(--border); border-radius:var(--radius); padding:6px 12px; font-size:10px; color:var(--text-muted); backdrop-filter:blur(8px); }
            .topo-connect-hint { position:absolute; top:12px; left:50%; transform:translateX(-50%); background:rgba(74,222,128,0.15); border:1px solid #4ade80; border-radius:var(--radius); padding:8px 18px; font-size:12px; color:#4ade80; backdrop-filter:blur(8px); font-weight:600; z-index:10; }
        </style>
        <div class="topo-page">
            <div class="topo-toolbar">
                <span style="font-weight:700;font-size:13px;letter-spacing:1px"><i class="fas fa-project-diagram" style="color:var(--blue)"></i> TOPOLOGY MAP</span>
                <div style="flex:1"></div>
                <button class="btn btn-sm" id="topo-connect-btn" onclick="TopologyPage._toggleConnectMode()"><i class="fas fa-link"></i> Connect</button>
                <button class="btn btn-sm" onclick="TopologyPage._clearManualConns()"><i class="fas fa-unlink"></i> Clear Links</button>
                <div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>
                <button class="btn btn-sm" onclick="TopologyPage._autoLayout()"><i class="fas fa-magic"></i> Auto Layout</button>
                <button class="btn btn-sm" onclick="TopologyPage._fitView()"><i class="fas fa-compress-arrows-alt"></i> Fit View</button>
                <button class="btn btn-sm" onclick="TopologyPage._zoomIn()"><i class="fas fa-search-plus"></i></button>
                <button class="btn btn-sm" onclick="TopologyPage._zoomOut()"><i class="fas fa-search-minus"></i></button>
                <button class="btn btn-sm" onclick="TopologyPage.syncDevices()"><i class="fas fa-sync"></i> Refresh</button>
            </div>
            <div class="topo-canvas-wrap" id="topo-wrap">
                <canvas class="topo-canvas" id="topo-canvas"></canvas>
                <div id="topo-info" class="topo-info-panel" style="display:none"></div>
                <div id="topo-connect-hint" class="topo-connect-hint" style="display:none">Click a device to start connection, then click the second device</div>
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
        this._hasPositions = false; // re-evaluate on each activation
        this._manualConns = this._loadManualConns();
        this._initCanvas();
        this.syncDevices();
        this._startRender();
        this._pollTimer = setInterval(() => this.syncDevices(), 5000);
    },

    onDeactivate() {
        this._isActive = false;
        this._connectMode = false;
        this._connectFrom = null;
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

        this._canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this._canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this._canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this._canvas.addEventListener('mouseleave', (e) => this._onMouseUp(e));
        this._canvas.addEventListener('wheel', (e) => this._onWheel(e));
        this._canvas.addEventListener('dblclick', (e) => this._onDblClick(e));
        this._canvas.addEventListener('contextmenu', (e) => this._onRightClick(e));

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
    // MANUAL CONNECTION MODE
    // ════════════════════════════════════════════════════════════════
    _toggleConnectMode() {
        this._connectMode = !this._connectMode;
        this._connectFrom = null;
        const btn = document.getElementById('topo-connect-btn');
        const hint = document.getElementById('topo-connect-hint');
        const wrap = document.getElementById('topo-wrap') || document.getElementById('dash-topo-wrap');
        if (this._connectMode) {
            if (btn) btn.classList.add('connect-active');
            if (hint) hint.style.display = 'block';
            if (wrap) wrap.classList.add('connect-mode');
        } else {
            if (btn) btn.classList.remove('connect-active');
            if (hint) hint.style.display = 'none';
            if (wrap) wrap.classList.remove('connect-mode');
        }
    },

    _addManualConnection(fromId, toId) {
        // Avoid duplicates
        const exists = this._manualConns.some(c =>
            (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
        );
        if (!exists) {
            this._manualConns.push({ from: fromId, to: toId });
            this._saveManualConns();
            this._rebuildConnections();
        }
    },

    _removeManualConnection(fromId, toId) {
        this._manualConns = this._manualConns.filter(c =>
            !((c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId))
        );
        this._saveManualConns();
        this._rebuildConnections();
    },

    _clearManualConns() {
        if (this._manualConns.length === 0) return;
        this._manualConns = [];
        this._saveManualConns();
        this._rebuildConnections();
    },

    _saveManualConns() {
        try { localStorage.setItem('luxor_topo_manual_conns', JSON.stringify(this._manualConns)); } catch {}
    },

    _loadManualConns() {
        try { return JSON.parse(localStorage.getItem('luxor_topo_manual_conns') || '[]'); } catch { return []; }
    },

    // ════════════════════════════════════════════════════════════════
    // DEVICE SYNC
    // ════════════════════════════════════════════════════════════════
    syncDevices() {
        const _load = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
        const savedPositions = this._loadPositions();
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

        servers.forEach(s => {
            const id = `srv-${s.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'server', name: s.name || typeLabels[s.type] || 'Server',
                ip: `${s.host}:${s.port}`, online: statuses[s.id]?.online || false,
                color: '#38bdf8', deviceRef: s,
                subtype: s.type, label: typeLabels[s.type] || s.type
            }, savedPositions);
        });

        ledProcs.forEach(p => {
            const id = `led-${p.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'processor', name: p.name || p.type,
                ip: `${p.host}:${p.port}`, online: p.online || p.virtual || false,
                color: '#a78bfa', deviceRef: p,
                label: p.type
            }, savedPositions);
        });

        ptzCams.forEach(c => {
            const id = `ptz-${c.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'camera', name: c.name || 'Camera',
                ip: c.ip || c.host || '--', online: c.connected || c.virtual || false,
                color: '#fbbf24', deviceRef: c,
                label: c.model || 'PTZ'
            }, savedPositions);
        });

        netSwitches.forEach(s => {
            const id = `sw-${s.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'switch', name: s.name || 'Switch',
                ip: s.ip || s.host || '--', online: s.connected || s.virtual || false,
                color: '#34d399', deviceRef: s,
                label: s.model || 'Network Switch'
            }, savedPositions);
        });

        lightConsoles.forEach(c => {
            const id = `lt-${c.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'lighting', name: c.name || 'Lighting',
                ip: c.ip || c.host || '--', online: c.connected || c.virtual || false,
                color: '#f472b6', deviceRef: c,
                label: c.model || c.type || 'Lighting'
            }, savedPositions);
        });

        intercoms.forEach(i => {
            const id = `ic-${i.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'intercom', name: i.name || 'Intercom',
                ip: i.ip || i.host || '--', online: i.connected || i.virtual || false,
                color: '#fb923c', deviceRef: i,
                label: i.model || 'Intercom'
            }, savedPositions);
        });

        loadCells.forEach(c => {
            const id = `lc-${c.id}`;
            seenIds.add(id);
            this._upsertNode(id, {
                type: 'loadcell', name: c.name || 'Load Cell',
                ip: c.address || '--', online: c.online || false,
                color: '#94a3b8', deviceRef: c,
                label: `${c.value != null ? c.value.toFixed(1) : '--'} ${c.unit || 'kg'}`
            }, savedPositions);
        });

        this._rebuildConnections();

        // Only auto-layout if no saved positions exist
        if (this._nodes.length > 0 && !this._hasPositions) {
            const savedPos = this._loadPositions();
            const hasSaved = Object.keys(savedPos).length > 0;
            if (hasSaved) {
                // Restore saved positions for all nodes
                this._nodes.forEach(n => {
                    if (savedPos[n.id]) {
                        n.x = savedPos[n.id].x;
                        n.y = savedPos[n.id].y;
                    }
                });
                this._fitView();
            } else {
                this._autoLayout();
                this._fitView();
            }
            this._hasPositions = true;
        }
    },

    _upsertNode(id, data, savedPositions) {
        let node = this._nodes.find(n => n.id === id);
        if (node) {
            Object.assign(node, data);
        } else {
            const pos = savedPositions[id];
            node = {
                id, ...data,
                x: pos?.x ?? 100 + Math.random() * 600,
                y: pos?.y ?? 100 + Math.random() * 400,
                width: 190, height: 80,
            };
            this._nodes.push(node);
        }
    },

    // ════════════════════════════════════════════════════════════════
    // CONNECTIONS — auto + manual merged
    // ════════════════════════════════════════════════════════════════
    _rebuildConnections() {
        this._connections = [];

        // Auto-connections by subnet
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

        Object.values(subnets).forEach(group => {
            if (group.length < 2) return;
            const sw = group.find(n => n.type === 'switch');
            if (sw) {
                group.forEach(n => {
                    if (n.id !== sw.id) {
                        this._connections.push({ from: sw.id, to: n.id, manual: false });
                    }
                });
            } else {
                for (let i = 1; i < group.length; i++) {
                    this._connections.push({ from: group[0].id, to: group[i].id, manual: false });
                }
            }
        });

        // Add manual connections
        this._manualConns.forEach(mc => {
            const exists = this._connections.some(c =>
                (c.from === mc.from && c.to === mc.to) || (c.from === mc.to && c.to === mc.from)
            );
            if (!exists) {
                this._connections.push({ from: mc.from, to: mc.to, manual: true });
            }
        });
    },

    // ════════════════════════════════════════════════════════════════
    // RENDERING
    // ════════════════════════════════════════════════════════════════
    _startRender() {
        const render = () => {
            if (!this._isActive) return;
            this._render();
            this._animFrame = requestAnimationFrame(render);
        };
        render();
    },

    _render() {
        const ctx = this._ctx;
        if (!ctx || !this._canvas) return;
        const w = this._canvas.clientWidth;
        const h = this._canvas.clientHeight;

        ctx.save();
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(this._pan.x, this._pan.y);
        ctx.scale(this._zoom, this._zoom);
        this._drawGrid(ctx, w, h);

        // Draw connection being created
        if (this._connectMode && this._connectFrom) {
            const from = this._connectFrom;
            const fx = from.x + from.width / 2;
            const fy = from.y + from.height / 2;
            if (this._mouseWorld) {
                ctx.save();
                ctx.strokeStyle = 'rgba(74,222,128,0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.lineTo(this._mouseWorld.x, this._mouseWorld.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

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

        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
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
        const isManual = conn.manual;

        // Glow
        if (online) {
            ctx.save();
            ctx.strokeStyle = isManual ? 'rgba(56,189,248,0.12)' : 'rgba(74,222,128,0.12)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.restore();
        }

        // Line
        const lineColor = online
            ? (isManual ? 'rgba(56,189,248,0.55)' : 'rgba(74,222,128,0.5)')
            : 'rgba(248,113,113,0.2)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = online ? 2 : 1;
        ctx.setLineDash(online ? [] : [5, 5]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // Port dots at endpoints
        if (online) {
            // From port
            const angle = Math.atan2(ty - fy, tx - fx);
            const fromEdge = this._edgePoint(from, angle);
            const toEdge = this._edgePoint(to, angle + Math.PI);

            ctx.fillStyle = isManual ? '#38bdf8' : '#4ade80';
            ctx.beginPath(); ctx.arc(fromEdge.x, fromEdge.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(toEdge.x, toEdge.y, 4, 0, Math.PI * 2); ctx.fill();

            // Animated data flow dot
            const t = (Date.now() % 3000) / 3000;
            const dx = fromEdge.x + (toEdge.x - fromEdge.x) * t;
            const dy = fromEdge.y + (toEdge.y - fromEdge.y) * t;
            ctx.fillStyle = isManual ? '#38bdf8' : '#4ade80';
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    },

    _edgePoint(node, angle) {
        // Find the point where a line from center at 'angle' exits the node rect
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        const hw = node.width / 2;
        const hh = node.height / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const scaleX = cos !== 0 ? hw / Math.abs(cos) : Infinity;
        const scaleY = sin !== 0 ? hh / Math.abs(sin) : Infinity;
        const scale = Math.min(scaleX, scaleY);
        return { x: cx + cos * scale, y: cy + sin * scale };
    },

    // ════════════════════════════════════════════════════════════════
    // DEVICE-SPECIFIC NODE RENDERING
    // ════════════════════════════════════════════════════════════════
    _drawNode(ctx, node) {
        const { x, y, width: w, height: h, name, ip, color, online, type, label } = node;
        const isHovered = this._hoveredNode?.id === node.id;
        const isSelected = this._selectedNode?.id === node.id;
        const isConnectTarget = this._connectMode && this._connectFrom && this._connectFrom.id !== node.id && isHovered;
        const isConnectSource = this._connectMode && this._connectFrom?.id === node.id;

        // Draw device-specific shape
        switch (type) {
            case 'switch':    this._drawSwitch(ctx, node, isHovered, isSelected); break;
            case 'server':    this._drawServer(ctx, node, isHovered, isSelected); break;
            case 'camera':    this._drawCamera(ctx, node, isHovered, isSelected); break;
            case 'processor': this._drawProcessor(ctx, node, isHovered, isSelected); break;
            case 'lighting':  this._drawLighting(ctx, node, isHovered, isSelected); break;
            case 'intercom':  this._drawIntercom(ctx, node, isHovered, isSelected); break;
            case 'loadcell':  this._drawLoadCell(ctx, node, isHovered, isSelected); break;
            default:          this._drawGenericNode(ctx, node, isHovered, isSelected); break;
        }

        // Connect-mode highlight
        if (isConnectTarget) {
            ctx.save();
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 3]);
            this._roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 10);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        if (isConnectSource) {
            ctx.save();
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 12;
            this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 10);
            ctx.stroke();
            ctx.restore();
        }
    },

    // --- SWITCH: Wide rack unit with port indicators ---
    _drawSwitch(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 210;
        const h = node.height = 72;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Port row (8 small port squares at the bottom)
        const portCount = 8;
        const portW = 12, portH = 8, portGap = 4;
        const portsStartX = x + (w - (portCount * (portW + portGap) - portGap)) / 2;
        const portsY = y + h - 18;
        for (let i = 0; i < portCount; i++) {
            const px = portsStartX + i * (portW + portGap);
            ctx.fillStyle = online ? (i < 5 ? '#4ade80' : '#1a3a2a') : '#333';
            ctx.fillRect(px, portsY, portW, portH);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, portsY, portW, portH);
        }

        // Status LEDs (2 small circles)
        ctx.fillStyle = online ? '#4ade80' : '#f87171';
        ctx.beginPath(); ctx.arc(x + 16, y + 16, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = online ? '#38bdf8' : '#555';
        ctx.beginPath(); ctx.arc(x + 26, y + 16, 3, 0, Math.PI * 2); ctx.fill();

        // Text
        this._drawNodeText(ctx, node, x + 38, y);
    },

    // --- SERVER: Tall rack unit with drive bays ---
    _drawServer(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 190;
        const h = node.height = 80;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Drive bays (2x2 grid on the left)
        const bayX = x + 10, bayY = y + 14;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const bx = bayX + col * 14;
                const by = bayY + row * 14;
                ctx.fillStyle = online ? '#1a2a3a' : '#1a1a1a';
                ctx.fillRect(bx, by, 11, 11);
                ctx.strokeStyle = online ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(bx, by, 11, 11);
                // Activity LED
                if (online) {
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath(); ctx.arc(bx + 5.5, by + 8, 1.5, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // Power LED
        ctx.fillStyle = online ? '#4ade80' : '#f87171';
        ctx.beginPath(); ctx.arc(x + 16, y + h - 14, 3, 0, Math.PI * 2); ctx.fill();

        // Text
        this._drawNodeText(ctx, node, x + 44, y);
    },

    // --- CAMERA: body with lens circle ---
    _drawCamera(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 190;
        const h = node.height = 80;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Lens (circle with rings)
        const lensX = x + 24, lensY = y + h / 2 - 2;
        ctx.strokeStyle = online ? color + '80' : '#444';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(lensX, lensY, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(lensX, lensY, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = online ? '#1a1a2a' : '#111';
        ctx.beginPath(); ctx.arc(lensX, lensY, 8, 0, Math.PI * 2); ctx.fill();
        // Lens highlight
        if (online) {
            ctx.fillStyle = color + '40';
            ctx.beginPath(); ctx.arc(lensX - 2, lensY - 2, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Tally light
        ctx.fillStyle = online ? '#f87171' : '#333';
        ctx.beginPath(); ctx.arc(x + w - 16, y + 14, 3, 0, Math.PI * 2); ctx.fill();

        // Text
        this._drawNodeText(ctx, node, x + 46, y);
    },

    // --- PROCESSOR: LED wall processor with output indicators ---
    _drawProcessor(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 190;
        const h = node.height = 80;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Output port indicators (4 small colored squares)
        const portY = y + h - 18;
        const colors = ['#f87171', '#4ade80', '#38bdf8', '#fbbf24'];
        for (let i = 0; i < 4; i++) {
            const px = x + 12 + i * 18;
            ctx.fillStyle = online ? colors[i] + '80' : '#333';
            ctx.fillRect(px, portY, 13, 8);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, portY, 13, 8);
        }

        // Pixel grid icon (small 3x3 grid representing LED wall)
        const gx = x + 12, gy = y + 14;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                ctx.fillStyle = online ? color + '60' : '#222';
                ctx.fillRect(gx + c * 8, gy + r * 8, 6, 6);
            }
        }

        // Text
        this._drawNodeText(ctx, node, x + 44, y);
    },

    // --- LIGHTING: Console shape with fader lines ---
    _drawLighting(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 190;
        const h = node.height = 80;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Fader channels (6 vertical lines with caps)
        const faderY = y + 14;
        for (let i = 0; i < 6; i++) {
            const fx = x + 12 + i * 6;
            const fh = 16 + Math.sin(i * 1.2) * 8;
            ctx.strokeStyle = online ? 'rgba(244,114,182,0.3)' : '#222';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(fx, faderY); ctx.lineTo(fx, faderY + 24); ctx.stroke();
            // Fader cap
            ctx.fillStyle = online ? color : '#444';
            ctx.fillRect(fx - 2, faderY + fh, 4, 4);
        }

        // Text
        this._drawNodeText(ctx, node, x + 52, y);
    },

    // --- INTERCOM: Speaker/headset shape ---
    _drawIntercom(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 190;
        const h = node.height = 80;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Headset icon (arc + mic)
        const hx = x + 22, hy = y + h / 2 - 4;
        ctx.strokeStyle = online ? color : '#555';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hx, hy, 12, Math.PI, 0); // headband
        ctx.stroke();
        // Ear cups
        ctx.fillStyle = online ? color + '60' : '#333';
        ctx.fillRect(hx - 14, hy - 2, 6, 12);
        ctx.fillRect(hx + 8, hy - 2, 6, 12);
        // Mic boom
        ctx.strokeStyle = online ? color + '80' : '#444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hx - 11, hy + 10);
        ctx.quadraticCurveTo(hx - 8, hy + 20, hx, hy + 18);
        ctx.stroke();
        // Mic tip
        ctx.fillStyle = online ? color : '#555';
        ctx.beginPath(); ctx.arc(hx, hy + 18, 2.5, 0, Math.PI * 2); ctx.fill();

        // Text
        this._drawNodeText(ctx, node, x + 44, y);
    },

    // --- LOAD CELL: Weight sensor shape ---
    _drawLoadCell(ctx, node, isHovered, isSelected) {
        const { x, y, color, online, name, ip, label } = node;
        const w = node.width = 190;
        const h = node.height = 80;

        this._drawNodeBg(ctx, node, isHovered, isSelected);

        // Shackle/hook shape
        const sx = x + 22, sy = y + 14;
        ctx.strokeStyle = online ? color : '#555';
        ctx.lineWidth = 2;
        // Top attachment
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 6); ctx.stroke();
        // Body rectangle
        ctx.fillStyle = online ? 'rgba(148,163,184,0.15)' : '#1a1a1a';
        ctx.strokeStyle = online ? color + '80' : '#444';
        ctx.lineWidth = 1.5;
        ctx.fillRect(sx - 8, sy + 6, 16, 22);
        ctx.strokeRect(sx - 8, sy + 6, 16, 22);
        // Strain gauge lines
        ctx.strokeStyle = online ? color + '50' : '#333';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy + 12); ctx.lineTo(sx + 4, sy + 16);
        ctx.moveTo(sx + 4, sy + 16); ctx.lineTo(sx - 4, sy + 20);
        ctx.moveTo(sx - 4, sy + 20); ctx.lineTo(sx + 4, sy + 24);
        ctx.stroke();
        // Bottom attachment
        ctx.strokeStyle = online ? color : '#555';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, sy + 28); ctx.lineTo(sx, sy + 36); ctx.stroke();
        // Hook
        ctx.beginPath();
        ctx.arc(sx, sy + 40, 4, 0, Math.PI);
        ctx.stroke();

        // Text
        this._drawNodeText(ctx, node, x + 44, y);
    },

    // --- Generic fallback ---
    _drawGenericNode(ctx, node, isHovered, isSelected) {
        this._drawNodeBg(ctx, node, isHovered, isSelected);
        this._drawNodeText(ctx, node, node.x + 14, node.y);
    },

    // --- Shared: background card ---
    _drawNodeBg(ctx, node, isHovered, isSelected) {
        const { x, y, width: w, height: h, color, online } = node;

        ctx.save();
        ctx.shadowColor = online ? color + '30' : 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = isHovered ? 24 : 12;
        ctx.shadowOffsetY = 2;

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, isSelected ? '#1a2a3a' : '#111318');
        grad.addColorStop(1, isSelected ? '#141e2a' : '#0a0b0e');
        ctx.fillStyle = grad;

        this._roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.restore();

        // Border
        ctx.strokeStyle = isSelected ? color : isHovered ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)';
        ctx.lineWidth = isSelected ? 2 : 1;
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.stroke();

        // Color accent bar at top
        ctx.fillStyle = online ? color : '#f87171';
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + 8, y); ctx.lineTo(x + w - 8, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + 3);
        ctx.lineTo(x, y + 3);
        ctx.quadraticCurveTo(x, y, x + 8, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Online dot
        ctx.beginPath();
        ctx.arc(x + w - 14, y + 16, 4, 0, Math.PI * 2);
        ctx.fillStyle = online ? '#4ade80' : '#f87171';
        ctx.fill();
        // Dot glow
        if (online) {
            ctx.save();
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(x + w - 14, y + 16, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#4ade80';
            ctx.fill();
            ctx.restore();
        }
    },

    // --- Shared: text labels ---
    _drawNodeText(ctx, node, textX, y) {
        const { name, ip, label, color, online, type } = node;
        const h = node.height;

        // Name
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = online ? '#e2e8f0' : '#666';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this._truncate(name, 18), textX, y + 12);

        // IP
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(ip || '--', textX, y + 28);

        // Type label
        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = online ? color + 'aa' : '#555';
        ctx.fillText(label || type, textX, y + 42);
    },

    _roundRect(ctx, x, y, w, h, r) {
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
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const n = this._nodes[i];
            if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
                return n;
            }
        }
        return null;
    },

    _hitTestConnection(wx, wy) {
        // Check if click is near a connection line (for right-click delete)
        for (const c of this._connections) {
            if (!c.manual) continue;
            const from = this._nodes.find(n => n.id === c.from);
            const to = this._nodes.find(n => n.id === c.to);
            if (!from || !to) continue;
            const fx = from.x + from.width / 2, fy = from.y + from.height / 2;
            const tx = to.x + to.width / 2, ty = to.y + to.height / 2;
            const dist = this._pointToLineDist(wx, wy, fx, fy, tx, ty);
            if (dist < 10) return c;
        }
        return null;
    },

    _pointToLineDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    },

    _onMouseDown(e) {
        if (e.button === 2) return; // right click handled separately

        const { x, y } = this._screenToWorld(e.clientX, e.clientY);
        const node = this._hitTest(x, y);

        // Connect mode
        if (this._connectMode) {
            if (node) {
                if (!this._connectFrom) {
                    this._connectFrom = node;
                    const hint = document.getElementById('topo-connect-hint');
                    if (hint) hint.textContent = `Connecting from "${node.name}" \u2014 click the target device`;
                } else if (node.id !== this._connectFrom.id) {
                    this._addManualConnection(this._connectFrom.id, node.id);
                    this._connectFrom = null;
                    const hint = document.getElementById('topo-connect-hint');
                    if (hint) hint.textContent = 'Connection added! Click another device to start a new connection, or click Connect to exit';
                }
            } else {
                // Cancel current connection
                this._connectFrom = null;
                const hint = document.getElementById('topo-connect-hint');
                if (hint) hint.textContent = 'Click a device to start connection, then click the second device';
            }
            e.preventDefault();
            return;
        }

        if (node) {
            this._dragNode = node;
            this._dragOffset = { x: x - node.x, y: y - node.y };
            this._selectedNode = node;
            this._showInfoPanel(node);
            e.preventDefault();
        } else {
            this._panStart = { x: e.clientX - this._pan.x, y: e.clientY - this._pan.y };
            this._selectedNode = null;
            this._hideInfoPanel();
        }
        const wrap = document.getElementById('topo-wrap') || document.getElementById('dash-topo-wrap');
        if (wrap) wrap.classList.add('dragging');
    },

    _onMouseMove(e) {
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);
        this._mouseWorld = { x, y };

        if (this._connectMode) {
            this._hoveredNode = this._hitTest(x, y);
            this._canvas.style.cursor = this._hoveredNode ? 'pointer' : 'crosshair';
            return;
        }

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
        const wrap = document.getElementById('topo-wrap') || document.getElementById('dash-topo-wrap');
        if (wrap) wrap.classList.remove('dragging');
    },

    _onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.2, Math.min(3, this._zoom * delta));

        const rect = this._canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this._pan.x = mx - (mx - this._pan.x) * (newZoom / this._zoom);
        this._pan.y = my - (my - this._pan.y) * (newZoom / this._zoom);
        this._zoom = newZoom;

        const el = document.getElementById(this._zoomInfoId || 'topo-zoom');
        if (el) el.textContent = `${Math.round(this._zoom * 100)}%`;
    },

    _onDblClick(e) {
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);
        const node = this._hitTest(x, y);
        if (node) {
            const pageMap = { server: 'dashboard', processor: 'ledprocessor', camera: 'ptz', switch: 'netswitch', lighting: 'lighting', intercom: 'intercom', loadcell: 'loadcell' };
            const page = pageMap[node.type];
            if (page) HippoApp.navigate(page);
        }
    },

    _onRightClick(e) {
        e.preventDefault();
        const { x, y } = this._screenToWorld(e.clientX, e.clientY);

        // Check if right-clicking a manual connection
        const conn = this._hitTestConnection(x, y);
        if (conn) {
            this._removeManualConnection(conn.from, conn.to);
            return;
        }

        // Right-click on a node in connect mode — cancel
        if (this._connectMode) {
            this._connectFrom = null;
            const hint = document.getElementById('topo-connect-hint');
            if (hint) hint.textContent = 'Click a device to start connection, then click the second device';
        }
    },

    // ════════════════════════════════════════════════════════════════
    // INFO PANEL
    // ════════════════════════════════════════════════════════════════
    _showInfoPanel(node) {
        const el = document.getElementById(this._infoPanelId || 'topo-info');
        if (!el) return;

        const d = node.deviceRef || {};
        let rows = `
            <div class="topo-info-row"><span class="text-muted">Type</span><span>${node.label || node.type}</span></div>
            <div class="topo-info-row"><span class="text-muted">IP</span><span class="mono">${node.ip}</span></div>
            <div class="topo-info-row"><span class="text-muted">Status</span><span style="color:${node.online ? '#4ade80' : '#f87171'}">${node.online ? 'Online' : 'Offline'}</span></div>
        `;

        if (node.type === 'switch' && d.status?.system) {
            const s = d.status.system;
            rows += `
                ${s.temperature != null ? `<div class="topo-info-row"><span class="text-muted">Temp</span><span>${s.temperature}\u00B0C</span></div>` : ''}
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

        const connections = this._connections.filter(c => c.from === node.id || c.to === node.id);
        if (connections.length > 0) {
            rows += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1)">
                <span class="text-muted" style="font-size:10px">CONNECTIONS (${connections.length})</span>
            </div>`;
            connections.forEach(c => {
                const otherId = c.from === node.id ? c.to : c.from;
                const other = this._nodes.find(n => n.id === otherId);
                if (other) {
                    const badge = c.manual ? ' <span style="font-size:8px;background:rgba(56,189,248,0.2);color:#38bdf8;padding:1px 4px;border-radius:3px;">MANUAL</span>' : '';
                    rows += `<div class="topo-info-row"><span style="color:${other.color}">\u25CF ${other.name}${badge}</span><span class="mono" style="font-size:9px">${other.ip}</span></div>`;
                }
            });
        }

        el.innerHTML = `
            <h4><span style="color:${node.color}">\u25CF</span> ${node.name}</h4>
            ${rows}
            <div style="margin-top:10px;display:flex;gap:6px;">
                <button class="btn btn-xs btn-primary" onclick="TopologyPage._navigateToDevice('${node.id}')" style="flex:1">
                    <i class="fas fa-external-link-alt"></i> Open
                </button>
                <button class="btn btn-xs btn-secondary" onclick="TopologyPage._removeDevice('${node.id}')" style="flex:1">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        el.style.display = 'block';
    },

    _hideInfoPanel() {
        const el = document.getElementById(this._infoPanelId || 'topo-info');
        if (el) el.style.display = 'none';
    },

    _navigateToDevice(nodeId) {
        const node = this._nodes.find(n => n.id === nodeId);
        if (!node) return;
        const pageMap = { server: 'dashboard', processor: 'ledprocessor', camera: 'ptz', switch: 'netswitch', lighting: 'lighting', intercom: 'intercom', loadcell: 'loadcell' };
        HippoApp.navigate(pageMap[node.type] || 'dashboard');
    },

    _removeDevice(nodeId) {
        this._nodes = this._nodes.filter(n => n.id !== nodeId);
        this._manualConns = this._manualConns.filter(c => c.from !== nodeId && c.to !== nodeId);
        this._saveManualConns();
        this._rebuildConnections();
        this._savePositions();
        this._hideInfoPanel();
        this._selectedNode = null;
    },

    // ════════════════════════════════════════════════════════════════
    // LAYOUT
    // ════════════════════════════════════════════════════════════════
    _autoLayout() {
        if (this._nodes.length === 0) return;

        const groups = {};
        this._nodes.forEach(n => {
            if (!groups[n.type]) groups[n.type] = [];
            groups[n.type].push(n);
        });

        const typeOrder = ['switch', 'server', 'processor', 'camera', 'lighting', 'intercom', 'loadcell'];
        const centerX = 600;
        let currentY = 80;

        const switches = groups['switch'] || [];
        switches.forEach((n, i) => {
            n.x = centerX - (switches.length * 240 / 2) + i * 240;
            n.y = currentY;
        });
        if (switches.length > 0) currentY += 140;

        const srvs = groups['server'] || [];
        srvs.forEach((n, i) => {
            n.x = centerX - (srvs.length * 220 / 2) + i * 220;
            n.y = currentY;
        });
        if (srvs.length > 0) currentY += 140;

        typeOrder.filter(t => t !== 'switch' && t !== 'server').forEach(type => {
            const nodes = groups[type] || [];
            if (nodes.length === 0) return;
            nodes.forEach((n, i) => {
                n.x = centerX - (nodes.length * 220 / 2) + i * 220;
                n.y = currentY;
            });
            currentY += 130;
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
        const el = document.getElementById(this._zoomInfoId || 'topo-zoom');
        if (el) el.textContent = `${Math.round(this._zoom * 100)}%`;
    },

    _zoomIn() { this._zoom = Math.min(3, this._zoom * 1.2); const el = document.getElementById(this._zoomInfoId || 'topo-zoom'); if (el) el.textContent = `${Math.round(this._zoom * 100)}%`; },
    _zoomOut() { this._zoom = Math.max(0.2, this._zoom / 1.2); const el = document.getElementById(this._zoomInfoId || 'topo-zoom'); if (el) el.textContent = `${Math.round(this._zoom * 100)}%`; },

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
