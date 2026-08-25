/// <reference lib="webworker" />

/**
 * Trevo One — PWA Service Worker (T103 Runtime Foundation + T103A0 Web Push + OFFLINE04 Navigation Fallback)
 *
 * Core Policies:
 * - Cache only public, hashed and allowlisted static assets (/_next/static/, brand icons, /offline.html, /offline.js).
 * - ZERO private, authenticated or dynamic route caching.
 * - Strict same-origin GET allowlist.
 * - Navigation Fallback: Network-first for HTML documents, falling back to static /offline.html only when network fails.
 * - Versioned Trevo cache namespace with automatic legacy cleanup on activation.
 * - Controlled updates via SKIP_WAITING message (no unprompted reload/skipWaiting on install).
 * - Deterministic bounded pruning for /_next/static/ entries (MAX_NEXT_STATIC_ENTRIES = 160).
 * - Standards-compliant Web Push event handling & notificationclick navigation.
 */

const CACHE_VERSION = "v2";
const CACHE_NAME = `trevo-static-${CACHE_VERSION}`;
const MAX_NEXT_STATIC_ENTRIES = 160;

const STATIC_PWA_ASSETS = new Set([
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/apple-touch-icon.png",
  "/trevo-one-logo.png",
  "/favicon.ico",
  "/offline.html",
  "/offline.js",
]);

/**
 * Determines if a request is strictly eligible for static caching.
 */
function isCacheableStaticAsset(request, url) {
  // Method must be GET
  if (request.method !== "GET") return false;

  // Must be same-origin
  if (url.origin !== self.location.origin) return false;

  // Navigation / document requests are handled separately by navigation fallback
  if (request.mode === "navigate") return false;

  // Never intercept requests with Authorization or Range headers
  if (request.headers.has("authorization") || request.headers.has("range")) {
    return false;
  }

  const pathname = url.pathname;

  // Never cache the Service Worker itself or manifest
  if (
    pathname === "/sw.js" ||
    pathname.startsWith("/manifest") ||
    pathname === "/_not-found"
  ) {
    return false;
  }

  // Never cache Next.js image optimizer, data payloads, or API/dynamic routes
  if (
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/_next/data") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/consultoria") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/recuperar-senha") ||
    pathname.startsWith("/redefinir-senha") ||
    pathname.startsWith("/selecionar-consultoria") ||
    pathname.startsWith("/notificacoes") ||
    pathname.startsWith("/convite")
  ) {
    return false;
  }

  // Strict positive allowlist: content-addressed Next static chunks or explicit public PWA assets
  if (pathname.startsWith("/_next/static/") || STATIC_PWA_ASSETS.has(pathname)) {
    return true;
  }

  return false;
}

/**
 * Prunes the oldest /_next/static/ entries in the cache if the limit is exceeded.
 * Stable explicit PWA brand assets are excluded and preserved.
 */
async function pruneNextStaticCache(cache) {
  try {
    const keys = await cache.keys();
    const staticKeys = keys.filter((req) => {
      try {
        const u = new URL(req.url);
        return u.origin === self.location.origin && u.pathname.startsWith("/_next/static/");
      } catch {
        return false;
      }
    });

    if (staticKeys.length > MAX_NEXT_STATIC_ENTRIES) {
      const excess = staticKeys.length - MAX_NEXT_STATIC_ENTRIES;
      const toDelete = staticKeys.slice(0, excess);
      await Promise.all(toDelete.map((req) => cache.delete(req)));
    }
  } catch {
    // Prune failure must never disrupt application runtime
  }
}

// Install: precache allowlisted static PWA assets including offline shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(Array.from(STATIC_PWA_ASSETS));
    })
  );
});

// Activate: clean up outdated Trevo caches and claim clients.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            // Delete only older Trevo caches, preserve unrelated caches
            if (name.startsWith("trevo-") && name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: intercept navigation requests for offline fallback, and allowlisted static assets.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Navigation requests: Strict network-first with precached /offline.html fallback
  if (event.request.mode === "navigate" && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Network unavailable (offline) -> deliver precached offline shell
        const cache = await caches.open(CACHE_NAME);
        const fallback = await cache.match("/offline.html");
        if (fallback) {
          return fallback;
        }
        return new Response("Trevo One está offline.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  // 2. Allowlisted static assets: Cache-first
  if (!isCacheableStaticAsset(event.request, url)) {
    // Return immediately to let the browser execute default network behavior
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);

        // Validate response before placing into cache: 200 OK, basic type, no Set-Cookie
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic" &&
          !networkResponse.headers.has("set-cookie")
        ) {
          const responseClone = networkResponse.clone();
          const isNextStatic = url.pathname.startsWith("/_next/static/");

          // Put into cache and prune asynchronously without blocking response delivery
          cache
            .put(event.request, responseClone)
            .then(() => {
              if (isNextStatic) {
                return pruneNextStaticCache(cache);
              }
            })
            .catch(() => {
              // Cache write/prune failure must never fail the network response
            });
        }

        return networkResponse;
      } catch (error) {
        throw error;
      }
    })
  );
});

// Controlled update message handler
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Web Push Event Handler
self.addEventListener("push", (event) => {
  let payload = {
    title: "Trevo One",
    body: "Você tem uma nova notificação.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    notificationPublicId: "",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      if (data && typeof data === "object") {
        if (data.title) payload.title = String(data.title);
        if (data.body) payload.body = String(data.body);
        if (data.icon) payload.icon = String(data.icon);
        if (data.badge) payload.badge = String(data.badge);
        if (data.notificationPublicId) {
          payload.notificationPublicId = String(data.notificationPublicId);
        }
      }
    } catch {
      // If JSON parsing fails, treat as plain text if available
      try {
        const text = event.data.text();
        if (text) payload.body = text;
      } catch {
        // Fall back to default generic copy
      }
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    data: {
      notificationPublicId: payload.notificationPublicId,
    },
    tag: payload.notificationPublicId ? `trevo-notif-${payload.notificationPublicId}` : undefined,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Notification Click Event Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const notificationPublicId = data.notificationPublicId;

  // Resolve target internal destination
  const targetUrl = notificationPublicId
    ? `/notificacoes?abrir=${encodeURIComponent(notificationPublicId)}`
    : "/notificacoes";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            try {
              const clientUrl = new URL(client.url);
              if (clientUrl.origin === self.location.origin) {
                client.navigate(targetUrl);
                return client.focus();
              }
            } catch {
              // continue
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
