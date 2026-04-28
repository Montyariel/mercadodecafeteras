// ==========================================
// COMPROBANTE DE INGRESO — Mercado de Cafeteras
// ==========================================

/**
 * Genera e imprime el ticket de ingreso para el cliente
 * @param {string} repairId ID de la reparación
 */
function printAdmissionReceipt(repairId) {
  const r = DATA.repairs.find(x => x.id === repairId);
  if (!r) {
    showToast('⚠️ No se encontró la reparación para imprimir', 'error');
    return;
  }

  const branchName = r.sucursal === 'lanus' ? 'Sucursal Lanús' : 'Sucursal Belgrano';
  const branchAddress = r.sucursal === 'lanus' ? 'Av. Hipólito Yrigoyen 3615, Lanús' : 'Juramento 2590, CABA';
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Ingreso — ${r.id}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #333; padding: 40px; font-size: 14px; line-height: 1.5; }
        .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3d2314; padding-bottom: 20px; margin-bottom: 25px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-logo { font-size: 32px; }
        .brand-name { font-size: 20px; font-weight: 800; color: #3d2314; text-transform: uppercase; }
        
        .receipt-info { text-align: right; }
        .receipt-id { font-size: 24px; font-weight: 900; color: #c9973a; margin-bottom: 4px; }
        .receipt-date { font-size: 13px; color: #777; }

        .section { margin-bottom: 20px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #a08060; border-bottom: 1px solid #f0e6d3; padding-bottom: 4px; margin-bottom: 10px; font-weight: 700; }
        
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .label { font-weight: 600; color: #555; width: 140px; flex-shrink: 0; }
        .value { color: #222; flex: 1; }

        .problem-box { background: #fdfaf4; border-left: 4px solid #c9973a; padding: 12px 15px; font-style: italic; margin-top: 5px; color: #5c3520; }

        .warranty-box { margin-top: 35px; border-top: 1px dashed #ccc; padding-top: 15px; font-size: 11px; color: #666; }
        .warranty-title { font-weight: 700; color: #444; margin-bottom: 5px; text-transform: uppercase; }
        
        .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .firma { border-top: 1px solid #333; text-align: center; padding-top: 8px; font-size: 11px; }

        .no-print-btn { background: #3d2314; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; position: fixed; top: 20px; right: 20px; }

        @media print {
            .no-print-btn { display: none; }
            body { padding: 0; }
            .receipt { border: none; max-width: 100%; }
        }
    </style>
</head>
<body>
    <button class="no-print-btn" onclick="window.print()">🖨️ Imprimir Comprobante</button>

    <div class="receipt">
        <div class="header">
            <div class="brand">
                <div class="brand-logo">☕</div>
                <div class="brand-name">Mercado de Cafeteras</div>
            </div>
            <div class="receipt-info">
                <div class="receipt-id">ORDEN #${r.id}</div>
                <div class="receipt-date">Admisión: ${r.fecha}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Datos de la Sucursal</div>
            <div class="row"><span class="label">Local:</span> <span class="value">${branchName}</span></div>
            <div class="row"><span class="label">Dirección:</span> <span class="value">${branchAddress}</span></div>
        </div>

        <div class="section">
            <div class="section-title">Datos del Cliente</div>
            <div class="row"><span class="label">Nombre:</span> <span class="value">${r.cliente}</span></div>
            <div class="row"><span class="label">Teléfono:</span> <span class="value">${r.celular}</span></div>
        </div>

        <div class="section">
            <div class="section-title">Detalle del Equipo</div>
            <div class="row"><span class="label">Modelo:</span> <span class="value">${r.modelo}</span></div>
            ${(r.isOster || r.is_oster || r.isPeabody || r.is_peabody) ? `
            <div style="background:#fff8ee; border:1px solid #c9973a; border-radius:4px; padding:10px; margin-top:10px; margin-bottom:10px;">
                <div style="color:#c9973a; font-weight:800; font-size:12px; text-transform:uppercase; display:flex; align-items:center; gap:6px;">
                    🛡️ Garantía Oficial ${(r.isOster || r.is_oster) ? 'Oster' : 'Peabody'}
                </div>
                <div style="font-size:13px; margin-top:4px;"><b>Nº Operación:</b> ${r.osterOp || r.oster_op || r.peabodyOp || r.peabody_op || '<span style="color:#a08060; font-style:italic;">Pendiente de diagnóstico</span>'}</div>
                <div style="font-size:11px; color:#a08060; margin-top:2px;">* Reparación sin cargo para el cliente. Sujeta a validación de garantía.</div>
            </div>` : ''}
            <div class="row"><span class="label">Diagnóstico Inicial:</span></div>
            <div class="problem-box">"${r.problema}"</div>
        </div>

        <div class="warranty-box">
            <div class="warranty-title">Términos y Condiciones de Garantía</div>
            <p>1. El presente documento es el único comprobante válido para retirar el equipo.</p>
            <p>2. Toda reparación cuenta con una garantía de <b>90 días corridos</b> sobre el trabajo realizado y componentes reemplazados.</p>
            <p>3. La garantía no cubre fallas por mal uso, negligencia, golpes o variaciones de tensión eléctrica.</p>
            <p>4. Pasados los 60 días de la notificación de "Listo", la empresa no se responsabiliza por la custodia del equipo.</p>
        </div>

        <div class="footer">
            <div class="firma">Firma Cliente</div>
            <div class="firma">Recibido por Mercado de Cafeteras</div>
        </div>
    </div>

    <script>
        // Auto-abrir diálogo de impresión al cargar
        window.onload = () => {
            setTimeout(() => {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
  `;

  // Crear Blob y abrir en nueva ventana
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  showToast('📋 Generando comprobante de ingreso...', 'success');
}
