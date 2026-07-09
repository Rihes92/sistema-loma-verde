// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Capa de autenticación con Supabase Auth
//  Archivo: auth.js  (incluir SIEMPRE ANTES de sync.js, en el
//  portal y en TODOS los módulos)
//
//  Qué hace:
//   1. Guarda la sesión (access_token + refresh_token) en localStorage.
//   2. Renueva el access_token automáticamente antes de que expire.
//   3. Expone LV_AUTH.getValidToken() — sync.js lo usa para firmar
//      cada petición con el token del docente (no con la anon key).
//   4. LV_AUTH.exigirSesion() — redirige a login.html si no hay
//      sesión guardada. Funciona también sin conexión (usa la
//      sesión en caché; Supabase valida cuando vuelva la red).
// ═══════════════════════════════════════════════════════════════

const LV_AUTH = (() => {

  const URL = 'https://loztrkwlttxyfhbkznyu.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvenRya3dsdHR4eWZoYmt6bnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDU5OTQsImV4cCI6MjA5NzAyMTk5NH0.HBBk8NVUVTArqoEsqUWSil3uMIFZfnLFhhlE6M000ao';

  const SESSION_KEY = 'lv_auth_session'; // { access_token, refresh_token, expires_at, user }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      // expires_at llega en segundos epoch; si no llega, calcularlo
      expires_at:    data.expires_at || (Math.floor(Date.now()/1000) + (data.expires_in || 3600)),
      user:          data.user
    }));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('lv_login');
  }

  function usuario()   { const s = getSession(); return s ? s.user : null; }
  function docenteId() { const u = usuario(); return u ? u.id : null; }

  // ── Login contra Supabase Auth ──────────────────────────────
  async function login(email, password) {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || 'Correo o contraseña incorrectos');
    setSession(data);
    return data.user;
  }

  // ── Renovar el token con el refresh_token ───────────────────
  let _refrescando = null; // evita renovaciones simultáneas
  async function refrescar() {
    if (_refrescando) return _refrescando;
    _refrescando = (async () => {
      const s = getSession();
      if (!s || !s.refresh_token) return null;
      try {
        const r = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': KEY },
          body: JSON.stringify({ refresh_token: s.refresh_token })
        });
        if (!r.ok) return null;
        const data = await r.json();
        setSession(data);
        return data.access_token;
      } catch (_) {
        return null; // sin red: se reintenta después, la sesión local sigue
      } finally {
        _refrescando = null;
      }
    })();
    return _refrescando;
  }

  // ── Token válido para firmar peticiones (renueva si hace falta) ─
  async function getValidToken() {
    const s = getSession();
    if (!s || !s.access_token) return null;
    const ahora = Math.floor(Date.now() / 1000);
    // margen de 60s: renovar ANTES de que expire
    if (s.expires_at && s.expires_at - ahora < 60) {
      const nuevo = await refrescar();
      // si no se pudo renovar (ej. sin red), devolver el actual:
      // Supabase responderá 401 y sync.js lo tratará como offline.
      return nuevo || s.access_token;
    }
    return s.access_token;
  }

  function haySesion() {
    const s = getSession();
    return !!(s && s.access_token);
  }

  async function logout() {
    try {
      const t = getSession() && getSession().access_token;
      if (t) await fetch(`${URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + t }
      });
    } catch (_) {}
    clearSession();
    location.href = (location.pathname.includes('/modulos/') ? '../' : '') + 'login.html';
  }

  // ── Guard de sesión: llamar al inicio de cada página ────────
  //  Si no hay sesión guardada, manda a login.html. No valida el
  //  token contra el servidor (para que funcione sin conexión);
  //  si el token ya no sirve, la primera petición real lo detecta.
  function exigirSesion() {
    if (haySesion()) return true;
    const base = location.pathname.includes('/modulos/') ? '../' : '';
    location.replace(base + 'login.html');
    return false;
  }

  return { login, logout, exigirSesion, haySesion, getValidToken, refrescar, usuario, docenteId, URL, KEY };
})();
