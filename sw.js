// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Service Worker v3 (compatible iOS)
// ═══════════════════════════════════════════════════════════════

const CACHE = 'loma-verde-v3';

const ARCHIVOS = [
  './',
  './index.html',
  './sync.js',
  './modulos/01-calificaciones.html',
  './modulos/02-planeador.html',
  './modulos/03-examenes.html',
  './modulos/04-examenes-11.html',
  './modulos/05-asistencia.html',
  './modulos/06-comunicados.html',
  './modulos/07-horario.html',
  './modulos/08-eventos.html',
  './Logo/logo.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
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

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            cache.put(e.request, resp.clone());
          }
          return resp;
        }).catch(() => cached);

        return cached || network;
      })
    )
  );
});
