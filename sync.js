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
    'lv_cursos':         { tabla: 'cursos',      id: 'id' },
    'lv_estudiantes':    { tabla: 'estudiantes', id: 'id' },
    'lv_notas':          { tabla: 'notas',       id: 'id' },
    'lv_as_asistencia':  { tabla: 'asistencia',  id: 'id' },
    'lv_eventos':        { tabla: 'eventos',      id: 'id' },
    'lv_horario':        { tabla: 'horario',      id: 'id' },
    'lv_planeadores':    { tabla: 'lv_planeadores', id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_com_historial':  { tabla: 'lv_comunicados',  id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_examenes':       { tabla: 'lv_examenes',      id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
    'lv_banco':          { tabla: 'lv_banco',          id: 'id', transform: (r) => ({ id: r.id, datos: r }) },
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
      if (cfg.tabla === 'asistencia') {
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
            localMap[r[cfg.id]] = r;
          }
        });
        lsSet(lvKey, Object.values(localMap));
      }
    }
    console.log('[LV Sync] ✅ Descarga completa');
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

  // ── Inicialización ───────────────────────────────────────────
  async function init() {
    // Al cargar: bajar datos remotos primero
    await descargarTodo();

    // Subir pendientes si hay internet
    const p = pendientesGet();
    if (p.length) {
      mostrarBadge(true);
      if (online()) subirPendientes();
    }

    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      console.log('[LV Sync] 🌐 Conexión restaurada — sincronizando...');
      subirPendientes();
    });
    window.addEventListener('offline', () => {
      console.log('[LV Sync] 📵 Sin conexión — modo offline');
    });
  }

  // ── API pública ──────────────────────────────────────────────
  return { init, marcarCambio, subirPendientes, descargarTodo, mostrarBadge, online };

})();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LV_SYNC.init());
} else {
  LV_SYNC.init();
}
