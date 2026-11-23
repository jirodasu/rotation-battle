// v5.9.22 スマホの縦画面だけにする：PC などの広い画面は frame.html（左右に壁紙、中央に縦長の枠）、横持ちのスマホは「縦にしてください」
// 合格の基準（測る前に決めたもの）：
//  1 PC（1280×720）で index.html を開くと frame.html に移り、枠は 幅333（高さ×0.462）×高さ720 で中央。枠の中でゲームの表紙が出て、中の画面の幅も333
//  2 大きいモニター（1920×1080）では枠の幅は 430（上限）。背の低い窓（1280×560）では 320（下限）
//  3 窓の大きさを変えると枠も合わせて変わる（1280×720 → 1440×900 で幅416）
//  4 iPad の縦（1024×1366）も枠に入る（幅430）
//  5 縦のスマホ（390×844）は移らず、「縦にしてください」も出ない
//  6 横持ちのスマホ（844×390）は移らず、「縦にしてください」が画面全体を覆う。縦（390×844）に戻すと消える
//  7 左右の壁紙は大聖堂の広い絵（bg_wide）。SW は frame.html を保存し、別に保存する。マニフェストは縦向き
//  8 どれもページのエラーなし
const fs = require('fs'), path = require('path');
const { launch, ROOT } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const URL0 = 'file://' + path.join(ROOT, 'index.html');
(async () => {
  const b = await launch();
  const open = async (w, h, mobile) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }, mobile ? { isMobile: true, hasTouch: true } : {}));
    await ctx.addInitScript(() => { window.__rbFrameTest = true; });
    const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
    await p.goto(URL0); await p.waitForTimeout(1200);
    return { ctx, p };
  };
  const box = (p) => p.evaluate(() => { const f = document.getElementById('game'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height), src: f.getAttribute('src') }; });
  {
    const { ctx, p } = await open(1280, 720);
    const bx = await box(p), fr = p.frames().find((f) => /index\.html/.test(f.url()) && f !== p.mainFrame());
    const inner = fr ? await fr.evaluate(() => ({ cover: !!document.querySelector('#cover') && document.body.classList.contains('is-cover'), w: window.innerWidth, h: window.innerHeight })) : null;
    ok(/frame\.html$/.test(p.url()) && bx && bx.w === 333 && bx.h === 720 && Math.abs(bx.x - (1280 - 333) / 2) <= 1 && /in=1/.test(bx.src), '1 PC 1280×720：frame.html の中央に 333×720 の枠 ' + JSON.stringify(bx));
    ok(!!inner && inner.cover && inner.w === 333 && inner.h === 720, '1 枠の中でゲームの表紙が出て、中の画面は 333×720 ' + JSON.stringify(inner));
    const wall = await p.evaluate(() => getComputedStyle(document.querySelector('.wall')).backgroundImage);
    ok(/bg_wide\.webp/.test(wall), '7 左右の壁紙は大聖堂の広い絵 ' + wall.slice(0, 80));
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
    const b2 = await box(p);
    ok(b2 && b2.w === 416 && b2.h === 900, '3 窓を 1440×900 に広げると枠も 416×900 ' + JSON.stringify(b2));
    ok(!p.__errs.length, '8 エラーなし（PC）' + p.__errs.join('/')); await ctx.close();
  }
  for (const [w, h, want, tag] of [[1920, 1080, 430, '大きいモニター'], [1280, 560, 320, '背の低い窓']]) {
    const { ctx, p } = await open(w, h); const bx = await box(p);
    ok(/frame\.html$/.test(p.url()) && bx && bx.w === want && bx.h === h, '2 ' + tag + ' ' + w + '×' + h + '：枠の幅 ' + want + ' ' + JSON.stringify(bx));
    ok(!p.__errs.length, '8 エラーなし（' + tag + '）' + p.__errs.join('/')); await ctx.close();
  }
  {
    const { ctx, p } = await open(1024, 1366, true); const bx = await box(p);
    ok(/frame\.html$/.test(p.url()) && bx && bx.w === 430, '4 iPad の縦 1024×1366 も枠（幅430） ' + JSON.stringify(bx));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(390, 844, true);
    const st = await p.evaluate(() => ({ url: location.pathname, tip: getComputedStyle(document.getElementById('rotTip')).display, frame: !!document.getElementById('game') }));
    ok(/index\.html$/.test(st.url) && st.tip === 'none' && !st.frame, '5 縦のスマホ 390×844：移らず、回転の案内も出ない ' + JSON.stringify(st));
    ok(!p.__errs.length, '8 エラーなし（縦のスマホ）' + p.__errs.join('/')); await ctx.close();
  }
  {
    const { ctx, p } = await open(844, 390, true);
    const st = await p.evaluate(() => { const t = document.getElementById('rotTip'), r = t.getBoundingClientRect(), top = document.elementFromPoint(422, 195); return { url: location.pathname, tip: getComputedStyle(t).display, w: Math.round(r.width), h: Math.round(r.height), txt: t.textContent, onTop: !!top && t.contains(top) }; });
    ok(/index\.html$/.test(st.url) && st.tip !== 'none' && st.w === 844 && st.h === 390 && /縦にしてください/.test(st.txt) && st.onTop, '6 横持ち 844×390：移らず、「縦にしてください」が全体を覆う ' + JSON.stringify(st));
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
    const back = await p.evaluate(() => getComputedStyle(document.getElementById('rotTip')).display);
    ok(back === 'none', '6 縦に戻すと案内は消える ' + back);
    ok(!p.__errs.length, '8 エラーなし（横持ち）' + p.__errs.join('/')); await ctx.close();
  }
  {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    ok(/'\.\/frame\.html'/.test(sw.split('\n').find((l) => /const SHELL/.test(l)) || '') && /frame\\\.html\$\/\.test\(url\.pathname\) \? '\.\/frame\.html'/.test(sw), '7 SW は frame.html を保存し、index.html とは別に保存する');
    ok(mf.orientation === 'portrait', '7 マニフェストは縦向き ' + mf.orientation);
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
