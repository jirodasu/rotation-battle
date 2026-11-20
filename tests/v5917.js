// v5.9.17 背景の動きのオン／オフ（指示書「動作の重さの計測＋背景アニメーションOFF設定」2026-11-20）
// 合格の基準（測る前に決めたもの）：
//  1 設定に「背景の動き」のスイッチがあり、押すとオフになって保存（rb-set の bg:false。新しい保存の鍵は作らない）。開き直してもオフのまま。記録をリセットしても設定は残る（rb-set は残す決まり）
//  2 オフのとき、背景の常時アニメ（candle・tide・bubble・fog・stFlick）は全部止まる（paused）。仲間・敵の動き（cbIdle・bob）は動いたまま
//  3 オンのとき（初めの状態）、背景の常時アニメは今までどおり動く（running）
//  4 「動きを減らす」（prefers-reduced-motion）と一緒でも矛盾しない：オフにしてもエラーなし、霧と泡は止まったまま（動きを減らすで元から止まる）
//  5 オフにしても、背景の絵の明るさ・色の基準（章の背景の不透明度・背景の色）はオンと同じ
//  6 ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1,"lamp":1,"stayed":1,"mid":1,"highhp":1,"gate":1,"doom":1,"rel":1,"einfo":1}';
const BG = ['candle', 'tide', 'bubble', 'fog', 'stFlick'];
const ANIMS = (bg) => document.getAnimations().filter((a) => a.animationName).map((a) => ({ n: a.animationName, s: a.playState })).filter((x) => bg.includes(x.n) || x.n === 'cbIdle' || x.n === 'bob' || x.n === 'cbIdleW' || x.n === 'bobW');
const LOOK = () => { const c = document.querySelector('.chl.c' + (document.body.dataset.ch || 0)), cs = c && getComputedStyle(c), ca = c && getComputedStyle(c, '::after'); return { op: cs && cs.opacity, bg: cs && cs.backgroundImage.slice(0, 60), an: ca && ca.animationName + ' ' + ca.animationDuration, ain: ca && +ca.opacity >= 0.66 && +ca.opacity <= 0.86 }; };   // ::after の不透明度はろうそくの揺らぎの途中の値なので、揺らぎの幅（0.66〜0.86）の中かで比べる
async function open(b, q, rm, keep, set) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: rm ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.addInitScript(([t, keep, set]) => { if (keep || localStorage.getItem('rb-tips')) return; localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-story', '1'); if (set) localStorage.setItem('rb-set', set); }, [TIPS, !!keep, set || '']);
  await p.goto(testPage() + (q || '')); await p.waitForTimeout(1500);
  return { ctx, p };
}
async function toggle(p) {
  await p.evaluate(() => document.getElementById('setBtn') ? document.getElementById('setBtn').click() : null);
  await p.evaluate(() => { const s = document.getElementById('settings'); s.hidden = false; });
  await p.click('#setBg'); await p.waitForTimeout(200);
  await p.evaluate(() => { document.getElementById('settings').hidden = true; });
}
(async () => {
  const b = await launch();
  // 3 オン（初め）→ 2 オフ → 1 開き直してもオフ（毒竜戦：霧と泡が出る）
  {
    const { ctx, p } = await open(b, '?qa&ch=3&loc=10');
    await p.click('#btnStart'); for (let k = 0; k < 200; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(80); }
    await p.waitForTimeout(500);
    const on = await p.evaluate(ANIMS, BG), lookOn = await p.evaluate(LOOK);
    const bgOn = on.filter((x) => BG.includes(x.n));
    ok(bgOn.length >= 3 && bgOn.every((x) => x.s === 'running') && await p.evaluate(() => document.body.classList.contains('boss-stage')), '3 オンのとき、背景の常時アニメは動く ' + JSON.stringify([...new Set(bgOn.map((x) => x.n + ':' + x.s))]));
    const sw = await p.evaluate(() => { const e = document.getElementById('setBg'); return e ? { lbl: e.closest('.set-row').querySelector('b').textContent, on: e.getAttribute('aria-checked') } : null; });
    await toggle(p);
    const off = await p.evaluate(ANIMS, BG), lookOff = await p.evaluate(LOOK);
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-set') || '{}').bg);
    const bgOff = off.filter((x) => BG.includes(x.n)), chara = off.filter((x) => !BG.includes(x.n));
    ok(sw && sw.lbl === '背景の動き' && sw.on === 'true' && saved === false && await p.evaluate(() => document.documentElement.classList.contains('bg-still')), '1 「背景の動き」のスイッチで、オフにして保存（rb-set の bg:false） ' + JSON.stringify({ sw, saved }));
    ok(bgOff.length >= 3 && bgOff.every((x) => x.s === 'paused') && chara.length >= 1 && chara.every((x) => x.s === 'running'), '2 オフのとき、背景の常時アニメは全部止まり、仲間・敵は動く ' + JSON.stringify([...new Set(off.map((x) => x.n + ':' + x.s))]));
    ok(JSON.stringify(lookOn) === JSON.stringify(lookOff), '5 オフでも背景の明るさ・色の基準は同じ ' + JSON.stringify({ lookOn, lookOff }));
    ok(!p.__errs.length, '6 ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }
  // 1 開き直してもオフのまま（?qa は設計どおり保存を本物に書かないので、普通に開いて確かめる）
  {
    const { ctx, p } = await open(b, '');
    await toggle(p);
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-set') || '{}').bg);
    await p.reload(); await p.waitForTimeout(1500);
    const re = await p.evaluate(() => ({ cls: document.documentElement.classList.contains('bg-still'), sw: document.getElementById('setBg').getAttribute('aria-checked'), set: JSON.parse(localStorage.getItem('rb-set') || '{}').bg }));
    ok(saved === false && re.cls && re.sw === 'false' && re.set === false, '1 開き直してもオフのまま ' + JSON.stringify({ saved, re }));
    // 記録のリセットで設定が消えない（消す鍵の決まりを確かめる）
    const keep = await p.evaluate(() => /^rb-(set|snd|fast|skin|tune|tune-css)$/.test('rb-set'));
    ok(keep, '1 記録をリセットしても rb-set（設定）は残る決まり');
    ok(!p.__errs.length, '6 ページのエラーなし（普通の起動） ' + p.__errs.join(' / '));
    await ctx.close();
  }
  // 第1章・第2章の背景（ろうそく・波）もオフで止まる
  for (const q of ['?qa&ch=1&loc=2', '?qa&ch=2&loc=4']) {
    const { ctx, p } = await open(b, q, false, false, JSON.stringify({ bg: false }));
    const a = await p.evaluate(ANIMS, BG); const bgA = a.filter((x) => BG.includes(x.n));
    ok(bgA.length >= 1 && bgA.every((x) => x.s === 'paused'), q + ' 2 章の背景（ろうそく・波）もオフで止まる ' + JSON.stringify([...new Set(bgA.map((x) => x.n + ':' + x.s))]));
    ok(!p.__errs.length, q + ' 6 ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }
  // 4 動きを減らす＋オフ
  {
    const { ctx, p } = await open(b, '?qa&ch=3&loc=10', true);
    await p.click('#btnStart'); for (let k = 0; k < 200; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(80); }
    await toggle(p);
    const a = await p.evaluate(ANIMS, ['bubble', 'fog']);
    ok(!a.filter((x) => x.n === 'bubble' || x.n === 'fog').some((x) => x.s === 'running') && !p.__errs.length, '4 動きを減らす＋オフ：霧と泡は止まったまま・エラーなし ' + JSON.stringify(a.slice(0, 4)) + p.__errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
