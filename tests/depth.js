// v5.2.0 遠征の「隊・深さ・実績・解禁」。
// 合格の基準（測る前に決めたもの）：
//  1. 何も開いていない新規のプレイヤーは、今までどおり準備画面なしでそのまま始まる（標準の隊・深さ1）
//  2. これまでに踏破している記録（clears≥1・best≥6）は、実績「初めての突破」「中盤まで」に数えられ、深さ2と速攻・堅守がはじめから開いている。双魔は未解禁
//  3. 出発の準備：隊（4枚）→深さ（2枚）の順。未解禁の札は押せない。隊を選び直せる。選んだとおりの隊・深さで始まる（職業の並びが隊と同じ）
//  4. 深さ2：戦闘の敵（章の主・最後・三位一体を除く）がすべて亜種。深さ1は従来の確率（全部が亜種にはならない）
//  5. 遠征の表示に深さ・隊が出る（標準の深さ1は何も足さない）。表紙には「深さNまで」が出る（N≥2のとき）
//  6. 踏破の結果：新しく満たした実績と、開いた深さ・隊が、結果の画面の先頭に出る。同じ実績は2度出ない。記録は rb-exp に残り、旧モードの rb-meta は触らない
//  7. 勲章は実績の数−使った数。3枚で双魔を開ける（開けると勲章は減る）。足りなければ押せない
//  8. 三位一体に勝つと実績「三位一体を討つ」
//  9. 古い保存（隊・深さの無い run）でも壊れず、標準・深さ1として扱う
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1}';
async function open(b, meta, w, h) {
  const ctx = await b.newContext({ viewport: { width: w || 393, height: h || 759 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); if (m && !sessionStorage.getItem('seeded')) { localStorage.setItem('rb-exp', m); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, [TIPS, meta ? JSON.stringify(meta) : null]);
  await p.goto(testPage()); await sleep(p, 300); await p.click('#cover').catch(() => {}); await sleep(p, 400);
  return { ctx, p };
}
const cards = (p) => p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => ({ t: c.querySelector('b').textContent, off: c.disabled, txt: c.textContent })));
const title = (p) => p.evaluate(() => document.getElementById('rvTitle').textContent);
(async () => {
  const b = await launch();
  // 1 新規
  { const { ctx, p } = await open(b, null);
    await p.click('#begin'); await sleep(p, 600);
    const s = await p.evaluate(() => ({ sq: window.__rb.run.sq, d: window.__rb.run.depth, t: document.getElementById('rvTitle').textContent, small: document.getElementById('rvSmall').textContent }));
    ok(s.sq === 'std' && s.d === 1 && /進む|主|最後/.test(s.t), '1 新規は準備画面なしでそのまま始まる ' + JSON.stringify(s));
    ok(!/深さ|（/.test(s.small), '5 標準・深さ1では、遠征の表示に深さ・隊を足さない ' + s.small);
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join('/')); await ctx.close(); }
  // 2〜5 16回突破済み
  { const { ctx, p } = await open(b, { runs: 20, clears: 16, best: 10 });
    ok(/突破 16回/.test(await p.evaluate(() => document.getElementById('beginSub').textContent)), '5 表紙：深さ1のみの記録では「深さNまで」を足さない');
    await p.click('#begin'); await sleep(p, 600);
    const c1 = await cards(p);
    ok(await title(p) === 'どの隊で下る？' && c1.length === 4, '3 出発の準備は隊の4枚 ' + c1.map((c) => c.t).join('/'));
    ok(!c1[0].off && !c1[1].off && !c1[2].off && c1[3].off, '2 標準・速攻・堅守がはじめから開き、双魔は未解禁で押せない ' + c1.map((c) => c.off).join('/'));
    await p.click('#rvCards .rv-card:nth-child(4)', { force: true }).catch(() => {}); await sleep(p, 200);
    ok(await title(p) === 'どの隊で下る？', '3 未解禁の札を押しても進まない');
    await p.click('#rvCards .rv-card:nth-child(3)'); await sleep(p, 500);
    const c2 = await cards(p);
    ok(await title(p) === 'どの深さへ？' && c2.length === 2 && !c2[0].off && !c2[1].off, '3 隊を選ぶと深さ（2枚・どちらも開いている）');
    await p.click('.rv-skip[data-i="-1"]'); await sleep(p, 400);
    ok(await title(p) === 'どの隊で下る？', '3 「隊を選び直す」で戻れる');
    await p.click('#rvCards .rv-card:nth-child(3)'); await sleep(p, 400); await p.click('#rvCards .rv-card:nth-child(2)'); await sleep(p, 700);
    const s = await p.evaluate(() => { const r = window.__rb.run, ids = Object.keys(r.map).filter((k) => r.map[k].foe !== undefined), last = Math.max(...ids.map((k) => window.__rb.ROUTE.nodes[k].step));
      const fights = ids.filter((k) => { const n = window.__rb.ROUTE.nodes[k]; return !window.__rb.expIsChief(n.step) && n.step !== last && r.map[k].foe !== 'trinity'; });
      return { sq: r.sq, d: r.depth, jobs: r.members.map((m) => m.job).join(','), small: document.getElementById('rvSmall').textContent, n: fights.length, nov: fights.filter((k) => !r.map[k].variant).length }; });
    ok(s.sq === 'guard' && s.d === 2 && s.jobs === 'knight,knight,witch,monk', '3 選んだ隊・深さで始まる（職業が隊と同じ） ' + JSON.stringify([s.sq, s.d, s.jobs]));
    ok(s.n > 0 && s.nov === 0, '4 深さ2：章の主・最後・三位一体を除く戦闘は全部が亜種 ' + s.n + '戦中、亜種なし' + s.nov);
    ok(/深さ2・堅守/.test(s.small), '5 遠征の表示に「深さ2・堅守」が出る ' + s.small);
    // 深さ1（別の乱数で複数回）：全部が亜種にはならない
    let anyPlain = false; for (let k = 0; k < 12 && !anyPlain; k++) { anyPlain = await p.evaluate(() => { window.__rb.run.depth = 1; const m = window.__rb.expFill(), r = window.__rb.run; return Object.keys(m).some((id) => m[id].foe !== undefined && m[id].foe !== 'trinity' && m[id].foe !== 'chief' && !m[id].variant); }); }
    ok(anyPlain, '4 深さ1は従来の確率：亜種が出ない戦闘もある');
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join('/')); await ctx.close(); }
  // 6 踏破の結果と記録
  { const { ctx, p } = await open(b, null);
    await p.evaluate(() => localStorage.setItem('rb-meta', '{"runs":9}'));
    await p.click('#begin'); await sleep(p, 600);
    await p.evaluate(() => window.__rb.expEnd(true, [])); await sleep(p, 500);
    const ev = await p.evaluate(() => document.getElementById('rvEvents').innerText);
    ok(/「中盤まで」/.test(ev) && /「初めての突破」/.test(ev) && /「誰も欠けず」/.test(ev) && /深さ2/.test(ev) && /速攻の隊/.test(ev) && /堅守の隊/.test(ev), '6 新しく満たした実績と、開いた深さ・隊が結果に出る ' + ev.replace(/\s+/g, ' '));
    const m = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-exp')));
    ok(m.ach.first && m.ach.mid && m.ach.nofall && m.won['std:1'] === 1 && m.clears === 1 && m.hist[0].sq === 'std' && m.hist[0].depth === 1, '6 記録が rb-exp に残る ' + JSON.stringify(m.ach));
    ok(await p.evaluate(() => localStorage.getItem('rb-meta')) === '{"runs":9}', '6 旧モードの記録（rb-meta）は触らない');
    ok(/深さ2まで|突破 1回/.test(await p.evaluate(() => document.getElementById('beginSub').textContent)), '5 表紙の突破回数が更新される');
    const cs = await cards(p);
    ok(cs.length === 1 && /もう一度/.test(cs[0].t) && await p.evaluate(() => !!document.querySelector('.rv-aux')), '6 結果：もう一度の札と、隊と深さを選ぶ副ボタン');
    await p.click('.rv-aux'); await sleep(p, 400);
    ok(await title(p) === 'どの隊で下る？', '6 「隊と深さを選ぶ」で出発の準備へ');
    // 7 勲章：3枚で双魔
    const c = await cards(p);
    ok(!c[3].off && /勲章3枚/.test(c[3].txt) && /勲章 3枚/.test(await p.evaluate(() => document.getElementById('rvSmall').textContent)), '7 実績3つ＝勲章3枚。双魔は勲章で開けられる');
    await p.click('#rvCards .rv-card:nth-child(4)'); await sleep(p, 400);
    const m2 = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-exp')));
    ok(m2.bought.twin === 1 && m2.spent === 3 && /勲章 0枚/.test(await p.evaluate(() => document.getElementById('rvSmall').textContent)), '7 双魔を勲章で開けると、勲章が3枚減る ' + JSON.stringify([m2.bought, m2.spent]));
    // 同じ実績は2度出ない
    await p.click('#rvCards .rv-card:nth-child(1)'); await sleep(p, 300); await p.click('#rvCards .rv-card:nth-child(1)'); await sleep(p, 600);
    await p.evaluate(() => window.__rb.expEnd(true, [])); await sleep(p, 500);
    ok(!/実績 「|勲章\+/.test(await p.evaluate(() => document.getElementById('rvEvents').innerText)), '6 同じ実績は2度出ない');
    ok(/深さ2まで/.test(await p.evaluate(() => document.getElementById('beginSub').textContent)) === false, '5 深さ2の踏破はまだ無いので、表紙は深さ1のまま');
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join('/')); await ctx.close(); }
  // 7 勲章が足りないと押せない／5 深さ2踏破で表紙に出る
  { const { ctx, p } = await open(b, { runs: 2, clears: 1, best: 10, won: { 'std:2': 1 } });
    ok(/深さ2まで/.test(await p.evaluate(() => document.getElementById('beginSub').textContent)), '5 深さ2を踏破していると、表紙に「深さ2まで」が出る');
    await p.click('#begin'); await sleep(p, 500);
    const c = await cards(p);
    ok(c[3].off, '7 勲章が2枚のときは双魔を押せない'); ok(!p.__errs.length, 'エラーなし ' + p.__errs.join('/')); await ctx.close(); }
  // 8 三位一体を討つ／9 古い保存
  { const { ctx, p } = await open(b, null);
    await p.click('#begin'); await sleep(p, 600);
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(R.TRI.steps[0], null, 'trinity'); R.expAfterBattle(true); });
    ok(await p.evaluate(() => window.__rb.run.triWon === true), '8 三位一体に勝つと記録される');
    await p.evaluate(() => window.__rb.expEnd(false, [])); await sleep(p, 500);
    ok(/「三位一体を討つ」/.test(await p.evaluate(() => document.getElementById('rvEvents').innerText)), '8 負けた遠征でも、実績「三位一体を討つ」が取れる');
    await p.evaluate(() => { const R = window.__rb; delete R.run.sq; delete R.run.depth; });
    const t = await p.evaluate(() => { try { return window.__rb.expEnemy(1, null, 0).name; } catch (e) { return 'ERR ' + e.message; } });
    ok(!/ERR/.test(t), '9 隊・深さの無い古い run でも敵が作れる ' + t);
    ok(!p.__errs.length, 'エラーなし ' + p.__errs.join('/')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
