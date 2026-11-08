// 空の攻撃列 + ランダム連撃：予告の ×2 が実際の hitColumn と一致すること。
// v5.6.2 の第3章・地点10（毒竜の爪の連撃）で予告7×3→実被害14×3だった回帰。
const { launch, testPage } = require('./_env');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  OK  ' : '  NG  ') + msg); if (!cond) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [844, 390]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage() + '?qa&ch=3&loc=10');
    await p.waitForFunction(() => document.documentElement.dataset.qa === '3-10' &&
      !!document.querySelector('#ticket .t-dmg b'), { timeout: 12000 });
    const snap = () => {
      const R = window.__rb, a = R.actOf(R.enemy), intent = document.querySelector('#ticket .t-dmg');
      return { phase: R.phase, rule: a.rule, hits: a.hits || 1, dmg: a.dmg,
        firstRowEmpty: R.grid[0].every((u) => !u), val: intent.querySelector('b').textContent.replace(/\s/g, ''),
        doubled: intent.classList.contains('dbl'), txt: intent.textContent };
    };
    const before = await p.evaluate(snap);
    ok(before.phase === 'prep' && before.rule === 'random' && before.hits === 3 && !before.firstRowEmpty,
      tag + ' 1 第3章の毒竜・ランダム3連撃から開始');
    ok(before.val.includes(String(before.dmg)) && !before.doubled,
      tag + ' 2 攻撃列あり：通常の1ヒット' + before.dmg + '×' + before.hits);
    // 通常の初期4人を失わず、空きマスへ移し、攻撃列だけを空にする。
    await p.evaluate(() => {
      const R = window.__rb, G = R.grid;
      for (let c = 0; c < G[0].length; c++) {
        const u = G[0][c]; if (!u) continue;
        const row = !G[2][c] ? 2 : !G[1][c] ? 1 : -1;
        if (row < 0) throw Error('空きマスがない');
        G[0][c] = null; G[row][c] = u;
      }
      R.render();
    });
    const after = await p.evaluate(snap);
    const predicted = before.dmg * 2;
    ok(after.firstRowEmpty && after.doubled && after.val.includes(String(predicted)) &&
       after.val.includes('×' + after.hits),
      tag + ' 3 攻撃列なし：' + predicted + '×' + after.hits + ' と2倍表示 ' + after.txt);
    // 対象の抽選は不確定だが、1発の被害はどの対象でも同じ。
    const hit = await p.evaluate(async () => {
      const R = window.__rb, G = R.grid;
      const u = G[1][0], beforeHp = u.hp;
      const a = R.actOf(R.enemy);
      await R.hitColumn(0, a.dmg, a.pierce, false);
      return { got: beforeHp - u.hp, damage: a.dmg, frontRow: G[0].every((x) => !x) };
    });
    ok(hit.frontRow && hit.got === predicted,
      tag + ' 4 実際の hitColumn でも1発' + hit.got + '（予告 ' + predicted + '）');
    ok(!errs.length, tag + ' 5 ページエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
