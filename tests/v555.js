// v5.5.5 QAジャンプ（?qa&ch=章&loc=地点。loc は全10地点の通し番号）
// 合格の基準（測る前に決めたもの）：
//  1. ?qa&ch=3&loc=7 で開くと、地点7の戦闘の陣立て（prep）から始まる。ch=1&loc=1→地点1、ch=2&loc=5→地点5、ch=3&loc=10→地点10（最後の主）。
//     仲間は普通の新しい遠征と同じ4人・全員全快・前の地点の戦闘や報酬は無し・最初のターンの気力は普通の戦闘と同じ
//  2. 本物の保存（rb- で始まるキーすべて：保存・星・実績・記録・既読・設定）が、次の4時点で1文字も変わらない：
//     QAを開いた直後（開始前）／戦闘中（1ターン後）／戦闘が終わってタイトルへ戻った後／?qa の指定が正しくなくて普通に起動した後
//  3. 戦闘が終わると、報酬へ進まず結果の画面で止まり、ボタンは「タイトルへ」。押すと ?qa の無い普通のタイトルに戻り、「続きから」は本物の保存のとおり出る
//  4. ch と loc が合わない・範囲外（ch=1&loc=7／ch=3&loc=1／ch=4&loc=1／ch=3&loc=11／?qa だけ）は、?qa の無い起動と同じ
//  5. 画面に「QA」の文字は出さない。開発者向けに <html data-qa="章-地点">（例 3-7）と console の [QA] で分かる。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
const DUMP = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^rb-/.test(k)) o[k] = localStorage.getItem(k); } return o; };
const same = (a, b) => { const ks = new Set(Object.keys(a).concat(Object.keys(b))); return [...ks].filter((k) => a[k] !== b[k]); };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const base = testPage();
  // 本物の保存を作る：普通に遠征を始めて地図まで（rb-exp-save・rb-exp ができる）。星・記録・30年の保存・実績は目印の値
  const p0 = await ctx.newPage();
  await p0.addInitScript((t) => { try { if (!localStorage.getItem('rb-tips')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } } catch (e) { /* */ } }, TIPS);
  await p0.goto(base); await p0.waitForTimeout(300); await p0.click('#cover'); await p0.waitForTimeout(300); await p0.click('#begin'); await p0.waitForTimeout(800);
  await p0.evaluate(() => { localStorage.setItem('rb-stars', '[3,2,1]'); localStorage.setItem('rb-run-best', '4'); localStorage.setItem('rb-meta', '{"mark":"real"}'); localStorage.setItem('rb-run-save', '{"mark":"real-run"}');
    const m = JSON.parse(localStorage.getItem('rb-exp')); m.mark = 'real-meta'; localStorage.setItem('rb-exp', JSON.stringify(m)); });
  const real = await p0.evaluate(DUMP);
  ok(['rb-run-save', 'rb-exp-save', 'rb-stars', 'rb-run-best', 'rb-exp', 'rb-meta', 'rb-tips'].every((k) => real[k] != null), '準備：本物の保存・星・記録・実績・既読がある（' + Object.keys(real).length + 'キー）');
  await p0.close();
  // 本物を読む：?qa の無い別のページで（QAのページの中では読み替えられているので）
  const readReal = async () => { const q = await ctx.newPage(); await q.goto(base); await q.waitForTimeout(150); const v = await q.evaluate(DUMP); await q.close(); return v; };
  const check = async (when) => { const d = same(real, await readReal()); ok(!d.length, '2 ' + when + '：本物の保存は変わらない ' + d.join(',')); };
  // 普通の戦闘の最初のターンの気力（比べる相手）。別の箱で
  let normalGauge;
  { const c2 = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const q = await c2.newPage();
    await q.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } catch (e) { /* */ } }, TIPS);
    await q.goto(base); await q.waitForTimeout(300); await q.click('#cover'); await q.waitForTimeout(300); await q.click('#begin'); await q.waitForTimeout(800);
    const i = await q.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle')); await q.click('#rvCards .rv-card[data-i="' + i + '"]'); await q.click('#rvGo'); await q.waitForTimeout(1200);
    await q.click('#btnStart'); for (let k = 0; k < 300; k++) { if (await q.evaluate(() => window.__rb.phase === 'choose')) break; await q.waitForTimeout(40); }
    normalGauge = await q.evaluate(() => window.__rb.gauge); await c2.close(); }
  const toChoose = async (p) => { for (let k = 0; k < 300; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(40); } await p.evaluate(() => { const t = document.getElementById('tip'); if (t && !t.hidden) document.getElementById('tipOk').click(); }); };
  const visibleText = () => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style,[hidden]').forEach((e) => e.remove()); return c.textContent; };
  // 1 開始の地点
  for (const [q, step] of [['ch=1&loc=1', 1], ['ch=2&loc=5', 5], ['ch=3&loc=10', 10]]) {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(base + '?qa&' + q); await p.waitForTimeout(900);
    const s = await p.evaluate(() => { const R = window.__rb, run = R.run; return { phase: R.phase, node: run && run.node, n: run ? run.members.length : 0, full: run ? run.members.every((m) => m.hp === m.max) : false,
      cover: !document.getElementById('cover').hidden, runv: !document.getElementById('runv').hidden, boss: !!(R.enemy && R.enemy.boss), hist: run ? run.hist.slice(0, run.node).filter(Boolean).length : -1, relics: run ? run.relics.length : -1, qa: document.documentElement.dataset.qa }; });
    ok(s.phase === 'prep' && s.node === step - 1 && !s.cover && !s.runv && s.qa === q.replace(/ch=(\d+)&loc=(\d+)/, '$1-$2'), '1 ?qa&' + q + '：地点' + step + 'の陣立てから（data-qa=' + s.qa + '） ' + JSON.stringify({ phase: s.phase, node: s.node }));
    ok(s.n === 4 && s.full && s.hist === 0 && s.relics === 0, '1 ?qa&' + q + '：普通の初期4人・全員全快・前の地点の報酬なし');
    if (step === 10) ok(s.boss, '1 地点10は最後の主');
    ok(!errs.length, '5 ?qa&' + q + '：ページのエラーなし ' + errs.join('/'));
    await p.close();
  }
  // 2・3 地点7で1戦（4時点のうち3つ）
  {
    const p = await ctx.newPage(); const errs = [], logs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => logs.push(m.text()));
    await p.goto(base + '?qa&ch=3&loc=7'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => window.__rb.phase === 'prep' && window.__rb.run.node === 6), '1 ?qa&ch=3&loc=7：地点7の陣立てから');
    await check('開始前（QAを開いた直後）');
    ok(logs.some((t) => /^\[QA\]/.test(t)), '5 console に [QA] が出る');
    ok(!/QA/.test(await p.evaluate(visibleText)), '5 画面に「QA」の文字が無い（陣立て）');
    await p.click('#btnStart'); await toChoose(p);
    const g = await p.evaluate(() => window.__rb.gauge);
    ok(g === normalGauge, '1 最初のターンの気力は普通の戦闘と同じ ' + g + '（普通 ' + normalGauge + '）');
    await p.click('#btnStay'); await p.waitForTimeout(1200); await toChoose(p);
    await check('戦闘中（1ターン後）');
    // 敵を残り1にして倒す
    await p.evaluate(() => { const R = window.__rb, foes = R.enemy.party ? R.enemy.party : [R.enemy]; foes.forEach((f) => { f.hp = 1; }); if (R.enemy.party) R.enemy.hp = foes.length; R.render(); });
    await p.click('#btnStay');
    let res = null;
    for (let k = 0; k < 200; k++) { res = await p.evaluate(() => ({ result: !document.getElementById('result').hidden, runv: !document.getElementById('runv').hidden, next: document.getElementById('next').textContent, alt: !document.getElementById('resultAlt').hidden, phase: window.__rb.phase })); if (res.result || res.runv) break; await p.waitForTimeout(60); }
    ok(res.result && !res.runv && res.next === 'タイトルへ' && !res.alt, '3 戦闘が終わると報酬へ進まず、結果の画面のボタンは「タイトルへ」だけ ' + JSON.stringify(res));
    ok(!/QA/.test(await p.evaluate(visibleText)), '5 画面に「QA」の文字が無い（結果）');
    await check('戦闘終了後（結果の画面）');
    await Promise.all([p.waitForNavigation({ timeout: 8000 }).catch(() => null), p.click('#next')]);
    await p.waitForTimeout(700);
    const t = await p.evaluate(() => ({ url: location.search, qa: document.documentElement.dataset.qa || null, cover: !document.getElementById('cover').hidden }));
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
    const resume = await p.evaluate(() => !document.getElementById('resume').hidden);
    ok(t.url === '' && !t.qa && t.cover && resume, '3 「タイトルへ」で ?qa の無い普通のタイトルに戻り、本物の「続きから」が出る ' + JSON.stringify(Object.assign(t, { resume })));
    await check('タイトルへ戻った後');
    ok(!errs.length, '5 地点7の1戦：ページのエラーなし ' + errs.join('/'));
    await p.close();
  }
  // 4 合わない・範囲外（4時点目）
  const look = async (url) => { const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(url); await p.waitForTimeout(700);
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
    const s = await p.evaluate(() => ({ cover: !document.getElementById('cover').hidden, resume: !document.getElementById('resume').hidden, phase: window.__rb.phase, run: !!window.__rb.run, qa: document.documentElement.dataset.qa || null })); await p.close(); return Object.assign(s, { errs }); };
  const plain = await look(base);
  for (const q of ['?qa&ch=1&loc=7', '?qa&ch=3&loc=1', '?qa&ch=4&loc=1', '?qa&ch=3&loc=11', '?qa']) {
    const s = await look(base + q);
    ok(s.cover && s.resume === plain.resume && s.phase === plain.phase && s.run === plain.run && !s.qa && !s.errs.length, '4 ' + q + '：普通の起動と同じ（続きから ' + s.resume + '） ' + JSON.stringify(s));
  }
  ok(plain.resume, '4 普通の起動では「続きから」が出る');
  await check('普通に起動した後（指定が正しくない ?qa）');
  await ctx.close(); await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
