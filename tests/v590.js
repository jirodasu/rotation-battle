// v5.9.0 深さ4の新しい敵（第1弾）：重石の番兵・重い扉の番人・時告げの砂時計と、深さ4の「章の最初の列の戦闘は新しい敵」（2026-11-18 承認・案B）
// 合格の基準（測る前に決めたもの）：
//  1 地図：深さ1〜3では新しい敵は出ない。深さ4では、章の最初の列（地点1・4・7）の戦闘がその章の新しい敵になり、ほかの戦闘にも候補として出る
//  2 重石の番兵：押し潰しは前列でHPがいちばん多い仲間に当たる。同じHPなら左。予告の数字と実際の被ダメージが一致する
//  3 重い扉の番人：回すのに気力3。気力2では回せず、3なら回せて、回すと気力が3減る。「回す」の●は3つが「要る」印
//  4 時告げの砂時計：5ターン目に「終の刻まで あと3ターン」、7ターン目に「あと1ターン」。8ターン目は「終の刻」（防無効）で、数えの表示は出ない
//  5 ヒント：初めて会った戦闘の選ぶフェーズで（準備の案内と重ねずに）「元気な仲間ほど狙う」「重い扉」「終の刻が近い」がそれぞれ1回出る
//  6 QA の foe=sentinel|gate|hourglass が効く。どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1 };
const META = { clears: 3, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1, 'std:3': 1 } };
async function open(b, q, tips) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [JSON.stringify(tips || ALL), JSON.stringify(META)]);
  await p.goto(testPage() + (q || '')); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', 4); }); await p.waitForTimeout(500);
  return { ctx, p, errs };
}
// step：地点（倍率）。foe：敵の鍵
const prep = (p, step, foe) => p.evaluate(([s, f]) => { const R = window.__rb; R.run.node = s - 1; R.run.enemy = R.expEnemy(s, null, f); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.enemy.hp = R.enemy.max = 900; R.render(); }, [step, foe]);
const waitChoose = async (p) => { for (let i = 0; i < 300; i++) { const s = await p.evaluate(() => [window.__rb.phase, !document.getElementById('tip').hidden]); if (s[1]) await p.evaluate(() => document.getElementById('tipOk').click()); else if (s[0] === 'choose') return; await p.waitForTimeout(40); } };
const fc = (p, ghost) => p.evaluate((gh) => { const R = window.__rb, g = gh ? R.previewGrid() : R.grid, o = R.incoming(g, R.phase === 'prep', gh), m = {};
  Object.keys(o).forEach((k) => { const [r, c] = k.split(',').map(Number); if (g[r][c]) m[g[r][c].uid] = { d: o[k].d, r, c }; }); return m; }, ghost);
