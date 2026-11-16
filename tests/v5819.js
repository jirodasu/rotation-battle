// v5.8.19 第4章の試作（?deep4・ステージ4設計書 手順2）：「居続けて×2」（影縫い）と「補助列の全員」（鱗粉）の決まり・予告・ヒント
// 合格の基準（測る前に決めたもの）：
//  1 ?deep4 なし：第3章の敵は今までどおり（大蜥蜴・亡霊）、倍率も変わらない
//  2 影縫い：「維持」の予告では攻撃列の狙われる仲間に×2、「回す」の先読みでは×2なし。どちらも、選んだあとの実際の被ダメージと一致する。1ターン目（準備）は×2なし
//  3 鱗粉：攻撃列がいても補助列の全員に当たり、予告の数字と実際の被ダメージが一致する。攻撃列の仲間には当たらない
//  4 ヒント：初めて影縫いを予告されたとき「居続けると狙われる」、初めて鱗粉のとき「補助列を狙う技」が出る
//  5 どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1 };
async function open(b, q, tips) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); } catch (e) { /* */ } }, JSON.stringify(tips || ALL));
  await p.goto(testPage() + (q || '')); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(700);
  return { ctx, p, errs };
}
const prep = (p, foe) => p.evaluate((f) => { const R = window.__rb; R.run.node = 7; R.run.enemy = R.expEnemy(8, null, f); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.enemy.hp = R.enemy.max = 900; R.render(); }, foe);
const waitChoose = async (p) => { for (let i = 0; i < 300; i++) { const s = await p.evaluate(() => [window.__rb.phase, !document.getElementById('tip').hidden]); if (s[1]) await p.evaluate(() => document.getElementById('tipOk').click()); else if (s[0] === 'choose' || s[0] === 'over') return s[0]; await p.waitForTimeout(40); } return ''; };
// 予告（incoming）を「仲間の uid → ダメージ」に。ghost=true は回したあとの並び
const fc = (p, ghost) => p.evaluate((gh) => { const R = window.__rb, g = gh ? R.previewGrid() : R.grid, o = R.incoming(g, R.phase === 'prep', gh), m = {};
  Object.keys(o).forEach((k) => { const [r, c] = k.split(',').map(Number); if (g[r][c]) m[g[r][c].uid] = { d: o[k].d, why: o[k].why, r }; }); return m; }, ghost);
const hps = (p) => p.evaluate(() => { const R = window.__rb, m = {}; R.units(R.grid).forEach(({ u, r }) => { m[u.uid] = { hp: u.hp, r }; }); return m; });
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, '');
    const a = await p.evaluate(() => ({ f: window.__rb.EXP.foes[2].join(','), hp: window.__rb.EXP.hp[7], dmg: window.__rb.EXP.dmg[7] }));
    ok(a.f === 'lizard,chorus' && a.hp === 0.42 && a.dmg === 0.7, '1 ?deep4 なしは今までどおり ' + JSON.stringify(a));
    ok(!errs.length, '1 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, '?deep4');
    const a = await p.evaluate(() => ({ f: window.__rb.EXP.foes[2].join(','), hp: window.__rb.EXP.hp[7] }));
    ok(a.f === 'shade,moth' && a.hp === 0.506, '1 ?deep4 では第3章の戦闘が第4章の敵（試し） ' + JSON.stringify(a));
    await ctx.close(); }
  // 2 影縫い（地点8の倍率）。1ターン目は「影縫い」、2ターン目は「影踏み」。どちらも居続けて×2
  for (const act of ['stay', 'rot']) {
    const { ctx, p, errs } = await open(b, '?deep4');
    await prep(p, 'shade');
    const f0 = await fc(p, false), h0 = await hps(p);
    await p.click('#btnStart'); await waitChoose(p);
    const h1 = await hps(p);
    const t0 = Object.keys(f0).filter((k) => f0[k].r === 0);
    ok(t0.length === 1 && !f0[t0[0]].why && h0[t0[0]].hp - h1[t0[0]].hp === f0[t0[0]].d, '2 1ターン目は×2なし。予告 ' + JSON.stringify(f0) + ' 実際 ' + t0.map((k) => h0[k].hp - h1[k].hp));
    const f = await fc(p, act === 'rot');
    await p.click(act === 'stay' ? '#btnStay' : '#btnRotate'); await waitChoose(p);
    const h2 = await hps(p);
    const tg = Object.keys(f).filter((k) => f[k].r === 0);
    const real = tg.map((k) => (h1[k].hp - (h2[k] ? h2[k].hp : 0)));   // 倒れた仲間は盤から消えるので0として数える。予告が残りHPを超えるときは、残りHPと比べる
    const want = act === 'stay' ? tg.every((k) => f[k].why === '×2') : tg.every((k) => f[k].why !== '×2');
    ok(tg.length === 1 && want && tg.every((k, i) => real[i] === Math.min(f[k].d, h1[k].hp)), '2 「' + (act === 'stay' ? '維持' : '回す') + '」：予告 ' + JSON.stringify(f) + ' 実際 ' + real.join(','));
    const lg = await p.evaluate(() => window.__rb.log.join('\n'));
    ok(act === 'stay' ? /居続けて×2/.test(lg) : !/居続けて×2/.test(lg), '2 ログの「居続けて×2」は維持のときだけ');
    ok(!errs.length, '2 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  // 3 鱗粉（1ターン目）
  { const { ctx, p, errs } = await open(b, '?deep4');
    await prep(p, 'moth');
    const f0 = await fc(p, false), h0 = await hps(p);
    const desc = await p.evaluate(() => window.__rb.enemyCardHTML());
    await p.click('#btnStart'); await waitChoose(p);
    const h1 = await hps(p);
    const mid = Object.keys(h0).filter((k) => h0[k].r === 1), front = Object.keys(h0).filter((k) => h0[k].r === 0);
    ok(mid.length > 0 && mid.every((k) => f0[k] && h0[k].hp - h1[k].hp === f0[k].d), '3 補助列の全員に当たり、予告と一致 予告 ' + JSON.stringify(f0) + ' 実際 ' + mid.map((k) => h0[k].hp - h1[k].hp));
    ok(front.every((k) => !f0[k] && h0[k].hp === h1[k].hp), '3 攻撃列には当たらない');
    ok(/補助列/.test(desc), '3 敵の札に「補助列」');
    ok(!errs.length, '3 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 4 ヒント
  for (const [foe, key, title] of [['shade', 'stayed', '居続けると狙われる'], ['moth', 'mid', '補助列を狙う技']]) {
    const t = Object.assign({}, ALL); delete t[key];
    const { ctx, p, errs } = await open(b, '?deep4', t);
    await prep(p, foe);
    if (foe === 'shade') { await p.click('#btnStart'); }
    let seen = ''; for (let i = 0; i < 200; i++) { seen = await p.evaluate(() => (document.getElementById('tip').hidden ? '' : document.getElementById('tipT').textContent)); if (seen) break; await p.waitForTimeout(40); }
    ok(seen === title, '4 ヒント「' + title + '」：' + seen);
    ok(!errs.length, '4 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
