// v5.8.17 段階的開示（1画面で同時に判断させるのは1つだけ）。表示だけ。ルール・セーブの形は変えない
// 合格の基準（測る前に決めたもの）：
//  1 初めての地図：目標の吹き出しが出ているあいだ、道の札は見えない。タップで吹き出しが閉じて札が出る。そのタップで札も地点も選ばれない
//  2 戦闘のヒント：ヒントが出ているあいだは「回す／維持」を押しても何も起きない（盤も触れない）。「わかった」のあとは押せる
//  3 遠征の終わり：出た直後は実績の行・開いた行・次の行動が見えない。待っても自動では出ない。タップのたびに 実績 → 開いたもの → 次の行動 の順に1段ずつ出る
//  4 勝利の報酬：上の一文に「報酬を1つ選ぶ」が入らない。「報酬を1つ選ぶ」の見出しは札と一緒に、タップで出る
//  5 320×568：遠征の終わり・勝利の報酬で、札とボタンが横にはみ出さない。どれもページのエラーなし
process.env.RB_PHASE_HOLD = '1';   // 段階的開示の本来の動きで確かめる
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1 };
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const tips = Object.assign({}, ALL); (o.unseen || []).forEach((k) => delete tips[k]);
  await p.addInitScript(([t, m]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); if (m) localStorage.setItem('rb-exp', m); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, [JSON.stringify(tips), o.meta ? JSON.stringify(o.meta) : null]);
  const url = testPage();
  await p.goto(url); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(500); await p.click('#begin'); await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const vis = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].map((e) => getComputedStyle(e).visibility === 'visible'), sel);
