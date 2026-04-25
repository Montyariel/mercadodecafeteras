// ==========================================
// REPARACIONES — Mercado de Cafeteras
// ==========================================

let repairsFilter = 'all';

function toggleOsterField() {
  const isOster = document.getElementById('is-oster').checked;
  const group = document.getElementById('oster-field-group');
  if (group) group.classList.toggle('hidden', !isOster);
}

function generateNextRepairId(branch) {
  const prefix = branch === 'lanus' ? 'L-' : 'B-';
  const branchRepairs = DATA.repairs.filter(r => r.id.startsWith(prefix));
  
  let maxNum = 0;
  branchRepairs.forEach(r => {
    const num = parseInt(r.id.split('-')[1]);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });
  
  return prefix + (maxNum + 1).toString().padStart(3, '0');
}

function onBranchChange() {
  const branch = document.getElementById('rep-sucursal').value;
  const idField = document.getElementById('rep-id-manual');
  idField.value = generateNextRepairId(branch);
}



// ─── Render principal ─────────────────────
async function renderRepairs() {
  const v = document.getElementById('view-repairs');
  
  // Mostrar loading o usar mock mientras carga
  if (!v.innerHTML) v.innerHTML = '<div class="loading">Cargando reparaciones...</div>';

  try {
    // Intentar traer de Supabase
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const remoteData = await db.repairs.getAll();
      if (remoteData) DATA.repairs = remoteData;
    }
  } catch (err) {
    console.warn('Usando mock data para reparaciones:', err);
  }

  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn ${repairsFilter==='all'      ?'btn-primary':'btn-ghost'}" onclick="filterRepairs('all')">Todas</button>
        <button class="btn ${repairsFilter==='recibido' ?'btn-primary':'btn-ghost'}" onclick="filterRepairs('recibido')">🔵 Recibidas</button>
        <button class="btn ${repairsFilter==='progreso' ?'btn-primary':'btn-ghost'}" onclick="filterRepairs('progreso')">🟡 En proceso</button>
        <button class="btn ${repairsFilter==='listo'    ?'btn-primary':'btn-ghost'}" onclick="filterRepairs('listo')">🟢 Listas</button>
      </div>
      <button class="btn btn-primary" onclick="openRepairModal()">+ Nueva Reparación</button>
    </div>

    <div class="kanban-board" id="kanban-board"></div>

    <!-- Modal: Nueva reparación -->
    <div class="modal-overlay" id="repair-modal">
      <div class="modal-box">
        <div class="modal-title">🔧 Nueva Reparación</div>
        <div class="form-group">
          <input class="form-input" id="rep-id-manual" type="text" readonly style="background:rgba(200,140,60,0.1); font-weight:700; color:var(--gold-bright); cursor:not-allowed;" />
          <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">* Generado automáticamente según sucursal.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Modelo de la cafetera</label>
          <input class="form-input" id="rep-modelo" type="text" placeholder="Ej: Nespresso Vertuo Next" />
        </div>
        <div class="form-group">
          <label class="form-label">Nombre del cliente</label>
          <input class="form-input" id="rep-cliente" type="text" placeholder="Nombre completo" />
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono / WhatsApp</label>
          <input class="form-input" id="rep-cel" type="text" placeholder="11-XXXX-XXXX" />
        </div>
        <div class="form-group">
          <label class="form-label">Problema reportado</label>
          <input class="form-input" id="rep-problema" type="text" placeholder="Describe el problema" />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Sucursal</label>
            <select class="form-input" id="rep-sucursal" onchange="onBranchChange()">
              <option value="lanus">Lanús</option>
              <option value="belgrano">Belgrano</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prioridad</label>
            <select class="form-input" id="rep-prioridad">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>

        <div style="background:rgba(200,140,60,0.05); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:12px; margin-bottom:15px;">
           <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:10px;">
             <input type="checkbox" id="is-oster" onchange="toggleOsterField()" style="width:18px;height:18px;cursor:pointer;" />
             <label for="is-oster" style="font-weight:600; font-size:14px; color:var(--text-primary); cursor:pointer;">¿Es Garantía Oficial Oster?</label>
           </div>
           <div id="oster-field-group" class="hidden" style="margin-top:10px; border-top:1px solid var(--border-subtle); padding-top:10px;">
             <label class="form-label">Número de Operación Oster</label>
             <input class="form-input" id="rep-oster-op" type="text" placeholder="Ej: OP-456900" />
             <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">* Las reparaciones de garantía Oster no generan cobro al cliente.</p>
           </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="closeRepairModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveRepair()">✅ Guardar</button>
        </div>
      </div>
    </div>



    <!-- Modal: Presupuesto de reparación -->
    <div class="modal-overlay" id="presupuesto-modal">
      <div class="modal-box" style="width:520px;max-width:95vw;">
        <div class="modal-title">💲 Cargar Presupuesto</div>
        <div id="presupuesto-repair-info" style="
            background:rgba(200,140,60,0.07);border:1px solid var(--border-subtle);
            border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:20px;font-size:13px;">
        </div>

        <!-- Diagnóstico Técnico -->
        <div class="form-group">
          <label class="form-label">🔩 Diagnóstico Técnico (Interno)</label>
          <textarea class="form-input" id="diag-tecnico" rows="2" placeholder="Describe el hallazgo del técnico..."></textarea>
        </div>

        <!-- Componentes a reemplazar -->
        <div class="form-group">
          <label class="form-label">📦 Componentes / Repuestos (del Stock)</label>
          <div id="componentes-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px;" onclick="addStockComponentRow()">
              🔍 Buscar en Stock
            </button>
            <button class="btn btn-ghost" style="font-size:12px;padding:6px 14px;" onclick="addComponenteRow()">
              + Manual
            </button>
          </div>
        </div>

        <!-- Mano de obra -->
        <div class="form-group">
          <label class="form-label">🛠️ Mano de obra ($)</label>
          <input class="form-input" id="mano-obra" type="number" min="0" placeholder="0"
            oninput="recalcTotal()" />
        </div>

        <!-- Total calculado -->
        <div id="recalc-container" style="
            background:rgba(200,140,60,0.1);border:1px solid var(--border-glow);
            border-radius:var(--radius-sm);padding:14px 18px;
            display:flex;justify-content:space-between;align-items:center;
            margin-bottom:20px;">
          <div>
             <span style="font-size:14px;font-weight:600;color:var(--text-secondary);">Total del presupuesto</span>
             <div id="oster-badge-presu" class="hidden" style="color:var(--gold-bright);font-size:11px;font-weight:700;">GARANTÍA OSTER ($0)</div>
          </div>
          <span id="presupuesto-total"
            style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--gold-bright);">
            $0
          </span>
        </div>

        <div class="form-actions" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <button class="btn btn-ghost" onclick="closePresupuestoModal()">Cancelar</button>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-success" id="btn-aprobar-manual" onclick="aprobarYGuardar()">
              👍 Aprobar Cliente
            </button>
            <button class="btn btn-ghost" style="color:var(--green);border-color:rgba(76,175,130,0.3);"
              onclick="enviarPresupuestoWA()">
              📲 WhatsApp
            </button>
            <button class="btn btn-primary" onclick="guardarPresupuesto()">
              💾 Solo Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderKanban();
}

