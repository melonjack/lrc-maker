const swWorker = (self as unknown) as ServiceWorkerGlobalScope;

const APP_NAME = "akari-lrc-maker";
const VERSION = MetaData.version;
const HASH = MetaData.hash;
const CACHENAME = `${APP_NAME}-${VERSION}-${HASH}`;

swWorker.addEventListener("install", () => {
    swWorker.skipWaiting();
});

swWorker.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all<unknown>([
                swWorker.clients.claim(),
                ...cacheNames
                    .filter((cacheName) => {
                        return cacheName.startsWith(APP_NAME) && cacheName !== CACHENAME;
                    })
                    .map((cacheName) => {
                        return caches.delete(cacheName);
                    }),
            ]);
        }),
    );
});

swWorker.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    console.log(url.toString());

    if (!/(?:\.css|\.js|\.svg)$/i.test(url.pathname) && url.origin !== swWorker.location.origin) {
        console.log("filter out", url.toString());
        return;
    }

    event.respondWith(
        caches.match(event.request).then(
            (match) =>
                match ||
                caches.open(CACHENAME).then((cache) =>
                    fetch(event.request).then((response) => {
                        console.log("fetch", event.request.url, response.status);

                        if (response.status !== 200) {
                            return response;
                        }

                        cache.put(event.request, response.clone());
                        return response;
                    }),
                ),
        ),
    );
});
