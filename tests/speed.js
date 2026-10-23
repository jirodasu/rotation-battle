// 戦闘2倍速：ボタンで切り替わり、戦闘の所要時間が約半分になる／保存される／戦闘外の演出は変えない
const { launch, indexURL } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
async function battle(b, fast) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((f) => { try { localStorage.setItem('rb-fast', f ? '1' : '0'); localStorage.setItem('rb-tips', JSON.stringify({})); } catch (e) { /* */ } }, fast);
  await p.goto(indexURL); await p.waitForTimeout(400);
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => ({ pressed: document.getElementById('spdBtn').getAttribute('aria-pressed'), cls: document.body.classList.contains('fast') }));
  const t0 = Date.now(); await p.click('#btnStart');
  await p.waitForSelector('#btnRotate:not([hidden]), #result:not([hidden])', { timeout: 60000 });
  const ms = Date.now() - t0; await ctx.close();
  return { ms, st, errs };
}
(async () => {
  const b = await launch();
  const a = await battle(b, false), f = await battle(b, true);
  console.log('通常', a.ms, 'ms / 2倍速', f.ms, 'ms');
  ok(a.st.pressed === 'false' && !a.st.cls, '初期は通常速度（ボタンは押されていない）');
  ok(f.st.pressed === 'true' && f.st.cls, '保存された2倍速が復元される');
  ok(f.ms < a.ms * 0.65, '2倍速の戦闘は通常の65%未満の時間（' + Math.round(f.ms / a.ms * 100) + '%）');
  ok(!a.errs.length && !f.errs.length, 'ページのエラーなし ' + JSON.stringify(a.errs.concat(f.errs)));
  // ボタンの切り替え
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(indexURL); await p.waitForTimeout(400);
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
  await p.click('#spdBtn');
  const on = await p.evaluate(() => ({ a: document.getElementById('spdBtn').getAttribute('aria-pressed'), s: localStorage.getItem('rb-fast') }));
  await p.click('#spdBtn');
  const off = await p.evaluate(() => ({ a: document.getElementById('spdBtn').getAttribute('aria-pressed'), s: localStorage.getItem('rb-fast') }));
  ok(on.a === 'true' && on.s === '1' && off.a === 'false' && off.s === '0', 'ボタンで切り替わり、保存される');
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