const hps = (p) => p.evaluate(() => { const R = window.__rb, m = {}; R.units(R.grid).forEach(({ u, r, c }) => { m[u.uid] = { hp: u.hp, r, c }; }); return m; });
(async () => {
  const b = await launch();
  // 1 地図
  { const { ctx, p, errs } = await open(b);
    const r = await p.evaluate(() => {
      const R = window.__rb, NEW = ['sentinel', 'gate', 'hourglass'], out = {};
      for (const d of [1, 2, 3, 4]) {
        R.run.depth = d; let newAny = 0, first = { 1: [], 4: [], 7: [] }, other = 0;
        for (let i = 0; i < 60; i++) { const m = R.expFill(); Object.keys(m).forEach((id) => { const n = R.ROUTE.nodes[id], f = m[id].foe; if (f == null || !n) return; if (NEW.includes(f)) newAny++; if (first[n.step]) first[n.step].push(f); else if (NEW.includes(f)) other++; }); }
        out[d] = { newAny, other, s1: [...new Set(first[1])].join(','), s4: [...new Set(first[4])].join(','), s7: [...new Set(first[7])].join(',') };
      }
      return out;
    });
    ok(r[1].newAny === 0 && r[2].newAny === 0 && r[3].newAny === 0, '1 深さ1〜3では新しい敵は出ない ' + JSON.stringify([r[1].newAny, r[2].newAny, r[3].newAny]));
    ok(r[4].s1 === 'sentinel' && r[4].s4 === 'gate' && r[4].s7 === 'hourglass', '1 深さ4：地点1・4・7の戦闘は新しい敵 ' + JSON.stringify(r[4]));
    ok(r[4].other > 0, '1 深さ4：ほかの戦闘にも新しい敵が候補として出る（' + r[4].other + '回）');
    ok(!errs.length, '1 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 2 重石の番兵：1ターン目＝押し潰し（HP最多）
  for (const tie of [false, true]) {
    const { ctx, p, errs } = await open(b);
    await prep(p, 2, 'sentinel');
    await p.evaluate((t) => { const R = window.__rb, F = R.units(R.grid).filter((x) => x.r === 0).sort((a, b) => a.c - b.c); if (F.length === 2) { F[0].u.hp = t ? 30 : 20; F[1].u.hp = t ? 30 : 40; } R.render(); }, tie);
    const f0 = await fc(p, false), h0 = await hps(p);
    await p.click('#btnStart'); await waitChoose(p);
    const h1 = await hps(p);
    const front = Object.keys(h0).filter((k) => h0[k].r === 0).sort((a, b) => h0[a].c - h0[b].c);
    const hit = front.filter((k) => h1[k] && h1[k].hp < h0[k].hp);
    const want = tie ? front[0] : front.reduce((a, k) => (h0[k].hp > h0[a].hp ? k : a), front[0]);
    ok(front.length === 2 && hit.length === 1 && hit[0] === want && f0[want] && h0[want].hp - h1[want].hp === f0[want].d, '2 押し潰し：' + (tie ? '同じHPなら左' : 'HPがいちばん多い仲間') + ' 予告 ' + JSON.stringify(f0) + ' 前 ' + JSON.stringify(h0) + ' 後 ' + JSON.stringify(h1));
    const card = await p.evaluate(() => window.__rb.enemyCardHTML());
    ok(/HPが最も多い/.test(card), '2 敵の札に「HPが最も多い」');
    ok(!errs.length, '2 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  // 3 重い扉の番人
  { const { ctx, p, errs } = await open(b);
    await prep(p, 5, 'gate'); await p.click('#btnStart'); await waitChoose(p);
    await p.evaluate(() => window.__rb.setGauge(2)); await p.waitForTimeout(100);
    const s2 = await p.evaluate(() => ({ block: document.getElementById('btnRotate').dataset.block || '', need: document.querySelectorAll('#btnRotate .pips i.need').length }));
    await p.evaluate(() => window.__rb.setGauge(3)); await p.waitForTimeout(100);
    const s3 = await p.evaluate(() => ({ block: document.getElementById('btnRotate').dataset.block || '' }));
    await p.click('#btnRotate'); await p.waitForTimeout(200);
    const g = await p.evaluate(() => window.__rb.gauge);
    ok(s2.block === 'low' && s2.need === 3 && !s3.block, '3 気力2では回せず、3なら回せる。●は3つが「要る」 ' + JSON.stringify([s2, s3]));
    ok(g === 0, '3 回すと気力が3減る（3→' + g + '）');
    ok(!errs.length, '3 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 4 時告げの砂時計
  { const { ctx, p, errs } = await open(b);
    await prep(p, 8, 'hourglass'); await p.click('#btnStart'); await waitChoose(p);
    const at = async (t) => { await p.evaluate((x) => window.__rb.setTurn(x), t); await p.waitForTimeout(80); return p.evaluate(() => ({ t: document.getElementById('ticket').textContent.replace(/\s+/g, ' '), name: window.__rb.actOf(window.__rb.enemy).name, pierce: !!window.__rb.actOf(window.__rb.enemy).pierce })); };
    const t4 = await at(4), t5 = await at(5), t7 = await at(7), t8 = await at(8);
    ok(!/終の刻まで/.test(t4.t) && /終の刻まで あと3ターン/.test(t5.t) && /終の刻まで あと1ターン/.test(t7.t), '4 5ターン目に「あと3」、7ターン目に「あと1」（4ターン目は出ない） ' + JSON.stringify([t4.t, t5.t, t7.t]));
    ok(t8.name === '終の刻' && t8.pierce && !/終の刻まで/.test(t8.t), '4 8ターン目は「終の刻」（防無効）で、数えは出ない ' + JSON.stringify(t8));
    ok(!errs.length, '4 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 5 ヒント
  for (const [foe, key, title, turn] of [['sentinel', 'highhp', '元気な仲間ほど狙う', 0], ['gate', 'gate', '重い扉', 0], ['hourglass', 'doom', '終の刻が近い', 5]]) {
    const t = Object.assign({}, ALL); delete t[key];
    const { ctx, p, errs } = await open(b, '', t);
    await prep(p, 5, foe); await p.click('#btnStart');   // どれも選ぶフェーズで出る（準備は陣立ての案内と重ねない）
    if (turn) { await p.waitForTimeout(400); await p.evaluate((x) => window.__rb.setTurn(x), turn); }
    let seen = ''; for (let i = 0; i < 200; i++) { seen = await p.evaluate(() => (document.getElementById('tip').hidden ? '' : document.getElementById('tipT').textContent)); if (seen === title) break; if (seen) await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(40); }
    ok(seen === title, '5 ヒント「' + title + '」：' + seen);
    ok(!errs.length, '5 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  // 6 QA
  for (const [f, q] of [['sentinel', 'ch=1&loc=2'], ['gate', 'ch=2&loc=4'], ['hourglass', 'ch=3&loc=7']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); } catch (e) { /* */ } });
    await p.goto(testPage() + '?qa&depth=4&v=none&foe=' + f + '&' + q); await p.waitForTimeout(1200);
    const n = await p.evaluate(() => window.__rb.enemy && window.__rb.enemy.name);
    ok(n === { sentinel: '重石の番兵', gate: '重い扉の番人', hourglass: '時告げの砂時計' }[f], '6 QA foe=' + f + '：' + n);
    ok(!errs.length, '6 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
