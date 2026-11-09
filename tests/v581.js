// v5.8.1 地図に「出来事」（提案E）：休息の地点の一部が、得るものと失うものの2択になる
// 合格の基準（測る前に決めたもの）：
//  1. 地図を40回作ると：出来事は地点2以降の休息の地点だけに出る（戦闘の地点・地点1には出ない）。2回目からの遠征では1回以上出る。
//     初めての遠征では地点1・2に出ない
//  2. 出来事の地点は地図に「縁　出来事」と出る
//  3. 道端の祠：「祈る」→ 回転レリックが1つ増え、章の主の気配が休息2回ぶん強まる（chRests+2）。そのあと次の地点の地図が出る
//  4. 倒れた者の灯：「灯を拾う」→ 誰か1人の突入技が強くなり、全員のHPが最大HPの20%減る（1は残る）
//  5. どの出来事も2枚目は「先を急ぐ」→ 全員のHPが最大HPの30%回復（最大HPまで）。章の主は強くならない
//  6. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  const open = async (meta) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); if (m) localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [TIPS, meta && JSON.stringify(meta)]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    if (await p.evaluate(() => document.getElementById('rvTitle').textContent === '灯の祝福')) { await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(600); }   // 灯の祝福は灯の油で抜ける
    return { ctx, p, errs };
  };
  const census = (p) => p.evaluate(() => { const R = window.__rb, out = { ev: 0, bad: [], low: 0 }; for (let i = 0; i < 40; i++) { const m = R.expFillT(); for (const id in m) { if (m[id].camp !== 'event') continue; const n = R.ROUTE.nodes[id]; out.ev++; if (n.kind !== 'camp' || n.step < 2) out.bad.push(id); if (n.step <= 2) out.low++; if (!['ember', 'shrine', 'cask'].includes(m[id].ev)) out.bad.push(id + ':' + m[id].ev); } } return out; });
  const META = { runs: 1, best: 4, hist: [{ clear: false, node: 5, fal: 4 }] };
  // 1（初めて）
  { const { ctx, p, errs } = await open(null); const c = await census(p);
    ok(!c.bad.length && c.low === 0, '1 初めての遠征：地点1・2に出来事は出ない ' + JSON.stringify(c)); ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(META); const c = await census(p);
    ok(c.ev > 0 && !c.bad.length, '1 2回目からの遠征：休息の地点（地点2以降）だけに出来事が出る ' + JSON.stringify(c));
    // 2
    const lab = await p.evaluate(() => { const R = window.__rb, id = Object.keys(R.ROUTE.nodes).find((k) => R.ROUTE.nodes[k].kind === 'camp' && R.ROUTE.nodes[k].step >= 2); R.run.map[id] = { camp: 'event', ev: 'shrine' }; return R.rtInfoT(id); });
    ok(lab.g === '縁' && lab.t === '出来事', '2 地図の印「' + lab.g + '　' + lab.t + '」');
    // 3 祠
    const pre = await p.evaluate(() => { const R = window.__rb; return { rel: R.run.relics.length, cr: R.run.chRests || 0, node: R.run.node }; });
    await p.evaluate(() => window.__rb.expEvent({ type: 'event', ev: 'shrine', step: 2 })); await p.waitForTimeout(300);
    const v = await p.evaluate(() => ({ title: document.getElementById('rvTitle').textContent, cards: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.innerText.replace(/\s+/g, ' ')) }));
    ok(v.title === '道端の祠' && v.cards.length === 2 && /祈る/.test(v.cards[0]) && /先を急ぐ/.test(v.cards[1]), '3 祠の画面：2枚 ' + v.cards.map((x) => x.slice(0, 12)).join('｜'));
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(500);
    const post = await p.evaluate(() => { const R = window.__rb; return { rel: R.run.relics.length, cr: R.run.chRests || 0, node: R.run.node, map: document.getElementById('runv').classList.contains('is-map') }; });
    ok(post.rel === pre.rel + 1 && post.cr === pre.cr + 2 && post.node === pre.node + 1 && post.map, '3 祈る：レリック+1・主の気配+2・次の地図 ' + JSON.stringify({ pre, post }));
    // 4 灯
    const e0 = await p.evaluate(() => { const R = window.__rb; R.run.node = 0; R.run.members.forEach((m) => { m.hp = m.max; }); return R.run.members.map((m) => ({ hp: m.hp, max: m.max, up: JSON.stringify(m.up || {}) })); });
    await p.evaluate(() => window.__rb.expEvent({ type: 'event', ev: 'ember', step: 3 })); await p.waitForTimeout(300);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(500);
    const e1 = await p.evaluate(() => window.__rb.run.members.map((m) => ({ hp: m.hp, max: m.max, up: JSON.stringify(m.up || {}) })));
    const upN = e1.filter((x, i) => x.up !== e0[i].up).length;
    ok(upN === 1 && e1.every((x, i) => x.hp === Math.max(1, e0[i].hp - Math.ceil(e0[i].max * 0.2))), '4 灯を拾う：1人が強化・全員HP-20% ' + JSON.stringify(e0.map((x) => x.hp)) + '→' + JSON.stringify(e1.map((x) => x.hp)));
    // 5 先を急ぐ
    const s0 = await p.evaluate(() => { const R = window.__rb; R.run.node = 0; R.run.members.forEach((m, i) => { m.hp = i === 0 ? m.max - 1 : 1; }); return { hp: R.run.members.map((m) => [m.hp, m.max]), cr: R.run.chRests || 0 }; });
    await p.evaluate(() => window.__rb.expEvent({ type: 'event', ev: 'cask', step: 4 })); await p.waitForTimeout(300);
    await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(500);
    const s1 = await p.evaluate(() => { const R = window.__rb; return { hp: R.run.members.map((m) => m.hp), cr: R.run.chRests || 0 }; });
    ok(s1.hp.every((h, i) => h === Math.min(s0.hp[i][1], s0.hp[i][0] + Math.ceil(s0.hp[i][1] * 0.3))) && s1.cr === s0.cr, '5 先を急ぐ：全員HP+30%（最大まで）・主はそのまま ' + JSON.stringify(s0.hp) + '→' + JSON.stringify(s1.hp));
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
