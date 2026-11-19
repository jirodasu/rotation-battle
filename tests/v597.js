// v5.9.7 三位一体（敵3体）の表示を短く・分かりやすく（2026-11-19 通しプレイの指摘 2・3）
// 合格の基準（測る前に決めたもの）：
//  1 「敵は3体」のヒントの本文は60字以内で、「タップ」と「攻撃する敵」を含む
//  2 敵のパネルの技の種類は絵（svg）で出る。1文字の漢字（腕・癒・断）は出ない
//  3 狙う列は「全員」などの言葉で出る（「→全」の1文字は出ない）
//  4 320・375・390px で、3枚のパネルとヒントが画面に収まり、ヒントの本文が2行以上の段落にならない（3行以内）。撮る（tests/out/v597_*.png）
//  5 ページのエラーなし
const { launch, testPage } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const OUT = path.join(__dirname, 'out');
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"combo":1,"hmIntro":1,"einfo":1,"bench":1}';
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(700);
    await p.evaluate(() => { const R = window.__rb; R.run.node = 4; R.run.enemy = R.expEnemy(5, null, 'trinity'); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.render(); });
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const tip = document.getElementById('tip'), body = document.getElementById('tipB'), cards = [...document.querySelectorAll('#party .fc')];
      const tr = tip.getBoundingClientRect(), lh = parseFloat(getComputedStyle(body).lineHeight) || 20;
      return { shown: !tip.hidden, t: document.getElementById('tipT').textContent, body: body.textContent, lines: Math.round(body.getBoundingClientRect().height / lh),
        tipIn: tr.top >= 0 && tr.bottom <= innerHeight + 1, cardsIn: cards.every((c) => { const q = c.getBoundingClientRect(); return q.top >= 0 && q.right <= innerWidth + 1; }),
        svg: cards.map((c) => !!c.querySelector('.fc-g svg') || getComputedStyle(c.querySelector('.fc-g')).display === 'none'), glyph: cards.map((c) => c.querySelector('.fc-g').textContent.trim()),
        acts: cards.map((c) => (c.querySelector('.fc-act') || {}).textContent || '') };
    });
    const tag = w + '×' + h;
    ok(r.shown && r.body.length <= 60 && /タップ/.test(r.body) && /攻撃する敵/.test(r.body), tag + ' 1 ヒントは60字以内（' + r.body.length + '字）「' + r.body + '」');
    ok(r.svg.every(Boolean) && r.glyph.every((g) => !/[腕癒断]/.test(g)), tag + ' 2 技の種類は絵 ' + JSON.stringify(r.glyph));
    ok(r.acts.every((a) => !/→(全|後|中|\?)$/.test(a)) && r.acts.some((a) => /全員/.test(a)), tag + ' 3 狙う列は言葉 ' + JSON.stringify(r.acts));
    ok(r.tipIn && r.cardsIn && r.lines <= 3, tag + ' 4 パネルとヒントが画面に収まる（本文 ' + r.lines + ' 行）');
    await p.screenshot({ path: path.join(OUT, 'v597_' + w + '.png') });
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
