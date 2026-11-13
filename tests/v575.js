// v5.7.4 最初の戦闘（提案A）・初回の地点1・2は亜種なし（提案D）
// 合格の基準（測る前に決めたもの）：
//  1. 初めての遠征：地点1・2の戦闘は亜種なし。地点1は灯喰いネズミ（HP81、かみつき→サムライ、ためる、のしかかり16）
//  2. 地点1を「倒」を見て回して戦う → 3ターン目に「回せば、倒れずにすむ」が出て、「しのいだ！」が1回以上、誰も倒れずに勝つ
//  3. 地点1を一度も回さずに戦う → 3ターン目の判断で「維持」に「倒」が付いている（回さないと危ないことが見える）
//  4. 2回目の遠征（遠征1回）：地点1は専用の戦闘ではない（通常の敵）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  const open = async (runs) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, r]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-teach-inc', '1'); localStorage.setItem('rb-teach-hold', '1'); if (r) localStorage.setItem('rb-exp', JSON.stringify({ runs: r, best: 1, hist: [{ clear: false, node: 2, fal: 4 }] })); } catch (e) { /* */ } }, [TIPS, runs]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    return { ctx, p, errs };
  };
  // 1：地図の中身
  { const { ctx, p, errs } = await open(0);
    const m = await p.evaluate(() => { const R = window.__rb.run, out = []; for (const id in R.map) { const n = window.__rb.ROUTE.nodes[id]; if (n && n.step <= 2 && R.map[id].foe !== undefined) out.push({ step: n.step, foe: R.map[id].foe, v: R.map[id].variant || null }); } return out; });
    const s1 = m.filter((x) => x.step === 1), s2 = m.filter((x) => x.step === 2);
    ok(s1.length && s1.every((x) => x.foe === 'first' && !x.v) && s2.every((x) => !x.v), '1 地点1は専用（亜種なし）、地点2は亜種なし ' + JSON.stringify(m));
    const e = await p.evaluate(() => { const E = window.__rb.expEnemy(1, null, 'first'); return { name: E.name, hp: E.hp, pat: E.pattern.map((a) => a.name + ':' + (a.job || a.rule) + ':' + (a.dmg || 0)).join(' ') }; });
    ok(e.hp === 81 && /かみつき:サムライ:12/.test(e.pat) && /のしかかり:lowhp:16/.test(e.pat), '1 地点1の敵：' + JSON.stringify(e));
    ok(!errs.length, '1 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 2・3：戦い方ごと
  for (const pol of ['smart', 'stay']) {
    const { ctx, p, errs } = await open(0);
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(800);
    await p.evaluate(() => { window.__ev = []; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('save')) window.__ev.push('save'); if (n.id === 'saveHint') window.__ev.push('hint'); }))).observe(document.body, { childList: true, subtree: true }); });
    await p.click('#btnStart'); let t3 = null;
    for (let k = 0; k < 500; k++) { const st = await p.evaluate(() => ({ ph: window.__rb.phase, t: window.__rb.turn, tip: !document.getElementById('tip').hidden, rv: !document.getElementById('runv').hidden }));
      if (st.tip) { await p.evaluate(() => document.getElementById('tipOk').click()); continue; } if (st.rv || st.ph === 'over') break;
      if (st.ph === 'choose') { const o = await p.evaluate(() => { const R = window.__rb; return { sk: R.outlook(R.grid, false, false).hurt.some((h) => h.ko), rk: R.outlook(R.previewGrid(), true, true).hurt.some((h) => h.ko), dis: document.getElementById('btnRotate').disabled }; });
        if (st.t === 3 && !t3) { await p.waitForTimeout(600); t3 = Object.assign(o, { badge: await p.evaluate(() => !!document.querySelector('#ocStay b.ko')) }); }
        const rot = pol === 'smart' && o.sk && !o.rk && !o.dis; await p.click(rot ? '#btnRotate' : '#btnStay').catch(() => {}); await p.waitForTimeout(120); }
      await p.waitForTimeout(50); }
    await p.waitForFunction(() => !document.getElementById('runv').hidden, null, { timeout: 4000 }).catch(() => {});   // 決着の直後は勝利の画面が出る前のことがある（機械が遅いと不安定だった）
    const r = await p.evaluate(() => ({ fell: window.__rb.log.filter((l) => /が倒れた/.test(l)).length, ev: window.__ev, win: !document.getElementById('runv').hidden && /勝利/.test(document.getElementById('runv').innerText) }));
    if (pol === 'smart') ok(r.win && r.fell === 0 && r.ev.includes('hint') && r.ev.filter((x) => x === 'save').length >= 1, '2 「倒」を見て回す：勝利・倒れた ' + r.fell + '・演出 ' + JSON.stringify(r.ev));
    else ok(t3 && t3.sk && t3.badge && !t3.rk, '3 回さない：3ターン目の判断で維持に「倒」、回せば助かる ' + JSON.stringify(t3) + '（倒れた ' + r.fell + '）');
    ok(!errs.length, (pol === 'smart' ? '2' : '3') + ' ページのエラーなし ' + errs.join(' / ')); await ctx.close();
  }
  // 4：2回目の遠征
  { const { ctx, p, errs } = await open(1);
    const f = await p.evaluate(() => { const R = window.__rb.run, out = []; for (const id in R.map) { const n = window.__rb.ROUTE.nodes[id]; if (n && n.step === 1) out.push(R.map[id].foe); } return out; });
    ok(f.length && !f.includes('first'), '4 2回目の遠征の地点1は通常の敵 ' + JSON.stringify(f));
    ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
