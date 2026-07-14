// 버전 이름을 변경해야 브라우저가 '업데이트'로 인식합니다.
const CACHE_NAME = 'Samanico1'; 

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './IMG_0012.png' // 아이콘 파일명
];

// 1. 서비스 워커 설치 및 리소스 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // 🌟 새로운 서비스 워커가 대기하지 않고 즉시 활성화되도록 설정
  );
});

// 2. 이전 버전의 오래된 캐시를 삭제하는 코드
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('기존 캐시 삭제:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim()) // 🌟 활성화 즉시 브라우저 제어권을 가져와 새로고침 시 바로 반영
  );
});

// 3. 네트워크 요청 처리 (실시간 업데이트 + 오프라인 하이브리드 전략)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 🌟 [추가] 실시간 코드 변경 감지용 주소(?update_check=...)는 캐시를 완전히 우회하여 실제 서버로 즉시 요청합니다.
  if (url.searchParams.has('update_check')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 🌟 [추가] HTML 페이지 접속은 항상 최신 코드를 유지하기 위해 '네트워크 우선(Network-First)'으로 처리합니다.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // 온라인 상태일 때는 받아온 최신 html 파일을 캐시에 덮어씌웁니다.
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // 오프라인(인터넷 연결 끊김) 상태일 때만 캐시된 html 페이지를 반환합니다.
          return caches.match(e.request);
        })
    );
    return;
  }

  // 4. 나머지 정적 자원(이미지, 설정 파일 등)은 로딩 속도를 위해 기존처럼 캐시 우선(Cache-First) 적용
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return networkResponse;
      });
    })
  );
});
