// v5.3.8 見通しの札（下）と、目のボタンを消す
// 合格の基準（測る前に決めたもの）：
//  1. 選ぶ場面：「回す」「維持」の札に、敵とHPの「いま→次」、いちばん危ない仲間とHPの「いま→次」の2行（v5.5.1）。数字は盤と同じ計算（仲間＝盤の赤い数字、敵＝剣の数字の合計）
//  2. 回せないとき（気力不足）：回すの札は理由を出す。維持の札は見通しのまま
//  3. 陣立て：「戦闘開始」の札に、いまの並びの見通し。「回す」「維持」は出ない
//  4. 目のボタンは出ない。「回す」を長押しすると、回した後の並び（点線）が盤に出る
//  5. どの画面でも2行（敵・仲間）。札は画面内に収まり、数字が … で切れない
//  6. ページのエラーなし（393×852・320×568）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const rows = (id) => [...document.querySelectorAll('#' + id + ' .oc-r')].filter((r) => getComputedStyle(r).display !== 'none').map((r) => [r.dataset.k || r.querySelector('i').textContent, r.querySelector('b').textContent.replace(/HP/g, ''), r.dataset.say || '', r.querySelector('b').className, r.querySelector('b').scrollWidth <= r.querySelector('b').clientWidth + 1]);
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(700);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1400);
    // 3. 陣立て
    const pr = await p.evaluate((rs) => { const rows = eval(rs); return { start: rows('ocStart'), rot: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('btnRotate')).display !== 'none', stay: !document.getElementById('btnStay').hidden }; }, '(' + rows.toString() + ')');
    ok(pr.start.length >= 2 && pr.start.some((r) => r[0] === 'hurt') && pr.start.some((r) => r[0] === 'foe') && !pr.rot && !pr.stay, tag + ' 3 陣立ての戦闘開始に見通し ' + JSON.stringify(pr.start));
    await p.click('#btnStart');
    for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(150); }
    await p.waitForTimeout(500);
    let found = false;
    for (let t = 1; t <= 12 && !found; t++) { await p.evaluate((t) => { window.__rb.setGauge(3); window.__rb.setTurn(t); }, t); found = await p.evaluate(() => Object.keys(window.__rb.incoming(window.__rb.grid, false, false)).length > 0); }
    // 1. 数字が盤と同じ計算
    const r = await p.evaluate((rs) => { const rows = eval(rs), R = window.__rb;
      const exp = (src, fresh, ent) => { const inc = R.incoming(src, fresh, ent); let d = 0; R.units(src).forEach(({ u, r, c }) => { const x = R.expDmg(u, r, c, src, fresh, ent); if (x && x.val > 0) d += x.val; });
        return { hurt: Object.keys(inc).map((k) => { const [a, c] = k.split(',').map(Number); return { n: src[a][c].name, hp: src[a][c].hp, d: inc[k].d, ko: inc[k].ko ? 1 : 0 }; }).sort((x, y) => (y.ko - x.ko) || (y.d - x.d)), dealt: d }; };
      return { stay: rows('ocStay'), rot: rows('ocRot'), es: exp(R.grid, false, false), er: exp(R.previewGrid(), true, true), hp: R.enemy.hp, prev: !document.getElementById('btnPreview').hidden }; }, '(' + rows.toString() + ')');
    const chk = (card, e, hp) => { const m = Object.fromEntries(card.map((x) => [x[0], x])), h = e.hurt[0], u = m.hurt;
      const hurtOk = u && (h ? u[2].includes(h.n) && u[1].includes(h.hp + '→' + Math.max(0, h.hp - h.d)) && (e.hurt.some((x) => x.ko) ? /ko/.test(u[3]) : true) && (e.hurt.length > 1 ? u[1].includes('ほか' + (e.hurt.length - 1) + '人') : true) : /無傷|運しだい/.test(u[1]));
      const foeOk = m.foe && m.foe[1].includes(hp + '→' + Math.max(0, hp - e.dealt)); return !!(hurtOk && foeOk); };
    ok(chk(r.stay, r.es, r.hp), tag + ' 1 維持の札が盤と同じ計算 ' + JSON.stringify(r.stay) + ' / ' + JSON.stringify(r.es));
    ok(chk(r.rot, r.er, r.hp), tag + ' 1 回すの札が先読みと同じ計算 ' + JSON.stringify(r.rot) + ' / ' + JSON.stringify(r.er));
    ok(r.stay.map((x) => x[0]).join() === 'foe,hurt' && r.rot.map((x) => x[0]).join() === 'foe,hurt', tag + ' 1・5 2行（敵・仲間）');
    ok(r.stay.concat(r.rot).every((x) => x[4]), tag + ' 5 数字が切れない ' + JSON.stringify(r.stay.concat(r.rot).map((x) => x[1])));
    // 4. 目のボタンは出ない・長押しで先読み
    ok(!r.prev, tag + ' 4 目のボタンは出ない');
    const box = await p.evaluate(() => { const q = document.getElementById('btnRotate').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(600);
    const held = await p.evaluate(() => ({ pv: window.__rb.previewOn, ghost: document.querySelectorAll('#board .slot.ghost').length }));
    await p.mouse.move(box.x, box.y + 400); await p.mouse.up(); await p.waitForTimeout(300);   // 外へずらして離す＝取り消し
    ok(held.pv && held.ghost > 0, tag + ' 4 回すを長押しすると、回した後の並びが点線で出る ' + JSON.stringify(held));
    ok(await p.evaluate(() => window.__rb.phase === 'choose' && !window.__rb.previewOn), tag + ' 4 外へずらして離すと、何も決まらず元に戻る');
    // 5. 収まり
    const fit = await p.evaluate(() => { const d = document.getElementById('dock').getBoundingClientRect(), bd = document.getElementById('board').getBoundingClientRect(); return { dock: Math.round(d.bottom), vh: innerHeight, over: Math.round(bd.bottom - d.top) }; });
    ok(fit.dock <= fit.vh + 1 && fit.over <= 2, tag + ' 5 札は画面内で、盤に重ならない ' + JSON.stringify(fit));
    // 2. 気力不足
    await p.evaluate(() => window.__rb.setGauge(0)); await p.waitForTimeout(200);
    const low = await p.evaluate((rs) => { const rows = eval(rs); return { rot: rows('ocRot'), stay: rows('ocStay'), dis: document.getElementById('btnRotate').disabled }; }, '(' + rows.toString() + ')');
    ok(low.dis && low.rot.length === 1 && /回せ/.test(low.rot[0][1]) && low.stay.length >= 2, tag + ' 2 回せないときは理由。維持は見通しのまま ' + JSON.stringify(low.rot));
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
