// 気力の見え方（v5.1.28）：足りない／縛られているとき「回す」が金色をやめて理由を出し、維持が金色になる。押すと揺れて知らせる。
// 地図の「進む」ボタンの名前が、選んだ札の敵の名前と一致する。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h, mob] of [[390, 844, true], [844, 390, true], [1280, 800, false]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) {} });
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(600);
    // 地図：札の名前と進むボタンの名前
    const names = await p.evaluate(async () => { const out = []; const cards = [...document.querySelectorAll('#rvCards .rv-card')]; for (const c of cards) { c.click(); await new Promise((r) => setTimeout(r, 60)); out.push([c.querySelector('b').textContent.replace(/\s+/g, ' ').trim(), document.getElementById('rvGo').textContent]); } return out; });
    ok(names.every(([t, g]) => g.replace(/\s+/g, ' ').includes(t.replace(/^(戦闘|章の主|休息)\s*/, '$1 ').trim())), w + 'x' + h + ' 地図の札と「進む」の名前が一致 ' + JSON.stringify(names));
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(1, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); });
    await p.waitForTimeout(300); await p.click('#btnStart');
    for (let k = 0; k < 80; k++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(120); }
    const look = () => p.evaluate(() => { const b = document.getElementById('btnRotate'), s = getComputedStyle(b); return { dis: b.disabled, block: b.dataset.block || '', bg: s.backgroundImage.slice(0, 40), stayGold: document.getElementById('btnStay').classList.contains('only'), why: b.dataset.why || '', pips: document.querySelectorAll('#rotMeter .pips i').length, meter: document.getElementById('rotMeter').textContent, chip: document.getElementById('chipTurn').textContent, label: b.getAttribute('aria-label') }; });
    await p.evaluate(() => window.__rb.setGauge(3)); const a = await look();
    await p.evaluate(() => window.__rb.setGauge(1)); const lo = await look();
    ok(!a.dis && !a.block && !a.stayGold && a.meter === '' && a.pips === 3 && /●●●/.test(a.chip), '気力3：回せる・ボタンは●だけ（文字なし・v5.1.58） ' + JSON.stringify(a));
    ok(lo.dis && lo.block === 'low' && !lo.stayGold && lo.bg !== a.bg && lo.meter === '' && /次のターンに回せる/.test(lo.why) && /回せない/.test(lo.label) && /●○○/.test(lo.chip), '気力1：回すは金のまま斜線、ボタンに文字は出さず理由は押したとき（v5.1.58）、維持は金色にしない(C9) ' + JSON.stringify(lo));
    const r = await p.evaluate(() => { const x = document.getElementById('btnRotate').getBoundingClientRect(); return [x.left + x.width / 2, x.top + x.height / 2]; });
    if (mob) await p.touchscreen.tap(r[0], r[1]); else await p.mouse.click(r[0], r[1]);
    await p.waitForTimeout(250); const deny = await p.evaluate(() => ({ tip: (document.getElementById('rotTip') || {}).textContent || '', tipOn: !!document.querySelector('#rotTip.on'), shake: document.getElementById('btnRotate').classList.contains('deny'), flash: document.getElementById('chipTurn').classList.contains('rb-flash'), turn: window.__rb.turn }));
    ok(deny.shake && deny.turn === 2 && deny.tipOn && /次のターンに回せる/.test(deny.tip), '押せない回すを押すと、揺れて吹き出しで理由（ターンは進まない）' + JSON.stringify(deny));
    await p.evaluate(() => { window.__rb.enemy.bound = true; window.__rb.setGauge(3); }); const bd = await look();
    ok(bd.dis && bd.block === 'bind' && !bd.stayGold && /縛られている/.test(bd.why), '縛り：回すに「縛られている」' + JSON.stringify(bd));
    const hit = await p.evaluate(() => [...document.querySelectorAll('.icon-btn')].filter((e) => e.offsetParent).map((e) => { const s = getComputedStyle(e, '::after'); return Math.min(parseFloat(s.height), parseFloat(s.width)); }));
    ok(hit.length && hit.every((v) => v >= 38), '上の丸ボタンの押せる範囲が広い ' + JSON.stringify(hit));
    ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
