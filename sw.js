/* 餘裕 · Service Worker
   策略：App 本身用「網路優先、失敗回快取」，確保改版後一定拿到新程式碼；
        字型先回快取、背景更新。Firebase 的請求一律不攔截。 */

const VERSION = "yuyu-v2";
const FONTS = "yuyu-fonts-v1";
const SHELL = [
  "./",
  "./index.html",
  "./firebase.js",
  "./manifest.json",
  "./yuyu-import-template.xlsx",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  if (e.request.method !== "GET") return;

  // 圓體字型（Google Fonts）：先回快取、背景更新，離線時字型仍在
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then(c => c.match(e.request).then(hit => {
        const net = fetch(e.request)
          .then(res => { if (res && (res.ok || res.type === "opaque")) c.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  // 其餘只處理自己網域；Firebase / Google 登入一律放行
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
