// v5.9.5 チュートリアルの直しと、敵の「i」の案内（2026-11-19 ユーザーの指摘）
// 合格の基準（測る前に決めたもの）：
//  1 チュートリアルの「選ぶ」場面で、下の「回す」「維持」が画面に収まる（iPhone の上下の余白 59px・34px を入れた 393×852・375×812、余白なしの 320×568）。ページは縦にスクロールしない
//  2 チュートリアルに「敵を調べる」手順：「i」（敵の名前）を押すと敵の詳細が開き、「技の一覧」の解説が詳細の上に見える。閉じると「仲間を動かす ①」へ進む。i 以外の場所を押しても進まない
//  3 深さ1の章の主（初めて）で「章の主の技を見よう」のヒントが出る。ふつうの戦闘と、深さ2の章の主では出ない
//  4 どれもページのエラーなし。チュートリアルを 320・375・390px で撮る（tests/out/v595_*.png）
const { launch, testPage } = require('./_env');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const OUT = path.join(__dirname, 'out');
// iPhone の上下の余白（env(safe-area-inset-*)）を数字に置き換えたページ
function safePage(top, bot) {
  const u = testPage(), f = u.replace('file://', ''); let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/env\(safe-area-inset-top(,\s*0px)?\)/g, top + 'px').replace(/env\(safe-area-inset-bottom(,\s*0px)?\)/g, bot + 'px');
  const g = f.replace('t.html', 'v595s' + top + '.html'); fs.writeFileSync(g, h); return 'file://' + g;
}
const ACT = { '仲間を動かす ①': '.slot[data-r="2"][data-c="1"]', '仲間を動かす ②': '.slot[data-r="0"][data-c="1"]', '戦闘開始': '#btnStart', 'まず「維持」': '#btnStay', '回す': '#btnRotate', '敵を調べる': '#ename', '技の一覧': '#cardClose' };
(async () => {
  const b = await launch();
  // 1・2・4 チュートリアル
  for (const [w, h, top, bot] of [[393, 852, 59, 34], [375, 812, 59, 34], [320, 568, 0, 0]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(top ? safePage(top, bot) : testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1300);
    const tag = w + '×' + h + (top ? '（余白 ' + top + '/' + bot + '）' : '');
    let worst = null, chooseN = 0, seen = [], info = null, wrong = null, shot = 0;
    for (let i = 0; i < 160; i++) {
      const st = await p.evaluate(() => ({ vis: !document.getElementById('coach').hidden, t: document.getElementById('coTitle').textContent, nx: !document.getElementById('coNext').hidden, ph: window.__rb.phase }));
      if (st.ph === 'choose') {
        const m = await p.evaluate(() => { const r = document.getElementById('dock').getBoundingClientRect(), s = document.getElementById('btnStay').getBoundingClientRect(); return { dockB: r.bottom, stayB: s.bottom, vh: innerHeight, sh: document.documentElement.scrollHeight }; });
        chooseN++; if (!worst || m.stayB - m.vh > worst.stayB - worst.vh) worst = m;
      }
      if (st.vis && seen[seen.length - 1] !== st.t) seen.push(st.t);
      if (st.vis && st.t === '敵を調べる' && !wrong) {   // i 以外（盤）を押しても進まない
        await p.click('.slot[data-r="0"][data-c="0"]').catch(() => {}); await p.waitForTimeout(300);
        wrong = await p.evaluate(() => ({ t: document.getElementById('coTitle').textContent, sheet: !document.getElementById('foeSheet').hidden }));
      }
      if (st.vis && st.t === '技の一覧' && !info) {
        info = await p.evaluate(() => { const c = document.getElementById('coach'), sh = document.getElementById('foeSheet'); const r = c.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return { sheet: !sh.hidden, coachTop: !!(top && c.contains(top)), cz: +getComputedStyle(c).zIndex, sz: +getComputedStyle(sh).zIndex }; });
        await p.screenshot({ path: path.join(OUT, 'v595_' + w + 'x' + h + '_info.png') });
      }
      if (st.ph === 'choose' && shot === 0 && st.vis) { await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, 'v595_' + w + 'x' + h + '_choose.png') }); shot = 1; }
      if (st.vis) { if (ACT[st.t]) await p.click(ACT[st.t]).catch(() => {}); else if (st.nx) await p.click('#coNext').catch(() => {}); else if (st.t === '基本はここまで') break; }
      else if (st.ph === 'choose' && seen.includes('基本はここまで')) break;
      await p.waitForTimeout(320);
    }
    ok(chooseN > 0 && worst.stayB <= worst.vh + 0.5 && worst.sh <= worst.vh + 1, tag + ' 1 「維持」が画面に収まる（下端 ' + Math.round(worst.stayB) + ' ≦ ' + worst.vh + '・ページの高さ ' + worst.sh + '）');
    const i1 = seen.indexOf('敵を調べる');
    ok(i1 >= 0 && seen[i1 + 1] === '技の一覧' && seen[i1 + 2] === '仲間を動かす ①', tag + ' 2 敵を調べる→技の一覧→仲間を動かす ① ' + JSON.stringify(seen.slice(Math.max(0, i1 - 1), i1 + 3)));
    ok(wrong && wrong.t === '敵を調べる' && !wrong.sheet, tag + ' 2 i 以外を押しても進まない ' + JSON.stringify(wrong));
    ok(info && info.sheet && info.coachTop && info.cz > info.sz, tag + ' 2 「技の一覧」の解説が敵の詳細の上に見える ' + JSON.stringify(info));
    ok(!errs.length, tag + ' 4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 3 深さ1の章の主のヒント
  const TIPS = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1 };
  for (const [depth, chief, want] of [[1, true, true], [1, false, false], [2, true, false]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); localStorage.setItem('rb-exp', JSON.stringify({ runs: 3, clears: 3, best: 13 })); } catch (e) { /* */ } }, JSON.stringify(TIPS));
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
    const r = await p.evaluate(([d, c]) => { const R = window.__rb; document.getElementById('runv').hidden = true; R.beginExp('std', d); const step = c ? R.EXP.chiefs[0] : 2; R.run.node = step - 1; R.run.enemy = R.expEnemy(step, null, c ? 'chief' : null); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.render(); return { step, name: R.enemy && R.enemy.name }; }, [depth, chief]);
    await p.waitForTimeout(900);
    const t = await p.evaluate(() => (document.getElementById('tip').hidden ? '' : document.getElementById('tipT').textContent));
    ok((t === '章の主の技を見よう') === want, '3 深さ' + depth + (chief ? 'の章の主' : 'のふつうの戦闘') + '（' + r.name + '）：ヒント「' + t + '」' + (want ? 'が出る' : 'は出ない'));
    ok(!errs.length, '3 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
