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
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.style.cssText = 'background:rgba(255,255,255,.22);cursor:pointer;display:flex;align-items:center;gap:5px';
    pill.title = 'Cambiar de materia';
    pill.innerHTML = `📍 ${materia}`;
    pill.onclick = limpiar;
    const portalBtn = header.querySelector('a.portal-btn');
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
