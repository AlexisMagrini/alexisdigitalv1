/**
 * ============================================================
 * AlexisDigital Manager — Data Layer (database.js)
 * ============================================================
 * 
 * Unified data access layer that abstracts storage backend.
 * Supports two modes:
 *   "local"    → localStorage (current, fully functional)
 *   "supabase" → Supabase REST API (future)
 * 
 * Switch mode via: window.STORAGE_MODE = "local" | "supabase"
 * 
 * API:
 *   db.getAll(table)              → Promise<array>
 *   db.get(table, id)             → Promise<object|null>
 *   db.create(table, data)        → Promise<object>
 *   db.update(table, id, data)    → Promise<object>
 *   db.delete(table, id)          → Promise<boolean>
 *   db.query(table, filters)      → Promise<array>
 *   db.setItem(key, value)        → Promise<void>  (raw KV)
 *   db.getItem(key)               → Promise<any>   (raw KV)
 *   db.removeItem(key)            → Promise<void>  (raw KV)
 * ============================================================
 */

window.STORAGE_MODE = window.STORAGE_MODE || "local";

/* ── TABLE MAP ─────────────────────────────────────────────────
   Maps logical table names to localStorage keys and DB arrays.
   This is the single source of truth for data mapping.
──────────────────────────────────────────────────────────────── */
const TABLE_MAP = {
  clientes:          { lsKey: 'adm_clientes',          dbKey: 'clientes' },
  proyectos:         { lsKey: 'adm_proyectos',         dbKey: 'proyectos' },
  presupuestos:      { lsKey: 'adm_presupuestos',      dbKey: 'presupuestos' },
  facturas:          { lsKey: 'adm_facturas',          dbKey: 'facturas' },
  transacciones:     { lsKey: 'adm_transacciones',     dbKey: 'transacciones' },
  tareas:            { lsKey: 'adm_tareas',            dbKey: 'tareas' },
  leads:             { lsKey: 'adm_leads',             dbKey: 'leads' },
  eventos:           { lsKey: 'adm_eventos',           dbKey: 'eventos' },
  contratos:         { lsKey: 'adm_contratos',         dbKey: 'contratos' },
  archivos:          { lsKey: 'adm_archivos',          dbKey: 'archivos' },
  plantillas_web:    { lsKey: 'adm_plantillas_web',    dbKey: 'plantillas_web' },
  pipeline_estados:  { lsKey: 'adm_pipeline_estados',  dbKey: 'pipeline_estados' },
  email_templates:   { lsKey: 'adm_email_templates',   dbKey: 'email_templates' },
  email_history:     { lsKey: 'adm_email_history',     dbKey: 'email_history' },
  usuarios:          { lsKey: 'adm_usuarios',          dbKey: 'usuarios' },
  actividad:         { lsKey: 'adm_actividad',         dbKey: 'actividad' },
  activity_log:      { lsKey: 'activity_log',          dbKey: null },
  reminders:         { lsKey: 'reminders',             dbKey: null },
  drafts:            { lsKey: 'adm_drafts',            dbKey: null },
  config:            { lsKey: 'adm_config',            dbKey: 'config' },
  sistema:           { lsKey: 'adm_sistema',           dbKey: 'sistema' },
};

/* ── TIMESTAMP HELPER ───────────────────────────────────────── */
function _now() { return new Date().toISOString(); }
function _enrichRecord(data) {
  return {
    ...data,
    id: data.id || Date.now(),
    created_at: data.created_at || _now(),
    updated_at: _now(),
  };
}

