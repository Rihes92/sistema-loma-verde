// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Contexto de Área/Materia
//  Archivo: materia-context.js (incluir en cada módulo, ANTES del
//  script propio del módulo, junto a sync.js)
//
//  Qué hace:
//   - Lee ?area=&materia= de la URL (llegan desde el portal al
//     entrar por un área/materia específica).
//   - Si no vienen en la URL, recuerda la última materia usada en
//     esta pestaña (sessionStorage), para que al cambiar de tab
//     dentro del mismo módulo no se pierda el contexto.
//   - Expone LV_CTX.area / LV_CTX.materia (pueden ser null si el
//     docente entró directo sin pasar por un área — comportamiento
//     de antes, sigue funcionando igual).
//   - Pinta un "pill" en el header con la materia activa, con un
//     botón para volver al portal y cambiarla.
// ═══════════════════════════════════════════════════════════════

// ── Migración de datos sin materia: cualquier registro (curso, planeador,
//    examen, pregunta del banco...) creado antes de que existiera el campo
//    'materia' queda sin etiqueta, y por diseño (ver filtrar() abajo) un
//    registro sin materia se muestra en TODAS las materias para no perder
//    datos viejos. Eso causa que borrar algo "viejo" desde cualquier
//    materia lo borre de todas — porque en realidad es el mismo registro
//    compartido. Aquí se etiquetan con 'Sociales' (la materia original de
//    la app), para que queden aislados como cualquier registro nuevo.
//
//    Cubre TODAS las claves de localStorage que ahora usan materia, no
//    solo cursos — el mismo problema se repite en cada una si se dejan sin
//    migrar (planeadores, exámenes 6°-10°, simulacros 11°, banco de
//    preguntas de ambos).
//
//    IMPORTANTE: esto NO corre solo una vez con un flag — corre cada vez
//    que sync.js termina de bajar datos frescos de Supabase (ver sync.js,
//    que llama a window.lvMigrarMateria() después de cada descargarTodo()).
//    Es seguro repetirlo: solo toca registros que aún no tengan materia. La
//    versión anterior marcaba "ya se hizo" apenas cargaba la página, ANTES
//    de que la descarga asíncrona de Supabase hubiera llegado — por eso
//    nunca llegó a etiquetar nada realmente en algunos dispositivos.
const LV_MIGRAR_CLAVES = [
  { lsKey: 'lv_cursos',      syncKey: 'lv_cursos',      area: true  },
  { lsKey: 'lv_planeadores', syncKey: 'lv_planeadores', area: false },
  { lsKey: 'lv_examenes',    syncKey: 'lv_examenes',     area: false },
  { lsKey: 'lv11_examenes',  syncKey: 'lv11_examenes',   area: false },
  { lsKey: 'lv_banco',       syncKey: 'lv_banco',        area: false },
  { lsKey: 'lv11_banco',     syncKey: null,              area: false },
];

window.lvMigrarMateria = function () {
  try {
    LV_MIGRAR_CLAVES.forEach(({ lsKey, syncKey, area }) => {
      const arr = JSON.parse(localStorage.getItem(lsKey) || 'null');
      if (!Array.isArray(arr) || !arr.length) return;
      const migrados = [];
      arr.forEach(c => {
        let cambiado = false;
        if (!c.materia) { c.materia = 'Sociales'; cambiado = true; }
        if (area && !c.area) { c.area = 'Ciencias Sociales'; cambiado = true; }
        if (cambiado) migrados.push(c);
      });
      if (!migrados.length) return;
      localStorage.setItem(lsKey, JSON.stringify(arr));
      // Reenviar a Supabase lo migrado, para que la etiqueta quede también
      // en la nube y no se pierda al sincronizar con otro dispositivo.
      if (syncKey && typeof LV_SYNC !== 'undefined') {
        migrados.forEach(c => LV_SYNC.marcarCambio(syncKey, c));
      }
    });
  } catch (_) {}
};
// Alias por compatibilidad con el nombre anterior.
window.lvMigrarCursosSinMateria = window.lvMigrarMateria;

const LV_CTX = (() => {
  const params = new URLSearchParams(location.search);
  let area = params.get('area');
  let materia = params.get('materia');

  if (area && materia) {
    try {
      sessionStorage.setItem('lv_ctx_area', area);
      sessionStorage.setItem('lv_ctx_materia', materia);
    } catch (_) {}
  } else {
    try {
      area = sessionStorage.getItem('lv_ctx_area') || null;
      materia = sessionStorage.getItem('lv_ctx_materia') || null;
    } catch (_) {}
  }

  function limpiar() {
    try {
      sessionStorage.removeItem('lv_ctx_area');
      sessionStorage.removeItem('lv_ctx_materia');
    } catch (_) {}
    location.href = '../index.html';
  }

  function pintarPill() {
    if (!materia) return; // sin contexto: no se muestra nada (modo clásico)
    const header = document.querySelector('header.appbar');
    if (!header) return;
    const portalBtn = header.querySelector('a.portal-btn');

    // Botón "Atrás": vuelve a la página de módulos de esta materia
    // (materia-hub.html), sin pasar por el portal general. Así se puede
    // ir y venir entre módulos de la misma materia sin perder el contexto.
    const atras = document.createElement('a');
    atras.href = `../materia-hub.html?area=${encodeURIComponent(area || '')}&materia=${encodeURIComponent(materia)}`;
    atras.className = 'portal-btn';
    atras.title = 'Volver a los módulos de esta materia';
    atras.style.cssText = 'margin-left:0;order:-1';
    atras.innerHTML = '← Atrás';
    header.insertBefore(atras, header.firstChild);

    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.style.cssText = 'background:rgba(255,255,255,.22);cursor:pointer;display:flex;align-items:center;gap:5px';
    pill.title = 'Cambiar de materia';
    pill.innerHTML = `📍 ${materia}`;
    pill.onclick = limpiar;
    if (portalBtn) header.insertBefore(pill, portalBtn);
    else header.appendChild(pill);
  }

  // Filtra un arreglo de registros por la materia activa. Si no hay
  // contexto (materia === null) o el registro no tiene el campo
  // 'materia', lo deja pasar — así los datos creados antes de tener
  // áreas siguen viéndose (no se pierden ni se ocultan).
  function filtrar(lista, campo = 'materia') {
    if (!materia) return lista;
    return lista.filter(x => !x[campo] || x[campo] === materia);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pintarPill);
  } else {
    pintarPill();
  }

  return { area, materia, filtrar, limpiar };
})();
