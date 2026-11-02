// v5.4.2 戦闘演出（motion-prompt #024 インパクトシェイク・#003 バースト・#007 カウントアップ）
// 合格の基準（測る前に決めたもの。指示書の「検証で確認すること」）：
//  1. 大技が味方に当たると画面が揺れる（translate）。通常攻撃の被弾では揺れない。揺れは約1.1秒で止まる
//  2. 敵を倒したときだけバーストが出る。味方の被弾では出ない
//  3. ダメージの数字は 0 から数え上がり、0.35秒前後で最後の数字に決まる。途中で数字が減らない。最後の数字は今までと同じ（履歴のダメージと一致）
//  4. 動きを減らす設定では、揺れ・バースト・カウントアップを出さない（数字は最初から最後の値）
//  5. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const watch = () => {
  window.__W = { shake: [], burst: 0, pops: [] };
  const app = document.getElementById('app');
  const f = () => { const t = app.style.translate; if (t && t !== '0px 0px') window.__W.shake.push(performance.now()); requestAnimationFrame(f); }; requestAnimationFrame(f);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.classList && n.classList.contains('burst')) window.__W.burst++;
    if (n.classList && n.classList.contains('pop') && n.classList.contains('dmg')) {
      const rec = { t0: performance.now(), seq: [], end: 0, settle: 0 }; window.__W.pops.push(rec);
      const tx = n.querySelector('text');
      const sv = n.querySelector('svg'); const g = () => { if (!n.isConnected) return; const v = tx.textContent; if (!rec.settle && sv && sv.style.transform) rec.settle = performance.now() - rec.t0; if (rec.seq[rec.seq.length - 1] !== v) { rec.seq.push(v); rec.end = performance.now() - rec.t0; } requestAnimationFrame(g); }; g();
    }
  }))).observe(document.getElementById('fx'), { childList: true });
};
async function toChoose(p) { for (let k = 0; k < 300; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' || !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break; await p.waitForTimeout(50); } }
async function battle(p) {
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
  await p.evaluate(watch);
  await p.click('#btnStart'); await toChoose(p);
}
(async () => {
  const b = await launch();
  const init = () => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } };
  for (const rm of [false, true]) {
    const tag = rm ? '［動きを減らす］' : '';
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: rm ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(init);
    await battle(p);
    // 3 1手目の数字
    const pops = await p.evaluate(() => window.__W.pops.map((r) => ({ seq: r.seq, end: Math.round(r.end), settle: Math.round(r.settle) })));
    const log = await p.evaluate(() => window.__rb.log.join('\n'));
    if (!rm) {
      const nums = (r) => r.seq.map((v) => +v.replace('-', ''));
      ok(pops.length > 0 && pops.every((r) => r.seq.length >= 2 && nums(r).every((v, i, a) => i === 0 || v >= a[i - 1])), '3 ダメージの数字は数え上がり、途中で減らない ' + JSON.stringify(pops.map((r) => r.seq.slice(0, 3).concat(['…', r.seq[r.seq.length - 1]]))));
      // 数え上げは 0.35秒で終わり、終わった瞬間に弾む（弾みの始まり＝数え上げの終わり）。数字そのものは、緩急のため0.35秒より前に最後の値へ届くことがある
      ok(pops.every((r) => r.end <= 420 && r.settle >= 320 && r.settle <= 480), '3 0.35秒で数え終わり、そこで弾む ' + JSON.stringify(pops.map((r) => [r.end, r.settle])));
    } else ok(pops.every((r) => r.seq.length === 1), tag + '4 数字は最初から最後の値 ' + JSON.stringify(pops.map((r) => r.seq)));
    ok(pops.every((r) => { const v = r.seq[r.seq.length - 1].replace('-', ''); return new RegExp('(に|　)' + v + 'ダメージ').test(log); }), tag + '3 最後の数字は履歴のダメージと一致');
    // 1 通常攻撃（大技でない・倒れない）
    const prep1 = await p.evaluate(() => { const R = window.__rb, g = R.grid; for (let t = 1; t <= 14; t++) { R.setTurn(t); const a = R.actOf(R.enemy), inc = R.incoming(g, false, false); if (a.dmg && !a.big && !R.enemy.charged && Object.keys(inc).length && Object.values(inc).every((x) => !x.ko)) { R.render(); return a.name; } } return null; });
    if (prep1) {
      await p.evaluate(() => { window.__W.shake = []; window.__W.burst = 0; });
      await p.click('#btnStay'); await toChoose(p); await p.waitForTimeout(300);
      const w = await p.evaluate(() => ({ shake: window.__W.shake.length, burst: window.__W.burst }));
      ok(w.shake === 0 && w.burst === 0, tag + '1・2 通常攻撃（' + prep1 + '）の被弾では揺れず、バーストも出ない ' + JSON.stringify(w));
    } else ok(true, tag + '1 （この敵では、倒れない通常攻撃のターンが無かった）');
    // 1 大技
    const big = await p.evaluate(() => { const R = window.__rb, g = R.grid; for (let t = 1; t <= 14; t++) { R.setTurn(t); const a = R.actOf(R.enemy), inc = R.incoming(g, false, false); if (a.dmg && Object.keys(inc).length) { a.big = true; a.dmg = 1; a.hits = 1; if (a.rule === 'all' || a.rule === 'random') a.rule = 'lowhp'; /* 1回だけ当てる（全体攻撃・連続攻撃だと揺れが2回続いて、1回分の長さを測れない） */ R.grid.flat().forEach((u) => { if (u) u.hp = u.max; }); R.enemy.hp = R.enemy.max = 999; R.render(); return a.name; } } return null; });
    if (big && await p.evaluate(() => window.__rb.phase === 'choose')) {
      await p.evaluate(() => { window.__W.shake = []; window.__W.burst = 0; });
      await p.click('#btnStay'); await toChoose(p); await p.waitForTimeout(1300);
      const w = await p.evaluate(() => ({ n: window.__W.shake.length, span: window.__W.shake.length ? Math.round(window.__W.shake[window.__W.shake.length - 1] - window.__W.shake[0]) : 0, burst: window.__W.burst, now: document.getElementById('app').style.translate }));
      if (!rm) ok(w.n > 5 && w.span >= 700 && w.span <= 1250 && !w.now, '1 大技の被弾で揺れ、約1.1秒で止まる ' + JSON.stringify(w));
      else ok(w.n === 0, tag + '4 大技でも揺れない ' + JSON.stringify(w));
      ok(w.burst === 0, tag + '2 味方の被弾ではバーストは出ない');
    } else ok(true, tag + '1 （大技を当てられる場面が無かった）');
    // 2 撃破
    if (await p.evaluate(() => window.__rb.phase === 'choose')) {
      await p.evaluate(() => { const R = window.__rb; window.__W.burst = 0; R.enemy.hp = 1; R.render(); });
      await p.click('#btnStay'); for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__W.burst > 0 || !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break; await p.waitForTimeout(25); }
      const n = await p.evaluate(() => window.__W.burst);
      ok(rm ? n === 0 : n === 1, tag + (rm ? '4 撃破でもバーストは出ない' : '2 敵を倒すとバーストが1回出る') + '（' + n + '）');
    }
    ok(!errs.length, tag + '5 ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
