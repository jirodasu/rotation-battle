// 端末内の計測記録（遊んだ時間・最後の地点）：追記のみで、古い保存が壊れないこと
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  // 古い形式の rb-meta（last/ms なし）が読めて、既存の項目が変わらない
  const OLD = { runs: 3, clears: 1, won: { std: 1 }, ach: { clear: 1 }, bought: {}, spent: 0, hist: [{ gen: 3, sq: 'std', clear: true, reach: 10, years: 30, fal: 4, ret: 2 }], legacyCands: [], legacyFrom: 0 };
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((o) => { try { if (!localStorage.getItem('rb-meta')) localStorage.setItem('rb-meta', JSON.stringify(o)); } catch (e) { /* */ } }, OLD);
  await p.goto(testPage()); await p.waitForTimeout(500);
  const m0 = await p.evaluate(() => { const m = window.__rb.metaLoad(); return { runs: m.runs, clears: m.clears, won: m.won, ach: m.ach, hist: m.hist, last: m.last }; });
  ok(m0.runs === 3 && m0.clears === 1 && m0.won.std === 1 && m0.ach.clear === 1 && m0.hist.length === 1 && m0.hist[0].reach === 10, '古い rb-meta がそのまま読める');
  ok(m0.last === null, '古い保存には「最後の地点」がなく、null として扱える');
  // 本番を始めて操作し、保存すると最後の地点と遊んだ時間が残る
  await p.evaluate(() => { window.__rb.beginMain('std'); });
  await p.waitForTimeout(800);
  await p.mouse.click(400, 200); await p.waitForTimeout(150); await p.mouse.click(420, 210); await p.waitForTimeout(150);
  await p.evaluate(() => { window.__rb.runSave(); });
  const m1 = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-meta')));
  ok(m1.last && m1.last.gen === 4 && typeof m1.last.node === 'number' && m1.last.at > 0, '地図に戻る保存のたびに、最後の地点が rb-meta に残る ' + JSON.stringify(m1.last));
  const act = await p.evaluate(() => window.__rb.run.act);
  ok(typeof act === 'number' && act >= 0 && act <= 60000, '遊んだ時間は数値で、1回の空白は60秒までしか足されない（' + act + 'ms）');
  ok(m1.runs === 3 && m1.won.std === 1 && m1.hist.length === 1, '計測を足しても、既存の記録は変わらない');
  // 本番が終わると履歴に ms が付き、last は消える
  await p.evaluate(() => { window.__rb.metaRecord({ clear: false, reach: 3, years: 9, fal: 5, ret: 0, gen: 4 }, 'std'); });
  const m2 = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-meta')));
  ok(m2.hist[0].gen === 4 && typeof m2.hist[0].ms === 'number' && m2.last === null, '終了すると履歴に遊んだ時間（ms）が付き、最後の地点は消える');
  ok(m2.hist[1].reach === 10 && m2.hist[1].ms === undefined, '古い履歴の項目は書き換えない');
  // 古い途中保存（act なし）から再開しても止まらない
  const sv = await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-run-save')); delete o.run.act; localStorage.setItem('rb-run-save', JSON.stringify(o)); return !!o; });
  await p.reload(); await p.waitForTimeout(600);
  const res = await p.evaluate(() => { try { window.__rb.resumeRun(); return { ok: true, act: window.__rb.run.act }; } catch (e) { return { ok: false, e: String(e) }; } });
  ok(sv && res.ok, 'act のない古い途中保存からも再開できる ' + JSON.stringify(res));
  await p.mouse.click(400, 200);
  const act2 = await p.evaluate(() => window.__rb.run.act);
  ok(Number.isFinite(+act2) && +act2 >= 0, '再開後の操作でも遊んだ時間が数値のまま（' + act2 + '）');
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
  await ctx.close(); await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