// ─── Filtro ──────────────────────────────
function filterRepairs(f) {
  repairsFilter = f;
  renderRepairs();
}

// ─── Kanban ──────────────────────────────
function renderKanban() {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  const columns = [
    { key: 'recibido', label: '🔵 Recibido',            cls: 'col-received' },
    { key: 'progreso', label: '🟡 En proceso',           cls: 'col-progress' },
    { key: 'listo',    label: '🟢 Listo para entregar',  cls: 'col-done'     },
  ];

  board.innerHTML = columns.map(col => {
    const cards = DATA.repairs.filter(r =>
      r.estado === col.key && (repairsFilter === 'all' || repairsFilter === col.key)
    );
    return `
      <div class="kanban-col ${col.cls}">
        <div class="kanban-col-header">
          <span class="kanban-col-title">${col.label}</span>
          <span class="kanban-count">${cards.length}</span>
        </div>
        ${cards.length === 0
          ? `<div class="empty-state" style="padding:30px 10px;">
               <div class="empty-state-icon" style="font-size:28px;">📭</div>
               <div class="empty-state-text" style="font-size:12px;">Sin trabajos</div>
             </div>`
          : cards.map(r => repairCardHTML(r, col.key)).join('')}
      </div>
    `;
  }).join('');
}

// ─── Tarjeta kanban ───────────────────────
function repairCardHTML(r, colKey) {
  const prioColor = { alta: 'var(--red)', media: 'var(--yellow)', baja: 'var(--green)' };

  // Sucursal de admisión vs física (Logística de taller)
  const admitBranch = r.sucursal_admit || r.sucursal;
  
  let locBadge = '';
  if (admitBranch === 'belgrano' && r.sucursal === 'belgrano' && r.estado !== 'listo' && r.estado !== 'entregado') {
     locBadge = `<span style="font-size:9px;background:rgba(235,87,87,0.15);color:var(--red);padding:2px 6px;border-radius:4px;margin-left:5px;border:1px solid rgba(235,87,87,0.3);">🚚 En envío a Taller</span>`;
  } else if (admitBranch === 'belgrano' && r.sucursal === 'lanus') {
     locBadge = `<span style="font-size:9px;background:rgba(76,175,130,0.15);color:var(--green);padding:2px 6px;border-radius:4px;margin-left:5px;border:1px solid rgba(76,175,130,0.3);">📍 En Taller Lanús</span>`;
  }

  // Bloque de diagnóstico técnico (si existe)
  const diagBlock = r.diagnosticoTecnico
    ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:8px;padding:6px;background:rgba(255,255,255,0.03);border-radius:4px;border-left:2px solid var(--gold-bright);">
        <b style="color:var(--gold-bright);">Diagnóstico:</b> ${r.diagnosticoTecnico}
       </div>`
    : '';

  // Bloque de presupuesto (si existe)
  const statusBadge = r.aprobado 
    ? `<span style="background:var(--green);color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:8px;">APROBADO</span>`
    : (r.presupuesto ? `<span style="background:var(--yellow);color:#000;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;margin-left:8px;">PDTE. APROBACIÓN</span>` : '');

  const presupuestoBlock = r.presupuesto
    ? `<div style="
          margin-top:10px;
          background:rgba(200,140,60,0.08);
          border:1px solid var(--border-glow);
          border-radius:6px;padding:8px 10px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px;display:flex;justify-content:space-between;">
           <span>Presupuesto ${r.isOster ? '(OSTER)' : ''}</span>
           ${statusBadge}
        </div>
        ${r.presupuesto.componentes.map(c =>
          `<div style="font-size:11px;color:var(--text-secondary);display:flex;justify-content:space-between;">
            <span>• ${c.nombre}</span><span>${r.isOster ? '$0' : formatCurrency(c.precio)}</span>
           </div>`
        ).join('')}
        ${r.presupuesto.manoObra > 0
          ? `<div style="font-size:11px;color:var(--text-secondary);display:flex;justify-content:space-between;">
               <span>• Mano de obra</span><span>${r.isOster ? '$0' : formatCurrency(r.presupuesto.manoObra)}</span>
             </div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-subtle);">
          <span style="font-size:12px;font-weight:700;color:var(--text-primary);">Total</span>
          <span style="font-size:14px;font-weight:800;color:var(--gold-bright);">${formatCurrency(r.presupuesto.total)}</span>
        </div>
      </div>`
    : '';

  // Botones según columna
  let actionBtns = '';
  if (colKey === 'recibido') {
    actionBtns = `
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;"
        onclick="advanceRepair('${r.id}','progreso')">→ Iniciar diagnóstico</button>`;

  } else if (colKey === 'progreso') {
    const btnPresup = `
      <button class="btn ${r.presupuesto ? 'btn-ghost' : 'btn-primary'}"
        style="font-size:11px;padding:4px 10px;"
        onclick="openPresupuestoModal('${r.id}')">
        ${r.presupuesto ? '✏️ Editar presupuesto' : '💲 Cargar presupuesto'}
      </button>`;
    const btnWA = r.presupuesto
      ? `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--green);border-color:rgba(76,175,130,0.3);background:rgba(76,175,130,0.05);"
           onclick="enviarPresupuestoWACard('${r.id}')">📲 Enviar Presupuesto para Confirmación</button>`
      : '';
    const btnListo = r.presupuesto
      ? `<button class="btn btn-success" style="font-size:11px;padding:4px 10px;"
           onclick="advanceRepair('${r.id}','listo')">✓ Listo para entrega</button>`
      : `<span style="font-size:11px;color:var(--text-muted);font-style:italic;">Cargá el presupuesto primero</span>`;
    actionBtns = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;">
        ${btnPresup}${btnWA}${btnListo}
      </div>`;

  } else {
    actionBtns = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;">
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;"
          onclick="notifyClient('${r.id}')">📲 Avisar al cliente</button>
        <button class="btn btn-primary" style="font-size:11px;padding:4px 10px;"
          onclick="advanceRepair('${r.id}','entregado')">🤝 Entregar equipo</button>
      </div>`;
  }

  return `
    <div class="repair-card" id="card-${r.id.slice(1)}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <span class="repair-card-id">${r.id}</span>
        <span style="width:8px;height:8px;border-radius:50%;background:${prioColor[r.prioridad]};flex-shrink:0;margin-top:2px;"
          title="Prioridad ${r.prioridad}"></span>
      </div>
      <div class="repair-card-title">${r.modelo} ${r.isOster ? '<span style="color:var(--gold-bright);font-size:10px;">(OSTER)</span>' : ''} ${locBadge}</div>
      <div class="repair-card-client">👤 ${r.cliente}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">📞 ${r.celular}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;font-style:italic;">"${r.problema}"</div>
      ${diagBlock}
      ${presupuestoBlock}
      <div class="repair-card-footer" style="margin-top:10px;">
        <span class="repair-card-date">📅 ${r.fecha}</span>
        <span class="repair-card-branch ${r.sucursal==='lanus'?'branch-lanus':'branch-belgrano'}">
          ${r.sucursal==='lanus'?'Lanús':'Belgrano'}
        </span>
      </div>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;border-color:rgba(200,140,60,0.3);" 
          onclick="printAdmissionReceipt('${r.id}')">🖨️ Ticket</button>
        <div>${actionBtns}</div>
      </div>
    </div>
  `;
}

// ─── Avanzar estado ───────────────────────
async function advanceRepair(id, newState) {
  const repair = DATA.repairs.find(r => r.id === id);
  if (repair) {
    repair.estado = newState;
    if (newState === 'entregado') {
      repair.fechaEntrega = new Date();
    }

    // Persistir en Supabase
    try {
      if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
        const updates = { 
          estado: newState, 
          fecha_entrega: repair.fechaEntrega ? repair.fechaEntrega.toISOString() : null 
        };
        await db.repairs.update(id, updates);
      }
    } catch (err) {
      console.error('Error al actualizar en Supabase:', err);
    }

    renderKanban();
    const msgs = { 
      progreso: '🟡 Diagnóstico iniciado', 
      listo: '🟢 ¡Reparación lista para entregar!',
      entregado: '🤝 ¡Equipo entregado exitosamente!'
    };
    showToast(msgs[newState] || 'Estado actualizado', 'success');
  }
}