/* ════════════════════════════════════════════════════════════
   LOCAL STORAGE ADAPTER
════════════════════════════════════════════════════════════ */
const localAdapter = {

  /** Get all records from a table (falls back to DB in-memory array) */
  async getAll(table) {
    const map = TABLE_MAP[table];
    if (!map) return [];
    try {
      const saved = localStorage.getItem(map.lsKey);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    // Fall back to in-memory DB
    if (map.dbKey && window.DB && window.DB[map.dbKey]) {
      return window.DB[map.dbKey];
    }
    return [];
  },

  /** Get single record by id */
  async get(table, id) {
    const list = await localAdapter.getAll(table);
    return list.find(r => String(r.id) === String(id)) || null;
  },

  /** Create a new record */
  async create(table, data) {
    const map = TABLE_MAP[table];
    if (!map) throw new Error(`Unknown table: ${table}`);
    const list = await localAdapter.getAll(table);
    const record = _enrichRecord(data);
    list.push(record);
    await localAdapter._saveTable(table, list);
    // Sync in-memory DB
    if (map.dbKey && window.DB && Array.isArray(window.DB[map.dbKey])) {
      window.DB[map.dbKey] = list;
    }
    return record;
  },

  /** Update an existing record by id */
  async update(table, id, data) {
    const map = TABLE_MAP[table];
    if (!map) throw new Error(`Unknown table: ${table}`);
    const list = await localAdapter.getAll(table);
    const idx = list.findIndex(r => String(r.id) === String(id));
    if (idx === -1) throw new Error(`Record ${id} not found in ${table}`);
    list[idx] = { ...list[idx], ...data, updated_at: _now() };
    await localAdapter._saveTable(table, list);
    if (map.dbKey && window.DB && Array.isArray(window.DB[map.dbKey])) {
      window.DB[map.dbKey] = list;
    }
    return list[idx];
  },

  /** Delete a record by id */
  async delete(table, id) {
    const map = TABLE_MAP[table];
    if (!map) throw new Error(`Unknown table: ${table}`);
    const list = await localAdapter.getAll(table);
    const newList = list.filter(r => String(r.id) !== String(id));
    await localAdapter._saveTable(table, newList);
    if (map.dbKey && window.DB && Array.isArray(window.DB[map.dbKey])) {
      window.DB[map.dbKey] = newList;
    }
    return true;
  },

  /** Query with filters: { field: value, field__gt: value, field__contains: value } */
  async query(table, filters = {}) {
    let list = await localAdapter.getAll(table);
    Object.entries(filters).forEach(([key, val]) => {
      if (key.endsWith('__gt'))     { const f=key.slice(0,-4); list=list.filter(r=>r[f]>val); }
      else if (key.endsWith('__lt'))     { const f=key.slice(0,-4); list=list.filter(r=>r[f]<val); }
      else if (key.endsWith('__gte'))    { const f=key.slice(0,-5); list=list.filter(r=>r[f]>=val); }
      else if (key.endsWith('__lte'))    { const f=key.slice(0,-5); list=list.filter(r=>r[f]<=val); }
      else if (key.endsWith('__contains')) { const f=key.slice(0,-10); list=list.filter(r=>String(r[f]||'').toLowerCase().includes(String(val).toLowerCase())); }
      else if (key.endsWith('__in'))    { const f=key.slice(0,-4); list=list.filter(r=>val.includes(r[f])); }
      else { list=list.filter(r=>r[key]===val); }
    });
    return list;
  },

  /** Raw KV: set */
  async setItem(key, value) {
    try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
    catch(e) { console.warn('db.setItem failed:', e); }
  },

  /** Raw KV: get */
  async getItem(key) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return null;
      try { return JSON.parse(v); } catch(e) { return v; }
    } catch(e) { return null; }
  },

  /** Raw KV: remove */
  async removeItem(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  },

  /** Internal: save a full table array to localStorage */
  async _saveTable(table, list) {
    const map = TABLE_MAP[table];
    if (!map) return;
    try { localStorage.setItem(map.lsKey, JSON.stringify(list)); }
    catch(e) { console.warn('db._saveTable failed:', e); }
  },

};

