// ==========================================
// TRASLADOS Y LOGÍSTICA — Mercado de Cafeteras
// ==========================================

window.renderTransfers = async function () {
  const v = document.getElementById('view-transfers');

  if (!v.innerHTML) v.innerHTML = '<div class="loading">Cargando logística...</div>';

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const remoteTransfers = await db.transfers.getAll();
      if (remoteTransfers) DATA.transfers = remoteTransfers;
    }
  } catch (err) {
    console.warn('Usando mock data para traslados:', err);
  }

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isWarehouse = currentUser && currentUser.role === 'warehouse';
  const loc = (currentUser && currentUser.location) ? currentUser.location : 'lanus';

  const displayedTransfers = DATA.transfers.filter(t =>
    isAdmin || isWarehouse || t.origen === loc || t.destino === loc
  );

  const solicitados = displayedTransfers.filter(t => t.estado === 'solicitado').length;
  const enCamino = displayedTransfers.filter(t => t.estado === 'enviado').length;

  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
      <h2 class="font-display" style="font-size:18px;">Logística y Transferencias</h2>
      <div style="display:flex; gap:10px;">
        ${currentUser.role !== 'admin' ? '<button class="btn btn-ghost" style="border:1px solid var(--text-muted);" onclick="openRequestModal()">+ Solicitar Producto al Depósito</button>' : ''}
        ${currentUser.role === 'admin' ? '<button class="btn btn-primary" onclick="openTransferModal()">+ Nuevo Envío Directo</button>' : ''}
      </div>
    </div>

    <!-- Mini KPIs -->
    <div class="grid-3" style="margin-bottom:22px;">
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-icon">🚚</span></div>
        <div class="kpi-value">${displayedTransfers.length}</div>
        <div class="kpi-label">Movimientos totales</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-icon">📝</span></div>
        <div class="kpi-value" style="color:var(--text-secondary);">${solicitados}</div>
        <div class="kpi-label">Solicitudes Pendientes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-icon">📍</span></div>
        <div class="kpi-value" style="color:var(--yellow);">${enCamino}</div>
        <div class="kpi-label">En camino al local</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID Remito</th><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Origen → Destino</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${displayedTransfers.length === 0
      ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No hay logística registrada</td></tr>'
      : displayedTransfers.map(t => `
            <tr style="background: ${t.estado === 'con_error' ? 'rgba(235,87,87,0.05)' : 'transparent'};">
              <td style="font-weight:700; color:var(--gold-mid);">${String(t.id).replace(/-[0-9]+$/, '')}</td>
              <td style="color:var(--text-muted); font-size:11px;">${t.fecha}</td>
              <td style="font-weight:600; font-size:12px; max-width:200px;">${t.producto}</td>
              <td style="text-align:center; font-weight:700;">${t.qty}</td>
              <td style="font-size:11px;">
                <span class="${t.origen === 'deposito' ? '' : (t.origen === 'lanus' ? 'branch-lanus' : 'branch-belgrano')}" style="padding:2px 6px;border-radius:4px;border:1px solid var(--border-subtle);">${t.origen.toUpperCase()}</span>
                <span style="color:var(--text-muted);">→</span>
                <span class="${t.destino === 'deposito' ? '' : (t.destino === 'lanus' ? 'branch-lanus' : 'branch-belgrano')}" style="padding:2px 6px;border-radius:4px;border:1px solid var(--border-subtle);">${t.destino.toUpperCase()}</span>
              </td>
              <td>
                <span class="stock-pill" style="
                  ${t.estado === 'recibido' ? 'color:var(--green); border-color:var(--green);' : ''}
                  ${t.estado === 'con_error' ? 'color:var(--red); border-color:var(--red);' : ''}
                  ${t.estado === 'enviado' ? 'color:var(--yellow); border-color:var(--yellow);' : ''}
                  ${t.estado === 'solicitado' ? 'color:var(--text-secondary); border-color:var(--text-secondary);' : ''}
                ">
                  ${t.estado === 'recibido' ? '✓ Recibido' : ''}
                  ${t.estado === 'con_error' ? '❌ Desvío/Error' : ''}
                  ${t.estado === 'enviado' ? '🚚 En camino' : ''}
                  ${t.estado === 'solicitado' ? '📝 Solicitado' : ''}
                </span>
              </td>
              <td style="display:flex; gap:5px;">
                ${getTransferActions(t)}
                <button class="btn btn-ghost" style="padding:4px 8px; font-size:11px;" onclick="printRemito('${t.id}')">🖨️ PDF</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.getTransferActions = function (t) {
  if (t.estado === 'solicitado' && currentUser.role === 'admin') {
    return `<button class="btn btn-primary" style="font-size:10px;padding:4px 8px;" onclick="approveRequest('${t.id}')">Aprobar y Enviar →</button>`;
  }
  if (t.estado === 'enviado' && (currentUser.location === t.destino || currentUser.role === 'admin')) {
    return `
      <button class="btn btn-primary" style="font-size:10px;padding:4px 8px; background:var(--green); color:white;" onclick="receiveTransfer('${t.id}')">✅ Confirmar Recepción</button>
      <button class="btn btn-ghost" style="font-size:10px;padding:4px 8px; border:1px solid var(--red); color:var(--red);" onclick="reportTransferError('${t.id}')">⚠️ Reportar Desvío</button>
    `;
  }
  return '';
}

window.transferCart = [];

window.renderTransferCartOptions = function () {
  const origen = document.getElementById('tr-origen').value;
  const prodSelect = document.getElementById('tr-prod');
  if (!prodSelect) return;
  prodSelect.innerHTML = DATA.stock.map(s => {
    const stck = s[origen] || 0;
    return `<option value="${s.id}">${s.nombre} (Stock: ${stck})</option>`;
  }).join('');
}

window.onTransferOrigenChange = function () {
  window.transferCart = [];
  renderTransferCartOptions();
  renderTransferCartUI();
}

window.addTransferCartItem = function () {
  const pId = parseInt(document.getElementById('tr-prod').value);
  const qty = parseInt(document.getElementById('tr-qty').value);
  const origen = document.getElementById('tr-origen').value;

  if (isNaN(qty) || qty <= 0) return;
  const prod = DATA.stock.find(s => s.id === pId);
  if (!prod) return;

  const currentCartQty = window.transferCart.filter(item => item.id === pId).reduce((acc, item) => acc + item.qty, 0);

  if ((currentCartQty + qty) > (prod[origen] || 0)) {
    showToast(`⚠️ No hay stock suficiente en ${origen.toUpperCase()} (Total Disp: ${prod[origen] || 0})`, 'error');
    return;
  }

  const existing = window.transferCart.find(item => item.id === pId);
  if (existing) {
    existing.qty += qty;
  } else {
    window.transferCart.push({ id: pId, nombre: prod.nombre, qty });
  }

  document.getElementById('tr-qty').value = 1;
  renderTransferCartUI();
}

window.removeTransferCartItem = function (pId) {
  window.transferCart = window.transferCart.filter(item => item.id !== pId);
  renderTransferCartUI();
}

window.renderTransferCartUI = function () {
  const list = document.getElementById('transfer-cart-list');
  if (!list) return;

  if (window.transferCart.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted); text-align:center; margin-top:20px;">No agregaste productos al envío.</div>';
    return;
  }

  list.innerHTML = window.transferCart.map(item => `
    <div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--border-subtle);">
      <span><strong style="color:var(--gold-mid);">${item.qty}x</strong> ${item.nombre}</span>
      <button class="btn btn-ghost" onclick="removeTransferCartItem(${item.id})" title="Quitar" style="padding:0 5px; color:var(--red); font-size:14px;">X</button>
    </div>
  `).join('');
}

/* Modal Triggers */
window.openTransferModal = function (prodId = null) {
  window.transferCart = [];
  document.getElementById('transfer-modal').classList.add('active');
  renderTransferCartOptions();
  renderTransferCartUI();
  if (prodId) document.getElementById('tr-prod').value = prodId;
}
window.closeTransferModal = function () {
  document.getElementById('transfer-modal').classList.remove('active');
}
window.openRequestModal = function (prodId = null) {
  const m = document.getElementById('request-modal');
  if (!m) return;

  m.classList.add('active');

  // Poblar select de productos si está vacío o para asegurar datos frescos
  const prodSelect = document.getElementById('req-prod');
  if (prodSelect) {
    prodSelect.innerHTML = DATA.stock.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    if (prodId) prodSelect.value = prodId;
  }

  // Actualizar descripción con la ubicación del usuario
  const desc = document.getElementById('request-modal-desc');
  if (desc && window.currentUser) {
    desc.textContent = `Esto generará un aviso al depósito para que te lo envíen a tu local (${window.currentUser.location.toUpperCase()}). El stock no se altera hasta que ellos confirmen el envío.`;
  }

  if (typeof onRequestProdChange === 'function') {
    onRequestProdChange();
  }
}
window.closeRequestModal = function () {
  const m = document.getElementById('request-modal');
  if (m) m.classList.remove('active');
}

window.onRequestProdChange = function () {
  const pId = parseInt(document.getElementById('req-prod').value);
  const prod = DATA.stock.find(s => s.id === pId);
  const el = document.getElementById('req-modal-stock-info');
  if (prod && el) {
    el.innerHTML = `Stock disponible en <b>Depósito</b>: <span style="color:${prod.deposito > 0 ? 'var(--green)' : 'var(--red)'}; font-weight:bold;">${prod.deposito}</span> u.`;
  }
}

/* Logic */
window.generateTransferID = function () {
  return 'REM-' + Math.floor(1000 + Math.random() * 9000);
}

window.createRequest = async function () {
  const pId = parseInt(document.getElementById('req-prod').value);
  const qty = parseInt(document.getElementById('req-qty').value);
  const destino = currentUser.location;

  if (qty <= 0) return;
  const prod = DATA.stock.find(s => s.id === pId);
  const today = new Date();

  const newReq = {
    id: generateTransferID(),
    origen: 'deposito', destino,
    producto: prod.nombre, stock_id: pId,
    qty,
    fecha: `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')} ${today.getHours()}:${today.getMinutes()}hs`,
    estado: 'solicitado'
  };

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      await db.transfers.insert(newReq);
    }
  } catch (e) {
    showToast('⚠️ Error conexión', 'warning');
  }

  DATA.transfers.unshift(newReq);
  closeRequestModal();
  renderTransfers();
  showToast('Solicitud enviada al Depósito', 'success');
}

