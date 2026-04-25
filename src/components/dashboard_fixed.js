// ==========================================
// DASHBOARD — Mercado de Cafeteras
// ==========================================

let isAdmin = false, isWarehouse = false, loc = 'lanus';

async function renderDashboard() {
  const v = document.getElementById('view-dashboard');
  if (!v.innerHTML) v.innerHTML = '<div class="loading">Cargando dashboard...</div>';

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const [remoteRepairs, remoteStock, remoteSales] = await Promise.all([
        db.repairs.getAll(),
        db.stock.getAll(),
        db.sales.getAll()
      ]);
      if (remoteRepairs) DATA.repairs = remoteRepairs;
      if (remoteStock && remoteStock.length > 0) {
        // Smart Merge para proteger los nuevos productos locales
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

      // Recalcular KPIs basados en datos reales
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

      // Actualizar objeto DATA.kpis
      ['lanus', 'belgrano'].forEach(loc => {
        const locSales = salesThisMonth.filter(s => s.sucursal === loc);
        const locRepairs = repairsThisMonth.filter(r => r.sucursal === loc);

        DATA.kpis[loc] = {
          ventas_mes: locSales.reduce((sum, s) => sum + (s.total || 0), 0),
          reparaciones_mes: locRepairs.length,
          reparaciones_pendientes: DATA.repairs.filter(r => r.sucursal === loc && r.estado !== 'entregado').length,
          ticket_promedio: locSales.length ? Math.round(locSales.reduce((sum, s) => sum + (s.total || 0), 0) / locSales.length) : 0
        };
      });
    }
  } catch (err) {
    console.warn('Error cargando datos de Supabase para Dashboard:', err);
  }

  try {
    const l = DATA.kpis.lanus || { ventas_mes: 0, reparaciones_mes: 0, reparaciones_pendientes: 0, ticket_promedio: 0 };
    const b = DATA.kpis.belgrano || { ventas_mes: 0, reparaciones_mes: 0, reparaciones_pendientes: 0, ticket_promedio: 0 };
    const totalVentas = (l.ventas_mes || 0) + (b.ventas_mes || 0);
    const totalReparaciones = (l.reparaciones_mes || 0) + (b.reparaciones_mes || 0);
    const pending = (l.reparaciones_pendientes || 0) + (b.reparaciones_pendientes || 0);

    // Alertas de stock crítico
    const criticalStock = DATA.stock.filter(s => {
      const qty = (s.lanus || 0) + (s.belgrano || 0) + (s.deposito || 0);
      return qty <= s.min;
    });

    isAdmin    = currentUser && currentUser.role === 'admin';
    isWarehouse = currentUser && currentUser.role === 'warehouse';
    loc         = (currentUser && currentUser.location) ? currentUser.location : 'lanus';
    const branchKPI = DATA.kpis[loc] || l;

    v.innerHTML = `
    <!-- KPIs Top Row -->
    <div class="grid-4" style="margin-bottom:22px;">
      ${kpiCard('💰', 'Ventas del Mes', formatCurrency(isAdmin ? totalVentas : branchKPI.ventas_mes), isAdmin ? 'Ambas sucursales' : (DATA.branches[loc]?.name || loc), isAdmin ? '+12%' : '', 'up')}
      ${kpiCard('🔧', 'Reparaciones', isAdmin ? totalReparaciones : branchKPI.reparaciones_mes, 'Completadas mes', '+8', 'up')}
      ${kpiCard('⏳', 'En Espera', isAdmin ? pending : branchKPI.reparaciones_pendientes, 'Trabajos hoy', '—', 'flat')}
      ${kpiCard('🛒', 'Ticket Prom.', formatCurrency(isAdmin ? Math.round((l.ticket_promedio + b.ticket_promedio) / 2) : branchKPI.ticket_promedio), 'Promedio actual', '+5%', 'up')}
    </div>

    <!-- Charts row -->
      <div class="card">
        <div class="section-header">
          <span class="section-title">Ventas por Día — Esta Semana</span>
          <span class="section-tag">${isAdmin || isWarehouse ? 'Ambas sucursales' : 'Tu sucursal'}</span>
        </div>
        <div class="bar-compare" id="bar-chart"></div>
        <div class="bar-legend">
          ${(isAdmin || isWarehouse || loc === 'lanus') ? '<span class="legend-item"><span class="legend-dot" style="background:var(--gold-bright)"></span>Lanús</span>' : ''}
          ${(isAdmin || isWarehouse || loc === 'belgrano') ? '<span class="legend-item"><span class="legend-dot" style="background:var(--blue)"></span>Belgrano</span>' : ''}
        </div>
      </div>

      <div class="card" style="${(isAdmin || isWarehouse) ? '' : 'display:none;'}">
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
          ${progressRow('Reparaciones', Math.round(l.reparaciones_mes / (totalReparaciones || 1) * 100), '', '')}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:600;color:var(--blue)">🏢 Belgrano</span>
            <span style="font-size:14px;font-weight:700;">${formatCurrency(b.ventas_mes)}</span>
          </div>
          ${progressRow('Ventas mes', Math.round(b.ventas_mes / (totalVentas || 1) * 100), 'blue', '')}
          ${progressRow('Reparaciones', Math.round(b.reparaciones_mes / (totalReparaciones || 1) * 100), 'blue', '')}
        </div>
      </div>

    <!-- Historial de Máquinas (NUEVO EN DASHBOARD) -->
    <div class="card" style="margin-bottom:22px;">
      <div class="section-header">
        <span class="section-title">📜 Historial de Máquinas Entregadas (Reciente)</span>
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;" onclick="navigate('history')">Ver historial completo →</button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>Cliente</th><th>Equipo</th><th>Fecha Entrega</th><th>Garantía</th></tr>
        </thead>
        <tbody>
          ${DATA.repairs
            .filter(r => r.estado === 'entregado' && (isAdmin || isWarehouse || r.sucursal === loc))
            .slice(0, 5).map(r => `
            <tr>
              <td style="font-weight:700;color:var(--gold-bright);">${r.id}</td>
              <td>${r.cliente}</td>
              <td style="font-size:12px;">${r.modelo}</td>
              <td style="color:var(--text-muted);font-size:12px;">${r.fechaEntrega ? new Date(r.fechaEntrega).toLocaleDateString() : '—'}</td>
              <td><span style="color:var(--green);font-size:11px;font-weight:700;">✅ Entregado</span></td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">No hay máquinas entregadas recientemente</td></tr>'}
        </tbody>
      </table>
    </div>


    <div class="grid-2">
      <div class="card">
        <div class="section-header">
          <span class="section-title">Reparaciones Recientes</span>
          <div style="display:flex;gap:10px;">
             <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;" onclick="navigate('repairs')">Ver todas →</button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Modelo</th><th>Cliente</th><th>Estado</th><th>Suc.</th></tr>
          </thead>
          <tbody>
            ${DATA.repairs
              .filter(r => r.estado !== 'entregado' && (isAdmin || isWarehouse || r.sucursal === loc))
              .slice(0, 5).map(r => `
              <tr>
                <td style="color:var(--text-muted);font-size:11px;">${r.id}</td>
                <td style="font-weight:500;">${r.modelo}</td>
                <td style="color:var(--text-secondary);">${r.cliente}</td>
                <td>${repairStatusBadge(r.estado)}</td>
                <td><span class="repair-card-branch ${r.sucursal === 'lanus' ? 'branch-lanus' : 'branch-belgrano'}">${r.sucursal === 'lanus' ? 'LAN' : 'BEL'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="section-header">
          <span class="section-title">⚠️ Alertas de Stock</span>
          <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;" onclick="navigate('stock')">Ver stock →</button>
        </div>
        ${criticalStock.length === 0
      ? `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">Sin alertas de stock</div></div>`
      : criticalStock.slice(0, 6).map(s => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
                <div>
                  <div style="font-size:13px;font-weight:600;margin-bottom:3px;">${s.nombre}</div>
                  <div style="font-size:11px;color:var(--text-muted);">${s.categoria}</div>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0;">
                  ${['lanus', 'belgrano', 'deposito'].map(suc => `
                    <div style="text-align:center;">
                      <div style="font-size:10px;font-weight:600;margin-bottom:3px;color:var(--text-muted);">${suc[0].toUpperCase()}</div>
                      <span class="stock-pill ${getStockStatus(s[suc], s.min).cls}" style="font-size:11px;">${s[suc]}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')
    }
      </div>
    </div>
  `;

    renderBarChart();
  } catch (err) {
    console.error('Error renderizando dashboard:', err);
    v.innerHTML = `<div class="error-state" style="padding:40px; text-align:center; color:var(--red);">
      <h3>⚠️ Error al cargar Dashboard</h3>
      <p style="font-size:13px; color:var(--text-muted); margin-top:10px;">${err.message}</p>
      <button class="btn btn-ghost" onclick="window.location.reload()" style="margin-top:20px;">🔄 Reintentar</button>
    </div>`;
  }
}

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
        <span style="font-size:12px;color:var(--text-secondary);">${label}</span>
        <span style="font-size:12px;color:var(--text-muted);">${pct}%</span>
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
    progreso: ['🟡 En proceso', 'color:var(--yellow);background:rgba(240,192,64,0.1);'],
    listo: ['🟢 Listo', 'color:var(--green);background:rgba(76,175,130,0.1);'],
  };
  const [label, style] = map[estado] || ['—', ''];
  return `<span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;${style}">${label}</span>`;
}

function renderBarChart() {
  const container = document.getElementById('bar-chart');
  if (!container) return;
  const d = DATA.ventas_semana;
  const maxVal = Math.max(...d.lanus, ...d.belgrano);

  container.innerHTML = d.labels.map((label, i) => {
    const lH = Math.round((d.lanus[i] / maxVal) * 130);
    const bH = Math.round((d.belgrano[i] / maxVal) * 130);
    const showLanus = isAdmin || isWarehouse || loc === 'lanus';
    const showBelgrano = isAdmin || isWarehouse || loc === 'belgrano';
    
    return `
      <div class="bar-group">
        <div class="bars">
          ${showLanus ? `<div class="bar lanus" style="height:${lH}px;" title="Lanús: ${formatCurrency(d.lanus[i])}"></div>` : ''}
          ${showBelgrano ? `<div class="bar belgrano" style="height:${bH}px;" title="Belgrano: ${formatCurrency(d.belgrano[i])}"></div>` : ''}
        </div>
        <div class="bar-label">${label}</div>
      </div>
    `;
  }).join('');
}
