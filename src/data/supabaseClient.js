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
} else {
  console.warn('⚠️ La librería de Supabase no se detectó. Trabajando en modo Offline.');
}

// Helper para verificar la conexión inicial
window.testSupabaseConnection = async function() {
  if (!window.supabaseDB || !window.SUPABASE_KEY || window.SUPABASE_KEY.includes('TU_ANON_KEY')) {
    console.warn('⚠️ Supabase no detectado o sin configurar. Funcionalidad Cloud inactiva.');
    return false;
  }
  try {
    const { data, error } = await window.supabaseDB.from('stock').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase conectado correctamente');
    return true;
  } catch (err) {
    console.warn('⚠️ No se pudo conectar a Supabase. Se utilizará el sistema en modo local.', err.message || err);
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
      const { data, error } = await window.supabaseDB.from('repairs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(newRepair) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('repairs').insert([newRepair]);
      if (error) throw error;
      return data;
    },
    async update(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('repairs').update(updates).eq('id', id);
      if (error) throw error;
      return data;
    }
  },

  stock: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('stock').select('*').order('nombre');
      if (error) throw error;
      return data;
    },
    async updateBranch(id, branch, newQty) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('stock').update({ [branch]: newQty }).eq('id', id);
      if (error) throw error;
      return data;
    },
    async update(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('stock').update(updates).eq('id', id);
      if (error) throw error;
      return data;
    },
    async upsert(item) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('stock').upsert([item]);
      if (error) throw error;
      return data;
    },
    async insert(item) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('stock').insert([item]).select();
      if (error) throw error;
      return data;
    }
  },

  sales: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('sales').select('*').order('fecha', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(newSale) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('sales').insert([newSale]);
      if (error) throw error;
      return data;
    }
  },

  transfers: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('transfers').select('*').order('id', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(newTransfer) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('transfers').insert([newTransfer]);
      if (error) throw error;
      return data;
    },
    async update(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('transfers').update(updates).eq('id', id);
      if (error) throw error;
      return data;
    }
  },

  withdrawals: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('cash_withdrawals').select('*').order('id', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(newWithdrawal) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('cash_withdrawals').insert([newWithdrawal]);
      if (error) throw error;
      return data;
    }
  },

  audit_logs: {
    async getAll() {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(log) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('audit_logs').insert([log]);
      if (error) throw error;
      return data;
    }
  },

  cash_shifts: {
    async getActive(sucursal) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('cash_shifts')
        .select('*')
        .eq('sucursal', sucursal)
        .eq('estado', 'abierta')
        .order('opened_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
    async openShift(shiftData) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('cash_shifts').insert([shiftData]);
      if (error) throw error;
      return data;
    },
    async closeShift(id, updates) {
      if (!window.supabaseDB) return null;
      const { data, error } = await window.supabaseDB.from('cash_shifts').update(updates).eq('id', id);
      if (error) throw error;
      return data;
    }
  }
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
    if (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
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
