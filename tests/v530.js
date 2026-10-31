// v5.3.0 「わかりにくい」への対応（テストプレイの声：視線が上下する／2列目まで来るように見える／チュートリアルの情報が多い）
// 合格の基準（測る前に決めたもの）：
//  1. 「回す」「維持」のボタンの右肩に、それを選んだときこのターン受けるダメージが出る。
//     維持＝いまの盤の赤い数字の合計、回す＝先読み（点線）の盤の赤い数字の合計と一致する。倒れる仲間がいれば「倒」が付く
//  2. 回せないとき（気力不足）は、回すの数字を出さない。戦闘開始前（陣立て）は、どちらも出さない
//  3. 列の札（一・二）は赤く光らない。赤は当たる仲間（赤い枠）だけ
//  4. 数字の札は画面からはみ出さず、上の行動順の帯に重ならない（393×759・375×667・320×568・844×390）
//  5. チュートリアルは16手順（27から減らす）。STEP表示も 1/16
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const sumInc = () => [...document.querySelectorAll('#board .inc')].reduce((a, e) => { const m = e.textContent.match(/-(\d+)/); return a + (m ? +m[1] : 0); }, 0);
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 759], [375, 667], [320, 568], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(600);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200);
    if (await p.evaluate(() => !!document.getElementById('rvGo') && !document.getElementById('runv').hidden)) await p.click('#rvGo');
    await p.waitForTimeout(1300);
    const prep = await p.evaluate(() => [...document.querySelectorAll('.dk-out')].filter((e) => !e.hidden && e.offsetParent).length);
    ok(prep === 0, w + '×' + h + ' 2 陣立てでは数字を出さない');
    await p.click('#btnStart');
    for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(150); }
    await p.waitForTimeout(400);
    // 攻撃が来るターンを探す（敵の行動の並びのうち、受けるダメージがあるもの）
    let found = false;
    for (let t = 1; t <= 8 && !found; t++) {
      await p.evaluate((t) => { window.__rb.setGauge(3); window.__rb.setTurn(t); }, t);
      found = await p.evaluate(() => Object.keys(window.__rb.incoming(window.__rb.grid, false, false)).length > 0);
    }
    ok(found, w + '×' + h + ' 攻撃のあるターンを用意できた');
    const st = await p.evaluate((src) => { const sumInc = eval(src); const s = document.querySelector('#btnStay .dk-out'), r = document.querySelector('#btnRotate .dk-out');
      return { s: s && !s.hidden ? s.textContent : null, r: r && !r.hidden ? r.textContent : null, sd: document.getElementById('btnStay').dataset.out, board: sumInc(), ko: document.querySelectorAll('#board .inc.ko').length, sko: !!(s && s.querySelector('s')), hit: document.querySelectorAll('.ctag.hit').length, beam: document.querySelectorAll('.beam.on').length, al: document.getElementById('btnStay').getAttribute('aria-label') }; }, '(' + sumInc.toString() + ')');
    ok(st.s != null && +st.sd === st.board && (st.ko > 0) === st.sko, w + '×' + h + ' 1 維持の数字＝盤の赤い数字の合計（' + st.s + ' / 盤' + st.board + '・倒' + st.ko + '）');
    ok(/維持（/.test(st.al || ''), '  読み上げにも結果が入る：' + st.al);
    ok(st.hit === 0 && st.beam > 0, w + '×' + h + ' 3 列の札は赤くならず、当たる仲間だけ赤い枠（札' + st.hit + '・枠' + st.beam + '）');
    await p.click('#btnPreview'); await p.waitForTimeout(300);
    const pv = await p.evaluate((src) => { const sumInc = eval(src); return { board: sumInc(), rd: document.getElementById('btnRotate').dataset.out, r: document.querySelector('#btnRotate .dk-out').textContent, hit: document.querySelectorAll('.ctag.hit').length }; }, '(' + sumInc.toString() + ')');
    ok(+pv.rd === pv.board && pv.hit === 0, w + '×' + h + ' 1 回すの数字＝先読みの盤の赤い数字の合計（' + pv.r + ' / 盤' + pv.board + '）');
    await p.click('#btnPreview'); await p.waitForTimeout(200);
    // 4. はみ出し・重なり
    const geo = await p.evaluate(() => { const R = (e) => e.getBoundingClientRect(), bk = R(document.getElementById('book'));
      return [...document.querySelectorAll('.dk-out')].filter((e) => !e.hidden).map((e) => { const r = R(e); return { in: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, ov: Math.max(0, Math.min(r.bottom, bk.bottom) - Math.max(r.top, bk.top)) * Math.max(0, Math.min(r.right, bk.right) - Math.max(r.left, bk.left)) }; }); });
    ok(geo.length === 2 && geo.every((g) => g.in && g.ov <= 4), w + '×' + h + ' 4 数字の札は画面内で、行動順の帯に重ならない ' + JSON.stringify(geo));
    // 2. 気力不足
    await p.evaluate(() => window.__rb.setGauge(0));
    const low = await p.evaluate(() => { const r = document.querySelector('#btnRotate .dk-out'); return { dis: document.getElementById('btnRotate').disabled, shown: !!(r && !r.hidden), stay: !document.querySelector('#btnStay .dk-out').hidden }; });
    ok(low.dis && !low.shown && low.stay, w + '×' + h + ' 2 回せないときは回すの数字を出さない（維持は出す）');
    if (w === 320) await p.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/v530_320.png' : '/dev/null' }).catch(() => {});
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 5. チュートリアルの手順数
  {
    const ctx = await b.newContext({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#beginTut'); await p.waitForTimeout(1500);
    const lbl = await p.evaluate(() => document.getElementById('coStep').textContent);
    ok(/1 \/ 16/.test(lbl), '5 チュートリアルは16手順：' + lbl);
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
