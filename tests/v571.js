// v5.7.1 前の隊の灯：2回目からの遠征は、最初の地図に「前の隊がどこで途絶えたか」を1行出す
// 合格の基準（測る前に決めたもの）：
//  1. 前の遠征が地点5で全滅（倒れた4人）→ 最初の地図に「前の隊の灯は、地点5（第2章 貝殻の書庫）で途絶えた。倒れた4人の灯を継いで…」
//  2. 前の遠征が踏破 →「前の隊は、環廊の底まで灯を届けた。」
//  3. 初めての遠征（記録なし）では出さない
//  4. 2つ目の地点の地図では出さない（最初の地図だけ）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
const H = (o) => JSON.stringify({ runs: 1, clears: o.clear ? 1 : 0, hist: [Object.assign({ clear: false, node: 5, fal: 4, relics: [], ms: 0, at: 1, sq: 'std', depth: 1 }, o)] });
(async () => {
  const b = await launch();
  for (const [meta, want, tag] of [[H({}), /前の隊の灯は、地点5（第2章 貝殻の書庫）で途絶えた。倒れた4人の灯を継いで、ふたたび下る。/, '1 地点5で全滅'], [H({ clear: true, node: 10, fal: 1 }), /前の隊は、環廊の底まで灯を届けた。/, '2 踏破'], [null, null, '3 初めての遠征']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); if (m) localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [TIPS, meta]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    // 踏破していると、隊・深さを選ぶ画面が先に出る：最初の札（標準の隊・深さ1）で進む
    for (let k = 0; k < 4; k++) { if (await p.evaluate(() => { const R = window.__rb.run; return !!(R && R.mode === 'exp' && R.choices && document.getElementById('rvTitle').textContent.includes('進む')); })) break;
      await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(200); await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && !g.disabled) g.click(); }); await p.waitForTimeout(700); }
    const txt = await p.evaluate(() => document.getElementById('runv').innerText.replace(/\s+/g, ''));
    const has = /前の隊/.test(txt);
    ok(want ? want.test(txt.replace(/\s+/g, '')) || want.test(await p.evaluate(() => document.getElementById('runv').innerText)) : !has, tag + '：' + (has ? txt.slice(txt.indexOf('前の隊'), txt.indexOf('前の隊') + 60) : '（出ない）'));
    if (want) {
      // 1つ目の戦闘に勝って、次の地図では出ない
      const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
      await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(800);
      await p.evaluate(() => { window.__rb.enemy.hp = 1; window.__rb.render(); }); await p.click('#btnStart');
      for (let k = 0; k < 150; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => !document.getElementById('runv').hidden)) break; }
      await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(200);
      await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && !g.disabled) g.click(); }); await p.waitForTimeout(900);
      const t2 = await p.evaluate(() => ({ node: window.__rb.run.node, t: document.getElementById('runv').innerText }));
      ok(t2.node === 1 && !/前の隊/.test(t2.t), '4 ' + tag + '：2つ目の地図では出ない（地点' + (t2.node + 1) + '）');
    }
    ok(!errs.length, '4 ' + tag + '：ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
