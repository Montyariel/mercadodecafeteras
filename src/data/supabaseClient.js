// ==========================================
// SUPABASE CLIENT — Mercado de Cafeteras
// ==========================================

// Credenciales de Supabase
window.SUPABASE_URL = 'https://knrwqhpbncemamoynbvp.supabase.co';
window.SUPABASE_KEY = 'sb_publishable_GwhqfQk5ePow1AcT4OLHrg_qA7IwfqR';

// Manejo defensivo: si la librería no cargó (ej: sin internet), evitamos crash total
window.supabaseDB = null;
if (typeof supabase !== 'undefined') {
  window.supabaseDB = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
  console.log('✅ Cliente Supabase inicializado correctamente');
} else {
  console.warn('⚠️ La librería de Supabase no se detectó. Trabajando en modo Offline.');
}

// Helper para verificar la conexión inicial
window.testSupabaseConnection = async function() {
  if (!window.supabaseDB) {
    console.warn('⚠️ Supabase no detectado. Funcionalidad Cloud inactiva.');
    return false;
  }
  try {
    const { data, error } = await window.supabaseDB.from('repairs').select('id').limit(1);
    if (error) {
      console.error('❌ Error de conexión Supabase:', error.message, error.code, error.details);
      // Mostrar toast al usuario para que sepa que hay un problema
      if (typeof showToast === 'function') {
        showToast('⚠️ Error de conexión con la base de datos: ' + error.message, 'error');
      }
      return false;
    }
    console.log('✅ Supabase conectado correctamente. Registros en repairs:', data ? data.length : 0);
    return true;
  } catch (err) {
    console.error('⚠️ No se pudo conectar a Supabase:', err.message || err);
    return false;
  }
};

// ==========================================
// HELPERS DE DATOS (CRUD)
// ==========================================

window.db = {
  repairs: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('repairs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[db.repairs.getAll] Error:', error);
        throw error;
      }
      return data;
    },
    async insert(newRepair) {
      if (!window.supabaseDB) return null;
      console.log('[db.repairs.insert] Insertando:', newRepair);
      const { data, error } = await window.supabaseDB
        .from('repairs')
        .insert([newRepair])
        .select(); // CRÍTICO: .select() para obtener confirmación del insert
      if (error) {
        console.error('[db.repairs.insert] Error:', error.message, '| Code:', error.code, '| Details:', error.details, '| Hint:', error.hint);
        throw error;
      }
      console.log('[db.repairs.insert] Insertado correctamente:', data);
      return data;
    },
    async update(id, updates) {
      if (!window.supabaseDB) return null;
      console.log('[db.repairs.update] Actualizando ID:', id, '| Updates:', updates);
      const { data, error } = await window.supabaseDB
        .from('repairs')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) {
        console.error('[db.repairs.update] Error:', error.message, '| Code:', error.code);
        throw error;
      }
      return data;
    }
  },

  stock: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('stock').select('*').order('nombre');
      if (error) {
        console.error('[db.stock.getAll] Error:', error);
        throw error;
      }
      return data;
    },
    async updateBranch(id, branch, newQty) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('stock')
        .update({ [branch]: newQty })
        .eq('id', id)
        .select();
      if (error) {
        console.error('[db.stock.updateBranch] Error:', error);
        throw error;
      }
      return data;
    },
    async update(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('stock')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) {
        console.error('[db.stock.update] Error:', error);
        throw error;
      }
      return data;
    },
    async upsert(item) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('stock')
        .upsert([item])
        .select();
      if (error) {
        console.error('[db.stock.upsert] Error:', error);
        throw error;
      }
      return data;
    },
    async insert(item) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('stock')
        .insert([item])
        .select();
      if (error) {
        console.error('[db.stock.insert] Error:', error);
        throw error;
      }
      return data;
    }
  },

  sales: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('sales')
        .select('*')
        .order('fecha', { ascending: false });
      if (error) {
        console.error('[db.sales.getAll] Error:', error);
        throw error;
      }
      return data;
    },
    async insert(newSale) {
      if (!window.supabaseDB) return null;
      console.log('[db.sales.insert] Insertando venta:', newSale);
      const { data, error } = await window.supabaseDB
        .from('sales')
        .insert([newSale])
        .select();
      if (error) {
        console.error('[db.sales.insert] Error:', error.message, '| Code:', error.code, '| Details:', error.details);
        throw error;
      }
      return data;
    }
  },

  transfers: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('transfers')
        .select('*')
        .order('id', { ascending: false });
      if (error) {
        console.error('[db.transfers.getAll] Error:', error);
        throw error;
      }
      return data;
    },
    async insert(newTransfer) {
      if (!window.supabaseDB) return null;
      console.log('[db.transfers.insert] Insertando traslado:', newTransfer);
      const { data, error } = await window.supabaseDB
        .from('transfers')
        .insert([newTransfer])
        .select();
      if (error) {
        console.error('[db.transfers.insert] Error:', error.message, '| Code:', error.code, '| Details:', error.details);
        throw error;
      }
      return data;
    },
    async update(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('transfers')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) {
        console.error('[db.transfers.update] Error:', error);
        throw error;
      }
      return data;
    }
  },

  withdrawals: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('cash_withdrawals')
        .select('*')
        .order('id', { ascending: false });
      if (error) {
        console.error('[db.withdrawals.getAll] Error:', error);
        throw error;
      }
      return data;
    },
    async insert(newWithdrawal) {
      if (!window.supabaseDB) return null;
      console.log('[db.withdrawals.insert] Insertando retiro:', newWithdrawal);
      const { data, error } = await window.supabaseDB
        .from('cash_withdrawals')
        .insert([newWithdrawal])
        .select();
      if (error) {
        console.error('[db.withdrawals.insert] Error:', error.message, '| Code:', error.code, '| Details:', error.details);
        throw error;
      }
      return data;
    }
  },

  audit_logs: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[db.audit_logs.getAll] Error:', error);
        throw error;
      }
      return data;
    },
    async insert(log) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('audit_logs')
        .insert([log])
        .select();
      if (error) {
        console.error('[db.audit_logs.insert] Error:', error);
        throw error;
      }
      return data;
    }
  },

  cash_shifts: {
    async getActive(sucursal) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('cash_shifts')
        .select('*')
        .eq('sucursal', sucursal)
        .eq('estado', 'abierta')
        .order('opened_at', { ascending: false })
        .limit(1);
      if (error) {
        console.error('[db.cash_shifts.getActive] Error:', error);
        throw error;
      }
      return data;
    },
    async openShift(shiftData) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('cash_shifts')
        .insert([shiftData])
        .select();
      if (error) {
        console.error('[db.cash_shifts.openShift] Error:', error);
        throw error;
      }
      return data;
    },
    async closeShift(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB
        .from('cash_shifts')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) {
        console.error('[db.cash_shifts.closeShift] Error:', error);
        throw error;
      }
      return data;
    }
  }
};

