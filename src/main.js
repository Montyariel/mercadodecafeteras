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
  if (window.currentUser && window.currentUser.role === 'tech' && view !== 'repairs') {
    showToast('⚠️ Modo Técnico: Solo podés ver las Reparaciones', 'error');
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
    audit:     ['Auditoría',     'Registro de seguridad inmutable'],
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

  // Verificar si hay datos nuevos al cambiar de vista (sin forzar)
  if (window.currentUser) window.loadAllData(false);

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

// ─── Carga Centralizada de Datos ──────────────
window.loadAllData = async function(force = false) {
  // Evitar múltiples cargas simultáneas
  if (window.isSyncing) return;
  
  // Si no es forzado y se cargó hace menos de 30 segundos, omitir para no saturar
  const now = Date.now();
  if (!force && window.dataLoaded && window.lastSyncTime && (now - window.lastSyncTime < 30000)) {
    return;
  }
  
  if (!window.supabaseDB || typeof db === 'undefined') {
    console.log('Modo Mock Activo: No se cargan datos remotos.');
    window.dataLoaded = true;
    return;
  }

  window.isSyncing = true;
  try {
    console.log('🔄 Sincronizando datos con Supabase...');
    const [repairs, stock, sales, transfers, withdrawals] = await Promise.all([
      db.repairs.getAll(),
      db.stock.getAll(),
      db.sales.getAll(),
      db.transfers.getAll(),
      db.withdrawals.getAll()
    ]);

    // CORRECCIÓN CRÍTICA: Los datos remotos son la fuente de verdad.
    // Los datos mock (IDs con '#') solo se usan si NO hay datos reales en la nube.
    // Esto previene que datos de demostración contaminen la base de datos real.
    const isMockId = (id) => typeof id === 'string' && id.startsWith('#');
    
    const mergeCollection = (local, remote, idField = 'id') => {
      if (!remote) return local;
      if (remote.length === 0) return local; // Si la nube está vacía, mantener local
      // Los datos reales de la nube son la fuente de verdad
      // Solo agregamos datos locales que NO sean mock y NO estén en la nube
      const remoteIds = new Set(remote.map(r => r[idField]));
      const localOnlyReal = local.filter(l => {
        const lid = l[idField];
        return lid && !isMockId(lid) && !remoteIds.has(lid);
      });
      return [...remote, ...localOnlyReal];
    };

    if (repairs) {
      DATA.repairs = mergeCollection(DATA.repairs, repairs);
      console.log(`✅ Reparaciones cargadas: ${repairs.length} de la nube, ${DATA.repairs.length} total`);
    }
    if (sales)   DATA.sales   = mergeCollection(DATA.sales,   sales);
    if (transfers) DATA.transfers = mergeCollection(DATA.transfers, transfers);
    if (withdrawals) DATA.withdrawals = mergeCollection(DATA.withdrawals, withdrawals);
    
    if (stock && stock.length > 0) {
      // El stock de la nube es la verdad absoluta para las cantidades
      DATA.stock = stock.map(remoteItem => {
        const localItem = DATA.stock.find(l => l.id === remoteItem.id || l.nombre === remoteItem.nombre);
        if (localItem) {
          return { ...localItem, ...remoteItem, imagen: localItem.imagen || remoteItem.imagen };
        }
        return remoteItem;
      });
    }

    window.dataLoaded = true;
    window.lastSyncTime = Date.now();
    console.log('✅ Datos sincronizados correctamente.');
    
    // Actualizar badges de navegación
    window.updateBadges();

    // Re-renderizar vista actual si es necesario
    const fnName = 'render' + window.currentView.charAt(0).toUpperCase() + window.currentView.slice(1);
    if (typeof window[fnName] === 'function') {
      const dataViews = ['dashboard', 'repairs', 'stock', 'transfers', 'audit', 'history'];
      if (dataViews.includes(window.currentView) || force) {
        window[fnName]();
      }
    }
  } catch (err) {
    console.error('Error cargando datos de Supabase:', err);
    if (force) showToast('⚠️ Error al sincronizar con la nube.', 'warning');
  } finally {
    window.isSyncing = false;
  }
};

window.updateBadges = function() {
  const repairsCount = DATA.repairs.filter(r => r.estado === 'recibido' || r.estado === 'progreso').length;
  const transfersCount = DATA.transfers.filter(t => t.estado === 'enviado' || t.estado === 'solicitado').length;
  
  const bRepairs = document.getElementById('badge-repairs');
  if (bRepairs) {
    bRepairs.textContent = repairsCount > 0 ? repairsCount : '';
    bRepairs.className = 'nav-badge' + (repairsCount > 0 ? ' active' : '');
  }
  
  const bTransfers = document.getElementById('badge-transfers');
  if (bTransfers) {
    bTransfers.textContent = transfersCount > 0 ? transfersCount : '';
    bTransfers.className = 'nav-badge' + (transfersCount > 0 ? ' active' : '');
  }
};

// ─── Auto-Sincronización Periódica ───────────
if (!window.syncInterval) {
  window.syncInterval = setInterval(() => {
    if (window.currentUser) {
      window.loadAllData(false); // Sincronización en segundo plano cada 60s
    }
  }, 60000);
}

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
    const navAudit = document.getElementById('nav-audit');

    if (role === 'admin') {
      if (navAudit) navAudit.style.display = 'flex';
    } else {
      if (navAudit) navAudit.style.display = 'none';
    }

    if (navCierre) {
      if (role === 'admin' || role === 'warehouse' || role === 'tech') {
        navCierre.setAttribute('style', 'display: none !important');
      } else {
        navCierre.style.display = 'flex';
      }
    }

    // Ocultar botones para Depósito y Técnicos
    const navDashboard = document.getElementById('nav-dashboard');
    const navSales     = document.getElementById('nav-sales');
    const navRepairs   = document.getElementById('nav-repairs');
    const navStock     = document.getElementById('nav-stock');
    const navTransfers = document.getElementById('nav-transfers');
    const navHistory   = document.getElementById('nav-history');

    if (role === 'warehouse') {
      if (navSales) navSales.style.display = 'none';
      if (navRepairs) navRepairs.style.display = 'none';
      navigate('stock');
    } else if (role === 'tech') {
      if (navDashboard) navDashboard.style.display = 'none';
      if (navSales) navSales.style.display = 'none';
      if (navStock) navStock.style.display = 'none';
      if (navTransfers) navTransfers.style.display = 'none';
      if (navHistory) navHistory.style.display = 'none';
      navigate('repairs');
    } else {
      navigate('dashboard');
    }

    // REGLA: Vendedores, Depósito y Técnicos no pueden cambiar sucursal en sidebar
    // El Admin sí puede para filtrar datos específicos si lo desea
    if (role === 'vendor' || role === 'warehouse' || role === 'tech') {
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

    const rolesMap = { admin: 'Administrador', vendor: 'Vendedor/a', warehouse: 'Encargado Depósito', tech: 'Técnico de Taller' };
    const initialsMap = { admin: 'AD', vendor: 'VE', warehouse: 'DE', tech: 'TE' };

    if (userLabel) userLabel.textContent = window.currentUser.name || 'Usuario';
    if (roleLabel) roleLabel.textContent = rolesMap[role] || 'Personal';
    if (avatarTag) avatarTag.textContent = initialsMap[role] || '??';

    updateClock();
    setInterval(updateClock, 60000);
    
    if (typeof testSupabaseConnection === 'function') testSupabaseConnection();

    // Cargar datos al iniciar sesión
    window.loadAllData();
    
    // Iniciar suscripciones en tiempo real
    if (typeof window.initRealtimeSubscription === 'function') {
      window.initRealtimeSubscription();
    }

    if (role === 'vendor') {
      checkCashShift();
    } else if (role === 'admin') {
      window.renderAdminShiftIndicators();
    }

  } catch (err) {
    console.error('Error Init:', err);
  }
};