// ─── Avisar cliente (listo) ───────────────
function notifyClient(id) {
  const r = DATA.repairs.find(r => r.id === id);
  if (!r) return;
  const precio = r.presupuesto ? ` El costo total fue de *${formatCurrency(r.presupuesto.total)}*.` : '';
  const msg = encodeURIComponent(
    `Hola ${r.cliente}! 🎉 Tu cafetera *${r.modelo}* ya está lista para retirar en nuestra sucursal.${precio} ¡Te esperamos! — Mercado de Cafeteras ☕`
  );
  const cel = r.celular.replace(/\D/g, '');
  window.open(`https://wa.me/54${cel}?text=${msg}`, '_blank');
  showToast('📲 Abriendo WhatsApp...', 'success');
}

// ═══════════════════════════════════════════
// PRESUPUESTO — Modal y lógica
// ═══════════════════════════════════════════

let _presupuestoRepairId = null;
let _componenteCount     = 0;

function openPresupuestoModal(repairId) {
  _presupuestoRepairId = repairId;
  _componenteCount     = 0;

  const r = DATA.repairs.find(x => x.id === repairId);
  if (!r) return;

  // Info de la reparación en el header del modal
  document.getElementById('presupuesto-repair-info').innerHTML = `
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
      <div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Equipo</div>
        <div style="font-weight:700;color:var(--text-primary);">${r.modelo}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Cliente</div>
        <div style="font-weight:600;color:var(--text-secondary);">${r.cliente} · ${r.celular}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Problema</div>
        <div style="color:var(--text-secondary);font-style:italic;">"${r.problema}"</div>
      </div>
    </div>
  `;

  // Limpiar lista y cargar si ya existe presupuesto
  const lista = document.getElementById('componentes-list');
  lista.innerHTML = '';
  document.getElementById('mano-obra').value = '';
  document.getElementById('diag-tecnico').value = r.diagnosticoTecnico || '';

  // Badge Oster
  const badOster = document.getElementById('oster-badge-presu');
  if (r.isOster) badOster.classList.remove('hidden');
  else badOster.classList.add('hidden');

  if (r.presupuesto) {
    r.presupuesto.componentes.forEach(c => {
      if (c.stockId) addStockComponentRow(c.stockId, c.nombre, c.precio);
      else addComponenteRow(c.nombre, c.precio);
    });
    document.getElementById('mano-obra').value = r.presupuesto.manoObra || 0;
  } else {
    // No agregamos fila vacía por defecto para que el usuario elija
  }

  recalcTotal();
  document.getElementById('presupuesto-modal').classList.add('active');
}

