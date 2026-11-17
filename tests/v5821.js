// v5.8.21 深さ4・5の枠と、亜種を重ねる割合（2026-11-17 承認：深さ3は35%・深さ4と5は50%・深さ3〜5の敵のHP・技の底上げ deepMul はやめる）
// 合格の基準（測る前に決めたもの）：
//  1 重ねる割合：多くの地図で数えると、深さ3は約35%（25〜45%）、深さ4・5は約50%（40〜60%）。深さ1・2は重ねない
//  2 底上げなし：同じ敵・同じ亜種なら、深さ3・4の HP と技のダメージは深さ2と同じ
//  3 深さ4は、どれかの隊で深さ3を踏破するまで選べない（beginExp で深さ4を指定しても深さ1）。踏破していれば深さ4で始まる
//  4 深さ5は準備中：深さ4を踏破していても開かない（選んでも深さ1）
//  5 深さの画面：札は5枚。深さ3を踏破した記録では深さ4が押せて、深さ5は「未解禁」で押せない。320×568 で画面からはみ出さない
//  6 深さ3の踏破の結果：「開いた：深さ4」が出て、大きいボタンが「深さ4へ挑む」。押すと深さ4で始まる
//  7 QA の depth=4・depth=5 が効く。どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1,"lamp":1,"stayed":1,"mid":1}';
async function open(b, meta, w, h, q) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: h || 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); if (m && !sessionStorage.getItem('seeded')) { localStorage.setItem('rb-exp', m); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, [TIPS, meta ? JSON.stringify(meta) : null]);
  await p.goto(testPage() + (q || '')); await p.waitForTimeout(300); await p.click('#cover').catch(() => {}); await p.waitForTimeout(400);
  return { ctx, p };
}
const W3 = { clears: 3, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1, 'std:3': 1 } };
const W4 = { clears: 4, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1, 'std:3': 1, 'std:4': 1 } };
const start = (p, d) => p.evaluate((d) => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', d); return window.__rb.run.depth; }, d);
(async () => {
  const b = await launch();
  { const { ctx, p } = await open(b, W3);
    // 1 割合
    const r = await p.evaluate(() => { const R = window.__rb, o = {}; R.beginExp('std', 1); [1, 2, 3, 4, 5].forEach((d) => { R.run.depth = d; let n = 0, pr = 0; for (let i = 0; i < 120; i++) { const m = R.expFill(); Object.values(m).forEach((c) => { if (c.variant) { n++; if (c.variant.includes('+')) pr++; } }); } o[d] = { n, rate: +(pr / Math.max(1, n)).toFixed(3) }; }); return o; });
    ok(r[1].rate === 0 && r[2].rate === 0 && r[3].rate >= 0.25 && r[3].rate <= 0.45 && r[4].rate >= 0.4 && r[4].rate <= 0.6 && r[5].rate >= 0.4 && r[5].rate <= 0.6, '1 重ねる割合 ' + JSON.stringify(r));
    // 2 底上げなし
    const e = await p.evaluate(() => { const R = window.__rb, o = {}; [2, 3, 4].forEach((d) => { R.run.depth = d; const x = R.expEnemy(7, 'armor', 1); o[d] = [x.hp, x.pattern.filter((a) => a.dmg).map((a) => a.dmg).join(',')].join('/'); }); return o; });
    ok(e[2] === e[3] && e[3] === e[4], '2 深さ3・4の HP と技は深さ2と同じ ' + JSON.stringify(e));
    // 3 深さ4（深さ3を踏破済み）
    ok(await start(p, 4) === 4, '3 深さ3を踏破していれば深さ4で始まる');
    // 4 深さ5は準備中
    ok(await start(p, 5) === 1, '4 深さ5は準備中で、選んでも深さ1');
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join(' / ')); await ctx.close(); }
  { const { ctx, p } = await open(b, { clears: 2, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1 } });
    ok(await start(p, 4) === 1, '3 深さ3を踏破していなければ、深さ4を選んでも深さ1');
    await ctx.close(); }
  { const { ctx, p } = await open(b, W4);
    ok(await start(p, 5) === 1, '4 深さ4を踏破していても深さ5は開かない');
    await ctx.close(); }
  // 5 深さの画面（320×568）
  { const { ctx, p } = await open(b, W3, 320, 568);
    await p.click('#begin'); await p.waitForTimeout(500);
    await p.click('#rvCards .rv-card'); await p.waitForTimeout(500);
    const s = await p.evaluate(() => { const cs = [...document.querySelectorAll('#rvCards .rv-card')]; return { t: document.getElementById('rvTitle').textContent, n: cs.length, off: cs.map((c) => c.disabled), d5: cs[4] ? cs[4].textContent : '', sw: document.documentElement.scrollWidth }; });
    ok(s.t === 'どの深さへ？' && s.n === 5 && s.off.join() === 'false,false,false,false,true' && /未解禁/.test(s.d5) && s.sw <= 320, '5 深さの札は5枚、深さ4が押せて深さ5は未解禁 ' + JSON.stringify(s));
    await p.screenshot({ path: 'tests/out/v5821_depth320.png' });
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join(' / ')); await ctx.close(); }
  // 6 深さ3の踏破の結果
  { const { ctx, p } = await open(b, { clears: 2, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1 } });
    await start(p, 3);
    await p.evaluate(() => window.__rb.expEnd(true, [])); await p.waitForTimeout(500);
    for (let i = 0; i < 8; i++) { const vis = await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); return !!(c && c.offsetParent && getComputedStyle(c).visibility !== 'hidden' && +getComputedStyle(c).opacity > 0.5); }); if (vis) break; await p.mouse.click(160, 300); await p.waitForTimeout(250); }
    const s = await p.evaluate(() => ({ ev: document.getElementById('rvEvents').innerText.replace(/\s+/g, ' '), c: (document.querySelector('#rvCards .rv-card b') || {}).textContent }));
    ok(/開いた：.*深さ4/.test(s.ev) && s.c === '深さ4へ挑む', '6 「開いた：深さ4」と「深さ4へ挑む」 ' + JSON.stringify(s));
    await p.evaluate(() => document.querySelector('#rvCards .rv-card').click()); await p.waitForTimeout(400);
    ok(await p.evaluate(() => window.__rb.run.depth) === 4, '6 押すと深さ4で始まる');
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join(' / ')); await ctx.close(); }
  // 7 QA
  for (const d of [4, 5]) { const { ctx, p } = await open(b, null, 390, 844, '?qa&ch=2&loc=5&depth=' + d); await p.waitForTimeout(600);
    const s = await p.evaluate(() => ({ d: window.__rb.run && window.__rb.run.depth, ph: window.__rb.phase }));
    ok(s.d === d, '7 QA depth=' + d + ' ' + JSON.stringify(s));
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
