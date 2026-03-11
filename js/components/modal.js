/**
 * ============================================================
 * AlexisDigital Manager — Modal Component (modal.js)
 * ============================================================
 * 
 * Modal open/close logic + draft recovery integration.
 * Extracted for modularity.
 * ============================================================
 */

/**
 * Open a modal by ID.
 * Populates relevant selects and loads drafts where applicable.
 */
function openModal(id) {
  if (id === 'modal-proyecto')       { populateClienteSelect('p-cliente'); tempChecklist=[]; renderTempChecklist(); document.getElementById('modal-proyecto-title').textContent='Nuevo Proyecto'; document.getElementById('p-id').value=''; document.getElementById('p-inicio').value=today(); }
  if (id === 'modal-transaccion')    { populateClienteSelect('t-cliente'); document.getElementById('t-fecha').value=today(); document.getElementById('modal-transaccion-title').textContent='Nueva Transacción'; document.getElementById('t-id').value=''; }
  if (id === 'modal-tarea')          { populateProyectoSelect('ta-proyecto'); document.getElementById('modal-tarea-title').textContent='Nueva Tarea'; document.getElementById('ta-id').value=''; }
  if (id === 'modal-evento')         { populateClienteSelect('ev-cliente'); document.getElementById('ev-fecha').value=today(); document.getElementById('modal-evento-title').textContent='Nuevo Evento'; document.getElementById('ev-id').value=''; }
  if (id === 'modal-lead')           { document.getElementById('modal-lead-title').textContent='Nuevo Lead'; document.getElementById('ld-id').value=''; }
  if (id === 'modal-plantilla_web')  { document.getElementById('modal-plantilla_web-title').textContent='Nueva Plantilla'; document.getElementById('plw-id').value=''; }
  if (id === 'modal-extra')          { document.getElementById('modal-extra-title').textContent='Nuevo Extra'; document.getElementById('ex-id').value=''; }
  if (id === 'modal-tipo_proyecto')  { document.getElementById('modal-tipo_proyecto-title').textContent='Nuevo Tipo de Proyecto'; document.getElementById('tp-id').value=''; }
  if (id === 'modal-pipeline_estado') {
    document.getElementById('modal-pipeline_estado-title').textContent='Nuevo Estado'; document.getElementById('pe-id').value='';
    document.getElementById('pe-color').value='#4f46e5'; document.getElementById('pe-orden').value=window.DB?.pipeline_estados?.length+1||1;
  }
  if (id === 'modal-contrato_tpl')   { document.getElementById('modal-contrato_tpl-title').textContent='Nueva Plantilla'; document.getElementById('ctpl-id').value=''; }
  if (id === 'modal-categoria')      { document.getElementById('modal-categoria-title').textContent='Nueva Categoría'; document.getElementById('cat-id').value=''; }
  if (id === 'modal-usuario')        { document.getElementById('modal-usuario-title').textContent='Nuevo Usuario'; document.getElementById('usr-id').value=''; }
  if (id === 'modal-presupuesto') {
    populateClienteSelect('pr-cliente');
    populatePlantillaSelect('pr-plantilla');
    renderExtrasGrid(); calcPresupuesto();
    document.getElementById('pr-fecha').value = today();
    const v = new Date(); v.setDate(v.getDate()+30);
    document.getElementById('pr-valido').value = v.toISOString().split('T')[0];
    document.getElementById('modal-presupuesto-title').textContent = 'Nuevo Presupuesto';
    document.getElementById('pr-id').value = '';
  }
  if (id === 'modal-contrato')       { populateClienteSelect('ct-cliente'); populateProyectoSelect('ct-proyecto'); document.getElementById('ct-fecha').value=today(); document.getElementById('modal-contrato-title').textContent='Nuevo Contrato'; document.getElementById('ct-id').value=''; }
  if (id === 'modal-factura')        { populateClienteSelect('fct-cliente'); populateProyectoSelect('fct-proyecto'); document.getElementById('fct-fecha').value=today(); document.getElementById('modal-factura-title').textContent='Nueva Factura'; document.getElementById('fct-id').value=''; }

  document.getElementById(id).classList.add('open');

  // Draft recovery — only for new records (no id filled)
  const editFields = { 'modal-cliente':'c-id', 'modal-proyecto':'p-id', 'modal-presupuesto':'pr-id', 'modal-factura':'fct-id' };
  const editField = editFields[id];
  if (editField && !document.getElementById(editField)?.value) {
    setTimeout(() => _loadDraft(id), 50);
  }
}

/**
 * Close a modal and clear its fields.
 */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById(id).querySelectorAll('input:not([type=hidden]),textarea').forEach(f => f.value='');
  ['c-id','p-id','t-id','ar-id','ta-id','ev-id','ld-id','pr-id','ct-id','fct-id',
   'plw-id','ex-id','tp-id','pe-id','ctpl-id','cat-id','usr-id','etpl-id'
  ].forEach(h => { const el = document.getElementById(h); if(el) el.value=''; });
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); });
  });
});

window.openModal  = openModal;
window.closeModal = closeModal;
