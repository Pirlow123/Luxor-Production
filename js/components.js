/**
 * Luxor Production - Shared UI Components
 */
const UI = {
    toast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<i class="fas ${icons[type]} toast-icon"></i><span class="toast-message">${this.esc(message)}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = '0.2s'; setTimeout(() => el.remove(), 200); }, duration);
    },

    openModal(title, body, footer = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-footer').innerHTML = footer;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); },

    confirm(title, message) {
        return new Promise(resolve => {
            window._confirmResolve = resolve;
            this.openModal(title, `<p style="color:var(--text-secondary)">${message}</p>`,
                `<button class="btn" onclick="UI.closeModal();window._confirmResolve(false)">Cancel</button>
                 <button class="btn btn-danger" onclick="UI.closeModal();window._confirmResolve(true)">Confirm</button>`);
        });
    },

    statCard(icon, color, label, value, sub = '') {
        return `<div class="stat-card"><div class="stat-icon ${color}"><i class="fas ${icon}"></i></div><div class="stat-info"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div></div>`;
    },

    levelBar(value, max = 100) {
        const pct = Math.min(100, Math.max(0, (value / max) * 100));
        return `<div class="level-display"><div class="level-bar"><div class="level-fill" style="width:${pct}%"></div></div><span class="level-value">${Math.round(value)}%</span></div>`;
    },

    progressBar(pct, color = 'accent') {
        return `<div class="progress-bar"><div class="progress-fill ${color}" style="width:${pct}%"></div></div>`;
    },

    badge(text, color = 'cyan') { return `<span class="badge badge-${color}">${this.esc(text)}</span>`; },

    loading(msg = 'Loading...') { return `<div class="loading-state"><div class="spinner spinner-lg"></div><p>${msg}</p></div>`; },

    empty(icon, title, msg) { return `<div class="empty-state"><i class="fas ${icon}"></i><h3>${title}</h3><p>${msg}</p></div>`; },

    formGroup(label, html, help = '') {
        return `<div class="form-group"><label>${label}</label>${html}${help ? `<div class="form-help">${help}</div>` : ''}</div>`;
    },

    toggle(id, checked = false, onchange = '') {
        return `<label class="toggle-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${onchange ? `onchange="${onchange}"` : ''}><span class="toggle-slider"></span></label>`;
    },

    select(id, options, selected = '', cls = 'form-control') {
        return `<select id="${id}" class="${cls}">${options.map(o => {
            const v = typeof o === 'object' ? o.value : o;
            const l = typeof o === 'object' ? o.label : o;
            return `<option value="${v}" ${String(v) === String(selected) ? 'selected' : ''}>${l}</option>`;
        }).join('')}</select>`;
    },

    tabs(defs, active) {
        const btns = defs.map(t => `<button class="tab ${t.id === active ? 'active' : ''}" data-tab="${t.id}" onclick="UI.switchTab(this)">${t.label}</button>`).join('');
        const panels = defs.map(t => `<div class="tab-content ${t.id === active ? 'active' : ''}" id="tab-${t.id}">${t.content}</div>`).join('');
        return `<div class="tabs">${btns}</div>${panels}`;
    },

    switchTab(btn) {
        const parent = btn.closest('.tabs').parentElement || btn.parentElement.parentElement;
        btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        parent.querySelectorAll(':scope > .tab-content').forEach(c => c.classList.remove('active'));
        const target = parent.querySelector(`#tab-${btn.dataset.tab}`);
        if (target) target.classList.add('active');
    },

    formatBytes(b) {
        if (!b) return '0 B';
        const k = 1024, s = ['B','KB','MB','GB','TB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
    },

    formatDuration(secs) {
        if (!secs || secs <= 0) return '0:00';
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
        return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
    },

    formatTimestamp(iso) {
        if (!iso) return '--';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    esc(str) {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    },

    debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },

    async exportFile(defaultName, content, filters) {
        // Use Electron native save dialog if available
        if (window.luxorProject?.exportFile) {
            const result = await window.luxorProject.exportFile(defaultName, content, filters);
            if (result.ok) UI.toast('Exported to ' + result.path, 'success');
            return result.ok;
        }
        // Fallback: browser blob download
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    },
};
