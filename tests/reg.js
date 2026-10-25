const { launch, indexURL } = require('./_env');
(async () => {
  const b = await launch();
  const errs = [];
  // main mode
  {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    p.on('pageerror', e => errs.push('main: ' + e.message));
    await p.goto(indexURL); await p.waitForTimeout(400);
    await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(800); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(900);
    await p.click('#btnStart');
    let opened = false;
    for (let i = 0; i < 80; i++) {
      await p.waitForTimeout(600);
      if (await p.evaluate(() => !document.getElementById('result').hidden)) break;
      const can = await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden');
      if (can) {
        if (!opened) { await p.click('#eart'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(200); opened = true; }
        await p.click(i % 2 ? '#btnRotate' : '#btnStay');
      }
    }
    console.log('main:', await p.evaluate(() => document.getElementById('rTitle').textContent));
  }
  // tutorial
  {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    p.on('pageerror', e => errs.push('tut: ' + e.message));
    await p.goto(indexURL); await p.waitForTimeout(400);
    await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1300);
    const acts = { '仲間を動かす ①': '.slot[data-r="2"][data-c="2"]', '仲間を動かす ②': '.slot[data-r="0"][data-c="2"]', '戦闘開始': '#btnStart', '先読みしてみよう': '#btnPreview', 'まず「維持」': '#btnStay', '回す': '#btnRotate' };
    let steps = 0;
    for (let i = 0; i < 200; i++) {
      const st = await p.evaluate(() => ({ vis: !document.getElementById('coach').hidden, t: document.getElementById('coTitle').textContent, nx: !document.getElementById('coNext').hidden, res: !document.getElementById('result').hidden }));
      if (st.res) break;
      if (st.vis) { steps++; if (acts[st.t]) await p.click(acts[st.t]); else if (st.nx) await p.click('#coNext'); }
      else {
        const can = await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden');
        if (can) await p.click(i % 2 ? '#btnRotate' : '#btnStay');
      }
      await p.waitForTimeout(350);
    }
    console.log('tut:', await p.evaluate(() => document.getElementById('rTitle').textContent), 'coach steps', steps);
    // チュートリアルを終えたら「本番モードへ」で遠征が始まる
    await p.click('#next'); await p.waitForTimeout(900);
    console.log('afterTut:', await p.evaluate(() => (window.__rb && window.__rb.run ? window.__rb.run.mode : null) || document.getElementById('rvTitle').textContent));
  }
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