function closePresupuestoModal() {
  document.getElementById('presupuesto-modal').classList.remove('active');
  _presupuestoRepairId = null;
}

// Agrega una fila de componente al formulario
function addComponenteRow(nombre = '', precio = '') {
  const id   = ++_componenteCount;
  const list = document.getElementById('componentes-list');
  if (!list) return;

  const row = document.createElement('div');
  row.id    = `comp-row-${id}`;
  row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;';
  row.innerHTML = `
    <input class="form-input" id="comp-nombre-${id}" type="text"
      placeholder="Ej: Mantenimiento preventivo" value="${nombre}"
      style="font-size:13px;" />
    <input class="form-input" id="comp-precio-${id}" type="number"
      min="0" placeholder="$" value="${precio}"
      oninput="recalcTotal()"
      style="width:90px;font-size:13px;" />
    <button class="btn btn-danger" style="padding:8px 10px;font-size:13px;"
      onclick="removeComponenteRow(${id})">✕</button>
  `;
  list.appendChild(row);
}

// Agrega una fila que selecciona del stock
function addStockComponentRow(stockId = '', nombre = '', precio = '') {
  const id   = ++_componenteCount;
  const list = document.getElementById('componentes-list');
  if (!list) return;

  const options = DATA.stock.map(s => 
    `<option value="${s.id}" ${s.id == stockId ? 'selected' : ''}>${s.nombre} (${formatCurrency(s.precio)})</option>`
  ).join('');

  const row = document.createElement('div');
  row.id    = `comp-row-${id}`;
  row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;';
  row.innerHTML = `
    <select class="form-input" id="comp-stockid-${id}" onchange="updateRowPrice(${id})" style="font-size:13px;">
      <option value="">-- Seleccionar item del stock --</option>
      ${options}
    </select>
    <input class="form-input" id="comp-precio-${id}" type="number"
      min="0" placeholder="$" value="${precio}"
      oninput="recalcTotal()"
      style="width:90px;font-size:13px;" />
    <button class="btn btn-danger" style="padding:8px 10px;font-size:13px;"
      onclick="removeComponenteRow(${id})">✕</button>
  `;
  list.appendChild(row);
  if (stockId) updateRowPrice(id);
}

