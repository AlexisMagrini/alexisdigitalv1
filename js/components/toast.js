/**
 * ============================================================
 * AlexisDigital Manager — Toast Component (toast.js)
 * ============================================================
 * 
 * Standalone toast notification system.
 * Extracted from index.html for modularity.
 * Exposes: showToast(type, message, duration)
 *          toast(type, msg)  ← legacy alias
 * ============================================================
 */

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error:   'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
};
const TOAST_TITLES = {
  success: 'Éxito',
  error:   'Error',
  warning: 'Atención',
  info:    'Información',
};

function showToast(type, message, duration = 3200) {
  let container = document.getElementById('toast-top');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-top';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast-new ${type}`;
  el.innerHTML = `
    <i class="fa-solid ${TOAST_ICONS[type] || 'fa-circle-info'} toast-new-ico"></i>
    <div class="toast-new-body">
      <div class="toast-new-title">${TOAST_TITLES[type] || 'Aviso'}</div>
      <div class="toast-new-msg">${message}</div>
    </div>
    <div class="toast-progress"></div>
  `;
  el.onclick = () => dismissToast(el);
  container.appendChild(el);

  const bar = el.querySelector('.toast-progress');
  if (bar) {
    bar.style.width = '100%';
    requestAnimationFrame(() => {
      bar.style.transition = `width ${duration}ms linear`;
      bar.style.width = '0%';
    });
  }
  setTimeout(() => dismissToast(el), duration);
  return el;
}

function dismissToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 240);
}

// Legacy alias
function toast(type, msg) { showToast(type, msg); }

window.showToast   = showToast;
window.dismissToast = dismissToast;
window.toast       = toast;
