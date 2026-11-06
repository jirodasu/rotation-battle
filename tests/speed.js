// 戦闘2倍速：ボタンで切り替わり、戦闘の所要時間が約半分になる／保存される／戦闘外の演出は変えない
const { launch, testPage } = require('./_env');
const indexURL = testPage();   // 戦闘の段階（phase）を読むため、中を見られるページを使う（v5.5.6）
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
async function battle(b, fast) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // 通常と2倍速で同じ敵・同じ隊になるよう、遠征の乱数の種（時刻）を固定する。以前は毎回別の敵と比べていて、群れの敵（攻撃回数が多い）に当たると結果がぶれた
  await p.clock.setFixedTime(new Date('2026-11-05T12:00:00+09:00'));
  await p.addInitScript((f) => { try { localStorage.setItem('rb-fast', f ? '1' : '0'); localStorage.setItem('rb-tips', JSON.stringify({})); } catch (e) { /* */ } }, fast);
  await p.goto(indexURL); await p.waitForTimeout(400);
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => ({ pressed: document.getElementById('spdBtn').getAttribute('aria-pressed'), cls: document.body.classList.contains('fast') }));
  // 戦闘そのものの時間を、ページの中で測る：ターンの処理が始まって（resolve）から、次に選べる（choose）・決着（over）まで（v5.5.6）。
  //   以前は「押してからボタンが出るまで」をテストの外から測っていて、押す・待つの手間（約1秒、速さに関係ない）が混ざり、62〜65% と基準のすぐ下で揺れていた。
  //   ゲームの中では、2倍速でちょうど半分（3232ms→1616ms）だった
  await p.evaluate(() => { window.__sp = {}; let lp = null; const tick = () => { const R = window.__rb, ph = R ? R.phase : null; if (ph !== lp) { if (ph === 'resolve' && window.__sp.a == null) window.__sp.a = performance.now(); if ((ph === 'choose' || ph === 'over') && window.__sp.a != null && window.__sp.b == null) window.__sp.b = performance.now(); lp = ph; } if (window.__sp.b == null) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  await p.click('#btnStart');
  await p.waitForSelector('#btnRotate:not([hidden]), #result:not([hidden]), #runv:not([hidden])', { timeout: 60000 });
  await p.waitForFunction(() => window.__sp && window.__sp.b != null, null, { timeout: 10000 }).catch(() => {});
  const ms = await p.evaluate(() => Math.round((window.__sp.b || 0) - (window.__sp.a || 0))); await ctx.close();
  return { ms, st, errs };
}
(async () => {
  const b = await launch();
  // 交互に3回ずつ測って真ん中の値で比べる（v5.5.4：1回ずつだと機械の混み具合で 58〜68% まで揺れ、main でも3回中2回落ちた）
  const med = (xs) => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  const A = [], F = [];
  for (let i = 0; i < 3; i++) { A.push(await battle(b, false)); F.push(await battle(b, true)); }
  const a = { ms: med(A.map((x) => x.ms)), st: A[0].st, errs: A.flatMap((x) => x.errs) }, f = { ms: med(F.map((x) => x.ms)), st: F[0].st, errs: F.flatMap((x) => x.errs) };
  console.log('通常', A.map((x) => x.ms).join('/'), 'ms / 2倍速', F.map((x) => x.ms).join('/'), 'ms（真ん中の値で比べる）');
  ok(a.st.pressed === 'false' && !a.st.cls, '初期は通常速度（ボタンは押されていない）');
  ok(f.st.pressed === 'true' && f.st.cls, '保存された2倍速が復元される');
  ok(f.ms < a.ms * 0.65, '2倍速の戦闘は通常の65%未満の時間（' + Math.round(f.ms / a.ms * 100) + '%）');
  ok(!a.errs.length && !f.errs.length, 'ページのエラーなし ' + JSON.stringify(a.errs.concat(f.errs)));
  // ボタンの切り替え
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(indexURL); await p.waitForTimeout(400);
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
  if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk');   // 案内は上の帯の上に出る（v5.2.2）。閉じてから押す
  await p.click('#spdBtn');
  const on = await p.evaluate(() => ({ a: document.getElementById('spdBtn').getAttribute('aria-pressed'), s: localStorage.getItem('rb-fast') }));
  await p.click('#spdBtn');
  const off = await p.evaluate(() => ({ a: document.getElementById('spdBtn').getAttribute('aria-pressed'), s: localStorage.getItem('rb-fast') }));
  ok(on.a === 'true' && on.s === '1' && off.a === 'false' && off.s === '0', 'ボタンで切り替わり、保存される');
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
