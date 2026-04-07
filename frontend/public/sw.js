const CACHE_NAME = "job-tracker-v4";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (!request.url.startsWith("http://") && !request.url.startsWith("https://")) {
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return;
  }

  const isHttpRequest = requestUrl.protocol === "http:" || requestUrl.protocol === "https:";
  if (!isHttpRequest) {
    return;
  }

  const isSameOrigin = requestUrl.origin === self.location.origin;
  if (!isSameOrigin) {
    return;
  }

  const isNavigationRequest = request.mode === "navigate";
  const isAssetRequest = ["script", "style", "image", "font"].includes(request.destination)
    || requestUrl.pathname.startsWith("/assets/");

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const contentType = response.headers.get("content-type") || "";
          if (isAssetRequest && contentType.includes("text/html")) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch(() => {
              // Ignore cache put failures for non-cacheable edge cases.
            });
          });

          return response;
        })
        .catch(() => {
          if (isNavigationRequest) {
            return caches.match("/index.html");
          }

          return new Response(null, { status: 504, statusText: "Gateway Timeout" });
        });
    })
  );
});
