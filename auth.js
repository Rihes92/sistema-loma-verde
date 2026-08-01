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
  // Docente designado como orientador(a) escolar (módulo de Orientación,
  // ago 2026) — id de lv_docentes. Se asigna en Coordinación → Institución.
  // Vacío = nadie designado todavía (el módulo lo explica en su UI).
  orientadorDocenteId() { return this._get().orientadorDocenteId || ''; },
  // Época de datos (jul 2026, sesión 25g — "forzar limpieza" remota).
  // Coordinación la sube desde su panel; cada equipo la compara contra
  // la última que vio (sync.js) para saber si debe limpiar su espejo
  // local. Ver comentario completo en sync.js → verificarEpocaDatos().
  dataEpoch() { return Number(this._get().dataEpoch) || 0; },
  // Catálogo de sedes (jul 2026, unificación de cursos): texto separado
  // por comas editable en Coordinación → Resumen → Institución.
  // Respaldo (jul 24, sesión 25d): antes traía una lista corta e incluía
  // "María Auxiliadora", que NO es una sede real del colegio. Corregido a
  // las 16 sedes reales que ya usa `coordinacion.html` (constante SEDES,
  // sacada de la información real de docentes/asignaciones importada en
  // la sesión 21) — así todo el que use este respaldo (01-calificaciones,
  // 20-matricula) ve las sedes correctas sin duplicar el catálogo.
  sedes() {
    return String(this._get().sedes || 'Principal, Juana Julia 1, Juana Julia 2, Cristo Es Mi Luz, El Oyeto, Fronteras de Córdoba, La Octavia, La Popa, Mi Porvenir Es Cristo Jesus, San Diego, San Francisco, San Miguel, Verdinal, El Rincon, La Gloria, Carlos Ospina')
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
  // Código corto de sede — normalmente las 3 primeras letras ("Cristo Es Mi
  // Luz" → "CRI"), PERO crece o agrega el número del nombre cuando hace
  // falta para no colisionar con otra sede real. BUG REAL corregido (sesión
  // 30d, reportado por Richard como cruces falsos): la versión anterior
  // SIEMPRE truncaba a 3 letras y DESCARTABA los dígitos — "Juana Julia 1" y
  // "Juana Julia 2" (sedes reales y distintas) daban las dos "JUA", y "San
  // Diego"/"San Francisco"/"San Miguel" las tres daban "SAN". Cualquier
  // comparación por sedeCode (choques de horario, permisos, dirige de
  // grupo) trataba esas sedes como si fueran la misma. Ahora: se agregan los
  // dígitos del nombre al final (distingue "Juana Julia 1/2" sin alargar el
  // código), y si aun así colisiona con otra sede del catálogo real
  // (`LV_INST.sedes()`), se toman más letras hasta ser único (distingue
  // "San Diego/Francisco/Miguel" → SAND/SANF/SANM). Las sedes que NUNCA
  // colisionaron (14 de las 16 reales) devuelven exactamente el mismo
  // código de 3 letras que antes — no rompe nada ya guardado con ellas.
  _sedePartes(s) {
    const t = String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    return { letras: t.replace(/[^A-Z]/g, ''), digitos: (t.match(/[0-9]+/g) || []).join('') };
  },
  sedeCode(s) {
    const miT = String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const { letras, digitos } = this._sedePartes(s);
    if (!letras && !digitos) return '';
    let catalogo = [];
    try { catalogo = (typeof LV_INST !== 'undefined' ? LV_INST.sedes() : []); } catch (_) {}
    const otras = catalogo
      .filter(o => String(o ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase() !== miT)
      .map(o => this._sedePartes(o));
    let len = Math.min(3, letras.length || 1);
    const candidato = () => letras.slice(0, len) + digitos;
    while (len < letras.length && otras.some(o => (o.letras.slice(0, len) + o.digitos) === candidato())) {
      len++;
    }
    return candidato() || miT.slice(0, 3);
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
//  LV_PERM — Permisos centralizados (jul 2026, sesión 25f).
//  Antes, cada módulo recalculaba por su cuenta "¿es mío este curso?"
//  / "¿qué grupos dirijo?" / "¿soy coordinación?" — la MISMA lógica
//  copiada y pegada en index.html, 01, 10, 11, 12, 13, 14, 18, 20 (a
//  veces con nombres de variable distintos: esAdmin / ES_COORD). Cada
//  fuga de privacidad de las auditorías (sesiones 3, 10, 24) tuvo que
//  corregirse una vez POR ARCHIVO porque no había una sola fuente de
//  verdad. LV_PERM es esa fuente única — vive en auth.js (como
//  LV_CURSO/LV_INST) para no depender del helper `lsRead` de cada
//  módulo: lee `localStorage` directo, igual que LV_CURSO.
//  Funciones PURAS: reciben los arrays (cursos/asignaciones/docentes)
//  que cada módulo ya tiene en memoria — no asumen nombres de
//  variable ni claves de sync particulares. Si no se pasa el array,
//  cae a leer `localStorage` directo (útil en páginas simples).
//  OJO — alcance de este cambio (sesión 25f): se migró la lógica que
//  YA EXISTÍA en cada módulo (mismo comportamiento, sin duplicar
//  código). NO se tocó el mecanismo más débil de `LV_CTX.filtrar`
//  que usan hoy 03-examenes, 04-examenes-11 y 06-comunicados (filtra
//  por CONTEXTO de navegación, no por asignación real) — eso es un
//  hueco de privacidad ya documentado aparte, no se resolvió aquí
//  para no mezclar un refactor con un cambio de comportamiento.
// ═══════════════════════════════════════════════════════════════
const LV_PERM = {
  _ls(clave) { try { return JSON.parse(localStorage.getItem(clave)) || []; } catch (_) { return []; } },
  login() { try { return JSON.parse(localStorage.getItem('lv_login')) || null; } catch (_) { return null; } },
  esAdmin() { const l = this.login(); return !!(l && l.esAdmin); },
  // Alias semántico (mismo booleano) — para los módulos "solo coordinación/
  // rector" (18-permisos, 20-matricula) que antes lo llamaban ES_COORD.
  esCoordinacion() { return this.esAdmin(); },
  nombre() { const l = this.login(); return l ? (l.esAdmin ? 'Administrador' : (l.nombre || 'Docente')) : 'Docente'; },
  miDocente(docentes) {
    const l = this.login(); if (!l) return null;
    return (docentes || this._ls('lv_docentes')).find(d => d.id === l.docenteId) || null;
  },
  misAsignaciones(asignaciones) {
    const l = this.login(); if (!l) return [];
    return (asignaciones || this._ls('lv_asignaciones')).filter(a => a.docenteId === l.docenteId);
  },
  // Comodín: área "Primaria" o materia "Todas las materias" en cualquier asignación.
  accesoTotal(asignaciones) {
    if (this.esAdmin()) return true;
    return this.misAsignaciones(asignaciones).some(a => a.area === 'Primaria' || a.materia === 'Todas las materias');
  },
  materiasPermitidas(asignaciones) {
    const set = new Set();
    this.misAsignaciones(asignaciones).forEach(a => { if (a.materia) set.add(a.materia); });
    return set;
  },
  permiteMateria(materia, asignaciones) {
    if (this.accesoTotal(asignaciones)) return true;
    return this.materiasPermitidas(asignaciones).has(materia);
  },
  // ¿Es mío este curso? — por asignación de materia, por el comodín (acotado por
  // grado/grupo/sede si la asignación los trae — sesión 27, importador de Asignación
  // Académica), o por dirigir el grupo.
  // OJO (hallazgo sesión 26k, cerrado en sesión 27): antes, CUALQUIER asignación con
  // area==='Primaria' o materia==='Todas las materias' daba acceso TOTAL sin mirar el
  // curso — un docente de primaria veía TODO el colegio. Ahora, si la asignación trae
  // grado (las nuevas del importador SIEMPRE lo traen), el comodín solo cubre ESE
  // grado-grupo-sede específico. Las asignaciones viejas sin grado (de antes de esta
  // sesión, aún no reimportadas) siguen dando acceso total — no se puede acotar lo que
  // el registro no dice; se corrige solo al reimportar/editar esa asignación.
  cursoEsMio(curso, asignaciones, docentes) {
    if (this.esAdmin()) return true;
    if (!curso) return false;
    const mias = this.misAsignaciones(asignaciones);
    // "Todas las materias" es el marcador del comodín, no una materia real — si el curso
    // trae ese valor (típico de primaria) NUNCA debe calzar aquí por simple igualdad de
    // texto (eso saltaría el acotado por grado/grupo/sede de abajo). Siempre pasa por
    // _comodinCubreCurso.
    if (curso.materia && curso.materia !== 'Todas las materias' && mias.some(a => a.materia === curso.materia)) return true;
    const comodines = mias.filter(a => a.area === 'Primaria' || a.materia === 'Todas las materias');
    if (comodines.some(a => this._comodinCubreCurso(a, curso))) return true;
    const d = this.miDocente(docentes);
    return !!(d && d.dirige && typeof LV_CURSO !== 'undefined' && LV_CURSO.dirigeCurso(d.dirige, curso));
  },
  _comodinCubreCurso(asig, curso) {
    if (!asig.grado) return true; // comodín viejo sin datos precisos: acceso total (compat.)
    if (typeof LV_CURSO === 'undefined') return true;
    if (LV_CURSO.gradoCanon(asig.grado) !== LV_CURSO.gradoCanon(curso.grado)) return false;
    if (asig.grupo && curso.grupo && LV_CURSO.grupoCanon(asig.grado, asig.grupo) !== LV_CURSO.grupoCanon(curso.grado, curso.grupo)) return false;
    if (asig.sede && curso.sede && LV_CURSO.sedeCode(asig.sede) !== LV_CURSO.sedeCode(curso.sede)) return false;
    return true;
  },
  // Cursos que dirijo (o TODOS si soy admin) — Observador/Director/Boletines/Analítica.
  gruposDirigidos(cursos, docentes) {
    if (this.esAdmin()) return cursos || [];
    const d = this.miDocente(docentes);
    if (!d || !d.dirige) return [];
    return (cursos || []).filter(c => typeof LV_CURSO !== 'undefined' && LV_CURSO.dirigeCurso(d.dirige, c));
  },
  esDirector(cursos, docentes) {
    return this.esAdmin() || this.gruposDirigidos(cursos, docentes).length > 0;
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
