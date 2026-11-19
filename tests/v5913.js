// v5.9.13 補助・前後効果の見せ方（ハイブリッド版）
// 合格の基準（測る前に決めたもの）：
//  1. 線＝解決条件（両プラン）：維持では、攻撃補助の線がある列＝剣の数字が補助込みの列、防御補助の線がある列＝予告の内訳で「防」が効く列。
//     回すでは、前後効果（喝・祝福）の線は fxList と一致し、量は解決側の計算（incoming・startHp）の差と同じ
//  2. 効果ゼロなら線なし：攻撃が来ないターンは「喝」の線なし。HPが満タンなら「祝福」の線なし
//  3. 使い切った補助は線も札も出さない。効く補助の札の下に「あと1回」（12px以上）
//  4. 変化点：プランを切り替えた直後は、増えた効果だけを解決順に演出する。変化が無い描き直しでは演出しない。タップで残りをまとめて出す
//  5. ミニ窓：枠光のマスからだけ開く。中身は fxList の量と一致。盤の中に収まり、回す／維持のボタンを隠さない。プラン切替で閉じる
//  6. 剣の数字のタップ：内訳の合計＝剣の数字（攻撃時の hitText と同じ書き方）
//  7. 320/375/390：前後効果の線が HPバー・名前・数字と重ならない。スクリーンショットを残す。ページのエラーなし
const { launch, testPage, OUT } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const fr = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const init = () => { try { localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); for (const k of ['rb-story', 'rb-ending', 'rb-story2', 'rb-firstmap']) localStorage.setItem(k, '1'); } catch (e) { /* */ } };
// 騎士・戦士（攻撃列）、神官・僧侶（補助列）。回すと神官と僧侶が攻撃列に入り、祝福と喝が出る
async function setup(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(init);
  await p.goto(testPage()); await p.addStyleTag({ content: '.rb-bubble{display:none!important}' }); await p.waitForTimeout(300); await p.click('#cover').catch(() => {}); await p.waitForTimeout(400);
  await p.evaluate(() => { const R = window.__rb; R.beginExp('std', 1);
    const mk = (id, r, c) => { const m = R.newMember(id, 20); m.r = r; m.c = c; return m; };
    R.run.members.length = 0; [mk('knight', 0, 0), mk('warrior', 0, 1), mk('cleric', 1, 0), mk('monk', 1, 1)].forEach((m) => R.run.members.push(m));
    R.run.members.forEach((m) => { m.max = 200; m.hp = 200; if (m.id === 'cleric' || m.id === 'monk') m.hp = 180; });
    const c = R.run.choices.find((x) => x.type === 'battle'); R.run.enemy = R.expEnemy(c.step, null, 1); R.run.enemy.hp = R.run.enemy.max = 999;
    document.getElementById('runv').hidden = true; R.toPrepForTest();
    const g = R.grid; for (let r = 0; r < 3; r++) for (let cc = 0; cc < g[r].length; cc++) g[r][cc] = null; R.run.members.forEach((m) => { g[m.r][m.c] = m; }); R.render(); });
  await p.waitForTimeout(400);
  await p.click('#btnStart');
  for (let k = 0; k < 300; k++) { if (await p.evaluate(() => window.__rb.phase) === 'choose') break; if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(60); }
  await p.waitForTimeout(1700); await fr(p);
  return { ctx, p, errs };
}
// 回すプランで攻撃列（神官・僧侶）に攻撃が来るターンにする
const hitTurn = (p) => p.evaluate(() => { const R = window.__rb; for (let t = 1; t <= 16; t++) { R.setTurn(t); const g = R.previewGrid(), inc = R.incoming(g, true, true); if (inc['0,0'] && inc['0,1']) return t; } return 0; });
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 812], [320, 568]]) {
    const tag = w + '×' + h;
    const { ctx, p, errs } = await setup(b, w, h);
    const t = await hitTurn(p);
    ok(t > 0, tag + ' 準備：回すと攻撃列の2人に攻撃が来るターン ' + t);
    // 1 維持：補助の線＝解決条件
    await p.evaluate(() => { const R = window.__rb; R.grid[1].forEach((u) => { if (u) { u.atkReady = true; u.defReady = true; } }); R.setPreview(false); }); await fr(p); await p.waitForTimeout(150);
    const s1 = await p.evaluate(() => { const R = window.__rb, g = R.grid, inc = R.incoming(g, false, false), o = [];
      for (let c = 0; c < g[1].length; c++) { const m = g[1][c]; if (!m || !g[0][c]) continue;
        if (m.atkSup > 0) o.push({ c, k: 'a', line: !!document.querySelector('#fxLn .sa.a[data-c="' + c + '"]'), want: !!document.querySelector('.slot[data-r="0"][data-c="' + c + '"] .dm.buf') });
        if (m.defSup > 0) o.push({ c, k: 'd', line: !!document.querySelector('#fxLn .sa.d[data-c="' + c + '"]'), want: inc.per.some((x) => x.c === c && x.why === '防') }); }
      return o; });
    ok(s1.length > 0 && s1.every((x) => x.line === x.want), tag + ' 1 維持：補助の線＝解決で効く列 ' + JSON.stringify(s1));
    // 1 回す：前後効果の線と量
    await p.evaluate(() => { window.__rb.setGauge(3); window.__rb.setPreview(true); }); await fr(p); await p.waitForTimeout(200);
    const s1r = await p.evaluate(() => { const R = window.__rb, g = R.previewGrid(), L = R.fxList('rot'), inc = R.incoming(g, true, true), bad = [];
      const rel = L.filter((x) => x.from && x.from.u !== x.to.u && x.step !== 'sup'), drawn = [...document.querySelectorAll('#fxLn .rel')].map((e) => e.dataset.key).join(' ').split(' ').filter(Boolean);
      rel.forEach((x) => { if (!drawn.includes(x.key)) bad.push('線なし ' + x.key); });
      drawn.forEach((k) => { if (!rel.some((x) => x.key === k)) bad.push('余分 ' + k); });
      // 量：喝は、その技を外したときとの差、祝福は、敵が動く前のHPとの差
      L.filter((x) => x.k === 'team').forEach((x) => { const m = x.from.u, e = m.entry; m.entry = null; const i0 = R.incoming(g, true, true); m.entry = e; const k = '0,' + x.to.c, n = inc.per.filter((y) => y.r == null && y.c === x.to.c).length, diff = i0[k].d - inc[k].d; if (diff !== e.teamGuard * n) bad.push('喝の量 ' + diff + '≠' + e.teamGuard * n); if (x.amt.indexOf('−' + e.teamGuard) < 0) bad.push('喝の表示 ' + x.amt); });
      L.filter((x) => x.k === 'heal').forEach((x) => { const gain = inc.start.get(x.to.u) - x.to.u.hp; if (x.amt !== 'HP +' + gain) bad.push('祝福 ' + x.amt + '≠' + gain); });
      return { n: rel.length, kinds: [...new Set(L.map((x) => x.k))].join(), bad, rcv: [...document.querySelectorAll('.slot.fx-rcv')].length }; });
    ok(s1r.n >= 2 && /team/.test(s1r.kinds) && /heal/.test(s1r.kinds) && !s1r.bad.length, tag + ' 1 回す：前後効果の線＝fxList、量＝解決側の差 ' + JSON.stringify(s1r));
    // 4 プラン切替直後の演出：増えた効果を解決順に
    const s4 = await p.evaluate(() => window.__fxLast || []);
    const ord = s4.map((x) => x.split(':')[1]), rank = { atk: 0, def: 0, team: 1, guard: 1, entry: 2, shield: 3, veil: 3, heal: 4 };
    ok(s4.length > 0 && ord.every((k, i) => i === 0 || rank[ord[i - 1]] <= rank[k]), tag + ' 4 回すへの切替で、変化点だけ解決順に演出 ' + JSON.stringify(s4));
    // 4 変化の無い描き直しでは演出しない
    const s4b = await p.evaluate(async () => { const R = window.__rb; await new Promise((r) => setTimeout(r, 1700)); window.__fxLast = 'x'; R.render(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); R.render(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return { last: window.__fxLast, seq: !!R.fxSeq }; });
    ok(s4b.last === 'x' && !s4b.seq, tag + ' 4 変化が無ければ演出なし ' + JSON.stringify(s4b));
    // 4 タップで残りをまとめて出す（入力は止めない：pointerdown を奪わない）
    const s4c = await p.evaluate(async () => { const R = window.__rb, fr2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      R.setPreview(false); await fr2(); R.setPreview(true); await fr2(); const was = !!R.fxSeq;
      let got = false; const h = () => { got = true; }; document.getElementById('stage').addEventListener('pointerdown', h);
      document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.getElementById('stage').removeEventListener('pointerdown', h);
      await fr2(); const L = document.querySelectorAll('#fxLn .grow .bd'); const done = [...L].every((l) => Math.abs(parseFloat(getComputedStyle(l).strokeDashoffset) || 0) < 0.01);
      return { was, now: !!R.fxSeq, skip: document.getElementById('fxLn').classList.contains('skip'), passed: got, done, n: L.length }; });
    ok(s4c.was && !s4c.now && s4c.skip && s4c.passed && s4c.done, tag + ' 4 タップで全表示・タップは下へ通る ' + JSON.stringify(s4c));
    // 5 ミニ窓
    await p.waitForTimeout(300);
    const rc = await p.evaluate(() => { const e = document.querySelector('.slot.fx-rcv'); return e ? [+e.dataset.r, +e.dataset.c] : null; });
    if (rc) {
      await p.click('.slot[data-r="' + rc[0] + '"][data-c="' + rc[1] + '"] .disc', { force: true }); await p.waitForTimeout(250);
      const s5 = await p.evaluate((rc) => { const R = window.__rb, w = document.getElementById('fxWin'); if (!w) return null; const L = R.fxList('rot').filter((x) => x.to.r === rc[0] && x.to.c === rc[1] && (x.from && x.from.u !== x.to.u || /guard|heal|relic/.test(x.step)));
        const wr = w.getBoundingClientRect(), br = document.getElementById('board').getBoundingClientRect(), hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
        return { txt: w.innerText, all: L.every((x) => w.innerText.includes(x.amt) && w.innerText.includes(x.name)), n: L.length, inBoard: wr.left >= br.left - 1 && wr.right <= br.right + 1 && wr.top >= br.top - 1 && wr.bottom <= br.bottom + 1, dock: ['btnRotate', 'btnStay'].some((id) => { const e = document.getElementById(id); return e && !e.hidden && hit(wr, e.getBoundingClientRect()); }) }; }, rc);
      ok(s5 && s5.n > 0 && s5.all && s5.inBoard && !s5.dock, tag + ' 5 枠光のマスで窓：中身一致・盤の中・ボタンを隠さない ' + JSON.stringify(s5 && Object.assign({}, s5, { txt: s5.txt.replace(/\n+/g, '／') })));
      await p.screenshot({ path: path.join(OUT, 'v5913-win-' + w + '.png') });
      // プラン切替で閉じる
      await p.evaluate(() => window.__rb.setPreview(false)); await fr(p); await p.waitForTimeout(100);
      ok(await p.evaluate(() => !document.getElementById('fxWin')), tag + ' 5 プランを切り替えると窓は閉じる');
      await p.evaluate(() => window.__rb.setPreview(true)); await fr(p); await p.waitForTimeout(1700);
    } else ok(false, tag + ' 5 枠光のマスが無い');
    // 5 枠光の無いマスでは開かない（回復列の騎士）
    const nr = await p.evaluate(() => { const e = [...document.querySelectorAll('.slot')].find((s) => !s.classList.contains('fx-rcv') && s.querySelector('.disc')); return e ? [+e.dataset.r, +e.dataset.c] : null; });
    if (nr) { await p.click('.slot[data-r="' + nr[0] + '"][data-c="' + nr[1] + '"] .disc', { force: true }); await p.waitForTimeout(200); ok(await p.evaluate(() => !document.getElementById('fxWin')), tag + ' 5 枠光の無いマスでは窓は開かない ' + nr); }
    // 6 剣の数字の内訳
    await p.evaluate(() => { const R = window.__rb; R.setPreview(false); }); await fr(p); await p.waitForTimeout(150);
    const dmSel = await p.evaluate(() => { const e = document.querySelector('.slot[data-r="0"] .dm'); const s = e && e.closest('.slot'); return s ? '.slot[data-r="0"][data-c="' + s.dataset.c + '"] .dm' : null; });
    if (dmSel) {
      await p.click(dmSel, { force: true }); await p.waitForTimeout(200);
      const s6 = await p.evaluate((sel) => { const w = document.getElementById('fxWin'), n = +document.querySelector(sel).textContent.replace(/\D/g, ''); return w ? { tot: +(w.querySelector('.fw-tot b') || {}).textContent, n, bd: w.querySelector('.fw-bd').textContent, kind: w.dataset.kind } : null; }, dmSel);
      ok(s6 && s6.kind === 'dmg' && s6.tot === s6.n && /－ 防御/.test(s6.bd), tag + ' 6 剣の数字のタップで内訳。合計＝剣の数字 ' + JSON.stringify(s6));
      await p.click('.rail.r2', { force: true }).catch(() => {}); await p.waitForTimeout(150);
      ok(await p.evaluate(() => !document.getElementById('fxWin')), tag + ' 5 外をタップすると閉じる');
    } else ok(false, tag + ' 6 剣の数字が無い');
    // 3 使い切り・あと1回
    const s3 = await p.evaluate(async () => { const R = window.__rb, g = R.grid, fr2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); R.setPreview(false); await fr2();
      const c = g[1].findIndex((u, i) => u && u.atkSup > 0 && g[0][i]); if (c < 0) return null; const m = g[1][c];
      m.atkReady = true; R.render(); await fr2(); const bOn = document.querySelector('#supAr .sa.a[data-c="' + c + '"]'), once = bOn && bOn.querySelector('.once text'), fs = once ? parseFloat(once.getAttribute('font-size')) : 0, txt = once ? once.textContent : '';
      m.atkReady = false; R.render(); await fr2(); const gone = !document.querySelector('#supAr .sa.a[data-c="' + c + '"]') && !document.querySelector('#fxLn .sa.a[data-c="' + c + '"]') && !document.querySelector('#fxLn .ds, #supAr .off');
      m.atkReady = true; R.render(); return { c, txt, fs, gone }; });
    ok(s3 && s3.txt === 'あと1回' && s3.fs >= 12 && s3.gone, tag + ' 3 効く補助に「あと1回」（12px以上）、使い切ると線も札も無い ' + JSON.stringify(s3));
    // 2 効果ゼロなら線なし
    const s2 = await p.evaluate(async () => { const R = window.__rb, fr2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      let t0 = 0; for (let t = 1; t <= 16; t++) { R.setTurn(t); const inc = R.incoming(R.previewGrid(), true, true); if (!inc['0,0'] && !inc['0,1']) { t0 = t; break; } }
      const ms = R.run.members.filter((m) => m.id === 'cleric' || m.id === 'monk'), keep = ms.map((m) => m.hp); ms.forEach((m) => { m.hp = m.max; });
      R.setPreview(true); await fr2(); await new Promise((r) => setTimeout(r, 50)); const L = R.fxList('rot'), rel = document.querySelectorAll('#fxLn .rel').length;
      ms.forEach((m, i) => { m.hp = keep[i]; }); R.setPreview(false); return { t0, team: L.filter((x) => x.k === 'team').length, heal: L.filter((x) => x.k === 'heal').length, rel }; });
    ok((s2.t0 ? s2.team === 0 : true) && s2.heal === 0 && (s2.t0 ? s2.rel === 0 : true), tag + ' 2 攻撃が来ない・HP満タンなら線なし ' + JSON.stringify(s2));
    // 7 重なり：前後効果の線は、HPバー・名前・数字と重ならない
    await p.evaluate((t) => { const R = window.__rb; R.setTurn(t); R.setPreview(true); }, t); await fr(p); await p.waitForTimeout(1700);
    const s7 = await p.evaluate(() => { const bad = [], hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
      const ls = [...document.querySelectorAll('#fxLn .rel .bd')].map((l) => l.getBoundingClientRect());
      const obs = [...document.querySelectorAll('#board .hpb, #board .nm, #board .dm, #board .inc')].map((e) => e.getBoundingClientRect());
      ls.forEach((l, i) => obs.forEach((o) => { if (hit({ left: l.left, right: l.right, top: l.top - 1, bottom: l.bottom + 1 }, o)) bad.push(i); }));
      return { n: ls.length, bad: bad.length }; });
    ok(s7.n > 0 && s7.bad === 0, tag + ' 7 前後効果の線はHPバー・名前・数字と重ならない ' + JSON.stringify(s7));
    await p.screenshot({ path: path.join(OUT, 'v5913-rot-' + w + '.png') });
    await p.evaluate(() => window.__rb.setPreview(false)); await fr(p); await p.waitForTimeout(1700);
    await p.screenshot({ path: path.join(OUT, 'v5913-stay-' + w + '.png') });
    // 4 ターンの変わり目：維持で攻撃補助を使ったら「使い切り」を演出し、次のターンの線と札は消える
    await p.evaluate(() => { const R = window.__rb; R.grid[1].forEach((u) => { if (u) u.atkReady = true; }); R.render(); window.__fxLast = null; }); await fr(p); await p.waitForTimeout(200);
    await p.evaluate(() => document.getElementById('btnStay').click());
    for (let k = 0; k < 400; k++) { await p.waitForTimeout(60); if (await p.evaluate(() => window.__rb.phase === 'choose' && window.__fxLast !== null)) break; }
    await fr(p);
    const s4d = await p.evaluate(() => ({ last: window.__fxLast, a: document.querySelectorAll('#supAr .sa.a').length }));
    ok(Array.isArray(s4d.last) && s4d.last.some((x) => /^used:atk:/.test(x)) && s4d.a === 0, tag + ' 4 次のターン：使い切った攻撃補助を演出し、線と札は消える ' + JSON.stringify(s4d));
    ok(!errs.length, tag + ' ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
