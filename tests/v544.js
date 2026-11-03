// v5.4.4 大技の溜め（アンティシペーション #121）と、当たる瞬間の一瞬の停止（フリーズフレーム #040）、とどめの火花の色
// 合格の基準（測る前に決めたもの）：
//  1. 大技を出す敵は、一度後ろへ引いて（上へ・小さく）から踏み込む。通常の攻撃は今までどおり（引かない）。どちらも0.42秒
//  2. 大技が当たったら、一瞬止まってから（0.09秒以上あとに）画面が揺れる
//  3. とどめの火花は白と青灰だけ（金色を使わない）
//  4. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const spy = () => {
  window.__A = []; window.__S = { shake: 0, big: 0, sparks: [] };
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, opt) { if (this.id === 'eart' || (this.classList && this.classList.contains('fc'))) window.__A.push({ kf: JSON.stringify(kf), dur: opt && opt.duration }); return orig.call(this, kf, opt); };
  const app = document.getElementById('app');
  const f = () => { const t = app.style.translate; if (t && t !== '0px 0px' && !window.__S.shake) window.__S.shake = performance.now(); requestAnimationFrame(f); }; requestAnimationFrame(f);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (!n.classList) return; if (n.classList.contains('flash') && !window.__S.big) window.__S.big = performance.now(); /* 大技が当たった瞬間の白いフラッシュ */ if (n.classList.contains('spark')) window.__S.sparks.push(n.style.background); }))).observe(document.getElementById('fx'), { childList: true });
};
const toChoose = async (p) => { for (let k = 0; k < 300; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' || !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break; await p.waitForTimeout(40); } };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1 })); } catch (e) { /* */ } });
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
  await p.evaluate(spy);
  await p.click('#btnStart'); await toChoose(p);
  const hasBack = (kf) => /translateY\(-\d/.test(kf);
  // 1 通常の攻撃
  const normal = await p.evaluate(() => { const R = window.__rb, g = R.grid; R.grid.flat().forEach((u) => { if (u) u.hp = u.max; }); R.enemy.hp = R.enemy.max = 999;
    for (let t = 1; t <= 14; t++) { R.setTurn(t); const a = R.actOf(R.enemy); if (a.dmg && !a.big && a.rule !== 'charge' && Object.keys(R.incoming(g, false, false)).length) { a.dmg = 1; R.enemy.charged = false; R.render(); return a.name; } } return null; });
  if (normal) {
    await p.evaluate(() => { window.__A = []; window.__S.shake = 0; window.__S.big = 0; });
    await p.click('#btnStay'); await toChoose(p); await p.waitForTimeout(300);
    const a = await p.evaluate(() => window.__A.map((x) => x.kf + '|' + x.dur));
    const atk = a.filter((x) => /scale\(1\.0[0-9]\)|translateY\(1\d|translateY\(2\d/.test(x));
    ok(atk.length > 0 && atk.every((x) => !hasBack(x) && /\|420$/.test(x)), '1 通常の攻撃（' + normal + '）は引かずに踏み込む、0.42秒 ' + atk.length + '件');
  } else ok(true, '1 （通常の攻撃のターンが無かった）');
  // 1・2 大技
  const big = await p.evaluate(() => { const R = window.__rb, g = R.grid; R.grid.flat().forEach((u) => { if (u) u.hp = u.max; }); R.enemy.hp = R.enemy.max = 999;
    for (let t = 1; t <= 14; t++) { R.setTurn(t); const a = R.actOf(R.enemy); if (a.dmg && a.rule !== 'charge' && Object.keys(R.incoming(g, false, false)).length) { a.big = true; a.dmg = 1; R.render(); return a.name; } } return null; });
  if (big && await p.evaluate(() => window.__rb.phase === 'choose')) {
    await p.evaluate(() => { window.__A = []; window.__S.shake = 0; window.__S.big = 0; });
    await p.click('#btnStay'); await toChoose(p); await p.waitForTimeout(1300);
    const a = await p.evaluate(() => window.__A.map((x) => x.kf + '|' + x.dur));
    ok(a.some((x) => hasBack(x) && /\|420$/.test(x)), '1 大技（' + big + '）は一度後ろへ引いてから踏み込む、0.42秒');
    const s = await p.evaluate(() => ({ hit: window.__S.big, shake: window.__S.shake }));
    ok(s.hit > 0 && s.shake > 0 && s.shake - s.hit >= 85, '2 当たってから一瞬止まり、そのあと揺れる（' + Math.round(s.shake - s.hit) + 'ms 後）');
  } else ok(true, '1・2 （大技を当てられる場面が無かった）');
  // 3 とどめ
  if (await p.evaluate(() => window.__rb.phase === 'choose')) {
    await p.evaluate(() => { const R = window.__rb; window.__S.sparks = []; R.enemy.hp = 1; R.render(); });
    await p.click('#btnStay'); for (let k = 0; k < 120; k++) { if (await p.evaluate(() => !document.getElementById('result').hidden || !document.getElementById('runv').hidden || window.__S.sparks.length > 20)) break; await p.waitForTimeout(25); }
    const sp = await p.evaluate(() => [...new Set(window.__S.sparks)]);
    const fin = sp.filter((c) => !/255, 138, 114|255, 217, 160|255, 243, 214|#ff8a72|#ffd9a0|#fff3d6/.test(c));   // 味方の被弾の火花（赤・橙）と、通常の一撃の火花（クリーム色）は別
    ok(fin.length > 0 && fin.every((c) => /rgb\(255, 255, 255\)|rgb\(159, 178, 200\)|#ffffff|#9fb2c8/i.test(c)), '3 とどめの火花は白と青灰だけ ' + JSON.stringify(sp));
  }
  ok(!errs.length, '4 ページのエラーなし ' + errs.join('/'));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
