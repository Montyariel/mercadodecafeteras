// ==========================================
// STOCK — Mercado de Cafeteras
// ==========================================

window.stockSearch = '';
window.stockBranchView = null;

window.renderStock = async function() {
  const v = document.getElementById('view-stock');
  if (!v) return;

  // Inicializar vista de stock según ubicación del usuario si es la primera vez
  if (window.stockBranchView === null) {
    window.stockBranchView = (window.currentUser && window.currentUser.location) ? window.currentUser.location : 'both';
  }

  // Mostrar loading inicial
  if (!v.innerHTML) v.innerHTML = '<div class="loading">Cargando inventario...</div>';

  try {
    if (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'TU_ANON_KEY_AQUI' && typeof db !== 'undefined') {
      try {
        const remoteStock = await db.stock.getAll();
        if (remoteStock && remoteStock.length > 0) {
          DATA.stock = DATA.stock.map(localItem => {
            const remoteItem = remoteStock.find(r => r.nombre === localItem.nombre);
            if (remoteItem) {
              return { ...localItem, ...remoteItem, imagen: localItem.imagen || remoteItem.imagen };
            }
            return localItem;
          });
        }
      } catch (dbErr) {
        console.warn('Stock: Error conectando a Supabase, usando locales.', dbErr);
      }
    }
  } catch (err) {
    console.warn('Error general en carga de stock:', err);
  }

  const role = (window.currentUser && window.currentUser.role) ? window.currentUser.role : 'vendor';
  const isAdminOrWarehouse = (role === 'admin' || role === 'warehouse');

  v.innerHTML = `
    <!-- Toolbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Buscar producto..." id="stock-search-input" oninput="searchStock(this.value)" value="${window.stockSearch}" />
        </div>
        ${isAdminOrWarehouse ? `
          <div style="display:flex;gap:6px;">
            <button class="btn ${window.stockBranchView==='both'     ? 'btn-primary':'btn-ghost'}" onclick="setStockBranch('both')">Todas</button>
            <button class="btn ${window.stockBranchView==='lanus'    ? 'btn-primary':'btn-ghost'}" onclick="setStockBranch('lanus')">☕ Lanús</button>
            <button class="btn ${window.stockBranchView==='belgrano' ? 'btn-primary':'btn-ghost'}" onclick="setStockBranch('belgrano')">🏢 Belgrano</button>
            <button class="btn ${window.stockBranchView==='deposito' ? 'btn-primary':'btn-ghost'}" onclick="setStockBranch('deposito')">📦 Depósito</button>
          </div>
        ` : ''}
      </div>
      <div style="display:flex; gap:10px;">
        ${isAdminOrWarehouse ? '<button class="btn btn-primary" style="background:var(--blue);border-color:var(--blue);" onclick="openNewProductModal()">+ Nuevo Producto</button>' : ''}
        ${isAdminOrWarehouse ? '<button class="btn btn-primary" onclick="openStockModal()">+ Ajustar Stock</button>' : ''}
      </div>
    </div>

    <!-- Summary mini KPIs -->
    <div class="grid-3" style="margin-bottom:22px;">
      ${stockSummaryCard()}
    </div>

    <!-- Table -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:18px 24px;border-bottom:1px solid var(--border-subtle);">
        <span class="section-title">Inventario Completo</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" id="stock-table">
          <thead>
            <tr>
              <th style="width:50px;"></th>
              <th>Producto</th>
              <th>Categoría</th>
              <th style="text-align:center;">Lanús</th>
              <th style="text-align:center;">Belgrano</th>
              <th style="text-align:center;">Depósito</th>
               <th style="text-align:center;">Total</th>
               <th style="text-align:center;">Mín.</th>
               <th>Estado</th>
               <th style="text-align:center;">📍 Ubicación</th>
               ${isAdminOrWarehouse ? '<th>Costo</th><th>Mg.</th>' : ''}
               <th>Precio Venta</th>
               <th></th>
             </tr>
           </thead>
          <tbody id="stock-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- Modal ajuste de stock -->
    <div class="modal-overlay" id="stock-modal">
      <div class="modal-box">
        <div class="modal-title">📦 Ajustar Stock</div>
        <div class="form-group">
          <label class="form-label">Producto</label>
          <select class="form-input" id="stock-prod-select">
            ${DATA.stock.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Sucursal</label>
            <select class="form-input" id="stock-suc-select">
              <option value="lanus">Lanús</option>
              <option value="belgrano">Belgrano</option>
              <option value="deposito">Depósito</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Operación</label>
            <select class="form-input" id="stock-op-select">
              <option value="add">➕ Agregar</option>
              <option value="sub">➖ Descontar</option>
              <option value="set">📝 Establecer</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Cantidad</label>
          <input class="form-input" id="stock-qty-input" type="number" min="1" value="1" />
        </div>
        <div class="form-group">
          <label class="form-label">📍 Ubicación en Estantería</label>
          <input class="form-input" id="stock-loc-input" type="text" placeholder="Ej: A-01" />
        </div>
        
        <div id="stock-pricing-module" style="display: ${isAdminOrWarehouse ? 'block' : 'none'}; padding:15px; margin-top:15px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); border-radius:8px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px; font-weight:700;">GESTIÓN DE PRECIOS</div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Costo ($)</label>
              <input class="form-input" id="stock-cost-input" type="number" oninput="calculateSuggestedPrice()" />
            </div>
            <div class="form-group">
              <label class="form-label">Margen (%)</label>
              <input class="form-input" id="stock-margin-input" type="number" oninput="calculateSuggestedPrice()" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Precio Final ($)</label>
            <input class="form-input" id="stock-price-input" type="number" style="color:var(--gold-bright); font-weight:700;" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="closeStockModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="applyStockAdjust()">✅ Aplicar</button>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo Producto -->
    <div class="modal-overlay" id="new-product-modal">
      <div class="modal-box" style="width: 500px;">
        <div class="modal-title">📦 Agregar Nuevo Producto</div>
        <div class="form-group">
          <label class="form-label">Nombre del Producto</label>
          <input class="form-input" id="new-prod-name" type="text" placeholder="Ej: Cafetera Italiana" />
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-input" id="new-prod-cat">
            <option value="Máquinas">Máquinas</option>
            <option value="Insumos">Insumos</option>
            <option value="Repuestos">Repuestos</option>
            <option value="Accesorios">Accesorios</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Stock Inicial (Depósito)</label>
            <input class="form-input" id="new-prod-deposito" type="number" min="0" value="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Stock Mínimo (Alerta)</label>
            <input class="form-input" id="new-prod-min" type="number" min="1" value="5" />
          </div>
        </div>
        
        <div style="padding:15px; margin-top:15px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); border-radius:8px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px; font-weight:700;">PRECIOS</div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Costo ($)</label>
              <input class="form-input" id="new-prod-cost" type="number" oninput="calculateNewSuggestedPrice()" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Margen (%)</label>
              <input class="form-input" id="new-prod-margin" type="number" oninput="calculateNewSuggestedPrice()" value="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Precio Final Venta ($)</label>
            <input class="form-input" id="new-prod-price" type="number" value="0" style="color:var(--gold-bright); font-weight:700;" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="closeNewProductModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="createNewProduct()">✅ Guardar Producto</button>
        </div>
      </div>
    </div>
  `;

  renderStockTable(role, isAdminOrWarehouse);
};

