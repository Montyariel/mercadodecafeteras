// ==========================================
// AUDITORIA — Mercado de Cafeteras
// ==========================================

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
      <h2 class="font-display" style="font-size:18px;">Historial de Auditoría y Seguridad</h2>
      <div style="font-size:12px; color:var(--text-muted);">Registro inmutable de movimientos</div>
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
                  <span class="section-tag">${log.rol || 'Personal'}</span>
                  <span class="${branchClass}" style="padding:2px 6px;border-radius:4px;border:1px solid var(--border-subtle); margin-left:5px;">${sucursal.toUpperCase()}</span>
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
