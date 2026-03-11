/**
 * ============================================================
 * AlexisDigital Manager — Supabase Client (supabaseClient.js)
 * ============================================================
 * 
 * Initializes the Supabase JS client.
 * 
 * USAGE:
 *   1. Include @supabase/supabase-js via CDN in index.html
 *   2. Call initSupabase(url, key) with your project credentials
 *   3. Set window.STORAGE_MODE = "supabase"
 * 
 * CDN (add to <head>):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * 
 * SUPABASE TABLES REQUIRED:
 * 
 *   CREATE TABLE clientes (
 *     id BIGINT PRIMARY KEY,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW(),
 *     nombre TEXT NOT NULL,
 *     email TEXT,
 *     telefono TEXT,
 *     empresa TEXT,
 *     estado TEXT DEFAULT 'lead',
 *     notas TEXT,
 *     user_id UUID REFERENCES auth.users(id)
 *   );
 * 
 *   -- (Similar structure for all other tables)
 * 
 *   CREATE TABLE kv_store (
 *     key TEXT PRIMARY KEY,
 *     value TEXT,
 *     user_id UUID REFERENCES auth.users(id),
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 * ============================================================
 */

window._supabaseClient = null;

/**
 * Initialize Supabase client.
 * @param {string} supabaseUrl  - Your Supabase project URL
 * @param {string} supabaseKey  - Your Supabase anon/public key
 */
function initSupabase(supabaseUrl, supabaseKey) {
  if (!window.supabase) {
    console.error('[supabase] @supabase/supabase-js is not loaded. Add CDN script to <head>.');
    return null;
  }
  window._supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  console.log('[supabase] Client initialized:', supabaseUrl);
  return window._supabaseClient;
}

/**
 * Quick-start: connect and switch to Supabase mode.
 * @param {string} url
 * @param {string} key
 */
async function connectSupabase(url, key) {
  const client = initSupabase(url, key);
  if (!client) return false;
  window.STORAGE_MODE = 'supabase';
  // Test connection
  try {
    const { error } = await client.from('clientes').select('id').limit(1);
    if (error) throw error;
    console.log('[supabase] Connection verified ✓');
    if (typeof showToast === 'function') showToast('success', 'Conectado a Supabase ✓');
    return true;
  } catch(e) {
    console.error('[supabase] Connection failed:', e.message);
    if (typeof showToast === 'function') showToast('error', `Error Supabase: ${e.message}`);
    window.STORAGE_MODE = 'local';
    return false;
  }
}

/* ── SUPABASE SCHEMA DEFINITIONS (SQL) ─────────────────────────
   Copy and run these in your Supabase SQL Editor.
──────────────────────────────────────────────────────────────── */
const SUPABASE_SCHEMA = `
-- Enable Row Level Security on all tables
-- Run this in your Supabase SQL Editor

-- KV Store (for settings, themes, preferences)
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value TEXT,
  user_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  empresa TEXT,
  estado TEXT DEFAULT 'lead',
  notas TEXT,
  user_id UUID REFERENCES auth.users(id)
);

-- Proyectos
CREATE TABLE IF NOT EXISTS proyectos (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  estado TEXT DEFAULT 'pendiente',
  precio NUMERIC DEFAULT 0,
  inicio DATE,
  entrega DATE,
  checklist JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id)
);

-- Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT,
  cliente_id BIGINT REFERENCES clientes(id),
  descripcion TEXT,
  precio NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  fecha DATE,
  valido DATE,
  extras JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id)
);

-- Facturas
CREATE TABLE IF NOT EXISTS facturas (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cliente_id BIGINT REFERENCES clientes(id),
  proyecto_id BIGINT REFERENCES proyectos(id),
  descripcion TEXT,
  monto NUMERIC DEFAULT 0,
  fecha DATE,
  vence DATE,
  estado TEXT DEFAULT 'pendiente',
  metodo_pago TEXT,
  fecha_pago DATE,
  user_id UUID REFERENCES auth.users(id)
);

-- Transacciones
CREATE TABLE IF NOT EXISTS transacciones (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tipo TEXT NOT NULL,
  fecha DATE,
  descripcion TEXT,
  monto NUMERIC DEFAULT 0,
  categoria TEXT,
  cliente_id BIGINT REFERENCES clientes(id),
  vence DATE,
  user_id UUID REFERENCES auth.users(id)
);

-- Tareas
CREATE TABLE IF NOT EXISTS tareas (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  titulo TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  prioridad TEXT DEFAULT 'media',
  proyecto_id BIGINT REFERENCES proyectos(id),
  vence DATE,
  descripcion TEXT,
  user_id UUID REFERENCES auth.users(id)
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tipo TEXT,
  texto TEXT,
  meta JSONB DEFAULT '{}',
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  text TEXT NOT NULL,
  date DATE,
  tipo TEXT DEFAULT 'general',
  ref TEXT,
  done BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users see only their own data)
CREATE POLICY "Users see own clientes" ON clientes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own proyectos" ON proyectos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own presupuestos" ON presupuestos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own facturas" ON facturas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own tareas" ON tareas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own activity" ON activity_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own kv" ON kv_store FOR ALL USING (auth.uid() = user_id);
`;

window.SUPABASE_SCHEMA = SUPABASE_SCHEMA;
