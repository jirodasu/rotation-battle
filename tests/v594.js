// v5.9.4 アーチャー「速射」の強化（2026-11-19 承認・案A）：突入技の強化の攻撃+は、2本のうち1本目の矢だけに乗る
// 合格の基準（測る前に決めたもの）：
//  1 予告：強化1回（攻撃+7）の速射で突入した攻撃は (9+7−防) + (9−防)。強化なしは (9−防)×2。灯2倍（矢3本・攻撃+14）は (9+14−防) + (9−防)×2
//  2 実際：戦闘で速射（強化1回）で突入した仲間の与ダメが、1の式と同じ
//  3 説明：強化した速射の説明は「攻撃回数+1、1本目の攻撃+7」。報酬の札は「1本目の攻撃+7」
//  4 ほかの職業（攻撃+の突入技）は今までどおり：雷撃 攻撃+5+7 は (4+12−防)
//  5 ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1 };
const META = { runs: 3, clears: 3, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1, 'std:3': 1 } };
async function open(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [JSON.stringify(ALL), JSON.stringify(META)]);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', 1); }); await p.waitForTimeout(500);
  return { ctx, p, errs };
}
const ARC = (up) => ({ name: '速射', hits: 1, atk: up || undefined });
(async () => {
  const b = await launch();
  // 1・4 予告（expDmg）
  { const { ctx, p, errs } = await open(b);
    await p.evaluate(() => { const R = window.__rb; R.run.node = 1; R.run.enemy = R.expEnemy(2, null, null); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.enemy.hp = R.enemy.max = 900; R.render(); });
    const r = await p.evaluate(() => {
      const R = window.__rb, T = R.targetFoe(), d = T.def || 0, src = [[null, null], [null, null], [null, null]];
      const mk = (atk, entry) => ({ atk, hits: 1, ranged: 0, entry });
      const v = (u, mul) => { const e = Object.assign({}, u.entry); if (mul) { if (e.atk) e.atk *= mul; e.hits += 1; } return R.expDmg(Object.assign({}, u, { entry: e }), 0, 0, src, false, true, T).val; };
      return { d, up0: v(mk(9, { name: '速射', hits: 1 })), up1: v(mk(9, { name: '速射', hits: 1, atk: 7 })), witch: R.expDmg(mk(4, { name: '雷撃', atk: 12 }), 0, 0, src, false, true, T).val };
    });
    const h = (x) => Math.max(1, x - r.d);
    ok(r.up0 === h(9) * 2, '1 強化なし：(9−防)×2＝' + h(9) * 2 + '（予告 ' + r.up0 + '・防 ' + r.d + '）');
    ok(r.up1 === h(16) + h(9), '1 強化1回：(9+7−防)+(9−防)＝' + (h(16) + h(9)) + '（予告 ' + r.up1 + '。以前は ' + h(16) * 2 + '）');
    ok(r.witch === h(16), '4 雷撃（攻撃+5+7）は今までどおり＝' + h(16) + '（予告 ' + r.witch + '）');
    // 灯2倍は boostEntry を通るので、遊びと同じ道で：灯の倍率2の速射
    const lamp = await p.evaluate(() => { const R = window.__rb, T = R.targetFoe(); const u = { atk: 9, hits: 1, ranged: 0, entry: { name: '速射', hits: 2, atk: 14 } }; return R.expDmg(u, 0, 0, [[null, null], [null, null], [null, null]], false, true, T).val; });
    ok(lamp === h(23) + h(9) * 2, '1 灯2倍（矢3本・攻撃+14）：(9+14−防)+(9−防)×2＝' + (h(23) + h(9) * 2) + '（予告 ' + lamp + '）');
    ok(!errs.length, '1 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 2 実際：前の列に入る仲間を全員「強化1回の速射」にして1ターン戦い、記録の与ダメを見る
  { const { ctx, p, errs } = await open(b);
    await p.evaluate(() => { const R = window.__rb; R.run.node = 1; R.run.enemy = R.expEnemy(2, null, null); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.enemy.hp = R.enemy.max = 900; R.render(); });
    const names = await p.evaluate(() => { const R = window.__rb, out = []; R.units(R.grid).forEach(({ u }) => { u.atk = 9; u.hits = 1; u.ranged = 0; u.atkSup = 0; u.entry = { name: '速射', hits: 1, atk: 7, desc: 'このターン攻撃回数+1、1本目の攻撃+7' }; out.push(u.name); }); R.render(); return out; });
    const waitC = async () => { await p.waitForTimeout(200); for (let i = 0; i < 400; i++) { const s = await p.evaluate(() => [window.__rb.phase, !document.getElementById('tip').hidden]); if (s[1]) await p.evaluate(() => document.getElementById('tipOk').click()); else if (s[0] === 'choose' || s[0] === 'over') break; await p.waitForTimeout(40); } };
    await p.click('#btnStart'); await waitC();
    const n0 = await p.evaluate(() => { const R = window.__rb; R.units(R.grid).forEach(({ u }) => { u.atk = 9; u.hits = 1; u.ranged = 0; u.atkSup = 0; u.entry = { name: '速射', hits: 1, atk: 7, desc: '' }; }); R.setGauge(9); return R.log.length; });
    await p.click('#btnRotate'); await waitC();
    const r = await p.evaluate((n) => ({ log: window.__rb.log.slice(n).map((x) => (typeof x === 'string' ? x : x.t || x.text || JSON.stringify(x))), d: window.__rb.targetFoe() ? window.__rb.targetFoe().def || 0 : 0 }), n0);
    const h = (x) => Math.max(1, x - r.d), want = h(16) + h(9);
    const hits = r.log.filter((x) => /の攻撃.*　(\d+)ダメージ/.test(x)).map((x) => +x.match(/　(\d+)ダメージ/)[1]);
    ok(hits.length > 0 && hits.every((x) => x === want), '2 実際の与ダメ＝(9+7−防)+(9−防)＝' + want + '（記録 ' + JSON.stringify(hits) + '）');
    ok(!errs.length, '2 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 3 説明と報酬の札
  { const { ctx, p, errs } = await open(b);
    const r = await p.evaluate(() => { const R = window.__rb, m = R.run.members[0]; m.job = 'archer'; m.up = { atk: 7 }; R.applyAge(m, true); const desc = m.entry.desc; R.run.members.splice(1); R.run.relics = R.EXP.relics.map((x) => x.id); R.expReward([]); return { desc, cards: document.getElementById('rvCards').innerText }; });
    ok(/攻撃回数\+1、1本目の攻撃\+7/.test(r.desc), '3 説明：' + r.desc);
    ok(/1本目の攻撃\+7/.test(r.cards), '3 報酬の札に「1本目の攻撃+7」 ' + JSON.stringify(r.cards.split('\n').filter((x) => /攻撃/.test(x))));
    ok(!errs.length, '3 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
