// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Service Worker (PWA offline)
// ═══════════════════════════════════════════════════════════════

const CACHE = 'loma-verde-v1';

const ARCHIVOS = [
  '/sistema-loma-verde/',
  '/sistema-loma-verde/index.html',
  '/sistema-loma-verde/sync.js',
  '/sistema-loma-verde/modulos/01-calificaciones.html',
  '/sistema-loma-verde/modulos/02-planeador.html',
  '/sistema-loma-verde/modulos/03-examenes.html',
  '/sistema-loma-verde/modulos/04-examenes-11.html',
  '/sistema-loma-verde/modulos/05-asistencia.html',
  '/sistema-loma-verde/modulos/06-comunicados.html',
  '/sistema-loma-verde/modulos/07-horario.html',
  '/sistema-loma-verde/modulos/08-eventos.html',
  '/sistema-loma-verde/Logo/logo.jpg',
];

// Instalación: guardar todos los archivos en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

// Activación: limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: primero caché, luego red
self.addEventListener('fetch', e => {
  // Peticiones a Supabase siempre van a la red
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Guardar en caché si es un recurso del proyecto
        if (e.request.url.includes('sistema-loma-verde')) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
