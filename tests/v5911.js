// v5.9.11 「回す時、動きや挙動がおかしい（カクカク・遅い）」（2026-11-19 Jiro さん、iPhone）
// 合格の基準（測る前に決めたもの）：
//  1 回すとき、上に上がる仲間の動きは待ちのあいだも元の場所に置く（fill が backwards か both）。待ちの途中の位置が元の位置に近い（行き先にちらつかない）
//  2 回したあとの選ぶ画面で、下の「回す」「維持」が画面の中に収まり、ページが縦にはみ出さない（390・375・320）
//  3 回したあとの選ぶ画面で、盤の大きさ合わせ（fitBoard）を呼んでも、組み直しは数回で済む（同じ条件なら測り直さない）
//  4 画面の大きさが変わったら盤の大きさを合わせ直す（375×667 → 390×844 で 1マスの大きさが変わる、はみ出さない）
//  5 ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1, einfo: 1 };
async function toBattle(p, w) {
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', JSON.stringify(t)); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(700);
  for (let k = 0; k < 5 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, 120); await p.waitForTimeout(300); }
  const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo'); await p.waitForTimeout(900);
  await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 9999; });
  await p.click('#btnStart');
  await waitChoose(p);
}
async function waitChoose(p) {
  for (let i = 0; i < 300; i++) { if (await p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnRotate').hidden && !document.getElementById('btnRotate').disabled)) break; if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk').catch(() => {}); await p.waitForTimeout(80); }
  await p.waitForTimeout(700);
}
(async () => {
  const b = await launch();
  // 1 上がる仲間がちらつかない
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await toBattle(p, 390);
    const r = await p.evaluate(async () => {
      const old = {}; document.querySelectorAll('#board .tok[data-id]').forEach((t) => { const q = t.getBoundingClientRect(); old[t.dataset.id] = q.top; });
      document.getElementById('btnRotate').click();
      await new Promise((res) => setTimeout(res, 0));
      const out = [];
      document.querySelectorAll('#board .tok[data-id]').forEach((t) => {
        const a = t.getAnimations().find((x) => x.effect && x.effect.getTiming().duration === 420); if (!a) return;
        const tm = a.effect.getTiming(); if (!(tm.delay > 0)) return;   // 待ちのある動き＝上がる仲間
        a.pause(); a.currentTime = tm.delay / 2;   // 待ちの途中
        const now = t.getBoundingClientRect().top; a.play();
        out.push({ fill: tm.fill, d: Math.round(Math.abs(now - old[t.dataset.id])) });
      });
      return out;
    });
    ok(r.length > 0 && r.every((x) => (x.fill === 'backwards' || x.fill === 'both') && x.d <= 20), '1 上がる仲間は待ちのあいだも元の場所 ' + JSON.stringify(r));
    ok(!errs.length, '1 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 2・3 回したあと、下のボタンが画面の中・組み直しは数回
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await toBattle(p, w);
    await p.click('#btnRotate'); await waitChoose(p);
    const fit = await p.evaluate(() => { const d = document.getElementById('dock').getBoundingClientRect(), de = document.documentElement; return { dock: Math.round(d.bottom), H: innerHeight, sh: de.scrollHeight }; });
    ok(fit.dock <= fit.H + 1 && fit.sh <= fit.H + 1, tag + ' 2 回したあとも下のボタンが画面の中・はみ出しなし ' + JSON.stringify(fit));
    const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
    const L = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'LayoutCount').value;
    const l0 = await L();
    await p.evaluate(() => { for (let i = 0; i < 5; i++) { window.__rb.render(); document.body.offsetHeight; } });
    await p.waitForTimeout(300);
    const n = (await L()) - l0;
    ok(n <= 30, tag + ' 3 同じ条件で render を5回呼んでも組み直しは ' + n + ' 回（v5.9.10 では72〜77回）');
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 4 画面の大きさが変わったら合わせ直す
  {
    const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await toBattle(p, 375);
    const cell = () => p.evaluate(() => Math.round(document.querySelector('#board .slot').getBoundingClientRect().width));
    const c0 = await cell();
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
    await p.evaluate(() => window.__rb.render()); await p.waitForTimeout(400);
    const c1 = await cell();
    const fit = await p.evaluate(() => ({ dock: Math.round(document.getElementById('dock').getBoundingClientRect().bottom), H: innerHeight, sh: document.documentElement.scrollHeight }));
    ok(c1 !== c0 && fit.dock <= fit.H + 1 && fit.sh <= fit.H + 1, '4 画面を大きくすると1マスが ' + c0 + '→' + c1 + 'px・はみ出しなし ' + JSON.stringify(fit));
    ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
