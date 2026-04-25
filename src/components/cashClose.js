// ==========================================
// CIERRE DE CAJA — Mercado de Cafeteras
// ==========================================

// Configuración del dueño (editable)
const OWNER_CONFIG = {
  whatsapp: '5491112345678',   // Número con código país, sin + ni espacios
  email:    'dueno@mercadodecafeteras.com.ar',
  nombre:   'Ariel',
};

// ─── Construcción del informe ─────────────
function buildCierreData(branch) {
  const today   = new Date();
  const fechaHoy = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}`;

  const ventasHoy = DATA.sales.filter(s => {
    let f = s.fecha || s.fecha_str;
    if (!f) return false;
    
    // Si es un ISO timestamp (de Supabase), convertir a DD/MM
    if (f.includes('T') || f.includes('-')) {
      const d = new Date(f);
      f = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
    }
    
    const mismaFecha = f === fechaHoy;
    return branch === 'ambas' ? mismaFecha : (mismaFecha && s.sucursal === branch);
  });

  const repHoy = DATA.repairs.filter(r =>
    branch === 'ambas' ? (r.estado === 'listo' || r.estado === 'entregado') : ((r.estado === 'listo' || r.estado === 'entregado') && r.sucursal === branch)
  );

  const totalVentas  = ventasHoy.reduce((a, s) => a + s.total, 0);
  
  // Calcular total de reparaciones usando el presupuesto real si existe, sino usar estimación (excluyendo Oster)
  const totalReps    = repHoy.reduce((acc, r) => {
    if (r.isOster) return acc;
    return acc + (r.presupuesto ? r.presupuesto.total : 3500);
  }, 0);

  const totalGeneral = totalVentas + totalReps;
  const cantVentas   = ventasHoy.reduce((a, s) => a + s.qty, 0);

  const desglose = {};
  const medios   = { efectivo: 0, tarjeta: 0, transferencia: 0, mercadopago: 0 };

  ventasHoy.forEach(s => {
    // 1. Desglose categorías (mejorado)
    const nombrePrimario = s.producto.split(' ')[0].toLowerCase();
    const found = DATA.stock.find(st => st.nombre.toLowerCase().includes(nombrePrimario));
    const cat = found ? found.categoria : 'Varios / Otros';
    desglose[cat] = (desglose[cat] || 0) + s.total;

    // 2. Desglose medios pago
    if (s.medio_pago) {
      const partes = s.medio_pago.split(' | ');
      partes.forEach(p => {
        const [metodo, montoStr] = p.split(': ');
        if (metodo && montoStr) {
          const valor = parseInt(montoStr.replace(/[^0-9]/g, '')) || 0;
          const metLower = metodo.toLowerCase();
          
          if (metLower.includes('efectivo')) medios.efectivo += valor;
          else if (metLower.includes('tarjeta')) medios.tarjeta += valor;
          else if (metLower.includes('transferencia')) medios.transferencia += valor;
          else if (metLower.includes('mercado') || metLower.includes('qr')) medios.mercadopago += valor;
        }
      });
    } else {
      medios.efectivo += s.total;
    }
  });

  // Retiros
  const retirosHoy = (DATA.withdrawals || []).filter(w => {
    let f = w.fecha || w.created_at;
    if (!f) return true;
    if (f && (f.includes('T') || f.includes('-'))) {
      const d = new Date(f);
      const isoStr = d.toISOString().split('T')[0];
      const todayIso = new Date().toISOString().split('T')[0];
      return (isoStr === todayIso || f.startsWith(todayIso)) && (branch === 'ambas' || w.sucursal === branch);
    }
    return f === fechaHoy && (branch === 'ambas' || w.sucursal === branch);
  });
  const totalRetiros = retirosHoy.reduce((a, w) => a + w.monto, 0);
  const efectivoFinal = medios.efectivo - totalRetiros;

  return {
    fecha: fechaHoy, hora: today.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    branch, ventasHoy, totalVentas, totalReps, totalGeneral, cantVentas, repHoy, desglose, medios,
    retirosHoy, totalRetiros, efectivoFinal
  };
}

// ─── Texto plano del informe (para WhatsApp / Email) ─────────────
function buildCierreTexto(d, branchLabel) {
  const lineas = [
    '☕ *MERCADO DE CAFETERAS*',
    `📋 *Cierre de Caja — ${branchLabel}*`,
    `📅 Fecha: ${d.fecha}  |  🕐 Hora: ${d.hora}`,
    '──────────────────────────',
    `🛒 Ventas productos:   ${formatCurrency(d.totalVentas)}`,
    `🔧 Reparaciones:       ${formatCurrency(d.totalReps)} (${d.repHoy.length} trabajos)`,
    `💰 *TOTAL DEL DÍA:     ${formatCurrency(d.totalGeneral)}*`,
    '──────────────────────────',
  ];

  if (Object.keys(d.desglose).length > 0) {
    lineas.push('📂 *Desglose por categoría:*');
    Object.entries(d.desglose).forEach(([cat, tot]) => {
      lineas.push(`  · ${cat}: ${formatCurrency(tot)}`);
    });
    lineas.push('');
  }

  if (d.ventasHoy.length > 0) {
    lineas.push('🛍️ *Ventas del día:*');
    d.ventasHoy.forEach(s => lineas.push(`  · ${s.producto} ×${s.qty} → ${formatCurrency(s.total)}`));
    lineas.push('');
  }

  if (d.repHoy.length > 0) {
    lineas.push('🔧 *Reparaciones listas:*');
    d.repHoy.forEach(r => lineas.push(`  · ${r.id} ${r.modelo} (${r.cliente})`));
    lineas.push('');
  }

  lineas.push('💵 *Desglose Financiero:*');
  lineas.push(`  · Efectivo Ingresado: ${formatCurrency(d.medios.efectivo)}`);
  if (d.totalRetiros > 0) {
    lineas.push(`  · Salidas de Caja:   -${formatCurrency(d.totalRetiros)}`);
    d.retirosHoy.forEach(w => lineas.push(`      ↪ [${w.categoria || 'Gasto'}] ${w.motivo} (${formatCurrency(w.monto)})`));
  }
  lineas.push(`  · *EFECTIVO EN CAJA:   ${formatCurrency(d.efectivoFinal)}*`);
  lineas.push(`  · Tarjeta/Cred:       ${formatCurrency(d.medios.tarjeta)}`);
  lineas.push(`  · Transf/Alias:       ${formatCurrency(d.medios.transferencia)}`);
  lineas.push(`  · MercadoPago:        ${formatCurrency(d.medios.mercadopago)}`);

  lineas.push('──────────────────────────');
  lineas.push('_Generado por Mercado de Cafeteras App_');
  return lineas.join('\n');
}

// ─── Generar HTML del informe para PDF ─────────────
function buildCierreHTML(d, branchLabel) {
  const desgloseHtml = Object.entries(d.desglose).map(([cat, tot]) =>
    `<tr><td>📂 ${cat}</td><td class="money">${formatCurrency(tot)}</td></tr>`
  ).join('') || '<tr><td colspan="2" class="muted">Sin ventas registradas hoy</td></tr>';

  const ventasHtml = d.ventasHoy.map(s =>
    `<tr><td><span class="tag ${s.sucursal}">${s.sucursal === 'lanus' ? 'LAN' : 'BEL'}</span> ${s.producto}</td><td>×${s.qty}</td><td class="money">${formatCurrency(s.total)}</td></tr>`
  ).join('') || '<tr><td colspan="3" class="muted">Sin ventas del día</td></tr>';

  const repsHtml = d.repHoy.map(r =>
    `<tr><td><span class="tag ${r.sucursal}">${r.sucursal === 'lanus' ? 'LAN' : 'BEL'}</span> ${r.id} — ${r.modelo}</td><td>${r.cliente}</td><td class="${r.estado === 'entregado' ? 'ok' : ''}">${r.estado === 'entregado' ? '🤝 Entregado' : '✓ Listo'}</td></tr>`
  ).join('') || '<tr><td colspan="3" class="muted">Sin reparaciones completadas</td></tr>';

  const retirosHtml = d.retirosHoy.length > 0 
    ? d.retirosHoy.map(w => `<tr><td><span class="tag ${w.sucursal}">${w.sucursal === 'lanus' ? 'LAN' : 'BEL'}</span> <strong style="color:#d9434e">[${w.categoria || 'Gasto'}]</strong> ${w.motivo}</td><td class="money" style="color:#d9434e">-${formatCurrency(w.monto)}</td></tr>`).join('') 
    : '<tr><td colspan="2" class="muted">Sin salidas de caja registradas</td></tr>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Cierre de Caja — ${d.fecha}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#2d1a0e;padding:32px;font-size:13px}
  .header{text-align:center;padding:24px;background:linear-gradient(135deg,#3d2314,#5c3520);color:#fff;border-radius:12px;margin-bottom:24px}
  .header h1{font-size:22px;font-weight:800;margin:8px 0 4px}
  .header .sub{font-size:14px;color:#d4a76a;font-weight:600}
  .header .date{font-size:12px;color:#a08060;margin-top:6px}
  .total-box{background:#fff8ee;border:2px solid #c9973a;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .total-box .lbl{font-size:13px;color:#7a4a2e;font-weight:600}
  .total-box .val{font-size:30px;font-weight:900;color:#c9973a}
  h3{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#a08060;margin:20px 0 8px;border-bottom:1px solid #e8cfa3;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#a08060;padding:6px 8px;border-bottom:1px solid #e8cfa3}
  td{padding:8px 8px;border-bottom:1px solid #f5eada;font-size:13px}
  .money{text-align:right;font-weight:700;color:#7a4a2e}
  .ok{color:#4caf82;font-weight:700;text-align:center}
  .muted{color:#a08060;font-style:italic;text-align:center;padding:12px}
  .tag{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;margin-right:4px}
  .tag.lanus{background:#fff0cc;color:#7a4a2e}
  .tag.belgrano{background:#dceef8;color:#2a4a7a}
  .summary-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5eada;font-size:13px}
  .summary-row.total{background:#fff8ee;border-radius:6px;padding:10px;margin-top:6px;font-weight:800;font-size:15px}
  .firma{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}
  .firma-box{border-top:1px dashed #c9973a;padding-top:8px;text-align:center;font-size:11px;color:#a08060}
  .footer{text-align:center;margin-top:24px;font-size:11px;color:#a08060;border-top:1px solid #e8cfa3;padding-top:12px}
</style>
</head>
<body>
<div class="header">
  <div style="font-size:32px">☕</div>
  <h1>Mercado de Cafeteras</h1>
  <div class="sub">${branchLabel}</div>
  <div class="date">Cierre de Caja — ${d.fecha} | ${d.hora}</div>
</div>

<div class="total-box">
  <div><div class="lbl">💰 Total recaudado del día</div><small style="color:#a08060">${d.cantVentas} ítem(s) · ${d.repHoy.length} reparación(es)</small></div>
  <div class="val">${formatCurrency(d.totalGeneral)}</div>
</div>

<h3>Resumen</h3>
<div class="summary-row"><span>🛒 Ventas de productos</span><strong>${formatCurrency(d.totalVentas)}</strong></div>
<div class="summary-row"><span>🔧 Reparaciones</span><strong>${formatCurrency(d.totalReps)}</strong></div>
<div class="summary-row total"><span>TOTAL GENERAL</span><span style="color:#c9973a">${formatCurrency(d.totalGeneral)}</span></div>

<h3>💰 Medios de Pago (Ventas)</h3>
<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
  <div class="summary-row" style="flex-direction:column; align-items:flex-start;">
    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:4px;"><span>💵 Efectivo (Ventas)</span><strong>${formatCurrency(d.medios.efectivo)}</strong></div>
    ${d.totalRetiros > 0 ? `<div style="display:flex; justify-content:space-between; width:100%; color:#d9434e; font-size:11px; margin-bottom:4px;"><span>➖ Salidas de Caja</span><strong>-${formatCurrency(d.totalRetiros)}</strong></div>` : ''}
    <div style="display:flex; justify-content:space-between; width:100%; padding-top:4px; border-top:1px dashed #e8cfa3; font-weight:800;"><span>EFECTIVO EN CAJA</span><strong style="color:#4caf82;">${formatCurrency(d.efectivoFinal)}</strong></div>
  </div>
  <div>
    <div class="summary-row"><span>💳 Tarjeta</span><strong>${formatCurrency(d.medios.tarjeta)}</strong></div>
    <div class="summary-row"><span>🏦 Transferencia</span><strong>${formatCurrency(d.medios.transferencia)}</strong></div>
    <div class="summary-row"><span>📱 Mercado Pago</span><strong>${formatCurrency(d.medios.mercadopago)}</strong></div>
  </div>
</div>

${d.retirosHoy.length > 0 ? `
<h3>💸 Egresos / Salidas de Caja</h3>
<table><thead><tr><th>Motivo / Categoría</th><th style="text-align:right">Monto</th></tr></thead><tbody>${retirosHtml}</tbody></table>
` : ''}

<h3>Desglose por categoría</h3>
<table><thead><tr><th>Categoría</th><th style="text-align:right">Monto</th></tr></thead><tbody>${desgloseHtml}</tbody></table>

<h3>Detalle de ventas</h3>
<table><thead><tr><th>Producto</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead><tbody>${ventasHtml}</tbody></table>

<h3>Reparaciones listas</h3>
<table><thead><tr><th>Equipo</th><th>Cliente</th><th style="text-align:center">Estado</th></tr></thead><tbody>${repsHtml}</tbody></table>

<div class="firma">
  <div class="firma-box">Responsable de caja<br><br><br></div>
  <div class="firma-box">Supervisor / Dueño<br><br><br></div>
</div>
<div class="footer">Generado automáticamente por Mercado de Cafeteras App</div>
</body></html>`;
}

