// v5.8.7：初めての遠征は物語のあとすぐ初戦の隊列に入る（地図は出ない）ので、「遠征が始まる」は地図か初戦の隊列のどちらかで見る
// v5.5.8 冒頭の物語（なぜ環廊に潜るのか）
// 合格の基準（測る前に決めたもの）：
//  1. 初めて「環廊へ」を押すと物語が出る（v5.7.5 から4枚。残り3枚は第2章へ入るときの「物語の続き」＝v576）。1枚目の文は「環廊」を含む。タップで1枚ずつ進み、点の位置が進む。最後の1枚だけ「遠征へ」が出る
//  2. 「遠征へ」で物語が閉じ、遠征が始まる（地図か隊の選択が出る）。2回目に「環廊へ」を押しても物語は出ない
//  3. 「とばす」でいつでも抜け、そのまま遠征が始まる
//  4. タイトルの「物語」ボタン：まだ見ていない人には出ない。見たあとは出て、押すと最初から見返せる。最後のボタンは「タイトルへ」で、押すとタイトルに戻る（遠征は始まらない）
//  5. 393×852・320×568・844×390：どの文も横にはみ出さない（画面の中に収まる）。絵と文が重ならない。「とばす」と「遠征へ」が画面の中。ページのエラーなし
process.env.RB_STORY = '1';   // まだ物語を見ていない状態で開く（ほかのテストは「見た」から始まる）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
const ST = () => { const s = document.getElementById('story'), t = document.getElementById('stTxt'), r = t.getBoundingClientRect(), go = document.getElementById('stGo'), sk = document.getElementById('stSkip').getBoundingClientRect();
  const g = go.getBoundingClientRect(), art = document.getElementById('stArt').getBoundingClientRect(), on = [...document.querySelectorAll('#stDots i')].findIndex((i) => i.classList.contains('on'));
  return { open: !s.hidden, text: t.textContent, on, n: document.querySelectorAll('#stDots i').length, go: !go.hidden, goText: go.textContent,
    fit: r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && t.scrollWidth <= t.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth,
    noOverlap: Math.max(0, Math.min(art.right, r.right) - Math.max(art.left, r.left)) * Math.max(0, Math.min(art.bottom, r.bottom) - Math.max(art.top, r.top)) < 2, skipIn: sk.top >= 0 && sk.right <= innerWidth + 1, goIn: go.hidden || (g.bottom <= innerHeight + 1 && g.top >= 0) }; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [844, 390]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } }, TIPS);
    await p.addInitScript('window.__st = ' + ST.toString());
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('storyBtn').hidden), tag + ' 4 まだ見ていないうちは、タイトルに「物語」が出ない');
    await p.click('#begin'); await p.waitForTimeout(300);
    const pages = []; let s = await p.evaluate(() => window.__st());
    pages.push(s);
    for (let k = 0; k < 3; k++) { await p.mouse.click(Math.round(w / 2), Math.round(h * 0.25)); await p.waitForTimeout(120); pages.push(await p.evaluate(() => window.__st())); }
    ok(pages[0].open && /環廊/.test(pages[0].text) && pages[0].n === 4, tag + ' 1 初めての「環廊へ」で物語が出る（4枚） ' + pages[0].text.slice(0, 16));
    ok(pages.every((x, i) => x.on === i), tag + ' 1 タップで1枚ずつ進む（点 ' + pages.map((x) => x.on).join('') + '）');
    ok(pages.slice(0, 3).every((x) => !x.go) && pages[3].go && pages[3].goText === '遠征へ', tag + ' 1 最後の1枚だけ「遠征へ」');
    ok(pages.every((x) => x.fit && x.noOverlap && x.skipIn && x.goIn), tag + ' 5 どの文もはみ出さず、絵と重ならず、「とばす」「遠征へ」が画面の中 ' + JSON.stringify(pages.map((x) => (x.fit ? '' : 'はみ出し') + (x.noOverlap ? '' : '絵と重なる') + (x.skipIn ? '' : 'とばす外') + (x.goIn ? '' : '遠征へ外')).filter(Boolean)));
    // もう1回タップしても最後のまま（勝手に始まらない）
    await p.mouse.click(Math.round(w / 2), Math.round(h * 0.25)); await p.waitForTimeout(120);
    ok((await p.evaluate(() => window.__st())).on === 3, tag + ' 1 最後の1枚でタップしても進まない（「遠征へ」で始める）');
    await p.click('#stGo'); await p.waitForTimeout(800);
    const a = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, runv: !document.getElementById('runv').hidden || (window.__rb.phase === 'prep' && !!window.__rb.run), seen: localStorage.getItem('rb-story') }));
    ok(!a.story && a.runv && a.seen === '1', tag + ' 2 「遠征へ」で物語が閉じ、遠征が始まる ' + JSON.stringify(a));
    // 2回目：遠征をやめてタイトルへ → 「物語」が出る。「環廊へ」では物語は出ない
    await p.evaluate(() => { localStorage.removeItem('rb-exp-save'); }); await p.reload(); await p.waitForTimeout(400);
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await p.waitForTimeout(300); }
    ok(await p.evaluate(() => !document.getElementById('storyBtn').hidden), tag + ' 4 見たあとは、タイトルに「物語」が出る');
    await p.click('#storyBtn'); await p.waitForTimeout(200);
    const r0 = await p.evaluate(() => window.__st());
    for (let k = 0; k < 3; k++) { await p.mouse.click(Math.round(w / 2), Math.round(h * 0.25)); await p.waitForTimeout(80); }
    const r6 = await p.evaluate(() => window.__st());
    ok(r0.open && r0.on === 0 && r0.n === 4 && r6.on === 3 && r6.goText === 'タイトルへ', tag + ' 4 「物語」で最初から見返せて、最後は「タイトルへ」');
    await p.click('#stGo'); await p.waitForTimeout(300);
    const b4 = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, runv: !document.getElementById('runv').hidden, cover: !document.getElementById('cover').hidden }));
    ok(!b4.story && !b4.runv && b4.cover, tag + ' 4 「タイトルへ」でタイトルに戻り、遠征は始まらない ' + JSON.stringify(b4));
    await p.click('#begin'); await p.waitForTimeout(600);
    const c2 = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, runv: !document.getElementById('runv').hidden || (window.__rb.phase === 'prep' && !!window.__rb.run) }));
    ok(!c2.story && c2.runv, tag + ' 2 2回目の「環廊へ」では物語は出ず、そのまま遠征へ ' + JSON.stringify(c2));
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 3 とばす
  { const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(300);
    await p.mouse.click(196, 200); await p.waitForTimeout(100);
    await p.click('#stSkip'); await p.waitForTimeout(800);
    const s = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, runv: !document.getElementById('runv').hidden || (window.__rb.phase === 'prep' && !!window.__rb.run), seen: localStorage.getItem('rb-story') }));
    ok(!s.story && s.runv && s.seen === '1', '3 「とばす」で抜けて、そのまま遠征が始まる ' + JSON.stringify(s));
    await ctx.close(); }
  // 6 キーボード（v5.6.0）：開いた直後の Enter で「とばす」が押されず、1枚進む。← で1枚戻る。Esc で抜ける
  { const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } catch (e) { /* */ } }, TIPS);
    await p.addInitScript('window.__st = ' + ST.toString());
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(300);
    await p.keyboard.press('Enter'); await p.waitForTimeout(120); const k1 = await p.evaluate(() => window.__st());
    await p.keyboard.press(' '); await p.waitForTimeout(120); const k2 = await p.evaluate(() => window.__st());
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(120); const k3 = await p.evaluate(() => window.__st());
    ok(k1.open && k1.on === 1 && k2.on === 2 && k3.open && k3.on === 1, '6 開いた直後の Enter・Space で1枚ずつ進み（とばさない）、← で戻る ' + [k1.on, k2.on, k3.on].join(','));
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    const e = await p.evaluate(() => ({ story: !document.getElementById('story').hidden, runv: !document.getElementById('runv').hidden || (window.__rb.phase === 'prep' && !!window.__rb.run) }));
    ok(!e.story && e.runv, '6 Esc で抜けて遠征が始まる ' + JSON.stringify(e));
    await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
