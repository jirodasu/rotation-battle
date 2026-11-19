// v5.9.10 Xの通しプレイの指摘（2026-11-19 しま便フェリーさん）：押せるかどうか・地図で何をするか・前後の並びで何が起きているかが分からない
// 合格の基準（測る前に決めたもの）：
//  1 地図で道を選ぶ前、下のボタンは「札か地図をタップして道を選ぶ」と書いてあり、文字がはみ出さない。押せない間は「›」が出ない
//  2 押せる札には右端に「›」が出て、札の文字と重ならない。道を選ぶと「進む」にも「›」が出る（390・375・320）
//  3 戦闘で補助の「攻」が攻撃列の仲間に乗るとき、2人をつなぐ光（輪2つと線1本）が出て、1.2秒以内に消える
//  4 チュートリアル「回す」の点線の矢印は3本とも画面の中に収まる（390・375・320）
//  5 ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1, einfo: 1 };
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', JSON.stringify(t)); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(700);
    for (let k = 0; k < 5 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, 120); await p.waitForTimeout(300); }
    await p.waitForTimeout(400);
    const chev = (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((el) => { const cs = getComputedStyle(el, '::after'); const on = cs.content !== 'none' && cs.content !== 'normal' && cs.display !== 'none' && parseFloat(cs.borderTopWidth) > 0;
      const r = el.getBoundingClientRect(), right = parseFloat(cs.right) || 0, cl = r.right - right - parseFloat(cs.width) * 1.42;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let tr = -1e9; for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim()) continue; let e = n.parentElement, vis = true; for (; e && e !== el.parentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { vis = false; break; } } if (!vis) continue; const rg = document.createRange(); rg.selectNodeContents(n); [...rg.getClientRects()].forEach((q) => { if (q.width > 0) tr = Math.max(tr, q.right); }); } const t = { right: tr };   /* 見えている文字だけ（隠れた説明文は数えない） */
      return { on, gap: Math.round(cl - Math.min(t.right, r.right)), over: el.scrollWidth > el.clientWidth + 1 }; }), sel);
    const go0 = await p.evaluate(() => { const g = document.getElementById('rvGo'); return { t: g.textContent, dis: g.disabled, over: g.scrollWidth > g.clientWidth + 1 }; });
    const g0 = await chev('#rvGo');
    ok(go0.dis && go0.t === '札か地図をタップして道を選ぶ' && !go0.over && !g0[0].on, tag + ' 1 選ぶ前のボタン「' + go0.t + '」はみ出し ' + go0.over + '・› ' + g0[0].on);
    const cards = await chev('#rvCards > .rv-card:not([disabled])');
    ok(cards.length >= 2 && cards.every((x) => x.on && x.gap >= 0), tag + ' 2 押せる札に「›」・文字と重ならない ' + JSON.stringify(cards));
    await p.click('#rvCards > .rv-card[data-i="0"]'); await p.waitForTimeout(200);
    const g1 = await chev('#rvGo');
    ok(g1[0].on, tag + ' 2 道を選ぶと「進む」に「›」');
    await ctx.close();
    if (errs.length) ok(false, tag + ' 5 ページのエラー ' + errs.join(' / '));
  }
  // 3 攻が乗るときの光
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', JSON.stringify(t)); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(700);
    for (let k = 0; k < 5 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(195, 120); await p.waitForTimeout(300); }
    const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo'); await p.waitForTimeout(800);
    const sup = await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 9999; const m = R.grid[1].filter(Boolean); return m.map((u) => u.name + ':' + u.atkSup); });
    await p.evaluate(() => { window.__lk = []; new MutationObserver((ms) => ms.forEach((m) => { m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('sup-link')) window.__lk.push({ t0: performance.now(), n, rings: n.querySelectorAll('.sl-ring').length, bars: n.querySelectorAll('.sl-bar').length, kind: n.className }); });
      m.removedNodes.forEach((n) => { const e = window.__lk.find((x) => x.n === n); if (e) e.t1 = performance.now(); }); })).observe(document.getElementById('fx'), { childList: true }); });
    await p.click('#btnStart');
    for (let i = 0; i < 200; i++) { const n = await p.evaluate(() => window.__lk.filter((x) => x.t1).length); if (n) break; if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk').catch(() => {}); await p.waitForTimeout(50); }
    const lk = await p.evaluate(() => window.__lk.map((x) => ({ kind: x.kind, rings: x.rings, bars: x.bars, ms: x.t1 ? Math.round(x.t1 - x.t0) : null })));
    const a = lk.find((x) => /atk/.test(x.kind));
    ok(!!a && a.rings === 2 && a.bars === 1 && a.ms !== null && a.ms <= 1200, '3 「攻」が乗るとき2人をつなぐ光 ' + JSON.stringify(lk) + ' 補助列 ' + sup.join('・'));
    ok(!errs.length, '3 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 4 点線の矢印が画面の中
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1300);
    const ACT = { '仲間を動かす ①': '.slot[data-r="2"][data-c="1"]', '仲間を動かす ②': '.slot[data-r="0"][data-c="1"]', '戦闘開始': '#btnStart', 'まず「維持」': '#btnStay', '敵を調べる': '#ename', '技の一覧': '#cardClose' };
    let box = null;
    for (let i = 0; i < 600 && !box; i++) {
      const st = await p.evaluate(() => ({ vis: !document.getElementById('coach').hidden, t: document.getElementById('coTitle').textContent, nx: !document.getElementById('coNext').hidden }));
      if (st.vis && st.t === '回す') { await p.waitForTimeout(400); box = await p.evaluate(() => { const v = document.getElementById('tutArrows'); const ps = [...v.querySelectorAll('path[marker-end]')]; return { n: ps.length, b: ps.map((q) => { const r = q.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }), W: innerWidth }; }); break; }
      if (st.vis) { if (ACT[st.t]) await p.click(ACT[st.t]).catch(() => {}); else if (st.nx) await p.click('#coNext').catch(() => {}); }
      await p.waitForTimeout(100);
    }
    ok(!!box && box.n === 3 && box.b.every(([l, r]) => l >= 0 && r <= box.W), w + '×' + h + ' 4 点線の矢印3本が画面の中 ' + JSON.stringify(box));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
