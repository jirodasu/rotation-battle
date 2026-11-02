// v5.4.5 回転コンボ（設計書「回転コンボ」）
// 合格の基準（測る前に決めたもの。設計書の 2・5・6）：
//  1. 遠征の戦闘は0から。回すたびに+1、維持では変わらない。「回す」の中に◆の目盛り（気力の下）
//  2. 満タン（3）で回すと発動して0に戻る。その回転で攻撃列に入った仲間の突入技が2倍（履歴に「回転コンボ」）
//  3. 先読み：満タンのとき、ボタンに「突入技強化」、盤の「突」に＋。剣の数字は強化後（2倍の差がそのまま乗る）。先読み中の目盛りは回した後の値
//  4. 見通しの札の「敵」の数字が、実際に与えたダメージと一致する（発動するターン）
//  5. チュートリアルには目盛りが出ない。途中保存から続きを遊ぶと0から（ユーザーの決定：保存形式は変えない）
//  6. あそびかたの「しくみ」に回転コンボの説明。ページのエラーなし（393×852・320×568）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const toChoose = async (p) => { for (let k = 0; k < 400; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' || !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break; await p.waitForTimeout(40); } await p.waitForTimeout(150); };
const pips = (p) => p.evaluate(() => [...document.querySelectorAll('#rotMeter .pips.cb i')].map((i) => (i.classList.contains('on') ? 1 : 0)).reduce((a, b) => a + b, -0) + '/' + document.querySelectorAll('#rotMeter .pips.cb i').length);
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 999; });   // 途中で勝たないように（数値の確かめ用。ゲームは変えない）
    await p.click('#btnStart'); await toChoose(p);
    // 1
    const c0 = await p.evaluate(() => window.__rb.combo);
    ok(c0 === 0 && (await pips(p)) === '0/3', tag + ' 1 戦闘は0から、◆の目盛り3つ ' + c0 + ' ' + await pips(p));
    await p.click('#btnStay'); await toChoose(p);
    ok(await p.evaluate(() => window.__rb.combo) === 0, tag + ' 1 維持では変わらない');
    await p.evaluate(() => { window.__rb.setGauge(3); window.__rb.enemy.bound = false; window.__rb.render(); });
    await p.click('#btnRotate'); await toChoose(p);
    ok(await p.evaluate(() => window.__rb.combo) === 1 && (await pips(p)) === '1/3', tag + ' 1 回すと+1 ' + await pips(p));
    // 3 満タンの先読み
    // 攻撃の突入技を持つ仲間を補助列に置いて、回すと攻撃列に入るようにする（並べ替えだけ。数値は変えない）
    await p.evaluate(() => { const R = window.__rb, g = R.grid; let a = null; for (let r = 0; r < 3; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c] && g[r][c].entry && g[r][c].entry.atk && !a) a = [r, c];
      if (a && a[0] !== 1) { const t = g[1][0]; g[1][0] = g[a[0]][a[1]]; g[a[0]][a[1]] = t; } });
    await p.evaluate(() => { const R = window.__rb; R.setGauge(3); R.enemy.bound = false; R.setCombo(3); R.grid.flat().forEach((u) => { if (u) u.hp = u.max; }); R.render(); });
    await p.waitForTimeout(200);
    const full = await p.evaluate(() => ({ cls: document.getElementById('btnRotate').classList.contains('cbfull'), tag: getComputedStyle(document.querySelector('#btnRotate .cb-tag')).display, aria: document.getElementById('btnRotate').getAttribute('aria-label') }));
    ok(full.cls && full.tag !== 'none' && /満タン/.test(full.aria), tag + ' 3 満タン：ボタンに「突入技強化」 ' + JSON.stringify(full));
    // 剣の数字の差：コンボ3と0で、入ってくる仲間の見込みを比べる
    const dmg = await p.evaluate(() => { const R = window.__rb, pv = R.previewGrid(), out = [];
      R.units(pv).filter((x) => x.r === 0).forEach(({ u, r, c }) => { R.setCombo(3); const a = R.expDmg(u, r, c, pv, true, true); R.setCombo(0); const z = R.expDmg(u, r, c, pv, true, true); R.setCombo(3); out.push({ n: u.name, e: u.entry && (u.entry.atk || 0), hits: u.entry && u.entry.hits, full: a && a.val, zero: z && z.val }); });
      return out; });
    ok(dmg.some((x) => x.e > 0) && dmg.every((x) => (x.e ? x.full - x.zero >= x.e : x.hits ? x.full > x.zero : x.full === x.zero)), tag + ' 3 剣の数字は強化後（攻撃の突入技は差が元の値以上） ' + JSON.stringify(dmg));
    const bx = await p.evaluate(() => { const q = document.getElementById('btnRotate').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.mouse.move(bx.x, bx.y); await p.mouse.down();
    await p.waitForFunction(() => window.__rb.previewOn, null, { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(200);
    const pv = await p.evaluate(() => ({ up: document.querySelectorAll('#board .tok .ent.up').length, fire: document.querySelectorAll('#rotMeter .pips.cb.fire').length, on: document.querySelectorAll('#rotMeter .pips.cb i.on').length, foe: ([...document.querySelectorAll('#ocRot .oc-r')].find((r) => r.querySelector('i').textContent === '敵') || { querySelector: () => ({ textContent: '' }) }).querySelector('b').textContent }));
    await p.mouse.move(bx.x, bx.y + 400); await p.mouse.up(); await p.waitForTimeout(250);
    ok(pv.up > 0 && pv.fire === 1 && pv.on === 0, tag + ' 3 先読み中：盤の「突」に＋、目盛りは回した後（0） ' + JSON.stringify(pv));
    // 2・4 発動
    const pred = await p.evaluate(() => { const b2 = [...document.querySelectorAll('#ocRot .oc-r')].find((r) => r.querySelector('i').textContent === '敵'); return b2 ? b2.querySelector('b').textContent : ''; });
    const hp0 = await p.evaluate(() => window.__rb.enemy.hp);
    await p.click('#btnRotate'); await toChoose(p);
    const after = await p.evaluate(() => ({ combo: window.__rb.combo, log: window.__rb.log.join('\n'), hp: window.__rb.enemy.hp }));
    const m = /-(\d+)/.exec(pred), dealt = hp0 - after.hp;
    ok(after.combo === 0 && /回転コンボ/.test(after.log) && /（強化）|突入技/.test(after.log), tag + ' 2 満タンで回すと発動して0に戻る');
    ok(!!m && +m[1] === dealt, tag + ' 4 見通しの札の「敵」（' + pred + '）が、実際に与えたダメージ（' + dealt + '）と一致');
    // 6 あそびかた
    ok(await p.evaluate(() => /回転コンボ/.test(document.getElementById('hTier1').textContent)), tag + ' 6 あそびかたの「しくみ」に回転コンボ');
    // 5 途中保存から続き
    await p.evaluate(() => { window.__rb.setCombo(2); });
    await p.goto(testPage()); await p.waitForTimeout(500);
    await p.evaluate(() => { const r = document.getElementById('resume'); if (r && !r.hidden) r.click(); }); await toChoose(p); await p.waitForTimeout(300);
    ok(await p.evaluate(() => window.__rb.combo) === 0, tag + ' 5 途中保存から続きを遊ぶと0から');
    ok(!errs.length, tag + ' 6 ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 5 チュートリアル
  { const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#beginTut'); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => document.querySelectorAll('#rotMeter .pips.cb').length === 0 && !window.__rb.comboFull()), '5 チュートリアルには目盛りが出ない');
    await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
