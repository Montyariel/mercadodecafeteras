// ==========================================
// LOGIN — Mercado de Cafeteras
// ==========================================

function renderLogin() {
  const app = document.getElementById('app');
  // Ocultar sidebar si está visible
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.display = 'none';
  const main = document.getElementById('main-content');
  if (main) main.style.marginLeft = '0';

  app.innerHTML = `
    <div class="login-container" style="
        height:100vh; width:100vw; display:flex; align-items:center; justify-content:center;
        background: radial-gradient(circle at center, #2d1a0e 0%, #0e0b08 100%);">
      <div class="card" style="width:400px; padding:40px; text-align:center; box-shadow:0 0 60px rgba(0,0,0,0.8);">
        <div style="font-size:48px; margin-bottom:10px;">☕</div>
        <h2 class="font-display" style="color:var(--gold-bright); margin-bottom:8px;">Mercado de Cafeteras</h2>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:30px; text-transform:uppercase; letter-spacing:2px;">Gestión Integral Multi-Sede</p>
        
        <div class="form-group" style="text-align:left;">
          <label class="form-label">Usuario</label>
          <input type="text" id="login-user" class="form-input" placeholder="ingeniero_cafe" />
        </div>
        <div class="form-group" style="text-align:left;">
          <label class="form-label">Contraseña</label>
          <input type="password" id="login-pass" class="form-input" placeholder="••••" />
        </div>
        
        <button class="btn btn-primary" style="width:100%; margin-top:10px; padding:12px;" onclick="attemptLogin()">
          Ingresar al Sistema
        </button>
        
        <div style="margin-top:24px; padding-top:20px; border-top:1px solid var(--border-subtle); color:var(--text-muted); font-size:11px;">
          Solo personal autorizado. Si olvidó su clave, contacte al administrador.
        </div>
      </div>
    </div>
  `;
}

async function attemptLogin() {
  const userStr = document.getElementById('login-user').value.toLowerCase().trim();
  const passStr = document.getElementById('login-pass').value;

  // Intentamos login con Supabase Auth primero
  // Supabase requiere email, generamos uno ficticio basado en el usuario
  const fakeEmail = `${userStr}@mercadodecafeteras.com`;
  
  if (SUPABASE_KEY !== 'TU_ANON_KEY_AQUI') {
    try {
      const { data, error } = await supabaseDB.auth.signInWithPassword({
        email: fakeEmail,
        password: passStr,
      });

      if (data.session && data.user) {
        // En un escenario de producción real, roles y branch vendrían de JWT claims o una tabla auth.users vinculada
        const userMetadata = data.user.user_metadata || {};
        const userObj = {
           user: userStr,
           name: userMetadata.name || userStr,
           role: userMetadata.role || 'vendor',
           location: userMetadata.location || 'lanus'
        };
        sessionStorage.setItem('mc_session', JSON.stringify(userObj));
        showToast(`Conectado vía Supabase. Bienvenido.`, 'success');
        window.location.reload();
        return;
      }
    } catch (e) {
      console.warn('Fallo Auth oficial, intentando fallback legacy', e);
    }
  }

  // Fallback Legacy requerido por el usuario momentáneamente
  const user = DATA.users.find(u => u.user === userStr && u.pass === passStr);

  if (user) {
    sessionStorage.setItem('mc_session', JSON.stringify(user));
    showToast(`Bienvenido/a, ${user.name} (Modo Local)`, 'success');
    window.location.reload(); // Recargar para aplicar roles en el init
  } else {
    showToast('❌ Usuario o contraseña incorrectos', 'error');
  }
}

function checkSession() {
  const session = sessionStorage.getItem('mc_session');
  return session ? JSON.parse(session) : null;
}

function logout() {
  sessionStorage.removeItem('mc_session');
  window.location.reload();
}
