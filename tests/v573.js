// v5.7.2「回せば、倒れずにすむ」：維持だと倒れる見込み・回せば誰も倒れない見込みのとき、回すボタンの上に吹き出し
// 合格の基準（測る前に決めたもの）：
//  1. 初めての遠征（遠征0回）で、その場面になると、回すボタンの上に「回せば、倒れずにすむ」が出る
//  2. 遠征2回以上では出さない（覚えた人には出さない）
//  3. 回しても誰かが倒れる見込みなら出さない。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  for (const [runs, sturdy, want, tag] of [[0, true, true, '1 初めての遠征・回せば助かる'], [2, true, false, '2 遠征2回目の後'], [0, false, false, '3 回しても倒れる']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, r]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-teach-inc', '1'); localStorage.setItem('rb-teach-hold', '1'); if (r) localStorage.setItem('rb-exp', JSON.stringify({ runs: r, best: 1, hist: [{ clear: false, node: 2, fal: 4 }] })); } catch (e) { /* */ } }, [TIPS, runs]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    for (let k = 0; k < 4; k++) { if (await p.evaluate(() => { const R = window.__rb.run; return !!(R && R.choices && document.getElementById('rvTitle').textContent.includes('進む')); })) break;
      await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(200); await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && !g.disabled) g.click(); }); await p.waitForTimeout(700); }
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(900);
    // 敵はヒュージラット（亜種なし）に差し替え、倒されないようにHPを上げる。1ターン目のあと、判断の場面で盤を作る
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(1, null, 0); R.toPrepForTest(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 999; R.enemy.max = 999; R.render(); });
    await p.click('#btnStart');
    for (let k = 0; k < 150; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__rb.phase === 'choose')) break; }
    // 2ターン目は「ためる」で被害なし → 維持して3ターン目（のしかかり）へ
    await p.evaluate(() => { const t = document.getElementById('tip'); if (t && !t.hidden) document.getElementById('tipOk').click(); });
    await p.click('#btnStay');
    for (let k = 0; k < 150; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__rb.phase === 'choose' && window.__rb.turn === 3)) break; }
    await p.evaluate(() => { const b = document.getElementById('saveHint'); if (b) b.remove(); });
    await p.evaluate((st) => { const R = window.__rb; R.grid[0].forEach((u) => { if (u) u.hp = 1; }); if (st) R.grid[1].forEach((u) => { if (u) { u.max = 99; u.hp = 99; } }); else R.grid[1].forEach((u) => { if (u) u.hp = 1; }); R.render(); }, sturdy);
    await p.waitForTimeout(700);
    const s = await p.evaluate(() => { const b = document.getElementById('saveHint'), r = document.getElementById('btnRotate').getBoundingClientRect(); const v = !!b && !b.hidden && b.classList.contains('on'); const br = v ? b.getBoundingClientRect() : null;
      return { v, text: v ? b.textContent : '', near: v ? (br.bottom <= r.top + 2 || br.top >= r.bottom - 2) && br.right > r.left && br.left < r.right : false, stayKo: !!document.querySelector('#ocStay b.ko'), rotKo: !!document.querySelector('#ocRot b.ko') }; });
    ok(s.v === want && (!want || (/回せば、倒れずにすむ/.test(s.text) && s.near)) && (!want || !(await p.evaluate(() => { const k = document.getElementById('koWarn'); return !!k && !k.hidden && k.classList.contains('on'); }))), tag + '：' + (s.v ? '出る「' + s.text + '」' + (s.near ? '（回すボタンの上）' : '（位置がずれている）') : '出ない') + ' ' + JSON.stringify({ stayKo: s.stayKo, rotKo: s.rotKo }));
    ok(!errs.length, tag + '：ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
