// v5.8.18 戦闘開始時の予告と、実際の1ターン目のずれ（表示だけ。実際の戦闘の解決・数値は変えない）
// 合格の基準（測る前に決めたもの）：
//  1 不動の構えあり。前の戦闘で維持した回数（stayN）が残っていても、戦闘開始前（準備）の盤の剣の数字の合計・敵パネルの与ダメ合計が、1ターン目の実際の与ダメージと一致する
//  2 ?lamp。灯の段が開始段と違う値で残っていても（1戦目は0）、準備の予告が1ターン目の実際と一致する（灯の開始段を含む）
//  3 決断パネルの「維持すると」（盤の数字）と「回すと」（先読みの数字）が、それぞれ選んだあとの実際と一致する（不動の構え・灯とも）
//  4 どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = JSON.stringify({ stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, rel: 1 });
async function open(b, q) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); } catch (e) { /* */ } }, TIPS);
  await p.goto(testPage() + (q || '')); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(700);
  return { ctx, p, errs };
}
// 単体の敵（祈り手・乱数の技なし）を準備の画面に出す。敵のHPは倒しきらない大きさにする
async function prep(p, relics, stale) {
  await p.evaluate(([rl, st]) => { const R = window.__rb; R.run.relics = rl.slice();
    const ids = Object.keys(R.run.map).filter((id) => R.run.map[id].foe && R.routeChoice(id).type === 'battle');
    const id = ids[0], c = R.routeChoice(id); R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, R.run.map[id].foe);
    document.getElementById('runv').hidden = true; R.toPrepForTest();
    if (st.stayN != null) R.stayN = st.stayN; if (st.lamp != null) R.lamp = st.lamp;
    R.enemy.hp = R.enemy.max = 900; R.render(); }, [relics, stale]);
  await p.waitForTimeout(300);
}
const shown = (p) => p.evaluate(() => { const R = window.__rb;
  const badge = [...document.querySelectorAll('#board .tok .dm')].reduce((a, e) => a + (+(e.textContent.match(/\d+/) || [0])[0]), 0);
  return { badge, hp: R.enemy.hp, ph: R.phase }; });
const fcGhost = (p) => p.evaluate(() => { const R = window.__rb, g = R.previewGrid(); let t = 0; R.units(g).forEach(({ u, r, c }) => { const d = R.expDmg(u, r, c, g, true, true); if (d) t += d.val; }); return t; });
const waitChoose = async (p) => { for (let i = 0; i < 300; i++) { const s = await p.evaluate(() => [window.__rb.phase, !document.getElementById('tip').hidden]); if (s[1]) await p.evaluate(() => document.getElementById('tipOk').click()); else if (s[0] === 'choose' || s[0] === 'over') return s[0]; await p.waitForTimeout(40); } return ''; };
(async () => {
  const b = await launch();
  for (const [name, q, relics, stale] of [['不動の構え（前の戦闘の維持2回が残る）', '', ['stance'], { stayN: 2 }], ['?lamp 1戦目（灯の段0のまま）', '?lamp', [], { lamp: 0 }], ['?lamp（前の戦闘の段3が残る）', '?lamp', [], { lamp: 3 }]]) {
    for (const act of ['stay', 'rot']) {
      const { ctx, p, errs } = await open(b, q);
      await prep(p, relics, stale);
      const s0 = await shown(p);
      await p.click('#btnStart'); await waitChoose(p);
      const s1 = await shown(p);
      const real1 = s0.hp - s1.hp;
      ok(s0.ph === 'prep' && s0.badge === real1, name + ' 1 準備の盤の剣の合計 ' + s0.badge + ' ＝ 1ターン目の実際 ' + real1);
      // 2ターン目：維持なら盤の数字、回すなら先読みの数字と、実際を比べる
      const fc = act === 'stay' ? s1.badge : await fcGhost(p);
      await p.click(act === 'stay' ? '#btnStay' : '#btnRotate'); await waitChoose(p);
      const s2 = await shown(p);
      ok(fc === s1.hp - s2.hp, name + ' 3 2ターン目「' + (act === 'stay' ? '維持' : '回す') + '」の予告 ' + fc + ' ＝ 実際 ' + (s1.hp - s2.hp));
      ok(!errs.length, name + ' 4 エラーなし ' + errs.join(' / ')); await ctx.close();
    }
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
