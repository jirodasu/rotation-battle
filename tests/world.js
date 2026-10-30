// 世界観「環廊」の文章（v5.1.32）：表紙・章の名前・敵の名前・休息・結果・チュートリアル。ルールの数値は変えない。
// 章の名前が長くなっても、地図の章チップと戦闘中の場所表示がはみ出さない（390×844・844×390）。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) {} });
    await p.goto(testPage()); await p.waitForTimeout(400);
    const cover = await p.evaluate(() => ({ copy: document.querySelector('.c-copy').textContent, sub: document.getElementById('begin').textContent }));
    if (w === 390) ok(/環廊/.test(cover.copy) && /環廊/.test(cover.sub), '表紙に「環廊」' + JSON.stringify(cover));
    await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(600);
    const map = await p.evaluate(() => {
      const ch = [...document.querySelectorAll('.rt-ch span')], box = document.querySelector('.rt-ch').getBoundingClientRect();
      return { small: document.getElementById('rvSmall').textContent, chips: ch.map((x) => x.textContent), over: ch.some((x) => { const r = x.getBoundingClientRect(); return r.right > box.right + 1 || r.left < box.left - 1 || x.scrollWidth > x.clientWidth + 1; }), rest: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.textContent).join('|') };
    });
    ok(/第1章 祈りの間/.test(map.small) && map.chips.join() === '祈りの間,貝殻の書庫,竜の眠る祭壇' && !map.over, w + 'x' + h + ' 地図：章の名前がはみ出さない ' + JSON.stringify(map));
    const names = await p.evaluate(() => { const R = window.__rb; return [R.expEnemy(1, null, 0).name, R.expEnemy(1, null, 'binder').name, R.expEnemy(3, null, 0).name, R.expEnemy(6, null, 0).name, R.expEnemy(10, null, 0).name, R.expEnemy(1, 'swarm', 'binder').name]; });
    if (w === 390) ok(names.join() === '灯喰いネズミ,鎖ネズミ,石棺の巨人,角面の書守,祭壇の毒竜,群れの鎖ネズミ', '敵の名前 ' + JSON.stringify(names));
    // 戦闘中の場所表示
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(1, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); }); await p.waitForTimeout(300);
    const chip = await p.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /第1章 祈りの間/.test(e.textContent)); if (!el) return null; const r = el.getBoundingClientRect(); return { t: el.textContent, ok: r.right <= innerWidth + 1 && r.left >= -1 && el.scrollWidth <= el.clientWidth + 1 }; });
    ok(chip && chip.ok, w + 'x' + h + ' 戦闘中：「第1章 祈りの間」が画面に収まる ' + JSON.stringify(chip));
    // 終わりの画面
    const end = await p.evaluate(() => { window.__rb.expEnd(false, []); return document.getElementById('rvTitle').textContent + '|' + [...document.querySelectorAll('#rvCards .rv-card b')].map((x) => x.textContent).join(); });
    if (w === 390) ok(/灯は、ここで途絶えた/.test(end) && /もう一度、環廊へ/.test(end), '遠征の結果 ' + end);
    ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
    await ctx.close();
  }
  // チュートリアルの冒頭
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300);
    await p.click('#beginTut'); await p.waitForTimeout(900);
    const t = await p.evaluate(() => document.getElementById('coText').textContent);
    ok(/環廊/.test(t), 'チュートリアルの冒頭に環廊 ' + t);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
