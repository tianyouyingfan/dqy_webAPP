const CACHE_NAME = 'dnd-assist-v0.4.1';
// 需要缓存的文件列表
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'vendor/vue.global.prod.min.js',
  'vendor/dexie.min.js',
  'icon-192.png',
  'icon-512.png'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 拦截网络请求，优先从缓存中获取
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有匹配的响应，则返回它
        if (response) {
          return response;
        }
        // 否则，正常发起网络请求
        return fetch(event.request);
      }
    )
  );
});