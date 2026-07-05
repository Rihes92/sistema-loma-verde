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

// ── Migración única: cursos creados antes de que existiera el campo
//    'materia' quedaban sin etiqueta, y por diseño (ver filtrar() abajo)
//    los registros sin materia se mostraban en TODAS las materias para
//    no perder datos viejos. Eso causaba que borrar un curso "viejo"
//    desde cualquier materia lo borrara de todas — porque en realidad
//    era el mismo registro compartido. Aquí se etiquetan una sola vez
//    con 'Sociales' (la materia original de la app), para que queden
//    aislados como cualquier otro curso.
(function migrarCursosSinMateria() {
  try {
    if (localStorage.getItem('lv_migracion_materia_v1') === 'ok') return;
    const cursos = JSON.parse(localStorage.getItem('lv_cursos') || 'null');
    const migrados = [];
    if (Array.isArray(cursos) && cursos.length) {
      cursos.forEach(c => {
        let cambiado = false;
        if (!c.materia) { c.materia = 'Sociales'; cambiado = true; }
        if (!c.area) { c.area = 'Ciencias Sociales'; cambiado = true; }
        if (cambiado) migrados.push(c);
      });
      if (migrados.length) localStorage.setItem('lv_cursos', JSON.stringify(cursos));
    }
    localStorage.setItem('lv_migracion_materia_v1', 'ok');

    // Reenviar a Supabase los cursos migrados, para que la etiqueta
    // 'materia' quede también en la nube y no se pierda al sincronizar
    // con otro dispositivo. sync.js carga justo después de este script,
    // así que se espera a que LV_SYNC exista.
    if (migrados.length) {
      const reintentar = () => {
        if (typeof LV_SYNC !== 'undefined') {
          migrados.forEach(c => LV_SYNC.marcarCambio('lv_cursos', c));
        } else {
          setTimeout(reintentar, 300);
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', reintentar);
      } else {
        reintentar();
      }
    }
  } catch (_) {}
})();

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