function updateRowPrice(rowId) {
  const sId = document.getElementById(`comp-stockid-${rowId}`).value;
  const item = DATA.stock.find(s => s.id == sId);
  if (item) {
    document.getElementById(`comp-precio-${rowId}`).value = item.precio;
    recalcTotal();
  }
}

function removeComponenteRow(id) {
  const row = document.getElementById(`comp-row-${id}`);
  if (row) row.remove();
  recalcTotal();
}

// Recalcula el total en tiempo real
function recalcTotal() {
  const lista     = document.getElementById('componentes-list');
  if (!lista) return;
  const precios   = Array.from(lista.querySelectorAll('input[type=number]'))
    .map(i => parseFloat(i.value) || 0);
  const manoObra  = parseFloat(document.getElementById('mano-obra')?.value) || 0;
  
  const r = DATA.repairs.find(x => x.id === _presupuestoRepairId);
  const subtotal  = precios.reduce((a, b) => a + b, 0);
  const total     = r?.isOster ? 0 : (subtotal + manoObra);
  
  const el        = document.getElementById('presupuesto-total');
  if (el) el.textContent = formatCurrency(total);
}

// Recolecta los datos del formulario del modal
function collectPresupuestoData() {
  const lista      = document.getElementById('componentes-list');
  const manoObra   = parseFloat(document.getElementById('mano-obra')?.value) || 0;
  const componentes = [];

  let i = 1;
  while (i <= _componenteCount) {
    const nEl = document.getElementById(`comp-nombre-${i}`);
    const sEl = document.getElementById(`comp-stockid-${i}`);
    const pEl = document.getElementById(`comp-precio-${i}`);
    
    if (pEl) {
      if (sEl && sEl.value) {
        const item = DATA.stock.find(s => s.id == sEl.value);
        componentes.push({ stockId: sEl.value, nombre: item.nombre, precio: parseFloat(pEl.value) || 0 });
      } else if (nEl && nEl.value.trim()) {
        componentes.push({ nombre: nEl.value.trim(), precio: parseFloat(pEl.value) || 0 });
      }
    }
    i++;
  }

  const r = DATA.repairs.find(x => x.id === _presupuestoRepairId);
  const total = r?.isOster ? 0 : (componentes.reduce((a, c) => a + c.precio, 0) + manoObra);
  return { componentes, manoObra, total };
}

