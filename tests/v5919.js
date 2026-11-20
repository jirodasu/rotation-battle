// v5.9.19：判断に使う文字を12px以上に・敵のHPに最大値を添える
//   1 戦闘：「大技まで」が12px以上で、金の丸の中に収まる。丸が予告の文字（ちからをためる など）に重ならない
//   2 準備：「タップ→タップで入れ替え」「気力いらず」「あと3発」が12px以上
//   3 敵のHP：「53」の横に「/ 81」（最大HP）が出て、行動順の札・画面の外にはみ出さない。数字は HP が減っても最大値のまま
//   4 ページのエラーなし
// 画面の大きさ：スマホ縦（390×844・320×568）・スマホ横（844×390）・PC（1280×800）
const path = require('path');
const { launch, testPage, OUT } = require('./_env');
const SIZES = [['phone', 390, 844, true], ['small', 320, 568, true], ['land', 844, 390, true], ['pc', 1280, 800, false]];
let ng = 0;
const ok = (c, msg, extra) => { if (!c) ng++; console.log((c ? '  OK  ' : '  NG  ') + msg + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); };
(async () => {
  const b = await launch();
  const url = testPage();
  for (const [name, w, h, mob] of SIZES) {
    console.log('== ' + name + ' ' + w + '×' + h);
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const closeTip = async () => { if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk').catch(() => {}); };
    await p.goto(url); await p.waitForTimeout(600);
    await p.click('#cover'); await p.waitForTimeout(700);
    await p.click('#begin'); await p.waitForTimeout(900);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(2600); await closeTip();
    // ---- 準備 ----
    const prep = await p.evaluate(() => {
      const fs = (sel) => { const e = document.querySelector(sel); if (!e || !e.getClientRects().length) return null; return parseFloat(getComputedStyle(e).fontSize); };
      return { how: fs('.prepban .pb-how'), free: fs('#btnPrepRot .pr-l small'), incN: [...document.querySelectorAll('.inc-n')].filter((e) => e.getClientRects().length).map((e) => parseFloat(getComputedStyle(e).fontSize)) };
    });
    ok(prep.how === null || prep.how >= 12, name + ' 準備：「タップ→タップで入れ替え」が12px以上', prep.how);
    ok(prep.free !== null && prep.free >= 12, name + ' 準備：「気力いらず」が12px以上', prep.free);
    ok(prep.incN.every((x) => x >= 12), name + ' 準備：「あとN発」が12px以上', prep.incN);
    await p.screenshot({ path: path.join(OUT, 'v5919-' + name + '-prep.png') });
    // ---- 戦闘（大技までの丸が出るまで進める） ----
    await p.click('#btnStart'); await p.waitForTimeout(400);
    let cd = false;
    for (let k = 0; k < 60 && !cd; k++) {
      await closeTip();
      const st = await p.evaluate(() => ({ ready: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', cd: !!document.querySelector('#ticket .t-cd'), over: !document.getElementById('result').hidden }));
      if (st.over) break;
      if (st.ready && st.cd) { cd = true; break; }
      if (st.ready) await p.click(await p.evaluate(() => document.getElementById('btnRotate').disabled) ? '#btnStay' : '#btnRotate', { timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(300);
    }
    ok(cd, name + ' 戦闘：大技までの丸が出る場面まで進めた');
    await closeTip(); await p.waitForTimeout(500);
    const bt = await p.evaluate(() => {
      const r = (e) => { const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
      const ico = document.querySelector('#ticket .t-cd'), sm = ico && ico.querySelector('small'), main = document.querySelector('#ticket .t-main');
      const n = document.getElementById('ehpn'), m = document.getElementById('ehpm'), ord = document.getElementById('eOrd');
      const ordOn = ord && !ord.hidden && ord.getClientRects().length;
      const R = window.__rb;
      return {
        aimLines: (() => { const e = document.querySelector('#ticket .t-aim'); if (!e) return 1; return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)); })(),
        smFs: sm ? parseFloat(getComputedStyle(sm).fontSize) : null, ico: ico ? r(ico) : null, sm: sm ? r(sm) : null, main: main ? r(main) : null,
        hp: n.textContent, max: m.textContent, maxFs: parseFloat(getComputedStyle(m).fontSize), mR: r(m), nR: r(n), ord: ordOn ? r(ord) : null,
        enemyMax: R.enemy.max, enemyHp: R.enemy.hp, party: !!R.enemy.party, vw: innerWidth,
      };
    });
    if (bt.ico) {
      ok(bt.smFs >= 12, name + ' 戦闘：「大技まで」が12px以上', bt.smFs);
      // 丸の中に収まる：文字の幅が丸の幅より小さく、左右とも丸の内側（ふちの影の分 1px まで）
      ok(bt.sm.l >= bt.ico.l - 1 && bt.sm.r <= bt.ico.r + 1 && bt.sm.b <= bt.ico.b + 1, name + ' 戦闘：「大技まで」が金の丸からはみ出さない', { sm: bt.sm, ico: bt.ico });
      ok(bt.ico.r <= bt.main.l + 1, name + ' 戦闘：金の丸が予告の文字に重ならない', { icoR: Math.round(bt.ico.r), mainL: Math.round(bt.main.l) });
      ok(bt.aimLines === 1, name + ' 戦闘：狙いの1行（狙い HPがいちばん低い仲間）が2行に割れない', bt.aimLines);
    }
    ok(!bt.party ? bt.max === '/ ' + bt.enemyMax : bt.max === '', name + ' 敵のHP：最大値を添える', { hp: bt.hp, max: bt.max, enemyMax: bt.enemyMax });
    ok(bt.maxFs >= 12, name + ' 敵のHP：最大値の文字が12px以上', bt.maxFs);
    ok(bt.mR.l >= bt.nR.r - 1, name + ' 敵のHP：「/ 最大値」が今のHPの右に並ぶ（重ならない）', { n: Math.round(bt.nR.r), m: Math.round(bt.mR.l) });
    ok(!bt.ord || bt.mR.r <= bt.ord.l + 1, name + ' 敵のHP：行動順の札に重ならない', { m: Math.round(bt.mR.r), ord: bt.ord && Math.round(bt.ord.l) });
    ok(bt.mR.r <= bt.vw, name + ' 敵のHP：画面の外にはみ出さない', { r: Math.round(bt.mR.r), vw: bt.vw });
    ok(+bt.hp < bt.enemyMax, name + ' 敵のHP：減ったあとも最大値は変わらない（今のHP < 最大値）', { hp: bt.hp, max: bt.enemyMax });
    await p.screenshot({ path: path.join(OUT, 'v5919-' + name + '-battle.png') });
    // 3桁のHP（章の主など）でも、行動順の札・画面の外にはみ出さない（文字だけ入れ替えて測る）
    const big = await p.evaluate(() => {
      const n = document.getElementById('ehpn'), m = document.getElementById('ehpm'), ord = document.getElementById('eOrd');
      const keep = [n.textContent, m.textContent]; n.textContent = '999'; m.textContent = '/ 999';
      const mr = m.getBoundingClientRect(), nr = n.getBoundingClientRect(), on = ord && !ord.hidden && ord.getClientRects().length, or = on ? ord.getBoundingClientRect() : null;
      const res = { m: Math.round(mr.right), n: Math.round(nr.right), ml: Math.round(mr.left), ord: or && Math.round(or.left), vw: innerWidth };
      n.textContent = keep[0]; m.textContent = keep[1]; return res;
    });
    ok((big.ord == null || big.m <= big.ord + 1) && big.m <= big.vw && big.ml >= big.n - 1, name + ' 敵のHP：3桁（999 / 999）でも重ならない・はみ出さない', big);
    ok(errs.length === 0, name + ' ページのエラーなし', errs.slice(0, 3));
    await ctx.close();
  }
  await b.close();
  console.log(ng ? '不合格 ' + ng + ' 件' : '全て合格');
  process.exit(ng ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
