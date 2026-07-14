// 🌟 버전을 명시적으로 변경하여 브라우저가 새 버전을 감지할 수 있도록 합니다.
const CACHE_NAME = 'Samanico_v7'; 

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
      .then((cache) => {
        console.log('[Service Worker] 정적 자원 캐싱 중...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting()) // 새로운 서비스 워커가 대기하지 않고 즉시 활성화
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
    }).then(() => self.clients.claim()) // 활성화 즉시 브라우저 제어권을 가져와 반영
  );
});

// 3. 네트워크 요청 처리 (실시간 업데이트 + 오프라인 하이브리드 전략)
self.addEventListener('fetch', (e) => {
  // 🌟 [추가] GET 요청이 아니면 서비스 워커가 개입하지 않고 통과 (기록 저장 등 POST/PUT 에러 방지)
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // 🌟 [추가] 크롬 익스텐션 등 http/https가 아닌 비표준 프로토콜 요청 무시
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 🌟 [최적화] 실시간 코드 변경 감지용 주소(?update_check=...)는 캐시를 완전히 우회하여 서버로 직접 요청
  if (url.searchParams.has('update_check')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 🌟 [핵심 추가] 구글 앱스 스크립트(랭킹/공지사항 API) 요청은 절대 캐싱하지 않고 무조건 실시간 호출
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 🌟 HTML 페이지 접속은 최신 코드 유지를 위해 '네트워크 우선(Network-First)'으로 처리
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // 온라인 상태일 때는 받아온 최신 html 파일을 캐시에 업데이트
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // 오프라인(인터넷 끊김) 상태일 때만 캐시된 html 페이지를 반환
          return caches.match(e.request) || caches.match('./index.html');
        })
    );
    return;
  }

  // 4. 나머지 정적 자원(이미지, CDN 파일 등)은 캐시 우선(Cache-First) 적용
  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) {
        return response; // 캐시에 있으면 즉시 반환
      }
      return fetch(e.request).then((networkResponse) => {
        // 정상적인 응답이면서 내 도메인 리소스이거나, 외부 Firebase CDN(gstatic) 파일인 경우만 캐싱에 추가
        if (networkResponse && networkResponse.status === 200 && 
           (url.origin === location.origin || url.hostname.includes('gstatic.com'))) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // 에러 발생 시 처리 (무시)
      });
    })
  );
});
