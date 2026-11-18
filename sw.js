/* ============================================================
   AVE FÉNIX · Service worker
   - Deja la web instalable como app.
   - Guarda una copia para que abra aunque no haya cobertura.
   - Pinta los avisos y abre la web al tocarlos.
   ============================================================ */

const CACHE = 'avefenix-v3';
const BASICOS = ['./', 'index.html', 'img/logo-96.png', 'img/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(BASICOS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Primero la red, para que nadie se quede con una versión vieja;
   la copia solo se usa si no hay conexión. */
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;     // Supabase y fuentes van directos

  e.respondWith(
    fetch(r, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(r, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(r).then((hit) =>
          hit || (r.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});

/* Llega un aviso del servidor, aunque la web esté cerrada */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { d = { titulo: 'AveFénix', cuerpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(d.titulo || 'AveFénix', {
      body: d.cuerpo || '',
      icon: 'img/icon-192.png',
      badge: 'img/favicon.png',
      tag: d.tag || undefined,
      data: { ruta: d.ruta || '/' }
    })
  );
});

/* Al tocar un aviso: enfocar la web si está abierta o abrirla */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ruta = (e.notification.data && e.notification.data.ruta) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) {
          c.postMessage({ tipo: 'abrir', ruta: ruta });
          return c.focus();
        }
      }
      return self.clients.openWindow('./#' + ruta);
    })
  );
});
