// v5.3.4 陣立ての画面（第1弾）
// 合格の基準（測る前に決めたもの）：
//  1. ホーム画面アプリ（standalone）で、画面の高さが端末より「ステータスバーくらい」短いとき、アプリの高さを端末の高さにする（下の黒い帯をなくす）
//     ブラウザで開いたとき・差が大きいとき（iPadの分割など）・iPadの大きさでは触らない
//  2. 陣立ての印は金の丸にしない（地の色なし）
//  3. 陣立ての一言はいつも出る：「タップ→タップで入れ替え」と、攻撃が当たる仲間・受けるダメージ（倒れるなら警告）。
//     当たる相手が毎回変わる攻撃は「運しだい」。予告に数字があるのに「攻撃が来ない」とは言わない
//  4. 陣立ての「回す」は「並びを回す」（戦闘中の「回す」と名前を分ける）
//  5. 陣立ての画面で、下のボタンが画面からはみ出さない（393×759・375×667・320×568）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const tipsOff = () => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } };
async function toPrep(p) {
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1400);
}
(async () => {
  const b = await launch();
  // 1. 高さ
  for (const c of [
    { n: 'ブラウザ', vp: [393, 759], sc: [393, 852], sa: false, want: false },
    { n: 'ホーム画面アプリ（59px短い）', vp: [393, 793], sc: [393, 852], sa: true, want: true },
    { n: 'ホーム画面アプリ（差が大きい）', vp: [393, 600], sc: [393, 852], sa: true, want: false },
    { n: 'iPadの大きさ', vp: [1024, 1310], sc: [1024, 1366], sa: true, want: false }
  ]) {
    const ctx = await b.newContext({ viewport: { width: c.vp[0], height: c.vp[1] }, screen: { width: c.sc[0], height: c.sc[1] }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((sa) => { if (sa) Object.defineProperty(navigator, 'standalone', { get: () => true }); }, c.sa);
    await p.goto(testPage()); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ fix: document.documentElement.classList.contains('sa-fix'), h: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() }));
    ok(r.fix === c.want && (!c.want || r.h === c.sc[1] + 'px'), '1 ' + c.n + '：' + (c.want ? '端末の高さ ' + r.h : '触らない') + ' ' + JSON.stringify(r));
    ok(!errs.length, '  ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 2〜5. 陣立て
  for (const [w, h] of [[393, 759], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(tipsOff);
    await toPrep(p);
    const r = await p.evaluate(() => {
      const ico = document.querySelector('.prepban .pb-ico'), cs = ico && getComputedStyle(ico), sm = document.querySelector('.prepban small'), R = (e) => e.getBoundingClientRect();
      const tk = document.querySelector('#ticket .t-dmg b'), tnum = tk ? /\d/.test(tk.textContent) : false;
      return { bg: cs ? cs.backgroundImage + '|' + cs.backgroundColor : '', how: (document.querySelector('.prepban .pb-how') || {}).textContent, say: sm ? sm.textContent : '', tnum,
        prot: document.getElementById('btnPrepRot').textContent.trim(), dock: R(document.getElementById('dock')).bottom, start: R(document.getElementById('btnStart')).bottom, vh: innerHeight };
    });
    ok(/none\|rgba\(0, 0, 0, 0\)/.test(r.bg), w + '×' + h + ' 2 陣立ての印は金の丸ではない（' + r.bg + '）');
    ok(r.how === 'タップ→タップで入れ替え' && r.say.length > 0, w + '×' + h + ' 3 一言：' + r.how + '／' + r.say);
    ok(!(r.tnum && /攻撃が来ない/.test(r.say)), w + '×' + h + ' 3 予告に数字があるのに「攻撃が来ない」とは言わない');
    ok(r.prot === '並びを回す', w + '×' + h + ' 4 陣立ての回すは「' + r.prot + '」');
    ok(r.start <= r.vh + 1, w + '×' + h + ' 5 戦闘開始のボタンが画面内（' + Math.round(r.start) + ' / ' + r.vh + '）');
    // 3. 一言が盤の数字と合う：当たる仲間の名前と数字
    const m = await p.evaluate(() => { const R = window.__rb, inc = R.incoming(R.grid, true, false), ks = Object.keys(inc); return ks.map((k) => { const [rr, cc] = k.split(',').map(Number); return R.grid[rr][cc].name + ':' + inc[k].d; }); });
    ok(!m.length ? /運しだい|攻撃が来ない/.test(r.say) : m.some((x) => { const [n, d] = x.split(':'); return r.say.includes(n) && r.say.includes(d); }), w + '×' + h + ' 3 一言が盤の赤い数字と合う ' + JSON.stringify(m));
    // 当たる相手が毎回変わる攻撃
    await p.evaluate(() => { const R = window.__rb, a = R.actOf(R.enemy); a.rule = 'random'; a.hits = 2; R.render(); });
    const rnd = await p.evaluate(() => document.querySelector('.prepban small').textContent);
    ok(/運しだい/.test(rnd), w + '×' + h + ' 3 当たる相手が変わる攻撃は「運しだい」：' + rnd);
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
