// v5.7.5 物語の続き（提案C）：冒頭は4枚、残り3枚は第1章の主を倒して第2章の地図に入るとき
// 合格の基準（測る前に決めたもの）：
//  1. 第2章の地図（地点4）に入ると、まだ見ていなければ「物語の続き」3枚が出る。番号は「五」から、1枚目は「冒険者」を含む、最後のボタンは「第2章へ」
//  2. 「第2章へ」で閉じると、一巡りの灯の説明（hmIntro）が続けて出る（まだ見ていなければ）。rb-story2 が記録される
//  3. もう一度第2章の地図を開いても、続きは出ない
//  4. 第1章の地図（地点2）では出ない。タイトルの「物語」は、続きを見たあとは7枚。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"bench":1}';   // hmIntro は未読
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); } catch (e) { /* */ } }, TIPS);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
  const st = () => p.evaluate(() => ({ open: !document.getElementById('story').hidden, num: document.getElementById('stNum').textContent, text: document.getElementById('stTxt').textContent, n: document.querySelectorAll('#stDots i').length, go: document.getElementById('stGo').hidden ? '' : document.getElementById('stGo').textContent, hm: !document.getElementById('hmIntro').hidden }));
  // 4：第1章（地点2）の地図
  await p.evaluate(() => { const R = window.__rb; R.run.node = 1; R.run.choices = R.routeChoices(); R.expShowMap([]); }); await p.waitForTimeout(300);
  const c1 = await st();
  ok(!c1.open, '4 第1章（地点2）の地図では続きは出ない');
  // 1：第2章（地点4）の地図
  await p.evaluate(() => { const R = window.__rb; R.run.node = 3; R.run.choices = R.routeChoices(); R.expShowMap([]); }); await p.waitForTimeout(300);
  const s0 = await st(); const pages = [s0];
  for (let k = 0; k < 2; k++) { await p.mouse.click(195, 200); await p.waitForTimeout(150); pages.push(await st()); }
  ok(s0.open && s0.n === 3 && s0.num === '五' && /冒険者/.test(s0.text) && !s0.hm, '1 第2章の地図で物語の続き（3枚・五から） ' + JSON.stringify({ num: s0.num, n: s0.n, t: s0.text.slice(0, 12) }));
  ok(pages[2].num === '七' && pages[2].go === '第2章へ' && !pages[0].go && !pages[1].go, '1 最後（七）だけ「第2章へ」 ' + JSON.stringify(pages.map((x) => x.num + ':' + x.go)));
  await p.click('#stGo'); await p.waitForTimeout(300);
  const a = await st(), seen = await p.evaluate(() => localStorage.getItem('rb-story2'));
  ok(!a.open && a.hm && seen === '1', '2 閉じると一巡りの灯の説明が続き、rb-story2 が記録される ' + JSON.stringify({ open: a.open, hm: a.hm, seen }));
  await p.evaluate(() => document.getElementById('hmGo').click()); await p.waitForTimeout(200);
  // 3：もう一度
  await p.evaluate(() => { const R = window.__rb; R.expShowMap([]); }); await p.waitForTimeout(300);
  ok(!(await st()).open, '3 もう一度開いても続きは出ない');
  // 4：タイトルの「物語」は7枚
  await p.evaluate(() => { localStorage.removeItem('rb-exp-save'); }); await p.reload(); await p.waitForTimeout(400);
  if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
  await p.click('#storyBtn'); await p.waitForTimeout(200);
  const t0 = await st();
  ok(t0.open && t0.n === 7 && t0.num === '一', '4 続きを見たあと、タイトルの「物語」は7枚 ' + JSON.stringify({ n: t0.n, num: t0.num }));
  ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / '));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
