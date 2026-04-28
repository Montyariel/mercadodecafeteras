// ==========================================
// DASHBOARD — Mercado de Cafeteras
// ==========================================

// Usamos window para asegurar visibilidad global y evitar "not defined"
window.renderDashboard = async function() {
  const v = document.getElementById('view-dashboard');
  if (!v) return;
  if (!v.innerHTML) v.innerHTML = '<div class="loading">Cargando dashboard...</div>';

  let isAdmin = false;
  let isWarehouse = false;
  let loc = 'lanus';

  try {
    // 1. Intentar cargar datos de Supabase
    if (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'TU_ANON_KEY_AQUI' && typeof db !== 'undefined') {
      try {
        const [remoteRepairs, remoteStock, remoteSales] = await Promise.all([
          db.repairs.getAll(),
          db.stock.getAll(),
          db.sales.getAll()
        ]);
        
        if (remoteRepairs) DATA.repairs = remoteRepairs;
        if (remoteStock && remoteStock.length > 0) {
          const localCopy = [...DATA.stock];
          DATA.stock = localCopy.map(localItem => {
            const remoteItem = remoteStock.find(r => r.nombre === localItem.nombre);
            if (remoteItem) {
              return { ...localItem, ...remoteItem, imagen: localItem.imagen || remoteItem.imagen };
            }
            return localItem;
          });
        }
        if (remoteSales) DATA.sales = remoteSales;

        // Recalcular KPIs
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const salesThisMonth = DATA.sales.filter(s => {
          const d = new Date(s.fecha || s.created_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const repairsThisMonth = DATA.repairs.filter(r => {
          const d = new Date(r.created_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        ['lanus', 'belgrano'].forEach(lkey => {
          const locSales = salesThisMonth.filter(s => s.sucursal === lkey);
          const locRepairs = repairsThisMonth.filter(r => r.sucursal === lkey);

          DATA.kpis[lkey] = {
            ventas_mes: locSales.reduce((sum, s) => sum + (s.total || 0), 0),
            reparaciones_mes: locRepairs.length,
            reparaciones_pendientes: DATA.repairs.filter(r => r.sucursal === lkey && r.estado !== 'entregado').length,
            ticket_promedio: locSales.length ? Math.round(locSales.reduce((sum, s) => sum + (s.total || 0), 0) / locSales.length) : 0
          };
        });
      } catch (dbErr) {
        console.warn('Dashboard: Fallo al traer datos remotos, usando locales.', dbErr);
      }
    }

    // 2. Preparar datos para el render
    const l = DATA.kpis.lanus || { ventas_mes: 0, reparaciones_mes: 0, reparaciones_pendientes: 0, ticket_promedio: 0 };
    const b = DATA.kpis.belgrano || { ventas_mes: 0, reparaciones_mes: 0, reparaciones_pendientes: 0, ticket_promedio: 0 };
    
    const totalVentas = (l.ventas_mes || 0) + (b.ventas_mes || 0);
    const totalReparaciones = (l.reparaciones_mes || 0) + (b.reparaciones_mes || 0);
    const pending = (l.reparaciones_pendientes || 0) + (b.reparaciones_pendientes || 0);

    const criticalStock = DATA.stock.filter(s => {
      const qty = (s.lanus || 0) + (s.belgrano || 0) + (s.deposito || 0);
      return qty <= s.min;
    });

    if (typeof currentUser !== 'undefined' && currentUser) {
      isAdmin = currentUser.role === 'admin';
      isWarehouse = currentUser.role === 'warehouse';
      loc = currentUser.location || 'lanus';
    }
    
    const isTotalView = isAdmin || isWarehouse;
    const branchKPI = DATA.kpis[loc] || l;
    const branchName = (DATA.branches && DATA.branches[loc]) ? DATA.branches[loc].name : loc;

    // 3. Renderizar HTML
    v.innerHTML = `
      <div class="grid-4" style="margin-bottom:22px;">
        ${kpiCard('💰', 'Ventas del Mes', formatCurrency(isTotalView ? totalVentas : branchKPI.ventas_mes), isTotalView ? 'Ambas sucursales' : branchName, isTotalView ? '+12%' : '', 'up')}
        ${kpiCard('🔧', 'Reparaciones', isTotalView ? totalReparaciones : branchKPI.reparaciones_mes, 'Completadas mes', '+8', 'up')}
        ${kpiCard('⏳', 'En Espera', isTotalView ? pending : branchKPI.reparaciones_pendientes, 'Trabajos hoy', '—', 'flat')}
        ${kpiCard('🛒', 'Ticket Prom.', formatCurrency(isTotalView ? Math.round((l.ticket_promedio + b.ticket_promedio) / 2) : branchKPI.ticket_promedio), 'Promedio actual', '+5%', 'up')}
      </div>

      <div class="grid-2" style="margin-bottom:22px;">
        <div class="card">
          <div class="section-header">
            <span class="section-title">Ventas por Día — Esta Semana</span>
            <span class="section-tag">${isTotalView ? 'Ambas sucursales' : 'Tu sucursal'}</span>
          </div>
          <div class="bar-compare" id="bar-chart"></div>
          <div class="bar-legend">
            ${(isTotalView || loc === 'lanus') ? '<span class="legend-item"><span class="legend-dot" style="background:var(--gold-bright)"></span>Lanús</span>' : ''}
            ${(isTotalView || loc === 'belgrano') ? '<span class="legend-item"><span class="legend-dot" style="background:var(--blue)"></span>Belgrano</span>' : ''}
          </div>
        </div>

        <div class="card" style="${isTotalView ? '' : 'display:none;'}">
          <div class="section-header">
            <span class="section-title">Desglose por Sucursal</span>
            <span class="section-tag">Mes actual</span>
          </div>
          <div style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:13px;font-weight:600;color:var(--gold-bright)">☕ Lanús</span>
              <span style="font-size:14px;font-weight:700;">${formatCurrency(l.ventas_mes)}</span>
            </div>
            ${progressRow('Ventas mes', Math.round(l.ventas_mes / (totalVentas || 1) * 100), '', '')}
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:13px;font-weight:600;color:var(--blue)">🏢 Belgrano</span>
              <span style="font-size:14px;font-weight:700;">${formatCurrency(b.ventas_mes)}</span>
            </div>
            ${progressRow('Ventas mes', Math.round(b.ventas_mes / (totalVentas || 1) * 100), 'blue', '')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:22px;">
        <div class="section-header">
          <span class="section-title">📜 Historial de Máquinas Entregadas</span>
          <button class="btn btn-ghost" style="font-size:12px;" onclick="navigate('history')">Ver todo →</button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Cliente</th><th>Equipo</th><th>Fecha</th><th>Estado</th></tr>
          </thead>
          <tbody>
            ${DATA.repairs
              .filter(r => r.estado === 'entregado' && (isAdmin || isWarehouse || window.getRepairBranch(r) === loc))
              .slice(0, 5).map(r => `
              <tr>
                <td style="font-weight:700;color:var(--gold-bright);">${r.id}</td>
                <td>${r.cliente}</td>
                <td style="font-size:12px;">${r.modelo}</td>
                <td style="color:var(--text-muted);font-size:12px;">${(r.fechaEntrega || r.fecha_entrega) ? new Date(r.fechaEntrega || r.fecha_entrega).toLocaleDateString() : '—'}</td>
                <td><span style="color:var(--green);font-size:11px;font-weight:700;">✅ Entregado</span></td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;">No hay máquinas entregadas</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="section-header">
            <span class="section-title">Reparaciones en Curso</span>
            <button class="btn btn-ghost" style="font-size:12px;" onclick="navigate('repairs')">Ver todas →</button>
          </div>
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>Modelo</th><th>Cliente</th><th>Estado</th></tr>
            </thead>
            <tbody>
              ${DATA.repairs
                .filter(r => r.estado !== 'entregado' && (isAdmin || isWarehouse || window.getRepairBranch(r) === loc))
                .slice(0, 5).map(r => `
                <tr>
                  <td style="color:var(--text-muted);font-size:11px;">${r.id}</td>
                  <td style="font-weight:500;">${r.modelo}</td>
                  <td style="color:var(--text-secondary);">${r.cliente}</td>
                  <td>${repairStatusBadge(r.estado)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="section-header">
            <span class="section-title">⚠️ Alertas de Stock</span>
            <button class="btn btn-ghost" style="font-size:12px;" onclick="navigate('stock')">Ver inventario →</button>
          </div>
          ${criticalStock.length === 0
            ? `<div class="empty-state">✅ Todo el stock está correcto</div>`
            : criticalStock.slice(0, 5).map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
                  <div>
                    <div style="font-size:13px;font-weight:600;">${s.nombre}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${s.categoria}</div>
                  </div>
                  <div style="display:flex;gap:5px;">
                    <span class="stock-pill ${getStockStatus(s.lanus + s.belgrano + s.deposito, s.min).cls}">${s.lanus + s.belgrano + s.deposito}</span>
                  </div>
                </div>
              `).join('')
          }
        </div>
      </div>
    `;

    renderBarChart(isTotalView, loc);

  } catch (err) {
    console.error('Error renderDashboard:', err);
    v.innerHTML = `<div class="error-state">⚠️ Error: ${err.message}</div>`;
  }
};

function kpiCard(icon, label, value, sub, badge, badgeType) {
  return `
    <div class="kpi-card">
      <div class="kpi-header">
        <span class="kpi-icon">${icon}</span>
        <span class="kpi-badge ${badgeType}">${badge}</span>
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-sub">${sub}</div>
    </div>
  `;
}

function progressRow(label, pct, colorClass, val) {
  return `
    <div class="progress-row">
      <div class="progress-label">
        <span style="font-size:12px;">${label}</span>
        <span style="font-size:12px;">${pct}%</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill ${colorClass}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function repairStatusBadge(estado) {
  const map = {
    recibido: ['🔵 Recibido', 'color:var(--blue);background:rgba(91,155,213,0.1);'],
    progreso: ['🟡 Proceso',  'color:var(--yellow);background:rgba(240,192,64,0.1);'],
    listo:    ['🟢 Listo',    'color:var(--green);background:rgba(76,175,130,0.1);'],
  };
  const [label, style] = map[estado] || ['—', ''];
  return `<span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;${style}">${label}</span>`;
}

function renderBarChart(isTotalView, loc) {
  const container = document.getElementById('bar-chart');
  if (!container) return;
  const d = DATA.ventas_semana;
  const maxVal = Math.max(...d.lanus, ...d.belgrano) || 1;

  container.innerHTML = d.labels.map((label, i) => {
    const lH = Math.round((d.lanus[i] / maxVal) * 100);
    const bH = Math.round((d.belgrano[i] / maxVal) * 100);
    const showL = isTotalView || loc === 'lanus';
    const showB = isTotalView || loc === 'belgrano';
    
    return `
      <div class="bar-group">
        <div class="bars">
          ${showL ? `<div class="bar lanus" style="height:${lH}px;"></div>` : ''}
          ${showB ? `<div class="bar belgrano" style="height:${bH}px;"></div>` : ''}
        </div>
        <div class="bar-label">${label}</div>
      </div>
    `;
  }).join('');
}
