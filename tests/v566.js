// v5.6.4 の空列ランダム連撃：予告の1発値×2と実際の hitColumn を照合。
// 地点10・最終ボスの5パターンも表示確認（戦闘の全5ターンを再生する試験ではない）。
const { launch, testPage } = require('./_env');
let fails = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [844, 390]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage() + '?qa&ch=3&loc=10');
    await p.waitForFunction(() => document.documentElement.dataset.qa === '3-10' &&
      !!document.querySelector('#ticket .t-dmg b'), null, { timeout: 15000 });
    const initial = await p.evaluate(() => {
      const R = window.__rb, E = R.enemy, seen = [];
      for (let turn = 1; turn <= E.pattern.length; turn++) {
        R.setTurn(turn);
        const a = R.actOf(E), txt = document.getElementById('ticket').textContent;
        seen.push({ name: a.name, rule: a.rule, visible: txt.includes(a.name),
          aim: a.rule !== 'charge' || /狙い/.test(txt) });
      }
      R.setTurn(1);
      const a = R.actOf(E), t = document.querySelector('#ticket .t-dmg');
      return { boss: E.boss, count: seen.length, seen, first: a.rule, dmg: a.dmg,
        hits: a.hits || 1, text: t.textContent, doubled: t.classList.contains('dbl'),
        front: R.grid[0].some(Boolean) };
    });
    ok(initial.boss && initial.count === 5 && initial.seen.every((x) => x.visible && x.aim),
      tag + ' 1 毒竜の5つの行動予告（ための狙い含む） ' + JSON.stringify(initial.seen));
    ok(initial.first === 'random' && initial.hits === 3 && initial.front && !initial.doubled &&
      initial.text.includes(String(initial.dmg)),
      tag + ' 2 通常配置の爪の連撃 ' + initial.text);
    const empty = await p.evaluate(() => {
      const R = window.__rb, G = R.grid, ms = G.flat().filter(Boolean);
      if (ms.length !== 4) throw Error('初期4人ではない');
      G.forEach((row) => row.fill(null));
      ms.forEach((u, i) => { G[1 + Math.floor(i / 2)][i % 2] = u; u.hp = u.max; });
      R.render();
      const a = R.actOf(R.enemy), t = document.querySelector('#ticket .t-dmg');
      return { empty: G[0].every((u) => !u), row: G[1].every(Boolean),
        rule: a.rule, hits: a.hits, dmg: a.dmg, text: t.textContent,
        doubled: t.classList.contains('dbl'), expected: a.dmg * 2 };
    });
    ok(empty.empty && empty.row && empty.rule === 'random' && empty.doubled &&
      empty.text.includes(String(empty.expected)) && empty.text.includes('×' + empty.hits),
      tag + ' 3 攻撃列が空：予告 ' + empty.text + '（1発 ' + empty.expected + '）');
    const actual = await p.evaluate(async () => {
      const R = window.__rb, G = R.grid, u = G[1][0], before = u.hp;
      const a = R.actOf(R.enemy);
      await R.hitColumn(0, a.dmg, a.pierce, false);
      return { before, after: u.hp, got: before - u.hp, expected: Math.min(before, a.dmg * 2) };
    });
    ok(actual.got === actual.expected && actual.expected === Math.min(actual.before, empty.expected),
      tag + ' 4 実際の hitColumn と一致 ' + JSON.stringify(actual));
    ok(!errs.length, tag + ' 5 ページエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
