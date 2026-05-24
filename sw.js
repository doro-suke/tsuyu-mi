const CACHE_NAME = 'vesper-cache-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './data/bookmarks.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com'
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] キャッシュを事前ロード中...');
      // 失敗してもインストールを続行するため、個別にキャッシュ登録（TailwindのCDNなどの一時的エラー対策）
      return Promise.allSettled(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.error(`キャッシュ追加失敗: ${url}`, err));
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// アクティベート時に古いキャッシュをクリーンアップ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] 古いキャッシュを削除:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ処理 (Network-First with Cache Fallback)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 正常なHTTPリプライのみキャッシュに更新
        if (response && response.status === 200 && response.type === 'basic' || response.url.includes('cdn.tailwindcss.com')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフラインまたは通信障害時はキャッシュをフォールバック
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 何もない場合は空レスポンス
          return new Response('Offline content not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