// Guardar presupuesto en el objeto de reparación
async function guardarPresupuesto(silencioso = false) {
  const r = DATA.repairs.find(x => x.id === _presupuestoRepairId);
  if (!r) return;

  const diag = document.getElementById('diag-tecnico').value.trim();
  r.diagnosticoTecnico = diag;

  const data = collectPresupuestoData();
  if (data.componentes.length === 0 && data.manoObra === 0 && !r.isOster) {
    showToast('⚠️ Agregá al menos un componente o la mano de obra', 'error');
    return;
  }

  r.presupuesto = data;

  // Persistir en Supabase
  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      await db.repairs.update(r.id, { 
        presupuesto: data, 
        diagnostico_tecnico: diag 
      });
    }
  } catch (err) {
    console.error('Error al guardar presupuesto en Supabase:', err);
  }

  if (!silencioso) {
    closePresupuestoModal();
    renderKanban();
    showToast(`✅ Cambios guardados (${formatCurrency(data.total)})`, 'success');
  }
}

// Función para aprobar y descontar stock
function aprobarYGuardar() {
  const r = DATA.repairs.find(x => x.id === _presupuestoRepairId);
  if (!r) return;

  guardarPresupuesto(true);
  
  // Descontar stock (Reserva)
  if (r.presupuesto && r.presupuesto.componentes) {
    r.presupuesto.componentes.forEach(comp => {
      if (comp.stockId) {
        const item = DATA.stock.find(s => s.id == comp.stockId);
        if (item) {
          if (item[r.sucursal] > 0) {
            item[r.sucursal]--;
          } else {
            showToast(`⚠️ Stock insuficiente de ${item.nombre} en ${r.sucursal}`, 'error');
          }
        }
      }
    });
  }

  r.aprobado = true;
  closePresupuestoModal();
  renderKanban();
  showToast('🤝 Presupuesto aprobado y stock reservado', 'success');
}

