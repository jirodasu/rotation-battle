// v5.6.2 受けるダメージの札が顔に重ならない
// 合格の基準（測る前に決めたもの）：
//  1. 320×568・375×667・393×852・844×390 で、QAジャンプ（第1章 地点3）の戦闘の準備画面：見えている札（.inc）がある
//  2. どの札も、その仲間の顔（肖像の円の中心から、半径の35%の円。v5.6.9 のちびキャラは頭の絵の顔）に重ならない
//  3. 札は画面の外にはみ出さない。ページのエラーなし
//  4. v5.7.1：「あとN発」の札（.inc-n）も、ちびキャラの顔・名札に重ならない
const { launch } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[320, 568], [375, 667], [393, 852], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, '..', 'index.html') + '?qa&ch=1&loc=3');
    let r = null;
    for (let k = 0; k < 30 && !(r && r.length); k++) { await p.waitForTimeout(200); r = await p.evaluate(() => [...document.querySelectorAll('#board .inc')].filter((i) => i.getBoundingClientRect().width > 0).map((i) => {
      const a = i.getBoundingClientRect(), d = i.closest('.tok').querySelector('.disc').getBoundingClientRect();
      // v5.6.9 ちびキャラ：顔は全身の絵（100×124）の (50, 40)、半径12。丸い札は、円の中心から半径の35%
      const sv = i.closest('.tok.cb') && i.closest('.tok').querySelector('.disc svg'), v = sv && sv.getBoundingClientRect(), u = v ? v.height / 124 : 0;
      const cx = v ? v.left + v.width / 2 : d.left + d.width / 2, cy = v ? v.top + 40 * u : d.top + d.height / 2, rad = v ? 12 * u : d.width / 2 * 0.35;
      const nx = Math.max(a.left, Math.min(cx, a.right)), ny = Math.max(a.top, Math.min(cy, a.bottom));
      return { t: i.textContent, face: Math.hypot(nx - cx, ny - cy) >= rad, inView: a.left >= 0 && a.right <= innerWidth };
    })); }
    const tag = w + '×' + h;
    // v5.7.1：「あとN発」の札も、ちびキャラの顔と名札に重ならない（HPを減らして出す）
    await p.goto('file://' + path.join(__dirname, '..', 'index.html') + '?qa&ch=1&loc=3&hp=40'); await p.waitForTimeout(1200);
    const nn = await p.evaluate(() => [...document.querySelectorAll('#board .inc-n')].filter((n) => n.getBoundingClientRect().width > 0).map((n) => { const a = n.getBoundingClientRect(), t = n.closest('.tok'), nm = t.querySelector('.nm').getBoundingClientRect(), sv = t.querySelector('.disc svg').getBoundingClientRect(), u = sv.height / 124;
      const fy = sv.top + 40 * u, fx = sv.left + sv.width / 2, rad = 12 * u, nx = Math.max(a.left, Math.min(fx, a.right)), ny = Math.max(a.top, Math.min(fy, a.bottom));
      return { t: n.textContent, face: Math.hypot(nx - fx, ny - fy) < rad, plate: !(a.right <= nm.left || a.left >= nm.right || a.bottom <= nm.top || a.top >= nm.bottom), view: a.left >= 0 && a.right <= innerWidth }; }));
    ok(nn.length > 0 && nn.every((x) => !x.face && !x.plate && x.view), tag + ' 4 「あとN発」が顔・名札に重ならず画面の中 ' + JSON.stringify(nn));
    ok(r && r.length > 0, tag + ' 1 札が出ている（' + (r ? r.length : 0) + '枚）');
    ok(r && r.every((x) => x.face), tag + ' 2 札が顔に重ならない ' + JSON.stringify(r));
    ok(r && r.every((x) => x.inView) && !errs.length, tag + ' 3 画面の中・エラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
