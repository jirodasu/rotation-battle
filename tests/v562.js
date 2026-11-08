// v5.6.2 受けるダメージの札が顔に重ならない
// 合格の基準（測る前に決めたもの）：
//  1. 320×568・375×667・393×852・844×390 で、QAジャンプ（第1章 地点3）の戦闘の準備画面：見えている札（.inc）がある
//  2. どの札も、その仲間の顔（肖像の円の中心から、半径の35%の円）に重ならない
//  3. 札は画面の外にはみ出さない。ページのエラーなし
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
      const cx = d.left + d.width / 2, cy = d.top + d.height / 2, rad = d.width / 2 * 0.35;
      const nx = Math.max(a.left, Math.min(cx, a.right)), ny = Math.max(a.top, Math.min(cy, a.bottom));
      return { t: i.textContent, face: Math.hypot(nx - cx, ny - cy) >= rad, inView: a.left >= 0 && a.right <= innerWidth };
    })); }
    const tag = w + '×' + h;
    ok(r && r.length > 0, tag + ' 1 札が出ている（' + (r ? r.length : 0) + '枚）');
    ok(r && r.every((x) => x.face), tag + ' 2 札が顔に重ならない ' + JSON.stringify(r));
    ok(r && r.every((x) => x.inView) && !errs.length, tag + ' 3 画面の中・エラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