/* ════════════════════════════════════════════════════════════
   SUPABASE ADAPTER (stub — activated when STORAGE_MODE="supabase")
════════════════════════════════════════════════════════════ */
const supabaseAdapter = {

  _client() {
    if (!window._supabaseClient) throw new Error('Supabase not initialized. Call initSupabase(url, key) first.');
    return window._supabaseClient;
  },

  async getAll(table) {
    const { data, error } = await this._client().from(table).select('*');
    if (error) throw error;
    return data || [];
  },

  async get(table, id) {
    const { data, error } = await this._client().from(table).select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async create(table, data) {
    const record = _enrichRecord(data);
    const { data: res, error } = await this._client().from(table).insert(record).select().single();
    if (error) throw error;
    return res;
  },

  async update(table, id, data) {
    const { data: res, error } = await this._client()
      .from(table).update({ ...data, updated_at: _now() }).eq('id', id).select().single();
    if (error) throw error;
    return res;
  },

  async delete(table, id) {
    const { error } = await this._client().from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async query(table, filters = {}) {
    let q = this._client().from(table).select('*');
    Object.entries(filters).forEach(([key, val]) => {
      if (key.endsWith('__gt'))       { q = q.gt(key.slice(0,-4), val); }
      else if (key.endsWith('__lt'))  { q = q.lt(key.slice(0,-4), val); }
      else if (key.endsWith('__gte')) { q = q.gte(key.slice(0,-5), val); }
      else if (key.endsWith('__lte')) { q = q.lte(key.slice(0,-5), val); }
      else if (key.endsWith('__contains')) { q = q.ilike(key.slice(0,-10), `%${val}%`); }
      else if (key.endsWith('__in')) { q = q.in(key.slice(0,-4), val); }
      else { q = q.eq(key, val); }
    });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async setItem(key, value) {
    // Supabase: store in a settings/kv table
    const { error } = await this._client().from('kv_store').upsert({ key, value: JSON.stringify(value) });
    if (error) console.warn('db.setItem (supabase) failed:', error);
  },

  async getItem(key) {
    const { data } = await this._client().from('kv_store').select('value').eq('key', key).single();
    if (!data) return null;
    try { return JSON.parse(data.value); } catch(e) { return data.value; }
  },

  async removeItem(key) {
    await this._client().from('kv_store').delete().eq('key', key);
  },
};

/* ════════════════════════════════════════════════════════════
   PUBLIC API — window.db
════════════════════════════════════════════════════════════ */
window.db = {
  /** Current adapter based on STORAGE_MODE */
  _adapter() {
    return window.STORAGE_MODE === 'supabase' ? supabaseAdapter : localAdapter;
  },

  async getAll(table)            { return this._adapter().getAll(table); },
  async get(table, id)           { return this._adapter().get(table, id); },
  async create(table, data)      { return this._adapter().create(table, data); },
  async update(table, id, data)  { return this._adapter().update(table, id, data); },
  async delete(table, id)        { return this._adapter().delete(table, id); },
  async query(table, filters)    { return this._adapter().query(table, filters); },
  async setItem(key, value)      { return this._adapter().setItem(key, value); },
  async getItem(key)             { return this._adapter().getItem(key); },
  async removeItem(key)          { return this._adapter().removeItem(key); },

  /** Get current storage mode */
  getMode() { return window.STORAGE_MODE; },

  /** Switch mode at runtime */
  setMode(mode) {
    if (!['local','supabase'].includes(mode)) throw new Error('Invalid mode. Use "local" or "supabase".');
    window.STORAGE_MODE = mode;
    console.log(`[db] Switched to ${mode} mode`);
  },

  /** Sync in-memory DB arrays from localStorage (called on boot) */
  async syncFromLocal() {
    const tables = ['clientes','proyectos','presupuestos','facturas','transacciones',
                    'tareas','leads','eventos','contratos','archivos',
                    'plantillas_web','pipeline_estados','email_templates','email_history',
                    'usuarios','actividad'];
    for (const t of tables) {
      const map = TABLE_MAP[t];
      if (!map || !map.dbKey || !window.DB) continue;
      try {
        const saved = localStorage.getItem(map.lsKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            window.DB[map.dbKey] = parsed;
          }
        }
      } catch(e) {}
    }
  },

  /** Persist all in-memory DB arrays to localStorage */
  async persistAll() {
    const tables = ['clientes','proyectos','presupuestos','facturas','transacciones',
                    'tareas','leads','eventos','contratos','archivos',
                    'plantillas_web','pipeline_estados','email_templates','email_history',
                    'actividad'];
    for (const t of tables) {
      const map = TABLE_MAP[t];
      if (!map || !map.dbKey || !window.DB) continue;
      try {
        if (Array.isArray(window.DB[map.dbKey])) {
          localStorage.setItem(map.lsKey, JSON.stringify(window.DB[map.dbKey]));
        }
      } catch(e) {}
    }
    // Config and sistema
    try {
      if (window.DB?.config)   localStorage.setItem('adm_config',   JSON.stringify(window.DB.config));
      if (window.DB?.sistema)  localStorage.setItem('adm_sistema',  JSON.stringify(window.DB.sistema));
    } catch(e) {}
  },

  TABLE_MAP,
};

console.log('[db] Data layer initialized — mode:', window.STORAGE_MODE);
