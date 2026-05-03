// ==========================================
// VENTAS — Mercado de Cafeteras
// ==========================================

let saleCart = [];
let salePayments = [];

function getCartTotal() {
  const itemsTotal = saleCart.reduce((sum, item) => sum + item.total, 0);
  const surchargesTotal = salePayments.reduce((sum, p) => p.amount - p.baseAmount + sum, 0);
  return itemsTotal + surchargesTotal;
}
function getPaymentsTotal() {
  return salePayments.reduce((sum, p) => sum + p.amount, 0);
}

async function renderSales() {
  const v = document.getElementById('view-sales');
  if (!v.innerHTML) v.innerHTML = '<div class="loading">Cargando ventas...</div>';

  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const remoteSales = await db.sales.getAll();
      if (remoteSales) DATA.sales = remoteSales;
    }
  } catch (err) {
    console.warn('Usando mock data para ventas:', err);
  }

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isWarehouse = currentUser && currentUser.role === 'warehouse';
  const loc = (currentUser && currentUser.location) ? currentUser.location : 'lanus';

  const displayedSales = DATA.sales.filter(s => isAdmin || isWarehouse || s.sucursal === loc);

  const totalLanus    = DATA.sales.filter(s => s.sucursal === 'lanus').reduce((a, s) => a + (s.total || 0), 0);
  const totalBelgrano = DATA.sales.filter(s => s.sucursal === 'belgrano').reduce((a, s) => a + (s.total || 0), 0);
  const totalGeneral  = isAdmin || isWarehouse ? (totalLanus + totalBelgrano) : (loc === 'lanus' ? totalLanus : totalBelgrano);

  v.innerHTML = `
    <!-- KPIs -->
    <div class="grid-3" style="margin-bottom:22px;">
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-icon">💰</span><span class="kpi-badge up">Últimas ventas</span></div>
        <div class="kpi-value">${formatCurrency(totalGeneral)}</div>
        <div class="kpi-label">${isAdmin || isWarehouse ? 'Total — Ambas sucursales' : (loc === 'lanus' ? 'Total Lanús' : 'Total Belgrano')}</div>
      </div>
      <div class="kpi-card" style="${isAdmin || isWarehouse || loc === 'lanus' ? '' : 'display:none;'}">
        <div class="kpi-header"><span class="kpi-icon">☕</span></div>
        <div class="kpi-value" style="color:var(--gold-bright);">${formatCurrency(totalLanus)}</div>
        <div class="kpi-label">Lanús</div>
      </div>
      <div class="kpi-card" style="${isAdmin || isWarehouse || loc === 'belgrano' ? '' : 'display:none;'}">
        <div class="kpi-header"><span class="kpi-icon">🏢</span></div>
        <div class="kpi-value" style="color:var(--blue);">${formatCurrency(totalBelgrano)}</div>
        <div class="kpi-label">Belgrano</div>
      </div>
    </div>

    <!-- Sales table -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--border-subtle);">
        <span class="section-title">Últimas Ventas</span>
        <div style="${isAdmin ? 'display:none;' : ''}">
          <button class="btn btn-primary" style="background:var(--red); border-color:var(--red); margin-right:10px;" onclick="openExpenseModal()">💸 Registrar Egreso</button>
          <button class="btn btn-primary" onclick="openSaleModal()">+ Registrar Venta Múltiple</button>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th><th>Detalle / Productos</th><th>Pagos</th><th>Total</th><th>Sucursal</th>
            </tr>
          </thead>
          <tbody id="sales-tbody">
            ${displayedSales.map(s => {
              let fDate = s.fecha || s.fecha_str;
              if (fDate && fDate.includes('T')) {
                const d = new Date(fDate);
                fDate = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} hs`;
              }
              return `
              <tr>
                <td style="color:var(--text-muted); font-size:12px;">${fDate}</td>
                <td style="font-weight:500; font-size:12px; max-width:250px;">${s.producto}</td>
                <td style="font-size:11px; color:var(--text-secondary); max-width:200px;">${s.medio_pago}</td>
                <td style="font-weight:700;color:var(--gold-bright);">${formatCurrency(s.total)}</td>
                <td><span class="repair-card-branch ${s.sucursal === 'lanus' ? 'branch-lanus' : 'branch-belgrano'}">${s.sucursal === 'lanus' ? 'Lanús' : 'Belgrano'}</span></td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Egresos del día -->
    <div class="card" style="padding:0;overflow:hidden;margin-top:20px;">
      <div style="padding:18px 24px;border-bottom:1px solid var(--border-subtle);">
        <span class="section-title" style="color:var(--red);">Salidas de Efectivo de Hoy</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr><th>Hora</th><th>Categoría</th><th>Motivo / Responsable</th><th>Monto</th><th>Sucursal</th></tr>
          </thead>
          <tbody id="expenses-tbody">
            <!-- Renderizado dinámicamente -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal nueva venta combinada -->
    <div class="modal-overlay" id="sale-modal">
      <div class="modal-box" style="width: 600px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-title">💰 Registrar Venta Completa</div>
        
        <!-- Add Product Section -->
        <div style="background:rgba(255,255,255,0.02); padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid var(--border-subtle);">
          <div class="form-group">
            <label class="form-label">Buscar y Agregar Producto al Carrito</label>
            <div style="display:flex; gap:10px;">
              <select class="form-input" id="sale-prod-select" onchange="updateSalePrice()" style="flex:1;">
                <option value="">-- Seleccionar producto --</option>
                ${DATA.stock.map(s => `<option value="${s.id}">${s.nombre} (PVP: ${formatCurrency(s.precio)})</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div id="sale-prod-preview" style="display:none;align-items:center;gap:12px;background:rgba(200,140,60,0.05);padding:10px;border-radius:8px;margin-bottom:15px;border:1px solid var(--border-subtle);">
             <img id="sale-preview-img" src="" class="product-thumb" style="width:50px;height:50px;" />
             <div style="flex:1;">
               <div id="sale-preview-name" style="font-weight:600;font-size:13px;color:var(--text-primary);"></div>
               <div id="sale-preview-price" style="font-size:12px;color:var(--gold-bright);font-weight:700;"></div>
             </div>
             <div style="display:flex; align-items:center; gap:10px;">
               <input class="form-input" id="sale-qty" type="number" min="1" value="1" oninput="updateSalePrice()" style="width:60px; padding:5px; text-align:center;" />
               <button class="btn btn-primary" style="padding:6px 12px; font-size:12px;" onclick="addToCart()">Añadir al carrito</button>
             </div>
          </div>
        </div>

        <!-- Cart Section -->
        <div style="margin-bottom:20px;">
          <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:10px; text-transform:uppercase;">🛒 Carrito de Compras</h4>
          <div id="sale-cart-list" style="display:flex; flex-direction:column; gap:8px;"></div>
          <div style="text-align:right; margin-top:10px; font-size:18px; font-weight:700; color:var(--gold-mid);" id="sale-cart-total-container">
            Total Venta: <span id="sale-cart-total">$0</span>
          </div>
        </div>

        <!-- Payments Section -->
        <div style="background:rgba(255,255,255,0.02); padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid var(--border-subtle);">
          <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:10px; text-transform:uppercase;">💳 Cobro y Medios de Pago Mixtos</h4>
          <div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end;">
            <div style="flex:1;">
              <label class="form-label" style="font-size:10px;">Método</label>
              <select class="form-input" id="sale-payment-method">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Transferencia Bancaria">🏦 Transferencia Bancaria</option>
                <option value="Tarjeta de Débito">💳 Tarjeta de Débito</option>
                <option value="Tarjeta de Crédito">💳 Tarjeta de Crédito</option>
                <option value="Pago con QR">📲 Pago con QR</option>
                <option value="Mercado Pago">📱 Mercado Pago</option>
              </select>
            </div>
            <div style="flex:1;">
              <label class="form-label" style="font-size:10px;">Monto a cobrar</label>
              <input class="form-input" type="number" id="sale-payment-amount" placeholder="0" />
            </div>
            <button class="btn btn-ghost" onclick="addPayment()">+ Añadir Pago</button>
          </div>
          
          <div id="sale-payments-list" style="display:flex; flex-direction:column; gap:5px; font-size:12px; margin-bottom:10px;"></div>
          
          <div style="font-size:13px; font-weight:700; text-align:right; padding-top:10px; border-top:1px solid var(--border-subtle);">
             <span id="sale-payment-missing-label">Falta cobrar:</span> <span id="sale-payment-missing" style="color:var(--red); font-size:16px;">$0</span>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" onclick="closeSaleModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveSale()">✅ Confirmar Venta Final</button>
        </div>
      </div>
    </div>
  `;
}

function openSaleModal() {
  saleCart = [];
  salePayments = [];
  document.getElementById('sale-modal').classList.add('active');
  renderCart();
  renderPayments();
  updatePaymentBalance();
}

function closeSaleModal() {
  document.getElementById('sale-modal').classList.remove('active');
}

function updateSalePrice() {
  const pId = document.getElementById('sale-prod-select').value;
  const prod = DATA.stock.find(s => s.id == pId);
  const preview = document.getElementById('sale-prod-preview');
  
  if (prod) {
    preview.style.display = 'flex';
    document.getElementById('sale-preview-img').src = prod.imagen || 'https://placehold.co/60x60?text=📦';
    document.getElementById('sale-preview-name').textContent = prod.nombre;
    document.getElementById('sale-preview-price').textContent = `Stock actual (${currentUser.location}): ${prod[currentUser.location]} | PVP: ${formatCurrency(prod.precio)}`;
  } else {
    preview.style.display = 'none';
  }
}

function addToCart() {
  const pId = document.getElementById('sale-prod-select').value;
  const qty = parseInt(document.getElementById('sale-qty').value) || 1;
  const prod = DATA.stock.find(s => s.id == pId);
  
  if (!prod) {
    showToast('Seleccioná un producto primero', 'warning');
    return;
  }
  if (qty <= 0) return;
  
  // Stock validations won't block adding to cart currently, just warns.
  if (prod[currentUser.location] < qty) {
    showToast(`⚠️ Alerta: Stock insuficiente en ${currentUser.location}. (Disp: ${prod[currentUser.location]})`, 'warning');
  }

  // Check if already in cart
  const existing = saleCart.find(i => i.id === prod.id);
  if (existing) {
    existing.qty += qty;
    existing.total = existing.qty * existing.precio;
  } else {
    saleCart.push({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      qty: qty,
      total: prod.precio * qty,
      stockDisponible: prod[currentUser.location]
    });
  }

  document.getElementById('sale-prod-select').value = '';
  document.getElementById('sale-qty').value = 1;
  document.getElementById('sale-prod-preview').style.display = 'none';

  renderCart();
  updatePaymentBalance();
}

function removeFromCart(index) {
  saleCart.splice(index, 1);
  renderCart();
  updatePaymentBalance();
}

function renderCart() {
  const list = document.getElementById('sale-cart-list');
  const totalEl = document.getElementById('sale-cart-total');
  
  if (saleCart.length === 0) {
    list.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No hay productos agregados</div>';
  } else {
    list.innerHTML = saleCart.map((item, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(200,140,60,0.05); padding:10px; border-radius:4px; border:1px solid rgba(200,140,60,0.1);">
        <div style="font-size:13px; flex:1;">
          <span style="font-weight:700; color:var(--gold-mid); min-width:30px; display:inline-block;">${item.qty}x</span> 
          <span style="font-weight:500;">${item.nombre}</span>
        </div>
        <div style="display:flex; align-items:center; gap:20px;">
          <span style="font-weight:700; font-size:14px; color:var(--gold-bright);">${formatCurrency(item.total)}</span>
          <button onclick="removeFromCart(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:14px;" title="Eliminar del carrito">✖</button>
        </div>
      </div>
    `).join('');
  }
  
  totalEl.textContent = formatCurrency(getCartTotal());
}