// Enviar presupuesto por WhatsApp desde el modal
function enviarPresupuestoWA() {
  const r = DATA.repairs.find(x => x.id === _presupuestoRepairId);
  if (!r) return;
  const data = collectPresupuestoData();
  _enviarPresupuestoMsj(r, data);
}

// Enviar presupuesto por WhatsApp desde tarjeta (ya guardado)
function enviarPresupuestoWACard(repairId) {
  const r = DATA.repairs.find(x => x.id === repairId);
  if (!r || !r.presupuesto) return;
  _enviarPresupuestoMsj(r, r.presupuesto);
}

function _enviarPresupuestoMsj(r, data) {
  const lineas = [
    `Hola *${r.cliente}*! 👋`,
    ``,
    `Te informamos el diagnóstico de tu *${r.modelo}* (${r.id}):`,
    ``,
    `🔍 *Problema detectado:* ${r.problema}`,
    r.diagnosticoTecnico ? `🔩 *Diagnóstico Técnico:* ${r.diagnosticoTecnico}` : '',
    ``,
    r.isOster ? `🛡️ *Este equipo ingresó por Garantía Oficial Oster.*` : `🔩 *Repuestos a reemplazar:*`,
    ...(r.isOster ? [] : data.componentes.map(c => `  • ${c.nombre}: ${formatCurrency(c.precio)}`)),
    (!r.isOster && data.manoObra > 0) ? `  • Mano de obra: ${formatCurrency(data.manoObra)}` : '',
    ``,
    r.isOster ? `💰 *COSTO REPARACIÓN: SIN CARGO ($0)*` : `💰 *TOTAL DEL PRESUPUESTO: ${formatCurrency(data.total)}*`,
    ``,
    `Por favor confirmanos si aprobás la reparación para coordinar la entrega.`,
    ``,
    `_Mercado de Cafeteras ☕_`,
  ].filter(l => l !== undefined);

  const msg = encodeURIComponent(lineas.join('\n'));
  const cel = r.celular.replace(/\D/g, '');
  window.open(`https://wa.me/54${cel}?text=${msg}`, '_blank');
  showToast('📲 Presupuesto enviado por WhatsApp', 'success');
}

