var CACHE_NAME = 'appcache-8';

var urlsToCache = [
	'/',
	'sw.js',
	'manifest.webmanifest',
	'js/components/main.js',
	'images/anilist-icon.svg',
	'audio/on.ogg',
	'audio/off.ogg',
	'https://cdn.jsdelivr.net/npm/pwacompat@2.x.x/pwacompat.min.js',
	'https://unpkg.com/@alpinejs/persist@3.4.0/dist/module.esm.js',
	'https://unpkg.com/@alpinejs/focus@3.x.x/dist/module.esm.js',
	'https://unpkg.com/@alpinejs/intersect@3.x.x/dist/module.esm.js',
	'https://unpkg.com/alpinejs@3.x.x/dist/module.esm.js',
	'https://cdn.skypack.dev/pin/twind@v0.16.19-CaNDOlA4Nfo7ponDzANK/mode=imports,min/optimized/twind/shim.js',
	'https://rsms.me/inter/inter.css',
	'images/icons/apple-touch-icon.png',
	'images/icons/icon_x192.png',
	'images/icons/icon_x512.png',
	'images/icons/maskable_icon_x512.png',
	'images/icons/favicon-32x32.png',
	'images/icons/favicon-16x16.png',
	'images/icons/favicon.ico',
	'https://clovre.pigeonivy.com/images/ogimage.png',
];

self.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(CACHE_NAME).then(function (cache) {
			console.log('Opened cache:', CACHE_NAME);
			return cache.addAll(urlsToCache);
		})
	);
});

self.addEventListener('activate', function (event) {
	var cacheWhitelist = [CACHE_NAME];
	event.waitUntil(
		caches.keys().then(function (cacheNames) {
			return Promise.all(
				cacheNames.map(function (cacheName) {
					if (cacheWhitelist.indexOf(cacheName) === -1) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});

self.addEventListener('message', function (event) {
	if (event.data.action === 'skipWaiting') {
		self.skipWaiting();
	}
});

self.addEventListener('fetch', function (event) {
	if (event.request.mode === 'navigate') {
		event.respondWith(caches.match('/'));
		return;
	}
	event.respondWith(
		caches.match(event.request).then(function (response) {
			if (response) {
				return response;
			}

			var fetchRequest = event.request.clone();
			if (navigator.onLine) {
				return fetch(fetchRequest).then(function (response) {
					if (
						!response ||
						response.status !== 200 ||
						response.type !== 'basic'
					) {
						return response;
					}

					var responseToCache = response.clone();
					caches.open(CACHE_NAME).then(function (cache) {
						cache.put(event.request, responseToCache);
					});
					return response;
				});
			}
		})
	);
});
