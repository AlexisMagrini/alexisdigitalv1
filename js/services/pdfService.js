/**
 * ============================================================
 * AlexisDigital Manager — PDF Service (pdfService.js)
 * ============================================================
 * 
 * Handles PDF generation and management.
 * Wraps the existing generarPDF() function with a service layer.
 * ============================================================
 */

window.pdfService = {

  /**
   * Generate and show a PDF preview.
   * Delegates to the existing generarPDF() in index.html.
   * @param {'presupuesto'|'factura'|'contrato'} tipo
   * @param {number} id
   */
  generate(tipo, id) {
    if (typeof window.generarPDF === 'function') {
      window.generarPDF(tipo, id);
    } else {
      console.error('[pdf] generarPDF() not found');
    }
  },

  /**
   * Download a stored PDF document (contrato or guia).
   * @param {'contrato'|'guia'} tipo
   */
  downloadDoc(tipo) {
    if (typeof window.downloadDoc === 'function') {
      window.downloadDoc(tipo);
    }
  },

  /**
   * Preview a stored PDF document in a new window.
   * @param {'contrato'|'guia'} tipo
   */
  previewDoc(tipo) {
    if (typeof window.previewDoc === 'function') {
      window.previewDoc(tipo);
    }
  },

  /**
   * Upload a PDF document to storage.
   * Delegates to handleDocUpload() in index.html.
   * @param {'contrato'|'guia'} tipo
   * @param {HTMLInputElement} input
   */
  uploadDoc(tipo, input) {
    if (typeof window.handleDocUpload === 'function') {
      window.handleDocUpload(tipo, input);
    }
  },

  /**
   * Get the base64 content of a stored PDF.
   * @param {'contrato'|'guia'} tipo
   * @returns {string|null}
   */
  getDocContent(tipo) {
    return localStorage.getItem(`adm_doc_${tipo}`) || null;
  },

  /**
   * Check if a document exists.
   * @param {'contrato'|'guia'} tipo
   * @returns {boolean}
   */
  hasDoc(tipo) {
    return !!localStorage.getItem(`adm_doc_${tipo}`);
  },

  /**
   * Generate PDF content for a record as HTML string.
   * (Used internally by generarPDF)
   */
  buildHTML(tipo, record, config = {}) {
    const agencia = window.DB?.sistema?.nombre || 'AlexisDigital';
    const sym = typeof window.getCurrencySymbol === 'function' ? window.getCurrencySymbol() : '$';
    const fmt = typeof window.fmt === 'function' ? window.fmt : n => n.toLocaleString('es-AR');
    const fmtD = typeof window.fmtD === 'function' ? window.fmtD : d => d;

    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Poppins', sans-serif; background: #fff; color: #1a1a2e; padding: 32px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #4f46e5; }
        .logo { font-size: 20px; font-weight: 800; color: #4f46e5; }
        .doc-title { font-size: 26px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
        .doc-sub { font-size: 13px; color: #6b7280; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .field { margin-bottom: 10px; }
        .field-label { font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; }
        .field-value { font-size: 14px; color: #1a1a2e; font-weight: 500; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; }
        .total-row td { font-size: 16px; font-weight: 800; color: #1a1a2e; border-bottom: none; padding-top: 16px; }
        .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        @media print { body { padding: 16px; } }
      </style>
    `;

    if (tipo === 'presupuesto') {
      const extras = record.extras || [];
      const total = record.precio || 0;
      return `${styles}
        <div class="header">
          <div class="logo">⚡ ${agencia}</div>
          <div style="text-align:right">
            <div class="doc-title">PRESUPUESTO</div>
            <div class="doc-sub">Fecha: ${fmtD(record.fecha)} · Válido hasta: ${fmtD(record.valido || record.valido_hasta)}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Datos del presupuesto</div>
          <div class="grid-2">
            <div class="field"><div class="field-label">Nombre</div><div class="field-value">${record.nombre || record.desc || '—'}</div></div>
            <div class="field"><div class="field-label">Estado</div><div class="field-value">${record.estado || '—'}</div></div>
          </div>
          <div class="field"><div class="field-label">Descripción</div><div class="field-value">${record.desc || record.descripcion || '—'}</div></div>
        </div>
        <div class="section">
          <div class="section-title">Servicios incluidos</div>
          <table>
            <thead><tr><th>Descripción</th><th style="text-align:right">Precio</th></tr></thead>
            <tbody>
              ${extras.map(e => `<tr><td>${e.nombre || e.desc || '—'}</td><td style="text-align:right">${sym}${fmt(e.precio || 0)}</td></tr>`).join('')}
              <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${sym}${fmt(total)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="footer">${agencia} · Generado el ${new Date().toLocaleDateString('es-AR')}</div>`;
    }

    if (tipo === 'factura') {
      return `${styles}
        <div class="header">
          <div class="logo">⚡ ${agencia}</div>
          <div style="text-align:right">
            <div class="doc-title">FACTURA</div>
            <div class="doc-sub">Fecha: ${fmtD(record.fecha)} · Vence: ${fmtD(record.vence)}</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Detalle</div>
          <div class="grid-2">
            <div class="field"><div class="field-label">Descripción</div><div class="field-value">${record.desc || record.descripcion || '—'}</div></div>
            <div class="field"><div class="field-label">Estado</div><div class="field-value">${record.estado}</div></div>
          </div>
        </div>
        <table>
          <thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>
            <tr><td>${record.desc || record.descripcion || 'Servicios profesionales'}</td><td style="text-align:right">${sym}${fmt(record.monto || 0)}</td></tr>
            <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${sym}${fmt(record.monto || 0)}</td></tr>
          </tbody>
        </table>
        <div class="footer">${agencia} · Generado el ${new Date().toLocaleDateString('es-AR')}</div>`;
    }

    return `${styles}<h2>${tipo} — ID: ${record.id}</h2>`;
  },
};

console.log('[pdf] PDF service loaded');
