// v5.3.1 「強くなり方がわからない」への対応（隊の選択は今のまま。開く条件を見せる）
// 合格の基準（測る前に決めたもの）：
//  1. 最初の地図に「勝つたびに報酬を選んで、隊を育てる」が出る
//  2. 育ったあとの地図に「隊の育ち：レリック「…」・技の強化 N回・最大HP+N」が出て、名簿の顔に「技N」の札が付く
//  3. 報酬の札：突入技の強化に「強化 N回目」、手当てに2回目以降は「合計+N」。説明に「この遠征のあいだ隊に残る」
//  4. 手当てを選ぶと、次の地図の「隊の育ち」に最大HPが出る
//  5. 表紙：まだ踏破していない人には「地点7まで行くと新しい隊」。全部開いた人には出さない
//  6. 遠征の終わり：まだ開いていないものがあれば「次に開く：…」が出る
//  7. 画面からはみ出さない（地図・報酬、393×759・320×568）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 759], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    const bs = await p.evaluate(() => document.getElementById('beginSub').textContent);
    ok(/地点7まで行くと新しい隊/.test(bs), w + '×' + h + ' 5 表紙に次に開くもの：' + bs);
    await p.click('#begin'); await p.waitForTimeout(700);
    const sub0 = await p.evaluate(() => document.getElementById('rvSub').textContent);
    ok(/勝つたびに報酬を選んで、隊を育てる/.test(sub0), w + '×' + h + ' 1 最初の地図：' + sub0);
    await p.evaluate(() => { const r = window.__rb.run; r.relics.push('shield'); r.tend = 1; const m = r.members[1]; m.up = { atk: window.__rb.EXP.up.atk * 2 }; window.__rb.applyAge(m, false); r.node = 3; r.choices = window.__rb.routeChoices(); window.__rb.expShowMap([]); });
    await p.waitForTimeout(500);
    const m3 = await p.evaluate(() => ({ sub: document.getElementById('rvSub').textContent, up: [...document.querySelectorAll('#rvRoster .rv-up')].map((e) => e.textContent) }));
    ok(/隊の育ち：レリック「[^」]+」・技の強化 2回・最大⁠HP⁠\+\d+/.test(m3.sub) && m3.up.join() === '技2', w + '×' + h + ' 2 育ちが地図と名簿に出る：' + m3.sub.replace(/⁠/g, '') + ' / ' + m3.up.join());
    const fitMap = await p.evaluate(() => { const c = document.querySelector('#runv .r-card'); return c.scrollHeight <= c.clientHeight + 2 || getComputedStyle(c).overflowY !== 'visible'; });
    ok(fitMap, w + '×' + h + ' 7 地図がはみ出さない（はみ出す分はカードの中でスクロール）');
    await p.evaluate(() => window.__rb.expReward([]));
    await p.waitForTimeout(500);
    const rw = await p.evaluate(() => ({ sub: document.getElementById('rvSub').textContent, cards: [...document.querySelectorAll('#rvCards .rv-card')].map((e) => e.textContent) }));
    const up = rw.cards.find((t) => /突入技の強化/.test(t)), tend = rw.cards.findIndex((t) => /手当て/.test(t));
    ok(/この遠征のあいだ隊に残る/.test(rw.sub), w + '×' + h + ' 3 報酬の説明：' + rw.sub);
    ok(/強化 \d+回目/.test(up || ''), w + '×' + h + ' 3 突入技の強化に回数：' + up);
    ok(/合計\+\d+/.test(rw.cards[tend] || ''), w + '×' + h + ' 3 2回目の手当てに合計：' + rw.cards[tend]);
    await p.click('#rvCards .rv-card[data-i="' + tend + '"]'); await p.waitForTimeout(700);
    const after = await p.evaluate(() => ({ tend: window.__rb.run.tend, sub: document.getElementById('rvSub').textContent }));
    ok(after.tend === 2 && /最大⁠HP⁠\+6|最大⁠HP⁠\+\d+/.test(after.sub), w + '×' + h + ' 4 手当てのあと：tend=' + after.tend + ' ' + after.sub.replace(/⁠/g, ''));
    // 6. 遠征の終わり
    await p.evaluate(() => window.__rb.expEnd(false, []));
    await p.waitForTimeout(500);
    const end = await p.evaluate(() => document.getElementById('rvCards').textContent);
    ok(await p.evaluate(() => !!document.querySelector('#rvCards .rv-skip') && /タイトルへ/.test(document.querySelector('#rvCards .rv-skip').textContent)), w + '×' + h + ' 6 遠征の終わりに「タイトルへ」がある');
    ok(/次に開く：地点7まで行くと新しい隊/.test(end), w + '×' + h + ' 6 遠征の終わりに次に開くもの');
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 5. すべて開いた人には出さない
  {
    const ctx = await b.newContext({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-exp', JSON.stringify({ runs: 5, clears: 3, best: 10, ach: { mid: 1, first: 1, honor: 1 }, won: { 'std:1': 1, 'fast:1': 1, 'guard:1': 1 } })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    const bs = await p.evaluate(() => document.getElementById('beginSub').textContent);
    ok(/突破 3回/.test(bs) && !/新しい隊|双魔/.test(bs), '5 すべて開いた人の表紙：' + bs);
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
