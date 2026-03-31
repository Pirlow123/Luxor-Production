/**
 * VIRTUAL HIPPOTIZER — Mock Server for Luxor Production Demo
 * Simulates the full Hippotizer REST API (port 40512) and WebSocket Callback API (port 40513)
 * with realistic show data so all frontend features can be demonstrated.
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const url = require('url');

// ================================================================
// DEMO DATA — Realistic Hippotizer state
// ================================================================

const SERVER_INFO = {
    computerName: 'HIPPO-ENGINE-01',
    engineStatus: 'Running',
    hostName: 'hippo-01.local',
    iP: '192.168.1.100',
    mediaManagerStatus: 'Running',
    product: 'Hippotizer Karst+',
    productFamily: 'Hippotizer V4',
    registeredOwner: 'Luxor Productions',
    softwareRevision: 'Build 4812',
    softwareVersion: '4.8.1',
    mixes: [
        { fXCName: 'FXC_Mix1', hasLayers: true, index: 0, layerCount: 8, mixType: 'Standard', name: 'Main Stage' },
        { fXCName: 'FXC_Mix2', hasLayers: true, index: 1, layerCount: 4, mixType: 'Standard', name: 'LED Wall' },
        { fXCName: 'FXC_Mix3', hasLayers: true, index: 2, layerCount: 4, mixType: 'Standard', name: 'Floor Projection' },
        { fXCName: 'FXC_Mix4', hasLayers: true, index: 3, layerCount: 2, mixType: 'Aux', name: 'Confidence Monitor' },
    ],
};

const TIMELINES = [
    {
        iD: 0, name: 'Show Open', guid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        startTimeSecs: 0, endTimeSecs: 185.5,
        commands: [
            { cueNumber: 1, iD: 'cue-001', name: 'Blackout', timeSecs: 0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 2, iD: 'cue-002', name: 'Logo Reveal', timeSecs: 5.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 3, iD: 'cue-003', name: 'Intro Video', timeSecs: 15.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 4, iD: 'cue-004', name: 'Speaker Intro', timeSecs: 65.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 5, iD: 'cue-005', name: 'Full Stage Look', timeSecs: 120.0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
        ],
    },
    {
        iD: 1, name: 'Keynote Presentation', guid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        startTimeSecs: 0, endTimeSecs: 2400,
        commands: [
            { cueNumber: 1, iD: 'cue-101', name: 'Title Slide', timeSecs: 0, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 2, iD: 'cue-102', name: 'Agenda', timeSecs: 30, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 3, iD: 'cue-103', name: 'Product Demo', timeSecs: 300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 4, iD: 'cue-104', name: 'Video Playback', timeSecs: 600, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 5, iD: 'cue-105', name: 'Q&A Background', timeSecs: 1200, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 6, iD: 'cue-106', name: 'Closing', timeSecs: 2100, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
        ],
    },
    {
        iD: 2, name: 'Awards Ceremony', guid: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        startTimeSecs: 0, endTimeSecs: 3600,
        commands: [
            { cueNumber: 1, iD: 'cue-201', name: 'Walk-in Loop', timeSecs: 0, type: 'Cue', isJumpTargetSet: true, jumpTarget: 'cue-201' },
            { cueNumber: 2, iD: 'cue-202', name: 'Welcome', timeSecs: 60, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 3, iD: 'cue-203', name: 'Nominee VT 1', timeSecs: 300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 4, iD: 'cue-204', name: 'Winner Reveal', timeSecs: 450, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 5, iD: 'cue-205', name: 'Nominee VT 2', timeSecs: 900, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 6, iD: 'cue-206', name: 'Winner Reveal 2', timeSecs: 1050, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
            { cueNumber: 7, iD: 'cue-207', name: 'Finale', timeSecs: 3300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
        ],
    },
    {
        iD: 3, name: 'Interval Loop', guid: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        startTimeSecs: 0, endTimeSecs: 600,
        commands: [
            { cueNumber: 1, iD: 'cue-301', name: 'Sponsor Loop Start', timeSecs: 0, type: 'Cue', isJumpTargetSet: true, jumpTarget: 'cue-301' },
            { cueNumber: 2, iD: 'cue-302', name: 'Countdown 5min', timeSecs: 300, type: 'Cue', isJumpTargetSet: false, jumpTarget: '' },
        ],
    },
];

function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }

const MEDIA_ITEMS = [
    { iD: uuid(), fileName: 'show_open_v3.mov', name: 'Show Open V3', fileType: 'mov', fileSize: 524288000, width: 3840, height: 2160, fps: 50, duration: 185.5, durationFrames: 9275, aspectRatio: 1.778, hasAlpha: false, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/Show', timeUploaded: '2026-03-28T10:30:00Z', mapIndexes: [1] },
    { iD: uuid(), fileName: 'logo_reveal_4k.mov', name: 'Logo Reveal 4K', fileType: 'mov', fileSize: 156000000, width: 3840, height: 2160, fps: 50, duration: 12, durationFrames: 600, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Graphics', timeUploaded: '2026-03-28T10:35:00Z', mapIndexes: [2] },
    { iD: uuid(), fileName: 'keynote_bg_loop.mp4', name: 'Keynote BG Loop', fileType: 'mp4', fileSize: 89000000, width: 1920, height: 1080, fps: 25, duration: 30, durationFrames: 750, aspectRatio: 1.778, hasAlpha: false, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Backgrounds', timeUploaded: '2026-03-28T11:00:00Z', mapIndexes: [3] },
    { iD: uuid(), fileName: 'particle_overlay.mov', name: 'Particle Overlay', fileType: 'mov', fileSize: 210000000, width: 1920, height: 1080, fps: 50, duration: 20, durationFrames: 1000, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Effects', timeUploaded: '2026-03-28T11:05:00Z', mapIndexes: [4] },
    { iD: uuid(), fileName: 'awards_nominees_vt1.mp4', name: 'Nominees VT 1', fileType: 'mp4', fileSize: 1200000000, width: 3840, height: 2160, fps: 25, duration: 120, durationFrames: 3000, aspectRatio: 1.778, hasAlpha: false, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/VTs', timeUploaded: '2026-03-29T09:00:00Z', mapIndexes: [5] },
    { iD: uuid(), fileName: 'winner_sting.mov', name: 'Winner Sting', fileType: 'mov', fileSize: 45000000, width: 1920, height: 1080, fps: 50, duration: 5, durationFrames: 250, aspectRatio: 1.778, hasAlpha: true, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/Graphics', timeUploaded: '2026-03-29T09:10:00Z', mapIndexes: [6] },
    { iD: uuid(), fileName: 'sponsor_loop.mp4', name: 'Sponsor Loop', fileType: 'mp4', fileSize: 350000000, width: 1920, height: 1080, fps: 25, duration: 120, durationFrames: 3000, aspectRatio: 1.778, hasAlpha: false, audioChannels: 2, audioSampleRate: 48000, canBeDeleted: true, folderPath: '/Content/Sponsors', timeUploaded: '2026-03-29T09:30:00Z', mapIndexes: [7] },
    { iD: uuid(), fileName: 'countdown_5min.mov', name: 'Countdown 5min', fileType: 'mov', fileSize: 180000000, width: 1920, height: 1080, fps: 25, duration: 300, durationFrames: 7500, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Graphics', timeUploaded: '2026-03-29T10:00:00Z', mapIndexes: [8] },
    { iD: uuid(), fileName: 'led_wall_abstract.mp4', name: 'LED Abstract', fileType: 'mp4', fileSize: 98000000, width: 2560, height: 720, fps: 50, duration: 60, durationFrames: 3000, aspectRatio: 3.556, hasAlpha: false, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/LED', timeUploaded: '2026-03-29T10:30:00Z', mapIndexes: [9] },
    { iD: uuid(), fileName: 'floor_map_grid.png', name: 'Floor Map Grid', fileType: 'png', fileSize: 5000000, width: 2048, height: 2048, fps: 0, duration: 0, durationFrames: 1, aspectRatio: 1.0, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Floor', timeUploaded: '2026-03-29T11:00:00Z', mapIndexes: [10] },
    { iD: uuid(), fileName: 'gradient_wash_blue.mp4', name: 'Gradient Blue', fileType: 'mp4', fileSize: 12000000, width: 1920, height: 1080, fps: 25, duration: 15, durationFrames: 375, aspectRatio: 1.778, hasAlpha: false, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Backgrounds', timeUploaded: '2026-03-30T08:00:00Z', mapIndexes: [11] },
    { iD: uuid(), fileName: 'confetti_overlay.mov', name: 'Confetti Overlay', fileType: 'mov', fileSize: 78000000, width: 1920, height: 1080, fps: 50, duration: 10, durationFrames: 500, aspectRatio: 1.778, hasAlpha: true, audioChannels: 0, audioSampleRate: 0, canBeDeleted: true, folderPath: '/Content/Effects', timeUploaded: '2026-03-30T08:15:00Z', mapIndexes: [12] },
];

const MEDIA_MAP = {
    entries: MEDIA_ITEMS.map((m, i) => ({ index: i + 1, mediaID: m.iD, name: m.name })),
};

function makePresets(type) {
    const bankNames = ['Show Looks', 'Backgrounds', 'Effects', 'Transitions'];
    const slotNames = {
        'Show Looks': ['Blackout', 'Full Stage', 'Keynote Mode', 'Awards Mode', 'Walk-in', 'Interval', 'Finale', 'Emergency'],
        'Backgrounds': ['Blue Gradient', 'Dark Abstract', 'Particles', 'Corporate', 'Starfield', 'Warm Glow'],
        'Effects': ['Confetti', 'Starburst', 'Fade In', 'Fade Out', 'Cross Dissolve', 'Wipe Left'],
        'Transitions': ['Cut', 'Dip Black', 'Dip White', 'Dissolve 1s', 'Dissolve 2s', 'Dissolve 5s'],
    };

    return {
        bankCount: bankNames.length,
        presetType: type,
        banks: bankNames.map((name, bi) => ({
            hasPresets: true,
            index: bi,
            name,
            thumbPreset: '',
            presets: (slotNames[name] || []).map((pname, si) => ({
                description: `${type} preset: ${pname}`,
                fadeTime: type === 'mix' ? [0, 0, 0.5, 1, 2, 5][si % 6] : [0, 0.5, 1][si % 3],
                fadeType: 'Linear',
                filters: '',
                iD: uuid(),
                index: si,
                name: pname,
                presetType: type,
            })),
        })),
    };
}

const MIX_PRESETS = makePresets('mix');
const LAYER_PRESETS = makePresets('layer');

// Mutable state
let mixLevels = { 0: 85, 1: 70, 2: 60, 3: 100 };
let layerLevels = {};
for (let m = 0; m < 4; m++) {
    const count = SERVER_INFO.mixes[m].layerCount;
    for (let l = 0; l < count; l++) {
        layerLevels[`${m}-${l}`] = Math.floor(Math.random() * 100);
    }
}

// Pin system mock
const PIN_VALUES = {
    'Engine': '1',
    'Engine/Mix1': '1',
    'Engine/Mix1/Layer1': '1',
    'Engine/Mix1/Layer1/Opacity': '78',
    'Engine/Mix1/Layer1/Media': MEDIA_ITEMS[0].name,
    'Engine/Mix1/Layer1/PlayMode': 'Loop',
    'Engine/Mix1/Layer1/Speed': '1.0',
    'Engine/Mix1/Layer1/PositionX': '0.5',
    'Engine/Mix1/Layer1/PositionY': '0.5',
    'Engine/Mix1/Layer1/ScaleX': '1.0',
    'Engine/Mix1/Layer1/ScaleY': '1.0',
    'Engine/Mix1/Layer1/Rotation': '0',
    'Engine/Mix1/MasterLevel': '85',
    'Engine/Mix2': '1',
    'Engine/Mix2/Layer1/Opacity': '70',
};

const PIN_INFO = {
    'Engine/Mix1/Layer1/Opacity': { dataType: 'Float', details: 'Range: 0-100', name: 'Opacity', pinType: 'Parameter' },
    'Engine/Mix1/Layer1/Speed': { dataType: 'Float', details: 'Range: -10 to 10', name: 'Speed', pinType: 'Parameter' },
    'Engine/Mix1/Layer1/PositionX': { dataType: 'Float', details: 'Range: 0-1', name: 'PositionX', pinType: 'Parameter' },
    'Engine/Mix1/Layer1/PositionY': { dataType: 'Float', details: 'Range: 0-1', name: 'PositionY', pinType: 'Parameter' },
    'Engine/Mix1/Layer1/ScaleX': { dataType: 'Float', details: 'Range: 0-10', name: 'ScaleX', pinType: 'Parameter' },
    'Engine/Mix1/Layer1/Rotation': { dataType: 'Float', details: 'Range: -360 to 360', name: 'Rotation', pinType: 'Parameter' },
    'Engine/Mix1/MasterLevel': { dataType: 'Int32', details: 'Range: 0-100', name: 'MasterLevel', pinType: 'Parameter' },
};

// ================================================================
// 1x1 transparent PNG as thumbnail placeholder
// ================================================================
const THUMB_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAABgCAYAAADVenpJAAAAiklEQVR42u3BMQEAAAjDIKC/p7E6gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgFcDSFgAAUFIlm4AAAAASUVORK5CYII=', 'base64');

// ================================================================
// REST API SERVER (Port 40512)
// ================================================================
const apiServer = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsed.pathname);
    const parts = pathname.split('/').filter(Boolean);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const json = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    const text = (msg) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(msg || 'OK'); };
    const png = () => { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(THUMB_PNG); };
    const err = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/html' }); res.end(msg || 'Error'); };

    try {
        // GET / or /docs
        if (pathname === '/' || pathname === '/docs') { text('<h1>Hippotizer Virtual API</h1><p>Demo server for Luxor Production</p>'); return; }

        // GET /info
        if (pathname === '/info') { json(SERVER_INFO); return; }

        // TIMELINES
        if (pathname === '/timelines') { json(TIMELINES); return; }
        if (pathname.startsWith('/timelines/all/')) {
            const action = parts[2];
            broadcast('SYSTEM', 'SYSTEM_STATUS_CHANGED', `All timelines: ${action}`);
            text(`All timelines ${action}`); return;
        }
        if (parts[0] === 'timelines' && parts.length >= 3) {
            const tlId = parseInt(parts[1]);
            const action = parts[2];
            if (action === 'gocue' && parts[3]) {
                broadcast('SYSTEM', 'SYSTEM_STATUS_CHANGED', `TL${tlId} go cue ${parts[3]}`);
            }
            text(`Timeline ${tlId} ${action}`); return;
        }

        // MEDIA
        if (pathname === '/media' && req.method === 'GET') { json(MEDIA_ITEMS); return; }
        if (pathname === '/media/map') { json(MEDIA_MAP); return; }
        if (pathname === '/media/sync') { broadcast('SYSTEM', 'SYSTEM_STATUS_CHANGED', 'Media sync started'); text('Sync started'); return; }

        if (parts[0] === 'media' && parts[1] === 'upload' && req.method === 'POST') {
            const newId = uuid();
            broadcast('MEDIA', 'MEDIAFILES_ADDED', [{ mediaID: newId }]);
            json({ mediaID: newId }); return;
        }

        if (parts[0] === 'media' && parts[1] === 'thumb') {
            png(); return;
        }

        if (parts[0] === 'media' && parts[1] === 'delete') {
            broadcast('MEDIA', 'MEDIAFILE_DELETED', parts[2]);
            text('Deleted'); return;
        }

        if (parts[0] === 'media' && parts[1] === 'deletemapentry') { text('Map entry removed'); return; }
        if (parts[0] === 'media' && parts[1] === 'addmapentry') { text('Map entry added'); return; }

        if (parts[0] === 'media' && parts[1]) {
            // GET /media/{mediaID} or /media/{mapIndex}
            const idx = parseInt(parts[1]);
            if (!isNaN(idx) && idx >= 1 && idx <= MEDIA_ITEMS.length) {
                json(MEDIA_ITEMS[idx - 1]); return;
            }
            const item = MEDIA_ITEMS.find(m => m.iD === parts[1]);
            if (item) { json(item); return; }
            json(MEDIA_ITEMS[0]); return;
        }

        // MIX CONTROL
        if (parts[0] === 'mix' && parts.length >= 3) {
            const mixIdx = parseInt(parts[1]);

            // /mix/{idx}/level
            if (parts[2] === 'level' && parts.length === 3) { json(mixLevels[mixIdx] ?? 0); return; }
            if (parts[2] === 'level' && parts[3]) {
                mixLevels[mixIdx] = parseInt(parts[3]);
                text('OK'); return;
            }

            // /mix/{idx}/preset/...
            if (parts[2] === 'preset') {
                broadcast('SYSTEM', 'SYSTEM_STATUS_CHANGED', `Mix ${mixIdx} preset loaded`);
                text('Preset loaded'); return;
            }

            // LAYER CONTROL: /mix/{idx}/layer/{lidx}/...
            if (parts[2] === 'layer' && parts.length >= 5) {
                const layerIdx = parseInt(parts[3]);
                const key = `${mixIdx}-${layerIdx}`;

                if (parts[4] === 'level' && parts.length === 5) { json(layerLevels[key] ?? 0); return; }
                if (parts[4] === 'level' && parts[5]) { layerLevels[key] = parseInt(parts[5]); text('OK'); return; }
                if (parts[4] === 'media') { text('Media loaded'); return; }
                if (parts[4] === 'preset') { text('Preset loaded'); return; }
                if (parts[4] === 'mediaoneshot') { text('One-shot triggered'); return; }
            }
        }

        // PRESETS
        if (parts[0] === 'presets') {
            if (parts[1] === 'mix') { json(MIX_PRESETS); return; }
            if (parts[1] === 'layer') { json(LAYER_PRESETS); return; }
            if (parts[1] === 'delete') { broadcast('PRESETS', 'PRESET_DELETED', parts[2]); text('Deleted'); return; }
            if (parts[1] === 'thumb') { png(); return; }
            // Default: treat as type
            if (parts[1]) { json(parts[1] === 'layer' ? LAYER_PRESETS : MIX_PRESETS); return; }
        }

        // PIN CONTROL
        if (parts[0] === 'pin') {
            const pinPath = parts.slice(2).join('/');

            if (parts[1] === 'getvalue') {
                const val = PIN_VALUES[pinPath];
                if (val !== undefined) { text(String(val)); return; }
                text('0'); return;
            }

            if (parts[1] === 'setvalue') {
                // /pin/setvalue/{path}/{value} — last part is value
                const valParts = parts.slice(2);
                const value = valParts.pop();
                const path = valParts.join('/');
                PIN_VALUES[path] = value;
                text(`Set ${path} = ${value}`); return;
            }

            if (parts[1] === 'reset') {
                PIN_VALUES[pinPath] = '0';
                text('Reset'); return;
            }

            if (parts[1] === 'getinfo') {
                const info = PIN_INFO[pinPath] || { dataType: 'String', details: '', name: pinPath.split('/').pop(), pinType: 'Parameter' };
                json(info); return;
            }

            if (parts[1] === 'fadevalue') {
                // /pin/fadevalue/{path}/{value}/{fadetime}
                text('Fade started'); return;
            }
        }

        // 404
        err(404, `Not found: ${pathname}`);

    } catch (e) {
        console.error('API Error:', e);
        err(500, e.message);
    }
});

// ================================================================
// WEBSOCKET CALLBACK SERVER (Port 40513)
// ================================================================
const wsServer = new WebSocketServer({ port: 40513 });
const wsClients = new Set();

wsServer.on('connection', (ws) => {
    console.log('[WS] Client connected');
    wsClients.add(ws);

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            // Handle subscription messages per spec
            if (Array.isArray(data)) {
                data.forEach(d => {
                    if (d.subscribe?.category) {
                        console.log(`[WS] Client subscribed to ${d.subscribe.category}`);
                    }
                });
            }
        } catch {}
    });

    ws.on('close', () => {
        wsClients.delete(ws);
        console.log('[WS] Client disconnected');
    });
});

function broadcast(category, event, data) {
    const msg = JSON.stringify({ category, event, data });
    wsClients.forEach(ws => {
        if (ws.readyState === 1) ws.send(msg);
    });
}

// Periodic demo events
setInterval(() => {
    if (wsClients.size > 0) {
        const events = [
            () => broadcast('SYSTEM', 'SYSTEM_STATUS_CHANGED', 'Running'),
        ];
        events[Math.floor(Math.random() * events.length)]();
    }
}, 15000);

// ================================================================
// START
// ================================================================
apiServer.listen(40512, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   VIRTUAL HIPPOTIZER — Demo Server       ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log('  ║  REST API:    http://localhost:40512      ║');
    console.log('  ║  WebSocket:   ws://localhost:40513        ║');
    console.log('  ║  Server Info: http://localhost:40512/info ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log('  ║  4 Mixes, 18 Layers, 4 Timelines         ║');
    console.log('  ║  12 Media Files, 24+ Presets              ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});
