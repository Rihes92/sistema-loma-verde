// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Capa de autenticación con Supabase Auth
//  Archivo: auth.js  (incluir ANTES de sync.js en index.html y módulos)
//
//  Qué hace:
//   1. Muestra una pantalla de login (correo + contraseña) si el
//      docente no ha iniciado sesión.
//   2. Usa Supabase Auth (REST, sin librería extra) para validar.
//   3. Guarda el token y el id del docente en localStorage.
//   4. Expone LV_AUTH.usuario() y LV_AUTH.token() para que sync.js
//      pueda filtrar/etiquetar los datos por docente.
//
//  Requisitos previos (una sola vez, en el panel de Supabase):
//   - Authentication → Providers → Email: activado.
//   - Crear un usuario por cada docente (Authentication → Users →
//     Add user), o habilitar registro propio si prefieres.
//   - Correr migration_multitenant.sql (incluido aparte) para que
//     cada tabla tenga docente_id/colegio_id y sus políticas RLS.
// ═══════════════════════════════════════════════════════════════

const LV_AUTH = (() => {

  const URL = 'https://loztrkwlttxyfhbkznyu.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvenRya3dsdHR4eWZoYmt6bnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDU5OTQsImV4cCI6MjA5NzAyMTk5NH0.HBBk8NVUVTArqoEsqUWSil3uMIFZfnLFhhlE6M000ao';

  const SESSION_KEY = 'lv_auth_session'; // { access_token, refresh_token, user }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function usuario() {
    const s = getSession();
    return s ? s.user : null;
  }
  function token() {
    const s = getSession();
    return s ? s.access_token : null;
  }
  function docenteId() {
    const u = usuario();
    return u ? u.id : null; // uuid de Supabase Auth — úsalo como docente_id
  }

  async function login(email, password) {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || 'Credenciales inválidas');
    setSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
    return data.user;
  }

  async function logout() {
    clearSession();
    location.reload();
  }

  // ── Pantalla de login ───────────────────────────────────────
  function mostrarLogin(onOk) {
    const wrap = document.createElement('div');
    wrap.id = 'lv-login-overlay';
    wrap.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:#1e3a8a;
      display:flex;align-items:center;justify-content:center;
      font-family:system-ui,-apple-system,sans-serif;
    `;
    wrap.innerHTML = `
      <form id="lv-login-form" style="background:#fff;padding:32px;border-radius:16px;width:min(90vw,340px);box-shadow:0 10px 40px rgba(0,0,0,.3)">
        <h2 style="margin:0 0 4px;color:#1e3a8a;font-size:1.25rem">Sistema Loma Verde</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:.85rem">Inicia sesión con tu correo institucional</p>
        <input id="lv-login-email" type="email" required placeholder="correo@colegio.edu.co"
          style="width:100%;padding:10px 12px;margin-bottom:10px;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem;box-sizing:border-box">
        <input id="lv-login-pass" type="password" required placeholder="Contraseña"
          style="width:100%;padding:10px 12px;margin-bottom:14px;border:1px solid #d1d5db;border-radius:8px;font-size:.9rem;box-sizing:border-box">
        <button type="submit" style="width:100%;padding:10px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">Entrar</button>
        <p id="lv-login-error" style="color:#dc2626;font-size:.8rem;margin:10px 0 0;min-height:1em"></p>
      </form>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('#lv-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = wrap.querySelector('#lv-login-email').value.trim();
      const pass = wrap.querySelector('#lv-login-pass').value;
      const errEl = wrap.querySelector('#lv-login-error');
      errEl.textContent = '';
      try {
        await login(email, pass);
        wrap.remove();
        onOk();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  // ── Punto de entrada: exige sesión antes de cargar la app ───
  function requerirSesion(onListo) {
    const s = getSession();
    if (s && s.access_token) { onListo(); return; }
    mostrarLogin(onListo);
  }

  return { requerirSesion, login, logout, usuario, token, docenteId };
})();
