// v5.1.42 戦闘の途中保存。
// 合格の基準（測る前に決めたもの）：
//  1. 戦闘中は、回す・維持を選ぶ場面ごとに保存され、表紙の「続きから」に「戦闘中（ターンn）」と出る
//  2. 選ぶ場面で閉じて再開すると、同じ戦闘の同じ場面に戻る（ターン・気力・仲間のHPと気力・並び・敵のHP・ため・三位一体の各体・攻撃対象が一致）
//  3. 選んだ直後（演出の途中）に閉じて再開すると、選んだ手のまま進む。最後まで閉じずに遊んだ場合と、
//     決着・ターン数・仲間と敵の残りHPが一致する（ランダム攻撃のない敵／三位一体の2種類で、毎ターン閉じる）
//  4. 勝った直後に閉じて再開すると、勝利画面に戻る。報酬の候補は閉じなかった場合と同じ。名声・通った道は二重にならない
//  5. 負けた直後に閉じて再開すると、全滅の画面に戻り、「遠征の結果へ」で遠征が終わって保存が消える
//  6. 戦闘を含まない以前の保存は、従来どおり地図から再開できる。チュートリアルは戦闘を保存しない
//  7. どの場合もページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1}';
let b;
async function page(w, h) {
  const ctx = await b.newContext({ viewport: { width: w || 844, height: h || 390 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript((t) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-fast', '1'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, TIPS_ALL);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250);
  return { ctx, p };
}
const ST = () => ({ res: !document.getElementById('result').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden, dis: document.getElementById('btnRotate').disabled, rv: !document.getElementById('runv').hidden });
async function waitStable(p) {
  for (let i = 0; i < 600; i++) { const s = await p.evaluate(ST); if (s.tip) { await p.click('#tipOk').catch(() => {}); continue; } if (s.res || s.prep || s.choose || s.rv) return s; await p.waitForTimeout(30); }
  return p.evaluate(ST);
}
// 戦闘に入る：地図の戦闘の中身を foe にして選ぶ
async function enter(p, foe, step) {
  await p.click('#begin'); await p.waitForTimeout(500);
  if (await p.evaluate(() => !document.getElementById('newConf').hidden)) { await p.waitForTimeout(500); await p.click('#ncGo'); await p.waitForTimeout(500); }
  await p.evaluate(([foe, step]) => { const R = window.__rb, c = R.run.choices.find((x) => x.type === 'battle'); R.run.map[c.rid] = { foe, variant: null };
    if (step) { R.run.members.forEach((m) => { m.up = { atk: 7, guard: 7, heal: 8, teamGuard: 2 }; R.applyAge(m, true); }); } }, [foe, step]);
  const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(600);
  return waitStable(p);
}
const snap = () => { const R = window.__rb, e = R.enemy;
  return { turn: R.turn, gauge: R.gauge, phase: R.phase, tgt: R.tgtId, grid: R.grid.map((r) => r.map((u) => (u ? u.name + ':' + u.hp + '/' + u.sta + (u.defReady ? 'D' : '') + (u.atkReady ? 'A' : '') : '-')).join(',')).join('|'),
    enemy: e.party ? e.party.map((f) => f.id + f.hp + (f.charged ? 'c' : '') + 'd' + (f.defUp || 0) + 'n' + (f.defNext || 0)).join(',') : e.name + e.hp + (e.charged ? 'c' : '') + (e.bound ? 'b' : ''),
    members: R.run.members.map((m) => m.name + m.hp).join(',') }; };
async function reloadResume(p) {
  await p.reload(); await p.waitForTimeout(300); if (await p.evaluate(() => !document.getElementById('cover').classList.contains('revealed'))) await p.click('#cover'); await p.waitForTimeout(250);
  const sub = await p.evaluate(() => (document.getElementById('resume').hidden ? null : document.getElementById('resumeSub').textContent));
  if (sub != null) { await p.click('#resume'); await p.waitForTimeout(400); }
  return sub;
}
// 決まった手順で最後まで（seq は回すかどうかの並び。押せないときは維持）。cut=true なら毎ターン、選んだ直後に閉じて再開する
async function play(foe, seq, cut, step) {
  const { ctx, p } = await page();
  await enter(p, foe, step);
  let t = 0, subs = [];
  for (let i = 0; i < 400; i++) {
    const s = await waitStable(p);
    if (s.res) break;
    if (s.prep) { await p.click('#btnStart'); if (cut) { await p.waitForTimeout(60); subs.push(await reloadResume(p)); } continue; }
    if (s.choose) { const rot = seq[t++ % seq.length] && !s.dis; await p.click(rot ? '#btnRotate' : '#btnStay'); if (cut) { await p.waitForTimeout(80); subs.push(await reloadResume(p)); } continue; }
  }
  const out = await p.evaluate(() => ({ title: document.getElementById('rTitle').textContent, turn: window.__rb.turn, members: window.__rb.run.members.map((m) => m.name + m.hp).join(','), enemy: window.__rb.enemy.party ? window.__rb.enemy.party.map((f) => f.hp).join('/') : window.__rb.enemy.hp }));
  out.errs = p.__errs.slice(); out.subs = subs;
  await ctx.close();
  return out;
}
(async () => {
  b = await launch();

  /* ---- 1・2. 選ぶ場面で閉じる ---- */
  for (const [foe, step] of [[1, 0], ['trinity', 1]]) {
    const { ctx, p } = await page();
    await enter(p, foe, step);
    await p.click('#btnStart'); await waitStable(p);
    await p.click('#btnRotate'); await waitStable(p);
    await p.click('#btnStay'); await waitStable(p);
    if (foe === 'trinity') { await p.evaluate(() => { const R = window.__rb, f = R.enemy.party.find((x) => x.hp > 0 && x.id !== 'statue'); if (f) R.pickTarget(f.id); }); }
    const before = await p.evaluate(snap);
    const saved = await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); return o.battle && { at: o.battle.at, commit: o.battle.commit, turn: o.battle.turn }; });
    const sub = await reloadResume(p);
    await waitStable(p);
    const after = await p.evaluate(snap);
    ok(saved && saved.at === 'choose' && !saved.commit && /戦闘中（ターン\d+）/.test(sub || ''), '[' + foe + '] 選ぶ場面で保存され、表紙に「' + sub + '」');
    const same = JSON.stringify(before) === JSON.stringify(after);
    ok(same && after.phase === 'choose', '[' + foe + '] 閉じて再開すると同じ場面に戻る' + (same ? '' : ' ' + JSON.stringify({ before, after })));
    ok(!p.__errs.length, '[' + foe + '] ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  /* ---- 3. 選んだ直後に閉じても、選んだ手のまま進む ---- */
  for (const [foe, seq, step] of [[1, [1, 0, 0, 1, 0, 1, 0, 0], 0], ['trinity', [0, 1, 0, 0, 1, 0], 1]]) {
    const A = await play(foe, seq, false, step), B = await play(foe, seq, true, step);
    const same = A.title === B.title && A.turn === B.turn && A.members === B.members && String(A.enemy) === String(B.enemy);
    ok(same, '[' + foe + '] 毎ターン閉じて再開しても、閉じなかった場合と同じ結末（' + A.title + '・' + A.turn + 'ターン・' + A.members + '）' + (same ? '' : ' 閉じた場合 ' + JSON.stringify(B)));
    ok(B.subs.length >= 3 && B.subs.every((x) => /戦闘中/.test(x || '')), '[' + foe + '] 再開は毎回「戦闘中」から（' + B.subs.length + '回）');
    ok(!A.errs.length && !B.errs.length, '[' + foe + '] ページのエラーなし ' + A.errs.concat(B.errs).join(' / '));
  }

  /* ---- 4. 勝った直後に閉じる ---- */
  {
    const run = async (cut) => {
      const { ctx, p } = await page();
      await enter(p, 0, 0);
      await p.evaluate(() => { const R = window.__rb; R.run.members.forEach((m) => { m.atk = 99; }); R.enemy.hp = 5; R.render(); });
      await p.click('#btnStart');
      let s; for (let i = 0; i < 100; i++) { s = await waitStable(p); if (s.res) break; if (s.choose) await p.click('#btnStay'); }
      const fame0 = await p.evaluate(() => window.__rb.run.fame);
      let sub = null;
      if (cut) { sub = await reloadResume(p); await p.waitForTimeout(600); }
      const res = await p.evaluate(() => ({ shown: !document.getElementById('result').hidden, title: document.getElementById('rTitle').textContent, fame: window.__rb.run.fame }));
      await p.click('#next'); await p.waitForTimeout(500);
      const cards = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card b')].map((e) => e.textContent).join(' / '));
      await p.click('#rvCards .rv-card[data-i="2"]').catch(() => {}); await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(600);
      const after = await p.evaluate(() => ({ node: window.__rb.run.node, path: (window.__rb.run.path || []).length, fame: window.__rb.run.fame, battle: !!JSON.parse(localStorage.getItem('rb-exp-save')).battle, title: document.getElementById('rvTitle').textContent }));
      const errs = p.__errs.slice(); await ctx.close();
      return { sub, res, cards, after, fame0, errs };
    };
    const A = await run(false), B = await run(true);
    ok(/戦闘のあと/.test(B.sub || '') && B.res.shown && B.res.title === '勝利', '勝った直後に閉じて再開すると、勝利画面に戻る（' + B.sub + '）');
    ok(A.cards === B.cards && A.cards.length > 0, '報酬の候補は閉じなかった場合と同じ（' + B.cards + '）');
    ok(A.after.fame === B.after.fame && A.after.node === B.after.node && A.after.path === B.after.path && B.after.path === B.after.node, '名声・地点・通った道が二重にならない ' + JSON.stringify({ A: A.after, B: B.after }));
    ok(!B.after.battle, '地図に戻ると、保存から戦闘が消える');
    ok(!A.errs.length && !B.errs.length, 'ページのエラーなし ' + A.errs.concat(B.errs).join(' / '));
  }

  /* ---- 5. 負けた直後に閉じる ---- */
  {
    const { ctx, p } = await page();
    await enter(p, 0, 0);
    await p.evaluate(() => { const R = window.__rb; R.run.members.forEach((m) => { m.hp = 1; }); R.enemy.hp = 999; R.render(); });
    await p.click('#btnStart');
    let s; for (let i = 0; i < 100; i++) { s = await waitStable(p); if (s.res) break; if (s.choose) await p.click('#btnStay'); }
    const t0 = await p.evaluate(() => document.getElementById('rTitle').textContent);
    await reloadResume(p); await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ shown: !document.getElementById('result').hidden, title: document.getElementById('rTitle').textContent, next: document.getElementById('next').textContent }));
    ok(t0 === '全滅' && r.shown && r.title === '全滅' && /遠征の結果へ/.test(r.next), '負けた直後に閉じて再開すると、全滅の画面に戻る');
    await p.click('#next'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !localStorage.getItem('rb-exp-save') && /途絶え/.test(document.getElementById('rvTitle').textContent)), '「遠征の結果へ」で遠征が終わり、保存が消える');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  /* ---- 6. 以前の保存・チュートリアル ---- */
  {
    const { ctx, p } = await page();
    await p.click('#begin'); await p.waitForTimeout(500);
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); delete o.battle; o.v = '5.1.40'; o.run.node = 1; localStorage.setItem('rb-exp-save', JSON.stringify(o)); });
    const sub = await reloadResume(p); await p.waitForTimeout(300);
    ok(!/戦闘/.test(sub || '') && await p.evaluate(() => !document.getElementById('runv').hidden && window.__rb.phase === 'map'), '戦闘を含まない以前の保存は、地図から再開（' + sub + '）');
    await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(300);
    const s0 = await p.evaluate(() => localStorage.getItem('rb-exp-save'));
    await p.click('#beginTut'); await p.waitForTimeout(900);
    await p.evaluate(() => { const t = document.getElementById('btnStart'); if (!t.hidden) t.click(); }); await p.waitForTimeout(1500);
    ok(await p.evaluate((s0) => localStorage.getItem('rb-exp-save') === s0, s0), 'チュートリアルの戦闘は保存に書かない');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  await b.close();
  console.log(fails ? '\n失敗 ' + fails : '\nすべて合格');
  process.exit(fails ? 1 : 0);
})();
