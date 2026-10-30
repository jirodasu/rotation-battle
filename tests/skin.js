// 見た目：ゴシック調だけ（v5.2.1 でハロウィン版を削除）。
// 合格の基準：10月でも見た目の切り替えボタンは無く、ハロウィンの文字・絵・敵名はどこにも出ない。
//   以前ハロウィンを選んでいた保存（rb-skin=hw）でもゴシック調で開き、その保存は消える。戦闘の敵はゴシック調の名前
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [date, label] of [['2026-10-31T20:00:00+09:00', '10/31'], ['2026-11-10T10:00:00+09:00', '11月']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.setFixedTime(new Date(date));
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-skin', 'hw'); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ sel: !!document.getElementById('skinSel'), btn: !!document.querySelector('[data-skin="hw"]'), skin: document.documentElement.getAttribute('data-skin'), theme: document.documentElement.getAttribute('data-theme'), text: /ハロウィン/.test(document.body.innerText), saved: localStorage.getItem('rb-skin') }));
    ok(!r.sel && !r.btn && !r.text, label + '：見た目の切り替えボタンもハロウィンの文字も無い');
    ok(r.skin === 'goth' && r.theme === 'dark', label + '：以前ハロウィンを選んでいた保存でも、ゴシック調で開く');
    ok(r.saved === null, label + '：古い見た目の保存（rb-skin）は消える');
    await p.click('#begin'); await p.waitForTimeout(500);
    const names = await p.evaluate(() => document.getElementById('rvCards').textContent);
    ok(!/ドラキュラット|フランケン|カボチャ|ナイトメア/.test(names) && /ネズミ|巨人|書守|毒竜|三位一体/.test(names), label + '：地図の敵はゴシック調の名前');
    ok(!errs.length, label + '：ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
