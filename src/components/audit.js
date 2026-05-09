// ==========================================
// AUDITORIA — Mercado de Cafeteras
// ==========================================

window.exportToExcel = function() {
  if (typeof XLSX === 'undefined') {
    showToast('Error: Librería Excel no cargada. Revisa la conexión.', 'error');
    return;
  }
  showToast('Generando reporte Excel...', 'success');

  const wb = XLSX.utils.book_new();

  // 1. Ventas Detalle
  const salesData = (DATA.sales || []).map(s => ({
    Fecha: s.fecha,
    Hora: s.hora || '—',
    Producto: s.producto || '—',
    Categoría: s.categoria || '—',
    Cantidad: s.qty || 1,
    'Precio Unit': s.precio || s.total,
    Total: s.total,
    'Medio Pago': s.metodoPago || s.metodo_pago,
    Sucursal: s.sucursal,
    Vendedor: s.vendedor || '—'
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesData);
  XLSX.utils.book_append_sheet(wb, wsSales, "Ventas Detalle");

  // 2. Resumen Diario
  const summaryMap = {};
  (DATA.sales || []).forEach(s => {
    const f = s.fecha;
    if (!summaryMap[f]) {
      summaryMap[f] = { Fecha: f, 'Total Ventas': 0, Efectivo: 0, Tarjeta: 0, Transferencia: 0, 'Mercado Pago': 0, 'Belgrano': 0, 'Lanús': 0 };
    }
    summaryMap[f]['Total Ventas'] += s.total;
    summaryMap[f][s.sucursal === 'belgrano' ? 'Belgrano' : 'Lanús'] += s.total;
    
    const mp = (s.metodoPago || s.metodo_pago || '').toLowerCase();
    if (mp.includes('efectivo')) summaryMap[f].Efectivo += s.total;
    else if (mp.includes('tarjeta') || mp.includes('debito') || mp.includes('credito')) summaryMap[f].Tarjeta += s.total;
    else if (mp.includes('transferencia') || mp.includes('transf')) summaryMap[f].Transferencia += s.total;
    else if (mp.includes('mercadopago') || mp.includes('mp') || mp.includes('qr')) summaryMap[f]['Mercado Pago'] += s.total;
  });
  const summaryData = Object.values(summaryMap).sort((a,b) => a.Fecha.localeCompare(b.Fecha));
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Diario");

  // 3. Gastos y Retiros
  const wData = (DATA.withdrawals || []).map(w => ({
    Fecha: w.fecha,
    Categoría: w.categoria || 'retiro',
    Motivo: w.motivo || '—',
    Monto: w.monto,
    Sucursal: w.sucursal,
    Usuario: w.usuario || w.vendedor || '—'
  }));
  const wsWith = XLSX.utils.json_to_sheet(wData);
  XLSX.utils.book_append_sheet(wb, wsWith, "Gastos y Retiros");

  // 4. Reparaciones
  const rData = (DATA.repairs || []).map(r => ({
    ID: r.id,
    Modelo: r.modelo,
    Cliente: r.cliente,
    'Fecha Ingreso': r.fecha,
    'Fecha Entrega': r.fechaEntrega ? new Date(r.fechaEntrega).toLocaleDateString() : '—',
    Estado: r.estado,
    'Total Presupuesto': r.presupuesto ? r.presupuesto.total : 0,
    'Mano Obra': r.presupuesto ? r.presupuesto.manoObra : 0,
    'Sucursal Ingreso': r.sucursal_admit || r.sucursalAdmit || r.sucursal,
    'Sucursal Taller': r.sucursal
  }));
  const wsRep = XLSX.utils.json_to_sheet(rData);
  XLSX.utils.book_append_sheet(wb, wsRep, "Reparaciones");

  // Guardar archivo
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Reporte_MercadoCafeteras_${dateStr}.xlsx`);
};

window.renderAudit = async function () {
  const v = document.getElementById('view-audit');
  if (!v) return;

  if (!v.innerHTML || v.innerHTML.includes('loading')) {
    v.innerHTML = '<div class="loading" style="text-align:center;padding:40px;color:var(--text-secondary);">🔍 Cargando historial de auditoría...</div>';
  }

  try {
    if (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'TU_ANON_KEY_AQUI' && typeof db !== 'undefined') {
      const logs = await db.audit_logs.getAll();
      if (logs) {
        if (typeof DATA !== 'undefined') DATA.audit = logs;
      }
    }
  } catch (err) {
    console.warn('Error al cargar auditoría:', err);
  }

  const logsToDisplay = (typeof DATA !== 'undefined' && DATA.audit) ? DATA.audit : [];

  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 class="font-display" style="font-size:18px;margin-bottom:4px;">Auditoría y Análisis</h2>
        <div style="font-size:12px; color:var(--text-muted);">Registro de movimientos y reportes analíticos</div>
      </div>
      <button class="btn btn-primary" onclick="exportToExcel()" style="padding: 8px 16px; background-color: #217346; border-color: #217346;">
        📊 Exportar a Excel
      </button>
    </div>

    <div class="card" style="padding: 16px 0 24px 0; overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha y Hora</th>
            <th>Usuario</th>
            <th>Rol / Sucursal</th>
            <th>Acción</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
          ${logsToDisplay.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No hay registros de auditoría aún.</td></tr>' : logsToDisplay.map(log => {
            const dateObj = log.created_at ? new Date(log.created_at) : new Date();
            const dateStr = isNaN(dateObj) ? 'Fecha desconocida' : (dateObj.toLocaleDateString('es-AR') + ' ' + dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs');
            
            const sucursal = log.sucursal || '—';
            const branchClass = sucursal.toLowerCase() === 'lanus' ? 'branch-lanus' : (sucursal.toLowerCase() === 'belgrano' ? 'branch-belgrano' : '');
            
            return `
              <tr>
                <td style="color:var(--text-muted); font-size:11px; white-space:nowrap;">${dateStr}</td>
                <td style="font-weight:600; font-size:13px; color:var(--text-primary);">${log.usuario || 'Anónimo'}</td>
                <td style="font-size:11px;">
                  <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    <span class="section-tag" style="display:inline-block; line-height:1;">${log.rol || 'Personal'}</span>
                    <span class="${branchClass}" style="display:inline-block; line-height:1; padding:2px 6px;border-radius:4px;border:1px solid var(--border-subtle);">${sucursal.toUpperCase()}</span>
                  </div>
                </td>
                <td style="font-weight:700; color:var(--gold-mid);">${log.accion || 'Movimiento'}</td>
                <td style="font-size:12px; color:var(--text-secondary); min-width:200px; max-width:400px; line-height:1.4;">${log.detalles || ''}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
};
