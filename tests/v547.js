// v5.4.7 初めての人が離れないように：回転コンボは第2章から、赤い数字に「あと何発」
// 合格の基準（測る前に決めたもの）：
//  1. 第1章の戦闘では、回転コンボの◆が出ない（回してもたまらない）
//  2. 第2章の戦闘では◆が出て、初めての時だけ案内「一巡りの灯」が出る（v5.5.2 で改名）
//  3. 赤い数字に「あとN発」：N＝そのダメージで倒れるまでの回数（HP÷ダメージを切り上げ）。3発以内のときだけ。倒れる（倒）ときは出さない
//  4. 「あとN発」が盤からはみ出さず、名前の札と重ならない（320×568）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const toChoose = async (p) => { for (let k = 0; k < 400; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' || !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break; await p.waitForTimeout(40); } await p.waitForTimeout(200); };
const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 999; });
    await p.click('#btnStart'); await toChoose(p);
    // 1 第1章
    await p.evaluate(() => { const R = window.__rb; R.setGauge(3); R.enemy.bound = false; R.render(); });
    const c1 = await p.evaluate(() => ({ pips: document.querySelectorAll('#rotMeter .pips.cb').length, full: window.__rb.comboFull() }));
    await p.click('#btnRotate'); await toChoose(p);
    ok(c1.pips === 0 && !c1.full && await p.evaluate(() => window.__rb.combo) === 0, tag + ' 1 第1章では◆が出ず、回してもたまらない ' + JSON.stringify(c1));
    // 3 あとN発
    const r3 = await p.evaluate(async () => { const R = window.__rb, g = R.grid, out = [];
      for (let t = 1; t <= 14; t++) { R.setTurn(t); const inc = R.incoming(g, false, false), ks = Object.keys(inc); if (!ks.length) continue;
        const [r, c] = ks[0].split(',').map(Number), u = g[r][c], d = inc[ks[0]].d, keep = u.hp;
        for (const hp of [d * 2 + 1, d * 3, d * 5, d]) { u.hp = Math.min(u.max, hp); R.render(); await new Promise((q) => requestAnimationFrame(q));
          const el = document.querySelector('.slot[data-r="' + r + '"][data-c="' + c + '"] .inc'), n = el && el.querySelector('.inc-n');
          out.push({ hp: u.hp, d, ko: !!(el && el.classList.contains('ko')), n: n ? n.textContent : '' }); }
        u.hp = keep; R.render(); break; }
      return out; });
    const want = (x) => (x.ko || Math.ceil(x.hp / x.d) > 3 ? '' : 'あと' + Math.ceil(x.hp / x.d) + '発');
    if (!r3.length) ok(true, tag + ' 3 （この敵では、攻撃が来るターンが無かった）'); else ok(r3.every((x) => x.n === want(x)), tag + ' 3 「あとN発」は3発以内だけ、倒れるときは出さない ' + JSON.stringify(r3));
    // 4 はみ出し
    const r4 = await p.evaluate(() => { const R = window.__rb, g = R.grid; for (let t = 1; t <= 14; t++) { R.setTurn(t); const ks = Object.keys(R.incoming(g, false, false)); if (ks.length) { const [r, c] = ks[0].split(',').map(Number); g[r][c].hp = Math.max(2, R.incoming(g, false, false)[ks[0]].d * 2); R.render(); return true; } } return false; });
    if (r4) { await p.waitForTimeout(200);
      const g4 = await p.evaluate(() => { const n = document.querySelector('.inc-n'); if (!n) return null; const a = n.getBoundingClientRect(), bd = document.getElementById('board').getBoundingClientRect(); return { a: { left: a.left, right: a.right, top: a.top, bottom: a.bottom }, inBoard: a.left >= bd.left - 1 && a.right <= bd.right + 1, nms: [...document.querySelectorAll('#board .nm')].map((e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }) }; });
      ok(!!g4 && g4.inBoard && g4.nms.every((m) => ov(g4.a, m) < 2), tag + ' 4 「あとN発」が盤からはみ出さず、名前の札と重ならない'); }
    // 2 第2章
    await p.evaluate(() => { const R = window.__rb; R.run.node = 3; localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); R.setGauge(3); R.enemy.bound = false; R.render(); });
    await p.waitForTimeout(1600);   // 案内は、その場ですぐ出る（維持を押すと閉じて「見た」になる）
    const c2 = await p.evaluate(() => ({ pips: document.querySelectorAll('#rotMeter .pips.cb i').length, tip: document.getElementById('tip').hidden ? '' : document.getElementById('tipT').textContent }));
    ok(c2.pips === 3 && /一巡りの灯/.test(c2.tip), tag + ' 2 第2章では◆が出て、初めての案内が出る ' + JSON.stringify(c2));
    ok(!errs.length, tag + ' ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
