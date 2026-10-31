// v5.3.3 画面を減らす
// 合格の基準（測る前に決めたもの）：
//  1. 遠征の途中の勝利では勝利パネルを出さず、報酬の画面へ。題は「勝利」、★（3つの枠、取った数だけ金）、「Nターンで撃破」「報酬を1つ選ぶ」が出る。報酬は4枚
//  2. 戦闘のあとの回復は、報酬の画面の名簿と一文で見える（回復した仲間がいるとき）
//  3. 入れ替えを「やめる」で戻っても、題は「勝利」のまま。報酬を選んで地図へ進むと「勝利」は消える
//  4. 負け・最後の戦い・チュートリアルは、これまでどおり勝利／全滅のパネル
//  5. 地図の「進む」ボタン：選ぶ前は金のボタンに見せない（地の色なし）。選ぶと金になり「「…」へ進む」
//  6. 画面からはみ出さない（393×759・320×568）：題・★・報酬の1枚目が見える
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const tipsOff = () => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } };
async function toBattle(p) {
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700);
  const go = await p.evaluate(() => { const g = document.getElementById('rvGo'), s = getComputedStyle(g); return { dis: g.disabled, bg: s.backgroundImage + s.backgroundColor, t: g.textContent }; });
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200);
  const go2 = await p.evaluate(() => { const g = document.getElementById('rvGo'), s = getComputedStyle(g); return { dis: g.disabled, bg: s.backgroundImage + s.backgroundColor, t: g.textContent }; });
  await p.click('#rvGo'); await p.waitForTimeout(1300);
  return { go, go2 };
}
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 759], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(tipsOff);
    const { go, go2 } = await toBattle(p);
    ok(go.dis && /rgba\(0, 0, 0, 0\)|transparent/.test(go.bg) && !/gradient/.test(go.bg) && /選ぶ/.test(go.t), w + '×' + h + ' 5 選ぶ前の「進む」は地の色なし：' + go.t);
    ok(!go2.dis && /「.+」へ進む/.test(go2.t), w + '×' + h + ' 5 選ぶと押せる：' + go2.t);
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.run.members.forEach((m) => { m.atk = 99; }); R.run.members[2].hp = 3; });
    await p.click('#btnStart');
    let sawResult = false;
    for (let i = 0; i < 100; i++) { const s = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, rv: !document.getElementById('runv').hidden })); if (s.res) sawResult = true; if (s.rv) break; await p.waitForTimeout(100); }
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const R = (e) => e.getBoundingClientRect(), card = document.querySelector('#rvCards .rv-card');
      return { t: document.getElementById('rvTitle').textContent, st: document.querySelectorAll('#rvStars i').length, on: document.querySelectorAll('#rvStars i.on').length, sub: document.getElementById('rvSub').textContent, n: document.querySelectorAll('#rvCards .rv-card').length,
        heal: document.querySelectorAll('#rvRoster .rv-heal').length, note: document.getElementById('rvHealNote').hidden ? '' : document.getElementById('rvHealNote').textContent,
        vis: [document.getElementById('rvTitle'), document.getElementById('rvStars'), card].every((e) => { const q = R(e); return q.top >= 0 && q.top < innerHeight - 20 && q.left >= 0 && q.right <= innerWidth + 1; }), res: !document.getElementById('result').hidden }; });
    ok(!sawResult && !r.res, w + '×' + h + ' 1 勝利パネルは出ない');
    ok(r.t === '勝利' && r.st === 3 && r.on >= 1 && /ターンで撃破/.test(r.sub) && /報酬を1つ選ぶ/.test(r.sub) && r.n === 4, w + '×' + h + ' 1 報酬の画面が「勝利」：★' + r.on + '　' + r.sub + '　札' + r.n);
    ok(r.heal >= 1, w + '×' + h + ' 2 回復した仲間に「+N」（' + r.heal + '人）' + (r.note ? '　' + r.note.slice(0, 30) : ''));
    ok(r.vis, w + '×' + h + ' 6 題・★・報酬の1枚目が画面内');
    // 3. 入れ替え→やめる
    const sw = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].findIndex((c) => /仲間の入れ替え|仲間の補充/.test(c.textContent)));
    if (sw >= 0 && await p.evaluate((i) => /入れ替え/.test(document.querySelectorAll('#rvCards .rv-card')[i].textContent), sw)) {
      await p.click('#rvCards .rv-card[data-i="' + sw + '"]'); await p.waitForTimeout(400);
      await p.click('#rvCards [data-i="-1"]'); await p.waitForTimeout(400);
      ok(await p.evaluate(() => document.getElementById('rvTitle').textContent === '勝利' && !document.getElementById('rvStars').hidden), w + '×' + h + ' 3 入れ替えをやめても「勝利」のまま');
    }
    const tend = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].findIndex((c) => /手当て/.test(c.textContent)));
    await p.click('#rvCards .rv-card[data-i="' + tend + '"]'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => document.getElementById('runv').classList.contains('is-map') && document.getElementById('rvTitle').textContent !== '勝利' && document.getElementById('rvStars').hidden), w + '×' + h + ' 3 地図へ進むと「勝利」と★は消える');
    // 4. 最後の戦い：勝利パネル
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1300);
    await p.evaluate(() => { const R = window.__rb; R.run.node = R.EXP.nodes - 1; R.finishForTest('win'); });
    await p.waitForTimeout(1200);
    const fin = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, t: document.getElementById('rTitle').textContent, nx: document.getElementById('next').textContent }));
    ok(fin.res && /遠征の結果へ/.test(fin.nx), w + '×' + h + ' 4 最後の戦いの勝利はパネル（' + fin.t + '／' + fin.nx + '）');
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 4. 負けはパネル
  {
    const ctx = await b.newContext({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(tipsOff);
    await toBattle(p);
    await p.click('#btnStart'); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(150); }
    await p.evaluate(() => { const R = window.__rb; R.finishForTest('lose'); });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, t: document.getElementById('rTitle').textContent, rv: !document.getElementById('runv').hidden }));
    ok(r.res && r.t === '全滅' && !r.rv, '4 負けは全滅のパネル');
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
