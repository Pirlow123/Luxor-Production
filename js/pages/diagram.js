/**
 * Diagram Builder — Drag-and-drop AV system diagram tool
 * Luxor Production
 */
const DiagramPage = (() => {

    // ================================================================
    // EQUIPMENT LIBRARY
    // ================================================================
    const CATEGORIES = [
        {
            id: 'media', label: 'Media Servers', icon: 'fa-server', color: '#00d4aa',
            items: [
                { id: 'hippotizer',  label: 'Hippotizer',       icon: 'fa-server',          color: '#00d4aa', ports: ['hdmi-out','hdmi-out','sdi-out','eth','dante'] },
                { id: 'disguise',    label: 'Disguise d3',      icon: 'fa-cube',             color: '#ec4899', ports: ['hdmi-out','sdi-out','sdi-out','eth','dante'] },
                { id: 'pixera',      label: 'Pixera',           icon: 'fa-layer-group',      color: '#06b6d4', ports: ['hdmi-out','sdi-out','eth','ndi'] },
                { id: 'resolume',    label: 'Resolume Arena',   icon: 'fa-film',             color: '#a855f7', ports: ['hdmi-out','sdi-out','eth','ndi'] },
                { id: 'vmix',        label: 'vMix',             icon: 'fa-video',            color: '#3b82f6', ports: ['hdmi-in','hdmi-out','sdi-in','sdi-out','eth','ndi'] },
                { id: 'casparcg',    label: 'CasparCG',         icon: 'fa-play-circle',      color: '#f97316', ports: ['sdi-out','sdi-out','eth','ndi'] },
                { id: 'obs',         label: 'OBS Studio',       icon: 'fa-broadcast-tower',  color: '#22c55e', ports: ['hdmi-in','hdmi-out','eth','ndi'] },
            ]
        },
        {
            id: 'led', label: 'LED Processors', icon: 'fa-microchip', color: '#ef4444',
            items: [
                { id: 'novastar',    label: 'Novastar MCTRL',   icon: 'fa-microchip', color: '#ef4444', ports: ['hdmi-in','dvi-in','eth-out','eth-out','eth-out','eth-out'] },
                { id: 'brompton',    label: 'Brompton Tessera',  icon: 'fa-microchip', color: '#8b5cf6', ports: ['hdmi-in','sdi-in','eth-out','eth-out'] },
                { id: 'helios',      label: 'Megapixel Helios',  icon: 'fa-microchip', color: '#f59e0b', ports: ['hdmi-in','sdi-in','sdi-in','eth-out','eth-out'] },
            ]
        },
        {
            id: 'display', label: 'Displays', icon: 'fa-tv', color: '#60a5fa',
            items: [
                { id: 'ledwall',     label: 'LED Wall',          icon: 'fa-th-large',  color: '#ef4444', ports: ['eth-in'] },
                { id: 'ledpanel',    label: 'LED Panel',         icon: 'fa-square',    color: '#f97316', ports: ['eth-in'] },
                { id: 'tv',          label: 'TV / Monitor',      icon: 'fa-tv',        color: '#3b82f6', ports: ['hdmi-in','hdmi-in'] },
                { id: 'projector',   label: 'Projector',         icon: 'fa-video',     color: '#8b5cf6', ports: ['hdmi-in','sdi-in','eth'] },
                { id: 'monitor',     label: 'Confidence Mon.',   icon: 'fa-desktop',   color: '#64748b', ports: ['hdmi-in','sdi-in'] },
            ]
        },
        {
            id: 'video', label: 'Video / Signal', icon: 'fa-exchange-alt', color: '#f59e0b',
            items: [
                { id: 'barco-e2',    label: 'Barco E2',          icon: 'fa-th-large',      color: '#ef4444', ports: ['hdmi-in','hdmi-in','sdi-in','sdi-in','hdmi-out','hdmi-out','sdi-out','sdi-out','eth'] },
                { id: 'barco-s3',    label: 'Barco S3-4K',       icon: 'fa-th-large',      color: '#ef4444', ports: ['hdmi-in','hdmi-in','sdi-in','hdmi-out','hdmi-out','eth'] },
                { id: 'analog-way',  label: 'Analog Way',        icon: 'fa-random',        color: '#0ea5e9', ports: ['hdmi-in','hdmi-in','sdi-in','hdmi-out','hdmi-out','eth'] },
                { id: 'sdi-router',  label: 'SDI Router',        icon: 'fa-sitemap',       color: '#22c55e', ports: ['sdi-in','sdi-in','sdi-in','sdi-in','sdi-out','sdi-out','sdi-out','sdi-out'] },
                { id: 'hdmi-split',  label: 'HDMI Splitter',     icon: 'fa-code-branch',   color: '#a855f7', ports: ['hdmi-in','hdmi-out','hdmi-out','hdmi-out','hdmi-out'] },
                { id: 'matrix',      label: 'Matrix Switcher',   icon: 'fa-border-all',    color: '#f59e0b', ports: ['hdmi-in','hdmi-in','hdmi-in','hdmi-in','hdmi-out','hdmi-out','hdmi-out','hdmi-out'] },
                { id: 'fiber-conv',  label: 'Fiber Converter',   icon: 'fa-bolt',          color: '#f97316', ports: ['sdi-in','fiber-out'] },
                { id: 'camera',      label: 'Camera',            icon: 'fa-camera',        color: '#6366f1', ports: ['hdmi-out','sdi-out'] },
                { id: 'capture',     label: 'Capture Card',      icon: 'fa-download',      color: '#0ea5e9', ports: ['hdmi-in','sdi-in','usb-out'] },
            ]
        },
        {
            id: 'audio', label: 'Audio Consoles', icon: 'fa-sliders-h', color: '#22c55e',
            items: [
                { id: 'digico-sd7',  label: 'DiGiCo SD7',       icon: 'fa-sliders-h', color: '#1e40af', ports: ['madi-in','madi-out','dante','eth','aes-in','aes-out'] },
                { id: 'digico-sd12', label: 'DiGiCo SD12',      icon: 'fa-sliders-h', color: '#1e40af', ports: ['madi-in','madi-out','dante','eth'] },
                { id: 'digico-sd5',  label: 'DiGiCo SD5',       icon: 'fa-sliders-h', color: '#1e40af', ports: ['madi-in','madi-out','dante','eth'] },
                { id: 'digico-q',    label: 'DiGiCo Quantum 7', icon: 'fa-sliders-h', color: '#1e40af', ports: ['madi-in','madi-out','dante','eth'] },
                { id: 'ah-sq',       label: 'A&H SQ-7',         icon: 'fa-sliders-h', color: '#dc2626', ports: ['dsnake','dante','eth','audio-out'] },
                { id: 'ah-dlive',    label: 'A&H dLive',        icon: 'fa-sliders-h', color: '#dc2626', ports: ['dsnake','dante','eth','audio-out'] },
                { id: 'yamaha-cl',   label: 'Yamaha CL5',       icon: 'fa-sliders-h', color: '#7c3aed', ports: ['dante','eth','audio-out'] },
                { id: 'yamaha-tf',   label: 'Yamaha TF5',       icon: 'fa-sliders-h', color: '#7c3aed', ports: ['dante','eth','audio-out'] },
                { id: 'midas-m32',   label: 'Midas M32',        icon: 'fa-sliders-h', color: '#d97706', ports: ['aes50','dante','eth','audio-out'] },
                { id: 'stagebox',    label: 'Stage Box',         icon: 'fa-hdd',       color: '#64748b', ports: ['dsnake','dante','audio-in','audio-in','audio-in','audio-in'] },
                { id: 'speaker',     label: 'Speaker / PA',     icon: 'fa-volume-up',  color: '#059669', ports: ['audio-in'] },
                { id: 'monitor-wedge', label: 'Stage Monitor',  icon: 'fa-volume-down', color: '#64748b', ports: ['audio-in'] },
                { id: 'iem',         label: 'IEM System',        icon: 'fa-headphones', color: '#7c3aed', ports: ['audio-in','audio-in'] },
                { id: 'microphone',  label: 'Microphone',        icon: 'fa-microphone', color: '#475569', ports: ['audio-out'] },
                { id: 'wireless-mic', label: 'Wireless Mic Rx', icon: 'fa-wifi',       color: '#475569', ports: ['audio-out','audio-out','dante'] },
            ]
        },
        {
            id: 'lighting', label: 'Lighting Desks', icon: 'fa-lightbulb', color: '#facc15',
            items: [
                { id: 'ma3',         label: 'grandMA3',          icon: 'fa-lightbulb', color: '#ca8a04', ports: ['dmx-out','dmx-out','artnet','sacn','eth'] },
                { id: 'ma3-light',   label: 'grandMA3 Light',    icon: 'fa-lightbulb', color: '#ca8a04', ports: ['dmx-out','artnet','sacn','eth'] },
                { id: 'ma2',         label: 'grandMA2',          icon: 'fa-lightbulb', color: '#ca8a04', ports: ['dmx-out','dmx-out','artnet','eth'] },
                { id: 'avo-arena',   label: 'Avolites Arena',    icon: 'fa-lightbulb', color: '#0284c7', ports: ['dmx-out','dmx-out','artnet','sacn','eth'] },
                { id: 'avo-tiger',   label: 'Avo Tiger Touch',   icon: 'fa-lightbulb', color: '#0284c7', ports: ['dmx-out','artnet','eth'] },
                { id: 'avo-sapphire', label: 'Avo Sapphire',    icon: 'fa-lightbulb', color: '#0284c7', ports: ['dmx-out','dmx-out','artnet','sacn','eth'] },
                { id: 'etc-eos',     label: 'ETC Eos',           icon: 'fa-lightbulb', color: '#65a30d', ports: ['dmx-out','dmx-out','sacn','eth'] },
                { id: 'etc-ion',     label: 'ETC Ion',           icon: 'fa-lightbulb', color: '#65a30d', ports: ['dmx-out','sacn','eth'] },
                { id: 'dmx-node',    label: 'DMX Node',          icon: 'fa-project-diagram', color: '#f59e0b', ports: ['artnet','sacn','dmx-out','dmx-out','dmx-out','dmx-out'] },
                { id: 'fixture',     label: 'Light Fixture',     icon: 'fa-sun',       color: '#eab308', ports: ['dmx-in'] },
                { id: 'moving-head', label: 'Moving Head',       icon: 'fa-circle-notch', color: '#eab308', ports: ['dmx-in'] },
                { id: 'led-bar',     label: 'LED Bar / Wash',    icon: 'fa-grip-lines', color: '#eab308', ports: ['dmx-in'] },
            ]
        },
        {
            id: 'network', label: 'Network / Infra', icon: 'fa-network-wired', color: '#94a3b8',
            items: [
                { id: 'switch',      label: 'Network Switch',    icon: 'fa-network-wired', color: '#475569', ports: ['eth','eth','eth','eth','eth','eth','eth','eth'] },
                { id: 'switch-poe',  label: 'PoE Switch',        icon: 'fa-network-wired', color: '#0ea5e9', ports: ['eth','eth','eth','eth','eth','eth'] },
                { id: 'router',      label: 'Router',            icon: 'fa-wifi',      color: '#6366f1', ports: ['eth','eth','eth','eth'] },
                { id: 'lmx-giga',    label: 'Luminex GigaCore',  icon: 'fa-network-wired', color: '#e94e1b', ports: ['eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','fiber-out','fiber-out'] },
                { id: 'lmx-i30',     label: 'Luminex I30',       icon: 'fa-network-wired', color: '#e94e1b', ports: ['eth','eth','eth','eth','fiber-out','fiber-out'] },
                { id: 'lmx-luminode', label: 'Luminex LumiNode', icon: 'fa-project-diagram', color: '#e94e1b', ports: ['eth','eth','artnet','sacn','dmx-out','dmx-out','dmx-out','dmx-out'] },
                { id: 'lmx-luminode12', label: 'LumiNode 12',   icon: 'fa-project-diagram', color: '#e94e1b', ports: ['eth','eth','artnet','sacn','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out'] },
                { id: 'lmx-luminode4', label: 'LumiNode 4',     icon: 'fa-project-diagram', color: '#e94e1b', ports: ['eth','artnet','sacn','dmx-out','dmx-out','dmx-out','dmx-out'] },
                { id: 'lmx-lumicore', label: 'Luminex LumiCore', icon: 'fa-server',   color: '#e94e1b', ports: ['eth','eth','artnet','sacn','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out','dmx-out'] },
                { id: 'lmx-gigacore10', label: 'GigaCore 10',   icon: 'fa-network-wired', color: '#e94e1b', ports: ['eth','eth','eth','eth','eth','eth','eth','eth','fiber-out','fiber-out'] },
                { id: 'lmx-gigacore14r', label: 'GigaCore 14R', icon: 'fa-network-wired', color: '#e94e1b', ports: ['eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','fiber-out','fiber-out'] },
                { id: 'lmx-gigacore16xt', label: 'GigaCore 16Xt', icon: 'fa-network-wired', color: '#e94e1b', ports: ['eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','fiber-out','fiber-out'] },
                { id: 'lmx-gigacore26i', label: 'GigaCore 26i', icon: 'fa-network-wired', color: '#e94e1b', ports: ['eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','eth','fiber-out','fiber-out'] },
                { id: 'artnet-node', label: 'Art-Net Node',      icon: 'fa-project-diagram', color: '#f59e0b', ports: ['eth','artnet','dmx-out','dmx-out'] },
                { id: 'sacn-node',   label: 'sACN Gateway',      icon: 'fa-project-diagram', color: '#a855f7', ports: ['eth','sacn','dmx-out','dmx-out'] },
                { id: 'dante-avio',  label: 'Dante AVIO',        icon: 'fa-exchange-alt', color: '#dc2626', ports: ['dante','audio-in','audio-out'] },
                { id: 'ndi-conv',    label: 'NDI Converter',     icon: 'fa-exchange-alt', color: '#22c55e', ports: ['ndi','hdmi-in','hdmi-out'] },
                { id: 'laptop',      label: 'Laptop',            icon: 'fa-laptop',    color: '#64748b', ports: ['hdmi-out','eth','usb-out','ndi'] },
                { id: 'tablet',      label: 'Tablet / iPad',     icon: 'fa-tablet-alt', color: '#64748b', ports: ['eth'] },
                { id: 'qlab-mac',    label: 'QLab Mac',          icon: 'fa-apple-alt',  color: '#8b5cf6', ports: ['eth','audio-out','audio-out'] },
            ]
        },
    ];

    // Cable / connection types
    const CABLE_TYPES = {
        'hdmi':    { label: 'HDMI',             color: '#3b82f6', dash: false },
        'sdi':     { label: 'SDI',              color: '#22c55e', dash: false },
        'eth':     { label: 'Ethernet',         color: '#f59e0b', dash: false },
        'fiber':   { label: 'Fiber Optic',      color: '#f97316', dash: false },
        'audio':   { label: 'Audio Cable',      color: '#06b6d4', dash: false },
        'dmx':     { label: 'DMX',              color: '#a855f7', dash: false },
        'artnet':  { label: 'Art-Net',          color: '#ef4444', dash: [6,3] },
        'sacn':    { label: 'sACN',             color: '#ec4899', dash: [6,3] },
        'dante':   { label: 'Dante / AoIP',     color: '#dc2626', dash: false },
        'ndi':     { label: 'NDI',              color: '#14b8a6', dash: [8,4] },
        'madi':    { label: 'MADI',             color: '#1e40af', dash: false },
        'aes':     { label: 'AES/EBU',          color: '#7c3aed', dash: false },
        'dsnake':  { label: 'dSNAKE',           color: '#9333ea', dash: false },
        'aes50':   { label: 'AES50',            color: '#d97706', dash: false },
        'usb':     { label: 'USB',              color: '#64748b', dash: [4,2] },
    };

    // Port type to cable mapping
    const PORT_CABLE = {
        'hdmi-in': 'hdmi', 'hdmi-out': 'hdmi', 'dvi-in': 'hdmi',
        'sdi-in': 'sdi', 'sdi-out': 'sdi',
        'eth': 'eth', 'eth-in': 'eth', 'eth-out': 'eth',
        'fiber-out': 'fiber', 'fiber-in': 'fiber',
        'audio-in': 'audio', 'audio-out': 'audio',
        'dmx-in': 'dmx', 'dmx-out': 'dmx',
        'artnet': 'artnet', 'sacn': 'sacn',
        'dante': 'dante', 'ndi': 'ndi',
        'madi-in': 'madi', 'madi-out': 'madi',
        'aes-in': 'aes', 'aes-out': 'aes',
        'dsnake': 'dsnake', 'aes50': 'aes50',
        'usb-out': 'usb', 'usb-in': 'usb',
    };

    // ================================================================
    // STATE
    // ================================================================
    let _nodes = [];          // { id, itemId, label, x, y, w, h, color, icon, ports[] }
    let _connections = [];    // { id, fromNode, fromPort, toNode, toPort, cableType }
    let _nextId = 1;
    let _nextConnId = 1;
    let _selectedNode = null;
    let _selectedConn = null;
    let _dragging = null;     // { nodeId, offsetX, offsetY }
    let _connecting = null;   // { fromNode, fromPort, x, y }
    let _zoom = 1;
    let _panX = 0, _panY = 0;
    let _isPanning = false;
    let _panStart = null;
    let _cableCategory = null;  // sidebar filter
    let _searchFilter = '';
    let _showGrid = true;
    let _snapToGrid = true;
    let _gridSize = 20;
    let _diagramName = 'Untitled Diagram';
    let _collapsed = {};  // category collapse state
    let _routeMode = 'ortho'; // 'ortho' (90-degree) or 'curve' (bezier)

    // ================================================================
    // CSS
    // ================================================================
    const CSS = `
.diagram-wrap{display:flex;height:100%;overflow:hidden;background:var(--bg-primary);position:relative;}
.diagram-palette{width:260px;flex-shrink:0;background:var(--bg-secondary);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;z-index:10;}
.diagram-palette-header{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.diagram-palette-header input{flex:1;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--text-primary);outline:none;}
.diagram-palette-header input:focus{border-color:var(--accent);}
.diagram-palette-body{flex:1;overflow-y:auto;padding:8px;}
.diagram-cat{margin-bottom:4px;}
.diagram-cat-head{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;transition:background 0.1s;}
.diagram-cat-head:hover{background:rgba(255,255,255,0.04);}
.diagram-cat-head i.cat-icon{font-size:10px;width:14px;text-align:center;}
.diagram-cat-head .cat-arrow{margin-left:auto;font-size:8px;transition:transform 0.2s;}
.diagram-cat-head .cat-arrow.open{transform:rotate(90deg);}
.diagram-cat-items{padding:2px 0 2px 8px;}
.diagram-eq-item{display:flex;align-items:center;gap:8px;padding:6px 10px;margin:2px 0;border-radius:6px;cursor:grab;font-size:11px;color:var(--text-primary);border:1px solid transparent;transition:all 0.1s;user-select:none;}
.diagram-eq-item:hover{background:rgba(255,255,255,0.05);border-color:var(--border);}
.diagram-eq-item:active{cursor:grabbing;opacity:0.7;}
.diagram-eq-item .eq-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.diagram-eq-item .eq-icon{font-size:12px;width:16px;text-align:center;flex-shrink:0;}

.diagram-canvas-wrap{flex:1;position:relative;overflow:hidden;cursor:default;}
.diagram-canvas{position:absolute;top:0;left:0;width:6000px;height:4000px;transform-origin:0 0;}
.diagram-grid-bg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.08;}
.diagram-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;}
.diagram-svg line,.diagram-svg path{pointer-events:stroke;cursor:pointer;}
.diagram-svg .conn-line:hover{stroke-width:4 !important;filter:drop-shadow(0 0 4px currentColor);}
.diagram-svg .conn-line.selected{stroke-width:4 !important;filter:drop-shadow(0 0 6px currentColor);}
.diagram-svg .conn-temp{pointer-events:none;opacity:0.6;stroke-dasharray:6 4;}

.diagram-node{position:absolute;min-width:120px;background:var(--bg-secondary);border:2px solid var(--border);border-radius:10px;cursor:move;user-select:none;z-index:2;transition:box-shadow 0.15s;}
.diagram-node:hover{box-shadow:0 0 0 1px rgba(255,255,255,0.1),0 4px 16px rgba(0,0,0,0.3);}
.diagram-node.selected{border-color:var(--accent);box-shadow:0 0 0 2px rgba(0,212,170,0.3),0 4px 20px rgba(0,0,0,0.4);}
.diagram-node-header{padding:8px 10px 4px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.05);}
.diagram-node-header i{font-size:14px;}
.diagram-node-header .node-label{font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.diagram-node-header .node-delete{font-size:10px;color:var(--text-muted);cursor:pointer;opacity:0;transition:opacity 0.15s;padding:2px;}
.diagram-node:hover .node-delete{opacity:1;}
.diagram-node-header .node-delete:hover{color:var(--danger);}
.diagram-node-ports{display:flex;justify-content:space-between;padding:6px 4px 8px;}
.diagram-node-ports-col{display:flex;flex-direction:column;gap:4px;}
.diagram-port{display:flex;align-items:center;gap:4px;cursor:crosshair;padding:2px 6px;border-radius:4px;transition:background 0.1s;position:relative;}
.diagram-port:hover{background:rgba(255,255,255,0.08);}
.diagram-port .port-dot{width:10px;height:10px;border-radius:50%;border:2px solid;flex-shrink:0;transition:all 0.15s;box-sizing:border-box;}
.diagram-port:hover .port-dot{transform:scale(1.3);box-shadow:0 0 6px currentColor;}
.diagram-port .port-label{font-size:9px;color:var(--text-muted);white-space:nowrap;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;}
.diagram-port.port-left .port-dot{order:-1;}
.diagram-port.port-right{flex-direction:row-reverse;}
.diagram-port.port-right .port-label{text-align:right;}

.diagram-toolbar{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:20;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.3);}
.diagram-toolbar button{background:none;border:1px solid transparent;color:var(--text-secondary);cursor:pointer;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:6px;transition:all 0.1s;white-space:nowrap;}
.diagram-toolbar button:hover{background:rgba(255,255,255,0.06);color:var(--text-primary);}
.diagram-toolbar button.active{background:rgba(0,212,170,0.12);color:var(--accent);border-color:rgba(0,212,170,0.3);}
.diagram-toolbar .tb-sep{width:1px;background:var(--border);margin:0 2px;}

.diagram-props{width:240px;flex-shrink:0;background:var(--bg-secondary);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;z-index:10;}
.diagram-props-header{padding:12px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;}
.diagram-props-body{flex:1;overflow-y:auto;padding:12px;}
.diagram-props .prop-row{margin-bottom:10px;}
.diagram-props .prop-label{font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;}
.diagram-props .prop-val{font-size:12px;color:var(--text-primary);}

.diagram-legend{position:absolute;bottom:12px;right:12px;z-index:20;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,0.3);max-height:300px;overflow-y:auto;}
.diagram-legend h4{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
.diagram-legend-item{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:10px;color:var(--text-secondary);}
.diagram-legend-item .leg-line{width:24px;height:3px;border-radius:1px;}

.diagram-zoom{position:absolute;bottom:12px;left:12px;z-index:20;display:flex;gap:4px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,0.3);}
.diagram-zoom button{background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:4px 8px;border-radius:4px;font-size:12px;transition:all 0.1s;}
.diagram-zoom button:hover{background:rgba(255,255,255,0.08);color:var(--text-primary);}
.diagram-zoom .zoom-label{font-size:10px;color:var(--text-muted);padding:4px 6px;min-width:40px;text-align:center;}

.diagram-drop-ghost{position:fixed;pointer-events:none;z-index:9999;opacity:0.8;padding:8px 14px;background:var(--bg-secondary);border:2px solid var(--accent);border-radius:8px;font-size:11px;font-weight:700;color:var(--accent);display:none;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.4);}
`;

    // ================================================================
    // RENDER
    // ================================================================
    function render() {
        return `
            <style>${CSS}</style>
            <div class="diagram-wrap" id="diagram-wrap">
                <!-- Palette -->
                <div class="diagram-palette" id="diagram-palette">
                    <div class="diagram-palette-header">
                        <i class="fas fa-shapes" style="color:var(--accent);font-size:13px;"></i>
                        <input type="text" id="diagram-search" placeholder="Search equipment..." oninput="DiagramPage.onSearch(this.value)">
                    </div>
                    <div class="diagram-palette-body" id="diagram-palette-body">
                        ${_renderPalette()}
                    </div>
                </div>

                <!-- Canvas -->
                <div class="diagram-canvas-wrap" id="diagram-canvas-wrap">
                    <!-- Toolbar -->
                    <div class="diagram-toolbar">
                        <button onclick="DiagramPage.newDiagram()" title="New Diagram"><i class="fas fa-file"></i> New</button>
                        <button onclick="DiagramPage.saveDiagram()" title="Save Diagram"><i class="fas fa-save"></i> Save</button>
                        <button onclick="DiagramPage.loadDiagram()" title="Load Diagram"><i class="fas fa-folder-open"></i> Load</button>
                        <div class="tb-sep"></div>
                        <button class="${_showGrid ? 'active' : ''}" onclick="DiagramPage.toggleGrid()" title="Toggle Grid"><i class="fas fa-border-all"></i> Grid</button>
                        <button class="${_snapToGrid ? 'active' : ''}" onclick="DiagramPage.toggleSnap()" title="Toggle Snap"><i class="fas fa-magnet"></i> Snap</button>
                        <button class="${_routeMode === 'ortho' ? 'active' : ''}" onclick="DiagramPage.toggleRoute()" title="Toggle 90° / Curved lines"><i class="fas fa-${_routeMode === 'ortho' ? 'draw-polygon' : 'bezier-curve'}"></i> ${_routeMode === 'ortho' ? '90°' : 'Curve'}</button>
                        <div class="tb-sep"></div>
                        <button onclick="DiagramPage.exportPNG()" title="Export as PNG"><i class="fas fa-image"></i> Export</button>
                        <button onclick="DiagramPage.exportDatasheet()" title="Export Equipment Datasheet"><i class="fas fa-file-alt"></i> Datasheet</button>
                        <button onclick="DiagramPage.pingAllNodes()" title="Ping All Servers"><i class="fas fa-satellite-dish"></i></button>
                        <button onclick="DiagramPage.selectAll()" title="Select All"><i class="fas fa-object-group"></i></button>
                        <button onclick="DiagramPage.deleteSelected()" title="Delete Selected"><i class="fas fa-trash"></i></button>
                    </div>

                    <div class="diagram-canvas" id="diagram-canvas" style="transform:scale(${_zoom}) translate(${_panX}px,${_panY}px);">
                        ${_showGrid ? '<div class="diagram-grid-bg" id="diagram-grid"></div>' : ''}
                        <svg class="diagram-svg" id="diagram-svg" xmlns="http://www.w3.org/2000/svg"></svg>
                        <div id="diagram-nodes"></div>
                    </div>

                    <!-- Zoom -->
                    <div class="diagram-zoom">
                        <button onclick="DiagramPage.zoomIn()" title="Zoom In"><i class="fas fa-plus"></i></button>
                        <span class="zoom-label" id="diagram-zoom-label">${Math.round(_zoom * 100)}%</span>
                        <button onclick="DiagramPage.zoomOut()" title="Zoom Out"><i class="fas fa-minus"></i></button>
                        <button onclick="DiagramPage.zoomFit()" title="Zoom to Fit"><i class="fas fa-compress-arrows-alt"></i></button>
                        <button onclick="DiagramPage.zoomReset()" title="Reset Zoom"><i class="fas fa-expand"></i></button>
                    </div>

                    <!-- Legend -->
                    <div class="diagram-legend" id="diagram-legend">
                        <h4><i class="fas fa-palette"></i> Cable Types</h4>
                        ${Object.entries(CABLE_TYPES).map(([k, v]) =>
                            `<div class="diagram-legend-item">
                                <div class="leg-line" style="background:${v.color};${v.dash ? 'background:repeating-linear-gradient(90deg,'+v.color+' 0,'+v.color+' 6px,transparent 6px,transparent 10px);' : ''}"></div>
                                <span>${v.label}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>

                <!-- Properties panel -->
                <div class="diagram-props" id="diagram-props">
                    <div class="diagram-props-header"><i class="fas fa-info-circle"></i> Properties</div>
                    <div class="diagram-props-body" id="diagram-props-body">
                        ${_renderProps()}
                    </div>
                </div>
            </div>
            <div class="diagram-drop-ghost" id="diagram-drop-ghost"></div>
        `;
    }

    function _renderPalette() {
        const q = _searchFilter.toLowerCase();
        // Active Servers section
        const servers = typeof appState !== 'undefined' ? appState.get('servers') || [] : [];
        const statuses = typeof appState !== 'undefined' ? appState.get('serverStatuses') || {} : {};
        let activeSection = '';
        if (servers.length > 0 && (!q || 'active server connected'.includes(q))) {
            const serverItems = servers.map(s => {
                const st = statuses[s.id];
                const online = st?.online;
                const type = s.type || 'hippo';
                const typeMap = { hippo: 'hippotizer', resolume: 'resolume', vmix: 'vmix', casparcg: 'casparcg', obs: 'obs', barco: 'barco-e2', qlab: 'qlab-mac', disguise: 'disguise', pixera: 'pixera' };
                const itemId = typeMap[type] || type;
                const item = _findItem(itemId);
                const icon = item?.icon || 'fa-server';
                const color = item?.color || '#00d4aa';
                return `<div class="diagram-eq-item" draggable="true"
                    ondragstart="DiagramPage.onDragStart(event,'${itemId}')"
                    ondragend="DiagramPage.onDragEnd(event)"
                    data-server-id="${s.id}"
                    title="${s.name} — ${online ? 'Online' : 'Offline'}${st?.info?.version ? ' — v' + st.info.version : ''}">
                    <span style="width:8px;height:8px;border-radius:50%;background:${online ? '#4ade80' : '#ef4444'};flex-shrink:0;box-shadow:0 0 4px ${online ? '#4ade8080' : '#ef444480'};"></span>
                    <i class="eq-icon fas ${icon}" style="color:${color};"></i>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${_esc(s.name)}</span>
                    <span style="font-size:8px;font-weight:700;color:${online ? '#4ade80' : '#ef4444'};">${online ? 'ON' : 'OFF'}</span>
                </div>`;
            }).join('');
            activeSection = `<div class="diagram-cat">
                <div class="diagram-cat-head" onclick="DiagramPage.toggleCategory('_active')" style="color:var(--accent);">
                    <i class="cat-icon fas fa-plug" style="color:var(--accent);"></i>
                    Active Servers
                    <span class="text-muted" style="font-size:9px;">${servers.length}</span>
                    <i class="cat-arrow fas fa-chevron-right ${!_collapsed['_active'] ? 'open' : ''}"></i>
                </div>
                ${!_collapsed['_active'] ? `<div class="diagram-cat-items">${serverItems}</div>` : ''}
            </div>
            <div style="height:1px;background:var(--border);margin:8px 0;"></div>`;
        }

        return activeSection + CATEGORIES.map(cat => {
            const filtered = q ? cat.items.filter(it => it.label.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)) : cat.items;
            if (filtered.length === 0) return '';
            const open = !_collapsed[cat.id];
            return `<div class="diagram-cat">
                <div class="diagram-cat-head" onclick="DiagramPage.toggleCategory('${cat.id}')">
                    <i class="cat-icon fas ${cat.icon}" style="color:${cat.color};"></i>
                    ${cat.label}
                    <span class="text-muted" style="font-size:9px;">${filtered.length}</span>
                    <i class="cat-arrow fas fa-chevron-right ${open ? 'open' : ''}"></i>
                </div>
                ${open ? `<div class="diagram-cat-items">
                    ${filtered.map(item => `
                        <div class="diagram-eq-item" draggable="true"
                             ondragstart="DiagramPage.onDragStart(event,'${item.id}')"
                             ondragend="DiagramPage.onDragEnd(event)">
                            <div class="eq-dot" style="background:${item.color};"></div>
                            <i class="eq-icon fas ${item.icon}" style="color:${item.color};"></i>
                            <span>${item.label}</span>
                        </div>
                    `).join('')}
                </div>` : ''}
            </div>`;
        }).join('');
    }

    function _renderProps() {
        if (_selectedNode != null) {
            const node = _nodes.find(n => n.id === _selectedNode);
            if (!node) return _emptyProps();
            const connCount = _connections.filter(c => c.fromNode === node.id || c.toNode === node.id).length;
            return `
                <div class="prop-row">
                    <div class="prop-label">Name</div>
                    <input class="form-control" style="font-size:12px;padding:6px 8px;" value="${_esc(node.label)}" onchange="DiagramPage.renameNode(${node.id}, this.value)">
                </div>
                <div class="prop-row">
                    <div class="prop-label">Type</div>
                    <div class="prop-val"><i class="fas ${node.icon}" style="color:${node.color};margin-right:6px;"></i>${_esc(node.itemId)}</div>
                </div>
                <div class="prop-row">
                    <div class="prop-label">Position</div>
                    <div class="prop-val mono" style="font-size:10px;">X: ${Math.round(node.x)} &nbsp; Y: ${Math.round(node.y)}</div>
                </div>
                <div class="prop-row">
                    <div class="prop-label" style="display:flex;align-items:center;justify-content:space-between;">
                        <span>Ports (${node.ports.length})</span>
                        <button class="btn btn-sm" style="font-size:9px;padding:1px 6px;line-height:1.4;" onclick="DiagramPage.togglePortEditor(${node.id})"><i class="fas fa-pen"></i> Edit</button>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                        ${node.ports.map(p => {
                            const cable = CABLE_TYPES[PORT_CABLE[p.type]] || {};
                            return `<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);border:1px solid ${cable.color || 'var(--border)'}40;color:${cable.color || 'var(--text-muted)'};">${p.type}</span>`;
                        }).join('')}
                    </div>
                </div>
                <div id="port-editor-${node.id}" style="display:none;">
                    <div class="prop-row">
                        <div style="display:flex;flex-direction:column;gap:3px;">
                            ${node.ports.map(p => {
                                const cable = CABLE_TYPES[PORT_CABLE[p.type]] || {};
                                const isConnected = _connections.some(c => (c.fromNode === node.id && c.fromPortIdx === p.idx) || (c.toNode === node.id && c.toPortIdx === p.idx));
                                return `<div style="display:flex;align-items:center;gap:4px;">
                                    <span style="width:8px;height:8px;border-radius:50%;border:2px solid ${cable.color || '#666'};flex-shrink:0;${isConnected ? 'background:' + cable.color + ';' : ''}"></span>
                                    <select class="form-control" style="font-size:10px;padding:2px 4px;flex:1;" onchange="DiagramPage.changePortType(${node.id},${p.idx},this.value)">
                                        ${Object.keys(PORT_CABLE).map(pt => `<option value="${pt}" ${pt === p.type ? 'selected' : ''}>${pt}</option>`).join('')}
                                    </select>
                                    <button class="btn btn-sm" style="font-size:9px;padding:1px 5px;color:var(--danger);border-color:rgba(239,68,68,0.3);flex-shrink:0;" onclick="DiagramPage.removePort(${node.id},${p.idx})" title="${isConnected ? 'Remove port (will disconnect)' : 'Remove port'}"><i class="fas fa-times"></i></button>
                                </div>`;
                            }).join('')}
                        </div>
                        <div style="margin-top:6px;">
                            <select id="add-port-type-${node.id}" class="form-control" style="font-size:10px;padding:2px 4px;margin-bottom:4px;">
                                ${Object.keys(PORT_CABLE).map(pt => `<option value="${pt}">${pt}</option>`).join('')}
                            </select>
                            <button class="btn btn-sm btn-accent" style="width:100%;font-size:10px;padding:3px 6px;" onclick="DiagramPage.addPort(${node.id})"><i class="fas fa-plus"></i> Add Port</button>
                        </div>
                    </div>
                </div>
                <div class="prop-row">
                    <div class="prop-label">Connections</div>
                    <div class="prop-val">${connCount} connection${connCount !== 1 ? 's' : ''}</div>
                </div>
                ${node._serverId ? `
                <div class="prop-row">
                    <div class="prop-label">Server Status</div>
                    <div class="prop-val" style="display:flex;align-items:center;gap:6px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${node._serverStatus === 'online' ? '#4ade80' : '#ef4444'};"></span>
                        <span style="color:${node._serverStatus === 'online' ? '#4ade80' : '#ef4444'};font-weight:700;">${node._serverStatus === 'online' ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-accent" style="width:100%;margin-bottom:8px;" onclick="DiagramPage.pingNode(${node.id})"><i class="fas fa-sync-alt"></i> Ping Server</button>
                ` : ''}
                <div style="margin-top:8px;">
                    <button class="btn btn-sm" style="width:100%;color:var(--danger);border-color:rgba(239,68,68,0.3);" onclick="DiagramPage.deleteNode(${node.id})"><i class="fas fa-trash"></i> Delete Node</button>
                </div>
            `;
        }
        if (_selectedConn != null) {
            const conn = _connections.find(c => c.id === _selectedConn);
            if (!conn) return _emptyProps();
            const from = _nodes.find(n => n.id === conn.fromNode);
            const to = _nodes.find(n => n.id === conn.toNode);
            const cable = CABLE_TYPES[conn.cableType] || {};
            return `
                <div class="prop-row">
                    <div class="prop-label">Cable Type</div>
                    <div class="prop-val"><span style="display:inline-block;width:12px;height:3px;border-radius:1px;background:${cable.color};margin-right:8px;vertical-align:middle;"></span>${cable.label || conn.cableType}</div>
                </div>
                <div class="prop-row">
                    <div class="prop-label">From</div>
                    <div class="prop-val">${_esc(from?.label || '--')} <span class="text-muted">(${conn.fromPort})</span></div>
                </div>
                <div class="prop-row">
                    <div class="prop-label">To</div>
                    <div class="prop-val">${_esc(to?.label || '--')} <span class="text-muted">(${conn.toPort})</span></div>
                </div>
                <div style="margin-top:16px;">
                    <button class="btn btn-sm" style="width:100%;color:var(--danger);border-color:rgba(239,68,68,0.3);" onclick="DiagramPage.deleteConnection(${conn.id})"><i class="fas fa-trash"></i> Delete Connection</button>
                </div>
            `;
        }
        return _emptyProps();
    }

    function _emptyProps() {
        return `
            <div style="text-align:center;padding:40px 16px;color:var(--text-muted);">
                <i class="fas fa-mouse-pointer" style="font-size:28px;opacity:0.15;margin-bottom:12px;display:block;"></i>
                <p style="font-size:11px;margin-bottom:6px;">Select a node or connection</p>
                <p style="font-size:10px;">Drag equipment from the palette to the canvas to build your diagram.</p>
            </div>
            <div style="padding:0 4px;">
                <div class="prop-label" style="margin-bottom:8px;">Diagram Info</div>
                <div style="font-size:10px;color:var(--text-secondary);margin-bottom:4px;"><strong>${_nodes.length}</strong> nodes</div>
                <div style="font-size:10px;color:var(--text-secondary);margin-bottom:12px;"><strong>${_connections.length}</strong> connections</div>
                <div class="prop-label" style="margin-bottom:8px;">Tips</div>
                <div style="font-size:10px;color:var(--text-muted);line-height:1.6;">
                    <p><i class="fas fa-hand-pointer" style="width:14px;"></i> Drag items from palette</p>
                    <p><i class="fas fa-link" style="width:14px;"></i> Click port to port to connect</p>
                    <p><i class="fas fa-arrows-alt" style="width:14px;"></i> Drag nodes to reposition</p>
                    <p><i class="fas fa-search-plus" style="width:14px;"></i> Scroll to zoom</p>
                    <p><i class="fas fa-hand-rock" style="width:14px;"></i> Middle-click drag to pan</p>
                    <p><kbd style="font-size:9px;padding:1px 4px;border:1px solid var(--border);border-radius:3px;">Del</kbd> Delete selected</p>
                </div>
            </div>
        `;
    }

    // ================================================================
    // DRAWING
    // ================================================================
    function _drawNodes() {
        const container = document.getElementById('diagram-nodes');
        if (!container) return;
        container.innerHTML = _nodes.map(node => {
            const inPorts = node.ports.filter(p => p.type.includes('-in') || (!p.type.includes('-out') && !p.type.includes('-in')));
            const outPorts = node.ports.filter(p => p.type.includes('-out'));
            // If no clear in/out, split evenly
            let leftPorts, rightPorts;
            if (inPorts.length === 0 && outPorts.length === 0) {
                const half = Math.ceil(node.ports.length / 2);
                leftPorts = node.ports.slice(0, half);
                rightPorts = node.ports.slice(half);
            } else {
                leftPorts = inPorts.length > 0 ? inPorts : node.ports.filter(p => !p.type.includes('-out'));
                rightPorts = outPorts.length > 0 ? outPorts : [];
                // Put bidirectional ports (eth, dante, artnet, sacn, ndi, etc.) on both sides if needed
                const biPorts = node.ports.filter(p => !p.type.includes('-in') && !p.type.includes('-out'));
                if (inPorts.length > 0 && outPorts.length > 0) {
                    // Distribute bi ports
                    biPorts.forEach((p, i) => {
                        if (i % 2 === 0) leftPorts.push(p);
                        else rightPorts.push(p);
                    });
                } else if (inPorts.length === 0) {
                    leftPorts = biPorts;
                    rightPorts = outPorts;
                } else {
                    leftPorts = inPorts;
                    rightPorts = biPorts.length > 0 ? biPorts : outPorts;
                }
            }

            return `<div class="diagram-node ${node.id === _selectedNode ? 'selected' : ''}" id="dnode-${node.id}"
                style="left:${node.x}px;top:${node.y}px;border-color:${node.id === _selectedNode ? 'var(--accent)' : node.color + '40'};"
                onmousedown="DiagramPage.onNodeMouseDown(event,${node.id})"
                ondblclick="DiagramPage.onNodeDblClick(${node.id})">
                <div class="diagram-node-header" style="border-bottom-color:${node.color}20;">
                    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,${node.color}30,${node.color}10);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;">
                        <i class="fas ${node.icon}" style="color:${node.color};font-size:15px;"></i>
                        ${node._serverId ? `<span style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:${node._serverStatus === 'online' ? '#4ade80' : '#ef4444'};border:2px solid var(--bg-secondary);box-shadow:0 0 4px ${node._serverStatus === 'online' ? '#4ade8080' : '#ef444480'};"></span>` : ''}
                    </div>
                    <span class="node-label">${_esc(node.label)}</span>
                    ${node._serverId ? `<span onclick="event.stopPropagation();DiagramPage.pingNode(${node.id})" title="Ping Server" style="cursor:pointer;font-size:10px;color:var(--text-muted);padding:2px;"><i class="fas fa-sync-alt"></i></span>` : ''}
                    <span class="node-delete" onclick="event.stopPropagation();DiagramPage.deleteNode(${node.id})" title="Delete"><i class="fas fa-times"></i></span>
                </div>
                <div class="diagram-node-ports">
                    <div class="diagram-node-ports-col">
                        ${leftPorts.map(p => _renderPort(node.id, p, 'left')).join('')}
                    </div>
                    <div class="diagram-node-ports-col">
                        ${rightPorts.map(p => _renderPort(node.id, p, 'right')).join('')}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function _renderPort(nodeId, port, side) {
        const cableKey = PORT_CABLE[port.type] || 'eth';
        const cable = CABLE_TYPES[cableKey] || {};
        const connected = _connections.some(c =>
            (c.fromNode === nodeId && c.fromPortIdx === port.idx) ||
            (c.toNode === nodeId && c.toPortIdx === port.idx)
        );
        return `<div class="diagram-port port-${side}" onmousedown="event.stopPropagation();DiagramPage.onPortMouseDown(event,${nodeId},${port.idx})" title="${port.type}">
            <span class="port-dot" style="border-color:${cable.color};${connected ? 'background:' + cable.color + ';' : 'background:transparent;'}"></span>
            <span class="port-label">${port.type.replace('-in','').replace('-out','')}</span>
        </div>`;
    }

    function _makeConnPath(from, to, mode) {
        if (mode === 'ortho') {
            // 90-degree orthogonal routing with rounded corners
            const midX = from.x + (to.x - from.x) / 2;
            const r = Math.min(12, Math.abs(to.x - from.x) / 4, Math.abs(to.y - from.y) / 4);
            if (Math.abs(from.y - to.y) < 2) {
                return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
            }
            // H to midX, then V to to.y, then H to to.x
            const dy = to.y > from.y ? 1 : -1;
            const dx = to.x > from.x ? 1 : -1;
            return `M ${from.x} ${from.y} L ${midX - r * dx} ${from.y} Q ${midX} ${from.y} ${midX} ${from.y + r * dy} L ${midX} ${to.y - r * dy} Q ${midX} ${to.y} ${midX + r * dx} ${to.y} L ${to.x} ${to.y}`;
        }
        // Bezier curve mode
        const mid1x = from.x + (to.x - from.x) * 0.4;
        const mid2x = from.x + (to.x - from.x) * 0.6;
        return `M ${from.x} ${from.y} C ${mid1x} ${from.y}, ${mid2x} ${to.y}, ${to.x} ${to.y}`;
    }

    function _drawConnections() {
        const svg = document.getElementById('diagram-svg');
        if (!svg) return;
        let html = '';
        for (const conn of _connections) {
            const from = _getPortPos(conn.fromNode, conn.fromPortIdx);
            const to = _getPortPos(conn.toNode, conn.toPortIdx);
            if (!from || !to) continue;
            const cable = CABLE_TYPES[conn.cableType] || { color: '#666', dash: false };
            const d = _makeConnPath(from, to, _routeMode);
            // Wider invisible hit area for easier clicking
            html += `<path d="${d}" fill="none" stroke="transparent" stroke-width="12" style="pointer-events:stroke;cursor:pointer;" onclick="DiagramPage.onConnClick(event,${conn.id})"/>`;
            html += `<path class="conn-line ${conn.id === _selectedConn ? 'selected' : ''}" d="${d}"
                fill="none" stroke="${cable.color}" stroke-width="2.5" ${cable.dash ? `stroke-dasharray="${cable.dash.join(',')}"` : ''}
                style="color:${cable.color};pointer-events:none;"/>`;
            // Arrow at endpoint
            const arrowSize = 6;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            html += `<polygon points="${to.x},${to.y} ${to.x - arrowSize * Math.cos(angle - 0.4)},${to.y - arrowSize * Math.sin(angle - 0.4)} ${to.x - arrowSize * Math.cos(angle + 0.4)},${to.y - arrowSize * Math.sin(angle + 0.4)}" fill="${cable.color}" style="pointer-events:none;"/>`;
        }
        // Temp connection line while connecting
        if (_connecting) {
            const tempD = _routeMode === 'ortho'
                ? _makeConnPath({x: _connecting.startX, y: _connecting.startY}, {x: _connecting.x, y: _connecting.y}, 'ortho')
                : `M ${_connecting.startX} ${_connecting.startY} L ${_connecting.x} ${_connecting.y}`;
            html += `<path class="conn-temp" d="${tempD}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>`;
            html += `<circle cx="${_connecting.startX}" cy="${_connecting.startY}" r="4" fill="var(--accent)" opacity="0.6" style="pointer-events:none;"/>`;
            html += `<circle cx="${_connecting.x}" cy="${_connecting.y}" r="4" fill="var(--accent)" opacity="0.4" style="pointer-events:none;"/>`;
        }
        svg.innerHTML = html;
    }

    function _getPortPos(nodeId, portIdx) {
        const nodeEl = document.getElementById(`dnode-${nodeId}`);
        if (!nodeEl) return null;
        const canvas = document.getElementById('diagram-canvas');
        if (!canvas) return null;
        const portEls = nodeEl.querySelectorAll('.diagram-port');
        let targetPort = null;
        portEls.forEach(el => {
            // match by index in event handler attribute
            const onmd = el.getAttribute('onmousedown') || '';
            if (onmd.includes(`,${portIdx})`)) targetPort = el;
        });
        if (!targetPort) return null;
        const dot = targetPort.querySelector('.port-dot');
        if (!dot) return null;
        const canvasRect = canvas.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();
        return {
            x: (dotRect.left + dotRect.width / 2 - canvasRect.left) / _zoom,
            y: (dotRect.top + dotRect.height / 2 - canvasRect.top) / _zoom,
        };
    }

    function _drawGrid() {
        const el = document.getElementById('diagram-grid');
        if (!el) return;
        if (!_showGrid) { el.style.display = 'none'; return; }
        el.style.display = '';
        el.style.backgroundImage = `
            linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
        `;
        el.style.backgroundSize = `${_gridSize}px ${_gridSize}px`;
    }

    function _refreshAll() {
        _drawNodes();
        requestAnimationFrame(() => _drawConnections());
        _updateProps();
        _scheduleSave();
    }

    function _updateProps() {
        const body = document.getElementById('diagram-props-body');
        if (body) body.innerHTML = _renderProps();
    }

    // ================================================================
    // NODE MANAGEMENT
    // ================================================================
    function _findItem(itemId) {
        for (const cat of CATEGORIES) {
            const item = cat.items.find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    function _addNode(itemId, x, y, serverId) {
        const item = _findItem(itemId);
        if (!item) return;
        const snappedX = _snapToGrid ? Math.round(x / _gridSize) * _gridSize : x;
        const snappedY = _snapToGrid ? Math.round(y / _gridSize) * _gridSize : y;
        const ports = item.ports.map((p, i) => ({ type: p, idx: i }));
        const node = {
            id: _nextId++,
            itemId: item.id,
            label: item.label,
            x: snappedX,
            y: snappedY,
            color: item.color,
            icon: item.icon,
            ports,
            _serverId: serverId || null,
            _serverStatus: null,
        };
        // If placed from an active server, set label and status
        if (serverId && typeof appState !== 'undefined') {
            const server = (appState.get('servers') || []).find(s => s.id === serverId);
            const status = (appState.get('serverStatuses') || {})[serverId];
            if (server) node.label = server.name;
            node._serverStatus = status?.online ? 'online' : 'offline';
        }
        _nodes.push(node);
        _selectedNode = node.id;
        _selectedConn = null;
        _refreshAll();
        return node;
    }

    function deleteNode(id) {
        _nodes = _nodes.filter(n => n.id !== id);
        _connections = _connections.filter(c => c.fromNode !== id && c.toNode !== id);
        if (_selectedNode === id) _selectedNode = null;
        _refreshAll();
    }

    function deleteConnection(id) {
        _connections = _connections.filter(c => c.id !== id);
        if (_selectedConn === id) _selectedConn = null;
        _refreshAll();
    }

    function togglePortEditor(nodeId) {
        const el = document.getElementById('port-editor-' + nodeId);
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    function addPort(nodeId) {
        const node = _nodes.find(n => n.id === nodeId);
        if (!node) return;
        const sel = document.getElementById('add-port-type-' + nodeId);
        const portType = sel ? sel.value : 'eth';
        const maxIdx = node.ports.length > 0 ? Math.max(...node.ports.map(p => p.idx)) + 1 : 0;
        node.ports.push({ type: portType, idx: maxIdx });
        _refreshAll();
    }

    function removePort(nodeId, portIdx) {
        const node = _nodes.find(n => n.id === nodeId);
        if (!node) return;
        // Remove any connections using this port
        _connections = _connections.filter(c => {
            if (c.fromNode === nodeId && c.fromPortIdx === portIdx) return false;
            if (c.toNode === nodeId && c.toPortIdx === portIdx) return false;
            return true;
        });
        node.ports = node.ports.filter(p => p.idx !== portIdx);
        _refreshAll();
    }

    function changePortType(nodeId, portIdx, newType) {
        const node = _nodes.find(n => n.id === nodeId);
        if (!node) return;
        const port = node.ports.find(p => p.idx === portIdx);
        if (!port) return;
        // Update the port type
        port.type = newType;
        // Update cable types on connected connections
        _connections.forEach(c => {
            if (c.fromNode === nodeId && c.fromPortIdx === portIdx) {
                c.cableType = PORT_CABLE[newType] || 'eth';
            }
            if (c.toNode === nodeId && c.toPortIdx === portIdx) {
                c.cableType = PORT_CABLE[newType] || 'eth';
            }
        });
        _refreshAll();
    }

    function renameNode(id, name) {
        const node = _nodes.find(n => n.id === id);
        if (node) { node.label = name; _drawNodes(); requestAnimationFrame(() => _drawConnections()); }
    }

    async function pingNode(id) {
        const node = _nodes.find(n => n.id === id);
        if (!node || !node._serverId) return;
        const server = (typeof appState !== 'undefined' ? appState.get('servers') : [])?.find(s => s.id === node._serverId);
        if (!server) { UI.toast('Server not found', 'warning'); return; }
        UI.toast(`Pinging ${node.label}...`, 'info');
        try {
            if (typeof StatusPage !== 'undefined' && StatusPage.pingServer) {
                await StatusPage.pingServer(node._serverId);
            }
            const status = (appState.get('serverStatuses') || {})[node._serverId];
            node._serverStatus = status?.online ? 'online' : 'offline';
            _refreshAll();
            UI.toast(`${node.label}: ${node._serverStatus === 'online' ? 'Online' : 'Offline'}`, node._serverStatus === 'online' ? 'success' : 'error');
        } catch (e) {
            node._serverStatus = 'offline';
            _refreshAll();
            UI.toast(`${node.label}: Offline — ${e.message}`, 'error');
        }
    }

    function pingAllNodes() {
        const serverNodes = _nodes.filter(n => n._serverId);
        if (serverNodes.length === 0) { UI.toast('No server nodes to ping', 'info'); return; }
        serverNodes.forEach(n => pingNode(n.id));
    }

    // ================================================================
    // EVENT HANDLERS
    // ================================================================

    // Drag from palette
    let _dragItemId = null;
    let _dragServerId = null;
    function onDragStart(e, itemId) {
        _dragItemId = itemId;
        // Check if dragged from an active server item
        const serverIdAttr = e.target.closest('[data-server-id]');
        _dragServerId = serverIdAttr ? serverIdAttr.getAttribute('data-server-id') : null;
        const item = _findItem(itemId);
        e.dataTransfer.setData('text/plain', itemId);
        e.dataTransfer.effectAllowed = 'copy';
        // Show ghost
        const ghost = document.getElementById('diagram-drop-ghost');
        if (ghost && item) {
            ghost.innerHTML = `<i class="fas ${item.icon}" style="color:${item.color};margin-right:6px;"></i>${item.label}`;
            ghost.style.display = 'block';
        }
    }

    function onDragEnd(e) {
        _dragItemId = null;
        _dragServerId = null;
        const ghost = document.getElementById('diagram-drop-ghost');
        if (ghost) ghost.style.display = 'none';
    }

    // Canvas drop
    function _setupCanvasDrop() {
        const wrap = document.getElementById('diagram-canvas-wrap');
        if (!wrap) return;
        wrap.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            const ghost = document.getElementById('diagram-drop-ghost');
            if (ghost) { ghost.style.left = (e.clientX + 12) + 'px'; ghost.style.top = (e.clientY + 12) + 'px'; }
        });
        wrap.addEventListener('drop', (e) => {
            e.preventDefault();
            const itemId = e.dataTransfer.getData('text/plain') || _dragItemId;
            if (!itemId) return;
            const canvas = document.getElementById('diagram-canvas');
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / _zoom;
            const y = (e.clientY - rect.top) / _zoom;
            _addNode(itemId, x, y, _dragServerId);
            _dragServerId = null;
            const ghost = document.getElementById('diagram-drop-ghost');
            if (ghost) ghost.style.display = 'none';
        });
    }

    // Node dragging
    function onNodeMouseDown(e, nodeId) {
        if (e.button !== 0) return;
        e.preventDefault();
        _selectedNode = nodeId;
        _selectedConn = null;
        const node = _nodes.find(n => n.id === nodeId);
        if (!node) return;
        const canvas = document.getElementById('diagram-canvas');
        const rect = canvas.getBoundingClientRect();
        _dragging = {
            nodeId,
            offsetX: (e.clientX - rect.left) / _zoom - node.x,
            offsetY: (e.clientY - rect.top) / _zoom - node.y,
        };
        _refreshAll();
    }

    // Port click to connect
    function onPortMouseDown(e, nodeId, portIdx) {
        e.preventDefault();
        e.stopPropagation();
        const node = _nodes.find(n => n.id === nodeId);
        if (!node) return;
        const port = node.ports.find(p => p.idx === portIdx);
        if (!port) return;

        if (_connecting) {
            // Finish connection
            if (_connecting.fromNode !== nodeId || _connecting.fromPortIdx !== portIdx) {
                _createConnection(_connecting.fromNode, _connecting.fromPortIdx, nodeId, portIdx);
            }
            _connecting = null;
            const wrap = document.getElementById('diagram-canvas-wrap');
            if (wrap) wrap.style.cursor = 'default';
            _refreshAll();
            return;
        }

        // Start connection
        const pos = _getPortPos(nodeId, portIdx);
        _connecting = {
            fromNode: nodeId,
            fromPortIdx: portIdx,
            startX: pos ? pos.x : 0,
            startY: pos ? pos.y : 0,
            x: pos ? pos.x : 0,
            y: pos ? pos.y : 0,
        };
        // Visual feedback — change cursor
        const wrap = document.getElementById('diagram-canvas-wrap');
        if (wrap) wrap.style.cursor = 'crosshair';
        _drawConnections();
    }

    function _createConnection(fromNode, fromPortIdx, toNode, toPortIdx) {
        const fn = _nodes.find(n => n.id === fromNode);
        const tn = _nodes.find(n => n.id === toNode);
        if (!fn || !tn) return;
        const fp = fn.ports.find(p => p.idx === fromPortIdx);
        const tp = tn.ports.find(p => p.idx === toPortIdx);
        if (!fp || !tp) return;
        // Determine cable type from ports
        const fpCable = PORT_CABLE[fp.type] || 'eth';
        const tpCable = PORT_CABLE[tp.type] || 'eth';
        const cableType = fpCable === tpCable ? fpCable : fpCable; // use from port's type

        // Check for duplicate
        const dup = _connections.find(c =>
            (c.fromNode === fromNode && c.fromPortIdx === fromPortIdx && c.toNode === toNode && c.toPortIdx === toPortIdx) ||
            (c.fromNode === toNode && c.fromPortIdx === toPortIdx && c.toNode === fromNode && c.toPortIdx === fromPortIdx)
        );
        if (dup) return;

        _connections.push({
            id: _nextConnId++,
            fromNode, fromPortIdx, fromPort: fp.type,
            toNode, toPortIdx, toPort: tp.type,
            cableType,
        });
        _refreshAll();
    }

    function onConnClick(e, connId) {
        e.stopPropagation();
        _selectedConn = connId;
        _selectedNode = null;
        _refreshAll();
    }

    // Global mouse move/up
    function _onMouseMove(e) {
        if (_dragging) {
            const canvas = document.getElementById('diagram-canvas');
            const rect = canvas.getBoundingClientRect();
            let x = (e.clientX - rect.left) / _zoom - _dragging.offsetX;
            let y = (e.clientY - rect.top) / _zoom - _dragging.offsetY;
            if (_snapToGrid) {
                x = Math.round(x / _gridSize) * _gridSize;
                y = Math.round(y / _gridSize) * _gridSize;
            }
            const node = _nodes.find(n => n.id === _dragging.nodeId);
            if (node) {
                node.x = Math.max(0, x);
                node.y = Math.max(0, y);
                const el = document.getElementById(`dnode-${node.id}`);
                if (el) { el.style.left = node.x + 'px'; el.style.top = node.y + 'px'; }
                _drawConnections();
            }
        }
        if (_connecting) {
            const canvas = document.getElementById('diagram-canvas');
            const rect = canvas.getBoundingClientRect();
            _connecting.x = (e.clientX - rect.left) / _zoom;
            _connecting.y = (e.clientY - rect.top) / _zoom;
            _drawConnections();
        }
        if (_isPanning && _panStart) {
            const dx = (e.clientX - _panStart.x);
            const dy = (e.clientY - _panStart.y);
            _panX = _panStart.panX + dx / _zoom;
            _panY = _panStart.panY + dy / _zoom;
            _applyTransform();
        }
    }

    function _onMouseUp(e) {
        if (_dragging) {
            _dragging = null;
            _updateProps();
            _scheduleSave();
        }
        // Do NOT clear _connecting here — connections use click-to-click mode
        // _connecting is only cleared by: clicking a second port, Escape, or canvas click
        if (_isPanning) {
            _isPanning = false;
            _panStart = null;
            const wrap = document.getElementById('diagram-canvas-wrap');
            if (wrap) wrap.style.cursor = 'default';
        }
    }

    function _onCanvasMouseDown(e) {
        // Click on empty canvas = deselect and cancel connection
        if (e.target.id === 'diagram-canvas' || e.target.id === 'diagram-grid' || e.target.classList?.contains('diagram-canvas')) {
            _selectedNode = null;
            _selectedConn = null;
            _connecting = null;
            const wrap = document.getElementById('diagram-canvas-wrap');
            if (wrap) wrap.style.cursor = 'default';
            _refreshAll();
        }
        // Middle mouse or alt+click = pan
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            _isPanning = true;
            _panStart = { x: e.clientX, y: e.clientY, panX: _panX, panY: _panY };
            const wrap = document.getElementById('diagram-canvas-wrap');
            if (wrap) wrap.style.cursor = 'grabbing';
        }
    }

    function _onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        _zoom = Math.max(0.15, Math.min(3, _zoom + delta));
        _applyTransform();
        const label = document.getElementById('diagram-zoom-label');
        if (label) label.textContent = Math.round(_zoom * 100) + '%';
    }

    function _onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelected();
        }
        if (e.key === 'Escape') {
            _connecting = null;
            _selectedNode = null;
            _selectedConn = null;
            const wrap = document.getElementById('diagram-canvas-wrap');
            if (wrap) wrap.style.cursor = 'default';
            _refreshAll();
        }
    }

    function _applyTransform() {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) canvas.style.transform = `scale(${_zoom}) translate(${_panX}px,${_panY}px)`;
    }

    // ================================================================
    // ACTIONS
    // ================================================================
    function deleteSelected() {
        if (_selectedNode != null) deleteNode(_selectedNode);
        else if (_selectedConn != null) deleteConnection(_selectedConn);
    }

    function selectAll() {
        // Select first node if any
        if (_nodes.length > 0) { _selectedNode = _nodes[0].id; _selectedConn = null; _refreshAll(); }
    }

    function toggleGrid() {
        _showGrid = !_showGrid;
        const grid = document.getElementById('diagram-grid');
        if (grid) grid.style.display = _showGrid ? '' : 'none';
        _drawGrid();
        _updateToolbarButtons();
        _scheduleSave();
    }

    function toggleSnap() {
        _snapToGrid = !_snapToGrid;
        _updateToolbarButtons();
        _scheduleSave();
        UI.toast(_snapToGrid ? 'Snap to Grid: ON' : 'Snap to Grid: OFF', 'info');
    }

    function toggleRoute() {
        _routeMode = _routeMode === 'ortho' ? 'curve' : 'ortho';
        _drawConnections();
        _updateToolbarButtons();
        _scheduleSave();
        UI.toast(_routeMode === 'ortho' ? 'Routing: 90° Orthogonal' : 'Routing: Curved', 'info');
    }

    function _updateToolbarButtons() {
        const toolbar = document.querySelector('.diagram-toolbar');
        if (!toolbar) return;
        const buttons = toolbar.querySelectorAll('button');
        buttons.forEach(btn => {
            const text = btn.textContent.trim();
            if (text.includes('Grid')) btn.className = _showGrid ? 'active' : '';
            if (text.includes('Snap')) btn.className = _snapToGrid ? 'active' : '';
            if (text.includes('90') || text.includes('Curve')) {
                btn.className = _routeMode === 'ortho' ? 'active' : '';
                btn.innerHTML = _routeMode === 'ortho'
                    ? '<i class="fas fa-draw-polygon"></i> 90°'
                    : '<i class="fas fa-bezier-curve"></i> Curve';
            }
        });
    }

    function toggleCategory(catId) {
        _collapsed[catId] = !_collapsed[catId];
        const body = document.getElementById('diagram-palette-body');
        if (body) body.innerHTML = _renderPalette();
    }

    function onSearch(val) {
        _searchFilter = val;
        const body = document.getElementById('diagram-palette-body');
        if (body) body.innerHTML = _renderPalette();
    }

    function onNodeDblClick(nodeId) {
        const node = _nodes.find(n => n.id === nodeId);
        if (!node) return;
        const name = prompt('Rename node:', node.label);
        if (name && name.trim()) { node.label = name.trim(); _refreshAll(); }
    }

    // ================================================================
    // ZOOM
    // ================================================================
    function zoomIn() { _zoom = Math.min(3, _zoom + 0.15); _applyTransform(); document.getElementById('diagram-zoom-label').textContent = Math.round(_zoom * 100) + '%'; }
    function zoomOut() { _zoom = Math.max(0.15, _zoom - 0.15); _applyTransform(); document.getElementById('diagram-zoom-label').textContent = Math.round(_zoom * 100) + '%'; }
    function zoomReset() { _zoom = 1; _panX = 0; _panY = 0; _applyTransform(); document.getElementById('diagram-zoom-label').textContent = '100%'; }
    function zoomFit() {
        if (_nodes.length === 0) { zoomReset(); return; }
        const xs = _nodes.map(n => n.x);
        const ys = _nodes.map(n => n.y);
        const minX = Math.min(...xs) - 60;
        const minY = Math.min(...ys) - 60;
        const maxX = Math.max(...xs) + 200;
        const maxY = Math.max(...ys) + 200;
        const wrap = document.getElementById('diagram-canvas-wrap');
        if (!wrap) return;
        const ww = wrap.clientWidth;
        const wh = wrap.clientHeight;
        _zoom = Math.min(ww / (maxX - minX), wh / (maxY - minY), 2);
        _zoom = Math.max(0.15, _zoom);
        _panX = -minX;
        _panY = -minY;
        _applyTransform();
        document.getElementById('diagram-zoom-label').textContent = Math.round(_zoom * 100) + '%';
    }

    // ================================================================
    // SAVE / LOAD / EXPORT
    // ================================================================
    function saveDiagram() {
        const name = prompt('Save diagram as:', _diagramName || 'Untitled Diagram');
        if (!name) return;
        _diagramName = name;
        const data = JSON.stringify({ name: _diagramName, nodes: _nodes, connections: _connections, nextId: _nextId, nextConnId: _nextConnId }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name + '.luxdiagram';
        a.click();
        URL.revokeObjectURL(a.href);
        _scheduleSave();
        UI.toast('Diagram saved: ' + name, 'success');
    }

    function loadDiagram() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.luxdiagram,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    _nodes = data.nodes || [];
                    _connections = data.connections || [];
                    _nextId = data.nextId || (_nodes.length > 0 ? Math.max(..._nodes.map(n => n.id)) + 1 : 1);
                    _nextConnId = data.nextConnId || (_connections.length > 0 ? Math.max(..._connections.map(c => c.id)) + 1 : 1);
                    _diagramName = data.name || 'Loaded Diagram';
                    _selectedNode = null;
                    _selectedConn = null;
                    _refreshAll();
                    UI.toast(`Diagram loaded: ${_diagramName}`, 'success');
                } catch (err) {
                    UI.toast('Failed to load diagram: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function newDiagram() {
        if (_nodes.length > 0) {
            if (!confirm('Clear current diagram? Any unsaved changes will be lost.')) return;
        }
        _nodes = [];
        _connections = [];
        _nextId = 1;
        _nextConnId = 1;
        _selectedNode = null;
        _selectedConn = null;
        _diagramName = 'Untitled Diagram';
        _zoom = 1; _panX = 0; _panY = 0;
        _applyTransform();
        _refreshAll();
        _autoSave();
        UI.toast('New diagram created', 'info');
    }

    function exportDatasheet() {
        if (_nodes.length === 0) { UI.toast('Nothing to export', 'warning'); return; }

        // Group nodes by category
        const catMap = {};
        for (const cat of CATEGORIES) {
            for (const item of cat.items) {
                catMap[item.id] = { category: cat.label, catColor: cat.color, catIcon: cat.icon };
            }
        }
        const groups = {};
        for (const node of _nodes) {
            const info = catMap[node.itemId] || { category: 'Other', catColor: '#666', catIcon: 'fa-cube' };
            if (!groups[info.category]) groups[info.category] = { color: info.catColor, icon: info.catIcon, nodes: [] };
            groups[info.category].nodes.push(node);
        }

        // Build connection list with labels
        const connRows = _connections.map(c => {
            const from = _nodes.find(n => n.id === c.fromNode);
            const to = _nodes.find(n => n.id === c.toNode);
            const cable = CABLE_TYPES[c.cableType] || {};
            return { from: from?.label || '?', fromPort: c.fromPort, to: to?.label || '?', toPort: c.toPort, cable: cable.label || c.cableType, cableColor: cable.color || '#666' };
        });

        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${_esc(_diagramName)} — Equipment Datasheet</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#fff;color:#1a1a2e;padding:40px;max-width:1100px;margin:0 auto;font-size:13px;}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f1923;padding-bottom:20px;margin-bottom:30px;}
.header h1{font-size:28px;font-weight:800;color:#0f1923;letter-spacing:-0.5px;}
.header .subtitle{font-size:14px;color:#64748b;margin-top:4px;}
.header .meta{text-align:right;font-size:11px;color:#94a3b8;line-height:1.8;}
.header .logo{font-size:10px;font-weight:800;color:#00d4aa;letter-spacing:2px;margin-bottom:4px;}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px;}
.summary-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;}
.summary-card .val{font-size:28px;font-weight:800;color:#0f1923;}
.summary-card .label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;}
.section{margin-bottom:28px;}
.section h2{font-size:16px;font-weight:800;color:#0f1923;margin-bottom:12px;display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;}
.section h2 .dot{width:10px;height:10px;border-radius:50%;}
table{width:100%;border-collapse:collapse;}
thead th{background:#f1f5f9;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;}
tbody td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:middle;}
tbody tr:hover{background:#f8fafc;}
.port-badge{display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin:1px 2px;border:1px solid;}
.cable-dot{display:inline-block;width:10px;height:3px;border-radius:1px;margin-right:6px;vertical-align:middle;}
.conn-table .from,.conn-table .to{font-weight:600;color:#0f1923;}
.conn-table .port{font-size:10px;color:#64748b;font-weight:600;}
.footer{margin-top:40px;padding-top:16px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;}
@media print{body{padding:20px;}.summary{grid-template-columns:repeat(4,1fr);}}
</style>
</head><body>
<div class="header">
    <div>
        <div class="logo">LUXOR MEDIA CONTROLLER</div>
        <h1>${_esc(_diagramName)}</h1>
        <div class="subtitle">System Diagram — Equipment Datasheet</div>
    </div>
    <div class="meta">
        <div><strong>Date:</strong> ${date}</div>
        <div><strong>Time:</strong> ${time}</div>
        <div><strong>Nodes:</strong> ${_nodes.length}</div>
        <div><strong>Connections:</strong> ${_connections.length}</div>
    </div>
</div>

<div class="summary">
    <div class="summary-card"><div class="val">${_nodes.length}</div><div class="label">Total Equipment</div></div>
    <div class="summary-card"><div class="val">${_connections.length}</div><div class="label">Connections</div></div>
    <div class="summary-card"><div class="val">${Object.keys(groups).length}</div><div class="label">Categories</div></div>
    <div class="summary-card"><div class="val">${new Set(_connections.map(c => c.cableType)).size}</div><div class="label">Cable Types</div></div>
</div>

${Object.entries(groups).map(([catName, cat]) => `
<div class="section">
    <h2><span class="dot" style="background:${cat.color};"></span>${catName} (${cat.nodes.length})</h2>
    <table>
        <thead><tr><th>#</th><th>Equipment</th><th>Type</th><th>Ports</th><th>Connections</th><th>Position</th></tr></thead>
        <tbody>
        ${cat.nodes.map((n, i) => {
            const connCount = _connections.filter(c => c.fromNode === n.id || c.toNode === n.id).length;
            const portBadges = n.ports.map(p => {
                const cableKey = PORT_CABLE[p.type] || 'eth';
                const cable = CABLE_TYPES[cableKey] || {};
                return '<span class="port-badge" style="color:' + (cable.color || '#666') + ';border-color:' + (cable.color || '#666') + '30;background:' + (cable.color || '#666') + '08;">' + p.type + '</span>';
            }).join('');
            return '<tr><td>' + (i+1) + '</td><td style="font-weight:600;">' + _esc(n.label) + '</td><td style="color:#64748b;">' + _esc(n.itemId) + '</td><td>' + portBadges + '</td><td style="text-align:center;font-weight:700;">' + connCount + '</td><td style="font-family:monospace;font-size:10px;color:#94a3b8;">(' + Math.round(n.x) + ', ' + Math.round(n.y) + ')</td></tr>';
        }).join('')}
        </tbody>
    </table>
</div>
`).join('')}

${_connections.length > 0 ? `
<div class="section">
    <h2><span class="dot" style="background:#00d4aa;"></span>Connection Schedule (${_connections.length})</h2>
    <table class="conn-table">
        <thead><tr><th>#</th><th>From</th><th>Port</th><th></th><th>To</th><th>Port</th><th>Cable Type</th></tr></thead>
        <tbody>
        ${connRows.map((r, i) => `<tr>
            <td>${i+1}</td>
            <td class="from">${_esc(r.from)}</td>
            <td class="port">${r.fromPort}</td>
            <td style="text-align:center;color:#94a3b8;"><span class="cable-dot" style="background:${r.cableColor};"></span>&rarr;</td>
            <td class="to">${_esc(r.to)}</td>
            <td class="port">${r.toPort}</td>
            <td><span class="cable-dot" style="background:${r.cableColor};"></span>${_esc(r.cable)}</td>
        </tr>`).join('')}
        </tbody>
    </table>
</div>
` : ''}

<div class="footer">
    <span>Generated by Luxor Production v1.2 — Diagram Builder</span>
    <span>${date} ${time}</span>
</div>
</body></html>`;

        const sheetName = prompt('Export datasheet as:', (_diagramName || 'diagram') + '-datasheet');
        if (!sheetName) return;
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = sheetName + '.html';
        a.click();
        URL.revokeObjectURL(a.href);
        UI.toast('Datasheet exported: ' + sheetName + '.html', 'success');
    }

    function exportPNG() {
        if (_nodes.length === 0) { UI.toast('Nothing to export', 'warning'); return; }
        // Use html2canvas-like approach: render to an offscreen canvas
        const xs = _nodes.map(n => n.x);
        const ys = _nodes.map(n => n.y);
        const minX = Math.min(...xs) - 40;
        const minY = Math.min(...ys) - 40;
        const maxX = Math.max(...xs) + 240;
        const maxY = Math.max(...ys) + 200;
        const w = maxX - minX;
        const h = maxY - minY;
        const canvas = document.createElement('canvas');
        canvas.width = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.fillStyle = '#0f1923';
        ctx.fillRect(0, 0, w, h);

        // Draw grid
        if (_showGrid) {
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += _gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = 0; y < h; y += _gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        }

        // Draw connections
        for (const conn of _connections) {
            const fn = _nodes.find(n => n.id === conn.fromNode);
            const tn = _nodes.find(n => n.id === conn.toNode);
            if (!fn || !tn) continue;
            const fx = fn.x + 70 - minX;
            const fy = fn.y + 40 - minY;
            const tx = tn.x + 70 - minX;
            const ty = tn.y + 40 - minY;
            const cable = CABLE_TYPES[conn.cableType] || { color: '#666' };
            ctx.strokeStyle = cable.color;
            ctx.lineWidth = 2.5;
            if (cable.dash) ctx.setLineDash(cable.dash);
            else ctx.setLineDash([]);
            ctx.beginPath();
            if (_routeMode === 'ortho') {
                const midX = fx + (tx - fx) / 2;
                ctx.moveTo(fx, fy);
                ctx.lineTo(midX, fy);
                ctx.lineTo(midX, ty);
                ctx.lineTo(tx, ty);
            } else {
                ctx.moveTo(fx, fy);
                const mid1x = fx + (tx - fx) * 0.4;
                const mid2x = fx + (tx - fx) * 0.6;
                ctx.bezierCurveTo(mid1x, fy, mid2x, ty, tx, ty);
            }
            ctx.stroke();
            // Arrow
            ctx.setLineDash([]);
            ctx.fillStyle = cable.color;
            ctx.beginPath();
            const angle = Math.atan2(ty - fy, tx - fx);
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx - 6 * Math.cos(angle - 0.4), ty - 6 * Math.sin(angle - 0.4));
            ctx.lineTo(tx - 6 * Math.cos(angle + 0.4), ty - 6 * Math.sin(angle + 0.4));
            ctx.fill();
        }
        ctx.setLineDash([]);

        // Draw nodes
        for (const node of _nodes) {
            const nx = node.x - minX;
            const ny = node.y - minY;
            const nw = 160, nh = 70;
            // Box with top color accent
            ctx.fillStyle = '#1a2736';
            ctx.strokeStyle = node.color + '60';
            ctx.lineWidth = 2;
            _roundRect(ctx, nx, ny, nw, nh, 8);
            ctx.fill();
            ctx.stroke();
            // Top accent bar
            ctx.fillStyle = node.color + '30';
            _roundRect(ctx, nx, ny, nw, 4, 8);
            ctx.fill();
            // Icon circle
            ctx.fillStyle = node.color + '25';
            ctx.beginPath(); ctx.arc(nx + 22, ny + 28, 14, 0, Math.PI * 2); ctx.fill();
            // Label
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(node.label, nx + 42, ny + 32);
            // Status indicator
            const isOnline = node._serverStatus === 'online';
            const isServer = node._serverId;
            if (isServer) {
                ctx.fillStyle = isOnline ? '#4ade80' : '#ef4444';
                ctx.beginPath(); ctx.arc(nx + nw - 12, ny + 12, 4, 0, Math.PI * 2); ctx.fill();
            }
            // Port dots
            const allPorts = node.ports || [];
            const half = Math.ceil(allPorts.length / 2);
            allPorts.slice(0, Math.min(half, 5)).forEach((p, i) => {
                const cable = CABLE_TYPES[PORT_CABLE[p.type]] || {};
                ctx.fillStyle = cable.color || '#666';
                ctx.beginPath(); ctx.arc(nx + 6, ny + 46 + i * 8, 3, 0, Math.PI * 2); ctx.fill();
            });
            allPorts.slice(half, half + 5).forEach((p, i) => {
                const cable = CABLE_TYPES[PORT_CABLE[p.type]] || {};
                ctx.fillStyle = cable.color || '#666';
                ctx.beginPath(); ctx.arc(nx + nw - 6, ny + 46 + i * 8, 3, 0, Math.PI * 2); ctx.fill();
            });
        }

        // Download
        const exportName = prompt('Export PNG as:', _diagramName || 'diagram');
        if (!exportName) return;
        const link = document.createElement('a');
        link.download = exportName + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        UI.toast('Diagram exported: ' + exportName + '.png', 'success');
    }

    function _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    // ================================================================
    // LIFECYCLE
    // ================================================================
    function onActivate() {
        _autoRestore();
        _setupCanvasDrop();
        _drawGrid();
        _applyTransform();
        _refreshAll();
        document.addEventListener('mousemove', _onMouseMove);
        document.addEventListener('mouseup', _onMouseUp);
        document.addEventListener('keydown', _onKeyDown);
        const canvasWrap = document.getElementById('diagram-canvas-wrap');
        if (canvasWrap) {
            canvasWrap.addEventListener('mousedown', _onCanvasMouseDown);
            canvasWrap.addEventListener('wheel', _onWheel, { passive: false });
        }
        // Update zoom label
        const label = document.getElementById('diagram-zoom-label');
        if (label) label.textContent = Math.round(_zoom * 100) + '%';
    }

    function onDeactivate() {
        document.removeEventListener('mousemove', _onMouseMove);
        document.removeEventListener('mouseup', _onMouseUp);
        document.removeEventListener('keydown', _onKeyDown);
    }

    // ================================================================
    // PERSISTENCE — Auto-save to localStorage
    // ================================================================
    const STORAGE_KEY = 'luxor_diagram_state';
    function _autoSave() {
        try {
            const data = {
                name: _diagramName,
                nodes: _nodes,
                connections: _connections,
                nextId: _nextId,
                nextConnId: _nextConnId,
                zoom: _zoom,
                panX: _panX,
                panY: _panY,
                routeMode: _routeMode,
                showGrid: _showGrid,
                snapToGrid: _snapToGrid,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* quota exceeded or private mode */ }
    }

    function _autoRestore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.nodes && data.nodes.length > 0) {
                _nodes = data.nodes;
                _connections = data.connections || [];
                _nextId = data.nextId || (_nodes.length > 0 ? Math.max(..._nodes.map(n => n.id)) + 1 : 1);
                _nextConnId = data.nextConnId || (_connections.length > 0 ? Math.max(..._connections.map(c => c.id)) + 1 : 1);
                _diagramName = data.name || 'Untitled Diagram';
                _zoom = data.zoom || 1;
                _panX = data.panX || 0;
                _panY = data.panY || 0;
                _routeMode = data.routeMode || 'ortho';
                _showGrid = data.showGrid !== undefined ? data.showGrid : true;
                _snapToGrid = data.snapToGrid !== undefined ? data.snapToGrid : true;
            }
        } catch (e) { /* corrupted data */ }
    }

    // Debounced autosave — save after changes settle
    let _saveTimer = null;
    function _scheduleSave() {
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(_autoSave, 500);
    }

    function _esc(s) { return typeof UI !== 'undefined' ? UI.esc(s) : String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    // ================================================================
    // PUBLIC API
    // ================================================================
    return {
        render,
        onActivate,
        onDeactivate,
        // Palette
        onDragStart,
        onDragEnd,
        onSearch,
        toggleCategory,
        // Node
        onNodeMouseDown,
        onNodeDblClick,
        onPortMouseDown,
        deleteNode,
        deleteConnection,
        renameNode,
        togglePortEditor,
        addPort,
        removePort,
        changePortType,
        // Connection
        onConnClick,
        // Actions
        deleteSelected,
        selectAll,
        toggleGrid,
        toggleSnap,
        toggleRoute,
        // Server
        pingNode,
        pingAllNodes,
        // Zoom
        zoomIn,
        zoomOut,
        zoomFit,
        zoomReset,
        // File
        newDiagram,
        saveDiagram,
        loadDiagram,
        exportPNG,
        exportDatasheet,
    };

})();