function addPayment() {
  const method = document.getElementById('sale-payment-method').value;
  let baseAmount = parseInt(document.getElementById('sale-payment-amount').value) || 0;
  
  if (baseAmount <= 0) return;
  
  let finalAmount = baseAmount;
  let label = method;
  
  if (method === 'Tarjeta de Crédito') {
     const recargo = baseAmount * 0.10;
     finalAmount = Math.round(baseAmount + recargo);
     label = `Tarjeta de Crédito (+10% recargo)`;
  } else if (method === 'Efectivo') {
     const descuento = baseAmount * 0.10;
     finalAmount = Math.round(baseAmount - descuento);
     label = `Efectivo (-10% descuento)`;
  }
  
  salePayments.push({ method: label, amount: finalAmount, baseAmount: baseAmount });
  document.getElementById('sale-payment-amount').value = '';
  renderPayments();
  updatePaymentBalance();
}

function removePayment(index) {
  salePayments.splice(index, 1);
  renderPayments();
  updatePaymentBalance();
}

function renderPayments() {
  const list = document.getElementById('sale-payments-list');
  if (salePayments.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:10px;">Ningún pago registrado todavía</div>';
  } else {
    list.innerHTML = salePayments.map((p, idx) => `
      <div style="display:flex; justify-content:space-between; background:rgba(76,175,130,0.05); padding:8px 12px; border-radius:4px; border:1px solid rgba(76,175,130,0.2);">
        <span style="font-weight:500;">${p.method}</span>
        <div style="display:flex; gap:15px; align-items:center;">
          <span style="font-weight:700; color:var(--green);">${formatCurrency(p.amount)}</span>
          <button onclick="removePayment(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer;">✖</button>
        </div>
      </div>
    `).join('');
  }
}

