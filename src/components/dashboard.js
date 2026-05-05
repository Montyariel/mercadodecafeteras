// ==========================================
// DASHBOARD — Mercado de Cafeteras
// ==========================================

window.dashboardPeriod = 'mes'; // Periodo por defecto
window.dashboardCharts = {}; // Para guardar las instancias de Chart.js

window.renderDashboard = async function() {
  const v = document.getElementById('view-dashboard');
  if (!v) return;

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isWarehouse = currentUser && currentUser.role === 'warehouse';
  
  // Solo Admin y Depósito ven el Dashboard Ejecutivo Premium
  if (!isAdmin && !isWarehouse) {
    return renderVendorDashboard(v);
  }

  if (!v.innerHTML || v.innerHTML.includes('loading')) {
    v.innerHTML = '<div class="loading">Cargando dashboard ejecutivo...</div>';
  }

  // 1. Filtrado de datos por periodo
  const filteredSales = filterDataByPeriod(DATA.sales, window.dashboardPeriod);
  const filteredRepairs = filterDataByPeriod(DATA.repairs, window.dashboardPeriod);
  
  // 2. Cálculos de KPIs
  const totalVentas = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const ticketPromedio = filteredSales.length > 0 ? Math.round(totalVentas / filteredSales.length) : 0;
  
  const repsEnCurso = DATA.repairs.filter(r => !['entregado', 'rechazado'].includes(r.estado)).length;
  const repsListas = DATA.repairs.filter(r => r.estado === 'listo').length;
  
  const stockCritico = DATA.stock.filter(s => (s.lanus + s.belgrano + s.deposito) <= s.min).length;
  const stockBajo = DATA.stock.filter(s => {
    const total = s.lanus + s.belgrano + s.deposito;
    return total > s.min && total <= s.min * 1.5;
  }).length;

  // 3. Renderizar Estructura
  v.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; flex-wrap:wrap; gap:15px;">
      <div>
        <h2 class="font-display" style="font-size:24px; margin-bottom:4px;">Dashboard Ejecutivo</h2>
        <p style="color:var(--text-secondary); font-size:14px;">Resumen operativo — ${getPeriodLabel(window.dashboardPeriod)}</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <span style="font-size:12px; color:var(--text-muted); font-weight:600;">FILTRAR:</span>
        <select class="form-input" id="dash-period-selector" onchange="changeDashboardPeriod(this.value)" style="width:140px; background:var(--bg-card); border-color:var(--border-glow);">
          <option value="hoy" ${window.dashboardPeriod === 'hoy' ? 'selected' : ''}>Hoy</option>
          <option value="semana" ${window.dashboardPeriod === 'semana' ? 'selected' : ''}>Esta Semana</option>
          <option value="mes" ${window.dashboardPeriod === 'mes' ? 'selected' : ''}>Este Mes</option>
          <option value="trimestre" ${window.dashboardPeriod === 'trimestre' ? 'selected' : ''}>Este Trimestre</option>
          <option value="año" ${window.dashboardPeriod === 'año' ? 'selected' : ''}>Este Año</option>
        </select>
      </div>
    </div>

    <!-- Alertas Rápidas -->
    <div class="alerts-bar" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:24px;">
      ${stockCritico > 0 ? alertItem('⚠️', `${stockCritico} productos sin stock crítico`, 'critical') : ''}
      ${repsListas > 0 ? alertItem('🔧', `${repsListas} reparaciones listas para entregar`, 'warning') : ''}
      ${stockBajo > 0 ? alertItem('📦', `${stockBajo} productos con stock bajo`, 'info') : ''}
    </div>

    <!-- KPIs Principales -->
    <div class="grid-4" style="margin-bottom:32px;">
      ${kpiCardPremium('💰', 'Ingresos Totales', formatCurrency(totalVentas), `${filteredSales.length} ventas`, 'ventas', '+12.5%')}
      ${kpiCardPremium('🔧', 'Reparaciones', repsEnCurso, `${repsListas} listas p/ entregar`, 'reps', '+4')}
      ${kpiCardPremium('🛒', 'Ticket Promedio', formatCurrency(ticketPromedio), 'Por operación', 'ventas', 'flat')}
      ${kpiCardPremium('📦', 'Stock Crítico', stockCritico, `Insumos faltantes`, 'stock', stockCritico > 5 ? 'down' : 'flat')}
    </div>

    <!-- Gráficos -->
    <div class="grid-2" style="margin-bottom:32px; grid-template-columns: 1.5fr 1fr;">
      <div class="card" style="padding:24px;">
        <div class="section-header">
          <span class="section-title">Ventas por Día</span>
          <span class="section-tag">Historial reciente</span>
        </div>
        <div style="height:300px; position:relative;">
          <canvas id="chart-ventas-dia"></canvas>
        </div>
      </div>
      <div class="card" style="padding:24px;">
        <div class="section-header">
          <span class="section-title">Medios de Pago</span>
          <span class="section-tag">Distribución</span>
        </div>
        <div style="height:300px; position:relative;">
          <canvas id="chart-pagos"></canvas>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:32px;">
      <div class="card" style="padding:24px;">
        <div class="section-header">
          <span class="section-title">Estado de Reparaciones</span>
          <span class="section-tag">Total acumulado</span>
        </div>
        <div style="height:250px; position:relative;">
          <canvas id="chart-reparaciones"></canvas>
        </div>
      </div>
      <div class="card" style="padding:24px;">
        <div class="section-header">
          <span class="section-title">Stock por Categoría</span>
          <span class="section-tag">Volumen actual</span>
        </div>
        <div style="height:250px; position:relative;">
          <canvas id="chart-stock-cat"></canvas>
        </div>
      </div>
    </div>

    <!-- Top Productos -->
    <div class="card" style="padding:0; overflow:hidden;">
      <div class="qt-header" style="padding:20px 24px; border-bottom:1px solid var(--border-subtle); background:rgba(200,140,60,0.05);">
        <h3 class="font-display" style="font-size:16px;">🔥 Top 5 Productos Más Vendidos</h3>
      </div>
      <div class="qt-body">
        ${renderTopProducts(filteredSales)}
      </div>
    </div>
  `;

  // 4. Inicializar Gráficos con Chart.js
  setTimeout(() => initDashboardCharts(filteredSales, filteredRepairs), 100);
};

// --- DASHBOARD PARA VENDEDORES (Mantiene la simplicidad) ---
function renderVendorDashboard(v) {
  const loc = currentUser.location || 'lanus';
  const branchName = loc === 'lanus' ? 'Sucursal Lanús' : 'Sucursal Belgrano';
  
  const branchSales = DATA.sales.filter(s => s.sucursal === loc);
  const totalVentas = branchSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const pendingRepairs = DATA.repairs.filter(r => r.sucursal === loc && !['entregado', 'rechazado'].includes(r.estado)).length;
  
  v.innerHTML = `
    <div class="intro" style="margin-bottom:30px;">
      <h2 class="font-display" style="font-size:24px;">Bienvenido/a, ${currentUser.name}</h2>
      <p style="color:var(--text-secondary); font-size:14px;">Resumen de actividad en ${branchName}</p>
    </div>

    <div class="grid-3" style="margin-bottom:32px;">
      ${kpiCard('💰', 'Ventas del Mes', formatCurrency(totalVentas), branchName, '', 'up')}
      ${kpiCard('🔧', 'Reparaciones', pendingRepairs, 'Trabajos pendientes', '', 'flat')}
      ${kpiCard('📦', 'Alertas Stock', DATA.stock.filter(s => s[loc] <= s.min).length, 'Stock bajo o crítico', '', 'down')}
    </div>

    <div class="card">
       <div class="section-header">
          <span class="section-title">Ventas Recientes</span>
       </div>
       <table class="data-table">
          <thead><tr><th>Producto</th><th>Total</th></tr></thead>
          <tbody>
            ${branchSales.slice(0, 5).map(s => `<tr><td>${s.producto}</td><td>${formatCurrency(s.total)}</td></tr>`).join('')}
          </tbody>
       </table>
    </div>
  `;
}

// --- HELPERS ---

window.changeDashboardPeriod = function(p) {
  window.dashboardPeriod = p;
  renderDashboard();
};

function getPeriodLabel(p) {
  const labels = { hoy: 'Hoy', semana: 'Últimos 7 días', mes: 'Este mes', trimestre: 'Este trimestre', año: 'Este año' };
  return labels[p] || p;
}

function filterDataByPeriod(collection, period) {
  const now = new Date();
  const start = new Date();
  
  if (period === 'hoy') {
    start.setHours(0,0,0,0);
  } else if (period === 'semana') {
    start.setDate(now.getDate() - 7);
  } else if (period === 'mes') {
    start.setMonth(now.getMonth(), 1);
  } else if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3);
    start.setMonth(q * 3, 1);
  } else if (period === 'año') {
    start.setMonth(0, 1);
  }

  return collection.filter(item => {
    const date = new Date(item.fecha || item.created_at || item.opened_at);
    return date >= start;
  });
}

function alertItem(icon, msg, type) {
  const colors = { critical: 'var(--red)', warning: 'var(--yellow)', info: 'var(--blue)' };
  return `
    <div class="card" style="padding:12px 16px; display:flex; align-items:center; gap:12px; border-color:${colors[type]}44; background:${colors[type]}05;">
      <span style="font-size:18px;">${icon}</span>
      <span style="font-size:12px; font-weight:600; color:var(--text-primary);">${msg}</span>
    </div>
  `;
}

function kpiCardPremium(icon, label, value, sub, type, trend) {
  const colors = { ventas: 'var(--gold-mid)', reps: 'var(--green)', stock: 'var(--red)' };
  const trendHtml = trend !== 'flat' ? `
    <div style="font-size:10px; font-weight:700; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:10px; color:${trend.includes('+') ? 'var(--green)' : 'var(--red)'};">
      ${trend}
    </div>
  ` : '';

  return `
    <div class="kpi-card" style="position:relative; overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="width:40px; height:40px; border-radius:10px; background:${colors[type]}15; color:${colors[type]}; display:flex; align-items:center; justify-content:center; font-size:18px;">
          ${icon}
        </div>
        ${trendHtml}
      </div>
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:5px; font-weight:700;">${label}</div>
      <div class="font-display" style="font-size:26px; font-weight:800; color:var(--text-primary); margin-bottom:5px;">${value}</div>
      <div style="font-size:12px; color:var(--text-secondary);">${sub}</div>
    </div>
  `;
}

function renderTopProducts(sales) {
  // Contar ventas por producto
  const counts = {};
  sales.forEach(s => {
    counts[s.producto] = (counts[s.producto] || 0) + (s.qty || 1);
  });
  
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
    
  if (sorted.length === 0) return '<div style="padding:30px; text-align:center; color:var(--text-muted);">No hay ventas registradas en este periodo</div>';

  return sorted.map(([name, count], index) => {
    const item = DATA.stock.find(s => s.nombre === name);
    const stockTotal = item ? (item.lanus + item.belgrano + item.deposito) : 0;
    
    return `
      <div class="qt-row" style="display:flex; align-items:center; justify-content:space-between; padding:15px 24px; border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:15px;">
          <div style="width:30px; height:30px; border-radius:50%; background:var(--bg-surface); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--gold-bright); font-size:12px;">${index+1}</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${name}</div>
            <div style="font-size:11px; color:var(--text-muted);">Stock actual: ${stockTotal} unidades</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px; font-weight:800; color:var(--text-primary);">${count} <span style="font-size:10px; font-weight:400; color:var(--text-muted);">unid.</span></div>
          <div style="font-size:10px; color:var(--green); font-weight:700; text-transform:uppercase;">🔥 HOT ITEM</div>
        </div>
      </div>
    `;
  }).join('');
}

// --- CHART.JS INIT ---

function initDashboardCharts(sales, repairs) {
  // 1. Ventas por Día (Últimos 7 o 30 días según el periodo)
  initVentasChart(sales);
  
  // 2. Medios de Pago
  initPagosChart(sales);
  
  // 3. Estado de Reparaciones
  initReparacionesChart();
  
  // 4. Stock por Categoría
  initStockChart();
}

function initVentasChart(sales) {
  const ctx = document.getElementById('chart-ventas-dia');
  if (!ctx) return;
  
  // Agrupar por día (últimos 7 días)
  const days = [];
  const totals = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
    days.push(dateStr);
    
    const dayTotal = sales
      .filter(s => new Date(s.fecha || s.created_at).toDateString() === d.toDateString())
      .reduce((sum, s) => sum + (s.total || 0), 0);
    totals.push(dayTotal);
  }

  if (window.dashboardCharts.ventas) window.dashboardCharts.ventas.destroy();
  
  window.dashboardCharts.ventas = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Ventas ($)',
        data: totals,
        borderColor: '#f0c040',
        backgroundColor: 'rgba(240,192,64,0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#f0c040',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a08060', font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { color: '#a08060', font: { size: 10 } } }
      }
    }
  });
}

function initPagosChart(sales) {
  const ctx = document.getElementById('chart-pagos');
  if (!ctx) return;
  
  const pagos = { 'Efectivo': 0, 'Tarjeta': 0, 'Transferencia': 0 };
  sales.forEach(s => {
    const m = s.medio_pago || 'Efectivo';
    if (pagos[m] !== undefined) pagos[m] += s.total || 0;
  });

  if (window.dashboardCharts.pagos) window.dashboardCharts.pagos.destroy();
  
  window.dashboardCharts.pagos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(pagos),
      datasets: [{
        data: Object.values(pagos),
        backgroundColor: ['#f0c040', '#4caf82', '#5b9bd5'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#f0e6d3', font: { size: 11 }, padding: 15 } }
      },
      cutout: '70%'
    }
  });
}

function initReparacionesChart() {
  const ctx = document.getElementById('chart-reparaciones');
  if (!ctx) return;
  
  const stats = { 'Recibidas': 0, 'En Proceso': 0, 'Listas': 0, 'Entregadas': 0 };
  DATA.repairs.forEach(r => {
    if (r.estado === 'recibido') stats['Recibidas']++;
    else if (r.estado === 'progreso') stats['En Proceso']++;
    else if (r.estado === 'listo') stats['Listas']++;
    else if (r.estado === 'entregado') stats['Entregadas']++;
  });

  if (window.dashboardCharts.reps) window.dashboardCharts.reps.destroy();
  
  window.dashboardCharts.reps = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: ['#5b9bd5', '#f0c040', '#4caf82', '#a08060'],
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a08060' } },
        x: { grid: { display: false }, ticks: { color: '#a08060' } }
      }
    }
  });
}

function initStockChart() {
  const ctx = document.getElementById('chart-stock-cat');
  if (!ctx) return;
  
  const cats = {};
  DATA.stock.forEach(s => {
    const c = s.categoria || 'Otros';
    cats[c] = (cats[c] || 0) + (s.lanus + s.belgrano + s.deposito);
  });

  if (window.dashboardCharts.stock) window.dashboardCharts.stock.destroy();
  
  window.dashboardCharts.stock = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: Object.keys(cats),
      datasets: [{
        data: Object.values(cats),
        backgroundColor: ['rgba(240,192,64,0.4)', 'rgba(76,175,130,0.4)', 'rgba(91,155,213,0.4)', 'rgba(224,85,85,0.4)'],
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#f0e6d3', font: { size: 10 } } }
      },
      scales: {
        r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } }
      }
    }
  });
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
