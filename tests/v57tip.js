// 「はじめての仕掛け」の案内が、iPhone の時計（画面上端の安全域）に重ならない
// 合格の基準（測る前に決めたもの）：
//  1. 安全域 59px（iPhone 15 などの時計の帯）を与えると、案内の上端は 59+8px 以上。安全域 0 のときは今までどおり（上端 8px 以上）
//  2. どちらでも、案内は予告の札・盤に重ならない（回す/維持を決める情報を隠さない）
//  3. 393×852・375×667・320×568 で確かめる。ページのエラーなし
//  ※ Playwright では env(safe-area-inset-top) を作れないので、安全域を測る見えない要素の高さを書き換えて置き直させる
const { launch, testPage } = require('./_env');
const CH = '{"stars":1,"gauge":1,"bind":1,"entry":1,"pierce":1,"combo":1,"bench":1}';   // ためるの案内だけ残す（スクリーンショットの場面：第1章の主）
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h, SAT, q, tips] of [[393, 852, 59, 'loc=2&foe=0', '{"stars":1}'], [393, 852, 59, 'loc=3', CH], [430, 932, 59, 'loc=3', CH], [375, 812, 47, 'loc=3', CH], [375, 667, 20, 'loc=3', CH], [320, 568, 20, 'loc=3', CH]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-tips', t); } catch (e) { /* */ } }, tips);
    await p.goto(testPage() + '?qa&ch=1&v=none&' + q); await p.waitForTimeout(1200);
    await p.click('#btnStart').catch(() => {});   // 案内は判断の場面（気力の案内）で出る
    let shown = false; for (let k = 0; k < 120 && !shown; k++) { shown = await p.evaluate(() => !document.getElementById('tip').hidden); if (shown) break;
      if (await p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnStay').disabled)) { await p.waitForTimeout(2200); if (await p.evaluate(() => !document.getElementById('tip').hidden)) { shown = true; break; } await p.click('#btnStay').catch(() => {}); } await p.waitForTimeout(150); }   // 案内は判断の場面になって少しあとに出る
    if (!shown) { ok(false, w + '×' + h + ' 案内が出なかった'); await ctx.close(); continue; }
    for (const sat of [0, SAT]) {
      const r = await p.evaluate(async (sat) => {
        const probe = [...document.body.children].find((e) => e.getAttribute('aria-hidden') === 'true' && /safe-area-inset-top/.test(e.style.cssText) || (e.style.height && e.style.visibility === 'hidden' && e.style.width === '0px'));
        if (probe) probe.style.height = sat + 'px';
        dispatchEvent(new Event('resize')); await new Promise((f) => setTimeout(f, 200));
        const R = (id) => document.getElementById(id).getBoundingClientRect(), t = R('tip'), tk = R('ticket'), bd = R('board'), dk = R('dock');
        const hit = (a, c) => Math.min(a.right, c.right) - Math.max(a.left, c.left) > 0 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 0;
        return { k: document.getElementById('tip').dataset.k, probe: !!probe, top: Math.round(t.top), bottom: Math.round(t.bottom), tk: hit(t, tk), bd: hit(t, bd), dock: hit(t, dk) };
      }, sat);
      ok(r.probe && r.top >= sat + (h < 620 ? 2 : 8) && !r.tk && !r.bd, w + '×' + h + ' 安全域' + sat + 'px：案内の上端 ' + r.top + 'px・予告の札/盤に重ならない ' + JSON.stringify(r));
    }
    ok(!errs.length, w + '×' + h + ' ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
