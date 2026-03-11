/**
 * ============================================================
 * AlexisDigital Manager — Migration Service (migrationService.js)
 * ============================================================
 * 
 * Handles migration from localStorage → Supabase.
 * 
 * USAGE:
 *   // After connecting to Supabase:
 *   const result = await migrateLocalToSupabase();
 *   console.log(result); // { success: true, migrated: { clientes: 5, ... } }
 * ============================================================
 */

/**
 * Migrate all localStorage data to Supabase.
 * Only runs when STORAGE_MODE is "supabase" and client is ready.
 */
async function migrateLocalToSupabase() {
  if (window.STORAGE_MODE !== 'supabase') {
    console.warn('[migrate] Must be in supabase mode to migrate.');
    return { success: false, error: 'Not in supabase mode' };
  }
  if (!window._supabaseClient) {
    console.warn('[migrate] Supabase client not initialized.');
    return { success: false, error: 'Supabase not initialized' };
  }

  const tables = [
    'clientes','proyectos','presupuestos','facturas',
    'transacciones','tareas','leads','eventos',
    'contratos','archivos','plantillas_web',
    'email_templates','email_history','actividad',
  ];

  const migrated = {};
  const errors = {};

  for (const table of tables) {
    try {
      const map = window.db.TABLE_MAP[table];
      if (!map) continue;

      // Read from localStorage
      let data = [];
      try {
        const saved = localStorage.getItem(map.lsKey);
        if (saved) data = JSON.parse(saved);
      } catch(e) {}

      // Also try in-memory DB
      if (!data.length && map.dbKey && window.DB?.[map.dbKey]) {
        data = window.DB[map.dbKey];
      }

      if (!data.length) {
        migrated[table] = 0;
        continue;
      }

      // Enrich records with timestamps and user_id
      const userId = window.auth?.getUserId();
      const enriched = data.map(r => ({
        ...r,
        id: r.id || Date.now(),
        created_at: r.created_at || r.creado || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: userId || null,
      }));

      // Upsert to Supabase (insert or update if id exists)
      const { error } = await window._supabaseClient.from(table).upsert(enriched);
      if (error) {
        errors[table] = error.message;
        console.error(`[migrate] ${table}:`, error.message);
      } else {
        migrated[table] = enriched.length;
        console.log(`[migrate] ${table}: ${enriched.length} records migrated`);
      }
    } catch(e) {
      errors[table] = e.message;
    }
  }

  // Migrate KV store items
  const kvItems = [
    'adm_config','adm_sistema','adm_theme',
    'view_mode_clientes','view_mode_proyectos','view_mode_plantillas',
    'view_mode_presupuestos','view_mode_facturas',
    'activity_log','reminders','dashboard_widgets',
  ];

  for (const key of kvItems) {
    try {
      const val = localStorage.getItem(key);
      if (val) await db.setItem(key, val);
    } catch(e) {}
  }

  const totalMigrated = Object.values(migrated).reduce((a, v) => a + v, 0);
  const hasErrors = Object.keys(errors).length > 0;

  console.log(`[migrate] Done: ${totalMigrated} records migrated${hasErrors ? ' (with errors)' : ' ✓'}`);
  if (hasErrors) console.warn('[migrate] Errors:', errors);

  if (typeof showToast === 'function') {
    if (hasErrors) {
      showToast('warning', `Migración parcial: ${totalMigrated} registros (algunos errores)`);
    } else {
      showToast('success', `Migración completa: ${totalMigrated} registros transferidos ✓`);
    }
  }

  return { success: !hasErrors, migrated, errors, totalMigrated };
}

/**
 * Export all local data as a JSON file for backup.
 */
function exportLocalDataAsJSON() {
  const tables = [
    'clientes','proyectos','presupuestos','facturas',
    'transacciones','tareas','leads','eventos',
    'contratos','archivos','plantillas_web',
    'email_templates','email_history',
  ];
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: 7,
    tables: {}
  };
  tables.forEach(t => {
    const map = window.db?.TABLE_MAP[t];
    if (!map) return;
    try {
      const saved = localStorage.getItem(map.lsKey);
      exportData.tables[t] = saved ? JSON.parse(saved) : (window.DB?.[map.dbKey] || []);
    } catch(e) {
      exportData.tables[t] = window.DB?.[map.dbKey] || [];
    }
  });
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `alexisdigital-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  if (typeof showToast === 'function') showToast('success', 'Backup exportado correctamente');
  return exportData;
}

/**
 * Import data from a JSON backup file.
 * @param {File} file - The JSON file to import
 */
async function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.tables) throw new Error('Invalid backup format');
        let total = 0;
        Object.entries(data.tables).forEach(([table, records]) => {
          const map = window.db?.TABLE_MAP[table];
          if (!map) return;
          try {
            localStorage.setItem(map.lsKey, JSON.stringify(records));
            if (map.dbKey && window.DB) window.DB[map.dbKey] = records;
            total += records.length;
          } catch(err) {}
        });
        if (typeof showToast === 'function') showToast('success', `${total} registros importados. Recarga la página.`);
        resolve({ success: true, total });
      } catch(e) {
        if (typeof showToast === 'function') showToast('error', `Error al importar: ${e.message}`);
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

window.migrateLocalToSupabase = migrateLocalToSupabase;
window.exportLocalDataAsJSON  = exportLocalDataAsJSON;
window.importFromJSON         = importFromJSON;

console.log('[migration] Migration service loaded');
