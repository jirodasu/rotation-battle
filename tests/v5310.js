// v5.3.10 チュートリアルの「完了」で「環廊へ」を押しても進まない（隊・深さが開いていると、完了の画面が出発の準備の手前に残る）
// 合格の基準（測る前に決めたもの）：
//  1. 隊も深さも開いていない：「環廊へ」で地図へ進む
//  2. 隊や深さが開いている：「環廊へ」で完了の画面が閉じ、「どの隊で下る？」が一番手前に出て押せる
//  3. 遠征の途中の記録がある：確かめの画面が一番手前に出る。「新しく始める」で完了の画面が閉じ、出発の準備（隊が開いていなければ地図）へ進む
//  4. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const topId = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e ? ((e.closest('[id]') || {}).id || '') : ''; }, sel);
(async () => {
  const b = await launch();
  for (const [name, init] of [['1 選択肢なし', null], ['2 隊が開いている', { runs: 3, clears: 1, best: 9 }], ['3 遠征の途中', 'save']]) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((m) => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); if (m) localStorage.setItem('rb-exp', JSON.stringify(m)); } catch (e) { /* */ } }, init && init !== 'save' ? init : null);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    if (init === 'save') { await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1200); await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(400); }
    await p.click('#beginTut'); await p.waitForTimeout(1200);
    await p.evaluate(() => window.__rb.finishForTest('win')); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !document.getElementById('result').hidden && document.getElementById('next').textContent === '環廊へ'), name + '：完了の画面に「環廊へ」');
    await p.click('#next'); await p.waitForTimeout(900);
    if (init === 'save') {
      ok(await topId(p, '#ncGo') === 'ncGo', name + '：確かめの画面が一番手前');
      await p.waitForTimeout(500); await p.click('#ncGo'); await p.waitForTimeout(900);
    }
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, runv: !document.getElementById('runv').hidden, t: document.getElementById('rvTitle').textContent }));
    if (!init) ok(!st.res && st.runv && /進む/.test(st.t), name + '：地図へ進む ' + JSON.stringify(st));
    else {
      ok(!st.res && st.runv && (init === 'save' ? /どの隊|進む/ : /どの隊/).test(st.t), name + '：完了の画面が閉じ、出発の準備が出る ' + JSON.stringify(st));
      ok(await topId(p, '#rvCards .rv-card[data-i="0"]') !== 'result' && await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card[data-i="0"]').getBoundingClientRect(), e = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2); return !!(e && e.closest('#runv')); }), name + '：隊の札が一番手前で押せる');
    }
    ok(!errs.length, name + '：ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
