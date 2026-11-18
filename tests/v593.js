// v5.9.3 地図の見た目の直し（2026-11-19 ユーザーの指摘）
// 合格の基準（測る前に決めたもの）：
//  1 地図の休息の地点はハートの印（炎の印は使わない）
//  2 「タップで道を選ぶ」は、札の下の出来事の行と重ならない（390×844・375×667・320×568）
//  3 小さい画面（375×667・320×568）でも「タップで道を選ぶ」が見える（以前は消えていた）
//  4 ページのエラーなし
process.env.RB_PHASE_HOLD = '1';
const { launch, testPage } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(500); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
    await p.evaluate(() => window.__rb.beginExp('std', 1)); await p.waitForTimeout(800);
    await p.evaluate(() => { const R = window.__rb; localStorage.removeItem('rb-exp'); R.run.node = 1; R.run.skip0 = 1; R.expShowMap(['ネムリの「雷撃」が強くなった（攻撃+7・最大HP+7）。']); });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return { t: x.top, b: x.bottom, h: x.height, op: +getComputedStyle(e).opacity, txt: e.textContent }; };
      const ic = [...document.querySelectorAll('#rvTrack .ic')].map((g) => g.innerHTML);
      return { tap: q('#rvTap'), ev: q('#rvEvents p') || q('#rvEvents'), goalFirst: document.getElementById('runv').classList.contains('goal-first'), heart: ic.filter((x) => x.includes('M12 20s-7.5')).length, oldFlame: ic.filter((x) => x.includes('M5 16h14l-2 4H7z')).length };
    });
    const tag = w + '×' + h;
    if (w === 390) ok(r.heart > 0 && r.oldFlame === 0, tag + ' 1 休息はハート（ハート ' + r.heart + '・古い炎 ' + r.oldFlame + '）');
    ok(r.goalFirst && r.tap && r.ev && r.tap.b <= r.ev.t, tag + ' 2 案内と出来事の行が重ならない（案内 ' + (r.tap && Math.round(r.tap.b)) + ' ≦ 行 ' + (r.ev && Math.round(r.ev.t)) + '）');
    ok(r.tap && r.tap.h > 0 && r.tap.op > 0.3 && /タップで道を選ぶ/.test(r.tap.txt), tag + ' 3 「タップで道を選ぶ」が見える（高さ ' + (r.tap && r.tap.h) + '）');
    ok(!errs.length, tag + ' 4 ページのエラーなし ' + errs.join(' / '));
    await p.screenshot({ path: path.join(__dirname, 'out', 'v593_' + w + 'x' + h + '.png') });
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
