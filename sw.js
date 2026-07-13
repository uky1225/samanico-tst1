  const CACHE_NAME = 'Samanico_v2'; // 버전 변경으로 기존 캐시 완벽 초기화
const ASSETS = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png'
  // 필요 시 ./style.css, ./game.js 등 추가
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// 이전 캐시(과거 버전) 삭제를 통한 버전 관리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
