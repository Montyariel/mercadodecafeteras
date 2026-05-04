// ==========================================
// HISTORIAL Y GARANTÍAS — Mercado de Cafeteras
// ==========================================

let historySearchQuery = '';

/**
 * Renderiza la vista de historial de máquinas entregadas
 */
function renderHistory() {
  const v = document.getElementById('view-history');
  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
      <div style="position:relative; flex:1; max-width:400px;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;">🔍</span>
        <input type="text" class="form-input" id="history-search" 
               placeholder="Buscar por cliente o Nro de reparación..." 
               style="padding-left:40px;" 
               oninput="updateHistorySearch(this.value)"
               value="${historySearchQuery}" />
      </div>
      <div style="font-size:13px;color:var(--text-muted);background:rgba(200,140,60,0.05);padding:8px 15px;border-radius:20px;border:1px solid var(--border-subtle);">
        🛡️ Garantía vigente: 90 días desde la entrega
      </div>
    </div>

    <div class="card" style="padding: 16px 0 24px 0;">
      <table class="history-table" style="width:100%; border-collapse:collapse; min-width:800px;">
        <thead style="background:var(--bg-secondary); border-bottom:1px solid var(--border-subtle);">
          <tr>
            <th style="padding:15px; text-align:left; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Ref #</th>
            <th style="padding:15px; text-align:left; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Cliente / Equipo</th>
            <th style="padding:15px; text-align:left; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Entrega</th>
            <th style="padding:15px; text-align:left; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Garantía</th>
            <th style="padding:15px; text-align:right; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Total</th>
            <th style="padding:15px; text-align:center; font-size:11px; text-transform:uppercase; color:var(--text-muted);">Acciones</th>
          </tr>
        </thead>
        <tbody id="history-tbody">
          <!-- Se llena dinámicamente -->
        </tbody>
      </table>
      <div id="history-empty" class="empty-state hidden" style="padding:60px 0;">
          <div class="empty-state-icon">📜</div>
          <div class="empty-state-text">No se encontraron máquinas entregadas</div>
      </div>
    </div>
  `;

  renderHistoryRows();
}

function updateHistorySearch(val) {
  historySearchQuery = val.toLowerCase();
  renderHistoryRows();
}

function renderHistoryRows() {
  const tbody = document.getElementById('history-tbody');
  const empty = document.getElementById('history-empty');
  if (!tbody) return;

  const isAdmin = currentUser && currentUser.role === 'admin';
  const userLoc = currentUser ? currentUser.location : 'lanus';

  const delivered = DATA.repairs.filter(r => {
    const deliveryDateVal = r.fechaEntrega || r.fecha_entrega;
    const isEntregado = r.estado === 'entregado' && deliveryDateVal;
    if (!isEntregado) return false;
    
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isWarehouse = currentUser && currentUser.role === 'warehouse';

    const repairBranch = window.getRepairBranch(r);
    // Si no es admin o depósito, filtrar por sucursal de origen
    if (!isAdmin && !isWarehouse) {
      return repairBranch === userLoc;
    }
    return true;
  });
  
  const filtered = delivered.filter(r => {
    const query = historySearchQuery.toLowerCase();
    return r.cliente.toLowerCase().includes(query) || 
           r.id.toLowerCase().includes(query) ||
           r.modelo.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  tbody.innerHTML = filtered.map(r => {
    // Cálculo de garantía
    const deliveryDateVal = r.fechaEntrega || r.fecha_entrega;
    const deliveryDate = new Date(deliveryDateVal);
    const today = new Date();
    const diffTime = Math.abs(today - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isWarrantyActive = diffDays <= 90;
    const daysLeft = 90 - diffDays;

    const total = r.presupuesto ? r.presupuesto.total : 0;
    const dateFormatted = deliveryDate.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });

    return `
      <tr style="border-bottom:1px solid var(--border-subtle); transition:background 0.2s;" onmouseover="this.style.background='rgba(200,140,60,0.03)'" onmouseout="this.style.background='transparent'">
        <td style="padding:15px; font-weight:700; color:var(--gold-bright); font-size:13px;">${r.id}</td>
        <td style="padding:15px;">
          <div style="font-weight:600; color:var(--text-primary);">${r.cliente}</div>
          <div style="font-size:12px; color:var(--text-muted);">${r.modelo}</div>
        </td>
        <td style="padding:15px; font-size:13px; color:var(--text-secondary);">${dateFormatted}</td>
        <td style="padding:15px;">
          ${isWarrantyActive 
            ? `<span style="background:rgba(76,175,130,0.1); color:var(--green); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;">✅ VIGENTE (${daysLeft} días)</span>`
            : `<span style="background:rgba(0,0,0,0.05); color:var(--text-muted); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;">⌛ VENCIDA</span>`
          }
        </td>
        <td style="padding:15px; text-align:right; font-weight:800; color:var(--text-primary); font-size:14px;">
          ${formatCurrency(total)}
        </td>
        <td style="padding:15px; text-align:center;">
          <button class="btn btn-ghost" style="font-size:11px; padding:6px 12px; border-color:var(--border-subtle);" 
            onclick="viewArchiveDetails('${r.id}')">👁️ Ver detalle</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Abre un modal para ver que se le hizo a la máquina
 */
function viewArchiveDetails(repairId) {
  const r = DATA.repairs.find(x => x.id === repairId);
  if (!r || !r.presupuesto) return;

  const compHtml = r.presupuesto.componentes.map(c => `
    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:13px;">
      <span style="color:var(--text-secondary);">• ${c.nombre}</span>
      <span style="font-weight:600; color:var(--text-primary);">${formatCurrency(c.precio)}</span>
    </div>
  `).join('');

  const modalHtml = `
    <div class="modal-overlay active" id="archive-modal">
        <div class="modal-box" style="width:450px;">
            <div class="modal-title">📄 Historial de Reparación</div>
            <div style="background:rgba(200,140,60,0.05); padding:15px; border-radius:8px; margin-bottom:20px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                    <div>
                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Cliente</div>
                        <div style="font-weight:600;">${r.cliente}</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Orden</div>
                        <div style="font-weight:700; color:var(--gold-bright);">${r.id}</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Equipo</div>
                        <div style="font-weight:600;">${r.modelo}</div>
                    </div>
                    <div>
                        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Sucursal</div>
                        <div style="font-weight:600;">${(r.sucursal_admit || r.sucursalAdmit || r.sucursal) === 'lanus' ? 'Lanús' : 'Belgrano'}</div>
                    </div>
                </div>
                ${(r.isOster || r.is_oster) ? `
                <div style="margin-top:10px; background:rgba(200,140,60,0.1); padding:10px; border-radius:4px; border:1px solid var(--gold-bright);">
                    <div style="font-size:10px; color:var(--gold-bright); text-transform:uppercase; font-weight:700;">Garantía Oficial Oster</div>
                    <div style="font-size:13px;"><b>Nro Operación:</b> ${r.osterOp || r.oster_op}</div>
                </div>` : ''}
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--border-subtle);">
                   <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Falla Recibida</div>
                   <div style="font-style:italic; font-size:13px; color:var(--text-secondary);">"${r.problema}"</div>
                </div>
            </div>

            <div class="section-title" style="font-size:11px; border-bottom:1px solid var(--border-subtle); padding-bottom:5px; margin-bottom:10px; text-transform:uppercase; color:var(--text-muted);">Trabajo Realizado</div>
            ${compHtml}
            <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:13px; border-bottom:1px solid var(--border-subtle);">
                <span style="color:var(--text-secondary);">• Mano de obra</span>
                <span style="font-weight:600; color:var(--text-primary);">${formatCurrency(r.presupuesto.manoObra)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:15px 0; margin-top:5px;">
                <span style="font-weight:700; font-size:15px;">TOTAL COBRADO</span>
                <span style="font-weight:900; font-size:18px; color:var(--gold-bright);">${formatCurrency(r.presupuesto.total)}</span>
            </div>

            <div class="form-actions" style="margin-top:20px;">
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
            </div>
        </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
