// v5.1.55〜 UI監査（A5・C1〜C10）。
// 合格の基準（測る前に決めたもの）：
//  A5. 行動順で味方が先に攻撃して、攻撃対象の敵が倒れる見込みなら、その敵の被ダメ予測と「倒」は出ない（incoming に入らない・予告の数字も出ない）。
//      敵のほうが速い（先に行動する）なら従来どおり出る。敵のHPが十分あれば、予測数値は変わらない（先制撃破の判定を入れない計算と一致）。
//      三位一体では、攻撃対象でない敵の予測は従来どおり出る。実際の戦闘（runTurn）のコードは変えない
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1}';
async function open(b, w, h, kind, node) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: h || 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS_ALL);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(400);
  await p.evaluate(([kind, node]) => { const R = window.__rb; R.run.node = node; R.run.enemy = R.expEnemy(node + 1, null, kind); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, [kind, node]); await p.waitForTimeout(400);
  return { ctx, p };
}
(async () => {
  const b = await launch();
  /* ---- A5 ---- */
  {
    const { ctx, p } = await open(b, 390, 844, 0, 0);
    const r = await p.evaluate(() => {
      const R = window.__rb, E = R.enemy, g = R.grid; const act = () => R.actOf(E);
      // 攻撃のある技になるまでターンを進める
      let guard = 0; while ((!act().dmg || act().rule === 'charge') && guard++ < 6) R.setTurn(R.turn + 1);
      const count = () => Object.keys(R.incoming(g, true, false)).length;
      const full = E.hp, maxHp = E.max;
      E.spd = 99; E.hp = 1; const fastEnemy = count();             // 敵が先に動く → 従来どおり出る
      E.spd = 0; E.hp = 1; const preKill = count();               // 味方が先に倒す → 出ない
      E.hp = full; const healthy = count();                       // HPが十分 → 出る
      const dmgHealthy = JSON.stringify(R.incoming(g, true, false));
      E.hp = 1; E.spd = 99; const dmgFast = JSON.stringify(R.incoming(g, true, false));
      E.hp = full; E.spd = 0; const dmgSlow = JSON.stringify(R.incoming(g, true, false));
      return { fastEnemy, preKill, healthy, same: dmgHealthy === dmgFast && dmgHealthy === dmgSlow, dm: dmgHealthy, hitNull: R.actHit(E, act()) };
    });
    console.log(JSON.stringify(r));
    ok(r.fastEnemy > 0, 'A5 敵が先に動くなら、HP1でも従来どおり被ダメ予測・「倒」が出る');
    ok(r.preKill === 0, 'A5 味方が先に倒せる見込みなら、被ダメ予測も「倒」も出ない');
    ok(r.healthy > 0 && r.same, 'A5 敵のHPが十分なら予測の数値は変わらない（先制撃破の判定を外した状態と一致）');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  {
    const { ctx, p } = await open(b, 390, 844, 'trinity', 4);
    const r = await p.evaluate(() => {
      const R = window.__rb, g = R.grid, J = R.foeById ? null : null;
      const fl = R.foeList(), judge = fl.find((f) => f.id === 'judge'), statue = fl.find((f) => f.id === 'statue');
      // 断罪者に大技（ダメージあり）が来る手番まで進める
      let guard = 0; while (!(R.actOf(judge).dmg) && guard++ < 8) R.setTurn(R.turn + 1);
      const per = (src) => R.incoming(src, true, false).per;
      R.setTgt('judge'); judge.spd = 0; const base = per(g).filter((x) => x.F === judge).length;
      const keep = per(g).filter((x) => x.F !== judge).length;
      judge.hp = 1; const killed = per(g).filter((x) => x.F === judge).length;
      const others = per(g).filter((x) => x.F !== judge).length;
      judge.hp = judge.max; judge.spd = 99; judge.hp = 1; const fast = per(g).filter((x) => x.F === judge).length;
      // 攻撃対象でない敵の予測は、味方が先に倒せる見込みでも従来どおり
      judge.spd = 5; judge.hp = judge.max; R.setTgt('statue'); statue.hp = 1; statue.spd = 0;
      const stat = per(g).filter((x) => x.F === judge).length;
      return { base, keep, killed, others, fast, stat };
    });
    console.log(JSON.stringify(r));
    ok(r.base > 0 && r.killed === 0, 'A5(三位一体) 攻撃対象の断罪者を味方が先に倒せる見込みなら、その予測が消える（' + r.base + '→' + r.killed + '）');
    ok(r.others === r.keep, 'A5(三位一体) 他の敵の予測は従来どおり（' + r.keep + '→' + r.others + '）');
    ok(r.fast > 0, 'A5(三位一体) 断罪者が先に動くなら従来どおり出る');
    ok(r.stat === r.base, 'A5(三位一体) 攻撃対象でない敵の予測は、他の敵が倒れる見込みでも変わらない');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
