// v5.1.34 盤の名前とHPの文字（360px以上の画面は12px以上、最小の画面でも11px）、名札が重ならない・列からはみ出さない。
// 上の丸ボタンは押せる範囲が44×44で、隣のボタンの押せる範囲と重ならない（中心の間隔44px以上）。祝福の詳細に出る条件。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 667], [360, 640], [320, 568], [844, 390], [667, 375], [568, 320], [1024, 768], [1280, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) {} });
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(600);
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(3, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); }); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const ov = (a, b) => !(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5);
      const nms = [...document.querySelectorAll('#board .tok .nm')].filter((e) => e.offsetParent);
      const fs = nms.map((e) => parseFloat(getComputedStyle(e.querySelector('b')).fontSize));
      const fsu = nms.map((e) => parseFloat(getComputedStyle(e.querySelector('u')).fontSize));
      let over = 0; for (let i = 0; i < nms.length; i++) for (let j = i + 1; j < nms.length; j++) if (ov(nms[i].getBoundingClientRect(), nms[j].getBoundingClientRect())) over++;
      const clip = nms.filter((e) => { const s = e.closest('.slot') || e.parentElement, a = e.getBoundingClientRect(), q = (e.closest('.strip') || s).getBoundingClientRect(); return a.left < q.left - 1 || a.right > q.right + 1; }).length;
      const ib = [...document.querySelectorAll('.icon-btn')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(), a = getComputedStyle(e, '::after'); return [Math.round(r.width), Math.round(parseFloat(a.width)), Math.round(parseFloat(a.height))]; });
      const sw = [...document.querySelectorAll('#board .slot')].map((s) => Math.round(s.getBoundingClientRect().width)); const cx = [...document.querySelectorAll('.icon-btn')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2); }); const chip = document.querySelector('.top .chip'); const cr = chip ? chip.getBoundingClientRect() : null; return { sw: Math.min(...sw), cx: cx.join(' '), chip: cr ? Math.round(cr.left) + '-' + Math.round(cr.right) : '', name: Math.min(...fs), hp: Math.min(...fsu), over, clip, ib: ib.map((x) => x.join('/')).join(' ') };
    });
    const small = w < 360 || h < 360, xs = r.cx.split(' ').slice(1).map((s) => +s.split(',')[0]);
    const gapOk = xs.every((x, i) => i === 0 || x - xs[i - 1] >= 44);
    ok(r.name >= (small ? 11 : 12) && r.hp >= (small ? 11 : 12) && !r.over && !r.clip, w + 'x' + h + ' 名前とHPの文字 ' + r.name + '/' + r.hp + 'px・重なり' + r.over + '・はみ出し' + r.clip);
    ok(r.ib.split(' ').every((s) => { const [, aw, ah] = s.split('/').map(Number); return aw >= 44 && ah >= 44; }) && gapOk, w + 'x' + h + ' 丸ボタンの押せる範囲44×44・隣と重ならない ' + r.ib + ' / ' + r.cx);
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) {} });
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(600);
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(1, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); }); await p.waitForTimeout(300);
    await p.click('#btnStart');
    for (let k = 0; k < 80; k++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(120); }
    const id = await p.evaluate(() => { let id = null; window.__rb.grid.forEach((r) => r.forEach((u) => { if (u && u.job === 'cleric') id = u.uid; })); return id; });
    await p.click('.tok[data-id="' + id + '"]'); await p.waitForTimeout(300);
    const t = await p.evaluate(() => (document.querySelector('.pk-extra') || {}).textContent || '');
    ok(/祝福/.test(t) && /最大HPまで/.test(t) && /回して攻撃列に入ったターンだけ/.test(t), '神官の詳細：祝福の条件と「最大HPまで」 ' + t);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
