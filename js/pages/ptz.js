/**
 * PTZ Camera Controller — Full control for Panasonic AW-HE150/160 and BirdDog PTZ cameras
 * Supports pan/tilt/zoom, presets, focus, iris, white balance, gain, tally, image adjustments
 */
const PtzPage = {

    // ---- Camera Database ----
    _cameras: [], // { id, name, type: 'panasonic'|'birddog', ip, port, model, connected, tally: 'off'|'red'|'green', lastSeen }
    _selectedId: null,
    _pollTimer: null,
    _pollInterval: 2000,
    _ptzInterval: null, // For continuous PTZ movement
    _ptzMoving: false,

    // Camera model presets
    _models: {
        panasonic: ['AW-HE150', 'AW-HE160', 'AW-UE150', 'AW-UE160', 'AW-HE130', 'AW-HE40/50/60', 'AW-UE100', 'AW-UE80', 'AW-HN130', 'AW-HN40', 'Other Panasonic'],
        birddog: ['P200', 'P400', 'P4K', 'A200', 'A300', 'Mini', 'MAKI', 'X1', 'X1 Ultra', 'Other BirdDog'],
    },

    // ---- Panasonic CGI API ----
    _panasonic: {
        // Base URLs
        ptzUrl:  (ip) => `http://${ip}/cgi-bin/aw_ptz`,
        camUrl:  (ip) => `http://${ip}/cgi-bin/aw_cam`,
        eventUrl:(ip) => `http://${ip}/cgi-bin/event`,

        // PTZ Commands (sent as cmd= parameter via GET)
        commands: {
            // Pan/Tilt: speed 01-99 (50=stop), format #PTS{panSpeed}{tiltSpeed}
            panTilt:      (ps, ts) => `#PTS${ps.toString().padStart(2,'0')}${ts.toString().padStart(2,'0')}`,
            panTiltStop:  () => '#PTS5050',
            // Pan/Tilt to absolute position (hex 0000-FFFF)
            panTiltAbs:   (pan, tilt) => `#APC${pan}${tilt}`,
            // Pan/Tilt home
            home:         () => '#PTS5050',

            // Zoom: speed 01-99 (50=stop)
            zoom:         (speed) => `#Z${speed.toString().padStart(2,'0')}`,
            zoomStop:     () => '#Z50',
            // Zoom to position (hex 555-FFF)
            zoomAbs:      (pos) => `#AXZ${pos}`,

            // Focus
            focusAuto:    () => '#D11',
            focusManual:  () => '#D10',
            focus:        (speed) => `#F${speed.toString().padStart(2,'0')}`,
            focusStop:    () => '#F50',
            focusAbs:     (pos) => `#AXF${pos}`,

            // Iris
            irisAuto:     () => '#D31',
            irisManual:   () => '#D30',
            iris:         (speed) => `#I${speed.toString().padStart(2,'0')}`,
            irisStop:     () => '#I50',

            // Presets
            presetRecall: (n) => `#R${n.toString().padStart(2,'0')}`,
            presetStore:  (n) => `#M${n.toString().padStart(2,'0')}`,

            // Power
            powerOn:      () => '#O1',
            powerOff:     () => '#O0',

            // Tally (Program = red lamp, Preview = green lamp)
            tallyRed:     () => '#DA1',        // Red tally ON
            tallyGreen:   () => '#TLG1',       // Green tally ON (AW-HE/UE series preview lamp)
            tallyOff:     () => '#DA0',        // Red tally OFF
            tallyGreenOff:() => '#TLG0',       // Green tally OFF

            // Query
            queryPanTilt: () => '#APC',
            queryZoom:    () => '#GZ',
            queryFocus:   () => '#GF',
            queryIris:    () => '#GI',
            queryPreset:  () => '#S',
        },

        // Camera commands (aw_cam)
        camCommands: {
            // Gain
            gainAuto:     () => 'OGU:80',
            gainManual:   () => 'OGU:08',
            gainUp:       () => 'OGU:02',
            gainDown:     () => 'OGU:03',
            gainValue:    (v) => `OGU:${v.toString(16).toUpperCase().padStart(2,'0')}`,

            // White balance
            wbAuto1:      () => 'OAW:0',
            wbAuto2:      () => 'OAW:2',
            wbManual:     () => 'OAW:1',
            wbOnePush:    () => 'OWS',
            wbColorTemp:  (v) => `OSD:4C:${v.toString(16).toUpperCase().padStart(2,'0')}`,

            // Shutter
            shutterAuto:  () => 'OSJ:0A:0',
            shutterManual:() => 'OSJ:0A:1',
            shutterStep:  () => 'OSJ:03',
            shutterValue: (v) => `OSJ:06:${v}`,

            // Detail (sharpness)
            detail:       (v) => `OSD:48:${v.toString(16).toUpperCase().padStart(2,'0')}`,

            // Contrast/Pedestal
            pedestal:     (v) => `OTP:${v.toString(16).toUpperCase().padStart(2,'0')}`,

            // Saturation/Chroma
            chroma:       (v) => `OSD:49:${v.toString(16).toUpperCase().padStart(2,'0')}`,

            // Brightness / Master Ped
            masterPed:    (v) => `OSD:27:${v.toString(16).toUpperCase().padStart(2,'0')}`,

            // ND filter
            ndFilter:     (v) => `OFT:${v}`, // 0=Through, 1=1/4, 2=1/16, 3=1/64

            // Scene files
            sceneRecall:  (n) => `XSF:${n}`,

            // OSD menu
            osdOpen:      () => 'OSE:73:1',
            osdClose:     () => 'OSE:73:0',

            // Install position (desktop/hanging)
            installDesktop:  () => 'INS:0',
            installHanging:  () => 'INS:1',

            // Status query
            queryAll:     () => 'QSF',
            queryModel:   () => 'QID',
            queryGain:    () => 'QGU',
            queryWb:      () => 'QAW',
        },
    },

    // ---- BirdDog REST API ----
    _birddog: {
        baseUrl: (ip) => `http://${ip}:8080`,

        endpoints: {
            // Device info
            about:         { method: 'GET',  path: '/about' },
            hostname:      { method: 'GET',  path: '/hostname' },

            // PTZ Control
            ptzPosition:   { method: 'POST', path: '/ptz' },        // { pan, tilt, zoom }
            ptzHome:       { method: 'POST', path: '/ptz/home' },
            ptzStop:       { method: 'POST', path: '/ptz/stop' },
            ptzSpeed:      { method: 'POST', path: '/ptz/speed' },   // { PanSpeed, TiltSpeed }

            // Zoom
            zoomIn:        { method: 'POST', path: '/birddogptzcontrol', body: { ZoomDirect: '' } },
            zoomSpeed:     { method: 'POST', path: '/birddogptzcontrol' },

            // Presets
            presetRecall:  { method: 'POST', path: '/recall' },      // {Ession: "1" }
            presetStore:   { method: 'POST', path: '/store' },       // {Ession: "1" }
            presetList:    { method: 'GET',  path: '/presetall' },

            // Focus
            focusMode:     { method: 'POST', path: '/birddogptzcontrol' }, // FocusMode: "Auto"/"Manual"
            focusDirect:   { method: 'POST', path: '/birddogptzcontrol' },

            // Exposure
            expMode:       { method: 'POST', path: '/birddogexpsetup' },
            expSettings:   { method: 'GET',  path: '/birddogexpsetup' },

            // White balance
            wbMode:        { method: 'POST', path: '/birddogwbsetup' },
            wbSettings:    { method: 'GET',  path: '/birddogwbsetup' },

            // Image / Picture
            pictureSetup:  { method: 'POST', path: '/birddogpicsetup' },
            pictureGet:    { method: 'GET',  path: '/birddogpicsetup' },

            // NDI
            ndiConfig:     { method: 'POST', path: '/birddogndiconfig' },
            ndiGet:        { method: 'GET',  path: '/birddogndiconfig' },

            // Tally
            tally:         { method: 'POST', path: '/tally' },       // { TallyMode: "Off"/"PVW"/"PGM" }
            tallyGet:      { method: 'GET',  path: '/tally' },

            // Video output
            videoOutput:   { method: 'POST', path: '/birddogvidoutsetup' },
            videoGet:      { method: 'GET',  path: '/birddogvidoutsetup' },

            // Audio
            audioSetup:    { method: 'POST', path: '/birddogaudiosetup' },
            audioGet:      { method: 'GET',  path: '/birddogaudiosetup' },

            // Encode
            encodeSetup:   { method: 'POST', path: '/birddogencodesetup' },
            encodeGet:     { method: 'GET',  path: '/birddogencodesetup' },

            // PTZ control (detailed)
            ptzControl:    { method: 'POST', path: '/birddogptzcontrol' },
            ptzGet:        { method: 'GET',  path: '/birddogptzcontrol' },
        },
    },

    // ============================================================
    // RENDER
    // ============================================================
    render() {
        const cam = this._getSelected();
        return `
        <div class="section-header">
            <h2><i class="fas fa-video"></i> PTZ Camera Controller</h2>
            <div class="flex gap-sm">
                <button class="btn btn-sm" onclick="PtzPage._reconnectAll()" title="Reconnect all cameras"><i class="fas fa-sync-alt"></i> Reconnect</button>
                <button class="btn btn-sm btn-primary" onclick="PtzPage.showAddCamera()"><i class="fas fa-plus"></i> Add Camera</button>
            </div>
        </div>

        <div class="ptz-layout">
            <!-- Camera List Sidebar -->
            <div class="ptz-camera-list">
                <div class="card" style="height:100%">
                    <div class="card-header"><h3><i class="fas fa-list"></i> Cameras</h3></div>
                    <div class="card-body" style="padding:0" id="ptz-cam-list">
                        ${this._renderCameraList()}
                    </div>
                </div>
            </div>

            <!-- Main Control Area -->
            <div class="ptz-controls-area" id="ptz-controls">
                ${cam ? this._renderControls(cam) : this._renderNoCam()}
            </div>
        </div>
        `;
    },

    // ---- Camera List ----
    _renderCameraList() {
        if (this._cameras.length === 0) {
            return '<div class="text-muted" style="text-align:center;padding:20px;font-size:12px">No cameras added.<br>Click + Add Camera to get started.</div>';
        }
        return this._cameras.map(c => {
            const sel = c.id === this._selectedId;
            const dot = c.connected ? 'var(--green)' : 'var(--red)';
            const tallyColor = c.tally === 'red' ? '#e74c3c' : c.tally === 'green' ? '#2ecc71' : 'transparent';
            const brand = c.type === 'panasonic' ? 'Panasonic' : 'BirdDog';
            return `
                <div class="ptz-cam-card ${sel ? 'selected' : ''}" onclick="PtzPage.selectCamera('${c.id}')">
                    <div class="flex" style="align-items:center;gap:8px">
                        <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(c.name)}</div>
                            <div style="font-size:10px;color:var(--text-muted)">${brand} ${UI.esc(c.model)} &bull; ${UI.esc(c.ip)}</div>
                        </div>
                        <div style="width:10px;height:10px;border-radius:2px;background:${tallyColor};border:1px solid ${c.tally !== 'off' ? tallyColor : 'var(--border)'};flex-shrink:0" title="Tally: ${c.tally}"></div>
                        <button class="btn-icon" onclick="event.stopPropagation();PtzPage.removeCamera('${c.id}')" title="Remove"><i class="fas fa-times" style="font-size:10px"></i></button>
                    </div>
                </div>`;
        }).join('');
    },

    _renderNoCam() {
        return `
            <div style="display:flex;align-items:center;justify-content:center;height:400px;color:var(--text-muted)">
                <div style="text-align:center">
                    <i class="fas fa-video" style="font-size:48px;opacity:0.2;margin-bottom:16px;display:block"></i>
                    <p>Select a camera or add one to get started</p>
                </div>
            </div>`;
    },

    // ---- Main Controls ----
    _renderControls(cam) {
        return `
        <!-- Camera Status Bar -->
        <div class="ptz-status-bar">
            <div class="flex gap-md" style="align-items:center">
                <span style="font-weight:700;font-size:14px">${UI.esc(cam.name)}</span>
                <span class="badge ${cam.connected ? 'badge-success' : 'badge-danger'}">${cam.connected ? 'CONNECTED' : 'OFFLINE'}</span>
                <span class="badge" style="background:var(--bg-tertiary)">${cam.type === 'panasonic' ? 'Panasonic' : 'BirdDog'} ${UI.esc(cam.model)}</span>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-sm ${cam.tally === 'red' ? 'btn-danger' : ''}" onclick="PtzPage.setTally('${cam.id}','red')" title="Program Tally"><i class="fas fa-circle" style="color:${cam.tally === 'red' ? '#fff' : '#e74c3c'}"></i> PGM</button>
                <button class="btn btn-sm ${cam.tally === 'green' ? 'btn-success' : ''}" onclick="PtzPage.setTally('${cam.id}','green')" title="Preview Tally"><i class="fas fa-circle" style="color:${cam.tally === 'green' ? '#fff' : '#2ecc71'}"></i> PVW</button>
                <button class="btn btn-sm" onclick="PtzPage.setTally('${cam.id}','off')" title="Tally Off"><i class="fas fa-circle" style="color:var(--text-muted)"></i> Off</button>
                <span style="width:1px;background:var(--border);margin:0 4px"></span>
                <button class="btn btn-sm btn-success" onclick="PtzPage.powerOn('${cam.id}')" title="Power On"><i class="fas fa-power-off"></i> On</button>
                <button class="btn btn-sm btn-danger" onclick="PtzPage.powerOff('${cam.id}')" title="Power Off"><i class="fas fa-power-off"></i> Off</button>
            </div>
        </div>

        <div class="dashboard-panels" style="gap:12px">

            <!-- PTZ Joystick / Directional -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-arrows-alt"></i> Pan / Tilt / Zoom</h3></div>
                <div class="card-body" style="text-align:center">
                    <div class="ptz-dpad">
                        <button class="ptz-btn ptz-up" onmousedown="PtzPage._startMove('up')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-chevron-up"></i></button>
                        <button class="ptz-btn ptz-left" onmousedown="PtzPage._startMove('left')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-chevron-left"></i></button>
                        <button class="ptz-btn ptz-center" onclick="PtzPage.ptzHome()"><i class="fas fa-home"></i></button>
                        <button class="ptz-btn ptz-right" onmousedown="PtzPage._startMove('right')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-chevron-right"></i></button>
                        <button class="ptz-btn ptz-down" onmousedown="PtzPage._startMove('down')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-chevron-down"></i></button>
                        <button class="ptz-btn ptz-upleft" onmousedown="PtzPage._startMove('upleft')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-arrow-up" style="transform:rotate(-45deg)"></i></button>
                        <button class="ptz-btn ptz-upright" onmousedown="PtzPage._startMove('upright')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-arrow-up" style="transform:rotate(45deg)"></i></button>
                        <button class="ptz-btn ptz-downleft" onmousedown="PtzPage._startMove('downleft')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-arrow-down" style="transform:rotate(45deg)"></i></button>
                        <button class="ptz-btn ptz-downright" onmousedown="PtzPage._startMove('downright')" onmouseup="PtzPage._stopMove()" onmouseleave="PtzPage._stopMove()"><i class="fas fa-arrow-down" style="transform:rotate(-45deg)"></i></button>
                    </div>
                    <div style="margin-top:12px">
                        <label class="text-muted" style="font-size:11px">Pan/Tilt Speed</label>
                        <input type="range" id="ptz-pt-speed" min="1" max="49" value="25" style="width:100%">
                    </div>
                    <div class="flex gap-sm" style="margin-top:12px;justify-content:center">
                        <div style="flex:1">
                            <label class="text-muted" style="font-size:11px">Zoom</label>
                            <div class="flex gap-xs">
                                <button class="btn btn-sm" style="flex:1" onmousedown="PtzPage._startZoom('out')" onmouseup="PtzPage._stopZoom()" onmouseleave="PtzPage._stopZoom()"><i class="fas fa-search-minus"></i> W</button>
                                <button class="btn btn-sm" style="flex:1" onmousedown="PtzPage._startZoom('in')" onmouseup="PtzPage._stopZoom()" onmouseleave="PtzPage._stopZoom()"><i class="fas fa-search-plus"></i> T</button>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:8px">
                        <label class="text-muted" style="font-size:11px">Zoom Speed</label>
                        <input type="range" id="ptz-zoom-speed" min="1" max="49" value="25" style="width:100%">
                    </div>
                    <!-- Live position readout -->
                    <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;text-align:center;">
                        <div style="background:var(--bg-secondary);padding:4px 6px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                            <div style="font-size:9px;color:var(--text-muted)">PAN</div>
                            <div id="ptz-pan-val" style="font-size:11px;font-weight:700;font-family:monospace;color:var(--text-primary)">--</div>
                        </div>
                        <div style="background:var(--bg-secondary);padding:4px 6px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                            <div style="font-size:9px;color:var(--text-muted)">TILT</div>
                            <div id="ptz-tilt-val" style="font-size:11px;font-weight:700;font-family:monospace;color:var(--text-primary)">--</div>
                        </div>
                        <div style="background:var(--bg-secondary);padding:4px 6px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                            <div style="font-size:9px;color:var(--text-muted)">ZOOM</div>
                            <div id="ptz-zoom-val" style="font-size:11px;font-weight:700;font-family:monospace;color:var(--text-primary)">--</div>
                        </div>
                        <div style="background:var(--bg-secondary);padding:4px 6px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                            <div style="font-size:9px;color:var(--text-muted)">FOCUS</div>
                            <div id="ptz-focus-val" style="font-size:11px;font-weight:700;font-family:monospace;color:var(--text-primary)">--</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Presets -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-bookmark"></i> Presets</h3>
                    <select class="form-control" id="ptz-preset-mode" style="width:100px;font-size:11px">
                        <option value="recall">Recall</option>
                        <option value="store">Store</option>
                    </select>
                </div>
                <div class="card-body">
                    <div class="ptz-preset-grid">
                        ${Array.from({length: 20}, (_, i) => `
                            <button class="btn btn-sm ptz-preset-btn" onclick="PtzPage.preset(${i+1})" title="Preset ${i+1}">${i+1}</button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Focus & Iris -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-crosshairs"></i> Focus & Iris</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr>
                            <td class="text-muted">Focus Mode</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" id="ptz-focus-auto" onclick="PtzPage.setFocusMode('auto')">Auto</button>
                                    <button class="btn btn-sm" id="ptz-focus-manual" onclick="PtzPage.setFocusMode('manual')">Manual</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Focus</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" style="flex:1" onmousedown="PtzPage._startFocus('near')" onmouseup="PtzPage._stopFocus()" onmouseleave="PtzPage._stopFocus()"><i class="fas fa-minus"></i> Near</button>
                                    <button class="btn btn-sm" style="flex:1" onmousedown="PtzPage._startFocus('far')" onmouseup="PtzPage._stopFocus()" onmouseleave="PtzPage._stopFocus()"><i class="fas fa-plus"></i> Far</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Iris Mode</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" id="ptz-iris-auto" onclick="PtzPage.setIrisMode('auto')">Auto</button>
                                    <button class="btn btn-sm" id="ptz-iris-manual" onclick="PtzPage.setIrisMode('manual')">Manual</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Iris</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" style="flex:1" onmousedown="PtzPage._startIris('close')" onmouseup="PtzPage._stopIris()" onmouseleave="PtzPage._stopIris()"><i class="fas fa-minus"></i> Close</button>
                                    <button class="btn btn-sm" style="flex:1" onmousedown="PtzPage._startIris('open')" onmouseup="PtzPage._stopIris()" onmouseleave="PtzPage._stopIris()"><i class="fas fa-plus"></i> Open</button>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- White Balance & Gain -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-palette"></i> White Balance & Gain</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr>
                            <td class="text-muted">White Balance</td>
                            <td>
                                <div class="flex gap-xs" style="flex-wrap:wrap">
                                    <button class="btn btn-sm" onclick="PtzPage.setWhiteBalance('auto1')">AWB A</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setWhiteBalance('auto2')">AWB B</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setWhiteBalance('manual')">Manual</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setWhiteBalance('onepush')">One Push</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Color Temp</td>
                            <td>
                                <div class="flex gap-xs" style="align-items:center">
                                    <input type="range" id="ptz-colortemp" min="2800" max="6500" value="5600" step="100" oninput="PtzPage._updateColorTemp()" style="flex:1">
                                    <span id="ptz-colortemp-val" style="font-size:11px;min-width:50px;text-align:right">5600K</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Gain</td>
                            <td>
                                <div class="flex gap-xs" style="flex-wrap:wrap">
                                    <button class="btn btn-sm" onclick="PtzPage.setGain('auto')">Auto</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setGain('0db')">0dB</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setGain('6db')">6dB</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setGain('12db')">12dB</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setGain('18db')">18dB</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setGain('24db')">24dB</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">ND Filter</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" onclick="PtzPage.setND(0)">Off</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setND(1)">1/4</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setND(2)">1/16</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setND(3)">1/64</button>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Image Adjustments -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-sliders-h"></i> Image Adjustments</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        ${this._renderSlider('Detail / Sharpness', 'ptz-detail', 0, 255, 128, 'PtzPage._sendImageAdj("detail")')}
                        ${this._renderSlider('Contrast', 'ptz-contrast', 0, 255, 128, 'PtzPage._sendImageAdj("contrast")')}
                        ${this._renderSlider('Brightness', 'ptz-brightness', 0, 255, 128, 'PtzPage._sendImageAdj("brightness")')}
                        ${this._renderSlider('Saturation', 'ptz-saturation', 0, 255, 128, 'PtzPage._sendImageAdj("saturation")')}
                    </table>
                </div>
            </div>

            <!-- Shutter -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-tachometer-alt"></i> Shutter & Exposure</h3></div>
                <div class="card-body">
                    <table class="ledcalc-input-table">
                        <tr>
                            <td class="text-muted">Shutter Mode</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" onclick="PtzPage.setShutter('auto')">Auto</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setShutter('manual')">Manual</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Shutter Speed</td>
                            <td>
                                <select class="form-control" id="ptz-shutter-val" onchange="PtzPage._sendShutterVal()" style="width:140px">
                                    <option value="0">1/30</option>
                                    <option value="1">1/60</option>
                                    <option value="2" selected>1/90</option>
                                    <option value="3">1/100</option>
                                    <option value="4">1/125</option>
                                    <option value="5">1/180</option>
                                    <option value="6">1/250</option>
                                    <option value="7">1/350</option>
                                    <option value="8">1/500</option>
                                    <option value="9">1/750</option>
                                    <option value="A">1/1000</option>
                                    <option value="B">1/1500</option>
                                    <option value="C">1/2000</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">Install Mode</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" onclick="PtzPage.setInstall('desktop')"><i class="fas fa-desktop"></i> Desktop</button>
                                    <button class="btn btn-sm" onclick="PtzPage.setInstall('hanging')"><i class="fas fa-sort-amount-down"></i> Hanging</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="text-muted">OSD Menu</td>
                            <td>
                                <div class="flex gap-xs">
                                    <button class="btn btn-sm" onclick="PtzPage.osdMenu('open')"><i class="fas fa-tv"></i> Open</button>
                                    <button class="btn btn-sm" onclick="PtzPage.osdMenu('close')"><i class="fas fa-times"></i> Close</button>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Scene / Scene Files (Panasonic) -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-film"></i> Scene Files</h3></div>
                <div class="card-body">
                    <div class="ptz-preset-grid" style="grid-template-columns:repeat(4,1fr)">
                        ${Array.from({length: 8}, (_, i) => `
                            <button class="btn btn-sm" onclick="PtzPage.sceneRecall(${i+1})">Scene ${i+1}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    _renderSlider(label, id, min, max, def, onchange) {
        return `
            <tr>
                <td class="text-muted">${label}</td>
                <td>
                    <div class="flex gap-xs" style="align-items:center">
                        <input type="range" id="${id}" min="${min}" max="${max}" value="${def}" oninput="${onchange};document.getElementById('${id}-val').textContent=this.value" style="flex:1">
                        <span id="${id}-val" style="font-size:11px;min-width:30px;text-align:right">${def}</span>
                    </div>
                </td>
            </tr>`;
    },

    // ============================================================
    // CAMERA MANAGEMENT
    // ============================================================
    showAddCamera() {
        const html = `
            <div style="min-width:380px">
                <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04));border:1px solid rgba(59,130,246,0.3);border-radius:10px;padding:14px;margin-bottom:20px;text-align:center;">
                    <div style="font-size:12px;color:#3b82f6;font-weight:700;margin-bottom:6px;letter-spacing:0.5px;"><i class="fas fa-flask"></i> DEMO MODE</div>
                    <p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">No hardware? Try a virtual Panasonic AW-HE160 with realistic data.</p>
                    <button class="btn btn-sm" style="border-color:rgba(59,130,246,0.4);color:#3b82f6" onclick="UI.closeModal();PtzPage.addVirtualCamera()"><i class="fas fa-plus"></i> Create Virtual AW-HE160</button>
                </div>
                <div class="form-group">
                    <label>Camera Name</label>
                    <input class="form-control" id="ptz-add-name" placeholder="e.g. Camera 1 Front">
                </div>
                <div class="form-group">
                    <label>Camera Type</label>
                    <select class="form-control" id="ptz-add-type" onchange="PtzPage._onTypeChange()">
                        <option value="panasonic">Panasonic</option>
                        <option value="birddog">BirdDog</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <select class="form-control" id="ptz-add-model">
                        ${this._models.panasonic.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>IP Address</label>
                    <input class="form-control" id="ptz-add-ip" placeholder="192.168.1.100">
                </div>
            </div>`;
        UI.openModal('Add PTZ Camera', html,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-primary" onclick="PtzPage._confirmAddCamera()">Add Camera</button>`);
    },

    _confirmAddCamera() {
        const name = document.getElementById('ptz-add-name')?.value?.trim();
        const type = document.getElementById('ptz-add-type')?.value;
        const model = document.getElementById('ptz-add-model')?.value;
        const ip = document.getElementById('ptz-add-ip')?.value?.trim();
        if (!name || !ip) return UI.toast('Name and IP are required', 'error');
        UI.closeModal();
        this.addCamera({ name, type, model, ip });
    },

    _confirmRemoveCamera(id) {
        UI.closeModal();
        const cam = this._cameras.find(c => c.id === id);
        this._cameras = this._cameras.filter(c => c.id !== id);
        if (this._selectedId === id) this._selectedId = this._cameras[0]?.id || null;
        this._saveCameras();
        this._refreshAll();
        UI.toast(`Camera "${cam?.name}" removed`, 'info');
        appState.log('INFO', `PTZ camera removed: ${cam?.name}`, 'PTZ');
    },

    _confirmPowerOff(id) {
        UI.closeModal();
        const cam = this._cameras.find(c => c.id === id);
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.powerOff());
        }
        UI.toast(`Power OFF sent to ${cam.name}`, 'info');
    },

    _onTypeChange() {
        const type = document.getElementById('ptz-add-type')?.value;
        const modelSel = document.getElementById('ptz-add-model');
        if (!modelSel) return;
        const models = this._models[type] || [];
        modelSel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    },

    addCamera(cfg) {
        const cam = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: cfg.name,
            type: cfg.type || 'panasonic',
            model: cfg.model || 'AW-HE150',
            ip: cfg.ip,
            port: cfg.type === 'birddog' ? 8080 : 80,
            connected: false,
            tally: 'off',
            lastSeen: null,
        };
        this._cameras.push(cam);
        this._saveCameras();
        this._selectedId = cam.id;
        this._refreshAll();
        this._checkConnection(cam);
        UI.toast(`Camera "${cam.name}" added`, 'success');
        appState.log('INFO', `PTZ camera added: ${cam.name} (${cam.type} ${cam.model} @ ${cam.ip})`, 'PTZ');
    },

    removeCamera(id) {
        const cam = this._cameras.find(c => c.id === id);
        if (!cam) return;
        UI.openModal('Remove Camera', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Remove <strong>${UI.esc(cam.name)}</strong>?</p>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" onclick="PtzPage._confirmRemoveCamera('${id}')">Remove</button>`);
    },

    selectCamera(id) {
        this._selectedId = id;
        this._refreshAll();
        const cam = this._getSelected();
        if (cam) this._checkConnection(cam);
    },

    _getSelected() {
        return this._cameras.find(c => c.id === this._selectedId) || null;
    },

    // ---- Persistence ----
    _saveCameras() {
        const real = this._cameras.filter(c => !c.virtual).map(c => ({ id: c.id, name: c.name, type: c.type, model: c.model, ip: c.ip, port: c.port }));
        try { localStorage.setItem('luxor_ptz_cameras', JSON.stringify(real)); } catch {}
        const virt = this._cameras.filter(c => c.virtual);
        try { localStorage.setItem('luxor_ptz_cameras_virtual', JSON.stringify(virt)); } catch {}
    },

    _loadCameras() {
        try {
            const d = JSON.parse(localStorage.getItem('luxor_ptz_cameras') || '[]');
            this._cameras = d.map(c => ({ ...c, connected: false, tally: 'off', lastSeen: null }));
            const virt = JSON.parse(localStorage.getItem('luxor_ptz_cameras_virtual') || '[]');
            virt.forEach(v => { if (!this._cameras.find(c => c.id === v.id)) this._cameras.push(v); });
            if (this._cameras.length > 0 && !this._selectedId) this._selectedId = this._cameras[0].id;
        } catch { this._cameras = []; }
    },

    // ============================================================
    // API COMMUNICATION
    // ============================================================
    async _sendPanasonic(cam, type, cmd) {
        const url = type === 'ptz'
            ? `${this._panasonic.ptzUrl(cam.ip)}?cmd=${encodeURIComponent(cmd)}&res=1`
            : `${this._panasonic.camUrl(cam.ip)}?cmd=${encodeURIComponent(cmd)}&res=1`;
        try {
            const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
            const text = await resp.text();
            cam.connected = true;
            cam.lastSeen = Date.now();
            this._updateCamDot(cam);
            return text;
        } catch (e) {
            cam.connected = false;
            this._updateCamDot(cam);
            return null;
        }
    },

    async _sendBirddog(cam, endpoint, body) {
        const ep = this._birddog.endpoints[endpoint];
        if (!ep) return null;
        const url = `${this._birddog.baseUrl(cam.ip)}${ep.path}`;
        try {
            const opts = { method: ep.method, signal: AbortSignal.timeout(3000) };
            if (body && ep.method === 'POST') {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(body);
            }
            const resp = await fetch(url, opts);
            const text = await resp.text();
            cam.connected = true;
            cam.lastSeen = Date.now();
            this._updateCamDot(cam);
            try { return JSON.parse(text); } catch { return text; }
        } catch (e) {
            cam.connected = false;
            this._updateCamDot(cam);
            return null;
        }
    },

    async _checkConnection(cam) {
        if (cam.type === 'panasonic') {
            const res = await this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.queryModel());
            cam.connected = res !== null;
        } else {
            const res = await this._sendBirddog(cam, 'about');
            cam.connected = res !== null;
        }
        this._updateCamDot(cam);
    },

    _updateCamDot(cam) {
        // Update both main page list AND sidebar list
        const list = document.getElementById('ptz-cam-list');
        if (list) list.innerHTML = this._renderCameraList();
        this.renderSidebarList();
    },

    // ============================================================
    // PTZ MOVEMENT
    // ============================================================
    _startMove(dir) {
        this._stopMove();
        this._sendMoveCmd(dir);
        this._ptzInterval = setInterval(() => this._sendMoveCmd(dir), 200);
    },

    _stopMove() {
        if (this._ptzInterval) { clearInterval(this._ptzInterval); this._ptzInterval = null; }
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.panTiltStop());
        } else {
            this._sendBirddog(cam, 'ptzStop');
        }
    },

    _sendMoveCmd(dir) {
        const cam = this._getSelected();
        if (!cam) return;
        const speed = parseInt(document.getElementById('ptz-pt-speed')?.value) || 25;

        if (cam.type === 'panasonic') {
            // Pan: 01-49=left, 51-99=right, 50=stop. Tilt: 01-49=down, 51-99=up, 50=stop
            let ps = 50, ts = 50;
            const s = speed;
            if (dir.includes('left'))  ps = 50 - s;
            if (dir.includes('right')) ps = 50 + s;
            if (dir.includes('up'))    ts = 50 + s;
            if (dir.includes('down'))  ts = 50 - s;
            ps = Math.max(1, Math.min(99, ps));
            ts = Math.max(1, Math.min(99, ts));
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.panTilt(ps, ts));
        } else {
            // BirdDog: use VISCA-like speed mapping
            const panDir = dir.includes('left') ? -speed : dir.includes('right') ? speed : 0;
            const tiltDir = dir.includes('up') ? speed : dir.includes('down') ? -speed : 0;
            this._sendBirddog(cam, 'ptzControl', { PanSpeed: panDir.toString(), TiltSpeed: tiltDir.toString(), PanDir: panDir > 0 ? 'right' : panDir < 0 ? 'left' : 'stop', TiltDir: tiltDir > 0 ? 'up' : tiltDir < 0 ? 'down' : 'stop' });
        }
    },

    ptzHome() {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', '#APC7FFF7FFF'); // Center position
        } else {
            this._sendBirddog(cam, 'ptzHome');
        }
    },

    // ---- Zoom ----
    _startZoom(dir) {
        this._stopZoom();
        this._sendZoomCmd(dir);
        this._zoomInterval = setInterval(() => this._sendZoomCmd(dir), 200);
    },

    _stopZoom() {
        if (this._zoomInterval) { clearInterval(this._zoomInterval); this._zoomInterval = null; }
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.zoomStop());
        } else {
            this._sendBirddog(cam, 'ptzControl', { ZoomDirect: 'stop' });
        }
    },

    _sendZoomCmd(dir) {
        const cam = this._getSelected();
        if (!cam) return;
        const speed = parseInt(document.getElementById('ptz-zoom-speed')?.value) || 25;
        if (cam.type === 'panasonic') {
            const zs = dir === 'in' ? 50 + speed : 50 - speed;
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.zoom(Math.max(1, Math.min(99, zs))));
        } else {
            this._sendBirddog(cam, 'ptzControl', { ZoomDirect: dir === 'in' ? 'tele' : 'wide' });
        }
    },

    // ---- Focus ----
    _startFocus(dir) {
        this._stopFocus();
        this._sendFocusCmd(dir);
        this._focusInterval = setInterval(() => this._sendFocusCmd(dir), 200);
    },

    _stopFocus() {
        if (this._focusInterval) { clearInterval(this._focusInterval); this._focusInterval = null; }
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.focusStop());
        } else {
            this._sendBirddog(cam, 'ptzControl', { FocusDirect: 'stop' });
        }
    },

    _sendFocusCmd(dir) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            const fs = dir === 'far' ? 75 : 25;
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.focus(fs));
        } else {
            this._sendBirddog(cam, 'ptzControl', { FocusDirect: dir === 'far' ? 'far' : 'near' });
        }
    },

    setFocusMode(mode) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', mode === 'auto' ? this._panasonic.commands.focusAuto() : this._panasonic.commands.focusManual());
        } else {
            this._sendBirddog(cam, 'ptzControl', { FocusMode: mode === 'auto' ? 'Auto' : 'Manual' });
        }
    },

    // ---- Iris ----
    _startIris(dir) {
        this._stopIris();
        this._sendIrisCmd(dir);
        this._irisInterval = setInterval(() => this._sendIrisCmd(dir), 200);
    },

    _stopIris() {
        if (this._irisInterval) { clearInterval(this._irisInterval); this._irisInterval = null; }
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.irisStop());
        }
    },

    _sendIrisCmd(dir) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            const is = dir === 'open' ? 75 : 25;
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.iris(is));
        } else {
            this._sendBirddog(cam, 'expMode', { IrisDirect: dir === 'open' ? 'up' : 'down' });
        }
    },

    setIrisMode(mode) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', mode === 'auto' ? this._panasonic.commands.irisAuto() : this._panasonic.commands.irisManual());
        } else {
            this._sendBirddog(cam, 'expMode', { ExposureMode: mode === 'auto' ? 'FULL_AUTO' : 'MANUAL' });
        }
    },

    // ---- Presets ----
    preset(n) {
        const cam = this._getSelected();
        if (!cam) return;
        const mode = document.getElementById('ptz-preset-mode')?.value || 'recall';
        if (cam.type === 'panasonic') {
            const cmd = mode === 'store' ? this._panasonic.commands.presetStore(n) : this._panasonic.commands.presetRecall(n);
            this._sendPanasonic(cam, 'ptz', cmd);
        } else {
            const endpoint = mode === 'store' ? 'presetStore' : 'presetRecall';
            this._sendBirddog(cam, endpoint, {Ession: n.toString() });
        }
        UI.toast(`Preset ${n} ${mode === 'store' ? 'stored' : 'recalled'}`, 'info');
    },

    // ---- Tally ----
    setTally(id, state) {
        const cam = this._cameras.find(c => c.id === id);
        if (!cam) return;
        cam.tally = cam.tally === state ? 'off' : state; // Toggle

        if (cam.type === 'panasonic') {
            // Panasonic: red and green are separate lamp commands
            if (cam.tally === 'red') {
                this._sendPanasonic(cam, 'ptz', this._panasonic.commands.tallyGreenOff()); // green off
                this._sendPanasonic(cam, 'ptz', this._panasonic.commands.tallyRed());      // red on
            } else if (cam.tally === 'green') {
                this._sendPanasonic(cam, 'ptz', this._panasonic.commands.tallyOff());      // red off
                this._sendPanasonic(cam, 'ptz', this._panasonic.commands.tallyGreen());    // green on
            } else {
                this._sendPanasonic(cam, 'ptz', this._panasonic.commands.tallyOff());      // red off
                this._sendPanasonic(cam, 'ptz', this._panasonic.commands.tallyGreenOff()); // green off
            }
        } else {
            const mode = cam.tally === 'red' ? 'PGM' : cam.tally === 'green' ? 'PVW' : 'Off';
            this._sendBirddog(cam, 'tally', { TallyMode: mode });
        }
        this._updateCamDot(cam);
    },

    // ---- White Balance / Gain / ND ----
    setWhiteBalance(mode) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            const cmds = { auto1: 'wbAuto1', auto2: 'wbAuto2', manual: 'wbManual', onepush: 'wbOnePush' };
            this._sendPanasonic(cam, 'cam', this._panasonic.camCommands[cmds[mode]]());
        } else {
            const modes = { auto1: 'Auto1', auto2: 'Auto2', manual: 'Manual', onepush: 'OnePushWB' };
            this._sendBirddog(cam, 'wbMode', { WhiteBalance: modes[mode] || 'Auto1' });
        }
    },

    _updateColorTemp() {
        const val = document.getElementById('ptz-colortemp')?.value || 5600;
        document.getElementById('ptz-colortemp-val').textContent = val + 'K';
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            // Map 2800-6500 to hex range
            const hex = Math.round(((val - 2800) / 3700) * 255);
            this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.wbColorTemp(hex));
        } else {
            this._sendBirddog(cam, 'wbMode', { ColorTemp: val.toString() });
        }
    },

    setGain(val) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            if (val === 'auto') {
                this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.gainAuto());
            } else {
                const db = parseInt(val);
                const hexVal = Math.round((db / 36) * 255);
                this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.gainManual());
                this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.gainValue(hexVal));
            }
        } else {
            if (val === 'auto') {
                this._sendBirddog(cam, 'expMode', { GainMode: 'Auto' });
            } else {
                this._sendBirddog(cam, 'expMode', { GainMode: 'Manual', GainDirect: val.replace('db', '') });
            }
        }
    },

    setND(level) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.ndFilter(level));
        }
        // BirdDog cameras generally don't have ND filters
    },

    // ---- Image Adjustments ----
    _sendImageAdj(type) {
        const cam = this._getSelected();
        if (!cam) return;
        const val = parseInt(document.getElementById(`ptz-${type}`)?.value) || 128;
        if (cam.type === 'panasonic') {
            const cmds = { detail: 'detail', contrast: 'pedestal', brightness: 'masterPed', saturation: 'chroma' };
            this._sendPanasonic(cam, 'cam', this._panasonic.camCommands[cmds[type]](val));
        } else {
            const keys = { detail: 'Sharpness', contrast: 'Contrast', brightness: 'Brightness', saturation: 'Saturation' };
            this._sendBirddog(cam, 'pictureSetup', { [keys[type]]: val.toString() });
        }
    },

    // ---- Shutter ----
    setShutter(mode) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'cam', mode === 'auto' ? this._panasonic.camCommands.shutterAuto() : this._panasonic.camCommands.shutterManual());
        } else {
            this._sendBirddog(cam, 'expMode', { ShutterMode: mode === 'auto' ? 'Auto' : 'Manual' });
        }
    },

    _sendShutterVal() {
        const cam = this._getSelected();
        if (!cam) return;
        const val = document.getElementById('ptz-shutter-val')?.value || '2';
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.shutterValue(val));
        } else {
            const speeds = { '0': '1/30', '1': '1/60', '2': '1/90', '3': '1/100', '4': '1/125', '5': '1/180', '6': '1/250', '7': '1/350', '8': '1/500', '9': '1/750', 'A': '1/1000', 'B': '1/1500', 'C': '1/2000' };
            this._sendBirddog(cam, 'expMode', { ShutterDirect: speeds[val] || '1/90' });
        }
    },

    // ---- Install / OSD / Scene ----
    setInstall(mode) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'cam', mode === 'desktop' ? this._panasonic.camCommands.installDesktop() : this._panasonic.camCommands.installHanging());
        }
    },

    osdMenu(action) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'cam', action === 'open' ? this._panasonic.camCommands.osdOpen() : this._panasonic.camCommands.osdClose());
        }
    },

    sceneRecall(n) {
        const cam = this._getSelected();
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'cam', this._panasonic.camCommands.sceneRecall(n));
        }
        UI.toast(`Scene ${n} recalled`, 'info');
    },

    // ---- Power ----
    powerOn(id) {
        const cam = this._cameras.find(c => c.id === id);
        if (!cam) return;
        if (cam.type === 'panasonic') {
            this._sendPanasonic(cam, 'ptz', this._panasonic.commands.powerOn());
        }
        UI.toast(`Power ON sent to ${cam.name}`, 'success');
    },

    powerOff(id) {
        const cam = this._cameras.find(c => c.id === id);
        if (!cam) return;
        UI.openModal('Power Off', `
            <p style="text-align:center;padding:12px 0;"><i class="fas fa-power-off" style="color:var(--red);font-size:24px;"></i></p>
            <p style="text-align:center;font-size:13px;">Power off <strong>${UI.esc(cam.name)}</strong>?</p>`,
            `<button class="btn" onclick="UI.closeModal()">Cancel</button>
             <button class="btn btn-danger" onclick="PtzPage._confirmPowerOff('${id}')">Power Off</button>`);
    },

    // ============================================================
    // RECONNECT
    // ============================================================
    async _reconnectAll() {
        UI.toast('Reconnecting all cameras...', 'info');
        for (const cam of this._cameras) {
            if (!cam.virtual) await this._checkConnection(cam);
        }
        this._refreshAll();
        const online = this._cameras.filter(c => c.connected).length;
        UI.toast(`${online}/${this._cameras.length} cameras connected`, online > 0 ? 'success' : 'error');
    },

    // ============================================================
    // POLLING
    // ============================================================
    _startPolling() {
        this._stopPolling();
        this._pollTimer = setInterval(() => this._pollAll(), this._pollInterval);
    },

    _stopPolling() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    },

    async _pollAll() {
        for (const cam of this._cameras) {
            if (!cam.virtual) {
                await this._checkConnection(cam);
                // Also poll position values for the selected camera
                if (cam.connected && cam.id === this._selectedId) {
                    await this._pollPosition(cam);
                }
            }
        }
    },

    async _pollPosition(cam) {
        if (cam.type === 'panasonic') {
            // Query pan/tilt position
            const ptRes = await this._sendPanasonic(cam, 'ptz', this._panasonic.commands.queryPanTilt());
            if (ptRes) {
                // Response format: aPC<pan_hex><tilt_hex> e.g. aPC7FFF7FFF
                const m = ptRes.match(/aPC([0-9A-Fa-f]{4})([0-9A-Fa-f]{4})/);
                if (m) {
                    cam._panPos = parseInt(m[1], 16);
                    cam._tiltPos = parseInt(m[2], 16);
                }
            }
            // Query zoom position
            const zRes = await this._sendPanasonic(cam, 'ptz', this._panasonic.commands.queryZoom());
            if (zRes) {
                const zm = zRes.match(/gz([0-9A-Fa-f]{3})/);
                if (zm) cam._zoomPos = parseInt(zm[1], 16);
            }
            // Query focus position
            const fRes = await this._sendPanasonic(cam, 'ptz', this._panasonic.commands.queryFocus());
            if (fRes) {
                const fm = fRes.match(/gf([0-9A-Fa-f]{3})/);
                if (fm) cam._focusPos = parseInt(fm[1], 16);
            }
            // Update position display
            this._updatePositionDisplay(cam);
        }
    },

    _updatePositionDisplay(cam) {
        const panEl = document.getElementById('ptz-pan-val');
        const tiltEl = document.getElementById('ptz-tilt-val');
        const zoomEl = document.getElementById('ptz-zoom-val');
        const focusEl = document.getElementById('ptz-focus-val');
        if (panEl && cam._panPos !== undefined) {
            const panDeg = ((cam._panPos - 0x7FFF) / 0x7FFF * 175).toFixed(1);
            panEl.textContent = `${panDeg > 0 ? '+' : ''}${panDeg}\u00B0`;
        }
        if (tiltEl && cam._tiltPos !== undefined) {
            const tiltDeg = ((cam._tiltPos - 0x7FFF) / 0x7FFF * 30).toFixed(1);
            tiltEl.textContent = `${tiltDeg > 0 ? '+' : ''}${tiltDeg}\u00B0`;
        }
        if (zoomEl && cam._zoomPos !== undefined) {
            const zoomPct = (cam._zoomPos / 0xFFF * 100).toFixed(0);
            zoomEl.textContent = `${zoomPct}%`;
        }
        if (focusEl && cam._focusPos !== undefined) {
            const focusPct = (cam._focusPos / 0xFFF * 100).toFixed(0);
            focusEl.textContent = `${focusPct}%`;
        }
    },

    // ============================================================
    // SIDEBAR CAMERA LIST
    // ============================================================
    renderSidebarList() {
        const container = document.getElementById('ptz-camera-list');
        if (!container) return;
        if (this._cameras.length === 0) {
            container.innerHTML = '<div style="font-size:10px;color:var(--text-muted);text-align:center;padding:4px">No cameras</div>';
            return;
        }
        container.innerHTML = this._cameras.map(c => {
            const dot = c.connected ? 'var(--green)' : 'var(--red)';
            const tallyBg = c.tally === 'red' ? 'rgba(231,76,60,0.15)' : c.tally === 'green' ? 'rgba(46,204,113,0.15)' : '';
            const brand = c.type === 'panasonic' ? 'Panasonic' : 'BirdDog';
            return `
                <div class="server-card" style="cursor:pointer;${tallyBg ? 'background:' + tallyBg : ''}" onclick="PtzPage.selectCamera('${c.id}');HippoApp.navigate('ptz')">
                    <div style="display:flex;align-items:center;gap:6px">
                        <div style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0"></div>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${UI.esc(c.name)}</div>
                            <div style="font-size:9px;color:var(--text-muted)">${brand} ${UI.esc(c.model)}</div>
                        </div>
                        <button class="server-card-remove" onclick="event.stopPropagation();PtzPage.removeCamera('${c.id}')" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    },

    initSidebar() {
        this._loadCameras();
        this.renderSidebarList();
    },

    addVirtualCamera() {
        const id = 'virtual-awhe160-' + Date.now().toString(36);
        const cam = {
            id,
            name: 'Virtual AW-HE160 (Demo)',
            type: 'panasonic',
            model: 'AW-HE160',
            ip: '192.168.1.110',
            port: 80,
            connected: true,
            virtual: true,
            tally: 'off',
            lastSeen: Date.now(),
        };
        this._cameras.push(cam);
        this._saveCameras();
        this._selectedId = id;
        this._refreshAll();
        this.renderSidebarList();
        UI.toast('Virtual Panasonic AW-HE160 created', 'success');
    },

    // ============================================================
    // REFRESH / LIFECYCLE
    // ============================================================
    _refreshAll() {
        const list = document.getElementById('ptz-cam-list');
        const controls = document.getElementById('ptz-controls');
        if (list) list.innerHTML = this._renderCameraList();
        const cam = this._getSelected();
        if (controls) controls.innerHTML = cam ? this._renderControls(cam) : this._renderNoCam();
        this.renderSidebarList();
    },

    onActivate() {
        this._loadCameras();
        this._startPolling();
        this.renderSidebarList();
    },

    _initVirtualDemo() {
        // No auto-spawn — virtual demos are created manually via Add Camera dialog
    },

    onDeactivate() {
        this._stopPolling();
        this._stopMove();
        this._stopZoom();
    },
};
