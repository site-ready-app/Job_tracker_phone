/* Job Tracker offline cache. Build: 2.2.0-18e90d1b45 */
const CACHE = "jt-phone-2.2.0-18e90d1b45";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const CDN = ["https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css", "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Pre-load the icon font and chart library so they work offline too (best effort).
    for (const url of CDN) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        if (url.endsWith(".css")) {
          const css = await res.clone().text();
          for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
            if (!/\.(woff2?)(\?|#|$)/.test(m[1])) continue;
            try {
              const f = new URL(m[1], url).href;
              const fr = await fetch(f);
              if (fr.ok) await cache.put(f, fr);
            } catch (_) {}
          }
        }
        await cache.put(url, res);
      } catch (_) {}
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(req, key) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(key || req, { ignoreSearch: true });
  const network = fetch(req).then((res) => {
    if (res && res.ok) cache.put(key || req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") event.respondWith(staleWhileRevalidate(req, new Request("index.html")));
    else event.respondWith(staleWhileRevalidate(req));
  } else if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(cacheFirst(req));
  }
});
