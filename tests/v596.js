// v5.9.6 敵の名前の帯と、ヒント・案内の吹き出しを重ねない（2026-11-19 通しプレイの指摘 1）
// 合格の基準（測る前に決めたもの）：
//  1 遠征の最初の戦闘：帯が出ている間は、初戦の案内の吹き出し（firstGuide）もヒントも出ない。帯が消えたあと3秒以内に吹き出しが出る
//  2 深さ1の章の主：帯が出ている間は「章の主の技を見よう」のヒントが出ない。帯が消えたあと3秒以内に出る
//  3 動きを減らす設定（帯が出ない）では、ヒントは今までどおり1秒以内に出る
//  4 どれもページのエラーなし。帯のあとの画面を 320・375・390px で撮る（tests/out/v596_*.png）
const { launch, testPage } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const OUT = path.join(__dirname, 'out');
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1, einfo: 1 };
// 0.1秒ごとに見て、帯・吹き出し・ヒントの重なりを記録する
const watch = async (p, ms) => {
  const rows = [];
  for (let t = 0; t < ms; t += 100) {
    rows.push(await p.evaluate(() => { const ch = !document.getElementById('chapter').hidden, tip = !document.getElementById('tip').hidden, fg = document.getElementById('firstGuide'); return { ch, tip, tipT: tip ? document.getElementById('tipT').textContent : '', fg: !!(fg && !fg.hidden && getComputedStyle(fg).display !== 'none') }; }));
    await p.waitForTimeout(100);
  }
  return rows;
};
(async () => {
  const b = await launch();
  // 1 最初の戦闘（初めての遠征）
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, JSON.stringify(ALL));
    await p.goto(testPage()); await p.waitForTimeout(400);
    await p.evaluate(() => localStorage.removeItem('rb-firstmap'));   // 初めての人と同じ：最初の地図を飛ばして、すぐ最初の戦闘へ（v5.8.7）
    await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin');
    const rows = await watch(p, 5500);
    const both = rows.filter((r) => r.ch && (r.fg || r.tip)).length, chOn = rows.some((r) => r.ch), last = rows.map((r) => r.ch).lastIndexOf(true), fgAt = rows.findIndex((r, k) => k > last && r.fg);
    ok(chOn && both === 0, w + '×' + h + ' 1 帯が出ている間は吹き出し・ヒントなし（重なり ' + both + ' 回／帯 ' + rows.filter((r) => r.ch).length + ' 回）');
    ok(fgAt > last && fgAt - last <= 30, w + '×' + h + ' 1 帯のあと吹き出しが出る（' + (fgAt - last) * 100 + 'ms後）');
    await p.screenshot({ path: path.join(OUT, 'v596_' + w + '.png') });
    ok(!errs.length, w + '×' + h + ' 4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 2・3 深さ1の章の主
  for (const rm of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const T = Object.assign({}, ALL); delete T.einfo;
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); localStorage.setItem('rb-exp', JSON.stringify({ runs: 3, clears: 0, best: 3 })); } catch (e) { /* */ } }, JSON.stringify(T));
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(800);
    // 章の主の1つ手前まで進めたことにして、地図を出し直す
    const ready = await p.evaluate(() => { const R = window.__rb, st = R.EXP.chiefs[0]; for (let n = 0; n < 40 && R.run.node < st - 1; n++) { const c = R.run.choices[0]; R.run.pendId = R.routeNodeId(c); R.runAdvance ? 0 : 0; R.run.node++; R.routePick && R.routePick(c); R.run.choices = R.routeChoices(); } R.expShowMap([]); return { node: R.run.node, chief: R.expIsChief(R.run.node + 1), n: R.run.choices.length }; });
    if (!ready.chief) { ok(false, '2 章の主の手前まで進められない ' + JSON.stringify(ready)); await ctx.close(); continue; }
    await p.waitForTimeout(500);
    await p.click('#rvCards .rv-card[data-i="0"]').catch(() => {}); await p.click('#rvGo').catch(() => {});
    const rows = await watch(p, 4500);
    const both = rows.filter((r) => r.ch && r.tip).length, last = rows.map((r) => r.ch).lastIndexOf(true), tipAt = rows.findIndex((r) => r.tipT === '章の主の技を見よう');
    if (!rm) {
      ok(last >= 0 && both === 0, '2 章の主：帯が出ている間はヒントなし（重なり ' + both + ' 回）');
      ok(tipAt > last && tipAt - last <= 30, '2 帯のあと「章の主の技を見よう」が出る（' + (tipAt - last) * 100 + 'ms後）');
    } else {
      ok(last < 0 && tipAt >= 0 && tipAt <= 10, '3 動きを減らす設定：帯なし、ヒントは ' + tipAt * 100 + 'ms で出る');
    }
    ok(!errs.length, (rm ? '3' : '2') + ' ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
