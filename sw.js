// ═══════════════════════════════════════════════════════════════
//  SABIE — Service Worker v5 (transaccional y auto-reparable)
//
//  Principios (aprendidos de las fallas v36-v63):
//  1. NUNCA borrar la caché anterior hasta que la nueva esté COMPLETA
//     (antes: una instalación a medias por wifi débil activaba igual
//     y destruía la caché buena → dispositivos sin modo offline).
//  2. Todo se guarda como blob con status 200 limpio (Safari rechaza
//     respuestas marcadas como redirigidas o basadas en streams).
//  3. Auto-reparación: al activar, en cada navegación (máx. 1 vez
//     cada 10 min) y a pedido, se completan los archivos faltantes —
//     primero rescatándolos de cachés viejas (gratis), luego de red.
//  4. Recursos: caché primero (instantáneo offline) con refresco en
//     segundo plano. Navegaciones: red primero (3.5 s) → caché →
//     portal. Las versiones nuevas llegan porque sw.js es no-cache
//     y el navegador lo re-lee en cada visita.
//  5. La página puede preguntar el estado (postMessage 'estado') →
//     indicador "Listo para trabajar sin internet" en el portal y
//     página diagnostico.html.
// ═══════════════════════════════════════════════════════════════

const CACHE = 'loma-verde-v74';

const ARCHIVOS = [
  './',
  './index.html',
  './login.html',
  './recuperar.html',
  './diagnostico.html',
  './auth.js',
  './sync.js',
  './lv-tema.css',
  './materia-context.js',
  './materia-hub.html',
  './coordinacion.html',
  './modulos/01-calificaciones.html',
  './modulos/02-planeador.html',
  './modulos/03-examenes.html',
  './modulos/04-examenes-11.html',
  './modulos/05-asistencia.html',
  './modulos/06-comunicados.html',
  './modulos/07-horario.html',
  './modulos/08-eventos.html',
  './modulos/09-acudientes.html',
  './modulos/10-observador.html',
  './modulos/11-inclusion.html',
  './modulos/inclusion-catalogo.js',
  './modulos/12-director.html',
  './modulos/13-boletines.html',
  './modulos/14-analitica.html',
  './modulos/15-herramientas.html',
  './modulos/16-actividades.html',
  './modulos/17-centros-interes.html',
  './modulos/18-permisos.html',
  './modulos/19-examen-final.html',
  './modulos/herramientas/herramientas-comun.js',
  './modulos/herramientas/test-lectura.html',
  './modulos/herramientas/calculo-mental.html',
  './modulos/herramientas/rubricas.html',
  './modulos/herramientas/escritura.html',
  './modulos/herramientas/indagacion.html',
  './modulos/herramientas/reading-aloud.html',
  './modulos/herramientas/sociograma.html',
  './modulos/herramientas/fisica.html',
  './modulos/herramientas/tiquete.html',
  './modulos/herramientas/tabla-periodica.html',
  './modulos/herramientas/ortografia.html',
  './modulos/herramientas/colombia.html',
  './modulos/herramientas/cuerpo-humano.html',
  './Logo/sabie.svg',
  './Logo/sabie-icono.png',
  './Logo/sabie-full.jpg',
  './Logo/sabie-192.png',
  './Logo/sabie-512.png',
  './Logo/logo.jpg',
  './Logo/icon-192.png',
  './Logo/icon-512.png',
  './manifest.json',
  './lib/xlsx.full.min.js',
  './lib/chart.umd.js',
];

// ── Utilidades ──────────────────────────────────────────────────

// Respuesta "limpia": cuerpo como blob, status 200, sin bandera
// redirected — el único formato que TODOS los navegadores aceptan
// guardar y servir desde caché (Safari incluido).
async function respuestaLimpia(resp) {
  const cuerpo = await resp.blob();
  const headers = new Headers();
  const ct = resp.headers.get('Content-Type');
  if (ct) headers.set('Content-Type', ct);
  return new Response(cuerpo, { status: 200, headers });
}

function fetchConTimeout(request, ms) {
  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), ms);
  return fetch(request, { signal: controlador.signal }).finally(() => clearTimeout(id));
}

function absoluta(ruta) {
  return new URL(ruta, self.registration.scope).href;
}

// ── Precarga transaccional y auto-reparable ─────────────────────

let _completando = null;
function completarPrecache() {
  if (_completando) return _completando;
  _completando = (async () => {
    const cache = await caches.open(CACHE);
    let listos = 0; const faltan = [];
    for (const archivo of ARCHIVOS) {
      if (await cache.match(archivo)) { listos++; continue; }
      // 1) rescatar de cualquier caché anterior (instantáneo, sin red);
      //    se reconstruye como respuesta limpia por si la entrada vieja
      //    estaba envenenada (redirected de la época de cleanUrls).
      try {
        const viejo = await caches.match(absoluta(archivo));
        if (viejo && viejo.ok) {
          await cache.put(archivo, await respuestaLimpia(viejo.clone()));
          listos++; continue;
        }
      } catch (_) {}
      // 2) red
      try {
        const r = await fetch(archivo, { cache: 'no-cache' });
        if (r && r.ok) { await cache.put(archivo, await respuestaLimpia(r)); listos++; continue; }
      } catch (_) {}
      faltan.push(archivo);
    }
    return { listos, faltan };
  })().finally(() => { _completando = null; });
  return _completando;
}

