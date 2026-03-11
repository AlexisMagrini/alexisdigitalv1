/**
 * ============================================================
 * AlexisDigital Manager — Proyectos Module (proyectos.js)
 * ============================================================
 */

const proyectosModule = {

  async getAll()        { return window.db.getAll('proyectos'); },
  async get(id)         { return window.db.get('proyectos', id); },
  async getByCliente(clienteId) { return window.db.query('proyectos', { clienteId }); },
  async getActivos()    { return window.db.query('proyectos', { estado: 'en desarrollo' }); },

  async create(data) {
    const record = {
      nombre:    data.nombre?.trim() || '',
      clienteId: data.clienteId,
      estado:    data.estado    || 'pendiente',
      precio:    parseFloat(data.precio) || 0,
      inicio:    data.inicio    || null,
      entrega:   data.entrega   || null,
      checklist: data.checklist || [],
    };
    const result = await window.db.create('proyectos', record);
    if (window.DB && Array.isArray(window.DB.proyectos)) {
      window.DB.proyectos = await window.db.getAll('proyectos');
    }
    if (typeof logActivity === 'function') {
      logActivity('proyecto', `Nuevo proyecto: <strong>${result.nombre}</strong>`);
    }
    if (window.DB?.actividad) {
      window.DB.actividad.unshift({ icon:'fa-code-branch', color:'amber', texto:`Nuevo proyecto: <strong>${result.nombre}</strong>`, tiempo:'Ahora' });
    }
    return result;
  },

  async update(id, data) {
    const result = await window.db.update('proyectos', id, data);
    if (window.DB && Array.isArray(window.DB.proyectos)) {
      const idx = window.DB.proyectos.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) window.DB.proyectos[idx] = result;
    }
    return result;
  },

  async delete(id) {
    await window.db.delete('proyectos', id);
    if (window.DB && Array.isArray(window.DB.proyectos)) {
      window.DB.proyectos = window.DB.proyectos.filter(p => String(p.id) !== String(id));
    }
    return true;
  },

  /** Save proyecto_tareas (project checklists) */
  async saveTareas(proyectoTareas) {
    await window.db.setItem('adm_proy_tareas', JSON.stringify(proyectoTareas));
  },
};

window.proyectosModule = proyectosModule;
