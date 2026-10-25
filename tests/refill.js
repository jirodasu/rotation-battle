// 仲間の補充：仲間が欠けている（帰らなかった）ときは、報酬の「入れ替え」が「補充」になり、誰も抜けずに空いたマスへ加わる。
// 4人そろっているときは、今まで通り「入れ替え」。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) {} });
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300);
  await p.click('#begin'); await p.waitForTimeout(600);
  const cardsOf = () => p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.querySelector('b').textContent.replace(/\s+/g, ' ').trim()));
  // 4人そろっている：入れ替え
  for (let k = 0; k < 6; k++) {
    await p.evaluate(() => { const R = window.__rb; R.enemy || (window.__fakeEnemy = 1); document.getElementById('runv').hidden = true; R.run.enemy = R.expEnemy(1, null, 0); R.toPrepForTest(); R.expReward([]); }); await p.waitForTimeout(250);
    const c = await cardsOf(); if (c.some((t) => /仲間の/.test(t))) { ok(c.some((t) => /仲間の入れ替え/.test(t)) && !c.some((t) => /補充/.test(t)), '4人のとき：「仲間の入れ替え」が出る ' + JSON.stringify(c)); break; }
  }
  // 1人欠けた（帰らなかった）
  const before = await p.evaluate(() => { const R = window.__rb, run = R.run, out = run.members.pop(); out.fate = 'fallen'; run.gone.push(out); return { n: run.members.length, gone: run.gone.length, out: out.uid, pos: [out.r, out.c] }; });
  await p.evaluate(() => window.__rb.expReward([])); await p.waitForTimeout(250);
  const c2 = await cardsOf();
  ok(c2.some((t) => /仲間の補充/.test(t)) && !c2.some((t) => /入れ替え/.test(t)), '欠けたとき：「入れ替え」ではなく「仲間の補充」が出る ' + JSON.stringify(c2));
  const i = c2.findIndex((t) => /仲間の補充/.test(t));
  await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.waitForTimeout(150);
  if (await p.$('#rvGo')) await p.click('#rvGo').catch(() => {});
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => { const run = window.__rb.run; return { n: run.members.length, left: run.gone.filter((g) => g.fate === 'left').length, gone: run.gone.length, title: document.getElementById('rvTitle') ? document.getElementById('rvTitle').textContent : '' }; });
  ok(after.n === 4 && after.left === 0 && after.gone === before.gone, '補充を選ぶと4人に戻り、誰も隊を離れない ' + JSON.stringify({ before, after }));
  // 次の戦闘の盤に4人とも並ぶ（新しい仲間は空いたマスへ）
  const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(700);
  const onBoard = await p.evaluate(() => { const g = window.__rb.grid, ids = []; g.forEach((row) => row.forEach((u) => { if (u) ids.push(u.uid); })); return { n: ids.length, all: window.__rb.run.members.every((m) => ids.includes(m.uid)) }; });
  ok(onBoard.n === 4 && onBoard.all, '次の戦闘で4人とも盤に並ぶ ' + JSON.stringify(onBoard));
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
