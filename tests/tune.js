// v5.3.5 調整モード（?tune）
// 合格の基準（測る前に決めたもの）：
//  1. 普通に開くと調整の道具は出ない
//  2. ?tune で開くと「調」のボタンが出る。部品を選ぶ→画面の部品をタップしても、その部品の動作（ボタンなら押した扱い）は起きない
//  3. 選んだ部品の文字の大きさを変えると、画面にすぐ反映される。全体の色（金）を変えると、:root の変数が変わる
//  4. 書き出しに、変えた部品と色が出る。再読み込みしても（?tune なしでも）変更が残る。「終える」で道具が消え、変更も効かなくなる
//  5. 調整モード中も、ゲームのページのエラーが出ない
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const url = testPage();
  await p.goto(url); await p.waitForTimeout(500);
  ok(!(await p.$('#tnFab')), '1 普通に開くと道具は出ない');
  await p.goto(url + '?tune'); await p.waitForTimeout(800);
  ok(!!(await p.$('#tnFab')), '2 ?tune で「調」のボタンが出る');
  await p.click('#cover'); await p.waitForTimeout(500);
  const fs0 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#begin')).fontSize));
  await p.click('#tnFab'); await p.waitForTimeout(200);
  await p.click('#tnPick'); await p.waitForTimeout(200);
  await p.click('#begin'); await p.waitForTimeout(400);
  const st = await p.evaluate(() => ({ sel: document.querySelector('.tn-sel') && document.querySelector('.tn-sel').textContent, runv: !document.getElementById('runv').hidden, panel: !document.getElementById('tnPanel').hidden }));
  ok(st.sel === '#begin' && !st.runv && st.panel, '2 部品をタップで選べて、ボタンは押されない ' + JSON.stringify(st));
  await p.evaluate(() => { const i = document.querySelector('input[data-p="font-size"]'); i.value = '30'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(100);
  const fs1 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#begin')).fontSize));
  ok(fs1 === 30 && fs0 !== 30, '3 文字の大きさがすぐ変わる（' + fs0 + '→' + fs1 + 'px）');
  await p.click('#tnPanel [data-tab="color"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { const i = document.querySelector('input[data-v="--accent"]'); i.value = '#ff0000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  const acc = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  ok(acc === '#ff0000', '3 全体の色（金）が変わる：' + acc);
  await p.click('#tnPanel [data-tab="out"]'); await p.waitForTimeout(100);
  const out = await p.evaluate(() => document.getElementById('tnOut').value);
  ok(/--accent: #ff0000/.test(out) && /#begin \{[\s\S]*font-size: 30px/.test(out), '4 書き出しに変更が出る');
  await p.goto(url); await p.waitForTimeout(800);
  const kept = await p.evaluate(() => ({ fab: !!document.getElementById('tnFab'), acc: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), fs: parseFloat(getComputedStyle(document.querySelector('#begin')).fontSize) }));
  ok(kept.fab && kept.acc === '#ff0000' && kept.fs === 30, '4 ?tune なしで開き直しても残る ' + JSON.stringify(kept));
  await p.click('#tnFab'); await p.waitForTimeout(200); await p.click('#tnPanel [data-tab="out"]'); await p.waitForTimeout(100);
  // 読み込み：書き出しの文字を貼り直せる
  await p.fill('#tnIn', ':root {\n  --ink: #123456;\n}\n#rTitle {\n  font-size: 20px;\n}\n'); await p.click('#tnImport'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() === '#123456' && /#rTitle/.test(document.getElementById('tnOut').value)), '4 書き出しの文字を読み込める');
  await Promise.all([p.waitForNavigation().catch(() => {}), p.click('#tnQuit')]); await p.waitForTimeout(800);
  const gone = await p.evaluate(() => ({ fab: !!document.getElementById('tnFab'), acc: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }));
  ok(!gone.fab && gone.acc !== '#ff0000', '4 「終える」で道具も変更も消える ' + JSON.stringify(gone));
  ok(!errs.length, '5 ページのエラーなし ' + errs.join('/'));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