function updatePaymentBalance() {
  const cartTot = getCartTotal();
  const payTot = getPaymentsTotal();
  const missing = cartTot - payTot;
  
  const labelEl = document.getElementById('sale-payment-missing-label');
  const missingEl = document.getElementById('sale-payment-missing');
  const amountInput = document.getElementById('sale-payment-amount');

  if (saleCart.length === 0) {
    labelEl.textContent = 'Monto a Pagar:';
    missingEl.textContent = '$0';
    missingEl.style.color = 'var(--text-muted)';
    amountInput.value = '';
    return;
  }

  if (missing > 0) {
    labelEl.textContent = 'Resta cobrar:';
    missingEl.textContent = formatCurrency(missing);
    missingEl.style.color = 'var(--red)';
    amountInput.value = missing; // Auto-fill sugerido
  } else if (missing < 0) {
    labelEl.textContent = 'Dar vuelto:';
    missingEl.textContent = formatCurrency(Math.abs(missing));
    missingEl.style.color = 'var(--yellow)';
    amountInput.value = '';
  } else {
    labelEl.textContent = 'Estado:';
    missingEl.textContent = 'Cobro Completado ✅';
    missingEl.style.color = 'var(--green)';
    amountInput.value = '';
  }
}

async function saveSale() {
  const suc = currentUser.location;
  const cartTotal = getCartTotal();
  const paymentsTotal = getPaymentsTotal();
  
  if (saleCart.length === 0) {
    showToast('⚠️ Agrega al menos un producto al carrito', 'error');
    return;
  }
  
  if (paymentsTotal < cartTotal) {
    showToast('⚠️ Faltan cobrar montos (El pago es menor al total)', 'error');
    return;
  }

  // Verificar stock real antes de guardar
  for (let item of saleCart) {
    const prodReal = DATA.stock.find(s => s.id === item.id);
    if (!prodReal || prodReal[suc] < item.qty) {
      showToast(`⚠️ Stock insuficiente: No podés descontar ${item.qty} de "${item.nombre}" porque solo hay ${prodReal[suc]} en ${suc}`, 'error');
      return;
    }
  }

  // 1. Modificar inventario local
  for (let item of saleCart) {
    const prodReal = DATA.stock.find(s => s.id === item.id);
    prodReal[suc] -= item.qty;
  }

  const today = new Date();
  const fechaStr = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}`;

  // Construir el string descriptivo que guarda la tabla
  const productosDetalle = saleCart.map(i => `${i.qty}x ${i.nombre}`).join(' | ');
  const pagosDetalle = salePayments.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join(' | ');

  const newSale = { 
    producto: productosDetalle, 
    qty: saleCart.reduce((a, b) => a + b.qty, 0), // Cantidad total de bultos
    total: cartTotal, 
    sucursal: suc, 
    fecha_str: fechaStr,
    medio_pago: pagosDetalle
  };

  // 2. Persistir en Supabase de forma segura
  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const insertion = db.sales.insert(newSale);
      const stockUpdates = saleCart.map(item => {
        const prodReal = DATA.stock.find(s => s.id === item.id);
        return db.stock.updateBranch(prodReal.id, suc, prodReal[suc]);
      });
      await Promise.all([insertion, ...stockUpdates]);
    }
  } catch (err) {
    console.error('Error al registrar venta mixta:', err);
    showToast('⚠️ Problema de conexión, pero se guardó localmente.', 'warning');
  }

  DATA.sales.unshift({ fecha: fechaStr, ...newSale });
  closeSaleModal();
  renderSales();
  showToast(`✅ Venta exitosa. Total cobrado: ${formatCurrency(paymentsTotal)}`, 'success');
}

// ─── Renderizar Gastos de Hoy ─────────────────────────
async function renderExpenses() {
  const tbody = document.getElementById('expenses-tbody');
  if (!tbody) return;

  let withdrawals = [];
  try {
    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      const res = await db.withdrawals.getAll(); 
      if (res) DATA.withdrawals = res;
    }
  } catch (err) {
    console.warn('Usando mock data para egresos:', err);
  }
  
  withdrawals = DATA.withdrawals || [];
  
  const todayObj = new Date();
  const todayIso = todayObj.toISOString().split('T')[0];
  const todayStr = `${todayObj.getDate().toString().padStart(2,'0')}/${(todayObj.getMonth()+1).toString().padStart(2,'0')}`;

  const todaysWithdrawals = withdrawals.filter(w => {
    const f = w.fecha || w.created_at;
    if (!f) return true; // Si no tiene fecha, asumimos que es nuevo (local)
    
    if (f.includes('T')) {
      const d = new Date(f);
      return d.toISOString().split('T')[0] === todayIso || f.startsWith(todayIso);
    }
    return f === todayStr;
  });

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isWarehouse = currentUser && currentUser.role === 'warehouse';
  const loc = (currentUser && currentUser.location) ? currentUser.location : 'lanus';

  const displayedWithdrawals = todaysWithdrawals.filter(w => isAdmin || isWarehouse || w.sucursal === loc);

  if (displayedWithdrawals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No se registraron salidas de caja hoy.</td></tr>';
    return;
  }

  tbody.innerHTML = displayedWithdrawals.map(w => {
    let fTime = w.fecha || w.created_at;
    if (fTime && fTime.includes('T')) {
      const d = new Date(fTime);
      fTime = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} hs`;
    }
    return `
      <tr>
        <td style="color:var(--text-muted); font-size:12px;">${fTime || '--:--'}</td>
        <td><span style="background:rgba(217,67,78,0.1); color:var(--red); padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">${w.categoria || 'Otros'}</span></td>
        <td style="font-size:13px; font-weight:500;">${w.motivo}</td>
        <td style="color:var(--red); font-weight:700;">-${formatCurrency(w.monto)}</td>
        <td><span class="repair-card-branch ${w.sucursal === 'lanus' ? 'branch-lanus' : 'branch-belgrano'}">${w.sucursal === 'lanus' ? 'Lanús' : 'Belgrano'}</span></td>
      </tr>
    `;
  }).join('');
}

