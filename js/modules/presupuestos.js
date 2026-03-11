/**
 * ============================================================
 * AlexisDigital Manager — Presupuestos Module
 * ============================================================
 */

const presupuestosModule = {

  async getAll()    { return window.db.getAll('presupuestos'); },
  async get(id)     { return window.db.get('presupuestos', id); },

  async create(data) {
    const result = await window.db.create('presupuestos', {
      nombre:    data.nombre    || '',
      desc:      data.desc      || '',
      descripcion: data.descripcion || data.desc || '',
      clienteId: data.clienteId,
      precio:    parseFloat(data.precio) || 0,
      estado:    data.estado    || 'pendiente',
      fecha:     data.fecha     || null,
      valido:    data.valido    || null,
      extras:    data.extras    || [],
    });
    if (window.DB && Array.isArray(window.DB.presupuestos)) {
      window.DB.presupuestos = await window.db.getAll('presupuestos');
    }
    if (typeof logActivity === 'function') {
      logActivity('presupuesto', `Presupuesto creado: <strong>${result.nombre || 'Nuevo'}</strong>`);
    }
    return result;
  },

  async update(id, data) {
    const result = await window.db.update('presupuestos', id, data);
    if (window.DB && Array.isArray(window.DB.presupuestos)) {
      const idx = window.DB.presupuestos.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) window.DB.presupuestos[idx] = result;
    }
    return result;
  },

  async delete(id) {
    await window.db.delete('presupuestos', id);
    if (window.DB && Array.isArray(window.DB.presupuestos)) {
      window.DB.presupuestos = window.DB.presupuestos.filter(p => String(p.id) !== String(id));
    }
    return true;
  },
};

window.presupuestosModule = presupuestosModule;


/**
 * ============================================================
 * AlexisDigital Manager — Facturas Module
 * ============================================================
 */

const facturasModule = {

  async getAll()    { return window.db.getAll('facturas'); },
  async get(id)     { return window.db.get('facturas', id); },
  async getPendientes() { return window.db.query('facturas', { estado: 'pendiente' }); },
  async getPagadas()    { return window.db.query('facturas', { estado: 'pagada' }); },

  async create(data) {
    const result = await window.db.create('facturas', {
      clienteId:   data.clienteId,
      proyectoId:  data.proyectoId  || null,
      desc:        data.desc        || '',
      descripcion: data.descripcion || data.desc || '',
      monto:       parseFloat(data.monto) || 0,
      fecha:       data.fecha       || null,
      vence:       data.vence       || null,
      estado:      data.estado      || 'pendiente',
      metodoPago:  data.metodoPago  || '',
      fechaPago:   data.fechaPago   || null,
    });
    if (window.DB && Array.isArray(window.DB.facturas)) {
      window.DB.facturas = await window.db.getAll('facturas');
    }
    if (typeof logActivity === 'function') {
      const sym = typeof fmtMoney === 'function' ? fmtMoney(result.monto) : `$${result.monto}`;
      logActivity('factura', `Factura creada: <strong>${sym}</strong>`);
    }
    if (window.DB?.actividad) {
      window.DB.actividad.unshift({ icon:'fa-receipt', color:'green', texto:`Nueva factura emitida`, tiempo:'Ahora' });
    }
    return result;
  },

  async update(id, data) {
    const result = await window.db.update('facturas', id, data);
    if (window.DB && Array.isArray(window.DB.facturas)) {
      const idx = window.DB.facturas.findIndex(f => String(f.id) === String(id));
      if (idx !== -1) window.DB.facturas[idx] = result;
    }
    return result;
  },

  async markPagada(id) {
    const f = window.DB?.facturas?.find(f => f.id === id);
    const updates = {
      estado:    'pagada',
      fechaPago: typeof today === 'function' ? today() : new Date().toISOString().split('T')[0],
    };
    const result = await this.update(id, updates);
    if (typeof logActivity === 'function' && f) {
      const sym = typeof fmtMoney === 'function' ? fmtMoney(f.monto) : `$${f.monto}`;
      logActivity('pago', `Factura cobrada: <strong>${sym}</strong>`);
    }
    return result;
  },

  async delete(id) {
    await window.db.delete('facturas', id);
    if (window.DB && Array.isArray(window.DB.facturas)) {
      window.DB.facturas = window.DB.facturas.filter(f => String(f.id) !== String(id));
    }
    return true;
  },
};

window.facturasModule = facturasModule;
