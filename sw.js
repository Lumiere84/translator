/* Shadow Live Translate — service worker.
   Makes the app itself work with no internet: every file it needs is cached on
   install, so the screen, buttons, saved history and the offline phrasebook all
   load with no connection. Translation of free text still needs the internet
   (no web page can translate any sentence offline) — that is handled in the
   page, which shows an "offline" banner and falls back to the phrasebook. */
const C = "slt-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => e.waitUntil(
  caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  // Only our own files are cached. The Google / MyMemory translation and
  // voice calls are cross-origin and are left to go straight to the network.
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // App shell: serve from cache first so it opens instantly and offline,
  // then refresh the copy in the background when there is a connection.
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(C).then(c => c.put(e.request, cp)).catch(() => {});
        return r;
      }).catch(() => hit || caches.match("./index.html"));
      return hit || net;
    })
  );
});
