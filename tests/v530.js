// v5.3.0 「わかりにくい」への対応のうち、v5.3.8 以降も有効なもの
//  （ボタン右肩の数字は v5.3.8 で「見通しの札」に置き換えた。札の確かめは tests/v538.js）
// 合格の基準：
//  3. 列の札（左・右）は赤く光らない。赤は当たる仲間（赤い枠）だけ
//  5. チュートリアルは16手順
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 759], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(600);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200);
    if (await p.evaluate(() => !!document.getElementById('rvGo') && !document.getElementById('runv').hidden)) await p.click('#rvGo');
    await p.waitForTimeout(1300);
    await p.click('#btnStart');
    for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(150); }
    let found = false;
    for (let t = 1; t <= 12 && !found; t++) {
      await p.evaluate((t) => { window.__rb.setGauge(3); window.__rb.setTurn(t); }, t);
      found = await p.evaluate(() => Object.keys(window.__rb.incoming(window.__rb.grid, false, false)).length > 0);
    }
    if (found) {
      const st = await p.evaluate(() => ({ hit: document.querySelectorAll('.ctag.hit').length, beam: document.querySelectorAll('.beam.on').length }));
      ok(st.hit === 0 && st.beam > 0, w + '×' + h + ' 3 列の札は赤くならず、当たる仲間だけ赤い枠（札' + st.hit + '・枠' + st.beam + '）');
    } else ok(await p.evaluate(() => document.querySelectorAll('.ctag.hit').length === 0), w + '×' + h + ' 3 列の札は赤くならない（この敵は攻撃のあるターンが無かった）');
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#beginTut'); await p.waitForTimeout(1500);
    const lbl = await p.evaluate(() => document.getElementById('coStep').textContent);
    ok(/1 \/ 16/.test(lbl), '5 チュートリアルは16手順：' + lbl);
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
