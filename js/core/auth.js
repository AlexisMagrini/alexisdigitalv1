/**
 * ============================================================
 * AlexisDigital Manager — Authentication Layer (auth.js)
 * ============================================================
 * 
 * Provides a unified auth interface that works with:
 *   - Local credentials (current mode — uses DB.usuarios)
 *   - Supabase Auth (future mode)
 * 
 * The current login UI and behavior remains unchanged.
 * This layer just wraps the logic so it can be swapped.
 * ============================================================
 */

window.auth = {

  /* ── CURRENT USER ─────────────────────────────────────────── */
  _user: null,

  /** Get currently logged-in user */
  getCurrentUser() {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      return window._supabaseClient.auth.getUser().then(({ data }) => data?.user || null);
    }
    return Promise.resolve(window.DB?.currentUser || null);
  },

  /* ── LOGIN ────────────────────────────────────────────────── */
  /**
   * Login with email + password.
   * Local mode: checks DB.usuarios array.
   * Supabase mode: uses supabase.auth.signInWithPassword().
   */
  async login(email, password) {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      const { data, error } = await window._supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      this._user = data.user;
      return { success: true, user: data.user };
    }
    // Local mode
    const user = (window.DB?.usuarios || []).find(u => u.email === email && u.password === password);
    if (!user) return { success: false, error: 'Credenciales incorrectas' };
    this._user = user;
    if (window.DB) window.DB.currentUser = user;
    return { success: true, user };
  },

  /* ── LOGOUT ───────────────────────────────────────────────── */
  async logout() {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      await window._supabaseClient.auth.signOut();
    }
    this._user = null;
    if (window.DB) window.DB.currentUser = null;
    return { success: true };
  },

  /* ── REGISTER (Supabase only) ─────────────────────────────── */
  async register(email, password, metadata = {}) {
    if (window.STORAGE_MODE !== 'supabase' || !window._supabaseClient) {
      return { success: false, error: 'Register requires Supabase mode' };
    }
    const { data, error } = await window._supabaseClient.auth.signUp({
      email, password,
      options: { data: metadata },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  },

  /* ── PASSWORD RESET ───────────────────────────────────────── */
  async resetPassword(email) {
    if (window.STORAGE_MODE !== 'supabase' || !window._supabaseClient) {
      return { success: false, error: 'Password reset requires Supabase mode' };
    }
    const { error } = await window._supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /* ── SESSION MONITORING ───────────────────────────────────── */
  onAuthStateChange(callback) {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      return window._supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session?.user || null);
      });
    }
    // Local: no-op (session is managed by doLogin/doLogout)
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  /* ── HELPERS ──────────────────────────────────────────────── */
  isLoggedIn() {
    return !!window.DB?.currentUser || !!this._user;
  },

  getUserId() {
    const u = window.DB?.currentUser || this._user;
    return u?.id || null;
  },

  getUserName() {
    const u = window.DB?.currentUser || this._user;
    return u?.nombre || u?.email || 'Usuario';
  },
};

console.log('[auth] Auth layer initialized — mode:', window.STORAGE_MODE);
