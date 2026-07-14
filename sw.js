// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Service Worker v4 (Network First)
// ═══════════════════════════════════════════════════════════════

const CACHE = 'loma-verde-v45';

const ARCHIVOS = [
  './',
  './index.html',
  './login.html',
  './recuperar.html',
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

self.addEventListener('install', e => {
  // Se guarda archivo por archivo (no con addAll) para que si UNO falla
  // (ej. se renombró o hay un problema de red puntual) no se pierda el
  // precache de TODOS los demás — addAll es todo-o-nada y eso dejaba la
  // app sin nada guardado para el modo sin conexión si un solo archivo
  // fallaba al momento de instalar.
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      await Promise.all(ARCHIVOS.map(async archivo => {
        try {
          const resp = await fetch(archivo, { cache: 'no-cache' });
          if (resp && resp.ok) await cache.put(archivo, resp);
        } catch (_) { /* si un archivo falla, seguimos con los demás */ }
      }));
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// navigator.onLine no es confiable (puede decir "conectado" aunque no haya
// internet real). Por eso la estrategia network-first tiene un límite de
// tiempo: si la red no responde rápido, se usa la caché de inmediato en
// vez de dejar la página esperando indefinidamente.
function fetchConTimeout(request, ms) {
  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), ms);
  return fetch(request, { signal: controlador.signal }).finally(() => clearTimeout(id));
}

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.method !== 'GET') return;

  // Estrategia: Network First (con límite de tiempo), cae a caché si falla o tarda
  e.respondWith(
    fetchConTimeout(e.request, 4000)
      .then(resp => {
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, respClone));
        }
        return resp;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => cached || Response.error());
      })
  );
});
