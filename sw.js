/* Quesden Service Worker：只做一件事——断网也能打开页面。
   策略：缓存优先，后台更新（stale-while-revalidate 的极简版）。
   无后端，无 API；数据在内存里，刷新即回初始态——这是原型的已知妥协。 */
const CACHE = "quesden-v2";   /* 改版号即强制重缓存：SW 更新 → 旧缓存整目录删除 */
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);            // 断网：回缓存
      return hit || fresh;            // 有缓存先用，同时悄悄更新
    })
  );
});
