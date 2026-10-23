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
  ok(JSON.stringify(r.ach) === '["clear","few"]' && r.runs === 1 && r.clears === 1 && r.won.std === 1, '2. 戦死2人でクリアすると「30年を完遂」「ほとんど欠けず」の2つを満たす');
  ok(r.unl === 2 && r.text.includes('新しい騎士団が解禁された：攻めの騎士団') && r.text.includes('護りの騎士団'), '2. エンディングに、解禁された騎士団が表示される');

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
  ok(JSON.stringify(four) === '["clear"]', '7. 戦死4人でクリアすると「30年を完遂」だけを満たす（「ほとんど欠けず」は戦死3人以下）');
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
    await p.context().close();
    }
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs)); await b.close();
  console.log(fail ? '不合格 ' + fail + ' 件' : '全て合格'); process.exit(fail ? 1 : 0);
})();
