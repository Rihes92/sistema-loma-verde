// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Capa de sincronización con Supabase
//  Archivo: sync.js  (incluir en todos los módulos, DESPUÉS de auth.js)
//
//  v2 — mejoras de seguridad y eficiencia:
//   • Firma cada petición con el token del docente (LV_AUTH), no
//     con la anon key. Compatible con RLS "solo autenticados".
//   • Paginación: ya no hay techo de 1.000 filas por tabla.
//   • Sincronización incremental: solo baja lo que cambió desde la
//     última descarga (filtro por actualizado_en) — antes bajaba
//     TODAS las tablas completas cada 15 segundos.
//   • Subida por lotes: un solo POST por tabla, no uno por registro.
//   • Aviso cuando el almacenamiento local se acerca al límite +
//     exportación de respaldo completo.
// ═══════════════════════════════════════════════════════════════

const LV_SYNC = (() => {

  // URL y KEY viven en UN solo lugar: auth.js (LV_AUTH). auth.js se
  // carga SIEMPRE antes que este archivo en todas las páginas.
  const URL  = LV_AUTH.URL;
  const KEY  = LV_AUTH.KEY;

  // ── Cabeceras: token del docente si hay sesión, si no la anon key.
  //  (El fallback a anon key mantiene la app funcionando mientras no
  //  se haya corrido migracion_seguridad.sql; una vez corrido, la anon
  //  key sola no puede leer ni escribir nada.)
  async function hdr() {
    let bearer = KEY;
    if (typeof LV_AUTH !== 'undefined' && LV_AUTH.haySesion()) {
      const t = await LV_AUTH.getValidToken();
      if (t) bearer = t;
    }
    return { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + bearer };
  }

  // ── Mapeo: clave localStorage → tabla Supabase ──────────────
  //  incremental:false → siempre descarga completa (tablas con
  //  estructura especial o borrados físicos, como horario).
  const MAPA = {
    'lv_cursos':         { tabla: 'cursos',      id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_estudiantes':    { tabla: 'estudiantes', id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_calificaciones': { tabla: 'notas',       id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_as_asistencia':  { tabla: 'asistencia',  id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_eventos':        { tabla: 'eventos',      id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_horario':        { tabla: 'horario',      id: 'id', incremental: false },
    'lv_planeadores':    { tabla: 'lv_planeadores', id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_com_historial':  { tabla: 'lv_comunicados',  id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_examenes':       { tabla: 'lv_examenes',      id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv11_examenes':     { tabla: 'lv11_examenes',    id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_resultados':     { tabla: 'lv_resultados',    id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv11_resultados':   { tabla: 'lv11_resultados',  id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv11_simulacros_ext':{ tabla: 'lv11_simulacros_ext', id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_banco':          { tabla: 'lv_banco',          id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_malla':          { tabla: 'lv_malla',          id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_docentes':       { tabla: 'lv_docentes',       id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_asignaciones':   { tabla: 'lv_asignaciones',   id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_acudientes':     { tabla: 'lv_acudientes',     id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_observador':     { tabla: 'lv_observador',     id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_piar':           { tabla: 'lv_piar',           id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_inclusion_actividades': { tabla: 'lv_inclusion_actividades', id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_boletines':      { tabla: 'lv_boletines',      id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_herramientas':   { tabla: 'lv_herramientas',   id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_institucion':    { tabla: 'lv_institucion',    id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_actividades':    { tabla: 'lv_actividades',    id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
  };

  // ── Sincronización por demanda ──────────────────────────────
  //  Si la página define window.LV_SYNC_TABLAS = ['lv_cursos', ...],
  //  la descarga y el polling solo tocan esas tablas (más
  //  lv_institucion, que es diminuta y se necesita en todas).
  //  Sin declaración (portal, coordinación, login) se sincroniza todo.
  //  Las SUBIDAS (marcarCambio/subirPendientes) nunca se filtran.
  function tablasActivas() {
    const lista = window.LV_SYNC_TABLAS;
    if (!Array.isArray(lista) || !lista.length) return Object.entries(MAPA);
    const set = new Set(lista.concat(['lv_institucion']));
    return Object.entries(MAPA).filter(([k]) => set.has(k));
  }

  // ── Utilidades ───────────────────────────────────────────────
  function online() { return navigator.onLine; }

  function puedeSincronizar() {
    // Sin sesión no se toca la red: con RLS activo daría 401 en todo.
    if (typeof LV_AUTH !== 'undefined' && !LV_AUTH.haySesion()) return false;
    return true;
  }

  // navigator.onLine puede decir "true" aunque no haya internet real.
  // Todo fetch lleva límite de tiempo para no dejar la app colgada.
  function fetchConTimeout(url, opciones, ms) {
    ms = ms || 8000;
    const controlador = new AbortController();
    const id = setTimeout(() => controlador.abort(), ms);
    return fetch(url, { ...(opciones||{}), signal: controlador.signal })
      .finally(() => clearTimeout(id));
  }

  // fetch firmado que renueva el token y reintenta UNA vez si hay 401
  async function fetchAuth(url, opciones, ms) {
    let r = await fetchConTimeout(url, { ...(opciones||{}), headers: { ...(await hdr()), ...((opciones||{}).headers||{}) } }, ms);
    if (r.status === 401 && typeof LV_AUTH !== 'undefined' && LV_AUTH.haySesion()) {
      await LV_AUTH.refrescar();
      r = await fetchConTimeout(url, { ...(opciones||{}), headers: { ...(await hdr()), ...((opciones||{}).headers||{}) } }, ms);
    }
    return r;
  }

  function lsGet(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (_) { avisarAlmacenamientoLleno(); }
  }

  // ── Marcadores de última descarga (sync incremental) ────────
  function ultimaDescargaGet() { return lsGet('lv_sync_ultima') || {}; }
  function ultimaDescargaSet(tabla, iso) {
    const m = ultimaDescargaGet();
    m[tabla] = iso;
    lsSet('lv_sync_ultima', m);
  }

  // Cola de cambios pendientes
  function pendientesGet() { return lsGet('lv_sync_pendientes') || []; }
  function pendientesAdd(item) {
    const p = pendientesGet();
    const idx = p.findIndex(x => x.tabla === item.tabla && x.id === item.id);
    if (idx >= 0) p[idx] = item; else p.push(item);
    lsSet('lv_sync_pendientes', p);
  }
  function pendientesClear(ids) {
    const p = pendientesGet().filter(x => !ids.includes(x._uid));
    lsSet('lv_sync_pendientes', p);
  }

  // ── Subir registros a Supabase (upsert, por lotes) ──────────
  async function upsertLote(tabla, registros) {
    try {
      const r = await fetchAuth(`${URL}/rest/v1/${tabla}`, {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(registros)
      });
      return r.ok;
    } catch (_) { return false; }
  }

  // ── Bajar datos de una tabla, con paginación (sin techo de 1000
  //    filas) y opcionalmente solo lo que cambió desde `desde` ────
  const PAGINA = 1000;
  async function bajar(tabla, desde) {
    const filas = [];
    let inicio = 0;
    while (true) {
      let url = `${URL}/rest/v1/${tabla}?select=*&order=actualizado_en.asc`;
      if (desde) url += `&actualizado_en=gt.${encodeURIComponent(desde)}`;
      try {
        const r = await fetchAuth(url, {
          headers: { 'Range-Unit': 'items', 'Range': `${inicio}-${inicio + PAGINA - 1}` }
        });
        if (!r.ok) {
          // Si el filtro/orden por actualizado_en falla (columna aún no
          // existe en esa tabla), reintentar en modo completo simple.
          if (desde || url.includes('order=')) return bajarSimple(tabla);
          return null;
        }
        const lote = await r.json();
        filas.push(...lote);
        if (lote.length < PAGINA) break;
        inicio += PAGINA;
      } catch (_) { return null; }
    }
    return filas;
  }

  // Descarga completa sin orden ni filtro (fallback para tablas sin
  // columna actualizado_en), también paginada.
  async function bajarSimple(tabla) {
    const filas = [];
    let inicio = 0;
    while (true) {
      try {
        const r = await fetchAuth(`${URL}/rest/v1/${tabla}?select=*`, {
          headers: { 'Range-Unit': 'items', 'Range': `${inicio}-${inicio + PAGINA - 1}` }
        });
        if (!r.ok) return null;
        const lote = await r.json();
        filas.push(...lote);
        if (lote.length < PAGINA) break;
        inicio += PAGINA;
      } catch (_) { return null; }
    }
    return filas;
  }

  // ── Borrar de verdad un registro en Supabase ────────────────
  async function eliminarRegistro(tabla, id) {
    try {
      const r = await fetchAuth(`${URL}/rest/v1/${tabla}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return r.ok;
    } catch (_) { return false; }
  }

  // ── Registrar cambio local para sincronizar después ─────────
  function marcarCambio(lvKey, registro) {
    const cfg = MAPA[lvKey];
    if (!cfg) return;
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const datos = cfg.transform ? cfg.transform(registro) : registro;
    pendientesAdd({ _uid: uid, tabla: cfg.tabla, id: registro[cfg.id], datos: datos });
    if (online() && puedeSincronizar()) subirPendientes();
  }

  // ── Subir todos los cambios pendientes (por lotes por tabla) ─
  let _subiendo = false;
  async function subirPendientes() {
    if (_subiendo || !puedeSincronizar()) return;
    _subiendo = true;
    try {
      const p = pendientesGet();
      if (!p.length) return;

      // agrupar por tabla → un solo POST por tabla
      const porTabla = {};
      p.forEach(item => { (porTabla[item.tabla] = porTabla[item.tabla] || []).push(item); });

      const subidos = [];
      for (const [tabla, items] of Object.entries(porTabla)) {
        const ok = await upsertLote(tabla, items.map(i => i.datos));
        if (ok) { items.forEach(i => subidos.push(i._uid)); continue; }
        // si el lote falla (ej. un registro corrupto), intentar uno a uno
        // para que un solo registro malo no bloquee a los demás
        for (const item of items) {
          if (await upsertLote(tabla, item.datos)) subidos.push(item._uid);
        }
      }
      if (subidos.length) {
        pendientesClear(subidos);
        console.log(`[LV Sync] ✅ ${subidos.length} cambio(s) sincronizado(s)`);
        mostrarBadge(false);
      }
    } finally { _subiendo = false; }
  }

  // ── Descargar datos de Supabase y fusionar con localStorage ─
  async function descargarTodo(forzarCompleta) {
    if (!online() || !puedeSincronizar()) return;
    console.log('[LV Sync] ⬇️ Descargando datos...');
    const marcas = ultimaDescargaGet();

    for (const [lvKey, cfg] of tablasActivas()) {
      const incremental = cfg.incremental !== false && !forzarCompleta;
      const desde = incremental ? marcas[cfg.tabla] : null;
      const remotos = await bajar(cfg.tabla, desde || null);
      if (!remotos) continue;             // error de red: no tocar marcas
      if (!remotos.length) continue;      // nada nuevo

      // Avanzar la marca de última descarga al actualizado_en más
      // reciente RECIBIDO (hora del servidor, no del dispositivo).
      let maxTs = marcas[cfg.tabla] || '';
      remotos.forEach(r => { if (r.actualizado_en && r.actualizado_en > maxTs) maxTs = r.actualizado_en; });
      if (maxTs && cfg.incremental !== false) ultimaDescargaSet(cfg.tabla, maxTs);

      // Fusionar: remoto gana si es más reciente
      if (cfg.tabla === 'horario') {
        // Estructura especial { materia: { dia:{hora:{...}} } }, fusión
        // celda por celda — ver comentarios históricos: nunca reemplazar
        // todo el objeto, y los borrados llegan como _eliminado.
        const local = lsGet(lvKey) || {};
        remotos.forEach(r => {
          if (r.dia == null || r.hora == null) return;
          const mk = r.ctx_materia || '_global';
          if (!local[mk]) local[mk] = {};
          if (r._eliminado) {
            if (local[mk][r.dia]) delete local[mk][r.dia][r.hora];
            return;
          }
          if (!local[mk][r.dia]) local[mk][r.dia] = {};
          local[mk][r.dia][r.hora] = {
            asig: r.materia || '',
            grado: (r.curso || '').split('°-')[0],
            grupo: (r.curso || '').split('°-')[1] || '',
            nota: r.aula || ''
          };
        });
        lsSet(lvKey, local);
      } else if (cfg.tabla === 'asistencia') {
        // asistencia tiene estructura especial {cursoId_fecha: {...}}
        const local = lsGet(lvKey) || {};
        remotos.forEach(r => { local[r.id] = (r.datos || r); });
        lsSet(lvKey, local);
      } else {
        // arrays normales
        let local = lsGet(lvKey) || [];
        if (!Array.isArray(local)) local = [];
        const localMap = {};
        local.forEach(x => { localMap[x[cfg.id]] = x; });
        remotos.forEach(r => {
          const localItem = localMap[r[cfg.id]];
          if (!localItem || new Date(r.actualizado_en) > new Date(localItem.actualizado_en || 0)) {
            const _item = (cfg.transform && r.datos) ? r.datos : r;
            if (_item && _item._eliminado) { delete localMap[_item[cfg.id]]; }
            else localMap[r[cfg.id]] = _item;
          }
        });
        lsSet(lvKey, Object.values(localMap));
      }
    }
    console.log('[LV Sync] ✅ Descarga completa');
    revisarEspacio();

    // Etiquetar cursos/registros viejos sin materia (ver materia-context.js)
    if (typeof window.lvMigrarCursosSinMateria === 'function') {
      window.lvMigrarCursosSinMateria();
    }
  }

  // ── Respaldo completo: exportar / importar todo ──────────────
  function exportarRespaldo() {
    const dump = { _version: 1, _fecha: new Date().toISOString() };
    Object.keys(MAPA).forEach(k => { dump[k] = lsGet(k); });
    const blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL_createObjectURL(blob);
    a.download = `respaldo-loma-verde-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  // (window.URL puede estar tapado por la constante URL de este módulo)
  function URL_createObjectURL(b){ return window.URL.createObjectURL(b); }

  // ── Vigilancia del espacio de almacenamiento local ───────────
  //  localStorage suele tener ~5 MB. Si pasa del 80%, avisar; si un
  //  guardado FALLA por espacio, avisar en rojo — antes fallaba en
  //  silencio y se podían perder datos al cerrar la pestaña.
  const LIMITE_BYTES = 5 * 1024 * 1024;
  function bytesUsados() {
    let total = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); total += k.length + (localStorage.getItem(k) || '').length; } } catch(_){}
    return total * 2; // UTF-16: 2 bytes por carácter
  }
  function revisarEspacio() {
    const uso = bytesUsados() / LIMITE_BYTES;
    if (uso > 0.8) mostrarAvisoEspacio(Math.round(uso * 100), false);
  }
  function avisarAlmacenamientoLleno() { mostrarAvisoEspacio(100, true); }

  function mostrarAvisoEspacio(pct, critico) {
    let el = document.getElementById('lv-espacio-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lv-espacio-aviso';
      el.style.cssText = `position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1001;
        padding:10px 18px;border-radius:12px;font-size:.8rem;font-weight:700;
        box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer;max-width:92vw;text-align:center`;
      el.onclick = () => exportarRespaldo();
      document.body.appendChild(el);
    }
    if (critico) {
      el.style.background = '#fee2e2'; el.style.color = '#991b1b'; el.style.border = '2px solid #dc2626';
      el.textContent = '🛑 Almacenamiento LLENO: los cambios podrían no guardarse en este dispositivo. Toca aquí para descargar un respaldo YA.';
    } else {
      el.style.background = '#fef3c7'; el.style.color = '#92400e'; el.style.border = '1px solid #fcd34d';
      el.textContent = `⚠️ Almacenamiento local al ${pct}%. Toca aquí para descargar un respaldo.`;
    }
  }

  // ── Badge visual de estado ───────────────────────────────────
  function mostrarBadge(pendiente) {
    let badge = document.getElementById('lv-sync-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'lv-sync-badge';
      badge.style.cssText = `
        position:fixed;bottom:16px;left:16px;z-index:999;
        padding:6px 14px;border-radius:999px;font-size:.75rem;font-weight:700;
        box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;transition:opacity .3s;
      `;
      badge.onclick = () => subirPendientes();
      document.body.appendChild(badge);
    }
    if (pendiente) {
      badge.style.background = '#fef3c7';
      badge.style.color = '#92400e';
      badge.style.border = '1px solid #fcd34d';
      badge.textContent = '⏳ Cambios pendientes — toca para sincronizar';
      badge.style.opacity = '1';
    } else {
      badge.style.background = '#d1fae5';
      badge.style.color = '#065f46';
      badge.style.border = '1px solid #6ee7b7';
      badge.textContent = '✅ Sincronizado';
      badge.style.opacity = '1';
      setTimeout(() => { badge.style.opacity = '0'; }, 3000);
    }
  }

  // ── Snapshot para detectar si algo cambió tras una descarga ─
  function snapshotLocal() {
    return tablasActivas().map(([k]) => localStorage.getItem(k) || '').join('||');
  }

  // ── Auto-actualización entre dispositivos ───────────────────
  const POLL_MS = 15000;
  let autoRefreshTimer = null;

  async function chequearYActualizar() {
    if (!online() || document.hidden || !puedeSincronizar()) return;

    // Subir lo propio PRIMERO; nunca descargar con subidas a medias.
    if (pendientesGet().length > 0) {
      await subirPendientes();
      if (pendientesGet().length > 0) return; // reintento en el próximo ciclo
    }

    const antes = snapshotLocal();
    await descargarTodo();
    const despues = snapshotLocal();
    if (antes !== despues) {
      console.log('[LV Sync] 🔔 Hay datos nuevos de otro dispositivo');
      mostrarAvisoActualizacion();
    }
  }

  // ── Aviso de datos nuevos (NO recarga sola — el usuario decide) ─
  function mostrarAvisoActualizacion() {
    let aviso = document.getElementById('lv-update-aviso');
    if (aviso) return;
    aviso = document.createElement('div');
    aviso.id = 'lv-update-aviso';
    aviso.style.cssText = `
      position:fixed;bottom:16px;right:16px;z-index:1000;
      padding:10px 16px;border-radius:999px;font-size:.8rem;font-weight:700;
      background:#1e3a8a;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);
      cursor:pointer;
    `;
    aviso.textContent = '🔄 Hay cambios nuevos — toca para verlos';
    aviso.onclick = () => location.reload();
    document.body.appendChild(aviso);
  }

  function iniciarAutoActualizacion() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(chequearYActualizar, POLL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) chequearYActualizar();
    });
    window.addEventListener('focus', () => chequearYActualizar());
  }

  // ── Migración de cola: pendientes encolados por la versión anterior
  //    para notas/eventos/asistencia iban en formato plano (columna por
  //    columna) y la base los rechazaba con 400. Se envuelven en
  //    {id, datos} para que suban con el formato nuevo.
  function migrarPendientesViejos() {
    const envolver = { 'notas': 1, 'eventos': 1, 'asistencia': 1 };
    const p = pendientesGet();
    let cambio = false;
    p.forEach(it => {
      if (envolver[it.tabla] && it.datos && !('datos' in it.datos)) {
        it.datos = { id: it.id, datos: it.datos };
        cambio = true;
      }
    });
    if (cambio) lsSet('lv_sync_pendientes', p);
  }

  // ── Inicialización ───────────────────────────────────────────
  async function init() {
    migrarPendientesViejos();
    if (!puedeSincronizar()) {
      // sin sesión (ej. pantalla de login): no tocar la red
      revisarEspacio();
      return;
    }
    // Subir primero lo pendiente de sesiones anteriores
    const p = pendientesGet();
    if (p.length) {
      mostrarBadge(true);
      if (online()) await subirPendientes();
    }

    await descargarTodo();

    window.addEventListener('online', () => {
      console.log('[LV Sync] 🌐 Conexión restaurada — sincronizando...');
      subirPendientes();
      chequearYActualizar();
    });
    window.addEventListener('offline', () => {
      console.log('[LV Sync] 📵 Sin conexión — modo offline');
    });

    iniciarAutoActualizacion();
  }

  // ── API pública ──────────────────────────────────────────────
  return { init, marcarCambio, subirPendientes, descargarTodo, mostrarBadge, online,
           chequearYActualizar, eliminarRegistro, exportarRespaldo, revisarEspacio };

})();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LV_SYNC.init());
} else {
  LV_SYNC.init();
}
