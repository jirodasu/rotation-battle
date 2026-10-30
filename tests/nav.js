const { launch, indexURL } = require('./_env');
(async () => {
  const b = await launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(indexURL); await p.waitForTimeout(400);
  // tutorial -> quit -> title -> main -> home -> tutorial again
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1200);
  await p.click('#coNext'); await p.waitForTimeout(200);
  await p.click('#coQuit'); await p.waitForTimeout(600);
  const t1 = await p.evaluate(() => !document.getElementById('cover').hidden && document.body.classList.contains('is-cover'));
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(900);
  const chip = await p.evaluate(() => document.getElementById('chipTurn').textContent);
  await p.click('#btnStart'); await p.waitForTimeout(300);
  const disabledDuring = await p.evaluate(() => document.getElementById('homeBtn').disabled);
  await p.waitForSelector('#btnRotate:not([hidden])', { timeout: 30000 }); await p.waitForTimeout(400);
  if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk');   // 案内は上の帯の上に出る（v5.2.2）。閉じてから押す
  await p.click('#homeBtn'); await p.waitForTimeout(600);
  const t2 = await p.evaluate(() => !document.getElementById('cover').hidden);
  await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1200);
  const coach = await p.evaluate(() => document.getElementById('coTitle').textContent);
  console.log({ quitToTitle: t1, mainChip: chip, homeDisabledDuringResolve: disabledDuring, homeToTitle: t2, tutorialRestart: coach, errs });
  await b.close();
})();