window.approveRequest = async function (trId) {
  const tr = DATA.transfers.find(t => t.id === trId);
  const prod = DATA.stock.find(s => s.id === parseInt(tr.stock_id));

  if (prod[tr.origen] < tr.qty) {
    showToast(`⚠️ Stock insuficiente en ${tr.origen.toUpperCase()} (Hay ${prod[tr.origen]}). No se puede enviar.`, 'error');
    return;
  }

  // 1. Descontamos de origen
  prod[tr.origen] -= tr.qty;
  tr.estado = 'enviado';

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      await Promise.all([
        db.transfers.update(trId, { estado: 'enviado' }),
        db.stock.updateBranch(prod.id, tr.origen, prod[tr.origen])
      ]);
    }
  } catch (err) { }

  renderTransfers();
  showToast('✅ Mercadería enviada y stock del origen descontado', 'success');
  printRemito(trId); // Automáticamente sugiere imprimir el remito para dárselo al flete
}

window.createTransfer = async function () {
  const origen = document.getElementById('tr-origen').value;
  const destino = document.getElementById('tr-destino').value;

  if (origen === destino) {
    showToast('⚠️ Origen y destino deben ser distintos', 'error');
    return;
  }

  if (!window.transferCart || window.transferCart.length === 0) {
    showToast('⚠️ Agregá al menos un producto al envío', 'error');
    return;
  }

  // Validate ALL stocks before proceeding
  for (const item of window.transferCart) {
    const prod = DATA.stock.find(s => s.id === item.id);
    if (!prod || (prod[origen] || 0) < item.qty) {
      showToast(`⚠️ No hay stock suficiente de ${item.nombre} en ${origen.toUpperCase()}`, 'error');
      return;
    }
  }

  const today = new Date();
  const fecha = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')} ${today.getHours()}:${today.getMinutes()}hs`;

  const baseTrId = generateTransferID();
  const createdTransfersIds = [];
  const pUpdates = [];

  for (let i = 0; i < window.transferCart.length; i++) {
    const item = window.transferCart[i];
    const trId = window.transferCart.length > 1 ? `${baseTrId}-${i + 1}` : baseTrId;
    createdTransfersIds.push(trId);

    const prod = DATA.stock.find(s => s.id === item.id);
    prod[origen] -= item.qty; // Descuento optimista

    const newTr = {
      id: trId,
      origen, destino, producto: prod.nombre, stock_id: item.id, qty: item.qty,
      fecha: fecha,
      estado: 'enviado'
    };
    DATA.transfers.unshift(newTr);

    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      pUpdates.push(db.transfers.insert(newTr));
      pUpdates.push(db.stock.updateBranch(item.id, origen, prod[origen]));
    }
  }

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      await Promise.all(pUpdates);
    }
  } catch (err) {
    console.warn('Error en Supabase, aplicando ROLLBACK', err);
    showToast('⚠️ Falla de conectividad. Revirtiendo transacción.', 'error');

    // Rollback: Revertir stock local descontado
    for (let i = 0; i < window.transferCart.length; i++) {
      const item = window.transferCart[i];
      const prod = DATA.stock.find(s => s.id === item.id);
      if (prod) prod[origen] += item.qty;
    }

    // Remover de DATA.transfers los registros creados temporalmente
    DATA.transfers = DATA.transfers.filter(t => !createdTransfersIds.includes(t.id));
    renderTransfers();
    return;
  }

  closeTransferModal();
  renderTransfers();
  showToast('🚚 Envío múltiple registrado con éxito', 'success');

  if (window.logUserAction) {
    const nombresProds = window.transferCart.map(c => `${c.qty}x ${c.nombre}`).join(', ');
    window.logUserAction('Traslado Creado', `Desde: ${origen.toUpperCase()} | Hacia: ${destino.toUpperCase()} | Items: ${nombresProds}`);
  }

  printMultiRemito(createdTransfersIds, baseTrId, origen, destino, fecha);
}

