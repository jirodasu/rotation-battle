// v5.8.6 倒れると決まっているときの「倒」の字、初戦ヒントのB案（?hint=b）。戦闘ロジック・数値は変えていない
// 合格の基準（測る前に決めたもの）：
//  1 初戦3ターン目：維持の札に「倒」の印が1つだけ付く（回すの札には付かない・重ねて出さない）。印は札の中に収まる（320・375・390px）
//  2 ヒント A案（標準）：「回せば、倒れずにすむ」。B案（?hint=b）：1回目「維持すると、サギリが倒れる」、2回目は「回す場合の結果も見てみよう」
//  3 「回す」の札の対象とHPの変わり方が、実際に押した結果と一致する（ランダムに戦って突き合わせる。運しだいの技のターンは除く）
//  ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  const open = async (w, h, q) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-teach-inc', '1'); localStorage.setItem('rb-teach-hold', '1'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage() + (q || '')); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    return { ctx, p, errs };
  };
  // 初戦の3ターン目まで「維持」で進め、そこで札とヒントを読む
  const toTurn3 = async (p) => {
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(800); await p.click('#btnStart');
    const seen = [];
    for (let k = 0; k < 400; k++) {
      const st = await p.evaluate(() => ({ ph: window.__rb.phase, t: window.__rb.turn, tip: !document.getElementById('tip').hidden }));
      if (st.tip) { await p.evaluate(() => document.getElementById('tipOk').click()); continue; }
      if (st.ph === 'over') break;
      if (st.ph === 'choose') {
        if (st.t >= 3) { await p.waitForTimeout(900); const h = await p.evaluate(() => { const e = document.getElementById('saveHint'); return e ? e.textContent : ''; }); return { t: st.t, hint: h }; }
        await p.click('#btnStay').catch(() => {}); await p.waitForTimeout(120);
      }
      await p.waitForTimeout(50);
    }
    return null;
  };
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const { ctx, p, errs } = await open(w, h);
    const r = await toTurn3(p);
    const m = await p.evaluate(() => { const o = (id) => { const b = document.querySelector('#' + id + ' b.ko'); if (!b) return null; const a = b.getBoundingClientRect(), c = b.closest('button').getBoundingClientRect(); return { chip: getComputedStyle(b, '::after').content, r: Math.round(c.right - a.right), l: Math.round(a.left - c.left) }; };
      return { stay: o('ocStay'), rot: o('ocRot') }; });
    ok(r && m.stay && m.stay.chip === '"倒"' && !m.rot && m.stay.l >= 0 && m.stay.r >= 0, w + '×' + h + ' 1 維持の札に「倒」の印が1つ、回すには付かない・札の中に収まる ' + JSON.stringify(m));
    ok(r && r.hint === '回せば、倒れずにすむ' || (r && /回せば、倒れずにすむ$/.test(r.hint)), w + '×' + h + ' 2 A案のヒント（' + (r && r.hint) + '）');
    ok(!errs.length, w + '×' + h + ' ページのエラーなし ' + errs.join(' / ')); await ctx.close();
  }
  { const { ctx, p, errs } = await open(390, 844, '?hint=b');
    const r = await toTurn3(p);
    ok(r && /維持すると、サギリが倒れる$/.test(r.hint), '2 B案（?hint=b）1回目：' + (r && r.hint));
    ok(!errs.length, 'B案 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 3 予告と実際の結果の突き合わせ（ランダムに戦う）
  { const { ctx, p, errs } = await open(390, 844);
    const bad = [], stat = { turns: 0, cmp: 0, ko: 0 };
    for (let n = 0; n < 8; n++) {
      await p.evaluate((n) => { const R = window.__rb; const ids = Object.keys(R.run.map).filter((id) => R.run.map[id].foe && R.routeChoice(id).type === 'battle'); const id = ids[n % ids.length]; const c = R.routeChoice(id);
        R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, R.run.map[id].foe); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, n);
      await p.waitForTimeout(250); await p.click('#btnStart');
      for (let t = 0; t < 40; t++) {
        let ph = ''; for (let i = 0; i < 400; i++) { ph = await p.evaluate(() => window.__rb.phase); if (ph === 'choose' || ph === 'over') break; await p.waitForTimeout(30); }
        if (ph !== 'choose') break;
        const tipOn = await p.evaluate(() => !document.getElementById('tip').hidden); if (tipOn) { await p.evaluate(() => document.getElementById('tipOk').click()); continue; }
        const snap = await p.evaluate((rot) => { const R = window.__rb; const useRot = rot && !document.getElementById('btnRotate').disabled;
          const L = useRot ? R.outlook(R.previewGrid(), true, true) : R.outlook(R.grid, false, false);
          const us = R.units().map((x) => x.u); window.__snap = { us, hp0: us.map((u) => u.hp), names: us.map((u) => u.name) };
          return { useRot, maybe: L.o.maybe, foeMaybe: L.foeMaybe, trio: !!R.enemy.party, hurt: L.hurt.map((h) => ({ n: h.n, d: h.d, heal: h.heal, ko: h.ko, hp: h.u.hp, max: h.u.max })), left: L.left, hp0: window.__snap.hp0, names: window.__snap.names }; }, Math.random() < 0.5);
        await p.click(snap.useRot ? '#btnRotate' : '#btnStay');
        for (let i = 0; i < 600; i++) { const ph2 = await p.evaluate(() => window.__rb.phase); if (ph2 === 'choose' || ph2 === 'over') break; await p.waitForTimeout(30); }
        const af = await p.evaluate(() => ({ hp1: window.__snap.us.map((u) => u.hp), foe1: window.__rb.enemy.party ? null : window.__rb.enemy.hp, ph: window.__rb.phase }));
        stat.turns++;
        if (!snap.trio && !snap.maybe && !snap.foeMaybe) {
          stat.cmp++;
          const won = af.ph === 'over';   // 勝った回は、戦闘のあとの回復が入るので、仲間のHPは比べない（敵の残りHPは比べる）
          snap.hurt.forEach((h) => { const i = snap.names.indexOf(h.n); if (i < 0 || won) return; const pred = Math.max(0, Math.min(h.max, h.hp + (h.heal || 0)) - h.d); if (h.ko) stat.ko++; if (af.hp1[i] !== pred && !(h.ko && af.hp1[i] <= 0)) bad.push(['ally', h.n, pred, af.hp1[i]]); });
          snap.names.forEach((nm, i) => { if (!won && !snap.hurt.some((h) => h.n === nm) && af.hp1[i] < snap.hp0[i]) bad.push(['unlisted', nm, snap.hp0[i], af.hp1[i]]); });
          if (af.foe1 != null && af.foe1 !== snap.left) bad.push(['foe', snap.left, af.foe1]);
        }
        if (af.ph === 'over') break;
      }
    }
    ok(bad.length === 0 && stat.cmp > 60, '3 予告（受けるダメージ・倒れる・敵の残りHP）と実際の結果が一致 ' + JSON.stringify(stat) + (bad.length ? ' 不一致 ' + JSON.stringify(bad.slice(0, 4)) : ''));
    ok(!errs.length, '3 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
