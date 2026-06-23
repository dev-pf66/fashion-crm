// Kill-switch service worker — replaces old PWA SW.
// Clears all caches, unregisters itself, reloads clients so they get fresh JS.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ includeUncontrolled: true }))
      .then(clients => clients.forEach(client => client.navigate(client.url)))
  )
})
