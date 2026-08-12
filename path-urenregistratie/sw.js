// Minimal, intentionally no-op service worker.
//
// Scope: only registers so the app is installable (PWA manifest requirement).
// Deliberately does NOT implement offline caching/update strategy yet — that is
// tracked separately in MASTERCHECKLIST.md (Fase 16: "Offline-/updategedrag
// bepalen") and requires a real go-live decision before it can be built responsibly.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// No fetch handler: requests fall through to the network exactly as without a
// service worker, so this file cannot change runtime behavior or break offline use.