async function estadoPrecache() {
  const cache = await caches.open(CACHE);
  let listos = 0; const faltan = [];
  for (const archivo of ARCHIVOS) {
    if (await cache.match(archivo)) listos++; else faltan.push(archivo);
  }
  return { version: CACHE, total: ARCHIVOS.length, listos, faltan };
}

// mantenimiento oportunista: máximo una vez cada 10 minutos
let _ultimoMantenimiento = 0;
function mantenimiento() {
  const t = Date.now();
  if (t - _ultimoMantenimiento < 10 * 60 * 1000) return;
  _ultimoMantenimiento = t;
  completarPrecache();
}

// ── Instalación / activación ────────────────────────────────────

self.addEventListener('install', e => {
  e.waitUntil(completarPrecache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Solo se eliminan las cachés viejas cuando la nueva está COMPLETA.
    // Si quedó a medias (wifi débil), las viejas siguen sirviendo como
    // respaldo (buscarEnCache busca en todas) y la reparación continúa.
    const { faltan } = await estadoPrecache();
    if (!faltan.length) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    } else {
      completarPrecache(); // seguir intentando en segundo plano
    }
    await self.clients.claim();
  })());
});

// ── Búsqueda en caché con alias (en TODAS las cachés) ───────────

async function buscarEnCache(request) {
  const exacto = await caches.match(request, { ignoreSearch: true });
  if (exacto) return exacto;
  let url; try { url = new URL(request.url); } catch (_) { return Response.error(); }
  const ruta = url.pathname;
  const candidatos = [];
  if (ruta.endsWith('/')) candidatos.push(ruta + 'index.html');
  else if (ruta.endsWith('.html')) candidatos.push(ruta.slice(0, -5));
  else if (!/\.[a-z0-9]+$/i.test(ruta)) { candidatos.push(ruta + '.html'); candidatos.push(ruta + '/index.html'); }
  for (const c of candidatos) {
    const hit = await caches.match(new URL(c, url.origin).href, { ignoreSearch: true });
    if (hit) return hit;
  }
  if (request.mode === 'navigate') {
    const portal = await caches.match(absoluta('./index.html'));
    if (portal) return portal;
  }
  return Response.error();
}

// ── Estrategias de red ──────────────────────────────────────────

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  let u; try { u = new URL(e.request.url); } catch (_) { return; }
  if (u.origin !== self.location.origin) return;   // supabase, youtube, etc.
  if (u.pathname.endsWith('/sw.js')) return;        // lo gestiona el navegador

  if (e.request.mode === 'navigate') {
    // PÁGINAS: red primero (para recibir versiones nuevas), caché si falla.
    e.respondWith((async () => {
      try {
        const resp = await fetchConTimeout(e.request, 3500);
        if (resp && resp.ok) {
          const limpia = await respuestaLimpia(resp);
          const cache = await caches.open(CACHE);
          cache.put(e.request, limpia.clone()).catch(() => {});
          mantenimiento();
          return limpia;
        }
        const enCache = await buscarEnCache(e.request);
        return (enCache && enCache.type !== 'error') ? enCache : resp;
      } catch (_) {
        return buscarEnCache(e.request);
      }
    })());
    return;
  }

  // RECURSOS (js/css/imágenes): caché primero — instantáneo y a prueba
  // de cortes — con refresco silencioso en segundo plano.
  e.respondWith((async () => {
    const enCache = await buscarEnCache(e.request);
    if (enCache && enCache.type !== 'error') {
      (async () => {
        try {
          const r = await fetch(e.request);
          if (r && r.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(e.request, await respuestaLimpia(r));
          }
        } catch (_) {}
      })();
      return enCache;
    }
    try {
      const r = await fetchConTimeout(e.request, 8000);
      if (r && r.ok) {
        const limpia = await respuestaLimpia(r);
        const cache = await caches.open(CACHE);
        cache.put(e.request, limpia.clone()).catch(() => {});
        return limpia;
      }
      return r || Response.error();
    } catch (_) { return Response.error(); }
  })());
});

// ── Canal de estado (indicador del portal + diagnostico.html) ───

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo === 'estado') {
    e.waitUntil((async () => {
      const est = await estadoPrecache();
      const puerto = e.ports && e.ports[0];
      if (puerto) puerto.postMessage(est);
    })());
  } else if (d.tipo === 'completar') {
    e.waitUntil(completarPrecache());
  }
});