window.printMultiRemito = function (ids, baseTrId, origen, destino, fecha) {
  const trs = ids.map(id => DATA.transfers.find(t => t.id === id)).filter(Boolean);
  if (trs.length === 0) return;

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Remito Interno: ${baseTrId}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size:24px; text-transform:uppercase; }
          .meta { display:flex; justify-content:space-between; margin-bottom:30px; font-size:14px; }
          .big-data { font-size: 18px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
          th { background: #f0f0f0; }
          .signatures { display:flex; justify-content: space-between; margin-top: 80px; }
          .sign-box { border-top: 1px solid #000; width: 40%; text-align:center; padding-top:10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REMITO INTERNO DE TRASLADO MÚLTIPLE</h1>
          <h4>MERCADO DE CAFETERAS</h4>
        </div>
        <div class="meta">
          <div>
            <strong>Nro Remito:</strong> <span style="font-size:16px;">${baseTrId}</span><br>
            <strong>Fecha Emisión:</strong> ${fecha}<br>
            <strong>Estado:</strong> ENVIADO
          </div>
          <div style="font-size:28px;">📦</div>
        </div>

        <div class="big-data">
          <strong>Origen de salida:</strong> ${origen.toUpperCase()} <br><br>
          <strong>Destino de entrega:</strong> ${destino.toUpperCase()}
        </div>

        <table>
          <thead>
            <tr>
              <th>CANT.</th>
              <th>DESCRIPCIÓN DEL PRODUCTO / MERCADERÍA</th>
              <th>ID REMITO INDIVIDUAL</th>
            </tr>
          </thead>
          <tbody>
            ${trs.map(tr => `
              <tr>
                <td style="font-size:18px; text-align:center; font-weight:bold; width: 80px;">${tr.qty}</td>
                <td style="font-size:14px;">${tr.producto}</td>
                <td style="font-size:12px; color:#555;">${tr.id}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:30px; border:1px dashed #ccc; padding:15px; font-size:12px;">
          <strong>Control de Arribo:</strong> Al recibir la mercadería en ${destino.toUpperCase()}, el vendedor de turno debe controlar visualmente y luego ingresar al Sistema > Logística y presionar "Confirmar Recepción" POR CADA ÍTEM para imputar el stock. En caso de discrepancias, presionar "Reportar Desvío".
        </div>

        <div class="signatures">
          <div class="sign-box">Firma Responsable ORIGEN<br>(Entrega)</div>
          <div class="sign-box">Firma Transportista / Flete <br>(Verifica Cantidad Cargada)</div>
        </div>
        <div style="text-align:center; font-size:10px; margin-top:50px; color:#666;">Documento válido para uso interno. No válido como factura.</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

window.receiveTransfer = async function (trId) {
  if (!confirm('¿Confirmás que recibiste EXACTAMENTE la cantidad que dice el remito?')) return;

  const tr = DATA.transfers.find(t => t.id === trId);
  if (!tr) return;

  // Recepción de máquina en reparación (desde Belgrano a taller Lanús)
  if (!tr.stock_id || String(tr.stock_id) === '0' || String(tr.id).startsWith('REM-REP-')) {
    const isRep = String(tr.id).startsWith('REM-REP-');
    if (isRep) {
      const repId = tr.id.replace('REM-REP-', '');
      const rep = DATA.repairs.find(r => r.id === repId);
      if (rep) {
        rep.sucursal = tr.destino;
        try {
          if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') await db.repairs.update(repId, { sucursal: tr.destino });
        } catch (e) { }
      }
    }

    tr.estado = 'recibido';
    try {
      if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') await db.transfers.update(trId, { estado: 'recibido' });
    } catch (e) { }

    renderTransfers();
    // Re-render repairs view if open
    if (typeof renderRepairs === 'function' && document.getElementById('view-repairs') && document.getElementById('view-repairs').innerHTML !== '') {
      renderKanban();
    }

    if (window.logUserAction) {
      window.logUserAction('Recepcion Traslado Reparacion', `ID: ${tr.id} | Sucursal: ${tr.destino}`);
    }

    showToast(`✅ Recepción OK. Reparación ingresada al taller.`, 'success');
    return;
  }

  // Recepción normal de stock de producto
  const prod = DATA.stock.find(s => s.id === parseInt(tr.stock_id));
  if (prod) {
    prod[tr.destino] += tr.qty;
    tr.estado = 'recibido';

    try {
      if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
        await Promise.all([
          db.transfers.update(trId, { estado: 'recibido' }),
          db.stock.updateBranch(prod.id, tr.destino, prod[tr.destino])
        ]);
      }
    } catch (err) { }

    if (window.logUserAction) {
      window.logUserAction('Recepcion Traslado Producto', `ID: ${tr.id} | Prod: ${prod.nombre} | Qty: ${tr.qty} | Sucursal: ${tr.destino}`);
    }

    renderTransfers();
    showToast(`✅ Recepción perfecta. Stock sumado a ${tr.destino.toUpperCase()}`, 'success');
  }
}

window.reportTransferError = async function (trId) {
  const reason = prompt('Por favor, detallá cuál fue el error (Ejs: "Faltaron 2 unidades", "Caja Rota", "Producto Equivocado"):');
  if (!reason) return; // cancelled

  const tr = DATA.transfers.find(t => t.id === trId);
  if (tr) {
    tr.estado = 'con_error';
    // El stock NO ingresó. La admin deberá ajustar el DB manualmente luego.

    try {
      if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
        await db.transfers.update(trId, { estado: 'con_error' });
      }
    } catch (err) { }

    if (window.logUserAction) {
      window.logUserAction('Error en Traslado', `ID: ${tr.id} | Motivo: ${reason}`);
    }

    renderTransfers();
    showToast('🚨 Desvío reportado a la administración.', 'warning');
  }
}

window.printRemito = function (trId) {
  const tr = DATA.transfers.find(t => t.id === trId);
  if (!tr) return;

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Remito Interno: ${tr.id}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size:24px; text-transform:uppercase; }
          .meta { display:flex; justify-content:space-between; margin-bottom:30px; font-size:14px; }
          .big-data { font-size: 18px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
          th { background: #f0f0f0; }
          .signatures { display:flex; justify-content: space-between; margin-top: 80px; }
          .sign-box { border-top: 1px solid #000; width: 40%; text-align:center; padding-top:10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REMITO INTERNO DE TRASLADO</h1>
          <h4>MERCADO DE CAFETERAS</h4>
        </div>
        <div class="meta">
          <div>
            <strong>Nro Remito:</strong> ${tr.id}<br>
            <strong>Fecha Emisión:</strong> ${tr.fecha}<br>
            <strong>Estado:</strong> ${tr.estado.toUpperCase()}
          </div>
          <div>
             <span style="font-size:28px;">📦</span>
          </div>
        </div>

        <div class="big-data">
          <strong>Origen de salida:</strong> ${tr.origen.toUpperCase()} <br><br>
          <strong>Destino de entrega:</strong> ${tr.destino.toUpperCase()}
        </div>

        <table>
          <thead>
            <tr>
              <th>CANTIDAD ENTREGADA AL FLETE</th>
              <th>DESCRIPCIÓN DEL PRODUCTO / MERCADERÍA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-size:20px; text-align:center; font-weight:bold;">${tr.qty}</td>
              <td style="font-size:16px;">${tr.producto}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:30px; border:1px dashed #ccc; padding:15px; font-size:12px;">
          <strong>Control de Arribo:</strong> Al recibir la mercadería en ${tr.destino.toUpperCase()}, el vendedor de turno debe controlar visualmente y luego ingresar al Sistema de Mercado de Cafeteras > Logística y presionar "Confirmar Recepción" para imputar el stock al local. En caso de discrepancias, presionar "Reportar Desvío".
        </div>

        <div class="signatures">
          <div class="sign-box">Firma Responsable ORIGEN<br>(Entrega)</div>
          <div class="sign-box">Firma Transportista / Flete <br>(Verifica Cantidad Cargada)</div>
        </div>
        <div style="text-align:center; font-size:10px; margin-top:50px; color:#666;">Documento válido para uso interno de control de stock. No válido como factura.</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
