/**
 * Macro Builder — Create, edit, and fire macro sequences
 * Actions: OSC Send, HTTP Request, Delay, Navigate, Toast
 * Storage: localStorage key 'luxor_macros'
 *
 * Pattern: render(), onActivate(), onDeactivate(), refresh(),
 *          renderSidebarList(), initSidebar()
 */
const MacroBuilderPage = {

    _macros: [],
    _selectedId: null,
    _editingMacro: null,        // deep copy while editing
    _runState: null,            // { macroId, stepIndex, running, aborted }
    _gridSize: '3x3',          // '2x2' | '2x3' | '3x3' | '3x4' | '4x4'
    _view: 'list',             // 'list' | 'editor' | 'grid'
    _dragIdx: null,

    _STORAGE_KEY: 'luxor_macros',
    _GRID_KEY: 'luxor_macros_grid_size',

    _ACTION_TYPES: {
        osc:      { label: 'OSC Send',     icon: 'fa-satellite-dish', color: 'var(--accent)' },
        http:     { label: 'HTTP Request',  icon: 'fa-globe',         color: 'var(--green)' },
        delay:    { label: 'Delay',         icon: 'fa-clock',         color: 'var(--warning, orange)' },
        navigate: { label: 'Navigate',      icon: 'fa-compass',       color: 'var(--text-muted)' },
        toast:    { label: 'Toast',         icon: 'fa-comment-dots',  color: '#c678dd' },
    },

    _ICONS: [
        'fa-play','fa-stop','fa-forward','fa-backward','fa-bolt','fa-star',
        'fa-fire','fa-rocket','fa-eye','fa-music','fa-video','fa-camera',
        'fa-lightbulb','fa-cog','fa-sliders-h','fa-broadcast-tower',
        'fa-film','fa-palette','fa-magic','fa-moon','fa-sun','fa-power-off',
        'fa-volume-up','fa-microphone','fa-headphones','fa-expand',
        'fa-compress','fa-shuffle','fa-repeat','fa-layer-group',
    ],

    _COLORS: [
        '#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6',
        '#1abc9c','#e67e22','#e91e63','#00bcd4','#8bc34a',
        '#ff5722','#607d8b','#795548','#ffc107','#673ab7',
    ],

    // ============================================================
    //  CSS (injected once)
    // ============================================================
    _injectCSS() {
        if (document.getElementById('macrobuilder-css')) return;
        const s = document.createElement('style');
        s.id = 'macrobuilder-css';
        s.textContent = `
/* Macro Builder */
.mb-page{display:flex;flex-direction:column;height:100%;gap:12px}
.mb-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.mb-header h2{margin:0;font-size:18px;font-weight:700}
.mb-header h2 i{color:var(--accent);margin-right:8px}
.mb-header .mb-actions{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.mb-tabs{display:flex;gap:4px;background:var(--bg-tertiary);border-radius:8px;padding:3px}
.mb-tab{padding:6px 14px;border-radius:6px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-weight:600;transition:all .15s}
.mb-tab:hover{color:var(--text-primary)}
.mb-tab.active{background:var(--accent);color:#fff}

/* Macro List */
.mb-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding:4px 0}
.mb-card{background:var(--bg-secondary);border:1px solid var(--border-color,rgba(255,255,255,.06));border-radius:10px;padding:14px;cursor:pointer;transition:all .15s;position:relative}
.mb-card:hover{border-color:var(--accent);transform:translateY(-1px)}
.mb-card.active{border-color:var(--accent);box-shadow:0 0 0 2px rgba(var(--accent-rgb,.15),0.25)}
.mb-card-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.mb-card-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;flex-shrink:0}
.mb-card-title{font-weight:600;font-size:13px;color:var(--text-primary)}
.mb-card-desc{font-size:11px;color:var(--text-muted);line-height:1.4;margin-bottom:8px;max-height:32px;overflow:hidden}
.mb-card-meta{display:flex;gap:8px;font-size:10px;color:var(--text-muted)}
.mb-card-meta span{display:flex;align-items:center;gap:3px}
.mb-card-actions{position:absolute;top:8px;right:8px;display:flex;gap:4px;opacity:0;transition:opacity .15s}
.mb-card:hover .mb-card-actions{opacity:1}
.mb-card-btn{width:24px;height:24px;border-radius:6px;border:none;background:var(--bg-tertiary);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px}
.mb-card-btn:hover{color:var(--text-primary);background:var(--accent)}

/* Editor */
.mb-editor{display:flex;flex-direction:column;gap:12px;flex:1;min-height:0}
.mb-editor-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.mb-editor-info{flex:1;min-width:200px;background:var(--bg-secondary);border-radius:10px;padding:14px;border:1px solid var(--border-color,rgba(255,255,255,.06))}
.mb-editor-info label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:600}
.mb-editor-info input,.mb-editor-info textarea,.mb-editor-info select{width:100%;margin-bottom:10px;padding:7px 10px;border-radius:6px;border:1px solid var(--border-color,rgba(255,255,255,.1));background:var(--bg-tertiary);color:var(--text-primary);font-size:12px;font-family:inherit;resize:vertical}
.mb-editor-info textarea{min-height:44px}
.mb-icon-pick{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.mb-icon-opt{width:28px;height:28px;border-radius:6px;border:2px solid transparent;background:var(--bg-tertiary);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .12s}
.mb-icon-opt:hover,.mb-icon-opt.sel{border-color:var(--accent);color:var(--accent)}
.mb-color-pick{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.mb-color-opt{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all .12s}
.mb-color-opt:hover,.mb-color-opt.sel{border-color:#fff;transform:scale(1.2)}

/* Steps */
.mb-steps-panel{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--bg-secondary);border-radius:10px;border:1px solid var(--border-color,rgba(255,255,255,.06));overflow:hidden}
.mb-steps-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border-color,rgba(255,255,255,.06))}
.mb-steps-head .title{font-size:13px;font-weight:600;color:var(--text-primary)}
.mb-steps-body{flex:1;overflow-y:auto;padding:10px}
.mb-step{background:var(--bg-tertiary);border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1px solid transparent;transition:all .15s}
.mb-step:hover{border-color:var(--accent)}
.mb-step-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.mb-step-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;color:#fff;text-transform:uppercase}
.mb-step-num{font-size:10px;color:var(--text-muted);font-weight:600;min-width:18px}
.mb-step-name{flex:1;font-size:12px;color:var(--text-primary);font-weight:500}
.mb-step-btns{display:flex;gap:3px}
.mb-step-btns button{width:22px;height:22px;border:none;border-radius:4px;background:none;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px}
.mb-step-btns button:hover{background:var(--bg-secondary);color:var(--text-primary)}
.mb-step-fields{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mb-step-fields label{font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px}
.mb-step-fields input,.mb-step-fields select,.mb-step-fields textarea{width:100%;padding:5px 8px;border-radius:5px;border:1px solid var(--border-color,rgba(255,255,255,.08));background:var(--bg-secondary);color:var(--text-primary);font-size:11px;font-family:inherit}
.mb-step-fields textarea{grid-column:1/-1;min-height:36px;resize:vertical}
.mb-step-fields .full{grid-column:1/-1}
.mb-step-empty{text-align:center;padding:40px;color:var(--text-muted);font-size:13px}

/* Runner */
.mb-runner{position:fixed;bottom:20px;right:20px;background:var(--bg-secondary);border:1px solid var(--accent);border-radius:10px;padding:14px 18px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:1000;min-width:260px}
.mb-runner-title{font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.mb-runner-bar{height:6px;border-radius:3px;background:var(--bg-tertiary);overflow:hidden;margin-bottom:8px}
.mb-runner-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .2s}
.mb-runner-step{font-size:11px;color:var(--text-muted);margin-bottom:8px}
.mb-runner-stop{border:none;background:var(--red,#e74c3c);color:#fff;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600}

/* Quick Fire Grid */
.mb-grid-config{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.mb-grid-config label{font-size:11px;color:var(--text-muted);font-weight:600}
.mb-grid-config select{padding:5px 8px;border-radius:6px;border:1px solid var(--border-color,rgba(255,255,255,.1));background:var(--bg-tertiary);color:var(--text-primary);font-size:12px}
.mb-fire-grid{display:grid;gap:10px}
.mb-fire-btn{border:none;border-radius:10px;padding:16px 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:all .12s;color:#fff;font-weight:600;font-size:12px;min-height:80px;text-shadow:0 1px 3px rgba(0,0,0,.3)}
.mb-fire-btn:hover{transform:scale(1.04);filter:brightness(1.15)}
.mb-fire-btn:active{transform:scale(0.97)}
.mb-fire-btn i{font-size:20px}
.mb-fire-btn.empty{background:var(--bg-tertiary);color:var(--text-muted);border:2px dashed var(--border-color,rgba(255,255,255,.1));text-shadow:none;cursor:default}
.mb-fire-btn.running{animation:mb-pulse 1s infinite}
@keyframes mb-pulse{0%,100%{opacity:1}50%{opacity:.6}}
`;
        document.head.appendChild(s);
    },

    // ============================================================
    //  DATA
    // ============================================================
    _load() {
        try {
            this._macros = JSON.parse(localStorage.getItem(this._STORAGE_KEY)) || [];
        } catch { this._macros = []; }
        this._gridSize = localStorage.getItem(this._GRID_KEY) || '3x3';
    },

    _save() {
        localStorage.setItem(this._STORAGE_KEY, JSON.stringify(this._macros));
    },

    _newId() {
        return 'macro_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    },

    _getMacro(id) {
        return this._macros.find(m => m.id === id) || null;
    },

    // ============================================================
    //  RENDER
    // ============================================================
    render() {
        this._injectCSS();
        this._load();

        return `
        <div class="mb-page">
            <div class="mb-header">
                <h2><i class="fas fa-wand-magic-sparkles"></i>Macro Builder</h2>
                <span class="badge" style="background:var(--bg-tertiary);font-size:10px">${this._macros.length} macros</span>
                <div class="mb-tabs">
                    <button class="mb-tab ${this._view === 'list' ? 'active' : ''}" onclick="MacroBuilderPage._switchView('list')"><i class="fas fa-list"></i> List</button>
                    <button class="mb-tab ${this._view === 'editor' ? 'active' : ''}" onclick="MacroBuilderPage._switchView('editor')"><i class="fas fa-pen-to-square"></i> Editor</button>
                    <button class="mb-tab ${this._view === 'grid' ? 'active' : ''}" onclick="MacroBuilderPage._switchView('grid')"><i class="fas fa-grip"></i> Quick Fire</button>
                </div>
                <div class="mb-actions">
                    <button class="btn btn-sm btn-primary" onclick="MacroBuilderPage._newMacro()"><i class="fas fa-plus"></i> New Macro</button>
                    <button class="btn btn-sm" onclick="MacroBuilderPage._importMacros()" title="Import JSON"><i class="fas fa-file-import"></i></button>
                    <button class="btn btn-sm" onclick="MacroBuilderPage._exportMacros()" title="Export JSON"><i class="fas fa-file-export"></i></button>
                </div>
            </div>
            <div id="mb-content" style="flex:1;min-height:0;display:flex;flex-direction:column">
                ${this._renderView()}
            </div>
        </div>`;
    },

    _renderView() {
        switch (this._view) {
            case 'editor': return this._renderEditor();
            case 'grid':   return this._renderGrid();
            default:       return this._renderList();
        }
    },

    // ---- List View ----
    _renderList() {
        if (this._macros.length === 0) {
            return `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
                <i class="fas fa-wand-magic-sparkles" style="font-size:40px;margin-bottom:12px;opacity:.3"></i>
                <h3 style="margin:0 0 6px">No Macros Yet</h3>
                <p style="font-size:12px">Create a macro to automate sequences of actions</p>
                <button class="btn btn-primary btn-sm" onclick="MacroBuilderPage._newMacro()" style="margin-top:10px"><i class="fas fa-plus"></i> Create First Macro</button>
            </div>`;
        }

        return `<div class="mb-list">${this._macros.map(m => this._renderCard(m)).join('')}</div>`;
    },

    _renderCard(m) {
        const at = this._ACTION_TYPES;
        const stepCount = (m.steps || []).length;
        return `
        <div class="mb-card ${this._selectedId === m.id ? 'active' : ''}" onclick="MacroBuilderPage._selectMacro('${m.id}')">
            <div class="mb-card-actions">
                <button class="mb-card-btn" onclick="event.stopPropagation();MacroBuilderPage._editMacro('${m.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="mb-card-btn" onclick="event.stopPropagation();MacroBuilderPage._duplicateMacro('${m.id}')" title="Duplicate"><i class="fas fa-copy"></i></button>
                <button class="mb-card-btn" onclick="event.stopPropagation();MacroBuilderPage._deleteMacro('${m.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
            <div class="mb-card-head">
                <div class="mb-card-icon" style="background:${UI.esc(m.color || '#3498db')}">
                    <i class="fas ${UI.esc(m.icon || 'fa-bolt')}"></i>
                </div>
                <div class="mb-card-title">${UI.esc(m.name || 'Untitled')}</div>
            </div>
            ${m.description ? `<div class="mb-card-desc">${UI.esc(m.description)}</div>` : ''}
            <div class="mb-card-meta">
                <span><i class="fas fa-layer-group"></i> ${stepCount} step${stepCount !== 1 ? 's' : ''}</span>
                ${m.steps && m.steps.length ? `<span><i class="fas ${at[m.steps[0].type]?.icon || 'fa-circle'}"></i> ${at[m.steps[0].type]?.label || m.steps[0].type}</span>` : ''}
            </div>
            <button class="btn btn-sm btn-primary" style="margin-top:10px;width:100%" onclick="event.stopPropagation();MacroBuilderPage.runMacro('${m.id}')"><i class="fas fa-play"></i> Run</button>
        </div>`;
    },

    // ---- Editor View ----
    _renderEditor() {
        const m = this._editingMacro;
        if (!m) {
            return `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
                <i class="fas fa-pen-to-square" style="font-size:36px;opacity:.3;margin-bottom:12px"></i>
                <p style="font-size:13px">Select a macro to edit, or create a new one</p>
            </div>`;
        }

        return `
        <div class="mb-editor">
            <div class="mb-editor-top">
                <div class="mb-editor-info">
                    <label>Name</label>
                    <input id="mb-name" value="${UI.esc(m.name || '')}" oninput="MacroBuilderPage._updateField('name',this.value)">

                    <label>Description</label>
                    <textarea id="mb-desc" oninput="MacroBuilderPage._updateField('description',this.value)">${UI.esc(m.description || '')}</textarea>

                    <label>Icon</label>
                    <div class="mb-icon-pick">
                        ${this._ICONS.map(ic => `<div class="mb-icon-opt ${m.icon === ic ? 'sel' : ''}" onclick="MacroBuilderPage._updateField('icon','${ic}');MacroBuilderPage._refreshEditor()"><i class="fas ${ic}"></i></div>`).join('')}
                    </div>

                    <label>Color</label>
                    <div class="mb-color-pick">
                        ${this._COLORS.map(c => `<div class="mb-color-opt ${m.color === c ? 'sel' : ''}" style="background:${c}" onclick="MacroBuilderPage._updateField('color','${c}');MacroBuilderPage._refreshEditor()"></div>`).join('')}
                    </div>

                    <div style="display:flex;gap:8px;margin-top:4px">
                        <button class="btn btn-sm btn-primary" onclick="MacroBuilderPage._saveMacro()"><i class="fas fa-check"></i> Save</button>
                        <button class="btn btn-sm" onclick="MacroBuilderPage._cancelEdit()">Cancel</button>
                        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="MacroBuilderPage.runMacro('${m.id}')"><i class="fas fa-play"></i> Test Run</button>
                    </div>
                </div>
            </div>

            <div class="mb-steps-panel">
                <div class="mb-steps-head">
                    <span class="title"><i class="fas fa-layer-group"></i> Steps (${(m.steps || []).length})</span>
                    <div style="margin-left:auto;display:flex;gap:4px">
                        ${Object.entries(this._ACTION_TYPES).map(([k, v]) =>
                            `<button class="btn btn-sm" style="font-size:10px" onclick="MacroBuilderPage._addStep('${k}')" title="Add ${v.label}"><i class="fas ${v.icon}" style="color:${v.color}"></i></button>`
                        ).join('')}
                    </div>
                </div>
                <div class="mb-steps-body" id="mb-steps-body">
                    ${this._renderSteps(m.steps || [])}
                </div>
            </div>
        </div>`;
    },

    _renderSteps(steps) {
        if (!steps.length) {
            return `<div class="mb-step-empty"><i class="fas fa-plus-circle" style="margin-right:6px"></i>Add steps using the buttons above</div>`;
        }

        return steps.map((step, i) => {
            const at = this._ACTION_TYPES[step.type] || { label: step.type, icon: 'fa-circle', color: '#888' };
            return `
            <div class="mb-step" data-idx="${i}">
                <div class="mb-step-head">
                    <span class="mb-step-num">#${i + 1}</span>
                    <span class="mb-step-badge" style="background:${at.color}"><i class="fas ${at.icon}"></i> ${at.label}</span>
                    <span class="mb-step-name">${UI.esc(step.label || '')}</span>
                    <div class="mb-step-btns">
                        ${i > 0 ? `<button onclick="MacroBuilderPage._moveStep(${i},-1)" title="Move Up"><i class="fas fa-arrow-up"></i></button>` : ''}
                        ${i < steps.length - 1 ? `<button onclick="MacroBuilderPage._moveStep(${i},1)" title="Move Down"><i class="fas fa-arrow-down"></i></button>` : ''}
                        <button onclick="MacroBuilderPage._removeStep(${i})" title="Remove"><i class="fas fa-times" style="color:var(--red,#e74c3c)"></i></button>
                    </div>
                </div>
                <div class="mb-step-fields">
                    ${this._renderStepFields(step, i)}
                </div>
            </div>`;
        }).join('');
    },

    _renderStepFields(step, idx) {
        const inp = (field, label, val, opts = '') =>
            `<div ${opts}><label>${label}</label><input value="${UI.esc(val || '')}" oninput="MacroBuilderPage._updateStep(${idx},'${field}',this.value)"></div>`;
        const sel = (field, label, val, options) =>
            `<div><label>${label}</label><select onchange="MacroBuilderPage._updateStep(${idx},'${field}',this.value)">${options.map(o => `<option value="${o.v}" ${val === o.v ? 'selected' : ''}>${UI.esc(o.l)}</option>`).join('')}</select></div>`;
        const area = (field, label, val) =>
            `<div class="full"><label>${label}</label><textarea oninput="MacroBuilderPage._updateStep(${idx},'${field}',this.value)">${UI.esc(val || '')}</textarea></div>`;

        switch (step.type) {
            case 'osc':
                return inp('address', 'OSC Address', step.address) +
                       inp('args', 'Arguments (comma-separated)', step.args) +
                       inp('host', 'Target IP', step.host) +
                       inp('port', 'Port', step.port) +
                       inp('label', 'Label', step.label, 'class="full"');
            case 'http':
                return inp('url', 'URL', step.url, 'class="full"') +
                       sel('method', 'Method', step.method || 'GET', [
                           { v: 'GET', l: 'GET' }, { v: 'POST', l: 'POST' },
                           { v: 'PUT', l: 'PUT' }, { v: 'DELETE', l: 'DELETE' },
                           { v: 'PATCH', l: 'PATCH' },
                       ]) +
                       inp('label', 'Label', step.label) +
                       area('body', 'Body (JSON)', step.body);
            case 'delay':
                return inp('ms', 'Delay (ms)', step.ms) +
                       inp('label', 'Label', step.label);
            case 'navigate':
                return sel('page', 'Page', step.page || 'dashboard', this._getPageOptions()) +
                       inp('label', 'Label', step.label);
            case 'toast':
                return inp('message', 'Message', step.message, 'class="full"') +
                       sel('level', 'Level', step.level || 'info', [
                           { v: 'info', l: 'Info' }, { v: 'success', l: 'Success' },
                           { v: 'warning', l: 'Warning' }, { v: 'error', l: 'Error' },
                       ]) +
                       inp('label', 'Label', step.label);
            default:
                return `<div class="full" style="color:var(--text-muted);font-size:11px">Unknown action type: ${UI.esc(step.type)}</div>`;
        }
    },

    _getPageOptions() {
        const pages = [
            'dashboard','showrun','mixes','timelines','presets','media','composition',
            'timecode','dmx','lighting','fixtures','pins','pixlgrid','sync',
            'network','nethealth','netswitch','ledsetup','ledcalc','ledconnect',
            'ledprocessor','ledpanel3d','stage3d','diagram','captureview','ptz',
            'dante','intercom','ipam','power','specifications','truckpack','logs',
            'settings','macrobuilder',
        ];
        return pages.map(p => ({ v: p, l: p.charAt(0).toUpperCase() + p.slice(1) }));
    },

    // ---- Quick Fire Grid ----
    _renderGrid() {
        const [cols, rows] = this._gridSize.split('x').map(Number);
        const total = cols * rows;

        return `
        <div class="mb-grid-config">
            <label>Grid Size</label>
            <select onchange="MacroBuilderPage._setGridSize(this.value)">
                ${['2x2','2x3','3x3','3x4','4x4'].map(s =>
                    `<option value="${s}" ${this._gridSize === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
            </select>
            <span style="font-size:11px;color:var(--text-muted)">${this._macros.length} macros available</span>
        </div>
        <div class="mb-fire-grid" style="grid-template-columns:repeat(${cols},1fr)">
            ${Array.from({ length: total }, (_, i) => {
                const m = this._macros[i];
                if (!m) return `<div class="mb-fire-btn empty"><i class="fas fa-plus" style="font-size:16px;opacity:.3"></i></div>`;
                const running = this._runState && this._runState.running && this._runState.macroId === m.id;
                return `<div class="mb-fire-btn ${running ? 'running' : ''}" style="background:${UI.esc(m.color || '#3498db')}" onclick="MacroBuilderPage.runMacro('${m.id}')" title="${UI.esc(m.name || '')}">
                    <i class="fas ${UI.esc(m.icon || 'fa-bolt')}"></i>
                    <span>${UI.esc(m.name || 'Untitled')}</span>
                </div>`;
            }).join('')}
        </div>`;
    },

    // ============================================================
    //  ACTIONS — CRUD
    // ============================================================
    _newMacro() {
        const m = {
            id: this._newId(),
            name: 'New Macro',
            description: '',
            icon: 'fa-bolt',
            color: this._COLORS[Math.floor(Math.random() * this._COLORS.length)],
            steps: [],
            createdAt: Date.now(),
        };
        this._macros.push(m);
        this._save();
        this._editingMacro = JSON.parse(JSON.stringify(m));
        this._selectedId = m.id;
        this._view = 'editor';
        this.refresh();
    },

    _selectMacro(id) {
        this._selectedId = id;
        this._editingMacro = JSON.parse(JSON.stringify(this._getMacro(id)));
        this._view = 'editor';
        this.refresh();
    },

    _editMacro(id) {
        this._selectMacro(id);
    },

    async _deleteMacro(id) {
        const m = this._getMacro(id);
        if (!m) return;
        const ok = await UI.confirm('Delete Macro', `Permanently delete "${UI.esc(m.name)}"?`);
        if (!ok) return;
        this._macros = this._macros.filter(x => x.id !== id);
        this._save();
        if (this._selectedId === id) { this._selectedId = null; this._editingMacro = null; }
        UI.toast('Macro deleted', 'success');
        this.refresh();
    },

    _duplicateMacro(id) {
        const src = this._getMacro(id);
        if (!src) return;
        const dup = JSON.parse(JSON.stringify(src));
        dup.id = this._newId();
        dup.name = src.name + ' (Copy)';
        dup.createdAt = Date.now();
        this._macros.push(dup);
        this._save();
        UI.toast('Macro duplicated', 'success');
        this.refresh();
    },

    // ============================================================
    //  EDITOR MUTATIONS
    // ============================================================
    _updateField(field, value) {
        if (!this._editingMacro) return;
        this._editingMacro[field] = value;
    },

    _addStep(type) {
        if (!this._editingMacro) return;
        const step = { type, label: '' };
        switch (type) {
            case 'osc':      step.address = '/'; step.args = ''; step.host = '127.0.0.1'; step.port = '8000'; break;
            case 'http':     step.url = 'http://'; step.method = 'GET'; step.body = ''; break;
            case 'delay':    step.ms = '1000'; break;
            case 'navigate': step.page = 'dashboard'; break;
            case 'toast':    step.message = ''; step.level = 'info'; break;
        }
        this._editingMacro.steps.push(step);
        this._refreshEditor();
    },

    _removeStep(idx) {
        if (!this._editingMacro) return;
        this._editingMacro.steps.splice(idx, 1);
        this._refreshEditor();
    },

    _moveStep(idx, dir) {
        if (!this._editingMacro) return;
        const steps = this._editingMacro.steps;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= steps.length) return;
        [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
        this._refreshEditor();
    },

    _updateStep(idx, field, value) {
        if (!this._editingMacro || !this._editingMacro.steps[idx]) return;
        this._editingMacro.steps[idx][field] = value;
    },

    _saveMacro() {
        if (!this._editingMacro) return;
        const idx = this._macros.findIndex(m => m.id === this._editingMacro.id);
        if (idx >= 0) {
            this._macros[idx] = JSON.parse(JSON.stringify(this._editingMacro));
        } else {
            this._macros.push(JSON.parse(JSON.stringify(this._editingMacro)));
        }
        this._save();
        UI.toast('Macro saved', 'success');
        this.refresh();
    },

    _cancelEdit() {
        this._editingMacro = null;
        this._view = 'list';
        this.refresh();
    },

    _refreshEditor() {
        const c = document.getElementById('mb-content');
        if (c) c.innerHTML = this._renderView();
    },

    _switchView(v) {
        this._view = v;
        if (v === 'editor' && !this._editingMacro && this._selectedId) {
            this._editingMacro = JSON.parse(JSON.stringify(this._getMacro(this._selectedId)));
        }
        this.refresh();
    },

    _setGridSize(s) {
        this._gridSize = s;
        localStorage.setItem(this._GRID_KEY, s);
        this._refreshEditor();
    },

    // ============================================================
    //  MACRO RUNNER
    // ============================================================
    async runMacro(id) {
        const m = this._getMacro(id);
        if (!m || !m.steps || m.steps.length === 0) {
            UI.toast('Macro has no steps', 'warning');
            return;
        }
        if (this._runState && this._runState.running) {
            UI.toast('A macro is already running', 'warning');
            return;
        }

        this._runState = { macroId: id, stepIndex: 0, running: true, aborted: false };
        this._showRunner(m);

        for (let i = 0; i < m.steps.length; i++) {
            if (this._runState.aborted) break;
            this._runState.stepIndex = i;
            this._updateRunner(m, i);

            try {
                await this._executeStep(m.steps[i]);
            } catch (e) {
                UI.toast(`Step ${i + 1} failed: ${e.message}`, 'error');
                console.error('[MacroBuilder] Step failed:', e);
            }
        }

        this._runState.running = false;
        this._hideRunner();
        if (!this._runState.aborted) {
            UI.toast(`Macro "${m.name}" completed`, 'success');
        } else {
            UI.toast(`Macro "${m.name}" stopped`, 'warning');
        }
        this._runState = null;
        // Refresh grid if visible
        if (this._view === 'grid') this._refreshEditor();
    },

    stopMacro() {
        if (this._runState) {
            this._runState.aborted = true;
        }
    },

    async _executeStep(step) {
        switch (step.type) {
            case 'osc':
                return this._execOSC(step);
            case 'http':
                return this._execHTTP(step);
            case 'delay':
                return new Promise(resolve => setTimeout(resolve, parseInt(step.ms, 10) || 0));
            case 'navigate':
                if (typeof HippoApp !== 'undefined' && HippoApp.navigate) {
                    HippoApp.navigate(step.page || 'dashboard');
                }
                return;
            case 'toast':
                UI.toast(step.message || '', step.level || 'info');
                return;
            default:
                console.warn('[MacroBuilder] Unknown step type:', step.type);
        }
    },

    async _execOSC(step) {
        try {
            const dgram = require('dgram');
            const client = dgram.createSocket('udp4');
            const host = step.host || '127.0.0.1';
            const port = parseInt(step.port, 10) || 8000;
            const address = step.address || '/';

            // Build a minimal OSC message
            const buf = this._buildOSCMessage(address, step.args || '');
            return new Promise((resolve, reject) => {
                client.send(buf, 0, buf.length, port, host, (err) => {
                    client.close();
                    if (err) reject(err); else resolve();
                });
            });
        } catch (e) {
            console.warn('[MacroBuilder] OSC send failed (dgram may not be available):', e.message);
            throw e;
        }
    },

    /**
     * Build a minimal OSC message buffer.
     * Format: address (null-padded to 4-byte boundary), type tag string, arguments
     */
    _buildOSCMessage(address, argsStr) {
        const args = argsStr ? argsStr.split(',').map(a => a.trim()).filter(Boolean) : [];

        function padStr(s) {
            const buf = Buffer.from(s + '\0', 'utf8');
            const pad = 4 - (buf.length % 4);
            return pad < 4 ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
        }

        const addrBuf = padStr(address);

        // Type tag: all args treated as strings
        let typeTag = ',';
        const argBuffers = [];
        for (const a of args) {
            const num = Number(a);
            if (!isNaN(num) && a !== '') {
                if (Number.isInteger(num)) {
                    typeTag += 'i';
                    const b = Buffer.alloc(4);
                    b.writeInt32BE(num, 0);
                    argBuffers.push(b);
                } else {
                    typeTag += 'f';
                    const b = Buffer.alloc(4);
                    b.writeFloatBE(num, 0);
                    argBuffers.push(b);
                }
            } else {
                typeTag += 's';
                argBuffers.push(padStr(a));
            }
        }

        const typeBuf = padStr(typeTag);
        return Buffer.concat([addrBuf, typeBuf, ...argBuffers]);
    },

    async _execHTTP(step) {
        const opts = { method: step.method || 'GET' };
        if (step.body && (step.method === 'POST' || step.method === 'PUT' || step.method === 'PATCH')) {
            opts.body = step.body;
            opts.headers = { 'Content-Type': 'application/json' };
        }
        const res = await fetch(step.url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return res;
    },

    // Runner overlay
    _showRunner(m) {
        this._hideRunner();
        const el = document.createElement('div');
        el.id = 'mb-runner-overlay';
        el.className = 'mb-runner';
        el.innerHTML = `
            <div class="mb-runner-title"><i class="fas fa-play"></i> Running: ${UI.esc(m.name)}</div>
            <div class="mb-runner-bar"><div class="mb-runner-fill" id="mb-runner-fill" style="width:0%"></div></div>
            <div class="mb-runner-step" id="mb-runner-step">Preparing...</div>
            <button class="mb-runner-stop" onclick="MacroBuilderPage.stopMacro()"><i class="fas fa-stop"></i> Stop</button>`;
        document.body.appendChild(el);
    },

    _updateRunner(m, idx) {
        const fill = document.getElementById('mb-runner-fill');
        const stepEl = document.getElementById('mb-runner-step');
        if (fill) fill.style.width = ((idx + 1) / m.steps.length * 100) + '%';
        if (stepEl) {
            const step = m.steps[idx];
            const at = this._ACTION_TYPES[step.type] || {};
            stepEl.textContent = `Step ${idx + 1}/${m.steps.length}: ${at.label || step.type} ${step.label ? '— ' + step.label : ''}`;
        }
    },

    _hideRunner() {
        const el = document.getElementById('mb-runner-overlay');
        if (el) el.remove();
    },

    // ============================================================
    //  IMPORT / EXPORT
    // ============================================================
    _exportMacros() {
        if (this._macros.length === 0) {
            UI.toast('No macros to export', 'warning');
            return;
        }
        const json = JSON.stringify(this._macros, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `luxor-macros-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast(`Exported ${this._macros.length} macros`, 'success');
    },

    _importMacros() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!Array.isArray(data)) throw new Error('Expected an array of macros');
                    let imported = 0;
                    for (const m of data) {
                        if (!m.id || !m.name) continue;
                        // Avoid duplicates by id
                        if (this._macros.find(x => x.id === m.id)) {
                            m.id = this._newId();
                        }
                        if (!m.steps) m.steps = [];
                        this._macros.push(m);
                        imported++;
                    }
                    this._save();
                    UI.toast(`Imported ${imported} macros`, 'success');
                    this.refresh();
                } catch (e) {
                    UI.toast('Import failed: ' + e.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // ============================================================
    //  SIDEBAR
    // ============================================================
    renderSidebarList() {
        // Macro Builder has no sidebar sub-items
    },

    initSidebar() {},

    // ============================================================
    //  LIFECYCLE
    // ============================================================
    onActivate() {
        this._injectCSS();
        this._load();
    },

    onDeactivate() {
        // Stop running macro if any
        if (this._runState && this._runState.running) {
            this.stopMacro();
        }
        this._hideRunner();
    },

    refresh() {
        const container = document.getElementById('page-container');
        if (container && appState.get('currentPage') === 'macrobuilder') {
            container.innerHTML = this.render();
        }
    },
};
