// ローグライク要素のテスト：名前／章末の店／地方選び／語り継がれる者／保存／画面に収まる
const { launch, testPage } = require('./_env');
let fail = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fail++; };
(async () => {
  const b = await launch(), url = testPage(), errs = [];
  const fresh = async (vp = { width: 844, height: 390 }) => {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(600); return p;
  };
  let p = await fresh();
  ok(await p.evaluate(() => document.title === 'ローグライク・ローテーションバトル' && document.querySelector('.c-kicker').textContent === 'ローグライク'), '1. タイトルが「ローグライク・ローテーションバトル」');
  await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(900);
  const T = () => p.evaluate(() => document.getElementById('rvTitle').textContent);
  // 2 地点3の砦のあと：店 → 地方 → 地図
  await p.evaluate(() => { const R = window.__rb; R.run.node = 2; R.run.fame = 5; R.run.members.forEach((m) => { m.hp = Math.ceil(m.max / 2); }); R.runAdvance([]); }); await p.waitForTimeout(400);
  ok((await T()) === '章の終わり：名声を使う', '2. 地点3の砦のあと、章の終わりの店が開く');
  const shop = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => ({ t: c.querySelector('b').textContent, dis: c.disabled, tag: c.querySelector('.rv-tags').textContent })));
  ok(shop.length >= 3 && shop[0].t === '手当て' && !shop[0].dis && shop.some((x) => x.tag.includes('名声 5')), '2. 品と値段が並び、名声5で買える物は押せる（' + shop.map((x) => x.t + x.tag).join(' / ') + '）');
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ left: window.__rb.fameLeft(), full: window.__rb.run.members.every((m) => m.hp === m.max), dis: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.disabled), tag0: document.querySelector('#rvCards .rv-card .rv-tags').textContent, sub: document.getElementById('rvSub').textContent }));
  ok(after.left === 2 && after.full && after.tag0.includes('購入済み') && after.sub.includes('名声 2'), '2. 手当て（名声3）を買うと全員が全快し、名声は2に減る');
  ok(after.dis.every(Boolean), '2. 名声が足りない品・買った品は押せない');
  await p.click('#rvCards .rv-skip'); await p.waitForTimeout(300);
  ok((await T()) === '中盤、どの地方へ？' && await p.evaluate(() => document.querySelectorAll('#rvCards .rv-card').length === 3), '3. 店を出ると、中盤の地方を3つから選ぶ');
  await p.evaluate(() => { window.__mr = Math.random; Math.random = () => 0.99; });  // 地方のあとの偶然の出来事を避ける
  await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(400); await p.evaluate(() => { Math.random = window.__mr; });
  const rg = await p.evaluate(() => { const R = window.__rb, N = R.ROUTE.nodes, v = Object.keys(N).filter((id) => N[id].ch === 1 && R.run.map[id] && R.run.map[id].variant).map((id) => R.run.map[id].variant); return { region: R.run.region, v, map: document.getElementById('runv').classList.contains('is-map'), sub: document.getElementById('rvSub').textContent }; });
  ok(JSON.stringify(rg.region) === '["poison"]' && rg.v.every((x) => x === 'poison') && rg.map, '3. 毒の沼地を選ぶと、中盤の変異種はすべて「毒」になり、地図へ進む（' + rg.v.length + '地点）');
  ok(rg.sub.includes('毒の沼地') && rg.sub.includes('名声 2'), '3. 地図に、いまの地方と名声が出る');
  // 4 保存→再開
  const rs = await p.evaluate(() => { const R = window.__rb; R.runSave(); R.resumeRun(); return { region: R.run.region, left: R.fameLeft() }; });
  ok(JSON.stringify(rs.region) === '["poison"]' && rs.left === 2, '4. 途中保存から再開しても、地方と名声が保たれる');
  // 5 地点6の砦のあと：店 → 残り2つの地方
  await p.evaluate(() => { const R = window.__rb; R.run.node = 5; R.runAdvance([]); }); await p.waitForTimeout(300);
  ok((await T()) === '章の終わり：名声を使う', '5. 地点6の砦のあとも店が開く');
  await p.click('#rvCards .rv-skip'); await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => ({ t: document.getElementById('rvTitle').textContent, names: [...document.querySelectorAll('#rvCards .rv-card b')].map((x) => x.textContent) }));
  ok(r2.t === '終盤、どの地方へ？' && r2.names.length === 2 && !r2.names.includes('毒の沼地'), '5. 終盤は、まだ行っていない2つの地方から選ぶ（' + r2.names.join('・') + '）');
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__rb.run.region.length === 2), '5. 2つ目の地方も記録される');
  // 6 語り継がれる者
  const end = await p.evaluate(() => { const R = window.__rb; const m0 = R.run.members[0]; m0.bonus.atk = 5; m0.equips.push('鋼の剣'); const name = m0.name, job = m0.job; R.runEnd(false); const mm = R.metaLoad(); return { n: mm.legacyCands.length, name, job, has: mm.legacyCands.some((c) => c.name === name && c.bonus.atk === 5) }; });
  ok(end.n >= 1 && end.has, '6. 本番の終わりに、残った団員が語り継ぐ候補として残る（' + end.n + '人）');
  await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.startFlow(); }); await p.waitForTimeout(300);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(300);
  const lg = await p.evaluate(() => ({ t: document.getElementById('rvTitle').textContent, cards: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.disabled), n: document.querySelectorAll('#rvRoster .rv-m[data-lg]').length }));
  ok(lg.t === '語り継ぐ者を選ぶ' && lg.cards[0] === true && lg.n === end.n, '6. 騎士団を選ぶと、語り継ぐ者を選ぶ画面になる（選ぶまで決定は押せない）');
  const idx = await p.evaluate((nm) => window.__rb.metaLoad().legacyCands.findIndex((c) => c.name === nm), end.name);
  await p.click('#rvRoster .rv-m[data-lg="' + idx + '"]'); await p.waitForTimeout(300);
  const sel = await p.evaluate(() => ({ t: document.querySelector('#rvCards .rv-card b').textContent, d: document.querySelector('#rvCards .rv-card .rv-txt > span').textContent, dis: document.querySelector('#rvCards .rv-card').disabled, pick: document.querySelectorAll('#rvRoster .rv-m.pick').length }));
  ok(!sel.dis && sel.t === end.name + 'を連れていく' && sel.d.includes('攻撃+5') && sel.d.includes('鋼の剣') && sel.pick === 1, '6. 団員をタップすると選ばれ、引き継ぐ能力が表示される');
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(800);
  const nr = await p.evaluate((o) => { const R = window.__rb, m = R.run.members.find((x) => x.name === o.name); return { gen: R.run.gen, n: R.run.members.length, age: m && m.age, atk: m && m.bonus.atk, eq: m && m.equips.join(), job: m && m.job, sameJob: R.run.members.filter((x) => x.job === o.job).length, left: R.metaLoad().legacyCands.length, ev: R.run.events.join() }; }, end);
  ok(nr.gen === 2 && nr.n === 7 && nr.age === 28 && nr.atk === 5 && nr.eq === '鋼の剣' && nr.job === end.job, '6. 次の代は7人のまま、選んだ団員が28歳で能力（攻撃+5・鋼の剣）を保って加わる');
  ok(nr.sameJob === 1 && nr.left === 0 && nr.ev.includes('第1代から語り継がれた'), '6. 同じ職業の初期団員と入れ替わり、候補は使い切られ、年代記に残る');
  await p.context().close();
  // 7 連れていかない
  p = await fresh(); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(700);
  await p.evaluate(() => { const R = window.__rb; R.runEnd(false); document.getElementById('runv').hidden = true; R.startFlow(); }); await p.waitForTimeout(300);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(300); await p.click('#rvCards .rv-skip'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => JSON.stringify(window.__rb.run.members.map((m) => m.age)) === '[38,30,24,33,19,44,27]' && window.__rb.metaLoad().legacyCands.length === 0), '7. 「連れていかない」なら標準の編成で始まる');
  await p.context().close();
  // 8 画面に収まる（店・地方・語り継ぐ者）
  for (const [w, h] of [[375, 667], [320, 568], [390, 844], [568, 320], [667, 375], [844, 390], [1280, 720]]) {
    p = await fresh({ width: w, height: h }); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(600);
    const fit = () => p.evaluate(() => { const c = document.querySelector('#runv .r-card'), r = c.getBoundingClientRect(), last = Math.max(...[...c.querySelectorAll('.rv-card, .rv-skip, .rv-m')].map((x) => x.getBoundingClientRect().bottom)); return c.scrollHeight - c.clientHeight <= 1 && last <= r.bottom + 1 && last <= innerHeight; });
    await p.evaluate(() => { const R = window.__rb; R.run.fame = 9; R.run.node = 3; R.run.members.forEach((m) => { m.hp = 1; }); R.runShop(['砦を守り抜いた。'], () => {}); }); await p.waitForTimeout(300);
    const a = await fit();
    await p.evaluate(() => window.__rb.runRegion(['騎士団は進む。'], () => {})); await p.waitForTimeout(300);
    const c2 = await fit();
    await p.evaluate(() => { const R = window.__rb; R.runEnd(false); document.getElementById('runv').hidden = true; const m = R.metaLoad(); while (m.legacyCands.length < 12) m.legacyCands.push(Object.assign({}, m.legacyCands[0], { name: 'ルカ' + m.legacyCands.length })); R.chooseLegacy(null); }); await p.waitForTimeout(300);
    await p.click('#rvRoster .rv-m[data-lg="3"]'); await p.waitForTimeout(250);
    const d = await fit();
    ok(a && c2 && d, '8. ' + w + 'x' + h + '：店・地方・語り継ぐ者（12人）がスクロールなしで収まる（' + [a, c2, d].join('/') + '）');
    await p.context().close();
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs)); await b.close();
  console.log(fail ? '不合格 ' + fail + ' 件' : '全て合格'); process.exit(fail ? 1 : 0);
})();
