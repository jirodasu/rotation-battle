// 遠征地図のテスト：接続データ・進行検証・選択→確定・セーブ互換
const { launch, testPage } = require('./_env');
let fail = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fail++; };
(async () => {
  const b = await launch(), url = testPage();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(600); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(900);
  const ev = (f, a) => p.evaluate(f, a);

  // 1 本番の地図：検査（行き止まり・孤立・終点到達・各分岐が戦闘1＋休息系1）
  ok((await ev(() => window.__rb.routeValidate())).length === 0, '1. 本番の地図：開始から終点まで行け、行き止まり・孤立がなく、どの分岐も「戦闘1＋休息系1」');
  // 1 全経路を列挙して、どの道でも終点に着く
  const paths = await ev(() => { const R = window.__rb, N = R.ROUTE.nodes; let n = 0, okAll = true; const walk = (id, d) => { if (id === R.ROUTE.goal) { n++; if (d !== 10) okAll = false; return; } if (!N[id].next.length) { okAll = false; return; } N[id].next.forEach((t) => walk(t, d + 1)); }; walk('start', 0); return { n, okAll }; });
  ok(paths.okAll && paths.n > 8, '1. 全' + paths.n + '通りの道すべてが、10地点目の決戦に着く');
  // 5/6 分岐で次が変わる・合流
  const g = await ev(() => { const N = window.__rb.ROUTE.nodes; return { a: N['s1-0'].next, b: N['s1-1'].next, f2: Object.keys(N).filter((k) => N[k].step === 2).map((k) => N[k].next) }; });
  ok(JSON.stringify(g.a) !== JSON.stringify(g.b), '5. 地点1の選び方で、地点2で進める領地が変わる（' + g.a + ' / ' + g.b + '）');
  const shared = g.a.filter((x) => g.b.includes(x));
  ok(shared.length >= 1, '6. 別の道から同じ領地（' + shared + '）に合流できる');
  ok(g.f2.every((n) => n.length === 1 && n[0] === 's3-0'), '6. 地点2のすべての領地が、地点3の砦で合流する');
  // テスト用の地図（指示書の例：A/B に分かれ、D で合流、F が終点）
  const t = await ev(() => {
    const R = window.__rb, mk = (id, step, kind, next) => ({ id, step, kind, next });
    const gg = { loose: true, goal: 'F', nodes: { start: mk('start', 0, 'start', ['A', 'B']), A: mk('A', 1, 'battle', ['C', 'D']), B: mk('B', 1, 'camp', ['D']), C: mk('C', 2, 'battle', ['F']), D: mk('D', 2, 'camp', ['F']), F: mk('F', 3, 'boss', []) } };
    const bad = JSON.parse(JSON.stringify(gg)); bad.nodes.C.next = []; bad.nodes.E = mk('E', 2, 'camp', ['F']);
    return { good: R.routeValidate(gg), bad: R.routeValidate(bad), fromA: ['C', 'D', 'F', 'B'].map((x) => R.routeCanMove('A', x, gg, [])), fromB: ['C', 'D'].map((x) => R.routeCanMove('B', x, gg, [])), mA: R.routeCanMove('C', 'F', gg, ['A', 'C']), mB: R.routeCanMove('D', 'F', gg, ['B', 'D']), again: R.routeCanMove('A', 'D', gg, ['A', 'D']) };
  });
  ok(t.good.length === 0 && t.bad.length >= 2, '分岐と合流のある例の地図は検査を通り、行き止まり・孤立は見つかる');
  ok(JSON.stringify(t.fromA) === '[true,true,false,false]' && JSON.stringify(t.fromB) === '[false,true]', '2/5. 接続されていない地点へは進めない／分岐先で候補が変わる');
  ok(t.mA && t.mB && !t.again, '6. 合流地点へ複数の経路から進め、通った地点には戻れない');

  // 3/4 選択→詳細→確定
  const st = await ev(() => ({ avail: document.querySelectorAll('#rvTrack .rt-n.avail:not(.mk)').length, here: document.querySelectorAll('#rvTrack .rt-n.here:not(.mk)').length, go: document.getElementById('rvGo').disabled, cards: document.querySelectorAll('#rvCards .rv-card').length, ids: window.__rb.run.choices.map((c) => c.rid), kinds: window.__rb.run.choices.map((c) => c.type) }));
  ok(st.avail === 2 && st.here === 1 && st.cards === 2 && st.kinds[0] === 'battle' && st.kinds[1] !== 'battle', '3. 現在地1・進める領地2（戦闘と休息系）が出る ' + JSON.stringify(st.ids));
  ok(st.go === true, '4. 選ぶまでは「進む」が押せない');
  await p.click('#rvTrack .rt-n.mk[data-pick="1"]');
  const s2 = await ev(() => ({ sel: document.querySelector('#rvCards .rv-card.sel')?.dataset.i, go: document.getElementById('rvGo').disabled, node: window.__rb.run.node, label: document.getElementById('rvGo').textContent }));
  ok(s2.sel === '1' && s2.go === false && s2.node === 0, '4/14. 地図の領地をタップすると選ばれ、詳細の札が強調される。まだ進まない（' + s2.label + '）');
  const rej = await ev(() => { const R = window.__rb; return [R.runEnter({ type: 'battle', step: 2, rid: 's2-1' }), R.runEnter({ type: 'rest', step: 1, rid: 's1-1' }), R.runEnter({ type: 'battle', step: 1, rid: 'zzz' }), R.runEnter(null)]; });
  ok(rej.every((x) => x === false), '8. 接続していない地点・いまの選択肢にない指定・不正なIDは、進行処理が拒否する');
  ok(await ev(() => window.__rb.run.node === 0 && window.__rb.run.pendId == null), '8. 拒否しても状態は変わらない');
  await p.click('#rvCards .rv-card[data-i="0"]');
  ok((await ev(() => document.querySelector('#rvCards .rv-card.sel').dataset.i)) === '0', '選び直せる');
  const firstId = await ev(() => window.__rb.run.choices[0].rid);
  await p.click('#rvGo'); await p.waitForTimeout(900);
  ok(await ev((id) => document.getElementById('runv').hidden && window.__rb.run.pendId === id, firstId), '確定すると、選んだ領地の戦闘（準備画面）へ進む');

  // 7/9 進行・保存・復元
  await ev(() => { const R = window.__rb, run = R.run; run.hist[0] = 'battle'; R.runAdvance([]); });
  await p.waitForTimeout(600);
  const m = await ev(() => { const R = window.__rb; return { path: R.run.path, choices: R.run.choices.map((c) => c.rid), next: R.ROUTE.nodes[R.run.path[0]].next, saved: JSON.parse(localStorage.getItem('rb-run-save')).run.path, done: document.querySelectorAll('#rvTrack .rt-n.done:not(.mk)').length }; });
  ok(m.path.length === 1 && m.path[0] === firstId, '7. 地点を終えると、通った道に記録される');
  ok(JSON.stringify(m.choices.slice().sort()) === JSON.stringify(m.next.slice().sort()), '5. 次の選択肢は、新しい現在地の接続先そのもの');
  ok(JSON.stringify(m.saved) === JSON.stringify(m.path), '9. 通った道がセーブに保存される');
  await ev(() => window.__rb.resumeRun()); await p.waitForTimeout(700);
  const r = await ev(() => ({ path: window.__rb.run.path, choices: window.__rb.run.choices.map((c) => c.rid) }));
  ok(JSON.stringify(r.path) === JSON.stringify(m.path) && JSON.stringify(r.choices) === JSON.stringify(m.choices), '9. 読み込み後も、通った道と進める領地が同じ');
  // 10 古いセーブ（v5.1.12 以前：path と map が無い）
  const old = await ev(() => {
    const o = JSON.parse(localStorage.getItem('rb-run-save'));
    delete o.run.path; delete o.run.map; o.run.node = 4; o.run.year = 13; o.run.hist = ['battle', 'rest', 'battle', 'inherit'];
    o.run.choices = [{ type: 'battle', step: 5, variant: 'poison' }, { type: 'rest', step: 5 }];
    localStorage.setItem('rb-run-save', JSON.stringify(o)); window.__rb.resumeRun();
    const R = window.__rb, N = R.ROUTE.nodes;
    return { path: R.run.path, kinds: R.run.path.map((id) => N[id].kind), ch: R.run.choices.map((c) => c.type + ':' + (c.variant || '')), valid: R.run.path.every((id, i) => R.routeCanMove(i ? R.run.path[i - 1] : 'start', id, null, R.run.path.slice(0, i))) };
  });
  ok(old.path.length === 4 && old.valid && old.kinds.join() === 'battle,camp,fort,camp', '10. 古い形式のセーブも読み込め、記録から正しくつながった道が復元される ' + old.path);
  ok(old.ch.join() === 'battle:poison,rest:', '10. 古いセーブで保存されていた選択肢が、そのまま地図に出る');
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs));
  console.log(fail ? '不合格 ' + fail + ' 件' : '全て合格');
  await b.close(); process.exit(fail ? 1 : 0);
})();
