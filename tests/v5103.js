// v5.10.3 隊を選ぶ画面などの丸い顔アイコンも MiMU の顔に（2026-11-28 ユーザー指摘）
// 合格の基準（測る前に決めたもの）：
//  1 「どの隊で下る？」の隊の顔は、どれも MiMU の顔（#mimuOL の輪郭つき）
//  2 入団希望者の顔も MiMU の顔
//  3 320×568・390×844 で顔が丸の中に収まり（はみ出し 1px 以内）、ページのエラーなし
const fs = require('fs');
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
(async () => {
  const t = testPage(), f = t.replace('file://', ''), f2 = f.replace('.html', '_v5103.html');
  fs.writeFileSync(f2, fs.readFileSync(f, 'utf8').replace('  function showDepart(note) {', '  window.__sd = (n) => showDepart(n); function showDepart(note) {'));
  const b = await launch();
  for (const [w, h] of [[320, 568], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((x) => { try { localStorage.setItem('rb-tips', x); } catch (e) { /* */ } }, TIPS);
    await p.goto('file://' + f2); await p.waitForTimeout(700); await p.click('#cover'); await p.waitForTimeout(400);
    const disc = () => p.evaluate(() => [...document.querySelectorAll('#rvCards .uc-disc')].map((d) => { const s = d.querySelector('svg'), a = d.getBoundingClientRect(), q = s ? s.getBoundingClientRect() : a;
      return { mimu: !!s && /mimuOL/.test(s.outerHTML), out: Math.max(a.left - q.left, q.right - a.right, a.top - q.top, q.bottom - a.bottom) }; }));
    await p.evaluate(() => window.__sd()); await p.waitForTimeout(700);
    const d1 = await disc();
    ok(d1.length >= 4 && d1.every((x) => x.mimu), w + '×' + h + ' 1 隊の顔が MiMU（' + d1.filter((x) => x.mimu).length + '／' + d1.length + '）');
    ok(d1.every((x) => x.out <= 1), w + '×' + h + ' 3 隊の顔が丸に収まる（最大 ' + Math.max(...d1.map((x) => x.out)).toFixed(1) + 'px）');
    await p.evaluate(() => { window.__rb.newRun ? window.__rb.newRun('std') : 0; window.__rb.runRecruit && window.__rb.runRecruit(); }).catch(() => {});
    await p.waitForTimeout(700);
    const d2 = await disc();
    ok(d2.length > 0 && d2.every((x) => x.mimu), w + '×' + h + ' 2 入団希望者の顔が MiMU（' + d2.filter((x) => x.mimu).length + '／' + d2.length + '）');
    ok(!errs.length, w + '×' + h + ' 3 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); fs.unlinkSync(f2);
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
