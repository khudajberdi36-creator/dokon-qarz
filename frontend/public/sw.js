const CACHE_NAME = 'dokon-qarz-v3';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// O'rnatish — static fayllarni cache qilish
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Darhol faol bo'lsin
  self.skipWaiting();
});

// Faollashish — eski cache ni tozalash
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  // Barcha ochiq tablarni nazorat qilsin
  self.clients.claim();
});

// Fetch — API so'rovlari hech qachon cache qilinmasin, faqat statik fayllar
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API so'rovlari — doim tarmoqdan olish
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Statik fayllar — cache first, keyin tarmoq
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Faqat GET so'rovlarni va 200 javoblarni cache qilish
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline bo'lsa index.html qaytarish
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Yangilanish xabarini qabul qilish
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});