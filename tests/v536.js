// v5.3.6 戦闘画面をすっきり
// 合格の基準（測る前に決めたもの）：
//  1. 上の「地点・ターン」の札と、敵の名前の上の章は、戦闘画面に出ない。i は敵の名前の横に出る
//  2. i（敵）を押した詳細に、章・地点・ターン（★のターン数）が出る
//  3. 敵の行動の印（牙など）は予告の札に出ない（大技までのカウントダウンは残す）。行動順の敵は小さな絵。縛りの「縛」の印も出ない
//  4. 記録の枠（行動順）は、はじめの3戦だけ。4戦目からは枠が消え、盤が広くなる。履歴は上の帯のボタンから開ける
//  5. 枠が無いとき：攻撃列が空・倒れるときの警告は「戦闘開始」の上の吹き出し。仲間を選ぶと「入れ替え先をタップ」の吹き出し
//  6. 画面からはみ出さない（393×759・320×568）、ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const tipsOff = (n) => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); localStorage.setItem('rb-order-n', String(n)); } catch (e) { /* */ } };
async function toPrep(p) {
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1400);
}
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.hidden; }, sel);
(async () => {
  const b = await launch();
  const boardH = {};
  for (const [w, h] of [[393, 759], [320, 568]]) for (const n of [0, 3]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(tipsOff, n);
    await toPrep(p);
    const tag = w + '×' + h + (n ? ' 4戦目以降' : ' はじめ');
    // 1
    const top = await p.evaluate(() => ({ chip: getComputedStyle(document.getElementById('chipTurn')).display, chap: getComputedStyle(document.querySelector('.plate small')).display, i: getComputedStyle(document.getElementById('ename'), '::after').content }));
    ok(top.chip === 'none' && top.chap === 'none' && /i/.test(top.i), tag + ' 1 地点・ターンと章は出ない。i は名前の横 ' + JSON.stringify(top));
    // 4 枠
    const bk = await vis(p, '#book');
    ok(n ? !bk : bk, tag + ' 4 記録の枠は' + (n ? '出ない' : '出る（行動順）'));
    boardH[tag] = await p.evaluate(() => Math.round(document.getElementById('board').getBoundingClientRect().height));
    // 5 吹き出し（枠が無いとき）
    if (n) {
      await p.click('.slot[data-r="0"][data-c="0"]'); await p.waitForTimeout(300);
      const sel = await p.evaluate(() => { const d = document.querySelector('#peek .pk-hint'); return d ? d.textContent : ''; });
      ok(/入れ替え先をタップ/.test(sel), tag + ' 5 仲間を選ぶと「入れ替え先をタップ」（v5.3.7 から仲間の詳細の中）：' + sel);
      { const r = await p.evaluate(() => { const q = document.querySelector('.slot[data-r="0"][data-c="0"]').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.bottom - 8 }; }); await p.mouse.click(r.x, r.y); await p.waitForTimeout(300); }   // 選び直して外す（上は仲間の詳細が重なるので、マスの下の方を押す）
      // 攻撃列を空にする（あとで元に戻す）
      await p.evaluate(() => { const R = window.__rb, g = R.grid; window.__keep = g.map((row) => row.slice()); for (let c = 0; c < g[0].length; c++) if (g[0][c]) { const u = g[0][c]; g[0][c] = null; outer: for (let r = 1; r < 3; r++) for (let k = 0; k < g[r].length; k++) if (!g[r][k]) { g[r][k] = u; break outer; } } R.render(); });
      await p.waitForTimeout(300);
      const warn = await p.evaluate(() => { const d = document.getElementById('prepWarn'); return d && !d.hidden ? d.textContent : ''; });
      ok(/攻撃列が空/.test(warn), tag + ' 5 攻撃列が空のときは警告の吹き出し：' + warn);
      await p.evaluate(() => { const R = window.__rb, g = R.grid; window.__keep.forEach((row, r) => row.forEach((u, c) => { g[r][c] = u; })); R.render(); });
      await p.waitForTimeout(300);
      ok(await p.evaluate(() => { const d = document.getElementById('prepWarn'); return !d || d.hidden; }), tag + ' 5 元に戻すと警告は消える');
    }
    // 6 はみ出し
    ok(await p.evaluate(() => document.getElementById('btnStart').getBoundingClientRect().bottom <= innerHeight + 1), tag + ' 6 戦闘開始が画面内');
    // 戦闘へ
    await p.click('#btnStart');
    for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(150); }
    await p.waitForTimeout(400);
    // 3 予告の札・行動順
    const t = await p.evaluate(() => ({ ico: [...document.querySelectorAll('#ticket .t-ico')].filter((e) => !e.classList.contains('t-cd')).length, cd: !!document.querySelector('#ticket .t-cd'), noico: document.getElementById('ticket').classList.contains('noico'), od: [...document.querySelectorAll('.od.foe')].map((e) => ({ art: !!e.querySelector('.od-art svg'), txt: e.textContent.trim() })) }));
    ok(t.ico === 0 && (t.cd || t.noico), tag + ' 3 予告の札に行動の印がない ' + JSON.stringify({ ico: t.ico, cd: t.cd }));
    if (!n) ok(t.od.length > 0 && t.od.every((x) => x.art && !x.txt), tag + ' 3 行動順の敵は小さな絵 ' + JSON.stringify(t.od));
    ok(n ? !(await vis(p, '#book')) : await vis(p, '#book'), tag + ' 4 戦闘中も枠は' + (n ? '出ない' : '出る'));
    // 縛り
    await p.evaluate(() => { const R = window.__rb; R.enemy.bound = true; R.render(); });
    const bd = await p.evaluate(() => ({ before: getComputedStyle(document.getElementById('btnRotate'), '::before').display, block: document.getElementById('btnRotate').dataset.block }));
    ok(bd.block === 'bind' && bd.before === 'none', tag + ' 3 縛られても「縛」の印は出ない ' + JSON.stringify(bd));
    await p.evaluate(() => { const R = window.__rb; R.enemy.bound = false; R.render(); });
    // 4 履歴
    await p.click('#logBtn'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.getElementById('logSheet').hidden && document.getElementById('logList').children.length > 0), tag + ' 4 上の「履歴」で履歴が開く');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // 2 i の詳細
    await p.click('#ename'); await p.waitForTimeout(400);
    const sh = await p.evaluate(() => document.getElementById('foeSheet').hidden ? '' : document.getElementById('foeSheet').textContent);
    ok(/第\d章/.test(sh) && /地点 \d+ \/ \d+/.test(sh) && /ターン \d+（★は\d+ターン以内）/.test(sh), tag + ' 2 i の詳細に章・地点・ターン');
    ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  ok(boardH['393×759 4戦目以降'] > boardH['393×759 はじめ'] && boardH['320×568 4戦目以降'] >= boardH['320×568 はじめ'], '4 枠が消えると盤が広くなる ' + JSON.stringify(boardH));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
