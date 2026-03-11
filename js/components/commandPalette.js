/**
 * ============================================================
 * AlexisDigital Manager — Command Palette (commandPalette.js)
 * ============================================================
 * 
 * CMD/CTRL+K command palette.
 * Extracted from index.html for modularity.
 * ============================================================
 */

let _cmdSelected = 0;
let _cmdItems    = [];

const CMD_ACTIONS = [
  { type:'action', icon:'fa-user-plus',   label:'Nuevo cliente',      fn:()=>{ navigate('clientes');    openModal('modal-cliente'); }},
  { type:'action', icon:'fa-code-branch', label:'Nuevo proyecto',     fn:()=>{ navigate('proyectos');   openModal('modal-proyecto'); }},
  { type:'action', icon:'fa-file-invoice',label:'Nuevo presupuesto',  fn:()=>{ navigate('presupuestos');openModal('modal-presupuesto'); }},
  { type:'action', icon:'fa-receipt',     label:'Nueva factura',      fn:()=>{ navigate('facturacion'); openModal('modal-factura'); }},
  { type:'action', icon:'fa-chart-line',  label:'Ir a Analytics',     fn:()=> navigate('analytics')},
  { type:'action', icon:'fa-gear',        label:'Ir a Configuración', fn:()=> navigate('configuracion')},
  { type:'action', icon:'fa-timeline',    label:'Ver Actividad',      fn:()=> navigate('actividad')},
  { type:'action', icon:'fa-filter',      label:'Ir a Pipeline',      fn:()=> navigate('pipeline')},
  { type:'action', icon:'fa-coins',       label:'Ir a Finanzas',      fn:()=> navigate('finanzas')},
  { type:'action', icon:'fa-bell',        label:'Nuevo recordatorio', fn:()=>{ openModal('modal-reminder'); populateReminderRef(); }},
];

function openCmdPalette() {
  document.getElementById('cmd-overlay').classList.add('open');
  document.getElementById('cmd-input').value = '';
  renderCmdResults('');
  setTimeout(() => document.getElementById('cmd-input').focus(), 60);
}
function closeCmdPalette() {
  document.getElementById('cmd-overlay').classList.remove('open');
}
function renderCmdResults(q) {
  const query = (q || '').toLowerCase().trim();
  let groups = [];

  if (query.length >= 1) {
    const cliRes  = (window.DB?.clientes   || []).filter(c => c.nombre.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)).slice(0,4);
    const proRes  = (window.DB?.proyectos  || []).filter(p => p.nombre.toLowerCase().includes(query)).slice(0,4);
    const pltRes  = (window.DB?.plantillas_web || []).filter(p => p.nombre.toLowerCase().includes(query)).slice(0,3);
    const facRes  = (window.DB?.facturas   || []).filter(f => (getClienteName(f.clienteId)||'').toLowerCase().includes(query)).slice(0,3);
    const presRes = (window.DB?.presupuestos || []).filter(p => (p.nombre||'').toLowerCase().includes(query) || (getClienteName(p.clienteId)||'').toLowerCase().includes(query)).slice(0,3);

    const sym = typeof fmtMoney === 'function' ? fmtMoney : n => `$${n}`;
    if (cliRes.length)  groups.push({ label:'Clientes',    items: cliRes.map(c  => ({ icon:'fa-user',         label:c.nombre,                meta:c.empresa||c.email, fn:()=>{ navigate('clientes');   verCliente(c.id); }})) });
    if (proRes.length)  groups.push({ label:'Proyectos',   items: proRes.map(p  => ({ icon:'fa-code-branch',  label:p.nombre,                meta:getClienteName(p.clienteId), fn:()=>{ navigate('proyectos');  verProyecto(p.id); }})) });
    if (pltRes.length)  groups.push({ label:'Plantillas',  items: pltRes.map(p  => ({ icon:'fa-layer-group',  label:p.nombre,                meta:typeof fmtMoney==='function'?fmtMoney(p.precio):`$${p.precio}`, fn:()=> navigate('plantillas_web') })) });
    if (presRes.length) groups.push({ label:'Presupuestos',items: presRes.map(p => ({ icon:'fa-file-invoice', label:p.nombre||'Presupuesto', meta:typeof fmtMoney==='function'?fmtMoney(p.precio):`$${p.precio}`, fn:()=> navigate('presupuestos') })) });
    if (facRes.length)  groups.push({ label:'Facturas',    items: facRes.map(f  => ({ icon:'fa-receipt',      label:getClienteName(f.clienteId), meta:typeof fmtMoney==='function'?fmtMoney(f.monto):`$${f.monto}`, fn:()=> navigate('facturacion') })) });
  }

  const actFiltered = CMD_ACTIONS.filter(a => !query || a.label.toLowerCase().includes(query));
  if (actFiltered.length) groups.push({ label: query ? 'Comandos' : 'Acciones rápidas', items: actFiltered.map(a => ({ icon:a.icon, label:a.label, shortcut:a.shortcut||'', fn:a.fn })) });

  _cmdItems = [];
  let html = '';
  if (!groups.length) {
    html = `<div class="cmd-empty"><i class="fa-solid fa-magnifying-glass" style="display:block;font-size:24px;margin-bottom:8px;color:var(--tx-3)"></i>Sin resultados para "${q}"</div>`;
  } else {
    groups.forEach(g => {
      html += `<div class="cmd-group-label">${g.label}</div>`;
      g.items.forEach(item => {
        const idx = _cmdItems.length;
        _cmdItems.push(item);
        html += `<div class="cmd-item" data-idx="${idx}" onclick="execCmdItem(${idx})" onmouseenter="selectCmdItem(${idx})">
          <div class="cmd-item-ico"><i class="fa-solid ${item.icon}"></i></div>
          <span class="cmd-item-name">${item.label}</span>
          ${item.meta    ? `<span class="cmd-item-meta">${item.meta}</span>`        : ''}
          ${item.shortcut? `<span class="cmd-item-shortcut">${item.shortcut}</span>`: ''}
        </div>`;
      });
    });
  }
  document.getElementById('cmd-results').innerHTML = html;
  _cmdSelected = 0;
  _highlightCmd();
}

function _highlightCmd() {
  document.querySelectorAll('.cmd-item').forEach((el,i) => el.classList.toggle('selected', i === _cmdSelected));
}
function selectCmdItem(idx) { _cmdSelected = idx; _highlightCmd(); }
function execCmdItem(idx) {
  const item = _cmdItems[idx];
  if (item?.fn) { closeCmdPalette(); item.fn(); }
}
function handleCmdKey(e) {
  if (e.key === 'Escape')    { closeCmdPalette(); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); _cmdSelected = Math.min(_cmdSelected+1, _cmdItems.length-1); _highlightCmd(); _scrollCmdSelected(); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); _cmdSelected = Math.max(_cmdSelected-1, 0);                   _highlightCmd(); _scrollCmdSelected(); }
  if (e.key === 'Enter')     { e.preventDefault(); execCmdItem(_cmdSelected); }
}
function _scrollCmdSelected() {
  document.querySelector(`.cmd-item[data-idx="${_cmdSelected}"]`)?.scrollIntoView({ block:'nearest' });
}

window.openCmdPalette  = openCmdPalette;
window.closeCmdPalette = closeCmdPalette;
window.renderCmdResults = renderCmdResults;
window.handleCmdKey    = handleCmdKey;
window.execCmdItem     = execCmdItem;
window.selectCmdItem   = selectCmdItem;
