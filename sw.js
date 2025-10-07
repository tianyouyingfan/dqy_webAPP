// sw.js

// 1. 更改缓存名称！这是强制浏览器更新缓存的信号。
const CACHE_NAME = 'dnd-assist-v0.5.0-modular';

// 2. 更新需要缓存的文件列表
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'manifest.json', // 明确缓存manifest
  'icon-192.png',
  'icon-512.png',
  'js/main.js', // 新的主入口
  'js/modules/db.js',
  'js/modules/utils.js',
  'js/modules/state.js',
  'js/modules/constants.js',
  'js/vendor/vue.js',
  'js/vendor/dexie.js'
];

// 安装和缓存逻辑 (保持不变)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活时清理旧缓存 (新增一个好习惯，自动清理老版本缓存)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});


// 拦截网络请求逻辑 (保持不变)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});