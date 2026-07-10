const CACHE_NAME = 'desert-odyssey-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. 서비스워커 설치 시 지정된 리소스 캐싱 저장
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. 네트워크 요청 가로채기 (네트워크 가로채기 분기처리)
self.addEventListener('fetch', (e) => {
  // ★ 글로벌 랭킹 통신(kvdb)이나 깃허브 공지는 캐시를 거치지 않고 실시간 네트워크 강제 조회
  if (e.request.url.includes('githubusercontent.com') || e.request.url.includes('kvdb.io')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // 완전 오프라인일 때 전송이 막히면 로컬 브라우저 캐시에서 매칭을 시도
        return caches.match(e.request);
      })
    );
    return;
  }

  // 그 외 일반 정적 에셋(HTML UI 구조)은 오프라인 가속을 위해 로컬 캐시 우선 활용
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
