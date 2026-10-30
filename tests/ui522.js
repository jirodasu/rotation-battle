// v5.2.2 UIチェック 1・2 の修正。
// 合格の基準（測る前に決めたもの）：
//  1a. 遠征の戦闘中に「★3を目指そう」の案内は出ない。遠征の目標（地点10の主を倒して抜ける）は、最初の地図に出る。2つ目以降の地図には出ない
//  1b. 戦闘中の案内（はじめての仕掛け）は、盤（仲間の列）と予告札に重ならない（393×759・375×667・320×568・430×932）。画面からもはみ出さない
//  2.  遊ぶ人に見える文言に「本番モード」「編成タイム」「OK」が無い。表紙は「環廊へ」、編成は「陣立て」、案内のボタンは「わかった」
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 759], [375, 667], [320, 568], [430, 932]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    const cover = await p.evaluate(() => document.getElementById('cover').innerText);
    ok(/環廊へ/.test(cover) && !/本番モード/.test(cover), w + '×' + h + ' 表紙は「環廊へ」（本番モードの文字なし）');
    await p.click('#begin'); await p.waitForTimeout(600);
    const sub = await p.evaluate(() => document.getElementById('rvSub').textContent);
    ok(/目標：地点10の主を倒して、環廊を抜ける/.test(sub), '1a 最初の地図に遠征の目標が出る：' + sub);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200);
    if (await p.evaluate(() => !!document.getElementById('rvGo') && !document.getElementById('runv').hidden)) await p.click('#rvGo');
    await p.waitForTimeout(1300);
    const prep = await p.evaluate(() => document.getElementById('book').innerText);
    ok(/陣立て/.test(prep) && !/編成タイム/.test(prep), '2 編成の帯は「陣立て」 ' + prep.replace(/\s+/g, ' ').slice(0, 40));
    await p.click('#btnStart');
    const seen = [], bad = [];
    for (let k = 0; k < 160 && seen.length < 3; k++) {
      if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.waitForTimeout(600);   // 出てくる動きが終わってから測る
      const s = await p.evaluate(() => { const t = document.getElementById('tip'); if (t.hidden) return null; const R = (e) => e.getBoundingClientRect(), r = R(t);
        const ov = (e) => { const a = R(e); return a.width > 0 && Math.min(r.bottom, a.bottom) - Math.max(r.top, a.top) > 1 && Math.min(r.right, a.right) - Math.max(r.left, a.left) > 1; };
        return { k: t.dataset.k, board: ov(document.getElementById('board')), ticket: ov(document.getElementById('ticket')), out: r.top < -1 || r.bottom > innerHeight + 1, btn: document.getElementById('tipOk').textContent }; });
      if (s) { seen.push(s.k); if (s.board || s.ticket || s.out || s.k === 'stars' || s.btn !== 'わかった') bad.push(s); await p.click('#tipOk'); await p.waitForTimeout(150); }
      else { if (await p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnStay').disabled)) await p.click('#btnStay').catch(() => {}); await p.waitForTimeout(200); }
      if (await p.evaluate(() => !document.getElementById('result').hidden)) break;
    }
    ok(seen.length >= 1 && !seen.includes('stars'), '1a 戦闘中に「★3を目指そう」は出ない（出た案内：' + seen.join('・') + '）');
    ok(!bad.length, '1b 案内は盤・予告札に重ならず、画面からはみ出さない。ボタンは「わかった」 ' + JSON.stringify(bad));
    // 2つ目の地図には目標を出さない
    await p.evaluate(() => { const R = window.__rb; document.getElementById('result').hidden = true; R.run.node = 1; R.run.choices = R.routeChoices(); R.expShowMap([]); }); await p.waitForTimeout(400);
    ok(!/目標：/.test(await p.evaluate(() => document.getElementById('rvSub').textContent)), '1a 2つ目以降の地図には目標を出さない');
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
