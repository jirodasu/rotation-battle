// v5.6.1 踏破の結末（案A）
// 合格の基準（測る前に決めたもの）：
//  1. 初めて踏破すると、結果の画面の上に結末の物語（4枚）が重なって出る。1枚目に「最初の灯」。3枚目に、この遠征で倒れた仲間の名前が出る。最後の1枚だけ「結果へ」が出る
//  2. 輪の灯は絵のまんなかを中心に並ぶ（灯の中心の平均が絵の中心から6px以内）。冒頭の物語の3枚目（降りていく灯）も同じ
//  3. 「結果へ」で閉じると、結果の画面（見出し「最初の灯」）が見え、rb-ending が残る
//  4. 2回目の踏破では結末は出ない。見出しは「最初の灯」
//  5. 誰も倒れずに踏破したときは、3枚目が「誰ひとり欠けずに」で始まる
//  6. 393×852・320×568・844×390：文が画面に収まり、絵と重ならない。「とばす」「結果へ」が画面の中。ページのエラーなし
process.env.RB_STORY = '1';
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
const ST = () => { const s = document.getElementById('story'), t = document.getElementById('stTxt'), r = t.getBoundingClientRect(), go = document.getElementById('stGo'), sk = document.getElementById('stSkip').getBoundingClientRect();
  const g = go.getBoundingClientRect(), art = document.getElementById('stArt').getBoundingClientRect(), on = [...document.querySelectorAll('#stDots i')].findIndex((i) => i.classList.contains('on'));
  const lamps = [...document.querySelectorAll('#stArt .st-lamp')].map((l) => { const b = l.getBoundingClientRect(); return b.left + b.width / 2; });
  const lampDx = lamps.length ? Math.round(Math.abs(lamps.reduce((a, x) => a + x, 0) / lamps.length - (art.left + art.width / 2))) : 0;
  return { open: !s.hidden, text: t.textContent, on, n: document.querySelectorAll('#stDots i').length, go: !go.hidden, goText: go.textContent, lampDx, lampN: lamps.length,
    fit: r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && t.scrollWidth <= t.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth,
    noOverlap: Math.max(0, Math.min(art.right, r.right) - Math.max(art.left, r.left)) * Math.max(0, Math.min(art.bottom, r.bottom) - Math.max(art.top, r.top)) < 2,
    skipIn: sk.top >= 0 && sk.right <= innerWidth + 1, goIn: go.hidden || (g.bottom <= innerHeight + 1 && g.top >= 0) };
};
const clearRun = (fallen) => { const R = window.__rb; R.beginExp('std', 1); const r = R.run; r.node = 9; for (let k = 0; k < fallen; k++) { const m = r.members.pop(); m.fate = 'fallen'; r.gone.push(m); } const names = r.gone.map((m) => m.name); R.expEnd(true, []); return names; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [844, 390]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-story', '1'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } }, TIPS);
    await p.addInitScript('window.__st = ' + ST.toString());
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
    // 2（冒頭）：タイトルの「物語」から3枚目
    await p.click('#storyBtn'); await p.waitForTimeout(200);
    for (let k = 0; k < 2; k++) { await p.mouse.click(Math.round(w / 2), Math.round(h * 0.2)); await p.waitForTimeout(120); }
    const op = await p.evaluate(() => window.__st());
    ok(op.on === 2 && op.lampN >= 5 && op.lampDx <= 6, tag + ' 2 冒頭の3枚目：灯が絵のまんなかに並ぶ（ずれ ' + op.lampDx + 'px・' + op.lampN + '個）');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // 1 初めての踏破（1人倒れた）
    const names = await p.evaluate(clearRun, 1); await p.waitForTimeout(400);
    const pages = [await p.evaluate(() => window.__st())];
    for (let k = 0; k < 3; k++) { await p.mouse.click(Math.round(w / 2), Math.round(h * 0.2)); await p.waitForTimeout(120); pages.push(await p.evaluate(() => window.__st())); }
    ok(pages[0].open && pages[0].n === 4 && /最初の灯/.test(pages[0].text), tag + ' 1 初めての踏破で結末が出る（4枚・1枚目に「最初の灯」）');
    ok(names.length === 1 && pages[2].text.includes(names[0]), tag + ' 1 3枚目に倒れた仲間の名前 ' + names[0] + '：' + pages[2].text.slice(0, 20));
    ok(pages.map((s) => s.on).join() === '0,1,2,3' && pages.slice(0, 3).every((s) => !s.go) && pages[3].go && pages[3].goText === '結果へ', tag + ' 1 1枚ずつ進み、最後だけ「結果へ」');
    ok(pages[1].lampDx <= 6 && pages[1].lampN >= 12, tag + ' 2 輪の灯が絵のまんなかを中心に並ぶ（ずれ ' + pages[1].lampDx + 'px）');
    ok(pages.every((s) => s.fit && s.noOverlap && s.skipIn && s.goIn), tag + ' 6 どの枚も文が収まり、絵と重ならず、ボタンが画面の中 ' + JSON.stringify(pages.filter((s) => !(s.fit && s.noOverlap && s.skipIn && s.goIn)).map((s) => s.on)));
    await p.click('#stGo'); await p.waitForTimeout(500);
    const r1 = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, runv: !document.getElementById('runv').hidden, t: document.getElementById('rvTitle').textContent, k: localStorage.getItem('rb-ending') }));
    ok(!r1.story && r1.runv && r1.t === '最初の灯' && r1.k === '1', tag + ' 3 「結果へ」で結果の画面に戻る ' + JSON.stringify(r1));
    // 4 2回目
    await p.evaluate(clearRun, 0); await p.waitForTimeout(400);
    const r2 = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, t: document.getElementById('rvTitle').textContent }));
    ok(!r2.story && r2.t === '最初の灯', tag + ' 4 2回目の踏破では結末は出ない ' + JSON.stringify(r2));
    // 5 誰も倒れずに（結末をまだ見ていない状態に戻して）
    await p.evaluate(() => localStorage.removeItem('rb-ending'));
    await p.evaluate(clearRun, 0); await p.waitForTimeout(300);
    for (let k = 0; k < 2; k++) { await p.mouse.click(Math.round(w / 2), Math.round(h * 0.2)); await p.waitForTimeout(120); }
    const z = await p.evaluate(() => window.__st());
    ok(z.on === 2 && /^誰ひとり欠けずに/.test(z.text), tag + ' 5 誰も倒れなければ「誰ひとり欠けずに」：' + z.text.slice(0, 16));
    ok(!errs.length, tag + ' 6 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
