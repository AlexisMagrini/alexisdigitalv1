/**
 * ============================================================
 * AlexisDigital Manager — App Core (app.js)
 * ============================================================
 * 
 * Central bootstrap file.
 * Handles: init sequence, theme, branding, version info.
 * 
 * Load order in index.html:
 *   1. database.js       ← data layer
 *   2. supabaseClient.js ← supabase connector
 *   3. auth.js           ← auth layer
 *   4. app.js            ← this file (bootstraps everything)
 * ============================================================
 */

window.APP_VERSION = '8.0.0';
window.APP_NAME    = 'AlexisDigital Manager';

/**
 * Main initialization sequence.
 * Called after DOM is ready and all scripts loaded.
 */
async function initApp() {
  console.log(`[app] Initializing ${window.APP_NAME} v${window.APP_VERSION}`);

  // 1. Sync localStorage → in-memory DB
  if (window.db) {
    await window.db.syncFromLocal();
  }

  // 2. Restore config + sistema from db
  try {
    const savedConfig  = await window.db.getItem('adm_config');
    const savedSistema = await window.db.getItem('adm_sistema');
    const savedTareas  = await window.db.getItem('adm_proy_tareas');
    if (savedConfig  && window.DB) window.DB.config  = { ...(window.DB.config  || {}), ...savedConfig };
    if (savedSistema && window.DB) window.DB.sistema = { ...(window.DB.sistema || {}), ...savedSistema };
    if (savedTareas  && window.DB) window.DB.proyecto_tareas = { ...(window.DB.proyecto_tareas || {}), ...savedTareas };
  } catch(e) { console.warn('[app] Config restore error:', e); }

  // 3. Apply theme
  const savedTheme = await window.db.getItem('adm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (typeof updateDMToggle === 'function') updateDMToggle(savedTheme);

  // 4. Apply branding + view modes + docs panel
  setTimeout(() => {
    if (typeof applySystemSettings === 'function') applySystemSettings();
    if (typeof _applyTopbarLogo    === 'function') _applyTopbarLogo();
    if (typeof _initViewBtns       === 'function') _initViewBtns();
    if (typeof renderDocumentosPanel === 'function') renderDocumentosPanel();
  }, 0);

  // 5. Init v7 systems (activity, reminders, widgets, autosave)
  if (typeof _loadActivityLog === 'function') _loadActivityLog();
  if (typeof _loadReminders   === 'function') _loadReminders();
  if (typeof _loadWidgets     === 'function') _loadWidgets();
  if (typeof _setupAutosave   === 'function') _setupAutosave();

  // 6. Populate client timeline
  _initClientTimeline();

  // 7. Seed activity log on first run
  if (typeof _activityLog !== 'undefined' && _activityLog.length === 0) {
    (window.DB?.clientes  || []).forEach(c => { if (c.creado)  logActivity('cliente',  `Cliente registrado: <strong>${c.nombre}</strong>`); });
    (window.DB?.proyectos || []).forEach(p => { if (p.inicio)  logActivity('proyecto', `Proyecto creado: <strong>${p.nombre}</strong>`); });
  }

  // 8. Auto-reminders for overdue invoices
  _checkOverdueReminders();

  console.log(`[app] Ready ✓ — storage mode: ${window.STORAGE_MODE || 'local'}`);
}

function _initClientTimeline() {
  if (!window.DB) return;
  (window.DB.clientes || []).forEach(c => {
    if (!window.DB.cliente_timeline[c.id]) window.DB.cliente_timeline[c.id] = [];
    if (window.DB.cliente_timeline[c.id].length === 0 && c.creado) {
      window.DB.cliente_timeline[c.id].push({ id: Date.now(), tipo:'creado', texto:'Cliente registrado en el sistema', fecha:c.creado });
    }
  });
  (window.DB?.presupuestos || []).forEach(pr => {
    if (pr.clienteId && pr.fecha)
      addTimelineEvent(pr.clienteId, 'presupuesto_enviado', `Presupuesto enviado: ${pr.descripcion||'Propuesta'}`, pr.fecha);
  });
  (window.DB?.proyectos || []).forEach(p => {
    if (p.clienteId && p.inicio)
      addTimelineEvent(p.clienteId, 'proyecto_iniciado', `Proyecto iniciado: ${p.nombre}`, p.inicio);
  });
  (window.DB?.facturas || []).forEach(f => {
    if (f.clienteId && f.fecha) {
      addTimelineEvent(f.clienteId, 'factura_creada',  `Factura creada: $${(window.fmt||String)(f.monto)}`, f.fecha);
      if (f.estado === 'pagada' && f.fechaPago)
        addTimelineEvent(f.clienteId, 'factura_pagada', `Factura pagada: $${(window.fmt||String)(f.monto)}`, f.fechaPago);
    }
  });
}

function _checkOverdueReminders() {
  if (typeof _loadReminders !== 'function') return;
  const tod = typeof today === 'function' ? today() : new Date().toISOString().split('T')[0];
  _loadReminders();
  (window.DB?.facturas || [])
    .filter(f => f.estado === 'pendiente' && f.vence && f.vence < tod)
    .forEach(f => {
      const key = `auto-fact-${f.id}`;
      if (!window._reminders?.find(r => r.ref === key)) {
        const sym = typeof fmtMoney === 'function' ? fmtMoney(f.monto) : `$${f.monto}`;
        window._reminders?.push({
          id: Date.now() + Math.random(),
          text: `Factura vencida: ${sym} de ${typeof getClienteName==='function' ? getClienteName(f.clienteId) : f.clienteId}`,
          date: tod, tipo: 'factura', ref: key, done: false, creado: tod,
        });
      }
    });
  if (typeof _saveReminders === 'function') _saveReminders();
}

/**
 * Persist theme change via db layer.
 */
async function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  await window.db.setItem('adm_theme', theme);
}

window.initApp = initApp;
window.setTheme = setTheme;
