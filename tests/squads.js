// 騎士団の選択と解禁のテスト：標準は不変／実績で解禁／選んだ編成で始まる／セーブ互換／画面に収まる
const { launch, testPage } = require('./_env');
let fail = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fail++; };
(async () => {
  const b = await launch(), url = testPage(), errs = [];
  const fresh = async (vp = { width: 844, height: 390 }) => {
    const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(600); await p.click('#cover'); await p.waitForTimeout(400);
    return p;
  };
  const STD = ['warrior', 'knight', 'samurai', 'witch', 'archer', 'cleric', 'monk'];
  const jobs = (p) => p.evaluate(() => window.__rb.run.members.map((m) => m.job));

  // 1 はじめては選択画面なしで標準の騎士団から始まる
  let p = await fresh(); await p.click('#begin'); await p.waitForTimeout(900);
  let st = await p.evaluate(() => ({ squad: window.__rb.run.squad, jobs: window.__rb.run.members.map((m) => m.job), ages: window.__rb.run.members.map((m) => m.age), map: document.getElementById('runv').classList.contains('is-map') }));
  ok(st.squad === 'std' && st.map && JSON.stringify(st.jobs) === JSON.stringify(STD), '1. はじめての本番は、選択画面なしで標準の騎士団（戦士・騎士・サムライ・魔女・アーチャー・神官・僧侶）から始まる');
  ok(JSON.stringify(st.ages) === JSON.stringify([38, 30, 24, 33, 19, 44, 27]), '1. 標準の騎士団の年齢は従来どおり');

  // 2 戦死2人でクリア → 攻め・護りが解禁。エンディングに表示
  const r = await p.evaluate(() => { const R = window.__rb; R.run.gone = [{ fate: 'fallen', name: 'A' }, { fate: 'fallen', name: 'B' }]; R.runEnd(true); const m = R.metaLoad(); return { ach: Object.keys(m.ach).sort(), runs: m.runs, clears: m.clears, won: m.won, text: document.getElementById('enScore').textContent, unl: R.run.unlocked.length }; });
  ok(JSON.stringify(r.ach) === '["clear","few","mid","w_std"]' && r.runs === 1 && r.clears === 1 && r.won.std === 1, '2. 戦死2人でクリアすると「30年を完遂」「ほとんど欠けず」「中盤を越えて」「標準の誉れ」を満たす');
  ok(r.text.includes('実績+4（勲章+4）') && r.text.includes('解禁：攻め・護りの騎士団'), '2. エンディングに、新しい実績・勲章・解禁された騎士団が1行で表示される');

  // 3 選択画面：標準・攻め・護りが選べ、老練は未解禁
  await p.evaluate(() => { document.getElementById('ending').hidden = true; window.__rb.startFlow(); }); await p.waitForTimeout(300);
  const sel = await p.evaluate(() => ({ n: document.querySelectorAll('#rvCards .rv-card').length, dis: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.disabled), names: [...document.querySelectorAll('#rvCards .rv-card b')].map((x) => x.textContent), title: document.getElementById('rvTitle').textContent, hint: document.querySelectorAll('#rvCards .rv-card')[3]?.textContent }));
  ok(sel.n === 4 && JSON.stringify(sel.dis) === '[false,false,false,true]' && sel.title === 'どの騎士団で挑む？', '3. 選択画面に4つ並び、標準・攻め・護りは選べ、老練は未解禁で押せない');
  ok(sel.hint.includes('解禁：攻めと護り、どちらの騎士団でもクリアする'), '3. 未解禁の騎士団には、解禁の条件が書いてある');
  // 4 攻めの騎士団を選ぶ
  await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ squad: window.__rb.run.squad, jobs: window.__rb.run.members.map((m) => m.job), ages: window.__rb.run.members.map((m) => m.age), pos: window.__rb.run.members.map((m) => m.r + ',' + m.c), grid: window.__rb.grid.flat().filter(Boolean).length, map: document.getElementById('runv').classList.contains('is-map') }));
  ok(st.squad === 'vanguard' && JSON.stringify(st.jobs) === JSON.stringify(['samurai', 'warrior', 'samurai', 'archer', 'witch', 'cleric', 'monk']) && st.map, '4. 攻めの騎士団を選ぶと、その編成で始まり地図に進む');
  ok(JSON.stringify(st.ages) === JSON.stringify([24, 38, 29, 19, 33, 44, 27]) && st.grid === 7 && new Set(st.pos).size === 7, '4. 年齢が編成どおりで、7人が重ならず盤面に並ぶ');
  // 5 途中保存→再開しても騎士団が保たれる
  const rs = await p.evaluate(() => { const R = window.__rb; R.runSave(); const before = R.run.members.map((m) => m.job + m.age).join(); R.resumeRun(); return { squad: R.run.squad, same: R.run.members.map((m) => m.job + m.age).join() === before }; });
  ok(rs.squad === 'vanguard' && rs.same, '5. 途中保存から再開しても、騎士団と編成が保たれる');
  // 6 攻めでクリア → 護りでもクリア → 老練が解禁
  const two = await p.evaluate(() => { const R = window.__rb, out = []; R.run.gone = []; R.runEnd(true); out.push(Object.keys(R.metaLoad().ach).includes('two')); R.beginMain('bulwark'); R.run.gone = []; R.runEnd(true); const m = R.metaLoad(); out.push(m.ach.two === 1, R.squadOpen('veterans', m), m.won.vanguard, m.won.bulwark); return out; });
  ok(two[0] === false && two[1] === true && two[2] === true && two[3] === 1 && two[4] === 1, '6. 攻めだけでは老練は解禁されず、護りでもクリアすると解禁される');
  await p.evaluate(() => { document.getElementById('ending').hidden = true; window.__rb.beginMain('veterans'); }); await p.waitForTimeout(500);
  st = await p.evaluate(() => ({ squad: window.__rb.run.squad, ages: window.__rb.run.members.map((m) => m.age) }));
  ok(st.squad === 'veterans' && JSON.stringify(st.ages) === JSON.stringify([41, 38, 36, 40, 35, 44, 39]), '6. 老練の騎士団は全員ベテランで始まる');
  await p.context().close();

  // 7 敗北は解禁につながらない／戦死4人のクリアは攻めだけ
  p = await fresh(); await p.click('#begin'); await p.waitForTimeout(900);
  const lose = await p.evaluate(() => { const R = window.__rb; R.runEnd(false); const m = R.metaLoad(); return { runs: m.runs, clears: m.clears, ach: Object.keys(m.ach).length }; });
  ok(lose.runs === 1 && lose.clears === 0 && lose.ach === 0, '7. 敗北は記録されるが、何も解禁されない');
  await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.startFlow(); }); await p.waitForTimeout(300);
  const dis = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.disabled));
  ok(JSON.stringify(dis) === '[false,true,true,true]', '7. 敗北のあとの選択画面は、標準だけが選べる');
  const four = await p.evaluate(() => { const R = window.__rb; R.beginMain(); R.run.gone = [1, 2, 3, 4].map((i) => ({ fate: 'fallen', name: 'x' + i })); R.runEnd(true); return Object.keys(R.metaLoad().ach).sort(); });
  ok(!four.includes('few') && four.includes('clear'), '7. 戦死4人でクリアしても「ほとんど欠けず」は満たさない（戦死3人以下）');
  // 10 Into the Breach 式：負けても実績、勲章で買う、第N代、記録画面
  await p.context().close();
  p = await fresh(); await p.click('#begin'); await p.waitForTimeout(800);
  const lose7 = await p.evaluate(() => { const R = window.__rb; const g = R.run.gen; R.run.node = 6; R.runEnd(false); const m = R.metaLoad(); return { g, ach: Object.keys(m.ach), medals: R.medals(m), title: document.getElementById('rvTitle').textContent, ev: document.getElementById('rvEvents').textContent, hist: m.hist[0] }; });
  ok(lose7.g === 1 && lose7.title === '第1代の騎士団、ここに眠る', '10. 1回目の本番は「第1代」。敗北画面にも代が出る');
  ok(JSON.stringify(lose7.ach) === '["mid"]' && lose7.medals === 1 && lose7.ev.includes('実績「中盤を越えて」'), '10. 負けても地点7に着けば実績「中盤を越えて」と勲章1枚が手に入る');
  ok(lose7.hist && lose7.hist.gen === 1 && lose7.hist.sq === 'std' && lose7.hist.clear === false && lose7.hist.reach === 7, '10. 歴代の騎士団に「第1代・標準・地点7」が残る');
  const buy = await p.evaluate(() => { const R = window.__rb, m = R.metaLoad(); m.ach.nofall = 1; m.ach.w_bulwark = 1; const before = R.medals(m); const no = R.squadBuy('veterans'); const yes = R.squadBuy('vanguard'); return { before, no, yes, after: R.medals(m), open: R.squadOpen('vanguard', m), price: R.SQUAD_PRICE.vanguard }; });
  ok(buy.before === 3 && buy.no === false && buy.yes === true && buy.after === 0 && buy.open, '10. 勲章が足りない騎士団は買えず、足りれば勲章' + buy.price + '枚で解禁される');
  await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.startFlow(); }); await p.waitForTimeout(300);
  const sel2 = await p.evaluate(() => ({ dis: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.disabled), small: document.getElementById('rvSmall').textContent }));
  ok(JSON.stringify(sel2.dis) === '[false,false,true,true]' && sel2.small.includes('勲章 0枚'), '10. 買った騎士団は選べるようになり、勲章の残りが表示される');
  await p.click('#rvCards .rv-aux'); await p.waitForTimeout(300);
  const rec = await p.evaluate(() => ({ title: document.getElementById('rvTitle').textContent, on: document.querySelectorAll('.rec-ach li.on').length, all: document.querySelectorAll('.rec-ach li').length, hist: document.querySelector('.rec-hist').textContent }));
  ok(rec.title === '実績と記録' && rec.all === 9 && rec.on === 3 && rec.hist.includes('第1代') && rec.hist.includes('地点7で眠る'), '10. 「実績と記録」に9つの実績（取得3）と歴代の騎士団が並ぶ');
  await p.click('#rvCards .rv-skip'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('rvTitle').textContent === 'どの騎士団で挑む？'), '10. 「もどる」で騎士団の選択に戻る');
  await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => window.__rb.run.squad === 'vanguard' && window.__rb.run.gen === 2), '10. 2回目の本番は「第2代」として始まる');
  // 8 壊れた記録でも動く
  await p.context().close();
  p = await fresh(); await p.evaluate(() => localStorage.setItem('rb-meta', '{bad')); await p.reload(); await p.waitForTimeout(600); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => window.__rb.run.squad === 'std' && window.__rb.metaLoad().runs === 0), '8. 記録が壊れていても、標準の騎士団ではじめから始められる');
  await p.context().close();

  // 9 選択画面がスクロールなしで収まる
  for (const [w, h] of [[375, 667], [320, 568], [390, 844], [568, 320], [667, 375], [844, 390], [1280, 720]]) {
    p = await fresh({ width: w, height: h }); await p.click('#begin'); await p.waitForTimeout(700);
    for (const lock of [false, true]) {
    if (lock) { p = await fresh({ width: w, height: h }); await p.click('#begin'); await p.waitForTimeout(700); }
    await p.evaluate((lk) => { const R = window.__rb; if (lk) R.runEnd(false); else { R.run.gone = []; R.runEnd(true); R.metaLoad().ach.two = 1; } document.getElementById('ending').hidden = true; document.getElementById('runv').hidden = true; R.startFlow(); }, lock); await p.waitForTimeout(400);
    const f = await p.evaluate(() => { const c = document.querySelector('#runv .r-card'), cs = [...c.querySelectorAll('.rv-card, .rv-skip')], rc = c.getBoundingClientRect(), last = Math.max(...cs.map((x) => x.getBoundingClientRect().bottom)); return { scroll: c.scrollHeight - c.clientHeight, inCard: last <= rc.bottom + 1, inView: last <= innerHeight, n: cs.length }; });
    ok(f.scroll <= 1 && f.inCard && f.inView, '9. ' + w + 'x' + h + '：選択画面（' + (lock ? '解禁前' : '全解禁') + '）がスクロールなしで収まる');
    if (!lock) { await p.evaluate(() => window.__rb.showRecords()); await p.waitForTimeout(300); const g = await p.evaluate(() => { const c = document.querySelector('#runv .r-card'), rc = c.getBoundingClientRect(), last = Math.max(...[...c.querySelectorAll('.rec li, .rv-skip')].map((x) => x.getBoundingClientRect().bottom)); return { scroll: c.scrollHeight - c.clientHeight, ok: last <= rc.bottom + 1 && last <= innerHeight }; }); ok(g.scroll <= 1 && g.ok, '9. ' + w + 'x' + h + '：実績と記録がスクロールなしで収まる'); }
    await p.context().close();
    }
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs)); await b.close();
  console.log(fail ? '不合格 ' + fail + ' 件' : '全て合格'); process.exit(fail ? 1 : 0);
})();
