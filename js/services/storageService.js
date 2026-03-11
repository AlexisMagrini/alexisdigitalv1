/**
 * ============================================================
 * AlexisDigital Manager — Storage Service (storageService.js)
 * ============================================================
 * 
 * Handles file uploads/downloads.
 * Local mode: uses base64 in localStorage (current behavior).
 * Supabase mode: uses Supabase Storage buckets.
 * ============================================================
 */

window.storageService = {

  /* ── BUCKETS ────────────────────────────────────────────────
   * Define available storage buckets.
   * In Supabase, create these buckets in your Storage panel.
  ──────────────────────────────────────────────────────────── */
  BUCKETS: {
    contratos:  'contratos',
    guias:      'guias',
    logos:      'logos',
    archivos:   'archivos',
    proyectos:  'project-files',
  },

  /* ── UPLOAD FILE ─────────────────────────────────────────── */
  /**
   * Upload a file to storage.
   * @param {string} bucket - Bucket name (see BUCKETS)
   * @param {File} file     - File object
   * @param {string} path   - Optional custom path within bucket
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadFile(bucket, file, path = null) {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      return this._uploadSupabase(bucket, file, path);
    }
    return this._uploadLocal(bucket, file);
  },

  /** Supabase Storage upload */
  async _uploadSupabase(bucket, file, customPath = null) {
    const filePath = customPath || `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await window._supabaseClient.storage
      .from(bucket).upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = window._supabaseClient.storage
      .from(bucket).getPublicUrl(filePath);
    return { url: urlData.publicUrl, path: filePath };
  },

  /** Local mode: convert to base64 and store in localStorage */
  async _uploadLocal(bucket, file) {
    return new Promise((resolve, reject) => {
      const MAX_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_SIZE) {
        reject(new Error('El archivo excede los 2MB'));
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const b64 = e.target.result;
        const key = `storage_${bucket}_${file.name.replace(/\s+/g, '_')}`;
        try {
          localStorage.setItem(key, b64);
          localStorage.setItem(key + '_name', file.name);
          localStorage.setItem(key + '_size', file.size);
          resolve({ url: b64, path: key, name: file.name });
        } catch(err) {
          reject(new Error('Almacenamiento local lleno'));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(file);
    });
  },

  /* ── GET FILE URL ─────────────────────────────────────────── */
  /**
   * Get public URL for a stored file.
   * @param {string} bucket
   * @param {string} path
   * @returns {Promise<string|null>}
   */
  async getFileUrl(bucket, path) {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      const { data } = window._supabaseClient.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl || null;
    }
    // Local: path IS the key
    return localStorage.getItem(path) || null;
  },

  /* ── DOWNLOAD FILE ────────────────────────────────────────── */
  /**
   * Download a file.
   * @param {string} bucket
   * @param {string} path
   * @param {string} filename
   */
  async downloadFile(bucket, path, filename) {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      const { data, error } = await window._supabaseClient.storage.from(bucket).download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = filename || path.split('/').pop(); a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // Local: path is localStorage key with base64
    const b64 = localStorage.getItem(path);
    const name = localStorage.getItem(path + '_name') || filename || 'archivo';
    if (!b64) throw new Error('Archivo no encontrado');
    const a = document.createElement('a');
    a.href = b64; a.download = name; a.click();
  },

  /* ── LIST FILES ───────────────────────────────────────────── */
  async listFiles(bucket, prefix = '') {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      const { data, error } = await window._supabaseClient.storage.from(bucket).list(prefix);
      if (error) throw error;
      return data || [];
    }
    // Local: scan localStorage for matching keys
    const files = [];
    const keyPrefix = `storage_${bucket}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(keyPrefix) && !k.endsWith('_name') && !k.endsWith('_size')) {
        files.push({
          name: localStorage.getItem(k + '_name') || k.replace(keyPrefix, ''),
          key: k,
          size: parseInt(localStorage.getItem(k + '_size') || '0'),
        });
      }
    }
    return files;
  },

  /* ── DELETE FILE ─────────────────────────────────────────── */
  async deleteFile(bucket, path) {
    if (window.STORAGE_MODE === 'supabase' && window._supabaseClient) {
      const { error } = await window._supabaseClient.storage.from(bucket).remove([path]);
      if (error) throw error;
      return true;
    }
    localStorage.removeItem(path);
    localStorage.removeItem(path + '_name');
    localStorage.removeItem(path + '_size');
    return true;
  },
};

/* ── CONVENIENCE WRAPPERS ────────────────────────────────────── */
function uploadFile(bucket, file, path) { return window.storageService.uploadFile(bucket, file, path); }
function getFileUrl(bucket, path)       { return window.storageService.getFileUrl(bucket, path); }
function downloadFile(bucket, path, fn) { return window.storageService.downloadFile(bucket, path, fn); }

window.uploadFile    = uploadFile;
window.getFileUrl    = getFileUrl;
window.downloadFile  = downloadFile;

console.log('[storage] Storage service loaded — mode:', window.STORAGE_MODE);
