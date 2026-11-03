// v5.4.8 残っていた不具合の直し
// 合格の基準（測る前に決めたもの）：
//  1. 選ぶ場面に入ったとき、敵パネル（stage）の高さが1回で決まる（1コマだけ違う大きさで出て、すぐ変わる揺れがない）。普通の敵・三位一体の両方、3ターン
//  2. 「しのいだ」の判に金色を使わない（文字・枠が白と青灰）
//  3. 案内の吹き出しは、出たあとに予告の札や盤の大きさが変わっても、置き直される（予告の札に重ならない）
//  4. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
(async () => {
  const b = await launch();
  for (const foe of [1, 'trinity']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250); await p.click('#begin'); await p.waitForTimeout(600);
    await p.evaluate((foe) => { const R = window.__rb, c = R.run.choices.find((x) => x.type === 'battle'); R.run.map[c.rid] = { foe, variant: null }; }, foe);
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
    await p.evaluate(() => { window.__H = []; let last = null, ph = null; const f = () => { const R = window.__rb; if (R.phase !== ph) { ph = R.phase; window.__H.push('|' + ph); last = null; } if (ph === 'choose') { const v = Math.round(document.getElementById('stage').getBoundingClientRect().height); if (v !== last) { window.__H.push(v); last = v; } } requestAnimationFrame(f); }; f(); });
    await p.click('#btnStart');
    for (let t = 0; t < 3; t++) { for (let k = 0; k < 300; k++) { if (await p.evaluate(() => !document.getElementById('result').hidden || !document.getElementById('runv').hidden || (window.__rb.phase === 'choose' && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(500); if (await p.evaluate(() => window.__rb.phase !== 'choose')) break; await p.click('#btnStay').catch(() => {}); }
    const H = await p.evaluate(() => window.__H.join(' '));
    const segs = H.split('|choose').slice(1).map((x) => x.split('|')[0].trim().split(' ').filter(Boolean));
    ok(segs.length >= 2 && segs.every((sg) => sg.length <= 1), '1 [' + foe + '] 選ぶ場面に入ると、敵パネルの高さが1回で決まる ' + H);
    ok(!errs.length, '4 [' + foe + '] ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 2・3
  { const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '0'); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => { const d = document.createElement('div'); d.id = 'stampOk'; d.innerHTML = '<b class="disp">しのいだ</b><small>誰も倒れなかった</small>'; document.getElementById('stage').appendChild(d); const cs = getComputedStyle(d); return { color: cs.color, border: cs.borderTopColor }; });
    const gold = (c) => { const m = c.match(/\d+/g).map(Number); return m[0] > m[2] + 40 && m[1] > m[2] + 20; };
    ok(!gold(st.color) && !gold(st.border), '2 「しのいだ」の判は金色を使わない ' + JSON.stringify(st));
    // 案内を出し、そのあとで予告の札を高くする
    const t3 = await p.evaluate(async () => { const tip = document.getElementById('tip'); if (tip.hidden) { localStorage.setItem('rb-tips', '{}'); const R = window.__rb, a = R.actOf(R.enemy); a.pierce = true; if (a.rule === 'charge' || a.rule === 'bind') a.rule = 'lowhp'; R.render(); await new Promise((r) => setTimeout(r, 1500)); }
      if (tip.hidden) return null; const tk = document.getElementById('ticket'); tk.style.minHeight = (tk.getBoundingClientRect().height + 60) + 'px';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await new Promise((r) => setTimeout(r, 100));
      const a = tip.getBoundingClientRect(), t = tk.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left)) * Math.max(0, Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top))); });
    if (t3 == null) ok(true, '3 （案内が出る場面ではなかった）'); else ok(t3 < 2, '3 予告の札が高くなっても、案内が置き直されて重ならない（重なり ' + t3 + 'px²）');
    ok(!errs.length, '4 ページのエラーなし ' + errs.join('/'));
    await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
