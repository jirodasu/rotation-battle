// v5.7.0 最初の10分の手直し
// 合格の基準（測る前に決めたもの）：
//  1. 戦闘に勝って報酬の画面が出たら、0.4秒後には戦闘の数字・吹き出し（#fx .pop）が1つも残っていない
//  2. 設定の注記に「Google Fonts から読み込みます」が無い（書体は同梱で、通信しない）
//  3. ページのエラーなし
//  4. 「しのいだ！」：維持なら倒れる見込みの仲間がいて、回した先では誰も倒れない見込みのとき、回すとターンの終わりにその仲間の上に「しのいだ！」が出る
//     v5.7.1：そのとき専用の音（SFX.save）が1回鳴る
//  5. 回した先で別の仲間が倒れる見込みのときは出さない（誰かの代わりに誰かが倒れるのは「しのいだ」ではない）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });   // 演出を減らす設定だと、数字が消える前に報酬の画面になる（v5.6.8 の検証で見つけた）
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-teach-inc', '1'); localStorage.setItem('rb-teach-hold', '1'); } catch (e) { /* */ } }, TIPS);
  await p.goto(testPage()); await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => /Google Fonts から読み込み/.test(document.getElementById('settings').textContent))), '2 設定の注記に「Google Fonts から読み込みます」が無い');
  await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(900);
  // 最初の戦闘へ。敵のHPを1にして、1ターン目で倒す（数字が出た直後に報酬の画面になる）
  const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const E = window.__rb.enemy; E.hp = 1; window.__rb.render(); });
  await p.click('#btnStart');
  let shown = false, left = -1, peak = 0;
  for (let k = 0; k < 200; k++) {
    const s = await p.evaluate(() => ({ rv: !document.getElementById('runv').hidden, n: document.querySelectorAll('#fx .pop').length }));
    peak = Math.max(peak, s.n);
    if (s.rv) { shown = true; await p.waitForTimeout(400); left = await p.evaluate(() => document.querySelectorAll('#fx .pop').length); break; }
    await p.waitForTimeout(50);
  }
  ok(shown && peak > 0, '1 戦闘で数字が出て（最大 ' + peak + ' 個）、報酬の画面になった');
  ok(left === 0, '1 報酬の画面が出て0.4秒後、戦闘の数字は残っていない（' + left + ' 個）');
  ok(!errs.length, '3 ページのエラーなし ' + errs.join(' / '));
  // 4・5：ヒュージラット（亜種なし）。2ターン目は「ためる」、3ターン目「のしかかり」（HPの低い前列に21）
  for (const [sturdy, want, tag] of [[true, true, '4 回した先で誰も倒れない → 出る'], [false, false, '5 回した先でネムリが倒れる → 出ない']]) {
    const q = await ctx.newPage(); const qe = []; q.on('pageerror', (e) => qe.push(e.message));
    await q.goto(testPage() + '?qa&ch=1&loc=1&foe=0&v=none'); await q.waitForTimeout(900);
    const toChoose = async () => { for (let k = 0; k < 150; k++) { await q.waitForTimeout(80); if (await q.evaluate(() => window.__rb.phase === 'choose' || window.__rb.phase === 'over')) break; } };
    await q.click('#btnStart'); await toChoose(); await q.click('#btnStay'); await toChoose();
    await q.evaluate((st) => { const R = window.__rb; R.enemy.hp = 999; R.enemy.max = 999; R.grid[0].forEach((u) => { if (u) u.hp = 1; }); if (st) R.grid[1].forEach((u) => { if (u) { u.max = 99; u.hp = 99; } }); R.render(); }, sturdy);
    const pre = await q.evaluate(() => { const R = window.__rb; return { stayKo: R.outlook(R.grid, false, false).hurt.some((h) => h.ko), rotKo: R.outlook(R.previewGrid(), true, true).hurt.some((h) => h.ko) }; });
    await q.evaluate(() => { window.__snd = 0; const S = window.__rb.SFX, f = S.save; S.save = function () { window.__snd += 1; return f && f.apply(this, arguments); }; });   // v5.7.1：専用の音
    await q.evaluate(() => { window.__saves = []; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('save')) window.__saves.push(n.textContent); }))).observe(document.getElementById('fx'), { childList: true }); });
    await q.click('#btnRotate'); await toChoose(); await q.waitForTimeout(500);
    const got = await q.evaluate(() => window.__saves.slice()), snd = await q.evaluate(() => window.__snd);
    ok(pre.stayKo && pre.rotKo === !sturdy && (got.length > 0) === want && (!want || got[0] === 'しのいだ！') && snd === (want ? 1 : 0) && !qe.length, tag + '（音 ' + snd + '回）' + JSON.stringify({ pre, got, err: qe }));
    await q.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
