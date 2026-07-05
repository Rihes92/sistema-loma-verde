// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Capa de sincronización con Supabase
//  Archivo: sync.js  (incluir en todos los módulos y en index.html)
// ═══════════════════════════════════════════════════════════════

const LV_SYNC = (() => {

  const URL  = 'https://loztrkwlttxyfhbkznyu.supabase.co';
  const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvenRya3dsdHR4eWZoYmt6bnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDU5OTQsImV4cCI6MjA5NzAyMTk5NH0.HBBk8NVUVTArqoEsqUWSil3uMIFZfnLFhhlE6M000ao';
  const HDR  = { 'Content-Type': 'application/json', 'apikey': KEY, 'Authorization': 'Bearer ' + KEY };

  // ── Mapeo: clave localStorage → tabla Supabase ──────────────
  const MAPA = {
    'lv_cursos':         { tabla: 'cursos',      id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_estudiantes':    { tabla: 'estudiantes', id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_calificaciones': { tabla: 'notas',       id: 'id' },
    'lv_as_asistencia':  { tabla: 'asistencia',  id: 'id' },
    'lv_eventos':        { tabla: 'eventos',      id: 'id' },
    'lv_horario':        { tabla: 'horario',      id: 'id', transformDown: (rows) => {
      const obj = {};
      rows.forEach(r => {
        if(r.dia == null || r.hora == null || r._eliminado) return;
        if(!obj[r.dia]) obj[r.dia] = {};
        obj[r.dia][r.hora] = { asig: r.materia||'', grado: (r.curso||'').split('°-')[0], grupo: (r.curso||'').split('°-')[1]||'', nota: r.aula||'' };
      });
      return obj;
    }},
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
  };

  // ── Utilidades ───────────────────────────────────────────────
  function online() { return navigator.onLine; }

  function lsGet(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
  }

  // Cola de cambios pendientes
  function pendientesGet() { return lsGet('lv_sync_pendientes') || []; }
  function pendientesAdd(item) {
    const p = pendientesGet();
    // evitar duplicados por id+tabla
    const idx = p.findIndex(x => x.tabla === item.tabla && x.id === item.id);
    if (idx >= 0) p[idx] = item; else p.push(item);
    lsSet('lv_sync_pendientes', p);
  }
  function pendientesClear(ids) {
    const p = pendientesGet().filter(x => !ids.includes(x._uid));
    lsSet('lv_sync_pendientes', p);
  }

  // ── Subir un registro a Supabase (upsert) ───────────────────
  async function upsert(tabla, registro) {
    const r = await fetch(`${URL}/rest/v1/${tabla}`, {
      method: 'POST',
      headers: { ...HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(registro)
    });
    return r.ok;
  }

  // ── Bajar todos los datos de una tabla ──────────────────────
  async function bajar(tabla) {
    const r = await fetch(`${URL}/rest/v1/${tabla}?select=*`, { headers: HDR });
    if (!r.ok) return null;
    return await r.json();
  }

  // ── Borrar de verdad un registro en Supabase (no solo marcarlo) ─
  //  Importante para tablas como 'horario' donde el id se reutiliza
  //  (mismo día+bloque). Si solo se marca _eliminado, esa marca vieja
  //  puede borrar una celda nueva que reutilice el mismo id.
  async function eliminarRegistro(tabla, id) {
    try {
      const r = await fetch(`${URL}/rest/v1/${tabla}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: HDR
      });
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
    if (online()) subirPendientes();
  }

  // ── Subir todos los cambios pendientes ──────────────────────
  async function subirPendientes() {
    const p = pendientesGet();
    if (!p.length) return;
    const subidos = [];
    for (const item of p) {
      const ok = await upsert(item.tabla, item.datos);
      if (ok) subidos.push(item._uid);
    }
    if (subidos.length) {
      pendientesClear(subidos);
      console.log(`[LV Sync] ✅ ${subidos.length} cambio(s) sincronizado(s)`);
      mostrarBadge(false);
    }
  }

  // ── Descargar datos de Supabase y fusionar con localStorage ─
  async function descargarTodo() {
    if (!online()) return;
    console.log('[LV Sync] ⬇️ Descargando datos...');
    for (const [lvKey, cfg] of Object.entries(MAPA)) {
      const remotos = await bajar(cfg.tabla);
      if (!remotos || !remotos.length) continue;

      // Fusionar: remoto gana si es más reciente
      if (cfg.tabla === 'horario') {
        // Estructura especial { materia: { dia:{hora:{...}} } }. Cada
        // materia tiene su propio sub-horario totalmente independiente
        // (ctx_materia en la fila de Supabase), para que borrar/agregar
        // clases en una materia nunca afecte a otra. IMPORTANTE: fusionar
        // celda por celda, nunca reemplazar todo el objeto — si una
        // celda que acabas de agregar aún no terminó de subirse a
        // Supabase, un reemplazo total la borraría de la vista.
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
        remotos.forEach(r => { local[r.id] = r; });
        lsSet(lvKey, local);
      } else {
        // arrays normales
        let local = lsGet(lvKey) || [];
        if (!Array.isArray(local)) local = [];
        const localMap = {};
        local.forEach(x => { localMap[x[cfg.id]] = x; });
        remotos.forEach(r => {
          const localItem = localMap[r[cfg.id]];
          // remoto gana si no existe local o si remoto es más reciente
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

    // Con los cursos ya frescos en localStorage, etiquetar los que
    // todavía no tengan materia (ver materia-context.js). Se hace aquí,
    // justo después de la descarga real, para evitar la condición de
    // carrera donde la migración corría antes de que llegaran los datos.
    if (typeof window.lvMigrarCursosSinMateria === 'function') {
      window.lvMigrarCursosSinMateria();
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
    return Object.keys(MAPA).map(k => localStorage.getItem(k) || '').join('||');
  }

  // ── Auto-actualización entre dispositivos ───────────────────
  //  Cada POLL_MS revisa Supabase en segundo plano. Si algo cambió
  //  respecto a lo que ya se ve en pantalla, muestra un aviso — NO
  //  recarga sola, para no interrumpir una edición en curso.
  const POLL_MS = 15000;
  let autoRefreshTimer = null;

  async function chequearYActualizar() {
    if (!online() || document.hidden) return;

    // Si hay cambios locales sin confirmar, intenta subirlos PRIMERO.
    // Nunca descargues mientras algo tuyo está a medio subir: eso es
    // lo que causaba que un cambio recién hecho se "borrara" al
    // fusionarse con una versión de Supabase que aún no lo tenía.
    if (pendientesGet().length > 0) {
      await subirPendientes();
      if (pendientesGet().length > 0) {
        // Sigue habiendo pendientes (falló la subida) — no descargues
        // esta vez para no arriesgar el dato local; se reintentará
        // en el próximo ciclo.
        return;
      }
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
  //  Recargar automáticamente en medio de una edición es lo que
  //  causaba que se "borraran" celdas recién agregadas. Ahora solo
  //  se avisa; tú tocas el aviso cuando te convenga.
  function mostrarAvisoActualizacion() {
    let aviso = document.getElementById('lv-update-aviso');
    if (aviso) return; // ya está visible
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

    // Al volver a la pestaña/app (ej. cambias de iPad a Mac) revisa al instante
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) chequearYActualizar();
    });
    window.addEventListener('focus', () => chequearYActualizar());
  }

  // ── Inicialización ───────────────────────────────────────────
  async function init() {
    // IMPORTANTE: subir primero lo que quedó pendiente de una sesión
    // anterior (por ejemplo, si cerraste la app antes de que terminara
    // de subir). Si se descarga antes de subir, un cambio propio que
    // aún no llegó a Supabase puede quedar tapado al fusionar.
    const p = pendientesGet();
    if (p.length) {
      mostrarBadge(true);
      if (online()) await subirPendientes();
    }

    // Ahora sí, bajar datos remotos (ya con lo propio a salvo)
    await descargarTodo();

    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      console.log('[LV Sync] 🌐 Conexión restaurada — sincronizando...');
      subirPendientes();
      chequearYActualizar();
    });
    window.addEventListener('offline', () => {
      console.log('[LV Sync] 📵 Sin conexión — modo offline');
    });

    // Activar revisión periódica + al volver a la pestaña
    iniciarAutoActualizacion();
  }

  // ── API pública ──────────────────────────────────────────────
  return { init, marcarCambio, subirPendientes, descargarTodo, mostrarBadge, online, chequearYActualizar, eliminarRegistro };

})();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LV_SYNC.init());
} else {
  LV_SYNC.init();
}
