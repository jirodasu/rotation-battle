/* 灯を継ぐ隊列 -LAST ROTATION-（旧名：ローグライク・ローテーションバトル） — オフラインでも遊べるようにするためのサービスワーカー */
const VERSION = 'rb-5.10.3';
const SHELL = ['./', './index.html', './frame.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png', './img/bg_title.webp', './img/bg_tall.webp', './img/bg_wide.webp', './img/btn_gold.webp', './img/btn_dark.webp', './fonts/ShipporiMincho-700.woff', './fonts/ShipporiMincho-800.woff', './fonts/ZenKaku-500.woff', './fonts/ZenKaku-700.woff', './fonts/ZenKaku-900.woff'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // v5.10.2：消すのは、この作品が今まで使ってきた名前（rb-5.10.1・rb-v3 など）の古い版だけ。
  //   GitHub Pages では別のリポジトリのゲームも同じオリジン（jirodasu.github.io）なので、ほかの名前のキャッシュは消さない
  const OURS = /^rb-v?\d+(\.\d+)*$/;
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => OURS.test(k) && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // 旧版（/classic/）はこのサービスワーカーでは扱わない（本体の保存済みページを旧版で上書きしないため）
  if (url.pathname.includes('/classic/')) return;
  // ページ本体は新しい版を優先し、オフラインなら保存済みの版を使う
  if (req.mode === 'navigate') {
    // v5.9.22：PC の入れ物（frame.html）は別に保存する。以前は、どのページも index.html として保存していた
    const key = /\/frame\.html$/.test(url.pathname) ? './frame.html' : './index.html';
    e.respondWith(fetch(req).then((res) => { caches.open(VERSION).then((c) => c.put(key, res.clone())); return res; }).catch(() => caches.match(key)));
    return;
  }
  // v5.11.0：録音した音源（audio/）は、一度取れたら保存して、次からはオフラインでも鳴らす（届いた音は SHELL にも足す）
  if (url.pathname.includes('/audio/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; })));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
