// ═══════════════════════════════════════════════════════════════
//  Sistema Loma Verde — Service Worker v4 (Network First)
// ═══════════════════════════════════════════════════════════════

const CACHE = 'loma-verde-v11';

const ARCHIVOS = [
  './',
  './index.html',
  './sync.js',
  './materia-context.js',
  './materia-hub.html',
  './modulos/01-calificaciones.html',
  './modulos/02-planeador.html',
  './modulos/03-examenes.html',
  './modulos/04-examenes-11.html',
  './modulos/05-asistencia.html',
  './modulos/06-comunicados.html',
  './modulos/07-horario.html',
  './modulos/08-eventos.html',
  './Logo/logo.jpg',
  './lib/xlsx.full.min.js',
  './lib/chart.umd.js',
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

  // Estrategia: Network First, falling back to cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, respClone));
        }
        return resp;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
