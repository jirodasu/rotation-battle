// v5.4.0 補助の矢印（攻撃補助＝金、防御補助＝青）
// 合格の基準（測る前に決めたもの）：
//  1. 補助列の「攻+7」「防-7」の札は出ない。読み上げ（aria-label）には攻撃補助・防御補助の数字が残る
//  2. 矢印は、補助列の仲間の円から、真上（同じ側）の攻撃列の仲間の名前の札の下まで。ほかの列には伸びない
//  3. 攻撃補助の矢印：実線なのは、真上の仲間の剣の数字が金色（補助込み）のときだけ。それ以外は点線
//  4. 防御補助の矢印：真上の仲間が狙われ、防御補助が使えるときは実線。使い切ったら点線
//  5. 「回す」を長押しすると、回した後の並びで矢印を描く。戦闘の演出中（resolve）は矢印を出さない
//  6. 393×852・320×568・852×393：根元の「攻」「防」の丸どうしが重ならず、盤の中に収まる。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const arrows = () => [...document.querySelectorAll('#supAr .sa')].map((g) => { const r = g.getBoundingClientRect(), lb = g.querySelector('.lb').getBoundingClientRect(), hd = g.querySelector('.hd'), ln = g.querySelector('.bd, .ds').getBoundingClientRect();
  return { c: +g.dataset.c, k: g.classList.contains('a') ? 'a' : 'd', on: g.classList.contains('on'), lb: { l: lb.left, r: lb.right, t: lb.top, b: lb.bottom }, top: hd ? hd.getBoundingClientRect().top : ln.top, x: (lb.left + lb.right) / 2, box: { l: r.left, r: r.right, t: r.top, b: r.bottom } }; });
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [852, 393]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(2600);
    // 1
    const s1 = await p.evaluate(() => ({ seals: document.querySelectorAll('#board .tok .seal').length, aria: [...document.querySelectorAll('#board .slot[data-r="1"]')].map((e) => e.getAttribute('aria-label')).join('/') }));
    ok(s1.seals === 0 && /攻撃補助\+\d+/.test(s1.aria) && /防御補助-\d+/.test(s1.aria), tag + ' 1 札は出ず、読み上げに数字が残る ' + s1.aria);
    // 2・6（陣立て）
    const geo = async (lbl) => {
      const r = await p.evaluate((fn) => { const B = document.getElementById('board'), bR = B.getBoundingClientRect(), lay = (el) => { let t = 0, e = el; while (e && e !== B) { t += e.offsetTop; e = e.offsetParent; } return { bottom: bR.top + t + el.offsetHeight }; };   // 名前の札は、仲間の絵の揺れ（transform）を含まない置き場所で比べる
        const A = eval(fn)(), R = window.__rb, g = R.ghost ? null : null, out = [];
        const src = R.previewOn ? R.previewGrid() : R.grid;
        A.forEach((a) => { const d = document.querySelector('.slot[data-r="1"][data-c="' + a.c + '"] .disc').getBoundingClientRect(), nm = src[0][a.c] ? lay(document.querySelector('.slot[data-r="0"][data-c="' + a.c + '"] .nm')) : null, bd = document.getElementById('board').getBoundingClientRect();
          out.push({ c: a.c, k: a.k, on: a.on, inDisc: a.x > d.left && a.x < d.right && a.lb.t >= d.top - 2 && a.lb.b <= d.bottom, reach: nm ? (a.on ? Math.abs(a.top - nm.bottom) <= 3 : a.top <= nm.bottom + 4) : true, dbg: nm ? Math.round(a.top) + "/" + Math.round(nm.bottom) : "", inBoard: a.box.l >= bd.left - 1 && a.box.r <= bd.right + 1, sup: !!(src[1][a.c] && (a.k === 'a' ? src[1][a.c].atkSup : src[1][a.c].defSup)) }); });
        const lbs = A.map((a) => a.lb), clash = lbs.some((x, i) => lbs.some((y, j) => j > i && Math.min(x.r, y.r) - Math.max(x.l, y.l) > 1 && Math.min(x.b, y.b) - Math.max(x.t, y.t) > 1));
        const want = []; for (let c = 0; c < src[1].length; c++) { const u = src[1][c]; if (u && u.atkSup > 0) want.push(c + 'a'); if (u && u.defSup > 0) want.push(c + 'd'); }
        return { out, clash, want: want.join(), got: A.map((a) => a.c + a.k).join() }; }, '(' + arrows.toString() + ')');
      ok(r.want === r.got && r.want.length > 0, tag + ' 2 ' + lbl + '：補助の仲間の数だけ矢印 ' + r.got);
      ok(r.out.every((a) => a.inDisc && a.reach && a.inBoard && a.sup), tag + ' 2 ' + lbl + '：補助の円から、真上の仲間の名前の札の下まで ' + JSON.stringify(r.out.filter((a) => !(a.inDisc && a.reach && a.inBoard))));
      ok(!r.clash, tag + ' 6 ' + lbl + '：「攻」「防」の丸が重ならない');
      return r;
    };
    const prep = await geo('陣立て');
    ok(prep.out.filter((a) => a.k === 'a').every((a) => a.on), tag + ' 3 陣立てでは攻撃補助は実線（戦闘の1手目で使える）');
    // 戦闘へ
    await p.click('#btnStart');
    let sawResolve = null;
    for (let k = 0; k < 200; k++) { const st = await p.evaluate(() => ({ ph: window.__rb.phase, n: document.querySelectorAll('#supAr .sa').length })); if (st.ph === 'resolve' && sawResolve === null) sawResolve = st.n; if (st.ph === 'choose') break; await p.waitForTimeout(60); }
    ok(sawResolve === 0, tag + ' 5 戦闘の演出中は矢印を出さない（' + sawResolve + '）');
    await p.waitForTimeout(400);
    // 3 攻撃補助は剣の数字の金色と一致
    const s3 = await p.evaluate((fn) => eval(fn)().filter((a) => a.k === 'a').map((a) => ({ on: a.on, buf: !!document.querySelector('.slot[data-r="0"][data-c="' + a.c + '"] .dm.buf') })), '(' + arrows.toString() + ')');
    ok(s3.length > 0 && s3.every((a) => a.on === a.buf), tag + ' 3 攻撃補助の実線＝剣の数字が金色 ' + JSON.stringify(s3));
    await p.evaluate(() => { const R = window.__rb; R.grid[1].forEach((u) => { if (u) u.atkReady = true; }); R.render(); }); await p.waitForTimeout(120);   // 矢印は次の描画の前に描く（v5.4.0）
    const s3b = await p.evaluate((fn) => eval(fn)().filter((a) => a.k === 'a').map((a) => ({ on: a.on, buf: !!document.querySelector('.slot[data-r="0"][data-c="' + a.c + '"] .dm.buf') })), '(' + arrows.toString() + ')');
    ok(s3b.every((a) => a.on === a.buf), tag + ' 3 補助を戻すと実線（剣の数字も金色） ' + JSON.stringify(s3b));
    // 4 防御補助
    const s4 = await p.evaluate(async (fn) => { const fr = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const R = window.__rb, A = eval(fn), g = R.grid; let col = -1, found = false;
      for (let t = 1; t <= 14 && !found; t++) { R.setTurn(t); const a = R.actOf(R.enemy); if (a.pierce) continue; const inc = R.incoming(g, false, false); for (let c = 0; c < g[1].length; c++) if (g[1][c] && g[1][c].defSup > 0 && inc['0,' + c]) { col = c; found = true; break; } }
      if (!found) return null;
      g[1][col].defReady = true; R.render(); await fr(); const on = A().find((a) => a.k === 'd' && a.c === col).on;
      g[1][col].defReady = false; R.render(); await fr(); const off = A().find((a) => a.k === 'd' && a.c === col).on;
      g[1][col].defReady = true; R.render(); return { col, on, off }; }, '(' + arrows.toString() + ')');
    if (s4) ok(s4.on === true && s4.off === false, tag + ' 4 狙われて使えるときは実線、使い切ると点線 ' + JSON.stringify(s4));
    else ok(true, tag + ' 4 （この敵では、防御補助の仲間の真上が狙われるターンが無かった）');
    // 5 長押しの先読み
    await p.evaluate(() => { window.__rb.setGauge(3); window.__rb.render(); });
    const bx = await p.evaluate(() => { const q = document.getElementById('btnRotate').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.mouse.move(bx.x, bx.y); await p.mouse.down();
    await p.waitForFunction(() => window.__rb.previewOn, null, { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(150);
    const pv = await p.evaluate(() => window.__rb.previewOn);
    if (pv) { const r = await geo('先読み'); ok(r.out.every((a) => a.sup), tag + ' 5 先読み中は、回した後の補助列の仲間から矢印'); }
    else ok(false, tag + ' 5 長押しで先読みが出なかった');
    await p.mouse.move(bx.x, bx.y + 400); await p.mouse.up(); await p.waitForTimeout(300);
    ok(!errs.length, tag + ' ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
