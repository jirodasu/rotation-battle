// v5.7.2 最深記録：2回目からの遠征で、これまでより深く進んで途絶えたら、「もう一度、環廊へ」の札に「これまでで最も深く進んだ（地点N）」
// 合格の基準（測る前に決めたもの）：
//  1. これまでの最深が地点1（best=0）で、今回は地点2で全滅 → 札に「これまでで最も深く進んだ（地点2）」
//  2. これまでの最深が地点6（best=5）で、今回は地点2で全滅 → 出さない
//  3. 初めての遠征（runs=0）で地点2で全滅 → 出さない（比べる記録がない）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  for (const [meta, want, tag] of [[{ runs: 1, best: 0, hist: [{ clear: false, node: 1, fal: 4 }] }, true, '1 最深が地点1 → 地点2で途絶える'], [{ runs: 1, best: 5, hist: [{ clear: false, node: 6, fal: 4 }] }, false, '2 最深が地点6 → 地点2で途絶える'], [null, false, '3 初めての遠征']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-teach-inc', '1'); localStorage.setItem('rb-teach-hold', '1'); if (m) localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [TIPS, meta && JSON.stringify(meta)]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    const fight = async (win) => {
      const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
      await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(800);
      await p.evaluate((w) => { const R = window.__rb; if (w) R.enemy.hp = 1; else { R.enemy.hp = 9999; R.enemy.max = 9999; R.run.members.forEach((m) => { m.hp = 1; }); } R.render(); }, win);
      await p.click('#btnStart');
      for (let k = 0; k < 400; k++) { const st = await p.evaluate(() => ({ rv: !document.getElementById('runv').hidden, res: !document.getElementById('result').hidden, ch: window.__rb.phase === 'choose', tip: !document.getElementById('tip').hidden }));
        if (st.tip) { await p.evaluate(() => document.getElementById('tipOk').click()); continue; }
        if (st.res) { await p.evaluate(() => { const n = document.querySelector('#result button.primary:not([hidden]), #next'); if (n) n.click(); }); await p.waitForTimeout(500); continue; }
        if (st.rv) break; if (st.ch) await p.click('#btnStay').catch(() => {}); await p.waitForTimeout(60); }
    };
    await fight(true);
    await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(200);
    await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && !g.disabled) g.click(); }); await p.waitForTimeout(900);
    await fight(false);
    const end = await p.evaluate(() => ({ title: document.getElementById('rvTitle').textContent, card: (document.querySelector('#rvCards .rv-card') || {}).innerText || '' }));
    const has = /これまでで最も深く進んだ（地点2）/.test(end.card.replace(/\s+/g, ''));
    ok(/途絶えた/.test(end.title) && has === want, tag + '：' + (has ? '出る' : '出ない') + ' ' + end.card.replace(/\s+/g, ' ').slice(0, 70));
    ok(!errs.length, tag + '：ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
