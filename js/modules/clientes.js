/**
 * ============================================================
 * AlexisDigital Manager — Clientes Module (clientes.js)
 * ============================================================
 * 
 * CRUD operations for the Clientes table.
 * Uses window.db for all storage operations.
 * 
 * All functions remain globally available so existing
 * onclick handlers in index.html continue to work.
 * ============================================================
 */

const clientesModule = {

  /** Get all clients (async, db-aware) */
  async getAll() {
    return window.db.getAll('clientes');
  },

  /** Get single client by id */
  async get(id) {
    return window.db.get('clientes', id);
  },

  /** Create a new client */
  async create(data) {
    const record = {
      nombre:   data.nombre?.trim()  || '',
      email:    data.email?.trim()   || '',
      telefono: data.telefono?.trim()|| '',
      empresa:  data.empresa?.trim() || '',
      estado:   data.estado          || 'lead',
      notas:    data.notas?.trim()   || '',
      creado:   data.creado          || (typeof today === 'function' ? today() : new Date().toISOString().split('T')[0]),
    };
    const result = await window.db.create('clientes', record);
    // Sync in-memory DB
    if (window.DB && Array.isArray(window.DB.clientes)) {
      window.DB.clientes = await window.db.getAll('clientes');
    }
    // Log activity
    if (typeof logActivity === 'function') {
      logActivity('cliente', `Nuevo cliente: <strong>${result.nombre}</strong>`);
    }
    // Update activity feed
    if (window.DB?.actividad) {
      window.DB.actividad.unshift({
        icon: 'fa-user-plus', color: 'brand',
        texto: `Nuevo cliente: <strong>${result.nombre}</strong>`,
        tiempo: 'Ahora',
      });
    }
    return result;
  },

  /** Update an existing client */
  async update(id, data) {
    const result = await window.db.update('clientes', id, data);
    if (window.DB && Array.isArray(window.DB.clientes)) {
      const idx = window.DB.clientes.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) window.DB.clientes[idx] = result;
    }
    return result;
  },

  /** Delete a client */
  async delete(id) {
    await window.db.delete('clientes', id);
    if (window.DB && Array.isArray(window.DB.clientes)) {
      window.DB.clientes = window.DB.clientes.filter(c => String(c.id) !== String(id));
    }
    return true;
  },

  /** Search clients */
  async search(query) {
    return window.db.query('clientes', { nombre__contains: query });
  },

  /** Get clients by status */
  async byEstado(estado) {
    return window.db.query('clientes', { estado });
  },
};

window.clientesModule = clientesModule;