// ─── Modal de Egreso de Caja ─────────────────────────
function openExpenseModal() {
  const html = `
    <div class="modal-overlay active" id="expense-modal" style="z-index:3000;">
      <div class="modal-box">
        <div class="modal-title" style="color:var(--red);">💸 Registrar Egreso de Caja</div>
        <p style="color:var(--text-muted); font-size:13px; margin-bottom:15px;">Este dinero saldrá en tiempo real de tu caja física actual.</p>
        
        <div class="form-group">
          <label class="form-label">Monto a retirar ($)</label>
          <input type="number" id="expense-amount" class="form-input" placeholder="Ej: 5000" min="1" required>
        </div>

        <div class="form-group">
          <label class="form-label">Categoría del Gasto</label>
          <select id="expense-category" class="form-input">
            <option value="Adelanto">Adelanto de Sueldo</option>
            <option value="Gasto Local">Gasto de Local (Limpieza, insumos)</option>
            <option value="Retiro Dueño">Retiro Dueño</option>
            <option value="Otros">Otros (Especificar)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Descripción / Motivo</label>
          <input type="text" id="expense-reason" class="form-input" placeholder="Ej: Compra de lavandina..." required>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('expense-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" style="background:var(--red); border-color:var(--red);" onclick="submitExpense()">Registrar Salida</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('expense-amount').focus();
}

async function submitExpense() {
  const amount = parseInt(document.getElementById('expense-amount').value);
  const category = document.getElementById('expense-category').value;
  const reason = document.getElementById('expense-reason').value.trim();

  if (!amount || amount <= 0 || !reason) {
    showToast('Por favor, ingresá un monto y el motivo.', 'error');
    return;
  }

  const withdrawalData = {
    monto: amount,
    categoria: category,
    motivo: reason,
    sucursal: currentUser.location,
    usuario: currentUser.user || currentUser.name || 'Desconocido',
    fecha: new Date().toISOString()
  };

  try {
    const btn = document.querySelector('#expense-modal .btn-primary');
    btn.disabled = true;
    btn.innerText = 'Registrando...';

    if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
      await db.withdrawals.insert(withdrawalData);
    } else {
      DATA.withdrawals.push(withdrawalData);
    }
    
    // Cerrar el modal inmediatamente para quitar el fondo difuminado
    document.getElementById('expense-modal').remove();
    
    // Descargar el vale de caja automáticamente
    downloadExpenseReceipt(amount, category, reason);
    
    // Refrescar la tabla para que se vea el movimiento exitoso
    renderExpenses();
  } catch (err) {
    console.error('ERROR DATABASE:', err);
    alert('Fallo al guardar en la base de datos: ' + (err.message || err));
    const modalBtn = document.querySelector('#expense-modal .btn-primary');
    if (modalBtn) modalBtn.disabled = false;
    modalBtn.innerText = 'Reintentar';
  }
}

function downloadExpenseReceipt(amount, category, reason) {
  const dateStr = new Date().toLocaleString('es-AR');
  const sucursalLabel = currentUser.location === 'lanus' ? 'Lanús' : 'Belgrano';
  
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Vale de Caja - ${dateStr}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#000;padding:40px;max-width:600px;margin:0 auto; border:1px solid #ddd;}
  h1{font-size:24px;text-align:center;border-bottom:2px solid #000;padding-bottom:10px;}
  h2{font-size:18px;text-align:center;color:#555;}
  .info{margin-top:30px;font-size:16px;line-height:1.8;}
  .monto{font-size:32px;font-weight:bold;text-align:center;margin:30px 0;padding:20px;background:#f9f9f9;border:1px dashed #000;}
  .firmas{display:flex;justify-content:space-between;margin-top:80px;}
  .firma-linea{border-top:1px solid #000;width:45%;text-align:center;padding-top:10px;font-size:14px;}
</style>
</head>
<body>
  <h1>COMPROBANTE DE EGRESO DE CAJA</h1>
  <h2>Sucursal ${sucursalLabel}</h2>
  
  <div class="monto">VALE POR: ${formatCurrency(amount)}</div>
  
  <div class="info">
    <p><b>Fecha y Hora:</b> ${dateStr}</p>
    <p><b>Categoría:</b> ${category}</p>
    <p><b>Concepto / Motivo:</b> ${reason}</p>
    <p><b>Registrado por:</b> ${currentUser.user || currentUser.name}</p>
  </div>
  
  <div class="firmas">
    <div class="firma-linea">Firma Quien Recibe</div>
    <div class="firma-linea">Firma Responsable de Caja</div>
  </div>
  
  <div style="text-align:center; margin-top:50px; font-size:12px; color:#888;">
    Generado automáticamente por el Sistema Mercado de Cafeteras
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ValeCaja_${category.replace(/ /g,'')}_${amount}.html`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('📥 Vale descargado. Podés imprimirlo en PDF.', 'success');
}

// Sobreescribir renderSales para que también renderice los egresos
const originalRenderSales = renderSales;
renderSales = async function() {
  await originalRenderSales();
  await renderExpenses();
};