// ─── Utilidades Globales de Seguridad ────────
window.getRepairBranch = function(r) {
  if (!r) return 'lanus';
  
  // PRIORIDAD 1: Campo oficial de admisión (fuente de verdad para filtrado de sucursal)
  const admit = r.sucursal_admit || r.sucursalAdmit;
  if (admit && admit !== '') return admit;
  
  // PRIORIDAD 2: Blindaje por prefijo de ID (L-xxx = Lanús, B-xxx = Belgrano)
  // Solo aplica a IDs con guión (los nuevos), NO a los mock que empiezan con '#'
  const id = String(r.id || '').toUpperCase();
  if (id.startsWith('L-')) return 'lanus';
  if (id.startsWith('B-')) return 'belgrano';
  
  // PRIORIDAD 3: Campo sucursal (respaldo)
  return r.sucursal || 'lanus';
};

window.checkCashShift = async function() {
  if (!window.currentUser || window.currentUser.role !== 'vendor') return;
  const loc = window.currentUser.location;

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI' && typeof db !== 'undefined') {
      const activeShift = await db.cash_shifts.getActive(loc);
      if (activeShift && activeShift.length > 0) {
        window.activeShiftData = activeShift[0];
        window.updateVendorShiftIndicator(true);
        return; // Caja está abierta
      }
    }
  } catch (e) {
    console.warn("No se pudo verificar el turno, saltando control de caja.", e);
    return;
  }

  // Caja cerrada, obligar a abrir
  window.updateVendorShiftIndicator(false);
  const html = `
    <div class="modal-overlay active" id="apertura-modal" style="z-index:9999; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px);">
      <div class="modal-box" style="text-align:center;">
        <div style="font-size:40px; margin-bottom:10px;">🔒</div>
        <div class="modal-title">Caja Cerrada</div>
        <p style="color:var(--text-muted); font-size:13px; margin-bottom:20px;">Antes de operar en <b>${loc.toUpperCase()}</b>, debés abrir la caja indicando el monto de cambio inicial.</p>
        
        <div class="form-group" style="text-align:left;">
          <label class="form-label">Efectivo Inicial en Caja ($)</label>
          <input type="number" id="apertura-monto" class="form-input" placeholder="Ej: 5000" style="font-size:20px; text-align:center; font-weight:bold; color:var(--gold-bright);" />
        </div>

        <button class="btn btn-primary" style="width:100%; padding:14px; font-size:16px;" onclick="window.confirmApertura()">Abrir Caja Ahora</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.confirmApertura = async function() {
  const montoInput = document.getElementById('apertura-monto').value;
  const monto = parseFloat(montoInput) || 0;
  
  if (monto < 0) {
    showToast('El monto no puede ser negativo', 'warning');
    return;
  }

  const shiftData = {
    sucursal: window.currentUser.location,
    estado: 'abierta',
    abierto_por: window.currentUser.user || window.currentUser.name,
    monto_inicial: monto
  };

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const res = await db.cash_shifts.openShift(shiftData);
      if (res && res.length > 0) window.activeShiftData = res[0];
    }
    
    if (window.logUserAction) {
      window.logUserAction('Apertura de Caja', `Monto Inicial: ${monto}`);
    }

    const m = document.getElementById('apertura-modal');
    if (m) m.remove();
    window.updateVendorShiftIndicator(true);
    showToast('✅ Caja Abierta Exitosamente', 'success');

  } catch (err) {
    showToast('Error al abrir la caja, reintente.', 'error');
  }
};

window.updateVendorShiftIndicator = function(isOpen) {
  let indicator = document.getElementById('vendor-shift-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'vendor-shift-indicator';
    indicator.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:1000; padding:8px 12px; border-radius:20px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(indicator);
  }

  if (isOpen) {
    indicator.innerHTML = '<span style="color:#4caf50;">🟢</span> Caja Abierta';
    indicator.style.background = 'var(--bg-card)';
    indicator.style.border = '1px solid rgba(76,175,80,0.3)';
    indicator.style.color = 'var(--text-primary)';
  } else {
    indicator.innerHTML = '<span style="color:#f44336;">🔴</span> Caja Cerrada';
    indicator.style.background = 'rgba(244,67,54,0.1)';
    indicator.style.border = '1px solid rgba(244,67,54,0.3)';
    indicator.style.color = '#f44336';
  }
};

window.renderAdminShiftIndicators = async function() {
  if (SUPABASE_KEY === 'TU_ANON_KEY_AQUI' || typeof db === 'undefined') return;

  try {
    const lanus = await db.cash_shifts.getActive('lanus');
    const belgrano = await db.cash_shifts.getActive('belgrano');

    const lanusOpen = lanus && lanus.length > 0;
    const belgranoOpen = belgrano && belgrano.length > 0;

    let adminIndicators = document.getElementById('admin-shift-indicators');
    if (!adminIndicators) {
      adminIndicators = document.createElement('div');
      adminIndicators.id = 'admin-shift-indicators';
      adminIndicators.style.cssText = 'display:flex; gap:10px; align-items:center; margin-right:15px; font-size:11px; font-weight:600; padding:6px 12px; background:rgba(0,0,0,0.03); border-radius:8px; border:1px solid var(--border-subtle);';
      const rightBar = document.querySelector('.topbar-right');
      if (rightBar) rightBar.insertBefore(adminIndicators, rightBar.firstChild);
    }

    if (adminIndicators) {
      adminIndicators.innerHTML = `
        <span style="color:${lanusOpen ? 'var(--green)' : 'var(--text-muted)'}">${lanusOpen ? '🟢' : '🔴'} LANÚS</span>
        <span style="color:var(--border-subtle)">|</span>
        <span style="color:${belgranoOpen ? 'var(--green)' : 'var(--text-muted)'}">${belgranoOpen ? '🟢' : '🔴'} BELGRANO</span>
      `;
    }
  } catch (err) {}
};

window.addEventListener('DOMContentLoaded', window.init);
