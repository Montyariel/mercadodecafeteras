// ==========================================
// MOCK DATA — Mercado de Cafeteras
// ==========================================

const DATA = {
  branches: {
    lanus:    { name: 'Lanús (Ventas + Taller)', color: '#f0c040' },
    belgrano: { name: 'Belgrano (Ventas)',       color: '#5b9bd5' },
    deposito: { name: 'Depósito Lanús',         color: '#4caf82' }
  },

  users: [
    { id: 1, user: 'admin', pass: '1122', name: 'Ariel', role: 'admin', location: 'lanus' },
    { id: 2, user: 'vendedor_lanus', pass: '1122', name: 'Vanesa', role: 'vendor', location: 'lanus' },
    { id: 3, user: 'vendedor_belgrano', pass: '1122', name: 'Marcos', role: 'vendor', location: 'belgrano' },
    { id: 4, user: 'jefe_deposito', pass: '1122', name: 'Ricardo', role: 'warehouse', location: 'deposito' },
    { id: 5, user: 'tecnico_taller', pass: '1122', name: 'Técnico Taller', role: 'tech', location: 'lanus' },
  ],

  kpis: {
    lanus: {
      ventas_mes: 182400,
      ventas_semana: 43200,
      reparaciones_mes: 47,
      reparaciones_pendientes: 8,
      ticket_promedio: 3880,
      clientes_nuevos: 12
    },
    belgrano: {
      ventas_mes: 134700,
      ventas_semana: 31500,
      reparaciones_mes: 29,
      reparaciones_pendientes: 5,
      ticket_promedio: 4650,
      clientes_nuevos: 8
    },
    deposito: {
      ventas_mes: 0,
      ventas_semana: 0,
      reparaciones_mes: 0,
      reparaciones_pendientes: 0,
      ticket_promedio: 0,
      clientes_nuevos: 0
    }
  },

  ventas_semana: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    lanus:    [8400, 11200, 7800, 12400, 9800, 15600],
    belgrano: [5200, 7400,  6100, 9200,  7800, 11000]
  },

  repairs: [
    { id: '#031', modelo: 'Nespresso Vertuo', cliente: 'Laura Méndez', celular: '11-5678-9012', problema: 'No calienta el agua', fecha: '17/04/2026', sucursal: 'lanus', sucursalAdmit: 'lanus',    estado: 'recibido',   prioridad: 'alta' },
    { id: '#030', modelo: 'De\'Longhi EC235', cliente: 'Marcos Ruiz',  celular: '11-4321-8765', problema: 'Pérdida de presión',   fecha: '16/04/2026', sucursal: 'belgrano', sucursalAdmit: 'belgrano', estado: 'recibido',   prioridad: 'media' },
    { id: '#029', modelo: 'Philips 1200',    cliente: 'Ana García',    celular: '11-9988-7766', problema: 'Error código E4',     fecha: '15/04/2026', sucursal: 'lanus', sucursalAdmit: 'lanus',    estado: 'recibido',   prioridad: 'baja' },
    { id: '#028', modelo: 'Gaggia Classic',  cliente: 'Carlos López',  celular: '11-3344-5566', problema: 'Bomba hace ruido',    fecha: '14/04/2026', sucursal: 'lanus', sucursalAdmit: 'belgrano', estado: 'progreso',   prioridad: 'alta' },
    { id: '#027', modelo: 'Jura E6',         cliente: 'Valentina F.',  celular: '11-2233-4455', problema: 'Molinillo atascado',  fecha: '12/04/2026', sucursal: 'lanus', sucursalAdmit: 'lanus',    estado: 'listo',      prioridad: 'media' },
    { id: '#026', modelo: 'Breville Duo',    cliente: 'Roberto P.',    celular: '11-6677-8899', problema: 'No prende',           fecha: '11/04/2026', sucursal: 'lanus', sucursalAdmit: 'belgrano', estado: 'progreso',   prioridad: 'media' },
    { 
      id: '#025', modelo: 'Oster PrimaLatte', cliente: 'Diana Sosa', celular: '11-1122-3344', 
      problema: 'Descalcificación', fecha: '10/04/2026', sucursal: 'lanus', sucursalAdmit: 'lanus', estado: 'listo', prioridad: 'baja',
      isOster: true, osterOp: 'OP-998877', diagnosticoTecnico: 'Limpieza de ductos y descalcificación general.'
    },
    { id: '#024', modelo: 'Smeg ECF01',      cliente: 'Juan Alvarez',  celular: '11-5544-7788', problema: 'Panel táctil falla', fecha: '09/04/2026', sucursal: 'belgrano', sucursalAdmit: 'belgrano', estado: 'progreso',   prioridad: 'alta' },
    { 
      id: '#020', modelo: 'Saeco Lirika', cliente: 'Guillermo S.', celular: '11-7766-5544', problema: 'Molido grueso', 
      fecha: '01/04/2026', sucursal: 'lanus', sucursalAdmit: 'lanus', estado: 'entregado', 
      fechaEntrega: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Hace 5 días
      presupuesto: { componentes: [{nombre: 'Muelas cerámicas', precio: 12500}], manoObra: 4500, total: 17000 }
    },
    { 
      id: '#015', modelo: 'Philips EP2220', cliente: 'Marta J.', celular: '11-8899-0011', problema: 'Fuga de agua', 
      fecha: '15/01/2026', sucursal: 'belgrano', estado: 'entregado', 
      fechaEntrega: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // Hace 100 días
      presupuesto: { componentes: [{nombre: 'O-ring grupo térmico', precio: 1200}], manoObra: 3500, total: 4700 }
    },
  ],

  stock: [
    { id: 1, nombre: 'Café Colombia Guanes 1 kilo - Bertone', categoria: 'Café', lanus: 10, belgrano: 5, deposito: 20, min: 5, precio: 75000, costo_unitario: 50000, margen_ganancia: 50, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/2f0788654b387c61d17c96c71146594185a623c2d43e2a8ebfcea40f8ba61144285824.jpg' },
    { id: 2, nombre: 'Café Colombia Guanes 500gr - Bertone', categoria: 'Café', lanus: 12, belgrano: 8, deposito: 25, min: 5, precio: 39500, costo_unitario: 26000, margen_ganancia: 52, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/2a433862bbb7f32ca8e5e63f4bb5e0766149826779e315266b1540618a7e8fc8285824.jpg' },
    { id: 3, nombre: 'Café Colombia Guanes 250gr - Bertone', categoria: 'Café', lanus: 15, belgrano: 10, deposito: 30, min: 5, precio: 22000, costo_unitario: 14000, margen_ganancia: 57, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/d91091a931315601e74b8767492cc88cb29b83454670384c17f49522c0e18032285824.jpg' },
    { id: 4, nombre: 'Café Brasil Pedra azul 1 kilo - Bertone', categoria: 'Café', lanus: 8, belgrano: 4, deposito: 15, min: 5, precio: 70500, costo_unitario: 47000, margen_ganancia: 50, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/da90152e60af38c4cf15a778663bc9a9f920bd15d699110cbc833ddd3628fcdb285824.jpg' },
    { id: 5, nombre: 'Café Brasil Pedra azul 500gr - Bertone', categoria: 'Café', lanus: 10, belgrano: 6, deposito: 20, min: 5, precio: 37000, costo_unitario: 24000, margen_ganancia: 54, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/bbf1ce643b1cbee69f6cc6f4bf7c58465f4080a204034af13be67601b05c5e1f285824.jpg' },
    { id: 6, nombre: 'Café Brasil Pedra azul 250gr - Bertone', categoria: 'Café', lanus: 14, belgrano: 9, deposito: 22, min: 5, precio: 20500, costo_unitario: 13000, margen_ganancia: 57, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/1f667a03cea8f4a10b5641e59392fd0d2c8029d30b54c9c0080c5063a04a933e285824.jpg' },
    { id: 7, nombre: 'Café Brasil Bourbon Rojo 1kilo - Bertone', categoria: 'Café', lanus: 7, belgrano: 3, deposito: 12, min: 5, precio: 66500, costo_unitario: 44000, margen_ganancia: 51, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/bde378e61a8c71966ca259bb6a102c2ae88cde935c0f71e0af392b677afc6d98285824.jpg' },
    { id: 8, nombre: 'Café Brasil Bourbon Rojo 500gr - Bertone', categoria: 'Café', lanus: 9, belgrano: 5, deposito: 18, min: 5, precio: 36600, costo_unitario: 24000, margen_ganancia: 52, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/b523e10a22e7a98fb097990a1556b937c20b058ade9e1bc8420ba49f107bd2ce285824.jpg' },
    { id: 9, nombre: 'Café Brasil Bourbon Rojo 250gr - Bertone', categoria: 'Café', lanus: 11, belgrano: 7, deposito: 21, min: 5, precio: 19600, costo_unitario: 12500, margen_ganancia: 56, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/2e27e04b244fd60c26d775b4490d704e0d4516982f55a52e1ffb312ba3a1e441285824.jpg' },
    { id: 10, nombre: 'Intensidad Suave Cápsulas p/ Nespresso', categoria: 'Cápsulas', lanus: 0, belgrano: 0, deposito: 0, min: 5, precio: 7500, costo_unitario: 5000, margen_ganancia: 50, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/6b51698cb55eb6db5dce29fc7ef1e4e3aeb2f9df2219eee13d965af0ba7a5ff7285824.jpg' },
    { id: 11, nombre: 'Intensidad Intermedio Cápsulas p/ Nespresso', categoria: 'Cápsulas', lanus: 20, belgrano: 15, deposito: 40, min: 5, precio: 9100, costo_unitario: 6000, margen_ganancia: 51, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/e11f08fc2053479690155f0e083d1f31d690efbb58b4afe59d1a16840be2d2bb285824.jpg' },
    { id: 12, nombre: 'Intensidad Fuerte Cápsulas p/ Nespresso', categoria: 'Cápsulas', lanus: 18, belgrano: 12, deposito: 35, min: 5, precio: 9100, costo_unitario: 6000, margen_ganancia: 51, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/b26e9ccc5943df3d136f443d433407d0b8830e7da0ff3cc19082a4cc45b3e9e7285824.jpg' },
    { id: 13, nombre: 'Cafetera Moka Express 2 tz - Bialetti', categoria: 'Cafeteras Moka', lanus: 4, belgrano: 2, deposito: 6, min: 2, precio: 108900, costo_unitario: 70000, margen_ganancia: 55, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/e84eb9e41e66f437e2e4e6675e5f1fd3680485ce665ba66515e5361e921e8657285824.jpg' },
    { id: 14, nombre: 'Cafetera Moka Express 3tz - Bialetti', categoria: 'Cafeteras Moka', lanus: 6, belgrano: 3, deposito: 8, min: 2, precio: 114400, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/60a844ee131c1f30bfbe427bb511e3f351ca27840e9628845fcebd98fb22cedf285824.jpg' },
    { id: 15, nombre: 'Cafeteras Moka Express 4tz - Bialetti', categoria: 'Cafeteras Moka', lanus: 3, belgrano: 1, deposito: 4, min: 2, precio: 143000, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/08b56c4041067f02b22c12a68d9ba722bc6029e0fb835a4a74f8813ed62ec019285824.jpg' },
    { id: 16, nombre: 'Cafetera Moka Express 6tz - Bialetti', categoria: 'Cafeteras Moka', lanus: 5, belgrano: 2, deposito: 7, min: 2, precio: 161000, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/bd697de83666f104b955827e4640ae984e995ecc1b78b485b05a1fb6fdbace10285824.jpg' },
    { id: 17, nombre: 'Cafetera Moka Express 9tz - Bialetti', categoria: 'Cafeteras Moka', lanus: 2, belgrano: 1, deposito: 3, min: 1, precio: 236900, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/26704ed6533d74df5c1e3f442a1c1e3b593588885a97b0ecee82784efd71ac1e285824.jpg' },
    { id: 18, nombre: 'Cafetera Moka Express 12tz - Bialetti', categoria: 'Cafeteras Moka', lanus: 1, belgrano: 0, deposito: 2, min: 1, precio: 307100, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/12189adc0043f53b4cdd75e5792b99ce59741efe9ab8abadcc053cbe23238e12285824.jpg' },
    { id: 19, nombre: 'Portafiltro N 2 - Domestic', categoria: 'Insumos', lanus: 20, belgrano: 10, deposito: 50, min: 5, precio: 6200, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/bfefd22c82cdd024bb0def5fae125538806bdd2fc17f570d9dfc972c33f11dd0285824.webp' },
    { id: 20, nombre: 'Filtros de Papel N 4 x 30un - Domestic', categoria: 'Insumos', lanus: 30, belgrano: 20, deposito: 100, min: 10, precio: 4950, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/7829c93c565ea079124f7fd80017703132f6393df70a73334d19b7dd320cd7a4285824.jpg' },
    { id: 21, nombre: 'Descalcificante en polvo', categoria: 'Limpieza', lanus: 15, belgrano: 10, deposito: 40, min: 5, precio: 7000, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/53c2b87a73c7d7d25a9ff50995ec157482d6da04b99b3027f8f75a508f4685dd285824.jpg' },
    { id: 22, nombre: 'Main Fusion - Jarabe de Vainilla', categoria: 'Jarabes', lanus: 6, belgrano: 4, deposito: 12, min: 2, precio: 18200, imagen: 'https://d22fxaf9t8d39k.cloudfront.net/860a4c9a6b361f7021e853b0df752bb6d901446b3c2be4932dd8ba0d9377d86f285824.png' }
  ],

  sales: [
    { fecha: '17/04', producto: 'Granos Arábica Premium 1kg', qty: 3, total: 14400, sucursal: 'lanus' },
    { fecha: '17/04', producto: 'Cápsulas Nespresso x10',     qty: 8, total: 9600,  sucursal: 'belgrano' },
    { fecha: '17/04', producto: 'De\'Longhi EC235',           qty: 1, total: 42000, sucursal: 'lanus' },
    { fecha: '16/04', producto: 'Filtros papel N°4 x100',     qty: 4, total: 3400,  sucursal: 'belgrano' },
    { fecha: '16/04', producto: 'Granos Blend Suave 1kg',     qty: 5, total: 18000, sucursal: 'lanus' },
    { fecha: '16/04', producto: 'Descalcificador líquido',    qty: 2, total: 4200,  sucursal: 'belgrano' },
    { fecha: '15/04', producto: 'Jura E6 (reacondicionada)',  qty: 1, total: 95000, sucursal: 'lanus' },
    { fecha: '15/04', producto: 'Cápsulas Dolce Gusto x16',  qty: 6, total: 9000,  sucursal: 'belgrano' },
    { fecha: '14/04', producto: 'Kit limpieza espumador',     qty: 3, total: 5400,  sucursal: 'lanus' },
    { fecha: '14/04', producto: 'Bomba vibratoria 15 bar',    qty: 1, total: 8500,  sucursal: 'belgrano' },
  ],

  transfers: [
    { id: 'TR-101', origen: 'deposito', destino: 'lanus', producto: 'Cápsulas Nespresso x10', qty: 50, fecha: '18/04', estado: 'recibido' },
    { id: 'TR-102', origen: 'deposito', destino: 'belgrano', producto: 'Filtros papel N°4 x100', qty: 20, fecha: '18/04', estado: 'enviado' },
  ],

  withdrawals: [
    { id: 1, sucursal: 'lanus', monto: 15000, motivo: 'Pago a proveedor de limpieza', categoria: 'Gasto Local', usuario: 'Vanesa', fecha: new Date().toISOString() },
    { id: 2, sucursal: 'belgrano', monto: 50000, motivo: 'Adelanto de sueldo', categoria: 'Adelanto', usuario: 'Marcos', fecha: new Date().toISOString() }
  ]
};

function formatCurrency(n) {
  return '$' + n.toLocaleString('es-AR');
}

function getStockStatus(qty, min) {
  if (qty <= 0) return { label: 'Sin stock', cls: 'stock-critical' };
  if (qty <= min * 0.5) return { label: 'Crítico', cls: 'stock-critical' };
  if (qty <= min) return { label: 'Bajo', cls: 'stock-low' };
  return { label: 'OK', cls: 'stock-ok' };
}
