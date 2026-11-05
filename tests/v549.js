// v5.4.9 手応え（引き継ぎメモ「MDA・Game Feel」の優先度の高い2案）
// 合格の基準（測る前に決めたもの）：
//  1. 「あと2発」（このターンを受けると、次の1発で倒れる）だけ速く脈打つ（n1）。あと3発・倒れるときは脈打たない
//  2. 回転コンボの音：1段目・2段目は回したときに段の番号で鳴る（音程が半音ずつ上がる）。3段目（発動）は突入技の瞬間に1回だけ鳴る
//  3. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const toChoose = async (p) => { for (let k = 0; k < 400; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' || !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break; await p.waitForTimeout(40); } await p.waitForTimeout(200); };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); } catch (e) { /* */ } });
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 999; R.run.node = 3; window.__snd = []; const S = R.SFX, o = S.combo; S.combo = (st, f) => { window.__snd.push(st + (f ? 'F' : '')); return o(st, f); }; });
  await p.click('#btnStart'); await toChoose(p);
  // 1
  const r1 = await p.evaluate(async () => { const R = window.__rb, g = R.grid, out = [];
    for (let t = 1; t <= 14; t++) { R.setTurn(t); const inc = R.incoming(g, false, false), ks = Object.keys(inc); if (!ks.length) continue;
      const [r, c] = ks[0].split(',').map(Number), u = g[r][c], d = inc[ks[0]].d, keep = [u.hp, u.max]; u.max = Math.max(u.max, d * 4);
      for (const hp of [d * 2, d + 1, d * 3, d]) { u.hp = hp; R.render(); await new Promise((q) => requestAnimationFrame(q));
        const n = document.querySelector('.slot[data-r="' + r + '"][data-c="' + c + '"] .inc-n'); out.push({ hp, d, txt: n ? n.textContent : '', n1: !!(n && n.classList.contains('n1')) }); }
      u.hp = keep[0]; u.max = keep[1]; R.render(); break; }
    return out; });
  if (!r1.length) ok(true, '1 （この敵では攻撃が来るターンが無かった）');
  else ok(r1.every((x) => x.n1 === (Math.ceil(x.hp / x.d) === 2)), '1 「あと2発」だけ速く脈打つ ' + JSON.stringify(r1));
  // 2
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { const R = window.__rb; R.setGauge(3); R.enemy.bound = false; R.render(); }); await p.click('#btnRotate'); await toChoose(p); }
  const snd = await p.evaluate(() => window.__snd.join(','));
  ok(snd === '1,2,3F', '2 回転コンボの音：1段目・2段目・発動 ' + snd);
  ok(!errs.length, '3 ページのエラーなし ' + errs.join('/'));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
