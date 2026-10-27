/* 安静成长岛 · Service Worker
   目标：离线可用，但永远不要把用户"锁死"在旧版本上。

   策略：
   · 页面文档（/ 与 index.html）→ 网络优先，失败才回退缓存。
     这样发布新版本后，用户下次打开就能立刻拿到新 HTML。
   · 静态资源（css/js/icons/manifest）→ 缓存优先（离线秒开），
     同时后台去网络取一份新副本，下次访问就是最新的（stale-while-revalidate）。
   · 缓存版本随内容变化而递增；activate 时清掉旧版本缓存。
*/
var CACHE = 'qgi-v7';
var ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/palette.css',
  './css/fx.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* 需要"网络优先"的路径：应用外壳文档 */
function isDocument(req) {
  if (req.mode === 'navigate') return true;
  var u = new URL(req.url);
  if (u.origin !== location.origin) return false;
  return u.pathname === '/' || u.pathname.endsWith('/index.html');
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  /* 1) 应用外壳：网络优先，保证版本及时更新 */
  if (isDocument(req)) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }
        return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* 2) 静态资源：缓存优先 + 后台刷新 */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return null; });

      if (hit) return hit;
      return net.then(function (res) {
        return res || caches.match('./index.html');
      });
    })
  );
});
