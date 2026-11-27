// v5.10.2（ChatGPT の指示書 3件＋前回の4件の確かめ。2026-11-27）
// 合格の基準（測る前に決めたもの）：
//  1 SW：同じオリジンに「本作の旧版 rb-5.10.0」と「別作品のダミー another-game-test」を作ってから SW を有効にすると、
//    旧版だけ消え、今の版と別作品は残る。そのあとオフラインで読み直しても表紙（題字）が出る。ローカルの http サーバー（localhost の別ポート）で確かめる
//  2 図鑑：粘りつく大スライムの技と、時告げの大鴉の技・説明に「一番前の列の全員」。「全員」だけの表記は無い。回復列・補助列の全員はそのまま
//  3 画面の振り分け（本番と同じ判定を動かす：__rbFrameTest）：タッチの 375×600 は frame.html に移らず幅 375 を使う。
//    戦闘中に 375×600 → 667×375 → 375×600 と回すと、横で「縦にしてください」が出て縦で消える。ターン・HP・並びは変わらない。
//    320×568・375×667・390×844 のタッチも移らない。PC（1280×800）は frame.html の中央の縦長の枠。frame.html をスマホで開くと本体へ戻る
//  4 前回の4件：縛りで押せない「回す」を押すと理由が見える（気力不足は gaugeui.js）／図鑑の詳細から戻るとスクロール位置が戻る／
//    灯喰いネズミに初回の地点1の注記／320px でトワの「このターン攻撃+4」が1行
//  5 どれもページのエラーなし
const http = require('http'), fs = require('fs'), path = require('path');
const { launch, testPage, ROOT } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const serve = () => new Promise((res) => {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1', () => res(s));
});
const tips = () => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"combo":1,"hmIntro":1,"einfo":1,"trinity":1,"bench":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } };
(async () => {
  const b = await launch(); const srv = await serve(); const O = 'http://localhost:' + srv.address().port;
  const VER = (fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/VERSION = '([^']+)'/) || [])[1];
  { // 1 SW
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(O + '/favicon-32.png');
    await p.evaluate(async () => { const a = await caches.open('rb-5.10.0'); await a.put('/dummy-old', new Response('old')); const d = await caches.open('another-game-test'); await d.put('/dummy-other', new Response('other')); });
    const before = await p.evaluate(() => caches.keys());
    await p.goto(O + '/index.html'); await p.waitForTimeout(800);
    await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
    const after = (await p.evaluate(() => caches.keys())).sort();
    ok(before.includes('rb-5.10.0') && before.includes('another-game-test') && after.includes(VER) && after.includes('another-game-test') && !after.includes('rb-5.10.0'), '1 SW：旧版だけ消えて、今の版と別作品は残る（前 ' + JSON.stringify(before) + ' → 後 ' + JSON.stringify(after) + '）');
    await p.reload(); await p.waitForTimeout(1200);   // 一度オンラインで開いて保存させる
    await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
    const off = await p.evaluate(() => ({ t: (document.querySelector('.c-title') || {}).textContent || '', bg: getComputedStyle(document.getElementById('cover')).backgroundImage.includes('bg_title') }));
    ok(off.t === '灯を継ぐ隊列', '1 オフラインで読み直しても表紙が出る ' + JSON.stringify(off));
    await ctx.setOffline(false);
    ok(!errs.length, '1 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  { // 2・4 図鑑（全部会った状態）
    for (const [w, h] of [[320, 568], [390, 844]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      const KEYS = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/\{ k: '(\w+)', art: /g)].map((m) => m[1]);   // 図鑑の敵の一覧
      await p.addInitScript((K) => { try { const seen = {}; K.forEach((k) => { seen[k] = 1; }); localStorage.setItem('rb-story', '1'); localStorage.setItem('rb-exp', JSON.stringify({ runs: 9, clears: 3, ach: { first: 1 }, won: { 'std:1': 1 }, zk: { seen, kill: {}, talk: {} } })); } catch (e) { /* */ } }, KEYS);
      await p.goto(testPage()); await p.waitForTimeout(500); await p.click('#cover').catch(() => {}); await p.waitForTimeout(800);
      await p.click('#zukanBtn'); await p.waitForTimeout(300);
      if (w === 320) {   // 4 トワの突入技
        await p.click('#zkGrid .zk-card[data-i="0"]'); await p.waitForTimeout(300);
        const tw = await p.evaluate(() => { const e = [...document.querySelectorAll('.zk-detail *')].find((x) => /このターン攻撃\+4/.test(x.textContent) && x.children.length === 0); if (!e) return null; const lh = parseFloat(getComputedStyle(e).lineHeight); return { t: e.textContent, lines: Math.round(e.getBoundingClientRect().height / lh) }; });
        ok(!!tw && tw.lines === 1, '4 320px：トワの「このターン攻撃+4」が1行 ' + JSON.stringify(tw));
        await p.click('#zkBack'); await p.waitForTimeout(200);
      }
      await p.click('#zkT1'); await p.waitForTimeout(300);
      const open = async (name) => { const i = await p.evaluate((n) => { const c = [...document.querySelectorAll('#zkGrid .zk-card')].find((x) => x.textContent.includes(n)); return c ? c.dataset.i : null; }, name); if (i == null) return null; await p.click('#zkGrid .zk-card[data-i="' + i + '"]'); await p.waitForTimeout(300); return p.evaluate(() => ({ sk: [...document.querySelectorAll('.zk-sk li')].map((x) => x.textContent), all: document.querySelector('.zk-detail').textContent })); };
      const sl = await open('粘りつく大スライム'); await p.click('#zkBack'); await p.waitForTimeout(200);
      const cr = await open('時告げの大鴉'); await p.click('#zkBack'); await p.waitForTimeout(200);
      const bare = (L) => L.some((t) => /(^|[^のの列])全員/.test(t.replace(/一番前の列の全員|回復列の全員|補助列の全員/g, '')));
      ok(!!sl && sl.sk.filter((t) => /一番前の列の全員/.test(t)).length >= 2 && !bare(sl.sk), w + ' 2 スライムの「ねばつき」「大のしかかり」は一番前の列の全員 ' + JSON.stringify(sl && sl.sk));
      ok(!!cr && /終の刻[^]*一番前の列の全員|一番前の列の全員[^]*終の刻/.test(cr.all) && /8ターン目に、一番前の列の全員へ/.test(cr.all) && !bare(cr.sk), w + ' 2 大鴉の「終の刻」：技と説明の両方が一番前の列の全員');
      const other = await p.evaluate(async () => { const out = []; const n = document.querySelectorAll('#zkGrid .zk-card:not(.unk)').length; for (let i = 0; i < n; i++) { document.querySelectorAll('#zkGrid .zk-card:not(.unk)')[i].click(); await new Promise((r) => setTimeout(r, 60)); out.push(...[...document.querySelectorAll('.zk-sk li')].map((x) => x.textContent)); document.getElementById('zkBack').click(); await new Promise((r) => setTimeout(r, 40)); } return out; });
      ok(other.some((t) => /回復列の全員/.test(t)) && !bare(other), w + ' 2 ほかの敵：回復列の全員などは残り、「全員」だけの表記は無い（技 ' + other.length + ' 個） ' + JSON.stringify(other.filter((t) => /全員/.test(t))));
      // 4 スクロール位置：第3章のいちばん下の敵を開いて戻る
      const g0 = await p.evaluate(() => { const g = document.getElementById('zkGrid'); g.scrollTop = g.scrollHeight; return g.scrollTop; }); await p.waitForTimeout(150);
      const last = await p.evaluate(() => { const L = [...document.querySelectorAll('#zkGrid .zk-card:not(.unk)')]; return L[L.length - 1].dataset.i; });
      await p.click('#zkGrid .zk-card[data-i="' + last + '"]'); await p.waitForTimeout(300); await p.click('#zkBack'); await p.waitForTimeout(300);
      const g1 = await p.evaluate(() => document.getElementById('zkGrid').scrollTop);
      ok(g0 > 0 && Math.abs(g1 - g0) <= 2, w + ' 4 図鑑の詳細から戻るとスクロール位置が戻る ' + g0 + '→' + g1);
      // 4 ネズミの注記
      const rat = await open('灯喰いネズミ');
      ok(!!rat && /初めての遠征の地点1では、『かみつき』はサムライを狙う。/.test(rat.all), w + ' 4 灯喰いネズミに初回の地点1の注記');
      ok(!errs.length, w + ' 2・4 ページのエラーなし ' + errs.join(' / '));
      await ctx.close();
    }
  }
  { // 3 振り分け（本番と同じ判定）
    const open = async (w, h, mobile, file, q) => {
      const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }, mobile ? { isMobile: true, hasTouch: true } : {}));
      await ctx.addInitScript(tips); await ctx.addInitScript(() => { window.__rbFrameTest = true; });
      const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
      await p.goto(O + '/' + (file || 'index.html') + (q || '')); await p.waitForTimeout(1200); return { ctx, p };
    };
    const land = (p) => p.evaluate(() => { const t = document.getElementById('rotTip'); return !!t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().width >= innerWidth - 1; });
    for (const [w, h] of [[375, 600], [320, 568], [375, 667], [390, 844]]) {
      const { ctx, p } = await open(w, h, true);
      const r = await p.evaluate(() => ({ url: location.pathname, w: document.documentElement.clientWidth, cover: !!document.querySelector('.c-title') }));
      ok(!/frame\.html/.test(r.url) && r.w === w && r.cover && !(await land(p)), '3 タッチ ' + w + '×' + h + '：frame.html に移らず、ゲームの幅 ' + r.w + '（案内なし）');
      ok(!p.__errs.length, '3 ' + w + '×' + h + ' エラーなし ' + p.__errs.join(' / ')); await ctx.close();
    }
    { // 戦闘中に回す（?qa の戦闘。判定は本番と同じ）
      const { ctx, p } = await open(375, 600, true, 'index.html', '?qa&ch=1&loc=3&v=none');
      await p.click('#btnStart').catch(() => {});
      for (let k = 0; k < 80; k++) { if (await p.evaluate(() => !document.getElementById('btnStay').disabled && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(150); }
      const snap = () => p.evaluate(() => ({ turn: document.getElementById('turnNo') ? document.getElementById('turnNo').textContent : '', hp: [...document.querySelectorAll('#board .tok')].map((t) => t.textContent.replace(/\s+/g, '')).join('|'), ehp: (document.querySelector('.ehp') || {}).textContent || '' }));
      let s0 = await snap(); for (let k = 0; k < 20; k++) { await p.waitForTimeout(2500); const sx = await snap(); if (JSON.stringify(sx) === JSON.stringify(s0)) break; s0 = sx; }   // 演出が終わって落ち着いてから
      const w0 = await p.evaluate(() => document.documentElement.clientWidth);
      await p.setViewportSize({ width: 667, height: 375 }); await p.waitForTimeout(500);
      const l1 = await land(p), u1 = await p.evaluate(() => location.pathname);
      await p.setViewportSize({ width: 375, height: 600 }); await p.waitForTimeout(500);
      const l2 = await land(p), s2 = await snap(), w2 = await p.evaluate(() => document.documentElement.clientWidth);
      ok(w0 === 375 && l1 && !/frame/.test(u1) && !l2 && w2 === 375, '3 戦闘中 375×600 → 667×375 → 375×600：幅 ' + w0 + '、横で案内 ' + l1 + '、縦に戻すと消える ' + !l2 + '（幅 ' + w2 + '）');
      ok(JSON.stringify(s0) === JSON.stringify(s2) && s0.hp.length > 0, '3 回しても戦闘はそのまま（ターン・HP・並び） ' + JSON.stringify(s0).slice(0, 160) + ' → ' + JSON.stringify(s2).slice(0, 160));
      ok(!p.__errs.length, '3 戦闘 エラーなし ' + p.__errs.join(' / ')); await ctx.close();
    }
    { // PC は中央の縦長の枠
      const { ctx, p } = await open(1280, 800, false);
      const bx = await p.evaluate(() => { const f = document.getElementById('game'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; });
      ok(/frame\.html$/.test(p.url()) && bx && bx.h === 800 && Math.abs(bx.x - (1280 - bx.w) / 2) <= 1 && bx.w < 500, '3 PC 1280×800：frame.html の中央の縦長の枠 ' + JSON.stringify(bx));
      await ctx.close();
    }
    { // frame.html をスマホで開くと本体へ戻る
      const { ctx, p } = await open(375, 600, true, 'frame.html');
      ok(/index\.html$/.test(new URL(p.url()).pathname) && await p.evaluate(() => document.documentElement.clientWidth) === 375, '3 スマホで frame.html を開くと本体へ戻る ' + new URL(p.url()).pathname);
      await ctx.close();
    }
  }
  { // 4 縛りで押せない「回す」
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await ctx.addInitScript(tips);
    await p.goto(testPage() + '?qa&ch=1&loc=3&v=none'); await p.waitForTimeout(1200); await p.click('#btnStart').catch(() => {});
    for (let k = 0; k < 80; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnStay').disabled)) break; await p.waitForTimeout(150); }
    await p.evaluate(() => { window.__rb.enemy.bound = true; window.__rb.setGauge(3); }); await p.waitForTimeout(200);
    const t0 = await p.evaluate(() => window.__rb.turn);
    const r = await p.evaluate(() => { const x = document.getElementById('btnRotate').getBoundingClientRect(); return [x.left + x.width / 2, x.top + x.height / 2]; });
    await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(300);
    const d = await p.evaluate(() => { const e = document.getElementById('rotWhy'); if (!e || !e.classList.contains('on')) return null; const q = e.getBoundingClientRect(); return { t: e.textContent, inView: q.width > 0 && q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight }; });
    const t1 = await p.evaluate(() => window.__rb.turn);
    ok(!!d && /縛られている/.test(d.t) && d.inView && t0 === t1, '4 縛り：押せない「回す」を押すと理由が画面に見える・ターンは進まない ' + JSON.stringify(d) + ' ' + t0 + '→' + t1);
    ok(!errs.length, '4 縛り エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  srv.close(); await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