// ==========================================
// SUSCRIPCIONES EN TIEMPO REAL (Realtime)
// ==========================================
window.initRealtimeSubscription = function() {
  if (!window.supabaseDB) return;

  console.log('📡 Iniciando canales de tiempo real...');

  const channel = window.supabaseDB
    .channel('db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'repairs' },
      (payload) => {
        console.log('🔄 Cambio detectado en Reparaciones:', payload.eventType);
        window.loadAllData(true);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transfers' },
      (payload) => {
        console.log('🔄 Cambio detectado en Traslados:', payload.eventType);
        window.loadAllData(true);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stock' },
      (payload) => {
        console.log('🔄 Cambio detectado en Stock:', payload.eventType);
        window.loadAllData(true);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscripto a cambios en tiempo real');
      }
    });
};

window.logUserAction = async function(accion, detalles) {
  if (!window.currentUser) return;
  const log = {
    usuario: window.currentUser.user || window.currentUser.name || 'Desconocido',
    rol: window.currentUser.role || 'vendor',
    sucursal: window.currentUser.location || 'desconocida',
    accion: accion,
    detalles: typeof detalles === 'string' ? detalles : JSON.stringify(detalles)
  };
  try {
    if (window.supabaseDB) {
      await db.audit_logs.insert(log);
    } else {
      if (!window.DATA.audit) window.DATA.audit = [];
      window.DATA.audit.push({ ...log, created_at: new Date().toISOString() });
    }
  } catch (err) {
    console.error('No se pudo registrar la auditoría:', err);
  }
};

window.forzarSincronizacionDB = async function() {
  if (!confirm("⚠️ ¿Estás seguro de que querés ELIMINAR todo el catálogo viejo de la nube y subir el nuevo?")) return;
  if (!window.supabaseDB) return alert('No hay conexión con Supabase.');
  
  try {
    const { error: err1 } = await window.supabaseDB.from('stock').delete().neq('id', -1);
    if (err1) throw err1;

    const toInsert = DATA.stock.map(s => {
      const { id, ...rest } = s; 
      return rest;
    });
    
    const { error: err2 } = await window.supabaseDB.from('stock').insert(toInsert);
    if (err2) throw err2;

    alert('✅ Base de datos actualizada.');
  } catch(err) {
    console.error('Error sincronizando:', err);
    alert('Error: ' + (err.message || JSON.stringify(err)));
  }
};
