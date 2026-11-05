// v5.4.1 動きで知らせる：補助の矢印のラインドロー、見通しの札のテキストロール
// 合格の基準（測る前に決めたもの）：
//  1. 陣立てで初めて出る矢印（効く矢印）は、線が伸びる（grow）。伸び終わると線は最後まで描かれている
//  2. 同じ並びで描き直しても、矢印を作り直さない（伸びている途中の線が最初からやり直しにならない）
//  3. 「回す」で補助列に来た仲間の効く矢印は伸びる。点線（効かない）の矢印は伸びない
//  4. 見通しの札：中身が変わった行だけ回して入れ替える（roll）。変わらない行は動かさない。「倒れる」が新しく出たら強めに知らせる（alarm）
//  5. 動きを減らす設定では、伸ばさない・回さない
//  6. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const fr = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
async function toPrep(p) {
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700); await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(400);
}
const toChoose = async (p) => { for (let k = 0; k < 200; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(60); } await fr(p); await fr(p); };
(async () => {
  const b = await launch();
  const init = () => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); } catch (e) { /* */ } };
  {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(init); await toPrep(p);
    for (let k = 0; k < 60 && !(await p.evaluate(() => document.querySelectorAll('#supAr .sa').length)); k++) await p.waitForTimeout(50);
    // 1
    const g1 = await p.evaluate(() => [...document.querySelectorAll('#supAr .sa.on')].map((g) => g.classList.contains('grow')));
    ok(g1.length > 0 && g1.every(Boolean), '1 陣立てで初めて出る効く矢印は伸びる ' + JSON.stringify(g1));
    await p.waitForTimeout(800);
    const off = await p.evaluate(() => [...document.querySelectorAll('#supAr .sa.on .bd')].map((l) => parseFloat(getComputedStyle(l).strokeDashoffset) || 0));
    ok(off.length > 0 && off.every((v) => Math.abs(v) < 0.01), '1 伸び終わると、線は最後まで描かれている ' + JSON.stringify(off));
    // 2（盤の大きさの合わせ直しが終わってから）
    await p.waitForTimeout(1500);
    const same = await p.evaluate(async () => { const a = document.querySelector('#supAr .sa'); window.__s0 = document.getElementById('supAr').__h; window.__rb.render(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return document.querySelector('#supAr .sa') === a || (window.__saDbg = [window.__s0, document.getElementById('supAr').__h]) && false; });
    if (!same) console.log(await p.evaluate(() => window.__saDbg));
    ok(same, '2 同じ並びで描き直しても、矢印は作り直さない');
    // 3 戦闘へ：1手目のあとの選ぶ場面
    await p.waitForTimeout(1500);
    await p.click('#btnStart'); await toChoose(p);
    const c1 = await p.evaluate(() => [...document.querySelectorAll('#supAr .sa')].map((g) => ({ on: g.classList.contains('on'), grow: g.classList.contains('grow') })));
    ok(c1.filter((x) => !x.on).every((x) => !x.grow), '3 点線の矢印は伸びない ' + JSON.stringify(c1));
    // 4 見通しの札（ターンを変えて予報を変える）
    const prev = await p.evaluate(() => [...document.querySelectorAll('#ocStay .oc-r b')].map((x) => x.textContent));
    const r4 = await p.evaluate(async () => { const R = window.__rb, before = [...document.querySelectorAll('#ocStay .oc-r b')].map((x) => x.textContent); let t0 = 0;
      for (let t = 2; t <= 12; t++) { R.setTurn(t); R.render(); await new Promise((r) => requestAnimationFrame(r)); const now = [...document.querySelectorAll('#ocStay .oc-r b')].map((x) => x.textContent); if (now.join() !== before.join()) { t0 = t; break; } }
      const rows = [...document.querySelectorAll('#ocStay .oc-r b')].map((x, i) => ({ t: x.textContent, roll: x.classList.contains('roll'), was: before[i] }));
      return { t0, rows }; });
    ok(r4.t0 > 0 && r4.rows.every((x) => x.roll === (x.t !== x.was)), '4 中身が変わった行だけ回す ' + JSON.stringify(r4.rows));
    // 4 倒れる（狙われる仲間のHPを1にする）
    const r4b = await p.evaluate(async () => { const R = window.__rb; let hit = null;
      for (let t = 1; t <= 14 && !hit; t++) { R.setTurn(t); const inc = R.incoming(R.grid, false, false), k = Object.keys(inc)[0]; if (k) hit = k; }
      if (!hit) return null; R.render(); await new Promise((r) => requestAnimationFrame(r));
      const [r, c] = hit.split(',').map(Number), u = R.grid[r][c], keep = u.hp; u.hp = 1; R.render(); await new Promise((q) => requestAnimationFrame(q));
      const b = [...document.querySelectorAll('#ocStay .oc-r')].find((x) => x.dataset.k === 'hurt').querySelector('b');   // v5.5.1：いちばん危ない仲間の行
      const res = { t: b.textContent, ko: b.classList.contains('ko'), alarm: b.classList.contains('alarm'), roll: b.classList.contains('roll') }; u.hp = keep; R.render(); return res; });
    if (r4b) ok(/→0/.test(r4b.t) && r4b.ko && r4b.alarm && r4b.roll, '4 倒れる（→0）が新しく出たら強めに知らせる ' + JSON.stringify(r4b));
    else ok(true, '4 （この敵では攻撃が来るターンが無かった）');
    // 3 回す
    await p.evaluate(() => { window.__rb.setGauge(3); window.__rb.setTurn(1); window.__rb.render(); }); await fr(p);
    const beforeRot = await p.evaluate(() => [...document.querySelectorAll('#supAr .sa')].map((g) => g.dataset.c + (g.classList.contains('on') ? 'on' : 'off')).join());
    await p.click('#btnRotate'); await toChoose(p);
    const c3 = await p.evaluate(() => { const g1 = window.__rb.grid[1]; return [...document.querySelectorAll('#supAr .sa')].map((g) => ({ c: +g.dataset.c, on: g.classList.contains('on'), grow: g.classList.contains('grow'), who: g1[+g.dataset.c] && g1[+g.dataset.c].name })); });
    ok(c3.length > 0 && c3.every((x) => x.grow === x.on), '3 回して補助列に来た仲間の効く矢印は伸び、点線は伸びない ' + JSON.stringify(c3) + ' 回す前 ' + beforeRot);
    ok(!errs.length, '6 ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 5 動きを減らす設定
  {
    const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(init); await toPrep(p); await p.waitForTimeout(1600);
    const g = await p.evaluate(() => ({ n: document.querySelectorAll('#supAr .sa').length, grow: document.querySelectorAll('#supAr .sa.grow').length }));
    ok(g.n > 0 && g.grow === 0, '5 動きを減らす設定では矢印を伸ばさない ' + JSON.stringify(g));
    await p.click('#btnStart'); await toChoose(p);
    const r = await p.evaluate(async () => { const R = window.__rb; for (let t = 2; t <= 8; t++) { R.setTurn(t); R.render(); await new Promise((q) => requestAnimationFrame(q)); } return document.querySelectorAll('.oc-r b.roll').length; });
    ok(r === 0, '5 動きを減らす設定では札の数字を回さない');
    ok(!errs.length, '6 ページのエラーなし（320×568） ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