// ─── Modal nueva reparación ───────────────
function openRepairModal()  {
  document.getElementById('rep-id-manual').value = '';
  document.getElementById('rep-modelo').value = '';
  document.getElementById('rep-cliente').value = '';
  document.getElementById('rep-cel').value = '';
  document.getElementById('rep-problema').value = '';
  document.getElementById('is-oster').checked = false;
  document.getElementById('rep-oster-op').value = '';
  document.getElementById('oster-field-group').classList.add('hidden');
  
  // Auto-ID
  const defaultBranch = currentUser.location || 'lanus';
  document.getElementById('rep-sucursal').value = defaultBranch;
  document.getElementById('rep-id-manual').value = generateNextRepairId(defaultBranch);

  document.getElementById('repair-modal').classList.add('active'); 
}
function closeRepairModal() { document.getElementById('repair-modal').classList.remove('active'); }

async function saveRepair() {
  const manualId = document.getElementById('rep-id-manual').value.trim();
  const modelo   = document.getElementById('rep-modelo').value.trim();
  const cliente  = document.getElementById('rep-cliente').value.trim();
  const cel      = document.getElementById('rep-cel').value.trim();
  const problema = document.getElementById('rep-problema').value.trim();
  const sucursal = document.getElementById('rep-sucursal').value;
  const prioridad= document.getElementById('rep-prioridad').value;
  const isOster  = document.getElementById('is-oster').checked;
  const oster_op = document.getElementById('rep-oster-op').value.trim();

  if (!manualId || !modelo || !cliente || !problema) {
    showToast('⚠️ Completá todos los campos, incluyendo el número de reparación', 'error');
    return;
  }

  if (isOster && !oster_op) {
    showToast('⚠️ Para garantía Oster, el número de operación es obligatorio', 'error');
    return;
  }

  // Verificar que el ID no esté repetido
  if (DATA.repairs.some(r => r.id === manualId)) {
    showToast('⚠️ Ese número de reparación ya existe', 'error');
    return;
  }

  const today = new Date();
  const fecha = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear()}`;

  const newRepair = { 
    id: manualId, modelo, cliente, celular: cel || '—', problema, fecha, 
    sucursal_admit: sucursal, // Match database schema
    sucursal: sucursal, // Initial state, without forcing
    estado: 'recibido', prioridad,
    is_oster: isOster, oster_op: isOster ? oster_op : '',
    diagnostico_tecnico: '', aprobado: false
  };

  // Persistir en Supabase
  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      await db.repairs.insert(newRepair);

      if (sucursal === 'belgrano') {
        const today = new Date();
        const f_hor = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')} ${today.getHours()}:${today.getMinutes()}hs`;
        const trId = 'REM-REP-' + manualId;
        const newTr = {
          id: trId,
          origen: 'belgrano', destino: 'lanus',
          producto: '🔧 Máq. a Reparar (' + modelo + ') ID:' + manualId,
          stock_id: null,
          qty: 1,
          fecha: f_hor,
          estado: 'enviado'
        };
        DATA.transfers.unshift(newTr);
        await db.transfers.insert(newTr);
      }

    } else {
      // MOCK
      if (sucursal === 'belgrano') {
        const today = new Date();
        const f_hor = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')} ${today.getHours()}:${today.getMinutes()}hs`;
        DATA.transfers.unshift({
          id: 'REM-REP-' + manualId,
          origen: 'belgrano', destino: 'lanus',
          producto: '🔧 Máq. a Reparar (' + modelo + ')',
          stock_id: null, qty: 1, fecha: f_hor, estado: 'enviado'
        });
      }
    }
  } catch (err) {
    console.error('Error al insertar en Supabase:', err);
    showToast('⚠️ Error al conectar con Supabase, pero se guardó localmente.', 'warning');
  }

  DATA.repairs.unshift(newRepair);
  
  closeRepairModal();
  renderKanban();
  showToast(`✅ Reparación ${manualId} registrada`, 'success');

  // Preguntar si desea imprimir el ticket inmediatamente
  if (confirm(`¿Desea imprimir el comprobante de ingreso para ${cliente}?`)) {
    printAdmissionReceipt(manualId);
  }
}
