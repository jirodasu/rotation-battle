// 見た目の切り替え（10月だけハロウィンを選べる）：絵・敵の名前・夜の配色が変わり、戦闘の中身と保存は変えない
const { launch, indexURL } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
async function open(b, date, store) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.setFixedTime(new Date(date));
  if (store) await p.addInitScript((s) => { try { Object.keys(s).forEach((k) => localStorage.setItem(k, s[k])); } catch (e) { /* */ } }, store);
  await p.goto(indexURL); await p.waitForTimeout(500);
  return { ctx, p, errs };
}
const startMain = async (p) => { await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(900); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500); };
const state = (p) => p.evaluate(() => ({
  shown: !document.getElementById('skinSel').hidden,
  skin: document.documentElement.getAttribute('data-skin'), theme: document.documentElement.getAttribute('data-theme'),
  o1: document.getElementById('o1').innerHTML, ename: (document.getElementById('ename') || {}).textContent,
  toks: [...document.querySelectorAll('.tok[data-id] svg')].map((s) => s.outerHTML).join('')
}));
(async () => {
  const b = await launch();
  // 10月：ボタンが出て、選ぶと変わる
  let { ctx, p, errs } = await open(b, '2026-10-23T12:00:00+09:00');
  await p.click('#cover'); await p.waitForTimeout(400);
  const n0 = await state(p);
  ok(n0.shown && n0.skin === null && n0.theme === null, '10月は見た目の切り替えが表紙に出る（初期は通常）');
  await p.click('#skinSel button[data-skin="hw"]'); await p.waitForTimeout(300);
  const h0 = await state(p);
  ok(h0.skin === 'hw' && h0.theme === 'dark' && h0.o1 !== n0.o1, 'ハロウィンを選ぶと、表紙の絵が替わり夜の配色になる');
  ok(await p.evaluate(() => localStorage.getItem('rb-skin')) === 'hw', '選んだ見た目が保存される');
  await p.click('#begin'); await p.waitForTimeout(900); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
  const h1 = await state(p);
  ok(/ドラキュラット/.test(h1.ename) && h1.toks.includes('#d61f3a'), '本番の戦闘で、敵がドラキュラット・団員がハロウィン版になる（' + h1.ename + '）');
  ok(!/<g transform="translate\(50 100\) scale\(.9\)/.test(h1.toks), 'ハロウィン版は年齢で顔を変えない');
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs)); await ctx.close();
  // 再起動しても保たれる
  ({ ctx, p, errs } = await open(b, '2026-10-31T20:00:00+09:00', { 'rb-skin': 'hw' }));
  const h2 = await state(p);
  ok(h2.skin === 'hw' && h2.theme === 'dark', '10/31に開き直してもハロウィンのまま'); await ctx.close();
  // 11月：保存がハロウィンでも通常に戻り、ボタンも出ない
  ({ ctx, p, errs } = await open(b, '2026-11-01T09:00:00+09:00', { 'rb-skin': 'hw' }));
  await p.click('#cover'); await p.waitForTimeout(400);
  const m0 = await state(p);
  ok(!m0.shown && m0.skin === null && m0.theme === null, '11月は切り替えが出ず、通常の見た目になる');
  await p.click('#begin'); await p.waitForTimeout(900); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
  const m1 = await state(p);
  ok(/ヒュージラット/.test(m1.ename) && !m1.toks.includes('#d61f3a'), '11月の戦闘は通常の敵・団員（' + m1.ename + '）');
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs)); await ctx.close();
  // 10月でも通常を選び直せる
  ({ ctx, p, errs } = await open(b, '2026-10-10T12:00:00+09:00', { 'rb-skin': 'hw' }));
  await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#skinSel button[data-skin="normal"]'); await p.waitForTimeout(300);
  const r0 = await state(p);
  ok(r0.skin === null && r0.theme === null && await p.evaluate(() => localStorage.getItem('rb-skin')) === 'normal', '通常に戻すと元の見た目と配色になる'); await ctx.close();
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
