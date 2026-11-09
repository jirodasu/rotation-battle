// v5.7.6 灯の祝福（提案B）：2回目からの遠征の最初に1つ選ぶ
// 合格の基準（測る前に決めたもの）：
//  1. 初めての遠征（遠征0回）では出ない（そのまま地図）
//  2. 遠征1回・前の隊は地点5で途絶えた → 「灯の祝福」に3枚（回転レリック・灯の油・突入技の強化）。灯の加護は無い
//     「灯の油」を選ぶ → 全員の最大HPが+5、HPも+5（全快のまま）。そのあと最初の地図が出る（前の隊の灯の1行つき）
//  3. 前の隊が地点2で途絶えた → 4枚目「灯の加護」がある。選ぶと第1章の敵のHPが0.75倍（地点1・章の主）、第2章の敵は変わらない
//  4. 選んだあと開き直しても、祝福は出ず地図に戻る。灯の加護は残る。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  const open = async (meta) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); if (m) localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [TIPS, meta && JSON.stringify(meta)]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    return { ctx, p, errs };
  };
  const view = (p) => p.evaluate(() => ({ title: document.getElementById('rvTitle').textContent, cards: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()), map: document.getElementById('runv').classList.contains('is-map') }));
  // 1
  { const { ctx, p, errs } = await open(null); const v = await view(p);
    ok(v.map && v.title !== '灯の祝福', '1 初めての遠征では出ない（' + v.title + '）'); ok(!errs.length, '1 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 2
  { const { ctx, p, errs } = await open({ runs: 1, best: 4, hist: [{ clear: false, node: 5, fal: 4 }] }); const v = await view(p);
    const kinds = v.cards.map((c) => (/回転レリック/.test(c) ? 'relic' : /灯の油/.test(c) ? 'oil' : /突入技の強化/.test(c) ? 'up' : /灯の加護/.test(c) ? 'ward' : '?'));
    ok(v.title === '灯の祝福' && kinds.join(',') === 'relic,oil,up', '2 祝福に3枚 ' + kinds.join(','));
    const before = await p.evaluate(() => window.__rb.run.members.map((m) => [m.max, m.hp]));
    const oi = kinds.indexOf('oil'); await p.click('#rvCards .rv-card[data-i="' + oi + '"]'); await p.waitForTimeout(700);
    const after = await p.evaluate(() => window.__rb.run.members.map((m) => [m.max, m.hp]));
    const v2 = await view(p), line = await p.evaluate(() => document.getElementById('runv').innerText);
    ok(after.every((x, i) => x[0] === before[i][0] + 5 && x[1] === x[0]), '2 灯の油：全員の最大HP+5・全快 ' + JSON.stringify(before) + '→' + JSON.stringify(after));
    ok(v2.map && /前の隊の灯は、地点5/.test(line), '2 そのあと最初の地図（前の隊の灯つき）');
    // 4：開き直し
    await p.reload(); await p.waitForTimeout(500); if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
    await p.click('#resume'); await p.waitForTimeout(800);
    const v3 = await view(p);
    ok(v3.map && v3.title !== '灯の祝福', '4 開き直すと地図に戻り、祝福は出ない（' + v3.title + '）');
    ok(!errs.length, '2 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 3
  { const { ctx, p, errs } = await open({ runs: 1, best: 1, hist: [{ clear: false, node: 2, fal: 4 }] }); const v = await view(p);
    const wi = v.cards.findIndex((c) => /灯の加護/.test(c));
    ok(v.cards.length === 4 && wi === 3, '3 前の隊が地点2 → 4枚目に灯の加護 ' + v.cards.map((c) => c.slice(0, 8)).join('｜'));
    const base = await p.evaluate(() => { const R = window.__rb; return { s1: R.expEnemy(1, null, 0).hp, chief: R.expEnemy(3, null, 0).hp, ch2: R.expEnemy(4, null, 'binder').hp }; });
    await p.click('#rvCards .rv-card[data-i="' + wi + '"]'); await p.waitForTimeout(700);
    const w = await p.evaluate(() => { const R = window.__rb; return { ward: R.run.ward, s1: R.expEnemy(1, null, 0).hp, chief: R.expEnemy(3, null, 0).hp, ch2: R.expEnemy(4, null, 'binder').hp }; });
    ok(w.ward === 1 && w.s1 === Math.round(base.s1 * 0.75) && Math.abs(w.chief - base.chief * 0.75) <= 1 && w.ch2 === base.ch2, '3 灯の加護：第1章 ' + base.s1 + '→' + w.s1 + '・主 ' + base.chief + '→' + w.chief + '、第2章は ' + base.ch2 + '→' + w.ch2);
    await p.reload(); await p.waitForTimeout(500); if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
    await p.click('#resume'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => window.__rb.run.ward === 1), '4 開き直しても灯の加護は残る');
    ok(!errs.length, '3 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