function stockSummaryCard() {
  const total = DATA.stock.length;
  const critical = DATA.stock.filter(s => (s.lanus + s.belgrano) <= s.min * 0.5).length;
  const low      = DATA.stock.filter(s => {
    const t = s.lanus + s.belgrano;
    return t > s.min * 0.5 && t <= s.min;
  }).length;

  return `
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-icon">📦</span></div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-label">Productos</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-icon">⚠️</span></div>
      <div class="kpi-value" style="color:var(--yellow);">${low}</div>
      <div class="kpi-label">Stock bajo</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-icon">🚨</span></div>
      <div class="kpi-value" style="color:var(--red);">${critical}</div>
      <div class="kpi-label">Stock crítico</div>
    </div>
  `;
}

function renderStockTable(role, isAdminOrWarehouse) {
  const tbody = document.getElementById('stock-tbody');
  if (!tbody) return;

  let filtered = DATA.stock.filter(s =>
    s.nombre.toLowerCase().includes(window.stockSearch.toLowerCase()) ||
    s.categoria.toLowerCase().includes(window.stockSearch.toLowerCase())
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:32px;">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const total = (s.lanus || 0) + (s.belgrano || 0) + (s.deposito || 0);
    const status = getStockStatus(total, s.min);
    
    const showBoth = window.stockBranchView === 'both';
    
    const lanusCell = (showBoth || window.stockBranchView === 'lanus')
      ? `<td style="text-align:center;"><span class="stock-pill ${getStockStatus(s.lanus, s.min).cls}">${s.lanus}</span></td>`
      : `<td style="text-align:center;color:var(--text-muted);">—</td>`;

    const belgranoCell = (showBoth || window.stockBranchView === 'belgrano')
      ? `<td style="text-align:center;"><span class="stock-pill ${getStockStatus(s.belgrano, s.min).cls}">${s.belgrano}</span></td>`
      : `<td style="text-align:center;color:var(--text-muted);">—</td>`;

    const depositoCell = (showBoth || window.stockBranchView === 'deposito')
      ? `<td style="text-align:center;"><span class="stock-pill ${getStockStatus(s.deposito, s.min*2).cls}">${s.deposito}</span></td>`
      : `<td style="text-align:center;color:var(--text-muted);">—</td>`;

    let actionBtn = '';
    if (role === 'warehouse') {
      actionBtn = `<button class="btn btn-primary" style="font-size:10px;padding:4px 8px;" onclick="openTransferModal(${s.id})">📦 Traslado</button>`;
    } else if (role === 'vendor') {
      actionBtn = `<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;" onclick="openRequestModal(${s.id})">🔔 Pedir</button>`;
    } else {
      actionBtn = `<button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;" onclick="quickAdjust(${s.id})">Ajustar</button>`;
    }

    return `
      <tr>
        <td>
          <img src="${s.imagen || 'https://placehold.co/40x40?text=📦'}" class="product-thumb" onerror="this.src='https://placehold.co/40x40?text=📦'" />
        </td>
        <td style="font-weight:500;">${s.nombre}</td>
        <td><span class="section-tag" style="font-size:10px;">${s.categoria}</span></td>
        ${lanusCell}
        ${belgranoCell}
        ${depositoCell}
        <td style="text-align:center;font-weight:700;">${total}</td>
        <td style="text-align:center;color:var(--text-muted);">${s.min}</td>
        <td><span class="stock-pill ${status.cls}">${status.label}</span></td>
        <td style="text-align:center;"><span class="section-tag">${s.ubicacion || '—'}</span></td>
        ${isAdminOrWarehouse ? `
          <td style="color:var(--text-muted);font-size:12px;">${formatCurrency(s.costo_unitario || 0)}</td>
          <td style="color:var(--green);font-size:12px;font-weight:700;">${s.margen_ganancia || 0}%</td>
        ` : ''}
        <td style="color:var(--text-secondary); font-weight:700;">${formatCurrency(s.precio)}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

window.searchStock = function(val) {
  window.stockSearch = val;
  renderStockTable((window.currentUser && window.currentUser.role) || 'vendor', (window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'warehouse')));
};

window.setStockBranch = function(branch) {
  window.stockBranchView = branch;
  window.renderStock();
};

window.openStockModal = function() {
  const m = document.getElementById('stock-modal');
  if (m) m.classList.add('active');
};
window.closeStockModal = function() {
  const m = document.getElementById('stock-modal');
  if (m) m.classList.remove('active');
};

window.calculateSuggestedPrice = function() {
  const cost = parseFloat(document.getElementById('stock-cost-input').value) || 0;
  const margin = parseFloat(document.getElementById('stock-margin-input').value) || 0;
  const suggestedPrice = cost * (1 + (margin / 100));
  document.getElementById('stock-price-input').value = Math.round(suggestedPrice);
};

window.quickAdjust = function(id) {
  const prod = DATA.stock.find(s => s.id === id);
  if (!prod) return;
  document.getElementById('stock-prod-select').value = id;
  document.getElementById('stock-loc-input').value = prod.ubicacion || '';
  document.getElementById('stock-cost-input').value = prod.costo_unitario || 0;
  document.getElementById('stock-margin-input').value = prod.margen_ganancia || 0;
  document.getElementById('stock-price-input').value = prod.precio || 0;
  window.openStockModal();
};

window.applyStockAdjust = async function() {
  const id  = parseInt(document.getElementById('stock-prod-select').value);
  const suc = document.getElementById('stock-suc-select').value;
  const op  = document.getElementById('stock-op-select').value;
  const qty = parseInt(document.getElementById('stock-qty-input').value) || 0;

  const loc = document.getElementById('stock-loc-input').value.trim().toUpperCase();
  const cost = parseFloat(document.getElementById('stock-cost-input').value) || 0;
  const margin = parseFloat(document.getElementById('stock-margin-input').value) || 0;
  const price = parseFloat(document.getElementById('stock-price-input').value) || 0;

  const prod = DATA.stock.find(s => s.id === id);
  if (!prod) return;

  prod.ubicacion = loc;
  if (window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'warehouse')) {
    prod.costo_unitario = cost;
    prod.margen_ganancia = margin;
    prod.precio = price;
  }
  
  if (op === 'add') prod[suc] = Math.max(0, (prod[suc] || 0) + qty);
  else if (op === 'sub') prod[suc] = Math.max(0, (prod[suc] || 0) - qty);
  else if (op === 'set') prod[suc] = Math.max(0, qty);

  try {
    if (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'TU_ANON_KEY_AQUI' && typeof db !== 'undefined') {
      const updates = { ubicacion: loc };
      if (window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'warehouse')) {
        updates.costo_unitario = cost;
        updates.margen_ganancia = margin;
        updates.precio = price;
      }
      await Promise.all([
        db.stock.updateBranch(id, suc, prod[suc]),
        db.stock.update(id, updates)
      ]);
    }
  } catch (err) {
    console.error('Error Supabase Stock:', err);
  }

  if (window.logUserAction) {
    window.logUserAction('Ajuste de Stock', `Producto ID: ${id} | Sucursal: ${suc} | Operación: ${op} | Cantidad: ${qty}`);
  }

  window.closeStockModal();
  window.renderStock();
  showToast('✅ Stock actualizado', 'success');
};

window.openNewProductModal = function() {
  const m = document.getElementById('new-product-modal');
  if (m) m.classList.add('active');
};

window.closeNewProductModal = function() {
  const m = document.getElementById('new-product-modal');
  if (m) m.classList.remove('active');
};

window.calculateNewSuggestedPrice = function() {
  const cost = parseFloat(document.getElementById('new-prod-cost').value) || 0;
  const margin = parseFloat(document.getElementById('new-prod-margin').value) || 0;
  const suggestedPrice = cost * (1 + (margin / 100));
  document.getElementById('new-prod-price').value = Math.round(suggestedPrice);
};

window.createNewProduct = async function() {
  const name = document.getElementById('new-prod-name').value.trim();
  const cat = document.getElementById('new-prod-cat').value;
  const deposito = parseInt(document.getElementById('new-prod-deposito').value) || 0;
  const min = parseInt(document.getElementById('new-prod-min').value) || 0;
  const cost = parseFloat(document.getElementById('new-prod-cost').value) || 0;
  const margin = parseFloat(document.getElementById('new-prod-margin').value) || 0;
  const price = parseFloat(document.getElementById('new-prod-price').value) || 0;

  if (!name) {
    showToast('⚠️ Completa el nombre del producto', 'warning');
    return;
  }

  const newProduct = {
    nombre: name,
    categoria: cat,
    lanus: 0,
    belgrano: 0,
    deposito: deposito,
    min: min,
    costo_unitario: cost,
    margen_ganancia: margin,
    precio: price,
    imagen: 'https://placehold.co/40x40?text=📦',
    ubicacion: ''
  };

  try {
    const btn = document.querySelector('#new-product-modal .btn-primary');
    if (btn) btn.disabled = true;

    if (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'TU_ANON_KEY_AQUI' && typeof db !== 'undefined') {
      const response = await db.stock.insert(newProduct);
      if (response && response.length > 0) {
        newProduct.id = response[0].id;
      } else {
        newProduct.id = Date.now(); // Fallback for local
      }
    } else {
      newProduct.id = Date.now();
    }
  } catch (err) {
    console.error('Error insertando nuevo producto:', err);
    showToast('⚠️ Error al conectar con servidor, se guardó localmente', 'warning');
    newProduct.id = Date.now();
  }

  if (window.logUserAction) {
    window.logUserAction('Nuevo Producto Creado', `Nombre: ${name} | Categ: ${cat} | Costo: ${cost} | Margen: ${margin} | Precio: ${price}`);
  }

  DATA.stock.push(newProduct);
  window.closeNewProductModal();
  window.renderStock();
  showToast('✅ Producto agregado correctamente', 'success');
};