(async () => {
  const b = await launch();
  // 1 初めての地図
  { const { ctx, p, errs } = await open(b, { goal: true });
    const a = await p.evaluate(() => ({ goal: document.getElementById('runv').classList.contains('show-goal'), cards: getComputedStyle(document.getElementById('rvCards')).visibility }));
    ok(a.goal && a.cards === 'hidden', '1 目標が出ているあいだ、道の札は見えない：' + JSON.stringify(a));
    const box = await p.evaluate(() => { const r = document.querySelector('#rvCards .rv-card').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.touchscreen.tap(box[0], box[1]); await p.waitForTimeout(400);
    const c = await p.evaluate(() => ({ goal: document.getElementById('runv').classList.contains('show-goal'), cards: getComputedStyle(document.getElementById('rvCards')).visibility, sel: document.querySelectorAll('#rvCards .rv-card.sel').length, go: document.getElementById('rvGo').disabled }));
    ok(!c.goal && c.cards === 'visible' && c.sel === 0 && c.go, '1 タップで吹き出しが閉じて札が出る。札は選ばれていない：' + JSON.stringify(c));
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200);
    ok(!(await p.evaluate(() => document.getElementById('rvGo').disabled)), '1 そのあとは札を選べる');
    ok(!errs.length, '1 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 2 戦闘のヒント（気力のヒントは遠征の最初の「回す／維持」で出る）
  { const { ctx, p, errs } = await open(b, { unseen: ['gauge'] });
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(2600);
    await p.click('#btnStart');
    let tip = false; for (let i = 0; i < 80; i++) { tip = await p.evaluate(() => !document.getElementById('tip').hidden && window.__rb.phase === 'choose'); if (tip) break; await p.waitForTimeout(150); }
    const t0 = await p.evaluate(() => ({ on: document.body.classList.contains('tip-on'), turn: window.__rb.turn }));
    ok(tip && t0.on, '2 ヒントが出ると判断が止まる：' + JSON.stringify(t0));
    const bx = await p.evaluate(() => { const r = document.getElementById('btnStay').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.touchscreen.tap(bx[0], bx[1]); await p.waitForTimeout(500);
    const t1 = await p.evaluate(() => ({ ph: window.__rb.phase, turn: window.__rb.turn }));
    ok(t1.ph === 'choose' && t1.turn === t0.turn, '2 ヒントのあいだは「維持」を押しても進まない：' + JSON.stringify(t1));
    await p.click('#tipOk'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => document.body.classList.contains('tip-on'))), '2 「わかった」で判断が戻る');
    await p.click('#btnStay'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => window.__rb.phase !== 'choose' || window.__rb.turn > 1), '2 そのあとは「維持」で進む');
    ok(!errs.length, '2 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 3 遠征の終わり（初めての踏破：実績・開いたものの行がある）
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, p, errs } = await open(b, { w, h });
    await p.evaluate(() => { const R = window.__rb; document.getElementById('runv').hidden = true; R.beginExp('std', 1); R.run.node = 9; R.expEnd(true, []); });
    await p.waitForTimeout(150);
    const s0 = { ev: await vis(p, '#rvEvents > *'), cards: (await vis(p, '#rvCards'))[0] };
    ok(s0.ev.length >= 2 && s0.ev.every((x) => !x) && !s0.cards, w + '×' + h + ' 3 出た直後は行と次の行動が見えない：' + JSON.stringify(s0));
    await p.waitForTimeout(2500);
    const sw = { ev: await vis(p, '#rvEvents > *'), cards: (await vis(p, '#rvCards'))[0], hint: await p.evaluate(() => document.getElementById('rvTap').classList.contains('on')) };
    ok(sw.ev.every((x) => !x) && !sw.cards && sw.hint, w + '×' + h + ' 3 待っても自動では出ない。「タップで次へ」が出る：' + JSON.stringify(sw));
    const tap = async () => { await p.touchscreen.tap(Math.round(w / 2), 30); await p.waitForTimeout(150); return { ev: await vis(p, '#rvEvents > *'), cards: (await vis(p, '#rvCards'))[0] }; };
    const s1 = await tap();
    ok(s1.ev[0] && !s1.ev[1] && !s1.cards, w + '×' + h + ' 3 1回目のタップで実績の行だけ：' + JSON.stringify(s1));
    const s2 = await tap();
    ok(s2.ev[1] && !s2.cards, w + '×' + h + ' 3 2回目で開いたもの：' + JSON.stringify(s2));
    const s3 = await tap();
    ok(s3.cards && !(await p.evaluate(() => document.getElementById('rvTap').classList.contains('on'))), w + '×' + h + ' 3 3回目で次の行動。案内は消える');
    const r = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card, .rv-skip')].map((e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right)]; }));
    ok(r.every((x) => x[0] >= 0 && x[1] <= w), w + '×' + h + ' 5 横にはみ出さない ' + JSON.stringify(r));
    ok(!errs.length, w + '×' + h + ' 3 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  // 4 勝利の報酬
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, p, errs } = await open(b, { w, h });
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1400);
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.run.members.forEach((m) => { m.atk = 99; m.hp = Math.max(1, m.max - 10); }); });
    await p.click('#btnStart');
    for (let i = 0; i < 150; i++) { if (await p.evaluate(() => !document.getElementById('runv').hidden && document.getElementById('rvTitle').textContent === '勝利')) break; await p.waitForTimeout(50); }
    await p.waitForTimeout(200);
    const a = await p.evaluate(() => ({ sub: document.getElementById('rvSub').textContent, pick: !!document.querySelector('#rvCards .rv-pick'), vis: getComputedStyle(document.querySelector('#rvCards .rv-pick')).visibility }));
    ok(!/報酬を1つ選ぶ/.test(a.sub) && a.pick && a.vis === 'hidden', w + '×' + h + ' 4 上の一文に指示なし・見出しは札と一緒に隠れている：' + JSON.stringify(a));
    await p.waitForTimeout(1500);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#rvCards .rv-pick')).visibility === 'hidden'), w + '×' + h + ' 4 待っても自動では出ない');
    await p.touchscreen.tap(Math.round(w / 2), 30); await p.waitForTimeout(400);
    const c = await p.evaluate(() => [getComputedStyle(document.querySelector('#rvCards .rv-pick')).visibility, document.querySelector('#rvCards .rv-pick').textContent]);
    ok(c[0] === 'visible' && /報酬を1つ選ぶ/.test(c[1]), w + '×' + h + ' 4 タップで、見出しが札と一緒に出る：' + c.join(' '));
    const r = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right)]; }));
    ok(r.every((x) => x[0] >= 0 && x[1] <= w), w + '×' + h + ' 5 横にはみ出さない');
    ok(!errs.length, w + '×' + h + ' 4 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
