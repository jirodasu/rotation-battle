// v5.5.5 QAジャンプ（?qa&ch=章&loc=地点）
// 合格の基準（測る前に決めたもの）：
//  1. ?qa&ch=3&loc=7 で開くと、地点7（第3章）の戦闘の陣立て（prep）から始まる。章の中の番号（ch=3&loc=1）でも同じ地点。
//     ch=1&loc=1 は地点1、ch=2&loc=2 は地点5、ch=3&loc=4 は地点10（最後の主）。仲間は普通の新しい遠征と同じ4人・全員全快、気力は普通の開始値
//  2. QAで戦っても（陣立て→開始→1ターン）、本物の保存（rb-run-save・rb-exp-save）と星・記録（rb-stars・rb-run-best・rb-exp・rb-meta）は1文字も変わらない。
//     QAの画面からは、本物の遠征の保存（続きから）も読まない
//  3. 範囲外（ch=4／ch=1&loc=5／ch=3&loc=11／?qa だけ）は、?qa の無い起動と同じ：表紙が出て、「続きから」も同じように出る
//  4. ページのエラーなし。画面に「QA」の文字を出さない
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const KEYS = ['rb-run-save', 'rb-exp-save', 'rb-stars', 'rb-run-best', 'rb-exp', 'rb-meta'];
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const base = testPage();
  // 本物の保存を作る：普通に遠征を始めて、地図まで（rb-exp-save・rb-exp ができる）。星・記録・30年の保存は目印の値を入れる
  const p0 = await ctx.newPage();
  await p0.addInitScript((t) => { try { if (!localStorage.getItem('rb-tips')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } } catch (e) { /* */ } }, TIPS);
  await p0.goto(base); await p0.waitForTimeout(300); await p0.click('#cover'); await p0.waitForTimeout(300); await p0.click('#begin'); await p0.waitForTimeout(800);
  await p0.evaluate(() => { localStorage.setItem('rb-stars', '[3,2,1]'); localStorage.setItem('rb-run-best', '4'); localStorage.setItem('rb-meta', '{"mark":"real"}'); localStorage.setItem('rb-run-save', '{"mark":"real-run"}'); });
  const real = await p0.evaluate((K) => K.map((k) => localStorage.getItem(k)), KEYS);
  ok(real.every((v) => v != null), '準備：本物の保存と星・記録が6つともある');
  await p0.close();
  // 普通の戦闘の最初のターンの気力（比べる相手）。保存を変えないよう、別の箱で
  let normalGauge;
  { const c2 = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const q = await c2.newPage();
    await q.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } catch (e) { /* */ } }, TIPS);
    await q.goto(base); await q.waitForTimeout(300); await q.click('#cover'); await q.waitForTimeout(300); await q.click('#begin'); await q.waitForTimeout(800);
    const i = await q.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle')); await q.click('#rvCards .rv-card[data-i="' + i + '"]'); await q.click('#rvGo'); await q.waitForTimeout(1200);
    await q.click('#btnStart'); for (let k = 0; k < 300; k++) { if (await q.evaluate(() => window.__rb.phase === 'choose')) break; await q.waitForTimeout(40); }
    normalGauge = await q.evaluate(() => window.__rb.gauge); await c2.close(); }
  const readReal = async () => { const q = await ctx.newPage(); await q.goto(base); await q.waitForTimeout(200); const v = await q.evaluate((K) => K.map((k) => localStorage.getItem(k)), KEYS); await q.close(); return v; };
  // 1・2
  const cases = [['ch=3&loc=7', 7], ['ch=3&loc=1', 7], ['ch=1&loc=1', 1], ['ch=2&loc=2', 5], ['ch=3&loc=4', 10]];
  for (const [q, step] of cases) {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(base + '?qa&' + q); await p.waitForTimeout(900);
    const s = await p.evaluate(() => { const R = window.__rb, run = R.run; return { phase: R.phase, node: run && run.node, mode: run && run.mode, n: run ? run.members.length : 0, full: run ? run.members.every((m) => m.hp === m.max) : false,
      gauge: R.gauge, cover: !document.getElementById('cover').hidden, runv: !document.getElementById('runv').hidden, boss: !!(R.enemy && R.enemy.boss), hist: run ? run.hist.slice(0, run.node).filter(Boolean).length : -1, relics: run ? run.relics.length : -1 }; });
    ok(s.phase === 'prep' && s.node === step - 1 && s.mode === 'exp' && !s.cover && !s.runv, '1 ?qa&' + q + '：地点' + step + 'の陣立てから始まる ' + JSON.stringify({ phase: s.phase, node: s.node, cover: s.cover, runv: s.runv }));
    ok(s.n === 4 && s.full && s.hist === 0 && s.relics === 0, '1 ?qa&' + q + '：普通の初期編成4人・全員全快・前の地点の戦闘や報酬は無し ' + JSON.stringify({ n: s.n, full: s.full, hist: s.hist, relics: s.relics }));
    if (step === 10) ok(s.boss, '1 ?qa&' + q + '：地点10は最後の主');
    if (q === 'ch=3&loc=7') {
      await p.click('#btnStart');
      for (let k = 0; k < 300; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(40); }
      const g = await p.evaluate(() => window.__rb.gauge);
      ok(g === normalGauge, '1 気力は普通の戦闘と同じ開始値 ' + g + '（普通 ' + normalGauge + '）');
      await p.evaluate(() => { const t = document.getElementById('tip'); if (t && !t.hidden) document.getElementById('tipOk').click(); });
      await p.click('#btnStay'); await p.waitForTimeout(1500);
      const inPage = await p.evaluate((K) => K.map((k) => localStorage.getItem(k)), KEYS);
      ok(inPage[1] === null || !inPage[1].includes('"node":0'), '2 QAの画面からは本物の遠征の保存を読まない');
      ok(!/QA/.test(await p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style').forEach((e) => e.remove()); return c.textContent; })), '4 画面に「QA」の文字が無い');
    }
    ok(!errs.length, '4 ?qa&' + q + '：ページのエラーなし ' + errs.join('/'));
    await p.close();
    const after = await readReal();
    ok(KEYS.every((k, i) => after[i] === real[i]), '2 ?qa&' + q + ' のあと、本物の保存と星・記録は変わらない ' + KEYS.filter((k, i) => after[i] !== real[i]).join(','));
  }
  // 3 範囲外
  const look = async (url) => { const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(url); await p.waitForTimeout(700);
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
    const s = await p.evaluate(() => ({ cover: !document.getElementById('cover').hidden, resume: !document.getElementById('resume').hidden, phase: window.__rb.phase, run: !!window.__rb.run })); await p.close(); return Object.assign(s, { errs }); };
  const plain = await look(base);
  for (const q of ['?qa&ch=4&loc=1', '?qa&ch=1&loc=5', '?qa&ch=3&loc=11', '?qa', '?qa&ch=0&loc=1']) {
    const s = await look(base + q);
    ok(s.cover && s.resume === plain.resume && s.phase === plain.phase && s.run === plain.run && !s.errs.length, '3 ' + q + '：普通の起動と同じ（表紙・続きから ' + s.resume + '） ' + JSON.stringify(s));
  }
  ok(plain.resume, '3 普通の起動では「続きから」が出る（本物の保存が残っている）');
  await ctx.close(); await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
