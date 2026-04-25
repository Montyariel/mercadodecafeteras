// ==========================================
// MAIN — Enrutador SPA + Utilidades
// Mercado de Cafeteras
// ==========================================

// Estado global explícito en window
window.currentView   = 'dashboard';
window.currentBranch = 'lanus';
window.sidebarOpen   = false;
window.currentUser   = null;

// ─── Navegación ─────────────────────────────
window.navigate = function(view) {
  if (window.currentUser && window.currentUser.role === 'warehouse' && ['sales', 'repairs'].includes(view)) {
    showToast('⚠️ No tenés permiso para acceder a esta vista', 'error');
    return;
  }

  window.currentView = view;

  // UI Updates
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const btn = document.getElementById('nav-' + view);
  if (btn) btn.classList.add('active');

  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('active');

  const titles = {
    dashboard: ['Dashboard',     'Vista General — Ambas Sucursales'],
    repairs:   ['Reparaciones',  'Gestión de trabajos técnicos'],
    stock:     ['Stock',         'Control de inventario por sucursal'],
    sales:     ['Ventas',        'Registro y análisis de ventas'],
    history:   ['Historial',     'Seguimiento de reparaciones'],
    transfers: ['Traslados',     'Movimientos de stock'],
  };
  const tInfo = titles[view] || ['Mercado de Cafeteras', 'Bienvenido'];
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  if (titleEl) titleEl.textContent = tInfo[0];
  if (subtitleEl) subtitleEl.textContent = tInfo[1];

  // Render la vista (llamada dinámica segura)
  const fnName = 'render' + view.charAt(0).toUpperCase() + view.slice(1);
  if (typeof window[fnName] === 'function') {
    window[fnName]();
  }

  if (window.innerWidth <= 700) closeSidebarMobile();
};

// ─── Sucursal ─────────────────────────────
window.setBranch = function(branch) {
  window.currentBranch = branch;
  document.querySelectorAll('.branch-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('branch-' + branch);
  if (btn) btn.classList.add('active');
  showToast('Sucursal activa: ' + (branch === 'lanus' ? '☕ Lanús' : '🏢 Belgrano'), '');
  
  // Re-renderizar vista actual si depende de la sucursal
  if (window.currentView === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if (window.currentView === 'stock' && typeof renderStock === 'function') renderStock();
};

// ─── Sidebar ──────────────────────────────
window.toggleSidebar = function() {
  window.sidebarOpen = !window.sidebarOpen;
  const s = document.getElementById('sidebar');
  if (s) s.classList.toggle('open', window.sidebarOpen);
};
window.closeSidebarMobile = function() {
  window.sidebarOpen = false;
  const s = document.getElementById('sidebar');
  if (s) s.classList.remove('open');
};

// ─── Notificaciones ────────────────────────
window.toggleNotifications = function() {
  const dd = document.getElementById('notif-dropdown');
  if (dd) dd.classList.toggle('hidden');
};

// ─── Toast ─────────────────────────────────
window.showToast = function(message, type = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
};

// ─── Reloj ──────────────────────────────────
window.updateClock = function() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  el.textContent = now.toLocaleDateString('es-AR', opts);
};

// ─── Init ────────────────────────────────────
window.init = function() {
  try {
    if (typeof checkSession !== 'function') throw new Error('checkSession no definido');
    window.currentUser = checkSession();

    if (!window.currentUser) {
      if (typeof renderLogin === 'function') renderLogin();
      return;
    }

    const role = window.currentUser.role.toLowerCase();

    // Configurar interfaz inicial
    window.currentBranch = window.currentUser.location;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'flex';
    
    // REGLA CRÍTICA: Solo Vendedores ven Cierre de Caja
    const navCierre = document.getElementById('nav-cierre');
    if (navCierre) {
      if (role === 'admin' || role === 'warehouse') {
        navCierre.setAttribute('style', 'display: none !important');
      } else {
        navCierre.style.display = 'flex';
      }
    }

    // Ocultar botones para Depósito
    const navSales   = document.getElementById('nav-sales');
    const navRepairs = document.getElementById('nav-repairs');
    if (role === 'warehouse') {
      if (navSales) navSales.style.display = 'none';
      if (navRepairs) navRepairs.style.display = 'none';
      navigate('stock');
    } else {
      navigate('dashboard');
    }

    // REGLA: Vendedores y Depósito no pueden cambiar sucursal en sidebar
    // El Admin sí puede para filtrar datos específicos si lo desea
    if (role === 'vendor' || role === 'warehouse') {
      const branchContainer = document.querySelector('.sidebar-branches');
      if (branchContainer) {
        let locationName = window.currentUser.location === 'lanus' ? '☕ Lanús' : (window.currentUser.location === 'belgrano' ? '🏢 Belgrano' : '📦 Depósito');
        branchContainer.innerHTML = `
          <div class="branches-label" style="margin-bottom:8px;">Sucursal activa</div>
          <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:6px; padding:10px; font-size:13px; font-weight:600; color:var(--gold-bright);">${locationName}</div>
        `;
      }
    }

    // Perfil de usuario
    const userLabel = document.getElementById('user-name-display');
    const roleLabel = document.getElementById('user-role-display');
    const avatarTag = document.getElementById('user-avatar-tag');

    const rolesMap = { admin: 'Administrador', vendor: 'Vendedor/a', warehouse: 'Encargado Depósito' };
    const initialsMap = { admin: 'AD', vendor: 'VE', warehouse: 'DE' };

    if (userLabel) userLabel.textContent = window.currentUser.name || 'Usuario';
    if (roleLabel) roleLabel.textContent = rolesMap[role] || 'Personal';
    if (avatarTag) avatarTag.textContent = initialsMap[role] || '??';

    updateClock();
    setInterval(updateClock, 60000);
    
    if (typeof testSupabaseConnection === 'function') testSupabaseConnection();

  } catch (err) {
    console.error('Error Init:', err);
  }
};

window.addEventListener('DOMContentLoaded', window.init);
