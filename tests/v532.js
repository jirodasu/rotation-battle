// v5.3.2 見やすさ
// 合格の基準（測る前に決めたもの）：
//  1. 遠征の地図の文字（地点の見出し・亜種・地点N）は、320×568でも画面上で8px以上の高さ
//  2. 遠征の地図に★を使わない（★は戦いの成績だけ）。亜種は「亜種」と書く
//  3. 章の名前の札は1行（「祈りの／間」で割れない）
//  4. 進める地点は、押せる範囲（領地）が44×44px以上
//  5. 戦闘の小さい文字：HPの見出し・「盾/×2」・「大技まで」が 9px 以上
//  6. チュートリアル「4人の仲間」：解説の枠が仲間の顔を隠すのは、どの画面でも1人あたり3割まで
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 759], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(800);
    const m = await p.evaluate(() => {
      const R = (e) => e.getBoundingClientRect(), tx = [...document.querySelectorAll('#rvTrack svg text')].filter((t) => t.textContent.trim());
      const small = tx.filter((t) => !t.classList.contains('g') && R(t).height < 8).map((t) => t.textContent + ':' + R(t).height.toFixed(1));
      const star = tx.some((t) => /★/.test(t.textContent)) || [...document.querySelectorAll('#rvTrack [aria-label]')].some((e) => /★/.test(e.getAttribute('aria-label')));
      const chips = [...document.querySelectorAll('.rt-ch span')].map((e) => R(e).height);
      const picks = [...document.querySelectorAll('#rvTrack g[data-pick]:not(.mk)')].map((g) => { const r = R(g); return [Math.round(r.width), Math.round(r.height)]; });
      return { small, star, chips, picks, n: tx.length };
    });
    ok(m.n > 0 && !m.small.length, w + '×' + h + ' 1 地図の文字が8px以上 ' + JSON.stringify(m.small));
    ok(!m.star, w + '×' + h + ' 2 遠征の地図に★がない');
    ok(m.chips.length === 3 && m.chips.every((x) => x < 24), w + '×' + h + ' 3 章の札は1行 ' + JSON.stringify(m.chips));
    ok(m.picks.length >= 1 && m.picks.every(([a, c]) => a >= 44 && c >= 44), w + '×' + h + ' 4 進める地点の押せる範囲 ' + JSON.stringify(m.picks));
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200);
    if (await p.evaluate(() => !!document.getElementById('rvGo') && !document.getElementById('runv').hidden)) await p.click('#rvGo');
    await p.waitForTimeout(1300);
    const fs = await p.evaluate(() => {
      const px = (sel, pseudo) => { const e = document.querySelector(sel); return e ? parseFloat(getComputedStyle(e, pseudo || null).fontSize) : null; };
      const probe = document.createElement('div'); probe.innerHTML = '<i class="inc"><em class="inc-w">盾</em></i><span class="t-ico t-cd"><small>大技まで</small></span>'; document.body.appendChild(probe);
      const r = { hp: px('.tok .nm u', '::before'), w: px('.inc-w'), cd: px('.t-ico.t-cd small') }; probe.remove(); return r;
    });
    ok(fs.hp >= 9 && fs.w >= 9 && fs.cd >= 9, w + '×' + h + ' 5 戦闘の小さい文字 ' + JSON.stringify(fs));
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  for (const [w, h] of [[393, 759], [375, 667], [320, 568], [430, 932]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#beginTut'); await p.waitForTimeout(1500);
    await p.click('#coNext'); await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const R = (e) => e.getBoundingClientRect(), c = R(document.getElementById('coach'));
      return { t: document.getElementById('coTitle').textContent, cov: [...document.querySelectorAll('#board .tok .disc')].map((d) => { const q = R(d); return Math.max(0, Math.min(c.bottom, q.bottom) - Math.max(c.top, q.top)) / q.height; }) }; });
    ok(r.t === '4人の仲間' && r.cov.length === 4 && r.cov.every((x) => x <= 0.3), w + '×' + h + ' 6 「4人の仲間」で顔を隠すのは3割まで ' + r.cov.map((x) => Math.round(x * 100) + '%').join(','));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
