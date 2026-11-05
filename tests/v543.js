// v5.4.3 突入技「踏み込み」は攻撃+8まで（ユーザーの指示：+18は強すぎる。上限8、ほかの突入技は今のまま）
// 合格の基準（測る前に決めたもの）：
//  1. 戦士（踏み込み）を何回強化しても、突入技は「攻撃+8」まで。説明の文も+8
//  2. 上限に届いた戦士は、「突入技の強化」の報酬に出ない
//  3. 前の版の保存（踏み込みが+18、上限の印なし）を続きから遊ぶと、+8にそろう
//  4. ほかの突入技（雷撃）は今のまま強化される（5＋7＋7＝19）
//  5. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); } catch (e) { /* */ } });
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700);
  // 1・4
  const r1 = await p.evaluate(() => { const R = window.__rb, ms = R.run.members, w = ms.find((m) => m.job === 'warrior'), out = {};
    if (w) { w.up = { atk: R.EXP.up.atk * 2 }; R.applyAge(w, false); out.w = { atk: w.entry.atk, desc: w.entry.desc }; w.up = { atk: R.EXP.up.atk * 5 }; R.applyAge(w, false); out.w5 = w.entry.atk; }
    const x = ms.find((m) => m.job === 'witch'); if (x) { x.up = { atk: R.EXP.up.atk * 2 }; R.applyAge(x, false); out.x = x.entry.atk; x.up = null; R.applyAge(x, false); out.x0 = x.entry.atk; }
    return out; });
  ok(r1.w && r1.w.atk === 8 && /攻撃\+8/.test(r1.w.desc) && r1.w5 === 8, '1 踏み込みは何回強化しても攻撃+8 ' + JSON.stringify(r1.w) + ' 5回：' + r1.w5);
  if (r1.x != null) ok(r1.x === r1.x0 + 14, '4 雷撃は今のまま強化される ' + r1.x0 + '→' + r1.x);
  else ok(true, '4 （この隊に魔女がいない）');
  // 2 上限に届いた戦士は強化の候補に出ない
  const r2 = await p.evaluate(() => { const R = window.__rb, w = R.run.members.find((m) => m.job === 'warrior'); if (!w) return null; w.up = { atk: 99 }; R.applyAge(w, false);
    const seen = new Set(); for (let i = 0; i < 40; i++) { R.expReward([]); [...document.querySelectorAll('#rvCards .rv-card')].forEach((c) => { const t = c.textContent; if (/突入技の強化/.test(t)) seen.add(t.match(/突入技の強化\s*(\S+?)(?:の|（|\s|$)/) ? t : t); }); }
    document.getElementById('runv').hidden = true; return { name: w.name, hit: [...seen].some((t) => t.includes('突入技の強化　' + w.name) || t.includes('突入技の強化' + w.name)), n: seen.size }; });
  if (r2) ok(r2.n > 0 && !r2.hit, '2 上限に届いた' + r2.name + 'は「突入技の強化」に出ない（40回のうち別の仲間 ' + r2.n + '種）');
  else ok(true, '2 （この隊に戦士がいない）');
  // 3 前の版の保存
  const r3 = await p.evaluate(() => { const R = window.__rb, w = R.run.members.find((m) => m.job === 'warrior'); if (!w) return null;
    w.up = { atk: 14 }; w.entry = { name: '踏み込み', atk: 18, desc: 'このターン攻撃+18' };
    localStorage.setItem('rb-exp-save', JSON.stringify({ v: '5.4.2', rseed: 7, uidSeq: R.run.members.length + 1, run: Object.assign({}, R.run, { enemy: null }) }));
    return w.uid; });
  if (r3) {
    const key = await p.evaluate(() => Object.keys(localStorage).filter((k) => /exp/.test(k)));
    await p.evaluate(() => { const R = window.__rb; R.resumeExp(); }); await p.waitForTimeout(600);
    const after = await p.evaluate((uid) => { const m = window.__rb.run.members.find((x) => x.uid === uid); return m ? { atk: m.entry.atk, desc: m.entry.desc } : null; }, r3);
    ok(after && after.atk === 8 && /攻撃\+8/.test(after.desc), '3 前の版の保存（+18）を続きから遊ぶと+8 ' + JSON.stringify(after) + ' ' + key.join(','));
  } else ok(true, '3 （この隊に戦士がいない）');
  ok(!errs.length, '5 ページのエラーなし ' + errs.join('/'));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
