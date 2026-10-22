const { launch, indexURL } = require('./_env');
(async () => {
  const b = await launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(indexURL); await p.waitForTimeout(400);
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1300);
  const acts = { '仲間を動かす ①': '.slot[data-r="2"][data-c="2"]', '仲間を動かす ②': '.slot[data-r="0"][data-c="2"]', '戦闘開始': '#btnStart', '先読みしてみよう': '#btnPreview', 'まず「維持」': '#btnStay', '回す': '#btnRotate' };
  const seen = [];
  for (let i = 0; i < 260; i++) {
    const st = await p.evaluate(() => ({ vis: !document.getElementById('coach').hidden, t: document.getElementById('coTitle').textContent, nx: !document.getElementById('coNext').hidden, res: !document.getElementById('result').hidden }));
    if (st.res) break;
    if (st.vis) {
      if (seen[seen.length - 1] !== st.t) seen.push(st.t);
      if (st.t === '回復列で休む') { await p.waitForTimeout(400); await p.screenshot({ path: '/home/claude/qa/tut-heal.png' }); }
      if (acts[st.t]) await p.click(acts[st.t]).catch(() => {}); else if (st.nx) await p.click('#coNext').catch(() => {});
    } else {
      const can = await p.evaluate(() => !document.getElementById('btnRotate').hidden && !document.getElementById('btnRotate').classList.contains('tut-off') && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden');
      if (can) await p.click(i % 2 ? '#btnRotate' : '#btnStay').catch(() => {});
    }
    await p.waitForTimeout(300);
  }
  console.log('steps:', seen.join(' > '));
  console.log('result:', await p.evaluate(() => document.getElementById('rTitle').textContent), 'errors', JSON.stringify(errs));
  await b.close();
})();
