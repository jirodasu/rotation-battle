// v5.1.51 更新5：大技・とどめの演出と、演出を飛ばす。
// 合格の基準（測る前に決めたもの）：
//  1. 「演出を飛ばす」は戦闘の自動進行中（resolve）だけ表示。判断・準備・終了では出ない。敵の絵（stage）と重ならない（敵タップ＝詳細と競合しない）
//  2. 飛ばすと、1ターンが飛ばさないときの50%未満の時間で終わる。押した後にエラーなし
//  3. 大技（big）の着弾：振動が配列（長い振動）で呼ばれ、通常の被弾は単発。設定の振動オフでは、どちらも呼ばれない
//  4. 大技の着弾にかかる時間は、通常の被弾より長くても +0.3秒以内。とどめ演出は 0.9秒以内
//  5. 大技の着弾で全面の白いフラッシュが1枚だけ出る（連打しない）。動きを減らす設定では出ない
//  6. 1ターン全体の所要時間は、v5.1.50（main）の 1.10 倍以内（通常の敵・同じ時刻の種）
const { launch, testPage, indexURL, ROOT } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1}';
async function page(b, url, rm) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-05T12:00:00+09:00'));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-fast', '0'); } catch (e) { /* */ }
    window.__vib = []; navigator.vibrate = (x) => { window.__vib.push(x); return true; }; }, TIPS_ALL);
  await p.goto(url); await p.waitForTimeout(300);
  await p.click('#cover'); await p.waitForTimeout(250); await p.click('#begin'); await p.waitForTimeout(500);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1300);
  return { ctx, p };
}
const turnMs = async (p, skipAt) => {
  const t0 = Date.now(); await p.click('#btnStart');
  if (skipAt != null) { await p.waitForTimeout(skipAt); await p.click('#btnSkip'); }
  await p.waitForSelector('#btnRotate:not([hidden]), #result:not([hidden]), #runv:not([hidden])', { timeout: 60000 });
  return Date.now() - t0;
};
(async () => {
  const b = await launch();
  const mainURL = 'file://' + path.join(__dirname, 'out', 'main.html');
  // 1・2・6
  let normal, skipped, base;
  { const { ctx, p } = await page(b, indexURL, false);
    const pre = await p.evaluate(() => !document.getElementById('btnSkip').hidden);
    ok(!pre, '準備の画面では「演出を飛ばす」は出ない');
    const t0 = Date.now(); await p.click('#btnStart');
    await p.waitForTimeout(500);
    const info = await p.evaluate(() => { const k = document.getElementById('btnSkip'), r = k.getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(), d = getComputedStyle(document.getElementById('dock')).visibility; return { shown: !k.hidden, dock: d, overlap: !(r.bottom <= s.top || r.top >= s.bottom || r.right <= s.left || r.left >= s.right) }; });
    ok(info.shown && info.dock === 'visible', '自動進行中は「演出を飛ばす」が見える');
    ok(!info.overlap, '「演出を飛ばす」は敵の絵（stage）と重ならない＝敵タップの詳細表示と競合しない');
    await p.waitForSelector('#btnRotate:not([hidden]), #result:not([hidden]), #runv:not([hidden])', { timeout: 60000 });
    normal = Date.now() - t0;
    const post = await p.evaluate(() => !document.getElementById('btnSkip').hidden);
    ok(!post, '判断の画面に戻ると「演出を飛ばす」は消える');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close(); }
  { const { ctx, p } = await page(b, indexURL, false); skipped = await turnMs(p, 600);
    ok(!p.__errs.length, '飛ばした後もエラーなし ' + p.__errs.join('/')); await ctx.close(); }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const ns = [normal], bs = [];
  for (let i = 0; i < 3; i++) {
    { const { ctx, p } = await page(b, mainURL, false); bs.push(await turnMs(p, null)); await ctx.close(); }
    if (i < 2) { const { ctx, p } = await page(b, indexURL, false); ns.push(await turnMs(p, null)); await ctx.close(); }
  }
  normal = med(ns); base = med(bs);
  console.log('通常', normal, 'ms / 飛ばす', skipped, 'ms / v5.1.50', base, 'ms');
  ok(skipped < normal * 0.5, '飛ばすと50%未満（' + Math.round(skipped / normal * 100) + '%）');
  ok(normal <= base * 1.10, '1ターンの所要時間は v5.1.50 の1.10倍以内（' + (normal / base).toFixed(2) + '倍）');

  // 3・4・5：大技・通常・とどめ
  { const { ctx, p } = await page(b, testPage(), false);
    const r = await p.evaluate(async () => {
      const R = window.__rb; R.setPhase('resolve');
      const out = {}; const flashes = () => document.querySelectorAll('#fx .flash').length;
      window.__vib.length = 0; let t = performance.now(); await R.hitColumn(0, 2, false, false); out.nT = performance.now() - t; out.nVib = window.__vib.slice(); out.nFlash = flashes();
      window.__vib.length = 0; t = performance.now(); const pr = R.hitColumn(0, 2, false, true); let mx = 0; const iv = setInterval(() => { mx = Math.max(mx, flashes()); }, 15); await pr; clearInterval(iv); out.bFlash = mx; out.bT = performance.now() - t; out.bVib = window.__vib.slice();
      R.SET.vib = false; window.__vib.length = 0; await R.hitColumn(0, 1, false, true); await R.hitColumn(0, 1, false, false); out.offVib = window.__vib.length;
      R.SET.vib = true; window.__vib.length = 0; t = performance.now(); await R.finisherFX(R.foeEl(R.enemy)); out.fT = performance.now() - t; out.fVib = window.__vib.slice();
      return out;
    });
    console.log(JSON.stringify(r));
    ok(r.nVib.length === 1 && !Array.isArray(r.nVib[0]), '通常の被弾の振動は単発');
    ok(r.bVib.length === 1 && Array.isArray(r.bVib[0]) && r.bVib[0].length >= 3, '大技の振動は長いパターン');
    ok(r.offVib === 0, '振動オフでは、大技・通常とも振動なし');
    ok(r.nFlash === 0 && r.bFlash === 1, '白いフラッシュは大技のときだけ、1枚（' + r.bFlash + '）');
    ok(r.bT <= r.nT + 300, '大技の着弾は通常より +0.3秒以内（' + Math.round(r.bT - r.nT) + 'ms）');
    ok(r.fT <= 900 && r.fVib.length === 1 && Array.isArray(r.fVib[0]), 'とどめ演出は0.9秒以内（' + Math.round(r.fT) + 'ms）で、専用の振動');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close(); }
  { const { ctx, p } = await page(b, testPage(), true);
    const r = await p.evaluate(async () => { const R = window.__rb; R.setPhase('resolve'); const pr = R.hitColumn(0, 2, false, true); await new Promise((r) => setTimeout(r, 50)); const n = document.querySelectorAll('#fx .flash').length; await pr; return n; });
    ok(r === 0, '動きを減らす設定では白いフラッシュなし'); await ctx.close(); }

  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
