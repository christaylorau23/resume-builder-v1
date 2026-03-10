/**
 * Minimal service worker for PWA installability (Add to Home Screen on iOS).
 * No aggressive caching; app remains refreshable for 48–72 hour iteration.
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
