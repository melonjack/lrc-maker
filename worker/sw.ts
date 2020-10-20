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

    console.log(event.request.url);

    if (!/(?:\.css|\.js|\.svg)$/i.test(url.pathname) && url.origin !== swWorker.location.origin) {
        console.log("filter out", event.request.url);
        return;
    }

    event.respondWith(
        caches.match(event.request).then((match) => {
            if (match) {
                console.log(match);
                if (match.url.indexOf("string.esnext.js") > 0) {
                    console.log(JSON.stringify(match));
                }
                return match;
            }
            console.log("not match", event.request.url);
            return caches.open(CACHENAME).then((cache) => {
                console.log("fetch start", event.request.url);
                return fetch(event.request)
                    .then((response) => {
                        console.log("fetched", event.request.url, response.status);

                        if (response.status !== 200) {
                            return response;
                        }

                        cache.put(event.request, response.clone());
                        return response;
                    })
                    .catch((reason) => {
                        console.log("fetch error", event.request.url, reason);
                        throw reason;
                    });
            });
        }),
    );
});
