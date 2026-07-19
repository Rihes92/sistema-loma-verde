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

  // ── Cambiar la contraseña del usuario actual ────────────────
  async function cambiarPassword(nueva) {
    if (!nueva || nueva.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const t = await getValidToken();
    if (!t) throw new Error('Tu sesión expiró. Cierra sesión y vuelve a entrar.');
    const r = await fetch(`${URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + t },
      body: JSON.stringify({ password: nueva })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || 'No se pudo cambiar la contraseña.');
    return true;
  }

  // ownerId(): el auth uid del docente = el valor que usa RLS (auth.uid()).
  // Es lo mismo que docenteId() aquí, pero con nombre claro para el
  // etiquetado de dueño de la etapa 2 (NO confundir con lv_login.docenteId,
  // que es el id de la tabla lv_docentes vinculado por correo).
  return { login, logout, exigirSesion, haySesion, getValidToken, refrescar, usuario, docenteId, ownerId: docenteId, cambiarPassword, URL, KEY };
})();

// ═══════════════════════════════════════════════════════════════
//  LV_INST — Identidad de la institución (branding configurable)
//  Lee el registro sincronizado desde la tabla `lv_institucion`
//  (ver migracion_instituciones.sql). Si aún no existe, usa los
//  valores actuales como respaldo para no romper nada.
//  Se edita desde Coordinación → Resumen → Institución.
// ═══════════════════════════════════════════════════════════════
const LV_INST = {
  _get() {
    try {
      const a = JSON.parse(localStorage.getItem('lv_institucion')) || [];
      return (Array.isArray(a) ? a.find(x => x && !x._eliminado) : null) || {};
    } catch (_) { return {}; }
  },
  nombre() { return this._get().nombre      || 'Institución Educativa San José de Loma Verde'; },
  corto()  { return this._get().nombreCorto || 'I.E. San José de Loma Verde'; },
  sede()   { return this._get().sede        || 'Sede Principal'; },
  // Campos oficiales del membrete (jul 2026, tomados del membrete real que
  // usa la institución). Editables en Coordinación → Resumen → Institución;
  // estos son solo el respaldo mientras no se guarde nada distinto.
  nit()        { return this._get().nit        || '900.129.463-7'; },
  dane()       { return this._get().dane       || '223001002405'; },
  icfes()      { return this._get().icfes      || '156950'; },
  correo()     { return this._get().correo     || 'iesanjosedelomaverde@semmonteria.gov.co'; },
  secretaria() { return this._get().secretaria || 'Secretaría de Educación Municipal de Montería'; },
  ciudad()     { return this._get().ciudad     || 'Montería – Córdoba'; },
  resolucion() { return this._get().resolucion || ''; },
  // Catálogo de sedes (jul 2026, unificación de cursos): texto separado
  // por comas editable en Coordinación → Resumen → Institución.
  sedes() {
    return String(this._get().sedes || 'Principal, Juana Julia 1, Juana Julia 2, Cristo Es Mi Luz, El Oyeto, Fronteras de Córdoba, María Auxiliadora')
      .split(',').map(s => s.trim()).filter(Boolean);
  }
};

// ═══════════════════════════════════════════════════════════════
//  LV_CURSO — Canonización de grado / grupo / sede (jul 2026).
//  Problema que resuelve: el mismo curso vive escrito de formas
//  distintas ("Noveno (9°)" vs "9"; grupo "903" vs "3"; dirige
//  "9-903"). Estas funciones llevan todo a una forma canónica para
//  COMPARAR, sin renombrar los datos guardados.
//  · gradoCanon('Noveno (9°)') → '9' · gradoCanon('Prejardin') → 'prejardin'
//  · grupoCanon('9','903') → '3' · grupoCanon('11','1101') → '1'
//  · key(c.grado,c.grupo) → '9-3' (etiqueta canónica corta)
//  · sedeCode('Cristo Es Mi Luz') → 'CRI'
//  · etiqueta(curso) → '9-3' (bachillerato) / '3-1 CRI' (primaria con sede)
//  · dirigeCurso(d.dirige, curso) → true si el texto "dirige" cubre el
//    curso (acepta formatos viejos "9-903" y nuevos "9-3" / "1-1 JUA").
//  El espejo SQL vive en migracion_etapa2_fase2b.sql (RLS).
// ═══════════════════════════════════════════════════════════════
const LV_CURSO = {
  _limpia(t) {
    return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[°\s]/g, '').toLowerCase();
  },
  gradoCanon(t) {
    const s = String(t ?? '').trim();
    const par = s.match(/\((\d+)/);          // "Noveno (9°)" → 9
    if (par) return String(parseInt(par[1], 10));
    const num = s.match(/^(\d+)/);           // "9", "9°", "06" → 9 / 6
    if (num) return String(parseInt(num[1], 10));
    return this._limpia(s);                  // "Prejardin", "Jardín" → texto limpio
  },
  grupoCanon(grado, grupo) {
    let g = this._limpia(grupo);
    if (!/^\d+$/.test(g)) return g;          // no numérico ("único") → tal cual
    const gc = this.gradoCanon(grado);
    // formato largo "903"/"1101": quitar el prefijo del grado
    if (/^\d+$/.test(gc) && g.length > gc.length && g.indexOf(gc) === 0) g = g.slice(gc.length);
    g = g.replace(/^0+/, '');
    return g === '' ? '0' : g;
  },
  key(grado, grupo) { return this.gradoCanon(grado) + '-' + this.grupoCanon(grado, grupo); },
  sedeCode(s) {
    const t = String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '');
    return t.slice(0, 3).toUpperCase();
  },
  esPrimaria(grado) {
    const g = this.gradoCanon(grado);
    return ['prejardin', 'jardin', 'transicion', '0', '1', '2', '3', '4', '5'].indexOf(g) !== -1;
  },
  etiqueta(curso) {
    if (!curso) return '';
    const k = this.key(curso.grado, curso.grupo);
    const sc = curso.sede ? this.sedeCode(curso.sede) : '';
    return (sc && this.esPrimaria(curso.grado)) ? k + ' ' + sc : k;
  },
  dirigeTokens(str) {
    return String(str || '').split(',').map(t => t.trim()).filter(Boolean).map(t => {
      const partes = t.split(/\s+/);         // "1-1 JUA" → ["1-1","JUA"]
      const gg = partes[0];
      const i = gg.indexOf('-');
      const grado = i < 0 ? gg : gg.slice(0, i);
      const grupo = i < 0 ? '' : gg.slice(i + 1);
      return { grado: this.gradoCanon(grado), grupo: this.grupoCanon(grado, grupo),
               sede: this.sedeCode(partes[1] || '') };
    });
  },
  dirigeCurso(str, curso) {
    if (!str || !curso) return false;
    const cg = this.gradoCanon(curso.grado);
    const cu = this.grupoCanon(curso.grado, curso.grupo);
    const cs = curso.sede ? this.sedeCode(curso.sede) : '';
    return this.dirigeTokens(str).some(t =>
      t.grado === cg &&
      (!t.grupo || !cu || t.grupo === cu) &&
      (!t.sede || !cs || t.sede === cs));
  }
};

// ═══════════════════════════════════════════════════════════════
//  LV_GEMINI — Clave personal de Gemini de CADA docente.
//  Se guarda SOLO en este dispositivo (localStorage 'lv_gemini_key').
//  NO está en el MAPA de sync.js, así que NUNCA viaja a Supabase ni a
//  otros dispositivos: es privada y local. La usa el botón
//  "Generar con IA" (se envía a /api/generar en el header X-Gemini-Key).
// ═══════════════════════════════════════════════════════════════
const LV_GEMINI = {
  KEY: 'lv_gemini_key',
  get()   { try { return (localStorage.getItem(this.KEY) || '').trim(); } catch (_) { return ''; } },
  set(v)  { try { localStorage.setItem(this.KEY, String(v || '').trim()); } catch (_) {} },
  clear() { try { localStorage.removeItem(this.KEY); } catch (_) {} },
  tiene() { return !!this.get(); }
};