// ─── Descargar HTML como archivo (compatible sin servidor) ─────────────
function downloadCierreHTML(d, branchLabel) {
  const html    = buildCierreHTML(d, branchLabel);
  const blob    = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = url;
  link.download = `CierreDeCaja_${d.fecha.replace(/\//g,'-')}_${branchLabel.replace(/ /g,'')}.html`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('📥 Informe descargado. Abrilo en el navegador y usá Ctrl+P para guardar como PDF.', 'success');
}

// ─── Enviar por WhatsApp ─────────────────────────────
function enviarWhatsApp(d, branchLabel) {
  const texto = buildCierreTexto(d, branchLabel);
  const url   = `https://wa.me/${OWNER_CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
  showToast('📲 Abriendo WhatsApp...', 'success');
}

// ─── Enviar por Email ─────────────────────────────────
function enviarEmail(d, branchLabel) {
  const asunto  = `Cierre de Caja ${branchLabel} — ${d.fecha}`;
  const cuerpo  = buildCierreTexto(d, branchLabel).replace(/\*/g, '').replace(/_/g, '');
  const url     = `mailto:${OWNER_CONFIG.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  window.open(url, '_blank');
  showToast('📧 Abriendo cliente de correo...', 'success');
}

// ─── Modal principal ─────────────────────────────────
function openCierre(branch = 'ambas') {
  const d           = buildCierreData(branch);
  const branchLabel = branch === 'ambas' ? 'Ambas Sucursales' : branch === 'lanus' ? 'Sucursal Lanús' : 'Sucursal Belgrano';
  const branchColor = branch === 'belgrano' ? 'var(--blue)' : 'var(--gold-bright)';

  const desgloseRows = Object.entries(d.desglose).length > 0
    ? Object.entries(d.desglose).map(([cat, tot]) =>
        `<div class="cierre-row"><span class="cierre-row-label">📂 ${cat}</span><span class="cierre-row-value highlight">${formatCurrency(tot)}</span></div>`
      ).join('')
    : `<div class="cierre-row"><span class="cierre-row-label" style="color:var(--text-muted);font-style:italic;">Sin ventas registradas hoy en esta sucursal</span></div>`;

  const ventasRows = d.ventasHoy.length > 0
    ? d.ventasHoy.map(s =>
        `<div class="cierre-row">
          <span class="cierre-row-label"><span class="cierre-suc-tag ${s.sucursal === 'lanus' ? 'branch-lanus' : 'branch-belgrano'}">${s.sucursal === 'lanus' ? 'LAN' : 'BEL'}</span> ${s.producto} ×${s.qty}</span>
          <span class="cierre-row-value">${formatCurrency(d.totalVentas)}</span>
        </div>`
      ).join('')
    : `<div class="cierre-row"><span class="cierre-row-label" style="color:var(--text-muted);font-style:italic;">Sin ventas del día registradas</span></div>`;

  const repRows = d.repHoy.length > 0
    ? d.repHoy.map(r =>
        `<div class="cierre-row">
          <span class="cierre-row-label"><span class="cierre-suc-tag ${r.sucursal === 'lanus' ? 'branch-lanus' : 'branch-belgrano'}">${r.sucursal === 'lanus' ? 'LAN' : 'BEL'}</span> ${r.id} — ${r.modelo} (${r.cliente})</span>
          <span class="cierre-row-value green">✓ Listo</span>
        </div>`
      ).join('')
    : `<div class="cierre-row"><span class="cierre-row-label" style="color:var(--text-muted);font-style:italic;">Sin reparaciones completadas hoy</span></div>`;

  const html = `
    <div class="cierre-modal-overlay active" id="cierre-overlay">
      <div class="cierre-modal" id="print-area">
        <div class="cierre-header">
          <div class="cierre-header-logo">☕</div>
          <div class="cierre-header-title">Mercado de Cafeteras</div>
          <div class="cierre-header-sub" style="color:${branchColor};font-weight:600;">${branchLabel}</div>
          <div class="cierre-header-date">📅 Cierre de Caja — ${d.fecha} &nbsp;|&nbsp; 🕐 ${d.hora}</div>
        </div>

        <div class="cierre-body">
          <div class="cierre-total-box">
            <div>
              <div class="cierre-total-label">💰 Total recaudado del día</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${d.cantVentas} ítem(s) vendidos · ${d.repHoy.length} reparación(es) lista(s)</div>
            </div>
            <div class="cierre-total-value">${formatCurrency(d.totalGeneral)}</div>
          </div>

          <div class="cierre-section">
            <div class="cierre-section-title">Resumen del día</div>
            <div class="cierre-row"><span class="cierre-row-label">🛒 Ventas de productos</span><span class="cierre-row-value highlight">${formatCurrency(d.totalVentas)}</span></div>
            <div class="cierre-row"><span class="cierre-row-label">🔧 Reparaciones (est.)</span><span class="cierre-row-value highlight">${formatCurrency(d.totalReps)}</span></div>
            <div class="cierre-row" style="background:rgba(200,140,60,0.07);border-radius:8px;padding:10px;margin-top:6px;">
              <span class="cierre-row-label" style="font-weight:700;color:var(--text-primary);">TOTAL GENERAL</span>
              <span class="cierre-row-value" style="font-size:18px;color:var(--gold-bright);">${formatCurrency(d.totalGeneral)}</span>
            </div>
          </div>

          <div class="cierre-section">
            <div class="cierre-section-title">Desglose Financiero y Efectivo</div>
            <table>
              <tr><td style="color:#2d1a0e; font-weight:600;">Efectivo Bruto (Ingresos)</td><td class="money">${formatCurrency(d.medios.efectivo)}</td></tr>
              ${d.totalRetiros > 0 ? `
                <tr><td style="color:#d9434e; font-weight:600;">Salidas de Caja (Gastos/Adelantos)</td><td class="money" style="color:#d9434e;">-${formatCurrency(d.totalRetiros)}</td></tr>
                ${d.retirosHoy.map(w => `<tr><td style="color:#888; font-size:11px; padding-left:15px;">↪ <b>[${w.categoria || 'Gasto'}]</b> ${w.motivo}</td><td class="money" style="color:#888; font-size:11px;">-${formatCurrency(w.monto)}</td></tr>`).join('')}
              ` : ''}
              <tr style="background:#f4f4f4;"><td style="font-weight:800; color:#1a1a1a;">EFECTIVO FINAL EN CAJA</td><td class="money" style="font-weight:800; font-size:16px; color:#c9973a;">${formatCurrency(d.efectivoFinal)}</td></tr>
              <tr><td>Tarjetas</td><td class="money">${formatCurrency(d.medios.tarjeta)}</td></tr>
              <tr><td>Transferencias</td><td class="money">${formatCurrency(d.medios.transferencia)}</td></tr>
              <tr><td>Mercado Pago</td><td class="money">${formatCurrency(d.medios.mercadopago)}</td></tr>
            </table>
          </div>

          <div class="cierre-section">
            <div class="cierre-section-title">Desglose por categoría</div>
            ${desgloseRows}
          </div>

          <div class="cierre-section">
            <div class="cierre-section-title">Detalle de ventas</div>
            ${ventasRows}
          </div>

          <div class="cierre-section">
            <div class="cierre-section-title">Reparaciones listas</div>
            ${repRows}
          </div>

          <div class="cierre-firma">
            <div class="cierre-firma-box">Responsable de caja<br><br><br></div>
            <div class="cierre-firma-box">Supervisor / Dueño<br><br><br></div>
          </div>
        </div>

        <!-- Footer — botones de acción -->
        <div class="cierre-footer no-print">
          <button class="btn btn-ghost" onclick="closeCierre()">✖ Cerrar</button>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn btn-ghost" onclick="openExpenseModal()">💸 Retiro</button>
            <button class="btn btn-ghost" id="btn-dl-informe"
              onclick="downloadCierreHTML(window._cierreData, window._cierre_branchLabel)">
              📥 Descargar informe
            </button>
            <button class="btn btn-ghost" style="color:var(--green);border-color:rgba(76,175,130,0.3);"
              onclick="enviarWhatsApp(window._cierreData, window._cierre_branchLabel)">
              📲 WhatsApp
            </button>
            <button class="btn btn-primary"
              onclick="enviarEmail(window._cierreData, window._cierre_branchLabel)">
              📧 Enviar por email
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById('cierre-overlay');
  if (existing) existing.remove();

  // Guardar datos en scope global para los botones del modal
  window._cierreData        = d;
  window._cierre_branchLabel = branchLabel;

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('cierre-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeCierre();
  });

  showToast('📋 Cierre de caja generado', 'success');
}

function closeCierre() {
  const overlay = document.getElementById('cierre-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }
}

